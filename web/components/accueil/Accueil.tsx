import { BoutonLien, CourbesNiveau, Logo, TitreSection } from "@/components/carte";

// Page publique d'Indlela : ce qu'est le carnet, qui y fait quoi, puis la connexion.

const PROGRESSION: { titre: string; texte: string }[] = [
  { titre: "Preuves en réunion", texte: "Le chef coche ce que le jeune a réussi, sur son téléphone, même sans réseau." },
  { titre: "Cour d'honneur", texte: "Quand une étape est complète, la cour d'honneur la reconnaît ou l'ajourne." },
  { titre: "Carnet à jour", texte: "Le jeune, sa famille et ses chefs voient le même carnet, de la meute à la route." },
];

const ROLES: [string, string][] = [
  ["Cadre", "valide les preuves de son unité"],
  ["Chef de groupe", "voit toutes les unités"],
  ["Responsable progression", "prépare les cours d'honneur et les rapports"],
  ["Parent", "suit son enfant en lecture seule"],
  ["Administrateur", "crée les comptes et tient les référentiels"],
];

const TERRAIN = [
  "Marche sans réseau pendant la réunion",
  "S'installe comme une app sur un Android d'entrée de gamme",
  "Sur ordinateur : liste et fiche côte à côte pour l'administration",
];

export function Accueil() {
  return (
    <div className="min-h-dvh bg-fond text-encre">
      <header className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-6 sm:px-8">
        <Logo taille={30} />
        <BoutonLien href="/connexion" variante="secondaire">
          Se connecter
        </BoutonLien>
      </header>

      <main className="mx-auto flex max-w-[1100px] flex-col gap-14 px-4 pb-20 sm:px-8">
        <section className="relative isolate pt-6 sm:pt-12">
          <CourbesNiveau hauteur={230} haut={150} gauche="60%" largeur={500} masquerSous={900} />
          <h1 className="m-0 max-w-[18ch] text-[40px] font-extrabold leading-[1.05] tracking-[-0.5px] text-balance sm:text-[56px]">
            Le carnet de progression, dans le téléphone du chef.
          </h1>
          <p className="m-0 mt-5 max-w-[52ch] text-[18px] leading-relaxed text-crayon">
            Pour les Scouts du Sénégal. Les preuves se valident en réunion et le carnet du jeune le suit de branche en branche.
          </p>
          <p className="m-0 mt-3 font-note text-[19px] italic text-annotation">Indlela : « le chemin », en zoulou.</p>
          <div className="mt-7">
            <BoutonLien href="/connexion" className="px-5">
              Se connecter
            </BoutonLien>
          </div>
        </section>

        <section>
          <TitreSection>Comment se fait la progression</TitreSection>
          <ol className="m-0 mt-4 grid list-none gap-8 p-0 sm:grid-cols-3 sm:gap-0">
            {PROGRESSION.map((p, k) => (
              <li key={p.titre} className="flex flex-col gap-2 sm:pr-6">
                <span className="flex items-center">
                  <span className="flex size-[30px] flex-none items-center justify-center rounded-full border-2 border-sentier bg-fond font-mono text-[13px]">{k + 1}</span>
                  {k < PROGRESSION.length - 1 && <span aria-hidden="true" className="hidden h-[3px] flex-1 bg-sentier sm:block" />}
                </span>
                <h3 className="m-0 text-[19px] font-bold">{p.titre}</h3>
                <p className="m-0 max-w-[36ch] text-[16px] leading-relaxed text-crayon">{p.texte}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-14 lg:grid-cols-2 lg:gap-12">
          <section>
            <TitreSection>Qui fait quoi</TitreSection>
            <ul className="m-0 list-none p-0">
              {ROLES.map(([role, texte]) => (
                <li key={role} className="border-b border-ligne py-3 text-[16px] text-crayon">
                  <strong className="font-bold text-encre">{role}</strong> · {texte}
                </li>
              ))}
            </ul>
          </section>
          <div className="flex flex-col">
            <section>
              <TitreSection>Pensé pour le terrain</TitreSection>
              <ul className="m-0 mt-2 flex list-disc flex-col gap-2 pl-5 text-[16px]">
                {TERRAIN.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
            <section className="mt-8">
              <TitreSection>Les fiches sont protégées</TitreSection>
              <p className="m-0 mt-2 text-[16px] leading-relaxed">
                Un chef ne voit que son unité, un parent que ses enfants. Aucune fiche sans le consentement des parents. Les photos montrent le travail, pas les visages.
              </p>
            </section>
          </div>
        </div>

        <p className="m-0 border-t border-ligne pt-6 text-[16px] text-crayon">
          Vous avez reçu un identifiant de votre groupe ? Connectez-vous. Pas encore de compte : demandez-le à l&apos;administrateur de votre groupe.
        </p>
      </main>
    </div>
  );
}
