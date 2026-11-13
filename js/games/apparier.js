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
import { niveauDeVitesse, allureDuVol, sortieDuRectangle } from '../core/volDesCartes.js';

const COMPETENCE = 'num.puissances.dix';

/**
 * LA VITESSE DU VOL, DE 1 À 10 — ET CE N'EST PLUS UNE AMPLITUDE.
 *
 * RÉMY, 13 novembre : « tu peux pas mettre un slide de vitesse, là ça bouge
 * mais vraiment peu, j'adorerais que ça se déplace partout dans l'écran quitte
 * à ce que le trait qui relie soit pas forcément sur le bord droit ».
 *
 * ── POURQUOI LA VERSION D'HIER NE POUVAIT PAS SUFFIRE ─────────────────────
 *
 * Elle faisait osciller chaque carte autour de sa place, par une animation CSS
 * entre deux points. J'avais porté la course de six pixels à vingt-six en
 * écrivant que « c'est elle qui fait le partout ». Mesuré sur une période
 * entière : 17, 28 et 36 px. Trois fois plus qu'avant, et toujours un
 * FRÉMISSEMENT — une carte qui se balance de trente pixels autour de sa place
 * ne se déplace pas, elle vibre.
 *
 * Ce qu'il demande est un DÉPLACEMENT : une carte qui part du haut à gauche et
 * arrive en bas à droite. Une oscillation entre deux points ne le fera jamais,
 * quelle que soit son amplitude. Il faut un vol — une vitesse, des bords, des
 * rebonds — et c'est le JavaScript qui le tient, image par image, dans la
 * boucle qui replaçait déjà les traits.
 *
 * ── LA PLAGE, ET POURQUOI ELLE COMMENCE SI BAS ────────────────────────────
 *
 * De 35 à 206 pixels par seconde. MESURÉ, et le plancher a été relevé pour
 * cela : à 20 px/s, une carte ne parcourait que 120 pixels en six secondes et
 * visitait UN pour cent du tableau — c'est-à-dire qu'elle avait l'air immobile
 * pendant tout le temps qu'on la regarde. « Là ça bouge mais vraiment peu »
 * était la remarque de départ ; un cran le plus bas qui la mérite encore ne
 * vaut rien. À 35, elle en parcourt 210 : on la voit partir.
 *
 * En haut, elle traverse un tableau de mille pixels en cinq secondes, et le jeu
 * devient franchement un jeu d'adresse — ce que Rémy demande, et ce que le
 * réglage permet de ne pas imposer à toute la classe.
 *
 * LE DÉFAUT EST À 4, pas au milieu : le milieu d'une échelle est un choix par
 * défaut qui ne dit rien, et le quatrième cran est celui où l'on voit les
 * cartes voyager tout en lisant tranquillement.
 */
// L'ÉCHELLE ET LA GÉOMÉTRIE DU TRAIT VIVENT DANS `core/volDesCartes.js` : ce
// sont les deux morceaux qui se calculent SANS écran, donc les deux qu'on peut
// éprouver exactement. Le vol lui-même a besoin de la mise en page et ne se
// mesure qu'en regardant les cartes bouger (`tools/lesCartesVolent.mjs`).

