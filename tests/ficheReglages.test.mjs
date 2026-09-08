import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { exercices, paramSchemaOf } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { surPapier, aSonMot, reglagesDeFiche, valeursDeDepart } from '../js/core/reglagesFiche.js';
import { FAMILLES, codageDiagonales } from '../js/core/quadrilateres.js';
import { RENDUS } from '../js/ui/printSheet.js';
import { encre, morceauxLigne } from '../js/ui/ficheRendu.js';
import {
    GOUTTIERE, zoneUtile, mesuresSlot, capaciteMax, choisirDisposition, coteLisible,
    dispositionDuRendu, dispositionEnColonnes, lignesQuiRemplissent
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

// --- Les colonnes que l'exercice réclame -------------------------------------

test('UN EXERCICE QUI DIT SES COLONNES LES OBTIENT', () => {
    // Rémy a relu le catalogue fiche par fiche et écrit quarante-six fois
    // « fais 3 colonnes par défaut », « par défaut 4 colonnes ». Ce n'est pas
    // le rendu qui peut le savoir : trois exercices partagent l'opération
    // posée et en veulent cinq, quatre et quatre.
    const rendu = { disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 } };
    const d = dispositionEnColonnes(4, rendu, PAGE, {});
    assert.equal(d.cols, 4, 'quatre colonnes, comme demandé');
    assert.ok(d.maxCols >= 4, 'le plafond du rendu ne peut pas refuser la demande');
    // Et la disposition retenue pour le nombre par défaut les garde.
    const choisie = choisirDisposition(d.cols * d.rows, d, PAGE, {});
    assert.equal(choisie.cols, 4);
});

test('LE NOMBRE PAR DÉFAUT EST UN MULTIPLE DU NOMBRE DE COLONNES', () => {
    // Rémy, sous le Tasuko et pour tout le catalogue : « Quand je te dis 3
    // colonnes mets 6 questions ou un multiple de 3. Quand je dis 4 colonnes
    // mets 4 questions ou un multiple de 4. »
    for (const n of [2, 3, 4, 5]) {
        const d = dispositionEnColonnes(n, { disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 } },
            PAGE, {});
        assert.equal((d.cols * d.rows) % n, 0, `${n} colonnes : le compte doit être un multiple`);
        assert.ok(d.rows >= 1);
    }
});

test('LES RANGÉES REMPLISSENT LA PAGE PLUTÔT QUE DE LA LAISSER À MOITIÉ BLANCHE', () => {
    // Trois colonnes de blocs carrés sur une page couchée : le bloc fait 8,9 cm
    // de large, la zone utile 16,9 cm de haut. Une seule rangée laisserait la
    // moitié de la feuille vide — c'est le « ça gâche du papier » de Rémy.
    assert.equal(lignesQuiRemplissent(3, PAGE, {}), 2);
    // Un bloc large et bas — une droite graduée — en tient bien davantage.
    assert.ok(lignesQuiRemplissent(3, PAGE, { proportions: { w: 1, h: 0.22 } }) >= 5);
    // Et la hauteur réservée reste celle d'une page : jamais zéro rangée.
    assert.ok(lignesQuiRemplissent(6, PAGE, { proportions: { w: 1, h: 4 } }) >= 1);
});

test('sans colonnes déclarées, rien ne change', () => {
    const rendu = { disposition: { cols: 2, rows: 3, maxCols: 3, maxRows: 4 } };
    assert.deepEqual(dispositionEnColonnes(0, rendu, PAGE, {}), rendu.disposition);
});

