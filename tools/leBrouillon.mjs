// LE BROUILLON, PAR LE CHEMIN DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, première passe : « Dans le menu à côté du robot, avoir un mode
// brouillon pour poser son calcul », puis ses quatre arbitrages : « 1/ pas de
// persistance. 2/ Non [le professeur ne le voit pas], 3/ ok [« Poser » éteint
// par exercice], 4 oui [le crayon libre reste] ».
//
// DEUXIÈME PASSE, APRÈS L'AVOIR ESSAYÉ : « pour les chiffres des opérations du
// brouillon, il faudrait pouvoir les taper, tu oublies les retenues et il y a
// deux méthodes pour les soustractions et les chiffres je préfère du drag drop
// en supplément du clic pour le nombres. Pour le calcul, l'élève tape son
// calcul (une addition peut avoir plusieurs membres) et on peut avoir plusieurs
// calculs dans le brouillon », puis : « et pour le dessiner autorise le undo
// redo, et lisse le trait libre ».
//
// ── CE QUI NE SE VÉRIFIE QU'ICI ────────────────────────────────────────────
//
// Trois des quatre arbitrages sont des promesses NÉGATIVES — rien n'est gardé,
// rien n'est envoyé, rien n'est regardé — et une promesse négative ne se lit
// pas dans le code : il faudrait avoir lu TOUT le code. On la mesure donc par
// son effet : on compte les événements du journal et les clefs du stockage
// AVANT et APRÈS avoir rempli la feuille, et l'on exige zéro de différence.
//
// Et les trois gestes du chiffre — toucher, taper, glisser — ne se prouvent
// qu'en les faisant.
//
//   node tools/leBrouillon.mjs [largeur]
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const LARGEUR = Number(process.argv[2]) || 390;

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

// DEUX EXERCICES, ET C'EST LE CONTRASTE QUI PROUVE LE RÉGLAGE : « Le Tour du
// Rectangle » n'est pas du calcul mental — « Poser » y est offert ; « Additions
// Mystères » l'est — il n'y est pas.
const AVEC = 'mes-perimetre';
const SANS = 'calc-add';

const s = await ouvrirSonde({ largeur: LARGEUR, hauteur: 900 });
await s.identifier();

/** Ce que le navigateur garde de l'élève, compté. */
const empreinte = () => s.page.evaluate(async () => {
    const { journal } = await import('./js/core/journal.js');
    let clefs = [];
    try { clefs = Object.keys(window.localStorage); } catch (e) { clefs = ['(refusé)']; }
    return {
        evenements: journal.all().length,
        clefs: clefs.length,
        // AUCUNE CLEF NE DOIT PORTER SON NOM : c'est la façon la plus directe
        // de voir une persistance qu'on n'a pas voulue.
        sonNom: clefs.filter(k => /brouillon/i.test(k))
    };
});

/** Pose un calcul comme l'élève : on écrit la ligne, on touche « Poser ». */
async function poser(ligne) {
    await s.page.fill('.br-saisie', ligne);
    await s.cliquer('[data-br-poser]', 'le bouton « Poser »');
    await dormir(600);
}

// ── 1. LE BOUTON EXISTE, ET LA FEUILLE S'OUVRE ─────────────────────────────
console.log('\n\x1b[1mIL OUVRE SON BROUILLON\x1b[0m');
const raté = await s.ouvrirExercice(AVEC);
dire('l\'exercice s\'ouvre', !raté, raté || AVEC);
await dormir(1200);

const avant = await empreinte();
const bouton = await s.page.evaluate(() => {
    const b = document.getElementById('btn-game-brouillon');
    const r = b ? b.getBoundingClientRect() : null;
    return { visible: !!(r && r.width > 0 && r.height > 0), auDoigt: !!(r && r.height >= 44) };
});
dire('LE BOUTON EST DANS LA BARRE, À CÔTÉ DU ROBOT', bouton.visible, JSON.stringify(bouton));
dire('et il se touche au doigt', bouton.auDoigt);

