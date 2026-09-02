// THALÈS : LA RÉDACTION — « Je sais que… Or… Donc… », écrit ligne à ligne.
//
// Rémy, deux fois : « on va rédiger en 3 parties dans la progression de
// l'exercice », puis « tu n'as toujours pas fait l'exercice de rédaction ».
//
// LES AUTRES EXERCICES DE THALÈS DONNENT LE NOMBRE, CELUI-CI DONNE LA COPIE.
// Trouver la longueur, l'exercice de calcul le fait déjà. Ici on apprend à
// écrire la démonstration : distinguer ce qu'on SAIT (les hypothèses, qui
// viennent de l'énoncé), ce qu'on INVOQUE (le théorème, qui vient du cours) et
// ce qu'on en DÉDUIT (le calcul). C'est la forme que le professeur attend sur
// une copie, et c'est elle qui rapporte les points.
//
// LA PAGE S'ÉCRIT DE HAUT EN BAS, ET NE SE DÉSÉCRIT PAS. Chaque partie
// terminée reste affichée, en propre, sous les yeux : à la fin, l'élève a sous
// le nez la démonstration entière, celle qu'il devra savoir recopier. Une
// partie qui disparaîtrait une fois juste ferait de l'exercice une suite de
// questions sans rapport — or c'est justement le RAPPORT entre les trois qu'on
// veut faire voir.
//
// L'ÉGALITÉ SE TAPE. Rémy : « il faudrait aussi pouvoir taper l'égalité ».
// Choisir parmi quatre écritures et l'écrire soi-même ne sont pas le même
// travail : dans le premier cas on reconnaît, dans le second on construit. Six
// cases, et une rangée d'étiquettes pour les remplir au doigt — dont les deux
// pièges, [CD] et [BE], les fameux « restes ».
//
// LA CALCULATRICE EST AUTORISÉE, il l'a écrit. La dernière ligne est une
// division qui ne tombe pas toujours rond, et ce n'est pas elle qu'on évalue.
//
// Les règles — l'égalité valide, les hypothèses, le produit en croix — vivent
// dans core/thalesRedaction.js, testées sans navigateur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { CONFIGURATIONS, creerThales, longueurTexte } from '../core/thales.js';
import { figureThalesSvg, egaliteEnColonnes } from '../core/generators/thales.js';
import {
    ETIQUETTES, hypotheses, isolements, trio, calculEcrit, verifierEgalite, verifierChiffres
} from '../core/thalesRedaction.js';

const COMPETENCE = 'geo.thales';
/** Les longueurs qu'on peut demander : celles du petit triangle, le sens direct. */
const CHERCHABLES = ['AD', 'AE', 'DE'];

