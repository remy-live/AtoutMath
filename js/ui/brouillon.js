// LE BROUILLON — poser, noter, dessiner. Et rien n'en sort.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Dans le menu à côté du robot, avoir un mode brouillon pour poser son
// calcul. On peut poser une opération (tu as déjà des modules, il faut t'en
// servir), mettre des notes. Dessiner en suivant les carreaux au crayon libre
// (et une grille aimanté) ».
//
// CE QUE ÇA RÉPARE. Devant une soustraction posée, l'élève n'a aujourd'hui
// aucune surface pour chercher : il calcule de tête — et l'on mesure alors un
// calcul mental qu'on n'avait pas l'intention d'évaluer — ou il prend une
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
// rien n'est regardé, rien n'est envoyé. Le brouillon ne touche donc NI le
// journal, NI le serveur, NI le stockage local. Il vit dans la mémoire de cette
// page, le temps d'une question. C'est la seule pièce du logiciel dont on
// puisse le dire, et c'est ce qui la met hors de portée de la ligne rouge :
//
//   « Je ne veux pas de construction géométrique avec des outils virtuels.
//     Rien ne remplace le geste. »  (docs/architecture.md §0)
//
// Une grille aimantée est à un pas de l'outil interdit. Ce qui nous garde du
// bon côté n'est pas technique, c'est une règle sur la SURFACE : le brouillon
// sert à PENSER, jamais à RÉPONDRE. D'où, littéralement : aucun bouton
// « Valider » ici, et aucune activité ne lit ce fichier.
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

import { etendue } from '../core/poser.js';

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
    op: '+',
    a: '',
    b: '',
    cases: {},        // les chiffres écrits par l'élève, par clé de case
    active: null,     // la case qui reçoit le prochain chiffre
    note: '',
    crayon: 'aimante',
    traits: []        // chaque trait : une liste de points {x, y}
});

let etat = vierge();
let outil = 'poser';
let poserPermis = true;
let feuille = null;
let ouverte = false;
let enTrain = null;   // le trait qu'on est en train de dessiner

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

    // UN SEUL ÉCOUTEUR POUR TOUTE LA FEUILLE : elle se redessine souvent, et
    // des écouteurs reposés à chaque dessin finissent par s'empiler.
    feuille.addEventListener('click', surClic);
    feuille.addEventListener('input', surSaisie);
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

