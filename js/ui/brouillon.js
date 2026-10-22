// LE BROUILLON — poser, noter, dessiner. Et rien n'en sort.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Dans le menu à côté du robot, avoir un mode brouillon pour poser son
// calcul. On peut poser une opération (tu as déjà des modules, il faut t'en
// servir), mettre des notes. Dessiner en suivant les carreaux au crayon libre
// (et une grille aimanté) ».
//
// CE QUE ÇA RÉPARE. Devant une soustraction posée, l'élève n'avait aucune
// surface pour chercher : il calculait de tête — et l'on mesurait alors un
// calcul mental qu'on n'avait pas l'intention d'évaluer — ou il prenait une
// feuille à côté du clavier, ce qui va en classe et ne va pas chez lui.
//
// ── LES QUATRE ARBITRAGES DE RÉMY, QUI SONT LA MOITIÉ DE CE FICHIER ────────
//
//   1. « pas de persistance » — la page blanche revient à chaque question ;
//   2. le professeur ne le voit pas ;
//   3. « Poser » s'éteint par exercice, comme la calculatrice ;
//   4. le crayon libre reste.
//
// LES TROIS PREMIERS SE RENFORCENT, ET ILS SIMPLIFIENT TOUT : rien n'est gardé,
// rien n'est regardé, rien n'est envoyé. Ce module ne touche donc AUCUNE des
// trois façons de faire durer quelque chose ici. Il vit dans la mémoire de
// cette page, le temps d'une question. C'est la seule pièce du logiciel dont on
// puisse le dire, et c'est ce qui la met hors de portée de la ligne rouge :
//
//   « Je ne veux pas de construction géométrique avec des outils virtuels.
//     Rien ne remplace le geste. »  (docs/architecture.md §0)
//
// Une grille aimantée est à un pas de l'outil interdit. Ce qui nous garde du
// bon côté n'est pas technique, c'est une règle sur la SURFACE : le brouillon
// sert à PENSER, jamais à RÉPONDRE. D'où, littéralement : aucun bouton qui
// soumette quoi que ce soit, et aucune activité n'importe ce fichier.
//
// ── ET LA GRILLE NE CALCULE RIEN ───────────────────────────────────────────
//
// C'est la correction que la maquette a values : elle montrait la soustraction
// POSÉE ET FAITE, résultat et retenues compris. Une grille qui calcule n'est
// pas un brouillon, c'est une calculatrice — et la calculatrice existe déjà,
// derrière son propre réglage. Rémy a écrit « poser SON calcul » : on donne le
// cadre aux bonnes colonnes, l'élève fait l'arithmétique.
//
// Ce fichier n'additionne, ne soustrait, ne multiplie et ne divise NULLE PART.
// Il ne demande au noyau que les RANGS — quelles colonnes, et où tombe la
// virgule (`etendue`, core/poser.js) — et laisse toutes les cases vides.
//
// ── DEUXIÈME PASSE, APRÈS L'AVOIR ESSAYÉ ───────────────────────────────────
//
// RÉMY : « pour les chiffres des opérations du brouillon, il faudrait pouvoir
// les taper, tu oublies les retenues et il y a deux méthodes pour les
// soustractions et les chiffres je préfère du drag drop en supplément du clic
// pour le nombres. Pour le calcul, l'élève tape son calcul (une addition peut
// avoir plusieurs membres) et on peut avoir plusieurs calculs dans le
// brouillon ».
//
// Cinq demandes, et la dernière renverse la table : on ne choisit plus une
// opération dans un menu avec deux champs, on ÉCRIT son calcul — « 12 + 34 + 5 »
// — et le cadre se pose dessous. Plusieurs calculs tiennent sur la feuille,
// comme sur une vraie page de brouillon.

import { etendue, poser } from '../core/poser.js';
import { nomRang } from '../core/virgule.js';
import { rendreGlissable, CSS_GLISSER } from '../core/glisserDeposer.js';

/** Les trois outils, dans l'ordre où ils se présentent. */
export const OUTILS = ['poser', 'noter', 'dessiner'];

/** Les quatre opérations, et le mot qu'on lit sur la touche. */
const SIGNES = { '+': '+', '-': '−', '×': '×', '÷': '÷' };

/**
 * LA FEUILLE À PETITS CARREAUX, en coordonnées du dessin.
 *
 * 32 px par carreau : c'est gros pour un écran, et c'est voulu — un nœud de
 * quadrillage doit se viser au doigt, et un carreau de 8 px rendrait
 * l'aimantation plus énervante qu'utile.
 */
const CARREAU = 32;
const CARREAUX_L = 10;
const CARREAUX_H = 8;

// ── L'ÉTAT, ET RIEN QUE LUI ────────────────────────────────────────────────
//
// Un objet de module, jamais un stockage. `oublierLeBrouillon()` le remet à
// neuf, et c'est tout ce que « pas de persistance » demande.

const vierge = () => ({
    pave: true,       // le pavé de chiffres est-il déplié ?
    saisie: '',       // la ligne qu'il est en train d'écrire
    dit: '',          // ce qu'on lui répond quand elle ne se lit pas
    calculs: [],      // les opérations posées, dans l'ordre où il les a posées
    active: null,     // { c: <id du calcul>, k: <clé de case> }
    note: '',
    crayon: 'aimante',
    // ── L'HISTOIRE DU DESSIN ───────────────────────────────────────────────
    //
    // RÉMY : « pour le dessiner autorise le undo redo ».
    //
    // ON GARDE DES ÉTATS, PAS DES GESTES. Une pile de traits qu'on dépile
    // saurait défaire un trait, mais pas un « Gommer » — et c'est précisément
    // l'effacement qu'on regrette. Une suite d'états rend les deux au même
    // prix : trois traits sur une feuille pèsent quelques centaines d'octets,
    // et tout cela meurt avec la question.
    traits: [],       // chaque trait : { aimante, points: [{x, y}] }
    histoire: [[]],
    rang: 0
});

let etat = vierge();
let outil = 'poser';
let poserPermis = true;
let feuille = null;
let ouverte = false;
let enTrain = null;   // le trait qu'on est en train de dessiner
let compteur = 0;

// ── LE RÉGLAGE PAR EXERCICE ────────────────────────────────────────────────

/**
 * CET EXERCICE-LÀ OFFRE-T-IL « POSER » ?
 *
 * RÉMY, à la question « “Poser” éteint par exercice ? » : « ok ».
 *
 * LA RÈGLE SE LIT DANS LE CATALOGUE, ET ELLE EXISTAIT DÉJÀ. Sur les trente
 * exercices rangés sous « Calcul mental », poser l'opération en colonnes est
 * précisément ce qu'on demande de NE PAS faire : les « Additions Mystères »,
 * les « Soustractions Éclair », « Flash Mult » mesurent une réponse trouvée de
 * tête. Le tag dit déjà lesquels — on ne tient donc aucune liste à la main, et
 * un exercice de calcul mental ajouté demain sera couvert sans qu'on y pense.
 *
 * ET `poserAuBrouillon` TRANCHE QUAND LE TAG NE SUFFIT PAS. « Poser une
 * opération » n'est pas du calcul mental, mais la grille du brouillon y SERAIT
 * l'exercice : il l'éteint explicitement. C'est la même mécanique que
 * `calculatrice: true` (voir ui/calculatrice.js), pour la même raison — « sur
 * un exercice de tables de multiplication, elle rendrait l'exercice inutile ».
 *
 * @param {Object|null} exo
 * @returns {boolean}
 */
