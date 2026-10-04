import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'movie-lab:watchlist'

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

// Shared across components: a saved movie keeps just the fields the cards need.
const items = ref(load())

watch(items, (value) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch { /* storage unavailable */ }
}, { deep: true })

export function useWatchlist() {
  const ids = computed(() => new Set(items.value.map((m) => m.id)))
  const has = (id) => ids.value.has(id)
  function toggle(movie) {
    if (has(movie.id)) {
      items.value = items.value.filter((m) => m.id !== movie.id)
    } else {
      const { id, title, poster_path, backdrop_path, release_date, vote_average, vote_count, overview, genre_ids } = movie
      items.value = [{ id, title, poster_path, backdrop_path, release_date, vote_average, vote_count, overview, genre_ids }, ...items.value]
    }
  }
  return { items, has, toggle }
}
