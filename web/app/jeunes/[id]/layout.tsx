import { seedJeunes } from "@/lib/mock";

// Fiches des jeunes de démo générées d'avance. Un jeune ajouté par le chef d'unité
// n'existe que sur le téléphone : sa page est rendue à la demande (dynamicParams).
export function generateStaticParams() {
  return seedJeunes().map((j) => ({ id: j.id }));
}

export const dynamicParams = true;

export default function JeuneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
