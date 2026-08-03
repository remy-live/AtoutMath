// Point d'entrée du lancement d'un exercice.
//
// Ne fait plus d'`import('./' + gameType + '.js?v=' + Date.now())` : la
// résolution passe par le registre, qui sait ce que chaque brique accepte et
// charge les modules une seule fois (le cache-buster rechargeait le module à
// chaque partie, sans raison).

import { clearEngines } from '../core/timers.js';
import { state } from '../core/state.js';
import { getActivity, getGenerator } from '../core/registry.js';
import { pauserDemo, reglerVitesseDemo, vitesseDemo, interrompreDemo } from '../core/demoPointer.js';
import { ItemSession } from '../core/itemSession.js';
import { makePath, makeStep } from '../core/path.js';
import { defaultPolicy } from '../core/policy.js';
import { paramSchemaOf } from '../data/catalog.js';

/**
 * Ouvre un exercice en plein écran.
 * @param {Object} exo - descripteur du catalogue
 * @param {boolean} startAsDemo
 */
export function openGameLayer(exo, startAsDemo) {
    if (!exo) return;

    if (startAsDemo) return openDemo(exo);

    // Réglages avant partie, si l'exercice en propose et qu'aucun n'est fourni.
    const schema = paramSchemaOf(exo);
    const needsConfig = schema.length > 0 && !exo.internalStudentConfig;

    if (needsConfig && !state.isTeacherMode) {
        import('./configUI.js').then(m => {
            m.showStudentConfigModal(exo, (params) => launchFreePlay(exo, params));
        });
        return;
    }
    if (needsConfig && state.isTeacherMode && window.showGameConfigUI) {
        window.showGameConfigUI(exo, (params) => launchFreePlay(exo, params));
        return;
    }
    launchFreePlay(exo, { ...(exo.params || {}) });
}

/**
 * Entraînement libre : un parcours d'une seule étape. Passer par le même
 * moteur que les parcours du professeur garantit que le suivi (tentatives,
 * temps, compétences) est identique, quel que soit le point d'entrée.
 */
function launchFreePlay(exo, params) {
    const { nbQuestions, successThreshold, timeLimit, ...overrides } = params || {};
    const nbItems = nbQuestions || 10;

    const step = makeStep(exo.id, overrides, {
        nbItems,
        threshold: successThreshold || Math.ceil(nbItems * 0.7),
        timeLimit: timeLimit || (exo.params && exo.params.timeLimit) || null
    });

    const path = makePath(exo.title, [step], defaultPolicy());

    import('../core/runner.js').then(({ Runner }) => {
        const runner = new Runner({
            path,
            deviceMode: state.isTeacherMode ? (state.previewDeviceMode === 'desktop' ? 'none' : state.previewDeviceMode) : 'none'
        });
        runner.start();
    });
}

// --- Démonstration ----------------------------------------------------------
// L'aperçu joue tout seul, sans rien enregistrer : c'est un outil de
// présentation pour le professeur, pas une session de travail.

export function openDemo(exo) {
    state.activeExo = exo;
    const gl = document.getElementById('game-layer');
    document.getElementById('game-title').textContent = exo.title;
    gl.style.display = 'flex';

    const banner = document.getElementById('demo-overlay-banner');
    if (banner) {
        const msg = document.getElementById('demo-banner-text');
        if (msg) msg.textContent = `Mode Aperçu${exo.instruction ? ' : ' + exo.instruction : ''}`;
        banner.style.display = 'flex';
    }
    const progress = document.getElementById('game-progress-container');
    if (progress) progress.style.display = 'none';

    // Plein écran : le robot commente. C'est ici, et seulement ici, qu'il y a
    // la place pour une bulle de parole et le temps de la lire.
    brancherCommandesDemo(exo, launchPreview(exo, document.getElementById('game-board'), null, { narration: true }));
}

// Vitesses proposées, dans l'ordre du bouton. Le ralenti d'abord : c'est celui
// qu'on cherche quand on commente une démonstration à voix haute.
const VITESSES = [1, 0.5, 2];

const ICONE_PAUSE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
const ICONE_LECTURE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>';

/**
 * Commandes du « mode robot » : pause, vitesse, question précédente/suivante.
 *
 * Le robot enchaînait sans jamais s'arrêter : sur le Mathdoku, il remplit une
 * grille entière en quelques secondes, et il n'y avait aucun moyen de figer
 * l'image pour commenter un placement, ni de revoir celui qu'on venait de
 * manquer.
 */
