// LE TABLEAU À DOUBLE ENTRÉE — à l'écran.
//
// Le noyau (core/tableauCroise.js) tire l'énoncé, le tableau et les trous, et
// garantit qu'ils se remplissent par propagation. Ici on dessine et l'on écoute.
//
// QUATRE PARTIS PRIS.
//
//   · UNE CASE JUSTE SE VERROUILLE. Sur le papier, une valeur trouvée sert
//     d'appui pour la suivante — mais si elle était fausse, tout ce qui suit
//     l'est aussi, et l'élève ne le découvre qu'à la fin. À l'écran, la case
//     juste se ferme en vert : ce qui est écrit est vrai, et l'on peut s'y
//     appuyer sans arrière-pensée. C'est la différence essentielle avec la
//     feuille, et elle vaut d'être prise.
//
//   · L'AIDE DÉSIGNE LA LIGNE, JAMAIS LE NOMBRE. C'est l'astuce imprimée sous
//     la fiche de Rémy — « trouve la ligne ou la colonne où il ne manque qu'une
//     seule information » —, et elle EST la méthode. La donner comme conseil
//     apprend à chercher ; donner le nombre n'apprend rien.
//
//   · UN PAVÉ POUR ÉCRIRE, PAS UNE CALCULATRICE. Rémy avait d'abord demandé
//     « l'utilisation pour le début de la calculatrice », puis, au banc
//     d'essai : « n'en crée pas une, rajoute des boutons pour écrire les
//     valeurs numériques ». Il a raison — l'application a déjà sa calculatrice
//     en accès permanent, et ce qui manquait ici n'était pas de calculer mais
//     d'ÉCRIRE, sur une tablette sans clavier. Le pavé écrit dans la case
//     active ; il disparaît au dernier palier, quand on veut que l'addition en
//     colonne se fasse seule.
//
//   · LE TABLEAU ENTIER COMPTE POUR UNE QUESTION. Neuf cases, c'est un exercice,
//     pas neuf. Chaque case juste est enregistrée pour le carnet d'erreurs —
//     c'est bien une soustraction réussie — mais en `partiel` : c'est le
//     TABLEAU fini qui fait avancer le compteur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    PALIERS, genererTableau, estDonnee, cle, estTotalLigne, consigneDe,
    estTotalColonne, prochaineLigne, conseil, nomDeLigne, nomDeColonne, totalGeneral
} from '../core/tableauCroise.js';

const COMPETENCE = 'don.tableau.croise';

