"use client";

import { useState } from "react";
import { AppShell, type FootAction } from "../AppShell";
import { AddInput, EtapeEditor, type Edit } from "./RefEditor";
import { UnitEpreuves } from "../UnitEpreuves";
import { cx } from "../ui";
import { Bandeau, Bouton, CheminDebut } from "../carte";
import { useStore } from "@/lib/store";
import { uuid } from "@/lib/mock";
import { addEtape } from "@/lib/refEditor";
import { plural } from "@/lib/progress";
import { BRANCHES, REF_TITLES, type BranchCode } from "@/lib/referentiels";

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
      <div className="flex flex-col gap-4 px-4 pb-10 lg:px-0">
        {withUnits && <ModeSwitch mode={mode} onChange={setMode} />}
        <div role="tablist" aria-label="Branche" className="flex border-b-4 border-double border-encre">
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
                  "-mb-1 flex min-h-12 items-center gap-1.5 border-b-4 bg-transparent px-4 text-[17px] text-encre",
                  on ? "border-soleil font-bold" : "border-transparent",
                )}
              >
                {BRANCHES[b].name}
                {ref.draft[b] && <span className="text-[13px] font-normal text-crayon">(brouillon)</span>}
              </button>
            );
          })}
        </div>

        {mode === "unite" ? (
          <>
            <h2 className="m-0 text-section font-extrabold">{store.unitesNoms[rb]}</h2>
            <UnitEpreuves key={rb} branche={rb} />
          </>
        ) : routeEmpty ? (
          <div className="flex flex-col items-start gap-3 pt-4">
            <CheminDebut largeur={44} />
            <h2 className="m-0 text-[24px] font-extrabold leading-tight">La route n&apos;a pas encore de référentiel.</h2>
            <p className="m-0 text-[17px] text-pretty">
              La route arrive en V2 ; le document officiel est demandé aux cadres de la branche. Aucune preuve ne peut être validée tant qu&apos;une version n&apos;est pas publiée.
            </p>
            <Bouton
              onClick={() => {
                store.updateRef((r) => ({ ...r, routeCreated: true }));
                store.log({ action: "creation", table: "referentiels", ligne: "route-v1", resume: "Référentiel de la route créé (vide, version 1)", apres: { version: 1, actif: false } });
              }}
            >
              Créer un référentiel vide
            </Bouton>
            <p className="m-0 text-[15px] text-crayon">Tout reste en brouillon, invisible des cadres, jusqu&apos;à la publication.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-0.5">
              <h2 className="m-0 text-section font-extrabold">{REF_TITLES[rb]}</h2>
              <span className="font-mono text-[14px] text-crayon">
                Version {ver} · publiée · {nbValidations} {plural(nbValidations, "validation", "validations")}
              </span>
              {rb === "meute" && <span className="mt-1 text-[15px] text-crayon text-pretty">Base proposée : chaque chef de meute peut adapter les preuves de son unité.</span>}
            </div>

            {draft && (
              <Bandeau>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-pretty">
                    <strong>Brouillon de la version {ver + 1}</strong> · invisible des cadres. La version {ver} reste en usage.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      store.discardDraft(rb);
                      store.showToast("Brouillon abandonné");
                    }}
                    className="min-h-11 flex-none border-[1.5px] border-encre bg-transparent px-3 text-[14px] font-semibold text-encre"
                  >
                    Abandonner le brouillon
                  </button>
                </span>
              </Bandeau>
            )}

            {steps.length > 0 && (
              <div className="flex flex-col border-t border-ligne">
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
    <div role="tablist" aria-label="Ce que vous modifiez" className="grid grid-cols-2">
      {MODES.map(([m, label]) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => onChange(m)}
          className={cx("min-h-11 border-[1.5px] border-encre px-3 text-[15px] font-semibold", m !== MODES[0][0] && "-ml-[1.5px]", mode === m ? "bg-encre text-fond" : "bg-transparent text-encre")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
