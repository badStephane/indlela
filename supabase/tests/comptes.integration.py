"""Test d'intégration de la connexion et de la fonction « comptes », sur la pile Supabase locale.

    supabase start && supabase functions serve      (dans un autre terminal)
    eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
    API_URL=$API_URL ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY python3 -I supabase/tests/comptes.integration.py

Crée un groupe et un admin jetables (identifiants uniques), puis vérifie : refus sans second facteur,
enrôlement TOTP, création de compte, doublon, mot de passe faible, refus pour un cadre, changement
de mot de passe, journal, retrait du second facteur. Ne touche à rien d'autre.
"""

import base64
import hashlib
import hmac
import json
import os
import struct
import sys
import time
import urllib.error
import urllib.request
import uuid

API = os.environ["API_URL"].rstrip("/")
ANON = os.environ["ANON_KEY"]
SERVICE = os.environ["SERVICE_ROLE_KEY"]
DOMAINE = "comptes.indlela.invalid"
SUFFIXE = uuid.uuid4().hex[:6]
ECHECS = []


def appel(methode, chemin, corps=None, jeton=None, cle=ANON):
    req = urllib.request.Request(API + chemin, method=methode, data=json.dumps(corps).encode() if corps is not None else None)
    req.add_header("apikey", cle)
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {jeton or cle}")
    if chemin.startswith("/rest/"):
        req.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(req) as r:
            texte = r.read().decode()
            return r.status, json.loads(texte) if texte else None
    except urllib.error.HTTPError as e:
        texte = e.read().decode()
        return e.code, json.loads(texte) if texte else None


def verifier(condition, libelle, detail=""):
    print(("ok   " if condition else "ÉCHEC ") + libelle + ("" if condition else f"  {str(detail)[:300]}"))
    if not condition:
        ECHECS.append(libelle)


