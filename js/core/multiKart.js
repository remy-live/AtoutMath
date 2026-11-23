// MULTIKART — la course, ses portiques et ses pilotes.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 23 novembre, en collant un jeu complet écrit ailleurs : « voilà un jeu
// canon, tu me l'améliores, le rends encore plus beau, plus cohérent, ne mets
// pas le son ». Puis : « il faut que tout passe dans la fenêtre et que ce soit
// compatible téléphone portable ».
//
// LE JEU : une course en fausse 3D. Le calcul est écrit en haut — « 7 × 8 » —,
// un portique arrive avec trois résultats, un par voie, et l'on place son kart
// sur la voie du bon. Juste, on accélère ; faux, on tousse une seconde et la
// correction s'affiche. Trois rivaux courent avec nous.
//
// ── CE FICHIER NE DESSINE RIEN ───────────────────────────────────────────────
//
// Il tient la course : la piste, les portiques, les vitesses, les bonus, les
// rivaux. Le dessin est dans `js/games/multiKart.js`. La séparation n'est pas
// une coquetterie : c'est elle qui permet de courir cent courses en une seconde
// dans une épreuve, et donc de SAVOIR que celui qui calcule juste gagne.
//
// ── « PLUS COHÉRENT » : CE QUI A CHANGÉ PAR RAPPORT AU FICHIER REÇU ─────────
//
// 1. LA RÉPONSE EST LÀ OÙ EST LE KART. Le fichier jugeait la voie VISÉE : un
//    appui donné au dernier centième comptait alors que le kart était encore,
//    à l'écran, sous une autre arche. On juge la voie où il se trouve.
//
// 2. LES RIVAUX CALCULENT, EUX AUSSI. Ils roulaient à vitesse fixe : trois
//    décors. Chacun a maintenant son calcul à chaque portique et sa justesse :
//    il accélère quand il a juste, tousse quand il a faux — exactement comme
//    nous. Le classement veut alors dire quelque chose : on a calculé mieux,
//    ou moins bien, que Léo. Mais leur calcul n'est PAS le nôtre : la voie
//    qu'ils prennent ne renseigne pas, voir `avancerRivaux`.
//
// 3. LE BONUS TIRÉ SERT À QUELQUE CHOSE. Une carapace quand personne n'est
//    devant, une banane quand personne n'est derrière : le tirage les donnait.
//    On ne tire plus que parmi ce qui a un effet là où l'on est.
//
// 4. TOUT LE HASARD PASSE PAR LA GRAINE. Trente `Math.random()` dans le
//    fichier reçu. Une course qu'on ne peut pas refaire ne se mesure pas —
//    c'est la leçon des Petites Ailes, apprise la veille.

import { makeRng } from './ids.js';
import {
    fabriquerPortiques, centresDesVoies, voieDe
} from './multiKartCalculs.js';

export { voieDe, centresDesVoies };

/* ─────────────────────────────────────────────────────────────────────────
 * 1. LA PISTE
 * ───────────────────────────────────────────────────────────────────────── */

export const PISTE = {
    LONGUEUR_SEGMENT: 200,
    LARGEUR: 2150,
    HAUTEUR_CAMERA: 1050,
    CHAMP: 96,
    CHAMP_TURBO: 108,
    PORTEE: 105,
    /** Quatre-vingt-quatre segments entre deux portiques : 16 800 unités. */
    SEGMENTS_PAR_PORTIQUE: 84,
    PREMIER_PORTIQUE: 68,
    /** Douze segments avant la ligne : la caméra roule DERRIÈRE le kart, et il
     *  lui faut de la piste sous les roues dès la grille de départ. */
    DEPART: 12
};

/**
 * LES TROIS ALLURES.
 *
 * LE NOM DIT LE TEMPS QU'ON A, PAS UNE CYLINDRÉE. Le fichier reçu les appelait
 * « 50cc, 100cc, 150cc », ce qui ne dit rien à qui ne connaît pas le jeu d'où
 * cela vient. Ce que le réglage commande, c'est le temps entre deux
 * portiques : huit secondes, six, quatre et demie, un peu moins de quatre.
 *
 * ET IL Y A UN CRAN SOUS « TRANQUILLE ». Rémy, sur tous les exercices à
 * chronomètre : « il faudrait aussi […] rajouter encore une option qui est
 * plus lente que le plus bas ». Le fichier reçu s'arrêtait à six secondes — ce
 * qu'un adulte trouve lent. Huit secondes, c'est le temps de retrouver 7 × 8
 * en passant par 7 × 7. L'épreuve des allures (`tests/allure.test.mjs`) a
 * refusé la liste tant que ce cran n'y était pas.
 */
export const ALLURES = {
    ralenti: { croisiere: 2100, turbo: 3500, etoile: 3420, toux: 1460, secondes: 8.0 },
    tranquille: { croisiere: 2800, turbo: 4650, etoile: 4550, toux: 1950, secondes: 6.0 },
    normale: { croisiere: 3650, turbo: 5750, etoile: 5600, toux: 2500, secondes: 4.6 },
    rapide: { croisiere: 4500, turbo: 6850, etoile: 6650, toux: 3100, secondes: 3.7 }
};

/* ─────────────────────────────────────────────────────────────────────────
 * 2. LES PILOTES
 * ─────────────────────────────────────────────────────────────────────────
 *
 * LA JUSTESSE DES RIVAUX EST LEUR SEUL RÉGLAGE. Ils roulent à la même allure
 * que nous, gagnent le même élan pour une bonne réponse et perdent la même
 * seconde pour une mauvaise. Léo se trompe une fois sur dix, Mia une fois sur
 * quatre, Sacha deux fois sur cinq.
 *
 * NOUS AVONS LES BONUS EN PLUS, EUX NON — c'est le cadeau du jeu, et il se
 * mesure (`node tools/equilibreDuKart.mjs`, soixante courses) : qui calcule
 * tout juste finit premier soixante fois ; qui a juste trois fois sur quatre,
 * comme Mia, finit premier deux fois sur trois ; qui ne touche à rien, ou suit
 * le kart de devant sans calculer, tombe à une réussite sur trois et finit
 * entre la troisième et la dernière place.
 */
