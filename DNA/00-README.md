# DNA - Contesto Operativo Canonico

Questo dossier e il riferimento operativo per agent e sviluppatori sul progetto `ccvcolli`.

Regole:

- Il codice reale e la fonte primaria. Se una nota storica diverge dal codice, vale il codice.
- Non salvare mai segreti, token, password o chiavi in chiaro.
- Aggiornare questi file quando cambiano deploy, repository, ambienti, servizi esterni o procedure critiche.

## File

- [01-project.md](./01-project.md): architettura, codice, flussi applicativi, API e rischi tecnici.
- [02-operations.md](./02-operations.md): repository, script, ambienti, deploy, Render, Supabase, automatismi e validazioni.
- [03-supabase-database.md](./03-supabase-database.md): schema reale Supabase, relazioni, indici, RLS e gap database.
- [04-render-recovery.md](./04-render-recovery.md): stato del recupero urgente di `ccvcolli.onrender.com`.
- [05-gaps.md](./05-gaps.md): gap noti e dati mancanti da completare.
