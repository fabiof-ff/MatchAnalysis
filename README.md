# Match Analysis - Webapp per Analisi Video Calcio ⚽

Applicazione web per match analyst che permette di analizzare video di partite di calcio.

## Funzionalità

✅ **Pannello Tags Personalizzati**
- Creazione di tag personalizzati con nome e colore
- Tag predefiniti (Goal, Assist, Fallo, Corner, Tiro, Parata, Cartellino)
- Eliminazione tag

✅ **Tagging Azioni**
- Selezione tag dal pannello
- Marcatura inizio/fine azione durante la riproduzione video
- Creazione automatica dell'azione quando inizio e fine sono marcati

✅ **Albero Azioni**
- Visualizzazione di tutte le azioni taggate
- Modifica posizione (inizio) e durata (fine) di ogni azione
- Selezione multipla tramite checkbox
- Riproduzione diretta dell'azione dal video
- Eliminazione singola o multipla

✅ **Video di Sintesi**
- Selezione delle azioni da includere
- Preview delle azioni selezionate ordinate cronologicamente
- Preparazione per esportazione (richiede implementazione backend)

✅ **Merge Video**
- Interfaccia per selezionare più file video
- Preparazione per unione video (richiede implementazione backend con FFmpeg)

## Come Usare

1. **Aprire l'applicazione**: Aprire il file `index.html` in un browser moderno
2. **Caricare un video**: 
   - Cliccare su "Scegli file" e selezionare un video MP4
   - Cliccare su "Carica Video"
3. **Creare/Selezionare Tags**: 
   - Usare i tag predefiniti o crearne di nuovi
   - Cliccare su un tag per selezionarlo
4. **Taggare le Azioni**:
   - Riprodurre il video
   - Quando inizia un'azione interessante, cliccare "Segna Inizio"
   - Quando finisce l'azione, cliccare "Segna Fine"
   - L'azione verrà automaticamente creata e aggiunta all'elenco
5. **Gestire le Azioni**:
   - Modificare i tempi di inizio/fine direttamente nell'elenco
   - Cliccare il pulsante play (▶) per rivedere l'azione
   - Selezionare più azioni con le checkbox
6. **Creare Video di Sintesi**:
   - Selezionare le azioni desiderate
   - Cliccare "Crea Video Sintesi"
   - Vedere l'anteprima delle azioni selezionate

## Tecnologie

- **HTML5**: Struttura dell'applicazione
- **CSS3**: Stile moderno e responsive con gradients e animazioni
- **JavaScript Vanilla**: Logica dell'applicazione senza dipendenze
- **LocalStorage**: Salvataggio automatico di tags e azioni

## Note Tecniche

### Limitazioni Browser
- Le funzionalità di creazione video di sintesi e merge video richiedono elaborazione server-side
- Per implementazioni complete, è necessario:
  - Backend con FFmpeg per l'elaborazione video
  - API per il caricamento e download dei video

### Salvataggio Dati
- I tag e le azioni sono salvati automaticamente nel LocalStorage del browser
- I dati persistono tra le sessioni
- Cancellare i dati del browser eliminerà anche le azioni salvate

## Browser Supportati

- Chrome/Edge (raccomandato)
- Firefox
- Safari
- Opera

## Possibili Miglioramenti Futuri

- [ ] Backend per elaborazione video (Node.js + FFmpeg)
- [ ] Esportazione/Importazione dati in JSON
- [ ] Annotazioni testuali sulle azioni
- [ ] Filtri e ricerca nelle azioni
- [ ] Timeline visuale delle azioni
- [ ] Esportazione report in PDF
- [ ] Supporto per più video contemporaneamente
- [ ] Hotkeys per tagging rapido
- [ ] Integrazione cloud storage

## Autore

Webapp creata per analisi match calcistici.

---

Per qualsiasi domanda o problema, verificare che il browser supporti HTML5 video e LocalStorage.
