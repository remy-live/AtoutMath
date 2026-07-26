import { state } from './core/state.js';
import { clearEngines } from './core/timers.js';
import { openGameLayer } from './games/engine.js';
import { initAccordion, renderDrilldown, initGridFilters, setSidebarMode, setTopNavMode } from './ui/navigation.js';
import { initBuilder } from './ui/builder.js';
import { Shortcodes } from './core/shortcodes.js';
import { exercices } from './data/catalog.js';
import { initImportExport } from './core/importExport.js';
import { initProfileUI } from './ui/profileUI.js';
import { initStudentCodeUI } from './ui/studentCodeUI.js';
import { initGameFeedbackUI } from './ui/gameFeedbackUI.js';
import { initGamificationEngine } from './core/gamification.js';
import { initGamificationUI } from './ui/gamificationUI.js';
window.appConfirm = (title, message, onConfirm) => {
    const modal = document.getElementById('universal-confirm-modal');
    if (!modal) return;
    document.getElementById('uc-title').textContent = title;
    document.getElementById('uc-message').textContent = message;
    
    const btnCancel = document.getElementById('btn-uc-cancel');
    const btnConfirm = document.getElementById('btn-uc-confirm');
    
    // Remove old listeners
    const newCancel = btnCancel.cloneNode(true);
    const newConfirm = btnConfirm.cloneNode(true);
    btnCancel.replaceWith(newCancel);
    btnConfirm.replaceWith(newConfirm);
    
    newCancel.onclick = () => { modal.style.display = 'none'; };
    newConfirm.onclick = () => { 
        modal.style.display = 'none'; 
        if (onConfirm) onConfirm(); 
    };
    
    modal.style.display = 'flex';
};

function refreshViews() { initAccordion(); renderDrilldown(); }

