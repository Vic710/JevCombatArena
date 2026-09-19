import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";

// ---------------------------------------------------------------------------
// Types — keep in sync with frontend/src/state/GameState.ts
// ---------------------------------------------------------------------------

type NpcMoveAction =
  | "MOVE_UP"
  | "MOVE_DOWN"
  | "MOVE_LEFT"
  | "MOVE_RIGHT"
  | "MOVE_UP_LEFT"
  | "MOVE_UP_RIGHT"
  | "MOVE_DOWN_LEFT"
  | "MOVE_DOWN_RIGHT"
  | "STOP";

interface AgentCombatState {
  id: string;
  name: string;
  personality?: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  heals: number;
  attackCooldownMs: number;
  bulletCooldownMs: number;
  dashCooldownMs: number;
  nearLeftWall?: boolean;
  nearRightWall?: boolean;
  nearTopWall?: boolean;
  nearBottomWall?: boolean;
}

interface EnemySummary {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  distance: number;
}

interface BulletInfo {
  distancePx: number;
  relativeDx: number;
  relativeDy: number;
  vx: number;
  vy: number;
}

interface GameState {
  self: AgentCombatState;
  primaryTarget: {
    id: string;
    name: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    heals: number;
    distance: number;
    inMeleeRange: boolean;
    dx: number;
    dy: number;
    bestMoveTowardTarget: NpcMoveAction;
    bestMoveAwayFromTarget: NpcMoveAction;
    hpAdvantage: number;
  } | null;
  otherEnemies: EnemySummary[];
  bullets: BulletInfo[];
  arenaWidth: number;
  arenaHeight: number;
}

interface JevDecisionResult {
  moveAction: NpcMoveAction;
  shouldMelee: boolean;
  shouldShoot: boolean;
  shouldHeal: boolean;
  shouldDash: boolean;
}

// ---------------------------------------------------------------------------
// TypeSafe client
// ---------------------------------------------------------------------------

const client = new TypeSafeClient({
  apiKey: process.env.TYPESAFE_API_KEY,
});

// ---------------------------------------------------------------------------
// Jev decision logic
// ---------------------------------------------------------------------------

