// Amorçage de l'application.
//
// L'ordre compte : le registre des générateurs et des activités doit être
// peuplé avant que le catalogue ne soit interrogé (il en déduit les schémas de
// configuration et les compétences travaillées). D'où cet import en premier.
import './core/activities/index.js';

// La capture de console s'installe AVANT tout le reste : une erreur survenue
// au démarrage est précisément celle qu'on veut pouvoir relire.
import { initConsoleCapture, openConsoleModal } from './ui/consoleLog.js';
initConsoleCapture();

import { state } from './core/state.js';
import { journal } from './core/journal.js';
import { clearEngines } from './core/timers.js';
import { destroyAllDemoCursors, marquerDemo } from './core/demoPointer.js';
import { openGameLayer, openDemo } from './games/engine.js';
import { validateCatalog } from './core/registry.js';
import { exercices, countByStatus, STATUS_LABELS, STATUS_CYCLE, estRevisable, getExerciseById } from './data/catalog.js';
import { isGame } from './core/gameAccess.js';
import {
    initAccordion, renderDrilldown, initGridFilters, syncGridToSidebar,
    setSidebarMode, setTopNavMode, refreshCatalogViews, initBasculeRangement
} from './ui/navigation.js';
import { initRechercheUI } from './ui/rechercheUI.js';
import { initBuilder } from './ui/builder.js';
import { initDebugBar } from './ui/debugBar.js';
import { initImportExport } from './core/importExport.js';
import { initProfileUI } from './ui/profileUI.js';
import { initStudentCodeUI, applyCode } from './ui/studentCodeUI.js';
import { initGameFeedbackUI } from './ui/gameFeedbackUI.js';
import { initGamificationEngine } from './core/gamification.js';
import { initGamificationUI } from './ui/gamificationUI.js';
import { initSync } from './core/sync.js';
import { initSyncUI } from './ui/syncUI.js';
import { initPleinEcran } from './ui/fullscreen.js';
import { initAccueil, initBilanExercice } from './ui/accueilUI.js';

// Confirmation universelle, utilisée par plusieurs vues.
window.appConfirm = (title, message, onConfirm) => {
    const modal = document.getElementById('universal-confirm-modal');
    if (!modal) return;
    document.getElementById('uc-title').textContent = title;
    document.getElementById('uc-message').textContent = message;

    const cancel = document.getElementById('btn-uc-cancel');
    const confirm = document.getElementById('btn-uc-confirm');
    const freshCancel = cancel.cloneNode(true);
    const freshConfirm = confirm.cloneNode(true);
    cancel.replaceWith(freshCancel);
    confirm.replaceWith(freshConfirm);

    freshCancel.onclick = () => { modal.style.display = 'none'; };
    freshConfirm.onclick = () => { modal.style.display = 'none'; if (onConfirm) onConfirm(); };
    modal.style.display = 'flex';
};

function refreshViews() {
    initAccordion();
    renderDrilldown();
}

window.addEventListener('DOMContentLoaded', async () => {
    initDeviceMode();
    initGamificationEngine();
    initGamificationUI();
    initGameFeedbackUI();

    await state.load();
    await seedExamplePath();
    initSync();

    // Cohérence du catalogue : mieux vaut un avertissement au démarrage
    // qu'un échec silencieux au lancement d'un exercice.
    const problems = validateCatalog(exercices);
    if (problems.length) console.warn('[catalogue] incohérences détectées :\n' + problems.join('\n'));

    initNiveauFilter();
    initImportExport();
    initBasculeRangement();
    refreshViews();
    setSidebarMode('drill');
    setTopNavMode('grid');
    initGridFilters();
    initRechercheUI(refreshCatalogViews);
    initBuilder();
    initStudentCodeUI();
    initProfileUI();
    initSyncUI();
    initGameControls();
    initNavButtons();
    initPleinEcran();
    initDebugToolbar();
    // Le bilan de fin d'exercice s'abonne AVANT qu'un exercice puisse être
    // lancé par un lien de parcours.
    initBilanExercice();

    // Parcours partagé par lien.
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) applyCode(code, { autoStart: true });

    window.showGameConfigUI = (step, onSave, containerId = 'builder-config-content') => {
        import('./games/configUI.js').then(m => m.renderGameConfigUI(step, onSave, containerId));
    };

    // Le message d'arrivée passe EN DERNIER : il lit le carnet d'erreurs, donc
    // après `state.load()`, et il s'efface devant un exercice déjà ouvert par
    // un lien de parcours — on ne coupe pas quelqu'un qui vient travailler.
    initAccueil();
});

