# Render Recovery - ccvcolli.onrender.com

## Situazione

Il vecchio account/workspace/servizio Render e stato eliminato accidentalmente. Il servizio usava:

```text
https://ccvcolli.onrender.com
```

Questo URL e gia stampato su QR code fisici del ristorante. Se non torna online esattamente questo URL, i QR statici stampati non possono essere rediretti lato progetto.

## Stato attuale

Nuovo Web Service Render creato:

```text
https://ccvcolli-ghxg.onrender.com
```

Repo collegato:

```text
ca-shin/ccv-colli
```

Nome servizio scelto:

```text
ccvcolli
```

Render ha aggiunto suffisso casuale `-ghxg`; quindi `ccvcolli.onrender.com` non e disponibile automaticamente per il nuovo servizio.

Il vecchio URL:

```text
https://ccvcolli.onrender.com
```

restituisce:

```text
Not Found
```

Questo indica che Render riceve la richiesta ma non la instrada a un servizio attivo. Non garantisce che il subdomain sia riutilizzabile da dashboard.

## Cosa e stato fatto

1. Creato nuovo Web Service Render dal repo `ca-shin/ccv-colli`.
2. Impostato nome servizio `ccvcolli`.
3. Render ha assegnato `https://ccvcolli-ghxg.onrender.com`.
4. Aggiunte env Render, inclusa correzione da `SUPABASE_SERVICE_ROLE_KEY` a `SUPABASE_SERVICE_KEY`.
5. Aggiunta `EXPO_PUBLIC_DOMAIN=ccvcolli-ghxg.onrender.com`.
6. Build Command attuale verificato via API Render:

```text
npm install && npx expo export --platform web && npm run server:build
```

7. `autoDeploy` risulta attivo su branch `main`.
8. Confermato dai log che il deploy nuovo e live e serve `dist/`.
9. Aperto ticket/chat Render Support.
10. AI agent Render ha escalato a umano; risposta non immediata, notifiche via chat e email.

## Richiesta inviata a Render

Richiesto a Render di recuperare il subdomain storico e assegnarlo al nuovo servizio.

Punto chiave: non chiedere solo di "liberare" pubblicamente il subdomain. Chiedere di riassegnarlo direttamente al servizio nuovo:

```text
ccvcolli.onrender.com -> ccvcolli-ghxg
```

Motivo: se viene solo liberato, non c'e garanzia che si agganci automaticamente al servizio giusto.

Email indicata al supporto per risposte/istruzioni:

```text
dero975@gmail.com
```

## Prossimi passi

1. Attendere risposta umana Render in chat o via email.
2. Non cancellare `ccvcolli-ghxg`.
3. Non creare servizi alternativi con nomi simili finche il supporto non risponde.
4. Se Render riassegna `ccvcolli.onrender.com` direttamente al servizio nuovo:
   - aggiornare `EXPO_PUBLIC_DOMAIN=ccvcolli.onrender.com`;
   - fare `Manual Deploy -> Clear build cache & deploy`;
   - verificare `/`, `/api/health`, `/admina`.
5. Se Render puo solo liberarlo:
   - chiedere istruzioni precise per evitare che il subdomain venga assegnato a un altro servizio/account;
   - non procedere alla cieca.
6. Se Render rifiuta il recupero:
   - i QR statici stampati non sono recuperabili via codice;
   - serve ristampa o soluzione fisica/operativa alternativa.

## Verita operativa sui QR

Se i QR code sono statici e contengono direttamente:

```text
https://ccvcolli.onrender.com
```

solo il controllo di quel subdomain consente di salvarli. Non esiste un redirect possibile dal nuovo dominio verso il vecchio, perche il traffico parte dal vecchio.

Per il futuro, stampare QR verso un dominio controllato direttamente dal ristorante, ad esempio `menu.<dominio-ristorante>`, e puntarlo via DNS verso Render.
