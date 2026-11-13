// LE DÉFI CHRONOMÉTRÉ DE LA CLASSE — ce que l'élève a sous les yeux.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « je peux lancer un challenge chronométré, le plus de calcul et toute
// la classe participe et au bout du challenge, un tableau de High score, on
// pourrait faire cela avec les générateurs. Exemple : je lance le défi. Et là
// tous les élèves reçoivent des calculs, il faut taper la réponse ou QCM, aux
// choix, et au bout d'une minute, tableau de score pour tout le monde, et on
// reprend la suite des exercices normalement ».
//
// ── POURQUOI ÇA COUPE, ET POURQUOI C'EST LE BON CHOIX ─────────────────────
//
// Quand il a demandé si cela devait interrompre l'activité ou attendre la fin
// de l'exercice en cours, la réponse tenait en une phrase : L'INTÉRÊT D'UNE
// QUESTION LANCÉE PAR LE PROFESSEUR, C'EST QUE LES TRENTE RÉPONDENT DANS LES
// MÊMES VINGT SECONDES. Mise en file, elle arrive à trente moments différents :
// plus de correction collective, plus de classement, plus de moment de classe.
//
// MAIS CE QU'IL FAISAIT N'EST PAS PERDU. Le défi se pose PAR-DESSUS, sans rien
// démonter : l'exercice reste monté dessous, et il le retrouve exactement où
// il l'avait laissé. C'est la même idée que la pause du professeur.
//
// ── CE QUI VIENT DU SERVEUR, ET POURQUOI ──────────────────────────────────
//
//   · LA GRAINE — la même série de questions pour toute la classe. Sans elle,
//     chaque ardoise tirerait les siennes et le classement comparerait trente
//     épreuves différentes ;
//   · LES DEUX INSTANTS — début et fin. Jamais une durée : celle-ci commence à
//     vieillir dès qu'elle est écrite, et l'ardoise qui interroge deux secondes
//     plus tard aurait deux secondes de plus. `defiEnCours` corrige en plus
//     l'écart entre l'horloge du serveur et celle d'ici ;
//   · LE TABLEAU — podium et place, déjà coupés par le serveur. Rémy a choisi
//     « podium + ta place à toi » : afficher les trente prénoms classés devant
//     toute la classe désignerait le dernier à chaque défi.
//
// ── ON NE REJOUE PAS UN DÉFI DÉJÀ FAIT ────────────────────────────────────
//
// L'état de séance arrive toutes les dix secondes ; sans mémoire, le défi se
// relancerait à chaque réponse du serveur. On retient donc l'instant de début —
// il identifie le défi — dans `sessionStorage`, pour qu'un rechargement de page
// au milieu de la minute ne le redonne pas non plus.

import { cumulDuDefi, defiEnCours, tableauDuDefi } from '../core/seanceDistante.js';
import { poserLeScoreDuDefi } from '../core/scoreDuDefi.js';
import { state } from '../core/state.js';
import { apiEleve, rafraichirSeance } from '../core/sync.js';
import { makeRng } from '../core/ids.js';
import { getExerciseById } from '../data/catalog.js';
import { getGenerator } from '../core/registry.js';
// LE DESSIN DE L'ANGLE ET SON BARÈME VIENNENT DU NOYAU, et c'est la raison
// d'être de `core/anglesDessin.js` : l'exercice « À vue d'œil » montre cet
// angle, LE DÉFI le montre aussi, et l'aperçu du professeur une troisième fois.
// Trois dessins séparés dériveraient — un drapeau d'arc corrigé ici et pas là —
// et les trente élèves du défi estimeraient alors autre chose que ce que
// l'exercice leur a appris.
import {
    VUE, dessinDeLAngle, estUneEstimation, pointsDeLEcart
} from '../core/anglesDessin.js';

const CLE_FAITS = 'atoutmath-defis-faits';

export function initDefiUI() {
    document.addEventListener('seance_distante', () => regarder());
    document.addEventListener('role_change', () => regarder());
    regarder();
}

/** Les défis que CET appareil a déjà joués ou dont il a vu le tableau. */
function dejaVu(quoi) {
    try {
        return (sessionStorage.getItem(CLE_FAITS) || '').split(',').includes(String(quoi));
    } catch (e) { return false; }
}

function noter(quoi) {
    try {
        const vus = (sessionStorage.getItem(CLE_FAITS) || '').split(',').filter(Boolean);
        vus.push(String(quoi));
        sessionStorage.setItem(CLE_FAITS, vus.slice(-20).join(','));
    } catch (e) { /* navigation privée : on rejouera, et c'est moins grave */ }
}

let enCours = false;

// ── LE DÉCOMPTE DU CLASSEMENT, ET C'EST L'IDÉE DE RÉMY ────────────────────
//
// RÉMY, après l'avoir lancé avec sa classe : « est ce normal que tous les
// élèves n'aient pas eu le podium ? On pourrait pas avoir un petit décompte ou
// forcer une requete php pour avoir le classement total ».
//
// MESURÉ, TROIS ÉLÈVES, UN SEUL DÉFI : à la seconde où le tableau est apparu,
// Ana lisait « 1e sur 1 » avec UN seul prénom au podium — le sien —, Bob
// « 1e sur 2 », et Gus le classement entier. Quatre secondes plus tard les
// trois écrans s'accordaient, mais le mal était fait : en classe, c'est
// « le podium est faux » qu'on dit tout haut, et on ne revient pas dessus.
//
// LA CAUSE N'EST PAS UN DÉFAUT, C'EST UNE COURSE. Le tableau est une PHOTO
// prise par le serveur à l'instant où CHAQUE ardoise interroge — et les trente
// n'interrogent pas au même moment, ni après que les trente scores sont rangés.
// Celle qui demande la première photographie une classe presque vide.
//
// ON ATTEND DONC ENSEMBLE. Trois secondes après la dernière, chacun regarde le
// même décompte tomber pendant que son score part et que l'état se redemande à
// chaque seconde. C'est exactement le mécanisme des douze secondes d'annonce au
// départ, par l'autre bout : LE DÉPART ÉTAIT COMMUN, L'ARRIVÉE DOIT L'ÊTRE.
const SECONDES_DU_CLASSEMENT = 3;

// ── COMBIEN DE TEMPS ON REGARDE SON ÉCART ─────────────────────────────────
//
// RÉMY : « je trouvais que la vraie réponse passait vite ».
//
// Les huit cents millisecondes du premier jet étaient mon choix, et je l'avais
// écrit : « on ne s'y installe pas, la minute est à toute la classe ». C'était
// la moitié du raisonnement. L'autre moitié est que l'écart EST ce qui
// construit le repère pour la fois d'après — c'est la raison d'être de
// l'exercice —, et un repère qu'on n'a pas le temps de lire ne se construit
// pas. Le chrono mangeait la seule chose qu'on voulait montrer.
//
// ET ON PEUT ENCHAÎNER PLUS TÔT : un doigt, une touche, et la question suivante
// arrive. Celui qui va vite garde son rythme, celui qui regarde a son temps —
// plutôt qu'un seul réglage qui déplaît aux deux.
const ATTENTE_CORRECTION = 2400;
const AVANT_DE_POUVOIR_PASSER = 450;