// --- Détection de l'appareil ------------------------------------------------
//
// Sur un téléphone, l'application démarre directement en présentation
// portable — l'élève n'a pas à connaître la bascule 📱 de la palette
// d'auteur. Le choix manuel (via cette bascule) est mémorisé et l'emporte
// ensuite sur la détection.

function initDeviceMode() {
    const choixMemorise = () => {
        try { return localStorage.getItem('mathbox-device'); } catch (e) { return null; }
    };

    // Téléphone en PORTRAIT : écran étroit et pointeur tactile. Une fenêtre
    // de bureau réduite garde sa présentation, une tablette aussi — et un
    // téléphone tourné en paysage repasse en présentation deux colonnes.
    const telephonePortrait = () => window.innerWidth <= 700
        && window.matchMedia('(pointer: coarse)').matches;

    const appliquer = () => {
        const choix = choixMemorise();
        state.isMobileView = choix ? choix === 'mobile' : telephonePortrait();
        document.body.classList.toggle('mobile-view', state.isMobileView);
        document.body.style.overflowX = state.isMobileView ? 'hidden' : '';
        if (state.isMobileView) {
            // En présentation portable, un panneau à la fois : sans panneau
            // actif, l'écran démarrait VIDE. L'élève arrive sur la grille
            // d'exercices ; la barre basse mène au reste.
            const main = document.getElementById('main-area');
            const sidebar = document.getElementById('sidebar');
            if (main && sidebar && !main.classList.contains('mob-active')
                && !sidebar.classList.contains('mob-active')) {
                main.classList.add('mob-active');
            }
        }
    };

    appliquer();

    // Rotation portrait ↔ paysage : la présentation suit, tant qu'aucun
    // choix manuel (bascule 📱) n'a été mémorisé.
    let minuteur = null;
    window.addEventListener('resize', () => {
        if (choixMemorise()) return;
        clearTimeout(minuteur);
        minuteur = setTimeout(appliquer, 250);
    });
}

// --- Filtre par niveau ------------------------------------------------------

function initNiveauFilter() {
    const select = document.getElementById('custom-niveau-select');
    const label = document.getElementById('cns-label');
    const dropdown = document.getElementById('cns-dropdown');
    if (!select || !dropdown) return;

    const niveaux = [...new Set(exercices.flatMap(e => e.tags.niveaux || []))].sort();
    if (!Array.isArray(state.selectedNiveaux)) state.selectedNiveaux = [];

    const updateLabel = () => {
        label.textContent = state.selectedNiveaux.length ? state.selectedNiveaux.join(', ') : 'Tous les niveaux';
    };

    dropdown.innerHTML = '';
    niveaux.forEach(niv => {
        const item = document.createElement('label');
        item.className = 'niveau-option';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = niv;
        cb.checked = state.selectedNiveaux.includes(niv);
        cb.onchange = () => {
            const next = cb.checked
                ? [...new Set([...state.selectedNiveaux, niv])]
                : state.selectedNiveaux.filter(n => n !== niv);
            state.setSelectedNiveaux(next);
            updateLabel();
            refreshViews();
            initGridFilters();
        };

        item.append(cb, document.createTextNode(niv));
        dropdown.appendChild(item);
    });

    select.onclick = (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    };
    document.addEventListener('click', (e) => {
        if (!select.contains(e.target) && !dropdown.contains(e.target)) dropdown.style.display = 'none';
    });

    updateLabel();
}

// --- Couche de jeu ----------------------------------------------------------

