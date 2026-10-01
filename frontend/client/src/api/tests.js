import { http } from './http.js'
import { STATUS_LEVELS } from '../status.js'

export async function fetchTestPage(params) {
  const { data } = await http.get('/api/tests', { params })
  const tests = Array.isArray(data) ? data : Array.isArray(data?.tests) ? data.tests : []
  const total = Number(data?.total)
  return {
    tests,
    total: Number.isFinite(total) ? total : tests.length,
    page: Number(data?.page) || 1,
    pages: Number(data?.pages) || (tests.length ? 1 : 0),
  }
}

export async function fetchTests(params) {
  const page = await fetchTestPage(params)
  return page.tests
}

export async function createTest(metrics) {
  const { data } = await http.post('/api/tests', metrics)
  return data
}

export function readHealth(data) {
  const values = [
    data?.health,
    data?.healthStatus,
    data?.status,
    data?.test?.health,
    data?.test?.healthStatus,
    data?.test?.status,
    data?.result?.health,
  ]
  for (const value of values) {
    if (typeof value !== 'string') continue
    const match = STATUS_LEVELS.find((level) => level.toLowerCase() === value.toLowerCase())
    if (match) return match
  }
  return null
}
