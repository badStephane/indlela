"use client";

import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cx } from "@/components/ui";
import { canValidate } from "@/lib/access";
import { useJeuneRoute } from "@/lib/useJeune";
import { useBack } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { CURRENT_CADRE, fullName } from "@/lib/mock";
import { progressOf } from "@/lib/progress";
import { decisionPossible, etapeSuivante, majoriteAtteinte, type Decision } from "@/lib/courHonneur";
import { toISODate } from "@/lib/dates";

const fieldClass = "h-11 rounded-ui border border-line-strong bg-surface px-3 text-[15px] font-normal text-ink outline-none focus:border-ink";
const MAX_OBS = 1000;

/** Décision de la cour d'honneur sur l'étape en cours d'un jeune. */
export default function CourHonneur() {
  const { ok, j } = useJeuneRoute(canValidate);
  const store = useStore();
  const today = toISODate(new Date());
  const [decision, setDecision] = useState<Decision>("reconnue");
  const [date, setDate] = useState(today);
  const [observations, setObservations] = useState("");
  const [ct, setCt] = useState(CURRENT_CADRE.full);
  const [presents, setPresents] = useState("");
  const [voixPour, setVoixPour] = useState("");
  const [tousPresents, setTousPresents] = useState(false);
  const [parentsConsultes, setParentsConsultes] = useState(false);
  const submitted = useRef(false);
  const back = useBack(j ? `/jeunes/${j.id}` : "/unite");
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

  return (
    <AppShell
      kicker={`Cour d'honneur · ${fullName(j)}`}
      title={step.name}
      back={`/jeunes/${j.id}`}
      branch={j.branche}
      banner
      foot={{
        label: decision === "reconnue" ? `Reconnaître l'étape ${step.name}` : "Enregistrer l'ajournement",
        disabled: !ready,
        onClick: save,
        note: !check.ok ? check.raison : decision === "reconnue" ? (next ? `${j.prenom} passera à l'étape ${next.name}.` : "C'est la dernière étape de la branche.") : undefined,
      }}
    >
      <div className="flex flex-col gap-4 p-4">
        {!p.complete && (
          <div className="rounded-ui bg-wait-bg px-3.5 py-3 text-[14px] text-wait-ink text-pretty">
            Toutes les preuves de l&apos;étape ne sont pas encore réussies ({p.done} sur {p.total}). La cour d&apos;honneur peut tout de même décider.
          </div>
        )}
        <span className="text-[14px] text-muted text-pretty">Validation de l&apos;étape : {step.val}</span>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-[13px] font-semibold">Décision</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["reconnue", "Étape reconnue"],
                ["ajournee", "Ajournée"],
              ] as [Decision, string][]
            ).map(([d, label]) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={decision === d}
                onClick={() => setDecision(d)}
                className={cx("h-12 rounded-ui border text-[15px] font-bold", decision === d ? "border-acc bg-acc-soft text-acc-text" : "border-line-strong bg-surface text-muted")}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {vote && (
          <fieldset className="m-0 flex flex-col gap-3 rounded-card border border-line bg-surface p-3.5">
            <legend className="px-1 text-[13px] font-semibold">Vote secret · {Math.round(vote.majorite * 4)}/4 des voix</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
                Membres présents
                <input type="number" inputMode="numeric" min={1} max={99} value={presents} onChange={(e) => setPresents(e.target.value)} className={fieldClass} />
              </label>
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
                Voix pour
                <input type="number" inputMode="numeric" min={0} max={99} value={voixPour} onChange={(e) => setVoixPour(e.target.value)} className={fieldClass} />
              </label>
            </div>
            {presents && voixPour && (
              <span className={cx("text-[13px] font-semibold", majoriteAtteinte(Number(presents), Number(voixPour), vote.majorite) ? "text-ok-ink" : "text-err-ink")}>
                {voixPour} voix sur {presents} : majorité {majoriteAtteinte(Number(presents), Number(voixPour), vote.majorite) ? "atteinte" : "non atteinte"}
              </span>
            )}
            <Check checked={tousPresents} onChange={setTousPresents} label="Tous les membres étaient présents, avec les animateurs du groupe" />
            <Check checked={parentsConsultes} onChange={setParentsConsultes} label="Parents (et professeurs ou patron) consultés" />
            <span className="text-[12px] text-muted text-pretty">Le vote est secret : seuls les totaux sont enregistrés, jamais qui a voté quoi.</span>
          </fieldset>
        )}

        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Observations de la cour d&apos;honneur
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            maxLength={MAX_OBS}
            rows={4}
            placeholder="Ce que la cour d'honneur retient du jeune, et ce qu'elle lui conseille"
            className="rounded-ui border border-line-strong bg-surface px-3 py-2.5 text-[15px] font-normal text-ink outline-none focus:border-ink"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Date de la cour d&apos;honneur
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Nom et prénom du CT
            <input value={ct} onChange={(e) => setCt(e.target.value)} maxLength={80} className={fieldClass} />
          </label>
        </div>
      </div>
    </AppShell>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-[14px]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 flex-none accent-[var(--acc)]" />
      <span className="text-pretty">{label}</span>
    </label>
  );
}
