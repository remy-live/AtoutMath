// LE POUSSEUR — à l'écran.
//
// Rémy : « J'aimerai […] un jeu façon sokoban. Il faut que ce soit progressif. »
//
// LE SERVICE QUE LE CARTON NE REND PAS : DIRE QUE C'EST PERDU. Une caisse
// poussée dans un coin n'en sortira plus jamais, et le jeu continue pourtant de
// proposer des coups — on peut s'acharner un quart d'heure sur une partie finie
// depuis le troisième coup. Le noyau, lui, sait exactement quelles positions
// sont encore résolubles : il a remonté le jeu depuis la fin. On le dit donc
// tout de suite, et « Annuler » ramène en arrière. C'est ce qui transforme
// l'acharnement en apprentissage.
//
// ON MARCHE EN TOUCHANT LE SOL, ON POUSSE EN MARCHANT DANS UNE CAISSE. Deux
// gestes, pas trois. Toucher une case libre atteignable y emmène le pousseur ;
// toucher une caisse voisine la pousse. Les quatre flèches restent, pour la
// souris et pour le clavier, mais elles ne sont pas la façon naturelle de jouer
// sur une tablette.
//
// LE COMPTEUR COMPTE LES POUSSÉES, PAS LES PAS. C'est la mesure du sokoban :
// marcher ne coûte rien, c'est ce qu'on fait des caisses qui compte. Le minimum
// affiché est celui du plus court chemin, calculé — personne ne peut faire
// mieux.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    MUR, BUT, DIRECTIONS, NIVEAUX_POUSSEUR, creerPousseur, zone, pousseesPossibles,
    pousser, estRange, pousseesRestantes, estPerdue, prochainePoussee, cheminAPied,
    qualitePousseur
} from '../core/pousseur.js';

const COMPETENCE = 'defi.pousseur';

