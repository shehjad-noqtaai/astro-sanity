<script>
  // "Level 3" preview latency: a live query via @sanity/core-loader — the
  // framework-agnostic layer the official React/Svelte loaders wrap. (The
  // first-party @sanity/svelte-loader assumes SvelteKit: its barrel imports
  // $app/navigation, so it can't build inside an Astro island.) Core-loader's
  // stores are nanostores, which implement the Svelte store contract, so
  // `$q` auto-subscription works natively.
  //
  // Server renders the initial data; inside the Presentation tool,
  // enableLiveMode connects over comlink and Presentation streams query
  // results — including uncommitted pending edits — so the title/description
  // update as the editor types, no reload. Outside the Studio it shows the
  // initial server-rendered data.
  //
  // NOTE: imports only sanity:client (public config) — never the server-side
  // wrapped client, which carries the token.
  import { onMount } from 'svelte'
  import { createQueryStore } from '@sanity/core-loader'
  import { sanityClient } from 'sanity:client'

  export let initial

  const { createFetcherStore, enableLiveMode } = createQueryStore({
    client: sanityClient.withConfig({ useCdn: false }),
    ssr: false,
  })

  const q = createFetcherStore(`*[_type == "settings"][0]{title, description}`, {}, initial)

  onMount(() => enableLiveMode({}))
</script>

<h1>{$q.data?.title ?? 'Astro + Sanity preview demo'}</h1>
{#if $q.data?.description}
  <p class="muted">{$q.data.description}</p>
{/if}
