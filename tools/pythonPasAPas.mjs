// PYTHON PAS À PAS, SUR LE CHEMIN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « des qcm et après que l'élève tape, l'aider sur
// l'indentation. Être hyper hyper hyper progressif. »
//
// ── CE QUE LES ÉPREUVES NE PEUVENT PAS DIRE ───────────────────────────────
//
// `tests/pythonDiagnostic.test.mjs` garde le vérificateur, et treize mille
// tirages disent que les propositions ne se répètent pas. Reste tout ce qui ne
// vit que dans le navigateur, et qui rend l'exercice inutilisable sans lever
// la moindre erreur :
//
//   · LE DÉCALAGE SE VOIT-IL ? C'est TOUTE la demande. Si les quatre espaces
//     de la ligne 2 rendent moins de dix pixels d'écart à l'écran, la question
//     « quelles lignes sont dans la boucle ? » n'a pas de réponse lisible —
//     et aucune erreur ne le signalera jamais ;
//   · LE PROGRAMME TIENT-IL SANS DÉFILER, sous les propositions et le pavé ?
//     Un énoncé qu'il faut faire défiler pour lire demande de retenir le code
//     de tête, ce qui est une autre question que celle qu'on pose ;
//   · LES DEUX PROGRAMMES DE LA MARCHE 12 passent-ils l'un SOUS l'autre sur un
//     téléphone ? Côte à côte, chacun ferait 190 px de large, et le décalage
//     redeviendrait invisible — la marche s'annulerait elle-même ;
//   · LE TEXTE ENTRE GUILLEMETS SE DISTINGUE-T-IL du reste ? Les trois
//     premières marches ne portent que sur cela.
//
//     node tools/pythonPasAPas.mjs
//     node tools/pythonPasAPas.mjs --photos

import { ouvrirSonde } from './sonde.mjs';

const photos = process.argv.includes('--photos');
let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

/** Ce qu'on voit du programme, EN PIXELS D'ÉCRAN. */
const regarder = (s) => s.page.evaluate(() => {
    const bloc = document.querySelector('.py-bloc');
    if (!bloc) return null;
    const lignes = [...bloc.querySelectorAll('.py-ligne')].map((l) => {
        const code = l.querySelector('.py-code');
        const texte = (code.textContent || '');
        const blancs = texte.length - texte.trimStart().length;
        // LE DÉCALAGE RÉEL SE MESURE SUR LE PREMIER CARACTÈRE VISIBLE, pas sur
        // le nombre d'espaces : c'est la distance à l'œil qui compte, et elle
        // dépend de la police que le navigateur a vraiment trouvée.
        //
        // PREMIER JET, ET IL RENDAIT ZÉRO SUR TOUTES LES LIGNES : il prenait
        // `code.firstChild`, qui n'est pas le texte mais le FILET — un span
        // vide en position absolue, posé avant le code. La mesure répondait
        // alors « aucun décalage », c'est-à-dire exactement ce que répondrait
        // un logiciel cassé. On parcourt donc les nœuds de TEXTE, dans
        // l'ordre, jusqu'à avoir franchi les espaces de tête.
        let x = code.getBoundingClientRect().left;
        if (blancs > 0) {
            const marche = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
            let vus = 0, n;
            while ((n = marche.nextNode())) {
                if (vus + n.length > blancs) {
                    const r2 = document.createRange();
                    r2.setStart(n, blancs - vus);
                    r2.setEnd(n, Math.min(blancs - vus + 1, n.length));
                    x = r2.getBoundingClientRect().left;
                    break;
                }
                vus += n.length;
            }
        }
        return { texte, blancs, x: Math.round(x),
            haut: Math.round(l.getBoundingClientRect().height) };
    });
    const r = bloc.getBoundingClientRect();
    return {
        lignes,
        large: Math.round(r.width), bas: Math.round(r.bottom),
        fenetre: window.innerHeight,
        deborde: bloc.scrollWidth > bloc.clientWidth + 1,
        filets: bloc.querySelectorAll('.py-filet').length,
        textes: bloc.querySelectorAll('.py-texte').length,
        police: getComputedStyle(bloc).fontSize
    };
});

async function surUnEcran(largeur, hauteur, nom) {
    console.log(`\n\x1b[1m${nom.toUpperCase()} — ${largeur} × ${hauteur}\x1b[0m`);
    const s = await ouvrirSonde({ largeur, hauteur });
    await s.identifier();
    const ennui = await s.ouvrirExercice('algo-python',
        { marches: ['dans-la-boucle'] }, { questions: 4 });
    if (ennui) { dire('l\'exercice s\'ouvre', false, String(ennui)); await s.fermer(); return; }
    await s.doitExister('.py-bloc');
    await s.doitExister('.py-question');
    const vu = await regarder(s);
    dire('le programme est à l\'écran', !!vu && vu.lignes.length === 4,
        vu ? `${vu.lignes.length} lignes, police ${vu.police}` : 'aucun .py-bloc');

    // ── LE DÉCALAGE, EN PIXELS ───────────────────────────────────────────
    //
    // DIX PIXELS EST LE PLANCHER, la même borne que les cotes des figures : en
    // dessous, deux lignes se lisent comme alignées, et la question « laquelle
    // est dans la boucle » n'a plus de réponse visible.
    const nue = vu.lignes.find((l) => l.blancs === 0 && l.texte.trim());
    const decalee = vu.lignes.find((l) => l.blancs > 0);
    const ecart = (decalee && nue) ? decalee.x - nue.x : 0;
    dire('et le décalage SE VOIT', ecart >= 10,
        `${ecart} px entre une ligne collée à gauche et une ligne décalée`);
    dire('un filet vertical marque chaque cran', vu.filets >= 2,
        `${vu.filets} filets`);

    // ── IL TIENT DANS L'ÉCRAN ────────────────────────────────────────────
    dire('il tient sans défilement latéral', !vu.deborde,
        vu.deborde ? `le bloc fait ${vu.large} px et déborde` : `${vu.large} px`);
    dire('et le pavé de réponses reste visible dessous', vu.bas <= vu.fenetre,
        `bas du programme à ${vu.bas} px, fenêtre ${vu.fenetre}`);
    await s.doitExister('.np-choix-btn');
    const choix = await s.page.evaluate(() => {
        const b = [...document.querySelectorAll('.np-choix-btn')];
        return { combien: b.length,
            dehors: b.filter(x => x.getBoundingClientRect().bottom > window.innerHeight).length,
            mots: b.map(x => (x.textContent || '').trim()) };
    });
    dire('les quatre propositions sont là, et toutes visibles',
        choix.combien === 4 && choix.dehors === 0,
        `${choix.combien} propositions, ${choix.dehors} hors de l'écran`);
    if (photos) await s.photo('#game-layer', `tools/tmp/python-${largeur}.png`);
    dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
    dire('aucune fenêtre native', s.fenetresNatives.length === 0,
        s.fenetresNatives.slice(0, 2).join(' | '));
    await s.fermer();
}

