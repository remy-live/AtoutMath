// L'ENGRENAGE DU PARCOURS — « à qui c'est donné », en permanence sous les yeux.
//
// Rémy : « À côté du parcours fait par le professeur, on pourrait avoir un
// engrenage et cela se met à la place des paramètres. Sur l'ordinateur donc à
// droite pour savoir les classes à qui c'est attribué, on a une checkbox devant
// les classes et la possibilité de dérouler les classes […]. Et si la séance a
// été faite, on peut avoir à côté de la classe ou de l'élève un lien pour avoir
// le bilan. On pourrait d'ailleurs y mettre en premier le mode de la séance. »
//
// CE QUE CELA CHANGE, ET POURQUOI ÇA VALAIT LE DÉTOUR.
//
// « Donner à une classe » était une BOÎTE DE DIALOGUE : un geste sans mémoire.
// On l'ouvrait, on donnait, elle disparaissait — et plus rien à l'écran ne
// disait à qui ce parcours avait été donné. Pour le savoir il fallait aller
// dans un autre écran et recouper deux listes. Le panneau transforme un geste
// en ÉTAT VISIBLE : on ouvre, on voit. C'est la différence entre envoyer un
// courrier et regarder sa liste de diffusion.
//
// UN SEUL BOUTON, DONC. Le panneau remplace la boîte : deux commandes qui font
// la même chose, c'est là qu'on hésite, et hésiter coûte plus cher que le
// deuxième clic qu'on croyait épargner.
//
// LA CASE À COCHER NE SUPPRIME PAS DU TRAVAIL. C'est le seul endroit où je ne
// suis pas la demande à la lettre. Une case, ça se décoche par mégarde ; si
// décocher effaçait la séance, un clic de trop emporterait le bilan de
// vingt-six élèves. Donc : décocher une classe qui n'a rien commencé supprime
// la séance — il n'y a rien à protéger ; décocher une classe qui a travaillé la
// RETIRE — elle quitte l'écran des élèves, son bilan reste, et la case grise se
// recoche. Voir `retirer` dans core/seances.js.
//
// LE MODE EST EN HAUT parce qu'il change ce que le bilan VEUT DIRE. Un tableau
// d'entraînement se lit « où en sont-ils » ; le même tableau en évaluation se
// lit « qu'est-ce que je note ». Lire l'un pour l'autre est l'erreur la plus
// coûteuse de l'écran, et elle se prévient d'une ligne.

import { showToast, showConfirm, showAlert, showModal } from './modal.js';
import { MODES, resolvePolicy } from '../core/policy.js';
import { Shortcodes, identiteDeParcours } from '../core/shortcodes.js';
import {
    donnerSeance, seancesDe, etatSeance, direSeance, ETATS,
    clore, rouvrir, retirer, remettre, estRetiree, elevesDe,
    poserMot, aRattraper
} from '../core/seances.js';
import { bilanSeance, bilanEleveSeance, aTravaille } from '../core/bilanSeance.js';
import {
    lireClasses, lireSeances, ecrireSeances, classesIllisibles, oublierLesClasses
} from './donnerSeance.js';
import { couleurNiveau, consigneDe, consigneClasse } from '../core/bilan.js';
import { LEVELS } from '../core/mastery.js';

/**
 * LE NIVEAU D'UN TAUX MOYEN, pour teinter la jauge d'une colonne.
 *
 * On réutilise les seuils de l'échelle de maîtrise plutôt que d'inventer un
 * dégradé : la couleur d'une colonne doit vouloir dire la même chose que la
 * couleur d'une case chez un élève, sinon le tableau ment.
 */
const niveauDeTaux = (x) => {
    const ordre = ['E', 'A', 'EC', 'NA'];
    return ordre.find(k => LEVELS[k] && (x || 0) >= (LEVELS[k].min || 0)) || 'NA';
};

const esc = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const LIBELLE_MODE = {
    [MODES.APPRENTISSAGE]: 'Apprentissage',
    [MODES.ENTRAINEMENT]: 'Entraînement',
    [MODES.EVALUATION]: 'Évaluation'
};

// CE QUE LE MODE PROMET, en une phrase. Le nom seul ne suffit pas : « mode
// apprentissage » ne dit pas qu'on y montre la solution, et c'est pourtant ce
// qui décide si l'on peut noter.
const DIT_MODE = {
    [MODES.APPRENTISSAGE]: 'La leçon est ouverte, le robot explique. Rien ne se note.',
    [MODES.ENTRAINEMENT]: 'Plusieurs essais, des indices. Le bilan dit où ils en sont.',
    [MODES.EVALUATION]: 'Un seul essai, pas d\'aide. Le bilan est une note.'
};

const NIVEAU_MOT = { NA: 'Non acquis', EC: 'En cours', A: 'Acquis', E: 'Expert' };

/** La classe telle que le bilan la veut : ses élèves avec leurs journaux. */
function pourcent(x) { return Math.round((x || 0) * 100) + ' %'; }

/**
 * À QUI C'EST DONNÉ, EN UNE PHRASE — classes ET élèves nommés.
 *
 * Rémy pouvait donner à une classe, et à rien d'autre. Maintenant qu'il peut
 * cocher trois noms, la phrase du bas doit les compter : « pas encore donné »
 * sous trois cases cochées serait le genre de contradiction qui fait recocher.
 */
function direAQui(classes, combienNommes) {
    const bouts = [];
    if (classes.length) {
        const eleves = classes.reduce((n, c) => n + combienDEleves(c), 0);
        bouts.push(`${classes.length} classe${classes.length > 1 ? 's' : ''}`
            + ` — ${eleves} élève${eleves > 1 ? 's' : ''}`);
    }
    if (combienNommes) {
        bouts.push(`${combienNommes} élève${combienNommes > 1 ? 's' : ''} nommé${
            combienNommes > 1 ? 's' : ''}`);
    }
    return bouts.length ? 'Donné à ' + bouts.join(', et à ') + '.'
        : 'Pas encore donné. Cochez une classe, ou dépliez-la pour choisir des élèves.';
}

/**
 * L'ÉTAT D'UNE CLASSE VIS-À-VIS DE CE PARCOURS.
 *
 * Trois cas seulement, et ils commandent toute la ligne :
 *   · pas de séance          → case vide, on peut donner ;
 *   · séance vivante         → case cochée, état et bilan ;
 *   · séance retirée         → case vide et grise, bilan encore là.
 */
function etatClasse(classe, seances, pathId, maintenant = Date.now()) {
    const toutes = seancesDe(seances, classe.id);
    // UN PARCOURS SANS IDENTIFIANT N'EST DONNÉ À PERSONNE — la ceinture, en
    // plus des bretelles. `normalizePath` en pose désormais un à tout parcours
    // qui n'en a pas, mais si jamais l'un passait à travers, `null === null`
    // le montrerait « donné » à toutes les classes ayant reçu un autre parcours
    // sans identifiant. Une comparaison d'inconnus ne vaut rien : on ne la fait
    // pas plutôt que d'y croire.
    const siennes = pathId ? toutes.filter(s => s.pathId === pathId) : [];
    const vivante = siennes.find(s => !estRetiree(s)) || null;
    const retiree = siennes.find(s => estRetiree(s)) || null;
    const seance = vivante || retiree;
    return {
        seance,
        donnee: !!vivante,
        retiree: !!retiree && !vivante,
        etat: seance ? etatSeance(seance, maintenant) : null,
        travaille: seance ? (classe.eleves || []).some(e => aTravaille(seance, e.evenements || [])) : false,
        // LES RATTRAPAGES SONT DES SÉANCES À PART, ET ILS SE RETROUVENT ICI.
        //
        // Un rattrapage porte une COPIE du parcours avec un identifiant neuf,
        // et non le parcours d'origine. Deux raisons, et la seconde est
        // décisive : le bilan d'une séance rassemble les travaux qui portent
        // son `pathId`, donc un rattrapage partageant l'identifiant afficherait
        // le travail de la séance d'origine comme s'il était le sien. On garde
        // le lien par `origine`, ce qui permet de le retrouver — c'est-à-dire
        // de lire son bilan — sans jamais mélanger les deux.
        rattrapages: toutes.filter(s => s.origine === pathId && !estRetiree(s))
    };
}

