// LE QUADRILATÈRE QUI SE TRANSFORME.
//
// Rémy : « on a un quadrilatère qui n'a rien de particulier, et on a des
// vignettes que l'on peut faire glisser sur le quadrilatère du genre côté
// opposé parallèle, et on voit le quadrilatère se transformer en absorbant la
// nouvelle propriété et on doit deviner ce que ça va devenir. Cela peut être
// très progressif avec l'organigramme qui apparaît au fur et à mesure. »
//
// DEUX TEMPS, ET RÉMY A TRANCHÉ L'ORDRE :
//   1. on lâche une vignette sur la figure, ET ELLE SE DÉFORME AUSSITÔT ;
//   2. on dit ce qu'elle est DEVENUE.
//
// Ce n'est pas l'ordre qu'on avait bâti. On demandait d'abord de prédire, puis
// on jouait la déformation en guise de correction — l'idée étant que
// l'animation ne devait pas donner la réponse. Rémy, banc d'essai : « quand tu
// transformes la figure fais-le dès que l'on dépose. Et il faut alors
// deviner. »
//
// IL A RAISON, ET VOICI POURQUOI. Prédire suppose de se représenter une figure
// qu'on ne voit pas — c'est un exercice de plus, et il passe AVANT celui qu'on
// voulait faire faire. La déformation immédiate, elle, est la seule chose que
// le papier ne sait pas montrer : on voit les côtés glisser jusqu'à devenir
// parallèles, et ce mouvement EST la leçon. Nommer ce qu'on obtient reste un
// vrai travail — il faut lire le codage, compter les paires, chercher l'angle
// droit — et c'est exactement le geste qu'on demandera devant une figure sur
// une feuille. Le nom ne s'affiche donc qu'APRÈS la réponse.
//
// ET PAS D'ORGANIGRAMME ICI. Rémy : « ne mets pas l'organigramme dans cet
// exercice » — les mots y débordaient de leurs cases sur un téléphone, mais
// surtout il répondait à la question : le chemin s'y allumait jusqu'à la case
// qu'on demandait de nommer. L'arbre a son exercice à lui.
//
// CES TROIS TEMPS, IL A FALLU LES MONTRER. Rémy, banc d'essai : « l'exercice le
// quadrilatère qui se transforme, on ne comprend rien. » Il avait raison, et
// pour une raison précise : au temps 2, l'écran ne portait plus AUCUNE trace de
// ce qu'on venait de poser. Les vignettes disparaissaient, remplacées par des
// noms de familles ; la figure, elle, n'avait pas bougé — puisque justement
// elle ne doit pas bouger avant qu'on ait répondu. L'élève voyait donc un
// quadrilatère quelconque, inchangé, et six noms à choisir : la question
// « que va-t-elle devenir ? » ne s'appuyait sur rien de visible.
//
// Trois choses le réparent, et elles vont ensemble :
//
//   · LA VIGNETTE POSÉE RESTE ÉPINGLÉE au-dessus de la figure pendant qu'on
//     nomme : c'est elle qui explique ce qui vient de bouger.
//   · LES DEUX TEMPS SONT ÉCRITS EN HAUT, et celui où l'on est s'allume.
//   · LE CODAGE A SA LÉGENDE, sous la figure, et elle ne montre que les marques
//     effectivement dessinées.
//   · LE NOM DE LA FIGURE EST MASQUÉ PENDANT QU'ON LE CHERCHE. Il est écrit
//     sous le dessin le reste du temps — c'est ainsi qu'on sait d'où l'on
//     part —, et il redevient « ? » à l'instant où la question est posée.
//
// LE CODAGE SE GAGNE AU PASSAGE. Chaque propriété posée reste sur la figure
// sous sa forme de géomètre — flèches de parallélisme, traits d'égalité, petit
// carré d'angle droit. L'élève apprend le codage sans qu'on le lui enseigne :
// c'est la mémoire de ce qu'il a posé.
//
// Les règles — les propriétés, la déformation, le nom de ce qui est dessiné —
// vivent dans core/quadriMorph.js, testées sans navigateur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { brancherGlisserPalette } from '../core/activities/paletteDrag.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../core/demoPointer.js';
import { FAMILLES } from '../core/quadrilateres.js';
import {
    PALIERS, CADRE, proprieteDe, genererDefi, poser, familleApres
} from '../core/quadriMorph.js';

