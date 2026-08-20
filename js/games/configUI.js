// Formulaires de configuration.
//
// Le schéma n'est plus recopié dans le catalogue : il est déduit du registre
// (paramètres du générateur + paramètres de l'activité). Ajouter une option à
// un générateur la fait apparaître partout où il est utilisé, sans toucher au
// catalogue ni à cette interface.

import { paramSchemaOf, getExerciseById } from '../data/catalog.js';
import { seuilDe } from '../core/recompenses.js';
import { getGenerator, generateurDeFiche } from '../core/registry.js';
import { questionsConseillees, MIN_QUESTIONS, MAX_QUESTIONS } from '../core/duree.js';
import { MODES, evaluationPolicy, apprentissagePolicy, defaultPolicy, resolvePolicy } from '../core/policy.js';

// --- Champs -----------------------------------------------------------------

/**
 * Une option de schéma est soit une valeur brute, soit `{ value, label }`.
 *
 * Sans libellé, la case à cocher affichait le code interne : un élève lisait
 * « mul », « c10 », « rel » au lieu de « Tables », « Compléments à 10 »,
 * « Relatifs ». Le code, lui, doit rester tel quel — il pilote la génération
 * des questions et se retrouve dans les parcours enregistrés.
 */
function valeurOption(opt) { return (opt && typeof opt === 'object') ? opt.value : opt; }
function libelleOption(opt) { return (opt && typeof opt === 'object') ? opt.label : String(opt); }

/**
 * Ce que dit une liste repliée. « 0 coché » ne veut pas dire « rien » : dans
 * ces réglages, ne rien choisir revient à tout prendre — et c'est exactement
 * ce qu'il faut écrire, sinon on croit avoir désactivé l'exercice.
 */
function resumeListe(cochees, total, mot) {
    if (!cochees || cochees === total) return `Tout — les ${total} ${mot}`;
    return `${cochees} ${mot.replace(/s$/, '')}${cochees > 1 ? 's' : ''} sur ${total}`;
}

/**
 * Un réglage = un libellé court et son contrôle, côte à côte quand la largeur
 * le permet. Les explications passent dans une infobulle sur « ? » plutôt que
 * sous le champ : trois paragraphes d'aide empilés rendaient le panneau
 * illisible et repoussaient les réglages suivants hors de l'écran.
 *
 * EXPORTÉ, avec `readParams` et `wireTips` : la fiche à imprimer règle les
 * mêmes choses — le niveau, les tables, la difficulté — et redessiner ces
 * champs de son côté aurait donné deux dessins du même réglage, dont un seul
 * aurait profité des corrections. Les commandes (− / +, molette, glissé,
 * infobulles) sont branchées sur `document` une fois pour toutes : un panneau
 * qui pose ce HTML n'a rien d'autre à faire.
 */
