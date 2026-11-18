// LE DIRECT EN TUILES — la maquette C, sur le chemin de Rémy.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre, devant trois maquettes : « mets la maquette en réglage
// j'aime bien le C ».
//
// ── CE QUE CETTE SONDE MESURE, ET CE QU'ELLE A RENONCÉ À MESURER ─────────
//
// La classe d'essai porte six élèves, tous hors ligne. On en colle vingt-six,
// comme une 6e de Rémy : c'est à vingt-six que la grille, la taille des
// tuiles et la hauteur de la barre deviennent des questions.
//
// J'AI ENSUITE PERDU UNE HEURE À VOULOIR LES FAIRE TRAVAILLER depuis la
// sonde, en pilotant leurs jeux au clavier, pour obtenir des anneaux non nuls
// et des tuiles rouges. Mauvais outil : chaque exercice a son clavier et son
// écran « JOUER », et ce qu'on voulait vérifier n'était pas que les jeux
// marchent — ils ont leurs propres sondes — mais que la TUILE dit la bonne
// chose dans chacun des cinq états. C'est parti au noyau
// (`js/core/murDeClasse.js`) et c'est gardé par `tests/murDeClasse.test.mjs`,
// qui pose les cinq états en deux millisecondes.
//
// RESTE ICI CE QUE SEUL UN NAVIGATEUR SAIT DIRE, et chacun de ces points rend
// le réglage inutile sans lever la moindre erreur :
//
//   · LE RÉGLAGE TIENT-IL ? C'est la demande même : « mets la maquette en
//     RÉGLAGE ». Un interrupteur qu'il faut recliquer après chaque
//     rechargement n'est pas un réglage ;
//   · L'ANNEAU SE LIT-IL ? Il remplace une jauge plate parce qu'on regarde ce
//     mur debout, à deux mètres. Si son nombre tombe sous dix pixels, on a
//     remplacé une jauge illisible par un anneau illisible ;
//   · LA BARRE DE PILOTAGE MANGE-T-ELLE L'ÉCRAN ? Collée en bas, elle est à
//     portée de pouce — et si elle prend le quart de la fenêtre, elle cache
//     les élèves qu'on vient voir ;
//   · LE MOT QU'ON TAPE SURVIT-IL AU BATTEMENT ? Mesuré AVANT correction :
//     en tuiles, il disparaissait toutes les dix secondes avec le curseur ;
//
//     node tools/murDeLaClasse.mjs
//     node tools/murDeLaClasse.mjs --photos

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const photos = process.argv.includes('--photos');
let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

// Une 6e de Rémy : vingt-six noms, avec les accents et les particules qui
// cassent les mises en page — « DA SILVA », « EL AMRANI », « NGUYÊN ».
const LISTE = [
    'BERNARD Tom', 'BOULAY Inès', 'CHARRIER Noah', 'DA SILVA Luna',
    'DUPONT Emma', 'EL AMRANI Yanis', 'FAURE Jade', 'GIRAUD Mathis',
    'HAMON Léa', 'JOLY Ethan', 'KONÉ Awa', 'LAMBERT Tiago',
    'MARTIN Lucas', 'MERCIER Chloé', 'NGUYÊN Maëlle', 'OLIVIER Raphaël',
    'PETIT Zoé', 'QUÉRÉ Nolan', 'RENAUD Alice', 'ROY Sacha',
    'SAÏDI Amir', 'THOMAS Camille', 'VASSEUR Hugo', 'VIDAL Romane',
    'WEBER Enzo', 'ZIANI Sofia'
].join('\n');

const s = await ouvrirSonde({ largeur: 1400, hauteur: 1000 });
await s.identifier();
const classeId = s.info.classe;

