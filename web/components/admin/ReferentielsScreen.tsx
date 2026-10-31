"use client";

import { useState } from "react";
import { AppShell, type FootAction } from "../AppShell";
import { AddInput, EtapeEditor, type Edit } from "./RefEditor";
import { UnitEpreuves } from "../UnitEpreuves";
import { cx, OutlineButton } from "../ui";
import { useStore } from "@/lib/store";
import { uuid } from "@/lib/mock";
import { addEtape } from "@/lib/refEditor";
import { plural } from "@/lib/progress";
import { BRANCHES, BRANCH_COLORS, REF_TITLES, type BranchCode } from "@/lib/referentiels";

const ORDER: BranchCode[] = ["meute", "troupe", "route"];

type Mode = "referentiel" | "unite";

interface ReferentielsScreenProps {
  kicker: string;
  title: string;
  /** Ajoute la gestion des adaptations de chaque unité (responsable progression). */
  withUnits?: boolean;
}

/** Référentiel de chaque branche : brouillon, puis publication d'une nouvelle version. */
export function ReferentielsScreen({ kicker, title, withUnits = false }: ReferentielsScreenProps) {
  const store = useStore();
  const [rb, setRb] = useState<BranchCode>("troupe");
  const [open, setOpen] = useState(0);
  const [mode, setMode] = useState<Mode>("referentiel");

  const { ref, refSteps, refVersion } = store;
  const RB = BRANCHES[rb];
  const draft = ref.draft[rb];
  const steps = draft ?? refSteps[rb];
  const ver = refVersion[rb];
  const routeEmpty = rb === "route" && !ref.routeCreated && !steps.length;
  const edit: Edit = (fn) => store.editDraft(rb, fn);
  const branchIds = new Set(store.jeunes.filter((j) => j.branche === rb).map((j) => j.id));
  const nbValidations = store.vals.filter((v) => branchIds.has(v.jeuneId) && !v.annuleeLe).length;

  let foot: FootAction | undefined;
  if (draft && mode === "referentiel") {
    foot = {
      label: `Publier la version ${ver + 1}`,
      note: "Les validations faites restent attachées à leurs preuves ; une preuve archivée reste dans l'historique.",
      onClick: () => {
        store.publishDraft(rb);
        store.showToast(`Version ${ver + 1} publiée pour la ${RB.name.toLowerCase()}`);
      },
    };
  }

  return (
    <AppShell kicker={kicker} title={title} branch={rb} foot={foot}>
      <div className="flex flex-col gap-4 p-4">
        {withUnits && <ModeSwitch mode={mode} onChange={setMode} />}
        <div role="tablist" aria-label="Branche" className="grid grid-cols-3 gap-1 rounded-ui bg-track p-1">
          {ORDER.map((b) => {
            const on = b === rb;
            return (
              <button
                key={b}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setRb(b);
                  setOpen(0);
                }}
                className={cx(
                  "flex h-10 items-center justify-center gap-1.5 rounded-ui text-[14px] font-bold",
                  on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.1)]" : "bg-transparent text-muted",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: BRANCH_COLORS[b].acc }} />
                {BRANCHES[b].name}
                {ref.draft[b] && <span className="h-1.5 w-1.5 rounded-full bg-wait-dot" aria-label="brouillon" />}
              </button>
            );
          })}
        </div>

        {mode === "unite" ? (
          <>
            <span className="text-[17px] font-bold">{store.unitesNoms[rb]}</span>
            <UnitEpreuves key={rb} branche={rb} />
          </>
        ) : routeEmpty ? (
          <div className="flex flex-col items-start gap-2.5 rounded-card border border-dashed border-line-strong px-5 py-6">
            <span className="text-[17px] font-bold">Référentiel de la route non reçu</span>
            <span className="text-[14px] text-muted text-pretty">
              La route arrive en V2. Le document officiel est demandé aux cadres de la branche. Vous pouvez préparer un référentiel vide en attendant.
            </span>
            <OutlineButton
              onClick={() => {
                store.updateRef((r) => ({ ...r, routeCreated: true }));
                store.log({ action: "creation", table: "referentiels", ligne: "route-v1", resume: "Référentiel de la route créé (vide, version 1)", apres: { version: 1, actif: false } });
              }}
              className="h-11 bg-transparent px-4 text-[14px]"
            >
              Créer un référentiel vide
            </OutlineButton>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="text-[17px] font-bold">{REF_TITLES[rb]}</span>
              <span className="num text-[13px] text-muted">
                Version {ver} · publiée · {nbValidations} {plural(nbValidations, "validation", "validations")}
              </span>
              {rb === "meute" && <span className="mt-1 text-[13px] text-muted text-pretty">Base proposée : chaque chef de meute peut adapter les preuves de son unité.</span>}
            </div>

            {draft && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-ui bg-wait-bg px-3.5 py-2.5 text-[13px] text-wait-ink">
                <span className="text-pretty">Brouillon non publié : les cadres voient encore la version {ver}.</span>
                <button
                  type="button"
                  onClick={() => {
                    store.discardDraft(rb);
                    store.showToast("Brouillon abandonné");
                  }}
                  className="h-8 flex-none rounded-full border border-wait-dot bg-transparent px-3 text-[12px] font-bold"
                >
                  Abandonner le brouillon
                </button>
              </div>
            )}

            {steps.length > 0 && (
              <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface [&>*:last-child]:border-b-0">
                {steps.map((s, i) => (
                  <EtapeEditor key={s.id} step={s} index={i} edit={edit} isOpen={open === i} onOpen={() => setOpen(open === i ? -1 : i)} />
                ))}
              </div>
            )}
            <AddInput placeholder="Nouvelle étape" onAdd={(name) => edit((s) => addEtape(s, name, `${rb}.e${uuid().slice(0, 8)}`))} />
          </>
        )}
      </div>
    </AppShell>
  );
}

const MODES: [Mode, string][] = [
  ["referentiel", "Référentiel de branche"],
  ["unite", "Épreuves de l'unité"],
];

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div role="tablist" aria-label="Ce que vous modifiez" className="grid grid-cols-2 gap-1 rounded-ui border border-line bg-surface p-1">
      {MODES.map(([m, label]) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => onChange(m)}
          className={cx("h-10 rounded-ui text-[14px] font-bold", mode === m ? "bg-ink text-white" : "bg-transparent text-muted")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
