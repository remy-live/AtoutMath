// REMPLACER UN TEXTE FRANÇAIS DANS UN FICHIER, SANS SE TROMPER DE PLACE.
//
// SEPT SCRIPTS JETABLES DANS LA SEULE JOURNÉE DU 26 SEPTEMBRE, et une dizaine
// de plus depuis. La friction est écrite dans le journal : l'outil `Edit` ne
// sait pas remplacer un texte contenant `«`, `»` ou une espace insécable, et
// l'on réécrit donc à chaque fois le même script Python de cinq lignes.
//
// DEUX PIÈGES QUE CE PETIT OUTIL FERME :
//
//   · **Le remplacement qui ne remplace rien.** `String.replace` sur un motif
//     absent rend la chaîne inchangée et s'en va content. On a écrit le
//     fichier, on n'a rien changé, et rien ne le dit. Ici, zéro occurrence est
//     une ERREUR.
//   · **Le remplacement à moitié fait.** Quand plusieurs paires sont demandées
//     et qu'une seule échoue, les précédentes ne doivent PAS rester : on écrit
//     le fichier une seule fois, à la fin, ou pas du tout. C'est exactement ce
//     que le journal reproche aux scripts Python écrits à la main, où un
//     `assert` qui tombe au milieu laisse le fichier dans un état bâtard.
//
//     node tools/remplacer.mjs <fichier> <ancien> <nouveau> [<ancien> <nouveau> …]
//     node tools/remplacer.mjs <fichier> --depuis <fichier.json>
//     node tools/remplacer.mjs <fichier> ... --combien 2     (autorise 2 occurrences)
//     node tools/remplacer.mjs <fichier> ... --voir          (ne change rien, montre)
//
// Le fichier JSON est une liste de paires : `[["ancien", "nouveau"], …]`. C'est
// le seul moyen commode de porter un texte multiligne, et il évite les
// guillemets du terminal — qui sont l'autre moitié du problème.
//
// APRÈS COUP, CET OUTIL LANCE `node --check` sur les fichiers JavaScript. Le
// piège de l'accent grave a été payé SEPT FOIS dans ce dépôt : un accent grave
// dans un commentaire, à l'intérieur d'un gabarit, ferme le gabarit, et le
// message d'erreur désigne une ligne sans rapport. Une seconde de vérification
// ici vaut le quart d'heure qu'on passe sinon à chercher au mauvais endroit.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const VOIR = args.includes('--voir');
const iCombien = args.indexOf('--combien');
const COMBIEN = iCombien >= 0 ? Number(args[iCombien + 1]) : 1;
const nus = args.filter((a, i) => !a.startsWith('--')
    && !(iCombien >= 0 && i === iCombien + 1));

const fichier = nus[0];
if (!fichier) {
    console.error('emploi : node tools/remplacer.mjs <fichier> <ancien> <nouveau> [...]');
    console.error('         node tools/remplacer.mjs <fichier> --depuis <paires.json>');
    process.exit(2);
}

