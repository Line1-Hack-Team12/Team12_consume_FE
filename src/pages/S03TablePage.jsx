import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ScreenLayout from '../components/layout/ScreenLayout'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Note from '../components/ui/Note'
import sparkle from '../assets/s03/sparkle.svg'
import chevronLeft from '../assets/s03/chevron-left.svg'
import info from '../assets/icons/info.svg'
import { CATEGORIES, DIRECTIONS } from '../constants/limits'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import { formatKRW, formatShortDate } from '../utils/format'
import { formatSlotRange } from '../utils/months'
import { isTransactionValid } from '../utils/transactionValidation'
import { expenseImpact, summarizeDraft } from '../utils/transactions'

const PAGE = 10
const labelOf = (list, value) => list.find((item) => item.value === value)?.label ?? value
const actionClass = 'min-h-8 rounded px-1 text-caption-m focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-5'
const cellClass = 'min-w-0 lg:border-t lg:border-line lg:py-3.5 lg:pr-3 lg:align-middle'

function ReviewBadge({ transaction, merged }) {
  if (!transaction.included) return <Badge>제외됨</Badge>
  if (merged) return <Badge tone="brand">중복 합침</Badge>
  if (!isTransactionValid(transaction)) return <Badge tone="danger">필수값 확인</Badge>
  if (transaction.reviewStatus === 'pending') return <Badge tone="coral">확신 낮음</Badge>
  if (expenseImpact(transaction) < 0) return <Badge>지출 차감</Badge>
  if (expenseImpact(transaction) === 0) return <Badge>지출 아님</Badge>
  return <Badge tone="success">확인됨</Badge>
}

