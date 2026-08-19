// POSER UNE MULTIPLICATION, POSER UNE DIVISION — les deux algorithmes longs.
//
// L'addition et la soustraction tiennent dans une grille de colonnes : un
// chiffre par rang, une ligne de résultat, et c'est fini (js/games/
// poserOperation.js). Ces deux-là n'y tiennent pas, et les y forcer donnerait
// un mauvais compromis pour les quatre.
//
//   · LA MULTIPLICATION est en LIGNES : un produit partiel par chiffre du
//     multiplicateur, décalé d'un rang à chaque fois, puis l'addition de ces
//     lignes. Et sa retenue ne se comporte pas comme celle de l'addition :
//     elle s'ajoute APRÈS le produit (d × c + r), pas au chiffre. C'est
//     l'erreur classique — (2 + 2) × 4 au lieu de 2 × 4 + 2 — et elle ne se
//     voit que si l'on fait écrire les lignes une à une.
//
//   · LA DIVISION est une SUITE D'ÉTAPES toutes identiques : j'abaisse, je
//     cherche combien de fois, je multiplie, je soustrais. Rien n'est en
//     colonnes ; ce qui compte, c'est que chaque étape recommence la même
//     chose, et que le rang du chiffre abaissé donne le rang du chiffre du
//     quotient. C'est de là que vient la virgule du quotient, qu'on récite
//     d'ordinaire sans la comprendre.
//
// DANS LES DEUX CAS ON NE SAUTE RIEN. On ne peut pas écrire la deuxième ligne
// avant la première, ni la soustraction avant d'avoir dit combien de fois :
// l'algorithme EST cet ordre.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { lignesMultiplication, colonnesDivision, colonnesAddition } from '../core/poser.js';

const STYLE = `
    .pl-wrap {
        display: flex; flex-direction: column; align-items: center; gap: 10px;
        width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
        color: var(--text-main); container-type: inline-size; overflow-y: auto;
    }
    .pl-tete { display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
        justify-content: center; font-size: .88rem; }
    .pl-btn {
        border: 1px solid var(--border); background: var(--bg-panel);
        color: var(--text-main); border-radius: 9px; cursor: pointer;
        font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
    }
    .pl-btn:hover { background: var(--bg-hover); }
    .pl-etape {
        font-weight: 800; font-size: clamp(13px, 3.2cqw, 17px); color: #fff;
        padding: 5px 14px; border-radius: 999px; text-align: center;
        background: linear-gradient(135deg, var(--primary), #8b5cf6);
    }

    /* LA FEUILLE. Une grille de cases carrées : c'est le cahier, et rien ne
       s'y écrit en dehors des colonnes. */
    .pl-grille {
        display: grid; gap: 2px; font-variant-numeric: tabular-nums;
        font-weight: 800; font-size: clamp(17px, 5cqw, 27px);
    }
    .pl-case {
        width: clamp(26px, 7.5cqw, 40px); height: clamp(28px, 8cqw, 42px);
        display: flex; align-items: center; justify-content: center;
        border-radius: 5px; position: relative;
    }
    .pl-case--ecrit { background: var(--bg-hover); }
    .pl-case--donne { color: var(--text-main); }
    .pl-case--active {
        outline: 3px solid var(--primary);
        background: color-mix(in srgb, var(--primary) 15%, transparent);
        animation: pl-bat 1.1s ease-in-out infinite;
    }
    @keyframes pl-bat { 50% { outline-color: color-mix(in srgb, var(--primary) 40%, transparent); } }
    .pl-case--faux { animation: pl-non .34s ease; }
    /* La colonne fausse, montrée AVANT d'être effacée : c'est ce temps-là qui
       apprend. Le chiffre reste lisible, en rouge, sur son fond rouge pâle. */
    .pl-case--erreur {
        background: color-mix(in srgb, var(--danger) 22%, transparent);
        color: var(--danger); outline: 2px solid var(--danger);
    }
    @keyframes pl-non { 25% { translate: -5px 0; } 75% { translate: 5px 0; } }
    .pl-case--virgule::after {
        content: ''; position: absolute; right: -3px; bottom: 2px;
        width: 7px; height: 7px; border-radius: 50%; background: var(--danger);
    }
    /* La case où l'on peut POSER la virgule : un intervalle cliquable, pas une
       colonne — la virgule ne prend pas de rang. */
    .pl-fente {
        position: absolute; right: -6px; top: 0; width: 12px; height: 100%;
        cursor: pointer; border-radius: 4px;
    }
    .pl-fente:hover { background: color-mix(in srgb, var(--danger) 35%, transparent); }

    .pl-signe { display: flex; align-items: center; justify-content: flex-end;
        padding-right: 4px; font-weight: 900; }
    /* LE TRAIT PASSE DEVANT LES CASES. Rémy : « tu oublies la barre sous le
       5 − 4 ». Elle était bien créée, et posée au bon endroit — mais les cases
       de la grille sont en position relative, et un élément positionné se
       peint toujours par-dessus un frère qui ne l'est pas, quel que soit
       l'ordre. La barre de soustraction se dessinait donc sous le fond des
       chiffres, invisible, dans la potence comme dans la multiplication. */
    .pl-trait {
        height: 3px; background: var(--text-main); margin: 3px 0; border-radius: 2px;
        position: relative; z-index: 2;
    }
    /* La potence : le trait vertical entre dividende et diviseur, et le trait
       horizontal sous le diviseur. Deux traits, et tout le monde reconnaît. */
    .pl-potence-v { border-left: 3px solid var(--text-main); }
    .pl-potence-h { border-top: 3px solid var(--text-main); }

    .pl-retenue { height: clamp(16px, 4.5cqw, 22px); display: flex;
        align-items: center; justify-content: center; }
    .pl-rond {
        width: clamp(15px, 4.2cqw, 21px); height: clamp(15px, 4.2cqw, 21px);
        border-radius: 50%; border: 2px dashed var(--danger); background: transparent;
        display: flex; align-items: center; justify-content: center;
        font-size: clamp(10px, 2.8cqw, 13px); font-weight: 900;
        color: var(--danger); cursor: pointer; padding: 0;
    }
    .pl-rond--plein { border-style: solid; }

    .pl-pave { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; max-width: 320px; }
    .pl-touche {
        width: 42px; height: 42px; border-radius: 9px; cursor: pointer;
        border: 2px solid var(--border); background: var(--bg-panel);
        color: var(--text-main); font-size: 19px; font-weight: 800; font-family: inherit;
    }
    .pl-touche:hover { background: var(--primary); color: #fff; }
    .pl-touche--ok { border-color: var(--success); color: var(--success); }
    .pl-saisie {
        min-width: 70px; padding: 4px 12px; border-radius: 8px; font-weight: 900;
        font-size: clamp(16px, 4.5cqw, 22px); text-align: center;
        border: 2px dashed var(--primary); min-height: 1.4em;
    }
    .pl-note { min-height: 2.6em; text-align: center; line-height: 1.35;
        font-size: clamp(12px, 2.9cqw, 15px); color: var(--text-muted); max-width: 580px; }
    .pl-note--ok { color: var(--success); font-weight: 700; }
    .pl-note--ko { color: var(--danger); font-weight: 700; }
`;

const SQUELETTE = `
    <div class="pl-wrap">
        <div class="pl-tete">
            <span data-score></span>
            <button type="button" class="pl-btn" data-indice>💡 Aide</button>
            <button type="button" class="pl-btn" data-neuf>↺ Autre opération</button>
        </div>
        <div class="pl-etape" data-etape></div>
        <div class="pl-grille" data-grille></div>
        <div data-zone></div>
        <p class="pl-note" data-note></p>
    </div>`;

