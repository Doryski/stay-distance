import { resolveAdapter } from "../platforms/registry"

const SIDE_PANEL_PATH = "src/sidepanel/index.html"

export const shouldEnableForUrl = (rawUrl: string | undefined): boolean => {
  if (!rawUrl) return false
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false
  return resolveAdapter(url) !== null
}

const applyScope = async (tabId: number, url: string | undefined): Promise<void> => {
  const enabled = shouldEnableForUrl(url)
  try {
    await chrome.sidePanel.setOptions({
      tabId,
      path: SIDE_PANEL_PATH,
      enabled,
    })
  } catch {
    // Tab may have closed between the event firing and the call — ignore.
  }
}

export const initSidePanelScope = (): void => {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Fire on URL change (or final `complete` status, which also carries url).
    if (changeInfo.url !== undefined || changeInfo.status === "complete") {
      void applyScope(tabId, changeInfo.url ?? tab.url)
    }
  })

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) return
      void applyScope(tabId, tab.url)
    })
  })
}
