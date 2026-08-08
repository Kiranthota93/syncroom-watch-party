# SyncRoom — Room feature (JSX export)

Drop-in JS/JSX version of the Room feature, converted from the TSX source in this project. Copy the folders into your external repo, then wire the route.

## File mapping (copy into your target repo)

| From `room-jsx-export/`        | To your repo                          |
| ------------------------------ | ------------------------------------- |
| `routes/room.$roomCode.jsx`    | `src/routes/room.$roomCode.jsx`       |
| `components/room/*.jsx`        | `src/components/room/`                |
| `hooks/room/index.js`          | `src/hooks/room/index.js`             |
| `lib/room/mock-data.js`        | `src/lib/room/mock-data.js`           |

The TanStack route id `/room/$roomCode` is derived from the filename — keep the dots.

## Required npm dependencies

```
@tanstack/react-router
@tanstack/react-query   # only if you want it in your app (not used by these files directly)
lucide-react
sonner
tailwindcss
```

## Required shadcn/ui primitives

Generate these once (`npx shadcn@latest add ...`):

- `button`
- `dialog`
- `dropdown-menu`
- `input`
- `label`
- `scroll-area`
- `sheet`
- `slider`
- `switch`
- `tabs`

And the `cn` helper at `src/lib/utils.js`:

```js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) { return twMerge(clsx(inputs)); }
```

## Required Tailwind tokens / classes

Add these to your `tailwind.config` theme (or global CSS) so the styles resolve:

- Colors: `primary`, `primary-glow`, `primary-foreground`, `success`, `destructive`, `muted`, `muted-foreground`, `card`, `background`, `foreground`, `glass-border`.
- Utility classes used in JSX: `glass` (backdrop-blur + translucent bg), `glow-primary` (soft primary box-shadow), `shadow-elevated`.
- Custom keyframes/animations: `animate-ring-pulse`, `animate-speaking-bar`, `animate-reaction-float`.

Example CSS snippet (adapt to your tokens):

```css
.glass { @apply bg-white/5 backdrop-blur-xl border border-white/10; }
.glow-primary { box-shadow: 0 0 40px -8px hsl(var(--primary) / 0.6); }
.shadow-elevated { box-shadow: 0 20px 60px -20px rgb(0 0 0 / 0.6); }

@keyframes ring-pulse { 0%,100% { box-shadow: 0 0 0 0 hsl(var(--primary)/0.6);} 50%{ box-shadow: 0 0 0 6px hsl(var(--primary)/0);} }
@keyframes speaking-bar { 0%,100% { transform: scaleY(0.4);} 50%{transform: scaleY(1);} }
@keyframes reaction-float { 0% { transform: translateY(0); opacity: 0;} 15%{opacity:1;} 100%{transform: translateY(-260px); opacity: 0;} }

.animate-ring-pulse { animation: ring-pulse 1.4s ease-in-out infinite; }
.animate-speaking-bar { animation: speaking-bar 0.9s ease-in-out infinite; transform-origin: bottom; }
.animate-reaction-float { animation: reaction-float 2.4s ease-out forwards; }
```

## Notes

- All state is mock (`hooks/room/index.js`, `lib/room/mock-data.js`). Swap for your real services (WebRTC, socket, presence) later.
- Toaster comes from `sonner`; render it once — the route already includes one.
- No TypeScript, no `.d.ts` files. Pure JS/JSX.
