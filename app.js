// Match Analysis App - JavaScript

// State Management
const state = {
    currentVideo: null,
    videoFiles: [],
    tags: [],
    analysisActions: [], // Azioni specifiche per la Tab Analisi Video
    liveActions: [],     // Azioni specifiche per la Tab Live Tagging
    selectedTag: null,
    markedStart: null,
    markedEnd: null,
    selectedActions: new Set(), // Selezione per Analisi Video
    filterTags: new Set(), // Filtro multiplo per tag
    filterSelected: false, // Filtro azioni selezionate
    filterFlag: null, // Filtro per flag (positive/negative/null)
    customOrder: [], // Ordinamento personalizzato delle azioni di Analisi Video
    activeAction: null, // Azione attualmente controllata dallo slider
    collapsedGroups: new Set(), // Tag ID dei gruppi collassati nel pannello azioni
    actionsViewMode: 'grouped', // 'grouped' o 'free'
    teamNames: { A: 'SQUADRA A', B: 'SQUADRA B' }, // Nomi squadre modificabili
    score: { A: 0, B: 0 }, // Punteggio live (usato solo in Live Tagging)
    
    // Live Tagging State
    liveTimer: {
        startTime: 0,
        running: false,
        elapsed: 0,
        interval: null
    }
};

// Rendiamo lo stato accessibile ad altri script (es. export.js)
window.state = state;

// Sequence Playback Logic (Main Player)
let previewState = {
    isPlaying: false,
    currentIndex: 0,
    selectedActions: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Prima carica le azioni dal localStorage
    loadActionsFromLocalStorage();
    // Poi inizializza sempre i tag di default
    initializeDefaultTags();
    setupTabs();
    setupEventListeners();
    renderTags();
    renderActions();
    updateFlagFilterBtn();
    updateSelectedFilterBtn();
    setupDraggableContainers();
    // IMPORTANTE: setupActionsListeners DOPO il rendering
    setupActionsListeners();
    console.log('App inizializzata - Tags:', state.tags.length);
});

// Default Tags
function initializeDefaultTags() {
    const baseTags = [
        { id: 'costr_fondo', name: 'Costr. fondo', color: '#27ae60', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 0, phase: 'offensiva' },
        { id: 'costr_din_basso', name: 'Costr.din.basso', color: '#27ae60', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 1, phase: 'offensiva' },
        { id: 'costr_centr', name: 'Costr.Centr.', color: '#27ae60', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 2, phase: 'offensiva' },
        { id: 'costr_din_att', name: 'Costr.din.att.', color: '#27ae60', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 3, phase: 'offensiva' },
        { id: 'tran_offen', name: 'Tran.Offen.', color: '#27ae60', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 4, phase: 'offensiva' },
        { id: 'press_rimessa', name: 'Press. Rimessa', color: '#3498db', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 5, phase: 'difensiva' },
        { id: 'prima_press_alta', name: 'Prima press.alta', color: '#3498db', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 6, phase: 'difensiva' },
        { id: 'press_din_centr', name: 'Press.din.centr.', color: '#3498db', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 7, phase: 'difensiva' },
        { id: 'dif_bassa', name: 'Dif.bassa', color: '#3498db', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 8, phase: 'difensiva' },
        { id: 'tran_dif', name: 'Tran.Dif.', color: '#3498db', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 9, phase: 'difensiva' }
    ];

    const matchEvents = [
        'Gol', 'OccGol', 'Az Prom', 'Rigore', 'TiroPiedeArea', 'TiroTestaArea', 
        'TiroDaFuori', 'Cross', 'Corner', 'PunLat', 'PunCentr', 'Pass. Chiave', 'Fuorigioco'
    ];

    const matchEventTags = [];
    matchEvents.forEach((name, idx) => {
        // Squadra A
        matchEventTags.push({
            id: `ma_${name.toLowerCase().replace(/[^a-z]/g, '')}`,
            name: name,
            color: '#3498db',
            offsetBefore: 5,
            offsetAfter: 5,
            isDefault: true,
            category: 'match_events',
            team: 'A',
            order: 100 + idx
        });
        // Squadra B
        matchEventTags.push({
            id: `mb_${name.toLowerCase().replace(/[^a-z]/g, '')}`,
            name: name,
            color: '#f39c12',
            offsetBefore: 5,
            offsetAfter: 5,
            isDefault: true,
            category: 'match_events',
            team: 'B',
            order: 200 + idx
        });
    });

    const defaultTags = [...baseTags, ...matchEventTags];
    
    console.log('initializeDefaultTags - state.tags.length PRIMA:', state.tags.length);
    
    // Prova a caricare i tag salvati
    const saved = localStorage.getItem('matchAnalysisTags');
    if (saved) {
        try {
            const loadedTags = JSON.parse(saved);
            if (loadedTags && Array.isArray(loadedTags) && loadedTags.length > 0) {
                state.tags = loadedTags;
                console.log('Tag caricati da localStorage:', state.tags.length, state.tags);
                
                // Assicurati che i nuovi tag di sistema esistano e aggiorna l'ordine di quelli esistenti
                defaultTags.forEach(dt => {
                    const existing = state.tags.find(t => t.id === dt.id);
                    if (!existing) {
                        state.tags.push(dt);
                    } else if (dt.isDefault) {
                        // Aggiorna ordine, fase e colore per riflettere le modifiche nel codice
                        existing.order = dt.order;
                        if (dt.phase) existing.phase = dt.phase;
                        existing.color = dt.color;
                    }
                });

                // Forza i colori per fase anche per i tag custom
                state.tags.forEach(t => {
                    if (t.phase === 'offensiva') t.color = '#27ae60';
                    if (t.phase === 'difensiva') t.color = '#3498db';
                });
            } else {
                console.log('localStorage vuoto o non valido, uso i default');
                state.tags = [...defaultTags];
            }
        } catch (e) {
            console.error('Errore parsing localStorage, uso i default:', e);
            state.tags = [...defaultTags];
        }
    } else {
        console.log('Nessun localStorage trovato, uso i default');
        state.tags = [...defaultTags];
    }
    
    // Ordina per order
    state.tags.sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999;
        const orderB = b.order !== undefined ? b.order : 999;
        return orderA - orderB;
    });
    
    console.log('initializeDefaultTags - state.tags.length DOPO:', state.tags.length, state.tags);
    
    // Salva sempre
    saveTagsToLocalStorage();
}

// Event Listeners Setup
function setupEventListeners() {
    // Video Loading
    const loadVideoBtn = document.getElementById('loadVideoBtn');
    if (loadVideoBtn) loadVideoBtn.addEventListener('click', loadVideoWithPicker);
    
    // Video Player Events
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        videoPlayer.addEventListener('timeupdate', updateVideoTime);
        videoPlayer.addEventListener('loadedmetadata', () => {
            updateDuration();
        });
    }
    
    // Tag Management
    const addTagBtn = document.getElementById('addTagBtn');
    const newTagName = document.getElementById('newTagName');
    if (addTagBtn) addTagBtn.addEventListener('click', addNewTag);
    if (newTagName) {
        newTagName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addNewTag();
        });
    }

    // Preview sequence from main tab
    const startPreviewFromMainBtn = document.getElementById('startPreviewFromMainBtn');
    if (startPreviewFromMainBtn) {
        startPreviewFromMainBtn.addEventListener('click', () => {
            startPreviewSequence();
        });
    }

    const stopPreviewMainBtn = document.getElementById('stopPreviewMainBtn');
    if (stopPreviewMainBtn) {
        stopPreviewMainBtn.addEventListener('click', () => {
            stopPreview();
        });
    }

    // Live Tagging Listeners
    const liveStartBtn = document.getElementById('liveStartBtn');
    const livePauseBtn = document.getElementById('livePauseBtn');
    const liveResetBtn = document.getElementById('liveResetBtn');
    const liveSet45Btn = document.getElementById('liveSet45Btn');

    if (liveStartBtn) liveStartBtn.addEventListener('click', startLiveTimer);
    if (livePauseBtn) livePauseBtn.addEventListener('click', pauseLiveTimer);
    if (liveResetBtn) liveResetBtn.addEventListener('click', resetLiveTimer);
    if (liveSet45Btn) liveSet45Btn.addEventListener('click', () => setLiveTimerSeconds(45 * 60));

    // Supporto per il "lungo tocco" sui pulsanti GOL (per ridurli)
    setupLiveGolLongPress();
    
    // Merge Videos
    const selectMergeVideosBtn = document.getElementById('selectMergeVideosBtn');
    const mergeVideosInput = document.getElementById('mergeVideosInput');
    const exportMergeBtn = document.getElementById('exportMergeBtn');
    
    if (selectMergeVideosBtn) {
        selectMergeVideosBtn.addEventListener('click', () => {
            if (mergeVideosInput) mergeVideosInput.click();
        });
    }
    if (mergeVideosInput) {
        mergeVideosInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectMergeVideos(e.target.files);
            }
        });
    }
    if (exportMergeBtn) exportMergeBtn.addEventListener('click', exportMergeScript);
    
    // Main Action Sliders
    const startTimeSlider = document.getElementById('startTimeSlider');
    const endTimeSlider = document.getElementById('endTimeSlider');
    
    if (startTimeSlider && endTimeSlider) {
        startTimeSlider.addEventListener('input', (e) => {
            const startVal = parseFloat(startTimeSlider.value);
            const endVal = parseFloat(endTimeSlider.value);
            
            if (startVal > endVal) {
                startTimeSlider.value = endVal;
            }
            
            const finalVal = parseFloat(startTimeSlider.value);
            const videoPlayer = document.getElementById('videoPlayer');
            if (videoPlayer && videoPlayer.src) {
                videoPlayer.currentTime = finalVal;
            }
            updateSliderDisplay('start', finalVal);
            updateSliderTrack();
        });
        
        startTimeSlider.addEventListener('change', (e) => {
            if (state.activeAction) {
                updateActionTime(state.activeAction.id, 'start', parseFloat(startTimeSlider.value));
            }
        });
        
        endTimeSlider.addEventListener('input', (e) => {
            const startVal = parseFloat(startTimeSlider.value);
            const endVal = parseFloat(endTimeSlider.value);
            
            if (endVal < startVal) {
                endTimeSlider.value = startVal;
            }
            
            const finalVal = parseFloat(endTimeSlider.value);
            const videoPlayer = document.getElementById('videoPlayer');
            if (videoPlayer && videoPlayer.src) {
                videoPlayer.currentTime = finalVal;
            }
            updateSliderDisplay('end', finalVal);
            updateSliderTrack();
        });
        
        endTimeSlider.addEventListener('change', (e) => {
            if (state.activeAction) {
                updateActionTime(state.activeAction.id, 'end', parseFloat(endTimeSlider.value));
            }
        });

        // Step buttons logic
        const handleStep = (type, delta) => {
            if (!state.activeAction) return;
            const action = state.activeAction;
            const currentValue = type === 'start' ? action.startTime : action.endTime;
            
            const videoPlayer = document.getElementById('videoPlayer');
            const maxDuration = videoPlayer && videoPlayer.duration ? videoPlayer.duration : 3600;
            
            let newValue = currentValue + delta;
            
            // Clamp value
            if (newValue < 0) newValue = 0;
            if (newValue > maxDuration) newValue = maxDuration;
            
            updateActionTime(action.id, type, newValue);
            
            // Aggiorna il video player alla nuova posizione
            if (videoPlayer && videoPlayer.src) {
                videoPlayer.currentTime = type === 'start' ? state.activeAction.startTime : state.activeAction.endTime;
            }
        };

        document.getElementById('startTimeMinus').addEventListener('click', () => handleStep('start', -0.5));
        document.getElementById('startTimePlus').addEventListener('click', () => handleStep('start', 0.5));
        document.getElementById('endTimeMinus').addEventListener('click', () => handleStep('end', -0.5));
        document.getElementById('endTimePlus').addEventListener('click', () => handleStep('end', 0.5));
    }
    
    // Compress Video
    const selectCompressVideoBtn = document.getElementById('selectCompressVideoBtn');
    const compressVideoInput = document.getElementById('compressVideoInput');
    const compressionQuality = document.getElementById('compressionQuality');
    const compressionResolution = document.getElementById('compressionResolution');
    const exportCompressBtn = document.getElementById('exportCompressBtn');
    
    if (selectCompressVideoBtn) {
        selectCompressVideoBtn.addEventListener('click', () => {
            if (compressVideoInput) compressVideoInput.click();
        });
    }
    if (compressVideoInput) {
        compressVideoInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectCompressVideo(e.target.files[0]);
            }
        });
    }
    if (compressionQuality) {
        compressionQuality.addEventListener('change', () => {
            if (compressState.videoToCompress) renderCompressVideoInfo();
        });
    }
    if (compressionResolution) {
        compressionResolution.addEventListener('change', () => {
            if (compressState.videoToCompress) renderCompressVideoInfo();
        });
    }
    if (exportCompressBtn) exportCompressBtn.addEventListener('click', exportCompressScript);
    
    // Modal Controls
    setupModalControls();
}