export function poserOffert(exo) {
    if (!exo) return false;
    if (exo.poserAuBrouillon !== undefined) return exo.poserAuBrouillon !== false;
    const chemin = (exo.tags && exo.tags.chemin) || [];
    return !chemin.some(t => String(t).toLowerCase() === 'calcul mental');
}

/**
 * Le bouton existe-t-il, et « Poser » est-il offert ?
 *
 * LE BOUTON, LUI, NE DÉPEND PAS DE L'EXERCICE : une note et un gribouillage ne
 * trichent jamais, quel que soit l'exercice. Seul « Poser » s'éteint.
 */
export function reglerBrouillon(exo) {
    poserPermis = poserOffert(exo);
    document.querySelectorAll('[data-brouillon]').forEach(b => { b.hidden = !exo; });
    // ON CHANGE D'EXERCICE : la feuille repart blanche. `oublierLeBrouillon`
    // ne couvre que le passage d'une question à la suivante À L'INTÉRIEUR
    // d'une étape (`signalerNouvelleQuestion`, core/runner.js) ; sans cette
    // ligne, la première question de l'exercice suivant retrouverait les trois
    // lignes écrites sous le précédent.
    etat = vierge();
    enTrain = null;
    // ET LA FEUILLE SE REFERME. MESURÉ (`tools/leBrouillon.mjs`) : laissée
    // ouverte, elle accueillait l'exercice SUIVANT en lui couvrant les deux
    // tiers de l'écran — l'élève arrivait sur une feuille blanche avant
    // d'avoir lu la question. On ouvre son brouillon quand on en a besoin ;
    // ce n'est pas un état dans lequel on entre.
    fermerBrouillon();
    if (!exo) return;
    outil = poserPermis ? 'poser' : 'noter';
}

/**
 * LA PAGE BLANCHE REVIENT À CHAQUE QUESTION.
 *
 * RÉMY : « pas de persistance ». Le meneur appelle ceci au même endroit qu'il
 * dit à la calculatrice d'oublier son calcul (`signalerNouvelleQuestion`,
 * core/runner.js) : un brouillon qui survit à sa question est un piège, pas un
 * service — on relit trois lignes qui parlaient d'autre chose.
 *
 * FERMER N'EST PAS EFFACER : tant qu'on reste sur la même question, on peut
 * refermer la feuille pour relire l'énoncé et la rouvrir intacte.
 */
export function oublierLeBrouillon() {
    etat = vierge();
    enTrain = null;
    if (ouverte) dessiner();
}

export const brouillonOuvert = () => ouverte;

export function basculerBrouillon() {
    if (ouverte) fermerBrouillon(); else ouvrirBrouillon();
}

export function ouvrirBrouillon() {
    if (!feuille) monter();
    ouverte = true;
    feuille.hidden = false;
    // LA COUCHE DE JEU LUI FAIT SA PLACE sur un écran large (voir css/ui.css) :
    // le volet décale l'exercice au lieu de le recouvrir. Au doigt, la classe
    // ne change rien — la feuille monte du bas, sous l'énoncé.
    const couche = document.getElementById('game-layer');
    if (couche) couche.classList.add('br-ouvert');
    dessiner();
    majBouton();
}

export function fermerBrouillon() {
    ouverte = false;
    if (feuille) feuille.hidden = true;
    const couche = document.getElementById('game-layer');
    if (couche) couche.classList.remove('br-ouvert');
    majBouton();
}

function majBouton() {
    document.querySelectorAll('[data-brouillon]').forEach(b => {
        b.setAttribute('aria-pressed', String(ouverte));
        b.classList.toggle('active', ouverte);
    });
}

// ── LA FEUILLE ─────────────────────────────────────────────────────────────

/**
 * ELLE VIT DANS LA COUCHE DE JEU, et non dans la page.
 *
 * Deux raisons, et la seconde a déjà coûté une fois : la couche est à
 * `z-index: 10000`, donc la feuille passe au-dessus de l'exercice sans qu'on
 * ait à inventer un étage ; et quand le meneur cache la couche, la feuille
 * s'en va avec, sans qu'un module ait à s'en souvenir.
 */
function monter() {
    const couche = document.getElementById('game-layer') || document.body;
    feuille = document.createElement('div');
    feuille.id = 'brouillon';
    feuille.className = 'br-feuille';
    feuille.hidden = true;
    couche.appendChild(feuille);

    // LA FEUILLE DE STYLE DU GLISSÉ EST CELLE DE TOUT LE MONDE : le fantôme
    // qui suit le doigt, la cible qui s'allume. Elle s'injecte une fois.
    if (!document.getElementById('br-css-glisser')) {
        const style = document.createElement('style');
        style.id = 'br-css-glisser';
        style.textContent = CSS_GLISSER;
        document.head.appendChild(style);
    }

    // UN SEUL ÉCOUTEUR POUR TOUTE LA FEUILLE : elle se redessine souvent, et
    // des écouteurs reposés à chaque dessin finissent par s'empiler.
    feuille.addEventListener('click', surClic);
    feuille.addEventListener('input', surSaisie);
    feuille.addEventListener('keydown', surTouche);
    feuille.addEventListener('focusin', surFoyer);
}

function dessiner() {
    if (!feuille) return;
    feuille.innerHTML = `
        <div class="br-poignee" aria-hidden="true"></div>
        <div class="br-tete">
            <span class="br-titre">Mon brouillon</span>
            <button type="button" class="br-effacer" data-br-effacer>Tout effacer</button>
            <button type="button" class="br-fermer" data-br-fermer aria-label="Fermer le brouillon">✕</button>
        </div>
        <div class="br-onglets" role="tablist" aria-label="Les outils du brouillon">
            ${ongletHtml('poser', 'Poser')}
            ${ongletHtml('noter', 'Noter')}
            ${ongletHtml('dessiner', 'Dessiner')}
        </div>
        <div class="br-corps">${corpsHtml()}</div>
        <p class="br-mot">Ton brouillon ne part nulle part&nbsp;: il n'est ni envoyé, ni
           corrigé, ni noté — et la page blanche revient à chaque question.</p>`;
    if (outil === 'dessiner') brancherLeCrayon();
    if (outil === 'poser') brancherLeGlisse();
}

function ongletHtml(cle, mot) {
    // « POSER » DISPARAÎT QUAND IL N'EST PAS OFFERT, il ne se grise pas : un
    // bouton éteint qu'on voit est un bouton qu'on essaie, puis dont on se
    // demande ce qu'on a mal fait.
    if (cle === 'poser' && !poserPermis) return '';
    const actif = outil === cle;
    return `<button type="button" role="tab" aria-selected="${actif}"
        class="br-onglet${actif ? ' br-onglet--actif' : ''}" data-br-outil="${cle}">${mot}</button>`;
}

function corpsHtml() {
    if (outil === 'noter') return noterHtml();
    if (outil === 'dessiner') return dessinerHtml();
    return poserHtml();
}

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── LIRE LE CALCUL QU'IL A ÉCRIT ───────────────────────────────────────────

