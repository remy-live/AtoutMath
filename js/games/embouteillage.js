// L'EMBOUTEILLAGE — à l'écran.
//
// Rémy : « J'aimerai un jeu façon rush hour […]. Il faut que ce soit
// progressif. »
//
// SIX NIVEAUX, ET CE N'EST PAS UNE IMPRESSION. Chaque parking est mesuré avant
// d'être posé : on explore toutes les positions atteignables et l'on choisit
// une position située à un nombre de coups voulu de la sortie. Le compteur
// affiche donc un minimum DÉMONTRÉ, pas une estimation — et l'élève qui bat le
// jeu sait exactement ce qu'il a fait.
//
// ON TOUCHE LA VOITURE, PUIS OÙ ELLE VA. Le glissé serait plus naturel à la
// souris et infernal au doigt : sur un plateau de six cases, viser une case au
// pixel près avec un pouce ne marche pas. Deux touches, comme au Parking, avec
// les cases d'arrivée allumées entre les deux — on voit ce qu'on peut faire
// avant de le faire, ce qui est exactement la question du jeu.
//
// LA PRÉPARATION PREND DEUX SECONDES AU NIVEAU SIX, et on le DIT. Chercher un
// parking à vingt coups demande d'en explorer une soixantaine ; c'est du calcul
// honnête, pas une lenteur. On affiche donc « je cherche un parking difficile »
// et l'on rend la main au navigateur le temps d'une image, sinon le message
// n'apparaîtrait jamais — le fil unique de JavaScript peindrait après.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    COTE, RANGEE_SORTIE, NIVEAUX_EMBOUTEILLAGE, niveauDe, creerEmbouteillage,
    coupsPossibles, jouer, estSorti, restants, prochainCoup, qualiteEmbouteillage
} from '../core/embouteillage.js';

const COMPETENCE = 'defi.embouteillage';

/** Les teintes des véhicules : la rouge d'abord, puis on tourne. */
const TEINTES = [
    { clair: '#e04a3a', fonce: '#8f1f14' },
    { clair: '#2f5fd0', fonce: '#1c3a8a' },
    { clair: '#2f855a', fonce: '#1b4d34' },
    { clair: '#b7791f', fonce: '#7a4f10' },
    { clair: '#805ad5', fonce: '#4c2f8a' },
    { clair: '#0987a0', fonce: '#065666' },
    { clair: '#d53f8c', fonce: '#8a2258' },
    { clair: '#4a5568', fonce: '#242c3a' }
];

