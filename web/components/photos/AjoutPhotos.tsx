"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { usePhotos } from "@/lib/photosStore";
import { MAX_PHOTOS } from "@/lib/photos";
import { VignetteLocale } from "./Vignette";

const boutonClass =
  "flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[13px] font-bold text-ink focus-within:outline focus-within:outline-2 focus-within:outline-acc";

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
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-[15px] font-bold text-ink shadow-sm"
              >
                ×
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
          {busy && <span className="text-[12px] text-muted">Préparation…</span>}
        </div>
      )}
      <span className="text-[12px] font-normal text-muted text-pretty">
        Facultatif, {MAX_PHOTOS} au plus. Photographiez le travail réussi (nœud, construction, carte…), pas les visages.
      </span>
      {err && (
        <span role="alert" className="text-[12px] font-semibold text-err-ink">
          {err}
        </span>
      )}
    </div>
  );
}