window.onload = async () => {
    initGamificationEngine(); // Start listening before load
    initGamificationUI();
    
    await state.load();
    
    const customSelect = document.getElementById('custom-niveau-select');
    const cnsLabel = document.getElementById('cns-label');
    const cnsDropdown = document.getElementById('cns-dropdown');
    
    if (customSelect && cnsDropdown) {
        const allNiveaux = [...new Set(exercices.flatMap(e => e.tags.niveaux || []))].sort();
        
        if (!Array.isArray(state.selectedNiveaux)) state.selectedNiveaux = [];

        const updateLabel = () => {
            if (state.selectedNiveaux.length === 0) {
                cnsLabel.textContent = 'Tous les niveaux';
            } else {
                cnsLabel.textContent = state.selectedNiveaux.join(', ');
            }
        };

        const renderCheckboxes = () => {
            cnsDropdown.innerHTML = '';
            allNiveaux.forEach(niv => {
                const label = document.createElement('label');
                label.style = "display: flex; align-items: center; gap: 8px; padding: 6px; cursor: pointer; border-radius: 4px;";
                label.onmouseenter = () => label.style.background = 'var(--bg-hover)';
                label.onmouseleave = () => label.style.background = 'transparent';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = niv;
                cb.checked = state.selectedNiveaux.includes(niv);
                cb.onchange = (e) => {
                    if (e.target.checked) {
                        if (!state.selectedNiveaux.includes(niv)) state.selectedNiveaux.push(niv);
                    } else {
                        state.selectedNiveaux = state.selectedNiveaux.filter(n => n !== niv);
                    }
                    state.setSelectedNiveaux(state.selectedNiveaux);
                    updateLabel();
                    refreshViews();
                    initGridFilters();
                };

                label.appendChild(cb);
                label.appendChild(document.createTextNode(niv));
                cnsDropdown.appendChild(label);
            });
        };

        customSelect.onclick = (e) => {
            e.stopPropagation();
            const isVisible = cnsDropdown.style.display === 'flex';
            cnsDropdown.style.display = isVisible ? 'none' : 'flex';
        };

        document.addEventListener('click', (e) => {
            if (!customSelect.contains(e.target) && !cnsDropdown.contains(e.target)) {
                cnsDropdown.style.display = 'none';
            }
        });

        renderCheckboxes();
        updateLabel();
    }

    initImportExport();
    refreshViews();
    setSidebarMode('drill');
    setTopNavMode('grid');
    initGridFilters();
    initBuilder();
    initStudentCodeUI();
    initGameFeedbackUI();

    // Check for shortcode in URL
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam) {
        import('./core/shortcodes.js').then(module => {
            const sequence = module.Shortcodes.decodeSequence(codeParam, exercices);
            if (sequence && sequence.length > 0) {
                // Launch in full student mode
                import('./core/sequenceRunner.js').then(seqModule => {
                    const runner = new seqModule.SequenceRunner(sequence, 'none');
                    runner.start();
                    
                    // Hide teacher UI elements
                    document.getElementById('sidebar-container').style.display = 'none';
                    document.getElementById('top-nav-bar').style.display = 'none';
                    document.getElementById('main-content').style.display = 'none';
                });
            }
        });
    }

    // Event Listeners Globaux
    
    // Sidebar Toggle
    const btnSidebar = document.getElementById('btn-toggle-sidebar');
    if (btnSidebar) {
        btnSidebar.onclick = () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('collapsed');
        };
    }
    
    // Toggle Theme
    const themes = ['light', 'dark', 'ocean', 'forest', 'sunset'];
    const btnTheme = document.getElementById('btn-toggle-theme');
    if (btnTheme) {
        btnTheme.onclick = () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            let nextIndex = (themes.indexOf(current) + 1) % themes.length;
            const next = themes[nextIndex];
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('mathbox-theme', next);
            // No need to update SVG, it is a static palette icon now
        };
    }

    // Bouton de retour dans l'arborescence
    document.getElementById('btn-back').onclick = () => { state.navStack.pop(); renderDrilldown(); };

    // Contrôleurs de jeu
    document.getElementById('btn-close-game').onclick = () => {
        if (state.activeSequenceRunner) {
            state.activeSequenceRunner.abort();
        }
        clearEngines();
        const gl = document.getElementById('game-layer');
        gl.classList.remove('device-simulator', 'tablet-simulator');
        gl.style.display = 'none';
    };

    document.getElementById('btn-toggle-demo').onclick = () => {
        clearEngines();
        // Since we don't store explicitly if we are in demo mode right now,
        // we can just check if the banner is visible
        const banner = document.getElementById('demo-overlay-banner');
        const isCurrentlyDemo = banner.style.display === 'flex';
        openGameLayer(state.activeExo, !isCurrentlyDemo);
    };

    document.getElementById('btn-show-instruction').onclick = () => {
        const exo = state.activeExo;
        const text = exo && exo.instruction ? exo.instruction : "Aucune consigne disponible pour cet exercice.";
        document.getElementById('instruction-text').textContent = text;
        document.getElementById('instruction-modal').style.display = 'flex';
    };

    document.getElementById('btn-instruction-close').onclick = () => {
        document.getElementById('instruction-modal').style.display = 'none';
    };

    document.getElementById('btn-start-real-game').onclick = () => {
        clearEngines();
        openGameLayer(state.activeExo, false); // Relance le même exercice en mode Jouable
    };

    // Navigation de la barre latérale (Boutons Bureau)
    ['drill', 'acc'].forEach(k => {
        if (document.getElementById('desk-btn-' + k)) document.getElementById('desk-btn-' + k).onclick = () => setSidebarMode(k);
    });

    // Bouton de bascule Clic/Arbre pour Mobile
    const mobBtnDrillAcc = document.getElementById('mob-btn-drill-acc');
    if (mobBtnDrillAcc) {
        mobBtnDrillAcc.onclick = () => {
            const sidebar = document.getElementById('sidebar');
            const wasActive = sidebar.classList.contains('mob-active');
            
            // Afficher la sidebar et cacher le main-area en mode mobile
            sidebar.classList.add('mob-active');
            document.getElementById('main-area').classList.remove('mob-active');
            sidebar.classList.remove('collapsed');
            
            // Retirer l'état actif des autres boutons
            ['grid', 'path', 'profile'].forEach(tab => {
                if(document.getElementById('mob-btn-'+tab)) document.getElementById('mob-btn-'+tab).classList.remove('active');
            });
            mobBtnDrillAcc.classList.add('active');

            // Determine current state
            const isCurrentlyDrill = document.getElementById('view-drilldown').style.display !== 'none';
            
            // Si la sidebar était DÉJÀ active, le clic sert à basculer entre Clic et Arbre
            let nextMode = isCurrentlyDrill ? 'drill' : 'acc';
            if (wasActive) {
                nextMode = isCurrentlyDrill ? 'acc' : 'drill';
            }
            
            setSidebarMode(nextMode);

            // Toggle SVG logic...
            const mobSvg = mobBtnDrillAcc.querySelector('svg');
            if (nextMode === 'acc') { 
                mobSvg.innerHTML = `
                    <rect x="3" y="3" width="5" height="5" rx="1"></rect>
                    <line x1="11" y1="5.5" x2="21" y2="5.5"></line>
                    <rect x="9" y="10" width="5" height="5" rx="1"></rect>
                    <line x1="17" y1="12.5" x2="21" y2="12.5"></line>
                    <rect x="9" y="17" width="5" height="5" rx="1"></rect>
                    <line x1="17" y1="19.5" x2="21" y2="19.5"></line>
                    <path d="M5.5 8v11.5"></path>
                    <path d="M5.5 12.5H9"></path>
                    <path d="M5.5 19.5H9"></path>
                `;
                mobBtnDrillAcc.querySelector('span').textContent = "Arbre";
            } else {
                mobSvg.innerHTML = `
                    <rect x="5" y="2" width="14" height="20" rx="7"></rect>
                    <path d="M12 6v4"></path>
                `;
                mobBtnDrillAcc.querySelector('span').textContent = "Clic";
            }
        };
    }

    // Top Navigation (Modes)
    ['grid', 'path', 'profile'].forEach(k => {
        if (document.getElementById('top-btn-' + k)) document.getElementById('top-btn-' + k).onclick = () => setTopNavMode(k);
        if (document.getElementById('mob-btn-' + k)) document.getElementById('mob-btn-' + k).onclick = () => {
            setTopNavMode(k);
            // Hide sidebar and show main-area on mobile when navigating main views
            document.getElementById('sidebar').classList.remove('mob-active');
            document.getElementById('main-area').classList.add('mob-active');

            // Update mobile buttons active state explicitly because top-btn handles k
            ['grid', 'path', 'profile'].forEach(tab => {
                if (document.getElementById('mob-btn-' + tab)) document.getElementById('mob-btn-' + tab).classList.toggle('active', tab === k);
            });
            if (document.getElementById('mob-btn-drill-acc')) document.getElementById('mob-btn-drill-acc').classList.remove('active');
        };
    });

    // Ouverture modale de Code
    if (document.getElementById('top-btn-code')) {
        document.getElementById('top-btn-code').onclick = () => {
            document.getElementById('code-modal').style.display = 'flex';
            const input = document.getElementById('student-code-input');
            if (input) input.focus();
        };
    }


    // Init scores and errors UI
    initProfileUI();

    // Toggle Sidebar (Top Nav Hamburger)
    const toggleSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth <= 768 || document.body.classList.contains('mobile-view')) {
            sidebar.classList.toggle('mob-active');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    };
    if (document.getElementById('btn-toggle-sidebar')) document.getElementById('btn-toggle-sidebar').onclick = toggleSidebar;

    // Barre de Debug
    const btnMob = document.getElementById('db-toggle-mobile');
    const btnRole = document.getElementById('db-toggle-role');
    const btnClear = document.getElementById('db-clear-storage');
    const btnFake = document.getElementById('db-fake-data');

    if(btnMob) {
        btnMob.onclick = () => {
            state.isMobileView = !state.isMobileView;
            btnMob.textContent = `📱 Vue Mobile : ${state.isMobileView ? 'ON' : 'OFF'}`;
            btnMob.classList.toggle('active', state.isMobileView);
            document.body.classList.toggle('mobile-view', state.isMobileView);
            
            if (state.isMobileView) {
                document.body.style.overflowX = 'hidden';
                // Open sidebar immediately when entering mobile view
                document.getElementById('sidebar').classList.add('mob-active');
            } else {
                document.body.style.overflowX = '';
            }
        };
    }

    if(btnRole) {
        btnRole.onclick = () => {
            state.isTeacherMode = !state.isTeacherMode;
            btnRole.textContent = `👨‍🏫 Mode : ${state.isTeacherMode ? 'Professeur' : 'Élève'}`;
            btnRole.classList.toggle('active', state.isTeacherMode);
            document.body.classList.toggle('teacher-mode', state.isTeacherMode);
            
            if (state.isTeacherMode) {
                setTopNavMode('teacher');
            } else {
                setTopNavMode('grid');
            }
            refreshViews();
        };
    }

    if (btnClear) {
        btnClear.onclick = () => {
            if (confirm("Vider complètement toutes les données locales (scores, historiques, etc) ?")) {
                localforage.clear().then(() => {
                    alert("Données effacées. L'application va se recharger.");
                    window.location.reload();
                });
            }
        };
    }

    if (btnFake) {
        btnFake.onclick = () => {
            // Generate some fake score
            state.addScore(150);
            
            // Generate a couple of realistic fake errors
            import('./core/errorSchema.js').then(schema => {
                const exo1 = { id: 'calc-add', title: 'Additions Mystères' };
                state.logError(exo1, schema.createErrorSnapshot({
                    input: "12", expected: "15", questionText: "8 + 7", a: 8, b: 7, target: 15
                }));

                const exo2 = { id: 'calc-mult-flash', title: 'Flash Mult' };
                state.logError(exo2, schema.createErrorSnapshot({
                    input: "35", expected: "42", questionText: "6 × 7", t: 6, m: 7, ans: 42
                }));
                
                alert("Score (+150 XP) et 2 erreurs bidons ajoutés !");
            });
        };
    }

    window.showGameConfigUI = (stepOrExo, onSaveCallback, containerId = 'builder-config-content') => {
        import('./games/configUI.js').then(module => {
            module.renderGameConfigUI(stepOrExo, onSaveCallback, containerId);
        });
    };
};
