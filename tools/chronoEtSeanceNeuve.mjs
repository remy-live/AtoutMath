/**
 * « TEMPS ÉCOULÉ » NE DOIT PAS TRAVERSER UNE SÉANCE NEUVE.
 *
 * RÉMY : « petit bug. Les élèves on tfait une nouvelle séance. Certains étaient
 * déjà connecté et mlagré la nouvelle séance c'était donné temps écoulé ».
 *
 * ── POURQUOI UNE SONDE, ALORS QUE `testApi.php` LE GARDE DÉJÀ ───────────────
 *
 * Parce que l'API ne dit qu'une moitié. Elle prouve que le serveur n'envoie
 * plus le compte à rebours ; elle ne prouve pas que le BANDEAU ROUGE disparaît
 * de l'écran de l'élève, ni que la séance neuve s'y ouvre derrière. Et c'est le
 * bandeau que Rémy a vu.
 *
 * « Une mesure qui n'emprunte pas le chemin de l'utilisateur ne mesure pas son
 * problème. » L'élève ouvre donc un vrai poste, avec son billet, et c'est son
 * propre onglet — JAMAIS rechargé, comme ceux de ses élèves — qui doit voir la
 * séance neuve arriver.
 *
 * ── ON ATTEND VRAIMENT LA MINUTE, ET CE N'EST PAS DE LA PATIENCE ────────────
 *
 * Première version de cette sonde : un chrono de dix minutes, puis
 * `UPDATE classes SET chrono_fin = time() - 120` dans la base du site d'essai,
 * pour « avancer l'horloge ». Elle mesurait un cas QUI N'EXISTE PAS, et elle
 * l'a dit elle-même : l'élève ne voyait pas « Temps écoulé », il ne voyait plus
 * rien du tout.
 *
 * LA RAISON EST LA RÈGLE ELLE-MÊME. L'ardoise retient l'INSTANT de fin qu'elle
 * a vu courir (`vuCourir`, js/core/seanceDistante.js) et ne compare rien
 * d'autre. Reculer `chrono_fin` ne fait pas vieillir le compte à rebours : il
 * en fabrique un AUTRE, que personne n'a vu courir — donc exactement le cas
 * déjà protégé. L'artifice effaçait le défaut qu'on venait mesurer.
 *
 * ON LANCE DONC UNE MINUTE — le plus court que le serveur accepte — et on
 * attend qu'elle tombe. Quatre-vingts secondes, et c'est le vrai chemin.
 *
 * ── ET LES DEUX SÉANCES DOIVENT AVOIR DES CONTENUS DIFFÉRENTS ──────────────
 *
 * Deuxième piège, trouvé par cette sonde elle-même : avec deux séances portant
 * la même étape, `fautIlOuvrir` répondait « deja-dessus » et la séance neuve ne
 * s'ouvrait pas. Ce n'était pas un défaut du logiciel mais de la mesure :
 * `identiteDeParcours` est une empreinte du CONTENU, le nom exclu (voir
 * `js/core/shortcodes.js`), et deux séances au même contenu sont le MÊME
 * travail — c'est précisément ce qui permet au bilan de les compter ensemble.
 * Les deux séances d'ici portent donc deux exercices différents.
 *
 *   node tools/chronoEtSeanceNeuve.mjs
 */
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
const classeId = s.info.classe;

// ── DEUX SÉANCES : CELLE DE CE MATIN, ET CELLE D'APRÈS ─────────────────────
console.log('\n\x1b[1mLE PROFESSEUR PRÉPARE DEUX SÉANCES\x1b[0m');
const deux = await s.page.evaluate(async ([cid]) => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const poser = async (nom, exo) => {
        const p = makePath(nom, [makeStep(exo, {}, { stepId: 'a', nbItems: 5 })],
                           politiquePerso());
        const entree = state.saveTeacherPath(p.name, p);
        const r = await donnerAuServeur(entree, cid);
        // `donnerAuServeur` rend l'identifiant SOUS LEQUEL LE SERVEUR l'a rangé
        // (il range celui du navigateur tel quel) : on ne le redemande pas.
        return { id: r.pathId || null, erreur: r.erreur || '' };
    };
    // DEUX EXERCICES DIFFÉRENTS, et non deux noms sur le même contenu : voir
    // l'en-tête de ce fichier.
    return { matin: await poser('La séance de ce matin', 'calc-add'),
             apres: await poser('La séance d\'après', 'calc-prio') };
}, [classeId]);
dire('les deux séances partent au serveur',
    !!deux.matin.id && !!deux.apres.id,
    JSON.stringify([deux.matin.erreur, deux.apres.erreur]));
