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

export function Btn({
  variant = 'ghost',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap',
        'transition-all duration-150 ease-out',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-30',
        size === 'xs' && 'h-[26px] px-2 text-[12px]',
        size === 'sm' && 'h-[30px] px-3 text-[12.5px]',
        size === 'md' && 'h-[34px] px-3.5 text-[13px]',
        variant === 'primary' &&
          'bg-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.24),0_2px_14px_-3px_var(--color-accent)] hover:brightness-110',
        variant === 'agent' &&
          'bg-agent text-[#1a0426] shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_2px_14px_-3px_var(--color-agent)] hover:brightness-110',
        variant === 'danger' && 'bg-danger/12 text-danger hover:bg-danger/20',
        variant === 'ghost' &&
          'bg-white/[0.055] text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.05)] hover:bg-white/[0.1]',
        variant === 'bare' && 'text-muted hover:bg-white/[0.07] hover:text-fg',
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
  neutral: 'bg-white/[0.07] text-muted',
  accent: 'bg-accent/15 text-accent',
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        PILL_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- kind chip */

/** The tinted, rounded icon square that identifies a component kind. */
export function KindChip({ kind, size = 26 }: { kind: NodeKind; size?: number }) {
  const meta = kindMeta(kind);
  const Icon = KIND_ICON[kind];
  return (
    <span
      className="grid shrink-0 place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.34),
        color: meta.accent,
        background: `color-mix(in oklab, ${meta.accent} 16%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${meta.accent} 26%, transparent)`,
      }}
    >
      <Icon className="h-[55%] w-[55%]" />
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
      style={{ background: SEV_COLOR[severity], boxShadow: `0 0 10px -1px ${SEV_COLOR[severity]}` }}
      title={severity}
    />
  );
}

export const severityColor = (s: Severity) => SEV_COLOR[s];

/* ------------------------------------------------------------------ layout */

export function Empty({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="fade-in flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && (
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05] text-faint">
          {icon}
        </span>
      )}
      <p className="max-w-[28ch] text-[12.5px] leading-[1.65] text-faint">{children}</p>
    </div>
  );
}
