// Écrit public/sw.js à partir du modèle, avec un numéro de version propre à ce build.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const here = new URL(".", import.meta.url);
let commit = "local";
try {
  commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {
  // Pas de dépôt git (archive) : la date suffit à distinguer les versions.
}
const version = `${commit}-${Date.now().toString(36)}`;
const template = readFileSync(new URL("sw.template.js", here), "utf8");
writeFileSync(new URL("../public/sw.js", here), template.replaceAll("__BUILD_VERSION__", version));
console.log(`sw.js · version ${version}`);
