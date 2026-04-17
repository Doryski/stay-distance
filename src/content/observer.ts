export type ObserveOptions = {
  root?: ParentNode
  onMutations: () => void
  debounceMs?: number
}

export const observeDom = ({
  root = document.body,
  onMutations,
  debounceMs = 150,
}: ObserveOptions): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(onMutations, debounceMs)
  }

  const observer = new MutationObserver(schedule)
  observer.observe(root, { childList: true, subtree: true })

  // SPA navigation — history pushState/replaceState don't fire events by default.
  const origPush = history.pushState
  const origReplace = history.replaceState
  history.pushState = function (...args) {
    origPush.apply(this, args)
    schedule()
  }
  history.replaceState = function (...args) {
    origReplace.apply(this, args)
    schedule()
  }
  window.addEventListener("popstate", schedule)

  return () => {
    observer.disconnect()
    history.pushState = origPush
    history.replaceState = origReplace
    window.removeEventListener("popstate", schedule)
    if (timer) clearTimeout(timer)
  }
}
