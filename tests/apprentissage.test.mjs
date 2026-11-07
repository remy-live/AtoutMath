import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices, paramSchemaOf, getExerciseById } from '../js/data/catalog.js';
import { aApprentissage, construireApprentissage } from '../js/core/apprentissage.js';
import { hydratePath } from '../js/core/path.js';
import { MODES } from '../js/core/policy.js';
import { readFileSync } from 'node:fs';

const AVEC = exercices.filter(aApprentissage);

test('des exercices déclarent un mode apprentissage', () => {
    assert.ok(AVEC.length > 0, 'aucun exercice n\'a de mode apprentissage');
});

test('un palier ne règle que ce que son exercice sait régler', () => {
    // Une surcharge sur un paramètre inconnu est silencieuse : le générateur
    // reprend sa valeur par défaut, et le palier « facile » se joue en
    // difficile sans que rien ne le signale.
    for (const exo of AVEC) {
        for (const palier of exo.apprentissage.paliers) {
            const cible = getExerciseById(palier.exerciseId || exo.id);
            assert.ok(cible, `${exo.id} : palier vers un exercice inconnu « ${palier.exerciseId} »`);

            const connus = new Set(paramSchemaOf(cible).map(p => p.id));
            for (const cle of Object.keys(palier.overrides || {})) {
                assert.ok(connus.has(cle),
                    `${exo.id} / ${palier.titre} : « ${cle} » n'est pas un réglage de ${cible.id}`);
            }
        }
    }
});

test('une surcharge de palier propose une valeur que le réglage accepte', () => {
    for (const exo of AVEC) {
        for (const palier of exo.apprentissage.paliers) {
            const cible = getExerciseById(palier.exerciseId || exo.id);
            const schema = paramSchemaOf(cible);
            for (const [cle, valeur] of Object.entries(palier.overrides || {})) {
                const param = schema.find(p => p.id === cle);
                if (!param || !param.options) continue;
                const admis = param.options.map(o => (o && typeof o === 'object' ? o.value : o));
                const proposees = Array.isArray(valeur) ? valeur : [valeur];
                for (const v of proposees) {
                    assert.ok(admis.some(a => String(a) === String(v)),
                        `${exo.id} / ${palier.titre} : ${cle} = « ${v} » hors des valeurs proposées`);
                }
            }
        }
    }
});

test('le parcours construit est jouable, et c\'est un entraînement', () => {
    for (const exo of AVEC) {
        const plan = construireApprentissage(exo);
        assert.ok(plan, `${exo.id} : parcours non construit`);

        // Un apprentissage ne note pas et laisse plusieurs essais : être jugé
        // sur ce qu'on découvre n'a aucun sens.
        assert.equal(plan.path.policy.mode, MODES.ENTRAINEMENT, `${exo.id} : ce n'est pas un entraînement`);
        assert.equal(plan.path.policy.grading, null, `${exo.id} : un apprentissage ne se note pas`);
        assert.ok(plan.path.policy.hints, `${exo.id} : les aides doivent rester disponibles`);
        assert.ok(plan.path.policy.maxAttemptsPerItem > 1, `${exo.id} : il faut droit à l'erreur`);

        // Toutes les étapes doivent se résoudre dans le catalogue.
        const { steps, missing } = hydratePath(plan.path);
        assert.deepEqual(missing, [], `${exo.id} : étapes introuvables`);
        assert.equal(steps.length, exo.apprentissage.paliers.length);

        steps.forEach((s, i) => {
            assert.ok(s.nbItems > 0, `${exo.id} / étape ${i + 1} : aucune question`);
            assert.ok(s.threshold <= s.nbItems, `${exo.id} / étape ${i + 1} : seuil au-dessus du nombre de questions`);
            assert.ok(s.threshold >= 1, `${exo.id} / étape ${i + 1} : seuil nul`);
            assert.equal(s.title, exo.apprentissage.paliers[i].titre,
                `${exo.id} / étape ${i + 1} : le palier doit porter son nom`);
        });
    }
});

test('la leçon dit quelque chose avant de faire jouer', () => {
    for (const exo of AVEC) {
        const { lecon } = construireApprentissage(exo);
        assert.ok(lecon.regles.length > 0, `${exo.id} : aucune règle expliquée`);
        for (const r of lecon.regles) {
            assert.ok(r.titre, `${exo.id} : une règle sans titre`);
            assert.ok(r.texte, `${exo.id} : la règle « ${r.titre} » n'explique rien`);
        }
    }
});

