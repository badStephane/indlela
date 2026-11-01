"use client";

import { useState } from "react";
import { fieldClass } from "@/components/Sheet";
import { useStore } from "@/lib/store";
import { motDePasseValide } from "@/lib/auth";
import { changerMotDePasse, retirerSecondFacteur } from "@/lib/comptesServeur";
import type { Compte } from "@/lib/admin";

/** Accès d'un compte, côté serveur : nouveau mot de passe, second facteur d'un téléphone perdu. */
export function AccesCompte({ c }: { c: Compte }) {
  const store = useStore();
  const [mdp, setMdp] = useState("");
  const [busy, setBusy] = useState(false);
  const valide = motDePasseValide(mdp);

  const nouveauMotDePasse = async () => {
    if (!valide || busy) return;
    setBusy(true);
    const r = await changerMotDePasse(c.id, mdp);
    setBusy(false);
    if (!r.ok) return store.showToast(r.erreur);
    setMdp("");
    store.showToast(`Mot de passe de ${c.nom} changé · à lui remettre en main propre`);
  };

  const retirerFacteur = async () => {
    if (busy) return;
    setBusy(true);
    const r = await retirerSecondFacteur(c.id);
    setBusy(false);
    store.showToast(r.ok ? `${c.nom} associera une nouvelle application d'authentification à sa prochaine connexion` : r.erreur);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold">Accès</span>
      <div className="flex gap-2">
        <input
          type="text"
          value={mdp}
          onChange={(e) => setMdp(e.target.value)}
          placeholder="Nouveau mot de passe"
          autoComplete="new-password"
          aria-label={`Nouveau mot de passe pour ${c.nom}`}
          className={`${fieldClass} min-w-0 flex-1 text-[15px]`}
        />
        <button
          type="button"
          disabled={!valide || busy}
          onClick={nouveauMotDePasse}
          className="h-12 rounded-ui bg-acc px-4 text-[14px] font-bold text-acc-ink disabled:bg-track disabled:text-muted"
        >
          Changer
        </button>
      </div>
      <span className="text-[12px] text-muted">10 caractères au moins, avec des lettres et des chiffres. Remettez-le en main propre.</span>
      {c.deuxFA && (
        <button type="button" disabled={busy} onClick={retirerFacteur} className="self-start text-[13px] font-semibold text-acc-text underline underline-offset-2">
          Téléphone perdu : retirer le second facteur
        </button>
      )}
    </div>
  );
}
