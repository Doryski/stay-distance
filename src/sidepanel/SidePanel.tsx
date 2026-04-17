import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { OriginManager } from "../core/ui/OriginManager"
import { MatrixView } from "../core/ui/MatrixView"
import { ExportPdfButton } from "../core/ui/ExportPdfButton"
import { ThresholdSettings } from "../core/ui/ThresholdSettings"
import { sendMessage } from "../core/messaging/client"
import { MESSAGE_KIND } from "../core/messaging/protocol"
import { Logo } from "../components/brand/Logo"
import { Button } from "../components/ui/button"
import { Separator } from "../components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip"

export const SidePanel = () => {
  const [spinning, setSpinning] = useState(false)

  const handleClearCache = () => {
    setSpinning(true)
    sendMessage({ kind: MESSAGE_KIND.clearCaches })
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/95 px-4 py-3 backdrop-blur">
        <Logo size={28} />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Stay Distance</span>
          <span className="truncate text-xs text-[var(--muted-foreground)]">
            Travel times from your places to booking.com listings.
          </span>
        </div>
      </header>

      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4">
        <OriginManager />
        <Separator />
        <ThresholdSettings />
        <Separator />
        <MatrixView />
      </main>

      <Separator />
      <footer className="flex items-center justify-between gap-2 px-4 py-3 text-[11px] text-[var(--muted-foreground)]">
        <span>
          Routes © <span className="font-medium">OpenStreetMap</span> contributors
        </span>
        <div className="flex items-center gap-1">
          <ExportPdfButton />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearCache}>
                <RefreshCw
                  className="size-3.5"
                  style={spinning ? { animation: "spin 0.6s linear 1" } : undefined}
                  onAnimationEnd={() => setSpinning(false)}
                />
                Clear cache
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="end">
              Clears saved address and route lookups. Useful if a distance looks wrong, an
              address resolved to the wrong place, or you want to remove lookup history.
              Fresh lookups will be slower.
            </TooltipContent>
          </Tooltip>
        </div>
      </footer>
    </div>
  )
}
