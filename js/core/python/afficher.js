// MONTRER UN PROGRAMME PYTHON — avec ses numéros de ligne et ses décalages.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « l'aider sur l'indentation ».
//
// ── POURQUOI L'AFFICHAGE EST LA MOITIÉ DE L'AIDE ──────────────────────────
//
// En Python, l'indentation n'est pas de la mise en forme : c'est de la
// SYNTAXE. C'est le seul langage courant où quatre espaces changent le sens du
// programme sans le casser — la boucle qui affiche trois fois et celle qui
// affiche une fois ne diffèrent que par là. Or quatre espaces, sur un écran,
// ne se VOIENT pas : l'œil voit du blanc, et du blanc ne se compte pas.
//
// D'où les deux choses que ce fichier ajoute, et qui ne sont pas de la
// décoration :
//
//   · LE NUMÉRO DE LIGNE, parce que tout le vérificateur parle en numéros de
//     ligne (« ligne 3 : elle est décalée de 2 espaces ») et qu'un diagnostic
//     qui désigne une ligne qu'on ne sait pas trouver ne désigne rien ;
//   · LE TRAIT DE DÉCALAGE : un filet vertical par cran d'indentation. Le
//     blanc devient alors un objet qu'on voit, qu'on compte, et dont on peut
//     dire « cette ligne est DANS la boucle » en suivant le trait des yeux.
//
// La couleur, elle, sert à une seule chose ici : séparer ce qui est du TEXTE
// (entre guillemets, affiché tel quel) de ce qui est du CODE. C'est la
// confusion de départ — « print("3 + 4") » affiche 3 + 4 et non 7 — et deux
// couleurs la montrent mieux qu'une phrase.

import { lire } from './diagnostic.js';

const echapper = (t) => String(t).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Les mots du langage, et ceux de la bibliothèque qu'un élève de collège
// rencontre. On ne colore QUE ceux-là : une liste exhaustive de Python
// colorerait des mots que l'exercice n'a jamais présentés, et la couleur
// cesserait de vouloir dire « tu connais celui-ci ».
const MOTS = ['if', 'elif', 'else', 'for', 'while', 'in', 'def', 'return',
    'and', 'or', 'not', 'True', 'False', 'None', 'break', 'continue', 'import'];
const FONCTIONS = ['print', 'input', 'int', 'str', 'float', 'len', 'range',
    'abs', 'round', 'min', 'max', 'sum', 'sorted', 'append'];

const PAS = 4;

/**
 * Colore UNE ligne déjà échappée. On travaille sur le texte masqué rendu par
 * `lire` pour savoir où sont les chaînes et les commentaires, et on découpe le
 * brut aux mêmes positions : les deux ont exactement la même longueur, c'est
 * la promesse de `masquer`.
 */
function colorer(brut, masque) {
    let html = '', i = 0;
    while (i < brut.length) {
        const c = masque[i];
        // UN COMMENTAIRE : `masquer` l'a remplacé par des espaces jusqu'au
        // bout, donc on le reconnaît au dièse du brut sur un masque vide.
        if (brut[i] === '#' && masque.slice(i).trim() === '') {
            html += `<span class="py-note">${echapper(brut.slice(i))}</span>`;
            break;
        }
        if (c === '"' || c === "'") {
            // LA CHAÎNE : du guillemet au guillemet suivant dans le MASQUE.
            let j = i + 1;
            while (j < masque.length && masque[j] !== c) j++;
            html += `<span class="py-texte">${echapper(brut.slice(i, Math.min(j + 1, brut.length)))}</span>`;
            i = j + 1;
            continue;
        }
        const reste = masque.slice(i);
        const mot = reste.match(/^[A-Za-z_][A-Za-z0-9_]*/);
        if (mot) {
            const m = mot[0];
            const classe = MOTS.includes(m) ? 'py-mot'
                : FONCTIONS.includes(m) ? 'py-fonction' : null;
            html += classe ? `<span class="${classe}">${m}</span>` : echapper(m);
            i += m.length;
            continue;
        }
        const nombre = reste.match(/^\d+(\.\d+)?/);
        if (nombre) {
            html += `<span class="py-nombre">${nombre[0]}</span>`;
            i += nombre[0].length;
            continue;
        }
        html += echapper(brut[i]);
        i++;
    }
    return html;
}