async function askJev(state: GameState): Promise<JevDecisionResult> {
  const { self, primaryTarget } = state;

  const canMeleeAttack = self.attackCooldownMs <= 0;
  const canShoot = self.bulletCooldownMs <= 0;
  const canHeal = self.hp < self.maxHp && self.heals > 0;
  const canDash = (self.dashCooldownMs ?? 0) <= 0;

  // Objective state representation for Jev
  const stateDoc = {
    game: "2D Top-Down Arena Deathmatch — Last survivor wins.",
    self: {
      name: self.name,
      personality: self.personality || "Tactical combatant",
      hp: self.hp,
      max_hp: self.maxHp,
      heals_remaining: self.heals,
      can_melee: canMeleeAttack,
      can_shoot: canShoot,
      can_heal: canHeal,
      can_dash: canDash,
      position: { x: Math.round(self.x), y: Math.round(self.y) },
      near_walls: {
        left: !!self.nearLeftWall,
        right: !!self.nearRightWall,
        top: !!self.nearTopWall,
        bottom: !!self.nearBottomWall,
      },
    },
    target: primaryTarget
      ? {
        name: primaryTarget.name,
        hp: primaryTarget.hp,
        distance_px: Math.round(primaryTarget.distance),
        in_melee_range: primaryTarget.inMeleeRange,
        dx: Math.round(primaryTarget.dx),
        dy: Math.round(primaryTarget.dy),
        direction_toward_target: primaryTarget.bestMoveTowardTarget,
        direction_away_from_target: primaryTarget.bestMoveAwayFromTarget,
      }
      : null,
    bullets_in_arena: state.bullets.map((b) => ({
      distance_px: b.distancePx,
      relative_dx: b.relativeDx,
      relative_dy: b.relativeDy,
      speed_x: b.vx,
      speed_y: b.vy,
    })),
    other_living_enemies_count: state.otherEnemies.length,
    arena: { width: state.arenaWidth, height: state.arenaHeight },
    combat_rules: {
      melee: "Deals 20 damage within 60px radius and pushes enemy back",
      bullet: "Auto-aimed projectile at target dealing 20 damage",
      dash: "3x speed burst in movement direction for 150ms (2.5s cooldown)",
      heal: "Restores HP back to 100 (limited charges)",
    },
  };

  const promptHeader = `You are ${self.name}, playing in a real-time top-down arena deathmatch.
Your Combat Personality: "${self.personality || "Tactical combatant"}".
Your Objective: Win the match as the last combatant standing while following your personality style!
Regardless of personality, ensure that your actual goal is to win the match with all the tools at your desposal.`;

  // Ask independent action judgments in parallel against the game state
  const response = await client.systemOne({
    state: stateDoc,
    questions: {
      movement: choice(
        `${promptHeader}
Choose your continuous movement vector for this tick to try to win while staying true to your personality.`,
        {
          MOVE_UP: "Move UP",
          MOVE_DOWN: "Move DOWN",
          MOVE_LEFT: "Move LEFT",
          MOVE_RIGHT: "Move RIGHT",
          MOVE_UP_LEFT: "Move diagonally UP-LEFT",
          MOVE_UP_RIGHT: "Move diagonally UP-RIGHT",
          MOVE_DOWN_LEFT: "Move diagonally DOWN-LEFT",
          MOVE_DOWN_RIGHT: "Move diagonally DOWN-RIGHT",
          STOP: "Stop / Hold position",
        }
      ),

      melee_attack: noul(
        `${promptHeader}
Should ${self.name} execute a MELEE attack right now?
(Deals 20 damage to enemies within 60px radius and knocks them back).`
      ),

      shoot_bullet: noul(
        `${promptHeader}
Should ${self.name} fire an auto-aimed BULLET at the target right now?
(Fires a projectile dealing 20 damage).`
      ),

      dash: noul(
        `${promptHeader}
Should ${self.name} execute a DASH burst right now?
(Burst speed 480px/s for 150ms in movement direction).`
      ),

      heal: noul(
        `${promptHeader}
Should ${self.name} use a HEAL charge right now?
(Restores HP back to 100. Charges remaining: ${self.heals}).`
      ),
    },
  });

  const moveAction = response.answers.movement.choice as NpcMoveAction;
  const meleeProb = response.answers.melee_attack.noul;
  const shootProb = response.answers.shoot_bullet.noul;
  const dashProb = response.answers.dash.noul;
  const healProb = response.answers.heal.noul;

  const shouldMelee = meleeProb > 0.5 && canMeleeAttack;
  const shouldShoot = shootProb > 0.5 && canShoot;
  const shouldDash = dashProb > 0.5 && canDash;
  const shouldHeal = healProb > 0.5 && canHeal;

  const actionsTaken = [
    moveAction,
    shouldMelee ? "MELEE" : null,
    shouldShoot ? `SHOOT(p=${shootProb.toFixed(2)})` : null,
    shouldDash ? `DASH(p=${dashProb.toFixed(2)})` : null,
    shouldHeal ? `HEAL(p=${healProb.toFixed(2)})` : null,
  ]
    .filter(Boolean)
    .join(" + ");

  console.log(
    `[Jev:${self.name}] [${actionsTaken}] | targetDist=${primaryTarget ? Math.round(primaryTarget.distance) : "none"} bullets=${state.bullets.length} HP=${self.hp}`
  );

  return { moveAction, shouldMelee, shouldShoot, shouldHeal, shouldDash };
}

// ---------------------------------------------------------------------------
// Hono server
// ---------------------------------------------------------------------------

const app = new Hono();

app.use("/*", cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));

app.post("/api/jev", async (c) => {
  let state: GameState;
  try {
    state = await c.req.json<GameState>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const result = await askJev(state);
    return c.json(result);
  } catch (err) {
    console.error("[Jev] TypeSafe API error:", err);
    return c.json({
      moveAction: "STOP",
      shouldMelee: false,
      shouldShoot: false,
      shouldHeal: false,
      shouldDash: false,
    });
  }
});

app.get("/health", (c) => c.json({ ok: true }));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[backend] Jev proxy running on http://localhost:${PORT}`);
});
