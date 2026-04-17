export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export const formatDistance = (km: number): string =>
  km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
