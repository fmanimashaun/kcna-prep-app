import Section from './Section';
import Card from './Card';
import { T, fontHead, fontMono } from '../utils/theme';
import LANDSCAPE from '../data/landscape.json';

// Pattern-matching hints: each entry is [badge color, badge label, text explanation]
const MEMORY_AIDS = [
  [T.primary, 'METRICS',      'Prometheus. Pull-based. PromQL. Alertmanager.'],
  [T.primary, 'LOGS',         'Fluentd, Fluent Bit, Loki.'],
  [T.primary, 'TRACES',       'Jaeger. Zipkin. Tempo.'],
  [T.primary, 'ALL THREE',    'OpenTelemetry (instrumentation only, not backend).'],
  [T.accent,  'GITOPS',       'Argo CD, Flux.'],
  [T.accent,  'PIPELINES',    'Tekton, Jenkins X, Argo Workflows.'],
  [T.accent,  'PACKAGE MGMT', 'Helm (templated). Kustomize (overlay, no templates).'],
  [T.correct, 'SERVICE MESH', 'Istio, Linkerd. Envoy is the data plane under the hood.'],
  [T.correct, 'SERVERLESS',   'Knative, OpenFaaS. CloudEvents = spec.'],
  ['#C96868', 'SECURITY',     'Falco (runtime), OPA (policy), SPIFFE/SPIRE (identity), Notary/TUF (image trust).'],
  [T.accent,  'STORAGE ORCH', 'Rook (Ceph operator). Longhorn (block). OpenEBS (container-attached).'],
];

export default function Landscape() {
  return (
    <div className="anim-in">
      <Section subtitle="Reference" title="CNCF Landscape, organized">
        <div style={{
          fontSize: 14, color: T.textMuted, marginBottom: 20, lineHeight: 1.6, maxWidth: 680,
        }}>
          On exam day, the single most valuable piece of knowledge is which CNCF project lives in
          which category. Work through this grid until the categorization feels automatic. Start
          from a project name and say its category out loud.
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {LANDSCAPE.map(group => (
            <div
              key={group.cat}
              style={{
                background: T.bgCard,
                border: `1px solid ${T.border}`,
                borderTop: `3px solid ${group.color}`,
                borderRadius: 2,
                padding: 18,
              }}
            >
              <div style={{
                fontFamily: fontHead, fontSize: 15, fontWeight: 600,
                color: group.color, marginBottom: 4,
              }}>
                {group.cat}
              </div>
              <div style={{
                fontFamily: fontMono, fontSize: 10, color: T.textDim,
                letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14,
              }}>
                {group.items.length} projects
              </div>
              <div className="flex flex-col gap-3">
                {group.items.map(item => (
                  <div key={item.n}>
                    <div style={{ fontFamily: fontMono, fontSize: 13, fontWeight: 600, color: T.text }}>
                      {item.n}
                    </div>
                    <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, marginTop: 2 }}>
                      {item.d}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section subtitle="Memory aids" title="Fast pattern matching">
        <Card>
          <div style={{ fontSize: 14, lineHeight: 1.9, color: T.text }}>
            {MEMORY_AIDS.map(([color, label, text]) => (
              <div key={label}>
                <span style={{ color, fontFamily: fontMono, fontSize: 12, fontWeight: 600 }}>
                  {label}
                </span>{' '}
                → {text}
              </div>
            ))}
          </div>
        </Card>
      </Section>
    </div>
  );
}
