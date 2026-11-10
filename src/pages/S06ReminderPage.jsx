import { useEffect, useRef, useState } from 'react'
import back from '../assets/icons/chevron-left.svg'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import Note from '../components/ui/Note'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useNavigation } from '../hooks/navigationContext'
import { createInitialPatternResponse } from '../mocks/patternResponses'
import { S05_PREVIEW_ANALYSIS } from '../mocks/s05Preview'
import ReminderSettings from './S06/ReminderSettings'

// F14. 규칙 설정은 기존 카드 응답과 공유하고, 발송·스케줄은 연결하지 않는다.
export default function S06ReminderPage({ params }) {
  const { snapshot, analysis } = useAnalysisSession()
  const { navigate } = useNavigation()
  const designPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === 's05'
  const result = designPreview ? S05_PREVIEW_ANALYSIS : snapshot && analysis?.snapshotId === snapshot.id ? analysis : null
  const validResult = !params?.snapshotId || params.snapshotId === result?.snapshotId ? result : null

  if (!validResult) {
    return (
      <ScreenLayout title="먼저 분석 결과를 확인해 주세요" backFallback={SCREEN.S05}
        footer={<Button onClick={() => navigate(SCREEN.S05, {}, { replace: true })}>결과 홈으로</Button>}>
        <Note>기록을 검토하고 확정하면 현재 분석에 연결된 알림 설정을 확인할 수 있어요.</Note>
      </ScreenLayout>
    )
  }

  return <ReminderManager key={`${designPreview}:${validResult.snapshotId}`} result={validResult} designPreview={designPreview} />
}

function ReminderManager({ result, designPreview }) {
  const { navigate, back: goBack } = useNavigation()
  const { settings, patternResponseStore: store } = useAnalysisSession()
  const rules = result.patterns.filter((pattern) => pattern.reminderSuggestion)
  const prefix = `${designPreview ? 'preview' : 'snapshot'}:${result.snapshotId}:`
  const [selectedId, setSelectedId] = useState(() => rules.find((pattern) => (
    store.get(`${prefix}${pattern.id}`)?.draft ?? createInitialPatternResponse(pattern, { designPreview })
  ).reminder.state === 'enabled')?.id ?? rules[0]?.id)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')
  const mounted = useRef(false)
  const leavingRef = useRef(false)
  const selected = rules.find((pattern) => pattern.id === selectedId) ?? rules[0]
  const failureMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('responseDemo') : null

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const leave = async (destination) => {
    if (leavingRef.current) return
    leavingRef.current = true
    setLeaving(true)
    setLeaveError('')
    const results = await Promise.all(rules.map(async (pattern) => ({
      id: pattern.id,
      saved: await store.save(`${prefix}${pattern.id}`, createInitialPatternResponse(pattern, { designPreview }), pattern, { failureMode }),
    })))
    if (!mounted.current) return
    const failed = results.find((item) => !item.saved)
    if (failed) {
      setSelectedId(failed.id)
      setLeaveError('설정을 저장하지 못했어요. 아래 내용을 확인하고 다시 시도해 주세요.')
    } else if (destination === 'back') {
      goBack(SCREEN.S05)
    } else {
      navigate(destination, { snapshotId: result.snapshotId }, { replace: destination === SCREEN.S05 })
    }
    leavingRef.current = false
    setLeaving(false)
  }

  return (
    <ScreenLayout title="알림 설정과 관리" backFallback={SCREEN.S05} onBack={() => leave('back')}
      backIcon={<img src={back} width={24} height={24} alt="" className="block" />}
      footer={<>
        <Button disabled={leaving} onClick={() => leave(SCREEN.S10)}>완료</Button>
        <Button variant="secondary" disabled={leaving} onClick={() => leave(SCREEN.S05)}>결과 홈으로</Button>
      </>}>
      {rules.length > 1 ? (
        <section className="flex flex-col gap-2.5" aria-label="알림 규칙 선택">
          <h2 className="text-body-b">관리할 알림</h2>
          <div className="flex flex-wrap gap-2">
            {rules.map((pattern) => (
              <Chip key={pattern.id} showCheck={false} selected={selectedId === pattern.id} disabled={leaving} onClick={() => setSelectedId(pattern.id)}>{pattern.title}</Chip>
            ))}
          </div>
        </section>
      ) : null}

      {leaveError ? <Note tone="warn" icon="alert"><p role="alert">{leaveError}</p></Note> : null}

      {selected ? (
        <ReminderSettings key={selected.id} pattern={selected} snapshotId={result.snapshotId} designPreview={designPreview} tone={settings.tone} disabled={leaving} />
      ) : (
        <Card className="flex flex-col gap-2">
          <h2 className="text-heading">아직 설정할 알림이 없어요</h2>
          <p className="text-body text-ink-2">요일·시각 근거가 있는 습관에서 사전 알림을 설정할 수 있어요. 지금은 알림 없이 마쳐도 괜찮아요.</p>
        </Card>
      )}

      <p className="text-micro text-ink-3">{designPreview ? '디자인 미리보기 · 합성 예시 데이터예요.' : '데모 설정 · 현재 확정한 기록에 연결돼요.'} 실제 푸시와 예약 발송은 아직 연결되지 않았어요. 설정은 현재 세션에서 유지돼요.</p>
    </ScreenLayout>
  )
}