def totp(secret):
    cle = base64.b32decode(secret + "=" * (-len(secret) % 8))
    compteur = struct.pack(">Q", int(time.time()) // 30)
    h = hmac.new(cle, compteur, hashlib.sha1).digest()
    o = h[-1] & 0x0F
    return f"{(struct.unpack('>I', h[o:o + 4])[0] & 0x7FFFFFFF) % 1_000_000:06d}"


def connexion(identifiant, mdp):
    return appel("POST", "/auth/v1/token?grant_type=password", {"email": f"{identifiant}@{DOMAINE}", "password": mdp})


def comptes(jeton, corps):
    return appel("POST", "/functions/v1/comptes", corps, jeton=jeton)


# ─── Groupe et admin jetables (clé de service) ────────────────────────────────
s, g = appel("POST", "/rest/v1/groupes", {"nom": f"Essai {SUFFIXE}", "paroisse": "Test"}, cle=SERVICE)
groupe_id = g[0]["id"]
admin_id_txt, admin_mdp = f"admin.{SUFFIXE}", "adminessai2026"
s, u = appel("POST", "/auth/v1/admin/users", {"email": f"{admin_id_txt}@{DOMAINE}", "password": admin_mdp, "email_confirm": True}, cle=SERVICE)
admin_id = u["id"]
appel("POST", "/rest/v1/utilisateurs", {"id": admin_id, "groupe_id": groupe_id, "nom": "Admin Essai", "identifiant": admin_id_txt, "role": "admin"}, cle=SERVICE)

# ─── Sans second facteur : refus ──────────────────────────────────────────────
s, sess = connexion(admin_id_txt, admin_mdp)
verifier(s == 200, "l'admin se connecte avec identifiant et mot de passe", sess)
aal1 = sess["access_token"]
s, r = comptes(aal1, {"action": "creer", "nom": "X", "identifiant": f"x.{SUFFIXE}", "role": "cadre", "motDePasse": "motdepasse123"})
verifier(s == 403, "sans second facteur, la fonction refuse", r)
s, r = appel("GET", "/rest/v1/groupes?select=nom", jeton=aal1)
verifier(s == 200 and r == [], "sans second facteur, la base ne montre rien à l'admin", r)

# ─── Enrôlement TOTP puis vérification : aal2 ─────────────────────────────────
s, f = appel("POST", "/auth/v1/factors", {"factor_type": "totp", "friendly_name": "Indlela"}, jeton=aal1)
verifier(s == 200 and "<svg" in f["totp"]["qr_code"], "enrôlement : QR code et clé fournis", f)
s, ch = appel("POST", f"/auth/v1/factors/{f['id']}/challenge", {}, jeton=aal1)
s, v = appel("POST", f"/auth/v1/factors/{f['id']}/verify", {"challenge_id": ch["id"], "code": "000000"}, jeton=aal1)
verifier(s >= 400, "un code faux est refusé", v)
s, ch = appel("POST", f"/auth/v1/factors/{f['id']}/challenge", {}, jeton=aal1)
s, v = appel("POST", f"/auth/v1/factors/{f['id']}/verify", {"challenge_id": ch["id"], "code": totp(f["totp"]["secret"])}, jeton=aal1)
verifier(s == 200, "le code de l'application est accepté", v)
aal2 = v["access_token"]
s, r = appel("GET", "/rest/v1/groupes?select=nom", jeton=aal2)
verifier(s == 200 and len(r) == 1, "avec le second facteur, l'admin voit son groupe", r)

# ─── Création de comptes ──────────────────────────────────────────────────────
cadre_txt = f"cadre.{SUFFIXE}"
s, r = comptes(aal2, {"action": "creer", "nom": "Cadre Essai", "identifiant": cadre_txt, "role": "cadre", "motDePasse": "cadreessai2026"})
verifier(s == 201 and r["ok"], "l'admin crée un compte de cadre", r)
cadre_id = r["data"]["id"] if r and r.get("ok") else ""
s, r = comptes(aal2, {"action": "creer", "nom": "Doublon", "identifiant": cadre_txt, "role": "cadre", "motDePasse": "cadreessai2026"})
verifier(s == 409, "un identifiant déjà pris est refusé", r)
s, r = comptes(aal2, {"action": "creer", "nom": "Faible", "identifiant": f"faible.{SUFFIXE}", "role": "cadre", "motDePasse": "court"})
verifier(s == 400, "un mot de passe faible est refusé", r)
s, r = comptes(aal2, {"action": "creer", "nom": "Rôle", "identifiant": f"role.{SUFFIXE}", "role": "superadmin", "motDePasse": "motdepasse123"})
verifier(s == 400, "un rôle inconnu est refusé", r)

s, sc = connexion(cadre_txt, "cadreessai2026")
verifier(s == 200, "le cadre se connecte avec le mot de passe remis", sc)
s, r = appel("GET", "/rest/v1/utilisateurs?select=role,groupe_id", jeton=sc["access_token"])
verifier(s == 200 and r == [{"role": "cadre", "groupe_id": groupe_id}], "le cadre est rattaché au groupe de l'admin", r)
s, r = comptes(sc["access_token"], {"action": "creer", "nom": "Y", "identifiant": f"y.{SUFFIXE}", "role": "admin", "motDePasse": "motdepasse123"})
verifier(s == 403, "un cadre ne peut pas créer de compte", r)

# ─── Mot de passe, journal, second facteur ────────────────────────────────────
s, r = comptes(aal2, {"action": "mot-de-passe", "id": cadre_id, "motDePasse": "nouveaumdp2026"})
verifier(s == 200, "l'admin change le mot de passe du cadre", r)
verifier(connexion(cadre_txt, "cadreessai2026")[0] == 400, "l'ancien mot de passe ne marche plus")
verifier(connexion(cadre_txt, "nouveaumdp2026")[0] == 200, "le nouveau mot de passe marche")
s, r = comptes(aal2, {"action": "mot-de-passe", "id": str(uuid.uuid4()), "motDePasse": "nouveaumdp2026"})
verifier(s == 404, "un compte hors du groupe est introuvable", r)
s, r = appel("GET", f"/rest/v1/journal?select=resume,utilisateur_nom&groupe_id=eq.{groupe_id}&order=at", jeton=aal2)
verifier(s == 200 and [x["resume"] for x in r] == ["Compte Cadre Essai créé (cadre)", "Mot de passe de Cadre Essai réinitialisé"], "le journal garde la création et le changement", r)
s, r = comptes(aal2, {"action": "retirer-second-facteur", "id": admin_id})
verifier(s == 200 and r["data"]["retires"] == 1, "le second facteur d'un téléphone perdu se retire", r)

print(f"\n{'Tout passe.' if not ECHECS else f'{len(ECHECS)} échec(s).'}")
sys.exit(1 if ECHECS else 0)