// ── « TU N'AS PAS PARTICIPÉ » DIT À CEUX QUI VENAIENT DE JOUER ─────────────
//
// RÉMY, en classe, avec ses élèves : « pour le défi, on l'a fait avec les
// élèves une fois fini, on a eu le classement des 3 premiers mais les autres
// c'était noté, tu n'as pas participé à ce défi ».
//
// CE QUI SE PASSAIT. Le tableau est une PHOTO prise par le serveur à l'instant
// où l'ardoise l'interroge, et il ne s'affiche qu'une fois (`dejaVu`). Or le
// score de l'élève part dans une requête séparée, à la seconde où le défi
// tombe. Celui dont la photo arrive AVANT que son score ne soit rangé n'y
// figure pas — et il lisait alors, définitivement, qu'il n'avait pas joué. Le
// serveur, lui, avait bien son score : MESURÉ, trois élèves, trois scores en
// base, et l'un des trois lisant « Tu n'as pas participé à ce défi » dix-huit
// secondes après la fin, sans que l'écran se corrige jamais.
//
// DEUX CORRECTIONS, ET LA PREMIÈRE SUFFIRAIT PRESQUE :
//
//   · on REDEMANDE l'état dès que le score est parti, au lieu d'attendre le
//     battement suivant — la photo est alors prise après, par construction ;
//   · et l'on n'affiche pas une photo qui nous oublie quand on sait avoir
//     joué : on laisse passer quelques battements. La phrase « tu n'as pas
//     participé » reste vraie pour qui n'a vraiment pas joué, et c'est tout ce
//     qu'elle doit dire.
//
// POURQUOI NE PAS SE CONTENTER D'ATTENDRE ? Parce qu'un réseau qui tombe au
// mauvais moment remettrait l'élève dans le cas d'avant, sans rien à l'écran.
// Au bout de ATTENTES_MAX battements on montre le tableau quand même — avec,
// pour celui qui a joué, sa ligne telle qu'il l'a vécue plutôt qu'un démenti.
const ATTENTES_MAX = 4;
const attentes = new Map();

/** Ce que CET appareil a compté pendant le défi, pour le cas où le serveur tarde. */
let monScore = null;

/**
 * CE DÉFI SE COMPTE-T-IL EN POINTS plutôt qu'en bonnes réponses ?
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « plus il est proche, plus il a de points et après si c'est une classe
 * en séance, on peut récupérer les high score, c'est motivant ».
 *
 * ON NE REGARDE PAS L'IDENTIFIANT DE L'EXERCICE, ON REGARDE LA QUESTION. Tout
 * générateur qui pose un angle à estimer — celui-ci et ceux qui viendront —
 * sera compté en points sans qu'il y ait une liste à tenir à jour quelque part.
 * La graine n'a aucune importance ici : on ne lit que la FORME de l'item, pas
 * son contenu.
 */
export function compteEnPoints(exoId, graine) {
    return estUneEstimation(questionDuDefi(getExerciseById(exoId), graine || 'x', 0));
}

function regarder() {
    // LE PROFESSEUR NE SE LANCE PAS UN DÉFI À LUI-MÊME. Son navigateur a servi
    // à essayer le côté élève et en garde le rattachement — c'est la même règle
    // que pour les mots, et elle est écrite une seule fois dans le noyau.
    if (state.isTeacherMode || enCours) return;
    const d = defiEnCours();
    if (d && !dejaVu('d' + d.debut)) {
        noter('d' + d.debut);
        jouer(d);
        return;
    }
    const t = tableauDuDefi();
    if (t && !dejaVu('t' + t.debut)) {
        // J'AI JOUÉ ET LE TABLEAU NE ME VOIT PAS : mon score n'est pas encore
        // arrivé. On laisse passer le battement — et l'on ne NOTE rien, sans
        // quoi le tableau juste, celui d'après, ne s'afficherait jamais.
        const joue = dejaVu('d' + t.debut);
        if (!t.moi && joue) {
            const n = (attentes.get(t.debut) || 0) + 1;
            attentes.set(t.debut, n);
            if (n <= ATTENTES_MAX) return;
        }
        noter('t' + t.debut);
        montrerLeTableau(t, joue ? monScore : null);
        return;
    }
    // LE TABLEAU DÉJÀ OUVERT SUIT LES SCORES QUI ARRIVENT : voir
    // `rafraichirLeTableau`. Sans cela, le premier servi garde un podium d'un
    // prénom pendant les cinq minutes d'affichage.
    if (t) rafraichirLeTableau(t, dejaVu('d' + t.debut) ? monScore : null);
}

/* ------------------------------------------------------------ Le plateau --- */

function plateau(contenu, classe = '') {
    const d = document.createElement('div');
    d.className = 'defi-voile ' + classe;
    d.innerHTML = contenu;
    document.body.appendChild(d);
    return d;
}

const echapper = (s) => String(s == null ? '' : s)
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* -------------------------------------------------------------- Le défi --- */

/**
 * LES QUESTIONS DU DÉFI, dans l'ordre et les mêmes pour tous.
 *
 * `makeRng(graine + '-' + n)` : le rang est DANS la graine, donc la question
 * numéro sept est la même chez les trente élèves, et elle ne dépend pas de la
 * vitesse à laquelle on y arrive.
 */
export function questionDuDefi(exo, graine, n, reglages = null) {
    const gen = exo && exo.generatorId ? getGenerator(exo.generatorId) : null;
    if (!gen) return null;
    try {
        // LES RÉGLAGES DU DÉFI PASSENT PAR-DESSUS CEUX DE L'EXERCICE, et non
        // à leur place. Rémy : « pour le défi, quand ce sont des exercices à
        // pas, je ne peux choisir le pas ». Il choisit UNE marche ; tout le
        // reste de ce que l'exercice déclare — ses bornes, sa façon de
        // compter — doit continuer de s'appliquer. Les remplacer en bloc
        // donnerait un exercice que personne n'a réglé.
        const params = (reglages && typeof reglages === 'object' && Object.keys(reglages).length)
            ? { ...(exo.params || {}), ...reglages }
            : (exo.params || {});
        return gen.generate(params, {
            rng: makeRng(`${graine}-${n}`), index: n, total: 999
        });
    } catch (e) { return null; }
}

/* -------------------------------------- Ce que la classe fait ensemble --- */

// RÉMY, après l'avoir lancé en classe : « Le défi ca cartonne, des idées dans
// ce style ». Trois façons de compter la même addition, et c'est tout :
//
//   LE CLASSEMENT   — chacun pour soi, et le podium à la fin. C'est l'existant.
//   LE BUT COMMUN   — une seule barre, celle de toute la classe. Personne ne
//                     perd : l'élève lent pousse la même barre que les autres.
//   LES DEUX ÉQUIPES — la compétition reste, mais entre GROUPES.
//
// LES TROIS SORTENT DU MÊME TOTAL, additionné au serveur (`cumulDuDefi`). Trois
// comptes séparés auraient fini par ne plus dire la même chose.
//
// ── ET ON LE MONTRE PENDANT, PAS SEULEMENT À LA FIN ───────────────────────
//
// Une barre qui monte sous les yeux de trente élèves, c'est tout le mécanisme ;
// à la fin, ce n'est plus qu'un résultat. LE TOTAL ARRIVE PAR LE BATTEMENT,
// toutes les dix secondes : il est donc EN RETARD d'au plus dix secondes, et
// c'est voulu — trente ardoises qui demanderaient le total à chaque question,
// c'est la bousculade qu'on vient de corriger dans `api/lib/db.php`. Une barre
// qui monte par paliers de dix secondes monte quand même.

