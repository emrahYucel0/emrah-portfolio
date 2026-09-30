<script setup lang="ts">
import { MANIFEST } from '~~/shared/site'

// the web app manifest, on every page (the icons in nuxt.config.ts are the document's; this is the install's)
useHead({ link: [{ rel: 'manifest', href: MANIFEST }] })
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
