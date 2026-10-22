// Vue « Mon Parcours ».
//
// Avant : uniquement la liste des étapes assignées par le professeur, ou un
// message vide si aucun code n'avait été saisi — c'est-à-dire rien à faire
// pour la majorité des élèves la plupart du temps.
//
// Maintenant, trois blocs, dans l'ordre de priorité pédagogique :
//   1. le parcours assigné (s'il existe) et sa progression ;
//   2. la séance conseillée, construite à partir du modèle de maîtrise
//      (révisions dues, prérequis fragiles, notions nouvelles accessibles) ;
//   3. le dernier bilan noté, pour que l'élève sache où il en est.

import { state } from '../core/state.js';
import { estUnMessage } from '../core/path.js';
import { sectionMesExercices } from './mesExercicesUI.js';
import { instantane, ouvrirSeance } from './maSeance.js';
import { pleinEcranSiSeanceImposee } from './fullscreen.js';
import { estRattache } from '../core/portail.js';
import { getExerciseById } from '../data/catalog.js';
import { TAGS } from '../data/tags.js';
import { reglageSite } from '../core/reglagesSite.js';
import { hydratePath, normalizePath } from '../core/path.js';
import { resolvePolicy, isEvaluation, describePolicy } from '../core/policy.js';
import { journal } from '../core/journal.js';
import { computeRuns } from '../core/projections.js';
import { gradeRun, baremeParEtape } from '../core/grading.js';
import { sousLaPastille } from '../core/ligneDEtape.js';
import { buildRecommendedPreview, startRecommendedSession, startSkillSession } from '../core/remediation.js';
import { formatDuration } from './reportUI.js';
import {
    etatRecompenses, direRecompense, estRecompense, statutEtape, etapesMontrees, prochaineObligatoire
} from '../core/recompenses.js';
import { prendreOuverture, ouvrirLaRoute, recompensesNouvelles } from './ouverture.js';
import {
    LONGUEUR_CLE, normaliserCle, verifierCle, finDe, etatVerrou, clefOuverture, direFermeture
} from '../core/verrou.js';
import { showModal, showToast, showAlert } from './modal.js';
import { laCameraEstPossible } from './scannerQr.js';
import { scannerUnCodeDeSeance } from './studentCodeUI.js';

/**
 * LA CLÉ QU'ON TAPE — quatre caractères dictés en classe.
 *
 * Rémy : « il ne faut pas vraiment que l'élève ait accès aux interros à la
 * maison, mais il peut très bien avoir accès à la séquence avant mon cours. »
 *
 * TROIS PARTIS PRIS.
 *
 *   · ON DIT POURQUOI C'EST FERMÉ, TOUJOURS. Une porte qui refuse sans un mot
 *     passe pour une panne, et l'élève appelle. Une étape datée annonce sa date,
 *     une étape sous clé dit que le professeur la donnera.
 *
 *   · LA SAISIE EST TOLÉRANTE. Minuscules, espaces, tirets : la clé est dictée
 *     à voix haute et recopiée à la main. Refuser « kt rb » serait refuser pour
 *     une mauvaise raison, et trente mains se lèveraient.
 *
 *   · LE REFUS N'EN DIT PAS PLUS QUE « CE N'EST PAS ÇA ». Signaler qu'une
 *     lettre sur quatre est juste transformerait un million d'essais en une
 *     centaine.
 */
function demanderLaCle(step, onOuvert) {
    const etat = etatVerrou(step, { ouverts: state.verrousOuverts });
    // UNE DATE NE SE FORCE PAS. Elle dit que l'étape n'existe pas encore ;
    // proposer d'y entrer une clé laisserait croire qu'on peut la contourner.
    if (etat.raison === 'date') return showAlert(direFermeture(etat));

    const modal = showModal('Cette étape s\'ouvre avec une clé', `
        <div class="verrou-boite">
            <p class="verrou-dit">${escapeHtml(direFermeture(etat))}</p>
            <input class="verrou-champ" type="text" inputmode="text" autocomplete="off"
                autocapitalize="characters" spellcheck="false"
                maxlength="${LONGUEUR_CLE + 4}" aria-label="La clé du professeur"
                placeholder="${'•'.repeat(LONGUEUR_CLE)}">
            <p class="verrou-erreur" role="status" aria-live="polite"></p>
            <button type="button" class="verrou-ok">Ouvrir</button>
        </div>`, { width: '380px' });

    const champ = modal.element.querySelector('.verrou-champ');
    const erreur = modal.element.querySelector('.verrou-erreur');
    modal.element.querySelector('.verrou-ok').onclick = essayer;
    champ.oninput = () => {
        champ.value = normaliserCle(champ.value);
        erreur.textContent = '';
    };
    champ.onkeydown = (e) => { if (e.key === 'Enter') essayer(); };
    setTimeout(() => champ.focus(), 50);

    let enCours = false;
    async function essayer() {
        if (enCours) return;
        const saisie = normaliserCle(champ.value);
        if (saisie.length < LONGUEUR_CLE) {
            erreur.textContent = `Il faut ${LONGUEUR_CLE} caractères.`;
            return;
        }
        // LA VÉRIFICATION PREND UN INSTANT, ET C'EST VOULU — l'empreinte est
        // lente à calculer exprès (voir core/verrou.js). On le dit, sinon
        // l'élève tape trois fois de suite en croyant que rien ne se passe.
        enCours = true;
        erreur.textContent = 'Vérification…';
        const bon = await verifierCle(step.verrou, saisie);
        enCours = false;
        if (!bon) {
            erreur.textContent = 'Ce n\'est pas la bonne clé.';
            champ.select();
            return;
        }
        state.ouvrirVerrou(clefOuverture(step), finDe(step.verrou.duree));
        modal.close();
        showToast('C\'est ouvert.', 'success');
        if (onOuvert) onOuvert();
    }
}

// --- Style de présentation du parcours --------------------------------------
// Trois habillages pour le même parcours : liste classique, carte des mondes
// (façon jeu de plateforme) ou chemin vertical (façon Duolingo).
//
// QUI CHOISIT ? LA SÉANCE D'ABORD, L'ÉLÈVE ENSUITE.
//
// Rémy : « il faudrait pouvoir peut-être choisir la présentation » — puis,
// la proposition faite : « par séance, et par défaut celle façon duolingo ».
//
// Le choix appartenait au POSTE : rangé dans le localStorage du navigateur,
// invisible du professeur, impossible à fixer pour une interrogation. Il
// appartient maintenant à la séance (`policy.presentation`), et le réglage du
// poste ne sert plus que dans deux cas : quand la séance dit « laisser l'élève
// choisir », et hors séance, dans son propre parcours.

const STYLE_KEY = 'mathbox-path-style';
// ── CINQ HABILLAGES, ET CHACUN RÉPOND À UNE SITUATION ─────────────────────
//
// RÉMY : « Pour la présentation du parcours, serait-il possible d'avoir
// d'autres thèmes ? »
//
// ON N'EN AJOUTE PAS POUR LE DÉCOR. Les trois premiers existaient ; les deux
// qui arrivent répondent à deux gênes qu'on peut nommer :
//
//   · LE DAMIER, parce qu'un parcours LONG ne tient pas sur un écran. Sa
//     séance « Avant les vacances » porte QUATORZE étapes : en chemin
//     serpentin, l'élève fait défiler quatre hauteurs d'écran et perd la vue
//     d'ensemble — « combien il m'en reste » devient une question. Le damier
//     les montre toutes d'un coup, sans sentier : ce qu'on y lit n'est plus
//     la route, c'est le PLAN DE TRAVAIL.
//   · LE RUBAN, parce qu'un tableau numérique est LARGE et court. Au TBI ou
//     sur une tablette couchée, une colonne verticale gaspille les deux tiers
//     de l'écran et il faut défiler devant la classe. Le ruban se lit de
//     gauche à droite, à hauteur d'yeux.
//
// L'ORDRE DE CETTE LISTE EST CELUI DES BOUTONS. Le chemin d'abord : c'est le
// défaut, et le premier bouton est celui qu'on vise sans lire.
const STYLES = [
    { id: 'chemin', icon: '🐾', label: 'Chemin d\'étapes' },
    { id: 'mondes', icon: '🗺️', label: 'Carte des mondes' },
    { id: 'damier', icon: '🎛️', label: 'Damier' },
    { id: 'ruban', icon: '🎞️', label: 'Ruban' },
    { id: 'classique', icon: '📋', label: 'Liste classique' }
];

/** Ce que chaque habillage promet, en une phrase — pour l'aperçu du professeur. */
export const HABILLAGES = [
    { id: 'chemin', icon: '🐾', label: 'Chemin d\'étapes',
        dit: 'Une étape après l\'autre, qui serpente. On voit où l\'on va.' },
    { id: 'mondes', icon: '🗺️', label: 'Carte des mondes',
        dit: 'Par rangées de trois, façon jeu de plateau.' },
    { id: 'damier', icon: '🎛️', label: 'Damier',
        dit: 'Tout tient sur un écran. Pour un parcours long, ou un plan de travail.' },
    { id: 'ruban', icon: '🎞️', label: 'Ruban',
        dit: 'De gauche à droite, sur une seule ligne. Pour un écran large ou un TBI.' },
    { id: 'classique', icon: '📋', label: 'Liste classique',
        dit: 'Les titres et les consignes, en toutes lettres.' }
];
const PAR_DEFAUT = 'chemin';

function getPathStyle() {
    try {
        const v = localStorage.getItem(STYLE_KEY);
        return STYLES.some(s => s.id === v) ? v : PAR_DEFAUT;
    } catch (e) { return PAR_DEFAUT; }
}

/** Retient le choix d'habillage, sans rien redessiner. */
function memoriserStyle(id) {
    try { localStorage.setItem(STYLE_KEY, id); } catch (e) { /* mode privé */ }
}

