// Amorçage de l'application.
//
// L'ordre compte : le registre des générateurs et des activités doit être
// peuplé avant que le catalogue ne soit interrogé (il en déduit les schémas de
// configuration et les compétences travaillées). D'où cet import en premier.
import './core/activities/index.js';

import { state } from './core/state.js';
import { journal } from './core/journal.js';
import { clearEngines } from './core/timers.js';
import { openGameLayer, openDemo } from './games/engine.js';
import { validateCatalog } from './core/registry.js';
import { exercices, countByStatus, STATUS_LABELS, STATUS_CYCLE } from './data/catalog.js';
import {
    initAccordion, renderDrilldown, initGridFilters,
    setSidebarMode, setTopNavMode, initSidebarSearch
} from './ui/navigation.js';
import { initBuilder } from './ui/builder.js';
import { initImportExport } from './core/importExport.js';
import { initProfileUI } from './ui/profileUI.js';
import { initStudentCodeUI, applyCode } from './ui/studentCodeUI.js';
import { initGameFeedbackUI } from './ui/gameFeedbackUI.js';
import { initGamificationEngine } from './core/gamification.js';
import { initGamificationUI } from './ui/gamificationUI.js';
import { initSync } from './core/sync.js';
import { initSyncUI } from './ui/syncUI.js';

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
    initGamificationEngine();
    initGamificationUI();
    initGameFeedbackUI();

    await state.load();
    initSync();

    // Cohérence du catalogue : mieux vaut un avertissement au démarrage
    // qu'un échec silencieux au lancement d'un exercice.
    const problems = validateCatalog(exercices);
    if (problems.length) console.warn('[catalogue] incohérences détectées :\n' + problems.join('\n'));

    initNiveauFilter();
    initImportExport();
    refreshViews();
    setSidebarMode('drill');
    setTopNavMode('grid');
    initGridFilters();
    initSidebarSearch();
    initBuilder();
    initStudentCodeUI();
    initProfileUI();
    initSyncUI();
    initGameControls();
    initNavButtons();
    initDebugToolbar();

    // Parcours partagé par lien.
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) applyCode(code, { autoStart: true });

    window.showGameConfigUI = (step, onSave, containerId = 'builder-config-content') => {
        import('./games/configUI.js').then(m => m.renderGameConfigUI(step, onSave, containerId));
    };
});

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
    const close = document.getElementById('btn-close-game');
    if (close) {
        close.onclick = () => {
            if (state.activeSequenceRunner) state.activeSequenceRunner.abort();
            clearEngines();
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
            if (state.activeSequenceRunner) state.activeSequenceRunner.abort();
            clearEngines();
            if (inDemo) openGameLayer(state.activeExo, false);
            else openDemo(state.activeExo);
        };
    }

    const startReal = document.getElementById('btn-start-real-game');
    if (startReal) {
        startReal.onclick = () => {
            clearEngines();
            const banner = document.getElementById('demo-overlay-banner');
            if (banner) banner.style.display = 'none';
            openGameLayer(state.activeExo, false);
        };
    }

    const instr = document.getElementById('btn-show-instruction');
    if (instr) {
        instr.onclick = () => {
            const exo = state.activeExo;
            document.getElementById('instruction-text').textContent =
                exo && exo.instruction ? exo.instruction : 'Aucune consigne disponible pour cet exercice.';
            document.getElementById('instruction-modal').style.display = 'flex';
        };
    }
    const instrClose = document.getElementById('btn-instruction-close');
    if (instrClose) instrClose.onclick = () => {
        document.getElementById('instruction-modal').style.display = 'none';
    };
}

// --- Navigation -------------------------------------------------------------

function initNavButtons() {
    const back = document.getElementById('btn-back');
    if (back) back.onclick = () => { state.navStack.pop(); renderDrilldown(); };

    ['drill', 'acc'].forEach(k => {
        const btn = document.getElementById('desk-btn-' + k);
        if (btn) btn.onclick = () => setSidebarMode(k);
    });

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

    const toggleSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        const mobile = window.innerWidth <= 768 || document.body.classList.contains('mobile-view');
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

function initDebugToolbar() {
    const btnMobile = document.getElementById('db-toggle-mobile');
    if (btnMobile) {
        btnMobile.onclick = () => {
            state.isMobileView = !state.isMobileView;
            btnMobile.textContent = `📱 Vue Mobile : ${state.isMobileView ? 'ON' : 'OFF'}`;
            btnMobile.classList.toggle('active', state.isMobileView);
            document.body.classList.toggle('mobile-view', state.isMobileView);
            document.body.style.overflowX = state.isMobileView ? 'hidden' : '';
            if (state.isMobileView) document.getElementById('sidebar').classList.add('mob-active');
        };
    }

    const btnRole = document.getElementById('db-toggle-role');
    if (btnRole) {
        btnRole.onclick = () => {
            state.isTeacherMode = !state.isTeacherMode;
            btnRole.textContent = `👨‍🏫 Mode : ${state.isTeacherMode ? 'Professeur' : 'Élève'}`;
            btnRole.classList.toggle('active', state.isTeacherMode);
            document.body.classList.toggle('teacher-mode', state.isTeacherMode);
            setTopNavMode(state.isTeacherMode ? 'teacher' : 'grid');
            refreshViews();
        };
    }

    initStatusFilter();

    const btnClear = document.getElementById('db-clear-storage');
    if (btnClear) {
        btnClear.onclick = () => {
            window.appConfirm('Réinitialisation', 'Effacer toutes les données locales de ce poste ?', async () => {
                if (typeof localforage !== 'undefined') await localforage.clear();
                try { window.localStorage.clear(); } catch (e) { /* mode privé */ }
                window.location.reload();
            });
        };
    }

    const btnFake = document.getElementById('db-fake-data');
    if (btnFake) btnFake.onclick = generateSampleData;
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

    const ICONS = { tout: '🎯', test: '🔧', valide: '✅', brouillon: '📦' };
    const NAMES = { tout: 'Tout', ...STATUS_LABELS };

    const render = () => {
        const filter = state.catalogFilter || 'tout';
        const counts = countByStatus(exercices);
        const n = filter === 'tout' ? exercices.length : counts[filter];
        btn.textContent = `${ICONS[filter]} Catalogue : ${NAMES[filter]} (${n})`;
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
 * remplissent exactement comme en usage réel.
 */
function generateSampleData() {
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
    import('./ui/modal.js').then(m => m.showToast('Données de démonstration générées.', 'success'));
}
