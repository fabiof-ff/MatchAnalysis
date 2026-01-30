// Match Analysis App - JavaScript

// State Management
const state = {
    currentVideo: null,
    videoFiles: [],
    tags: [],
    actions: [],
    selectedTag: null,
    markedStart: null,
    markedEnd: null,
    selectedActions: new Set()
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
    // IMPORTANTE: setupActionsListeners DOPO il rendering
    setupActionsListeners();
    console.log('App inizializzata - Tags:', state.tags.length);
});

// Default Tags
function initializeDefaultTags() {
    const defaultTags = [
        { id: 'goal', name: 'Goal', color: '#27ae60', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 0 },
        { id: 'assist', name: 'Assist', color: '#3498db', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 1 },
        { id: 'fallo', name: 'Fallo', color: '#e74c3c', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 2 },
        { id: 'corner', name: 'Corner', color: '#f39c12', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 3 },
        { id: 'tiro', name: 'Tiro', color: '#9b59b6', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 4 },
        { id: 'parata', name: 'Parata', color: '#1abc9c', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 5 },
        { id: 'cartellino', name: 'Cartellino', color: '#e67e22', offsetBefore: 5, offsetAfter: 5, isDefault: true, order: 6 }
    ];
    
    console.log('initializeDefaultTags - state.tags.length PRIMA:', state.tags.length);
    
    // Prova a caricare i tag salvati
    const saved = localStorage.getItem('matchAnalysisTags');
    if (saved) {
        try {
            const loadedTags = JSON.parse(saved);
            if (loadedTags && Array.isArray(loadedTags) && loadedTags.length > 0) {
                state.tags = loadedTags;
                console.log('Tag caricati da localStorage:', state.tags.length, state.tags);
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
    
    // Assicurati che tutti i default esistano
    defaultTags.forEach(defaultTag => {
        const exists = state.tags.find(t => t.id === defaultTag.id);
        if (!exists) {
            console.log('Aggiunto tag default mancante:', defaultTag.name);
            state.tags.push(defaultTag);
        }
    });
    
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
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const exportFFmpegBtn = document.getElementById('exportFFmpegBtn');
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    const importJSONInput = document.getElementById('importJSONInput');
    
    console.log('Elementi trovati:', {
        deleteSelectedBtn: !!deleteSelectedBtn,
        exportFFmpegBtn: !!exportFFmpegBtn,
        exportJSONBtn: !!exportJSONBtn,
        importJSONInput: !!importJSONInput
    });
    
    if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', deleteSelectedActions);
    if (exportFFmpegBtn) exportFFmpegBtn.addEventListener('click', exportActionsToFFmpeg);
    if (exportJSONBtn) exportJSONBtn.addEventListener('click', exportActionsToJSON);
    if (importJSONInput) {
        importJSONInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importActionsFromJSON(e.target.files[0]);
            }
        });
    }
    
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
}

function updateDuration() {
    const videoPlayer = document.getElementById('videoPlayer');
    document.getElementById('duration').textContent = formatTime(videoPlayer.duration);
}

// Tag Management
function addNewTag() {
    const nameInput = document.getElementById('newTagName');
    const colorInput = document.getElementById('tagColor');
    
    const name = nameInput.value.trim();
    if (!name) {
        alert('Inserisci un nome per il tag');
        return;
    }
    
    const newTag = {
        id: 'tag_' + Date.now(),
        name: name,
        color: colorInput.value,
        offsetBefore: 5,
        offsetAfter: 5,
        isDefault: false,
        order: state.tags.length
    };
    
    state.tags.push(newTag);
    nameInput.value = '';
    
    renderTags();
    saveTagsToLocalStorage();
}

