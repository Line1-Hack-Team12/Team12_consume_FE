import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Note from '../components/ui/Note'
import { DIRECTIONS } from '../constants/limits'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import { formatKRW, formatShortDate } from '../utils/format'

// E02 중복 후보 확인 (F05) · 기본 merge, separate면 둘 다 포함. 어느 쪽도 영구 삭제하지 않는다.
export default function E02DuplicatePage({ params }) {
  const { navigate, back } = useAppNavigation()
  const { draft, setDuplicateDecision, syncBusy, syncError } = useAnalysisSession()
  const groups = draft?.duplicateGroups ?? []
  const index = Math.min(params?.index ?? 0, Math.max(0, groups.length - 1))
  const group = groups[index]

  if (!group) {
    return (
      <ScreenLayout title="중복 후보가 없어요" backFallback={SCREEN.S03}>
        <Note tone="gray">겹치는 거래가 없어요.</Note>
      </ScreenLayout>
    )
  }

  const members = group.memberIds.map((id) => draft.transactions.find((t) => t.id === id)).filter(Boolean)

  const decide = async (decision) => {
    if (!(await setDuplicateDecision(group.id, decision))) return
    if (index + 1 < groups.length) navigate(SCREEN.E02, { index: index + 1 }, { replace: true })
    else back(SCREEN.S03)
  }

  return (
    <ScreenLayout
      title="중복 후보 확인"
      description={`중복 후보 ${groups.length}건 중 ${index + 1}건`}
      backFallback={SCREEN.S03}
      contentClassName="gap-3.5"
      footer={
        <>
          {syncError ? <p role="alert" className="text-caption text-danger-ink">{syncError}</p> : null}
          <Button disabled={syncBusy} onClick={() => decide('merge')}>같은 거래 · 유지</Button>
          <Button disabled={syncBusy} variant="secondary" onClick={() => decide('separate')}>
            서로 다른 결제 · 둘 다 포함
          </Button>
        </>
      }
    >
      {members.map((t) => (
        <section key={t.id} className="rounded-2xl bg-surface p-4">
          <p className="text-body-b">
            {t.source ?? '파일'} · {t.merchant}
          </p>
          <p className="text-caption text-ink-3">
            {formatShortDate(t.date)} {t.time ?? '시각 없음'} · {DIRECTIONS.find((d) => d.value === t.direction)?.label} · {formatKRW(t.amountKrw)}
          </p>
        </section>
      ))}
      <section className="rounded-2xl border border-brand bg-brand-tint p-4 text-brand-deep">
        <p className="flex items-center gap-2 text-body-b">
          <Icon name="check" size={16} className="text-brand" />
          {group.decision === 'merge' ? '기본 선택 · 같은 거래' : '현재 선택 · 둘 다 포함'}
        </p>
        <p className="mt-1.5 text-caption">
          {group.decision === 'merge' ? '한 건만 합계에 포함해요. 원본 거래는 삭제하지 않아요.' : '두 건 모두 합계에 포함돼요. 언제든 다시 합칠 수 있어요.'}
        </p>
      </section>
    </ScreenLayout>
  )
}
