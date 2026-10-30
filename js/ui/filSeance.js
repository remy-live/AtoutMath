// LE FIL DE LA SÉANCE — où j'en suis, sans avoir à le demander.
//
// Rémy : « surtout il faut que la séance soit facilement visible l'avancement,
// et tout et tout ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// IL Y AVAIT UNE PROGRESSION, ET ELLE RÉPONDAIT À UNE AUTRE QUESTION.
//
// L'en-tête affiche « 7 / 10 » : c'est l'avancement DANS L'EXERCICE EN COURS.
// L'élève qui le lit ne sait toujours pas s'il lui reste une étape ou quatre —
// et c'est cette question-là qu'on se pose vraiment quand on regarde l'heure au
// fond de la classe. Un parcours de cinq étapes derrière un seul « suivant »,
// c'est un couloir sans fenêtres.
//
// UN FIL, DONC, ET PAS UNE SECONDE BARRE.
//
// Une case par étape, en haut, sur toute la largeur : pleine pour ce qui est
// fait, à moitié remplie pour l'étape en cours, vide pour ce qui reste. On lit
// « il m'en reste deux » sans lire un chiffre. Le chiffre est là quand même,
// à droite, pour qui veut être sûr.
//
// IL NE CLIQUE PAS — POUR L'ÉLÈVE. Sauter à l'étape 4 sans avoir fait les
// trois premières, c'est ce que le meneur refuse déjà : un fil cliquable
// serait un second chemin, et le seul qui ne respecte pas les règles du
// parcours.
//
// IL CLIQUE POUR LE PROFESSEUR QUI ESSAIE SON PARCOURS, et c'est une autre
// question. Rémy, devant un parcours de trente-cinq exercices : « on pourrait
// cliquer les pastilles à droite de "Nombres et calculs — 35 exercices" ».
// Pendant un essai, l'en-tête montre déjà « ‹ 1/35 › » — deux flèches qui ne
// savent avancer que d'un cran : atteindre le trentième exercice demande
// vingt-neuf clics, et l'on dépasse celui qu'on cherchait. Les trente-cinq
// cases sont là, sous les yeux, et elles nomment déjà ce qu'elles montrent.
//
// ON N'INVENTE PAS DE SECOND CHEMIN POUR AUTANT : le clic appelle `goToStep`,
// le saut que le meneur sait déjà faire et qu'il refuse hors essai
// (`allowStepNavigation`). Le fil ne devient donc cliquable que là où les deux
// flèches le sont, et jamais chez l'élève.
//
// ET IL NE MONTRE RIEN QUAND IL N'Y A RIEN À MONTRER. Un exercice libre, une
// séance d'une seule étape : le fil reste caché plutôt que d'annoncer
// « étape 1 sur 1 », qui est une information sans usage.

import { state } from '../core/state.js';
import { journal } from '../core/journal.js';
import { getExerciseById } from '../data/catalog.js';
import { computeRuns } from '../core/projections.js';
import { avancementDuRun } from '../core/avancement.js';
import { estUnMessage } from '../core/path.js';
import { apercuDuMessage } from '../core/messageEtape.js';

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Le dernier avancement dessiné — exposé pour les essais. */
let dernier = null;
export function dernierAvancement() { return dernier; }

function fil() {
    let el = document.getElementById('fil-seance');
    if (!el) {
        const couche = document.getElementById('game-layer');
        if (!couche) return null;
        el = document.createElement('div');
        el.id = 'fil-seance';
        el.className = 'fil';
        el.setAttribute('role', 'status');
        el.hidden = true;
        couche.insertBefore(el, couche.firstChild);
    }
    return el;
}

/**
 * L'AVANCEMENT DU RUN EN COURS, LU DANS LE JOURNAL.
 *
 * On ne lit pas les compteurs du meneur, ON REFAIT LE CALCUL DU SERVEUR. C'est
 * la même fonction, sur les mêmes événements : l'élève et le professeur ne
 * peuvent donc pas lire deux choses différentes du même travail.
 *
 * On filtre d'abord sur le run en cours — le journal porte quatre mois
 * d'histoire, et il n'y a aucune raison de tout reprojeter à chaque réponse.
 */
export function avancementDuMoment(meneur = state.activeSequenceRunner) {
    if (meneur && meneur.runId) {
        const miens = journal.all().filter(e => e.payload && e.payload.runId === meneur.runId);
        const run = miens.length && computeRuns(miens).find(r => r.runId === meneur.runId);
        if (run) return avancementDuRun(run);
    }
    return avancementDeLaDerniereSeance();
}

/**
 * LA DERNIÈRE SÉANCE, MÊME QUAND ELLE EST CLOSE.
 *
 * Le meneur disparaît en se terminant : `state.activeSequenceRunner` retombe à
 * `null` dès la dernière question répondue. Or c'est EXACTEMENT à ce
 * moment-là qu'on a besoin de savoir où en est l'élève — c'est la porte du bac
 * à sable qui le demande, et elle ne s'ouvre qu'une fois la séance finie.
 *
 * ON SAUTE LES PARTIES DU BAC, comme le serveur. Une partie de Tetris ouverte
 * après un devoir rendu est plus récente que le devoir ; sans ce filtre, la
 * porte se refermerait dès la première partie et l'élève ne pourrait plus en
 * lancer une seconde.
 *
 * On ne relit que les derniers événements : le journal porte quatre mois
 * d'histoire, et une séance en compte quelques dizaines.
 */
