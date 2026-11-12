// RELIER DEUX COLONNES — 10² d'un côté, 100 de l'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « J'aimerai bien un jeu où on relie 10² à 100, 10⁻³ à 0,001, etc ».
//
// ── POURQUOI UN TRAIT, ET PAS UN MEMORY ───────────────────────────────────
//
// Le dépôt a déjà un Memory, où l'on retourne deux cartes. Il ne convient pas
// ici, et c'est une question de MATHÉMATIQUES, pas de goût : au Memory, les
// cartes sont cachées, donc on cherche de MÉMOIRE puis on vérifie. Ce qu'on
// travaille ici, c'est de regarder DOUZE écritures posées à plat et de voir
// lesquelles désignent le même nombre. Tout doit rester visible en même temps.
//
// LE TRAIT EST LE GESTE DU CAHIER. C'est l'exercice que Rémy donne sur papier
// depuis toujours — deux colonnes, on relie —, et un trait qui reste tracé
// laisse voir ce qu'on a déjà fait et ce qui reste. Un appariement qui ferait
// disparaître les cartes effacerait justement ce qu'on vient de comprendre.
//
// ── CE QUE CE FICHIER NE DÉCIDE PAS ───────────────────────────────────────
//
// QUELLES écritures vont ensemble. Cela vit dans `core/pairesPuissances.js`,
// qui est pur et éprouvé sans navigateur. Ici on dessine, on écoute le doigt,
// et l'on tire des traits.
//
// ── CE QUI A ÉTÉ MESURÉ AVANT D'ÉCRIRE LE DESSIN ──────────────────────────
//
// LES TRAITS SONT DANS UN SVG EN SURCOUCHE, posé sur les deux colonnes et
// recalculé au redimensionnement. Deux autres pistes ont été écartées :
// une ligne en `<div>` tournée par `transform` (illisible dès que l'angle
// change, et l'épaisseur se déforme), et un canvas (qui aurait demandé de
// redessiner les cartes à la main pour les garder nettes).

import { BaseGame } from '../core/BaseGame.js';
import { makeRng } from '../core/ids.js';
import { tirerDesPaires, FAMILLES_PAIRES } from '../core/pairesPuissances.js';

const COMPETENCE = 'num.puissances.dix';

/** Le temps pendant lequel un trait faux reste visible, en millisecondes. */
const FAUX_MS = 900;

const echapper = (s) => String(s === undefined || s === null ? '' : s)
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

class Apparier extends BaseGame {
    constructor(container, isDemo, params) {
        super(container, isDemo, params, 'apparier');
        this.rng = makeRng(this.params.seed || 'apparier');
        this.famille = FAMILLES_PAIRES[this.params.famille] ? this.params.famille : 'puissances';
        this.combien = Math.max(4, Math.min(8, Math.round(Number(this.params.paires) || 6)));
        this.choisi = null;
        this.relies = new Set();
        this.surRedim = null;
        // LE TRAIT QU'ON TIRE, ET LA CARTE QU'ON VISE EN LE TIRANT.
        this.glisse = null;
        this.vise = null;
        // LE MODE RIGOLO. Rémy : « on peut faire un mode rigolo ou les cases
        // bougent ». C'est un réglage, pas le défaut : une carte qui dérive
        // demande de VISER, et ce n'est pas ce qu'on travaille le premier jour.
        this.bougent = this.params.bougent === true;
        this.rafId = null;
    }