function setupActionsListeners() {
    console.log('setupActionsListeners chiamata');
    // Actions Management - chiamata dopo che il template è stato inserito
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const toggleFilterBtn = document.getElementById('toggleFilterBtn');
    const collapseAllBtn = document.getElementById('collapseAllBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const exportFFmpegBtn = document.getElementById('exportFFmpegBtn');
    const exportActionsJSONBtn = document.getElementById('exportActionsJSONBtn');
    const exportActionsTXTBtn = document.getElementById('exportActionsTXTBtn');
    const importActionsJSONInput = document.getElementById('importActionsJSONInput');
    const addImageActionBtn = document.getElementById('addImageActionBtn');
    const addImageActionInput = document.getElementById('addImageActionInput');
    const exportTagsJSONBtn = document.getElementById('exportTagsJSONBtn');
    const importTagsJSONInput = document.getElementById('importTagsJSONInput');
    
    console.log('Elementi trovati:', {
        selectAllBtn: !!selectAllBtn,
        deselectAllBtn: !!deselectAllBtn,
        toggleFilterBtn: !!toggleFilterBtn,
        collapseAllBtn: !!collapseAllBtn,
        deleteSelectedBtn: !!deleteSelectedBtn,
        exportFFmpegBtn: !!exportFFmpegBtn,
        exportActionsJSONBtn: !!exportActionsJSONBtn,
        exportActionsTXTBtn: !!exportActionsTXTBtn,
        importActionsJSONInput: !!importActionsJSONInput,
        addImageActionBtn: !!addImageActionBtn,
        exportTagsJSONBtn: !!exportTagsJSONBtn,
        importTagsJSONInput: !!importTagsJSONInput
    });
    
    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllActions);
    if (deselectAllBtn) deselectAllBtn.addEventListener('click', deselectAllActions);
    if (toggleFilterBtn) toggleFilterBtn.addEventListener('click', toggleFilterPanel);
    if (collapseAllBtn) collapseAllBtn.addEventListener('click', toggleCollapseAll);
    if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', deleteSelectedActions);
    if (exportFFmpegBtn) exportFFmpegBtn.addEventListener('click', exportActionsToFFmpeg);
    if (exportActionsTXTBtn) exportActionsTXTBtn.addEventListener('click', exportActionsToTXT);
    if (exportActionsJSONBtn) exportActionsJSONBtn.addEventListener('click', () => exportActionsToJSON('analysis'));

    if (importActionsJSONInput) {
        importActionsJSONInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importActionsFromJSON(e.target.files[0]);
            }
        });
    }
    
    if (addImageActionBtn) {
        addImageActionBtn.addEventListener('click', () => {
            addImageActionInput.click();
        });
    }
    
    if (addImageActionInput) {
        addImageActionInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                addImageAction(e.target.files[0]);
            }
        });
    }
    
    if (exportTagsJSONBtn) exportTagsJSONBtn.addEventListener('click', exportTagsToJSON);
    if (importTagsJSONInput) {
        importTagsJSONInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importTagsFromJSON(e.target.files[0]);
            }
        });
    }
    
    // Popola il filtro per tag
    populateTagFilter();
    
    console.log('setupActionsListeners completata');
}

// Tabs Management
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    console.log('Setup tabs - Pulsanti trovati:', tabButtons.length);
    
    tabButtons.forEach(button => {
        console.log('Aggiunto listener a:', button.getAttribute('data-tab'));
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = button.getAttribute('data-tab');
            console.log('Click su tab:', tabId);
            switchToTab(tabId);
        });
    });
}

function switchToTab(tabId) {
    console.log('Switching to tab:', tabId);
    
    // Rimuovi active da tutti i pulsanti
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Rimuovi active da tutti i contenuti
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Aggiungi active al pulsante e contenuto selezionato
    const selectedButton = document.querySelector(`[data-tab="${tabId}"]`);
    const selectedContent = document.getElementById(`${tabId}-tab`);
    
    console.log('Pulsante selezionato:', selectedButton);
    console.log('Contenuto selezionato:', selectedContent);
    
    if (selectedButton) {
        selectedButton.classList.add('active');
        console.log('Attivato pulsante');
    }
    if (selectedContent) {
        selectedContent.classList.add('active');
        console.log('Attivato contenuto');
        
        // Se passiamo alla tab live, renderizziamo i tag e le azioni recenti
        if (tabId === 'live') {
            renderLiveTags();
            renderLiveActions();
        }
    }
}


// Video Loading
async function loadVideoWithPicker() {
    try {
        // Verifica se il browser supporta la File System Access API
        if ('showOpenFilePicker' in window) {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Video Files',
                    accept: {
                        'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm']
                    }
                }],
                multiple: false
            });
            
            // Ottieni il file dal handle
            const file = await fileHandle.getFile();
            
            const videoPlayer = document.getElementById('videoPlayer');
            const url = URL.createObjectURL(file);
            
            videoPlayer.src = url;
            state.currentVideo = {
                name: file.name,
                url: url,
                file: file,
                fileHandle: fileHandle
            };
            
            videoPlayer.load();
            console.log('Video caricato:', file.name);
            showNotification('✅ Video caricato!', 'success');
            
        } else {
            // Fallback: usa il metodo tradizionale con alert
            alert('Il tuo browser non supporta la selezione file avanzata.\nUsa Chrome o Edge per una migliore esperienza.');
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('Selezione video annullata');
        } else {
            console.error('Errore caricamento video:', err);
            alert('Errore nel caricamento del video.');
        }
    }
}

// Time Formatting
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateVideoTime() {
    const videoPlayer = document.getElementById('videoPlayer');
    document.getElementById('currentTime').textContent = formatTime(videoPlayer.currentTime);

    // Sequence playback logic
    if (previewState && previewState.isPlaying) {
        const currentAction = previewState.selectedActions[previewState.currentIndex];
        if (currentAction && videoPlayer.currentTime >= currentAction.endTime) {
            playNextInPreview();
        }
    }
}

function updateDuration() {
    const videoPlayer = document.getElementById('videoPlayer');
    document.getElementById('duration').textContent = formatTime(videoPlayer.duration);
}

// Tag Management
function addNewTag() {
    const nameInput = document.getElementById('newTagName');
    const phaseInput = document.getElementById('tagPhaseInput');
    
    const name = nameInput.value.trim();
    if (!name) {
        alert('Inserisci un nome per il tag');
        return;
    }
    
    const phase = phaseInput.value;
    const color = phase === 'offensiva' ? '#27ae60' : '#3498db';

    const newTag = {
        id: 'tag_' + Date.now(),
        name: name,
        color: color,
        phase: phase,
        offsetBefore: 5,
        offsetAfter: 5,
        isDefault: false,
        order: state.tags.length
    };
    
    state.tags.push(newTag);
    nameInput.value = '';
    
    renderTags();
    saveTagsToLocalStorage();
    populateTagFilter(); // Aggiorna il filtro
}

function renderTags() {
    const tagListOffensive = document.getElementById('tagListOffensive');
    const tagListDefensive = document.getElementById('tagListDefensive');
    const tagListA = document.getElementById('tagListA');
    const tagListB = document.getElementById('tagListB');
    const teamNameAInput = document.getElementById('teamNameA');
    const teamNameBInput = document.getElementById('teamNameB');
    const teamColorPickerA = document.getElementById('teamColorPickerA');
    const teamColorPickerB = document.getElementById('teamColorPickerB');
    
    // Aggiorna i nomi e colori delle squadre nell'UI se gli input esistono
    if (teamNameAInput && state.teamNames) teamNameAInput.value = state.teamNames.A || 'SQUADRA A';
    if (teamNameBInput && state.teamNames) teamNameBInput.value = state.teamNames.B || 'SQUADRA B';
    
    // Sincronizza i color picker con il primo tag di ogni squadra
    const firstTagA = state.tags.find(t => t.team === 'A');
    if (firstTagA && teamColorPickerA) teamColorPickerA.value = firstTagA.color;
    const firstTagB = state.tags.find(t => t.team === 'B');
    if (firstTagB && teamColorPickerB) teamColorPickerB.value = firstTagB.color;
    
    console.log('===== renderTags CHIAMATA =====');
    
    if (!tagListOffensive || !tagListDefensive) {
        console.error('ERRORE: Elementi tagList non trovati nel DOM!');
        return;
    }
    
    // Pulisci tutti i contenitori
    tagListOffensive.innerHTML = '';
    tagListDefensive.innerHTML = '';
    if (tagListA) tagListA.innerHTML = '';
    if (tagListB) tagListB.innerHTML = '';
    
    if (state.tags.length === 0) {
        return;
    }
    
    state.tags.forEach((tag, index) => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        tagItem.draggable = true;
        tagItem.dataset.tagId = tag.id;
        
        if (state.selectedTag && state.selectedTag.id === tag.id) {
            tagItem.classList.add('selected');
        }
        tagItem.style.backgroundColor = tag.color;
        
        const deleteBtn = `<button class="delete-tag" onclick="deleteTag('${tag.id}')">×</button>`;
        
        tagItem.innerHTML = `
            <div class="tag-header">
                <span class="tag-name">${tag.name}</span>
                <button class="settings-tag" onclick="toggleTagSettings('${tag.id}', event)">⚙</button>
                ${deleteBtn}
            </div>
            <div class="tag-offset" style="display: none;">
                <label>-<input type="number" class="offset-input" value="${tag.offsetBefore}" min="0" max="30" data-tag-id="${tag.id}" data-type="before"> sec</label>
                <label>+<input type="number" class="offset-input" value="${tag.offsetAfter}" min="0" max="30" data-tag-id="${tag.id}" data-type="after"> sec</label>
            </div>
        `;
        
        // Click per creare azione
        tagItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-tag') && 
                !e.target.classList.contains('settings-tag') && 
                !e.target.classList.contains('offset-input')) {
                createActionFromTag(tag);
            }
        });
        
        // Drag and drop (solo per tag principali)
        if (!tag.category || tag.category !== 'match_events') {
            tagItem.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                tagItem.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', tag.id);
            });
            
            tagItem.addEventListener('dragend', (e) => {
                tagItem.classList.remove('dragging');
            });
            
            tagItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const draggingItem = document.querySelector('.dragging');
                if (draggingItem && draggingItem !== tagItem) {
                    const rect = tagItem.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    const parent = tagItem.parentNode;
                    if (e.clientY < midpoint) {
                        parent.insertBefore(draggingItem, tagItem);
                    } else {
                        parent.insertBefore(draggingItem, tagItem.nextSibling);
                    }
                }
            });
            
            tagItem.addEventListener('drop', (e) => {
                e.preventDefault();
                reorderTags();
            });
        }
        
        // Listener per gli input di offset
        const offsetInputs = tagItem.querySelectorAll('.offset-input');
        offsetInputs.forEach(input => {
            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('change', (e) => {
                updateTagOffset(e.target.dataset.tagId, e.target.dataset.type, parseInt(e.target.value));
            });
        });
        
        // Distribuisci nel contenitore corretto
        if (tag.category === 'match_events') {
            if (tag.team === 'A' && tagListA) {
                tagListA.appendChild(tagItem);
            } else if (tag.team === 'B' && tagListB) {
                tagListB.appendChild(tagItem);
            }
        } else {
            if (tag.phase === 'difensiva') {
                tagListDefensive.appendChild(tagItem);
            } else {
                tagListOffensive.appendChild(tagItem);
            }
        }
    });

    // Supporto per il drop in liste vuote e cambio fase
    // Nota: I listener vengono ora aggiunti qui, ma sarebbe meglio in setupEventListeners
    // per non duplicarli. Tuttavia, dato che ricreiamo il contenuto, li teniamo qui per ora
    // assicurandoci di non avere memory leaks gravi se non chiamiamo renderTags migliaia di volte.
    // AGGIORNAMENTO: Evitiamo duplicati rimuovendo i vecchi se necessario o usando delegazione.
}

