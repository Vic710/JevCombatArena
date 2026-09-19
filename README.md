# ⚡ Jev AI Combat Arena

A real-time 2D top-down combat simulation powered by **Phaser 4**, **TypeScript**, and **TypeSafe System One (Jev AI)**. Autonomous NPC boss agents make live spatial combat decisions (movement, melee attacks, auto-aim projectiles, high-speed dashes, and heals) to fight each other in self-play or challenge a human player.

---

## 🎮 Features

- **Autonomous Jev AI Bosses**: Powered by TypeSafe System One for real-time 5-axis parallel judgments (`movement`, `melee_attack`, `shoot_bullet`, `dash`, `heal`).
- **Personality Archetypes**: Give each agent a unique combat personality vector (`Berserker`, `Sniper`, `Survivor`, `Scared Runner`, `Headfirst Fighter`, `Skirmisher`, `Balanced`).
- **Multiple Game Modes**:
  - **Jev vs Jev Self-Play**: Watch 2 to 6 autonomous AI combatants fight in a battle royale.
  - **Human vs Jev**: Take direct control of Player 1 with keyboard controls.
- **Dynamic Physics & Mechanics**:
  - **Melee Combat**: 60px radius circle attack with directional knockback.
  - **Auto-Aimed Bullets**: Projectile system with real-time trajectory tracking.
  - **Dash Ability**: 3x speed burst (480px/s) for quick repositioning and evasion.
  - **Limited Heals**: 3 full-restore heal charges per match.
  - **Elastic Bounce & Anti-Clipping**: Safe arena boundaries and collision separation.
- **In-Game Start Menu & Settings**:
  - Configure game mode, combatant count (2–6), agent personalities, and AI tick speeds (100ms / 200ms / 300ms) before match launch.
  - Pause anytime with `ESC` and return to the Start Menu with `M`.

---

## 🏗️ Architecture

```
jevgame/
├── backend/                  # Hono + TypeSafe System One Proxy Server
│   ├── src/
│   │   └── server.ts         # Multi-axis Jev prompt & System One decision endpoint
│   ├── .env.example          # Environment variables template
│   └── package.json
├── frontend/                 # Vite + Phaser 4 Client
│   ├── src/
│   │   ├── combat/           # BulletSystem, CombatSystem (Melee & Knockback)
│   │   ├── config/           # Central gameConfig.ts
│   │   ├── entities/         # Agent entity (Human & AI combatant), Bullet
│   │   ├── jev/              # JevClient API bridge
│   │   ├── scenes/           # MenuScene, GameScene, GameOverScene
│   │   ├── state/            # GameState & combat interfaces
│   │   ├── ui/               # HUD cards (HP bars, Cooldowns, Personalities)
│   │   └── main.ts           # Phaser game bootstrap
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- A [TypeSafe AI API Key](https://typesafe.ai)

### 2. Backend Setup
```bash
cd backend
npm install

# Copy .env.example and add your API key
cp .env.example .env
```

Edit `backend/.env`:
```env
TYPESAFE_API_KEY=your_typesafe_api_key_here
PORT=3001
```

Start backend dev server:
```bash
npm run dev
```
Backend runs on `http://localhost:3001`.

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🕹️ Controls

| Key | Action |
| --- | --- |
| **`W`, `A`, `S`, `D`** | Move Player 1 (Human Mode) |
| **`SPACE`** | Melee Attack |
| **`F`** | Fire Auto-Aimed Bullet |
| **`SHIFT`** | Dash Burst (3x Speed) |
| **`E`** | Use Heal Charge (Restores to 100 HP) |
| **`ESC`** | Toggle Game Pause / Resume |
| **`M`** | Open Settings & Start Menu |
| **`P`** | Toggle between Human Player & Spectator Mode |
| **`+` / `-`** | Increase / Decrease Agent Count (2 to 6) |
| **`R`** | Restart Match |

---

## 📜 License

MIT License. Feel free to build upon, experiment, and customize!