// ── LES DÉCORS : UN AXE À PART DE L'HABILLAGE ─────────────────────────────
//
// RÉMY : « mets aussi des thèmes (Noël, Halloween, Paques, Robot) ».
//
// POURQUOI PAS DANS LA LISTE DES HABILLAGES. Rangé là, « Noël » remplacerait
// la mise en page : l'élève qui a besoin du damier — le parcours de quatorze
// étapes qui ne tient pas sur un écran — perdrait Noël, et le professeur qui
// veut Noël perdrait le damier. Les deux réglages ne répondent pas à la même
// question : l'habillage dit COMMENT on lit le parcours, le décor dit de quoi
// il a l'air. Deux axes, donc, et les vingt combinaisons existent.
//
// ET LE DÉCOR NE TOUCHE PAS AU PICTOGRAMME. Remplacer 🍕 par un flocon ferait
// joli et coûterait l'information : le picto dit la notion travaillée, et
// c'est à ça qu'il sert — « on reconnaît les angles ou l'heure d'un coup
// d'œil ». Un décor change les couleurs, le sol, le sentier, et les ornements
// qui ne portent rien.
const DECOR_KEY = 'mathbox-path-decor';
const DECOR_PAR_DEFAUT = 'aucun';

/**
 * Les décors proposés. `ornements` est la poignée d'emoji semée au fond de la
 * carte ; « sans décor » n'en a pas, et c'est ce qui le définit.
 */
export const DECORS = [
    { id: 'aucun', icon: '🎨', label: 'Sans décor',
        dit: 'Les couleurs du logiciel.' },
    { id: 'noel', icon: '🎄', label: 'Noël',
        dit: 'Rouge et sapin, et il neige derrière les étapes.',
        ornements: ['❄️', '🎁', '🎄', '⭐', '🔔', '❄️'] },
    { id: 'halloween', icon: '🎃', label: 'Halloween',
        dit: 'Violet et citrouille, toiles d\'araignée aux angles.',
        ornements: ['🕸️', '🦇', '🎃', '👻', '🕷️', '🕸️'] },
    { id: 'paques', icon: '🐣', label: 'Pâques',
        dit: 'Vert tendre et œufs peints.',
        ornements: ['🥚', '🐣', '🌷', '🐰', '🌼', '🥚'] },
    { id: 'robot', icon: '🤖', label: 'Robot',
        dit: 'Bleu acier et circuits imprimés.',
        ornements: ['⚙️', '🔧', '🤖', '🔌', '⚡', '⚙️'] }
];

/**
 * CE QUE L'ÉLÈVE A CHOISI SUR CE POSTE — ou `null` s'il n'a rien choisi.
 *
 * `null` ET NON `aucun`, et la différence porte tout le réglage de Rémy. « Je
 * n'ai rien choisi » doit laisser passer le décor du moment ; « j'ai choisi
 * sans décor » doit le refuser. Rendre `aucun` dans les deux cas rendait le
 * réglage du professeur invisible pour tout élève n'ayant jamais touché aux
 * boutons — c'est-à-dire pour presque tous.
 */
function decorChoisiIci() {
    try {
        const v = localStorage.getItem(DECOR_KEY);
        return DECORS.some(d => d.id === v) ? v : null;
    } catch (e) { return null; }
}

/**
 * LE DÉCOR DU MOMENT, posé par le professeur pour tout le site.
 *
 * RÉMY, au choix proposé : « Les deux : un réglage global, et l'élève peut
 * encore jouer. » Il le pose une fois dans sa zone ; il vaut pour toutes les
 * séances, y compris celles déjà données — sans en rouvrir aucune.
 */
function decorDuMoment() {
    const v = reglageSite('decorDuMoment');
    return DECORS.some(d => d.id === v) ? v : null;
}

/** Le décor effectif sur ce poste : ce que l'élève a choisi, sinon celui du moment. */
function getPathDecor() {
    return decorChoisiIci() || decorDuMoment() || DECOR_PAR_DEFAUT;
}

/** Retient le décor choisi sur ce poste, sans rien redessiner. */
function memoriserDecor(id) {
    try { localStorage.setItem(DECOR_KEY, id); } catch (e) { /* mode privé */ }
}

/**
 * Le décor IMPOSÉ par la séance, ou `null` si elle rend la main à l'élève.
 *
 * `aucun` EST UNE IMPOSITION, et c'est voulu : « pas de décor » est un choix
 * que le professeur doit pouvoir faire pour une interrogation — sans quoi
 * l'élève garderait ses guirlandes pendant le contrôle. Rendre la main se dit
 * `libre`, comme pour l'habillage, et c'est le défaut : un parcours enregistré
 * avant ce réglage ne se met pas à imposer dans le dos de son auteur.
 */
export function decorImpose(policy) {
    const v = policy && policy.decor;
    return DECORS.some(d => d.id === v) ? v : null;
}

/** Le décor à employer pour CETTE séance : le sien, sinon celui du poste. */
export function decorDeLaSeance(policy) {
    return decorImpose(policy) || getPathDecor();
}

/**
 * Pose le décor sur une carte déjà construite.
 *
 * LE DÉCOR EST UNE CLASSE, PAS UN DESSIN. Les quatre habillages illustrés
 * teignent leur ciel avec `--primary` et `--accent` en `color-mix` : redéfinir
 * ces deux jetons sur la carte repeint d'un coup le fond, le sentier, la
 * pastille en cours et le fanion « C'est ici ! ». Les vingt combinaisons
 * existent donc sans une ligne de plus par habillage — c'est la raison pour
 * laquelle le décor est un axe à part et pas un sixième habillage.
 *
 * LES ORNEMENTS NE VONT PAS SUR LA LISTE CLASSIQUE : elle se lit en toutes
 * lettres, et semer six emoji derrière un paragraphe se paie en lisibilité
 * sans rien apporter. Elle garde les couleurs.
 */
function poserLeDecor(carte, id) {
    const decor = DECORS.find(d => d.id === id);
    if (!decor || !decor.ornements) return carte;
    carte.classList.add('decor', `decor--${decor.id}`);
    if (carte.classList.contains('path-timeline')) return carte;
    // LE RUBAN DÉFILE, ET SON CADRE N'EST PAS SA PISTE. Les ornements se posent
    // sur la boîte qui porte les pastilles ; sur le cadre, ils resteraient
    // collés à la fenêtre pendant que le parcours glisse dessous.
    const sol = carte.classList.contains('ruban-path')
        ? carte.querySelector('.ruban-piste') : carte;
    if (!sol) return carte;
    const nappe = document.createElement('div');
    nappe.className = 'decor-nappe';
    nappe.setAttribute('aria-hidden', 'true');
    decor.ornements.forEach(o => {
        const s = document.createElement('span');
        s.className = 'decor-ornement';
        s.textContent = o;
        nappe.appendChild(s);
    });
    sol.insertBefore(nappe, sol.firstChild);
    return carte;
}

/**
 * L'habillage IMPOSÉ par la séance, ou `null` si elle rend la main à l'élève.
 *
 * Un parcours enregistré avant ce réglage n'a pas de `presentation` : il ne
 * doit pas se mettre à imposer quoi que ce soit dans le dos de son auteur, et
 * `resolvePolicy` lui donnera de toute façon le défaut du mode. On ne lit donc
 * que ce qui est écrit, et `libre` veut dire libre.
 */
export function presentationImposee(policy) {
    const v = policy && policy.presentation;
    return STYLES.some(s => s.id === v) ? v : null;
}

/**
 * L'habillage à employer pour CETTE séance : le sien, sinon celui du poste.
 */
export function styleDeLaSeance(policy) {
    return presentationImposee(policy) || getPathStyle();
}

/**
 * Les trois boutons d'habillage — ou RIEN quand la séance impose le sien.
 *
 * Laisser les boutons en place et ignorer les clics serait le pire des deux
 * mondes : l'élève appuierait trois fois avant de comprendre qu'on lui ment.
 * L'appelant teste donc le retour, qui vaut `null` dans ce cas.
 *
 * `onChange` dit quoi redessiner : la vue « Parcours » se refait entière, la
 * carte d'une séance en cours se refait seule — c'est le même choix, rangé au
 * même endroit.
 */
export function barreDeStyles(onChange, policy = null) {
    // ON NE CACHE QUE CE QUI EST IMPOSÉ, rangée par rangée. Une séance peut
    // fixer l'habillage et laisser le décor libre — ou l'inverse : retirer les
    // deux rangées dès que l'une est imposée enlèverait à l'élève un choix
    // qu'on lui laisse. Et si les deux sont imposées, il n'y a plus de barre :
    // laisser des boutons qui n'obéissent pas est le pire des deux mondes.
    const groupes = [];
    if (!presentationImposee(policy)) {
        groupes.push(groupeDeBoutons(STYLES, 'Présentation', getPathStyle(),
            id => { memoriserStyle(id); onChange(id); }));
    }
    if (!decorImpose(policy)) {
        groupes.push(groupeDeBoutons(DECORS, 'Décor', getPathDecor(),
            id => { memoriserDecor(id); onChange(id); }));
    }
    if (!groupes.length) return null;
    const box = document.createElement('div');
    box.className = 'path-style-switcher';
    groupes.forEach(g => box.appendChild(g));
    return box;
}

/**
 * Une rangée de boutons-pastilles : un choix, celui qui est actif marqué.
 *
 * DEUX RANGÉES PLUTÔT QU'UNE DE DIX. Mesuré sur un téléphone de 390 px : dix
 * pastilles de 36 px font 420 px et débordent de l'écran. Deux groupes de cinq
 * passent à la ligne tout seuls, et chacun reste lisible comme un choix.
 */
function groupeDeBoutons(liste, quoi, actif, choisir) {
    const groupe = document.createElement('div');
    groupe.className = 'path-style-groupe';
    groupe.setAttribute('role', 'group');
    groupe.setAttribute('aria-label', quoi);
    liste.forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'path-style-btn' + (s.id === actif ? ' path-style-btn--active' : '');
        btn.textContent = s.icon;
        btn.title = s.label;
        btn.setAttribute('aria-label', `${quoi} : ${s.label}`);
        // `aria-pressed` DIT CE QUE LA PASTILLE GRISÉE DIT À L'ŒIL. Sans lui,
        // le lecteur d'écran annonce cinq boutons identiques et l'élève ne sait
        // pas lequel est le sien.
        btn.setAttribute('aria-pressed', s.id === actif ? 'true' : 'false');
        btn.onclick = () => choisir(s.id);
        groupe.appendChild(btn);
    });
    return groupe;
}

