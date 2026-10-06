// « SYMÉTRIQUE PAR RAPPORT À QUOI » : L'AIDE AU SURVOL EST-ELLE LÀ PARTOUT ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, à l'origine : « Les élèves ont beaucoup de mal à comprendre le concept
// de x = 6 […] si la souris passe sur une droite ou sur un point ou qu'il
// clique dessus, on a un petit tooltip visible qui donne les coordonnées du
// point ou l'équation de la droite ».
//
// Puis, aujourd'hui : « tu as bien mis l'aide quand la souris passe sur un
// point ou une droite quelque soit le niveau ? »
//
// LA RÉPONSE NE SE LIT PAS DANS LE CODE, parce qu'elle dépend de TROIS choses
// qui se combinent : la MARCHE (choisir / cliquer / écrire), la TAILLE du
// pavage (trois à cinq candidats), et un réglage de poste qui se souvient si
// l'élève a demandé les écritures sur la marche « écrire ».
//
// On passe donc la souris sur CHAQUE candidat de CHAQUE combinaison, et l'on
// compte ceux qui disent quelque chose. Neuf combinaisons, une trentaine de
// survols — un chiffre, pas une impression.
//
//   node tools/mesureAideSymetrie.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1300, hauteur: 900 });
await s.identifier();

const MARCHES = ['choisir', 'cliquer', 'ecrire'];   // les valeurs du réglage `reponse`
const TAILLES = ['petit', 'moyen', 'grand'];
let manques = 0;

console.log('\nL\'AIDE AU SURVOL, MARCHE PAR MARCHE ET TAILLE PAR TAILLE');
console.log('─'.repeat(72));
console.log('  marche   taille   candidats   qui disent leur écriture');

for (const mode of MARCHES) {
    for (const taille of TAILLES) {
        // LE RÉGLAGE S'APPELLE `reponse`, PAS `mode`. Première version : je
        // passais `mode`, qui n'est lu que par `opts.mode` — c'est-à-dire par
        // personne quand le meneur monte l'activité. Les NEUF lignes mesuraient
        // donc la même chose : la première marche. Un réglage inventé ne jette
        // pas, il mesure autre chose, et le tableau avait l'air parfait.
        await s.ouvrirExercice('geo-pavage', { reponse: mode, taille, especes: ['axe', 'point'] });
        await dormir(1400);
        const vu = await s.page.evaluate(async () => {
            // LE CROCHET EST LU DANS LA SOURCE : `.qd-el-hit[data-dit]`
            // (js/core/activities/symetrieElement.js). Un sélecteur inventé
            // rendrait 0, c'est-à-dire la même réponse qu'une aide absente.
            const tous = [...document.querySelectorAll('.qd-el-hit')];
            const disent = tous.filter(e => e.hasAttribute('data-dit'));
            // ON SURVOLE POUR DE VRAI : la bulle n'existe qu'au `pointerenter`.
            let bulleVue = 0, exemple = '';
            for (const c of disent.slice(0, 3)) {
                c.dispatchEvent(new PointerEvent('pointerenter',
                    { bubbles: true, pointerType: 'mouse' }));
                await new Promise(ok => setTimeout(ok, 120));
                // LE NOM DE LA BULLE EST LU DANS LA SOURCE : `.sy-bulle`
                // (`brancherLaBulle`, js/core/activities/symetrieElement.js).
                // Trois noms inventés avant lui, et chacun rendait « aucune
                // bulle » — c'est-à-dire la même réponse qu'une aide absente.
                const b = document.querySelector('.sy-bulle');
                const texte = (b && !b.hidden && (b.textContent || '').trim()) || '';
                if (texte) { bulleVue++; exemple = exemple || texte; }
                c.dispatchEvent(new PointerEvent('pointerleave',
                    { bubbles: true, pointerType: 'mouse' }));
                await new Promise(ok => setTimeout(ok, 80));
            }
            return {
                candidats: tous.length, disent: disent.length, bulleVue, exemple,
                pointInterrogation: !!document.querySelector('button[aria-label*="s\'écrit"], button[aria-label*="Comment"]')
            };
        });
        // CE QU'ON JUGE EST LA BULLE QUI S'OUVRE, pas l'attribut qui la porte.
        // Un `data-dit` posé sans que rien ne l'affiche serait une aide
        // parfaitement invisible — et l'épreuve, parfaitement verte.
        const ok = vu.disent === vu.candidats && vu.candidats > 0 && vu.bulleVue > 0;
        if (!ok) manques++;
        const marque = ok ? '\x1b[32mok  \x1b[0m' : '\x1b[33mnon \x1b[0m';
        console.log(`  ${marque} ${mode.padEnd(8)} ${taille.padEnd(8)} ${String(vu.candidats).padStart(5)}`
            + `   ${String(vu.disent).padStart(5)}   bulle ${vu.bulleVue}/3`
            + (vu.exemple ? `   « ${vu.exemple.slice(0, 28)} »` : '')
            + (vu.pointInterrogation ? '   [bouton ?]' : ''));
    }
}

// ── ET SUR LA MARCHE « ÉCRIRE », APRÈS AVOIR APPUYÉ SUR « ? » ──────────────
//
// RÉMY, capture de cette marche à l'appui : « là il faudrait encore le point
// d'interrogation qui donne les coordonnées du point et de la droite ». La
// bulle n'est donc pas absente de cette marche : elle est DERRIÈRE un geste,
// pour ne pas donner à recopier ce qu'on demande d'écrire.
console.log('─'.repeat(72));
await s.ouvrirExercice('geo-pavage', { reponse: 'ecrire', taille: 'moyen', especes: ['axe', 'point'] });
await dormir(1400);
const apresLePoint = await s.page.evaluate(async () => {
    const q = [...document.querySelectorAll('button')]
        .find(b => (b.getAttribute('aria-label') || '').includes('Comment'));
    if (!q) return { raté: 'pas de bouton « ? » sur la marche écrire' };
    q.click();
    await new Promise(ok => setTimeout(ok, 700));
    const cibles = [...document.querySelectorAll('.qd-el-hit[data-dit]')];
    let bulle = '';
    if (cibles[0]) {
        cibles[0].dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
        await new Promise(ok => setTimeout(ok, 150));
        const b = document.querySelector('.sy-bulle');
        bulle = (b && !b.hidden && (b.textContent || '').trim()) || '';
    }
    return { raté: null, cibles: cibles.length, bulle };
});
if (apresLePoint.raté) {
    manques++;
    console.log(`  \x1b[31mnon \x1b[0m écrire + « ? »   ${apresLePoint.raté}`);
} else {
    const ok = apresLePoint.cibles > 0 && apresLePoint.bulle;
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'} écrire + « ? »   `
        + `${apresLePoint.cibles} candidat(s) parlent   « ${apresLePoint.bulle} »`);
}

console.log('─'.repeat(72));
console.log(manques
    ? `${manques} combinaison(s) sans aide au survol — voir le détail ci-dessus`
    : '\x1b[32mL\'AIDE EST LÀ PARTOUT : au survol sur « choisir » et « cliquer », '
      + 'derrière le « ? » sur « écrire ».\x1b[0m');
console.log(`erreurs de page : ${s.erreurs.length}`);
await s.fermer();
