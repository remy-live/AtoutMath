// « SYMÉTRIQUE PAR RAPPORT À QUOI » : L'AIDE AU SURVOL EST-ELLE LÀ PARTOUT ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, à l'origine : « Les élèves ont beaucoup de mal à comprendre le concept
// de x = 6 […] si la souris passe sur une droite ou sur un point ou qu'il
// clique dessus, on a un petit tooltip visible qui donne les coordonnées du
// point ou l'équation de la droite ».
//
// Puis : « tu as bien mis l'aide quand la souris passe sur un point ou une
// droite quelque soit le niveau ? » — la réponse mesurée était « non » : la
// marche « écrire » n'avait aucune zone, l'aide y était derrière un bouton « ? ».
//
// Puis, l'ayant essayé en classe : « en fait c'est le point ? qui n'est pas
// instinctif, et qui disparaît d'ailleurs quand on clique dessus. Mets par
// défaut quand on passe ou clique dessus. » Ce que cette sonde mesure
// maintenant : les neuf combinaisons, au survol ET au clic.
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
            // ET L'ON CLIQUE POUR DE VRAI AUSSI, séparément. Rémy l'a demandé
            // deux fois — « si la souris passe […] ou qu'il clique dessus »,
            // puis « quand on passe ou clique dessus » — et ce n'était branché
            // que pour le survol. À la souris le défaut est invisible, un clic
            // étant toujours précédé d'un survol : il faut donc mesurer le
            // `pointerdown` SEUL, après avoir fait partir le survol.
            let bulleVue = 0, clicVu = 0, exemple = '';
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

                // LE CLIC SEUL, survol refermé.
                c.dispatchEvent(new PointerEvent('pointerdown',
                    { bubbles: true, pointerType: 'mouse' }));
                await new Promise(ok => setTimeout(ok, 120));
                const b2 = document.querySelector('.sy-bulle');
                if (b2 && !b2.hidden && (b2.textContent || '').trim()) clicVu++;
                c.dispatchEvent(new PointerEvent('pointerleave',
                    { bubbles: true, pointerType: 'mouse' }));
                await new Promise(ok => setTimeout(ok, 80));
            }
            return {
                candidats: tous.length, disent: disent.length, bulleVue, clicVu, exemple,
                // LE BOUTON « ? » NE DOIT PLUS EXISTER. On le cherche encore,
                // pour le dire s'il revenait : Rémy l'a retiré — « pas
                // instinctif, et il disparaît quand on clique dessus ».
                pointInterrogation: !!document.querySelector('[data-sy-ecritures], .sy-demander')
            };
        });
        // CE QU'ON JUGE EST LA BULLE QUI S'OUVRE, pas l'attribut qui la porte.
        // Un `data-dit` posé sans que rien ne l'affiche serait une aide
        // parfaitement invisible — et l'épreuve, parfaitement verte.
        const ok = vu.disent === vu.candidats && vu.candidats > 0
            && vu.bulleVue > 0 && vu.clicVu > 0;
        if (!ok) manques++;
        const marque = ok ? '\x1b[32mok  \x1b[0m' : '\x1b[33mnon \x1b[0m';
        console.log(`  ${marque} ${mode.padEnd(8)} ${taille.padEnd(8)} ${String(vu.candidats).padStart(5)}`
            + `   ${String(vu.disent).padStart(5)}   survol ${vu.bulleVue}/3   clic ${vu.clicVu}/3`
            + (vu.exemple ? `   « ${vu.exemple.slice(0, 28)} »` : '')
            + (vu.pointInterrogation ? '   \x1b[31m[le bouton ? est revenu]\x1b[0m' : ''));
    }
}

// ── ET LA MARCHE « ÉCRIRE » A GARDÉ SA ZONE DE RÉPONSE ─────────────────────
//
// LE TÉMOIN DE CETTE CORRECTION-LÀ. Supprimer le bouton « ? » voulait dire
// toucher au gabarit de la zone de saisie, où il était posé contre l'étiquette.
// Un `</div>` de travers et le champ partait avec lui — les neuf lignes
// ci-dessus resteraient vertes, et l'élève n'aurait plus où répondre.
console.log('─'.repeat(72));
await s.ouvrirExercice('geo-pavage', { reponse: 'ecrire', taille: 'moyen', especes: ['axe', 'point'] });
await dormir(1400);
const zoneDEcriture = await s.page.evaluate(() => ({
    champ: !!document.querySelector('#sy-champ'),
    valider: !!document.querySelector('[data-valider]'),
    bouton: !!document.querySelector('[data-sy-ecritures], .sy-demander')
}));
const zoneOk = zoneDEcriture.champ && zoneDEcriture.valider && !zoneDEcriture.bouton;
if (!zoneOk) manques++;
console.log(`  ${zoneOk ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'} écrire : zone de réponse   `
    + `champ ${zoneDEcriture.champ ? 'oui' : 'NON'} · bouton Valider `
    + `${zoneDEcriture.valider ? 'oui' : 'NON'} · bouton « ? » `
    + `${zoneDEcriture.bouton ? 'REVENU' : 'parti'}`);

console.log('─'.repeat(72));
console.log(manques
    ? `${manques} combinaison(s) sans aide au survol — voir le détail ci-dessus`
    : '\x1b[32mL\'AIDE EST LÀ PARTOUT, AU SURVOL ET AU CLIC, AUX TROIS MARCHES.\x1b[0m');
console.log(`erreurs de page : ${s.erreurs.length}`);
await s.fermer();