/**
 * « 12 + 34 + 5 » → une opération à poser, ou un refus qui dit pourquoi.
 *
 * RÉMY : « l'élève tape son calcul (une addition peut avoir plusieurs
 * membres) ». D'où une lecture, et non un menu : on est large sur la FORME —
 * `x` et `*` pour une multiplication, `:` et `/` pour une division, la virgule
 * ou le point pour les décimaux — et stricte sur le FOND.
 *
 * DEUX REFUS, ET CHACUN DIT CE QU'IL FAUT FAIRE :
 *
 *   · ON NE MÉLANGE PAS LES SIGNES. « 3 + 4 × 5 » ne se pose pas en colonnes —
 *     c'est un calcul à priorités, et le poser reviendrait à inventer un ordre
 *     que l'élève n'a pas écrit ;
 *   · SEULE L'ADDITION ACCEPTE PLUS DE DEUX MEMBRES. On n'aligne pas trois
 *     nombres sous une barre de soustraction : « 20 − 5 − 3 » se pose en deux
 *     opérations, et c'est précisément ce que la feuille permet maintenant.
 *
 * @param {string} texte
 * @returns {{op:string, nombres:number[]}|{erreur:string}}
 */
export function lireLeCalcul(texte) {
    const t = String(texte == null ? '' : texte)
        .replace(/[  \s]/g, '')
        .replace(/[x*]/gi, '×')
        .replace(/[:/]/g, '÷')
        .replace(/[−–]/g, '-');
    if (!t) return { erreur: '' };
    if (!/^\d/.test(t)) return { erreur: 'Un calcul commence par un nombre.' };

    const morceaux = t.split(/([+\-×÷])/);
    const nombres = [];
    const signes = [];
    for (let i = 0; i < morceaux.length; i++) {
        const m = morceaux[i];
        if (i % 2 === 0) {
            if (!/^\d+([.,]\d+)?$/.test(m)) {
                return { erreur: 'Je ne reconnais pas ce calcul. Un exemple : 12 + 34 + 5' };
            }
            nombres.push(Number(m.replace(',', '.')));
        } else signes.push(m);
    }
    if (!signes.length) return { erreur: 'Il manque un signe : + − × ou ÷' };
    if (new Set(signes).size > 1) {
        return { erreur: 'Une opération posée ne mélange pas les signes. '
            + 'Pose-les l\'une après l\'autre.' };
    }
    const op = signes[0];
    if (op !== '+' && nombres.length > 2) {
        return { erreur: `On ne pose que deux nombres à la fois avec ${SIGNES[op]}. `
            + 'Seule l\'addition en accepte plusieurs.' };
    }
    return { op, nombres };
}

// ── VÉRIFIER, SANS JAMAIS DONNER LA RÉPONSE ────────────────────────────────

/**
 * RÉMY : « tu peux rajouter un option vérifier aussi mais qui ne donne jamais
 * la réponse et indique l'erreur ».
 *
 * ── LA RÈGLE CHANGE DE FORME, PAS DE SENS ──────────────────────────────────
 *
 * On disait « le brouillon ne calcule pas ». La règle exacte était : il ne
 * calcule pas À LA PLACE DE L'ÉLÈVE. Vérifier demande évidemment de calculer —
 * ce qui est interdit est d'en DIRE le résultat. D'où la forme de ce qui sort
 * d'ici : des CLÉS DE CASES et un nom de colonne. Jamais un chiffre. Une
 * épreuve garde que l'objet rendu ne porte aucune valeur attendue.
 *
 * ── ON NE MONTRE QUE LA PREMIÈRE COLONNE FAUTIVE ───────────────────────────
 *
 * En partant de la droite, c'est-à-dire dans l'ordre où l'on calcule. Trois
 * raisons, et la troisième n'est pas la moindre :
 *
 *   · c'est ce qu'un professeur dit — « reprends ta colonne des unités » ;
 *   · une erreur de retenue FABRIQUE les erreurs des colonnes suivantes :
 *     toutes les signaler ferait croire à cinq fautes là où il y en a une ;
 *   · et cela limite ce qu'on peut tirer du bouton. Marquer d'un coup toutes
 *     les cases fausses invite à essayer les dix chiffres jusqu'au vert ;
 *     colonne par colonne, il faut avoir refait le calcul pour avancer. Ce
 *     n'est pas une serrure — rien ici n'en est une —, c'est le même choix
 *     qu'au tableau : on montre OÙ, on ne dit pas QUOI.
 *
 * ── CE QU'ON NE REPROCHE PAS ───────────────────────────────────────────────
 *
 * Une case vide n'est pas une faute : c'est un travail en cours. On ne juge
 * que ce qui est écrit, et l'on dit « il reste des cases » quand tout le reste
 * est juste — un brouillon qu'on gronde parce qu'il n'est pas fini est un
 * brouillon qu'on n'ouvre plus.
 *
 * @param {Object} c - un calcul posé de la feuille
 * @returns {{etat:string, dit:string, fautes:string[]}}
 */
export function verifierLaPose(c) {
    const ecrites = Object.keys(c.cases).filter(k => String(c.cases[k]).trim() !== '');
    if (!ecrites.length) {
        return { etat: 'vide', fautes: [],
            dit: 'Écris d\'abord quelque chose : je ne vérifie que ce que tu as posé.' };
    }

    let tableau = null;
    try {
        tableau = poser(c.op, c.nombres, { methode: c.methode });
    } catch (e) {
        // 27 − 52 ne se pose pas : le noyau le refuse, et il a raison. Ce
        // n'est pas une faute de l'élève, c'est un calcul qu'on n'écrit pas
        // en colonnes à ce niveau-là.
        return { etat: 'impossible', fautes: [],
            dit: 'Cette opération-là ne se pose pas en colonnes.' };
    }

    const attendu = casesAttendues(c, tableau);
    if (!attendu) {
        return { etat: 'impossible', fautes: [],
            dit: 'Je sais vérifier les additions et les soustractions posées, '
                + 'et le résultat des autres.' };
    }

    // DU RANG LE PLUS FAIBLE AU PLUS FORT : l'ordre de l'algorithme.
    const rangs = [...new Set(Object.keys(attendu).map(k => Number(k.slice(1))))]
        .sort((a, b) => a - b);
    for (const rang of rangs) {
        const ici = Object.keys(attendu).filter(k => Number(k.slice(1)) === rang);
        const fautes = ici.filter(k => {
            const mis = c.cases[k];
            if (mis === undefined || String(mis).trim() === '') return false;
            return String(mis) !== String(attendu[k]);
        });
        if (fautes.length) {
            return { etat: 'faux', fautes,
                dit: `Reprends la colonne des ${nomRang(rang)}.` };
        }
    }

    // UNE CASE QUI DOIT RESTER VIDE N'EST PAS UNE CASE QUI MANQUE. La colonne
    // de réserve, à gauche, n'est remplie que si le résultat va jusque-là :
    // sans cette ligne, une addition parfaitement juste s'entendait répondre
    // « il reste des cases à remplir », et l'on cherchait laquelle.
    const manque = Object.keys(attendu).some(k => {
        if (String(attendu[k]) === '') return false;
        const mis = c.cases[k];
        return mis === undefined || String(mis).trim() === '';
    });
    return manque
        ? { etat: 'incomplet', fautes: [],
            dit: 'Tout ce que tu as écrit est juste. Il reste des cases à remplir.' }
        : { etat: 'juste', fautes: [], dit: 'Ton opération est juste.' };
}

