// L'ATELIER DU QUOTIDIEN — ce qu'il vérifie, et ce qu'il écrit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu me fais dans le debug un atelier pour les phrases énigmes du jour
// (ça on a déjà) ».
//
// ── POURQUOI CES DEUX FONCTIONS SONT EXPORTÉES ─────────────────────────────
//
// L'atelier est un écran, et un écran ne s'éprouve pas ici. Mais deux choses
// qu'il fait n'ont rien à voir avec un écran :
//
//   · `avisSur` — les règles de la maison sur une entrée. Une règle gardée
//     seulement par un écran n'est gardée par personne : on la change six mois
//     plus tard, l'avertissement disparaît, et rien ne le dit.
//
//   · `entreeEnTexte` — le texte que Rémy colle dans `js/data/`. Ce n'est pas du
//     JSON, c'est du JAVASCRIPT : une apostrophe mal échappée casse le fichier de
//     données de toute l'application. On vérifie donc que ce qui sort se RELIT.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { avisSur, entreeEnTexte } from '../js/ui/atelierQuotidien.js';
import { LISTES, GENRES } from '../js/data/quotidien.js';

const dit = (...a) => avisSur(...a).join(' | ');

test('UNE ENTRÉE VIDE EST SIGNALÉE, DANS LES QUATRE GENRES', () => {
    // UN TEXTE VIDE N'EXISTE PAS À L'ÉCRAN, et il ne se voit pas dans une liste
    // de deux cents lignes. C'est exactement la faute trouvée dans la séance
    // « Relatifs » de Rémy : un mot aux titre et texte vides parmi seize lignes.
    for (const g of GENRES) {
        assert.match(dit(g, g === 'conseil' ? '' : { texte: '' }), /vide/,
            `un ${g} vide n'est pas signalé`);
    }
});

test('UNE CITATION SANS AUTEUR EST SIGNALÉE', () => {
    // L'écran la signerait avec rien. Et la case « attribution sûre » est un
    // sujet à part : voir `js/data/citations.js` — une phrase fausse attribuée à
    // Einstein, lue en classe, se grave dans trente têtes.
    assert.match(dit('citation', { texte: 'Les maths sont belles.', auteur: '' }), /sans auteur/);
    assert.deepEqual(avisSur('citation', { texte: 'Les maths sont belles.', auteur: 'Gauss' }), []);
});

