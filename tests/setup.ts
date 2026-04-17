import { vi, beforeEach, afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

type StorageArea = {
  data: Record<string, unknown>
}

type ChangeListener = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
  areaName: string
) => void

const changeListeners = new Set<ChangeListener>()

const fireChanges = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>
) => {
  for (const l of changeListeners) l(changes, "local")
}

const makeStorageArea = () => {
  const state: StorageArea = { data: {} }
  return {
    state,
    get: vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
      if (!keys) return { ...state.data }
      if (typeof keys === "string")
        return keys in state.data ? { [keys]: state.data[keys] } : {}
      if (Array.isArray(keys)) {
        const out: Record<string, unknown> = {}
        for (const k of keys) if (k in state.data) out[k] = state.data[k]
        return out
      }
      const out: Record<string, unknown> = {}
      for (const [k, fallback] of Object.entries(keys)) {
        out[k] = k in state.data ? state.data[k] : fallback
      }
      return out
    }),
    set: vi.fn(async (obj: Record<string, unknown>) => {
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {}
      for (const [k, v] of Object.entries(obj)) {
        changes[k] = { oldValue: state.data[k], newValue: v }
        state.data[k] = v
      }
      fireChanges(changes)
    }),
    remove: vi.fn(async (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key]
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {}
      for (const k of keys) {
        changes[k] = { oldValue: state.data[k], newValue: undefined }
        delete state.data[k]
      }
      fireChanges(changes)
    }),
    clear: vi.fn(async () => {
      state.data = {}
    }),
  }
}

const local = makeStorageArea()

;(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    local,
    onChanged: {
      addListener: vi.fn((l: ChangeListener) => changeListeners.add(l)),
      removeListener: vi.fn((l: ChangeListener) => changeListeners.delete(l)),
    },
  },
  runtime: {
    id: "test-extension-id",
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    onInstalled: { addListener: vi.fn() },
  },
  sidePanel: {
    setPanelBehavior: vi.fn().mockResolvedValue(undefined),
    setOptions: vi.fn().mockResolvedValue(undefined),
  },
  tabs: {
    onUpdated: { addListener: vi.fn() },
    onActivated: { addListener: vi.fn() },
    get: vi.fn(),
  },
}

beforeEach(() => {
  local.state.data = {}
  changeListeners.clear()
})

afterEach(() => {
  cleanup()
})
