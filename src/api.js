const API_BASE = 'https://api.themoviedb.org/3'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Browse categories shown as tabs. `endpoint` is used when no genre is chosen;
// `discover` holds the equivalent parameters used when a genre filter is active.
export const CATEGORIES = [
  { id: 'popular', label: 'Popular', title: 'Popular movies', endpoint: '/movie/popular',
    discover: () => ({ sort_by: 'popularity.desc' }) },
  { id: 'top_rated', label: 'Top rated', title: 'Top rated movies', endpoint: '/movie/top_rated',
    discover: () => ({ sort_by: 'vote_average.desc', 'vote_count.gte': '300' }) },
  { id: 'now_playing', label: 'In theaters', title: 'Now in theaters', endpoint: '/movie/now_playing',
    discover: () => ({ sort_by: 'primary_release_date.desc', 'primary_release_date.lte': today(),
      'vote_count.gte': '20' }) },
  { id: 'upcoming', label: 'Coming soon', title: 'Coming soon', endpoint: '/movie/upcoming',
    discover: () => ({ sort_by: 'primary_release_date.asc', 'primary_release_date.gte': today() }) },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

async function request(path, params, signal) {
  const response = await fetch(`${API_BASE}${path}?${new URLSearchParams(params)}`, {
    headers: { accept: 'application/json' }, signal,
  })
  if (!response.ok) {
    const messages = {
      401: 'API key rejected. Check API Key (v3) in your TMDB settings.',
      403: 'Access was denied. Check your TMDB account and API permissions.',
      404: 'That item could not be found on TMDB.',
      429: 'Too many requests. Wait a moment, then retry.',
    }
    throw new ApiError(response.status,
      messages[response.status] || `TMDB request failed (HTTP ${response.status}). Try again later.`)
  }
  return response.json()
}

function requireKey(apiKey) {
  if (!apiKey.trim()) throw new ApiError(0, 'Enter your API Key (v3).')
  return apiKey.trim()
}

export async function fetchMovies({ apiKey, query = '', page = 1, category = 'popular', genre = '', signal }) {
  const key = requireKey(apiKey)
  const term = query.trim()
  const base = { api_key: key, language: 'en-US', page: String(page) }
  const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0]
  let path
  let params = base
  if (term) {
    path = '/search/movie'
    params = { ...base, query: term, include_adult: 'false' }
  } else if (genre) {
    path = '/discover/movie'
    params = { ...base, include_adult: 'false', with_genres: String(genre), ...cat.discover() }
  } else {
    path = cat.endpoint
  }
  const data = await request(path, params, signal)
  if (!Array.isArray(data.results)) throw new ApiError(0, 'Unexpected response format.')
  return data
}

export async function fetchGenres({ apiKey, signal }) {
  const data = await request('/genre/movie/list', { api_key: requireKey(apiKey), language: 'en-US' }, signal)
  return Array.isArray(data.genres) ? data.genres : []
}

export function fetchMovieDetails({ apiKey, id, signal }) {
  return request(`/movie/${id}`, {
    api_key: requireKey(apiKey), language: 'en-US', append_to_response: 'videos,credits',
  }, signal)
}

export function posterUrl(path, size = 'w500') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : ''
}

export function backdropUrl(path, size = 'w1280') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : ''
}
