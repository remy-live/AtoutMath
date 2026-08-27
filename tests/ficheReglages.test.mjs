import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { exercices, paramSchemaOf } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { surPapier, aSonMot, reglagesDeFiche, valeursDeDepart } from '../js/core/reglagesFiche.js';
import {
    GOUTTIERE, zoneUtile, mesuresSlot, capaciteMax, choisirDisposition, coteLisible,
    dispositionDuRendu
} from '../js/core/dispositionFiche.js';

// La page de référence : A4 paysage, telle que la pose `printSheet.js`.
const PAGE = { w: 297, h: 210, marge: 9, enteteH: 17, piedH: 6 };
const PORTRAIT = { ...PAGE, w: 210, h: 297 };

// --- La règle : la fiche montre ce que voit le professeur ---------------------

test('LA FICHE MONTRE LA LISTE DU CATALOGUE, pas celle du générateur', () => {
    // Un schéma de catalogue est un CHOIX d'auteur : il peut n'offrir qu'un
    // « Niveau » là où le générateur sait faire varier trois choses. Le
    // compléter reviendrait à le défaire — c'était le cas de Pythagore, dont
    // la fiche montrait deux boutons cachés exprès et cachait le seul offert.
    const schema = reglagesDeFiche({
        schemaCatalogue: [{ id: 'niveau', label: 'Niveau' }],
        paramsGenerateur: [{ id: 'chercher' }, { id: 'presentation' }]
    });
    assert.deepEqual(schema.map(p => p.id), ['niveau']);
});

test('une feuille qui a son propre générateur montre LES RÉGLAGES DE CE GÉNÉRATEUR', () => {
    // Un puissance 4 se joue contre l'ordinateur et s'imprime en grilles vides :
    // « niveau de l'ordinateur » n'a rien à faire sur la feuille.
    const schema = reglagesDeFiche({
        schemaCatalogue: [{ id: 'mode' }, { id: 'niveau' }],
        paramsGenerateur: [{ id: 'colonnes' }, { id: 'rangees' }],
        ficheDistincte: true
    });
    assert.deepEqual(schema.map(p => p.id), ['colonnes', 'rangees']);
});

test('`papier: false` retire un réglage d\'écran', () => {
    assert.equal(surPapier({ id: 'a' }), true, 'sans mention, un réglage compte');
    assert.equal(surPapier({ id: 'a', papier: false }), false);
    const schema = reglagesDeFiche({
        schemaCatalogue: [{ id: 'taille' }, { id: 'saisieClavier', papier: false }]
    });
    assert.deepEqual(schema.map(p => p.id), ['taille']);
});

test('`visibleSi` fait disparaître un réglage qui n\'a plus de sens', () => {
    const schema = [
        { id: 'operation' },
        { id: 'diviseur', visibleSi: (r) => r.operation === '÷' },
        { id: 'nombres', visibleSi: (r) => r.operation === '+' }
    ];
    const lire = (reglages) =>
        reglagesDeFiche({ schemaCatalogue: schema, reglages }).map(p => p.id);
    assert.deepEqual(lire({ operation: '+' }), ['operation', 'nombres']);
    assert.deepEqual(lire({ operation: '÷' }), ['operation', 'diviseur']);
    // SANS VALEURS COURANTES, ON NE CACHE RIEN : ne pas savoir n'est pas une
    // raison de faire disparaître un réglage bien réel.
    assert.deepEqual(reglagesDeFiche({ schemaCatalogue: schema }).map(p => p.id),
        ['operation', 'diviseur', 'nombres']);
    assert.equal(aSonMot({ id: 'x' }, {}), true, 'sans condition, toujours visible');
});

test('les valeurs de départ complètent avec les défauts du schéma', () => {
    const v = valeursDeDepart([{ id: 'a', default: 3 }, { id: 'b', default: 'x' }], { a: 9 });
    assert.deepEqual(v, { a: 9, b: 'x' });
});

// --- Ce que la règle donne sur le vrai catalogue --------------------------------

