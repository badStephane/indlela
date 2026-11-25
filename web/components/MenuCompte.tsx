"use client";

import { ROLE_LABELS } from "@/lib/admin";
import { useStore } from "@/lib/store";
import { ChangerEspace } from "./ChangerEspace";
import { TitreSection } from "./carte";
import { Sheet, sheetBtn } from "./Sheet";

interface MenuCompteProps {
  /** Écrans qui n'ont pas de place dans la barre d'onglets du téléphone. */
  ecrans?: { href: string; label: string }[];
  onOpen?: (href: string) => void;
  onClose: () => void;
  onQuit: () => void;
}

/** Menu du compte : qui est connecté, autres écrans, changement d'espace, déconnexion. */
export function MenuCompte({ ecrans = [], onOpen, onClose, onQuit }: MenuCompteProps) {
  const store = useStore();
  const { role, moi } = store;
  return (
    <Sheet title={store.userName} onClose={onClose}>
      <div className="-mt-2 flex flex-col gap-0.5">
        {moi && <span className="font-mono text-[14px]">{moi.identifiant}</span>}
        <span className="text-[14px] text-crayon">
          {store.groupeNom}
          {role && ` · ${ROLE_LABELS[role]}`}
        </span>
      </div>
      {ecrans.length > 0 && onOpen && (
        <nav aria-label="Autres écrans" className="flex flex-col lg:hidden">
          <TitreSection as="h3">Autres écrans</TitreSection>
          {ecrans.map((e) => (
            <button
              key={e.href}
              type="button"
              onClick={() => {
                onClose();
                onOpen(e.href);
              }}
              className="flex min-h-12 items-center justify-between border-b border-ligne bg-transparent text-left text-[17px] text-encre"
            >
              {e.label}
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </nav>
      )}
      <ChangerEspace onChange={onClose} />
      <button
        type="button"
        onClick={() => {
          onClose();
          onQuit();
        }}
        className={`${sheetBtn.ghost} mt-2 w-full`}
      >
        Se déconnecter
      </button>
    </Sheet>
  );
}
