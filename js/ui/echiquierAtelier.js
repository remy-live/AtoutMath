// L'ATELIER D'ÉCHIQUIERS — composer ses propres diagrammes, et les imprimer.
//
// Rémy : « idéalement pour l'impression la possibilité (via modale) de créer sa
// grille avec drag drop des pièces pour l'impression (on peut en créer
// plusieurs) ».
//
// C'est le geste du professeur qui prépare un contrôle ou une fiche de club :
// il a une position en tête — la sienne, celle du manuel, celle de la partie
// d'hier —, il la pose sur un damier et il l'imprime. Aucun générateur ne peut
// la deviner ; c'est la seule chose de tout le logiciel qui ne se tire pas au
// sort.
//
// TROIS ZONES, ET RIEN D'AUTRE :
//
//   · la RÉSERVE   — les douze pièces, blanches et noires, plus la gomme ;
//   · le DAMIER    — on y dépose, on y glisse, on y reprend ;
//   · la PLANCHE   — les diagrammes déjà composés, avec leur légende.
//
// Poser une pièce se fait de DEUX façons, et il faut les deux : au clic (on
// choisit dans la réserve, on touche une case — c'est le geste du tableau
// blanc interactif) et au glissé (c'est le geste qu'on attend d'une souris).
// Une pièce déjà posée se déplace en la glissant, et se retire en la glissant
// hors du damier ou en la touchant avec la gomme.
//
// L'IMPRESSION N'EST PAS REFAITE ICI. Les diagrammes composés prennent la
// forme d'items ordinaires (`meta.quoi = 'atelier'`), et repartent dans la
// modale de fiche existante : même aperçu, même mise en page, même PDF que
// tous les autres échiquiers de l'application. Un second moteur d'impression
// aurait divergé du premier au premier correctif.

import { pieceSvg, TYPES, NOMS, direPiece } from './piecesEchecs.js';
import { ouvrirFicheModal } from './printSheet.js';

/** L'ordre de la réserve : du roi au pion, comme on présente un jeu. */
const ORDRE = ['K', 'Q', 'R', 'B', 'N', 'P'].filter(t => TYPES.includes(t));

const CASE = (x, y) => `${'abcdefgh'[x]}${8 - y}`;

/** La position de départ, en clair : c'est le point de repère de tout le monde. */
const RANGEE = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
function positionInitiale() {
    const out = [];
    for (let x = 0; x < 8; x++) {
        out.push({ x, y: 0, type: RANGEE[x], noir: true });
        out.push({ x, y: 1, type: 'P', noir: true });
        out.push({ x, y: 6, type: 'P', noir: false });
        out.push({ x, y: 7, type: RANGEE[x], noir: false });
    }
    return out;
}

const echapper = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** L'exercice fictif qui porte le rendu « échiquier » vers la modale de fiche. */
const EXO_ATELIER = {
    id: 'atelier-echiquier',
    title: 'Mes échiquiers',
    printable: 'echiquier'
};

let modal = null;

