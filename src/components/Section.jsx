import { T, fontHead, fontMono } from '../utils/theme';

export default function Section({ title, subtitle, children, right }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
        <div>
          <div style={{
            fontFamily: fontMono, fontSize: 10, letterSpacing: '0.2em',
            color: T.textDim, textTransform: 'uppercase', marginBottom: 4,
          }}>
            {subtitle}
          </div>
          <div style={{
            fontFamily: fontHead, fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em',
          }}>
            {title}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
