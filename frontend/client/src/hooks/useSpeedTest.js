import { useCallback, useEffect, useRef, useState } from 'react'
import { createTest, readHealth } from '../api/tests.js'
import { http } from '../api/http.js'
import { readToken } from '../api/storage.js'

export const SPEED_TEST_ERROR =
  'Speed test could not be completed. Please check your connection and try again.'

export const DEMO_METRICS = {
  downloadMbps: 36,
  uploadMbps: 14,
  pingMs: 28,
  packetLoss: 1,
}

const PING_COUNT = 15
const PING_TIMEOUT_MS = 1500
const DOWNLOAD_WINDOW_MS = 6000
const DOWNLOAD_PARALLEL = 3
const UPLOAD_BYTES = 5 * 1024 * 1024

function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function isAbort(error) {
  return (
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError'
  )
}

function roundTo(value, digits) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2
  return sorted[mid]
}

function standardDeviation(values) {
  if (values.length === 0) return 0
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function apiUrl(path) {
  const base = String(http.defaults.baseURL || '').replace(/\/$/, '')
  return `${base}${path}`
}

function authHeaders(extra) {
  const token = readToken()
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function measurePing(signal) {
  const samples = []
  let failed = 0

  for (let index = 0; index < PING_COUNT; index += 1) {
    if (signal?.aborted) {
      const error = new Error('aborted')
      error.name = 'AbortError'
      throw error
    }
    if (offline()) throw new Error('offline')
    const started = performance.now()
    try {
      await http.get('/api/speedtest/ping', { timeout: PING_TIMEOUT_MS, signal })
      samples.push(performance.now() - started)
    } catch (error) {
      if (isAbort(error) || signal?.aborted) throw error
      failed += 1
    }
  }

  const packetLoss = (failed / PING_COUNT) * 100
  if (samples.length === 0) {
    return { pingMs: null, jitterMs: null, packetLoss }
  }
  return {
    pingMs: median(samples),
    jitterMs: standardDeviation(samples),
    packetLoss,
  }
}

async function readResponseBytes(response, onBytes) {
  const reader = response.body?.getReader?.()
  if (!reader) {
    const buffer = await response.arrayBuffer()
    onBytes(buffer.byteLength)
    return
  }
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value?.byteLength) onBytes(value.byteLength)
  }
}

async function measureDownload(signal) {
  const started = performance.now()
  const controller = new AbortController()
  const stop = () => controller.abort()
  signal?.addEventListener('abort', stop)
  const timer = setTimeout(stop, DOWNLOAD_WINDOW_MS)
  const counter = { bytes: 0 }
  let failed = null

  async function worker(workerId) {
    while (!controller.signal.aborted && performance.now() - started < DOWNLOAD_WINDOW_MS) {
      try {
        const response = await fetch(
          apiUrl(`/api/speedtest/download?size=10&r=${workerId}-${counter.bytes}-${Date.now()}`),
          {
            signal: controller.signal,
            cache: 'no-store',
            headers: authHeaders(),
          },
        )
        if (!response.ok) throw new Error('download failed')
        await readResponseBytes(response, (count) => {
          counter.bytes += count
        })
      } catch (error) {
        if (controller.signal.aborted || isAbort(error)) return
        failed = error
        controller.abort()
        return
      }
    }
  }

  try {
    await Promise.all(
      Array.from({ length: DOWNLOAD_PARALLEL }, (_, index) => worker(index)),
    )
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', stop)
  }

  if (signal?.aborted) {
    const error = new Error('aborted')
    error.name = 'AbortError'
    throw error
  }
  const seconds = (performance.now() - started) / 1000
  if (failed || counter.bytes <= 0 || seconds <= 0) throw failed || new Error('download failed')
  return (counter.bytes * 8) / seconds / 1e6
}

async function measureUpload(signal) {
  const blob = new Blob([new Uint8Array(UPLOAD_BYTES)])
  const started = performance.now()
  let response
  try {
    response = await fetch(apiUrl('/api/speedtest/upload'), {
      method: 'POST',
      body: blob,
      signal,
      headers: authHeaders({ 'Content-Type': 'application/octet-stream' }),
    })
  } catch (error) {
    if (isAbort(error) || signal?.aborted) {
      const aborted = new Error('aborted')
      aborted.name = 'AbortError'
      throw aborted
    }
    throw error
  }
  if (!response.ok) throw new Error('upload failed')
  const seconds = (performance.now() - started) / 1000
  if (seconds <= 0) throw new Error('upload failed')
  return (UPLOAD_BYTES * 8) / seconds / 1e6
}

export function useSpeedTest() {
  const [stage, setStage] = useState('idle')
  const [result, setResult] = useState(null)
  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const abortRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (!mountedRef.current) return
    setRunning(false)
    setStage('idle')
    setError('')
  }, [])

  const run = useCallback(async ({ locationId, demo }) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setError('')
    setResult(null)
    setHealth(null)
    setRunning(true)
    setStage(demo ? 'saving' : 'ping')

    const alive = () => mountedRef.current && abortRef.current === controller && !controller.signal.aborted

    try {
      if (offline()) throw new Error('offline')

      let metrics
      if (demo) {
        metrics = { ...DEMO_METRICS }
        setResult(metrics)
      } else {
        const ping = await measurePing(controller.signal)
        if (!alive()) return
        if (ping.packetLoss >= 100 || ping.pingMs == null) throw new Error('loss')
        if (offline()) throw new Error('offline')
        const pingMetrics = {
          pingMs: roundTo(ping.pingMs, 2),
          jitterMs: roundTo(ping.jitterMs, 2),
          packetLoss: roundTo(ping.packetLoss, 2),
        }
        setResult(pingMetrics)

        setStage('download')
        const downloadMbps = await measureDownload(controller.signal)
        if (!alive()) return
        if (offline()) throw new Error('offline')
        const downloadMetrics = { ...pingMetrics, downloadMbps: roundTo(downloadMbps, 2) }
        setResult(downloadMetrics)

        setStage('upload')
        const uploadMbps = await measureUpload(controller.signal)
        if (!alive()) return
        if (offline()) throw new Error('offline')
        metrics = { ...downloadMetrics, uploadMbps: roundTo(uploadMbps, 2) }
        setResult(metrics)
      }

      if (!alive() || offline()) {
        if (offline() && alive()) throw new Error('offline')
        return
      }
      setStage('saving')
      const saved = await createTest(
        {
          ...metrics,
          ...(locationId ? { locationId } : {}),
        },
        { signal: controller.signal },
      )
      if (!alive()) return
      setHealth(readHealth(saved))
      setStage('done')
    } catch (errorCaught) {
      if (!mountedRef.current || controller.signal.aborted || isAbort(errorCaught)) return
      setResult(null)
      setHealth(null)
      setStage('idle')
      setError(SPEED_TEST_ERROR)
    } finally {
      if (mountedRef.current && abortRef.current === controller) setRunning(false)
    }
  }, [])

  return { stage, result, health, error, running, run, cancel }
}
