// L'École du Tableur : des cases aux formules.
//
// Porté depuis l'ancien projet (imports/maths-legacy/games/spreadsheet). Neuf
// leçons progressives sur une vraie grille de tableur : identifier une case
// (B3), sélectionner une plage (A1:B2), dessiner en pixel art, saisir des
// données, puis les formules — =A1+B1, =A2*B2, =SOMME(), =MOYENNE() — jusqu'au
// boss final : remplir une facture complète. La règle d'or est stricte : une
// formule utilise les RÉFÉRENCES des cases, jamais les nombres recopiés.
//
// Deux compétences s'alimentent : le repérage (niveaux 1-4) et les formules
// (niveaux 5-9). Chaque erreur est expliquée — mauvaise case, plage inexacte,
// formule sans référence… Le robot montre comment lire « colonne B, ligne 3 »,
// étire une plage et tape une formule en la commentant — pause et pas-à-pas.
//
// Adaptation tactile : la sélection de plage suit le doigt (pointermove +
// elementFromPoint), là où l'original ne connaissait que la souris.

import { BaseGame } from '../core/BaseGame.js';
import { regTimeout } from '../core/timers.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';

const SKILL_REPERAGE = 'don.tableur.reperage';
const SKILL_FORMULES = 'don.tableur.formules';

const TITRES = ['', '1. Clic', '2. Plages', '3. Pixel Art', '4. Saisie',
    '5. Formules (+)', '6. Multiplication (*)', '7. Fonction SOMME', '8. MOYENNE', '9. LE BOSS'];

const INTROS = {
    1: 'Chaque case a un nom : sa colonne (une lettre) puis sa ligne (un chiffre). B3 = colonne B, ligne 3.',
    2: 'Une plage se nomme par ses deux coins : A1:B2 va de la case A1 à la case B2.',
    3: 'Les cases servent aussi à dessiner ! Reproduis le modèle en peignant les bonnes cases.',
    4: 'Saisis les données demandées dans la bonne case, puis appuie sur Entrée.',
    5: 'Les formules ! Le signe = prévient le tableur qu\'on calcule. =A1+B1 additionne les cases A1 et B1.',
    6: 'La multiplication s\'écrit avec l\'étoile : =A2*B2.',
    7: 'Pour additionner toute une colonne d\'un coup : =SOMME(A1:A4).',
    8: 'La moyenne d\'une plage : =MOYENNE(A1:A4).',
    9: 'LE BOSS : remplis la facture complète — les totaux de chaque ligne, puis le total à payer.'
};

const MODELES_PIXEL = [
    [[null, 'red', null, 'red', null], ['red', 'red', 'red', 'red', 'red'], ['red', 'red', 'red', 'red', 'red'], [null, 'red', 'red', 'red', null], [null, null, 'red', null, null]],
    [[null, 'yellow', 'yellow', 'yellow', null], ['yellow', 'black', null, 'black', 'yellow'], ['yellow', null, null, null, 'yellow'], ['yellow', 'black', 'black', 'black', 'yellow'], [null, 'yellow', 'yellow', 'yellow', null]],
    [['green', 'green', 'green', 'green', 'green'], ['green', 'black', null, 'black', 'green'], ['green', 'black', 'black', 'black', 'green'], ['green', 'green', 'black', 'green', 'green'], ['green', 'green', 'green', 'green', 'green']],
    [[null, null, 'blue', null, null], [null, null, 'blue', null, null], [null, 'blue', 'blue', 'blue', null], [null, null, 'blue', null, null], [null, null, 'blue', null, null]],
    [['red', 'red', 'red', 'red', 'red'], ['red', 'white', 'white', 'white', 'red'], ['red', 'white', 'blue', 'white', 'red'], ['red', 'white', 'white', 'white', 'red'], ['red', 'red', 'red', 'red', 'red']]
];

const COULEURS = { red: '#ff6b6b', blue: '#4dabf7', green: '#51cf66', yellow: '#fcc419', black: '#333', white: '#fff' };

