"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Bandeau, Bouton, Cartouche, Sentier, TitreSection, TracePreuves, type EtapeSentier, type Preuve } from "@/components/carte";
import { cx } from "@/components/ui";
import { canValidate } from "@/lib/access";
import { useJeuneRoute } from "@/lib/useJeune";
import { useStore } from "@/lib/store";
import { ageOf, ceremonies, dateRemise, fullName, historiqueUnites, type Jeune } from "@/lib/mock";
import { PhotosValidation } from "@/components/photos/PhotosValidation";
import { critStatus, isValidated, plural, progressOf, type DomaineProgress, type Progress } from "@/lib/progress";
import { fmtDayMonth, fmtMoisAn, fmtPoint } from "@/lib/dates";
import { dateReconnue, historique, type Reconnaissance } from "@/lib/courHonneur";
import { jeuneHref } from "@/lib/routes";

export default function Fiche() {
  const { ok, j, home } = useJeuneRoute();
  const store = useStore();
  const router = useRouter();
  if (!ok) return null;

  const { vals, role, steps } = store;
  const cadre = canValidate(role);
  const p = progressOf(j, steps, vals);
  const age = ageOf(j);
  const unite = store.unitesNoms[j.branche];

  return (
    <AppShell
      kicker={unite}
      title={fullName(j)}
      back={home}
      branch={j.branche}
      banner
      titreDansPage
      aDroite={
        <Link href={jeuneHref(j.id, "carnet")} className="flex min-h-11 items-center px-1 text-[17px] text-encre underline underline-offset-4">
          Carnet PDF
        </Link>
      }
      foot={cadre && p.step ? { label: p.brevets ? "Valider des brevets" : "Valider des preuves", onClick: () => router.push(jeuneHref(j.id, "valider")) } : undefined}
    >
      <div className="flex flex-col gap-5 px-4 pb-8 pt-2 lg:px-0">
        <Cartouche
          titre={fullName(j)}
          sousTitre={[age === null ? null : `${age} ans`, unite, cadre ? null : "lecture seule"].filter(Boolean).join(" · ")}
          libelle={p.step ? "étape" : undefined}
          valeur={p.step?.name}
        />

        <Sentier etapes={etapesSentier(j, p, store.recons)} className="mt-1" />

        {p.step && (
          <div className="flex flex-col gap-3">
            <p className="m-0 border-l-4 border-encre pl-3 text-[17px] text-pretty">
              {p.step.rule ? `${p.step.name} : ${p.step.rule}` : p.step.name}
              <span className="block text-[15px] text-crayon">Validation de l&apos;étape : {p.step.val}</span>
            </p>
            {p.brevets && (
              <p className="m-0 font-mono text-[14px]">
                {p.brevets.obtenus} {plural(p.brevets.obtenus, "brevet obtenu", "brevets obtenus")} · {p.brevets.series} {plural(p.brevets.series, "série", "séries")} sur 2
              </p>
            )}
            {p.complete && (
              <Bandeau ton="ok">
                <strong>Étape réussie.</strong> À présenter à la cour d&apos;honneur du {fmtDayMonth(ceremonies().courHonneur)}.
              </Bandeau>
            )}
          </div>
        )}

        {p.step && <Programme j={j} p={p} cadre={cadre} />}

        {cadre && p.choixPossibles.length > 0 && <ChoixJeune j={j} p={p} />}

        <CoursHonneur list={historique(store.recons, j.id)} steps={p.steps} />

        <section>
          <TitreSection>Spécialités et badges</TitreSection>
          {j.specs.length ? (
            <ul className="m-0 list-none p-0">
              {j.specs.map((sp) => (
                <li key={sp.name} className="flex items-baseline justify-between gap-3 border-b border-ligne py-2.5">
                  <span className="text-[16px]">{sp.name}</span>
                  <span className="font-mono text-[13px] text-crayon">{sp.meta}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 py-2.5 text-[16px] text-crayon">Aucune spécialité ni badge pour l&apos;instant.</p>
          )}
        </section>

        <section>
          <TitreSection>Historique des unités</TitreSection>
          <ul className="m-0 list-none p-0">
            {historiqueUnites(j, store.unitesNoms).map((h) => (
              <li key={h.unit} className="flex items-baseline justify-between gap-3 border-b border-ligne py-2.5">
                <span className="text-[16px]">{h.unit}</span>
                <span className="font-mono text-[13px] text-crayon">{h.period}</span>
              </li>
            ))}
          </ul>
        </section>

        {cadre && p.step && <GererEtape j={j} p={p} />}
      </div>
    </AppShell>
  );
}

/** Étapes du sentier : franchie (avec le mois de remise), en cours (preuves faites), à venir. */
function etapesSentier(j: Jeune, p: Progress, recons: Reconnaissance[]): EtapeSentier[] {
  return p.steps.map((s, k) => {
    if (k < p.index) {
      const remise = dateReconnue(recons, j.id, s.id) ?? dateRemise(j, k, p.index);
      return { nom: s.name, etat: "franchie", note: remise ? fmtMoisAn(remise) : undefined };
    }
    if (k === p.index) return { nom: s.name, etat: "en-cours", note: `${p.done}/${p.total}` };
    return { nom: s.name, etat: "a-venir" };
  });
}

/** Preuves à réussir à cette étape, domaine par domaine, avec la façon dont le jeune les a réussies. */
function Programme({ j, p, cadre }: { j: Jeune; p: Progress; cadre: boolean }) {
  if (!p.domaines.length) {
    return (
      <section>
        <TitreSection>{p.brevets ? "Brevets du jeune" : "Preuves"}</TitreSection>
        <p className="m-0 py-2.5 text-[16px] text-crayon text-pretty">
          {p.brevets ? `Aucun brevet choisi. Choisissez ci-dessous les brevets que ${j.prenom} prépare.` : "Aucune preuve au programme."}
        </p>
      </section>
    );
  }
  return (
    <>
      {p.domaines.map((d) => (
        <DomaineBloc key={d.domaine.id} j={j} d={d} cadre={cadre} brevets={!!p.brevets} />
      ))}
    </>
  );
}

function DomaineBloc({ j, d, cadre, brevets }: { j: Jeune; d: DomaineProgress; cadre: boolean; brevets: boolean }) {
  const store = useStore();
  const consigne = d.domaine.min && !brevets ? ` · ${d.domaine.min} au choix` : "";
  const compte = brevets ? `${d.validated}/${d.preuves.length}` : `${Math.min(d.validated, d.required)}/${d.required}${consigne}`;
  const validations = new Map<string, string>();

  const preuves: Preuve[] = d.preuves.map((x) => {
    const r = critStatus(store.vals, j.id, x.id);
    const libelle = x.unite ? `${x.label} (preuve de l'unité)` : x.label;
    if (r.st === "cancelled") return { id: x.id, libelle, annulee: fmtPoint(r.v.annuleeLe!) };
    if (!isValidated(r)) return { id: x.id, libelle };
    validations.set(x.id, r.v.id);
    return {
      id: x.id,
      libelle,
      date: fmtPoint(r.v.date),
      cadre: r.v.validePar,
      note: r.v.commentaire,
      attente: r.st === "pending",
      suite: <PhotosValidation jeuneId={j.id} validationId={r.v.id} preuve={x.label} />,
    };
  });

  const ouvrir = (p: Preuve) => {
    const v = validations.get(p.id);
    if (v) store.openCancelSheet(v);
  };

  return (
    <section>
      <TitreSection aDroite={compte}>{d.domaine.name}</TitreSection>
      <TracePreuves preuves={preuves} onOuvrir={cadre ? ouvrir : undefined} />
    </section>
  );
}

/** Domaines au choix (ou brevets, pour Technicien) retenus pour ce jeune. */
function ChoixJeune({ j, p }: { j: Jeune; p: Progress }) {
  const store = useStore();
  const toggle = (id: string) => store.updateJeune(j.id, { choix: j.choix.includes(id) ? j.choix.filter((x) => x !== id) : [...j.choix, id] });
  const entamés = new Set(p.domaines.filter((d) => d.validated > 0).map((d) => d.domaine.id));
  const groupes = [...new Set(p.choixPossibles.map((c) => c.groupe ?? ""))];
  return (
    <section className="flex flex-col gap-3">
      <TitreSection>{p.brevets ? "Brevets préparés" : "Domaines au choix"}</TitreSection>
      <p className="m-0 text-[16px] text-crayon text-pretty">
        {p.brevets
          ? `Choisissez les brevets que ${j.prenom} prépare : au moins 3, dans 2 séries différentes.`
          : `Cochez les domaines que ${j.prenom} prépare. Leurs preuves comptent dans son étape.`}
      </p>
      {groupes.map((g) => (
        <div key={g || "domaines"} className="flex flex-col gap-1.5">
          {g && <span className="text-[14px] font-semibold">{g}</span>}
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
                      "min-h-11 border-[1.5px] px-3 py-1.5 text-left text-[15px]",
                      on ? "border-sentier bg-ok-fond font-semibold text-encre" : "border-encre bg-fond text-encre",
                    )}
                  >
                    {on ? "✓ " : "+ "}
                    {c.label}
                    {acquis && <span className="font-normal text-crayon">{p.brevets ? " · obtenu" : " · entamé"}</span>}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </section>
  );
}

/** Décisions de la cour d'honneur, comme les encadrés « Observations » du carnet papier. */
function CoursHonneur({ list, steps }: { list: Reconnaissance[]; steps: Progress["steps"] }) {
  if (!list.length) return null;
  return (
    <section>
      <TitreSection>Cours d&apos;honneur</TitreSection>
      <ul className="m-0 list-none p-0">
        {list.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 border-b border-ligne py-2.5">
            <span className="flex items-baseline justify-between gap-3">
              <strong className="text-[16px]">{steps.find((s) => s.id === r.etapeId)?.name ?? "Étape"}</strong>
              <span className={cx("text-[15px] font-semibold", r.decision === "reconnue" ? "text-sentier" : "text-erreur")}>
                {r.decision === "reconnue" ? "Reconnue" : "Ajournée"}
              </span>
            </span>
            <span className="font-mono text-[13px] text-crayon">
              {fmtPoint(r.date, true)} · {r.ct}
              {r.presents ? ` · ${r.voixPour} voix sur ${r.presents}` : ""}
              {r.pending ? " · en attente de réseau" : ""}
            </span>
            {r.observations && <span className="font-note text-[15px] italic text-annotation text-pretty">{r.observations}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Gestes de cadre sur l'étape : cour d'honneur, correction de l'étape. */
function GererEtape({ j, p }: { j: Jeune; p: Progress }) {
  const store = useStore();
  const router = useRouter();
  return (
    <section className="flex flex-col gap-3">
      <TitreSection>Étape</TitreSection>
      <Bouton variante={p.complete ? "primaire" : "secondaire"} onClick={() => router.push(jeuneHref(j.id, "cour"))} className="w-full lg:w-auto lg:self-start">
        {p.complete ? "Présenter à la cour d'honneur" : "Saisir une décision de cour d'honneur"}
      </Bouton>
      <label className="flex flex-wrap items-center justify-between gap-3 text-[16px]">
        Corriger l&apos;étape du jeune
        <select
          value={p.step!.id}
          onChange={(e) => {
            const next = p.steps.find((s) => s.id === e.target.value);
            store.updateJeune(j.id, { etapeId: e.target.value });
            if (next) store.showToast(`${j.prenom} : étape ${next.name}`);
          }}
          className="h-11 border-0 border-b-[1.5px] border-encre bg-transparent pr-6 text-[17px] font-semibold text-encre"
        >
          {p.steps.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
