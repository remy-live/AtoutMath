import { clearEngines } from '../core/timers.js';
import { state } from '../core/state.js';
import { SequenceRunner } from '../core/sequenceRunner.js';

export function openGameLayer(exo, startAsDemo) {
    // If it's a configurable game and we don't have current parameters (free play mode)
    // We intercept the launch and show the config UI first.
    if (exo.configurable && !exo.currentParams) {
        if (state.isTeacherMode && window.showGameConfigUI) {
            window.showGameConfigUI(exo, (newParams) => {
                const configuredExo = { ...exo, currentParams: newParams };
                executeOpenGameLayer(configuredExo, startAsDemo);
            });
            return;
        } else {
            // En mode élève, si le jeu gère sa propre config interne en libre, on ne force pas defaultParams
            if (exo.internalStudentConfig) {
                const configuredExo = { ...exo, currentParams: { showInternalMenu: true } };
                executeOpenGameLayer(configuredExo, startAsDemo);
            } else {
                // Show Student Config Modal
                import(`./configUI.js?v=${Date.now()}`).then(module => {
                    module.showStudentConfigModal(exo, (newParams) => {
                        const configuredExo = { ...exo, currentParams: newParams };
                        executeOpenGameLayer(configuredExo, startAsDemo);
                    });
                });
            }
            return;
        }
    }
    
    executeOpenGameLayer(exo, startAsDemo);
}

function executeOpenGameLayer(exo, startAsDemo) {
    state.activeExo = exo;
    document.getElementById('game-title').textContent = exo.title;
    const gl = document.getElementById('game-layer');
    // Only remove simulator classes if we are NOT already in a simulator mode, 
    // to prevent losing the mobile/tablet frame when toggling demo mode.
    if (!gl.classList.contains('device-simulator') && !gl.classList.contains('tablet-simulator')) {
        gl.classList.remove('device-simulator', 'tablet-simulator');
    }
    gl.style.display = 'flex';
    
    // Afficher Toast si Mode Aperçu
    const banner = document.getElementById('demo-overlay-banner');
    if (startAsDemo && banner) {
        const bannerMsg = document.getElementById('demo-banner-text');
        if (bannerMsg) {
            const instr = exo.instruction ? ` : ${exo.instruction}` : ' en cours. Observe bien l\'exemple !';
            bannerMsg.textContent = `Mode Aperçu${instr}`;
        }
        banner.style.display = 'flex';
        
        const board = document.getElementById('game-board');
        launchEngine(exo, board, true);
    } else {
        if (banner) banner.style.display = 'none';
        
        // Mode Exercice Libre: on utilise SequenceRunner avec un objectif par défaut
        if (!exo.currentParams) exo.currentParams = {};
        if (!exo.currentParams.nbQuestions) exo.currentParams.nbQuestions = 10;
        if (!exo.currentParams.successThreshold) exo.currentParams.successThreshold = 10;
        
        exo.isSingleExercise = true; // Flag for custom end message
        
        const runner = new SequenceRunner([exo], state.deviceMode || 'desktop');
        runner.start();
    }
}

export function launchEngine(exo, container, isDemo, overrideParams = null) {
    clearEngines(); // Nettoie toute trace de jeu précédent
    container.innerHTML = '';
    
    // Pass params if they exist (either from sequence step or student free-play choice)
    // If missing, use defaultParams
    const params = overrideParams || exo.currentParams || exo.defaultParams || {};
    const type = exo.gameType;

    const cacheBuster = Date.now();
    import(`./${type}.js?v=${cacheBuster}`).then(module => {
        // Find the exported function that starts with 'engine'
        const engineFuncName = Object.keys(module).find(k => k.startsWith('engine'));
        if (engineFuncName && module[engineFuncName]) {
            window.activeGame = module[engineFuncName](container, isDemo, params);
        } else {
            console.error(`No exported engine function found in ${type}.js`);
        }
    }).catch(err => {
        console.error(`Failed to load engine for type: ${type}`, err);
    });
}