await dormir(1500);

// ── L'HEURE DE CE MATIN : SÉANCE IMPOSÉE, COMPTE À REBOURS D'UNE MINUTE ────
console.log('\n\x1b[1mL\'HEURE DE CE MATIN\x1b[0m');
const lance = await s.page.evaluate(async ([cid, pid]) => {
    const { imposerLaSeance, lancerLeChrono } = await import('./js/core/espaceProf.js');
    const a = await imposerLaSeance(cid, pid);
    const b = await lancerLeChrono(cid, 1, 'terminer');
    return { impose: !!a.ok, chrono: !!b.ok, dit: (b.dit || a.erreur || '') };
}, [classeId, deux.matin.id]);
dire('la séance de ce matin est en cours, compte à rebours d\'une minute lancé',
    lance.impose && lance.chrono, lance.dit);

// ── L'ÉLÈVE OUVRE SON POSTE, ET NE LE RECHARGERA PLUS ──────────────────────
console.log('\n\x1b[1mL\'ÉLÈVE OUVRE SON POSTE\x1b[0m');
const billet = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => x.login && x.code);
    return e ? `${e.login}/${e.code}` : null;
}, [classeId]);
dire('un billet d\'élève est disponible', !!billet, String(billet));

const p = await s.ctx.newPage();
const erreursEleve = [];
p.on('pageerror', (e) => erreursEleve.push(String(e).slice(0, 160)));
p.on('dialog', async (d) => { erreursEleve.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });
await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet)}`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

/**
 * CE QUE L'ÉLÈVE LIT DANS LE BANDEAU DU MOMENT.
 *
 * Crochets LUS dans `js/ui/leMoment.js` : `#le-moment` porte le bandeau
 * (`el.id = 'le-moment'`), `.moment-chrono` le chiffre ou le mot,
 * `moment--fini` la classe du bandeau rouge, et `#le-moment-pause` le voile de
 * la mise en pause. Aucun n'est deviné.
 */
const bandeau = () => p.evaluate(async () => {
    const el = document.getElementById('le-moment');
    const vu = !!(el && !el.hidden && el.getBoundingClientRect().width > 0);
    const { state } = await import('./js/core/state.js');
    return {
        vu,
        mot: vu ? ((el.querySelector('.moment-chrono') || {}).textContent || '').trim() : '',
        fini: vu && el.classList.contains('moment--fini'),
        voile: !!document.getElementById('le-moment-pause'),
        // CE QU'IL A SOUS LA MAIN, pour que « le bandeau est parti » ne puisse
        // pas vouloir dire « l'écran est parti avec ».
        seance: state.studentPath ? (state.studentPath.name || '') : null,
    };
});

// DIX SECONDES ENTRE DEUX INTERROGATIONS DU SERVEUR (voir `seanceDistante.js`) :
// on attend treize, pour ne pas mesurer la fenêtre entre deux battements.
const UN_BATTEMENT = 13000;
await dormir(UN_BATTEMENT);
const auDepart = await bandeau();
dire('l\'élève voit le compte à rebours courir',
    auDepart.vu && !auDepart.fini && /\d/.test(auDepart.mot), JSON.stringify(auDepart));
dire('et la séance de ce matin s\'est ouverte toute seule chez lui',
    auDepart.seance === 'La séance de ce matin', JSON.stringify(auDepart.seance));

// ── LA MINUTE TOMBE, POUR DE VRAI ──────────────────────────────────────────
console.log('\n\x1b[1mLE COMPTE À REBOURS TOMBE À ZÉRO\x1b[0m');
await dormir(62000);
const ecoule = await bandeau();
dire('l\'élève lit « Temps écoulé » — c\'est bien ce que Rémy a vu',
    ecoule.vu && ecoule.fini && /écoulé/i.test(ecoule.mot), JSON.stringify(ecoule));