/**
 * CE QU'IL FAUDRAIT TROUVER DANS CHAQUE CASE — et ce tableau-là ne sort jamais
 * de ce module.
 *
 * On ne décrit que les cases dont le SENS est sans ambiguïté : le résultat, et
 * les retenues de chaque méthode. Les produits partiels d'une multiplication
 * et les descentes d'une division s'écrivent de plusieurs façons également
 * correctes — les juger reviendrait à imposer une mise en page.
 */
function casesAttendues(c, tableau) {
    const out = {};
    const chiffresDu = (v, rangs) => {
        rangs.forEach(r => { out[`t${r}`] = chiffre(v, r); });
    };
    const rangs = rangsDuCadre(c.nombres);

    if (c.op === '+') {
        chiffresDu(tableau.resultat, rangs);
        tableau.colonnes.forEach(col => {
            if (col.retenueEntrante) out[`r${col.rang}`] = String(col.retenueEntrante);
        });
        return out;
    }
    if (c.op === '-') {
        chiffresDu(tableau.resultat, rangs);
        tableau.colonnes.forEach(col => {
            if (c.methode === 'emprunt') {
                if (col.hautCorrige !== null && col.hautCorrige !== undefined) {
                    out[`e${col.rang}`] = String(col.hautCorrige);
                }
            } else {
                if (col.retenueHaut) out[`m${col.rang}`] = String(col.retenueHaut);
                if (col.retenueBas) out[`b${col.rang}`] = String(col.retenueBas);
            }
        });
        return out;
    }
    // LA MULTIPLICATION ET LA DIVISION : seul le résultat se juge.
    const valeur = c.op === '×' ? tableau.resultat : tableau.quotient;
    if (valeur === undefined) return null;
    if (c.op === '÷') return null;   // la potence s'écrit de trop de façons
    chiffresDu(valeur, rangs);
    return out;
}

// ── POSER ──────────────────────────────────────────────────────────────────

function poserHtml() {
    return `
        <div class="br-saisie-ligne">
            <input type="text" class="br-saisie" data-br-saisie inputmode="text"
                   value="${esc(etat.saisie)}" aria-label="Écris ton calcul"
                   placeholder="Écris ton calcul : 12 + 34 + 5">
            <button type="button" class="br-poser" data-br-poser>Poser</button>
        </div>
        ${etat.dit ? `<p class="br-dit br-dit--refus">${esc(etat.dit)}</p>` : ''}
        ${etat.calculs.length
            ? etat.calculs.map(calculHtml).join('')
            : '<p class="br-vide">Écris ton calcul là-haut, et le cadre se pose tout seul,'
              + ' aux bonnes colonnes. Le calcul, lui, reste à faire. Tu peux en poser'
              + ' plusieurs les uns sous les autres.</p>'}
        ${paveHtml()}`;
}

/** Les rangs du cadre — demandés au noyau, qui range des colonnes. */
function rangsDuCadre(nombres) {
    const e = etendue(nombres, nombres[0]);
    // UNE COLONNE DE PLUS À GAUCHE : c'est la place que le résultat peut
    // demander (998 + 7 tient sur quatre colonnes), et elle est ajoutée SANS
    // regarder le résultat, donc sans rien en dire.
    return [e.haut + 1, ...e.rangs];
}

/** Le chiffre d'un nombre à un rang donné, ou '' — de la lecture, pas du calcul. */
function chiffre(v, rang) {
    const s = String(v);
    const [ent, dec = ''] = s.split('.');
    if (rang >= 0) {
        const i = ent.length - 1 - rang;
        return i >= 0 && i < ent.length ? ent[i] : '';
    }
    const j = -rang - 1;
    return j < dec.length ? dec[j] : '';
}

const estActive = (c, k) => !!etat.active && etat.active.c === c.id && etat.active.k === k;

/** Une case qu'on remplit : on la touche, on y glisse un chiffre, on la tape. */
function caseHtml(c, cle, classe = '') {
    const v = c.cases[cle] || '';
    return `<span class="br-case ${classe}${estActive(c, cle) ? ' br-case--active' : ''}${
        (c.fautes || []).includes(cle) ? ' br-case--faux' : ''}"
        data-br-case="${esc(cle)}" data-br-c="${esc(c.id)}" tabindex="0" role="button"
        aria-label="Case ${esc(cle)}">${esc(v)}</span>`;
}

/** Une case donnée par l'énoncé : elle se lit, elle ne se touche pas. */
function donneeHtml(texte, classe = '') {
    return `<span class="br-case br-case--donnee ${classe}">${esc(texte)}</span>`;
}

/**
 * LES RETENUES ÉTAIENT OUBLIÉES, ET C'EST LE PREMIER REPROCHE DE RÉMY.
 *
 * ── OÙ ELLES SE POSENT, ET POURQUOI PAS TOUJOURS AU MÊME ENDROIT ───────────
 *
 * À L'ADDITION ET À LA MULTIPLICATION, EN HAUT : la retenue s'ajoute aux
 * chiffres du dessus, et c'est là qu'on l'écrit au tableau.
 *
 * À LA SOUSTRACTION, ÇA DÉPEND DE LA MÉTHODE — et il y en a deux, enseignées
 * toutes les deux en France. Rémy, en septembre déjà : « j'ai des élèves qui
 * font une autre méthode où pour 53 − 17, il mette le 1 à 3 et au lieu du 5,
 * il barre et mette 4 ».
 *
 *   · PAR COMPENSATION : on ajoute dix en haut et un en bas. Deux petites
 *     marques DEVANT les chiffres, l'une sur la ligne du haut, l'autre sur
 *     celle du bas, décalées d'une colonne.
 *   · PAR EMPRUNT : on barre le chiffre du haut et l'on écrit sa nouvelle
 *     valeur AU-DESSUS. Écrire dans la case du dessus barre donc celle du
 *     dessous — c'est le geste même, et il ne demande aucun bouton.
 *
 * ── ET LA COLONNE DES UNITÉS N'EN PORTE JAMAIS ─────────────────────────────
 *
 * La règle vient du noyau (`porteUneRetenue`, core/poser.js), et Rémy l'avait
 * signalée sur 554 + 448 : « normalement, il ne devrait pas pour l'addition
 * avoir une retenue sur la première colonne non ? » Non : la retenue d'une
 * colonne VIENT de la colonne à sa droite, et la colonne des unités n'a rien à
 * sa droite. Symétriquement, la colonne de gauche n'a personne à qui emprunter.
 *
 * ON NE DIT PAS LESQUELLES EN PORTENT VRAIMENT : ce serait répondre. Toutes
 * les colonnes qui PEUVENT en porter ont leur case, vide.
 */
function retenuesHtml(c, rangs) {
    const sansLaDerniere = rangs.slice(0, -1);
    return `<div class="br-ligne br-ligne--retenues"><span class="br-signe"></span>${
        sansLaDerniere.map(r => caseHtml(c, `r${r}`, 'br-case--petite')).join('')
    }<span class="br-case br-case--fantome"></span></div>`;
}

