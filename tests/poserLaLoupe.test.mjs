// POSE LA LOUPE — ce que ses épreuves gardent.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, deux fois : « il faudrait que ce soit l'élève qui pose la loupe », puis,
// en voyant la première version : « je préfèrerai que l'élève puisse avoir une
// loupe et que ce soit pas un étirement vertical qui déforme la croix ».
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   · IL Y A TOUJOURS QUELQUE CHOSE À LIRE. Si la croix tombait sur un grand
//     trait, ce trait porterait déjà son nombre écrit : la question se
//     résoudrait en se posant. Il suffit d'un centième nul pour que ce soit le
//     cas, et c'est le défaut le plus facile à écrire sans s'en apercevoir.
//   · LA MARCHE EST UNE DISTANCE À UN REPÈRE, et la troisième seule contient 3
//     et 7 — les deux centièmes qui obligent à compter trois crans.
//   · LA CROIX EST DESSINÉE LÀ OÙ LA RÉPONSE L'ATTEND.
//   · IL Y A TOUJOURS UN REPÈRE SOUS LE VERRE. C'est la contrainte qui a fixé
//     la puissance de la loupe, et elle ne se voit nulle part dans le code
//     autrement qu'en la mesurant : `LARGE / K ≥ (D − G) / 10`.
//   · RIEN N'EST ÉTIRÉ. C'est sa phrase, et elle se garde.
//   · PAS DE FICHE PAPIER, ET C'EST DÉLIBÉRÉ. Une feuille ne glisse pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { poserLaLoupeGenerator as G } from '../js/core/generators/poserLaLoupe.js';
import { loupeSvg, LOUPE_GEO } from '../js/core/figures.js';

const MARCHES = ['repere', 'pres', 'partout'];
const item = (marche, i) => G.generate({ marches: [marche] },
    { rng: makeRng(`lp-${marche}-${i}`), index: 0, total: 3 });

test('IL Y A TOUJOURS QUELQUE CHOSE À LIRE : le centième n’est jamais nul', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 40; i++) {
            const it = item(m, i);
            const { valeur, entier, centieme, croix } = it.meta;
            const ou = `${m} #${i} (${valeur})`;
            // À 6,40 la croix tomberait sur le grand trait de 6,4, qui porte
            // déjà son nombre écrit sous le verre. Il n'y aurait plus rien à
            // compter, et la loupe ne servirait à rien.
            assert.notEqual(centieme, 0, `${ou} : le centième est nul`);
            assert.equal(Math.round(valeur * 100) % 10, centieme,
                `${ou} : le centième annoncé n’est pas celui du nombre`);
            // LA CROIX EST DANS LA DROITE, bornes exclues : à 0 ou à 100 elle
            // serait sur un bout, où le nombre est écrit en grand au-dessus.
            assert.ok(croix > 0 && croix < 100,
                `${ou} : la croix est à ${croix} centièmes, donc sur un bout`);
            assert.ok(valeur > entier && valeur < entier + 1,
                `${ou} : la croix est hors de la droite [${entier} ; ${entier + 1}]`);
        }
    }
});

test('LA MARCHE EST UNE DISTANCE À UN REPÈRE', () => {
    // SOUS LE VERRE, TROIS SORTES DE TRAITS : les grands (0 et 10, qui portent
    // un nombre), le rouge du milieu (5), et les petits. La distance au plus
    // proche repère est ce qui rend le comptage facile ou non — c'est donc elle
    // qui fait les marches.
    const loin = (c) => Math.min(c, Math.abs(c - 5), 10 - c);
    for (let i = 0; i < 40; i++) {
        assert.equal(item('repere', i).meta.centieme, 5,
            `repere #${i} : la croix n’est pas sur le trait rouge`);
        assert.equal(loin(item('pres', i).meta.centieme), 1,
            `pres #${i} : la croix n’est pas à exactement un cran d’un repère`);
    }
    // ET LA TROISIÈME VA VRAIMENT JUSQU'À DEUX CRANS, qui est le plus loin
    // qu'on puisse être quand il y a un repère tous les cinq centièmes : 2, 3,
    // 7 et 8, et eux seuls. Une marche « n'importe où » qui ne les tirerait
    // jamais serait un décor, et rien ne le dirait.
    //
    // ON A ÉCRIT « TROIS CRANS » D'ABORD, ET C'ÉTAIT FAUX : `epreuveTombe.mjs` a
    // refusé de voir cette épreuve tomber quand on remettait 3 dans la deuxième
    // marche, parce que 3 est à deux crans du trait rouge. Le défaut déduit
    // n'existait pas.
    const vus = new Set();
    for (let i = 0; i < 60; i++) vus.add(loin(item('partout', i).meta.centieme));
    assert.ok(vus.has(2),
        `la marche « partout » ne s’éloigne jamais de deux crans `
        + `(distances vues : ${[...vus].sort().join(' ')})`);
});

