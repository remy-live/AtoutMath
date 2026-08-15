// LE TABLEAU DE CONVERSION — à l'écran, en trois temps.
//
// Le noyau (core/conversion.js) porte les colonnes, les rangs et la virgule.
// Ici : le tableau qu'on construit, le nombre qu'on fait glisser, et la
// virgule qu'on pose.
//
// LES TROIS ÉTAPES NE SE MÉLANGENT PAS, et c'est tout l'intérêt : chacune
// isole une erreur. Tant que l'ordre des unités n'est pas su, placer un nombre
// ne veut rien dire ; tant que le nombre n'est pas au bon rang, la virgule ne
// peut pas l'être. On avance donc dans l'ordre, et l'étape 1 ne se fait
// QU'UNE FOIS — après quoi le tableau reste garni pour toutes les conversions
// suivantes.
//
// LE FANTÔME EST LA CLÉ DE L'ÉTAPE 2. Pendant le glissement, le nombre entier
// s'affiche en transparence à l'endroit où il tomberait — un chiffre par
// colonne. L'élève VOIT que déplacer le nombre d'une colonne fait perdre un
// facteur dix, au lieu de se le faire dire après coup.

import { BaseGame } from '../core/BaseGame.js';
import { CSS_GLISSER, rendreGlissable } from '../core/glisserDeposer.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import {
    FAMILLES, familleDe, uniteDe, melangerUnites, verifierUnites,
    apercuPlacement, verifierNombre, convertir, tirerConversion
} from '../core/conversion.js';

const COMPETENCE = 'num.conversion';

