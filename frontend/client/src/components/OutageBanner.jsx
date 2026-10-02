import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '../api/errors.js'
import { fetchOutages, isOpenOutage, outageLocationName } from '../api/outages.js'

export default function OutageBanner() {
  const [names, setNames] = useState([])
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    fetchOutages()
      .then((list) => {
        if (!active) return
        const unique = []
        for (const outage of list.filter(isOpenOutage)) {
          const name = outageLocationName(outage)
          if (!unique.includes(name)) unique.push(name)
        }
        setNames(unique)
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setNames([])
        setError(getApiErrorMessage(err, 'Could not load outage alerts.'))
      })
    return () => {
      active = false
    }
  }, [attempt])

  if (!error && names.length === 0) return null

  return (
    <div data-testid="outage-banner">
      {error ? (
        <p className="bg-rose-500/10 px-4 py-2 text-sm text-rose-200" role="alert">
          {error}{' '}
          <button type="button" className="underline" onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </button>
        </p>
      ) : null}
      {names.map((name) => (
        <p key={name} className="bg-red-600 px-4 py-2 text-sm font-medium text-white" role="status">
          Possible Wi-Fi outage detected in {name}
        </p>
      ))}
    </div>
  )
}