const COMPETENCE = 'geo.quadrilateres.familles';
const DUREE_MORPH = 900;

const nomFamille = (id) => (FAMILLES.find(f => f.id === id) || {}).nom || id;

class QuadriMorph extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'quadri-morph');
        this.rng = makeRng(this.params.seed);
        this.palier = PALIERS[this.params.palier] ? this.params.palier : 'decouverte';
        this.phase = 'choisir';       // choisir → deviner
        this.carte = null;
        this.suite = null;
    }

    render() {
        this.container.innerHTML = `
            <style>
                .qm-wrap {
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                    width: 100%; height: 100%; padding: 10px 12px 12px; box-sizing: border-box;
                    color: var(--text-main); container-type: inline-size; min-height: 0;
                    overflow-y: auto;
                }
                .qm-consigne { font-weight: 800; font-size: 1.02rem; text-align: center; }

                /* LES TROIS TEMPS, ÉCRITS. Sans eux, le passage du choix a la
                   devinette ressemblait a un changement de boutons sans raison. */
                .qm-etapes {
                    display: flex; gap: 5px; align-items: center; justify-content: center;
                    flex-wrap: wrap; font-size: .76rem; font-weight: 800;
                }
                .qm-etape {
                    padding: 3px 11px; border-radius: 999px; border: 2px solid var(--border);
                    background: var(--bg-panel); color: var(--text-muted);
                }
                .qm-etape--ici {
                    border-color: var(--primary); color: var(--primary);
                    background: color-mix(in srgb, var(--primary) 12%, var(--bg-panel));
                }
                .qm-etape--faite { opacity: .5; }
                .qm-etapes span { color: var(--text-muted); }

                /* LA PROPRIÉTÉ QU'ON VIENT DE POSER, épinglée au-dessus de la
                   figure : elle doit rester sous les yeux pendant qu'on devine. */
                .qm-posee {
                    display: block; margin-bottom: 5px; padding: 6px 10px; border-radius: 11px;
                    border: 2px dashed var(--warning, #f59e0b); text-align: center;
                    background: rgba(245, 158, 11, .10); font-weight: 800; font-size: .8rem;
                    line-height: 1.25;
                }
                .qm-legende {
                    text-align: center; font-size: .72rem; color: var(--text-muted);
                    line-height: 1.35; margin-top: 3px; min-height: 1.35em;
                }

                .qm-corps {
                    display: flex; gap: 16px; align-items: flex-start; justify-content: center;
                    width: 100%; flex-wrap: wrap;
                }
                /* LA FIGURE, SEULE. L'arbre vivait à côté d'elle ; Rémy l'a
                   renvoye a son propre exercice, et la figure a pris la place. */
                .qm-scene { flex: 0 1 340px; min-width: 230px; max-width: 340px; }
                .qm-fig { width: 100%; height: auto; display: block;
                    background: var(--bg-panel); border: 1px solid var(--border);
                    border-radius: 16px; }
                .qm-fig--visee { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,.25); }
                .qm-nom {
                    text-align: center; font-weight: 800; font-size: 1.05rem; margin-top: 6px;
                    color: var(--primary); min-height: 1.4em;
                }
                /* Le nom se cache pendant qu'on le cherche : c'est la question. */
                .qm-nom--cache { color: var(--text-muted); }

                /* LES VIGNETTES. Du texte, pas des pastilles : « les diagonales
                   se coupent en leur milieu » ne tient pas dans un carré de 56
                   pixels, et c'est la règle globale des jetons. */
                .qm-cartes { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center;
                    width: 100%; max-width: 660px; }
                .qm-cartes .kk-chip {
                    width: auto; height: auto; min-height: 0; padding: 8px 13px;
                    border-radius: 12px; font-size: .84rem; font-weight: 700; line-height: 1.25;
                    background: var(--bg-panel); border: 2px solid var(--border);
                    color: var(--text-main); cursor: grab; max-width: 220px; text-align: center;
                }
                .qm-cartes .kk-chip:hover { border-color: var(--primary); }
                .qm-chip--posee { opacity: .45; pointer-events: none; border-style: dashed; }

                .qm-noms { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
                .qm-nom-btn {
                    padding: 9px 16px; border-radius: 12px; border: 2px solid var(--border);
                    background: var(--bg-panel); color: var(--text-main);
                    font: inherit; font-weight: 800; cursor: pointer;
                }
                .qm-nom-btn:hover { border-color: var(--primary); }
                .qm-nom-btn--juste { border-color: var(--success); background: rgba(22,163,74,.12); }
                .qm-nom-btn--faux { border-color: var(--danger); background: rgba(220,38,38,.1); }

                .qm-note { min-height: 2.6em; text-align: center; font-size: .88rem;
                    line-height: 1.4; color: var(--text-muted); max-width: 620px; }
                .qm-note--ok { color: var(--success); font-weight: 700; }
                .qm-note--ko { color: var(--danger); font-weight: 600; }
                .qm-barre { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
                .qm-btn {
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                    border-radius: 9px; cursor: pointer; font: inherit; font-weight: 700;
                    padding: 7px 12px; font-size: .85rem; min-height: 38px;
                }

                /* SUR TÉLÉPHONE LA FIGURE SE SERRE. À sa taille de bureau elle
                   repoussait les vignettes sous le pli : on ne voyait plus ce
                   sur quoi il fallait agir. */
                @container (max-width: 640px) {
                    /* MESURÉ SUR UN 375 x 634 : la figure a 250 pixels de large et
                       trois des cinq noms de familles passaient sous le pli — au
                       moment de répondre, on ne voyait pas de quoi répondre. Tout
                       ce qui entoure la figure se resserre, et la figure avec. */
                    .qm-wrap { gap: 5px; padding: 6px 10px 8px; }
                    .qm-corps { flex-direction: column; align-items: center; gap: 4px; }
                    .qm-scene { flex: 0 0 auto; width: min(205px, 62%); max-width: 205px; }
                    .qm-cartes .kk-chip { font-size: .78rem; padding: 7px 10px; }
                    .qm-nom { font-size: .95rem; margin-top: 2px; }
                    .qm-consigne { font-size: .92rem; }
                    .qm-posee { font-size: .74rem; padding: 4px 8px; margin-bottom: 3px; }
                    .qm-nom-btn { padding: 7px 12px; font-size: .88rem; }
                    .qm-note { min-height: 2.2em; font-size: .8rem; }
                }
            </style>
            <div class="qm-wrap">
                <div class="qm-etapes" data-etapes></div>
                <div class="qm-consigne" data-consigne></div>
                <div class="qm-corps">
                    <div class="qm-scene">
                        <div data-posee></div>
                        <div data-figure></div>
                        <div class="qm-nom" data-famille></div>
                        <div class="qm-legende" data-legende></div>
                    </div>
                </div>
                <div data-zone></div>
                <div class="qm-note" data-note></div>
                <div class="qm-barre">
                    <button type="button" class="qm-btn" data-recommencer>↺ Repartir du départ</button>
                    <button type="button" class="qm-btn" data-neuf>Autre figure</button>
                </div>
            </div>`;

        this.consigneEl = this.container.querySelector('[data-consigne]');
        this.etapesEl = this.container.querySelector('[data-etapes]');
        this.poseeEl = this.container.querySelector('[data-posee]');
        this.legendeEl = this.container.querySelector('[data-legende]');
        this.figEl = this.container.querySelector('[data-figure]');
        this.familleEl = this.container.querySelector('[data-famille]');
        this.zoneEl = this.container.querySelector('[data-zone]');
        this.noteEl = this.container.querySelector('[data-note]');
        this.container.querySelector('[data-recommencer]').onclick = () => this.recommencer();
        this.container.querySelector('[data-neuf]').onclick = () => this.showNext();
    }

    startGameLoop() { this.poserDefi(); }

    showNext() { return this.poserDefi(); }

    poserDefi() {
        this.defi = genererDefi({ rng: this.rng, palier: this.palier });
        this.phase = 'choisir';
        this.carte = null;
        this.suite = null;
        this.revele = false;
        this.dessiner();
        this.note('Pose une propriété sur la figure : elle se déformera aussitôt pour la '
            + 'respecter. À toi de dire ce qu\'elle sera devenue.');
        return true;
    }

    recommencer() {
        if (this.isDemo || !this.defi) return;
        // ON REPART DE LA FIGURE DE DÉPART, pas du quadrilatère quelconque : le
        // défi peut commencer sur un parallélogramme, et le remettre à plat
        // changerait l'exercice au lieu de le rejouer.
        const deja = this.defi.deja || [];
        this.defi = {
            ...this.defi, points: this.defi.depart,
            posees: [...deja], famille: familleApres(deja)
        };
        this.phase = 'choisir';
        this.carte = null;
        this.suite = null;
        this.revele = false;
        this.dessiner();
        this.note('On repart de la figure de départ.');
    }

    // --- Le dessin ------------------------------------------------------------

    dessiner() {
        this.figEl.innerHTML = figureSvg(this.defi.points, this.defi.posees);
        this.majNom();
        this.legendeEl.innerHTML = legendeDuCodage(this.defi.posees);
        // La vignette qu'on vient de lâcher reste épinglée pendant qu'on
        // cherche le nom : c'est elle qui explique ce qui a bougé.
        this.poseeEl.innerHTML = this.phase === 'deviner' && this.carte
            ? `<div class="qm-posee">Tu viens de poser :<br>« ${echapper(proprieteDe(this.carte).nom)} »</div>`
            : '';
        this.dessinerZone();
    }

    /**
     * LE NOM SE CACHE PENDANT QU'ON LE CHERCHE.
     *
     * Il est écrit sous la figure le reste du temps, et il le faut : c'est
     * ainsi qu'on sait d'où l'on part, puisqu'on ne part plus toujours du
     * quadrilatère quelconque. Mais l'afficher pendant qu'on demande « qu'est-ce
     * que c'est devenu ? » donnerait la réponse à lire au lieu de la chercher.
     */
    majNom() {
        const cache = this.phase === 'deviner' && !this.revele;
        this.familleEl.textContent = cache ? '?'
            : (this.defi.posees.length ? nomFamille(this.defi.famille) : 'Quadrilatère quelconque');
        this.familleEl.classList.toggle('qm-nom--cache', cache);
    }

    /** Les deux temps, et celui où l'on est. */
    majEtapes() {
        const temps = [
            ['choisir', '1. Pose la propriété'],
            ['deviner', '2. Nomme la figure']
        ];
        const rang = temps.findIndex(t => t[0] === this.phase);
        this.etapesEl.innerHTML = temps.map(([id, mot], i) => {
            const etat = i === rang ? ' qm-etape--ici' : (i < rang ? ' qm-etape--faite' : '');
            return `<b class="qm-etape${etat}">${mot}</b>`;
        }).join('<span>→</span>');
    }

    dessinerZone() {
        this.majEtapes();
        if (this.phase === 'deviner') {
            this.consigneEl.textContent = 'La figure a absorbé la propriété. '
                + 'Qu\'est-elle devenue ?';
            this.zoneEl.innerHTML = `<div class="qm-noms">${FAMILLES.map(f =>
                `<button type="button" class="qm-nom-btn" data-fam="${f.id}">${f.nom}</button>`
            ).join('')}</div>`;
            this.zoneEl.querySelectorAll('[data-fam]').forEach(b => {
                b.onclick = () => this.deviner(b.dataset.fam, b);
            });
            return;
        }
        const reste = this.defi.aPoser - this.defi.posees.length;
        // LES VIGNETTES RESTENT CLIQUABLES APRÈS LE COMPTE, et la consigne doit le
        // dire : elle annonçait « passe à une autre figure » devant des cartes
        // encore actives, ce qui laissait croire que le jeu s'était bloqué.
        this.consigneEl.textContent = reste > 0
            ? `Pose une propriété sur la figure — encore ${reste} à poser.`
            : 'Bravo, tu es descendu jusqu\'en bas. Continue à poser si tu veux, ou '
              + 'prends une autre figure.';
        this.zoneEl.innerHTML = `<div class="qm-cartes">${this.defi.cartes.map(id => {
            const p = proprieteDe(id);
            const posee = this.defi.posees.includes(id);
            // LE NOM COURT SUR LA VIGNETTE, LE NOM ENTIER DANS LA QUESTION.
            // Huit vignettes de deux lignes prenaient quatre rangées et
            // poussaient la note hors de l'écran ; et de toute façon la phrase
            // complète est relue au moment où l'on demande ce que la figure va
            // devenir — c'est là qu'elle compte.
            return `<button type="button" class="kk-chip${posee ? ' qm-chip--posee' : ''}"
                data-carte="${id}" title="${echapper(p.nom)}"
                ${posee ? 'disabled' : ''}>${echapper(p.court)}</button>`;
        }).join('')}</div>`;
        this.brancherCartes();
    }

    brancherCartes() {
        if (this.isDemo) return;
        this.zoneEl.querySelectorAll('[data-carte]').forEach(chip => {
            chip.onclick = () => this.choisir(chip.dataset.carte);
        });
        // ET ON PEUT LA GLISSER, comme Rémy l'a demandé : le geste de POSER une
        // propriété SUR la figure dit ce que le clic ne dit pas — que la
        // propriété va dans la figure, et non à côté.
        brancherGlisserPalette(this.container, {
            classeVisee: 'qm-fig--visee',
            bloque: () => this.phase !== 'choisir',
            cibleSous: (e) => {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                return (el && el.closest('.qm-fig')) || null;
            },
            deposer: (cible, chip) => this.choisir(chip.dataset.carte)
        });
    }

    /**
     * ON LÂCHE LA VIGNETTE, ET LA FIGURE SE DÉFORME AUSSITÔT.
     *
     * Rémy : « quand tu transformes la figure fais-le dès que l'on dépose ».
     * L'état ne bascule sur la question qu'une fois le mouvement fini : tant
     * que les sommets glissent, il n'y a rien à nommer, et proposer les
     * réponses trop tôt inviterait à répondre sans regarder.
     */
    choisir(id) {
        if (this.isDemo || this.phase !== 'choisir' || this.anime) return;
        if (!id || this.defi.posees.includes(id)) return;
        this.carte = id;
        this.suite = poser(this.defi, id);
        this.anime = true;
        this.note('Regarde la figure se déformer pour respecter la propriété…');
        this.animer(this.defi.points, this.suite.points, this.suite.posees, () => {
            this.anime = false;
            // L'état de la figure est acquis — sauf sa FAMILLE, qui est
            // justement la question. On la garde de côté jusqu'à la réponse.
            this.defi = { ...this.defi, points: this.suite.points, posees: this.suite.posees };
            this.phase = 'deviner';
            this.dessiner();
            this.note('Lis le codage : combien de paires de côtés parallèles, '
                + 'quelles longueurs égales, y a-t-il un angle droit ?');
        });
    }

    deviner(famille, bouton) {
        if (this.isDemo || this.phase !== 'deviner' || !this.suite) return;
        const suite = this.suite;
        const juste = famille === suite.famille;
        const avant = suite.avant;

        bouton.classList.add(juste ? 'qm-nom-btn--juste' : 'qm-nom-btn--faux');
        if (!juste) {
            const bon = this.zoneEl.querySelector(`[data-fam="${suite.famille}"]`);
            if (bon) bon.classList.add('qm-nom-btn--juste');
        }
        const detail = `${nomFamille(avant)} + « ${proprieteDe(this.carte).nom} »`;
        if (juste) {
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: detail, expected: nomFamille(suite.famille), given: nomFamille(famille),
                points: 12
            });
        } else {
            this.onWrongAnswer(null, {
                concept: COMPETENCE, questionText: detail,
                input: nomFamille(famille), expected: nomFamille(suite.famille), silencieux: true
            });
        }

        // LA FIGURE A DÉJÀ BOUGÉ — il ne reste qu'à la nommer. On laisse une
        // seconde sur le bouton coloré avant de rendre le nom : c'est le temps
        // de voir lequel était le bon, sans quoi la correction passe trop vite
        // pour être lue.
        this.defi = { ...this.defi, famille: suite.famille };
        // ET LE NOM REVIENT TOUT DE SUITE SOUS LA FIGURE. Il ne réapparaissait
        // qu'au changement de temps, une seconde et demie plus tard, quand les
        // boutons colorés avaient déjà disparu : la réponse et la figure qu'elle
        // nomme n'étaient jamais à l'écran ensemble.
        this.revele = true;
        this.majNom();
        this.note(`${juste ? '✅ ' : '❌ '}${juste ? 'Oui : ' : 'C\'était '}`
            + `${nomFamille(suite.famille).toLowerCase()}. ${suite.mot}`, juste ? 'ok' : 'ko');
        setTimeout(() => {
            if (!this.isRunning || this.phase !== 'deviner') return;
            this.phase = 'choisir';
            this.carte = null;
            this.suite = null;
            this.revele = false;
            this.dessiner();
        }, 1600);
    }

    /**
     * LA FIGURE SE DÉFORME, elle ne saute pas. C'est TOUT l'intérêt de
     * l'exercice : voir les sommets glisser jusqu'à ce que la contrainte soit
     * satisfaite. Une interpolation droite entre les deux états suffit — et
     * vaut mieux que le chemin du solveur, qui zigzague.
     */
    animer(de, vers, posees, fin) {
        if (this.isDemo || typeof requestAnimationFrame !== 'function') { fin(); return; }
        const t0 = performance.now();
        const pas = (t) => {
            const k = Math.min(1, (t - t0) / DUREE_MORPH);
            // Un départ et une arrivée doux : la figure « se pose » au lieu de
            // s'arrêter net.
            const a = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
            const P = de.map((p, i) => [
                p[0] + (vers[i][0] - p[0]) * a,
                p[1] + (vers[i][1] - p[1]) * a
            ]);
            this.figEl.innerHTML = figureSvg(P, posees, { pendant: true });
            if (k < 1) requestAnimationFrame(pas);
            else fin();
        };
        requestAnimationFrame(pas);
    }

    note(texte, genre) {
        this.noteEl.textContent = texte || '';
        this.noteEl.className = 'qm-note' + (genre ? ` qm-note--${genre}` : '');
    }

    // --- La démonstration du robot ---------------------------------------------

    async runDemoSequence() {
        const cursor = createDemoCursor();
        const gate = createDemoGate(this.container);
        this.demoCursor = cursor;
        if (!await gate.waitTurn()) return;
        cursor.say('Une propriété, ce n\'est pas une étiquette : c\'est une CONTRAINTE.',
            this.figEl);
        if (!await cursor.pause(DEMO_SPEED.settle)) return;
        if (!await gate.waitTurn()) return;
        cursor.say('Je la pose sur la figure, et la figure se déforme AUSSITÔT pour la '
            + 'respecter.', this.zoneEl);
        if (!await cursor.pause(DEMO_SPEED.settle)) return;
        if (!await gate.waitTurn()) return;
        cursor.say('Puis je LIS ce que j\'obtiens : les chevrons disent les côtés '
            + 'parallèles, les petits traits les longueurs égales. Chaque propriété en '
            + 'plus RÉTRÉCIT la famille.', this.familleEl);
        await cursor.pause(DEMO_SPEED.between);
    }
}

