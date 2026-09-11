// La rédaction de Thalès : « Je sais que… Or… Donc… »

import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { sourceDesFiches } from './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { getExerciseById } from '../js/data/catalog.js';
import { getGenerator, generateurDeFiche, aUneFichePapier } from '../js/core/registry.js';
import { LIGNES_CADRE } from '../js/core/generators/thalesRedactionFiche.js';
import { figureThalesElements, figureThalesSvg } from '../js/core/generators/thales.js';
import { creerThales, egaliteThales } from '../js/core/thales.js';
import {
    PETITS, GRANDS, RESTES, ETIQUETTES, canon, verifierEgalite, hypotheses,
    isolements, trio, calculEcrit, redactionComplete, egaliteChiffree, chiffrer,
    verifierChiffres
} from '../js/core/thalesRedaction.js';

test('L\'ÉGALITÉ SE TAPE, ET ON NE LUI IMPOSE NI ORDRE NI SENS', () => {
    // Rémy : « il faudrait aussi pouvoir taper l'égalité ». Un élève qui écrit
    // les trois rapports dans un autre ordre a compris exactement la même
    // chose ; les lui refuser lui apprendrait à recopier.
    assert.equal(verifierEgalite(['AD', 'AC', 'AE', 'AB', 'DE', 'BC']).ok, true);
    assert.equal(verifierEgalite(['AE', 'AB', 'DE', 'BC', 'AD', 'AC']).ok, true);
    assert.equal(verifierEgalite(['DE', 'BC', 'AD', 'AC', 'AE', 'AB']).ok, true);
    // Retournée en entier, c'est la même égalité.
    const inverse = verifierEgalite(['AC', 'AD', 'AB', 'AE', 'BC', 'DE']);
    assert.equal(inverse.ok, true);
    assert.equal(inverse.sens, -1);
    // UN SEGMENT SE LIT DANS LES DEUX SENS : [AD] et [DA] sont le même.
    assert.equal(verifierEgalite(['DA', 'CA', 'EA', 'BA', 'ED', 'CB']).ok, true);
    // Et la casse ou les espaces ne sont pas des fautes de mathématiques.
    assert.equal(verifierEgalite([' ad ', 'ac', 'ae', 'ab', 'de', 'bc']).ok, true);
});

test('CHAQUE REFUS NOMME LA CONFUSION, il ne dit pas seulement « non »', () => {
    // C'est ce qui permet au carnet d'erreurs de dire à l'élève ce qu'il a
    // fait. Les quatre fautes ordinaires, une par une.
    const reste = verifierEgalite(['AD', 'CD', 'AE', 'BE', 'DE', 'BC']);
    assert.equal(reste.ok, false);
    assert.match(reste.raison, /RESTE/);

    const envers = verifierEgalite(['AD', 'AC', 'AB', 'AE', 'DE', 'BC']);
    assert.equal(envers.ok, false);
    assert.match(envers.raison, /envers/);

    const melange = verifierEgalite(['AD', 'AE', 'AC', 'AB', 'DE', 'BC']);
    assert.equal(melange.ok, false);
    assert.match(melange.raison, /deux droites entre elles/);

    const deuxFois = verifierEgalite(['AD', 'AC', 'AD', 'AC', 'DE', 'BC']);
    assert.equal(deuxFois.ok, false);
    assert.match(deuxFois.raison, /deux fois/);

    // Mal apparié : AD avec AB au lieu de AC.
    const mal = verifierEgalite(['AD', 'AB', 'AE', 'AC', 'DE', 'BC']);
    assert.equal(mal.ok, false);
    assert.ok(mal.raison.length > 40);

    // Une case vide n'est pas une réponse, et le message le dit.
    const vide = verifierEgalite(['AD', 'AC', 'AE', '', 'DE', 'BC']);
    assert.equal(vide.ok, false);
    assert.match(vide.raison, /manque/);
});

