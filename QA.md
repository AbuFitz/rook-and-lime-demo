# Rook & Lime forward-test

## Outcome

The `onesimplesite-web-designer` skill produced a complete Immersive one-page concept in an isolated Claude Code run with `--no-session-persistence`. Claude created the design system, semantic page, procedural plaster renderer, custom hand-cut Three.js slab geometry, shared scroll timeline, responsive layouts, fallbacks, metadata, favicon, robots file, and social preview image.

The first attempt stopped after scaffolding, and the second initially prioritised large visual assets before completing the entry point. The skill was therefore updated to require a runnable spine and passing build before deep scene work. Claude then completed and audited the site.

## Verification

- `npm run build`: passes with Vite 8.3.1.
- Production bundle: 9.10 kB gzip initial JavaScript; Three.js scene is a separate 142.08 kB gzip chunk; texture worker is 4.45 kB.
- Claude inspected 1440, 1280, 900×700, 768, 390, 375, and 320 widths, including reduced-motion desktop and mobile states.
- Claude reported no horizontal overflow, a clean console, working menu and coat navigation, correct tab order and skip link, and all 19 links resolving.
- Claude's Lighthouse run reported 100 accessibility, 100 best practices, and 100 SEO. Performance was 100 without WebGL, 82 on mobile with software-rendered WebGL, and about 66 on desktop with software-rendered WebGL. Real-GPU performance remains to be measured.
- Codex independently inspected the live 390×844 WebGL hero and semantic accessibility tree. A fixed-header compositor issue observed in the in-app browser was corrected by promoting and isolating the header layer; the production build passes after the fix.

## Progressive enhancement

- HTML/CSS poster is the first frame and designed fallback.
- Three.js loads as a separate chunk only after the procedural layers are ready.
- Texture generation runs in a web worker.
- Rendering pauses when hidden or offscreen and adapts quality when frames are slow.
- Reduced motion, missing WebGL, context loss, small screens, and coarse pointers receive deliberate behavior.
- Essential content, links, navigation, and CTAs remain semantic HTML.

## Provisional client inputs

- Replace `studio@rookandlime.example` with the verified contact address.
- Replace procedural project studies with approved project photography and facts.
- Have the studio verify the generic process and material copy.
- Set an absolute social image URL once the production domain exists.
- Confirm whether mailto remains the enquiry route or connect a real form service.
