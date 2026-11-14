import Button from '../../components/ui/Button'
import Note from '../../components/ui/Note'
import { SCREEN } from '../../constants/screens'
import { CATEGORIES, DIRECTIONS, KINDS } from '../../constants/limits'
import { useAppNavigation } from '../../hooks/navigationContext'
import { draftChanges } from '../../utils/draftConflict'
import { formatKRW } from '../../utils/format'

function RowValues({ row }) {
  const label = (options, value) => options.find((item) => item.value === value)?.label ?? value
  return <span className="wrap-anywhere">{row.date || '날짜 없음'} · {row.time || '시각 없음'} · {row.merchant || '가맹점 없음'} · {formatKRW(row.amountKrw)} · {label(DIRECTIONS, row.direction)} · {label(KINDS, row.kind)} · {[label(CATEGORIES, row.category), row.subcategory].filter(Boolean).join(' / ')} · {row.included ? '포함' : '제외'}</span>
}

export default function ConfirmationRecovery({ draft, conflict, backups, busy, onReload }) {
  const { navigate } = useAppNavigation()
  if (!conflict && !backups.length) return null
  return <section className="flex flex-col gap-3" aria-label="확정 충돌 확인">
    {conflict ? <Note tone="warn">
      <p role="alert">검토 중 내역이 변경돼 확정을 멈췄어요. 이전 검토 내용은 보관했어요.</p>
      <p className="mt-1">최신 표를 불러온 뒤 달라진 내역과 건수·합계를 다시 확인해 주세요.</p>
      {conflict.refreshError ? <p role="alert" className="mt-1">{conflict.refreshError}</p> : null}
      <Button size="sm" className="mt-2" disabled={busy} onClick={onReload}>{busy ? '최신 표 불러오는 중…' : '최신 표 불러오기'}</Button>
    </Note> : <Note tone="gray">최신 표를 불러왔어요. 달라진 내역을 검토한 뒤 건수와 합계를 다시 확인해 주세요. 이전 값은 아래에서 확인할 수 있어요.</Note>}
    {backups.map((backup, index) => {
      const changes = draftChanges(backup, draft)
      return <details key={index} className="rounded-xl border border-line bg-surface p-3.5">
        <summary className="min-h-11 py-2 text-caption-m">이전 검토 내용 보기{backups.length > 1 ? ` · ${index + 1}` : ''}</summary>
        {changes.length ? <ul className="flex flex-col gap-3">
          {changes.map((change) => <li key={change.id} className="flex flex-col gap-2 rounded-lg bg-canvas p-3 text-caption">
            {change.before ? <p><strong>이전 값: </strong><RowValues row={change.before} /></p> : null}
            {change.current ? <p><strong>현재 값: </strong><RowValues row={change.current} /></p> : <p>서버에서 삭제된 내역이에요. 이전 값은 보관하며 새 거래로 자동 추가하지 않아요.</p>}
            {change.before && change.current ? <Button size="sm" variant="secondary" disabled={busy || Boolean(conflict)}
              onClick={() => navigate(SCREEN.S03_E, { id: change.current.id, restoreDraft: index })}>이전 값으로 다시 수정</Button> : null}
          </li>)}
        </ul> : <p className="text-caption text-ink-2">거래 값은 이전 검토 내용과 같아요. 최신 표를 불러오면 변경된 검토 상태와 중복 후보도 확인할 수 있어요.</p>}
      </details>
    })}
  </section>
}
