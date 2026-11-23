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
    DEPART: 12,
    /** Le centre des trois voies, en fraction de la demi-largeur. */
    VOIES: [-0.66, 0, 0.66]
};

export const NOMS_DES_VOIES = ['gauche', 'centre', 'droite'];

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

export const BONUS = {
    turbo: { id: 'turbo', nom: 'Champi-turbo', dit: 'Champi-turbo ! Accélération maximale.' },
    carapace: { id: 'carapace', nom: 'Carapace guidée', dit: 'Carapace lancée sur le pilote de devant.' },
    etoile: { id: 'etoile', nom: 'Super étoile', dit: 'Super étoile ! Rien ne te ralentit.' },
    bouclier: { id: 'bouclier', nom: 'Bouclier bulle', dit: 'Bouclier prêt : la prochaine erreur ne te ralentira pas.' },
    eclair: { id: 'eclair', nom: 'Éclair', dit: 'Éclair ! Tous les autres ralentissent.' },
    banane: { id: 'banane', nom: 'Peau de banane', dit: 'Peau de banane posée derrière toi.' }
};

/** Les durées, en secondes. */
export const DUREES = {
    ROULETTE: 1.25, ELAN_JUSTE: 1.35, TOUX: 1.1, TURBO: 3.2, ETOILE: 5.0,
    TETE_A_QUEUE: 1.4, ECLAIR: 4.2, FETE: 1.6, BOITE: 5.0
};

/** Une série de trois bonnes réponses donne un bonus. */
export const SERIE_BONUS = 3;

/* ─────────────────────────────────────────────────────────────────────────
 * 4. LES PORTIQUES
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * DEUX MAUVAIS RÉSULTATS QUI RESSEMBLENT AU BON.
 *
 * C'est la meilleure idée du fichier reçu, et on la garde entière : un leurre
 * tiré au hasard s'élimine sans calculer, un leurre qui vient d'une VRAIE
 * erreur oblige à savoir. Quatre familles :
 *
 *   · le voisin dans la table — 7 × 8 → 49 ou 63, celui qui hésite d'un cran ;
 *   · l'addition — 7 × 8 → 15, la confusion du CE2 qui traîne jusqu'en 6e ;
 *   · les chiffres retournés — 56 → 65 ;
 *   · le proche — 54, 58, 46, 66 : celui qui « sent » le résultat sans l'avoir.
 */
export function leurresMalins(a, b, rng) {
    const juste = a * b;
    const vivier = new Set();
    if (b > 2) vivier.add(a * (b - 1));
    vivier.add(a * (b + 1));
    if (a > 2) vivier.add((a - 1) * b);
    vivier.add((a + 1) * b);
    vivier.add(a + b);
    if (juste >= 12) {
        const d = Math.floor(juste / 10), u = juste % 10;
        if (u !== 0 && d !== u) vivier.add(u * 10 + d);
    }
    if (juste > 12) vivier.add(juste - 10);
    vivier.add(juste + 10);
    if (juste > 4) vivier.add(juste - 2);
    vivier.add(juste + 2);
    const bons = rng.shuffle([...vivier].filter((v) => v > 0 && v !== juste));
    return [bons[0], bons[1]];
}

/**
 * LES PORTIQUES D'UNE COURSE.
 *
 * `faits` sert à « Réviser mes erreurs » : la course ne tire plus dans les
 * tables, elle repasse les calculs ratés — deux fois chacun, la seconde dans
 * l'autre sens, parce que savoir 7 × 8 n'est pas encore savoir 8 × 7.
 */
export function fabriquerPortiques(tables, combien, rng, faits = null) {
    const liste = [];
    const choisies = tables && tables.length ? tables : [2, 3, 4, 5];
    let dernier = '';
    for (let i = 0; i < combien; i++) {
        let a, b, table;
        if (faits && faits.length) {
            const f = faits[i % faits.length];
            [a, b, table] = [f.a, f.b, f.table];
            if (i >= faits.length) [a, b] = [b, a];
        } else {
            let essais = 0;
            do {
                table = rng.pick(choisies);
                a = table;
                b = rng.int(2, 10);
                if (rng.bool(0.45)) [a, b] = [b, a];
            } while (`${a}x${b}` === dernier && ++essais < 12);
        }
        dernier = `${a}x${b}`;
        const juste = a * b;
        const choix = rng.shuffle([juste, ...leurresMalins(a, b, rng)]);
        liste.push({
            index: i, a, b, table, texte: `${a} × ${b}`, juste,
            /** Un résultat par voie : gauche, centre, droite. */
            choix, voieJuste: choix.indexOf(juste),
            passe: false, reussi: false, donne: null
        });
    }
    return liste;
}

