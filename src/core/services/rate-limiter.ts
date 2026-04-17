type Task<T> = () => Promise<T>

export const createRateLimiter = (minIntervalMs: number) => {
  let queue: Promise<unknown> = Promise.resolve()
  let lastRun = 0

  return <T>(task: Task<T>): Promise<T> => {
    const run = async (): Promise<T> => {
      const now = Date.now()
      const wait = Math.max(0, lastRun + minIntervalMs - now)
      if (wait > 0) await new Promise((r) => setTimeout(r, wait))
      lastRun = Date.now()
      return task()
    }
    const next = queue.then(run, run)
    queue = next.catch(() => undefined)
    return next
  }
}