export const PILOTES = [
    { id: 'joueur', nom: 'Toi', num: '1', coque: '#ef4444', lisere: '#ffffff', casque: '#dc2626', echarpe: '#fde047' },
    { id: 'leo', nom: 'Léo', num: '2', coque: '#06b6d4', lisere: '#ecfeff', casque: '#0891b2', echarpe: '#f43f5e', justesse: 0.9, voie: 0 },
    { id: 'mia', nom: 'Mia', num: '3', coque: '#f59e0b', lisere: '#fef3c7', casque: '#d97706', echarpe: '#38bdf8', justesse: 0.75, voie: 2 },
    { id: 'sacha', nom: 'Sacha', num: '4', coque: '#a855f7', lisere: '#f3e8ff', casque: '#7e22ce', echarpe: '#34d399', justesse: 0.6, voie: 0 }
];

/* ─────────────────────────────────────────────────────────────────────────
 * 3. LES BONUS
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * DIX BONUS. Six venaient du fichier reçu ; Rémy en a demandé d'autres —
 * « rajouter des bonus » — et quatre s'ajoutent.
 *
 * AUCUN NE DONNE LA RÉPONSE. C'est la seule règle, et elle a écarté les deux
 * premières idées : un aimant qui tire le kart vers la bonne voie, une flèche
 * qui la montre. L'INDICE s'en approche le plus et s'arrête avant : il barre
 * les mauvais résultats jusqu'à n'en laisser que deux — il reste à calculer
 * pour choisir. Le SABLIER, lui, est le bonus du professeur : il ne donne
 * rien d'autre que du temps pour réfléchir, à tout le monde à la fois, donc
 * sans faire perdre une place.
 */
export const BONUS = {
    turbo: { id: 'turbo', nom: 'Champi-turbo', dit: 'Champi-turbo ! Accélération maximale.' },
    carapace: { id: 'carapace', nom: 'Carapace guidée', dit: 'Carapace lancée sur le pilote de devant.' },
    etoile: { id: 'etoile', nom: 'Super étoile', dit: 'Super étoile ! Rien ne te ralentit.' },
    bouclier: { id: 'bouclier', nom: 'Bouclier bulle', dit: 'Bouclier prêt : la prochaine erreur ne te ralentira pas.' },
    eclair: { id: 'eclair', nom: 'Éclair', dit: 'Éclair ! Tous les autres ralentissent.' },
    banane: { id: 'banane', nom: 'Peau de banane', dit: 'Peau de banane posée derrière toi.' },
    indice: { id: 'indice', nom: 'Indice', dit: 'Indice : il ne reste que deux résultats. À toi de calculer.' },
    sablier: { id: 'sablier', nom: 'Sablier', dit: 'Sablier : le temps ralentit, prends le temps de calculer.' },
    echange: { id: 'echange', nom: 'Échange', dit: 'Échange ! Tu prends la place du pilote de devant.' },
    glacon: { id: 'glacon', nom: 'Glaçon', dit: 'Glaçon ! Le pilote de devant est pris dans la glace.' }
};

/** Les durées, en secondes. */
export const DUREES = {
    ROULETTE: 1.25, ELAN_JUSTE: 1.35, TOUX: 1.1, TURBO: 3.2, ETOILE: 5.0,
    TETE_A_QUEUE: 1.4, ECLAIR: 4.2, FETE: 1.6, BOITE: 5.0,
    SABLIER: 6.0, GEL: 2.6
};

/** Sous le sablier, tout le monde roule à cette part de sa vitesse. */
export const LENTEUR_DU_SABLIER = 0.5;

/** Une série de trois bonnes réponses donne un bonus. */
export const SERIE_BONUS = 3;

/* ─────────────────────────────────────────────────────────────────────────
 * 4. LES PORTIQUES — voir `multiKartCalculs.js`
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Ce qu'on pose sous un portique — la famille de calculs, le sens, les
 * leurres, le nombre de voies — a son fichier : il a grossi le jour où Rémy a
 * demandé autre chose que les tables. Ici, un portique n'est plus qu'un objet
 * qui a une place sur la piste, des `choix`, une `voieJuste` et un nombre de
 * `voies`.
 */

/* ─────────────────────────────────────────────────────────────────────────
 * 5. LA COURSE
 * ───────────────────────────────────────────────────────────────────────── */

const versZero = (t, dt) => Math.max(0, t - dt);

/**
 * UNE COURSE, DU DÉPART AU PODIUM.
 *
 * On la fait avancer avec `avancer(dt)`, qui rend la liste de ce qui vient de
 * se passer — un portique franchi, un bonus gagné, un rival touché. Le dessin
 * lit ces événements pour ses gerbes et ses annonces ; les épreuves les lisent
 * pour compter. La course elle-même n'affiche rien.
 */
