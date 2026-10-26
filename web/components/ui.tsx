import type { ReactNode } from "react";

export const mix = (color: string, n: number) => `color-mix(in srgb, ${color} ${n}%, transparent)`;

/** Teintes des segments d'étapes : 40, 60, 80, 100 %. */
export const SEG_SHADES = [40, 60, 80, 100];

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{children}</span>;
}

export function Section({ label, children, gap = "gap-2" }: { label: ReactNode; children: ReactNode; gap?: string }) {
  return (
    <div className={cx("flex flex-col", gap)}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-card border border-line bg-surface", className)}>{children}</div>;
}

/** Liste réglée : rangées séparées par un filet, dans un cadre arrondi. */
export function List({ children }: { children: ReactNode }) {
  return <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface [&>*:last-child]:border-b-0">{children}</div>;
}

export const rowClass = "flex w-full items-center border-b border-rule bg-surface px-3.5 text-left text-inherit";

export function Bar({ value, height = 6, color = "var(--acc)", className }: { value: string; height?: number; color?: string; className?: string }) {
  return (
    <span className={cx("block flex-none overflow-hidden bg-track", className)} style={{ height, borderRadius: height / 2 }}>
      <span className="block h-full" style={{ width: value, background: color, borderRadius: height / 2 }} />
    </span>
  );
}

export interface Seg {
  label: string;
  count: number;
  color: string;
}

/** Barre segmentée « jeunes par étape », largeur proportionnelle à l'effectif. */
export function Segments({ segs, barHeight, labelClass }: { segs: Seg[]; barHeight: number; labelClass: string }) {
  return (
    <div className="flex gap-1">
      {segs.map((g) => (
        <div key={g.label} className="flex min-w-0 flex-col" style={{ flex: `${Math.max(g.count, 1.6)} 1 0`, gap: barHeight === 12 ? 6 : 5 }}>
          <span className="rounded-[6px]" style={{ height: barHeight, background: g.color }} />
          <span className="font-mono text-[13px] font-bold leading-none">{g.count}</span>
          <span className={cx("truncate text-[11px] leading-[1.1]", labelClass)}>{g.label}</span>
        </div>
      ))}
    </div>
  );
}

export function EmptyBox({ children }: { children: ReactNode }) {
  return <div className="rounded-card border border-dashed border-line-strong px-5 py-7 text-[15px] text-muted text-pretty">{children}</div>;
}

export function Chip({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={cx("flex-none rounded-full px-2.5 py-1 text-[12px] font-bold", className)} style={style}>
      {children}
    </span>
  );
}

export function OutlineButton({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cx("rounded-ui border border-line-strong font-semibold text-ink", className)}>
      {children}
    </button>
  );
}
