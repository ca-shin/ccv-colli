# Progetto - Stato Reale

## Identita

- Nome web app: `Camera Con Vista`
- Scopo: menu digitale web per Camera Con Vista - Colli.
- Stack reale: React 19, React Native Web 0.21, Expo Router 6 come web toolchain, Express 5, Supabase JS, React Query.
- Repository GitHub corretto: `ca-shin/ccv-colli`
- Branch operativa attesa: `main`

## Struttura

```text
app/                  Routing web: home, menu pubblico, admin/admina
components/           Componenti condivisi, pannello admina e style module estratti
constants/colors.ts   Palette UI
lib/query-client.ts   Risoluzione API URL e React Query client
server/               Express, API, Supabase adapter
shared/schema.ts      Interfacce TypeScript condivise
assets/images/        Logo, favicon PNG, icone PNG servite dal server
public/               Service worker e favicon WebP pubblica
```

## Frontend

Rotte principali:

- `/`: home pubblica con intro Ca' Shin mostrata a ogni avvio/refresh; al termine dell'intro l'utente atterra sempre sulla home.
- `/menu/[section]`: pagina sezione, piatti o vini.
- `/admina`: login admin.
- `/admina/panel`: pannello admin operativo.
- `/admin/*`: esistono stub/redirect legacy; l'admin reale e `/admina`.

Il client legge il menu con React Query usando:

```text
queryKey: ["/api/menu/draft"]
```

Quindi menu pubblico e admin leggono la stessa snapshot. Non esiste un vero flusso draft/live nel codice attuale.

`lib/query-client.ts` risolve la base API cosi:

- se `EXPO_PUBLIC_DOMAIN` e presente: usa `http://` per localhost, `https://` altrimenti;
- su web senza `EXPO_PUBLIC_DOMAIN`: usa `window.location.origin`;
- fuori dal browser con env mancante: lancia errore.

## Backend

Entrypoint:

```text
server/index.ts
```

Funzioni reali:

- Express con `compression()`.
- CORS ristretto a stesso host, localhost/dev e domini Render attesi.
- JSON/urlencoded body parsing.
- Logging API minimale con metodo, path, status e durata; non include payload JSON.
- In produzione serve la build web da `dist/`.
- In sviluppo proxy non-API verso il dev server web su `localhost:8081`, ignorando eventuali build `dist/` vecchie.
- SPA fallback verso `dist/index.html` solo in produzione.
- Ascolta su `process.env.PORT || 5000`, host `0.0.0.0`.
- Keepalive Supabase Free gestito da GitHub Actions con lettura REST minima schedulata.

API reali in `server/routes.ts`:

- `GET /api/health`
- `GET /api/heartbeat`
- `GET /api/menu`
- `GET /api/menu/draft`
- `POST /api/admin/login`
- CRUD e reorder admin per sections, categories, dishes, wine_categories, wines, allergens.

Endpoint citati storicamente ma non presenti nel codice:

- `POST /api/admin/publish`

## Dati e dominio

Supabase e la fonte dati operativa.

Snapshot caricata da `server/supabase.ts`:

- `sections`
- `categories`
- `dishes`
- `wine_categories`
- `wines`
- `allergens`

Cache server-side:

- in-memory;
- TTL predefinito 30 secondi (`MENU_CACHE_TTL_MS`, se impostato, sovrascrive il default);
- invalidata dopo mutazioni admin.

Entita TypeScript in `shared/schema.ts`:

- `Section`
- `Category`
- `Dish`
- `WineCategory`
- `Wine`
- `Allergen`
- `MenuSnapshot`

Logica critica:

- `ensureWineSectionIntegrity()` gira all'avvio server.
- Verifica in sola lettura che esista una sola sezione vini.
- Non crea, aggiorna o cancella record all'avvio: eventuali anomalie vanno corrette manualmente.

## Admin

Login:

- UI: `/admina`
- API: `POST /api/admin/login`
- PIN/password confrontato lato server con hash scrypt in `admin_settings` se presente; altrimenti usa `ADMIN_PASSWORD`, fallback codice `1909`.
- Cambio PIN: dal pannello `/admina`, icona chiave accanto alla home; endpoint protetto `PUT /api/admin/password`.
- Rate limit login: massimo 10 tentativi ogni 15 minuti per IP, reset dopo login corretto.
- Il login imposta un cookie HttpOnly firmato lato server (`ccvcolli_admin`) con durata 12 ore.
- Gli endpoint `/api/admin/*` successivi sono protetti da middleware server-side che verifica il cookie.

Il PIN di conferma cancellazione non e piu hardcoded lato client: `PinConfirmModal` verifica il PIN tramite endpoint Express protetto. La cancellazione dei singoli piatti mantiene la conferma UI ma non richiede PIN.

Funzioni admin:

- gestione sezioni dinamiche;
- gestione categorie/piatti;
- gestione vini e categorie vino;
- gestione allergeni;
- reorder tramite frecce su liste;
- conferma cancellazioni con PIN server-side, esclusi i singoli piatti.

Prezzi:

- input UI usa virgola italiana;
- `sanitizePrice()` limita a una cifra decimale;
- `parsePrice()` converte virgola in punto prima del salvataggio;
- DB salva numeri.

## Asset e UI

- Logo principale: `assets/images/logo.png`
- Logo Ca' Shin usato in intro, home e header menu: `assets/images/logo-cashin2.webp`
- Logo Camera Con Vista/Colli usato come collaborazione in home: `assets/images/logo.png`
- Icona senza glutine usata nei piatti: `assets/images/icons8-senza-glutine-100.png`
- Favicon PNG e icone installabili: `assets/images/favicon.png`, `assets/images/icon.png`, `assets/images/apple-touch-icon.png`
- Favicon WebP e service worker: `public/favicon.webp`, `public/sw.js`
- Non duplicare PNG in `public/`: il server espone `/favicon.png`, `/icon.png` e `/apple-touch-icon.png` leggendo da `assets/images/`.
- Palette in `constants/colors.ts`; l'arancione ufficiale operativo e `#c85f18`, allineato al logo.
- Stili estratti per ridurre i file route: `components/home/homeStyles.ts` e `components/menu/menuSectionStyles.ts`.

La home contiene stato `menuOpen`, ma dal codice visibile non risulta un pulsante header che lo apra. La navigazione admin resta accessibile dal menu in pagina sezione e direttamente via URL `/admina`.

## Rischi tecnici prioritari

1. Auth admin da rafforzare ulteriormente con audit log persistente e gestione sessioni/revoca piu completa.
2. Segreti storici in `.env.render`: rimuovere dallo storico/ruotare se necessario.
3. Connector Supabase riallineato al DB operativo `ccvcolli`; verificare sempre il project ref prima di operazioni DB.
4. Audit log admin non persistente.
5. Health endpoint deve restare minimale e non esporre env o dettagli di errore.
6. Dipendenze e audit npm da monitorare: al 2026-05-31 `npm audit --omit=dev` e pulito grazie a `overrides` mirati per `postcss` e `uuid`; rivalutare gli override al prossimo upgrade Expo.
