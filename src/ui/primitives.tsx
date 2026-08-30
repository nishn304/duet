import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Severity } from '../model/analysis';
import { KIND_ICON } from './icons';
import { kindMeta } from '../model/catalog';
import type { NodeKind } from '../model/types';

/* ------------------------------------------------------------------ button */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'agent' | 'danger' | 'bare';
  size?: 'xs' | 'sm' | 'md';
  icon?: ReactNode;
};

export function Btn({ variant = 'ghost', size = 'md', icon, className, children, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-150',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35',
        size === 'xs' && 'h-6 px-2 text-[11.5px]',
        size === 'sm' && 'h-7 px-2.5 text-[12px]',
        size === 'md' && 'h-8 px-3 text-[12.5px]',
        variant === 'primary' &&
          'bg-accent text-[#04070f] shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_2px_10px_-2px_var(--color-accent)] hover:brightness-112',
        variant === 'agent' &&
          'bg-agent text-[#0f0518] shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_2px_10px_-2px_var(--color-agent)] hover:brightness-112',
        variant === 'danger' &&
          'border border-danger/25 bg-danger/12 text-danger hover:border-danger/45 hover:bg-danger/20',
        variant === 'ghost' &&
          'border border-line bg-raised text-fg shadow-[0_1px_0_rgb(255_255_255/0.035)_inset] hover:border-line-strong hover:bg-float',
        variant === 'bare' && 'text-muted hover:bg-float hover:text-fg',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- pill */

const PILL_TONE = {
  neutral: 'bg-white/6 text-muted',
  accent: 'bg-accent/14 text-accent',
  agent: 'bg-agent/16 text-agent',
  ok: 'bg-ok/14 text-ok',
  warn: 'bg-warn/14 text-warn',
  danger: 'bg-danger/14 text-danger',
} as const;

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof PILL_TONE;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10.5px] font-semibold',
        PILL_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- kind chip */

/** The rounded, tinted icon square that identifies a component kind. */
export function KindChip({ kind, size = 22 }: { kind: NodeKind; size?: number }) {
  const meta = kindMeta(kind);
  const Icon = KIND_ICON[kind];
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[7px]"
      style={{
        width: size,
        height: size,
        color: meta.accent,
        background: `color-mix(in oklab, ${meta.accent} 15%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${meta.accent} 22%, transparent)`,
      }}
    >
      <Icon className="h-[58%] w-[58%]" />
    </span>
  );
}

/* ---------------------------------------------------------------- severity */

const SEV_COLOR: Record<Severity, string> = {
  high: 'var(--color-danger)',
  medium: 'var(--color-warn)',
  low: 'var(--color-faint)',
};

export function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <span
      className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
      style={{
        background: SEV_COLOR[severity],
        boxShadow: `0 0 8px -1px ${SEV_COLOR[severity]}`,
      }}
      title={severity}
    />
  );
}

export const severityColor = (s: Severity) => SEV_COLOR[s];

/* ------------------------------------------------------------------ layout */

export function Empty({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-5 py-9 text-center">
      {icon && <div className="text-faint/60">{icon}</div>}
      <p className="max-w-[26ch] text-[12px] leading-[1.6] text-faint">{children}</p>
    </div>
  );
}

export function Section({ label, right }: { label: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3.5 pb-1.5 pt-3">
      <span className="eyebrow">{label}</span>
      {right}
    </div>
  );
}
