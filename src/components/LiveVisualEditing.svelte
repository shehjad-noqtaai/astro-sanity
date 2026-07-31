<script>
  // The first-party @sanity/visual-editing/svelte component imports
  // $app/navigation, so it only works inside SvelteKit. In Astro we wrap the
  // framework-agnostic core ourselves — this is the entire component the Kit
  // version adds, minus Kit router wiring. onMount returns the disable
  // function, so Svelte handles cleanup on unmount.
  import { onMount } from 'svelte'
  import { enableVisualEditing } from '@sanity/visual-editing'

  onMount(() =>
    enableVisualEditing({
      refresh: (payload) => {
        if (payload.source === 'mutation') {
          return new Promise(() => window.location.reload())
        }
        return false
      },
    })
  )
</script>
