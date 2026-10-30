// LES PENTAMINOS, PAR LE CHEMIN DE L'ÉLÈVE — on prend une pièce et on la pose.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/pentaminosAuDoigt.mjs
//
// RÉMY, 29 octobre : « les penamios, ca me va ».
//
// CE QUE LES ÉPREUVES NE PEUVENT PAS DIRE, et qui se mesure donc ici :
//
//   · LE GLISSER POSE VRAIMENT LA PIÈCE. Le noyau sait tirer un pavage et dire
//     si une pose tient ; il ne sait rien du doigt. Ce dépôt a payé TROIS fois
//     le même glisser — la Grille de Nombres, les allumettes, La Traversée —
//     et chaque fois le défaut était muet : pas d'erreur de page, rien qui
//     bouge.
//   · LE SIMPLE TOUCHER MARCHE ENCORE après qu'on a branché le glisser. C'est
//     exactement ce qui est tombé le 27 octobre sur les allumettes, et la
//     cause — `setPointerCapture` posé dès l'appui — ne laisse aucune trace.
//   · « TOURNER » CHANGE LA FORME. Un bouton qui s'allume sans rien faire est
//     le défaut le plus silencieux possible.
//   · ET LA PIÈCE TOMBE SUR LES CASES. Une pièce posée à deux pixels près,
//     c'est un jeu qui paraît mal dessiné sans qu'on sache dire pourquoi.
//
// ── CE QUE CETTE SONDE NE REGARDAIT PAS, ET QUI A COÛTÉ ────────────────────
//
// Rémy, 30 octobre : « il laisse des traces sur le plateau ». Douze cases sur
// vingt restaient rouges derrière la pièce qu'on promenait. Ni les épreuves ni
// cette sonde ne l'avaient vu, pour une seule raison : **elles ne regardaient
// que l'état d'arrivée**, et le plateau se repeint au lâcher. Une marque qui
// ne vit que pendant le geste ne se mesure QUE pendant le geste — la sonde
// s'arrête donc maintenant EN COURS DE GLISSER pour compter ce qui est marqué.
//
// Et deux autres choses qui ne se voient pas à l'arrivée :
//   · LA PIÈCE NE SAUTE PAS quand on la prend. Le fantôme se centrait sous le
//     doigt, si bien qu'un I pris par le bout bondissait de deux cases.
//   · LES DEUX COMMANDES SONT SUR LA PIÈCE CHOISIE, et sur elle seule.

import { ouvrirSonde } from './sonde.mjs';

const TAILLES = [
    { nom: 'doigt', largeur: 390, hauteur: 844 },
    { nom: 'ordi', largeur: 1280, hauteur: 900 }
];

const etat = (s) => s.page.evaluate(() => ({
    cases: document.querySelectorAll('.pn-vide').length,
    auBac: document.querySelectorAll('.pn-bac .pn-piece').length,
    posees: document.querySelectorAll('.pn-pose .pn-piece').length,
    couvertes: document.querySelectorAll('.pn-pose .pn-case').length,
    choisies: document.querySelectorAll('.pn-piece--choisie').length,
    fantomes: document.querySelectorAll('.pn-fantome').length,
    cmds: document.querySelectorAll('.pn-cmd').length,
    cmdsSurLaChoisie: document.querySelectorAll('.pn-piece--choisie .pn-cmd').length,
    statut: ((document.querySelector('.pn-statut') || {}).textContent || '').trim(),
    dehors: document.documentElement.scrollWidth - window.innerWidth
}));

/** Ce qui est marqué sur le plateau, à l'instant où on le demande. */
const marques = (s) => s.page.evaluate(() => ({
    bleu: document.querySelectorAll('.pn-visee').length,
    rouge: document.querySelectorAll('.pn-visee--non').length
}));

