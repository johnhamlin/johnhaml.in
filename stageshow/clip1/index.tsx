import { GitPullRequest, ShieldAlert } from 'lucide-react'
import { Badge, Bar, Check, Collapse, Roll, Row, Spinner, Stage, Window, type Act } from '../../.stageshow/kit'
import './clip1.css'

type Reviewer = 'EM' | 'Automated review' | 'Security'
type Review = 'pending' | 'running' | 'pass' | 'flag'
type Status = 'open' | 'reviewing' | 'merged' | 'waiting'
type Pr = { title: string; risky?: boolean }
type Run = { opened: boolean; status: Status; reviews: Record<Reviewer, Review> }
type S = { runs: Run[] }

const REVIEWERS: Reviewer[] = ['EM', 'Automated review', 'Security']
const PRS: Pr[] = [
  { title: 'Fix invoice timezones' },
  { title: 'Retry webhook sends' },
  { title: 'Rotate signing keys', risky: true },
]
const RISKY = PRS.findIndex((p) => p.risky)
const verdict = (pr: Pr, who: Reviewer): Review => (pr.risky && who === 'Security' ? 'flag' : 'pass')
const outcome = (pr: Pr): Status => (pr.risky ? 'waiting' : 'merged')
const BADGE: Record<Status, { tone: 'neutral' | 'success' | 'warning'; label: string }> = {
  open: { tone: 'neutral', label: 'Open' },
  reviewing: { tone: 'neutral', label: 'Reviewing' },
  merged: { tone: 'success', label: 'Merged' },
  waiting: { tone: 'warning', label: 'Waiting for John' },
}

const fresh = (): Run => ({ opened: false, status: 'open', reviews: { EM: 'pending', 'Automated review': 'pending', Security: 'pending' } })
const START: S = { runs: PRS.map(fresh) }
const done = (pr: Pr): Run => ({ opened: true, status: outcome(pr), reviews: { EM: verdict(pr, 'EM'), 'Automated review': verdict(pr, 'Automated review'), Security: verdict(pr, 'Security') } })
const POSTER: S = { runs: PRS.map(done) }
const LANDED: Run = done({ title: '' })

const update = (a: Act<S>, i: number, patch: (r: Run) => Partial<Run>) =>
  a.set((s) => ({ runs: s.runs.map((r, j) => (j === i ? { ...r, ...patch(r) } : r)) }))
const review = (a: Act<S>, i: number, who: Reviewer, v: Review) => update(a, i, (r) => ({ reviews: { ...r.reviews, [who]: v } }))

async function ship(a: Act<S>, i: number) {
  const pr = PRS[i]!
  await update(a, i, () => ({ opened: true }))
  await a.wait(700)
  await update(a, i, () => ({ status: 'reviewing' }))
  await a.stagger(REVIEWERS, (who) => review(a, i, who, 'running'), 160)
  await a.wait(700)
  await a.stagger(REVIEWERS, async (who) => review(a, i, who, verdict(pr, who)), 380)
  await a.wait(600)
  await update(a, i, () => ({ status: outcome(pr) }))
}

const REST = { wide: { x: 1000, y: 620 }, compact: { x: 590, y: 620 } }

async function script(a: Act<S>) {
  a.mark('start')
  await a.wait(900)
  a.mark('first')
  void ship(a, 0)
  await a.wait(1700)
  void ship(a, 1)
  await a.wait(1700)
  a.mark('risky')
  await ship(a, RISKY)
  a.mark('waiting')
  await a.wait(500)
  await a.move({ at: `review-${RISKY}`, x: 0.8, y: 0.65 }, { duration: 1100 })
  a.mark('payoff')
  await a.wait(2200)
  void a.move(REST[a.layout], { duration: 900 })
  await a.wait(250)
  await a.stagger([2, 1, 0], (i) => update(a, i, () => ({ opened: false })), 70)
  await a.wait(900)
  await a.snap(START)
}

function Verdict({ who, v }: { who: Reviewer; v: Review }) {
  return (
    <span className="cf-verdict" data-v={v}>
      <span className="cf-mark">
        <Check on={v === 'pass'} pending={v === 'running'} size={12} />
        <ShieldAlert size={13} strokeWidth={2} />
      </span>
      {who}
    </span>
  )
}

function PrRow({ i, title, run, compact }: { i: number; title: string; run: Run; compact: boolean }) {
  const b = BADGE[run.status]
  const verdicts = <span className="cf-verdicts">{REVIEWERS.map((who) => <Verdict key={who} who={who} v={run.reviews[who]} />)}</span>
  return (
    <Row
      className="cf-row"
      data-status={run.status}
      lead={<GitPullRequest size={16} strokeWidth={2} className="cf-lead" />}
      title={title}
      subtitle={
        <span className="cf-sub">
          <span className="cf-author">engineer-bot</span>
          {compact && verdicts}
        </span>
      }
    >
      <span className="cf-trail">
        {!compact && verdicts}
        <Badge tone={b.tone} className="cf-badge" icon={<span className="cf-dot"><Spinner size={8} /><i /></span>}>
          <Roll variant="fade">{b.label}</Roll>
        </Badge>
        <span className="cf-review" data-target={`review-${i}`} data-cursor="pointer" data-on={run.status === 'waiting' || undefined}>Review</span>
      </span>
    </Row>
  )
}

const FILLER = [150, 120, 172, 136, 128, 160, 112]

export default function Clip1() {
  return (
    <Stage<S> width={960} height={540} compact={{ below: 900, width: 540, height: 540 }} initial={START} poster={POSTER} script={script} cursor={{ at: REST }} className="cf">
      {(s, _rect, layout) => (
        <Window className="cf-win" title="Pull requests" sidebarWidth={160} sidebar={layout === 'compact' ? undefined : <Side />}>
          <div className="cf-list">
            {[...PRS.keys()].reverse().map((i) => (
              <Collapse key={i} open={s.runs[i]!.opened} reveal="drop">
                <PrRow i={i} title={PRS[i]!.title} run={s.runs[i]!} compact={layout === 'compact'} />
              </Collapse>
            ))}
            <PrRow i={-1} title="Update onboarding copy" run={LANDED} compact={layout === 'compact'} />
            {FILLER.map((w, i) => (
              <Row key={i} className="cf-row" lead={<Bar w={16} h={16} r={8} tone={2} />} title={<Bar w={w} h={7} tone={3} />} subtitle={<Bar w={w * 0.7} h={6} tone={2} />}>
                <span className="cf-trail">
                  {layout === 'wide' && <Bar w={w * 0.9} h={6} tone={2} />}
                  <Bar w={58} h={22} r={11} tone={1} />
                </span>
              </Row>
            ))}
          </div>
        </Window>
      )}
    </Stage>
  )
}

export function Side() {
  return (
    <nav className="cf-side">
      {[72, 96, 64, 84, 68].map((w, i) => (
        <span key={i} className="cf-nav" data-active={i === 1 || undefined}>
          <Bar w={12} h={12} r={3} tone={i === 1 ? 4 : 2} />
          <Bar w={w} h={6} tone={i === 1 ? 4 : 2} />
        </span>
      ))}
    </nav>
  )
}