// ── POSER ──────────────────────────────────────────────────────────────────

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Le nombre tapé, ou `null` : on ne pose pas ce qu'on ne lit pas. */
function lire(t) {
    const s = String(t || '').trim().replace(',', '.').replace(/\s/g, '');
    if (!s || !/^\d+(\.\d+)?$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

function poserHtml() {
    const a = lire(etat.a), b = lire(etat.b);
    return `
        <div class="br-reglages">
            <div class="br-ops" role="group" aria-label="L'opération">
                ${Object.keys(SIGNES).map(op => `<button type="button"
                    class="br-op${etat.op === op ? ' br-op--actif' : ''}"
                    aria-pressed="${etat.op === op}"
                    data-br-op="${esc(op)}">${SIGNES[op]}</button>`).join('')}
            </div>
            <button type="button" class="br-reprendre" data-br-reprendre>Reprendre les nombres</button>
        </div>
        <div class="br-nombres">
            <label class="br-champ-eti">Premier nombre
                <input type="text" inputmode="decimal" class="br-champ" data-br-a
                       value="${esc(etat.a)}" aria-label="Premier nombre"></label>
            <label class="br-champ-eti">Second nombre
                <input type="text" inputmode="decimal" class="br-champ" data-br-b
                       value="${esc(etat.b)}" aria-label="Second nombre"></label>
        </div>
        ${(a === null || b === null)
            ? '<p class="br-vide">Écris tes deux nombres : le cadre se pose tout seul, '
              + 'aux bonnes colonnes. Le calcul, lui, reste à faire.</p>'
            : `<div class="br-grille"><div class="br-pose">${
                grilleHtml(etat.op, a, b)}</div></div>${paveHtml()}`}`;
}

/**
 * LE CADRE, ET RIEN QUE LE CADRE.
 *
 * On demande au noyau les RANGS des deux nombres — `etendue` ne calcule rien,
 * elle range des colonnes — et l'on ajoute UNE colonne à gauche : c'est la
 * place que le résultat peut demander (998 + 7 tient sur quatre colonnes), et
 * elle est ajoutée SANS regarder le résultat, donc sans rien en dire.
 */
function rangsDuCadre(a, b) {
    const e = etendue([a, b], a);
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

const caseHtml = (cle, texte, classe = '') => `<span class="br-case ${classe}${
    etat.active === cle ? ' br-case--active' : ''}"${cle ? ` data-br-case="${cle}"` : ''}
    >${esc(texte)}</span>`;

const videHtml = (rangs, prefixe, classe = '') => rangs.map(r =>
    caseHtml(`${prefixe}${r}`, etat.cases[`${prefixe}${r}`] || '', classe)).join('');

function grilleHtml(op, a, b) {
    const rangs = rangsDuCadre(a, b);
    const virgule = (r) => (r === 0 && rangs.some(x => x < 0) ? ' br-case--virgule' : '');

    // LA POTENCE EST UNE AUTRE FIGURE, et la forcer dans des colonnes ne
    // servirait personne : le dividende à gauche, le diviseur à droite, le
    // quotient sous lui, et les soustractions successives dessous.
    if (op === '÷') return potenceHtml(a, b, rangs.length);

    const lignes = [];
    // La rangée des retenues : des cases plus petites, au-dessus.
    lignes.push(`<div class="br-ligne br-ligne--retenues">
        <span class="br-signe"></span>${videHtml(rangs, 'r', 'br-case--petite')}</div>`);
    lignes.push(`<div class="br-ligne"><span class="br-signe"></span>${
        rangs.map(r => caseHtml('', chiffre(a, r), 'br-case--donnee' + virgule(r))).join('')}</div>`);
    lignes.push(`<div class="br-ligne"><span class="br-signe">${SIGNES[op]}</span>${
        rangs.map(r => caseHtml('', chiffre(b, r), 'br-case--donnee' + virgule(r))).join('')}</div>`);
    lignes.push('<div class="br-barre"></div>');

    // LA MULTIPLICATION S'ÉCRIT EN LIGNES, pas en une seule : un produit
    // partiel par chiffre du multiplicateur, puis leur somme. On donne donc
    // autant de rangées vides qu'il y a de chiffres, et une dernière pour le
    // total quand il y en a plusieurs.
    if (op === '×') {
        const combien = String(b).replace('.', '').replace(/^0+/, '').length || 1;
        for (let i = 0; i < combien; i++) {
            lignes.push(`<div class="br-ligne"><span class="br-signe"></span>${
                videHtml(rangs, `p${i}:`)}</div>`);
        }
        if (combien > 1) {
            lignes.push('<div class="br-barre"></div>');
            lignes.push(`<div class="br-ligne"><span class="br-signe"></span>${
                videHtml(rangs, 't')}</div>`);
        }
        return lignes.join('');
    }

    lignes.push(`<div class="br-ligne"><span class="br-signe"></span>${
        rangs.map(r => caseHtml(`t${r}`, etat.cases[`t${r}`] || '', virgule(r))).join('')}</div>`);
    return lignes.join('');
}

function potenceHtml(a, b, largeur) {
    const chiffresDe = (v) => String(v).replace('.', ',').split('');
    const gauche = chiffresDe(a);
    const droite = chiffresDe(b);
    const vides = (prefixe) => Array.from({ length: gauche.length }, (_, i) =>
        caseHtml(`${prefixe}${i}`, etat.cases[`${prefixe}${i}`] || '')).join('');
    void largeur;
    return `
        <div class="br-potence">
            <div class="br-potence-haut">
                <div class="br-ligne">${gauche.map(c => caseHtml('', c, 'br-case--donnee')).join('')}</div>
                <div class="br-potence-mur"></div>
                <div class="br-potence-droite">
                    <div class="br-ligne">${droite.map(c => caseHtml('', c, 'br-case--donnee')).join('')}</div>
                    <div class="br-barre br-barre--quotient"></div>
                    <div class="br-ligne">${Array.from({ length: droite.length + 1 }, (_, i) =>
                        caseHtml(`q${i}`, etat.cases[`q${i}`] || '')).join('')}</div>
                </div>
            </div>
            ${[0, 1, 2, 3].map(n => `<div class="br-ligne">${vides(`d${n}:`)}</div>`).join('')}
        </div>`;
}

/**
 * LE PAVÉ DE CHIFFRES EST DANS LA FEUILLE, et ce n'est pas un caprice.
 *
 * Celui du système, sur un téléphone, recouvre la moitié de l'écran — donc le
 * brouillon qu'on est en train de remplir. C'est la raison écrite dans
 * `ui/gameChrome.js` pour le pavé des exercices, et elle vaut mot pour mot
 * ici. On touche une case, on touche un chiffre.
 */
function paveHtml() {
    const touches = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ',', '⌫'];
    return `<div class="br-pave" role="group" aria-label="Les chiffres">${
        touches.map(t => `<button type="button" class="br-touche" data-br-touche="${esc(t)}"
            ${t === '⌫' ? 'aria-label="Effacer le chiffre"' : ''}>${t}</button>`).join('')}</div>`;
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
            <button type="button" class="br-crayon" data-br-gomme>Gommer</button>
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

const chemin = (points) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');

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
        enTrain = [p];
        tracer();
    });

    svg.addEventListener('pointermove', (e) => {
        if (!enTrain) return;
        const p = point(e);
        if (!p) return;
        // DEUX POINTS IDENTIQUES NE FONT PAS UN TRAIT : en aimanté, le doigt
        // passe dix fois dans le même carreau, et chacun de ces points
        // rallongerait le chemin pour rien.
        const d = enTrain[enTrain.length - 1];
        if (d.x === p.x && d.y === p.y) return;
        enTrain.push(p);
        tracer();
    });

    const finir = () => {
        if (!enTrain) return;
        // UN POINT SEUL N'EST PAS UN TRAIT, mais on le garde quand même : en
        // aimanté, toucher un nœud est le geste qui pose un repère.
        etat.traits.push(enTrain);
        enTrain = null;
        dessiner();
    };
    svg.addEventListener('pointerup', finir);
    svg.addEventListener('pointercancel', finir);
}