function styleSwitcher(policy) {
    return barreDeStyles(() => renderStudentPathView(), policy);
}

/**
 * La vue « Parcours » est-elle SOUS LES YEUX de l'élève ?
 *
 * Pas seulement construite : visible. Le meneur marque l'étape réussie
 * pendant que le jeu occupe encore tout l'écran, et la vue se redessine
 * derrière lui — c'est le moment où il ne faut surtout pas jouer la fête.
 */
function visiblePourLElève() {
    const vue = document.getElementById('view-path');
    if (!vue || vue.style.display === 'none' || !vue.getBoundingClientRect().width) return false;
    const jeu = document.getElementById('game-layer');
    return !jeu || getComputedStyle(jeu).display === 'none';
}

export function renderStudentPathView() {
    const container = document.getElementById('student-path-container');
    if (!container) return;
    container.innerHTML = '';

    container.appendChild(assignedSection());
    // LA PORTE D'UN AUTRE CODE, ET SEULEMENT QUAND UN PARCOURS EST DÉJÀ LÀ :
    // l'écran « Pas de séance » porte déjà ses deux boutons, et les répéter
    // ferait quatre boutons pour deux gestes.
    //
    // JUSTE SOUS LE PARCOURS, ET NON TOUT EN BAS DE LA PAGE. Le travail du
    // jour passe d'abord — c'est pour cela qu'elle n'est pas en tête — mais
    // l'élève qui arrive devant un QR projeté doit la VOIR sans chercher : au
    // bas d'une page qui porte les séances du professeur, les conseils, ses
    // propres exercices et son dernier bilan, personne ne descend.
    if (state.studentPath) container.appendChild(porteSousLeParcours());
    const teacher = teacherPathsSection();
    if (teacher) container.appendChild(teacher);
    const conseils = recommendedSection();
    if (conseils) container.appendChild(conseils);
    // LES EXERCICES QUE L'ÉLÈVE SE DONNE viennent APRÈS ce qu'on lui demande :
    // le devoir d'abord, la séance conseillée ensuite, et enfin ce qu'il
    // choisit. L'ordre de la page est l'ordre des priorités.
    container.appendChild(sectionMesExercices());
    const last = lastResultSection();
    if (last) container.appendChild(last);
}

// --- 1. Parcours assigné ----------------------------------------------------

/**
 * QUAND AUCUN PARCOURS N'EST CHARGÉ — et c'était le pire écran du logiciel.
 *
 * Mesuré (tools/leTrajetDeLEleve.mjs) : le professeur donne une séance à sa
 * classe ; Zoé entre avec son billet ; l'application l'envoie sur cet
 * écran-ci — `app.js` fait `setTopNavMode('path')` pour tout élève — et la
 * PREMIÈRE PHRASE qu'elle lit est :
 *
 *     « Aucun parcours assigné pour le moment. Saisis le code donné par ton
 *       professeur avec le bouton « Code » en haut de l'écran. »
 *
 * — phrase qui, en plus, désignait un bouton qui se trouve EN BAS sur un
 * téléphone. Elle a été remplacée par le bouton lui-même.
 *
 * C'était faux. Sa séance était bien arrivée, mais elle ne s'affichait que sur
 * l'AUTRE accueil — celui du catalogue, que `aujourdhui.js` dessine — et cet
 * écran-ci ne regardait que `state.studentPath`, qui ne vaut quelque chose
 * qu'une fois la séance OUVERTE. Une séance reçue mais pas encore ouverte
 * n'existait donc nulle part ici.
 *
 * Le dégât n'est pas l'affichage : c'est qu'un enfant de onze ans à qui l'on
 * dit « tu n'as rien » et qui a quelque chose lève la main — et c'est le
 * professeur qui traverse la salle. Trente fois.
 *
 * ON NE REFAIT PAS LE CALCUL ICI. `maSeance.js` tient déjà l'état de la séance
 * du moment, et `ouvrirSeance` est le chemin par lequel passe aussi un code
 * dicté. Deux chemins vers le même parcours, ce sont deux comportements à
 * tenir d'accord ; on emprunte celui qui existe.
 */
function sectionSansParcours(box) {
    const etat = instantane().etat;

    // RIEN À FAIRE, POUR DE VRAI. C'est le seul cas où le message d'avant
    // disait la vérité — et l'on peut alors parler de code, puisque c'est bien
    // ce qui manque.
    if (!etat || !etat.seance) {
        // ON N'ENVOIE PLUS CHERCHER UN BOUTON AILLEURS — ON LE MET ICI.
        //
        // Le message disait « le bouton Code en haut de l'écran ». Mesuré : sur
        // un téléphone, ce bouton est en BAS — c'est `#mob-btn-code`, dans la
        // barre du bas ; celui du haut disparaît sous 900 px de large. On
        // envoyait donc un enfant de onze ans chercher au mauvais endroit, à
        // l'instant précis où il ne trouve déjà rien.
        //
        // Dire « en bas sur téléphone, en haut sinon » serait une phrase de
        // plus à tenir d'accord avec la mise en page. Le bouton est ICI, sous
        // la phrase qui en parle, et il ouvre la même fenêtre que les deux
        // autres.
        box.innerHTML = `
            <h2 class="path-section-title">Pas de séance pour l'instant</h2>
            <div class="empty-state-msg">Ton professeur ne t'a rien donné pour le moment.
            S'il t'a dicté un code, tape-le ici.</div>
            <div class="path-autre-code-boutons"></div>`;
        // LE SCANNER D'ABORD, ET C'EST L'ORDRE DU GESTE : devant un QR projeté
        // au tableau, il n'y a rien à taper, donc rien à se tromper.
        const rangee = box.querySelector('.path-autre-code-boutons');
        const scan = boutonScannerLeCode();
        if (scan) rangee.appendChild(scan);
        rangee.appendChild(boutonTaperLeCode('btn-toggle active'));
        // ET L'INSTALLATION, ICI PLUTÔT QU'AILLEURS.
        //
        // C'est l'écran sur lequel tombe une tablette NEUVE : rien à faire
        // encore, et tout à préparer. Posée maintenant, l'application garde
        // son cache et s'ouvre sans adresse à taper — c'est la différence
        // entre « ça marchait la semaine dernière » et « ça marche ».
        //
        // Le bouton ne paraît que s'il peut servir : `poserLeBouton…` ne pose
        // rien quand l'application est déjà installée, ni sur un navigateur
        // qui ne sait ni installer ni expliquer comment.
        import('./installer.js')
            .then(m => m.poserLeBoutonDInstallation(box))
            .catch(() => { /* l'écran vaut mieux sans que cassé par son extra */ });
        return box;
    }

    const dit = etat.close
        ? 'Sa fenêtre est fermée, mais tu peux encore la faire.'
        // « Étape » désigne une POSITION dans le parcours, pas une chose : on la
        // garde là où elle dit ça (« étape 3 sur 5 », la carte), et l'on compte
        // ici des EXERCICES, comme partout ailleurs.
        : `${etat.total} exercice${etat.total > 1 ? 's' : ''} à faire.`;
    box.innerHTML = `
        <h2 class="path-section-title">${escapeHtml(etat.titre)}</h2>
        <p class="path-section-sub">${etat.classeNom ? escapeHtml(etat.classeNom) + ' · ' : ''}${dit}</p>`;

    // LE MOT DU PROFESSEUR PASSE AVANT LE BOUTON. S'il a écrit quelque chose à
    // CET élève, c'est la consigne : la lire après avoir cliqué serait la lire
    // trop tard.
    if (etat.mot) {
        const mot = document.createElement('p');
        mot.className = 'path-section-mot';
        mot.textContent = `« ${etat.mot} »`;
        box.appendChild(mot);
    }

    const btn = document.createElement('button');
    btn.className = 'btn-toggle active path-ouvrir-seance';
    btn.type = 'button';
    btn.textContent = etat.commence ? 'Reprendre ma séance' : 'Commencer ma séance';
    btn.onclick = () => ouvrirSeance(etat.seance);
    box.appendChild(btn);
    return box;
}

/**
 * LA PORTE D'UN AUTRE CODE — et pourquoi elle est sur CET écran.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, après l'essai sur tablette : « il faut sur l'écran d'ailleurs un bouton
 * pour scanner directement le qr code, car là il faut passer par le code puis
 * le qr code c'est trop long. »
 *
 * ── CE QUI A ÉTÉ MESURÉ, ET QUI N'EST PAS CE QUE JE CROYAIS ────────────────
 *
 * J'ai d'abord cru qu'un élève ayant déjà une séance n'avait plus AUCUN moyen
 * d'entrer un code. Faux : la barre du bas porte « Code » (`#mob-btn-code`) et
 * la barre du haut son onglet. Ma sonde ne cherchait que `[data-ouvrir-code]`,
 * et un sélecteur trop étroit rend la même réponse qu'un logiciel cassé.
 *
 * CE QUI EST VRAI EST PLUS PETIT, ET C'EST EXACTEMENT SA PHRASE : il faut DEUX
 * gestes — ouvrir la fenêtre du code, puis toucher « Scanner ». Pour trente
 * élèves au début de l'heure, devant un QR déjà projeté, c'est un geste de
 * trop. Le bouton est donc ICI, sur l'écran où l'élève arrive.
 *
 * ── ET HORS LIGNE, CE N'EST PLUS DU CONFORT ────────────────────────────────
 *
 * Sans réseau, aucune séance n'arrive par la synchronisation : le QR code est
 * le SEUL chemin par lequel la classe de sa sœur reçoit du travail. La porte
 * d'entrée, elle, a disparu dès la première séance — `portailNecessaire()`
 * s'éteint quand l'élève a de quoi travailler. Sans ce bouton, la caméra qui
 * s'ouvre toute seule sur la porte ne sert qu'une fois, le premier jour.
 */