function calculHtml(c) {
    const rangs = rangsDuCadre(c.nombres);
    const virgule = (r) => (r === 0 && rangs.some(x => x < 0) ? ' br-case--virgule' : '');
    const ligneDonnee = (v, signe, classes) => `<div class="br-ligne">
        <span class="br-signe">${signe}</span>${
        rangs.map(r => donneeHtml(chiffre(v, r), (classes ? classes(r) : '') + virgule(r))).join('')}</div>`;

    let dedans = '';
    if (c.op === '÷') {
        dedans = potenceHtml(c);
    } else if (c.op === '-' && c.methode === 'emprunt') {
        // L'EMPRUNT : une rangée au-dessus du premier nombre, et le chiffre
        // barré dès qu'on écrit au-dessus de lui.
        dedans = `<div class="br-ligne br-ligne--retenues"><span class="br-signe"></span>${
            rangs.slice(0, -1).map((r, i) => caseHtml(c, `e${rangs[i + 1]}`, 'br-case--petite')).join('')
        }<span class="br-case br-case--fantome"></span></div>`
            + ligneDonnee(c.nombres[0], '', (r) => (c.cases[`e${r}`] ? ' br-case--barree' : ''))
            + ligneDonnee(c.nombres[1], SIGNES['-'])
            + '<div class="br-barre"></div>'
            + `<div class="br-ligne"><span class="br-signe"></span>${
                rangs.map(r => caseHtml(c, `t${r}`, virgule(r))).join('')}</div>`;
    } else if (c.op === '-') {
        // LA COMPENSATION : dix devant le chiffre du haut, un devant celui du
        // bas de la colonne suivante.
        const marques = (prefixe, saufDerniere) => (r, i) => {
            void i;
            const horsJeu = saufDerniere ? r === rangs[rangs.length - 1] : r === rangs[0];
            return horsJeu ? '' : marqueHtml(c, `${prefixe}${r}`);
        };
        dedans = `<div class="br-ligne"><span class="br-signe"></span>${
            rangs.map(r => `<span class="br-case br-case--donnee${virgule(r)} br-case--porte">${
                marques('m', false)(r)}${esc(chiffre(c.nombres[0], r))}</span>`).join('')}</div>`
            + `<div class="br-ligne"><span class="br-signe">${SIGNES['-']}</span>${
                rangs.map(r => `<span class="br-case br-case--donnee${virgule(r)} br-case--porte">${
                    marques('b', true)(r)}${esc(chiffre(c.nombres[1], r))}</span>`).join('')}</div>`
            + '<div class="br-barre"></div>'
            + `<div class="br-ligne"><span class="br-signe"></span>${
                rangs.map(r => caseHtml(c, `t${r}`, virgule(r))).join('')}</div>`;
    } else {
        // L'ADDITION — plusieurs membres — ET LA MULTIPLICATION.
        const lignes = [retenuesHtml(c, rangs)];
        c.nombres.forEach((v, i) => {
            lignes.push(ligneDonnee(v, i === c.nombres.length - 1 ? SIGNES[c.op] : ''));
        });
        lignes.push('<div class="br-barre"></div>');
        if (c.op === '×') {
            // LA MULTIPLICATION S'ÉCRIT EN LIGNES : un produit partiel par
            // chiffre du multiplicateur, puis leur somme.
            const combien = String(c.nombres[1]).replace('.', '').replace(/^0+/, '').length || 1;
            for (let i = 0; i < combien; i++) {
                lignes.push(`<div class="br-ligne"><span class="br-signe"></span>${
                    rangs.map(r => caseHtml(c, `p${i}:${r}`)).join('')}</div>`);
            }
            if (combien > 1) {
                lignes.push('<div class="br-barre"></div>');
                lignes.push(`<div class="br-ligne"><span class="br-signe"></span>${
                    rangs.map(r => caseHtml(c, `t${r}`)).join('')}</div>`);
            }
        } else {
            lignes.push(`<div class="br-ligne"><span class="br-signe"></span>${
                rangs.map(r => caseHtml(c, `t${r}`, virgule(r))).join('')}</div>`);
        }
        dedans = lignes.join('');
    }

    return `<div class="br-calcul" data-br-calcul="${esc(c.id)}">
        <div class="br-calcul-tete">
            <button type="button" class="br-replier" data-br-replier="${esc(c.id)}"
                aria-expanded="${!c.replie}"
                aria-label="${c.replie ? 'Déplier' : 'Replier'} ce calcul">${
                c.replie ? '▸' : '▾'}</button>
            <span class="br-calcul-dit">${esc(c.nombres.join(` ${SIGNES[c.op]} `))}</span>
            ${c.op === '-' && !c.replie ? `<button type="button" class="br-methode" data-br-methode="${esc(c.id)}"
                title="L'autre façon d'écrire les retenues">⇄ ${
                c.methode === 'emprunt' ? 'par emprunt' : 'par compensation'}</button>` : ''}
            ${c.replie ? '' : `<button type="button" class="br-methode" data-br-verifier="${esc(c.id)}"
                title="Je dis où ça coince, jamais la réponse">Vérifier</button>`}
            <button type="button" class="br-oter" data-br-oter="${esc(c.id)}"
                aria-label="Retirer ce calcul">✕</button>
        </div>
        ${c.replie ? '' : `<div class="br-grille"><div class="br-pose">${dedans}</div></div>`}
        ${c.dit && !c.replie ? `<p class="br-verdict br-verdict--${
            c.fautes.length ? 'faux' : 'juste'}">${esc(c.dit)}</p>` : ''}
    </div>`;
}

/** La petite marque posée DEVANT un chiffre — la compensation s'écrit ainsi. */
/**
 * LA MARQUE D'UNE COMPENSATION — celle qu'on écrit au crayon, dans la marge.
 *
 * RÉMY, capture du brouillon à l'appui : « les retenues sur les soustraction
 * cachent les nombres, utilise la même chose que poser une opération ».
 *
 * MESURÉ : la pastille faisait 15 × 18 px et commençait à DEUX pixels du bord
 * intérieur d'une case de 38 px — fond opaque, bordure pointillée permanente.
 * Elle mordait donc le tiers gauche du chiffre, sur chacune des huit colonnes.
 *
 * « Poser une opération » écrit la même chose autrement (voir `po-marque` dans
 * js/games/poserOperation.js), et sa règle tient en deux lignes :
 *
 *   · la marque DÉBORDE à gauche, hors de la case — c'est ainsi qu'on l'écrit
 *     entre deux colonnes, et c'est ce débordement qui dit à quel chiffre elle
 *     s'ajoute ;
 *   · VIDE elle se montre, en pointillé pâle ; ÉCRITE elle perd sa bordure et
 *     redevient un chiffre au crayon.
 *
 * On ne recopie pas son CSS : on en reprend la forme, avec les mesures de
 * cette grille-ci (38 px de case au lieu d'une largeur en `cqw`).
 */
function marqueHtml(c, cle) {
    const vide = !c.cases[cle];
    return `<span class="br-marque${vide ? ' br-marque--vide' : ''}${
        estActive(c, cle) ? ' br-marque--active' : ''}${
        (c.fautes || []).includes(cle) ? ' br-case--faux' : ''}"
        data-br-case="${esc(cle)}" data-br-c="${esc(c.id)}" tabindex="0" role="button"
        aria-label="Retenue ${esc(cle)}">${esc(c.cases[cle] || '')}</span>`;
}

function potenceHtml(c) {
    const chiffresDe = (v) => String(v).replace('.', ',').split('');
    const gauche = chiffresDe(c.nombres[0]);
    const droite = chiffresDe(c.nombres[1]);
    const vides = (prefixe) => gauche.map((_, i) => caseHtml(c, `${prefixe}${i}`)).join('');
    return `
        <div class="br-potence">
            <div class="br-potence-haut">
                <div class="br-ligne">${gauche.map(x => donneeHtml(x)).join('')}</div>
                <div class="br-potence-mur"></div>
                <div class="br-potence-droite">
                    <div class="br-ligne">${droite.map(x => donneeHtml(x)).join('')}</div>
                    <div class="br-barre br-barre--quotient"></div>
                    <div class="br-ligne">${droite.concat(['']).map((_, i) =>
                        caseHtml(c, `q${i}`)).join('')}</div>
                </div>
            </div>
            <div class="br-potence-bas">${[0, 1, 2, 3].map(n => `<div class="br-ligne">${vides(`d${n}:`)}</div>`
        // LE TRAIT DE LA SOUSTRACTION, SOUS CHAQUE PRODUIT.
        //
        // RÉMY : « Pour les divisions dans le brouillons, il n'y a aucun ligne
        // en dessous du 567 ». Mesuré : quatre rangées de cases vides, et pas
        // un seul trait — `barresAGauche: 0`.
        //
        // UNE DIVISION POSÉE ALTERNE PRODUIT ET RESTE, et le trait se trace
        // entre les deux : c'est lui qui dit « ce qui suit est une
        // différence ». « Poser une division » le tire dès que le produit est
        // posé — Rémy, déjà : « tu oublies la barre sous le 5 − 4 ». Le
        // brouillon, lui, ne sait pas ce que l'élève écrira : il montre donc
        // les traits comme il montre les cases de retenue, vides mais
        // présentes. Une ligne qu'on ne voit pas est une ligne qu'on oublie.
        //
        // PÂLE ET FIN : ce sont des repères, pas le trait du résultat, qui
        // reste plein.
        + (n % 2 === 0 ? '<div class="br-barre br-barre--repere"></div>' : '')).join('')}</div>
        </div>`;
}

/**
 * LE PAVÉ DE CHIFFRES EST DANS LA FEUILLE, et ce n'est pas un caprice.
 *
 * Celui du système, sur un téléphone, recouvre la moitié de l'écran — donc le
 * brouillon qu'on est en train de remplir. C'est la raison écrite dans
 * `ui/gameChrome.js` pour le pavé des exercices, et elle vaut mot pour mot ici.
 *
 * TROIS GESTES POUR LE MÊME CHIFFRE, et Rémy les a demandés tous les trois :
 * on touche une case puis un chiffre ; on GLISSE un chiffre dans une case
 * (« je préfère du drag drop en supplément du clic ») ; ou l'on TAPE au
 * clavier, la case ayant le foyer.
 */
function paveHtml() {
    const dansUneCase = !!etat.active;
    const touches = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ',', '⌫'];
    const signes = ['+', '-', '×', '÷'];
    return `
        <div class="br-pave-tete">
            <span class="br-pave-dit">Le pavé écrit <b>${
                dansUneCase ? 'dans la case choisie' : 'dans ton calcul'}</b></span>
            <button type="button" class="br-pave-btn" data-br-pave
                aria-pressed="${etat.pave}">${etat.pave ? 'Masquer' : 'Afficher'} le pavé</button>
        </div>
        ${etat.pave ? `<div class="br-pave" role="group" aria-label="Le pavé de chiffres">${
            touches.map(t => `<button type="button" class="br-touche" data-br-touche="${esc(t)}"
                ${t === '⌫' ? 'aria-label="Effacer"' : ''}>${t}</button>`).join('')}${
            signes.map(o => `<button type="button" class="br-touche br-touche--signe"
                data-br-touche="${esc(o)}"
                aria-label="Le signe ${SIGNES[o]}">${SIGNES[o]}</button>`).join('')}</div>` : ''}`;
}

/**
 * LE PAVÉ SE RAFRAÎCHIT SEUL, sans refaire toute la feuille : il dit OÙ il
 * écrit, et cela change dès qu'on touche une case ou la ligne de calcul.
 * Tout redessiner volerait le foyer du champ qu'on est en train de remplir.
 */
function majPave() {
    const zone = feuille && feuille.querySelector('.br-corps');
    if (!zone || outil !== 'poser') return;
    const tete = zone.querySelector('.br-pave-tete');
    if (!tete) return;
    const pave = zone.querySelector('.br-pave');
    if (pave) pave.remove();
    tete.outerHTML = paveHtml();
    brancherLeGlisse();
}

/** Chaque touche du pavé se glisse dans une case. */
function brancherLeGlisse() {
    feuille.querySelectorAll('.br-touche').forEach(t => {
        // NI L'EFFACEMENT NI LES SIGNES NE SE GLISSENT : une case de grille ne
        // porte qu'un chiffre, et glisser un « + » dedans n'aurait pas de sens.
        if (!/^[0-9,]$/.test(t.dataset.brTouche || '')) return;
        rendreGlissable(t, {
            cibles: '.br-case[data-br-case], .br-marque[data-br-case]',
            deposer: (cible) => {
                ecrire(cible.dataset.brC, cible.dataset.brCase, t.dataset.brTouche);
            }
        });
    });
}

// ── NOTER ──────────────────────────────────────────────────────────────────

function noterHtml() {
    return `<textarea class="br-note" data-br-note aria-label="Mes notes"
        placeholder="Ce que je cherche…">${esc(etat.note)}</textarea>`;
}

// ── DESSINER ───────────────────────────────────────────────────────────────

function dessinerHtml() {
    const l = CARREAUX_L * CARREAU, h = CARREAUX_H * CARREAU;
    let grille = '';
    for (let i = 0; i <= CARREAUX_L; i++) grille += `M${i * CARREAU} 0V${h}`;
    for (let j = 0; j <= CARREAUX_H; j++) grille += `M0 ${j * CARREAU}H${l}`;
    const traits = etat.traits.map(t => `<path d="${chemin(t)}" fill="none" stroke="currentColor"
        stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path>`).join('');
    return `
        <div class="br-crayons" role="group" aria-label="Le crayon">
            <button type="button" class="br-crayon${etat.crayon === 'libre' ? ' br-crayon--actif' : ''}"
                aria-pressed="${etat.crayon === 'libre'}" data-br-crayon="libre">Crayon libre</button>
            <button type="button" class="br-crayon${etat.crayon === 'aimante' ? ' br-crayon--actif' : ''}"
                aria-pressed="${etat.crayon === 'aimante'}" data-br-crayon="aimante">Aimanté</button>
        </div>
        <div class="br-crayons" role="group" aria-label="Revenir en arrière">
            <button type="button" class="br-crayon br-crayon--petit" data-br-defaire
                ${etat.rang > 0 ? '' : 'disabled'} aria-label="Défaire">↶ Défaire</button>
            <button type="button" class="br-crayon br-crayon--petit" data-br-refaire
                ${etat.rang < etat.histoire.length - 1 ? '' : 'disabled'} aria-label="Refaire">↷ Refaire</button>
            <button type="button" class="br-crayon br-crayon--petit" data-br-gomme
                ${etat.traits.length ? '' : 'disabled'}>Gommer</button>
        </div>
        <p class="br-dit">${etat.crayon === 'aimante'
            ? 'Le trait saute de nœud en nœud&nbsp;: il suit les carreaux.'
            : 'Le trait suit le doigt, sans rien corriger.'}</p>
        <div class="br-papier">
            <svg viewBox="0 0 ${l} ${h}" width="${l}" height="${h}" data-br-svg
                 role="img" aria-label="Feuille à petits carreaux">
                <path d="${grille}" fill="none" stroke="currentColor" class="br-carreaux"></path>
                <g class="br-encre">${traits}</g>
            </svg>
        </div>`;
}

/**
 * LE TRAIT LIBRE EST LISSÉ, L'AIMANTÉ NE L'EST PAS.
 *
 * RÉMY : « lisse le trait libre ». Un doigt échantillonné à soixante images
 * par seconde rend une ligne brisée : à l'écran, cela se voit comme un
 * tremblement, et sur une figure de brouillon cela ressemble à une main qui
 * hésite. On fait donc passer une courbe par les points — chaque point devient
 * le point de CONTRÔLE d'une quadratique dont les extrémités sont les milieux
 * de ses segments, qui est la façon la plus courte d'obtenir une courbe
 * continue sans rien déplacer de visible.
 *
 * ET SURTOUT PAS SUR L'AIMANTÉ. Lisser un trait qui saute de nœud en nœud le
 * ferait passer À CÔTÉ des nœuds — c'est-à-dire défaire exactement ce que
 * l'aimantation vient de faire. Le trait garde donc la mémoire du crayon qui
 * l'a tracé, et non le réglage du moment : changer de crayon ne doit pas
 * redessiner ce qui est déjà sur la feuille.
 */
export function chemin(trait) {
    const points = Array.isArray(trait) ? trait : (trait.points || []);
    const droit = Array.isArray(trait) ? true : !!trait.aimante;
    if (!points.length) return '';
    if (droit || points.length < 3) {
        return points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
    }
    const milieu = (a, b) => `${Math.round((a.x + b.x) / 2)} ${Math.round((a.y + b.y) / 2)}`;
    let d = `M${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
        d += ` Q${points[i].x} ${points[i].y} ${milieu(points[i], points[i + 1])}`;
    }
    const fin = points[points.length - 1];
    return `${d} L${fin.x} ${fin.y}`;
}

