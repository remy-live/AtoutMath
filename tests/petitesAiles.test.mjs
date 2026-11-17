import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import {
    MONDES, LONGUEUR_MONDE, TRANSITION, SOL_MOYEN, penteMax, ONDES, mondeDe, progressionMonde, relief, pas,
    etatInitial, semerEtoile, HAUT_ETOILE_MIN, HAUT_ETOILE_MAX,
    avancerNuit, rattrape, RECUL_ETOILE, RECUL_MONDE, qualiteAiles,
    GRAVITE, GRAVITE_PLONGEE, VX_MIN, VX_MAX, FROTTEMENT_SOL, FROTTEMENT_APPUI,
    PESANTEUR_GLISSE_APPUI, quitteLeSol,
    POUSSEE, PESANTEUR_GLISSE, suiviArret, estArrete, DUREE_ARRET
} from '../js/core/petitesAiles.js';
import { getExerciseById } from '../js/data/catalog.js';
import { SKILLS } from '../js/data/skills.js';
import { TAGS } from '../js/data/tags.js';

/**
 * Un joueur, décrit par ce qu'il fait de la pente sous ses pieds.
 *
 * ON PART VRAIMENT DANS LE MONDE QU'ON ÉPROUVE. Le terrain est désormais une
 * fonction de l'abscisse ABSOLUE — c'est ce qui a supprimé la falaise de cent
 * pixels aux frontières —, donc éprouver « les crêtes » veut dire y courir, pas
 * passer son descripteur à une fonction qui ne le regarde plus.
 */
function courir(monde, joue, secondes = 30, graine = 0.7) {
    let e = etatInitial(graine, (monde.id - 1) * LONGUEUR_MONDE);
    let air = 0, n = 0;
    for (let t = 0; t < secondes; t += 1 / 60) {
        const sol = relief(e.x, graine);
        e = pas(e, 1 / 60, joue(sol.pente, sol.courbure), graine);
        if (!e.auSol) air++;
        n++;
        assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.vx),
            `la simulation a divergé à t = ${t.toFixed(2)}`);
    }
    const depart = (monde.id - 1) * LONGUEUR_MONDE;
    return { x: e.x, vx: e.vx, partAir: air / n, vitesse: (e.x - depart) / secondes };
}

const PARFAIT = (pente) => pente < 0;
const JAMAIS = () => false;
const TOUJOURS = () => true;

/** La vitesse moyenne d'un joueur sur un monde, sur trois paysages. */
function allure(monde, joue) {
    let total = 0;
    for (const g of [0.7, 1.9, 3.3]) total += courir(monde, joue, 30, g).vitesse;
    return total / 3;
}

// --- Le relief ---------------------------------------------------------------------

test('LA PENTE ET LA COURBURE SONT LES VRAIES DÉRIVÉES', () => {
    // Tout le jeu en dépend : la pente décide de l'accélération, la courbure du
    // décollage. Une dérivée approchée par différence de deux points ferait
    // vibrer la vitesse, et le jeu deviendrait nerveux sans qu'on sache pourquoi.
    // ON BALAIE TOUT LE PAYSAGE, frontières comprises : c'est justement là que
    // le relief se raccorde, et une dérivée fausse sur le raccord donnerait un
    // décollage fantôme au passage d'un monde.
    let ecartPente = 0, ecartCourbure = 0, ouP = 0;
    for (let x = 5; x < MONDES.length * LONGUEUR_MONDE + 2000; x += 7.3) {
        const h = 0.02;
        const numPente = (relief(x + h, 0.3).hauteur - relief(x - h, 0.3).hauteur) / (2 * h);
        const numCourbure = (relief(x + h, 0.3).pente - relief(x - h, 0.3).pente) / (2 * h);
        const r = relief(x, 0.3);
        if (Math.abs(numPente - r.pente) > ecartPente) ouP = x;
        ecartPente = Math.max(ecartPente, Math.abs(numPente - r.pente));
        ecartCourbure = Math.max(ecartCourbure, Math.abs(numCourbure - r.courbure));
    }
    // Sur le raccord, l'amplitude varie aussi : sa contribution à la pente est
    // négligée à dessein (voir `relief`), d'où une tolérance un peu plus large
    // que sur un palier — trois centièmes, quand les pentes valent l'unité.
    assert.ok(ecartPente < 0.03, `pente : écart ${ecartPente} en x = ${ouP}`);
    assert.ok(ecartCourbure < 0.05, `courbure : écart ${ecartCourbure}`);
});

test('LE SOL EST CONTINU D\'UN MONDE À L\'AUTRE', () => {
    // Rémy : « on fait des grands sauts de monde à monde ». Ce n'était pas une
    // impression : le relief se calculait à partir du monde COURANT, dont
    // l'amplitude et la période changent d'un coup à la frontière : le sol y
    // tombait de 101 pixels et la pente sautait de 0,16 à 2,46 — une falaise
    // verticale, et un oiseau en l'air sans l'avoir demandé.
    for (const graine of [0.3, 1.4, 2.9]) {
        for (let i = 1; i < MONDES.length; i++) {
            const f = i * LONGUEUR_MONDE;
            const marche = Math.abs(relief(f + 0.05, graine).hauteur - relief(f - 0.05, graine).hauteur);
            assert.ok(marche < 1, `frontière ${i} : marche de ${marche.toFixed(1)} px`);
        }
    }
    // Et nulle part ailleurs non plus : on cherche la plus grande marche sur un
    // dixième de pixel, sur tout le paysage.
    let pire = 0, ou = 0;
    for (let x = 1; x < MONDES.length * LONGUEUR_MONDE; x += 0.5) {
        const d = Math.abs(relief(x, 0.7).hauteur - relief(x - 0.5, 0.7).hauteur);
        if (d > pire) { pire = d; ou = x; }
    }
    assert.ok(pire < 6, `marche de ${pire.toFixed(1)} px en x = ${ou}`);
});

