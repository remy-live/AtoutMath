// POSER UNE OPÉRATION — à l'écran, en deux temps.
//
// Le noyau (core/poser.js) porte les rangs, les colonnes et les retenues. Ici :
// la grille où l'on aligne, le pavé de chiffres, et les petits ronds.
//
// TEMPS 1 : ALIGNER. On fait glisser chaque chiffre dans sa colonne, et rien
// d'autre ne se passe tant que ce n'est pas juste. C'est là que se perd
// l'élève qui « sait calculer mais rate ses opérations » : il cale 12,4 sous
// 324,5 en collant à droite, et le calcul qui suit ne peut plus être bon.
//
// TEMPS 2 : CALCULER, COLONNE PAR COLONNE, DE DROITE À GAUCHE. On ne peut pas
// remplir la colonne des dizaines avant celle des unités — l'algorithme EST
// cet ordre, et une grille qu'on remplirait dans le désordre ne l'enseignerait
// pas.
//
// LES RETENUES NE SE NOTENT PAS AU MÊME ENDROIT SELON L'OPÉRATION, et c'est
// fidèle au tableau : EN HAUT à l'addition (elle s'ajoute aux chiffres du
// dessus), EN BAS contre le soustracteur à la soustraction (méthode par
// compensation). Les petits ronds sont donc sur deux rangées différentes.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    poser, etendue, placementAttendu, verifierPlacement, attenduEn,
    premierRang, rangSuivant, decimales, chiffreAuRang, rangsDe,
    apercuPose, verifierPose
} from '../core/poser.js';
import { CSS_GLISSER, rendreGlissable } from '../core/glisserDeposer.js';

const COMPETENCE = 'num.add.entiers';
const SIGNES = { '+': '+', '-': '−' };