export function fieldHtml(param, value, options = {}) {
    const id = `cfg-${param.id}`;
    const wide = param.type === 'multiselect';   // les puces prennent toute la largeur

    // UN MENU DONT LES CHOIX SONT DES PHRASES PASSE SOUS SON LIBELLÉ.
    //
    // « 6 — Cinq, et rien de donné · avec des "soit… soit…" », c'est cinquante
    // caractères : dans une demi-largeur de téléphone, on lit « 6 — Cinq, et
    // r… » et on ne sait plus ce qui est réglé. Aucune largeur ne sauve ces
    // libellés-là ; seule la LIGNE ENTIÈRE les sauve. Le réglage descend donc
    // d'un cran — libellé au-dessus, menu pleine largeur en dessous — et
    // uniquement lui : les menus courts (« Normal », « 24 × 16 ») restent sur
    // une ligne, sinon le panneau doublerait de hauteur pour rien.
    const longOptions = param.type === 'select' && (param.options || [])
        .some(o => String(libelleOption(o)).length > 18);
    let control = '';

    if (param.type === 'multiselect' && param.deroulant) {
        // UNE LISTE QUI SE DÉPLIE, quand les options sont des PHRASES.
        //
        // Onze familles de problèmes en pastilles au fil du texte, ce sont onze
        // lignes de libellés longs qui repoussent tout le reste du panneau hors
        // de l'écran — et le professeur n'y touche qu'une fois sur dix. Repliée,
        // la liste tient sur une ligne et dit son état (« 3 familles sur 11 ») ;
        // dépliée, elle donne les cases. « Tout cocher / tout décocher » évite
        // les onze clics qu'on faisait sinon pour n'en garder qu'une.
        const choisis = Array.isArray(value) ? value.map(String)
            : String(value || '').split(',').map(s => s.trim()).filter(Boolean);
        const n = param.options.length;
        const cochees = param.options.filter(o => choisis.includes(String(valeurOption(o)))).length;
        control = `<details class="cfg-liste" data-liste="${param.id}" data-mot="${escapeAttr(param.tout || 'éléments')}">
            <summary class="cfg-liste-tete">
                <span data-resume>${resumeListe(cochees, n, param.tout || 'tout')}</span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                     stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div class="cfg-liste-actions">
                <button type="button" class="cfg-liste-btn" data-cocher="1">Tout cocher</button>
                <button type="button" class="cfg-liste-btn" data-cocher="0">Tout décocher</button>
            </div>
            <div class="cfg-liste-corps">${param.options.map(opt => {
            const v = valeurOption(opt);
            const checked = choisis.includes(String(v)) ? 'checked' : '';
            return `<label class="cfg-liste-ligne">
                    <input type="checkbox" data-param="${param.id}" data-kind="multiselect" value="${v}" ${checked}>
                    <span>${libelleOption(opt)}</span></label>`;
        }).join('')}</div>
        </details>`;
    } else if (param.type === 'multiselect') {
        // Des options toutes courtes — les tables, les nombres de côtés — se
        // rangent en GRILLE de tuiles identiques plutôt qu'en pastilles au fil
        // du texte : les tailles ne dépendent plus du contenu, les colonnes
        // s'alignent, et une table cochée ne pousse plus ses voisines.
        const grille = param.options.every(o => String(libelleOption(o)).length <= 3);
        // Le nombre de colonnes est DIT, pas deviné. `auto-fill` remplissait la
        // largeur avec des tuiles minimales : dix tables tombaient en 6 + 4,
        // une rangée pleine et une rangée orpheline. Une grille qui compte
        // exactement ses options tient sur une ligne quand la place existe, et
        // se replie proprement en deux rangées égales sur un téléphone.
        const cols = grille ? ` style="--cfg-cols: ${param.options.length}"` : '';
        control = `<div class="cfg-chips${grille ? ' cfg-chips--grille' : ''}"${cols}>` + param.options.map(opt => {
            const v = valeurOption(opt);
            const checked = Array.isArray(value) && value.includes(v) ? 'checked' : '';
            // `aide` porte le nom en toutes lettres quand le libellé est un
            // raccourci — « 7 × 8 » dit ce qu'on va calculer, il ne dit pas
            // qu'on travaille les tables. L'infobulle rattrape la nuance sans
            // rallonger la puce.
            const titre = opt && opt.aide ? ` title="${escapeAttr(opt.aide)}"` : '';
            return `<label class="cfg-chip"${titre}>
                <input type="checkbox" data-param="${param.id}" data-kind="multiselect" value="${v}" ${checked}>
                <span>${libelleOption(opt)}</span></label>`;
        }).join('') + `</div>`;
    } else if (param.type === 'number') {
        // UN NOMBRE SE RÈGLE DE TROIS FAÇONS, et il faut les trois : un champ
        // nu obligeait à sélectionner le contenu puis à taper — sur téléphone,
        // c'est faire monter le clavier système pour changer 4 en 5. On garde
        // donc la saisie (la plus rapide pour aller loin), on ajoute deux
        // boutons − / + (le geste évident au doigt) et la molette ou le glissé
        // vertical sur le champ (le geste évident à la souris).
        control = `<div class="cfg-stepper" data-stepper>
            <button type="button" class="cfg-step" data-step="-1" tabindex="-1" aria-label="Diminuer">−</button>
            <input type="number" inputmode="numeric" id="${id}" class="cfg-input cfg-input--num"
                data-param="${param.id}" data-kind="number" value="${value}"
                ${param.min !== undefined ? `min="${param.min}"` : ''} ${param.max !== undefined ? `max="${param.max}"` : ''}>
            <button type="button" class="cfg-step" data-step="1" tabindex="-1" aria-label="Augmenter">+</button>
        </div>`;
    } else if (param.type === 'select') {
        control = `<select id="${id}" class="cfg-input" data-param="${param.id}" data-kind="select">` +
            param.options.map(o => {
                const v = valeurOption(o);
                return `<option value="${v}" ${String(value) === String(v) ? 'selected' : ''}>${libelleOption(o)}</option>`;
            }).join('') +
            `</select>`;
    } else if (param.type === 'checkbox' || param.type === 'bool' || typeof value === 'boolean') {
        // OUI / NON, jamais « true » et « false ».
        //
        // Sans cette branche, un réglage booléen tombait dans le champ texte :
        // l'élève lisait « true », et en tapant dessus il pouvait écrire
        // n'importe quoi — le clavier du téléphone montait pour éditer un mot
        // anglais qui n'a aucun sens dans une salle de classe.
        const oui = value === true || value === 'true';
        control = `<div class="cfg-oui-non" data-param="${param.id}" data-kind="bool" data-valeur="${oui}">
            <button type="button" class="cfg-on ${oui ? 'cfg-on--actif' : ''}" data-bool="true">Oui</button>
            <button type="button" class="cfg-on ${oui ? '' : 'cfg-on--actif'}" data-bool="false">Non</button>
        </div>`;
    } else {
        control = `<input type="text" id="${id}" class="cfg-input" data-param="${param.id}" data-kind="text" value="${value ?? ''}">`;
    }

    // L'explication peut venir du schéma lui-même (`aide`) : un réglage dont le
    // libellé ne suffit pas se documente là où il est défini, pas au point
    // d'appel — sinon l'aide n'existe que dans un seul des trois panneaux.
    return `<div class="cfg-field${wide ? ' cfg-field--wide' : ''}${longOptions ? ' cfg-field--long' : ''}">
        <label class="cfg-label" for="${id}">${param.label}${infoBtn(options.aide || param.aide, options.aideId)}</label>
        ${control}
    </div>`;
}

