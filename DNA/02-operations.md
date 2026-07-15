# Operativita

## Repository e Git

Repository operativo:

```text
https://github.com/ca-shin/ccv-colli
```

Branch attesa:

```text
main
```

Remote locale rilevato:

- `origin`: `https://github.com/ca-shin/ccv-colli.git`.

Nel workspace verificato il remote non contiene token incorporati nell'URL. Note storiche su remote `github` con token vanno trattate come non attuali finche `git remote -v` non mostra diversamente.

Workflow GitHub Actions presente:

- `.github/workflows/ci.yml`: esegue `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run build` su push a `main` e pull request.

Il repository GitHub e privato; connector GitHub e `gh` risultano utilizzabili nel workspace verificato.

## Automatismi e sincronizzazioni

- Push su `main` -> GitHub Actions `CI` valida installazione, typecheck, lint e build.
- Render e collegato al repo `ca-shin/ccv-colli`, branch `main`, con `autoDeploy: yes`: un push su `main` puo avviare deploy automatico.
- Il deploy Render non modifica database o dati: esegue build web/server e avvia `npm run server:prod`.
- Runtime server: in produzione Express serve la SPA da `dist/`; in sviluppo proxy non-API verso il dev server web su `localhost:8081` anche se `dist/` esiste.
- Supabase non ha migrazioni automatiche nel repo. Il server usa SDK Supabase e mantiene cache in memoria con TTL predefinito 30 secondi, configurabile con `MENU_CACHE_TTL_MS` e invalidata dopo mutazioni admin.
- Keepalive Supabase Free: `.github/workflows/supabase-keepalive.yml` esegue ogni giorno una lettura REST minima `sections?select=id&limit=1`, con timeout e retry. Non scrive dati e non passa dal runtime Render.
- Endpoint manuale `/api/heartbeat`: esegue la stessa lettura minima via SDK server, utile solo per smoke test manuali.
- Service worker: `public/sw.js` si registra dal documento HTML, non cachea risposte API e passa le richieste non-API alla rete.

## Script npm

Da `package.json`:

```text
npm run dev:5001             # dev locale live: Express 5001 + Expo 8081, non serve dist/
npm run server:dev          # NODE_ENV=development tsx server/index.ts
npm run start               # avvia il dev server web
npm run web:dev             # dev server web Expo su localhost:8081
npm run web:build           # esporta la SPA web in dist/
npm run build               # web build + server build
npm run preview:5001         # build completa + preview production locale su 5001
npm run server:build        # esbuild server/index.ts -> server_dist
npm run server:prod         # NODE_ENV=production node server_dist/index.js
npm run lint                # npx expo lint
```

Nota: non usare flussi legacy alternativi. Per Render serve `npm run build`, che produce `dist/` e `server_dist/`.

## Dipendenze e audit

`package.json` usa `overrides` npm mirati per mantenere patchati `postcss` e `uuid`, dipendenze transitive del toolchain Expo/Metro/prebuild. Non rimuovere questi override senza eseguire almeno:

```text
npm ci
npm audit --omit=dev
npx tsc --noEmit
npm run lint
npm run build
```

## Variabili ambiente

Variabili richieste dal codice/deploy:

```text
PORT
SUPABASE_URL
SUPABASE_SERVICE_KEY
SUPABASE_ANON_KEY
DATABASE_URL
ADMIN_PASSWORD
EXPO_PUBLIC_DOMAIN
```

Note:

- `SUPABASE_SERVICE_KEY` e il nome letto dal codice. Non usare `SUPABASE_SERVICE_ROLE_KEY` come sostituto senza aggiornare il codice/deploy.
- `.env` e ignorato da Git e puo contenere appunti/variabili locali.
- `.env.render` contiene valori reali, e stato rimosso dal tracking nella working tree ed e coperto da `.gitignore`. Trattare comunque lo storico Git come rischio finche non viene valutata rotazione credenziali. Non copiarne i valori in documentazione.
- `ADMIN_PASSWORD` ha fallback codice `1909` e resta il PIN iniziale/fallback; se il PIN viene modificato dal pannello admin, il valore attivo viene salvato come hash scrypt nella tabella Supabase `admin_settings`.
- `EXPO_PUBLIC_DOMAIN` e una variabile pubblica del web toolchain: deve essere solo hostname, senza protocollo, per esempio `ccvcolli-ghxg.onrender.com`.

