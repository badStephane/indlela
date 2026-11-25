"use client";

import { ROLE_LABELS } from "@/lib/admin";
import { useStore } from "@/lib/store";
import { ChangerEspace } from "./ChangerEspace";
import { Sheet, sheetBtn } from "./Sheet";

/** Menu du compte : qui est connecté, changement d'espace, déconnexion. */
export function MenuCompte({ onClose, onQuit }: { onClose: () => void; onQuit: () => void }) {
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
