# KinMeet theme tokens

Components use Tailwind utilities. Color that should follow the active theme uses role names (`bg-canvas`, `text-foreground`, `bg-primary`). Brand scales (`bg-kin-coral-100`, `from-kin-coral`, `to-kin-teal`) stay fixed and are for chips, gradients, and logo moments.

The app currently ships one theme: light. Dark mode is not registered.

## Layers

| File | Role |
|------|------|
| `src/styles/palette.css` | Fixed brand scales, fonts, and radii |
| `src/styles/semantic.css` | Maps each role to a runtime CSS variable (`@theme inline`) |
| `src/styles/themes/light.css` | Light assignment, also the `:root` default |
| `src/styles/base.css` | Body, scrollbar, and focus ring, using the role variables |
| `src/constants/ui.ts` | Repeated button, field, and card class strings |
| `src/constants/themes.ts` | Registered theme names and the `localStorage` key |

`@theme inline` is required. It makes `bg-canvas` compile to `background-color: var(--canvas)`, so a theme file can change the value without editing components.

## Roles (light)

| Role | Utilities | Value |
|------|-----------|-------|
| canvas | `bg-canvas` | `#F9F1E3` |
| surface | `bg-surface` | `#FFFFFF` |
| surface-muted | `bg-surface-muted` | `#F9F1E3` |
| surface-hover | `bg-surface-hover` | `#F0E0C0` |
| foreground | `text-foreground` | `#113B50` |
| muted | `text-muted` | `#4F7A72` |
| border | `border-border`, `divide-border` | `#D7D3CF` |
| primary | `bg-primary` | `#F47A5F` |
| primary-hover | `hover:bg-primary-hover` | `#F15A3A` |
| primary-foreground | `text-primary-foreground` | `#FFFFFF` |
| secondary | `bg-secondary` | `#D7D3CF` |
| secondary-hover | `hover:bg-secondary-hover` | `#C3BDB7` |
| secondary-foreground | `text-secondary-foreground` | `#113B50` |
| ring | `ring-ring`, `outline-ring` | `#F47A5F` |
| overlay | `bg-overlay` | `rgb(0 0 0 / 0.5)` |

Shadows keep the names `shadow-kin-soft`, `shadow-kin-medium`, and `shadow-kin-strong` (navy at 8%, 12%, and 16%).

`surface-hover` is the stronger hover used on canvas (chat rows). `surface-muted` is the lighter hover and inset fill used on white cards. `secondary-hover` is the stone-button hover.

## What stays on the palette

- Language, interest, and looking-for chips
- Avatar and header gradients
- Alert chips that pair a `*-50` background with a `*-700` text color
- Teal actions (`bg-kin-teal`) and stronger coral actions (`bg-kin-coral-700`)
- Logo artwork

## Adding a theme

Yes. A theme is a different color combination for the roles above. Components already use `bg-canvas`, `text-foreground`, `bg-primary`, and the other utilities, so they do not need new class names.

Copy `src/styles/themes/light.css` to `src/styles/themes/<name>.css` and replace the values. Keep every variable name. Point the selector at the new theme instead of `:root`:

```css
[data-theme="<name>"] {
  color-scheme: light;
  --canvas: /* page background */;
  --surface: /* cards, nav, modals */;
  --surface-muted: /* hover and inset fills on cards */;
  --surface-hover: /* hover on the page background */;
  --foreground: /* headings and body text */;
  --muted: /* helper text */;
  --border: /* borders and dividers */;
  --primary: /* main button */;
  --primary-hover: /* main button hover */;
  --primary-foreground: /* text on the main button */;
  --secondary: /* secondary button */;
  --secondary-hover: /* secondary button hover */;
  --secondary-foreground: /* text on the secondary button */;
  --ring: /* focus ring */;
  --overlay: /* modal scrim */;
  --shadow-soft: /* button shadow */;
  --shadow-medium: /* card shadow */;
  --shadow-strong: /* modal shadow */;
}
```

The file does not turn on by itself. Register the same name in three places:

1. Import it from `src/index.css`, next to `light.css`.
2. Add `"<name>"` to `THEME_PREFERENCES` in `src/constants/themes.ts`.
3. Add `"<name>": true` to the `allowed` map in the script in `index.html`, so the first paint uses it.

`ThemeProvider` writes the stored preference to `<html data-theme>`. A stored value that is not in `THEME_PREFERENCES` falls back to `light`. There is no theme control in the account menu until a second theme exists. Chips, avatar gradients, and the logo stay on the fixed palette in `palette.css` and do not follow the new combination.