test('LES COLONNES DES REVUES SONT DANS LE CATALOGUE', () => {
    // La revue du 7 septembre 2026, exercice par exercice. On ne vérifie pas
    // ici la mise en page — elle se regarde à l'écran — mais que la demande a
    // bien été REPORTÉE : c'est ce qui se perd d'une relecture à l'autre.
    const VOULU = {
        'num-parties': 2, 'num-egypte': 3, 'num-arrondi': 1, 'num-graduations': 2,
        'num-relatifs': 2, 'alg-balance': 4, 'alg-fonctions': 2,
        'num-litteral-puissances': 3, 'num-puissances-prefixes': 3,
        'num-puissances-calcul': 4, 'calc-prio': 1, 'calc-prio-relatifs': 4,
        'calc-prio-cascade': 4, 'calc-poser': 5, 'calc-poser-multiplication': 4,
        'calc-poser-division': 4, 'log-tasuko': 4, 'voc-mot-code': 2,
        'logi-puissance4': 3, 'logi-sim': 3, 'voc-mots-caches': 2,
        'logi-logigramme': 3, 'logi-hashi': 3, 'logi-slitherlink': 4,
        'logi-futoshiki': 4, 'logi-carre-magique': 4, 'logi-hexagrille': 4,
        'logi-colorier-nombres': 4, 'frac-pizza': 3, 'geo-angles-manquants': 5,
        'geo-programme-construction': 4, 'geo-notation': 4, 'geo-repere-placer': 3,
        'geo-symetrie-quadrillage': 4, 'geo-transfo-quadrillage': 4,
        'geo-translation-fleche': 4, 'geo-pavage': 3, 'geo-angles': 3,
        'geo-relier-points': 3, 'geo-solides-denombrer': 3, 'geo-dedale-forme': 2,
        'geo-mat-echecs': 4, 'geo-trigo-cotes': 4, 'mes-disque': 5,
        'mes-grandeurs-composees': 2, 'mes-heure': 5,
        // Deuxième relecture, le même jour : ces deux-là n'étaient pas
        // dans la première liste.
        'num-puissances-transformer': 2, 'frac-somme-posee': 2
    };
    for (const [id, n] of Object.entries(VOULU)) {
        const exo = exercices.find(e => e.id === id);
        assert.ok(exo, `${id} : exercice introuvable`);
        assert.equal(exo.colonnesPapier, n, `${id} : Rémy en veut ${n}`);
    }
});

// --- Le codage des diagonales de l'organigramme -------------------------------

test('LES FIGURES DE L\'ORGANIGRAMME PORTENT LE CODAGE DE LEURS DIAGONALES', () => {
    // Rémy, deux revues de suite : « code-les avec les diagonales », puis « tu
    // as oublié le codage sur les quadrilatères avec les diagonales du pdf ».
    // Ce sont les diagonales que l'organigramme met en jeu — « qui a ses
    // diagonales de même longueur », « perpendiculaires », « se coupant en leur
    // milieu » —, et la figure doit porter la réponse à la question posée.
    const fig = (id) => (FAMILLES.find(f => f.id === id) || {}).figure;

    // Le quadrilatère quelconque n'a AUCUNE propriété : rien à coder.
    assert.equal(codageDiagonales(fig('quadrilatere'), 'quadrilatere'), null);

    for (const id of ['parallelogramme', 'rectangle', 'losange', 'carre']) {
        const c = codageDiagonales(fig(id), id);
        assert.ok(c, `${id} : pas de codage`);
        assert.equal(c.diagonales.length, 2, `${id} : les deux diagonales`);
        // Une marque par demi-diagonale au moins : c'est ce qui dit le milieu.
        assert.ok(c.marques.length >= 4, `${id} : ${c.marques.length} marques`);
    }
    // LE RECTANGLE ET LE CARRÉ PORTENT LA MÊME MARQUE PARTOUT — quatre demies
    // égales, donc même longueur ET même milieu, d'un seul geste. Le
    // parallélogramme et le losange en portent deux sortes : leurs diagonales
    // se coupent en leur milieu sans être égales.
    assert.equal(codageDiagonales(fig('rectangle'), 'rectangle').marques.length, 4);
    assert.equal(codageDiagonales(fig('carre'), 'carre').marques.length, 4);
    assert.equal(codageDiagonales(fig('parallelogramme'), 'parallelogramme').marques.length, 6);
    assert.equal(codageDiagonales(fig('losange'), 'losange').marques.length, 6);

    // L'ANGLE DROIT AU CENTRE, et seulement là où il existe.
    assert.ok(codageDiagonales(fig('losange'), 'losange').droit);
    assert.ok(codageDiagonales(fig('carre'), 'carre').droit);
    assert.equal(codageDiagonales(fig('rectangle'), 'rectangle').droit, null);
    assert.equal(codageDiagonales(fig('parallelogramme'), 'parallelogramme').droit, null);
});

