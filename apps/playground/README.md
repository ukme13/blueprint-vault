# Blueprint Playground

The playground is an internal workspace for creating OKLCH colour systems,
inspecting shades, and exporting design tokens. Its recommended default is the
20-shade `Blueprint 20` preset.

Run it from the repository root:

```sh
pnpm --filter playground dev
```

Open <http://localhost:3000>.

Playground-only React components live in `components/palette`. Reusable colour
conversion and palette-generation functions come from
`packages/ui/src/color`.