/**
 * Le programme en HTML.
 *
 * @param {string} source
 * @param {Object} [o]
 * @param {boolean} [o.numeros=true]  les numéros de ligne dans la marge
 * @param {number[]} [o.montrer]      les lignes à mettre en évidence
 * @param {number} [o.fautive]        la ligne que le vérificateur accuse
 * @param {boolean} [o.traits=true]   les filets verticaux de décalage
 */
export function codeHtml(source, o = {}) {
    const { numeros = true, montrer = [], fautive = null, traits = true } = o;
    const lignes = lire(source);
    const corps = lignes.map((l) => {
        // LES FILETS : un par cran de quatre espaces réellement franchi. On
        // les pose en fond, derrière le texte, pour qu'ils ne décalent rien —
        // un filet qui pousserait le code d'un pixel ferait mentir la
        // colonne, et c'est la colonne qu'on veut faire voir.
        const crans = traits ? Math.floor(l.creux / PAS) : 0;
        const filets = Array.from({ length: crans },
            (_, k) => `<span class="py-filet" style="left:${(k * PAS + 0.5)}ch"></span>`).join('');
        const classes = ['py-ligne'];
        if (montrer.includes(l.n)) classes.push('py-ligne--montree');
        if (fautive === l.n) classes.push('py-ligne--fautive');
        return `<div class="${classes.join(' ')}">`
            + (numeros ? `<span class="py-num">${l.n}</span>` : '')
            + `<code class="py-code">${filets}${colorer(l.brut, l.texte) || '&nbsp;'}</code>`
            + '</div>';
    }).join('');
    return `<pre class="py-bloc">${corps}</pre>`;
}

/**
 * LE PROGRAMME EN TEXTE POUR LA FEUILLE IMPRIMÉE.
 *
 * Le papier n'a ni couleur ni filet, mais il a besoin des numéros de ligne —
 * l'énoncé en parle — et surtout de l'indentation, sans laquelle les trois
 * dernières marches poseraient une question dont la réponse a disparu.
 *
 * ── POURQUOI LE DÉCALAGE N'EST PAS FAIT D'ESPACES ─────────────────────────
 *
 * PREMIER JET : on recopiait les espaces du programme. VU SUR LA FEUILLE
 * IMPRIMÉE, et invisible partout ailleurs : le moteur de fiche lit TROIS
 * ESPACES CONSÉCUTIFS comme un TROU À REMPLIR (voir `trouDe` dans
 * `core/fiche.js`, une règle qui sert tous les énoncés à compléter). Les
 * quatre espaces d'indentation devenaient donc la case où l'élève écrit sa
 * réponse — posée au milieu du programme, ligne 3 —, et la fiche perdait ses
 * pointillés de fin de question. Cinq questions sur neuf étaient dans ce cas.
 *
 * ON DESSINE DONC LE DÉCALAGE au lieu de le laisser en blanc : un point
 * médian sur deux. Il ne contient aucune suite de trois espaces, donc plus
 * aucun trou ; il se compte à l'œil, ce que du blanc ne permet pas ; et il
 * rend sur le papier le service que le filet vertical rend à l'écran.
 */
const CRAN_PAPIER = '\u00b7 \u00b7 ';   // « · · », quatre caractères, zéro espace triple

export function codePapier(source) {
    return lire(source).map((l) => {
        const crans = Math.floor(l.creux / PAS);
        const reste = l.brut.slice(crans * PAS);
        return `${String(l.n).padStart(2, ' ')} | ${CRAN_PAPIER.repeat(crans)}${reste}`;
    }).join('\n');
}

/** Le nombre de crans de décalage d'une ligne — ce que l'élève doit poser. */
export const cranDe = (ligne) => Math.floor((ligne.length - ligne.trimStart().length) / PAS);

/** Pose un décalage de `crans` crans devant une ligne nue. */
export const decaler = (nu, crans) => ' '.repeat(Math.max(0, crans) * PAS) + nu.trim();
