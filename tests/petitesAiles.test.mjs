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
    niveauFrontiere, BOSSE_FRONTIERE, DESCENTE_FRONTIERE, VITESSE_BATTEMENT,
    PESANTEUR_GLISSE_APPUI, quitteLeSol,
    POUSSEE, PESANTEUR_GLISSE, suiviArret, estArrete, DUREE_ARRET,
    dansLeVide, dansLaMer, bordsDuVide, LONGUEUR_TREMPLIN, VIDE_FRONTIERE,
    SAUT_TREMPLIN, TREMPLIN, POUSSEE_PLONGEE, PENTE_PLONGEE, departDuMonde, PROFONDEUR_MER
} from '../js/core/petitesAiles.js';
import { getExerciseById } from '../js/data/catalog.js';

/**
 * ── LE VIDE DE LA FRONTIÈRE, ET CE QU'IL CHANGE POUR CES ÉPREUVES ─────────
 *
 * RÉMY, 18 novembre : « le monde d'avant se terminait et le monde d'après
 * commençait plus loin […] Là même en ne faisant rien, on gagne quand même ».
 *
 * Le sol S'ARRÊTE maintenant à chaque frontière et reprend plus loin, plus
 * bas. Plusieurs gardes écrites ici demandaient l'exact contraire — « le sol
 * est continu », « la marche se raccorde sans cassure » —, et elles avaient
 * raison de leur temps : la frontière était alors une rampe. Elles changent de
 * PRÉMISSE, pas d'objet : ce qu'elles gardent reste « aucune falaise là où
 * l'oiseau ROULE », et l'oiseau ne roule pas au-dessus d'un trou.
 */
const dansLaZoneDeSaut = (x) => {
    for (let k = 0; k < MONDES.length - 1; k++) {
        const b = bordsDuVide(k);
        if (x >= b.debut - LONGUEUR_TREMPLIN - 1 && x <= b.fin + LONGUEUR_TREMPLIN + 1) return true;
    }
    return false;
};
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
    let e = etatInitial(graine, departDuMonde(monde.id));
    let air = 0, n = 0, vecu = 1 / 60;
    for (let t = 0; t < secondes; t += 1 / 60) {
        const sol = relief(e.x, graine);
        e = pas(e, 1 / 60, joue(sol.pente, sol.courbure), graine);
        // ── LE VOL AU-DESSUS D'UN VIDE N'EST PAS UN SAUT DE BOSSE ─────────
        //
        // Depuis le 18 novembre, la frontière est un TROU : on le survole,
        // qu'on appuie ou non, parce qu'il n'y a plus de sol. Le compter dans
        // « part du temps en l'air » ferait dire à cette mesure que celui qui
        // appuie sans arrêt décolle — alors qu'il tombe.
        if (!dansLaZoneDeSaut(e.x)) {
            if (!e.auSol) air++;
            n++;
        }
        assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.vx),
            `la simulation a divergé à t = ${t.toFixed(2)}`);
        vecu = t + 1 / 60;
        // ── ET L'ALLURE SE MESURE SUR CE QUI SE JOUE, PAS SUR TRENTE SECONDES
        //
        // Depuis le 18 novembre, l'oiseau qui manque un vide TOMBE À LA MER et
        // la partie est finie. Continuer à le faire glisser sur le fond de la
        // mer pendant les quinze secondes qui restent mesurait une allure que
        // personne ne joue — et c'est de cette allure que sont DÉRIVÉES les
        // treize vitesses de nuit. « Une mesure qui n'emprunte pas le chemin
        // de l'utilisateur ne mesure pas son problème. »
        if (dansLaMer(e)) break;
    }
    const depart = departDuMonde(monde.id);
    return { x: e.x, vx: e.vx, partAir: air / n, vitesse: (e.x - depart) / vecu };
}

