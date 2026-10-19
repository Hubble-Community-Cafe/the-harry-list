// Sentry noise filters for errors our code can never cause: browser extensions run their scripts
// in the page, so Sentry catches what they throw as ours. Spread into each app's Sentry.init.

/** Scripts injected by browser extensions, matched against the stack frames' file URLs. */
export const SENTRY_EXTENSION_DENY_URLS: RegExp[] = [
  /^(chrome|chrome-extension|moz-extension|safari-extension|safari-web-extension):\/\//i,
];

/** Messages that only extensions produce, for events that arrive without a usable stack. */
export const SENTRY_EXTENSION_ERRORS: RegExp[] = [
  // Extension messaging APIs (runtime.sendMessage, tabs.sendMessage) failing in Safari and Chrome.
  /Invalid call to runtime\.sendMessage\(\)/,
  /Could not establish connection\. Receiving end does not exist/,
  /Extension context invalidated/,
];
