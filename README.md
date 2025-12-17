# Pocket Portfolio City

Pocket City-inspired personal portfolio built with React, TypeScript, Vite, and Babylon.js. Explore the fixed city diorama, click buildings to open portfolio sections, and toggle day/night from the floating HUD.

## Getting Started

```bash
npm install
npm run dev
# npm run build  # production build
```

Dependencies already included in `package.json`:

- `@babylonjs/core`
- `@babylonjs/loaders`

## Controls & UI

- Drag (pointer) to pan, mouse wheel/pinch to zoom.
- Press `Q` / `E` to rotate the camera.
- Double-click a main building to focus the camera on it.
- Top bar buttons: toggle day/night, reset camera, toggle sound (UI state only).
- Press `ESC` or the Close button to dismiss the portfolio panel.

## Assets

All OBJ + MTL assets should live inside `public/`. Each entry in `src/data/cityLayout.ts` references a model via the `modelPath` field. Paths are resolved relative to `ASSET_BASE_URL` (defined in `src/config.ts`, defaults to `/`). Example:

```ts
modelPath: "models/townhall.obj"; // resolves to /models/townhall.obj under public/
```

## Adding Buildings

All city placements are defined in `src/data/cityLayout.ts`.

1. Add a new object to `CITY_LAYOUT`.
2. Provide a unique `id`, `name`, and `modelPath`.
3. Set `type: "main"` with a `key` from the `BuildingKey` union (about, projects, skills, experience, contact) to link a building to the portfolio panel. Use `type: "decor"` for decorative, non-interactive buildings.
4. Position buildings using `{ x, z }` coordinates (grid tile ≈ 4 units). Optional `rotationY` and `targetScale` help align and resize models.

The Babylon scene automatically loads each entry, normalizes its scale, and applies a fallback mesh if the OBJ fails to load.
