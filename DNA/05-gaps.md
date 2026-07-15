# Gap e Punti da Completare

## Gap bloccanti o ad alta priorita

1. **Recupero `ccvcolli.onrender.com`**
   - Stato: ticket Render Support aperto ed escalato.
   - Mancante: risposta umana Render.
   - Impatto: QR code fisici non salvabili senza riassegnazione del vecchio subdomain.

2. **Hardening autenticazione admin**
   - Stato: login UI/API presente e CRUD admin protetti da cookie HttpOnly firmato lato server.
   - Stato: login UI/API presente, CRUD admin protetti da cookie HttpOnly firmato lato server e rate limiting in memoria sul login.
   - Mancante: audit log persistente delle mutazioni admin, logout UI e gestione/revoca sessioni piu evoluta.
   - Impatto: rischio residuo ridotto, ma non ancora livello enterprise completo.

3. **Segreti esposti in repository/workspace**
   - `.env.render` e stato rimosso dal tracking nella working tree e resta locale/ignorato.
   - Lo storico Git puo comunque contenere segreti precedenti.
   - Mancante: verifica dello storico e rotazione credenziali eventualmente esposte.

## Gap tecnici

1. **Dipendenze e audit**
   - `npm audit fix` non forzato e stato eseguito.
   - Stato residuo: vulnerabilita moderate transitive nel toolchain Expo/Metro.
   - Mancante: upgrade major Expo pianificato e testato; non usare `npm audit fix --force` come scorciatoia.

2. **Home menu/admin access**
   - La home ha stato/dropdown `menuOpen`, ma dal codice non risulta un controllo visibile che lo apra.
   - Mancante: verifica UI reale e decisione se ripristinare accesso admin/lingua da home.

## Gap operativi esterni

1. **Backup**
   - Backup locali compressi: usare `BACKUP/` nella root, ignorata da Git.
   - Mancante: posizione backup esterni reali, frequenza attesa e procedura restore.

2. **Pannelli esterni**
   - Supabase project URL noto.
   - Render API ha confermato il servizio `ccvcolli` su `ccvcolli-ghxg.onrender.com`.
   - Connector Supabase riallineato al progetto operativo `ccvcolli`.
   - Nessuna integrazione Google Sheet / Apps Script rilevata nel repo.
   - Mancante: eventuali dashboard aggiuntive, domini custom, servizi QR dinamici o strumenti operativi esterni non tracciati nel repo.

## Regole non negoziabili

- Non cancellare il servizio Render `ccvcolli-ghxg` finche il supporto non ha completato il recupero o dato istruzioni.
- Non ruotare/cambiare Supabase keys senza aggiornare Render env.
- Non pubblicare segreti in `DNA/`, issue, chat, commit o screenshot.
