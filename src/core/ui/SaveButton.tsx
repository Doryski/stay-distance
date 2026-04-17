import { Bookmark, BookmarkCheck } from "lucide-react"
import { cn } from "../../lib/utils"

type Props = {
  saved: boolean
  onToggle: () => void
}

export const SaveButton = ({ saved, onToggle }: Props) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      onToggle()
    }}
    aria-pressed={saved}
    className={cn(
      "inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1",
      "text-[12px] font-medium leading-none",
      "border shadow-sm transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand,#2E7D4F)]",
      saved
        ? "border-transparent bg-[var(--brand,#2E7D4F)] text-white hover:brightness-110"
        : "border-[var(--border)] bg-[var(--surface,#fff)] text-[var(--surface-fg,#1C2B2D)] hover:bg-[var(--surface,#fff)]/80"
    )}
  >
    {saved ? (
      <BookmarkCheck className="size-3.5" aria-hidden />
    ) : (
      <Bookmark className="size-3.5" aria-hidden />
    )}
    <span>{saved ? "Saved" : "Save"}</span>
  </button>
)
