"use client";

import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cx } from "@/components/ui";
import { Bandeau, TitreSection } from "@/components/carte";
import { canValidate } from "@/lib/access";
import { useJeuneRoute } from "@/lib/useJeune";
import { useBack } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { CURRENT_CADRE, fullName } from "@/lib/mock";
import { progressOf } from "@/lib/progress";
import { decisionPossible, etapeSuivante, majoriteAtteinte, majoriteLabel, type Decision } from "@/lib/courHonneur";
import { toISODate } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";

/** Champ sur une ligne, comme le reste de la charte. */
const fieldClass = "h-11 w-full border-0 border-b-[1.5px] border-encre bg-transparent px-0 text-[17px] font-normal text-encre";
const labelClass = "flex flex-col text-[15px] font-semibold";
const MAX_OBS = 1000;

/** Décision de la cour d'honneur sur l'étape en cours d'un jeune. */
export default function CourHonneur() {
  const { ok, j } = useJeuneRoute(canValidate);
  const store = useStore();
  const today = toISODate(new Date());
  const [decision, setDecision] = useState<Decision>("reconnue");
  const [date, setDate] = useState(today);
  const [observations, setObservations] = useState("");
  // Le responsable progression saisit pour l'unité : il inscrit le nom du chef qui a présidé.
  const [ct, setCt] = useState(store.role === "cadre" ? CURRENT_CADRE.full : store.role === "progression" ? "" : store.userName);
  const [presents, setPresents] = useState("");
  const [voixPour, setVoixPour] = useState("");
  const [tousPresents, setTousPresents] = useState(false);
  const [parentsConsultes, setParentsConsultes] = useState(false);
  const submitted = useRef(false);
  const back = useBack(j ? jeuneHref(j.id) : "/unite");
  if (!ok) return null;

  const p = progressOf(j, store.steps, store.vals);
  if (!p.step) return null;
  const step = p.step;
  const next = etapeSuivante(p.steps, step.id);
  const vote = step.vote;
  const input = { decision, presents: Number(presents), voixPour: Number(voixPour), tousPresents, parentsConsultes };
  const check = decisionPossible(step, input);
  const ready = check.ok && !!ct.trim() && date <= today;

  const save = () => {
    if (submitted.current || !ready) return;
    submitted.current = true;
    store.reconnaitre(j, { ...input, ...(vote ? {} : { presents: undefined, voixPour: undefined }), date, observations, ct });
    back();
  };

  const majorite = vote && presents && voixPour ? majoriteAtteinte(Number(presents), Number(voixPour), vote.majorite) : null;

  return (
    <AppShell
      kicker={`Étape ${step.name}${vote ? ` · vote secret, ${majoriteLabel(vote.majorite)} des voix` : ""}`}
      title="Cour d'honneur"
      back={jeuneHref(j.id)}
      retour={fullName(j)}
      banner
      foot={{
        label: decision === "reconnue" ? `Reconnaître l'étape ${step.name}` : "Enregistrer l'ajournement",
        disabled: !ready,
        onClick: save,
        note: !check.ok
          ? check.raison
          : !ct.trim()
            ? "Inscrivez le nom du chef qui signe les observations."
            : decision === "reconnue" ? (next ? `${j.prenom} passera à l'étape ${next.name}.` : "C'est la dernière étape de la branche.") : undefined,
      }}
    >
      <div className="flex flex-col gap-5 px-4 pb-8 pt-4 lg:px-0">
        {!p.complete && (
          <Bandeau>
            Toutes les preuves de l&apos;étape ne sont pas encore réussies ({p.done} sur {p.total}). La cour d&apos;honneur peut tout de même décider.
          </Bandeau>
        )}
        <p className="m-0 text-[16px] text-crayon text-pretty">Validation de l&apos;étape : {step.val}</p>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-[15px] font-semibold">Décision</legend>
          <div role="radiogroup" className="grid grid-cols-2 border-[1.5px] border-encre">
            {(
              [
                ["reconnue", "Reconnue"],
                ["ajournee", "Ajournée"],
              ] as [Decision, string][]
            ).map(([d, label], k) => {
              const on = decision === d;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setDecision(d)}
                  className={cx("flex min-h-12 items-center justify-center gap-2.5 text-[17px] font-semibold", k > 0 && "border-l-[1.5px] border-encre", on ? "bg-sentier text-white" : "bg-fond text-encre")}
                >
                  <span aria-hidden="true" className={cx("flex size-[18px] items-center justify-center rounded-full border-2", on ? "border-white" : "border-crayon")}>
                    {on && <span className="size-2 rounded-full bg-white" />}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {vote && (
          <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
            <legend className="w-full">
              <TitreSection as="h3">Le vote</TitreSection>
            </legend>
            <div className="grid grid-cols-2 gap-6">
              <label className={labelClass}>
                Membres présents
                <input type="number" inputMode="numeric" min={1} max={99} value={presents} onChange={(e) => setPresents(e.target.value)} className={cx(fieldClass, "font-mono")} />
              </label>
              <label className={labelClass}>
                Voix pour
                <input type="number" inputMode="numeric" min={0} max={99} value={voixPour} onChange={(e) => setVoixPour(e.target.value)} className={cx(fieldClass, "font-mono")} />
              </label>
            </div>
            {majorite !== null && (
              <Bandeau ton={majorite ? "ok" : "erreur"}>
                {voixPour} voix sur {presents} : la majorité des {majoriteLabel(vote.majorite)} {majorite ? "est atteinte." : "n'est pas atteinte."}
              </Bandeau>
            )}
            <Check checked={tousPresents} onChange={setTousPresents} label="Tous les membres étaient présents, avec les animateurs du groupe" />
            <Check checked={parentsConsultes} onChange={setParentsConsultes} label="Parents (et professeurs ou patron) consultés" />
            <p className="m-0 text-[15px] text-crayon text-pretty">Le vote est secret : seuls les totaux sont gardés, jamais qui a voté quoi.</p>
          </fieldset>
        )}

        <div className="grid grid-cols-2 gap-6">
          <label className={labelClass}>
            Date
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} className={cx(fieldClass, "font-mono")} />
          </label>
          <label className={labelClass}>
            Nom et prénom du CT
            <input value={ct} onChange={(e) => setCt(e.target.value)} maxLength={80} className={fieldClass} />
          </label>
        </div>
        <label className={labelClass}>
          Observations de la cour d&apos;honneur
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            maxLength={MAX_OBS}
            rows={3}
            placeholder="Ce que la cour d'honneur retient du jeune, et ce qu'elle lui conseille"
            className="w-full resize-y border-0 border-b-[1.5px] border-encre bg-transparent px-0 py-2 text-[17px] font-normal leading-[1.6] text-encre placeholder:text-crayon"
          />
        </label>
      </div>
    </AppShell>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-[16px]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-6 flex-none accent-[var(--color-sentier)]" />
      <span className="text-pretty">{label}</span>
    </label>
  );
}
