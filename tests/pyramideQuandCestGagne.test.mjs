// QUAND LA PYRAMIDE EST JUSTE, L'ÉLÈVE DOIT LE SAVOIR — ET SAVOIR OÙ ALLER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour les pyramides quand c'est bon et que l'élève a cliqué vérifié
// il faut dire qu'il a eu bon et proposer une nouvelle pyramide, j'ai une élève
// qui n'a pas compris qu'il fallait faire cela ».
//
// CE QUI SE PASSAIT, MESURÉ SUR LE CHEMIN DE L'ÉLÈVE
// (`tools/pyramideQuandCestJuste.mjs`) :
//
//   · la victoire ne vient PAS de « Vérifier » — `taper()` termine la pyramide
//     dès le dernier chiffre juste. Quand l'élève touche « Vérifier », ce que
//     son professeur lui a appris à faire, la partie est déjà gagnée et
//     `verifier()` sort sur son `if (this.fini) return` : le bouton est MORT ;
//   · les trois boutons avaient le même fond blanc — mesuré rgb(255,255,255)
//     pour « Vérifier » comme pour « Nouvelle pyramide » ;
//   · la phrase disait « Pyramide complète — sommet 79 », ce qui décrit la
//     GRILLE et non ce qu'elle vient de réussir ;
//   · Entrée, la touche avec laquelle elle venait de valider, ne faisait plus
//     rien.
//
// Rien n'était cassé. Rien ne lui parlait, et c'est exactement pareil pour
// quelqu'un de onze ans devant un écran.
//
// CE QUE CES ÉPREUVES GARDENT. Ces deux jeux ne s'instancient pas sans
// navigateur ; la sonde ci-dessus le fait, mais elle ne tourne pas à chaque
// commit. On garde donc ici l'ACCORD entre les quatre morceaux, qui est ce qui
// se défait tout seul : la phrase, les boutons, la touche Entrée et le style.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

/** Le corps d'une méthode de classe, indentée de quatre espaces. */
function methode(src, nom) {
    const debut = src.indexOf(`\n    ${nom}`);
    assert.notEqual(debut, -1, `la méthode « ${nom} » a disparu`);
    const fin = src.indexOf('\n    }', debut);
    assert.notEqual(fin, -1, `la méthode « ${nom} » ne se referme pas`);
    return src.slice(debut, fin);
}

const JEUX = [
    { nom: 'la pyramide des nombres', fichier: 'js/games/pyramideNombres.js', p: 'pn' },
    { nom: 'la pyramide des mots', fichier: 'js/games/pyramide.js', p: 'py' }
];

for (const jeu of JEUX) {
    test(`${jeu.nom} : LA PHRASE DIT QU'ON A EU BON, ET OÙ ALLER`, () => {
        const corps = methode(lire(jeu.fichier), 'gagner()');
        // « Pyramide complète » décrivait la grille. L'élève a besoin d'entendre
        // que c'est ELLE qui a réussi.
        assert.match(corps, /Bravo/,
            'la phrase de victoire ne félicite pas l\'élève');
        // ET ELLE NOMME LE BOUTON. Sans cela, « Nouvelle pyramide » reste l'un
        // des trois boutons de la barre, et c'est sur « Vérifier » qu'on
        // retouche quand on ne sait pas quoi faire.
        assert.match(corps, /Nouvelle pyramide/,
            'la phrase ne dit pas quoi faire ensuite');
        assert.match(corps, /this\.boutons\(true\)/,
            'les boutons ne passent pas en mode « c\'est gagné »');
    });

    test(`${jeu.nom} : LES BOUTONS MORTS S'ÉTEIGNENT, CELUI DE LA SUITE S'ALLUME`, () => {
        const src = lire(jeu.fichier);
        const corps = methode(src, 'boutons(gagne)');
        // « Vérifier » et « Un indice » commencent tous les deux par
        // `if (this.fini) return` : une fois gagné, ils ne répondent plus. Un
        // bouton vivant qui ne répond pas est pire que pas de bouton.
        assert.match(corps, /verif\.disabled = gagne/, '« Vérifier » reste vivant');
        assert.match(corps, /aide\.disabled = gagne/, '« Un indice » reste vivant');
        assert.match(corps, new RegExp(`classList\\.toggle\\('${jeu.p}-btn--suite', gagne\\)`),
            'le bouton de la suite ne se distingue pas des autres');
        // LE FOYER, pour qu'Entrée suffise — mais pas pendant la démonstration,
        // où le robot joue tout seul et où un foyer déplacé fait sauter le
        // curseur de démonstration.
        assert.match(corps, /if \(gagne && !this\.isDemo\) neuf\.focus\(\)/,
            'le foyer ne va pas sur le bouton de la suite');
        // ET LE STYLE EXISTE VRAIMENT. La classe posée plus haut ne vaut que
        // par la règle qui la peint : sans elle, tout le reste est muet.
        assert.ok(src.includes(`.${jeu.p}-btn--suite {`),
            `la règle .${jeu.p}-btn--suite manque dans la feuille du jeu`);
        assert.ok(src.includes(`.${jeu.p}-btn:disabled {`),
            `rien ne montre qu'un bouton est éteint dans ${jeu.fichier}`);
    });

    test(`${jeu.nom} : UNE NOUVELLE PYRAMIDE REMET LES BOUTONS, ET ENTRÉE LA DEMANDE`, () => {
        const src = lire(jeu.fichier);
        // SANS CE RETOUR, LA CORRECTION SE RETOURNE CONTRE L'ÉLÈVE : la
        // deuxième pyramide s'ouvrirait avec « Vérifier » éteint pour toujours.
        assert.match(methode(src, 'poser(neuve = false)'), /this\.boutons\(false\)/,
            'la nouvelle pyramide garde les boutons de la précédente');
        // ENTRÉE EST LA TOUCHE AVEC LAQUELLE ELLE VENAIT DE VALIDER : elle doit
        // mener plus loin, pas se taire.
        const touches = src.slice(src.indexOf('this.surTouche = (e) =>'),
            src.indexOf('document.addEventListener(\'keydown\', this.surTouche)'));
        assert.match(touches, /if \(this\.fini\)[\s\S]*?this\.poser\(true\)/,
            'Entrée ne propose pas de nouvelle pyramide une fois gagné');
        assert.ok(!/if \(this\.fini \|\| this\.isDemo\) return;/.test(touches),
            'le clavier se tait entièrement dès que c\'est gagné');
    });
}
