import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Severity } from '../model/analysis';

export function Panel({
  title,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={clsx(
        'flex min-h-0 flex-col rounded-lg border border-[var(--duet-border)] bg-[var(--duet-panel)]',
        className,
      )}
    >
      {title != null && (
        <header className="flex items-center justify-between gap-2 border-b border-[var(--duet-border)] px-3 py-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--duet-text-dim)]">
            {title}
          </h2>
          {right}
        </header>
      )}
      <div className={clsx('duet-scroll min-h-0 flex-1 overflow-auto', bodyClassName)}>{children}</div>
    </section>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'agent' | 'danger';
  size?: 'sm' | 'md';
};

export function Btn({ variant = 'ghost', size = 'md', className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-[13px]',
        variant === 'primary' &&
          'border-transparent bg-[var(--duet-accent)] text-[#08101f] hover:brightness-110',
        variant === 'agent' &&
          'border-transparent bg-[var(--duet-agent)] text-[#160b27] hover:brightness-110',
        variant === 'danger' &&
          'border-transparent bg-[var(--duet-danger)] text-[#2a0b0b] hover:brightness-110',
        variant === 'ghost' &&
          'border-[var(--duet-border)] bg-[var(--duet-panel-2)] text-[var(--duet-text)] hover:border-[#39445c]',
        className,
      )}
    />
  );
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'agent' | 'ok' | 'warn' | 'danger';
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        tone === 'neutral' && 'bg-[var(--duet-panel-2)] text-[var(--duet-text-dim)]',
        tone === 'accent' && 'bg-[#6ea8fe22] text-[var(--duet-accent)]',
        tone === 'agent' && 'bg-[#c8a2ff22] text-[var(--duet-agent)]',
        tone === 'ok' && 'bg-[#7ee7c722] text-[var(--duet-ok)]',
        tone === 'warn' && 'bg-[#ffcf6e22] text-[var(--duet-warn)]',
        tone === 'danger' && 'bg-[#ff8f8f22] text-[var(--duet-danger)]',
      )}
    >
      {children}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  const color =
    severity === 'high'
      ? 'var(--duet-danger)'
      : severity === 'medium'
        ? 'var(--duet-warn)'
        : 'var(--duet-text-dim)';
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: color }}
      title={severity}
    />
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-6 text-center text-[12px] leading-relaxed text-[var(--duet-text-dim)]">
      {children}
    </div>
  );
}
