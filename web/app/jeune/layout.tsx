import { Suspense } from "react";

// Les écrans d'un jeune lisent son identifiant dans l'adresse (useSearchParams) : pages
// statiques, rendues côté téléphone.
export default function JeuneLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
