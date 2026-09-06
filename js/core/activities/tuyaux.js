// Activité « Le circuit d'eau » : la grille de tuyaux qu'on tourne.
//
// TOUT LE JEU TIENT DANS UN GESTE, et l'écran ne doit pas en demander un
// deuxième. On touche un tuyau, il fait un quart de tour, l'eau avance ou elle
// fuit — et l'on voit tout de suite lequel des deux. Il n'y a donc ni bouton
// « vérifier », ni bouton « valider » : le circuit se déclare gagné tout seul
// quand l'eau atteint la dernière case sans fuir. Un « valider » ici serait
// demander à l'élève de confirmer ce qu'il a sous les yeux.
//
// LE DESSIN TOURNE, LES DONNÉES NE TOURNENT PAS DEUX FOIS.
// Chaque case garde ses bras d'ORIGINE et un compteur de quarts de tour. Le
// tuyau est dessiné une fois, puis la case entière est pivotée en CSS —
// `rotate(n × 90deg)`, avec une transition. C'est ce qui donne le mouvement du
// jeu ; redessiner la pièce à chaque geste la ferait sauter d'une position à
// l'autre. Les bras réels, eux, se recalculent par `tourner(base, tours)` : une
// seule vérité, et le dessin en est la conséquence.
//
// CE QUI NE TOURNE PAS RESTE DEHORS. La source et les gouttes de fuite vivent
// dans une couche fixe, par-dessus la pièce : une goutte qui tomberait de côté
// parce que son tuyau a pivoté serait un contresens, et un robinet qui tourne
// sur lui-même, un gag.

import { regTimeout } from '../timers.js';
import { hintBar } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import {
    NORD, EST, SUD, OUEST, DIRECTIONS, NOM_DIRECTION, HORAIRE, ANTIHORAIRE, NOM_SENS,
    tourner, formeDe, periodeDe, etatReseau, prochaineReparation, quartsMini, sensMini
} from '../tuyaux.js';

/** Où chaque bras rejoint le bord de la case, en coordonnées du dessin. */
const BOUT = { [NORD]: [50, 0], [EST]: [100, 50], [SUD]: [50, 100], [OUEST]: [0, 50] };

/** Où se pose la goutte d'une fuite : au bord, dans la direction qui fuit. */
const GOUTTE = { [NORD]: [50, 14], [EST]: [86, 50], [SUD]: [50, 86], [OUEST]: [14, 50] };

// UNE GOUTTE A UNE POINTE, ET C'EST TOUT CE QUI LA DISTINGUE D'UNE PASTILLE.
//
// Premier essai : la fuite était un disque, et la source aussi. À l'écran, deux
// ronds de même taille, l'un bleu cerclé de blanc, l'autre bleu cerclé de
// sombre — on ne savait plus lequel était l'arrivée d'eau. Une goutte se
// reconnaît à sa pointe, une source à son anneau : deux formes, pas deux
// nuances.
const GOUTTE_D = 'M0,-9 C6,-3 8,2 0,9 C-8,2 -6,-3 0,-9';

