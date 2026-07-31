// Which visual-editing wiring the preview uses. Client-safe module (no
// astro:env/server imports) — PUBLIC_ vars are baked at build time, which is
// fine: the flavor is a build decision, not a secret.
//
// - 'vanilla' (default): plain <script> calling enableVisualEditing();
//   updates arrive by reload (refresh handler).
// - 'svelte': Svelte islands — enableVisualEditing in a Svelte wrapper plus a
//   @sanity/core-loader live query for the home header, which receives
//   updates from Presentation over comlink (near-optimistic latency).
export const visualEditingFlavor =
  import.meta.env.PUBLIC_VISUAL_EDITING_FLAVOR === 'svelte' ? 'svelte' : 'vanilla'
