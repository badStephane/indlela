"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BarreSentier, BlocBranche, Chiffre, Chiffres, Echelle, Surligne, TitreSection } from "@/components/carte";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES, type BranchCode } from "@/lib/referentiels";
import { fullName, type Jeune } from "@/lib/mock";
import { plural, progressOf } from "@/lib/progress";
import { jeuneHref } from "@/lib/routes";
import { cadresInactifs, estActif, jeunesARelancer, parEtape, sansConsentement, SEUIL_CADRE_JOURS, SEUIL_JEUNE_JOURS } from "@/lib/suivi";

// Tableau de bord du responsable progression : chaque unité du groupe, avec de vraies
// données, puis qui relancer (jeunes, cadres, consentements manquants).

const ORDER: BranchCode[] = ["troupe", "meute", "route"];
/** Jeunes montrés d'emblée sous chaque unité ; les autres se déplient. */
const APERCU = 3;

export default function Progression() {
  const ok = useGuard((r) => r === "progression");
  const store = useStore();
  const { jeunes, vals, comptes } = store;

  useEffect(() => {
    if (ok) store.setLastTab("/progression");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const actifs = jeunes.filter(estActif);
  const relances = jeunesARelancer(jeunes, vals);
  const cadres = cadresInactifs(comptes);
  const attente = sansConsentement(jeunes);

  return (
    <AppShell kicker="Toutes les unités, avec leurs vraies données" title="Progression du groupe" wide>
      <div className="flex flex-col gap-4 px-4 pb-10 lg:px-0">
        <Chiffres className="grid-cols-2 lg:grid-cols-4">
          <Chiffre valeur={actifs.length} libelle={plural(actifs.length, "jeune actif", "jeunes actifs")} />
          <Chiffre valeur={relances.length ? <Surligne>{relances.length}</Surligne> : 0} libelle={`${plural(relances.length, "jeune", "jeunes")} à relancer`} />
          <Chiffre valeur={cadres.length} libelle={plural(cadres.length, "cadre inactif", "cadres inactifs")} />
          <Chiffre valeur={attente.length} libelle={plural(attente.length, "consentement manquant", "consentements manquants")} />
        </Chiffres>

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-8 pt-4">
            {ORDER.map((b) => (
              <UniteBloc key={b} branche={b} />
            ))}
          </div>

          <aside className="flex min-w-0 flex-col">
            <TitreSection aDroite={`sans validation · ${SEUIL_JEUNE_JOURS} j`}>À relancer</TitreSection>
            {relances.length ? (
              <Liste>
                {relances.map(({ j, jours }) => (
                  <Ligne key={j.id} href={jeuneHref(j.id)} nom={fullName(j)} unite={BRANCHES[j.branche].name} jours={jours} />
                ))}
              </Liste>
            ) : (
              <Vide>Chaque jeune a eu une validation ce mois-ci.</Vide>
            )}

            <TitreSection aDroite={`sans connexion · ${SEUIL_CADRE_JOURS} j`}>Cadres inactifs</TitreSection>
            {cadres.length ? (
              <Liste>
                {cadres.map(({ compte, jours }) => (
                  <Ligne
                    key={compte.id}
                    nom={compte.nom}
                    unite={compte.unites.map((u) => BRANCHES[u as BranchCode]?.name ?? u).join(", ") || "Aucune unité"}
                    jours={jours}
                  />
                ))}
              </Liste>
            ) : (
              <Vide>Tous les cadres se sont connectés récemment.</Vide>
            )}

            <TitreSection>Consentements manquants</TitreSection>
            {attente.length ? (
              <>
                <p className="m-0 py-2 text-[16px] text-pretty">
                  {attente.length > 1 ? `${attente.length} fiches restent inactives` : "1 fiche reste inactive"} tant que l&apos;admin n&apos;a pas enregistré le consentement des
                  parents.
                </p>
                <Liste>
                  {attente.map((j) => (
                    <Ligne key={j.id} nom={fullName(j)} unite={BRANCHES[j.branche].name} />
                  ))}
                </Liste>
              </>
            ) : (
              <Vide>Toutes les fiches ont le consentement des parents.</Vide>
            )}

            <Link
              href="/progression/rapport"
              className="mt-8 flex flex-col gap-1 border-[1.5px] border-encre p-4 text-encre no-underline outline outline-1 outline-offset-[3px] outline-encre hover:bg-fond-2"
            >
              <strong className="text-section font-extrabold">Rapport d&apos;évolution</strong>
              <span className="text-[15px] text-crayon">Septembre à aujourd&apos;hui, en PDF ou en Excel</span>
            </Link>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function UniteBloc({ branche }: { branche: BranchCode }) {
  const store = useStore();
  const { jeunes, steps, comptes } = store;
  const membres = jeunes.filter((j) => j.branche === branche && estActif(j));
  const responsableId = store.unites.find((u) => u.branche === branche)?.responsable;
  const responsable = comptes.find((c) => c.id === responsableId)?.nom;
  const etapes = steps[branche];
  const counts = parEtape(jeunes, steps, branche);
  const autres = membres.slice(APERCU);

  return (
    <BlocBranche branche={branche}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="m-0 text-section font-extrabold">{store.unitesNoms[branche]}</h2>
        <span className="text-[15px] text-crayon">{responsable ? `Responsable : ${responsable}` : "Pas de responsable désigné"}</span>
      </div>
      {!etapes.length ? (
        <p className="m-0 pt-2 text-[16px] text-crayon">Pas encore de référentiel publié pour la branche.</p>
      ) : !membres.length ? (
        <p className="m-0 pt-2 text-[16px] text-crayon">Aucun jeune actif dans l&apos;unité.</p>
      ) : (
        <div className="flex flex-col pt-3">
          <BarreSentier repartition={etapes.map((s, k) => ({ etape: s.name, nombre: counts[k] }))} />
          <div className="flex justify-between pt-1 text-[14px] text-crayon">
            <span>{etapes[0].name}</span>
            <span>{etapes[etapes.length - 1].name}</span>
          </div>
          <ul className="m-0 mt-2 list-none p-0">
            {membres.slice(0, APERCU).map((j) => (
              <JeuneLigne key={j.id} j={j} />
            ))}
          </ul>
          {autres.length > 0 && (
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center text-[16px] font-semibold underline underline-offset-4">
                <span className="group-open:hidden">Voir les {membres.length} jeunes</span>
                <span className="hidden group-open:inline">Masquer</span>
              </summary>
              <ul className="m-0 list-none p-0">
                {autres.map((j) => (
                  <JeuneLigne key={j.id} j={j} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </BlocBranche>
  );
}

function JeuneLigne({ j }: { j: Jeune }) {
  const { steps, vals } = useStore();
  const p = progressOf(j, steps, vals);
  return (
    <li className="border-b border-ligne">
      <Link href={jeuneHref(j.id)} className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[17px] text-encre no-underline">
        <span className="min-w-[8rem] flex-1 truncate font-semibold">{fullName(j)}</span>
        <span className="ml-auto flex max-w-full items-center gap-3">
          <span className="flex-none text-[15px] font-semibold text-sentier">{p.step?.name}</span>
          <Echelle faites={p.done} total={p.total} />
        </span>
      </Link>
    </li>
  );
}

function Liste({ children }: { children: ReactNode }) {
  return <ul className="m-0 list-none p-0">{children}</ul>;
}

function Vide({ children }: { children: ReactNode }) {
  return <p className="m-0 py-3 text-[16px] text-crayon">{children}</p>;
}

/** Une personne : nom en gras, unité, et depuis combien de jours (« jamais » si aucune trace). */
function Ligne({ nom, unite, jours, href }: { nom: string; unite: string; jours?: number | null; href?: string }) {
  const contenu = (
    <>
      <span className="min-w-0">
        <strong className="font-bold">{nom}</strong> · {unite}
      </span>
      {jours !== undefined && <span className="flex-none font-mono text-[14px]">{jours === null ? "jamais" : `${jours} j`}</span>}
    </>
  );
  const classe = "flex min-h-12 items-baseline justify-between gap-3 py-3 text-[16px] text-encre no-underline";
  return (
    <li className="border-b border-ligne">
      {href ? (
        <Link href={href} className={classe}>
          {contenu}
        </Link>
      ) : (
        <div className={classe}>{contenu}</div>
      )}
    </li>
  );
}