class TableauCroise extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'tableau-croise');
        this.rng = makeRng(this.params.seed);
        this.palier = PALIERS[this.params.palier] ? this.params.palier : 'facile';
        // D'OÙ VIENNENT LES NOMBRES. « tableau » : ils sont déjà écrits, il
        // n'y a qu'à compléter. « enonce » : ils sont dits en toutes lettres et
        // le tableau part vide — c'est l'exercice que Rémy a demandé, et le
        // travail commence une étape plus tôt, au rangement.
        this.depart = this.params.depart === 'enonce' ? 'enonce' : 'tableau';
        this.saisies = {};
        this.actif = null;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .tc-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 10px 12px 12px; box-sizing: border-box;
                    color: var(--text-main); overflow-y: auto; container-type: inline-size;
                    min-height: 0;
                }
                .tc-enonce {
                    text-align: center; max-width: 640px; flex: 0 0 auto;
                    font-size: clamp(12px, 3cqw, 15px); line-height: 1.4;
                }
                .tc-enonce b { font-weight: 800; }
                .tc-corps {
                    display: flex; gap: 14px; align-items: flex-start; justify-content: center;
                    flex-wrap: wrap; width: 100%;
                }

                .tc-table { border-collapse: collapse; font-size: clamp(12px, 2.9cqw, 16px); }
                .tc-table th, .tc-table td {
                    border: 1px solid var(--border); padding: 4px 6px; text-align: center;
                    min-width: 3.4em; height: 2.4em;
                }
                .tc-table th { font-weight: 800; background: var(--bg-hover); }
                /* La ligne et la colonne des totaux se voient : ce sont elles
                   qu'on boucle, et l'élève doit les repérer d'un coup d'œil. */
                .tc-total { background: color-mix(in srgb, var(--primary) 9%, var(--bg-panel)); font-weight: 800; }
                .tc-coin { background: color-mix(in srgb, var(--primary) 16%, var(--bg-panel)); font-weight: 900; }
                .tc-tete-ligne { text-align: left; white-space: nowrap; }

                .tc-case {
                    width: 100%; box-sizing: border-box; border: none; background: transparent;
                    font: inherit; font-weight: 800; text-align: center; color: var(--text-main);
                    padding: 2px; min-width: 3em; -moz-appearance: textfield;
                }
                .tc-case::-webkit-outer-spin-button, .tc-case::-webkit-inner-spin-button {
                    -webkit-appearance: none; margin: 0;
                }
                .tc-case:focus { outline: 2px solid var(--primary); outline-offset: -2px; border-radius: 4px; }
                td:has(> .tc-case) { background: color-mix(in srgb, var(--warning) 12%, var(--bg-panel)); }
                td.tc-juste { background: color-mix(in srgb, var(--success) 20%, var(--bg-panel)); }
                td.tc-faux { background: color-mix(in srgb, var(--danger) 18%, var(--bg-panel)); }
                td.tc-vise { outline: 2px dashed var(--primary); outline-offset: -2px; }

                /* --- Le pavé numérique --- */
                .tc-calc {
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;
                    width: 168px; flex: 0 0 auto;
                }
                .tc-calc-titre {
                    grid-column: 1 / -1; text-align: center; font-size: .75rem;
                    color: var(--text-muted); font-weight: 700;
                }
                .tc-touche {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 8px; cursor: pointer; font: inherit; font-weight: 800;
                    font-size: 1.05rem; padding: 9px 0; min-height: 40px;
                }
                .tc-touche:active { background: var(--bg-hover); }
                .tc-touche--eff { color: var(--danger); font-size: .95rem; }
                .tc-touche--ok { color: var(--success); font-size: .95rem; }

                .tc-barre { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; flex: 0 0 auto; }
                .tc-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 12px; font-size: .85rem; min-height: 38px;
                }
                .tc-note {
                    min-height: 2.4em; text-align: center; font-size: .85rem; line-height: 1.35;
                    color: var(--text-muted); max-width: 640px; flex: 0 0 auto;
                }
                .tc-note--ok { color: var(--success); font-weight: 700; }
                .tc-note--ko { color: var(--danger); font-weight: 600; }

                /* LA LISTE DES DONNÉES DE L'ÉNONCÉ. Deux colonnes dès qu'il y
                   a la place : douze puces en file indienne repoussaient le
                   tableau hors de l'écran. */
                .tc-faits {
                    margin: 8px auto 0; padding: 0 0 0 18px; text-align: left;
                    max-width: 620px; columns: 2; column-gap: 22px;
                    font-size: .88rem; line-height: 1.5;
                }
                .tc-faits li { break-inside: avoid; margin-bottom: 2px; }
                /* Rangée : barrée et pâlie. On la garde à l'écran — c'est une
                   donnée du problème, on peut avoir à la relire. */
                .tc-fait--pose { text-decoration: line-through; opacity: .45; }
                @container (max-width: 620px) { .tc-faits { columns: 1; font-size: .82rem; } }

                /* Sur un téléphone, la calculatrice passe SOUS le tableau :
                   côte à côte, le tableau se serrerait jusqu'à l'illisible. */
                @container (max-width: 620px) {
                    .tc-corps { flex-direction: column; align-items: center; }
                    .tc-calc { width: min(260px, 100%); grid-template-columns: repeat(4, 1fr); }
                    .tc-table { font-size: clamp(11px, 3.4cqw, 15px); }
                    .tc-table th, .tc-table td { padding: 3px 4px; min-width: 2.9em; }
                }
            </style>
            <div class="tc-wrap">
                <div class="tc-enonce" data-enonce></div>
                <div class="tc-corps">
                    <div data-table></div>
                    <div class="tc-calc" data-calc hidden></div>
                </div>
                <div class="tc-barre">
                    <button type="button" class="tc-btn" data-aide>💡 Aide-moi</button>
                    <button type="button" class="tc-btn" data-effacer>↺ Recommencer</button>
                    <button type="button" class="tc-btn" data-neuf>Autre tableau</button>
                </div>
                <div class="tc-note" data-note></div>
            </div>`;

        this.enonceEl = this.container.querySelector('[data-enonce]');
        this.tableEl = this.container.querySelector('[data-table]');
        this.calcEl = this.container.querySelector('[data-calc]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-aide]').onclick = () => this.aider();
        this.container.querySelector('[data-effacer]').onclick = () => this.effacer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
    }

    startGameLoop() { this.poser(); }

    poser() {
        this.tableau = genererTableau({ rng: this.rng, palier: this.palier, depart: this.depart });
        if (!this.tableau) return false;
        this.saisies = {};
        this.fini = false;
        this.dessiner();
        this.note(consigneDe(this.tableau));
        return true;
    }

    showNext() { return this.poser(); }

    effacer() {
        if (this.isDemo || !this.tableau) return;
        this.saisies = {};
        this.fini = false;
        this.dessiner();
        this.note('');
    }

    // --- Le dessin ----------------------------------------------------------

    dessiner() {
        const t = this.tableau;
        // L'ÉNONCÉ PORTE LES DONNÉES, quand elles n'ont pas été écrites dans le
        // tableau. Une LISTE, et non un paragraphe : douze faits dans une seule
        // phrase à rallonge, on en perd la moitié en cours de route — et l'on
        // veut pouvoir cocher mentalement ce qu'on a déjà reporté.
        const faits = (t.depart === 'enonce' && t.donnees)
            ? `<ul class="tc-faits">${t.donnees.map(d => {
                const pose = Number(this.saisies[cle(d.r, d.c)]) === d.valeur;
                // La puce ouvre une phrase : elle prend la majuscule. Dans la
                // fiche imprimée les mêmes faits s'enchaînent après « On sait
                // que : », et y restent en minuscules — c'est la même règle.
                const dit = d.phrase.charAt(0).toUpperCase() + d.phrase.slice(1);
                return `<li class="${pose ? 'tc-fait--pose' : ''}">${echapper(dit)}</li>`;
            }).join('')}</ul>`
            : '';
        this.enonceEl.innerHTML = `<b>${echapper(t.titre)}</b><br>${echapper(t.phrase)} `
            + (t.depart === 'enonce'
                ? 'Reporte ces informations dans le tableau, puis complète-le.'
                : 'Complète les valeurs manquantes.')
            + faits;

        let html = '<table class="tc-table"><thead><tr><th></th>';
        t.colonnes.forEach(c => { html += `<th>${echapper(c)}</th>`; });
        html += '<th class="tc-total">Total</th></tr></thead><tbody>';
        for (let r = 0; r <= t.R; r++) {
            const totalL = estTotalLigne(t, r);
            html += `<tr><th class="tc-tete-ligne${totalL ? ' tc-total' : ''}">`
                + `${totalL ? 'Total' : echapper(t.lignes[r])}</th>`;
            for (let c = 0; c <= t.C; c++) {
                const totalC = estTotalColonne(t, c);
                const classes = [];
                if (totalL || totalC) classes.push(totalL && totalC ? 'tc-coin' : 'tc-total');
                if (estDonnee(t, r, c)) {
                    html += `<td class="${classes.join(' ')}">${t.valeurs[r][c]}</td>`;
                    continue;
                }
                const saisie = this.saisies[cle(r, c)];
                const juste = saisie !== undefined && Number(saisie) === t.valeurs[r][c];
                const faux = saisie !== undefined && saisie !== '' && !juste;
                if (juste) classes.push('tc-juste');
                else if (faux) classes.push('tc-faux');
                html += `<td class="${classes.join(' ')}" data-cell="${r},${c}">`
                    + `<input class="tc-case" type="number" inputmode="numeric"
                        data-r="${r}" data-c="${c}" value="${saisie === undefined ? '' : saisie}"
                        ${juste ? 'readonly' : ''} aria-label="${echapper(this.nomDeCase(r, c))}"></td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        this.tableEl.innerHTML = html;
        this.brancherCases();
        this.dessinerPave();
    }

    nomDeCase(r, c) {
        const t = this.tableau;
        const l = estTotalLigne(t, r) ? 'Total' : t.lignes[r];
        const k = estTotalColonne(t, c) ? 'Total' : t.colonnes[c];
        return `${l}, ${k}`;
    }

    brancherCases() {
        if (this.isDemo) return;
        this.tableEl.querySelectorAll('.tc-case').forEach(el => {
            // On valide à la sortie du champ et sur Entrée, jamais à la frappe :
            // « 4 » en route vers « 42 » n'est pas une erreur, et la compter
            // en serait une.
            el.onblur = () => this.valider(el);
            el.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
            // La case ACTIVE, celle où le pavé numérique écrit.
            el.onfocus = () => { this.actif = { r: Number(el.dataset.r), c: Number(el.dataset.c) }; };
        });
    }

    /** Le champ de la case active, ou le premier champ libre s'il n'y en a pas. */
    champActif() {
        const cible = this.actif
            && this.tableEl.querySelector(`.tc-case[data-r="${this.actif.r}"][data-c="${this.actif.c}"]`);
        if (cible && !cible.hasAttribute('readonly')) return cible;
        return this.tableEl.querySelector('.tc-case:not([readonly])');
    }

    /**
     * ON NE REDESSINE QUE LA CASE, PAS TOUT LE TABLEAU.
     *
     * Rémy, banc d'essai : « à l'ordinateur, je ne peux pas taper les valeurs ».
     * Mesuré : on pouvait en taper UNE. La validation se faisait à la sortie du
     * champ et redessinait la table entière — donc, au moment précis où l'élève
     * cliquait sur la case suivante, l'élément visé était détruit et le clic
     * tombait dans le vide. Une seule valeur passait, et le tableau semblait
     * refuser le clavier.
     */
    majCase(r, c) {
        const td = this.tableEl.querySelector(`[data-cell="${r},${c}"]`);
        if (!td) return;
        const saisie = this.saisies[cle(r, c)];
        const juste = saisie !== undefined && Number(saisie) === this.tableau.valeurs[r][c];
        const faux = saisie !== undefined && saisie !== '' && !juste;
        td.classList.toggle('tc-juste', juste);
        td.classList.toggle('tc-faux', faux);
        const champ = td.querySelector('.tc-case');
        if (champ) {
            champ.value = saisie === undefined ? '' : saisie;
            // Une case juste se ferme : ce qui est écrit est vrai, on peut
            // s'appuyer dessus sans arrière-pensée.
            if (juste) champ.setAttribute('readonly', 'readonly');
            else champ.removeAttribute('readonly');
        }
        this.majFaits();
    }

    /**
     * LA PHRASE RANGÉE SE BARRE. Sur douze faits à reporter, on perd le fil de
     * ce qu'on a déjà placé et l'on recommence deux fois le même — c'est ce que
     * fait n'importe qui devant une liste, et c'est pour cela qu'on coche.
     */
    majFaits() {
        const t = this.tableau;
        if (!t || t.depart !== 'enonce' || !t.donnees) return;
        const items = this.enonceEl.querySelectorAll('.tc-faits li');
        t.donnees.forEach((d, i) => {
            if (!items[i]) return;
            items[i].classList.toggle('tc-fait--pose',
                Number(this.saisies[cle(d.r, d.c)]) === d.valeur);
        });
    }

    valider(el) {
        if (this.isDemo || this.fini) return;
        const r = Number(el.dataset.r), c = Number(el.dataset.c);
        const brut = (el.value || '').trim();
        if (brut === '') { delete this.saisies[cle(r, c)]; this.majCase(r, c); return; }
        const n = Number(brut);
        const attendu = this.tableau.valeurs[r][c];
        this.saisies[cle(r, c)] = brut;
        if (n === attendu) {
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `${this.tableau.titre} — case « ${this.nomDeCase(r, c)} »`,
                expected: String(attendu), given: brut, points: 6,
                // Une case n'est pas une question : c'est le TABLEAU fini qui
                // fait avancer le compteur.
                partiel: true
            });
            this.majCase(r, c);
            // Une case juste ouvre la suivante : on enchaîne sur le conseil
            // plutôt que sur un « bravo » qui n'apprend rien.
            if (this.reste()) this.note(conseil(this.tableau, this.saisies));
            else this.gagner();
            return;
        }
        this.onWrongAnswer(null, {
            concept: COMPETENCE,
            questionText: `${this.tableau.titre} — case « ${this.nomDeCase(r, c)} »`,
            input: brut, expected: String(attendu), partiel: true, silencieux: true
        });
        this.majCase(r, c);
        this.note(this.pourquoiFaux(r, c, n), 'ko');
    }

    /**
     * DIRE POURQUOI, PAS SEULEMENT QUE C'EST FAUX. L'erreur de cet exercice est
     * presque toujours la même : on a additionné là où il fallait soustraire,
     * ou l'inverse. On le nomme, sans donner le nombre.
     */
    pourquoiFaux(r, c, n) {
        const t = this.tableau;
        const dansLeTotal = estTotalColonne(t, c) || estTotalLigne(t, r);
        const attendu = t.valeurs[r][c];
        if (!dansLeTotal && n > attendu) {
            return 'Trop grand. Cette case est DANS le tableau, pas dans les totaux : '
                + 'on part du total de sa ligne (ou de sa colonne) et on RETIRE ce qu\'on y a déjà.';
        }
        if (dansLeTotal && n < attendu) {
            return 'Trop petit. Cette case est un TOTAL : on additionne toute la ligne '
                + '(ou toute la colonne), sans en oublier une.';
        }
        return `Ce n'est pas ça. Reprends ${estTotalColonne(t, c) || !estTotalLigne(t, r)
            ? nomDeLigne(t, r) : nomDeColonne(t, c)} et recompte case par case.`;
    }

    reste() {
        const t = this.tableau;
        let n = 0;
        for (let r = 0; r <= t.R; r++) {
            for (let c = 0; c <= t.C; c++) {
                if (estDonnee(t, r, c)) continue;
                if (Number(this.saisies[cle(r, c)]) !== t.valeurs[r][c]) n++;
            }
        }
        return n;
    }

    gagner() {
        this.fini = true;
        this.note(`✅ Tableau complet — ${totalGeneral(this.tableau)} ${this.tableau.unite} en tout.`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `${this.tableau.titre} — tableau complété`,
            expected: `${this.tableau.trous} cases`, given: `${this.tableau.trous} cases`,
            points: 10 + this.tableau.trous * 2
        });
        setTimeout(() => { if (this.isRunning) this.showNext(); }, 2400);
    }

    aider() {
        if (this.isDemo || !this.tableau) return;
        this.note(conseil(this.tableau, this.saisies));
        // On ENTOURE la ligne dont on parle : lire « la colonne Mardi » et
        // devoir la chercher des yeux ajoute une difficulté qui n'est pas
        // celle de l'exercice.
        const suite = prochaineLigne(this.tableau, this.saisies);
        this.tableEl.querySelectorAll('.tc-vise').forEach(el => el.classList.remove('tc-vise'));
        if (!suite) return;
        const [r, c] = suite.case;
        const td = this.tableEl.querySelector(`[data-cell="${r},${c}"]`);
        if (td) td.classList.add('tc-vise');
    }

    montrerSolution() {
        if (!this.tableau) return false;
        const t = this.tableau;
        for (let r = 0; r <= t.R; r++) {
            for (let c = 0; c <= t.C; c++) {
                if (!estDonnee(t, r, c)) this.saisies[cle(r, c)] = String(t.valeurs[r][c]);
            }
        }
        this.fini = true;
        this.dessiner();
        this.note('Solution affichée (outil d\'auteur).');
        return true;
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'tc-note' + (ton ? ` tc-note--${ton}` : '');
    }

    // --- Le pavé numérique --------------------------------------------------
    //
    // Rémy, banc d'essai : « pour la calculatrice, on a un bouton calculatrice
    // dont on peut se servir. N'en crée pas une, rajoute des boutons pour
    // écrire les valeurs numériques. »
    //
    // Il a raison deux fois. L'application a déjà sa calculatrice, en accès
    // permanent : en refaire une dans l'exercice, c'était deux calculatrices
    // différentes dans la même fenêtre. Et surtout, ce n'est pas de calculer
    // que l'élève avait besoin ici — c'est d'ÉCRIRE, sur une tablette où il n'y
    // a pas de clavier. Le pavé écrit donc dans la case active.

    dessinerPave() {
        const active = !!(this.tableau && this.tableau.calculatrice);
        this.calcEl.hidden = !active;
        if (!active) return;
        if (this.calcEl.childElementCount) return;
        let html = '<div class="tc-calc-titre">Écrire dans la case</div>';
        ['7', '8', '9', '4', '5', '6', '1', '2', '3'].forEach(t => {
            html += `<button type="button" class="tc-touche" data-touche="${t}">${t}</button>`;
        });
        html += '<button type="button" class="tc-touche tc-touche--eff" data-touche="eff">⌫</button>';
        html += '<button type="button" class="tc-touche" data-touche="0">0</button>';
        html += '<button type="button" class="tc-touche tc-touche--ok" data-touche="ok">✓</button>';
        this.calcEl.innerHTML = html;
        this.calcEl.querySelectorAll('[data-touche]').forEach(b => {
            // `mousedown` plutôt que `click`, et on empêche le défaut : sinon
            // le bouton prend le focus, la case le perd, et le chiffre suivant
            // n'a plus où aller.
            b.onmousedown = (e) => { e.preventDefault(); this.taper(b.dataset.touche); };
            b.ontouchstart = (e) => { e.preventDefault(); this.taper(b.dataset.touche); };
        });
    }

    taper(t) {
        if (this.isDemo || this.fini) return;
        const champ = this.champActif();
        if (!champ) return;
        champ.focus();
        if (t === 'ok') { champ.blur(); return; }
        if (t === 'eff') { champ.value = champ.value.slice(0, -1); return; }
        // Trois chiffres suffisent : au-delà, c'est une faute de frappe.
        if (champ.value.length < 3) champ.value += t;
    }

    // --- La démonstration ---------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };

        if (!this.tableau) this.poser();
        const t = this.tableau;
        if (!await cur.pause(500) || !this.isRunning) return fin();
        cur.say('Je ne remplis pas les cases dans l\'ordre où elles sont écrites. Je cherche '
            + 'la ligne ou la colonne où il ne manque QU\'UNE SEULE case : celle-là, je peux '
            + 'la boucler tout de suite.', this.tableEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();

        for (let k = 0; k < 3; k++) {
            const suite = prochaineLigne(t, this.saisies);
            if (!suite) break;
            const [r, c] = suite.case;
            const ou = suite.sens === 'ligne' ? nomDeLigne(t, r) : nomDeColonne(t, c);
            const estTotal = estTotalLigne(t, r) || estTotalColonne(t, c);
            const td = this.tableEl.querySelector(`[data-cell="${r},${c}"]`);
            if (!await gate.waitTurn() || !this.isRunning) return fin();
            cur.say(estTotal
                ? `Dans ${ou}, la case qui manque est un TOTAL : j'additionne tout le reste.`
                : `Dans ${ou}, il ne manque que celle-ci. Elle est dans le corps du tableau : `
                  + 'je pars du total et je RETIRE ce qui est déjà écrit.', td || this.tableEl);
            if (td && !await cur.tap(td)) return fin();
            this.saisies[cle(r, c)] = String(t.valeurs[r][c]);
            this.dessiner();
            if (!await cur.pause(DEMO_SPEED.settle) || !this.isRunning) return fin();
        }

        if (!await gate.waitTurn() || !this.isRunning) return fin();
        cur.say('Et chaque case que je viens d\'écrire en ouvre d\'autres : c\'est comme cela '
            + 'qu\'on finit le tableau, sans jamais deviner.', this.tableEl);
        if (!await cur.pause(DEMO_SPEED.between) || !this.isRunning) return fin();
        fin();
    }

    destroy() {
        if (this.demoGate) { this.demoGate.destroy(); this.demoGate = null; }
        super.destroy();
    }
}

const echapper = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function engineTableauCroise(container, isDemo, params) {
    const jeu = new TableauCroise(container, isDemo, params);
    jeu.start();
    return jeu;
}