test('le relief reste dans des altitudes jouables', () => {
    MONDES.forEach((monde, i) => {
        let bas = Infinity, haut = -Infinity;
        // SUR SON PALIER, pas au-delà. Deux bornes se déplacent sous les pieds
        // de ce test : la frontière du monde suivant, évidemment, mais aussi la
        // RAMPE qui précède — sur ses neuf cents derniers pixels, l'amplitude
        // monte déjà vers celle du monde d'après. Y mesurer « la crête du monde
        // 1 » reviendrait à lui reprocher les montagnes du monde 2.
        const dernier = i === MONDES.length - 1;
        const fin = dernier ? LONGUEUR_MONDE : LONGUEUR_MONDE - TRANSITION;
        for (let x = 0; x < fin; x += 3.1) {
            const h = relief(i * LONGUEUR_MONDE + x, 1.4).hauteur;
            bas = Math.min(bas, h); haut = Math.max(haut, h);
        }
        assert.ok(bas > SOL_MOYEN - monde.amplitude - 1, `monde ${monde.id} : creux trop bas`);
        assert.ok(haut < SOL_MOYEN + monde.amplitude + 1, `monde ${monde.id} : crête trop haute`);
        // Et il monte VRAIMENT : un relief plat ne ferait pas un jeu.
        assert.ok(haut - bas > monde.amplitude, `monde ${monde.id} : relief trop plat`);
    });
});

test('la rampe reste ENTRE les deux mondes qu\'elle relie', () => {
    // La contrepartie du raccord : sur la rampe, le relief n'appartient plus
    // tout à fait au monde qu'on quitte. Il ne doit pour autant jamais dépasser
    // le monde qu'on rejoint — sans quoi la difficulté ferait une bosse au
    // milieu du raccord au lieu de monter tranquillement.
    for (let i = 0; i < MONDES.length - 1; i++) {
        const plafond = Math.max(MONDES[i].amplitude, MONDES[i + 1].amplitude);
        for (let x = LONGUEUR_MONDE - TRANSITION; x <= LONGUEUR_MONDE; x += 2.7) {
            const h = relief(i * LONGUEUR_MONDE + x, 1.4).hauteur;
            assert.ok(Math.abs(h - SOL_MOYEN) < plafond + 1,
                `rampe ${i + 1}→${i + 2} : ${h.toFixed(0)} px hors des bornes`);
        }
    }
});

test('LE PAYSAGE EST FAIT DE COLLINES, PAS DE FALAISES', () => {
    // Rémy : « beaucoup moins bien que Tiny Wings, dans le glissé ». La cause
    // n'était pas dans la physique : on faisait escalader à l'oiseau des pentes
    // de 61° dans le premier monde et de 81° dans le dernier. On ne glisse pas
    // sur un mur, quelle que soit la façon dont on écrit la gravité.
    //
    // ET LA BORNE DES 65° EST CE QUI A ARRÊTÉ LA MONTÉE au sixième monde : il
    // y est déjà à 61°, et la pente monte avec amplitude ÷ période. Sept
    // mondes de plus en plus hauts et serrés l'auraient franchie dès le
    // dixième — mesuré, pas supposé.
    let precedente = 0;
    MONDES.forEach((monde, i) => {
        const p = penteMax(monde);
        const degres = Math.atan(p) * 180 / Math.PI;
        assert.ok(degres > 30, `monde ${monde.id} : ${degres.toFixed(0)}°, c'est une plaine`);
        assert.ok(degres < 65, `monde ${monde.id} : ${degres.toFixed(0)}°, c'est une falaise`);
        if (i < 6) {
            assert.ok(p > precedente, `le monde ${monde.id} n'est pas plus raide que le précédent`);
            precedente = p;
        }
    });
    // Et la borne est vraie : le relief mesuré ne la dépasse jamais.
    MONDES.forEach((monde, i) => {
        const fin = i === MONDES.length - 1 ? LONGUEUR_MONDE : LONGUEUR_MONDE - TRANSITION;
        for (let x = 0; x < fin; x += 2.3) {
            const pente = Math.abs(relief(i * LONGUEUR_MONDE + x, 1.4).pente);
            assert.ok(pente <= penteMax(monde) + 1e-9,
                `monde ${monde.id} : pente ${pente.toFixed(2)} au-delà de la borne annoncée`);
        }
    });
    // LES HARMONIQUES TEXTURENT, ELLES NE SCULPTENT PAS. C'est la fondamentale
    // qui doit dominer la COURBURE — donc les vraies crêtes qui lancent
    // l'oiseau, pas les petites bosses. C'est l'inverse qui le faisait vibrer.
    const courbure = ONDES.map(o => o.a * o.f * o.f);
    assert.ok(courbure[0] > courbure.slice(1).reduce((t, c) => t + c, 0),
        'les harmoniques reprennent la main sur la courbure : l\'oiseau va vibrer');
});

test('UN SAUT EST UN VOL, PAS UN SURSAUT', () => {
    // Rémy : « beaucoup moins bien que Tiny Wings […] dans les sauts ». On
    // mesurait alors CENT DIX décollages en quarante secondes, de quatorze
    // centièmes de seconde et de trois pixels de haut : l'oiseau ne volait pas,
    // il vibrait. La cause était une inconséquence d'intégration — voir le
    // demi-pas de la chute dans `pas` — et elle ne se voit QUE comme ceci, en
    // comptant les décollages et en chronométrant ce qui les suit.
    for (const monde of [MONDES[0], MONDES[2], MONDES[5]]) {
        let e = etatInitial(0.7, (monde.id - 1) * LONGUEUR_MONDE);
        let sauts = 0, enAir = 0;
        const dt = 1 / 60;
        for (let t = 0; t < 40; t += dt) {
            const auSol = e.auSol;
            e = pas(e, dt, relief(e.x, 0.7).pente < 0, 0.7);
            if (!e.auSol) enAir += dt;
            if (auSol && !e.auSol) sauts++;
        }
        assert.ok(sauts > 4, `monde ${monde.id} : ${sauts} décollages en 40 s, on ne vole jamais`);
        assert.ok(sauts < 45, `monde ${monde.id} : ${sauts} décollages en 40 s, l'oiseau vibre`);
        const duree = enAir / sauts;
        assert.ok(duree > 0.3, `monde ${monde.id} : des vols de ${duree.toFixed(2)} s, c'est un sursaut`);
    }
});

