"use client";

import { useRouter } from "next/navigation";
import { TitreSection } from "./carte";
import { ROLE_LABELS } from "@/lib/admin";
import { ROLE_HOME, useStore, type Role } from "@/lib/store";

interface ChangerEspaceProps {
  /** Appelé après le changement, par exemple pour fermer le menu du compte. */
  onChange?: () => void;
}

/** Espaces d'un compte qui cumule plusieurs rôles (ex. admin et responsable progression). */
export function ChangerEspace({ onChange }: ChangerEspaceProps) {
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
    <div className="flex flex-col">
      <TitreSection as="h3">Changer d&apos;espace</TitreSection>
      <ul className="m-0 list-none p-0" aria-label="Espaces du compte">
        {roles.map((r) => {
          const on = r === store.role;
          return (
            <li key={r} className="border-b border-ligne">
              {on ? (
                <span aria-current="true" className="flex min-h-12 items-center justify-between gap-3 text-[16px] font-bold">
                  {ROLE_LABELS[r]}
                  <span className="text-[13px] text-crayon">espace actuel</span>
                </span>
              ) : (
                <button type="button" onClick={() => ouvrir(r)} className="flex min-h-12 w-full items-center justify-between gap-3 bg-transparent text-left text-[16px] text-encre">
                  {ROLE_LABELS[r]}
                  <span aria-hidden="true">›</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
