// LES DOMINOS — la planche, à l'écran.
//
// Le noyau (core/dominos.js) monte la chaîne, type chaque moitié (question ou
// réponse), trace le serpentin et dit quelles moitiés se touchent. Ici on
// dessine la planche, on écoute les doigts, et on tient les promesses qui font
// l'intérêt du jeu :
//
//   · LE PLATEAU EST DESSINÉ AVANT LA PREMIÈRE PIÈCE. Le serpentin est tracé,
//     les emplacements sont vides : l'élève voit la forme de ce qu'il doit
//     reconstituer, et combien de pièces cela demande. Une chaîne qui pousse
//     au fur et à mesure ne montre rien de tout cela.
//   · TOUTES LES PIÈCES ONT LA MÊME TAILLE, et leurs deux moitiés sont
//     CARRÉES. C'est ce qui en fait des dominos et non des étiquettes : on les
//     reconnaît de loin, on les manipule sans les lire. Le texte s'adapte à la
//     pièce, jamais l'inverse.
//   · ELLES S'AIMANTENT. On lâche une pièce à peu près sur un emplacement, et
//     elle s'y range. Viser au pixel près n'apprend rien à personne.
//   · ET ON PEUT SE CONTENTER D'UN CLIC. Le glissé est agréable à la souris ;
//     sur une tablette posée à plat, c'est le geste qui rate. Toucher une
//     pièce de la réserve la range dans le premier emplacement libre.
//   · AUCUNE POSE N'EST REFUSÉE. Le jeu qui repousse la mauvaise pièce corrige
//     à la place de l'élève : il finit par les essayer une à une jusqu'à ce
//     que ça passe. Ici il décide, puis « Vérifier » entoure les jointures qui
//     ne collent pas.
//
// L'aide et le robot disent tous deux la MÊME chose, et jamais la réponse
// nue : « l'emplacement d'avant se termine par 7 × 8, donc je cherche 56 ».
// C'est la méthode qu'on veut laisser à l'élève, pas la pièce.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    QUESTION, BOUT,
    cheminSerpentin, boiteDe, plateauVide, casePiece, poserEnCase, retirerDeCase,
    retournerCase, plateauFini, verifierPlateau, prochaineCase, direJoint,
    reserveMelangee, demiDe, ajusterAuCarre, insecable
} from '../core/dominos.js';
import { chaineDepuisGenerateur, sourceDe } from '../core/generators/dominos.js';

const COMPETENCE = 'num.logique.dominos';

// L'aimant : on lâche à peu près, la pièce se range. Au-delà, c'est qu'on
// visait ailleurs — la pièce repart en réserve.
const AIMANT = 1.4;

