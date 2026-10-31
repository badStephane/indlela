"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AppShell, type FootAction } from "@/components/AppShell";
import { Card, cx, List, OutlineButton, rowClass, Section } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore, useTroupe } from "@/lib/store";
import { BRANCHES } from "@/lib/referentiels";
import { ageOf, fullName, uuid, type Jeune } from "@/lib/mock";
import { analyseImport, EXEMPLE_IMPORT, MODELE_IMPORT, type ImportRow } from "@/lib/importTable";
import { EXCEL_ACCEPT, lireTableau, slug, telechargerExcel, type Feuille } from "@/lib/excel";
import { plural, progressOf } from "@/lib/progress";
import { preuveLabel } from "@/lib/effective";
import { daysSince, fmtShort, toISODate } from "@/lib/dates";

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
      resume: `${added.length} ${plural(added.length, "fiche importée", "fiches importées")} dans Troupe Saint-Paul`,
      apres: { fichier: fichier ?? null, lignes: rows!.length, importees: added.length, rejetees: errors.length },
    });
    store.showToast(`${added.length} ${plural(added.length, "fiche créée", "fiches créées")} · inactives jusqu'au consentement des parents`);
    setRows(null);
    setFichier(null);
  };

  const exporter = (kind: "jeunes" | "validations" | "journal") => {
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

  const exportFeuille = (kind: "jeunes" | "validations" | "journal"): Feuille => {
    if (kind === "jeunes") {
      const lignes = troupe.map((j) => {
        const p = progressOf(j, store.steps, vals);
        return [BRANCHES[j.branche].unit, j.prenom, j.nom, ageOf(j), p.step?.name, p.done, p.total, j.consentementLe];
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
          return [v.id, fullName(j), BRANCHES[j.branche].unit, step?.name, preuveLabel(steps, v.etapeId, v.preuveId), v.date, v.validePar, v.commentaire, v.annuleeLe];
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

  const lastBackupDays = daysSince(store.lastBackup);
  const backupWhen =
    (lastBackupDays === 0 ? "aujourd'hui" : lastBackupDays === 1 ? "hier" : `le ${fmtShort(store.lastBackup)}`) +
    " à " +
    new Date(store.lastBackup).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <AppShell kicker={admin ? "Administration" : store.groupeNom} title="Import et export" foot={foot}>
      <div className="flex flex-col gap-6 p-4">
        <Section label="Importer des jeunes" gap="gap-2.5">
          <Card className="flex flex-col gap-3 p-4">
            <span className="text-[14px] text-pretty">
              Un fichier Excel, une ligne par jeune, avec les colonnes <span className="font-semibold">Prénom, Nom, Date de naissance, Unité</span>. Les fiches restent
              inactives jusqu&apos;au consentement des parents. En V1, seule la troupe est ouverte.
            </span>
            <input ref={fileRef} type="file" accept={EXCEL_ACCEPT} onChange={onFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="h-12 rounded-ui bg-acc text-[15px] font-bold text-acc-ink">
              Choisir un fichier Excel
            </button>
            <div className="grid grid-cols-2 gap-2">
              <OutlineButton
                onClick={() =>
                  telechargerExcel("modele-import-jeunes.xlsx", [{ nom: "Jeunes", lignes: MODELE_IMPORT, largeurs: [18, 18, 18, 22] }]).catch(() =>
                    store.showToast("Le modèle n'a pas pu être créé. Réessayez."),
                  )
                }
                className="h-11 bg-transparent text-[14px]"
              >
                Modèle Excel
              </OutlineButton>
              <OutlineButton onClick={() => load("exemple.xlsx", EXEMPLE_IMPORT)} className="h-11 bg-transparent text-[14px]">
                Essayer un exemple
              </OutlineButton>
            </div>
          </Card>

          {rows && (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-mono text-[13px] text-muted">{fichier}</span>
                <button
                  type="button"
                  onClick={() => {
                    setRows(null);
                    setFichier(null);
                  }}
                  className="flex-none bg-transparent text-[13px] font-bold text-acc-text"
                >
                  Effacer
                </button>
              </div>
              <span className="text-[14px]">
                {rows.length} {plural(rows.length, "ligne", "lignes")} · <span className="font-semibold text-ok-ink">{ready.length} prêtes</span>
                {errors.length > 0 && (
                  <>
                    {" "}
                    · <span className="font-semibold text-err-ink">{errors.length} à corriger</span>
                  </>
                )}
              </span>
              {rows.length === 0 ? (
                <div className="rounded-card border border-dashed border-line-strong px-5 py-7 text-[15px] text-muted">Le fichier est vide.</div>
              ) : (
                <List>
                  {rows.map((r) => (
                    <div key={r.ligne} className={`${rowClass} min-h-14 gap-3 py-2`}>
                      <span
                        aria-hidden
                        className={cx(
                          "flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 text-[13px] font-extrabold",
                          r.erreur ? "border-err-dot text-err-ink" : "border-acc bg-acc text-acc-ink",
                        )}
                      >
                        {r.erreur ? "!" : "✓"}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cx("truncate text-[15px] font-medium", r.erreur && "text-muted")}>{[r.prenom, r.nom].filter(Boolean).join(" ") || "Sans nom"}</span>
                        <span className={cx("font-mono text-[12px]", r.erreur ? "text-err-ink" : "text-muted")}>
                          ligne {r.ligne} · {r.erreur ?? `${r.age} ans · Troupe Saint-Paul`}
                        </span>
                      </span>
                    </div>
                  ))}
                </List>
              )}
            </>
          )}
        </Section>

        <Section label="Exporter" gap="gap-2.5">
          <List>
            {(
              [
                ["jeunes", "Listes des jeunes", `${troupe.length} jeunes actifs · étape et progression`],
                ["validations", "Validations", "Toutes, annulées comprises, avec le nom du cadre"],
                ...(admin ? [["journal", "Journal", `${journal.length} traces · avant et après`]] : []),
              ] as ["jeunes" | "validations" | "journal", string, string][]
            ).map(([kind, label, sub]) => (
              <button key={kind} type="button" onClick={() => exporter(kind)} className={`${rowClass} min-h-[60px] justify-between gap-3 py-2`}>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{label}</span>
                  <span className="text-[12px] text-muted">{sub}</span>
                </span>
                <span className={cx("flex-none font-mono text-[12px] font-semibold", offline ? "text-muted" : "text-acc-text")}>Excel ↓</span>
              </button>
            ))}
          </List>
          {offline && <span className="text-[13px] text-muted">{ONLINE_ONLY}</span>}
        </Section>

        {admin && (
          <Section label="Sauvegardes" gap="gap-2.5">
            <Card className="flex flex-col gap-2.5 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-ok-dot" />
                <span className="text-[15px] font-semibold">Dernière sauvegarde chiffrée {backupWhen}</span>
              </div>
              <span className="text-[13px] text-muted text-pretty">
                Une sauvegarde chaque nuit, gardée en 3 copies dont une hors du serveur. Restauration testée avant chaque nouvelle version.
              </span>
              <OutlineButton onClick={sauvegarder} className={cx("h-11 bg-transparent text-[14px] font-bold", (backingUp || offline) && "text-muted")}>
                {backingUp ? "Sauvegarde en cours…" : "Lancer une sauvegarde maintenant"}
              </OutlineButton>
            </Card>
          </Section>
        )}
      </div>
    </AppShell>
  );
}
