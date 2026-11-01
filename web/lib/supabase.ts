"use client";

// Client Supabase du navigateur. Null tant que l'URL et la clé publique ne sont pas configurées
// (web/.env.local) : l'application reste alors en mode démo, sans serveur.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
