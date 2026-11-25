"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Bandeau } from "@/components/carte";
import { cx } from "@/components/ui";
import { canValidate } from "@/lib/access";
import { useJeuneRoute } from "@/lib/useJeune";
import { useBack } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { fullName } from "@/lib/mock";
import { plural, progressOf } from "@/lib/progress";
import { jeuneHref } from "@/lib/routes";

/** Correction de l'étape d'un jeune : erreur de saisie, ou jeune arrivé d'un autre groupe. */
export default function CorrigerEtape() {
  const { ok, j } = useJeuneRoute(canValidate);
  const store = useStore();
  const [choix, setChoix] = useState<string | null>(null);
  const back = useBack(j ? jeuneHref(j.id) : "/unite");
  if (!ok) return null;

  const p = progressOf(j, store.steps, store.vals);
  if (!p.step) return null;
  const actuelle = p.step;
  const nouvelle = choix ?? actuelle.id;
  const cible = p.steps.find((s) => s.id === nouvelle);
  const reussies = store.vals.filter((v) => v.jeuneId === j.id && !v.annuleeLe).length;

  const corriger = () => {
    if (!cible || nouvelle === actuelle.id) return;
    store.updateJeune(j.id, { etapeId: nouvelle });
    store.showToast(`${j.prenom} : étape ${cible.name}`);
    back();
  };

  return (
    <AppShell
      kicker="Pour une erreur de saisie ou un jeune arrivé d'un autre groupe"
      title="Corriger l'étape"
      back={jeuneHref(j.id)}
      retour={fullName(j)}
      branch={j.branche}
      foot={{
        label: nouvelle === actuelle.id ? "Choisissez la nouvelle étape" : `Passer à l'étape ${cible?.name}`,
        disabled: nouvelle === actuelle.id,
        onClick: corriger,
      }}
    >
      <div className="flex flex-col gap-5 px-4 pb-8 pt-4 lg:px-0">
        <p className="m-0 text-[17px]">
          Étape actuelle : <strong>{actuelle.name}</strong> ({p.done} {plural(p.done, "preuve", "preuves")} sur {p.total})
        </p>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1 text-[15px] font-semibold">Nouvelle étape</legend>
          {p.steps.map((s) => {
            const on = s.id === nouvelle;
            return (
              <label
                key={s.id}
                className="flex min-h-14 cursor-pointer items-center gap-3.5 border-b border-ligne text-[17px] has-[input:focus-visible]:outline has-[input:focus-visible]:outline-[3px] has-[input:focus-visible]:outline-soleil"
              >
                <input type="radio" name="etape" value={s.id} checked={on} onChange={() => setChoix(s.id)} className="sr-only" />
                <span aria-hidden="true" className={cx("flex size-7 flex-none items-center justify-center rounded-full border-2", on ? "border-sentier" : "border-crayon")}>
                  {on && <span className="size-3.5 rounded-full bg-sentier" />}
                </span>
                <span className={cx(on && "font-semibold")}>
                  {s.name}
                  {s.id === actuelle.id && <span className="font-normal text-crayon"> · actuelle</span>}
                </span>
              </label>
            );
          })}
        </fieldset>

        <Bandeau>
          {reussies ? `${reussies === 1 ? "La preuve déjà réussie n'est pas effacée" : `Les ${reussies} preuves déjà réussies ne sont pas effacées`}. ` : ""}
          La correction est écrite dans le journal avec votre nom.
        </Bandeau>
      </div>
    </AppShell>
  );
}
