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
    initializeDefaultTags();
    setupTabs();
    setupEventListeners();
    setupActionsListeners();
    loadStateFromLocalStorage();
    renderTags();
    renderActions();
});

// Default Tags
function initializeDefaultTags() {
    const defaultTags = [
        { id: 'goal', name: 'Goal', color: '#27ae60' },
        { id: 'assist', name: 'Assist', color: '#3498db' },
        { id: 'fallo', name: 'Fallo', color: '#e74c3c' },
        { id: 'corner', name: 'Corner', color: '#f39c12' },
        { id: 'tiro', name: 'Tiro', color: '#9b59b6' },
        { id: 'parata', name: 'Parata', color: '#1abc9c' },
        { id: 'cartellino', name: 'Cartellino', color: '#e67e22' }
    ];
    
    if (state.tags.length === 0) {
        state.tags = defaultTags;
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Video Loading
    const loadVideoBtn = document.getElementById('loadVideoBtn');
    const videoInput = document.getElementById('videoInput');
    if (loadVideoBtn) loadVideoBtn.addEventListener('click', loadVideo);
    if (videoInput) videoInput.addEventListener('change', handleVideoFileSelect);
    
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
    
    // Action Marking
    const markStartBtn = document.getElementById('markStartBtn');
    const markEndBtn = document.getElementById('markEndBtn');
    if (markStartBtn) markStartBtn.addEventListener('click', markStart);
    if (markEndBtn) markEndBtn.addEventListener('click', markEnd);
    
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
    // Actions Management - chiamata dopo che il template è stato inserito
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const exportFFmpegBtn = document.getElementById('exportFFmpegBtn');
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    const importJSONInput = document.getElementById('importJSONInput');
    
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
function handleVideoFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        state.videoFiles = files;
    }
}

function loadVideo() {
    if (state.videoFiles.length === 0) {
        alert('Seleziona prima un file video');
        return;
    }
    
    const videoPlayer = document.getElementById('videoPlayer');
    const file = state.videoFiles[0];
    const url = URL.createObjectURL(file);
    
    videoPlayer.src = url;
    state.currentVideo = {
        name: file.name,
        url: url,
        file: file
    };
    
    videoPlayer.load();
    console.log('Video caricato:', file.name);
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
        color: colorInput.value
    };
    
    state.tags.push(newTag);
    nameInput.value = '';
    
    renderTags();
    saveStateToLocalStorage();
}

function renderTags() {
    const tagList = document.getElementById('tagList');
    tagList.innerHTML = '';
    
    state.tags.forEach(tag => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        if (state.selectedTag && state.selectedTag.id === tag.id) {
            tagItem.classList.add('selected');
        }
        tagItem.style.backgroundColor = tag.color;
        
        tagItem.innerHTML = `
            <span>${tag.name}</span>
            <button class="delete-tag" onclick="deleteTag('${tag.id}')">×</button>
        `;
        
        tagItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-tag')) {
                selectTag(tag);
            }
        });
        
        tagList.appendChild(tagItem);
    });
}

function selectTag(tag) {
    state.selectedTag = tag;
    renderTags();
}

function deleteTag(tagId) {
    if (confirm('Sei sicuro di voler eliminare questo tag?')) {
        state.tags = state.tags.filter(t => t.id !== tagId);
        if (state.selectedTag && state.selectedTag.id === tagId) {
            state.selectedTag = null;
        }
        renderTags();
        saveStateToLocalStorage();
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
    
    // Generate highlight button
    document.getElementById('generateHighlightBtn').addEventListener('click', generateHighlight);
    
    // Execute merge button
    document.getElementById('executeMergeBtn').addEventListener('click', executeMerge);
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

function loadStateFromLocalStorage() {
    try {
        const saved = localStorage.getItem('matchAnalysisState');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.tags) state.tags = data.tags;
            if (data.actions) state.actions = data.actions;
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
