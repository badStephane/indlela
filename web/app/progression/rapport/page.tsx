"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES, BRANCH_COLORS } from "@/lib/referentiels";
import { anneeDepuis, anneeScoute, GRANULARITES, type Granularite } from "@/lib/rapport";
import { construireRapport, granulariteLabel, type Rapport } from "@/lib/rapportExport";
import { fmtDayMonth, fmtShort, toISODate } from "@/lib/dates";
import { slug } from "@/lib/excel";

// Rapport d'évolution prêt à imprimer : « Enregistrer en PDF » passe par l'impression du
// navigateur, comme le carnet du jeune (le même rendu sur tous les téléphones).

export default function RapportPage() {
  return (
    <Suspense fallback={null}>
      <RapportEvolution />
    </Suspense>
  );
}

/** Lit l'année et le découpage dans l'adresse ; une valeur inconnue revient au choix par défaut. */
function useParams(): { debut: number; g: Granularite } {
  const params = useSearchParams();
  const courante = Number(anneeScoute(new Date()).debut.slice(0, 4));
  const debut = Number(params.get("annee"));
  const g = params.get("g");
  return {
    debut: debut === courante || debut === courante - 1 ? debut : courante,
    g: GRANULARITES.some((x) => x.value === g) ? (g as Granularite) : "trimestre",
  };
}

