<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MovieCard from './components/MovieCard.vue'
import MovieModal from './components/MovieModal.vue'
import { CATEGORIES, backdropUrl, fetchGenres, fetchMovies } from './api.js'
import { useWatchlist } from './watchlist.js'
import tmdbLogo from './assets/tmdb-logo.svg'

// TMDB API Key (v3) built into this site. It is visible to anyone who inspects the page.
const apiKey = ref('2628ddbc734b5b902d855115d98954bd')
const query = ref('')
const activeQuery = ref('')
const category = ref('popular')
const genre = ref('')
const genreList = ref([])
const movies = ref([])
const featured = ref(null)
const page = ref(1)
const totalPages = ref(0)
const totalResults = ref(0)
const loading = ref(false)
const error = ref('')
const selected = ref(null)
const view = ref('browse') // 'browse' | 'list'
const theme = ref('dark')
const catalogEl = ref(null)
const { items: watchlist } = useWatchlist()
let controller
let requestId = 0

const genreMap = computed(() => Object.fromEntries(genreList.value.map((g) => [g.id, g.name])))
const currentCategory = computed(() => CATEGORIES.find((c) => c.id === category.value))
const genreName = computed(() => genreMap.value[genre.value] || '')
const heading = computed(() => {
  if (view.value === 'list') return 'My list'
  if (activeQuery.value) return `Results for “${activeQuery.value}”`
  return genreName.value ? `${currentCategory.value.title} · ${genreName.value}` : currentCategory.value.title
})
const featuredBackdrop = computed(() => backdropUrl(featured.value?.backdrop_path))

async function loadMovies(nextPage = 1, term = activeQuery.value) {
  const id = ++requestId
  controller?.abort()
  const currentController = new AbortController()
  controller = currentController
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; currentController.abort() }, 15000)
  loading.value = true
  error.value = ''
  movies.value = []
  try {
    const data = await fetchMovies({ apiKey: apiKey.value, query: term, page: nextPage,
      category: category.value, genre: genre.value, signal: currentController.signal })
    if (id !== requestId) return
    movies.value = data.results
    page.value = data.page
    totalPages.value = Math.min(data.total_pages, 500)
    totalResults.value = data.total_results
    activeQuery.value = term
    if (!featured.value && !term && !genre.value) {
      featured.value = data.results.find((m) => m.backdrop_path) || null
    }
  } catch (err) {
    if (id !== requestId) return
    error.value = timedOut ? 'Request timed out. Check your connection and retry.'
      : err.name === 'AbortError' ? ''
      : err.status !== undefined ? err.message
      : 'Could not reach TMDB. Check your connection or try again later.'
  } finally {
    clearTimeout(timer)
    if (id === requestId) loading.value = false
  }
}