function renderTags() {
    const tagList = document.getElementById('tagList');
    console.log('===== renderTags CHIAMATA =====');
    console.log('Tags disponibili:', state.tags.length);
    console.log('Tags:', state.tags);
    console.log('Elemento tagList:', tagList);
    
    if (!tagList) {
        console.error('ERRORE: Elemento tagList non trovato nel DOM!');
        return;
    }
    
    tagList.innerHTML = '';
    console.log('tagList innerHTML pulito');
    
    if (state.tags.length === 0) {
        console.error('ERRORE: Nessun tag da renderizzare!');
        return;
    }
    
    console.log('Inizio loop forEach per renderizzare', state.tags.length, 'tag');
    
    state.tags.forEach((tag, index) => {
        console.log('Renderizzando tag', index, ':', tag.name);
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        tagItem.draggable = true;
        tagItem.dataset.tagId = tag.id;
        
        if (state.selectedTag && state.selectedTag.id === tag.id) {
            tagItem.classList.add('selected');
        }
        tagItem.style.backgroundColor = tag.color;
        
        const deleteBtn = tag.isDefault ? '' : `<button class="delete-tag" onclick="deleteTag('${tag.id}')">×</button>`;
        
        tagItem.innerHTML = `
            <div class="tag-header">
                <span class="tag-name">${tag.name}</span>
                ${deleteBtn}
            </div>
            <div class="tag-offset">
                <label>-<input type="number" class="offset-input" value="${tag.offsetBefore}" min="0" max="30" data-tag-id="${tag.id}" data-type="before"> sec</label>
                <label>+<input type="number" class="offset-input" value="${tag.offsetAfter}" min="0" max="30" data-tag-id="${tag.id}" data-type="after"> sec</label>
            </div>
        `;
        
        // Click per creare azione
        tagItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-tag') && !e.target.classList.contains('offset-input')) {
                createActionFromTag(tag);
            }
        });
        
        // Drag and drop
        tagItem.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            tagItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', tag.id);
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
                const midpoint = rect.left + rect.width / 2;
                if (e.clientX < midpoint) {
                    tagList.insertBefore(draggingItem, tagItem);
                } else {
                    tagList.insertBefore(draggingItem, tagItem.nextSibling);
                }
            }
        });
        
        tagItem.addEventListener('drop', (e) => {
            e.preventDefault();
            reorderTags();
        });
        
        // Listener per gli input di offset
        const offsetInputs = tagItem.querySelectorAll('.offset-input');
        offsetInputs.forEach(input => {
            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('change', (e) => {
                updateTagOffset(e.target.dataset.tagId, e.target.dataset.type, parseInt(e.target.value));
            });
        });
        
        tagList.appendChild(tagItem);
        console.log('Tag', tag.name, 'aggiunto al DOM');
    });
    
    console.log('===== renderTags COMPLETATA - Tag nel DOM:', tagList.children.length, '=====');
}

function reorderTags() {
    const tagList = document.getElementById('tagList');
    const tagItems = Array.from(tagList.querySelectorAll('.tag-item'));
    const newOrder = tagItems.map(item => item.dataset.tagId);
    
    state.tags.sort((a, b) => {
        return newOrder.indexOf(a.id) - newOrder.indexOf(b.id);
    });
    
    // Aggiorna order
    state.tags.forEach((tag, index) => {
        tag.order = index;
    });
    
    saveTagsToLocalStorage();
    console.log('Tag riordinati:', state.tags.map(t => t.name));
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
    
    state.actions.push(action);
    state.selectedTag = tag;
    
    renderActions();
    renderTags();
    saveStateToLocalStorage();
    
    showNotification(`✅ Azione "${tag.name}" creata: ${formatTime(startTime)} - ${formatTime(endTime)}`, 'success');
    console.log('Azione creata:', action);
}

function deleteTag(tagId) {
    const tag = state.tags.find(t => t.id === tagId);
    if (tag && tag.isDefault) {
        alert('Non puoi eliminare i tag di default');
        return;
    }
    
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
    
    state.actions.push(action);
    
    // Reset markers
    state.markedStart = null;
    state.markedEnd = null;
    updateSelectedRange();
    
    renderActions();
    saveStateToLocalStorage();
    
    console.log('Azione creata:', action);
}