/** La part d'une barre, en pourcentage, jamais au-delà de cent. */
const part = (fait, sur) => `${Math.max(0, Math.min(100, (fait / Math.max(1, sur)) * 100)).toFixed(1)}%`;

/** Un nombre de points sûr, quel que soit ce que le serveur a envoyé. */
const pts = (v) => Math.max(0, Math.round(Number(v) || 0));

/**
 * LA BARRE DU BUT COMMUN : un seul nombre, celui de toute la classe.
 *
 * ON ÉCRIT LE BUT À CÔTÉ DU TOTAL — « 214 / 300 » — parce qu'une barre seule ne
 * dit pas combien il manque, et que c'est la seule question que la classe se
 * pose pendant la dernière manche.
 */
function barreDuBut(cumul, but) {
    const total = pts(cumul.points);
    const vise = Math.max(1, Math.round(but));
    const atteint = total >= vise;
    return `<div class="defi-but${atteint ? ' defi-but--atteint' : ''}">
            <div class="defi-but-ligne">
                <span>${atteint ? '🎉 OBJECTIF ATTEINT !' : '🤝 LA CLASSE'}</span>
                <span class="defi-but-pts"><b>${total}</b> / ${vise}</span>
            </div>
            <div class="defi-barre"><div class="defi-jauge defi-jauge--but"
                 style="width:${part(total, vise)}"></div></div>
        </div>`;
}

/**
 * LES DEUX BARRES DES ÉQUIPES, à l'échelle de celle qui mène.
 *
 * POURQUOI PAS À L'ÉCHELLE DU BUT : sans but, il n'y a pas d'échelle absolue —
 * et avec un but, deux barres qui montent lentement vers trois cents ne
 * montrent plus l'ÉCART, qui est la seule chose qui compte quand on joue à deux
 * équipes. L'équipe qui mène occupe donc toute la largeur, et l'autre se lit
 * par rapport à elle : on voit d'un coup d'œil si c'est serré.
 *
 * ET SON ÉQUIPE EST MARQUÉE. Le serveur partage la classe une ligne sur deux
 * (voir `equipeDeLEleve`) : l'élève n'a rien choisi, il doit donc pouvoir lire
 * de quel côté il pousse — sans quoi les deux barres ne le concernent pas.
 */
function barresDesEquipes(cumul) {
    const scores = [pts((cumul.equipes || [])[0]), pts((cumul.equipes || [])[1])];
    const noms = cumul.noms || ['Les Bleus', 'Les Orange'];
    const haut = Math.max(1, scores[0], scores[1]);
    const mene = scores[0] === scores[1] ? -1 : (scores[0] > scores[1] ? 0 : 1);
    return '<div class="defi-eqs">' + scores.map((p, i) => `
            <div class="defi-eq defi-eq--${i}${cumul.moi === i ? ' defi-eq--moi' : ''}">
                <div class="defi-but-ligne">
                    <span>${i === mene ? '👑 ' : ''}${echapper(String(noms[i] || ''))}${
    cumul.moi === i ? ' <small>ton équipe</small>' : ''}</span>
                    <span class="defi-but-pts"><b>${p}</b></span>
                </div>
                <div class="defi-barre"><div class="defi-jauge"
                     style="width:${part(p, haut)}"></div></div>
            </div>`).join('') + '</div>';
}

/**
 * CE QU'ON MONTRE PENDANT LE DÉFI, ou rien du tout.
 *
 * RIEN, POUR UN DÉFI ORDINAIRE : le classement n'a pas d'état intermédiaire à
 * donner — on ne va pas afficher un podium qui change toutes les dix secondes
 * pendant que l'élève calcule — et la question a besoin de toute la place.
 */
function ensembleDuDefi(cumul, d) {
    if (!cumul) return '';
    // LES DEUX RÉGLAGES S'ADDITIONNENT PLUTÔT QUE DE S'EXCLURE : le meneur
    // n'en propose qu'un à la fois, mais rien n'interdit de viser trois cents
    // points EN DEUX ÉQUIPES — et si les deux sont posés, l'élève doit voir
    // les deux, sinon la moitié de la règle qu'on vient de lui annoncer a
    // disparu de son écran.
    return (d.but > 0 ? barreDuBut(cumul, d.but) : '')
        + (d.equipes ? barresDesEquipes(cumul) : '');
}

/**
 * LE RECORD DE LA CLASSE, en une ligne, ou rien s'il n'y en a pas encore.
 *
 * RÉMY : « Le défi ca cartonne, des idées dans ce style ». De toutes les idées
 * de cette série, c'est la seule où PERSONNE n'a rien à perdre : c'est la classe
 * contre elle-même, de semaine en semaine, et le dernier du podium y pèse
 * autant que le premier.
 */
function ligneDuRecord(record) {
    if (!record || !record.points) return '';
    return `<div class="defi-record">🏅 record de la classe : <b>${pts(record.points)}</b></div>`;
}