/** Ce que les deux écrans ont en commun : le cadre, le pavé, la note. */
class PoserLongue extends BaseGame {
    constructor(container, isDemo, params, id) {
        super(container, isDemo, params, id);
        this.rng = makeRng(this.params.seed);
        this.reussies = 0;
    }

    render() {
        this.container.innerHTML = `<style>${STYLE}</style>${SQUELETTE}`;
        this.etapeEl = this.container.querySelector('[data-etape]');
        this.grilleEl = this.container.querySelector('[data-grille]');
        this.zoneEl = this.container.querySelector('[data-zone]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.poser());
        this.container.querySelector('[data-indice]').addEventListener('click', () => this.aider());
        this.poser();
    }

    startGameLoop() { /* Pas d'horloge : on réfléchit. */ }
    showNext() { return this.poser(); }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'pl-note' + (ton ? ` pl-note--${ton}` : '');
    }

    majScore() {
        const n = this.reussies;
        this.scoreEl.textContent = `${n} opération${n > 1 ? 's' : ''} posée${n > 1 ? 's' : ''}`;
    }

    /** Une case de la grille, à la colonne voulue. */
    caseA(colonne, ligne, texte, classes = '') {
        const el = document.createElement('div');
        el.className = `pl-case ${classes}`;
        el.style.gridColumn = String(colonne + 1);
        el.style.gridRow = String(ligne + 1);
        if (texte !== null && texte !== undefined && texte !== '') el.textContent = texte;
        this.grilleEl.appendChild(el);
        return el;
    }

    /**
     * LE PAVÉ. Un chiffre s'ajoute à droite de ce qu'on tape, comme sur une
     * calculatrice ; ⌫ efface, ✓ valide. Un seul chiffre attendu se valide
     * tout seul — demander « ✓ » après chaque chiffre du quotient ferait deux
     * gestes là où il n'y a qu'une décision.
     */
    dessinerPave({ avecValider = true, avecEffacer = false, surValider, surChiffre, surEffacer } = {}) {
        this.zoneEl.innerHTML = '';
        const ligne = document.createElement('div');
        ligne.style.cssText = 'display:flex; gap:10px; align-items:center; justify-content:center; flex-wrap:wrap;';
        this.zoneEl.appendChild(ligne);

        const pave = document.createElement('div');
        pave.className = 'pl-pave';
        for (let n = 0; n <= 9; n++) {
            const t = document.createElement('button');
            t.type = 'button';
            t.className = 'pl-touche';
            t.textContent = n;
            t.addEventListener('click', () => surChiffre(n));
            pave.appendChild(t);
        }
        // LE ⌫ EXISTE MÊME SANS ✓. Rémy : « comment annule-t-on une opération
        // sur laquelle on s'est trompé ? En effet on ne peut revenir sur les
        // cases dont on a rempli le chiffre ». Il n'y avait tout simplement PAS
        // de touche d'effacement dans la multiplication : chaque chiffre s'y
        // valide au moment où on le tape, et le pavé était construit sans ⌫ ni
        // ✓. Un élève qui tapait à côté n'avait aucun moyen de revenir.
        //
        // Quand un chiffre attend d'être validé, le ⌫ efface ce qu'on tape ;
        // sinon il REPREND le dernier chiffre écrit. Une seule touche, et le
        // geste qu'on attend d'elle dans les deux cas.
        if (avecValider || avecEffacer) {
            const eff = document.createElement('button');
            eff.type = 'button';
            eff.className = 'pl-touche';
            eff.textContent = '⌫';
            eff.title = 'Effacer le dernier chiffre';
            eff.addEventListener('click', () => {
                if (this.saisie) {
                    this.saisie = this.saisie.slice(0, -1);
                    this.dessiner();
                    return;
                }
                if (surEffacer) surEffacer(); else this.dessiner();
            });
            pave.appendChild(eff);
        }
        if (avecValider) {
            const ok = document.createElement('button');
            ok.type = 'button';
            ok.className = 'pl-touche pl-touche--ok';
            ok.textContent = '✓';
            ok.addEventListener('click', () => surValider());
            pave.appendChild(ok);
        }
        this.zoneEl.appendChild(pave);
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

// =====================================================================================
// LA MULTIPLICATION
// =====================================================================================

const COMP_MULT = 'num.mult.sens';

class PoserMultiplication extends PoserLongue {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'poser-multiplication');
        this.chiffresA = Math.max(2, Math.min(4, parseInt(this.params.chiffres) || 3));
        this.chiffresB = Math.max(1, Math.min(3, parseInt(this.params.chiffresB) || 2));
        this.avecVirgule = this.params.decimales === true;
        // QUAND CORRIGE-T-ON ? Rémy : « pour les suivants, dans les questions,
        // on vérifie à la fin mais on signale les erreurs ».
        //
        // Refuser un chiffre faux à l'instant où il est tapé enseigne bien la
        // première fois — l'élève ne construit jamais sur une erreur. Mais cela
        // ne ressemble plus à une multiplication posée : sur le cahier, on
        // écrit toute la ligne, PUIS on regarde. Et c'est ce regard-là qu'il
        // faut apprendre. On écrit donc la ligne entière, on la vérifie au
        // bout, et l'on montre exactement quelles colonnes sont fausses.
        // TROIS RÉGIMES, ET UN QUI MONTE TOUT SEUL.
        //
        // `immediate` refuse le chiffre faux à l'instant : on ne construit
        // jamais sur une erreur, mais on ne pose plus une multiplication — sur
        // le cahier, on écrit la ligne entière PUIS on regarde.
        // `fin` écrit tout et relit au bout, en montrant quelles colonnes
        // clochent : c'est le geste réel, et c'est plus exigeant.
        // `merite` commence guidé et OUVRE le libre à qui vient de réussir une
        // multiplication entière sans faute — puis le referme à la première
        // faute. Rémy : « au départ c'est guidé comme ce que tu fais », et le
        // libre s'obtient.
        this.regime = ['immediate', 'fin', 'merite'].includes(this.params.verification)
            ? this.params.verification : 'merite';
        this.verifAuFil = this.regime !== 'fin';
        this.sansFaute = true;
        this.fautes = new Set();
    }

    poser() {
        for (let essai = 0; essai < 200; essai++) {
            // On ne descend pas sous le premier chiffre entier : « 0,54 × 1,4 »
            // se pose très bien, mais l'exercice veut d'abord des nombres qui
            // ressemblent à ceux du cahier.
            const dec = this.avecVirgule ? this.rng.int(1, Math.min(2, this.chiffresA - 1)) : 0;
            const decB = this.avecVirgule && this.chiffresB > 1 ? this.rng.int(0, 1) : 0;
            const brut = (n) => this.rng.int(Math.pow(10, n - 1), Math.pow(10, n) - 1);
            const a = dec ? Number((brut(this.chiffresA) / Math.pow(10, dec)).toFixed(dec)) : brut(this.chiffresA);
            const b = decB ? Number((brut(this.chiffresB) / Math.pow(10, decB)).toFixed(decB)) : brut(this.chiffresB);
            // Un multiplicateur qui finit par zéro donne une ligne de zéros :
            // c'est un cas à part, pas un exercice pour découvrir la méthode.
            if (String(Math.round(b * Math.pow(10, decB))).endsWith('0')) continue;
            const m = lignesMultiplication(a, b);
            // LA VIRGULE DOIT POUVOIR SE POSER ENTRE DEUX CHIFFRES ÉCRITS. Si le
            // produit a autant de décimales que de chiffres, la réponse commence
            // par « 0, » — et il n'y a plus d'intervalle où cliquer.
            if (m.decimales >= String(m.produitEntier).length) continue;
            // « 9,0 » s'écrit « 9 » : un tirage décimal peut retomber sur deux
            // entiers, et l'exercice demandé — placer la virgule — disparaît
            // sans que personne ne s'en aperçoive.
            if (this.avecVirgule && m.decimales === 0) continue;
            this.m = m;
            break;
        }
        // On écrit les lignes de la plus basse (unités) vers la plus haute.
        this.ligne = 0;
        this.position = 0;
        this.ecrits = this.m.lignes.map(() => ({}));
        this.retenues = this.m.lignes.map(() => ({}));
        this.somme = {};
        this.retSomme = {};
        this.virgule = null;
        this.phase = 'lignes';
        this.tableauSomme = this.m.sommeAPoser
            ? colonnesAddition(this.m.lignes.map(l => l.pose))
            : null;
        this.dessiner();
        return true;
    }

