// LE PILOTE — l'exercice joué tout seul, jusqu'au bout.
//
// Rémy a dit oui : « un bouton dans l'Atelier qui joue l'exercice tout seul
// jusqu'au bout et te dit ce qui a cassé ».
//
// CE QUE ÇA AJOUTE AU CONTRÔLE. Le contrôle ouvre l'exercice et regarde le
// PREMIER écran : il attrape les pannes de lancement et les débordements de la
// première question. Or la plupart des ennuis n'arrivent pas là. Ils arrivent à
// la question sept, quand le générateur tire un nombre à trois chiffres qui ne
// tient plus dans la case ; à la correction, quand une phrase d'explication
// déborde ; à la fin, quand le bilan ne vient jamais. Il faut donc JOUER, et
// mesurer à chaque écran.
//
// COMMENT ON JOUE SANS CONNAÎTRE LE JEU. Le pilote ne sait rien d'aucun
// exercice en particulier, et c'est la condition pour qu'il les couvre tous. Il
// s'appuie sur ce qui est commun à toute l'application :
//
//   · la SESSION connaît la question en cours et sa réponse (`item.answer`) —
//     le volet la pose sur `window`, voir `ouvrirVoletAtelier` ;
//   · un QCM affiche ses propositions en `[data-val]`, et `evaluate` — la même
//     fonction qui juge l'élève — dit laquelle est juste ;
//   · une réponse tapée passe par le pavé `[data-key]` et son `[data-validate]` ;
//   · un retour se ferme par `.fb-close`, une étape finie par `#btn-run-next`.
//
// Quand il ne sait pas répondre — une grille de sudoku, une figure à coder — il
// le DIT au lieu de faire semblant, et il continue au hasard parmi les
// commandes offertes : un exercice qu'on ne sait pas gagner, on peut toujours
// le secouer, et c'est ainsi qu'on trouve les pannes.
//
// CE QU'IL NE FAIT PAS, et qu'il ne faut pas lui demander : il ne juge pas la
// PÉDAGOGIE. Qu'une question soit trop dure, mal tournée ou hors programme, il
// n'en saura jamais rien. Il dit qu'un écran s'est affiché, qu'une réponse a
// été acceptée, que rien n'a débordé et que la fin est arrivée. C'est déjà ce
// qu'on vérifiait à la main, dix fois par jour.

import { evaluate } from '../core/items.js';
import { debordements, journalDuVolet } from './controle.js';

const attendre = (ms) => new Promise(r => setTimeout(r, ms));

/** Le temps laissé à un écran pour se poser avant qu'on le mesure. */
const POSE = 260;
/** Sans rien qui bouge pendant ce nombre de tours, on se dit bloqué. */
const PATIENCE = 14;

/** Les commandes qu'on ne touche pas : elles quittent ou trichent. */
const INTERDITS = [
    '#game-close', '#btn-game-close', '[data-showme]', '[data-hint]',
    '.btn-showme', '#game-layer > header button'
];

const estInterdit = (el) => INTERDITS.some(s => el.closest && el.closest(s));

/**
 * CLIQUER, MÊME SUR UN DESSIN — et le pilote s'est cassé là-dessus lui-même.
 *
 * `click()` appartient à HTMLElement ; un `<polygon>` ou un `<circle>` est un
 * SVGElement, et n'en a pas. Le premier essai sur l'organigramme s'est arrêté
 * sur « libres[…].click is not a function » — c'est le pilote qui a trouvé son
 * propre défaut, ce qui est plutôt bon signe. On envoie donc l'événement, ce
 * qui marche des deux côtés.
 */
function cliquer(el) {
    if (typeof el.click === 'function') { el.click(); return; }
    el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', {
        bubbles: true, cancelable: true, view: el.ownerDocument.defaultView
    }));
}

/** Ce qui se clique dans le plateau, sans quitter la partie. */
function commandes(doc) {
    const z = doc.getElementById('game-board');
    if (!z) return [];
    return [...z.querySelectorAll('button, [role="button"], [data-idx], [data-val], .kk-chip, [data-depose]')]
        .filter(el => {
            if (el.disabled || estInterdit(el)) return false;
            const r = el.getBoundingClientRect();
            return r.width > 4 && r.height > 4;
        });
}