test('LA CROIX EST DESSINÉE LÀ OÙ LA RÉPONSE L’ATTEND', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 30; i++) {
            const it = item(m, i);
            const { valeur, entier, dixieme, centieme, croix } = it.meta;
            const ou = `${m} #${i}`;
            // `croix` EST EN CENTIÈMES DE LA DROITE, de 0 à 100 : c'est ce que
            // reçoivent le dessin ET le robot de démonstration. Si elle diverge
            // de la valeur, la croix est dessinée ailleurs que là où la réponse
            // l'attend, et personne ne le voit — ni une épreuve, ni un plantage.
            assert.equal(croix, dixieme * 10 + centieme,
                `${ou} : la croix est à ${croix} pour ${dixieme} dixièmes et `
                + `${centieme} centièmes`);
            assert.equal(valeur, Number((entier + croix / 100).toFixed(2)),
                `${ou} : la croix est dessinée à ${croix}/100 pour ${valeur}`);
        }
    }
});

test('IL Y A TOUJOURS UN REPÈRE SOUS LE VERRE, ET LA CROIX Y TIENT', () => {
    // CETTE ÉPREUVE GARDE LA CONTRAINTE QUI A FIXÉ LA PUISSANCE DE LA LOUPE.
    //
    // Un verre de largeur `w` et de puissance `k` ne montre que `w/k` de la
    // droite. Pour qu'il y ait TOUJOURS au moins un grand trait sous le verre —
    // un trait qui porte un nombre, donc d'où l'on peut compter —, il faut que
    // ce morceau soit plus large qu'un dixième. À ×10, le verre ne découvrirait
    // que 0,7 dixième : on pourrait alors ne voir aucun grand trait, et il n'y
    // aurait plus rien d'où compter. Rien dans le code ne dit cela : ça se
    // mesure sur le dessin, ou ça se perd.
    for (let c = 1; c <= 99; c++) {
        const svg = loupeSvg({
            gauche: '6', droite: '7', croix: c, centre: c,
            nombre: (u) => `6,${u / 10}`
        });
        // AU MOINS UN NOMBRE SOUS LE VERRE.
        const nombres = svg.match(/class="lp-vue-nb"/g) || [];
        assert.ok(nombres.length >= 1,
            `croix à ${c} centièmes : aucun grand trait sous le verre`);
        // ET LA CROIX AGRANDIE TOMBE DANS LE CADRE DU VERRE. Elle est dessinée
        // dans un groupe découpé (`clip-path`) : hors cadre, elle disparaîtrait
        // sans la moindre erreur, et l'élève verrait un verre vide.
        const cadre = svg.match(/class="lp-verre-cadre" x="([\d.-]+)" y="[\d.-]+"\s+width="(\d+)"/);
        assert.ok(cadre, `croix à ${c} : le cadre du verre est introuvable`);
        const [gx, large] = [Number(cadre[1]), Number(cadre[2])];
        const vue = svg.match(/class="lp-croix lp-croix--vue">\s*<line x1="([\d.-]+)"/);
        assert.ok(vue, `croix à ${c} : la croix agrandie est introuvable`);
        const x = Number(vue[1]) + 9;   // le `x1` est le coin gauche du X
        assert.ok(x > gx + 6 && x < gx + large - 6,
            `croix à ${c} centièmes : elle tombe à ${x.toFixed(1)}, hors du verre `
            + `[${gx} ; ${gx + large}]`);
    }
    // ET LE MORCEAU REGARDÉ NE SORT PAS DE LA DROITE, aux deux extrêmes : le
    // verre montrerait du vide d'un côté, et l'élève croirait sa loupe cassée.
    for (const centre of [-20, 0, 100, 120]) {
        const svg = loupeSvg({ gauche: '6', droite: '7', croix: 50, centre });
        const p = svg.match(/class="lp-poignee" x="([\d.-]+)"[\s\S]*?width="([\d.-]+)"/);
        assert.ok(p, `centre ${centre} : la poignée est introuvable`);
        const [x, w] = [Number(p[1]), Number(p[2])];
        assert.ok(x >= LOUPE_GEO.G - 0.5 && x + w <= LOUPE_GEO.D + 0.5,
            `centre ${centre} : le morceau regardé va de ${x.toFixed(1)} à `
            + `${(x + w).toFixed(1)}, hors de la droite [${LOUPE_GEO.G} ; ${LOUPE_GEO.D}]`);
    }
});

