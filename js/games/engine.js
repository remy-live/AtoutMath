// Point d'entrée du lancement d'un exercice.
//
// Ne fait plus d'`import('./' + gameType + '.js?v=' + Date.now())` : la
// résolution passe par le registre, qui sait ce que chaque brique accepte et
// charge les modules une seule fois (le cache-buster rechargeait le module à
// chaque partie, sans raison).

import { clearEngines } from '../core/timers.js';
import { destroyAllDemoCursors, setDemoMuet, marquerDemo } from '../core/demoPointer.js';
import { state } from '../core/state.js';
import { getActivity, getGenerator } from '../core/registry.js';
import { ItemSession } from '../core/itemSession.js';
import { makePath, makeStep } from '../core/path.js';
import { defaultPolicy } from '../core/policy.js';
import { paramSchemaOf } from '../data/catalog.js';
import { accessOf, lockLabel } from '../core/gameAccess.js';

/**
 * Ouvre un exercice en plein écran.
 * @param {Object} exo - descripteur du catalogue
 * @param {boolean} startAsDemo
 */
export function openGameLayer(exo, startAsDemo) {
    if (!exo) return;

    if (startAsDemo) return openDemo(exo);

    // On quitte une démonstration : sa flèche, sa bulle et sa barre de
    // commandes ne lui survivent pas. Le balayage est fait ICI, avant même le
    // panneau de réglages, parce que ce panneau rend la main sans rien lancer
    // — en mode professeur, personne n'atteignait le parcours qui nettoie.
    destroyAllDemoCursors();

    // Verrous du jeu libre (exercices réservés, jeux à débloquer). Seul le
    // lancement LIBRE passe ici : les parcours du professeur, eux, lancent
    // leurs étapes par le Runner et ne sont jamais bloqués.
    if (!state.isTeacherMode) {
        const acces = accessOf(exo);
        if (acces.status !== 'libre') {
            import('../ui/modal.js').then(m => m.showToast(`🔒 ${lockLabel(acces)}`, 'warning'));
            return;
        }
    }

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
        if (msg) msg.textContent = `Aperçu${exo.instruction ? ' : ' + exo.instruction : ' — le robot joue'}`;
        // Repliée à chaque ouverture : une consigne dépliée la fois d'avant
        // ne doit pas manger l'écran de l'aperçu suivant.
        banner.classList.remove('demo-banner--ouvert');
        const plus = document.getElementById('demo-banner-plus');
        if (plus) plus.style.display = exo.instruction ? '' : 'none';
        banner.style.display = 'flex';
    }
    const progress = document.getElementById('game-progress-container');
    if (progress) progress.style.display = 'none';
    // La bande prend la place du titre : sans cet appel elle resterait
    // invisible, et la bannière avec elle.
    marquerDemo();

    launchPreview(exo, document.getElementById('game-board'));
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
    // Une vignette (survol, carte, présentation) joue en muet : ses bulles,
    // posées sur <body>, recouvriraient la page entière. Le plein écran
    // (opts.muet absent) garde les explications du robot.
    setDemoMuet(frozen || !!opts.muet);
    // Une vignette ne coupe pas les minuteurs des autres : elle vit dans son
    // propre conteneur et sera gelée individuellement. Une démonstration, si :
    // il n'en joue qu'une à la fois.
    if (!frozen) { clearEngines(); destroyAllDemoCursors(); }
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
