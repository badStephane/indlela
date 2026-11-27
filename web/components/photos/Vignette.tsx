"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { usePhotos } from "@/lib/photosStore";

const vignetteClass = "h-16 w-16 flex-none overflow-hidden border border-ligne bg-fond-2 object-cover";

/** Adresse d'affichage d'une photo encore sur le téléphone ; libérée en quittant l'écran. */
export function useUrlLocale(id: string): string | null {
  const photos = usePhotos();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivant = true;
    let cree: string | null = null;
    photos.fichier(id).then((f) => {
      if (!vivant || !f) return;
      cree = URL.createObjectURL(f);
      setUrl(cree);
    });
    return () => {
      vivant = false;
      if (cree) URL.revokeObjectURL(cree);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return url;
}

/**
 * Photo du serveur, téléchargée sans passer par le cache du navigateur puis affichée depuis la mémoire :
 * après la déconnexion, rien ne reste sur le téléphone.
 */
function useUrlServeur(lien: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivant = true;
    let cree: string | null = null;
    fetch(lien, { cache: "no-store" })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!vivant || !b) return;
        cree = URL.createObjectURL(b);
        setUrl(cree);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
      if (cree) URL.revokeObjectURL(cree);
    };
  }, [lien]);
  return url;
}

/** Vignette qui s'agrandit d'une touche. */
export function Vignette({ url, alt, enAttente = false }: { url: string | null; alt: string; enAttente?: boolean }) {
  const [ouverte, setOuverte] = useState(false);
  if (!url) return <span aria-hidden className={`${vignetteClass} animate-pulse`} />;
  return (
    <>
      <button type="button" onClick={() => setOuverte(true)} aria-label={`Agrandir : ${alt}`} className="relative flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className={vignetteClass} />
        {enAttente && <span title="En attente d'envoi" className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border border-white bg-attente" />}
      </button>
      {ouverte && (
        <Sheet title="Photo de preuve" onClose={() => setOuverte(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt} className="max-h-[70vh] w-full object-contain" />
          {enAttente && <span className="text-[15px] text-crayon">Sur le téléphone : elle partira avec la validation.</span>}
        </Sheet>
      )}
    </>
  );
}

/** Vignette d'une photo déjà sur le serveur. */
export function VignetteServeur({ lien, alt }: { lien: string; alt: string }) {
  return <Vignette url={useUrlServeur(lien)} alt={alt} />;
}

/** Vignette d'une photo encore sur le téléphone. */
export function VignetteLocale({ id, alt, enAttente = false }: { id: string; alt: string; enAttente?: boolean }) {
  return <Vignette url={useUrlLocale(id)} alt={alt} enAttente={enAttente} />;
}
