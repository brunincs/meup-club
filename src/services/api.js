// Configuração base da API

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Cliente HTTP base para requisições à API
 */
export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    const error = new Error('API Error')
    error.status = response.status
    error.response = await response.json().catch(() => null)
    throw error
  }

  return response.json()
}

/**
 * Métodos HTTP helpers
 */
export const api = {
  get: (endpoint, options) =>
    apiClient(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, data, options) =>
    apiClient(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: (endpoint, data, options) =>
    apiClient(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  patch: (endpoint, data, options) =>
    apiClient(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (endpoint, options) =>
    apiClient(endpoint, { ...options, method: 'DELETE' }),
}