function initGameControls() {
    // Contexte du parcours en cours au moment où le robot est activé : le mode
    // démonstration remplace l'activité, mais il ne doit pas FAIRE PERDRE le
    // parcours — en sortant de la démo, on reprend à la même étape.
    let demoReturn = null;

    const captureRunnerContext = () => {
        const r = state.activeSequenceRunner;
        if (!r || !r.step) return null;
        return {
            path: r.path,
            startIndex: r.index,
            deviceMode: r.deviceMode,
            isStudentPath: r.isStudentPath,
            allowStepNavigation: r.allowStepNavigation,
            // On revient d'une démonstration : l'écran « leçon + robot » du
            // mode apprentissage n'a pas à être reproposé pour cette étape.
            skipIntro: true
        };
    };

    const resumeOrFreePlay = () => {
        const back = demoReturn;
        demoReturn = null;
        const banner = document.getElementById('demo-overlay-banner');
        if (banner) banner.style.display = 'none';
        marquerDemo();
        if (back) {
            import('./core/runner.js').then(({ Runner }) => new Runner(back).start());
        } else {
            openGameLayer(state.activeExo, false);
        }
    };

    const close = document.getElementById('btn-close-game');
    if (close) {
        close.onclick = () => {
            demoReturn = null;
            if (state.activeSequenceRunner) state.activeSequenceRunner.abort();
            clearEngines();
            // Le curseur de démonstration vit sur <body>, pas dans la couche de
            // jeu : sans ce balayage, il restait affiché après la fermeture.
            destroyAllDemoCursors();
            journal.flush();
            const gl = document.getElementById('game-layer');
            gl.classList.remove('device-simulator', 'tablet-simulator');
            gl.style.display = 'none';
        };
    }

    const demo = document.getElementById('btn-toggle-demo');
    if (demo) {
        demo.onclick = () => {
            const banner = document.getElementById('demo-overlay-banner');
            const inDemo = banner && banner.style.display === 'flex';
            if (!inDemo) demoReturn = captureRunnerContext() || demoReturn;
            if (state.activeSequenceRunner) state.activeSequenceRunner.abort();
            clearEngines();
            destroyAllDemoCursors();
            if (inDemo) resumeOrFreePlay();
            else openDemo(state.activeExo);
        };
    }

    // La consigne du bandeau tient sur une ligne ; un appui la déplie.
    const bandeau = document.getElementById('demo-overlay-banner');
    if (bandeau) {
        bandeau.onclick = (e) => {
            if (e.target.closest('#btn-start-real-game')) return;
            bandeau.classList.toggle('demo-banner--ouvert');
        };
    }

    const startReal = document.getElementById('btn-start-real-game');
    if (startReal) {
        startReal.onclick = () => {
            clearEngines();
            destroyAllDemoCursors();
            resumeOrFreePlay();
        };
    }

    // L'AIDE VIT DANS SON PROPRE MODULE. Trois onglets — la consigne, un
    // exemple déroulé pas à pas, la leçon — et un exemple engendré par le
    // générateur de l'exercice : cela ne tient plus dans une poignée de lignes
    // ici, et cela se teste séparément.
    const instr = document.getElementById('btn-show-instruction');
    if (instr) {
        instr.onclick = () => import('./ui/aideExercice.js').then(m => m.ouvrirAide());
    }
    const instrClose = document.getElementById('btn-instruction-close');
    if (instrClose) instrClose.onclick = () => {
        document.getElementById('instruction-modal').style.display = 'none';
    };
}

// --- Navigation -------------------------------------------------------------

/**
 * LE COMPTE DE LA PASTILLE.
 *
 * Il doit dire EXACTEMENT ce que l'élève trouvera en ouvrant le carnet, sinon
 * la pastille ment : on compte donc comme le carnet le fait à l'ouverture —
 * les erreurs révisables, non corrigées, hors jeux d'arcade (qui y sont
 * repliées derrière une case à cocher décochée par défaut).
 */
function majPastilleCarnet() {
    const pastille = document.getElementById('carnet-compte');
    if (!pastille) return;
    let n = 0;
    try {
        n = (state.errorHistory || []).filter(e => {
            if (e.corrected || !estRevisable(e.exoId)) return false;
            const exo = e.exoId ? getExerciseById(e.exoId) : null;
            return !(exo && isGame(exo));
        }).length;
    } catch { n = 0; }
    pastille.textContent = n > 99 ? '99+' : String(n);
    pastille.hidden = n === 0;
    const btn = document.getElementById('btn-open-errors');
    if (btn) {
        const t = n === 0 ? 'Mes erreurs à revoir'
            : `${n} erreur${n > 1 ? 's' : ''} à revoir`;
        btn.title = t;
        btn.setAttribute('aria-label', t);
    }
}