export class Course {
    constructor({ tables = [2, 3, 4, 5, 6, 7, 8, 9, 10], familles = ['mul'], sens = 'resultat',
        voies = 3, portiques = 10, allure = 'tranquille', graine = 'mk', faits = null } = {}) {
        this.rng = makeRng(graine);
        this.allure = ALLURES[allure] || ALLURES.tranquille;
        this.nomAllure = ALLURES[allure] ? allure : 'tranquille';
        // Une révision repasse chaque calcul raté deux fois, sans descendre
        // sous cinq portiques ni dépasser quinze : en dessous on n'a pas le
        // temps d'entrer dans la course, au-dessus on se lasse de ses erreurs.
        this.total = faits && faits.length
            ? Math.max(5, Math.min(15, faits.length * 2)) : portiques;
        this.revision = !!(faits && faits.length);
        this.reglageVoies = voies;
        this.portiques = fabriquerPortiques({ familles, tables, sens, voies }, this.total, this.rng, faits);
        this.tracer();

        this.etat = 'attente';
        this.temps = 0;
        this.horloge = 0;
        this.actif = 0;

        this.joueur = {
            z: PISTE.DEPART * PISTE.LONGUEUR_SEGMENT, x: 0, voie: 0,
            vitesse: 0, braquage: 0, frein: false, arrive: null
        };
        this.turbo = 0; this.etoile = 0; this.toux = 0; this.fete = 0; this.flash = 0;
        this.bouclier = false;
        this.sablier = 0;
        this.bonus = null;
        this.roulette = 0;
        this.rouletteCran = 0;
        this.serie = 0; this.meilleureSerie = 0;
        this.reussis = []; this.rates = [];
        this.bananes = []; this.carapaces = [];

        // LA GRILLE : Léo et Mia de part et d'autre, une longueur devant ; Sacha
        // à gauche, quatre longueurs devant. PERSONNE AU MILIEU : c'est notre
        // voie, et la caméra roule derrière nous — un kart placé là est caché
        // par le nôtre. Vu deux fois sur la photo du départ : rangé en file,
        // puis posé trois longueurs devant, Sacha restait derrière notre casque.
        const grille = [380, 380, 1500];
        this.rivaux = PILOTES.slice(1).map((p, i) => ({
            ...p, z: this.joueur.z + grille[i], x: (p.voie - 1) * 0.66,
            cible: (p.voie - 1) * 0.66,
            vitesse: 0, portique: 0, voieAuPortique: null, arrive: null, rangee: i,
            elan: 0, toux: 0, tete: 0, ralenti: 0, gel: 0, flanerie: 2 + i * 1.3
        }));
        this.evenements = [];
        // On part dans la voie la plus proche du milieu de la piste.
        this.joueur.voie = voieDe(0, this.voiesIci);
        this.joueur.x = centresDesVoies(this.voiesIci)[this.joueur.voie];
    }

    /**
     * COMBIEN DE VOIES LÀ OÙ L'ON ROULE : celles du portique qu'on approche,
     * puis celles du dernier jusqu'à la ligne. La piste est repeinte juste
     * après chaque portique — c'est là que deux voies en deviennent trois.
     */
    get voiesIci() {
        const p = this.portiques[Math.min(this.actif || 0, this.portiques.length - 1)];
        return p ? p.voies : 3;
    }

    /**
     * LA PISTE : des virages, des bosses, et un portique tous les 84 segments.
     *
     * Elle est la même pour toutes les courses de même longueur — les virages
     * viennent de sinus, pas de la graine. C'est voulu : ce qui change d'une
     * course à l'autre, ce sont les CALCULS, et un élève qui rejoue pour
     * réviser ses erreurs retrouve la même route sous d'autres questions.
     */
    tracer() {
        const L = PISTE.LONGUEUR_SEGMENT, parPortique = PISTE.SEGMENTS_PAR_PORTIQUE;
        const dernier = PISTE.PREMIER_PORTIQUE + (this.total - 1) * parPortique;
        this.segmentArrivee = dernier + 38;
        // DE LA PISTE APRÈS LA LIGNE, plus loin que ne porte le regard : on
        // la franchit en roulant, et l'on doit voir une route devant soi
        // jusqu'à l'arrêt — pas le bord du monde.
        const combien = this.segmentArrivee + 60 + PISTE.PORTEE;
        const parSegment = new Map();
        this.portiques.forEach((p, i) => {
            p.segment = PISTE.PREMIER_PORTIQUE + i * parPortique;
            p.z = p.segment * L;
            p.debutZ = i === 0 ? PISTE.DEPART * L : this.portiques[i - 1].z;
            parSegment.set(p.segment, p);
        });

        this.segments = [];
        this.boites = [];
        let yAvant = 0;
        for (let n = 0; n < combien; n++) {
            let courbe = 0, y = 0;
            if (n > 14 && n < this.segmentArrivee - 10) {
                courbe = Math.sin(n * 0.022) * 1.75 + Math.cos(n * 0.041) * 0.85;
                y = Math.sin(n * 0.031) * 950 + Math.sin(n * 0.015) * 620;
            }
            // ── LE BORD DE LA PISTE ─────────────────────────────────────
            //
            // QUATRE GENRES D'OBJETS, ET UN REPÈRE DE LOIN EN LOIN. Le fichier
            // reçu alternait un arbre et un rocher, à la même distance, des
            // deux côtés : au bout de dix secondes on ne voyait plus un
            // paysage mais un papier peint. `sorte` va de 0 à 3 — chaque
            // circuit y met ses propres objets —, la distance au bord et la
            // taille varient, et tous les quarante-deux segments un REPÈRE
            // plus grand et plus loin (un moulin, un chalet, un phare) donne
            // au regard quelque chose à voir venir. Dans un virage serré, des
            // CHEVRONS sur l'extérieur : c'est le seul décor qui renseigne.
            const decors = [];
            const h = (k) => ((n * 2654435761 + k * 40503) >>> 0) % 1000 / 1000;
            if (n % 4 === 0) {
                decors.push({ genre: 'objet', sorte: Math.floor(h(1) * 4),
                    cote: -1.36 - h(2) * 1.5, taille: 0.8 + h(3) * 0.75 });
            }
            if ((n + 2) % 4 === 0) {
                decors.push({ genre: 'objet', sorte: Math.floor(h(4) * 4),
                    cote: 1.36 + h(5) * 1.5, taille: 0.8 + h(6) * 0.75 });
            }
            if (n % 42 === 21) {
                decors.push({ genre: 'repere', sorte: Math.floor(h(7) * 2),
                    cote: (h(8) < 0.5 ? -1 : 1) * (3.1 + h(9) * 1.2), taille: 2.6 });
            }
            if (Math.abs(courbe) > 1.9 && n % 5 === 0) {
                decors.push({ genre: 'chevron', sens: Math.sign(courbe),
                    cote: -Math.sign(courbe) * 1.24, taille: 0.62 });
            }
            const prochain = this.portiques[Math.max(0, Math.min(this.portiques.length - 1,
                Math.ceil((n - PISTE.PREMIER_PORTIQUE) / parPortique)))];
            this.segments.push({
                index: n, courbe, sombre: Math.floor(n / 3) % 2 === 1, decors,
                // Le nombre de voies peintes : celles du portique qui vient.
                voies: prochain ? prochain.voies : 3,
                // Les hauteurs se raccordent : le début d'un segment est la
                // fin du précédent, sans quoi la route se casse en marches.
                p1: { y: yAvant, z: n * L }, p2: { y, z: (n + 1) * L },
                portique: parSegment.get(n) || null,
                depart: n === PISTE.DEPART, arrivee: n === this.segmentArrivee
            });
            yAvant = y;
            // Une boîte à bonus à mi-chemin, un portique sur deux.
            if (n > 24 && n < dernier - 20 && (n - 26) % (parPortique * 2) === 0) {
                const centres = centresDesVoies(prochain ? prochain.voies : 3);
                const voie = Math.floor(n / parPortique) % centres.length;
                this.boites.push({ z: n * L, x: centres[voie], prise: 0, phase: voie * 1.5 });
            }
        }
        this.longueur = this.segments.length * L;
        this.arriveeZ = this.segmentArrivee * L;
    }

