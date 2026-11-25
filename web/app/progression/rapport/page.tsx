"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BarreSentier, Bouton, Chiffre, Chiffres, Echelle, Logo, Surligne, TitreSection } from "@/components/carte";
import { cx } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES } from "@/lib/referentiels";
import { anneeDepuis, anneeScoute, GRANULARITES, type Granularite } from "@/lib/rapport";
import { construireRapport, feuillesRapport, granulariteLabel, type Rapport } from "@/lib/rapportExport";
import { fmtPoint, fmtShort, toISODate } from "@/lib/dates";
import { slug, telechargerExcel } from "@/lib/excel";
import { progressOf } from "@/lib/progress";

// Rapport d'évolution de l'année scoute. « Enregistrer en PDF » passe par l'impression du
// navigateur, comme le carnet du jeune (le même rendu sur tous les téléphones).

const HORS_LIGNE = "Export impossible hors connexion : il se fait depuis le serveur.";
const LIBELLES: Record<Granularite, string> = { semaine: "Semaine", trimestre: "Trimestre", annee: "Année" };

/** Adresse du rapport pour une année et un découpage. */
const rapportHref = (debut: number, g: Granularite) => `/progression/rapport?annee=${debut}&g=${g}`;

export default function RapportPage() {
  return (
    <Suspense fallback={null}>
      <RapportEvolution />
    </Suspense>
  );
}

/** Lit l'année et le découpage dans l'adresse ; une valeur inconnue revient au choix par défaut. */
function useParams(): { debut: number; courante: number; g: Granularite } {
  const params = useSearchParams();
  const courante = Number(anneeScoute(new Date()).debut.slice(0, 4));
  const debut = Number(params.get("annee"));
  const g = params.get("g");
  return {
    courante,
    debut: debut === courante || debut === courante - 1 ? debut : courante,
    g: GRANULARITES.some((x) => x.value === g) ? (g as Granularite) : "trimestre",
  };
}

