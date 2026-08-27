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
import { questionsConseillees } from '../core/duree.js';
import { accessOf, lockLabel } from '../core/gameAccess.js';
import { surveillerEnonces } from '../ui/enonce.js';

/**
 * Ouvre un exercice en plein écran.
 * @param {Object} exo - descripteur du catalogue
 * @param {boolean} startAsDemo
 */
export function openGameLayer(exo, startAsDemo) {
    if (!exo) return;
    // L'ÉNONCÉ SE RÈGLE SUR SA LONGUEUR — voir `ui/enonce.js`. L'observateur
    // est posé une fois pour toutes sur la zone de jeu : trente endroits
    // écrivent une question, et les appeler un par un, c'est en oublier un.
    surveillerEnonces(document.getElementById('game-board'));

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

    // LA MÊME FENÊTRE POUR LES DEUX RÔLES, ET C'ÉTAIT UN VRAI TROU.
    //
    // Rémy : « L'exercice Loupe sur la droite : les paramètres ne fonctionnent
    // pas. » Ce n'était pas la loupe : c'était TOUT exercice réglable ouvert
    // depuis le catalogue en mode professeur. La branche prof appelait
    // `window.showGameConfigUI`, qui écrit dans `builder-config-content` — le
    // panneau du CONSTRUCTEUR DE PARCOURS. Depuis le catalogue, ce conteneur
    // n'est pas dans la page : `renderGameConfigUI` sortait sans rien faire,
    // aucune fenêtre ne s'ouvrait, et l'exercice ne partait même pas.
    //
    // Le contrat ne collait pas non plus : `renderGameConfigUI` prend une
    // ÉTAPE de parcours et rend une étape modifiée, alors qu'on lui passait un
    // exercice en attendant des réglages en retour. Même avec le bon
    // conteneur, la partie serait partie avec un objet étape en guise de
    // paramètres.
    //
    // Le panneau du constructeur reste ce qu'il est — le constructeur
    // l'appelle lui-même, avec son étape et son conteneur. Ici, avant une
    // partie libre, c'est la fenêtre de réglages, pour l'élève comme pour le
    // professeur : mêmes réglages, même nombre de questions, même bouton
    // « imprimer ». Rien ne justifiait deux chemins.
    if (needsConfig) {
        import('./configUI.js').then(m => {
            m.ouvrirReglagesAvantPartie(exo, (params) => launchFreePlay(exo, params));
        });
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
    // COMBIEN D'UNITÉS FONT UNE SÉANCE.
    //
    // Le jeu libre posait dix, quoi qu'il arrive : dix paires (deux tables),
    // dix grilles de sudoku (une heure et demie), dix parties d'échecs. Et il
    // ignorait au passage les progressions, que le panneau du professeur
    // savait pourtant calculer. Une seule fonction répond maintenant partout —
    // voir `questionsConseillees` dans core/duree.js.
    const nbItems = nbQuestions || questionsConseillees(
        getGenerator(exo.generatorId), exo.params || {}, { activite: exo.activityId });

    const step = makeStep(exo.id, overrides, {
        nbItems,
        threshold: successThreshold || Math.ceil(nbItems * 0.7),
        timeLimit: timeLimit || (exo.params && exo.params.timeLimit) || null
    });

    const path = makePath(exo.title, [step], defaultPolicy());

    import('../core/runner.js').then(({ Runner }) => {
        const runner = new Runner({ path, deviceMode: cadreDe(exo) });
        runner.start();
    });
}

/**
 * DANS QUEL CADRE ON LANCE.
 *
 * D'ordinaire c'est le simulateur du professeur qui décide, et un élève n'a
 * pas de cadre du tout — il EST l'appareil. Mais la revue du catalogue veut
 * lancer le MÊME exercice trois fois de suite, en téléphone, en tablette puis
 * en plein écran, sans toucher au réglage global du professeur : elle le pose
 * donc sur le descripteur qu'elle passe, et c'est celui-là qui gagne.
 */
export function cadreDe(exo) {
    if (exo && exo.apercuAppareil) return exo.apercuAppareil;
    if (!state.isTeacherMode) return 'none';
    return state.previewDeviceMode === 'desktop' ? 'none' : state.previewDeviceMode;
}

// --- Démonstration ----------------------------------------------------------
// L'aperçu joue tout seul, sans rien enregistrer : c'est un outil de
// présentation pour le professeur, pas une session de travail.

export function openDemo(exo) {
    state.activeExo = exo;
    const gl = document.getElementById('game-layer');
    document.getElementById('game-title').textContent = exo.title;
    // L'aperçu se regarde aussi dans un cadre de téléphone : c'est là que le
    // robot désigne à côté de la case, parce que la mise en page a bougé.
    gl.classList.remove('device-simulator', 'tablet-simulator');
    const cadre = cadreDe(exo);
    if (cadre === 'tablet') gl.classList.add('tablet-simulator');
    else if (cadre === 'mobile') gl.classList.add('device-simulator');
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
    // L'aperçu montre l'exercice TEL QUE l'élève le recevra, calculatrice
    // comprise : c'est là qu'on vérifie qu'elle est offerte au bon endroit.
    import('../ui/calculatrice.js').then(m => m.reglerCalculatrice(exo));
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