async function jouer(defi) {
    enCours = true;
    const exo = getExerciseById(defi.exo);
    // ── ON DIT LA RÈGLE AVANT QUE ÇA COMMENCE ────────────────────────────
    //
    // Un but commun, deux équipes : ces deux-là changent ce que l'élève doit
    // faire de ses points — pousser une barre, ou pousser SA couleur. Les
    // découvrir en voyant une barre apparaître au milieu de la première
    // question, c'est les découvrir trop tard. Les douze secondes d'annonce
    // sont faites pour ça, et elles ne servaient encore qu'à dire le titre.
    const cumul = cumulDuDefi();
    const regles = [
        defi.but > 0
            ? `🎯 Objectif de la classe : <b>${defi.but}</b> points ensemble`
            : '',
        defi.equipes
            ? `🤝 Deux équipes${cumul && cumul.noms && cumul.moi !== undefined
                ? ` — tu es dans <b>${echapper(String(cumul.noms[cumul.moi] || ''))}</b>` : ''}`
            : ''
    ].filter(Boolean).map((t) => `<div class="defi-regle">${t}</div>`).join('');
    const voile = plateau(`
        <div class="defi-carte">
            <div class="defi-titre">⚡ DÉFI DE LA CLASSE</div>
            <div class="defi-exo">${echapper(exo ? exo.title : defi.exo)}</div>
            ${regles}
            ${ligneDuRecord(cumul && cumul.record)}
            <div class="defi-compte" data-compte>${Math.max(1, defi.avant)}</div>
            <div class="defi-sous">Tout le monde commence en même temps.</div>
        </div>`, 'defi-voile--annonce');
    // L'ANNONCE, ET ELLE EST LA MOITIÉ DU MÉCANISME.
    //
    // RÉMY : « ça se lance pareil pour tout le monde ? au même moment ? ».
    // L'ardoise interroge le serveur toutes les DIX secondes : sans annonce,
    // celle qui vient de le faire apprenait le défi dix secondes après celle du
    // voisin, et perdait ces dix secondes-là. Le serveur fixe donc le départ
    // douze secondes plus tard, et chacun regarde le même compte à rebours
    // tomber. ON LE RELIT SUR L'HORLOGE DU SERVEUR à chaque tour, pour la même
    // raison qu'ailleurs : un onglet en arrière-plan fige les minuteurs.
    const compte = voile.querySelector('[data-compte]');
    for (;;) {
        const d = defiEnCours();
        if (!d) { voile.remove(); enCours = false; return; }
        if (d.avant <= 0) break;
        compte.textContent = String(d.avant);
        await dormir(250);
    }
    voile.remove();
    await questionner(defi, exo);
    enCours = false;
    // LE TABLEAU S'OUVRE ICI, ET PAS AVANT. `regarder` se refuse tant que
    // `enCours` est vrai : le décompte du classement tient donc la porte
    // fermée pendant que les scores arrivent, et tout le monde découvre le
    // podium au même instant — avec les trente dedans.
    regarder();
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function questionner(defi, exo) {
    // EN POINTS OU EN BONNES RÉPONSES ? On le décide AVANT de bâtir la carte :
    // le compteur du haut, la place du dessin et la taille de l'énoncé en
    // dépendent, et l'exercice ne change pas en cours de défi.
    const enPoints = compteEnPoints(defi.exo, defi.graine);
    // ── CE QUE COÛTE UNE FAUTE ──────────────────────────────────────────
    //
    // RÉMY : « j'ai un élève qui a cliqué n'importe quoi en qcm et aue plein de
    // point, il faudrait faire qqch ». Quatre propositions, une chance sur
    // quatre, et la seule limite était la vitesse du doigt : marteler
    // rapportait plus que réfléchir, et l'élève avait RAISON de recommencer —
    // c'est le logiciel qui lui avait appris que c'était payant.
    //
    // À une faute = une bonne réponse, le hasard rapporte en moyenne
    // (1/4 − 3/4) = −0,5 point par clic. Il n'y a rien à interdire ni personne
    // à exclure : le barème s'en charge.
    //
    // ABSENT VEUT DIRE « LE DÉFAUT » : un défi annoncé par un serveur qui n'a
    // pas encore la colonne ne doit pas ramener en silence l'ancien barème.
    const malus = Math.max(0, Math.min(2, Number(defi.malus ?? 1)));
    // ET L'ÉLÈVE DOIT VOIR LE SCORE QUI COMPTE. Sur un défi de calcul, le
    // compteur du haut montrait les BONNES RÉPONSES, tandis que le classement
    // se fait sur les POINTS : avec une pénalité, les deux cessent de
    // coïncider, et l'élève perdrait des places sans qu'aucun chiffre ne bouge
    // sous ses yeux. Une règle qu'on ne voit pas s'appliquer ne s'apprend pas.
    const enScore = enPoints || malus > 0;
    const voile = plateau(`
        <div class="defi-carte defi-carte--jeu${enPoints ? ' defi-carte--estim' : ''}">
            <!-- ON DIT CE QUE C'EST, MÊME PENDANT. Les trois secondes de départ
                 l'annoncent, mais un élève qui lève les yeux dix secondes plus
                 tard ne sait plus pourquoi son écran a changé. -->
            <div class="defi-titre">⚡ DÉFI DE LA CLASSE<span class="defi-manche"
                 data-manche hidden></span></div>
            <div class="defi-barre"><div class="defi-jauge" data-jauge></div></div>
            <!-- CE QUE LA CLASSE FAIT ENSEMBLE — la barre du but commun, ou les
                 deux équipes. Vide et caché quand c'est un défi ordinaire : le
                 classement n'a rien à montrer en direct, et il ne doit pas
                 prendre la place de la question. -->
            <div class="defi-ensemble" data-ensemble hidden></div>
            <div class="defi-haut">
                <!-- LE TEMPS TIENT EN UN SEUL ÉLÉMENT, et c'est la photo qui
                     l'a dit : dans un « justify-content: space-between », le
                     « 12 » et le « s » sont DEUX enfants, donc ils partent
                     chacun à un bout de la carte. -->
                <span class="defi-temps"><b data-reste>${defi.reste}</b> s</span>
                <!-- LE COMPTEUR DIT CE QU'ON GAGNE VRAIMENT. Dans un défi
                     d'estimation, les points sont continus — cent si l'on
                     tombe pile, huit de moins par degré d'écart — et afficher
                     « 3 bonnes réponses » cacherait exactement ce que Rémy
                     voulait rendre motivant : de combien on s'est approché. -->
                <span class="defi-score">${enScore
                    ? '⭐ <b data-bonnes>0</b> pts'
                    : '✅ <b data-bonnes>0</b>'}</span>
            </div>
            <div class="defi-question" data-question></div>
            <div class="defi-reponses" data-reponses></div>
            <!-- L'ENTRACTE ENTRE DEUX MANCHES. Il vit DANS la carte du jeu et
                 non dans un voile à part : le défi n'est pas fini, le score
                 est gardé, et un second voile donnerait à l'élève le sentiment
                 d'avoir perdu sa partie. On cache les questions, c'est tout. -->
            <div class="defi-entracte" data-entracte hidden>
                <div class="defi-entracte-titre">MANCHE <b data-manche-prochaine>2</b></div>
                <div class="defi-compte" data-pause-compte>0</div>
                <div class="defi-sous">Respire — ton score est gardé.</div>
            </div>
        </div>`, 'defi-voile--jeu');

    const el = (s) => voile.querySelector(s);
    // LA PARTIE EST FINIE QUAND LE DÉCOMPTE DU CLASSEMENT L'EST.
    //
    // `questionner` était `async` sans aucun `await` : elle rendait la main
    // dès la première question posée, et `enCours` retombait à faux pendant
    // tout le défi. On tient donc la promesse à la main, et c'est `terminer`
    // qui la dénoue — c'est ce qui permet au décompte de retenir le tableau.
    let denouer = null;
    const finie = new Promise((r) => { denouer = r; });
    let n = 0;
    let bonnes = 0;
    // LES DEUX COMPTES SONT SÉPARÉS, et c'est la même séparation que dans
    // « À vue d'œil ». LES POINTS font le classement, parce qu'eux seuls disent
    // de combien on s'est approché. LA BONNE RÉPONSE reste franche, à la
    // tolérance près, parce que c'est elle qui dira au professeur si la
    // compétence est acquise — un barème continu n'est pas une maîtrise.
    // POUR UN DÉFI DE CALCUL LES DEUX COÏNCIDENT : un point par bonne réponse,
    // et le classement ne change pas d'un iota.
    let points = 0;
    let total = 0;
    let ms = 0;
    let fini = false;
    let clavier = null;
    // CE QUI RELÂCHE L'ÉCOUTE DU « passer plus tôt », quand la minute tombe
    // pendant qu'on regarde son écart.
    let libererLaTouche = null;

    // ── CE QUE LE BATTEMENT EMPORTE, ET POURQUOI PAS UNE REQUÊTE À PART ──
    //
    // La barre de la classe et les deux équipes ont besoin du score des TRENTE
    // pendant que le défi tourne — alors que chacun n'envoyait le sien qu'à la
    // fin. On ne crée pas de requête pour autant : on POSE le score dans une
    // boîte aux lettres (`core/scoreDuDefi.js`) que le battement vide toutes
    // les dix secondes, là où voyage déjà l'écran de l'élève.
    //
    // ET ON LE POSE TOUT DE SUITE, À ZÉRO : c'est ce qui fait compter cet élève
    // parmi les participants dès la première lecture du professeur. Sans cela,
    // une classe de trente s'afficherait à deux ou trois pendant les premières
    // dizaines de secondes de chaque défi — le temps que les plus rapides
    // marquent leur premier point.
    const annoncerLeScore = () => poserLeScoreDuDefi({ bonnes, total, ms, points });
    annoncerLeScore();

    // ── L'ENTRACTE, ET POURQUOI IL NE DÉMONTE RIEN ───────────────────────
    //
    // Entre deux manches, on cache les questions et l'on montre un décompte.
    // La partie continue : le score, le rang de la question, les minuteurs en
    // cours — tout reste en place. C'est une respiration, pas une fin.
    let enEntracte = false;
    const basculerEntracte = (d) => {
        const q = el('[data-question]');
        const r = el('[data-reponses]');
        const e = el('[data-entracte]');
        if (q) q.hidden = enEntracte;
        if (r) r.hidden = enEntracte;
        if (e) e.hidden = !enEntracte;
        const suivante = el('[data-manche-prochaine]');
        if (suivante) suivante.textContent = String(Math.min(d.manches, d.manche + 1));
    };

    // ── LA BARRE DE LA CLASSE, REPEINTE SEULEMENT QUAND ELLE CHANGE ──────
    //
    // `tic` passe QUATRE FOIS PAR SECONDE, et réécrire le HTML à chaque tour
    // rallumerait la transition CSS de la jauge en boucle : la barre
    // tremblerait sur place au lieu de monter. On compare donc le texte produit
    // au précédent — le total ne change que toutes les dix secondes, de toute
    // façon, puisqu'il arrive par le battement.
    let ensembleEcrit = null;
    const peindreLEnsemble = (d) => {
        const zone = el('[data-ensemble]');
        if (!zone) return;
        const html = ensembleDuDefi(cumulDuDefi(), d);
        if (html === ensembleEcrit) return;
        ensembleEcrit = html;
        zone.innerHTML = html;
        zone.hidden = !html;
    };

    // LE TEMPS RESTANT SE RELIT SUR L'HORLOGE DU SERVEUR À CHAQUE SECONDE, et
    // ne se décompte pas tout seul : un onglet mis en arrière-plan fige les
    // minuteurs du navigateur, et l'élève se retrouverait avec trente secondes
    // de plus que son voisin.
    const tic = setInterval(() => {
        const d = defiEnCours();
        if (!d) { if (!fini) { fini = true; terminer(); } return; }
        // LE BANDEAU DIT LA MANCHE, et seulement quand il y en a plusieurs :
        // « Manche 1/1 » serait une information de plus à lire pour rien.
        const bandeau = el('[data-manche]');
        if (bandeau) {
            bandeau.hidden = d.manches <= 1;
            if (d.manches > 1) bandeau.textContent = ` · manche ${d.manche}/${d.manches}`;
        }
        // ET ELLE RESTE VISIBLE PENDANT L'ENTRACTE — c'est même là qu'elle
        // sert le plus : les vingt secondes de pause sont exactement le moment
        // où le professeur dit « il nous manque quarante points ».
        peindreLEnsemble(d);
        if (d.enPause !== enEntracte) { enEntracte = d.enPause; basculerEntracte(d); }
        if (enEntracte) {
            const c = el('[data-pause-compte]');
            if (c) c.textContent = String(Math.max(0, d.resteAvantManche));
            return;
        }
        // LE CHRONO ET LA JAUGE COMPTENT LA MANCHE, PAS LE DÉFI. Une jauge qui
        // montrerait les deux minutes entières n'aurait presque pas bougé au
        // bout de la première manche, et l'élève n'aurait pas su qu'elle
        // finissait. `dureeManche` vaut tout le défi quand il n'y a qu'une
        // manche : le cas d'avant est exactement le même code.
        const reste = Math.max(0, Math.min(d.resteManche, d.dureeManche));
        el('[data-reste]').textContent = String(reste);
        el('[data-jauge]').style.width =
            `${Math.max(0, Math.min(100, (reste / d.dureeManche) * 100))}%`;
        if (d.reste <= 0 && !fini) { fini = true; terminer(); }
    }, 250);

    const terminer = async () => {
        clearInterval(tic);
        // LA BOÎTE AUX LETTRES SE VIDE ICI. Le score final part juste en
        // dessous par sa propre route ; le laisser dedans ferait réécrire la
        // même ligne toutes les dix secondes pendant les cinq minutes
        // d'affichage du tableau — trente ardoises, cent-cinquante écritures
        // pour rien, et c'est exactement la bousculade qu'on vient de corriger.
        poserLeScoreDuDefi(null);
        if (clavier) { document.removeEventListener('keydown', clavier); clavier = null; }
        if (libererLaTouche) { libererLaTouche(); libererLaTouche = null; }
        voile.remove();
        // CE QUE CET APPAREIL A COMPTÉ, gardé avant tout aller-retour : si le
        // serveur tarde, l'élève lira au moins son propre score plutôt qu'un
        // démenti. Voir `ATTENTES_MAX` plus haut.
        monScore = { bonnes, total, points };
        // LE DÉCOMPTE DU CLASSEMENT — voir `SECONDES_DU_CLASSEMENT`. Il n'est
        // pas décoratif : c'est lui qui donne au serveur le temps de recevoir
        // les trente scores avant que quiconque ne photographie le classement.
        const attente = plateau(`
            <div class="defi-carte defi-carte--compte">
                <div class="defi-titre">⏱ LE DÉFI EST FINI</div>
                <div class="defi-compte" data-compte>${SECONDES_DU_CLASSEMENT}</div>
                <div class="defi-sous">On rassemble les scores de toute la classe…</div>
            </div>`, 'defi-voile--annonce');
        // ── LE SCORE PART, ET IL REPART TANT QU'IL N'EST PAS ARRIVÉ ──────
        //
        // IL ÉTAIT ENVOYÉ UNE FOIS, ET L'ÉCHEC AVALÉ EN SILENCE — `catch (e) {}`
        // avec, en commentaire, « on retentera au prochain état ». On ne
        // retentait nulle part. MESURÉ (`tools/trenteDUnCoup.mjs`) : sur trente
        // ardoises qui envoient dans la même seconde, VINGT-QUATRE recevaient
        // une erreur du serveur, et ces élèves-là n'étaient dans AUCUN podium —
        // ni le leur, ni celui des autres. C'est, mot pour mot, ce que Rémy a vu
        // dans sa classe : « est ce normal que tous les élèves n'aient pas eu le
        // podium ? »
        //
        // LA CAUSE PRINCIPALE ÉTAIT AU SERVEUR et elle est corrigée là-bas. Mais
        // un client qui perd son score en silence est un défaut à lui seul : un
        // réseau d'établissement hoquette, une tablette repasse par le portail
        // Wi-Fi, et l'élève disparaît du classement sans que personne ne sache
        // pourquoi. Le décompte nous offre trois occasions de plus ; on les
        // prend, et on s'arrête dès que le serveur dit oui.
        let arrive = false;
        const envoyer = async () => {
            if (arrive) return;
            try {
                // ON ENVOIE LES DEUX COMPTES. Le serveur classe sur les points ;
                // quand le client ne lui en donne pas — une ardoise qui n'a pas
                // encore la mise à jour —, il retombe sur les bonnes réponses,
                // et le classement d'un défi de calcul est le même.
                const r = await apiEleve('/defi/score', { bonnes, total, ms, points });
                // LE SERVEUR DIT `ok: false` QUAND IL N'Y A PLUS DE DÉFI. Le
                // renvoyer serait inutile, et masquerait un vrai échec réseau.
                if (r && r.ok !== undefined) arrive = true;
            } catch (e) { /* on repassera au tour suivant du décompte */ }
        };
        await envoyer();
        // PUIS ON REDEMANDE L'ÉTAT TOUT DE SUITE.
        //
        // C'est la moitié qui compte de la correction de Rémy — « les autres
        // c'était noté, tu n'as pas participé à ce défi ». Sans cette ligne, le
        // tableau arrive au battement suivant, jusqu'à dix secondes plus tard ;
        // et s'il arrive AVANT que le score ne soit rangé, il oublie celui qui
        // vient de jouer.
        try { await rafraichirSeance(); } catch (e) { /* on retentera */ }
        // ET ON REDEMANDE À CHAQUE SECONDE DU DÉCOMPTE. « forcer une requete
        // php pour avoir le classement total », demandait Rémy : la voilà,
        // trois fois plutôt qu'une — les trente scores n'arrivent pas au même
        // instant, et une seule requête rate ceux qui traînent d'une seconde.
        for (let reste = SECONDES_DU_CLASSEMENT - 1; reste >= 0; reste--) {
            await dormir(1000);
            const c = attente.querySelector('[data-compte]');
            if (c) c.textContent = String(Math.max(0, reste));
            await envoyer();
            try { await rafraichirSeance(); } catch (e) { /* on retentera */ }
        }
        attente.remove();
        denouer();
    };

    const poser = () => {
        if (fini) return;
        if (clavier) { document.removeEventListener('keydown', clavier); clavier = null; }
        // LES RÉGLAGES DU DÉFI, ET NON CEUX DE L'EXERCICE : le professeur a pu
        // choisir une marche en lançant. Voir `questionDuDefi`.
        const item = questionDuDefi(exo, defi.graine, n, defi.params);
        if (!item) { fini = true; terminer(); return; }
        el('[data-question]').innerHTML = (item.prompt && item.prompt.html)
            ? item.prompt.html
            : `<div class="game-question">${echapper((item.prompt || {}).text || '')}</div>`;
        const zone = el('[data-reponses]');
        zone.innerHTML = '';
        const parti = Date.now();

        /**
         * On affiche le compte, on laisse voir, et on enchaîne.
         *
         * `passable` : on peut abréger d'un doigt ou d'une touche, après un
         * court délai de garde. Sans ce délai, le doigt encore posé sur « Je
         * parie ! » sauterait la correction qu'on vient de demander.
         */
        const enchainer = (attente, passable = false) => {
            el('[data-bonnes]').textContent = String(enScore ? points : bonnes);
            // ET LE BATTEMENT L'EMPORTERA : c'est le seul endroit par lequel
            // passent les DEUX façons de répondre, le choix et le pari.
            annoncerLeScore();
            let fait = false;
            let ecoute = null;
            const liberer = () => {
                if (!ecoute) return;
                document.removeEventListener('pointerdown', ecoute);
                document.removeEventListener('keydown', ecoute);
                ecoute = null;
                libererLaTouche = null;
            };
            const suite = () => {
                if (fait) return;
                fait = true;
                clearTimeout(minuteur);
                liberer();
                // LA MINUTE A PU TOMBER PENDANT CE TEMPS-LÀ, et le voile est
                // alors démonté : poser une question de plus irait chercher des
                // crochets qui n'existent plus.
                if (fini) return;
                // ET L'ENTRACTE A PU COMMENCER. Poser la question suivante
                // derrière le décompte la BRÛLERAIT : l'élève la retrouverait
                // déjà affichée à la reprise, sans l'avoir vue arriver, et le
                // temps de la lire serait passé pendant la pause.
                if (enEntracte) { setTimeout(suite, 300); fait = false; return; }
                zone.classList.remove('defi-ok', 'defi-ko');
                n++;
                poser();
            };
            const minuteur = setTimeout(suite, attente);
            if (!passable) return;
            setTimeout(() => {
                if (fait || fini) return;
                ecoute = (e) => {
                    if (e.type === 'keydown'
                        && e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
                    suite();
                };
                document.addEventListener('pointerdown', ecoute);
                document.addEventListener('keydown', ecoute);
                libererLaTouche = liberer;
            }, AVANT_DE_POUVOIR_PASSER);
        };

        const repondre = (juste) => {
            if (fini) return;
            total++;
            if (juste) { bonnes++; points++; ms += Date.now() - parti; }
            // ET LA FAUTE COÛTE. On ne descend pas sous zéro : un score négatif
            // n'apprend rien de plus et décourage celui qui a commencé par se
            // tromper — c'est aussi ce que le serveur garde (`max(0, …)`).
            else points = Math.max(0, points - malus);
            zone.classList.add(juste ? 'defi-ok' : 'defi-ko');
            enchainer(260);
        };

        // ── RÉPONDRE EN ESTIMANT UN ANGLE ──────────────────────────────────
        //
        // ET CETTE BRANCHE PASSE AVANT LES DEUX AUTRES, ce qui n'est pas un
        // détail de style : un item d'estimation PORTE une `answer` — la mesure
        // exacte de l'angle —, donc le mode « saisie » lui donnerait un champ
        // de texte et une comparaison exacte. L'élève à un degré près serait
        // compté faux, et le défi mesurerait tout le contraire de ce que Rémy a
        // demandé : « plus il est proche, plus il a de points ».
        if (estUneEstimation(item)) {
            const m = item.meta;
            let pari = 45;
            zone.innerHTML = `
                <div class="defi-estim">
                    <svg class="ea-dessin" viewBox="0 0 ${VUE.largeur} ${VUE.hauteur}"
                         role="img" aria-label="Un angle à estimer" data-dessin></svg>
                    <div class="ea-pari" data-pari>
                        <button type="button" class="ea-pm" data-pas="-10"
                            aria-label="Dix degrés de moins">−10</button>
                        <button type="button" class="ea-pm" data-pas="-1"
                            aria-label="Un degré de moins">−1</button>
                        <div class="ea-champ"><b data-valeur>${pari}°</b>
                            <span>ton pari</span></div>
                        <button type="button" class="ea-pm" data-pas="1"
                            aria-label="Un degré de plus">+1</button>
                        <button type="button" class="ea-pm" data-pas="10"
                            aria-label="Dix degrés de plus">+10</button>
                    </div>
                    <button type="button" class="ea-go" data-go>Je parie !</button>
                </div>`;
            const svg = zone.querySelector('[data-dessin]');
            // RIEN NE BOUGE AVANT LE PARI : le dessin ne suit pas le nombre,
            // sinon on ajusterait jusqu'à ce que ça colle et l'on ne
            // mesurerait plus l'œil mais l'adresse. C'est la règle de
            // l'exercice, et elle vaut ici pour la même raison.
            svg.innerHTML = dessinDeLAngle(m, null);
            const bouger = (pas) => {
                pari = Math.max(1, Math.min(359, pari + pas));
                const b = zone.querySelector('[data-valeur]');
                if (b) b.textContent = `${pari}°`;
            };
            // ON NE PARIE QU'UNE FOIS. Le bouton reste à l'écran après le
            // pari — il devient « Suivant → » —, et sans ce verrou un second
            // appui compterait une deuxième question, avec le même écart.
            let pose = false;
            const parier = () => {
                if (fini || pose) return;
                pose = true;
                if (clavier) {
                    document.removeEventListener('keydown', clavier);
                    clavier = null;
                }
                total++;
                const ecart = pari - m.angle;
                const gagnes = pointsDeLEcart(ecart);
                points += gagnes;
                const juste = Math.abs(ecart) <= (m.tolerance || 5);
                if (juste) { bonnes++; ms += Date.now() - parti; }
                // ON MONTRE L'ÉCART, ET LES POINTS POUR TOUTE PHRASE.
                //
                // DEUX DIFFÉRENCES AVEC L'EXERCICE, et les deux viennent du
                // chrono : le retour ne dure que huit cents millisecondes — on
                // VOIT sa mince part de camembert, mais on ne s'y installe
                // pas, la minute est à toute la classe —, et l'on n'écrit
                // aucune phrase, parce qu'à ce rythme-là on ne lit pas.
                //
                // ET ON N'AGITE PAS LA CARTE EN ROUGE quand on est loin :
                // `defi-ko` dit « c'est faux », et l'on n'est jamais faux
                // quand on estime. Un élève à sept degrés a bien travaillé.
                svg.innerHTML = dessinDeLAngle(m, pari);
                const pad = zone.querySelector('[data-pari]');
                if (pad) {
                    // ET ON ÉCRIT LA VRAIE MESURE EN TOUTES LETTRES. Elle est
                    // déjà sur le dessin, en petit, au milieu du secteur — et
                    // c'est justement là qu'on ne la cherche pas quand on vient
                    // de lire ses points. Rémy : « la vraie réponse passait
                    // vite » ; elle passait surtout inaperçue.
                    pad.innerHTML = '<div class="defi-gagne">+' + gagnes
                        + '<small>pts</small></div>'
                        + '<div class="defi-vrai">c\'était <b>' + m.angle + '°</b>'
                        + (ecart === 0 ? ' — pile poil !'
                            : ` — tu as dit ${pari}°`) + '</div>';
                }
                // LE BOUTON DEVIENT « Suivant → » : il dit ce qu'on peut
                // faire, au lieu de disparaître et de laisser la carte sauter
                // d'un centimètre au moment où l'on veut lire son écart.
                const go = zone.querySelector('[data-go]');
                if (go) {
                    go.textContent = 'Suivant →';
                    go.classList.add('ea-go--suite');
                }
                if (juste) zone.classList.add('defi-ok');
                enchainer(ATTENTE_CORRECTION, true);
            };
            zone.querySelectorAll('[data-pas]').forEach((b) => {
                b.onclick = () => bouger(Number(b.dataset.pas));
            });
            zone.querySelector('[data-go]').onclick = parier;
            // LE CLAVIER AUSSI, ET POUR UNE RAISON PROPRE AU DÉFI : une minute
            // pour viser à quelques degrés près, c'est court, et les flèches
            // vont plus vite que le doigt sur un ordinateur. Le voile n'a pas
            // le foyer — on écoute donc sur le document, et on relâche dès que
            // le pari est posé, sans quoi les flèches de la question suivante
            // iraient nourrir celle d'avant.
            clavier = (e) => {
                if (fini) return;
                if (e.key === 'ArrowUp' || e.key === 'ArrowRight') bouger(1);
                else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') bouger(-1);
                else if (e.key === 'PageUp') bouger(10);
                else if (e.key === 'PageDown') bouger(-10);
                else if (e.key === 'Enter') parier();
                else return;
                e.preventDefault();
            };
            document.addEventListener('keydown', clavier);
            return;
        }

        // DEUX FAÇONS DE RÉPONDRE, « aux choix » — et c'est le choix de Rémy au
        // lancement, pas celui de l'élève : une classe où chacun choisit son
        // mode ne se compare plus.
        if (defi.mode === 'saisie' && item.answer !== undefined && item.answer !== null) {
            zone.innerHTML = '<input class="defi-saisie" type="text" inputmode="numeric" '
                + 'autocomplete="off" data-saisie><button class="defi-valider" '
                + 'type="button" data-valider>OK</button>';
            const champ = zone.querySelector('[data-saisie]');
            const valider = () => {
                const lu = (champ.value || '').trim().replace(',', '.').replace('-', '−');
                const attendu = String(item.answer).trim().replace(',', '.').replace('-', '−');
                repondre(lu !== '' && lu === attendu);
            };
            zone.querySelector('[data-valider]').onclick = valider;
            champ.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); valider(); } };
            champ.focus();
            return;
        }
        const choix = (item.choices || []).slice(0, 4);
        if (!choix.length) { n++; poser(); return; }
        choix.forEach((c) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'defi-choix';
            b.innerHTML = c.label !== undefined ? String(c.label) : String(c.value);
            b.onclick = () => repondre(!!c.correct);
            zone.appendChild(b);
        });
    };
    poser();
    // LA PARTIE N'EST FINIE QU'AU BOUT DU DÉCOMPTE DU CLASSEMENT : c'est cette
    // promesse que `jouer` attend avant de rouvrir la porte du tableau.
    return finie;
}

