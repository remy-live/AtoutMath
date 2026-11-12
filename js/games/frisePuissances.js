// RANGER SUR L'ÉCHELLE DES TAILLES — du noyau au système solaire.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aime le fait de ranger sur une échelle de taille. On donne l'objet
// (en svg) sa valeur sous la forme de 10^... et on range. »
//
// ── CE QU'ON TRAVAILLE, ET CE QU'ON NE TRAVAILLE PAS ────────────────────────
//
// LA VALEUR EST DONNÉE. C'est écrit sur la carte : « Un virus · 10⁻⁷ m ». On ne
// demande donc jamais de DEVINER la taille d'un virus — ce serait de la culture
// générale, et un élève qui ne la sait pas serait bloqué par autre chose que
// des mathématiques. On demande de LIRE l'exposant et de le placer : 10⁻⁷ est
// plus petit que 10⁻⁶, donc le virus va sous la bactérie.
//
// ET C'EST LÀ QUE L'EXERCICE PAIE : à la fin, la frise porte toute la
// collection, et l'on VOIT ce que trois exposants d'écart représentent. Un
// tableau de nombres ne le montre jamais.
//
// ── POURQUOI UNE COLONNE, ET NON UNE FRISE COUCHÉE ──────────────────────────
//
// Une échelle de tailles se lit du petit vers le grand, et le haut est le
// grand : c'est l'image qu'on a en tête, et celle des manuels. Mais la vraie
// raison est mesurable : sur une tablette tenue droite, la hauteur est la
// dimension abondante. Neuf cases en colonne tiennent sans faire défiler ;
// neuf cases en ligne ne tiennent pas, et une frise qu'il faut faire défiler
// ne montre plus le rapport entre ses deux bouts — qui est tout ce qu'on vient
// voir.
//
// ── LE GESTE, LE MÊME QU'AU RELIAGE ─────────────────────────────────────────
//
// On touche une carte puis sa case, OU l'on prend la carte et on la lâche sur
// sa case. Rémy a demandé ce second geste pour le jeu de reliage le même
// jour — « on pourrait aussi relier en appuyant et relachant » —, et il n'y a
// aucune raison que deux jeux voisins s'attrapent différemment.
//
// ── CE QUE CE FICHIER NE DÉCIDE PAS ─────────────────────────────────────────
//
// QUELS objets existent, à quel exposant, et quelles cases porte chaque monde :
// tout cela vit dans `core/echelleDesTailles.js`, qui est pur et éprouvé sans
// navigateur.

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import {
    MONDES, mondeDe, casesDuMonde, tirerDesObjets,
    puissanceTexte, texteDeLaCarte, ecritureDecimale, ECRITURES
} from '../core/echelleDesTailles.js';

const COMPETENCE = 'num.puissances.dix';

const echapper = (s) => String(s === undefined || s === null ? '' : s)
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

