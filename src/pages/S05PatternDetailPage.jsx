import { useState } from 'react'
import actionCheck from '../assets/icons/check-success.svg'
import back from '../assets/icons/chevron-left.svg'
import ScreenLayout from '../components/layout/ScreenLayout'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Note from '../components/ui/Note'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import usePatternResponse from '../hooks/usePatternResponse'
import { S05_PREVIEW_ANALYSIS } from '../mocks/s05Preview'
import CauseResponseCard from './S05Detail/CauseResponseCard'
import CostBreakdownCard from './S05Detail/CostBreakdownCard'
import EvidenceCard from './S05Detail/EvidenceCard'
import ReminderCard from './S05Detail/ReminderCard'

// S05-1 카드 상세 (F12·F13·F14). 수치와 거래 근거는 선택한 분석 결과만 사용한다.
export default function S05PatternDetailPage({ params }) {
  const { navigate } = useAppNavigation()
  const { settings, snapshot, analysis } = useAnalysisSession()
  const [leaving, setLeaving] = useState(false)
  const designPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === 's05'
  const result = designPreview ? S05_PREVIEW_ANALYSIS : snapshot && analysis?.snapshotId === snapshot.id ? analysis : null
  const validSnapshot = !params?.snapshotId || params.snapshotId === result?.snapshotId
  const pattern = validSnapshot ? result?.patterns.find((item) => !params?.patternId || item.id === params.patternId) ?? null : null
  const { response, saving, error, customError, toggleTag, setCustomCause, selectStatus, setReminderEnabled, retry, save } = usePatternResponse({ pattern, snapshotId: result?.snapshotId, designPreview })
  const tone = settings.tone

  const leave = async (screenId) => {
    if (leaving) return
    setLeaving(true)
    try {
      if (await save()) navigate(screenId, { snapshotId: result?.snapshotId }, { replace: screenId === SCREEN.S05 })
    } finally {
      setLeaving(false)
    }
  }

  if (!pattern) {
    return (
      <ScreenLayout
        title={result ? '선택한 습관을 찾을 수 없어요' : '먼저 분석 결과를 확인해 주세요'}
        onBack={() => navigate(SCREEN.S05, {}, { replace: true })}
        backFallback={SCREEN.S05}
        footer={<Button onClick={() => navigate(SCREEN.S05, {}, { replace: true })}>결과 홈으로</Button>}
      >
        <Note>결과 홈에서 현재 분석의 습관 카드를 선택하면 비용과 근거를 확인할 수 있어요.</Note>
      </ScreenLayout>
    )
  }

  const action = pattern.copyByTone?.[tone]?.action ?? pattern.copyByTone?.coach?.action ?? '다음 소비 전에 한 번 더 확인해 보세요.'
  const nextPattern = result.patterns[result.patterns.findIndex((item) => item.id === pattern.id) + 1]

  return (
    <ScreenLayout
      title={pattern.title}
      onBack={() => leave(SCREEN.S05)}
      backFallback={SCREEN.S05}
      backIcon={<img src={back} width={24} height={24} alt="" className="block" />}
      footer={
        <>
          {nextPattern ? <Button disabled={leaving || saving} onClick={async () => {
            setLeaving(true)
            try { if (await save()) navigate(SCREEN.S05_1, { snapshotId: result.snapshotId, patternId: nextPattern.id }) }
            finally { setLeaving(false) }
          }}>다음 카드</Button> : null}
          <Button disabled={leaving} onClick={() => leave(SCREEN.S09)}>적금 플랜으로</Button>
          <Button variant="secondary" disabled={leaving} onClick={() => leave(SCREEN.S05)}>결과 홈으로</Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-body-b text-ink-2">{pattern.observation}</p>
        <Badge tone={pattern.evidenceGrade === 'strong' ? 'strong' : 'normal'}>{pattern.evidenceGrade === 'strong' ? '근거 강함' : '근거 보통'}</Badge>
      </div>

      <CostBreakdownCard pattern={pattern} />
      <EvidenceCard key={`evidence-${pattern.id}`} pattern={pattern} />
      <CauseResponseCard
        pattern={pattern}
        tone={tone}
        response={response}
        customError={customError}
        onToggleTag={toggleTag}
        onCustomCause={setCustomCause}
        onStatus={selectStatus}
      />

      {error ? (
        <Note tone="warn" icon="alert">
          <p>{error}</p>
          <Button size="sm" variant="secondary" className="mt-2" disabled={saving} onClick={retry}>다시 저장</Button>
        </Note>
      ) : null}

      <Card tone="success" padding="lg" className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1.5 text-caption-m text-success">
          <img src={actionCheck} width={16} height={16} alt="" className="shrink-0" />
          다음 행동
        </h2>
        <p className="text-body-b">{action}</p>
      </Card>

      <ReminderCard key={`reminder-${pattern.id}`} pattern={pattern} tone={tone} response={response} onToggle={setReminderEnabled} />
      <p className="text-micro text-ink-3">
        {designPreview ? '디자인 미리보기 · Figma의 예시 데이터예요.' : result.mode === 'server' ? '확정한 기록의 서버 분석 결과예요. 응답은 서버에 저장돼요.' : '데모 결과 · 응답은 현재 세션에서 유지돼요.'} 실제 푸시는 발송하지 않아요.
      </p>
    </ScreenLayout>
  )
}
