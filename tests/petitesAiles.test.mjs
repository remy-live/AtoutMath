// LES PETITES AILES — ce que le jeu refait doit continuer de tenir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 22 novembre : « je préfère ce tiny wings […] Tu refais tout le jeu à
// partir de ce que j'ai donné. »
//
// ── POURQUOI CE FICHIER EST RÉÉCRIT, ET CE QUI N'Y CHANGE PAS ───────────────
//
// L'ancien noyau était une somme d'ondes avec des dérivées exactes ; le neuf
// est un relief échantillonné, fait d'îles séparées par la mer. Aucune des
// quarante anciennes gardes ne peut s'exécuter telle quelle : elles parlent de
// `MONDES`, de `bordsDuVide`, de `niveauFrontiere`, qui n'existent plus.
//
// LES RÈGLES, ELLES, NE CHANGENT PAS — et c'est tout l'intérêt de les avoir
// écrites comme des règles et non comme des valeurs :
//
//   · on ne fait pas gravir de falaise à l'oiseau ;
//   · un saut est un vol, pas un sursaut ;
//   · NE RIEN FAIRE DOIT FAIRE PERDRE, et avant qu'on se lasse ;
//   · bien jouer doit payer, nettement ;
//   · aucune récompense ne se pose là où l'on perd ;
//   · chaque île doit se détacher de son propre ciel ;
//   · une partie doit se rejouer à l'identique à partir de sa graine.
//
// Chacune a été payée une fois. Les reperdre en changeant de moteur serait la
// seule vraie façon de rater cette réécriture.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';
import '../js/core/activities/index.js';
import {
    Relief, ILES, etatInitial, pas, qualiteAiles, nomDeLIle, themeDeLIle,
    NIVEAU_MER, FOND_MARIN, PAS_RELIEF, ORIGINE_X,
    VITESSE_MIN, VITESSE_MAX, GRAVITE, GRAVITE_PLONGEE,
    MEGA_DESCENTE, HAUTEUR_SOMMET, BAS_DE_DESCENTE, LONGUEUR_TREMPLIN,
    HAUT_DU_TREMPLIN, VITESSE_CATAPULTE, JOUR_DEPART, VITESSE_NUIT,
    avancerNuit, nuitTombee, luminance, contrasteCouleurs, quitteLeSol,
    melerCouleur, borner, entre, GRAINES_PAR_CREUX, ECART_GRAINES, HAUTEUR_GRAINE
} from '../js/core/petitesAiles.js';
import { getExerciseById } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';
import { TAGS } from '../js/data/tags.js';

/* ─────────────────────────────────────────────────────────────────────────
 * LES DEUX JOUEURS DONT ON MESURE TOUT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * LE BON GESTE est « plonger dans la descente » : avec un y qui descend, une
 * pente POSITIVE est une descente. C'est la seule chose que la consigne
 * demande d'apprendre, donc la seule qu'on simule.
 *
 * NE RIEN FAIRE est le joueur de Rémy — « je ne peux pas perdre même si je ne
 * fais rien ». Tout le réglage du jeu tient dans l'écart entre les deux.
 */
const BON_GESTE = (sol) => sol.pente > 0;
const RIEN = () => false;
const TOUJOURS = () => true;

/** Une partie entière, jouée jusqu'à la nuit. Rend ce qu'on peut en dire. */
function jouer(geste, graine = 'g', secondes = 320) {
    const relief = new Relief(graine);
    let e = etatInitial(relief);
    let t = 0, vMax = 0, enLAir = 0, n = 0;
    let sauts = 0, plusLongSaut = 0, departSaut = null, ricochets = 0, parfaites = 0;
    // CHAQUE SAUT DE CATAPULTE, ET PAS SEULEMENT LE PLUS LONG — voir la garde
    // « le saut de fin d'île est un super long saut ».
    const catapultes = [];
    let volCatapulte = null;
    for (; t < secondes && !nuitTombee(e.nuit); t += 1 / 60) {
        const avant = e;
        e = pas(e, 1 / 60, geste(relief.echantillon(e.x)), relief);
        assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.vx),
            `la simulation a divergé à t = ${t.toFixed(2)} s`);
        vMax = Math.max(vMax, Math.hypot(e.vx, e.vy));
        if (!e.auSol) enLAir++;
        n++;
        if (avant.auSol && !e.auSol) { sauts++; departSaut = e.x; }
        if (departSaut !== null && e.auSol) {
            plusLongSaut = Math.max(plusLongSaut, e.x - departSaut);
            departSaut = null;
        }
        if (e.evenement?.quoi === 'catapulte') volCatapulte = e.x;
        else if (volCatapulte !== null && e.auSol) {
            catapultes.push(e.x - volCatapulte);
            volCatapulte = null;
        }
        if (e.evenement?.quoi === 'ricochet') ricochets++;
        if (e.evenement?.quoi === 'ile' && e.evenement.parfaite) parfaites++;
    }
    return {
        duree: t, x: e.x, ile: e.ile, vMax, sauts, plusLongSaut, ricochets, parfaites,
        catapultes, partAir: enLAir / Math.max(1, n), relief
    };
}

/* ─────────────────────────────────────────────────────────────────────────
 * LE RELIEF
 * ───────────────────────────────────────────────────────────────────────── */

