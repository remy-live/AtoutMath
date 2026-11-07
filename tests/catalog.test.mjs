import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices, filterByStatus, statusOf, countByStatus, STATUS, exercisesForSkill, skillsOf } from '../js/data/catalog.js';

const ex = (id, status) => (status ? { id, status } : { id });
const LOT = [ex('a'), ex('b', STATUS.VALIDE), ex('c', STATUS.TEST), ex('d', STATUS.BROUILLON)];

test('un exercice sans statut déclaré est validé', () => {
    assert.equal(statusOf({ id: 'x' }), STATUS.VALIDE);
    assert.equal(statusOf({ id: 'x', status: STATUS.TEST }), STATUS.TEST);
});

test('un élève ne voit ni les brouillons ni les exercices en test', () => {
    const vus = filterByStatus(LOT, { teacher: false }).map(e => e.id);
    assert.deepEqual(vus, ['a', 'b']);
});

test('le professeur voit aussi les exercices en test, jamais les brouillons', () => {
    const vus = filterByStatus(LOT, { teacher: true }).map(e => e.id);
    assert.deepEqual(vus, ['a', 'b', 'c']);
});

test('un filtre explicite isole un seul état, brouillon compris', () => {
    assert.deepEqual(filterByStatus(LOT, { only: STATUS.TEST }).map(e => e.id), ['c']);
    assert.deepEqual(filterByStatus(LOT, { only: STATUS.BROUILLON }).map(e => e.id), ['d']);
    assert.deepEqual(filterByStatus(LOT, { only: STATUS.VALIDE }).map(e => e.id), ['a', 'b']);
    assert.equal(filterByStatus(LOT, { only: 'tout' }).length, 2, '« tout » applique les règles de visibilité');
});

test('le comptage couvre l\'intégralité du catalogue', () => {
    const c = countByStatus(exercices);
    assert.equal(c.valide + c.test + c.brouillon, exercices.length);
    // Ce test exigeait autrefois « c.test > 0 ». Il gardait une vérité qui n'en
    // est plus une : Rémy a demandé d'ouvrir TOUS les exercices aux élèves
    // (« ouvre-les tous »), et le catalogue ne compte donc plus une seule
    // fiche en test. Le mécanisme, lui, est vérifié plus haut sur un lot
    // fabriqué — c'est là qu'il faut le vérifier, pas sur l'état du jour.
    assert.equal(c.test, 0, 'aucun exercice n\'est laissé en test');

    // ── ET LE BROUILLON SE NOMME, IL NE SE COMPTE PAS ──────────────────────
    //
    // Cette ligne exigeait zéro brouillon, ce qui était juste tant que personne
    // n'en avait demandé. Rémy en a demandé un, le 6 octobre : « désactive le
    // jardin ». Desserrer la règle en « au plus quelques-uns » aurait rendu
    // l'épreuve muette — un exercice oublié au brouillon serait reparti chez
    // les élèves sans que rien ne le dise, et c'est TOUT ce qu'elle garde.
    //
    // On NOMME donc les désactivations voulues. Une de plus fait tomber
    // l'épreuve, et celui qui la rallume doit écrire ici POURQUOI elle est là.
    const ETEINTS_EXPRES = ['voc-jardin'];
    const brouillons = exercices.filter(e => statusOf(e) === STATUS.BROUILLON)
        .map(e => e.id).sort();
    assert.deepEqual(brouillons, [...ETEINTS_EXPRES].sort(),
        'un exercice est au brouillon sans que personne l\'ait décidé — ou une '
        + 'désactivation voulue n\'est pas nommée ici');
});

test('aucun exercice ne porte un statut inconnu', () => {
    const connus = Object.values(STATUS);
    const fautifs = exercices.filter(e => e.status && !connus.includes(e.status));
    assert.deepEqual(fautifs.map(e => e.id), []);
});

test('chaque exercice est rangé dans un chemin entièrement nommé', () => {
    // Un segment `undefined` (constante TAGS mal orthographiée) crée un
    // dossier « undefined » dans le catalogue — c'est arrivé, un élève l'a vu.
    const fautifs = exercices.filter(e => {
        const c = e.tags && e.tags.chemin;
        return !Array.isArray(c) || c.length === 0
            || c.some(s => typeof s !== 'string' || !s.trim());
    });
    assert.deepEqual(fautifs.map(e => e.id), []);
});