test('LES PIÈGES SONT SUR LA TABLE, sinon l\'exercice se fait au hasard', () => {
    // Les deux « restes » sont proposés parmi les étiquettes : c'est la faute
    // qu'on traque, et elle doit être atteignable.
    RESTES.forEach(r => assert.ok(ETIQUETTES.includes(r), `${r} devrait être proposé`));
    PETITS.concat(GRANDS).forEach(x => assert.ok(ETIQUETTES.includes(x), x));
    assert.equal(new Set(ETIQUETTES).size, ETIQUETTES.length, 'une étiquette en double');
    // Et un reste n'est jamais un segment du théorème.
    RESTES.forEach(r => {
        assert.equal(PETITS.includes(r), false);
        assert.equal(GRANDS.includes(r), false);
    });
    assert.equal(canon('DA'), 'AD');
    assert.equal(canon('cb'), 'BC');
});

test('les hypothèses : deux vraies, et les fausses expliquent pourquoi', () => {
    const h = hypotheses();
    const vraies = h.filter(x => x.vrai);
    assert.equal(vraies.length, 2, 'Thalès demande DEUX choses, pas une ni trois');
    assert.ok(vraies.some(x => x.texte.includes('sécantes en A')));
    assert.ok(vraies.some(x => x.texte.includes('parallèles')));
    h.filter(x => !x.vrai).forEach(x => {
        assert.ok(x.pourquoi && x.pourquoi.length > 40, `« ${x.texte} » sans explication`);
    });
    // ET IL Y A DES PIÈGES DE DEUX SORTES : ce qui est faux, et ce qui est vrai
    // mais inutile. La seconde sorte est la plus instructive — une hypothèse
    // dont on ne se sert pas n'a rien à faire dans une démonstration.
    assert.ok(h.some(x => !x.vrai && /isocèle|alignés/.test(x.texte)));
});

test('LE PRODUIT EN CROIX : une forme juste, deux façons de se tromper de place', () => {
    for (const cherche of ['AD', 'AE', 'DE']) {
        const formes = isolements(cherche);
        assert.equal(formes.filter(f => f.juste).length, 1, cherche);
        assert.equal(new Set(formes.map(f => f.texte)).size, 3, `${cherche} : deux formes identiques`);
        formes.filter(f => !f.juste).forEach(f =>
            assert.ok(f.pourquoi && f.pourquoi.length > 40, `${cherche} : « ${f.texte} »`));
        const [a, b, c] = trio(cherche);
        assert.equal(formes.find(f => f.juste).texte, `${cherche} = ${a} × ${c} ÷ ${b}`);
    }
});

test('LE CALCUL ÉCRIT TOMBE SUR LA VRAIE LONGUEUR', () => {
    // Si la formule et la figure divergeaient, l'élève rédigerait juste et
    // serait corrigé faux.
    for (let i = 0; i < 120; i++) {
        for (const config of ['emboites', 'papillon']) {
            const f = creerThales({ config, rng: makeRng(`red-${config}-${i}`) });
            if (!f) continue;
            for (const cherche of ['AD', 'AE', 'DE']) {
                const c = calculEcrit(f, cherche);
                assert.ok(Math.abs(c.valeur - f[cherche]) < 1e-9,
                    `${cherche} : ${c.valeur} au lieu de ${f[cherche]}`);
                assert.match(c.conclusion, /cm$/);
                // Les trois longueurs du calcul sont connues, et la cherchée n'y est pas.
                assert.equal(c.chiffres.includes('undefined'), false);
                assert.equal(trio(cherche).includes(cherche), false,
                    'on ne calcule pas une longueur à partir d\'elle-même');
            }
        }
    }
});

test('LA RÉDACTION COMPLÈTE EST EN TROIS PARTIES, ligne chiffrée comprise', () => {
    // Rémy : « juste après l'égalité de fractions dans le OR, tu rajoutes une
    // ligne de fractions où on remplace par les valeurs quand on les a, et on
    // recopie le nom du côté sinon. »
    //
    // J'AVAIS LU SA PREMIÈRE CONSIGNE À L'ENVERS : son plan portait
    // « (on remplace par les valeurs <- ne le note pas) », et j'y avais lu que
    // la LIGNE ne devait pas exister. C'était l'aparté qu'il ne fallait pas
    // recopier. Ce test disait donc le contraire de ce qu'il demandait.
    const f = creerThales({ config: 'emboites', rng: makeRng('complete') });
    const r = redactionComplete(f, 'AD');
    assert.deepEqual(r.map(p => p.titre), ['Je sais que', 'Or', 'Donc']);
    assert.equal(r[0].lignes.length, 2);
    assert.ok(r[1].lignes.includes(egaliteThales()));
    // LE « OR » PORTE DEUX ÉGALITÉS : celle du cours, puis la même chiffrée.
    assert.equal(r[1].lignes.length, 3);
    assert.equal(r[1].lignes[2], egaliteChiffree(f, 'AD').texte);
    assert.equal(r[2].lignes.length, 3, 'isoler, calculer, conclure');
    // La conclusion porte son unité : sans elle, ce n'est pas une longueur.
    assert.match(r[2].lignes[2], /cm/);
});

