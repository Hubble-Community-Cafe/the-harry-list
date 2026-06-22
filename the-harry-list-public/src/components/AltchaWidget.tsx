import { createElement, useCallback } from 'react'
import 'altcha'

/**
 * Self-hosted ALTCHA proof-of-work widget. Fetches a challenge from the backend, solves it
 * in the browser, and reports the base64 payload via `onVerified` (null while unsolved). No
 * cookies, no third party. Rendered with createElement so we don't need custom-element JSX types.
 */
export function AltchaWidget({
  challengeUrl,
  onVerified,
}: {
  challengeUrl: string
  onVerified: (payload: string | null) => void
}) {
  // Callback ref: wire the listener when the element mounts, clean up on unmount (React 19).
  const attach = useCallback((el: HTMLElement | null) => {
    if (!el) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ state: string; payload?: string }>).detail
      onVerified(detail.state === 'verified' && detail.payload ? detail.payload : null)
    }
    el.addEventListener('statechange', handler)
    return () => el.removeEventListener('statechange', handler)
  }, [onVerified])

  // `challenge` carries the challenge URL in altcha 3.x (it was `challengeurl` in 2.x). With the
  // wrong name the widget has no URL and `auto="onload"` fetches the current page (text/html).
  return createElement('altcha-widget', { ref: attach, challenge: challengeUrl, auto: 'onload' })
}