    /* ── LES COMMANDES ─────────────────────────────────────────────────── */

    demarrer() { if (this.etat === 'attente') this.etat = 'course'; }

    /** Viser une voie. Rend vrai si la visée a changé. */
    viser(voie) {
        if (this.etat !== 'course') return false;
        const v = Math.max(0, Math.min(this.voiesIci - 1, voie));
        if (v === this.joueur.voie) return false;
        this.joueur.voie = v;
        return true;
    }

    freiner(oui) { this.joueur.frein = !!oui; }

    /** Le portique qu'on approche, ou `null` après le dernier. */
    get portiqueActif() { return this.portiques[this.actif] || null; }

    /** Où l'on en est de l'approche du portique actif, entre 0 et 1. */
    get approche() {
        const p = this.portiqueActif;
        if (!p) return 1;
        return Math.max(0, Math.min(1, (this.joueur.z - p.debutZ) / Math.max(1, p.z - p.debutZ)));
    }

    /* ── LES BONUS ─────────────────────────────────────────────────────── */

    lancerRoulette() {
        this.roulette = DUREES.ROULETTE;
        this.rouletteCran = this.rng.int(0, 5);
        this.bonus = null;
        this.evenements.push({ quoi: 'roulette' });
    }

    /**
     * LE TIRAGE, PARMI CE QUI SERT.
     *
     * Le fichier reçu tirait sur les six. On recevait donc une carapace en
     * tête de course — elle partait tout droit dans le vide — ou une banane
     * en étant dernier. Un bonus qui ne fait rien est pire qu'aucun bonus : on
     * appuie, rien ne se passe, et l'on croit le jeu cassé.
     */
    tirerBonus() {
        const devant = this.rivaux.some((r) => r.z > this.joueur.z);
        const derriere = this.rivaux.some((r) => r.z < this.joueur.z);
        const p = this.portiqueActif;
        const utiles = Object.keys(BONUS).filter((id) =>
            (id !== 'carapace' || devant) && (id !== 'banane' || derriere)
            && (id !== 'eclair' || devant) && (id !== 'bouclier' || !this.bouclier)
            && (id !== 'glacon' || devant) && (id !== 'echange' || devant)
            // L'indice barre jusqu'à n'en laisser que deux : sous un portique
            // à deux voies, il ne barrerait rien.
            && (id !== 'indice' || this.portiques.slice(this.actif).some((q) => q.voies >= 3))
            && (id !== 'sablier' || !!p));
        this.bonus = this.rng.pick(utiles);
        this.evenements.push({ quoi: 'bonus', id: this.bonus });
    }

    utiliserBonus() {
        if (this.etat !== 'course') return false;
        if (this.roulette > 0) { this.roulette = 0; this.tirerBonus(); return true; }
        if (!this.bonus) return false;
        const id = this.bonus;
        this.bonus = null;
        if (id === 'turbo') { this.turbo = DUREES.TURBO; this.toux = 0; }
        else if (id === 'etoile') { this.etoile = DUREES.ETOILE; this.toux = 0; }
        else if (id === 'bouclier') this.bouclier = true;
        else if (id === 'eclair') {
            this.flash = 0.5;
            for (const r of this.rivaux) { r.ralenti = DUREES.ECLAIR; r.tete = 0.8; }
        } else if (id === 'banane') {
            this.bananes.push({ z: Math.max(0, this.joueur.z - 220), x: this.joueur.x, la: true });
        } else if (id === 'carapace') {
            const cible = this.rivaux.filter((r) => r.z > this.joueur.z)
                .sort((a, b) => a.z - b.z)[0] || null;
            this.carapaces.push({ z: this.joueur.z + 240, x: this.joueur.x,
                vitesse: this.allure.turbo * 1.6, cible, vie: 5.5 });
        } else if (id === 'sablier') {
            this.sablier = DUREES.SABLIER;
        } else if (id === 'glacon') {
            const cible = this.rivaux.filter((r) => r.z > this.joueur.z).sort((a, b) => a.z - b.z)[0];
            if (cible) {
                cible.gel = DUREES.GEL;
                this.evenements.push({ quoi: 'touche', pilote: cible, par: 'glacon' });
            }
        } else if (id === 'indice') {
            // LE PROCHAIN PORTIQUE QUI A PLUS DE DEUX VOIES — celui-ci s'il en
            // est, le suivant sinon : un indice ne se perd pas pour avoir été
            // lancé sous un portique à deux voies.
            const p = this.portiques.slice(this.actif).find((q) => q.voies >= 3 && !q.barre.length);
            if (p) {
                const faux = this.rng.shuffle([...Array(p.voies).keys()].filter((v) => v !== p.voieJuste));
                p.barre = faux.slice(0, p.voies - 2);
            }
        } else if (id === 'echange') {
            // ON N'ÉCHANGE PAS PAR-DESSUS UN PORTIQUE. Prendre la place d'un
            // rival qui a déjà franchi le nôtre, ce serait sauter une
            // question : l'échange se change alors en turbo, qui rapproche
            // sans rien faire sauter.
            const p = this.portiqueActif;
            const limite = p ? p.z - 500 : this.arriveeZ - 500;
            const cible = this.rivaux.filter((r) => r.z > this.joueur.z && r.z < limite)
                .sort((a, b) => a.z - b.z)[0];
            if (cible) {
                [cible.z, this.joueur.z] = [this.joueur.z, cible.z];
                cible.portique = this.portiques.findIndex((q) => q.z > cible.z);
                if (cible.portique < 0) cible.portique = this.portiques.length;
                this.evenements.push({ quoi: 'echange', pilote: cible });
            } else {
                this.turbo = DUREES.TURBO;
                this.evenements.push({ quoi: 'usage', id: 'turbo' });
                return true;
            }
        }
        this.evenements.push({ quoi: 'usage', id });
        return true;
    }