/** Le centre d'un élément, à l'écran. */
const centre = (s, sel, i = 0) => s.page.evaluate(([x, k]) => {
    const el = document.querySelectorAll(x)[k];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, [sel, i]);

async function glisser(s, de, vers) {
    await s.page.mouse.move(de.x, de.y);
    await s.page.mouse.down();
    await s.page.mouse.move((de.x + vers.x) / 2, (de.y + vers.y) / 2, { steps: 6 });
    await s.page.mouse.move(vers.x, vers.y, { steps: 6 });
    await s.page.mouse.up();
    await s.page.waitForTimeout(160);
}

/** La boîte d'une pièce du bac, pour voir si « Tourner » la change. */
const boiteDuBac = (s, i = 0) => s.page.evaluate((k) => {
    const el = document.querySelectorAll('.pn-bac .pn-piece')[k];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { l: Math.round(r.width), h: Math.round(r.height) };
}, i);

/** La pièce posée tombe-t-elle pile sur les cases de la grille ? */
const aligne = (s) => s.page.evaluate(() => {
    const c = document.querySelector('.pn-pose .pn-case');
    const g = document.querySelector('.pn-vide');
    if (!c || !g) return null;
    const a = c.getBoundingClientRect(), b = g.getBoundingClientRect();
    // Les deux doivent avoir la même taille, et l'écart aux bords être entier
    // en nombre de cases : à un pixel près, personne ne voit rien ; à trois,
    // la grille paraît de travers.
    const dx = (a.left - b.left) / b.width, dy = (a.top - b.top) / b.height;
    return {
        taille: Math.abs(a.width - b.width) < 1.5 && Math.abs(a.height - b.height) < 1.5,
        ecart: Math.max(Math.abs(dx - Math.round(dx)), Math.abs(dy - Math.round(dy)))
    };
});

async function unePasse(taille) {
    const s = await ouvrirSonde({ largeur: taille.largeur, hauteur: taille.hauteur });
    const dits = [], ratés = [];
    try {
        await s.identifier();
        const raté = await s.ouvrirExercice('logi-pentaminos', { niveau: '1' }, { questions: 3 });
        if (raté) throw new Error(`ouverture : ${raté}`);
        await s.doitExister('.pn-plateau', 'le rectangle à remplir');
        await s.doitExister('.pn-bac .pn-piece', 'les pièces du bac');
        await s.page.waitForTimeout(300);

        const a = await etat(s);
        dits.push(`${a.cases} cases, ${a.auBac} pièces au bac, ${a.couvertes} cases couvertes`);
        if (a.cases !== 20) { ratés.push('cases'); dits.push(`${a.cases} CASES AU LIEU DE 20`); }
        if (a.auBac !== 4) { ratés.push('bac'); dits.push(`${a.auBac} PIÈCES AU LIEU DE 4`); }

        const img = await s.photo('.pn-plateau', `tools/tmp/pn-plateau-${taille.nom}.png`, 0);
        dits.push(img && !img.unie ? `le plateau est dessiné (${img.teintes} teintes)`
            : 'LE PLATEAU EST UNE IMAGE UNIE');
        if (!img || img.unie) ratés.push('plateau uni');

        // ── AUCUNE COMMANDE TANT QU'AUCUNE PIÈCE N'EST CHOISIE ──────────────
        //
        // Rémy, 30 octobre : « il faut les icones sur les figures ». Les deux
        // commandes appartiennent à la pièce choisie ; sans choix, l'écran n'en
        // porte aucune, et une ligne dit où les trouver.
        //
        // CE CONTRÔLE SE FAIT ICI ET PAS PLUS BAS : dès le premier glisser, la
        // pièce déposée DEVIENT la pièce choisie. Posé après, il rougissait sur
        // un logiciel correct — la sonde se trompait, pas le jeu.
        if (a.cmds) { ratés.push('commandes orphelines'); }
        dits.push(a.cmds === 0
            ? 'sans pièce choisie, aucune commande à l\'écran'
            : `${a.cmds} COMMANDE(S) FLOTTENT SANS PIÈCE CHOISIE`);

        // ── ON GLISSE UNE PIÈCE DU BAC VERS LE COIN DU RECTANGLE ────────────
        const uneCase = await centre(s, '.pn-bac .pn-piece .pn-case');
        const coin = await centre(s, '.pn-vide');
        await glisser(s, uneCase, coin);
        const pose = await etat(s);
        dits.push((pose.posees === 1 && pose.auBac === 3)
            ? 'glisser une pièce du bac la pose sur le rectangle'
            : `LE GLISSER NE POSE RIEN (${pose.posees} posée(s), ${pose.auBac} au bac)`);
        if (pose.posees !== 1 || pose.auBac !== 3) ratés.push('glisser');
        dits.push(pose.fantomes === 0 ? 'et le fantôme est bien rangé'
            : `${pose.fantomes} FANTÔME(S) OUBLIÉ(S) À L'ÉCRAN`);
        if (pose.fantomes) ratés.push('fantôme');

        const al = await aligne(s);
        dits.push((al && al.taille && al.ecart < 0.08)
            ? `la pièce tombe pile sur les cases (écart ${(al ? al.ecart : 1).toFixed(3)} case)`
            : `LA PIÈCE EST DE TRAVERS (${JSON.stringify(al)})`);
        if (!al || !al.taille || al.ecart >= 0.08) ratés.push('alignement');

        // ── UN SIMPLE TOUCHER LA REPREND ────────────────────────────────────
        //
        // ON NE DÉRÉFÉRENCE PAS UN CROCHET SANS L'AVOIR TROUVÉ : quand le
        // glisser d'avant échoue, `.pn-pose .pn-case` n'existe pas, et la sonde
        // mourait sur `TypeError: reading 'x'` — en emportant TOUT ce qu'elle
        // avait mesuré avant, qui est précisément ce qu'on voulait lire.
        const surPlateau = await centre(s, '.pn-pose .pn-case');
        if (!surPlateau) {
            dits.push('PAS DE PIÈCE SUR LE PLATEAU : le reste n\'est pas mesurable');
            ratés.push('toucher');
            return { dits, ratés, erreurs: s.erreurs.slice(), fenetres: s.fenetresNatives.slice() };
        }
        await s.page.mouse.move(surPlateau.x, surPlateau.y);
        await s.page.mouse.down(); await s.page.mouse.up();
        await s.page.waitForTimeout(160);
        const repris = await etat(s);
        dits.push((repris.posees === 0 && repris.auBac === 4)
            ? 'toucher une pièce posée la renvoie au bac — le toucher marche toujours'
            : `LE TOUCHER NE REPREND PAS (${repris.posees} posée(s))`);
        if (repris.posees !== 0) ratés.push('toucher');

        // ── « TOURNER » CHANGE LA FORME ─────────────────────────────────────
        //
        // On cherche une pièce qui N'EST PAS symétrique : sur le X, « Tourner »
        // ne change rien, et c'est juste. Prendre la première venue ferait
        // rougir la sonde une fois sur douze, pour un logiciel correct.
        let tourne = false, essais = 0, surLaPiece = 0;
        for (let i = 0; i < 4 && !tourne; i++) {
            const c = await centre(s, '.pn-bac .pn-piece', i);
            if (!c) break;
            await s.page.mouse.move(c.x, c.y);
            await s.page.mouse.down(); await s.page.mouse.up();
            await s.page.waitForTimeout(120);
            const choisie = await etat(s);
            surLaPiece = Math.max(surLaPiece, choisie.cmdsSurLaChoisie);
            const avant = await boiteDuBac(s, i);
            // ON CLIQUE LA COMMANDE PORTÉE PAR LA PIÈCE, pas un bouton de barre
            // — c'est tout l'objet du changement, et viser l'ancien bouton
            // ferait passer la sonde sur une interface qui n'existe plus.
            const b = await centre(s, '.pn-piece--choisie [data-cmd="tourner"]');
            if (!b) break;
            await s.page.mouse.click(b.x, b.y);
            await s.page.waitForTimeout(140);
            const apres = await boiteDuBac(s, i);
            essais++;
            if (avant && apres && (avant.l !== apres.l || avant.h !== apres.h)) tourne = true;
        }
        dits.push(tourne ? `« Tourner » change la forme (vu en ${essais} essai(s))`
            : '« TOURNER » NE CHANGE RIEN SUR AUCUNE DES QUATRE PIÈCES');
        if (!tourne) ratés.push('tourner');
        dits.push(surLaPiece === 2
            ? 'et les deux commandes se posent SUR la pièce choisie'
            : `${surLaPiece} COMMANDE(S) SUR LA PIÈCE CHOISIE AU LIEU DE DEUX`);
        if (surLaPiece !== 2) ratés.push('commandes sur la pièce');

        // ── ET MAINTENANT, PENDANT LE GESTE ─────────────────────────────────
        //
        // On promène une pièce sur tout le plateau SANS LÂCHER, et l'on compte
        // ce qui reste marqué derrière elle. C'est la mesure qui manquait.
        const dep = await s.page.evaluate(() => {
            const el = document.querySelector('.pn-bac .pn-piece');
            const r = el.getBoundingClientRect();
            return { x: r.left + 6, y: r.top + 6, l: r.width, h: r.height };
        });
        await s.page.mouse.move(dep.x, dep.y);
        await s.page.mouse.down();
        await s.page.mouse.move(dep.x + 40, dep.y + 40, { steps: 8 });
        await s.page.waitForTimeout(120);

        // LA PIÈCE NE SAUTE PAS : prise à 6 px de son coin, le fantôme doit
        // avoir son coin à 6 px du doigt — et non centré dessus.
        const saut = await s.page.evaluate(([x, y]) => {
            const f = document.querySelector('.pn-fantome');
            if (!f) return null;
            const r = f.getBoundingClientRect();
            return Math.round(Math.hypot(r.left - (x - 6), r.top - (y - 6)));
        }, [dep.x + 40, dep.y + 40]);
        dits.push((saut !== null && saut <= 10)
            ? `la pièce suit le doigt sans sauter (${saut} px d'écart)`
            : `LA PIÈCE SAUTE SOUS LE DOIGT (${saut} px d'écart)`);
        if (saut === null || saut > 10) ratés.push('saut');

        let pire = 0;
        for (const [gx, gy] of [[0, 0], [2, 1], [3, 3], [1, 4], [0, 2], [3, 0]]) {
            const g = await centre(s, `[data-gx="${gx}"][data-gy="${gy}"]`);
            if (!g) continue;
            await s.page.mouse.move(g.x, g.y, { steps: 4 });
            await s.page.waitForTimeout(70);
            const m = await marques(s);
            pire = Math.max(pire, m.bleu + m.rouge);
        }
        await s.page.mouse.up();
        await s.page.waitForTimeout(160);
        // Une pièce couvre CINQ cases : au-delà, ce sont les positions d'avant
        // qui sont restées marquées, et c'est la traînée que Rémy a vue.
        dits.push(pire <= 5
            ? `aucune trace : au plus ${pire} cases marquées à la fois`
            : `${pire} CASES MARQUÉES À LA FOIS — LA PIÈCE LAISSE UNE TRAÎNÉE`);
        if (pire > 5) ratés.push('traces');

        // ── ET « AIDE » POSE UNE PIÈCE ──────────────────────────────────────
        await s.page.evaluate(() => document.querySelector('[data-outil="aide"]').click());

        await s.page.waitForTimeout(200);
        const aide = await etat(s);
        dits.push(aide.posees >= 1 ? `« Aide » pose une pièce — ${aide.statut}`
            : '« AIDE » NE POSE RIEN');
        if (aide.posees < 1) ratés.push('aide');

        dits.push(`rien ne déborde en largeur : ${aide.dehors} px`);
        if (aide.dehors > 0) ratés.push('débordement');
        await s.page.screenshot({ path: `tools/tmp/pn-ecran-${taille.nom}.png`, fullPage: true });

        return { dits, ratés, erreurs: s.erreurs.slice(), fenetres: s.fenetresNatives.slice() };
    } finally {
        await s.fermer();
    }
}

const sorties = [];
for (const t of TAILLES) sorties.push({ t, r: await unePasse(t) });

console.log('');
let fautes = 0;
for (const { t, r } of sorties) {
    console.log(`── ${t.nom} (${t.largeur} × ${t.hauteur}) ──`);
    r.dits.forEach(x => console.log(`   ${x}`));
    console.log(`   erreurs de page : ${r.erreurs.length}, fenêtres natives : ${r.fenetres.length}`);
    r.erreurs.forEach(e => console.log(`     ! ${e}`));
    fautes += r.erreurs.length + r.fenetres.length + r.ratés.length;
}
console.log(fautes ? `\n${fautes} chose(s) à regarder.` : '\nTOUT PASSE.');
process.exit(fautes ? 1 : 0);