function porteDUnAutreCode(titre, aide) {
    const box = document.createElement('section');
    box.className = 'path-section path-autre-code';
    box.innerHTML = `
        <h2 class="path-section-title">${titre}</h2>
        <p class="path-section-sub">${aide}</p>`;
    const rangee = document.createElement('div');
    rangee.className = 'path-autre-code-boutons';
    const scan = boutonScannerLeCode();
    if (scan) rangee.appendChild(scan);
    // LES DEUX PORTENT `active`, ET CE N'EST PAS UN OUBLI. Mesuré en photo :
    // un `.btn-toggle` sans `active` a une bordure transparente et la couleur
    // des textes secondaires — « J'ai un code à taper » se lisait comme une
    // phrase, pas comme un bouton. Ce qui les distingue est l'ordre et
    // l'icône, pas l'effacement de l'un des deux.
    rangee.appendChild(boutonTaperLeCode('btn-toggle active'));
    box.appendChild(rangee);
    return box;
}

/** Ouvre la fenêtre du code — le chemin qui existait déjà, et le seul. */
function ouvrirLaFenetreDuCode() {
    const fenetre = document.getElementById('code-modal');
    if (fenetre) fenetre.style.display = 'flex';
    const champ = document.getElementById('student-code-input');
    if (champ) { champ.value = ''; champ.focus(); }
}

function boutonTaperLeCode(classe) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = classe + ' path-ouvrir-code';
    b.setAttribute('data-ouvrir-code', '');
    // ENTRE GUILLEMETS DROITS DOUBLES, ET CE N'EST PAS UN CAPRICE : une
    // épreuve de la maison cherche « J'ai un code » dans la SOURCE de ce
    // fichier (tests/accueilEleve.test.mjs), et l'apostrophe échappée d'une
    // chaîne à guillemets simples y écrit « J\'ai un code », que son motif ne
    // reconnaît pas. Elle est tombée là-dessus.
    b.textContent = "J'ai un code à taper";
    b.onclick = ouvrirLaFenetreDuCode;
    return b;
}

/**
 * LE BOUTON QUI SCANNE, EN UN SEUL GESTE — ou rien du tout.
 *
 * `null` quand l'appareil ne peut pas scanner : hors contexte sécurisé ou sans
 * caméra, `getUserMedia` n'existe pas, et un bouton qui ouvre une fenêtre pour
 * y annoncer « impossible » est un bouton qu'il ne fallait pas montrer.
 */