    /** La largeur du cahier : le produit, plus la place d'une retenue en tête. */
    get largeur() { return Math.max(this.m.largeur, String(this.m.entiers[0]).length + this.m.lignes.length); }

    dessiner() {
        const g = this.grilleEl;
        g.innerHTML = '';
        this.casesSomme = {};
        const L = this.largeur;
        g.style.gridTemplateColumns = `auto repeat(${L}, auto)`;
        this.majScore();
        this.etapeEl.textContent = this.phase === 'lignes'
            ? `① Ligne ${this.ligne + 1} sur ${this.m.lignes.length} : ${this.m.entiers[0]} × ${this.m.lignes[this.ligne].chiffre}`
            : this.phase === 'somme' ? '② Additionne les lignes'
                : '③ Place la virgule';

        // La colonne 0 porte les signes ; le chiffre de position p s'écrit à la
        // colonne L − p (les unités à droite).
        const col = (p) => L - p;
        let ligneGrille = 0;

        // Les retenues de la ligne en cours, écrites au-dessus des facteurs.
        if (this.phase === 'lignes') {
            this.rangeeRetenuesLigne(ligneGrille++, col);
        }

        // Les deux facteurs, en entiers : à la multiplication on aligne à
        // DROITE, la virgule ne joue aucun rôle avant la fin.
        const [entA, entB] = this.m.entiers;
        this.ecrireNombre(String(entA), ligneGrille++, col, '');
        this.ecrireNombre(String(entB), ligneGrille++, col, '×');
        this.traitPleineLargeur(ligneGrille++, L);

        // Les lignes de produits partiels.
        this.m.lignes.forEach((l, i) => {
            const ecrits = this.ecrits[i];
            l.cases.forEach(c => {
                const fait = ecrits[c.position] !== undefined;
                const actif = this.phase === 'lignes' && i === this.ligne && c.position === this.positionCourante();
                const fautive = i === this.ligne && this.fautes && this.fautes.has(c.position);
                this.caseA(col(c.position), ligneGrille, fait ? ecrits[c.position] : '',
                    (fait ? 'pl-case--ecrit' : '') + (actif ? ' pl-case--active' : '')
                    + (fautive ? ' pl-case--erreur' : ''));
            });
            // Le décalage se VOIT : on marque d'un point les colonnes sautées,
            // sinon la ligne semble mal recopiée au lieu d'être décalée.
            for (let p = 0; p < l.decalage; p++) {
                this.caseA(col(p), ligneGrille, '·', 'pl-case--donne').style.opacity = '.35';
            }
            if (i > 0 || this.m.lignes.length > 1) {
                const s = document.createElement('div');
                s.className = 'pl-signe';
                s.style.gridColumn = '1';
                s.style.gridRow = String(ligneGrille + 1);
                s.textContent = i === this.m.lignes.length - 1 ? '+' : '';
                g.appendChild(s);
            }
            ligneGrille++;
        });

        // L'addition finale.
        if (this.m.sommeAPoser) {
            this.traitPleineLargeur(ligneGrille++, L);
            if (this.phase === 'somme') this.rangeeRetenuesSomme(ligneGrille++, col);
            for (let p = 0; p < L; p++) {
                const fait = this.somme[p] !== undefined;
                const actif = this.phase === 'somme' && p === this.rangSomme;
                const virg = this.virgule === p;
                const el = this.caseA(col(p), ligneGrille, fait ? this.somme[p] : '',
                    (fait ? 'pl-case--ecrit' : '') + (actif ? ' pl-case--active' : '')
                    + (virg ? ' pl-case--virgule' : ''));
                if (fait) this.casesSomme[p] = el;
            }
            ligneGrille++;
        } else {
            // Une seule ligne de produit : c'est elle qui porte le résultat, et
            // donc la virgule. On retrouve ses cases pour y accrocher les fentes.
            const l = this.m.lignes[0];
            l.cases.forEach(c => {
                if (this.ecrits[0][c.position] === undefined) return;
                const el = [...this.grilleEl.querySelectorAll('.pl-case')].find(
                    x => Number(x.style.gridColumn) === col(c.position) + 1
                        && Number(x.style.gridRow) === ligneGrille);
                if (el) {
                    this.casesSomme[c.position] = el;
                    if (this.virgule === c.position) el.classList.add('pl-case--virgule');
                }
            });
        }

        if (this.phase === 'virgule') this.brancherFentes();
        this.dessinerCommandes();
    }

    ecrireNombre(texte, ligne, col, signe) {
        const chiffres = texte.split('').reverse();
        chiffres.forEach((c, p) => this.caseA(col(p), ligne, c, 'pl-case--donne'));
        const s = document.createElement('div');
        s.className = 'pl-signe';
        s.style.gridColumn = '1';
        s.style.gridRow = String(ligne + 1);
        s.textContent = signe;
        this.grilleEl.appendChild(s);
    }

    traitPleineLargeur(ligne, L) {
        const t = document.createElement('div');
        t.className = 'pl-trait';
        t.style.gridColumn = `1 / ${L + 2}`;
        t.style.gridRow = String(ligne + 1);
        this.grilleEl.appendChild(t);
    }

    /**
     * LA COLONNE À REMPLIR SE DÉDUIT DE CE QUI EST ÉCRIT — on ne la garde pas
     * dans un compteur à part.
     *
     * Le compteur, lui, se désynchronisait : quand une retenue restait à
     * poser, on n'avançait pas l'index tout en ayant déjà écrit le chiffre.
     * Le tour d'après, le jeu attendait un chiffre déjà écrit et refusait le
     * suivant — impasse silencieuse, sans la moindre erreur pour le dire.
     */
    get rangSomme() {
        let i = 0;
        while (this.somme[i] !== undefined) i++;
        return i;
    }

    /** La position à remplir dans la ligne courante : la première encore vide. */
    positionCourante() {
        const l = this.m.lignes[this.ligne];
        const c = l.cases.find(x => this.ecrits[this.ligne][x.position] === undefined);
        return c ? c.position : null;
    }

