// LE MENU DE GAUCHE SUR TÉLÉPHONE — « c'est le bazar en haut, et je n'arrive
// plus à le fermer ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture d'un iPhone à l'appui : « Sur portable quand j'ouvre le menu de
// gauche c'est le bazar en haut et surtout je n'arrive plus à le fermer ».
//
// DEUX CHOSES À MESURER, ET LA SECONDE EST LA GRAVE :
//
//   · LA BARRE DU HAUT. Sur sa capture, la pastille « Prof » chevauche son
//     icône, et il manque le titre. Une barre qui déborde ne se voit pas dans
//     le code : il faut les RECTANGLES, et les comparer deux à deux.
//   · LA SORTIE. Le tiroir ouvert doit pouvoir se refermer — par le ☰, par la
//     poignée, ou par le voile. S'il n'en reste aucun sous le doigt, l'élève
//     ou le professeur est enfermé, et c'est tout ce qui compte.
//
// ON MESURE EN MODE PROFESSEUR : la poignée du tiroir n'existe que là, et
// c'est l'écran de Rémy.
//
//     node tools/menuDuTelephone.mjs
//
// 390 × 844 : l'iPhone. `ouvrirSonde` y pose `hasTouch` et `isMobile` tout
// seul — une cible tactile ne se mesure pas avec une souris.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
await s.identifier();

let manques = 0;
const dire = (ok, texte) => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${texte}`);
};

// ── ON SE MET EN PROFESSEUR, comme lui ─────────────────────────────────────
await s.doitExister('#btn-role', 'la pastille qui bascule élève / professeur');
const role = () => s.page.evaluate(() =>
    (document.getElementById('role-badge-nom') || {}).textContent || '');
if (!/prof/i.test(await role())) {
    await s.page.click('#btn-role');
    await dormir(900);
}
console.log(`  rôle : « ${(await role()).trim()} »`);

/**
 * LES RECTANGLES DE LA BARRE DU HAUT, et ce qui se chevauche.
 *
 * ON NE REGARDE QUE CE QUI SE VOIT : un bouton caché par le CSS a bien un
 * rectangle, et le compter ferait crier la sonde sur une barre parfaite.
 */
const barreDuHaut = () => s.page.evaluate(() => {
    const nav = document.getElementById('top-navbar');
    if (!nav) return null;
    const visibles = [...nav.querySelectorAll('button, .title, .role-badge, [id]')]
        .filter(el => {
            const c = getComputedStyle(el);
            if (c.display === 'none' || c.visibility === 'hidden' || Number(c.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 1 && r.height > 1;
        })
        // ON NE GARDE QUE LES FEUILLES, et la première version s'est trompée :
        // elle écartait les éléments contenant un BOUTON, mais la pastille de
        // rôle EST un bouton qui contient un `span` mesuré — la sonde
        // annonçait donc « btn-role chevauche role-badge-nom », ce qui est la
        // définition d'un enfant. On écarte maintenant tout élément qui en
        // contient un autre de la liste, quel qu'il soit.
        ;
    const feuilles = visibles.filter(el => !visibles.some(x => x !== el && el.contains(x)));
    const boite = (el) => {
        const r = el.getBoundingClientRect();
        return {
            quoi: el.id || el.className || el.tagName,
            texte: (el.textContent || '').trim().slice(0, 14),
            x: Math.round(r.x), y: Math.round(r.y),
            l: Math.round(r.width), h: Math.round(r.height),
            droite: Math.round(r.right), bas: Math.round(r.bottom)
        };
    };
    const items = feuilles.map(boite);
    const chevauchements = [];
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            const a = items[i], b = items[j];
            const dx = Math.min(a.droite, b.droite) - Math.max(a.x, b.x);
            const dy = Math.min(a.bas, b.bas) - Math.max(a.y, b.y);
            // DEUX PIXELS DE TOLÉRANCE : des bordures qui se touchent ne sont
            // pas un chevauchement, et un arrondi de sous-pixel non plus.
            if (dx > 2 && dy > 2) {
                chevauchements.push(`${a.quoi} « ${a.texte} » × ${b.quoi} « ${b.texte} » `
                    + `(${Math.round(dx)}×${Math.round(dy)} px)`);
            }
        }
    }
    const r = nav.getBoundingClientRect();
    return {
        items, chevauchements,
        deborde: Math.round(nav.scrollWidth - nav.clientWidth),
        horsEcran: items.filter(i => i.droite > window.innerWidth + 1 || i.x < -1)
            .map(i => `${i.quoi} « ${i.texte} »`),
        hauteur: Math.round(r.height)
    };
});

// ── 1. LA BARRE, TIROIR FERMÉ ──────────────────────────────────────────────
console.log('\n\x1b[1mLA BARRE DU HAUT, tiroir fermé\x1b[0m');
let barre = await barreDuHaut();
if (!barre) throw new Error('pas de #top-navbar : le crochet ne désigne rien');
const direLaBarre = (b) => b.items.forEach(i => console.log(`    ${String(i.quoi).padEnd(24)} `
    + `x=${String(i.x).padStart(4)} y=${String(i.y).padStart(3)} `
    + `l=${String(i.l).padStart(3)} « ${i.texte} »`));
direLaBarre(barre);
dire(!barre.chevauchements.length,
    barre.chevauchements.length
        ? `${barre.chevauchements.length} chevauchement(s) : ${barre.chevauchements.join(' · ')}`
        : 'rien ne se chevauche dans la barre');
dire(barre.deborde <= 1, `la barre ne déborde pas en largeur (${barre.deborde} px de trop)`);
dire(!barre.horsEcran.length,
    barre.horsEcran.length ? `hors de l'écran : ${barre.horsEcran.join(', ')}`
        : 'tout tient dans les 390 px');