function boutonScannerLeCode() {
    if (!laCameraEstPossible()) return null;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-toggle active path-scanner-code';
    b.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="4" height="4"/><rect x="13" y="13" width="4" height="4"/></svg> Scanner le QR code`;
    b.onclick = () => scannerUnCodeDeSeance({
        // LE PARCOURS S'OUVRE TOUT SEUL : `applyCode` monte le meneur, et il
        // n'y a rien à dire de plus. On ne parle que quand ça ne marche pas.
        surEchec: () => showToast('Ce QR code vient bien d\'AtoutMath, mais son '
            + 'parcours ne s\'ouvre pas. Montre-le à ton professeur.', 'error')
    });
    return b;
}

function assignedSection() {
    const box = document.createElement('section');
    box.className = 'path-section';

    const assigned = state.studentPath;
    if (!assigned || !assigned.steps || !assigned.steps.length) {
        return sectionSansParcours(box);
    }

    const path = normalizePath({ id: assigned.pathId, name: assigned.name, policy: assigned.policy, steps: assigned.steps, version: 2 });
    const { steps } = hydratePath(path);
    const policy = resolvePolicy(path.policy);
    const done = new Set(assigned.completed || []);
    // LES JEUX DE RÉCOMPENSE. Ils ne comptent pas dans la progression : la
    // « prochaine étape » est le prochain EXERCICE à faire, et un parcours est
    // terminé quand son travail l'est — pas quand ses jeux le sont.
    const etatJeux = etatRecompenses(path, { completed: assigned.completed || [], resultats: assigned.resultats });
    const parJeu = new Map(etatJeux.jeux.map(j => [j.stepId, j]));
    // LA PROCHAINE À FAIRE EST LA PROCHAINE OBLIGATOIRE : une étape facultative
    // laissée de côté ne retient pas le curseur, sans quoi le parcours
    // indiquerait éternellement une étape que l'élève a choisi de ne pas faire.
    const firstPending = prochaineObligatoire(steps, done);
    const allDone = firstPending === -1;

    box.innerHTML = `
        <div class="path-section-head">
            <div>
                <h2 class="path-section-title">${escapeHtml(assigned.name || 'Parcours du professeur')}</h2>
                <p class="path-section-sub ${isEvaluation(policy) ? 'path-section-sub--eval' : ''}">${describePolicy(policy)}</p>
            </div>
        </div>`;
    const boutonsDHabillage = styleSwitcher(policy);
    if (boutonsDHabillage) box.querySelector('.path-section-head').appendChild(boutonsDHabillage);

    // LA ROUTE QUI S'OUVRE. On revient d'une étape réussie : plutôt que de
    // redessiner la carte déjà à jour — le pointillé devenu trait sans que
    // personne l'ait vu se faire —, on la dessine dans l'état d'AVANT et l'on
    // rejoue le passage. Voir ui/ouverture.js.
    //
    // ON NE CONSOMME LA FÊTE QUE SI QUELQU'UN LA REGARDE. Le meneur marque
    // l'étape réussie pendant que le jeu est encore à l'écran : la vue
    // « Parcours » se redessine alors CACHÉE derrière lui, et si elle prenait
    // l'ouverture à ce moment-là, la route se tracerait pour personne. L'élève
    // fermerait son bilan et retomberait sur une carte déjà à jour — c'est
    // exactement ce qu'on voulait éviter. La fête attend donc l'onglet.
    const regarde = visiblePourLElève();
    const aFeter = regarde ? prendreOuverture() : null;
    const iFeter = aFeter ? steps.findIndex(s => s.stepId === aFeter) : -1;
    const ouverture = (iFeter >= 0 && done.has(aFeter)) ? iFeter : undefined;
    // LES JEUX BONUS GAGNÉS DEPUIS LE DERNIER COUP D'ŒIL. Ils ne s'ouvrent pas
    // parce qu'on est arrivé à leur pastille, mais parce que le travail qui
    // les précède est fait et bien fait : ils peuvent donc s'ouvrir loin
    // devant, et plusieurs d'un coup. On les repère en comparant avec ce qui
    // était ouvert la dernière fois que l'élève a REGARDÉ la carte.
    const gagnes = regarde
        ? new Set(recompensesNouvelles(new Set(etatJeux.jeux.filter(j => j.ouvert).map(j => j.stepId))))
        : new Set();

    const opts = {
        doneIds: done,
        currentIndex: firstPending,
        // LES ÉTAPES SOUS CLÉ DÉJÀ OUVERTES, et jusqu'à quand. Sans elles,
        // `statutEtape` refermerait l'interrogation entre deux questions.
        ouverts: state.verrousOuverts,
        // LE BARÈME EST ANNONCÉ AVANT DE COMPOSER : on ne note pas sans dire
        // sur quoi. `null` hors évaluation notée — une étape d'entraînement
        // n'a pas de points, et en afficher serait mentir.
        bareme: baremeParEtape(steps, path.policy),
        // CE QU'IL A FAIT DE CHAQUE ÉTAPE DÉJÀ TERMINÉE. Rémy, devant le
        // plan : « on pourrait écrire la réussite aussi non ? ». La pastille
        // disait ce qu'il y A à faire — quatorze questions, quatre points —
        // et jamais ce qu'il EN A FAIT ; l'élève devait rouvrir son bilan
        // pour savoir s'il avait tout trouvé à l'étape qu'il regardait.
        resultats: assigned.resultats || {},
        recompenses: parJeu,
        seuilRecompense: etatJeux.seuil,
        // L'élève choisit-il son ordre ? C'est une règle de la séance.
        ordreLibre: !!policy.ordreLibre,
        // ET SON HABILLAGE AUSSI. `styleDeLaSeance` rend celui que la séance
        // impose, ou celui du poste quand elle laisse le choix.
        style: styleDeLaSeance(policy),
        // ET SON DÉCOR, de la même façon : imposé par la séance, ou celui que
        // l'élève a choisi sur ce poste.
        decor: decorDeLaSeance(policy),
        ouverture,
        gagnes,
        onNodeClick: (i, statut) => {
            if (statut === 'locked' || statut === 'cadeau-ferme') return;
            // UNE ÉTAPE SOUS CLÉ SE TAPE : le clic ne la lance pas, il demande
            // la clé. C'est le seul cadenas de l'application sur lequel il y a
            // quelque chose à faire, et le refuser en silence laisserait l'élève
            // croire à une panne.
            if (statut === 'cle') return demanderLaCle(steps[i], () => launchAssigned(path, i));
            launchAssigned(path, i);
        }
    };
    const rendu = construireCarte(steps, opts);
    box.appendChild(rendu);

    if (ouverture !== undefined || gagnes.size) {
        // Après la mise en page : le sentier n'a de longueur qu'une fois posé.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            ouvrirLaRoute(rendu, rendu.__ouvertureRang, rendu.__sentierDefinitif);
        }));
    }

    if (!allDone && firstPending !== -1) {
        const btn = document.createElement('button');
        btn.className = 'btn-toggle active world-map-play';
        btn.textContent = isEvaluation(policy) ? 'Commencer l\'évaluation' : `Jouer : ${steps[firstPending].title}`;
        btn.onclick = () => launchAssigned(path, firstPending);
        box.appendChild(btn);
    }

    if (allDone) {
        const done2 = document.createElement('div');
        done2.className = 'path-complete-banner';
        done2.textContent = '🎉 Parcours terminé ! Bravo.';
        box.appendChild(done2);
    }

    // LA SALLE DE JEUX. Quand le travail est fait au niveau demandé, tous les
    // jeux du parcours passent en accès libre — c'est la récompense de fin, et
    // elle mérite mieux qu'une pastille au milieu de la carte.
    const salle = salleDeJeux(path, steps, etatJeux);
    if (salle) box.appendChild(salle);
    return box;
}

/**
 * LA PORTE D'UN AUTRE CODE, SOUS LE PARCOURS EN COURS.
 *
 * EN BAS, ET C'EST VOULU : le travail du jour passe d'abord. Mais elle est là,
 * sur l'écran où l'élève arrive, et c'est tout ce que Rémy demandait — un seul
 * geste pour viser le tableau.
 */
function porteSousLeParcours() {
    return porteDUnAutreCode('Une autre séance&nbsp;?',
        'Si ton professeur en donne une nouvelle, scanne son QR code '
        + 'ou tape son code.');
}

/**
 * La salle de jeux : les récompenses ouvertes, offertes d'un bloc.
 * Rien tant qu'aucune n'est ouverte — une salle vide n'annonce que le manque.
 */
function salleDeJeux(path, steps, etat) {
    const ouverts = etat.jeux.filter(j => j.ouvert);
    if (!ouverts.length) return null;

    const box = document.createElement('section');
    box.className = 'path-section salle-jeux';
    box.innerHTML = `
        <h2 class="path-section-title">🎁 ${etat.toutOuvert ? 'Tes jeux sont ouverts' : 'Ta récompense'}</h2>
        <p class="path-section-sub">${etat.toutOuvert
        ? 'Parcours terminé : tous les jeux du parcours sont à toi.'
        : 'Tu as mérité ce jeu. Il reste du travail après, mais il est à toi.'}</p>`;

    const liste = document.createElement('div');
    liste.className = 'salle-jeux-liste';
    for (const j of ouverts) {
        const i = steps.findIndex(s => s.stepId === j.stepId);
        if (i < 0) continue;
        const carte = document.createElement('button');
        carte.type = 'button';
        carte.className = 'salle-jeu';
        carte.innerHTML = `<span class="salle-jeu-picto">${pictoDe(steps[i])}</span>
            <span class="salle-jeu-nom">${escapeHtml(steps[i].title)}</span>`;
        carte.onclick = () => launchAssigned(path, i);
        liste.appendChild(carte);
    }
    if (!liste.children.length) return null;
    box.appendChild(liste);
    return box;
}

/**
 * PARTIR DE LA CARTE — SANS LA REMONTRER.
 *
 * RÉMY : « il y a toujours l'écran d'accueil avec le monde puis on clique et on
 * va sur le monde, il y a tjs deux étapes alors que si j'ouvre la séance, on
 * devrait pouvoir toujours aller directement sans double clic au monde ».
 *
 * TOUT CE QUI AMÈNE ICI A DÉJÀ MONTRÉ LA CARTE. C'est ce fichier qui la
 * dessine, entière, avec la règle de la séance et « C'est ici ! » sur la
 * prochaine étape ; puis l'élève clique une étape, ou le bouton « Jouer », et
 * le meneur la redessinait aussitôt avec un bouton « Continuer ». Deux écrans,
 * la même image, et un clic pour rien.
 *
 * LA MÊME CORRECTION EXISTAIT DÉJÀ — AILLEURS. `ui/maSeance.js` passe
 * `sansCarteDOuverture` depuis des mois, avec la phrase de Rémy en commentaire
 * (« il y a deux mouvements »). Elle n'avait été posée que sur le bouton
 * « Commencer ma séance ». Les clics depuis la carte, eux, gardaient le double
 * écran — et ce sont ceux qu'on fait quand on REPREND une séance commencée,
 * c'est-à-dire la plupart du temps.
 *
 * C'est la deuxième fois dans la même journée qu'une correction juste n'avait
 * fermé qu'un chemin sur plusieurs (voir la corbeille des parcours). La
 * sonde `tools/entreeDansLaSeance.mjs` mesure désormais LES DEUX entrées.
 *
 * L'ORDRE LIBRE GARDE SA CARTE, et ce n'est pas une exception posée ici : le
 * meneur la lui rend lui-même (`runner.js`, `!(sansCarteDOuverture &&
 * !policy.ordreLibre)`). Une séance dont tout l'intérêt est que l'élève
 * choisisse par où commencer ne peut pas sauter l'écran du choix.
 */
async function launchAssigned(path, startIndex) {
    // LE PLEIN ÉCRAN PART ICI, ET AVANT LE PREMIER `await` — Rémy : « oui si la
    // séance est imposée et laisse le bouton ». Un `await import()` rend la
    // main au navigateur, qui ne reconnaît alors plus le geste de l'élève et
    // refuse le plein écran en silence. Voir `ui/fullscreen.js`, qui décide
    // seul s'il y a lieu.
    //
    // CETTE FONCTION EST LA PORTE DE TOUS LES APPUIS DE LA CARTE : le bouton
    // « Jouer », une étape cliquée, une étape sous clé une fois la clé donnée.
    // La poser ici plutôt que sur chacun est ce qui évite qu'un chemin soit
    // oublié — ce qui est déjà arrivé deux fois sur cet écran (voir le double
    // écran de `sansCarteDOuverture` juste au-dessus).
    pleinEcranSiSeanceImposee(path);
    const { Runner } = await import('../core/runner.js');
    new Runner({
        path, deviceMode: 'none', isStudentPath: true, startIndex,
        sansCarteDOuverture: true
    }).start();
}

// --- Habillage commun des parcours illustrés --------------------------------
// La carte des mondes et le chemin d'étapes partagent la même pastille : un
// palet rond à liseré épais, avec le PICTOGRAMME de la notion travaillée
// plutôt qu'un numéro anonyme — on reconnaît « les angles » ou « l'heure »
// d'un coup d'œil, comme sur les leçons d'une application de langues.

const PICTOS = {
    [TAGS.SOUS_DOMAINE.CALCUL_MENTAL]: '🧮',
    [TAGS.SOUS_DOMAINE.NUMERATION]: '🔢',
    [TAGS.SOUS_DOMAINE.FRACTIONS]: '🍕',
    [TAGS.SOUS_DOMAINE.DECIMAUX]: '💰',
    [TAGS.SOUS_DOMAINE.REPERAGE]: '🗺️',
    [TAGS.SOUS_DOMAINE.ANGLES]: '📐',
    [TAGS.SOUS_DOMAINE.PRIORITES]: '⚖️',
    [TAGS.SOUS_DOMAINE.LOGIQUE]: '🧩',
    [TAGS.SOUS_DOMAINE.PERIMETRE_AIRE]: '📏',
    [TAGS.SOUS_DOMAINE.ESPACE]: '🧊',
    [TAGS.SOUS_DOMAINE.TABLEUR]: '📊',
    [TAGS.SOUS_DOMAINE.DUREES]: '🕐',
    [TAGS.DOMAINE.NUMERIQUE]: '🔢',
    [TAGS.DOMAINE.GEOMETRIQUE]: '📐',
    [TAGS.DOMAINE.GRANDEURS]: '📏',
    [TAGS.DOMAINE.DONNEES]: '📊',
    [TAGS.SOUS_DOMAINE.CASSE_TETE]: '🧠',
    [TAGS.SOUS_DOMAINE.STRATEGIE]: '🧠',
    [TAGS.SOUS_DOMAINE.ADRESSE]: '🪶',
    [TAGS.DOMAINE.DEFIS]: '🧠'
};

function pictoDe(step) {
    // UN MOT DU PROFESSEUR PORTE SON PROPRE PICTO, et non le crayon par défaut.
    // Sans lui, la case du mot se dessinait comme un exercice dont le domaine
    // est inconnu : l'élève cliquait dessus en croyant jouer.
    if (estUnMessage(step)) return '💬';
    const chemin = (step.exercise && step.exercise.tags && step.exercise.tags.chemin) || [];
    for (let i = chemin.length - 1; i >= 0; i--) {
        if (PICTOS[chemin[i]]) return PICTOS[chemin[i]];
    }
    return '✏️';
}

/**
 * Une pastille de parcours, identique pour les deux habillages illustrés.
 * Le numéro n'est pas perdu : il passe dans une petite gommette d'angle.
 */
function creerNoeud(step, i, statut, opts, numero = i + 1) {
    const node = document.createElement('div');
    node.className = `world-node world-node--${statut}`;
    // Un jeu bonus qui vient d'être gagné : il se dessine encore FERMÉ, et
    // c'est ui/ouverture.js qui le fera trembler puis s'ouvrir.
    if (opts.gagnes && opts.gagnes.has(step.stepId)) node.classList.add('world-node--gagne');

    const socle = document.createElement('div');
    socle.className = 'world-node-socle';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'world-node-btn';
    const cadeau = statut === 'cadeau' || statut === 'cadeau-ferme';
    // UNE ÉTAPE SOUS CLÉ PORTE UNE CLÉ, PAS UN CADENAS. Le cadenas veut dire
    // « pas encore mérité » : l'élève sait qu'il l'ouvrira en travaillant. La
    // clé veut dire « le professeur l'ouvrira » — ce n'est pas la même
    // attente, et lui faire croire qu'il peut la gagner serait mentir.
    const picto = statut === 'cadeau' ? '🎁'
        : statut === 'cadeau-ferme' ? '🔒'
            : statut === 'cle' ? '🔑'
                : statut === 'locked' ? '🔒' : pictoDe(step);
    btn.innerHTML = `<span class="world-node-picto">${picto}</span>`;
    btn.title = step.title;
    const mot = estUnMessage(step);
    const dit = statut === 'done' ? 'terminé'
        : statut === 'cadeau' ? 'jeu ouvert'
            : statut === 'cle' ? 'fermée, il faut la clé du professeur'
                : (statut === 'locked' || statut === 'cadeau-ferme') ? 'à débloquer'
                    // ON NE DIT PAS « jouer » SUR UN MOT À LIRE. C'est la seule
                    // phrase que le lecteur d'écran annonce : elle doit dire ce
                    // qui va se passer, et il ne va rien se jouer.
                    : mot ? 'à lire' : 'jouer';
    btn.setAttribute('aria-label',
        `${cadeau ? 'Jeu' : mot ? 'Mot du professeur' : 'Étape ' + numero} : ${step.title} — ${dit}`);
    btn.onclick = () => { if (opts.onNodeClick) opts.onNodeClick(i, statut); };

    const rang = document.createElement('span');
    rang.className = 'world-node-rang';
    // Un jeu ne porte pas de numéro d'étape : il n'est pas du travail, et le
    // numéroter le ferait compter dans la série.
    rang.textContent = cadeau ? '🎁' : (statut === 'done' ? '★' : String(numero));

    socle.append(btn, rang);
    node.appendChild(socle);

    // LE SCEAU QUI VA SAUTER. Quand on revient d'une étape réussie, la pastille
    // suivante est DÉJÀ ouverte dans les données — c'est justement le problème :
    // l'élève ne l'a jamais vue s'ouvrir. On repose donc un cadenas par-dessus,
    // le temps que la route se trace, et il éclate à l'arrivée. Rien du statut
    // réel n'est touché : c'est un décor, et il tombe tout seul.
    if (opts.ouverture !== undefined && i === opts.ouverture + 1
        && statut !== 'locked' && statut !== 'cadeau-ferme') {
        node.classList.add('world-node--scelle');
        const sceau = document.createElement('span');
        sceau.className = 'world-node-sceau';
        sceau.setAttribute('aria-hidden', 'true');
        sceau.textContent = '🔒';
        socle.appendChild(sceau);
    }

    // Le fanion « c'est ici » : sur une carte, l'élève doit trouver SANS
    // réfléchir l'endroit où reprendre.
    if (statut === 'current') {
        const fanion = document.createElement('span');
        fanion.className = 'world-node-ici';
        fanion.textContent = 'C\'est ici !';
        node.appendChild(fanion);
    }

    const label = document.createElement('span');
    label.className = 'world-node-label';
    label.textContent = step.title;

    const meta = document.createElement('span');
    meta.className = 'world-node-meta';
    if (cadeau) {
        // SOUS UN JEU OUVERT, TROIS MOTS. « C'est gagné : le jeu est ouvert »
        // tient sur trois lignes de 124 px, déborde de la pastille et vient
        // écrire par-dessus la rangée suivante. Le ruban et la gerbe d'étoiles
        // viennent de dire que c'était gagné : il ne reste qu'à inviter.
        // Fermé — ce que seul le professeur voit désormais —, la phrase
        // complète dit ce qu'il manque, et c'est elle qui compte.
        const jeu = opts.recompenses && opts.recompenses.get(step.stepId);
        meta.classList.add('world-node-meta--cadeau');
        meta.textContent = (statut === 'cadeau' || !jeu)
            ? 'À toi de jouer !'
            : direRecompense(jeu, opts.seuilRecompense ?? 0.75);
    } else {
        // ── ON ÉCRIT « QUESTIONS », PAS « q. » ────────────────────────────
        //
        // RÉMY : « sur le plan ca écrite 14 q. par exemple écris 14
        // questions ». L'abréviation gagnait six caractères sous une pastille
        // de 124 px — et la vue en liste, elle, écrivait « questions » en
        // entier depuis toujours : deux façons de dire la même chose dans le
        // même parcours, selon le bouton qu'on avait pressé.
        //
        // ET LA RÉUSSITE, QUAND IL Y EN A UNE. Rémy, dans la foulée : « on
        // pourrait écrire la réussite aussi non ? ». Une étape terminée ne
        // dit plus ce qu'il y AVAIT à faire — l'élève le sait, il l'a fait —
        // mais ce qu'il EN A FAIT. Le barème et le chronomètre s'effacent
        // alors : annoncer « sur 4 pts » sous une étape finie, c'est annoncer
        // une épreuve qui n'aura pas lieu.
        meta.textContent = sousLaPastille(step, opts);
    }

    node.append(label, meta);
    return node;
}

/**
 * Le sentier qui relie les pastilles. Il était dessiné en `::before` par
 * pastille : des bouts de pointillés horizontaux qui s'arrêtaient au bout de
 * chaque rangée, sans jamais rejoindre la suivante — le chemin ne menait
 * nulle part. Il est maintenant tracé d'un seul trait, en SVG, en mesurant
 * les pastilles APRÈS leur mise en page : courbes douces d'un centre à
 * l'autre, plein et doré sur la partie déjà parcourue, pointillé devant.
 */
/**
 * @param {Element} hote
 * @param {number} [ouverture] l'étape qui vient d'être réussie : le sentier se
 *   dessine alors dans son état d'AVANT, et le morceau qui s'ouvre est isolé
 *   sur son propre tracé pour qu'on puisse le faire écrire sous les yeux de
 *   l'élève. Voir ui/ouverture.js.
 */
function tracerSentier(hote, ouverture) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'path-trail');
    svg.setAttribute('aria-hidden', 'true');
    const fait = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fait.setAttribute('class', 'path-trail-fait');
    const reste = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    reste.setAttribute('class', 'path-trail-reste');
    // Le morceau qui s'ouvre : vide la plupart du temps, et par-dessus les
    // deux autres quand il sert.
    const neuf = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    neuf.setAttribute('class', 'path-trail-neuf');
    svg.append(reste, fait, neuf);
    hote.insertBefore(svg, hote.firstChild);
    // Une fois la fête finie, le sentier reprend son état définitif.
    hote.__sentierDefinitif = () => { ouverture = undefined; redessiner(); };

    const redessiner = () => {
        const cadre = hote.getBoundingClientRect();
        if (!cadre.width) return;
        svg.setAttribute('viewBox', `0 0 ${cadre.width} ${cadre.height}`);
        const noeuds = [...hote.querySelectorAll('.world-node')];
        const pts = noeuds.map(n => {
            const r = n.querySelector('.world-node-btn').getBoundingClientRect();
            return { x: r.left - cadre.left + r.width / 2, y: r.top - cadre.top + r.height / 2 };
        });
        // Jusqu'où le chemin est-il parcouru ? Jusqu'à la pastille en cours.
        let coupe = noeuds.findIndex(n => n.classList.contains('world-node--current'));
        if (coupe === -1) coupe = noeuds.every(n => n.classList.contains('world-node--done')) ? pts.length - 1 : 0;

        const milieu = cadre.width / 2;
        const trace = (de, a) => {
            if (a - de < 1) return '';
            let d = `M ${pts[de].x} ${pts[de].y}`;
            for (let i = de + 1; i <= a; i++) {
                const p = pts[i - 1], q = pts[i];
                if (noeuds[i].dataset.virage) {
                    // Changement de rangée : le sentier fait un virage bombé
                    // VERS L'EXTÉRIEUR, sinon il descend tout droit à travers
                    // le titre de l'étape qu'il vient de quitter.
                    const sens = p.x >= milieu ? 1 : -1;
                    const k = sens * Math.min(70, cadre.width * 0.09);
                    d += ` C ${p.x + k} ${p.y + (q.y - p.y) * 0.35},`
                        + ` ${q.x + k} ${q.y - (q.y - p.y) * 0.35}, ${q.x} ${q.y}`;
                } else {
                    // Courbe en S : on sort verticalement d'une pastille pour
                    // entrer verticalement dans la suivante.
                    const my = (p.y + q.y) / 2;
                    d += ` C ${p.x} ${my}, ${q.x} ${my}, ${q.x} ${q.y}`;
                }
            }
            return d;
        };
        // ÉTAT D'AVANT, le temps de la fête : le sentier s'arrête à l'étape
        // qu'on vient de finir, et le morceau qui la relie à la suivante est
        // porté à part — c'est celui qu'on va faire écrire.
        if (ouverture !== undefined && ouverture >= 0 && ouverture < pts.length - 1) {
            fait.setAttribute('d', trace(0, ouverture));
            neuf.setAttribute('d', trace(ouverture, ouverture + 1));
            reste.setAttribute('d', trace(ouverture + 1, pts.length - 1));
            return;
        }
        neuf.removeAttribute('d');
        fait.setAttribute('d', trace(0, coupe));
        reste.setAttribute('d', trace(coupe, pts.length - 1));
    };

    redessiner();
    // La mise en page n'est pas figée au moment de la construction (polices,
    // largeur du panneau) : on retrace à chaque changement de taille.
    if (typeof ResizeObserver === 'function') {
        const obs = new ResizeObserver(() => {
            if (!hote.isConnected) { obs.disconnect(); return; }
            redessiner();
        });
        obs.observe(hote);
    }
    requestAnimationFrame(redessiner);
}

/**
 * Carte des mondes : les étapes serpentent par rangées de trois, reliées par
 * un sentier continu, comme la carte d'un jeu de plateforme. Réutilisée par la
 * vue élève et par le mode présentation du professeur.
 *
 * @param {Array} steps
 * @param {Object} opts
 * @param {Set}    [opts.doneIds]      stepId terminés
 * @param {number} [opts.currentIndex] étape en cours (-1 : tout est fait)
 * @param {boolean}[opts.allUnlocked]  professeur : aucun cadenas
 * @param {(i:number, statut:string)=>void} [opts.onNodeClick]
 */
export function buildWorldMap(steps, opts = {}) {
    const map = document.createElement('div');
    map.className = 'world-map';

    const montres = etapesMontrees(steps, opts);
    const PAR_RANGEE = 3;
    for (let debut = 0; debut < montres.length; debut += PAR_RANGEE) {
        const rangee = document.createElement('div');
        const inversee = (debut / PAR_RANGEE) % 2 === 1;
        rangee.className = 'world-row' + (inversee ? ' world-row--reverse' : '');

        const paquet = montres.slice(debut, debut + PAR_RANGEE);
        paquet.forEach(({ step, i, numero }, j) => {
            const n = creerNoeud(step, i, statutEtape(step, i, opts), opts, numero);
            if (j === 0 && debut > 0) n.dataset.virage = '1';
            rangee.appendChild(n);
        });
        // Une dernière rangée incomplète était étalée par `space-around` : ses
        // pastilles glissaient au milieu du vide, et le sentier traversait la
        // carte en diagonale pour aller les chercher. Des cales invisibles
        // gardent les colonnes alignées d'une rangée à l'autre.
        for (let c = paquet.length; c < PAR_RANGEE; c++) {
            rangee.appendChild(Object.assign(document.createElement('div'), { className: 'world-cale' }));
        }

        map.appendChild(rangee);
    }
    // LE RANG DANS LA CARTE, PAS LE NUMÉRO D'ÉTAPE. Depuis que les jeux non
    // gagnés ne sont plus dessinés, les deux ont divergé : la fête se serait
    // jouée sur la mauvaise pastille. On traduit une fois, ici, là où l'on
    // sait ce qui a été posé.
    const rang = rangDansLaCarte(montres, opts.ouverture);
    map.__ouvertureRang = rang;
    tracerSentier(map, rang);
    return map;
}

/** La position d'une étape parmi celles qui ont été dessinées, ou `undefined`. */
function rangDansLaCarte(montres, indexEtape) {
    if (indexEtape === undefined || indexEtape === null) return undefined;
    const r = montres.findIndex(v => v.i === indexEtape);
    return r < 0 ? undefined : r;
}

/**
 * La carte d'un parcours, dans l'habillage choisi sur ce poste. Les trois
 * présentations sont interchangeables et prennent les mêmes options : c'est
 * le seul endroit qui sait laquelle est active.
 */
export function construireCarte(steps, opts = {}) {
    const style = opts.style || getPathStyle();
    // LA LISTE ENTIÈRE VOYAGE AVEC LES OPTIONS. `statutEtape` en a besoin pour
    // savoir ce qui barre la route : depuis que des étapes peuvent être
    // facultatives, l'ouverture d'une étape ne se lit plus sur son seul rang —
    // il faut regarder ce qui la précède. Injecté ici, donc les trois
    // habillages en héritent sans y penser.
    const o = { steps, ...opts };
    let carte;
    if (style === 'classique') carte = buildClassicTimeline(steps, o);
    else if (style === 'chemin') carte = buildDuoPath(steps, o);
    else if (style === 'damier') carte = buildDamier(steps, o);
    else if (style === 'ruban') carte = buildRuban(steps, o);
    else carte = buildWorldMap(steps, o);
    // ET LE DÉCOR PAR-DESSUS, quel que soit l'habillage : c'est tout l'intérêt
    // de l'avoir mis sur un axe à part.
    return poserLeDecor(carte, o.decor || DECOR_PAR_DEFAUT);
}

/** L'habillage du POSTE, pour qui veut le lire sans le changer. Hors séance,
 *  c'est le seul qui existe ; dans une séance, voir `styleDeLaSeance`. */
export { getPathStyle as styleDeParcours };

/**
 * Présentation classique : la liste verticale d'étapes détaillées, avec la
 * pastille d'état et le bouton « Jouer » sur l'étape en cours.
 */
export function buildClassicTimeline(steps, opts = {}) {
    const timeline = document.createElement('div');
    timeline.className = 'path-timeline';
    timeline.appendChild(Object.assign(document.createElement('div'), { className: 'path-timeline-line' }));

    etapesMontrees(steps, opts).forEach(({ step, i, numero }) => {
        const statut = statutEtape(step, i, opts);
        const cadeau = statut === 'cadeau' || statut === 'cadeau-ferme';

        const row = document.createElement('div');
        row.className = 'path-timeline-step' + (statut === 'locked' ? ' path-timeline-step--locked' : '')
            + (statut === 'cle' ? ' path-timeline-step--cle' : '')
            + (cadeau ? ' path-timeline-step--cadeau' : '');
        // UN JEU QUI VIENT D'ÊTRE GAGNÉ S'INSÈRE DANS LA LISTE. Rémy : « si
        // c'est une présentation en ligne, il faut le voir s'insérer. » La
        // ligne n'existait pas ; elle est posée à hauteur nulle, et
        // ui/ouverture.js la déplie sous les yeux de l'élève.
        if (opts.gagnes && opts.gagnes.has(step.stepId)) row.classList.add('world-node--gagne');

        const icon = document.createElement('div');
        icon.className = 'path-timeline-icon path-timeline-icon--' + (statut === 'done' ? 'done'
            : statut === 'cadeau' ? 'cadeau'
                : (statut === 'current' || statut === 'open') ? 'current' : 'locked');
        icon.textContent = cadeau ? (statut === 'cadeau' ? '🎁' : '🔒')
            : statut === 'done' ? '✓' : statut === 'locked' ? '🔒'
                : statut === 'cle' ? '🔑' : String(numero);

        const card = document.createElement('div');
        card.className = 'card card--flush' + (statut === 'current' ? ' card--current' : '');

        const title = document.createElement('div');
        title.className = 'timeline-step-title' + (statut === 'current' ? ' timeline-step-title--active' : '');
        title.textContent = step.title;
        card.appendChild(title);

        const meta = document.createElement('div');
        meta.className = 'timeline-step-meta';
        if (cadeau) {
            // Sous un jeu, ce qu'il vaut : une récompense, pas une étape de
            // plus — et donc ni compte de questions ni points.
            const jeu = opts.recompenses && opts.recompenses.get(step.stepId);
            meta.textContent = (statut === 'cadeau' || !jeu)
                ? 'Ta récompense : à toi de jouer !'
                : direRecompense(jeu, opts.seuilRecompense ?? 0.75);
        } else {
            // La même phrase que sous la pastille : deux vues du même
            // parcours ne disent pas deux choses différentes.
            meta.textContent = sousLaPastille(step, opts, { sur: true });
        }
        card.appendChild(meta);

        if (statut === 'done') {
            const st = document.createElement('div');
            st.className = 'timeline-step-status';
            st.textContent = 'Terminé !';
            card.appendChild(st);
        } else if (statut === 'current' || statut === 'open' || statut === 'cadeau'
            || statut === 'cle') {
            const btn = document.createElement('button');
            btn.className = 'btn-toggle' + (statut === 'current' ? ' active' : ' btn-toggle--sm');
            // UNE ÉTAPE SOUS CLÉ A UN BOUTON, ET IL DIT CE QU'IL FAIT. « À
            // débloquer » n'appelle aucun geste ; « Entrer la clé » dit à
            // l'élève qu'il y a quelque chose à faire, et quoi.
            btn.textContent = statut === 'cle' ? '🔑 Entrer la clé'
                : statut === 'cadeau' ? 'Jouer au jeu' : 'Jouer';
            btn.onclick = () => { if (opts.onNodeClick) opts.onNodeClick(i, statut); };
            card.appendChild(btn);
        } else {
            const st = document.createElement('div');
            st.className = 'timeline-step-status';
            st.textContent = 'À débloquer';
            card.appendChild(st);
        }

        row.append(icon, card);
        timeline.appendChild(row);
    });
    return timeline;
}

/**
 * Chemin d'étapes vertical façon Duolingo : une colonne de pastilles rondes
 * qui serpente doucement de gauche à droite, le titre posé à côté.
 */
export function buildDuoPath(steps, opts = {}) {
    const chemin = document.createElement('div');
    chemin.className = 'duo-path';

    const montres = etapesMontrees(steps, opts);
    montres.forEach(({ step, i, numero }, rang) => {
        const node = creerNoeud(step, i, statutEtape(step, i, opts), opts, numero);
        node.classList.add('duo-node');
        // Serpentin : décalage sinusoïdal autour de l'axe, en pourcentage de
        // la largeur disponible pour que la courbe tienne aussi sur un
        // téléphone (en pixels fixes, les pastilles sortaient du cadre).
        node.style.setProperty('--duo-decalage', `${(Math.sin(rang * 1.05) * 20).toFixed(1)}%`);
        chemin.appendChild(node);
    });
    chemin.__ouvertureRang = rangDansLaCarte(montres, opts.ouverture);
    tracerSentier(chemin, chemin.__ouvertureRang);
    return chemin;
}

/**
 * DAMIER : toutes les étapes d'un coup, et AUCUN sentier.
 *
 * L'absence de sentier est la décision, pas un oubli. Un trait qui relie
 * quatorze cases rangées en grille passe trois fois sur lui-même et ne décrit
 * plus de route ; ce qu'on vient chercher ici n'est pas le chemin, c'est le
 * NOMBRE — ce qui est fait, ce qui reste, en un regard. L'état de chaque case
 * se lit sur la pastille, qui le porte déjà.
 *
 * La grille se règle en CSS (`--damier-colonnes`) : trois de front sur un
 * téléphone, jusqu'à six sur un écran large, sans que ce module ait à
 * mesurer quoi que ce soit.
 */
export function buildDamier(steps, opts = {}) {
    const grille = document.createElement('div');
    grille.className = 'damier-path';
    etapesMontrees(steps, opts).forEach(({ step, i, numero }) => {
        const node = creerNoeud(step, i, statutEtape(step, i, opts), opts, numero);
        node.classList.add('damier-node');
        grille.appendChild(node);
    });
    return grille;
}

/**
 * RUBAN : une seule ligne, de gauche à droite, qui défile latéralement.
 *
 * LE SENTIER RESTE, lui, parce qu'ici il décrit vraiment la route : une ligne
 * droite d'une pastille à la suivante, qui se remplit au fur et à mesure.
 * `tracerSentier` travaille sur les positions réelles des pastilles — il n'a
 * rien à savoir du sens de lecture.
 *
 * ET L'ÉTAPE EN COURS SE RAMÈNE SOUS LES YEUX : sur un ruban, ce qui dépasse
 * à droite n'existe pas tant qu'on n'a pas poussé. Un parcours de quatorze
 * étapes s'ouvrirait sur la première alors que l'élève en est à la neuvième.
 */
export function buildRuban(steps, opts = {}) {
    const ruban = document.createElement('div');
    ruban.className = 'ruban-path';
    const piste = document.createElement('div');
    piste.className = 'ruban-piste';
    ruban.appendChild(piste);

    const montres = etapesMontrees(steps, opts);
    montres.forEach(({ step, i, numero }) => {
        const node = creerNoeud(step, i, statutEtape(step, i, opts), opts, numero);
        node.classList.add('ruban-node');
        piste.appendChild(node);
    });
    piste.__ouvertureRang = rangDansLaCarte(montres, opts.ouverture);
    tracerSentier(piste, piste.__ouvertureRang);
    // Le sentier est posé sur la PISTE, qui porte les pastilles ; c'est elle
    // qu'on retrace et qu'on mesure. Le cadre extérieur ne fait que défiler.
    ruban.__sentierDefinitif = () => piste.__sentierDefinitif && piste.__sentierDefinitif();
    requestAnimationFrame(() => {
        const cible = piste.querySelector('.world-node--current')
            || piste.querySelector('.world-node--open');
        if (cible && typeof cible.scrollIntoView === 'function') {
            cible.scrollIntoView({ block: 'nearest', inline: 'center' });
        }
    });
    return ruban;
}

// --- Parcours du professeur (sur ce poste) ----------------------------------
// Les parcours construits dans l'éditeur de CE poste sont directement jouables
// par l'élève, sans passer par un code : en classe, c'est le même appareil.

function teacherPathsSection() {
    const paths = state.teacherPaths || [];
    if (!paths.length) return null;

    // PAS CHEZ UN ÉLÈVE IDENTIFIÉ, et c'est la règle qui manquait.
    //
    // Mesuré : sur l'ordinateur de la salle, Zoé — entrée avec son billet —
    // voyait sous sa séance « Tout sur papier (127 exercices) », un BROUILLON
    // de Rémy, présenté comme « choisis-en un et lance-toi ! ». Cette section
    // existe pour une bonne raison — en classe, le professeur construit et
    // l'élève joue sur le même appareil — mais cette raison-là suppose un poste
    // SANS élève rattaché. Dès qu'un billet a été présenté, le travail vient du
    // serveur, et l'atelier du professeur ne regarde plus celui qui est assis.
    if (estRattache()) return null;

    const box = document.createElement('section');
    box.className = 'path-section';
    // « Parcours du professeur » était aussi le titre de la section du haut :
    // deux sections, le même titre, et l'une disait le contraire de l'autre.
    box.innerHTML = `
        <h2 class="path-section-title">Préparés sur cet ordinateur</h2>
        <p class="path-section-sub">Des parcours d'essai, pour s'entraîner en attendant.</p>`;

    const list = document.createElement('div');
    list.className = 'teacher-path-list';

    paths.slice(0, 8).forEach(p => {
        const normalized = normalizePath(p.data, p.name);
        if (!normalized.steps.length) return;
        const policy = resolvePolicy(normalized.policy);

        const card = document.createElement('div');
        card.className = 'card teacher-path-card';
        card.innerHTML = `
            <div class="teacher-path-info">
                <div class="teacher-path-name">${escapeHtml(p.name)}</div>
                <div class="teacher-path-sub">${normalized.steps.length} exercice${normalized.steps.length > 1 ? 's' : ''}
                    • ${isEvaluation(policy) ? 'Évaluation' : 'Entraînement'}</div>
            </div>`;

        const btn = document.createElement('button');
        btn.className = 'btn-toggle active';
        btn.textContent = 'Voir le parcours';
        btn.onclick = async () => {
            // ON MONTRE LA CARTE AVANT DE LANCER — et c'est désormais le
            // parcours lui-même qui s'en charge : il s'ouvre sur sa carte,
            // plein écran, et c'est l'élève qui donne le départ. Une fenêtre
            // d'aperçu par-dessus aurait montré deux fois la même chose.

            // UN PARCOURS LANCÉ D'ICI COMPTE, LUI AUSSI — s'il y a la place.
            //
            // Rémy : « quand j'ai fait un parcours en tant qu'élève et que je
            // l'ai fini ou non ma progression ne s'enregistre pas ». Ces
            // parcours-ci partaient sans assignation : les étapes finies
            // allaient bien au journal, mais sous un identifiant qu'aucun
            // `PATH_ASSIGNED` ne désignait. `computeAssignedPath` ne les voyait
            // donc jamais, et la carte restait vierge au lancement suivant.
            //
            // ON N'ÉCRASE PAS LE TRAVAIL DONNÉ PAR LE PROFESSEUR. C'est la
            // tablette prêtée : un élève qui essaie un parcours préparé sur le
            // poste ne doit pas perdre le devoir qu'on lui a assigné. On
            // n'adopte donc ce parcours que si la place est libre — sinon on le
            // joue quand même, exactement comme avant.
            if (!state.studentPath) {
                state.setStudentPath(normalized.steps, {
                    pathId: normalized.id,
                    name: normalized.name || p.name,
                    policy: resolvePolicy(normalized.policy)
                });
            }
            const { Runner } = await import('../core/runner.js');
            new Runner({
                path: normalized,
                deviceMode: 'none',
                isStudentPath: state.studentPath
                    && state.studentPath.pathId === normalized.id
            }).start();
        };
        card.appendChild(btn);
        list.appendChild(card);
    });

    if (!list.children.length) return null;
    box.appendChild(list);
    return box;
}

// --- 2. Séance conseillée ---------------------------------------------------

/**
 * CE QUE LE LOGICIEL CONSEILLE — et qui n'est PAS une séance.
 *
 * LE MOT « SÉANCE » APPARTIENT AU PROFESSEUR, et à lui seul. Cette section
 * s'appelait « Ta séance du jour » ; l'accueil du catalogue appelle « Ta séance
 * du jour » le travail RÉELLEMENT donné par le professeur. Deux écrans, le même
 * titre, deux choses différentes — et sur celui-ci, c'est celle que le
 * professeur n'a PAS donnée qui portait le plus gros bouton.
 *
 * Rémy lui-même a demandé, après des semaines sur ce logiciel : « une séance
 * c'est un direct c'est cela ? » Si le vocabulaire fait hésiter celui qui l'a
 * fabriqué, un élève de cinquième n'a aucune chance.
 *
 * LE LEXIQUE TENU PARTOUT, désormais, est de trois mots :
 *   · un EXERCICE — ce qu'on ouvre et qu'on fait ;
 *   · un PARCOURS — une suite d'exercices, l'objet que le professeur fabrique ;
 *   · une SÉANCE — un parcours DONNÉ à une classe, à une date, avec ses trois
 *     états (à venir, en cours, close).
 * « Activité », « travail » et « étape » ne sont plus du vocabulaire élève.
 *
 * ET ON NE CONSEILLE RIEN À QUI N'A RIEN FAIT. « Choisie d'après tes
 * résultats » posée devant un élève qui n'a aucun résultat est une phrase
 * fausse, et elle mangeait la moitié de sa page le jour de la rentrée.
 */
function recommendedSection() {
    const box = document.createElement('section');
    box.className = 'path-section';

    // Sans une seule tentative au journal, il n'y a rien à conseiller : on se
    // tait plutôt que d'inventer trois conseils et de les dire mérités.
    const aTravaille = (state.attemptHistory || []).length > 0;
    const recos = aTravaille ? buildRecommendedPreview(3) : [];
    // On rend `null` et non une section vide : une section vide garde sa marge
    // et laisse un trou dans la page, ce qui se lit comme un défaut d'affichage.
    if (!recos.length) return null;

    box.innerHTML = `
        <h2 class="path-section-title">Ce que je te conseille</h2>
        <p class="path-section-sub">D'après ce que tu as déjà fait : ce qui est à revoir passe avant ce qui est nouveau.</p>`;

    const list = document.createElement('div');
    list.className = 'reco-list';

    recos.forEach(r => {
        const card = document.createElement('div');
        card.className = `card reco-card reco-card--${r.reason}`;
        const exo = getExerciseById(r.exerciseId);

        const label = document.createElement('div');
        label.className = 'reco-label';
        label.textContent = r.label;

        const motif = document.createElement('span');
        motif.className = `reco-badge reco-badge--${r.reason}`;
        motif.textContent = r.motif;

        const sub = document.createElement('div');
        sub.className = 'reco-sub';
        sub.textContent = exo ? exo.title : '';

        const btn = document.createElement('button');
        btn.className = 'btn-toggle btn-toggle--sm';
        btn.textContent = 'Travailler';
        btn.onclick = () => startSkillSession(r.skillId);

        card.append(motif, label, sub, btn);
        list.appendChild(card);
    });

    box.appendChild(list);

    const all = document.createElement('button');
    all.className = 'btn-toggle active reco-start-all';
    // « Séance » est le mot du professeur : ce bouton lance TROIS EXERCICES que
    // le logiciel propose, ce qui n'est pas la même chose et ne doit pas porter
    // le même nom.
    all.textContent = `Faire les ${recos.length} exercices`;
    // ON LUI DONNE LA LISTE QU'ON VIENT D'AFFICHER, et non le nombre 3.
    // L'étiquette comptait `recos.length` pendant que le clic en demandait
    // trois : deux listes recalculées séparément, qui n'ont aucune raison de
    // coïncider quand une notion recommandée n'a pas d'exercice —
    // `buildRecommendedPreview` l'écarte, `getRecommendations` non. Le bouton
    // annonçait alors deux exercices et en lançait d'autres.
    all.onclick = () => startRecommendedSession(recos);
    box.appendChild(all);

    return box;
}

