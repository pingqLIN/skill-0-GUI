# Design System Document: High-End Editorial Workbench

## 1. Overview & Creative North Star

### Creative North Star: "The Digital Archivist"
This design system rejects the ephemeral, "bubbly" nature of modern SaaS interfaces in favor of the permanence and rigor of a high-end editorial workbench. It is designed for deep work, where precision is paramount and data is treated with the same reverence as a manuscript. 

To break the "template" look, the system employs **intentional asymmetry** and **high-density layouts** that prioritize information over whitespace. It avoids the "centered and soft" aesthetic of consumer apps, instead opting for left-aligned hierarchies, staggered grid columns, and a "paper-on-slate" structural philosophy. The result is a UI that feels like a bespoke tool—rigorous, honest, and purely operational.

---

## 2. Colors

The palette is anchored in tactile realism, mimicking the experience of reviewing a document under a sharp desk lamp.

- **Primary Surfaces:** Use `background` (#faf9f8) as your canvas. It is a warm, off-white "paper" tone that reduces eye strain during long review sessions.
- **Ink & Structure:** All primary text and structural landmarks use `on_background` (#2f3333). This is a heavy graphite, providing high-contrast legibility without the harshness of pure black.
- **The "No-Line" Rule:** To achieve a premium editorial feel, **1px solid borders are strictly prohibited for sectioning.** 
    - Separate content blocks using background shifts: Place a `surface_container_low` section atop a `surface` background.
    - Use `surface_container` variants to define columns and sidebars.
- **Surface Hierarchy & Nesting:** Treat the UI as physical layers of stacked paper.
    - **Base:** `surface` (#faf9f8)
    - **Nesting Level 1:** `surface_container_low` (#f3f4f3) for secondary groupings.
    - **Nesting Level 2:** `surface_container` (#edeeed) for deep utility areas like the "Details Panel."
- **Signature Accents:** Main CTAs or active states should use a subtle gradient from `primary` (#5e5e5e) to `primary_container` (#e3e2e2). This provides a "pressed metal" or "satin" finish that feels intentional and custom.

---

## 3. Typography

The system utilizes a high-contrast serif/sans-serif pairing to distinguish between "Content" (The Review) and "Context" (The UI).

- **The Editorial Serif (Newsreader):** Used for `display`, `headline`, and `headline-sm`. This font conveys authority and intellectual rigor. In a sea of data, the serif headings act as a grounding "masthead."
- **The Functional Sans (Inter):** Used for all `title`, `body`, and `label` roles. This provides maximum legibility for dense data points, parser strings, and reviewer notes.
- **Typography as Hierarchy:** Use `display-md` for the primary document title. Use `label-sm` in `on_surface_variant` (#5b605f) for metadata—this mimics the "fine print" of a legal or technical document.

---

## 4. Elevation & Depth

In "The Digital Archivist," depth is a function of light and stacking, not shadows.

- **The Layering Principle:** Depth must be achieved by "stacking" surface tiers. To make a card pop, place a `surface_container_lowest` (#ffffff) card on a `surface_container_low` (#f3f4f3) background. This creates a sharp, clean lift.
- **Ambient Shadows:** Shadows are reserved only for floating elements (e.g., Modals). Shadows must be extra-diffused: `box-shadow: 0 12px 40px rgba(47, 51, 51, 0.06)`. The tint is derived from the `on_surface` color to maintain a natural, ambient light feel.
- **The "Ghost Border" Fallback:** If containment is absolutely required for accessibility, use the `outline_variant` (#aeb3b2) at **15% opacity**. This creates a "hairline" suggestion of a border that doesn't clutter the visual field.
- **Rigid Edges:** Maintain the `DEFAULT` radius of **4px (0.25rem)**. Avoid large, pill-shaped corners which feel too consumer-focused. We are building a workbench, not a toy.

---

## 5. Components

### Buttons
- **Primary:** `surface_tint` (#5e5e5e) background with `on_primary` (#f9f7f7) text. Minimal 4px radius. 
- **Secondary:** `secondary_container` (#e7e1dc) background. No border.
- **Tertiary/Ghost:** No background. Use `label-md` weight. Subtle hover state using `surface_container_high`.

### Input Fields & Text Areas
- **Styling:** Forgo the 4-sided box. Use a `surface_container_low` background with a subtle bottom-weighted `outline_variant` (20% opacity).
- **Focus:** Shift background to `surface_container_lowest` and sharpen the bottom border.

### Cards & Workspaces
- **Rule:** Forbid divider lines within cards.
- **Separation:** Use a vertical 24px gap (from spacing scale) or a 1-step tonal shift (e.g., a `surface_container_highest` header on a `surface_container` body).

### Specialized: The Review Chip
- Used for parser status. Use `tertiary_container` (#fbf2eb) for "Neutral/In-Progress" and `error_container` (#fe8983) for "Issues Found." Keep these small and high-contrast with `label-sm` text.

---

## 6. Do's and Don'ts

### Do:
- **Do** prioritize asymmetric layouts. Align the primary work area to the left and stack metadata in high-density right-side columns.
- **Do** use `Roboto Mono` (or similar) for specific data strings to emphasize the "parser" nature of the tool.
- **Do** use whitespace as a structural element. A large gap is often more effective than a line.

### Don't:
- **Don't** use "Consumer Blue" or "Success Green." Stick to the slate, graphite, and paper tones provided in the token set.
- **Don't** use heavy glassmorphism. A 10% opacity backdrop-blur is acceptable for floating tooltips, but never for primary layout containers.
- **Don't** use centered text for anything other than a high-level empty state. Editorial layouts are traditionally grid-aligned to the left or right margins.
- **Don't** add shadows to cards that are sitting on the main surface. Use tonal shifts instead.

---

## Director's Final Note
This system succeeds when it feels like a physical desk. The paper is warm, the ink is dark, and every element is placed with the surgical precision of an expert reviewer. Avoid the "templated" look by embracing the density of information and the elegance of high-end typography.