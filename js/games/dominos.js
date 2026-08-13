// LES DOMINOS — le plateau, à l'écran.
//
// Le noyau (core/dominos.js) monte la chaîne, type chaque moitié (question ou
// réponse) et dit quelles moitiés se touchent. Ici on pose le plateau, on
// écoute les doigts, et on tient les promesses qui font l'intérêt du jeu :
//
//   · TOUTES LES PIÈCES ONT LA MÊME TAILLE, et leurs deux moitiés sont
//     CARRÉES. C'est ce qui en fait des dominos et non des étiquettes : on les
//     reconnaît de loin, on les manipule sans les lire, et une planche
//     mélangée reste une planche. Le texte s'adapte à la pièce, jamais
//     l'inverse.
//   · ON LES GLISSE, ET ON PEUT LES TOURNER. La chaîne a DEUX bouts ouverts —
//     le plateau part vide, on pose la première pièce où l'on veut, et elle
//     s'allonge des deux côtés. Sans deuxième bout, retourner une pièce
//     n'aurait aucun sens.
//   · ET ON PEUT AUSSI SE CONTENTER D'UN CLIC. Le glissé est agréable à la
//     souris ; sur une tablette posée en travers d'une table, c'est le geste
//     qui rate. Toucher une pièce la pose du côté qui l'accepte.
//
// L'aide et le robot disent tous deux la MÊME chose, et jamais la réponse
// nue : « le bout ouvert demande 7 × 8, donc je cherche 56 ». C'est la méthode
// qu'on veut laisser à l'élève, pas la pièce.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    DEPART, ARRIVEE, QUESTION, BOUT,
    plateauVide, boutsLibres, poseAdmise, poserPiece, coteNaturel, plateauFini,
    poserLibre, retournerPosee, retirerPosee, verifierChaine,
    prochainePose, direJoint, direErreur, reserveMelangee, demiDe, ajusterAuCarre
} from '../core/dominos.js';
import { chaineDepuisGenerateur, sourceDe } from '../core/generators/dominos.js';

const COMPETENCE = 'num.logique.dominos';