function initNavButtons() {
    const back = document.getElementById('btn-back');
    if (back) back.onclick = () => { state.navStack.pop(); renderDrilldown(); syncGridToSidebar(); };

    ['drill', 'acc'].forEach(k => {
        const btn = document.getElementById('desk-btn-' + k);
        if (btn) btn.onclick = () => setSidebarMode(k);
    });

    // LE CARNET D'ERREURS. Il vivait au fond de la page « profil », après les
    // statistiques et les badges : personne n'y descendait. Le bouton ouvre la
    // vue ET amène le carnet sous les yeux, ce qui n'est pas la même chose que
    // « la page contient l'information ».
    const carnet = document.getElementById('btn-open-errors');
    if (carnet) {
        majPastilleCarnet();
        ['errors_updated', 'attempts_updated', 'error_corrected']
            .forEach(evt => document.addEventListener(evt, majPastilleCarnet));
        carnet.onclick = () => {
            setTopNavMode('profile');
            const cible = document.getElementById('error-log-container');
            if (cible) {
                requestAnimationFrame(() => {
                    cible.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    cible.classList.add('carnet-vu');
                    setTimeout(() => cible.classList.remove('carnet-vu'), 1600);
                });
            }
        };
    }

    ['grid', 'path', 'profile'].forEach(k => {
        const top = document.getElementById('top-btn-' + k);
        if (top) top.onclick = () => setTopNavMode(k);

        const mob = document.getElementById('mob-btn-' + k);
        if (mob) mob.onclick = () => {
            setTopNavMode(k);
            document.getElementById('sidebar').classList.remove('mob-active');
            document.getElementById('main-area').classList.add('mob-active');
            ['grid', 'path', 'profile'].forEach(t => {
                const b = document.getElementById('mob-btn-' + t);
                if (b) b.classList.toggle('active', t === k);
            });
            const drillBtn = document.getElementById('mob-btn-drill-acc');
            if (drillBtn) drillBtn.classList.remove('active');
        };
    });

    const codeBtn = document.getElementById('top-btn-code');
    if (codeBtn) codeBtn.onclick = () => {
        document.getElementById('code-modal').style.display = 'flex';
        const input = document.getElementById('student-code-input');
        if (input) input.focus();
    };

    // Tiroir du catalogue (professeur sur téléphone) : la poignée et le ☰
    // ouvrent et ferment la même feuille coulissante.
    const setDrawer = (ouvert) => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('drawer-open', ouvert);
        sidebar.style.transform = '';
        sidebar.style.transition = '';
        const handle = document.getElementById('drawer-handle');
        if (handle) handle.setAttribute('aria-expanded', String(ouvert));
    };
    const toggleDrawer = () => {
        setDrawer(!document.getElementById('sidebar').classList.contains('drawer-open'));
    };

    // La poignée se TIRE, comme un vrai tiroir : la feuille suit le doigt et
    // se cale ouverte ou fermée au relâcher. Indispensable sur iPhone, où la
    // barre de Safari (en bas de l'écran) avale volontiers un simple tap au
    // bord — le glissement, lui, est capturé par la poignée. Le tap reste
    // possible, et le ☰ aussi.
    const handle = document.getElementById('drawer-handle');
    if (handle) {
        let departY = null, enTraction = false, vientDeTirer = false;

        handle.addEventListener('pointerdown', (e) => {
            departY = e.clientY;
            enTraction = false;
            try { handle.setPointerCapture(e.pointerId); } catch (err) { /* Safari ancien */ }
        });

        handle.addEventListener('pointermove', (e) => {
            if (departY === null) return;
            const sidebar = document.getElementById('sidebar');
            const dy = e.clientY - departY;
            if (!enTraction && Math.abs(dy) < 8) return;
            enTraction = true;
            const h = sidebar.offsetHeight;
            const ferme = h - 52;
            const base = sidebar.classList.contains('drawer-open') ? 0 : ferme;
            const off = Math.max(0, Math.min(base + dy, ferme));
            sidebar.style.transition = 'none';
            sidebar.style.transform = `translateY(${off}px)`;
        });

        const finTraction = (e) => {
            if (departY === null) return;
            const sidebar = document.getElementById('sidebar');
            if (enTraction) {
                const h = sidebar.offsetHeight;
                const ferme = h - 52;
                const base = sidebar.classList.contains('drawer-open') ? 0 : ferme;
                const off = Math.max(0, Math.min(base + (e.clientY - departY), ferme));
                setDrawer(off < ferme / 2);
                vientDeTirer = true;
                setTimeout(() => { vientDeTirer = false; }, 400);
            }
            departY = null;
            enTraction = false;
        };
        handle.addEventListener('pointerup', finTraction);
        handle.addEventListener('pointercancel', () => {
            const sidebar = document.getElementById('sidebar');
            sidebar.style.transform = '';
            sidebar.style.transition = '';
            departY = null; enTraction = false;
        });

        // Le tap simple bascule — sauf s'il conclut une traction (le clic
        // synthétisé suivrait le pointerup et annulerait le geste).
        handle.addEventListener('click', () => {
            if (vientDeTirer) return;
            toggleDrawer();
        });
    }

    const toggleSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        const mobile = window.innerWidth <= 768 || document.body.classList.contains('mobile-view');
        // En professeur sur téléphone, le catalogue est un tiroir : le ☰
        // l'ouvre et le ferme, comme sa poignée.
        if (mobile && state.isTeacherMode) return toggleDrawer();
        sidebar.classList.toggle(mobile ? 'mob-active' : 'collapsed');
    };
    const burger = document.getElementById('btn-toggle-sidebar');
    if (burger) burger.onclick = toggleSidebar;

    initMobileDrillToggle();
    initTheme();
}

