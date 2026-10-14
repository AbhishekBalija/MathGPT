# NeoMath brand

The logo is the word **NeoMath** in Honk, with **π-Neo** (the mascot) sitting
on the `h`. Neo is the π symbol: the bar is his head, the legs hang over the
`h` like someone sitting on a ledge.

## Files

| File | Use |
| --- | --- |
| `frontend/public/brand/neomath-wordmark.svg` | Wordmark, light backgrounds |
| `frontend/public/brand/neomath-wordmark-dark.svg` | Wordmark with a white sticker rim, dark backgrounds |
| `frontend/public/brand/neo.svg` | Neo on his own |
| `frontend/public/favicon.svg`, `favicon-*.png`, `favicon.ico` | Browser tab (Neo with a white rim) |
| `frontend/public/apple-touch-icon*.png`, `android-chrome-*.png` | Home-screen icons |
| `frontend/public/og-image.png` | Link preview card (1200×630) |
| `frontend/public/brand/scene-steps.svg`, `scene-steps-dark.svg` | Illustration: Neo on top of three steps (1, 2, ✓). Used on the auth pages. Numbers are drawn shapes, so no font is needed |

In the app, use the components instead of the files:

- `<Logo height="28px" />` (`src/components/brand/Logo.tsx`): wordmark plus Neo,
  switches to the dark file in dark mode. For a responsive size pass a CSS
  variable: `className="[--logo-h:24px] md:[--logo-h:30px]"` on a parent and
  `height="var(--logo-h)"`.
- `<NeoMascot className="w-8 h-8" />` (`src/components/brand/NeoMascot.tsx`):
  Neo alone. Give it a `title` when it is the only label (e.g. an icon link).

## Why the wordmark is a baked SVG

Honk is a colour font (COLRv1: every letter is three layers filled with
gradients). Browsers without COLRv1 support would show plain letters, and the
font file would have to load before the logo appears. So the word is "baked":
the three layers and gradients are copied into a normal SVG, using Honk's own
colours (palette 0). It looks the same in every browser and needs no font.

Honk is licensed under the SIL Open Font License, which allows use in a logo.

## Sizes and spacing

- The wordmark should not be shorter than about **24px**. Below that, use Neo
  alone (sidebar headers, admin bar, avatars).
- Neo adds about a third of the word's height above it. `Logo` already
  includes that space, so align it like any other box.
- Keep clear space around the logo of at least the height of Neo's head.

## Colours

| Token | Hex | Use |
| --- | --- | --- |
| Logo yellow → pink | `#fffb9c` → `#ffb46b` → `#ee4fa8` | Neo and the wordmark only |
| `brand-500` | `#ff3caf` | Logo pink: shapes, tints, borders. Too light for text on white |
| `brand-600` | `#d1257f` | Text and buttons on white (4.9:1 contrast) |
| `brand-700` | `#b0156e` | Hover |
| `brand-300` | `#ff5cbf` | Text on dark (7.1:1 on `#0a0a0a`) |
| Warm black | `#120d12` | Dark-mode surfaces (navbar, hero), so the warm logo does not clash with blue-greys |

Main buttons stay black (white in dark mode). Pink is for accents.

## Dark mode

The wordmark keeps its black outline and gains a white rim, like a sticker on
a laptop. Neo does the same (`NeoMascot` adds the rim under `.dark`).

## Neo's rig (for animation)

Every part of Neo is its own group, so thinking and loading animations can
move them without redrawing him:

| Class | Part | Natural pivot |
| --- | --- | --- |
| `neo-body` | Whole mascot | centre bottom |
| `neo-leg-left`, `neo-leg-right` | Legs | the hip, where the leg meets the head |
| `neo-head` | The π bar | centre |
| `neo-eyes` | Eye whites + pupils | centre of the eyes (blink = scaleY) |
| `neo-pupils` | Pupils | move with translate to "look" |
| `neo-brow-left`, `neo-brow-right` | Eyebrows | translateY to raise |
| `neo-mouth` | Mouth | |

Motion rules: transform and opacity only, and always respect
`prefers-reduced-motion`. The motion itself is designed as a separate step.

## Regenerating the files

The files were generated from Honk (Google Fonts) and the Neo rig with
fontTools, skia-pathops and resvg. If the logo changes, regenerate every file
together so they stay identical, and update the measurements at the top of
`Logo.tsx` (they come from the wordmark's size and the position of the `h`).
