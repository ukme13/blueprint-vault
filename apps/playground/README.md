# Blueprint Playground

The playground is an internal workspace for OKLCH palette generation, token
experiments, and live component previews.

Run it from the repository root:

```sh
pnpm --filter playground dev
```

Open <http://localhost:3000>.

Playground-only React components live in `components/palette`. Reusable colour
conversion and palette-generation functions come from
`packages/ui/src/color`.
