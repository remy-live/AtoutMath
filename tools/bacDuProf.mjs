// LE BAC À SABLE QUE LE PROFESSEUR REMPLIT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy : « pour le bac à sable j'aimerai quand même bien pouvoir éditer le
// contenu ».
//
// LE NOYAU SAVAIT DÉJÀ RECEVOIR UNE LISTE — `jeuxDuBac(trouver, liste)`, « la
// liste du professeur, sinon celle par défaut », écrit depuis le début dans
// `core/bacASable.js`. Rien ne la rangeait, rien ne la portait jusqu'à
// l'élève, et aucun écran ne la composait. Il manquait une colonne, un
// aller-retour et un bouton.
//
// CE QUE SEULE UNE SONDE PEUT DIRE : que la liste choisie par le professeur
// arrive VRAIMENT chez l'élève, et que la liste VIDE y arrive aussi — c'est le
// cas qui se perd, parce qu'un tableau vide ressemble à une absence partout où
// on ne fait pas attention.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
await s.identifier();
await dormir(900);

const classeId = await s.page.evaluate(async () => {
    const { mesClasses } = await import('./js/core/espaceProf.js');
    const l = await mesClasses();
    const c = (Array.isArray(l) ? l : []).find((x) => /6e B/.test(x.name || ''));
    return c ? c.id : null;
});

const poser = (jeux) => s.page.evaluate(async ([cid, jeux]) => {
    const { reglerLeBac } = await import('./js/core/espaceProf.js');
    const r = await reglerLeBac(cid, false, null, jeux);
    return { erreur: r.erreur || '', jeux: r.jeux, dit: r.dit };
}, [classeId, jeux]);