class Embouteillage extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'embouteillage');
        this.niveau = Number(this.params.niveau) || 1;
        this.graine = this.params.seed || 'eb';
        this.aides = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .eb-wrap {
                    display: flex; flex-direction: column; align-items: center;
                    gap: clamp(3px, 1.2cqh, 10px);
                    width: 100%; height: 100%; padding: 6px; box-sizing: border-box;
                    color: var(--text-main); container-type: size;
                    user-select: none; -webkit-user-select: none; overflow: hidden;
                }
                .eb-corps {
                    flex: 1 1 0; min-height: 0; width: 100%;
                    display: flex; align-items: center; justify-content: center;
                    container-type: size; overflow: hidden;
                }
                .eb-plateau {
                    position: relative; flex: 0 0 auto;
                    /* Six cases et demie de large : la demie est la place
                       de la flèche de sortie, à droite du mur. Diviser par
                       sept la gaspillait, et le plateau restait petit. */
                    --eb-case: clamp(26px, min(calc(92cqw / 6.5), calc(88cqh / 6)), 96px);
                    width: calc(var(--eb-case) * 6);
                    height: calc(var(--eb-case) * 6);
                    background: #9aa3ad; border-radius: 8px;
                    box-shadow: inset 0 0 0 3px #6b7480;
                }
                .eb-case {
                    position: absolute; box-sizing: border-box;
                    width: var(--eb-case); height: var(--eb-case);
                    border: 1px dashed rgba(255, 255, 255, .35);
                }
                /* LA SORTIE : une trouée dans le mur, à droite de la rangée du
                   milieu. C'est la seule chose que l'élève doit trouver tout
                   seul sur ce plateau, alors elle se voit. */
                .eb-sortie {
                    position: absolute; display: flex; align-items: center;
                    justify-content: center; font-weight: 800; color: #fff;
                    font-size: calc(var(--eb-case) * .42); line-height: 1;
                    width: calc(var(--eb-case) * .9); height: calc(var(--eb-case) * .78);
                    background: #2f855a; border-radius: 0 6px 6px 0;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, .25);
                }
                /* LA VOIE DE SORTIE, PEINTE AU SOL.
                   Rémy : « On ne sais pas le véhicule que l'on peut sortir. »
                   Le rouge est réservé depuis le début à la voiture à sortir,
                   mais rien ne le DISAIT : sur un plateau de huit couleurs, le
                   rouge n'est qu'une couleur de plus. On peint donc la rangée
                   qui mène à la trouée, comme une voie de bus — la voiture qui
                   est dessus est celle qu'on doit faire sortir, et le chemin
                   qu'elle doit prendre se lit sans une phrase. */
                .eb-voie {
                    position: absolute; left: 0; width: calc(var(--eb-case) * 6);
                    height: var(--eb-case);
                    background: repeating-linear-gradient(90deg,
                        rgba(47, 133, 90, .30) 0 calc(var(--eb-case) * .28),
                        rgba(47, 133, 90, .12) calc(var(--eb-case) * .28) calc(var(--eb-case) * .56));
                }
                /* Et la voiture elle-même porte un liseré vert, discret mais
                   permanent : sur la voie ou non, on sait laquelle c'est. */
                .eb-auto--sortir::before {
                    content: ''; position: absolute; inset: 1%;
                    border-radius: calc(var(--eb-case) * .21);
                    box-shadow: 0 0 0 2px rgba(255, 255, 255, .9),
                                0 0 0 4px #2f855a;
                }
                /* UN REMBOURRAGE EN POURCENTAGE ÉCRASE LES LONGS VÉHICULES.
                   Rémy : « Les voiture font très écraséS. » En CSS, un padding
                   en pourcentage se calcule sur la LARGEUR — les quatre côtés.
                   Sur un camion de trois cases, les 4 % valaient donc 0,12 case
                   en haut ET en bas : la carrosserie perdait un quart de sa
                   hauteur pour rien, et le dessin, étiré par
                   preserveAspectRatio="xMidYMid meet", suivait. Le rembourrage se
                   compte maintenant en CASES, la même valeur partout, et le
                   dessin garde ses proportions quoi qu'il arrive. */
                .eb-auto {
                    position: absolute; box-sizing: border-box;
                    padding: calc(var(--eb-case) * .05);
                    border-radius: calc(var(--eb-case) * .22);
                    cursor: pointer; -webkit-tap-highlight-color: transparent;
                    transition: left .13s ease, top .13s ease;
                    display: flex; align-items: center; justify-content: center;
                }
                .eb-auto svg { width: 100%; height: 100%; display: block; }
                /* ELLE SORT VRAIMENT DU PARKING.
                   Rémy : « il faudrait pouvoir voir la voiture sortir du
                   parking ». La partie se gagnait d'un coup sec — la voiture
                   s'arrêtait contre le mur, une phrase s'affichait, et c'était
                   tout. Or c'est le SEUL moment de récompense du jeu, et la
                   trouée verte qu'on a passé le plateau entier à dégager ne
                   servait jamais à rien : personne ne franchissait le mur.
                   Elle franchit donc la trouée et s'en va par la droite. Le
                   cadre du plateau la rogne au passage, ce qui est exactement
                   ce qu'on veut voir : elle QUITTE l'écran. */
                .eb-auto--dehors {
                    left: calc(var(--eb-case) * 8.4) !important;
                    transition: left .85s cubic-bezier(.45, .05, .55, 1),
                                opacity .3s ease .55s;
                    opacity: 0;
                    z-index: 3;
                }
                /* Et la trouée s'ouvre en grand sur son passage : le vert
                   s'allume une seconde, le temps que la voiture s'y engage. */
                .eb-sortie--ouverte {
                    background: #38a169;
                    transform: scale(1.25);
                    transition: transform .3s ease, background .3s ease;
                }
                .eb-auto--vise { filter: brightness(1.12); }
                .eb-auto--vise::after {
                    content: ''; position: absolute; inset: 2%;
                    border-radius: calc(var(--eb-case) * .2);
                    box-shadow: 0 0 0 3px #fff, 0 0 0 6px #6d5cf6;
                }
                .eb-auto--montre::after {
                    content: ''; position: absolute; inset: 2%;
                    border-radius: calc(var(--eb-case) * .2);
                    box-shadow: 0 0 0 3px #fff, 0 0 0 6px #b7791f;
                }
                .eb-cible {
                    position: absolute; box-sizing: border-box;
                    width: var(--eb-case); height: var(--eb-case);
                    cursor: pointer; display: flex; align-items: center;
                    justify-content: center;
                }
                .eb-cible::after {
                    content: ''; width: 34%; height: 34%; border-radius: 50%;
                    background: rgba(255, 255, 255, .85);
                    box-shadow: 0 0 0 2px #6d5cf6;
                }

                .eb-compte {
                    font-weight: 700; font-size: clamp(11px, 2.4cqh, 15px);
                    display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
                }
                .eb-compte b { color: #4c3fd0; }
                .eb-compte .eb-detour { color: #b7791f; }
                .eb-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
                .eb-btn {
                    padding: 5px 12px; border-radius: 999px; font-weight: 700;
                    border: 1px solid var(--border-soft, #cbd5e1);
                    background: var(--bg-panel, #fff); color: var(--text-main);
                    cursor: pointer; font-size: clamp(11px, 2.4cqh, 14px);
                }
                .eb-btn--fort { background: #6d5cf6; color: #fff; border-color: #6d5cf6; }
                .eb-note { min-height: 2.2em; text-align: center; font-weight: 600;
                    font-size: clamp(11px, 2.4cqh, 15px); }
                .eb-note--ok { color: #2f855a; }
                .eb-note--ko { color: #c53030; }
            </style>
            <div class="eb-wrap">
                <div class="eb-corps"><div class="eb-plateau" id="eb-plateau"></div></div>
                <div class="eb-compte" id="eb-compte"></div>
                <div class="eb-note" id="eb-note"></div>
                <div class="eb-barre">
                    <button type="button" class="eb-btn" id="eb-aide">💡 Le bon coup</button>
                    <button type="button" class="eb-btn" id="eb-annule">↶ Annuler</button>
                    <button type="button" class="eb-btn" id="eb-neuf">Autre parking</button>
                </div>
            </div>`;
        this.plateauEl = this.container.querySelector('#eb-plateau');
        this.compteEl = this.container.querySelector('#eb-compte');
        this.noteEl = this.container.querySelector('#eb-note');
        this.container.querySelector('#eb-aide').onclick = () => this.aider();
        this.container.querySelector('#eb-annule').onclick = () => this.annuler();
        this.container.querySelector('#eb-neuf').onclick = () => this.poser(true);
        this.poser();
    }

    /**
     * ON ANNONCE LA RECHERCHE AVANT DE LA FAIRE, et l'on rend la main au
     * navigateur le temps d'une image. Sans ce détour, le message serait posé
     * dans le document puis calculé pendant deux secondes sans qu'aucune image
     * ne soit peinte : l'élève verrait un écran figé et rien d'autre.
     */
    poser(neuf = false) {
        if (neuf) this.graine = `${this.graine}+`;
        this.fini = true;
        this.note(`Je cherche un parking de niveau ${this.niveau}…`);
        this.compteEl.textContent = '';
        this.plateauEl.innerHTML = '';
        setTimeout(() => {
            if (!this.isRunning && !this.isDemo) return;
            this.jeu = creerEmbouteillage({ niveau: this.niveau, rng: makeRng(this.graine) });
            if (!this.jeu) { this.note('Je n\'ai pas trouvé de parking — réessaie.', 'ko'); return; }
            this.etat = this.jeu.depart.slice();
            this.histoire = [];
            this.vise = null;
            this.montre = null;
            this.coups = 0;
            this.fini = false;
            this.dessiner();
            this.note(`Sors la voiture ROUGE par la droite. Minimum : `
                + `<b>${this.jeu.mini}</b> coups.`);
        }, 30);
    }

    /**
     * UNE VOITURE VUE DE DESSUS, DESSINÉE DANS SON SENS.
     *
     * La première version dessinait la voiture debout et faisait tourner le
     * dessin d'un quart de tour pour les couchées. C'était court et c'était
     * illisible : la rotation sortait du cadre et les voitures horizontales
     * apparaissaient tranchées. On écrit donc les deux, ce qui coûte dix lignes
     * et donne un dessin juste.
     *
     * LA BOÎTE SUIT LA LONGUEUR — cinquante unités par case. Sans cela, une
     * camionnette de trois cases était la même image étirée de moitié en plus,
     * et ses roues devenaient ovales.
     */
    autoSvg(v, teinte) {
        const U = 50, L = v.len * U;
        const roue = (x, y, w, h) =>
            `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="#2d3748"/>`;
        if (v.horiz) {
            return `<svg viewBox="0 0 ${L} ${U}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                ${roue(L * 0.16, 1, L * 0.16, 6)}${roue(L * 0.66, 1, L * 0.16, 6)}
                ${roue(L * 0.16, U - 7, L * 0.16, 6)}${roue(L * 0.66, U - 7, L * 0.16, 6)}
                <rect x="3" y="5" width="${L - 6}" height="${U - 10}" rx="${U * 0.28}"
                    fill="${teinte.clair}" stroke="${teinte.fonce}" stroke-width="2.5"/>
                <rect x="${L * 0.34}" y="${U * 0.24}" width="${L * 0.3}" height="${U * 0.52}"
                    rx="5" fill="#4a5568"/>
                <path d="M${L - 12} ${U * 0.22} q6 ${U * 0.28} 0 ${U * 0.56}" fill="none"
                    stroke="${teinte.fonce}" stroke-width="2.5" stroke-linecap="round"/>
            </svg>`;
        }
        return `<svg viewBox="0 0 ${U} ${L}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            ${roue(1, L * 0.16, 6, L * 0.16)}${roue(1, L * 0.66, 6, L * 0.16)}
            ${roue(U - 7, L * 0.16, 6, L * 0.16)}${roue(U - 7, L * 0.66, 6, L * 0.16)}
            <rect x="5" y="3" width="${U - 10}" height="${L - 6}" rx="${U * 0.28}"
                fill="${teinte.clair}" stroke="${teinte.fonce}" stroke-width="2.5"/>
            <rect x="${U * 0.24}" y="${L * 0.34}" width="${U * 0.52}" height="${L * 0.3}"
                rx="5" fill="#4a5568"/>
            <path d="M${U * 0.22} 12 q${U * 0.28} -6 ${U * 0.56} 0" fill="none"
                stroke="${teinte.fonce}" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`;
    }

    /**
     * LA TEINTE D'UN VÉHICULE — et le rouge est RÉSERVÉ.
     *
     * Le premier tirage faisait tourner la palette sur tous les véhicules : au
     * neuvième, on retombait sur le rouge, et il y avait deux voitures rouges
     * sur le plateau. Le joueur ne pouvait plus savoir laquelle sortir.
     */
    teinteDe(k) {
        if (k === 0) return TEINTES[0];
        return TEINTES[1 + ((k - 1) % (TEINTES.length - 1))];
    }

    dessiner() {
        const j = this.jeu;
        const cases = [];
        for (let y = 0; y < COTE; y++) {
            for (let x = 0; x < COTE; x++) {
                cases.push(`<div class="eb-case" style="left:calc(var(--eb-case) * ${x});
                    top:calc(var(--eb-case) * ${y})"></div>`);
            }
        }
        cases.push(`<div class="eb-voie" style="top:calc(var(--eb-case) * ${RANGEE_SORTIE})"></div>`);
        cases.push(`<div class="eb-sortie" style="left:calc(var(--eb-case) * 6 - 2px);
            top:calc(var(--eb-case) * ${RANGEE_SORTIE} + var(--eb-case) * .11)">▶</div>`);

        const coups = this.fini ? [] : coupsPossibles(j.vehicules, this.etat);
        const cibles = this.vise === null ? []
            : coups.filter(c => c.k === this.vise);

        const autos = j.vehicules.map((v, k) => {
            const t = this.teinteDe(k);
            const cls = ['eb-auto'];
            // Le zéro, c'est la voiture à sortir : c'est ainsi que le noyau
            // fabrique le plateau, et la teinte rouge lui est réservée.
            if (k === 0) cls.push('eb-auto--sortir');
            if (this.vise === k) cls.push('eb-auto--vise');
            if (this.montre === k) cls.push('eb-auto--montre');
            const w = v.horiz ? v.len : 1, h = v.horiz ? 1 : v.len;
            const x = v.horiz ? this.etat[k] : v.fixe;
            const y = v.horiz ? v.fixe : this.etat[k];
            return `<div class="${cls.join(' ')}" data-k="${k}"
                style="left:calc(var(--eb-case) * ${x}); top:calc(var(--eb-case) * ${y});
                width:calc(var(--eb-case) * ${w}); height:calc(var(--eb-case) * ${h})"
                >${this.autoSvg(v, t)}</div>`;
        });

        // Les cases d'arrivée : une pastille sur la case de TÊTE de la glissade.
        const pastilles = cibles.map(c => {
            const v = j.vehicules[c.k];
            const tete = c.sens < 0 ? c.debut : c.debut + v.len - 1;
            const x = v.horiz ? tete : v.fixe;
            const y = v.horiz ? v.fixe : tete;
            return `<div class="eb-cible" data-vers="${c.debut}"
                style="left:calc(var(--eb-case) * ${x}); top:calc(var(--eb-case) * ${y})"></div>`;
        });

        this.plateauEl.innerHTML = cases.join('') + autos.join('') + pastilles.join('');
        this.plateauEl.querySelectorAll('[data-k]').forEach(el => {
            el.onclick = () => this.toucherAuto(Number(el.dataset.k));
        });
        this.plateauEl.querySelectorAll('[data-vers]').forEach(el => {
            el.onclick = () => this.deplacer(this.vise, Number(el.dataset.vers));
        });

        const reste = this.fini ? 0 : restants(j.table, this.etat);
        const detour = reste === null ? 0 : this.coups + reste - j.mini;
        this.compteEl.innerHTML = `<span>niveau <b>${j.niveau}</b></span>`
            + `<span><b>${this.coups}</b> coups joués</span>`
            + `<span>minimum : <b>${j.mini}</b></span>`
            + (this.fini || reste === null ? ''
                : `<span>il en reste <b>${reste}</b></span>`)
            + (detour > 0 ? `<span class="eb-detour">${detour} de détour</span>` : '');
    }

    toucherAuto(k) {
        if (this.isDemo || this.fini) return;
        this.montre = null;
        if (this.vise === k) { this.vise = null; this.dessiner(); this.note(''); return; }
        const possibles = coupsPossibles(this.jeu.vehicules, this.etat).filter(c => c.k === k);
        if (!possibles.length) {
            this.vise = null;
            this.dessiner();
            const v = this.jeu.vehicules[k];
            this.note(`Cette voiture est coincée : elle ne peut aller que ${v.horiz
                ? 'à gauche ou à droite' : 'en haut ou en bas'}, et les deux sont bouchés.`, 'ko');
            return;
        }
        // UNE SEULE SORTIE, UN SEUL GESTE. Deux touches quand il y a un choix,
        // une seule quand il n'y en a pas : c'est ce qui rend jouable une
        // partie de vingt coups.
        if (possibles.length === 1) return this.deplacer(k, possibles[0].debut);
        this.vise = k;
        this.dessiner();
        this.note('Touche maintenant la case où tu veux l\'amener.');
    }

    deplacer(k, debut) {
        if (k === null || this.fini) return;
        const avant = restants(this.jeu.table, this.etat);
        this.histoire.push(this.etat.slice());
        this.etat = jouer(this.etat, { k, debut });
        this.coups++;
        this.vise = null;
        this.montre = null;
        this.dessiner();
        if (estSorti(this.jeu.vehicules, this.etat)) return this.gagner();
        const apres = restants(this.jeu.table, this.etat);
        // IL N'Y A PAS DE FAUTE DANS CE JEU, SEULEMENT DES DÉTOURS — mais s'en
        // apercevoir au moment où on le fait est toute la différence entre
        // pousser des voitures et jouer.
        this.note(apres > avant
            ? 'Ce coup t\'éloigne de la sortie : il te reste un coup de plus qu\'avant.'
            : '');
    }

    annuler() {
        if (this.isDemo || this.fini || !this.histoire.length) return;
        this.etat = this.histoire.pop();
        this.coups = Math.max(0, this.coups - 1);
        this.vise = null;
        this.montre = null;
        this.dessiner();
        this.note('Coup annulé.');
    }

    aider() {
        if (this.isDemo || this.fini) return;
        const c = prochainCoup(this.jeu.vehicules, this.jeu.table, this.etat);
        if (!c) return;
        this.aides++;
        const v = this.jeu.vehicules[c.k];
        // DEUX TEMPS : on montre la voiture, puis on la déplace. Le premier
        // temps est le raisonnement — « c'est celle-là qui bloque » — et il
        // suffit presque toujours.
        if (this.montre !== c.k) {
            this.montre = c.k;
            this.vise = null;
            this.dessiner();
            this.note(`C'est cette voiture-là qu'il faut bouger, ${v.horiz
                ? (c.sens < 0 ? 'vers la GAUCHE' : 'vers la DROITE')
                : (c.sens < 0 ? 'vers le HAUT' : 'vers le BAS')}. `
                + 'La question à se poser sans arrêt : QU\'EST-CE QUI BLOQUE la rouge, '
                + 'et qu\'est-ce qui bloque celle-là ?');
            return;
        }
        this.deplacer(c.k, c.debut);
    }

    gagner() {
        if (this.fini) return;
        this.fini = true;
        this.vise = null;
        this.montre = null;
        this.dessiner();
        this.sortirDuParking();
        const q = qualiteEmbouteillage(this.jeu.mini, this.coups);
        this.note(q.parfait
            ? `🏆 Parfait — ${q.joues} coups, le minimum démontré de ce parking.`
            : `🏆 Sortie en ${q.joues} coups. Le minimum était ${q.mini} : `
                + `${q.detours} de détour.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Embouteillage niveau ${this.jeu.niveau}`,
            expected: `${q.mini} coups`, given: `${q.joues} coups`,
            points: Math.max(10, 20 + this.jeu.mini - Math.round(q.detours / 2) - this.aides * 2)
        });
        // ON MONTE D'UN NIVEAU QUAND C'EST GAGNÉ. Rémy : « il faut que ce soit
        // progressif » — la progression ne sert à rien si elle ne s'enclenche
        // pas toute seule.
        if (this.niveau < NIVEAUX_EMBOUTEILLAGE.length) this.niveau++;
        // ET L'ON JOUE VRAIMENT LE NIVEAU SUIVANT.
        //
        // Rémy : « pour l'embouteillage, on ne passe pas au niveau suivant ».
        // Le compteur montait bien — `this.niveau++` juste au-dessus — mais
        // rien n'allait chercher le parking correspondant : on restait devant
        // la grille gagnée, avec un numéro de niveau qui ne voulait plus rien
        // dire. Le Pousseur, lui, enchaînait depuis le début ; c'est la même
        // ligne, qui manquait ici.
        //
        // Le délai laisse voir la voiture s'en aller (0,85 s) et lire le
        // résultat avant que le plateau ne change.
        setTimeout(() => { if (this.isRunning) this.poser(true); }, 2600);
    }

    /**
     * LA VOITURE ROUGE S'EN VA PAR LA TROUÉE.
     *
     * Rémy : « il faudrait pouvoir voir la voiture sortir du parking ». C'est
     * la seule récompense du jeu, et c'est aussi ce qui donne enfin un rôle à
     * la sortie verte : on passe la partie entière à dégager un passage que
     * personne n'empruntait.
     *
     * On touche à la classe de l'élément déjà en place plutôt que de redessiner :
     * une transition CSS ne part que si l'élément EXISTAIT avec l'ancienne
     * valeur. Repeindre le plateau la ferait naître déjà sortie, donc immobile.
     */
    sortirDuParking() {
        const auto = this.plateauEl.querySelector('.eb-auto--sortir');
        const trouee = this.plateauEl.querySelector('.eb-sortie');
        if (trouee) trouee.classList.add('eb-sortie--ouverte');
        if (!auto) return;
        // Une image d'attente : sans elle, le navigateur peut grouper l'ajout
        // de classe avec le rendu qui précède et n'animer rien du tout.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            auto.classList.add('eb-auto--dehors');
        }));
    }

    note(html, ton) {
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'eb-note' + (ton ? ` eb-note--${ton}` : '');
    }

    /**
     * Le robot montre CE QU'IL FAUT REGARDER, qui n'est pas la voiture rouge
     * mais celle qui la bloque — puis celle qui bloque celle-là. C'est un
     * raisonnement à rebours, et il ne vient pas tout seul.
     */
    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        // La préparation est différée : on attend qu'un plateau existe.
        for (let i = 0; i < 60 && !this.jeu; i++) {
            if (!await cur.pause(100)) return fin();
        }
        if (!this.jeu) return fin();
        if (!await cur.pause(400) || !this.isRunning) return fin();

        cur.say('Chaque voiture ne glisse que dans SON axe : celles qui sont couchées vont '
            + 'à gauche et à droite, celles qui sont debout montent et descendent. Jamais '
            + 'l\'inverse, et jamais par-dessus une autre.', this.plateauEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        cur.say('Alors on ne regarde pas la rouge : on regarde CE QUI LA BLOQUE. Et si celle-là '
            + 'ne peut pas bouger non plus, on regarde ce qui la bloque, elle. C\'est en '
            + 'remontant cette chaîne qu\'on trouve par quoi commencer.', this.plateauEl);
        if (!await gate.wait(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let i = 0; i < 4; i++) {
            const c = prochainCoup(this.jeu.vehicules, this.jeu.table, this.etat);
            if (!c) break;
            this.montre = c.k;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.step || 500) || !this.isRunning) return fin();
            this.etat = jouer(this.etat, c);
            this.coups++;
            this.montre = null;
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.step || 500) || !this.isRunning) return fin();
        }
        cur.say(`Il en faut ${this.jeu.mini} au minimum sur ce parking-là, et le compteur te dit `
            + 'à chaque coup combien il en reste : s\'il monte, tu viens de faire un détour.',
        this.compteEl);
        await cur.pause(DEMO_SPEED.between);
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

export function engineEmbouteillage(container, isDemo, params) {
    const game = new Embouteillage(container, isDemo, params);
    game.start();
    return game;
}