test('UNE ÉNIGME SANS RÉPONSE, SANS INDICE OU SANS EXPLICATION EST SIGNALÉE', () => {
    const base = { texte: 'Combien de diagonales a un octogone ?', reponse: '20', indice: 'Compte par sommet.', explication: 'Huit sommets, cinq diagonales chacun, divisé par deux.' };
    assert.deepEqual(avisSur('enigme', base), []);
    assert.match(dit('enigme', { ...base, reponse: '' }), /insoluble/);
    assert.match(dit('enigme', { ...base, indice: '' }), /Pas d'indice/);
    // Rémy : « pour les énigmes, il faut quand même expliquer la réponse. »
    // C'est ce qui sépare une énigme d'une devinette.
    assert.match(dit('enigme', { ...base, explication: '' }), /explication/);
    // UNE FIGURE QUI N'EXISTE PAS N'AFFICHE RIEN, en silence.
    assert.match(dit('enigme', { ...base, figure: 'dodecaedre' }), /n'existe pas/);
});

test('UN INDICE QUI DONNE LA RÉPONSE EST SIGNALÉ — ET LES NOMBRES NE LE SONT PAS', () => {
    // LA RÈGLE D'OR, écrite en tête de `js/data/enigmes.js` : « UN INDICE QUI NE
    // DONNE PAS LA RÉPONSE. L'indice dit la PREMIÈRE CHOSE À REGARDER. »
    const avec = {
        texte: 'Que lis-tu ?', reponse: 'racine carrée',
        indice: 'Pense à la racine carrée de 16.', explication: 'Voilà.'
    };
    assert.match(dit('enigme', avec), /contient la réponse/);

    // ET VOICI CE QUI NE DOIT PAS CRIER, parce que ma première version criait
    // quatre fois sur les cent énigmes déjà écrites — toutes à tort. Une réponse
    // d'UN CHIFFRE se retrouve dans n'importe quel indice qui explique la
    // méthode : « les unités des puissances de 7 tournent : 7, 9, 3, 1 » donne le
    // CYCLE, il reste à compter jusqu'à la quatrième.
    //
    // UNE MESURE QUI CRIE QUATRE FOIS POUR RIEN NE SERA PLUS LUE. C'est la vraie
    // faute, et elle est dans la mesure, pas dans les données.
    assert.deepEqual(avisSur('enigme', {
        texte: 'Quel est le chiffre des unités de 7 × 7 × 7 × 7 ?', reponse: '1',
        indice: 'Les unités des puissances de 7 tournent : 7, 9, 3, 1.',
        explication: 'La quatrième puissance tombe sur 1.'
    }), []);
    assert.deepEqual(avisSur('enigme', {
        texte: 'Deux nombres ont pour somme 20 et pour différence 4.', reponse: '12 et 8',
        indice: 'La moitié de la somme, plus ou moins la moitié de la différence.',
        explication: '10 + 2 et 10 − 2.'
    }), []);

    // ET LE MOT COMPLET SEULEMENT : « racine » dans l'indice d'une énigme dont la
    // réponse est « racine carrée » n'est pas la réponse — c'est la moitié, donc
    // un indice.
    assert.deepEqual(avisSur('enigme', {
        texte: 'Que lis-tu ?', reponse: 'racine carrée',
        indice: 'Le mot RACINE est enfermé dans quelque chose.', explication: 'Voilà.'
    }), []);
});

test('UN TEXTE DÉJÀ DANS LA LISTE EST SIGNALÉ', () => {
    // LE MÊME TEXTE DEUX FOIS SORTIRAIT DEUX JOURS, et personne ne s'en
    // apercevrait avant de le voir revenir.
    const liste = ['Relis la question à voix haute.', 'Entoure ce qu\'on demande.'];
    assert.match(dit('conseil', 'Relis la question à voix haute.', liste), /déjà dans la liste/);
    // À LA CASSE ET AUX ESPACES PRÈS : un doublon recopié à la main ne revient
    // jamais avec exactement les mêmes blancs.
    assert.match(dit('conseil', '  relis la QUESTION à voix haute.  ', liste), /déjà dans la liste/);
    assert.deepEqual(avisSur('conseil', 'Dessine la figure.', liste), []);
});

test('LES QUATRE LISTES LIVRÉES PASSENT LEURS PROPRES RÈGLES', () => {
    // L'ÉPREUVE QUI DONNE DU PRIX AUX AUTRES. Des règles qui ne tiendraient pas
    // sur le contenu déjà livré seraient des règles qu'on apprendrait à ignorer —
    // et c'est précisément ce qui arrive à un avertisseur qui crie toujours.
    //
    // ON TOLÈRE LA LONGUEUR, ET SEULEMENT ELLE : une énigme de 208 caractères est
    // livrée (le ballon à 30 € et le groom, qui a besoin de son décor), et Rémy
    // l'a validée. Le reste — réponse manquante, indice qui donne la réponse,
    // figure inexistante, doublon — ne se tolère pas.
    const graves = [];
    for (const g of GENRES) {
        LISTES[g].forEach((e, i) => {
            avisSur(g, e, LISTES[g].filter((_, j) => j !== i))
                .filter(d => !/caractères/.test(d))
                .forEach(d => graves.push(`${g} n° ${i + 1} : ${d}`));
        });
    }
    assert.deepEqual(graves, []);
});

test('CE QUI SORT DE L\'ATELIER SE RELIT COMME DU JAVASCRIPT', () => {
    // CE N'EST PAS DU JSON, C'EST DU JAVASCRIPT : Rémy colle ce texte dans
    // `js/data/`. Une apostrophe mal échappée casserait le fichier de données de
    // toute l'application — et le message d'erreur désignerait une ligne sans
    // rapport, exactement comme l'accent grave dans un gabarit (CLAUDE.md §6).
    const relire = (texte) => new Function(`return [${texte}][0];`)();

    // UN CONSEIL EST UNE CHAÎNE, pas un objet : la liste des conseils est une
    // liste de chaînes, et rendre `{ texte: … }` obligerait à le retraduire.
    const c = relire(entreeEnTexte('conseil', 'Relis l\'énoncé à voix haute.'));
    assert.equal(typeof c, 'string');
    assert.equal(c, 'Relis l\'énoncé à voix haute.');

    // L'APOSTROPHE, LA CONTRE-OBLIQUE ET LES GUILLEMETS FRANÇAIS font l'aller-retour.
    const durs = 'L\'élève dit « c\'est faux » — et un \\ traîne par là.';
    assert.equal(relire(entreeEnTexte('conseil', durs)), durs);

    const b = relire(entreeEnTexte('blague', { texte: 'Pourquoi ? Parce qu\'il a des problèmes.', quoi: 'vocabulaire' }));
    assert.deepEqual(b, { texte: 'Pourquoi ? Parce qu\'il a des problèmes.', quoi: 'vocabulaire' });
    // UN THÈME VIDE NE S'ÉCRIT PAS : `quoi: ''` dans le fichier ferait croire à
    // un classement qui n'existe pas.
    assert.deepEqual(relire(entreeEnTexte('blague', { texte: 'Hop.', quoi: '' })), { texte: 'Hop.' });

    const ci = relire(entreeEnTexte('citation', { texte: 'Les maths sont la musique de la raison.', auteur: 'Sylvester', sur: true }));
    assert.deepEqual(ci, { texte: 'Les maths sont la musique de la raison.', auteur: 'Sylvester', sur: true });
    // `sur` S'ÉCRIT TOUJOURS, même à `false` : c'est la différence entre
    // « attribué à » et une attribution affirmée, et l'omettre revient à
    // affirmer par défaut dans un sens qu'on n'a pas choisi.
    assert.match(entreeEnTexte('citation', { texte: 'x', auteur: 'y', sur: false }), /sur: false/);

    const en = relire(entreeEnTexte('enigme', {
        texte: 'Combien ?', reponse: '15', indice: 'Compte deux fois.',
        niveau: 5, explication: 'Chaque poignée compte double.', figure: 'poignees'
    }));
    assert.deepEqual(en, {
        texte: 'Combien ?', reponse: '15', indice: 'Compte deux fois.',
        niveau: 5, explication: 'Chaque poignée compte double.', figure: 'poignees'
    });
    // LE NIVEAU EST UN NOMBRE, PAS UNE CHAÎNE : il sert à comparer, et « 5 » > 10
    // est faux en chaînes. Un `<select>` rend toujours du texte, d'où le risque.
    assert.equal(typeof en.niveau, 'number');

    // ET LA LIGNE FINIT PAR UNE VIRGULE : on la colle au milieu d'une liste.
    assert.match(entreeEnTexte('conseil', 'Hop.'), /,$/);
});

test('CE QUI SORT RESSEMBLE À CE QUI EST DÉJÀ ÉCRIT', () => {
    // UNE ENTRÉE QUI RANGE SES CHAMPS AUTREMENT SAUTE AUX YEUX COMME UNE FAUTE
    // dans un fichier qu'on relit à l'œil, deux cents lignes à la file — et l'on
    // perd une minute à comprendre qu'elle n'en est pas une. On prend donc la
    // PREMIÈRE entrée livrée de chaque genre, on la fait repasser par l'atelier,
    // et l'on exige qu'elle en ressorte dans le même ordre de champs.
    for (const g of ['blague', 'citation', 'enigme']) {
        const premiere = LISTES[g][0];
        const sortie = entreeEnTexte(g, premiere);
        const ordreSorti = [...sortie.matchAll(/([a-z]+):/g)].map(m => m[1]);
        const ordreEcrit = Object.keys(premiere).filter(k => ordreSorti.includes(k));
        assert.deepEqual(ordreSorti, ordreEcrit,
            `l'atelier réécrit un ${g} dans un autre ordre que le fichier`);
    }
});