await s.cliquer('#btn-game-brouillon', 'le bouton du brouillon');
await dormir(900);
await s.doitExister('#brouillon', 'la feuille de brouillon');

const ouverte = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    const r = f.getBoundingClientRect();
    const q = document.querySelector('#game-board .game-question');
    const rq = q ? q.getBoundingClientRect() : null;
    return {
        vue: r.width > 0 && r.height > 0,
        onglets: [...f.querySelectorAll('[data-br-outil]')].map(b => b.textContent.trim()),
        // L'ÉNONCÉ RESTE-T-IL LISIBLE ? C'est la promesse de la feuille qui
        // monte du bas plutôt que de couvrir.
        enonce: rq ? { bas: Math.round(rq.bottom), hautFeuille: Math.round(r.top) } : null,
        // ET LES NOMBRES DE L'ÉNONCÉ SONT À PORTÉE DE DOIGT.
        chiffresOfferts: [...f.querySelectorAll('[data-br-nombre]')].map(b => b.textContent.trim())
    };
});
console.log(`   ${JSON.stringify(ouverte)}`);
dire('LA FEUILLE EST LÀ', ouverte.vue);
dire('elle porte les trois outils', ouverte.onglets.length === 3, ouverte.onglets.join(' · '));
dire('ET L\'ÉNONCÉ RESTE LISIBLE AU-DESSUS',
    !!ouverte.enonce && ouverte.enonce.bas <= ouverte.enonce.hautFeuille,
    JSON.stringify(ouverte.enonce));
dire('les nombres de l\'énoncé sont offerts', ouverte.chiffresOfferts.length >= 1,
    ouverte.chiffresOfferts.join(' · '));

// ── 2. IL TAPE SON CALCUL, À PLUSIEURS MEMBRES ─────────────────────────────
console.log('\n\x1b[1mIL ÉCRIT « 12 + 34 + 5 »\x1b[0m');
await poser('12 + 34 + 5');
const pose = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    const cadre = f.querySelector('.br-calcul');
    const donnees = cadre ? [...cadre.querySelectorAll('.br-ligne')].filter(
        l => l.querySelector('.br-case--donnee')).length : 0;
    const libres = cadre ? [...cadre.querySelectorAll('.br-case[data-br-case]')] : [];
    const retenue = cadre ? cadre.querySelector('.br-case--petite') : null;
    return {
        cadres: f.querySelectorAll('.br-calcul').length,
        dit: cadre ? cadre.querySelector('.br-calcul-dit').textContent.trim() : '',
        lignesDeNombres: donnees,
        libres: libres.length,
        // LA GRILLE NE CALCULE PAS : aucune case libre n'est remplie.
        remplies: libres.filter(c => (c.textContent || '').trim()).length,
        // ET LES RETENUES SE VOIENT, MÊME VIDES — c'était le reproche.
        retenues: cadre ? cadre.querySelectorAll('.br-case--petite').length : 0,
        bordRetenue: retenue ? getComputedStyle(retenue).borderTopStyle : null,
        pave: f.querySelectorAll('.br-touche').length
    };
});
console.log(`   ${JSON.stringify(pose)}`);
dire('LE CADRE SE POSE', pose.cadres === 1, pose.dit);
dire('ET IL PORTE LES TROIS MEMBRES', pose.lignesDeNombres === 3, `${pose.lignesDeNombres} lignes`);
dire('LA GRILLE NE CALCULE RIEN', pose.remplies === 0, `${pose.remplies} case(s) remplie(s)`);
dire('LES RETENUES ONT LEUR CASE, ET ELLE SE VOIT',
    pose.retenues >= 2 && pose.bordRetenue === 'dashed',
    `${pose.retenues} case(s), bord « ${pose.bordRetenue} »`);
dire('le pavé de chiffres est dans la feuille', pose.pave === 12, `${pose.pave} touches`);

