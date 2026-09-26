<script setup lang="ts">
import '~/assets/css/lab-fonts.css'
/**
 * THE LAB — the registered bench is this route's landing.
 *
 * In the research site the bench was a section of the home page. Here the home page belongs to the C2 runtime, so
 * the bench has its own address instead: /[locale]/lab. The bench itself is unchanged — the same working sheet,
 * the same three records pinned to a registration edge, the same datum leaving the registered one.
 *
 * The C2 runtime is not mounted on this route (layouts/default.vue), so the document scrolls normally here and the
 * studies can read their own scroll position. Every other route keeps the runtime and its gestures untouched.
 */
definePageMeta({
  validate: (route) => ['tr', 'en'].includes(String(route.params.locale)),
})

useLocaleSeo('lab')
// the bench is the fifth destination: it owns one screen, and a vertical gesture on it is the site's index —
// up to Work, down to Contact. Nothing here scrolls; the studies, which do, take their scroll back on their routes.
useLabSpine()
useHead({ bodyAttrs: { class: 'lab-route lab-route--home' } })
</script>

<template>
  <LabBench />
</template>