    /* ── UN PORTIQUE FRANCHI ───────────────────────────────────────────── */

    franchir(p) {
        p.passe = true;
        // LA VOIE OÙ EST LE KART, pas celle qu'on vise — voir l'en-tête.
        const voie = voieDe(this.joueur.x, p.voies);
        p.voieDonnee = voie;
        p.donne = p.choix[voie];
        p.reussi = voie === p.voieJuste;
        const fait = { ...p.fait, texte: p.egalite };
        let protege = null;
        if (p.reussi) {
            this.serie++;
            this.meilleureSerie = Math.max(this.meilleureSerie, this.serie);
            this.fete = DUREES.FETE;
            this.toux = 0;
            this.turbo = Math.max(this.turbo, DUREES.ELAN_JUSTE);
            this.reussis.push(fait);
            if (this.serie % SERIE_BONUS === 0) this.lancerRoulette();
        } else {
            this.serie = 0;
            this.rates.push(fait);
            // L'ERREUR EST TOUJOURS CORRIGÉE, MÊME PROTÉGÉE. Le bouclier et
            // l'étoile épargnent la vitesse, jamais la leçon : l'événement
            // porte la bonne réponse dans les trois cas.
            if (this.bouclier) { this.bouclier = false; protege = 'bouclier'; }
            else if (this.etoile > 0) protege = 'etoile';
            else { this.toux = DUREES.TOUX; this.turbo = 0; }
        }
        this.actif++;
        this.evenements.push({ quoi: 'portique', portique: p, juste: p.reussi, protege,
            serie: this.serie });
    }

    /* ── LES RIVAUX ────────────────────────────────────────────────────── */

    avancerRivaux(dt) {
        const A = this.allure;
        for (const r of this.rivaux) {
            r.tete = versZero(r.tete, dt); r.ralenti = versZero(r.ralenti, dt);
            r.elan = versZero(r.elan, dt); r.toux = versZero(r.toux, dt);
            r.gel = versZero(r.gel, dt);

            // ── IL RÉPOND, LUI AUSSI — À SON PROPRE CALCUL ──────────────
            //
            // SA VOIE NE DIT RIEN DE LA NÔTRE. La première version le faisait
            // répondre à NOTRE question : juste, il prenait la bonne arche.
            // Vu sur la photo du troisième portique — les trois rivaux
            // rangés dans la voie du bon résultat, une seconde avant que
            // l'élève qui les suit ait à choisir. Léo a juste neuf fois sur
            // dix : il suffisait de le suivre, et c'est précisément l'élève
            // en retard, celui qui a le plus besoin de calculer, qui l'avait
            // sous les yeux. Une antisèche roulante.
            //
            // Chacun a donc son calcul. Le rival passe sous l'arche où sa
            // flânerie l'a mené, et le dé de sa justesse dit s'il accélère ou
            // s'il tousse. Le suivre donne le bon résultat une fois sur trois
            // — ni plus ni moins que le hasard, et une épreuve le mesure.
            const p = this.portiques[r.portique];
            if (p && r.z >= p.z) {
                if (this.rng.next() < r.justesse) r.elan = DUREES.ELAN_JUSTE;
                else r.toux = DUREES.TOUX;
                r.voieAuPortique = voieDe(r.x, p.voies);
                r.portique++;
            }

            let vise = A.croisiere;
            if (r.elan > 0) vise = A.turbo;
            else if (r.toux > 0) vise = A.toux;
            // Un peloton qui s'étire sur un kilomètre n'est plus une course :
            // celui qui traîne loin derrière reprend un peu, celui qui file
            // loin devant lève un peu le pied. Six pour cent, pas davantage —
            // au-delà, c'est l'élastique qui ferait le classement, et non les
            // calculs.
            const ecart = this.joueur.z - r.z;
            if (ecart > 2600) vise *= 1.06; else if (ecart < -2600) vise *= 0.94;
            if (r.tete > 0) vise *= 0.45; else if (r.ralenti > 0) vise *= 0.65;
            if (r.gel > 0) vise = 0;
            // LA LIGNE FRANCHIE, il lève le pied puis s'arrête — chacun un peu
            // plus loin que l'autre, pour ne pas s'empiler.
            if (r.arrive === null && r.z >= this.arriveeZ) r.arrive = this.horloge;
            if (r.arrive !== null) {
                vise = r.z < this.arriveeZ + 3000 + r.rangee * 900 ? A.croisiere * 0.55 : 0;
            }
            r.vitesse += (vise - r.vitesse) * Math.min(1, 3 * dt);
            r.z += r.vitesse * dt;

            // Il flâne d'une voie à l'autre, sans égard pour les portiques.
            r.flanerie -= dt;
            if (r.flanerie <= 0) {
                // Une voie de la piste telle qu'elle est peinte là où il roule.
                const seg = this.segments[Math.min(this.segments.length - 1, Math.floor(r.z / PISTE.LONGUEUR_SEGMENT))];
                // Chacun roule un peu décalé dans sa voie : trois karts dans
                // la même ne se superposent pas en une seule tache.
                r.cible = this.rng.pick(centresDesVoies(seg.voies)) + (r.rangee - 1) * 0.07;
                r.flanerie = 3 + this.rng.next() * 4;
            }
            r.x += (r.cible - r.x) * Math.min(1, 4.5 * dt);

            if (this.etat === 'course' && this.etoile > 0 && r.tete <= 0
                && Math.abs(r.z - this.joueur.z) < 200 && Math.abs(r.x - this.joueur.x) < 0.34) {
                r.tete = 1.3;
                this.evenements.push({ quoi: 'touche', pilote: r, par: 'etoile' });
            }
            for (const b of this.bananes) {
                if (!b.la || r.tete > 0) continue;
                if (Math.abs(b.z - r.z) < 170 && Math.abs(b.x - r.x) < 0.25) {
                    b.la = false; r.tete = 1.3;
                    this.evenements.push({ quoi: 'touche', pilote: r, par: 'banane' });
                }
            }
        }
    }

