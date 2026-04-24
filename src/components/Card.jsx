import { T } from '../utils/theme';

export default function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: 2,
        padding: 20,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
