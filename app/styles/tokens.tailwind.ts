/**
 * tokens.tailwind.ts -- AUTO-GENERATED from .ai-dev-kit/registries/design-tokens.yaml
 * Merge into your tailwind.config:
 *   import { tokens } from './app/styles/tokens.tailwind';
 *   export default { theme: { extend: tokens }, ... };
 */

export const tokens = {
  colors: {
    "brand": {
      "accent": "#14b8a6",
      "accent-subtle": "#0d9488",
      "accent-muted": "#134e4a",
      "accent-light": "#2dd4bf"
    },
    "neutral": {
      "50": "#fafafa",
      "100": "#f5f5f5",
      "200": "#e5e5e5",
      "300": "#d4d4d4",
      "400": "#a3a3a3",
      "500": "#737373",
      "600": "#525252",
      "700": "#404040",
      "800": "#262626",
      "900": "#171717",
      "950": "#0a0a0a"
    },
    "semantic": {
      "success": "#22c55e",
      "error": "#ef4444",
      "warning": "#eab308",
      "info": "#3b82f6"
    },
    "light": {
      "bg-primary": "#fafafa",
      "bg-secondary": "#f5f5f5",
      "text-primary": "#171717",
      "text-secondary": "#525252"
    }
  },
  spacing: {
    "space-1": "4px",
    "space-2": "8px",
    "space-3": "12px",
    "space-4": "16px",
    "space-5": "20px",
    "space-6": "24px",
    "space-8": "32px",
    "space-10": "40px",
    "space-12": "48px",
    "space-16": "64px"
  },
  borderRadius: {
    "sm": "6px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "2xl": "24px",
    "full": "9999px"
  },
  boxShadow: {
    "sm": "0 1px 2px 0 rgb(0 0 0 / 0.2)",
    "md": "0 4px 6px -1px rgb(0 0 0 / 0.3)",
    "glow-mint": "0 0 20px rgb(20 184 166 / 0.15)"
  },
  screens: {
    "mobile": "0px",
    "tablet": "768px",
    "desktop": "1024px",
    "wide": "1440px"
  },
} as const;