    avancerCarapaces(dt) {
        for (let i = this.carapaces.length - 1; i >= 0; i--) {
            const c = this.carapaces[i];
            c.vie -= dt;
            c.z += c.vitesse * dt;
            if (c.cible) {
                c.x += (c.cible.x - c.x) * Math.min(1, 6 * dt);
                if (c.z >= c.cible.z - 240 && Math.abs(c.x - c.cible.x) < 0.35) {
                    c.cible.tete = DUREES.TETE_A_QUEUE;
                    this.evenements.push({ quoi: 'touche', pilote: c.cible, par: 'carapace' });
                    this.carapaces.splice(i, 1);
                    continue;
                }
            }
            if (c.vie <= 0 || c.z >= this.longueur) this.carapaces.splice(i, 1);
        }
    }

    /* ── UN PAS DE COURSE ──────────────────────────────────────────────── */

    /** Fait avancer la course de `dt` secondes. Rend ce qui vient de se passer. */
    avancer(reel) {
        this.evenements = [];
        this.horloge += reel;
        if (this.etat === 'attente') return this.evenements;
        const A = this.allure, j = this.joueur;
        if (this.etat === 'course') this.temps += reel;
        // LE SABLIER RALENTIT LE MONDE, PAS L'HORLOGE. Tout le monde roule à
        // mi-vitesse — nous, les rivaux, les carapaces — donc personne ne
        // gagne ni ne perd une place : on gagne seulement du temps pour
        // calculer. Le chronomètre, lui, tourne au vrai : ce temps-là se paie
        // au tableau d'arrivée, et nulle part ailleurs.
        this.sablier = versZero(this.sablier, reel);
        const dt = this.sablier > 0 && this.etat === 'course' ? reel * LENTEUR_DU_SABLIER : reel;

        this.turbo = versZero(this.turbo, dt); this.etoile = versZero(this.etoile, dt);
        this.toux = versZero(this.toux, dt); this.fete = versZero(this.fete, dt);
        this.flash = versZero(this.flash, dt);

        if (this.roulette > 0) {
            const cran = Math.floor(this.roulette / 0.09);
            this.roulette = versZero(this.roulette, dt);
            if (Math.floor(this.roulette / 0.09) !== cran) this.rouletteCran++;
            if (this.roulette === 0) this.tirerBonus();
        }

        let vise = A.croisiere;
        if (this.etat === 'arrivee') vise = j.z < this.arriveeZ + 4400 ? A.croisiere * 0.55 : 0;
        else if (this.etoile > 0) vise = A.etoile;
        else if (this.turbo > 0) vise = A.turbo;
        else if (this.toux > 0) vise = A.toux;
        // LE FREIN N'EST PAS UNE PUNITION, C'EST DU TEMPS. On ralentit pour
        // finir son calcul — et on y perd des places, ce qui est le juste
        // prix : mieux vaut arriver deuxième avec la bonne réponse.
        if (j.frein && this.etat === 'course' && this.etoile <= 0 && this.turbo <= 0) vise *= 0.62;
        j.vitesse += (vise - j.vitesse) * Math.min(1, 4.2 * dt);

        const centres = centresDesVoies(this.voiesIci);
        const ecartX = centres[Math.min(j.voie, centres.length - 1)] - j.x;
        j.x += ecartX * Math.min(1, 11.5 * dt);
        j.braquage = Math.max(-1, Math.min(1, ecartX * 2.4));

        const avant = j.z;
        j.z += j.vitesse * dt;

        if (this.etat === 'course') {
            const p = this.portiqueActif;
            if (p && !p.passe && avant < p.z && j.z >= p.z) {
                this.franchir(p);
                // LA PISTE EST REPEINTE APRÈS LE PORTIQUE : deux voies en
                // deviennent trois. On garde la voie la plus proche d'où l'on
                // est — le kart ne fait pas d'écart tout seul.
                j.voie = voieDe(j.x, this.voiesIci);
            }

            for (const b of this.boites) {
                if (b.prise > 0) { b.prise = versZero(b.prise, dt); continue; }
                if (Math.abs(b.z - j.z) < 220 && Math.abs(b.x - j.x) < 0.28) {
                    b.prise = DUREES.BOITE;
                    this.evenements.push({ quoi: 'boite' });
                    if (!this.bonus && this.roulette <= 0) this.lancerRoulette();
                    else this.turbo = Math.max(this.turbo, 1.4);
                }
            }
            if (avant < this.arriveeZ && j.z >= this.arriveeZ) {
                this.etat = 'arrivee';
                j.arrive = this.horloge;
                this.rangFinal = this.rang();
                this.evenements.push({ quoi: 'arrivee', rang: this.rangFinal });
            }
        }

        this.avancerCarapaces(dt);
        this.avancerRivaux(dt);
        return this.evenements;
    }