class Conversion extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'conversion');
        this.rng = makeRng(this.params.seed);
        this.famille = FAMILLES[this.params.famille] ? this.params.famille : 'longueur';
        this.ecart = Math.max(1, Math.min(6, parseInt(this.params.ecart) || 3));
        this.avecVirgule = this.params.decimales === true;
        this.reussis = 0;
        // L'étape 1 ne se refait pas : une fois le tableau garni, il le reste.
        this.tableauGarni = false;
        this.unitesPosees = {};
    }

    get colonnes() { return familleDe(this.famille).unites.map(u => u.rang); }

    render() {
        this.container.innerHTML = `
            <style>
                ${CSS_GLISSER}
                .cv-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 10px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; overflow-y: auto;
                }
                .cv-tete { display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                    justify-content: center; font-size: .9rem; }
                .cv-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer;
                    font: inherit; font-weight: 600; font-size: 13px; padding: 5px 11px;
                }
                .cv-btn:hover { background: var(--bg-hover); }
                .cv-etape {
                    font-weight: 800; font-size: clamp(14px, 3.4cqw, 18px); text-align: center;
                    padding: 5px 14px; border-radius: 999px; color: #fff;
                    background: linear-gradient(135deg, var(--primary), #8b5cf6);
                }
                .cv-enonce {
                    font-size: clamp(20px, 5.5cqw, 30px); font-weight: 900;
                    font-variant-numeric: tabular-nums;
                }

                /* LE TABLEAU. Une colonne par unité, la virgule entre deux. */
                .cv-table { border-collapse: collapse; font-variant-numeric: tabular-nums; }
                .cv-table th, .cv-table td {
                    border: 2px solid var(--text-main); text-align: center;
                    width: clamp(38px, 11cqw, 62px); height: clamp(34px, 9cqw, 52px);
                    padding: 0; font-weight: 800; font-size: clamp(15px, 4cqw, 22px);
                }
                .cv-table th { background: var(--bg-hover); font-size: clamp(11px, 3cqw, 15px); }
                .cv-tete-vide { background: color-mix(in srgb, var(--danger) 12%, transparent); }
                .cv-tete-vide.cv-cible { outline: 3px dashed var(--primary); outline-offset: -4px; }
                /* UNE ÉTIQUETTE POSÉE SE REPREND. Le curseur et le survol le
                   disent : sans indice visible, on n'essaie pas de cliquer un
                   en-tête de tableau — et on reste bloqué sur son erreur. */
                .cv-tete-posee { cursor: pointer; }
                .cv-tete-posee:hover {
                    background: color-mix(in srgb, var(--primary) 14%, transparent);
                    outline: 2px solid var(--primary); outline-offset: -3px;
                }

                /* Le chiffre posé, et le fantôme pendant le glissement. */
                .cv-chiffre { color: var(--text-main); }
                .cv-fantome { color: var(--primary); opacity: .45; }
                .cv-zero { color: var(--danger); }
                .cv-case--survol { background: color-mix(in srgb, var(--primary) 18%, transparent); }
                .cv-virgule { position: relative; }
                /* La virgule se dessine SUR le bord droit de la colonne : c'est
                   une frontière entre deux colonnes, pas un caractère dans une
                   case. */
                .cv-virgule::after {
                    content: ''; position: absolute; right: -6px; bottom: 2px;
                    width: 10px; height: 10px; border-radius: 50%;
                    background: var(--danger);
                }

                .cv-etiquettes { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; }
                .cv-etiquette {
                    padding: 7px 13px; border-radius: 10px; cursor: grab; touch-action: none;
                    background: var(--bg-panel); border: 2px solid var(--border);
                    font-weight: 800; font-size: clamp(13px, 3.4cqw, 17px);
                }
                .cv-etiquette--prise { outline: 3px solid var(--primary); }
                .cv-etiquette[hidden] { display: none; }

                .cv-nombre {
                    display: inline-flex; gap: 2px; padding: 7px 12px; border-radius: 10px;
                    cursor: grab; touch-action: none; font-weight: 900;
                    font-size: clamp(18px, 5cqw, 26px);
                    background: color-mix(in srgb, var(--primary) 16%, transparent);
                    border: 2px solid var(--primary);
                }
                .cv-note { min-height: 2.6em; text-align: center; line-height: 1.35;
                    font-size: clamp(13px, 3cqw, 15px); color: var(--text-muted); max-width: 560px; }
                .cv-note--ok { color: var(--success); font-weight: 700; }
                .cv-note--ko { color: var(--danger); font-weight: 700; }
                .cv-reponse {
                    display: flex; align-items: center; gap: .4em;
                    font-size: clamp(18px, 5cqw, 26px); font-weight: 900;
                }
                .cv-trou {
                    width: 5em; text-align: center; font: inherit;
                    border: none; border-bottom: 3px dashed var(--primary);
                    background: transparent; color: var(--text-main);
                }
                .cv-trou:focus { outline: none; border-bottom-style: solid; }
            </style>
            <div class="cv-wrap">
                <div class="cv-tete">
                    <span data-score></span>
                    <button type="button" class="cv-btn" data-indice>💡 Aide</button>
                    <button type="button" class="cv-btn" data-neuf>↺ Autre conversion</button>
                </div>
                <div class="cv-etape" data-etape></div>
                <div class="cv-enonce" data-enonce></div>
                <table class="cv-table"><tbody data-table></tbody></table>
                <div class="cv-etiquettes" data-etiquettes></div>
                <div data-zone></div>
                <p class="cv-note" data-note></p>
            </div>`;

        this.etapeEl = this.container.querySelector('[data-etape]');
        this.enonceEl = this.container.querySelector('[data-enonce]');
        this.tableEl = this.container.querySelector('[data-table]');
        this.etiquettesEl = this.container.querySelector('[data-etiquettes]');
        this.zoneEl = this.container.querySelector('[data-zone]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.scoreEl = this.container.querySelector('[data-score]');
        this.container.querySelector('[data-neuf]').addEventListener('click', () => this.poser());
        this.container.querySelector('[data-indice]').addEventListener('click', () => this.aider());
        this.poser();
    }

    startGameLoop() { /* Pas d'horloge. */ }

    poser() {
        this.exercice = tirerConversion({
            rng: this.rng, famille: this.famille,
            ecart: this.ecart, decimales: this.avecVirgule
        });
        this.colonneNombre = null;      // où l'élève a posé le chiffre des unités
        this.virgule = null;            // la colonne après laquelle il pose la virgule
        this.zeros = new Set();         // les colonnes qu'il a comblées
        this.etape = this.tableauGarni ? 2 : 1;
        this.dessiner();
        return true;
    }

    dessiner() {
        const ex = this.exercice;
        const f = familleDe(this.famille);
        this.enonceEl.textContent = ex.enonce;
        this.scoreEl.textContent = `${this.reussis} conversion${this.reussis > 1 ? 's' : ''}`;
        this.etapeEl.textContent = {
            1: '① Place les unités dans les colonnes',
            2: '② Fais glisser le nombre au bon endroit',
            3: '③ Pose la virgule, comble les zéros, puis écris la réponse'
        }[this.etape];

        // --- Le tableau ---------------------------------------------------
        const entetes = document.createElement('tr');
        const cases = document.createElement('tr');
        f.unites.forEach(u => {
            const th = document.createElement('th');
            const pose = this.unitesPosees[u.rang];
            th.textContent = pose || '';
            th.className = pose ? '' : 'cv-tete-vide';
            // TOUTE COLONNE RESTE UNE CIBLE, occupée ou non. Une étiquette
            // lâchée dans la mauvaise colonne y restait pour toujours : la
            // case n'était plus une cible, et l'étiquette avait disparu du
            // bandeau. On ne pouvait ni la reprendre ni la remplacer — il
            // fallait relancer l'exercice. Déposer sur une colonne occupée
            // renvoie maintenant l'ancienne au bandeau.
            if (this.etape === 1) {
                th.dataset.rang = u.rang;
                if (!pose) th.classList.add('cv-cible');
                else {
                    // ET ON PEUT LA REPRENDRE D'UN CLIC. C'est le geste qu'on
                    // essaie d'abord quand on s'est trompé.
                    th.classList.add('cv-tete-posee');
                    th.title = 'Clique pour reprendre cette étiquette';
                    th.addEventListener('click', () => {
                        if (this.isDemo) return;
                        delete this.unitesPosees[u.rang];
                        this.dessiner();
                        this.note(`« ${pose} » est revenue en bas — repose-la où tu veux.`);
                    });
                }
            }
            entetes.appendChild(th);

            const td = document.createElement('td');
            td.dataset.rang = u.rang;
            if (this.virgule === u.rang) td.classList.add('cv-virgule');
            const contenu = this.contenuCase(u.rang);
            td.innerHTML = contenu.html;
            cases.appendChild(td);
        });
        this.tableEl.innerHTML = '';
        this.tableEl.appendChild(entetes);
        this.tableEl.appendChild(cases);

        this.etiquettesEl.innerHTML = '';
        this.zoneEl.innerHTML = '';
        if (this.etape === 1) this.dessinerEtape1();
        else if (this.etape === 2) this.dessinerEtape2();
        else this.dessinerEtape3();
    }

    /** Ce qui s'écrit dans la case d'une colonne. */
    contenuCase(rang) {
        const ex = this.exercice;
        if (this.colonneNombre !== null) {
            const pose = apercuPlacement(ex.valeur, this.colonneNombre);
            const c = pose.find(x => x.colonne === rang);
            if (c) return { html: `<span class="cv-chiffre">${c.chiffre}</span>` };
        }
        if (this.zeros.has(rang)) return { html: '<span class="cv-zero">0</span>' };
        return { html: '' };
    }

    // --- Étape 1 : les unités ---------------------------------------------------

    dessinerEtape1() {
        if (!this.melange) this.melange = melangerUnites(this.famille, this.rng);
        this.note('Chaque étiquette va dans SA colonne. Attention : hecto vient avant déca.');
        this.melange.etiquettes.forEach(sym => {
            const el = document.createElement('div');
            el.className = 'cv-etiquette';
            el.textContent = sym;
            el.hidden = Object.values(this.unitesPosees).includes(sym);
            rendreGlissable(el, {
                cibles: 'th[data-rang]',
                actif: () => !this.isDemo && this.etape === 1,
                deposer: (th) => this.poserEtiquette(th, sym)
            });
            this.etiquettesEl.appendChild(el);
        });
    }

    poserEtiquette(th, sym) {
        {
            const rang = Number(th.dataset.rang);
            // Une étiquette ne peut être qu'à un endroit : si elle était déjà
            // posée ailleurs, elle déménage au lieu de se dédoubler.
            for (const [r, s] of Object.entries(this.unitesPosees)) {
                if (s === sym) delete this.unitesPosees[r];
            }
            this.unitesPosees[rang] = sym;
            const v = verifierUnites(this.famille, this.unitesPosees);
            if (v.ok) {
                this.tableauGarni = true;
                this.etape = 2;
                this.onCorrectAnswer(null, COMPETENCE, {
                    questionText: `Ranger les unités de ${familleDe(this.famille).nom.toLowerCase()}`,
                    expected: 'km hm dam m dm cm mm', given: 'juste', points: 8
                });
                this.dessiner();
                this.note('✅ Le tableau est prêt — et il le restera pour les conversions suivantes.', 'ok');
                return;
            }
            this.dessiner();
            // TOUT EST POSÉ MAIS C'EST FAUX : on le DIT. L'élève restait devant
            // un tableau plein qui ne se validait pas, à chercher un bouton qui
            // n'existe pas. Le message vient APRÈS le redessin : celui-ci
            // réécrit la consigne de l'étape, et l'effaçait.
            const nb = Object.keys(this.unitesPosees).length;
            if (nb >= familleDe(this.famille).unites.length) {
                const mal = v.fautes.filter(f => f.recu).map(f => f.recu);
                // On en NOMME trois au plus : la liste des sept déplacées se
                // lit comme un reproche, et ne dit pas par où commencer.
                const cites = mal.slice(0, 3).join(', ') + (mal.length > 3 ? ' et d\'autres' : '');
                this.note(`Le tableau est complet, mais ${mal.length > 1
                    ? `${mal.length} unités ne sont pas à leur place` : 'une unité n\'est pas à sa place'}`
                    + ` : ${cites}. Clique une étiquette du tableau pour la reprendre.`, 'ko');
            }
        }
    }

    // --- Étape 2 : le nombre, avec le fantôme --------------------------------------

    dessinerEtape2() {
        const ex = this.exercice;
        this.note(`Fais glisser ${String(ex.valeur).replace('.', ',')} dans le tableau : `
            + `le chiffre des unités va dans la colonne des ${ex.depart}.`);
        const el = document.createElement('div');
        el.className = 'cv-nombre';
        el.textContent = String(ex.valeur).replace('.', ',');
        rendreGlissable(el, {
            cibles: 'td[data-rang]',
            actif: () => !this.isDemo && this.etape === 2,
            survoler: (td) => this.apercuNombre(td),
            deposer: (td) => this.poserNombre(td)
        });
        this.zoneEl.appendChild(el);
    }

    /** L'APERÇU : le nombre écrit en transparence là où il tomberait. C'est ce
     *  qui fait VOIR le facteur dix avant de le commettre. */
    apercuNombre(td) {
        const ex = this.exercice;
        this.tableEl.querySelectorAll('td').forEach(c => {
            c.classList.remove('cv-case--survol');
            if (!c.querySelector('.cv-chiffre')) c.innerHTML = '';
        });
        if (!td) return;
        const rang = Number(td.dataset.rang);
        apercuPlacement(ex.valeur, rang).forEach(c => {
            const q = this.tableEl.querySelector(`td[data-rang="${c.colonne}"]`);
            if (q) {
                q.innerHTML = `<span class="cv-fantome">${c.chiffre}</span>`;
                q.classList.add('cv-case--survol');
            }
        });
    }

    poserNombre(td) {
        const ex = this.exercice;
        {
            const rang = Number(td.dataset.rang);
            const v = verifierNombre(ex.valeur, this.famille, ex.depart, rang);
            if (!v.ok) {
                const dix = Math.abs(v.ecart);
                this.note(`Non : décalé de ${dix} colonne${dix > 1 ? 's' : ''}, le nombre est `
                    + `${dix === 1 ? 'dix' : `10^${dix}`} fois trop ${v.ecart > 0 ? 'grand' : 'petit'}. `
                    + `Le chiffre des unités va sous ${ex.depart}.`, 'ko');
                this.onWrongAnswer(null, {
                    concept: COMPETENCE,
                    questionText: `Où placer ${ex.valeur} ${ex.depart} ?`,
                    input: `colonne ${rang}`, expected: `colonne ${uniteDe(this.famille, ex.depart).rang}`,
                    customMessage: 'Le chiffre des unités du nombre va TOUJOURS dans la colonne de son unité.'
                });
                this.dessiner();
                return;
            }
            this.colonneNombre = rang;
            this.etape = 3;
            this.note(`✅ Bien placé. Maintenant : où mettre la virgule pour lire des ${ex.arrivee} ?`, 'ok');
            this.dessiner();
        }
    }

    // --- Étape 3 : la virgule, les zéros, la réponse ---------------------------------

    dessinerEtape3() {
        const ex = this.exercice;
        const attendu = convertir(ex.valeur, this.famille, ex.depart, ex.arrivee);

        // On clique une colonne pour y poser la virgule ; on clique une case
        // vide pour y écrire un zéro.
        this.tableEl.querySelectorAll('td[data-rang]').forEach(td => {
            const rang = Number(td.dataset.rang);
            td.style.cursor = 'pointer';
            td.addEventListener('click', () => {
                if (td.querySelector('.cv-chiffre')) return;   // un chiffre ne se touche pas
                if (this.virgule === null) { this.virgule = rang; this.majEtape3(); return; }
                if (this.zeros.has(rang)) this.zeros.delete(rang); else this.zeros.add(rang);
                this.majEtape3();
            });
        });

        const rep = document.createElement('div');
        rep.className = 'cv-reponse';
        rep.innerHTML = `<span>${String(ex.valeur).replace('.', ',')} ${ex.depart} =</span>`;
        const trou = document.createElement('input');
        trou.className = 'cv-trou';
        trou.type = 'text';
        trou.inputMode = 'decimal';
        trou.setAttribute('aria-label', 'la conversion');
        let rendu = false;
        const valider = () => {
            if (rendu || !trou.value.trim()) return;
            rendu = true;
            if (!this.verifier(trou.value)) rendu = false;
        };
        trou.addEventListener('keydown', (e) => { if (e.key === 'Enter') valider(); });
        trou.addEventListener('blur', valider);
        rep.appendChild(trou);
        const u = document.createElement('span');
        u.textContent = ex.arrivee;
        rep.appendChild(u);
        this.zoneEl.appendChild(rep);
        this.attendu = attendu;
        this.majEtape3();
    }

    /** Le message d'accompagnement de l'étape 3, selon ce qui reste à faire. */
    majEtape3() {
        this.dessinerTableSeulement();
        const a = this.attendu;
        if (this.virgule === null) {
            this.note(`Clique la colonne des ${this.exercice.arrivee} : la virgule se pose juste après elle.`);
            return;
        }
        if (this.virgule !== a.colonneVirgule) {
            this.note('La virgule se pose après la colonne de l\'unité demandée, jamais ailleurs. '
                + 'Clique une case pour la déplacer.', 'ko');
            return;
        }
        const manquants = a.zeros.filter(z => !this.zeros.has(z));
        if (manquants.length) {
            this.note(`La virgule est bien placée. Il reste ${manquants.length} case(s) vide(s) `
                + 'entre les chiffres et la virgule : clique-les pour y mettre un zéro.');
            return;
        }
        this.note('Tout est écrit — relis le tableau et donne la réponse.');
    }

    /** Redessine les cases sans reconstruire les écouteurs de l'étape 3. */
    dessinerTableSeulement() {
        this.tableEl.querySelectorAll('td[data-rang]').forEach(td => {
            const rang = Number(td.dataset.rang);
            td.classList.toggle('cv-virgule', this.virgule === rang);
            if (td.querySelector('.cv-chiffre')) return;
            td.innerHTML = this.zeros.has(rang) ? '<span class="cv-zero">0</span>' : '';
        });
    }

    /** @returns {boolean} vrai si la conversion est validée. */
    verifier(brut) {
        const ex = this.exercice;
        const v = Number(String(brut).trim().replace(',', '.'));
        if (Math.abs(v - ex.attendu) > 1e-9) {
            this.note(`${String(brut).trim()} n'est pas la bonne conversion. `
                + `Relis le tableau à partir de la virgule.`, 'ko');
            this.onWrongAnswer(null, {
                concept: COMPETENCE,
                questionText: ex.enonce, input: String(brut).trim(),
                expected: String(ex.attendu).replace('.', ','),
                customMessage: ex.sens === 'multiplie'
                    ? 'On va vers une plus PETITE unité : le nombre doit grandir.'
                    : 'On va vers une plus GRANDE unité : le nombre doit diminuer.'
            });
            return false;
        }
        this.reussis++;
        this.note(`✅ ${ex.enonce.replace('………', String(ex.attendu).replace('.', ','))}`, 'ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: ex.enonce,
            expected: String(ex.attendu), given: String(v),
            points: 6 + Math.abs(uniteDe(this.famille, ex.depart).rang - uniteDe(this.famille, ex.arrivee).rang) * 2
        });
        setTimeout(() => { if (this.isRunning) this.poser(); }, 1900);
        return true;
    }

    aider() {
        const ex = this.exercice;
        if (this.etape === 1) {
            return this.note('De la plus grande à la plus petite : kilo, hecto, déca, '
                + 'l\'unité, déci, centi, milli.');
        }
        if (this.etape === 2) {
            return this.note(`Le chiffre des unités de ${String(ex.valeur).replace('.', ',')} `
                + `va dans la colonne des ${ex.depart} — c'est SON unité.`);
        }
        return this.note(`On veut lire des ${ex.arrivee} : la virgule se pose juste après `
            + `cette colonne, et toute case vide qui la précède prend un zéro.`);
    }

    note(html, ton) {
        if (!this.noteEl) return;
        this.noteEl.innerHTML = html || '';
        this.noteEl.className = 'cv-note' + (ton ? ` cv-note--${ton}` : '');
    }

    showNext() { return this.poser(); }

    // --- La démonstration ---------------------------------------------------------

    async runDemoSequence() {
        const cur = createDemoCursor();
        this.demoCursor = cur;
        const gate = createDemoGate(this.container);
        this.demoGate = gate;
        const fin = () => { cur.destroy(); gate.destroy(); this.demoCursor = null; this.demoGate = null; };
        try {
            cur.protegerZone([this.tableEl, this.zoneEl]);
            await gate.wait(500);
            const f = familleDe(this.famille);
            if (this.etape === 1) {
                cur.say('D\'abord les unités, une fois pour toutes : kilo, hecto, déca, '
                    + 'l\'unité, déci, centi, milli.', this.etiquettesEl);
                await gate.wait(3000);
                f.unites.forEach(u => { this.unitesPosees[u.rang] = u.symbole; });
                this.tableauGarni = true;
                this.etape = 2;
                this.dessiner();
                await gate.wait(900);
            }
            const ex = this.exercice;
            cur.say(`${String(ex.valeur).replace('.', ',')} ${ex.depart} : le chiffre des unités `
                + `va sous ${ex.depart}. Pas ailleurs.`, this.tableEl);
            await gate.wait(3000);
            this.colonneNombre = uniteDe(this.famille, ex.depart).rang;
            this.etape = 3;
            this.dessiner();
            await gate.wait(900);

            const a = convertir(ex.valeur, this.famille, ex.depart, ex.arrivee);
            cur.say(`On veut des ${ex.arrivee} : la virgule se pose juste après cette colonne.`,
                this.tableEl);
            await gate.wait(2800);
            this.virgule = a.colonneVirgule;
            a.zeros.forEach(z => this.zeros.add(z));
            this.majEtape3();
            await gate.wait(900);
            cur.say(a.zeros.length
                ? `Les ${a.zeros.length} cases vides avant la virgule prennent un zéro — `
                    + `et l'on lit ${String(ex.attendu).replace('.', ',')} ${ex.arrivee}.`
                : `Et l'on lit directement ${String(ex.attendu).replace('.', ',')} ${ex.arrivee}.`,
            this.tableEl);
            await gate.wait(3200);
        } catch (e) { /* démonstration coupée */ }
        fin();
    }
}

export function engineConversion(container, isDemo, params) {
    const jeu = new Conversion(container, isDemo, params);
    // C'EST L'USINE QUI DÉMARRE LE JEU, pas l'appelant. Le Runner appelle
    // cette fonction et garde l'instance ; il n'appelle jamais « start ». Sans
    // cette ligne, le jeu se construisait, ne dessinait rien, et l'écran
    // restait vide — sans la moindre erreur pour le dire.
    jeu.start();
    return jeu;
}