// --- La figure, avec le codage du géomètre -------------------------------------

/**
 * LE CODAGE EST LA MÉMOIRE DE CE QU'ON A POSÉ. Flèches sur les côtés
 * parallèles, traits sur les côtés de même longueur, petit carré dans l'angle
 * droit : c'est la notation du collège, et l'élève l'apprend ici sans qu'on la
 * lui enseigne — parce qu'elle DIT quelque chose dont il a besoin.
 */
export function figureSvg(P, posees = [], { pendant = false } = {}) {
    const T = (v) => Math.round(v * 100) / 100;
    const d = P.map((p, i) => `${i ? 'L' : 'M'}${T(p[0])} ${T(p[1])}`).join(' ') + ' Z';
    const marques = marquesDe(P, caracteresVus(posees), posees);
    return `<svg class="qm-fig${pendant ? ' qm-fig--pendant' : ''}" viewBox="0 0 ${CADRE} ${CADRE}"
        role="img" aria-label="quadrilatère">
        <path d="${d}" fill="rgba(99,102,241,.10)" stroke="#4338ca" stroke-width="1.6"
            stroke-linejoin="round"/>
        ${marques}
        ${P.map((p, i) => `<text x="${T(p[0] + (p[0] < 50 ? -4.5 : 4.5))}"
            y="${T(p[1] + (p[1] < 50 ? -3.5 : 5.5))}" font-size="6" font-weight="800"
            fill="#1a202c" text-anchor="middle">${'ABCD'[i]}</text>`).join('')}
    </svg>`;
}

