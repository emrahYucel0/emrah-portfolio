<script setup lang="ts">
/**
 * THE FIRST PAINT. The runtime's chunk, its fonts and its textures arrive long after the document does, and until
 * they do the browser has nothing to show but the semantic shell — which is a normal web page, in ordinary document
 * flow. Measured on a cold load it was on screen for 1.3 s and then vanished, so the site read as "a website loaded,
 * then left, then something else started". That is the whole defect.
 *
 * This is what the document paints instead, and it ships in the HTML: the paper, and the field of ink rows at the
 * runtime's own spacing and weight. No text, so it needs no font and can introduce no swap; no script, so it is
 * there at first contentful paint. It is the composition the runtime is about to draw, held until the runtime can
 * draw it — not a loader, and not a second design.
 *
 * The semantic shell is NOT removed: it stays in the document, in the accessibility tree, exactly where it was.
 * This plate is laid over it and marked decorative, which separates who owns the MEANING from who owns the FIRST
 * PAINT. Without script the plate hides itself (the <noscript> rule in base.css) and the shell is the page, as before.
 */
</script>

<template>
  <div id="c2-plate" aria-hidden="true">
    <div class="rows" />
  </div>
</template>