class FrisePuissances extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'frisePuissances');
        this.rng = makeRng(this.params.seed || 'frise');
        this.monde = MONDES[this.params.monde] ? this.params.monde : 'nous';
        this.combien = Math.max(3, Math.min(8, Math.round(Number(this.params.objets) || 5)));
        // CE QUI EST ÉCRIT SUR LA CARTE — voir `ECRITURES` dans
        // `core/echelleDesTailles.js`, qui dit pourquoi ce réglage existe.
        // Rémy : « c'est hyper facile, il suffit de placer 10^4 à 10^4, où est
        // la recherche ? » Le défaut par défaut n'est donc PAS la puissance.
        this.ecriture = ECRITURES.includes(this.params.carte) ? this.params.carte : 'decimale';
        this.choisi = null;
        this.vise = null;
        this.glisse = null;
        this.poses = new Set();
    }

    render() {
        // ON REPART D'UNE FRISE VIDE, et c'est un défaut mesuré, pas une
        // précaution : `poses` survivait d'une frise à l'autre. À la seconde,
        // il contenait déjà les cinq objets de la première, si bien que
        // `poses.size === objets.length` n'était plus jamais vrai — la frise
        // se rangeait entièrement SANS JAMAIS ÊTRE COMPTÉE. Vu à la sonde :
        // « 1 / 5 » après deux frises rangées.
        this.poses = new Set();
        this.choisi = null;
        this.vise = null;
        this.glisse = null;
        this.objets = tirerDesObjets({ monde: this.monde, combien: this.combien }, this.rng);
        this.cases = casesDuMonde(this.monde);
        const m = mondeDe(this.monde);

        this.container.innerHTML = `
            <div class="fr-cadre">
                <div class="fr-haut">
                    <span class="fr-compte"><b data-faits>0</b> / ${this.objets.length}</span>
                    <span class="fr-dit" data-dit>${echapper(m.nom)} — ${echapper(this.consigne())}</span>
                    <button type="button" class="fr-neuf" data-neuf>↺ D'autres objets</button>
                </div>
                <div class="fr-jeu" data-jeu>
                    <div class="fr-echelle" data-echelle>
                        ${this.cases.map(e => this.caseHtml(e)).join('')}
                    </div>
                    <div class="fr-reserve" data-reserve>
                        ${this.rng.shuffle(this.objets.slice()).map(o => this.carteHtml(o)).join('')}
                    </div>
                </div>
            </div>`;

        this.jeu = this.container.querySelector('[data-jeu]');
        this.container.querySelectorAll('.fr-carte').forEach((el) => {
            el.addEventListener('click', () => this.prendre(el));
            el.addEventListener('pointerdown', (e) => this.commencer(e, el));
        });
        this.container.querySelectorAll('.fr-trou').forEach((el) => {
            el.addEventListener('click', () => this.deposer(el));
        });
        this.container.querySelector('[data-neuf]').addEventListener('click', () => {
            this.rng = makeRng(`frise-${Date.now()}`);
            this.render();
        });
        this.ecouterLaFenetre();
    }

    /**
     * LES ÉCOUTEURS DE LA FENÊTRE, POSÉS UNE SEULE FOIS.
     *
     * `render()` est rappelé par « ↺ D'autres objets ». Les reposer sans
     * retirer les précédents en empile un de plus à chaque partie — c'est le
     * défaut qu'on a trouvé dans le jeu de reliage le même jour, et il ne se
     * voit jamais : rien ne casse, tout se fait simplement deux fois, puis
     * trois.
     */
    ecouterLaFenetre() {
        this.oublierLaFenetre();
        this.surBouge = (e) => this.tirer(e);
        this.surLache = (e) => this.lacher(e);
        window.addEventListener('pointermove', this.surBouge);
        window.addEventListener('pointerup', this.surLache);
        window.addEventListener('pointercancel', this.surLache);
    }

    oublierLaFenetre() {
        if (this.surBouge) window.removeEventListener('pointermove', this.surBouge);
        if (this.surLache) {
            window.removeEventListener('pointerup', this.surLache);
            window.removeEventListener('pointercancel', this.surLache);
        }
        this.surBouge = this.surLache = null;
    }

    /* ───────────────────────────── LE DESSIN ─────────────────────────────── */

    dessin(o, taille) {
        // LE FRAGMENT SVG VIENT DU DÉPÔT, jamais de l'élève : il s'insère tel
        // quel. Le nom, lui, passe par `echapper` comme partout ailleurs.
        return `<svg class="fr-svg" viewBox="0 0 24 24" width="${taille}" height="${taille}"`
            + ` fill="none" stroke="currentColor" stroke-width="1.6"`
            + ` stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${o.svg}</svg>`;
    }

    /** Ce qu'on demande, et cela dépend de ce que la carte montre. */
    consigne() {
        if (this.ecriture === 'nom') {
            return 'prends un objet et cherche sa taille. Si tu te trompes, '
                + 'sa mesure s\u2019écrit sur la carte.';
        }
        if (this.ecriture === 'puissance') return 'prends un objet, puis pose-le sur sa taille.';
        return 'prends un objet, compte les rangs, et pose-le sur sa puissance de 10.';
    }

    caseHtml(e) {
        return `<div class="fr-case">
            <span class="fr-etiq">${puissanceTexte(e)} m</span>
            <div class="fr-trou" data-expo="${e}"></div>
        </div>`;
    }

    carteHtml(o) {
        // EN MODE « NOM SEUL », LA CARTE NE PORTE PAS DE VALEUR — mais la
        // place reste, et c'est elle qui recevra la mesure après une erreur.
        const val = texteDeLaCarte(o, this.ecriture);
        return `<button type="button" class="fr-carte" data-id="${echapper(o.id)}"
            data-expo="${o.exposant}">
            ${this.dessin(o, 34)}
            <span class="fr-nom">${echapper(o.nom)}</span>
            <span class="fr-val" data-val>${echapper(val)}</span>
        </button>`;
    }

    /* ───────────────────────────── LE GESTE ──────────────────────────────── */

    prendre(el) {
        if (!this.isRunning || !el || el.classList.contains('fr-carte--posee')) return;
        if (this.choisi === el) {
            // UN SECOND TOUCHER SUR LA MÊME CARTE LA REPOSE. C'est le geste
            // qu'on essaie quand on a changé d'avis, et refuser ne dirait rien.
            this.choisir(null);
            return;
        }
        this.choisir(el);
    }

    choisir(el) {
        if (this.choisi) this.choisi.classList.remove('fr-carte--choisie');
        this.choisi = el || null;
        if (this.choisi) this.choisi.classList.add('fr-carte--choisie');
    }

    viser(el) {
        if (this.vise === el) return;
        if (this.vise) this.vise.classList.remove('fr-trou--vise');
        this.vise = el || null;
        if (this.vise) this.vise.classList.add('fr-trou--vise');
    }

    commencer(e, el) {
        if (!this.isRunning || this.isDemo) return;
        if (el.classList.contains('fr-carte--posee')) return;
        this.glisse = { carte: el, x0: e.clientX, y0: e.clientY, bouge: false };
    }

    tirer(e) {
        const g = this.glisse;
        if (!g) return;
        if (!g.bouge) {
            if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 6) return;
            g.bouge = true;
            this.choisir(g.carte);
        }
        this.viser(this.trouSous(e.clientX, e.clientY));
    }

    lacher(e) {
        const g = this.glisse;
        if (!g) return;
        this.glisse = null;
        const cible = this.vise;
        this.viser(null);
        if (!g.bouge) return;        // c'était une touche : le « click » s'en charge
        // LÂCHÉ DANS LE VIDE : la carte reste prise, et rien n'est compté. Un
        // geste interrompu n'est pas une réponse.
        if (cible) this.deposer(cible);
    }

    trouSous(x, y) {
        const el = document.elementFromPoint(x, y);
        if (!el || !el.closest) return null;
        const t = el.closest('.fr-trou');
        return t && !t.firstElementChild ? t : null;
    }

    /* ────────────────────────────── LA POSE ──────────────────────────────── */

    deposer(trou) {
        if (!this.isRunning || !this.choisi || !trou) return;
        if (trou.firstElementChild) return;          // la case est déjà prise
        const carte = this.choisi;
        const voulu = Number(carte.dataset.expo);
        const ici = Number(trou.dataset.expo);
        const o = this.objets.find(x => x.id === carte.dataset.id);

        if (voulu !== ici) {
            // ON DIT DE COMBIEN ON S'EST TROMPÉ, EN FACTEUR. « Ce n'est pas la
            // bonne case » n'apprend rien ; « cent fois trop petit » est la
            // leçon du chapitre, et elle se lit dans la différence des
            // exposants — qui est exactement ce qu'on travaille.
            const ecart = ici - voulu;
            const facteur = puissanceTexte(Math.abs(ecart));
            // EN MODE « NOM SEUL », L'ERREUR RÉVÈLE LA MESURE SUR LA CARTE.
            //
            // Sans cela le mode serait un jeu de devinette : on cherche, on se
            // trompe, et l'on ne sait toujours pas. En révélant l'écriture
            // DÉCIMALE — et non la puissance, qui est écrite sur les cases —,
            // il reste exactement le travail du mode « écriture décimale » :
            // compter les rangs. L'élève a donc appris la taille ET gardé son
            // exercice.
            if (this.ecriture === 'nom') {
                const val = carte.querySelector('[data-val]');
                if (val && !val.textContent) {
                    val.textContent = `${ecritureDecimale(voulu)} m`;
                    carte.classList.add('fr-carte--revelee');
                }
            }
            this.dire(`${o.nom} mesure ${puissanceTexte(voulu)} m. Là, c'est `
                + `${facteur} fois trop ${ecart > 0 ? 'grand' : 'petit'}.`, 'fr-dit--ko');
            trou.classList.add('fr-trou--refus');
            setTimeout(() => trou.classList.remove('fr-trou--refus'), 650);
            this.onWrongAnswer(null, {
                questionText: `${o.nom} — ${puissanceTexte(voulu)} m`,
                input: `${puissanceTexte(ici)} m`,
                expected: `${puissanceTexte(voulu)} m`,
                concept: COMPETENCE,
                // LE JEU VIENT DE DIRE POURQUOI, au milieu de l'écran, et la
                // case a clignoté : une carte de correction par-dessus
                // cacherait justement l'échelle qu'on est en train de lire.
                silencieux: true
            });
            return;
        }

        this.poser(carte, trou, o);
        // ET LA PHRASE FAIT LE PONT ENTRE LES DEUX ÉCRITURES : « 0,000 1 m,
        // c'est 10⁻⁴ m ». C'est la seule chose qu'on veuille lui laisser.
        this.dire(`${o.nom} : ${o.taille} — ${ecritureDecimale(voulu)} m, `
            + `c'est ${puissanceTexte(voulu)} m.`, 'fr-dit--ok');
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: `${o.nom} — ${puissanceTexte(voulu)} m`,
            given: `${puissanceTexte(ici)} m`, expected: `${puissanceTexte(voulu)} m`,
            // L'ÉCHELLE ENTIÈRE EST L'UNITÉ DE TRAVAIL, pas chaque carte :
            // sans cela, cinq objets compteraient cinq questions et l'élève
            // aurait « fini » son exercice en une frise et demie.
            partiel: true
        });
        const faits = this.container.querySelector('[data-faits]');
        if (faits) faits.textContent = String(this.poses.size);
        if (this.poses.size === this.objets.length) this.fini();
    }

    poser(carte, trou, o) {
        this.choisir(null);
        carte.classList.add('fr-carte--posee');
        carte.disabled = true;
        this.poses.add(o.id);
        const pose = document.createElement('span');
        pose.className = 'fr-pose';
        pose.innerHTML = `${this.dessin(o, 26)}<span class="fr-pose-nom">${echapper(o.nom)}</span>`;
        trou.appendChild(pose);
    }

    dire(texte, classe = '') {
        const d = this.container.querySelector('[data-dit]');
        if (!d) return;
        d.className = `fr-dit ${classe}`;
        d.textContent = texte;
    }

    fini() {
        this.dire('L’échelle est rangée. Relis-la de haut en bas : '
            + 'chaque case est DIX FOIS la précédente.', 'fr-dit--ok');
        const neuf = this.container.querySelector('[data-neuf]');
        if (neuf) neuf.classList.add('fr-neuf--pret');

        // UNE FRISE EST UNE QUESTION, PAS LA PARTIE.
        //
        // RÉMY, sur sa photo d'écran : « j'ai eu tout bon et il dit que j'ai eu
        // faux » — « Tu as 1 bonne réponse, il en faut 4 », après UNE SEULE
        // frise rangée sans une erreur.
        //
        // C'ÉTAIT `terminerPartie` : elle ne se compte qu'une fois
        // (`_partieClose`) et surtout elle CLÔT L'ÉTAPE — `partieTerminee`
        // appelle `endStep`. Un exercice réglé sur cinq frises s'arrêtait donc
        // à la première, avec une bonne réponse sur les quatre qu'il exigeait.
        // L'élève avait tout juste et le logiciel lui disait le contraire :
        // c'est ce qu'un exercice peut faire de pire.
        //
        // UNE QUESTION PLEINE, DONC — sans `partiel` —, et le runner compte
        // jusqu'à cinq tout seul. `terminerPartie` est pour les jeux qui ont
        // une vraie fin ; une frise n'en est pas une.
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: 'Ranger l’échelle des tailles',
            given: 'rangée', expected: 'rangée', points: 25
        });

        // ET ON EN PROPOSE UNE AUTRE, comme le font les jeux qui enchaînent —
        // le Pousseur prépare l'entrepôt suivant deux secondes après la
        // victoire. Le délai laisse relire le tableau fini : c'est là que la
        // règle se voit. Si l'étape est close, `isRunning` le dit.
        if (this.suite) clearTimeout(this.suite);
        this.suite = setTimeout(() => {
            this.suite = null;
            if (!this.isRunning || !this.container.isConnected) return;
            this.rng = makeRng(`frise-${Date.now()}`);
            this.render();
        }, 2400);
    }

    /* ─────────────────────── LA DÉMONSTRATION ───────────────────────────── */

    async runDemoSequence() {
        // LE ROBOT RANGE DU PLUS PETIT AU PLUS GRAND, et dit chaque taille.
        // L'ordre n'est pas décoratif : c'est la démonstration elle-même, on
        // voit l'échelle se remplir par le bas.
        const ordre = this.objets.slice().sort((a, b) => a.exposant - b.exposant);
        for (const o of ordre) {
            if (!this.isRunning) return;
            await new Promise(r => setTimeout(r, 850));
            if (this.gelDemo) continue;
            const carte = this.container.querySelector(`.fr-carte[data-id="${o.id}"]`);
            const trou = this.container.querySelector(`.fr-trou[data-expo="${o.exposant}"]`);
            if (!carte || !trou || trou.firstElementChild) continue;
            carte.classList.add('fr-carte--choisie');
            await new Promise(r => setTimeout(r, 400));
            this.choisi = carte;
            this.poser(carte, trou, o);
            this.dire(`${o.nom} : ${o.taille}.`, 'fr-dit--ok');
            const faits = this.container.querySelector('[data-faits]');
            if (faits) faits.textContent = String(this.poses.size);
        }
    }

    startGameLoop() { /* rien à cadencer : le jeu attend le doigt */ }

    destroy() {
        this.oublierLaFenetre();
        if (this.suite) { clearTimeout(this.suite); this.suite = null; }
        this.glisse = null;
        super.destroy();
    }
}

export function engineFrisePuissances(container, isDemo, params) {
    const jeu = new FrisePuissances(container, isDemo, params);
    jeu.start();
    return jeu;
}