test('LE RELIEF EST CONTINU — aucune marche nulle part', () => {
    // UNE MARCHE EST UN MUR INVISIBLE : l'oiseau s'y arrête sans qu'on
    // comprenne, et le joueur croit à un bug de collision. Les points de
    // contrôle sont reliés par des demi-cosinus justement pour cela — ils
    // partent à plat et arrivent à plat —, mais rien ne garantit qu'on n'a pas
    // oublié un morceau en écrivant la partition d'une île.
    const r = new Relief('continu');
    r.assurerJusqua(60000);
    let pire = 0, ou = 0;
    for (let i = 1; i < r.points.length; i++) {
        const d = Math.abs(r.points[i].y - r.points[i - 1].y);
        if (d > pire) { pire = d; ou = ORIGINE_X + i * PAS_RELIEF; }
    }
    // Quatre pixels d'abscisse : au-delà de 12 px de dénivelé, c'est une pente
    // de 72°, c'est-à-dire une falaise.
    assert.ok(pire < 12,
        `marche de ${pire.toFixed(1)} px en x = ${Math.round(ou)}`);
});

test('ON NE FAIT GRAVIR AUCUNE FALAISE — sauf le tremplin, qui est nommé', () => {
    // Rémy, sur l'ancienne version : « beaucoup moins bien que Tiny Wings,
    // dans le glissé ». La cause n'était pas la physique, c'étaient des pentes
    // de 61° à 81° qu'il fallait MONTER. On ne glisse pas sur un mur.
    //
    // LA DESCENTE, ELLE, A LE DROIT D'ÊTRE RAIDE : on ne la gravit pas, on y
    // tombe — et Rémy en redemande, « ça descend fort ». La mesure ne regarde
    // donc que ce qui MONTE, c'est-à-dire une pente négative quand y descend.
    //
    // ET LE TREMPLIN EST UNE EXCEPTION NOMMÉE : il monte sec, c'est son travail,
    // et il est long de 460 pixels sur une île qui en fait neuf mille.
    const r = new Relief('falaises');
    r.assurerJusqua(60000);
    let pire = 0, ou = 0;
    for (let x = 0; x < 55000; x += 7) {
        const s = r.echantillon(x);
        if (s.tremplin || s.ocean) continue;
        if (-s.pente > pire) { pire = -s.pente; ou = x; }
    }
    const degres = Math.atan(pire) * 180 / Math.PI;
    assert.ok(degres < 60, `une côte monte à ${degres.toFixed(0)}° en x = ${Math.round(ou)}`);
    // ET PAS UNE PLAINE NON PLUS : sans relief, il n'y a plus de jeu.
    assert.ok(degres > 25, `la côte la plus raide ne fait que ${degres.toFixed(0)}°`);
});

test('LA PENTE ANNONCÉE EST LA VRAIE DÉRIVÉE DE LA HAUTEUR', () => {
    // `quitteLeSol` lit la pente et la courbure ; si elles ne décrivaient pas
    // le terrain qu'on dessine, l'oiseau décollerait là où l'écran montre un
    // creux. C'est le genre de défaut qu'on met une journée à ne pas croire.
    const r = new Relief('derivees');
    r.assurerJusqua(30000);
    for (let x = 100; x < 25000; x += 337) {
        const s = r.echantillon(x);
        // ── LE TREMPLIN EST HORS MESURE, ET C'EST ASSUMÉ ─────────────────
        //
        // Partout ailleurs, deux points de contrôle sont reliés par un
        // demi-cosinus : la courbe part à plat, arrive à plat, et la pente
        // prise sur ±8 pixels est celle qu'on dessine. Le tremplin, lui, est
        // délibérément RAIDE à son extrémité — c'est son travail —, et sur
        // 460 pixels de rampe la fenêtre de ±8 lisse ce qu'elle mesure.
        //
        // CE N'EST PAS UNE EXCUSE, C'EST LA MÊME EXCEPTION QUE LA GARDE DES
        // FALAISES, et elle est sans conséquence : la catapulte de fin d'île
        // est SCRIPTÉE à la lèvre, elle ne lit ni la pente ni la courbure.
        if (s.tremplin) continue;
        const a = r.echantillon(x - 6), b = r.echantillon(x + 6);
        const vraie = (b.y - a.y) / 12;
        assert.ok(Math.abs(vraie - s.pente) < 0.12,
            `x = ${x} : pente annoncée ${s.pente.toFixed(3)} pour ${vraie.toFixed(3)} de vraie`);
    }
});

test('CHAQUE ÎLE A SON SOMMET, SA GRANDE DESCENTE ET SON TREMPLIN', () => {
    // ── LA DEMANDE DE RÉMY, LE 22 NOVEMBRE ───────────────────────────────
    //
    // « Avant la fin d'un monde je veux juste une plus longue descente et un
    // tremplin qui permet de faire un super long saut. »
    //
    // Les trois morceaux sont la seule chose qu'on puisse vérifier ICI ; que le
    // saut soit long se mesure plus bas, en jouant.
    const r = new Relief('fin-dile');
    r.assurerJusqua(40000);
    for (const ile of r.iles.slice(0, 3)) {
        const sommet = r.echantillon(ile.sommetX);
        const bas = r.echantillon(ile.basDescenteX);
        const levre = r.echantillon(ile.levreX);
        assert.ok(sommet.y < HAUTEUR_SOMMET + 15,
            `île ${ile.index} : le sommet est à ${Math.round(sommet.y)}, pas en haut`);
        assert.ok(bas.y > BAS_DE_DESCENTE - 15,
            `île ${ile.index} : la descente ne descend pas jusqu'en bas`);
        // LA DESCENTE EST LONGUE : c'est le mot de Rémy, et c'est elle qui
        // fabrique la vitesse du saut.
        assert.equal(Math.round(ile.basDescenteX - ile.sommetX), MEGA_DESCENTE);
        assert.ok(MEGA_DESCENTE > 1500, 'la « plus longue descente » n’est pas longue');
        // ET LE TREMPLIN REMONTE : sans remontée, pas de saut.
        assert.ok(bas.y - levre.y > 200,
            `île ${ile.index} : le tremplin ne remonte que de ${Math.round(bas.y - levre.y)} px`);
        assert.equal(Math.round(ile.levreX - ile.basDescenteX), LONGUEUR_TREMPLIN);
        // LA LÈVRE EST LE POINT LE PLUS HAUT DU TREMPLIN. La catapulte y pose
        // l'oiseau avant de le lancer ; si un bout de rampe la dépassait,
        // l'oiseau partirait DANS le terrain — c'est le défaut qui a donné des
        // sauts de 17 pixels, et il ne se voyait qu'à la trace.
        for (let x = ile.basDescenteX; x <= ile.levreX; x += 10) {
            assert.ok(r.echantillon(x).y >= levre.y - 1,
                `île ${ile.index} : la rampe dépasse la lèvre en x = ${Math.round(x)}`);
        }
    }
});