class Dominos extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'dominos');
        this.rng = makeRng(this.params.seed);
        this.source = sourceDe(this.params.source);
        this.nbPieces = Number(this.params.pieces) || 9;
        this.reussis = 0;
        this.aidesUtilisees = 0;
        this.retournees = new Set();   // les pièces que l'élève a tournées en réserve
    }

    render() {
        this.container.innerHTML = `
            <style>
                .dm-wrap {
                    display: flex; flex-direction: column; gap: 8px; width: 100%; height: 100%;
                    align-items: center; padding: 8px 10px 12px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: inline-size;
                    --dm-cote: 58px;
                }
                .dm-tete { text-align: center; font-size: .95rem; flex: 0 0 auto; }
                .dm-consigne { color: var(--text-muted); font-size: .82rem; }

                /* LE PLATEAU. La chaîne s'y replie ligne par ligne : douze
                   dominos carrés ne tiennent pas côte à côte sur un téléphone,
                   et une chaîne qui sort de l'écran ne se relit pas. */
                .dm-plateau {
                    width: 100%; flex: 0 0 auto; border: 2px dashed var(--border);
                    border-radius: 12px; padding: 8px; box-sizing: border-box;
                    display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;
                    align-items: center; min-height: calc(var(--dm-cote) + 24px);
                    background: color-mix(in srgb, var(--text-main) 3%, transparent);
                }
                .dm-plateau--vide::before {
                    content: 'Pose ici la première pièce'; color: var(--text-muted);
                    font-size: .82rem; font-style: italic;
                }
                .dm-reserve {
                    display: flex; flex-wrap: wrap; justify-content: center;
                    gap: 6px; width: 100%; flex: 0 0 auto;
                }
                .dm-zone {
                    font-size: .74rem; font-weight: 800; color: var(--text-muted);
                    letter-spacing: .04em; text-transform: uppercase; align-self: flex-start;
                }

                /* LA PIÈCE : deux moitiés CARRÉES, un trait au milieu. */
                .dm-piece {
                    display: flex; align-items: stretch; box-sizing: border-box;
                    border: 2px solid var(--text-main); border-radius: 9px;
                    background: var(--bg-panel); overflow: hidden; position: relative;
                    width: calc(var(--dm-cote) * 2); height: var(--dm-cote);
                    flex: 0 0 auto; user-select: none; -webkit-tap-highlight-color: transparent;
                    touch-action: none;
                }
                .dm-demi {
                    width: var(--dm-cote); height: 100%; display: flex; box-sizing: border-box;
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
                .dm-demi + .dm-demi { border-left: 2px solid var(--text-main); }

                /* LA RÉSERVE PRÉSENTE LES PIÈCES DEBOUT, comme on les tient en
                   main avant de les poser à plat. Couchées, elles ressemblaient
                   déjà à des pièces posées, et on ne voyait plus ce qui était
                   sur le plateau et ce qui restait à jouer. */
                .dm-piece--reserve {
                    cursor: grab; flex-direction: column;
                    transition: transform .12s ease, box-shadow .12s ease;
                }
                /* Debout, la séparation passe à l'horizontale : sans cela les
                   deux moitiés se collaient sans trait entre elles. */
                .dm-piece--reserve .dm-demi + .dm-demi {
                    border-left: 0; border-top: 2px solid var(--text-main);
                }
                .dm-piece--reserve:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.17); }
                .dm-piece--vole {
                    position: fixed; z-index: 9999; pointer-events: none; cursor: grabbing;
                    box-shadow: 0 10px 26px rgba(0,0,0,.3); opacity: .95;
                }
                .dm-piece--posee { animation: dm-pose .3s ease; }
                @keyframes dm-pose { from { transform: scale(.75); opacity: .25; } }
                .dm-piece--faute { animation: dm-faute .45s ease 2; }
                @keyframes dm-faute { 50% { border-color: var(--danger, #dc2626); transform: translateX(-4px) rotate(-2deg); } }
                .dm-piece--montre { box-shadow: 0 0 0 4px var(--primary); }

                /* LES POIGNÉES. Toujours visibles : cachées derrière un survol,
                   elles n'existent pas sur une tablette. On peut retourner une
                   pièce EN RÉSERVE COMME SUR LE PLATEAU — une pièce posée à
                   l'envers doit pouvoir se remettre à l'endroit sans qu'on
                   défasse tout — et reprendre une pièce qu'on a mal placée. */
                .dm-poignee {
                    position: absolute; top: 1px; width: 17px; height: 17px;
                    border: 0; border-radius: 50%; background: var(--text-main); color: var(--bg-panel);
                    font-size: 10px; line-height: 1; cursor: pointer; padding: 0;
                    display: flex; align-items: center; justify-content: center; opacity: .55;
                }
                .dm-poignee:hover { opacity: 1; }
                .dm-tourner { right: 1px; }
                .dm-reprendre { left: 1px; }

                /* LES DEUX BOUTS OÙ L'ON DÉPOSE. */
                .dm-bout {
                    width: calc(var(--dm-cote) * .8); height: var(--dm-cote);
                    border: 2px dashed var(--border); border-radius: 9px; flex: 0 0 auto;
                    display: flex; align-items: center; justify-content: center;
                    color: var(--text-muted); font-size: 1.1rem; font-weight: 800;
                }
                .dm-bout--actif {
                    border-color: var(--success, #16a34a); border-style: solid;
                    background: color-mix(in srgb, var(--success, #16a34a) 14%, transparent);
                }

                .dm-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                /* LA JOINTURE FAUTIVE S'ENTOURE. On ne dit pas « c'est faux » :
                   on montre OÙ, et l'élève relit ce joint-là. */
                .dm-piece--joint {
                    outline: 3px solid var(--danger, #dc2626);
                    outline-offset: 2px; border-radius: 8px;
                }
                .dm-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700; padding: 7px 13px;
                }
                /* « Vérifier » est LE geste de fin : il se voit. (Déclaré après
                   .dm-btn, sans quoi le fond neutre l'emporterait.) */
                .dm-btn--verifier { border-color: var(--primary); background: var(--primary); color: #fff; }
                .dm-note {
                    min-height: 2.6em; text-align: center; font-size: .86rem;
                    color: var(--text-muted); max-width: 660px; flex: 0 0 auto; padding: 0 8px;
                }
                .dm-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .dm-note--ko { color: var(--danger, #dc2626); font-weight: 600; }

                /* Sur un téléphone, la pièce rétrécit plutôt que de déborder. */
                @container (max-width: 560px) { .dm-wrap { --dm-cote: 46px; } }
                @container (max-width: 380px) { .dm-wrap { --dm-cote: 40px; } }
            </style>
            <div class="dm-wrap">
                <div class="dm-tete" data-tete></div>
                <div class="dm-zone">Le plateau</div>
                <div class="dm-plateau" data-plateau></div>
                <div class="dm-zone">La réserve</div>
                <div class="dm-reserve" data-reserve></div>
                <div class="dm-barre">
                    <button type="button" class="dm-btn dm-btn--verifier" data-verifier>✓ Vérifier</button>
                    <button type="button" class="dm-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="dm-btn" data-recommencer>↺ Recommencer</button>
                    <button type="button" class="dm-btn" data-neuf>Autre jeu</button>
                </div>
                <div class="dm-note" data-note></div>
            </div>`;

        this.teteEl = this.container.querySelector('[data-tete]');
        this.plateauEl = this.container.querySelector('[data-plateau]');
        this.reserveEl = this.container.querySelector('[data-reserve]');
        this.noteEl = this.container.querySelector('[data-note]');

        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-recommencer]').onclick = () => this.recommencer();
        this.container.querySelector('[data-verifier]').onclick = () => this.verifier();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
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
        this.etat = plateauVide();
        this.reserve = reserveMelangee(this.chaine, this.rng);
        this.retournees = new Set();
        this.dernierePosee = null;
        this.teteEl.innerHTML = `<b>Dominos — ${echapper(this.source.label)}</b><br>
            <span class="dm-consigne">Glisse les pièces sur le plateau, ou touche-les.
            La chaîne s'allonge des deux côtés ; ↻ retourne une pièce, ↩ la reprend.
            « Vérifier » entoure les jointures fausses.</span>`;
        this.dessiner();
        this.note('');
    }

    // --- Le dessin ----------------------------------------------------------

    /**
     * Le texte d'une moitié, à la taille qui l'y fait entrer. Une moitié fait
     * un carré : c'est au texte de s'y plier, jamais à la pièce de s'étirer.
     * Et un NOMBRE ne se coupe pas en deux : le plus long mot doit tenir sur
     * sa ligne — « 0043,1000 » rapetisse, il ne devient pas « 0043,1 000 ».
     */
    taillePolice(texte) { return ajusterAuCarre(texte); }

    pieceHtml(piece, retourne, classes, poignees) {
        const demi = (cote) => {
            const d = demiDe(piece, cote, retourne);
            const genre = d.type === BOUT ? 'bout' : (d.type === QUESTION ? 'question' : 'reponse');
            return `<span class="dm-demi dm-demi--${genre}"
                style="font-size:calc(var(--dm-cote) * ${this.taillePolice(d.texte)})">${echapper(d.texte)}</span>`;
        };
        const bouton = (nom, glyphe, titre) => this.isDemo ? ''
            : `<button type="button" class="dm-poignee dm-${nom}" data-${nom} title="${titre}">${glyphe}</button>`;
        return `<div class="dm-piece ${classes}" data-piece="${piece.id}">
            ${demi(0)}${demi(1)}
            ${poignees ? bouton('tourner', '↻', 'Retourner la pièce') : ''}
            ${poignees === 'plateau' ? bouton('reprendre', '↩', 'Reprendre la pièce') : ''}
        </div>`;
    }

    dessiner() {
        const vide = !this.etat.posees.length;
        this.plateauEl.classList.toggle('dm-plateau--vide', vide);
        this.plateauEl.innerHTML = vide ? '' :
            `<div class="dm-bout" data-bout="gauche">+</div>`
            + this.etat.posees.map(p => this.pieceHtml(this.chaine.pieces[p.id], p.retourne,
                p.id === this.dernierePosee ? 'dm-piece--posee' : '', 'plateau')).join('')
            + `<div class="dm-bout" data-bout="droite">+</div>`;

        this.reserveEl.innerHTML = this.reserve
            .map(id => this.pieceHtml(this.chaine.pieces[id], this.retournees.has(id),
                'dm-piece--reserve', 'reserve'))
            .join('');

        // Sur le plateau : ↻ remet la pièce à l'endroit sans la déplacer,
        // ↩ la renvoie en réserve. Sans ces deux gestes, une erreur entourée
        // par « Vérifier » ne se corrigerait pas.
        this.plateauEl.querySelectorAll('[data-piece]').forEach(el => {
            const id = Number(el.dataset.piece);
            el.querySelector('[data-tourner]')?.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (this.isDemo) return;
                this.etat = retournerPosee(this.etat, id);
                this.dessiner();
                this.note('Pièce retournée. Appuie sur « Vérifier » quand tu veux relire la chaîne.');
            });
            el.querySelector('[data-reprendre]')?.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (this.isDemo) return;
                this.etat = retirerPosee(this.etat, id);
                this.reserve = this.reserve.concat(id);
                this.dernierePosee = null;
                this.dessiner();
                this.note('Pièce reprise : elle repart en réserve.');
            });
        });

        this.reserveEl.querySelectorAll('[data-piece]').forEach(el => {
            const id = Number(el.dataset.piece);
            el.querySelector('[data-tourner]')?.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (this.isDemo) return;
                if (this.retournees.has(id)) this.retournees.delete(id); else this.retournees.add(id);
                this.dessiner();
            });
            el.onpointerdown = (ev) => this.commencerGlisse(ev, id, el);
        });
    }

    // --- Glisser, ou simplement toucher -------------------------------------

    /**
     * Un seul geste couvre les deux usages : on suit le doigt, et si le doigt
     * n'a pas bougé au lever, c'est un clic — la pièce part alors toute seule
     * du côté qui l'accepte.
     */
    commencerGlisse(ev, id, el) {
        if (this.isDemo || ev.button > 0) return;
        ev.preventDefault();
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
                this.marquerBoutsPossibles(id);
            }
            if (!fantome) return;
            fantome.style.left = `${e.clientX - decalage.x}px`;
            fantome.style.top = `${e.clientY - decalage.y}px`;
            const cible = this.boutSous(e.clientX, e.clientY);
            this.plateauEl.querySelectorAll('[data-bout]').forEach(b =>
                b.classList.toggle('dm-bout--survol', b === cible));
        };

        const lacher = (e) => {
            window.removeEventListener('pointermove', bouger);
            window.removeEventListener('pointerup', lacher);
            window.removeEventListener('pointercancel', lacher);
            if (fantome) fantome.remove();
            el.style.opacity = '';
            this.plateauEl.querySelectorAll('[data-bout]').forEach(b =>
                b.classList.remove('dm-bout--actif', 'dm-bout--survol'));
            if (!bouge) return this.jouer(id, coteNaturel(this.chaine, this.etat, id), el);
            const cible = this.boutSous(e.clientX, e.clientY);
            // Lâchée sur le plateau sans viser un bout précis : on choisit le
            // côté qui l'accepte. L'élève voulait la poser, pas viser.
            const cote = cible ? cible.dataset.bout
                : (this.surPlateau(e.clientX, e.clientY) ? coteNaturel(this.chaine, this.etat, id) : null);
            if (cote) this.jouer(id, cote, el);
        };

        window.addEventListener('pointermove', bouger);
        window.addEventListener('pointerup', lacher);
        window.addEventListener('pointercancel', lacher);
    }

    marquerBoutsPossibles(id) {
        this.plateauEl.querySelectorAll('[data-bout]').forEach(b => {
            b.classList.toggle('dm-bout--actif', !!poseAdmise(this.chaine, this.etat, id, b.dataset.bout));
        });
    }

    dans(el, x, y) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    boutSous(x, y) {
        return [...this.plateauEl.querySelectorAll('[data-bout]')].find(b => this.dans(b, x, y)) || null;
    }

    surPlateau(x, y) { return this.dans(this.plateauEl, x, y); }

    // --- Poser une pièce ----------------------------------------------------

    /**
     * ON POSE, ON NE JUGE PAS. Refuser la pièce au moment où l'élève la pose,
     * c'est corriger à sa place : il finit par essayer les pièces une à une
     * jusqu'à ce que ça passe. Ici la pose est libre — et le bouton
     * « Vérifier » montre ensuite quelles jointures ne vont pas.
     */
    jouer(id, cote, el) {
        if (this.isDemo || !this.chaine) return;
        if (!cote) return this.refuser(id, el);
        // Le sens qui marie, s'il existe : l'élève choisit le bout, pas
        // l'orientation — le bouton ↻ reste là pour la reprendre.
        const sens = poseAdmise(this.chaine, this.etat, id, cote);
        this.accepter(id, poserLibre(this.etat, id, cote,
            sens ? sens.retourne : this.retournees.has(id)));
    }

    /**
     * LE CONTRÔLE DE FIN. On entoure chaque jointure fautive — les DEUX pièces
     * qui se touchent — au lieu d'annoncer un nombre d'erreurs : l'élève doit
     * pouvoir aller relire le joint, pas chercher lequel.
     */
    verifier() {
        if (this.isDemo || !this.chaine) return;
        this.plateauEl.querySelectorAll('.dm-piece--joint')
            .forEach(el => el.classList.remove('dm-piece--joint'));
        const bilan = verifierChaine(this.chaine, this.etat);
        const posees = this.etat.posees;
        if (bilan.ok) {
            this.reussis++;
            this.note('✅ La chaîne est juste : chaque question touche sa réponse, '
                + 'DÉPART d\'un bout et ARRIVÉE de l\'autre.', 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Dominos — ${this.source.label} (${this.chaine.pieces.length} pièces)`,
                expected: 'chaîne complète', given: 'chaîne complète',
                points: 10 + this.chaine.couples.length * 2
            });
            setTimeout(() => { if (this.isRunning) this.showNext(); }, 2200);
            return;
        }
        bilan.fautes.forEach(i => {
            [posees[i], posees[i + 1]].forEach(p => {
                this.plateauEl.querySelector(`[data-piece="${p.id}"]`)
                    ?.classList.add('dm-piece--joint');
            });
        });
        const quoi = bilan.fautes.length
            ? `${bilan.fautes.length} jointure${bilan.fautes.length > 1 ? 's' : ''} ne colle`
                + `${bilan.fautes.length > 1 ? 'nt' : ''} pas : elles sont entourées. `
                + 'Relis le calcul et sa réponse de part et d\'autre du trait.'
            : (!bilan.complet ? 'Il reste des pièces dans la réserve.'
                : 'Les jointures sont bonnes, mais la chaîne doit commencer par DÉPART '
                    + 'et finir par ARRIVÉE.');
        this.note(`❌ ${quoi}`, 'ko');
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: `Dominos — ${this.source.label}`,
            input: 'chaîne à revoir', expected: 'chaque question contre sa réponse',
            customMessage: quoi, silencieux: true
        });
    }

    accepter(id, etatSuivant) {
        // Le calcul que cette pose vient de valider : celui du joint qu'elle
        // ferme. C'est lui qu'on crédite, pas la pièce.
        const bouts = boutsLibres(this.chaine, this.etat);
        const ferme = [bouts.gauche, bouts.droite].find(d => d && d.type !== BOUT
            && this.chaine.pieces[id].demis.some(m => m.couple === d.couple && m.type !== d.type));
        const couple = ferme ? this.chaine.couples[ferme.couple] : null;

        this.etat = etatSuivant;
        this.dernierePosee = id;   // seule la nouvelle venue s'anime
        this.reserve = this.reserve.filter(x => x !== id);
        this.retournees.delete(id);
        this.dessiner();

        if (couple) {
            this.onCorrectAnswer(null, this.chaine.skillId || COMPETENCE, {
                questionText: couple.q,
                expected: couple.r,
                given: couple.r,
                points: 5
            });
        }

        if (plateauFini(this.chaine, this.etat)) {
            this.note('Toutes les pièces sont posées. Appuie sur « Vérifier » : '
                + 'les jointures fausses, s\'il y en a, seront entourées.');
        } else {
            this.note(couple ? `Bien : ${echapper(couple.q)} fait ${echapper(couple.r)}. `
                + `Il reste ${this.reserve.length} pièce${this.reserve.length > 1 ? 's' : ''}.`
                : `Première pièce posée. Il reste ${this.reserve.length} pièces.`);
        }
    }

    refuser(id, el) {
        if (el) { el.classList.add('dm-piece--faute'); setTimeout(() => el.classList.remove('dm-piece--faute'), 900); }
        const raison = direErreur(this.chaine, this.etat, id);
        this.note('❌ ' + echapper(raison), 'ko');
        const bouts = boutsLibres(this.chaine, this.etat);
        this.onWrongAnswer(el, {
            concept: this.chaine.skillId || COMPETENCE,
            questionText: (bouts.droite && bouts.droite.texte) || 'plateau vide',
            input: this.chaine.pieces[id] ? String(this.chaine.pieces[id].gauche) : '?',
            expected: (bouts.gauche && bouts.gauche.texte) || '',
            customMessage: raison
        });
    }

    // --- Aider --------------------------------------------------------------

    aider() {
        if (this.isDemo || !this.chaine) return;
        const pose = prochainePose(this.chaine, this.etat);
        if (!pose) { this.note('Toutes les pièces sont posées.'); return; }
        this.aidesUtilisees++;
        // ON DIT LE CHEMIN, ON NE MONTRE PAS LA PIÈCE.
        this.note(echapper(direJoint(this.chaine, this.etat, pose)));
        const bout = this.plateauEl.querySelector(`[data-bout="${pose.cote}"]`);
        if (bout) {
            bout.classList.add('dm-bout--actif');
            setTimeout(() => bout.classList.remove('dm-bout--actif'), 2400);
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
        cur.say('Une pièce porte une question d\'un côté et la réponse d\'une AUTRE question de '
            + 'l\'autre. Deux moitiés se touchent quand l\'une est la réponse de l\'autre — '
            + 'peu importe le sens, on peut retourner une pièce.', this.teteEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let k = 0; k < 4 && !plateauFini(this.chaine, this.etat); k++) {
            const pose = prochainePose(this.chaine, this.etat);
            if (!pose) break;
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const el = this.elementReserve(pose.id);
            cur.say(direJoint(this.chaine, this.etat, pose), el || this.reserveEl);
            if (el && !await cur.tap(el)) return fin();
            const suivant = poserPiece(this.chaine, this.etat, pose.id, pose.cote);
            if (suivant) this.accepter(pose.id, suivant);
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('On continue par les deux bouts jusqu\'à DÉPART d\'un côté et ARRIVÉE de l\'autre. '
            + 'Si la réserve est vide en même temps, c\'est que tout était juste — '
            + 'personne n\'a besoin de te le dire.', this.container.querySelector('[data-aide]'));
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
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