test('UNE COLLINE REND CE QU\'ELLE A PRIS — le glissé se conserve', () => {
    // C'ÉTAIT LE CŒUR DU PROBLÈME. L'ancienne formule ajoutait `-pente · g · dt`
    // à la vitesse horizontale : comme on passe plus de temps à monter (on y est
    // lent) qu'à descendre (on y est vite), l'aller-retour sur une bosse rendait
    // MOINS qu'il n'avait pris. Chaque colline était un impôt, et à sept
    // collines par monde il ne restait plus rien de l'élan.
    //
    // On vérifie donc l'invariant lui-même, pas une conséquence : le long du
    // sol, ½v² + p·h ne bouge pas, au frottement près. C'est plus fort qu'un
    // aller-retour — les creux successifs n'ont pas la même altitude, donc
    // « revenir au point de départ » n'arrive jamais vraiment — et c'est
    // exactement la phrase que l'ancienne formule ne savait pas tenir.
    //
    // ON APPUIE TOUT DU LONG, et c'est ce qui rend la mesure propre : appuyer
    // interdit le décollage, donc l'oiseau reste collé à la colline, et la
    // pesanteur est la même à la montée et à la descente.
    const g = 1.9;
    let depart = 400, bas = Infinity;
    for (let x = 200; x < 1600; x += 2) {
        const h = relief(x, g).hauteur;
        if (h < bas) { bas = h; depart = x; }
    }
    const leLongDuSol = (vx, pente) => vx * Math.hypot(1, pente);
    const h0 = relief(depart, g).hauteur;
    const V0 = 700;
    let e = { x: depart, y: h0, vx: V0, vy: 0, auSol: true };
    const v0 = leLongDuSol(V0, relief(depart, g).pente);
    let ecart = 0, haut = h0, perdu = 0, gagne = 0;
    for (let t = 0; t < 3; t += 1 / 60) {
        e = pas(e, 1 / 60, true, g);
        assert.ok(e.auSol, 'en appuyant, on ne décolle pas : le test ne mesure plus rien');
        const r = relief(e.x, g);
        haut = Math.max(haut, r.hauteur);
        const v = leLongDuSol(e.vx, r.pente);
        // LE FROTTEMENT SE RETRANCHE EN ÉNERGIE, PAS EN VITESSE : il prend
        // 2·F·v²·dt, ce qui n'est pas la même chose que multiplier la vitesse
        // idéale par e^(−F·t) — on s'était trompé là-dessus, et le test
        // accusait le code de dix-huit pour cent de dérive qu'il n'avait pas.
        // On accumule donc la vraie intégrale. Elle ne représente qu'une
        // correction : ce qui est mis à l'épreuve, c'est bien la conversion
        // exacte de la hauteur en vitesse.
        //
        // ET DEPUIS QUE SE PLAQUER DANS UNE CÔTE FROTTE, il faut le compter
        // ICI AUSSI, puisque le test appuie tout du long. Sans ce terme,
        // l'épreuve annonçait 54,9 % de dérive — c'est-à-dire qu'elle accusait
        // la conversion hauteur → vitesse d'un défaut qui était en réalité le
        // frottement voulu, mesuré et documenté dans `FROTTEMENT_APPUI`.
        const colle = r.pente > 0 ? FROTTEMENT_APPUI : 0;
        perdu += 2 * (FROTTEMENT_SOL + colle) * v * v / 60;
        // ET LE BATTEMENT D'AILES AJOUTE, lui. C'est une énergie de plus dans
        // le bilan — `v += POUSSEE·dt` fait monter v² de 2·v·POUSSEE·dt — et
        // l'invariant qu'on éprouve n'est plus « ½v² + p·h se conserve » mais
        // « ½v² + p·h se conserve AU BATTEMENT ET AU FROTTEMENT PRÈS ». Ce qui
        // est mis à l'épreuve reste le même : la conversion exacte de la
        // hauteur en vitesse, que l'ancienne formule ne savait pas tenir.
        gagne += 2 * POUSSEE * v / 60;
        const attendu = Math.sqrt(v0 * v0 - 2 * PESANTEUR_GLISSE_APPUI * (r.hauteur - h0)
            - perdu + gagne);
        ecart = Math.max(ecart, Math.abs(v - attendu) / attendu);
    }
    // On a bien franchi une VRAIE bosse, pas une ondulation.
    assert.ok(haut - h0 > 150, `la bosse ne fait que ${Math.round(haut - h0)} px : on ne mesure rien`);
    assert.ok(ecart < 0.02,
        `l'énergie du glissé dérive de ${(ecart * 100).toFixed(1)} % : la colline mange l'élan`);
});

// --- Les mondes -----------------------------------------------------------------------

/** Les six premiers montent ; les sept suivants varient. Voir le commentaire. */
const MONTEE = 6;

