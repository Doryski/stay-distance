import type { Envelope, Request, ResponseFor } from "./protocol"

// Stale content scripts (after the extension is reloaded) lose their runtime
// context. Surface that as a typed error so callers can no-op cleanly.
export class ExtensionContextInvalidatedError extends Error {
  constructor() {
    super("Extension context invalidated")
    this.name = "ExtensionContextInvalidatedError"
  }
}

const isContextAlive = (): boolean => {
  try {
    return Boolean(chrome?.runtime?.id)
  } catch {
    return false
  }
}

export const sendMessage = async <R extends Request>(req: R): Promise<ResponseFor<R>> => {
  if (!isContextAlive()) throw new ExtensionContextInvalidatedError()
  try {
    const envelope = (await chrome.runtime.sendMessage(req)) as Envelope<ResponseFor<R>>
    if (!envelope.ok) throw new Error(envelope.error)
    return envelope.data
  } catch (err) {
    if (err instanceof Error && /Extension context invalidated/i.test(err.message)) {
      throw new ExtensionContextInvalidatedError()
    }
    throw err
  }
}
