// LES FENÊTRES ÉTROITES SUR UN ÉCRAN D'ORDINATEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture du panneau de réglages à l'appui :
//
//   « sur le réglages des exercices c'est écrasé d'ailleurs pourquoi sur ordi
//     la fenetre des réglages et si étroite et sur ordi, parfois certains
//     modales sont étroites, c'est dommage »
//
// DEUX DEMANDES, ET LA SECONDE EST LA PLUS IMPORTANTE. « parfois certains
// modales » : ce n'est pas le défaut d'un panneau, c'est une habitude. Elle
// était déjà venue une fois, sur « Mode & barème » — voir
// `tests/fenetreModeEtBareme.test.mjs`, qui garde CETTE fenêtre-là. Une épreuve
// par fenêtre est une épreuve qu'on oublie à la fenêtre suivante : celle-ci
// garde donc la RÈGLE.
//
// ── CE QUI A ÉTÉ MESURÉ (`tools/modalesEtroites.mjs`, fenêtre de 1440 px) ───
//
//   réglages d'un exercice   430 px (30 % de la fenêtre)
//   paramètres d'affichage   350 px de large, 874 px de HAUT — il remplissait
//                            l'écran par le bas faute de place sur les côtés,
//                            « Jamais confondu avec x » sur trois lignes
//
// Et toutes les variantes de panneau posaient une largeur SÈCHE — `400px`,
// `500px`, `800px` —, qui déborde d'un téléphone de 360 px et ne profite
// jamais d'un grand écran.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle, declare, valeurDe } from './aidesCss.mjs';

const COMPOSANTS = lireFeuille('css/components.css');
const MODULES = lireFeuille('css/modules.css');

test('AUCUN PANNEAU DE FENÊTRE N\'A DE LARGEUR SÈCHE', () => {
    // LA RÈGLE, ET ELLE TIENT EN UNE LIGNE : une largeur de panneau porte
    // TOUJOURS deux termes — ce qu'on veut, et ce que la vitre permet.
    //
    // ON LES CHERCHE DANS LA FEUILLE plutôt que de les énumérer ici : une
    // variante ajoutée demain sera mesurée sans qu'on y pense, et c'est tout
    // l'objet de cette épreuve.
    const variantes = [...COMPOSANTS.matchAll(/\.modal-panel[\w-]*\s*\{([^}]*)\}/g)];
    assert.ok(variantes.length >= 5,
        `seulement ${variantes.length} variantes trouvées : le motif ne les voit plus`);
    for (const [, corps] of variantes) {
        const w = valeurDe(corps, 'width');
        if (!w) continue;
        assert.match(w, /min\(/,
            `une largeur sèche est revenue : « width: ${w} »`);
        // LE SECOND TERME EST CELUI QUI RETIENT SUR UN PETIT ÉCRAN. Sans lui,
        // `min(400px, …)` ne vaudrait pas mieux que `400px`.
        assert.match(w, /100vw|vw\)/,
            `« width: ${w} » ne sait pas ce que la vitre permet`);
    }
});

test('LE PANNEAU DES RÉGLAGES D\'UN EXERCICE RESPIRE', () => {
    // 430 PX DANS 1440 : la borne venait d'un défaut REL — « un panneau de
    // 680 px pour trois réglages laissait une trentaine de centimètres de vide
    // entre chaque libellé et son champ ». Le remède était bon, l'outil était
    // le mauvais : on avait borné le PANNEAU alors que c'est la LIGNE qui
    // s'étirait. Le panneau, lui, porte aussi la frise des marches, l'aperçu
    // d'une question et l'éditeur de zones.
    const corps = corpsDeLaRegle(MODULES,
        'html:not(.volet-atelier) #student-config-modal .modal-panel-sm-left',
        { ou: 'css/modules.css' });
    const m = /min\((\d+)px,\s*(\d+)vw\)/.exec(valeurDe(corps, 'width') || '');
    assert.ok(m, 'la fenêtre des réglages n\'a plus de largeur à deux termes');
    assert.ok(Number(m[1]) >= 600,
        `${m[1]} px ne suffisent pas à la frise des marches et à son aperçu`);

    // ET LA LIGNE EST BORNÉE, elle. C'est la correction de l'ancien défaut,
    // posée au bon endroit cette fois — la même que pour « Mode & barème ».
    const ligne = corpsDeLaRegle(MODULES,
        '#student-config-modal .cfg-field:not(.cfg-field--wide):not(.cfg-field--long)',
        { ou: 'css/modules.css' });
    assert.ok(declare(ligne, 'max-width'),
        'le libellé et son champ doivent rester côte à côte');

    // ET LE VOLET DE L'ATELIER GAGNE — c'est le `html:not(.volet-atelier)` du
    // sélecteur ci-dessus, et `corpsDeLaRegle` JETTE s'il disparaît : la règle
    // cherchée porte son nom en entier. Un sélecteur d'IDENTIFIANT (1,1,0) bat
    // sans le vouloir la règle du volet (0,3,1), qui veut que la fenêtre
    // remplisse le cadre, et le panneau restait une colonne perdue au milieu
    // d'un cadre fait pour elle. La même précaution est écrite pour
    // `#path-policy-modal` ; elle manquait ici.
    //
    // ON NE REFUSE PAS TOUTE RÈGLE SANS GARDE sur ce panneau : les autres lui
    // posent une HAUTEUR — `max-height`, `overflow` —, et une feuille de
    // téléphone lui met même `width: 100% !important`, ce qui est juste. C'est
    // la largeur D'ORDINATEUR qui doit s'effacer devant le volet.
    assert.ok(MODULES.includes('html:not(.volet-atelier) #student-config-modal'),
        'la règle de largeur doit s\'effacer devant le volet de l\'atelier');
});

