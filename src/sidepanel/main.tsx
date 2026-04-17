import "../styles/theme.css"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SidePanel } from "./SidePanel"

const queryClient = new QueryClient()
const container = document.getElementById("root")
if (!container) throw new Error("#root not found")

createRoot(container).render(
  <QueryClientProvider client={queryClient}>
    <SidePanel />
  </QueryClientProvider>
)