test('LES SIX PREMIERS MONDES MONTENT EN DIFFICULTÉ, ET LES SEPT AUTRES VARIENT', () => {
    // Rémy : « on peut passer de monde à monde ». Encore faut-il que chacun soit
    // vraiment autre chose que le précédent — sinon la frontière ne récompense
    // rien et la traverser n'a aucun goût.
    //
    // ── POURQUOI LA MONTÉE S'ARRÊTE AU SIXIÈME ────────────────────────────
    //
    // Elle NE PEUT PAS continuer, et c'est mesuré, pas décidé. Un relief plus
    // haut et plus serré ralentit l'oiseau : un balayage de soixante-dix
    // couples (amplitude 200 à 290, période 700 à 790) plafonne à 384 px/s
    // pour le bon joueur, contre 453 au sixième monde. Comme la nuit doit
    // rester sous 90 % de cette allure, son plafond tombe à 345 alors que le
    // sixième porte déjà 400 : aucun septième monde ne peut être à la fois
    // plus dur ET plus pressé. Et la pente dit la même chose — le sixième est
    // à 61°, la borne de la falaise est à 65°, il reste quatre degrés pour
    // sept mondes. `node tools/allureDesMondes.mjs` montre les deux.
    //
    // Les sept derniers VARIENT donc : chacun son caractère — large et doux,
    // haut et serré, immense et presque plat — sous les mêmes bornes. Ce qui
    // continue de monter, c'est la PRESSION de la nuit, et l'épreuve suivante
    // la garde.
    assert.equal(MONDES.length, 13);
    let amplitude = 0, periode = Infinity, nuit = 0;
    MONDES.forEach((m, i) => {
        assert.equal(m.id, i + 1);
        if (i < MONTEE) {
            assert.ok(m.amplitude > amplitude, `le monde ${m.id} n'est pas plus haut`);
            assert.ok(m.periode < periode, `le monde ${m.id} n'est pas plus serré`);
            // LA VALEUR BRUTE DE LA NUIT N'EST PLUS ÉPROUVÉE ICI, et c'est
            // l'épreuve suivante qui a raison : « ce qui mesure la difficulté
            // d'un monde n'est pas la vitesse de sa nuit, c'est son rapport à
            // l'allure qu'on y atteint ». Les deux contraintes à la fois — nuit
            // plus rapide EN PIXELS et plus serrée EN PROPORTION — n'ont de
            // solution que dans une fenêtre de quelques pixels, parce que
            // l'allure BAISSE quand le relief se raidit. On en a eu la preuve
            // en les tenant toutes les deux : 86,43 % puis 86,46 % entre deux
            // mondes voisins, une épreuve verte qui ne gardait plus rien.
            // `node tools/allureDesMondes.mjs --nuits` calcule la bonne suite.
            amplitude = m.amplitude; periode = m.periode;
        } else {
            // ET ILS NE SE RESSEMBLENT PAS ENTRE EUX : un monde qui reprend le
            // relief de son voisin ne se franchit pas, il se traverse.
            const voisin = MONDES[i - 1];
            assert.ok(Math.abs(m.amplitude - voisin.amplitude) > 15
                || Math.abs(m.periode - voisin.periode) > 60,
            `le monde ${m.id} a le même relief que le ${voisin.id}`);
        }
        // Et chacun a SA palette : c'est le seul signal qui dise « tu as changé
        // de monde » quand on file à cinq cents pixels par seconde.
        assert.equal(m.ciel.length, 2);
        assert.equal(m.fond.length, 2);
        assert.ok(m.sol && m.herbe && m.nom);
    });
    const palettes = new Set(MONDES.map(m => m.ciel.join() + m.sol));
    assert.equal(palettes.size, MONDES.length, 'deux mondes se ressemblent');
    const noms = new Set(MONDES.map(m => m.nom));
    assert.equal(noms.size, MONDES.length, 'deux mondes portent le même nom');
});

test('CHAQUE MONDE SE DÉTACHE DE SON PROPRE CIEL', () => {
    // TROIS DES SEPT MONDES NEUFS ÉTAIENT INVISIBLES, et aucune épreuve ne
    // l'aurait dit : la banquise avait un sol de glace à 1,20 de contraste
    // avec son aurore, le désert de sel 1,07 — deux aplats de la même couleur
    // — et la mer de nuages 1,36. On les a vus sur une image, puis MESURÉS :
    // « la palette est dans le monde, pas dans le dessin », et une palette où
    // le sol disparaît n'est plus une palette, c'est un écran vide.
    //
    // 1,6 N'EST PAS LE SEUIL DES TEXTES (4,5) : on ne lit pas un sol, on le
    // distingue. En dessous, la ligne d'horizon s'efface et l'oiseau vole sur
    // rien.
    const lin = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92
        : Math.pow((x + 0.055) / 1.055, 2.4); };
    const lum = (hex) => { const n = parseInt(hex.slice(1), 16);
        return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255)
            + 0.0722 * lin(n & 255); };
    const contraste = (a, b) => {
        const x = lum(a) + 0.05, y = lum(b) + 0.05;
        return Math.max(x, y) / Math.min(x, y);
    };
    for (const m of MONDES) {
        const solCiel = contraste(m.sol, m.ciel[1]);
        assert.ok(solCiel >= 1.6,
            `${m.nom} : le sol ne se détache du ciel que de ${solCiel.toFixed(2)}`);
        const creteSol = contraste(m.herbe, m.sol);
        assert.ok(creteSol >= 1.4,
            `${m.nom} : la crête ne se détache du sol que de ${creteSol.toFixed(2)}`);
    }
});

test('LA PRESSION DE LA NUIT MONTE, PUIS SE TIENT — c’est elle, la difficulté', () => {
    // CE QUI MESURE LA DIFFICULTÉ D'UN MONDE N'EST PAS LA VITESSE DE SA NUIT,
    // C'EST SON RAPPORT À L'ALLURE QU'ON Y ATTEINT. Une nuit à 489 dans un
    // monde où le bon joueur file à 556 serre exactement autant qu'une nuit à
    // 334 dans un monde où il rame à 380 — 88 % dans les deux cas. C'est
    // pourquoi les sept derniers mondes ont des nuits PLUS LENTES que le
    // sixième sans être plus faciles.
    //
    // Sans cette épreuve, rien ne retiendrait quelqu'un de « corriger » ces
    // nuits en les remettant croissantes — et le monde 9, où l'on ne va qu'à
    // 380, deviendrait injouable.
    const pressions = MONDES.map(m => m.nuit / allure(m, PARFAIT));
    for (let i = 1; i < MONTEE; i++) {
        assert.ok(pressions[i] > pressions[i - 1],
            `monde ${i + 1} : la nuit n’y serre pas plus qu’au précédent `
            + `(${Math.round(pressions[i] * 100)} % contre `
            + `${Math.round(pressions[i - 1] * 100)} %)`);
    }
    // ET APRÈS, ELLE SE TIENT : aussi serrée qu'au sixième, jamais au-delà de
    // la borne des 90 % qui rendrait le monde impossible.
    for (let i = MONTEE; i < MONDES.length; i++) {
        assert.ok(pressions[i] > 0.82 && pressions[i] < 0.9,
            `monde ${i + 1} : la nuit y serre à ${Math.round(pressions[i] * 100)} %, `
            + 'hors de la plage du sixième monde');
    }
});

test('on change de monde à la frontière, et jamais avant', () => {
    assert.equal(mondeDe(0).id, 1);
    assert.equal(mondeDe(LONGUEUR_MONDE - 1).id, 1);
    assert.equal(mondeDe(LONGUEUR_MONDE).id, 2);
    assert.equal(mondeDe(LONGUEUR_MONDE * 5).id, 6);
    assert.equal(mondeDe(LONGUEUR_MONDE * 12).id, 13);
    // Le dernier monde ne finit jamais : au-delà, on y reste.
    assert.equal(mondeDe(999999).id, MONDES.length);
    // Et une distance négative — l'oiseau au tout premier pas — ne casse rien.
    assert.equal(mondeDe(-5).id, 1);
});

