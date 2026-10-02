import { http } from './http.js'

export async function fetchAiSummary() {
  const { data } = await http.get('/api/ai/summary')
  return data || { summary: '', source: 'template', stats: null }
}

export async function fetchAnomalies() {
  const { data } = await http.get('/api/ai/anomalies')
  return {
    anomalies: Array.isArray(data?.anomalies) ? data.anomalies : [],
    windowDays: data?.windowDays || 0,
  }
}

export async function fetchRecommendations() {
  const { data } = await http.get('/api/ai/recommendations')
  return {
    recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [],
    windowDays: data?.windowDays || 0,
  }
}