// Actions Rendering
function renderActions() {
    const actionsList = document.getElementById('actionsList');
    actionsList.innerHTML = '';
    
    if (state.actions.length === 0) {
        actionsList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">Nessuna azione taggata</p>';
        return;
    }
    
    // Sort actions by start time
    const sortedActions = [...state.actions].sort((a, b) => a.startTime - b.startTime);
    
    sortedActions.forEach(action => {
        const actionItem = document.createElement('div');
        actionItem.className = 'action-item';
        if (state.selectedActions.has(action.id)) {
            actionItem.classList.add('selected-action');
        }
        actionItem.style.borderLeftColor = action.tag.color;
        
        actionItem.innerHTML = `
            <input type="checkbox" class="action-checkbox" 
                   ${state.selectedActions.has(action.id) ? 'checked' : ''}
                   onchange="toggleActionSelection('${action.id}')">
            <div class="action-info">
                <div class="action-tag" style="color: ${action.tag.color}">${action.tag.name}</div>
                <div class="action-time">${formatTime(action.startTime)} - ${formatTime(action.endTime)}</div>
                <div class="action-duration-input">
                    <span>Inizio:</span>
                    <input type="number" step="0.1" value="${action.startTime.toFixed(1)}" 
                           onchange="updateActionTime('${action.id}', 'start', this.value)">
                    <span>Fine:</span>
                    <input type="number" step="0.1" value="${action.endTime.toFixed(1)}" 
                           onchange="updateActionTime('${action.id}', 'end', this.value)">
                </div>
                <div class="action-comment-input">
                    <textarea placeholder="Aggiungi un commento per questa clip..." 
                              onchange="updateActionComment('${action.id}', this.value)">${action.comment || ''}</textarea>
                </div>
            </div>
            <div class="action-controls-btns">
                <button class="btn-play" onclick="playAction('${action.id}')">▶</button>
                <button class="btn-delete" onclick="deleteAction('${action.id}')">×</button>
            </div>
        `;
        
        actionsList.appendChild(actionItem);
    });
}

function toggleActionSelection(actionId) {
    if (state.selectedActions.has(actionId)) {
        state.selectedActions.delete(actionId);
    } else {
        state.selectedActions.add(actionId);
    }
    renderActions();
}

function updateActionTime(actionId, type, value) {
    const action = state.actions.find(a => a.id === actionId);
    if (!action) return;
    
    const time = parseFloat(value);
    if (isNaN(time)) return;
    
    if (type === 'start') {
        action.startTime = time;
    } else if (type === 'end') {
        action.endTime = time;
    }
    
    action.duration = action.endTime - action.startTime;
    
    renderActions();
    saveStateToLocalStorage();
}

function updateActionComment(actionId, comment) {
    const action = state.actions.find(a => a.id === actionId);
    if (!action) return;
    
    action.comment = comment;
    saveStateToLocalStorage();
}

function playAction(actionId) {
    const action = state.actions.find(a => a.id === actionId);
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

function deleteAction(actionId) {
    if (confirm('Sei sicuro di voler eliminare questa azione?')) {
        state.actions = state.actions.filter(a => a.id !== actionId);
        state.selectedActions.delete(actionId);
        renderActions();
        saveStateToLocalStorage();
    }
}

function deleteSelectedActions() {
    if (state.selectedActions.size === 0) {
        alert('Seleziona almeno un\'azione da eliminare');
        return;
    }
    
    if (confirm(`Sei sicuro di voler eliminare ${state.selectedActions.size} azione/i?`)) {
        state.actions = state.actions.filter(a => !state.selectedActions.has(a.id));
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
    
    const selectedActionsList = state.actions
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
    
    const selectedActionsList = state.actions
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
function saveStateToLocalStorage() {
    try {
        const saveData = {
            tags: state.tags,
            actions: state.actions
        };
        localStorage.setItem('matchAnalysisState', JSON.stringify(saveData));
    } catch (e) {
        console.error('Errore nel salvataggio:', e);
    }
}

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
        const saved = localStorage.getItem('matchAnalysisActions');
        if (saved) {
            state.actions = JSON.parse(saved);
            console.log('Azioni caricate:', state.actions.length);
        }
    } catch (e) {
        console.error('Errore nel caricamento azioni:', e);
    }
}

function saveStateToLocalStorage() {
    saveTagsToLocalStorage();
    try {
        localStorage.setItem('matchAnalysisActions', JSON.stringify(state.actions));
    } catch (e) {
        console.error('Errore nel salvataggio azioni:', e);
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
            console.log('Stato caricato da localStorage - Tags custom:', state.tags.length);
        }
    } catch (e) {
        console.error('Errore nel caricamento:', e);
    }
}

// Export functions to global scope for inline event handlers
window.deleteTag = deleteTag;
window.toggleActionSelection = toggleActionSelection;
window.updateActionTime = updateActionTime;
window.updateActionComment = updateActionComment;
window.playAction = playAction;
window.deleteAction = deleteAction;

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
