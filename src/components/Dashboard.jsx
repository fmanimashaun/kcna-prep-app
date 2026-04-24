import { useMemo } from 'react';
import { RotateCcw, AlertCircle, Clock } from 'lucide-react';
import Section from './Section';
import Card from './Card';
import { T, fontHead, fontMono } from '../utils/theme';
import { daysUntilExam } from '../utils/helpers';
import config from '../data/config.json';
import QUESTIONS from '../data/questions.json';
import FLASHCARDS from '../data/flashcards.json';

const DOMAINS = config.domains;
const PASS_MARK = config.passMark;

function formatRunDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDurationShort(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

const TRAPS = [
  ['Workload confusion', 'Know exactly when to reach for Deployment vs StatefulSet vs DaemonSet vs Job vs CronJob. Common trick: "node-level agent" = DaemonSet, not Deployment.'],
  ['Service type subtleties', 'ClusterIP is internal only. NodePort opens a port on every node. LoadBalancer provisions a cloud LB. ExternalName is just a DNS alias.'],
  ['Autoscaler trio', 'HPA = pod replicas (horizontal). VPA = pod resource requests (vertical). Cluster Autoscaler = node count. Do not mix them up.'],
  ['NetworkPolicy enforcement', 'NetworkPolicy is a K8s resource, but the CNI enforces it. Flannel ignores by default. This is the #1 networking trick question.'],
  ['CNCF project categories', 'Prometheus = metrics, Jaeger = tracing, Fluentd = logs, OpenTelemetry = all three. Know which project lives in which category.'],
  ['Probe purposes', 'Liveness → restart. Readiness → remove from Service endpoints. Startup → gate the other two during slow boots.'],
];

export default function Dashboard({ progress, onReset, user }) {
  const days = daysUntilExam();
  const runs = progress.runs || [];

  const stats = useMemo(() => {
    const byDomain = {};
    Object.keys(DOMAINS).forEach(d => {
      const qs = QUESTIONS.filter(q => q.d === d);
      const fs = FLASHCARDS.filter(f => f.d === d);
      const answered = qs.filter(q => progress.q[q.id]);
      const correct = answered.filter(q => progress.q[q.id].correct);
      const known = fs.filter(f => progress.f[f.id]?.status === 'known');
      byDomain[d] = {
        total: qs.length,
        answered: answered.length,
        correct: correct.length,
        flashTotal: fs.length,
        flashKnown: known.length,
      };
    });
    const totalAnswered = Object.values(byDomain).reduce((s, d) => s + d.answered, 0);
    const totalCorrect  = Object.values(byDomain).reduce((s, d) => s + d.correct, 0);
    const totalFlashKnown = Object.values(byDomain).reduce((s, d) => s + d.flashKnown, 0);
    return { byDomain, totalAnswered, totalCorrect, totalFlashKnown };
  }, [progress]);

  const overallAcc = stats.totalAnswered
    ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
    : 0;

  return (
    <div className="anim-in">
      <Section subtitle="Where you stand" title="Snapshot">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <Card>
            <div style={{ fontFamily: fontMono, fontSize: 10, color: T.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Questions attempted
            </div>
            <div style={{ fontFamily: fontHead, fontSize: 40, fontWeight: 600, color: T.text, lineHeight: 1.1, marginTop: 8 }}>
              {stats.totalAnswered}
              <span style={{ color: T.textDim, fontSize: 22, fontWeight: 400 }}> / {QUESTIONS.length}</span>
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily: fontMono, fontSize: 10, color: T.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Overall accuracy
            </div>
            <div style={{
              fontFamily: fontHead, fontSize: 40, fontWeight: 600,
              color: overallAcc >= PASS_MARK ? T.correct : overallAcc >= 50 ? T.accent : T.text,
              lineHeight: 1.1, marginTop: 8,
            }}>
              {overallAcc}<span style={{ fontSize: 24, color: T.textDim }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 4, fontFamily: fontMono }}>
              pass mark: {PASS_MARK}%
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily: fontMono, fontSize: 10, color: T.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Cards marked known
            </div>
            <div style={{ fontFamily: fontHead, fontSize: 40, fontWeight: 600, color: T.text, lineHeight: 1.1, marginTop: 8 }}>
              {stats.totalFlashKnown}
              <span style={{ color: T.textDim, fontSize: 22, fontWeight: 400 }}> / {FLASHCARDS.length}</span>
            </div>
          </Card>
        </div>
      </Section>

      {runs.length > 0 && (
        <Section subtitle="Timed simulations" title="Exam run history">
          <div className="flex flex-col gap-2">
            {[...runs].reverse().slice(0, 12).map((r, i) => {
              const pct = Math.round((r.score / r.total) * 100);
              const color = pct >= PASS_MARK ? T.correct : pct >= 50 ? T.accent : T.wrong;
              return (
                <div
                  key={`${r.setId}-${r.finishedAt}-${i}`}
                  style={{
                    background: T.bgCard, border: `1px solid ${T.border}`,
                    borderLeft: `3px solid ${color}`,
                    padding: 14, borderRadius: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, flexWrap: 'wrap',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Clock size={16} style={{ color: T.textMuted }} strokeWidth={1.8} />
                    <div>
                      <div style={{ fontFamily: fontHead, fontSize: 15, fontWeight: 500 }}>
                        {r.setName}
                      </div>
                      <div style={{ fontFamily: fontMono, fontSize: 11, color: T.textDim, letterSpacing: '0.05em' }}>
                        {formatRunDate(r.finishedAt)} · {formatDurationShort(r.durationMs)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div style={{ fontFamily: fontHead, fontSize: 22, fontWeight: 600, color, lineHeight: 1 }}>
                      {pct}%
                    </div>
                    <div style={{ fontFamily: fontMono, fontSize: 11, color: T.textDim }}>
                      {r.score}/{r.total}
                    </div>
                  </div>
                </div>
              );
            })}
            {runs.length > 12 && (
              <div style={{
                textAlign: 'center', fontSize: 11, color: T.textDim,
                fontFamily: fontMono, letterSpacing: '0.1em', marginTop: 6,
              }}>
                SHOWING 12 MOST RECENT OF {runs.length}
              </div>
            )}
          </div>
        </Section>
      )}

      <Section subtitle="Domain by domain" title="Accuracy by exam weight">
        <div className="flex flex-col gap-3">
          {Object.entries(DOMAINS).map(([key, dom]) => {
            const s = stats.byDomain[key];
            const acc = s.answered ? Math.round((s.correct / s.answered) * 100) : null;
            return (
              <div key={key} style={{
                background: T.bgCard, border: `1px solid ${T.border}`, padding: 16, borderRadius: 2,
              }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 8, height: 36, background: dom.tone, borderRadius: 1 }}></div>
                    <div>
                      <div style={{ fontFamily: fontHead, fontSize: 17, fontWeight: 500 }}>{dom.name}</div>
                      <div style={{ fontFamily: fontMono, fontSize: 11, color: T.textDim, letterSpacing: '0.1em' }}>
                        {dom.weight}% OF EXAM · {s.total} QUESTIONS · {s.flashTotal} CARDS
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {acc !== null ? (
                      <>
                        <div style={{
                          fontFamily: fontHead, fontSize: 24, fontWeight: 600,
                          color: acc >= PASS_MARK ? T.correct : acc >= 50 ? T.accent : T.wrong, lineHeight: 1,
                        }}>
                          {acc}%
                        </div>
                        <div style={{ fontSize: 11, color: T.textDim, fontFamily: fontMono }}>
                          {s.correct}/{s.answered} correct
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: T.textDim, fontStyle: 'italic' }}>Not started</div>
                    )}
                  </div>
                </div>
                <div style={{ height: 3, background: T.border, marginTop: 12, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(s.answered / s.total) * 100}%`, height: '100%',
                    background: dom.tone, transition: 'width 0.3s',
                  }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section subtitle="The final stretch" title="Strategy">
        <Card>
          <ol style={{ fontSize: 14, lineHeight: 1.7, color: T.text, paddingLeft: 18, margin: 0 }}>
            <li style={{ marginBottom: 10 }}>
              <strong style={{ color: T.primary }}>Days {days} to {Math.max(1, days - 1)}:</strong> Run the full deck of 410 questions.
              Don't grind — read explanations carefully. Note which domains fall below 75%.
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong style={{ color: T.primary }}>Midweek:</strong> Flashcard sweep. Focus on Kubernetes Fundamentals (46% of exam)
              and the CNCF Landscape — that grid of "which project does what" is where most people lose points.
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong style={{ color: T.primary }}>Day -2:</strong> Re-do weak domains. Use "Only previously wrong" to burn down
              your mistakes. Observability + Delivery (16% combined) are high-yield because the concepts are small.
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong style={{ color: T.primary }}>Day before:</strong> Light review only. No cramming. Review the Landscape grid
              once, eat well, sleep properly. 60 questions, 90 minutes — time is not the issue if you know the material.
            </li>
            <li>
              <strong style={{ color: T.primary }}>Exam day:</strong> Read every option. KCNA trades on subtle distinctions
              (DaemonSet vs Deployment, ClusterIP vs NodePort, HPA vs VPA vs CA). Flag uncertain ones and come back.
            </li>
          </ol>
        </Card>
      </Section>

      <Section subtitle="Common traps" title="Where people lose points">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {TRAPS.map(([title, text]) => (
            <Card key={title} style={{ padding: 16 }}>
              <div className="flex items-start gap-3">
                <AlertCircle size={18} style={{ color: T.accent, marginTop: 2, flexShrink: 0 }} strokeWidth={1.5} />
                <div>
                  <div style={{ fontFamily: fontHead, fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                    {title}
                  </div>
                  <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.55 }}>{text}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <div className="flex justify-center mt-8" style={{ marginBottom: 16 }}>
        <button
          onClick={onReset}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            color: T.textDim,
            border: `1px solid ${T.border}`,
            borderRadius: 2,
            cursor: 'pointer',
            fontFamily: fontMono,
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <RotateCcw size={12} /> Reset all progress
        </button>
      </div>
    </div>
  );
}
