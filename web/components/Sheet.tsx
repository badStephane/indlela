"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE = "button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])";

/**
 * Feuille posée au-dessus de l'écran courant : en bas sur téléphone, centrée sur ordinateur.
 * Le focus va sur le premier élément de la feuille, Échap ferme, et le focus revient où il était.
 */
export function Sheet({ title, onClose, children, alert = false }: { title: string; onClose: () => void; children: ReactNode; alert?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="no-print absolute inset-0 z-[5] flex items-end bg-[rgba(15,18,16,.45)] lg:items-center lg:justify-center lg:p-6" onClick={onClose}>
      <div
        ref={panel}
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88%] w-full flex-col gap-3 overflow-y-auto rounded-t-sheet bg-surface px-[18px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5 lg:max-w-[440px] lg:rounded-sheet lg:px-6 lg:pb-6"
      >
        <span id={titleId} className="text-[19px] font-extrabold">
          {title}
        </span>
        {children}
      </div>
    </div>
  );
}

export function SheetActions({ children }: { children: ReactNode }) {
  return <div className="mt-1 grid grid-cols-2 gap-2">{children}</div>;
}

export const sheetBtn = {
  ghost: "h-[50px] rounded-ui border border-line-strong bg-transparent text-[15px] font-bold text-ink",
  primary: "h-[50px] rounded-ui bg-acc text-[15px] font-bold text-acc-ink disabled:cursor-default disabled:bg-track disabled:text-muted",
  danger: "h-[50px] rounded-ui bg-danger text-[15px] font-bold text-white disabled:cursor-default disabled:bg-track disabled:text-muted",
};

export const fieldClass =
  "h-12 rounded-ui border border-line-strong bg-surface px-3.5 text-[16px] font-normal text-ink outline-none focus:border-ink";

/** Contrôle segmenté, comme les onglets de branche des référentiels. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; dot?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="grid gap-1 rounded-ui bg-track p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`flex h-10 min-w-0 items-center justify-center gap-1.5 truncate rounded-ui px-1 text-[14px] font-bold ${
              on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.1)]" : "bg-transparent text-muted"
            }`}
          >
            {o.dot && <span className="h-2 w-2 flex-none rounded-full" style={{ background: o.dot }} />}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