test('UN RÉGLAGE À DEUX ÉTATS EST UN INTERRUPTEUR, PAS DEUX BOUTONS', () => {
    // RÉMY, après cinq maquettes : « j'aime bien le C » — « le mot dans la
    // piste », OUI et NON écrits DANS la commande, le mot visible étant celui
    // de l'état.
    //
    // MESURÉ AVANT : les deux boutons faisaient 67 px à eux deux — 33 chacun —
    // pour 38 de haut, là où une cible tactile se veut de 44. APRÈS : 84 × 44
    // pour l'interrupteur seul, et le contraste du mot, relevé sur les PIXELS
    // (`tools/tmp/voirBascule.mjs`), vaut 6,29 allumé, 5,24 éteint, 5,49 en
    // thème sombre — au-dessus des 4,5 exigés dans les trois cas.
    // LE NOM EST `cfg-inter`, PAS `cfg-bascule` : cette dernière classe existe
    // depuis longtemps pour la frise des zones (`configUI.js`, « Comment l'élève
    // répond ici »). Écrite une seconde fois ici, elle aurait donné à la frise
    // la piste et la pastille de l'interrupteur — et réciproquement. Trouvé par
    // l'épreuve, qui lisait la règle de la frise en croyant lire la nôtre.
    const CFG = lireFeuille('js/games/configUI.js');
    // LES DEUX BOUTONS NE DOIVENT PAS REVENIR. On cherche leur classe dans
    // TOUT le dépôt servi, pas seulement là où on l'a retirée : trois autres
    // fichiers l'écoutaient pour relire les réglages, et une classe oubliée
    // chez eux est un panneau qui ne se met plus à jour, en silence.
    const SERVIS = ['js/games/configUI.js', 'js/ui/panneauContenu.js',
        'js/ui/atelier.js', 'js/ui/printParcours.js', 'css/modules.css', 'css/ui.css']
        .map(f => [f, lireFeuille(f)]);
    for (const [nom, texte] of SERVIS) {
        // ON REFUSE LE NOM, PAS UNE DE SES ÉCRITURES. Premier jet :
        // `/\.cfg-on['\"\s,{:]/` — il exigeait un caractère précis derrière, et
        // `class="cfg-on${…}"`, écrit dans un gabarit, lui échappait.
        // `epreuveTombe` l'a dit : « CETTE ÉPREUVE NE GARDE RIEN ».
        assert.ok(!/cfg-on(?![a-z0-9])/i.test(texte.replace(/\/\*[\s\S]*?\*\//g, '')),
            `les deux boutons « Oui / Non » sont revenus dans ${nom}`);
    }
    // ET LES TROIS ÉCOUTEURS SUIVENT. C'est le chaînon qu'on oublie : le
    // panneau de contenu, l'atelier et la fiche du parcours relisent les
    // réglages au clic sur la commande. Renommer la commande sans les prévenir
    // les rend muets sans rien casser de visible.
    const ecoutent = SERVIS.filter(([f]) => f !== 'js/games/configUI.js'
        && !f.startsWith('css/'))
        .filter(([, t]) => t.includes("closest('.cfg-inter')"));
    assert.equal(ecoutent.length, 3,
        `${ecoutent.length} écouteur(s) sur 3 suivent l'interrupteur`);
    // L'INTERRUPTEUR S'ANNONCE COMME UN INTERRUPTEUR. Sans `role="switch"`, un
    // lecteur d'écran dit « bouton » et ne lit jamais l'état ; les deux mots de
    // la piste, eux, sont décoratifs et masqués.
    assert.match(CFG, /role=\"switch\" aria-checked=/,
        'l\'interrupteur ne dit plus ce qu\'il est');
    assert.match(CFG, /class=\"cfg-inter-piste\" aria-hidden=\"true\"/,
        'les mots de la piste doivent être décoratifs');
    // ET IL BASCULE : il n'y a plus deux valeurs à départager, il y en a une à
    // retourner. `aria-checked` et `data-valeur` changent ENSEMBLE — le premier
    // pour qui écoute, le second pour qui enregistre.
    assert.match(CFG, /const oui = groupe\.dataset\.valeur !== 'true';/);
    assert.match(CFG, /b\.setAttribute\('aria-checked', String\(oui\)\);/);

    // LA CIBLE TACTILE EST DANS LA RÈGLE, pour TOUTES les largeurs. Elle était
    // posée dans une feuille de téléphone, donc absente sur un ordinateur — où
    // la souris pardonne, mais où une tablette ne pardonne pas.
    const bascule = corpsDeLaRegle(MODULES, '.cfg-inter', { ou: 'css/modules.css' });
    assert.equal(valeurDe(bascule, 'min-height'), '44px',
        'l\'interrupteur a perdu sa cible tactile');
    // LA PASTILLE RESTE DANS LA PISTE : 84 de piste moins deux bordures de 2
    // font 80 de contenu, moins 24 de pastille et 2 de marge, il reste 54.
    const piste = corpsDeLaRegle(MODULES, '.cfg-inter-piste', { ou: 'css/modules.css' });
    const past = corpsDeLaRegle(MODULES, '.cfg-inter-pastille', { ou: 'css/modules.css' });
    const glisse = corpsDeLaRegle(MODULES, '.cfg-inter--oui .cfg-inter-pastille',
        { ou: 'css/modules.css' });
    const nb = (s) => Number(String(s || '').replace('px', ''));
    const dedans = nb(valeurDe(piste, 'width')) - 2 * 2
        - nb(valeurDe(past, 'width')) - nb(valeurDe(past, 'left'));
    assert.equal(nb(valeurDe(glisse, 'left')), dedans,
        `la pastille glisse à ${valeurDe(glisse, 'left')} alors que la piste en laisse ${dedans}`);
});

test('ET « COMMENT TU RÉPONDS » PREND LES DEUX COLONNES', () => {
    // RÉMY, la capture suivante : « pour quoi le comment tu réponds est encore
    // écrasé ». Élargir le panneau de 430 à 720 px ne l'avait pas dégagé.
    //
    // MESURÉ : au-delà de 700 px le contenu passe en DEUX colonnes, et le
    // sous-groupe vivait dans une seule — 315 px. La grille de ses deux cartes
    // de mode, `repeat(auto-fit, minmax(150px, 1fr))`, n'en recevait que 275 :
    // « L'exercice s'adapte » et « Je définis » se posaient l'une SOUS l'autre
    // au milieu d'un panneau deux fois trop large. Après : 656 px, et les deux
    // cartes ont la même ordonnée — elles sont côte à côte.
    //
    // ON LIT LA RÈGLE QUI EXISTE DÉJÀ pour ses voisins : trois blocs y sont
    // dispensés des colonnes parce qu'ils « regagnent en hauteur ce que la
    // colonne fait économiser ». Celui-ci était du lot et n'y figurait pas.
    const bloc = /@media \(min-width: 700px\) \{([\s\S]*?)\n\}/.exec(MODULES);
    assert.ok(bloc, 'la règle des deux colonnes a disparu de css/modules.css');
    const pleine = /#student-config-content \.cfg-field--wide,[\s\S]*?grid-column: 1 \/ -1;/
        .exec(bloc[1]);
    assert.ok(pleine, 'plus personne ne traverse les deux colonnes');
    assert.match(pleine[0], /#student-config-content \.cfg-sous-groupe,/,
        '« Comment tu réponds » reste enfermé dans une colonne');
});
