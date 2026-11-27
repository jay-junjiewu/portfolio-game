# portfolio-game

A city-inspired 3D personal portfolio built with **React**, **TypeScript**, **Vite**, and **Babylon.js**.

The website uses a miniature city as the main navigation. Instead of scrolling through pages, you explore the city, click key buildings, and open different portfolio sections like **About**, **Projects**, **Skills**, **Experience**, and **Contact**. Each building acts as an entry point, with deeper project views available inside.

The goal is to make browsing the portfolio feel tactile and playful, closer to a small interactive world than a traditional website. Camera movement, smooth transitions, and a lightweight HUD help guide the experience without getting in the way.

---

## Live Demo

🔗 **Visit the live site:**  
https://junjiewu.com/

> Best experienced on desktop with a mouse and keyboard, but fully usable on touch devices as well.

---


## Getting Started

```bash
npm install
npm run dev
```

## How the site is built

- **Content** lives in one place: `src/data/portfolioData.ts` (projects, experience, skills, contact) and `src/data/siteMeta.ts` (page titles and meta descriptions). It feeds the island panels, the document pages, the sitemap, JSON-LD, `/llms.txt` and the chat concierge.
- **`/`** is the 3D island. `/?panel=<section>` (and `&project=<slug>`) opens a panel, so every panel has a shareable URL and Back closes it. `/?view=simple` switches to a one-page simple view (remembered in `localStorage`; the default with reduced motion or no WebGL2).
- **`/about`, `/experience`, `/skills`, `/contact`, `/projects`, `/projects/<slug>`** are plain document pages that never load Babylon.js.
- **`npm run build`** builds the client, builds `src/entry-server.tsx` for Node, then `scripts/prerender.mjs` renders every page to static HTML (hydrated on the client) and writes `404.html`, `sitemap.xml`, `llms.txt`, `llms-full.txt` and a `.md` copy of each page. The build fails if a meta description is not 140 to 160 characters, a page lacks exactly one `<h1>`, or a project has no Open Graph image.

### Adding or changing a project

1. Add or edit it in `src/data/portfolioData.ts` (give it a `slug`, a hand-written `metaDescription` and an `llmsLine`). Never change an existing slug without adding a redirect in `vercel.json`.
2. Optional long write-up: add a component in `src/components/projects/` and register it in `src/components/projects/index.ts`.
3. Run `npm run generate:og` to create its Open Graph image in `public/og/`.

### 3D models

The island loads two compressed files, `src/assets/models/island-core.glb` (the five landmarks) and `island-props.glb` (everything else), instead of the OBJ files in `public/*-models/`. Those OBJ files are the editable sources: after changing a model or which models the layout uses, run `npm run build:models`.

## Controls

### Desktop
- **W / A / S / D**: Pan  
- **Q / E** or **Arrow Keys**: Rotate  
- **Scroll wheel**: Zoom  
- **Drag**: Rotate camera  
- **Space + Drag**: Pan the scene  
- **Click**: Open the portfolio panel for a highlighted building  
- **Double-click**: Focus the camera on a main building  
- **ESC**: Close panels or the Help overlay  

### Touch
- **1 finger**: Pan  
- **2 fingers**: Rotate and zoom  