test('LA LIGNE CHIFFRÉE : les longueurs données deviennent des nombres, les autres non', () => {
    for (const config of ['emboites', 'papillon']) {
        for (let i = 0; i < 40; i++) {
            const f = creerThales({ config, rng: makeRng(`chif-${config}-${i}`) });
            if (!f) continue;
            for (const cherche of ['AD', 'AE', 'DE']) {
                const connues = new Set(trio(cherche));
                const eg = ['AD', 'AC', 'AE', 'AB', 'DE', 'BC'];
                const ligne = chiffrer(f, cherche, eg);
                eg.forEach((nom, k) => {
                    if (connues.has(nom)) {
                        assert.match(ligne[k], /^[\d, ]+$/,
                            `${nom} est donnée : elle doit devenir un nombre`);
                    } else {
                        assert.equal(ligne[k], nom, `${nom} est inconnue : son nom reste`);
                    }
                });
                // LA LONGUEUR CHERCHÉE N'EST JAMAIS CHIFFRÉE : ce serait donner
                // la réponse dans l'énoncé de la démonstration.
                assert.equal(ligne[eg.indexOf(cherche)], cherche);
            }
        }
    }
});

test('LA LIGNE CHIFFRÉE SUIT L\'ÉGALITÉ DE L\'ÉLÈVE, pas la canonique', () => {
    // Il a pu écrire les trois rapports dans un autre ordre — c'est accepté, et
    // c'est la même égalité. Lui présenter ensuite une ligne rangée autrement
    // serait lui dire que son écriture était fausse après l'avoir dite juste.
    const f = creerThales({ config: 'emboites', rng: makeRng('ordre') });
    const sien = ['DE', 'BC', 'AD', 'AC', 'AE', 'AB'];
    const ligne = chiffrer(f, 'DE', sien);
    assert.equal(ligne[0], 'DE');
    assert.equal(ligne[1], String(f.BC).replace('.', ','));
    // Et la vérification accepte SA ligne.
    assert.equal(verifierChiffres(f, 'DE', sien, ligne).ok, true);
});

