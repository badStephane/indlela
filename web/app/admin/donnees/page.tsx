"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AppShell, type FootAction } from "@/components/AppShell";
import { cx } from "@/components/ui";
import { Bouton, Surligne, TitreSection } from "@/components/carte";
import { useGuard } from "@/lib/access";
import { useStore, useTroupe } from "@/lib/store";
import { BRANCHES } from "@/lib/referentiels";
import { ageOf, fullName, uuid, type Jeune } from "@/lib/mock";
import { analyseImport, EXEMPLE_IMPORT, MODELE_IMPORT, type ImportRow } from "@/lib/importTable";
import { EXCEL_ACCEPT, lireTableau, slug, telechargerExcel, type Feuille } from "@/lib/excel";
import { plural, progressOf } from "@/lib/progress";
import { preuveLabel } from "@/lib/effective";
import { fmtPoint, toISODate } from "@/lib/dates";

const ONLINE_ONLY = "Import, export et sauvegardes passent par le serveur : retrouvez du réseau.";

export default function Donnees() {
  const ok = useGuard((r) => r === "admin" || r === "groupe" || r === "progression");
  const store = useStore();
  const troupe = useTroupe();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    if (ok) store.setLastTab("/admin/donnees");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const { offline, role, vals, journal } = store;
  const admin = role === "admin";
  const ready = rows?.filter((r) => !r.erreur) ?? [];
  const errors = rows?.filter((r) => r.erreur) ?? [];
  const today = toISODate(new Date());

  const load = (name: string, table: string[][]) => {
    setFichier(name);
    setRows(analyseImport(table, store.jeunes));
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    lireTableau(f)
      .then((table) => load(f.name, table))
      .catch(() => store.showToast("Ce fichier ne se lit pas. Enregistrez-le au format Excel (.xlsx) et réessayez."));
  };

  const doImport = () => {
    if (!ready.length) return;
    const premiereEtape = store.steps.troupe[0]?.id ?? "";
    const added: Jeune[] = ready.map((r) => ({
      id: uuid(),
      prenom: r.prenom,
      nom: r.nom,
      dateNaissance: r.dateNaissance,
      dateEntree: today,
      branche: "troupe",
      etapeId: premiereEtape,
      choix: [],
      specs: [],
      consentementLe: null,
      statut: "actif",
      importe: true,
    }));
    store.setJeunes((list) => [...list, ...added]);
    store.log({
      action: "import",
      table: "jeunes",
      ligne: fichier ?? "import.xlsx",
      resume: `${added.length} ${plural(added.length, "fiche importée", "fiches importées")} dans ${store.unitesNoms.troupe}`,
      apres: { fichier: fichier ?? null, lignes: rows!.length, importees: added.length, rejetees: errors.length },
    });
    store.showToast(`${added.length} ${plural(added.length, "fiche créée", "fiches créées")} · inactives jusqu'au consentement des parents`);
    setRows(null);
    setFichier(null);
  };

  const exporter = (kind: ExportKind) => {
    if (offline) return store.showToast(ONLINE_ONLY);
    const feuille = exportFeuille(kind);
    const name = `${slug(store.groupeNom)}-${kind}.xlsx`;
    const count = feuille.lignes.length - 1;
    telechargerExcel(name, [feuille])
      .then(() => {
        store.log({ action: "export", table: kind, ligne: name, resume: `Export ${name} (${count} ${plural(count, "ligne", "lignes")})`, apres: { fichier: name, lignes: count } });
        store.showToast(`${name} exporté`);
      })
      .catch(() => store.showToast("L'export a échoué. Réessayez."));
  };

  const exportFeuille = (kind: ExportKind): Feuille => {
    if (kind === "jeunes") {
      const lignes = troupe.map((j) => {
        const p = progressOf(j, store.steps, vals);
        return [store.unitesNoms[j.branche], j.prenom, j.nom, ageOf(j), p.step?.name, p.done, p.total, j.consentementLe];
      });
      return { nom: "Jeunes", lignes: [["Unité", "Prénom", "Nom", "Âge", "Étape", "Preuves validées", "Preuves de l'étape", "Consentement le"], ...lignes], largeurs: [20, 16, 16, 6, 14, 10, 10, 14] };
    }
    if (kind === "validations") {
      const lignes = vals
        .filter((v) => !v.pending)
        .map((v) => {
          const j = store.findJeune(v.jeuneId);
          if (!j) return [v.id, "", "", "", "", v.date, v.validePar, v.commentaire, v.annuleeLe];
          const steps = store.steps[j.branche];
          const step = steps.find((x) => x.id === v.etapeId);
          return [v.id, fullName(j), store.unitesNoms[j.branche], step?.name, preuveLabel(steps, v.etapeId, v.preuveId), v.date, v.validePar, v.commentaire, v.annuleeLe];
        });
      return {
        nom: "Validations",
        lignes: [["Identifiant", "Jeune", "Unité", "Étape", "Preuve", "Date", "Validé par", "Commentaire", "Annulée le"], ...lignes],
        largeurs: [12, 20, 18, 12, 48, 12, 16, 36, 12],
      };
    }
    return {
      nom: "Journal",
      lignes: [
        ["Date", "Utilisateur", "Action", "Table", "Ligne", "Résumé", "Avant", "Après"],
        ...journal.map((e) => [e.at, e.user, e.action, e.table, e.ligne, e.resume, e.avant ? JSON.stringify(e.avant) : "", e.apres ? JSON.stringify(e.apres) : ""]),
      ],
      largeurs: [22, 18, 12, 14, 14, 60, 30, 30],
    };
  };

  const sauvegarder = () => {
    if (offline) return store.showToast(ONLINE_ONLY);
    setBackingUp(true);
    setTimeout(() => {
      const at = new Date().toISOString();
      store.setLastBackup(at);
      store.log({ action: "sauvegarde", table: "base", ligne: `sauvegarde-${today}`, resume: "Sauvegarde chiffrée lancée à la main", apres: { chiffree: true, copies: 3 } });
      store.showToast("Sauvegarde chiffrée terminée · 3 copies");
      setBackingUp(false);
    }, 1500);
  };

  let foot: FootAction | undefined;
  if (rows)
    foot = {
      label: ready.length ? `Importer ${ready.length} ${plural(ready.length, "jeune", "jeunes")}` : "Aucune ligne à importer",
      disabled: !ready.length || offline,
      note: offline ? ONLINE_ONLY : errors.length ? `${errors.length} ${plural(errors.length, "ligne sera ignorée", "lignes seront ignorées")}.` : undefined,
      onClick: doImport,
    };

  const derniere = new Date(store.lastBackup);
  const backupWhen = `${fmtPoint(toISODate(derniere), true)} ${derniere.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  const effacer = () => {
    setRows(null);
    setFichier(null);
  };
  const modele = () =>
    telechargerExcel("modele-import-jeunes.xlsx", [{ nom: "Jeunes", lignes: MODELE_IMPORT, largeurs: [18, 18, 18, 22] }]).catch(() =>
      store.showToast("Le modèle n'a pas pu être créé. Réessayez."),
    );
  const exports: [ExportKind, string, string][] = [
    ["jeunes", "Listes des jeunes", `${troupe.length} jeunes actifs, avec l'étape`],
    ["validations", "Validations", "annulées comprises, avec le nom du cadre"],
    ...(admin ? ([["journal", "Journal", `${journal.length} traces, avant et après`]] as [ExportKind, string, string][]) : []),
  ];

  return (
    <AppShell kicker="Excel pour tout ; le CSV est encore accepté à l'import" title="Import et export" foot={foot} wide>
      <div className="flex flex-col gap-4 px-4 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10 lg:px-0">
        <section className="min-w-0">
          <TitreSection>Importer les jeunes du groupe</TitreSection>
          <input ref={fileRef} type="file" accept={EXCEL_ACCEPT} onChange={onFile} className="hidden" />
          <div className="mt-2 flex flex-col items-center gap-2 border-2 border-dashed border-encre px-4 py-5 text-center">
            {rows ? (
              <p className="m-0 text-[17px]">
                <strong className="break-all">{fichier}</strong> · {rows.length} {plural(rows.length, "ligne", "lignes")}
              </p>
            ) : (
              <p className="m-0 text-[16px] text-pretty">
                Un fichier Excel, une ligne par jeune : <strong>Prénom, Nom, Date de naissance, Unité</strong>.
              </p>
            )}
            <p className="m-0 flex flex-wrap justify-center gap-x-3 text-[16px]">
              <Lien onClick={() => fileRef.current?.click()}>{rows ? "Changer de fichier" : "Choisir un fichier Excel"}</Lien>
              <Lien onClick={modele}>Télécharger le modèle</Lien>
              <Lien onClick={() => load("exemple.xlsx", EXEMPLE_IMPORT)}>Essayer sur un exemple</Lien>
              {rows && <Lien onClick={effacer}>Effacer</Lien>}
            </p>
          </div>
          <p className="m-0 pt-2 text-[15px] text-crayon text-pretty">Les fiches restent inactives jusqu&apos;au consentement des parents. En V1, seule la troupe est ouverte.</p>

          {rows && (
            <div className="flex flex-col gap-2 pt-4">
              {rows.length === 0 ? (
                <p className="m-0 text-[16px] text-crayon">Le fichier est vide.</p>
              ) : (
                <p className="m-0 text-[17px]">
                  {errors.length > 0 && (
                    <>
                      <Surligne>
                        {errors.length} {plural(errors.length, "ligne à corriger", "lignes à corriger")}
                      </Surligne>{" "}
                      ·{" "}
                    </>
                  )}
                  {ready.length} {plural(ready.length, "prête", "prêtes")} à importer
                </p>
              )}
              {errors.length > 0 && <LignesImport rows={errors} erreurs />}
              {ready.length > 0 && (
                <details className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center text-[16px] font-semibold underline underline-offset-4">
                    <span className="group-open:hidden">Voir les {ready.length} lignes prêtes</span>
                    <span className="hidden group-open:inline">Masquer les lignes prêtes</span>
                  </summary>
                  <LignesImport rows={ready} />
                </details>
              )}
            </div>
          )}
        </section>

        <aside className="flex min-w-0 flex-col">
          <TitreSection>Exporter</TitreSection>
          <ul className="m-0 list-none p-0">
            {exports.map(([kind, label, sub]) => (
              <li key={kind} className="border-b border-ligne">
                <button type="button" onClick={() => exporter(kind)} className="flex min-h-16 w-full items-center justify-between gap-3 bg-transparent py-3 text-left text-encre">
                  <span className="flex min-w-0 flex-col">
                    <strong className="text-[17px]">{label}</strong>
                    <span className="text-[15px] text-crayon">{sub}</span>
                  </span>
                  <span className={cx("flex-none font-mono text-[14px]", offline && "text-crayon")}>.xlsx ↓</span>
                </button>
              </li>
            ))}
          </ul>
          {offline && <p className="m-0 pt-2 text-[15px] text-crayon">{ONLINE_ONLY}</p>}

          {admin && (
            <>
              <TitreSection>Sauvegardes</TitreSection>
              <p className="m-0 text-[16px]">
                Dernière sauvegarde : <span className="font-mono text-[15px]">{backupWhen}</span>
              </p>
              <p className="m-0 pt-2 text-[15px] text-crayon text-pretty">
                Une sauvegarde chiffrée chaque nuit, gardée en 3 copies dont une hors du serveur. Restauration testée avant chaque nouvelle version.
              </p>
              <div className="pt-3">
                <Bouton variante="secondaire" onClick={sauvegarder} disabled={backingUp || offline}>
                  {backingUp ? "Sauvegarde en cours…" : "Lancer une sauvegarde"}
                </Bouton>
              </div>
            </>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

type ExportKind = "jeunes" | "validations" | "journal";

function Lien({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 bg-transparent font-semibold text-encre underline underline-offset-4">
      {children}
    </button>
  );
}

/** Lignes lues dans le fichier : celles à corriger avec leur erreur, ou celles prêtes à importer. */
function LignesImport({ rows, erreurs = false }: { rows: ImportRow[]; erreurs?: boolean }) {
  return (
    <table className="tableau-empile w-full border-collapse text-[16px]">
      <thead>
        <tr className="text-left text-[14px]">
          <th scope="col" className="py-2 pr-3 font-semibold">Ligne</th>
          <th scope="col" className="py-2 pr-3 font-semibold">Prénom et nom</th>
          <th scope="col" className="py-2 pr-3 font-semibold">Naissance</th>
          <th scope="col" className="py-2 font-semibold">{erreurs ? "Erreur" : "Âge"}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.ligne} className="border-t border-ligne">
            <td className="py-2.5 pr-3 font-mono text-[14px] font-semibold">
              <span className="lg:hidden">ligne </span>
              {r.ligne}
            </td>
            <th scope="row" className="py-2.5 pr-3 text-left font-normal">
              {[r.prenom, r.nom].filter(Boolean).join(" ") || "Sans nom"}
            </th>
            <td className="py-2.5 pr-3 font-mono text-[14px]">{r.dateNaissance ? fmtPoint(r.dateNaissance, true) : "—"}</td>
            <td className={cx("py-2.5", erreurs ? "font-semibold text-erreur" : "")}>{erreurs ? r.erreur : r.age === null ? "—" : `${r.age} ans`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
