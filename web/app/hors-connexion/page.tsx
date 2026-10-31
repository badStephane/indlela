import Link from "next/link";
import { Frame } from "@/components/AppShell";

// Servie par le service worker quand un écran n'est pas encore en cache et que le réseau manque.
export default function HorsConnexion() {
  return (
    <Frame>
      <div className="flex flex-1 flex-col justify-center gap-4 px-6">
        <h1 className="m-0 text-[24px] font-extrabold leading-tight">Pas de réseau</h1>
        <p className="m-0 text-[15px] text-muted text-pretty">
          Cet écran n&apos;est pas encore enregistré sur ce téléphone. Vos saisies sont gardées : elles partiront au retour du réseau.
        </p>
        <Link href="/" className="flex h-12 items-center justify-center rounded-ui bg-green text-[16px] font-bold text-white">
          Revenir au carnet
        </Link>
      </div>
    </Frame>
  );
}
