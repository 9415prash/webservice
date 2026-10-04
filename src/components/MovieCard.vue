<script setup>
import { computed, ref, watch } from 'vue'
import { posterUrl } from '../api.js'
import { useWatchlist } from '../watchlist.js'

const props = defineProps({
  movie: { type: Object, required: true },
  genres: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['open'])
const { has, toggle } = useWatchlist()

const imageFailed = ref(false)
const imageUrl = computed(() => posterUrl(props.movie.poster_path))
const rated = computed(() => props.movie.vote_count > 0)
const rating = computed(() => (rated.value ? Number(props.movie.vote_average).toFixed(1) : 'NR'))
const tone = computed(() => {
  if (!rated.value) return 'none'
  const v = props.movie.vote_average
  return v >= 7 ? 'high' : v >= 5 ? 'mid' : 'low'
})
const year = computed(() => (props.movie.release_date || '').slice(0, 4))
const genreNames = computed(() => (props.movie.genre_ids || [])
  .map((id) => props.genres[id]).filter(Boolean).slice(0, 2))
const saved = computed(() => has(props.movie.id))
watch(imageUrl, () => { imageFailed.value = false })
</script>

<template>
  <article class="movie-card">
    <div class="poster-wrap">
      <button class="poster-button" type="button" :aria-label="`View details for ${movie.title}`"
        @click="emit('open', movie)">
        <img v-if="imageUrl && !imageFailed" class="movie-poster" :src="imageUrl"
          :alt="`${movie.title} poster`" loading="lazy" width="500" height="750"
          @error="imageFailed = true">
        <div v-else class="poster-fallback">
          <span>No poster available</span><strong>{{ movie.title }}</strong>
        </div>
        <span class="poster-overlay" aria-hidden="true">
          <span class="overlay-text">{{ movie.overview || 'No overview available.' }}</span>
          <span class="overlay-cta">View details</span>
        </span>
      </button>
      <span class="rating" :class="`tone-${tone}`" :style="{ '--pct': rated ? movie.vote_average * 10 : 0 }"
        :aria-label="rated ? `Rating ${rating} out of 10` : 'Not rated'">
        <span>{{ rating }}</span>
      </span>
      <button class="save-btn" :class="{ on: saved }" type="button" :aria-pressed="saved"
        :aria-label="saved ? `Remove ${movie.title} from my list` : `Add ${movie.title} to my list`"
        @click="toggle(movie)">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"
            :fill="saved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
    <div class="movie-info">
      <h3><a :href="`https://www.themoviedb.org/movie/${movie.id}`" target="_blank" rel="noopener"
        @click.prevent="emit('open', movie)">{{ movie.title }}</a></h3>
      <p class="meta">
        <time v-if="year" :datetime="movie.release_date">{{ year }}</time>
        <span v-else class="unknown-date">Date unknown</span>
        <span v-for="g in genreNames" :key="g" class="tag">{{ g }}</span>
      </p>
    </div>
  </article>
</template>