let paires = [];
const iDepuis = args.indexOf('--depuis');
if (iDepuis >= 0) {
    const cheminJson = args[iDepuis + 1];
    if (!cheminJson) { console.error('--depuis attend un fichier JSON'); process.exit(2); }
    paires = JSON.parse(readFileSync(cheminJson, 'utf8'));
} else {
    const reste = nus.slice(1);
    if (!reste.length || reste.length % 2) {
        console.error('il faut un nombre PAIR de textes : <ancien> <nouveau> <ancien> <nouveau> …');
        process.exit(2);
    }

    // ── UN TEXTE DE PLUSIEURS LIGNES NE PASSE PLUS PAR LA LIGNE DE COMMANDE ──
    //
    // LE PIÈGE DE L'ACCENT GRAVE, QUATORZIÈME FOIS. Dans une chaîne entre
    // guillemets doubles, l'interpréteur de commandes EXÉCUTE ce qui est entre
    // accents graves. Un commentaire français qui cite un nom de classe entre
    // accents graves arrive donc AMPUTÉ : les mots ont disparu, le fichier est
    // syntaxiquement valide, `node --check` se tait, aucune épreuve ne le voit.
    // Seule une relecture à l'œil le trouve — et l'on ne relit pas ce qu'on
    // vient d'écrire.
    //
    // LA RÈGLE ÉTAIT DÉJÀ ÉCRITE dans CLAUDE.md, et je l'ai enfreinte deux
    // fois dans la même journée. Une règle qu'on doit se rappeler n'est pas
    // une règle : c'est un vœu. Celle-ci devient donc mécanique.
    //
    // POURQUOI LE CRITÈRE EST « PLUSIEURS LIGNES » ET NON « CONTIENT UN ACCENT
    // GRAVE » : quand l'interpréteur a fait son œuvre, les accents graves ont
    // DISPARU du texte reçu. Cet outil ne peut donc pas voir le dégât ; il ne
    // peut que fermer le chemin par lequel il arrive. Or le dégât n'arrive que
    // sur de la prose — un commentaire, une consigne —, c'est-à-dire sur du
    // multiligne. Les retouches d'une ligne, elles, restent commodes.
    const multi = reste.find((t) => t.includes('\n'));
    if (multi !== undefined) {
        console.error('Un texte de PLUSIEURS LIGNES ne passe pas par la ligne de commande :');
        console.error(`  « ${multi.split('\n')[0].slice(0, 60)}… »`);
        console.error('');
        console.error('L\'interpréteur exécute ce qui est entre accents graves, et un');
        console.error('commentaire arrive alors amputé sans que rien ne le signale.');
        console.error('Écrire les paires dans un fichier JSON, puis :');
        console.error('  node tools/remplacer.mjs ' + fichier + ' --depuis tools/tmp/paires.json');
        process.exit(2);
    }

    for (let i = 0; i < reste.length; i += 2) paires.push([reste[i], reste[i + 1]]);
}

const avant = readFileSync(fichier, 'utf8');

// --- 1. ON COMPTE TOUT D'ABORD, ON N'ÉCRIT RIEN -------------------------
//
// C'est ce qui rend l'opération tout-ou-rien : on connaît le sort de chaque
// paire avant d'avoir touché au disque.
const bilan = paires.map(([vieux, neuf]) => ({
    vieux, neuf, n: avant.split(vieux).length - 1
}));

let mauvais = 0;
bilan.forEach(({ vieux, n }, i) => {
    const ok = n === COMBIEN;
    if (!ok) mauvais++;
    const apercu = vieux.replace(/\n/g, '⏎').slice(0, 58);
    console.log(`  ${ok ? 'ok  ' : 'RATÉ'}  paire ${i + 1} : ${n} occurrence(s)`
        + `${ok ? '' : ` au lieu de ${COMBIEN}`}  « ${apercu} »`);
});

if (mauvais) {
    console.error(`\n${mauvais} paire(s) ne trouvent pas leur compte : RIEN n'est écrit.`);
    console.error('Si le texte cherché contient une apostrophe courbe, une espace insécable');
    console.error('ou des guillemets français, RELIRE le fichier plutôt que de le retaper :');
    console.error('l\'outil d\'écriture transforme certaines séquences au moment d\'écrire.');
    process.exit(1);
}

// --- 2. ON APPLIQUE, EN MÉMOIRE ------------------------------------------
let apres = avant;
for (const { vieux, neuf } of bilan) apres = apres.split(vieux).join(neuf);

if (apres === avant) {
    console.error('\nRien ne change : l\'ancien et le nouveau sont identiques.');
    process.exit(1);
}
if (VOIR) {
    console.log(`\n--voir : ${fichier} n'a PAS été modifié.`);
    process.exit(0);
}

// --- 3. ON ÉCRIT, PUIS ON VÉRIFIE LA SYNTAXE ------------------------------
writeFileSync(fichier, apres);
console.log(`\n${fichier} : ${bilan.length} remplacement(s) écrits.`);

if (/\.(mjs|js)$/.test(fichier)) {
    try {
        execFileSync('node', ['--check', fichier], { stdio: 'pipe' });
        console.log('node --check : la syntaxe tient.');
    } catch (e) {
        // ON REMET LE FICHIER. Un JavaScript cassé n'est pas un remplacement
        // réussi, et le laisser en place, c'est déplacer le problème dans le
        // commit suivant.
        writeFileSync(fichier, avant);
        console.error('\nnode --check REFUSE le fichier — il a été remis comme il était :');
        console.error(String(e.stderr || e.message).split('\n').slice(0, 6).join('\n'));
        console.error('\nSi l\'erreur désigne une ligne sans rapport, chercher un ACCENT GRAVE');
        console.error('dans un commentaire à l\'intérieur d\'un gabarit : il le ferme.');
        process.exit(1);
    }
}