const PARFAIT = (pente) => pente < 0;
const JAMAIS = () => false;
const TOUJOURS = () => true;
/** Le contre-geste : appuyer en MONTÉE, l'inverse de ce que le jeu enseigne. */
const CONTRE = (pente) => pente > 0;

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
    // ── LA PRÉMISSE A CHANGÉ LE 18 NOVEMBRE, ET L'OBJET NON ──────────────
    //
    // Le sol s'arrête maintenant au bord de chaque vide : y chercher une
    // continuité serait demander qu'il n'y ait pas de trou. CE QUI RESTE À
    // GARDER est exactement ce qui comptait : là où l'oiseau ROULE, aucune
    // falaise. Les deux bords du trou sont les seules cassures du paysage, et
    // elles sont voulues.
    for (const graine of [0.3, 1.4, 2.9]) {
        for (let i = 1; i < MONDES.length; i++) {
            const b = bordsDuVide(i - 1);
            // Juste avant la lèvre et juste après la rive : deux zones de sol
            // continu, et c'est tout ce qu'on peut exiger.
            for (const f of [b.debut - 200, b.fin + 200]) {
                const marche = Math.abs(relief(f + 0.05, graine).hauteur
                    - relief(f - 0.05, graine).hauteur);
                assert.ok(marche < 1, `frontière ${i} : marche de ${marche.toFixed(1)} px`);
            }
        }
    }
    // Et nulle part ailleurs non plus — hors des vides, qui sont des trous.
    let pire = 0, ou = 0;
    for (let x = 1; x < MONDES.length * LONGUEUR_MONDE; x += 0.5) {
        if (dansLeVide(x) || dansLeVide(x - 0.5)) continue;
        const d = Math.abs(relief(x, 0.7).hauteur - relief(x - 0.5, 0.7).hauteur);
        if (d > pire) { pire = d; ou = x; }
    }
    assert.ok(pire < 6, `marche de ${pire.toFixed(1)} px en x = ${ou}`);
    // ET LE TROU, LUI, EST BIEN UN TROU : au bord, le sol tombe d'un coup.
    for (let i = 0; i < MONDES.length - 1; i++) {
        const b = bordsDuVide(i);
        const chute = relief(b.debut - 1, 0.7).hauteur - relief(b.debut + 1, 0.7).hauteur;
        assert.ok(chute > 300, `vide ${i + 1} : la lèvre ne tombe que de ${chute.toFixed(0)} px`);
    }
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
            const abs = i * LONGUEUR_MONDE + x;
            // LE TREMPLIN ET LE VIDE NE SONT PAS « LE RELIEF DU MONDE » : l'un
            // est une descente voulue, l'autre un trou. Leur reprocher des
            // creux trop bas, c'est leur reprocher d'exister.
            if (dansLaZoneDeSaut(abs)) continue;
            const h = relief(abs, 1.4).hauteur;
            bas = Math.min(bas, h); haut = Math.max(haut, h);
        }
        // ── ON MESURE CONTRE LE NIVEAU LOCAL, PAS CONTRE `SOL_MOYEN` ──────
        //
        // Depuis que chaque frontière fait descendre le sol de sept cents
        // pixels (`DESCENTE_FRONTIERE`, qui fait le grand vol plané que Rémy
        // réclamait), `SOL_MOYEN` n'est plus le niveau du sol : c'est celui du
        // PREMIER monde. Au douzième, le relief est huit mille pixels plus bas,
        // et lui reprocher ses « creux trop bas » n'aurait aucun sens.
        //
        // Ce qu'on veut garder est inchangé : l'ONDULATION du relief tient dans
        // l'amplitude du monde. C'est `niveauFrontiere` qui dit par rapport à
        // quoi.
        // LE NIVEAU DE RÉFÉRENCE SE PREND DANS LE MONDE, PAS À SA FRONTIÈRE.
        //
        // La marche est maintenant DANS le vide (voir `videsFranchis`) : à
        // l'abscisse exacte de la frontière, le sol n'est pas encore descendu,
        // et comparer le relief du monde 2 à ce niveau-là le trouve « trop
        // bas » de trois cent quatre-vingts pixels. On lit donc l'altitude là
        // où le monde est vraiment.
        const reference = niveauFrontiere(i * LONGUEUR_MONDE + LONGUEUR_MONDE / 2);
        assert.ok(bas > reference - monde.amplitude - 1,
            `monde ${monde.id} : creux trop bas`);
        assert.ok(haut < reference + monde.amplitude + 1,
            `monde ${monde.id} : crête trop haute`);
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
        // ── ET LA BORNE N'EST PAS LA MÊME EN HAUT ET EN BAS ──────────────
        //
        // Deux ouvrages s'ajoutent à l'amplitude du monde sur cette rampe, et
        // chacun tire d'un seul côté. Ils ne sont pas « hors des bornes », ils
        // SONT la frontière :
        //
        //   EN HAUT, la bosse de frontière (`BOSSE_FRONTIERE`) : elle fait
        //   voir de loin qu'un monde se termine. Mesuré, le plus haut point de
        //   rampe est à 233 px pour une amplitude de 192 (rampe 5→6).
        //
        //   EN BAS, la descente du tremplin (`TREMPLIN`) : c'est elle qui
        //   donne l'allure du saut, et les collines y sont effacées (voir le
        //   fondu `f` dans `relief`). Mesuré, les douze rampes creusent entre
        //   198 et 228 px, toutes à 130 px de la frontière — c'est-à-dire le
        //   fond du tremplin, et non une colline.
        //
        // UNE SEULE BORNE SYMÉTRIQUE LES CONFONDAIT : tant que la bosse valait
        // 150, elle couvrait par accident les 230 px du tremplin, et le jour
        // où la bosse est descendue à 80 — parce que son flanc faisait un mur
        // de 65,6° — cette garde est tombée sur du relief parfaitement sain.
        const monde = Math.max(MONDES[i].amplitude, MONDES[i + 1].amplitude);
        const enHaut = monde + BOSSE_FRONTIERE;
        const enBas = monde + TREMPLIN;
        for (let x = LONGUEUR_MONDE - TRANSITION; x <= LONGUEUR_MONDE; x += 2.7) {
            const abs = i * LONGUEUR_MONDE + x;
            const h = relief(abs, 1.4).hauteur - niveauFrontiere(abs);
            assert.ok(h < enHaut + 1 && h > -enBas - 1,
                `rampe ${i + 1}→${i + 2} : ${h.toFixed(0)} px hors des bornes `
                + `(${-Math.round(enBas)} … ${Math.round(enHaut)})`);
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
        let e = etatInitial(0.7, departDuMonde(monde.id));
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
    // ── ON PART VITE, ET C'EST UNE CONDITION DE LA MESURE ─────────────────
    //
    // Sept cents suffisaient tant que le battement était constant : son énergie
    // s'écrivait `2·POUSSEE·v·dt` et se reconstituait de l'extérieur. Depuis
    // qu'il s'éteint au-delà de `VITESSE_BATTEMENT`, l'énergie qu'il ajoute
    // dépend de la vitesse À L'INTÉRIEUR du pas — et la reconstituer du dehors
    // devient faux dès que la vitesse change vite. Mesuré : 32 % de dérive
    // annoncée sur une conversion hauteur → vitesse parfaitement exacte, à
    // partir de l'instant où l'oiseau descendait sous 160 px/s en grimpant.
    //
    // À 880, il franchit la bosse sans jamais passer sous le seuil : le
    // battement vaut alors zéro tout du long, et l'identité qu'on éprouve — la
    // hauteur se change en vitesse, exactement — redevient lisible. Une
    // vérification plus bas exige que cette condition tienne, sinon la mesure
    // ne mesurerait plus rien.
    // ET SOUS `VX_MAX` : à 940, le tout premier pas rabotait la vitesse à 900,
    // et ce que le plafond retire ne figure dans aucun des deux bilans. On
    // annonçait alors 22 % de dérive — sur un plafond, pas sur une colline.
    const V0 = 880;
    let e = { x: depart, y: h0, vx: V0, vy: 0, auSol: true };
    const v0 = leLongDuSol(V0, relief(depart, g).pente);
    let ecart = 0, haut = h0, perdu = 0, gagne = 0, monte = 0;
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
        // ── LA VITESSE D'AVANT LE FROTTEMENT ──────────────────────────────
        //
        // `pas` applique les trois dans cet ordre : l'énergie de la hauteur, le
        // battement, puis le frottement. `v` ici est la vitesse FINALE ; le
        // battement, lui, a été calculé sur celle d'avant le frottement. Tant
        // que le battement était constant, l'écart ne se voyait pas. Depuis
        // qu'il s'éteint au-delà de `VITESSE_BATTEMENT`, il se voit beaucoup :
        // l'épreuve annonçait 32 % de dérive sur une conversion hauteur →
        // vitesse exacte, uniquement parce qu'elle lisait le battement à la
        // mauvaise vitesse.
        const vAvant = v / (1 - (FROTTEMENT_SOL + colle) / 60);
        // ET C'EST ELLE QUI SERT AUX DEUX BILANS. `pas` retranche le frottement
        // à la vitesse D'AVANT ; l'accumuler sur celle d'après le sous-estime
        // de huit dixièmes de pour cent à chaque pas — ce qui ne se voyait pas
        // tant que le frottement valait 0,05, et se voit beaucoup depuis que se
        // plaquer dans une côte en coûte 0,45. Mesuré : 2,8 % de dérive annoncée
        // sur une conversion exacte.
        perdu += 2 * (FROTTEMENT_SOL + colle) * vAvant * vAvant / 60;
        // ET LE BATTEMENT D'AILES AJOUTE, lui. C'est une énergie de plus dans
        // le bilan — `v += POUSSEE·dt` fait monter v² de 2·v·POUSSEE·dt — et
        // l'invariant qu'on éprouve n'est plus « ½v² + p·h se conserve » mais
        // « ½v² + p·h se conserve AU BATTEMENT ET AU FROTTEMENT PRÈS ». Ce qui
        // est mis à l'épreuve reste le même : la conversion exacte de la
        // hauteur en vitesse, que l'ancienne formule ne savait pas tenir.
        // ET LE BATTEMENT S'ÉTEINT AVEC LA VITESSE depuis le 17 novembre — voir
        // `VITESSE_BATTEMENT`. Sans ce facteur, le bilan ajoutait une énergie
        // que le code n'ajoute plus, et l'épreuve annonçait 92 % de dérive sur
        // une conversion hauteur → vitesse parfaitement exacte.
        gagne += 2 * POUSSEE * Math.max(0, 1 - vAvant / VITESSE_BATTEMENT) * vAvant / 60;
        // ── ET LA POUSSÉE DE PLONGÉE, DEPUIS LE 18 NOVEMBRE ───────────────
        //
        // RÉMY : « l'appui donnait vraiment une accélération ». Elle n'est pas
        // un échange hauteur ↔ vitesse : elle AJOUTE de l'énergie, et c'est
        // tout son intérêt. Le bilan doit donc la compter, sans quoi l'épreuve
        // annoncerait une « dérive » qui est exactement l'effet demandé —
        // mesuré, elle tombait sur du code qui faisait ce qu'on lui demandait.
        //
        // Même forme que le battement : une accélération appliquée à v pendant
        // dt vaut 2·a·v·dt d'énergie.
        const penteAvant = relief(e.x, g).pente;
        if (penteAvant < 0) {
            gagne += 2 * POUSSEE_PLONGEE * Math.min(1, -penteAvant / PENTE_PLONGEE)
                * vAvant / 60;
        }
        // (elle ne vaut que les tout premiers pas, au fond du creux : on
        //  s'arrête au sommet, voir plus bas.)
        const attendu = Math.sqrt(v0 * v0 - 2 * PESANTEUR_GLISSE_APPUI * (r.hauteur - h0)
            - perdu + gagne);
        ecart = Math.max(ecart, Math.abs(v - attendu) / attendu);
        // ── ON S'ARRÊTE QUAND LE BATTEMENT SE RALLUME ─────────────────────
        //
        // Il s'éteint au-dessus de `VITESSE_BATTEMENT` ; au-dessous, l'énergie
        // qu'il ajoute dépend de la vitesse À L'INTÉRIEUR du pas, et la
        // reconstituer du dehors devient faux dès que la vitesse change vite.
        // Mesuré : l'épreuve annonçait 32 % de dérive sur une conversion
        // hauteur → vitesse parfaitement exacte, à partir de l'instant où
        // l'oiseau passait sous le seuil.
        //
        // ET ON NE PEUT PAS PARTIR ASSEZ VITE POUR L'ÉVITER : `VX_MAX` plafonne
        // à 900, et se plaquer dans une côte coûte 45 % de frottement par
        // seconde — à 900 px/s au creux, l'oiseau descend sous le seuil avant
        // le sommet, quel que soit le départ. Alors on mesure la partie qu'on
        // peut mesurer, et l'on exige qu'elle porte une vraie bosse.
        if (v <= VITESSE_BATTEMENT) break;
        // ── ET ON S'ARRÊTE AU SOMMET ──────────────────────────────────────
        //
        // « Une colline rend ce qu'elle a pris » se mesure sur la MONTÉE : on
        // y convertit de la vitesse en hauteur, et l'identité est exacte.
        // Au-delà du sommet, `POUSSEE_PLONGEE` entre en scène — elle n'agit
        // que dans la descente — et l'énergie qu'elle ajoute dépend de la
        // pente À L'INTÉRIEUR du pas, qu'on ne peut pas reconstituer du
        // dehors : mesuré, 43 % de « dérive » annoncée sur un code qui fait
        // exactement ce que Rémy a demandé. C'est le même piège que le
        // battement, deux paragraphes plus haut, et la même réponse : on
        // mesure la partie qu'on sait mesurer.
        if (r.pente <= 0 && monte > 20) break;
        // ── LE PLUS HAUT ATTEINT, ET NON LE DERNIER POINT ─────────────────
        //
        // La ligne disait `monte = r.hauteur - h0` : elle mesurait l'altitude
        // du DERNIER pas. Tant que l'oiseau ralentissait avant la crête, le
        // dernier pas ÉTAIT le plus haut, et les deux se confondaient. Depuis
        // que `POUSSEE_PLONGEE` existe — Rémy : « l'appui donnait vraiment une
        // accélération » —, il ne passe plus jamais sous le seuil : la boucle
        // va au bout, redescend de l'autre côté, et l'épreuve annonçait « on
        // n'a grimpé que 91 px » après avoir franchi une bosse de deux cents.
        monte = Math.max(monte, r.hauteur - h0);
    }
    // On a bien franchi une VRAIE bosse, pas une ondulation.
    // CENT PIXELS, ET LE CHIFFRE SE JUSTIFIE : le creux-à-crête du premier
    // monde vaut cent quatre-vingt-dix pixels, donc on en mesure plus de la
    // moitié. On ne peut pas aller plus loin — se plaquer dans une côte coûte
    // 45 % de frottement par seconde, et l'oiseau passe sous le seuil du
    // battement avant le sommet, quel que soit le départ.
    assert.ok(monte > 100,
        `on n'a grimpé que ${Math.round(monte)} px avant que le battement ne se rallume : `
        + 'on ne mesure rien');
    assert.ok(haut - h0 > 100, `la bosse ne fait que ${Math.round(haut - h0)} px : on ne mesure rien`);
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
    //
    // LA PLAGE A CHANGÉ LE 17 NOVEMBRE, ET LE POURQUOI VAUT D'ÊTRE ÉCRIT.
    // Elle valait 82 à 90 % de l'allure du bon joueur. Rémy : « clairement aux
    // petites ailes, je ne peux pas perdre même si je ne fais rien » — or une
    // nuit réglée sur la seule allure du BON joueur ne sait rien de l'autre.
    // Elle est maintenant prise en sandwich : au-dessus de ce que fait l'oiseau
    // qu'on abandonne (sinon ne rien faire gagne), au-dessous de ce que fait le
    // bon joueur (sinon le monde est impossible). Comme l'écart entre les deux
    // vaut 1,5, le sandwich se referme autour de 78 %.
    for (let i = MONTEE; i < MONDES.length; i++) {
        assert.ok(pressions[i] > 0.72 && pressions[i] < 0.88,
            `monde ${i + 1} : la nuit y serre à ${Math.round(pressions[i] * 100)} %, `
            + 'hors de la plage du sixième monde');
    }
    // ── ET LA RÈGLE QUI MANQUAIT : NE RIEN FAIRE DOIT PERDRE ───────────────
    //
    // C'est la demande elle-même, et aucune des bornes ci-dessus ne la dit :
    // on peut très bien avoir une pression qui monte joliment et une nuit que
    // l'oiseau abandonné distance sans effort. Mesuré avant : il tenait 93 s.
    for (let i = 1; i < MONDES.length; i++) {
        const rien = allure(MONDES[i], JAMAIS);
        assert.ok(MONDES[i].nuit > rien * 1.05,
            `monde ${i + 1} : nuit à ${MONDES[i].nuit} contre ${Math.round(rien)} `
            + 'sans rien faire — on n’y perd pas en abandonnant');
    }
    // SAUF LE PREMIER, qui pardonne : on y apprend le geste sans perdre.
    assert.ok(MONDES[0].nuit < allure(MONDES[0], JAMAIS),
        'le premier monde doit pardonner');
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
            let e = etatInitial(2.2, departDuMonde(monde.id));
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