const PUCE = {
    [ETATS.A_VENIR]: ['À venir', 'pc-attente'],
    [ETATS.EN_COURS]: ['En cours', 'pc-vif'],
    [ETATS.CLOSE]: ['Close', 'pc-calme']
};

/**
 * COMBIEN D'ÉLÈVES DANS CETTE CLASSE — une seule définition, pour tout l'écran.
 *
 * Rémy : « il y a une incohérence ». Le panneau affichait « 4C · 30 » sur la
 * ligne et « Donné à 1 classe — 0 élèves » trois lignes plus bas. Le même
 * nombre était calculé de deux façons : la ligne retombait sur `effectif`, que
 * le serveur envoie ; le total ne comptait que `eleves`, qui reste vide tant
 * qu'on n'a pas déplié la classe. Deux calculs du même nombre finissent
 * toujours par donner deux nombres.
 */
function combienDEleves(classe) {
    return (classe && classe.eleves || []).length || Number(classe && classe.effectif) || 0;
}

function ligneClasseHtml(classe, info) {
    // L'EFFECTIF VIENT DU SERVEUR, LA LISTE VIENDRA AU DÉPLIAGE. On ne charge
    // pas trente élèves par classe pour afficher un nombre.
    const n = combienDEleves(classe);
    const puce = info.etat ? PUCE[info.etat] : null;
    return `
    <div class="pc-classe${info.retiree ? ' pc-classe--retiree' : ''}" data-classe="${esc(classe.id)}">
        <div class="pc-ligne">
            <label class="pc-case">
                <input type="checkbox" data-donner="${esc(classe.id)}"${info.donnee ? ' checked' : ''}>
                <span class="pc-nom">${esc(classe.nom)}</span>
                ${classe.homonyme ? `<span class="pc-code"
                    title="Deux classes portent ce nom : voici son code">${esc(classe.code || '?')}</span>` : ''}
            </label>
            <span class="pc-eff">${n}</span>
            ${puce ? `<span class="pc-puce ${puce[1]}">${puce[0]}</span>` : ''}
            ${info.travaille
        ? `<button type="button" class="pc-bilan" data-bilan-classe="${esc(classe.id)}"
                   title="Le bilan de cette séance, et de cette séance seulement">bilan</button>` : ''}
            ${info.donnee && info.etat !== ETATS.A_VENIR
        ? `<button type="button" class="pc-clore" data-clore="${esc(classe.id)}"
                   title="${info.etat === ETATS.CLOSE
            ? 'Rouvrir la fenêtre notée'
            : 'C\'est fini : la note ne bouge plus. La séance reste ouverte à l\'entraînement.'}"
                   >${info.etat === ETATS.CLOSE ? 'rouvrir' : 'clore'}</button>` : ''}
            <button type="button" class="pc-plier" data-plier="${esc(classe.id)}"
                aria-expanded="false" aria-label="Voir les élèves de ${esc(classe.nom)}">▸</button>
        </div>
        ${info.seance ? `<div class="pc-etat">${esc(direSeance(info.seance))}</div>` : ''}
        ${(info.rattrapages || []).map(r => `<div class="pc-rattr">
            <span>↻ Rattrapage — ${(r.eleveIds || []).length} élève${(r.eleveIds || []).length > 1 ? 's' : ''}</span>
            <button type="button" class="pc-bilan" data-bilan-rattrapage="${esc(r.id)}"
                data-classe="${esc(classe.id)}">bilan</button>
        </div>`).join('')}
        <div class="pc-eleves" hidden></div>
    </div>`;
}

/**
 * ALLER CHERCHER LES ÉLÈVES D'UNE CLASSE DU SERVEUR.
 *
 * Rendus à la forme que cet écran connaît — `{ id, nom }` — plutôt que celle du
 * serveur. Une seule traduction, ici, plutôt qu'un `c.prenom || c.nom ||
 * c.first_name` répété dans chaque gabarit.
 *
 * SI ÇA ÉCHOUE, ON REND UNE LISTE VIDE ET L'ÉCRAN LE DIT. Un dépliage qui
 * resterait sur « On va chercher les élèves… » pour toujours est pire qu'un
 * dépliage vide : on attend quelque chose qui ne viendra pas.
 */
async function elevesDeLaClasse(classe) {
    try {
        const { listeDeClasse } = await import('../core/espaceProf.js');
        const r = await listeDeClasse(classe.id);
        if (!r || r.erreur || !Array.isArray(r.eleves)) return [];
        return r.eleves.map(e => ({
            id: e.id, nom: e.prenom || e.nom || '?', login: e.login || '', code: e.code || ''
        }));
    } catch (err) {
        return [];
    }
}

/**
 * LA LISTE DES ÉLÈVES D'UNE CLASSE, dépliée.
 *
 * ON N'AFFICHE QUE LES ÉLÈVES CONCERNÉS quand la séance vise un groupe : dix-huit
 * lignes vides feraient croire à dix-huit absents.
 */
/**
 * LES ÉLÈVES DE LA CLASSE, AVEC LEUR PROPRE CASE.
 *
 * Rémy : « quand on donne la séance on le donne à la classe ; il faudrait
 * pouvoir, en cliquant sur la classe, ne le donner qu'à certains élèves. En
 * fait pour l'instant on ne peut donner une séance qu'à une classe, ni à un
 * groupe ni à un élève spécifique. »
 *
 * UN GROUPE N'EST PAS UN OBJET, C'EST UNE POIGNÉE DE CASES. On aurait pu
 * inventer des « groupes » à créer, à nommer, à tenir à jour quand un élève
 * change de classe. Trois écrans de plus pour une chose qui change toutes les
 * semaines. Cocher trois noms donne le même résultat et ne demande rien à
 * ranger — c'est la même raison qui a fait préférer les dossiers de parcours
 * à une arborescence.
 *
 * LA CASE DE LA CLASSE COCHE CELLES DES ÉLÈVES, ET L'ON PEUT DÉCOCHER.
 *
 * RÉMY : « quand on sélectionne une classe, ça sélectionne tous les élèves et
 * on peut décocher. »
 *
 * C'ÉTAIT L'INVERSE, ET C'ÉTAIT UN CHOIX — écrit ici même : « cocher trente
 * cases qu'on ne peut pas décocher une à une serait un mensonge poli ». Le
 * raisonnement tenait à la base de données : une assignation vise une CLASSE ou
 * un ÉLÈVE, jamais « la classe sauf lui ». Les cases étaient donc grisées, et
 * retirer le travail à un seul élève était impossible.
 *
 * Sauf que le mensonge est venu par l'autre bout. Capture de Rémy : « Toute la
 * classe l'a reçu : chacun l'a déjà » écrit AU-DESSUS de quatre cases
 * décochées. Les deux moitiés de l'écran lisaient deux sources différentes —
 * la phrase venait de la séance LOCALE, les cases de ce que le SERVEUR sert.
 *
 * ON CONVERTIT AU MOMENT OÙ L'ON DÉCOCHE. La classe entière l'a, on retire un
 * élève : on retire la ligne de classe et l'on en pose une par élève restant.
 * C'est exactement ce que le professeur vient de dire, et la base sait
 * l'écrire — il fallait juste le faire au bon moment. La séance locale, elle,
 * reste : vingt-huit élèves sur vingt-neuf, c'est encore la séance de la
 * classe, et c'est d'elle que vient le bilan.
 */