test('LA DROITE DU HAUT MONTRE SES CENTIÈMES, PÂLES ET VERS LE BAS', () => {
    // RÉMY : « on pourrait aussi mettre les sousgradution sous le dessin ».
    //
    // ILS SONT ILLISIBLES À DESSEIN — à 3 px d'écart sur un téléphone, ces
    // quatre-vingt-dix traits font une bande grise. Mais cette bande DIT qu'il
    // y a dix crans dans chaque dixième, et donc à quoi sert la loupe. Sans
    // eux, elle a l'air d'inventer les graduations qu'elle montre.
    const svg = loupeSvg({ gauche: '6', droite: '7', croix: 37, centre: 37 });
    const sous = [...svg.matchAll(
        /class="lp-sous" x1="([\d.-]+)" y1="([\d.-]+)"\s+x2="[\d.-]+" y2="([\d.-]+)"/g)]
        .map(m => ({ x: Number(m[1]), haut: Number(m[2]), bas: Number(m[3]) }));
    // QUATRE-VINGT-DIX, et non cent : les dix dixièmes ont déjà leur grand
    // trait, et en redessiner un petit par-dessus l'épaissirait sans rien dire.
    assert.equal(sous.length, 90, `${sous.length} petits traits au lieu de 90`);
    // VERS LE BAS SEULEMENT, c'est-à-dire PAS AU-DESSUS DE L'AXE. Vers le haut
    // ils se mêleraient aux grands traits, qui montent autant qu'ils
    // descendent, et la hiérarchie serait perdue : on ne saurait plus lequel
    // porte un nombre.
    //
    // ON S'EST D'ABORD MESURÉ AU GRAND TRAIT, ET ÇA NE GARDAIT RIEN :
    // `epreuveTombe.mjs` a fait monter les petits traits à mi-hauteur d'un
    // grand, et l'épreuve est restée verte — « moins haut qu'un grand » est
    // vrai de presque tout. C'est à l'AXE qu'il faut se comparer.
    const axe = svg.match(/class="ax-axe" x1="[\d.-]+" y1="([\d.-]+)"/);
    assert.ok(axe, 'la droite elle-même est introuvable');
    for (const t of sous) {
        assert.ok(t.haut >= Number(axe[1]),
            `un petit trait monte jusqu’à ${t.haut}, au-dessus de l’axe (${axe[1]})`);
        assert.ok(t.bas > t.haut, 'un petit trait ne descend pas');
    }
    // ET ILS SONT AUX BONS ENDROITS, chacun au centième qu'il désigne.
    //
    // ON A D'ABORD MESURÉ L'ÉCART ENTRE VOISINS, ET C'ÉTAIT FAUX : aux
    // dixièmes il n'y a pas de petit trait, donc l'écart y vaut le double, et
    // l'épreuve rougissait sur un dessin juste. On compare donc chaque trait à
    // la place que la droite lui assigne — ce qui garde davantage : un peigne
    // régulier mais décalé d'un demi-cran passerait l'autre épreuve.
    const { G, D } = LOUPE_GEO;
    const attendus = [];
    for (let c = 1; c < 100; c++) {
        if (c % 10) attendus.push((G + c * (D - G) / 100).toFixed(1));
    }
    assert.deepEqual(sous.map(t => t.x.toFixed(1)).sort(), attendus.sort(),
        'les petits traits ne tombent pas sur les centièmes de la droite');
});