test('LE DÉPART D’UNE ÎLE EST UNE RIVE, JAMAIS LA MER', () => {
    // UNE MESURE QUI PART DANS LA MER NE MESURE RIEN, et elle ne le dit pas :
    // l'ancienne version a passé une journée à croire ses treize mondes cassés
    // parce que ses outils faisaient naître l'oiseau dans un trou.
    const r = new Relief('rives');
    r.assurerJusqua(40000);
    for (const ile of r.iles.slice(0, 4)) {
        const x = ile.index === 0 ? ile.debutX + 400 : ile.rivageEntreeX + 300;
        const s = r.echantillon(x);
        assert.ok(!s.ocean, `l'île ${ile.index} commence dans l'eau`);
        assert.ok(s.y < NIVEAU_MER, `l'île ${ile.index} commence sous le niveau de la mer`);
    }
});

test('UNE MÊME GRAINE REFAIT LE MÊME PAYSAGE', () => {
    // ── POURQUOI CETTE GARDE EXISTE ──────────────────────────────────────
    //
    // Le jeu d'origine appelle `Math.random()` quarante fois. Un paysage qu'on
    // ne peut pas refaire ne se mesure pas : aucune épreuve ne peut dire « ce
    // saut-là se franchit », aucune sonde ne peut comparer un avant et un
    // après, et la démonstration du meneur ne montre pas deux fois la même
    // chose. C'est la première chose qu'on a changée en reprenant le fichier,
    // et c'est celle qu'on perdrait le plus facilement.
    const a = new Relief('meme'), b = new Relief('meme');
    a.assurerJusqua(30000); b.assurerJusqua(30000);
    assert.equal(a.points.length, b.points.length);
    for (let i = 0; i < a.points.length; i += 97) {
        assert.equal(a.points[i].y, b.points[i].y, `les deux reliefs divergent en ${i}`);
    }
    assert.equal(a.bonus.length, b.bonus.length);
    // ET DEUX GRAINES DIFFÉRENTES FONT DEUX PAYSAGES DIFFÉRENTS, sinon la
    // graine ne sert à rien et toutes les parties se ressemblent.
    const c = new Relief('autre');
    c.assurerJusqua(30000);
    const ecart = a.points.slice(0, 4000)
        .reduce((t, p, i) => t + Math.abs(p.y - c.points[i].y), 0) / 4000;
    assert.ok(ecart > 8, `deux graines donnent le même relief (écart moyen ${ecart.toFixed(1)})`);
});

test('LES GRAINES ÉPOUSENT LA COURBE DU CREUX', () => {
    // ── RÉMY, 23 NOVEMBRE ────────────────────────────────────────────────
    //
    // « les bonus devraient être dans la courbure, c'est beaucoup mieux ». Sur
    // sa capture, elles faisaient une ARCHE au-dessus du creux — un arc tourné
    // vers le haut, à 80 à 145 pixels du sol, l'inverse de la courbe que suit
    // l'oiseau. On ne les enfilait qu'en sautant par-dessus.
    //
    // DEUX CHOSES À TENIR. Chaque graine est à la MÊME hauteur au-dessus du
    // sol — c'est ce qui fait qu'elles dessinent la courbe ; et cette hauteur
    // est à portée de l'oiseau qui GLISSE, sans quoi on les survolerait toutes.
    const r = new Relief('courbure');
    r.assurerJusqua(40000);
    const graines = r.bonus.filter((b) => b.type === 'graine');
    assert.ok(graines.length > 120, `${graines.length} graines seulement`);
    for (const b of graines) {
        const ecart = r.echantillon(b.x).y - b.y;
        assert.ok(Math.abs(ecart - HAUTEUR_GRAINE) < 1.5,
            `une graine est à ${Math.round(ecart)} px du sol en x = ${Math.round(b.x)} : `
            + 'elle ne suit plus la courbe');
    }
    // ET L'OISEAU QUI GLISSE LES RAMASSE. Son centre est à vingt pixels du
    // sol ; la prise tolère quarante-huit pixels d'écart vertical.
    assert.ok(Math.abs(HAUTEUR_GRAINE - 20) < 48,
        'les graines sont hors de portée de l’oiseau qui glisse');
    // ET ELLES SONT CENTRÉES SUR LE FOND DU CREUX : la graine du milieu d'une
    // rangée est au point le plus bas, sinon la rangée glisse sur un flanc et
    // ne dessine plus une courbe.
    let centrees = 0, rangees = 0;
    for (let i = 0; i + GRAINES_PAR_CREUX <= graines.length; i += GRAINES_PAR_CREUX) {
        const rang = graines.slice(i, i + GRAINES_PAR_CREUX);
        if (rang[rang.length - 1].x - rang[0].x > GRAINES_PAR_CREUX * ECART_GRAINES) continue;
        rangees++;
        const milieu = rang[(GRAINES_PAR_CREUX - 1) / 2];
        const plusBas = Math.max(...rang.map((b) => r.echantillon(b.x).y));
        if (r.echantillon(milieu.x).y >= plusBas - 12) centrees++;
    }
    assert.ok(rangees > 10 && centrees >= rangees * 0.8,
        `${centrees} rangées centrées sur ${rangees}`);
});

