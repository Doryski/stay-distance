export type StorageArea = chrome.storage.StorageArea

export const getArea = (): StorageArea => chrome.storage.local

// After the extension is reloaded, previously-injected content scripts lose
// their extension context: chrome.runtime.id becomes undefined and any
// chrome.* call throws "Extension context invalidated". Detect this so
// callers degrade gracefully instead of surfacing uncaught rejections.
const isContextAlive = (): boolean => {
  try {
    return Boolean(chrome?.runtime?.id)
  } catch {
    return false
  }
}

const isContextInvalidated = (err: unknown): boolean =>
  err instanceof Error && /Extension context invalidated/i.test(err.message)

export const readKey = async <T>(key: string, fallback: T): Promise<T> => {
  if (!isContextAlive()) return fallback
  try {
    const result = await getArea().get(key)
    return (result[key] as T | undefined) ?? fallback
  } catch (err) {
    if (isContextInvalidated(err)) return fallback
    throw err
  }
}

export const writeKey = async <T>(key: string, value: T): Promise<void> => {
  if (!isContextAlive()) return
  try {
    await getArea().set({ [key]: value })
  } catch (err) {
    if (isContextInvalidated(err)) return
    throw err
  }
}

export const removeKey = async (key: string): Promise<void> => {
  if (!isContextAlive()) return
  try {
    await getArea().remove(key)
  } catch (err) {
    if (isContextInvalidated(err)) return
    throw err
  }
}
