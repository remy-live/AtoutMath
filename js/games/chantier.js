// LE CHANTIER DES BLOCS — pousser des produits sur leurs résultats.
//
// Le jeu tient en une phrase : un bloc poussé GLISSE jusqu'au premier
// obstacle ; s'il s'arrête sur la dalle qui porte son résultat, il se scelle
// et devient lui-même un obstacle.
//
// Ce qu'on y travaille n'est pas « calculer 7 × 8 » — un questionnaire le fait
// mieux et plus vite. C'est ce qu'on ne demande jamais : SE SERVIR d'un
// résultat. Sur les derniers niveaux, deux blocs valent la même chose (4 × 4 et
// 2 × 8 font 16, 8 × 8 et 4 × 16 font 64) : savoir compter ouvre alors deux
// portes au lieu d'une, et c'est le trajet qui tranche. L'élève doit donc
// calculer POUR décider, pas pour remplir une case.
//
// Toute la règle vit dans core/chantier.js, sans DOM, et les tests s'assurent
// notamment que chaque niveau livré a bien une solution : la règle « un bloc
// scellé devient un mur » rend l'insolubilité invisible à l'œil nu — trois de
// mes six premiers plans étaient impossibles sans que rien ne le laisse voir.

import { BaseGame } from '../core/BaseGame.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    MUR, NIVEAUX, lireNiveau, cloner, simuler, pousser, gagne,
    bloqueDefinitivement, resoudre
} from '../core/chantier.js';

// Chaque bloc a sa couleur : c'est ce qui rend le plan lisible d'un coup d'œil
// quand deux blocs portent le même résultat. Sans elle, « les deux 16 » ne se
// distinguent plus, et le niveau devient illisible au moment précis où il
// demande de les distinguer.
const TEINTES = {
    A: { clair: '#60a5fa', fonce: '#1d4ed8' },
    B: { clair: '#fbbf24', fonce: '#b45309' },
    C: { clair: '#34d399', fonce: '#047857' },
    D: { clair: '#f472b6', fonce: '#be185d' }
};

const FLECHES = { haut: '↑', bas: '↓', gauche: '←', droite: '→' };
const NOMS = { haut: 'le haut', bas: 'le bas', gauche: 'la gauche', droite: 'la droite' };

const skillDe = (a, b) => {
    const t = Math.min(a, b);
    return t >= 1 && t <= 10 ? `num.mult.table.${t}` : 'num.mult.sens';
};

