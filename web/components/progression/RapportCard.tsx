"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, cx, OutlineButton } from "../ui";
import { useStore } from "@/lib/store";
import { anneeDepuis, anneeScoute, GRANULARITES, type Granularite } from "@/lib/rapport";
import { construireRapport, feuillesRapport, granulariteLabel } from "@/lib/rapportExport";
import { slug, telechargerExcel } from "@/lib/excel";
import { toISODate } from "@/lib/dates";

const HORS_LIGNE = "Export impossible hors connexion : il se fait depuis le serveur.";

/** Adresse de la page PDF du rapport. */
export const rapportHref = (debut: number, g: Granularite) => `/progression/rapport?annee=${debut}&g=${g}`;

/** Choix de l'année et du découpage, puis export Excel ou PDF du rapport d'évolution. */
export function RapportCard() {
  const store = useStore();
  const router = useRouter();
  const courante = Number(anneeScoute(new Date()).debut.slice(0, 4));
  const [debut, setDebut] = useState(courante);
  const [g, setG] = useState<Granularite>("trimestre");
  const annee = anneeDepuis(debut);

  const excel = () => {
    if (store.offline) return store.showToast(HORS_LIGNE);
    const { jeunes, vals, recons, steps } = store;
    const r = construireRapport({ jeunes, vals, recons, steps }, annee, g, toISODate(new Date()));
    const name = `${slug(store.groupeNom)}-evolution-${annee.label}-${g}.xlsx`;
    telechargerExcel(name, feuillesRapport(r, steps, store.unitesNoms))
      .then(() => {
        store.log({
          action: "export",
          table: "rapports",
          ligne: name,
          resume: `Rapport d'évolution ${annee.label} (${granulariteLabel(g)}) exporté en Excel`,
          apres: { fichier: name, periodes: r.periodes.length },
        });
        store.showToast(`${name} exporté`);
      })
      .catch(() => store.showToast("L'export a échoué. Réessayez."));
  };

  return (
    <Card className="flex flex-col gap-3.5 p-4">
      <span className="text-[14px] text-muted text-pretty">
        L&apos;évolution de chaque unité depuis la rentrée : effectif, preuves validées, jeunes qui progressent, étapes reconnues et répartition par étape.
      </span>
      <label className="flex items-center justify-between gap-3 text-[14px] font-semibold">
        Année scoute
        <select value={debut} onChange={(e) => setDebut(Number(e.target.value))} className="h-10 rounded-ui border border-line-strong bg-surface px-2.5 text-[14px] font-semibold text-ink">
          {[courante, courante - 1].map((y) => (
            <option key={y} value={y}>
              {anneeDepuis(y).label}
            </option>
          ))}
        </select>
      </label>
      <div role="radiogroup" aria-label="Découpage" className="grid grid-cols-3 gap-1 rounded-ui bg-track p-1">
        {GRANULARITES.map((x) => (
          <button
            key={x.value}
            type="button"
            role="radio"
            aria-checked={g === x.value}
            onClick={() => setG(x.value)}
            className={cx("h-10 rounded-ui text-[13px] font-bold", g === x.value ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.1)]" : "bg-transparent text-muted")}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={excel} className={cx("h-12 rounded-ui text-[15px] font-bold", store.offline ? "bg-track text-muted" : "bg-acc text-acc-ink")}>
          Excel
        </button>
        <OutlineButton onClick={() => router.push(rapportHref(debut, g))} className="h-12 bg-surface text-[15px] font-bold">
          PDF
        </OutlineButton>
      </div>
    </Card>
  );
}
