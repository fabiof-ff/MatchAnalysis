// Export Actions and Generate FFmpeg Script

function exportActionsToFFmpeg() {
    if (state.selectedActions.size === 0) {
        alert('Seleziona almeno un\'azione da esportare');
        return;
    }
    
    const selectedActionsList = state.actions
        .filter(a => state.selectedActions.has(a.id))
        .sort((a, b) => a.startTime - b.startTime);
    
    // Generate FFmpeg commands
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

set INPUT_VIDEO=${state.currentVideo ? state.currentVideo.name : 'input.mp4'}
set OUTPUT_VIDEO=highlight_%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%.mp4

echo File input: %INPUT_VIDEO%
echo Estrazione di ${selectedActionsList.length} clip...
echo.

`;

    // Extract each segment
    selectedActionsList.forEach((action, i) => {
        ffmpegScript += `echo [${i+1}/${selectedActionsList.length}] Estrazione: ${action.tag.name} (${formatTime(action.startTime)} - ${formatTime(action.endTime)})\n`;
        ffmpegScript += `ffmpeg -ss ${action.startTime.toFixed(3)} -i "%INPUT_VIDEO%" -t ${action.duration.toFixed(3)} -c copy -avoid_negative_ts 1 segment_${i}.mp4\n`;
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
    ffmpegScript += `explorer /select,"%OUTPUT_VIDEO%"\ngoto end\n\n`;
    
    // Error handling
    ffmpegScript += `:error\necho.\necho ERRORE: Si e' verificato un problema.\necho Verifica che FFmpeg sia installato e nel PATH.\necho.\npause\ngoto end\n\n:end\npause\n`;
    
    // Download as .bat file
    const blob = new Blob([ffmpegScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `create_highlight_${Date.now()}.bat`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('✅ Script FFmpeg scaricato! Mettilo nella stessa cartella del video e eseguilo.', 'success');
}

function exportActionsToJSON() {
    const data = {
        exportDate: new Date().toISOString(),
        videoName: state.currentVideo ? state.currentVideo.name : null,
        actions: state.actions,
        tags: state.tags
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_analysis_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('✅ Dati esportati in JSON!', 'success');
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
