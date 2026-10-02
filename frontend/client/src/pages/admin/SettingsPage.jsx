import { useEffect, useState } from 'react'
import { fetchSettings, saveSettings } from '../../api/settings.js'
import { getApiErrorMessage } from '../../api/errors.js'
import { fieldClass } from '../../components/formStyles.js'
import RequestError from '../../components/RequestError.jsx'
import { WidgetSkeleton } from '../../components/Skeleton.jsx'

const FIELDS = [
  ['downloadMbps', 'Download target (Mbps)'],
  ['downloadPoints', 'Download weight'],
  ['uploadMbps', 'Upload target (Mbps)'],
  ['uploadPoints', 'Upload weight'],
  ['pingGoodMs', 'Good ping (ms)'],
  ['pingBadMs', 'Bad ping (ms)'],
  ['pingPoints', 'Ping weight'],
  ['packetLossPercent', 'Packet loss cap (%)'],
  ['packetLossPoints', 'Packet loss weight'],
  ['stabilityPoints', 'Stability weight'],
  ['failurePenalty', 'Failure penalty'],
  ['complaintPenalty', 'Complaint penalty'],
  ['excellentMin', 'Excellent minimum'],
  ['goodMin', 'Good minimum'],
  ['fairMin', 'Fair minimum'],
  ['poorMin', 'Poor minimum'],
]

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState(null)
  const [outageRule, setOutageRule] = useState(null)
  const [locations, setLocations] = useState([])
  const [state, setState] = useState('loading')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · Settings'
  }, [])

  useEffect(() => {
    let active = true
    fetchSettings()
      .then((settings) => {
        if (!active) return
        if (!settings) {
          setThresholds(null)
          setOutageRule(null)
          setState('ready')
          return
        }
        setThresholds(settings.thresholds || {})
        setOutageRule(settings.outageRule || {})
        setState('ready')
      })
      .catch((err) => {
        if (!active) return
        setError(getApiErrorMessage(err, 'Could not load settings.'))
        setState('error')
      })
    return () => {
      active = false
    }
  }, [attempt])

  function setField(key, value) {
    setThresholds((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setPending(true)
    setError('')
    setNotice('')
    const nextErrors = {}
    const payload = {}
    for (const [key, label] of FIELDS) {
      const number = Number(thresholds[key])
      if (!Number.isFinite(number)) nextErrors[key] = `${label} must be a number.`
      else payload[key] = number
    }
    const minComplaints = Number(outageRule?.minComplaints)
    const windowMinutes = Number(outageRule?.windowMinutes)
    if (!Number.isFinite(minComplaints)) nextErrors.minComplaints = 'Outage complaint count must be a number.'
    if (!Number.isFinite(windowMinutes)) nextErrors.windowMinutes = 'Outage window must be a number.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setError('')
      setPending(false)
      return
    }
    setFieldErrors({})
    try {
      const result = await saveSettings({
        thresholds: payload,
        outageRule: {
          minComplaints: Number(outageRule?.minComplaints),
          windowMinutes: Number(outageRule?.windowMinutes),
        },
      })
      setThresholds(result?.settings?.thresholds || payload)
      setOutageRule(result?.settings?.outageRule || outageRule)
      setLocations(Array.isArray(result?.locations) ? result.locations : [])
      setNotice('Thresholds saved. Location health was recomputed.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save settings.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="max-w-3xl">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <p className="mt-2 text-slate-400">Health score thresholds and weights. Saving recomputes each location status.</p>
      {state === 'loading' ? <WidgetSkeleton label="Loading settings…" className="mt-6 h-48" /> : null}
      {state === 'error' ? <RequestError message={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {state === 'ready' && !thresholds ? <p className="np-empty mt-6">No settings yet.</p> : null}
      {state === 'ready' && thresholds ? (
        <form onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-2" data-testid="settings-form">
          {FIELDS.map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1.5 block text-slate-300">{label}</span>
              <input
                className={fieldClass}
                data-testid={`setting-${key}`}
                type="number"
                step="any"
                value={thresholds[key] ?? ''}
                onChange={(event) => setField(key, event.target.value)}
                aria-invalid={fieldErrors[key] ? 'true' : undefined}
              />
              {fieldErrors[key] ? <p className="mt-1 text-sm text-rose-200" role="alert">{fieldErrors[key]}</p> : null}
            </label>
          ))}
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-300">Outage complaint count</span>
            <input
              className={fieldClass}
              type="number"
              value={outageRule?.minComplaints ?? ''}
              onChange={(event) => setOutageRule((current) => ({ ...current, minComplaints: event.target.value }))}
              aria-invalid={fieldErrors.minComplaints ? 'true' : undefined}
            />
            {fieldErrors.minComplaints ? <p className="mt-1 text-sm text-rose-200" role="alert">{fieldErrors.minComplaints}</p> : null}
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-300">Outage window (minutes)</span>
            <input
              className={fieldClass}
              type="number"
              value={outageRule?.windowMinutes ?? ''}
              onChange={(event) => setOutageRule((current) => ({ ...current, windowMinutes: event.target.value }))}
              aria-invalid={fieldErrors.windowMinutes ? 'true' : undefined}
            />
            {fieldErrors.windowMinutes ? <p className="mt-1 text-sm text-rose-200" role="alert">{fieldErrors.windowMinutes}</p> : null}
          </label>
          {error ? <p className="text-sm text-rose-200 sm:col-span-2" role="alert">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-200 sm:col-span-2" role="status">{notice}</p> : null}
          <div className="sm:col-span-2">
            <button type="submit" data-testid="save-settings" disabled={pending} className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
              {pending ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
      ) : null}
      {locations.length > 0 ? (
        <ul className="mt-6 space-y-2 text-sm text-slate-300" data-testid="settings-health">
          {locations.map((location) => (
            <li key={location.id}>{location.name}: {location.currentStatus}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