class ThalesRedaction extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'thales-redaction');
        this.rng = makeRng(this.params.seed);
        this.config = CONFIGURATIONS[this.params.config] ? this.params.config : null;
        this.phase = 'sais';
        this.fautes = 0;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .thr-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    width: 100%; height: 100%; padding: 8px 12px 12px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; min-height: 0;
                    overflow-y: auto;
                }
                .thr-corps {
                    display: flex; gap: 16px; align-items: flex-start; justify-content: center;
                    width: 100%; flex-wrap: wrap;
                }
                .thr-scene { flex: 0 1 300px; min-width: 210px; max-width: 320px; }
                .thr-copie { flex: 1 1 380px; min-width: 280px; max-width: 560px; }
                .thr-enonce {
                    text-align: center; font-weight: 700; font-size: .92rem; line-height: 1.35;
                    color: var(--text-muted); margin-bottom: 4px;
                }
                /* Chaque partie de l'énoncé sur sa ligne — voir la méthode dessiner. */
                .thr-l { display: block; }
                /* « AB = 18 cm » NE SE COUPE PAS EN DEUX. Un nombre séparé de
                   son unité par un retour à la ligne se relit mal, et sur une
                   figure où trois longueurs se ressemblent, c'est là qu'on va
                   chercher le mauvais chiffre. */
                .thr-enonce b { white-space: nowrap; }
                .thr-enonce b { color: var(--text-main); }

                /* LA COPIE. Trois blocs, et le mot qui les ouvre est en marge,
                   comme au cahier : c'est ce mot qu'on doit apprendre a poser. */
                .thr-bloc {
                    border-left: 3px solid var(--border); padding: 2px 0 6px 10px;
                    margin-bottom: 8px;
                }
                .thr-bloc--fait { border-left-color: var(--success); }
                .thr-bloc--ici { border-left-color: var(--primary); }
                .thr-titre {
                    font-weight: 800; font-size: .82rem; letter-spacing: .04em;
                    text-transform: uppercase; color: var(--text-muted); margin-bottom: 3px;
                }
                .thr-bloc--ici .thr-titre { color: var(--primary); }
                .thr-bloc--fait .thr-titre { color: var(--success); }
                .thr-ligne { font-size: .95rem; line-height: 1.5; font-weight: 600; }
                /* La phrase qui dit quoi faire sur la ligne chiffrée : plus
                   discrète que le calcul, elle n'est pas de la rédaction. */
                .thr-ligne--dit {
                    color: var(--text-muted); font-weight: 600; font-size: .84em;
                    margin: 4px 0 2px;
                }
                .thr-ligne--calcul { font-family: inherit; letter-spacing: .01em; }

                /* Les propositions d'hypothèses, et les formes du produit en croix. */
                .thr-choix { display: flex; flex-direction: column; gap: 5px; margin-top: 5px; }
                .thr-opt {
                    text-align: left; border: 2px solid var(--border); border-radius: 10px;
                    background: var(--bg-panel); color: var(--text-main); cursor: pointer;
                    font: inherit; font-weight: 600; font-size: .88rem; padding: 7px 11px;
                    line-height: 1.3;
                }
                .thr-opt:hover { border-color: var(--primary); }
                .thr-opt--pris { border-color: var(--success); background: rgba(22,163,74,.12); }
                .thr-opt--faux { border-color: var(--danger); background: rgba(220,38,38,.1); opacity: .7; }

                /* L'ÉGALITÉ À TAPER : trois fractions, six cases. */
                .thr-eg {
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    flex-wrap: wrap; margin: 6px 0;
                }
                .thr-frac { display: flex; flex-direction: column; align-items: center; gap: 2px; }
                .thr-frac hr {
                    width: 100%; margin: 1px 0; border: none;
                    border-top: 2px solid var(--text-main);
                }
                .thr-case {
                    width: 3.1em; padding: 4px 2px; text-align: center; font: inherit;
                    font-weight: 800; font-size: 1rem; text-transform: uppercase;
                    border: 2px solid var(--border); border-radius: 8px;
                    background: var(--bg-panel); color: var(--text-main);
                }
                .thr-case:focus { outline: none; border-color: var(--primary);
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); }
                .thr-egal { font-weight: 800; font-size: 1.1rem; }
                .thr-palette {
                    display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;
                    margin-top: 4px;
                }
                .thr-eti {
                    border: 1.5px solid var(--border); border-radius: 8px; cursor: pointer;
                    background: var(--bg-panel); color: var(--text-main); font: inherit;
                    font-weight: 800; font-size: .84rem; padding: 5px 10px; min-height: 32px;
                }
                .thr-eti:hover { border-color: var(--primary); color: var(--primary); }

                .thr-resultat { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
                .thr-nb {
                    width: 5.5em; padding: 5px 6px; text-align: center; font: inherit;
                    font-weight: 800; font-size: 1rem; border: 2px solid var(--border);
                    border-radius: 8px; background: var(--bg-panel); color: var(--text-main);
                }
                .thr-nb:focus { outline: none; border-color: var(--primary); }

                .thr-note {
                    min-height: 2.6em; text-align: center; font-size: .86rem; line-height: 1.4;
                    color: var(--text-muted); max-width: 620px;
                }
                .thr-note--ok { color: var(--success); font-weight: 700; }
                .thr-note--ko { color: var(--danger); font-weight: 600; }
                .thr-barre { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
                .thr-btn {
                    border: 1px solid var(--border); background: var(--bg-panel);
                    color: var(--text-main); border-radius: 9px; cursor: pointer; font: inherit;
                    font-weight: 700; padding: 7px 13px; font-size: .85rem; min-height: 38px;
                }
                .thr-btn--fort {
                    border-color: var(--primary); background: var(--primary); color: #fff;
                }

                @container (max-width: 700px) {
                    .thr-corps { flex-direction: column; align-items: center; gap: 6px; }
                    .thr-scene { flex: 0 0 auto; width: min(230px, 66%); }
                    .thr-copie { flex: 0 0 auto; width: 100%; }
                    .thr-ligne, .thr-opt { font-size: .85rem; }
                    .thr-case { font-size: .92rem; width: 2.9em; }
                }
            </style>
            <div class="thr-wrap">
                <div class="thr-corps">
                    <div class="thr-scene">
                        <div class="thr-enonce" data-enonce></div>
                        <div data-figure></div>
                    </div>
                    <div class="thr-copie" data-copie></div>
                </div>
                <div class="thr-note" data-note></div>
                <div class="thr-barre">
                    <button type="button" class="thr-btn" data-recommencer>↺ Recommencer</button>
                    <button type="button" class="thr-btn" data-neuf>Autre figure</button>
                </div>
            </div>`;

        this.enonceEl = this.container.querySelector('[data-enonce]');
        this.figEl = this.container.querySelector('[data-figure]');
        this.copieEl = this.container.querySelector('[data-copie]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-recommencer]').onclick = () => this.recommencer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
    }

    startGameLoop() { this.poserDefi(); }
    showNext() { return this.poserDefi(); }

    poserDefi() {
        const config = this.config || this.rng.pick(['emboites', 'papillon']);
        let f = null;
        for (let essai = 0; essai < 30 && !f; essai++) f = creerThales({ config, rng: this.rng });
        if (!f) return false;
        this.f = f;
        this.cherche = this.rng.pick(CHERCHABLES);
        this.donnees = trio(this.cherche);
        this.calc = calculEcrit(f, this.cherche);
        this.isolements = this.rng.shuffle(isolements(this.cherche));
        this.hyp = this.rng.shuffle(hypotheses());
        this.prises = [];
        this.formeChoisie = null;
        this.egaliteEcrite = null;
        this.egaliteCases = null;
        this.chiffres = null;
        this.chiffresEcrits = null;
        this.saisie = [];
        this.phase = 'sais';
        this.fautes = 0;
        this.dessiner();
        this.note('Rédige la démonstration en trois parties, comme sur une copie.');
        return true;
    }

    recommencer() {
        if (this.isDemo || !this.f) return;
        this.prises = [];
        this.formeChoisie = null;
        this.egaliteEcrite = null;
        this.egaliteCases = null;
        this.chiffres = null;
        this.chiffresEcrits = null;
        this.saisie = [];
        this.phase = 'sais';
        this.dessiner();
        this.note('On reprend au début de la rédaction.');
    }

    // --- Le dessin ------------------------------------------------------------

    dessiner() {
        const L = longueurTexte;
        // TROIS LIGNES, ET C'EST L'ÉNONCÉ TEL QU'ON L'ÉCRIT AU TABLEAU.
        //
        // Rémy : « plutôt écrire sur 3 lignes : (DE) // (CB). On donne : / AE =
        // 12 cm, AB = 18 cm, BC = 21 cm. / Calcule DE. »
        //
        // En un seul paragraphe, la coupure tombait où elle voulait — « AB = 18 »
        // se cassait entre le 18 et son « cm » — et les trois choses que dit un
        // énoncé de Thalès se mélangeaient. Elles sont de nature différente et
        // se lisent séparément : L'HYPOTHÈSE (les parallèles), LES DONNÉES
        // (les trois longueurs), LA QUESTION. Une ligne chacune, et l'œil sait
        // où revenir quand il cherche un nombre.
        this.enonceEl.innerHTML = `<span class="thr-l">(DE) // (CB). On donne :</span>`
            + `<span class="thr-l">`
            + this.donnees.map(n => `<b>${n} = ${L(this.f[n])} cm</b>`).join(', ')
            + `.</span>`
            + `<span class="thr-l">Calcule <b>${this.cherche}</b>.</span>`;
        this.figEl.innerHTML = figureThalesSvg(this.f, this.donnees);
        this.dessinerCopie();
    }

    /** L'état d'un bloc : fait, en cours, ou pas encore ouvert. */
    etatBloc(nom) {
        // LA LIGNE CHIFFRÉE EST UNE MARCHE DU « OR », pas un bloc à part : c'est
        // la même phrase du théorème, écrite une seconde fois avec les nombres.
        const ordre = ['sais', 'or', 'chiffres', 'isole', 'donc', 'fini'];
        const blocs = { sais: 'sais', or: 'chiffres', donc: 'isole' };
        const rang = ordre.indexOf(this.phase);
        if (nom === 'donc') {
            return rang >= ordre.indexOf('isole') ? (this.phase === 'fini' ? 'fait' : 'ici') : '';
        }
        // Le « Or » reste en cours tant que l'égalité OU sa ligne chiffrée
        // s'écrivent : ce sont deux gestes du même bloc.
        if (nom === 'or') {
            return rang > ordre.indexOf('chiffres') ? 'fait'
                : (rang >= ordre.indexOf('or') ? 'ici' : '');
        }
        const r = ordre.indexOf(blocs[nom]);
        return rang > r ? 'fait' : (rang === r ? 'ici' : '');
    }

    dessinerCopie() {
        const bloc = (nom, titre, dedans) => {
            const e = this.etatBloc(nom);
            if (!e) return '';
            return `<div class="thr-bloc${e ? ' thr-bloc--' + e : ''}">
                <div class="thr-titre">${titre}</div>${dedans}</div>`;
        };
        this.copieEl.innerHTML =
            bloc('sais', 'Je sais que', this.htmlSais())
            + bloc('or', 'Or', this.htmlOr())
            + bloc('donc', 'Donc', this.htmlDonc());
        this.brancher();
    }

    htmlSais() {
        const posees = this.prises.map(i => `<div class="thr-ligne">• ${this.hyp[i].texte}</div>`).join('');
        if (this.phase !== 'sais') return posees;
        // Les propositions restantes : on en cherche DEUX, et on le dit.
        return posees + `<div class="thr-choix">${this.hyp.map((h, i) => this.prises.includes(i)
            ? '' : `<button type="button" class="thr-opt" data-hyp="${i}">${h.texte}</button>`
        ).join('')}</div>`;
    }

    htmlOr() {
        // LA LIGNE CHIFFRÉE, une fois écrite ou pendant qu'on l'écrit.
        //
        // Rémy : « juste après l'égalité de fractions dans le OR, tu rajoutes
        // une ligne de fractions où on remplace par les valeurs quand on les a,
        // et on recopie le nom du côté sinon. » Les cases arrivent PRÉ-REMPLIES
        // de ce qu'il vient d'écrire : le travail est de remplacer les trois
        // longueurs données par leur mesure, pas de tout retaper.
        if (this.phase === 'chiffres') {
            const frac2 = (a, b) => `<div class="thr-frac">
                <input class="thr-case" data-chiffre="${a}" maxlength="6" autocomplete="off"
                    inputmode="text" aria-label="numérateur"><hr>
                <input class="thr-case" data-chiffre="${b}" maxlength="6" autocomplete="off"
                    inputmode="text" aria-label="dénominateur"></div>`;
            return `<div class="thr-ligne">d'après le théorème de Thalès :</div>`
                + `<div class="thr-ligne">${egaliteEnColonnes(this.egaliteEcrite || '')}</div>`
                + `<div class="thr-ligne thr-ligne--dit">Remplace par les longueurs que
                    l'énoncé donne ; recopie le nom des autres.</div>
                <div class="thr-eg">${frac2(0, 1)}<span class="thr-egal">=</span>${frac2(2, 3)}
                    <span class="thr-egal">=</span>${frac2(4, 5)}</div>
                <div class="thr-barre" style="margin-top:6px">
                    <button type="button" class="thr-btn thr-btn--fort" data-verif-chiffres>Vérifier</button>
                </div>`;
        }
        if (this.etatBloc('or') !== 'ici') {
            // L'ÉGALITÉ RETENUE S'ÉCRIT EN FRACTIONS, comme au tableau. Rémy :
            // « écris les fractions en colonne ». La barre oblique met le petit
            // segment À CÔTÉ du grand ; la barre horizontale le met DESSUS, et
            // c'est cette place-là qu'on apprend.
            return `<div class="thr-ligne">d'après le théorème de Thalès :</div>`
                + `<div class="thr-ligne">${egaliteEnColonnes(this.egaliteEcrite || '')}</div>`
                + (this.chiffresEcrits
                    ? `<div class="thr-ligne">${egaliteEnColonnes(this.chiffresEcrits)}</div>` : '');
        }
        const frac = (a, b) => `<div class="thr-frac">
            <input class="thr-case" data-case="${a}" maxlength="2" autocomplete="off"
                inputmode="text" aria-label="numérateur"><hr>
            <input class="thr-case" data-case="${b}" maxlength="2" autocomplete="off"
                inputmode="text" aria-label="dénominateur"></div>`;
        return `<div class="thr-ligne">d'après le théorème de Thalès :</div>
            <div class="thr-eg">${frac(0, 1)}<span class="thr-egal">=</span>${frac(2, 3)}
                <span class="thr-egal">=</span>${frac(4, 5)}</div>
            <div class="thr-palette">${ETIQUETTES.map(e =>
            `<button type="button" class="thr-eti" data-eti="${e}">${e}</button>`).join('')}</div>
            <div class="thr-barre" style="margin-top:6px">
                <button type="button" class="thr-btn thr-btn--fort" data-verif>Vérifier l'égalité</button>
                <button type="button" class="thr-btn" data-vider>Effacer</button>
            </div>`;
    }

    htmlDonc() {
        const e = this.etatBloc('donc');
        if (!e) return '';
        if (this.phase === 'isole') {
            return `<div class="thr-ligne">On isole ${this.cherche} par le produit en croix :</div>
                <div class="thr-choix">${this.isolements.map((x, i) =>
                `<button type="button" class="thr-opt" data-iso="${i}">${x.texte}</button>`).join('')}</div>`;
        }
        const lignes = `<div class="thr-ligne thr-ligne--calcul">${this.calc.formule}</div>`
            + `<div class="thr-ligne thr-ligne--calcul">${this.calc.chiffres}</div>`;
        if (this.phase === 'fini') {
            return lignes + `<div class="thr-ligne thr-ligne--calcul">${this.calc.conclusion}</div>`;
        }
        return lignes + `<div class="thr-resultat">
            <span class="thr-ligne thr-ligne--calcul">${this.cherche} =</span>
            <input class="thr-nb" data-nb inputmode="decimal" autocomplete="off"
                aria-label="la longueur cherchée">
            <span class="thr-ligne">cm</span>
            <button type="button" class="thr-btn thr-btn--fort" data-fin>Valider</button>
        </div>`;
    }

    // --- Ce que fait le doigt ---------------------------------------------------

    brancher() {
        if (this.isDemo) return;
        this.copieEl.querySelectorAll('[data-hyp]').forEach(b => {
            b.onclick = () => this.poserHypothese(Number(b.dataset.hyp), b);
        });
        const cases = [...this.copieEl.querySelectorAll('[data-case]')];
        cases.forEach((el, i) => {
            el.value = (this.saisie || [])[Number(el.dataset.case)] || '';
            el.onfocus = () => { this.focus = Number(el.dataset.case); };
            el.oninput = () => {
                this.lireCases();
                // Une case pleine passe la main à la suivante : on écrit une
                // égalité d'un trait, sans repointer six fois.
                if (el.value.length >= 2 && cases[i + 1]) cases[i + 1].focus();
            };
        });
        const chiffres = [...this.copieEl.querySelectorAll('[data-chiffre]')];
        chiffres.forEach((el, i) => {
            el.value = (this.chiffres || [])[Number(el.dataset.chiffre)] || '';
            el.oninput = () => {
                this.lireChiffres();
                if (el.value.length >= 2 && chiffres[i + 1]) chiffres[i + 1].focus();
            };
            el.onkeydown = (e) => { if (e.key === 'Enter') this.verifierChiffresEcrits(); };
        });
        const vc = this.copieEl.querySelector('[data-verif-chiffres]');
        if (vc) vc.onclick = () => this.verifierChiffresEcrits();
        this.copieEl.querySelectorAll('[data-eti]').forEach(b => {
            b.onclick = () => this.poserEtiquette(b.dataset.eti);
        });
        const verif = this.copieEl.querySelector('[data-verif]');
        if (verif) verif.onclick = () => this.verifierOr();
        const vider = this.copieEl.querySelector('[data-vider]');
        if (vider) vider.onclick = () => { this.saisie = []; this.dessinerCopie(); };
        this.copieEl.querySelectorAll('[data-iso]').forEach(b => {
            b.onclick = () => this.choisirIsolement(Number(b.dataset.iso), b);
        });
        const fin = this.copieEl.querySelector('[data-fin]');
        if (fin) {
            fin.onclick = () => this.conclure();
            const nb = this.copieEl.querySelector('[data-nb]');
            if (nb) nb.onkeydown = (e) => { if (e.key === 'Enter') this.conclure(); };
        }
    }

    lireCases() {
        this.saisie = [0, 1, 2, 3, 4, 5].map(i => {
            const el = this.copieEl.querySelector(`[data-case="${i}"]`);
            return el ? el.value.trim().toUpperCase() : '';
        });
    }

    /** Une étiquette touchée remplit la case au curseur, puis avance. */
    poserEtiquette(mot) {
        this.lireCases();
        const s = this.saisie.slice();
        let i = Number.isInteger(this.focus) ? this.focus : s.findIndex(x => !x);
        if (i < 0) i = 0;
        s[i] = mot;
        this.saisie = s;
        this.dessinerCopie();
        const suivant = this.copieEl.querySelector(`[data-case="${Math.min(5, i + 1)}"]`);
        if (suivant) suivant.focus();
    }

    poserHypothese(i, bouton) {
        if (this.phase !== 'sais') return;
        const h = this.hyp[i];
        if (!h.vrai) {
            bouton.classList.add('thr-opt--faux');
            bouton.disabled = true;
            this.fautes++;
            this.rate(`« Je sais que » : ${h.texte}`, h.texte, h.pourquoi);
            return this.note(h.pourquoi, 'ko');
        }
        this.prises.push(i);
        if (this.prises.length < 2) {
            this.dessinerCopie();
            return this.note('Bien. Il en manque une : le théorème de Thalès demande DEUX '
                + 'choses — des droites sécantes, et des parallèles.', 'ok');
        }
        this.phase = 'or';
        this.saisie = [];
        this.dessinerCopie();
        this.note('Les deux hypothèses y sont. Écris maintenant l\'égalité des trois '
            + 'rapports : tape les longueurs, ou touche les étiquettes.');
    }

    verifierOr() {
        this.lireCases();
        const v = verifierEgalite(this.saisie);
        if (!v.ok) {
            this.fautes++;
            this.rate('L\'égalité de Thalès', this.saisieTexte(), v.raison);
            return this.note(v.raison, 'ko');
        }
        this.egaliteEcrite = this.saisieTexte();
        this.egaliteCases = this.saisie.slice();
        // La ligne chiffrée part de ce qu'il vient d'écrire : il n'a que trois
        // cases à changer.
        this.chiffres = this.saisie.slice();
        this.phase = 'chiffres';
        this.dessinerCopie();
        this.note('C\'est bien l\'égalité de Thalès. Récris-la maintenant avec les '
            + 'longueurs de l\'énoncé : celles qu\'on connaît deviennent des nombres, '
            + 'les autres gardent leur nom.', 'ok');
    }

    verifierChiffresEcrits() {
        this.lireChiffres();
        const v = verifierChiffres(this.f, this.cherche, this.egaliteCases, this.chiffres);
        if (!v.ok) {
            this.fautes++;
            this.rate('La ligne chiffrée', this.chiffresTexte(), v.raison);
            return this.note(v.raison, 'ko');
        }
        this.chiffresEcrits = this.chiffresTexte();
        this.phase = 'isole';
        this.dessinerCopie();
        this.note('Voilà. Le rapport entièrement chiffré sert de pivot, et celui qui porte '
            + `${this.cherche} est celui qu'on isole.`, 'ok');
    }

    lireChiffres() {
        this.chiffres = [0, 1, 2, 3, 4, 5].map(i => {
            const el = this.copieEl.querySelector(`[data-chiffre="${i}"]`);
            return el ? el.value.trim().toUpperCase() : '';
        });
    }

    chiffresTexte() {
        const s = this.chiffres || [];
        return `${s[0]}/${s[1]} = ${s[2]}/${s[3]} = ${s[4]}/${s[5]}`;
    }

    saisieTexte() {
        const s = this.saisie || [];
        return `${s[0]}/${s[1]} = ${s[2]}/${s[3]} = ${s[4]}/${s[5]}`;
    }

    choisirIsolement(i, bouton) {
        if (this.phase !== 'isole') return;
        const x = this.isolements[i];
        if (!x.juste) {
            bouton.classList.add('thr-opt--faux');
            bouton.disabled = true;
            this.fautes++;
            this.rate('Le produit en croix', x.texte, x.pourquoi);
            return this.note(x.pourquoi, 'ko');
        }
        bouton.classList.add('thr-opt--pris');
        this.formeChoisie = x.texte;
        this.phase = 'donc';
        this.dessinerCopie();
        this.note('Il ne reste qu\'à poser le calcul. La calculatrice est autorisée.', 'ok');
        const nb = this.copieEl.querySelector('[data-nb]');
        if (nb) nb.focus();
    }

    conclure() {
        const nb = this.copieEl.querySelector('[data-nb]');
        if (!nb) return;
        const saisi = nb.value.trim().replace(',', '.');
        if (saisi === '') return;
        const valeur = Number(saisi);
        if (!Number.isFinite(valeur) || Math.abs(valeur - this.calc.valeur) > 0.011) {
            this.fautes++;
            this.rate(`${this.cherche} = ?`, nb.value.trim(),
                `Repose le calcul : ${this.calc.chiffres}.`);
            return this.note(`Ce n'est pas la bonne valeur. Repose le calcul : `
                + `${this.calc.chiffres}.`, 'ko');
        }
        this.phase = 'fini';
        this.dessinerCopie();
        // LE POINTAGE PORTE SUR LA RÉDACTION ENTIÈRE, pas sur le nombre final :
        // c'est elle, l'exercice. Une copie propre du premier coup vaut plus
        // qu'une copie raturée qui finit juste.
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `Rédiger : ${this.cherche} avec ${this.donnees.join(', ')}`,
            expected: this.calc.conclusion,
            given: this.calc.conclusion,
            points: Math.max(6, 20 - this.fautes * 4)
        });
        this.note('✅ La démonstration est complète : ce que tu sais, le théorème, et ce '
            + 'que tu en déduis. C\'est exactement ce qu\'on attend sur une copie.', 'ok');
        setTimeout(() => { if (this.isRunning) this.showNext(); }, 3200);
    }

    /** Une faute : elle compte, et le carnet d'erreurs sait CE QU'ELLE ÉTAIT. */
    rate(question, entre, pourquoi) {
        this.onWrongAnswer(null, {
            concept: COMPETENCE, questionText: question,
            input: entre, expected: pourquoi, silencieux: true
        });
    }

    note(texte, genre) {
        if (!this.noteEl) return;
        this.noteEl.textContent = texte || '';
        this.noteEl.className = 'thr-note' + (genre ? ` thr-note--${genre}` : '');
    }

    // --- La démonstration du robot ---------------------------------------------

    async runDemoSequence() {
        const cursor = createDemoCursor();
        const gate = createDemoGate(this.container);
        this.demoCursor = cursor;
        if (!await gate.waitTurn()) return;
        cursor.say('Une démonstration se rédige en trois temps, et ce sont eux qui '
            + 'rapportent les points — pas le nombre.', this.copieEl);
        if (!await cursor.pause(DEMO_SPEED.settle)) return;
        if (!await gate.waitTurn()) return;
        cursor.say('JE SAIS QUE : ce qui vient de l\'énoncé. Deux droites sécantes, et '
            + 'deux parallèles — Thalès ne demande rien d\'autre.', this.figEl);
        if (!await cursor.pause(DEMO_SPEED.settle)) return;
        if (!await gate.waitTurn()) return;
        cursor.say('OR : ce qui vient du cours. J\'écris l\'égalité des trois rapports, '
            + 'chaque petit segment sur le grand qui le contient.', this.copieEl);
        if (!await cursor.pause(DEMO_SPEED.settle)) return;
        if (!await gate.waitTurn()) return;
        cursor.say('DONC : ce que j\'en déduis. Produit en croix, calcul, conclusion — '
            + 'et la ligne où l\'on remplace par les valeurs ne se recopie pas.',
        this.copieEl);
        await cursor.pause(DEMO_SPEED.between);
    }
}

export function engineThalesRedaction(container, isDemo, params) {
    const jeu = new ThalesRedaction(container, isDemo, params);
    jeu.start();
    return jeu;
}