// --- 3. Dernier bilan -------------------------------------------------------

function lastResultSection() {
    const run = computeRuns(journal.all()).find(r => r.finishedAt && !r.aborted && r.attempts.length);
    if (!run) return null;

    const bilan = gradeRun(run);
    const box = document.createElement('section');
    box.className = 'path-section';

    const value = bilan.note !== null
        ? `${formatNote(bilan.note)}/${bilan.sur}`
        : `${Math.round(bilan.ratio * 100)} %`;

    box.innerHTML = `
        <h2 class="path-section-title">Ton dernier résultat</h2>
        <div class="card last-run-card">
            <div class="last-run-value">${value}</div>
            <div class="last-run-info">
                <div class="last-run-name">${escapeHtml(bilan.pathName || 'Entraînement libre')}</div>
                <div class="last-run-sub">${bilan.totalReussies}/${bilan.totalQuestions} questions •
                    ${formatDuration(bilan.tempsTotal)} • ${new Date(run.finishedAt).toLocaleDateString()}</div>
            </div>
        </div>`;

    const btn = document.createElement('button');
    btn.className = 'btn-toggle btn-toggle--sm';
    btn.textContent = 'Revoir le détail';
    btn.onclick = () => import('./reportUI.js').then(m => m.showRunReport(bilan, {}));
    box.querySelector('.last-run-card').appendChild(btn);

    return box;
}

function formatNote(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

document.addEventListener('studentPath_updated', renderStudentPathView);
// LA SÉANCE ARRIVE PAR LA SYNCHRONISATION, à n'importe quel moment. Sans cette
// ligne, l'élève déjà posé sur cet écran continuait de lire « ton professeur ne
// t'a rien donné » jusqu'au prochain rechargement de la page.
document.addEventListener('seances_updated', () => {
    const view = document.getElementById('view-path');
    if (view && view.style.display !== 'none') renderStudentPathView();
});
document.addEventListener('attempts_updated', () => {
    const view = document.getElementById('view-path');
    if (view && view.style.display !== 'none') renderStudentPathView();
});