/**
 * LE CODAGE D'UN JEU DE CARACTÈRES, sur cette figure-là.
 *
 * `ids` sert aux marques qui ne se déduisent pas des quatre caractères — celles
 * des diagonales, qui ne changent pas la famille mais disent ce qu'on a posé.
 */
function marquesDe(P, c, ids = []) {
    const T = (v) => Math.round(v * 100) / 100;
    let out = '';
    // Les flèches de parallélisme : une sur la première paire, deux sur la seconde.
    if (c.par1) out += chevrons(P, 0) + chevrons(P, 2);
    if (c.par2) out += chevrons(P, 1, 2) + chevrons(P, 3, 2);
    // Les traits d'égalité.
    if (c.egaux) out += [0, 1, 2, 3].map(i => barres(P, i, 1)).join('');
    else if (c.opposes) out += barres(P, 0, 1) + barres(P, 2, 1) + barres(P, 1, 2) + barres(P, 3, 2);
    // Le petit carré de l'angle droit, en A.
    if (c.droit) out += angleDroit(P);

    // LES DIAGONALES DISENT CE QU'ON LEUR DEMANDE. Elles n'étaient que deux
    // traits pointillés : on voyait qu'il était question d'elles, pas ce qu'on
    // en exigeait. Chaque vignette pose donc sa marque — les longueurs égales,
    // les milieux confondus, l'angle droit au croisement.
    const surDiag = ids.filter(id => id.startsWith('diagonales'));
    if (!surDiag.length) return out;
    const [A, B, C, D] = P;
    out += [[A, C], [B, D]].map(([u, v]) =>
        `<path d="M${T(u[0])} ${T(u[1])} L${T(v[0])} ${T(v[1])}" stroke="#9467bd"
        stroke-width="0.8" stroke-dasharray="3 2" fill="none"/>`).join('');
    const I = croisement(A, C, B, D);
    if (surDiag.includes('diagonalesEgales')) {
        out += tirets(A, C, 0.18, 1, '#9467bd') + tirets(B, D, 0.18, 1, '#9467bd');
    }
    if (surDiag.includes('diagonalesMilieu') && I) {
        // Une marque sur chaque demi-diagonale, et les deux diagonales n'ont pas
        // la même : c'est ainsi qu'on code deux égalités différentes.
        out += tirets(A, I, 0.5, 1, '#9467bd') + tirets(I, C, 0.5, 1, '#9467bd')
            + tirets(B, I, 0.5, 2, '#9467bd') + tirets(I, D, 0.5, 2, '#9467bd');
    }
    if (surDiag.includes('diagonalesPerpendiculaires') && I) {
        out += angleDroitEn(I, A, B, '#9467bd');
    }
    return out;
}