test('la progression dit où l\'on en est, et le dernier monde n\'en promet pas d\'autre', () => {
    const p = progressionMonde(LONGUEUR_MONDE * 1.5);
    assert.equal(p.monde.id, 2);
    assert.equal(p.dernier, false);
    assert.ok(Math.abs(p.part - 0.5) < 1e-9);
    assert.equal(p.restant, LONGUEUR_MONDE / 2);
    const dernier = progressionMonde(LONGUEUR_MONDE * (MONDES.length - 0.5));
    assert.equal(dernier.dernier, true);
    assert.equal(dernier.part, 1);
    assert.equal(dernier.restant, Infinity, 'le dernier monde promet une suite qui n\'existe pas');
});

// --- La physique -----------------------------------------------------------------------

test('BIEN JOUER PAIE, DANS TOUS LES MONDES', () => {
    // C'est la seule chose qui compte dans un jeu d'adresse, et cela ne se
    // devine pas : il faut le mesurer. Trois joueurs, les mêmes paysages, le
    // même temps — celui qui plonge dans les descentes doit gagner partout.
    for (const monde of MONDES) {
        const parfait = allure(monde, PARFAIT);
        const jamais = allure(monde, JAMAIS);
        const toujours = allure(monde, TOUJOURS);
        assert.ok(parfait > jamais * 1.1,
            `monde ${monde.id} : ne rien faire (${Math.round(jamais)}) vaut presque `
            + `bien jouer (${Math.round(parfait)})`);
        assert.ok(parfait > toujours * 1.05,
            `monde ${monde.id} : appuyer sans arrêt (${Math.round(toujours)}) bat le jeu `
            + `parfait (${Math.round(parfait)})`);
    }
});

test('LA NUIT EST RÉGLÉE : elle ne rattrape pas qui joue bien, et presse de plus en plus', () => {
    // C'est tout l'équilibre du jeu, et il ne se devine pas non plus. La nuit
    // doit rester DERRIÈRE le bon joueur dans les six mondes — sinon le jeu est
    // impossible — et finir par rattraper celui qui ne fait rien, sans quoi il
    // n'y a aucune raison d'apprendre le geste.
    MONDES.forEach((monde) => {
        const parfait = allure(monde, PARFAIT);
        assert.ok(monde.nuit < parfait * 0.9,
            `monde ${monde.id} : la nuit (${monde.nuit}) colle au bon joueur `
            + `(${Math.round(parfait)})`);
    });
    // Dans le dernier monde, ne rien faire ne suffit plus.
    const dernier = MONDES[MONDES.length - 1];
    assert.ok(dernier.nuit > allure(dernier, JAMAIS),
        'même au dernier monde, ne rien faire suffit à semer la nuit');
    // Et le premier, lui, pardonne : on y apprend le geste, on n'y perd pas.
    assert.ok(MONDES[0].nuit < allure(MONDES[0], JAMAIS),
        'le premier monde punit avant d\'avoir expliqué');
});

test('ON DÉCOLLE AU SOMMET, ET SEULEMENT SI L\'ON VA ASSEZ VITE', () => {
    // La condition est physique : suivre le sol demande une accélération de v²
    // fois la courbure ; si la gravité ne fournit pas autant, on part tout droit.
    assert.equal(quitteLeSol(0.1, 400, GRAVITE), false, 'un creux ne lance pas');
    assert.equal(quitteLeSol(-0.02, 100, GRAVITE), false, 'trop lent pour décoller');
    assert.equal(quitteLeSol(-0.02, 400, GRAVITE), true, 'assez vite : on décolle');
    // Et le seuil est bien à l'égalité : v² = g / courbure.
    const vSeuil = Math.sqrt(GRAVITE / 0.02);
    assert.equal(quitteLeSol(-0.02, vSeuil * 0.99, GRAVITE), false);
    assert.equal(quitteLeSol(-0.02, vSeuil * 1.01, GRAVITE), true);
    // Appuyer, c'est peser : à la même courbure, il faut aller plus vite.
    assert.equal(quitteLeSol(-0.02, vSeuil * 1.01, GRAVITE_PLONGEE), false);

    // SUR LES DUNES, LES PLUS DOUCES, une vitesse minimale ne suffit jamais à
    // décoller : la courbure y est trop faible. Sur les crêtes, en revanche,
    // même un oiseau lent quitte le sol — et c'est juste, c'est la physique.
    const douce = MONDES[0];
    let lent = { ...etatInitial(0.7), vx: VX_MIN };
    let envole = false;
    for (let t = 0; t < 10; t += 1 / 60) {
        lent = pas({ ...lent, vx: VX_MIN }, 1 / 60, false, 0.7);
        if (!lent.auSol) envole = true;
    }
    assert.equal(envole, false, 'sur les dunes, à vitesse minimale, on reste au sol');

    // En jouant bien, on finit forcément en l'air une partie du temps.
    assert.ok(courir(MONDES[2], PARFAIT).partAir > 0.05,
        'un bon joueur doit passer du temps en vol');
    // Et en appuyant sans arrêt, jamais : appuyer, c'est peser.
    assert.equal(courir(MONDES[2], TOUJOURS).partAir, 0);
});

test('la vitesse reste dans ses bornes, quoi qu\'on fasse', () => {
    for (const monde of MONDES) {
        for (const joue of [PARFAIT, JAMAIS, TOUJOURS, () => Math.random() < 0.5]) {
            let e = etatInitial(2.2, (monde.id - 1) * LONGUEUR_MONDE);
            for (let t = 0; t < 40; t += 1 / 60) {
                const sol = relief(e.x, 2.2);
                e = pas(e, 1 / 60, joue(sol.pente, sol.courbure), 2.2);
                assert.ok(e.vx >= VX_MIN - 1e-9 && e.vx <= VX_MAX + 1e-9,
                    `vitesse hors bornes : ${e.vx}`);
                // On ne passe jamais sous le sol.
                assert.ok(e.y >= relief(e.x, 2.2).hauteur - 1e-6,
                    'l\'oiseau est passé sous le relief');
            }
        }
    }
});

