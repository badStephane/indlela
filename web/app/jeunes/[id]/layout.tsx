import { ALL_JEUNES } from "@/lib/mock";

// Pages des fiches générées d'avance : elles s'ouvrent aussi hors connexion.
export function generateStaticParams() {
  return ALL_JEUNES.map((j) => ({ id: j.id }));
}

export const dynamicParams = true;

export default function JeuneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