test('RIEN N’EST ÉTIRÉ : la loupe agrandit les deux directions', () => {
    // RÉMY : « que ce soit pas un étirement vertical qui déforme la croix,
    // c'est pas terribe. »
    //
    // LA VERSION D'AVANT EMPLOYAIT `scaleX`, qui ne tire QUE l'horizontale : la
    // croix, qui est un X, devenait un X aplati. Cette épreuve garde la phrase
    // de Rémy à l'endroit où on pourrait la reperdre — en réintroduisant une
    // transformation pour « faire tenir » quelque chose.
    const svg = loupeSvg({ gauche: '6', droite: '7', croix: 37, centre: 37 });
    assert.ok(!/scaleX|scaleY/.test(svg), 'le dessin étire une seule direction');
    assert.ok(!/transform=/.test(svg), 'le dessin porte une transformation');
    // ET LA CROIX GARDE SON ÉPAISSEUR ET SA FORME : les deux traits du X, sur
    // la droite comme sous le verre, sont des diagonales à 45°, c'est-à-dire de
    // même écart en x et en y.
    const croix = [...svg.matchAll(
        /<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"\/>/g)]
        .map(m => m.slice(1).map(Number))
        .filter(([x1, y1, x2, y2]) => Math.abs(x2 - x1) > 0 && Math.abs(y2 - y1) > 0);
    assert.equal(croix.length, 4, `${croix.length} diagonales au lieu des quatre du X`);
    for (const [x1, y1, x2, y2] of croix) {
        assert.equal(Math.abs(x2 - x1).toFixed(1), Math.abs(y2 - y1).toFixed(1),
            `une branche du X mesure ${Math.abs(x2 - x1)} en x et `
            + `${Math.abs(y2 - y1)} en y : elle est déformée`);
    }
});

test('LA RÉPONSE S’ÉCRIT COMME UN ÉLÈVE L’ÉCRIT', () => {
    for (const m of MARCHES) {
        for (let i = 0; i < 30; i++) {
            const it = item(m, i);
            const ou = `${m} #${i} (${it.answer})`;
            // DEUX DÉCIMALES, TOUJOURS : le centième n'est jamais nul, donc il
            // n'y a jamais de zéro à retirer au bout.
            assert.match(it.answer, /^[1-9],\d{2}$/, `${ou} : écriture inattendue`);
            // LE PAVÉ DE L'ACTIVITÉ ENVOIE UNE CHAÎNE : c'est `text` et non
            // `numeric`. Avec `numeric`, c'est le pavé du dépôt qui se monte, et
            // il n'y a plus de loupe à faire glisser.
            assert.equal(it.answerKind, 'text', `${ou} : ce n’est pas la loupe qui répond`);
            assert.equal(it.meta.decimal, true, `${ou} : pas de virgule au pavé`);
            // ET L'ÉNONCÉ NE DIT PAS LA RÉPONSE. Payé une fois sur « L'Axe au
            // Centième », où le `prompt.text` portait « (le point vaut 8,2) » —
            // ce qui s'imprime dans les défis.
            assert.ok(!it.prompt.text.includes(it.answer),
                `${ou} : l’énoncé contient la réponse — « ${it.prompt.text} »`);
        }
    }
});

test('PAS DE FICHE PAPIER, ET C’EST DÉLIBÉRÉ', () => {
    // UNE FEUILLE NE GLISSE PAS. Imprimer cet exercice donnerait un axe et une
    // croix à lire — c'est-à-dire « L'Axe au Centième », qui existe et qui est
    // fait pour ça. Un exercice dont le geste EST l'écran n'a pas de version
    // papier honnête ; en fabriquer une serait imprimer un autre exercice sous
    // son nom.
    //
    // CETTE ÉPREUVE EXISTE PARCE QUE L'OUBLI ET LA DÉCISION SE RESSEMBLENT :
    // sans elle, personne ne saurait, dans six mois, si la fiche manque ou si
    // on l'a refusée.
    assert.equal(G.ecrit, false, 'le générateur promet une fiche papier');
    const it = item('pres', 0);
    assert.ok(!it.prompt.papier,
        `une consigne papier est écrite : « ${it.prompt.papier} »`);
});

test('LE QCM DES DÉFIS PORTE LES FAUTES DE LECTURE', () => {
    let vues = 0;
    const fautes = new Set();
    for (const m of MARCHES) {
        for (let i = 0; i < 20; i++) {
            const it = item(m, i);
            const ou = `${m} #${i}`;
            const bonnes = (it.choices || []).filter(c => c.correct);
            assert.equal(bonnes.length, 1, `${ou} : pas une seule bonne réponse`);
            assert.equal(bonnes[0].value, it.answer);
            const vals = (it.choices || []).map(c => String(c.value));
            assert.equal(new Set(vals).size, vals.length, `${ou} : deux propositions identiques`);
            const pourquoi = (it.choices || []).map(c => c.why || '').join(' ');
            [/grand trait, pas la croix/, /grand trait de\s+DROITE/, /partie entière/]
                .forEach((r, k) => { if (r.test(pourquoi)) fautes.add(k); });
            vues += 1;
        }
    }
    assert.ok(vues >= 60, `seulement ${vues} questions examinées`);
    // LA DEUXIÈME EST LA PLUS INSTRUCTIVE : compter les petits traits en partant
    // du grand trait de DROITE. On la voit en classe, et elle donne un nombre
    // parfaitement crédible — c'est justement pour cela qu'elle doit y être.
    assert.equal(fautes.size, 3, `seules ${fautes.size} des trois fautes se rencontrent`);
});
