'use client'

import { useSessionTimeout } from '@/hooks/useSessionTimeout'

/**
 * Mount once at the app root. Runs the idle + absolute timeout watcher for
 * authenticated sessions; renders nothing.
 */
export default function SessionTimeoutWatcher() {
  useSessionTimeout()
  return null
}
