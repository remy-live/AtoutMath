// LA RECHERCHE : UNE SEULE LISTE, CLASSÉE, QU'ON PARCOURT AU CLAVIER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « dans le mode recherche quand on appuie sur entrée il faudrait que la
// liste arrive dans l'arbre en dessous non et pas insérer le premier lien ?
// comment peut on rendre cela optimal ? »
//
// MESURÉ AVANT, en tapant « fraction » dans l'atelier du professeur :
//
//   · la liste sous le champ portait déjà les 29 résultats, chacun avec son œil
//     et son « + » ;
//   · la boîte flottante en montrait 8 — les mêmes, sans l'œil ni le « + » — et
//     elle en RECOUVRAIT 5 ;
//   · Entrée faisait passer le parcours de 0 à 1 étape.
//
// ET, EN TAPANT « addition » (tools/leTrajetDuProf.mjs) : les trois premières
// lignes étaient « Les Nombres des Pharaons », « Le Mot Juste », « Nombres
// Relatifs ». Le premier titre contenant le mot arrivait en QUATRIÈME position.
//
// CE QUE CETTE SONDE GARDE. Les quatre promesses, dans l'ordre où le professeur
// les rencontre : la liste est classée, rien ne la recouvre, Entrée n'insère
// rien, et le clavier descend puis ajoute.
//
//   node tools/rechercheAuClavier.mjs
//
import { ouvrirSonde } from '../tools/sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

const s = await ouvrirSonde({ largeur: 1400, hauteur: 900 });
await s.identifier();
await dormir(900);

/** L'état de la colonne de gauche, vu comme le professeur la voit. */
const lire = () => s.page.evaluate(() => {
    const lignes = [...document.querySelectorAll('#drill-content .exo-list-item')];
    const actif = document.activeElement;
    return {
        titres: lignes.map((e) => (e.querySelector('.exo-item-titre') || {}).textContent || ''),
        // CE QUI RECOUVRE UNE LIGNE : on interroge le point où elle s'affiche.
        //
        // UN ANCÊTRE QUI RÉPOND N'EST PAS UN RECOUVREMENT, et la première
        // version de cette sonde comptait le sien : la treizième ligne était
        // à cheval sur le bas de #nav-container, qui défile. Le conteneur
        // répondait à sa place, et la sonde criait au recouvrement là où la
        // ligne était simplement en bas de sa fenêtre de défilement. On ne
        // retient donc que ce qui se peint PAR-DESSUS — un panneau, une boîte
        // flottante —, jamais le cadre qui la contient.
        recouvertes: lignes.filter((e) => {
            const r = e.getBoundingClientRect();
            if (r.width < 2 || r.bottom < 0) return false;
            const sous = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return !!(sous && sous !== e && !e.contains(sous) && !sous.contains(e));
        }).length,
        // Plus aucune boîte flottante ne doit exister dans la page.
        flottante: document.querySelectorAll('#sidebar-search-suggestions, .rech-liste').length,
        surLigne: !!(actif && actif.classList && actif.classList.contains('exo-list-item')),
        surChamp: !!(actif && actif.id === 'sidebar-search-input'),
        focusTitre: actif && actif.querySelector
            ? ((actif.querySelector('.exo-item-titre') || {}).textContent || '') : '',
        parcours: document.querySelectorAll('#path-steps li, .path-step').length
    };
});

const champ = await s.page.$('#sidebar-search-input');
if (!champ) { console.log(rouge('pas de champ de recherche')); await s.fermer(); process.exit(1); }