/** Un état de plus dans l'histoire du dessin — et l'on efface ce qui suivait. */
function noterLeDessin(traits) {
    etat.traits = traits;
    etat.histoire = etat.histoire.slice(0, etat.rang + 1);
    etat.histoire.push(traits);
    etat.rang = etat.histoire.length - 1;
}

/**
 * LE CRAYON, ET LA GRILLE AIMANTÉE.
 *
 * RÉMY demandait les deux, et il a tranché « 4 oui » : le crayon libre reste.
 * Les deux ne sont pourtant qu'UN seul chemin de code — on échantillonne le
 * doigt, et l'aimanté arrondit chaque point au nœud le plus proche. Deux
 * boucles de dessin auraient divergé au premier réglage.
 *
 * `setPointerCapture` ET PAS UN ÉCOUTEUR SUR LA FENÊTRE : un doigt qui sort du
 * cadre pendant le trait doit continuer à écrire, et le relâchement doit nous
 * revenir même s'il tombe ailleurs.
 */
function brancherLeCrayon() {
    const svg = feuille.querySelector('[data-br-svg]');
    if (!svg) return;
    const encre = svg.querySelector('.br-encre');

    const point = (e) => {
        const r = svg.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        const x = (e.clientX - r.left) * (CARREAUX_L * CARREAU) / r.width;
        const y = (e.clientY - r.top) * (CARREAUX_H * CARREAU) / r.height;
        if (etat.crayon !== 'aimante') return { x: Math.round(x), y: Math.round(y) };
        return { x: Math.round(x / CARREAU) * CARREAU, y: Math.round(y / CARREAU) * CARREAU };
    };

    const tracer = () => {
        if (!enTrain || !encre) return;
        const d = chemin(enTrain);
        let vif = encre.querySelector('.br-trait--vif');
        if (!vif) {
            vif = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            vif.setAttribute('class', 'br-trait--vif');
            vif.setAttribute('fill', 'none');
            vif.setAttribute('stroke', 'currentColor');
            vif.setAttribute('stroke-width', '2.6');
            vif.setAttribute('stroke-linecap', 'round');
            vif.setAttribute('stroke-linejoin', 'round');
            encre.appendChild(vif);
        }
        vif.setAttribute('d', d);
    };

    svg.addEventListener('pointerdown', (e) => {
        const p = point(e);
        if (!p) return;
        e.preventDefault();
        if (svg.setPointerCapture) svg.setPointerCapture(e.pointerId);
        // LE TRAIT RETIENT SON CRAYON. Changer de crayon ne doit pas
        // redessiner ce qui est déjà sur la feuille — et lisser après coup un
        // trait aimanté le ferait passer à côté de ses nœuds.
        enTrain = { aimante: etat.crayon === 'aimante', points: [p] };
        tracer();
    });

    svg.addEventListener('pointermove', (e) => {
        if (!enTrain) return;
        const p = point(e);
        if (!p) return;
        const d = enTrain.points[enTrain.points.length - 1];
        // DEUX POINTS IDENTIQUES NE FONT PAS UN TRAIT : en aimanté, le doigt
        // passe dix fois dans le même carreau, et chacun de ces points
        // rallongerait le chemin pour rien.
        //
        // ET AU CRAYON LIBRE, ON ÉCHANTILLONNE PLUS LARGE : un point tous les
        // deux pixels suffit à suivre la main, et c'est la moitié du lissage —
        // la courbe n'a plus à absorber le tremblement de soixante points par
        // seconde, elle n'a qu'à passer par ceux qui restent.
        const ecart = Math.abs(d.x - p.x) + Math.abs(d.y - p.y);
        if (ecart === 0 || (!enTrain.aimante && ecart < 3)) return;
        enTrain.points.push(p);
        tracer();
    });

    const finir = () => {
        if (!enTrain) return;
        // UN POINT SEUL N'EST PAS UN TRAIT, mais on le garde quand même : en
        // aimanté, toucher un nœud est le geste qui pose un repère.
        noterLeDessin(etat.traits.concat([enTrain]));
        enTrain = null;
        dessiner();
    };
    svg.addEventListener('pointerup', finir);
    svg.addEventListener('pointercancel', finir);
}

