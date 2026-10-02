import { useEffect, useState } from 'react'
import { fetchAiSummary, fetchAnomalies, fetchRecommendations } from '../../api/ai.js'
import { getApiErrorMessage } from '../../api/errors.js'
import RequestError from '../../components/RequestError.jsx'
import { WidgetSkeleton } from '../../components/Skeleton.jsx'

export default function InsightsPage() {
  const [summary, setSummary] = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · AI Insights'
  }, [])

  useEffect(() => {
    let active = true
    setState('loading')
    setError('')
    Promise.allSettled([fetchAiSummary(), fetchAnomalies(), fetchRecommendations()]).then((results) => {
      if (!active) return
      const [summaryResult, anomalyResult, recommendationResult] = results
      setSummary(summaryResult.status === 'fulfilled' ? summaryResult.value : null)
      setAnomalies(anomalyResult.status === 'fulfilled' ? anomalyResult.value?.anomalies || [] : [])
      setRecommendations(recommendationResult.status === 'fulfilled' ? recommendationResult.value?.recommendations || [] : [])
      const failed = results.find((result) => result.status === 'rejected')
      if (failed) setError(getApiErrorMessage(failed.reason, 'Could not load AI insights.'))
      setState(results.every((result) => result.status === 'rejected') ? 'error' : 'ready')
    })
    return () => {
      active = false
    }
  }, [attempt])

  const tests = summary?.stats?.tests
  const emptyNetwork = state === 'ready' && !error && (tests === 0 || tests == null) && anomalies.length === 0 && recommendations.length === 0

  return (
    <section className="max-w-4xl" data-testid="ai-insights">
      <h2 className="text-2xl font-semibold">AI Insights</h2>
      <p className="mt-2 text-slate-400">Template summaries built from tests, complaints, and outages. No external API key is required.</p>

      {state === 'loading' ? <WidgetSkeleton label="Loading insights…" className="mt-6 h-48" /> : null}
      {error ? <RequestError message={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}

      {state === 'ready' && emptyNetwork ? (
        <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300" data-testid="ai-empty">
          No network data yet. Insights appear after tests and complaints are saved.
        </p>
      ) : null}

      {state === 'ready' && !emptyNetwork ? (
        <div className="mt-6 space-y-4">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4" data-testid="ai-summary">
            <h3 className="text-sm font-medium text-slate-300">Summary</h3>
            <p className="mt-3 text-sm text-slate-200">{summary?.summary || 'No summary is available.'}</p>
            <p className="mt-2 text-xs text-slate-500">Source: {summary?.source || 'template'}</p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4" data-testid="ai-anomalies">
            <h3 className="text-sm font-medium text-slate-300">Anomalies</h3>
            {anomalies.length === 0 ? <p className="np-empty mt-3">No anomalies in the current data.</p> : null}
            {anomalies.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {anomalies.map((item) => (
                  <li key={`${item.locationId}-${item.date}-${item.zScore}`} className="rounded-xl border border-slate-800 px-3 py-2 text-sm">
                    <p className="font-medium">{item.locationName || 'Location'}</p>
                    <p className="text-slate-400">
                      {item.date}: score {item.value} (z {item.zScore})
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4" data-testid="ai-recommendations">
            <h3 className="text-sm font-medium text-slate-300">Recommendations</h3>
            {recommendations.length === 0 ? <p className="np-empty mt-3">No recommendations yet.</p> : null}
            {recommendations.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {recommendations.map((item) => (
                  <li key={item.locationId || item.name} className="rounded-xl border border-slate-800 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-slate-400">Priority {item.priority}</p>
                    </div>
                    <p className="mt-1 text-slate-400">{item.reason}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  )
}
