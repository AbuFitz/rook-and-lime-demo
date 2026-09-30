# Rook & Lime — immersive concept site

A one-page concept site for a fictional London lime-plaster studio, built as a test of the
`onesimplesite-web-designer` skill in **Immersive** gear. All business facts are provisional.

## Run

```bash
npm install
npm run dev       # development
npm run build     # production build to dist/
npm run preview   # serve the production build
```

## What is where

- `index.html` — all content, semantic landmarks, metadata, skip link.
- `src/main.js` — scroll timeline, navigation, reveals, clipboard, lazy texture painting.
- `src/lib/timeline.js` — one scroll timeline shared by the CSS poster and the WebGL scene.
- `src/lib/scene.js` — the Three.js monolith (loaded on demand as its own chunk).
- `src/lib/plaster.js` + `plaster.worker.js` — procedural plaster surfaces, painted in a worker. No image files.
- `src/styles/` — tokens and type (`base.css`), hero/scroll stage (`stage.css`), sections (`sections.css`).
- `public/` — favicon, self-hosted variable fonts, `og.png` (captured from the hero), `robots.txt`.

## Fallbacks

The hero is a composed HTML/CSS poster first; the WebGL layer fades in over it. Without WebGL, with
reduced motion or with data-saver on, the poster (and a static list of the four coats) is the design.

## Handoff: what the client must supply

- Real email address (currently `studio@rookandlime.example`) and any phone or studio address.
- Real project photography; the four "studies" and material swatches are procedural illustrations.
- Process wording, materials and tools are generic and should be checked by the studio.
- Absolute URL for `og:image` / canonical once a domain exists (`/og.png` is relative for now).
- No form: the conversion is a `mailto:` link with a pre-filled brief. Delivery depends on the visitor's mail client.