export function avancementDeLaDerniereSeance(combien = 400) {
    const tous = journal.all();
    const recents = tous.length > combien ? tous.slice(-combien) : tous;
    const run = computeRuns(recents).find(r => !r.bac);
    return run ? avancementDuRun(run) : null;
}

/**
 * LE MENEUR, QUAND C'EST LE PROFESSEUR QUI PILOTE — et lui seul.
 *
 * `allowStepNavigation` est le drapeau que le meneur pose déjà pour montrer
 * les deux flèches de l'en-tête. On ne réinvente donc pas la règle : on lit
 * celle qui existe, et le fil et les flèches ne peuvent pas diverger.
 */
function meneurPilotable() {
    const r = state.activeSequenceRunner;
    return (r && r.allowStepNavigation && typeof r.goToStep === 'function') ? r : null;
}

/**
 * L'ÉTAPE DE RANG `i`, telle qu'on peut la lire d'ici.
 *
 * DEUX SOURCES, ET IL FAUT LES DEUX : le meneur quand il tourne (ses étapes
 * sont hydratées), le parcours de l'élève sinon — c'est le cas du fil affiché
 * entre deux exercices, ou après la séance.
 */
function etapeDeRang(meneur, i) {
    // LE MENEUR QUI TOURNE, PILOTABLE OU PAS — et c'est la correction que la
    // sonde a imposée.
    //
    // Ma première version lisait `meneurPilotable()`, c'est-à-dire le meneur
    // SEULEMENT quand le professeur le pilote, et retombait sinon sur
    // `state.studentPath`. MESURÉ (`tools/motDansLeParcours.mjs`) : trois cases
    // au fil, aucune reconnue comme un mot. La raison est que `studentPath` est
    // la séance ASSIGNÉE — or le professeur qui essaie son propre parcours, ou
    // l'élève qui lance une séance par code, ne travaillent pas sur celle-là.
    // Le fil lisait donc les étapes d'un autre parcours, et personne ne s'en
    // apercevait puisqu'il n'en tirait qu'un titre.
    //
    // `state.activeSequenceRunner` porte les étapes HYDRATÉES de ce qui tourne
    // vraiment : c'est la source la plus proche de l'écran, et elle vaut dans
    // les trois cas.
    const r = meneur || state.activeSequenceRunner;
    const duRun = r && r.steps && r.steps[i];
    if (duRun) return duRun;
    const p = state.studentPath;
    return (p && p.steps && p.steps[i]) || null;
}

/** Le titre de l'étape de rang `i`, pour l'infobulle du fil. */
function titreEtape(meneur, i) {
    const s = etapeDeRang(meneur, i);
    // UN MESSAGE N'A PAS D'EXERCICE, DONC PAS DE TITRE D'EXERCICE — et la case
    // du fil restait sans infobulle, c'est-à-dire indistinguable des autres.
    if (estUnMessage(s)) return apercuDuMessage(s.message);
    const exo = s && s.exerciseId ? getExerciseById(s.exerciseId) : null;
    return (exo && exo.title) || '';
}

function caseHtml(i, av, meneur) {
    const fait = i < av.faites;
    const enCours = av.etapeEnCours && i === av.etapeEnCours.rang;
    // UNE ÉTAPE FAITE N'EST PAS FORCÉMENT RÉUSSIE, et le fil le dit. C'est
    // l'élève qui la regarde : lui montrer une case pleine sur une étape ratée
    // lui ferait croire qu'il peut passer à la suite sans revenir dessus.
    const ratee = fait && (av.detailEtapes || [])[i] === false;
    let part = 0;
    if (fait) part = 100;
    else if (enCours && av.etapeEnCours.prevues > 0) {
        part = Math.min(100, Math.round(100 * av.etapeEnCours.posees / av.etapeEnCours.prevues));
    } else if (enCours) part = 8;   // commencée, sans total connu : un liseré

    const titre = titreEtape(meneur, i)
        || (enCours && av.etapeEnCours.titre ? av.etapeEnCours.titre : '');
    // UN MOT DU PROFESSEUR SE RELIT, ET C'EST LA MOITIÉ DE L'IDÉE.
    //
    // Rémy, interrogé sur ce point : « oui, il reste dans le fil ». Un élève
    // qui bloque à l'exercice 3 doit pouvoir relire ce qui était écrit avant —
    // sinon le message ne sert qu'à ceux qui lisent du premier coup, c'est-à-
    // dire pas à ceux pour qui on l'écrit.
    //
    // SA CASE EST DONC TOUJOURS UN BOUTON, même pour l'élève, alors que les
    // autres ne le sont que sous le pilotage du professeur. Le geste est sans
    // danger : il ROUVRE le mot, il ne déplace pas le meneur.
    const mot = estUnMessage(etapeDeRang(meneur, i));
    const classes = `fil-pas${fait ? ' fil-pas--fait' : ''}${ratee ? ' fil-pas--ratee' : ''}${
        enCours ? ' fil-pas--ici' : ''}${mot ? ' fil-pas--mot' : ''}`;
    const dedans = `<i style="width:${part}%"></i>`;
    if (mot && !meneur) {
        const dit = `Relire le mot du professeur${titre ? ` — ${titre}` : ''}`;
        return `<button type="button" class="${classes}" data-mot="${i}"
            title="${esc(dit)}" aria-label="${esc(dit)}">${dedans}</button>`;
    }
    // UN VRAI BOUTON QUAND IL CLIQUE : une case qu'on peut atteindre au clavier
    // et que le lecteur d'écran annonce. Un `span` avec un gestionnaire serait
    // cliquable à la souris et invisible partout ailleurs.
    if (meneur) {
        const dit = `Aller à l’étape ${i + 1}${titre ? ` — ${titre}` : ''}`;
        return `<button type="button" class="${classes}" data-rang="${i}"
            title="${esc(dit)}" aria-label="${esc(dit)}">${dedans}</button>`;
    }
    return `<span class="${classes}"${titre ? ` title="${esc(titre)}"` : ''}>${dedans}</span>`;
}

