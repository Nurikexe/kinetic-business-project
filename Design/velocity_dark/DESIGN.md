# Design System Document: The Kinetic Editorial

## 1. Overview & Creative North Star
This design system is built to bridge the gap between high-performance data and aspirational editorial design. It rejects the "utility-only" look of standard fitness trackers in favor of a **"Cinematic Performance"** aesthetic. 

**Creative North Star: The High-Intensity Gallery**
The UI should feel like a premium fitness magazine brought to life. We achieve this through:
*   **Intentional Asymmetry:** Breaking the standard 12-column grid with staggered card heights and overlapping typography.
*   **Tonal Depth:** Moving away from flat surfaces to a "layered glass" philosophy.
*   **Athletic Contrast:** Pitting deep, infinite blacks against high-frequency neon accents to create a sense of energy and "after-hours" grit.

---

## 2. Colors & Surface Philosophy
The palette is rooted in an ultra-dark environment to minimize eye strain during early morning or late-night sessions, while using "Electric Lime" and "Bolt Blue" as high-energy triggers.

### The "No-Line" Rule
**Borders are strictly prohibited for sectioning.** 1px solid lines create visual "noise" that interrupts the flow of a premium experience. Boundaries must be defined through:
1.  **Background Shifts:** Placing a `surface-container-low` card on a `surface` background.
2.  **Negative Space:** Using generous padding to define blocks of content.
3.  **Tonal Transitions:** Subtle shifts between `#000000` and `#0e0e0e`.

### Surface Hierarchy & Nesting
Treat the UI as physical layers. Use the following tiers to create "nesting":
*   **Base Layer:** `surface` (#0e0e0e) for the main application background.
*   **Level 1 (Sections):** `surface-container-low` (#131313) for secondary background areas.
*   **Level 2 (Active Cards):** `surface-container` (#191919) for primary content containers.
*   **Level 3 (Floating/Interactions):** `surface-container-highest` (#262626) for modals and tooltips.

### The "Glass & Gradient" Rule
To elevate the "Electric Lime" (`primary_container`: #d4fb00), never use it as a flat block for large areas. 
*   **Signature Gradients:** For CTAs, use a linear gradient from `primary` (#f5ffc5) to `primary_dim` (#c9ef00) at a 135-degree angle.
*   **Glassmorphism:** For floating stats overlays (e.g., pace/heart rate over a map), use `surface-variant` at 60% opacity with a `20px` backdrop-blur.

---

## 3. Typography
The system utilizes two distinct typefaces to balance data-heavy layouts with motivational boldness.

*   **Display & Headlines (Lexend):** A geometric sans-serif that feels expansive and athletic. Use `display-lg` through `headline-sm` for workout titles, PR numbers, and motivational headers. Use tight letter-spacing (-2%) for headlines to increase visual impact.
*   **Body & Labels (Inter):** A workhorse for legibility. Use `body-md` for workout descriptions and `label-sm` for data units (e.g., "BPM" or "KM").

**Hierarchy Tip:** Contrast a `display-lg` metric (e.g., "185") with a `label-md` unit (e.g., "BPM") placed in an all-caps, heavy weight to mimic high-end sports broadcasting.

---

## 4. Elevation & Depth
We define depth through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** To lift a card, do not add a shadow. Instead, transition from `surface-container-lowest` (#000000) for the background to `surface-container` (#191919) for the card.
*   **Ambient Shadows:** For floating elements (like a "Start Run" FAB), use a shadow color derived from the primary accent: `rgba(212, 251, 0, 0.15)` with a 32px blur and 16px Y-offset.
*   **The "Ghost Border" Fallback:** If a container sits on a background of the same color, use a 1px border using `outline-variant` (#484848) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Rounded `full` (pill-shaped). Background: `primary_container` gradient. Text: `on_primary_fixed` (#3d4a00) in Bold.
*   **Secondary:** Rounded `md` (1.5rem). Background: Transparent with a `ghost border`. Text: `on_surface`.
*   **Tertiary:** No background. `label-md` text with a subtle `secondary` (#00e3fd) underline.

### Data Cards (The Fitness Core)
*   **Structure:** No dividers. Use `surface-container` with `md` (1.5rem) or `lg` (2rem) rounded corners.
*   **Nesting:** Place "Split Times" in a `surface-container-highest` box inside the main card to create a "recessed" look.
*   **Glass Effect:** Maps and progress rings should use backdrop-blur backgrounds to maintain the "Frosted Performance" feel.

### Input Fields
*   **State:** Default state is `surface-container-highest` with no border.
*   **Focus:** Transition background to `surface-bright` (#2c2c2c) and add a `primary` glow.
*   **Error:** Use `error_dim` (#d53d18) for text and a 20% opacity `error` background tint.

### Performance Chips
*   **Action Chips:** Used for "Add Exercise." Use `secondary_container` (#006875) with `on_secondary_fixed` text for high-contrast visibility.

---

## 6. Do's and Don'ts

### Do
*   **Use Vertical White Space:** Use the `xl` (3rem) spacing token to separate different workout types.
*   **Embrace Asymmetry:** Align high-level stats (Distance) to the left and secondary stats (Calories) slightly staggered to the right.
*   **Tint Your Blacks:** Ensure the background is `#0e0e0e` rather than a "flat" grey to maintain depth.

### Don't
*   **Don't Use Dividers:** Never use horizontal lines to separate list items. Use a 4px gap and a background color shift instead.
*   **Don't Use 100% Opacity Borders:** They break the "Glassmorphism" illusion. Always use the Ghost Border fallback.
*   **Don't Cluster Data:** If a screen has more than 5 metrics, use a horizontal "Carousel" of cards rather than a vertical list to maintain the editorial breathability.