function setupDraggableContainers() {
    const listOff = document.getElementById('tagListOffensive');
    const listDef = document.getElementById('tagListDefensive');
    
    if (listOff && listDef) {
        [listOff, listDef].forEach(list => {
            list.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingItem = document.querySelector('.tag-item.dragging');
                if (draggingItem && !list.contains(draggingItem)) {
                    list.appendChild(draggingItem);
                }
            });
            list.addEventListener('drop', (e) => {
                e.preventDefault();
                reorderTags();
            });
        });
    }
}

function reorderTags() {
    const tagListOffensive = document.getElementById('tagListOffensive');
    const tagListDefensive = document.getElementById('tagListDefensive');
    
    const offItems = Array.from(tagListOffensive.querySelectorAll('.tag-item'));
    const defItems = Array.from(tagListDefensive.querySelectorAll('.tag-item'));
    
    const newTags = [];
    
    // Process Offensiva
    offItems.forEach((item, index) => {
        const tag = state.tags.find(t => t.id === item.dataset.tagId);
        if (tag) {
            tag.order = index;
            tag.phase = 'offensiva';
            newTags.push(tag);
        }
    });
    
    // Process Difensiva
    defItems.forEach((item, index) => {
        const tag = state.tags.find(t => t.id === item.dataset.tagId);
        if (tag) {
            tag.order = offItems.length + index;
            tag.phase = 'difensiva';
            newTags.push(tag);
        }
    });
    
    // Aggiungi quelli che non sono tag principali (match_events) mantenendo il loro ordine relativo
    state.tags.forEach(tag => {
        if (tag.category === 'match_events') {
            newTags.push(tag);
        }
    });
    
    state.tags = newTags;
    
    // Reset customOrder quando cambia l'ordine dei tag
    state.customOrder = [];
    
    saveTagsToLocalStorage();
    saveStateToLocalStorage();
    
    // Ricarica le azioni per applicare il nuovo ordine
    renderActions();
    
    console.log('Tag riordinati:', state.tags.filter(t => !t.category).map(t => `${t.name} (${t.phase})`));
    showNotification('✅ Ordine e fasi tag aggiornati!', 'success', 2000);
}

function toggleTagSettings(tagId, event) {
    event.stopPropagation();
    const tagItem = document.querySelector(`[data-tag-id="${tagId}"]`);
    if (tagItem) {
        const offsetDiv = tagItem.querySelector('.tag-offset');
        if (offsetDiv) {
            const isVisible = offsetDiv.style.display !== 'none';
            offsetDiv.style.display = isVisible ? 'none' : 'flex';
        }
    }
}

function updateTagOffset(tagId, type, value) {
    const tag = state.tags.find(t => t.id === tagId);
    if (tag) {
        if (type === 'before') {
            tag.offsetBefore = value;
        } else {
            tag.offsetAfter = value;
        }
        saveTagsToLocalStorage();
    }
}

function createActionFromTag(tag) {
    const videoPlayer = document.getElementById('videoPlayer');
    if (!videoPlayer.src) {
        alert('Carica prima un video');
        return;
    }
    
    const currentTime = videoPlayer.currentTime;
    const startTime = Math.max(0, currentTime - tag.offsetBefore);
    const endTime = Math.min(videoPlayer.duration || currentTime + tag.offsetAfter, currentTime + tag.offsetAfter);
    
    const action = {
        id: 'action_' + Date.now(),
        tag: { ...tag },
        startTime: startTime,
        endTime: endTime,
        duration: endTime - startTime,
        timestamp: new Date().toISOString(),
        comment: ''
    };
    
    state.analysisActions.push(action);
    state.selectedTag = tag;
    
    renderActions();
    renderTags();
    saveStateToLocalStorage();
    
    showNotification(`✅ Azione "${tag.name}" creata: ${formatTime(startTime)} - ${formatTime(endTime)}`, 'success');
    console.log('Azione creata:', action);
}

function deleteTag(tagId) {
    if (confirm('Sei sicuro di voler eliminare questo tag?')) {
        state.tags = state.tags.filter(t => t.id !== tagId);
        if (state.selectedTag && state.selectedTag.id === tagId) {
            state.selectedTag = null;
        }
        renderTags();
        saveTagsToLocalStorage();
    }
}

// Action Marking
function markStart() {
    const videoPlayer = document.getElementById('videoPlayer');
    if (!videoPlayer.src) {
        alert('Carica prima un video');
        return;
    }
    
    state.markedStart = videoPlayer.currentTime;
    updateSelectedRange();
    
    // Se c'è già una fine marcata e un tag selezionato, crea l'azione
    if (state.markedEnd !== null && state.selectedTag) {
        createAction();
    }
}

function markEnd() {
    const videoPlayer = document.getElementById('videoPlayer');
    if (!videoPlayer.src) {
        alert('Carica prima un video');
        return;
    }
    
    state.markedEnd = videoPlayer.currentTime;
    updateSelectedRange();
    
    // Se c'è già un inizio marcato e un tag selezionato, crea l'azione
    if (state.markedStart !== null && state.selectedTag) {
        createAction();
    }
}

function updateSelectedRange() {
    const rangeSpan = document.getElementById('selectedRange');
    
    if (state.markedStart !== null && state.markedEnd !== null) {
        rangeSpan.textContent = `${formatTime(state.markedStart)} - ${formatTime(state.markedEnd)}`;
    } else if (state.markedStart !== null) {
        rangeSpan.textContent = `Inizio: ${formatTime(state.markedStart)}`;
    } else if (state.markedEnd !== null) {
        rangeSpan.textContent = `Fine: ${formatTime(state.markedEnd)}`;
    } else {
        rangeSpan.textContent = '-';
    }
}

function createAction() {
    if (!state.selectedTag) {
        alert('Seleziona un tag prima di creare un\'azione');
        return;
    }
    
    if (state.markedStart === null || state.markedEnd === null) {
        alert('Marca inizio e fine dell\'azione');
        return;
    }
    
    if (state.markedStart >= state.markedEnd) {
        alert('L\'inizio deve essere prima della fine');
        return;
    }
    
    const action = {
        id: 'action_' + Date.now(),
        tag: { ...state.selectedTag },
        startTime: state.markedStart,
        endTime: state.markedEnd,
        duration: state.markedEnd - state.markedStart,
        timestamp: new Date().toISOString(),
        comment: ''
    };
    
    state.analysisActions.push(action);
    
    // Reset markers
    state.markedStart = null;
    state.markedEnd = null;
    updateSelectedRange();
    
    renderActions();
    saveStateToLocalStorage();
    
    console.log('Azione creata:', action);
}

function addImageAction(file) {
    const previewUrl = URL.createObjectURL(file);
    const action = {
        id: 'image_' + Date.now(),
        type: 'image',
        fileName: file.name,
        duration: 3.0, // Durata predefinita 3 secondi
        startTime: 0, 
        endTime: 3.0,
        previewUrl: previewUrl,
        tag: {
            id: 'tag_image_' + Date.now(), // ID Unico per blocco separato
            name: file.name,
            color: '#3498db',
            isImage: true
        },
        timestamp: new Date().toISOString(),
        comment: file.name
    };
    
    state.analysisActions.push(action);
    state.selectedActions.add(action.id);
    
    // Aggiungi all'ordine personalizzato se esiste
    if (state.customOrder) {
        state.customOrder.push(action.id);
    }
    
    renderActions();
    saveStateToLocalStorage();
    
    showNotification(`✅ Immagine "${file.name}" aggiunta. Ricorda di copiarla nella cartella del video per l'export!`, 'success', 5000);
}

// Actions Rendering
function toggleViewMode() {
    state.actionsViewMode = state.actionsViewMode === 'grouped' ? 'free' : 'grouped';
    saveStateToLocalStorage();
    renderActions();
    showNotification(`Visualizzazione ${state.actionsViewMode === 'grouped' ? 'per Gruppi' : 'Libera'} attivata`, 'info', 2000);
}

function renderActions() {
    const actionsList = document.getElementById('actionsList');
    if (!actionsList) return;
    actionsList.innerHTML = '';
    
    // Carica viewMode se presente in localStorage (per persistenza immediata)
    const savedViewMode = localStorage.getItem('matchAnalysisViewMode');
    if (savedViewMode) state.actionsViewMode = savedViewMode;

    // Calcola il totale tempo delle azioni selezionate
    const selectedActionsData = state.analysisActions.filter(a => state.selectedActions.has(a.id));
    
    // Calcolo totali per fase
    // ... rest of the function ...
    let offSec = 0;
    let defSec = 0;
    let totalSec = 0;
    
    selectedActionsData.forEach(a => {
        const duration = parseFloat(a.endTime) - parseFloat(a.startTime);
        if (isNaN(duration)) return;
        
        totalSec += duration;
        
        // Determina la fase dal tag corrente nello stato globale (per riflettere la posizione nel pannello)
        let phase = null;
        if (a.tag && a.tag.id) {
            const currentTag = state.tags.find(t => t.id === a.tag.id);
            if (currentTag) {
                phase = currentTag.phase;
            } else {
                // Fallback se il tag non è trovato nello stato (es. rimosso)
                phase = a.tag.phase;
            }
        }
        
        if (phase === 'offensiva') {
            offSec += duration;
        } else if (phase === 'difensiva') {
            defSec += duration;
        }
    });

    const totalTimeElement = document.getElementById('totalSelectedTime');
    const totalOverallDisplay = document.getElementById('totalOverall');
    const totalOffensiveDisplay = document.getElementById('totalOffensive');
    const totalDefensiveDisplay = document.getElementById('totalDefensive');

    if (totalOverallDisplay) totalOverallDisplay.textContent = `TOT: ${formatTime(totalSec)}`;
    if (totalOffensiveDisplay) totalOffensiveDisplay.textContent = `OFF: ${formatTime(offSec)}`;
    if (totalDefensiveDisplay) totalDefensiveDisplay.textContent = `DIF: ${formatTime(defSec)}`;

    if (totalTimeElement) {
        // Evidenzia se ci sono azioni selezionate
        totalTimeElement.style.backgroundColor = state.selectedActions.size > 0 ? '#d4edda' : '#e8f4f8';
        totalTimeElement.style.borderColor = state.selectedActions.size > 0 ? '#c3e6cb' : '#bde0eb';
    }
    
    // Filtra le azioni se ci sono filtri attivi
    let filteredActions = state.analysisActions;
    
    // Filtro per Tag
    if (state.filterTags && state.filterTags.size > 0) {
        filteredActions = filteredActions.filter(a => state.filterTags.has(a.tag.id));
    }
    
    // Filtro per Selezionate
    if (state.filterSelected) {
        filteredActions = filteredActions.filter(a => state.selectedActions.has(a.id));
    }
    
    // Filtro per Flag (v/x)
    if (state.filterFlag === 'positive') {
        filteredActions = filteredActions.filter(a => a.positive);
    } else if (state.filterFlag === 'negative') {
        filteredActions = filteredActions.filter(a => a.negative);
    }
    
    if (filteredActions.length === 0) {
        const message = (state.filterTags && state.filterTags.size > 0) || state.filterFlag 
            ? 'Nessuna azione trovata con i filtri attivi' 
            : 'Nessuna azione taggata';
        actionsList.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">${message}</p>`;
        return;
    }
    
    // Ordina le azioni in base a customOrder se disponibile, altrimenti per tag order
    let sortedActions;
    if (state.customOrder && state.customOrder.length > 0) {
        // Usa l'ordinamento personalizzato
        const orderMap = new Map(state.customOrder.map((id, index) => [id, index]));
        sortedActions = [...filteredActions].sort((a, b) => {
            const orderA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
            const orderB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
            if (orderA !== orderB) return orderA - orderB;
            return a.startTime - b.startTime;
        });
    } else {
        // Ordinamento predefinito per tag order, poi per tempo
        sortedActions = [...filteredActions].sort((a, b) => {
            const tagOrderA = a.tag.order || 0;
            const tagOrderB = b.tag.order || 0;
            if (tagOrderA !== tagOrderB) return tagOrderA - tagOrderB;
            return a.startTime - b.startTime;
        });
    }
    
    // Cambia modalità di rendering
    if (state.actionsViewMode === 'free') {
        renderActionsFreeMode(sortedActions, actionsList);
    } else {
        renderActionsGroupedByTag(sortedActions, actionsList);
    }
}

