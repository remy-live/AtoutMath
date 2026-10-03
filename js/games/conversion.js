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
                @media (hover: hover) {
                    .cv-btn:hover { background: var(--bg-hover); }
                }
                .cv-etape {
                    font-weight: 800; font-size: clamp(14px, 3.4cqw, 18px); text-align: center;
                    padding: 5px 14px; border-radius: 999px; color: #fff;
                    background: linear-gradient(135deg, var(--primary), var(--primary-hover));
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
                @media (hover: hover) {
                    .cv-tete-posee:hover { background: color-mix(in srgb, var(--primary) 14%, transparent);
                    outline: 2px solid var(--primary); outline-offset: -3px; }
                }

                /* Le chiffre posé, et le fantôme pendant le glissement. */
                .cv-chiffre { color: var(--text-main); }
                .cv-fantome { color: var(--primary-texte); opacity: .45; }
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

                /* LA RANGÉE DES POIGNÉES — une par frontière de colonne.

                   RÉMY : « une fois que l'on a posé la virgule, on ne peut
                   plus l'enlever ». C'était vrai, et pire : la virgule et les
                   zéros se posaient du MÊME clic, sur la MÊME case. Le premier
                   clic posait la virgule, tous les suivants basculaient un
                   zéro — la virgule ne bougeait donc plus jamais, pendant que
                   la consigne disait « clique une case pour la déplacer ».

                   ET ELLE NE POUVAIT MÊME PAS SE POSER UNE FOIS SUR TROIS :
                   le clic était refusé sur une case portant un chiffre, or la
                   virgule tombe sur une colonne occupée dans 27 à 31 % des
                   tirages (mesuré). L'exercice était alors infaisable.

                   DEUX GESTES, DEUX CIBLES. La virgule est une FRONTIÈRE entre
                   deux colonnes, pas un contenu de case : elle a maintenant sa
                   propre rangée, sous le tableau, où chaque poignée marque un
                   bord droit. Les cases redeviennent ce qu'elles sont — les
                   zéros —, et une poignée se reclique pour s'enlever. */
                .cv-poignee {
                    border: none !important; height: 26px !important; padding: 0 !important;
                    position: relative; background: transparent;
                }
                .cv-etape3 .cv-poignee { cursor: pointer; }
                /* Le repère discret : sans lui, on ne devine pas qu'il y a là
                   quelque chose à cliquer — et l'on cherche dans les cases. */
                .cv-etape3 .cv-poignee::before {
                    content: ''; position: absolute; right: -2px; top: 4px;
                    width: 4px; height: 11px; border-radius: 2px;
                    background: color-mix(in srgb, var(--text-muted) 40%, transparent);
                }
                @media (hover: hover) {
                    .cv-etape3 .cv-poignee:hover::before {
                        background: var(--primary); height: 17px;
                    }
                }
                .cv-etape3 .cv-poignee:focus-visible { outline: 2px solid var(--primary); }
                .cv-poignee--mise::after {
                    content: ','; position: absolute; right: -8px; top: -4px;
                    font-size: 26px; font-weight: 900; line-height: 1;
                    color: var(--danger);
                }

                /* CE QUI TOMBERAIT HORS DU TABLEAU, PENDANT QU'ON VISE.
                   L'aperçu fantôme perdait silencieusement les chiffres sans
                   colonne : on visait km avec 187 et l'on voyait « 7 », sans
                   rien pour dire que deux chiffres manquaient. */
                .cv-deborde-gauche::before, .cv-deborde-droite::after {
                    position: absolute; top: 50%; transform: translateY(-50%);
                    font-size: 15px; font-weight: 900; color: var(--danger);
                }
                .cv-deborde-gauche { position: relative; }
                .cv-deborde-gauche::before { content: '«'; left: -13px; }
                .cv-deborde-droite { position: relative; }
                .cv-deborde-droite::after { content: '»'; right: -13px; }

                .cv-etiquettes { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; }
                .cv-etiquette {
                    padding: 7px 13px; border-radius: 10px; cursor: grab; touch-action: none;
                    background: var(--bg-panel); border: 2px solid var(--border);
                    font-weight: 800; font-size: clamp(13px, 3.4cqw, 17px);
                }
                .cv-etiquette--prise { outline: 3px solid var(--primary); }
                .cv-etiquette[hidden] { display: none; }

                /* ÉCRAN COURT : ON RESSERRE CE QUI ENTOURE, PAS CE QU'ON
                   MANIPULE. Rémy : « on n'a pas accès aux unités ». Les
                   étiquettes à glisser sont en bas ; au-dessus, le bandeau,
                   les deux boutons, la consigne et l'énoncé occupaient à eux
                   seuls deux cent cinquante pixels, et les unités tombaient
                   sous la ligne de flottaison — c'est-à-dire hors de portée
                   pour qui ne pense pas à faire défiler. Tout ce préambule
                   maigrit ; les étiquettes, elles, gardent leur taille : ce
                   sont des cibles qu'on attrape au doigt. */
                @media (max-height: 640px) {
                    .cv-wrap { gap: 6px; padding: 6px; }
                    .cv-tete { gap: 8px; font-size: .8rem; }
                    .cv-btn { padding: 4px 9px; font-size: 12px; }
                    .cv-etape { padding: 3px 11px; font-size: clamp(12px, 3cqw, 15px); }
                    .cv-enonce { font-size: clamp(17px, 4.6cqw, 24px); }
                }

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
        this.brancherLaVue();
    }

    startGameLoop() { /* Pas d'horloge. */ }

    // --- Le clavier de la tablette ------------------------------------------------
    //
    // RÉMY : « quand on veut écrire sur la tablette, le clavier cache la
    // réponse ».
    //
    // MESURÉ AVANT DE CORRIGER, sur une tablette couchée de 1024 × 690 : le bas
    // du champ de réponse est à 57 % de la hauteur visible, et un clavier de
    // tablette en prend 35 à 45 %. Il passe donc dessous.
    //
    // ET IL N'Y AVAIT AUCUN RECOURS, ce qui est le vrai défaut : `.cv-wrap`
    // fait toute la hauteur et son contenu y tient, donc `scrollHeight ===
    // clientHeight` — mesuré — et il n'y a RIEN À FAIRE DÉFILER. L'élève ne
    // peut pas ramener le champ sous ses yeux ; il doit fermer le clavier pour
    // relire ce qu'il tape, le rouvrir pour écrire, et recommencer.
    //
    // `visualViewport` EST LE SEUL OBJET QUI DISE CE QUE L'ÉLÈVE VOIT quand le
    // clavier est ouvert : la fenêtre, elle, ne bouge pas (sur iOS elle ne
    // bouge jamais). On pose donc la hauteur du cadre sur ce qui reste visible,
    // ce qui le rend défilable, puis on ramène le champ au centre. C'est le
    // même geste que le duel (`games/duel.js`), pour la même raison.

    ajusterLaVue() {
        const wrap = this.container.querySelector('.cv-wrap');
        if (!wrap || !wrap.isConnected) return;
        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        const visible = vv ? vv.height : window.innerHeight;
        const haut = wrap.getBoundingClientRect().top - (vv ? vv.offsetTop : 0);
        // Un plancher : mieux vaut un cadre qui dépasse un peu qu'un cadre
        // écrasé à rien si la mesure part en vrille pendant une rotation.
        wrap.style.height = `${Math.max(240, Math.round(visible - haut))}px`;
        // ET LE CHAMP REVIENT SOUS LES YEUX. Redimensionner ne suffit pas : le
        // défilement reste où il était, et la réponse est en bas du cadre.
        const trou = this.container.querySelector('.cv-trou');
        if (trou && document.activeElement === trou) trou.scrollIntoView({ block: 'center' });
    }

    brancherLaVue() {
        this.mesurerLaVue = () => this.ajusterLaVue();
        this.ajusterLaVue();
        // Deux fois : la première mesure tombe parfois avant que la couche de
        // jeu ait fini de se poser, et l'en-tête peut encore changer de hauteur.
        requestAnimationFrame(this.mesurerLaVue);
        window.addEventListener('resize', this.mesurerLaVue);
        window.addEventListener('orientationchange', this.mesurerLaVue);
        const vv = window.visualViewport;
        if (vv) {
            vv.addEventListener('resize', this.mesurerLaVue);
            vv.addEventListener('scroll', this.mesurerLaVue);
        }
    }

    debrancherLaVue() {
        if (!this.mesurerLaVue) return;
        window.removeEventListener('resize', this.mesurerLaVue);
        window.removeEventListener('orientationchange', this.mesurerLaVue);
        const vv = window.visualViewport;
        if (vv) {
            vv.removeEventListener('resize', this.mesurerLaVue);
            vv.removeEventListener('scroll', this.mesurerLaVue);
        }
        this.mesurerLaVue = null;
    }

    // UN ÉCOUTEUR SUR `window` SURVIT AU CONTENEUR. Sans ce débranchement, la
    // mesure continuait de tourner après la sortie du jeu et cherchait un
    // `.cv-wrap` que `innerHTML = ''` venait d'effacer.
    destroy() {
        this.debrancherLaVue();
        super.destroy();
    }

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
        // LA RANGÉE DES POIGNÉES EXISTE À TOUTES LES ÉTAPES, même muette : si
        // elle n'apparaissait qu'à l'étape 3, le tableau grandirait de
        // vingt-six pixels sous les yeux au moment précis où l'élève vise une
        // case, et tout glisserait d'un cran.
        const poignees = document.createElement('tr');
        poignees.className = 'cv-poignees';
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

            const poi = document.createElement('td');
            poi.className = 'cv-poignee' + (this.virgule === u.rang ? ' cv-poignee--mise' : '');
            poi.dataset.virgule = u.rang;
            poi.setAttribute('role', 'button');
            poi.tabIndex = this.etape === 3 ? 0 : -1;
            poi.setAttribute('aria-label', `Poser la virgule après la colonne des ${u.symbole}`);
            poignees.appendChild(poi);
        });
        this.tableEl.innerHTML = '';
        this.tableEl.appendChild(entetes);
        this.tableEl.appendChild(cases);
        this.tableEl.appendChild(poignees);
        // La classe porte l'étape : c'est elle qui allume les poignées, et
        // elle évite d'écrire deux fois la même condition en JavaScript.
        this.tableEl.parentElement.classList.toggle('cv-etape3', this.etape === 3);

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
        this.tableEl.querySelectorAll('td[data-rang]').forEach(c => {
            c.classList.remove('cv-case--survol', 'cv-deborde-gauche', 'cv-deborde-droite');
            if (!c.querySelector('.cv-chiffre')) c.innerHTML = '';
        });
        if (!td) return;
        const rang = Number(td.dataset.rang);
        // CE QUI N'A PAS DE COLONNE DOIT SE VOIR, et non disparaître.
        //
        // L'aperçu posait chaque chiffre dans sa colonne « si elle existe » —
        // et se taisait sinon. En visant km avec 187, l'élève voyait « 7 » tout
        // seul et rien pour dire où étaient passés le 1 et le 8. Le tirage ne
        // propose plus de nombre qui déborde (voir `tientDansLeTableau`), mais
        // un placement FAUX en fait toujours déborder — et c'est précisément
        // là qu'il faut le montrer, puisque c'est l'erreur qu'on travaille.
        let horsGauche = 0, horsDroite = 0;
        apercuPlacement(ex.valeur, rang).forEach(c => {
            const q = this.tableEl.querySelector(`td[data-rang="${c.colonne}"]`);
            if (q) {
                q.innerHTML = `<span class="cv-fantome">${c.chiffre}</span>`;
                q.classList.add('cv-case--survol');
                return;
            }
            if (c.colonne > this.colonnes[0]) horsGauche++; else horsDroite++;
        });
        const cases = this.tableEl.querySelectorAll('td[data-rang]');
        if (horsGauche && cases.length) cases[0].classList.add('cv-deborde-gauche');
        if (horsDroite && cases.length) cases[cases.length - 1].classList.add('cv-deborde-droite');
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

        // ── DEUX GESTES, DEUX CIBLES ──────────────────────────────────────
        //
        // Les deux partaient du même clic sur la même case, et l'ordre des
        // clics décidait du sens : le premier posait la virgule, les suivants
        // basculaient un zéro. Conséquence, signalée par Rémy : « une fois que
        // l'on a posé la virgule, on ne peut plus l'enlever » — rien, jamais,
        // ne pouvait la déplacer, pendant que la consigne affirmait le
        // contraire. Et le clic étant refusé sur une case portant un chiffre,
        // la virgule ne pouvait même pas se poser dans 27 à 31 % des tirages
        // (mesuré sur 400 tirages par famille) : l'exercice était infaisable.
        //
        // La virgule a donc sa propre rangée de poignées, sous les cases.
        this.tableEl.querySelectorAll('td[data-virgule]').forEach(poi => {
            const rang = Number(poi.dataset.virgule);
            const basculer = () => {
                if (this.isDemo) return;
                // RECLIQUER L'ENLÈVE. C'est la phrase de Rémy, mot pour mot, et
                // c'est aussi le geste qu'on essaie d'abord quand on s'est
                // trompé.
                this.virgule = this.virgule === rang ? null : rang;
                this.majEtape3();
            };
            poi.addEventListener('click', basculer);
            poi.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); basculer(); }
            });
        });

        // Et les cases ne font plus qu'une chose : les zéros de comblement.
        this.tableEl.querySelectorAll('td[data-rang]').forEach(td => {
            const rang = Number(td.dataset.rang);
            td.style.cursor = 'pointer';
            td.addEventListener('click', () => {
                if (this.isDemo) return;
                if (td.querySelector('.cv-chiffre')) return;   // un chiffre ne se remplace pas
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
        // LE CLAVIER DE LA TABLETTE CACHAIT LA RÉPONSE — voir `brancherLaVue`.
        // Le délai laisse au clavier le temps de monter : mesurer avant qu'il
        // soit là, c'est mesurer l'écran d'avant.
        trou.addEventListener('focus', () => {
            setTimeout(() => {
                if (!trou.isConnected) return;
                this.ajusterLaVue();
                trou.scrollIntoView({ block: 'center' });
            }, 120);
        });
        rep.appendChild(trou);
        const u = document.createElement('span');
        u.textContent = ex.arrivee;
        rep.appendChild(u);
        this.zoneEl.appendChild(rep);
        this.attendu = attendu;
        this.majEtape3();
    }

    /**
     * Le message d'accompagnement de l'étape 3, selon ce qui reste à faire.
     *
     * CES PHRASES DOIVENT DIRE LE GESTE QUI MARCHE. L'une d'elles disait
     * « clique une case pour la déplacer » alors qu'aucun clic ne déplaçait
     * rien : l'élève suivait la consigne, il ne se passait rien, et il en
     * concluait que le logiciel était cassé — ce qu'il était.
     */
    majEtape3() {
        this.dessinerTableSeulement();
        const a = this.attendu;
        if (this.virgule === null) {
            this.note(`Clique le petit repère SOUS la colonne des ${this.exercice.arrivee} : `
                + 'la virgule se pose juste après cette colonne.');
            return;
        }
        if (this.virgule !== a.colonneVirgule) {
            this.note('La virgule se pose après la colonne de l\'unité demandée, jamais ailleurs. '
                + 'Clique un autre repère sous le tableau pour la déplacer, ou le même pour '
                + 'l\'enlever.', 'ko');
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
        // ET LA POIGNÉE SUIT. Sans cette boucle, la virgule se déplaçait dans
        // l'état et sur la rangée des chiffres, mais la poignée restait
        // allumée à son ancienne place — deux virgules à l'écran, dont une
        // fausse.
        this.tableEl.querySelectorAll('td[data-virgule]').forEach(poi => {
            poi.classList.toggle('cv-poignee--mise', this.virgule === Number(poi.dataset.virgule));
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