function elevesHtml(classe, info) {
    const liste = info.seance ? elevesDe(info.seance, classe) : (classe.eleves || []);
    if (!liste.length) return '<p class="pc-vide">Aucun élève dans cette classe.</p>';
    // CE QUE LE SERVEUR SERT, et non ce que la bibliothèque locale croit.
    const toute = info.servieAuServeur;
    const combien = (info.nommes || new Set()).size;
    return (toute
        ? '<p class="pc-vide pc-vide--note">Toute la classe l\'a reçu. '
          + 'Décochez ceux à qui vous ne le donnez pas.</p>'
        : (combien
            ? `<p class="pc-vide pc-vide--note">${combien} élève${combien > 1 ? 's' : ''} sur `
              + `${liste.length} l'${combien > 1 ? 'ont' : 'a'}. Cochez, décochez.</p>`
            : '<p class="pc-vide pc-vide--note">Cochez ceux à qui vous le donnez.</p>'))
        + [...liste]
        .sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'))
        .map(e => {
            const fait = info.seance && aTravaille(info.seance, e.evenements || []);
            const b = fait ? bilanEleveSeance(info.seance, e) : null;
            // TOUTE LA CLASSE L'A : chacun l'a, donc chaque case est cochée.
            // Elle n'est plus grisée — c'est tout l'objet de la correction.
            const sien = toute || (info.nommes || new Set()).has(e.id);
            return `<div class="pc-eleve">
                <label class="pc-eleve-case">
                    <input type="checkbox" data-donner-eleve="${esc(e.id)}"
                           data-classe="${esc(classe.id)}" data-nom="${esc(e.nom)}"
                           ${sien ? ' checked' : ''}>
                </label>
                <span class="pc-eleve-nom">${esc(e.nom)}</span>
                ${b ? `<span class="pc-chiffre">${b.questions} q · ${pourcent(b.reussite)}</span>` : ''}
                ${b ? `<button type="button" class="pc-bilan" data-bilan-eleve="${esc(e.id)}"
                        data-classe="${esc(classe.id)}">bilan</button>`
        : '<span class="pc-rien">n\'a pas commencé</span>'}
            </div>`;
        }).join('');
}

/**
 * LES ÉLÈVES DU BILAN, DANS L'ORDRE OÙ ON LES REGARDE.
 *
 * Pas l'ordre alphabétique, ni celui de la classe : LES PLUS EN PEINE D'ABORD.
 * Un bilan se lit pour décider qui aider lundi, et la seule chose qu'on cherche
 * est en haut. Ceux qui n'ont rien fait passent à la fin — leur problème n'est
 * pas la notion, et les mettre en tête (0 % de réussite) reléguerait derrière
 * eux ceux qui ont travaillé sans y arriver, c'est-à-dire précisément ceux à
 * qui il faut parler.
 */
