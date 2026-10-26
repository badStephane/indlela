"use client";

// Suit la pile de navigation interne pour que « ‹ » revienne à l'écran
// précédent, ou à un écran parent quand on arrive par un lien direct.

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const stack: string[] = [];

export function NavTracker() {
  const path = usePathname();
  useEffect(() => {
    if (stack[stack.length - 1] === path) return;
    if (stack[stack.length - 2] === path) stack.pop();
    else stack.push(path);
  }, [path]);
  return null;
}

export function useBack(fallback: string) {
  const router = useRouter();
  return useCallback(() => {
    if (stack.length > 1) router.back();
    else {
      // L'écran courant est remplacé : il ne doit pas rester dans la pile.
      stack.pop();
      router.replace(fallback);
    }
  }, [router, fallback]);
}