// ── 3. LES TROIS GESTES DU CHIFFRE ─────────────────────────────────────────
console.log('\n\x1b[1mTOUCHER, TAPER, GLISSER\x1b[0m');
const touche = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    const c = f.querySelector('.br-case[data-br-case]');
    c.click();
    const t = [...f.querySelectorAll('.br-touche')].find(x => x.textContent.trim() === '7');
    t.click();
    const k = c.dataset.brCase;
    const apres = f.querySelector(`.br-case[data-br-case="${k}"]`);
    return apres ? (apres.textContent || '').trim() : null;
});
dire('ON TOUCHE UNE CASE, PUIS UN CHIFFRE', touche === '7', String(touche));

// AU CLAVIER : la case a le foyer, on tape. C'est la première demande de la
// deuxième passe — « il faudrait pouvoir les taper ».
const tape = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    const cases = [...f.querySelectorAll('.br-case[data-br-case]')];
    const c = cases[1];
    c.focus();
    return c.dataset.brCase;
});
await s.page.keyboard.press('4');
await dormir(400);
const apresFrappe = await s.page.evaluate((k) => {
    const el = document.querySelector(`#brouillon .br-case[data-br-case="${k}"]`);
    return el ? (el.textContent || '').trim() : null;
}, tape);
dire('ON TAPE AU CLAVIER DANS LA CASE QUI A LE FOYER', apresFrappe === '4', String(apresFrappe));

// EN GLISSANT : « je préfère du drag drop en supplément du clic ».
const cible = await s.page.evaluate(() => {
    const cases = [...document.querySelectorAll('#brouillon .br-case[data-br-case]')];
    const c = cases[2];
    return c ? c.dataset.brCase : null;
});
const bb = async (sel) => s.page.locator(sel).first().boundingBox();
const source = await bb('#brouillon .br-touche:nth-child(5)');   // la touche « 5 »
const arrivee = await bb(`#brouillon .br-case[data-br-case="${cible}"]`);
if (source && arrivee) {
    await s.page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await s.page.mouse.down();
    await s.page.mouse.move(arrivee.x + arrivee.width / 2, arrivee.y + arrivee.height / 2,
        { steps: 12 });
    await s.page.mouse.up();
    await dormir(600);
}
const apresGlisse = await s.page.evaluate((k) => {
    const el = document.querySelector(`#brouillon .br-case[data-br-case="${k}"]`);
    return el ? (el.textContent || '').trim() : null;
}, cible);
dire('ON GLISSE UN CHIFFRE DU PAVÉ DANS UNE CASE', apresGlisse === '5', String(apresGlisse));

// ── 4. PLUSIEURS CALCULS, ET LES DEUX MÉTHODES DE SOUSTRACTION ─────────────
console.log('\n\x1b[1mUNE SOUSTRACTION EN PLUS, ET SES DEUX MÉTHODES\x1b[0m');
await poser('7106 - 4709');
const deux = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    const cadres = [...f.querySelectorAll('.br-calcul')];
    const sous = cadres[cadres.length - 1];
    return {
        cadres: cadres.length,
        // LE PREMIER CALCUL A GARDÉ SES CHIFFRES : une feuille de brouillon ne
        // s'efface pas parce qu'on en pose un second.
        premierGarde: [...cadres[0].querySelectorAll('.br-case[data-br-case]')].length,
        marques: sous.querySelectorAll('.br-marque').length,
        methode: sous.querySelector('[data-br-methode]')
            ? sous.querySelector('[data-br-methode]').textContent.trim() : null
    };
});
console.log(`   ${JSON.stringify(deux)}`);
dire('DEUX CALCULS TIENNENT SUR LA FEUILLE', deux.cadres === 2, `${deux.cadres} cadres`);
dire('LA COMPENSATION A SES MARQUES DEVANT LES CHIFFRES', deux.marques >= 4,
    `${deux.marques} marque(s)`);
dire('et la méthode se dit', /compensation/i.test(String(deux.methode)), String(deux.methode));