/* ------------------------------------------------------------ Le tableau --- */

// LE TABLEAU OUVERT, pour pouvoir le remettre à jour sans le rouvrir.
//
// TRENTE ÉLÈVES FINISSENT DANS LA MÊME SECONDE, et chacun reçoit la photo que
// le serveur a prise au moment où SON ardoise a demandé. Les premiers servis
// voyaient donc un podium d'un ou deux prénoms, figé pour les cinq minutes
// d'affichage. MESURÉ, trois élèves : « Toi : 1e sur 1 » chez l'une,
// « 2e sur 2 » chez l'autre, pour le même défi et au même instant.
//
// Le tableau se redessine donc tant qu'il est à l'écran, à chaque état qui
// descend. Ce n'est pas un rafraîchissement de confort : un classement qui
// change sous les yeux est gênant une seconde, un classement faux l'est toute
// l'heure — et c'est de ce tableau-là que Rémy parle ensuite à sa classe.
let tableauOuvert = null;

/**
 * CE QUE LA CLASSE A FAIT ENSEMBLE, SUR LE TABLEAU DE FIN.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * IL PASSE AVANT LE PODIUM, et ce n'est pas un choix de mise en page : quand il
 * y a un but commun, le résultat de la classe EST le résultat du défi — le
 * podium n'en est plus que le détail. Rémy veut une classe qui se parle après le
 * défi ; trois prénoms en haut de l'écran ne font parler que trois élèves.
 *
 * LE RECORD, LUI, S'AFFICHE TOUJOURS — même dans un défi au classement. C'est
 * le total de la classe, il existe dans les trois façons de jouer, et c'est lui
 * qui fait revenir la semaine suivante.
 */
