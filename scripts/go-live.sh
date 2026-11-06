#!/usr/bin/env bash
# Takes the Firebase relaunch live in one go. Run from the repo root:
#
#   bash scripts/go-live.sh ~/Downloads/immo-2d39f-firebase-adminsdk-XXXX.json
#
# Needs: Firebase Blaze plan with Storage enabled, the service account key
# (Firebase console > Project settings > Service accounts > Generate new private
# key), `npx vercel login` and `firebase login` done once.
set -euo pipefail

KEY="${1:?Pfad zur Service-Account-JSON angeben}"
[ -f "$KEY" ] || { echo "Datei nicht gefunden: $KEY"; exit 1; }
cd "$(dirname "$0")/.."
EXPORT=".migration"
# A Vercel CLI that is already on the machine (npx installs can fail on a
# root-owned npm cache), else npx.
VERCEL="$(command -v vercel || ls "$HOME"/.npm/_npx/*/node_modules/.bin/vercel 2>/dev/null | head -1 || true)"
[ -n "$VERCEL" ] || VERCEL="npx --yes vercel@latest"

echo "1/6 Firebase-Regeln und Storage-Regeln deployen"
firebase deploy --only firestore:rules,firestore:indexes,storage --project immo-2d39f

echo "2/6 Aktuellen Stand aus Supabase exportieren (nur lesen)"
mkdir -p "$EXPORT/files"
q() { npx --yes supabase@latest db query --remote=pinjrulpxlpwwxtvpvwn --read-only -o json "$2" > "$EXPORT/$1.json"; }
q users "select id, email, encrypted_password, email_confirmed_at, created_at, last_sign_in_at, raw_user_meta_data, raw_app_meta_data from auth.users"
q identities "select user_id, provider, provider_id, identity_data, created_at from auth.identities"
q properties "select * from public.properties"
q documents "select * from public.documents"
q subscriptions "select * from public.subscriptions"
q profiles "select * from public.profiles"
python3 -c "
import json
for d in json.load(open('$EXPORT/documents.json'))['rows']:
    if d['property_id']: print(d['file_path'])" | while read -r p; do
  [ -f "$EXPORT/files/$p" ] && continue
  mkdir -p "$EXPORT/files/$(dirname "$p")"
  npx --yes supabase@latest storage cp "ss:///property-documents/$p" "$EXPORT/files/$p" --experimental --remote=pinjrulpxlpwwxtvpvwn >/dev/null
done

echo "3/6 Daten nach Firebase umziehen"
FIREBASE_SERVICE_ACCOUNT="$KEY" node scripts/migrate-from-supabase.mjs "$EXPORT"

echo "4/6 Vercel: Firebase-Schlüssel setzen, Supabase-Variablen entfernen"
# Production only: there is no staging any more.
$VERCEL env rm FIREBASE_SERVICE_ACCOUNT production --yes >/dev/null 2>&1 || true
base64 < "$KEY" | tr -d '\n' | $VERCEL env add FIREBASE_SERVICE_ACCOUNT production
for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY REVENUECAT_WEBHOOK_SECRET AI_CHAT_MONTHLY_LIMIT; do
  for envname in production preview development; do
    $VERCEL env rm "$v" "$envname" --yes >/dev/null 2>&1 || true
  done
done

echo "5/6 Code auf main bringen (Vercel baut und veröffentlicht)"
git checkout main
git merge --ff-only relaunch-firebase
git push origin main
git checkout relaunch-firebase

echo "6/6 Fertig. Vercel baut jetzt, das dauert 2 bis 3 Minuten: https://www.immotrim.com"
echo "Den Ordner $EXPORT mit den exportierten Daten erst löschen, wenn alles läuft."