// ── LES GESTES ─────────────────────────────────────────────────────────────

function surSaisie(e) {
    const el = e.target;
    if (el.matches('[data-br-note]')) { etat.note = el.value; return; }
    // ON NE REDESSINE PAS PENDANT QU'IL TAPE SES NOMBRES : le cadre apparaît
    // quand les deux sont lisibles, et redessiner à chaque frappe volerait le
    // foyer du champ.
    if (el.matches('[data-br-a]')) { etat.a = el.value; majCadre(); return; }
    if (el.matches('[data-br-b]')) { etat.b = el.value; majCadre(); }
}

/** Le cadre se refait, les deux champs gardent leur foyer. */
function majCadre() {
    const zone = feuille && feuille.querySelector('.br-corps');
    if (!zone || outil !== 'poser') return;
    const a = lire(etat.a), b = lire(etat.b);
    const ancienne = zone.querySelector('.br-grille');
    const pave = zone.querySelector('.br-pave');
    if (a === null || b === null) {
        if (ancienne) ancienne.remove();
        if (pave) pave.remove();
        if (!zone.querySelector('.br-vide')) {
            zone.insertAdjacentHTML('beforeend',
                '<p class="br-vide">Écris tes deux nombres : le cadre se pose tout seul, '
                + 'aux bonnes colonnes. Le calcul, lui, reste à faire.</p>');
        }
        return;
    }
    const mot = zone.querySelector('.br-vide');
    if (mot) mot.remove();
    const html = `<div class="br-grille"><div class="br-pose">${
        grilleHtml(etat.op, a, b)}</div></div>`;
    if (ancienne) ancienne.outerHTML = html;
    else zone.insertAdjacentHTML('beforeend', html);
    if (!zone.querySelector('.br-pave')) zone.insertAdjacentHTML('beforeend', paveHtml());
}

