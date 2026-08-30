import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { compile, type IacFormat } from '../model/iac';
import { useDuet } from '../model/store';
import { Btn } from '../ui/primitives';
import { CheckIcon, CloseIcon, CopyIcon } from '../ui/icons';

const TABS: Array<{ key: IacFormat; label: string }> = [
  { key: 'compose', label: 'docker-compose' },
  { key: 'terraform', label: 'Terraform' },
];

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const design = useDuet((s) => s.design);
  const [format, setFormat] = useState<IacFormat>('compose');
  const [copied, setCopied] = useState(false);
  const { filename, body } = useMemo(() => compile(design, format), [design, format]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the text is still selectable */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Export configuration"
    >
      <div
        className="scale-in card flex h-[74vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5">
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-canvas p-0.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setFormat(t.key)}
                className={clsx(
                  'rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
                  format === t.key
                    ? 'bg-float text-fg shadow-[0_1px_0_rgb(255_255_255/0.05)_inset]'
                    : 'text-faint hover:text-muted',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <span className="num ml-1 text-[11.5px] text-faint">{filename}</span>

          <div className="ml-auto flex items-center gap-1.5">
            <Btn
              size="sm"
              onClick={copy}
              icon={
                copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />
              }
            >
              {copied ? 'Copied' : 'Copy'}
            </Btn>
            <Btn
              variant="bare"
              size="sm"
              onClick={onClose}
              aria-label="Close"
              icon={<CloseIcon className="h-3.5 w-3.5" />}
            />
          </div>
        </header>

        <div className="border-b border-line bg-warn/[0.06] px-4 py-1.5 text-[11px] text-warn/90">
          A structural starting point generated from the canvas — not apply-ready.
        </div>

        <pre className="scroll min-h-0 flex-1 overflow-auto bg-canvas px-4 py-3 font-mono text-[12px] leading-[1.65] text-fg selection:bg-accent/30">
          {body}
        </pre>
      </div>
    </div>
  );
}