class Chantier extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'chantier');
        const dep = NIVEAUX.findIndex(n => n.id === (this.params.depart || 'ch1'));
        this.index = dep < 0 ? 0 : dep;
        this.historique = [];
        this.choisi = null;
        this.indices = 0;
        this.animation = false;
    }

    // --- Mise en place ------------------------------------------------------

    render() {
        this.container.innerHTML = `
            <style>
                .ch-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    justify-content: center;
                    gap: 10px; height: 100%; max-width: 100%;
                    user-select: none; -webkit-user-select: none;
                    color: var(--text-main);
                }
                .ch-barre {
                    display: flex; align-items: center; justify-content: center;
                    gap: 8px; flex-wrap: wrap; width: 100%;
                }
                .ch-titre {
                    font-weight: 800; font-size: clamp(14px, 3.4cqw, 19px);
                    display: flex; align-items: baseline; gap: 7px;
                }
                .ch-titre small {
                    font-weight: 600; font-size: .74em; color: var(--text-muted);
                }
                .ch-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px;
                    padding: 6px 11px; line-height: 1.2;
                    transition: background .12s, transform .1s;
                }
                .ch-btn:hover:not(:disabled) { background: var(--bg-hover); }
                .ch-btn:active:not(:disabled) { transform: scale(.94); }
                .ch-btn:disabled { opacity: .38; cursor: default; }

                /* Le plateau se mesure sur la place REELLE qu'on lui donne, pas
                   sur la fenetre : le meme jeu tourne en vignette de catalogue,
                   en plein ecran sur un telephone et dans une colonne de
                   tablette. Le pas comprend la case ET son ecart. */
                .ch-plateau {
                    --pas: clamp(21px, min(
                        (100cqw - 18px) / var(--cols),
                        (100cqh - 128px) / var(--rows)
                    ), 74px);
                    --case: calc(var(--pas) * .92);
                    position: relative; flex: none;
                    width: calc(var(--pas) * var(--cols));
                    height: calc(var(--pas) * var(--rows));
                    background: var(--bg-plateau);
                    border-radius: 14px; padding: 0;
                    box-shadow: var(--shadow-md);
                    touch-action: none; overflow: hidden;
                }
                .ch-plateau > * {
                    position: absolute;
                    width: var(--case); height: var(--case);
                    left: calc(var(--x) * var(--pas) + (var(--pas) - var(--case)) / 2);
                    top: calc(var(--y) * var(--pas) + (var(--pas) - var(--case)) / 2);
                    border-radius: max(3px, calc(var(--case) * .16));
                    display: flex; align-items: center; justify-content: center;
                    box-sizing: border-box;
                }
                .ch-sol { background: color-mix(in srgb, var(--text-muted) 11%, transparent); }
                /* Les murs occupent TOUT leur pas, sans arrondi ni ecart : ils
                   se rejoignent alors en une paroi continue au lieu d'une file
                   de petits carres. La difference est enorme a la lecture — on
                   voit un couloir, donc on voit ou le bloc va s'arreter. */
                .ch-mur {
                    background: color-mix(in srgb, var(--text-main) 58%, transparent);
                    border-radius: 0;
                    width: var(--pas); height: var(--pas);
                    left: calc(var(--x) * var(--pas));
                    top: calc(var(--y) * var(--pas));
                }

                /* Une dalle est un CREUX : trait pointille, fond en retrait.
                   Un bloc est un objet POSE dessus : plein, avec du relief. La
                   difference doit se voir sans lire, sinon on cherche ou poser
                   au lieu de chercher quoi poser. */
                .ch-dalle {
                    border: max(2px, calc(var(--case) * .06)) dashed
                        color-mix(in srgb, var(--text-muted) 62%, transparent);
                    background: color-mix(in srgb, var(--text-muted) 6%, transparent);
                    color: var(--text-muted);
                    font-weight: 800; font-size: calc(var(--case) * .38);
                }
                .ch-dalle--prise { opacity: 0; }

                .ch-bloc {
                    background: linear-gradient(160deg, var(--clair), var(--fonce));
                    color: #fff; cursor: pointer; z-index: 3;
                    font-weight: 800; line-height: 1;
                    font-size: calc(var(--case) * .27);
                    box-shadow: 0 calc(var(--case) * .06) 0 rgba(0,0,0,.28),
                                0 4px 10px rgba(15,23,42,.22);
                    transition: left .26s cubic-bezier(.2,.9,.3,1),
                                top .26s cubic-bezier(.2,.9,.3,1),
                                box-shadow .15s, outline-color .15s;
                    outline: max(2px, calc(var(--case) * .07)) solid transparent;
                    outline-offset: max(1px, calc(var(--case) * .04));
                }
                .ch-bloc:active { box-shadow: 0 2px 6px rgba(15,23,42,.3); }
                .ch-bloc--choisi {
                    outline-color: var(--primary); z-index: 5;
                }
                .ch-bloc--dur {
                    cursor: default;
                    box-shadow: inset 0 0 0 max(2px, calc(var(--case) * .07)) rgba(255,255,255,.55),
                                0 2px 6px rgba(15,23,42,.2);
                    animation: ch-pose .42s ease-out;
                }
                .ch-bloc--dur::after {
                    content: '✓'; position: absolute;
                    right: calc(var(--case) * .06); top: calc(var(--case) * -.02);
                    font-size: calc(var(--case) * .3); opacity: .85;
                }
                @keyframes ch-pose {
                    0% { transform: scale(1); } 45% { transform: scale(1.17); }
                    100% { transform: scale(1); }
                }

                /* Ou le bloc IRA : on montre l'arrivee, pas la direction. C'est
                   la seule facon de rendre le glissement previsible sans avoir
                   a l'essayer — donc de faire reflechir avant de pousser. */
                .ch-cible {
                    border: max(2px, calc(var(--case) * .07)) solid var(--primary);
                    background: color-mix(in srgb, var(--primary) 20%, transparent);
                    color: var(--primary); cursor: pointer; z-index: 4;
                    font-size: calc(var(--case) * .46); font-weight: 800;
                    animation: ch-appel 1.5s ease-in-out infinite;
                }
                .ch-cible--pose {
                    border-color: var(--success); color: var(--success);
                    background: color-mix(in srgb, var(--success) 24%, transparent);
                }
                @keyframes ch-appel { 50% { opacity: .55; } }
                .ch-cible:hover { animation: none; opacity: 1; }

                .ch-note {
                    min-height: 2.6em; text-align: center; width: 100%;
                    font-size: clamp(12px, 2.9cqw, 15px); line-height: 1.35;
                    color: var(--text-muted);
                }
                .ch-note b { color: var(--text-main); }
                .ch-fin {
                    display: inline-block; padding: 5px 13px; border-radius: 999px;
                    font-weight: 700;
                }
                .ch-fin--ok { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
                .ch-fin--ko { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
            </style>
            <div class="ch-wrap">
                <div class="ch-barre">
                    <button class="ch-btn" data-prec title="Niveau précédent">◀</button>
                    <span class="ch-titre"><span data-titre></span><small data-coups></small></span>
                    <button class="ch-btn" data-suiv title="Niveau suivant">▶</button>
                </div>
                <div class="ch-plateau" data-plateau></div>
                <div class="ch-barre">
                    <button class="ch-btn" data-annuler>⟲ Annuler</button>
                    <button class="ch-btn" data-recommencer>↺ Recommencer</button>
                    <button class="ch-btn" data-indice>💡 Indice</button>
                </div>
                <p class="ch-note" data-note></p>
            </div>`;

        this.plateau = this.container.querySelector('[data-plateau]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.titreEl = this.container.querySelector('[data-titre]');
        this.coupsEl = this.container.querySelector('[data-coups]');

        this.container.querySelector('[data-prec]').addEventListener('click', () => this.allerNiveau(this.index - 1));
        this.container.querySelector('[data-suiv]').addEventListener('click', () => this.allerNiveau(this.index + 1));
        this.container.querySelector('[data-annuler]').addEventListener('click', () => this.annuler());
        this.container.querySelector('[data-recommencer]').addEventListener('click', () => this.charger(this.index));
        this.container.querySelector('[data-indice]').addEventListener('click', () => this.donnerIndice());

        this.brancherGestes();
        this.charger(this.index);
    }

    startGameLoop() { /* Un puzzle au tour par tour : rien à faire tourner. */ }

    /**
     * LA SOLUTION, POUR L'AUTEUR — jamais pour l'élève.
     *
     * Un niveau qu'on vient d'écrire se vérifie en le jouant, et se rejouer
     * douze poussées à la main pour contrôler la douzième prend plus de temps
     * que d'écrire le niveau. Le solveur du noyau connaît déjà le plus court
     * chemin : il le joue sous les yeux, coup par coup, à vitesse lisible.
     *
     * Rien n'est enregistré : ni réussite, ni erreur, ni compétence. C'est un
     * outil de mise au point, pas une aide — un élève qui voit la solution
     * n'apprend rien, et il n'a aucun moyen de la demander.
     */
    montrerSolution() {
        if (this.solutionEnCours) return true;
        const chemin = resoudre(cloner(this.etat), 300000);
        if (!chemin || !chemin.length) {
            this.note(gagne(this.etat)
                ? 'Ce niveau est déjà terminé.'
                : 'Aucune solution depuis cette position — le chantier est condamné.', 'ko');
            return true;
        }
        this.solutionEnCours = true;
        this.note(`Solution en ${chemin.length} coup${chemin.length > 1 ? 's' : ''} — démonstration d'auteur, rien n'est enregistré.`);

        let i = 0;
        const suite = () => {
            if (!this.isRunning || i >= chemin.length) {
                this.solutionEnCours = false;
                if (this.isRunning) this.majPlateau();
                return;
            }
            const { id, dir } = chemin[i++];
            const b = this.etat.blocs.find(o => o.id === id);
            this.choisi = id;
            this.majPlateau();
            this.timerSolution = setTimeout(() => {
                if (!this.isRunning) return;
                pousser(this.etat, id, dir);
                this.choisi = null;
                this.majPlateau();
                this.majBarre();
                if (b) this.note(`${i}/${chemin.length} — ${b.a} × ${b.b} = ${b.produit} vers ${NOMS[dir]}.`);
                this.timerSolution = setTimeout(suite, 520);
            }, 380);
        };
        suite();
        return true;
    }

    /** Le saut d'auteur passe au niveau suivant : c'est ici la « question ». */
    showNext() {
        if (this.index >= NIVEAUX.length - 1) return false;
        this.allerNiveau(this.index + 1);
        return true;
    }

    /** Et le retour au précédent, pour revoir celui qu'on vient de dépasser. */
    showPrevious() {
        if (this.index <= 0) return false;
        this.allerNiveau(this.index - 1);
        return true;
    }

    // --- Les niveaux --------------------------------------------------------

    charger(i) {
        this.index = Math.max(0, Math.min(NIVEAUX.length - 1, i));
        this.etat = lireNiveau(NIVEAUX[this.index]);
        this.historique = [];
        this.choisi = null;
        this.fini = false;
        // Le nombre de coups minimal se calcule UNE fois, sur le plan intact.
        // Le refaire à chaque coup coûterait, sur une position morte du dernier
        // niveau, l'exploration complète de l'espace de jeu — un tiers de
        // seconde de gel entre le doigt et le bloc qui glisse.
        const opt = resoudre(this.etat, 200000);
        this.optimal = opt ? opt.length : null;
        this.dessiner();
        this.note(NIVEAUX[this.index].indice);
    }

    allerNiveau(i) {
        if (i < 0 || i >= NIVEAUX.length) return;
        this.charger(i);
    }

    dessiner() {
        const e = this.etat;
        this.plateau.style.setProperty('--cols', e.cols);
        this.plateau.style.setProperty('--rows', e.rows);
        const morceaux = [];
        for (let y = 0; y < e.rows; y++) {
            for (let x = 0; x < e.cols; x++) {
                const mur = e.grille[y][x] === MUR;
                morceaux.push(`<div class="${mur ? 'ch-mur' : 'ch-sol'}" style="--x:${x};--y:${y}"></div>`);
            }
        }
        for (const d of e.dalles) {
            morceaux.push(`<div class="ch-dalle" data-dalle="${d.id}" style="--x:${d.x};--y:${d.y}">${d.valeur}</div>`);
        }
        for (const b of e.blocs) {
            const t = TEINTES[b.id] || TEINTES.A;
            morceaux.push(`<div class="ch-bloc" data-bloc="${b.id}"
                style="--x:${b.x};--y:${b.y};--clair:${t.clair};--fonce:${t.fonce}">${b.a}&nbsp;×&nbsp;${b.b}</div>`);
        }
        this.plateau.innerHTML = morceaux.join('');
        this.majPlateau();
        this.majBarre();
    }

    /** Repositionne blocs et dalles sans reconstruire le DOM : les blocs glissent. */
    majPlateau() {
        for (const b of this.etat.blocs) {
            const el = this.plateau.querySelector(`[data-bloc="${b.id}"]`);
            if (!el) continue;
            el.style.setProperty('--x', b.x);
            el.style.setProperty('--y', b.y);
            el.classList.toggle('ch-bloc--dur', b.dur);
            el.classList.toggle('ch-bloc--choisi', this.choisi === b.id && !b.dur);
        }
        // Une dalle scellée disparaît sous son bloc : la garder visible sous un
        // carré opaque ne servait qu'à faire douter qu'elle soit bien prise.
        for (const d of this.etat.dalles) {
            const el = this.plateau.querySelector(`[data-dalle="${d.id}"]`);
            if (!el) continue;
            const b = this.etat.blocs.find(o => o.dur && o.x === d.x && o.y === d.y);
            el.classList.toggle('ch-dalle--prise', !!b);
        }
        this.majCibles();
    }

    majBarre() {
        const n = NIVEAUX[this.index];
        this.titreEl.textContent = `${this.index + 1}. ${n.titre}`;
        this.coupsEl.textContent = `${this.etat.coups} coup${this.etat.coups > 1 ? 's' : ''}`
            + (this.optimal ? ` / ${this.optimal}` : '');
        this.container.querySelector('[data-prec]').disabled = this.index === 0;
        this.container.querySelector('[data-suiv]').disabled = this.index === NIVEAUX.length - 1;
        this.container.querySelector('[data-annuler]').disabled = !this.historique.length;
    }

    // --- Choisir et pousser -------------------------------------------------

    majCibles() {
        this.plateau.querySelectorAll('.ch-cible').forEach(el => el.remove());
        if (this.fini || this.animation || !this.choisi) return;
        const b = this.etat.blocs.find(o => o.id === this.choisi);
        if (!b || b.dur) return;
        for (const dir of Object.keys(FLECHES)) {
            const r = simuler(this.etat, b.id, dir);
            if (!r) continue;
            const el = document.createElement('div');
            el.className = 'ch-cible' + (r.scelle ? ' ch-cible--pose' : '');
            el.dataset.dir = dir;
            el.style.setProperty('--x', r.x);
            el.style.setProperty('--y', r.y);
            el.textContent = FLECHES[dir];
            el.title = r.scelle ? 'Il se posera ici' : 'Il s\'arrêtera ici';
            this.plateau.appendChild(el);
        }
    }

    choisir(id) {
        const b = this.etat.blocs.find(o => o.id === id);
        if (!b || b.dur) return false;
        this.choisi = id;
        this.majPlateau();
        return true;
    }

    jouer(dir) {
        if (this.animation || this.fini || !this.choisi) return;
        const id = this.choisi;
        const avant = cloner(this.etat);
        const r = pousser(this.etat, id, dir);
        if (!r.bouge) return;

        this.historique.push(avant);
        if (this.historique.length > 60) this.historique.shift();
        this.animation = true;
        this.majPlateau();
        this.majBarre();

        const bloc = this.etat.blocs.find(o => o.id === id);
        this.commenter(bloc, r);

        this.timerId = setTimeout(() => {
            this.animation = false;
            if (r.scelle) this.choisi = null;
            this.majPlateau();
            this.controlerFin();
        }, 300);
    }

    /**
     * Ce que le coup vient de dire, en mots. Trois cas seulement, et le
     * deuxième est celui qui apprend quelque chose : un bloc qui s'arrête sur
     * une dalle qui n'est pas la sienne ne se scelle pas — la dalle n'a pas
     * refusé un objet, elle a refusé un RÉSULTAT.
     */
    commenter(b, r) {
        if (r.scelle) {
            this.note(`<b>${b.a} × ${b.b} = ${b.produit}</b> : le bloc se pose et devient un mur.`, 'ok');
            this.onCorrectAnswer(null, skillDe(b.a, b.b), {
                points: 10, questionText: `${b.a} × ${b.b}`,
                given: String(b.produit), expected: b.produit
            });
            return;
        }
        if (r.dalle) {
            this.note(`Cette dalle porte <b>${r.dalle.valeur}</b>, or ${b.a} × ${b.b} = <b>${b.produit}</b>. Le bloc s'y arrête mais ne s'y pose pas.`, 'ko');
            this.onWrongAnswer(null, {
                concept: skillDe(b.a, b.b), questionText: `${b.a} × ${b.b}`,
                input: String(r.dalle.valeur), expected: b.produit, silencieux: true,
                customMessage: `${b.a} × ${b.b} = ${b.produit}, pas ${r.dalle.valeur}.`
            });
            return;
        }
        this.note('Le bloc a glissé jusqu\'à l\'obstacle suivant.');
    }

    controlerFin() {
        if (gagne(this.etat)) {
            this.fini = true;
            this.choisi = null;
            this.majPlateau();
            const parfait = this.optimal != null && this.etat.coups <= this.optimal;
            this.note(`🎉 Chantier terminé en ${this.etat.coups} coup${this.etat.coups > 1 ? 's' : ''}`
                + (parfait ? ' — <b>le minimum possible</b> !' : '.')
                + (this.index < NIVEAUX.length - 1 ? ' Le niveau suivant arrive…' : ''), 'ok');
            this.onCorrectAnswer(null, 'num.mult.sens', {
                points: 25, questionText: `Chantier « ${NIVEAUX[this.index].titre} »`,
                given: 'terminé', expected: 'terminé'
            });
            if (this.index < NIVEAUX.length - 1) {
                this.timerId = setTimeout(() => { if (this.isRunning) this.charger(this.index + 1); }, 2200);
            }
            return;
        }
        // Le contrôle de position morte se fait APRÈS l'affichage : il explore
        // tout l'espace de jeu et peut coûter quelques centaines de
        // millisecondes sur le dernier niveau. Le glissement ne doit pas
        // attendre après lui.
        this.timerId = setTimeout(() => {
            if (!this.isRunning || this.fini) return;
            if (!bloqueDefinitivement(this.etat)) return;
            this.note('Cette position est <b>perdue</b> : plus aucune suite de coups ne termine le chantier. Annule le dernier coup — ce n\'est pas une faute, c\'est le jeu.', 'ko');
        }, 60);
    }

    annuler() {
        if (!this.historique.length || this.animation) return;
        this.etat = this.historique.pop();
        this.fini = false;
        this.choisi = null;
        this.dessiner();
        this.note('Coup annulé.');
    }

    donnerIndice() {
        if (this.fini) return;
        const sol = resoudre(this.etat, 200000);
        if (!sol) {
            this.note('Je ne trouve plus de solution d\'ici : annule un coup pour revenir en arrière.', 'ko');
            return;
        }
        if (!sol.length) return;
        this.indices++;
        const { id, dir } = sol[0];
        const b = this.etat.blocs.find(o => o.id === id);
        this.choisi = id;
        this.majPlateau();
        this.note(`Prends le bloc <b>${b.a} × ${b.b}</b> et pousse-le vers <b>${NOMS[dir]}</b>. Il reste ${sol.length} coup${sol.length > 1 ? 's' : ''} à jouer.`);
    }

    // --- Souris, doigt, clavier ---------------------------------------------

    brancherGestes() {
        // Un tapotement choisit (le bloc ou sa case d'arrivée) ; un balayage
        // pousse directement. Les deux entrées mènent au même coup : sur
        // téléphone on balaye, à la souris on vise.
        this.plateau.addEventListener('pointerdown', (ev) => {
            const bloc = ev.target.closest?.('[data-bloc]');
            const cible = ev.target.closest?.('.ch-cible');
            // On ne SÉLECTIONNE pas au poser du doigt : un balayage commence
            // par un poser, et basculer la sélection ici annulait le bloc
            // qu'on était justement en train de balayer.
            this.depart = { x: ev.clientX, y: ev.clientY, bloc: bloc?.dataset.bloc || null, cible };
        });
        this.plateau.addEventListener('pointerup', (ev) => {
            const d = this.depart;
            this.depart = null;
            if (!d) return;
            const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
            const seuil = 24;
            if (Math.abs(dx) > seuil || Math.abs(dy) > seuil) {
                const dir = Math.abs(dx) > Math.abs(dy)
                    ? (dx > 0 ? 'droite' : 'gauche')
                    : (dy > 0 ? 'bas' : 'haut');
                if (d.bloc) this.choisir(d.bloc);
                return this.jouer(dir);
            }
            if (d.bloc) return void this.choisir(d.bloc);
            const cible = d.cible || ev.target.closest?.('.ch-cible');
            if (cible) return this.jouer(cible.dataset.dir);
            this.choisi = null;
            this.majPlateau();
        });
        this.plateau.addEventListener('pointercancel', () => { this.depart = null; });

        this.surTouche = (ev) => {
            if (!this.isRunning || this.isDemo) return;
            const dirs = { ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite' };
            if (dirs[ev.key] && this.choisi) { ev.preventDefault(); return this.jouer(dirs[ev.key]); }
            if (ev.key === 'Tab' || ev.key === ' ') {
                const libres = this.etat.blocs.filter(b => !b.dur);
                if (!libres.length) return;
                ev.preventDefault();
                const i = libres.findIndex(b => b.id === this.choisi);
                this.choisi = libres[(i + 1) % libres.length].id;
                this.majPlateau();
            }
            if (ev.key === 'z' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); this.annuler(); }
        };
        document.addEventListener('keydown', this.surTouche);
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = ton ? `<span class="ch-fin ch-fin--${ton}">${html}</span>` : html;
    }

    // --- Le robot -----------------------------------------------------------

    /**
     * Le robot ne se contente pas de gagner : il dit AVANT chaque coup ce
     * qu'il attend de lui. C'est le seul moment où un élève entend formuler
     * « je pousse celui-là parce que l'autre a besoin de ce mur » — le
     * raisonnement qu'on lui demande de tenir sans le lui avoir jamais montré.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.plateau);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!await cur.pause(600) || !this.isRunning) return fin();
        cur.say('Le chantier : chaque bloc porte une multiplication, chaque dalle creuse porte un résultat. Il faut poser chaque bloc sur la dalle qui porte SON résultat.', this.plateau);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Attention : un bloc poussé ne fait pas un pas. Il GLISSE jusqu\'à rencontrer un mur ou un autre bloc. On ne choisit donc pas où il s\'arrête — on choisit contre quoi.', this.plateau);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await this.demoNiveau(cur, gate)) return fin();

        // Puis le niveau qui contient toute l'idée du jeu : deux blocs de même
        // valeur, donc un calcul qui ne suffit plus à décider.
        if (!await gate.waitTurn() || !this.isRunning) return fin();
        this.charger(NIVEAUX.findIndex(n => n.id === 'ch5'));
        cur.say('Voici le vrai problème. Ce bloc fait 4 × 4, celui-là 2 × 8 : ils valent TOUS LES DEUX 16, et les deux dalles portent 16. Le calcul ouvre donc deux possibilités au lieu d\'une.', this.plateau);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Savoir que 4 × 4 = 16 ne suffit plus : il faut regarder QUEL bloc peut atteindre QUELLE dalle. Le calcul ouvre la porte, le chemin la referme.', this.plateau);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        if (!await this.demoNiveau(cur, gate)) return fin();

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et si tu t\'enfermes — un bloc scellé au mauvais endroit bouche un passage pour toujours — le jeu te le dit tout de suite, et le bouton Annuler défait le coup. Se tromper ici ne coûte rien : c\'est de la réflexion, pas un contrôle.', this.plateau);
        if (!await cur.pause(DEMO_SPEED.between)) return fin();
        fin();
    }

    /** Joue la solution du niveau courant, un coup expliqué à la fois. */
    async demoNiveau(cur, gate) {
        const sol = resoudre(this.etat, 200000) || [];
        for (const { id, dir } of sol) {
            if (!await gate.waitTurn() || !this.isRunning) return false;
            const b = this.etat.blocs.find(o => o.id === id);
            const r = simuler(this.etat, id, dir);
            if (!b || !r) break;
            this.choisi = id;
            this.majPlateau();
            cur.say(r.scelle
                ? `${b.a} × ${b.b} = ${b.produit} : je pousse ce bloc vers ${NOMS[dir]}, il glisse et vient se poser sur la dalle ${b.produit}.`
                : `Je pousse ${b.a} × ${b.b} vers ${NOMS[dir]} : il ne se pose pas encore, il va simplement se placer pour la suite.`,
                this.plateau.querySelector(`[data-bloc="${id}"]`));
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return false;

            const cible = this.plateau.querySelector(`.ch-cible[data-dir="${dir}"]`);
            if (cible && !await cur.tap(cible)) return false;
            pousser(this.etat, id, dir);
            this.choisi = null;
            this.majPlateau();
            this.majBarre();
            if (!await cur.pause(DEMO_SPEED.press) || !this.isRunning) return false;
        }
        if (!await gate.waitTurn() || !this.isRunning) return false;
        cur.say('Toutes les dalles sont couvertes : le chantier est terminé.', this.plateau);
        return await cur.pause(DEMO_SPEED.between);
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        if (this.surTouche) document.removeEventListener('keydown', this.surTouche);
        if (this.timerSolution) clearTimeout(this.timerSolution);
        super.destroy();
    }
}

export function engineChantier(container, isDemo, params) {
    const jeu = new Chantier(container, isDemo, params);
    jeu.start();
    return jeu;
}