function classer(eleves) {
    const faits = eleves.filter(e => e.questions);
    const muets = eleves.filter(e => !e.questions);
    return [...faits.sort((a, b) => a.reussite - b.reussite),
        ...muets.sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'))];
}

/** Le bilan d'une séance, tel qu'on le lit après le cours. */
function bilanClasseHtml(b) {
    const cols = b.competences.slice(0, 8);
    return `
    <div class="pc-rapport">
        <h4>${esc(b.titre)} — ${esc(b.nom)}</h4>
        <p class="pc-resume">${b.commences}/${b.attendus} ont ouvert la séance ·
            ${pourcent(b.moyenneReussite)} de réussite moyenne</p>
        <!-- CE QU'ON FAIT DE TOUTE LA CLASSE, en tête : c'est la phrase qui
             décide de l'heure suivante, et elle ne doit pas se chercher. -->
        <p class="pc-consigne">${esc(consigneClasse(b))}</p>
        <p class="pc-phrase">${esc(b.phrase)}</p>
        ${cols.length ? `<table class="pc-table">
            <thead><tr><th>Notion</th><th>Moyenne</th><th>En peine</th></tr></thead>
            <tbody>${cols.map(c => `<tr>
                <td>${esc(c.nom)}</td>
                <!-- LA COULEUR EST CELLE DE L'ÉCHELLE DE MAÎTRISE, pas un
                     dégradé décoratif : c'est la même sur l'écran de l'élève,
                     dans le tableau de classe et sur le PDF. -->
                <td><span class="pc-jauge" style="--part:${Math.round(c.moyenne * 100)}%;
                    --teinte:${couleurNiveau(niveauDeTaux(c.moyenne))}"></span>
                    ${pourcent(c.moyenne)}</td>
                <td class="${c.enPeine >= 0.5 ? 'pc-rouge' : ''}">${Math.round(c.enPeine * 100)} %</td>
            </tr>`).join('')}</tbody>
        </table>` : '<p class="pc-vide">Pas encore assez de réponses pour dire quoi que ce soit.</p>'}
        <h5>Les élèves — une ligne, une chose à faire</h5>
        <div class="pc-eleves-bilan">${classer(b.eleves).map(e => `
            <button type="button" class="pc-eleve pc-eleve--clic" data-detail="${esc(e.id)}"
                title="Voir le détail de ${esc(e.nom)}">
                <span class="pc-eleve-nom">${esc(e.nom)}</span>
                <span class="pc-consigne-eleve">${esc(consigneDe(e))}</span>
                <span class="pc-chiffre">${e.questions ? `${e.questions} q · ${pourcent(e.reussite)}`
        : ''}</span>
                ${e.mot ? `<span class="pc-mot">${esc(e.mot)}</span>` : ''}
            </button>`).join('')}</div>
        <div class="pc-suites">
            <!-- LE GESTE QUI MANQUE LE PLUS APRÈS UNE SÉANCE. Rémy : « ceux qui
                 ont raté refont ça pendant que les autres avancent ». Les
                 élèves sont DÉJÀ désignés par leur résultat ; il ne reste qu'à
                 accepter la liste. -->
            <button type="button" class="pc-rattrapage" data-rattrapage>↻ Donner un rattrapage</button>
            <button type="button" class="pc-pdf" data-pdf>📄 Exporter ce bilan en PDF</button>
            <!-- LA COLONNE POUR PRONOTE. Rémy : « pourrais-je récupérer
                 directement les notes sans devoir les saisir ? » Pas par une
                 API — Index Éducation ne l'ouvre qu'à des partenaires sous
                 convention —, mais par le geste qui marche partout : une
                 colonne de notes que l'on colle dans la grille. Voir
                 « core/pronote.js » pour l'ordre, qui est tout le sujet. -->
            <button type="button" class="pc-pdf" data-pronote>Copier la colonne pour PRONOTE</button>
        </div>
    </div>`;
}

/** Le bilan d'un élève sur cette séance : ce qu'on lit avant de lui parler. */
function bilanEleveHtml(b) {
    const c = b.competences.filter(x => x.fiable).slice(0, 6);
    return `
    <div class="pc-rapport">
        <h4>${esc(b.nom)}</h4>
        <p class="pc-resume">${b.questions} question${b.questions > 1 ? 's' : ''} ·
            ${pourcent(b.reussite)} de réussite${b.reprises ? ` · ${b.reprises} trouvée${b.reprises > 1 ? 's' : ''} au second essai` : ''}</p>
        ${b.inacheve ? `<p class="pc-alerte">Arrêté en chemin — ${b.etapesInachevees} étape${b.etapesInachevees > 1 ? 's' : ''} faite${b.etapesInachevees > 1 ? 's' : ''}.</p>` : ''}
        ${c.length ? `<ul class="pc-liste">${c.map(x => `<li>
            <span class="pc-pastille" style="background:${couleurNiveau(x.niveau)}"></span>
            ${esc(x.nom)} — ${NIVEAU_MOT[x.niveau] || x.niveau} (${x.justes}/${x.essais})
        </li>`).join('')}</ul>` : '<p class="pc-vide">Trop peu de réponses pour conclure.</p>'}
        ${b.aRevoir.length ? `<h5>À revoir</h5><ul class="pc-liste">${b.aRevoir.slice(0, 4)
        .map(e => `<li>${esc(e.questionText || e.exerciseTitle || 'question')}${e.count > 1 ? ` — ${e.count} fois` : ''}</li>`).join('')}</ul>` : ''}
        <!-- LE MOT S'ÉCRIT LÀ OÙ ON LE PENSE.
             Rémy : « je pourrai pendant la séance envoyer un message ». Le
             moment où l'on a quelque chose à dire à un élève est celui où l'on
             vient de lire son bilan — pas trois écrans plus loin. Le champ est
             donc SOUS ce qu'on vient de lire, et l'élève le voit sur la carte
             de sa séance, à l'endroit exact où il clique pour travailler.
             DEUX CENTS CARACTÈRES, et ce n'est pas de l'avarice : au-delà, ce
             n'est plus un mot, c'est un cours — et un cours ne se lit pas sur
             une carte d'accueil. -->
        <label class="pc-mot-label" for="pc-mot-champ">Un mot pour ${esc(b.nom)}</label>
        <textarea id="pc-mot-champ" class="pc-mot-champ" rows="2" maxlength="200"
            data-mot="${esc(b.id)}"
            placeholder="Reprends les priorités avec moi lundi.">${esc(b.mot || '')}</textarea>
        <div class="pc-mot-actions">
            <button type="button" class="pc-mot-ok" data-mot-envoyer>Envoyer</button>
            ${b.mot ? '<button type="button" class="pc-mot-non" data-mot-effacer>Retirer</button>' : ''}
        </div>
    </div>`;
}

/**
 * OUVRIR LE PANNEAU, à la place des propriétés d'étape.
 *
 * @param {Object} parcours     le modèle en cours d'édition
 * @param {Function} [onChange] appelé quand le mode change, pour réafficher
 */
export async function ouvrirPanneauClasses(parcours, onChange) {
    const panel = document.getElementById('builder-properties-panel');
    if (!panel) return;

    if (!parcours || !(parcours.steps || []).length) {
        return showAlert('Ajoutez au moins une activité avant de donner ce parcours.');
    }

    // UNE COPIE, PARCE QU'ON LA RÉÉCRIT SUR PLACE APRÈS UN « Réessayer » :
    // `lireClasses` rend son propre souvenir, et le vider ici le viderait
    // pour toute l'application.
    const classes = [...(await lireClasses())];
    let seances = await lireSeances();
    // QUI L'A DÉJÀ — demandé au serveur, pas deviné du navigateur. Le
    // professeur a pu donner ce parcours depuis un autre poste ; son stock
    // local n'en saurait rien, et les cases s'ouvriraient décochées.
    let nommes = new Set();
    // ET LES CLASSES QUE LE SERVEUR SERT VRAIMENT. `info.donnee` vient de la
    // séance LOCALE — c'est ce que le professeur voit dans sa bibliothèque —,
    // et les deux peuvent diverger : c'est exactement ce que montrait la
    // capture de Rémy, « Toute la classe l'a reçu » au-dessus de quatre cases
    // décochées. Pour savoir qui a le travail, il faut demander à qui le donne.
    let classesServies = new Set();
    const relireLesNommes = async () => {
        const { aQuiEstDonne } = await import('../core/parcoursServeur.js');
        const d = await aQuiEstDonne(parcours);
        nommes = new Set((d.eleves || []).map(e => e.id));
        classesServies = new Set((d.classes || []).map(c => c.id));
    };
    await relireLesNommes();
    // ON COMPARE L'IDENTITÉ DU TRAVAIL, celle que la séance a écrite et que
    // l'élève recalcule de son code — et non l'identifiant d'atelier, qui ne
    // vaut que dans la bibliothèque de ce navigateur-ci.
    const pathId = identiteDeParcours(parcours);

    // DEUX CLASSES DU MÊME NOM NE DOIVENT PAS SE RESSEMBLER.
    //
    // Rémy avait deux « 4C » dans la liste — l'une à trente élèves, l'autre
    // vide — et rien à l'écran ne permettait de dire laquelle est laquelle.
    // Cocher au hasard, c'est donner le devoir à la classe d'à côté. On ne
    // montre le code QUE dans ce cas : l'afficher partout ferait du bruit
    // permanent pour un problème rare.
    // DEUX CLASSES DE MÊME NOM SE DISTINGUENT PAR LEUR CODE. Sortie en
    // fonction parce qu'on la rejoue après un « Réessayer ».
    const nommerLesHomonymes = () => {
        const parNom = new Map();
        classes.forEach(c => parNom.set(c.nom, (parNom.get(c.nom) || 0) + 1));
        classes.forEach(c => { c.homonyme = (parNom.get(c.nom) || 0) > 1; });
    };
    nommerLesHomonymes();

    /**
     * LES CLASSES DÉPLIÉES LE RESTENT APRÈS UN REDESSIN.
     *
     * Rémy : « quand on clique sur une classe à qui on donne la séance et qu'on
     * ouvre pour avoir la liste d'élèves, dès qu'on coche un élève, la classe se
     * referme, il faut sans arrêt rouvrir la classe pour avoir les élèves. »
     *
     * C'était exact, et la cause tient en une ligne : cocher un élève appelle
     * `dessiner()`, qui refait `panel.innerHTML` en entier — et un panneau
     * reconstruit naît replié. Le professeur qui donne le parcours à cinq élèves
     * d'une classe rouvrait donc la classe cinq fois.
     *
     * On ne peut pas simplement ne plus redessiner : le panneau affiche des
     * comptes (« 3 élèves nommés ») qui doivent suivre. On retient donc ce qui
     * était ouvert, et on le rouvre — avec la position de défilement, sans quoi
     * la liste remonterait en haut à chaque case cochée, ce qui revient au même
     * pour la main qui vise.
     */
    const dessiner = () => {
        const etaientOuvertes = [...panel.querySelectorAll('[data-plier][aria-expanded="true"]')]
            .map(b => b.dataset.plier);
        const defilement = panel.scrollTop;
        const mode = resolvePolicy(parcours.policy).mode;
        const infos = new Map(classes.map(c => {
            const info = etatClasse(c, seances, pathId);
            // Les élèves de CETTE classe à qui on l'a donné nommément.
            info.nommes = new Set((c.eleves || []).map(e => e.id).filter(id => nommes.has(id)));
            info.combienNommes = [...nommes].length;
            return [c.id, info];
        }));
        const donnees = classes.filter(c => infos.get(c.id).donnee);

        panel.innerHTML = `
            <button id="mob-close-props" class="props-close" aria-label="Fermer">✕</button>
            <h3 class="props-title">À qui ce parcours est donné</h3>
            <div class="pc-boite">
                <!-- LE MODE EN PREMIER : il décide de ce que le bilan veut dire. -->
                <label class="pc-mode">
                    <span class="pc-mode-nom">Mode de la séance</span>
                    <select class="pc-mode-select" data-mode>
                        ${Object.entries(LIBELLE_MODE).map(([v, t]) =>
            `<option value="${v}"${v === mode ? ' selected' : ''}>${t}</option>`).join('')}
                    </select>
                </label>
                <p class="pc-mode-dit">${esc(DIT_MODE[mode] || '')}</p>

                ${classes.length ? `<div class="pc-classes">
                    ${classes.map(c => ligneClasseHtml(c, infos.get(c.id))).join('')}
                </div>` : (classesIllisibles()
        // MUET N'EST PAS VIDE — voir `lireClasses` dans ui/donnerSeance.js.
        // Rémy : « je n'ai plus les paramètres qui me permettent de donner un
        // parcours à la classe ». Le panneau annonçait « Vous n'avez pas
        // encore de classe » alors qu'il en a deux et que c'est le serveur
        // qui n'avait pas répondu.
        ? `<p class="pc-vide pc-vide--muet">Je n'ai pas pu lire vos classes :
                    le serveur n'a pas répondu. Vos classes ne sont pas perdues.
                    <button type="button" class="pc-reessayer" data-reessayer>Réessayer</button></p>`
        : `<p class="pc-vide">Vous n'avez pas encore de classe.
                    Créez-en une par la porte <b>La classe</b>, en haut.</p>`)}

                <p class="pc-compte" role="status" aria-live="polite">${
                    direAQui(donnees, nommes.size)}</p>
                <div class="pc-rapport-zone" hidden></div>
            </div>`;
        panel.classList.add('mob-open');
        brancher();

        // ON ROUVRE CE QUI ÉTAIT OUVERT, et l'on remet la liste où elle était.
        // Les élèves sont déjà en mémoire (`classe.eleves`) : il n'y a pas de
        // second aller-retour au serveur, seulement le dessin à refaire.
        if (etaientOuvertes.length) {
            Promise.all(etaientOuvertes.map(id => {
                const b = panel.querySelector(`[data-plier="${id}"]`);
                return b ? deplier(b) : null;
            })).then(() => { panel.scrollTop = defilement; });
        }
    };

    const zone = () => panel.querySelector('.pc-rapport-zone');

    function montrer(html, contexte) {
        const z = zone();
        if (!z) return;
        z.innerHTML = html + '<button type="button" class="pc-fermer-rapport">Fermer le bilan</button>';
        z.hidden = false;
        z.querySelector('.pc-fermer-rapport').onclick = () => { z.hidden = true; z.innerHTML = ''; };

        // CLIQUER UN ÉLÈVE OUVRE SON DÉTAIL. Rémy : « dans la liste d'élèves
        // dans le bilan, permets de cliquer sur l'élève pour avoir des
        // détails ». La ligne du tableau dit QUOI FAIRE ; le détail dit
        // pourquoi — les compétences, les erreurs qui restent, le mot qu'on lui
        // a laissé. On lit la première pour balayer, le second avant de parler
        // à l'élève.
        if (contexte) {
            z.querySelectorAll('[data-detail]').forEach(el => {
                el.onclick = () => {
                    const eleve = (contexte.classe.eleves || [])
                        .find(x => x.id === el.dataset.detail);
                    if (!eleve) return;
                    montrer(bilanEleveHtml(bilanEleveSeance(contexte.seance, eleve))
                        + `<button type="button" class="pc-retour" data-retour>← Revenir à la classe</button>`,
                    { ...contexte, eleve });
                };
            });
            const retour = z.querySelector('[data-retour]');
            // ON REVIENT À LA CLASSE, DONC ON QUITTE L'ÉLÈVE : garder `eleve`
            // dans le contexte laisserait le champ « un mot » branché sur
            // quelqu'un qu'on ne regarde plus.
            if (retour) retour.onclick = () => montrer(
                bilanClasseHtml(bilanSeance(contexte.seance, contexte.classe)),
                { seance: contexte.seance, classe: contexte.classe });

            brancherMot(z, contexte);
            brancherRattrapage(z, contexte);

            const pdf = z.querySelector('[data-pdf]');
            if (pdf) pdf.onclick = async () => {
                pdf.disabled = true;
                pdf.textContent = 'Préparation du PDF…';
                try {
                    const { exporterBilanPdf } = await import('./bilanPdf.js');
                    await exporterBilanPdf(bilanSeance(contexte.seance, contexte.classe));
                    showToast('Bilan exporté en PDF.', 'success');
                } catch (e) {
                    showToast('Le PDF n\'a pas pu être produit.', 'error');
                } finally {
                    pdf.disabled = false;
                    pdf.textContent = '📄 Exporter ce bilan en PDF';
                }
            };

            const versPronote = z.querySelector('[data-pronote]');
            if (versPronote) versPronote.onclick = async () => {
                const { colonne, enColonne, enTableau, aVerifier } = await import('../core/pronote.js');
                const b = bilanSeance(contexte.seance, contexte.classe);
                // LA LISTE DE LA CLASSE, PAS CELLE DES PRÉSENTS. Une colonne
                // qui saute les absents décale tout ce qui suit, et le décalage
                // ne se voit plus une fois collé dans PRONOTE.
                const tous = ((contexte.classe && contexte.classe.eleves) || []).map(e => e.nom);
                const c = colonne(b.eleves, tous);
                const texte = enColonne(c.lignes);
                try {
                    await navigator.clipboard.writeText(texte);
                } catch (e) {
                    // Un navigateur qui refuse le presse-papier ne doit pas
                    // faire perdre le travail : on montre la colonne à copier.
                    const { showAlert } = await import('./modal.js');
                    await showAlert(`<pre class="pc-colonne">${esc(enTableau(c.lignes))}</pre>`,
                        'Colonne pour PRONOTE');
                    return;
                }
                const manques = c.absents
                    ? ` ${c.absents} case${c.absents > 1 ? 's' : ''} vide${c.absents > 1 ? 's' : ''} — `
                        + 'ceux qui n\'ont rien fait ne reçoivent PAS un zéro.'
                    : '';
                const hors = c.sansListe.length
                    ? ` Hors liste, non exporté${c.sansListe.length > 1 ? 's' : ''} : `
                        + c.sansListe.join(', ') + '.'
                    : '';
                showToast(aVerifier(c.lignes) + manques + hors, 'success', 14000);
            };
        }
        z.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    async function enregistrer() {
        await ecrireSeances(seances);
    }

    /**
     * ÉCRIRE UN MOT À UN ÉLÈVE — et le voir partir.
     *
     * Le mot est posé SUR LA SÉANCE, pas sur l'élève : c'est « ce que je t'ai
     * dit à propos de ce travail-là ». Un mot rangé sur l'élève traînerait
     * d'une séance à l'autre et finirait par parler d'un exercice qu'il ne fait
     * plus depuis trois semaines.
     */
    function brancherMot(z, contexte) {
        const champ = z.querySelector('[data-mot]');
        if (!champ || !contexte.eleve) return;
        const poser = async (texte) => {
            const id = contexte.seance.id;
            seances = seances.map(x => (x.id === id ? poserMot(x, contexte.eleve.id, texte) : x));
            contexte.seance = seances.find(x => x.id === id);
            await enregistrer();
            showToast(texte
                ? `Mot envoyé à ${contexte.eleve.nom}.`
                : `Mot retiré pour ${contexte.eleve.nom}.`, 'success');
            montrer(bilanEleveHtml(bilanEleveSeance(contexte.seance, contexte.eleve))
                + '<button type="button" class="pc-retour" data-retour>← Revenir à la classe</button>',
            contexte);
        };
        const envoyer = z.querySelector('[data-mot-envoyer]');
        if (envoyer) envoyer.onclick = () => poser(champ.value.trim());
        const effacer = z.querySelector('[data-mot-effacer]');
        if (effacer) effacer.onclick = () => poser('');
    }

    /**
     * LE RATTRAPAGE — un clic, et la liste est déjà faite.
     *
     * Rémy : « ceux qui ont raté refont ça pendant que les autres avancent ».
     * `aRattraper` désigne les élèves : ceux qui ont travaillé et qui sont en
     * dessous de 60 %. PAS CEUX QUI N'ONT RIEN FAIT — leur problème n'est pas
     * la notion, c'est qu'ils n'ont pas ouvert la séance, et leur donner un
     * rattrapage sur un chapitre qu'ils n'ont pas vu n'a aucun sens.
     *
     * ON MONTRE LA LISTE AVANT DE L'ENVOYER, avec ses cases. Le seuil est une
     * moyenne, pas un jugement : le professeur connaît l'élève qui a raté parce
     * qu'il était malade, et celui qui a fini à 62 % en n'ayant rien compris.
     * Un rattrapage qui part sans qu'on ait vu à qui est un rattrapage qu'on
     * n'ose plus donner.
     *
     * C'EST LE MÊME PARCOURS, DONNÉ À UN GROUPE. Rien de neuf à construire :
     * la séance de groupe existe déjà (`eleveIds`), et l'élève concerné la
     * verra arriver sur sa carte comme n'importe quel autre travail.
     */
    function brancherRattrapage(z, contexte) {
        const bouton = z.querySelector('[data-rattrapage]');
        if (!bouton) return;
        bouton.onclick = () => {
            const b = bilanSeance(contexte.seance, contexte.classe);
            const ids = aRattraper(b.eleves);
            if (!ids.length) {
                return showAlert('Personne n\'est en dessous de 60 % sur cette séance. '
                    + '<br><br>Les élèves qui n\'ont rien fait ne sont pas comptés : '
                    + 'ce n\'est pas la notion qui leur manque.');
            }
            const concernes = ids
                .map(id => b.eleves.find(e => e.id === id)).filter(Boolean);
            const modal = showModal('Donner un rattrapage', `
                <div class="rt">
                    <p class="rt-dit">Ces élèves refont <b>${esc(parcours.name || 'ce parcours')}</b>.
                        Les autres n'y touchent pas.</p>
                    <div class="rt-liste">${concernes.map(e => `
                        <label class="rt-eleve">
                            <input type="checkbox" data-rt="${esc(e.id)}" checked>
                            <span class="rt-nom">${esc(e.nom)}</span>
                            <span class="rt-taux">${pourcent(e.reussite)}</span>
                        </label>`).join('')}</div>
                    <p class="rt-aide">Ils le verront sur leur écran d'accueil, à la place
                        de la séance du jour.</p>
                    <button type="button" class="rt-ok" data-rt-ok>Donner le rattrapage</button>
                </div>`, { width: '420px' });
            modal.element.querySelector('[data-rt-ok]').onclick = async () => {
                const choisis = [...modal.element.querySelectorAll('[data-rt]:checked')]
                    .map(x => x.dataset.rt);
                if (!choisis.length) return;
                // UNE COPIE DU PARCOURS, AVEC UN IDENTIFIANT NEUF — voir
                // `etatClasse`. Le rattrapage est un AUTRE acte : son bilan ne
                // doit pas ramasser le travail de la séance d'origine.
                // LA GRAINE VOYAGE, L'IDENTIFIANT NON. Changer seulement `id`
                // ne suffisait pas : un identifiant ne tient pas dans un code,
                // et l'élève qui tape le code du rattrapage retombait donc sur
                // le parcours d'origine — mêmes étapes, même barème, donc même
                // identité de contenu. `reprise` est écrite DANS le code, ce
                // qui fait du rattrapage un autre travail des deux côtés.
                const graine = 'r_' + Math.random().toString(36).slice(2, 10);
                const copie = {
                    ...parcours,
                    id: 'p_' + Math.random().toString(36).slice(2, 10),
                    reprise: graine,
                    name: `${parcours.name || 'Parcours'} — rattrapage`
                };
                const seance = donnerSeance(contexte.classe, copie, {
                    code: Shortcodes.encodePath(copie),
                    eleveIds: choisis
                });
                // On retrouve l'origine par la même identité que partout
                // ailleurs — celle du contenu, pas celle de l'atelier.
                seance.origine = identiteDeParcours(parcours);
                seances = [...seances, seance];
                await enregistrer();
                modal.close();
                showToast(`Rattrapage donné à ${choisis.length} élève${choisis.length > 1 ? 's' : ''}.`,
                    'success');
                dessiner();
            };
        };
    }

    /**
     * DÉPLIER UNE CLASSE : la liste de ses élèves, branchée.
     *
     * Sortie du gestionnaire de clic parce qu'on l'appelle aussi APRÈS un
     * redessin, pour rouvrir ce qui l'était (voir `dessiner`). Deux copies de
     * cette logique auraient divergé au premier bouton ajouté dans la liste.
     */
    async function deplier(b) {
        const liste = b.closest('.pc-classe').querySelector('.pc-eleves');
        const classe = classes.find(c => c.id === b.dataset.plier);
        // LA LISTE SE DEMANDE ICI, ET UNE SEULE FOIS. C'est le seul moment où
        // elle sert, et la charger d'avance pour cinq classes ferait cent
        // cinquante élèves qu'on ne regarde pas.
        liste.hidden = false;
        if (classe && classe.serveur && !(classe.eleves || []).length) {
            liste.innerHTML = '<p class="pc-vide">On va chercher les élèves…</p>';
            classe.eleves = await elevesDeLaClasse(classe);
        }
        const info = etatClasse(classe, seances, pathId);
        info.nommes = new Set((classe.eleves || []).map(x => x.id)
            .filter(id => nommes.has(id)));
        info.servieAuServeur = classesServies.has(classe.id);
        liste.innerHTML = elevesHtml(classe, info);
        b.textContent = '▾';
        b.setAttribute('aria-expanded', 'true');
        brancherBilansEleves(liste, classe);
        brancherLesCasesEleves(liste, classe);
    }

    function brancher() {
        const fermerPanneau = () => panel.classList.remove('mob-open');
        const close = panel.querySelector('#mob-close-props');
        if (close) close.onclick = fermerPanneau;
        // Le même tiroir que les propriétés d'étape — voir js/ui/tiroir.js.
        import('./tiroir.js').then(({ rendreTirable }) => {
            rendreTirable(panel, fermerPanneau,
                { actif: () => document.body.classList.contains('mobile-view') });
        });

        // RÉESSAYER, quand le serveur n'a pas répondu. On oublie le souvenir
        // — sinon la relecture rendrait la même liste vide sans rien demander
        // — puis on redemande et l'on redessine.
        const reessayer = panel.querySelector('[data-reessayer]');
        if (reessayer) reessayer.onclick = async () => {
            reessayer.disabled = true;
            reessayer.textContent = 'On redemande…';
            oublierLesClasses();
            const fraiches = await lireClasses({ fraiches: true });
            classes.length = 0;
            fraiches.forEach(c => classes.push(c));
            nommerLesHomonymes();
            dessiner();
        };

        const sel = panel.querySelector('[data-mode]');
        if (sel) sel.onchange = () => {
            parcours.policy = { ...(parcours.policy || {}), mode: sel.value };
            if (onChange) onChange(parcours);
            dessiner();
        };

        panel.querySelectorAll('[data-plier]').forEach(b => {
            b.onclick = () => {
                const liste = b.closest('.pc-classe').querySelector('.pc-eleves');
                if (!liste.hidden) {
                    liste.hidden = true;
                    b.textContent = '▸';
                    b.setAttribute('aria-expanded', 'false');
                    return;
                }
                deplier(b);
            };
        });

        panel.querySelectorAll('[data-donner]').forEach(c => {
            c.onchange = () => basculer(classes.find(x => x.id === c.dataset.donner), c);
        });

        // CLORE, C'EST DÉCIDER DE LA FIN. Rémy : « je pourrai pendant la séance
        // (vers la fin) envoyer un message au serveur pour dire que c'est fini
        // […]. En gros je décide de la fin. » Le geste se fait donc d'ici, à
        // côté du bilan qu'il va lire dans la foulée — et non dans un écran
        // qu'il faudrait ouvrir en sortant de cours.
        //
        // CLORE NE COUPE RIEN : ça pose une frontière dans le temps. La séance
        // reste ouverte à l'entraînement, c'est la fenêtre NOTÉE qui se ferme.
        panel.querySelectorAll('[data-clore]').forEach(b => {
            b.onclick = async () => {
                const classe = classes.find(c => c.id === b.dataset.clore);
                const info = etatClasse(classe, seances, pathId);
                if (!info.seance) return;
                const ferme = info.etat === ETATS.CLOSE;
                seances = seances.map(x => (x.id === info.seance.id
                    ? (ferme ? rouvrir(x) : clore(x)) : x));
                await enregistrer();
                showToast(ferme
                    ? `${classe.nom} : séance rouverte.`
                    : `${classe.nom} : c'est fini. La note ne bouge plus, `
                    + 'l\'entraînement reste ouvert.', 'success');
                dessiner();
            };
        });

        panel.querySelectorAll('[data-bilan-rattrapage]').forEach(b => {
            b.onclick = () => {
                const classe = classes.find(c => c.id === b.dataset.classe);
                const seance = seances.find(s => s.id === b.dataset.bilanRattrapage);
                if (!classe || !seance) return;
                montrer(bilanClasseHtml(bilanSeance(seance, classe)), { seance, classe });
            };
        });

        panel.querySelectorAll('[data-bilan-classe]').forEach(b => {
            b.onclick = () => {
                const classe = classes.find(c => c.id === b.dataset.bilanClasse);
                const info = etatClasse(classe, seances, pathId);
                if (!info.seance) return;
                montrer(bilanClasseHtml(bilanSeance(info.seance, classe)),
                    { seance: info.seance, classe });
            };
        });
    }

    function brancherBilansEleves(liste, classe) {
        liste.querySelectorAll('[data-bilan-eleve]').forEach(b => {
            b.onclick = () => {
                const info = etatClasse(classe, seances, pathId);
                const eleve = (classe.eleves || []).find(e => e.id === b.dataset.bilanEleve);
                if (!info.seance || !eleve) return;
                // LE CONTEXTE VOYAGE MÊME PAR CE CHEMIN-LÀ. Sans lui, le champ
                // « un mot pour… » s'affichait et n'envoyait rien : un champ
                // qui ne fait rien est pire qu'un champ absent.
                montrer(bilanEleveHtml(bilanEleveSeance(info.seance, eleve)),
                    { seance: info.seance, classe, eleve });
            };
        });
    }

    /**
     * COCHER DONNE, DÉCOCHER RETIRE — et la nuance est dans `retirer`.
     */
    /**
     * LE SERVEUR EST CE QUI DONNE VRAIMENT — le reste n'est qu'un affichage.
     *
     * Rémy, deux captures côte à côte : « il y a une incohérence ». Le panneau
     * disait « 4C · En cours » ; l'onglet « Les séances » de la même 4C
     * disait « Aucune séance donnée à cette classe ».
     *
     * LES DEUX DISAIENT VRAI, ET C'EST BIEN LE PROBLÈME. Cocher une classe
     * n'écrivait QUE dans le navigateur du professeur : `ecrireSeances` range
     * dans IndexedDB, et rien n'appelait `/teacher/assign`. L'onglet de la
     * classe, lui, lit le serveur — il avait raison. Et les élèves reçoivent
     * leurs séances par `/sync`, c'est-à-dire par la table que personne ne
     * remplissait : le travail n'arrivait chez PERSONNE.
     *
     * `donnerAuServeur` existait, écrite et testée, et n'était appelée de
     * nulle part. C'est ce raccordement-ci.
     *
     * ON DIT QUAND ÇA N'EST PAS PARTI. Une coche qui répond « Donné à 4C »
     * sans que rien ne soit parti est exactement le mensonge qu'on répare :
     * si le serveur refuse, on le nomme, et l'état local ne prétend pas le
     * contraire.
     */
    async function auServeurDonner(classe) {
        const { donnerAuServeur } = await import('../core/parcoursServeur.js');
        const r = await donnerAuServeur(parcours, classe.id);
        if (r && r.erreur) {
            showToast(`${classe.nom} : le serveur n'a pas pris la séance — ${r.erreur}`, 'error');
            return false;
        }
        return true;
    }

    async function auServeurRetirer(classe) {
        const { retirerDuServeur } = await import('../core/parcoursServeur.js');
        const r = await retirerDuServeur(parcours, classe.id);
        if (r && r.erreur) {
            showToast(`${classe.nom} : le serveur garde la séance — ${r.erreur}`, 'error');
            return false;
        }
        return true;
    }

    /**
     * DONNER, OU REPRENDRE, À UN SEUL ÉLÈVE.
     *
     * Rémy : « il faudrait pouvoir, en cliquant sur la classe, ne le donner
     * qu'à certains élèves. En fait pour l'instant on ne peut donner une séance
     * qu'à une classe, ni à un groupe ni à un élève spécifique. »
     *
     * LE SERVEUR SAVAIT DÉJÀ VISER UN ÉLÈVE — `assignments.student_id` existe
     * depuis le début, et `/sync` sert déjà « ma classe OU moi ». C'est encore
     * l'écran qui ne le demandait jamais. Trois trous restaient de ce côté-ci :
     * personne ne cochait, personne ne reprenait, et la liste des séances d'une
     * classe ne montrait pas ce qu'on avait donné à quelques-uns.
     *
     * ON N'ÉCRIT PAS DE SÉANCE LOCALE ICI, et c'est une décision. La séance
     * locale porte le bilan de CLASSE ; un travail donné à trois élèves n'est
     * pas une séance de classe, et l'y ranger ferait compter vingt-sept
     * absents comme « pas commencé » dans un tableau qui ne les concerne pas.
     */
    /**
     * DÉCOCHER UN ÉLÈVE ALORS QUE TOUTE LA CLASSE L'A.
     *
     * La base ne sait pas écrire « la classe sauf lui » : une assignation vise
     * une CLASSE ou un ÉLÈVE. On convertit donc — on retire la ligne de classe,
     * et l'on en pose une par élève restant. Le geste du professeur est
     * simple ; c'est ici que ça coûte, et c'est le bon endroit.
     *
     * LA SÉANCE LOCALE RESTE. Vingt-huit élèves sur vingt-neuf, c'est encore la
     * séance de la classe, et c'est d'elle que vient le bilan.
     */
    async function convertirEnNominatif(classe, exclu) {
        const { donnerAuServeur, retirerDuServeur } =
            await import('../core/parcoursServeur.js');
        const autres = (classe.eleves || []).filter(e => e.id !== exclu);
        if (!autres.length) return { erreur: 'Cette classe n\'a aucun autre élève.' };

        const r = await retirerDuServeur(parcours, classe.id);
        if (r && r.erreur) return r;

        // UN PAR UN, ET NON EN PARALLÈLE. J'ai d'abord écrit un `Promise.all`,
        // pour ne pas faire attendre une demi-minute sur un geste qui doit
        // paraître immédiat. MESURÉ contre un vrai serveur, sur une classe de
        // six : cinq assignations lancées ensemble en posaient 4, puis 2, puis
        // 4 — et sans jamais rendre d'erreur. Chaque appel MONTE le parcours
        // avant d'assigner ; cinq montées simultanées du même parcours se
        // marchent dessus, et les lignes se perdent en silence.
        //
        // Un résultat qui change d'une fois sur l'autre est un résultat faux,
        // et il valait mieux le découvrir ici qu'un lundi matin avec une classe
        // qui ne reçoit pas son travail.
        let rates = 0;
        for (const e of autres) {
            const un = await donnerAuServeur(parcours, null, { studentId: e.id });
            if (un && un.erreur) rates++;
        }
        // ON DIT CE QUI N'EST PAS PARTI. Un « c'est fait » sur vingt-huit
        // réussites et deux échecs est le mensonge qu'on passe ses journées à
        // débusquer.
        return rates
            ? { erreur: `${rates} élève${rates > 1 ? 's' : ''} n'${rates > 1 ? 'ont' : 'a'} pas `
                + 'reçu le travail. Rouvrez la classe pour voir qui.' }
            : { ok: true, combien: autres.length };
    }

    function brancherLesCasesEleves(liste, classe) {
        liste.querySelectorAll('[data-donner-eleve]').forEach(c => {
            c.onchange = async () => {
                const id = c.dataset.donnerEleve;
                const nom = c.dataset.nom || 'L\'élève';
                const { donnerAuServeur, retirerDuServeur } =
                    await import('../core/parcoursServeur.js');
                c.disabled = true;
                const r = c.checked
                    ? await donnerAuServeur(parcours, null, { studentId: id })
                    : (classesServies.has(classe.id)
                        ? await convertirEnNominatif(classe, id)
                        : await retirerDuServeur(parcours, null, id));
                c.disabled = false;
                if (r && r.erreur) {
                    // ON REMET LA CASE OÙ ELLE ÉTAIT. Une case qui reste cochée
                    // alors que rien n'est parti est exactement le mensonge
                    // qu'on a mis la journée à débusquer.
                    c.checked = !c.checked;
                    showToast(`${nom} : ${r.erreur}`, 'error');
                    return;
                }
                // ON RELIT CE QUE LE SERVEUR SERT, on ne le devine pas : la
                // conversion vient de poser vingt-huit lignes et d'en retirer
                // une, et deviner cet état de tête serait recommencer
                // l'incohérence qu'on est en train de corriger.
                await relireLesNommes();
                showToast(c.checked ? `Donné à ${nom}.` : `Repris à ${nom}.`,
                    c.checked ? 'success' : 'info');
                dessiner();
            };
        });
    }

    async function basculer(classe, caseEl) {
        if (!classe) return;
        const info = etatClasse(classe, seances, pathId);

        if (caseEl.checked) {
            // ON MONTE D'ABORD, ON RANGE ENSUITE. Si le serveur refuse, la case
            // revient où elle était : mieux vaut un geste qui n'a pas pris
            // qu'un geste qui prétend avoir pris.
            if (!await auServeurDonner(classe)) {
                caseEl.checked = false;
                return;
            }
            if (info.retiree) {
                // Elle existait, on la remet : les bilans reprennent leur place.
                seances = seances.map(s => (s.id === info.seance.id ? remettre(s) : s));
                showToast(`${classe.nom} : séance remise.`, 'success');
            } else {
                // LE CODE VOYAGE AVEC LA SÉANCE même quand la classe est
                // rattachée : il sauve le cas de l'élève sur un poste inconnu.
                seances = [...seances, donnerSeance(classe, parcours, {
                    code: Shortcodes.encodePath(parcours)
                })];
                showToast(`Donné à ${classe.nom}.`, 'success');
            }
        } else if (info.seance) {
            // RETIRER, C'EST RETIRER DE CHEZ LES ÉLÈVES. Sans cela, la séance
            // quittait l'écran du professeur et restait en base : les élèves
            // auraient continué de la recevoir à chaque synchronisation.
            //
            // MAIS APRÈS LA QUESTION, JAMAIS AVANT. La branche « personne n'a
            // commencé » demande confirmation ; retirer du serveur en amont
            // aurait fait qu'annuler laisse la séance chez le professeur et
            // plus chez les élèves — c'est-à-dire exactement l'incohérence
            // qu'on est en train de réparer, dans l'autre sens.
            if (info.travaille) {
                if (!await auServeurRetirer(classe)) { caseEl.checked = true; return; }
                // ON NE SUPPRIME PAS DU TRAVAIL. On retire, et on le dit.
                seances = seances.map(s => (s.id === info.seance.id ? retirer(s) : s));
                showToast(`${classe.nom} : séance retirée. Le bilan reste consultable.`, 'info');
            } else {
                // PERSONNE N'A OUVERT : là, on supprime pour de bon — il n'y a
                // rien à protéger, et une séance fantôme encombrerait la liste
                // de la classe. On demande quand même : c'est irréversible.
                //
                // La case reste cochée tant que ce n'est pas confirmé ; c'est
                // le redessin qui la décoche. Annuler ne laisse donc aucune
                // trace, et il n'y a pas de branche « remettre la case » à
                // tenir à jour.
                caseEl.checked = true;
                showConfirm(
                    `Retirer ce parcours à ${esc(classe.nom)} ? Personne n'a encore commencé.`,
                    async () => {
                        if (!await auServeurRetirer(classe)) { dessiner(); return; }
                        seances = seances.filter(x => x.id !== info.seance.id);
                        await enregistrer();
                        dessiner();
                    }, { bouton: `Retirer à ${esc(classe.nom)}` });
                return;
            }
        }
        await enregistrer();
        // CE QUE LE SERVEUR SERT A CHANGÉ : les cases des élèves en dépendent
        // maintenant (cocher la classe coche tout le monde). Sans cette
        // relecture, la liste ouverte garderait l'état d'avant le clic.
        await relireLesNommes();
        dessiner();
    }

    dessiner();
    return panel;
}