/** La voie où se trouve un kart, d'après sa position en travers de la piste. */
export function voieDe(x) {
    let mieux = 0;
    for (let i = 1; i < PISTE.VOIES.length; i++) {
        if (Math.abs(x - PISTE.VOIES[i]) < Math.abs(x - PISTE.VOIES[mieux])) mieux = i;
    }
    return mieux;
}

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
    constructor({ tables = [2, 3, 4, 5, 6, 7, 8, 9, 10], portiques = 10, allure = 'tranquille',
        graine = 'mk', faits = null } = {}) {
        this.rng = makeRng(graine);
        this.allure = ALLURES[allure] || ALLURES.tranquille;
        this.nomAllure = ALLURES[allure] ? allure : 'tranquille';
        // Une révision repasse chaque calcul raté deux fois, sans descendre
        // sous cinq portiques ni dépasser quinze : en dessous on n'a pas le
        // temps d'entrer dans la course, au-dessus on se lasse de ses erreurs.
        this.total = faits && faits.length
            ? Math.max(5, Math.min(15, faits.length * 2)) : portiques;
        this.revision = !!(faits && faits.length);
        this.portiques = fabriquerPortiques(tables, this.total, this.rng, faits);
        this.tracer();

        this.etat = 'attente';
        this.temps = 0;
        this.horloge = 0;
        this.actif = 0;

        this.joueur = {
            z: PISTE.DEPART * PISTE.LONGUEUR_SEGMENT, x: 0, voie: 1,
            vitesse: 0, braquage: 0, frein: false, arrive: null
        };
        this.turbo = 0; this.etoile = 0; this.toux = 0; this.fete = 0; this.flash = 0;
        this.bouclier = false;
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
            ...p, z: this.joueur.z + grille[i], x: PISTE.VOIES[p.voie],
            vitesse: 0, portique: 0, voieAuPortique: null, arrive: null, rangee: i,
            elan: 0, toux: 0, tete: 0, ralenti: 0, flanerie: 2 + i * 1.3
        }));
        this.evenements = [];
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
            const decors = [];
            if (n % 6 === 0) {
                decors.push({ genre: n % 12 === 0 ? 'grand' : 'petit',
                    cote: -1.42 - (n % 3) * 0.34, taille: 0.95 + (n % 4) * 0.14 });
            }
            if ((n + 3) % 6 === 0) {
                decors.push({ genre: n % 12 === 3 ? 'petit' : 'grand',
                    cote: 1.42 + ((n + 1) % 3) * 0.34, taille: 0.95 + ((n + 2) % 4) * 0.14 });
            }
            this.segments.push({
                index: n, courbe, sombre: Math.floor(n / 3) % 2 === 1, decors,
                // Les hauteurs se raccordent : le début d'un segment est la
                // fin du précédent, sans quoi la route se casse en marches.
                p1: { y: yAvant, z: n * L }, p2: { y, z: (n + 1) * L },
                portique: parSegment.get(n) || null,
                depart: n === PISTE.DEPART, arrivee: n === this.segmentArrivee
            });
            yAvant = y;
            // Une boîte à bonus à mi-chemin, un portique sur deux.
            if (n > 24 && n < dernier - 20 && (n - 26) % (parPortique * 2) === 0) {
                const voie = Math.floor(n / parPortique) % 3;
                this.boites.push({ z: n * L, x: PISTE.VOIES[voie], prise: 0, phase: voie * 1.5 });
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
        const v = Math.max(0, Math.min(2, voie));
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
        const utiles = Object.keys(BONUS).filter((id) =>
            (id !== 'carapace' || devant) && (id !== 'banane' || derriere)
            && (id !== 'eclair' || devant) && (id !== 'bouclier' || !this.bouclier));
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
        }
        this.evenements.push({ quoi: 'usage', id });
        return true;
    }

    /* ── UN PORTIQUE FRANCHI ───────────────────────────────────────────── */

    franchir(p) {
        p.passe = true;
        // LA VOIE OÙ EST LE KART, pas celle qu'on vise — voir l'en-tête.
        const voie = voieDe(this.joueur.x);
        p.donne = p.choix[voie];
        p.reussi = p.donne === p.juste;
        const fait = { a: p.a, b: p.b, table: p.table, texte: `${p.texte} = ${p.juste}` };
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
                r.voieAuPortique = voieDe(r.x);
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
            if (r.flanerie <= 0) { r.voie = this.rng.int(0, 2); r.flanerie = 3 + this.rng.next() * 4; }
            // Chacun roule un peu décalé dans sa voie : trois karts dans la
            // même ne se superposent pas en une seule tache.
            const cible = PISTE.VOIES[r.voie] + (r.rangee - 1) * 0.08;
            r.x += (cible - r.x) * Math.min(1, 4.5 * dt);

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
    avancer(dt) {
        this.evenements = [];
        this.horloge += dt;
        if (this.etat === 'attente') return this.evenements;
        const A = this.allure, j = this.joueur;
        if (this.etat === 'course') this.temps += dt;

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

        const ecartX = PISTE.VOIES[j.voie] - j.x;
        j.x += ecartX * Math.min(1, 11.5 * dt);
        j.braquage = Math.max(-1, Math.min(1, ecartX * 2.4));

        const avant = j.z;
        j.z += j.vitesse * dt;

        if (this.etat === 'course') {
            const p = this.portiqueActif;
            if (p && !p.passe && avant < p.z && j.z >= p.z) this.franchir(p);

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
        for (const f of this.rates) aRevoir.set(`${f.a}x${f.b}`, f);
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
 * ILS SONT ICI, ET NON DANS LE DESSIN, POUR QU'ON PUISSE LES MESURER. Une
 * palette se juge sur un chiffre — la piste se détache-t-elle du bas-côté, le
 * résultat écrit sur son panneau se lit-il ? — et une épreuve ne peut pas
 * importer un fichier qui touche à l'écran.
 *
 * `brume` est la couleur vers laquelle le lointain se fond : celle du bas du
 * ciel. C'est elle qui donne la profondeur — sans elle, le centième segment
 * est peint du même gris que le premier et la route a l'air d'un mur.
 */
export const CIRCUITS = {
    prairie: {
        nom: 'Prairie ensoleillée', nuit: false,
        ciel: ['#0b78c9', '#4fb8f5', '#d9f1ff'], astre: '#fff7c2', halo: 'rgba(253, 224, 71, 0.42)',
        brume: '#d9f1ff',
        lointain: '#7ea3c4', collineLoin: '#4f8a6b', collinePres: '#1f8a4c',
        herbe: ['#3fcf6b', '#2fb85a'], piste: ['#566173', '#4a5466'],
        vibreur: ['#ffffff', '#ef4444'], trait: 'rgba(255, 255, 255, 0.82)'
    },
    canyon: {
        nom: 'Canyon au crépuscule', nuit: false,
        ciel: ['#5b1f3a', '#f97316', '#fde3a0'], astre: '#fff4d6', halo: 'rgba(251, 146, 60, 0.55)',
        brume: '#f8cf94',
        lointain: '#b8603a', collineLoin: '#a3441c', collinePres: '#c2521a',
        herbe: ['#e08a1e', '#c9741a'], piste: ['#5e5852', '#514b46'],
        vibreur: ['#fef3c7', '#dc2626'], trait: 'rgba(254, 243, 199, 0.82)'
    },
    neon: {
        nom: 'Nuit néon', nuit: true,
        ciel: ['#020617', '#101a3a', '#2a1f66'], astre: '#e0f2fe', halo: 'rgba(125, 211, 252, 0.30)',
        brume: '#2a1f66',
        lointain: '#1b1750', collineLoin: '#231c63', collinePres: '#2e2780',
        // LA PISTE DE NUIT EST PLUS CLAIRE QUE SON BAS-CÔTÉ D'UN TIERS AU MOINS.
        // À #27334d sur #111a33 l'écart tombait à 1,16 — mesuré par l'épreuve
        // des circuits : on ne distinguait la route que par ses vibreurs.
        herbe: ['#111a33', '#0c1428'], piste: ['#33415f', '#2a3653'],
        vibreur: ['#22d3ee', '#d946ef'], trait: 'rgba(125, 211, 252, 0.85)'
    }
};

/**
 * LES TROIS ARCHES D'UN PORTIQUE : bleu, ambre, violet — gauche, centre, droite.
 *
 * LA COULEUR EST UN SECOND NOM POUR LA VOIE. Sur un téléphone, on ne dit pas
 * « la voie de droite », on dit « le violet » : le résultat est écrit sur un
 * panneau de la couleur de son arche, et le tapis de lumière qui mène au kart
 * prend la même. On sait où l'on va sans lire un mot.
 */
export const ARCHES = [
    { trait: '#38bdf8', lueur: 'rgba(56, 189, 248, 0.45)', voile: 'rgba(56, 189, 248, 0.16)' },
    { trait: '#fbbf24', lueur: 'rgba(251, 191, 36, 0.45)', voile: 'rgba(251, 191, 36, 0.16)' },
    { trait: '#c084fc', lueur: 'rgba(192, 132, 252, 0.45)', voile: 'rgba(192, 132, 252, 0.16)' }
];