class Tableur extends BaseGame {
    render() {
        this.level = Math.min(9, Math.max(1, parseInt(this.params.startLevel) || 1));
        this.goal = parseInt(this.params.goal) || 3;
        this.victoires = 0;
        this.taches = [];
        this.tachesFaites = 0;
        this.couleurActive = 'red';
        this.selEnCours = false;
        this.selDepart = null;

        this.container.innerHTML = `
            <style>
                .tab-wrap { height: 100%; display: flex; flex-direction: column; background: #f4f6fa; font-family: 'Outfit', sans-serif; overflow: auto; color: #223; }
                .tab-top { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 8px 10px 4px; flex-wrap: wrap; }
                .tab-menu-label { font-size: .82rem; font-weight: 700; color: #778; margin-right: 4px; }
                .tab-niv { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #c3cbe0; background: #fff; font-weight: 900; cursor: pointer; color: #556; font-family: inherit; }
                .tab-niv.actif { background: #4263eb; border-color: #4263eb; color: #fff; }
                .tab-avancee { font-size: .95rem; font-weight: 700; color: #4263eb; }
                .tab-corps { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 4px 10px 16px; gap: 10px; }
                .tab-titre { font-weight: 900; font-size: 1.15rem; margin: 2px 0 0; }
                .tab-consigne { text-align: center; font-size: 1rem; min-height: 2.2em; max-width: 480px; }
                .tab-consigne .cible { background: #4263eb; color: #fff; padding: 2px 8px; border-radius: 6px; font-weight: 900; }
                .tab-consigne .code { background: #223; color: #7ef0c0; padding: 2px 8px; border-radius: 6px; font-family: monospace; }
                .tab-msg { min-height: 1.5em; font-weight: 700; text-align: center; font-size: .95rem; }
                .tab-msg.ok { color: #2b8a3e; } .tab-msg.ko { color: #e03131; }
                .tab-grille { display: grid; gap: 2px; background: #c3cbe0; border: 2px solid #c3cbe0; border-radius: 8px; padding: 2px; touch-action: none; user-select: none; -webkit-user-select: none; }
                .tab-cell { background: #fff; min-height: 38px; display: flex; align-items: center; justify-content: center; font-weight: 700; position: relative; border-radius: 3px; }
                .tab-cell.entete { background: #e7ecf7; color: #556; font-size: .85rem; }
                .tab-cell.zone { outline: 3px solid #4263eb; outline-offset: -3px; background: #dbe4ff; z-index: 2; }
                .tab-cell.bonne { background: #b2f2bb !important; }
                .tab-cell input { width: 100%; height: 100%; border: none; text-align: center; font: inherit; background: transparent; min-width: 0; }
                /* La case en cours de saisie s'ÉLARGIT par-dessus ses voisines :
                   sur un téléphone, le clavier repousse la barre de formule
                   hors de l'écran et il ne restait que la case, qui coupait la
                   formule (« omme( » pour « =SOMME(B1:B4) »). */
                .tab-cell input:focus {
                    position: absolute; left: 50%; top: 0; transform: translateX(-50%);
                    height: 100%; z-index: 40;
                    width: var(--tab-saisie, 100%); min-width: 100%;
                    background: #fff; border-radius: 6px;
                    outline: 3px solid #4263eb; outline-offset: 0;
                    box-shadow: 0 4px 14px rgba(15, 23, 42, .18);
                }
                .tab-cell input.fige { color: #778; background: #f1f3f9; }
                .tab-cell input.juste { background: #b2f2bb; }
                .tab-cell input.faux { background: #ffc9c9; }
                .tab-duo { display: flex; gap: 18px; flex-wrap: wrap; justify-content: center; align-items: flex-start; }
                .tab-duo h3 { text-align: center; margin: 0 0 6px; font-size: .95rem; color: #556; }
                .tab-palette { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }
                .tab-coul { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 3px solid transparent; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
                .tab-coul.choisie { border-color: #223; transform: scale(1.15); }
                .tab-verif { border: none; border-radius: 10px; padding: 10px 20px; font-weight: 900; background: #4263eb; color: #fff; cursor: pointer; font-family: inherit; font-size: 1rem; }
                .tab-fx { position: sticky; top: 0; display: flex; align-items: center; gap: 8px; background: #fff; border: 2px solid #c3cbe0; border-radius: 12px; padding: 6px 8px 6px 12px; width: min(480px, 96%); margin: 0 auto 8px; box-sizing: border-box; }
                .tab-fx[hidden] { display: none; }
                .tab-fx-nom { font-weight: 900; color: #4263eb; background: #dbe4ff; border-radius: 6px; padding: 3px 8px; min-width: 30px; text-align: center; }
                .tab-fx-val { flex: 1; font-family: monospace; font-size: 1.05rem; color: #223; min-height: 1.4em; overflow-wrap: anywhere; text-align: left; }
                .tab-fx-val:empty::before { content: 'Touche une case, puis tape…'; color: #99a; font-family: inherit; font-size: .88rem; }
                .tab-fx-btn { padding: 8px 14px; font-size: .92rem; border-radius: 8px; }
            </style>
            <div class="tab-wrap">
                <div class="tab-top" data-menu><span class="tab-menu-label">Leçons :</span></div>
                <div class="tab-corps">
                    <div class="tab-titre"><span data-titre></span> <span class="tab-avancee" data-avancee></span></div>
                    <div class="tab-consigne" data-consigne></div>
                    <div class="tab-msg" data-msg></div>
                    <div class="tab-fx" data-fx hidden>
                        <span class="tab-fx-nom" data-fx-nom>—</span>
                        <span class="tab-fx-val" data-fx-val></span>
                        <button type="button" class="tab-verif tab-fx-btn" data-fx-ok>✓ Valider</button>
                    </div>
                    <div data-scene></div>
                </div>
            </div>`;

        this.ui = {
            menu: this.container.querySelector('[data-menu]'),
            titre: this.container.querySelector('[data-titre]'),
            avancee: this.container.querySelector('[data-avancee]'),
            consigne: this.container.querySelector('[data-consigne]'),
            msg: this.container.querySelector('[data-msg]'),
            scene: this.container.querySelector('[data-scene]'),
            fx: this.container.querySelector('[data-fx]'),
            fxNom: this.container.querySelector('[data-fx-nom]'),
            fxVal: this.container.querySelector('[data-fx-val]')
        };

        // Barre de formule : sur tablette, la saisie déborde de sa petite case
        // et il n'y a pas de touche Entrée évidente — la barre montre TOUT ce
        // qu'on tape et le bouton Valider remplace Entrée.
        this.inputActif = null;
        // Règle à mesurer les textes : un canevas hors écran, comme le faisait
        // l'original — c'est la seule façon fiable de connaître la largeur
        // qu'occupera une formule avant de l'afficher.
        this.reglet = document.createElement('canvas').getContext('2d');
        this.onFocusIn = (e) => {
            const inp = e.target.closest && e.target.closest('input[data-cell-id]');
            if (!inp || inp.readOnly) return;
            this.inputActif = inp;
            this.ui.fxNom.textContent = inp.dataset.cellId;
            this.ui.fxVal.textContent = inp.value;
            this.elargir(inp);
        };
        this.container.addEventListener('focusin', this.onFocusIn);
        this.container.addEventListener('focusout', (e) => {
            const inp = e.target.closest && e.target.closest('input[data-cell-id]');
            if (inp) { inp.style.removeProperty('--tab-saisie'); inp.style.removeProperty('left'); }
        });
        this.container.addEventListener('input', (e) => {
            if (e.target === this.inputActif) {
                this.ui.fxVal.textContent = e.target.value;
                this.elargir(e.target);
            }
        });
        this.container.querySelector('[data-fx-ok]').onclick = () => {
            if (this.inputActif) this.validerSaisie(this.inputActif);
        };

        for (let i = 1; i <= 9; i++) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'tab-niv';
            b.textContent = i;
            b.onclick = () => { if (!this.isDemo) this.montrerNiveau(i, true); };
            this.ui.menu.appendChild(b);
        }