/** Les exercices qui savent s'imprimer, avec le générateur qui fait leur feuille. */
function fichesDuCatalogue() {
    const out = [];
    for (const e of exercices) {
        const genEcran = e.generatorId ? getGenerator(e.generatorId) : null;
        const distincte = !!(e.printGeneratorId && e.printGeneratorId !== e.generatorId);
        const g = distincte ? getGenerator(e.printGeneratorId) : genEcran;
        const grille = !!e.printable;
        const ecrit = !grille && !!(genEcran && genEcran.ecrit);
        if ((!grille && !ecrit) || !g) continue;
        const reglages = { ...(e.params || {}), ...(e.printParams || {}) };
        out.push({
            exo: e, generator: g, distincte, reglages, voie: grille ? 'grille' : 'ecrit',
            schema: reglagesDeFiche({
                schemaCatalogue: paramSchemaOf(e), paramsGenerateur: g.params,
                ficheDistincte: distincte, reglages
            })
        });
    }
    return out;
}

test('les cinq réglages qui manquaient sont sur la fiche', () => {
    // Mesurés un par un avant la correction : ils changeaient vraiment la
    // feuille, et n'étaient réglables que depuis un autre panneau.
    const attendus = {
        'logi-logigramme': 'theme',        // l'histoire : boulangerie ou cirque
        'logi-futoshiki': 'difficulte',
        'geo-pythagore': 'niveau',
        'geo-mat-echecs': 'depart',
        'calc-mathodu': 'operations'
    };
    const par = new Map(fichesDuCatalogue().map(f => [f.exo.id, f]));
    for (const [id, pid] of Object.entries(attendus)) {
        const f = par.get(id);
        assert.ok(f, `${id} n'est plus imprimable ?`);
        assert.ok(f.schema.some(p => p.id === pid),
            `${id} : « ${pid} » n'est pas réglable depuis la fiche`);
    }
});

test('TOUTES LES FICHES ÉCRITES ONT DES RÉGLAGES — c\'était zéro sur trente-quatre', () => {
    // La fenêtre des questions n'avait aucun bloc « Contenu » : on ne pouvait
    // demander ni la table de 7, ni un niveau, ni une difficulté une fois la
    // feuille ouverte. Et trois des quatre portes qui y mènent passent les
    // valeurs par défaut du catalogue.
    const ecrites = fichesDuCatalogue().filter(f => f.voie === 'ecrit');
    assert.ok(ecrites.length >= 30, `seulement ${ecrites.length} fiches écrites`);
    const muettes = ecrites.filter(f => !f.schema.length).map(f => f.exo.id);
    assert.deepEqual(muettes, [], 'ces fiches écrites n\'ont aucun réglage');
});

