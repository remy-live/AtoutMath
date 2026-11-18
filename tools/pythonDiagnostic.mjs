// LE VÉRIFICATEUR FRANÇAIS, CONFRONTÉ AU VRAI PYTHON.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « l'aider sur l'indentation ».
//
// `js/core/python/diagnostic.js` dit en français ce que Skulpt dit en anglais
// et de travers. Mais un vérificateur écrit à la main a DEUX façons de se
// tromper, et elles ne se voient pas de la même manière :
//
//   · IL INVENTE UNE FAUTE. Un élève voit « il manque les deux-points » sur un
//     programme juste, corrige ce qui marchait, et apprend que la machine
//     ment. C'est la faute grave, et c'est la règle écrite en tête du
//     vérificateur : ON NE REFUSE JAMAIS UN PROGRAMME CORRECT ;
//   · IL LAISSE PASSER. Moins grave : l'élève tombe alors sur le message de
//     Skulpt, qui est mauvais mais qui existe.
//
// Les épreuves de `tests/pythonDiagnostic.test.mjs` vérifient que chaque faute
// porte le bon NOM. Elles ne peuvent pas vérifier la seule chose qui compte
// ici : que le verdict soit le même que celui du vrai interpréteur. Ce que
// cette sonde fait, en chargeant Skulpt dans Chromium et en lui soumettant le
// même corpus.
//
//     node tools/pythonDiagnostic.mjs
//     node tools/pythonDiagnostic.mjs --bavard    (montre chaque programme)

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { diagnostiquer } from '../js/core/python/diagnostic.js';

const bavard = process.argv.includes('--bavard');
let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

// ── LE CORPUS ─────────────────────────────────────────────────────────────
//
// Les JUSTES couvrent ce qu'un élève de collège écrira vraiment, plus trois
// formes qui ont fait crier le premier jet du vérificateur : la liste écrite
// sur deux lignes, l'apostrophe française dans un texte, et le commentaire
// accentué.
const JUSTES = [
    'print("Bonjour")',
    'print(3 + 4)',
    'a = 5\nprint(a)',
    'a = 2\na = 5\nprint(a)',
    'n = int(input("Un nombre : "))\nprint(n * 2)',
    'n = 7\nif n > 5:\n    print("grand")\nelse:\n    print("petit")',
    'for i in range(3):\n    print(i)',
    'for i in range(3):\n    print(i)\nprint("fini")',
    'for i in range(3):\n    if i > 1:\n        print(i)\n    print("tour")',
    'def double(x):\n    return 2 * x\nprint(double(5))',
    't = [3, 1, 2]\nt.sort()\nprint(t)',
    's = 0\nfor x in [1, 2, 3]:\n    s = s + x\nprint(s)',
    'n = 5\nwhile n > 0:\n    print(n)\n    n = n - 1',
    'print("Bonjour")   # on salue l\'élève, à la française',
    'print("l\'eau bout à 100 degrés")',
    't = [1,\n     2]\nprint(t)',
    'if 2 == 2:\n    print("oui")',
    'x = 3\nif x != 4:\n    print("différent")',
    'moyenne = (12 + 14) / 2\nprint(moyenne)',
    '# un programme qui ne fait rien\nprint("")'
];

// Les FAUTIFS, avec le nom qu'on attend. Les neuf premiers sont exactement
// ceux que la mesure de Skulpt a montrés indiscernables entre eux.
const FAUTIFS = [
    ['for i in range(3):\nprint(i)', 'indentation-manquante'],
    ['print("a")\n    print("b")', 'indentation-en-trop'],
    ['for i in range(3):\n    print(i)\n  print("fin")', 'indentation-bancale'],
    ['for i in range(3)\n    print(i)', 'deux-points-oublies'],
    ['if 3 > 2\n    print("oui")', 'deux-points-oublies'],
    ['print("Bonjour"', 'parenthese-oubliee'],
    ['n = 3\nif n = 3:\n    print("oui")', 'un-seul-egal'],
    ['prénom = "Léa"\nprint(prénom)', 'accent-dans-un-nom'],
    ['print("Bonjour\')', 'chaine-ouverte'],
    ['    print("décalé")', 'premiere-ligne-decalee'],
    ['else:\n    print("sans si")', 'suite-sans-debut'],
    ['if 3 > 2:', 'bloc-vide'],
    ['print("a"))', 'parenthese-en-trop'],
    ['', 'vide'],
    ['t = [1, 2)\nprint(t)', 'parenthese-melangee']
];

// ── SKULPT, DANS LE NAVIGATEUR ────────────────────────────────────────────
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await nav.newPage();
await p.goto('about:blank');
await p.addScriptTag({ content: readFileSync('vendor/skulpt/skulpt.min.js', 'utf8') });
await p.addScriptTag({ content: readFileSync('vendor/skulpt/skulpt-stdlib.js', 'utf8') });

