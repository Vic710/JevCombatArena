import type { GameState, NpcMoveAction } from "../state/GameState";

/** Full response from one Jev decision cycle */
export interface JevResponse {
  moveAction: NpcMoveAction;
  shouldMelee: boolean;
  shouldShoot: boolean;
  shouldHeal: boolean;
  shouldDash: boolean;
}

const BACKEND_URL = "http://localhost:3001/api/jev";

/**
 * Send the current game state to the backend, which calls Jev and returns
 * the chosen NPC actions. Falls back to safe defaults on errors.
 */
export async function askJev(state: GameState): Promise<JevResponse> {
  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });

    if (!res.ok) {
      console.warn(`[JevClient] Backend returned ${res.status}`);
      return {
        moveAction: "STOP",
        shouldMelee: false,
        shouldShoot: false,
        shouldHeal: false,
        shouldDash: false,
      };
    }

    const data = (await res.json()) as JevResponse;
    return {
      moveAction: data.moveAction ?? "STOP",
      shouldMelee: data.shouldMelee ?? false,
      shouldShoot: data.shouldShoot ?? false,
      shouldHeal: data.shouldHeal ?? false,
      shouldDash: data.shouldDash ?? false,
    };
  } catch (err) {
    console.warn("[JevClient] Failed to reach backend:", err);
    return {
      moveAction: "STOP",
      shouldMelee: false,
      shouldShoot: false,
      shouldHeal: false,
      shouldDash: false,
    };
  }
}