// --- Une fiche de grilles qui tient sur plusieurs feuilles ---------------------

test('LE MEMORY SE DONNE PAR FEUILLES PLEINES', () => {
    // Rémy : « mets 8 paires ou 16 paires (2 pages du coup) ou 24 paires
    // (3 pages) ». Une fiche de grilles tenait sur UNE page — et pour un jeu à
    // découper c'est une limite arbitraire : les cartes du second feuillet se
    // découpent exactement comme celles du premier.
    const memory = RENDUS.memory;
    assert.ok(memory.plusieursPages, 'le rendu accepte plusieurs feuilles');
    const dispo = dispositionDuRendu(memory);
    const parPage = dispo.cols * dispo.rows;
    assert.equal(parPage, 8, 'huit paires remplissent une feuille');
    // Neuf n'est pas un nombre de memory : on étale les cartes en rectangle, et
    // quatre colonnes de paires font huit cartes de front.
    assert.equal(dispo.cols, 4);
    assert.equal(dispo.colonnes, 4, 'le vœu que `choisirDisposition` suivra');
    const d = choisirDisposition(parPage, dispo, PAGE, { colles: true, proportions: memory.proportions });
    assert.equal(d.cols, 4, 'quatre colonnes de paires');
    // Seize paires font deux feuilles, vingt-quatre en font trois.
    assert.equal(Math.ceil(16 / parPage), 2);
    assert.equal(Math.ceil(24 / parPage), 3);
});

test('les autres fiches restent sur une seule feuille', () => {
    // La pagination est déclarée par le rendu, jamais devinée : une planche de
    // sudokus ou de disques n'a aucune raison de déborder sur une seconde page.
    const paginees = Object.entries(RENDUS).filter(([, r]) => r && r.plusieursPages);
    assert.deepEqual(paginees.map(([k]) => k), ['memory']);
});

// LE FILTRE NOIR ET BLANC NE DOIT PLUS FAIRE DE NOIR AVEC DES COULEURS.
//
// Rémy, sur quatre feuilles d'affilée : « les blocs scratch sont tout noir »,
// « le tangram hyper foncé », « pour les grenouilles c'est pas top », « pour
// les voitures un peu foncé ». La pénalité de saturation n'avait pas de
// plafond : sur un aplat franc elle retranchait plus de cent dix, et le rouge,
// le bleu et l'orange tombaient EXACTEMENT sur le même 25.
test('AUCUN APLAT FRANC NE SORT EN NOIR DU MODE NIVEAUX DE GRIS', () => {
    const francs = {
        'bleu Scratch': [76, 151, 255], 'jaune Scratch': [255, 171, 25],
        'jaune événement': [255, 191, 0], 'rouge vif': [229, 57, 53],
        'vert vif': [67, 160, 71], 'bleu vif': [30, 136, 229],
        'orange': [245, 124, 0]
    };
    const gris = {};
    for (const [nom, rvb] of Object.entries(francs)) {
        const g = encre(rvb, 'gris')[0];
        // 70 : au-dessous, un texte noir posé dessus ne se lit plus, et l'aplat
        // se confond avec le trait qui l'entoure.
        assert.ok(g >= 70, `${nom} sort à ${g} — c'est du noir`);
        gris[nom] = g;
    }
    // Et les trois qui se confondaient ne se confondent plus.
    const trois = [gris['rouge vif'], gris['bleu vif'], gris['orange']];
    assert.equal(new Set(trois).size, 3, `rouge, bleu et orange : ${trois.join(', ')}`);
});

// L'AUTRE MOITIÉ DU CONTRAT, celle que le filtre tenait déjà : une encre
// traverse sans bouger, et deux pastels de même clarté restent distincts.
test('le filtre ne touche ni aux gris ni au texte, et sépare toujours les pastels', () => {
    for (const neutre of [[150, 150, 150], [255, 255, 255], [90, 90, 90], [40, 40, 40]]) {
        assert.equal(encre(neutre, 'gris')[0], neutre[0],
            `le gris ${neutre[0]} ne doit pas bouger`);
    }
    // L'encre du texte (26, 32, 44) n'est pas tout à fait neutre — un soupçon
    // de bleu —, et elle doit rester noire : c'est elle qui se pose SUR les
    // aplats qu'on vient d'éclaircir.
    assert.ok(encre([26, 32, 44], 'gris')[0] <= 30, 'le texte doit rester noir');
    // Les deux exemples du commentaire d'origine : un jaune et un vert de même
    // clarté, qu'une luminance nue rendrait identiques.
    const jaune = encre([253, 224, 160], 'gris')[0];
    const vert = encre([200, 236, 218], 'gris')[0];
    assert.ok(Math.abs(jaune - vert) >= 15,
        `pastels confondus : ${jaune} et ${vert}`);
});