/**
 * Le fondu de bas de liste : posé tant qu'il reste des réglages sous le pli,
 * retiré dès qu'on touche le fond.
 *
 * On l'ACTUALISE au défilement et au redimensionnement, pas seulement à
 * l'ouverture : déplier une liste de familles ou faire monter le clavier
 * change la hauteur du contenu, et un fondu qui reste alors qu'on est en bas
 * ressemble à un texte effacé.
 */
export function marquerFondu(el) {
    if (!el) return;
    const maj = () => el.classList.toggle('cfg-encore',
        el.scrollHeight - el.scrollTop - el.clientHeight > 6);
    maj();
    if (el._fondu) return maj;
    el._fondu = true;
    el.addEventListener('scroll', maj, { passive: true });
    el.addEventListener('toggle', () => requestAnimationFrame(maj), true);
    window.addEventListener('resize', maj);
    return maj;
}

// Sorti du littéral de gabarit : les apostrophes d'un texte français y sont
// une source d'erreurs de syntaxe silencieuses.
const SCOPE_TIP = "« À toute l'étape » : un seul compte à rebours pour l'ensemble "
    + "des questions. « À chaque question » : il repart à zéro à chaque question, "
    + "et une question non répondue à temps est comptée fausse.";

/** Point d'interrogation portant l'explication ; rien du tout s'il n'y en a pas. */
function infoBtn(aide, id) {
    if (!aide && !id) return '';
    return `<button type="button" class="cfg-info" ${id ? `id="${id}"` : ''}
        data-tip="${aide ? escapeAttr(aide) : ''}" aria-label="Explication">?</button>`;
}

function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// --- Infobulles -------------------------------------------------------------
//
// L'infobulle vit dans <body> et non à côté de son bouton : les panneaux qui
// la contiennent défilent, et un conteneur qui défile découpe tout ce qui en
// dépasse — le texte se retrouvait tronqué sur la gauche. Positionnée en
// `fixed` et recalée dans la fenêtre, elle ne peut plus être rognée.

let tipEl = null;

function tipNode() {
    if (!tipEl) {
        tipEl = document.createElement('div');
        tipEl.className = 'cfg-tip';
        tipEl.setAttribute('role', 'tooltip');
        document.body.appendChild(tipEl);
    }
    return tipEl;
}

function showTip(btn) {
    const texte = btn.dataset.tip;
    if (!texte) return;
    const el = tipNode();
    el.textContent = texte;
    el.classList.add('cfg-tip--on');

    const b = btn.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    const marge = 8;

    // Centrée sur le bouton, puis ramenée dans la fenêtre si elle déborde.
    let left = b.left + b.width / 2 - t.width / 2;
    left = Math.max(marge, Math.min(left, window.innerWidth - t.width - marge));

    // Au-dessus par défaut ; en dessous s'il n'y a pas la place.
    let top = b.top - t.height - 10;
    if (top < marge) top = b.bottom + 10;

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
}

function hideTip() {
    if (tipEl) tipEl.classList.remove('cfg-tip--on');
}

/** Survol et focus pour la souris et le clavier, clic pour le tactile. */
export function wireTips(root) {
    root.querySelectorAll('.cfg-info').forEach(btn => {
        btn.onmouseenter = () => showTip(btn);
        btn.onmouseleave = hideTip;
        btn.onfocus = () => showTip(btn);
        btn.onblur = hideTip;
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const ouverte = tipEl && tipEl.classList.contains('cfg-tip--on') && tipEl._pour === btn;
            if (ouverte) return hideTip();
            showTip(btn);
            tipNode()._pour = btn;
        };
    });
}

document.addEventListener('click', (e) => { if (!e.target.closest('.cfg-info')) hideTip(); });
// Une infobulle flottante ne suit pas son bouton : on la ferme dès que la
// page bouge sous elle.
window.addEventListener('scroll', hideTip, true);
window.addEventListener('resize', hideTip);

// --- Le pas-à-pas des nombres -----------------------------------------------
//
// Un seul écouteur posé sur <body> sert TOUS les panneaux, présents et à venir
// (réglages avant partie, propriétés d'étape, politique). Les panneaux se
// reconstruisent à chaque ouverture : brancher les champs après chaque rendu
// aurait multiplié les écouteurs sans jamais les retirer.

function borner(input, v) {
    const min = input.min !== '' ? Number(input.min) : -Infinity;
    const max = input.max !== '' ? Number(input.max) : Infinity;
    return Math.max(min, Math.min(max, v));
}

