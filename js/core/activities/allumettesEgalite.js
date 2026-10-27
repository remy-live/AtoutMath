// Activité « Les Allumettes à Déplacer » — on prend UN bâton, on le repose.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE GESTE EST CELUI DE LA TABLE : on prend une allumette, on la pose
// ailleurs. Deux touchers, et rien d'autre à apprendre. C'est le même geste au
// doigt et à la souris, et c'est pour cela qu'on ne propose ni glisser-déposer
// ni clavier : glisser sur un téléphone demande de viser pendant qu'on bouge,
// ce qu'un élève de sixième rate une fois sur trois.
//
// CE QU'ON NE PEUT PAS FAIRE, ET POURQUOI ON NE LE MONTRE MÊME PAS :
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

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { ecrirePlateau, relire } from '../generators/allumettesEgalite.js';

/** Les sept segments, et leur place dans la case d'un chiffre. */
const SEGMENTS = [
    { i: 0, sens: 'h', classe: 'ae-s0' }, // haut
    { i: 1, sens: 'v', classe: 'ae-s1' }, // haut-droite
    { i: 2, sens: 'v', classe: 'ae-s2' }, // bas-droite
    { i: 3, sens: 'h', classe: 'ae-s3' }, // bas
    { i: 4, sens: 'v', classe: 'ae-s4' }, // bas-gauche
    { i: 5, sens: 'v', classe: 'ae-s5' }, // haut-gauche
    { i: 6, sens: 'h', classe: 'ae-s6' }  // milieu
];

const NOMS = ['du haut', 'en haut à droite', 'en bas à droite', 'du bas',
    'en bas à gauche', 'en haut à gauche', 'du milieu'];

export function mount(container, session) {
    let destroyed = false;
    let item = null;
    /** D'où le bâton a été pris, et où il a été posé. */
    let retire = null, pose = null;

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
    }

    /** Une case de chiffre : sept emplacements, allumés ou non. */
    function chiffreHtml(cel, index) {
        return SEGMENTS.map(s => {
            const allume = !!(cel.m & (1 << s.i));
            const estPose = pose && pose[0] === index && pose[1] === s.i;
            const estRetire = retire && retire[0] === index && retire[1] === s.i;
            // `ae-touche` EST LA PORTE DE SORTIE DU DÉPÔT, pas un nom au hasard.
            // La feuille de style impose 44 px de haut à tout bouton de l'aire
            // de jeu — règle payée par « les 43 boutons étirés » — et elle
            // écrasait la hauteur des bandes : les zones mesuraient 44 px là où
            // la bande en faisait 31, donc elles SE RECOUVRAIENT de 13 px.
            // Vingt-quatre paires, mesurées par la sonde ; un doigt qui visait
            // le segment du milieu enlevait celui du haut. Cette règle-là
            // s'exempte d'elle-même sur les classes qui contiennent « touche »,
            // « case » ou « cell » : c'est le crochet prévu, on l'emploie.
            const classes = ['ae-seg', 'ae-touche', `ae-seg--${s.sens}`, s.classe,
                allume ? 'ae-seg--pleine' : 'ae-seg--vide',
                estPose ? 'ae-seg--posee' : '', estRetire ? 'ae-seg--trou' : '']
                .filter(Boolean).join(' ');
            const quoi = allume ? `Enlever l'allumette ${NOMS[s.i]}`
                : `Poser l'allumette ${NOMS[s.i]}`;
            return `<button type="button" class="${classes}" data-cel="${index}"
                     data-seg="${s.i}" aria-label="${quoi}"></button>`;
        }).join('');
    }

    function peindre() {
        const plateau = plateauCourant();
        const plan = container.querySelector('.ae-plateau');
        if (!plan) return;
        plan.innerHTML = plateau.cellules.map((cel, i) => {
            if (cel.t === '=') {
                return `<div class="ae-case ae-case--egal" aria-hidden="true">
                    <i class="ae-barre ae-barre--eh"></i><i class="ae-barre ae-barre--eb"></i>
                </div>`;
            }
            if (cel.t === 'o') {
                // SEULE LA BARRE VERTICALE EST UN BOUTON : enlever l'horizontale
                // ne laisserait aucun signe, et montrer un geste interdit, c'est
                // promettre qu'il marche.
                const vertAllumee = !!(cel.m & 0b10);
                const estPose = pose && pose[0] === i && pose[1] === 1;
                const estRetire = retire && retire[0] === i && retire[1] === 1;
                const cl = ['ae-seg', 'ae-touche', 'ae-seg--ov',
                    vertAllumee ? 'ae-seg--pleine' : 'ae-seg--vide',
                    estPose ? 'ae-seg--posee' : '', estRetire ? 'ae-seg--trou' : '']
                    .filter(Boolean).join(' ');
                return `<div class="ae-case ae-case--op">
                    <i class="ae-barre ae-barre--oh"></i>
                    <button type="button" class="${cl}" data-cel="${i}" data-seg="1"
                        aria-label="${vertAllumee ? 'Enlever la barre verticale du signe'
        : 'Poser une allumette en travers du signe'}"></button>
                </div>`;
            }
            return `<div class="ae-case ae-case--chiffre">${chiffreHtml(cel, i)}</div>`;
        }).join('');

        plan.querySelectorAll('[data-cel]').forEach(b => {
            b.onclick = () => toucher(Number(b.dataset.cel), Number(b.dataset.seg));
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
                    : 'Touche l\'allumette que tu veux déplacer.';
        }
        const plateauEl = container.querySelector('.ae-plateau');
        if (plateauEl) plateauEl.classList.toggle('ae-plateau--main', !!enMain);
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
            container.innerHTML = '';
            session.finish();
        }
    };
}
