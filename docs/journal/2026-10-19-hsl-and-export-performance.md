# 2026-10-19 — HSL joins the colour formats, and a long export no longer freezes the dialog

Five commits on `feat/hsl-and-export-performance`, cut from `main` after the inspector
page branch merged. HSL is a fourth colour format everywhere the other three are, and
the export dialog stays answerable when the accessibility report in JSON, a million
characters on 37,000 lines, is chosen.

## Key changes

- **HSL.** `hexToHsl`, `hslToHex`, `rgbToHsl` and `hslToRgb` sit in `conversion.ts`;
  `COLOUR_FORMATS` gains `"hsl"` (labelled HSL). `formatColour` writes
  `hsl(209.9 100% 50%)` (at most one decimal, no trailing zero) and `parseColour`
  reads the CSS spellings: spaces, commas, a `deg` unit. The shade popover, the
  export dialog and the persisted choice pick it up through the list; the picker has
  Hue, Saturation and Lightness sliders (`HslChannels`), sharing `ChannelControl`,
  which moved to its own file. The CSS, Tailwind and token exports write `hsl(...)`.
- **Heavy formats are made when chosen.** The handover archive and the two reports used
  to be built whenever the dialog mounted or a format changed. `useExportOutput` makes
  them only when chosen, keeps the result per format, and makes nothing while the
  dialog is closed. The preview shows a spinner ("Generating report…") and Download
  waits.
- **The preview shows the start of a long export.** Measured, the JSON report is
  1,029,279 characters; computing it takes about 8 ms. What froze the page was
  `CodeBlock` highlighting and numbering 37,596 lines. `exportPreviewExcerpt`
  (in `packages/ui`) cuts the preview on a whole line, and a note says how much is
  shown: at 4,000 lines or 150,000 characters for a file, and at 1,000 lines for a
  report, whose JSON runs to tens of thousands. Only the JSON report reaches either. The downloaded file is never cut.
- **A worker makes them.** `export-worker.ts` runs the same two functions the page
  would; the page falls back to making the file itself, after the spinner paints, when
  a worker cannot be had, fails, or cannot be sent the project.
- **Copy buttons copy what is meant.** The code block's copy button puts the whole of a
  truncated export on the clipboard (`onCopy`). The picker's swatch is a button that
  copies the colour in the field, in the chosen format, with the "Color copied" toast
  now shared with the shade popover (`useCopyColour`).
- **Two small visual fixes.** The colour field's input draws no border of its own, the
  picker footer's rule is subtle, and the vision pill's selector is written in the
  colour that reads on the action fill, on that fill.
- **Tests.** Unit tests for conversion (including a round trip over several thousand
  colours), format, parse, the exports and the excerpt. End-to-end: HSL in the popover,
  picker and export; the loading state under a throttled CPU; the worker, and the
  fallback without one; the full copy and download of a long report; no long task over
  500 ms while Markdown and JSON are switched; the contrast of the vision pill in light
  and dark. Each was broken once on purpose and failed.

## Architectural decisions

- **The cap is a domain function.** Cutting a string to what can be drawn takes a value
  and returns one, so it is in `packages/ui` with its tests, and the dialog only draws
  what it returns.
- **A worker with a fallback, not a worker alone.** The worker's scope is typed locally,
  because the app is typed against the DOM and the worker lib would redeclare half of
  it. Anything that stops it from working leaves the export made on the page, which is
  slower to answer and the same file.
- **One toast for every colour copied.** A shared id means two copies in a row replace
  the first instead of stacking.

## Lessons learned

- **The first fix was aimed at the wrong cost.** Deferring the computation was
  reasonable and did not help; the number that mattered, the size of what was drawn,
  was not measured until the freeze came back. Measure the output before moving the
  work.
- **A spec for a colour is not a spec for its ground.** Writing the pill's text in the
  action fill's text colour measured 3.6:1 in light and 1.0:1 in dark, because the
  pill sat on the muted accent, not the fill. The pill now has the fill, and a test
  holds 4.5:1 in both themes.
- **A passing test proves nothing until it has failed.** The border test for the colour
  field passes without the CSS it was written for: Astryx's input already draws none in
  Chromium. It stays as a guard; it does not prove the rule is what removes a double
  border.
- **The Windows clipboard turns `\n` into `\r\n`.** A test that compares the clipboard to
  a file has to say so.
- **A selector can match what was added.** `[class*="colourHexSwatch"]` matched the new
  `colourHexSwatchButton` as well; the existing test now names the element.
- **The first cap was too tight, and CI found it.** At 500 lines the preview of the CSS
  hid the type scale, and a test in the spacing studio that reads it from the preview
  failed on all three attempts. The plain exports are 800 to 3,000 lines and drew
  fine before; the cap was set from the one export that froze. It is now per kind,
  and I had not run that spec: a change to the dialog needs every spec that opens it.
- **Flaky tests, reported and not changed.** "A press on its own controls is theirs"
  (colour-picker-tools) failed once on a loaded first run and passed on every run after.