test('AUCUN RÉGLAGE MORT : tout bouton offert sur une fiche change la feuille', { timeout: 120000 }, () => {
    // LA GARANTIE QUE RÉMY DEMANDAIT VRAIMENT. Un bouton qui ne fait rien est
    // pire qu'un bouton absent : on l'essaie, rien ne bouge, et l'on ne sait
    // pas si c'est la fiche ou soi qu'on n'a pas comprise.
    //
    // On ne le déduit pas, on le mesure : deux valeurs, et l'on compare ce que
    // le générateur produit. Un réglage dont l'effet est rare — l'axe oblique
    // d'une symétrie parmi quatre transformations — demande plus de tirages
    // avant d'apparaître : on repasse donc en profondeur SEULEMENT sur ceux
    // qui semblent morts, pour ne pas payer ce prix sur les deux cent onze.
    const valOpt = (o) => (o && typeof o === 'object' && 'value' in o) ? o.value : o;
    const valeursDe = (p) => {
        const opts = (p.options || []).map(valOpt);
        if (p.type === 'multiselect') return opts.length < 2 ? [] : [[opts[0]], [opts[opts.length - 1]]];
        if (p.type === 'checkbox' || p.type === 'bool') return [true, false];
        if (p.type === 'number') {
            const lo = p.min != null ? p.min : 1;
            const hi = p.max != null ? p.max : (Number(p.default) || 1) + 4;
            return lo === hi ? [] : [lo, hi];
        }
        return opts.length >= 2 ? opts : [];
    };
    const tirer = (g, params, n) => {
        const out = [];
        for (let i = 0; i < n; i++) {
            try { out.push(JSON.stringify(g.generate({ ...params }, { rng: makeRng(`s${i}`), index: i }))); }
            catch (e) { out.push(`ERR:${e.message}`); }
        }
        return out.join('|');
    };
    const bouge = (g, base, p, vals, n) => {
        const ref = tirer(g, { ...base, [p.id]: vals[0] }, n);
        return vals.slice(1).some(v => tirer(g, { ...base, [p.id]: v }, n) !== ref);
    };

    const morts = [];
    let vivants = 0;
    for (const f of fichesDuCatalogue()) {
        for (const p of f.schema) {
            const vals = valeursDe(p);
            if (vals.length < 2) continue;      // un réglage à une seule valeur ne se teste pas
            if (bouge(f.generator, f.reglages, p, vals, 10)
                || bouge(f.generator, f.reglages, p, vals, 40)) { vivants++; continue; }
            morts.push(`${f.exo.id} → « ${p.label || p.id} » (${p.id})`);
        }
    }
    assert.ok(vivants > 150, `seulement ${vivants} réglages éprouvés`);
    assert.deepEqual(morts, [], 'ces boutons ne changent rien à la feuille');
});

// --- Combien de blocs, et de quelle taille -----------------------------------------

test('MOINS DE GRILLES VEUT DIRE DE PLUS GRANDES — et c\'est tout le propos', () => {
    const dispo = { maxCols: 5, maxRows: 5 };
    let precedente = 0;
    // On descend de 12 à 1 : la taille ne doit jamais diminuer.
    for (let n = 12; n >= 1; n--) {
        const d = choisirDisposition(n, dispo, PAGE);
        assert.ok(d.cote >= precedente - 1e-9,
            `${n} grilles : ${d.cote.toFixed(1)} mm, moins que ${precedente.toFixed(1)} pour ${n + 1}`);
        precedente = d.cote;
    }
    // Et l'écart est franc, pas cosmétique.
    assert.ok(choisirDisposition(2, dispo, PAGE).cote
        > choisirDisposition(12, dispo, PAGE).cote * 1.5);
});

test('la disposition choisie porte bien le nombre demandé, sans trop de trous', () => {
    const dispo = { maxCols: 4, maxRows: 3 };
    for (let n = 1; n <= 12; n++) {
        const d = choisirDisposition(n, dispo, PAGE);
        assert.ok(d.cols * d.rows >= n, `${n} ne tient pas dans ${d.cols}×${d.rows}`);
        assert.ok(d.cols <= 4 && d.rows <= 3, `${n} déborde les bornes du rendu`);
        // Le gâchis reste petit. Il n'est plus nul, et c'est voulu : chercher
        // la plus grande grille passe avant boucher le dernier trou, sans quoi
        // demander cinq grilles en donnait de plus petites que six.
        assert.ok(d.gachis <= 2, `${n} : ${d.gachis} places perdues sur ${d.cols}×${d.rows}`);
    }
});

test('on ne demande pas plus que la page ne peut porter', () => {
    const dispo = { maxCols: 2, maxRows: 3 };
    assert.equal(capaciteMax(dispo), 6);
    const d = choisirDisposition(99, dispo, PAGE);
    assert.equal(d.cols * d.rows, 6);
    // Et zéro, ou n'importe quoi, retombe sur une grille : la feuille se
    // dessine toujours, même quand on lui demande l'impossible.
    assert.equal(choisirDisposition(0, dispo, PAGE).cols * choisirDisposition(0, dispo, PAGE).rows >= 1, true);
});

