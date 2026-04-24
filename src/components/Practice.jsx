import { useState } from 'react';
import { Clock, Infinity as InfinityIcon } from 'lucide-react';
import FreePractice from './FreePractice';
import ExamSets from './ExamSets';
import { T, fontBody, fontMono } from '../utils/theme';

const MODES = [
  { id: 'exam', label: 'Exam sets (timed)', icon: Clock },
  { id: 'free', label: 'Free practice (untimed)', icon: InfinityIcon },
];

export default function Practice({ progress, updateQuestion, addExamRun }) {
  const [mode, setMode] = useState('exam');

  return (
    <div className="anim-in">
      <div
        className="flex flex-wrap gap-1 mb-5"
        style={{
          borderBottom: `1px solid ${T.border}`,
          paddingBottom: 0,
        }}
      >
        {MODES.map(({ id, label, icon: Icon }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              onClick={() => setMode(id)}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                color: active ? T.text : T.textMuted,
                border: 'none',
                borderBottom: `2px solid ${active ? T.primary : 'transparent'}`,
                cursor: 'pointer',
                fontFamily: fontBody,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: -1,
              }}
            >
              <Icon size={14} strokeWidth={1.8} />
              {label}
            </button>
          );
        })}
      </div>

      {mode === 'exam' && (
        <ExamSets
          progress={progress}
          addExamRun={addExamRun}
          updateQuestion={updateQuestion}
        />
      )}
      {mode === 'free' && (
        <FreePractice
          progress={progress}
          updateQuestion={updateQuestion}
        />
      )}
    </div>
  );
}