export function mount(container, session) {
    let destroyed = false;
    let cursor = null;

    let item = null;
    let base = [];        // les bras de chaque pièce, tels que tirés
    let tours = [];       // les quarts de tour appliqués, cumulés (signés)
    let quarts = 0;       // ce que l'élève a dépensé — pour la marche comptée
    let sens = HORAIRE;   // le sens du prochain quart de tour
    let fini = false;

    const dirsDe = (i) => tourner(base[i], tours[i]);
    const grille = () => ({
        lignes: item.meta.lignes, colonnes: item.meta.colonnes,
        source: item.meta.source, cases: base.map((_, i) => dirsDe(i))
    });

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        base = [...item.meta.depart];
        tours = base.map(() => 0);
        quarts = 0;
        sens = HORAIRE;
        fini = false;
        render();
    }

    // --- Le dessin ----------------------------------------------------------

    /**
     * UNE PIÈCE : sa gaine sombre, et l'eau dedans.
     *
     * Deux traits superposés, l'un plus épais que l'autre — c'est ce qui fait
     * lire « tuyau » plutôt que « trait ». Le second porte la couleur de l'eau
     * et ne change que de teinte quand la case se remplit : aucune géométrie ne
     * bouge, donc rien ne peut se décaler entre le sec et le mouillé.
     */
    function pieceSvg(dirs) {
        const traits = DIRECTIONS.filter(d => dirs & d)
            .map(d => `<line x1="50" y1="50" x2="${BOUT[d][0]}" y2="${BOUT[d][1]}"/>`).join('');
        // UN BOUT DE TUYAU PORTE SON BOUCHON. Sans lui, la pièce à un seul bras
        // ressemble à un tuyau coupé — et c'est justement celle qu'il ne faut
        // pas confondre avec une fuite.
        const bouchon = formeDe(dirs) === 'bout'
            ? `<circle class="tu-bouchon" cx="50" cy="50" r="17"/>` : '';
        return `<svg class="tu-piece" viewBox="0 0 100 100" aria-hidden="true">
            <g class="tu-gaine">${traits}</g>
            <g class="tu-eau">${traits}</g>
            ${bouchon}
        </svg>`;
    }

    function caseHtml(i) {
        const dirs = base[i];
        const bloque = periodeDe(dirs) === 1;
        const l = Math.floor(i / item.meta.colonnes) + 1;
        const c = (i % item.meta.colonnes) + 1;
        // UNE CROIX NE SE TOURNE PAS, ET L'ÉCRAN LE DIT. La toucher ne ferait
        // rien : la laisser réagir comme les autres ferait croire à un jeu qui
        // ne répond pas. Elle n'est donc pas un bouton.
        return `<${bloque ? 'div' : 'button type="button"'} class="tu-case${bloque ? ' tu-case--fixe' : ''}"
            data-i="${i}" ${bloque ? '' : `aria-label="Tuyau ligne ${l}, colonne ${c} — tourner d’un quart de tour"`}>
            ${pieceSvg(dirs)}
            <svg class="tu-sur" viewBox="0 0 100 100" aria-hidden="true">
                ${i === item.meta.source ? `<g class="tu-source">
                    <circle cx="50" cy="50" r="15"/>
                    <circle class="tu-source-oeil" cx="50" cy="50" r="6"/>
                </g>` : ''}
                <g class="tu-gouttes"></g>
            </svg>
        </${bloque ? 'div' : 'button'}>`;
    }

    function render() {
        const { lignes, colonnes, comptes, budget } = item.meta;
        const cases = base.map((_, i) => caseHtml(i)).join('');

        container.innerHTML = `
            <div class="tu-layout">
                <div class="tu-context">${item.prompt.html}</div>
                <div class="tu-barre">
                    ${comptes ? `<div class="tu-compteur" data-compteur>
                        <b data-quarts>0</b> <span>sur ${budget} quart${budget > 1 ? 's' : ''} de tour</span>
                    </div>` : '<div class="tu-avance" data-avance></div>'}
                    <button type="button" class="tu-sens" data-sens
                        aria-label="Sens de rotation : ${NOM_SENS[HORAIRE]}">
                        <span class="tu-sens-icone" aria-hidden="true">↻</span>
                        <span class="tu-sens-mot">sens des aiguilles</span>
                    </button>
                </div>
                <div class="tu-board" style="--tu-l:${lignes};--tu-c:${colonnes}"
                     role="group" aria-label="Circuit d’eau">${cases}</div>
                <div class="tu-actions">
                    <button type="button" class="tu-btn-recommencer" data-recommencer>
                        Tout remettre comme au début
                    </button>
                </div>
                <div class="tu-status" role="status"></div>
                ${hintBar(session)}
            </div>`;

        peindre();

        if (session.isDemo) {
            if (!session.frozen) runDemo();
            return;
        }
        brancherCases();
        brancherSens();
        brancherRecommencer();
        brancherIndices();
    }

    // --- L'état, repeint après chaque geste ---------------------------------

    const caseEl = (i) => container.querySelector(`.tu-case[data-i="${i}"]`);

    /**
     * REPEINDRE : l'eau, les fuites, l'avancement — et rien d'autre.
     *
     * Tout se relit dans `etatReseau`, sur la grille telle qu'elle est à cet
     * instant. Aucun état d'affichage n'est tenu à part, donc rien ne peut
     * diverger de ce que le noyau calcule ; c'est la même discipline que la
     * barre des marches du panneau de réglages.
     */
    function peindre() {
        const etat = etatReseau(grille());
        const parCase = new Map();
        etat.fuites.forEach(f => {
            if (!parCase.has(f.case)) parCase.set(f.case, []);
            parCase.get(f.case).push(f.dir);
        });

        base.forEach((_, i) => {
            const el = caseEl(i);
            if (!el) return;
            el.classList.toggle('tu-case--eau', etat.remplies[i]);
            el.classList.toggle('tu-case--fuite', parCase.has(i));
            const g = el.querySelector('.tu-gouttes');
            // LA GOUTTE SE POSE DANS LA COUCHE FIXE, à la direction RÉELLE du
            // bras qui fuit — celle d'après les rotations, pas celle du dessin.
            //
            // ET SA POSITION EST SUR LE GROUPE, SA CHUTE SUR LA GOUTTE. Une
            // animation CSS qui pose un `transform` ÉCRASE l'attribut
            // `transform` du SVG : placée puis animée sur le même nœud, la
            // goutte revenait à l'origine du dessin et tombait dans le coin
            // haut-gauche de la case, loin du tuyau qui fuit. Deux
            // transformations sur un seul nœud, c'est une de trop.
            g.innerHTML = (parCase.get(i) || []).map(d =>
                `<g transform="translate(${GOUTTE[d][0]} ${GOUTTE[d][1]})">
                    <path class="tu-goutte" d="${GOUTTE_D}"/>
                </g>`).join('');
        });

        const avance = container.querySelector('[data-avance]');
        if (avance) {
            const total = base.length;
            // COURT, PARCE QUE ÇA TIENT SUR UNE LIGNE OU ÇA POUSSE LA GRILLE.
            // « 2 cases sur 9 · ça fuit à 1 endroit » passait à la ligne sur un
            // téléphone, et le plateau descendait d'un cran à chaque fuite qui
            // apparaissait ou disparaissait — c'est-à-dire à chaque geste.
            avance.textContent = `${etat.nbRemplies} / ${total} cases`
                + `${etat.fuites.length ? ` · ${etat.fuites.length} fuite${etat.fuites.length > 1 ? 's' : ''}` : ''}`;
            avance.classList.toggle('tu-avance--fuite', etat.fuites.length > 0);
        }
        return etat;
    }

    function statut(texte, ton = '') {
        const el = container.querySelector('.tu-status');
        if (!el) return;
        el.textContent = texte;
        el.className = `tu-status${ton ? ` tu-status--${ton}` : ''}`;
    }

    // --- Les gestes ----------------------------------------------------------

    function pivoter(i, deQuarts) {
        tours[i] += deQuarts;
        const piece = caseEl(i).querySelector('.tu-piece');
        piece.style.transform = `rotate(${tours[i] * 90}deg)`;
    }

    function jouer(i) {
        if (session.locked || fini || destroyed) return;
        pivoter(i, sens);
        quarts++;
        const compte = container.querySelector('[data-quarts]');
        if (compte) {
            compte.textContent = String(quarts);
            container.querySelector('[data-compteur]')
                .classList.toggle('tu-compteur--depasse', quarts > item.meta.budget);
        }
        const etat = peindre();
        if (etat.complet) terminer();
    }

    function brancherCases() {
        container.querySelectorAll('.tu-case[data-i]:not(.tu-case--fixe)').forEach(el => {
            el.onclick = () => jouer(Number(el.dataset.i));
        });
    }

    function brancherSens() {
        const btn = container.querySelector('[data-sens]');
        btn.onclick = () => {
            sens = sens === HORAIRE ? ANTIHORAIRE : HORAIRE;
            btn.querySelector('.tu-sens-icone').textContent = sens === HORAIRE ? '↻' : '↺';
            btn.querySelector('.tu-sens-mot').textContent = sens === HORAIRE
                ? 'sens des aiguilles' : 'sens inverse';
            btn.setAttribute('aria-label', `Sens de rotation : ${NOM_SENS[sens]}`);
            btn.classList.toggle('tu-sens--inverse', sens === ANTIHORAIRE);
        };
    }

    function brancherRecommencer() {
        container.querySelector('[data-recommencer]').onclick = () => {
            if (session.locked || fini) return;
            // ON REVIENT AU DÉPART, ET LE COMPTEUR AVEC. C'est le bouton qui
            // rend le budget jouable : on essaie, on voit qu'on a dépensé trois
            // quarts de tour pour rien, on recommence en sachant où l'on va.
            // Sans lui, un budget dépassé condamnerait la grille dès le
            // troisième geste, ce qui n'apprend rien à personne.
            base.forEach((_, i) => { tours[i] = 0; });
            container.querySelectorAll('.tu-piece').forEach(p => { p.style.transform = ''; });
            quarts = 0;
            const compte = container.querySelector('[data-quarts]');
            if (compte) {
                compte.textContent = '0';
                container.querySelector('[data-compteur]').classList.remove('tu-compteur--depasse');
            }
            statut('');
            peindre();
        };
    }

    // --- La fin ---------------------------------------------------------------

    function terminer() {
        fini = true;
        const { comptes, budget } = item.meta;

        // LE CIRCUIT EST RELIÉ : c'est la seule chose que l'écran vérifie, et
        // elle se voit. Reste le budget, quand il y en a un — et là, on peut
        // avoir relié sans avoir réussi l'exercice.
        const dansLeBudget = !comptes || quarts <= budget;
        // LE VERT NE S'ALLUME PAS AVANT DE SAVOIR. Relier hors budget est un
        // échec de l'exercice : encadrer la grille en vert une demi-seconde
        // avant d'écrire « raté » féliciterait pour ce qu'on va reprocher.
        container.querySelector('.tu-board').classList.toggle('tu-board--ok', dansLeBudget);
        const result = session.submit(dansLeBudget ? 'circuit-relie' : 'circuit-trop-cher');
        if (result.ignored) return;

        statut(dansLeBudget
            ? (comptes ? `Relié en ${quarts} quart${quarts > 1 ? 's' : ''} de tour.` : 'Le circuit est complet !')
            : `Relié, mais en ${quarts} quarts de tour au lieu de ${budget}. `
                + `Recommence et choisis le sens le plus court pour chaque pièce.`,
        dansLeBudget ? 'ok' : 'ko');

        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) { renderNext(); return; }
            if (result.revealed) { montrerSolution(); regTimeout(renderNext, 2600); return; }
            // Raté pour le budget seulement : la grille reste sous les yeux,
            // et le bouton « recommencer » redevient la bonne porte.
            fini = false;
            container.querySelector('.tu-board').classList.remove('tu-board--ok');
        });
    }

    function montrerSolution() {
        item.meta.solution.forEach((cible, i) => {
            const k = quartsMini(dirsDe(i), cible);
            if (k) pivoter(i, sensMini(dirsDe(i), cible) * k);
        });
        peindre();
        container.querySelector('.tu-board').classList.add('tu-board--ok');
    }

    // --- Indices ---------------------------------------------------------------

    function brancherIndices() {
        const btn = container.querySelector('[data-hint]');
        if (!btn) return;
        btn.onclick = () => {
            const niveau = session.hintIndex;
            const h = session.hint();
            if (!h) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; return; }
            // LE TROISIÈME INDICE MONTRE LA PIÈCE, ET SEULEMENT ELLE. Il ne la
            // tourne pas : le geste reste celui de l'élève, sinon l'indice
            // devient la réponse.
            if (niveau >= 2) designerLaPiece();
            if (!session.hintsAvailable) { btn.disabled = true; btn.textContent = 'Plus d\'indice'; }
        };
    }

    function designerLaPiece() {
        const coup = prochaineReparation(grille(), item.meta.solution);
        container.querySelectorAll('.tu-case--indice')
            .forEach(e => e.classList.remove('tu-case--indice'));
        if (!coup) return;
        const el = caseEl(coup.case);
        if (!el) return;
        el.classList.add('tu-case--indice');
        statut(`Celle-ci : ${coup.quarts} quart${coup.quarts > 1 ? 's' : ''} de tour `
            + `${coup.sens === HORAIRE ? 'dans le sens des aiguilles' : 'dans le sens inverse'}.`, 'ok');
    }

    // --- Démonstration ---------------------------------------------------------

    async function runDemo() {
        if (!cursor) cursor = createDemoCursor();
        cursor.protegerZone(container.querySelector('.tu-board'));
        const gate = createDemoGate(container.querySelector('.tu-layout') || container);
        const fin = () => { cursor?.hideBubble(); gate?.destroy(); };

        if (!await cursor.pause(600) || destroyed) return fin();
        while (!destroyed) {
            const coup = prochaineReparation(grille(), item.meta.solution);
            if (!coup) break;
            if (!await gate.waitTurn() || destroyed) return fin();
            const el = caseEl(coup.case);
            if (!el) return fin();
            const dirs = dirsDe(coup.case);
            const ouverts = DIRECTIONS.filter(d => dirs & d).map(d => NOM_DIRECTION[d]);
            cursor.say(`Ce tuyau part vers ${ouverts.join(' et ')} : `
                + `${coup.quarts} quart${coup.quarts > 1 ? 's' : ''} de tour `
                + `${coup.sens === HORAIRE ? 'à droite' : 'à gauche'} et l’eau passe.`, el);
            for (let k = 0; k < coup.quarts; k++) {
                if (!await cursor.tap(el, 340) || destroyed) return fin();
                pivoter(coup.case, coup.sens);
                peindre();
                if (!await cursor.pause(320) || destroyed) return fin();
            }
            if (!await cursor.pause(700) || destroyed) return fin();
        }
        fin();
        if (destroyed) return;
        container.querySelector('.tu-board').classList.add('tu-board--ok');
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return;
        renderNext();
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        montrerSolution() { montrerSolution(); return true; },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