test('LA FORME DU BLOC COMMANDE LA DISPOSITION, pas seulement le nombre', () => {
    const dispo = { maxCols: 4, maxRows: 4 };
    // Un bloc large et bas — un logigramme, un treillis — se range en lignes.
    const large = choisirDisposition(2, dispo, PAGE, { proportions: { w: 1, h: 0.3 } });
    assert.equal(large.cols, 1, 'deux blocs larges vont l\'un SOUS l\'autre');
    assert.equal(large.rows, 2);
    // Un bloc carré, sur une page en paysage, se range côte à côte.
    const carre = choisirDisposition(2, dispo, PAGE);
    assert.equal(carre.cols, 2);
    assert.equal(carre.rows, 1);
});

test('« PLEIN » : LE BLOC PREND TOUT SON EMPLACEMENT', () => {
    // Rémy, sur les jeux à découper : « ils doivent être en version unique de
    // base et occuper le maximum d'espace pour être plus facile à découper. »
    // Une proportion déclarée est un contrat sur la FORME du dessin, et elle
    // coûte : dès qu'elle ne tombe pas sur celle de la page, la différence
    // reste blanche. Un plateau de jeu n'a pas de forme à défendre.
    const plein = mesuresSlot(PAGE, 1, 1, false, 'plein');
    const bride = mesuresSlot(PAGE, 1, 1, false, { w: 1, h: 0.74 });
    assert.equal(plein.cote, plein.slotW, 'un bloc « plein » vaut la largeur de son emplacement');
    assert.ok(plein.cote > bride.cote * 1.15,
        `plein ${plein.cote.toFixed(0)} mm contre ${bride.cote.toFixed(0)} bridé : le gain doit être franc`);
    // Et cela ne change rien à un emplacement carré : la largeur est déjà la
    // borne.
    const carre = mesuresSlot(PAGE, 3, 3, false, 'plein');
    assert.equal(carre.cote, carre.slotW);
});

test('UNE FEUILLE PAR DÉFAUT NE LAISSE PAS LA MOITIÉ DE LA PAGE BLANCHE', () => {
    // Rémy : « je prends les pyramides de lettres, il y a tellement d'espace
    // vide ». La cause était arithmétique : une pyramide est large et basse
    // (1 × 0,62), la page en paysage l'est aussi — DEUX pyramides ne peuvent
    // pas la remplir, quelle que soit la façon de les poser. Quatre, si.
    //
    // On mesure donc la part de la zone utile réellement couverte par les
    // dessins, pour la disposition qu'un professeur obtient SANS RIEN RÉGLER.
    const couverture = (rendu) => {
        const dispo = dispositionDuRendu(rendu);
        const n = dispo.cols * dispo.rows;
        const d = choisirDisposition(n, dispo, PAGE, { proportions: rendu.proportions });
        const m = mesuresSlot(PAGE, d.cols, d.rows, false, rendu.proportions);
        const p = rendu.proportions === 'plein' ? { w: 1, h: 0 } : (rendu.proportions || { w: 1, h: 1 });
        const hDessin = rendu.proportions === 'plein' ? m.utileH : m.cote * (p.h / p.w);
        const z = zoneUtile(PAGE);
        return (m.cote * hDessin * n) / (z.w * z.h);
    };
    // La pyramide des mots, telle qu'elle est déclarée aujourd'hui.
    const pyramide = { proportions: { w: 1, h: 0.62 },
        disposition: { cols: 2, rows: 2, maxCols: 2, maxRows: 4 } };
    assert.ok(couverture(pyramide) > 0.65,
        `pyramide : ${(couverture(pyramide) * 100).toFixed(0)} % de la page couverte`);
    // Et l'ancienne, celle dont Rémy s'est plaint, ne passait pas.
    const avant = { proportions: { w: 1, h: 0.62 },
        disposition: { cols: 1, rows: 2, maxCols: 2, maxRows: 4 } };
    assert.ok(couverture(avant) < 0.55,
        'le cas dont Rémy s\'est plaint devrait être celui qui échoue');
});

