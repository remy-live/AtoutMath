// Colorier par les nombres — et surtout : sans jamais deviner.
//
// Rémy : « on pourrait faire un paint by numbers où on donne le nombre de cases
// à colorier. Il faut commencer par hyper simple. »

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    INCONNU, PLEIN, CROIX, PALIERS,
    indicesDe, indicesGrille, totalDe, placements, certitudes,
    prochainCoup, resoudre, enGrille, verifier, premiereFaute,
    genererGrille, laLecon
} from '../js/core/colorierNombres.js';

const lire = (txt) => txt.map(l => l.split('').map(Number));

test('LES INDICES DISENT LES BLOCS, DANS L\'ORDRE', () => {
    assert.deepEqual(indicesDe([1, 1, 0, 1, 0]), [2, 1]);
    assert.deepEqual(indicesDe([1, 1, 1, 1, 1]), [5]);
    assert.deepEqual(indicesDe([0, 1, 1, 0, 0]), [2]);
    // UNE LIGNE VIDE PORTE UN ZÉRO, pas rien. « Rien » se lit « on ne m'a pas
    // dit », « 0 » se lit « il n'y a rien ici » — et c'est souvent l'indice le
    // plus utile de la grille, celui par lequel on commence.
    assert.deepEqual(indicesDe([0, 0, 0, 0, 0]), [0]);
    // Deux blocs collés n'en font qu'un : c'est la règle du jeu, et c'est ce
    // qui rend l'indice informatif.
    assert.deepEqual(indicesDe([1, 1, 1, 0, 1]), [3, 1]);
});

test('LES INDICES D\'UNE GRILLE SE LISENT DANS LES DEUX SENS', () => {
    const g = lire(['11000', '11000', '00110', '00110', '00001']);
    const e = indicesGrille(g);
    assert.deepEqual(e.lignes, [[2], [2], [2], [2], [1]]);
    assert.deepEqual(e.colonnes, [[2], [2], [2], [2], [1]]);
    assert.equal(e.hauteur, 5);
    assert.equal(e.largeur, 5);
    // Le total se compte des deux côtés, et c'est la première vérification
    // qu'un élève peut faire seul.
    assert.equal(totalDe(e.lignes), 9);
    assert.equal(totalDe(e.colonnes), 9);
});

test('LE RECOUVREMENT : bloc + bloc − largeur, et c\'est tout le chapitre', () => {
    // C'EST LE CALCUL FONDATEUR DU JEU. Un bloc de 4 dans une ligne de 5 donne
    // 4 + 4 − 5 = 3 cases sûres ; un bloc de 3 en donne 1 ; un bloc de 2, aucune.
    // Un élève qui tient cette formule démarre n'importe quelle grille.
    const vide = () => new Array(5).fill(INCONNU);

    const c4 = certitudes([4], vide());
    assert.equal(c4.cases.filter(c => c.v === PLEIN).length, 3, '4 + 4 − 5 = 3');
    assert.deepEqual(c4.cases.filter(c => c.v === PLEIN).map(c => c.i), [1, 2, 3]);

    assert.equal(certitudes([3], vide()).cases.filter(c => c.v === PLEIN).length, 1);
    assert.equal(certitudes([2], vide()).cases.filter(c => c.v === PLEIN).length, 0,
        'un bloc de 2 sur 5 ne donne aucune certitude : il faut croiser');

    // Une ligne pleine et une ligne vide se donnent d'un coup.
    assert.equal(certitudes([5], vide()).cases.filter(c => c.v === PLEIN).length, 5);
    assert.equal(certitudes([0], vide()).cases.filter(c => c.v === CROIX).length, 5);
});

test('ON N\'ÉNUMÈRE QUE LES PLACEMENTS LÉGAUX — une blanche entre deux blocs', () => {
    // Deux blocs de 1 dans une ligne de 3 : une seule façon, parce qu'il FAUT
    // une case blanche entre eux. Sans cette règle, l'indice ne dirait rien.
    assert.deepEqual(placements([1, 1], 3), [[1, 0, 1]]);
    assert.equal(placements([1, 1], 4).length, 3);
    assert.equal(placements([3], 5).length, 3);
    // Trop gros pour la ligne : aucune façon, et surtout pas de plantage.
    assert.deepEqual(placements([4, 2], 5), []);

    // L'ÉTAT DÉJÀ POSÉ FILTRE, et c'est là qu'est la déduction : une croix en
    // deuxième case interdit tous les placements qui la noircissent.
    const etat = [INCONNU, CROIX, INCONNU, INCONNU, INCONNU];
    assert.equal(placements([3], 5, etat).length, 1);
    assert.deepEqual(placements([3], 5, etat)[0], [0, 0, 1, 1, 1]);
});