function renderActionsFreeMode(sortedActions, actionsList) {
    sortedActions.forEach(action => {
        const actionItem = createActionItem(action);
        actionsList.appendChild(actionItem);
    });
    
    // Setup drag and drop for free mode
    actionsList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingAction = document.querySelector('.action-item.dragging');
        if (!draggingAction) return;
        
        const afterElement = getDragAfterElementAction(actionsList, e.clientY);
        
        if (afterElement == null) {
            actionsList.appendChild(draggingAction);
        } else {
            actionsList.insertBefore(draggingAction, afterElement);
        }
    });

    actionsList.addEventListener('drop', (e) => {
        e.preventDefault();
        saveCompleteActionsOrder();
    });
}

function toggleFilterPanel() {
    const panel = document.getElementById('filterTagsPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function toggleCollapseAll() {
    const groups = document.querySelectorAll('.tag-group');
    const collapseAllBtn = document.getElementById('collapseAllBtn');
    
    // Controlla se ci sono gruppi espansi
    const hasExpanded = Array.from(groups).some(g => !g.classList.contains('collapsed'));
    
    groups.forEach(group => {
        const toggle = group.querySelector('.collapse-toggle');
        const tagId = group.dataset.tagId;
        if (hasExpanded) {
            // Compatta tutti
            group.classList.add('collapsed');
            if (toggle) toggle.textContent = '▶';
            if (tagId) state.collapsedGroups.add(tagId);
        } else {
            // Espandi tutti
            group.classList.remove('collapsed');
            if (toggle) toggle.textContent = '▼';
            if (tagId) state.collapsedGroups.delete(tagId);
        }
    });
    
    // Aggiorna solo il title del pulsante per non sovrascrivere l'SVG
    collapseAllBtn.title = hasExpanded ? 'Espandi Tutti' : 'Compatta Tutti';
}

// Rendering raggruppato per tag con drag-and-drop di interi gruppi
function createActionItem(action) {
    const actionItem = document.createElement('div');
    actionItem.className = 'action-item';
    if (state.actionsViewMode === 'grouped') {
        actionItem.classList.add('action-in-group');
    }
    actionItem.draggable = true;
    actionItem.dataset.actionId = action.id;
    actionItem.style.borderLeftColor = action.tag.color;
    
    if (state.selectedActions.has(action.id)) {
        actionItem.classList.add('selected-action');
    }
    if (state.activeAction && state.activeAction.id === action.id) {
        actionItem.classList.add('active-action');
    }
    
    const isImage = action.type === 'image';
    
    actionItem.innerHTML = `
        <input type="checkbox" class="action-checkbox" 
               ${state.selectedActions.has(action.id) ? 'checked' : ''}
               onchange="toggleActionSelection('${action.id}')">
        <div class="action-flags">
            ${!isImage ? `
            <button class="action-flag-btn ${action.positive ? 'active' : ''}" 
                    title="Positivo" 
                    style="color: #27ae60; background: none; border: none; padding: 2px; cursor: pointer; display: flex; align-items: center;"
                    onclick="event.stopPropagation(); window.toggleActionFlag('${action.id}', 'positive')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </button>
            <button class="action-flag-btn ${action.negative ? 'active' : ''}" 
                    title="Negativo" 
                    style="color: #e74c3c; background: none; border: none; padding: 2px; cursor: pointer; display: flex; align-items: center;"
                    onclick="event.stopPropagation(); window.toggleActionFlag('${action.id}', 'negative')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            ` : `
            <div class="image-preview-container">
                ${action.previewUrl ? `
                    <img src="${action.previewUrl}" class="image-preview-thumb" alt="Preview">
                    <div class="image-preview-overlay">
                        <img src="${action.previewUrl}">
                    </div>
                ` : `
                    <div style="color: #3498db; padding: 2px; display: flex; align-items: center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                `}
            </div>
            `}
        </div>
        <div class="action-info">
            <select class="action-tag action-tag-select" 
                    style="color: ${action.tag ? action.tag.color : '#7f8c8d'}; border: 1px solid transparent; background: transparent; font-weight: bold; cursor: pointer; padding: 2px; width: 100px; border-radius: 4px; font-size: 0.85em; text-overflow: ellipsis; white-space: nowrap;" 
                    onchange="window.changeActionTag('${action.id}', this.value)"
                    onmouseenter="this.style.border='1px solid #ccc'"
                    onmouseleave="this.style.border='1px solid transparent'">
                ${state.tags.map(t => `<option value="${t.id}" ${action.tag && t.id === action.tag.id ? 'selected' : ''} style="color: ${t.color}">${t.name}</option>`).join('')}
            </select>
            <div class="action-time">
                ${isImage ? `Durata: <input type="number" step="0.5" min="0.5" value="${action.duration}" style="width: 45px; background: rgba(255,255,255,0.1); border: 1px solid rgba(0,0,0,0.1); color: inherit; padding: 0 2px; border-radius: 3px;" onchange="event.stopPropagation(); window.updateImageDuration('${action.id}', this.value)"> s` 
                          : `${formatTime(action.startTime)} - ${formatTime(action.endTime)}`}
            </div>
        </div>
        <div class="action-controls-btns">
            ${!isImage ? `
            <button class="btn-play" title="Play" onclick="event.stopPropagation(); playAction('${action.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </button>
            ` : ''}
            <button class="btn-stop" title="Stop" onclick="event.stopPropagation(); stopAction()" style="background: #95a5a6; color: white;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            </button>
            ${!isImage ? `
            <button class="btn-comment-toggle ${action.comment ? 'has-comment' : ''}" title="Commento" onclick="event.stopPropagation(); window.toggleActionComment('${action.id}')" style="background: #3498db; color: white;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </button>
            ` : ''}
            <button class="btn-delete" title="Elimina" onclick="event.stopPropagation(); deleteAction('${action.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        </div>
        ${!isImage ? `
        <div class="action-comment-input" style="display: none;">
            <input type="text" placeholder="Aggiungi un commento..." 
                   value="${action.comment || ''}"
                   onchange="updateActionComment('${action.id}', this.value)">
        </div>
        ` : ''}
    `;
    
    // Click per attivare l'azione e controllare gli slider
    actionItem.addEventListener('click', (e) => {
        // Ignora click su checkbox, input, button e select
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') {
            return;
        }
        setActiveAction(action);
    });
    
    // Drag and drop per singola azione
    actionItem.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        actionItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', action.id);
    });
    
    actionItem.addEventListener('dragend', (e) => {
        actionItem.classList.remove('dragging');
    });

    return actionItem;
}

function renderActionsGroupedByTag(sortedActions, actionsList) {
    // Raggruppa le azioni per tag mantenendo l'ordine di sortedActions
    const groupedByTag = new Map();
    const tagOrder = []; // Traccia l'ordine di apparizione dei tag
    
    sortedActions.forEach(action => {
        if (!groupedByTag.has(action.tag.id)) {
            groupedByTag.set(action.tag.id, {
                tag: action.tag,
                actions: []
            });
            tagOrder.push(action.tag.id);
        }
        groupedByTag.get(action.tag.id).actions.push(action);
    });
    
    // I gruppi seguono l'ordine in cui appaiono in sortedActions
    // (che può essere customOrder o tag.order)
    const sortedGroups = tagOrder.map(tagId => [tagId, groupedByTag.get(tagId)]);
    
    // Crea i gruppi
    let groupIndex = 0;
    sortedGroups.forEach(([tagId, group]) => {
        const groupContainer = document.createElement('div');
        groupContainer.className = 'tag-group';
        if (state.collapsedGroups.has(tagId)) {
            groupContainer.classList.add('collapsed');
        }
        groupContainer.dataset.tagId = tagId;
        groupContainer.dataset.groupIndex = groupIndex++;
        
        // Header del gruppo (draggable)
        const groupHeader = document.createElement('div');
        groupHeader.className = 'tag-group-header';
        groupHeader.draggable = true;
        groupHeader.style.backgroundColor = group.tag.color + '20';
        groupHeader.style.borderLeft = `4px solid ${group.tag.color}`;

        const isCollapsed = state.collapsedGroups.has(tagId);
        const selectedInGroup = group.actions.filter(a => state.selectedActions.has(a.id)).length;

        groupHeader.innerHTML = `
            <span class="drag-handle">⋮⋮</span>
            <span class="group-tag-name" style="color: ${group.tag.color}; font-weight: 600;">${group.tag.name}</span>
            <span class="group-count">(${selectedInGroup}/${group.actions.length} selezionate)</span>
            <span class="collapse-toggle">${isCollapsed ? '▶' : '▼'}</span>
        `;
        
        // Click per collapse/expand
        const collapseToggle = groupHeader.querySelector('.collapse-toggle');
        collapseToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const nowCollapsed = groupContainer.classList.toggle('collapsed');
            if (nowCollapsed) {
                state.collapsedGroups.add(tagId);
            } else {
                state.collapsedGroups.delete(tagId);
            }
            collapseToggle.textContent = nowCollapsed ? '▶' : '▼';
        });
        
        // Drag and drop per il gruppo intero
        groupHeader.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            groupContainer.classList.add('dragging-group');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', tagId);
        });
        
        groupHeader.addEventListener('dragend', (e) => {
            groupContainer.classList.remove('dragging-group');
        });
        
        groupContainer.appendChild(groupHeader);
        
        // Contenitore per le azioni del gruppo
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'tag-group-actions';
        
        // Aggiungi ogni azione del gruppo
        group.actions.forEach(action => {
            const actionItem = createActionItem(action);
            actionsContainer.appendChild(actionItem);
        });
        
        // Gestione drag-over per azioni all'interno del gruppo
        actionsContainer.addEventListener('dragover', (e) => handleActionDragOver(e, actionsContainer));
        actionsContainer.addEventListener('drop', (e) => handleActionDrop(e, actionsContainer));
        
        groupContainer.appendChild(actionsContainer);
        actionsList.appendChild(groupContainer);
    });
    
    // Rimuovi vecchi listener se presenti
    actionsList.removeEventListener('dragover', handleGroupDragOver);
    actionsList.removeEventListener('drop', handleGroupDrop);
    
    // Setup drag-over per riordinare i gruppi
    actionsList.addEventListener('dragover', handleGroupDragOver);
    actionsList.addEventListener('drop', handleGroupDrop);
}

function handleGroupDragOver(e) {
    e.preventDefault();
    const draggingGroup = document.querySelector('.dragging-group');
    if (!draggingGroup) return;
    
    const afterElement = getDragAfterElementGroup(e.clientY);
    const actionsList = document.getElementById('actionsList');
    
    if (afterElement == null) {
        actionsList.appendChild(draggingGroup);
    } else {
        actionsList.insertBefore(draggingGroup, afterElement);
    }
}

function handleGroupDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Salva il nuovo ordine completo
    saveCompleteActionsOrder();
    
    // Aggiorna la sequenza se in riproduzione
    if (previewState.isPlaying) {
        refreshPreviewSequence();
    }
    
    showNotification('✅ Gruppi riordinati!', 'success', 2000);
    
    // Re-render con il nuovo ordine
    setTimeout(() => {
        renderActions();
    }, 100);
}

function getDragAfterElementGroup(y) {
    const actionsList = document.getElementById('actionsList');
    const draggableElements = [...actionsList.querySelectorAll('.tag-group:not(.dragging-group)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleActionDragOver(e, container) {
    e.preventDefault();
    e.stopPropagation();
    const draggingAction = document.querySelector('.action-item.dragging');
    if (!draggingAction) return;
    
    // In modalità gruppi, permettiamo lo spostamento solo se il contenitore è quello di origine
    if (state.actionsViewMode === 'grouped') {
        const actionId = draggingAction.dataset.actionId;
        const action = state.analysisActions.find(a => a.id === actionId);
        if (action && action.tag.id !== container.parentElement.dataset.tagId) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
    }
    
    const afterElement = getDragAfterElementAction(container, e.clientY);
    
    if (afterElement == null) {
        container.appendChild(draggingAction);
    } else {
        container.insertBefore(draggingAction, afterElement);
    }
}

function handleActionDrop(e, container) {
    e.preventDefault();
    e.stopPropagation();
    
    // In modalità gruppi, verifichiamo che l'azione appartenga a questo gruppo
    if (state.actionsViewMode === 'grouped') {
        const draggingAction = document.querySelector('.action-item.dragging');
        if (draggingAction) {
            const actionId = draggingAction.dataset.actionId;
            const action = state.analysisActions.find(a => a.id === actionId);
            if (action && action.tag.id !== container.parentElement.dataset.tagId) {
                return; // Annulla il drop se il tag non corrisponde
            }
        }
    }
    
    // Salva il nuovo ordine completo di tutte le azioni
    saveCompleteActionsOrder();

    // Aggiorna la sequenza se in riproduzione
    if (previewState.isPlaying) {
        refreshPreviewSequence();
    }
}

function getDragAfterElementAction(container, y) {
    const draggableElements = [...container.querySelectorAll('.action-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function saveCompleteActionsOrder() {
    // Raccogli tutte le azioni nell'ordine attuale del DOM
    const actionsList = document.getElementById('actionsList');
    state.customOrder = [];
    
    if (state.actionsViewMode === 'free') {
        const allItems = actionsList.querySelectorAll('.action-item[data-action-id]');
        allItems.forEach(item => {
            state.customOrder.push(item.dataset.actionId);
        });
    } else {
        const allGroups = actionsList.querySelectorAll('.tag-group');
        allGroups.forEach(group => {
            const actionsInGroup = group.querySelectorAll('.action-item[data-action-id]');
            actionsInGroup.forEach(item => {
                state.customOrder.push(item.dataset.actionId);
            });
        });
    }
    
    saveStateToLocalStorage();
    console.log('Ordine completo salvato:', state.customOrder);
}

function populateTagFilter() {
    const panel = document.getElementById('filterTagsPanel');
    if (!panel) return;
    
    panel.innerHTML = '<div style="font-weight: 600; margin-bottom: 10px; border-bottom: 2px solid #3498db; padding-bottom: 5px;">Seleziona Tag:</div>';
    
    // Ordina i tag in base al loro order
    const sortedTags = [...state.tags].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    sortedTags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'filter-tag-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `filter-${tag.id}`;
        checkbox.checked = state.filterTags.has(tag.id);
        checkbox.onchange = () => toggleTagFilter(tag.id);
        
        const label = document.createElement('label');
        label.htmlFor = `filter-${tag.id}`;
        label.textContent = tag.name;
        label.style.color = tag.color;
        
        item.appendChild(checkbox);
        item.appendChild(label);
        panel.appendChild(item);
    });
}

function toggleTagFilter(tagId) {
    if (state.filterTags.has(tagId)) {
        state.filterTags.delete(tagId);
    } else {
        state.filterTags.add(tagId);
    }
    renderActions();
    
    if (state.filterTags.size > 0) {
        showNotification(`🏷️ Filtro attivo: ${state.filterTags.size} tag selezionati`, 'info');
    }
}

function openReorderModal() {
    if (state.selectedActions.size === 0) {
        alert('Seleziona almeno un\'azione da riordinare');
        return;
    }
    
    // Crea una lista di azioni selezionate con il loro ordine attuale
    const selectedActionsList = state.analysisActions
        .filter(a => state.selectedActions.has(a.id))
        .sort((a, b) => a.startTime - b.startTime);
    
    // Salva l'ordine personalizzato
    state.customOrder = selectedActionsList.map(a => a.id);
    
    // Crea un modale per riordinare
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    content.innerHTML = `
        <h2 style="margin-bottom: 20px;">🔀 Riordina Clip Selezionate</h2>
        <p style="margin-bottom: 15px; color: #7f8c8d;">Trascina le clip per riordinarle come desideri nell'export:</p>
        <div id="reorderList" style="display: flex; flex-direction: column; gap: 10px;"></div>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
            <button onclick="closeReorderModal()" style="padding: 10px 20px; border-radius: 5px; border: 2px solid #95a5a6; background: white; cursor: pointer;">Annulla</button>
            <button onclick="saveCustomOrder()" style="padding: 10px 20px; border-radius: 5px; border: none; background: #27ae60; color: white; cursor: pointer; font-weight: 600;">Salva Ordine</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Popola la lista riordinabile
    renderReorderList(selectedActionsList);
    
    // Chiudi cliccando fuori
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeReorderModal();
        }
    });
}

function renderReorderList(actions) {
    const list = document.getElementById('reorderList');
    if (!list) return;
    
    list.innerHTML = '';
    
    actions.forEach((action, index) => {
        const item = document.createElement('div');
        item.draggable = true;
        item.dataset.actionId = action.id;
        item.style.cssText = `
            background: white;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid ${action.tag.color};
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            cursor: move;
            display: flex;
            align-items: center;
            gap: 15px;
        `;
        
        item.innerHTML = `
            <span style="font-weight: 600; color: #7f8c8d; min-width: 30px;">${index + 1}.</span>
            <span style="font-weight: 600; color: ${action.tag.color};">${action.tag.name}</span>
            <span style="color: #7f8c8d; font-family: monospace;">${formatTime(action.startTime)} - ${formatTime(action.endTime)}</span>
            ${action.comment ? `<span style="color: #95a5a6; font-style: italic;">"${action.comment}"</span>` : ''}
        `;
        
        // Drag and drop
        item.addEventListener('dragstart', (e) => {
            item.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', action.id);
        });
        
        item.addEventListener('dragend', () => {
            item.style.opacity = '1';
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const draggingItem = list.querySelector('[style*="opacity: 0.5"]');
            if (draggingItem && draggingItem !== item) {
                const rect = item.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                if (e.clientY < midpoint) {
                    list.insertBefore(draggingItem, item);
                } else {
                    list.insertBefore(draggingItem, item.nextSibling);
                }
            }
        });
        
        list.appendChild(item);
    });
}

function closeReorderModal() {
    const modal = document.querySelector('[style*="position: fixed"]');
    if (modal) {
        modal.remove();
    }
}

function saveCustomOrder() {
    const list = document.getElementById('reorderList');
    if (!list) return;
    
    const items = list.querySelectorAll('[data-action-id]');
    state.customOrder = Array.from(items).map(item => item.dataset.actionId);
    
    closeReorderModal();
    showNotification('✅ Ordinamento personalizzato salvato! Verrà usato nell\'export.', 'success');
}

function selectAllActions() {
    // Seleziona tutte le azioni visibili (filtrate)
    let actionsToSelect = state.analysisActions;
    if (state.filterTags.size > 0) {
        actionsToSelect = state.analysisActions.filter(a => state.filterTags.has(a.tag.id));
    }
    
    actionsToSelect.forEach(action => {
        state.selectedActions.add(action.id);
    });
    
    renderActions();
    saveStateToLocalStorage();
    showNotification(`✅ ${actionsToSelect.length} azioni selezionate`, 'success');
}

function deselectAllActions() {
    state.selectedActions.clear();
    renderActions();
    saveStateToLocalStorage();
    showNotification('✅ Selezione cancellata', 'info');
}

function filterActionsByTag(tagId) {
    state.filterTag = tagId;
    renderActions();
    
    if (tagId) {
        const tag = state.tags.find(t => t.id === tagId);
        if (tag) {
            showNotification(`🏷️ Filtro attivo: ${tag.name}`, 'info');
        }
    }
}

function toggleActionSelection(actionId) {
    if (state.selectedActions.has(actionId)) {
        state.selectedActions.delete(actionId);
    } else {
        state.selectedActions.add(actionId);
    }
    renderActions();
    saveStateToLocalStorage();
}

window.changeActionTag = function(actionId, newTagId) {
    const action = state.analysisActions.find(a => a.id === actionId);
    if (!action) return;
    
    const newTag = state.tags.find(t => t.id === newTagId);
    if (!newTag) return;
    
    action.tag = { ...newTag };
    
    renderActions();
    saveStateToLocalStorage();
    showNotification(`✅ Tag cambiato in "${newTag.name}"`, 'success');
};

function updateActionTime(actionId, type, value) {
    const action = state.analysisActions.find(a => a.id === actionId);
    if (!action) return;
    
    const time = parseFloat(value);
    if (isNaN(time)) return;
    
    if (type === 'start') {
        action.startTime = time;
        // Impedisci che start superi end
        if (action.startTime > action.endTime) {
            action.endTime = action.startTime + 0.1;
        }
    } else if (type === 'end') {
        action.endTime = time;
        // Impedisci che end sia inferiore a start
        if (action.endTime < action.startTime) {
            action.startTime = Math.max(0, action.endTime - 0.1);
        }
    }
    
    action.duration = action.endTime - action.startTime;
    
    // Se questa è l'azione attiva, aggiorna anche gli slider
    if (state.activeAction && state.activeAction.id === actionId) {
        state.activeAction = action;
        updateMainSliders();
    }
    
    renderActions();
    saveStateToLocalStorage();
}

function setActiveAction(action) {
    state.activeAction = action;
    renderActions();
    updateMainSliders();
}

function updateMainSliders() {
    if (!state.activeAction) {
        document.getElementById('actionSliderContainer').style.display = 'none';
        return;
    }
    
    const videoPlayer = document.getElementById('videoPlayer');
    const maxDuration = videoPlayer && videoPlayer.duration ? videoPlayer.duration : 3600;
    const rangeBuffer = 5; // 5 secondi di buffer intorno all'azione
    
    const action = state.activeAction;
    // Calcoliamo un range comune per entrambi i cursori
    const rangeMin = Math.max(0, Math.min(action.startTime, action.endTime) - rangeBuffer);
    const rangeMax = Math.min(maxDuration, Math.max(action.startTime, action.endTime) + rangeBuffer);
    
    const container = document.getElementById('actionSliderContainer');
    const startSlider = document.getElementById('startTimeSlider');
    const endSlider = document.getElementById('endTimeSlider');
    const actionName = document.getElementById('activeActionName');
    
    container.style.display = 'block';
    actionName.textContent = action.tag.name;
    
    startSlider.min = rangeMin;
    startSlider.max = rangeMax;
    startSlider.value = action.startTime;
    
    endSlider.min = rangeMin;
    endSlider.max = rangeMax;
    endSlider.value = action.endTime;
    
    updateSliderDisplay('start', action.startTime);
    updateSliderDisplay('end', action.endTime);
    updateSliderTrack();
}

function updateSliderTrack() {
    const startSlider = document.getElementById('startTimeSlider');
    const endSlider = document.getElementById('endTimeSlider');
    const track = document.querySelector('.slider-track');
    
    if (!startSlider || !endSlider || !track) return;
    
    const min = parseFloat(startSlider.min);
    const max = parseFloat(startSlider.max);
    const val1 = parseFloat(startSlider.value);
    const val2 = parseFloat(endSlider.value);
    
    const percent1 = ((val1 - min) / (max - min)) * 100;
    const percent2 = ((val2 - min) / (max - min)) * 100;
    
    // Coloriamo la parte tra i due cursori
    track.style.background = `linear-gradient(to right, 
        #ddd ${percent1}%, 
        #3498db ${percent1}%, 
        #3498db ${percent2}%, 
        #ddd ${percent2}%)`;
}

function updateSliderDisplay(type, value) {
    const displayId = type === 'start' ? 'startTimeDisplay' : 'endTimeDisplay';
    const display = document.getElementById(displayId);
    if (display) {
        // Mostriamo anche i decimi di secondo per precisione
        const mins = Math.floor(value / 60);
        const secs = (value % 60).toFixed(1);
        display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(4, '0')}`;
    }
}

function updateActionTimeDisplay(actionId) {
    const action = state.analysisActions.find(a => a.id === actionId);
    if (!action) return;
    
    // Trova gli slider per questa azione
    const actionElement = document.querySelector(`[data-action-id="${actionId}"]`)?.closest('.action-item');
    if (!actionElement) return;
    
    const startSlider = actionElement.querySelector('.time-slider[data-type="start"]');
    const endSlider = actionElement.querySelector('.time-slider[data-type="end"]');
    const timeDisplay = actionElement.querySelector(`#time-${actionId}`);
    
    if (startSlider && endSlider && timeDisplay) {
        const startTime = parseFloat(startSlider.value);
        const endTime = parseFloat(endSlider.value);
        timeDisplay.textContent = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    }
}

function updateActionComment(actionId, comment) {
    const action = state.analysisActions.find(a => a.id === actionId);
    if (!action) return;
    
    action.comment = comment;
    saveStateToLocalStorage();
}

function updateImageDuration(actionId, duration) {
    const action = state.analysisActions.find(a => a.id === actionId);
    if (!action || action.type !== 'image') return;
    
    const d = parseFloat(duration);
    if (isNaN(d) || d < 0.1) return;
    
    action.duration = d;
    renderActions();
    saveStateToLocalStorage();
}

window.updateImageDuration = updateImageDuration;

function playAction(actionId) {
    if (previewState.isPlaying) stopPreview();
    
    const action = state.analysisActions.find(a => a.id === actionId);
    if (!action) return;
    
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.currentTime = action.startTime;
    videoPlayer.play();
    
    // Stop at end time
    const stopHandler = () => {
        if (videoPlayer.currentTime >= action.endTime) {
            videoPlayer.pause();
            videoPlayer.removeEventListener('timeupdate', stopHandler);
        }
    };
    videoPlayer.addEventListener('timeupdate', stopHandler);
}

function stopAction() {
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.pause();
}

/**
 * Toggle della visibilità del commento per un'azione
 */
window.toggleActionComment = function(actionId) {
    const actionItem = document.querySelector(`.action-item[data-action-id="${actionId}"]`);
    if (!actionItem) return;
    
    const commentField = actionItem.querySelector('.action-comment-input');
    const toggleBtn = actionItem.querySelector('.btn-comment-toggle');
    
    if (commentField.style.display === 'none') {
        commentField.style.display = 'block';
        toggleBtn.classList.add('active');
    } else {
        commentField.style.display = 'none';
        toggleBtn.classList.remove('active');
    }
};

/**
 * Toggle della visibilità di TUTTI i commenti
 */
window.toggleAllComments = function() {
    const allCommentFields = document.querySelectorAll('.action-comment-input');
    const allToggleBtns = document.querySelectorAll('.btn-comment-toggle');
    
    // Determina se mostrare o nascondere in base al primo elemento (se esiste)
    let shouldShow = true;
    if (allCommentFields.length > 0) {
        shouldShow = allCommentFields[0].style.display === 'none';
    }
    
    allCommentFields.forEach(field => {
        field.style.display = shouldShow ? 'block' : 'none';
    });
    
    allToggleBtns.forEach(btn => {
        if (shouldShow) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const msg = shouldShow ? '✅ Commenti mostrati' : '✅ Commenti nascosti';
    showNotification(msg, 'success', 2000);
};

function deleteAction(actionId) {
    if (confirm('Sei sicuro di voler eliminare questa azione?')) {
        state.analysisActions = state.analysisActions.filter(a => a.id !== actionId);
        state.selectedActions.delete(actionId);
        renderActions();
        saveStateToLocalStorage();
    }
}

// Funzione globale per gestire i flag delle azioni
window.toggleActionFlag = function(actionId, flagType) {
    const action = state.analysisActions.find(a => a.id === actionId);
    if (!action) return;

    if (flagType === 'positive') {
        action.positive = !action.positive;
        if (action.positive) action.negative = false;
    } else if (flagType === 'negative') {
        action.negative = !action.negative;
        if (action.negative) action.positive = false;
    }

    saveStateToLocalStorage();
    renderActions();
};

function toggleFlagFilterPanel() {
    const filters = [null, 'positive', 'negative'];
    const currentIndex = filters.indexOf(state.filterFlag);
    const nextIndex = (currentIndex + 1) % filters.length;
    state.filterFlag = filters[nextIndex];
    
    updateFlagFilterBtn();
    renderActions();
}

function toggleSelectedFilter() {
    state.filterSelected = !state.filterSelected;
    updateSelectedFilterBtn();
    renderActions();
}

function updateSelectedFilterBtn() {
    const btn = document.getElementById('filterSelectedBtn');
    if (!btn) return;
    
    if (state.filterSelected) {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        btn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
        btn.title = "Mostra Tutte";
    } else {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        btn.style.background = '#95a5a6';
        btn.title = "Mostra solo selezionate";
    }
}

function updateFlagFilterBtn() {
    const btn = document.getElementById('filterFlagBtn');
    if (!btn) return;
    
    if (state.filterFlag === 'positive') {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        btn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
        btn.title = "Filtro Flag: OK (Click per KO)";
    } else if (state.filterFlag === 'negative') {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        btn.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        btn.title = "Filtro Flag: KO (Click per Tutti)";
    } else {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
        btn.style.background = 'linear-gradient(135deg, #34495e, #2c3e50)';
        btn.title = "Filtra per Flag (Click per OK)";
    }
}

window.toggleFlagFilterPanel = toggleFlagFilterPanel;

function deleteSelectedActions() {
    if (state.selectedActions.size === 0) {
        alert('Seleziona almeno un\'azione da eliminare');
        return;
    }
    
    if (confirm(`Sei sicuro di voler eliminare ${state.selectedActions.size} azione/i?`)) {
        state.analysisActions = state.analysisActions.filter(a => !state.selectedActions.has(a.id));
        state.selectedActions.clear();
        renderActions();
        saveStateToLocalStorage();
    }
}

// Highlight Video Creation
function openHighlightModal() {
    if (state.selectedActions.size === 0) {
        alert('Seleziona almeno un\'azione per creare un video di sintesi');
        return;
    }
    
    const modal = document.getElementById('highlightModal');
    const preview = document.getElementById('selectedActionsPreview');
    
    preview.innerHTML = '<h3>Azioni Selezionate:</h3>';
    
    const selectedActionsList = state.analysisActions
        .filter(a => state.selectedActions.has(a.id))
        .sort((a, b) => a.startTime - b.startTime);
    
    selectedActionsList.forEach(action => {
        const item = document.createElement('div');
        item.style.padding = '10px';
        item.style.marginBottom = '10px';
        item.style.backgroundColor = 'white';
        item.style.borderRadius = '5px';
        item.style.borderLeft = `4px solid ${action.tag.color}`;
        item.innerHTML = `
            <strong>${action.tag.name}</strong><br>
            ${formatTime(action.startTime)} - ${formatTime(action.endTime)}
            (${action.duration.toFixed(1)}s)
        `;
        preview.appendChild(item);
    });
    
    modal.style.display = 'block';
}

function generateHighlight() {
    if (!state.ffmpegLoaded) {
        alert('FFmpeg sta ancora caricando. Riprova tra qualche secondo.');
        return;
    }
    
    const selectedActionsList = state.analysisActions
        .filter(a => state.selectedActions.has(a.id))
        .sort((a, b) => a.startTime - b.startTime);
    
    if (selectedActionsList.length === 0) {
        alert('Nessuna azione selezionata');
        return;
    }
    
    if (!state.currentVideo || !state.currentVideo.file) {
        alert('Nessun video caricato');
        return;
    }
    
    createHighlightVideo(selectedActionsList);
}

// Merge Videos
function openMergeModal() {
    const modal = document.getElementById('mergeModal');
    modal.style.display = 'block';
}

function executeMerge() {
    const input = document.getElementById('mergeVideoInput');
    const files = Array.from(input.files);
    
    if (files.length < 2) {
        alert('Seleziona almeno 2 video da unire');
        return;
    }
    
    if (!state.ffmpegLoaded) {
        alert('FFmpeg sta ancora caricando. Riprova tra qualche secondo.');
        return;
    }
    
    mergeVideos(files);
}

// Modal Controls
function setupModalControls() {
    // Close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Click outside to close
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Generate highlight button (se esiste)
    const generateHighlightBtn = document.getElementById('generateHighlightBtn');
    if (generateHighlightBtn) {
        generateHighlightBtn.addEventListener('click', generateHighlight);
    }
    
    // Execute merge button (se esiste)
    const executeMergeBtn = document.getElementById('executeMergeBtn');
    if (executeMergeBtn) {
        executeMergeBtn.addEventListener('click', executeMerge);
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Local Storage
function saveTagsToLocalStorage() {
    try {
        console.log('Salvataggio tags:', state.tags.length);
        localStorage.setItem('matchAnalysisTags', JSON.stringify(state.tags));
    } catch (e) {
        console.error('Errore nel salvataggio tags:', e);
    }
}

function loadActionsFromLocalStorage() {
    try {
        const savedAnalysis = localStorage.getItem('matchAnalysisActions');
        if (savedAnalysis) {
            state.analysisActions = JSON.parse(savedAnalysis);
            
            // Ripristina lo stato delle selezioni (checkbox) dalle azioni caricate e aggiorna colori per fase
            state.selectedActions.clear();
            state.analysisActions.forEach(action => {
                if (action.tag) {
                    if (action.tag.phase === 'offensiva') action.tag.color = '#27ae60';
                    if (action.tag.phase === 'difensiva') action.tag.color = '#3498db';
                }
                if (action.selected) {
                    state.selectedActions.add(action.id);
                }
            });
            
            console.log('Azioni analisi caricate:', state.analysisActions.length);
        }

        const savedLive = localStorage.getItem('matchAnalysisLiveActions');
        if (savedLive) {
            state.liveActions = JSON.parse(savedLive);
            console.log('Azioni live caricate:', state.liveActions.length);
        }

        // Carica score se presente
        const savedScore = localStorage.getItem('matchAnalysisScore');
        if (savedScore) {
            state.score = JSON.parse(savedScore);
            updateScoreDisplay();
        }
        
        // Carica customOrder
        const savedOrder = localStorage.getItem('matchAnalysisCustomOrder');
        if (savedOrder) {
            state.customOrder = JSON.parse(savedOrder);
            console.log('Ordine personalizzato caricato:', state.customOrder.length);
        }

        // Carica nomi squadre
        const savedTeamNames = localStorage.getItem('matchAnalysisTeamNames');
        if (savedTeamNames) {
            state.teamNames = JSON.parse(savedTeamNames);
            console.log('Nomi squadre caricati:', state.teamNames);
        }
    } catch (e) {
        console.error('Errore nel caricamento azioni:', e);
    }
}

function saveStateToLocalStorage() {
    saveTagsToLocalStorage();
    try {
        // Aggiungiamo lo stato della selezione alle azioni prima di salvarle
        const analysisActionsToSave = state.analysisActions.map(action => ({
            ...action,
            selected: state.selectedActions.has(action.id)
        }));
        localStorage.setItem('matchAnalysisActions', JSON.stringify(analysisActionsToSave));
        localStorage.setItem('matchAnalysisLiveActions', JSON.stringify(state.liveActions));
        localStorage.setItem('matchAnalysisCustomOrder', JSON.stringify(state.customOrder));
        localStorage.setItem('matchAnalysisTeamNames', JSON.stringify(state.teamNames));
        localStorage.setItem('matchAnalysisViewMode', state.actionsViewMode);
        localStorage.setItem('matchAnalysisScore', JSON.stringify(state.score));
    } catch (e) {
        console.error('Errore nel salvataggio azioni:', e);
    }
}

function updateTeamName(team, name) {
    if (state.teamNames) {
        state.teamNames[team] = name;
        saveStateToLocalStorage();
        console.log(`Nome squadra ${team} aggiornato: ${name}`);
        
        // 1. Aggiorna gli input nella tab Analisi Video
        const analysisInput = document.getElementById(`teamName${team}`);
        if (analysisInput && analysisInput.value !== name) {
            analysisInput.value = name;
        }

        // 2. Aggiorna gli input nella tab Live Tagging
        const liveInputs = document.querySelectorAll(`.live-team-input[data-team="${team}"]`);
        liveInputs.forEach(input => {
            if (input.value !== name) {
                input.value = name;
            }
        });

        // 3. Aggiorna eventuali titoli o etichette che usano il nome squadra
        // Eseguiamo un render parziale o totale se necessario
        renderLiveActions(); 
        renderActions();
    }
}

function loadStateFromLocalStorage() {
    try {
        const saved = localStorage.getItem('matchAnalysisState');
        if (saved) {
            const data = JSON.parse(saved);
            // Carica solo i tag custom, i default verranno aggiunti dopo
            if (data.tags && data.tags.length > 0) {
                state.tags = data.tags.filter(t => !t.isDefault); // Solo tag custom
            }
            if (data.actions) state.actions = data.actions;
            
            // Carica nomi squadre e punteggio
            if (data.teamNames) state.teamNames = data.teamNames;
            if (data.score) state.score = data.score;
            
            console.log('Stato caricato da localStorage - Tags custom:', state.tags.length);
        }
        
        // Carica nomi squadre dal nuovo sistema di salvataggio
        const savedTeamNames = localStorage.getItem('matchAnalysisTeamNames');
        if (savedTeamNames) {
            state.teamNames = JSON.parse(savedTeamNames);
        }

        const savedViewMode = localStorage.getItem('matchAnalysisViewMode');
        if (savedViewMode) {
            state.actionsViewMode = savedViewMode;
        }
    } catch (e) {
        console.error('Errore nel caricamento:', e);
    }
}

// Export functions to global scope for inline event handlers and inter-file communication
window.deleteTag = deleteTag;
window.toggleTagSettings = toggleTagSettings;
window.updateTeamName = updateTeamName;
window.toggleActionSelection = toggleActionSelection;
window.updateActionTime = updateActionTime;
window.updateActionComment = updateActionComment;
window.playAction = playAction;
window.stopAction = stopAction;
window.deleteAction = deleteAction;
window.toggleTagsPanel = toggleTagsPanel;
window.toggleActionsPanel = toggleActionsPanel;
window.toggleViewMode = toggleViewMode;
window.formatTime = formatTime;
window.renderTags = renderTags;
window.renderActions = renderActions;
window.saveTagsToLocalStorage = saveTagsToLocalStorage;
window.saveStateToLocalStorage = saveStateToLocalStorage;
window.populateTagFilter = populateTagFilter;
window.showNotification = showNotification;
window.toggleSelectedFilter = toggleSelectedFilter;
window.toggleFlagFilterPanel = toggleFlagFilterPanel;
window.selectAllActions = selectAllActions;
window.deselectAllActions = deselectAllActions;
window.toggleFilterPanel = toggleFilterPanel;
window.toggleCollapseAll = toggleCollapseAll;
window.deleteSelectedActions = deleteSelectedActions;
window.addImageAction = addImageAction;
window.startPreviewSequence = startPreviewSequence;
window.stopPreview = stopPreview;
window.loadVideoWithPicker = loadVideoWithPicker;
window.addNewTag = addNewTag;
window.updateVideoTime = updateVideoTime;
window.clearAllActions = clearAllActions;
window.updateDuration = updateDuration;
window.updateSliderDisplay = updateSliderDisplay;
window.updateSliderTrack = updateSliderTrack;
window.setupModalControls = setupModalControls;
window.setupDraggableContainers = setupDraggableContainers;
window.updateFlagFilterBtn = updateFlagFilterBtn;
window.updateSelectedFilterBtn = updateSelectedFilterBtn;
window.setupTabs = setupTabs;
window.setupEventListeners = setupEventListeners;
window.setupActionsListeners = setupActionsListeners;
window.initializeDefaultTags = initializeDefaultTags;
window.loadActionsFromLocalStorage = loadActionsFromLocalStorage;
window.closeReorderModal = typeof closeReorderModal !== 'undefined' ? closeReorderModal : null;
window.saveCustomOrder = typeof saveCustomOrder !== 'undefined' ? saveCustomOrder : null;

// ============================================
// Notifications
// ============================================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Sequence Playback Logic (Main Player)
function startPreviewSequence() {
    // Collect selected actions
    let filteredActions = state.analysisActions.filter(a => state.selectedActions.has(a.id));

    if (filteredActions.length === 0) {
        alert("Seleziona almeno un'azione per avviare la sequenza.");
        return;
    }

    // Sort actions using the same logic as renderActions()
    let sortedActions;
    if (state.customOrder && state.customOrder.length > 0) {
        const orderMap = new Map(state.customOrder.map((id, index) => [id, index]));
        sortedActions = [...filteredActions].sort((a, b) => {
            const orderA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
            const orderB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
            if (orderA !== orderB) return orderA - orderB;
            return a.startTime - b.startTime;
        });
    } else {
        sortedActions = [...filteredActions].sort((a, b) => {
            const tagOrderA = a.tag.order || 0;
            const tagOrderB = b.tag.order || 0;
            if (tagOrderA !== tagOrderB) return tagOrderA - tagOrderB;
            return a.startTime - b.startTime;
        });
    }

    previewState.selectedActions = sortedActions;
    previewState.currentIndex = 0;
    previewState.isPlaying = true;

    // Filter list to show only selected actions
    if (!state.filterSelected) {
        state.filterSelected = true;
        updateSelectedFilterBtn();
        renderActions();
    }

    // UI Updates
    document.getElementById('startPreviewFromMainBtn').style.display = 'none';
    document.getElementById('stopPreviewMainBtn').style.display = 'flex';

    playPreviewIndex(0);
}

function playPreviewIndex(index) {
    if (index >= previewState.selectedActions.length) {
        stopPreview();
        return;
    }
    
    previewState.currentIndex = index;
    const action = previewState.selectedActions[index];
    const videoPlayer = document.getElementById('videoPlayer');
    
    // Highlight active action in main list if visible
    document.querySelectorAll('.action-item').forEach(item => {
        const isCurrent = item.dataset.actionId === action.id;
        item.classList.toggle('active-action', isCurrent);
        if (isCurrent) {
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    if (action.type === 'image') {
        videoPlayer.pause();
        showNotification(`🖼 Sequenza: Visualizzazione Immagine "${action.fileName}" (${action.duration}s)`, 'info', action.duration * 1000);
        
        if (window.previewImageTimeout) clearTimeout(window.previewImageTimeout);
        window.previewImageTimeout = setTimeout(() => {
            if (previewState.isPlaying && previewState.currentIndex === index) {
                playNextInPreview();
            }
        }, action.duration * 1000);
        return;
    }

    if (window.previewImageTimeout) clearTimeout(window.previewImageTimeout);
    videoPlayer.currentTime = action.startTime;
    videoPlayer.play();
}

function playNextInPreview() {
    previewState.currentIndex++;
    if (previewState.currentIndex < previewState.selectedActions.length) {
        playPreviewIndex(previewState.currentIndex);
    } else {
        stopPreview();
    }
}

function stopPreview() {
    previewState.isPlaying = false;
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) videoPlayer.pause();

    // UI Updates
    const startBtn = document.getElementById('startPreviewFromMainBtn');
    const stopBtn = document.getElementById('stopPreviewMainBtn');
    if (startBtn) startBtn.style.display = 'flex';
    if (stopBtn) stopBtn.style.display = 'none';

    // Remove highlights
    document.querySelectorAll('.action-item').forEach(item => {
        item.classList.remove('active-action');
    });
}

/**
 * Rinfresca l'elenco della sequenza in base al nuovo ordine nel DOM
 * senza interrompere la riproduzione corrente
 */
function refreshPreviewSequence() {
    // Identifichiamo l'azione in corso
    const currentAction = previewState.selectedActions[previewState.currentIndex];
    
    // Ricalcoliamo l'ordine (stessa logica di startPreviewSequence)
    let filteredActions = state.analysisActions.filter(a => state.selectedActions.has(a.id));
    
    let sortedActions;
    if (state.customOrder && state.customOrder.length > 0) {
        const orderMap = new Map(state.customOrder.map((id, index) => [id, index]));
        sortedActions = [...filteredActions].sort((a, b) => {
            const orderA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
            const orderB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
            if (orderA !== orderB) return orderA - orderB;
            return a.startTime - b.startTime;
        });
    } else {
        sortedActions = [...filteredActions].sort((a, b) => {
            const tagOrderA = a.tag.order || 0;
            const tagOrderB = b.tag.order || 0;
            if (tagOrderA !== tagOrderB) return tagOrderA - tagOrderB;
            return a.startTime - b.startTime;
        });
    }

    previewState.selectedActions = sortedActions;
    
    // Aggiorniamo l'indice in base alla nuova posizione dell'azione corrente
    if (currentAction) {
        const newIndex = previewState.selectedActions.findIndex(a => a.id === currentAction.id);
        if (newIndex !== -1) {
            previewState.currentIndex = newIndex;
        }
    }
}

// Layout Control
function toggleTagsPanel() {
    const mainContent = document.getElementById('mainContent');
    const tagsSection = document.getElementById('tagsSection');
    const btn = document.getElementById('toggleTagsSidebarBtn');
    
    tagsSection.classList.toggle('collapsed');
    mainContent.classList.toggle('tags-collapsed');
    
    if (btn) {
        if (tagsSection.classList.contains('collapsed')) {
            btn.textContent = 'TAGS »';
        } else {
            btn.textContent = '« TAGS';
        }
    }
}

function toggleActionsPanel() {
    const mainContent = document.getElementById('mainContent');
    const actionsSection = document.getElementById('actionsSection');
    const btn = document.getElementById('toggleActionsSidebarBtn');
    
    actionsSection.classList.toggle('collapsed');
    mainContent.classList.toggle('actions-collapsed');
    
    if (btn) {
        if (actionsSection.classList.contains('collapsed')) {
            btn.textContent = '« AZIONI';
        } else {
            btn.textContent = 'AZIONI »';
        }
    }
}

/* --- LIVE TAGGING LOGIC --- */

function startLiveTimer() {
    if (state.liveTimer.running) return;
    
    state.liveTimer.running = true;
    state.liveTimer.startTime = Date.now() - (state.liveTimer.elapsed * 1000);
    
    state.liveTimer.interval = setInterval(() => {
        const now = Date.now();
        state.liveTimer.elapsed = (now - state.liveTimer.startTime) / 1000;
        updateLiveTimerDisplay();
    }, 100);
    
    document.getElementById('liveStartBtn').style.display = 'none';
    document.getElementById('livePauseBtn').style.display = 'block';
}

function pauseLiveTimer() {
    state.liveTimer.running = false;
    clearInterval(state.liveTimer.interval);
    
    document.getElementById('liveStartBtn').style.display = 'block';
    document.getElementById('livePauseBtn').style.display = 'none';
}

function resetLiveTimer() {
    if (confirm('Vuoi davvero resettare il timer?')) {
        pauseLiveTimer();
        state.liveTimer.elapsed = 0;
        updateLiveTimerDisplay();
    }
}

function setLiveTimerSeconds(seconds) {
    state.liveTimer.elapsed = seconds;
    if (state.liveTimer.running) {
        state.liveTimer.startTime = Date.now() - (seconds * 1000);
    }
    updateLiveTimerDisplay();
}

function updateLiveTimerDisplay() {
    const display = document.getElementById('liveTimerDisplay');
    if (display) {
        const totalSeconds = Math.floor(state.liveTimer.elapsed);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function renderLiveTags() {
    console.log('Rendering Live Tags con stato attuale:', state.tags);
    const lists = {
        offensive: document.getElementById('liveTagListOffensive'),
        defensive: document.getElementById('liveTagListDefensive'),
        A: document.getElementById('liveTagListA'),
        B: document.getElementById('liveTagListB')
    };
    
    // Aggiorna gli input dei nomi e i selettori colore
    document.querySelectorAll('.live-team-input').forEach(input => {
        const team = input.dataset.team;
        if (state.teamNames[team]) input.value = state.teamNames[team];
    });

    document.querySelectorAll('.live-team-color').forEach(input => {
        const team = input.dataset.team;
        // Prendi il colore del primo tag di quella squadra se disponibile
        const teamTag = state.tags.find(t => t.team === team);
        if (teamTag) input.value = teamTag.color;
    });

    // Pulisci liste
    Object.values(lists).forEach(list => { if(list) list.innerHTML = ''; });
    
    // Aggiorna anche i pulsanti GOL nel box cronometro
    updateScoreUI();

    state.tags.forEach(tag => {
        // ESCLUDI I TAG GOL DALLA LISTA GENERALE (Ora sono nel box cronometro)
        if (tag.name.toUpperCase() === 'GOL') return;

        const btn = document.createElement('button');
        btn.className = 'live-tag-btn';
        
        // APPLICAZIONE COLORE FORZATA - Usa background per sovrascrivere il gradiente di default dei button
        const tagCol = tag.color || (tag.phase === 'offensiva' ? '#27ae60' : '#3498db');
        btn.style.background = tagCol;
        btn.style.backgroundColor = tagCol; 
        
        btn.style.color = 'white';
        btn.style.borderColor = 'rgba(0,0,0,0.2)';
        
        // MANCAVANO QUESTE RIGHE
        btn.textContent = tag.name;
        btn.onclick = () => createActionFromLiveTag(tag);

        let targetList = null;
        if (tag.phase === 'offensiva') targetList = lists.offensive;
        else if (tag.phase === 'difensiva') targetList = lists.defensive;
        else if (tag.team === 'A') targetList = lists.A;
        else if (tag.team === 'B') targetList = lists.B;
        
        if (targetList) targetList.appendChild(btn);
    });
}

function createActionFromLiveTag(tag) {
    const currentTime = state.liveTimer.elapsed;
    
    // Cerchiamo il tag originale nello stato per assicurarci di avere i dati più freschi (incluso il colore corretto)
    const freshTag = state.tags.find(t => t.id === tag.id) || tag;
    
    const action = {
        id: Date.now().toString(),
        tagId: freshTag.id,
        tag: freshTag,
        startTime: Math.max(0, currentTime - (freshTag.offsetBefore || 5)),
        endTime: currentTime + (freshTag.offsetAfter || 5),
        duration: (freshTag.offsetBefore || 5) + (freshTag.offsetAfter || 5),
        comment: '',
        flag: null,
        type: 'video'
    };
    
    state.liveActions.push(action);
    
    // Se è un GOL, incrementa il punteggio (se non già incrementato da handleLiveGol)
    if (freshTag.name.toUpperCase() === 'GOL' && freshTag.team && !arguments[1]) {
        state.score[freshTag.team]++;
        updateScoreUI();
    }
    
    // Salva e renderizza (Solo Live)
    saveStateToLocalStorage();
    renderLiveActions();
    
    // Feedback tattile se disponibile
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }
    
    console.log('Azione creata da Live:', action);
}

// Funzione specifica per gestire il GOL dal nuovo box cronometro
function handleLiveGol(team) {
    const golTag = state.tags.find(t => t.name.toUpperCase() === 'GOL' && t.team === team);
    if (golTag) {
        // Passiamo true come secondo argomento per dire a createActionFromLiveTag 
        // che l'incremento del punteggio lo gestiamo qui (per evitare doppi incrementi)
        createActionFromLiveTag(golTag, true);
        state.score[team]++;
        updateScoreUI();
        saveStateToLocalStorage();
    } else {
        alert("Tag 'GOL' non trovato per la squadra " + team);
    }
}

// Riduce il punteggio di 1 per la squadra specificata
function reduceLiveGol(team) {
    if (state.score[team] > 0) {
        state.score[team]--;
        
        // Opzionale: Rimuovi l'ultima azione di tipo GOL creata per questa squadra nelle azioni Live
        const golTag = state.tags.find(t => t.name.toUpperCase() === 'GOL' && t.team === team);
        if (golTag) {
            const lastGolActionIndex = [...state.liveActions].reverse().findIndex(a => a.tag.id === golTag.id);
            if (lastGolActionIndex !== -1) {
                const actualIndex = state.liveActions.length - 1 - lastGolActionIndex;
                state.liveActions.splice(actualIndex, 1);
            }
        }
        
        updateScoreUI();
        saveStateToLocalStorage();
        renderLiveActions();
        showNotification(`Gol rimosso per ${state.teamNames[team]}`, 'info');
    }
}

// Configura il tocco lungo sui pulsanti GOL
function setupLiveGolLongPress() {
    ['A', 'B'].forEach(team => {
        const btn = document.getElementById(`liveGolBtn${team}`);
        if (!btn) return;

        let pressTimer;
        const longPressDuration = 800; // ms per considerare il tocco "lungo"
        let isLongPress = false;

        // Mouse Events
        btn.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Solo tasto sinistro
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                reduceLiveGol(team);
            }, longPressDuration);
        });

        btn.addEventListener('mouseup', (e) => {
            clearTimeout(pressTimer);
            if (isLongPress) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        });

        btn.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer);
        });

        // Touch Events (per tablet/smartphone)
        btn.addEventListener('touchstart', (e) => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                reduceLiveGol(team);
            }, longPressDuration);
        }, { passive: true });

        btn.addEventListener('touchend', (e) => {
            clearTimeout(pressTimer);
            if (isLongPress) {
                if (e.cancelable) e.preventDefault();
                e.stopImmediatePropagation();
            }
        });

        // Intercetta il click normale ed evita che scatti se è stato un tocco lungo
        const originalOnClick = btn.onclick;
        btn.onclick = null; // Rimuoviamo l'onclick inline per gestirlo via listener
        
        btn.addEventListener('click', (e) => {
            if (isLongPress) {
                isLongPress = false;
                return;
            }
            handleLiveGol(team);
        });
    });
}

