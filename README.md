# BACKROOMS EXPLORATION

<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/92be96c6-ff7b-4b80-8030-16d3b67bf8e4" />

<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/186561bd-ac81-4f02-9b26-aef69906a15f" />

<img width="1920" height="1080" alt="Image" src="https://github.com/user-attachments/assets/6302ba3b-b771-45a0-bc72-16a4c4aa49e3" />

06/16/2026 - PROTOTYPE PHASE!

I've Built this backrooms exploration game in Google AI Studio with the help of Gemini, though this one is my first prototype
so you might find lots of bugs, glitches expecially with how the shadows are casted and many unnecessary
things in the codebase I have no time to clean this one yet but the map/environment, the movements and the
overall mechanics are doing pretty well. So yeah I will get back to this after a couple of days to clean
it up but if you want you can download it and try for yourself maybe you got some ideas to put.

> **Prototype Notice:** This is an early-stage demo. The editor UI contains tools that are still being built and aren't functional yet — that's intentional. What *does* work: the game itself, the Texture Editor, and the Sprite/Model Editor. Everything else is a work in progress and will be cleaned up in a future update.

## Prerequisites

Before you start, make sure you have the following installed:

**Node.js** v18 or newer [nodejs.org](https://nodejs.org)
**Git** Any recent version [git-scm.com](https://git-scm.com)

---

Run these commands
```bash
git clone https://github.com/ARCHIdev20/Backrooms_EXP.git
cd Backrooms_EXP
npm install
npm run dev
```
---

You should see output like:

```
  VITE v6.x.x  ready in Xms

  ➜  Local:   http://localhost:3000/
```

Open your browser and go to **http://localhost:3000** the game should load

---

### Camera Filters

Before hitting Play, you can pick a visual filter from the **Lens** dropdown in the header:
> **Note: The filters makes the game LAG**
---
| Filter | Effect |
|--------|--------|
| Clean / None | Default look |
| Found Footage (VHS) | Grainy, washed-out VHS aesthetic |
| Night Vision | Green night vision overlay |

---

## What's Working in the Editor

The editor panel on the left has several tabs. Here's what's actually usable right now:

### Texture Editor (`Paintbrush` tab)
Paint custom 16×16 pixel art textures that get applied to the walls, floor, and ceiling in-game. Pick a texture from the list on the left, draw on the grid, and hit **Save** — changes appear in the game immediately.

### Sprite / Model Editor (`Box` tab)
Edit the voxel-style sprites used for in-game entities and objects. Same workflow: select a model, edit it, save.

### Map Editor (`Layers` tab) — Not functional yet
The map editor UI is visible but the in-game map is not driven by it yet. This will be wired up in a future update.

### Script Editor (`Terminal` tab) — Not functional yet
CloverScript is the planned AI-powered scripting system for game logic. The editor is there but scripts don't execute in-game yet.

---

## Known Issues

- **Shadow glitches** — lighting and shadow casting has some visual bugs. This is a known prototype issue and is being worked on.
- **Editor tabs marked 🚧** — the Map and Script editors are visible in the UI but not yet connected to the game. Ignore them for now.
- **General roughness** — it's a prototype! The codebase hasn't been cleaned up yet. If you poke around the `src/` folder, expect some unused or half-finished code.

---

## Notes
- Press `Ctrl + C` in the terminal to stop the dev server.
- Built with React, Three.js, and Vite
- The engine is called **Clover Engine** — Backrooms EXP is its first proof-of-concept game
