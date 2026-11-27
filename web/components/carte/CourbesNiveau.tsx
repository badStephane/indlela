/**
 * Courbes de niveau décoratives. À poser dans une BANDE VIDE (jamais sous du texte) :
 * le parent doit être `relative isolate`, la bande fixe sa hauteur et coupe le dessin.
 * Masquées sous `masquerSous` px pour ne pas passer sous le contenu sur petit écran.
 */
function trace(w: number, h: number, cx: number, cy: number, n: number, graine: number, base: number, pas: number) {
  return Array.from({ length: n }, (_, i) => {
    const r = base + i * pas;
    const pts = Array.from({ length: 73 }, (_, k) => {
      const a = (2 * Math.PI * k) / 72;
      const rr = r * (1 + 0.18 * Math.sin(3 * a + graine + i * 0.35) + 0.09 * Math.sin(5 * a + graine * 2 - i * 0.2) + 0.05 * Math.cos(7 * a + i));
      return `${(cx + rr * Math.cos(a) * 1.35).toFixed(0)} ${(cy + rr * Math.sin(a)).toFixed(0)}`;
    });
    return { d: `M${pts.join(" L")}Z`, maitresse: i % 4 === 3 };
  });
}

export function CourbesNiveau({ hauteur, haut = 0, gauche = "0", largeur = 420, graine = 1.7, masquerSous }: { hauteur: number; haut?: number | string; gauche?: string; largeur?: number; graine?: number; masquerSous?: 640 | 900 | 1100 }) {
  const chemins = trace(largeur, 360, largeur * 0.75, 90, 10, graine, 20, 18);
  const masque = masquerSous === 640 ? "max-sm:hidden" : masquerSous === 900 ? "max-[900px]:hidden" : masquerSous === 1100 ? "max-[1100px]:hidden" : "";
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute right-0 -z-10 overflow-hidden ${masque}`} style={{ top: haut, left: gauche, height: hauteur }}>
      <svg width={largeur} height={360} viewBox={`0 0 ${largeur} 360`} className="absolute right-0 top-0">
        {chemins.map((c, i) => (
          <path key={i} d={c.d} fill="none" stroke={c.maitresse ? "var(--color-courbe)" : "var(--color-courbe-claire)"} strokeWidth={c.maitresse ? 1.6 : 1} />
        ))}
      </svg>
    </div>
  );
}
