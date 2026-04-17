import { useEffect, useState } from "react"
import { readKey, writeKey } from "../storage/kv"

export const useStorageKey = <T>(
  key: string,
  fallback: T,
  parse?: (raw: unknown) => T
): [T, (next: T) => Promise<void>] => {
  const [value, setValue] = useState<T>(fallback)

  useEffect(() => {
    let cancelled = false
    const coerce = (raw: unknown): T =>
      parse ? parse(raw ?? fallback) : ((raw as T | undefined) ?? fallback)
    readKey<unknown>(key, fallback).then((v) => {
      if (!cancelled) setValue(coerce(v))
    })
    const handler = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== "local" || !(key in changes)) return
      const next = changes[key]?.newValue as unknown
      if (!cancelled) setValue(coerce(next))
    }
    try {
      chrome.storage.onChanged.addListener(handler)
    } catch {
      // Extension context already gone (e.g. after reload); nothing to listen to.
    }
    return () => {
      cancelled = true
      try {
        chrome.storage.onChanged.removeListener(handler)
      } catch {
        // Same as above — safe to ignore.
      }
    }
  }, [key, fallback, parse])

  const write = (next: T) => writeKey(key, next)
  return [value, write]
}
