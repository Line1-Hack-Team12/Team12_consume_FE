import { useState } from 'react'
import ScreenLayout from '../components/layout/ScreenLayout'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Note from '../components/ui/Note'
import { CATEGORIES, DIRECTIONS } from '../constants/limits'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useNavigation } from '../hooks/navigationContext'
import { summarizeDraft } from '../mocks/draft'
import { formatKRW, formatShortDate } from '../utils/format'
import { formatSlotRange } from '../utils/months'
import { isTransactionValid } from '../utils/transactionValidation'

const PAGE = 10
const labelOf = (list, v) => list.find((x) => x.value === v)?.label ?? v

// S03-T 전체 내역 수정하기 · 모바일은 행 카드, 날짜순 10건씩
export default function S03TablePage() {
  const { navigate, back } = useNavigation()
  const { draft } = useAnalysisSession()
  const [shown, setShown] = useState(PAGE)

  if (!draft) {
    return (
      <ScreenLayout title="표가 아직 없어요" backFallback={SCREEN.S03}>
        <Note tone="gray">캡처를 읽은 뒤에 전체 표를 볼 수 있어요.</Note>
      </ScreenLayout>
    )
  }

  const summary = summarizeDraft(draft)
  const slots = Object.keys(summary.bySlot).sort()
  const mergedAway = new Set(
    draft.duplicateGroups.filter((g) => g.decision === 'merge').flatMap((g) => g.memberIds.filter((id) => id !== g.representativeId)),
  )
  const rows = draft.transactions

  return (
    <ScreenLayout
      title="전체 내역 수정하기"
      description={
        <>
          {summary.expenseCount}건 · 검토 중 {formatKRW(summary.expenseSum)}
          <br />
          업로드한 {formatSlotRange(slots)} 기록 기준
        </>
      }
      backFallback={SCREEN.S03}
      contentClassName="gap-3.5"
      footer={
        <Button variant="secondary" onClick={() => back(SCREEN.S03)}>
          검토 화면으로
        </Button>
      }
    >
      <p className="text-caption text-ink-3">날짜 · 시각 · 가맹점 · 금액 · 방향 · 카테고리 · 포함 상태</p>
      <ul className="flex flex-col gap-2.5">
        {rows.slice(0, shown).map((t) => {
          const excluded = !t.included
          const merged = mergedAway.has(t.id)
          const invalid = t.included && !isTransactionValid(t)
          const cat = [labelOf(CATEGORIES, t.category), t.subcategory].filter(Boolean).join('/')
          return (
            <li key={t.id} className={`flex flex-col gap-2.5 rounded-2xl p-4 ${excluded ? 'bg-subtle' : 'bg-surface'}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`text-body-b ${excluded ? 'text-ink-3' : ''}`}>
                    {formatShortDate(t.date)} {t.time ?? '시각 없음'} · {t.merchant}
                  </p>
                  <p className="text-caption text-ink-3">
                    {formatKRW(t.amountKrw)} · {labelOf(DIRECTIONS, t.direction)} · {cat}
                  </p>
                </div>
                {invalid ? (
                  <Badge tone="danger">필수값 확인</Badge>
                ) : excluded ? (
                  <Badge>제외됨</Badge>
                ) : merged ? (
                  <Badge tone="brand">중복 합침</Badge>
                ) : t.direction !== 'out' || t.kind !== 'expense' ? (
                  <Badge>지출 아님</Badge>
                ) : (
                  <Badge tone="success">포함</Badge>
                )}
              </div>
              <Button size="md" variant="secondary" onClick={() => navigate(SCREEN.S03_E, { id: t.id })}>
                {excluded ? '복원 또는 수정' : '이 내역 수정'}
              </Button>
            </li>
          )
        })}
      </ul>
      {shown < rows.length ? (
        <Button variant="tonal" size="md" onClick={() => setShown((n) => n + PAGE)}>
          다음 {Math.min(PAGE, rows.length - shown)}건 보기
        </Button>
      ) : null}
      <Note tone="gray">날짜순으로 정렬했어요. 원본 이미지는 확정 전까지만 확인할 수 있어요.</Note>
    </ScreenLayout>
  )
}