class Pousseur extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'pousseur');
        this.niveau = Number(this.params.niveau) || 1;
        this.graine = this.params.seed || 'sk';
        this.aides = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .sk-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(3px, 1.1cqh, 9px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .sk-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size; overflow: hidden;
                }
                .sk-plateau {
                    position: relative; flex: 0 0 auto;
                    --sk-case: clamp(22px, min(calc(88cqw / var(--sk-l, 7)),
                                     calc(80cqh / var(--sk-h, 7))), 76px);
                    width: calc(var(--sk-case) * var(--sk-l, 7));
                    height: calc(var(--sk-case) * var(--sk-h, 7));
                    background: #f4f5f8; border-radius: 6px;
                }
                /* LES ENFANTS SE DIMENSIONNENT EN POURCENTAGE DU PLATEAU, et
                   surtout pas avec la variable qui a servi a le construire.
                   La variable --sk-case contient des unites cqw et cqh : une
                   variable personnalisee est heritee SANS etre calculee, et ses
                   unites se reevaluent chez chaque descendant. Le pousseur
                   sortait a soixante-seize pixels dans une grille de
                   soixante-trois. Un pourcentage, lui, se lit sur la taille
                   reelle du parent.
                   (Et surtout : PAS D'ACCENT GRAVE dans un commentaire CSS
                   ecrit dans un litteral gabarit — il ferme le litteral.) */
                .sk-case {
                    position: absolute; box-sizing: border-box;
                    width: calc(100% / var(--sk-l, 7)); height: calc(100% / var(--sk-h, 7));
                }
                /* LE MUR EST PLEIN, LE SOL EST CLAIR, LE BUT EST MARQUÉ. Trois
                   choses à distinguer d'un coup d'œil, et la troisième doit
                   rester visible SOUS une caisse posée dessus. */
                .sk-mur { background: #6b7480; border-radius: 3px;
                    box-shadow: inset 0 0 0 2px #59626d; }
                .sk-sol { background: #e8ebf2; box-shadow: inset 0 0 0 1px #dfe3ec; }
                /* UN BUT SE VOIT AUSSI SUR UN TÉLÉPHONE. Rémy : « les cercles
                   pointillés ne se voient pas sur portable. »

                   MESURÉ : sur un iPhone, une case fait 40,7 px, donc le cercle
                   à 30 % d'inset en faisait 10,3 — dont 6 mangés par les deux
                   bords. Il restait quatre pixels de trou, et le pointillé,
                   lui, n'avait plus la place d'être un pointillé : deux tirets
                   sur un cercle de dix pixels ne dessinent rien.

                   UN POINTILLÉ EST UNE TEXTURE, et une texture a besoin de
                   pixels pour exister. À cette taille il faut une FORME : un
                   anneau plein, et un fond teinté qui dit « ici, il manque une
                   caisse » même quand l'anneau se réduit à un trait. Le cercle
                   grandit au passage — 22 % d'inset au lieu de 30. */
                .sk-but::after {
                    content: ''; position: absolute; inset: 22%;
                    border-radius: 50%; border: 2px solid #2f855a;
                    background: rgba(47, 133, 90, .16);
                    box-sizing: border-box;
                }
                .sk-marche { cursor: pointer; }
                .sk-marche:hover { background: #dbe3f5; }
                .sk-caisse {
                    position: absolute; box-sizing: border-box;
                    width: calc(100% / var(--sk-l, 7)); height: calc(100% / var(--sk-h, 7));
                    padding: 1.2%;
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                    transition: left .12s ease, top .12s ease;
                }
                /* UN DIV, PAS UN <i>. L'application habille les <i> comme des
                   icones (largeur d'un cadratin) et la caisse sortait grosse
                   comme un point. */
                .sk-boite {
                    width: 100%; height: 100%; box-sizing: border-box;
                    background: #d69e2e; border: 3px solid #8a5f11;
                    border-radius: 14%;
                    box-shadow: inset 0 0 0 3px #b5811d;
                }
                /* Une caisse arrivée sur son but change de couleur : c'est la
                   seule récompense immédiate du jeu, et elle se voit de loin. */
                .sk-caisse--posee .sk-boite { background: #48bb78; border-color: #1b4d34;
                    box-shadow: inset 0 0 0 3px #2f855a; }
                .sk-caisse--montre .sk-boite { box-shadow: 0 0 0 4px #b7791f; }
                .sk-pousseur {
                    position: absolute; box-sizing: border-box;
                    width: calc(100% / var(--sk-l, 7)); height: calc(100% / var(--sk-h, 7));
                    padding: 1.5%; pointer-events: none;
                    transition: left .1s ease, top .1s ease;
                }
                .sk-pousseur svg { width: 100%; height: 100%; display: block; }

                .sk-compte {
                    font-weight: 700; font-size: clamp(11px, 2.3cqh, 15px);
                    display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
                }
                .sk-compte b { color: #4c3fd0; }
                .sk-compte .sk-detour { color: #b7791f; }
                .sk-fleches { display: grid; grid-template-columns: repeat(3, auto);
                    gap: 4px; justify-items: center; }
                .sk-fl {
                    width: clamp(30px, 7cqh, 44px); height: clamp(30px, 7cqh, 44px);
                    border-radius: 10px; font-weight: 800; font-size: clamp(13px, 3cqh, 19px);
                    border: 1px solid var(--border-soft, #cbd5e1);
                    background: var(--bg-panel, #fff); color: var(--text-main); cursor: pointer;
                }
                .sk-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .sk-btn {
                    padding: 5px 12px; border-radius: 999px; font-weight: 700;
                    border: 1px solid var(--border-soft, #cbd5e1);
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    cursor: pointer; font-size: clamp(11px, 2.3cqh, 14px);
                }
                .sk-note { min-height: 2.2em; text-align: center; font-weight: 600;
                    font-size: clamp(11px, 2.3cqh, 15px); }
                .sk-note--ok { color: #2f855a; }
                .sk-note--ko { color: #c53030; }
            </style>
            <div class="sk-wrap">
                <div class="sk-corps"><div class="sk-plateau" id="sk-plateau"></div></div>
                <div class="sk-compte" id="sk-compte"></div>
                <div class="sk-note" id="sk-note"></div>
                <div class="sk-fleches">
                    <span></span><button type="button" class="sk-fl" data-d="0">↑</button><span></span>
                    <button type="button" class="sk-fl" data-d="3">←</button>
                    <button type="button" class="sk-fl" data-d="2">↓</button>
                    <button type="button" class="sk-fl" data-d="1">→</button>
                </div>
                <div class="sk-barre">
                    <button type="button" class="sk-btn" id="sk-aide">💡 La bonne poussée</button>
                    <button type="button" class="sk-btn" id="sk-annule">↶ Annuler</button>
                    <button type="button" class="sk-btn" id="sk-neuf">Recommencer</button>
                </div>
            </div>`;
        this.plateauEl = this.container.querySelector('#sk-plateau');
        this.compteEl = this.container.querySelector('#sk-compte');
        this.noteEl = this.container.querySelector('#sk-note');
        this.container.querySelector('#sk-aide').onclick = () => this.aider();
        this.container.querySelector('#sk-annule').onclick = () => this.annuler();
        this.container.querySelector('#sk-neuf').onclick = () => this.rejouer();
        this.container.querySelectorAll('.sk-fl').forEach(b => {
            b.onclick = () => this.avancer(Number(b.dataset.d));
        });
        // Le clavier, pour qui joue à l'ordinateur.
        this.surTouche = (e) => {
            const d = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key];
            if (d === undefined) return;
            e.preventDefault();
            this.avancer(d);
        };
        window.addEventListener('keydown', this.surTouche);
        this.poser();
    }

    poser(neuf = false) {
        this.arreterMarche();
        if (neuf) this.graine = `${this.graine}+`;
        this.fini = true;
        this.note(`Je prépare un entrepôt de niveau ${this.niveau}…`);
        this.compteEl.textContent = '';
        this.plateauEl.innerHTML = '';
        setTimeout(() => {
            if (!this.isRunning && !this.isDemo) return;
            this.jeu = creerPousseur({ niveau: this.niveau, rng: makeRng(this.graine) });
            if (!this.jeu) { this.note('Je n\'ai pas trouvé d\'entrepôt — réessaie.', 'ko'); return; }
            this.rejouer();
        }, 30);
    }

    /** On repart de la position de départ, sans refabriquer l'entrepôt. */
    rejouer() {
        this.arreterMarche();
        if (!this.jeu) return;
        this.caisses = this.jeu.caisses.slice();
        this.pousseur = this.jeu.pousseur;
        this.histoire = [];
        this.montre = null;
        this.poussees = 0;
        this.pas = 0;
        this.fini = false;
        this.dessiner();
        this.note(`Range les ${this.caisses.length} caisses sur les ronds verts. `
            + `Minimum : <b>${this.jeu.mini}</b> poussées.`);
    }

    /** Un petit personnage vu de dessus, tourné dans le sens de la marche. */
    pousseurSvg(dir = 2) {
        const angle = [0, 90, 180, 270][dir];
        return `<svg viewBox="0 0 60 60" aria-hidden="true">
            <g transform="rotate(${angle} 30 30)">
                <circle cx="30" cy="34" r="19" fill="#4c3fd0" stroke="#2a2183" stroke-width="3"/>
                <circle cx="30" cy="24" r="11" fill="#f6ad55" stroke="#9c5b12" stroke-width="2.5"/>
                <rect x="12" y="44" width="36" height="8" rx="4" fill="#2a2183"/>
            </g></svg>`;
    }

    dessiner() {
        const j = this.jeu, p = j.plan;
        this.plateauEl.style.setProperty('--sk-l', p.l);
        this.plateauEl.style.setProperty('--sk-h', p.h);
        const z = zone(p, this.caisses, this.pousseur);
        const surCaisse = new Set(this.caisses);

        const cases = [];
        for (let i = 0; i < p.cases.length; i++) {
            const x = i % p.l, y = Math.floor(i / p.l);
            const cls = ['sk-case'];
            if (p.cases[i] === MUR) cls.push('sk-mur');
            else {
                cls.push('sk-sol');
                if (p.cases[i] === BUT) cls.push('sk-but');
                if (!this.fini && z.vu[i] && !surCaisse.has(i)) cls.push('sk-marche');
            }
            cases.push(`<div class="${cls.join(' ')}" data-i="${i}"
                style="left:${(x * 100 / p.l).toFixed(4)}%;
                top:${(y * 100 / p.h).toFixed(4)}%"></div>`);
        }

        const caisses = this.caisses.map((c, k) => {
            const x = c % p.l, y = Math.floor(c / p.l);
            const cls = ['sk-caisse'];
            if (p.cases[c] === BUT) cls.push('sk-caisse--posee');
            if (this.montre === k) cls.push('sk-caisse--montre');
            return `<div class="${cls.join(' ')}" data-c="${k}"
                style="left:${(x * 100 / p.l).toFixed(4)}%; top:${(y * 100 / p.h).toFixed(4)}%"
                ><div class="sk-boite"></div></div>`;
        });

        const px = this.pousseur % p.l, py = Math.floor(this.pousseur / p.l);
        const perso = `<div class="sk-pousseur" style="left:${(px * 100 / p.l).toFixed(4)}%;
            top:${(py * 100 / p.h).toFixed(4)}%">${this.pousseurSvg(this.dernierSens || 2)}</div>`;

        this.plateauEl.innerHTML = cases.join('') + caisses.join('') + perso;
        this.plateauEl.querySelectorAll('[data-i]').forEach(el => {
            el.onclick = () => this.toucherCase(Number(el.dataset.i));
        });
        this.plateauEl.querySelectorAll('[data-c]').forEach(el => {
            el.onclick = () => this.toucherCaisse(Number(el.dataset.c));
        });

        const reste = this.fini ? 0 : pousseesRestantes(p, j.table, this.caisses, this.pousseur);
        const detour = reste === null ? 0 : this.poussees + reste - j.mini;
        this.compteEl.innerHTML = `<span>niveau <b>${j.niveau}</b></span>`
            + `<span><b>${this.poussees}</b> poussées</span>`
            + `<span>minimum : <b>${j.mini}</b></span>`
            + (this.fini ? ''
                : reste === null ? '<span class="sk-detour">position perdue</span>'
                    : `<span>il en reste <b>${reste}</b></span>`)
            + (detour > 0 ? `<span class="sk-detour">${detour} de détour</span>` : '');
    }

    /**
     * LE POUSSEUR MARCHE, IL NE SE TÉLÉPORTE PAS.
     *
     * Rémy : « Pour le pousseur, il va n'importe où alors qu'il doit avancer
     * case par case. » Toucher une case lointaine reste le bon geste sur une
     * tablette — mais le personnage y APPARAISSAIT, et on ne voyait donc
     * jamais par où il était passé. Or c'est le chemin qui enseigne : c'est
     * lui qui montre qu'il a dû faire le tour, et donc pourquoi telle poussée
     * était impossible depuis l'autre côté.
     *
     * Il parcourt donc sa route case par case, une image toutes les 90 ms. Un
     * nouveau geste pendant la marche la TERMINE d'un coup au lieu de
     * l'attendre : le jeu ne doit jamais avoir l'air de ne pas répondre.
     */
    marcher(chemin, apres) {
        this.finirMarche();
        if (!chemin || !chemin.length) { if (apres) apres(); return; }
        const p = this.jeu.plan;
        const pas = chemin.slice();
        let k = 0;
        const unPas = () => {
            const di = pas[k++];
            const d = DIRECTIONS[di];
            const x = this.pousseur % p.l, y = Math.floor(this.pousseur / p.l);
            this.pousseur = (y + d.dy) * p.l + (x + d.dx);
            this.dernierSens = di;
            this.pas++;
        };
        const m = { apres: apres || null, reste: () => { while (k < pas.length) unPas(); } };
        m.timer = setInterval(() => {
            if (!this.isRunning && !this.isDemo) return this.arreterMarche();
            // UN TEMPS D'ARRÊT SUR LA CASE D'ARRIVÉE avant ce qui suit. Sans
            // lui, le dernier pas et la poussée tombaient dans la même image :
            // on ne voyait jamais le pousseur se placer DERRIÈRE la caisse,
            // qui est pourtant le geste que le jeu doit enseigner.
            if (k >= pas.length) return this.finirMarche();
            unPas();
            this.dessiner();
        }, 90);
        this.marche = m;
    }

    /** Couper la marche sans la finir : on repart de zéro (nouvelle partie, sortie). */
    arreterMarche() {
        if (!this.marche) return;
        clearInterval(this.marche.timer);
        this.marche = null;
    }

    /** Arriver tout de suite au bout de la marche, et faire ce qui la suivait. */
    finirMarche() {
        // Une marche peut en enchaîner une autre — aller jusqu'à la caisse,
        // PUIS la pousser : on vide la file, pas seulement sa tête.
        for (let garde = 0; this.marche && garde < 20; garde++) {
            const m = this.marche;
            this.arreterMarche();
            m.reste();
            if (m.apres) m.apres();
        }
        if (this.jeu && this.plateauEl) this.dessiner();
    }

    /** Toucher le sol : le pousseur y va à pied, s'il peut, sans rien bouger. */
    toucherCase(i) {
        this.finirMarche();
        if (this.isDemo || this.fini) return;
        this.montre = null;
        const chemin = cheminAPied(this.jeu.plan, this.caisses, this.pousseur, i);
        if (!chemin) {
            this.note('Le pousseur ne peut pas aller là : les caisses lui barrent le passage.',
                'ko');
            return;
        }
        if (!chemin.length) return;
        this.note('');
        this.marcher(chemin);
    }

    /** Toucher une caisse : on la pousse, si le pousseur peut se placer derrière. */
    toucherCaisse(k) {
        this.finirMarche();
        if (this.isDemo || this.fini) return;
        this.montre = null;
        const possibles = pousseesPossibles(this.jeu.plan, this.caisses, this.pousseur)
            .filter(c => c.k === k);
        if (!possibles.length) {
            this.dessiner();
            this.note('Cette caisse-là ne peut pas bouger : ou bien il y a un mur derrière, '
                + 'ou bien le pousseur ne peut pas se mettre en face.', 'ko');
            return;
        }
        // UNE SEULE POUSSÉE POSSIBLE, UN SEUL GESTE. Quand il y en a plusieurs,
        // on prend celle qui demande le moins de pas : c'est celle que le
        // joueur avait en tête neuf fois sur dix, et « Annuler » est là.
        possibles.sort((a, b) =>
            (cheminAPied(this.jeu.plan, this.caisses, this.pousseur, a.depuis) || []).length
            - (cheminAPied(this.jeu.plan, this.caisses, this.pousseur, b.depuis) || []).length);
        this.jouerPoussee(possibles[0]);
    }

    /** Une flèche : le pousseur avance, et pousse ce qu'il rencontre. */
    avancer(di) {
        this.finirMarche();
        if (this.isDemo || this.fini || !this.jeu) return;
        this.montre = null;
        const p = this.jeu.plan;
        const d = DIRECTIONS[di];
        const x = this.pousseur % p.l, y = Math.floor(this.pousseur / p.l);
        const nx = x + d.dx, ny = y + d.dy;
        if (nx < 0 || ny < 0 || nx >= p.l || ny >= p.h) return;
        const suivante = ny * p.l + nx;
        if (p.cases[suivante] === MUR) return;
        this.dernierSens = di;
        const k = this.caisses.indexOf(suivante);
        if (k < 0) {
            this.pousseur = suivante;
            this.pas++;
            this.dessiner();
            return;
        }
        const coup = pousseesPossibles(p, this.caisses, this.pousseur)
            .find(c => c.k === k && c.depuis === this.pousseur && c.dir === di);
        if (!coup) {
            this.dessiner();
            this.note('Rien derrière cette caisse : elle ne peut pas reculer, et on ne '
                + 'la TIRE jamais.', 'ko');
            return;
        }
        this.jouerPoussee(coup);
    }

    /**
     * Une poussée, c'est d'abord une MARCHE : le pousseur va se placer derrière
     * la caisse, et c'est seulement là qu'il pousse. Le déplacement à pied
     * s'affiche donc case par case comme les autres, et « Annuler » ramène
     * bien avant la marche puisque l'histoire est enregistrée maintenant.
     */
    jouerPoussee(coup) {
        const p = this.jeu.plan;
        this.histoire.push({ caisses: this.caisses.slice(), pousseur: this.pousseur,
            poussees: this.poussees, pas: this.pas });
        const approche = cheminAPied(p, this.caisses, this.pousseur, coup.depuis) || [];
        this.marcher(approche, () => this.appliquerPoussee(coup));
    }

    appliquerPoussee(coup) {
        const p = this.jeu.plan;
        const suite = pousser(this.caisses, coup);
        this.caisses = suite.caisses;
        this.pousseur = suite.pousseur;
        this.dernierSens = coup.dir;
        this.poussees++;
        this.pas++;
        this.dessiner();
        if (estRange(p, this.caisses)) return this.gagner();
        // LA POSITION PERDUE, DITE TOUT DE SUITE. C'est le service que le
        // carton ne rend pas, et le seul qui compte vraiment ici.
        if (estPerdue(p, this.jeu.table, this.caisses, this.pousseur)) {
            this.note('⚠️ Cette position est PERDUE : cette caisse-là ne pourra plus jamais '
                + 'atteindre un but. On ne tire pas les caisses — « Annuler » te ramène '
                + 'en arrière.', 'ko');
            return;
        }
        this.note('');
    }

    annuler() {
        this.finirMarche();
        if (this.isDemo || this.fini || !this.histoire.length) return;
        const avant = this.histoire.pop();
        this.caisses = avant.caisses;
        this.pousseur = avant.pousseur;
        this.poussees = avant.poussees;
        this.pas = avant.pas;
        this.montre = null;
        this.dessiner();
        this.note('Poussée annulée.');
    }

    aider() {
        this.finirMarche();
        if (this.isDemo || this.fini) return;
        const p = this.jeu.plan;
        if (estPerdue(p, this.jeu.table, this.caisses, this.pousseur)) {
            this.note('Il n\'y a plus rien à faire d\'ici : la position est perdue. '
                + 'Annule un ou plusieurs coups.', 'ko');
            return;
        }
        const c = prochainePoussee(p, this.jeu.table, this.caisses, this.pousseur);
        if (!c) return;
        this.aides++;
        if (this.montre !== c.k) {
            this.montre = c.k;
            this.dessiner();
            this.note(`C'est cette caisse-là qu'il faut pousser, vers `
                + `${DIRECTIONS[c.dir].nom === 'haut' ? 'le HAUT'
                    : DIRECTIONS[c.dir].nom === 'bas' ? 'le BAS'
                        : DIRECTIONS[c.dir].nom === 'droite' ? 'la DROITE' : 'la GAUCHE'}. `
                + 'Regarde d\'abord où le pousseur doit se placer pour cela.');
            return;
        }
        this.jouerPoussee(c);
    }

    gagner() {
        if (this.fini) return;
        this.fini = true;
        this.montre = null;
        this.dessiner();
        const q = qualitePousseur(this.jeu.mini, this.poussees);
        this.note(q.parfait
            ? `🏆 Parfait — ${q.poussees} poussées, le minimum démontré de cet entrepôt.`
            : `🏆 Rangé en ${q.poussees} poussées. Le minimum était ${q.mini} : `
                + `${q.detours} de détour.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Le Pousseur, niveau ${this.jeu.niveau}`,
            expected: `${q.mini} poussées`, given: `${q.poussees} poussées`,
            points: Math.max(10, 20 + this.jeu.mini - Math.round(q.detours / 2) - this.aides * 2)
        });
        if (this.niveau < NIVEAUX_POUSSEUR.length) this.niveau++;
        // On enchaîne sur un nouvel entrepôt, d'un niveau au-dessus.
        setTimeout(() => { if (this.isRunning) this.poser(true); }, 2200);
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'sk-note' + (ton ? ` sk-note--${ton}` : '');
    }

    /**
     * Le robot montre CE QUI TUE UNE PARTIE : une caisse dans un coin. C'est la
     * seule chose qu'il faut savoir avant de commencer, et la seule qu'on
     * n'apprend pas en jouant — parce que rien ne la signale sur un carton.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        for (let i = 0; i < 60 && !this.jeu; i++) if (!await cur.pause(100)) return fin();
        if (!this.jeu) return fin();
        if (!await cur.pause(400) || !this.isRunning) return fin();

        cur.say('Le pousseur POUSSE, il ne tire jamais. Une caisse envoyée contre un mur ne '
            + 'reviendra plus le long de ce mur ; dans un coin, elle ne bougera plus du tout.',
        this.plateauEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say('Alors avant de pousser, la question n\'est pas « est-ce que ça avance ? » mais '
            + '« est-ce que je pourrai revenir ? ». Le jeu te prévient dès que la position '
            + 'devient perdue — mais la voir venir, c\'est tout l\'exercice.', this.plateauEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let i = 0; i < 4; i++) {
            const c = prochainePoussee(this.jeu.plan, this.jeu.table, this.caisses, this.pousseur);
            if (!c) break;
            this.montre = c.k;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.step || 500) || !this.isRunning) return fin();
            const suite = pousser(this.caisses, c);
            this.caisses = suite.caisses;
            this.pousseur = suite.pousseur;
            this.dernierSens = c.dir;
            this.poussees++;
            this.montre = null;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.step || 500) || !this.isRunning) return fin();
        }
        cur.say(`Il en faut ${this.jeu.mini} au minimum sur cet entrepôt-là. Le compteur te dit `
            + 'combien il en reste : s\'il monte, tu viens de faire un détour.', this.compteEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        this.arreterMarche();
        if (this.surTouche) window.removeEventListener('keydown', this.surTouche);
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function enginePousseur(container, isDemo, params) {
    const game = new Pousseur(container, isDemo, params);
    game.start();
    return game;
}