/** Rend `{ ok, sortie }` ou `{ ok: false, erreur }` — le verdict de Python. */
const executer = (code) => p.evaluate(([src]) => {
    const sortie = [];
    Sk.configure({
        output: (t) => sortie.push(t),
        read: (f) => {
            if (!Sk.builtinFiles || !Sk.builtinFiles.files[f]) throw new Error('pas de module : ' + f);
            return Sk.builtinFiles.files[f];
        },
        // CHAQUE `input()` REND « 7 » : la sonde ne mesure pas la saisie, elle
        // mesure si le programme TIENT DEBOUT. Un programme qui attend une
        // réponse bloquerait la mesure pour toujours.
        inputfun: () => '7',
        inputfunTakesPrompt: true,
        execLimit: 2000,
        __future__: Sk.python3
    });
    try {
        Sk.importMainWithBody('<essai>', false, src, true);
        return { ok: true, sortie: sortie.join('') };
    } catch (e) {
        return { ok: false, erreur: String(e), type: e.tp$name || '?' };
    }
}, [code]);

// ── 1. ON NE REFUSE JAMAIS UN PROGRAMME CORRECT ───────────────────────────
console.log('\n\x1b[1mLES PROGRAMMES JUSTES\x1b[0m — le vérificateur doit se taire,'
    + ' et Python doit les exécuter');
let justesVus = 0;
for (const code of JUSTES) {
    const vu = diagnostiquer(code);
    const py = await executer(code);
    const unLigne = code.replace(/\n/g, ' ⏎ ').slice(0, 54);
    if (!py.ok) {
        // LA SONDE SE MESURE AUSSI ELLE-MÊME : si Python refuse un programme
        // que j'ai rangé dans les justes, c'est MON corpus qui est faux, et
        // tout ce qui suit ne vaut rien.
        dire(`« ${unLigne} » est bien du Python`, false,
            'le corpus se trompe : ' + py.erreur);
        continue;
    }
    justesVus++;
    dire(`« ${unLigne} »`, !vu, vu ? `INVENTÉ : ${vu.faute} — ${vu.dire}` : '');
    if (bavard && py.ok) console.log(`      → ${py.sortie.replace(/\n/g, ' ⏎ ').trim()}`);
}

// ── 2. CHAQUE FAUTE PORTE SON NOM ─────────────────────────────────────────
console.log('\n\x1b[1mLES PROGRAMMES FAUTIFS\x1b[0m — le vérificateur doit nommer la faute,'
    + ' et Python doit tomber');
for (const [code, attendu] of FAUTIFS) {
    const vu = diagnostiquer(code);
    const py = code.trim() ? await executer(code) : { ok: false, erreur: '(vide)' };
    const unLigne = code.replace(/\n/g, ' ⏎ ').slice(0, 46) || '(programme vide)';
    dire(`« ${unLigne} » → ${attendu}`, vu && vu.faute === attendu,
        vu ? (vu.faute === attendu ? vu.dire : `on a dit « ${vu.faute} »`) : 'rien dit du tout');
    // ET LA CONTRE-ÉPREUVE : Python aussi doit le refuser. Une « faute » que
    // le vrai interpréteur accepte n'est pas une faute, c'est une invention —
    // la même invention que celle qu'on traque en 1, mais déguisée en règle.
    if (code.trim()) {
        dire('   et Python le refuse aussi', !py.ok,
            py.ok ? 'PYTHON L\'ACCEPTE : notre règle invente' : py.type);
    }
}

// ── 3. CE QUE LA MESURE AVAIT MONTRÉ, EN UNE LIGNE ────────────────────────
console.log('\n\x1b[1mCE QUE SKULPT DISAIT, CE QU\'ON DIT\x1b[0m');
for (const [code] of FAUTIFS.slice(0, 9)) {
    const py = await executer(code);
    const vu = diagnostiquer(code);
    console.log(`  \x1b[2m${(py.erreur || '').replace(/^.*?Error: /, '').replace(/\n/g, ' ').slice(0, 46).padEnd(46)}\x1b[0m → ${vu ? vu.dire : '(rien)'}`);
}

await nav.close();
console.log('\n' + '─'.repeat(70));
console.log(rates ? `\n${rates} POINT(S) À REVOIR.`
    : `\n${justesVus} PROGRAMMES JUSTES LAISSÉS TRANQUILLES,`
      + ` ${FAUTIFS.length} FAUTES NOMMÉES EN FRANÇAIS.`);
process.exit(rates ? 1 : 0);
