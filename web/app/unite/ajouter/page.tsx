"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell, type FootAction } from "@/components/AppShell";
import { cx, List, OutlineButton, rowClass } from "@/components/ui";
import { canValidate, useGuard } from "@/lib/access";
import { useStore, useTroupe, type NewJeune } from "@/lib/store";
import { MAX_PASTE_ROWS, parseNameList, type ParsedName } from "@/lib/parseList";
import type { EtapeUnite } from "@/lib/effective";
import { plural } from "@/lib/progress";
import { toISODate } from "@/lib/dates";
import { analyseListeUnite, MAX_IMPORT_ROWS, MODELE_UNITE, type LigneUnite } from "@/lib/importTable";
import { EXCEL_ACCEPT, lireTableau, telechargerExcel } from "@/lib/excel";

type Mode = "excel" | "liste" | "un";

const MODES: [Mode, string][] = [
  ["excel", "Fichier Excel"],
  ["liste", "Coller une liste"],
  ["un", "Un jeune"],
];

const MAX_NAME = 60;
const inputClass = "h-12 rounded-ui border border-line-strong bg-surface px-3.5 text-[16px] font-normal text-ink outline-none focus:border-ink";
const PROBLEME_LABEL: Record<NonNullable<ParsedName["probleme"]>, string> = {
  "nom-manquant": "Nom de famille manquant · non ajouté",
  doublon: "Déjà dans l'unité · non ajouté",
};