test('CHAQUE REFUS DE LA LIGNE CHIFFRÉE NOMME LA CONFUSION', () => {
    const f = creerThales({ config: 'emboites', rng: makeRng('refus') });
    const eg = ['AD', 'AC', 'AE', 'AB', 'DE', 'BC'];
    const juste = chiffrer(f, 'DE', eg);

    // Garder le nom d'une longueur donnée : on n'a pas lu l'énoncé.
    const garde = juste.slice(); garde[2] = 'AE';
    assert.match(verifierChiffres(f, 'DE', eg, garde).raison, /donnée dans l'énoncé/);

    // Inventer un nombre là où la longueur est inconnue : on a mesuré sur le
    // dessin, qui n'est pas à l'échelle.
    const invente = juste.slice(); invente[4] = '7';
    assert.match(verifierChiffres(f, 'DE', eg, invente).raison, /On ne connaît pas DE/);

    // Le mauvais nombre : on a lu la mauvaise cote.
    const faux = juste.slice(); faux[2] = String(Number(String(f.AE)) + 1);
    assert.match(verifierChiffres(f, 'DE', eg, faux).raison, /Ce n'est pas la longueur/);

    // Une case vide n'est pas une réponse.
    const vide = juste.slice(); vide[0] = '';
    assert.match(verifierChiffres(f, 'DE', eg, vide).raison, /manque/);
});

test('l\'exercice du catalogue tient debout', () => {
    const exo = getExerciseById('geo-thales-redaction');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.activityId, 'thales-redaction');
    // La calculatrice est autorisée : Rémy l'a écrit, et la dernière ligne est
    // une division qu'on n'évalue pas.
    assert.equal(exo.calculatrice, true);
    assert.ok(exo.skills.includes('geo.thales'));
    exo.paramSchema.find(p => p.id === 'config').options
        .forEach(o => assert.ok(['melange', 'emboites', 'papillon'].includes(o.value), o.value));
});


// --- LA FICHE PAPIER ----------------------------------------------------------
//
// Rémy : « et pour l'impression, il faut aussi proposer un exercice de
// rédaction ». À l'écran l'élève choisit ses hypothèses parmi six et pose des
// étiquettes : c'est un échafaudage, fait pour être retiré. Sur la feuille il
// n'y a plus que trois cadres et des lignes.

test('LA FICHE EXISTE, avec son propre générateur', () => {
    const exo = getExerciseById('geo-thales-redaction');
    assert.equal(aUneFichePapier(exo), true, 'l\'exercice doit être imprimable');
    assert.equal((generateurDeFiche(exo) || {}).id, 'geo.thales.redaction.fiche');
    assert.equal(exo.printable, 'thales-redaction');
    // LE GÉNÉRATEUR DE LA FICHE N'EST PAS CELUI DE L'ÉCRAN, et c'est voulu :
    // l'un rend des questions, l'autre une page à remplir.
    assert.ok(getGenerator('geo.thales.redaction.fiche'));
});

test('LA FIGURE DE LA FICHE NE PORTE QUE LES LONGUEURS DONNÉES', () => {
    // Y écrire aussi celle qu'on cherche répondrait à la question ; n'en écrire
    // aucune la rendrait insoluble.
    const gen = getGenerator('geo.thales.redaction.fiche');
    for (let i = 0; i < 40; i++) {
        const it = gen.generate({}, { rng: makeRng(`fiche-${i}`) });
        if (!it) continue;
        const m = it.meta;
        assert.equal(m.donnees.length, 3, 'trois longueurs données');
        assert.equal(m.donnees.includes(m.cherche), false, 'la longueur cherchée n\'est pas donnée');
        // Les cotes tracées sont un sous-ensemble des données : un segment trop
        // court ne porte pas sa cote (elle se poserait sur les lettres).
        m.figure.cotes.forEach(c => {
            // La cote porte la MESURE (« 12 cm »), convention du dessin
            // technique ; le segment qu'elle mesure est dans `nom`.
            assert.ok(m.donnees.includes(c.nom), `${c.nom} est coté sans être donné`);
            assert.match(c.texte, /^\d[\d,]* cm$/, `cote « ${c.texte} » sans son unité`);
        });
        // Et l'énoncé nomme les trois, plus la cherchée.
        m.donnees.forEach(n => assert.ok(m.enonce.includes(n), `${n} absent de l'énoncé`));
        assert.ok(m.enonce.includes(`Calcule ${m.cherche}`));
    }
});

test('LA CORRECTION DE LA FICHE EST LA RÉDACTION ENTIÈRE', () => {
    // La feuille de solutions ne donne pas le nombre : elle redonne les trois
    // parties mot pour mot, parce que c'est la rédaction qu'on corrige.
    const gen = getGenerator('geo.thales.redaction.fiche');
    const it = gen.generate({}, { rng: makeRng('corrige') });
    assert.deepEqual(it.meta.redaction.map(b => b.titre), ['Je sais que', 'Or', 'Donc']);

    // LE CADRE DE L'ÉLÈVE ET LE CADRE DU CORRIGÉ NE SE MESURENT PAS PAREIL, et
    // c'est le « Donc » qui l'a montré. Rémy : « pour le DONC il suffit d'une
    // ligne ». Sur une copie, oui : « AD = (4 × 10) ÷ 8 = 5 cm » tient sur une
    // ligne. Mais la feuille de SOLUTIONS écrit la démonstration en trois temps
    // — la formule isolée, les nombres remplacés, la conclusion avec l'unité —
    // parce que c'est ce qu'on veut faire relire. Le cadre du corrigé se mesure
    // donc sur ce qu'il contient ; celui de l'élève sur la place qu'on lui
    // laisse pour écrire.
    const aEcrire = { 'Je sais que': LIGNES_CADRE.sais, Or: LIGNES_CADRE.or, Donc: LIGNES_CADRE.donc };
    assert.deepEqual(aEcrire, { 'Je sais que': 3, Or: 5, Donc: 1 },
        'les comptes de lignes de Rémy ont changé');
    // Le « Je sais que » et le « Or » accueillent la solution telle quelle : ce
    // sont les deux cadres où la copie et le corrigé disent la même chose.
    const par = Object.fromEntries(it.meta.redaction.map(b => [b.titre, b.lignes.length]));
    assert.ok(par['Je sais que'] <= aEcrire['Je sais que']);
    // Le « Or » compte une égalité de fractions pour deux interlignes : trois
    // lignes de texte, cinq d'écriture.
    assert.equal(par.Or, 3);
    // Et le « Donc » déborde volontairement du cadre de l'élève : c'est
    // `geoThalesRedaction` qui donne au corrigé la hauteur qu'il lui faut.
    assert.ok(par.Donc > aEcrire.Donc);
    // Le rendu vit désormais dans `js/ui/fiches/theoremes.js` : on lit tout le
    // dossier, pour que ce test ne dépende pas de la famille qui l'héberge.
    const src = sourceDesFiches();
    assert.match(src, /solution \? lignesDuCorrige\(c\.titre\) : LIGNES_CADRE_Q\[c\.cle\]/,
        'le corrigé ne se mesure plus sur son contenu');
    // Et la dernière ligne conclut, avec l'unité.
    const donc = it.meta.redaction[2].lignes;
    assert.match(donc[donc.length - 1], /cm$/);
    assert.equal(it.answer, donc[donc.length - 1]);
});

test('LA FIGURE DE L\'ÉCRAN ET CELLE DU PAPIER SONT LA MÊME', () => {
    // Le placement d'une cote coûte cher — deux côtés, sept écarts, un score qui
    // pèse le dégagement. L'écrire deux fois aurait donné deux figures qui
    // divergent au premier réglage. Le SVG se construit donc à partir des mêmes
    // éléments que le PDF, et ce test le vérifie : chaque coordonnée du dessin
    // se retrouve dans le texte SVG.
    const f = creerThales({ config: 'emboites', rng: makeRng('meme') });
    const e = figureThalesElements(f, ['AD', 'AC', 'AB']);
    const svg = figureThalesSvg(f, ['AD', 'AC', 'AB']);
    assert.equal(e.traits.length, 6);
    assert.equal(e.noms.length, 5);
    e.noms.forEach(n => {
        assert.ok(svg.includes(`>${n.texte}</text>`), `${n.texte} absent du SVG`);
        assert.ok(svg.includes(`x="${n.x.toFixed(1)}"`), `${n.texte} n'est pas à sa place`);
    });
    e.cotes.forEach(c => {
        assert.ok(svg.includes(`>${c.texte}</text>`), `${c.texte} absent du SVG`);
        assert.ok(svg.includes(`rotate(${c.angle.toFixed(1)}`), `${c.texte} n'a pas son angle`);
    });
    assert.ok(svg.includes(`viewBox="${e.vue.x0.toFixed(1)} ${e.vue.y0.toFixed(1)}`));
});

// --- LES SIX CASES SE TOUCHENT ---------------------------------------------
//
// Rémy, capture d'un téléphone à l'appui : « Quand on clique sur le téléphone
// ça ouvre le clavier alors que là on pourrait juste cliquer et appuyer sur la
// longueur ».
//
// Les cases étaient des champs de saisie. Sur un téléphone, toucher un champ
// ouvre le clavier du système, qui recouvre la moitié basse de l'écran — donc
// les huit étiquettes qu'il faut choisir ET le bouton « Vérifier l'égalité ».
// Le clavier cachait la réponse qu'on venait lui demander.
//
// Un bouton, lui, n'ouvre aucun clavier et reçoit quand même les touches d'un
// vrai clavier : « il faudrait aussi pouvoir taper l'égalité » — l'autre
// demande de Rémy, plus ancienne — tient toujours au bureau.
test('AUCUNE CASE DE L\'ÉGALITÉ N\'EST UN CHAMP DE SAISIE', () => {
    const src = readFileSync(new URL('../js/games/thalesRedaction.js', import.meta.url), 'utf8');

    // La case de l'égalité : un bouton, et rien d'autre.
    const trou = src.slice(src.indexOf('    trouHtml('), src.indexOf('    htmlDonc()'));
    assert.ok(trou.length > 100, 'trouHtml() n\'a pas été retrouvé');
    assert.match(trou, /<button type="button" class="thr-case/);
    assert.ok(!/<input/.test(trou), 'la case de l\'égalité est encore un champ');
    assert.ok(!/data-case="\$\{[^}]*\}"[^>]*inputmode/.test(src),
        'une case de l\'égalité porte encore un inputmode');

    // Aucun <input data-case> nulle part : c'est la garantie qui compte, le
    // clavier du téléphone ne s'ouvre que sur un champ.
    assert.ok(!/<input[^>]*data-case/.test(src), 'il reste un champ data-case');

    // Le clavier d'un vrai ordinateur, lui, reste servi.
    assert.match(src, /el\.onkeydown/, 'les cases n\'écoutent plus le clavier');
    assert.match(src, /\[a-zA-Z\]/, 'les lettres tapées ne sont plus lues');

    // Et la consigne dit le geste qu'on attend.
    assert.match(src, /touche une case, puis la longueur/,
        'la consigne parle encore de taper');
});

// --- LA MISE EN PAGE DU POLYCOPIÉ -------------------------------------------
//
// Rémy : « De base sur le poly mets 3 colonnes par défaut ou la possibilité de
// mettre la rédaction à droite de la figure. »
//
// Son « ou » est un vrai ou, et c'est le point. Une colonne de trois fait
// 89 mm de large : la rédaction posée à droite n'y disposerait que de 44 mm
// pour écrire « Les droites (DE) et (CB) sont parallèles » à la main. Les deux
// mises en page répondent au même problème — la feuille à une seule
// démonstration gaspillait la page — mais ne se cumulent pas. Le choix se fait
// donc sur la PLACE, et le professeur peut forcer l'une ou l'autre.
test('LE POLY TIENT TROIS DÉMONSTRATIONS, ET LA RÉDACTION SE RANGE OÙ IL Y A LA PLACE', () => {
    const src = sourceDesFiches();
    const rendu = src.slice(src.indexOf("    'thales-redaction': {"),
        src.indexOf("    'thales-redaction': {") + 1800);

    // Trois colonnes par défaut.
    assert.match(rendu, /disposition: \{ cols: 3, rows: 1/, 'le poly n\'est plus à trois colonnes');
    assert.match(rendu, /parLigneDefaut: 3/);

    // La bascule se décide sur la largeur restante, pas au hasard.
    const geo = src.slice(src.indexOf('function geoThalesRedaction'),
        src.indexOf('LA DOUBLE FLÈCHE D\'UNE COTE'));
    assert.match(geo, /W_ECRITURE = 70/, 'la largeur minimale d\'écriture a disparu');
    assert.match(geo, /m\.mise === 'droite' \? true/, 'on ne peut plus forcer « à droite »');
    assert.match(geo, /m\.mise === 'dessous' \? false/, 'on ne peut plus forcer « dessous »');

    // Et l'énoncé se plie à la largeur du bloc : sur trois colonnes, écrit d'un
    // seul trait, il sortait du bloc pour se poser sur la figure du voisin.
    assert.match(geo, /couperEnLignes\(m\.enonce/, 'l\'énoncé ne se plie plus');
    assert.ok(!/doc\.text\(pourPdf\(m\.enonce\)/.test(src), 'le PDF écrit encore l\'énoncé d\'un trait');

    // Le réglage existe, avec les trois valeurs, et c'est « selon la place » par défaut.
    const gen = getGenerator('geo.thales.redaction.fiche');
    const mise = gen.params.find(p => p.id === 'mise');
    assert.ok(mise, 'le réglage « Où va la rédaction » n\'existe pas');
    assert.equal(mise.default, 'auto');
    assert.deepEqual(mise.options.map(o => o.value), ['auto', 'droite', 'dessous']);
    // Ce qui est demandé se retrouve sur l'item : c'est lui que la feuille lit.
    ['auto', 'droite', 'dessous'].forEach(v => {
        assert.equal(gen.generate({ mise: v }, { rng: makeRng(`m${v}`) }).meta.mise, v);
    });
    // Une valeur inconnue retombe sur l'automatique, jamais sur rien.
    assert.equal(gen.generate({ mise: 'bidon' }, { rng: makeRng('mx') }).meta.mise, 'auto');
});
