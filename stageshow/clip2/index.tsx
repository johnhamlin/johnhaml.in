import { CircleX, Moon } from 'lucide-react'
import { Check, Collapse, Roll, Row, Stage, Window, type Act } from '../../.stageshow/kit'
import { Side } from '../clip1'
import '../clip1/clip1.css'
import './clip2.css'

type StepId = 'backup' | 'attempt' | 'rollback' | 'fix' | 'rerun' | 'done'
type Status = 'pending' | 'running' | 'ok' | 'fail'
type Step = {
  id: StepId
  label: string
  detail: string
  start: string
  end: string
  result: 'ok' | 'fail'
  // Planned steps are listed from the start; the rest open in when they first run.
  planned?: true
  // Replaces the detail once the step finishes: the summary, or the error that stopped it.
  after?: string
  diff?: string
}
type S = { steps: Record<StepId, Status>; clock: string }

const STEPS: Step[] = [
  { id: 'backup', label: 'Back up database', detail: 'Snapshot of orders, users, accounts', start: '2:01 AM', end: '2:04 AM', result: 'ok', planned: true },
  { id: 'attempt', label: 'Run migration', detail: 'Attempt 1', start: '2:05 AM', end: '2:31 AM', result: 'fail', planned: true, after: 'permission denied: ALTER on table orders' },
  { id: 'rollback', label: 'Roll back automatically', detail: 'Restored from the 2:04 AM backup', start: '2:32 AM', end: '2:41 AM', result: 'ok' },
  { id: 'fix', label: 'Grant ALTER to migration role', detail: '1 file changed', diff: '+25', start: '4:48 AM', end: '5:20 AM', result: 'ok' },
  { id: 'rerun', label: 'Rerun migration', detail: 'Attempt 2', start: '5:24 AM', end: '6:08 AM', result: 'ok' },
  { id: 'done', label: 'Verify and finish', detail: 'Health checks', after: 'All green, done by 6:12 AM', start: '6:09 AM', end: '6:12 AM', result: 'ok', planned: true },
]

const all = (status: (step: Step) => Status) => Object.fromEntries(STEPS.map((step) => [step.id, status(step)])) as Record<StepId, Status>
const START: S = { steps: all(() => 'pending'), clock: '2:00 AM' }
const POSTER: S = { steps: all((step) => step.result), clock: '6:12 AM' }

const put = (a: Act<S>, id: StepId, status: Status, clock: string) => a.set((s) => ({ steps: { ...s.steps, [id]: status }, clock }))

async function script(a: Act<S>) {
  a.mark('start')
  await a.wait(1000)
  for (const step of STEPS) {
    const fail = step.result === 'fail'
    await put(a, step.id, 'running', step.start)
    await a.wait(fail ? 1300 : 850)
    await put(a, step.id, step.result, step.end)
    await a.wait(fail ? 1400 : 450)
  }
  a.mark('payoff')
  await a.wait(2800)
  // The clock rolling to 2:00 AM is the next night, the reset's visible cause.
  await a.set(START)
  await a.wait(1200)
}

function StepRow({ step, status }: { step: Step; status: Status }) {
  const finished = status === step.result
  return (
    <Row
      className="cf-row nm-row"
      data-status={status}
      lead={
        <span className="nm-mark">
          <Check on={status === 'ok'} pending={status === 'running'} size={16} />
          <CircleX size={18} strokeWidth={2} />
        </span>
      }
      title={step.label}
      subtitle={
        <span className="nm-sub">
          <Roll variant="fade">{(finished && step.after) || step.detail}</Roll>
          {step.diff && <span className="nm-diff">{step.diff}</span>}
        </span>
      }
    >
      <span className="nm-time" data-on={finished || undefined}>{step.end}</span>
    </Row>
  )
}

export default function Clip2() {
  return (
    <Stage<S> width={960} height={540} compact={{ below: 900, width: 540, height: 540 }} initial={START} poster={POSTER} script={script} className="cf nm">
      {(s, _rect, layout) => (
        <Window
          className="cf-win"
          title="Nightly migration"
          sidebarWidth={160}
          sidebar={layout === 'compact' ? undefined : <Side />}
          toolbar={<span className="nm-clock"><Moon size={13} strokeWidth={2} /><Roll align="end">{s.clock}</Roll></span>}
        >
          <div className="cf-list">
            {STEPS.map((step) => (
              <Collapse key={step.id} open={step.planned || s.steps[step.id] !== 'pending'} reveal="drop">
                <StepRow step={step} status={s.steps[step.id]} />
              </Collapse>
            ))}
          </div>
        </Window>
      )}
    </Stage>
  )
}
