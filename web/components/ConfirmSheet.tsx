"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ConfirmSheetProps {
  title: string;
  children: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Feuille de confirmation (en bas sur téléphone, centrée sur ordinateur).
 * Le focus va sur le choix prudent, Échap ferme, et le focus revient où il était.
 */
export function ConfirmSheet({ title, children, cancelLabel, confirmLabel, onCancel, onConfirm }: ConfirmSheetProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="no-print absolute inset-0 z-[5] flex items-end bg-[rgba(15,18,16,.45)] lg:items-center lg:justify-center lg:p-6" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full flex-col gap-3 rounded-t-sheet bg-surface px-[18px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5 lg:max-w-[440px] lg:rounded-sheet lg:px-6 lg:pb-6"
      >
        <span id="sheet-title" className="text-[19px] font-extrabold">
          {title}
        </span>
        {children}
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className="h-[50px] rounded-ui border border-line-strong bg-transparent text-[15px] font-bold text-ink">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className="h-[50px] rounded-ui bg-danger text-[15px] font-bold text-white">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
