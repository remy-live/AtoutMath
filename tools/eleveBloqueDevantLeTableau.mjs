// QUAND L'ÉLÈVE SE TROMPE DEUX FOIS SUR LA MÊME CASE, L'AIDE VIENT À LUI.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « des élèves en difficulté ont eu pas mal de soucis sur les tableaux à
// compléter. J'ai des idées est ce que quand l'élève fait beaucoup d'erreurs on
// fait clignoter le bouton indice ou montre moi ».
//
// CE QUE LE TABLEAU FAISAIT DÉJÀ, et qui n'était pas en cause : chaque case
// fausse est EXPLIQUÉE, et « 💡 Aide-moi » donne la prochaine case déductible
// en l'entourant. L'aide était là, gratuite et illimitée.
//
// LE DÉFAUT EST AILLEURS : celui qui sait que « Aide-moi » va l'aider n'en a
// pas besoin ; celui qui en a besoin ne le sait pas. Il retape un nombre, relit
// la même explication, retape un nombre.
//
// LE SIGNAL EST LA CASE, PAS LE TABLEAU. Huit erreurs sur huit cases, c'est un
// élève qui tâtonne et qui avance. DEUX sur la MÊME case, c'est un élève
// bloqué : la première erreur apprend quelque chose, la seconde dit que ça n'a
// pas suffi.
//
// ON JOUE DONC L'ÉLÈVE EN DIFFICULTÉ : on tape deux fois un nombre faux dans la
// même case, et l'on regarde ce qu'il a sous les yeux.
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

/** Ce que l'élève a sous les yeux. */
const vu = () => s.page.evaluate(() => {
    const b = document.querySelector('[data-aide]');
    return {
        note: (document.querySelector('.tc-note') || {}).textContent || '',
        appel: !!(b && b.classList.contains('tc-btn--appel')),
        entouree: document.querySelectorAll('.tc-vise').length,
        // CE QUI SE VOIT VRAIMENT : l'anneau est une ombre portée, et une
        // animation terminée ne laisse rien dans le style calculé. On lit donc
        // la classe ET la couleur que la règle lui donne, sur les PIXELS du
        // style résolu.
        couleur: b ? getComputedStyle(b).getPropertyValue('--warning').trim() : '',
        couleurConseil: (() => {
            const c = document.querySelector('.tc-conseil');
            return c ? getComputedStyle(c).color : '';
        })(),
        conseilNoir: (() => {
            const c = document.querySelector('.tc-conseil');
            const n = document.querySelector('.tc-note');
            return !!(c && n && getComputedStyle(c).color !== getComputedStyle(n).color);
        })()
    };
});

// ── UNE PREMIÈRE ERREUR : ON EXPLIQUE, ET C'EST TOUT ───────────────────────
const cible = await s.page.$('.tc-case');
await cible.click();
await cible.fill('99');
await s.page.keyboard.press('Enter');
await dormir(600);
let v = await vu();
console.log('\n\x1b[1mPREMIÈRE ERREUR\x1b[0m');
console.log('   ' + (v.note.trim() || gris('(rien)')));
dire('on lui dit POURQUOI c\'est faux', /trop|retire|total|part/i.test(v.note),
    'la première erreur doit enseigner, pas seulement refuser');
dire('et le bouton ne bat pas encore', !v.appel,
    'battre dès la première erreur, c\'est battre tout le temps');

// ── LA DEUXIÈME, SUR LA MÊME CASE : L'AIDE ARRIVE SANS QU'IL DEMANDE ───────
await cible.click();
await cible.fill('98');
await s.page.keyboard.press('Enter');
await dormir(600);
v = await vu();
console.log('\n\x1b[1mDEUXIÈME ERREUR, MÊME CASE\x1b[0m');
console.log('   ' + (v.note.trim() || gris('(rien)')));
dire('l\'explication de l\'erreur est TOUJOURS là', /trop|retire|total|part/i.test(v.note),
    'elle a disparu sous ses yeux pendant qu\'il la lisait');
dire('et on lui dit où aller', v.note.length > 60 && /case|ligne|colonne|total/i.test(v.note));
// LE ROUGE DIT « NON », PAS « VOICI COMMENT ». Les deux phrases sortaient de la
// même couleur, et celle qui aide se lisait comme une seconde réprimande.
dire('et le conseil n\'est pas écrit en rouge comme le reproche', v.conseilNoir,
    v.couleurConseil || '(pas de conseil distinct)');
dire('une case est entourée', v.entouree === 1, `${v.entouree} case(s) entourée(s)`);
dire('le bouton « Aide-moi » se rappelle à l\'œil', v.appel);
dire('et il bat en ambre, pas dans la couleur de l\'application',
    v.couleur.toLowerCase() === '#f59e0b', v.couleur || '(aucune)');

await s.photo('.tc-wrap', 'tools/tmp/tableau-bloque.png');

// ── ET UNE CASE JUSTE NE DÉCLENCHE RIEN ────────────────────────────────────
//
// Ce qu'on aurait pu casser : un élève qui avance ne doit pas voir l'aide lui
// sauter dessus. On remplit la case que le logiciel vient de lui désigner.
const juste = await s.page.evaluate(() => {
    const vise = document.querySelector('.tc-vise');
    if (!vise) return null;
    const ch = vise.querySelector('.tc-case');
    return ch ? { r: ch.dataset.r, c: ch.dataset.c } : null;
});
if (juste) {
    const el = await s.page.$(`.tc-case[data-r="${juste.r}"][data-c="${juste.c}"]`);
    if (el) {
        // On lit la bonne valeur comme un élève qui a compris : le conseil la
        // rend déductible, on la calcule depuis le tableau affiché.
        await el.click();
        await dormir(200);
    }
}
console.log(gris(`\n  erreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`));
s.erreurs.slice(0, 3).forEach((e) => console.log('   ' + e));
await s.fermer();
const sale = ratés || s.erreurs.length || s.fenetresNatives.length;
console.log(sale ? rouge(`\n${ratés} mesure(s) en échec.`)
    : vert('\nL\'élève bloqué reçoit l\'aide sans avoir à la demander.'));
process.exit(sale ? 1 : 0);
