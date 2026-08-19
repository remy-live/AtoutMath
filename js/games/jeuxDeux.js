// TROIS JEUX À DEUX — la pipopipette, le puissance 4 et le sim, à l'écran.
//
// Rémy les a demandés l'un après l'autre. Ils n'ont rien en commun côté règles
// et TOUT en commun côté écran : deux joueurs, ou un joueur contre la machine,
// un plateau, un bandeau qui dit à qui c'est, une fin de partie qui explique.
// Le seul module qui change d'un jeu à l'autre est le DESSIN, et l'IA est
// celle de tous les autres jeux de plateau (`core/ia.js`).
//
// HORS PROGRAMME, ET ASSUMÉ — comme Othello, les Dames et les Échecs. Ce sont
// des jeux de la réserve, ceux qu'on donne en récompense ou en fin d'heure.
// Deux d'entre eux ont pourtant un fond mathématique sérieux : la pipopipette
// est un problème de PARITÉ (qui doit ouvrir la chaîne la donne), et le sim
// est le théorème de Ramsey R(3,3) = 6 — sur quinze traits de deux couleurs,
// un triangle monochrome est inévitable, donc le match nul est IMPOSSIBLE. Un
// élève peut le constater lui-même, quinze traits à la main.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { meilleurCoup } from '../core/ia.js';
import * as pipo from '../core/pipopipette.js';
import * as p4 from '../core/puissance4.js';
import * as sim from '../core/sim.js';

const NIVEAUX = {
    facile: { profondeur: 1, fantaisie: 0.45 },
    moyen: { profondeur: 3, fantaisie: 0.12 },
    fort: { profondeur: 5, fantaisie: 0 }
};

const NOMS = { B: 'Bleu', N: 'Rouge' };
const TEINTES = { B: '#3b82f6', N: '#ef4444' };

// --- Les trois jeux ----------------------------------------------------------

const JEUX = {
    pipopipette: {
        titre: 'La Pipopipette',
        module: pipo,
        consigne: 'Trace un trait entre deux points voisins. Fermer un carré le marque à ton nom '
            + '— et tu rejoues.',
        creer: (params) => pipo.creerPartie({ taille: params.taille || 'moyen' }),
        score: (p) => `${p.score.B} — ${p.score.N}`,
        dessiner: dessinerPipo,
        // La profondeur coûte cher ici : les coups sont nombreux et la main ne
        // tourne pas toujours. On la borne.
        plafond: 3
    },
    puissance4: {
        titre: 'Puissance 4',
        module: p4,
        consigne: 'Touche une colonne : ton jeton tombe au fond. Le premier qui en aligne QUATRE '
            + 'gagne — en ligne, en colonne ou en diagonale.',
        creer: () => p4.creerPartie(),
        score: (p) => `${p4.poses(p)} jetons`,
        dessiner: dessinerP4,
        plafond: 6
    },
    sim: {
        titre: 'Le Sim',
        module: sim,
        consigne: 'Tire un trait d\'un point à un autre : il prend TA couleur. Celui qui forme '
            + 'le premier un triangle de sa propre couleur A PERDU.',
        creer: () => sim.creerPartie(),
        score: (p) => `${p.couleurs.filter(c => c !== null).length} / 15 segments`,
        dessiner: dessinerSim,
        plafond: 5
    }
};

class JeuADeux extends BaseGame {
    constructor(container, isDemo, params, quel) {
        super(container, isDemo, params, quel);
        this.quel = quel;
        this.def = JEUX[quel];
        this.rng = makeRng(this.params.seed);
        this.contreMachine = String(this.params.mode || 'ia') === 'ia';
        this.niveau = NIVEAUX[this.params.niveau] ? this.params.niveau : 'moyen';
        // La machine tient les rouges : l'élève ouvre, comme sur un plateau.
        this.machine = 'N';
        // Le point d'où part le trait qu'on est en train de tirer (le Sim seul).
        this.simDepart = null;
        this.partie = this.def.creer(this.params);
    }