// ── ON REMPLIT LA CLASSE ──────────────────────────────────────────────────
console.log('\n\x1b[1mUNE 6e ENTIÈRE, ET QUELQUES ÉLÈVES QUI TRAVAILLENT\x1b[0m');
const pose = await s.page.evaluate(async ([cid, texte]) => {
    const { apercuDeListe, importerListe, listeDeClasse, donnerAuServeur } =
        await import('./js/core/espaceProf.js').then(async (m) => ({
            ...m, donnerAuServeur: (await import('./js/core/parcoursServeur.js')).donnerAuServeur
        }));
    const a = await apercuDeListe(cid, texte, '');
    if (a.erreur || !a.apercu) return { erreur: a.erreur || 'aperçu vide' };
    // L'IMPORT RELIT LE TEXTE NORMALISÉ DE L'APERÇU, pas le collage d'origine :
    // c'est le chemin exact du bouton « Confirmer » de l'interface.
    const r = await importerListe(cid, a.apercu.texte);
    if (r.erreur) return { erreur: r.erreur };

    // UNE SÉANCE, sans quoi les élèves n'ont rien à ouvrir et le mur reste à
    // zéro — c'est ce qu'il montrait avant qu'on pense à en donner une.
    const { makeStep, makePath } = await import('./js/core/path.js');
    const { defaultPolicy } = await import('./js/core/policy.js');
    const p = makePath('Additions Mystères', [
        makeStep('calc-add', {}, { stepId: 'a1', nbItems: 5 })
    ], defaultPolicy());
    const d = await donnerAuServeur(p, cid);
    if (d.erreur) return { erreur: d.erreur };

    const l = await listeDeClasse(cid);
    return { combien: (l.eleves || []).length, pathId: p.id,
        billets: (l.eleves || []).filter(e => e.login && e.code)
            .slice(0, 5).map(e => `${e.login}/${e.code}`) };
}, [classeId, LISTE]);
dire('la classe compte vingt-six élèves et une séance',
    !pose.erreur && pose.combien >= 26, pose.erreur || `${pose.combien} élèves`);

const postes = [];
// TROIS ÉLÈVES OUVRENT LEUR POSTE, et c'est tout ce qu'on leur demande : il
// suffit qu'ils soient EN LIGNE pour que le compteur du haut et le tri de la
// grille aient quelque chose à dire. Les faire répondre voudrait piloter leurs
// jeux, ce que cette sonde a renoncé à faire — voir l'en-tête.
for (const billet of (pose.billets || []).slice(0, 3)) {
    const page = await s.ctx.newPage();
    await page.goto(`http://127.0.0.1:${s.port}/index.html?poste=1`
        + `#billet=${encodeURIComponent(billet)}`);
    await page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 })
        .catch(() => {});
    postes.push({ page });
}
const enLigne = postes.length;
dire("trois élèves sont en ligne", enLigne === 3, enLigne + " postes ouverts");

// ── RÉMY OUVRE SA CLASSE ──────────────────────────────────────────────────
console.log('\n\x1b[1mLE DIRECT, EN TUILES\x1b[0m');
await s.page.bringToFront();
await s.page.click('#top-btn-classe');
await s.page.waitForTimeout(1200);
await s.doitExister(`[data-ouvrir="${classeId}"]`);
await s.page.click(`[data-ouvrir="${classeId}"]`);
await s.page.waitForTimeout(1600);
await s.doitExister('[data-onglet="direct"]');
await s.page.click('[data-onglet="direct"]');
await s.page.waitForTimeout(1800);

await s.doitExister('[data-forme-direct="tuiles"]');
await s.page.click('[data-forme-direct="tuiles"]');
await dormir(2500);
await s.doitExister('.ec-tuile');
await s.doitExister('.ec-anneau');