    rangeeRetenuesLigne(ligne, col) {
        const l = this.m.lignes[this.ligne];
        l.cases.forEach(c => {
            // On ne montre un rond que là où une retenue ENTRE : partout
            // ailleurs, ce serait un piège gratuit.
            if (!c.retenueEntrante) return;
            const cell = document.createElement('div');
            cell.className = 'pl-retenue';
            // LE ROND SE POSE AU-DESSUS DE SA PROPRE COLONNE. La case de la
            // position p vit à la colonne de grille col(p) + 1 ; écrire col(p)
            // décalait tous les ronds d'une colonne vers la droite, et la
            // retenue semblait appartenir au chiffre voisin.
            cell.style.gridColumn = String(col(c.position) + 1);
            cell.style.gridRow = String(ligne + 1);
            const val = this.retenues[this.ligne][c.position];
            const rond = document.createElement('button');
            rond.type = 'button';
            rond.className = 'pl-rond' + (val !== undefined ? ' pl-rond--plein' : '');
            rond.dataset.position = String(c.position);
            rond.textContent = val ?? '';
            rond.addEventListener('click', () => this.tournerRetenue(c.position));
            cell.appendChild(rond);
            this.grilleEl.appendChild(cell);
        });
    }

    rangeeRetenuesSomme(ligne, col) {
        this.tableauSomme.colonnes.forEach((c, p) => {
            if (!c.retenueEntrante && this.retSomme[p] === undefined) return;
            const cell = document.createElement('div');
            cell.className = 'pl-retenue';
            cell.style.gridColumn = String(col(p) + 1);
            cell.style.gridRow = String(ligne + 1);
            const rond = document.createElement('button');
            rond.type = 'button';
            rond.className = 'pl-rond' + (this.retSomme[p] !== undefined ? ' pl-rond--plein' : '');
            rond.dataset.position = String(p);
            rond.textContent = this.retSomme[p] ?? '';
            rond.addEventListener('click', () => {
                const suite = [undefined, 0, 1, 2];
                const i = suite.indexOf(this.retSomme[p]);
                this.retSomme[p] = suite[(i + 1) % suite.length];
                this.dessiner();
            });
            cell.appendChild(rond);
            this.grilleEl.appendChild(cell);
        });
    }

    tournerRetenue(position) {
        const suite = [undefined, 0, 1, 2, 3, 4, 5, 6, 7, 8];
        const i = suite.indexOf(this.retenues[this.ligne][position]);
        this.retenues[this.ligne][position] = suite[(i + 1) % suite.length];
        this.dessiner();
    }

    dessinerCommandes() {
        if (this.phase === 'virgule') {
            this.zoneEl.innerHTML = '';
            const [x, y] = this.m.operandes.map(v => String(v).replace('.', ','));
            this.note(`Le produit des entiers est écrit. ${x} a ${decimalesDe(this.m.operandes[0])} `
                + `décimale(s), ${y} en a ${decimalesDe(this.m.operandes[1])} : `
                + `le produit en a donc ${this.m.decimales}. Clique entre deux chiffres pour poser la virgule.`);
            return;
        }
        this.dessinerPave({
            avecValider: false, avecEffacer: true,
            surChiffre: (n) => this.taper(n),
            surEffacer: () => this.effacerDernier()
        });
        if (this.phase === 'lignes' && !this.noteEl.textContent) this.direLigne();
    }

    direLigne() {
        const l = this.m.lignes[this.ligne];
        const p = this.positionCourante();
        if (p === null) return;
        const c = l.cases.find(x => x.position === p);
        // `prefixe` porte ce que l'étape précédente avait à dire — l'annonce
        // d'une retenue, par exemple. Sans lui, la consigne de la case
        // suivante l'écrasait dans la milliseconde.
        const avant = this.prefixe || '';
        this.prefixe = '';
        this.note(avant + (c.chiffreA === null
            ? `Il ne reste plus que la retenue à écrire : ${c.retenueEntrante}.`
            : `${c.chiffreA} × ${l.chiffre}`
              + `${c.retenueEntrante ? ` + ${c.retenueEntrante} de retenue` : ''} : quel chiffre écris-tu ?`));
    }

    taper(n) {
        if (this.phase === 'lignes') return this.taperLigne(n);
        if (this.phase === 'somme') return this.taperSomme(n);
    }

    /**
     * REPRENDRE LE DERNIER CHIFFRE ÉCRIT.
     *
     * On efface, et rien d'autre : aucune faute n'est enregistrée, aucun point
     * n'est repris. Se raviser n'est pas se tromper — et une annulation qui
     * coûterait quelque chose n'apprendrait qu'à ne plus oser.
     *
     * La position courante se DÉDUIT de ce qui est écrit (`positionCourante`,
     * `rangSomme` la cherchent toutes deux) : il suffit donc de retirer la
     * dernière valeur pour que le curseur y revienne tout seul.
     */
    effacerDernier() {
        if (this.phase === 'somme') {
            const i = this.rangSomme - 1;
            if (i < 0) return this.remonterAuxLignes();
            delete this.somme[i];
            this.dessiner();
            this.note('Chiffre effacé : réécris-le.');
            return;
        }
        if (this.phase !== 'lignes') return;
        const l = this.m.lignes[this.ligne];
        const ecrites = l.cases.filter(c => this.ecrits[this.ligne][c.position] !== undefined);
        if (!ecrites.length) return;
        const derniere = ecrites[ecrites.length - 1];
        delete this.ecrits[this.ligne][derniere.position];
        this.fautes.delete(derniere.position);
        this.dessiner();
        this.direLigne();
    }

    /**
     * Le ⌫ sur la première colonne de la somme renvoie à la dernière ligne :
     * l'erreur qu'on veut reprendre est presque toujours là, et rester bloqué
     * au bord de l'addition ne mène nulle part.
     */
    remonterAuxLignes() {
        if (this.ligne === undefined || !this.m.lignes.length) return;
        this.phase = 'lignes';
        this.ligne = this.m.lignes.length - 1;
        const l = this.m.lignes[this.ligne];
        const derniere = l.cases[l.cases.length - 1];
        if (derniere) delete this.ecrits[this.ligne][derniere.position];
        this.dessiner();
        this.note('On revient à la dernière ligne : réécris son dernier chiffre.');
    }

    taperLigne(n) {
        const l = this.m.lignes[this.ligne];
        const p = this.positionCourante();
        if (p === null) return;
        const c = l.cases.find(x => x.position === p);
        // MODE « on vérifie à la fin » : le chiffre s'écrit, quel qu'il soit.
        // La ligne se relit au bout, et les colonnes fausses se montrent.
        if (!this.verifAuFil) {
            this.ecrits[this.ligne][p] = n;
            this.fautes.delete(p);
            if (this.positionCourante() === null) return this.finirLigne();
            this.dessiner();
            this.direLigne();
            return;
        }
        // LA RETENUE NE BARRE JAMAIS LA ROUTE. Rémy : « vraiment retenue
        // optionnelle ». Beaucoup d'élèves la tiennent de tête et n'écrivent
        // que le chiffre — c'est leur calcul qu'on corrige, pas leur brouillon.
        if (n !== c.chiffre) {
            this.faux();
            // ON DIT LA RÈGLE QUI A ÉTÉ RATÉE, pas le chiffre attendu.
            this.note(c.retenueEntrante
                ? `Non. La retenue s'ajoute APRÈS le produit : ${c.chiffreA} × ${l.chiffre} `
                  + `puis + ${c.retenueEntrante}. On n'ajoute pas la retenue au chiffre avant de multiplier.`
                : `Non : ${c.chiffreA} × ${l.chiffre}, et l'on écrit le chiffre des unités du résultat.`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMP_MULT,
                questionText: `${c.chiffreA} × ${l.chiffre}${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''}`,
                input: String(n), expected: String(c.chiffre),
                customMessage: `${c.chiffreA} × ${l.chiffre}`
                    + `${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''} = ${c.total}.`
            });
            return;
        }
        this.ecrits[this.ligne][p] = n;
        this.onCorrectAnswer(null, COMP_MULT, {
            questionText: `${c.chiffreA} × ${l.chiffre}${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''}`,
            expected: String(c.chiffre), given: String(c.chiffre), points: 2
        });

