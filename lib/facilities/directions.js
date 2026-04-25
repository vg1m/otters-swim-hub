/**
 * Build a universal Google Maps "Directions" deep link for a facility.
 *
 * The returned URL uses Google's cross-platform `dir/?api=1` scheme which:
 *   - Opens the Google Maps app on Android and desktop browsers.
 *   - Opens Google Maps on iOS if installed, otherwise falls back to the
 *     mobile web experience (from which the user can tap "Open in Maps").
 *
 * We combine the facility name and address into the destination query so that
 * vague free-form addresses like "Aga Khan location" still resolve to the
 * correct place on the map.
 *
 * @param {{ name?: string, address?: string } | null | undefined} facility
 * @returns {string | null} The directions URL, or null if the facility has
 *   nothing we can geocode against.
 */
export function buildDirectionsUrl(facility) {
  if (!facility) return null
  const parts = [facility.name, facility.address]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
  if (parts.length === 0) return null
  const query = encodeURIComponent(parts.join(', '))
  return `https://www.google.com/maps/dir/?api=1&destination=${query}`
}

/**
 * Same as {@link buildDirectionsUrl} for a single venue/label (e.g. `training_sessions.pool_location`).
 * @param {string | null | undefined} label
 * @returns {string | null}
 */
export function buildDirectionsUrlFromLabel(label) {
  if (label == null || typeof label !== 'string') return null
  const t = label.trim()
  if (!t) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t)}`
}
