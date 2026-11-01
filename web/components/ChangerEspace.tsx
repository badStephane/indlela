"use client";

import { useRouter } from "next/navigation";
import { cx } from "./ui";
import { ROLE_LABELS } from "@/lib/admin";
import { ROLE_HOME, useStore, type Role } from "@/lib/store";

interface ChangerEspaceProps {
  /** Appelé après le changement, par exemple pour fermer le menu du compte. */
  onChange?: () => void;
  compact?: boolean;
}

/** Espaces d'un compte qui cumule plusieurs rôles (ex. admin et responsable progression). */
export function ChangerEspace({ onChange, compact = false }: ChangerEspaceProps) {
  const store = useStore();
  const router = useRouter();
  const roles = store.moi?.roles ?? [];
  if (roles.length < 2) return null;

  const ouvrir = (r: Role) => {
    store.changerEspace(r);
    onChange?.();
    router.push(ROLE_HOME[r]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className={cx("font-semibold text-muted", compact ? "px-1 text-[12px]" : "text-[13px]")}>Espace</span>
      <div className="flex flex-col gap-1" role="group" aria-label="Changer d'espace">
        {roles.map((r) => {
          const on = r === store.role;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              onClick={() => !on && ouvrir(r)}
              className={cx(
                "flex items-center gap-2.5 rounded-ui border text-left font-bold",
                compact ? "h-9 px-2.5 text-[13px]" : "h-11 px-3 text-[15px]",
                on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:bg-paper",
              )}
            >
              <span aria-hidden className={cx("h-[7px] w-[7px] flex-none rounded-full", on ? "bg-sun" : "bg-line-strong")} />
              {ROLE_LABELS[r]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
