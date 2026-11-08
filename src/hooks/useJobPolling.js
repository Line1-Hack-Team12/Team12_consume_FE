import { useEffect, useRef, useState } from 'react'

const TERMINAL = ['succeeded', 'partial', 'failed']

/**
 * job 상태 폴링 · 명세: 2초 간격, 오류 시 최대 10초까지 backoff, 화면 이탈 시 정리
 * @param {string|null} jobId
 * @param {(jobId: string) => Promise<object>} fetchJob  job 상태를 돌려주는 함수 (현재는 mocks)
 */
export default function useJobPolling(jobId, fetchJob, { interval = 2000, maxBackoff = 10000 } = {}) {
  const [job, setJob] = useState(null)
  const [error, setError] = useState(null)
  const fetchRef = useRef(fetchJob)

  useEffect(() => {
    fetchRef.current = fetchJob
  })

  useEffect(() => {
    if (!jobId) return undefined
    let cancelled = false
    let timer
    let delay = interval

    const tick = async () => {
      try {
        const next = await fetchRef.current(jobId)
        if (cancelled) return
        setJob(next)
        setError(null)
        delay = interval
        if (!TERMINAL.includes(next.state)) timer = setTimeout(tick, delay)
      } catch (err) {
        if (cancelled) return
        setError(err)
        delay = Math.min(delay * 2, maxBackoff)
        timer = setTimeout(tick, delay)
      }
    }
    timer = setTimeout(tick, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [jobId, interval, maxBackoff])

  return { job, error }
}
