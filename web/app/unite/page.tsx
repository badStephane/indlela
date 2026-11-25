"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FicheJeune } from "@/components/FicheJeune";
import { Bouton, CheminDebut, CourbesNiveau, EffectifChemin, Echelle, PointAttente, Surligne } from "@/components/carte";
import { canValidate, useGuard } from "@/lib/access";
import { useStore, useTroupe, useTroupeSansConsentement } from "@/lib/store";
import { ceremonies, fullName } from "@/lib/mock";
import { hasPending, plural, progressOf } from "@/lib/progress";
import { contientSansAccents } from "@/lib/parseList";
import { fmtDayMonth, fmtMeeting } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";

export default function Unite() {
  const ok = useGuard((r) => r === "cadre" || r === "groupe");
  const store = useStore();
  const router = useRouter();
  const troupe = useTroupe();
  const enAttente = useTroupeSansConsentement();
  const [recherche, setRecherche] = useState("");
  // Sur ordinateur, la fiche du jeune choisi s'ouvre à côté de la liste.
  const [selection, setSelection] = useState<string | null>(null);
  const { vals, role, steps } = store;

  useEffect(() => {
    if (ok && role === "cadre") store.setLastTab("/unite");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, role]);

  if (!ok) return null;

  const rows = troupe.map((j) => ({ j, p: progressOf(j, steps, vals) }));
  const award = rows.filter((r) => r.p.complete).length;
  const etapes = steps.troupe.map((s, k) => ({ etape: s.name, nombre: rows.filter((r) => r.p.index === k).length }));
  const visibles = rows.filter(({ j }) => contientSansAccents(fullName(j), recherche));
  const canAdd = canValidate(role);
  const addJeunes = () => router.push("/unite/ajouter");
  const vide = troupe.length === 0;
  const choisi = troupe.find((j) => j.id === selection) ?? visibles[0]?.j;
  const ouvrir = (id: string) => {
    if (window.matchMedia("(min-width: 1024px)").matches) setSelection(id);
    else router.push(jeuneHref(id));
  };

  return (
    <AppShell
      kicker={vide ? "Aucun jeune pour l'instant" : `Réunion du ${fmtMeeting(new Date())}`}
      title={store.unitesNoms.troupe}
      back={role === "groupe" ? "/groupe" : undefined}
      banner
      wide
      aDroite={
        canAdd && !vide ? (
          <span className="hidden lg:contents">
            <Bouton variante="secondaire" onClick={addJeunes}>
              + Ajouter des jeunes
            </Bouton>
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-col px-4 pb-8 lg:px-0">
        {enAttente.length > 0 && (
          <p className="m-0 border-b border-ligne py-3.5 text-[17px] text-pretty">
            {enAttente.length > 1 ? `${enAttente.length} fiches attendent` : "1 fiche attend"} le consentement des parents ({enAttente.map((j) => j.prenom).join(", ")}).{" "}
            <span className="text-crayon">
              {enAttente.length > 1 ? "Elles apparaîtront" : "Elle apparaîtra"} ici dès que l&apos;admin l&apos;aura enregistré.
            </span>
          </p>
        )}

        {vide ? (
          <UniteVide canAdd={canAdd} onAdd={addJeunes} />
        ) : (
          <>
            <section aria-label="Effectif de l'unité" className="flex flex-col gap-4 border-b border-ligne py-5">
              <p className="m-0 text-[18px]">
                <strong className="text-[28px] font-extrabold tracking-[-0.3px]">
                  {troupe.length} {plural(troupe.length, "jeune", "jeunes")}
                </strong>{" "}
                sur le chemin
              </p>
              <EffectifChemin etapes={etapes} />
            </section>

            {award > 0 && (
              <button
                type="button"
                onClick={() => router.push("/unite/tableau-de-bord")}
                className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-ligne bg-transparent py-3.5 text-left text-[17px] text-encre"
              >
                <span className="text-pretty">
                  <Surligne>
                    {award} {plural(award, "étape", "étapes")}
                  </Surligne>{" "}
                  à remettre à la cour d&apos;honneur du {fmtDayMonth(ceremonies().courHonneur)}
                </span>
                <span aria-hidden="true" className="text-[22px]">›</span>
              </button>
            )}

            <div className="border-t-4 border-double border-encre lg:grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start lg:gap-8">
            <div className="flex flex-col lg:sticky lg:top-0">
            <div className="flex items-end justify-between gap-4 pt-4">
              <h2 className="m-0 pb-2 text-[16px] font-bold">Les jeunes</h2>
              <input
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                aria-label="Chercher un jeune"
                placeholder="Chercher"
                className="h-11 w-[48%] max-w-[260px] border-0 border-b-[1.5px] border-encre bg-transparent px-0 text-[17px] text-encre outline-offset-4 placeholder:text-crayon"
              />
            </div>

            <ul className="m-0 list-none p-0">
              {visibles.map(({ j, p }) => (
                <li key={j.id} className="border-b border-ligne">
                  <button
                    type="button"
                    onClick={() => ouvrir(j.id)}
                    aria-current={choisi?.id === j.id ? "true" : undefined}
                    className="flex min-h-[66px] w-full items-center gap-3 bg-transparent py-3 text-left text-encre lg:px-2 lg:aria-[current]:bg-fond-2 lg:aria-[current]:shadow-[inset_4px_0_0_var(--color-encre)]"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="flex min-w-0 items-center gap-2 text-[18px] font-semibold">
                        <span className="truncate">{fullName(j)}</span>
                        {hasPending(vals, j) && <PointAttente />}
                      </span>
                      <Echelle faites={p.done} total={p.total} />
                    </span>
                    <span className="flex-none text-[16px] font-semibold text-sentier">{p.step?.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            {visibles.length === 0 && <p className="m-0 py-4 text-[16px] text-crayon">Aucun jeune ne correspond à « {recherche.trim()} ».</p>}

            {canAdd && (
              <div className="mt-5 lg:hidden">
                <Bouton variante="secondaire" onClick={addJeunes} className="w-full">
                  Ajouter des jeunes
                </Bouton>
              </div>
            )}
            </div>
            {choisi && (
              <div className="hidden lg:flex lg:flex-col lg:gap-5 lg:pt-4">
                <div className="flex flex-wrap gap-2">
                  {canAdd && <Bouton onClick={() => router.push(jeuneHref(choisi.id, "valider"))}>Valider des preuves</Bouton>}
                  <Bouton variante="secondaire" onClick={() => router.push(jeuneHref(choisi.id))}>
                    Ouvrir la fiche
                  </Bouton>
                  <Bouton variante="secondaire" onClick={() => router.push(jeuneHref(choisi.id, "carnet"))}>
                    Carnet PDF
                  </Bouton>
                </div>
                <FicheJeune j={choisi} titre="h2" />
              </div>
            )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

/** Unité sans jeune : le chemin commence ici. Les courbes de niveau restent dans une bande vide, sous le texte. */
function UniteVide({ canAdd, onAdd }: { canAdd: boolean; onAdd: () => void }) {
  return (
    <section className="flex flex-col items-start gap-4 pt-8">
      <CheminDebut />
      <h2 className="m-0 text-titre font-extrabold leading-tight tracking-[-0.3px]">Le chemin commence ici.</h2>
      <p className="m-0 text-[17px] text-crayon text-pretty">
        Ajoutez les jeunes de l&apos;unité avec leur étape. Vous pourrez ensuite valider leurs preuves en réunion.
      </p>
      {canAdd && (
        <Bouton large onClick={onAdd} className="lg:w-auto lg:px-8">
          Ajouter des jeunes
        </Bouton>
      )}
      <div className="relative isolate h-[240px] w-full">
        <CourbesNiveau hauteur={240} largeur={360} />
      </div>
    </section>
  );
}