// --- La fiche papier : une seule question, une seule réponse ------------------

test('un exercice qui déclare un générateur de fiche a bien une fiche', async () => {
    const { generateurDeFiche, aUneFichePapier } = await import('../js/core/registry.js');
    await import('../js/core/activities/index.js');
    for (const exo of exercices) {
        if (!exo.printGeneratorId) continue;
        const g = generateurDeFiche(exo);
        assert.ok(g, `${exo.id} : générateur de fiche « ${exo.printGeneratorId} » introuvable`);
        // Le bouton « travailler sur papier » se décide avec cette fonction :
        // sans elle, un exercice sans `generatorId` — parce qu'il n'existe qu'à
        // l'écran — n'aurait jamais proposé sa fiche.
        assert.ok(aUneFichePapier(exo), `${exo.id} : sa fiche ne serait pas proposée`);
    }
});

test('tout exercice imprimable sait produire des items pour sa fiche', async () => {
    const { generateurDeFiche, aUneFichePapier } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');
    for (const exo of exercices) {
        if (!aUneFichePapier(exo)) continue;
        const g = generateurDeFiche(exo);
        if (!g) continue;                       // grille dessinée sans générateur propre
        const reglages = { ...(exo.params || {}), ...(exo.printParams || {}) };
        for (let i = 0; i < 3; i++) {
            const item = g.generate(reglages, { rng: makeRng(`${exo.id}#${i}`), index: i });
            assert.ok(item && item.prompt, `${exo.id} : item sans énoncé`);
            assert.ok(item.answer !== undefined && item.answer !== null,
                `${exo.id} : item sans réponse — la page des solutions serait vide`);
        }
    }
});

test('un générateur qui écrit des fractions le déclare', async () => {
    // SUR LE PAPIER, UNE FRACTION S'ÉCRIT EN COLONNE — numérateur sur
    // dénominateur, séparés d'un trait. La barre oblique est une commodité
    // d'écran, et une feuille qui l'imprime enseigne le contraire du cours.
    // Le rendu sait empiler ; encore faut-il qu'il sache qu'il y a une
    // fraction, et c'est ce drapeau qui le lui dit.
    const { generateurDeFiche } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');
    const fautifs = [];
    for (const exo of exercices) {
        const g = generateurDeFiche(exo);
        if (!g || !g.ecrit || g.fractions) continue;
        const reglages = { ...(exo.params || {}), ...(exo.printParams || {}) };
        for (let i = 0; i < 25; i++) {
            let it;
            try { it = g.generate(reglages, { rng: makeRng(`fr_${exo.id}_${i}`), index: i }); }
            catch { break; }
            const texte = (it.prompt && (it.prompt.papier || it.prompt.text)) || '';
            // « 3/4 » entre deux chiffres : c'est une fraction, pas une date.
            if (/\d\s*\/\s*\d/.test(texte)) { fautifs.push(`${g.id} : « ${texte} »`); break; }
        }
    }
    assert.deepEqual(fautifs, []);
});