test('appuyer pèse : la gravité de plongée est plus forte', () => {
    assert.ok(GRAVITE_PLONGEE > GRAVITE * 1.5);
    // Et en l'air, cela se voit tout de suite : à même position, celui qui
    // appuie tombe plus vite.
    const base = { x: 100, y: relief(100, 0).hauteur + 200, vx: 300, vy: 0, auSol: false };
    const plane = pas(base, 0.2, false, 0);
    const plonge = pas(base, 0.2, true, 0);
    assert.ok(plonge.y < plane.y, 'plonger devrait faire descendre plus vite');
});

// --- La nuit et les étoiles ----------------------------------------------------------

test('la nuit avance à la vitesse de son monde, et rattrape quand elle arrive', () => {
    assert.equal(avancerNuit(0, 1, MONDES[0]), MONDES[0].nuit);
    assert.equal(avancerNuit(100, 0.5, MONDES[3]), 100 + MONDES[3].nuit / 2);
    // Un monde manquant ne casse pas la partie en vol.
    assert.equal(avancerNuit(0, 1, null), MONDES[0].nuit);
    assert.equal(rattrape(500, 501), false);
    assert.equal(rattrape(501, 500), true);
    assert.equal(rattrape(500, 500), true, 'nez à nez, la nuit gagne');
});

test('franchir un monde repousse la nuit bien plus qu\'une étoile', () => {
    // C'est la hiérarchie du jeu : les étoiles sont une monnaie d'appoint, la
    // frontière est la vraie respiration. Si une poignée d'étoiles valait un
    // monde, personne n'irait voir le suivant.
    assert.ok(RECUL_MONDE > RECUL_ETOILE * 8);
    assert.ok(RECUL_ETOILE > 0);
});

test('les étoiles se posent à portée de l\'oiseau qui GLISSE', () => {
    // Semées trop haut, elles n'étaient atteignables qu'en vol : on jouait six
    // secondes sans jamais rien ramasser.
    const rng = makeRng('etoiles');
    for (const monde of MONDES) {
        for (let x = 0; x < 3000; x += 137) {
            const e = semerEtoile(x, 1.1, rng);
            const sol = relief(x, 1.1).hauteur;
            assert.equal(e.x, x);
            assert.equal(e.prise, false);
            assert.ok(e.y - sol >= HAUT_ETOILE_MIN, `étoile sous le sol : ${e.y - sol}`);
            assert.ok(e.y - sol <= HAUT_ETOILE_MAX, `étoile hors de portée : ${e.y - sol}`);
        }
    }
});

test('la qualité résume la partie, et le monde passe devant la distance', () => {
    const q = qualiteAiles(1234.6, 3, 7);
    assert.equal(q.distance, 1235);
    assert.equal(q.monde, 3);
    assert.equal(q.etoiles, 7);
    // Un monde de plus vaut mieux que dix étoiles.
    assert.ok(qualiteAiles(0, 3, 0).points > qualiteAiles(0, 2, 10).points);
    // Et une partie ratée d'entrée rapporte quand même quelque chose.
    assert.ok(qualiteAiles(0, 1, 0).points >= 1);
});

// --- Le rangement --------------------------------------------------------------------------

test('Les Petites Ailes ne sont plus un exercice de maths', () => {
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
    // Et la compétence inventée pour l'ancienne version a disparu du référentiel.
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
    assert.ok(/monde/i.test(e.instruction), 'les mondes ne sont pas annoncés');
    // Et plus un mot de multiples ni de carrés.
    assert.ok(!/multiple|diviseur|carré parfait/i.test(e.instruction));
});

// ─────────────── CE QUE RÉMY A DEMANDÉ, ET CE QUE ÇA A CHANGÉ ───────────────
//
// « pour les petites ailes, c'est un jeu, il faut que ça aille plus vite […]
//   car là l'oiseau est tjs collé et avance quoiqu'il arrive (il monte même
//   presque sans vitesse) et pas besoin de 5/6 obligatoire c'est un jeu ».
//
// MESURÉ AVANT, soixante secondes, quatre façons de jouer :
//
//   celui qui appuie au bon moment : 614 px/s, 39 vols, 59 % au sol
//   celui qui appuie sans arrêt    : 280 px/s, ZÉRO vol, 100 % au sol
//   celui qui n'appuie jamais      : 210 px/s, ZÉRO vol, 100 % au sol
//   celui qui appuie au hasard     : 249 px/s, ZÉRO vol, 100 % au sol
//
// Le jeu était donc superbe pour qui connaissait le truc, et pour tous les
// autres un oiseau collé au sol qui rampe. Décoller demande 285 px/s à la
// crête la plus creuse : le joueur ordinaire plafonnait à 280 et ne décollait
// JAMAIS. Un pixel manquait, et il manquait à tout le monde.
//
// MESURÉ APRÈS :
//
//   au bon moment  : 624 px/s, 42 vols   (le talent garde son avance)
//   sans arrêt     : 484 px/s, 0 vol     (appuyer, c'est plonger : c'est juste)
//   jamais         : 412 px/s, 18 vols
//   au hasard      : 525 px/s, 41 vols
//
// Tout le monde va deux fois plus vite, et tout le monde vole — sauf celui qui
// appuie sans relâche, et c'est la règle du jeu, pas un défaut.