test('L’APPUI EST UNE ACCÉLÉRATION QUI SE SENT — trois dixièmes de seconde', () => {
    // RÉMY, 18 novembre : « l'appui donnait vraiment une accélération ».
    //
    // ── POURQUOI ON MESURE UN TIERS DE SECONDE, ET NON UNE PARTIE ────────
    //
    // On avait d'abord cru que le rapport des allures le dirait. Il ne dit
    // rien : MESURÉ, « plonger dans les descentes » rend 1,74 fois la distance
    // de « ne rien faire » avec la poussée, et 1,65 fois SANS — parce que sur
    // trente secondes c'est la gravité de plongée qui domine, et elle existait
    // déjà. Une épreuve bâtie là-dessus serait restée verte en supprimant tout
    // ce que Rémy a demandé.
    //
    // CE QU'IL A SENTI EST LA RÉACTIVITÉ, pas la moyenne : le doigt se pose, et
    // l'oiseau PART. Cela se mesure sur le temps d'un geste — dix-huit images —,
    // et là l'écart est net : 159 px/s de gain avec la poussée, 59 sans.
    const DUREE = 0.3;
    for (const monde of MONDES) {
        let somme = 0, combien = 0;
        for (const graine of [0.7, 1.9, 3.3]) {
            const depart = departDuMonde(monde.id);
            for (let k = 0; k < 4000; k += 37) {
                const x = depart + k;
                // UNE DESCENTE FRANCHE, pas un plat : la poussée est
                // proportionnée à la pente, et sur le plat elle ne doit rien
                // donner — c'est un plongeon, pas un moteur.
                if (relief(x, graine).pente > -0.4) continue;
                const debut = { x, y: relief(x, graine).hauteur, vx: 400, vy: 0, auSol: true };
                const courir = (appuie) => {
                    let e = debut;
                    for (let t = 0; t < DUREE; t += 1 / 60) e = pas(e, 1 / 60, appuie, graine);
                    return e.vx;
                };
                somme += courir(true) - courir(false);
                combien++;
            }
        }
        const gain = somme / Math.max(1, combien);
        assert.ok(combien > 10, `monde ${monde.id} : ${combien} descentes mesurées, c'est trop peu`);
        assert.ok(gain > 100,
            `monde ${monde.id} : appuyer dans une descente ne rend que `
            + `${Math.round(gain)} px/s en ${DUREE} s — ça ne se sent pas`);
    }
    // ── ET CE QU'ON NE DIT PAS ICI, PARCE QUE CE SERAIT FAUX ────────────
    //
    // J'allais écrire « et sur le plat, l'appui ne pousse pas ». MESURÉ avant
    // de l'écrire : sur le plat, appuyer rend jusqu'à 241 px/s en trois
    // dixièmes de seconde — c'est le BATTEMENT D'AILES (`VITESSE_BATTEMENT`),
    // qui est là exprès pour « qui ne sait pas encore jouer ». Seule
    // `POUSSEE_PLONGEE` est proportionnée à la pente ; l'appui, lui, sert
    // partout. Ce que la montée coûte est gardé par une autre épreuve, qui
    // compare la vitesse en montée et en descente.
});