const vu = await s.page.evaluate(() => {
    const tuiles = [...document.querySelectorAll('.ec-tuile')];
    const r0 = tuiles[0].getBoundingClientRect();
    const nb = tuiles[0].querySelector('.ec-anneau-nb');
    const parts = tuiles.map(t => {
        const n = t.querySelector('.ec-anneau-nb');
        return n ? Number(n.textContent) : null;
    });
    const pilote = document.querySelector('.ec-pilote');
    const rp = pilote ? pilote.getBoundingClientRect() : null;
    const haut = document.querySelector('.ec-direct-haut');
    return {
        combien: tuiles.length,
        taille: Math.round(r0.width) + ' × ' + Math.round(r0.height),
        colonnes: tuiles.filter(t =>
            Math.abs(t.getBoundingClientRect().top - r0.top) < 4).length,
        nombreAnneau: nb ? Math.round(nb.getBoundingClientRect().height) : 0,
        prenom: getComputedStyle(tuiles[0].querySelector('.ec-tuile-qui')).fontSize,
        // COMBIEN D'ANNEAUX NE SONT PAS À ZÉRO : c'est la preuve que la sonde
        // a fait travailler quelqu'un, et donc que la photo montre un mur
        // vivant et non un mur vide.
        quiAvance: parts.filter(p => p > 0).length,
        parts: parts.filter(p => p > 0),
        // LA BARRE : est-elle en bas, collée, et combien prend-elle ?
        piloteEnBas: rp ? Math.round(rp.top) : null,
        piloteHaut: rp ? Math.round(rp.height) : null,
        fenetre: window.innerHeight,
        piloteApresLesTuiles: !!(pilote && haut
            && (haut.compareDocumentPosition(pilote) & Node.DOCUMENT_POSITION_FOLLOWING)),
        colle: pilote ? getComputedStyle(pilote).position : null,
        // LE TRAIT DE L'ANNEAU EST-IL PEINT ? Une classe CSS déclarée dans un
        // fichier et une couleur effectivement calculée sur le pixel sont deux
        // choses différentes — c'est la leçon de `contrasteRendu`.
        traitAnneau: (() => {
            const a = tuiles[0].querySelector('.ec-anneau-part');
            if (!a) return null;
            const s = getComputedStyle(a);
            return (s.stroke && s.stroke !== 'none') ? `${s.stroke}, ${s.strokeWidth}` : null;
        })()
    };
});
dire('les vingt-six tuiles sont là', vu.combien >= 26,
    `${vu.combien} tuiles de ${vu.taille}, ${vu.colonnes} par rangée`);
// L'ANNEAU EST À ZÉRO PARTOUT, et c'est le PIRE CAS pour la lisibilité : le
// nombre le plus étroit est « 0 », et le texte le plus long « pas commencé ».
// Une tuile qui tient ici tient partout ; ce que vaut un anneau à 60 % est
// gardé au noyau, où les cinq états s'écrivent à la main.
// DIX PIXELS EST LE PLANCHER D'UN NOMBRE QU'ON LIT — la même borne que les
// cotes des figures. Ici elle est plus exigeante encore : on lit ce nombre
// debout, à deux mètres.
dire('le nombre de l\'anneau se lit', vu.nombreAnneau >= 12,
    `${vu.nombreAnneau} px de haut`);
dire('le nom se lit de loin', parseFloat(vu.prenom) >= 15, vu.prenom);
dire('l\'anneau est peint, et pas seulement déclaré', !!vu.traitAnneau,
    vu.traitAnneau || 'aucune couleur de trait');

// ── LA BARRE DE PILOTAGE ──────────────────────────────────────────────────
console.log('\n\x1b[1mLA BARRE DE PILOTAGE, AU POUCE\x1b[0m');
dire('elle est APRÈS les tuiles dans la page', vu.piloteApresLesTuiles);
dire('et elle est collée au bas de l\'écran', vu.colle === 'sticky', vu.colle);
// ELLE NE DOIT PAS MANGER L'ÉCRAN. Un quart de la fenêtre est la borne : au
// delà, elle cache les élèves qu'on vient justement regarder.
dire('elle laisse les trois quarts de la fenêtre aux élèves',
    vu.piloteHaut !== null && vu.piloteHaut <= vu.fenetre * 0.25,
    `${vu.piloteHaut} px sur ${vu.fenetre}`);