test('AUCUN ÉNONCÉ N\'AFFICHE UNE FRACTION À LA BARRE OBLIQUE', async () => {
    // ─────────────────────────────────────────────────────────────────────────
    //
    // RÉMY : « ecris toujours les fractions en colonne ». TOUJOURS — pas « sur
    // le papier », et pas « dans cet exercice-là ».
    //
    // L'épreuve juste au-dessus garde la FEUILLE ; celle-ci garde l'ÉCRAN, qui
    // est le support le plus vu. Les deux sont nécessaires et aucune ne
    // remplace l'autre : le rendu du papier empile « a/b » tout seul dès que le
    // générateur déclare `fractions: true`, l'écran non — il affiche le `html`
    // de l'énoncé tel qu'il est écrit, et retombe sur le `text` nu quand il n'y
    // a pas de `html`.
    //
    // DEUX EXERCICES ÉTAIENT DANS CE CAS sur les 238 du catalogue : « Poser un
    // Produit de Fractions », dont l'énoncé n'avait aucun `html` et affichait
    // « 2/3 × 6/5 = ? », et la marche « fraction irréductible » de
    // « Décomposer, PGCD et PPCM », qui écrivait « Rends la fraction 91/143
    // irréductible » À LA BARRE pendant que la réponse juste en dessous
    // s'empilait. Le même écran enseignait les deux écritures à la fois.
    //
    // ON PARCOURT MARCHE PAR MARCHE, et c'est ce qui fait la différence entre
    // une mesure et une illusion : douze questions tirées d'un exercice à
    // dix-sept marches ne montrent que les douze premières — et la fraction
    // était à la dix-septième. La première mesure rendait « un seul exercice
    // coupable », et elle avait tort.
    const { generateurDeFiche } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');

    // Ce qui ressemble à une fraction sans en être une : les unités composées.
    const UNITES = /\b(km|m|cm|mm|g|kg|L|mL|€)\s*\/\s*(h|s|min|m|L|kg|mois|an)\b/i;
    const FRACTION = /(?<![\d\/])(\d{1,4})\s*\/\s*(\d{1,4})(?![\d\/])/;
    const fautifs = [];

    for (const exo of exercices) {
        const g = generateurDeFiche(exo);
        if (!g || typeof g.generate !== 'function') continue;
        const marches = Array.isArray(exo.params && exo.params.marches) ? exo.params.marches : null;
        const essais = marches ? marches.length * 2 : 10;
        for (let i = 0; i < essais; i++) {
            const reglages = marches
                ? { ...exo.params, marches: [marches[i % marches.length]] }
                : (exo.params || {});
            let it;
            try { it = g.generate(reglages, { rng: makeRng(`col_${exo.id}_${i}`), index: i, total: essais }); }
            catch { break; }
            const html = (it && it.prompt && (it.prompt.html || it.prompt.text)) || '';
            // Une fraction DÉJÀ empilée ne compte pas : on cherche la barre
            // oblique dans du texte, pas dans la balise qui porte le trait.
            const nu = html
                .replace(/<span class="fraction[^"]*">[\s\S]*?<\/span>\s*<\/span>/g, ' ')
                .replace(/<[^>]*>/g, ' ');
            if (UNITES.test(nu)) continue;
            const m = nu.match(FRACTION);
            if (m) { fautifs.push(`${exo.id} : « ${m[0]} » dans « ${nu.trim().slice(0, 70)} »`); break; }
        }
    }
    assert.deepEqual(fautifs, []);
});

test('UN QCM NE RECOPIE PAS SES BOUTONS DANS LA QUESTION D\'ÉCRAN', async () => {
    // ─────────────────────────────────────────────────────────────────────────
    //
    // RÉMY, CAPTURE À L'APPUI : « Pour la question comme c'est un qcm, ne mets
    // pas les propositions dans la question. Je te joins un screenshot, je
    // trouve que niveau design de texte, c'est pas terrible. »
    //
    // Sur sa capture, les quatre expressions — 4x + 5 ; 4(x + 5) ; 4x − 5 et
    // 4(x − 5) — sont écrites DEUX FOIS sur le même écran : dans la question,
    // en bleu, sur deux lignes ; et dans les quatre boutons, juste à droite.
    // La question prend alors toute la place, et l'œil ne sait plus où lire.
    //
    // LA CAUSE SE REPRODUIRA, parce qu'elle vient d'une bonne raison : une
    // feuille imprimée n'a PAS de boutons, donc les propositions doivent y
    // être écrites — c'est une autre garde de ce fichier qui l'exige. J'avais
    // donc écrit UN SEUL texte pour les deux supports. L'écran et la feuille
    // ne demandent pas la même phrase, et `prompt.papier` existe pour cela.
    //
    // LA RÈGLE EST L'ÉNUMÉRATION, PAS LES VALEURS, et c'est la mesure qui l'a
    // dit. Un premier jet refusait toute proposition présente dans la
    // question : il attrapait « Priorité ? 4 + 5 × 7 + 4 », dont les boutons
    // SONT les sous-expressions, « Chiffre des dizaines de 2 471,38 ? », dont
    // les leurres sortent du nombre exprès, et « quel est le côté le plus
    // long ? », qui doit nommer ses trois côtés. Quatre faux coupables sur
    // cinq. Ce qu'on interdit est la LISTE recopiée — « Parmi A ; B ; C et
    // D, … » — juste à côté des boutons qui la répètent.
    const { generateurDeFiche } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');

    const fautifs = [];
    for (const exo of exercices) {
        const g = generateurDeFiche(exo);
        if (!g || typeof g.generate !== 'function') continue;
        const marches = Array.isArray(exo.params && exo.params.marches) ? exo.params.marches : null;
        const essais = marches ? marches.length * 2 : 12;
        for (let i = 0; i < essais; i++) {
            const reglages = marches
                ? { ...exo.params, marches: [marches[i % marches.length]] }
                : (exo.params || {});
            let it;
            try { it = g.generate(reglages, { rng: makeRng(`q_${exo.id}_${i}`), index: i, total: essais }); }
            catch { break; }
            if (!it || it.answerKind !== 'choice' || !Array.isArray(it.choices)) continue;
            if (it.choices.length < 3) continue;
            const ecran = String((it.prompt && (it.prompt.html || it.prompt.text)) || '')
                .replace(/<[^>]*>/g, ' ');
            const liste = /\bParmi\b[^?]*\bet\b/.test(ecran)
                && it.choices.every(c => ecran.includes(String(c.value).trim()));
            if (liste) {
                fautifs.push(`${exo.id} : « ${ecran.trim().slice(0, 90)} »`);
                break;
            }
        }
    }
    assert.deepEqual(fautifs, []);
});

