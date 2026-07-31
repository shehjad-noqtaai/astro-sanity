import type { HistoryAdapter } from '@sanity/visual-editing'

// enableVisualEditing() has NO default history adapter (the overlay renderer
// contains no popstate/pushState handling at all). Without one, the
// Presentation tool's URL bar goes stale when the editor clicks around the
// iframe, and Presentation can't drive the iframe to a document's page.
//
// This is the MPA version: Astro navigations are full page loads, so each
// page re-runs enableVisualEditing and subscribe() reports the fresh URL on
// connect — no pushState monkey-patching needed (there's no client router).
export function createMpaHistoryAdapter(): HistoryAdapter {
  return {
    subscribe(navigate) {
      const report = () =>
        navigate({
          type: 'push',
          title: document.title,
          url: `${location.pathname}${location.search}${location.hash}`,
        })
      report()
      addEventListener('popstate', report)
      addEventListener('hashchange', report)
      return () => {
        removeEventListener('popstate', report)
        removeEventListener('hashchange', report)
      }
    },
    update(update) {
      const current = `${location.pathname}${location.search}${location.hash}`
      switch (update.type) {
        case 'push':
          if (update.url !== current) location.assign(update.url)
          break
        case 'replace':
          if (update.url !== current) location.replace(update.url)
          break
        case 'pop':
          window.history.back()
          break
      }
    },
  }
}
