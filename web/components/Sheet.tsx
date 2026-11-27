"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE = "button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])";

/**
 * Feuille posée au-dessus de l'écran courant : en bas sur téléphone, centrée sur ordinateur, à double cadre.
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
    <div className="no-print absolute inset-0 z-[5] flex items-end bg-[rgba(20,24,20,.5)] p-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:items-center lg:justify-center lg:p-6" onClick={onClose}>
      <div
        ref={panel}
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88%] w-full flex-col gap-3 overflow-y-auto border-[1.5px] border-encre bg-fond p-5 outline outline-1 outline-offset-[3px] outline-encre lg:max-w-[460px] lg:p-6"
      >
        <span id={titleId} className="text-[22px] font-extrabold leading-tight tracking-[-0.3px]">
          {title}
        </span>
        {children}
      </div>
    </div>
  );
}

/** Actions empilées, le choix prudent d'abord ; pleine largeur sur téléphone. */
export function SheetActions({ children }: { children: ReactNode }) {
  return <div className="mt-1 flex flex-col gap-2 lg:items-start">{children}</div>;
}

const sheetBase = "min-h-12 px-4 text-[16px] font-semibold disabled:cursor-default disabled:border-ligne disabled:bg-ligne disabled:text-crayon";

export const sheetBtn = {
  ghost: `${sheetBase} border-[1.5px] border-encre bg-fond text-encre`,
  primary: `${sheetBase} bg-sentier text-white`,
  danger: `${sheetBase} border-[1.5px] border-erreur bg-fond text-erreur`,
};

export const fieldClass =
  "h-12 w-full min-w-0 border-0 border-b-[1.5px] border-encre bg-transparent px-0 text-[17px] font-normal text-encre";

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
    <div role="tablist" aria-label={label} className="grid" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`-ml-[1.5px] flex min-h-11 min-w-0 items-center justify-center gap-1.5 truncate border-[1.5px] border-encre px-1 text-[15px] font-semibold first:ml-0 ${
              on ? "bg-encre text-fond" : "bg-transparent text-encre"
            }`}
          >
            {o.dot && <span aria-hidden="true" className="h-3 w-1.5 flex-none" style={{ background: o.dot }} />}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