function initMobileDrillToggle() {
    const btn = document.getElementById('mob-btn-drill-acc');
    if (!btn) return;
    btn.onclick = () => {
        const sidebar = document.getElementById('sidebar');
        const wasActive = sidebar.classList.contains('mob-active');
        sidebar.classList.add('mob-active');
        sidebar.classList.remove('collapsed');
        document.getElementById('main-area').classList.remove('mob-active');

        ['grid', 'path', 'profile'].forEach(t => {
            const b = document.getElementById('mob-btn-' + t);
            if (b) b.classList.remove('active');
        });
        btn.classList.add('active');

        const isDrill = document.getElementById('view-drilldown').style.display !== 'none';
        const next = wasActive ? (isDrill ? 'acc' : 'drill') : (isDrill ? 'drill' : 'acc');
        setSidebarMode(next);
        btn.querySelector('span').textContent = next === 'acc' ? 'Arbre' : 'Clic';
    };
}

function initTheme() {
    const themes = ['light', 'dark', 'ocean', 'forest', 'sunset'];
    const btn = document.getElementById('btn-toggle-theme');
    if (!btn) return;
    btn.onclick = () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = themes[(themes.indexOf(current) + 1) % themes.length];
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('mathbox-theme', next);
    };
}

// --- Barre de débogage ------------------------------------------------------

/**
 * Infobulle ET nom accessible d'un bouton à icône.
 *
 * Une icône seule ne dit ni ce qu'elle fait ni dans quel état elle se trouve :
 * ce qui était écrit sur le bouton doit se retrouver quelque part, sous peine
 * de rendre la palette illisible au survol comme au lecteur d'écran.
 */
function etiquette(btn, texte) {
    btn.title = texte;
    btn.setAttribute('aria-label', texte);
}