function updateScoreUI() {
    const scoreA = document.getElementById('scoreA');
    const scoreB = document.getElementById('scoreB');
    if (scoreA) scoreA.textContent = state.score.A;
    if (scoreB) scoreB.textContent = state.score.B;

    // Aggiorna anche i nomi/colori dei pulsanti GOL nel box
    const btnA = document.getElementById('liveGolBtnA');
    const btnB = document.getElementById('liveGolBtnB');
    if (btnA) {
        // Rimosso il nome squadra, solo "GOL"
        const tagA = state.tags.find(t => t.name.toUpperCase() === 'GOL' && t.team === 'A');
        if (tagA) btnA.style.background = tagA.color;
    }
    if (btnB) {
        // Rimosso il nome squadra, solo "GOL"
        const tagB = state.tags.find(t => t.name.toUpperCase() === 'GOL' && t.team === 'B');
        if (tagB) btnB.style.background = tagB.color;
    }
}

function resetScore() {
    if (confirm("Vuoi azzerare il punteggio?")) {
        state.score.A = 0;
        state.score.B = 0;
        updateScoreUI();
        saveStateToLocalStorage();
    }
}

// Export functions to global
window.handleLiveGol = handleLiveGol;
window.resetScore = resetScore;

function renderLiveActions() {
    const list = document.getElementById('liveActionsList');
    if (!list) return;
    
    // Mostriamo solo le ultime 10 azioni per non intasare lo smartphone
    const recent = [...state.liveActions].reverse().slice(0, 10);
    
    list.innerHTML = recent.map(a => {
        const totalSeconds = Math.floor(a.startTime);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        return `
            <div class="live-action-item" style="border-left-color: ${a.tag.color}">
                <div class="live-action-content">
                    <span class="live-action-name">${a.tag.name}</span>
                    <span class="live-action-time">${timeStr}</span>
                </div>
                <button class="live-action-delete" onclick="deleteActionFromLive('${a.id}')" title="Elimina">×</button>
            </div>
        `;
    }).join('');
}

