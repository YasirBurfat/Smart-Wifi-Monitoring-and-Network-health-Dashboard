import { useEffect, useState } from 'react'
import { fetchHealth } from '../api/health.js'

export function useHealth() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true

    fetchHealth()
      .then((ok) => {
        if (active) setStatus(ok ? 'ok' : 'down')
      })
      .catch(() => {
        if (active) setStatus('down')
      })

    return () => {
      active = false
    }
  }, [])

  return status
}
