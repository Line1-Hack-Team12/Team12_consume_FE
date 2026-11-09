import { useState } from 'react'
import lock from '../assets/s05/lock.svg'
import summarySparkle from '../assets/s05/summary-sparkle.svg'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Note from '../components/ui/Note'
import SummaryCard from '../components/ui/SummaryCard'
import { TONES } from '../constants/limits'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useNavigation } from '../hooks/navigationContext'
import { S05_PREVIEW_ANALYSIS } from '../mocks/s05Preview'
import { formatKRW } from '../utils/format'
import { formatShortMonth } from '../utils/months'
import MarqueeText from './S05/MarqueeText'
import PatternCard from './S05/PatternCard'

// S05 결과 홈 (F10·F12·F16). 실제 결과는 확정 snapshot과 연결된 analysis만 사용한다.
export default function S05ResultsPage() {
  const { navigate } = useNavigation()
  const { settings, snapshot, analysis, updateSettings } = useAnalysisSession()
  const [lockedPattern, setLockedPattern] = useState(null)
  const designPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === 's05'
  const result = designPreview ? S05_PREVIEW_ANALYSIS : snapshot && analysis?.snapshotId === snapshot.id ? analysis : null

  if (!result) {
    return (
      <ScreenLayout
        showBack={false}
        title="아직 분석 결과가 없어요"
        footer={<Button onClick={() => navigate(snapshot ? SCREEN.S03_P : SCREEN.S01, {}, { replace: true })}>{snapshot ? '최종 분석 이어가기' : '캡처 올리러 가기'}</Button>}
      >
        <Note>업로드한 기록을 검토하고 확정하면 이곳에서 분석 결과를 볼 수 있어요.</Note>
      </ScreenLayout>
    )
  }

  const tone = TONES.some((item) => item.value === settings.tone) ? settings.tone : 'coach'
  const summary = result.summaryByTone[tone] ?? result.summaryByTone.coach
  const categorySummary = result.topCategories.map((category) => `${category.label} ${category.sharePercent}%`).join(' · ')
  const comparison = result.monthComparison
  const canAddMonths = result.slots.length < 3

  const addMonths = () => {
    updateSettings({ monthCount: 3 })
    navigate(SCREEN.S01)
  }

  const openPattern = (pattern) => navigate(SCREEN.S05_1, { patternId: pattern.id, snapshotId: result.snapshotId })

  return (
    <ScreenLayout
      showBack={false}
      title="분석 결과"
      footer={
        <>
          <Button onClick={() => navigate(SCREEN.S09, { snapshotId: result.snapshotId })}>적금 플랜 만들기</Button>
          <Button variant="secondary" onClick={() => navigate(SCREEN.S06, { snapshotId: result.snapshotId })}>알림 관리</Button>
        </>
      }
    >
      <SummaryCard caption={result.periodLabel} amount={formatKRW(result.totalKrw)} prominent>
        <dl className={`grid gap-2 ${comparison ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-white/10 px-3 py-2.5">
            <dt className="text-micro text-white/65">많이 쓴 곳</dt>
            <dd className="min-w-0 text-body-b">
              <MarqueeText text={categorySummary || '표시할 지출이 없어요'} />
            </dd>
          </div>
          {comparison ? (
            <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-white/10 px-3 py-2.5">
              <dt className="text-micro text-white/65">{formatShortMonth(comparison.month)} · 전월 대비</dt>
              <dd className="text-body-b">{comparison.changePercent > 0 ? '+' : ''}{comparison.changePercent}%</dd>
            </div>
          ) : null}
        </dl>
        <div className="flex items-start gap-2" aria-live="polite" aria-atomic="true">
          <img src={summarySparkle} width={16} height={16} alt="" className="shrink-0" />
          <p className="min-w-0 flex-1 text-body-m">{summary}</p>
        </div>
      </SummaryCard>

      <div className="flex flex-wrap gap-2" role="group" aria-label="말투">
        {TONES.map((item) => (
          <Chip key={item.value} selected={tone === item.value} onClick={() => updateSettings({ tone: item.value })}>
            {item.label}
          </Chip>
        ))}
      </div>

      <Button variant="secondary" onClick={() => navigate(SCREEN.S08, { snapshotId: result.snapshotId })}>리포트 상세 →</Button>

      <section className="flex flex-col gap-5" aria-labelledby="patterns-title">
        <h2 id="patterns-title" className="text-heading">관찰한 습관 {result.patterns.length}개</h2>
        {result.patterns.length > 0 ? (
          <ul className="flex flex-col gap-5">
            {result.patterns.map((pattern, index) => (
              <PatternCard key={pattern.id} pattern={pattern} featured={index === 0} onOpen={() => openPattern(pattern)} />
            ))}
          </ul>
        ) : (
          <Card className="flex flex-col gap-2">
            <h3 className="text-body-b">아직 반복되는 습관을 찾지 못했어요.</h3>
            <p className="text-caption text-ink-2">한 달 더 쌓이면 다시 찾아볼게요. 지금도 요약과 리포트는 확인할 수 있어요.</p>
          </Card>
        )}
      </section>

      {result.lockedPatterns.length > 0 ? (
        <ul className="flex flex-col gap-5" aria-label="한 번 관찰한 습관">
          {result.lockedPatterns.map((pattern) => (
            <li key={pattern.id}>
              <button
                type="button"
                onClick={() => setLockedPattern(pattern)}
                className="flex w-full items-center gap-2.5 rounded-[18px] border border-dashed border-line-strong bg-canvas p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                aria-label={`잠김 · ${pattern.title} · 한 번 더 보이면 카드로 열려요`}
              >
                <img src={lock} width={18} height={18} alt="" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-body-b text-ink-2">잠김 · {pattern.title} 1회 관찰</p>
                  <p className="text-caption text-ink-3">한 번 더 보이면 카드로 열려요</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {canAddMonths ? (
        <Card className="flex flex-col gap-3">
          <p className="text-caption text-ink-2">다른 달의 기록을 더하면 관찰할 수 있는 습관이 늘어나요.</p>
          <Button variant="secondary" onClick={addMonths}>달 추가하기 →</Button>
        </Card>
      ) : null}

      {result.mode === 'demo' ? (
        <p className="text-micro text-ink-3">
          {designPreview ? '디자인 미리보기 · Figma의 예시 데이터예요.' : '데모 분석 · 확정한 예시 거래를 사용한 목업 결과예요. 실제 AI·날씨 분석은 연결되지 않았어요.'}
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(lockedPattern)}
        title="한 번 더 보이면 카드로 열려요"
        confirmLabel={canAddMonths ? '달 추가하기' : '확인'}
        cancelLabel="결과 홈으로"
        onConfirm={() => {
          setLockedPattern(null)
          if (canAddMonths) addMonths()
        }}
        onCancel={() => setLockedPattern(null)}
      >
        {lockedPattern?.title} 항목은 서로 다른 날짜에 한 번만 관찰됐어요. 기록이 더 쌓이면 반복되는 습관인지 확인할 수 있어요.
      </ConfirmDialog>
    </ScreenLayout>
  )
}
