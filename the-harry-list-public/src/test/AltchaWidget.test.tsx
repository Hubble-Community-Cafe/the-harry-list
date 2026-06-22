import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AltchaWidget } from '../components/AltchaWidget'

// Don't load the real custom element: it registers web workers and auto-fetches on mount.
vi.mock('altcha', () => ({}))

describe('AltchaWidget', () => {
  it('passes the challenge URL via the altcha 3.x `challenge` attribute', () => {
    const url = 'http://localhost:8080/api/public/altcha/challenge'
    const { container } = render(<AltchaWidget challengeUrl={url} onVerified={() => {}} />)

    const el = container.querySelector('altcha-widget')
    expect(el).not.toBeNull()
    // Regression guard: altcha 3.x reads `challenge`; the 2.x `challengeurl` is ignored, which
    // makes the widget fetch the current page (text/html) instead of the backend challenge.
    expect(el?.getAttribute('challenge')).toBe(url)
    expect(el?.getAttribute('challengeurl')).toBeNull()
  })
})
