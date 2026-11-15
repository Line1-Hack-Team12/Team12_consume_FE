const rowKey = (row) => String(row.serverId ?? row.id)
const sortById = (items) => items.sort((a, b) => a.id.localeCompare(b.id))

function rowContent(row) {
  return {
    id: rowKey(row), date: row.date ?? '', time: row.time || null, merchant: row.merchant ?? '',
    amountKrw: row.amountKrw, direction: row.direction, kind: row.kind, category: row.category,
    subcategory: row.subcategory ?? null, slotMonth: row.slotMonth ?? '', included: row.included,
    reviewReasons: [...(row.reviewReasons ?? [])].filter((reason) => reason !== 'server_changed').sort(),
  }
}

function groupContent(group) {
  return { id: String(group.serverGroupId ?? group.id), memberIds: group.memberIds.map(String).sort(),
    representativeId: String(group.representativeId), slotMonth: group.slotMonth ?? '', decision: group.decision }
}

const sameRow = (a, b) => JSON.stringify(rowContent(a)) === JSON.stringify(rowContent(b))

// 로컬 검토 완료 표시·정렬·증가시킨 revision을 서버의 동시 수정으로 오인하지 않는다.
export function sameReviewDraft(a, b) {
  const content = (draft) => JSON.stringify({
    transactions: sortById(draft.transactions.map(rowContent)),
    duplicateGroups: sortById(draft.duplicateGroups.map(groupContent)),
  })
  return content(a) === content(b)
}

export function draftChanges(previous, latest) {
  const oldRows = new Map(previous.transactions.map((row) => [rowKey(row), row]))
  const newRows = new Map(latest.transactions.map((row) => [rowKey(row), row]))
  return [...new Set([...oldRows.keys(), ...newRows.keys()])].flatMap((id) => {
    const before = oldRows.get(id)
    const current = newRows.get(id)
    return before && current && sameRow(before, current) ? [] : [{ id, before, current }]
  })
}

export function recoverReviewDraft(previous, latest) {
  const oldRows = new Map(previous.transactions.map((row) => [rowKey(row), row]))
  const oldGroups = new Map(previous.duplicateGroups.map((group) => [String(group.serverGroupId ?? group.id), group]))
  return {
    ...latest,
    transactions: latest.transactions.map((row) => {
      const old = oldRows.get(rowKey(row))
      if (old && sameRow(old, row)) return { ...row, reviewStatus: old.reviewStatus, reviewReasons: old.reviewReasons }
      return { ...row, reviewReasons: [...new Set([...row.reviewReasons, 'server_changed'])], reviewStatus: row.included ? 'pending' : 'excluded' }
    }),
    duplicateGroups: latest.duplicateGroups.map((group) => {
      const old = oldGroups.get(String(group.serverGroupId ?? group.id))
      return old && JSON.stringify(groupContent(old)) === JSON.stringify(groupContent(group)) ? { ...group, reviewed: old.reviewed } : group
    }),
  }
}