// ── 1. LA LISTE EST CLASSÉE ─────────────────────────────────────────────────
await champ.click();
await champ.type('addition', { delay: 55 });
await dormir(800);
let v = await lire();
console.log(`\n\x1b[1mEN TAPANT « addition »\x1b[0m  ${v.titres.length} résultat(s)`);
console.log(gris('   ' + v.titres.slice(0, 3).join(' · ')));
const rang = v.titres.findIndex((t) => /addition/i.test(t));
// UN PROFESSEUR NE LIT PAS LES VINGT-SEPT : il lit les trois premières lignes
// et conclut. Le mot qu'il vient de taper doit donc y être.
dire('le mot tapé paraît dans les trois premiers titres', rang >= 0 && rang <= 2,
    rang < 0 ? 'nulle part' : `${rang + 1}ᵉ position`);
dire('plus aucune boîte flottante n\'existe dans la page', v.flottante === 0,
    `${v.flottante} élément(s)`);
dire('et rien ne recouvre les résultats', v.recouvertes === 0, `${v.recouvertes} ligne(s)`);

// ── 2. ENTRÉE N'INSÈRE RIEN, ELLE DESCEND ───────────────────────────────────
const avant = v.parcours;
await champ.press('Enter');
await dormir(500);
v = await lire();
console.log(`\n\x1b[1mENTRÉE\x1b[0m`);
dire('n\'insère plus rien dans le parcours', v.parcours === avant,
    `${avant} → ${v.parcours} étape(s)`);
dire('et donne la main à la première ligne', v.surLigne, v.focusTitre.trim());

// ── 3. LES FLÈCHES PARCOURENT, ENTRÉE AJOUTE ────────────────────────────────
await s.page.keyboard.press('ArrowDown');
await s.page.keyboard.press('ArrowDown');
await dormir(300);
const troisieme = await lire();
console.log(`\n\x1b[1mDEUX FLÈCHES PLUS BAS\x1b[0m`);
dire('on est sur la troisième ligne', troisieme.focusTitre === v.titres[2],
    `${troisieme.focusTitre.trim()} (attendu ${String(v.titres[2]).trim()})`);

await s.page.keyboard.press('Enter');
await dormir(900);
const apres = await lire();
dire('Entrée sur une ligne l\'ajoute au parcours', apres.parcours === avant + 1,
    `${avant} → ${apres.parcours} étape(s)`);
dire('et le focus reste sur la ligne, pour en ajouter une autre', apres.surLigne,
    apres.focusTitre.trim());

// ── 4. ÉCHAP REMONTE AU CHAMP ───────────────────────────────────────────────
await s.page.keyboard.press('Escape');
await dormir(300);
const remonte = await lire();
console.log(`\n\x1b[1mÉCHAP\x1b[0m`);
dire('rend le champ, pour corriger ce qu\'on a tapé', remonte.surChamp);

// ── 5. ON REGARDE CE QU'ON N'A PAS TOUCHÉ ───────────────────────────────────
// « Une mesure qui ne regarde que ce qu'on a corrigé ne voit pas ce qu'on a
// cassé » : sans recherche, l'arbre doit rester un arbre.
await s.page.fill('#sidebar-search-input', '');
await s.page.keyboard.press('Backspace');
await dormir(900);
const nu = await s.page.evaluate(() => ({
    fil: (document.getElementById('breadcrumb-text') || {}).textContent || '',
    dossiers: document.querySelectorAll('#drill-content .drill-item').length
}));
console.log(`\n\x1b[1mRECHERCHE EFFACÉE\x1b[0m`);
dire('le catalogue redevient un arbre de dossiers', nu.dossiers > 0,
    `${nu.dossiers} dossier(s) · « ${nu.fil.trim()} »`);

dire('aucune erreur de page, aucune fenêtre native',
    s.erreurs.length === 0 && s.fenetresNatives.length === 0,
    `${s.erreurs.length} / ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach((e) => console.log(gris('      ' + e)));
await s.photo('#sidebar-search-wrap', 'tools/tmp/recherche-apres.png', 6);
await s.fermer();
console.log(ratés ? rouge(`\n${ratés} raté(s).`) : vert('\nUNE SEULE LISTE, CLASSÉE, ET LE CLAVIER Y DESCEND.'));
process.exit(ratés ? 1 : 0);
