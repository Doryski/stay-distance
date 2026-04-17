import { createRoot, type Root } from "react-dom/client"
import { createElement, type ReactNode } from "react"
import shadowCss from "../styles/shadow.css?inline"

const HOST_CLASS = "stay-distance-root"

export type MountedRoot = { root: Root; host: HTMLElement }

export const mountInShadow = (
  anchor: HTMLElement,
  node: ReactNode,
  position: InsertPosition = "afterend"
): MountedRoot => {
  const host = document.createElement("div")
  host.className = HOST_CLASS
  anchor.insertAdjacentElement(position, host)

  const shadow = host.attachShadow({ mode: "open" })

  const style = document.createElement("style")
  style.textContent = shadowCss
  shadow.appendChild(style)

  const container = document.createElement("div")
  shadow.appendChild(container)

  const root = createRoot(container)
  root.render(createElement("div", { className: "stay-distance-shell" }, node))
  return { root, host }
}

export const unmount = ({ root, host }: MountedRoot): void => {
  root.unmount()
  host.remove()
}
