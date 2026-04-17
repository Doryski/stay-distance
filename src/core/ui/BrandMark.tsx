import type { SVGProps } from "react"

// Inlined from public/icons/icon.svg so it renders inside the content-script
// shadow DOM without needing web_accessible_resources.
export const BrandMark = ({
  title,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 128 128"
    role={title ? "img" : "presentation"}
    aria-label={title}
    {...props}
  >
    <circle
      cx="64"
      cy="64"
      r="52"
      fill="none"
      stroke="#F2A541"
      strokeOpacity="0.7"
      strokeWidth="4"
    />
    <circle
      cx="64"
      cy="64"
      r="34"
      fill="none"
      stroke="#6B7A7C"
      strokeOpacity="0.55"
      strokeWidth="3"
    />
    <path
      d="M64 20 C 46 20 32 34 32 52 C 32 76 64 108 64 108 C 64 108 96 76 96 52 C 96 34 82 20 64 20 Z"
      fill="#2E7D4F"
    />
    <circle cx="64" cy="50" r="11" fill="#FAFAF7" />
  </svg>
)