function initDebugToolbar() {
    initDebugBar();

    // Version affichée = celle des fichiers RÉELLEMENT chargés, lue sur
    // l'URL de la feuille de style. Si le téléphone montre un vieux numéro,
    // c'est que le cache (ou le service worker) sert encore l'ancienne
    // version — recharger une seconde fois suffit en général.
    const versionEl = document.getElementById('db-version');
    if (versionEl) {
        const lien = document.querySelector('link[href*="base.css"]');
        const m = lien && lien.getAttribute('href').match(/v=(\d+)/);
        versionEl.textContent = m ? `v${m[1]}` : '';
    }

    const btnMobile = document.getElementById('db-toggle-mobile');
    if (btnMobile) {
        const syncMobile = () => {
            etiquette(btnMobile, `Vue mobile : ${state.isMobileView ? 'activée' : 'désactivée'}`);
            btnMobile.classList.toggle('active', state.isMobileView);
        };
        syncMobile();
        btnMobile.onclick = () => {
            state.isMobileView = !state.isMobileView;
            // Le choix manuel est mémorisé : il l'emporte sur la détection
            // automatique aux prochains démarrages.
            try { localStorage.setItem('mathbox-device', state.isMobileView ? 'mobile' : 'desktop'); } catch (e) { }
            syncMobile();
            document.body.classList.toggle('mobile-view', state.isMobileView);
            document.body.style.overflowX = state.isMobileView ? 'hidden' : '';
            if (state.isMobileView) document.getElementById('sidebar').classList.add('mob-active');
        };
    }

    const btnRole = document.getElementById('db-toggle-role');
    if (btnRole) {
        const syncRole = () => {
            etiquette(btnRole, `Mode : ${state.isTeacherMode ? 'professeur' : 'élève'}`);
            btnRole.classList.toggle('active', state.isTeacherMode);
        };
        syncRole();
        btnRole.onclick = () => {
            state.isTeacherMode = !state.isTeacherMode;
            syncRole();
            document.body.classList.toggle('teacher-mode', state.isTeacherMode);
            setTopNavMode(state.isTeacherMode ? 'teacher' : 'grid');
            refreshViews();
        };
    }

    initStatusFilter();

    const btnClear = document.getElementById('db-clear-storage');
    if (btnClear) {
        btnClear.onclick = () => {
            window.appConfirm('Réinitialisation',
                'Effacer toutes les données locales de ce poste ?<br><br>'
                + '<b>Le carnet du banc d\'essai est conservé.</b> Une passe s\'étale sur '
                + 'plusieurs soirées, et ce bouton sert justement à repartir d\'un profil '
                + 'propre POUR continuer à tester.', async () => {
                // Le carnet du banc est un travail d'auteur, pas une donnée
                // d'élève : le perdre en vidant un profil de test coûterait
                // plusieurs soirées de relevés.
                let carnet = null;
                try { carnet = window.localStorage.getItem('mathbox-banc-essai'); } catch (e) { /* privé */ }
                if (typeof localforage !== 'undefined') await localforage.clear();
                try {
                    window.localStorage.clear();
                    if (carnet) window.localStorage.setItem('mathbox-banc-essai', carnet);
                } catch (e) { /* mode privé */ }
                window.location.reload();
            });
        };
    }

    const btnFake = document.getElementById('db-fake-data');
    if (btnFake) btnFake.onclick = generateSampleData;

    const btnConsole = document.getElementById('db-console');
    if (btnConsole) btnConsole.onclick = () => openConsoleModal();

    // Les nouveautés : la liste de ce qui vient d'arriver, avec de quoi
    // l'essayer et de quoi en voir la fiche.
    const btnNeuf = document.getElementById('db-nouveautes');
    if (btnNeuf) btnNeuf.onclick = async () => {
        const { openNouveautesModal } = await import('./ui/nouveautesUI.js');
        openNouveautesModal();
    };

    // Le banc d'essai : chargé à la demande. C'est un outil d'auteur, il n'a
    // aucune raison de peser sur le démarrage d'un élève.
    const btnBanc = document.getElementById('db-banc');
    if (btnBanc) btnBanc.onclick = () => import('./ui/bancEssai.js').then(m => m.ouvrirBancEssai());

    // La barre de passe : la version d'une ligne du banc, posée par-dessus le
    // jeu. On l'allume et on l'éteint du même bouton.
    const btnRevue = document.getElementById('db-revue');
    if (btnRevue) btnRevue.onclick = () => import('./ui/revue.js').then(m => m.ouvrirRevue());

    const btnBarre = document.getElementById('db-banc-barre');
    if (btnBarre) btnBarre.onclick = () => import('./ui/bancEssai.js').then(m => m.basculerBarreBanc());

    // Passer la question en cours, ou revenir sur la précédente, quel que soit
    // l'exercice. Reculer manquait : on dépassait d'un cran la question qu'on
    // voulait examiner et il fallait relancer l'exercice depuis le début.
    const naviguer = (methode, rate) => async () => {
        const { showToast } = await import('./ui/modal.js');
        const runner = state.activeSequenceRunner;
        if (!runner || typeof runner[methode] !== 'function' || !runner[methode]()) {
            showToast(runner ? rate : 'Aucun exercice en cours.', 'warning');
        }
    };
    const btnSkip = document.getElementById('db-skip');
    if (btnSkip) btnSkip.onclick = naviguer('sauterQuestion', 'Impossible d\'avancer ici.');
    const btnBack = document.getElementById('db-back');
    if (btnBack) btnBack.onclick = naviguer('revenirQuestion', 'Cet exercice ne sait pas revenir en arrière.');

    // La solution : chaque jeu décide s'il sait la montrer. Aucun ne la donne
    // à l'élève — le bouton n'existe que dans la palette d'auteur.
    const btnSol = document.getElementById('db-solution');
    if (btnSol) btnSol.onclick = async () => {
        const { showToast } = await import('./ui/modal.js');
        const jeu = state.activeSequenceRunner && state.activeSequenceRunner.handle
            && state.activeSequenceRunner.handle.jeu;
        if (!jeu || typeof jeu.montrerSolution !== 'function' || !jeu.montrerSolution()) {
            showToast(jeu ? 'Ce jeu ne sait pas montrer sa solution.' : 'Aucun jeu en cours.', 'warning');
        }
    };
}

