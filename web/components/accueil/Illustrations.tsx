// Illustrations de la page d'accueil, dessinées dans les couleurs du Sentier (globals.css).
// Décoratives : le texte voisin dit déjà tout, elles sont masquées des lecteurs d'écran.

const FORET = "#0b3d24";
const VERT = "#0b6e3c";
const VERT_PALE = "#b5d3c1";
const SOLEIL = "#f2b400";
const PAPIER = "#f4f1e8";
const SURFACE = "#fffdf8";

/** Un pin : trois étages de branches et un tronc. */
function Pin({ x, y, h, couleur }: { x: number; y: number; h: number; couleur: string }) {
  const l = h * 0.42;
  return (
    <g>
      <rect x={x - 1.5} y={y - h * 0.18} width={3} height={h * 0.18} fill="#3b2a1a" />
      <path d={`M${x} ${y - h} L${x + l * 0.6} ${y - h * 0.62} L${x - l * 0.6} ${y - h * 0.62} Z`} fill={couleur} />
      <path d={`M${x} ${y - h * 0.8} L${x + l * 0.8} ${y - h * 0.38} L${x - l * 0.8} ${y - h * 0.38} Z`} fill={couleur} />
      <path d={`M${x} ${y - h * 0.58} L${x + l} ${y - h * 0.16} L${x - l} ${y - h * 0.16} Z`} fill={couleur} />
    </g>
  );
}

/** Le chemin qui serpente entre les collines jusqu'au soleil, avec la tente et le fanion du camp. */
export function Paysage({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 340" className={className} aria-hidden focusable="false">
      {/* Les bords se fondent dans le vert de l'en-tête : une scène, pas un cadre découpé. */}
      <defs>
        <radialGradient id="paysage-fondu" cx="50%" cy="46%" r="50%">
          <stop offset="58%" stopColor="#fff" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <mask id="paysage-masque">
          <rect width="480" height="340" fill="url(#paysage-fondu)" />
        </mask>
      </defs>
      <g mask="url(#paysage-masque)">
        <circle cx="352" cy="108" r="64" fill={SOLEIL} opacity="0.12" />
        <circle cx="352" cy="108" r="36" fill={SOLEIL} />
        <path d="M0 214 C70 176 150 196 236 174 S392 136 480 166 V340 H0 Z" fill="#134a2e" />
        <path d="M0 252 C96 222 196 240 286 214 S420 200 480 220 V340 H0 Z" fill="#185837" />
        <Pin x={402} y={214} h={46} couleur="#0e5131" />
        <Pin x={428} y={222} h={34} couleur="#0e5131" />
        <path d="M0 292 C118 270 232 284 334 266 S452 270 480 280 V340 H0 Z" fill="#1f6a43" />
        {/* Le chemin : pointillé, qui monte vers l'horizon. */}
        <path
          d="M86 340 C150 316 250 314 226 288 S150 252 232 238 S330 214 330 186"
          fill="none"
          stroke={VERT_PALE}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="1 12"
        />
        <path d="M86 340 C150 316 250 314 226 288 S150 252 232 238 S330 214 330 186" fill="none" stroke={VERT_PALE} strokeWidth="1.5" opacity="0.35" />
        {/* La tente. */}
        <path d="M96 286 L130 236 L164 286 Z" fill={PAPIER} />
        <path d="M130 236 L164 286 H150 Z" fill="#dcd5c3" />
        <path d="M122 286 L130 262 L138 286 Z" fill={FORET} />
        <path d="M88 287 H172" stroke="#0e5131" strokeWidth="3" strokeLinecap="round" />
        {/* Le fanion de la patrouille. */}
        <path d="M262 232 V196" stroke={PAPIER} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M263.5 197 L290 204 L263.5 211 Z" fill={SOLEIL} />
        <Pin x={46} y={300} h={52} couleur="#0b5a33" />
        <Pin x={22} y={312} h={38} couleur="#0b5a33" />
        <Pin x={452} y={300} h={40} couleur="#0b5a33" />
      </g>
    </svg>
  );
}

/** Saisie gardée sur le téléphone, envoyée quand le réseau revient. */
export function VignetteSansReseau({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <rect x="15" y="6" width="30" height="52" rx="6" fill={SURFACE} stroke={FORET} strokeWidth="2.5" />
      <path d="M22 18 H38 M22 26 H34 M22 34 H37" stroke={VERT} strokeWidth="3" strokeLinecap="round" />
      <circle cx="22" cy="42" r="2.5" fill={VERT_PALE} />
      <circle cx="48" cy="44" r="11" fill={SOLEIL} />
      <path d="M48 50 V38 M43 43 L48 38 L53 43" fill="none" stroke={FORET} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Identifiant remis en main propre par l'administrateur du groupe. */
export function VignetteCompte({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <rect x="6" y="16" width="46" height="32" rx="5" fill={VERT_PALE} stroke={FORET} strokeWidth="2.5" />
      <circle cx="20" cy="30" r="5" fill={FORET} />
      <path d="M12 41 C13 36 27 36 28 41" fill={FORET} />
      <path d="M33 27 H45 M33 34 H42" stroke={FORET} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="52" cy="46" r="9" fill={SOLEIL} />
      <path d="M48 46 L51 49 L56.5 43" fill="none" stroke={FORET} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Fiches protégées : chacun ne voit que ce qui le concerne. */
export function VignetteProtection({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <path d="M32 6 L52 13 V30 C52 44 43 53 32 58 C21 53 12 44 12 30 V13 Z" fill={VERT} stroke={FORET} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 12 L46 17 V30 C46 40 40 47 32 51 Z" fill={FORET} opacity="0.25" />
      <path d="M23 31 L29.5 37.5 L42 25" fill="none" stroke={PAPIER} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="47" cy="12" r="4" fill={SOLEIL} />
    </svg>
  );
}