function RapportEvolution() {
  const ok = useGuard((r) => r === "progression");
  const store = useStore();
  const { debut, g } = useParams();
  if (!ok) return null;

  const { jeunes, vals, recons, steps, offline, groupeNom } = store;
  const r = construireRapport({ jeunes, vals, recons, steps }, anneeDepuis(debut), g, toISODate(new Date()));

  const imprimer = () => {
    const prev = document.title;
    const name = `${slug(groupeNom)}-evolution-${r.annee.label}-${g}`;
    document.title = name;
    window.print();
    document.title = prev;
    store.log({ action: "export", table: "rapports", ligne: `${name}.pdf`, resume: `Rapport d'évolution ${r.annee.label} (${granulariteLabel(g)}) exporté en PDF` });
  };

  return (
    <AppShell
      kicker={groupeNom}
      title="Rapport d'évolution"
      back="/progression"
      foot={{ label: offline ? "Export indisponible hors connexion" : "Enregistrer en PDF", disabled: offline, onClick: imprimer }}
    >
      <div className="flex min-h-full flex-col gap-3.5 bg-desk p-4 lg:items-center">
        <article
          className="print-sheet flex w-full max-w-[900px] flex-col gap-5 bg-white px-5 py-[22px] text-[#1F1D19] shadow-[0_1px_3px_rgba(0,0,0,.12),0_8px_24px_rgba(0,0,0,.06)]"
          style={{ fontFamily: "var(--font-plex), var(--font-sans)" }}
        >
          <div className="flex items-center justify-between border-b-2 border-[#1F1D19] pb-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Indlela" className="h-[18px] w-auto" />
            <span className="num text-[11px] text-[#6B665C]">{store.groupeLibelle.toUpperCase()}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold text-[#1F1D19]">Rapport d&apos;évolution de la progression</span>
            <span className="text-[20px] font-bold">Année scoute {r.annee.label}</span>
            <span className="text-[12px] text-[#6B665C]">
              {GRANULARITES.find((x) => x.value === g)!.label} · arrêté au {fmtDayMonth(r.arrete, true)}
            </span>
          </div>

          {r.periodes.length === 0 ? (
            <p className="m-0 text-[14px] text-[#6B665C]">L&apos;année n&apos;a pas encore commencé : rien à rapporter pour l&apos;instant.</p>
          ) : (
            <>
              <Synthese r={r} />
              {r.branches.map((b) => (
                <Unite key={b} r={r} b={b} etapes={steps[b].map((s) => s.name)} />
              ))}
              <Jeunes r={r} />
            </>
          )}
        </article>
      </div>
    </AppShell>
  );
}

function Titre({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <h2 className="m-0 border-b pb-1 text-[15px] font-bold" style={{ borderColor: color ?? "#D9D4C7" }}>
      {children}
    </h2>
  );
}

const th = "px-1.5 py-1 text-left text-[11px] font-semibold text-[#6B665C]";
const td = "px-1.5 py-1 text-[12px] tabular-nums";

function Tableau({ titres, lignes, nums = [] }: { titres: string[]; lignes: ReactNode[][]; nums?: number[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#D9D4C7]">
            {titres.map((t, i) => (
              <th key={t} scope="col" className={th} style={nums.includes(i) ? { textAlign: "right" } : undefined}>
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, k) => (
            <tr key={k} className="break-inside-avoid border-b border-[#EEEAE0]">
              {l.map((c, i) => (
                <td key={i} className={i === 0 ? `${td} whitespace-nowrap` : td} style={nums.includes(i) ? { textAlign: "right" } : undefined}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Synthese({ r }: { r: Rapport }) {
  const store = useStore();
  return (
    <section className="flex flex-col gap-2">
      <Titre>Synthèse de l&apos;année</Titre>
      <Tableau
        titres={["Unité", "Rentrée", "Aujourd'hui", "Preuves", "Ont progressé", "Reconnues", "Ajournées"]}
        nums={[1, 2, 3, 4, 5, 6]}
        lignes={r.synthese.map((s) => [store.unitesNoms[s.branche], s.effectifDebut, s.effectifFin, s.validations, s.jeunesProgressant, s.reconnues, s.ajournees])}
      />
      <span className="text-[11px] text-[#6B665C]">
        Rentrée et aujourd&apos;hui : jeunes actifs. Ont progressé : jeunes avec au moins une preuve validée dans l&apos;année.
      </span>
    </section>
  );
}

function Unite({ r, b, etapes }: { r: Rapport; b: Rapport["branches"][number]; etapes: string[] }) {
  const store = useStore();
  const lignes = r.lignes.filter((l) => l.branche === b);
  const max = Math.max(1, ...lignes.map((l) => l.validations));
  const color = BRANCH_COLORS[b].acc;
  const periode = (debut: string, fin: string, label: string) => (r.granularite === "semaine" ? `${label} · ${fmtShort(debut)} – ${fmtShort(fin)}` : label);
  return (
    <section className="flex flex-col gap-2">
      <Titre color={color}>{store.unitesNoms[b]}</Titre>
      <Tableau
        titres={["Période", "Jeunes", "Preuves validées", "Ont progressé", "Reconnues", "Ajournées", ...etapes]}
        nums={[1, 3, 4, 5, ...etapes.map((_, i) => 6 + i)]}
        lignes={lignes.map((l) => [
          periode(l.periode.debut, l.periode.fin, l.periode.label),
          l.effectif,
          <span key="v" className="flex items-center gap-1.5">
            <span className="inline-block h-2 rounded-sm" style={{ width: `${Math.round((l.validations / max) * 64)}px`, minWidth: 2, background: color }} />
            {l.validations}
          </span>,
          l.jeunesProgressant,
          l.reconnues,
          l.ajournees,
          ...l.parEtape,
        ])}
      />
      <span className="text-[11px] text-[#6B665C]">Les dernières colonnes donnent le nombre de jeunes à chaque étape à la fin de la période.</span>
    </section>
  );
}

function Jeunes({ r }: { r: Rapport }) {
  const store = useStore();
  const name = (b: Rapport["branches"][number], id: string) => store.steps[b].find((s) => s.id === id)?.name ?? id;
  return (
    <section className="flex flex-col gap-2">
      <Titre>Parcours des jeunes</Titre>
      <Tableau
        titres={["Unité", "Jeune", "À la rentrée", "Aujourd'hui", "Preuves", "Reconnues"]}
        nums={[4, 5]}
        lignes={r.jeunes.map((x) => [
          store.unitesNoms[x.j.branche],
          `${x.j.prenom} ${x.j.nom}`,
          name(x.j.branche, x.etapeDebut),
          x.etapeFin !== x.etapeDebut ? <strong key="f">{name(x.j.branche, x.etapeFin)}</strong> : name(x.j.branche, x.etapeFin),
          x.validations,
          x.reconnues,
        ])}
      />
    </section>
  );
}
