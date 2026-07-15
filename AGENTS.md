# AGENTS.md

## Regola primaria

Lavora in modo conservativo: il codice reale prevale sulla documentazione storica. Non modificare codice, database, deploy, UI o produzione senza richiesta esplicita. Prima di ogni modifica controlla `git status` e non sovrascrivere cambi non tuoi.

## Progetto

- App: menu digitale Camera Con Vista - Colli.
- Stack: React 19, React Native Web 0.21, Expo Router 6 come web toolchain, Express 5, Supabase JS, React Query.
- Package manager operativo: npm con `package-lock.json`.
- Backend: `server/index.ts` e `server/routes.ts`.
- Frontend: `app/`, con admin reale in `/admina`.
- Tipi condivisi: `shared/schema.ts`.
- Direzione prodotto futura: invertire gradualmente la collaborazione Camera Con Vista / Ca' Shin; ogni arancione ufficiale deve essere sempre `#c85f18`, allineato al logo.

## Env e segreti

- Non stampare mai valori di env, token, password o URL con credenziali.
- `.env` e file locale ignorato da Git.
- `.env.render` contiene segreti ed e stato rimosso dal tracking nella working tree; resta un rischio nello storico Git finche non viene valutata la rotazione credenziali se necessaria.
- Il codice server legge `SUPABASE_SERVICE_KEY`, non `SUPABASE_SERVICE_ROLE_KEY`.
- `ADMIN_PASSWORD` resta il fallback iniziale del PIN admin; se il PIN viene modificato dal pannello `/admina`, il valore attivo viene salvato come hash scrypt in `public.admin_settings`.
- Non rinominare o correggere env a intuito: verificare codice e deploy prima.

## Servizi verificati

- GitHub: repository privato `ca-shin/ccv-colli`, branch default `main`; connector GitHub e `gh` risultano utilizzabili in questo workspace. Non fare commit, push, PR o release senza richiesta esplicita.
- Supabase/Postgres: il server usa Supabase SDK con service key; il DB operativo e verificabile via connector Supabase sul progetto `ccvcolli` (`adnuggzwppvsvwspmzek`) e via `DATABASE_URL`. Supabase CLI e installata ma il progetto locale non risulta linkato (`supabase link` non eseguito). Non leggere dati applicativi di produzione e non modificare schema, policy, permessi o dati senza conferma.
- Render: API Render verificata con `RENDER_API_KEY` locale; servizio rilevato `ccvcolli` su `https://ccvcolli-ghxg.onrender.com`, repo `ca-shin/ccv-colli`, branch `main`, `autoDeploy: yes`. Non fare deploy, restart o modifiche env senza conferma.
- Google Sheet / Apps Script: nessuna integrazione reale rilevata nel repo; nessun file `.clasp.json`, `appsscript.json` o dipendenza `googleapis`.
- Browser/UI test: nessuna configurazione Playwright/Puppeteer rilevata. Gli script disponibili sono web dev server e build web; non modificare layout o comportamento UI senza richiesta.
- CI: workflow GitHub Actions in `.github/workflows/ci.yml` con `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Comandi sicuri di verifica

```bash
git status --short
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Note:

- `npm run build` genera `dist/` e `server_dist/`, ignorati da Git.
- Il web toolchain puo generare `.expo/` ed `expo-env.d.ts`, ignorati da Git.
- Per modifiche UI locali visibili subito usare `npm run dev:5001`: Express ascolta su `5001` e proxya Expo su `8081`, ignorando eventuali build `dist/` vecchie.
- Per preview production locale usare `npm run preview:5001`, che ricompila prima di servire `dist/`.
- I backup locali compressi vanno creati solo in `BACKUP/`, cartella ignorata da Git, includendo gli env locali necessari e mai nel commit.

## Deploy

Render web corretto:

```text
Build Command attuale Render: npm install && npx expo export --platform web && npm run server:build
Start Command: npm run server:prod
```

`npm run build` e il comando locale/CI canonico equivalente. Non reintrodurre flussi legacy alternativi: il deploy corrente serve `dist/` come web SPA.

## Rischi da non ignorare

- Endpoint `/api/admin/*` sono protetti da sessione cookie HttpOnly firmata lato server; il login admin ha rate limit in memoria per IP. Il PIN admin modificabile vive in `public.admin_settings` come hash scrypt; dopo cambio PIN il server emette un nuovo cookie firmato. Restano da valutare audit log persistente e scadenze/session revocation piu evolute.
- CORS e ristretto a stesso host, localhost/dev e domini Render attesi.
- `/api/health` non deve esporre dettagli o prefissi di env.
- `ensureWineSectionIntegrity()` deve restare read-only: non creare/cancellare/aggiornare record all'avvio.
- Supabase advisors security devono restare puliti; performance puo segnalare INFO su indici inutilizzati da non rimuovere senza analisi d'uso reale.
- `npm audit` resta da monitorare: dopo remediation non-forzata restano vulnerabilita moderate transitive legate al toolchain Expo/Metro; non usare `npm audit fix --force` senza pianificare upgrade major.