test('les paliers montent, et laissent toujours droit à l\'erreur', () => {
    // Il n'existe pas de mesure universelle de la difficulté d'un réglage ; on
    // vérifie donc ce qui est vérifiable — la marche ne redescend pas, les
    // paliers portent des noms distincts, et aucun n'exige le sans-faute.
    for (const exo of AVEC) {
        const { steps } = hydratePath(construireApprentissage(exo).path);

        for (let i = 1; i < steps.length; i++) {
            assert.ok(steps[i].nbItems >= steps[i - 1].nbItems,
                `${exo.id} : le palier « ${steps[i].title} » pose moins de questions que le précédent`);
        }

        const noms = steps.map(s => s.title);
        assert.equal(new Set(noms).size, noms.length, `${exo.id} : deux paliers portent le même nom`);

        for (const s of steps) {
            if (s.nbItems > 1) {
                assert.ok(s.threshold <= s.nbItems - 1,
                    `${exo.id} / ${s.title} : le sans-faute est exigé (${s.threshold}/${s.nbItems})`);
            }
        }
    }
});

// ════ L'ÉCRAN D'ACCUEIL D'UNE ÉTAPE — refait le 20 octobre ══════════════════
//
// RÉMY : « pour le mode apprentissage pour les exercices, c'est tellement
// long, même pour moi, je n'ai pas envie de lire cela. Il faut faire plus
// court, plus simple, un exemple, pas si serré, proposer un exemple facultatif
// animé (avec le robot par exemple) ».
//
// MESURÉ au navigateur sur l'exercice qu'il a photographié — « Le Détour par
// le Nombre Rond », mode apprentissage, par le chemin de l'élève :
//
//                                   avant      après
//   mots à l'écran, au repos         239         76
//   phrases de consigne montrées   toutes        1
//   un exemple                        non       oui
//   interligne                       1,50       1,75
//   texte justifié                    oui       non
//
// CE QUE CES ÉPREUVES GARDENT, et qui se défait par distraction :
//
//   · LA CONSIGNE ENTIÈRE NE REVIENT PAS. C'était tout le défaut.
//   · LA RÉPONSE DE L'EXEMPLE N'EST PAS DONNÉE D'EMBLÉE. Un exemple
//     entièrement affiché est une correction : on la lit, on ne la cherche pas.
//   · UN SEUL TIRAGE D'EXEMPLE POUR LES DEUX PORTES. L'aide « ? » et cet
//     écran-ci doivent montrer le MÊME exemple du même exercice ; deux copies
//     divergeraient, et l'une cesserait d'évoluer avec l'autre.

