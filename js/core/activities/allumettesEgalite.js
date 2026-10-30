// Activité « Les Allumettes à Déplacer » — on prend UN bâton, on le repose.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// DEUX GESTES, ET LE SECOND EST VENU DE RÉMY.
//
// Le premier est celui de la table : on touche une allumette, on touche un
// emplacement vide. Deux touchers, rien à apprendre, et c'est le même geste au
// doigt et à la souris.
//
// Le second, il l'a demandé le 27 octobre : « Il fuadrait pourvoir les prendre
// et les glisser ». Troisième demande de glisser-déposer en deux jours — après
// les jetons de la Grille de Nombres et les points du Dessin Gradué. Ici,
// prendre une allumette et la poser ailleurs EST le coup de l'énigme : deux
// touchers séparés le racontent moins bien qu'un geste continu.
//
// LES DEUX COHABITENT, et il le faut : glisser sur un téléphone demande de
// viser pendant qu'on bouge, ce qu'un élève de sixième rate une fois sur
// trois. On ne retire donc rien, on ajoute.
//
// ── CE QU'ON NE PEUT PAS FAIRE, ET POURQUOI ON NE LE MONTRE MÊME PAS ────────
//
//   · ENLEVER UNE ALLUMETTE SANS LA REPOSER. L'énoncé le dit — « elle doit se
//     reposer ailleurs » — et le bouton « Valider » reste donc éteint tant que
//     le bâton est en main.
//   · TOUCHER AU « = ». Une égalité dont on défait le signe d'égalité ne se
//     lit plus. Ses deux barres ne sont pas des boutons.
//   · ENLEVER LA BARRE HORIZONTALE DU SIGNE. Il ne resterait aucun signe. Elle
//     n'est pas un bouton non plus ; la barre VERTICALE, elle, en est un, et
//     c'est le coup que personne ne voit la première fois.
//
// ── LA PRISE EN MAIN EST UN ÉTAT, PAS UN DESSIN ─────────────────────────────
//
// On ne modifie jamais le plateau de l'énigme. On garde deux choses : d'OÙ le
// bâton a été pris, et OÙ il a été posé. Tout le reste se recalcule. C'est ce
// qui rend « Recommencer » exact et gratuit, et ce qui garantit qu'on ne peut
// pas déplacer deux allumettes sans s'en apercevoir.
//
// ── LE DESSIN EST EN SVG, ET LES BOUTONS SONT PAR-DESSUS ────────────────────
//
// Les bâtons étaient dessinés en pourcentages de leur zone de toucher : les
// horizontaux de 12 % à 88 % de leur largeur, les verticaux débordant de 34 %
// de leur hauteur. Deux repères différents, donc des coins qui ne se ferment
// pas — c'est le « un peu décalés » de Rémy, et il avait raison. La géométrie
// vit maintenant dans `allumettesDessin.js`, où les sept allumettes ont
// rigoureusement la même longueur ; les boutons, eux, pavent la case sans se
// recouvrir et ne dessinent plus rien.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { ecrirePlateau, relire } from '../generators/allumettesEgalite.js';
import { EMPLACEMENTS, ZONES, VUE, baton, batonsDuSigne, T, TETE } from '../allumettesDessin.js';

const NOMS = ['du haut', 'en haut à droite', 'en bas à droite', 'du bas',
    'en bas à gauche', 'en haut à gauche', 'du milieu'];

