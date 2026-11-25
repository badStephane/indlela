"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell, type FootAction } from "@/components/AppShell";
import { cx } from "@/components/ui";
import { Bandeau } from "@/components/carte";
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
  ["liste", "Liste collée"],
  ["un", "Un par un"],
];

const MAX_NAME = 60;
/** Champ sur une ligne, comme le reste de la charte. */
const inputClass = "h-11 w-full border-0 border-b-[1.5px] border-encre bg-transparent px-0 text-[17px] font-normal text-encre";
const labelClass = "flex flex-col text-[15px] font-semibold";
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

  // Ajouter des jeunes fait partie de l'onglet Unité.
  useEffect(() => {
    if (ok) store.setLastTab("/unite");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

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
      <div className="flex flex-col gap-5 px-4 pb-8 pt-4 lg:px-0">
        <div role="tablist" aria-label="Façon d'ajouter" className="grid grid-cols-3 border-b-4 border-double border-encre">
          {MODES.map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => changeMode(m)}
              className={cx("-mb-1 min-h-12 border-b-4 bg-transparent px-1 text-[16px]", mode === m ? "border-soleil font-bold text-encre" : "border-transparent text-crayon")}
            >
              {label}
            </button>
          ))}
        </div>

        <EtapeSelect steps={steps} value={etapeId} onChange={setEtapeId} label={mode === "un" ? "Étape du jeune" : mode === "excel" ? "Étape si le fichier n'en donne pas" : "Étape pour tous"} />
        <label className="flex min-h-11 items-start gap-3 text-[16px]">
          <input type="checkbox" checked={consentement} onChange={(e) => setConsentement(e.target.checked)} className="mt-0.5 size-6 flex-none accent-[var(--color-sentier)]" />
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold">Consentement des parents reçu</span>
            <span className="text-[15px] text-crayon text-pretty">
              {mode === "un" ? "Formulaire signé." : "Formulaires signés pour tous les jeunes de la liste."} Sans consentement, la fiche reste inactive jusqu&apos;à ce que l&apos;admin
              l&apos;enregistre.
            </span>
          </span>
        </label>

        {mode === "excel" ? (
          <div className="flex flex-col gap-3">
            <input ref={fileRef} type="file" accept={EXCEL_ACCEPT} onChange={onFile} className="hidden" />
            {!fichier ? (
              <div className="flex flex-col gap-3">
                <span className="text-[16px] text-pretty">
                  Une ligne par jeune, avec les colonnes <span className="font-semibold">Prénom</span> et <span className="font-semibold">Nom</span>, et si vous les avez{" "}
                  <span className="font-semibold">Date de naissance</span> et <span className="font-semibold">Étape</span>.
                </span>
                <button type="button" onClick={() => fileRef.current?.click()} className="min-h-12 bg-sentier px-4 text-[16px] font-semibold text-white">
                  Choisir le fichier Excel
                </button>
                <button type="button" onClick={modele} className="min-h-12 border-[1.5px] border-encre bg-fond px-4 text-[16px] font-semibold text-encre">
                  Télécharger le modèle Excel
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-mono text-[14px] text-crayon">{fichier.nom}</span>
                  <button type="button" onClick={() => fileRef.current?.click()} className="min-h-11 flex-none bg-transparent text-[16px] text-encre underline underline-offset-4">
                    Changer de fichier
                  </button>
                </div>
                {lignes.length === 0 ? (
                  <p className="m-0 text-[16px] text-crayon">Le fichier ne contient aucun jeune.</p>
                ) : (
                  <>
                    <span className="text-[16px]">
                      {lignes.length} {plural(lignes.length, "ligne", "lignes")} · <span className="font-semibold text-sentier">{lignesOk.length} à ajouter</span>
                    </span>
                    <div className="flex flex-col">
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
                    </div>
                  </>
                )}
                {lignes.length === MAX_IMPORT_ROWS && (
                  <Bandeau>Seuls les {MAX_IMPORT_ROWS} premiers jeunes sont lus. Ajoutez la suite dans un second fichier.</Bandeau>
                )}
              </>
            )}
          </div>
        ) : mode === "un" ? (
          <div className="flex flex-col gap-3.5">
            <label className={labelClass}>
              Prénom
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={MAX_NAME} autoComplete="off" className={inputClass} />
            </label>
            <label className={labelClass}>
              Nom
              <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={MAX_NAME} autoComplete="off" className={inputClass} />
            </label>
            <label className={labelClass}>
              Date de naissance (facultatif)
              <input type="date" value={naissance} max={today} onChange={(e) => setNaissance(e.target.value)} className={inputClass} />
            </label>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className={labelClass}>
              Liste des jeunes
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setExclus([]);
                }}
                rows={6}
                placeholder={"Un jeune par ligne, par exemple :\nAwa Ndiaye\nMoussa Diop\nNDIAYE Mame Diarra"}
                className="w-full resize-y border-0 bg-transparent bg-[repeating-linear-gradient(transparent_0_31px,var(--color-ligne)_31px_32px)] px-0 py-0 text-[17px] font-normal leading-[32px] text-encre placeholder:text-crayon"
              />
              <span className="mt-2 font-normal text-crayon">Copiez la liste depuis WhatsApp, Excel ou vos notes. Les numéros et les tirets sont ignorés.</span>
            </label>
            {rows.length > 0 && (
              <div className="flex flex-col">
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
              </div>
            )}
            {rows.length === MAX_PASTE_ROWS && (
              <Bandeau>Seuls les {MAX_PASTE_ROWS} premiers jeunes sont lus. Ajoutez la suite dans un second temps.</Bandeau>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EtapeSelect({ steps, value, onChange, label }: { steps: EtapeUnite[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <label className="flex flex-wrap items-center justify-between gap-3 text-[16px] font-semibold">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 border-0 border-b-[1.5px] border-encre bg-transparent pr-6 text-[17px] font-semibold text-encre">
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
    <div className={cx("flex min-h-14 items-center gap-2.5 border-b border-ligne py-2", excluded && "text-crayon")}>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cx("truncate text-[17px]", excluded && "line-through")}>{name}</span>
        {erreur && <span className="text-[14px] font-semibold text-erreur">{erreur}</span>}
      </span>
      {!erreur && (
        <>
          <select
            aria-label={`Étape de ${name}`}
            value={etapeId}
            disabled={excluded}
            onChange={(e) => onEtape(e.target.value)}
            className="h-11 max-w-[132px] flex-none border-0 border-b-[1.5px] border-encre bg-transparent pr-5 text-[15px] text-encre"
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
            className="size-11 flex-none bg-transparent text-[20px] text-encre"
          >
            {excluded ? "↺" : "×"}
          </button>
        </>
      )}
    </div>
  );
}