    render() {
        this.paires = tirerDesPaires(
            { famille: this.famille, combien: this.combien }, this.rng);
        // LES DEUX COLONNES SONT MÉLANGÉES SÉPARÉMENT, sans quoi la première
        // carte de gauche répondrait à la première de droite et le jeu se
        // ferait en diagonale, sans rien lire.
        this.gauche = this.rng.shuffle(this.paires.map((p, i) => ({ ...p, rang: i })));
        this.droite = this.rng.shuffle(this.paires.map((p, i) => ({ ...p, rang: i })));

        this.container.innerHTML = `
            <div class="pa-cadre">
                <div class="pa-haut">
                    <span class="pa-compte"><b data-faits>0</b> / ${this.paires.length}</span>
                    <span class="pa-dit" data-dit>Touche une écriture, puis le nombre qui lui correspond.</span>
                    <button type="button" class="pa-neuf" data-neuf>↺ Autres cartes</button>
                </div>
                <div class="pa-jeu" data-jeu>
                    <svg class="pa-traits" data-traits aria-hidden="true"></svg>
                    <div class="pa-colonne" data-col="g">
                        ${this.gauche.map(c => this.carteHtml(c, 'g')).join('')}
                    </div>
                    <div class="pa-colonne" data-col="d">
                        ${this.droite.map(c => this.carteHtml(c, 'd')).join('')}
                    </div>
                </div>
            </div>`;

        this.jeu = this.container.querySelector('[data-jeu]');
        this.traits = this.container.querySelector('[data-traits]');
        this.container.querySelectorAll('.pa-carte').forEach((el, i) => {
            el.addEventListener('click', () => this.toucher(el));
            el.addEventListener('pointerdown', (e) => this.commencerLeTrait(e, el));
            if (!this.bougent) return;
            // DES CADENCES DIFFÉRENTES POUR CHAQUE CARTE, sans quoi les douze
            // battent ensemble : l'écran respire d'un bloc au lieu de frémir.
            // Le retard est NÉGATIF, donc chacune démarre déjà en cours de
            // route — sinon elles repartiraient toutes du même point.
            el.style.setProperty('--pa-duree', `${(2.6 + (i % 5) * 0.45).toFixed(2)}s`);
            el.style.setProperty('--pa-retard', `-${((i * 0.37) % 2.5).toFixed(2)}s`);
        });
        if (this.bougent) {
            this.jeu.classList.add('pa-bougent');
            this.animerLesTraits();
        }
        this.container.querySelector('[data-neuf]').addEventListener('click', () => {
            this.rng = makeRng(`apparier-${Date.now()}`);
            this.render();
        });
        this.ecouterLaFenetre();
    }

    /**
     * LES ÉCOUTEURS DE LA FENÊTRE, POSÉS UNE SEULE FOIS.
     *
     * `render()` est rappelé par « ↺ Autres cartes », et l'on reposait alors
     * un second `resize` sur la fenêtre, puis un troisième — sans jamais
     * retirer les précédents. On les retire donc AVANT de les poser.
     *
     * LES TRAITS SE REDESSINENT QUAND LA PLACE CHANGE : sans cela, une
     * tablette tournée d'un quart de tour garde ses traits là où les cartes
     * ÉTAIENT, et plus rien ne se lit.
     *
     * LE DOIGT, LUI, EST ÉCOUTÉ SUR LA FENÊTRE et non sur la carte : on tire
     * un trait JUSQU'EN DEHORS de la carte de départ, et c'est tout l'objet du
     * geste. `setPointerCapture` suffirait sur un navigateur qui l'accepte ;
     * la fenêtre marche partout.
     */
    ecouterLaFenetre() {
        this.oublierLaFenetre();
        this.surRedim = () => this.redessiner();
        this.surBouge = (e) => this.tirerLeTrait(e);
        this.surLache = (e) => this.lacherLeTrait(e);
        window.addEventListener('resize', this.surRedim);
        window.addEventListener('pointermove', this.surBouge);
        window.addEventListener('pointerup', this.surLache);
        window.addEventListener('pointercancel', this.surLache);
    }

    oublierLaFenetre() {
        if (this.surRedim) window.removeEventListener('resize', this.surRedim);
        if (this.surBouge) window.removeEventListener('pointermove', this.surBouge);
        if (this.surLache) {
            window.removeEventListener('pointerup', this.surLache);
            window.removeEventListener('pointercancel', this.surLache);
        }
        this.surRedim = this.surBouge = this.surLache = null;
    }

    carteHtml(c, cote) {
        const texte = cote === 'g' ? c.gauche : c.droite;
        return `<button type="button" class="pa-carte" data-cote="${cote}" `
            + `data-rang="${c.rang}">${echapper(texte)}</button>`;
    }

    /* ─────────────────────────── LE GESTE ───────────────────────────── */