// Rémy : « le thalès bugge ». Le « Or » et le « Donc » d'une rangée
// s'imprimaient par-dessus la rangée suivante : sur trois colonnes d'un
// parcours, l'emplacement mesurait 83,1 mm et le bloc en demandait 113.
test('la rédaction de Thalès déclare le plancher qu\'elle ne peut pas franchir', () => {
    const rendu = RENDUS['thales-redaction'];
    // 9 mm d'énoncé replié + 24 de figure + 2 d'écart + 28,5 de bandeaux
    // + 9 lignes à 5,5 mm : le compte est de 113.
    assert.ok(Number(rendu.hauteurMin) >= 113,
        `hauteurMin vaut ${rendu.hauteurMin}, il en faut 113`);
});

// LE PDF ÉCRIVAIT « pi » ET « 10^4 ». Rémy, sur la feuille du disque :
// « Périmètre exact = 16pi cm », sur le chapitre qui apprend à écrire 25π.
// Les polices standard d'un PDF n'ont ni π ni les exposants au-delà de ³ ; on
// les translittérait. Ils sortent maintenant de la ligne pour être DESSINÉS,
// comme le « à peu près égal » l'est depuis toujours.
test('π ET LES EXPOSANTS SORTENT DE LA LIGNE POUR ÊTRE DESSINÉS', () => {
    const m = morceauxLigne('Aire = 25π cm² et 10⁻³', false);
    assert.ok(m.some(x => x.pi), `π reste dans le texte : ${JSON.stringify(m)}`);
    const hauts = m.filter(x => x.haut).map(x => x.haut);
    assert.deepEqual(hauts, ['²', '⁻³'], `exposants mal découpés : ${JSON.stringify(hauts)}`);
    // Et le reste du texte est intact, sans π ni exposant qui traîne.
    const texte = m.filter(x => x.texte !== undefined).map(x => x.texte).join('');
    assert.equal(texte, 'Aire = 25 cm et 10');
});

// La couronne des minutes d'une pendule demande un cadran, pas un timbre : à
// cinq par ligne le rayon tombe à 8,5 mm et les « 5, 10, 15… » s'écrivent en
// 1,3 mm, par-dessus les heures.
test('la pendule ne porte ses minutes que si elles se lisent', () => {
    const geo = RENDUS.horloge;
    assert.ok(geo, 'le rendu de la pendule doit exister');
    // Le rendu se plafonne à quatre colonnes, et le descripteur en demande cinq
    // (revue du 7 septembre) : c'est ce cas-là qu'il fallait rendre lisible.
    assert.equal(geo.disposition.maxCols, 4);
    const heure = exercices.find(e => e.printable === 'horloge');
    assert.equal(heure.colonnesPapier, 5, 'Rémy en veut cinq, on ne touche pas au compte');
});

// Rémy, sur le PDF : « Septembre », « Novembre », « Décembre » et « Vendredi »
// mordaient sur la colonne voisine, et un tiers de page restait blanc sous
// chaque rangée de tableaux.
test('le tableau à double entrée règle sa hauteur sur ses lignes', () => {
    const p = RENDUS['tableau-croise'].proportions;
    assert.equal(typeof p, 'function', 'la proportion doit suivre les grilles tirées');
    const petit = p([{ meta: { R: 2 } }, { meta: { R: 2 } }]).h;
    const grand = p([{ meta: { R: 7 } }]).h;
    assert.ok(grand > petit, `${grand} devrait dépasser ${petit}`);
    assert.ok(petit >= 0.45 && grand <= 1, `hors bornes : ${petit} et ${grand}`);
});
