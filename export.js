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
                        'text/plain': ['.bat', '.ps1', '.txt'],
                        'application/json': ['.json']
                    }
                }]
            };
            
            // Se abbiamo già una directory salvata, prova a usarla come punto di partenza
            if (videoDirectoryHandle) {
                try {
                    // Verifica che abbiamo ancora i permessi
                    let permission = await videoDirectoryHandle.queryPermission({ mode: 'readwrite' });
                    if (permission === 'prompt') {
                        permission = await videoDirectoryHandle.requestPermission({ mode: 'readwrite' });
                    }
                    
                    if (permission === 'granted') {
                        // Crea il file direttamente nella directory del video
                        const fileHandle = await videoDirectoryHandle.getFileHandle(defaultFileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        // Rimosso BOM per compatibilità Windows (evita l'errore ´╗┐@echo)
                        const encodedContent = content; 
                        await writable.write(encodedContent);
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
                // Rimosso BOM per compatibilità Windows
                const encodedContent = content;
                await writable.write(encodedContent);
                await writable.close();
                showNotification(`✅ File salvato in: ${videoDirectoryHandle.name}\\${defaultFileName}`, 'success');
                return true;
            }
            
            // Fallback: usa il dialogo normale
            const handle = await window.showSaveFilePicker(options);
            const writable = await handle.createWritable();
            // Rimosso BOM per compatibilità Windows
            const encodedContent = content;
            await writable.write(encodedContent);
            await writable.close();
            return true;
        } else {
            // Fallback: download normale
            // Rimosso BOM per compatibilità Windows
            const encodedContent = content;
            const blob = new Blob([encodedContent], { type: 'text/plain;charset=utf-8' });
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
        <div style="display: flex; flex-direction: column; gap: 8px;">
            ${mergeState.videosToMerge.map((v, i) => `
                <div style="display: flex; align-items: center; background: #f8f9fa; padding: 8px 12px; border-radius: 6px; border-left: 4px solid #3498db;">
                    <span style="font-weight: 700; color: #95a5a6; margin-right: 12px; min-width: 20px;">${i + 1}.</span>
                    <span style="flex-grow: 1; font-weight: 500; color: #2c3e50; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${v.name}</span>
                    <div style="display: flex; gap: 5px; margin-left: 10px;">
                        <button onclick="moveMergeVideo(${i}, -1)" ${i === 0 ? 'disabled style="opacity: 0.3; cursor: default;"' : ''} 
                            style="background: #3498db; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;" title="Sposta Su">▲</button>
                        <button onclick="moveMergeVideo(${i}, 1)" ${i === mergeState.videosToMerge.length - 1 ? 'disabled style="opacity: 0.3; cursor: default;"' : ''} 
                            style="background: #3498db; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;" title="Sposta Giù">▼</button>
                        <button onclick="removeMergeVideo(${i})" 
                            style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;" title="Rimuovi">✖</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function moveMergeVideo(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= mergeState.videosToMerge.length) return;
    
    const temp = mergeState.videosToMerge[index];
    mergeState.videosToMerge[index] = mergeState.videosToMerge[newIndex];
    mergeState.videosToMerge[newIndex] = temp;
    
    renderMergeVideosList();
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

async function exportCompressScript() {
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
chcp 65001 > nul
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

set "INPUT_VIDEO=${videoName}"
set "OUTPUT_VIDEO=${nameWithoutExt}_compressed.mp4"

echo Compressione in corso...
echo Questo potrebbe richiedere diversi minuti.
echo.

`;
    
    // FFmpeg command
    ffmpegScript += `ffmpeg -i "%INPUT_VIDEO%"${scaleFilter} -c:v libx264 -crf ${crf} -preset medium -c:a aac -b:a 128k -nostdin "%OUTPUT_VIDEO%"\n`;
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

pause
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
`;
    
    // Converti tutti i \n in \r\n per compatibilità Windows Batch
    ffmpegScript = ffmpegScript.replace(/\r?\n/g, '\r\n');
    
    // Salva il file batch
    const batFileName = `compress_video_${Date.now()}.bat`;
    await saveFileInVideoFolder(ffmpegScript, batFileName, 'Script Compressione');

    // Crea anche uno script PowerShell per eseguirlo senza problemi di sicurezza
    const psScript = `# Script di esecuzione per ${batFileName}
# Questo script sblocca e avvia il file batch

Write-Host "Sblocco e avvio compressione video..." -ForegroundColor Green
$scriptPath = Join-Path $PSScriptRoot "${batFileName}"

# Sblocca il file per rimuovere la protezione di Windows
Unblock-File -Path $scriptPath -ErrorAction SilentlyContinue

# Esegui il batch file
Start-Process -FilePath $scriptPath -WorkingDirectory $PSScriptRoot -Wait

Write-Host "Operazione completata!" -ForegroundColor Green
`;

    const psFileName = `RUN_${batFileName.replace('.bat', '.ps1')}`;
    await saveFileInVideoFolder(psScript, psFileName, 'Script PowerShell');
    
    showNotification(`✅ Script compressione salvato! Esegui il file ${psFileName} per iniziare la compressione.`, 'success');
}

async function exportMergeScript() {
    if (mergeState.videosToMerge.length < 2) {
        alert('Seleziona almeno 2 video da unire!');
        return;
    }
    
    const videoNames = mergeState.videosToMerge.map(v => v.name);
    
    let ffmpegScript = `@echo off
chcp 65001 > nul
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

set "OUTPUT_VIDEO=merged_video_%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%.mp4"
set "OUTPUT_VIDEO=%OUTPUT_VIDEO: =0%"
    set "START_TIME=%TIME%"

    `;

    // Create concat file
    ffmpegScript += `echo Creazione lista concatenazione...\n`;
    videoNames.forEach((name, index) => {
        const redirect = index === 0 ? '>' : '>>';
        ffmpegScript += `echo file '${name}' ${redirect} merge_list.txt\n`;
    });
    ffmpegScript += `\n`;
    
    // Merge videos
    ffmpegScript += `echo Unione dei video in corso...\necho.\n`;
    ffmpegScript += `ffmpeg -f concat -safe 0 -i merge_list.txt -c copy -nostdin "%OUTPUT_VIDEO%"\n`;
    // Cleanup
    ffmpegScript += `echo.\necho Pulizia file temporanei...\n`;
    ffmpegScript += `del merge_list.txt\n\n`;
    
    // Success
    ffmpegScript += `echo.\necho ===================================================\necho   Video creato con successo!\necho ===================================================\necho.\necho File: %OUTPUT_VIDEO%\necho Inizio: %START_TIME%  Fine: %TIME%\necho.\necho Clip incluse:\n`;
    videoNames.forEach((name, i) => {
        ffmpegScript += `echo   ${i + 1}. ${name}\n`;
    });
    ffmpegScript += `echo.\npause\nexplorer /select,"%OUTPUT_VIDEO%"\ngoto end\n\n`;
    
    // Error handling
    ffmpegScript += `:error\necho.\necho ERRORE: Si e' verificato un problema.\necho Verifica che:\necho - FFmpeg sia installato e nel PATH\necho - Tutti i video siano nella stessa cartella dello script\necho - I nomi dei file siano corretti\necho.\npause\ngoto end\n\n:end\n`;
    
    // Converti tutti i \n in \r\n per compatibilità Windows Batch
    ffmpegScript = ffmpegScript.replace(/\r?\n/g, '\r\n');

    // Salva il file batch
    const batFileName = `merge_videos_${Date.now()}.bat`;
    await saveFileInVideoFolder(ffmpegScript, batFileName, 'Script Merge');

    // Crea anche uno script PowerShell per eseguirlo senza problemi di sicurezza
    const psScript = `# Script di esecuzione per ${batFileName}
# Questo script sblocca e avvia il file batch

Write-Host "Sblocco e avvio merge video..." -ForegroundColor Green
$scriptPath = Join-Path $PSScriptRoot "${batFileName}"

# Sblocca il file per rimuovere la protezione di Windows
Unblock-File -Path $scriptPath -ErrorAction SilentlyContinue

# Esegui il batch file
Start-Process -FilePath $scriptPath -WorkingDirectory $PSScriptRoot -Wait

Write-Host "Operazione completata!" -ForegroundColor Green
`;

    const psFileName = `RUN_${batFileName.replace('.bat', '.ps1')}`;
    await saveFileInVideoFolder(psScript, psFileName, 'Script PowerShell');
    
    showNotification(`✅ Script merge salvato! Esegui il file ${psFileName} per unire i video.`, 'success');
}

async function exportActionsToFFmpeg() {
    try {
        console.log('Inizio exportActionsToFFmpeg');
        if (!state) throw new Error('Stato dell\'applicazione non trovato');

        if (state.selectedActions.size === 0) {
            alert('Seleziona almeno un\'azione da esportare');
            return;
        }
    
    // Inizia con TUTTE le azioni selezionate dallo stato
    let selectedActionsList = state.actions.filter(a => state.selectedActions.has(a.id));
    
    // Ordina le azioni selezionate
    if (state.customOrder && state.customOrder.length > 0) {
        // Se esiste un ordine personalizzato, lo seguiamo (ma includiamo tutte le selezionate)
        const orderMap = new Map();
        state.customOrder.forEach((id, index) => orderMap.set(id, index));
        
        selectedActionsList.sort((a, b) => {
            const indexA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
            const indexB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
            
            if (indexA !== indexB) return indexA - indexB; // Priorità all'ordine manuale
            return a.startTime - b.startTime; // Altrimenti per tempo
        });
    } else {
        // Ordinamento predefinito: per nome tag, poi per tempo
        selectedActionsList.sort((a, b) => {
            const tagCompare = a.tag.name.localeCompare(b.tag.name);
            if (tagCompare !== 0) return tagCompare;
            return a.startTime - b.startTime;
        });
    }

    // Sanificazione: assicura che startTime < endTime e ricalcola durata
    selectedActionsList = selectedActionsList.map(a => {
        const sanitized = { ...a };
        if (sanitized.startTime > sanitized.endTime) {
            const tmp = sanitized.startTime;
            sanitized.startTime = sanitized.endTime;
            sanitized.endTime = tmp;
        }
        sanitized.duration = sanitized.endTime - sanitized.startTime;
        
        // Se la durata è troppo breve (es meno di 0.1s), impostala a un minimo per evitare crash FFmpeg
        if (sanitized.duration < 0.1) sanitized.duration = 0.1;
        
        return sanitized;
    });
    
    // Generate FFmpeg commands
    const videoFileName = (state.currentVideo && state.currentVideo.name && state.currentVideo.name.trim()) 
        ? state.currentVideo.name 
        : 'VIDEO_NON_TROVATO.mp4';
    
    // Recupera dimensioni video per eventuali immagini (con fallback robusto)
    const videoPlayer = document.getElementById('videoPlayer');
    let vWidth = videoPlayer.videoWidth;
    let vHeight = videoPlayer.videoHeight;
    
    // Se le dimensioni non sono ancora caricate dal player, prova dallo stato
    if (!vWidth || !vHeight) {
        vWidth = 1920;
        vHeight = 1080;
    }
    
    // Assicuriamoci che siano numeri pari per FFmpeg
    const safeWidth = Math.floor(vWidth / 2) * 2;
    const safeHeight = Math.floor(vHeight / 2) * 2;

    // Leggi durata sfumatura dal selettore
    const xfadeDuration = parseFloat(document.getElementById('xfadeDuration')?.value || "0");
    const useXfade = xfadeDuration > 0 && selectedActionsList.length > 1;
    
    // Leggi opzione muto
    const isMuted = document.getElementById('muteExportAudio')?.checked || false;

    // Calcola durata totale per stima
    const totalDuration = selectedActionsList.reduce((acc, a) => acc + a.duration, 0);
    const durationStr = formatTime(totalDuration);

    // Funzione di utility per fare l'escape dei caratteri speciali per FFmpeg drawtext
    const escapeFFmpegText = (text) => {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/'/g, "\\'")
            .replace(/"/g, '') // Rimuove virgolette doppie per evitare conflitti con la shell
            .replace(/%/g, '%%');
    };

    // Utility per escape caratteri speciali Windows Batch
    const escapeBatch = (text) => {
        if (!text) return '';
        return text
            .replace(/%/g, '%%')
            .replace(/&/g, '^&')
            .replace(/</g, '^<')
            .replace(/>/g, '^>')
            .replace(/\|/g, '^|')
            .replace(/\(/g, '^(')
            .replace(/\)/g, '^)');
    };

    let ffmpegScript = `@echo off
chcp 65001 > nul
set "INPUT_VIDEO=${videoFileName}"
set "OUTPUT_VIDEO=highlight_%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%.mp4"

REM Script generato da Match Analysis
REM Video di sintesi con ${selectedActionsList.length} clip
REM Durata totale stimata del video finale: ${durationStr}
${useXfade ? `REM Transizione xfade tra le clip: ${xfadeDuration}s` : ''}

echo ===================================================
echo   Match Analysis - Creazione Highlight
echo ===================================================
echo.
echo Statistiche di esportazione:
echo - Numero di clip: ${selectedActionsList.length}
echo - Durata video finale: ${durationStr}
echo - Audio: ${isMuted ? 'DISATTIVATO' : 'ATTIVATO'}
echo - Data/Ora inizio: %TIME%
echo.
echo File input: "%INPUT_VIDEO%"
echo.
set "START_TIME=%TIME%"
echo Questo script richiede FFmpeg installato sul PC.
echo.

REM Verifica che il file video esista
if not exist "%INPUT_VIDEO%" (
    echo.
    echo ERRORE: File video non trovato!
    echo.
    echo Cercato: "%INPUT_VIDEO%"
    echo Cartella corrente: "%CD%"
    echo.
    echo IMPORTANTE: Questo script deve essere nella STESSA CARTELLA del video!
    echo Copia il file video qui oppure sposta questo script nella cartella del video.
    echo.
    pause
    exit /b 1
)

echo File input: "%INPUT_VIDEO%"
echo Estrazione di ${selectedActionsList.length} clip...
echo.

`;

    // Extract each segment
    selectedActionsList.forEach((action, i) => {
        const progress = Math.round(((i + 1) / selectedActionsList.length) * 100);
        const barSize = 20;
        const filled = Math.round((progress / 100) * barSize);
        const empty = barSize - filled;
        const barStr = "[" + "#".repeat(filled) + ".".repeat(empty) + "]";

        if (action.type === 'image') {
            const fileNameSafe = action.fileName.replace(/\|/g, '^|').replace(/%/g, '%%');
            const batchSafeInput = action.fileName.replace(/%/g, '%%');
            
            ffmpegScript += `echo ${barStr} ${progress}%% - [${i+1}/${selectedActionsList.length}] Elaborazione Immagine: ${fileNameSafe} (%TIME%)\n`;
            ffmpegScript += `if not exist "${batchSafeInput}" echo ATTENZIONE: Immagine "${fileNameSafe}" non trovata!\n`;
            
            // Crea un segmento video dall'immagine con gli STESSI parametri del video
            if (!isMuted) {
                ffmpegScript += `ffmpeg -hide_banner -loglevel error -loop 1 -r 30 -i "${batchSafeInput}" -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" -t ${action.duration.toFixed(3)} -c:v libx264 -preset fast -crf 23 -vf "scale=${safeWidth}:${safeHeight}:force_original_aspect_ratio=decrease,pad=${safeWidth}:${safeHeight}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,setsar=1" -map 0:v -map 1:a -c:a aac -b:a 128k -ar 44100 -ac 2 -nostdin "segment_${i}.mp4"\n`;
            } else {
                ffmpegScript += `ffmpeg -hide_banner -loglevel error -loop 1 -r 30 -i "${batchSafeInput}" -t ${action.duration.toFixed(3)} -c:v libx264 -preset fast -crf 23 -vf "scale=${safeWidth}:${safeHeight}:force_original_aspect_ratio=decrease,pad=${safeWidth}:${safeHeight}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,setsar=1" -an -nostdin "segment_${i}.mp4"\n`;
            }
            ffmpegScript += `if errorlevel 1 goto error\n\n`;
            return;
        }

        // Prepara il testo da sovrapporre (Tag + Flag + Commento)
        // Requisiti: v -> OK (lime), x -> KO (red). Arial, Bottom-Left.
        let statusText = '';
        let statusColor = 'white';
        
        // Nome Tag + Nome Squadra (se presente)
        let teamSuffix = "";
        if (action.tag.team && state.teamNames) {
            const teamName = state.teamNames[action.tag.team];
            if (teamName) {
                teamSuffix = ` | ${teamName.toUpperCase()}`;
            }
        }
        
        let tagName = action.tag.name.toUpperCase() + teamSuffix;
        let commentText = (action.comment && action.comment.trim() && action.type !== 'image') ? ` | ${action.comment}` : '';
        
        if (action.positive) {
            statusText = '[OK] | ';
            statusColor = 'lime';
        } else if (action.negative) {
            statusText = '[X] | ';
            statusColor = 'red';
        }

        const safeStatusText = escapeFFmpegText(statusText);
        const safeMainText = escapeFFmpegText(tagName + commentText);
        const fullTextForBox = escapeFFmpegText(statusText + tagName + commentText);

        const batchSafeTagName = escapeBatch(tagName);

        ffmpegScript += `echo ${barStr} ${progress}%% - [${i+1}/${selectedActionsList.length}] Estrazione: ${batchSafeTagName} (%TIME%)\n`;
        
        // Filtro VF con allineamento in basso a sinistra e carattere Arial
        // - Per avere un box UNICO, disegniamo prima un box vuoto basato sul testo totale,
        //   oppure disegniamo il box solo per il testo principale e sovrapponiamo i due drawtext.
        //   La soluzione più pulita per box unico è:
        //   1. Disegnare il box con il testo completo (ma trasparente)
        //   2. Disegnare OK/KO sopra senza box
        //   3. Disegnare il resto sopra senza box
        
        let vf = "";
        if (statusText) {
            // Per garantire altezze IDENTICHE dei due box:
            // 1. Usiamo un filtro drawtext "fantasma" che disegna il box usando caratteri con ascender e descender (es. 'gp')
            //    ma con il colore del testo trasparente (@0).
            // 2. Sovrapponiamo poi il testo reale senza box.
            
            // BOX 1 (Status)
            vf += `drawtext=text='${safeStatusText}gp':font='Arial':fontsize=20:fontcolor=white@0:box=1:boxcolor=black@0.7:boxborderw=7:x=20:y=h-40, `;
            vf += `drawtext=text='${safeStatusText}':font='Arial':fontsize=20:fontcolor=${statusColor}:x=20:y=h-40, `;
            
            // BOX 2 (Main Text)
            // Posizionato a x=85 per lasciare spazio al primo box (~65px) + margine
            vf += `drawtext=text='${safeMainText}gp':font='Arial':fontsize=20:fontcolor=white@0:box=1:boxcolor=black@0.7:boxborderw=7:x=85:y=h-40, `;
            vf += `drawtext=text='${safeMainText}':font='Arial':fontsize=20:fontcolor=white:x=85:y=h-40`;
        } else {
            // Se non c'è status, solo box principale con altezza standardizzata
            vf += `drawtext=text='${safeMainText}gp':font='Arial':fontsize=20:fontcolor=white@0:box=1:boxcolor=black@0.7:boxborderw=7:x=20:y=h-40, `;
            vf += `drawtext=text='${safeMainText}':font='Arial':fontsize=20:fontcolor=white:x=20:y=h-40`;
        }
        
        const fullVf = `scale=${safeWidth}:${safeHeight}:force_original_aspect_ratio=decrease,pad=${safeWidth}:${safeHeight}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,setsar=1,${vf}`;

        let audioParams = isMuted ? '-an' : '-c:a aac -b:a 128k -ar 44100 -ac 2';
        // Se l'audio è attivo, usiamo l'audio originale. Se il video originale non avesse audio, 
        // l'aggiunta di anullsrc in mix garantisce che la clip finale abbia sempre una traccia audio
        // necessaria per la concatenazione successiva (specialmente con xfade/acrossfade).
        if (!isMuted) {
            ffmpegScript += `ffmpeg -hide_banner -loglevel error -ss ${action.startTime.toFixed(3)} -i "%INPUT_VIDEO%" -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" -t ${action.duration.toFixed(3)} -r 30 -vf "${fullVf}" -c:v libx264 -preset fast -crf 23 -filter_complex "[0:a][1:a]amix=inputs=2:duration=first[aout]" -map 0:v -map "[aout]" -c:a aac -b:a 128k -ar 44100 -ac 2 -avoid_negative_ts make_zero -nostdin "segment_${i}.mp4"\n`;
        } else {
            ffmpegScript += `ffmpeg -hide_banner -loglevel error -ss ${action.startTime.toFixed(3)} -i "%INPUT_VIDEO%" -t ${action.duration.toFixed(3)} -r 30 -vf "${fullVf}" -c:v libx264 -preset fast -crf 23 -an -avoid_negative_ts make_zero -nostdin "segment_${i}.mp4"\n`;
        }
        ffmpegScript += `if errorlevel 1 goto error\n\n`;
    });
    
    if (useXfade) {
        // Logica complessa xfade via filter_complex
        // Usiamo un file di script per il filtro per evitare il limite di caratteri della riga di comando Windows
        ffmpegScript += `echo.\necho Applicazione sfumature (Dip to Black) tra le clip...\n`;
        
        let inputs = "";
        let filterParts = [];
        let currentOut = "v0";
        let currentAudioOut = "a0";
        
        // Calcola in anticipo le durate effettive delle transizioni per ogni coppia
        const effectiveXfades = [];
        for (let i = 1; i < selectedActionsList.length; i++) {
            effectiveXfades.push(Math.min(xfadeDuration, selectedActionsList[i-1].duration, selectedActionsList[i].duration));
        }

        // Prima clip: base
        inputs += `-i "segment_0.mp4" `;
        filterParts.push(`[0:v]settb=AVTB,setpts=PTS-STARTPTS[v0]`);
        if (!isMuted) {
            filterParts.push(`[0:a]atrim=0,asetpts=PTS-STARTPTS[a0]`);
        }
        
        let offset = selectedActionsList[0].duration;
        
        for (let i = 1; i < selectedActionsList.length; i++) {
            inputs += `-i "segment_${i}.mp4" `;
            const vIn = `v${i}_in`;
            const aIn = `a${i}_in`;
            const vOut = `v${i}`;
            const aOut = `a${i}`;
            
            const transDur = effectiveXfades[i-1];
            
            // Porta i timestamp a zero per ogni input clip
            filterParts.push(`[${i}:v]settb=AVTB,setpts=PTS-STARTPTS[${vIn}]`);
            if (!isMuted) {
                filterParts.push(`[${i}:a]atrim=0,asetpts=PTS-STARTPTS[${aIn}]`);
            }
            
            // Calcola l'offset: dove INIZIA la sfumatura sulla clip corrente accumulata
            offset -= transDur;
            
            // Applica xfade video e acrossfade audio
            filterParts.push(`[${currentOut}][${vIn}]xfade=transition=fade:duration=${transDur.toFixed(3)}:offset=${offset.toFixed(3)}[${vOut}]`);
            if (!isMuted) {
                filterParts.push(`[${currentAudioOut}][${aIn}]acrossfade=d=${transDur.toFixed(3)}[${aOut}]`);
            }
            
            currentOut = vOut;
            if (!isMuted) {
                currentAudioOut = aOut;
            }
            // Aggiorna l'offset per la prossima clip
            offset += selectedActionsList[i].duration;
        }

        const filterFileName = `xfade_filter_${Date.now()}.txt`;
        const filterStr = filterParts.join('; ');
        await saveFileInVideoFolder(filterStr, filterFileName, 'FFmpeg Filter Script');
        
        const finalAudioParams = isMuted ? '-an' : `-map "[${currentAudioOut}]" -c:a aac -b:a 128k`;
        ffmpegScript += `ffmpeg ${inputs} -filter_complex_script "${filterFileName}" -map "[${currentOut}]" ${finalAudioParams} -c:v libx264 -preset fast -crf 23 -nostdin "%OUTPUT_VIDEO%"\n`;
        ffmpegScript += `if errorlevel 1 goto error\n\n`;
        
        // Aggiungi il file filter ai file da pulire
        ffmpegScript += `del "${filterFileName}"\n`;
    } else {
        // Metodo classico concat (senza sfumature)
        ffmpegScript += `echo.\necho Creazione lista concatenazione...\n`;
        selectedActionsList.forEach((_, i) => {
            const redirect = i === 0 ? '>' : '>>';
            ffmpegScript += `echo file 'segment_${i}.mp4' ${redirect} concat_list.txt\n`;
        });
        ffmpegScript += `\n`;
        
        // Concatenate
        ffmpegScript += `echo Unione dei ${selectedActionsList.length} clip...\necho.\n`;
        ffmpegScript += `ffmpeg -f concat -safe 0 -i concat_list.txt -c copy -nostdin "%OUTPUT_VIDEO%"\n`;
        ffmpegScript += `if errorlevel 1 goto error\n\n`;
    }
    
    // Cleanup
    ffmpegScript += `echo.\necho Pulizia file temporanei...\n`;
    selectedActionsList.forEach((_, i) => {
        ffmpegScript += `del "segment_${i}.mp4"\n`;
    });
    if (!useXfade) ffmpegScript += `del concat_list.txt\n`;
    ffmpegScript += `\n`;
    
    // Success
    ffmpegScript += `echo.\necho ========================================\necho   Video creato con successo!\necho ========================================\necho.\necho File: %OUTPUT_VIDEO%\necho Inizio: %START_TIME%  Fine: %TIME%\necho.\necho Clip incluse:\n`;
    selectedActionsList.forEach((action, i) => {
        if (action.type === 'image') {
            const fileNameSafe = action.fileName.replace(/\|/g, '^|');
            ffmpegScript += `echo   ${i+1}. [IMMAGINE] ${fileNameSafe} (${action.duration}s)\n`;
        } else {
            let teamSuffix = "";
            if (action.tag && action.tag.team && state.teamNames) {
                const tName = state.teamNames[action.tag.team];
                if (tName) teamSuffix = ` | ${tName.toUpperCase()}`;
            }
            const displayTagName = escapeBatch((action.tag ? action.tag.name.toUpperCase() : "TAG") + teamSuffix);
            
            ffmpegScript += `echo   ${i+1}. ${displayTagName} (${formatTime(action.startTime)} - ${formatTime(action.endTime)})`;
            if (action.comment && action.comment.trim()) {
                const safeComment = escapeBatch(action.comment.replace(/["|']/g, ''));
                ffmpegScript += ` | ${safeComment}`;
            }
            ffmpegScript += `\n`;
        }
    });
    ffmpegScript += `echo.\npause\nexplorer /select,"%OUTPUT_VIDEO%"\ngoto end\n\n`;
    
    // Error handling
    ffmpegScript += `:error\necho.\necho ERRORE: Si e' verificato un problema.\necho Verifica che:\necho - FFmpeg sia installato e nel PATH\necho - Il file video sia nella stessa cartella dello script\necho - Non ci siano caratteri speciali proibiti nel commento\necho.\necho Se vedi errori "Fontconfig", prova a installare una versione completa di FFmpeg\necho o a disabilitare temporaneamente i testi sovrapposti.\necho.\npause\ngoto end\n\n:end\n`;
    
    // Converti tutti i \n in \r\n per compatibilità Windows Batch
    ffmpegScript = ffmpegScript.replace(/\r?\n/g, '\r\n');

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
    } catch (error) {
        console.error('Errore durante l\'esportazione FFmpeg:', error);
        alert('Si è verificato un errore durante la creazione dello script: ' + error.message);
    }
}

async function exportActionsToJSON() {
    try {
        console.log('Inizio exportActionsToJSON');
        if (!state) throw new Error('Stato dell\'applicazione non trovato');
        
        const data = {
            exportDate: new Date().toISOString(),
            videoName: state.currentVideo ? state.currentVideo.name : null,
            teamNames: state.teamNames,
            actions: state.actions.map(action => ({
                ...action,
                selected: state.selectedActions.has(action.id)
            }))
        };
        
        // Esporta JSON
        const json = JSON.stringify(data, null, 2);
        const fileNameJson = `match_analysis_${Date.now()}.json`;
        await saveFileInVideoFolder(json, fileNameJson, 'Match Analysis JSON');

        // Helper per convertire mm:ss in secondi
        const timeToSeconds = (timeStr) => {
            if (!timeStr) return 0;
            const parts = timeStr.split(':');
            if (parts.length === 2) {
                return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
            }
            return parseFloat(timeStr) || 0;
        };

        // Esporta TXT (Formato: Timer Frazione Tag_Name Team Commento)
        const val1 = document.getElementById('matchStart1')?.value || "00:00";
        const val2 = document.getElementById('matchStart2')?.value || "45:00";
        const start1 = timeToSeconds(val1);
        const start2 = timeToSeconds(val2);
        
        let txtContent = "Timer\tFrazione\tTag_Name\tTeam\tCommento\n";
        // Ordiniamo le azioni per tempo di inizio per il file di testo, solo quelle selezionate
        const sortedActionsForTxt = state.actions
            .filter(a => state.selectedActions.has(a.id))
            .sort((a, b) => a.startTime - b.startTime);
        
        sortedActionsForTxt.forEach(action => {
            // Escludi le immagini dall'export TXT
            if (action.type === 'image') return;

            let frazione = "1° T";
            let matchTimeSeconds = 0;
            
            if (action.startTime >= start2) {
                frazione = "2° T";
                matchTimeSeconds = action.startTime - start2;
            } else {
                frazione = "1° T";
                matchTimeSeconds = Math.max(0, action.startTime - start1);
            }
            
            // Formato decimale: minuti + (secondi/60). Es: 1.5 significa 1 minuto e 30 secondi
            const timerDecimale = (matchTimeSeconds / 60).toFixed(1);
            
            const tagName = action.tag ? action.tag.name : "";
            const teamName = (action.tag && action.tag.team && state.teamNames && state.teamNames[action.tag.team]) 
                ? state.teamNames[action.tag.team] 
                : "";
            const comment = action.comment || "";
            
            txtContent += `${timerDecimale}\t${frazione}\t${tagName}\t${teamName}\t${comment}\n`;
        });

        if (txtContent) {
            const fileNameTxt = `match_analysis_${Date.now()}.txt`;
            await saveFileInVideoFolder(txtContent, fileNameTxt, 'Elenco Azioni TXT');
        }
        console.log('Export completato con successo');
    } catch (error) {
        console.error('Errore in exportActionsToJSON:', error);
        alert('Errore durante l\'esportazione delle azioni: ' + error.message);
    }
}

function importActionsFromJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const actions = Array.isArray(data) ? data : data.actions;
            if (!actions || actions.length === 0) {
                alert('File JSON non valido o senza azioni.');
                return;
            }

            if (confirm(`Importare ${actions.length} azioni?\n\nQuesto sostituirà le azioni attuali.`)) {
                state.actions = actions;

                // Ripristina lo stato delle selezioni (checkbox)
                state.selectedActions.clear();
                actions.forEach(action => {
                    if (action.selected) {
                        state.selectedActions.add(action.id);
                    }
                });
                
                // Se il JSON contiene i nomi squadre, importali
                if (data.teamNames) {
                    state.teamNames = data.teamNames;
                    // Chiamiamo renderTags per aggiornare gli input dei nomi squadre
                    if (typeof renderTags === 'function') renderTags();
                }
                
                renderActions();
                saveStateToLocalStorage();
                showNotification('✅ Azioni importate con successo!', 'success');
            }
        } catch (error) {
            alert('Errore nell\'importazione: ' + error.message);
        }
    };
    reader.readAsText(file);
}

async function exportTagsToJSON() {
    try {
        console.log('Inizio exportTagsToJSON');
        if (!state) throw new Error('Stato dell\'applicazione non trovato');

        const data = {
            exportDate: new Date().toISOString(),
            teamNames: state.teamNames,
            tags: state.tags
        };
        
        const json = JSON.stringify(data, null, 2);
        const fileName = `match_tags_${Date.now()}.json`;
        await saveFileInVideoFolder(json, fileName, 'Tags JSON');
        console.log('Export Tag completato con successo');
    } catch (error) {
        console.error('Errore in exportTagsToJSON:', error);
        alert('Errore durante l\'esportazione dei tag: ' + error.message);
    }
}

function importTagsFromJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const tags = Array.isArray(data) ? data : data.tags;
            if (!tags || tags.length === 0) {
                alert('File JSON non valido o senza tag.');
                return;
            }

            if (confirm(`Importare ${tags.length} tag?\n\nQuesto sostituirà i tag attuali.`)) {
                state.tags = tags;
                
                // Se il JSON contiene i nomi squadre, importali
                if (data.teamNames) {
                    state.teamNames = data.teamNames;
                }
                
                renderTags();
                populateTagFilter();
                saveTagsToLocalStorage();
                showNotification('✅ Tag importati con successo!', 'success');
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
window.exportTagsToJSON = exportTagsToJSON;
window.importTagsFromJSON = importTagsFromJSON;
window.selectMergeVideos = selectMergeVideos;
window.exportMergeScript = exportMergeScript;
window.removeMergeVideo = removeMergeVideo;
window.moveMergeVideo = moveMergeVideo;
window.selectCompressVideo = selectCompressVideo;
window.exportCompressScript = exportCompressScript;
