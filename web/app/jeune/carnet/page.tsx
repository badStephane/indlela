"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { Bandeau, Cartouche, Logo } from "@/components/carte";
import { useJeuneRoute } from "@/lib/useJeune";
import { useStore } from "@/lib/store";
import { dateRemise, fullName } from "@/lib/mock";
import { progressOf } from "@/lib/progress";
import { preuveLabel } from "@/lib/effective";
import { dateReconnue, historique } from "@/lib/courHonneur";
import { fmtPoint, toISODate } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";

// Aperçu du carnet. En production, le PDF est généré par le serveur (même rendu
// sur tous les téléphones) ; ici, « Télécharger » passe par l'impression du navigateur.
export default function Carnet() {
  const { ok, j } = useJeuneRoute();
  const store = useStore();
  if (!ok) return null;

  const { vals, offline, steps } = store;
  const p = progressOf(j, steps, vals);
  const order = p.step?.domaines.flatMap((d) => d.preuves.map((x) => x.id)) ?? [];
  const live = vals
    .filter((v) => v.jeuneId === j.id && v.etapeId === p.step?.id && !v.annuleeLe)
    .sort((a, b) => order.indexOf(a.preuveId) - order.indexOf(b.preuveId));
  const decisions = historique(store.recons, j.id);
  const name = fullName(j);
  const unite = store.unitesNoms[j.branche];

  return (
    <AppShell
      kicker="Carnet PDF"
      title={name}
      back={jeuneHref(j.id)}
      retour={name}
      branch={j.branche}
      foot={{
        label: offline ? "Téléchargement indisponible" : "Télécharger le PDF",
        disabled: offline,
        onClick: () => {
          const prev = document.title;
          document.title = `carnet-${j.prenom.toLowerCase()}-${j.nom.toLowerCase()}`;
          window.print();
          document.title = prev;
        },
      }}
    >
      <div className="flex min-h-full flex-col gap-4 bg-fond-2 p-4 lg:bg-transparent lg:px-0">
        {offline && (
          <div className="no-print">
            <Bandeau ton="erreur">Le carnet est généré par le serveur. Retrouvez du réseau pour le télécharger.</Bandeau>
          </div>
        )}
        <article className="print-sheet flex flex-col gap-5 border border-ligne bg-fond px-5 py-6 text-encre lg:px-10 lg:py-9">
          <header className="flex items-end justify-between gap-3 border-b-4 border-double border-encre pb-3">
            <Logo taille={28} />
            <span className="font-mono text-[13px]">Carnet imprimé le {fmtPoint(toISODate(new Date()), true)}</span>
          </header>

          <Cartouche
            as="h2"
            titre={name}
            sousTitre={[j.dateNaissance ? `Naissance le ${fmtPoint(j.dateNaissance, true)}` : null, unite, store.groupeLibelle].filter(Boolean).join(" · ")}
            libelle={p.step ? "étape en cours" : undefined}
            valeur={p.step ? `${p.step.name} · ${p.done}/${p.total}` : undefined}
          />

          <Rubrique titre="Étapes">
            {p.steps.map((s, k) => (
              <Ligne key={s.id}>
                <span className="font-semibold">{s.name}</span>
                <span className="font-mono text-[13px] text-crayon">
                  {k < p.index ? remiseLabel(dateReconnue(store.recons, j.id, s.id) ?? dateRemise(j, k, p.index)) : k === p.index ? `en cours · ${p.done}/${p.total}` : "à venir"}
                </span>
              </Ligne>
            ))}
          </Rubrique>

          <Rubrique titre={`${p.brevets ? "Brevets obtenus" : "Preuves réussies"}${p.step ? ` · ${p.step.name}` : ""}`}>
            {live.length ? (
              live.map((v) => (
                <div key={v.id} className="flex flex-col gap-0.5 border-b border-ligne py-2.5 text-[15px]">
                  <span className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
                    <span>{preuveLabel(p.steps, v.etapeId, v.preuveId)}</span>
                    <span className="font-mono text-[13px]">{fmtPoint(v.date, true)}</span>
                    <span className="text-[13px] text-crayon">
                      {v.validePar}
                      {v.pending ? " · en attente d'envoi" : ""}
                    </span>
                  </span>
                  {v.commentaire && <span className="font-note text-[14px] italic text-annotation">{v.commentaire}</span>}
                </div>
              ))
            ) : (
              <p className="m-0 py-2.5 text-[15px] text-crayon">Aucune pour l&apos;instant.</p>
            )}
          </Rubrique>

          {decisions.length > 0 && (
            <Rubrique titre="Décisions de cour d'honneur">
              {decisions.map((r) => (
                <p key={r.id} className="m-0 border-b border-ligne py-2.5 text-[15px] text-pretty">
                  <span className="font-mono text-[13px]">{fmtPoint(r.date, true)}</span> · {p.steps.find((x) => x.id === r.etapeId)?.name}{" "}
                  {r.decision === "reconnue" ? "reconnue" : "ajournée"}
                  {r.observations && (
                    <>
                      {" "}
                      · <span className="font-note italic text-annotation">« {r.observations} »</span>
                    </>
                  )}{" "}
                  · {r.ct}
                </p>
              ))}
            </Rubrique>
          )}

          <Rubrique titre="Spécialités et badges">
            <p className="m-0 py-2.5 text-[15px]">{j.specs.length ? j.specs.map((s) => `${s.name} (${s.meta})`).join(" ; ") : "Aucune pour l'instant."}</p>
          </Rubrique>

          <div className="mt-4 grid grid-cols-2 gap-6 text-[14px] text-crayon">
            <span className="border-t-[1.5px] border-encre pt-2">Signature du chef d&apos;unité</span>
            <span className="border-t-[1.5px] border-encre pt-2">Signature des parents</span>
          </div>
        </article>
      </div>
    </AppShell>
  );
}

function Rubrique({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="m-0 border-b-[1.5px] border-encre pb-1.5 text-[17px] font-extrabold">{titre}</h3>
      {children}
    </section>
  );
}

function Ligne({ children }: { children: ReactNode }) {
  return <div className="flex items-baseline justify-between gap-3 border-b border-ligne py-2 text-[15px]">{children}</div>;
}

function remiseLabel(iso: string | null): string {
  return iso ? `reconnue le ${fmtPoint(iso, true)}` : "franchie";
}