const lireSrc = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('L\'ÉCRAN D\'APPRENTISSAGE NE MONTRE QU\'UNE PHRASE, ÉCRITE POUR L\'ÉLÈVE', () => {
    const R = lireSrc('js/core/runner.js');
    const ecran = R.slice(R.indexOf('showLearningIntro(step) {'),
        R.indexOf('_jouerLExemple(exo) {'));
    // RÉMY, devant la première version : « tu vois tu écris dix marches, etc,
    // on s'en fiche en tant qu'élève ». On prenait la première phrase de la
    // consigne du PROFESSEUR — celle qui dit comment l'exercice est bâti.
    assert.match(ecran, /const consigneEleve = phrasePourLEleve\(exo\);/);
    assert.match(ecran, /class="learn-essentiel">\$\{escapeHtml\(consigneEleve\)\}/);
    // Et la consigne du professeur ne disparaît pas : elle passe au repli.
    assert.match(ecran, /const reste = \(essentiel && essentiel !== consigneEleve\)/);
    // ET LA CONSIGNE ENTIÈRE NE REVIENT PAS PAR LA FENÊTRE : c'était le pavé
    // de 239 mots, et le remettre « pour être sûr » annulerait tout.
    assert.ok(!/escapeHtml\(exo\.instruction\)/.test(ecran),
        'la consigne entière est revenue à l\'écran');
    // Le reste existe toujours — replié. Ce qui est caché est à un clic.
    assert.match(ecran, /<details class="learn-plus">/);
    assert.match(ecran, /Tout ce qu'il faut savoir/);
    // Les leçons rejoignent le repli : elles ne doivent pas se mettre entre
    // l'élève et sa première question.
    const repli = ecran.slice(ecran.indexOf('<details class="learn-plus">'),
        ecran.indexOf('</details>'));
    assert.ok(repli.includes('${blocsLecon}'), 'les leçons sont restées dépliées');
});

test('IL MONTRE UN EXEMPLE, ET PAS SA RÉPONSE', () => {
    const R = lireSrc('js/core/runner.js');
    assert.match(R, /this\._exemple = this\._exempleDe\(exo\);/);
    assert.match(R, /this\._devoiles = 0;/);
    const peindre = R.slice(R.indexOf('_peindreExemple(exo) {'),
        R.indexOf('_peindreExemple(exo) {') + 2600);
    // LA RÉPONSE EST UNE MARCHE DE PLUS, jamais la conséquence de la dernière
    // étape : `>` et non `>=`. Avec `>=`, un exercice SANS indice montrerait
    // la question et sa réponse ensemble — c'est-à-dire ne laisserait pas une
    // seconde pour chercher.
    assert.match(peindre, /const montreReponse = vu > total;/);
    assert.match(peindre, /\$\{montreReponse \? `<div class="learn-reponse">/);
    // ET LE ROBOT EST DANS LA BOÎTE DE L'EXEMPLE. Il existait déjà, mais SOUS
    // le mur de texte : personne ne descendait jusqu'à lui.
    assert.match(peindre, /id="btn-learn-watch"/);
    assert.match(peindre, /Voir le robot le faire/);
    // UN JEU DE PLATEAU N'A PAS DE QUESTION À MONTRER : il a un plateau, et le
    // robot est alors le seul exemple possible — pas une boîte vide.
    assert.match(peindre, /Celui-ci est un jeu/);
});

test('LES DEUX PORTES TIRENT LE MÊME EXEMPLE', () => {
    // L'aide « ? » et l'écran d'apprentissage montrent une question du même
    // exercice. Deux tirages écrits séparément donneraient deux exemples
    // différents selon la porte, et l'un des deux cesserait d'évoluer.
    const C = lireSrc('js/core/aideExercice.js');
    assert.match(C, /export function meilleurExemple\(exo, generateur, faireRng, graine = '', candidats = 4\) \{/);
    assert.match(lireSrc('js/ui/aideExercice.js'), /return meilleurExemple\(exo, getGenerator\(exo\.generatorId\), makeRng,/);
    assert.match(lireSrc('js/core/runner.js'), /return meilleurExemple\(exo, getGenerator\(exo\.generatorId\), makeRng, 'apprentissage'\);/);
    // ON EN TIRE PLUSIEURS ET L'ON GARDE LE PLUS INSTRUCTIF : un tirage au
    // hasard tombe volontiers sur « 2 × 2 = ? », qui n'a rien à expliquer.
    assert.match(C, /if \(!meilleur \|\| ex\.etapes\.length > meilleur\.etapes\.length\) meilleur = ex;/);
});

test('« PAS SI SERRÉ » EST UNE RÈGLE DE FEUILLE DE STYLE, et elle est écrite', () => {
    // Rémy : « pas si serré ». Trois nombres, et le troisième est celui qui
    // comptait : la JUSTIFICATION creusait des rivières de blanc au milieu des
    // lignes et faisait du paragraphe un bloc gris.
    const CSS = lireSrc('css/modules.css');
    const regle = CSS.slice(CSS.indexOf('.learn-essentiel {'),
        CSS.indexOf('}', CSS.indexOf('.learn-essentiel {')));
    assert.ok(regle, '.learn-essentiel a disparu de la feuille');
    assert.ok(!/text-align:\s*justify/.test(regle), 'le texte est justifié');
    const inter = regle.match(/line-height:\s*([\d.]+)/);
    assert.ok(inter && Number(inter[1]) >= 1.7,
        `interligne ${inter ? inter[1] : 'absent'} : il en faut 1,7`);
    // Et la colonne est bornée : une ligne de 1 200 px se relit en diagonale.
    assert.match(regle, /max-width:\s*\d+em/);
});

test('« DIX MARCHES » NE REGARDE QUE LE PROFESSEUR', async () => {
    // RÉMY : « tu vois tu écris dix marches, etc, on s'en fiche en tant
    // qu'élève ». Le champ `instruction` est écrit POUR LUI : il dit comment
    // l'exercice est bâti, ce qu'il faut savoir pour le CHOISIR. Ce n'est pas
    // ce qu'un enfant de onze ans a besoin de lire avant de commencer.
    const { phrasePourLEleve } = await import('../js/core/aideExercice.js');
    // LA CONSIGNE DE PAPIER D'ABORD, quand elle existe : elle s'imprime déjà
    // en tête de la feuille d'un élève, donc elle est déjà écrite pour lui.
    // MESURÉ sur les 236 exercices : 134 en ont une, 8 mots en médiane.
    assert.equal(
        phrasePourLEleve({ consignePapier: 'Passe par le nombre rond.',
            instruction: 'Dix marches. Un long discours pour le professeur.' }),
        'Passe par le nombre rond.');
    // SANS ELLE, la première phrase de la consigne — le RANGEMENT écarté.
    ['Dix marches.', 'Onze marches.', 'Trois temps.', 'Trois usages.',
        'Douze marches, deux questions chacune.', 'Six étapes qui se cochent.',
        'Neuf marches, en trois temps.'].forEach(rangement => {
        const vu = phrasePourLEleve({ instruction: `${rangement} Calcule de tête.` });
        assert.ok(vu.startsWith('Calcule de tête.'),
            `« ${rangement} » est resté : « ${vu} »`);
    });
    // ET ON N'ÉCARTE PAS UNE VRAIE CONSIGNE COURTE. « Trouve le code secret ! »
    // et « Des nombres descendent. » sont des phrases d'énoncé : elles ne
    // comptent rien du dispositif, elles disent ce qui se passe. Les écarter
    // serait l'autre faute, et la plus coûteuse : un écran qui commence au
    // milieu.
    ['Trouve le code secret !', 'Des nombres descendent.', 'Un objet a disparu.',
        'Écris l\'intervalle.', 'Calcule d\'abord, classe ensuite.',
        'Le RÉSULTAT, contre la montre.'].forEach(vraie => {
        const vu = phrasePourLEleve({ instruction: `${vraie} Et la suite.` });
        assert.ok(vu.startsWith(vraie), `« ${vraie} » a été jetée : « ${vu} »`);
    });
    // LE PLAFOND AJOUTE DES PHRASES ENTIÈRES, jamais un bout : une phrase
    // amputée ne veut plus rien dire. MESURÉ sur les 236 exercices : 10 mots
    // en médiane pour ce que l'élève lit.
    assert.equal(phrasePourLEleve({ instruction: 'Compte. Les cubes cachés comptent aussi.' }, 2),
        'Compte.');
    // UN ÉCRAN MUET SERAIT PIRE : si tout est du rangement, on rend quand même
    // la première phrase.
    assert.equal(phrasePourLEleve({ instruction: 'Dix marches.' }), 'Dix marches.');
    assert.equal(phrasePourLEleve({}), '');
    // ET AUCUN EXERCICE DU CATALOGUE NE SE RETROUVE SANS PHRASE.
    const { exercices } = await import('../js/data/catalog.js');
    const muets = exercices.filter(e => !phrasePourLEleve(e));
    assert.equal(muets.length, 0, `${muets.length} exercices sans phrase pour l'élève`);
});

test('L\'EXEMPLE SE JOUE TOUT SEUL, ET UN CLIC L\'ARRÊTE', () => {
    // RÉMY : « il faut vraiment vraiment être court voire même mettre des
    // schémas qui bougent ». Un exemple qui attend un clic est un texte de
    // plus ; celui-ci s'écrit sous les yeux de l'élève, ligne après ligne.
    const R = lireSrc('js/core/runner.js');
    // ET QUELQU'UN LE LANCE. L'épreuve ne gardait d'abord que le CORPS du
    // moteur : retirer la ligne qui l'appelle la laissait verte, et l'exemple
    // ne bougeait plus. `epreuveTombe` l'a dit — une épreuve verte qui ne
    // garde rien donne une assurance qui n'existe pas.
    const ecran = R.slice(R.indexOf('showLearningIntro(step) {'),
        R.indexOf('_jouerLExemple(exo) {'));
    assert.match(ecran, /this\._jouerLExemple\(exo\);/);
    const jeu = R.slice(R.indexOf('_jouerLExemple(exo) {'),
        R.indexOf('_exempleDe(exo) {'));
    assert.match(jeu, /regTimeout\(pas, 1600\);/);
    // IL S'ARRÊTE À LA RÉPONSE, et non après : sans cette borne, le minuteur
    // se rappellerait indéfiniment sur un écran qui ne change plus.
    assert.match(jeu, /if \(this\._devoiles > ex\.etapes\.length\) return;/);
    // ET IL S'ARRÊTE AUSSI SI L'ÉCRAN A CHANGÉ SOUS SES PIEDS — l'élève a
    // commencé, ou il est reparti. Sans ce test, on repeindrait un écran qui
    // n'existe plus.
    assert.match(jeu, /if \(this\._exempleJoue \|\| !document\.getElementById\('learn-exemple'\)\) return;/);
    // UN CLIC REND LA MAIN : deux moteurs sur la même liste la feraient sauter
    // de deux marches à la fois.
    const peindre = R.slice(R.indexOf('_peindreExemple(exo) {'));
    assert.match(peindre, /suivant\.onclick = \(\) => \{\s*\n\s*this\._exempleJoue = true;/);
    // ET ELLE NE SE JOUE PAS POUR QUI N'EN VEUT PAS. Des lignes qui
    // apparaissent toutes seules derrière un exercice déclenchent des
    // migraines : le mouvement est un confort pour la plupart et une gêne
    // pour certains.
    assert.match(jeu, /prefers-reduced-motion: reduce/);
    const CSS = lireSrc('css/modules.css');
    assert.match(CSS, /\.learn-etape--neuve \{ animation: learn-arrive/);
    const i = CSS.indexOf('@media (prefers-reduced-motion: reduce) {',
        CSS.indexOf('@keyframes learn-arrive'));
    assert.ok(i > 0 && /\.learn-etape--neuve \{ animation: none; \}/.test(CSS.slice(i, i + 160)),
        'l\'arrivée des lignes ne s\'arrête jamais');
});
