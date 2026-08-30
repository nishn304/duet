import { useMemo, useState } from 'react';
import { compile, type IacFormat } from '../model/iac';
import { useDuet } from '../model/store';
import { Btn } from '../ui/primitives';

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const design = useDuet((s) => s.design);
  const [format, setFormat] = useState<IacFormat>('compose');
  const [copied, setCopied] = useState(false);
  const { filename, body } = useMemo(() => compile(design, format), [design, format]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the text is selectable in the box */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-[var(--duet-border)] bg-[var(--duet-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--duet-border)] px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            {(['compose', 'terraform'] as IacFormat[]).map((f) => (
              <Btn
                key={f}
                size="sm"
                variant={format === f ? 'primary' : 'ghost'}
                onClick={() => setFormat(f)}
              >
                {f === 'compose' ? 'docker-compose' : 'Terraform'}
              </Btn>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Btn size="sm" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Btn>
            <Btn size="sm" onClick={onClose}>
              Close
            </Btn>
          </div>
        </header>
        <div className="px-4 pt-2 text-[11px] text-[var(--duet-text-dim)]">
          {filename} — structural starting point, not apply-ready.
        </div>
        <textarea
          readOnly
          value={body}
          className="duet-scroll m-4 mt-2 min-h-0 flex-1 resize-none rounded-lg border border-[var(--duet-border)] bg-[var(--duet-bg)] p-3 font-mono text-[12px] leading-relaxed text-[var(--duet-text)] outline-none"
        />
      </div>
    </div>
  );
}