test('UNE LIGNE IMPOSSIBLE SE DIT, elle ne se tait pas', () => {
    // L'élève a colorié une case qui ne peut pas l'être : il faut le lui dire,
    // et lui dire OÙ. Une grille qui se contente de refuser la victoire à la
    // fin laisse chercher une erreur dans vingt-cinq cases.
    const etat = [PLEIN, CROIX, PLEIN, PLEIN, PLEIN];
    const r = certitudes([4], etat);
    assert.equal(r.contradiction, true);
    assert.equal(r.possibles, 0);
});

test('TOUTE GRILLE PRODUITE SE RÉSOUT SANS DEVINER', () => {
    // C'EST LA PROPRIÉTÉ LA PLUS IMPORTANTE DU MODULE, et la seule qui demande
    // du travail. Un nonogramme tiré au hasard réclame très souvent un
    // essai-erreur : « je suppose noir, je continue, je me contredis, donc
    // c'était blanc » — un raisonnement par l'absurde à quinze coups de
    // profondeur. Un élève qui bloque là-dessus ne bloque pas sur une notion,
    // il bloque sur une grille mal faite.
    Object.keys(PALIERS).forEach(palier => {
        for (let k = 0; k < 40; k++) {
            const g = genererGrille({ rng: makeRng(`${palier}-${k}`), palier });
            assert.equal(g.deductible, true,
                `${palier} #${k} : grille non déductible`);
            const r = resoudre(g.enonce);
            assert.equal(r.complet, true);
            // Et ce que le solveur trouve est bien LE dessin de départ : une
            // grille déductible mais vers une AUTRE solution serait pire que
            // tout — l'élève aurait raison et le jeu lui dirait non.
            assert.deepEqual(enGrille(r.etat), g.solution,
                `${palier} #${k} : le solveur trouve un autre dessin`);
        }
    });
});

test('UNE GRILLE N\'EST NI VIDE NI PLEINE — ce ne serait pas un exercice', () => {
    Object.keys(PALIERS).forEach(palier => {
        for (let k = 0; k < 30; k++) {
            const g = genererGrille({ rng: makeRng(`plein-${palier}-${k}`), palier });
            const cases = g.solution.length * g.solution[0].length;
            assert.ok(g.total > 0, `${palier} #${k} : grille vide`);
            assert.ok(g.total < cases, `${palier} #${k} : grille pleine`);
            // Et elle n'est pas une tache sans dedans ni dehors : mesuré sur le
            // premier jet, la forme grossissait jusqu'aux quatre bords et
            // remplissait dix-neuf cases sur vingt-cinq. Une grille se lit par
            // ce qu'elle épargne.
            assert.ok(g.total / cases < 0.8,
                `${palier} #${k} : ${g.total}/${cases} cases coloriées, il n'y a plus rien à déduire`);
        }
    });
});

test('« HYPER SIMPLE » VEUT DIRE UN SEUL BLOC PAR LIGNE ET PAR COLONNE', () => {
    // Rémy : « il faut commencer par hyper simple ». Au premier palier, l'élève
    // n'a qu'une chose à faire — compter — et jamais à se demander comment
    // couper un nombre en deux morceaux.
    for (let k = 0; k < 60; k++) {
        const g = genererGrille({ rng: makeRng('facile' + k), palier: 'decouverte' });
        [...g.enonce.lignes, ...g.enonce.colonnes].forEach(blocs => {
            assert.equal(blocs.length, 1,
                `découverte #${k} : indice à ${blocs.length} blocs (${blocs.join(',')})`);
        });
        assert.equal(g.enonce.hauteur, 5);
    }
});

test('LES DESSINS DE DIX SUR DIX SONT TOUS DÉDUCTIBLES, et on les voit tous', () => {
    // Chaque motif est dessiné à la main : un nuage de points tiré au hasard se
    // colorie sans jamais savoir ce qu'on fait, et une case fausse ne se voit
    // pas dessus — alors qu'elle saute aux yeux sur un cœur.
    //
    // MESURÉ, ET C'EST POURQUOI CE TEST EXISTE : l'étoile du premier jet n'était
    // pas déductible. Le solveur séchait sur quarante-huit cases, c'est-à-dire
    // qu'un élève aussi. Elle a été redessinée.
    const vus = new Map();
    for (let k = 0; k < 400; k++) {
        const g = genererGrille({ rng: makeRng('img' + k), palier: 'image' });
        assert.ok(g.sujet, 'un dessin sans nom');
        assert.equal(g.deductible, true, `« ${g.sujet} » n'est pas déductible`);
        assert.equal(g.enonce.hauteur, 10);
        vus.set(g.sujet, (vus.get(g.sujet) || 0) + 1);
    }
    assert.ok(vus.size >= 8, `seulement ${vus.size} dessins différents`);
});

