// UNE SEULE POLICE, PARTOUT — et les trois exceptions qui ont une raison.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il faut rester cohérent dans la police ».
//
// LE LOGICIEL NE SERT QU'UNE POLICE : Outfit, livrée AVEC lui
// (`vendor/outfit/`, importée par `css/base.css`, qui la pose sur `*`). Aucune
// autre n'est chargée, ni en local ni depuis Google.
//
// CONSÉQUENCE QU'ON A PAYÉE SANS LA VOIR : une règle qui demande une police
// qu'on ne sert pas ne produit AUCUNE erreur. Le navigateur retombe en silence
// sur le repli — `system-ui`, Arial — et l'élément s'affiche dans une police
// différente de tout ce qui l'entoure. C'est ce qui se passait sur les pièces
// du bloc Scratch, qui demandaient 'Inter' : deux règles, jamais vues, parce
// qu'une police de repli ne proteste pas.
//
// CETTE ÉPREUVE EST DONC UN GARDE-FOU DE CONVENTION, et il doit citer ses
// exceptions AVEC LEUR RAISON — sinon il devient un outil qui signale dix
// écarts sans dire lesquels devraient en être. La leçon est déjà écrite dans
// `docs/frictions.md` : « un signalement n'est pas un diagnostic ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';

const DOSSIER = new URL('../css/', import.meta.url);

/**
 * CE QUI A LE DROIT DE DEMANDER AUTRE CHOSE QU'OUTFIT.
 *
 * Chaque entrée porte sa raison, et chacune a été écrite par quelqu'un qui
 * savait ce qu'il faisait :
 *
 *   · `inherit` — l'immense majorité : un élément de formulaire ou un texte
 *     SVG qui reprend ce que son parent a déjà ;
 *   · les polices à chasse fixe — un code, une chaîne dictée, un alignement de
 *     chiffres. Outfit est proportionnelle, et une grille de chiffres
 *     proportionnels ne s'aligne pas ;
 *   · Helvetica dans les DEUX aperçus d'impression — et c'est la plus
 *     intéressante. Rémy : « Souci sur l'écriture ou le rendu canvas et html
 *     est différent. » jsPDF n'a que les polices de base d'un PDF et écrit en
 *     Helvetica ; l'aperçu doit donc mentir le moins possible sur ce qui
 *     sortira de l'imprimante, et prend la police du PDF, pas celle de
 *     l'écran. Un aperçu en Outfit était faux là où il doit être fiable.
 */
const AUTORISES = [
    /^inherit$/,
    // Les familles à chasse fixe, sous leurs différentes écritures.
    /monospace/,
    // Les deux aperçus d'impression, qui prennent la police du PDF.
    /^Helvetica, Arial, 'Liberation Sans', sans-serif$/,
    /^Helvetica, Arial, sans-serif$/
];

/** Toutes les déclarations `font-family` du dépôt, fichier par fichier. */
function lesDeclarations() {
    const out = [];
    for (const f of readdirSync(DOSSIER).filter((n) => n.endsWith('.css'))) {
        const texte = readFileSync(new URL(f, DOSSIER), 'utf8');
        // ON NE LIT PAS LES COMMENTAIRES. Celui qui explique cette correction
        // CITE la police fautive — et la première version de cette épreuve
        // s'accusait elle-même. Troisième fois de la soirée ; la quatrième a
        // fait naître `sansCommentaires`, qu'on emploie ici.
        const code = sansCommentaires(texte);
        code.split('\n').forEach((ligne, i) => {
            const m = ligne.match(/font-family:\s*([^;}]+)/);
            if (m) out.push({ fichier: f, ligne: i + 1, valeur: m[1].trim() });
        });
    }
    return out;
}

test('AUCUNE RÈGLE NE DEMANDE UNE POLICE QU\'ON NE SERT PAS', () => {
    const fautives = lesDeclarations().filter((d) =>
        !/Outfit/.test(d.valeur) && !AUTORISES.some((ok) => ok.test(d.valeur)));
    assert.deepEqual(fautives, [],
        'une police non servie retombe EN SILENCE sur un repli, et l\'élément '
        + 'ne ressemble plus au reste de l\'écran :\n'
        + fautives.map((d) => `  ${d.fichier} : ${d.valeur}`).join('\n'));
});

test('ET LA POLICE DU LOGICIEL EST SERVIE AVEC LUI, PAS DEPUIS AILLEURS', () => {
    // Un collège coupe l'accès à Google Fonts, et la classe entière se retrouve
    // dans la police de repli sans que personne comprenne pourquoi. C'est la
    // raison écrite en tête de `css/base.css`.
    const base = readFileSync(new URL('base.css', DOSSIER), 'utf8');
    assert.match(base, /@import url\('\.\.\/vendor\/outfit\/outfit\.css'\)/,
        'la police doit être livrée avec le logiciel');
    for (const f of readdirSync(DOSSIER).filter((n) => n.endsWith('.css'))) {
        assert.doesNotMatch(readFileSync(new URL(f, DOSSIER), 'utf8'),
            /fonts\.googleapis\.com|fonts\.gstatic\.com/,
            `${f} va chercher une police sur le réseau`);
    }
    // ET ELLE EST POSÉE SUR `*`, ce qui rend `inherit` suffisant partout.
    assert.match(base, /\*\s*\{[^}]*font-family:\s*'Outfit'/,
        'sans cela, `font-family: inherit` ne garantit plus rien');
});