/** Change la valeur ET prévient le panneau : sans `change`, rien n'est retenu. */
function pousser(input, delta) {
    const v = borner(input, (Number(input.value) || 0) + delta);
    if (v === Number(input.value)) return;
    input.value = String(v);
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

// Oui / Non : un seul écouteur délégué, comme les autres commandes du panneau.
document.addEventListener('click', (e) => {
    const b = e.target.closest('.cfg-on');
    if (!b) return;
    e.preventDefault();
    const groupe = b.parentElement;
    groupe.dataset.valeur = b.dataset.bool;
    groupe.querySelectorAll('.cfg-on').forEach(x =>
        x.classList.toggle('cfg-on--actif', x.dataset.bool === b.dataset.bool));
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.cfg-step');
    if (!btn) return;
    const input = btn.parentElement.querySelector('input[type="number"]');
    if (input) { e.preventDefault(); pousser(input, Number(btn.dataset.step)); }
});

// Les listes dépliantes : « tout cocher / tout décocher », et le résumé qui
// suit les cases. Écouteurs délégués, comme le reste du panneau — les champs
// sont reconstruits à chaque ouverture, brancher à la main les ferait
// s'empiler.
function majResumeListe(liste) {
    const boxes = [...liste.querySelectorAll('input[type="checkbox"]')];
    const resume = liste.querySelector('[data-resume]');
    if (!resume) return;
    resume.textContent = resumeListe(boxes.filter(b => b.checked).length, boxes.length,
        liste.dataset.mot || 'éléments');
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.cfg-liste-btn');
    if (!btn) return;
    e.preventDefault();
    const liste = btn.closest('.cfg-liste');
    liste.querySelectorAll('input[type="checkbox"]').forEach(b => { b.checked = btn.dataset.cocher === '1'; });
    majResumeListe(liste);
});

document.addEventListener('change', (e) => {
    const liste = e.target.closest && e.target.closest('.cfg-liste');
    if (liste) majResumeListe(liste);
});

// La molette : elle ne doit agir que sur un champ SURVOLÉ, jamais emporter la
// page avec elle — d'où le `preventDefault` et le `passive: false`.
document.addEventListener('wheel', (e) => {
    const st = e.target.closest('.cfg-stepper');
    if (!st) return;
    const input = st.querySelector('input[type="number"]');
    if (!input) return;
    e.preventDefault();
    pousser(input, e.deltaY < 0 ? 1 : -1);
}, { passive: false });

// Le glissé vertical sur le champ : le geste du curseur de volume. Utile au
// doigt sur tablette, où viser deux petits boutons est moins naturel que
// pousser le nombre vers le haut.
let glisse = null;
document.addEventListener('pointerdown', (e) => {
    const st = e.target.closest('.cfg-stepper');
    if (!st || e.target.closest('.cfg-step')) return;
    const input = st.querySelector('input[type="number"]');
    if (!input) return;
    glisse = { input, y: e.clientY, depart: Number(input.value) || 0, bouge: false };
});
document.addEventListener('pointermove', (e) => {
    if (!glisse) return;
    const d = Math.round((glisse.y - e.clientY) / 14);   // 14 px = un cran
    if (!d) return;
    glisse.bouge = true;
    const v = borner(glisse.input, glisse.depart + d);
    if (v !== Number(glisse.input.value)) {
        glisse.input.value = String(v);
        glisse.input.dispatchEvent(new Event('change', { bubbles: true }));
    }
});
document.addEventListener('pointerup', () => {
    // Un glissé n'ouvre pas le clavier : sinon il masquerait le nombre qu'on
    // vient de régler au doigt.
    if (glisse && glisse.bouge) glisse.input.blur();
    glisse = null;
});
document.addEventListener('pointercancel', () => { glisse = null; });

/**
 * LA VALEUR D'UN CHOIX EST CELLE DE L'OPTION, PAS UNE DEVINETTE SUR LA LISTE.
 *
 * Le DOM ne rend que des chaînes : « 2 » et « ia » en sortent pareils. On
 * décidait donc du type en regardant la PREMIÈRE option — si elle était un
 * nombre, tout le menu passait par `Number()`. Sur « Qui joue ? », dont les
 * choix sont `2`, `'ia'` et `1`, cela transformait « Contre l'ordinateur » en
 * `NaN` : le jeu ne se reconnaissait plus, retombait sur deux joueurs, et
 * l'ordinateur ne jouait jamais. C'est le bug que Rémy a vu.
 *
 * La valeur choisie est forcément l'une des options : on la retrouve par
 * comparaison de chaînes et on rend l'ORIGINALE, avec son type. Plus aucune
 * liste mixte ne peut se faire abîmer.
 */
function valeurChoisie(param, brut) {
    const trouvee = (param.options || []).find(o => String(valeurOption(o)) === String(brut));
    if (trouvee !== undefined) return valeurOption(trouvee);
    // Une valeur hors liste (un champ nombre, ou un réglage ancien) : on garde
    // l'ancienne règle, qui est juste dans ce cas-là.
    return param.type === 'number' ? Number(brut) : brut;
}

export function readParams(root, schema) {
    const out = {};
    schema.forEach(param => {
        if (param.type === 'multiselect') {
            const boxes = [...root.querySelectorAll(`[data-param="${param.id}"][data-kind="multiselect"]`)];
            out[param.id] = boxes.filter(b => b.checked).map(b => valeurChoisie(param, b.value));
        } else {
            const el = root.querySelector(`[data-param="${param.id}"]`);
            if (!el) return;
            if (el.dataset.kind === 'bool') { out[param.id] = el.dataset.valeur === 'true'; return; }
            if (param.type === 'number') { out[param.id] = Number(el.value); return; }
            out[param.id] = valeurChoisie(param, el.value);
        }
    });
    return out;
}

// --- Panneau « propriétés d'une étape » (éditeur professeur) ----------------

/**
 * Le nombre d'unités que PROPOSE une étape qui n'en fixe pas.
 *
 * Rémy : « mais du coup 10 paires c'est très court ». Dix était le nombre de
 * questions, et il valait pour tout le monde ; l'activité dit maintenant son
 * compte naturel, et le générateur, sa progression.
 */