test('L\'AIDE DÉSIGNE UNE LIGNE ET DIT POURQUOI — elle ne remplit pas la grille', () => {
    // Un élève à qui l'on montre une case isolée apprend qu'il faut demander ;
    // un élève à qui l'on dit « regarde la ligne 3 » refait le raisonnement et
    // gagne la suivante tout seul.
    const g = genererGrille({ rng: makeRng('aide'), palier: 'decouverte' });
    const etat = Array.from({ length: 5 }, () => new Array(5).fill(INCONNU));

    const coup = prochainCoup(g.enonce, etat);
    assert.ok(coup, 'aucune aide sur une grille vide : elle n\'était pas déductible');
    assert.ok(['ligne', 'colonne'].includes(coup.sens));
    assert.ok(coup.cases.length >= 1);
    assert.ok(coup.raison.length > 30, 'une aide doit expliquer');
    // Elle nomme la ligne en clair, numérotée à partir de 1 comme on la compte.
    assert.match(coup.raison, new RegExp(`${coup.sens} ${coup.index + 1}`, 'i'));
    // Et elle ne donne jamais TOUTE la grille d'un coup.
    assert.ok(coup.cases.length <= 5);
});

test('L\'AIDE MÈNE AU BOUT SI ON LA SUIT — et elle ne se trompe jamais', () => {
    // Le solveur sert à trois choses : valider la grille, guider l'élève,
    // montrer la solution d'auteur. C'est la MÊME mécanique, et c'est ce qui
    // garantit que l'aide dit la vérité plutôt qu'une approximation plausible.
    const g = genererGrille({ rng: makeRng('suivre'), palier: 'simple' });
    const etat = Array.from({ length: 5 }, () => new Array(5).fill(INCONNU));

    for (let pas = 0; pas < 200; pas++) {
        const coup = prochainCoup(g.enonce, etat);
        if (!coup) break;
        assert.equal(coup.contradiction, undefined, 'contradiction sur une grille vierge');
        coup.cases.forEach(({ i, v }) => {
            const y = coup.sens === 'ligne' ? coup.index : i;
            const x = coup.sens === 'ligne' ? i : coup.index;
            // CHAQUE CONSEIL EST JUSTE : on le confronte à la solution.
            assert.equal(v === PLEIN, g.solution[y][x] === 1,
                `l'aide se trompe en ${coup.sens} ${coup.index + 1}, case ${i + 1}`);
            etat[y][x] = v;
        });
    }
    assert.equal(verifier(g.solution, etat).fini, true, 'l\'aide n\'a pas mené au bout');
});

test('L\'AIDE PRÉVIENT QUAND LA GRILLE EST DEVENUE IMPOSSIBLE', () => {
    // Une case coloriée à tort bloque une ligne. Le dire tout de suite, et dire
    // laquelle, évite de chercher une faute dans vingt-cinq cases.
    const g = genererGrille({ rng: makeRng('faute'), palier: 'decouverte' });
    const etat = Array.from({ length: 5 }, () => new Array(5).fill(INCONNU));
    // On colorie de force toute une ligne qui ne l'est pas.
    const y = g.enonce.lignes.findIndex(b => b[0] < 5);
    for (let x = 0; x < 5; x++) etat[y][x] = PLEIN;

    const coup = prochainCoup(g.enonce, etat);
    assert.equal(coup.contradiction, true);
    assert.match(coup.raison, /erreur/i);
    assert.ok(coup.raison.includes(String(coup.index + 1)));
});

test('ON NE COMPTE QUE LES CASES COLORIÉES, jamais les croix', () => {
    // Les croix sont un moyen que l'élève se donne pour ne pas reperdre ce
    // qu'il a conclu. Les noter reviendrait à noter sa méthode plutôt que son
    // résultat — et une croix fausse se paie déjà toute seule : elle bloque la
    // ligne, et le jeu le lui dit.
    const solution = lire(['11000', '11000', '00110', '00110', '00001']);
    const etat = Array.from({ length: 5 }, () => new Array(5).fill(INCONNU));
    solution.forEach((l, y) => l.forEach((c, x) => { if (c) etat[y][x] = PLEIN; }));

    assert.equal(verifier(solution, etat).fini, true);
    // On barre partout ailleurs : rien ne change.
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
        if (etat[y][x] === INCONNU) etat[y][x] = CROIX;
    }
    const v = verifier(solution, etat);
    assert.equal(v.fini, true, 'les croix ne doivent rien changer');
    assert.equal(v.justes, 9);
    assert.equal(v.fausses, 0);

    // Une croix POSÉE SUR UNE CASE À COLORIER n'est pas une faute non plus :
    // c'est une case qui reste à faire, et le compte le dit déjà.
    etat[0][0] = CROIX;
    const w = verifier(solution, etat);
    assert.equal(w.fini, false);
    assert.equal(w.manquantes, 1);
    assert.equal(w.fausses, 0);
});

