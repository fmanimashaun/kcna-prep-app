import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Shared modal shell.
// - Renders into document.body so its z-index isn't trapped inside any
//   stacking context (the App's content wrapper has z-index 2; nested
//   modals would otherwise sit behind the sticky header).
// - Locks <body> scroll while open so the page underneath can't move.
// - Closes on backdrop click and ESC.
//
// Children are the content card (the modal itself supplies the dim
// backdrop and centering). Use any width on your children directly.
export default function Modal({
  open,
  onClose,
  children,
  dim = 'rgba(0,0,0,0.7)',
  zIndex = 100,
  closeOnBackdrop = true,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open || !onClose) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Two-layer trick: the OUTER fixed div is the scroll container, the INNER
  // div is a flex layout with min-height:100% so short content centers but
  // tall content grows past the viewport instead of having its top clipped
  // by `align-items: center`.
  return createPortal(
    <div
      onClick={closeOnBackdrop ? onClose : undefined}
      style={{
        position: 'fixed', inset: 0, background: dim,
        zIndex,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          boxSizing: 'border-box',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