test('AUCUNE GRAINE NE SE POSE DANS LA MER — on n’appâte pas vers l’eau', () => {
    // VU SUR UNE PHOTO DE L'ANCIENNE VERSION : une étoile flottait SOUS L'EAU,
    // à côté de l'oiseau noyé. Une récompense est la seule chose du jeu qui
    // dise « viens ici » ; la poser là où l'on perd, c'est enseigner le geste
    // qui coûte.
    const r = new Relief('bonus');
    r.assurerJusqua(50000);
    assert.ok(r.bonus.length > 100, `${r.bonus.length} bonus seulement sur six îles`);
    for (const b of r.bonus) {
        assert.ok(b.y < NIVEAU_MER - 20,
            `un ${b.type} est à ${Math.round(b.y)}, sous le niveau de la mer`);
        // ET ELLE EST AU-DESSUS DU SOL, pas enterrée dedans.
        const sol = r.echantillon(b.x);
        assert.ok(b.y < sol.y,
            `un ${b.type} est sous le sol en x = ${Math.round(b.x)}`);
        assert.ok(sol.y - b.y < 420,
            `un ${b.type} est à ${Math.round(sol.y - b.y)} px du sol : hors de portée`);
    }
});

/* ─────────────────────────────────────────────────────────────────────────
 * LE JEU
 * ───────────────────────────────────────────────────────────────────────── */

test('NE RIEN FAIRE FAIT PERDRE, ET AVANT QU’ON SE LASSE', () => {
    // ── LA PHRASE DE RÉMY, ET ELLE A ÉTÉ PAYÉE TROIS FOIS ────────────────
    //
    // « clairement aux petites ailes, je ne peux pas perdre même si je ne fais
    // rien ». Sur le noyau neuf, elle est revenue par une porte à laquelle je
    // ne m'attendais pas : la catapulte de fin d'île part à une vitesse
    // PLANCHER, que tout le monde touche. À 1 420 de plancher, celui qui ne
    // fait rien franchissait les douze détroits sans se mouiller et tenait 140
    // secondes. À 1 150, son saut tombe à l'eau.
    //
    // QUATRE-VINGT-DIX SECONDES est la borne de l'ancienne version, et elle
    // vient d'un élève de sixième, pas d'une théorie : au-delà, on repose la
    // tablette avant d'avoir perdu.
    for (const g of ['a', 'b', 'c']) {
        const r = jouer(RIEN, g);
        assert.ok(r.duree < 90,
            `paysage ${g} : on tient ${Math.round(r.duree)} s sans rien faire`);
    }
});

test('BIEN JOUER PAIE, ET LARGEMENT', () => {
    // Une nuit qui punit l'abandon ne vaut que si elle laisse passer celui qui
    // joue. L'écart doit être FRANC — un facteur deux au moins —, sinon le
    // geste qu'on enseigne ne se sent pas.
    for (const g of ['a', 'b', 'c']) {
        const bon = jouer(BON_GESTE, g), rien = jouer(RIEN, g);
        assert.ok(bon.duree > rien.duree * 2,
            `paysage ${g} : le bon geste tient ${Math.round(bon.duree)} s `
            + `contre ${Math.round(rien.duree)} à celui qui ne fait rien`);
        assert.ok(bon.ile > rien.ile,
            `paysage ${g} : le bon geste n'atteint pas plus d'îles`);
        assert.ok(bon.x > rien.x * 2,
            `paysage ${g} : le bon geste ne va pas deux fois plus loin`);
    }
});

test('ET APPUYER SANS ARRÊT NE PAIE PAS — c’est le geste, pas le bouton', () => {
    // C'est la faute que ce jeu a commise trois fois dans sa vie : une poussée
    // qui marche partout profite d'abord à celui qui ne lâche jamais le bouton.
    // Appuyer en MONTÉE doit coûter, sinon il n'y a plus de geste à apprendre,
    // seulement un bouton à tenir.
    const bon = jouer(BON_GESTE, 'b'), tout = jouer(TOUJOURS, 'b');
    assert.ok(bon.x > tout.x * 1.3,
        `appuyer sans arrêt mène à ${Math.round(tout.x)} contre ${Math.round(bon.x)} `
        + 'au bon geste : le geste ne se distingue plus du bouton');
});

test('UN SAUT EST UN VOL, PAS UN SURSAUT', () => {
    // L'ancienne version comptait CENT TRENTE décollages en quarante secondes,
    // de six centièmes de seconde et trois pixels chacun : l'oiseau vibrait.
    // Un saut doit se voir.
    const r = jouer(BON_GESTE, 'a', 120);
    assert.ok(r.sauts > 4, `${r.sauts} saut(s) en deux minutes : l'oiseau rampe`);
    assert.ok(r.sauts < 400, `${r.sauts} décollages : l'oiseau vibre au lieu de voler`);
    assert.ok(r.partAir > 0.12 && r.partAir < 0.85,
        `l'oiseau passe ${Math.round(r.partAir * 100)} % du temps en l'air`);
});