export function conseilEtape(step) {
    const exo = getExerciseById(step && step.exerciseId) || (step && step.exercise) || {};
    return questionsConseillees(
        exo.generatorId ? getGenerator(exo.generatorId) : null,
        { ...(exo.params || {}), ...((step && step.overrides) || {}) },
        { activite: exo.activityId });
}

/**
 * @param {Object} step - étape v2 { exerciseId, overrides, nbItems, threshold, weight, timeLimit }
 * @param {(step:Object)=>void} onSave
 */
export function renderGameConfigUI(step, onSave, containerId = 'builder-config-content') {
    const content = document.getElementById(containerId);
    if (!content) return;

    const exo = getExerciseById(step.exerciseId) || step.exercise || {};
    const schema = paramSchemaOf(exo);
    const current = { ...(exo.params || {}), ...(step.overrides || {}) };

    content.innerHTML = `
        <div class="cfg-header">${exo.title || step.exerciseId}</div>
        ${exo.instruction ? `<p class="cfg-desc">${exo.instruction}</p>` : ''}
        ${schema.length ? `<div class="cfg-group">
            <div class="cfg-group-title">Contenu des questions</div>
            ${schema.map(p => fieldHtml(p, current[p.id] !== undefined ? current[p.id] : p.default)).join('')}
        </div>`
            : '<p class="cfg-empty">Cette activité n\'a pas de paramètre de contenu.</p>'}

        <div class="cfg-group cfg-group--bonus">
            <div class="cfg-group-title">Rôle de l'étape</div>
            <label class="cfg-case cfg-case--bonus">
                <input type="checkbox" id="cfg-bonus" ${step.bonus ? 'checked' : ''}>
                <span><b>🎁 Jeu de récompense</b><br>
                <span class="cfg-help">Cette étape n'est pas du travail : elle ne compte pas dans
                la note et ne s'ouvre que si les exercices placés AVANT elle sont réussis.</span></span>
            </label>
        </div>

        <div class="cfg-group" id="cfg-groupe-deroulement">
            <div class="cfg-group-title" id="cfg-titre-deroulement">Déroulement de l'étape</div>
            <p class="cfg-help" id="cfg-note-bonus" style="display:none">
                Une récompense doit quand même s'arrêter : donne-lui un nombre de
                questions, une durée, ou les deux — le premier atteint met fin au jeu.
            </p>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-nbitems">Nombre de questions</label>
                <input type="number" id="cfg-nbitems" class="cfg-input cfg-input--num" min="1" max="50" value="${step.nbItems || conseilEtape(step)}">
            </div>
            <div class="cfg-field" id="cfg-champ-seuil">
                <label class="cfg-label" for="cfg-threshold">Bonnes réponses exigées
                    ${infoBtn(null, 'cfg-threshold-tip')}</label>
                <input type="number" id="cfg-threshold" class="cfg-input cfg-input--num" min="1" max="50"
                       value="${step.threshold !== null && step.threshold !== undefined ? step.threshold : (step.nbItems || conseilEtape(step))}">
            </div>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-timelimit">Chronomètre (s)
                    ${infoBtn('0 = aucun chronomètre. Sinon, la durée en secondes.', null)}</label>
                <input type="number" id="cfg-timelimit" class="cfg-input cfg-input--num" min="0" max="600" value="${step.timeLimit || 0}">
            </div>
            <div class="cfg-field" id="cfg-scope-field">
                <label class="cfg-label" for="cfg-timescope">Le chrono s'applique
                    ${infoBtn(SCOPE_TIP, null)}</label>
                <select id="cfg-timescope" class="cfg-input">
                    <option value="etape" ${step.timerScope !== 'question' ? 'selected' : ''}>à toute l'étape</option>
                    <option value="question" ${step.timerScope === 'question' ? 'selected' : ''}>à chaque question</option>
                </select>
            </div>
            <div class="cfg-field" id="cfg-champ-poids">
                <label class="cfg-label" for="cfg-weight">Poids dans la note
                    ${infoBtn('Une étape de poids 2 compte double dans le barème.', null)}</label>
                <input type="number" id="cfg-weight" class="cfg-input cfg-input--num" min="1" max="10" value="${step.weight || 1}">
            </div>
        </div>`;

    // L'explication du seuil est chiffrée avec les valeurs courantes, et suit
    // la saisie : « 7 sur 10 » parle, « seuil » ne dit rien.
    const describeThreshold = () => {
        const tip = document.getElementById('cfg-threshold-tip');
        if (!tip) return;
        const nb = intVal('cfg-nbitems', 10);
        const seuil = Math.min(intVal('cfg-threshold', nb), nb);
        tip.dataset.tip = `L'élève doit réussir ${seuil} question${seuil > 1 ? 's' : ''} sur ${nb} `
            + `pour que l'étape soit validée. En dessous, il rejoue l'étape (en entraînement) `
            + `ou passe à la suivante sans la valider (en évaluation).`;
    };

    // Le choix « à chaque question / à toute l'étape » n'a de sens que s'il y
    // a un chronomètre.
    const toggleScope = () => {
        const field = document.getElementById('cfg-scope-field');
        if (field) field.style.display = intVal('cfg-timelimit', 0) > 0 ? '' : 'none';
    };

    // UN JEU DE RÉCOMPENSE N'A NI SEUIL NI POIDS : il ne se valide pas et ne
    // se note pas. Laisser ces deux champs visibles laisserait croire le
    // contraire.
    //
    // MAIS IL A UNE DURÉE. On cachait tout le bloc « Déroulement », donc le
    // nombre de questions ET le chronomètre avec — un Tetris de récompense
    // partait alors sur la valeur par défaut, sans que le professeur puisse
    // dire « cinq minutes » ni « dix questions ». Rémy : « pour les jeux bonus
    // il faut pouvoir choisir un nombre de questions et/ou une durée ». Ce
    // sont justement les deux seuls réglages qui comptent pour une récompense.
    const toggleBonus = () => {
        const bonusEl = document.getElementById('cfg-bonus');
        const bonus = !!(bonusEl && bonusEl.checked);
        const cacher = (id, off) => {
            const el = document.getElementById(id);
            if (el) el.style.display = off ? 'none' : '';
        };
        cacher('cfg-champ-seuil', bonus);
        cacher('cfg-champ-poids', bonus);
        const note = document.getElementById('cfg-note-bonus');
        if (note) note.style.display = bonus ? '' : 'none';
        const titre = document.getElementById('cfg-titre-deroulement');
        if (titre) titre.textContent = bonus ? 'Quand la récompense s\'arrête' : 'Déroulement de l\'étape';
    };

    const commit = () => {
        const overrides = readParams(content, schema);
        const nbItems = intVal('cfg-nbitems', 10);
        describeThreshold();
        toggleScope();
        toggleBonus();
        const scope = document.getElementById('cfg-timescope');
        const bonusEl = document.getElementById('cfg-bonus');
        const bonus = !!(bonusEl && bonusEl.checked);
        onSave({
            ...step,
            overrides,
            nbItems,
            threshold: Math.min(intVal('cfg-threshold', nbItems), nbItems),
            timeLimit: intVal('cfg-timelimit', 0) || null,
            timerScope: scope ? scope.value : 'etape',
            weight: intVal('cfg-weight', 1),
            bonus
        });
    };

    describeThreshold();
    toggleScope();
    toggleBonus();
    wireTips(content);
    content.addEventListener('change', commit);
    content.addEventListener('keyup', e => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'number') commit();
    });
}