function brancherCommandesDemo(exo, promesse) {
    const barre = document.getElementById('demo-controls');
    if (!barre) return;

    const activite = getActivity(exo.activityId);
    // Les jeux autonomes (Tetris, Course, Labyrinthe…) jouent leur
    // démonstration avec leurs propres minuteurs : ni le pointeur ni la
    // navigation par question ne les pilotent. Des boutons sans effet
    // vaudraient moins que pas de boutons du tout.
    barre.hidden = !!(activite && activite.supports && activite.supports.autonomous);
    if (barre.hidden) return;

    const btnPause = document.getElementById('btn-demo-pause');
    const btnVitesse = document.getElementById('btn-demo-speed');
    const btnPrev = document.getElementById('btn-demo-prev');
    const btnNext = document.getElementById('btn-demo-next');

    const afficherPause = (enPause) => {
        btnPause.innerHTML = enPause ? ICONE_LECTURE : ICONE_PAUSE;
        btnPause.title = enPause ? 'Reprendre' : 'Mettre en pause';
        btnPause.setAttribute('aria-label', btnPause.title);
        btnPause.setAttribute('aria-pressed', String(enPause));
        btnPause.classList.toggle('demo-ctrl--actif', enPause);
    };
    const afficherVitesse = () => {
        const v = vitesseDemo();
        btnVitesse.textContent = `×${v}`;
        btnVitesse.classList.toggle('demo-ctrl--actif', v !== 1);
    };

    // Chaque ouverture repart de l'allure normale, en marche : la pause laissée
    // par la démonstration précédente donnerait un écran figé sans explication.
    pauserDemo(false);
    reglerVitesseDemo(1);
    afficherPause(false);
    afficherVitesse();

    btnPause.onclick = () => afficherPause(pauserDemo());
    btnVitesse.onclick = () => {
        reglerVitesseDemo(VITESSES[(VITESSES.indexOf(vitesseDemo()) + 1) % VITESSES.length]);
        afficherVitesse();
    };

    btnPrev.disabled = btnNext.disabled = true;
    Promise.resolve(promesse).then(handle => {
        // Changer de question pendant une démonstration exige d'abord de
        // dénouer celle qui joue : c'est une fonction suspendue sur un `await`,
        // et elle continuerait sinon à piloter la question suivante.
        const aller = (fn) => () => {
            interrompreDemo();
            pauserDemo(false);
            afficherPause(false);
            fn();
        };
        if (handle && handle.showPrevious) {
            btnPrev.disabled = false;
            btnPrev.onclick = aller(() => handle.showPrevious());
        }
        if (handle && handle.showNext) {
            btnNext.disabled = false;
            btnNext.onclick = aller(() => handle.showNext());
        }
    });
}

/**
 * Lance un aperçu autonome dans n'importe quel conteneur (plein écran, ou
 * la vignette de survol du catalogue).
 */
// Durée laissée à un jeu historique pour dessiner sa première image avant
// d'être figé. Une seconde et demie parce que plusieurs mettent leur scène en
// place progressivement : les météorites du jeu de tir apparaissent à 60-210
// pixels AU-DESSUS de l'arène et doivent y descendre, la course doit lancer sa
// piste. Coupé plus tôt, on photographiait un écran encore vide.
// Seuls ces jeux paient ce délai : les activités modernes se dessinent d'un
// coup, leur vignette est immédiate.
const DELAI_PREMIERE_IMAGE = 1500;

// Le gel est INDIVIDUEL : `handle.pause()` n'arrête que ce jeu-là. C'est ce
// qui permet de monter les vignettes toutes ensemble ; tant que geler
// signifiait `clearEngines()`, chacune devait attendre la précédente.
function gelerApres(handle) {
    return new Promise(resolve => {
        setTimeout(() => {
            if (handle && typeof handle.pause === 'function') handle.pause();
            resolve(handle);
        }, DELAI_PREMIERE_IMAGE);
    });
}

export function launchPreview(exo, container, params = null, opts = {}) {
    const frozen = !!opts.frozen;
    // Une vignette ne coupe pas les minuteurs des autres : elle vit dans son
    // propre conteneur et sera gelée individuellement. Une démonstration, si :
    // il n'en joue qu'une à la fois.
    if (!frozen) clearEngines();
    container.innerHTML = '';

    const activity = getActivity(exo.activityId);
    if (!activity) return null;

    const effective = { ...(exo.params || {}), ...(params || {}) };

    return activity.load().then(mod => {
        if (activity.supports.autonomous) {
            const fn = mod[activity.legacyExport] || Object.values(mod).find(v => typeof v === 'function');
            if (!fn) return null;
            const handle = fn(container, true, effective);
            // Les jeux historiques n'ont pas de notion d'aperçu figé : ils sont
            // entièrement pilotés par des minuteurs, et leur toute première
            // image ne montre RIEN — canevas noir du jeu de tir, grille de
            // Crush encore vide, piste de course déserte. Les couper aussitôt
            // donnait des vignettes vides. On les laisse donc jouer le temps
            // de poser une image, puis on gèle.
            if (frozen) return gelerApres(handle);
            return handle;
        }
        const generator = getGenerator(exo.generatorId);
        if (!generator) return null;
        const session = new ItemSession({
            generator, params: effective, exercise: exo, isDemo: true, frozen,
            narration: !!opts.narration,
            preferredKind: activity.accepts[0]
        });
        return mod.mount(container, session, activity.mountOptions || {});
    }).catch(err => {
        console.error(`[engine] impossible de lancer ${exo.id}`, err);
        return null;
    });
}

// Conservé : quelques appels historiques passent encore par là.
export function launchEngine(exo, container, isDemo) {
    return isDemo ? launchPreview(exo, container) : openGameLayer(exo, false);
}
