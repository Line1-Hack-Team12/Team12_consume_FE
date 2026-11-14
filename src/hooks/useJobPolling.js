import { useEffect, useRef, useState } from 'react'

const TERMINAL = ['succeeded', 'partial', 'failed', 'no_transactions']

export default function useJobPolling(jobId, fetchJob, { interval = 2000, maxBackoff = 10000 } = {}) {
  const [result, setResult] = useState({ key: null, job: null, error: null, polls: 0 })
  const fetchRef = useRef(fetchJob)
  useEffect(() => { fetchRef.current = fetchJob })
  useEffect(() => {
    if (!jobId) return undefined
    let cancelled = false
    let timer
    let delay = interval
    let polls = 0
    const tick = async () => {
      try {
        const job = await fetchRef.current(jobId)
        if (cancelled) return
        setResult({ key: jobId, job, error: null, polls: ++polls })
        delay = interval
        if (!TERMINAL.includes(job.state)) timer = setTimeout(tick, delay)
      } catch (error) {
        if (cancelled) return
        setResult((previous) => ({ key: jobId, job: previous.key === jobId ? previous.job : null, error, polls: ++polls }))
        delay = Math.min(delay * 2, maxBackoff)
        timer = setTimeout(tick, delay)
      }
    }
    timer = setTimeout(tick, 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [jobId, interval, maxBackoff])
  return result.key === jobId ? result : { job: null, error: null, polls: 0 }
}