await s.photo('#top-navbar', 'tools/tmp/menu-barre-fermee.png', 0);

// ── 2. ON OUVRE LE MENU, comme lui ─────────────────────────────────────────
console.log('\n\x1b[1mON OUVRE LE MENU DE GAUCHE\x1b[0m');
await s.doitExister('#btn-toggle-sidebar', 'le ☰ qui ouvre le menu');
await s.page.click('#btn-toggle-sidebar');
await dormir(800);

const etatTiroir = () => s.page.evaluate(() => {
    const sb = document.getElementById('sidebar');
    const r = sb ? sb.getBoundingClientRect() : null;
    return {
        ouvert: !!(sb && sb.classList.contains('drawer-open')),
        voile: document.body.classList.contains('tiroir-ouvert'),
        large: r ? Math.round(r.width) : 0,
        gauche: r ? Math.round(r.x) : 0,
        // CE QUI RESTE VISIBLE DU RESTE DE LA PAGE, à droite du tiroir.
        reste: Math.round(window.innerWidth - (r ? r.right : 0))
    };
});
let t = await etatTiroir();
console.log(`  tiroir : ${t.ouvert ? 'ouvert' : 'FERMÉ'} · large de ${t.large} px `
    + `· il reste ${t.reste} px de page à droite · voile : ${t.voile ? 'oui' : 'non'}`);
dire(t.ouvert, 'le ☰ ouvre bien le menu');
await s.photo('body', 'tools/tmp/menu-ouvert.png', 0);

barre = await barreDuHaut();
dire(!barre.chevauchements.length,
    barre.chevauchements.length
        ? `menu ouvert, ${barre.chevauchements.length} chevauchement(s) : `
            + barre.chevauchements.join(' · ')
        : 'la barre du haut tient encore');

// ── 3. ET SURTOUT : PEUT-ON LE REFERMER ? ──────────────────────────────────
//
// « surtout je n'arrive plus à le fermer ». C'est la mesure qui compte : on
// essaie LES TROIS SORTIES, l'une après l'autre, en rouvrant entre chaque.
console.log('\n\x1b[1mLES SORTIES — on essaie les trois\x1b[0m');

/** Rouvre le tiroir s'il est fermé, pour que l'essai suivant ait lieu. */
async function rouvrir() {
    if (!(await etatTiroir()).ouvert) {
        await s.page.click('#btn-toggle-sidebar');
        await dormir(700);
    }
}

/** Un geste, et ce qu'il advient du tiroir. `null` si rien à toucher. */
async function essayerDeFermer(nom, faire) {
    await rouvrir();
    const avant = await etatTiroir();
    if (!avant.ouvert) return { nom, possible: false, raison: 'le tiroir ne s\'ouvre plus' };
    let touche;
    try { touche = await faire(); } catch (e) { touche = 'ERREUR: ' + e.message.slice(0, 60); }
    await dormir(800);
    const apres = await etatTiroir();
    return { nom, possible: touche !== null, touche, ferme: !apres.ouvert };
}

