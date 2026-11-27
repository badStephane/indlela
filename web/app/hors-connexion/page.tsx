import { Frame } from "@/components/AppShell";
import { BoutonLien, CourbesNiveau, TitreSection } from "@/components/carte";

// Servie par le service worker quand un écran n'est pas encore en cache et que le réseau manque.

const SANS_RESEAU = ["Ouvrir la fiche de n'importe quel jeune", "Valider des preuves et prendre des photos", "Saisir une décision de cour d'honneur", "Ajouter des jeunes"];

export default function HorsConnexion() {
  return (
    <Frame>
      <div className="relative isolate flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-8 pt-[140px]">
        <CourbesNiveau hauteur={120} largeur={420} />
        <p className="m-0 flex items-center gap-2 text-[16px] font-semibold">
          <span aria-hidden="true" className="size-[10px] rounded-full bg-attente" />
          Hors ligne
        </p>
        <h1 className="m-0 text-titre font-extrabold leading-tight tracking-[-0.3px]">Cet écran a besoin du réseau.</h1>
        <p className="m-0 text-[17px] text-crayon text-pretty">Il n&apos;est pas encore enregistré sur ce téléphone. Il s&apos;ouvrira dès que le téléphone retrouve le réseau.</p>
        <section>
          <TitreSection>Sans réseau, vous pouvez</TitreSection>
          <ul className="m-0 list-none p-0">
            {SANS_RESEAU.map((x) => (
              <li key={x} className="border-b border-ligne py-3.5 text-[17px]">
                {x}
              </li>
            ))}
          </ul>
        </section>
        <p className="m-0 text-[16px] text-crayon text-pretty">Vos saisies partent seules au retour du réseau. Pour forcer l&apos;envoi, touchez la pastille en haut de l&apos;écran.</p>
        <BoutonLien href="/" large>
          Revenir au carnet
        </BoutonLien>
      </div>
    </Frame>
  );
}