/** Ce que le codage doit montrer, d'après ce qui a été posé. */
function caracteresVus(posees) {
    const c = { par1: false, par2: false, egaux: false, droit: false, opposes: false };
    posees.forEach(id => {
        if (id === 'opposesParalleles') { c.par1 = true; c.par2 = true; }
        if (id === 'quatreCotesEgaux') c.egaux = true;
        if (id === 'cotesOpposesEgaux') c.opposes = true;
        if (id === 'unAngleDroit') c.droit = true;
    });
    return c;
}

/**
 * LA LÉGENDE DU CODAGE — et elle ne montre que ce qui est dessiné.
 *
 * Une légende complète, affichée en permanence, redevient une liste à
 * apprendre : trois marques à retenir dont deux ne sont pas sur la figure. Ici
 * elle n'explique QUE ce qu'on a sous les yeux, au moment où l'on s'en sert.
 */
export function legendeDuCodage(posees = []) {
    const ids = posees;
    const c = caracteresVus(ids);
    const bouts = [];
    if (c.par1 || c.par2) bouts.push('<b style="color:#2ca02c">››</b> mêmes chevrons = parallèles');
    if (c.egaux || c.opposes) bouts.push('<b style="color:#d62728">|</b> mêmes traits = même longueur');
    if (c.droit) bouts.push('<b style="color:#e07b00">⌐</b> angle droit');
    if (ids.some(id => id.startsWith('diagonales'))) {
        bouts.push('<b style="color:#9467bd">┄</b> les diagonales');
    }
    return bouts.join(' &middot; ');
}