    toucher(el) {
        // UN GLISSEMENT N'EST PAS UNE TOUCHE. Le navigateur émet quand même un
        // « click » quand on relâche, et sans ce garde-fou la carte d'arrivée
        // se retrouvait SÉLECTIONNÉE juste après avoir été reliée.
        // IL N'Y A PAS DE GARDE-FOU CONTRE LE « click » QUI SUIT UN TRAIT,
        // et c'est VÉRIFIÉ, pas supposé : quand on relâche ailleurs que sur
        // la carte de départ, le navigateur émet son « click » sur l'ANCÊTRE
        // COMMUN des deux — la colonne ou le terrain —, jamais sur une carte.
        //
        // J'en avais quand même posé un, armé pour un tour de boucle. MESURÉ
        // AU NAVIGATEUR : il restait armé, et les DEUX touches suivantes
        // étaient avalées — le geste d'avant ne marchait plus dès qu'on avait
        // lâché un trait dans le vide. Un garde-fou contre un danger qui
        // n'existe pas ne protège rien ; il casse.
        //
        // Reste le seul cas où le « click » tombe bien sur une carte : on
        // part d'elle, on tire, et l'on revient lâcher dessus. Elle se
        // sélectionne alors, ce qui est exactement ce qu'on voulait.
        if (!this.isRunning || el.classList.contains('pa-carte--relie')) return;
        const cote = el.dataset.cote;
        // DEUX CARTES DU MÊME CÔTÉ : on ne refuse pas, on DÉPLACE le choix.
        // Refuser demanderait à l'élève de comprendre pourquoi son clic n'a
        // rien fait ; déplacer est ce qu'il voulait faire neuf fois sur dix.
        if (!this.choisi || this.choisi.dataset.cote === cote) {
            if (this.choisi) this.choisi.classList.remove('pa-carte--choisi');
            this.choisi = el;
            el.classList.add('pa-carte--choisi');
            return;
        }
        const a = this.choisi;
        this.choisi = null;
        a.classList.remove('pa-carte--choisi');
        this.relier(a, el);
    }

    /* ─────────── RELIER EN TIRANT LE TRAIT, D'UNE CARTE À L'AUTRE ─────── */

    //
    // RÉMY : « on pourrait AUSSI relier en appuyant et relachant entre les
    // puissances de 10 et le traits se crées ».
    //
    // « AUSSI », ET C'EST LE MOT QUI COMPTE : les deux touches restent. Elles
    // sont plus sûres quand on vise mal, c'est le geste que la démonstration
    // montre, et c'est le seul qui marche au clavier. Tirer un trait, lui, est
    // le geste du cahier — et il dit ce qu'on est en train de faire AVANT
    // qu'on lâche, ce que deux touches ne disent jamais.

    commencerLeTrait(e, el) {
        if (!this.isRunning || this.isDemo) return;
        if (el.classList.contains('pa-carte--relie')) return;
        this.glisse = { depart: el, x0: e.clientX, y0: e.clientY, bouge: false, ligne: null };
    }

