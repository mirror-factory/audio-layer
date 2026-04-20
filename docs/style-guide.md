# Layer One — Style Guide

## Layout

- **Page background:** `bg-[#0a0a0a]`
- **Card background:** `bg-[#171717]`
- **Safe areas:** Use `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for mobile/desktop
- **Touch targets:** Minimum 44px (iOS HIG)
- **Page padding:** 16px mobile, 24px desktop
- **TopBar height:** 56px + safe area top (no bottom nav — use hamburger menu)

## Components

### Buttons
- **Primary:** `bg-[#14b8a6] text-[#0a0a0a]` with `hover:bg-[#0d9488]`, rounded-md (6px)
- **Secondary:** `border border-[#262626] text-[#d4d4d4]` with hover background shift
- **Destructive:** `bg-[#ef4444] text-white`
- **Ghost:** transparent with hover tint

### Cards
- Background: `#171717`, border: `1px solid #262626`, radius: 12px
- Inner padding: 16px mobile, 24px desktop

### Status Chips
- Processing: pulsing mint dot + "Processing" text
- Completed: solid green dot + "Completed"
- Error: solid red dot + "Error"

### Input Fields
- Background: `#171717`, border: `#262626`, focus ring: `#14b8a6`
- Monospace font, 14px, placeholder at 50% opacity

### Slide Menu
- Width: 280px, slides from right
- Background: `#171717` with `#0a0a0a` overlay behind
- Active item: mint text, subtle mint left border
- z-index: 50

## Typography Scale

| Variant | Size | Weight | Line Height | Use |
|---------|------|--------|-------------|-----|
| display | 32px | 600 | 1.2 | Page hero titles |
| heading-lg | 24px | 600 | 1.3 | Section headings |
| heading-md | 18px | 600 | 1.4 | Card titles |
| heading-sm | 14px | 600 | 1.4 | Sub-headings |
| body | 14px | 400 | 1.6 | Main content |
| body-sm | 12px | 400 | 1.5 | Secondary content |
| caption | 10px | 500 | 1.4 | Labels, badges |

## Spacing

Base unit: 4px. All spacing uses multiples: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

## Dark/Light Mode

- Dark is primary (default)
- Light mode: swap neutrals (bg → #fafafa, text → #171717)
- Accent stays mint in both modes
- Use CSS custom properties: `--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-secondary`, `--accent`