// F04·F05: 모바일 행 카드 / PC 열 표. 변경은 세션 draft에 저장한다.
export default function S03TablePage() {
  const { current, navigate, back, getViewState, saveViewState, isCurrentView } = useAppNavigation()
  const { draft, updateTransaction, setDuplicateDecision, syncBusy, syncError } = useAnalysisSession()
  const [shown, setShown] = useState(() => getViewState(current.key)?.shown ?? PAGE)
  const [notice, setNotice] = useState('')
  const listRef = useRef(null)
  const hasDraft = Boolean(draft)

  useLayoutEffect(() => {
    if (!hasDraft) return
    const saved = getViewState(current.key)
    if (!saved) return
    const rows = Array.from(listRef.current?.children ?? [])
    const anchor = rows.find((row) => row.dataset.transactionId === String(saved.anchorId))
    const top = anchor ? window.scrollY + anchor.getBoundingClientRect().top - saved.anchorOffset : saved.scrollY
    window.scrollTo({ left: saved.scrollX, top, behavior: 'instant' })
    rows.find((row) => row.dataset.transactionId === String(saved.focusId))?.querySelector('button')?.focus({ preventScroll: true })
  }, [current.key, hasDraft, getViewState])

  useEffect(() => {
    if (!hasDraft) return undefined
    const rememberPosition = () => {
      if (!isCurrentView(current.key)) return
      saveViewState(current.key, { ...getViewState(current.key), shown, scrollX: window.scrollX, scrollY: window.scrollY })
    }
    rememberPosition()
    window.addEventListener('scroll', rememberPosition, { passive: true })
    return () => window.removeEventListener('scroll', rememberPosition)
  }, [current.key, hasDraft, shown, getViewState, saveViewState, isCurrentView])

  if (!draft) return <ScreenLayout title="표가 아직 없어요" backFallback={SCREEN.S03}><Note tone="gray">파일을 읽은 뒤에 전체 표를 볼 수 있어요.</Note></ScreenLayout>

  const summary = summarizeDraft(draft)
  // 제외·병합 여부와 무관하게 업로드 범위를 유지한다.
  const slots = [...new Set(draft.slots?.length ? draft.slots : draft.transactions.map((t) => t.slotMonth).filter(Boolean))].sort()
  const mergedGroups = draft.duplicateGroups.filter((group) => group.decision === 'merge')
  const mergedAway = new Set(mergedGroups.flatMap((group) => group.memberIds.filter((id) => id !== group.representativeId)))
  const rows = [...draft.transactions].sort((a, b) => `${a.date ?? ''}${a.time ?? ''}`.localeCompare(`${b.date ?? ''}${b.time ?? ''}`))
  const visibleRows = rows.slice(0, shown)
  const returnToReview = () => back(SCREEN.S03)

  const openDetail = (screen, params, transaction) => {
    const anchor = Array.from(listRef.current?.children ?? []).find((row) => row.dataset.transactionId === transaction?.id)
    saveViewState(current.key, {
      shown, scrollX: window.scrollX, scrollY: window.scrollY,
      anchorId: transaction?.id, anchorOffset: anchor?.getBoundingClientRect().top, focusId: transaction?.id,
    })
    navigate(screen, params)
  }
  const toggleIncluded = async (transaction) => {
    const included = !transaction.included
    const reviewStatus = included ? (transaction.reviewReasons.length ? 'pending' : 'ok') : 'excluded'
    if (await updateTransaction(transaction.id, { included, reviewStatus })) setNotice(`${transaction.merchant || '내역'} ${included ? '복원' : '제외'} 내용을 초안에 저장했어요.`)
  }
  const keep = async (transaction) => {
    if (await updateTransaction(transaction.id, { reviewStatus: 'kept' })) setNotice('내역 확인을 초안에 저장했어요.')
  }
  const separate = async (group) => {
    if (await setDuplicateDecision(group.id, 'separate')) setNotice('중복 후보를 분리하고 각 거래를 초안에 복원했어요.')
  }
  const controls = <>
    <Button variant="secondary" className="lg:h-12 lg:w-40" onClick={returnToReview} disabled={syncBusy}>검토 화면으로</Button>
    <Button className="lg:h-12 lg:w-[140px]" onClick={returnToReview} disabled={syncBusy || Boolean(syncError)}>{syncBusy ? '저장 중…' : '변경 저장'}</Button>
  </>

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-12 max-w-[640px] items-center gap-3 px-6 lg:h-16 lg:max-w-none lg:px-12">
          <span className="flex shrink-0 rounded-lg bg-brand p-[5px]"><img src={sparkle} alt="" className="shrink-0" /></span>
          <span className="flex-1 text-caption-m lg:text-body-b">소비 습관 돌아보기</span>
          <nav aria-label="분석 단계" className="hidden items-center gap-6 text-body-m text-ink-3 lg:flex">
            <span>설정</span><span>추출</span><span aria-current="step" className="text-body-b text-brand">검토 · 확정</span><span>결과</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-6 pt-6 pb-7 lg:max-w-none lg:gap-6 lg:px-12 lg:pt-9 lg:pb-10">
        <div className="flex items-end gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <button type="button" onClick={returnToReview} disabled={syncBusy} className="flex min-h-5 w-fit items-center gap-1 rounded text-caption-m text-ink-2 focus-visible:outline-2 focus-visible:outline-brand">
              <img src={chevronLeft} alt="" className="shrink-0" />검토 화면으로
            </button>
            <h1 tabIndex={-1} className="text-title-l focus:outline-none">전체 검토 표와 수정</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <p className="text-body-b">{summary.expenseCount}건 · {formatKRW(summary.expenseSum)}</p>
              <Badge tone="demo">검토 중</Badge>
              <p className="text-caption text-ink-2">업로드한 {formatSlotRange(slots)} 기록 기준</p>
              {draft.duplicateGroups.length ? <button type="button" disabled={syncBusy} onClick={() => openDetail(SCREEN.E02, { index: 0 })} className="rounded-md focus-visible:outline-2 focus-visible:outline-brand">
                <Badge tone="brand">중복 후보 {mergedGroups.length}건 merge{draft.duplicateGroups.length > mergedGroups.length ? ` · ${draft.duplicateGroups.length - mergedGroups.length}건 separate` : ''}</Badge>
              </button> : null}
            </div>
          </div>
          <div className="hidden shrink-0 gap-2 lg:flex">{controls}</div>
        </div>
        {syncError ? <Note tone="danger" icon="alert"><p role="alert">{syncError}</p></Note> : null}
        <p role="status" className="sr-only">{syncBusy ? '초안에 저장 중이에요.' : notice}</p>
        <section aria-label="전체 거래 내역" className="lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line lg:bg-surface">
          <div className="lg:overflow-x-auto">
            <table className="block w-full text-body lg:table lg:min-w-[1120px] lg:table-fixed lg:border-collapse">
              <caption className="sr-only">날짜순 전체 거래 내역. 수정, 제외, 복원 및 중복 분리를 할 수 있어요.</caption>
              <thead className="hidden bg-subtle text-left text-caption-m text-ink-2 lg:table-header-group">
                <tr>{[
                  ['날짜', 'w-[164px] pl-6'], ['시각', 'w-[90px]'], ['가맹점', 'w-[220px]'], ['금액', 'w-[130px]'],
                  ['방향', 'w-[90px]'], ['분류', 'w-[170px]'], ['검토', 'w-[120px]'], ['동작', 'pr-6'],
                ].map(([label, className]) => <th key={label} scope="col" className={`py-3.5 font-medium ${className}`}>{label}</th>)}</tr>
              </thead>
              <tbody ref={listRef} className="flex flex-col gap-2.5 lg:table-row-group">
                {visibleRows.map((transaction) => {
                  const excluded = !transaction.included
                  const merged = mergedAway.has(transaction.id)
                  const groupIndex = draft.duplicateGroups.findIndex((group) => group.memberIds.includes(transaction.id))
                  const group = draft.duplicateGroups[groupIndex]
                  const category = [labelOf(CATEGORIES, transaction.category), transaction.subcategory].filter(Boolean).join(' / ')
                  const edit = () => openDetail(SCREEN.S03_E, { id: transaction.id }, transaction)
                  return <tr key={transaction.id} data-transaction-id={transaction.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2.5 rounded-2xl border border-line p-4 lg:table-row lg:rounded-none lg:border-0 lg:p-0 ${excluded || merged ? 'bg-canvas text-ink-3' : 'bg-surface'}`}>
                    <td className={`${cellClass} text-caption lg:pl-6 lg:text-body`}>{transaction.date || '날짜 없음'}</td>
                    <td className={`${cellClass} text-right text-caption lg:text-left lg:text-body`}>{transaction.time || '없음'}</td>
                    <td className={`${cellClass} text-body-b wrap-anywhere lg:font-normal`}>{transaction.merchant || '가맹점 없음'}</td>
                    <td className={`${cellClass} text-right text-body-b lg:text-left`}>{formatKRW(transaction.amountKrw)}</td>
                    <td className={cellClass}><span className="mr-2 text-caption text-ink-3 lg:hidden">방향</span>{labelOf(DIRECTIONS, transaction.direction)}</td>
                    <td className={`${cellClass} text-right lg:text-left`}><span className="mr-2 text-caption text-ink-3 lg:hidden">분류</span>{category || '미분류'}</td>
                    <td className={cellClass}><ReviewBadge transaction={transaction} merged={merged} /></td>
                    <td className={`${cellClass} text-right lg:pr-6 lg:text-left`}>
                      <div className="flex flex-wrap items-center justify-end gap-x-0.5 lg:justify-start">
                        {merged ? <>
                          <button type="button" disabled={syncBusy} onClick={() => separate(group)} className={`${actionClass} text-brand`}>분리·복원</button>
                          <span aria-hidden="true" className="text-ink-3">·</span>
                          <button type="button" disabled={syncBusy} onClick={edit} className={`${actionClass} text-ink-2`}>수정</button>
                        </> : <>
                          <button type="button" disabled={syncBusy} onClick={excluded ? () => toggleIncluded(transaction) : edit} className={`${actionClass} text-brand`} aria-label={`${formatShortDate(transaction.date)} ${transaction.merchant} ${excluded ? '복원' : '수정'}`}>{excluded ? '복원' : '수정'}</button>
                          <span aria-hidden="true" className="text-ink-3">·</span>
                          {excluded ? <button type="button" disabled={syncBusy} onClick={edit} className={`${actionClass} text-ink-2`}>수정</button>
                            : transaction.reviewStatus === 'pending' && isTransactionValid(transaction)
                              ? <button type="button" disabled={syncBusy} onClick={() => keep(transaction)} className={`${actionClass} text-ink-2`}>그대로 두기</button>
                              : <button type="button" disabled={syncBusy} onClick={() => toggleIncluded(transaction)} className={`${actionClass} text-ink-2`}>제외</button>}
                        </>}
                      </div>
                      {group ? <button type="button" disabled={syncBusy} onClick={() => openDetail(SCREEN.E02, { index: groupIndex }, transaction)} className={`${actionClass} text-brand`}>중복 확인</button> : null}
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
          {!rows.length ? <p className="p-6 text-caption text-ink-2">표시할 거래 내역이 없어요.</p> : null}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-caption lg:mt-0 lg:border-t lg:border-line lg:px-6 lg:py-3.5">
            <p className="text-ink-3">{rows.length}건 중 {visibleRows.length ? `1–${visibleRows.length}` : '0'} · 날짜순 정렬</p>
            {shown < rows.length ? <button type="button" onClick={() => setShown((count) => count + PAGE)} className={`${actionClass} text-brand`}>다음 {Math.min(PAGE, rows.length - shown)}건 보기 →</button> : null}
          </div>
        </section>
        <Note tone="gray" className="px-4 lg:items-center" iconContent={<img src={info} alt="" className="mt-px shrink-0" />}>
          시각이 비어 있어도 괜찮아요(시간 분석에서만 제외). 수정·제외·복원은 모두 초안에 저장되고, 원본 이미지는 확정 전까지만 확인할 수 있어요.
        </Note>
      </main>
      <footer className="sticky bottom-0 mx-auto flex max-w-[640px] flex-col gap-2.5 border-t border-line bg-surface px-6 pt-3.5 pb-[max(20px,env(safe-area-inset-bottom))] lg:hidden">{controls}</footer>
    </div>
  )
}