/**
 * RÉPONDRE À LA QUESTION EN COURS.
 *
 * @returns {string} ce qu'on a fait — 'qcm', 'pave', 'valide', 'hasard', 'rien'
 */
function repondre(doc, session) {
    const item = session && session.item;

    // ① UN QCM. `evaluate` est la fonction qui juge l'élève : on lui pose la
    // même question qu'à lui, proposition par proposition. Aucune activité n'a
    // besoin d'être connue pour cela.
    if (item) {
        const cases = [...doc.querySelectorAll('#game-board [data-val]')]
            .filter(el => !estInterdit(el) && el.dataset.eliminated !== '1');
        const bonne = cases.find(el => {
            try { return evaluate(item, el.dataset.val).correct; } catch (e) { return false; }
        });
        if (bonne) { cliquer(bonne); return 'qcm'; }
        if (cases.length) { cliquer(cases[0]); return 'qcm-au-hasard'; }
    }

    // ② LE PAVÉ NUMÉRIQUE. On tape la réponse chiffre par chiffre, comme un
    // élève — et non en écrivant dans le champ, ce qui sauterait la moitié du
    // code qu'on veut justement éprouver.
    const pave = doc.querySelector('#game-board [data-key]');
    if (pave && item && item.answer !== undefined && item.answer !== null) {
        const texte = String(item.answer);
        let tape = 0;
        for (const c of texte) {
            const cle = c === '-' ? '±' : c;
            const touche = doc.querySelector(`#game-board [data-key="${cle}"]`);
            if (touche) { cliquer(touche); tape += 1; }
        }
        const ok = doc.querySelector('#game-board [data-validate]');
        if (tape && ok) { ok.click(); return 'pave'; }
    }

    // ③ UN BOUTON « VALIDER » SEUL. On ne sait pas remplir la grille, mais on
    // sait appuyer : la réponse sera fausse, l'exercice avancera quand même, et
    // c'est l'écran suivant qu'on veut voir.
    const valider = doc.querySelector('#game-board [data-valider], #game-board [data-validate]');
    if (valider && !valider.disabled) { cliquer(valider); return 'valide'; }

    // ④ À DÉFAUT, ON SECOUE. Un exercice qu'on ne sait pas gagner se laisse
    // toujours cliquer, et c'est ainsi qu'on trouve les pannes.
    const libres = commandes(doc);
    if (libres.length) {
        cliquer(libres[Math.floor(Math.random() * libres.length)]);
        return 'hasard';
    }
    return 'rien';
}

/**
 * JOUER L'EXERCICE CHARGÉ DANS UN CADRE, jusqu'au bilan ou jusqu'à la limite.
 *
 * @param {HTMLIFrameElement} cadre
 * @param {Object} o
 * @param {number} [o.max]     - questions au plus
 * @param {Function} [o.dire]  - appelée à chaque avancée, pour l'affichage
 * @param {Function} [o.stop]  - rend vrai pour interrompre
 */