// ── LES GESTES ─────────────────────────────────────────────────────────────

/** Écrit un chiffre dans une case, d'où qu'il vienne. */
function ecrire(idCalcul, cle, valeur) {
    const c = etat.calculs.find(x => x.id === idCalcul);
    if (!c) return;
    if (valeur === null) delete c.cases[cle];
    else c.cases[cle] = valeur;
    etat.active = { c: idCalcul, k: cle };
    redessinerLesCalculs();
}

/** On ne refait QUE les calculs : la ligne de saisie garde son foyer. */
function redessinerLesCalculs() {
    const zone = feuille && feuille.querySelector('.br-corps');
    if (!zone || outil !== 'poser') return;
    const ancien = [...zone.querySelectorAll('.br-calcul')];
    const pave = zone.querySelector('.br-pave');
    const html = etat.calculs.map(calculHtml).join('');
    if (ancien.length) {
        ancien.slice(1).forEach(e => e.remove());
        ancien[0].outerHTML = html || '';
    } else if (html) {
        if (pave) pave.insertAdjacentHTML('beforebegin', html);
        else zone.insertAdjacentHTML('beforeend', html + paveHtml());
    }
    const vide = zone.querySelector('.br-vide');
    if (etat.calculs.length && vide) vide.remove();
    if (!etat.calculs.length && pave) pave.remove();
    brancherLeGlisse();
    // LE FOYER SUIT LA CASE ACTIVE : sans cela, taper deux chiffres de suite
    // demanderait de la retoucher entre les deux.
    majPave();
    const active = zone.querySelector('.br-case--active, .br-marque--active');
    if (active && active.focus) active.focus({ preventScroll: true });
}