/** L'élève a-t-il demandé un écran sans mouvement ? */
const ecranCalme = () => typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        // LA VITESSE DU VOL, de 1 à 10.
        this.vitesse = niveauDeVitesse(this.params.vitesse);
        this.rafId = null;
        // LES CARTES EN VOL : une entrée par carte qui bouge encore. Une carte
        // reliée en sort — elle s'est posée.
        this.vol = [];
        this.dernierTic = 0;
    }

    render() {
        // ON REPART D'UN TABLEAU VIDE. `relies` survivait d'un tableau à
        // l'autre, et ses clés sont des RANGS (0, 1, 2…) : au second tableau,
        // il contenait déjà tous ceux du premier. Le compte ne tombait donc
        // plus jamais juste, et `redessiner` cherchait des cartes disparues.
        // Même défaut que sur l'Échelle des Tailles, trouvé en la mesurant.
        this.relies = new Set();
        this.choisi = null;
        this.vise = null;
        this.glisse = null;
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
        this.container.querySelectorAll('.pa-carte').forEach((el) => {
            el.addEventListener('click', () => this.toucher(el));
            el.addEventListener('pointerdown', (e) => this.commencerLeTrait(e, el));
        });
        if (this.bougent) {
            this.jeu.classList.add('pa-bougent');
            // LA MISE EN PAGE D'ABORD, LE VOL ENSUITE. Les bornes de chaque
            // carte se lisent sur sa place de REPOS, et elle n'en a pas tant
            // que le navigateur n'a pas disposé les deux colonnes.
            requestAnimationFrame(() => this.preparerLeVol());
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
        if (quoi === 'juste') {
            ligne.dataset.rang = a.dataset.rang;
            // UNE COULEUR PAR PAIRE. Rémy : « ça relie dans des couleurs
            // différentes pour aider ». Huit traits verts qui se croisent sur
            // le même tableau ne se suivent plus de l'œil ; huit couleurs, si.
            //
            // LA COULEUR NE PORTE PAS L'INFORMATION TOUTE SEULE : la carte
            // reliée garde sa bordure verte et devient inerte. Un élève qui ne
            // distingue pas le rouge du vert voit toujours ce qui est fait.
            ligne.classList.add(`pa-trait--c${Number(a.dataset.rang) % 8}`);
        }
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

    /** Le centre d'une carte, dans le repère du cadre du jeu. */
    centreDe(el) {
        const cadre = this.jeu.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - cadre.left, y: r.top + r.height / 2 - cadre.top,
            demiL: r.width / 2, demiH: r.height / 2 };
    }

    /**
     * LE POINT PAR OÙ LE TRAIT SORT D'UNE CARTE, EN ALLANT VERS UN AUTRE POINT.
     *
     * RÉMY : « quitte à ce que le trait qui relie soit pas forcément sur le bord
     * droit ». C'était la phrase qui débloquait tout.
     *
     * AVANT, LE CÔTÉ ÉTAIT ÉCRIT D'AVANCE : une carte de gauche sortait par sa
     * droite, une carte de droite par sa gauche. Tant que les colonnes se
     * faisaient face, c'était juste. Dès que les cartes volent, une carte de
     * gauche peut passer au-dessus, en dessous ou à droite de sa partenaire —
     * et le trait sortait alors du mauvais côté, traversant sa propre carte
     * pour aller la rejoindre.
     *
     * ON CHERCHE DONC L'INTERSECTION du segment centre→centre avec le rectangle
     * de la carte. Quand les deux cartes sont côte à côte, cela donne
     * exactement le bord droit de celle de gauche : l'ancien comportement est
     * le cas particulier du nouveau, et il n'y a pas deux chemins à tenir.
     */
    sortieVers(c, vers) { return sortieDuRectangle(c, vers); }

    /** Les quatre coordonnées d'un trait entre deux cartes. */
    placerLigne(ligne, a, b) {
        const ca = this.centreDe(a);
        const cb = this.centreDe(b);
        const p1 = this.sortieVers(ca, cb);
        const p2 = this.sortieVers(cb, ca);
        ligne.setAttribute('x1', String(p1.x));
        ligne.setAttribute('y1', String(p1.y));
        ligne.setAttribute('x2', String(p2.x));
        ligne.setAttribute('y2', String(p2.y));
    }

    /** Le trait en cours : d'une carte vers un point de l'écran. */
    placerLigneLibre(ligne, a, x, y) {
        if (!this.jeu) return;
        const cadre = this.jeu.getBoundingClientRect();
        // IL SORT DU CÔTÉ OÙ L'ON VA, et ce côté se calcule : le doigt peut
        // être n'importe où, y compris au-dessus de la carte qu'on tire.
        const p1 = this.sortieVers(this.centreDe(a), { x: x - cadre.left, y: y - cadre.top });
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
        // ELLE SORT DU VOL, ET ELLE RESTE OÙ ELLE EST. Son décalage est déjà
        // écrit dans son `transform` par la boucle — il n'y a rien à figer,
        // seulement à cesser de l'avancer.
        this.vol = this.vol.filter(c => c.el !== el);
        if (this.bougent) return;
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

    /**
     * LE VOL DES CARTES — ce que Rémy appelle « se déplacer partout ».
     *
     * CHAQUE CARTE GARDE SA PLACE DANS LA COLONNE et reçoit un DÉCALAGE. Le
     * `transform` ne pousse pas ses voisines : les deux colonnes restent
     * rangées dessous, et c'est ce qui permet à une carte de traverser tout le
     * tableau sans que le reste se réorganise derrière elle.
     *
     * LES BORNES SONT CELLES DU TABLEAU, PAS DE LA COLONNE. Une carte de gauche
     * peut donc passer à droite de sa partenaire — Rémy l'a autorisé mot pour
     * mot : « quitte à ce que le trait qui relie soit pas forcément sur le bord
     * droit ». C'est la contrainte qui retenait tout, et elle est levée.
     *
     * LES CARTES SE REPOUSSENT, ET C'EST UNE CORRECTION DE CE QUE J'AVAIS
     * ÉCRIT ICI. La première version disait : « on ne gère pas les collisions,
     * cela coûterait une boucle en n² pour un bénéfice nul — deux cartes qui se
     * croisent se décroisent toutes seules ». MESURÉ sur un téléphone de
     * 390 px, pendant six secondes et soixante relevés : avec huit paires,
     * HUIT CARTES SUR SEIZE étaient recouvertes à plus de moitié, en moyenne,
     * et il n'y avait pas un seul instant propre. Avec cinq paires, 2,6 sur
     * dix. Un exercice où l'on doit LIRE les cartes ne peut pas en cacher le
     * tiers en permanence.
     *
     * La boucle en n² est de cent vingt paires par image pour seize cartes :
     * c'est le prix d'un battement de cil, et le bénéfice n'était pas nul, il
     * était la lisibilité du jeu.
     */
    preparerLeVol() {
        if (!this.jeu || !this.bougent) return;
        // UN ÉCRAN SANS MOUVEMENT RESTE SANS MOUVEMENT. Le professeur a coché
        // le mode rigolo pour sa classe ; l'élève qui a demandé à son appareil
        // de ne rien animer a une raison que ce réglage-là ne connaît pas.
        // L'exercice est le même, les cartes ne volent pas.
        if (ecranCalme()) return;
        const cadre = this.jeu.getBoundingClientRect();
        if (!cadre.width || !cadre.height) return;
        const px = allureDuVol(this.vitesse);
        this.vol = [...this.container.querySelectorAll('.pa-carte')]
            .filter(el => !el.classList.contains('pa-carte--relie'))
            .map((el, i) => {
                el.style.animation = 'none';
                el.style.transform = 'none';
                const r = el.getBoundingClientRect();
                // LA PLACE DE REPOS, dans le repère du tableau. C'est à partir
                // d'elle qu'on sait où la carte EST à chaque image — son
                // décalage seul ne suffit pas à la séparer de sa voisine.
                const rx = r.left - cadre.left, ry = r.top - cadre.top;
                // UNE DIRECTION PAR CARTE, ET AUCUNE À L'HORIZONTALE PURE :
                // douze cartes qui glissent toutes de gauche à droite se
                // suivraient comme un troupeau. L'angle est pris dans une
                // spirale — le rang multiplié par un nombre qui ne divise pas
                // le tour — pour qu'aucune paire ne parte dans le même sens.
                const angle = (i * 2.399 + 0.6) % (Math.PI * 2);
                return {
                    el,
                    x: 0, y: 0,
                    rx, ry, rl: r.width, rh: r.height,
                    vx: Math.cos(angle) * px, vy: Math.sin(angle) * px,
                    // La carte penche en roulant, et le balancement a sa propre
                    // cadence : une rotation CONTINUE donnerait le tournis.
                    phase: i * 0.8, amplitude: 1.6 + (i % 3) * 0.9,
                    minX: -(r.left - cadre.left), maxX: cadre.right - r.right,
                    minY: -(r.top - cadre.top), maxY: cadre.bottom - r.bottom
                };
            })
            // UNE CARTE PLUS GRANDE QUE LE TABLEAU N'A NULLE PART OÙ ALLER :
            // ses bornes se croisent, et l'on se mettrait à rebondir soixante
            // fois par seconde contre deux murs qui se touchent.
            .filter(c => c.maxX > c.minX && c.maxY > c.minY);
        this.dernierTic = 0;
    }

    /** Une image de vol : on avance, on rebondit sur les bords, on écrit. */
    volerUneImage(maintenant) {
        if (!this.vol.length) return;
        // LE PREMIER PAS EST NUL, et les suivants sont plafonnés. Un onglet
        // qu'on laisse en arrière-plan rend un `dt` de plusieurs secondes au
        // retour : sans plafond, les douze cartes se téléporteraient dans un
        // coin d'un seul coup.
        const dt = this.dernierTic ? Math.min(0.05, (maintenant - this.dernierTic) / 1000) : 0;
        this.dernierTic = maintenant;
        if (!dt) return;
        for (const c of this.vol) {
            c.x += c.vx * dt;
            c.y += c.vy * dt;
            if (c.x <= c.minX) { c.x = c.minX; c.vx = Math.abs(c.vx); }
            if (c.x >= c.maxX) { c.x = c.maxX; c.vx = -Math.abs(c.vx); }
            if (c.y <= c.minY) { c.y = c.minY; c.vy = Math.abs(c.vy); }
            if (c.y >= c.maxY) { c.y = c.maxY; c.vy = -Math.abs(c.vy); }
        }
        this.separerLesCartes();
        for (const c of this.vol) {
            c.phase += dt * 1.6;
            const tour = Math.sin(c.phase) * c.amplitude;
            c.el.style.transform =
                `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px) rotate(${tour.toFixed(2)}deg)`;
        }
    }

    /**
     * DEUX CARTES NE SE SUPERPOSENT PAS — elles se repoussent.
     *
     * On sépare par la POSITION, pas par la force : on calcule de combien les
     * deux rectangles se chevauchent, et on les écarte de la moitié chacune,
     * selon l'axe où le chevauchement est le PLUS COURT. C'est le geste le plus
     * économique — pousser selon l'autre axe ferait traverser la carte entière
     * pour sortir par le mauvais côté.
     *
     * ET ON ÉCHANGE LES VITESSES SUR CET AXE, sans quoi les deux cartes
     * resteraient collées : écartées à cette image, elles se rentreraient
     * dedans à la suivante, et l'on verrait deux cartes trembler l'une contre
     * l'autre au lieu de rebondir.
     *
     * UNE MARGE DE HUIT PIXELS : deux cartes qui se frôlent exactement se
     * lisent comme une seule boîte coupée en deux. Le blanc entre elles est ce
     * qui dit qu'il y en a deux.
     */
    separerLesCartes() {
        const MARGE = 8;
        const n = this.vol.length;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const a = this.vol[i], b = this.vol[j];
                const ax = a.rx + a.x, ay = a.ry + a.y;
                const bx = b.rx + b.x, by = b.ry + b.y;
                const ox = Math.min(ax + a.rl, bx + b.rl) - Math.max(ax, bx) + MARGE;
                const oy = Math.min(ay + a.rh, by + b.rh) - Math.max(ay, by) + MARGE;
                if (ox <= 0 || oy <= 0) continue;
                if (ox < oy) {
                    const sens = ax < bx ? -1 : 1;
                    a.x += (sens * ox) / 2;
                    b.x -= (sens * ox) / 2;
                    const t = a.vx; a.vx = b.vx; b.vx = t;
                } else {
                    const sens = ay < by ? -1 : 1;
                    a.y += (sens * oy) / 2;
                    b.y -= (sens * oy) / 2;
                    const t = a.vy; a.vy = b.vy; b.vy = t;
                }
                // LA SÉPARATION NE DOIT PAS POUSSER DEHORS. Sans ce rappel, une
                // carte coincée dans un angle par deux voisines sortait du
                // tableau — et le rebond du tour suivant la ramenait d'un coup
                // sec, ce qui se voit.
                a.x = Math.max(a.minX, Math.min(a.maxX, a.x));
                a.y = Math.max(a.minY, Math.min(a.maxY, a.y));
                b.x = Math.max(b.minX, Math.min(b.maxX, b.x));
                b.y = Math.max(b.minY, Math.min(b.maxY, b.y));
            }
        }
    }

    /** Après un redimensionnement : les cartes ont bougé, les traits suivent. */
    redessiner() {
        // LE TABLEAU A CHANGÉ DE TAILLE, DONC LES MURS AUSSI. Sans ce calcul,
        // une carte gardait les bornes de l'ancienne largeur : après une
        // rotation d'écran, elle rebondissait dans le vide ou sortait du cadre.
        if (this.bougent && this.vol.length) this.preparerLeVol();
        this.majTraits();
    }

    /** En mode rigolo, les cartes volent et les traits les suivent. */
    animerLesTraits() {
        const boucle = (t) => {
            if (!this.bougent || !this.traits) { this.rafId = null; return; }
            // LE VOL D'ABORD, LES TRAITS ENSUITE, DANS LA MÊME IMAGE. Placés
            // avant, ils décriraient la position de l'image PRÉCÉDENTE : à deux
            // cents pixels par seconde, le trait traînerait visiblement
            // derrière sa carte.
            this.volerUneImage(t);
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
        this.dire('Tout est relié. Un autre tableau arrive…', 'pa-dit--ok');
        const neuf = this.container.querySelector('[data-neuf]');
        if (neuf) neuf.classList.add('pa-neuf--pret');

        // UN TABLEAU EST UNE QUESTION, PAS LA PARTIE.
        //
        // LE MÊME DÉFAUT QUE SUR L'ÉCHELLE DES TAILLES, et Rémy l'a vu là-bas :
        // « j'ai eu tout bon et il dit que j'ai eu faux ». `terminerPartie` ne
        // se compte qu'une fois (`_partieClose`) et surtout elle CLÔT
        // L'ÉTAPE — `partieTerminee` appelle `endStep`. Un exercice réglé sur
        // quatre tableaux s'arrêtait donc au premier, et annonçait une bonne
        // réponse sur les trois qu'il exigeait.
        //
        // UNE QUESTION PLEINE — sans `partiel`, contrairement aux paires — et
        // le runner compte les tableaux tout seul.
        this.onCorrectAnswer(null, COMPETENCE, {
            questionText: 'Relier toutes les écritures',
            given: 'tout relié', expected: 'tout relié', points: 25
        });

        // ET ON EN DONNE UN AUTRE. Le délai laisse relire le tableau fini :
        // « relis le tableau de haut en bas, c'est là que la règle se voit
        // d'un coup ». Si l'étape est close, `isRunning` le dit.
        if (this.suite) clearTimeout(this.suite);
        this.suite = setTimeout(() => {
            this.suite = null;
            if (!this.isRunning || !this.container.isConnected) return;
            this.rng = makeRng(`apparier-${Date.now()}`);
            this.render();
        }, 2400);
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
        if (this.suite) { clearTimeout(this.suite); this.suite = null; }
        this.glisse = null;
        super.destroy();
    }
}

export function engineApparier(container, isDemo, params) {
    const jeu = new Apparier(container, isDemo, params);
    jeu.start();
    return jeu;
}