function scrollToCatalog() {
  nextTick(() => catalogEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
function search() {
  view.value = 'browse'
  loadMovies(1, query.value.trim())
  if (query.value.trim()) scrollToCatalog()
}
function pickCategory(id) {
  view.value = 'browse'
  category.value = id
  query.value = ''
  loadMovies(1, '')
}
function pickGenre(id) {
  view.value = 'browse'
  genre.value = genre.value === id ? '' : id
  loadMovies(1, activeQuery.value)
}
function resetAll() {
  view.value = 'browse'
  category.value = 'popular'
  genre.value = ''
  query.value = ''
  loadMovies(1, '')
}
function goHome() {
  resetAll()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function goToPage(n) {
  loadMovies(n)
  scrollToCatalog()
}
function showList() {
  view.value = 'list'
  scrollToCatalog()
}
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

watch(theme, (value) => {
  document.documentElement.dataset.theme = value
  try { localStorage.setItem('movie-lab:theme', value) } catch { /* storage unavailable */ }
}, { immediate: true })

onMounted(async () => {
  try {
    const saved = localStorage.getItem('movie-lab:theme')
    if (saved === 'light' || saved === 'dark') theme.value = saved
  } catch { /* storage unavailable */ }
  loadMovies(1, '')
  try { genreList.value = await fetchGenres({ apiKey: apiKey.value }) } catch { /* chips just stay hidden */ }
})
onBeforeUnmount(() => { requestId++; controller?.abort() })
</script>

<template>
  <a class="skip-link" href="#movies">Skip to movies</a>
  <header class="site-header">
    <a class="brand" href="#top" @click.prevent="goHome">
      <svg class="brand-mark" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <rect x="2" y="6" width="28" height="20" rx="4" fill="currentColor" />
        <path d="M13 11.5v9l8-4.5z" fill="var(--bg)" />
      </svg>
      <span>MOVIE<b>LAB</b></span>
    </a>
    <nav aria-label="Main navigation">
      <a href="#movies" @click.prevent="view = 'browse'; scrollToCatalog()">Browse</a>
      <a href="#about">About</a>
    </nav>
    <div class="header-actions">
      <button class="list-btn" type="button" :class="{ active: view === 'list' }" @click="showList">
        My list <span class="count-pill">{{ watchlist.length }}</span>
      </button>
      <button class="icon-btn" type="button" :aria-label="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        :title="theme === 'dark' ? 'Light theme' : 'Dark theme'" @click="toggleTheme">
        <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2L17 7M7 17l-1.8 1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </header>

  <main id="top">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-bg" :style="featuredBackdrop ? { backgroundImage: `url(${featuredBackdrop})` } : null" aria-hidden="true"></div>
      <div class="hero-inner">
        <p class="eyebrow">Live data from TMDB</p>
        <h1 id="hero-title">Find your next<br><em>favorite</em> movie.</h1>
        <p class="hero-sub">Search the full TMDB catalog, explore by genre, watch trailers and build your own watch list.</p>
        <form class="search-form" role="search" @submit.prevent="search">
          <label class="sr-only" for="movie-query">Search movie titles</label>
          <div class="search-field">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2" /><path d="M16 16l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
            <input id="movie-query" v-model="query" type="search" placeholder="Search for a movie title…" autocomplete="off">
            <button :disabled="loading" type="submit">Search</button>
          </div>
        </form>
        <div v-if="featured" class="featured">
          <span class="featured-label">Featured today</span>
          <button type="button" class="featured-link" @click="selected = featured">
            {{ featured.title }}<span aria-hidden="true"> →</span>
          </button>
        </div>
      </div>
    </section>

    <section id="movies" ref="catalogEl" class="catalog" aria-labelledby="catalog-title" :aria-busy="loading">
      <div v-if="view === 'browse'" class="toolbar">
        <div class="tabs" role="group" aria-label="Browse category">
          <button v-for="c in CATEGORIES" :key="c.id" type="button" class="tab"
            :class="{ active: category === c.id && !activeQuery }" :aria-pressed="category === c.id && !activeQuery"
            :disabled="loading" @click="pickCategory(c.id)">{{ c.label }}</button>
        </div>
        <div v-if="genreList.length" class="genres" role="group" aria-label="Filter by genre">
          <button v-for="g in genreList" :key="g.id" type="button" class="chip"
            :class="{ active: genre === g.id }" :aria-pressed="genre === g.id"
            :disabled="loading || !!activeQuery" @click="pickGenre(g.id)">{{ g.name }}</button>
        </div>
      </div>

      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ view === 'list' ? 'Saved on this device' : 'The Movie Database' }}</p>
          <h2 id="catalog-title">{{ heading }}</h2>
        </div>
        <button v-if="view === 'browse' && (activeQuery || genre || category !== 'popular')" class="link-btn" type="button" @click="resetAll">Reset filters</button>
      </div>

      <!-- My list -->
      <template v-if="view === 'list'">
        <div v-if="watchlist.length" class="movie-grid">
          <MovieCard v-for="movie in watchlist" :key="movie.id" :movie="movie" :genres="genreMap" @open="selected = $event" />
        </div>
        <div v-else class="empty-state">
          <h3>Your list is empty</h3>
          <p>Tap the bookmark on any poster to save a movie here.</p>
          <button type="button" class="btn-primary" @click="view = 'browse'">Browse movies</button>
        </div>
      </template>

      <!-- Browse -->
      <template v-else>
        <div v-if="loading" class="movie-grid" role="status" aria-label="Loading movies">
          <div v-for="n in 12" :key="n" class="skeleton-card" aria-hidden="true">
            <div class="skeleton poster-skel"></div><div class="skeleton line"></div><div class="skeleton line short"></div>
          </div>
        </div>
        <div v-else-if="error" class="status-box error" role="alert">
          <h3>Could not load movies</h3><p>{{ error }}</p>
          <button type="button" class="btn-primary" @click="loadMovies(page)">Retry</button>
        </div>
        <template v-else>
          <p class="result-count" role="status">{{ totalResults.toLocaleString('en-US') }} results · page {{ page }} of {{ totalPages || 1 }}</p>
          <div v-if="movies.length" class="movie-grid">
            <MovieCard v-for="movie in movies" :key="movie.id" :movie="movie" :genres="genreMap" @open="selected = $event" />
          </div>
          <div v-else class="empty-state">
            <h3>No movies found</h3>
            <p>Try another title, or clear your filters.</p>
            <button type="button" class="btn-primary" @click="resetAll">Show popular movies</button>
          </div>
          <nav v-if="totalPages > 1" class="pagination" aria-label="Result pages">
            <button type="button" :disabled="page <= 1" @click="goToPage(page - 1)">← Previous</button>
            <span>Page {{ page }} of {{ totalPages }}</span>
            <button type="button" :disabled="page >= totalPages" @click="goToPage(page + 1)">Next →</button>
          </nav>
        </template>
      </template>
    </section>
  </main>

  <footer id="about" class="site-footer">
    <div class="footer-inner">
      <div>
        <strong class="footer-brand">MOVIE<b>LAB</b></strong>
        <p>A Vue 3 + TMDB classroom project with a custom interface. Movie data and posters need internet access.</p>
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </div>
      <a class="tmdb-credit" href="https://www.themoviedb.org/" target="_blank" rel="noopener"><img :src="tmdbLogo" alt="TMDB" width="110"></a>
    </div>
  </footer>

  <MovieModal v-if="selected" :key="selected.id" :movie="selected" :api-key="apiKey" @close="selected = null" />
</template>