test('LE SAUT DE FIN D’ÎLE EST UN SUPER LONG SAUT, ET IL SE MÉRITE', () => {
    // ── LA DEMANDE, MOT POUR MOT ─────────────────────────────────────────
    //
    // Rémy, 22 novembre : « un tremplin qui permet de faire un super long
    // saut ». La mesure est la portée du plus long vol d'une partie.
    //
    // ── ET LA SECONDE MOITIÉ PÈSE PLUS LOURD ─────────────────────────────
    //
    // Un tremplin qui lance tout le monde pareil n'enseigne rien. La descente
    // de 1 900 pixels est là pour que le saut se PAIE : celui qui y plonge
    // arrive vite et retombe sur l'île d'en face, celui qui s'y laisse rouler
    // arrive lent et finit dans l'eau. C'est la même mesure qui le dit.
    for (const g of ['a', 'b']) {
        const bon = jouer(BON_GESTE, g), rien = jouer(RIEN, g);
        // RELEVÉ DE 2 400 À 3 600 LE 23 NOVEMBRE. Rémy : « ce serait cool que
        // entre les mondes le vol plané soit encore plus long ». Mesuré avant :
        // 2 840 pixels. Une borne restée à 2 400 aurait laissé revenir l'ancien
        // vol sans que rien ne bronche.
        assert.ok(bon.plusLongSaut > 3600,
            `paysage ${g} : le plus long saut ne porte qu'à `
            + `${Math.round(bon.plusLongSaut)} px — ce n'est pas « super long »`);
        // ── CE QUI SÉPARE LES DEUX JOUEURS, C'EST L'EAU ─────────────────
        //
        // PREMIER JET : comparer les distances de vol. Depuis que la mer s'est
        // élargie, celui qui ne fait rien traverse aussi — en RICOCHANT, et
        // le ricochet prolonge son vol. La mesure le donnait à 4 030 contre
        // 4 350 et la garde tombait sur un jeu sain.
        //
        // La règle du jeu n'est pas « aller plus loin », c'est « retomber à
        // sec » : c'est ce qui rend le jour, et c'est ce que le bon geste
        // achète. On mesure donc les traversées parfaites.
        assert.ok(bon.ile >= 3 && bon.parfaites >= bon.ile * 0.8,
            `paysage ${g} : le bon geste ne traverse à sec que `
            + `${bon.parfaites} mer(s) sur ${bon.ile}`);
        assert.ok(rien.parfaites <= Math.max(0, rien.ile) * 0.5,
            `paysage ${g} : celui qui ne fait rien traverse à sec `
            + `${rien.parfaites} mer(s) sur ${rien.ile} — la traversée ne se mérite plus`);
        // ── ET CHAQUE CATAPULTE, PAS SEULEMENT LA MEILLEURE ─────────────
        //
        // LE DÉFAUT QUE CETTE LIGNE EXISTE POUR ATTRAPER, et la première
        // version de cette garde ne l'attrapait pas. Au lancement, l'oiseau
        // gardait l'altitude de l'image PRÉCÉDENTE ; or la fin du tremplin
        // monte plus vite que la trajectoire du saut, et il naissait donc
        // vingt pixels SOUS le sol. Il se reposait à l'image suivante : un
        // saut de 17 pixels, une fois sur quatre.
        //
        // Mesurer le PLUS LONG saut ne voit rien de tout cela — un seul bon
        // saut suffit à verdir l'épreuve, et les trois autres restent cassés.
        // `node tools/epreuveTombe.mjs` l'a dit en trente secondes : « cette
        // épreuve ne garde rien ».
        assert.ok(bon.catapultes.length >= 3,
            `paysage ${g} : ${bon.catapultes.length} catapulte(s) mesurée(s)`);
        const pire = Math.min(...bon.catapultes);
        assert.ok(pire > 1200,
            `paysage ${g} : une catapulte ne porte qu'à ${Math.round(pire)} px `
            + `(sur ${bon.catapultes.length} sauts, le meilleur fait `
            + `${Math.round(bon.plusLongSaut)})`);
    }
});

