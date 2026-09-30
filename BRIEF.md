# OneSimpleSite skill test: Rook & Lime

Use `/onesimplesite-web-designer` to design and build a complete, visually exceptional one-page concept website in this repository.

## Fictional client

Rook & Lime is a small London studio creating hand-applied lime plaster finishes for architect-led homes, restaurants, and boutique spaces. The primary conversion is to request a material consultation by email.

This is a design test. All business facts are provisional. Do not invent testimonials, awards, certifications, addresses, prices, years in business, client names, or performance statistics.

## Creative gear

Use **Immersive** gear. The page should be an attention-stopping demonstration of what OneSimpleSite can make, not a generic landing page.

Derive the art direction from mineral surfaces, wet plaster, hand tools, dust, imperfect edges, and architectural restraint. It should feel expensive, physical, bold, and human.

Build one defining real-time visual: a sculptural lime monolith or layered wall surface rendered with WebGL/Three.js, lit like an architectural material sample. It should respond to pointer movement and transform through a restrained scroll sequence that reveals layers, scoring, aggregate, or texture. The scene must connect to the service rather than resemble a generic chrome-orb demo.

Pair the scene with strong editorial typography, a tactile neutral palette, purposeful transitions, selected project-style compositions, process, material story, and a direct email CTA. Concentrate spectacle in the hero and one narrative transition; keep the rest controlled.

## Technical scope

- Use Vite with semantic HTML, CSS, and JavaScript or TypeScript.
- Use Three.js directly unless another choice is clearly better and justified by the installed stack.
- Create all project files and install only necessary dependencies.
- Include a designed static fallback when WebGL is unavailable, motion is reduced, or the scene fails.
- Cap rendering cost, pause when hidden or offscreen when practical, handle resize, and dispose resources.
- Make mobile a deliberate recomposition with simplified 3D where needed.
- Ensure keyboard access, visible focus, useful landmarks, sufficient contrast, and a skip link.
- Include metadata, social metadata, a small favicon, and no dead links.
- Use local procedural visuals and generated geometry. Do not depend on random image APIs.
- The result must run with `npm run dev` and pass `npm run build`.

## Completion standard

Do not stop at a hero or describe what could be built. Finish the entire page from navigation through footer. Inspect it at mobile and desktop widths. Verify the interaction, reduced-motion state, links, console, and production build. Iterate on visible flaws before reporting completion.