function verdictDEnsemble(t) {
    const total = pts(t.total);
    const but = Math.max(0, Math.round(Number(t.but) || 0));
    const bouts = [];
    if (but > 0) {
        const gagne = total >= but;
        const manque = but - total;
        bouts.push(`<div class="defi-but${gagne ? ' defi-but--atteint' : ''}">
            <div class="defi-but-ligne">
                <span>${gagne ? '🎉 GAGNÉ !' : '🤝 LA CLASSE'}</span>
                <span class="defi-but-pts"><b>${total}</b> / ${but}</span>
            </div>
            <div class="defi-barre"><div class="defi-jauge defi-jauge--but"
                 style="width:${part(total, but)}"></div></div>
            <div class="defi-sous">${gagne
        ? 'Objectif atteint, et c\'est toute la classe qui l\'a atteint.'
        // ON DIT CE QUI MANQUAIT, PAS QU'ON A PERDU. Un but commun raté reste
        // un total que la classe a construit à trente ; le nombre qui manque
        // est une raison de recommencer, « perdu » n'en est pas une.
        : `Il manquait ${manque} point${manque > 1 ? 's' : ''}.`}</div>
        </div>`);
    }
    if (t.parEquipes) {
        const e = [pts((t.equipesPoints || [])[0]), pts((t.equipesPoints || [])[1])];
        const noms = t.noms || ['Les Bleus', 'Les Orange'];
        bouts.push(barresDesEquipes({ equipes: e, noms, moi: t.maEquipe }));
        bouts.push(`<div class="defi-sous">${e[0] === e[1]
            ? 'Égalité parfaite.'
            : `${echapper(String(noms[e[0] > e[1] ? 0 : 1] || ''))} gagnent ce défi.`}</div>`);
    }
    // ── LE RECORD : BATTU, OU À QUELLE DISTANCE ──────────────────────────
    const ancien = t.record && t.record.points ? pts(t.record.points) : 0;
    if (total > 0) {
        bouts.push(!ancien
            // LE PREMIER DÉFI SUR CET EXERCICE N'A RIEN BATTU, et le dire
            // ainsi — « le record est à vous » — vaut mieux que de masquer la
            // ligne : c'est la fois où l'on apprend que le record existe.
            ? `<div class="defi-record defi-record--neuf">🏅 Premier défi sur cet exercice :
                le record de la classe est à <b>${total}</b>.</div>`
            : (total > ancien
                ? `<div class="defi-record defi-record--neuf">🏅 NOUVEAU RECORD !
                    <b>${total}</b> <small>— l'ancien était à ${ancien}</small></div>`
                : `<div class="defi-record">🏅 ${total} points — le record de la classe
                    est à <b>${ancien}</b>${total === ancien ? '' : `, il manquait
                    ${ancien - total}`}.</div>`));
    }
    return bouts.join('');
}

