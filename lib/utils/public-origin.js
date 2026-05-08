/**
 * Origin the user sees in the browser (e.g. https://otters.ke).
 * On Vercel with a custom domain, `request.url` can still show the *.vercel.app
 * host; `x-forwarded-host` reflects the public hostname for redirects (OAuth, etc.).
 */
export function getPublicOrigin(request) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim()
    return `${forwardedProto}://${host}`
  }
  return new URL(request.url).origin
}