test('UN ÉNONCÉ N\'ÉCRIT PAS LES DEUX SIGNES MOINS', async () => {
    // ─────────────────────────────────────────────────────────────────────────
    //
    // VU À L'ÉCRAN, DANS UNE SEULE PHRASE : « On donne f(x) = 2x − 2. On part
    // du point (0 ; -2)… » Le premier moins est le vrai (U+2212), écrit par la
    // fonction qui compose l'expression ; le second est un trait d'union,
    // parce que `${b}` sur le nombre −2 rend ce que JavaScript sait rendre.
    // Ils n'ont ni la même longueur ni la même hauteur, et ils sont à vingt
    // caractères l'un de l'autre.
    //
    // QUATRE EXERCICES SUR 244 ÉTAIENT DANS CE CAS, dont TROIS qui existaient
    // déjà : « Réduire une expression » (« 3a et −2a donnent a ; 3 et -1
    // donnent 2 ») et les deux « Calculer avec des puissances », dont
    // l'explication écrivait « 10^(-8 − (-3)) » sous une démonstration qui
    // écrivait « 10^(−8 − (−3)) ».
    //
    // LES TROIS AVAIENT LA MÊME CAUSE : le fichier possédait DÉJÀ sa fonction
    // d'écriture, employée pour la démonstration et oubliée dans
    // l'explication. La règle vit maintenant dans `js/core/signeMoins.js`.
    //
    // LA GARDE NE S'ALLUME QUE SI LE TEXTE EMPLOIE DÉJÀ LE VRAI MOINS : un
    // énoncé qui n'écrit que des traits d'union est peut-être à corriger, mais
    // il n'est pas INCOHÉRENT, et c'est l'incohérence qui s'apprend. Et l'on
    // ne regarde que le tiret qui suit un blanc ou une ouvrante ET précède un
    // chiffre : « a-t-il », « c'est-à-dire » et « 10-3 » n'ont rien à craindre.
    const { generateurDeFiche } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');

    const TIRET = /(^|[\s(\[;:=])-\d/;
    const fautifs = [];
    for (const exo of exercices) {
        const g = generateurDeFiche(exo);
        if (!g || typeof g.generate !== 'function') continue;
        const marches = Array.isArray(exo.params && exo.params.marches) ? exo.params.marches : null;
        const essais = marches ? marches.length * 3 : 15;
        for (let i = 0; i < essais; i++) {
            const reglages = marches
                ? { ...exo.params, marches: [marches[i % marches.length]] }
                : (exo.params || {});
            let it;
            try { it = g.generate(reglages, { rng: makeRng(`mm_${exo.id}_${i}`), index: i, total: essais }); }
            catch { break; }
            // LES BALISES PARTENT AVANT LA MESURE, et la parenthèse compte :
            // écrite sans elle, la coupure ne portait que sur la SECONDE moitié
            // de la concaténation, et les attributs du `html` — `data-c="-3,2"`,
            // les styles en ligne — comptaient comme des énoncés. L'épreuve
            // neuve est tombée là-dessus avant d'avoir servi une fois.
            const t = (`${(it && it.prompt && (it.prompt.html || it.prompt.text)) || ''} `
                + `${(it && it.explanation) || ''}`).replace(/<[^>]*>/g, ' ');
            if (t.includes('\u2212') && TIRET.test(t)) {
                fautifs.push(`${exo.id} : « ${t.match(TIRET)[0].trim()} » dans « ${t.trim().slice(0, 80)} »`);
                break;
            }
        }
    }
    assert.deepEqual(fautifs, []);
});

test('UN ÉNONCÉ DE PAPIER NE SE RÉPÈTE PAS', async () => {
    // ─────────────────────────────────────────────────────────────────────────
    //
    // VU SUR LE PDF : « Dans le triangle MNP, MN = 20 cm, MP = 21 cm et
    // NP = 29 cm. Dans le triangle MNP, MN = 20 cm, MP = 21 cm et NP = 29 cm.
    // Quel est le côté le plus long ? » — l'énoncé écrit DEUX FOIS.
    //
    // LA CAUSE SE REPRODUIRA, parce qu'elle est dans la forme même des
    // générateurs : la feuille compose son texte comme « énoncé + question »,
    // et un générateur qui écrit un champ `papier` CONTENANT DÉJÀ l'énoncé se
    // le voit ajouter une seconde fois. À l'écran rien ne paraît, puisque
    // l'écran lit les deux champs séparément et n'affiche `papier` jamais.
    //
    // On compare les trente premiers caractères : c'est assez pour reconnaître
    // un énoncé recopié, et trop pour qu'une tournure courante — « Calcule »,
    // « Dans le triangle » — y suffise toute seule.
    const { generateurDeFiche } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');

    const fautifs = [];
    for (const exo of exercices) {
        if (exo.printable) continue;
        const g = generateurDeFiche(exo);
        if (!g || typeof g.generate !== 'function') continue;
        const marches = Array.isArray(exo.params && exo.params.marches) ? exo.params.marches : null;
        const essais = marches ? marches.length * 2 : 8;
        for (let i = 0; i < essais; i++) {
            const reglages = marches
                ? { ...exo.params, marches: [marches[i % marches.length]] }
                : (exo.params || {});
            let it;
            try { it = g.generate(reglages, { rng: makeRng(`rep_${exo.id}_${i}`), index: i, total: essais }); }
            catch { break; }
            const papier = (it && it.prompt && it.prompt.papier) || '';
            if (papier.length < 70) continue;
            const debut = papier.slice(0, 30);
            if (papier.indexOf(debut, 1) > 0) {
                fautifs.push(`${exo.id} : « ${debut}… » écrit deux fois`);
                break;
            }
        }
    }
    assert.deepEqual(fautifs, []);
});

test('SUR UNE FEUILLE, UN NOMBRE NE SE COLLE PAS À LA QUESTION', async () => {
    // ─────────────────────────────────────────────────────────────────────────
    //
    // LE DÉFAUT, ET IL EST TOMBÉ DEUX FOIS :
    //
    //   « 84 = 2² × 3 × 7 et 120 = 2³ × 3 × 5 Quel est le PGCD de 84 et 120 ? »
    //   « … 166 ; 171 ; 159 ; 165 Quelle est l'étendue de cette série ? »
    //
    // À L'ÉCRAN, RIEN NE SE TOUCHE : l'énoncé et la question vivent dans deux
    // blocs séparés, et le défaut n'existe pas. Sur la feuille, les deux sont
    // collés bout à bout — et le dernier nombre de l'énoncé se lit comme le
    // premier mot de la question. On ne le voit qu'en REGARDANT le PDF.
    //
    // LA LISTE DES MOTS EST CELLE QUI OUVRE UNE QUESTION en français, et elle
    // est volontairement étroite : « 5 Mars » ou « 3 Pythagore » ne sont pas
    // des fautes, et une règle qui interdirait toute majuscule après un chiffre
    // en inventerait.
    const { generateurDeFiche } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');

    const COLLE = new RegExp('[0-9\u2070-\u2079\u00b2\u00b3\u00b9]\\s+'
        + '(Quel|Quelle|Quels|Quelles|Combien|Laquelle|Lequel|Calcule|Donne|'
        + 'Écris|Rends|Complète|Trouve|Dans quel|Range|Dis )');
    const fautifs = [];
    for (const exo of exercices) {
        if (exo.printable) continue;
        const g = generateurDeFiche(exo);
        if (!g || typeof g.generate !== 'function') continue;
        const marches = Array.isArray(exo.params && exo.params.marches) ? exo.params.marches : null;
        const essais = marches ? marches.length * 2 : 10;
        for (let i = 0; i < essais; i++) {
            const reglages = marches
                ? { ...exo.params, marches: [marches[i % marches.length]] }
                : (exo.params || {});
            let it;
            try { it = g.generate(reglages, { rng: makeRng(`col_${exo.id}_${i}`), index: i, total: essais }); }
            catch { break; }
            const papier = (it && it.prompt && (it.prompt.papier || it.prompt.text)) || '';
            const m = papier.match(COLLE);
            if (m) { fautifs.push(`${exo.id} : « …${m[0]}… » dans « ${papier.slice(0, 90)} »`); break; }
        }
    }
    assert.deepEqual(fautifs, []);
});

test('UNE QUESTION QUI DIT « CES » ÉCRIT CE QU\'ELLE MONTRE', async () => {
    // ─────────────────────────────────────────────────────────────────────────
    //
    // LE DÉFAUT, ET IL EST TOMBÉ DEUX FOIS DANS LA MÊME JOURNÉE.
    //
    //   « Lequel de ces nombres divise 50 ? »  — et aucun nombre sur la feuille.
    //   « Laquelle de ces valeurs ne peut PAS être une probabilité ? » — idem,
    //   et trois fois sur la même page.
    //
    // Les propositions sont des BOUTONS, et une feuille imprimée n'a pas de
    // boutons. La question n'est alors pas difficile : elle est SANS RÉPONSE
    // POSSIBLE. Rien ne plante, rien ne prévient, et cela ne se voit qu'en
    // regardant le PDF — à l'écran tout va bien.
    //
    // LA RÈGLE EST ÉTROITE ET C'EST VOULU. On ne peut pas exiger qu'un énoncé
    // à choix recopie toujours ses propositions : « 15 et 28 sont-ils premiers
    // entre eux ? » n'a besoin ni de « oui » ni de « non » pour être
    // répondable. Ce qu'on garde, c'est la promesse que la QUESTION fait :
    // quand elle dit « de ces », elle annonce une liste, et cette liste doit
    // exister sur le papier.
    const { generateurDeFiche } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');

    const ANNONCE = /(lequel|laquelle|lesquels|lesquelles|parmi) +(de +)?ces/i;
    const fautifs = [];
    for (const exo of exercices) {
        // UN EXERCICE QUI A SON PROPRE RENDU DE FICHE EST HORS DE CETTE RÈGLE.
        //
        // `printable` désigne un dessinateur à lui — « Le Vocabulaire du
        // Cercle » en a un, qui TRACE le cercle, ses rayons et ses cordes sur
        // la feuille. « Parmi ces tracés, lequel est un rayon ? » y est
        // parfaitement répondable, et la liste des propositions n'a rien à
        // faire dans le texte : elle est dans le dessin.
        //
        // Ce qu'on garde ici est la feuille ORDINAIRE, celle qui n'imprime que
        // du texte — et c'est là que le défaut est tombé deux fois.
        if (exo.printable) continue;
        const g = generateurDeFiche(exo);
        if (!g || typeof g.generate !== 'function') continue;
        const marches = Array.isArray(exo.params && exo.params.marches) ? exo.params.marches : null;
        const essais = marches ? marches.length * 2 : 10;
        for (let i = 0; i < essais; i++) {
            const reglages = marches
                ? { ...exo.params, marches: [marches[i % marches.length]] }
                : (exo.params || {});
            let it;
            try { it = g.generate(reglages, { rng: makeRng(`ces_${exo.id}_${i}`), index: i, total: essais }); }
            catch { break; }
            if (!it || !Array.isArray(it.choices) || !it.choices.length) continue;
            const papier = (it.prompt && (it.prompt.papier || it.prompt.text)) || '';
            if (!ANNONCE.test(papier)) continue;
            const absentes = it.choices
                .map(c => String(c.label !== undefined ? c.label : c.value))
                .filter(v => !papier.includes(v));
            if (absentes.length) {
                fautifs.push(`${exo.id} : « ${papier.slice(0, 80)} » ne montre pas ${absentes.join(', ')}`);
                break;
            }
        }
    }
    assert.deepEqual(fautifs, []);
});

test('AUCUNE COMMANDE LATEX NE FUIT SUR UNE FICHE', async () => {
    // RÉMY, capture d'une fiche imprimée à l'appui : « problème ». On y lisait
    //
    //     2543/1000 = \\ldots        4,41 = 441/\\ldots
    //
    // en toutes lettres, au milieu de l'exercice « Virgule ou Fraction ? ».
    //
    // LA COMMANDE VENAIT D'UN MONDE QUE CE DÉPÔT N'HABITE PAS : la feuille est
    // dessinée en HTML puis imprimée par le navigateur — personne n'y compile
    // du LaTeX, et `\\ldots` s'y imprime tel quel. Les cent quarante-cinq
    // autres énoncés de papier écrivaient déjà le caractère « … ».
    //
    // ON L'ÉPROUVE SUR LES ÉNONCÉS ENGENDRÉS, et non sur le texte des sources :
    // un `\\ldots` assemblé à la volée — c'était le cas de deux des trois —
    // échapperait à une lecture du code.
    const { generateurDeFiche } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');
    const latex = /\\(ldots|dots|cdot|frac|times|div|text|left|right|begin|end|mathrm)\b/;
    const fautifs = [];
    for (const exo of exercices) {
        const g = generateurDeFiche(exo);
        if (!g || !g.ecrit) continue;
        const reglages = { ...(exo.params || {}), ...(exo.printParams || {}) };
        for (let i = 0; i < 12; i++) {
            let it;
            try { it = g.generate(reglages, { rng: makeRng(`tex_${exo.id}_${i}`), index: i }); }
            catch { break; }
            const p = it.prompt || {};
            const morceaux = [p.papier, p.text, it.explicationPapier, it.explanation];
            const fautif = morceaux.find(t => typeof t === 'string' && latex.test(t));
            if (fautif) { fautifs.push(`${g.id} : « ${fautif} »`); break; }
        }
    }
    assert.deepEqual(fautifs, []);
});

// --- Ce qui est de l'écran ne va pas sur la feuille --------------------------

test('aucun réglage d\'écran n\'atteint le panneau d\'impression', async () => {
    // Un réglage se range dans l'une de deux familles. DU CONTENU — l'opération,
    // la taille des nombres, le niveau : il doit aller sur la fiche, sinon on
    // règle et rien ne change. DE L'ÉCRAN — le nombre de propositions, le
    // passage au clavier, la tolérance du rapporteur : sur une photocopie il
    // n'existe pas, et l'afficher donne un bouton sans effet.
    //
    // Le tri se lisait en creux — « seuls les réglages du générateur passent » —
    // ce qui marchait par accident. `papier: false` le dit, et ce test le tient.
    await import('../js/core/activities/index.js');
    const { allGenerators, allActivities } = await import('../js/core/registry.js');
    const ecran = [...allGenerators(), ...allActivities()]
        .flatMap(x => (x.params || []).map(p => ({ id: p.id, papier: p.papier, ou: x.id })))
        .filter(p => p.papier === false);

    // Ceux qu'on connaît doivent y être : un renommage ne doit pas les perdre
    // en silence.
    // « propositions » et « saisie » ont disparu — Rémy : « les sliders nombre
    // de propositions et passage au clavier n'ont pas d'intérêt ». Ils faisaient
    // globalement ce que la frise fait zone par zone, et y toucher éteignait
    // l'adaptatif sans le dire. « clavier » les remplace : la seule question que
    // la frise ne peut pas poser, parce qu'elle ne parle que du mode adaptatif.
    const attendus = ['aide', 'clavier', 'repartition', 'tolerance', 'reponse'];
    for (const id of attendus) {
        assert.ok(ecran.some(p => p.id === id),
            `« ${id} » n'est plus marqué comme réglage d'écran`);
    }

    // Et aucun d'eux ne doit ressortir du tri appliqué par la fiche.
    const surPapier = (p) => p && p.papier !== false;
    for (const p of ecran) assert.equal(surPapier(p), false, `${p.ou} · ${p.id}`);
});

// --- Un énoncé trop long n'est jamais lu -------------------------------------

test('AUCUNE CONSIGNE DE FEUILLE N\'EST UN PAVÉ', async () => {
    // Rémy : « pour l'énoncé des puissances de 10, tu as écrit tout cela […]
    // mets juste calcule. De manière générale, un énoncé trop long n'est jamais
    // lu. » Une consigne se lit debout, la pile de photocopies dans les mains ;
    // au-delà de deux lignes, l'élève saute par-dessus et fait ce qu'il croit.
    //
    // La limite est celle que la fiche d'un exercice seul s'impose déjà
    // (`premierePhrase` : rien au-delà de 120 caractères). Ce test la fait
    // valoir pour les consignes écrites À LA MAIN dans le catalogue, que cette
    // coupure ne traverse pas.
    const { exercices } = await import('../js/data/catalog.js');
    const longues = exercices
        .filter(e => (e.consignePapier || '').length > 200)
        .map(e => `${e.id} (${e.consignePapier.length} caractères)`);
    assert.deepEqual(longues, [], 'consignes trop longues : ' + longues.join(', '));
});

test('L\'INSTRUCTION DE L\'ÉCRAN NE PART JAMAIS ENTIÈRE SUR LE PAPIER', async () => {
    // C'était le vrai défaut : la fiche de PARCOURS recopiait `instruction`
    // faute de `consignePapier`, sans la couper — neuf cents caractères en tête
    // d'exercice. Les deux fiches passent maintenant par la même fonction.
    const { premierePhrase } = await import('../js/ui/printQuestions.js');
    const { exercices } = await import('../js/data/catalog.js');
    exercices.forEach(e => {
        const repli = premierePhrase(e.instruction || '');
        assert.ok(repli.length <= 120, `${e.id} : repli de ${repli.length} caractères`);
    });
    // Et le pavé des puissances rend bien la chaîne vide, pas son premier tiers.
    const puissances = exercices.find(e => e.id === 'num-puissances-reconnaitre');
    assert.equal(puissances.consignePapier, 'Calcule.', 'Rémy : « mets juste calcule »');
});

test('UN EXERCICE DÉSACTIVÉ N\'EST PROPOSÉ NI EN RÉVISION NI EN REMÉDIATION', () => {
    // LA PORTE DE DERRIÈRE. `exercisesForSkill` cherchait dans le catalogue NON
    // filtré, et ses deux seuls appelants sont côté ÉLÈVE : le plan de révision
    // (`ui/profileUI.js`) et la remédiation, qui compose la « séance
    // conseillée ». Un exercice que Rémy venait d\'éteindre pouvait donc lui
    // être proposé quand même — disparu du catalogue par la grande porte, et
    // revenu par celle-ci.
    //
    // TROUVÉ PAR UNE SONDE, PAS PAR UNE RELECTURE : six exercices paraissaient
    // sous le filtre « Non validé » là où le catalogue n\'en comptait qu\'un, et
    // les cinq autres venaient du plan de révision.
    //
    // ON ÉPROUVE LA RÈGLE, PAS LE CAS. Nommer le Jardin ici ferait une épreuve
    // qui ne garde plus rien le jour où on le rallume — or ce qu\'on garde vaut
    // pour tout exercice qu\'on éteindra ensuite.
    const eteints = exercices.filter(e => statusOf(e) === STATUS.BROUILLON);
    assert.ok(eteints.length > 0,
        'aucun exercice désactivé : cette épreuve ne mesure plus rien');

    for (const exo of eteints) {
        // LES COMPÉTENCES SE DÉDUISENT DU GÉNÉRATEUR, elles ne sont pas écrites
        // sur l\'exercice — ma première version lisait `exo.skills`, qui vaut
        // `undefined`, et la boucle ne tournait pas une seule fois. Une épreuve
        // qui n\'itère sur rien passe toujours.
        const competences = skillsOf(exo);
        assert.ok(competences.length > 0,
            `« ${exo.id} » ne déclare aucune compétence : l\'épreuve ne vérifierait rien`);
        for (const c of competences) {
            assert.ok(!exercisesForSkill(c).some(e => e.id === exo.id),
                `« ${exo.id} » est encore proposé pour « ${c} » : un élève peut le `
                + 'recevoir en révision alors qu\'il est désactivé');
        }
    }

    // ET LE TÉMOIN, SANS LEQUEL « ne rend plus rien » PASSERAIT : les exercices
    // OUVERTS qui travaillent les mêmes compétences sont bien rendus.
    const compétences = eteints.flatMap(skillsOf);
    const vivants = compétences.flatMap(c => exercisesForSkill(c));
    assert.ok(vivants.length > 0,
        'plus aucun exercice pour ces compétences : la fonction ne rend plus rien du tout');
});
