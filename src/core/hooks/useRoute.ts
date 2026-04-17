import { useQuery } from "@tanstack/react-query"
import { sendMessage } from "../messaging/client"
import { MESSAGE_KIND } from "../messaging/protocol"
import type { Coords, RouteResult, TransportMode } from "../types"

export const useRoute = (
  from: Coords | null | undefined,
  to: Coords | null | undefined,
  mode: TransportMode
) =>
  useQuery<RouteResult | null>({
    queryKey: ["route", from, to, mode],
    enabled: !!from && !!to,
    queryFn: async () => {
      const { result } = await sendMessage({
        kind: MESSAGE_KIND.route,
        from: from!,
        to: to!,
        mode,
      })
      return result
    },
    staleTime: Infinity,
  })

export const useListingCoords = (
  coords: Coords | undefined,
  address: string | undefined
) =>
  useQuery<Coords>({
    queryKey: ["listing-coords", coords, address],
    enabled: !!coords || !!address,
    queryFn: async () => {
      const res = await sendMessage({
        kind: MESSAGE_KIND.resolveListingCoords,
        ...(coords ? { coords } : {}),
        ...(address ? { address } : {}),
      })
      return res.coords
    },
    staleTime: Infinity,
  })
