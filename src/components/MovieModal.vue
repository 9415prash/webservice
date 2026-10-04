<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { backdropUrl, fetchMovieDetails, posterUrl } from '../api.js'
import { useWatchlist } from '../watchlist.js'

const props = defineProps({
  movie: { type: Object, required: true },
  apiKey: { type: String, required: true },
})
const emit = defineEmits(['close'])
const { has, toggle } = useWatchlist()

const details = ref(null)
const failed = ref(false)
const showTrailer = ref(false)
const dialog = ref(null)
const closeBtn = ref(null)
let controller
let opener

const saved = computed(() => has(props.movie.id))
const title = computed(() => details.value?.title || props.movie.title)
const overview = computed(() => details.value?.overview || props.movie.overview || 'No overview available.')
const poster = computed(() => posterUrl(details.value?.poster_path || props.movie.poster_path))
const backdrop = computed(() => backdropUrl(details.value?.backdrop_path || props.movie.backdrop_path))
const releaseDate = computed(() => details.value?.release_date || props.movie.release_date || '')
const rated = computed(() => (details.value?.vote_count ?? props.movie.vote_count) > 0)
const rating = computed(() => Number(details.value?.vote_average ?? props.movie.vote_average).toFixed(1))
const genres = computed(() => details.value?.genres?.map((g) => g.name) || [])
const cast = computed(() => (details.value?.credits?.cast || []).slice(0, 6))
const director = computed(() => details.value?.credits?.crew?.find((c) => c.job === 'Director')?.name)
const runtime = computed(() => {
  const m = details.value?.runtime
  return m ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : ''
})
const trailer = computed(() => {
  const vids = details.value?.videos?.results || []
  return vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official)
    || vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer')
    || vids.find((v) => v.site === 'YouTube')
})
const money = (n) => (n ? `$${Math.round(n / 1e6).toLocaleString('en-US')}M` : '')

function onKey(e) {
  if (e.key === 'Escape') return emit('close')
  if (e.key !== 'Tab' || !dialog.value) return
  const focusable = [...dialog.value.querySelectorAll('button, a[href], iframe')]
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

onMounted(async () => {
  opener = document.activeElement
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKey)
  await nextTick()
  closeBtn.value?.focus()
  controller = new AbortController()
  try {
    details.value = await fetchMovieDetails({ apiKey: props.apiKey, id: props.movie.id, signal: controller.signal })
  } catch (err) {
    if (err.name !== 'AbortError') failed.value = true
  }
})
onBeforeUnmount(() => {
  controller?.abort()
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKey)
  opener?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div ref="dialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button ref="closeBtn" class="modal-close" type="button" aria-label="Close details" @click="emit('close')">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg>
        </button>

        <div class="modal-hero" :style="backdrop ? { backgroundImage: `url(${backdrop})` } : null">
          <div v-if="showTrailer && trailer" class="trailer">
            <iframe :src="`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0`"
              title="Movie trailer" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen />
          </div>
        </div>

        <div class="modal-body" :class="{ 'with-trailer': showTrailer && trailer }">
          <img v-if="poster" class="modal-poster" :src="poster" :alt="`${title} poster`" width="500" height="750">
          <div class="modal-main">
            <h2 id="modal-title">{{ title }}</h2>
            <p v-if="details?.tagline" class="tagline">“{{ details.tagline }}”</p>
            <ul class="facts">
              <li v-if="rated" class="score">★ {{ rating }}<small>/10</small></li>
              <li v-else>Not rated</li>
              <li v-if="releaseDate">{{ releaseDate }}</li>
              <li v-if="runtime">{{ runtime }}</li>
            </ul>
            <div v-if="genres.length" class="chip-row">
              <span v-for="g in genres" :key="g" class="tag">{{ g }}</span>
            </div>
            <p class="modal-overview">{{ overview }}</p>

            <dl v-if="details" class="credits">
              <div v-if="director"><dt>Director</dt><dd>{{ director }}</dd></div>
              <div v-if="cast.length"><dt>Starring</dt><dd>{{ cast.map((c) => c.name).join(', ') }}</dd></div>
              <div v-if="money(details.budget)"><dt>Budget</dt><dd>{{ money(details.budget) }}</dd></div>
              <div v-if="money(details.revenue)"><dt>Box office</dt><dd>{{ money(details.revenue) }}</dd></div>
            </dl>
            <p v-else-if="failed" class="modal-note">Extra details could not be loaded right now.</p>
            <p v-else class="modal-note" role="status">Loading details…</p>

            <div class="modal-actions">
              <button v-if="trailer && !showTrailer" class="btn-primary" type="button" @click="showTrailer = true">▶ Watch trailer</button>
              <button class="btn-ghost" type="button" :aria-pressed="saved" @click="toggle(movie)">
                {{ saved ? '✓ In my list' : '+ Add to my list' }}
              </button>
              <a class="btn-ghost" :href="`https://www.themoviedb.org/movie/${movie.id}`" target="_blank" rel="noopener">View on TMDB ↗</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