function RapportEvolution() {
  const ok = useGuard((r) => r === "progression");
  const store = useStore();
  const router = useRouter();
  const { debut, courante, g } = useParams();

  useEffect(() => {
    if (ok) store.setLastTab("/progression/rapport");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const { jeunes, vals, recons, steps, offline, groupeNom } = store;
  const aujourdhui = toISODate(new Date());
  const r = construireRapport({ jeunes, vals, recons, steps }, anneeDepuis(debut), g, aujourdhui);
  const nom = `${slug(groupeNom)}-evolution-${r.annee.label}-${g}`;
  const choisir = (annee: number, decoupage: Granularite) => router.replace(rapportHref(annee, decoupage));

  const imprimer = () => {
    const prev = document.title;
    document.title = nom;
    window.print();
    document.title = prev;
    store.log({ action: "export", table: "rapports", ligne: `${nom}.pdf`, resume: `Rapport d'évolution ${r.annee.label} (${granulariteLabel(g)}) exporté en PDF` });
  };

  const excel = () => {
    if (offline) return store.showToast(HORS_LIGNE);
    const fichier = `${nom}.xlsx`;
    telechargerExcel(fichier, feuillesRapport(r, steps, store.unitesNoms))
      .then(() => {
        store.log({
          action: "export",
          table: "rapports",
          ligne: fichier,
          resume: `Rapport d'évolution ${r.annee.label} (${granulariteLabel(g)}) exporté en Excel`,
          apres: { fichier, periodes: r.periodes.length },
        });
        store.showToast(`${fichier} exporté`);
      })
      .catch(() => store.showToast("L'export a échoué. Réessayez."));
  };

  const enCours = debut === courante;

  return (
    <AppShell kicker={`Année scoute ${r.annee.label}, de septembre à ${enCours ? "aujourd'hui" : "août"}`} title="Rapport d'évolution" wide>
      <div className="flex flex-col gap-4 px-4 pb-10 lg:px-0">
        <EnTeteImpression r={r} groupe={store.groupeLibelle} aujourdhui={aujourdhui} />

        <div className="no-print flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="Découpage" className="flex">
              {GRANULARITES.map((x, k) => (
                <button
                  key={x.value}
                  type="button"
                  role="radio"
                  aria-checked={g === x.value}
                  onClick={() => choisir(debut, x.value)}
                  className={cx(
                    "min-h-11 border-[1.5px] border-encre px-4 text-[16px] font-semibold",
                    k > 0 && "-ml-[1.5px]",
                    g === x.value ? "bg-encre text-fond" : "bg-transparent text-encre",
                  )}
                >
                  {LIBELLES[x.value]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[15px] text-crayon">
              Année
              <select
                value={debut}
                onChange={(e) => choisir(Number(e.target.value), g)}
                className="h-11 border-0 border-b-[1.5px] border-encre bg-transparent px-1 font-mono text-[15px] text-encre"
              >
                {[courante, courante - 1].map((y) => (
                  <option key={y} value={y}>
                    {anneeDepuis(y).label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Bouton variante="secondaire" onClick={imprimer} disabled={offline}>
              Enregistrer en PDF
            </Bouton>
            <Bouton onClick={excel} disabled={offline}>
              Exporter en Excel
            </Bouton>
          </div>
        </div>
        {offline && <p className="no-print m-0 text-[15px] text-crayon">{HORS_LIGNE}</p>}

        {r.periodes.length === 0 ? (
          <p className="m-0 py-4 text-[17px] text-crayon">L&apos;année n&apos;a pas encore commencé : rien à rapporter pour l&apos;instant.</p>
        ) : (
          <>
            <ChiffresAnnee r={r} />
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-10">
              <ParMois r={r} />
              <div className="flex flex-col">
                {r.branches.map((b) => (
                  <Repartition key={b} r={r} b={b} />
                ))}
              </div>
            </div>
            <Bilan r={r} />
            {r.branches.map((b) => (
              <EvolutionUnite key={b} r={r} b={b} />
            ))}
          </>
        )}
        <p className="m-0 hidden text-[13px] text-crayon print:block">Document interne au groupe, contient des données de mineurs.</p>
      </div>
    </AppShell>
  );
}

/** En-tête de la version imprimée (l'en-tête de l'écran ne s'imprime pas). */
function EnTeteImpression({ r, groupe, aujourdhui }: { r: Rapport; groupe: string; aujourdhui: string }) {
  return (
    <div className="hidden flex-col gap-4 print:flex">
      <div className="flex items-end justify-between border-b-4 border-double border-encre pb-2">
        <Logo taille={26} />
        <span className="font-mono text-[13px]">Imprimé le {fmtPoint(aujourdhui, true)}</span>
      </div>
      <div>
        <h2 className="m-0 text-titre font-extrabold leading-tight">Rapport d&apos;évolution · année {r.annee.label}</h2>
        <p className="m-0 text-[15px] text-crayon">
          {groupe} · du {fmtPoint(r.annee.debut, true)} au {fmtPoint(r.arrete, true)} · {granulariteLabel(r.granularite)}
        </p>
      </div>
    </div>
  );
}

function ChiffresAnnee({ r }: { r: Rapport }) {
  const somme = (f: (s: Rapport["synthese"][number]) => number) => r.synthese.reduce((n, s) => n + f(s), 0);
  const fin = somme((s) => s.effectifFin);
  const ecart = fin - somme((s) => s.effectifDebut);
  const ajournees = somme((s) => s.ajournees);
  return (
    <Chiffres className="grid-cols-2 lg:grid-cols-5">
      <Chiffre valeur={fin} libelle={`jeunes${ecart ? ` (${ecart > 0 ? "+" : ""}${ecart})` : ""}`} />
      <Chiffre valeur={somme((s) => s.validations)} libelle="preuves validées" />
      <Chiffre valeur={somme((s) => s.jeunesProgressant)} libelle="jeunes qui progressent" />
      <Chiffre valeur={somme((s) => s.reconnues)} libelle="étapes reconnues" />
      <Chiffre valeur={ajournees ? <Surligne>{ajournees}</Surligne> : 0} libelle="ajournées" />
    </Chiffres>
  );
}

/** Barres verticales, une par mois ; la valeur au-dessus, le mois dessous. */
function ParMois({ r }: { r: Rapport }) {
  const max = Math.max(1, ...r.parMois.map((m) => m.validations));
  const resume = r.parMois.map((m) => `${m.label} : ${m.validations}`).join(", ");
  return (
    <section className="break-inside-avoid">
      <TitreSection>Preuves validées par mois</TitreSection>
      <div role="img" aria-label={`Preuves validées par mois. ${resume}`} className="flex h-[180px] items-end gap-2 border-b-[1.5px] border-encre pt-6">
        {r.parMois.map((m) => (
          <div key={m.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            {m.validations > 0 && <span className="font-mono text-[13px]">{m.validations}</span>}
            <span className="w-full max-w-14 bg-sentier" style={{ height: `${Math.max(1, Math.round((m.validations / max) * 120))}px` }} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-2 pt-1">
        {r.parMois.map((m) => (
          <span key={m.label} className="min-w-0 flex-1 text-center text-[13px] text-crayon">
            {m.label}
          </span>
        ))}
      </div>
    </section>
  );
}

/** Répartition des jeunes d'une unité par étape aujourd'hui, avec celle de la rentrée en rappel. */
function Repartition({ r, b }: { r: Rapport; b: Rapport["branches"][number] }) {
  const store = useStore();
  const etapes = store.steps[b];
  const jeunes = r.jeunes.filter((x) => x.j.branche === b);
  const compte = (cle: "etapeDebut" | "etapeFin") => etapes.map((s) => ({ etape: s.name, nombre: jeunes.filter((x) => x[cle] === s.id).length }));
  return (
    <section className="break-inside-avoid">
      <TitreSection>Répartition par étape · {BRANCHES[b].name.toLowerCase()}</TitreSection>
      {jeunes.length === 0 ? (
        <p className="m-0 py-2 text-[16px] text-crayon">Aucun jeune actif dans l&apos;unité.</p>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          <BarreSentier repartition={compte("etapeFin")} />
          <p className="m-0 text-[14px] text-crayon">{etapes.map((s) => s.name).join(" · ")}</p>
          <p className="m-0 text-[15px]">
            En septembre : <span className="font-mono">{compte("etapeDebut").map((x) => x.nombre).join(" · ")}</span>
          </p>
        </div>
      )}
    </section>
  );
}

function Bilan({ r }: { r: Rapport }) {
  const store = useStore();
  const nomEtape = (b: Rapport["branches"][number], id: string) => store.steps[b].find((s) => s.id === id)?.name ?? id;
  return (
    <section>
      <TitreSection>Bilan jeune par jeune</TitreSection>
      <table className="tableau-empile w-full border-collapse text-[16px]">
        <thead>
          <tr className="text-left text-[14px]">
            <th scope="col" className="py-2 pr-3 font-semibold">Jeune</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Unité</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Étape sept. → aujourd&apos;hui</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Preuves</th>
            <th scope="col" className="py-2 font-semibold">Étape en cours</th>
          </tr>
        </thead>
        <tbody>
          {r.jeunes.map((x) => {
            const p = progressOf(x.j, store.steps, store.vals);
            const change = x.etapeFin !== x.etapeDebut;
            return (
              <tr key={x.j.id} className="break-inside-avoid border-t border-ligne">
                <th scope="row" className="py-2.5 pr-3 text-left font-semibold">
                  {x.j.prenom} {x.j.nom}
                </th>
                <td className="py-2.5 pr-3">{BRANCHES[x.j.branche].name}</td>
                <td className="py-2.5 pr-3">
                  {nomEtape(x.j.branche, x.etapeDebut)} → {change ? <strong>{nomEtape(x.j.branche, x.etapeFin)}</strong> : nomEtape(x.j.branche, x.etapeFin)}
                </td>
                <td className="py-2.5 pr-3 font-mono text-[15px] lg:text-right">
                  {x.validations}
                  <span className="font-sans text-[16px] lg:hidden"> preuves</span>
                </td>
                <td className="py-2.5">
                  <Echelle faites={p.done} total={p.total} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/** Détail d'une unité période par période (découpage choisi), avec les jeunes à chaque étape en fin de période. */
function EvolutionUnite({ r, b }: { r: Rapport; b: Rapport["branches"][number] }) {
  const store = useStore();
  const etapes = store.steps[b].map((s) => s.name);
  const lignes = r.lignes.filter((l) => l.branche === b);
  const periode = (debut: string, fin: string, label: string) => (r.granularite === "semaine" ? `${label} · ${fmtShort(debut)} – ${fmtShort(fin)}` : label);
  const titres = ["Période", "Jeunes", "Preuves", "Ont progressé", "Reconnues", "Ajournées", ...etapes];
  return (
    <section>
      <TitreSection>
        {store.unitesNoms[b]} · {granulariteLabel(r.granularite)}
      </TitreSection>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr>
              {titres.map((t, i) => (
                <th key={t} scope="col" className={cx("whitespace-nowrap py-2 pr-3 text-[13px] font-semibold", i ? "text-right" : "text-left")}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.periode.debut} className="break-inside-avoid border-t border-ligne">
                <Cellule>{periode(l.periode.debut, l.periode.fin, l.periode.label)}</Cellule>
                {[l.effectif, l.validations, l.jeunesProgressant, l.reconnues, l.ajournees, ...l.parEtape].map((v, i) => (
                  <Cellule key={i} nombre>
                    {v}
                  </Cellule>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="m-0 pt-2 text-[14px] text-crayon">Ont progressé : jeunes avec au moins une preuve validée. Les dernières colonnes donnent le nombre de jeunes à chaque étape en fin de période.</p>
    </section>
  );
}

function Cellule({ children, nombre = false }: { children: ReactNode; nombre?: boolean }) {
  return <td className={cx("py-2 pr-3", nombre ? "text-right font-mono text-[14px]" : "whitespace-nowrap")}>{children}</td>;
}