class PoserOperation extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'poser-operation');
        this.rng = makeRng(this.params.seed);
        // LA MULTIPLICATION N'EST PAS ENCORE ICI, et ce n'est pas un oubli :
        // son algorithme n'est pas en colonnes mais en LIGNES de produits
        // partiels décalés, puis une addition de ces lignes. Le noyau sait
        // déjà les calculer (core/poser.js), l'écran reste à écrire — et le
        // forcer dans cette grille-ci donnerait un mauvais compromis pour les
        // trois. On retombe donc sur l'addition plutôt que de casser.
        this.operation = ['+', '-'].includes(this.params.operation) ? this.params.operation : '+';
        this.avecVirgule = this.params.decimales === true;
        this.nbTermes = this.operation === '+' ? Math.max(2, Math.min(3, parseInt(this.params.termes) || 2)) : 2;
        this.chiffres = Math.max(2, Math.min(4, parseInt(this.params.chiffres) || 3));
        this.reussies = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                ${CSS_GLISSER}
                /* LE JETON EST LE NOMBRE ENTIER. On ne fait plus glisser des
                   chiffres un par un : poser une opération, c'est décider où va
                   LE NOMBRE, et découper cette décision en quatre gestes la
                   faisait disparaître. */
                .po-nombre {
                    display: inline-flex; align-items: center; gap: 1px;
                    padding: 5px 10px; border-radius: 10px; cursor: grab;
                    background: color-mix(in srgb, var(--primary) 16%, transparent);
                    border: 2px solid var(--primary); font-weight: 900;
                    font-variant-numeric: tabular-nums;
                    font-size: clamp(18px, 5cqw, 26px);
                }
                .po-nombre[hidden] { display: none; }
                .po-nombre b { font-weight: 900; pointer-events: none; }
                /* L'APERÇU : là où le nombre tomberait si l'on lâchait. C'est
                   lui qui fait VOIR le décalage avant de le commettre. */
                .po-case--apercu {
                    outline: 2px dashed var(--primary);
                    background: color-mix(in srgb, var(--primary) 10%, transparent);
                }
                .po-fantome { opacity: .45; font-weight: 900; }
                .po-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; overflow-y: auto;
                }
                .po-tete { display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .9rem; }
                .po-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
                }
                .po-btn:hover { background: var(--bg-hover); }
                .po-etape {
                    font-weight: 800; font-size: clamp(14px, 3.4cqw, 18px); color: #fff;
                    padding: 5px 14px; border-radius: 999px;
                    background: linear-gradient(135deg, var(--primary), #8b5cf6);
                }

                /* LA GRILLE. Une colonne par rang, et la virgule dessinée sur la
                   frontière entre les unités et les dixièmes. */
                .po-grille {
                    display: grid; gap: 2px; font-variant-numeric: tabular-nums;
                    font-weight: 800; font-size: clamp(19px, 5.5cqw, 30px);
                }
                .po-case {
                    width: clamp(30px, 8.5cqw, 46px); height: clamp(32px, 9cqw, 48px);
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 6px; position: relative;
                }
                .po-case--pose { background: var(--bg-hover); }
                .po-case--cible { outline: 3px dashed var(--primary); cursor: pointer; }
                .po-case--active { outline: 3px solid var(--primary);
                    background: color-mix(in srgb, var(--primary) 14%, transparent); }
                .po-case--faux { animation: po-non .34s ease; }
                @keyframes po-non { 25% { translate: -5px 0; } 75% { translate: 5px 0; } }
                /* La virgule : un point sur la frontière droite de la colonne
                   des unités. Elle ne prend pas de colonne à elle. */
                .po-case--virgule::after {
                    content: ''; position: absolute; right: -4px; bottom: 3px;
                    width: 8px; height: 8px; border-radius: 50%; background: var(--danger);
                }
                .po-signe { display: flex; align-items: center; justify-content: center;
                    font-size: clamp(19px, 5.5cqw, 30px); font-weight: 900; }
                .po-trait { grid-column: 1 / -1; height: 3px; background: var(--text-main); margin: 3px 0; }

                /* LES PETITS RONDS DES RETENUES. */
                .po-retenue {
                    width: clamp(30px, 8.5cqw, 46px); height: clamp(18px, 5cqw, 26px);
                    display: flex; align-items: center; justify-content: center;
                }
                .po-rond {
                    width: clamp(17px, 4.6cqw, 24px); height: clamp(17px, 4.6cqw, 24px);
                    border-radius: 50%; border: 2px dashed var(--danger);
                    display: flex; align-items: center; justify-content: center;
                    font-size: clamp(11px, 3cqw, 15px); font-weight: 900;
                    color: var(--danger); cursor: pointer; background: transparent;
                }
                .po-rond--plein { border-style: solid; }
                /* AU COIN DU CHIFFRE, pour la soustraction. Il déborde un peu
                   de la case sur la gauche : c'est ainsi qu'on l'écrit au
                   crayon, entre les deux colonnes, et c'est ce débordement qui
                   dit à quel chiffre il s'ajoute. */
                .po-case--porte-rond { position: relative; overflow: visible; }
                .po-rond--coin {
                    position: absolute; left: -6px; bottom: -4px;
                    width: clamp(14px, 3.6cqw, 19px); height: clamp(14px, 3.6cqw, 19px);
                    font-size: clamp(9px, 2.4cqw, 12px);
                    background: var(--bg-panel);
                }

                .po-pave { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-width: 340px; }
                .po-touche {
                    width: 46px; height: 46px; border-radius: 10px; cursor: pointer;
                    border: 2px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); font-size: 20px; font-weight: 800;
                }
                .po-touche:hover { background: var(--primary); color: #fff; }
                .po-jeton {
                    padding: 6px 11px; border-radius: 9px; cursor: grab; touch-action: none;
                    background: color-mix(in srgb, var(--primary) 16%, transparent);
                    border: 2px solid var(--primary); font-weight: 900;
                    font-size: clamp(16px, 4.5cqw, 22px);
                }
                .po-jeton[hidden] { display: none; }
                .po-ligne-jetons { display: flex; gap: 6px; align-items: center; flex-wrap: wrap;
                    justify-content: center; }
                .po-ligne-jetons b { font-size: .8em; opacity: .7; }

                .po-note { min-height: 2.6em; text-align: center; line-height: 1.35;
                    font-size: clamp(13px, 3cqw, 15px); color: var(--text-muted); max-width: 560px; }
                .po-note--ok { color: var(--success); font-weight: 700; }
                .po-note--ko { color: var(--danger); font-weight: 700; }
            </style>
            <div class="po-wrap">
                <div class="po-tete">
                    <span data-score></span>
                    <button type="button" class="po-btn" data-indice>💡 Aide</button>
                    <button type="button" class="po-btn" data-neuf>↺ Autre opération</button>
                </div>
                <div class="po-etape" data-etape></div>
                <div class="po-grille" data-grille></div>
                <div data-zone></div>
                <p class="po-note" data-note></p>
            </div>`;

        this.etapeEl = this.container.querySelector('[data-etape]');
        this.grilleEl = this.container.querySelector('[data-grille]');
        this.zoneEl = this.container.querySelector('[data-zone]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.poser());
        this.container.querySelector('[data-indice]').addEventListener('click', () => this.aider());
        this.poser();
    }

    startGameLoop() { /* Pas d'horloge. */ }

    /** Tire une opération dont toutes les étapes tombent dans le niveau. */
    poser() {
        for (let essai = 0; essai < 300; essai++) {
            const dec = this.avecVirgule ? this.rng.int(1, 2) : 0;
            const tirer = () => {
                const n = this.rng.int(Math.pow(10, this.chiffres - 1), Math.pow(10, this.chiffres) - 1);
                return dec ? Number((n / Math.pow(10, dec)).toFixed(dec)) : n;
            };
            let operandes = Array.from({ length: this.nbTermes }, tirer);
            if (this.operation === '-') {
                operandes.sort((a, b) => b - a);
                // Une soustraction ne se pose que du grand vers le petit, et
                // deux nombres égaux ne font pas un exercice.
                if (operandes[0] === operandes[1]) continue;
            }
            let t;
            try { t = poser(this.operation, operandes); } catch (e) { continue; }
            this.tableau = t;
            this.operandes = operandes;
            break;
        }
        this.etendue = etendue(this.operandes, this.tableau.resultat);
        this.attendu = placementAttendu(this.operandes);
        this.pose = this.operandes.map(() => []);
        this.etape = 1;
        this.rangCourant = null;
        this.resultats = {};
        this.retenues = {};
        this.note('');
        this.dessiner();
        return true;
    }

    dessiner() {
        this.etapeEl.textContent = this.etape === 1
            ? '① Aligne les nombres dans les bonnes colonnes'
            : '② Calcule colonne par colonne, en partant de la droite';
        this.scoreEl.textContent = `${this.reussies} opération${this.reussies > 1 ? 's' : ''} posée${this.reussies > 1 ? 's' : ''}`;
        this.dessinerGrille();
        this.zoneEl.innerHTML = '';
        if (this.etape === 1) this.dessinerJetons();
        else this.dessinerPave();
    }

    dessinerGrille() {
        const rangs = this.etendue.rangs;             // du plus fort au plus faible
        const g = this.grilleEl;
        g.innerHTML = '';
        // Une colonne pour le signe, puis une par rang.
        g.style.gridTemplateColumns = `auto repeat(${rangs.length}, auto)`;

        // La rangée des retenues — en haut seulement pour l'addition.
        if (this.operation === '+') this.rangeeRetenues(rangs);

        this.operandes.forEach((v, i) => {
            const signe = document.createElement('div');
            signe.className = 'po-signe';
            signe.textContent = i === this.operandes.length - 1 ? SIGNES[this.operation] : '';
            g.appendChild(signe);
            rangs.forEach(r => g.appendChild(this.caseOperande(i, r)));
        });

        // POUR LA SOUSTRACTION, LE PETIT ROND N'A PAS DE RANGÉE À LUI. Il se
        // note EN BAS À GAUCHE du chiffre du nombre du bas — c'est ainsi qu'on
        // écrit la compensation au tableau, et c'est ce qui la rend lisible :
        // le « 1 » qu'on ajoute appartient à CE chiffre-là, pas à la colonne
        // en général. Sur sa propre rangée, il flottait sous le trait et l'on
        // ne savait plus à quel nombre il se rapportait. Il est posé dans la
        // case, par `caseOperande`.

        const trait = document.createElement('div');
        trait.className = 'po-trait';
        g.appendChild(trait);

        const vide = document.createElement('div');
        g.appendChild(vide);
        rangs.forEach(r => g.appendChild(this.caseResultat(r)));
    }

    /**
     * Le petit rond d'une colonne, ou null s'il n'y a pas de retenue possible
     * à ce rang — ou si l'on n'en est pas encore à calculer.
     *
     * @param {number} rang
     * @param {boolean} [auCoin] - posé au coin du chiffre plutôt que sur sa
     *   propre rangée : c'est la compensation de la soustraction.
     */
    rondRetenue(rang, auCoin) {
        if (auCoin !== undefined && !auCoin) return null;
        if (this.etape !== 2) return null;
        if (attenduEn(this.tableau, rang, 'retenue') === null) return null;
        const rond = document.createElement('button');
        rond.type = 'button';
        rond.className = 'po-rond' + (this.retenues[rang] ? ' po-rond--plein' : '')
            + (auCoin ? ' po-rond--coin' : '');
        rond.textContent = this.retenues[rang] ?? '';
        rond.dataset.rang = rang;
        rond.title = 'La retenue de cette colonne';
        rond.addEventListener('click', (ev) => { ev.stopPropagation(); this.tournerRetenue(rang); });
        return rond;
    }

    rangeeRetenues(rangs) {
        const g = this.grilleEl;
        g.appendChild(document.createElement('div'));
        rangs.forEach(r => {
            const cell = document.createElement('div');
            cell.className = 'po-retenue';
            const rond = this.rondRetenue(r);
            if (rond) cell.appendChild(rond);
            g.appendChild(cell);
        });
    }

    caseOperande(i, rang) {
        const el = document.createElement('div');
        el.className = 'po-case';
        if (rang === 0 && this.etendue.virgule) el.classList.add('po-case--virgule');
        const mis = this.pose[i].find(m => m.rang === rang);
        if (mis) { el.textContent = mis.chiffre; el.classList.add('po-case--pose'); }
        else if (this.etape === 1) {
            el.classList.add('po-case--cible');
            el.dataset.operande = i;
            el.dataset.rang = rang;
        }
        // Le petit rond de compensation, au coin bas-gauche du chiffre du
        // soustracteur — et sur lui seul : c'est à ce chiffre qu'on ajoute.
        const rond = this.rondRetenue(rang, i === this.operandes.length - 1 && this.operation === '-');
        if (rond) { el.classList.add('po-case--porte-rond'); el.appendChild(rond); }
        return el;
    }

    caseResultat(rang) {
        const el = document.createElement('div');
        el.className = 'po-case';
        if (rang === 0 && this.etendue.virgule) el.classList.add('po-case--virgule');
        if (this.resultats[rang] !== undefined) {
            el.textContent = this.resultats[rang];
            el.classList.add('po-case--pose');
        }
        if (this.etape === 2 && rang === this.rangCourant) el.classList.add('po-case--active');
        el.dataset.resultat = rang;
        return el;
    }

    // --- Étape 1 : l'alignement ------------------------------------------------

    dessinerJetons() {
        // LA CONSIGNE NE DOIT PAS ÉCRASER LA CORRECTION. Le refus d'un dépôt
        // redessine l'écran quatre dixièmes de seconde plus tard ; si la
        // consigne se réécrit à ce moment-là, l'élève voit passer « décalé
        // d'une colonne » puis plus rien, et croit que rien ne s'est produit.
        const dejaDit = /po-note--(ok|ko)/.test(this.noteEl.className);
        if (!dejaDit) this.note('Fais glisser CHAQUE NOMBRE dans la grille — en entier. Attrape-le par '
            + 'n\'importe lequel de ses chiffres : celui que tu tiens tombe dans la colonne '
            + 'que tu survoles, et les autres suivent. Les unités sous les unités.');
        this.attendu.forEach((att, i) => {
            const ligne = document.createElement('div');
            ligne.className = 'po-ligne-jetons';
            const jeton = document.createElement('div');
            jeton.className = 'po-nombre';
            jeton.hidden = this.pose[i].length > 0;
            // Chaque chiffre est un élément à lui : c'est ainsi qu'on sait
            // LEQUEL a été attrapé, sans mesurer des pixels à la main.
            att.chiffres.forEach((c, j) => {
                const b = document.createElement('b');
                b.textContent = c.chiffre;
                b.dataset.index = String(j);
                jeton.appendChild(b);
                // La virgule se dessine entre les unités et les dixièmes : elle
                // ne compte pas comme un chiffre, elle sépare.
                if (c.rang === 0 && att.chiffres.some(x => x.rang < 0)) {
                    const v = document.createElement('span');
                    v.textContent = ',';
                    v.style.pointerEvents = 'none';
                    jeton.appendChild(v);
                }
            });
            this.brancherJeton(jeton, i);
            ligne.appendChild(jeton);
            this.zoneEl.appendChild(ligne);
        });
    }

    brancherJeton(jeton, operande) {
        // L'index du chiffre saisi se lit sur l'élément touché, AVANT que le
        // glisser ne commence : c'est ce qui permet d'attraper le nombre par
        // n'importe quel chiffre.
        const noter = (ev) => {
            const cible = ev.target && ev.target.closest('b[data-index]');
            this.chiffrePris = cible ? Number(cible.dataset.index) : 0;
        };
        jeton.addEventListener('pointerdown', noter);
        jeton.addEventListener('touchstart', noter, { passive: true });

        rendreGlissable(jeton, {
            cibles: '[data-operande]',
            actif: () => !this.isDemo && this.etape === 1,
            survoler: (cible) => this.apercu(cible, operande),
            deposer: (cible) => this.deposerNombre(cible, operande)
        });
    }

    /** Le fantôme dans la grille : ce que donnerait le lâcher, à cet instant. */
    apercu(cible, operande) {
        this.grilleEl.querySelectorAll('.po-case--apercu').forEach(c => {
            c.classList.remove('po-case--apercu');
            const f = c.querySelector('.po-fantome');
            if (f) f.remove();
        });
        if (!cible || Number(cible.dataset.operande) !== operande) return;
        const rang = Number(cible.dataset.rang);
        apercuPose(this.operandes[operande], this.chiffrePris || 0, rang).forEach(c => {
            const q = this.grilleEl.querySelector(
                `[data-operande="${operande}"][data-rang="${c.rang}"]`);
            if (!q || q.textContent.trim()) return;
            q.classList.add('po-case--apercu');
            const f = document.createElement('span');
            f.className = 'po-fantome';
            f.textContent = c.chiffre;
            q.appendChild(f);
        });
    }

    deposerNombre(cible, operande) {
        if (Number(cible.dataset.operande) !== operande) {
            this.note('Ce nombre appartient à l\'autre ligne : chaque nombre a la sienne.', 'ko');
            this.dessiner();
            return;
        }
        const rang = Number(cible.dataset.rang);
        const valeur = this.operandes[operande];
        const v = verifierPose(valeur, this.chiffrePris || 0, rang);
        if (!v.ok) {
            cible.classList.add('po-case--faux');
            const dix = Math.abs(v.ecart);
            this.note(`Décalé de ${dix} colonne${dix > 1 ? 's' : ''} : le nombre est `
                + `${dix === 1 ? 'dix' : `10^${dix}`} fois trop ${v.ecart > 0 ? 'grand' : 'petit'}. `
                + 'C\'est la VIRGULE qui aligne, pas le bord droit.', 'ko');
            setTimeout(() => this.dessiner(), 420);
            return;
        }
        // Le nombre entier se pose d'un coup : c'était une seule décision.
        this.pose[operande] = apercuPose(valeur, this.chiffrePris || 0, rang)
            .map(c => ({ rang: c.rang, chiffre: c.chiffre }));

        const juste = verifierPlacement(this.operandes, this.pose);
        if (juste.ok) {
            this.etape = 2;
            this.rangCourant = premierRang(this.tableau);
            this.note('✅ Bien aligné. Maintenant on calcule, en partant de la droite.', 'ok');
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `Aligner ${this.operandes.map(x => String(x).replace('.', ',')).join(` ${this.operation} `)}`,
                expected: 'aligné sur la virgule', given: 'juste', points: 8
            });
        } else {
            this.note('Ce nombre est bien placé. Pose l\'autre.', 'ok');
        }
        this.dessiner();
    }

    nomRang(r) {
        return { 3: 'milliers', 2: 'centaines', 1: 'dizaines', 0: 'unités',
            '-1': 'dixièmes', '-2': 'centièmes' }[String(r)] || `rang ${r}`;
    }

    // --- Étape 2 : le calcul ----------------------------------------------------

    dessinerPave() {
        const pave = document.createElement('div');
        pave.className = 'po-pave';
        for (let n = 0; n <= 9; n++) {
            const t = document.createElement('button');
            t.type = 'button';
            t.className = 'po-touche';
            t.textContent = n;
            t.addEventListener('click', () => this.taper(n));
            pave.appendChild(t);
        }
        this.zoneEl.appendChild(pave);
        if (!this.noteEl.textContent.startsWith('✅')) {
            this.note(`Colonne des ${this.nomRang(this.rangCourant)} : que met-on dessous ?`);
        }
    }

    taper(n) {
        const r = this.rangCourant;
        if (r === null) return;
        const attendu = attenduEn(this.tableau, r, 'resultat');
        if (n !== attendu) {
            const c = this.grilleEl.querySelector(`[data-resultat="${r}"]`);
            if (c) { c.classList.add('po-case--faux'); setTimeout(() => this.dessiner(), 380); }
            this.note(`Ce n'est pas le chiffre des ${this.nomRang(r)}. `
                + (this.operation === '+' ? 'N\'oublie pas la retenue de la colonne précédente.'
                    : 'Regarde s\'il faut emprunter dix au chiffre du haut.'), 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: `Colonne des ${this.nomRang(r)} de ${this.enonce()}`,
                input: String(n), expected: String(attendu),
                customMessage: 'Une colonne à la fois, retenue comprise.'
            });
            return;
        }
        this.resultats[r] = n;
        // LA RETENUE DOIT ÊTRE POSÉE AVANT DE PASSER À LA SUITE quand il y en
        // a une : c'est elle qu'on oublie, pas le chiffre.
        const suivant = rangSuivant(this.tableau, r);
        const aPoser = suivant !== null ? attenduEn(this.tableau, suivant, 'retenue') : 0;
        if (aPoser) {
            this.note(`Bien. Il y a une retenue : clique le petit rond de la colonne des `
                + `${this.nomRang(suivant)} jusqu'à y lire ${aPoser}.`);
        }
        this.rangCourant = suivant;
        if (suivant === null) return this.finir();
        this.dessiner();
        if (!aPoser) this.note(`Colonne des ${this.nomRang(suivant)} : que met-on dessous ?`);
    }

    /** Les petits ronds tournent : 0, 1, 2 — puis vide. */
    tournerRetenue(rang) {
        const maxi = this.tableau.retenueMax || 1;
        const actuel = this.retenues[rang];
        const suite = [undefined, ...Array.from({ length: maxi + 1 }, (_, k) => k)];
        const i = suite.indexOf(actuel);
        this.retenues[rang] = suite[(i + 1) % suite.length];
        this.dessiner();
    }

    finir() {
        // Toutes les retenues doivent être écrites, pas seulement pensées.
        const manquantes = this.tableau.colonnes.filter(c => {
            const a = attenduEn(this.tableau, c.rang, 'retenue');
            return a && this.retenues[c.rang] !== a;
        });
        if (manquantes.length) {
            this.rangCourant = null;
            this.note(`Le résultat est bon, mais ${manquantes.length} retenue(s) ne sont pas `
                + 'écrites. En contrôle, elles se voient — écris-les.', 'ko');
            this.dessiner();
            return;
        }
        this.reussies++;
        this.note(`✅ ${this.enonce()} = ${String(this.tableau.resultat).replace('.', ',')}`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: this.enonce(),
            expected: String(this.tableau.resultat), given: String(this.tableau.resultat),
            points: 8 + this.tableau.colonnes.length * 2
        });
        this.dessiner();
        setTimeout(() => { if (this.isRunning) this.poser(); }, 2000);
    }

    enonce() {
        return this.operandes.map(x => String(x).replace('.', ','))
            .join(` ${SIGNES[this.operation]} `);
    }

    aider() {
        if (this.etape === 1) {
            return this.note('Les unités sous les unités : c\'est la virgule qui aligne, '
                + 'pas le bord droit. 324,5 et 12,4 ont leur 4 et leur 2 dans la même colonne.');
        }
        if (this.rangCourant === null) return this.note('Écris les retenues manquantes.');
        const c = this.tableau.colonnes.find(x => x.rang === this.rangCourant);
        if (this.operation === '+') {
            return this.note(`On additionne ${c.chiffres.filter(x => x !== null).join(' + ')}`
                + `${c.retenueEntrante ? ` + ${c.retenueEntrante} de retenue` : ''} = ${c.total}. `
                + 'On écrit le chiffre des unités, et le reste part en retenue.');
        }
        return this.note(c.emprunte
            ? 'Le chiffre du haut est trop petit : on lui ajoute dix, et l\'on ajoute un au '
                + 'chiffre du BAS de la colonne suivante.'
            : 'On soustrait directement : le chiffre du haut est assez grand.');
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'po-note' + (ton ? ` po-note--${ton}` : '');
    }

    showNext() { return this.poser(); }

    // --- La démonstration -----------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };
        try {
            cur.protegerZone([this.grilleEl, this.zoneEl]);
            await gate.wait(500);
            cur.say('D\'abord aligner : les unités sous les unités. C\'est la virgule qui commande, '
                + 'pas le bord droit.', this.grilleEl);
            await gate.wait(3000);
            this.pose = this.attendu.map(a => a.chiffres.map(c => ({ rang: c.rang, chiffre: c.chiffre })));
            this.etape = 2;
            this.rangCourant = premierRang(this.tableau);
            this.dessiner();
            await gate.wait(1000);

            for (const c of this.tableau.colonnes) {
                if (!this.isRunning) break;
                cur.say(this.operation === '+'
                    ? `${c.chiffres.filter(x => x !== null).join(' + ')}`
                        + `${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''} = ${c.total} : j'écris ${c.resultat}`
                        + `${c.retenueSortante ? `, je retiens ${c.retenueSortante}` : ''}.`
                    : `Colonne des ${this.nomRang(c.rang)} : ${c.resultat}`
                        + `${c.emprunte ? ' — j\'ai ajouté dix en haut, et un en bas à la colonne suivante.' : '.'}`,
                this.grilleEl);
                await gate.wait(2500);
                this.resultats[c.rang] = c.resultat;
                const s = rangSuivant(this.tableau, c.rang);
                if (s !== null) {
                    const a = attenduEn(this.tableau, s, 'retenue');
                    if (a) this.retenues[s] = a;
                }
                this.rangCourant = s;
                this.dessiner();
                await gate.wait(700);
            }
            cur.say('Et les retenues restent ÉCRITES : en contrôle, elles se voient.', this.grilleEl);
            await gate.wait(2800);
        } catch (e) { /* démonstration coupée */ }
        fin();
    }
}

export function enginePoserOperation(container, isDemo, params) {
    const jeu = new PoserOperation(container, isDemo, params);
    // C'EST L'USINE QUI DÉMARRE LE JEU, pas l'appelant. Le Runner appelle
    // cette fonction et garde l'instance ; il n'appelle jamais « start ». Sans
    // cette ligne, le jeu se construisait, ne dessinait rien, et l'écran
    // restait vide — sans la moindre erreur pour le dire.
    jeu.start();
    return jeu;
}