test('ON QUITTE LA FALAISE, ON N’Y TOMBE PAS D’UN COUP', () => {
    // LE DÉFAUT QUI SE VOYAIT À L'ŒIL : l'oiseau arrivé au bord SANS avoir
    // décollé était TÉLÉPORTÉ au fond de la mer, quatre cent vingt pixels plus
    // bas, à l'image d'après. Le bloc « au sol » pose `y = sol.hauteur` sans
    // discuter, et dans le vide `sol.hauteur` est le fond.
    //
    // CE N'EST PAS UN DÉTAIL DE DESSIN : c'est le saut lui-même. Un oiseau qui
    // sort d'une falaise emporte la vitesse qu'il avait, à la hauteur où il
    // était, et c'est la balistique qui dit s'il franchit — « il fallait faire
    // un long vol plané » (Rémy). Téléporté au fond, il ne franchit jamais
    // rien : le vide devient un mur, et le jeu, une loterie.
    const b = bordsDuVide(0);
    for (const vx of [120, 200, 320]) {
        let e = { x: b.debut - 180, y: relief(b.debut - 180, 0.7).hauteur, vx, vy: 0, auSol: true };
        let avant = null;
        for (let i = 0; i < 400 && !dansLeVide(e.x); i++) { avant = e; e = pas(e, 1 / 60, false, 0.7); }
        // À ces vitesses-là, il est encore AU SOL en arrivant au bord : c'est
        // le cas qu'on veut mesurer, et non celui d'un oiseau déjà en vol.
        assert.ok(avant && avant.auSol,
            `à ${vx} px/s l'oiseau a décollé avant le bord : le cas n'est pas mesuré`);
        assert.equal(e.auSol, false, `à ${vx} px/s il reste « au sol » au-dessus du vide`);
        const rive = niveauFrontiere(e.x);
        assert.ok(e.y > rive - 60,
            `à ${vx} px/s il se retrouve à ${Math.round(e.y)} pour une rive à `
            + `${Math.round(rive)} : il a été téléporté au fond de la mer `
            + `(${Math.round(rive - PROFONDEUR_MER)})`);
    }
});