function assurerModale() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'echiquier-atelier';
    modal.className = 'modal-overlay modal-overlay--top';
    modal.innerHTML = `
        <div class="glass-panel modal-panel-lg ea-panel">
            <div class="ea-tete">
                <h2 class="ea-titre">♟ Atelier d'échiquiers</h2>
                <button type="button" class="ea-x" id="ea-fermer" aria-label="Fermer">✕</button>
            </div>
            <p class="ea-aide">Choisis une pièce, puis touche une case — ou glisse-la sur le damier.
                Une pièce posée se déplace en la glissant, et s'enlève avec la gomme.</p>
            <div class="ea-corps">
                <div class="ea-gauche">
                    <div class="ea-reserve" id="ea-reserve"></div>
                    <div class="ea-damier-wrap"><div class="ea-damier" id="ea-damier"></div></div>
                    <div class="ea-outils">
                        <button type="button" class="ea-btn" id="ea-depart">Position de départ</button>
                        <button type="button" class="ea-btn" id="ea-vider">Vider le damier</button>
                    </div>
                    <label class="ea-legende">Légende imprimée sous ce damier
                        <input type="text" id="ea-legende" maxlength="90"
                            placeholder="Les Blancs jouent et matent en deux coups"></label>
                    <label class="ea-legende">Question à écrire (facultatif)
                        <input type="text" id="ea-question" maxlength="40"
                            placeholder="Le coup :"></label>
                    <button type="button" class="ea-btn ea-btn--fort" id="ea-ajouter">
                        ＋ Ajouter ce diagramme à la planche</button>
                </div>
                <div class="ea-droite">
                    <div class="ea-planche-titre">La planche — <span id="ea-compte">0 diagramme</span></div>
                    <div class="ea-planche" id="ea-planche"></div>
                </div>
            </div>
            <div class="ea-pied">
                <button type="button" class="btn-secondary" id="ea-annuler">Fermer</button>
                <button type="button" class="btn-primary" id="ea-imprimer">🖨 Voir la fiche à imprimer</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    return modal;
}

/**
 * Ouvre l'atelier. Rien n'est conservé d'une ouverture à l'autre : une planche
 * qu'on retrouve trois semaines plus tard n'est plus celle qu'on voulait.
 */
export function ouvrirAtelierEchiquier() {
    const m = assurerModale();
    const damierEl = m.querySelector('#ea-damier');
    const reserveEl = m.querySelector('#ea-reserve');
    const plancheEl = m.querySelector('#ea-planche');
    const compteEl = m.querySelector('#ea-compte');
    const legendeEl = m.querySelector('#ea-legende');
    const questionEl = m.querySelector('#ea-question');

    /** Le damier courant : au plus une pièce par case. */
    let posees = [];
    /** Les diagrammes déjà composés. */
    let planche = [];
    /** Ce qu'on pose au prochain clic : { type, noir } ou 'gomme'. */
    let outil = { type: 'K', noir: false };

    const pieceEn = (x, y) => posees.find(p => p.x === x && p.y === y) || null;

    const poser = (x, y) => {
        posees = posees.filter(p => !(p.x === x && p.y === y));
        if (outil !== 'gomme') posees.push({ x, y, type: outil.type, noir: outil.noir });
        dessinerDamier();
    };

    // --- La réserve ---------------------------------------------------------
    function dessinerReserve() {
        const bouton = (type, noir) => {
            const actif = outil !== 'gomme' && outil.type === type && outil.noir === noir;
            return `<button type="button" class="ea-piece ${actif ? 'ea-piece--actif' : ''}"
                data-type="${type}" data-noir="${noir ? 1 : 0}" draggable="true"
                title="${echapper(direPiece(type, noir))}"
                aria-label="${echapper(direPiece(type, noir))}"
                aria-pressed="${actif}">
                <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
                    ${pieceSvg(type, noir, 1, 1, 38, 0.03)}</svg></button>`;
        };
        reserveEl.innerHTML = `
            <div class="ea-rangee">${ORDRE.map(t => bouton(t, false)).join('')}</div>
            <div class="ea-rangee">${ORDRE.map(t => bouton(t, true)).join('')}</div>
            <div class="ea-rangee">
                <button type="button" class="ea-piece ea-gomme ${outil === 'gomme' ? 'ea-piece--actif' : ''}"
                    data-gomme="1" aria-pressed="${outil === 'gomme'}"
                    title="Gomme — enlève la pièce touchée">🧽</button>
            </div>`;

        reserveEl.querySelectorAll('[data-type]').forEach(b => {
            b.onclick = () => {
                outil = { type: b.dataset.type, noir: b.dataset.noir === '1' };
                dessinerReserve();
            };
            b.ondragstart = (ev) => {
                ev.dataTransfer.setData('text/plain',
                    `neuve:${b.dataset.type}:${b.dataset.noir}`);
                ev.dataTransfer.effectAllowed = 'copy';
            };
        });
        reserveEl.querySelector('[data-gomme]').onclick = () => { outil = 'gomme'; dessinerReserve(); };
    }

    // --- Le damier ----------------------------------------------------------
    function dessinerDamier() {
        let html = '';
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const p = pieceEn(x, y);
                html += `<div class="ea-case ${(x + y) % 2 ? 'ea-case--sombre' : ''}"
                    data-x="${x}" data-y="${y}" role="button" tabindex="0"
                    aria-label="${CASE(x, y)}${p ? ' — ' + echapper(direPiece(p.type, p.noir)) : ''}">
                    ${p ? `<svg viewBox="0 0 40 40" class="ea-sur" draggable="true"
                        data-piece="${x},${y}" aria-hidden="true">
                        ${pieceSvg(p.type, p.noir, 1, 1, 38, 0.03)}</svg>` : ''}</div>`;
            }
        }
        damierEl.innerHTML = html;

        damierEl.querySelectorAll('[data-x]').forEach(c => {
            const x = Number(c.dataset.x), y = Number(c.dataset.y);
            c.onclick = () => poser(x, y);
            c.onkeydown = (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); poser(x, y); }
            };
            c.ondragover = (ev) => { ev.preventDefault(); c.classList.add('ea-case--vise'); };
            c.ondragleave = () => c.classList.remove('ea-case--vise');
            c.ondrop = (ev) => {
                ev.preventDefault();
                c.classList.remove('ea-case--vise');
                const d = String(ev.dataTransfer.getData('text/plain') || '').split(':');
                if (d[0] === 'neuve') {
                    posees = posees.filter(p => !(p.x === x && p.y === y));
                    posees.push({ x, y, type: d[1], noir: d[2] === '1' });
                } else if (d[0] === 'posee') {
                    const src = pieceEn(Number(d[1]), Number(d[2]));
                    if (!src) return;
                    posees = posees.filter(p => p !== src && !(p.x === x && p.y === y));
                    posees.push({ ...src, x, y });
                }
                dessinerDamier();
            };
        });
        damierEl.querySelectorAll('[data-piece]').forEach(sv => {
            sv.ondragstart = (ev) => {
                ev.stopPropagation();
                ev.dataTransfer.setData('text/plain', `posee:${sv.dataset.piece.replace(',', ':')}`);
                ev.dataTransfer.effectAllowed = 'move';
            };
        });
    }

    // GLISSER UNE PIÈCE HORS DU DAMIER LA RETIRE. C'est le geste du plateau
    // réel — on pousse la pièce sur le côté — et il n'a rien à voir avec la
    // gomme, qui sert à corriger au doigt sur une tablette.
    const zone = m.querySelector('.ea-damier-wrap');
    zone.ondragover = (ev) => ev.preventDefault();
    zone.ondrop = (ev) => {
        if (ev.target.closest('[data-x]')) return;
        ev.preventDefault();
        const d = String(ev.dataTransfer.getData('text/plain') || '').split(':');
        if (d[0] !== 'posee') return;
        posees = posees.filter(p => !(p.x === Number(d[1]) && p.y === Number(d[2])));
        dessinerDamier();
    };

    // --- La planche ---------------------------------------------------------
    function dessinerPlanche() {
        compteEl.textContent = planche.length <= 1
            ? `${planche.length} diagramme` : `${planche.length} diagrammes`;
        if (!planche.length) {
            plancheEl.innerHTML = '<div class="ea-vide">Compose une position, puis ajoute-la ici. '
                + 'Tu peux en mettre plusieurs sur la même feuille.</div>';
            return;
        }
        plancheEl.innerHTML = planche.map((d, i) => {
            const cote = 108, cell = cote / 8;
            let cases = '';
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
                cases += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"
                    fill="${(x + y) % 2 ? '#dfe5ee' : '#ffffff'}" stroke="#9aa3b2" stroke-width="0.4"/>`;
            }
            const pieces = d.posees.map(p =>
                pieceSvg(p.type, p.noir, p.x * cell, p.y * cell, cell, 0.05)).join('');
            return `<div class="ea-vignette">
                <svg viewBox="0 0 ${cote} ${cote}" width="${cote}" height="${cote}"
                     aria-label="Diagramme ${i + 1}">${cases}${pieces}</svg>
                <div class="ea-vignette-txt">${echapper(d.consigne) || '<i>sans légende</i>'}</div>
                <button type="button" class="ea-retirer" data-retirer="${i}"
                    aria-label="Retirer le diagramme ${i + 1}">✕</button>
            </div>`;
        }).join('');
        plancheEl.querySelectorAll('[data-retirer]').forEach(b => {
            b.onclick = () => { planche.splice(Number(b.dataset.retirer), 1); dessinerPlanche(); };
        });
    }

    // --- Les commandes ------------------------------------------------------
    m.querySelector('#ea-depart').onclick = () => { posees = positionInitiale(); dessinerDamier(); };
    m.querySelector('#ea-vider').onclick = () => { posees = []; dessinerDamier(); };
    m.querySelector('#ea-ajouter').onclick = () => {
        if (!posees.length) {
            import('./modal.js').then(x => x.showToast(
                'Le damier est vide : pose au moins une pièce avant d\'ajouter le diagramme.', 'warning'));
            return;
        }
        planche.push({
            posees: posees.map(p => ({ ...p, case: CASE(p.x, p.y) })),
            consigne: legendeEl.value.trim(),
            question: questionEl.value.trim()
        });
        dessinerPlanche();
    };
    m.querySelector('#ea-imprimer').onclick = () => {
        // Le damier en cours compte, même s'il n'a pas été « ajouté » : le
        // professeur qui compose UNE position et clique « imprimer » ne doit
        // pas découvrir une feuille vide.
        const tout = planche.slice();
        if (!tout.length && posees.length) {
            tout.push({
                posees: posees.map(p => ({ ...p, case: CASE(p.x, p.y) })),
                consigne: legendeEl.value.trim(),
                question: questionEl.value.trim()
            });
        }
        if (!tout.length) {
            import('./modal.js').then(x => x.showToast(
                'Il n\'y a encore aucun diagramme à imprimer.', 'warning'));
            return;
        }
        ouvrirFicheModal(EXO_ATELIER, {}, {
            nom: 'echiquiers',
            titre: 'Échiquiers',
            items: tout.map((d, i) => ({
                // La forme d'un item ordinaire : la fiche ne fait pas de
                // différence entre un diagramme composé et un diagramme tiré.
                prompt: { text: d.consigne || `Diagramme ${i + 1}`, html: '' },
                answer: '',
                meta: {
                    quoi: 'atelier', posees: d.posees,
                    consigne: d.consigne, question: d.question,
                    theme: d.posees.map(p => `${p.type}${p.noir ? 'n' : 'b'}${p.case}`).join('')
                }
            }))
        });
    };
    m.querySelector('#ea-fermer').onclick = () => { m.style.display = 'none'; };
    m.querySelector('#ea-annuler').onclick = () => { m.style.display = 'none'; };

    posees = positionInitiale();
    planche = [];
    legendeEl.value = '';
    questionEl.value = '';
    outil = { type: 'K', noir: false };
    dessinerReserve();
    dessinerDamier();
    dessinerPlanche();
    m.style.display = 'flex';
}

export { NOMS as NOMS_PIECES };
