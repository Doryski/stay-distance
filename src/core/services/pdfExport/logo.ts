import { PDF_THEME } from "./theme"

export const PDF_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="32" height="32">
  <circle cx="64" cy="64" r="52" fill="none" stroke="${PDF_THEME.color.accent}" stroke-opacity="0.7" stroke-width="4"/>
  <circle cx="64" cy="64" r="34" fill="none" stroke="${PDF_THEME.color.foreground}" stroke-opacity="0.4" stroke-width="3"/>
  <path d="M64 20 C 46 20 32 34 32 52 C 32 76 64 108 64 108 C 64 108 96 76 96 52 C 96 34 82 20 64 20 Z" fill="${PDF_THEME.color.primary}"/>
  <circle cx="64" cy="50" r="11" fill="${PDF_THEME.color.background}"/>
</svg>`