export async function piloter(cadre, { max = 15, dire = () => { }, stop = () => false } = {}) {
    const doc = cadre.contentDocument;
    const win = cadre.contentWindow;
    const bilan = { questions: 0, justes: 0, fini: false, limite: false, geste: {}, soucis: [] };
    if (!doc || !win) {
        bilan.soucis.push('LANCEMENT : le volet du jeu n\'est pas chargé');
        return bilan;
    }
    const noter = (t) => { if (!bilan.soucis.includes(t)) bilan.soucis.push(t); };
    const compter = (g) => { bilan.geste[g] = (bilan.geste[g] || 0) + 1; };

    let repos = 0;
    let vues = 0;
    let derniereEmpreinte = '';
    let derniersRepondus = -1;

    for (let tour = 0; tour < max * 12 && !stop(); tour++) {
        await attendre(POSE);

        // La fin d'étape : c'est là qu'on s'arrête, et c'est ce qu'on voulait
        // atteindre. Un exercice qui ne l'atteint jamais est le vrai défaut.
        if (doc.querySelector('.run-screen')) { bilan.fini = true; break; }

        // Un retour ouvert bloque tout : on le ferme comme le ferait l'élève.
        const fermer = doc.querySelector('.fb-close');
        if (fermer) { cliquer(fermer); repos = 0; continue; }

        const session = win.__sessionAtelier || null;
        if (session && session.answered !== derniersRepondus) {
            derniersRepondus = session.answered;
            bilan.questions = session.answered;
            bilan.justes = session.correctCount;
            dire(`question ${bilan.questions} — ${bilan.justes} juste${bilan.justes > 1 ? 's' : ''}`);
        }
        if (bilan.questions >= max) { bilan.limite = true; break; }

        // CHAQUE ÉCRAN EST MESURÉ, et c'est tout l'intérêt d'avoir joué : un
        // nombre à trois chiffres qui ne tient plus dans sa case n'apparaît
        // qu'à la septième question.
        const empreinte = (doc.getElementById('game-board') || {}).innerHTML || '';
        if (empreinte !== derniereEmpreinte) {
            derniereEmpreinte = empreinte;
            vues += 1;
            repos = 0;
            debordements(doc).forEach(d =>
                noter(`DÉBORDE de ${d.px} px (écran ${vues}) : ${d.quoi}`));
        } else {
            repos += 1;
            if (repos > PATIENCE) {
                // BLOQUÉ OU PAS PILOTABLE, ET LA NUANCE COMPTE. Un exercice qui
                // se fige après cinq bonnes réponses est une panne ; une grille
                // de sudoku sur laquelle le pilote n'a jamais su jouer un coup
                // n'en est pas une — c'est le pilote qui ne sait pas, et le dire
                // autrement serait crier au loup à chaque grille.
                const su = (bilan.geste.qcm || 0) + (bilan.geste.pave || 0);
                noter(su
                    ? `BLOQUÉ : rien ne bouge après ${bilan.questions} question`
                        + `${bilan.questions > 1 ? 's' : ''} — l'écran ne change plus`
                    : 'PAS PILOTABLE : cet exercice demande un geste que le pilote ne sait '
                        + 'pas faire (remplir une grille, tracer, glisser). Rien n\'a pu être joué.');
                break;
            }
        }

        if (session && session.locked) continue;
        compter(repondre(doc, session));
    }

    journalDuVolet(win).filter(l => l.niveau === 'error').slice(-4)
        .forEach(l => noter(`CONSOLE : ${String(l.texte).slice(0, 150)}`));
    // S'ARRÊTER À LA LIMITE N'EST PAS UN DÉFAUT. Le pilote joue quinze
    // questions au plus ; un exercice qui en pose vingt n'a rien à se
    // reprocher, et le signaler ferait douter d'un exercice sain.
    const su = (bilan.geste.qcm || 0) + (bilan.geste.pave || 0);
    const pilotable = su > 0 || bilan.questions > 0;
    if (pilotable && !bilan.fini && !bilan.limite && !bilan.soucis.length) {
        noter(`INACHEVÉ : ${bilan.questions} question(s) jouée(s), le bilan n'est pas venu`);
    }
    // Un jeu que le pilote n'a jamais su jouer n'est pas en panne pour autant :
    // il a des gestes à lui — poser une pièce, tracer, glisser — que personne
    // n'a appris au pilote. On le dit une fois, sans crier au loup.
    if (!pilotable && !bilan.soucis.some(x => x.startsWith('PAS PILOTABLE'))) {
        noter('PAS PILOTABLE : cet exercice demande un geste que le pilote ne sait pas '
            + 'faire (remplir une grille, tracer, glisser). Rien n\'a pu être joué.');
    }
    // Un pilote qui n'a jamais su répondre n'a rien prouvé sur la justesse : il
    // a secoué l'exercice, ce qui trouve les pannes mais pas les fautes.
    if (!su && pilotable) {
        noter('À LA MAIN : le pilote n\'a pas su répondre à cet exercice — '
            + 'il a cliqué au hasard. Les pannes sont vues, la justesse non.');
    }
    return bilan;
}

/** Le rapport du pilote, en texte, pour le relevé. */
export function piloteEnTexte(b) {
    const gestes = Object.entries(b.geste).map(([g, n]) => `${g} ×${n}`).join(', ');
    const lignes = [
        `- ${b.questions} question(s) jouée(s), ${b.justes} juste(s)`
        + `${b.fini ? ', bilan atteint' : (b.limite ? ', arrêté à la limite du pilote' : '')}`,
        `- gestes : ${gestes || 'aucun'}`
    ];
    b.soucis.forEach(s => lignes.push(`    · ${s}`));
    return lignes.join('\n');
}
