// QUAND L'ÉLÈVE EST ARRÊTÉ, ON LUI MONTRE — ON NE LUI ÉCRIT PLUS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, première demande : « des élèves en difficulté ont eu pas mal de soucis
// sur les tableaux à compléter. J'ai des idées est ce que quand l'élève fait
// beaucoup d'erreurs on fait clignoter le bouton indice ou montre moi ».
//
// PUIS, EN VOYANT CE QUE J'AVAIS FAIT : « tes phrases son tellement longues et
// compliquées elles ne seront pas lues pour le remplissage du tableau il faut
// du visuel tu sélectionnes les cellules tu montres bien ».
//
// IL TRANCHE AUTRE CHOSE QUE LA LONGUEUR. Ce n'est pas la phrase qui est trop
// longue : c'est le MÉDIA qui est faux. Un élève arrêté devant un tableau ne
// lit pas un paragraphe sur la méthode, il regarde le tableau. Un professeur,
// au tableau, ne récite pas la méthode : il pose le doigt sur la ligne, sur le
// total, sur les nombres déjà là, puis sur la case vide.
//
// LE SIGNAL RESTE LA CASE, PAS LE TABLEAU. Huit erreurs sur huit cases, c'est
// un élève qui tâtonne et qui avance ; DEUX sur la MÊME case, c'est un élève
// arrêté.
//
// ON JOUE DONC L'ÉLÈVE EN DIFFICULTÉ : deux fois un nombre faux dans la même
// case, et l'on regarde ce qu'il a sous les yeux. Puis on fait le calcul qu'on
// vient de lui montrer et l'on vérifie que la case tombe JUSTE : une opération
// montrée qui serait fausse serait pire que pas d'aide.
//
//   node tools/eleveBloqueDevantLeTableau.mjs
//
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

const s = await ouvrirSonde({ largeur: 1280, hauteur: 860 });
await s.identifier();
await s.ouvrirExercice('don-tableau-croise');
await dormir(1200);
await s.doitExister('.tc-case', 'les cases à remplir du tableau croisé');

/**
 * Ce que l'élève a sous les yeux. ON LIT LES PIXELS, pas les classes : une
 * règle renommée laisse la classe en place et éteint la couleur, et c'est
 * exactement le défaut qu'une sonde doit voir.
 */
const vu = () => s.page.evaluate(() => {
    const table = document.querySelector('.tc-table');
    const band = document.querySelector('[data-geste]');
    const cible = document.querySelector('td.tc-cible');
    const champ = cible && cible.querySelector('.tc-case');
    // UNE CASE HORS DE LA PISTE, pour mesurer l'extinction là où elle doit se
    // produire. S'il n'en reste aucune, c'est que rien n'est éteint.
    const dehors = [...document.querySelectorAll('.tc-table td')]
        .find(td => !td.classList.contains('tc-piste'));
    const bouts = [...document.querySelectorAll('[data-geste] span')]
        .map(e => ({ classe: e.className, texte: e.textContent }));
    return {
        montre: !!(table && table.classList.contains('tc-montre')),
        opaciteDehors: dehors ? Number(getComputedStyle(dehors).opacity) : 1,
        bandeVue: !!(band && !band.hidden && getComputedStyle(band).display !== 'none'),
        bouts,
        operation: bouts.map(b => b.texte).join(' '),
        // LES NOMBRES DES CASES ALLUMÉES, pour les comparer à ceux de la
        // bande : si les deux divergent, l'élève lit un calcul qui n'est pas
        // celui qu'on lui montre.
        allumees: [...document.querySelectorAll('td.tc-somme, td.tc-source')]
            .map(e => e.textContent.trim()).sort(),
        sources: document.querySelectorAll('td.tc-source').length,
        sommes: document.querySelectorAll('td.tc-somme').length,
        cibles: document.querySelectorAll('td.tc-cible').length,
        teintes: [...document.querySelectorAll('td.tc-somme, td.tc-source')]
            .map(e => getComputedStyle(e).backgroundColor),
        cibleVide: !!(champ && champ.value === ''),
        foyer: !!(champ && document.activeElement === champ),
        cibleOu: cible ? cible.getAttribute('data-cell') : '',
        note: (document.querySelector('.tc-note') || {}).textContent || '',
        appel: !!document.querySelector('[data-aide].tc-btn--appel')
    };
});

const mots = (t) => t.trim() ? t.trim().split(/\s+/).length : 0;

// ── UNE PREMIÈRE ERREUR : DEUX MOTS, ET RIEN D'AUTRE ───────────────────────
const cible = await s.page.$('.tc-case');
await cible.click();
await cible.fill('99');
await s.page.keyboard.press('Enter');
await dormir(600);
let v = await vu();
console.log('\n\x1b[1mPREMIÈRE ERREUR\x1b[0m');
console.log('   ' + (v.note.trim() || gris('(rien)')));
dire('on lui dit dans quel sens aller', /trop (grand|petit)|pas ça/i.test(v.note));
dire(`et ça tient en ${mots(v.note)} mots`, mots(v.note) <= 4,
    'Rémy : « tes phrases son tellement longues […] elles ne seront pas lues »');
dire('le tableau n\'est pas encore éteint', !v.montre,
    'montrer dès la première erreur, c\'est montrer tout le temps');
dire('et le bouton ne bat pas encore', !v.appel);