        // La sélection de plage se termine où que le doigt soit relâché.
        this.onPointerUp = () => this.finirSelection();
        document.addEventListener('pointerup', this.onPointerUp);
    }

    startGameLoop() {
        this.montrerNiveau(this.level, true);
    }

    message(txt, cls) {
        this.ui.msg.textContent = txt;
        this.ui.msg.className = 'tab-msg ' + (cls || '');
    }

    /**
     * Donne à la case en saisie la largeur de son contenu, sans jamais sortir
     * de la grille : au bord droit, elle s'étend vers la gauche.
     */
    elargir(inp) {
        const grille = this.grilleActive();
        if (!grille || !inp) return;
        const style = getComputedStyle(inp);
        this.reglet.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const texte = inp.value || inp.placeholder || '';
        const voulue = this.reglet.measureText(texte).width + 30;

        const cellule = inp.parentElement;
        const rc = cellule.getBoundingClientRect();
        const rg = grille.getBoundingClientRect();
        // Jamais plus large que la grille, et centrée sur sa case tant que
        // c'est possible : au-delà, on la décale pour rester dans le cadre.
        const large = Math.min(Math.max(voulue, rc.width), rg.width - 4);
        const centre = rc.left + rc.width / 2;
        let gauche = centre - large / 2;
        gauche = Math.max(rg.left + 2, Math.min(gauche, rg.right - large - 2));
        inp.style.setProperty('--tab-saisie', `${Math.round(large)}px`);
        // `left` est en pourcentage de la case : on convertit le décalage.
        inp.style.left = `${Math.round(gauche - rc.left + large / 2)}px`;
    }

    // La progression de la leçon s'affiche en toutes lettres à côté du titre :
    // une barre de plus faisait doublon avec celle de la plateforme.
    majProg() {
        this.ui.avancee.textContent = `· ${Math.min(this.victoires, this.goal)}/${this.goal} réussies`;
    }

    // --- Niveaux ------------------------------------------------------------

    montrerNiveau(lvl, annonce) {
        this.level = lvl;
        this.victoires = 0;
        this.majProg();
        this.cols = ['A', 'B', 'C', 'D', 'E'];
        this.rows = lvl === 9 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
        this.ui.menu.querySelectorAll('.tab-niv').forEach((b, i) => b.classList.toggle('actif', i + 1 === lvl));
        this.ui.titre.textContent = TITRES[lvl];
        if (annonce) this.message(INTROS[lvl], 'ok');
        this.ui.fx.hidden = lvl < 4;
        this.inputActif = null;
        this.ui.fxNom.textContent = '—';
        this.ui.fxVal.textContent = '';

        if (lvl === 3) {
            this.ui.scene.innerHTML = `
                <div class="tab-palette" data-palette></div>
                <div class="tab-duo" style="margin-top:10px">
                    <div><h3>Modèle</h3><div class="tab-grille" data-modele></div></div>
                    <div><h3>Ton dessin</h3><div class="tab-grille" data-dessin></div></div>
                </div>
                <div style="text-align:center; margin-top:10px"><button type="button" class="tab-verif" data-verif-art>VÉRIFIER</button></div>`;
            const pal = this.ui.scene.querySelector('[data-palette]');
            Object.entries(COULEURS).forEach(([nom, css]) => {
                const d = document.createElement('div');
                d.className = 'tab-coul';
                d.style.background = css;
                if (nom === 'white') d.style.border = '3px solid #ccd';
                d.dataset.couleur = nom;
                d.onclick = () => {
                    this.couleurActive = nom;
                    pal.querySelectorAll('.tab-coul').forEach(x => x.classList.remove('choisie'));
                    d.classList.add('choisie');
                };
                pal.appendChild(d);
            });
            pal.querySelector('[data-couleur="red"]').classList.add('choisie');
            this.couleurActive = 'red';
            this.ui.scene.querySelector('[data-verif-art]').onclick = () => this.verifierPixelArt();
        } else {
            this.ui.scene.innerHTML = `<div class="tab-grille" data-grille></div>`;
            this.construireGrille(this.ui.scene.querySelector('[data-grille]'), true);
        }
        this.genererTache();
    }

    construireGrille(el, interactive, modele = null) {
        el.innerHTML = '';
        el.style.gridTemplateColumns = `28px repeat(${this.cols.length}, minmax(44px, 64px))`;
        const entete = (txt) => {
            const d = document.createElement('div');
            d.className = 'tab-cell entete';
            d.textContent = txt;
            return d;
        };
        el.appendChild(entete(''));
        this.cols.forEach(c => el.appendChild(entete(c)));
        this.rows.forEach((r, ri) => {
            el.appendChild(entete(r));
            this.cols.forEach((c, ci) => {
                const cell = document.createElement('div');
                cell.className = 'tab-cell';
                cell.dataset.id = c + r;
                cell.dataset.col = ci;
                cell.dataset.row = ri;
                if (modele) {
                    const coul = modele[ri][ci];
                    if (coul) cell.style.backgroundColor = COULEURS[coul];
                    cell.dataset.attendu = coul || 'white';
                } else if (interactive) {
                    if (this.level >= 4) {
                        const inp = document.createElement('input');
                        inp.type = 'text';
                        inp.autocomplete = 'off';
                        inp.dataset.cellId = cell.dataset.id;
                        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.validerSaisie(inp); });
                        cell.appendChild(inp);
                    } else if (this.level === 1) {
                        cell.style.cursor = 'pointer';
                        cell.onclick = () => this.cliquerCase(cell);
                    } else {
                        cell.addEventListener('pointerdown', (e) => {
                            e.preventDefault();
                            this.selEnCours = true;
                            this.selDepart = cell;
                            this.etendreSelection(cell);
                        });
                    }
                }
                el.appendChild(cell);
            });
        });
        if (interactive && this.level >= 2 && this.level <= 3) {
            // Le doigt qui glisse ne déclenche pas de survol : on interroge la
            // case sous le pointeur à chaque mouvement.
            el.addEventListener('pointermove', (e) => {
                if (!this.selEnCours) return;
                const sous = document.elementFromPoint(e.clientX, e.clientY);
                const cell = sous && sous.closest('.tab-cell:not(.entete)');
                if (cell && cell.dataset.col !== undefined) this.etendreSelection(cell);
            });
        }
    }

    grilleActive() {
        return this.ui.scene.querySelector(this.level === 3 ? '[data-dessin]' : '[data-grille]');
    }

    // --- Tâches -------------------------------------------------------------

    genererTache() {
        if (!this.isRunning) return;
        this.taches = [];
        this.tachesFaites = 0;
        const grille = this.grilleActive();
        if (grille) grille.querySelectorAll('.tab-cell').forEach(c => {
            c.classList.remove('zone', 'bonne');
            if (this.level !== 3) c.style.backgroundColor = '';
            const inp = c.querySelector('input');
            if (inp) { inp.value = ''; inp.readOnly = false; inp.className = ''; }
        });

        const premier = this.victoires === 0;
        const ligne = (this.victoires % 5) + 1;
        const colIdx = this.victoires % 5;
        const consigne = this.ui.consigne;
        const alea = (n) => Math.floor(Math.random() * n);

        if (this.level === 1) {
            this.cible = this.cols[alea(5)] + this.rows[alea(5)];
            consigne.innerHTML = `Clique sur la case <span class="cible">${this.cible}</span>`;
        } else if (this.level === 2) {
            // Le coin de départ ne peut pas être au bord dans les deux sens à
            // la fois, sinon la plage 1×1 interdite ne pourrait pas s'étendre.
            const cI = alea(4);
            const rI = cI === 3 ? alea(3) : alea(4);
            let w = alea(4 - cI) + 1, h = alea(4 - rI) + 1;
            if (w === 1 && h === 1) { if (cI + 2 <= 4) w = 2; else h = 2; }
            this.cible = `${this.cols[cI]}${this.rows[rI]}:${this.cols[cI + w]}${this.rows[rI + h]}`;
            consigne.innerHTML = `Sélectionne la plage <span class="cible">${this.cible}</span> en glissant`;
        } else if (this.level === 3) {
            this.modele = MODELES_PIXEL[alea(MODELES_PIXEL.length)];
            this.construireGrille(this.ui.scene.querySelector('[data-modele]'), false, this.modele);
            this.construireGrille(this.ui.scene.querySelector('[data-dessin]'), true);
            consigne.innerHTML = 'Reproduis le modèle : choisis une couleur, puis peins les cases (clic ou glissé).';
        } else if (this.level === 4) {
            const v = alea(50);
            const cell = 'A' + ligne;
            this.taches = [{ id: cell, attendu: String(v) }];
            consigne.innerHTML = `Écris <b>${v}</b> dans la case <span class="cible">${cell}</span> (puis Entrée)`;
            this.focaliser(cell);
        } else if (this.level === 5) {
            const v1 = alea(10), v2 = alea(10);
            const [a, b, c] = ['A' + ligne, 'B' + ligne, 'C' + ligne];
            this.poser(a, v1); this.poser(b, v2);
            this.taches = [{ id: c, attendu: String(v1 + v2), formule: true }];
            consigne.innerHTML = `Calcule la somme de ${a} et ${b} en <span class="cible">${c}</span>${premier ? ` — ex : <span class="code">=${a}+${b}</span>` : ''}`;
            this.focaliser(c);
        } else if (this.level === 6) {
            this.poser('A1', 'PRIX'); this.poser('B1', 'QTÉ'); this.poser('C1', 'TOT');
            const l = (this.victoires % 4) + 2;
            const p = 2 + alea(5), q = 2 + alea(5);
            const [a, b, c] = ['A' + l, 'B' + l, 'C' + l];
            this.poser(a, p); this.poser(b, q);
            this.taches = [{ id: c, attendu: String(p * q), formule: true }];
            consigne.innerHTML = `Calcule le total en <span class="cible">${c}</span> avec l'étoile *${premier ? ` — ex : <span class="code">=${a}*${b}</span>` : ''}`;
            this.focaliser(c);
        } else if (this.level === 7 || this.level === 8) {
            const col = this.cols[colIdx];
            let total = 0;
            const vals = [];
            for (let i = 1; i <= 4; i++) {
                const v = this.level === 8 ? alea(10) * 2 : alea(20);
                this.poser(col + i, v);
                total += v; vals.push(v);
            }
            const cible = col + '5';
            const plage = `${col}1:${col}4`;
            const attendu = this.level === 8 ? total / 4 : total;
            const fonction = this.level === 8 ? 'MOYENNE' : 'SOMME';
            this.taches = [{ id: cible, attendu: String(attendu), formule: true }];
            consigne.innerHTML = `${this.level === 8 ? 'Calcule la moyenne' : 'Additionne tout'} en <span class="cible">${cible}</span>${premier ? ` — utilise <span class="code">=${fonction}(${plage})</span>` : ''}`;
            this.focaliser(cible);
        } else if (this.level === 9) {
            this.poser('A1', 'Produit'); this.poser('B1', 'Px'); this.poser('C1', 'Qt'); this.poser('D1', 'TOT');
            this.poser('A2', 'Pomme'); this.poser('A3', 'Poire'); this.poser('A4', 'Banane');
            this.poser('C6', 'PAYER:');
            const lignes = [2, 3, 4].map(l => {
                const p = alea(5) + 1, q = alea(5) + 1;
                this.poser('B' + l, p); this.poser('C' + l, q);
                return { cell: 'D' + l, total: p * q };
            });
            const grandTotal = lignes.reduce((s, l) => s + l.total, 0);
            this.taches = [
                ...lignes.map(l => ({ id: l.cell, attendu: String(l.total), formule: true })),
                { id: 'D6', attendu: String(grandTotal), formule: true }
            ];
            consigne.innerHTML = `<b>La facture !</b> 1. Les totaux en D2, D3, D4 (=Px*Qt)&nbsp;· 2. Le total à payer en D6 (=SOMME)`;
            this.focaliser('D2');
        }
    }

    poser(id, val) {
        const inp = this.grilleActive()?.querySelector(`input[data-cell-id="${id}"]`);
        if (inp) { inp.value = val; inp.readOnly = true; inp.classList.add('fige'); }
    }

    focaliser(id) {
        if (this.isDemo) return;
        regTimeout(() => this.grilleActive()?.querySelector(`input[data-cell-id="${id}"]`)?.focus(), 80);
    }

    // --- Interactions -------------------------------------------------------

    cliquerCase(cell) {
        if (cell.dataset.id === this.cible) {
            cell.classList.add('bonne');
            this.miniVictoire(SKILL_REPERAGE, `Cliquer sur la case ${this.cible}`, this.cible);
        } else {
            this.message(`${cell.dataset.id} n'est pas la bonne case.`, 'ko');
            this.onWrongAnswer(null, {
                questionText: `Cliquer sur la case ${this.cible}`,
                input: cell.dataset.id, expected: this.cible,
                concept: SKILL_REPERAGE,
                customMessage: `${this.cible} : la LETTRE d'abord (colonne ${this.cible[0]}), le CHIFFRE ensuite (ligne ${this.cible.slice(1)}). Tu as cliqué en ${cell.dataset.id}.`
            });
        }
    }

    etendreSelection(cell) {
        const grille = this.grilleActive();
        grille.querySelectorAll('.tab-cell').forEach(c => c.classList.remove('zone'));
        this.selection = [];
        const c1 = +this.selDepart.dataset.col, r1 = +this.selDepart.dataset.row;
        const c2 = +cell.dataset.col, r2 = +cell.dataset.row;
        grille.querySelectorAll('.tab-cell:not(.entete)').forEach(c => {
            const ci = +c.dataset.col, ri = +c.dataset.row;
            if (ci >= Math.min(c1, c2) && ci <= Math.max(c1, c2) && ri >= Math.min(r1, r2) && ri <= Math.max(r1, r2)) {
                c.classList.add('zone');
                this.selection.push(c);
            }
        });
    }

    finirSelection() {
        if (!this.selEnCours) return;
        this.selEnCours = false;
        if (this.level === 2) {
            const zone = this.selection.length
                ? `${this.selection[0].dataset.id}:${this.selection[this.selection.length - 1].dataset.id}` : '';
            if (zone === this.cible) {
                this.miniVictoire(SKILL_REPERAGE, `Sélectionner la plage ${this.cible}`, this.cible);
            } else {
                this.message(`Tu as sélectionné ${zone || 'rien'}, il fallait ${this.cible}.`, 'ko');
                this.onWrongAnswer(null, {
                    questionText: `Sélectionner la plage ${this.cible}`,
                    input: zone, expected: this.cible,
                    concept: SKILL_REPERAGE,
                    customMessage: `Une plage se lit coin à coin : ${this.cible} commence en ${this.cible.split(':')[0]} et finit en ${this.cible.split(':')[1]}. Pars du premier coin et glisse jusqu'au second.`
                });
            }
            this.grilleActive().querySelectorAll('.tab-cell').forEach(c => c.classList.remove('zone'));
        } else if (this.level === 3) {
            (this.selection || []).forEach(c => {
                c.style.backgroundColor = COULEURS[this.couleurActive];
                c.dataset.peint = this.couleurActive;
                c.classList.remove('zone');
            });
        }
        this.selection = [];
    }

    verifierPixelArt() {
        const cases = [...this.ui.scene.querySelectorAll('[data-dessin] .tab-cell:not(.entete)')];
        let faux = 0;
        cases.forEach(c => {
            const attendu = this.modele[+c.dataset.row][+c.dataset.col] || 'white';
            if ((c.dataset.peint || 'white') !== attendu) faux++;
        });
        if (faux === 0) {
            this.miniVictoire(SKILL_REPERAGE, 'Reproduire le modèle en pixel art', 'dessin conforme');
        } else {
            this.message(`Presque ! ${faux} case${faux > 1 ? 's diffèrent' : ' diffère'} du modèle.`, 'ko');
            this.onWrongAnswer(null, {
                questionText: 'Reproduire le modèle en pixel art',
                input: `${faux} case(s) différente(s)`, expected: 'dessin identique au modèle',
                concept: SKILL_REPERAGE,
                customMessage: `Compare case par case en te repérant : « le modèle a du rouge en B2, et mon dessin ? ». Il reste ${faux} case${faux > 1 ? 's' : ''} à corriger.`
            });
        }
    }

    validerSaisie(inp) {
        const tache = this.taches.find(t => t.id === inp.dataset.cellId);
        if (!tache) return;
        // Majuscules ou minuscules, peu importe : =somme(a1:a4) vaut =SOMME(A1:A4).
        const val = inp.value.trim().toUpperCase();
        if (inp === this.inputActif) this.ui.fxVal.textContent = inp.value;

        if (tache.formule) {
            if (!val.startsWith('=')) {
                this.message('Une formule commence toujours par =', 'ko');
                inp.classList.add('faux');
                this.onWrongAnswer(null, {
                    questionText: this.ui.consigne.textContent,
                    input: inp.value, expected: 'une formule commençant par =',
                    concept: SKILL_FORMULES,
                    customMessage: `Sans le signe =, le tableur croit que tu écris du texte. C'est = qui déclenche le calcul.`
                });
                return;
            }
            const aRef = /[A-E][1-9]/.test(val);
            const aFonction = /(SOMME|SUM|MOYENNE|AVERAGE)/.test(val);
            if (!aRef && !aFonction) {
                this.message('Utilise les références des cases (A1, B2…), pas les nombres !', 'ko');
                inp.classList.add('faux');
                this.onWrongAnswer(null, {
                    questionText: this.ui.consigne.textContent,
                    input: inp.value, expected: 'une formule avec des références',
                    concept: SKILL_FORMULES,
                    customMessage: `Recopier les nombres (=3+4) marche une fois, mais si une case change, ton résultat devient faux. Avec les références (=A1+B1), le tableur recalcule tout seul : c'est toute sa force.`
                });
                return;
            }
            const res = this.evaluerFormule(val);
            if (Math.abs(parseFloat(res) - parseFloat(tache.attendu)) < 0.1) {
                inp.value = res;
                if (inp === this.inputActif) this.ui.fxVal.textContent = String(res);
                this.reussirSaisie(inp);
            } else {
                this.message(`Ta formule donne ${res}, attendu : ${tache.attendu}.`, 'ko');
                inp.classList.add('faux');
                this.onWrongAnswer(null, {
                    questionText: this.ui.consigne.textContent,
                    input: val, expected: tache.attendu,
                    concept: SKILL_FORMULES,
                    customMessage: `La formule ${val} calcule ${res}. Vérifie que tu utilises les BONNES cases : relis la consigne et pointe chaque référence du doigt.`
                });
            }
        } else {
            if (val === tache.attendu) this.reussirSaisie(inp);
            else {
                this.message(`Ce n'est pas la valeur demandée.`, 'ko');
                inp.classList.add('faux');
                this.onWrongAnswer(null, {
                    questionText: this.ui.consigne.textContent,
                    input: inp.value, expected: tache.attendu,
                    concept: SKILL_REPERAGE,
                    customMessage: `Relis la consigne : il fallait écrire ${tache.attendu} dans la case ${tache.id}.`
                });
            }
        }
    }

    reussirSaisie(inp) {
        if (inp.classList.contains('juste')) return;
        inp.classList.remove('faux');
        inp.classList.add('juste');
        inp.blur();
        this.tachesFaites++;
        if (this.tachesFaites >= this.taches.length) {
            const skill = this.level >= 5 ? SKILL_FORMULES : SKILL_REPERAGE;
            this.miniVictoire(skill, this.ui.consigne.textContent, this.taches.map(t => t.attendu).join(', '));
        } else {
            this.message('Bien ! Continue…', 'ok');
        }
    }

    // --- Calcul des formules ------------------------------------------------

    evaluerFormule(formule) {
        let expr = formule.substring(1).toUpperCase();
        const plage = (s, e) => {
            const vals = [];
            const c1 = this.cols.indexOf(s[0]), r1 = parseInt(s.slice(1)) - 1;
            const c2 = this.cols.indexOf(e[0]), r2 = parseInt(e.slice(1)) - 1;
            for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
                for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
                    const inp = this.grilleActive().querySelector(`input[data-cell-id="${this.cols[c] + (r + 1)}"]`);
                    const v = inp ? parseFloat(inp.value) : NaN;
                    if (!isNaN(v)) vals.push(v);
                }
            }
            return vals;
        };
        expr = expr.replace(/(SUM|SOMME)\(([A-E][1-6]):([A-E][1-6])\)/g, (m, f, s, e) =>
            plage(s, e).reduce((a, b) => a + b, 0));
        expr = expr.replace(/(AVERAGE|MOYENNE)\(([A-E][1-6]):([A-E][1-6])\)/g, (m, f, s, e) => {
            const v = plage(s, e);
            return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
        });
        expr = expr.replace(/([A-E][1-6])/g, (m) => {
            const inp = this.grilleActive().querySelector(`input[data-cell-id="${m}"]`);
            const v = inp ? parseFloat(inp.value) : NaN;
            return isNaN(v) ? 0 : v;
        });
        try {
            if (/[^0-9+\-*/().\s]/.test(expr)) return 'Erreur';
            const res = new Function('return ' + expr)();
            return Math.round(res * 100) / 100;
        } catch { return 'Erreur'; }
    }

    // --- Progression --------------------------------------------------------

    miniVictoire(skill, question, reponse) {
        this.victoires++;
        this.majProg();
        this.onCorrectAnswer(null, skill, {
            points: 10, questionText: question, given: reponse, expected: reponse
        });
        if (this.victoires >= this.goal) {
            if (this.level < 9) {
                this.message(`Niveau terminé, bravo ! ${INTROS[this.level + 1]}`, 'ok');
                regTimeout(() => { if (this.isRunning) this.montrerNiveau(this.level + 1, false); }, 2200);
            } else {
                this.message('🏆 CERTIFIÉ EXPERT ! Tu as terminé toute l\'École du Tableur.', 'ok');
                regTimeout(() => { if (this.isRunning) this.montrerNiveau(9, false); }, 3000);
            }
        } else {
            this.message('Exact !', 'ok');
            regTimeout(() => { if (this.isRunning) this.genererTache(); }, 700);
        }
    }

    // --- Robot : la visite guidée -------------------------------------------
    // Trois gestes fondateurs, en boucle : lire le nom d'une case, étirer une
    // plage, écrire une formule avec des références.

    async runDemoSequence() {
        const cursor = createDemoCursor();
        this.demoCursor = cursor;
        const gate = createDemoGate(this.container.querySelector('.tab-corps'));
        const fin = () => { cursor.hideBubble(); gate.destroy(); };

        this.montrerNiveau(1, false);
        if (!await cursor.pause(1200) || !this.isRunning) return fin();

        while (this.isRunning && this.isDemo) {
            // 1. Nommer une case.
            this.montrerNiveau(1, false);
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const cell = this.grilleActive().querySelector(`[data-id="${this.cible}"]`);
            cursor.say(`La case ${this.cible} : la lettre donne la COLONNE (${this.cible[0]}), le chiffre la LIGNE (${this.cible.slice(1)}). Je descends la colonne ${this.cible[0]} jusqu'à la ligne ${this.cible.slice(1)}.`, cell);
            if (!await cursor.pause(2600) || !this.isRunning) return fin();
            if (!cell || !await cursor.tap(cell, 320)) return fin();
            this.cliquerCase(cell);
            if (!await cursor.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

            // 2. Étirer une plage.
            this.montrerNiveau(2, false);
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const [debut, finPlage] = this.cible.split(':');
            const cDebut = this.grilleActive().querySelector(`[data-id="${debut}"]`);
            const cFin = this.grilleActive().querySelector(`[data-id="${finPlage}"]`);
            cursor.say(`La plage ${this.cible} se lit coin à coin : je pars de ${debut} et je glisse jusqu'à ${finPlage}.`, cDebut);
            if (!await cursor.pause(2200) || !this.isRunning) return fin();
            if (!cDebut || !await cursor.tap(cDebut, 260)) return fin();
            this.selDepart = cDebut;
            this.selEnCours = true;
            this.etendreSelection(cDebut);
            if (!cFin || !await cursor.tap(cFin, 380)) return fin();
            this.etendreSelection(cFin);
            this.finirSelection();
            if (!await cursor.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

            // 3. Écrire une formule.
            this.montrerNiveau(5, false);
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            const tache = this.taches[0];
            const inp = this.grilleActive().querySelector(`input[data-cell-id="${tache.id}"]`);
            const l = tache.id.slice(1);
            const formule = `=A${l}+B${l}`;
            cursor.say(`Le signe = dit au tableur : « calcule ! ». A${l} et B${l} sont des RÉFÉRENCES : si une case change, le résultat se met à jour tout seul. J'écris ${formule}.`, inp);
            if (!await cursor.pause(3000) || !this.isRunning) return fin();
            if (!inp || !await cursor.tap(inp, 260)) return fin();
            this.ui.fxNom.textContent = tache.id;
            for (const ch of formule) {
                inp.value += ch;
                this.ui.fxVal.textContent = inp.value;
                if (!await cursor.pause(170) || !this.isRunning) return fin();
            }
            this.validerSaisie(inp);
            if (!await cursor.pause(DEMO_SPEED.between + 600) || !this.isRunning) return fin();
        }
        fin();
    }

    destroy() {
        if (this.demoCursor) { this.demoCursor.destroy(); this.demoCursor = null; }
        document.removeEventListener('pointerup', this.onPointerUp);
        super.destroy();
    }
}

export function engineTableur(container, isDemo, params) {
    const game = new Tableur(container, isDemo, params, 'don-tableur');
    game.start();
    return game;
}
