import { useEffect, useState } from 'react'
import { fetchOutages, isOpenOutage, outageLocationName } from '../api/outages.js'

export default function OutageBanner() {
  const [names, setNames] = useState([])

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
      })
      .catch(() => {
        if (active) setNames([])
      })
    return () => {
      active = false
    }
  }, [])

  if (names.length === 0) return null

  return (
    <div data-testid="outage-banner">
      {names.map((name) => (
        <p key={name} className="bg-red-600 px-4 py-2 text-sm font-medium text-white" role="status">
          Possible Wi-Fi outage detected in {name}
        </p>
      ))}
    </div>
  )
}
