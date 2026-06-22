/**
 * Distance utilities for location-based provider sorting.
 *
 * Uses the Haversine formula to compute the great-circle distance
 * between two points on the Earth (specified in latitude/longitude).
 * Returns distances in kilometers — perfect for sorting nearby
 * providers on the SINTHA home screen.
 */

export interface LatLng {
  latitude?: number | null
  longitude?: number | null
}

/**
 * Calculate the distance (in kilometers) between two lat/lng points
 * using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 (in decimal degrees)
 * @param lng1 Longitude of point 1 (in decimal degrees)
 * @param lat2 Latitude of point 2 (in decimal degrees)
 * @param lng2 Longitude of point 2 (in decimal degrees)
 * @returns Distance in kilometers. Returns `Infinity` if any coordinate
 *          is missing or invalid, so un-located providers sink to the
 *          bottom of a distance-sorted list.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  // Guard against NaN / undefined values — treat as infinitely far away
  if (
    Number.isNaN(lat1) || Number.isNaN(lng1) ||
    Number.isNaN(lat2) || Number.isNaN(lng2)
  ) {
    return Infinity
  }

  const EARTH_RADIUS_KM = 6371
  const toRadians = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

/**
 * Sort a list of providers by distance from the user, nearest first.
 *
 * Each provider is expected to have a nested `user` object with optional
 * `latitude` / `longitude` fields (mirrors the Prisma `User` model).
 * Providers without coordinates are kept at the end of the list,
 * preserving their original relative order.
 *
 * This function does NOT mutate the input array.
 *
 * The generic `T` is intentionally unconstrained so callers don't have
 * to import a marker interface; the `user` field is accessed via a
 * localized cast inside the function.
 *
 * @param providers Array of provider profiles
 * @param userLat   User's latitude
 * @param userLng   User's longitude
 * @returns A new array sorted by distance ascending
 */
export function sortByDistance<T>(
  providers: T[],
  userLat: number,
  userLng: number,
): T[] {
  // Decorate-Sort-Undecorate keeps the original order for ties and
  // for providers without coordinates (whose distance is Infinity).
  const decorated = providers.map((provider, index) => {
    // Narrow through `unknown` to avoid forcing every caller's User type
    // to structurally extend LatLng (TypeScript flags "no properties in
    // common" when the source has none of an all-optional target's keys).
    const user = (provider as unknown as { user?: LatLng }).user
    const lat = user?.latitude
    const lng = user?.longitude
    const distance =
      typeof lat === 'number' && typeof lng === 'number'
        ? calculateDistance(userLat, userLng, lat, lng)
        : Infinity
    return { provider, distance, index }
  })

  decorated.sort((a, b) => {
    if (a.distance === b.distance) return a.index - b.index
    return a.distance - b.distance
  })

  return decorated.map((d) => d.provider)
}