/** Le SVG d'une allumette : son corps, son reflet, sa tête. */
function batonSvg(e, classes, cle) {
    const { corps, tete } = baton(e);
    const r = T / 2;
    // LE REFLET EST UN RECTANGLE CLAIR SUR LE TIERS SUPÉRIEUR, et non un
    // dégradé : un dégradé SVG demande un `<defs>` avec un identifiant unique
    // par case, donc une gymnastique pour quinze allumettes à l'écran. Deux
    // rectangles disent la même chose du bois.
    const reflet = e.sens === 'h'
        ? { x: corps.x + 2, y: corps.y + 2, w: corps.w - 4, h: T * 0.26 }
        : { x: corps.x + 2, y: corps.y + 2, w: T * 0.26, h: corps.h - 4 };
    return `<g class="${classes}" ${cle}>
        <rect class="ae-bois" x="${corps.x}" y="${corps.y}" width="${corps.w}"
            height="${corps.h}" rx="${r}" />
        <rect class="ae-reflet" x="${reflet.x}" y="${reflet.y}" width="${reflet.w}"
            height="${reflet.h}" rx="${Math.min(reflet.w, reflet.h) / 2}" />
        <rect class="ae-tete" x="${tete.x}" y="${tete.y}" width="${tete.w}"
            height="${tete.h}" rx="${r}" />
    </g>`;
}

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** D'où le bâton a été pris, et où il a été posé. */
    let retire = null, pose = null;
    /** Le glisser en cours : d'où il part, et le fantôme qui suit le doigt. */
    let prise = null, fantome = null, depart = null, aGlisse = false;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    /** Le plateau tel qu'il est en ce moment : l'énigme, moins le retrait, plus la pose. */
    function plateauCourant() {
        const cellules = item.meta.cellules.map(c => ({ ...c }));
        if (retire) cellules[retire[0]].m &= ~(1 << retire[1]);
        if (pose) cellules[pose[0]].m |= (1 << pose[1]);
        return { cellules, nombres: item.meta.nombres, op: item.meta.op };
    }

    function render(prochain) {
        item = prochain;
        retire = null;
        pose = null;
        prise = null; depart = null; aGlisse = false;

        container.innerHTML = `
            <div class="ae-layout">
                <div class="ae-context">${item.prompt.html}</div>
                <div class="ae-plateau" role="group"
                     aria-label="L'égalité en allumettes"></div>
                <div class="ae-statut" role="status" aria-live="polite"></div>
                <div class="ae-actions">
                    <button type="button" class="ae-btn" data-recommencer>
                        ↺ Recommencer</button>
                    <button type="button" class="ae-btn ae-btn--fort" data-valider>
                        Valider</button>
                </div>
                ${hintBar(session)}
            </div>`;

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }
        wireHint(container, session);
        peindre();
        container.querySelector('[data-recommencer]').onclick = () => {
            retire = null; pose = null; peindre();
        };
        container.querySelector('[data-valider]').onclick = valider;
        brancherGlisser();
    }

    /** Une case de chiffre : le dessin, puis sept zones de toucher par-dessus. */
    function chiffreHtml(cel, index) {
        const dessin = EMPLACEMENTS.map(e => {
            const allume = !!(cel.m & (1 << e.i));
            const estPose = pose && pose[0] === index && pose[1] === e.i;
            const estRetire = retire && retire[0] === index && retire[1] === e.i;
            const cl = ['ae-bat',
                allume ? 'ae-bat--pleine' : 'ae-bat--vide',
                estPose ? 'ae-bat--posee' : '',
                estRetire ? 'ae-bat--trou' : '',
                prise && prise[0] === index && prise[1] === e.i ? 'ae-bat--prise' : ''
            ].filter(Boolean).join(' ');
            return batonSvg(e, cl, `data-bat="${e.i}"`);
        }).join('');

        const zones = EMPLACEMENTS.map(e => {
            const z = ZONES[e.i];
            const allume = !!(cel.m & (1 << e.i));
            // `ae-touche` EST LA PORTE DE SORTIE DU DÉPÔT, pas un nom au hasard.
            // La feuille de style impose 44 px de haut à tout bouton de l'aire
            // de jeu — règle payée par « les 43 boutons étirés » — et elle
            // écrasait la hauteur des bandes : les zones mesuraient 44 px là où
            // la bande en faisait 31, donc elles SE RECOUVRAIENT de 13 px.
            // Cette règle-là s'exempte d'elle-même sur les classes qui
            // contiennent « touche », « case » ou « cell » : on l'emploie.
            const quoi = allume ? `Enlever l'allumette ${NOMS[e.i]}`
                : `Poser l'allumette ${NOMS[e.i]}`;
            return `<button type="button" class="ae-seg ae-touche" data-cel="${index}"
                data-seg="${e.i}" aria-label="${quoi}"
                style="left:${z.gauche}%; top:${z.haut}%; width:${z.droite - z.gauche}%;
                       height:${z.bas - z.haut}%"></button>`;
        }).join('');

        return `<svg class="ae-dessin" viewBox="${VUE.x} ${VUE.y} ${VUE.w} ${VUE.h}"
            aria-hidden="true">${dessin}</svg>${zones}`;
    }

    function peindre() {
        const plateau = plateauCourant();
        const plan = container.querySelector('.ae-plateau');
        if (!plan) return;
        plan.innerHTML = plateau.cellules.map((cel, i) => {
            if (cel.t === '=') {
                const dessin = batonsDuSigne('=')
                    .map(e => batonSvg(e, 'ae-bat ae-bat--pleine', '')).join('');
                return `<div class="ae-case ae-case--egal" aria-hidden="true">
                    <svg class="ae-dessin" viewBox="${VUE.x} ${VUE.y} ${VUE.w} ${VUE.h}"
                        >${dessin}</svg>
                </div>`;
            }
            if (cel.t === 'o') {
                // SEULE LA BARRE VERTICALE EST UN BOUTON : enlever l'horizontale
                // ne laisserait aucun signe, et montrer un geste interdit, c'est
                // promettre qu'il marche.
                const bats = batonsDuSigne('+');
                const dessin = bats.map(e => {
                    const allume = !!(cel.m & (1 << e.i));
                    const estPose = pose && pose[0] === i && pose[1] === e.i;
                    const estRetire = retire && retire[0] === i && retire[1] === e.i;
                    const cl = ['ae-bat',
                        allume ? 'ae-bat--pleine' : 'ae-bat--vide',
                        estPose ? 'ae-bat--posee' : '',
                        estRetire ? 'ae-bat--trou' : '',
                        prise && prise[0] === i && prise[1] === e.i ? 'ae-bat--prise' : ''
                    ].filter(Boolean).join(' ');
                    return batonSvg(e, cl, `data-bat="${e.i}"`);
                }).join('');
                const vert = !!(cel.m & 0b10);
                return `<div class="ae-case ae-case--op">
                    <svg class="ae-dessin" viewBox="${VUE.x} ${VUE.y} ${VUE.w} ${VUE.h}"
                        aria-hidden="true">${dessin}</svg>
                    <button type="button" class="ae-seg ae-touche ae-seg--ov"
                        data-cel="${i}" data-seg="1"
                        aria-label="${vert ? 'Enlever la barre verticale du signe'
        : 'Poser une allumette en travers du signe'}"></button>
                </div>`;
            }
            return `<div class="ae-case ae-case--chiffre">${chiffreHtml(cel, i)}</div>`;
        }).join('');

        plan.querySelectorAll('[data-cel]').forEach(b => {
            b.onclick = () => {
                // LE CLIC QUI SUIT UN GLISSER EST AVALÉ. Un glisser au doigt
                // finit sans mouvement du curseur, donc le navigateur en DÉDUIT
                // une tape et envoie un `click` après : sans ce drapeau, les
                // deux chemins se déclenchent et l'allumette repart aussitôt.
                // Règle payée sur les jetons de la Grille de Nombres.
                if (b.dataset.glisse) { delete b.dataset.glisse; return; }
                toucher(Number(b.dataset.cel), Number(b.dataset.seg));
            };
            b.disabled = session.locked;
        });

        const enMain = retire && !pose;
        const valider = container.querySelector('[data-valider]');
        if (valider) valider.disabled = session.locked || !retire || !pose;
        const statut = container.querySelector('.ae-statut');
        if (statut) {
            statut.textContent = enMain
                ? 'L\'allumette est dans ta main : pose-la sur un emplacement vide.'
                : pose
                    ? 'Une allumette déplacée. Relis l\'égalité, puis valide.'
                    : 'Prends une allumette et glisse-la, ou touche-la puis touche sa place.';
        }
        plan.classList.toggle('ae-plateau--main', !!enMain);
        plan.classList.toggle('ae-plateau--glisse', !!prise);
    }

    /**
     * LE GLISSER, branché UNE FOIS sur le plateau.
     *
     * Il ne peut pas vivre sur les boutons : peindre les remplace tous, et un
     * glisser en cours perdrait son écouteur au premier mouvement. Le plateau,
     * lui, survit — et c'est lui qui capture le pointeur, pour que le doigt
     * puisse sortir d'une case sans lâcher l'allumette.
     */
    function brancherGlisser() {
        const plan = container.querySelector('.ae-plateau');
        if (!plan) return;

        /** L'emplacement sous ce point, s'il y en a un et qu'il est dans le plateau. */
        const sousLePoint = (x, y) => {
            const el = document.elementFromPoint(x, y);
            const b = el && el.closest ? el.closest('[data-cel]') : null;
            return (b && plan.contains(b)) ? b : null;
        };

        plan.addEventListener('pointerdown', (e) => {
            if (destroyed || session.locked || retire) return;
            const b = sousLePoint(e.clientX, e.clientY);
            if (!b) return;
            const cel = Number(b.dataset.cel), seg = Number(b.dataset.seg);
            if (!(plateauCourant().cellules[cel].m & (1 << seg))) return;
            prise = [cel, seg];
            depart = { x: e.clientX, y: e.clientY };
            aGlisse = false;
            // ON NE CAPTURE PAS LE POINTEUR ICI, et c'est une correction.
            //
            // `setPointerCapture` dès l'appui fait livrer le `click` qui suit
            // au PLATEAU au lieu du bouton : le double toucher — toucher
            // l'allumette, toucher sa place — cessait de marcher, sans erreur
            // ni trace. La capture ne sert qu'au glisser, pour que le doigt
            // puisse sortir d'une case sans lâcher ; on la prend donc au
            // premier mouvement, quand on sait que c'en est un.
        });

        plan.addEventListener('pointermove', (e) => {
            if (!prise || !depart || destroyed) return;
            if (!aGlisse
                && Math.abs(e.clientX - depart.x) + Math.abs(e.clientY - depart.y) < 8) return;
            if (!aGlisse) {
                aGlisse = true;
                try { plan.setPointerCapture(e.pointerId); } catch (err) { /* souris */ }
                montrerFantome();
                peindre();
            }
            poserFantome(e.clientX, e.clientY);
            const b = sousLePoint(e.clientX, e.clientY);
            const vide = b && !(plateauCourant()
                .cellules[Number(b.dataset.cel)].m & (1 << Number(b.dataset.seg)));
            plan.querySelectorAll('.ae-seg--cible').forEach(x => x.classList.remove('ae-seg--cible'));
            if (vide) b.classList.add('ae-seg--cible');
        });

        const lacher = (e) => {
            if (!prise) return;
            const depuis = prise, glisse = aGlisse;
            prise = null; depart = null; aGlisse = false;
            cacherFantome();
            if (glisse) {
                try { plan.releasePointerCapture(e.pointerId); } catch (err) { /* souris */ }
            }
            plan.querySelectorAll('.ae-seg--cible').forEach(x => x.classList.remove('ae-seg--cible'));
            // SANS GLISSER, ON NE REPEINT PAS — et c'est le contraire d'un
            // détail. Repeindre remplace TOUS les boutons ; celui qui allait
            // recevoir le `click` du navigateur disparaît du document, et le
            // clic ne se déclenche jamais. Le double toucher, qui ne demandait
            // rien à personne, cessait alors de marcher.
            if (!glisse) return;
            const b = sousLePoint(e.clientX, e.clientY);
            if (b) {
                const cel = Number(b.dataset.cel), seg = Number(b.dataset.seg);
                const occupe = !!(plateauCourant().cellules[cel].m & (1 << seg));
                if (!occupe && !(cel === depuis[0] && seg === depuis[1])) {
                    retire = depuis;
                    pose = [cel, seg];
                }
                // ON MARQUE LE BOUTON pour avaler le clic qui suit. En
                // pratique, le `peindre()` d'en dessous le remplace et le clic
                // se perd de lui-même — mais on ne veut pas que ce geste tienne
                // à un effet de bord de la peinture.
                b.dataset.glisse = '1';
            }
            peindre();
        };
        plan.addEventListener('pointerup', lacher);
        plan.addEventListener('pointercancel', () => {
            prise = null; depart = null; aGlisse = false; cacherFantome(); peindre();
        });
    }

    /** Le fantôme : une allumette seule qui suit le doigt, transparente aux clics. */
    function montrerFantome() {
        if (fantome) fantome.remove();
        fantome = document.createElement('div');
        fantome.className = 'ae-fantome';
        const long = ZONES[0].droite; // sans importance : la vue ci-dessous commande
        fantome.innerHTML = `<svg viewBox="-2 -2 ${long + 4} ${T + 4}">
            <rect class="ae-bois" x="0" y="0" width="${long}" height="${T}" rx="${T / 2}" />
            <rect class="ae-tete" x="0" y="0" width="${TETE}" height="${T}" rx="${T / 2}" />
        </svg>`;
        document.body.appendChild(fantome);
    }
    function poserFantome(x, y) {
        if (fantome) { fantome.style.left = `${x}px`; fantome.style.top = `${y}px`; }
    }
    function cacherFantome() {
        if (fantome) { fantome.remove(); fantome = null; }
    }

    function toucher(cel, seg) {
        if (destroyed || session.locked) return;
        const courant = plateauCourant().cellules[cel];
        const allume = !!(courant.m & (1 << seg));

        // REPRENDRE CELLE QU'ON VIENT DE POSER : c'est le geste qu'on fait
        // naturellement quand on s'est trompé d'emplacement, et sans lui il
        // faudrait passer par « Recommencer » pour corriger d'un demi-pas.
        if (pose && pose[0] === cel && pose[1] === seg) { pose = null; peindre(); return; }
        if (allume) {
            if (retire) return;           // une seule allumette à la fois
            retire = [cel, seg];
        } else {
            if (!retire || pose) return;  // il faut l'avoir en main
            pose = [cel, seg];
        }
        peindre();
    }

    function valider() {
        if (!retire || !pose || session.locked) return;
        const result = session.submit(ecrirePlateau(plateauCourant()));
        if (result.ignored) return;
        const plateauEl = container.querySelector('.ae-plateau');
        if (plateauEl) {
            plateauEl.classList.toggle('ae-plateau--ok', !!result.correct);
            if (!result.correct) {
                plateauEl.classList.add('ae-plateau--secoue');
                regTimeout(() => plateauEl.classList.remove('ae-plateau--secoue'), 400);
            }
        }
        const lu = relire(plateauCourant());
        const statut = container.querySelector('.ae-statut');
        if (statut && !result.correct) {
            // ON DIT CE QUE L'ÉGALITÉ RACONTE MAINTENANT, pas « c'est faux » :
            // l'élève a besoin de relire son propre geste pour comprendre où
            // il s'est trompé, et il ne relit pas un dessin tout seul.
            statut.textContent = lu
                ? `Tu as écrit ${lu.a} ${lu.signe === 0b11 ? '+' : '−'} ${lu.b} = ${lu.c}, `
                    + 'et ce n\'est pas encore vrai.'
                : 'Ce dessin ne se lit pas comme des chiffres. Reprends ton allumette.';
        }
        result.dismissed.then(() => {
            if (destroyed) return;
            renderNext();
        });
    }

    /** Le robot montre le geste : il prend l'allumette, attend, la pose. */
    async function runDemo() {
        peindre();
        const avant = item.meta.cellules;
        const apres = item.meta.solution;
        for (let i = 0; i < avant.length && !destroyed; i++) {
            if (avant[i].t === '=') continue;
            for (let s = 0; s < 7; s++) {
                const etait = !!(avant[i].m & (1 << s));
                const est = !!(apres[i].m & (1 << s));
                if (etait && !est) retire = [i, s];
                if (!etait && est) pose = [i, s];
            }
        }
        const garde = pose;
        pose = null;
        peindre();
        await new Promise(r => regTimeout(r, 900));
        if (destroyed) return;
        pose = garde;
        peindre();
        await new Promise(r => regTimeout(r, 1100));
        if (!destroyed) regTimeout(renderNext, 700);
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            cacherFantome();
            container.innerHTML = '';
            session.finish();
        }
    };
}