/**
 * Filtre d'état de publication du catalogue.
 *
 * Outil d'auteur : à mesure que le catalogue grandit, on veut isoler ce qu'on
 * est en train de mettre au point. Le bouton fait défiler les états et affiche
 * le nombre d'exercices concernés — utile pour repérer d'un coup d'œil qu'on a
 * oublié de repasser quelque chose en « validé ».
 */
function initStatusFilter() {
    const btn = document.getElementById('db-filter-status');
    if (!btn) return;

    // Un tracé par état, dans le même trait que les autres icônes de la
    // palette : cible, clé, coche, carton. L'émoji rendait ce bouton — le seul
    // qui change d'aspect — dépendant du jeu de glyphes du système.
    const ICONS = {
        tout: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/>',
        test: '<path d="M14.5 4.5a4 4 0 0 0 5 5L21 8v5l-8.5 8.5a2.5 2.5 0 0 1-3.5 0l-2.5-2.5a2.5 2.5 0 0 1 0-3.5L15 7"/>',
        valide: '<path d="M4.5 12.5 10 18 19.5 6.5"/>',
        brouillon: '<path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z"/><path d="M3 8.5 12 13l9-4.5M12 13v7"/>'
    };
    const NAMES = { tout: 'Tout', ...STATUS_LABELS };

    const render = () => {
        const filter = state.catalogFilter || 'tout';
        const counts = countByStatus(exercices);
        const n = filter === 'tout' ? exercices.length : counts[filter];
        btn.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[filter] || ICONS.tout}</svg>`;
        etiquette(btn, `Catalogue : ${NAMES[filter]} (${n}) — cliquer pour changer d'état`);
        btn.classList.toggle('active', filter !== 'tout');
    };

    btn.onclick = async () => {
        const i = STATUS_CYCLE.indexOf(state.catalogFilter || 'tout');
        await state.setCatalogFilter(STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]);
        render();
        refreshViews();
        initGridFilters();
    };

    render();
}

/**
 * Jeu de données de démonstration : produit de vraies tentatives via le
 * journal, donc statistiques, maîtrise, carnet d'erreurs et bilans se
 * remplissent exactement comme en usage réel. Génère aussi un parcours
 * d'exemple complet — enregistré côté professeur ET assigné à l'élève —
 * pour tester la carte des mondes, le mode apprentissage et le reste sans
 * rien construire à la main.
 */
/**
 * Construit le « Parcours découverte » : cinq étapes variées en mode
 * apprentissage. C'est le parcours d'exemple livré avec l'application.
 */
async function buildDiscoveryPath() {
    const [{ makeStep, makePath }, { apprentissagePolicy }] = await Promise.all([
        import('./core/path.js'), import('./core/policy.js')
    ]);
    const steps = [
        makeStep('calc-add', {}, { nbItems: 5, threshold: 3 }),
        makeStep('calc-mult-flash', {}, { nbItems: 5, threshold: 3 }),
        makeStep('frac-compare', { memeDenominateur: 'identiques' }, { nbItems: 5, threshold: 3 }),
        makeStep('mes-perimetre', {}, { nbItems: 4, threshold: 3 }),
        makeStep('calc-prio-resultat', {}, { nbItems: 5, threshold: 3 })
    ];
    return makePath('Parcours découverte', steps, apprentissagePolicy());
}

/**
 * LE PARCOURS « TOUT SUR PAPIER » : un exemplaire de CHAQUE exercice qui sait
 * s'imprimer, dans l'ordre du catalogue.
 *
 * Il sert à vérifier la fiche d'un seul coup d'œil — orientation, colonnes,
 * champs remplissables, corrigés — sans composer la même séance à la main à
 * chaque essai. Il se construit à partir du CATALOGUE et non d'une liste
 * écrite ici : un exercice imprimable ajouté demain y entrera tout seul, et
 * aucun exercice retiré n'y laissera un trou.
 */
async function buildPrintablePath() {
    const [{ makeStep, makePath }, { exercices }, { getGenerator }] = await Promise.all([
        import('./core/path.js'), import('./data/catalog.js'), import('./core/registry.js')
    ]);
    const surPapier = exercices.filter(e => {
        if (e.printable) return true;
        const gen = e.generatorId ? getGenerator(e.generatorId) : null;
        return !!(gen && gen.ecrit);
    });
    // Peu de questions par exercice : la fiche doit rester feuilletable. Six
    // grilles, en revanche, plutôt que deux : c'est le nombre qui permet
    // d'essayer les mises en page à trois, quatre ou six par ligne. Avec deux
    // grilles seulement, « quatre par ligne » ne peut rien montrer.
    const steps = surPapier.map(e => makeStep(e.id, {}, { nbItems: 6, threshold: 1 }));
    return makePath(`Tout sur papier (${steps.length} exercices)`, steps);
}