function surClic(e) {
    const el = e.target.closest('[data-br-outil], [data-br-op], [data-br-case], [data-br-touche],'
        + '[data-br-crayon], [data-br-gomme], [data-br-effacer], [data-br-fermer], [data-br-reprendre]');
    if (!el) return;
    const d = el.dataset;

    if (d.brFermer !== undefined) { fermerBrouillon(); return; }
    if (d.brEffacer !== undefined) { oublierLeBrouillon(); return; }
    if (d.brOutil) { outil = d.brOutil; etat.active = null; dessiner(); return; }
    if (d.brOp) { etat.op = d.brOp; etat.cases = {}; etat.active = null; dessiner(); return; }
    if (d.brCrayon) { etat.crayon = d.brCrayon; dessiner(); return; }
    if (d.brGomme !== undefined) { etat.traits = []; enTrain = null; dessiner(); return; }
    if (d.brReprendre !== undefined) { reprendreLesNombres(); return; }

    if (d.brCase) {
        etat.active = etat.active === d.brCase ? null : d.brCase;
        majCadre();
        return;
    }

    if (d.brTouche) {
        if (!etat.active) return;
        if (d.brTouche === '⌫') delete etat.cases[etat.active];
        else etat.cases[etat.active] = d.brTouche;
        majCadre();
    }
}

/**
 * LES NOMBRES DE L'ÉNONCÉ, REPRIS SANS LES RETAPER.
 *
 * On LIT l'énoncé affiché — `.game-question`, le crochet que toutes les
 * activités posent — et l'on prend les deux premiers nombres qu'il contient.
 * C'est une commodité, jamais une réponse : si l'énoncé n'en porte pas deux,
 * on ne devine pas, on ne remplit rien.
 */
function reprendreLesNombres() {
    const q = document.querySelector('#game-board .game-question, #game-board .question-text');
    let texte = q ? (q.textContent || '') : '';
    // ET LES NOMBRES DU DESSIN COMPTENT AUSSI. MESURÉ sur « Le Tour du
    // Rectangle » : la question dit « Quel est le périmètre ? » et les deux
    // longueurs sont ÉCRITES SUR LA FIGURE. Chercher dans la seule phrase ne
    // trouvait rien, et le bouton ne faisait rien — ce qui est la pire des
    // réponses, puisqu'on ne sait pas si c'est lui ou soi.
    //
    // ON NE PREND QUE LES TEXTES DU DESSIN, pas tout le plateau : les
    // propositions d'un exercice à bulles sont des nombres elles aussi, et
    // reprendre une réponse possible serait souffler.
    if ((texte.match(/\d/g) || []).length < 2) {
        const svg = document.querySelector('#game-board svg');
        const dessin = svg
            ? [...svg.querySelectorAll('text, tspan')].map(t => t.textContent).join(' ')
            : '';
        texte = `${texte} ${dessin}`;
    }
    const nombres = (texte.replace(/ | /g, '').match(/\d+(?:[.,]\d+)?/g) || []);
    if (nombres.length >= 2) {
        etat.a = nombres[0];
        etat.b = nombres[1];
        etat.cases = {};
        etat.active = null;
    }
    dessiner();
}