await surUnEcran(768, 1024, 'la tablette de Rémy');
await surUnEcran(390, 844, 'un téléphone');

// ── LE TEXTE ENTRE GUILLEMETS SE DISTINGUE DU CODE ────────────────────────
//
// Les trois premières marches ne portent QUE sur cela : print("3 + 4") affiche
// 3 + 4, print(3 + 4) affiche 7. Deux couleurs le montrent mieux qu'une
// phrase — encore faut-il qu'elles soient deux.
console.log('\n\x1b[1mLES GUILLEMETS, QUI CHANGENT TOUT\x1b[0m');
{
    const s = await ouvrirSonde({ largeur: 900, hauteur: 820 });
    await s.identifier();
    const ennui = await s.ouvrirExercice('algo-python',
        { marches: ['texte-ou-calcul'] }, { questions: 3 });
    if (ennui) dire('l\'exercice s\'ouvre', false, String(ennui));
    else {
        await s.doitExister('.py-texte');
        const vu = await s.page.evaluate(() => {
            const t = document.querySelector('.py-texte');
            const f = document.querySelector('.py-fonction');
            const lire = (e) => e ? getComputedStyle(e).color : null;
            return { texte: lire(t), fonction: lire(f),
                contenu: t ? t.textContent : '', ligne: document.querySelector('.py-code').textContent };
        });
        dire('le texte entre guillemets a sa couleur',
            vu.texte && vu.fonction && vu.texte !== vu.fonction,
            `${vu.contenu} en ${vu.texte}, print en ${vu.fonction}`);
        // ET LES GUILLEMETS EN FONT PARTIE : coloriés, ils cessent d'être
        // deux signes de ponctuation et deviennent les BORNES du texte.
        dire('et les guillemets sont dedans, pas dehors',
            /^["'].*["']$/.test(vu.contenu), `« ${vu.contenu} »`);
        if (photos) await s.photo('#game-layer', 'tools/tmp/python-guillemets.png');
        dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
    }
    await s.fermer();
}

// ── LES DEUX PROGRAMMES, SUR UN TÉLÉPHONE ─────────────────────────────────
console.log('\n\x1b[1mQUATRE ESPACES CHANGENT TOUT — sur 390 px\x1b[0m');
{
    const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
    await s.identifier();
    const ennui = await s.ouvrirExercice('algo-python',
        { marches: ['deux-programmes'] }, { questions: 3 });
    if (ennui) dire('l\'exercice s\'ouvre', false, String(ennui));
    else {
        await s.doitExister('.py-paire');
        const vu = await s.page.evaluate(() => {
            const p = [...document.querySelectorAll('.py-paire')]
                .map(x => { const r = x.getBoundingClientRect();
                    return { x: Math.round(r.left), y: Math.round(r.top),
                        large: Math.round(r.width) }; });
            const bloc = document.querySelector('.py-bloc');
            return { p, police: parseFloat(getComputedStyle(bloc).fontSize),
                noms: [...document.querySelectorAll('.py-paire-nom')]
                    .map(n => n.textContent.trim()) };
        });
        dire('les deux programmes sont là', vu.p.length === 2, vu.noms.join(' et '));
        // L'UN SOUS L'AUTRE, PAS CÔTE À CÔTE : deux colonnes de 190 px
        // réduiraient la police au point où le décalage redeviendrait
        // invisible, et la marche s'annulerait elle-même.
        dire('et ils passent l\'un SOUS l\'autre', vu.p.length === 2 && vu.p[1].y > vu.p[0].y,
            `A en y=${vu.p[0].y} (${vu.p[0].large} px), B en y=${vu.p[1].y} (${vu.p[1].large} px)`);
        dire('la police reste lisible', vu.police >= 13, `${vu.police} px`);
        if (photos) await s.photo('#game-layer', 'tools/tmp/python-deux.png');
        dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
    }
    await s.fermer();
}

console.log('\n' + '─'.repeat(68));
console.log(rates ? `\n${rates} POINT(S) À REVOIR.`
    : '\nLE DÉCALAGE SE VOIT, LE PROGRAMME TIENT, ET LES GUILLEMETS ONT LEUR COULEUR.');
process.exit(rates ? 1 : 0);