test('ET AUCUNE CATAPULTE NE RETOMBE AUSSITÔT, À AUCUNE VITESSE', () => {
    // ── LE DÉFAUT QUI SE CACHAIT ENTRE LES GRAINES ───────────────────────
    //
    // Au lancement, l'oiseau gardait l'altitude de l'image précédente. Or la
    // fin du tremplin monte à 0,76 pixel par pixel quand le saut le plus LENT
    // ne monte qu'à 0,58 : il naissait vingt pixels sous le sol et se reposait
    // à l'image suivante. Un saut de 17 pixels.
    //
    // DEUX GARDES L'ONT MANQUÉ, et pour la même raison : elles jouaient des
    // parties entières sur deux paysages, et le défaut ne sort qu'aux ARRIVÉES
    // LENTES — c'est-à-dire pas du tout quand on joue bien. `epreuveTombe` l'a
    // dit deux fois de suite : « cette épreuve ne garde rien ».
    //
    // On ne joue donc plus : on pose l'oiseau devant la rampe à six vitesses
    // différentes, et l'on regarde chaque départ. C'est le cas limite qu'on
    // mesure, pas la moyenne d'une partie.
    //
    // ── ET LE DÉFAUT N'EXISTE PLUS SEUL, CE QUI A ÉTÉ MESURÉ AUSSI ───────
    //
    // Remis tout seul, il laisse cette garde verte — et c'est juste : le
    // tremplin a été allongé de 280 à 460 pixels pour une autre raison (il
    // sortait à l'écran comme une dent), et sur une rampe plus douce
    // l'oiseau lancé de l'altitude d'avant passe quand même. La garde a donc
    // été vue tomber sur le défaut D'ORIGINE, rampe courte comprise
    // (`epreuveTombe` avec les deux paires). Elle tient l'invariant : si
    // quelqu'un raccourcit le tremplin un jour, elle le dira.
    for (const graine of ['a', 'essai', 'sonde']) {
        const r = new Relief(graine);
        r.assurerJusqua(30000);
        const ile = r.iles[0];
        for (const v0 of [420, 560, 700, 900, 1100, 1380]) {
            const depart = ile.basDescenteX - 150;
            let e = { ...etatInitial(r, depart), vx: v0, vy: 0, auSol: true };
            e.y = r.echantillon(depart).y - 20;
            let x0 = null, portee = null;
            for (let t = 0; t < 12 && portee === null; t += 1 / 60) {
                const av = e;
                e = pas(e, 1 / 60, false, r);
                if (e.evenement?.quoi === 'catapulte') x0 = e.x;
                else if (x0 !== null && !av.auSol && e.auSol) portee = e.x - x0;
            }
            assert.ok(x0 !== null,
                `graine ${graine}, ${v0} px/s : la catapulte n'a pas eu lieu`);
            assert.ok(portee === null || portee > 1200,
                `graine ${graine}, arrivée à ${v0} px/s : le saut ne porte qu'à `
                + `${Math.round(portee)} px — l'oiseau est reposé aussitôt`);
        }
    }
});

test('LA VITESSE RESTE DANS SES BORNES, QUOI QU’ON FASSE', () => {
    for (const geste of [BON_GESTE, RIEN, TOUJOURS]) {
        const r = jouer(geste, 'bornes', 150);
        // Au sol la vitesse est bornée ; en vol la chute s'y ajoute, et le
        // plongeon de la grande descente vaut bien une fois et demie le
        // plafond. Au-delà, c'est une divergence numérique.
        assert.ok(r.vMax < VITESSE_MAX * 2,
            `la vitesse monte à ${Math.round(r.vMax)} pour un plafond de ${VITESSE_MAX}`);
    }
    assert.ok(VITESSE_MIN > 0, 'sans plancher, l’oiseau peut s’arrêter et le jeu se fige');
    assert.ok(GRAVITE_PLONGEE > GRAVITE * 2, 'appuyer doit peser nettement plus lourd');
});

test('LE JOUR PASSE, ET IL PRESSE DE PLUS EN PLUS', () => {
    // ON N'A PLUS TREIZE RÉGLAGES, ON EN A UN. L'ancienne version accordait
    // une vitesse de nuit par monde ; chaque retouche de la physique les
    // faisait toutes mentir, et on l'a payé trois fois en une semaine.
    assert.ok(JOUR_DEPART > 0 && JOUR_DEPART < 0.2, 'la partie ne commence pas au matin');
    const tot = 1 / VITESSE_NUIT;
    assert.ok(tot > 25 && tot < 70,
        `le jour entier dure ${Math.round(tot)} s : trop court ou trop long`);
    // Sur la première île, une seconde coûte moins que sur la dixième.
    const a = avancerNuit(0.5, 1, 0) - 0.5;
    const b = avancerNuit(0.5, 1, 10) - 0.5;
    assert.ok(b > a * 1.2, 'la nuit ne presse pas davantage au fil des îles');
    assert.ok(nuitTombee(1) && !nuitTombee(0.99));
});

test('ON DÉCOLLE AU SOMMET, ET SEULEMENT SI L’ON VA ASSEZ VITE', () => {
    // La condition est celle de la physique, pas une recette : suivre une
    // crête demande v² fois la courbure ; si la pesanteur ne fournit pas
    // autant, le sol se dérobe. Avec un y qui descend, une crête a une
    // courbure POSITIVE — c'est l'inverse de l'ancienne version, et c'est le
    // genre de signe qu'on inverse sans s'en apercevoir.
    assert.ok(quitteLeSol(0.004, 700, GRAVITE, 0), 'on ne décolle jamais');
    assert.ok(!quitteLeSol(0.004, 200, GRAVITE, 0), 'on décolle à l’arrêt');
    assert.ok(!quitteLeSol(-0.004, 900, GRAVITE, 0), 'on décolle au fond d’un creux');
});

/* ─────────────────────────────────────────────────────────────────────────
 * L'HABILLAGE
 * ───────────────────────────────────────────────────────────────────────── */

