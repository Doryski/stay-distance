import {
  useOrigins,
  useSelectedOrigins,
  useSettings,
} from "../core/hooks/useActiveOrigin"
import { updateSettings } from "../core/storage/settings"
import { TRANSPORT_MODES } from "../core/types"
import { Logo } from "../components/brand/Logo"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { Switch } from "../components/ui/switch"

export const Popup = () => {
  const [origins] = useOrigins()
  const { selectedIds, toggle } = useSelectedOrigins()
  const [settings] = useSettings()

  return (
    <div className="flex w-80 flex-col gap-4 p-4">
      <header className="flex items-center gap-2">
        <Logo size={22} />
        <span className="text-sm font-semibold tracking-tight">Stay Distance</span>
      </header>

      <div className="grid gap-2">
        <Label>Active places</Label>
        {origins.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            No places yet — open the side panel to add one.
          </p>
        ) : (
          <ul
            role="group"
            aria-label="Active places"
            className="flex flex-col divide-y divide-[var(--border)] rounded-md border border-[var(--border)] bg-[var(--background)]"
          >
            {origins.map((o) => {
              const checked = selectedIds.includes(o.id)
              return (
                <li
                  key={o.id}
                  className="flex items-center gap-2 px-3 py-2 first:rounded-t-md last:rounded-b-md"
                >
                  <input
                    type="checkbox"
                    id={`popup-origin-${o.id}`}
                    checked={checked}
                    onChange={() => toggle(o.id)}
                    aria-label={`Toggle ${o.label}`}
                    className="size-4 cursor-pointer accent-[var(--primary)]"
                  />
                  <label
                    htmlFor={`popup-origin-${o.id}`}
                    className="min-w-0 flex-1 cursor-pointer truncate text-sm"
                  >
                    {o.label}
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="popup-mode">Transport</Label>
        <Select
          value={settings.transportMode}
          onValueChange={(value) =>
            updateSettings({
              transportMode: (value as (typeof TRANSPORT_MODES)[number]) ?? "driving",
            })
          }
        >
          <SelectTrigger id="popup-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSPORT_MODES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2">
        <Label htmlFor="popup-badge" className="flex-1 cursor-pointer">
          Show inline time on listings
        </Label>
        <Switch
          id="popup-badge"
          checked={settings.showInlineBadge}
          onCheckedChange={(checked) => updateSettings({ showInlineBadge: checked })}
        />
      </div>
    </div>
  )
}