// --- Réglages avant partie (élève) ------------------------------------------

export function showStudentConfigModal(exo, onStart) {
    const modal = document.getElementById('student-config-modal');
    const content = document.getElementById('student-config-content');
    if (!modal || !content) return onStart({ ...(exo.params || {}) });

    const schema = paramSchemaOf(exo);
    const current = { ...(exo.params || {}) };

    // Travailler sur papier : proposé quand l'exercice s'y prête, c'est-à-dire
    // dans deux cas — une GRILLE déclarée imprimable au catalogue, ou un
    // générateur dont les énoncés se suffisent en texte (`ecrit`). Le bouton
    // ouvre une modale d'aperçu ; les réglages choisis ICI (tables, opérations,
    // difficulté) sont ceux de la fiche, il n'y a pas deux endroits à régler.
    const gen = generateurDeFiche(exo);
    const surPapier = exo.printable ? 'grille' : (gen && gen.ecrit ? 'ecrit' : null);
    const impression = surPapier ? `
        <button type="button" class="cfg-print-btn cfg-print-btn--seul" id="btn-print-sheet">
            ${surPapier === 'ecrit' ? '📝 Fiche d\'exercices à imprimer…' : '📄 Travailler sur papier…'}
        </button>` : '';

    // SIMPLE DEVANT, AFFINABLE DERRIÈRE.
    //
    // Un panneau qui montre tout à tout le monde impose à chaque professeur le
    // niveau de détail du plus exigeant. On met donc devant ce qui se décide
    // en cinq secondes avant de distribuer les tablettes, et on replie le
    // reste sous « Affiner… ».
    //
    // MAIS UN REPLI NE CACHE JAMAIS CE QUI A ÉTÉ MODIFIÉ. Un réglage qui
    // s'écarte de son défaut et qu'on ne voit plus, c'est un exercice qui se
    // comporte bizarrement sans qu'on sache pourquoi — la même famille de
    // panne que les réglages sans effet corrigés cette semaine. Le repli
    // s'ouvre donc DÉJÀ OUVERT dès qu'il contient une valeur modifiée, et le
    // compte est écrit sur sa poignée.
    // COMBIEN DE QUESTIONS POUR VOIR TOUT L'EXERCICE.
    //
    // Dix, quoi qu'il arrive, tronquait toutes les progressions : « Additionner
    // des Relatifs » annonce douze marches à deux questions et n'en montrait
    // que cinq. Le générateur dit maintenant ce qu'il lui faut ; on le propose,
    // et l'infobulle explique pourquoi le nombre n'est pas celui qu'on croit.
    const generateurEcran = exo.generatorId ? getGenerator(exo.generatorId) : null;
    const conseil = questionsConseillees(generateurEcran, current, { activite: exo.activityId });
    const nbConseille = current.nbQuestions || conseil;
    // Le « pourquoi ce nombre » dépend de la NATURE de l'exercice : on ne
    // justifie pas vingt additions comme on justifie vingt-quatre marches.
    const aideDuree = generateurEcran && generateurEcran.duree === 'reflexe'
        ? 'Ici on cherche un réflexe, et un réflexe se construit par la répétition : '
            + 'la réponse doit finir par venir sans calculer. Dix questions n\'y suffisent pas.'
        : (conseil > 10
            ? `Cet exercice avance par marches : il en faut ${conseil} pour les parcourir toutes. `
                + 'En mettre moins n\'est pas un problème — on verra les premières.'
            : 'Autant de questions que l\'exercice en pose.');

    const valeurDe = (p) => current[p.id] !== undefined ? current[p.id] : p.default;
    const devant = schema.filter(p => !p.affiner);
    const derriere = schema.filter(p => p.affiner);
    const modifies = derriere.filter(p => current[p.id] !== undefined
        && String(current[p.id]) !== String(p.default));
    const replies = derriere.length ? `
        <details class="cfg-affiner" ${modifies.length ? 'open' : ''}>
            <summary class="cfg-affiner-tete">
                <span>Affiner${modifies.length
        ? ` · ${modifies.length} réglage${modifies.length > 1 ? 's' : ''} modifié${modifies.length > 1 ? 's' : ''}`
        : '…'}</span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                     stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div class="cfg-affiner-corps">
                ${derriere.map(p => fieldHtml(p, valeurDe(p))).join('')}
            </div>
        </details>` : '';

    content.innerHTML = `
        ${devant.map(p => fieldHtml(p, valeurDe(p))).join('')}
        <div class="cfg-field">
            <label class="cfg-label" for="cfg-nbitems">Nombre de questions${infoBtn(aideDuree)}</label>
            <div class="cfg-stepper" data-stepper>
                <button type="button" class="cfg-step" data-step="-1" tabindex="-1" aria-label="Diminuer">−</button>
                <input type="number" inputmode="numeric" id="cfg-nbitems" class="cfg-input cfg-input--num"
                    min="${MIN_QUESTIONS}" max="${MAX_QUESTIONS}" value="${nbConseille}">
                <button type="button" class="cfg-step" data-step="1" tabindex="-1" aria-label="Augmenter">+</button>
            </div>
        </div>
        ${replies}
        ${impression}`;

    wireTips(content);
    modal.style.display = 'flex';
    // Après l'affichage : une boîte encore masquée mesure zéro.
    requestAnimationFrame(() => marquerFondu(content));

    const btnPrint = document.getElementById('btn-print-sheet');
    if (btnPrint) {
        btnPrint.onclick = () => {
            // Les réglages COURANTS de la fenêtre, pas ceux du catalogue : ce
            // que le parent vient de choisir est ce qu'il veut sur la feuille.
            const params = { ...current, ...readParams(content, schema) };
            import('../ui/printSheet.js').then(m => m.ouvrirFicheModal(exo, params));
        };
    }

    document.getElementById('btn-student-config-cancel').onclick = () => { modal.style.display = 'none'; };
    document.getElementById('btn-student-config-start').onclick = () => {
        modal.style.display = 'none';
        onStart({
            ...current,
            ...readParams(content, schema),
            nbQuestions: intVal('cfg-nbitems', 10)
        });
    };
}