test('AUCUNE ÉTOILE NE SE POSE DANS LA MER — on n’appâte pas vers la noyade', () => {
    // VU SUR LA PHOTO DE LA DÉFAITE (`tools/volPlaneDesAiles.mjs --photos`) :
    // une étoile flottait SOUS L'EAU, à côté de l'oiseau noyé. Au-dessus d'un
    // vide, `relief` rend le fond de la mer — PROFONDEUR_MER plus bas —, et les
    // étoiles du trou se semaient donc là où l'on PERD.
    //
    // CE N'EST PAS UNE QUESTION DE DÉCOR : une étoile est la seule chose du jeu
    // qui dise « viens ici ». La poser au fond du trou, c'est enseigner le
    // geste qui tue, à l'endroit précis où Rémy veut qu'on plane.
    const rng = makeRng('etoiles-du-vide');
    for (let k = 0; k < MONDES.length - 1; k++) {
        const b = bordsDuVide(k);
        for (let x = b.debut; x <= b.fin; x += 20) {
            const e = semerEtoile(x, 1.1, rng);
            const rive = niveauFrontiere(x);
            // ELLE PEND AU-DESSUS DU TROU, à portée de l'oiseau qui plane : pas
            // plus bas que la rive d'où il saute, pas plus haut que sa portée.
            assert.ok(e.y >= rive + HAUT_ETOILE_MIN,
                `étoile à ${Math.round(e.y)} pour une rive à ${Math.round(rive)} :`
                + ` elle est dans la mer (fond à ${Math.round(rive - PROFONDEUR_MER)})`);
            assert.ok(e.y <= rive + HAUT_ETOILE_MAX,
                `étoile à ${Math.round(e.y - rive)} px au-dessus de la rive : hors de portée`);
        }
    }
});

