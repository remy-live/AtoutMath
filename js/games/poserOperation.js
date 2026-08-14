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
    premierRang, rangSuivant, decimales, chiffreAuRang, rangsDe
} from '../core/poser.js';

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
        if (this.operation === '+') this.rangeeRetenues(rangs, 'haut');

        this.operandes.forEach((v, i) => {
            const signe = document.createElement('div');
            signe.className = 'po-signe';
            signe.textContent = i === this.operandes.length - 1 ? SIGNES[this.operation] : '';
            g.appendChild(signe);
            rangs.forEach(r => g.appendChild(this.caseOperande(i, r)));
        });

        // La rangée des retenues du BAS, pour la soustraction : elles se notent
        // contre le chiffre du soustracteur.
        if (this.operation === '-') this.rangeeRetenues(rangs, 'bas');

        const trait = document.createElement('div');
        trait.className = 'po-trait';
        g.appendChild(trait);

        const vide = document.createElement('div');
        g.appendChild(vide);
        rangs.forEach(r => g.appendChild(this.caseResultat(r)));
    }

    rangeeRetenues(rangs, ou) {
        const g = this.grilleEl;
        const vide = document.createElement('div');
        g.appendChild(vide);
        rangs.forEach(r => {
            const cell = document.createElement('div');
            cell.className = 'po-retenue';
            // Une retenue ne se note que là où il peut y en avoir une.
            const attendue = attenduEn(this.tableau, r, 'retenue');
            if (this.etape === 2 && attendue !== null) {
                const rond = document.createElement('button');
                rond.type = 'button';
                rond.className = 'po-rond' + (this.retenues[r] ? ' po-rond--plein' : '');
                rond.textContent = this.retenues[r] ?? '';
                rond.dataset.rang = r;
                rond.dataset.ou = ou;
                rond.addEventListener('click', () => this.tournerRetenue(r));
                cell.appendChild(rond);
            }
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
        this.note('Fais glisser chaque chiffre dans SA colonne. Les unités sous les unités, '
            + 'les dixièmes sous les dixièmes.');
        this.attendu.forEach((att, i) => {
            const ligne = document.createElement('div');
            ligne.className = 'po-ligne-jetons';
            const b = document.createElement('b');
            b.textContent = `${String(att.valeur).replace('.', ',')} :`;
            ligne.appendChild(b);
            att.chiffres.forEach(c => {
                const j = document.createElement('div');
                j.className = 'po-jeton';
                j.textContent = c.chiffre;
                j.hidden = this.pose[i].some(m => m.rang === c.rang && m.chiffre === c.chiffre);
                j.addEventListener('pointerdown', (ev) => this.prendreJeton(ev, i, c));
                ligne.appendChild(j);
            });
            this.zoneEl.appendChild(ligne);
        });
    }

    prendreJeton(ev, operande, chiffre) {
        ev.preventDefault();
        const finir = (e) => {
            const cible = document.elementFromPoint(e.clientX, e.clientY);
            const c = cible && cible.closest('[data-operande]');
            if (!c) return;
            if (Number(c.dataset.operande) !== operande) {
                this.note('Ce chiffre appartient à l\'autre nombre : chaque ligne a la sienne.', 'ko');
                return;
            }
            const rang = Number(c.dataset.rang);
            if (rang !== chiffre.rang) {
                c.classList.add('po-case--faux');
                const ecart = rang - chiffre.rang;
                this.note(`Non : ce chiffre vaut des ${this.nomRang(chiffre.rang)}, tu l'as mis `
                    + `dans les ${this.nomRang(rang)} — décalé de ${Math.abs(ecart)} colonne(s).`, 'ko');
                setTimeout(() => this.dessiner(), 380);
                return;
            }
            this.pose[operande].push({ rang, chiffre: chiffre.chiffre });
            const v = verifierPlacement(this.operandes, this.pose);
            if (v.ok) {
                this.etape = 2;
                this.rangCourant = premierRang(this.tableau);
                this.note('✅ Bien aligné. Maintenant on calcule, en partant de la droite.', 'ok');
                this.onCorrectAnswer(null, COMPETENCE, {
                    questionText: `Aligner ${this.operandes.map(x => String(x).replace('.', ',')).join(` ${this.operation} `)}`,
                    expected: 'aligné sur la virgule', given: 'juste', points: 8
                });
            }
            this.dessiner();
        };
        document.addEventListener('pointerup', finir, { once: true });
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
            await gate.wait(3000 * DEMO_SPEED);
            this.pose = this.attendu.map(a => a.chiffres.map(c => ({ rang: c.rang, chiffre: c.chiffre })));
            this.etape = 2;
            this.rangCourant = premierRang(this.tableau);
            this.dessiner();
            await gate.wait(1000 * DEMO_SPEED);

            for (const c of this.tableau.colonnes) {
                if (!this.isRunning) break;
                cur.say(this.operation === '+'
                    ? `${c.chiffres.filter(x => x !== null).join(' + ')}`
                        + `${c.retenueEntrante ? ` + ${c.retenueEntrante}` : ''} = ${c.total} : j'écris ${c.resultat}`
                        + `${c.retenueSortante ? `, je retiens ${c.retenueSortante}` : ''}.`
                    : `Colonne des ${this.nomRang(c.rang)} : ${c.resultat}`
                        + `${c.emprunte ? ' — j\'ai ajouté dix en haut, et un en bas à la colonne suivante.' : '.'}`,
                this.grilleEl);
                await gate.wait(2500 * DEMO_SPEED);
                this.resultats[c.rang] = c.resultat;
                const s = rangSuivant(this.tableau, c.rang);
                if (s !== null) {
                    const a = attenduEn(this.tableau, s, 'retenue');
                    if (a) this.retenues[s] = a;
                }
                this.rangCourant = s;
                this.dessiner();
                await gate.wait(700 * DEMO_SPEED);
            }
            cur.say('Et les retenues restent ÉCRITES : en contrôle, elles se voient.', this.grilleEl);
            await gate.wait(2800 * DEMO_SPEED);
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
