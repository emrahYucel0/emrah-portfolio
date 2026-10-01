<script setup lang="ts">
import { MANIFEST } from '~~/shared/site'

useHead({
  // the web app manifest, on every page (the icons in nuxt.config.ts are the document's; this is the install's)
  link: [{ rel: 'manifest', href: MANIFEST }],
  // a build script that fails to load means the runtime will never take the screen: say so at once, and the
  // first-paint plate steps aside for the semantic shell (base.css, html.c2-failed). First in the head, so it is
  // listening before any of the build's scripts are requested. The build hashes it into the CSP like every inline script.
  script: [{
    key: 'c2-failed',
    tagPosition: 'head',
    tagPriority: 'critical',
    innerHTML: "addEventListener('error',function(e){var t=e.target;if(t&&(t.tagName==='SCRIPT'||t.tagName==='LINK')&&/\\/_nuxt\\/[^?#]+\\.js/.test(t.src||t.href||''))document.documentElement.classList.add('c2-failed')},true)",
  }],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