// --- Politique du parcours (mode et barème) ---------------------------------

/**
 * Éditeur de politique : c'est ici que le professeur bascule un parcours
 * d'entraînement en évaluation notée. Les deux réglages qui changent tout —
 * nombre d'essais et disponibilité des aides — sont pilotés par le mode, mais
 * restent ajustables.
 */
export function renderPolicyEditor(path, onChange, containerId = 'builder-policy-content') {
    const root = document.getElementById(containerId);
    if (!root) return;

    const p = resolvePolicy(path.policy);
    const isEval = p.mode === MODES.EVALUATION;
    const isLearn = p.mode === MODES.APPRENTISSAGE;
    const g = p.grading || {};

    root.innerHTML = `
        <div class="cfg-modes cfg-modes--3">
            <button type="button" class="cfg-mode ${isLearn ? 'cfg-mode--active' : ''}" data-mode="${MODES.APPRENTISSAGE}">
                <span class="cfg-mode-icon" aria-hidden="true">🌱</span>
                <span class="cfg-mode-title">Apprentissage</span>
                <span class="cfg-mode-desc">Leçon et robot avant de jouer, essais illimités, aides gratuites, bouton « Montre-moi ». Pour découvrir.</span>
            </button>
            <button type="button" class="cfg-mode ${!isEval && !isLearn ? 'cfg-mode--active' : ''}" data-mode="${MODES.ENTRAINEMENT}">
                <span class="cfg-mode-icon" aria-hidden="true">🎯</span>
                <span class="cfg-mode-title">Entraînement</span>
                <span class="cfg-mode-desc">Plusieurs essais, aides, correction immédiate. Sans note.</span>
            </button>
            <button type="button" class="cfg-mode ${isEval ? 'cfg-mode--active' : ''}" data-mode="${MODES.EVALUATION}">
                <span class="cfg-mode-icon" aria-hidden="true">📝</span>
                <span class="cfg-mode-title">Évaluation</span>
                <span class="cfg-mode-desc">Un seul essai, pas d'aide, note et bilan par compétence.</span>
            </button>
        </div>

        <div class="cfg-field">
            <label class="cfg-label" for="cfg-attempts">Essais autorisés par question</label>
            <input type="number" id="cfg-attempts" class="cfg-input" min="1" max="5" value="${p.maxAttemptsPerItem}">
        </div>
        <label class="cfg-check">
            <input type="checkbox" id="cfg-hints" ${p.hints ? 'checked' : ''}>
            Autoriser les indices
        </label>
        <label class="cfg-check">
            <input type="checkbox" id="cfg-adaptive" ${p.adaptive ? 'checked' : ''}>
            Cibler les notions fragiles de l'élève
        </label>

        <div class="cfg-group ${isEval ? '' : 'cfg-group--muted'}">
            <div class="cfg-group-title">Barème</div>
            <label class="cfg-check">
                <input type="checkbox" id="cfg-graded" ${p.grading ? 'checked' : ''}>
                Attribuer une note
            </label>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-scale">Note sur</label>
                <input type="number" id="cfg-scale" class="cfg-input" min="5" max="100" value="${g.scale || 20}">
            </div>
            <!-- Pleine largeur : les trois règles portent des noms longs, et
                 une liste déroulante large mangeait la colonne du libellé —
                 « Règle de calcul » et son explication s'imprimaient alors un
                 mot par ligne. -->
            <div class="cfg-field cfg-field--wide">
                <label class="cfg-label" for="cfg-rule">Règle de calcul</label>
                <select id="cfg-rule" class="cfg-input">
                    <option value="firstTry" ${g.rule === 'firstTry' ? 'selected' : ''}>Réussite du premier coup</option>
                    <option value="ratio" ${g.rule === 'ratio' ? 'selected' : ''}>Question résolue (essais illimités)</option>
                    <option value="ponderee" ${g.rule === 'ponderee' ? 'selected' : ''}>Pondérée (pénalité par essai et par aide)</option>
                </select>
                <p class="cfg-help">La note est recalculée à partir des réponses enregistrées : modifier le barème met à jour les bilans passés.</p>
            </div>
            <label class="cfg-check">
                <input type="checkbox" id="cfg-show-calc" ${g.showCalculation !== false ? 'checked' : ''}>
                Montrer à l'élève le détail du calcul de sa note
            </label>
        </div>

        <div class="cfg-group">
            <div class="cfg-group-title">🎁 Jeux de récompense</div>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-bonus-seuil">Réussite exigée
                    ${infoBtn('Le pourcentage de bonnes réponses qu\'il faut atteindre sur les '
                        + 'exercices placés avant un jeu pour que ce jeu s\'ouvre. '
                        + 'Quand tout le parcours est réussi à ce niveau, TOUS les jeux s\'ouvrent.', null)}</label>
                <input type="number" id="cfg-bonus-seuil" class="cfg-input cfg-input--num"
                       min="0" max="100" step="5" value="${Math.round(seuilDe(path) * 100)}">
                <span class="cfg-unite">%</span>
            </div>
            <p class="cfg-help">Une étape se déclare « jeu de récompense » dans ses propres
            réglages. Sans jeu dans le parcours, ce réglage ne sert à rien.</p>
        </div>`;

    const baseFor = (mode) => mode === MODES.EVALUATION ? evaluationPolicy()
        : mode === MODES.APPRENTISSAGE ? apprentissagePolicy()
            : defaultPolicy();

    const commit = () => {
        const graded = document.getElementById('cfg-graded').checked;
        const mode = root.querySelector('.cfg-mode--active').dataset.mode;
        const base = baseFor(mode);
        onChange({
            ...base,
            mode,
            maxAttemptsPerItem: intVal('cfg-attempts', base.maxAttemptsPerItem),
            hints: document.getElementById('cfg-hints').checked,
            adaptive: document.getElementById('cfg-adaptive').checked,
            grading: graded ? {
                scale: intVal('cfg-scale', 20),
                rule: document.getElementById('cfg-rule').value,
                penalties: { hint: 0.25, retry: 0.5 },
                arrondi: 0.5,
                showCalculation: document.getElementById('cfg-show-calc').checked
            } : null,
            // Le seuil des récompenses est une règle de la séance : il vit
            // avec les autres, et survit donc au changement de mode.
            bonusSeuil: Math.max(0, Math.min(100, intVal('cfg-bonus-seuil', 75))) / 100
        });
    };

    wireTips(root);
    root.querySelectorAll('[data-mode]').forEach(btn => {
        btn.onclick = () => {
            // Changer de mode réapplique les défauts du mode : c'est le sens
            // même du réglage, on ne conserve pas les réglages contradictoires.
            // Le seuil des récompenses, lui, n'a rien de contradictoire avec
            // un mode : il survit.
            // On relit le CHAMP, pas le parcours reçu au montage : sinon un
            // changement de mode rendrait au professeur le seuil qu'il avait
            // avant de le régler.
            const base = {
                ...baseFor(btn.dataset.mode),
                bonusSeuil: Math.max(0, Math.min(100, intVal('cfg-bonus-seuil', 75))) / 100
            };
            onChange(base);
            renderPolicyEditor({ ...path, policy: base }, onChange, containerId);
        };
    });
    root.addEventListener('change', commit);
}

function intVal(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const n = parseInt(el.value, 10);
    return isNaN(n) ? fallback : n;
}
