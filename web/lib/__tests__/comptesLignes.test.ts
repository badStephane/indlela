import { describe, expect, it } from "vitest";
import { versComptes, versUnites, type LigneAffectation, type LigneLien, type LigneUnite, type LigneUtilisateur } from "../comptesLignes";

const utilisateurs: LigneUtilisateur[] = [
  { id: "u1", nom: "Marie Faye", identifiant: "marie.faye", roles: ["cadre"], actif: true, derniere_connexion: "2026-10-30T18:00:00Z" },
  { id: "u2", nom: "Joseph Mendy", identifiant: "joseph.mendy", roles: ["groupe", "cadre"], actif: true, derniere_connexion: null },
  { id: "u3", nom: "Famille Fall", identifiant: "famille.fall", roles: ["parent"], actif: false, derniere_connexion: null },
];
const affectations: LigneAffectation[] = [
  { utilisateur_id: "u1", unite_id: "un-meute" },
  { utilisateur_id: "u1", unite_id: "un-troupe" },
];
const liens: LigneLien[] = [{ utilisateur_id: "u3", jeune_id: "j-cheikh" }];

describe("versComptes", () => {
  it("rassemble chaque compte avec ses unités et ses enfants", () => {
    const [marie, joseph, fall] = versComptes(utilisateurs, affectations, liens);
    expect(marie).toMatchObject({ id: "u1", roles: ["cadre"], unites: ["un-meute", "un-troupe"], enfants: [], derniereConnexion: "2026-10-30T18:00:00Z" });
    expect(joseph).toMatchObject({ roles: ["groupe", "cadre"], unites: [], enfants: [], deuxFA: true });
    expect(fall).toMatchObject({ actif: false, enfants: ["j-cheikh"], deuxFA: false });
  });

  it("écarte un rôle inconnu plutôt que de l'afficher", () => {
    const out = versComptes([...utilisateurs, { id: "u9", nom: "X", identifiant: "x", roles: ["superadmin"], actif: true, derniere_connexion: null }], [], []);
    expect(out.map((c) => c.id)).toEqual(["u1", "u2", "u3"]);
  });

  it("écarte un compte parent qui cumulerait un autre rôle", () => {
    const out = versComptes([{ id: "u8", nom: "Z", identifiant: "z", roles: ["parent", "cadre"], actif: true, derniere_connexion: null }], [], []);
    expect(out).toEqual([]);
  });
});

describe("versUnites", () => {
  it("garde l'identifiant du serveur, la branche et le responsable", () => {
    const lignes: LigneUnite[] = [{ id: "un-troupe", nom: "Troupe Troisième Dakar", branche: "troupe", annee: "2026-2027", responsable_id: "u1" }];
    expect(versUnites(lignes)).toEqual([{ id: "un-troupe", nom: "Troupe Troisième Dakar", branche: "troupe", annee: "2026-2027", responsable: "u1" }]);
  });
});
