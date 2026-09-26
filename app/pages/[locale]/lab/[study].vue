<script setup lang="ts">
import '~/assets/css/lab-fonts.css'
import { studies, type StudyId } from '~~/shared/content'

/**
 * A FOCUSED LAB STUDY. The bench registers a study; opening it lands here. Each study is a fixed stage over a tall
 * native-scroll track: its parameter is a function of scroll POSITION, so it runs backwards for free, and nothing
 * is hijacked. The URL is real, so a study can be linked to and read on its own.
 *
 * The C2 runtime is not mounted on this route, which is what gives the document back its scroll.
 */
definePageMeta({
  validate: (route) => ['tr', 'en'].includes(String(route.params.locale)) && (studies as readonly string[]).includes(String(route.params.study)),
})

const route = useRoute()
const { copy } = useLocale()
const id = computed(() => String(route.params.study) as StudyId)
const sc = computed(() => copy.value.lab.studies[id.value])

useLocaleSeo('lab', {
  title: `${sc.value.name} — ${copy.value.lab.title} — Emrah Yücel`,
  description: `${sc.value.question} ${sc.value.note}`,
})
useHead({ bodyAttrs: { class: 'lab-route lab-route--study' } })

const { visit } = useVisit()

// without script the study cannot run; the page still says what it asks. It steps aside once the study is live.
const live = ref(false)
onMounted(() => {
  live.value = true
  visit.value.lab.activeStudy = id.value
})
</script>

<template>
  <div class="lab-study">
    <LabStudyWeight v-if="id === 'weight'" />
    <LabStudyLine v-else-if="id === 'line'" />
    <LabStudyTone v-else />
    <div v-if="!live" class="lab-nojs">
      <p class="u-label">{{ copy.lab.title }} · {{ sc.prim }}</p>
      <p>{{ sc.question }}</p>
      <p>{{ sc.note }}</p>
    </div>
  </div>
</template>

<style>
.lab-nojs { position: relative; z-index: 5; max-width: 40rem; padding: calc(var(--strip) + 40px) var(--pad) 40px; }
</style>