await s.cliquer('[data-br-methode]', 'le bouton de la méthode');
await dormir(600);
const emprunt = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    const sous = [...f.querySelectorAll('.br-calcul')].pop();
    const dessus = [...sous.querySelectorAll('.br-case--petite')];
    return {
        methode: sous.querySelector('[data-br-methode]').textContent.trim(),
        marques: sous.querySelectorAll('.br-marque').length,
        auDessus: dessus.length,
        cle: dessus.length ? dessus[dessus.length - 1].dataset.brCase : null
    };
});
console.log(`   ${JSON.stringify(emprunt)}`);
dire('L\'AUTRE MÉTHODE ÉCRIT AU-DESSUS', /emprunt/i.test(emprunt.methode) && emprunt.auDessus >= 2,
    `${emprunt.methode} · ${emprunt.auDessus} case(s) au-dessus`);
dire('et les marques de la compensation s\'en vont', emprunt.marques === 0,
    `${emprunt.marques} marque(s)`);

// ON ÉCRIT AU-DESSUS, ET LE CHIFFRE DU DESSOUS SE BARRE.
const barre = await s.page.evaluate((k) => {
    const sous = [...document.querySelectorAll('#brouillon .br-calcul')].pop();
    const c = sous.querySelector(`.br-case[data-br-case="${k}"]`);
    if (!c) return null;
    c.click();
    const t = [...document.querySelectorAll('#brouillon .br-touche')]
        .find(x => x.textContent.trim() === '9');
    t.click();
    const apres = [...document.querySelectorAll('#brouillon .br-calcul')].pop();
    return apres.querySelectorAll('.br-case--barree').length;
}, emprunt.cle);
dire('ÉCRIRE AU-DESSUS BARRE LE CHIFFRE — c\'est le geste de l\'emprunt',
    barre >= 1, `${barre} chiffre(s) barré(s)`);

// ── 5. RIEN N'EN SORT ──────────────────────────────────────────────────────
console.log('\n\x1b[1mCE QUI EN SORT\x1b[0m');
const apres = await empreinte();
console.log(`   avant ${JSON.stringify(avant)}\n   après ${JSON.stringify(apres)}`);
dire('AUCUN ÉVÉNEMENT N\'EST PARTI AU JOURNAL',
    apres.evenements === avant.evenements, `${avant.evenements} → ${apres.evenements}`);
dire('AUCUNE CLEF N\'A ÉTÉ POSÉE DANS LE STOCKAGE',
    apres.clefs === avant.clefs, `${avant.clefs} → ${apres.clefs}`);
dire('et rien ne porte son nom', apres.sonNom.length === 0, apres.sonNom.join(', '));
await s.photo('#brouillon', `tools/tmp/brouillon-poser-${LARGEUR}.png`);

// ── 6. DESSINER : LES DEUX CRAYONS, LE LISSAGE, L'HISTOIRE ─────────────────
console.log('\n\x1b[1mIL DESSINE\x1b[0m');
await s.cliquer('[data-br-outil="dessiner"]', 'l\'outil « Dessiner »');
await dormir(600);
await s.doitExister('[data-br-svg]', 'la feuille à petits carreaux');

async function tracer(dx = 0) {
    const r = await s.page.locator('[data-br-svg]').boundingBox();
    if (!r) return false;
    await s.page.mouse.move(r.x + 30 + dx, r.y + 30);
    await s.page.mouse.down();
    await s.page.mouse.move(r.x + 110 + dx, r.y + 44, { steps: 8 });
    await s.page.mouse.move(r.x + 180 + dx, r.y + 120, { steps: 8 });
    await s.page.mouse.up();
    await dormir(500);
    return true;
}
await tracer();
const aimante = await s.page.evaluate(() => {
    const t = [...document.querySelectorAll('#brouillon .br-encre path')];
    const d = t.length ? t[t.length - 1].getAttribute('d') : '';
    const n = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    return { traits: t.length, d: d.slice(0, 60), auxNoeuds: n.length > 0 && n.every(v => v % 32 === 0),
        courbe: /[QC]/.test(d) };
});
console.log(`   ${JSON.stringify(aimante)}`);
dire('LE TRAIT AIMANTÉ TOMBE SUR LES NŒUDS', aimante.auxNoeuds, aimante.d);
dire('et il n\'est PAS lissé — une courbe passerait à côté des nœuds', !aimante.courbe);