function surSaisie(e) {
    const el = e.target;
    if (el.matches('[data-br-note]')) { etat.note = el.value; return; }
    if (el.matches('[data-br-saisie]')) { etat.saisie = el.value; }
}

/**
 * TAPER LES CHIFFRES — première demande de Rémy.
 *
 * L'écouteur est sur la FEUILLE, et les cases portent `tabindex` : les touches
 * n'arrivent donc que lorsqu'une case a le foyer. Un écouteur sur le document
 * volerait les touches à l'exercice qui est dessous — c'est tout le contraire
 * d'un brouillon, qui ne doit jamais gêner la question.
 */
function surTouche(e) {
    const cible = e.target.closest('[data-br-case]');
    if (!cible) return;
    const id = cible.dataset.brC, cle = cible.dataset.brCase;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); ecrire(id, cle, e.key); return; }
    if (e.key === ',' || e.key === '.') { e.preventDefault(); ecrire(id, cle, ','); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault(); ecrire(id, cle, null); return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        etat.active = { c: id, k: cle };
        redessinerLesCalculs();
    }
}

/** Le foyer et la case active ne font qu'un. */
function surFoyer(e) {
    if (e.target.closest('[data-br-saisie]')) {
        // ON REVIENT À LA LIGNE : le pavé doit cesser d'écrire dans la case.
        if (etat.active) { etat.active = null; majPave(); }
        return;
    }
    const cible = e.target.closest('[data-br-case]');
    if (!cible) return;
    const deja = etat.active;
    if (deja && deja.c === cible.dataset.brC && deja.k === cible.dataset.brCase) return;
    etat.active = { c: cible.dataset.brC, k: cible.dataset.brCase };
    redessinerLesCalculs();
}

function surClic(e) {
    const el = e.target.closest('[data-br-outil], [data-br-case], [data-br-touche],'
        + '[data-br-crayon], [data-br-gomme], [data-br-effacer], [data-br-fermer],'
        + '[data-br-poser], [data-br-oter], [data-br-methode], [data-br-pave],'
        + '[data-br-replier], [data-br-verifier], [data-br-defaire], [data-br-refaire]');
    if (!el) return;
    const d = el.dataset;

    if (d.brFermer !== undefined) { fermerBrouillon(); return; }
    if (d.brEffacer !== undefined) { oublierLeBrouillon(); return; }
    if (d.brOutil) { outil = d.brOutil; etat.active = null; dessiner(); return; }
    if (d.brCrayon) { etat.crayon = d.brCrayon; dessiner(); return; }
    if (d.brGomme !== undefined) { noterLeDessin([]); enTrain = null; dessiner(); return; }
    if (d.brDefaire !== undefined) {
        if (etat.rang > 0) { etat.rang -= 1; etat.traits = etat.histoire[etat.rang]; }
        dessiner();
        return;
    }
    if (d.brRefaire !== undefined) {
        if (etat.rang < etat.histoire.length - 1) {
            etat.rang += 1;
            etat.traits = etat.histoire[etat.rang];
        }
        dessiner();
        return;
    }
    if (d.brPoser !== undefined) { poserLeCalcul(); return; }
    if (d.brPave !== undefined) { etat.pave = !etat.pave; dessiner(); return; }
    if (d.brReplier) {
        const c = etat.calculs.find(x => x.id === d.brReplier);
        if (c) c.replie = !c.replie;
        dessiner();
        return;
    }
    if (d.brVerifier) {
        const c = etat.calculs.find(x => x.id === d.brVerifier);
        if (c) {
            const v = verifierLaPose(c);
            c.dit = v.dit;
            c.fautes = v.fautes;
        }
        redessinerLesCalculs();
        return;
    }
    if (d.brOter) {
        etat.calculs = etat.calculs.filter(c => c.id !== d.brOter);
        etat.active = null;
        dessiner();
        return;
    }
    if (d.brMethode) {
        const c = etat.calculs.find(x => x.id === d.brMethode);
        // LES RETENUES DÉJÀ ÉCRITES NE SE TRADUISENT PAS d'une méthode à
        // l'autre : elles ne sont pas aux mêmes endroits et ne disent pas la
        // même chose. On les retire, plutôt que de laisser des marques qui ne
        // veulent plus rien dire.
        if (c) {
            c.methode = c.methode === 'emprunt' ? 'compensation' : 'emprunt';
            Object.keys(c.cases).forEach(k => { if (/^[emb]/.test(k)) delete c.cases[k]; });
        }
        dessiner();
        return;
    }
    if (d.brCase) { etat.active = { c: d.brC, k: d.brCase }; redessinerLesCalculs(); return; }
    if (d.brTouche) {
        // LE MÊME PAVÉ POUR LES DEUX, ET C'EST CE QUI LE REND LISIBLE : il
        // écrit dans la case choisie s'il y en a une, dans la ligne de calcul
        // sinon — et la phrase au-dessus dit laquelle des deux.
        // UN SIGNE NE VA JAMAIS DANS UNE CASE : il appartient à la ligne de
        // calcul, et le toucher veut dire « j'écris une opération ». Mesuré
        // (`tools/leBrouillon.mjs`) : éteint tant qu'une case était choisie,
        // il devenait une touche morte — on appuyait, rien ne se passait, et
        // rien ne disait qu'il fallait d'abord toucher la ligne.
        if (/^[+\-×÷]$/.test(d.brTouche)) {
            etat.active = null;
            ecrireDansLaLigne(d.brTouche);
            majPave();
            return;
        }
        if (etat.active) {
            ecrire(etat.active.c, etat.active.k, d.brTouche === '⌫' ? null : d.brTouche);
            return;
        }
        ecrireDansLaLigne(d.brTouche);
    }
}

function ecrireDansLaLigne(morceau) {
    etat.saisie = morceau === '⌫'
        ? etat.saisie.slice(0, -1)
        : `${etat.saisie}${morceau}`;
    etat.dit = '';
    const champ = feuille && feuille.querySelector('[data-br-saisie]');
    if (champ) { champ.value = etat.saisie; champ.focus({ preventScroll: true }); }
    const refus = feuille && feuille.querySelector('.br-dit--refus');
    if (refus) refus.remove();
}

/**
 * PLUSIEURS CALCULS SUR LA MÊME FEUILLE — dernière demande de Rémy.
 *
 * Une vraie page de brouillon porte l'addition, puis la soustraction qu'elle
 * appelle, puis la vérification. Chacune garde sa place et ses retenues ; la
 * croix en retire une quand elle n'a rien donné.
 */
function poserLeCalcul() {
    const lu = lireLeCalcul(etat.saisie);
    if (lu.erreur !== undefined) {
        etat.dit = lu.erreur || 'Écris d\'abord ton calcul.';
        dessiner();
        return;
    }
    compteur += 1;
    etat.calculs.push({
        id: `c${compteur}`, op: lu.op, nombres: lu.nombres,
        methode: 'compensation', cases: {},
        replie: false, dit: '', fautes: []
    });
    etat.saisie = '';
    etat.dit = '';
    etat.active = null;
    dessiner();
}
