export const PDF_THEME = {
  color: {
    background: "#FAFAF7",
    foreground: "#1C2B2D",
    muted: "#6B7A7C",
    border: "#E6E4DC",
    primary: "#2E7D4F",
    primaryFg: "#FFFFFF",
    accent: "#F2A541",
    accentSoft: "#FDF1DA",
    rowAlt: "#F1F2EE",
  },
  font: {
    family: "Roboto",
  },
  size: {
    title: 16,
    subtitle: 10,
    meta: 9,
    tableHeader: 9,
    tableBody: 10,
    addressCell: 9,
    footer: 8,
  },
} as const

export type PdfTheme = typeof PDF_THEME