await s.cliquer('[data-br-crayon="libre"]', 'le crayon libre');
await dormir(400);
await tracer(60);
const libre = await s.page.evaluate(() => {
    const t = [...document.querySelectorAll('#brouillon .br-encre path')];
    const d = t.length ? t[t.length - 1].getAttribute('d') : '';
    const n = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    return { traits: t.length, d: d.slice(0, 60), horsNoeuds: n.some(v => v % 32 !== 0),
        courbe: /Q/.test(d) };
});
console.log(`   ${JSON.stringify(libre)}`);
dire('LE CRAYON LIBRE SUIT LE DOIGT', libre.traits === 2 && libre.horsNoeuds,
    JSON.stringify(libre.traits));
dire('ET SON TRAIT EST LISSÉ — une courbe, pas une ligne brisée', libre.courbe, libre.d);

// L'HISTOIRE : défaire, refaire, et gommer qui se défait aussi.
const defaire = async () => {
    await s.cliquer('[data-br-defaire]', 'défaire');
    await dormir(400);
    return s.page.evaluate(() => document.querySelectorAll('#brouillon .br-encre path').length);
};
const apresDefaire = await defaire();
dire('DÉFAIRE RETIRE LE DERNIER TRAIT', apresDefaire === 1, `${apresDefaire} trait(s)`);
await s.cliquer('[data-br-refaire]', 'refaire');
await dormir(400);
const apresRefaire = await s.page.evaluate(() =>
    document.querySelectorAll('#brouillon .br-encre path').length);
dire('ET REFAIRE LE REMET', apresRefaire === 2, `${apresRefaire} trait(s)`);
await s.cliquer('[data-br-gomme]', 'gommer');
await dormir(400);
const apresGomme = await s.page.evaluate(() =>
    document.querySelectorAll('#brouillon .br-encre path').length);
const apresRegret = await defaire();
dire('GOMMER EFFACE TOUT', apresGomme === 0, `${apresGomme} trait(s)`);
dire('ET L\'EFFACEMENT SE DÉFAIT AUSSI — c\'est lui qu\'on regrette',
    apresRegret === 2, `${apresRegret} trait(s)`);
await s.photo('#brouillon', `tools/tmp/brouillon-dessiner-${LARGEUR}.png`);

// ── 7. LA PAGE BLANCHE REVIENT À CHAQUE QUESTION ───────────────────────────
console.log('\n\x1b[1mLA QUESTION SUIVANTE\x1b[0m');
await s.page.evaluate(async () => {
    const { oublierLeBrouillon } = await import('./js/ui/brouillon.js');
    oublierLeBrouillon();
});
await dormir(600);
const neuve = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    return {
        traits: f.querySelectorAll('.br-encre path').length,
        cadres: f.querySelectorAll('.br-calcul').length
    };
});
dire('LA FEUILLE EST BLANCHE', neuve.traits === 0 && neuve.cadres === 0, JSON.stringify(neuve));

// ── 8. « POSER » S'ÉTEINT SUR UN EXERCICE DE CALCUL MENTAL ─────────────────
console.log('\n\x1b[1mSUR UN EXERCICE DE CALCUL MENTAL\x1b[0m');
await s.ouvrirExercice(SANS);
await dormir(1500);
await s.cliquer('#btn-game-brouillon', 'le bouton du brouillon');
await dormir(800);
const mental = await s.page.evaluate(() => {
    const f = document.getElementById('brouillon');
    return { ouverte: !!f && !f.hidden,
        outils: [...f.querySelectorAll('[data-br-outil]')].map(b => b.dataset.brOutil) };
});
dire('LE BROUILLON EXISTE QUAND MÊME', mental.ouverte);
dire('MAIS « POSER » N\'Y EST PAS', !mental.outils.includes('poser'), mental.outils.join(' · '));
dire('et les deux autres restent', mental.outils.length === 2, mental.outils.join(' · '));

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 5).forEach(e => console.log(`   ${e}`));
await s.fermer();
process.exit(ratés ? 1 : 0);
