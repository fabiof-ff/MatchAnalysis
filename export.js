// Export Actions and Generate FFmpeg Script

// Variable to store the directory handle
let videoDirectoryHandle = null;

// Funzione per impostare la directory dall'esterno
function setVideoDirectoryHandle(dirHandle) {
    videoDirectoryHandle = dirHandle;
    console.log('Directory handle impostata:', dirHandle.name);
}

// Helper function to save files with dialog
async function saveFileInVideoFolder(content, defaultFileName, description) {
    try {
        // Verifica se il browser supporta la File System Access API
        if ('showSaveFilePicker' in window) {
            const options = {
                suggestedName: defaultFileName,
                types: [{
                    description: description,
                    accept: {
                        'text/plain': ['.bat', '.ps1'],
                        'application/json': ['.json']
                    }
                }]
            };
            
            // Se abbiamo già una directory salvata, prova a usarla come punto di partenza
            if (videoDirectoryHandle) {
                try {
                    // Verifica che abbiamo ancora i permessi
                    const permission = await videoDirectoryHandle.queryPermission({ mode: 'readwrite' });
                    if (permission === 'granted') {
                        // Crea il file direttamente nella directory del video
                        const fileHandle = await videoDirectoryHandle.getFileHandle(defaultFileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(content);
                        await writable.close();
                        showNotification(`✅ File salvato in: ${videoDirectoryHandle.name}\\${defaultFileName}`, 'success');
                        return true;
                    }
                } catch (e) {
                    console.log('Directory handle non più valida, chiedo nuova directory');
                    videoDirectoryHandle = null;
                }
            }
            
            // Se non abbiamo una directory o i permessi sono scaduti, chiedi all'utente
            if (!videoDirectoryHandle) {
                // Chiedi la directory
                showNotification('📁 Seleziona la cartella dove salvare i file (es. cartella del video)', 'info');
                
                videoDirectoryHandle = await window.showDirectoryPicker({
                    mode: 'readwrite'
                });
                
                // Salva il file nella directory selezionata
                const fileHandle = await videoDirectoryHandle.getFileHandle(defaultFileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                showNotification(`✅ File salvato in: ${videoDirectoryHandle.name}\\${defaultFileName}`, 'success');
                return true;
            }
            
            // Fallback: usa il dialogo normale
            const handle = await window.showSaveFilePicker(options);
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            return true;
        } else {
            // Fallback: download normale
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultFileName;
            a.click();
            URL.revokeObjectURL(url);
            showNotification(`✅ File scaricato: ${defaultFileName}`, 'info');
            return true;
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Errore salvataggio file:', err);
            // Fallback in caso di errore
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultFileName;
            a.click();
            URL.revokeObjectURL(url);
            showNotification(`✅ File scaricato: ${defaultFileName}`, 'info');
        }
        return false;
    }
}

// State for merge videos
const mergeState = {
    videosToMerge: []
};

function selectMergeVideos(files) {
    mergeState.videosToMerge = Array.from(files);
    renderMergeVideosList();
    showNotification(`✅ ${files.length} video selezionati per il merge`, 'success');
}

function renderMergeVideosList() {
    const list = document.getElementById('mergeVideosList');
    if (mergeState.videosToMerge.length === 0) {
        list.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">Nessun video selezionato</p>';
        return;
    }
    
    list.innerHTML = `
        <p style="color: #2ecc71; font-weight: 600; margin-bottom: 10px;">
            📹 ${mergeState.videosToMerge.length} video pronti per il merge:
        </p>
        <ol style="padding-left: 20px; color: #34495e;">
            ${mergeState.videosToMerge.map((v, i) => `
                <li style="margin: 5px 0;">
                    <strong>${v.name}</strong> 
                    <button onclick="removeMergeVideo(${i})" style="background: #e74c3c; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; margin-left: 10px;">✖ Rimuovi</button>
                </li>
            `).join('')}
        </ol>
    `;
}

function removeMergeVideo(index) {
    mergeState.videosToMerge.splice(index, 1);
    renderMergeVideosList();
}

// State for compress video
const compressState = {
    videoToCompress: null
};

function selectCompressVideo(file) {
    compressState.videoToCompress = file;
    renderCompressVideoInfo();
    showNotification(`✅ Video selezionato: ${file.name}`, 'success');
}

function renderCompressVideoInfo() {
    const info = document.getElementById('compressVideoInfo');
    if (!compressState.videoToCompress) {
        info.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">Nessun video selezionato</p>';
        return;
    }
    
    const sizeMB = (compressState.videoToCompress.size / (1024 * 1024)).toFixed(2);
    
    // Calculate estimated size based on quality and resolution
    const quality = document.getElementById('compressionQuality').value;
    const resolution = document.getElementById('compressionResolution').value;
    
    // Compression factors (approximate)
    const qualityFactors = {
        'high': 0.6,    // 60% of original
        'medium': 0.4,  // 40% of original
        'low': 0.25     // 25% of original
    };
    
    const resolutionFactors = {
        'original': 1,
        '1080': 0.7,
        '720': 0.5,
        '480': 0.3
    };
    
    const compressionFactor = qualityFactors[quality] * resolutionFactors[resolution];
    const estimatedSizeMB = (sizeMB * compressionFactor).toFixed(2);
    const reductionPercent = ((1 - compressionFactor) * 100).toFixed(0);
    
    info.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60;">
                <p style="color: #7f8c8d; font-size: 0.85em; margin-bottom: 5px;">DIMENSIONE ORIGINALE</p>
                <p style="color: #2c3e50; font-weight: 700; font-size: 1.3em;">${sizeMB} MB</p>
                <p style="color: #7f8c8d; font-size: 0.85em; margin-top: 5px;">📹 ${compressState.videoToCompress.name}</p>
            </div>
            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #f39c12;">
                <p style="color: #7f8c8d; font-size: 0.85em; margin-bottom: 5px;">DIMENSIONE STIMATA</p>
                <p style="color: #f39c12; font-weight: 700; font-size: 1.3em;">~${estimatedSizeMB} MB</p>
                <p style="color: #27ae60; font-size: 0.85em; margin-top: 5px; font-weight: 600;">📉 Riduzione: ~${reductionPercent}%</p>
            </div>
        </div>
        <p style="color: #95a5a6; font-size: 0.8em; margin-top: 10px; font-style: italic;">
            ⚠️ La dimensione finale effettiva può variare in base al contenuto del video
        </p>
    `;
}

function exportCompressScript() {
    if (!compressState.videoToCompress) {
        alert('Seleziona un video da comprimere!');
        return;
    }
    
    const quality = document.getElementById('compressionQuality').value;
    const resolution = document.getElementById('compressionResolution').value;
    const videoName = compressState.videoToCompress.name;
    const nameWithoutExt = videoName.substring(0, videoName.lastIndexOf('.')) || videoName;
    
    // CRF values
    const crfValues = {
        'high': 20,
        'medium': 23,
        'low': 28
    };
    
    const crf = crfValues[quality];
    
    // Resolution scaling
    let scaleFilter = '';
    if (resolution !== 'original') {
        scaleFilter = ` -vf scale=-1:${resolution}`;
    }
    
    let ffmpegScript = `@echo off
REM Script di Compressione Video - Match Analysis
REM Video: ${videoName}

echo ========================================
echo   Match Analysis - Compressione Video
echo ========================================
echo.
echo Questo script richiede FFmpeg installato sul PC
echo Download: https://ffmpeg.org/download.html
echo.
echo Video: ${videoName}
echo Qualità: ${quality.toUpperCase()} (CRF ${crf})
echo Risoluzione: ${resolution === 'original' ? 'Originale' : resolution + 'p'}
echo.

set INPUT_VIDEO=${videoName}
set OUTPUT_VIDEO=${nameWithoutExt}_compressed.mp4

echo Compressione in corso...
echo Questo potrebbe richiedere diversi minuti.
echo.

`;
    
    // FFmpeg command
    ffmpegScript += `ffmpeg -i "%INPUT_VIDEO%"${scaleFilter} -c:v libx264 -crf ${crf} -preset medium -c:a aac -b:a 128k "%OUTPUT_VIDEO%"
`;
    ffmpegScript += `if errorlevel 1 goto error\n\n`;
    
    // Success
    ffmpegScript += `echo.
echo ========================================
echo   Video compresso con successo!
echo ========================================
echo.
echo File originale: %INPUT_VIDEO%
echo File compresso: %OUTPUT_VIDEO%
echo.

for %%A in ("%INPUT_VIDEO%") do set SIZE_BEFORE=%%~zA
for %%A in ("%OUTPUT_VIDEO%") do set SIZE_AFTER=%%~zA

echo Dimensione prima: %SIZE_BEFORE% bytes
echo Dimensione dopo: %SIZE_AFTER% bytes
echo.

explorer /select,"%OUTPUT_VIDEO%"
goto end

:error
echo.
echo ERRORE: Si e' verificato un problema.
echo Verifica che:
echo - FFmpeg sia installato e nel PATH
echo - Il video sia nella stessa cartella dello script
echo - Il nome del file sia corretto
echo.
pause
goto end

:end
pause
`;
    
    // Download as .bat file
    const blob = new Blob([ffmpegScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compress_video_${Date.now()}.bat`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification(`✅ Script compressione scaricato! Metti lo script nella cartella del video ed eseguilo.`, 'success');
}

function exportMergeScript() {
    if (mergeState.videosToMerge.length < 2) {
        alert('Seleziona almeno 2 video da unire!');
        return;
    }
    
    const videoNames = mergeState.videosToMerge.map(v => v.name);
    
    let ffmpegScript = `@echo off
REM Script di Merge Video - Match Analysis
REM Unione di ${videoNames.length} file video

echo ========================================
echo   Match Analysis - Merge Video
echo ========================================
echo.
echo Questo script richiede FFmpeg installato sul PC
echo Download: https://ffmpeg.org/download.html
echo.
echo Unione di ${videoNames.length} video...
echo.

set OUTPUT_VIDEO=merged_video_%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%.mp4

`;

    // Create concat file
    ffmpegScript += `echo Creazione lista concatenazione...\n`;
    ffmpegScript += `(\n`;
    videoNames.forEach((name) => {
        ffmpegScript += `echo file '${name}'\n`;
    });
    ffmpegScript += `) > merge_list.txt\n\n`;
    
    // Merge videos
    ffmpegScript += `echo Unione dei video in corso...\necho.\n`;
    ffmpegScript += `ffmpeg -f concat -safe 0 -i merge_list.txt -c copy "%OUTPUT_VIDEO%"\n`;
    ffmpegScript += `if errorlevel 1 goto error\n\n`;
    
    // Cleanup
    ffmpegScript += `echo.\necho Pulizia file temporanei...\n`;
    ffmpegScript += `del merge_list.txt\n\n`;
    
    // Success
    ffmpegScript += `echo.\necho ========================================\necho   Video unito con successo!\necho ========================================\necho.\necho File: %OUTPUT_VIDEO%\necho.\necho Video uniti:\n`;
    videoNames.forEach((name, i) => {
        ffmpegScript += `echo   ${i + 1}. ${name}\n`;
    });
    ffmpegScript += `echo.\nexplorer /select,"%OUTPUT_VIDEO%"\ngoto end\n\n`;
    
    // Error handling
    ffmpegScript += `:error\necho.\necho ERRORE: Si e' verificato un problema.\necho Verifica che:\necho - FFmpeg sia installato e nel PATH\necho - Tutti i video siano nella stessa cartella dello script\necho - I nomi dei file siano corretti\necho.\npause\ngoto end\n\n:end\npause\n`;
    
    // Download as .bat file
    const blob = new Blob([ffmpegScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merge_videos_${Date.now()}.bat`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification(`✅ Script merge scaricato! Metti lo script nella cartella con i ${videoNames.length} video ed eseguilo.`, 'success');
}

async function exportActionsToFFmpeg() {
    if (state.selectedActions.size === 0) {
        alert('Seleziona almeno un\'azione da esportare');
        return;
    }
    
    // Ordina le azioni selezionate in base alla modalità corrente
    let selectedActionsList;
    switch (state.sortMode) {
        case 'custom':
            // Usa l'ordinamento personalizzato
            if (state.customOrder && state.customOrder.length > 0) {
                selectedActionsList = state.customOrder
                    .map(id => state.actions.find(a => a.id === id))
                    .filter(a => a && state.selectedActions.has(a.id));
            } else {
                // Fallback a ordinamento per tempo
                selectedActionsList = state.actions
                    .filter(a => state.selectedActions.has(a.id))
                    .sort((a, b) => a.startTime - b.startTime);
            }
            break;
            
        case 'tag':
            // Raggruppa per tag, poi ordina per tempo dentro ogni gruppo
            selectedActionsList = state.actions
                .filter(a => state.selectedActions.has(a.id))
                .sort((a, b) => {
                    const tagCompare = a.tag.name.localeCompare(b.tag.name);
                    if (tagCompare !== 0) return tagCompare;
                    return a.startTime - b.startTime;
                });
            break;
            
        case 'time':
        default:
            // Ordinamento predefinito per tempo
            selectedActionsList = state.actions
                .filter(a => state.selectedActions.has(a.id))
                .sort((a, b) => a.startTime - b.startTime);
            break;
    }
    
    // Generate FFmpeg commands
    const videoFileName = state.currentVideo ? state.currentVideo.name : 'VIDEO_NON_TROVATO.mp4';
    
    let ffmpegScript = `@echo off
REM Script generato da Match Analysis
REM Video di sintesi con ${selectedActionsList.length} clip

echo ========================================
echo   Match Analysis - Creazione Highlight
echo ========================================
echo.
echo Questo script richiede FFmpeg installato sul PC
echo Download: https://ffmpeg.org/download.html
echo.

set INPUT_VIDEO=${videoFileName}
set OUTPUT_VIDEO=highlight_%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%.mp4

REM Verifica che il file video esista
if not exist "%INPUT_VIDEO%" (
    echo.
    echo ERRORE: File video non trovato!
    echo.
    echo Cercato: %INPUT_VIDEO%
    echo Cartella corrente: %CD%
    echo.
    echo IMPORTANTE: Questo script deve essere nella STESSA CARTELLA del video!
    echo Copia il file video qui oppure sposta questo script nella cartella del video.
    echo.
    pause
    exit /b 1
)

echo File input: %INPUT_VIDEO%
echo Estrazione di ${selectedActionsList.length} clip...
echo.

`;

    // Extract each segment
    selectedActionsList.forEach((action, i) => {
        ffmpegScript += `echo [${i+1}/${selectedActionsList.length}] Estrazione: ${action.tag.name} (${formatTime(action.startTime)} - ${formatTime(action.endTime)})\n`;
        if (action.comment && action.comment.trim()) {
            ffmpegScript += `echo    Commento: ${action.comment.replace(/["|']/g, '')}\n`;
        }
        
        // Escape special characters for drawtext filter
        const commentText = action.comment && action.comment.trim() 
            ? action.comment.replace(/[:\\]/g, '\\$&').replace(/'/g, '').replace(/"/g, '') 
            : '';
        
        if (commentText) {
            // Extract with text overlay
            ffmpegScript += `ffmpeg -ss ${action.startTime.toFixed(3)} -i "%INPUT_VIDEO%" -t ${action.duration.toFixed(3)} -vf "drawtext=text='${commentText}':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.7:boxborderw=10:x=(w-text_w)/2:y=h-th-30" -c:v libx264 -preset fast -crf 23 -c:a copy segment_${i}.mp4\n`;
        } else {
            // Extract without overlay (copy codec for speed)
            ffmpegScript += `ffmpeg -ss ${action.startTime.toFixed(3)} -i "%INPUT_VIDEO%" -t ${action.duration.toFixed(3)} -c copy -avoid_negative_ts 1 segment_${i}.mp4\n`;
        }
        ffmpegScript += `if errorlevel 1 goto error\n\n`;
    });
    
    // Create concat file
    ffmpegScript += `echo.\necho Creazione lista concatenazione...\n`;
    ffmpegScript += `(\n`;
    selectedActionsList.forEach((_, i) => {
        ffmpegScript += `echo file 'segment_${i}.mp4'\n`;
    });
    ffmpegScript += `) > concat_list.txt\n\n`;
    
    // Concatenate
    ffmpegScript += `echo Unione dei ${selectedActionsList.length} clip...\necho.\n`;
    ffmpegScript += `ffmpeg -f concat -safe 0 -i concat_list.txt -c copy "%OUTPUT_VIDEO%"\n`;
    ffmpegScript += `if errorlevel 1 goto error\n\n`;
    
    // Cleanup
    ffmpegScript += `echo.\necho Pulizia file temporanei...\n`;
    selectedActionsList.forEach((_, i) => {
        ffmpegScript += `del segment_${i}.mp4\n`;
    });
    ffmpegScript += `del concat_list.txt\n\n`;
    
    // Success
    ffmpegScript += `echo.\necho ========================================\necho   Video creato con successo!\necho ========================================\necho.\necho File: %OUTPUT_VIDEO%\necho.\n`;
    ffmpegScript += `echo Clip incluse:\n`;
    selectedActionsList.forEach((action, i) => {
        ffmpegScript += `echo   ${i+1}. ${action.tag.name} (${formatTime(action.startTime)} - ${formatTime(action.endTime)})`;
        if (action.comment && action.comment.trim()) {
            ffmpegScript += ` - ${action.comment.replace(/["|']/g, '')}`;
        }
        ffmpegScript += `\n`;
    });
    ffmpegScript += `echo.\n`;
    ffmpegScript += `explorer /select,"%OUTPUT_VIDEO%"\ngoto end\n\n`;
    
    // Error handling
    ffmpegScript += `:error\necho.\necho ERRORE: Si e' verificato un problema.\necho Verifica che FFmpeg sia installato e nel PATH.\necho.\npause\ngoto end\n\n:end\npause\n`;
    
    // Salva il file batch
    const fileName = `create_highlight_${Date.now()}.bat`;
    await saveFileInVideoFolder(ffmpegScript, fileName, 'Script FFmpeg');
    
    // Crea anche uno script PowerShell per eseguirlo senza problemi di sicurezza
    const psScript = `# Script di esecuzione per ${fileName}
# Questo script sblocca e avvia il file batch

Write-Host "Sblocco e avvio creazione highlight..." -ForegroundColor Green
$scriptPath = Join-Path $PSScriptRoot "${fileName}"

# Sblocca il file per rimuovere la protezione di Windows
Unblock-File -Path $scriptPath -ErrorAction SilentlyContinue

# Esegui il batch file
Start-Process -FilePath $scriptPath -WorkingDirectory $PSScriptRoot -Wait

Write-Host "Operazione completata!" -ForegroundColor Green
`;
    
    const psFileName = `RUN_${fileName.replace('.bat', '.ps1')}`;
    await saveFileInVideoFolder(psScript, psFileName, 'Script PowerShell');
    
    // Mostra notifica con istruzioni chiare
    showNotification(
        `✅ Script creati con successo!\n\n` +
        `📂 Cartella: ${videoDirectoryHandle ? videoDirectoryHandle.name : 'Downloads'}\n\n` +
        `▶️ PER CREARE L'HIGHLIGHT:\n` +
        `1. Vai nella cartella del video\n` +
        `2. Clicca col tasto destro su "${psFileName}"\n` +
        `3. Seleziona "Esegui con PowerShell"\n\n` +
        `⚠️ Se non funziona, apri PowerShell nella cartella ed esegui:\n` +
        `.\\${psFileName}`,
        'success',
        10000  // Mostra per 10 secondi
    );
}

async function exportActionsToJSON() {
    const data = {
        exportDate: new Date().toISOString(),
        videoName: state.currentVideo ? state.currentVideo.name : null,
        actions: state.actions,
        tags: state.tags
    };
    
    const json = JSON.stringify(data, null, 2);
    const fileName = `match_analysis_${Date.now()}.json`;
    await saveFileInVideoFolder(json, fileName, 'Match Analysis JSON');
    
    // Non mostrare notifica qui, la mostra già saveFileInVideoFolder
}

function importActionsFromJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm(`Importare ${data.actions.length} azioni e ${data.tags.length} tag?\n\nQuesto sostituirà i dati attuali.`)) {
                state.actions = data.actions;
                state.tags = data.tags;
                renderActions();
                renderTags();
                saveStateToLocalStorage();
                showNotification('✅ Dati importati con successo!', 'success');
            }
        } catch (error) {
            alert('Errore nell\'importazione: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Add to window scope
window.exportActionsToFFmpeg = exportActionsToFFmpeg;
window.exportActionsToJSON = exportActionsToJSON;
window.importActionsFromJSON = importActionsFromJSON;
window.selectMergeVideos = selectMergeVideos;
window.exportMergeScript = exportMergeScript;
window.removeMergeVideo = removeMergeVideo;
window.selectCompressVideo = selectCompressVideo;
window.exportCompressScript = exportCompressScript;
