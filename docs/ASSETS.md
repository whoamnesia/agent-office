# Assets

All graphics are generated procedurally and deterministically by `packages/asset-gen`:

```bash
npm run assets
```

It writes `packages/office-web/public/assets/` and `plugin/.claude-plugin/icon.png`. There are no third-party images or sounds: sprites are drawn pixel by pixel in code, and sound is synthesised with WebAudio at runtime.

## Atlases

| Sheet | Contents |
|---|---|
| `chars` | 35 character presets × 2 facings × 15 animations (`idle, walk, carry, sit, type, read, think, hand, error, joy, sleep, coffee, phone, stretch, dance`), plus the mascot, the cat, dogs and pigeons |
| `office` | floor tiles (wood, department carpets, kitchen, server, marble), walls with windows, glass partitions, desks with monitor and laptop, chairs, screen overlays per status, furniture, desk decor |
| `city` | ground tiles (grass, paving, asphalt with lane marks, crosswalk, rails, granite, water ×4 frames), trees, street props, the café, food truck, flower stall, metro entrance, bus stop, billboards, cars/taxis/bus/tram/train/boat in every direction, seasonal pumpkins |
| `fx` | status icons, particles, rain and snow, the plane, the UFO, the ghost, the disco ball, light cookies |
| `buildings` | tower slab, façade and its lit-window overlay, translucent front glass, lobby, roof, 5 decorative towers with their night overlays |
| `sky/*.png` | tileable skyline layers (far and mid) with night-window overlays; clouds |

### Format

Each sheet is a standard Pixi spritesheet (`<sheet>.json` + `<sheet>.png`). Frames are trimmed (`spriteSourceSize`/`sourceSize`) and carry an `anchor`:

- **Characters**: anchored at the feet (12, 34) in a 24×36 frame. Animation frames are listed under `animations["<preset>/<front|back>/<anim>"]`.
- **Iso objects**: anchored at the screen position of the back corner of their footprint (tile 0,0 at z=0). Tile = 32×16 art pixels.
- **Ground tiles**: 32×16 diamonds anchored at (16, 0).

`manifest.json` holds the shared constants (storey sizes, monitor geometry, preset list).

## Overriding with your own art

Put PNG atlases next to a `custom.json` in `assets/custom/`. In a dev checkout that's `packages/office-web/public/assets/custom/`; in the installed plugin it's `plugin/dist/web/assets/custom/`.

```json
{ "sheets": ["my-chars"] }
```

`my-chars.json` and `my-chars.png` use the same format. Every frame whose name matches a built-in frame **replaces** it. Animation lists replace by animation name. So to restyle the director, provide frames `director/front/idle/0`, `director/front/idle/1`, … with the same anchors.

Only use art you made yourself, or art that is CC0 or otherwise licensed for redistribution.

## Licence

Generated assets are part of this repository (MIT). Fonts are bundled from `@fontsource` under the SIL Open Font License:

- Pixelify Sans, with Cyrillic support, for the interface;
- VT323 for numbers.
