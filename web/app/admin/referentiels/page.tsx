"use client";

import { useEffect, useState } from "react";
import { AppShell, type FootAction } from "@/components/AppShell";
import { cx, OutlineButton } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES, BRANCH_COLORS, REF_TITLES, type BranchCode } from "@/lib/referentiels";

const ORDER: BranchCode[] = ["meute", "troupe", "route"];
const VALIDATION_COUNTS: Partial<Record<BranchCode, number>> = { troupe: 214, meute: 96 };

export default function Referentiels() {
  const ok = useGuard((r) => r === "admin");
  const store = useStore();
  const [rb, setRb] = useState<BranchCode>("troupe");
  const [open, setOpen] = useState(1);

  useEffect(() => {
    if (ok) store.setLastTab("/admin/referentiels");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const { ref } = store;
  const RB = BRANCHES[rb];
  const routeEmpty = rb === "route" && !ref.routeCreated;
  const ver = ref.ver[rb];

  let foot: FootAction | undefined;
  if (ref.dirty[rb] && rb !== "route") {
    foot = {
      label: `Publier la version ${ver + 1}`,
      note: `Les validations faites restent attachées à la version ${ver}.`,
      onClick: () => {
        store.updateRef((r) => ({ ...r, ver: { ...r.ver, [rb]: ver + 1 }, dirty: { ...r.dirty, [rb]: false } }));
        store.showToast(`Version ${ver + 1} publiée pour la ${RB.name.toLowerCase()}`);
      },
    };
  }

  return (
    <AppShell kicker="Administration" title="Référentiels" branch={rb} foot={foot}>
      <div className="flex flex-col gap-4 p-4">
        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-ui bg-track p-1">
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
                  setOpen(b === "route" ? -1 : 1);
                }}
                className={cx(
                  "flex h-10 items-center justify-center gap-1.5 rounded-ui text-[14px] font-bold",
                  on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.1)]" : "bg-transparent text-muted",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: BRANCH_COLORS[b].acc }} />
                {BRANCHES[b].name}
              </button>
            );
          })}
        </div>

        {routeEmpty ? (
          <div className="flex flex-col items-start gap-2.5 rounded-card border border-dashed border-line-strong px-5 py-6">
            <span className="text-[17px] font-bold">Référentiel de la route non reçu</span>
            <span className="text-[14px] text-muted text-pretty">
              La route arrive en V2. Le document officiel est demandé aux cadres de la branche. Vous pouvez préparer un référentiel vide en attendant.
            </span>
            <OutlineButton
              onClick={() => {
                store.updateRef((r) => ({ ...r, routeCreated: true }));
                store.showToast("Référentiel de la route créé (vide, version 1)");
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
              <span className="font-mono text-[13px] text-muted">
                {rb === "route" ? "Version 1 · brouillon" : `Version ${ver} · active · ${VALIDATION_COUNTS[rb]} validations`}
              </span>
              {rb === "meute" && (
                <span className="mt-1 text-[13px] text-muted text-pretty">Base proposée : chaque chef de meute peut adapter les critères de son unité.</span>
              )}
            </div>
            {RB.steps.length > 0 && (
              <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface [&>*:last-child]:border-b-0">
                {RB.steps.map((s, i) => {
                  const extra = ref.extra[rb + i] ?? 0;
                  const crits = [...s.crit, ...Array.from({ length: extra }, (_, n) => `Nouveau critère ${n + 1}`)];
                  const isOpen = open === i;
                  return (
                    <div key={s.name} className="flex flex-col border-b border-rule bg-surface">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? -1 : i)}
                        className="flex min-h-14 w-full items-center gap-3 bg-transparent px-3.5 py-2 text-left text-inherit"
                      >
                        <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-acc-soft font-mono text-[13px] font-bold text-acc-text">
                          {i + 1}
                        </span>
                        <span className="flex flex-1 flex-col">
                          <span className="text-[16px] font-semibold">{s.name}</span>
                          <span className="text-[12px] text-muted">
                            {crits.length} critères{s.rule ? " · règle chiffrée" : ""}
                          </span>
                        </span>
                        <span className="text-[16px] text-muted">{isOpen ? "▴" : "▾"}</span>
                      </button>
                      {isOpen && (
                        <div className="flex flex-col gap-0.5 pb-3.5 pl-[52px] pr-3.5">
                          {s.rule && <div className="mb-1.5 rounded-ui border border-line bg-surface px-2.5 py-2 text-[13px]">Règle chiffrée : {s.rule}</div>}
                          {crits.map((label, ci) => {
                            const key = `${rb}.${i}.${ci}`;
                            const ob = key in ref.edits ? ref.edits[key] : !(s.opt ?? []).includes(ci);
                            return (
                              <div key={key} className="flex min-h-11 items-center justify-between gap-2 border-b border-line">
                                <span className="text-[14px]">{label}</span>
                                <button
                                  type="button"
                                  aria-pressed={ob}
                                  onClick={() => store.updateRef((r) => ({ ...r, edits: { ...r.edits, [key]: !ob }, dirty: { ...r.dirty, [rb]: true } }))}
                                  className={cx(
                                    "h-8 flex-none rounded-full border px-2.5 text-[12px] font-bold",
                                    ob ? "border-transparent bg-acc-soft text-acc-text" : "border-line-strong bg-transparent text-muted",
                                  )}
                                >
                                  {ob ? "Obligatoire" : "Optionnel"}
                                </button>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => store.updateRef((r) => ({ ...r, extra: { ...r.extra, [rb + i]: extra + 1 }, dirty: { ...r.dirty, [rb]: true } }))}
                            className="h-11 bg-transparent p-0 text-left text-[14px] font-bold text-acc-text"
                          >
                            + Ajouter un critère
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
