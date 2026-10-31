"use client";

import type { ReactNode } from "react";
import { Sheet, SheetActions, sheetBtn } from "./Sheet";

interface ConfirmSheetProps {
  title: string;
  children: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation d'un geste qui efface ou annule : le choix prudent vient en premier et reçoit le focus. */
export function ConfirmSheet({ title, children, cancelLabel, confirmLabel, onCancel, onConfirm }: ConfirmSheetProps) {
  return (
    <Sheet title={title} onClose={onCancel} alert>
      {children}
      <SheetActions>
        <button type="button" onClick={onCancel} className={sheetBtn.ghost}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} className={sheetBtn.danger}>
          {confirmLabel}
        </button>
      </SheetActions>
    </Sheet>
  );
}