/** À rappeler chaque fois que l'avancement a pu bouger. Coût : une projection. */
export function majFilSeance() {
    const el = fil();
    if (!el) return null;
    const av = avancementDuMoment();
    dernier = av;

    // Rien à dire : pas de parcours, ou une seule étape. « Étape 1 sur 1 » est
    // un renseignement qui n'apprend rien et qui prend une ligne.
    if (!av || av.etapes < 2) { el.hidden = true; return av; }

    el.hidden = false;
    const meneur = meneurPilotable();
    const ou = av.etat === 'fini'
        ? 'Séance terminée'
        : `Étape ${Math.min(av.faites + 1, av.etapes)} sur ${av.etapes}`;
    el.classList.toggle('fil--pilotable', !!meneur);
    el.innerHTML = `
        <span class="fil-nom">${esc(av.pathName || 'Ma séance')}</span>
        <span class="fil-pas-liste">${
            Array.from({ length: av.etapes }, (_, i) => caseHtml(i, av, meneur)).join('')}</span>
        <span class="fil-ou">${esc(ou)}</span>`;
    // Le gestionnaire est POSÉ SUR LE FIL, pas sur chaque case : `innerHTML`
    // les remplace toutes à chaque réponse, et rebrancher trente-cinq cases
    // deux fois par question serait du travail pour rien.
    el.onclick = (ev) => {
        if (!ev.target.closest) return;
        // RELIRE UN MOT : c'est ouvert à l'élève, et cela ne bouge rien.
        const m = ev.target.closest('[data-mot]');
        if (m) return relireLeMot(Number(m.dataset.mot));
        const b = ev.target.closest('[data-rang]');
        if (!b) return;
        const r = meneurPilotable();
        if (r) r.goToStep(Number(b.dataset.rang));
    };
    return av;
}

/**
 * ROUVRIR LE MOT DU PROFESSEUR, sans rien déranger.
 *
 * ON PASSE PAR `showModal`, ET SURTOUT PAS PAR L'ÉCRAN DU MENEUR : l'élève est
 * peut-être au milieu d'un exercice quand il clique. Repeindre `this.canvas`
 * effacerait sa question en cours. Une fenêtre se referme et laisse tout en
 * place.
 *
 * LE MÊME TEXTE, LE MÊME HTML, LE MÊME MODULE que l'écran du meneur — donc la
 * même garantie d'échappement, et pas une seconde syntaxe à tenir d'accord.
 */
function relireLeMot(rang) {
    const s = etapeDeRang(meneurPilotable(), rang);
    if (!estUnMessage(s)) return;
    Promise.all([import('./modal.js'), import('../core/messageEtape.js')])
        .then(([{ showModal }, { messageEnHtml, titreNettoye }]) => {
            const m = s.message || {};
            showModal(titreNettoye(m.titre) || 'Le mot du professeur',
                `<div class="run-mot-texte">${messageEnHtml(m.texte)}</div>`,
                { width: '520px' });
        })
        .catch(() => { /* sans la fenêtre, la case reste une case : rien de cassé */ });
}

/** Le fil s'efface en sortant du parcours : il n'a rien à dire sur l'accueil. */
export function cacherFilSeance() {
    const el = document.getElementById('fil-seance');
    if (el) el.hidden = true;
    // ON NE PERD PAS LA MÉMOIRE DE CE QUI A ÉTÉ FAIT. Le fil s'efface parce
    // qu'il n'a plus rien à dessiner ; l'avancement, lui, est encore la réponse
    // à « as-tu fini ? » — et c'est la question que pose la porte du bac.
}