await p.screenshot({ path: 'tools/tmp/chrono-ecoule.png' });

// ── LA SÉANCE NEUVE ARRIVE, SANS QUE L'ÉLÈVE AIT RIEN RECHARGÉ ─────────────
console.log('\n\x1b[1mLE PROFESSEUR MET LA SÉANCE D\'APRÈS EN COURS\x1b[0m');
const neuve = await s.page.evaluate(async ([cid, pid]) => {
    const { imposerLaSeance } = await import('./js/core/espaceProf.js');
    const r = await imposerLaSeance(cid, pid);
    return { ok: !!r.ok, dit: r.dit || r.erreur || '' };
}, [classeId, deux.apres.id]);
dire('la séance d\'après est imposée', neuve.ok, neuve.dit);

await dormir(UN_BATTEMENT);
const apres = await bandeau();
dire('LE BANDEAU « TEMPS ÉCOULÉ » A DISPARU DE L\'ÉCRAN DE L\'ÉLÈVE',
    !apres.vu, JSON.stringify(apres));
dire('aucun voile de pause n\'est resté', !apres.voile, JSON.stringify(apres));
dire('ET LA SÉANCE NEUVE S\'EST OUVERTE À LA PLACE',
    apres.seance === 'La séance d\'après', JSON.stringify(apres.seance));
await p.screenshot({ path: 'tools/tmp/chrono-seance-neuve.png' });

// ── ET LE COMPTE À REBOURS DE L'HEURE SUIVANTE DOIT ENCORE POUVOIR COURIR ───
//
// Sans cette mesure, on ne verrait pas qu'on a CASSÉ le compte à rebours au
// lieu de l'effacer : « Une mesure qui ne regarde que ce qu'on a corrigé ne
// voit pas ce qu'on a cassé. » `dejaTermine` est un verrou de module, et un
// verrou qui ne se relève pas empêcherait la séance de l'après-midi de se clore.
console.log('\n\x1b[1mET L\'HEURE SUIVANTE PEUT AVOIR LE SIEN\x1b[0m');
await s.page.evaluate(async ([cid]) => {
    const { lancerLeChrono } = await import('./js/core/espaceProf.js');
    await lancerLeChrono(cid, 10, 'terminer');
}, [classeId]);
await dormir(UN_BATTEMENT);
const ensuite = await bandeau();
dire('un nouveau compte à rebours court chez l\'élève',
    ensuite.vu && !ensuite.fini && /\d/.test(ensuite.mot), JSON.stringify(ensuite));

// ── ET COCHER « PLEIN ÉCRAN » NE DOIT PAS L'EMPORTER ───────────────────────
//
// La case repasse par la MÊME action `imposer`, avec la MÊME séance
// (js/ui/espaceClasses.js, branche `d.ecranSeance`). C'est la mesure qui garde
// la correction d'être trop large — sans elle, on effacerait le compte à
// rebours de l'heure en cours parce qu'on a coché une case.
console.log('\n\x1b[1mET COCHER « PLEIN ÉCRAN » NE L\'EMPORTE PAS\x1b[0m');
await s.page.evaluate(async ([cid, pid]) => {
    const { imposerLaSeance } = await import('./js/core/espaceProf.js');
    await imposerLaSeance(cid, pid, true);
}, [classeId, deux.apres.id]);
await dormir(UN_BATTEMENT);
const coche = await bandeau();
dire('le compte à rebours court toujours après la case cochée',
    coche.vu && !coche.fini && /\d/.test(coche.mot), JSON.stringify(coche));

// ── LE VERDICT ─────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
const toutes = [...s.erreurs, ...erreursEleve];
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + toutes.length}`);
if (toutes.length) console.log(toutes.slice(0, 6).join('\n'));
if (s.fenetresNatives.length) console.log('FENÊTRES NATIVES : ' + s.fenetresNatives.join(' | '));
const bon = rates === 0 && toutes.length === 0 && s.fenetresNatives.length === 0;
console.log(bon ? '\x1b[32mTOUT PASSE\x1b[0m' : `\x1b[31m${rates} mesure(s) en échec\x1b[0m`);
await s.fermer();
process.exit(bon ? 0 : 1);
