"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { depuisAncienneAdresse } from "@/lib/routes";

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
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex max-w-sm flex-col gap-3 text-center">
        <h1 className="text-[22px] font-extrabold">Page introuvable</h1>
        <p className="text-[15px] text-muted text-pretty">Cette adresse ne mène à aucun écran du carnet.</p>
        <button type="button" onClick={() => router.replace("/")} className="h-12 rounded-ui bg-forest text-[15px] font-bold text-white">
          Revenir à l&apos;accueil
        </button>
      </div>
    </main>
  );
}