    render() {
        this.container.innerHTML = `
            <style>
                .jd-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center; gap: clamp(6px, 1.6cqh, 14px);
                    width: 100%; height: 100%; padding: 8px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none;
                }
                .jd-tete {
                    display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-weight: 800; font-size: clamp(12px, 2.6cqh, 16px);
                }
                .jd-joueur {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 3px 12px; border-radius: 999px; border: 2px solid transparent;
                    opacity: .5; transition: opacity .15s, border-color .15s;
                }
                .jd-joueur--actif { opacity: 1; border-color: currentColor; }
                .jd-pastille { width: .8em; height: .8em; border-radius: 50%; background: currentColor; }
                .jd-plateau { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; }
                .jd-svg { display: block; touch-action: manipulation; }
                .jd-barre { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
                .jd-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 6px 12px; font-size: .86rem;
                }
                .jd-btn--valider { border-color: var(--primary); background: var(--primary); color: #fff; }
                .jd-note {
                    min-height: 2.4em; text-align: center; font-size: .88rem;
                    color: var(--text-muted); max-width: 46ch;
                }
                .jd-note--ok { color: var(--success, #16a34a); font-weight: 700; }
                .jd-note--ko { color: var(--danger, #dc2626); font-weight: 600; }

                /* --- Pipopipette --- */
                .jd-point { fill: var(--text-main); }
                .jd-trait { stroke-linecap: round; }
                .jd-trait--libre { stroke: var(--border); stroke-width: 2; }
                /* La cible du doigt : invisible, large, et posée APRÈS tous les
                   traits — c'est le dernier dessiné qui reçoit le doigt. Au
                   survol elle s'éclaire un peu : à la souris, on veut savoir
                   quel trait on est en train de viser. */
                .jd-cible { stroke: transparent; stroke-width: 16; cursor: pointer; }
                .jd-cible:hover { stroke: color-mix(in srgb, var(--primary) 34%, transparent); }
                .jd-carre { opacity: .28; }
                .jd-initiale { font-weight: 900; text-anchor: middle; dominant-baseline: central; fill: #fff; }

                /* --- Puissance 4 --- */
                .jd-colonne { cursor: pointer; }
                .jd-colonne:hover rect { fill: color-mix(in srgb, var(--primary) 12%, transparent); }
                .jd-trou { fill: var(--bg-app); }
                .jd-jeton { stroke: rgba(0,0,0,.25); stroke-width: 1.5; }
                .jd-gagnant { stroke: #fff; stroke-width: 4; }

                /* --- Sim --- */
                .jd-arete { stroke-width: 5; stroke-linecap: round; }
                .jd-arete--fatale { animation: jd-pouls 1s ease-in-out infinite; }
                @keyframes jd-pouls { 50% { opacity: .35; } }
                .jd-sommet { fill: var(--text-main); transition: r .12s, fill .12s; }
                .jd-sommet--choisi { fill: var(--primary); r: 17; }
                /* La prise du doigt : invisible, généreuse, dessinée en dernier.
                   Six disques bien séparés remplacent quinze traits qui se
                   croisaient au centre — c'est tout le gain du tracé. */
                .jd-prise { fill: transparent; cursor: pointer; }
                .jd-elastique {
                    stroke: var(--primary); stroke-width: 4; stroke-linecap: round;
                    stroke-dasharray: 7 6; pointer-events: none; opacity: .85;
                }
                /* Pendant le tracé, le navigateur ne doit pas prendre le
                   glissé pour un défilement de la page. */
                .jd-svg--trace { touch-action: none; }
                .jd-etiquette { font-weight: 800; text-anchor: middle; dominant-baseline: central;
                    fill: var(--bg-panel); font-size: 13px; pointer-events: none; }
            </style>
            <div class="jd-wrap" data-wrap>
                <div class="jd-tete">
                    <span class="jd-joueur" data-joueur="B" style="color:${TEINTES.B}">
                        <span class="jd-pastille"></span><span data-nom="B">${NOMS.B}</span></span>
                    <span data-score></span>
                    <span class="jd-joueur" data-joueur="N" style="color:${TEINTES.N}">
                        <span class="jd-pastille"></span><span data-nom="N">${NOMS.N}</span></span>
                </div>
                <div class="jd-plateau" data-plateau></div>
                <div class="jd-barre">
                    <button type="button" class="jd-btn" data-conseil>💡 Un conseil</button>
                    <button type="button" class="jd-btn jd-btn--valider" data-neuf>Nouvelle partie</button>
                </div>
                <p class="jd-note" data-note></p>
            </div>`;

        this.wrapEl = this.container.querySelector('[data-wrap]');
        this.plateauEl = this.container.querySelector('[data-plateau]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.container.querySelector('[data-neuf]').onclick = () => this.nouvelle();
        this.container.querySelector('[data-conseil]').onclick = () => this.conseiller();
        if (this.contreMachine) {
            this.container.querySelector('[data-nom="N"]').textContent = 'L\'ordinateur';
        }
    }

    startGameLoop() {
        this.dessiner();
        this.note(this.def.consigne);
    }

    showNext() { this.nouvelle(); return true; }

    nouvelle() {
        this.partie = this.def.creer(this.params);
        this.fini = false;
        this.simDepart = null;
        this.dessiner();
        this.note(this.def.consigne);
    }

    // --- Jouer ----------------------------------------------------------------

    /** Un coup de l'élève. Le coup est déjà validé par le dessin. */
    jouer(coup) {
        if (this.isDemo || this.fini) return;
        const m = this.def.module;
        if (this.contreMachine && this.partie.trait === this.machine) return;
        this.partie = m.jouer(this.partie, coup);
        this.dessiner();
        if (this.regarderLaFin()) return;
        if (this.contreMachine && this.partie.trait === this.machine) this.faireJouerLaMachine();
    }

    /**
     * LE TOUR DE LA MACHINE, avec un temps de réflexion.
     *
     * Pas parce qu'elle en a besoin — parce qu'un coup qui apparaît
     * instantanément ne se regarde pas, et qu'on veut voir OÙ elle pose.
     */
    faireJouerLaMachine() {
        const m = this.def.module;
        this.note('L\'ordinateur réfléchit…');
        this.minuteur = setTimeout(() => {
            if (!this.isRunning || this.fini) return;
            const cfg = NIVEAUX[this.niveau];
            const r = meilleurCoup(m.JEU, this.partie, {
                profondeur: Math.min(cfg.profondeur, this.def.plafond),
                fantaisie: cfg.fantaisie, rng: this.rng
            });
            if (!r) { this.regarderLaFin(); return; }
            this.partie = m.jouer(this.partie, r.coup);
            this.dessiner();
            if (this.regarderLaFin()) return;
            this.note(this.aQui());
            // À la pipopipette, elle peut enchaîner : qui ferme rejoue.
            if (this.partie.trait === this.machine) this.faireJouerLaMachine();
        }, 620);
    }

    aQui() {
        const t = this.partie.trait;
        if (this.contreMachine) return t === this.machine ? 'L\'ordinateur joue…' : 'À toi.';
        return `Au tour de ${NOMS[t]}.`;
    }

    regarderLaFin() {
        const fin = this.def.module.terminee(this.partie);
        if (!fin) return false;
        this.fini = true;
        this.dessiner();
        this.note(this.direLaFin(fin), fin.gagnant === 'B' || !this.contreMachine ? 'ok' : 'ko');
        return true;
    }

    direLaFin(fin) {
        if (fin.gagnant === null) return `Égalité — ${fin.raison}.`;
        const qui = this.contreMachine
            ? (fin.gagnant === this.machine ? 'L\'ordinateur gagne' : 'Tu gagnes')
            : `${NOMS[fin.gagnant]} gagne`;
        if (this.quel === 'sim') {
            const perdu = fin.gagnant === 'B' ? NOMS.N : NOMS.B;
            return `${qui} : ${perdu} a fermé un triangle de sa couleur. `
                + 'Et il ne pouvait pas y couper indéfiniment — sur quinze segments de deux '
                + 'couleurs, un triangle d\'une seule couleur est INÉVITABLE.';
        }
        if (this.quel === 'pipopipette') {
            return `${qui} — ${this.partie.score.B} carrés contre ${this.partie.score.N}. `
                + 'La fin se joue sur les chaînes : celui qui doit en ouvrir une la donne '
                + 'tout entière.';
        }
        return `${qui} : quatre alignés.`;
    }

    /**
     * UN CONSEIL DIT LA MÉTHODE, jamais le coup.
     *
     * Chaque jeu a SA question à se poser, et c'est elle qu'on rappelle — pas
     * la case où poser.
     */
    conseiller() {
        if (this.isDemo || this.fini) return;
        const p = this.partie;
        if (this.quel === 'pipopipette') {
            const gratuits = pipo.coups(p).filter(c => pipo.fermerait(p, c).length).length;
            const surs = pipo.coups(p).filter(c => pipo.longueurChaine(p, c) === 0).length;
            this.note(gratuits
                ? `Il y a ${gratuits} carré${gratuits > 1 ? 's' : ''} à prendre tout de suite — `
                    + 'et prendre te fait rejouer.'
                : (surs
                    ? `Aucun carré à prendre. Il te reste ${surs} trait${surs > 1 ? 's' : ''} qui `
                        + 'ne donne rien : joue là, et laisse l\'autre ouvrir une chaîne.'
                    : 'Tous les traits donnent quelque chose : donne la chaîne LA PLUS COURTE.'));
            return;
        }
        if (this.quel === 'puissance4') {
            const moi = p4.coupGagnant(p, p.trait);
            const lui = p4.coupGagnant(p, p.trait === 'B' ? 'N' : 'B');
            this.note(moi !== null
                ? 'Tu as un coup qui aligne quatre. Cherche-le : trois de tes jetons sont déjà en ligne.'
                : (lui !== null
                    ? 'Attention : l\'adversaire aligne quatre au prochain coup. Il faut bloquer.'
                    : 'Rien d\'urgent : joue vers le CENTRE, c\'est là que passent le plus '
                        + 'd\'alignements possibles.'));
            return;
        }
        const mortelles = sim.aretesMortelles(p, p.trait).length;
        const libres = sim.coups(p).length;
        this.note(mortelles === 0
            ? `Aucun de tes ${libres} segments restants ne te fait perdre. Choisis celui qui gêne `
                + 'le plus l\'autre.'
            : (mortelles === libres
                ? 'Tous les segments qui restent te feraient fermer un triangle : la partie est perdue.'
                : `Attention : ${mortelles} des ${libres} segments restants fermeraient TON triangle. `
                    + 'Regarde tes paires avant de poser.'));
    }

    // --- Le dessin -------------------------------------------------------------

    dessiner() {
        this.scoreEl.textContent = this.def.score(this.partie);
        ['B', 'N'].forEach(c => {
            this.container.querySelector(`[data-joueur="${c}"]`)
                .classList.toggle('jd-joueur--actif', !this.fini && this.partie.trait === c);
        });
        this.def.dessiner.call(this, this.partie);
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'jd-note' + (ton ? ` jd-note--${ton}` : '');
    }

    // --- La démonstration -------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        this.dessiner();
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say(this.def.consigne, this.plateauEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        const LECONS = {
            pipopipette: 'Le piège est là : poser le TROISIÈME côté d\'un carré l\'offre à '
                + 'l\'adversaire — et comme il rejoue, il prend toute la file derrière. On compte '
                + 'donc les chaînes avant de poser.',
            puissance4: 'Le jeton TOMBE : on ne choisit pas la case, on choisit la colonne. Poser '
                + 'sous une case gagnante la donne à l\'autre, et c\'est ce qui fait tout le jeu.',
            sim: 'Ici on ne cherche pas à gagner, on cherche à ÉVITER : le premier qui ferme un '
                + 'triangle de SA couleur a perdu. Et l\'on ne peut pas y couper indéfiniment — '
                + 'sur quinze segments de deux couleurs, un triangle d\'une seule couleur est '
                + 'inévitable. C\'est un théorème.'
        };
        cur.say(LECONS[this.quel], this.plateauEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        // Le robot joue les deux camps, quelques coups : c'est le déroulé qu'on
        // veut montrer, pas une partie entière.
        const m = this.def.module;
        for (let i = 0; i < 8; i++) {
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            if (m.terminee(this.partie)) break;
            const r = meilleurCoup(m.JEU, this.partie, {
                profondeur: Math.min(2, this.def.plafond), fantaisie: 0.25, rng: this.rng
            });
            if (!r) break;
            this.partie = m.jouer(this.partie, r.coup);
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.press * 2)) return fin();
        }
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('À toi maintenant. On peut y jouer à deux sur la même tablette, ou contre '
            + 'l\'ordinateur.', this.plateauEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        clearTimeout(this.minuteur);
        super.destroy();
    }
}

// --- Les trois dessins ---------------------------------------------------------

/**
 * LA PIPOPIPETTE. Les points, les traits posés, et — par-dessus — des cibles
 * transparentes larges : au doigt, un trait de 2 px est intouchable.
 */
function dessinerPipo(p) {
    const PAS = 46, MARGE = 26;
    const W = MARGE * 2 + p.cols * PAS;
    const H = MARGE * 2 + p.rows * PAS;
    const px = (x) => MARGE + x * PAS;

    const carres = p.cases.map((ligne, y) => ligne.map((qui, x) => qui === null ? '' :
        `<rect class="jd-carre" x="${px(x) + 3}" y="${px(y) + 3}" width="${PAS - 6}" height="${PAS - 6}"
            rx="5" fill="${TEINTES[qui]}"></rect>
         <text class="jd-initiale" x="${px(x) + PAS / 2}" y="${px(y) + PAS / 2}"
            font-size="${PAS * 0.42}" fill="${TEINTES[qui]}">${qui === 'B' ? 'B' : 'R'}</text>`
    ).join('')).join('');

    // LES CIBLES DU DOIGT PASSENT APRÈS TOUS LES TRAITS.
    //
    // Dessinées juste après le trait qu'elles servent, elles se faisaient
    // recouvrir par les traits POSTÉRIEURS : au bout de quelques coups, un
    // trait libre devenait intouchable parce qu'un trait déjà posé passait
    // par-dessus sa zone de 16 px. En SVG, le dernier dessiné est celui qui
    // reçoit le doigt — les cibles sont donc toutes à la fin.
    const traits = [], cibles = [];
    const trait = (c, x1, y1, x2, y2) => {
        const pose = c.t === 'h' ? p.h[c.y][c.x] : p.v[c.y][c.x];
        const dernier = p.dernier && p.dernier.t === c.t && p.dernier.x === c.x && p.dernier.y === c.y;
        if (pose) {
            const par = dernier ? p.dernier.par : null;
            traits.push(`<line class="jd-trait" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                stroke="${par ? TEINTES[par] : 'var(--text-main)'}" stroke-width="${dernier ? 6 : 4}"></line>`);
            return;
        }
        traits.push(`<line class="jd-trait jd-trait--libre" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`);
        cibles.push(`<line class="jd-cible" data-coup="${c.t},${c.x},${c.y}"
            x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`);
    };

    for (let y = 0; y <= p.rows; y++) {
        for (let x = 0; x < p.cols; x++) trait({ t: 'h', x, y }, px(x), px(y), px(x + 1), px(y));
    }
    for (let y = 0; y < p.rows; y++) {
        for (let x = 0; x <= p.cols; x++) trait({ t: 'v', x, y }, px(x), px(y), px(x), px(y + 1));
    }

    let points = '';
    for (let y = 0; y <= p.rows; y++) {
        for (let x = 0; x <= p.cols; x++) points += `<circle class="jd-point" cx="${px(x)}" cy="${px(y)}" r="4"></circle>`;
    }

    this.wrapEl.style.setProperty('--jd-large', `${W}`);
    this.plateauEl.innerHTML = `<svg class="jd-svg" viewBox="0 0 ${W} ${H}"
        style="width: min(96cqw, ${(W / H * 70).toFixed(0)}cqh, ${W * 1.6}px); height: auto"
        role="img" aria-label="Plateau de pipopipette">
        ${carres}${traits.join('')}${points}${cibles.join('')}</svg>`;
    this.plateauEl.querySelectorAll('[data-coup]').forEach(el => {
        el.onclick = () => {
            const [t, x, y] = el.dataset.coup.split(',');
            this.jouer({ t, x: Number(x), y: Number(y) });
        };
    });
}

/** LE PUISSANCE 4 : une colonne entière est la cible, pas une case. */
function dessinerP4(p) {
    const PAS = 54, MARGE = 8;
    const W = MARGE * 2 + p.cols * PAS;
    const H = MARGE * 2 + p.rows * PAS;
    const gagnantes = new Set((p.alignement ? p.alignement.cases : []).map(c => `${c.x},${c.y}`));

    const trous = p.grille.map((ligne, y) => ligne.map((c, x) => {
        const cx = MARGE + x * PAS + PAS / 2, cy = MARGE + y * PAS + PAS / 2;
        if (c === null) return `<circle class="jd-trou" cx="${cx}" cy="${cy}" r="${PAS * 0.4}"></circle>`;
        const gagne = gagnantes.has(`${x},${y}`);
        return `<circle class="jd-jeton${gagne ? ' jd-gagnant' : ''}" cx="${cx}" cy="${cy}"
            r="${PAS * 0.4}" fill="${TEINTES[c]}"></circle>`;
    }).join('')).join('');

    const jouables = new Set(p4.coups(p));
    const colonnes = Array.from({ length: p.cols }, (_, x) => jouables.has(x)
        ? `<g class="jd-colonne" data-col="${x}">
             <rect x="${MARGE + x * PAS}" y="${MARGE}" width="${PAS}" height="${p.rows * PAS}"
                   fill="transparent"></rect></g>` : '').join('');

    this.plateauEl.innerHTML = `<svg class="jd-svg" viewBox="0 0 ${W} ${H}"
        style="width: min(96cqw, ${(W / H * 72).toFixed(0)}cqh, ${W * 1.6}px); height: auto"
        role="img" aria-label="Grille de puissance 4">
        <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="#1d4ed8"></rect>
        ${trous}${colonnes}</svg>`;
    this.plateauEl.querySelectorAll('[data-col]').forEach(el => {
        el.onclick = () => this.jouer(Number(el.dataset.col));
    });
}

/** LE SIM : six points, quinze segments, et le triangle fatal qui pulse. */
/**
 * LE SIM SE TRACE, IL NE SE CLIQUE PAS.
 *
 * Rémy : « pour le sim je préférerais le mode où on relie les traits en
 * cliquant et relâchant, pas qu'on voie les traits avant ». Les deux vont
 * ensemble, et le second explique le premier.
 *
 * Les quinze segments étaient DESSINÉS EN GRIS dès le départ, et l'on cliquait
 * celui qu'on voulait. Mais sur un hexagone complet, neuf segments se croisent
 * au centre : les cibles du doigt se recouvrent, et le segment coloré n'est
 * pas celui qu'on visait. Sur un téléphone, cela donne un jeu qui « ne
 * répond pas » — alors qu'il répondait très bien, à côté.
 *
 * Six points, rien d'autre. On appuie sur un point, on tire, on relâche sur un
 * autre : le trait se colorie. Les cibles ne sont plus quinze traits qui se
 * croisent mais six disques bien séparés, et c'est le geste du papier.
 *
 * DEUX GESTES, UNE SEULE RÈGLE. Appuyer-tirer-relâcher, ou toucher un point
 * puis l'autre : relâcher sur le point de départ le garde SÉLECTIONNÉ, et
 * l'appui suivant sur un autre point ferme le trait. On n'a rien à apprendre,
 * les deux marchent.
 */
function dessinerSim(p) {
    const R = 120, MARGE = 40;
    const T = (R + MARGE) * 2;
    const PRISE = 44;                 // le rayon d'accroche, en unités du dessin
    const pts = sim.positions(R, R + MARGE, R + MARGE);
    const fatal = new Set(p.perdant ? p.perdant.triangle.aretes : []);

    // SEULS LES SEGMENTS DÉJÀ COLORIÉS SE DESSINENT — comme sur le papier.
    const traits = sim.ARETES.map(([a, b], i) => {
        const c = p.couleurs[i];
        if (c === null) return '';
        const A = pts[a], B = pts[b];
        return `<line class="jd-arete${fatal.has(i) ? ' jd-arete--fatale' : ''}"
            x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}"
            stroke="${TEINTES[c]}" stroke-width="${fatal.has(i) ? 8 : 5}"></line>`;
    }).join('');

    const depart = this.simDepart;
    const sommets = pts.map((q, i) => `
        <circle class="jd-sommet${depart === i ? ' jd-sommet--choisi' : ''}"
                cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="13"></circle>
        <text class="jd-etiquette" x="${q.x.toFixed(1)}" y="${q.y.toFixed(1)}">${i + 1}</text>`).join('');
    // Les prises du doigt, dessinées EN DERNIER et invisibles : elles doivent
    // recevoir l'appui même s'il tombe un peu à côté du disque visible.
    const prises = pts.map((q, i) =>
        `<circle class="jd-prise" data-sommet="${i}" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}"
                 r="${PRISE * 0.62}"></circle>`).join('');

    this.plateauEl.innerHTML = `<svg class="jd-svg jd-svg--trace" viewBox="0 0 ${T} ${T}"
        style="width: min(94cqw, 78cqh, 420px); height: auto"
        role="img" aria-label="Les six points du Sim">
        ${traits}<line class="jd-elastique" data-elastique style="display:none"></line>${sommets}${prises}</svg>`;

    const svg = this.plateauEl.querySelector('svg');
    const elastique = svg.querySelector('[data-elastique]');
    if (this.fini || this.isDemo) return;

    // Du pixel de l'écran au repère du dessin. Le viewBox est carré et l'image
    // garde ses proportions : un seul facteur suffit.
    const versDessin = (ev) => {
        const r = svg.getBoundingClientRect();
        return { x: (ev.clientX - r.left) * T / r.width, y: (ev.clientY - r.top) * T / r.height };
    };
    const pointSous = (ev) => {
        const q = versDessin(ev);
        let meilleur = -1, court = PRISE;
        pts.forEach((s, i) => {
            const d = Math.hypot(s.x - q.x, s.y - q.y);
            if (d < court) { court = d; meilleur = i; }
        });
        return meilleur;
    };
    const montrerElastique = (ev) => {
        if (this.simDepart === null) return;
        const A = pts[this.simDepart], q = versDessin(ev);
        elastique.setAttribute('x1', A.x.toFixed(1));
        elastique.setAttribute('y1', A.y.toFixed(1));
        elastique.setAttribute('x2', q.x.toFixed(1));
        elastique.setAttribute('y2', q.y.toFixed(1));
        elastique.style.display = '';
    };
    const choisir = (i) => {
        this.simDepart = i;
        svg.querySelectorAll('.jd-sommet').forEach((el, k) => el.classList.toggle('jd-sommet--choisi', k === i));
    };
    const lacher = () => {
        this.simDepart = null;
        elastique.style.display = 'none';
        svg.querySelectorAll('.jd-sommet--choisi').forEach(el => el.classList.remove('jd-sommet--choisi'));
    };

    // TERMINER UN TRAIT. Le refus dit POURQUOI : sur un plateau où presque tout
    // se ressemble, « il ne se passe rien » se lit comme une panne.
    const relier = (a, b) => {
        const i = sim.indiceArete(a, b);
        if (i < 0) { lacher(); return; }
        if (p.couleurs[i] !== null) {
            this.note('Ce segment est déjà colorié. Choisis-en un autre.');
            lacher();
            return;
        }
        lacher();
        this.jouer(i);
    };

    svg.querySelectorAll('[data-sommet]').forEach(el => {
        el.addEventListener('pointerdown', (ev) => {
            ev.preventDefault();
            if (this.fini) return;
            if (this.contreMachine && p.trait === this.machine) return;
            const i = Number(el.dataset.sommet);
            // Un point déjà choisi et l'on appuie sur un AUTRE : c'est le
            // second geste, celui de ceux qui touchent deux fois.
            if (this.simDepart !== null && this.simDepart !== i) { relier(this.simDepart, i); return; }
            choisir(i);
            svg.setPointerCapture(ev.pointerId);
        });
    });
    svg.addEventListener('pointermove', montrerElastique);
    svg.addEventListener('pointerup', (ev) => {
        if (this.simDepart === null) return;
        elastique.style.display = 'none';
        const i = pointSous(ev);
        if (i < 0) { lacher(); return; }
        // Relâché sur son point de départ : on le GARDE choisi. C'est ce qui
        // fait marcher le toucher-toucher sans rien avoir à expliquer.
        if (i === this.simDepart) {
            this.note('Point ' + (i + 1) + ' choisi. Relâche — ou touche — un autre point pour tracer le segment.');
            return;
        }
        relier(this.simDepart, i);
    });
    svg.addEventListener('pointercancel', lacher);
}

// --- Les trois moteurs ----------------------------------------------------------

const lancer = (quel) => (container, isDemo, params) => {
    const jeu = new JeuADeux(container, isDemo, params, quel);
    jeu.start();
    return jeu;
};

export const enginePipopipette = lancer('pipopipette');
export const enginePuissance4 = lancer('puissance4');
export const engineSim = lancer('sim');