// ── LA DEUXIÈME, SUR LA MÊME CASE : ON MONTRE ──────────────────────────────
await cible.click();
await cible.fill('98');
await s.page.keyboard.press('Enter');
await dormir(1600);                 // le temps que les cases s'allument
v = await vu();
console.log('\n\x1b[1mDEUXIÈME ERREUR, MÊME CASE\x1b[0m');
console.log('   note : ' + (v.note.trim() || gris('(rien)')));
console.log('   montré : ' + (v.operation || gris('(rien)')));
dire('tout s\'éteint sauf la piste', v.montre && v.opaciteDehors < 0.3,
    `opacité hors piste : ${v.opaciteDehors}`);
dire('les cases connues sont sélectionnées', v.sources >= 1, `${v.sources} case(s)`);
dire('une seule case est désignée comme celle qui manque', v.cibles === 1,
    `${v.cibles} · ${v.cibleOu}`);
dire('et elle est VIDE : son nombre faux ne reste pas sous ses yeux', v.cibleVide);
dire('le curseur y est déjà, pour le pavé numérique', v.foyer);
dire('l\'opération est écrite en grand sous le tableau', v.bandeVue && v.bouts.length >= 3,
    v.operation);
// LES DEUX MOITIÉS DOIVENT DIRE LA MÊME CHOSE. C'est tout le mécanisme : la
// couleur d'un nombre le relie à sa case. Deux listes différentes, et le lien
// devient un piège.
const bande = v.bouts.filter(b => /g-src|g-tot/.test(b.classe)).map(b => b.texte).sort();
dire('et ses nombres sont EXACTEMENT ceux des cases allumées',
    JSON.stringify(bande) === JSON.stringify(v.allumees),
    `bande ${bande.join(',')} · cases ${v.allumees.join(',')}`);
dire('les cases allumées sont teintées, pas seulement classées',
    v.teintes.every(c => c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent'),
    v.teintes.join(' · '));
dire(`la note reste à ${mots(v.note)} mots`, mots(v.note) <= 5, v.note.trim());
dire('le bouton « Aide-moi » se rappelle à l\'œil', v.appel);

await s.photo('.tc-wrap', 'tools/tmp/tableau-montre.png');

// ── L'OPÉRATION MONTRÉE EST-ELLE JUSTE ? ───────────────────────────────────
//
// LA MESURE QUI COMPTE LE PLUS. Une aide qui montre un calcul FAUX est pire
// que pas d'aide : l'élève la suit, tombe sur un refus, et n'a plus aucune
// raison de croire le logiciel. On fait donc le calcul qu'on vient de lui
// montrer, on l'écrit dans la case montrée, et l'on exige qu'elle tombe juste.
const tot = v.bouts.find(b => /g-tot/.test(b.classe));
const src = v.bouts.filter(b => /g-src/.test(b.classe)).map(b => Number(b.texte));
const attendu = tot
    ? Number(tot.texte) - src.reduce((a, b) => a + b, 0)
    : src.reduce((a, b) => a + b, 0);
console.log(gris(`\n  le calcul montré donne ${attendu}`));
const champCible = await s.page.$('td.tc-cible .tc-case');
if (!champCible) { ratés++; console.log(rouge('  ✗ aucune case montrée où écrire')); }
else {
    await champCible.fill(String(attendu));
    await s.page.keyboard.press('Enter');
    await dormir(800);
    const apres = await s.page.evaluate(() => ({
        justes: document.querySelectorAll('td.tc-juste').length,
        faux: document.querySelectorAll('td.tc-faux').length,
        montre: !!document.querySelector('.tc-table.tc-montre'),
        bandeVue: (() => {
            const b = document.querySelector('[data-geste]');
            return !!(b && !b.hidden && getComputedStyle(b).display !== 'none');
        })(),
        vise: document.querySelectorAll('td.tc-vise').length
    }));
    dire('EN SUIVANT CE QU\'ON LUI A MONTRÉ, LA CASE TOMBE JUSTE', apres.justes >= 1,
        `${apres.justes} case(s) juste(s), ${apres.faux} fausse(s)`);
    dire('et le tableau se rallume aussitôt', !apres.montre);
    dire('l\'opération s\'efface : elle parlait d\'une case qui est faite',
        !apres.bandeVue);
    dire('la case suivante est entourée, sans qu\'on éteigne rien', apres.vise === 1,
        `${apres.vise} case(s) entourée(s)`);
}

// ── ET LE GESTE S'EFFACE QUAND IL VA TRAVAILLER AILLEURS ───────────────────
//
// Ce qu'on aurait pu casser : un tableau éteint qu'on ne rallume jamais, c'est
// un exercice illisible. On redemande l'aide, puis on clique une AUTRE case.
await s.cliquer('[data-aide]', 'le bouton « Aide-moi »');
await dormir(1400);
const rendu = await vu();
dire('« Aide-moi » montre la même chose, sans attendre d\'erreur', rendu.montre,
    rendu.operation);
const ailleurs = await s.page.$$('.tc-case:not([readonly])');
let bougé = false;
for (const ch of ailleurs) {
    const dedans = await ch.evaluate(el => !!el.closest('td.tc-cible'));
    if (dedans) continue;
    await ch.click();
    bougé = true;
    break;
}
await dormir(400);
const net = await s.page.evaluate(() => !document.querySelector('.tc-table.tc-montre'));
dire('il va ailleurs, le tableau se rallume', !bougé || net,
    bougé ? '' : 'aucune autre case libre à essayer');

console.log(gris(`\n  erreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`));
s.erreurs.slice(0, 3).forEach((e) => console.log('   ' + e));
await s.fermer();
const sale = ratés || s.erreurs.length || s.fenetresNatives.length;
console.log(sale ? rouge(`\n${ratés} mesure(s) en échec.`)
    : vert('\nL\'élève arrêté voit ce qu\'il doit faire, sans une phrase à lire.'));
process.exit(sale ? 1 : 0);
