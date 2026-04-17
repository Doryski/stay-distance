import { cn } from "@/lib/utils"

type LogoProps = {
  size?: number
  variant?: "mark" | "lockup"
  wordmark?: string
  className?: string
  titleId?: string
}

export const Logo = ({
  size = 32,
  variant = "mark",
  wordmark = "Stay Distance",
  className,
  titleId = "stay-distance-logo-title",
}: LogoProps) => {
  const mark = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      role="img"
      aria-labelledby={titleId}
      className="shrink-0"
    >
      <title id={titleId}>{wordmark}</title>
      <circle
        cx="64"
        cy="64"
        r="52"
        fill="none"
        stroke="var(--color-brand-warm, #f2a541)"
        strokeOpacity="0.7"
        strokeWidth="4"
      />
      <circle
        cx="64"
        cy="64"
        r="34"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="3"
      />
      <path
        d="M64 20 C 46 20 32 34 32 52 C 32 76 64 108 64 108 C 64 108 96 76 96 52 C 96 34 82 20 64 20 Z"
        fill="var(--primary, #2E7D4F)"
      />
      <circle cx="64" cy="50" r="11" fill="var(--background, #FAFAF7)" />
    </svg>
  )

  if (variant === "mark") {
    return <span className={cn("inline-flex", className)}>{mark}</span>
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark}
      <span className="font-semibold tracking-tight leading-none">{wordmark}</span>
    </span>
  )
}
