"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Bar, Card, cx, List, OutlineButton, rowClass, Section, SectionLabel } from "@/components/ui";
import { canValidate } from "@/lib/access";
import { useJeuneRoute } from "@/lib/useJeune";
import { useStore } from "@/lib/store";
import { BRANCHES } from "@/lib/referentiels";
import { ageOf, ceremonies, dateRemise, fullName, historiqueUnites, type Jeune } from "@/lib/mock";
import { critStatus, isValidated, pct, plural, progressOf, type CritStatus, type DomaineProgress, type Progress } from "@/lib/progress";
import { fmtDayMonth, fmtShort, fmtWhen } from "@/lib/dates";

export default function Fiche() {
  const { ok, j, home } = useJeuneRoute();
  const store = useStore();
  const router = useRouter();
  if (!ok) return null;

  const { vals, role, steps } = store;
  const cadre = canValidate(role);
  const B = BRANCHES[j.branche];
  const p = progressOf(j, steps, vals);
  const age = ageOf(j);

  return (
    <AppShell
      kicker={B.unit}
      title={fullName(j)}
      back={home}
      branch={j.branche}
      banner
      foot={cadre && p.step ? { label: p.brevets ? "Valider des brevets" : "Valider des preuves", onClick: () => router.push(`/jeunes/${j.id}/valider`) } : undefined}
    >
      <div className="flex flex-col gap-[22px] px-4 pb-6 pt-[18px]">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] text-muted">{age === null ? B.unit : `${age} ans · ${B.unit}`}</span>
          {!cadre && (
            <span className="mt-1.5 self-start rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-semibold text-muted">Lecture seule</span>
          )}
        </div>

        <Chemin j={j} p={p} />

        {p.step && (
          <Card className="flex flex-col gap-2.5 p-4">
            <SectionLabel>Étape en cours</SectionLabel>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[22px] font-extrabold tracking-[-0.01em]">{p.step.name}</span>
              <span className="font-mono text-[14px] font-semibold text-acc-text">
                {p.done} / {p.total}
              </span>
            </div>
            <Bar value={pct(p.done, p.total)} height={8} />
            {p.brevets && (
              <span className="text-[13px] font-semibold text-ink">
                {p.brevets.obtenus} {plural(p.brevets.obtenus, "brevet obtenu", "brevets obtenus")} · {p.brevets.series}{" "}
                {plural(p.brevets.series, "série", "séries")} sur 2
              </span>
            )}
            {p.step.rule && <span className="text-[13px] text-ink">Règle : {p.step.rule}</span>}
            <span className="text-[13px] text-muted text-pretty">Validation de l&apos;étape : {p.step.val}</span>
            {p.complete && (
              <span className="rounded-ui bg-acc-soft px-2.5 py-2 text-[13px] font-semibold text-acc-text">
                Étape réussie · à présenter à la cour d&apos;honneur du {fmtDayMonth(ceremonies().courHonneur)}
              </span>
            )}
            {cadre && (
              <label className="mt-1 flex items-center justify-between gap-3 border-t border-line pt-3 text-[13px] text-muted">
                Corriger l&apos;étape du jeune
                <select
                  value={p.step.id}
                  onChange={(e) => {
                    const next = p.steps.find((s) => s.id === e.target.value);
                    store.updateJeune(j.id, { etapeId: e.target.value });
                    if (next) store.showToast(`${j.prenom} : étape ${next.name}`);
                  }}
                  className="h-10 rounded-ui border border-line-strong bg-surface px-2.5 text-[14px] font-semibold text-ink"
                >
                  {p.steps.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </Card>
        )}

        {p.step && <Programme j={j} p={p} cadre={cadre} />}

        {cadre && p.choixPossibles.length > 0 && <ChoixJeune j={j} p={p} />}

        <Section label="Spécialités et badges">
          {j.specs.length ? (
            <div className="flex flex-wrap gap-2">
              {j.specs.map((sp) => (
                <div key={sp.name} className="flex flex-col gap-0.5 rounded-full border border-line bg-surface px-3 py-2">
                  <span className="text-[14px] font-semibold">{sp.name}</span>
                  <span className="font-mono text-[12px] text-muted">{sp.meta}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[14px] text-muted">Aucune spécialité ni badge pour l&apos;instant.</span>
          )}
        </Section>

        <Section label="Historique des unités">
          <div className="flex flex-col">
            {historiqueUnites(j).map((h) => (
              <div key={h.unit} className="flex justify-between gap-3 border-b border-line py-1.5 text-[14px]">
                <span>{h.unit}</span>
                <span className="font-mono text-[12px] text-muted">{h.period}</span>
              </div>
            ))}
          </div>
        </Section>

        <OutlineButton onClick={() => router.push(`/jeunes/${j.id}/carnet`)} className="h-12 bg-surface text-[15px]">
          Voir le carnet PDF
        </OutlineButton>
      </div>
    </AppShell>
  );
}

/** Le chemin : étapes franchies, soleil sur l'étape en cours. */
function Chemin({ j, p }: { j: Jeune; p: Progress }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0" aria-label="Étapes">
      {p.steps.map((s, k) => {
        const done = k < p.index;
        const cur = k === p.index;
        const last = k === p.steps.length - 1;
        const dotColor = done ? "var(--acc)" : cur ? "#F2B400" : undefined;
        const remise = done ? dateRemise(j, k, p.index) : null;
        return (
          <li key={s.id} className="flex gap-3.5" aria-current={cur ? "step" : undefined}>
            <div className="flex w-[22px] flex-none flex-col items-center">
              <span
                className={cx("mt-[3px] flex-none rounded-full border-[3px]", !dotColor && "border-line-strong")}
                style={{ width: cur ? 20 : 14, height: cur ? 20 : 14, background: dotColor ?? "transparent", borderColor: dotColor }}
              />
              <span
                className="min-h-4 w-0 flex-1 border-l-[3px]"
                style={{ borderLeftStyle: done ? "solid" : "dashed", borderLeftColor: last ? "transparent" : done ? "var(--acc)" : "var(--color-line-strong)" }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-px pb-3.5">
              <span className={cx(cur ? "text-[18px] font-extrabold" : "text-[15px] font-medium", k > p.index ? "text-muted" : "text-ink")}>{s.name}</span>
              <span className="font-mono text-[12px] text-muted">
                {done ? (remise ? `Remise le ${fmtShort(remise, true)}` : "Franchie") : cur ? `En cours · ${p.done}/${p.total}` : "À venir"}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Preuves à réussir à cette étape, domaine par domaine, avec la façon dont le jeune les a réussies. */
function Programme({ j, p, cadre }: { j: Jeune; p: Progress; cadre: boolean }) {
  const label = p.brevets ? "Brevets du jeune" : `Preuves · ${p.step?.name}`;
  if (!p.domaines.length) {
    return (
      <Section label={label}>
        <span className="text-[14px] text-muted text-pretty">
          {p.brevets ? `Aucun brevet choisi. Choisissez ci-dessous les brevets que ${j.prenom} prépare.` : "Aucune preuve au programme."}
        </span>
      </Section>
    );
  }
  return (
    <Section label={label}>
      <div className="flex flex-col gap-2">
        {p.domaines.map((d) => (
          <DomaineBloc key={d.domaine.id} j={j} d={d} cadre={cadre} brevets={!!p.brevets} />
        ))}
      </div>
    </Section>
  );
}

function DomaineBloc({ j, d, cadre, brevets }: { j: Jeune; d: DomaineProgress; cadre: boolean; brevets: boolean }) {
  const store = useStore();
  const consigne = d.domaine.min && !brevets ? ` · ${d.domaine.min} au choix` : "";
  return (
    <details open={!d.complete} className="group overflow-hidden rounded-card border border-line bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3.5 py-2">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-bold">{d.domaine.name}</span>
          <span className="font-mono text-[12px] text-muted">
            {brevets ? `${d.validated} / ${d.preuves.length} ${plural(d.preuves.length, "brevet", "brevets")}` : `${Math.min(d.validated, d.required)} / ${d.required}${consigne}`}
          </span>
        </span>
        {d.complete && <span className="rounded-full bg-acc-soft px-2.5 py-1 text-[12px] font-bold text-acc-text">Complet</span>}
        <span className="text-[14px] text-muted group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="flex flex-col border-t border-rule [&>*:last-child]:border-b-0">
        {d.preuves.map((x) => (
          <PreuveRow key={x.id} label={x.label} r={critStatus(store.vals, j.id, x.id)} cadre={cadre} unite={x.unite} />
        ))}
      </div>
    </details>
  );
}

function PreuveRow({ label, r, cadre, unite }: { label: string; r: CritStatus; cadre: boolean; unite: boolean }) {
  const store = useStore();
  const checked = isValidated(r);
  const pend = r.st === "pending";
  const tappable = checked && cadre;
  let meta = unite ? "Preuve de l'unité · à réussir" : "À réussir";
  let metaCls = "text-muted";
  if (checked) {
    meta = pend ? `${fmtWhen(r.v.date)} · en attente de réseau` : `${fmtWhen(r.v.date)} · ${r.v.validePar}`;
    metaCls = pend ? "text-wait-text" : "text-muted";
  } else if (r.st === "cancelled") {
    meta = `Annulée le ${fmtShort(r.v.annuleeLe!)} · à revalider`;
    metaCls = "text-err-ink";
  }
  const comment = checked ? r.v.commentaire : undefined;
  const Row = tappable ? "button" : "div";
  return (
    <Row
      {...(tappable ? { type: "button" as const, onClick: () => store.openCancelSheet(r.v.id), "aria-label": `${label}, réussie. Annuler cette validation` } : {})}
      className={`${rowClass} min-h-14 gap-3 py-2`}
    >
      <span
        className={cx(
          "flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 text-[14px] font-extrabold",
          !checked && "border-line-strong bg-transparent",
          pend && "border-wait-dot bg-wait-bg text-wait-ink",
          checked && !pend && "border-acc bg-acc text-acc-ink",
        )}
        aria-hidden
      >
        {checked ? "✓" : ""}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cx("text-[14px] font-medium text-pretty", r.st === "cancelled" ? "text-muted" : "text-ink")}>{label}</span>
        <span className={cx("font-mono text-[12px]", metaCls)}>{meta}</span>
        {comment && <span className="text-[13px] text-ink text-pretty">« {comment} »</span>}
      </span>
      {tappable && (
        <span className="text-[18px] text-muted" aria-hidden>
          ⋯
        </span>
      )}
    </Row>
  );
}

/** Domaines au choix (ou brevets, pour Technicien) retenus pour ce jeune. */
function ChoixJeune({ j, p }: { j: Jeune; p: Progress }) {
  const store = useStore();
  const toggle = (id: string) => store.updateJeune(j.id, { choix: j.choix.includes(id) ? j.choix.filter((x) => x !== id) : [...j.choix, id] });
  const entamés = new Set(p.domaines.filter((d) => d.validated > 0).map((d) => d.domaine.id));
  const groupes = [...new Set(p.choixPossibles.map((c) => c.groupe ?? ""))];
  return (
    <Section label={p.brevets ? "Brevets préparés" : "Domaines au choix"}>
      <span className="text-[14px] text-muted text-pretty">
        {p.brevets
          ? `Choisissez les brevets que ${j.prenom} prépare : au moins 3, dans 2 séries différentes.`
          : `Cochez les domaines que ${j.prenom} prépare. Leurs preuves comptent dans son étape.`}
      </span>
      {groupes.map((g) => (
        <div key={g || "domaines"} className="flex flex-col gap-1.5">
          {g && <span className="text-[12px] font-semibold text-muted">{g}</span>}
          <div className="flex flex-wrap gap-2">
            {p.choixPossibles
              .filter((c) => (c.groupe ?? "") === g)
              .map((c) => {
                const acquis = p.brevets ? isValidated(critStatus(store.vals, j.id, c.id)) : entamés.has(c.id);
                const on = acquis || j.choix.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    disabled={acquis}
                    onClick={() => toggle(c.id)}
                    className={cx(
                      "min-h-10 rounded-full border px-3 py-1.5 text-left text-[14px] font-semibold",
                      on ? "border-acc bg-acc-soft text-acc-text" : "border-line-strong bg-surface text-muted",
                    )}
                  >
                    {on ? "✓ " : "+ "}
                    {c.label}
                    {acquis && <span className="font-normal">{p.brevets ? " · obtenu" : " · entamé"}</span>}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </Section>
  );
}
