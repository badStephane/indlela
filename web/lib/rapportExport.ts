// Mise en forme du rapport d'évolution : mêmes chiffres pour le classeur Excel et la page PDF.

import type { Feuille, Valeur } from "./excel";
import type { BranchCode } from "./referentiels";
import type { NomsUnites } from "./groupe";
import {
  bilanJeunes,
  evolution,
  GRANULARITES,
  periodes,
  synthese,
  type AnneeScoute,
  type DonneesProgression,
  type Granularite,
  type LigneEvolution,
  type LigneJeune,
  type LigneSynthese,
  type Periode,
} from "./rapport";

const ORDER: BranchCode[] = ["meute", "troupe", "route"];

export interface Rapport {
  annee: AnneeScoute;
  granularite: Granularite;
  /** Date ISO à laquelle le rapport est arrêté. */
  arrete: string;
  branches: BranchCode[];
  periodes: Periode[];
  lignes: LigneEvolution[];
  synthese: LigneSynthese[];
  jeunes: LigneJeune[];
}

export function construireRapport(data: DonneesProgression, annee: AnneeScoute, granularite: Granularite, today: string): Rapport {
  // Une branche sans référentiel (la route en V1) n'a rien à rapporter.
  const branches = ORDER.filter((b) => data.steps[b].length > 0);
  const arrete = today < annee.fin ? today : annee.fin;
  const ps = periodes(annee, granularite, today);
  return {
    annee,
    granularite,
    arrete,
    branches,
    periodes: ps,
    lignes: evolution(data, ps, branches),
    synthese: synthese(data, annee, branches, today),
    jeunes: bilanJeunes(data, annee, today)
      .filter((x) => branches.includes(x.j.branche))
      .sort((a, b) => ORDER.indexOf(a.j.branche) - ORDER.indexOf(b.j.branche) || a.j.nom.localeCompare(b.j.nom, "fr") || a.j.prenom.localeCompare(b.j.prenom, "fr")),
  };
}

export const granulariteLabel = (g: Granularite) => GRANULARITES.find((x) => x.value === g)!.label.toLowerCase();

/** Date ISO en date Excel (sans fuseau). */
const dateExcel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const etapeName = (steps: { id: string; name: string }[], id: string) => steps.find((s) => s.id === id)?.name ?? id;

export function feuillesRapport(r: Rapport, steps: Record<BranchCode, { id: string; name: string }[]>, noms: NomsUnites): Feuille[] {
  const synthese: Feuille = {
    nom: "Synthèse",
    lignes: [
      ["Unité", "Jeunes à la rentrée", "Jeunes aujourd'hui", "Preuves validées", "Jeunes ayant progressé", "Étapes reconnues", "Étapes ajournées"],
      ...r.synthese.map((s): Valeur[] => [noms[s.branche], s.effectifDebut, s.effectifFin, s.validations, s.jeunesProgressant, s.reconnues, s.ajournees]),
    ],
    largeurs: [22, 12, 12, 12, 14, 12, 12],
  };

  const parUnite: Feuille[] = r.branches.map((b) => ({
    nom: noms[b],
    lignes: [
      ["Période", "Du", "Au", "Jeunes", "Preuves validées", "Jeunes ayant progressé", "Étapes reconnues", "Étapes ajournées", ...steps[b].map((s) => s.name)],
      ...r.lignes
        .filter((l) => l.branche === b)
        .map((l): Valeur[] => [
          l.periode.label,
          dateExcel(l.periode.debut),
          dateExcel(l.periode.fin),
          l.effectif,
          l.validations,
          l.jeunesProgressant,
          l.reconnues,
          l.ajournees,
          ...l.parEtape,
        ]),
    ],
    largeurs: [24, 12, 12, 8, 12, 14, 12, 12, ...steps[b].map(() => 12)],
  }));

  const jeunes: Feuille = {
    nom: "Jeunes",
    lignes: [
      ["Unité", "Prénom", "Nom", "Étape à la rentrée", "Étape actuelle", "Preuves validées", "Étapes reconnues"],
      ...r.jeunes.map((x): Valeur[] => [
        noms[x.j.branche],
        x.j.prenom,
        x.j.nom,
        etapeName(steps[x.j.branche], x.etapeDebut),
        etapeName(steps[x.j.branche], x.etapeFin),
        x.validations,
        x.reconnues,
      ]),
    ],
    largeurs: [20, 16, 16, 16, 16, 12, 12],
  };

  return [synthese, ...parUnite, jeunes];
}