        // La retenue s'ANNONCE, elle ne se réclame pas.
        if (c.retenueSortante && this.retenues[this.ligne][c.position + 1] !== c.retenueSortante) {
            this.prefixe = `Bien. ${c.chiffreA} × ${l.chiffre}`
                + `${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''} = ${c.total} : `
                + `tu retiens ${c.retenueSortante} — dans le petit rond, ou dans ta tête. `;
        }
        if (this.positionCourante() === null) return this.finirLigne();
        this.dessiner();
        this.direLigne();
    }

    finirLigne() {
        const l = this.m.lignes[this.ligne];
        // LA RELECTURE. En mode « à la fin », c'est ici que la ligne se juge —
        // et l'on ne dit pas « c'est faux » : on dit QUELLES colonnes le sont,
        // avec le calcul de chacune. L'élève efface et recommence CES
        // colonnes-là, pas toute la ligne.
        if (!this.verifAuFil) {
            const fautes = l.cases.filter(c => this.ecrits[this.ligne][c.position] !== c.chiffre);
            if (fautes.length) {
                // Une ligne relue fausse compte comme une faute : le libre se
                // referme, et la multiplication suivante repart guidée.
                this.sansFaute = false;
                this.fautes = new Set(fautes.map(c => c.position));
                const dit = (c) => `${c.chiffreA} × ${l.chiffre}`
                    + `${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''} = ${c.total}`;
                this.note(`${fautes.length} colonne${fautes.length > 1 ? 's' : ''} à revoir : `
                    + fautes.map(dit).join(' ; ') + '. Les cases en rouge s\'effacent, réécris-les.', 'ko');
                this.onWrongAnswer(null, {
                    concept: COMP_MULT,
                    questionText: `Ligne ${this.m.entiers[0]} × ${l.chiffre}`,
                    input: 'ligne écrite', expected: 'ligne juste',
                    customMessage: fautes.map(dit).join(' ; ') + '.',
                    silencieux: true
                });
                this.dessiner();
                // Les chiffres fautifs restent VISIBLES un instant, en rouge :
                // c'est ce moment-là qui apprend. Puis leurs cases se vident.
                setTimeout(() => {
                    if (!this.isRunning) return;
                    fautes.forEach(c => { delete this.ecrits[this.ligne][c.position]; });
                    this.fautes.clear();
                    this.dessiner();
                    this.direLigne();
                }, 1600);
                return;
            }
            // Toute la ligne est juste : on crédite chaque colonne d'un coup.
            l.cases.forEach(c => this.onCorrectAnswer(null, COMP_MULT, {
                questionText: `${c.chiffreA} × ${l.chiffre}${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''}`,
                expected: String(c.chiffre), given: String(c.chiffre), points: 2
            }));
        }
        // LES RETENUES ÉCRITES NE SONT PAS CONTRÔLÉES : la ligne juste suffit,
        // c'est elle qu'on demande.
        if (this.ligne + 1 < this.m.lignes.length) {
            this.ligne++;
            const suivante = this.m.lignes[this.ligne];
            this.dessiner();
            this.note(`Ligne suivante : ${this.m.entiers[0]} × ${suivante.chiffre}. `
                + `Ce ${suivante.chiffre} vaut des ${suivante.decalage === 1 ? 'dizaines' : 'centaines'} : `
                + `on DÉCALE donc de ${suivante.decalage} colonne(s), c'est ce que marquent les points.`, 'ok');
            return;
        }
        if (this.m.sommeAPoser) {
            this.phase = 'somme';
            this.dessiner();
            this.note('Toutes les lignes sont écrites. On les additionne maintenant, '
                + 'colonne par colonne, en partant de la droite.', 'ok');
            return;
        }
        // Une seule ligne : elle EST le produit.
        this.somme = { ...this.ecrits[0] };
        this.versVirgule();
    }

    taperSomme(n) {
        const i = this.rangSomme;
        const c = this.tableauSomme.colonnes[i];
        if (!c) return;
        if (n !== c.resultat) {
            this.faux();
            this.note('Non. Additionne les chiffres de cette colonne, retenue comprise.', 'ko');
            this.onWrongAnswer(null, {
                concept: COMP_MULT,
                questionText: `Colonne ${i} de l'addition des lignes`,
                input: String(n), expected: String(c.resultat),
                customMessage: `${c.chiffres.filter(x => x !== null).join(' + ')}`
                    + `${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''} = ${c.total}.`
            });
            return;
        }
        this.somme[i] = n;
        if (this.rangSomme >= this.tableauSomme.colonnes.length) return this.versVirgule();
        const suite = this.tableauSomme.colonnes[this.rangSomme];
        this.dessiner();
        this.note(!suite.retenueEntrante ? ''
            : `Bien : ${c.total}. Tu retiens ${suite.retenueEntrante} — dans le rond, ou dans ta tête.`);
    }

    versVirgule() {
        if (!this.m.decimales) return this.gagne();
        this.phase = 'virgule';
        this.dessiner();
    }

    brancherFentes() {
        // UNE FENTE PAR INTERVALLE ENTRE DEUX CHIFFRES DU RÉSULTAT — et l'on
        // s'accroche aux cases du résultat retenues au dessin, jamais à « la
        // première case de cette colonne » : dans une multiplication à
        // plusieurs lignes, cette colonne en contient trois ou quatre, et la
        // virgule se serait posée sur un produit partiel.
        Object.entries(this.casesSomme).forEach(([p, el]) => {
            const position = Number(p);
            if (position === 0) return;              // pas de virgule au bout
            const f = document.createElement('div');
            f.className = 'pl-fente';
            f.addEventListener('click', () => this.poserVirgule(position));
            el.appendChild(f);
        });
    }

    poserVirgule(position) {
        // LA FENTE EST À DROITE DE LA CASE : poser en `p`, c'est laisser les
        // positions p−1 … 0 derrière la virgule, donc p décimales. Écrire
        // « décimales − 1 » validait 40,8 pour 4,08.
        const attendue = this.m.decimales;
        if (position !== attendue) {
            this.note(`Non. ${String(this.m.operandes[0]).replace('.', ',')} a `
                + `${decimalesDe(this.m.operandes[0])} décimale(s) et `
                + `${String(this.m.operandes[1]).replace('.', ',')} en a `
                + `${decimalesDe(this.m.operandes[1])} : le produit en a ${this.m.decimales}.`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMP_MULT,
                questionText: `Où se place la virgule dans ${this.enonce()} ?`,
                input: `après le rang ${position}`, expected: `${this.m.decimales} décimales`,
                customMessage: `On compte les décimales des DEUX facteurs et on les additionne : ${this.m.decimales}.`
            });
            return;
        }
        this.virgule = position;
        this.gagne();
    }

    gagne() {
        this.reussies++;
        const ouvre = this.ajusterRegime();
        this.dessiner();
        this.note(`✅ ${this.enonce()} = ${String(this.m.resultat).replace('.', ',')}`
            + (ouvre ? ' — sans une faute ! La prochaine, tu la poses en entier : '
                + 'écris toute la ligne, on la relira ensemble.' : ''), 'ok');
        this.onCorrectAnswer(null, COMP_MULT, {
            questionText: this.enonce(),
            expected: String(this.m.resultat), given: String(this.m.resultat),
            points: 10 + this.m.lignes.length * 5
        });
        setTimeout(() => { if (this.isRunning) this.poser(); }, 2200);
    }

    enonce() {
        return `${String(this.m.operandes[0]).replace('.', ',')} × ${String(this.m.operandes[1]).replace('.', ',')}`;
    }

    /**
     * LE LIBRE SE MÉRITE, ET SE REPERD.
     *
     * Une multiplication entière posée sans une faute ouvre la suivante en
     * libre ; une faute la referme. Ce n'est pas une punition : le guidage
     * colonne par colonne est le seul régime qui dise OÙ ça coince — « tu as
     * oublié le zéro de la deuxième ligne » plutôt que « c'est faux » —, et
     * c'est exactement ce dont on a besoin quand on vient de se tromper.
     *
     * @returns {boolean} vrai si le libre vient de s'ouvrir
     */
    ajusterRegime() {
        if (this.regime !== 'merite') return false;
        const avant = this.verifAuFil;
        this.verifAuFil = !this.sansFaute;
        this.sansFaute = true;
        return avant && !this.verifAuFil;
    }

    faux() {
        this.sansFaute = false;
        const el = this.grilleEl.querySelector('.pl-case--active');
        if (el) { el.classList.add('pl-case--faux'); setTimeout(() => this.dessiner(), 380); }
    }

    aider() {
        if (this.phase === 'virgule') {
            return this.note('On multiplie comme si les virgules n\'existaient pas, PUIS on les compte : '
                + 'le produit a autant de décimales que les deux facteurs réunis.');
        }
        if (this.phase === 'somme') {
            const c = this.tableauSomme.colonnes[this.rangSomme];
            if (!c) return this.note('');
            return this.note(`${c.chiffres.filter(x => x !== null).join(' + ')}`
                + `${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''} = ${c.total}.`);
        }
        const l = this.m.lignes[this.ligne];
        const p = this.positionCourante();
        const c = l.cases.find(x => x.position === p);
        if (!c) return this.note('');
        return this.note(c.chiffreA === null
            ? `Il ne reste que la retenue : on écrit ${c.retenueEntrante}.`
            : `${c.chiffreA} × ${l.chiffre} = ${c.chiffreA * l.chiffre}`
              + `${c.retenueEntrante ? `, plus ${c.retenueEntrante} de retenue, soit ${c.total}` : ''}. `
              + `On écrit ${c.chiffre}${c.retenueSortante ? ` et l'on retient ${c.retenueSortante}` : ''}.`);
    }

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        try {
            cur.protegerZone([this.grilleEl, this.zoneEl]);
            await gate.wait(500);
            cur.say('Une multiplication posée, c\'est une LIGNE par chiffre du multiplicateur — '
                + 'et chaque ligne se décale d\'un rang.', this.grilleEl);
            await gate.wait(3200);
            for (let i = 0; i < this.m.lignes.length && this.isRunning; i++) {
                this.ligne = i;
                const l = this.m.lignes[i];
                for (const c of l.cases) {
                    if (!this.isRunning) break;
                    this.ecrits[i][c.position] = c.chiffre;
                    if (c.retenueSortante) this.retenues[i][c.position + 1] = c.retenueSortante;
                    this.dessiner();
                    cur.say(c.chiffreA === null
                        ? `Et la dernière retenue : ${c.chiffre}.`
                        : `${c.chiffreA} × ${l.chiffre}`
                          + `${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''} = ${c.total}`
                          + `${c.retenueSortante ? `, je pose ${c.chiffre} et je retiens ${c.retenueSortante}` : ''}.`,
                    this.grilleEl);
                    await gate.wait(1800);
                }
            }
            cur.say('Puis on additionne les lignes — et la virgule se pose à la toute fin, '
                + 'en comptant les décimales des deux facteurs.', this.grilleEl);
            await gate.wait(3000);
        } catch (e) { /* démonstration coupée */ }
        cur.destroy(); gate.destroy();
        this.demoCursor = null; this.demoGate = null;
    }
}

