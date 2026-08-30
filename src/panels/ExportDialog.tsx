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
      className="fade-in fixed inset-0 z-50 grid place-items-center bg-black/70 p-8 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Export configuration"
    >
      <div
        className="scale-in glass flex h-[76vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-2.5 border-b border-line px-3.5 py-3">
          <div className="flex items-center gap-1 rounded-lg bg-white/[0.05] p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setFormat(t.key)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150',
                  format === t.key
                    ? 'bg-white/[0.09] text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.07)]'
                    : 'text-faint hover:text-muted',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <span className="num ml-1 text-[12px] text-faint">{filename}</span>

          <div className="ml-auto flex items-center gap-2">
            <Btn
              size="sm"
              onClick={copy}
              icon={copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Btn>
            <Btn
              variant="bare"
              size="sm"
              className="w-[30px] px-0"
              onClick={onClose}
              aria-label="Close"
              icon={<CloseIcon className="h-4 w-4" />}
            />
          </div>
        </header>

        <div className="border-b border-line bg-warn/[0.07] px-5 py-2 text-[11.5px] text-warn/90">
          A structural starting point generated from the canvas — not apply-ready.
        </div>

        <pre className="scroll min-h-0 flex-1 overflow-auto bg-black/25 px-5 py-4 font-mono text-[12.5px] leading-[1.7] text-fg">
          {body}
        </pre>
      </div>
    </div>
  );
}