export default function AjouterJeunes() {
  const ok = useGuard(canValidate);
  const store = useStore();
  const router = useRouter();
  const troupe = useTroupe();
  const steps = store.steps.troupe;
  const [mode, setMode] = useState<Mode>("excel");
  const [etapeId, setEtapeId] = useState(steps[0]?.id ?? "");
  const [consentement, setConsentement] = useState(false);

  // Un jeune
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [naissance, setNaissance] = useState("");

  // Liste collée
  const [text, setText] = useState("");
  const [parEtape, setParEtape] = useState<Record<number, string>>({});
  const [exclus, setExclus] = useState<number[]>([]);

  // Fichier Excel
  const fileRef = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<{ nom: string; table: string[][] } | null>(null);

  if (!ok) return null;

  const today = toISODate(new Date());
  const rows = parseNameList(text, troupe);
  const toAdd = rows.filter((r) => !r.probleme && !exclus.includes(r.line));
  const newJeune = (p: string, n: string, etape: string, dateNaissance: string | null): NewJeune => ({
    prenom: p.trim().slice(0, MAX_NAME),
    nom: n.trim().slice(0, MAX_NAME),
    dateNaissance,
    branche: "troupe",
    etapeId: etape,
    consentementLe: consentement ? today : null,
  });

  const lignes: LigneUnite[] = fichier ? analyseListeUnite(fichier.table, troupe, steps) : [];
  const lignesOk = lignes.filter((r) => !r.erreur && !exclus.includes(r.ligne));
  const etapeDe = (r: LigneUnite) => parEtape[r.ligne] ?? r.etapeId ?? etapeId;

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    lireTableau(f)
      .then((table) => {
        setFichier({ nom: f.name, table });
        setParEtape({});
        setExclus([]);
      })
      .catch(() => store.showToast("Ce fichier ne se lit pas. Enregistrez-le au format Excel (.xlsx) et réessayez."));
  };
  const modele = () =>
    telechargerExcel("liste-unite-modele.xlsx", [{ nom: "Jeunes", lignes: MODELE_UNITE, largeurs: [18, 18, 18, 14] }]).catch(() =>
      store.showToast("Le modèle n'a pas pu être créé. Réessayez."),
    );
  const changeMode = (m: Mode) => {
    setMode(m);
    setParEtape({});
    setExclus([]);
  };

  let foot: FootAction;
  if (mode === "excel") {
    const n = lignesOk.length;
    foot = {
      label: n ? `Ajouter ${n} ${plural(n, "jeune", "jeunes")}` : fichier ? "Aucune ligne à ajouter" : "Choisissez le fichier Excel de l'unité",
      disabled: !n,
      onClick: () => {
        store.addJeunes(lignesOk.map((r) => newJeune(r.prenom, r.nom, etapeDe(r), r.dateNaissance)));
        router.replace("/unite");
      },
    };
  } else if (mode === "un") {
    const ready = prenom.trim() && nom.trim();
    foot = {
      label: ready ? `Ajouter ${prenom.trim()}` : "Saisissez le prénom et le nom",
      disabled: !ready,
      onClick: () => {
        store.addJeunes([newJeune(prenom, nom, etapeId, naissance && naissance <= today ? naissance : null)]);
        setPrenom("");
        setNom("");
        setNaissance("");
      },
      note: "Le formulaire se vide pour ajouter le jeune suivant.",
    };
  } else {
    const n = toAdd.length;
    foot = {
      label: n ? `Ajouter ${n} ${plural(n, "jeune", "jeunes")}` : "Collez la liste de l'unité",
      disabled: !n,
      onClick: () => {
        store.addJeunes(toAdd.map((r) => newJeune(r.prenom, r.nom, parEtape[r.line] ?? etapeId, null)));
        router.replace("/unite");
      },
    };
  }

  return (
    <AppShell kicker={store.unitesNoms.troupe} title="Ajouter des jeunes" back="/unite" foot={foot}>
      <div className="flex flex-col gap-4 p-4">
        <div role="tablist" aria-label="Façon d'ajouter" className="grid grid-cols-3 gap-1 rounded-ui bg-track p-1">
          {MODES.map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => changeMode(m)}
              className={cx("h-10 rounded-ui text-[14px] font-bold", mode === m ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.1)]" : "bg-transparent text-muted")}
            >
              {label}
            </button>
          ))}
        </div>

        <EtapeSelect steps={steps} value={etapeId} onChange={setEtapeId} label={mode === "un" ? "Étape du jeune" : mode === "excel" ? "Étape si le fichier n'en donne pas" : "Étape pour tous"} />
        <label className="flex min-h-11 items-start gap-3 rounded-card border border-line bg-surface px-3.5 py-2.5 text-[14px]">
          <input type="checkbox" checked={consentement} onChange={(e) => setConsentement(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[var(--acc)]" />
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold">Consentement des parents reçu</span>
            <span className="text-[13px] text-muted text-pretty">
              {mode === "un" ? "Formulaire signé." : "Formulaires signés pour tous les jeunes de la liste."} Sans consentement, la fiche reste inactive jusqu&apos;à ce que l&apos;admin
              l&apos;enregistre.
            </span>
          </span>
        </label>

        {mode === "excel" ? (
          <div className="flex flex-col gap-3">
            <input ref={fileRef} type="file" accept={EXCEL_ACCEPT} onChange={onFile} className="hidden" />
            {!fichier ? (
              <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
                <span className="text-[14px] text-pretty">
                  Une ligne par jeune, avec les colonnes <span className="font-semibold">Prénom</span> et <span className="font-semibold">Nom</span>, et si vous les avez{" "}
                  <span className="font-semibold">Date de naissance</span> et <span className="font-semibold">Étape</span>.
                </span>
                <button type="button" onClick={() => fileRef.current?.click()} className="h-12 rounded-ui bg-acc text-[15px] font-bold text-acc-ink">
                  Choisir le fichier Excel
                </button>
                <OutlineButton onClick={modele} className="h-11 bg-transparent text-[14px]">
                  Télécharger le modèle Excel
                </OutlineButton>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate num text-[13px] text-muted">{fichier.nom}</span>
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex-none bg-transparent text-[13px] font-bold text-acc-text">
                    Changer de fichier
                  </button>
                </div>
                {lignes.length === 0 ? (
                  <div className="rounded-card border border-dashed border-line-strong px-5 py-7 text-[15px] text-muted">Le fichier ne contient aucun jeune.</div>
                ) : (
                  <>
                    <span className="text-[14px]">
                      {lignes.length} {plural(lignes.length, "ligne", "lignes")} · <span className="font-semibold text-ok-ink">{lignesOk.length} à ajouter</span>
                    </span>
                    <List>
                      {lignes.map((r) => (
                        <ParsedRow
                          key={r.ligne}
                          row={{ line: r.ligne, prenom: r.prenom, nom: r.nom }}
                          erreur={r.erreur && `Ligne ${r.ligne} · ${r.erreur} · non ajouté`}
                          steps={steps}
                          etapeId={etapeDe(r)}
                          excluded={exclus.includes(r.ligne)}
                          onEtape={(id) => setParEtape((x) => ({ ...x, [r.ligne]: id }))}
                          onToggle={() => setExclus((x) => (x.includes(r.ligne) ? x.filter((y) => y !== r.ligne) : [...x, r.ligne]))}
                        />
                      ))}
                    </List>
                  </>
                )}
                {lignes.length === MAX_IMPORT_ROWS && (
                  <span className="text-[13px] text-wait-text">Seuls les {MAX_IMPORT_ROWS} premiers jeunes sont lus. Ajoutez la suite dans un second fichier.</span>
                )}
              </>
            )}
          </div>
        ) : mode === "un" ? (
          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Prénom
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={MAX_NAME} autoComplete="off" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Nom
              <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={MAX_NAME} autoComplete="off" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Date de naissance (facultatif)
              <input type="date" value={naissance} max={today} onChange={(e) => setNaissance(e.target.value)} className={inputClass} />
            </label>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Liste des jeunes
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setExclus([]);
                }}
                rows={6}
                placeholder={"Un jeune par ligne, par exemple :\nAwa Ndiaye\nMoussa Diop\nNDIAYE Mame Diarra"}
                className="rounded-ui border border-line-strong bg-surface px-3 py-2.5 text-[15px] font-normal text-ink outline-none focus:border-ink"
              />
              <span className="font-normal text-muted">Copiez la liste depuis WhatsApp, Excel ou vos notes. Les numéros et les tirets sont ignorés.</span>
            </label>
            {rows.length > 0 && (
              <List>
                {rows.map((r) => (
                  <ParsedRow
                    key={r.line}
                    row={r}
                    erreur={r.probleme && PROBLEME_LABEL[r.probleme]}
                    steps={steps}
                    etapeId={parEtape[r.line] ?? etapeId}
                    excluded={exclus.includes(r.line)}
                    onEtape={(id) => setParEtape((s) => ({ ...s, [r.line]: id }))}
                    onToggle={() => setExclus((s) => (s.includes(r.line) ? s.filter((x) => x !== r.line) : [...s, r.line]))}
                  />
                ))}
              </List>
            )}
            {rows.length === MAX_PASTE_ROWS && (
              <span className="text-[13px] text-wait-text">Seuls les {MAX_PASTE_ROWS} premiers jeunes sont lus. Ajoutez la suite dans un second temps.</span>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EtapeSelect({ steps, value, onChange, label }: { steps: EtapeUnite[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-3.5 py-2.5 text-[14px] font-semibold">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-ui border border-line-strong bg-surface px-2.5 text-[14px] font-semibold text-ink">
        {steps.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ParsedRowProps {
  row: Pick<ParsedName, "line" | "prenom" | "nom">;
  /** Ligne refusée, avec la raison ; elle ne sera pas ajoutée. */
  erreur: string | null;
  steps: EtapeUnite[];
  etapeId: string;
  excluded: boolean;
  onEtape: (id: string) => void;
  onToggle: () => void;
}

function ParsedRow({ row, erreur, steps, etapeId, excluded, onEtape, onToggle }: ParsedRowProps) {
  const name = `${row.prenom} ${row.nom}`.trim() || "Sans nom";
  return (
    <div className={cx(rowClass, "min-h-14 gap-2.5 py-2", (erreur || excluded) && "opacity-60")}>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cx("truncate text-[15px] font-semibold", excluded && "line-through")}>{name}</span>
        {erreur && <span className="text-[12px] text-err-ink">{erreur}</span>}
      </span>
      {!erreur && (
        <>
          <select
            aria-label={`Étape de ${name}`}
            value={etapeId}
            disabled={excluded}
            onChange={(e) => onEtape(e.target.value)}
            className="h-9 max-w-[124px] flex-none rounded-ui border border-line bg-surface px-1.5 text-[13px] text-ink"
          >
            {steps.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onToggle}
            aria-label={excluded ? `Remettre ${name}` : `Ne pas ajouter ${name}`}
            className="h-9 w-9 flex-none rounded-ui bg-transparent text-[18px] text-muted"
          >
            {excluded ? "↺" : "×"}
          </button>
        </>
      )}
    </div>
  );
}