const decimalesDe = (v) => {
    const s = String(v);
    const i = s.indexOf('.');
    return i < 0 ? 0 : s.length - i - 1;
};

// =====================================================================================
// LA DIVISION
// =====================================================================================

const COMP_DIV = 'num.div.quotient';

class PoserDivision extends PoserLongue {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'poser-division');
        this.chiffres = Math.max(2, Math.min(4, parseInt(this.params.chiffres) || 3));
        this.diviseurMax = Math.max(2, Math.min(99, parseInt(this.params.diviseurMax) || 9));
        this.decimalesMax = Math.max(0, Math.min(3, parseInt(this.params.decimalesQuotient) || 0));
    }

    poser() {
        for (let essai = 0; essai < 300; essai++) {
            const b = this.rng.int(2, this.diviseurMax);
            let a = this.rng.int(Math.pow(10, this.chiffres - 1), Math.pow(10, this.chiffres) - 1);
            // Une division « qui tombe juste » quand on ne demande pas de
            // décimales : sinon l'élève finit sur un reste dont il ne sait pas
            // quoi faire, et l'exercice se termine sur une hésitation.
            if (this.decimalesMax === 0 && this.params.exacte !== false) a = a - (a % b);
            if (a < b) continue;
            try { this.d = colonnesDivision(a, b, { decimalesMax: this.decimalesMax }); }
            catch (e) { continue; }
            // Au moins deux étapes écrites, sinon ce n'est pas une potence.
            if (this.d.etapes.filter(e => e.ecrit).length < 2) continue;
            break;
        }
        // ON NE COMMENCE PAS AU PREMIER CHIFFRE, mais au premier qui S'ÉCRIT.
        //
        // Pour 413 ÷ 7, on ne demande pas « combien de fois 7 dans 4 ? » pour
        // faire écrire un zéro : au tableau, on regarde le 4, on dit « ce
        // n'est pas possible », on prend 41 — et l'on n'écrit RIEN. Le jeu
        // posait la question, faisait taper 0, puis dessinait « − 0 » et son
        // reste sous le premier chiffre, et le zéro du quotient tombait à
        // gauche de la potence. Trois lignes fausses avant d'avoir commencé.
        this.debut = premierEcrit(this.d);
        this.etape = this.debut;
        this.attente = 'quotient';       // quotient → produit → reste
        this.saisie = '';
        this.faits = this.d.etapes.map(() => ({}));
        this.dessiner();
        return true;
    }

    /** Les rangs affichés, du plus fort au plus faible. */
    get rangs() { return this.d.etapes.map(e => e.rang); }

    dessiner() {
        const g = this.grilleEl;
        g.innerHTML = '';
        const rangs = this.rangs;
        const L = rangs.length;
        // Colonnes : les chiffres du dividende, puis la potence, puis le diviseur.
        const largeurDiviseur = String(this.d.operandes[1]).length;
        g.style.gridTemplateColumns = `auto repeat(${L}, auto) auto repeat(${largeurDiviseur}, auto)`;
        this.majScore();
        const e = this.d.etapes[this.etape];
        this.etapeEl.textContent = this.etape >= this.d.etapes.length
            ? 'Terminé'
            : { quotient: `① Combien de fois ${this.d.operandes[1]} dans ${e.courant} ?`,
                produit: `② ${this.d.operandes[1]} × ${this.faits[this.etape].chiffre} = ?`,
                reste: `③ ${e.courant} − ${e.produit} = ?` }[this.attente];

        const col = (i) => i + 2;                 // colonne de grille du i-ème rang
        const colPotence = L + 2;
        let ligne = 1;

        // Le dividende, chiffre par chiffre — et la virgule à sa place.
        //
        // LES ZÉROS QU'ON AJOUTE NE SONT PAS ÉCRITS D'AVANCE. Un quotient
        // décimal se poursuit en abaissant des zéros qu'on écrit AU MOMENT où
        // on les abaisse ; les afficher dès le départ montrerait « 756 00 » et
        // ferait croire que le dividende en est un autre.
        rangs.forEach((r, i) => {
            const surDividende = r >= this.d.rangVirgule;
            const visible = surDividende || i <= this.etape;
            const c = this.caseA(col(i) - 1, ligne - 1,
                visible ? String(this.d.etapes[i].chiffreAbaisse) : '', 'pl-case--donne');
            if (r === 0 && this.d.rangVirgule < 0) c.classList.add('pl-case--virgule');
            if (!surDividende) c.style.opacity = '.55';   // les zéros qu'on ajoute
        });
        // La potence : un trait vertical à droite du dividende, un horizontal
        // sous le diviseur.
        const barre = document.createElement('div');
        barre.className = 'pl-potence-v';
        barre.style.gridColumn = String(colPotence);
        barre.style.gridRow = `1 / ${Math.max(3, this.d.etapes.length * 2 + 2)}`;
        g.appendChild(barre);
        String(this.d.operandes[1]).split('').forEach((ch, k) => {
            this.caseA(colPotence + k, 0, ch, 'pl-case--donne');
        });
        const sous = document.createElement('div');
        sous.className = 'pl-potence-h';
        sous.style.gridColumn = `${colPotence + 1} / ${colPotence + 1 + largeurDiviseur}`;
        sous.style.gridRow = '2';
        g.appendChild(sous);

        // LE QUOTIENT, sous le diviseur — un chiffre par rang, à sa place.
        rangs.forEach((r, i) => {
            const et = this.d.etapes[i];
            if (!et.ecrit && this.faits[i].chiffre === undefined) return;
            const pose = this.faits[i].chiffre;
            const dedans = pose !== undefined;
            const c = this.caseA(colPotence + i - premierEcrit(this.d), 1,
                dedans ? pose : '', dedans ? 'pl-case--ecrit' : '');
            if (this.d.decimalesQuotient && r === 0) c.classList.add('pl-case--virgule');
            if (this.attente === 'quotient' && i === this.etape) c.classList.add('pl-case--active');
        });

        // Les étapes : le produit qu'on retranche, puis le reste.
        this.d.etapes.forEach((et, i) => {
            const f = this.faits[i];
            if (i > this.etape || i < this.debut) return;
            // Les lignes se serrent en haut : une étape sautée ne laisse pas
            // deux lignes vides derrière elle.
            const ligneProduit = ligne + (i - this.debut) * 2;
            const ligneReste = ligneProduit + 1;
            if (f.produit !== undefined || (i === this.etape && this.attente === 'produit')) {
                // ON ÉCRIT DANS LES CASES. Rémy : « ce serait bien de pouvoir
                // écrire directement dans les cases ». Les chiffres tapés
                // s'affichaient sur une bande à part, sous la potence, et la
                // case restait vide jusqu'à la validation : on posait une
                // division sans jamais voir la division se poser.
                const enCours = i === this.etape && this.attente === 'produit';
                const texte = f.produit !== undefined ? String(f.produit)
                    : (enCours ? (this.saisie || '') : '');
                this.poserNombre(texte, ligneProduit, col, i, et.produit, '−', enCours, enCours);
            }
            // LE TRAIT SE TIRE DÈS QUE LE PRODUIT EST POSÉ, pas au moment de
            // répondre le reste. Rémy : « tu oublies la barre sous le 5 − 4 ».
            // On voyait un 4 écrit sous un 5, sans rien entre les deux : la
            // soustraction à faire n'était pas signalée, elle était seulement
            // demandée par le texte. Sur le cahier, la barre se trace AVANT de
            // soustraire — c'est elle qui dit « ce qui suit est une
            // différence ».
            if (f.produit !== undefined) {
                const t = document.createElement('div');
                t.className = 'pl-trait';
                // LE TRAIT FAIT LA LARGEUR DE CE QU'ON RETRANCHE, pas celle de
                // tout le dividende : parti de la marge, il soulignait des
                // colonnes où il n'y avait rien à soustraire.
                const large = String(et.produit).length;
                t.style.gridColumn = `${Math.max(2, col(i) - large + 1)} / ${col(i) + 1}`;
                t.style.gridRow = String(ligneProduit + 1);
                t.style.alignSelf = 'end';
                g.appendChild(t);
            }
            if (f.reste !== undefined || (i === this.etape && this.attente === 'reste')) {
                const enCoursR = i === this.etape && this.attente === 'reste';
                const texte = f.reste !== undefined ? String(f.reste)
                    : (enCoursR ? (this.saisie || '') : '');
                this.poserNombre(texte, ligneReste, col, i, et.reste, '', enCoursR, enCoursR);
            }
        });

        this.dessinerCommandes();
    }

    /**
     * Écrit un nombre aligné à DROITE sur la colonne de l'étape i.
     *
     * SUR LA COLONNE, PAS À CÔTÉ. Le chiffre i du dividende est posé en
     * `col(i) − 1` ; écrire ici en `col(i)` décalait tout d'une colonne vers la
     * droite, et l'on voyait « 710 ÷ 2 » retrancher son 6 sous le 1 au lieu du
     * 7 — une potence dont les colonnes ne s'alignent plus n'enseigne rien,
     * elle apprend le contraire.
     */
    poserNombre(texte, ligne, col, i, attendu, signe, actif, enCours = false) {
        const n = Math.max(String(attendu).length, texte.length, 1);
        // PENDANT LA FRAPPE, ON REMPLIT DE GAUCHE À DROITE — c'est le sens dans
        // lequel on écrit un nombre sous une potence. Une fois le nombre validé
        // il retrouve son alignement à droite ; comme il a alors exactement la
        // largeur attendue, les deux coïncident.
        const chiffres = (enCours ? (texte || '').padEnd(n, ' ') : (texte || '').padStart(n, ' ')).split('');
        chiffres.forEach((ch, k) => {
            // La case ACTIVE est celle qu'on est en train de remplir : la
            // première encore vide, et non toute la ligne.
            const cetteCase = actif && k === (texte || '').length;
            const c = this.caseA(col(i) - 1 - (n - 1 - k), ligne, ch.trim(),
                (ch.trim() ? 'pl-case--ecrit' : '') + (cetteCase ? ' pl-case--active' : ''));
            if (actif && !ch.trim()) c.textContent = '';
        });
        if (signe) {
            const s = document.createElement('div');
            s.className = 'pl-signe';
            // Juste à gauche du nombre : celui-ci occupe les colonnes de
            // grille col(i) − n + 1 à col(i), le signe prend la précédente.
            s.style.gridColumn = String(Math.max(1, col(i) - n));
            s.style.gridRow = String(ligne + 1);
            s.textContent = signe;
            this.grilleEl.appendChild(s);
        }
    }

    dessinerCommandes() {
        if (this.etape >= this.d.etapes.length) { this.zoneEl.innerHTML = ''; return; }
        // Le chiffre du quotient est UNIQUE : il se valide tout seul. Le produit
        // et le reste peuvent avoir plusieurs chiffres, d'où le ✓.
        const seul = this.attente === 'quotient';
        this.dessinerPave({
            avecValider: !seul,
            surChiffre: (n) => {
                if (seul) return this.repondre(String(n));
                // On ne dépasse pas la largeur attendue : au-delà, le nombre
                // sortirait de sa colonne et l'alignement, qui EST la leçon de
                // la potence, ne voudrait plus rien dire.
                const large = String(this.attente === 'produit'
                    ? this.d.etapes[this.etape].produit
                    : this.d.etapes[this.etape].reste).length;
                if ((this.saisie || '').length >= large) return;
                this.saisie = (this.saisie || '') + String(n);
                this.dessiner();
            },
            surValider: () => this.repondre(this.saisie)
        });
    }

    repondre(texte) {
        if (texte === '' || texte === null) return;
        const n = Number(texte);
        const e = this.d.etapes[this.etape];
        const f = this.faits[this.etape];

        if (this.attente === 'quotient') {
            if (n !== e.chiffre) {
                this.faux();
                this.note(n > e.chiffre
                    ? `Trop : ${this.d.operandes[1]} × ${n} = ${this.d.operandes[1] * n}, `
                      + `et c'est plus grand que ${e.courant}.`
                    : `Pas assez : il reste plus que ${this.d.operandes[1]} après avoir retiré `
                      + `${this.d.operandes[1]} × ${n}. On peut en mettre davantage.`, 'ko');
                this.onWrongAnswer(null, {
                    concept: COMP_DIV,
                    questionText: `Combien de fois ${this.d.operandes[1]} dans ${e.courant} ?`,
                    input: texte, expected: String(e.chiffre),
                    customMessage: `${this.d.operandes[1]} × ${e.chiffre} = ${e.produit}, `
                        + `et ${e.produit} ≤ ${e.courant} < ${e.produit + this.d.operandes[1]}.`
                });
                return;
            }
            f.chiffre = n;
            this.onCorrectAnswer(null, COMP_DIV, {
                questionText: `Combien de fois ${this.d.operandes[1]} dans ${e.courant} ?`,
                expected: String(n), given: String(n), points: 3
            });
            this.attente = 'produit';
            this.saisie = '';
            this.dessiner();
            this.note(`Bien. Maintenant on écrit ce qu'on retire : `
                + `${this.d.operandes[1]} × ${n}.`);
            return;
        }

        if (this.attente === 'produit') {
            if (n !== e.produit) {
                this.faux();
                this.note(`Non : on retire ${this.d.operandes[1]} × ${f.chiffre}.`, 'ko');
                this.onWrongAnswer(null, {
                    concept: COMP_DIV,
                    questionText: `${this.d.operandes[1]} × ${f.chiffre}`,
                    input: texte, expected: String(e.produit),
                    customMessage: `${this.d.operandes[1]} × ${f.chiffre} = ${e.produit}.`
                });
                this.saisie = '';
                this.dessiner();
                return;
            }
            f.produit = n;
            this.attente = 'reste';
            this.saisie = '';
            this.dessiner();
            this.note(`On soustrait : ${e.courant} − ${e.produit}.`);
            return;
        }

        // Le reste.
        if (n !== e.reste) {
            this.faux();
            this.note(n >= this.d.operandes[1]
                ? `Ce reste est plus grand que ${this.d.operandes[1]} : c'est le signe que le `
                  + 'chiffre du quotient était trop petit. Recompte la soustraction.'
                : `Non : ${e.courant} − ${e.produit}.`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMP_DIV,
                questionText: `${e.courant} − ${e.produit}`,
                input: texte, expected: String(e.reste),
                customMessage: `${e.courant} − ${e.produit} = ${e.reste}, et un reste est TOUJOURS `
                    + `plus petit que le diviseur (${this.d.operandes[1]}).`
            });
            this.saisie = '';
            this.dessiner();
            return;
        }
        f.reste = n;
        this.onCorrectAnswer(null, COMP_DIV, {
            questionText: `${e.courant} − ${e.produit}`,
            expected: String(n), given: String(n), points: 2
        });
        this.etape++;
        this.attente = 'quotient';
        this.saisie = '';
        if (this.etape >= this.d.etapes.length) return this.gagne();
        this.dessiner();
        const suivante = this.d.etapes[this.etape];
        this.note(`On abaisse le chiffre suivant : ${suivante.avant} et ${suivante.chiffreAbaisse} `
            + `font ${suivante.courant}.`
            + (suivante.apresVirgule && !this.d.etapes[this.etape - 1].apresVirgule
                ? ' On passe la virgule du dividende : on la pose aussi au quotient.' : ''));
    }

    gagne() {
        this.reussies++;
        this.dessiner();
        const q = String(this.d.quotient).replace('.', ',');
        this.note(`✅ ${this.d.operandes[0]} ÷ ${this.d.operandes[1]} = ${q}`
            + (this.d.exacte ? '' : `, reste ${String(this.d.reste).replace('.', ',')}`)
            + '.', 'ok');
        this.onCorrectAnswer(null, COMP_DIV, {
            questionText: `${this.d.operandes[0]} ÷ ${this.d.operandes[1]}`,
            expected: q, given: q, points: 10 + this.d.etapes.length * 3
        });
        setTimeout(() => { if (this.isRunning) this.poser(); }, 2400);
    }

    faux() {
        const el = this.grilleEl.querySelector('.pl-case--active');
        if (el) { el.classList.add('pl-case--faux'); setTimeout(() => this.dessiner(), 380); }
    }

    aider() {
        const e = this.d.etapes[this.etape];
        if (!e) return this.note('');
        if (this.attente === 'quotient') {
            return this.note(`Cherche dans la table de ${this.d.operandes[1]} le plus grand produit `
                + `qui ne dépasse pas ${e.courant}. Le reste devra être plus petit que `
                + `${this.d.operandes[1]} : c'est la vérification.`);
        }
        if (this.attente === 'produit') {
            return this.note(`${this.d.operandes[1]} × ${this.faits[this.etape].chiffre} = ${e.produit}.`);
        }
        return this.note(`${e.courant} − ${e.produit} = ${e.reste}.`);
    }

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        try {
            cur.protegerZone([this.grilleEl, this.zoneEl]);
            await gate.wait(500);
            cur.say('Une division posée, c\'est toujours la même étape recommencée : j\'abaisse, '
                + 'je cherche combien de fois, je multiplie, je soustrais.', this.grilleEl);
            await gate.wait(3400);
            for (let i = this.debut; i < this.d.etapes.length && this.isRunning; i++) {
                const e = this.d.etapes[i];
                this.etape = i;
                this.faits[i] = { chiffre: e.chiffre, produit: e.produit, reste: e.reste };
                this.attente = 'reste';
                this.dessiner();
                cur.say(`${this.d.operandes[1]} dans ${e.courant} : ${e.chiffre} fois. `
                    + `${this.d.operandes[1]} × ${e.chiffre} = ${e.produit}, `
                    + `et ${e.courant} − ${e.produit} = ${e.reste}.`, this.grilleEl);
                await gate.wait(2600);
            }
            this.etape = this.d.etapes.length;
            this.dessiner();
            cur.say('Et le reste est toujours plus petit que le diviseur : c\'est la vérification '
                + 'qui ne trompe pas.', this.grilleEl);
            await gate.wait(3000);
        } catch (e) { /* démonstration coupée */ }
        cur.destroy(); gate.destroy();
        this.demoCursor = null; this.demoGate = null;
    }
}

/** Le rang du premier chiffre ÉCRIT du quotient — les zéros de tête n'en sont pas. */
function premierEcrit(d) {
    const i = d.etapes.findIndex(e => e.ecrit);
    return i < 0 ? 0 : i;
}

export function enginePoserMultiplication(container, isDemo, params) {
    const jeu = new PoserMultiplication(container, isDemo, params);
    jeu.start();
    return jeu;
}

export function enginePoserDivision(container, isDemo, params) {
    const jeu = new PoserDivision(container, isDemo, params);
    jeu.start();
    return jeu;
}