/** Le point où se croisent [AC] et [BD], ou null si elles sont parallèles. */
function croisement(A, C, B, D) {
    const r = [C[0] - A[0], C[1] - A[1]], s = [D[0] - B[0], D[1] - B[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) return null;
    const t = ((B[0] - A[0]) * s[1] - (B[1] - A[1]) * s[0]) / den;
    return [A[0] + t * r[0], A[1] + t * r[1]];
}

/** `combien` traits en travers de [AB], au paramètre `t` du segment. */
function tirets(A, B, t, combien, couleur) {
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
    const ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
    let out = '';
    for (let k = 0; k < combien; k++) {
        const e = (k - (combien - 1) / 2) * 2.2;
        const cx = A[0] + (B[0] - A[0]) * t + ux * e;
        const cy = A[1] + (B[1] - A[1]) * t + uy * e;
        out += `<path d="M${(cx - uy * 2.2).toFixed(2)} ${(cy + ux * 2.2).toFixed(2)}
            L${(cx + uy * 2.2).toFixed(2)} ${(cy - ux * 2.2).toFixed(2)}"
            stroke="${couleur}" stroke-width="1" stroke-linecap="round"/>`;
    }
    return out;
}

/** Le petit carré de l'angle droit, en un point quelconque. */
function angleDroitEn(S, versA, versB, couleur) {
    const u = unite(S, versA), v = unite(S, versB), t = 5;
    return `<path d="M${(S[0] + u[0] * t).toFixed(2)} ${(S[1] + u[1] * t).toFixed(2)}
        L${(S[0] + (u[0] + v[0]) * t).toFixed(2)} ${(S[1] + (u[1] + v[1]) * t).toFixed(2)}
        L${(S[0] + v[0] * t).toFixed(2)} ${(S[1] + v[1] * t).toFixed(2)}"
        fill="none" stroke="${couleur}" stroke-width="1.1"/>`;
}

/** Un ou deux chevrons au milieu du côté i, pointés dans son sens. */
function chevrons(P, i, combien = 1) {
    const A = P[i], B = P[(i + 1) % 4];
    // AU TIERS DU CÔTÉ, PAS AU MILIEU : les traits d'égalité s'écrivent au
    // milieu, et les deux marques se chevauchaient — un enchevêtrement rouge et
    // vert où l'on ne lisait plus ni l'un ni l'autre.
    const mx = A[0] + (B[0] - A[0]) * 0.34, my = A[1] + (B[1] - A[1]) * 0.34;
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
    const ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
    let out = '';
    for (let k = 0; k < combien; k++) {
        const cx = mx - ux * (k * 2.6), cy = my - uy * (k * 2.6);
        out += `<path d="M${(cx - ux * 2 - uy * 2).toFixed(2)} ${(cy - uy * 2 + ux * 2).toFixed(2)}
            L${cx.toFixed(2)} ${cy.toFixed(2)}
            L${(cx - ux * 2 + uy * 2).toFixed(2)} ${(cy - uy * 2 - ux * 2).toFixed(2)}"
            fill="none" stroke="#2ca02c" stroke-width="1" stroke-linecap="round"/>`;
    }
    return out;
}

/** Un ou deux petits traits en travers du côté i : la marque d'égalité. */
function barres(P, i, combien = 1) {
    const A = P[i], B = P[(i + 1) % 4];
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
    const ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
    let out = '';
    for (let k = 0; k < combien; k++) {
        const cx = mx + ux * (k * 2.2 - (combien - 1) * 1.1);
        const cy = my + uy * (k * 2.2 - (combien - 1) * 1.1);
        out += `<path d="M${(cx - uy * 2.4).toFixed(2)} ${(cy + ux * 2.4).toFixed(2)}
            L${(cx + uy * 2.4).toFixed(2)} ${(cy - ux * 2.4).toFixed(2)}"
            stroke="#d62728" stroke-width="1" stroke-linecap="round"/>`;
    }
    return out;
}

/** Le petit carré de l'angle droit, posé dans le sommet A. */
function angleDroit(P) {
    const [A, B, , D] = P;
    const u = unite(A, B), v = unite(A, D), t = 6;
    return `<path d="M${(A[0] + u[0] * t).toFixed(2)} ${(A[1] + u[1] * t).toFixed(2)}
        L${(A[0] + (u[0] + v[0]) * t).toFixed(2)} ${(A[1] + (u[1] + v[1]) * t).toFixed(2)}
        L${(A[0] + v[0] * t).toFixed(2)} ${(A[1] + v[1] * t).toFixed(2)}"
        fill="none" stroke="#e07b00" stroke-width="1.1"/>`;
}

function unite(A, B) {
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
    return [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
}

const echapper = (s) => String(s == null ? '' : s)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function engineQuadriMorph(container, isDemo, params) {
    const jeu = new QuadriMorph(container, isDemo, params);
    jeu.start();
    return jeu;
}