/** Ce que l'élève reçoit vraiment — on ouvre SON poste. */
const chezLEleve = async () => {
    const billet = await s.page.evaluate(async ([cid]) => {
        const { listeDeClasse } = await import('./js/core/espaceProf.js');
        const r = await listeDeClasse(cid);
        const e = (r.eleves || []).find((x) => /Emma/.test(x.prenom || ''));
        return e ? `${e.login}/${e.code}` : null;
    }, [classeId]);
    const p = await s.ctx.newPage();
    await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet)}`);
    await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    await dormir(4500);
    const vu = await p.evaluate(async () => {
        const { jeuxDuBacDuProf } = await import('./js/core/seanceDistante.js');
        const { lesGroupesDuBac } = await import('./js/ui/bacASable.js');
        const liste = jeuxDuBacDuProf();
        const groupes = lesGroupesDuBac(liste);
        return {
            recu: liste,
            fond: (groupes[0] || { jeux: [] }).jeux.map((e) => e.id),
            // COMBIEN DE GROUPES EN TOUT, et c'est ce qui dit si l'élève
            // ouvrirait une fenêtre VIDE : zéro groupe, zéro tuile.
            groupes: groupes.length,
            titres: groupes.map((g) => g.titre || '(le fond)')
        };
    });
    await p.close();
    return vu;
};

console.log('\x1b[1m1. TROIS JEUX CHOISIS\x1b[0m');
// DES IDENTIFIANTS QUI EXISTENT VRAIMENT. Ma première version en inventait un
// — « num-binairo » — et la sonde annonçait « la liste n'arrive pas » sur un
// logiciel qui faisait exactement ce qu'il devait : écarter un identifiant
// inconnu plutôt que de poser une tuile qui ne s'ouvre pas. C'est le septième
// sélecteur inventé de la soirée ; celui-là, au moins, se vérifie en une ligne.
console.log('   serveur : ' + JSON.stringify(await poser(['geo-tangram', 'calc-labyrinthe', 'calc-nova'])));
let v = await chezLEleve();
console.log('   chez l\'élève : reçu ' + JSON.stringify(v.recu));
console.log('   le fond du bac : ' + JSON.stringify(v.fond));
const troisOk = (v.recu || []).length === 3 && v.fond.length === 3;
console.log(troisOk ? '   \x1b[32m→ LA LISTE DU PROFESSEUR ARRIVE.\x1b[0m'
                    : '   \x1b[31m→ LA LISTE N\'ARRIVE PAS.\x1b[0m');

console.log('\n\x1b[1m2. LE BAC VIDÉ EXPRÈS\x1b[0m');
console.log('   serveur : ' + JSON.stringify(await poser([])));
v = await chezLEleve();
console.log('   chez l\'élève : reçu ' + JSON.stringify(v.recu));
console.log('   le fond du bac : ' + JSON.stringify(v.fond));
const videOk = Array.isArray(v.recu) && v.recu.length === 0 && v.fond.length === 0;
console.log(videOk
    ? '   \x1b[32m→ VIDÉ RESTE VIDE : il ne se remplit pas de ce qu\'on vient d\'enlever.\x1b[0m'
    : '   \x1b[31m→ LE BAC S\'EST REREMPLI TOUT SEUL.\x1b[0m');

// ET FERMER LE BAC N'EFFACE PAS LES JEUX. C'est le piège de ce réglage : trois
// choses dans un seul geste, et deux qui s'écrasent si l'on n'y prend garde.
console.log('\n\x1b[1m3. FERMER PUIS ROUVRIR N\'EFFACE RIEN\x1b[0m');
await poser(['geo-tangram', 'calc-labyrinthe']);
await s.page.evaluate(async ([cid]) => {
    const { reglerLeBac } = await import('./js/core/espaceProf.js');
    await reglerLeBac(cid, true);          // on ferme, sans toucher aux jeux
    await reglerLeBac(cid, false);         // on rouvre
}, [classeId]);
v = await chezLEleve();
console.log('   chez l\'élève après fermeture/ouverture : ' + JSON.stringify(v.recu));
console.log((v.recu || []).length === 2
    ? '   \x1b[32m→ LES DEUX JEUX SONT TOUJOURS LÀ.\x1b[0m'
    : '   \x1b[31m→ FERMER LE BAC A EFFACÉ SON CONTENU.\x1b[0m');

// 4. ET UN IDENTIFIANT QUI N'EXISTE PAS NE POSE PAS DE TUILE. Le catalogue
//    bouge ; un parcours rangé l'an dernier peut nommer un jeu renommé depuis.
//    Une tuile qui ne s'ouvre pas, c'est un élève qui clique trois fois dessus
//    avant d'appeler le professeur.
console.log('\n\x1b[1m4. UN JEU INCONNU EST ÉCARTÉ, PAS AFFICHÉ\x1b[0m');
await poser(['geo-tangram', 'ce-jeu-nexiste-pas']);
v = await chezLEleve();
console.log('   reçu : ' + JSON.stringify(v.recu) + ' · affiché : ' + JSON.stringify(v.fond));
console.log(v.fond.length === 1 && v.fond[0] === 'geo-tangram'
    ? '   \x1b[32m→ ÉCARTÉ EN SILENCE, ET LE RESTE S\'AFFICHE.\x1b[0m'
    : '   \x1b[31m→ UNE TUILE QUI NE S\'OUVRIRA PAS EST PROPOSÉE.\x1b[0m');

// 5. ET UN BAC VIDÉ N'OUVRE PAS UNE FENÊTRE BLANCHE.
//
//    C'ÉTAIT L'ARGUMENT DE L'ANCIENNE RÈGLE — « un bac vide se lit comme une
//    panne », qui faisait retomber la liste vide sur celle par défaut. Il
//    reste juste ; il se tient maintenant à l'écran par une phrase.
//
//    ET LA MESURE A DÉMENTI CE QUE JE CROYAIS EN L'ÉCRIVANT. Je m'attendais à
//    ce que le groupe « comme ta séance » garnisse quand même la fenêtre, et
//    donc à ce que la phrase ne serve presque jamais. MESURÉ sur le poste
//    d'Emma, bac vidé : 0 groupe, aucune tuile. L'élargissement a besoin du
//    niveau et du domaine de la séance, qu'il ne trouve pas toujours — la
//    fenêtre blanche n'était donc pas un cas de bord, c'était le cas normal
//    d'un bac vidé. La phrase n'est pas une précaution : elle est ce que
//    l'élève lit.
console.log('\n\x1b[1m5. LE BAC VIDÉ NE DONNE PAS UNE FENÊTRE BLANCHE\x1b[0m');
await poser([]);
v = await chezLEleve();
console.log('   groupes affichés : ' + v.groupes + ' ' + JSON.stringify(v.titres));
console.log(v.groupes > 0
    ? '   \x1b[32m→ LE FOND EST VIDE, MAIS « COMME TA SÉANCE » RESTE.\x1b[0m'
    : '   \x1b[33m→ AUCUN GROUPE : c\'est la phrase qui s\'affiche, pas une grille vide.\x1b[0m');
console.log('   la phrase existe dans l\'écran : '
    + (await s.page.evaluate(async () => {
        const t = await (await fetch('./js/ui/bacASable.js')).text();
        return /aucun jeu dans le bac à sable/.test(t);
    })));

// On remet la classe comme on l'a trouvée : une sonde qui laisse un réglage
// derrière elle fausse la mesure suivante, et c'est toujours celle d'après.
await s.page.evaluate(async ([cid]) => {
    const { reglerLeBac } = await import('./js/core/espaceProf.js');
    await reglerLeBac(cid, false, null, []);
}, [classeId]);

console.log('\nerreurs de page : ' + s.erreurs.length + ' · fenêtres natives : ' + s.fenetresNatives.length);
s.erreurs.slice(0, 3).forEach((e) => console.log('   ' + e));
await s.fermer();