    /* ── LE CLASSEMENT ET LE BILAN ─────────────────────────────────────── */

    /**
     * Les quatre pilotes, du premier au dernier.
     *
     * CEUX QUI ONT FRANCHI LA LIGNE SONT CLASSÉS À L'HEURE, les autres à la
     * distance. Classer tout le monde à la distance ferait passer devant le
     * vainqueur, arrêté après la ligne, celui qui arrive lancé derrière lui.
     */
    classement() {
        const cle = (p) => (p.arrive !== null ? -1e9 + p.arrive : -p.z);
        return [{ id: 'joueur', nom: 'Toi', z: this.joueur.z, arrive: this.joueur.arrive, joueur: true },
            ...this.rivaux.map((r) => ({ id: r.id, nom: r.nom, z: r.z, arrive: r.arrive, joueur: false }))]
            .sort((a, b) => cle(a) - cle(b));
    }

    /** La place du joueur, de 1 à 4. */
    rang() { return this.classement().findIndex((p) => p.joueur) + 1; }

    /**
     * CE QUE VAUT LA COURSE.
     *
     * LA NOTE VIENT DES CALCULS, PAS DU PODIUM. Chaque portique est une
     * question, juste ou fausse, et c'est ce compte-là que le parcours reçoit :
     * on peut finir premier en freinant peu et en ayant de la chance aux
     * bonus, et dernier en ayant tout juste après avoir pris son temps. C'est
     * le second qui sait ses tables, et c'est lui que la note doit dire.
     *
     * Le podium, lui, reste ce qu'il est : le plaisir de la course.
     */
    bilan() {
        const justes = this.reussis.length;
        const aRevoir = new Map();
        for (const f of this.rates) aRevoir.set(f.cle, f);
        return {
            rang: this.rangFinal || this.rang(), total: this.total, justes,
            precision: this.total ? justes / this.total : 0,
            temps: this.temps, meilleureSerie: this.meilleureSerie,
            reussis: this.reussis, aRevoir: [...aRevoir.values()],
            classement: this.classement()
        };
    }
}