test('CHAQUE ÎLE SE DÉTACHE DE SON PROPRE CIEL', () => {
    // TROIS DES SEPT MONDES NEUFS ÉTAIENT INVISIBLES dans l'ancienne version,
    // et aucune épreuve ne l'aurait dit : un sol de glace à 1,20 de contraste
    // avec son aurore, un désert de sel à 1,07 — deux aplats de la même
    // couleur. « La palette est dans le monde, pas dans le dessin », et une
    // palette où le sol disparaît n'est plus une palette, c'est un écran vide.
    //
    // CE QUI TOUCHE L'HORIZON EST LA PREMIÈRE STRATE, pas une couleur de sol :
    // c'est donc elle qu'il faut mesurer, et le gazon qui la borde.
    assert.equal(ILES.length, 13);
    for (const m of ILES) {
        assert.equal(m.strates.length, 6, `${m.nom} n’a pas six strates`);
        // ── ET C'EST LE GAZON QU'ON MESURE, PAS LA TERRE ────────────────
        //
        // PREMIER JET, ET IL EXIGEAIT CE QUE LE MODÈLE NE FAIT PAS : que la
        // strate de surface se détache du ciel. Neuf îles sur treize
        // tombaient — et en regardant la capture de Rémy on comprend pourquoi :
        // chez Tiny Wings, le sable pâle touche un ciel pâle, et ce qui sépare
        // les deux est le TRAIT D'HERBE, épais et franc, posé entre eux.
        //
        // Durcir les treize palettes pour satisfaire la mauvaise règle les
        // aurait toutes abîmées. C'est la règle qui était fausse.
        const gazonCiel = contrasteCouleurs(m.gazon, m.ciel[1]);
        assert.ok(gazonCiel >= 1.5,
            `${m.nom} : le gazon ne se détache du ciel que de ${gazonCiel.toFixed(2)}`);
        const gazonSol = contrasteCouleurs(m.gazon, m.strates[0]);
        assert.ok(gazonSol >= 1.4,
            `${m.nom} : le gazon ne se détache de la terre que de ${gazonSol.toFixed(2)}`);
        // ET L'OMBRE DU GAZON EST BIEN UNE OMBRE : c'est elle qui donne son
        // épaisseur au trait de crête.
        assert.ok(luminance(m.gazonOmbre) < luminance(m.gazon),
            `${m.nom} : l’ombre du gazon est plus claire que le gazon`);
    }
});

test('LES STRATES VONT DU CLAIR AU SOMBRE, SANS SAUT ET SANS PLAT', () => {
    // ── POURQUOI CET ORDRE EST LA SIGNATURE DE TINY WINGS ────────────────
    //
    // Les six tons sont posés du plus profond au plus clair, chaque ruban plus
    // mince que le précédent. Si deux tons voisins se ressemblaient, il n'y
    // aurait plus six strates mais quatre ; si l'ordre s'inversait quelque
    // part, la terre aurait l'air éclairée par en dessous.
    for (const m of ILES) {
        for (let i = 1; i < m.strates.length; i++) {
            const avant = luminance(m.strates[i - 1]), apres = luminance(m.strates[i]);
            assert.ok(apres < avant,
                `${m.nom} : la strate ${i + 1} est plus claire que la ${i}`);
            const c = contrasteCouleurs(m.strates[i - 1], m.strates[i]);
            assert.ok(c >= 1.1,
                `${m.nom} : les strates ${i} et ${i + 1} se confondent (${c.toFixed(2)})`);
        }
    }
});

test('CHAQUE ÎLE A SON NOM ET SA PALETTE', () => {
    const noms = new Set(ILES.map((m) => m.nom));
    assert.equal(noms.size, ILES.length, 'deux îles portent le même nom');
    const palettes = new Set(ILES.map((m) => m.ciel.join() + m.strates.join()));
    assert.equal(palettes.size, ILES.length, 'deux îles ont la même palette');
    // Et l'on sait nommer la quatorzième : les îles tournent.
    assert.equal(nomDeLIle(13), ILES[0].nom);
    assert.equal(themeDeLIle(14).nom, ILES[1].nom);
});

/* ─────────────────────────────────────────────────────────────────────────
 * CE QUE RÉMY A EXPLICITEMENT INTERDIT
 * ───────────────────────────────────────────────────────────────────────── */

