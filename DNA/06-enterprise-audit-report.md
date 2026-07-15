# Enterprise Audit Report

Data: 2026-05-31

Nota successiva 2026-06-01: sono state aggiunte migrazioni Supabase versionate per `admin_settings`, usata dal PIN admin modificabile lato server. Lo stato sotto resta il report storico del 2026-05-31.

## Sintesi

Analisi eseguita in sola diagnosi sul progetto `ccvcolli`: codice, configurazioni, documentazione, script, CI, runtime locale e controlli Supabase read-only.

## Stato

- Smoke locale del bundle di produzione su porta `5001`: `/`, `/api/health` e `/favicon.webp` rispondono `200`.
- `npm run lint`: OK.
- `npx tsc --noEmit`: OK.
- `npm run build`: OK.
- `npm ci`: OK.
- `npm audit --omit=dev`: zero vulnerabilita.
- Supabase project `ccvcolli` (`adnuggzwppvsvwspmzek`) `ACTIVE_HEALTHY`.
- Supabase advisors security/performance: zero lint.

## DB Supabase

- Tabelle operative: `sections`, `categories`, `dishes`, `wine_categories`, `wines`, `allergens`.
- RLS attiva su tutte le tabelle operative.
- Policy service-role-only presenti per SELECT/INSERT/UPDATE/DELETE.
- Edge Functions: nessuna.
- Migrazioni Supabase versionate: nessuna rilevata.
- Dati verificati: nessun orphan, nessun allergene sconosciuto, una sola sezione vino, nessun duplicato di ordine.

## Rischi Prioritari

1. Auth admin parzialmente rafforzata: login con rate limiting in memoria; restano audit log persistente, logout e revoca sessioni.
2. Fallback admin password `1909` lato server e PIN cancellazione hardcoded lato client in `components/admina/PinConfirmModal.tsx`.
3. Grant SQL a `anon`/`authenticated` troppo ampi anche se RLS blocca l'accesso.
4. Nessun sistema di migrazioni Supabase versionato nel repo.
5. Mutazioni admin non atomiche su reorder/delete complessi.
6. Validazione input API debole.
7. Campo `extra_info` presente nello schema ma non modificabile realmente dal modal admin.
8. Home contiene stato menu/dropdown ma non un controllo visibile per aprirlo.
9. `/api/health` ora resta minimale anche in caso di failure; mantenere questa proprieta nelle modifiche future.
10. Audit npm pulito con `overrides` per `postcss` e `uuid`; rivalutare gli override al prossimo upgrade Expo/Metro.

## Priorita Enterprise

- P0: hardening auth admin e audit trail.
- P1: migrazioni DB versionate, least privilege sui grant, transazioni/RPC per mutazioni composte.
- P1: verifica storico Git e rotazione segreti se necessario.
- P2: validazione schema API, upgrade Expo/Metro pianificato, rifiniture admin/UI.