const sorties = [];

// a) le ☰ lui-même
sorties.push(await essayerDeFermer('le ☰', async () => {
    const vu = await s.page.evaluate(() => {
        const b = document.getElementById('btn-toggle-sidebar');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        const c = getComputedStyle(b);
        if (c.display === 'none' || c.visibility === 'hidden') return null;
        // CE QUI EST SOUS LE DOIGT AU CENTRE DU BOUTON : un bouton recouvert
        // par le tiroir a un rectangle parfait et ne reçoit rien.
        const dessus = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { recouvert: !(dessus === b || b.contains(dessus)),
            qui: dessus ? (dessus.id || dessus.className || dessus.tagName) : 'rien',
            x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!vu) return null;
    if (vu.recouvert) return `recouvert par ${vu.qui}`;
    await s.page.mouse.click(vu.x, vu.y);
    return 'cliqué';
}));

// b) la poignée du tiroir
sorties.push(await essayerDeFermer('la poignée', async () => {
    const vu = await s.page.evaluate(() => {
        const h = document.getElementById('drawer-handle');
        if (!h) return null;
        const c = getComputedStyle(h);
        if (c.display === 'none' || c.visibility === 'hidden') return null;
        const r = h.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return null;
        return { x: r.x + r.width / 2, y: r.y + r.height / 2,
            dansLEcran: r.y >= 0 && r.bottom <= window.innerHeight };
    });
    if (!vu) return null;
    if (!vu.dansLEcran) return 'hors de l\'écran';
    await s.page.mouse.click(vu.x, vu.y);
    return 'cliquée';
}));

// c) le voile, à droite du tiroir — « le voile sert aussi de zone à toucher
//    pour refermer, ce qui est le geste qu'on cherche »
sorties.push(await essayerDeFermer('le voile à droite', async () => {
    const e = await etatTiroir();
    if (e.reste < 10) return null;
    await s.page.mouse.click(390 - Math.min(20, e.reste / 2), 300);
    return 'touché';
}));

sorties.forEach(x => {
    // UNE SORTIE QUI N'EXISTE PAS N'EST PAS UNE SORTIE CASSÉE. Le voile n'a
    // rien à toucher quand le tiroir couvre tout l'écran : c'est la
    // présentation voulue, pas un défaut. On le DIT sans compter un manque —
    // ce qui compte est plus bas : en reste-t-il AU MOINS UNE.
    const dit = !x.possible ? 'sans objet ici'
        : (x.ferme ? 'ferme le tiroir' : `NE FERME PAS (${x.touche})`);
    console.log(`  ${x.ferme ? '\x1b[32mok  \x1b[0m' : '\x1b[33m····\x1b[0m '}`
        + `${x.nom.padEnd(18)} ${dit}`);
    if (x.possible && !x.ferme) manques++;
});
dire(sorties.some(x => x.ferme), 'IL EXISTE AU MOINS UNE SORTIE');

// ── 4. LE TÉLÉPHONE ÉPINGLÉ EN « VUE ORDINATEUR » ──────────────────────────
//
// C'EST L'ÉCRAN DE SA CAPTURE, et il ne ressemble pas au nôtre : chez lui le
// menu NE COUVRE PAS l'écran, la page est en DEUX COLONNES écrasées, et rien
// ne referme. Un seul réglage produit cela — `mathbox-device` dans le stockage
// local, que le bouton 📱 de la palette de test écrit DÉFINITIVEMENT :
//
//     state.isMobileView = choix ? choix === 'mobile' : telephonePortrait();
//
// Le choix mémorisé l'emporte sur la détection, pour toujours. Et tout le
// tiroir — la feuille coulissante, la poignée, le voile — vit sous
// `body.mobile-view.teacher-mode` : sans la classe, le ☰ bascule une classe
// que plus aucune règle ne lit.
console.log('\n\x1b[1mLE TÉLÉPHONE ÉPINGLÉ EN VUE ORDINATEUR\x1b[0m');
await s.page.evaluate(() => {
    try { localStorage.setItem('mathbox-device', 'desktop'); } catch (e) { /* privée */ }
});
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(900);
if (!/prof/i.test(await role())) { await s.page.click('#btn-role'); await dormir(900); }

const epingle = await s.page.evaluate(() => {
    const sb = document.getElementById('sidebar');
    const ma = document.getElementById('main-area');
    const r = sb ? sb.getBoundingClientRect() : null;
    const m = ma ? ma.getBoundingClientRect() : null;
    const vu = (el) => el && getComputedStyle(el).display !== 'none'
        && el.getBoundingClientRect().width > 1;
    return {
        mobileView: document.body.classList.contains('mobile-view'),
        menuVisible: vu(sb), menuLarge: r ? Math.round(r.width) : 0,
        pageLarge: m && vu(ma) ? Math.round(m.width) : 0,
        // La page déborde-t-elle de l'écran ?
        deborde: Math.round(document.documentElement.scrollWidth - window.innerWidth),
        poignee: vu(document.getElementById('drawer-handle'))
    };
});
console.log(`  mobile-view : ${epingle.mobileView ? 'oui' : 'NON'} · menu ${epingle.menuLarge} px `
    + `· page ${epingle.pageLarge} px · poignée : ${epingle.poignee ? 'oui' : 'NON'} `
    + `· débordement ${epingle.deborde} px`);
await s.photo('body', 'tools/tmp/menu-epingle.png', 0);

// LA GARDE EST LÀ, et c'est la seule qui compte : un choix « ordinateur »
// mémorisé ne doit plus pouvoir retirer à un téléphone la présentation dont il
// a besoin. Tout le reste — le tiroir, la poignée, les deux rangées de la
// barre, le plein écran retiré — est écrit sous `body.mobile-view` et suit.
dire(epingle.mobileView,
    'un « ordinateur » mémorisé ne dépouille plus le téléphone de sa présentation');
dire(epingle.poignee, 'la poignée du tiroir est là');
dire(epingle.pageLarge >= 300,
    `la page occupe l'écran (${epingle.pageLarge} px) au lieu d'une colonne écrasée`);

// ET LE TIROIR MARCHE ENCORE DANS CET ÉTAT.
await s.page.click('#btn-toggle-sidebar');
await dormir(800);
const ouvertEpingle = (await etatTiroir()).ouvert;
await s.page.click('#btn-toggle-sidebar');
await dormir(800);
dire(ouvertEpingle && !(await etatTiroir()).ouvert,
    'le ☰ ouvre ET referme, même avec le réglage mémorisé');

// ── 5. ET L'AUTRE SENS RESTE POSSIBLE ──────────────────────────────────────
//
// « mobile » sur un grand écran est UTILE : c'est ainsi qu'on regarde la
// présentation du téléphone sans téléphone. La règle est asymétrique exprès,
// et une correction qui l'aurait rendue symétrique aurait retiré cet usage
// sans que personne ne s'en aperçoive avant longtemps.
console.log('\n\x1b[1mL\'AUTRE SENS — « mobile » demandé sur un grand écran\x1b[0m');
await s.page.setViewportSize({ width: 1280, height: 900 });
await s.page.evaluate(() => {
    try { localStorage.setItem('mathbox-device', 'mobile'); } catch (e) { /* privée */ }
});
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(900);
const surGrandEcran = await s.page.evaluate(() => ({
    mobileView: document.body.classList.contains('mobile-view'),
    large: window.innerWidth
}));
dire(surGrandEcran.mobileView,
    `« mobile » demandé est honoré sur un écran de ${surGrandEcran.large} px`);
await s.page.setViewportSize({ width: 390, height: 844 });
const barreEpinglee = await barreDuHaut();
direLaBarre(barreEpinglee);
dire(!barreEpinglee.chevauchements.length,
    barreEpinglee.chevauchements.length
        ? `${barreEpinglee.chevauchements.length} chevauchement(s) : `
            + barreEpinglee.chevauchements.join(' · ')
        : 'la barre du haut tient aussi dans cet état');
dire(barreEpinglee.deborde <= 1,
    `la barre ne déborde pas (${barreEpinglee.deborde} px de trop)`);

console.log('\n' + '─'.repeat(74));
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(e => console.log('  ' + e));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre.\x1b[0m`
    : '\x1b[32mLA BARRE TIENT, ET LE MENU SE REFERME.\x1b[0m');
await s.fermer();
process.exitCode = manques || s.fenetresNatives.length || s.erreurs.length ? 1 : 0;