test('IL N’Y A PAS DE SON, ET PAS DE POLICE DISTANTE', async () => {
    // ── TROIS DEMANDES, TROIS LIGNES ─────────────────────────────────────
    //
    // 1. « Ne mets pas le son » — Rémy, 22 novembre. Le fichier d'origine
    //    porte un `SoundEngine` de trois cents lignes ; il n'est pas repris.
    // 2. LES POLICES DISTANTES sont impossibles ici deux fois : la politique de
    //    sécurité du site ne les autorise pas, et une tablette hors ligne
    //    afficherait une police de secours au milieu d'un jeu qui marche.
    // 3. `Math.random` dans le noyau rendrait toutes les mesures de ce fichier
    //    fausses — voir « une même graine refait le même paysage ».
    const { sansCommentaires } = await import('./helpers.mjs');
    const lire = (f) => sansCommentaires(fs.readFileSync(new URL(f, import.meta.url), 'utf8'));
    const jeu = lire('../js/games/petitesAiles.js');
    const noyau = lire('../js/core/petitesAiles.js');
    for (const [nom, src] of [['le jeu', jeu], ['le noyau', noyau]]) {
        assert.ok(!/AudioContext|createOscillator|new Audio|playSound/i.test(src),
            `${nom} fabrique du son`);
        assert.ok(!/fonts\.googleapis|fonts\.gstatic|@import url\(/i.test(src),
            `${nom} charge une police distante`);
    }
    assert.ok(!/Math\.random/.test(noyau),
        'le noyau tire au hasard : plus aucune mesure de ce fichier ne veut rien dire');
    // ET PAS DE FENÊTRE NATIVE. Rémy : « tu utilises des alert et prompt, on
    // évite ! » — la règle vaut pour tout le dépôt, et un jeu refait de zéro
    // est exactement l'endroit où elle se reperd.
    assert.ok(!/\b(alert|confirm|prompt)\s*\(/.test(jeu), 'le jeu ouvre une fenêtre native');
});

/* ─────────────────────────────────────────────────────────────────────────
 * LE RANGEMENT
 * ───────────────────────────────────────────────────────────────────────── */

test('la qualité résume la partie, et l’île passe devant la distance', () => {
    const q = qualiteAiles(1234.6, 3, 7, 2);
    assert.equal(q.distance, 1235);
    assert.equal(q.ile, 3);
    assert.equal(q.graines, 7);
    assert.equal(q.eclats, 2);
    // Une île de plus vaut mieux que dix graines.
    assert.ok(qualiteAiles(0, 3, 0).points > qualiteAiles(0, 2, 10).points);
    // Et une partie ratée d'entrée rapporte quand même quelque chose.
    assert.ok(qualiteAiles(0, 0, 0).points >= 1);
});

test('Les Petites Ailes ne sont toujours pas un exercice de maths', () => {
    // Rémy : « n'en fais pas un jeu mathématiques ». Cela se vérifie ici, et
    // pas seulement dans le code du jeu : une compétence accrochée pour la
    // forme remplirait le bilan du professeur de lignes qui ne mesurent rien.
    const e = getExerciseById('jeu-petites-ailes');
    assert.ok(e, 'jeu-petites-ailes manque au catalogue');
    assert.equal(e.activityId, 'petites-ailes');
    assert.deepEqual(e.skills, []);
    // Et le silence est ASSUMÉ, pas subi : `horsProgression` est la seule
    // façon d'entrer au catalogue sans compétence, et c'est ce qui l'empêche
    // de remonter dans la remédiation ou le bilan.
    assert.equal(e.horsProgression, true);
    assert.deepEqual(e.tags.chemin, [TAGS.DOMAINE.DEFIS, TAGS.SOUS_DOMAINE.ADRESSE]);
    assert.equal(SKILLS['num.aile.reconnaitre'], undefined);
});

test('la consigne explique LE geste et LE but, qui sont tout le jeu', () => {
    const e = getExerciseById('jeu-petites-ailes');
    assert.ok(e.instruction.length > 400);
    assert.ok(/plonger/i.test(e.instruction), 'le geste n\'est pas dit');
    assert.ok(/relâche/i.test(e.instruction));
    // « on accélère en cliquant ou en appuyant sur la barre d'espace » : les
    // deux commandes doivent être écrites, pas devinées.
    assert.ok(/espace/i.test(e.instruction), 'la barre d\'espace n\'est pas annoncée');
    assert.ok(/clic|doigt/i.test(e.instruction));
    assert.ok(/nuit/i.test(e.instruction), 'la nuit n\'est pas annoncée');
    assert.ok(/île/i.test(e.instruction), 'les îles ne sont pas annoncées');
    // ET LE TREMPLIN EST ANNONCÉ : c'est le plus beau moment du jeu, et celui
    // qu'on peut rater toute une partie sans savoir qu'il existait.
    assert.ok(/tremplin/i.test(e.instruction), 'le tremplin n\'est pas annoncé');
    // Et plus un mot de multiples ni de carrés.
    assert.ok(!/multiple|diviseur|carré parfait/i.test(e.instruction));
});

test('le jeu est bien monté sur l’activité, et l’activité sur le moteur', async () => {
    const { getActivity } = await import('../js/core/registry.js');
    const a = getActivity('petites-ailes');
    assert.ok(a, 'l’activité petites-ailes a disparu du registre');
    assert.equal(a.label, 'Les Petites Ailes');
    const { sansCommentaires } = await import('./helpers.mjs');
    const src = sansCommentaires(fs.readFileSync(
        new URL('../js/games/petitesAiles.js', import.meta.url), 'utf8'));
    assert.match(src, /export function enginePetitesAiles\(container, isDemo, params\)/,
        'le contrat du moteur a changé : le catalogue ne saura plus le lancer');
    assert.match(src, /runDemoSequence/, 'la démonstration du meneur a disparu');
});

/* ─────────────────────────────────────────────────────────────────────────
 * LES OUTILS DE MESURE EUX-MÊMES
 * ───────────────────────────────────────────────────────────────────────── */

test('les petites fonctions de couleur font ce qu’elles disent', () => {
    assert.equal(melerCouleur('#000000', '#ffffff', 0), '#000000');
    assert.equal(melerCouleur('#000000', '#ffffff', 1), '#ffffff');
    assert.equal(melerCouleur('#000000', '#ffffff', 0.5), '#808080');
    assert.ok(luminance('#ffffff') > 0.99 && luminance('#000000') < 0.01);
    assert.ok(Math.abs(contrasteCouleurs('#ffffff', '#000000') - 21) < 0.1);
    assert.equal(borner(5, 0, 3), 3);
    assert.equal(entre(0, 10, 0.25), 2.5);
});

test('les mesures du monde se tiennent entre elles', () => {
    assert.ok(FOND_MARIN > NIVEAU_MER, 'le fond marin est au-dessus de la mer');
    assert.ok(BAS_DE_DESCENTE < NIVEAU_MER,
        'la grande descente finit sous l’eau : on ricocherait avant le tremplin');
    assert.ok(HAUT_DU_TREMPLIN < BAS_DE_DESCENTE, 'le tremplin ne remonte pas');
    assert.ok(HAUTEUR_SOMMET < HAUT_DU_TREMPLIN, 'le sommet est plus bas que le tremplin');
    assert.ok(VITESSE_CATAPULTE > VITESSE_MIN * 3, 'la catapulte ne lance rien');
});
