"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { usePhotos } from "@/lib/photosStore";
import { MAX_PHOTOS } from "@/lib/photos";
import { VignetteLocale } from "./Vignette";

const boutonClass =
  "flex min-h-11 cursor-pointer items-center gap-1.5 border-[1.5px] border-dashed border-encre bg-fond px-3 text-[15px] font-semibold text-encre focus-within:outline focus-within:outline-[3px] focus-within:outline-soleil";

/** Écran tactile : l'appareil photo s'ouvre directement ; sur ordinateur, on choisit un fichier. */
function useTactile(): boolean {
  const [tactile, setTactile] = useState(false);
  useEffect(() => setTactile(window.matchMedia("(pointer: coarse)").matches), []);
  return tactile;
}

interface AjoutPhotosProps {
  preuve: string;
  ids: string[];
  onChange: (ids: string[]) => void;
}

/** Photos jointes à une preuve cochée : prises ou choisies, réduites et gardées sur le téléphone. */
export function AjoutPhotos({ preuve, ids, onChange }: AjoutPhotosProps) {
  const photos = usePhotos();
  const tactile = useTactile();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reste = MAX_PHOTOS - ids.length;

  const ajouter = async (e: ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(e.target.files ?? []).slice(0, reste);
    e.target.value = "";
    if (!fichiers.length) return;
    setBusy(true);
    setErr(null);
    const nouveaux: string[] = [];
    for (const f of fichiers) {
      const r = await photos.preparer(f);
      if (r.ok) nouveaux.push(r.id);
      else setErr(r.erreur);
    }
    setBusy(false);
    if (nouveaux.length) onChange([...ids, ...nouveaux]);
  };

  const retirer = (id: string) => {
    photos.abandonner(id);
    onChange(ids.filter((x) => x !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      {ids.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ids.map((id, k) => (
            <span key={id} className="relative">
              <VignetteLocale id={id} alt={`Photo ${k + 1} de « ${preuve} »`} />
              <button
                type="button"
                onClick={() => retirer(id)}
                aria-label={`Retirer la photo ${k + 1}`}
                className="absolute -right-3 -top-3 flex size-11 items-center justify-center bg-transparent"
              >
                <span aria-hidden="true" className="flex size-7 items-center justify-center border-[1.5px] border-encre bg-fond text-[15px] font-bold text-encre">
                  ×
                </span>
              </button>
            </span>
          ))}
        </div>
      )}
      {reste > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {tactile && (
            <label className={boutonClass}>
              <input type="file" accept="image/*" capture="environment" onChange={ajouter} disabled={busy} className="sr-only" />
              Prendre une photo
            </label>
          )}
          <label className={boutonClass}>
            <input type="file" accept="image/*" multiple onChange={ajouter} disabled={busy} className="sr-only" />
            {tactile ? "Galerie" : "Ajouter une photo"}
          </label>
          {busy && <span className="text-[14px] text-crayon">Préparation…</span>}
        </div>
      )}
      <span className="text-[14px] font-normal text-crayon text-pretty">
        Facultatif, {MAX_PHOTOS} au plus. Photographiez le travail réussi (nœud, construction, carte…), pas les visages.
      </span>
      {err && (
        <span role="alert" className="text-[14px] font-semibold text-erreur">
          {err}
        </span>
      )}
    </div>
  );
}