## Supabase

Progetto Supabase tracciato nella documentazione:

```text
https://adnuggzwppvsvwspmzek.supabase.co
```

Nome progetto documentato:

```text
ccvcolli
```

Uso reale:

- API server usa `SUPABASE_SERVICE_KEY`.
- Il client non accede direttamente a Supabase per il menu: passa dalle API Express.
- Il PIN admin modificabile e salvato server-side nella tabella `admin_settings`; il client admin usa solo endpoint Express protetti.
- `DATABASE_URL` serve solo a verifiche operative read-only; il server runtime usa Supabase SDK.
- Keepalive GitHub Actions: workflow schedulato `Supabase Keepalive`, richiede repository secrets `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`.
- Endpoint manuale: `/api/heartbeat`, read-only minimale su `sections`.
- Connector Supabase verificato sul progetto operativo `ccvcolli` (`adnuggzwppvsvwspmzek`).
- Supabase CLI e installata, ma il progetto locale non risulta linkato (`supabase link` non eseguito nel workspace verificato).
- Verifiche read-only via `DATABASE_URL` hanno confermato Postgres 17.6, RLS attiva sulle tabelle operative, 3 foreign key e nessuna funzione nello schema `public`.
- Supabase advisors security: zero lints. Performance puo mostrare INFO su indici menu inutilizzati; non rimuoverli senza analisi d'uso reale.

## Render

Hosting corrente ricostruito il 2026-05-10 dopo cancellazione accidentale del vecchio account/servizio.

Vecchio URL critico stampato sui QR:

```text
https://ccvcolli.onrender.com
```

Nuovo servizio temporaneo creato:

```text
https://ccvcolli-ghxg.onrender.com
```

Configurazione verificata per Web Service Render:

```text
Name: ccvcolli
Repo: ca-shin/ccv-colli
Branch: main
Language: Node
Region: Frankfurt (EU Central)
Instance Type: Free
Build Command attuale Render: npm install && npx expo export --platform web && npm run server:build
Start Command: npm run server:prod
```

Verifica API Render in sola lettura del 2026-05-31:

```text
Service ID: srv-d80defl7vvec73e45ikg
Name: ccvcolli
Type: web_service
Repo: https://github.com/ca-shin/ccv-colli
Branch: main
autoDeploy: yes
URL: https://ccvcolli-ghxg.onrender.com
Region: frankfurt
Plan: free
Build Command attuale Render: npm install && npx expo export --platform web && npm run server:build
Start Command: npm run server:prod
```

Nota: `npm run build` e il comando locale/CI canonico equivalente per web build + server build. Render attualmente usa la forma esplicita `npx expo export --platform web && npm run server:build`; non cambiarla senza verifica deploy.

Deploy verificato dai log:

- `Exported: dist`
- `Web build detected — serving web bundle from dist/`
- `SPA fallback enabled — all non-API routes -> dist/index.html`
- `express server serving on port 5000`
- `Your service is live`

Se `dist/` manca in produzione, il server non puo servire la SPA web corretta.

## URL da verificare

Temporanei, finche Render non riassegna il vecchio subdomain:

```text
https://ccvcolli-ghxg.onrender.com
https://ccvcolli-ghxg.onrender.com/api/health
https://ccvcolli-ghxg.onrender.com/admina
```

Target finale da ripristinare:

```text
https://ccvcolli.onrender.com
https://ccvcolli.onrender.com/api/health
https://ccvcolli.onrender.com/admina
```

## Backup e artefatti

Backup locali operativi:

- cartella root: `BACKUP/`;
- formato nome: `Backup_Giorno Mese_HH.MM`;
- un solo file compresso, senza estensione nel nome;
- includere i file utili al ripristino operativo, inclusi `.env` locali presenti e necessari;
- escludere sempre `.git`, `node_modules`, `dist`, `server_dist`, build/cache/coverage/log, backup precedenti e `BACKUP/`;
- non committare mai backup o segreti.

Backup esterni reali e procedura restore completa restano da documentare. Vedere [05-gaps.md](./05-gaps.md).

## Validazioni consigliate

Locale:

```text
npm install
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Render:

```text
Manual Deploy -> Clear build cache & deploy
```

Dopo deploy:

```text
/api/health
/
/admina
```

Attenzione: `npx tsc --noEmit` senza `node_modules` locali genera errori non significativi. Installare dipendenze prima.