function deleteActionFromLive(actionId) {
    if (confirm('Vuoi eliminare questa azione?')) {
        state.liveActions = state.liveActions.filter(a => a.id !== actionId);
        saveStateToLocalStorage();
        renderLiveActions();
    }
}

function clearAllActions() {
    if (confirm('ATTENZIONE: Sei sicuro di voler eliminare TUTTE le azioni registrate?\nQuesta operazione non è annullabile.')) {
        state.liveActions = [];
        state.score = { A: 0, B: 0 }; // Resetta anche il punteggio per coerenza
        
        saveStateToLocalStorage();
        renderLiveActions();
        updateScoreUI();
        
        showNotification('🗑️ Tutte le azioni sono state eliminate', 'info');
    }
}

function modifyLiveTimer(seconds) {
    state.liveTimer.elapsed = Math.max(0, state.liveTimer.elapsed + seconds);
    if (state.liveTimer.running) {
        state.liveTimer.startTime = Date.now() - (state.liveTimer.elapsed * 1000);
    }
    updateLiveTimerDisplay();
}

function updateLiveTeamColor(team, color) {
    console.log(`Aggiornamento colore team ${team} a: ${color}`);
    
    // Sincronizza i selettori colore in Analisi Video e Live Tagging
    const pickers = document.querySelectorAll(`#teamColorPicker${team}, .live-team-color[data-team="${team}"]`);
    pickers.forEach(p => {
        if (p.value !== color) p.value = color;
    });

    // Aggiorna il colore nello stato per tutti i tag di quella squadra
    state.tags.forEach(tag => {
        if (tag.team === team) {
            tag.color = color;
        }
    });

    // Salva e renderizza ovunque
    saveTagsToLocalStorage();
    renderTags();
    renderLiveTags();
    
    // Aggiorna anche le azioni esistenti per coerenza visiva
    state.analysisActions.forEach(action => {
        if (action.tag && action.tag.team === team) {
            action.tag.color = color;
        }
    });
    state.liveActions.forEach(action => {
        if (action.tag && action.tag.team === team) {
            action.tag.color = color;
        }
    });
    renderActions();
    renderLiveActions();
    
    // Forza il valore del picker nel caso sia stato chiamato via codice
    document.querySelectorAll(`.live-team-color[data-team="${team}"]`).forEach(input => {
        input.value = color;
    });
}

function updateLivePhaseColor(phase, color) {
    console.log(`Aggiornamento colore fase ${phase} a: ${color}`);
    // Aggiorna il colore nello stato per tutti i tag di quella fase (attacco/difesa)
    state.tags.forEach(tag => {
        if (tag.phase === phase) {
            tag.color = color;
        }
    });

    // Salva e renderizza
    saveTagsToLocalStorage();
    renderTags();
    renderLiveTags();

    // Aggiorna azioni esistenti
    state.analysisActions.forEach(action => {
        if (action.tag && action.tag.phase === phase) {
            action.tag.color = color;
        }
    });
    state.liveActions.forEach(action => {
        if (action.tag && action.tag.phase === phase) {
            action.tag.color = color;
        }
    });
    renderActions();
    renderLiveActions();
    
    // Forza il valore del picker
    document.querySelectorAll(`.live-phase-color[data-phase="${phase}"]`).forEach(input => {
        input.value = color;
    });
}

// Fine del file