test('UN RENDU QUI DIT « DEUX PAR LIGNE » EST ÉCOUTÉ', () => {
    // Le Garam déclarait `parLigneDefaut: 2`, avec la raison écrite à côté :
    // « à trois par ligne, les cases de trois millimètres deviennent
    // illisibles ». La fiche autonome n'écoutait pas cette phrase et en
    // ouvrait douze, à 4,9 cm — soit exactement ce que l'auteur refusait.
    const d = dispositionDuRendu({ parLigneDefaut: 2 });
    assert.equal(d.cols, 2);
    assert.equal(d.maxCols, 2, 'jamais plus de deux par ligne');
    assert.equal(d.cols * d.rows, 4, 'quatre pour commencer, pas douze');
    const avec = choisirDisposition(4, d, PAGE);
    const sans = choisirDisposition(12, { maxCols: 5, maxRows: 5 }, PAGE);
    assert.ok(avec.cote > sans.cote * 1.4, 'la consigne doit changer la taille pour de bon');
    // Une `disposition` explicite garde le dernier mot.
    assert.deepEqual(dispositionDuRendu({ parLigneDefaut: 2, disposition: { cols: 1, rows: 1 } }),
        { cols: 1, rows: 1 });
    // Et sans rien du tout, la feuille reste celle qu'on avait.
    assert.equal(dispositionDuRendu({}).cols * dispositionDuRendu({}).rows, 12);
});

test('le portrait et le paysage ne donnent pas la même feuille', () => {
    const dispo = { maxCols: 4, maxRows: 4 };
    const p = choisirDisposition(4, dispo, PORTRAIT);
    const l = choisirDisposition(4, dispo, PAGE);
    // Quatre carrés : plus grands en portrait, où la page est plus haute que large.
    assert.ok(p.cote > l.cote, `portrait ${p.cote.toFixed(1)} devrait battre paysage ${l.cote.toFixed(1)}`);
});

test('les emplacements couvrent la zone utile, et les blocs collés se touchent', () => {
    const z = zoneUtile(PAGE);
    assert.equal(z.w, PAGE.w - PAGE.marge * 2);
    assert.equal(z.y, PAGE.marge + PAGE.enteteH);
    const m = mesuresSlot(PAGE, 3, 2, false);
    assert.ok(Math.abs(m.slotW * 3 + GOUTTIERE.x * 2 - z.w) < 1e-9);
    assert.ok(Math.abs(m.slotH * 2 + GOUTTIERE.y * 1 - z.h) < 1e-9);
    // Collés : plus de gouttière, plus de titre — un seul coup de massicot.
    const c = mesuresSlot(PAGE, 3, 2, true);
    assert.equal(c.gapX, 0);
    assert.equal(c.gapY, 0);
    assert.equal(c.titreH, 0);
    assert.ok(c.slotW > m.slotW, 'sans gouttière, les cartes sont plus larges');
});

test('la taille se dit en centimètres, avec une virgule', () => {
    assert.equal(coteLisible(55), '5,5 cm');
    assert.equal(coteLisible(78.14), '7,8 cm');
    assert.equal(coteLisible(100), '10 cm');
});

// --- Les deux fenêtres montent le MÊME bloc -----------------------------------------

test('LES DEUX FICHES MONTENT LE MÊME BLOC « CONTENU »', () => {
    // Deux copies auraient divergé au premier réglage ajouté — c'est
    // exactement ainsi que le trou s'était creusé, la fiche de grilles ayant
    // reçu son bloc et celle des questions jamais.
    const lu = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
    for (const f of ['../js/ui/printSheet.js', '../js/ui/printQuestions.js']) {
        const src = lu(f);
        assert.match(src, /monterPanneauContenu/, `${f} ne monte pas le bloc partagé`);
        assert.match(src, /fp-contenu|fq-contenu/, `${f} n'a pas de conteneur pour lui`);
    }
    // Et le bloc lui-même passe par la règle, il ne la réinvente pas.
    assert.match(lu('../js/ui/panneauContenu.js'), /reglagesDeFiche/);
});
