---
name: Academic Innovation System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#4a4455'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#732ee4'
  primary: '#630ed4'
  on-primary: '#ffffff'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#d2bbff'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#005952'
  on-tertiary: '#ffffff'
  tertiary-container: '#00746a'
  on-tertiary-container: '#8df9ea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The design system is engineered for the intersection of institutional prestige and forward-thinking research. It evokes a feeling of **intellectual energy**, balancing academic rigor with the agility of modern innovation. The primary audience includes researchers, faculty, and institutional leaders who require a tool that feels both authoritative and technologically advanced.

The aesthetic leans into **Modern Minimalism** with a **Tactile** edge. It utilizes generous whitespace to reduce cognitive load while employing subtle depth through tonal layering and precise, high-contrast typography. The interface remains grounded in logic and structure, but uses its vibrant primary color to signal key actions and areas of innovation within the academic workflow.

## Colors

The color palette is anchored by a vibrant **Vivid Violet (#7c3aed)**, which serves as the primary driver for brand identity and call-to-action elements. This is balanced by a slate-based secondary color that provides the necessary professional "weight" expected in academic environments.

- **Primary:** Violet (#7c3aed) - Used for primary buttons, active states, and progress indicators.
- **Primary Container:** A soft, desaturated tint of violet (#f5f3ff) for background highlighting and subtle grouping.
- **Secondary:** Slate (#1e293b) - Used for primary navigation, headings, and foundational UI elements to maintain a serious, grounded feel.
- **Tertiary:** Teal (#0d9488) - Reserved for success states, collaborative features, or "innovation" markers.
- **Neutral:** A range of Slate-grays for borders, secondary text, and iconography to ensure high legibility against white backgrounds.

## Typography

This design system uses a triple-font strategy to differentiate between high-level concepts, data, and technical metadata.

1.  **Manrope (Headlines):** A modern, geometric sans-serif that brings a refined, "high-end" feel to titles and section headers.
2.  **Inter (Body):** Chosen for its exceptional readability and systematic nature, handling dense academic text with ease.
3.  **JetBrains Mono (Labels/Metadata):** Used sparingly for tags, citations, and data labels to introduce a precise, "lab-standard" technical aesthetic.

Maintain tight tracking on large headlines to preserve a contemporary look, while ensuring body text has sufficient line height for long-form reading.

## Layout & Spacing

The system employs a **Fluid Grid** model with fixed maximum widths for content readability. A strict 4px baseline grid ensures vertical rhythm across all components.

- **Desktop (1440px+):** 12-column grid, 24px gutters, 64px outer margins.
- **Tablet (768px - 1439px):** 8-column grid, 20px gutters, 32px outer margins.
- **Mobile (Up to 767px):** 4-column grid, 16px gutters, 16px outer margins.

Spacing should prioritize "logical grouping." Use `xl` spacing to separate major conceptual sections and `md` spacing for related components within a card or module.

## Elevation & Depth

This design system uses **Tonal Layering** combined with **Ambient Shadows** to create a structured hierarchy. Surfaces do not "float" in a void; they sit on logical planes.

- **Level 0 (Background):** Pure white or ultra-light gray (#f8fafc).
- **Level 1 (Cards/Containers):** White background with a subtle, low-opacity border (1px, Slate-200) and a soft, diffused shadow (0 4px 12px rgba(30, 41, 59, 0.05)).
- **Level 2 (Active/Modals):** A more pronounced shadow to indicate focus, with a slight violet tint in the shadow color (rgba(124, 58, 237, 0.1)) to reinforce the primary brand color.
- **Interaction:** On hover, elements should lift slightly (2px translation) rather than just changing color, reinforcing the tactile nature of the UI.

## Shapes

The shape language is **Rounded**, reflecting a modern and approachable software experience. The standard radius is 8px (0.5rem), which strikes a balance between the clinical sharpness of legacy academic tools and the overly "bubbly" feel of consumer social apps.

- **Standard (8px):** Buttons, input fields, and small cards.
- **Large (16px):** Main content containers and dashboard widgets.
- **Pill (Full):** Used exclusively for status chips, tags, and search bars to differentiate them from actionable buttons.

## Components

- **Buttons:** Primary buttons use the #7c3aed violet with white text. Secondary buttons use a Slate-800 outline. Transitions must be smooth (200ms ease-in-out).
- **Input Fields:** Use a 1px border (#e2e8f0) that thickens and changes to #7c3aed on focus. Labels should use the `label-md` JetBrains Mono style for a technical feel.
- **Cards:** Pure white background, 16px corner radius, and a subtle Level 1 shadow. Headers within cards should use `headline-sm`.
- **Chips/Tags:** For academic categories, use the primary-container tint (#f5f3ff) with violet text (#7c3aed). For status (e.g., "Published"), use the Tertiary Teal palette.
- **Data Tables:** High-density, using `body-sm` for rows. The header row should be a subtle Slate-50 background with `label-sm` JetBrains Mono text in uppercase.
- **Academic Citation Block:** A specialized component with a left-accent border of 4px in the primary violet color to highlight source material.