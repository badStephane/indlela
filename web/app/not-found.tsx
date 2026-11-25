"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { depuisAncienneAdresse } from "@/lib/routes";
import { Bouton, CheminDebut } from "@/components/carte";

/**
 * Adresse inconnue. Le site est statique : une ancienne adresse de jeune (/jeunes/:id…) arrive ici
 * et repart vers l'écran actuel ; sinon, on propose de revenir à l'accueil.
 */
export default function Introuvable() {
  const router = useRouter();
  const [redirige, setRedirige] = useState(true);

  useEffect(() => {
    const cible = depuisAncienneAdresse(window.location.pathname);
    if (cible) router.replace(cible);
    else setRedirige(false);
  }, [router]);

  if (redirige) return null;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-fond p-6">
      <div className="flex max-w-sm flex-col items-start gap-4">
        <CheminDebut />
        <h1 className="filet-double m-0 w-full text-titre font-extrabold leading-tight">Page introuvable</h1>
        <p className="m-0 text-[17px] text-crayon text-pretty">Cette adresse ne mène à aucun écran du carnet.</p>
        <Bouton large onClick={() => router.replace("/")}>
          Revenir à l&apos;accueil
        </Bouton>
      </div>
    </main>
  );
}