/** « 01:07 » — le temps d'une course, pour l'afficher. */
export function tempsEcrit(secondes) {
    const t = Math.max(0, Math.floor(secondes));
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** « 1er », « 2e »… */
export const rangEcrit = (n) => (n === 1 ? '1er' : `${n}e`);

/* ─────────────────────────────────────────────────────────────────────────
 * 6. LES CIRCUITS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * RÉMY : « améliore le décor aussi mais vraiment super bien le décor, tu peux
 * mettre plusieurs circuits et plusieurs ambiances ».
 *
 * HUIT LIEUX, ET NON HUIT PALETTES. La première version avait trois circuits
 * qui étaient les mêmes collines repeintes. Chacun a maintenant son `fond` —
 * ce qu'on voit au loin : des collines et un moulin, la mer et ses voiliers,
 * des mesas, des sommets, une forêt, un volcan, une ville, l'espace —, ses
 * quatre `objets` de bord de piste, ses deux `reperes` qu'on voit venir de
 * loin, et sa `meteo` : la neige qui tombe, les feuilles, les braises.
 *
 * ILS SONT ICI, ET NON DANS LE DESSIN, POUR QU'ON PUISSE LES MESURER. Une
 * palette se juge sur un chiffre — la piste se détache-t-elle du bas-côté ? —
 * et une épreuve ne peut pas importer un fichier qui touche à l'écran.
 *
 * `brume` est la couleur vers laquelle le lointain se fond : celle du bas du
 * ciel. C'est elle qui donne la profondeur — sans elle, le centième segment
 * est peint du même gris que le premier et la route a l'air d'un mur.
 */
export const CIRCUITS = {
    prairie: {
        nom: 'Prairie ensoleillée', court: 'Prairie', nuit: false, fond: 'collines', meteo: 'pollen',
        ciel: ['#0b78c9', '#4fb8f5', '#d9f1ff'], astre: '#fff7c2', halo: 'rgba(253, 224, 71, 0.42)',
        brume: '#d9f1ff',
        lointain: '#7ea3c4', collineLoin: '#4f8a6b', collinePres: '#1f8a4c',
        herbe: ['#3fcf6b', '#2fb85a'], piste: ['#566173', '#4a5466'],
        vibreur: ['#ffffff', '#ef4444'], trait: 'rgba(255, 255, 255, 0.82)',
        objets: ['arbre', 'peuplier', 'buisson', 'foin'], reperes: ['moulin', 'ferme']
    },
    plage: {
        nom: 'Plage des cocotiers', court: 'Plage', nuit: false, fond: 'mer', meteo: 'mouettes',
        ciel: ['#0a7fcb', '#4cc4f0', '#d3f4ff'], astre: '#fffbe0', halo: 'rgba(254, 240, 138, 0.5)',
        brume: '#d3f4ff',
        lointain: '#19a7c9', collineLoin: '#3c9a70', collinePres: '#e9cf8f',
        herbe: ['#f3dca6', '#e9cd8e'], piste: ['#5d6676', '#515a6a'],
        vibreur: ['#ffffff', '#f97316'], trait: 'rgba(255, 255, 255, 0.85)',
        objets: ['palmier', 'parasol', 'cabine', 'chateau'], reperes: ['phare', 'paillote']
    },
    canyon: {
        nom: 'Canyon au crépuscule', court: 'Canyon', nuit: false, fond: 'mesas', meteo: 'poussiere',
        ciel: ['#5b1f3a', '#f97316', '#fde3a0'], astre: '#fff4d6', halo: 'rgba(251, 146, 60, 0.55)',
        brume: '#f8cf94',
        lointain: '#b8603a', collineLoin: '#a3441c', collinePres: '#c2521a',
        herbe: ['#e08a1e', '#c9741a'], piste: ['#5e5852', '#514b46'],
        vibreur: ['#fef3c7', '#dc2626'], trait: 'rgba(254, 243, 199, 0.82)',
        objets: ['cactus', 'rocher', 'broussaille', 'pancarte'], reperes: ['arche', 'cheminee']
    },
    neige: {
        nom: 'Sommets enneigés', court: 'Neige', nuit: false, fond: 'sommets', meteo: 'neige',
        ciel: ['#3a5a9c', '#9cc3ee', '#f1e9f2'], astre: '#fff8e7', halo: 'rgba(255, 226, 204, 0.55)',
        brume: '#eef0f8',
        lointain: '#b9c9e6', collineLoin: '#8fa8d0', collinePres: '#3f6b5a',
        herbe: ['#f5f9ff', '#e2ebfa'], piste: ['#5a6478', '#4e586c'],
        vibreur: ['#ffffff', '#2563eb'], trait: 'rgba(255, 255, 255, 0.9)',
        objets: ['sapin', 'bonhomme', 'congere', 'bouleau'], reperes: ['chalet', 'igloo']
    },
    automne: {
        nom: 'Forêt d\'automne', court: 'Automne', nuit: false, fond: 'foret', meteo: 'feuilles',
        ciel: ['#5f79a8', '#ecc79a', '#fff0d2'], astre: '#fff3d0', halo: 'rgba(253, 186, 116, 0.5)',
        brume: '#fbe9c8',
        lointain: '#c9a06a', collineLoin: '#b5652a', collinePres: '#8f3f1c',
        herbe: ['#93a23c', '#829134'], piste: ['#5b5a5e', '#4f4e52'],
        vibreur: ['#fff7e6', '#b45309'], trait: 'rgba(255, 247, 230, 0.85)',
        objets: ['erable', 'hetre', 'champignon', 'souche'], reperes: ['cabane', 'chene']
    },
    volcan: {
        nom: 'Volcan en colère', court: 'Volcan', nuit: true, fond: 'volcan', meteo: 'braises',
        ciel: ['#12040a', '#5a1010', '#c2491c'], astre: '#ffd27a', halo: 'rgba(255, 120, 40, 0.45)',
        brume: '#b8431a',
        lointain: '#4a1414', collineLoin: '#2a0d10', collinePres: '#1c090c',
        herbe: ['#2c1d1f', '#231618'], piste: ['#56505c', '#4a4450'],
        vibreur: ['#fde047', '#dc2626'], trait: 'rgba(254, 215, 170, 0.85)',
        objets: ['basalte', 'lave', 'arbremort', 'braise'], reperes: ['geyser', 'obelisque']
    },
    neon: {
        nom: 'Nuit néon', court: 'Néon', nuit: true, fond: 'ville', meteo: null,
        ciel: ['#020617', '#101a3a', '#2a1f66'], astre: '#e0f2fe', halo: 'rgba(125, 211, 252, 0.30)',
        brume: '#2a1f66',
        lointain: '#1b1750', collineLoin: '#231c63', collinePres: '#2e2780',
        // LA PISTE DE NUIT EST PLUS CLAIRE QUE SON BAS-CÔTÉ D'UN TIERS AU MOINS.
        // À #27334d sur #111a33 l'écart tombait à 1,16 — mesuré par l'épreuve
        // des circuits : on ne distinguait la route que par ses vibreurs.
        herbe: ['#111a33', '#0c1428'], piste: ['#33415f', '#2a3653'],
        vibreur: ['#22d3ee', '#d946ef'], trait: 'rgba(125, 211, 252, 0.85)',
        objets: ['lampecyan', 'lamperose', 'enseigne', 'palmierneon'], reperes: ['tour', 'ecran']
    },
    espace: {
        nom: 'Piste des étoiles', court: 'Espace', nuit: true, fond: 'espace', meteo: 'filantes',
        ciel: ['#03010d', '#140a33', '#2b1055'], astre: '#fde68a', halo: 'rgba(167, 139, 250, 0.35)',
        brume: '#2b1055',
        lointain: '#3b1d6e', collineLoin: '#2a1458', collinePres: '#1d0f45',
        herbe: ['#160b36', '#10072a'], piste: ['#414776', '#363b66'],
        vibreur: ['#f472b6', '#1d4ed8'], trait: 'rgba(255, 255, 255, 0.88)',
        // Les vibreurs y défilent en arc-en-ciel : c'est le seul circuit où la
        // bordure change de couleur à chaque pas.
        arcEnCiel: ['#ef4444', '#f97316', '#fde047', '#22c55e', '#38bdf8', '#a855f7'],
        objets: ['cristal', 'asteroide', 'satellite', 'planete'], reperes: ['station', 'fusee']
    }
};

/**
 * LES ARCHES D'UN PORTIQUE : bleu, ambre, violet, rose — de gauche à droite.
 *
 * LA COULEUR EST UN SECOND NOM POUR LA VOIE. Sur un téléphone, on ne dit pas
 * « la voie de droite », on dit « le violet » : le résultat est écrit sur un
 * panneau de la couleur de son arche, et les deux rails de lumière qui mènent
 * au kart prennent la même. On sait où l'on va sans lire un mot.
 *
 * NI VERT NI ROUGE : ce sont les couleurs de la correction — l'arche du bon
 * résultat verdit, celle qu'on a prise à tort rougit. Une arche verte avant le
 * portique dirait « c'est celle-ci ».
 */
export const ARCHES = [
    { trait: '#38bdf8', lueur: 'rgba(56, 189, 248, 0.45)', voile: 'rgba(56, 189, 248, 0.16)' },
    { trait: '#fbbf24', lueur: 'rgba(251, 191, 36, 0.45)', voile: 'rgba(251, 191, 36, 0.16)' },
    { trait: '#c084fc', lueur: 'rgba(192, 132, 252, 0.45)', voile: 'rgba(192, 132, 252, 0.16)' },
    { trait: '#f9a8d4', lueur: 'rgba(249, 168, 212, 0.45)', voile: 'rgba(249, 168, 212, 0.16)' }
];