function corpsDuTableau(t, monScoreLocal) {
    // LE TABLEAU D'UN DÉFI D'ESTIMATION SE LIT EN POINTS. Le serveur classe
    // déjà sur eux ; afficher « 3 » là où l'élève a marqué 274 donnerait un
    // podium qu'on ne comprend pas, et un ordre qui a l'air faux.
    const enPoints = compteEnPoints(t.exo, t.debut);
    // `points` EST LA SEULE COLONNE QUI CLASSE, donc la seule qu'on affiche.
    // Pour un défi de calcul elle VAUT les bonnes réponses, donc le nombre ne
    // change pas — seul le mot qui l'accompagne change. Et si elle manque, on
    // retombe dessus : une ardoise d'avant la mise à jour n'en envoyait pas.
    const compte = (l) => Number(l.points === undefined || l.points === null
        ? (l.bonnes || 0) : l.points);
    const mot = (v) => enPoints
        ? `<b>${v}</b> point${v > 1 ? 's' : ''}`
        : `<b>${v}</b> bonne${v > 1 ? 's' : ''} réponse${v > 1 ? 's' : ''}`;
    const marches = ['🥇', '🥈', '🥉'];
    const podium = (t.podium || []).map((p, i) =>
        `<div class="defi-marche"><span class="defi-medaille">${marches[i] || ''}</span>`
        + `<span class="defi-prenom">${echapper(p.prenom)}</span>`
        + `<span class="defi-pts">${compte(p)}</span></div>`).join('');
    // SA LIGNE À LUI, TOUJOURS, même quand il est sur le podium : c'est celle
    // qu'il cherche des yeux, et la faire disparaître dans ce cas-là
    // obligerait à se chercher dans la liste.
    const moi = t.moi
        ? `<div class="defi-moi">Toi : <b>${t.moi.rang}<sup>e</sup></b> sur `
            + `${t.participants} — ${mot(compte(t.moi))}</div>`
        // ON NE DÉMENT PAS CELUI QUI VIENT DE JOUER. Son score n'est pas
        // remonté — le réseau, le plus souvent —, et lui dire qu'il n'a pas
        // participé serait faux là où il est le mieux placé pour le savoir.
        : (monScoreLocal
            ? `<div class="defi-moi">Toi : ${mot(enPoints
                ? (monScoreLocal.points || 0) : monScoreLocal.bonnes)} `
                + '— ton classement n\'a pas pu être calculé.</div>'
            : '<div class="defi-moi">Tu n\'as pas participé à ce défi.</div>');
    return `
        <div class="defi-carte defi-carte--fin">
            <div class="defi-titre">🏆 LE DÉFI EST FINI</div>
            ${verdictDEnsemble(t)}
            <div class="defi-podium">${podium || '<div class="defi-moi">Personne n’a marqué.</div>'}</div>
            ${moi}
            <button type="button" class="defi-valider" data-fermer>On continue !</button>
        </div>`;
}

