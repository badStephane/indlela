export type EtatSync = "en-ligne" | "hors-ligne" | "erreur";

/** Point orange : une saisie attend le réseau. À placer à côté du nom d'un jeune. */
export function PointAttente({ libelle = "Saisie en attente du réseau" }: { libelle?: string }) {
  return <span role="img" aria-label={libelle} title={libelle} className="inline-block size-[9px] shrink-0 rounded-full bg-attente" />;
}

/**
 * Pastille de synchronisation en haut d'écran. Ne se coupe jamais sur deux lignes.
 * Bouton seulement quand il y a un envoi à relancer ; sinon simple étiquette.
 */
export function PastilleSync({ etat, enAttente = 0, onRelancer }: { etat: EtatSync; enAttente?: number; onRelancer?: () => void }) {
  const libelle = etat === "en-ligne" ? "En ligne" : etat === "hors-ligne" ? `Hors ligne · ${enAttente}` : "Envoi en échec";
  const point = etat === "en-ligne" ? "bg-sentier" : etat === "hors-ligne" ? "bg-attente" : "bg-erreur";
  const classes = `inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-[1.5px] bg-fond px-2.5 text-[13px] font-semibold ${etat === "erreur" ? "border-erreur text-erreur" : "border-encre text-encre"}`;
  const contenu = (
    <>
      <span aria-hidden="true" className={`size-[9px] rounded-full ${point}`} />
      {libelle}
    </>
  );
  if (etat === "en-ligne" || !onRelancer) {
    return <span role="status" className={classes}>{contenu}</span>;
  }
  return (
    <button type="button" onClick={onRelancer} aria-label={`${libelle}. Toucher pour réessayer`} className={classes}>
      {contenu}
    </button>
  );
}