test('LE BATTEMENT D\'AILES DONNE UNE VITESSE À QUI NE SAIT PAS ENCORE JOUER', () => {
    // Sans lui, le glissé conserve l'énergie : une colline rend ce qu'elle a
    // pris, et sans l'asymétrie de l'appui, AUCUNE vitesse ne se fabrique.
    assert.ok(POUSSEE > 0, 'il faut une source de vitesse qui ne se mérite pas');
    const vol = (joue) => {
        let e = etatInitial(1.9);
        let somme = 0, n = 0, sauts = 0;
        for (let t = 0; t < 60; t += 1 / 60) {
            const auSol = e.auSol;
            e = pas(e, 1 / 60, joue(e), 1.9);
            if (auSol && !e.auSol) sauts++;
            somme += e.vx; n++;
        }
        return { v: somme / n, sauts };
    };
    const jamais = vol(() => false);
    assert.ok(jamais.v > 350,
        `qui n'appuie jamais rampe à ${Math.round(jamais.v)} px/s`);
    assert.ok(jamais.sauts > 4,
        `qui n'appuie jamais ne décolle que ${jamais.sauts} fois : il est collé au sol`);
    // ET LE TALENT GARDE SON AVANCE : le battement monte le plancher, il ne
    // remplace pas le geste.
    //
    // LE SEUIL EST PASSÉ DE 1,3 À 1,2, ET CE N'EST PAS UN RENONCEMENT : c'est
    // le prix, mesuré, d'avoir supprimé les rampements. À POUSSEE = 40 le
    // rapport valait 1,3 — et le bon joueur restait COLLÉ À SON PLANCHER DE
    // VITESSE pendant huit secondes d'affilée, une fois par minute. Le
    // balayage dit qu'on ne peut pas avoir les deux : au mieux 1,32 avec 4,8 s
    // de rampe, ou 1,24 avec 3,1 s. Entre un écart de talent plus large et un
    // oiseau qui ne se traîne plus, Rémy a tranché en jouant — « si l'oiseau
    // s'arrête et bien on a perdu ». On garde donc le rapport SOUS SURVEILLANCE
    // à 1,2 : au-dessous, le battement aurait vraiment mangé le jeu.
    const bon = vol((e) => relief(e.x, 1.9).pente < 0);
    assert.ok(bon.v > jamais.v * 1.2,
        `le bon joueur ne fait que ${Math.round(bon.v)} contre ${Math.round(jamais.v)} :`
        + ' le battement a mangé le jeu');
});

test('UNE CÔTE PEUT ARRÊTER L\'OISEAU — il n\'avance plus quoi qu\'il arrive', () => {
    // Rémy : « il monte même presque sans vitesse ». C'était le plancher de
    // vitesse : à 130, il relevait la vitesse pendant 21 à 23 % des images du
    // joueur ordinaire, et faisait gravir les côtes à un oiseau sans élan.
    assert.ok(VX_MIN < 60, `le plancher est à ${VX_MIN} : il porte encore le jeu`);
    // Franchir une bosse demande une vraie vitesse, et la formule le dit :
    // v = √(2 · p · h). Deux cents pixels de montée en demandent plus de 400.
    const requis = Math.sqrt(2 * PESANTEUR_GLISSE * 200);
    assert.ok(requis > 400,
        `il ne faut que ${Math.round(requis)} px/s pour 200 px de montée`);
    assert.ok(requis > VX_MIN * 5, 'le plancher permet encore de tout gravir');
});

test('LES PETITES AILES SE COMPTENT EN UNE PARTIE, PAS EN CINQ MONDES SUR SIX', () => {
    // « pas besoin de 5/6 obligatoire c'est un jeu ». Six mondes comme unité,
    // c'était six mondes à FRANCHIR, dont cinq exigés par le seuil de 70 % :
    // on demandait de traverser presque tout le jeu pour qu'une récréation
    // compte comme faite.
    const src = fs.readFileSync(new URL('../js/core/activities/index.js', import.meta.url), 'utf8');
    assert.match(src,
        /\['petites-ailes', 'Les Petites Ailes', 'petitesAiles', 'enginePetitesAiles', 'partie', 1\]/);
    // Comme la Tour de Hanoï, le Parking et la Pipopipette : une partie est un
    // travail fini, pas la moitié d'un exercice.
    assert.match(src, /\['tour-brahma',[^\]]+'tour', 1\]/);
});

// --- Les trois remarques de Rémy en jouant, le 17 novembre --------------------------
//
// « pour le jeu petit aile il faut que les sauts soient plus spectaculaires et
// si l'oiseau s'arrête et bien on a perdu », puis, après un premier essai :
// « là même en montée ca continue a glisser ».
//
// Les trois sont des MESURES, pas des opinions : une hauteur, une vitesse qui
// tombe et qui y reste, une vitesse qui ne baisse pas quand la pente monte.
// `tools/volDesAiles.mjs` les imprime ; ces épreuves les gardent.

/** Tout ce qu'une minute de vol apprend : les sauts, la côte, l'arrêt. */
function analyserVol(monde, joue, graine = 0.7, secondes = 60) {
    let e = etatInitial(graine, (monde.id - 1) * LONGUEUR_MONDE);
    const sauts = [];
    let vol = null, rampe = 0, rampeMax = 0, arrete = false;
    let montee = { v: 0, n: 0 }, descente = { v: 0, n: 0 };
    for (let t = 0; t < secondes; t += 1 / 60) {
        const sol = relief(e.x, graine);
        const avant = e;
        e = pas(e, 1 / 60, joue(sol.pente, sol.courbure), graine);
        if (avant.auSol && !e.auSol) vol = { t0: t, x0: e.x, haut: 0 };
        if (vol) vol.haut = Math.max(vol.haut, e.y - relief(e.x, graine).hauteur);
        if (!avant.auSol && e.auSol && vol) {
            if (t - vol.t0 > 0.08) sauts.push({ duree: t - vol.t0, haut: vol.haut });
            vol = null;
        }
        if (e.auSol) {
            // ON NE COMPTE QUE LES PENTES FRANCHES : les plats noieraient la
            // comparaison montée / descente, et c'est elle qu'on éprouve.
            if (sol.pente > 0.25) { montee.v += e.vx; montee.n++; }
            else if (sol.pente < -0.25) { descente.v += e.vx; descente.n++; }
        }
        rampe = suiviArret(rampe, e, 1 / 60);
        rampeMax = Math.max(rampeMax, rampe);
        if (estArrete(rampe)) arrete = true;
    }
    const moy = (f) => (sauts.length ? sauts.reduce((s, v) => s + f(v), 0) / sauts.length : 0);
    return {
        sauts: sauts.length, haut: moy(v => v.haut), duree: moy(v => v.duree),
        vMontee: montee.n ? montee.v / montee.n : 0,
        vDescente: descente.n ? descente.v / descente.n : 0,
        rampeMax, arrete
    };
}