test('LA PREMIÈRE FAUTE SE DÉSIGNE, pour qu\'on sache où regarder', () => {
    const solution = lire(['11000', '11000', '00110', '00110', '00001']);
    const etat = Array.from({ length: 5 }, () => new Array(5).fill(INCONNU));
    assert.equal(premiereFaute(solution, etat), null);
    etat[4][2] = PLEIN;
    assert.deepEqual(premiereFaute(solution, etat), { x: 2, y: 4 });
    // Une case JUSTE n'est jamais désignée comme faute.
    etat[0][0] = PLEIN;
    assert.deepEqual(premiereFaute(solution, etat), { x: 2, y: 4 });
});

test('LA LEÇON DONNE LA FORMULE, pas seulement la règle du jeu', () => {
    const t = laLecon(5);
    assert.match(t, /bloc \+ bloc − largeur/);
    assert.match(t, /blanche/);
    assert.match(t, /croix|barre/i);
    assert.ok(t.length > 200);
});


test('LES NOMBRES ÉCRITS DANS L\'AIDE SONT JUSTES — le calcul, pas seulement la phrase', () => {
    // MESURÉ AU NAVIGATEUR, ET C'EST CE QUI L'A FAIT ÉCRIRE : le premier jet
    // annonçait « le bloc de 4 ne tient que de 4 + 4 − 5 = 3 façons de se
    // placer ». Deux nombres différents s'y étaient confondus — le nombre de
    // FAÇONS vaut n − b + 1, soit 2, et le nombre de cases CERTAINES vaut
    // 2b − n, soit 3. La phrase était fausse, et c'est le genre de faute qu'un
    // élève recopie sans broncher parce qu'elle vient de la machine.
    //
    // On relit donc les nombres de l'aide et on les vérifie, sur toutes les
    // formes de phrase qu'elle sait produire.
    const nu = (t) => t.replace(/<[^>]+>/g, '');
    let vuesRecouvrement = 0;

    for (let k = 0; k < 40; k++) {
        for (const palier of Object.keys(PALIERS)) {
            const g = genererGrille({ rng: makeRng(`mots-${palier}-${k}`), palier });
            const etat = Array.from({ length: g.enonce.hauteur },
                () => new Array(g.enonce.largeur).fill(INCONNU));

            for (let tour = 0; tour < 80; tour++) {
                const coup = prochainCoup(g.enonce, etat);
                if (!coup) break;
                const texte = nu(coup.raison);
                const n = coup.longueur;

                // LE RECOUVREMENT : on relit les deux nombres annoncés.
                const m = texte.match(/de (\d+) façons?, et .* (?:les mêmes (\d+) cases|la même case) du milieu : (\d+) \+ (\d+) − (\d+) = (\d+)/);
                if (m) {
                    vuesRecouvrement++;
                    const bloc = Number(m[3]);
                    const facons = Number(m[1]);
                    const sures = m[2] ? Number(m[2]) : 1;
                    assert.equal(facons, n - bloc + 1,
                        `« ${texte} » : ${facons} façons annoncées, ${n - bloc + 1} en réalité`);
                    assert.equal(sures, 2 * bloc - n,
                        `« ${texte} » : ${sures} cases sûres annoncées, ${2 * bloc - n} en réalité`);
                    assert.equal(Number(m[4]), bloc);
                    assert.equal(Number(m[5]), n);
                    assert.equal(Number(m[6]), sures);
                    assert.equal(sures, coup.cases.filter(c => c.v === PLEIN).length,
                        `« ${texte} » : le compte annoncé n'est pas celui qu'on colorie`);
                }

                // « N cases sur N » : les deux nombres doivent être ceux de la ligne.
                const p = texte.match(/demande (\d+) cases sur (\d+)/);
                if (p) {
                    assert.equal(Number(p[1]), coup.blocs.reduce((a, b) => a + b, 0));
                    assert.equal(Number(p[2]), n);
                }

                // On ne dit jamais « les 1 cases » ni « les blocs 1 et 1 et 1 ».
                assert.doesNotMatch(texte, /les 1 cases?/, `« ${texte} »`);
                assert.doesNotMatch(texte, /\bet \d+ et \b/, `« ${texte} » : énumération illisible`);

                coup.cases.forEach(({ i, v }) => {
                    const y = coup.sens === 'ligne' ? coup.index : i;
                    const x = coup.sens === 'ligne' ? i : coup.index;
                    etat[y][x] = v;
                });
            }
        }
    }
    // Le test ne vaudrait rien s'il n'avait jamais rencontré la phrase visée.
    assert.ok(vuesRecouvrement > 20,
        `seulement ${vuesRecouvrement} recouvrements rencontrés`);
});