/**
 * Au premier lancement (aucun parcours sur ce poste), un parcours d'exemple
 * est créé d'office : l'élève le trouve dans « Mon Parcours » sous « Parcours
 * du professeur », et le professeur dans 📂 Mes Parcours — de quoi tout
 * essayer sans rien construire.
 */
async function seedExamplePath() {
    // Le parcours de découverte n'a lieu d'être que sur un poste vierge : on ne
    // va pas reposer un exemple devant un professeur qui a déjà bâti ses
    // séances.
    if (!state.teacherPaths.length) {
        const path = await buildDiscoveryPath();
        state.saveTeacherPath(path.name, path);
    }
    // « TOUT SUR PAPIER », EN REVANCHE, SE POSE TOUJOURS.
    //
    // Il était à l'intérieur du « poste vierge » : un professeur qui avait créé
    // ne serait-ce qu'un parcours ne l'a donc jamais vu. Or c'est la feuille de
    // vérification — celle qui contient tous les exercices imprimables du
    // catalogue, pour regarder la présentation de chacun. Elle doit être là, et
    // à jour, à chaque démarrage.
    await semerParcoursPapier();
}

/**
 * Pose (ou remet à jour) le parcours « Tout sur papier ». Son contenu suit le
 * catalogue : on le RECALCULE au lieu de le laisser vieillir, sinon un
 * exercice imprimable ajouté après coup manquerait à la vérification.
 */
async function semerParcoursPapier() {
    const papier = await buildPrintablePath();
    const ancien = state.teacherPaths.find(p => /^Tout sur papier/.test(p.name));
    if (ancien) state.updateTeacherPath(ancien.id, papier.name, papier);
    else state.saveTeacherPath(papier.name, papier);
}

async function generateSampleData() {
    if (!state.teacherPaths.some(p => p.name === 'Parcours découverte')) {
        const path = await buildDiscoveryPath();
        state.saveTeacherPath(path.name, path);
    }

    await semerParcoursPapier();

    // Assigné à l'élève : la carte des mondes de « Mon Parcours » se remplit
    // comme si un code avait été saisi.
    const saved = state.teacherPaths.find(p => p.name === 'Parcours découverte');
    if (saved && (!state.studentPath || !state.studentPath.steps || !state.studentPath.steps.length)) {
        state.setStudentPath(saved.data.steps, {
            pathId: saved.data.id, name: saved.name, policy: saved.data.policy
        });
    }

    genererTentativesExemple();
}

function genererTentativesExemple() {
    const now = Date.now();
    const DAY = 86400000;
    const scenario = [
        { skillId: 'num.mult.table.7', ok: 2, ko: 6, q: '7 × 8', given: '54', expected: '56' },
        { skillId: 'num.mult.table.8', ok: 4, ko: 3, q: '8 × 6', given: '46', expected: '48' },
        { skillId: 'num.mult.table.3', ok: 9, ko: 1, q: '3 × 9', given: '24', expected: '27' },
        { skillId: 'num.add.entiers', ok: 11, ko: 1, q: '8 + 7', given: '14', expected: '15' },
        { skillId: 'num.prio', ok: 3, ko: 5, q: '2 + 3 × 4', given: '20', expected: '14' }
    ];

    scenario.forEach((s, si) => {
        for (let i = 0; i < s.ok; i++) {
            state.recordAttempt({
                correct: true, skillId: s.skillId, points: 10, attemptIndex: 0,
                questionText: s.q, itemSeed: `demo_${si}_ok_${i}`,
                exerciseId: 'calc-mult-flash', exerciseTitle: 'Flash Mult'
            });
        }
        for (let i = 0; i < s.ko; i++) {
            state.recordAttempt({
                correct: false, skillId: s.skillId, attemptIndex: 0,
                questionText: s.q, given: s.given, expected: s.expected,
                itemSeed: `demo_${si}_ko_${i}`,
                misconception: 'Tu as compté une fois de trop.',
                exerciseId: 'calc-mult-flash', exerciseTitle: 'Flash Mult'
            });
        }
    });

    state.addTime('calc-mult-flash', 640);
    journal.flush();
    import('./ui/modal.js').then(m => m.showToast('Données d\'exemple et « Parcours découverte » générés.', 'success'));
}