/** Pose les gestes du tableau : il n'y en a qu'un, et il le ferme. */
function brancherLeTableau(voile) {
    const b = voile.querySelector('[data-fermer]');
    if (!b) return;
    b.onclick = () => { voile.remove(); tableauOuvert = null; };
}

/**
 * REMET À JOUR LE TABLEAU DÉJÀ OUVERT, s'il parle bien du même défi.
 *
 * ON NE REND PAS LE FOYER AU BOUTON à chaque mise à jour : l'élève qui vient
 * d'appuyer sur « On continue ! » le verrait se rallumer sous son doigt.
 */
function rafraichirLeTableau(t, monScoreLocal) {
    if (!tableauOuvert || tableauOuvert.debut !== t.debut) return false;
    if (!document.body.contains(tableauOuvert.voile)) { tableauOuvert = null; return false; }
    tableauOuvert.voile.innerHTML = corpsDuTableau(t, monScoreLocal);
    brancherLeTableau(tableauOuvert.voile);
    return true;
}

function montrerLeTableau(t, monScoreLocal = null) {
    const voile = plateau(corpsDuTableau(t, monScoreLocal));
    tableauOuvert = { debut: t.debut, voile };
    brancherLeTableau(voile);
    const b = voile.querySelector('[data-fermer]');
    if (b) b.focus();
}