test('LE DÉPART D’UN MONDE EST UNE RIVE, JAMAIS LE VIDE', () => {
    // `departDuMonde` n'existe que pour les mesures, et c'est précisément ce
    // qui l'a rendue nécessaire : les outils faisaient naître l'oiseau à
    // `(id − 1) × 6400`, qui est devenu la GUEULE DU TROU le jour où la
    // frontière est devenue un vide. Il coulait à la première image, et
    // `tools/allureDesMondes.mjs` annonçait alors treize mondes à 320 px/s —
    // tous identiques, tous « NUIT TROP RAPIDE », sur un jeu parfaitement sain.
    //
    // UNE MESURE QUI PART DANS LA MER NE MESURE RIEN, et elle ne le dit pas.
    for (const monde of MONDES) {
        const x = departDuMonde(monde.id);
        assert.ok(!dansLeVide(x),
            `le monde ${monde.id} commence dans le vide, en x = ${Math.round(x)}`);
        // ET IL EST DANS SON MONDE, pas dans le précédent ni au milieu du
        // suivant : on mesure bien le monde qu'on croit mesurer.
        assert.equal(mondeDe(x).id, monde.id,
            `le départ du monde ${monde.id} tombe dans le monde ${mondeDe(x).id}`);
        // ET L'OISEAU Y TIENT DEBOUT : la piste d'atterrissage est plate, donc
        // il n'y naît ni en l'air ni dans une falaise.
        const e = etatInitial(0.7, x);
        assert.ok(e.auSol, `l'oiseau naît en l'air au monde ${monde.id}`);
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
    // ── CE QUE LE BATTEMENT DOIT FAIRE A CHANGÉ, ET C'EST RÉMY QUI L'A DIT ──
    //
    // « clairement aux petites ailes, je ne peux pas perdre même si je ne fais
    // rien ». À poussée CONSTANTE, l'oiseau qu'on abandonne CROISE : il se
    // stabilise là où le battement équilibre le frottement, et cette vitesse-là
    // ne demande aucun geste. Mesuré : il tenait 82 % de l'allure du bon
    // joueur, et aucune nuit ne pouvait rattraper l'un sans rattraper l'autre.
    //
    // Le battement vaut donc tout quand l'oiseau est ARRÊTÉ et plus rien passé
    // `VITESSE_BATTEMENT`. Ce que l'épreuve garde n'est plus « il va vite »
    // mais les deux bornes qui comptent : il ne se traîne pas au plancher, et
    // il ne croise pas comme s'il jouait.
    assert.ok(jamais.v > VITESSE_BATTEMENT * 0.7,
        `qui n'appuie jamais rampe à ${Math.round(jamais.v)} px/s : le battement `
        + 'ne le relève plus');
    assert.ok(jamais.v < VITESSE_BATTEMENT * 1.35,
        `qui n'appuie jamais croise à ${Math.round(jamais.v)} px/s : on peut encore `
        + 'gagner sans rien faire');
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
    // ET L'ÉCART S'EST OUVERT : 1,19 au mieux avec l'ancien battement, 1,50
    // depuis qu'il s'éteint. C'est cet écart qui laisse enfin la place à une
    // nuit posée ENTRE les deux — assez rapide pour rattraper l'oiseau
    // abandonné, assez lente pour laisser passer celui qui joue.
    const bon = vol((e) => relief(e.x, 1.9).pente < 0);
    assert.ok(bon.v > jamais.v * 1.4,
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
    let e = etatInitial(graine, departDuMonde(monde.id));
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
    let bonPerdu = 0, contrePerdu = 0, pireRampeBon = 0;
    for (const monde of MONDES) {
        for (const graine of [0.7, 1.9, 3.3]) {
            const bon = analyserVol(monde, PARFAIT, graine);
            if (bon.arrete) bonPerdu++;
            pireRampeBon = Math.max(pireRampeBon, bon.rampeMax);
            if (analyserVol(monde, CONTRE, graine).arrete) contrePerdu++;
        }
    }
    const parties = MONDES.length * 3;
    assert.equal(bonPerdu, 0,
        `le bon joueur perd par arrêt dans ${bonPerdu} parties sur ${parties}`);
    // ── ET LA RÈGLE DOIT MORDRE : QUI LA PAIE, DEPUIS LE 18 NOVEMBRE ──────
    //
    // Si personne ne s'arrête jamais, la règle n'existe pas. Elle était
    // mesurée sur CELUI QUI APPUIE SANS ARRÊT : il se plaquait dans les côtes
    // et calait. Il ne cale plus — MESURÉ, 0 partie sur 39 —, et c'est la
    // demande de Rémy elle-même : « l'appui donnait vraiment une
    // accélération ». Depuis `POUSSEE_PLONGEE`, ce qu'il gagne dans les
    // descentes paie le frottement qu'il prend dans les montées.
    //
    // CELUI QUI LA PAIE MAINTENANT EST LE CONTRE-GESTE : appuyer en MONTÉE,
    // c'est-à-dire exactement l'inverse de ce que le jeu enseigne. Mesuré,
    // il cale dans 39 parties sur 39 (`tools/tmp/arretQui.mjs`).
    //
    // ET LE TÊTU N'EST PAS IMPUNI POUR AUTANT — il est puni ailleurs, par le
    // vide : mesuré, il tombe à la mer dans 39 parties sur 39. Une règle de
    // moins ne fait pas un jeu plus facile ; elle fait un jeu où la punition
    // vient de l'endroit qui se voit.
    assert.ok(contrePerdu > parties * 0.3,
        `le contre-geste ne cale que dans ${contrePerdu} parties sur ${parties} :`
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

// ── LES DEUX REMARQUES DU SOIR ──────────────────────────────────────────────
//
// RÉMY, en jouant : « clairement aux petites ailes, je ne peux pas perdre même
// si je ne fais rien », puis « dans tiny wings on passait d'un monde à l'autre
// avec un gros vol plané ».

test('LA FRONTIÈRE EST UN GRAND VOL PLANÉ, pas un fondu invisible', () => {
    // ELLE N'ÉTAIT QU'UN FONDU DE FRÉQUENCE sur neuf cents pixels : le relief
    // se resserrait doucement, rien ne se voyait, et franchir un monde ne se
    // remarquait qu'à la bannière qui l'annonçait.
    //
    // ET LA BOSSE SEULE N'Y SUFFISAIT PAS — mesuré, et c'est ce qui a tout
    // décidé : à bosse nulle, le plus long vol de frontière durait déjà 1,05 s
    // pour 279 px ; à 260 px de bosse, 1,07 s pour 271. Elle ajoutait onze
    // degrés de pente et pas un centième de seconde de vol.
    //
    // CE QUI ALLONGE UN VOL N'EST PAS L'ÉLAN VERS LE HAUT, C'EST LE SOL QUI
    // PART. Un oiseau lancé à 450 px/s vers le haut retombe en sept dixièmes de
    // seconde, quelle que soit la bosse ; mais si le sol descend de sept cents
    // pixels pendant ce temps-là, il ne le rencontre plus.
    assert.ok(DESCENTE_FRONTIERE > 300,
        'sans une vraie marche, la frontière ne fait pas voler');
    const PARFAIT_SOL = (sol) => sol.pente < 0;
    let meilleur = { duree: 0, haut: 0 };
    for (const g of [0.7, 1.9, 3.3]) {
        for (const m of [1, 4, 8]) {
            const bord = m * LONGUEUR_MONDE;
            let e = etatInitial(g, bord - 2500);
            let vol = null;
            for (let t = 0; t < 40 && e.x < bord + 2500; t += 1 / 60) {
                const avant = e;
                e = pas(e, 1 / 60, PARFAIT_SOL(relief(e.x, g)), g);
                if (avant.auSol && !e.auSol) vol = { t0: t, x0: e.x, haut: 0 };
                if (vol && !e.auSol) vol.haut = Math.max(vol.haut, e.y - relief(e.x, g).hauteur);
                if (vol && e.auSol) {
                    const pres = vol.x0 > bord - TRANSITION - 400 && vol.x0 < bord + 400;
                    if (pres && t - vol.t0 > meilleur.duree) {
                        meilleur = { duree: t - vol.t0, haut: vol.haut };
                    }
                    vol = null;
                }
            }
        }
    }
    // UN SAUT ORDINAIRE DURE HUIT DIXIÈMES DE SECONDE POUR 150 px. La frontière
    // doit se voir du premier coup d'œil, donc faire nettement mieux.
    assert.ok(meilleur.duree > 1.1,
        `le plus long vol de frontière ne dure que ${meilleur.duree.toFixed(2)} s`);
    assert.ok(meilleur.haut > 300,
        `il ne monte qu'à ${Math.round(meilleur.haut)} px : c'est un saut, pas un vol plané`);
});

test('LA MARCHE DESCEND POUR DE VRAI, ET ELLE SE RACCORDE SANS CASSURE', () => {
    // LA MARCHE EST UNE PROPRIÉTÉ DU TERRAIN, et `quitteLeSol` lit la COURBURE :
    // une marche qui se raccorderait mal donnerait un décollage fantôme ou un
    // mur. On vérifie donc les deux dérivées à la main, de part et d'autre de
    // chaque frontière.
    for (let i = 1; i < MONDES.length; i++) {
        const bord = i * LONGUEUR_MONDE;
        const b = bordsDuVide(i - 1);
        // ── LA MARCHE EST DANS LE VIDE, DEPUIS LE 18 NOVEMBRE ────────────
        //
        // Elle était une RAMPE de sept cents pixels avant la frontière, et
        // cette rampe donnait de la vitesse à tout le monde : mesuré, celui
        // qui ne fait rien arrivait au bord aussi vite que le bon joueur, et
        // aucune largeur de trou ne séparait jamais les deux. La marche tombe
        // donc là où il n'y a plus de sol — personne n'y gagne rien.
        assert.ok(niveauFrontiere(b.fin + 10) < niveauFrontiere(b.debut - 10) - 300,
            `frontière ${i} : le sol n'est pas descendu`);
        // ET LES RIVES SONT PLATES : une rive en pente rendrait la vitesse
        // gratuite, qui est exactement ce qu'on vient de retirer.
        for (const x of [b.debut - 5, b.fin + 5]) {
            assert.ok(Math.abs(relief(x, 1.4).pente) < 0.25,
                `frontière ${i} : la rive penche de ${relief(x, 1.4).pente.toFixed(2)}`);
        }
        for (const x of [bord - TRANSITION, b.debut - 1, b.fin + 1]) {
            const a = relief(x - 0.5, 1.4), b = relief(x + 0.5, 1.4);
            // La pente ANNONCÉE doit être la vraie dérivée de la hauteur.
            const vraie = b.hauteur - a.hauteur;
            const dite = (a.pente + b.pente) / 2;
            assert.ok(Math.abs(vraie - dite) < 0.02,
                `x = ${x} : pente annoncée ${dite.toFixed(3)} pour ${vraie.toFixed(3)} de vraie`);
        }
    }
});

test('ET LA RAMPE NE MONTE PAS PLUS QU’UN MUR — la descente, elle, a le droit', () => {
    // « On ne glisse pas sur un mur, quelle que soit la façon dont on écrit la
    // gravité » parle de ce qu'il faut GRAVIR. Une descente à 72° n'est pas un
    // mur, c'est un plongeon — et l'oiseau y est en l'air de toute façon. C'est
    // la distinction qui a permis de garder la marche : sans elle, la seule
    // mesure « pente la plus raide » aurait condamné un terrain sain.
    // ── ET LE TREMPLIN EST UNE EXCEPTION NOMMÉE, PAS UN OUBLI ────────────
    //
    // RÉMY, 18 novembre : « il fallait faire un long vol plané ». Ce qui fait
    // durer un vol est la vitesse VERTICALE au départ, et elle se prend sur la
    // rampe de saut : à 650 px/s d'allure, il faut une pente de 1,08 pour
    // partir à 700 px/s vers le haut. Le tremplin monte donc à 69°, sur cent
    // cinquante pixels.
    //
    // POURQUOI CE N'EST PAS LE MUR QUE CETTE GARDE COMBAT. Les murs mesurés
    // par Rémy — « beaucoup moins bien que Tiny Wings, dans le glissé » —
    // étaient des COLLINES de 61° à 81° qu'il fallait GRAVIR, partout, pendant
    // des centaines de pixels, en y perdant tout son élan. Le tremplin, lui,
    // suit une descente de 230 px et se franchit lancé : mesuré, l'oiseau y
    // arrive à 650–780 px/s et en repart en vol. On ne le gravit pas, on le
    // saute.
    //
    // ET L'ALTERNATIVE A ÉTÉ MESURÉE AVANT D'ÊTRE ÉCARTÉE : une rampe douce
    // (13°) avec un coup d'ailes au décollage donnait un vol plus long et
    // DEUX FOIS MOINS de vides franchis par le bon joueur — l'oiseau partait
    // trop haut et retombait court.
    let monte = 0, ou = 0;
    for (const g of [0.7, 1.9, 3.3]) {
        for (let i = 1; i < MONDES.length; i++) {
            const bord = i * LONGUEUR_MONDE;
            for (let x = bord - TRANSITION - 50; x < bord + 50; x += 3) {
                if (dansLaZoneDeSaut(x)) continue;
                const p = relief(x, g).pente;
                if (p > monte) { monte = p; ou = x; }
            }
        }
    }
    const degres = Math.atan(monte) * 180 / Math.PI;
    assert.ok(degres < 65,
        `la rampe monte à ${degres.toFixed(0)}° en x = ${Math.round(ou)} : c'est une falaise`);

    // LE TREMPLIN LANCE, MAIS IL NE PERCUTE PAS : les deux bornes comptent,
    // et la seconde a bougé le 19 novembre.
    //
    // RÉMY : « La fin d'un monde doit être un TREMPLIN et PAS SI ABRUPT. C'est
    // choquant. » Mesuré avant d'y toucher, il avait raison au degré près : la
    // rampe montait à **69°**, c'est-à-dire une paroi qu'on percute.
    //
    // LA BORNE BASSE DESCEND DONC DE 1,00 À 0,75 — de 45° à 37°. Elle existe
    // toujours, et pour la même raison : sans pente, pas de vol plané. Ce qui
    // change, c'est qu'on ne demande plus au tremplin d'être RAIDE, on lui
    // demande d'être LONG : les mêmes 220 px de hauteur, sur 333 pixels au
    // lieu de 146, montent à 40° au lieu de 69. L'oiseau part aussi haut
    // qu'avant, et il arrive à la lèvre en se redressant.
    //
    // ET LA BORNE HAUTE EST NEUVE : au-delà de 50°, on retombe dans ce que
    // Rémy vient de refuser. Les deux se tiennent, et c'est ce couple qui dit
    // ce qu'est un tremplin.
    //
    // J'AVAIS D'ABORD DESCENDU LA HAUTEUR À 120 PX, ce qui donnait 28° : très
    // doux, et le jeu cassé — six gardes tombées d'un coup, dont « on tient
    // 117 secondes sans rien faire ». C'est la LONGUEUR qui adoucit sans rien
    // casser, pas la hauteur.
    let hautTremplin = 0, longTremplin = 0;
    for (let x = bordsDuVide(0).debut - LONGUEUR_TREMPLIN; x < bordsDuVide(0).debut; x += 2) {
        const p = relief(x, 0.7).pente;
        if (p > 0.4) { longTremplin += 2; hautTremplin = Math.max(hautTremplin, p); }
    }
    assert.ok(longTremplin < 400,
        `le tremplin monte raide sur ${longTremplin} px : ce n'est plus un saut, c'est une côte`);
    assert.ok(hautTremplin > 0.75,
        `le tremplin ne lance plus rien (${(Math.atan(hautTremplin) * 180 / Math.PI).toFixed(0)}°) : `
        + 'sans pente, pas de vol plané');
    assert.ok(hautTremplin < 1.2,
        `le tremplin monte à ${(Math.atan(hautTremplin) * 180 / Math.PI).toFixed(0)}° : `
        + 'c\'est le mur que Rémy appelle « choquant »');
});

test('NE RIEN FAIRE FAIT PERDRE, ET AVANT QU’ON SE LASSE', () => {
    // RÉMY : « clairement aux petites ailes, je ne peux pas perdre même si je
    // ne fais rien ».
    //
    // L'OUTIL LE DISAIT DÉJÀ, ET JE NE L'AVAIS PAS LU COMME IL FALLAIT. Il
    // imprimait « sans rien faire : monde 6, 36 928 px », et je m'en étais
    // contenté : la nuit finit par rattraper, donc la règle tient. Mais une
    // DISTANCE ne dit pas une DURÉE. En secondes, c'était quatre-vingt-treize.
    //
    // QUATRE-VINGT-DIX SECONDES DE PATIENCE : c'est déjà long pour un élève qui
    // essaie « et si je ne fais rien ? ». Au-delà, il ne voit pas la fin.
    const jusquOu = (joue, graine) => {
        let e = etatInitial(graine, 0);
        let nuit = -1500;
        for (let t = 0; t < 300; t += 1 / 60) {
            const sol = relief(e.x, graine);
            e = pas(e, 1 / 60, joue(sol.pente), graine);
            const m = MONDES[Math.max(0, Math.min(MONDES.length - 1,
                Math.floor(e.x / LONGUEUR_MONDE)))];
            nuit += m.nuit / 60;
            if (nuit >= e.x) return t;
        }
        return 300;
    };
    for (const g of [0.7, 1.9, 3.3]) {
        const t = jusquOu(JAMAIS, g);
        assert.ok(t < 90, `paysage ${g} : on tient ${Math.round(t)} s sans rien faire`);
    }
    // ET LE BON JOUEUR, LUI, NE SE FAIT PAS RATTRAPER. Une nuit qui punit
    // l'abandon ne vaut que si elle laisse passer celui qui joue.
    for (const g of [0.7, 1.9, 3.3]) {
        assert.equal(jusquOu(PARFAIT, g), 300,
            `paysage ${g} : le bon joueur se fait rattraper`);
    }
});