// ── LE MOT QU'ON TAPE SURVIT AU BATTEMENT ─────────────────────────────────
//
// MESURÉ AVANT CORRECTION, et c'est pour cela que la mesure est ici : en
// tuiles, `rafraichirLeDirect` ne trouvait pas `.ec-rangs` et redessinait TOUT
// toutes les dix secondes. Le mot disparaissait sous les doigts du professeur,
// et le curseur avec.
console.log('\n\x1b[1mCE QU\'ON ÉCRIT PENDANT QUE LA CLASSE BAT\x1b[0m');
const champ = '.ec-pilote input[type="text"], .ec-pilote input:not([type])';
await s.doitExister(champ);
await s.page.fill(champ, '');
await s.page.type(champ, 'Prenez le cahier rouge');
await dormir(12500);          // le battement est à dix secondes
const apres = await s.page.evaluate((sel) => {
    const c = document.querySelector(sel);
    return c ? { texte: c.value, foyer: document.activeElement === c } : null;
}, champ);
dire('le mot est encore là après le battement',
    !!apres && apres.texte === 'Prenez le cahier rouge',
    apres ? `« ${apres.texte} »` : 'le champ a disparu');
dire('et le curseur n\'a pas sauté', !!apres && apres.foyer);

if (photos) {
    // ON AGRANDIT LA FENÊTRE POUR LA PHOTO, ET SEULEMENT POUR ELLE : les
    // mesures d'au-dessus valent pour un portable ordinaire (1000 px de
    // haut), et c'est exprès — la barre de pilotage doit y tenir. Une photo
    // coupée, en revanche, ne montre pas le mur.
    await s.page.setViewportSize({ width: 1440, height: 1360 });
    await dormir(1200);
    await s.photo('.ec-corps', 'tools/tmp/mur-tuiles.png');
    await s.page.setViewportSize({ width: 1400, height: 1000 });
    await dormir(800);
}

// ── LE RÉGLAGE TIENT ──────────────────────────────────────────────────────
//
// C'est la demande, mot pour mot : « mets la maquette EN RÉGLAGE ».
console.log('\n\x1b[1mLE RÉGLAGE TIENT\x1b[0m');
await s.page.click('[data-onglet="liste"]');
await s.page.waitForTimeout(700);
await s.page.click('[data-onglet="direct"]');
await s.page.waitForTimeout(1200);
dire('après un aller-retour d\'onglet',
    await s.page.evaluate(() =>
        !!document.querySelector('[data-forme-direct="tuiles"].ec-ordre-btn--actif')));

await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await s.page.click('#top-btn-classe');
await s.page.waitForTimeout(1200);
await s.page.click(`[data-ouvrir="${classeId}"]`);
await s.page.waitForTimeout(1800);
dire('ET APRÈS UN RECHARGEMENT COMPLET',
    await s.page.evaluate(() =>
        !!document.querySelector('[data-forme-direct="tuiles"].ec-ordre-btn--actif')),
    'sinon ce n\'est pas un réglage, c\'est un geste de plus');

// ON REVIENT EN LIGNES, et cela doit tenir aussi : un réglage qui ne retient
// qu'une de ses deux valeurs n'en est pas un.
await s.page.click('[data-forme-direct="lignes"]');
await s.page.waitForTimeout(900);
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await s.page.click('#top-btn-classe');
await s.page.waitForTimeout(1200);
await s.page.click(`[data-ouvrir="${classeId}"]`);
await s.page.waitForTimeout(1800);
dire('et le retour en lignes tient aussi',
    await s.page.evaluate(() =>
        !!document.querySelector('[data-forme-direct="lignes"].ec-ordre-btn--actif')));

dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
dire('aucune fenêtre native', s.fenetresNatives.length === 0,
    s.fenetresNatives.slice(0, 2).join(' | '));

for (const { page } of postes) await page.close().catch(() => {});
await s.fermer();
console.log('\n' + '─'.repeat(68));
console.log(rates ? `\n${rates} POINT(S) À REVOIR.`
    : '\nLES TUILES SE LISENT DE LOIN, LES COMMANDES SONT AU POUCE,\n'
      + 'ET LE CHOIX DE RÉMY TIENT APRÈS LE RECHARGEMENT.');
process.exit(rates ? 1 : 0);