    tirerLeTrait(e) {
        const g = this.glisse;
        if (!g) return;
        if (!g.bouge) {
            // SIX PIXELS AVANT DE CROIRE À UN GLISSEMENT : un doigt qui se
            // pose bouge toujours un peu, et un trait qui apparaîtrait à
            // chaque simple touche ferait clignoter l'écran.
            if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 6) return;
            g.bouge = true;
            // On ne vise pas deux choses à la fois : le trait qu'on tire
            // remplace la sélection en cours.
            if (this.choisi) { this.choisi.classList.remove('pa-carte--choisi'); this.choisi = null; }
            g.depart.classList.add('pa-carte--choisi');
        }
        g.ligne = g.ligne || this.tracerLibre(g.depart);
        this.placerLigneLibre(g.ligne, g.depart, e.clientX, e.clientY);
        const sous = this.carteSous(e.clientX, e.clientY);
        this.viser(sous && sous !== g.depart
            && sous.dataset.cote !== g.depart.dataset.cote
            && !sous.classList.contains('pa-carte--relie') ? sous : null);
    }

    lacherLeTrait(e) {
        const g = this.glisse;
        if (!g) return;
        this.glisse = null;
        if (g.ligne && g.ligne.parentNode) g.ligne.remove();
        const cible = this.vise;
        this.viser(null);
        if (!g.bouge) return;         // c'était une touche : le « click » s'en charge
        g.depart.classList.remove('pa-carte--choisi');
        // LÂCHÉ DANS LE VIDE : rien ne se passe, et rien n'est compté faux.
        // Un trait abandonné en l'air n'est pas une réponse.
        if (cible) this.relier(g.depart, cible);
    }

    /** La carte sous un point de l'écran, s'il y en a une. */
    carteSous(x, y) {
        // `elementFromPoint` NOMME QUI EST LÀ. C'est la seule façon de le
        // savoir pendant un glissement : les événements de la fenêtre ne
        // désignent pas la carte survolée, et le SVG des traits ne prend
        // aucun clic (`pointer-events: none`), donc il ne masque personne.
        const el = document.elementFromPoint(x, y);
        return el && el.closest ? el.closest('.pa-carte') : null;
    }

    /** La carte qu'on vise se marque, pour qu'on sache où l'on va lâcher. */
    viser(el) {
        if (this.vise === el) return;
        if (this.vise) this.vise.classList.remove('pa-carte--vise');
        this.vise = el || null;
        if (this.vise) this.vise.classList.add('pa-carte--vise');
    }

    relier(a, el) {
        const juste = a.dataset.rang === el.dataset.rang;
        const paire = this.paires[Number(a.dataset.rang)];
        if (juste) {
            a.classList.add('pa-carte--relie');
            el.classList.add('pa-carte--relie');
            this.relies.add(a.dataset.rang);
            this.tracer(a, el, 'juste');
            this.dire(paire.aide, 'pa-dit--ok');
            // ON NE PASSE PAS LA CARTE À `onCorrectAnswer`, et c'est une
            // correction mesurée SUR LA PHOTO : la classe de base peint un
            // fond vert sur l'élément qu'on lui donne, donc une carte du
            // tableau sur deux devenait verte — celle de droite — et l'autre
            // non. Deux cartes reliées par le MÊME trait n'avaient pas l'air
            // d'avoir le même statut. Le trait vert et la bordure verte
            // disent déjà la réussite, des deux côtés.
            this.onCorrectAnswer(null, COMPETENCE, {
                questionText: `${paire.gauche} ↔ ?`,
                given: paire.droite, expected: paire.droite,
                // UNE PAIRE RELIÉE N'EST PAS UNE QUESTION DE PLUS DANS LA
                // SÉANCE : c'est le TABLEAU ENTIER qui en est une. Sans cela,
                // six paires compteraient six questions et l'élève aurait
                // « fini » son exercice en un tableau et demi.
                //
                // LE CHAMP S'APPELLE `partiel`, ET JE L'AVAIS INVENTÉ SOUS LE
                // NOM `etape` : un nom inventé ne fait rien et ne dit rien —
                // la paire aurait compté une question pleine, en silence.
                partiel: true
            });
            this.container.querySelector('[data-faits]').textContent = String(this.relies.size);
            if (this.relies.size === this.paires.length) this.fini();
            return;
        }
        // UN TRAIT FAUX SE VOIT, PUIS S'EFFACE. Il ne reste pas : deux traits
        // faux croisés sur le tableau, et l'on ne lit plus ce qui est juste.
        const trait = this.tracer(a, el, 'faux');
        const quoiGauche = this.paires[Number(a.dataset.rang)];
        const quoiDroite = this.paires[Number(el.dataset.rang)];
        const depuisGauche = a.dataset.cote === 'g';
        this.dire(depuisGauche ? quoiGauche.aide : quoiDroite.aide, 'pa-dit--ko');
        this.onWrongAnswer(null, {
            questionText: `${(depuisGauche ? quoiGauche : quoiDroite).gauche} ↔ ?`,
            input: (depuisGauche ? quoiDroite : quoiGauche).droite,
            expected: (depuisGauche ? quoiGauche : quoiDroite).droite,
            concept: COMPETENCE,
            // LA TENTATIVE EST ENREGISTRÉE, MAIS SANS CARTE DE CORRECTION.
            // Le jeu vient de dire POURQUOI la paire ne va pas ensemble, au
            // milieu de l'écran, et le trait rouge est encore là : une carte
            // par-dessus dirait la même chose en moins bien, et elle cacherait
            // justement le tableau qu'on est en train de lire.
            silencieux: true
        });
        setTimeout(() => {
            if (trait && trait.parentNode) trait.remove();
        }, FAUX_MS);
    }

    dire(texte, classe = '') {
        const d = this.container.querySelector('[data-dit]');
        if (!d) return;
        d.className = `pa-dit ${classe}`;
        d.textContent = texte;
    }

    /* ────────────────────────── LES TRAITS ──────────────────────────── */

    /**
     * UN TRAIT ENTRE DEUX CARTES, dans le repère du SVG.
     *
     * LES COORDONNÉES SE PRENNENT PAR RAPPORT AU CADRE DU JEU, et non à la
     * page : le cadre défile, la page aussi, et deux repères différents
     * donnent un trait qui part à côté dès qu'on a fait défiler quoi que ce
     * soit. C'est le genre de défaut qui ne se voit pas tant qu'on mesure sur
     * un écran assez grand pour tout montrer.
     */
    tracer(a, b, quoi) {
        if (!this.jeu || !this.traits) return null;
        const ligne = this.nouvelleLigne(quoi);
        if (quoi === 'juste') ligne.dataset.rang = a.dataset.rang;
        this.placerLigne(ligne, a, b);
        this.traits.appendChild(ligne);
        return ligne;
    }

    nouvelleLigne(quoi) {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('class', `pa-trait pa-trait--${quoi}`);
        return l;
    }

    /** Le trait qu'on tire : il part d'une carte et suit le doigt. */
    tracerLibre(a) {
        const l = this.nouvelleLigne('encours');
        this.traits.appendChild(l);
        return l;
    }

    /** Le bord d'une carte, dans le repère du cadre du jeu. */
    bordDe(el, versLaDroite) {
        const cadre = this.jeu.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        return {
            x: (versLaDroite ? r.right : r.left) - cadre.left,
            y: r.top + r.height / 2 - cadre.top
        };
    }

    /** Les quatre coordonnées d'un trait entre deux cartes. */
    placerLigne(ligne, a, b) {
        const gaucheDAbord = a.dataset.cote === 'g';
        const p1 = this.bordDe(gaucheDAbord ? a : b, true);
        const p2 = this.bordDe(gaucheDAbord ? b : a, false);
        ligne.setAttribute('x1', String(p1.x));
        ligne.setAttribute('y1', String(p1.y));
        ligne.setAttribute('x2', String(p2.x));
        ligne.setAttribute('y2', String(p2.y));
    }

    /** Le trait en cours : d'une carte vers un point de l'écran. */
    placerLigneLibre(ligne, a, x, y) {
        if (!this.jeu) return;
        const cadre = this.jeu.getBoundingClientRect();
        // IL SORT DU CÔTÉ OÙ L'ON VA : d'une carte de gauche il part à droite,
        // et d'une carte de droite il part à gauche. Un trait qui sortirait
        // toujours du même bord traverserait sa propre carte.
        const p1 = this.bordDe(a, a.dataset.cote === 'g');
        ligne.setAttribute('x1', String(p1.x));
        ligne.setAttribute('y1', String(p1.y));
        ligne.setAttribute('x2', String(x - cadre.left));
        ligne.setAttribute('y2', String(y - cadre.top));
    }

    /**
     * UNE CARTE S'ARRÊTE LÀ OÙ ELLE EST.
     *
     * Couper l'animation la ramènerait d'un coup à sa place de repos — un saut
     * de six pixels. On fige donc la position COURANTE avant de couper.
     */
    poser(el) {
        const t = getComputedStyle(el).transform;
        el.style.animation = 'none';
        if (t && t !== 'none') el.style.transform = t;
    }

    /**
     * LES TRAITS SUIVENT LES CARTES, sans être recréés.
     *
     * En mode rigolo on repasse ici à chaque image : effacer puis recréer six
     * éléments soixante fois par seconde ferait travailler le navigateur pour
     * rien, alors que quatre attributs suffisent.
     */
    majTraits() {
        if (!this.traits) return;
        for (const rang of this.relies) {
            const a = this.container.querySelector(`.pa-carte[data-cote="g"][data-rang="${rang}"]`);
            const b = this.container.querySelector(`.pa-carte[data-cote="d"][data-rang="${rang}"]`);
            if (!a || !b) continue;
            const ligne = this.traits.querySelector(`.pa-trait--juste[data-rang="${rang}"]`);
            if (ligne) this.placerLigne(ligne, a, b);
            else this.tracer(a, b, 'juste');
        }
    }

    /** Après un redimensionnement : les cartes ont bougé, les traits suivent. */
    redessiner() { this.majTraits(); }

    /** En mode rigolo, les traits se replacent à chaque image. */
    animerLesTraits() {
        const boucle = () => {
            if (!this.bougent || !this.traits) { this.rafId = null; return; }
            this.majTraits();
            this.rafId = requestAnimationFrame(boucle);
        };
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(boucle);
    }

    fini() {
        // L'ÉCRAN SE POSE QUAND TOUT EST RELIÉ.
        //
        // En mode rigolo, le tableau fini est justement ce qu'on vient relire
        // — « relis le tableau de haut en bas : c'est là que la règle se voit
        // d'un coup » —, et on ne relit pas douze cartes qui frétillent. On
        // fige donc chacune LÀ OÙ ELLE EST, puis on arrête la boucle : sans
        // ce figement, les douze reviendraient d'un coup à leur place de
        // repos, traits compris.
        if (this.bougent) {
            this.container.querySelectorAll('.pa-carte').forEach(el => this.poser(el));
            this.bougent = false;
            if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
            this.majTraits();
        }
        this.dire('Tout est relié. ↺ Autres cartes pour recommencer.', 'pa-dit--ok');
        const neuf = this.container.querySelector('[data-neuf]');
        if (neuf) neuf.classList.add('pa-neuf--pret');
        // LE TABLEAU ENTIER EST L'UNITÉ DE TRAVAIL, et c'est ici qu'on le
        // compte — une fois, pas six.
        this.terminerPartie({
            gagne: true, quoi: 'Relier toutes les écritures', concept: COMPETENCE
        });
    }

    /* ─────────────────────── LA DÉMONSTRATION ───────────────────────── */

    async runDemoSequence() {
        // LE ROBOT RELIE LES PAIRES L'UNE APRÈS L'AUTRE, lentement, et dit la
        // règle à voix haute. C'est tout ce qu'il y a à montrer ici : le geste
        // EST l'explication.
        for (let i = 0; i < this.paires.length; i++) {
            if (!this.isRunning) return;
            await new Promise(r => setTimeout(r, 900));
            if (this.gelDemo) { i--; continue; }
            const a = this.container.querySelector(`.pa-carte[data-cote="g"][data-rang="${i}"]`);
            const b = this.container.querySelector(`.pa-carte[data-cote="d"][data-rang="${i}"]`);
            if (!a || !b) continue;
            a.classList.add('pa-carte--choisi');
            await new Promise(r => setTimeout(r, 500));
            a.classList.remove('pa-carte--choisi');
            a.classList.add('pa-carte--relie');
            b.classList.add('pa-carte--relie');
            this.relies.add(String(i));
            this.tracer(a, b, 'juste');
            this.dire(this.paires[i].aide, 'pa-dit--ok');
            const faits = this.container.querySelector('[data-faits]');
            if (faits) faits.textContent = String(this.relies.size);
        }
    }

    startGameLoop() { /* rien à cadencer : le jeu attend le doigt */ }

    destroy() {
        this.oublierLaFenetre();
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        this.glisse = null;
        super.destroy();
    }
}

export function engineApparier(container, isDemo, params) {
    const jeu = new Apparier(container, isDemo, params);
    jeu.start();
    return jeu;
}