class Dominos extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'dominos');
        this.rng = makeRng(this.params.seed);
        this.source = sourceDe(this.params.source);
        this.nbPieces = Number(this.params.pieces) || 9;
        this.reussis = 0;
        this.aidesUtilisees = 0;
        this.choisie = -1;      // l'emplacement sélectionné, pour ↻ et ↩
    }

    render() {
        this.container.innerHTML = `
            <style>
                .dm-wrap {
                    display: flex; flex-direction: column; gap: 7px; width: 100%; height: 100%;
                    align-items: center; padding: 8px 10px 12px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: inline-size;
                    --dm-cote: 52px;
                }
                .dm-tete { text-align: center; font-size: .95rem; flex: 0 0 auto; }
                .dm-consigne { color: var(--text-muted); font-size: .82rem; }
                .dm-zone {
                    font-size: .74rem; font-weight: 800; color: var(--text-muted);
                    letter-spacing: .04em; text-transform: uppercase; align-self: flex-start;
                }

                /* LA PLANCHE. Les emplacements sont posés en absolu sur une
                   grille de cellules : c'est le serpentin du noyau, à l'échelle
                   qui tient dans le cadre. */
                /* PAS DE CADRE AUTOUR DE LA PLANCHE. Le serpentin ne remplit
                   pas son rectangle : un virage occupe deux rangées de cellules
                   pour une seule colonne, et la rangée du milieu reste vide.
                   Encadré, ce vide ressemblait à une erreur de mise en page ;
                   sans cadre, c'est la FORME du serpentin qu'on voit, et c'est
                   elle qui dit ce qu'il y a à reconstituer. */
                .dm-plateau { position: relative; flex: 0 0 auto; margin: 0 auto; }
                .dm-case {
                    position: absolute; box-sizing: border-box; display: flex;
                    border: 2px dashed color-mix(in srgb, var(--text-muted) 42%, transparent);
                    border-radius: 9px; overflow: hidden;
                }
                .dm-trou { flex: 1 1 0; }
                .dm-case--h .dm-trou + .dm-trou { border-left: 2px dashed color-mix(in srgb, var(--text-muted) 32%, transparent); }
                .dm-case--v .dm-trou + .dm-trou { border-top: 2px dashed color-mix(in srgb, var(--text-muted) 32%, transparent); }
                /* Pendant un glissement, les emplacements libres s'allument :
                   on voit où la pièce peut aller avant de lâcher. */
                .dm-case--ouverte { border-color: color-mix(in srgb, var(--primary) 60%, transparent); }
                .dm-case--visee {
                    border-style: solid; border-color: var(--success, #16a34a);
                    background: color-mix(in srgb, var(--success, #16a34a) 15%, transparent);
                }

                /* LA PIÈCE : deux moitiés CARRÉES, un trait au milieu. Elle
                   épouse son emplacement — c'est lui qui décide du sens. */
                .dm-piece {
                    display: flex; align-items: stretch; box-sizing: border-box;
                    border: 2px solid var(--text-main); border-radius: 9px;
                    background: var(--bg-panel); overflow: hidden; position: absolute;
                    user-select: none; -webkit-tap-highlight-color: transparent;
                    touch-action: none; cursor: grab;
                }
                .dm-piece--v { flex-direction: column; }
                .dm-demi {
                    flex: 1 1 0; display: flex; box-sizing: border-box;
                    align-items: center; justify-content: center; text-align: center;
                    padding: 2px; line-height: 1.1; font-weight: 800; overflow: hidden;
                    color: var(--text-main);
                    /* On ne coupe JAMAIS au milieu d'un mot : un nombre scié en
                       deux ne se lit plus. La taille de police garantit que le
                       plus long mot tient — voir ajusterAuCarre. */
                    word-break: normal; overflow-wrap: normal;
                }
                .dm-demi--question { background: color-mix(in srgb, #fcd34d 26%, var(--bg-panel)); }
                .dm-demi--reponse { background: color-mix(in srgb, #7dd3fc 26%, var(--bg-panel)); }
                .dm-demi--bout { background: color-mix(in srgb, #c4b5fd 34%, var(--bg-panel)); letter-spacing: .04em; }
                .dm-piece:not(.dm-piece--v) .dm-demi + .dm-demi { border-left: 2px solid var(--text-main); }
                .dm-piece--v .dm-demi + .dm-demi { border-top: 2px solid var(--text-main); }

                .dm-piece--choisie { box-shadow: 0 0 0 3px var(--primary); z-index: 3; }
                /* LA JOINTURE FAUTIVE S'ENTOURE. On ne dit pas « c'est faux » :
                   on montre OÙ, et l'élève relit ce joint-là. */
                .dm-piece--joint { outline: 3px solid var(--danger, #dc2626); outline-offset: 2px; z-index: 2; }
                .dm-piece--posee { animation: dm-pose .3s ease; }
                @keyframes dm-pose { from { transform: scale(.7); opacity: .2; } }

                /* LA RÉSERVE PRÉSENTE LES PIÈCES DEBOUT, comme on les tient en
                   main avant de les poser à plat : on distingue d'un coup d'œil
                   ce qui reste à jouer de ce qui est sur la planche. */
                .dm-reserve {
                    display: flex; flex-wrap: wrap; justify-content: center;
                    gap: 6px; width: 100%; flex: 0 0 auto; min-height: 12px;
                }
                .dm-piece--reserve {
                    position: relative; flex-direction: column; flex: 0 0 auto;
                    width: var(--dm-cote); height: calc(var(--dm-cote) * 2);
                    transition: transform .12s ease, box-shadow .12s ease;
                }
                .dm-piece--reserve .dm-demi + .dm-demi { border-top: 2px solid var(--text-main); border-left: 0; }
                .dm-piece--reserve:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.17); }
                .dm-piece--vole {
                    position: fixed; z-index: 9999; pointer-events: none; cursor: grabbing;
                    box-shadow: 0 10px 26px rgba(0,0,0,.3); opacity: .95;
                }

                .dm-barre { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .dm-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 12px; font-size: .88rem;
                }
                .dm-btn:disabled { opacity: .4; cursor: default; }
                /* « Vérifier » est LE geste de fin : il se voit. (Déclaré après
                   .dm-btn, sans quoi le fond neutre l'emporterait.) */
                .dm-btn--verifier { border-color: var(--primary); background: var(--primary); color: #fff; }
                .dm-note {
                    min-height: 2.6em; text-align: center; font-size: .86rem;
                    color: var(--text-muted); max-width: 660px; flex: 0 0 auto; padding: 0 8px;
                }
                .dm-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .dm-note--ko { color: var(--danger, #dc2626); font-weight: 600; }
            </style>
            <div class="dm-wrap" data-wrap>
                <div class="dm-tete" data-tete></div>
                <div class="dm-zone">La planche</div>
                <div class="dm-plateau" data-plateau></div>
                <div class="dm-zone">La réserve</div>
                <div class="dm-reserve" data-reserve></div>
                <div class="dm-barre">
                    <button type="button" class="dm-btn dm-btn--verifier" data-verifier>✓ Vérifier</button>
                    <button type="button" class="dm-btn" data-tourner disabled>↻ Retourner</button>
                    <button type="button" class="dm-btn" data-reprendre disabled>↩ Reprendre</button>
                    <button type="button" class="dm-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="dm-btn" data-recommencer>↺ Recommencer</button>
                    <button type="button" class="dm-btn" data-neuf>Autre jeu</button>
                </div>
                <div class="dm-note" data-note></div>
            </div>`;

        this.wrapEl = this.container.querySelector('[data-wrap]');
        this.teteEl = this.container.querySelector('[data-tete]');
        this.plateauEl = this.container.querySelector('[data-plateau]');
        this.reserveEl = this.container.querySelector('[data-reserve]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.btnTourner = this.container.querySelector('[data-tourner]');
        this.btnReprendre = this.container.querySelector('[data-reprendre]');

        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-recommencer]').onclick = () => this.recommencer();
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
        this.btnTourner.onclick = () => this.retournerChoisie();
        this.btnReprendre.onclick = () => this.reprendreChoisie();

        // La planche se remesure quand le cadre change : une tablette qu'on
        // tourne n'a plus la même largeur, et le serpentin doit se replier
        // autrement.
        if (typeof ResizeObserver === 'function') {
            let l = 0, h = 0;
            this.obs = new ResizeObserver(() => {
                const r = this.wrapEl.getBoundingClientRect();
                if (Math.abs(r.width - l) < 8 && Math.abs(r.height - h) < 8) return;
                l = r.width; h = r.height;
                if (this.chaine) { this.mesurer(); this.dessiner(); }
            });
            this.obs.observe(this.wrapEl);
        }
    }

    startGameLoop() { this.poser(); }

    // --- Un jeu de dominos --------------------------------------------------

    poser() {
        const voulu = Math.max(3, this.nbPieces - 1);
        this.chaine = chaineDepuisGenerateur(this.source.id, this.params.sourceParams || {}, voulu, this.rng);
        this.recommencer();
        return true;
    }

    recommencer() {
        this.etat = plateauVide(this.chaine.pieces.length);
        this.reserve = reserveMelangee(this.chaine, this.rng);
        this.choisie = -1;
        this.derniere = -1;
        this.teteEl.innerHTML = `<b>Dominos — ${echapper(this.source.label)}</b><br>
            <span class="dm-consigne">La planche est tracée : range chaque pièce dans son emplacement.
            Glisse-la, ou touche-la simplement. « Vérifier » entoure les jointures fausses.</span>`;
        this.mesurer();
        this.dessiner();
        this.note('');
    }

    /**
     * La taille des cases, et le pli du serpentin.
     *
     * On essaie chaque repliement et on garde celui qui donne les plus grandes
     * cases : sur un téléphone c'est un serpentin étroit et haut, sur une
     * tablette une planche large. La planche ne doit pas manger plus de la
     * moitié du cadre — il reste la réserve à montrer.
     */
    mesurer() {
        const n = this.chaine.pieces.length;
        // 40 px : les marges du cadre et de la planche. Les oublier faisait
        // déborder la planche de quelques pixels — assez pour que la page
        // parte en défilement horizontal sur un téléphone.
        const large = Math.max(200, (this.wrapEl.clientWidth || 340) - 40);
        const haut = Math.max(150, (this.container.clientHeight || 480) * 0.44);
        let meilleur = null;
        for (let k = 2; k <= 7; k++) {
            const chemin = cheminSerpentin(n, k);
            const cote = Math.min(large / chemin.colonnes, haut / chemin.lignes, 74);
            // À égalité — c'est-à-dire quand tout tient — on préfère la planche
            // la plus large : moins de rangées, donc moins de virages à suivre.
            if (!meilleur || cote >= meilleur.cote) meilleur = { cote, chemin };
        }
        this.chemin = meilleur.chemin;
        this.cote = Math.max(30, Math.round(meilleur.cote));
        // La réserve tient dans un coin d'écran : ses pièces ne suivent la
        // planche que jusqu'à une certaine taille.
        this.coteReserve = Math.min(this.cote, 46);
        this.wrapEl.style.setProperty('--dm-cote', `${this.coteReserve}px`);
    }

    // --- Le dessin ----------------------------------------------------------

    /**
     * Le texte d'une moitié, à la taille qui l'y fait entrer. Une moitié fait
     * un carré : c'est au texte de s'y plier, jamais à la pièce de s'étirer.
     * Et un NOMBRE ne se coupe pas en deux : le plus long mot doit tenir sur
     * sa ligne — « 0043,1000 » rapetisse, il ne devient pas « 0043,1 000 ».
     */
    demiHtml(piece, cote, retourne, taille) {
        const d = demiDe(piece, cote, retourne);
        const genre = d.type === BOUT ? 'bout' : (d.type === QUESTION ? 'question' : 'reponse');
        // Un calcul court est soudé par des espaces insécables : « 10 × 3 »
        // reste sur une ligne au lieu de se lire en deux fois.
        const texte = insecable(d.texte);
        return `<span class="dm-demi dm-demi--${genre}"
            style="font-size:${Math.round(taille * ajusterAuCarre(texte))}px">${echapper(texte)}</span>`;
    }

    /** Une pièce rangée dans son emplacement : c'est la case qui décide du sens. */
    pieceHtml(index) {
        const pose = this.etat.cases[index];
        const b = boiteDe(this.chemin.cases[index]);
        const piece = this.chaine.pieces[pose.id];
        // Le chemin peut traverser la case à l'envers : on écrit alors les deux
        // moitiés dans l'autre ordre, pour que la chaîne se lise le long du
        // serpentin et non contre lui.
        const ordre = b.inverse ? [1, 0] : [0, 1];
        const classes = ['dm-piece', b.h === 2 ? 'dm-piece--v' : ''];
        if (index === this.choisie) classes.push('dm-piece--choisie');
        if (index === this.derniere) classes.push('dm-piece--posee');
        return `<div class="${classes.join(' ')}" data-posee="${index}" data-piece="${pose.id}"
            style="left:${b.x * this.cote}px; top:${b.y * this.cote}px;
                   width:${b.l * this.cote}px; height:${b.h * this.cote}px">
            ${this.demiHtml(piece, ordre[0], pose.retourne, this.cote)}
            ${this.demiHtml(piece, ordre[1], pose.retourne, this.cote)}
        </div>`;
    }

    dessiner() {
        const c = this.cote;
        const cases = this.chemin.cases.map((slot, i) => {
            if (this.etat.cases[i]) return this.pieceHtml(i);
            const b = boiteDe(slot);
            return `<div class="dm-case ${b.h === 2 ? 'dm-case--v' : 'dm-case--h'}" data-case="${i}"
                style="left:${b.x * c}px; top:${b.y * c}px; width:${b.l * c}px; height:${b.h * c}px">
                <div class="dm-trou"></div><div class="dm-trou"></div>
            </div>`;
        }).join('');

        this.plateauEl.style.width = `${this.chemin.colonnes * c}px`;
        this.plateauEl.style.height = `${this.chemin.lignes * c}px`;
        this.plateauEl.innerHTML = cases;

        this.reserveEl.innerHTML = this.reserve.map(id => {
            const piece = this.chaine.pieces[id];
            const t = this.coteReserve;
            return `<div class="dm-piece dm-piece--reserve dm-piece--v" data-piece="${id}">
                ${this.demiHtml(piece, 0, false, t)}${this.demiHtml(piece, 1, false, t)}
            </div>`;
        }).join('');

        this.plateauEl.querySelectorAll('[data-posee]').forEach(el => {
            const index = Number(el.dataset.posee);
            el.onpointerdown = (ev) => this.commencerGlisse(ev, el, index);
        });
        this.reserveEl.querySelectorAll('[data-piece]').forEach(el => {
            el.onpointerdown = (ev) => this.commencerGlisse(ev, el, -1);
        });
        this.majBoutons();
    }

    majBoutons() {
        const actif = this.choisie >= 0 && !!this.etat.cases[this.choisie];
        this.btnTourner.disabled = !actif;
        this.btnReprendre.disabled = !actif;
    }

    // --- Glisser, ou simplement toucher -------------------------------------

    /**
     * Un seul geste couvre les deux usages : on suit le doigt, et si le doigt
     * n'a pas bougé au lever, c'est un clic. Une pièce de la réserve part alors
     * dans le premier emplacement libre ; une pièce déjà rangée se sélectionne,
     * pour les boutons ↻ et ↩.
     */
    commencerGlisse(ev, el, depuis) {
        if (this.isDemo || ev.button > 0) return;
        ev.preventDefault();
        const id = Number(el.dataset.piece);
        const depart = { x: ev.clientX, y: ev.clientY };
        const boite = el.getBoundingClientRect();
        const decalage = { x: ev.clientX - boite.left, y: ev.clientY - boite.top };
        let fantome = null;
        let bouge = false;

        const bouger = (e) => {
            if (!bouge && Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > 6) {
                bouge = true;
                fantome = el.cloneNode(true);
                fantome.classList.add('dm-piece--vole');
                fantome.style.width = `${boite.width}px`;
                fantome.style.height = `${boite.height}px`;
                document.body.appendChild(fantome);
                el.style.opacity = '.25';
                this.plateauEl.querySelectorAll('[data-case]')
                    .forEach(x => x.classList.add('dm-case--ouverte'));
            }
            if (!fantome) return;
            fantome.style.left = `${e.clientX - decalage.x}px`;
            fantome.style.top = `${e.clientY - decalage.y}px`;
            const vise = this.caseVisee(e.clientX, e.clientY, depuis);
            this.plateauEl.querySelectorAll('[data-case]').forEach(x =>
                x.classList.toggle('dm-case--visee', Number(x.dataset.case) === vise));
        };

        const lacher = (e) => {
            window.removeEventListener('pointermove', bouger);
            window.removeEventListener('pointerup', lacher);
            window.removeEventListener('pointercancel', lacher);
            if (fantome) fantome.remove();
            el.style.opacity = '';
            if (!bouge) return this.toucher(id, depuis);
            const vise = this.caseVisee(e.clientX, e.clientY, depuis);
            if (vise >= 0) this.ranger(id, vise);
            else if (depuis >= 0) this.reprendre(depuis);
            else this.dessiner();
        };

        window.addEventListener('pointermove', bouger);
        window.addEventListener('pointerup', lacher);
        window.addEventListener('pointercancel', lacher);
    }

    /** L'emplacement LIBRE le plus proche du doigt, s'il est à portée d'aimant. */
    caseVisee(x, y, depuis) {
        const r = this.plateauEl.getBoundingClientRect();
        let meilleur = -1, mieux = Infinity;
        this.chemin.cases.forEach((slot, i) => {
            if (this.etat.cases[i] && i !== depuis) return;
            const b = boiteDe(slot);
            const cx = r.left + (b.x + b.l / 2) * this.cote;
            const cy = r.top + (b.y + b.h / 2) * this.cote;
            const d = Math.hypot(x - cx, y - cy);
            if (d < this.cote * AIMANT && d < mieux) { mieux = d; meilleur = i; }
        });
        return meilleur;
    }

    toucher(id, depuis) {
        if (depuis >= 0) {           // déjà rangée : on la sélectionne
            this.choisie = this.choisie === depuis ? -1 : depuis;
            this.dessiner();
            if (this.choisie >= 0) {
                this.note('Pièce sélectionnée : « ↻ Retourner » échange ses deux moitiés, '
                    + '« ↩ Reprendre » la renvoie en réserve.');
            }
            return;
        }
        const libre = this.etat.cases.findIndex(x => !x);
        if (libre < 0) { this.note('Tous les emplacements sont occupés.'); return; }
        this.ranger(id, libre);
    }

    // --- Ranger une pièce ---------------------------------------------------

    /**
     * ON RANGE, ON NE JUGE PAS. Aucun emplacement ne refuse une pièce : c'est
     * « Vérifier » qui montrera ensuite quelles jointures ne vont pas.
     */
    ranger(id, index) {
        if (this.isDemo || !this.chaine) return;
        // Le sens qui marie la case d'avant, s'il existe : l'élève choisit
        // l'emplacement, pas l'orientation — ↻ reste là pour la reprendre.
        const pose = { index, id, retourne: false };
        const avant = index > 0 ? this.etat.cases[index - 1] : null;
        if (avant) {
            const cible = demiDe(this.chaine.pieces[avant.id], 1, avant.retourne);
            const piece = this.chaine.pieces[id];
            if (cible.type !== BOUT && demiDe(piece, 1, false).couple === cible.couple
                && demiDe(piece, 1, false).type !== cible.type) pose.retourne = true;
        }
        this.accepter(pose);
    }

    accepter(pose) {
        const dedans = casePiece(this.etat, pose.id);
        this.etat = poserEnCase(this.etat, pose.index, pose.id, pose.retourne);
        this.reserve = this.reserve.filter(x => x !== pose.id);
        this.derniere = pose.index;
        this.choisie = -1;
        this.dessiner();

        // Le calcul que cette pose vient de fermer : celui de la jointure avec
        // la case d'avant. C'est lui qu'on crédite, pas la pièce.
        const couple = dedans < 0 ? this.coupleFerme(pose.index) : null;
        if (couple) {
            this.onCorrectAnswer(null, this.chaine.skillId || COMPETENCE, {
                questionText: couple.q, expected: couple.r, given: couple.r, points: 5
            });
        }

        if (plateauFini(this.etat)) {
            this.note('La planche est pleine. Appuie sur « Vérifier » : les jointures '
                + 'fausses, s\'il y en a, seront entourées.');
        } else {
            this.note(couple ? `Bien : ${echapper(couple.q)} fait ${echapper(couple.r)}. `
                + `Il reste ${this.reserve.length} pièce${this.reserve.length > 1 ? 's' : ''}.`
                : `Il reste ${this.reserve.length} pièce${this.reserve.length > 1 ? 's' : ''} `
                + 'à ranger. Touche une pièce de la planche pour la retourner ou la reprendre.');
        }
    }

    /** Le couple que la jointure de gauche de cette case vient de fermer, s'il l'est. */
    coupleFerme(index) {
        const ici = this.etat.cases[index];
        const avant = index > 0 ? this.etat.cases[index - 1] : null;
        if (!ici || !avant) return null;
        const a = demiDe(this.chaine.pieces[avant.id], 1, avant.retourne);
        const b = demiDe(this.chaine.pieces[ici.id], 0, ici.retourne);
        if (a.type === BOUT || b.type === BOUT || a.couple !== b.couple || a.type === b.type) return null;
        return this.chaine.couples[a.couple];
    }

    retournerChoisie() {
        if (this.isDemo || this.choisie < 0) return;
        this.etat = retournerCase(this.etat, this.choisie);
        this.dessiner();
        this.note('Pièce retournée : ses deux moitiés ont changé de côté.');
    }

    reprendreChoisie() {
        if (this.isDemo || this.choisie < 0) return;
        this.reprendre(this.choisie);
    }

    reprendre(index) {
        const pose = this.etat.cases[index];
        if (!pose) return;
        this.etat = retirerDeCase(this.etat, index);
        this.reserve = this.reserve.concat(pose.id);
        this.choisie = -1;
        this.derniere = -1;
        this.dessiner();
        this.note('Pièce reprise : elle repart en réserve.');
    }

    /**
     * LE CONTRÔLE DE FIN. On entoure chaque jointure fautive — les DEUX pièces
     * qui se touchent — au lieu d'annoncer un nombre d'erreurs : l'élève doit
     * pouvoir aller relire le joint, pas chercher lequel.
     */
    verifier() {
        if (this.isDemo || !this.chaine) return;
        const bilan = verifierPlateau(this.chaine, this.etat);
        if (bilan.ok) {
            this.reussis++;
            this.note('✅ La planche est juste : chaque question touche sa réponse, '
                + 'DÉPART d\'un bout et ARRIVÉE de l\'autre.', 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Dominos — ${this.source.label} (${this.chaine.pieces.length} pièces)`,
                expected: 'planche complète', given: 'planche complète',
                points: 10 + this.chaine.couples.length * 2
            });
            setTimeout(() => { if (this.isRunning) this.showNext(); }, 2200);
            return;
        }
        bilan.fautes.forEach(i => {
            [i, i + 1].forEach(k => this.plateauEl.querySelector(`[data-posee="${k}"]`)
                ?.classList.add('dm-piece--joint'));
        });
        const n = bilan.fautes.length;
        const quoi = n
            ? `${n} jointure${n > 1 ? 's' : ''} ne colle${n > 1 ? 'nt' : ''} pas : `
                + 'elles sont entourées. Relis le calcul et sa réponse de part et d\'autre du trait.'
            : (!bilan.complet ? 'Il reste des pièces dans la réserve.'
                : 'Les jointures sont bonnes, mais la planche doit commencer par DÉPART '
                    + 'et finir par ARRIVÉE.');
        this.note(`❌ ${quoi}`, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: `Dominos — ${this.source.label}`,
            input: 'planche à revoir', expected: 'chaque question contre sa réponse',
            customMessage: quoi, silencieux: true
        });
    }

    // --- Aider --------------------------------------------------------------

    aider() {
        if (this.isDemo || !this.chaine) return;
        const pose = prochaineCase(this.chaine, this.etat);
        if (!pose) { this.note('Toutes les pièces sont posées.'); return; }
        this.aidesUtilisees++;
        // ON DIT LE CHEMIN, ON NE MONTRE PAS LA PIÈCE.
        this.note(echapper(direJoint(this.chaine, this.etat, pose)));
        const el = this.plateauEl.querySelector(`[data-case="${pose.index}"]`);
        if (el) {
            el.classList.add('dm-case--visee');
            setTimeout(() => el.classList.remove('dm-case--visee'), 2400);
        }
    }

    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'dm-note' + (ton ? ` dm-note--${ton}` : '');
    }

    elementReserve(id) { return this.reserveEl.querySelector(`[data-piece="${id}"]`); }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.chaine) this.poser();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('La planche est tracée d\'avance : je vois la forme à reconstituer et le nombre '
            + 'de pièces. Une pièce porte une question d\'un côté et la réponse d\'une AUTRE '
            + 'question de l\'autre.', this.plateauEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let k = 0; k < 4 && !plateauFini(this.etat); k++) {
            const pose = prochaineCase(this.chaine, this.etat);
            if (!pose) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const el = this.elementReserve(pose.id);
            cur.say(direJoint(this.chaine, this.etat, pose), el || this.reserveEl);
            if (el && !await cur.tap(el)) return fin();
            this.etat = poserEnCase(this.etat, pose.index, pose.id, pose.retourne);
            this.reserve = this.reserve.filter(x => x !== pose.id);
            this.derniere = pose.index;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('On continue le long du serpentin jusqu\'à ARRIVÉE. Rien n\'est refusé au '
            + 'moment où on pose : c\'est « Vérifier » qui entoure les jointures fausses, '
            + 'et on va relire celles-là.', this.container.querySelector('[data-verifier]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.obs) { this.obs.disconnect(); this.obs = null; }
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        document.querySelectorAll('.dm-piece--vole').forEach(el => el.remove());
        super.destroy();
    }
}

const echapper = (t) => String(t ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function engineDominos(container, isDemo, params) {
    const jeu = new Dominos(container, isDemo, params);
    jeu.start();
    return jeu;
}