test('LES SAUTS SONT SPECTACULAIRES — une hauteur et une durée, pas une vibration', () => {
    // Rémy : « il faut que les sauts soient plus spectaculaires ». MESURÉ avant
    // de toucher quoi que ce soit : le saut moyen du bon joueur montait à
    // SOIXANTE PIXELS et durait QUATORZE CENTIÈMES DE SECONDE — moins haut que
    // le relief lui-même, c'est-à-dire invisible. Ce n'était pas un saut.
    for (const monde of [MONDES[0], MONDES[5], MONDES[MONDES.length - 1]]) {
        const r = analyserVol(monde, PARFAIT);
        assert.ok(r.haut > 120,
            `monde ${monde.id} : le saut ne monte qu'à ${Math.round(r.haut)} px`);
        assert.ok(r.duree > 0.5,
            `monde ${monde.id} : le saut ne dure que ${r.duree.toFixed(2)} s`);
        // ET IL FAUT QU'IL Y EN AIT. Un saut magnifique une fois par minute
        // n'est pas un jeu de vol : on en veut au moins un toutes les cinq
        // secondes.
        assert.ok(r.sauts >= 12,
            `monde ${monde.id} : seulement ${r.sauts} vols en une minute`);
    }
});

test('LA MONTÉE COÛTE — on ne glisse pas sur une côte, même en appuyant', () => {
    // Rémy, après le premier essai : « là même en montée ca continue a
    // glisser ». Il avait raison au pixel près : MESURÉ, celui qui appuie sans
    // arrêt tenait 462 px/s en montée contre 514 en descente — la côte ne
    // coûtait presque rien, parce que le battement d'ailes la payait à sa
    // place, et que se plaquer au sol ne frottait pas.
    for (const monde of [MONDES[0], MONDES[5], MONDES[MONDES.length - 1]]) {
        for (const [nom, joue] of [['le bon joueur', PARFAIT], ['qui appuie sans arrêt', TOUJOURS]]) {
            const r = analyserVol(monde, joue);
            // LE SEUIL EST À 0,85, ET IL VIENT DE LA MESURE : avant la
            // correction, celui qui appuie sans arrêt tenait 0,90 (462 contre
            // 514) ; après, 0,82 dans le premier monde, où les pentes sont les
            // plus douces, et bien moins ailleurs. À 0,80 l'épreuve aurait
            // refusé le premier monde sans que rien ne soit cassé.
            assert.ok(r.vMontee < r.vDescente * 0.85,
                `monde ${monde.id}, ${nom} : ${Math.round(r.vMontee)} px/s en montée contre `
                + `${Math.round(r.vDescente)} en descente — la côte ne coûte rien`);
        }
    }
});

test('ARRÊTÉ = PERDU, et la règle ne tue jamais le bon geste', () => {
    // Rémy : « si l'oiseau s'arrête et bien on a perdu ». La règle vit dans
    // `games/petitesAiles.js` ; ses deux nombres sont ici, et ils ont été
    // MESURÉS : 39 parties par façon de jouer (treize mondes, trois paysages,
    // soixante secondes). Quatre secondes sous 70 px/s est la première durée
    // où le bon joueur ne meurt JAMAIS — et une règle qui punit le bon geste
    // n'enseigne rien.
    let bonPerdu = 0, tetuPerdu = 0, pireRampeBon = 0;
    for (const monde of MONDES) {
        for (const graine of [0.7, 1.9, 3.3]) {
            const bon = analyserVol(monde, PARFAIT, graine);
            if (bon.arrete) bonPerdu++;
            pireRampeBon = Math.max(pireRampeBon, bon.rampeMax);
            if (analyserVol(monde, TOUJOURS, graine).arrete) tetuPerdu++;
        }
    }
    const parties = MONDES.length * 3;
    assert.equal(bonPerdu, 0,
        `le bon joueur perd par arrêt dans ${bonPerdu} parties sur ${parties}`);
    // ET LA RÈGLE DOIT MORDRE : si personne ne s'arrête jamais, elle n'existe
    // pas. Celui qui appuie sans arrêt se plaque dans les côtes et cale.
    assert.ok(tetuPerdu > parties * 0.3,
        `qui appuie sans arrêt ne perd que dans ${tetuPerdu} parties sur ${parties} :`
        + ' la règle ne mord pas');
    // LA MARGE SE DIT, pour qu'un réglage futur voie de combien il la mange.
    assert.ok(pireRampeBon < DUREE_ARRET,
        `le bon joueur rampe ${pireRampeBon.toFixed(1)} s au pire, pour ${DUREE_ARRET} s de règle`);
});

test('LA NUIT DE CHAQUE MONDE RESTE SOUS L\'ALLURE DU BON JOUEUR', () => {
    // LES TREIZE VITESSES DE NUIT SONT DÉRIVÉES, PAS CHOISIES : une fraction de
    // l'allure MESURÉE. Toute retouche à la physique les périme ensemble, et un
    // monde dont la nuit dépasse l'allure parfaite est injouable pour tout le
    // monde. `node tools/allureDesMondes.mjs --nuits` imprime les valeurs à
    // recopier ; cette épreuve refuse de les laisser pourrir.
    for (const monde of MONDES) {
        const parfait = allure(monde, PARFAIT);
        const jamais = allure(monde, JAMAIS);
        const toujours = allure(monde, TOUJOURS);
        assert.ok(monde.nuit < parfait * 0.9,
            `monde ${monde.id} (${monde.nom}) : nuit à ${monde.nuit} pour une allure `
            + `parfaite de ${Math.round(parfait)} — il est injouable`);
        // BIEN JOUER DOIT PAYER, sinon le geste qu'on enseigne ne sert à rien.
        assert.ok(parfait > jamais * 1.1,
            `monde ${monde.id} : ${Math.round(parfait)} en jouant bien contre `
            + `${Math.round(jamais)} sans rien faire`);
        assert.ok(parfait > toujours * 1.05,
            `monde ${monde.id} : appuyer sans arrêt fait ${Math.round(toujours)} contre `
            + `${Math.round(parfait)} au bon joueur`);
    }
    // LE PREMIER MONDE PARDONNE — on y apprend le geste sans perdre. LE DERNIER
    // ne pardonne plus : l'immobilité s'y paie.
    assert.ok(MONDES[0].nuit < allure(MONDES[0], JAMAIS),
        'le premier monde ne pardonne pas');
    const dernier = MONDES[MONDES.length - 1];
    assert.ok(dernier.nuit > allure(dernier, JAMAIS),
        'le dernier monde pardonne encore');
});
