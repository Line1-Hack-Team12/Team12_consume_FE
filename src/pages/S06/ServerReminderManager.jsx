import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sendDemoNotification, updateNotification } from '../../api/analysis'
import { invalidateSessionQueries, notificationsQuery } from '../../api/sessionQueries'
import ScreenLayout from '../../components/layout/ScreenLayout'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Note from '../../components/ui/Note'
import PlanGoalSummary from '../../components/ui/PlanGoalSummary'
import Toggle from '../../components/ui/Toggle'
import { SelectField } from '../../components/ui/Field'
import { REMINDER_TIME_OPTIONS, validateReminderTime } from '../../constants/reminders'
import { REMINDER_DISCLAIMER } from '../../constants/patternResponses'
import { SCREEN } from '../../constants/screens'
import { useAppNavigation } from '../../hooks/navigationContext'
import DemoReminderDialog from './DemoReminderDialog'

export default function ServerReminderManager({ sessionId, snapshotId, planSelection }) {
  const { navigate } = useAppNavigation()
  const client = useQueryClient()
  const options = notificationsQuery(sessionId, snapshotId)
  const query = useQuery(options)
  const rules = query.data?.notifications ?? []
  const loading = query.isPending
  const actionLock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setError] = useState('')
  const error = actionError || query.error?.message || ''
  const [demo, setDemo] = useState(null)
  const update = async (rule, patch) => {
    if (actionLock.current) return
    const message = patch.alertTime ? validateReminderTime(patch.alertTime) : patch.isEnabled ? validateReminderTime(rule.alertTime) : ''
    if (message) { setError(message); return }
    actionLock.current = true
    setBusy(true); setError('')
    try {
      await client.cancelQueries({ queryKey: options.queryKey })
      await updateNotification(rule.notificationId, patch)
      client.setQueryData(options.queryKey, (old) => old ? { ...old, notifications: old.notifications.map((r) => r.notificationId === rule.notificationId ? { ...r, ...patch } : r) } : old)
      await invalidateSessionQueries(client, sessionId, snapshotId, ['notifications', 'completion'])
    } catch (err) { setError(err.message) }
    finally { actionLock.current = false; setBusy(false) }
  }
  const send = async (rule) => {
    if (actionLock.current) return
    actionLock.current = true
    setBusy(true); setError('')
    try { setDemo(await sendDemoNotification(rule.notificationId)) }
    catch (err) { setError(err.message) }
    finally { actionLock.current = false; setBusy(false) }
  }
  return <ScreenLayout title="알림 설정과 관리" onBack={() => navigate(SCREEN.S05)} footer={<>
    <Button disabled={busy || loading} onClick={() => navigate(SCREEN.S10)}>완료</Button>
    <Button variant="secondary" disabled={busy} onClick={() => navigate(SCREEN.S05)}>결과 홈으로</Button>
  </>}>
    {planSelection ? <PlanGoalSummary goalKrw={planSelection.goalKrw} plan={planSelection.plan} /> : null}
    {loading ? <Note>알림 규칙을 불러오고 있어요.</Note> : !rules.length ? <Note>아직 설정된 알림이 없어요. 요일·시각 근거가 있는 습관을 확인해 주세요.</Note> : null}
    {error ? <Note tone="warn"><p role="alert">{error}</p><Button size="sm" variant="secondary" disabled={busy || query.isFetching} onClick={() => { setError(''); query.refetch() }}>다시 확인</Button></Note> : null}
    {rules.map((rule) => <Card key={rule.notificationId} className="flex flex-col gap-3">
      <p className="text-caption text-brand">{rule.sourceLabel} · 인앱 DEMO</p>
      <h2 className="text-heading">{rule.scheduleTitle}</h2>
      <p className="text-caption text-ink-2">요일: {rule.dayCondition} · 날씨: {rule.weatherCondition || '없음'}</p>
      <SelectField label="알림 시각" value={rule.alertTime} disabled={busy} options={REMINDER_TIME_OPTIONS.map((time) => ({ value: time, label: time }))} onChange={(e) => update(rule, { alertTime: e.target.value })} />
      <Toggle label={`${rule.scheduleTitle} 알림`} checked={rule.isEnabled} disabled={busy} onChange={(isEnabled) => update(rule, { isEnabled })} />
      <p className="text-body">{rule.previewMessage}</p>
      <p className="text-micro text-ink-3">{REMINDER_DISCLAIMER}</p>
      <Button variant="secondary" disabled={busy || !rule.isEnabled} onClick={() => send(rule)}>지금 보내보기 · 인앱 데모</Button>
      <Button variant="secondary" disabled={busy || !rule.isEnabled} onClick={() => update(rule, { isEnabled: false })}>이 규칙 해제</Button>
    </Card>)}
    <Note tone="gray">방해금지 22:00~08:00 · 실제 푸시는 보내지 않아요.</Note>
    <DemoReminderDialog open={Boolean(demo)} title={demo?.title} preview={{ message: demo?.body, disclaimer: REMINDER_DISCLAIMER }} onClose={() => setDemo(null)} />
  </ScreenLayout>
}
