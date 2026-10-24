// LA PORTE DE LA MAISON DEPUIS LA LISTE DES CLASSES, ET LA SORTIE DE L'ÉLÈVE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, deux demandes dans la même phrase :
//
// « pour l'instant je me connecte avec un compte élève, il a accès à son compte
// chez lui mais pour le moment j'aimerai bloquer son accès chez lui, on peut le
// mettre dans l'onglet mes classes, là où tu affiches la liste de classe. »
//
// « Dans la partie élève il n'y a pas d'endroit pour se déconnecter. »
//
// CE QUE SEULE UNE SONDE PEUT DIRE, ET QU'AUCUNE ÉPREUVE NE DIT :
//
//   · que le bouton est SUR LA CARTE, à l'écran, et qu'il ne vole pas le clic
//     qui ouvre la classe — c'est exactement le reproche qu'il venait de faire
//     au code de classe ;
//   · qu'il écrit vraiment au serveur, et que l'élève le ressent chez lui ;
//   · que la sortie de l'élève est VISIBLE. Mesuré avant d'y toucher :
//     `#btn-deconnexion` existait, n'était pas caché, et restait invisible —
//     son menu l'était. « Exister » et « se voir » sont deux questions, et
//     seule la seconde était celle de Rémy.
//
//   node tools/porteEtSortie.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
const classeId = s.info.classe;

// ── 1. LE PROFESSEUR, SUR LA LISTE DE SES CLASSES ───────────────────────────
console.log('\n\x1b[1mLA LISTE DES CLASSES\x1b[0m');
await s.page.evaluate(async () => {
    const m = await import('./js/ui/espaceClasses.js');
    await m.ouvrirEspaceClasses();
});
await dormir(2500);

await s.doitExister(`[data-maison-classe="${classeId}"]`, 'la porte de la maison, sur la carte');
const lireLeBouton = () => s.page.evaluate((cid) => {
    const b = document.querySelector(`[data-maison-classe="${cid}"]`);
    const carte = b && b.closest('[data-ouvrir]');
    const rb = b ? b.getBoundingClientRect() : null;
    const rc = carte ? carte.getBoundingClientRect() : null;
    return {
        mot: b ? (b.textContent || '').trim() : '',
        ferme: b ? b.dataset.ferme : null,
        visible: !!(rb && rb.width > 0 && rb.height > 0),
        // IL EST DANS LA CARTE — donc il faut qu'il s'arrête avant elle.
        dansLaCarte: !!(carte && carte.contains(b)),
        // ET IL NE COUVRE PAS LA CARTE : le clic qui ouvre la classe doit
        // rester possible partout ailleurs.
        partDeLaCarte: rb && rc ? Math.round(100 * (rb.width * rb.height) / (rc.width * rc.height)) : -1,
        auBout: !!(rb && rc && rb.right > rc.left + rc.width * 0.5)
    };
}, classeId);

let v = await lireLeBouton();
console.log(`   ${JSON.stringify(v)}`);
dire('LE BOUTON EST SUR LA CARTE, ET IL DIT L\'ÉTAT', v.visible && /Maison ouverte/.test(v.mot), v.mot);
dire('il est au bout de la ligne, pas au milieu de la visée', v.auBout);
dire('et il ne couvre qu\'une petite part de la carte', v.partDeLaCarte > 0 && v.partDeLaCarte < 20,
    `${v.partDeLaCarte} %`);

// ── 2. ON FERME, ET LA CLASSE NE S'OUVRE PAS ───────────────────────────────
await s.cliquer(`[data-maison-classe="${classeId}"]`, 'la porte de la maison');
await dormir(1800);
v = await lireLeBouton();
dire('UN CLIC FERME LA PORTE', v.ferme === '1' && /Maison fermée/.test(v.mot), v.mot);
const restee = await s.page.evaluate(() => !!document.querySelector('.ec-carte'));
dire('ET LA CLASSE NE S\'EST PAS OUVERTE au passage', restee,
    'le clic doit s\'arrêter au bouton, la carte entière est cliquable');

// LE SERVEUR L'A VRAIMENT ÉCRIT — un bouton qui change de mot sans rien
// envoyer est le pire des deux mondes.
const auServeur = await s.page.evaluate(async ([cid]) => {
    const { mesClasses } = await import('./js/core/espaceProf.js');
    const r = await mesClasses();
    // `mesClasses()` REND LE TABLEAU, PAS UN OBJET QUI LE CONTIENT. Ma
    // première version lisait `r.classes` : toujours vide, donc un défaut
    // annoncé là où le serveur avait parfaitement enregistré. On accepte les
    // deux formes plutôt que de parier sur une.
    const liste = Array.isArray(r) ? r : (r.classes || []);
    const c = liste.find(x => x.id === cid) || {};
    return { ferme: !!Number(c.hors_seance), mot: c.hors_seance_mot || '' };
}, [classeId]);
dire('LE SERVEUR L\'A ENREGISTRÉ', auServeur.ferme, JSON.stringify(auServeur));

// ── 3. L'ÉLÈVE, CHEZ LUI, HORS SÉANCE ──────────────────────────────────────
console.log('\n\x1b[1mL\'ÉLÈVE SE CONNECTE, SANS SÉANCE EN COURS\x1b[0m');
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
await dormir(3000);

const chezLui = await p.evaluate(() => {
    // LE VOILE PORTE L'IDENTIFIANT `eleve-ferme` — LU dans `majFerme`
    // (ui/seanceDistanteUI.js), pas deviné. Ma première version cherchait
    // `[class*="ferme"]` et ne trouvait rien : un crochet inventé rend la même
    // réponse qu'un logiciel cassé, et la sonde annonçait une porte ouverte
    // sur une porte parfaitement fermée.
    const voile = document.getElementById('eleve-ferme');
    const r = voile ? voile.getBoundingClientRect() : null;
    return {
        vu: !!(voile && r && r.width > 0),
        mot: voile ? ((voile.querySelector('.eleve-ecarte-mot') || {}).textContent || '').trim() : ''
    };
});
dire('LA PORTE EST FERMÉE CHEZ LUI', chezLui.vu, chezLui.mot || 'aucun voile');

// ── 4. ET IL PEUT SORTIR ───────────────────────────────────────────────────
console.log('\n\x1b[1mLA SORTIE, DANS « MON PROFIL »\x1b[0m');
// On rouvre la porte pour mesurer le profil sur un écran normal : le voile
// couvre tout, et ce n'est pas lui qu'on regarde ici.
await s.cliquer(`[data-maison-classe="${classeId}"]`, 'la porte de la maison');
await dormir(13000);

await p.evaluate(async () => {
    const { setTopNavMode } = await import('./js/ui/navigation.js');
    setTopNavMode('profile');
});
await dormir(1200);
const sortie = await p.evaluate(() => {
    const b = document.getElementById('btn-sortie-profil');
    const r = b ? b.getBoundingClientRect() : null;
    return {
        existe: !!b, cache: b ? b.hidden : null,
        visible: !!(r && r.width > 0 && r.height > 0),
        mot: b ? (b.textContent || '').trim() : '',
        // DANS LA LIGNE DE L'IDENTITÉ, et non perdue en bas de page.
        dansQuiTravaille: !!(b && b.closest('.profile-qui'))
    };
});
console.log(`   ${JSON.stringify(sortie)}`);
dire('LA SORTIE EST VISIBLE SUR L\'ÉCRAN DE L\'ÉLÈVE', sortie.visible, JSON.stringify(sortie));
dire('elle dit DE QUOI on se déconnecte', /Se déconnecter de /.test(sortie.mot), sortie.mot);
dire('et elle est dans la ligne « Qui travaille ? »', sortie.dansQuiTravaille);

// ON CLIQUE VRAIMENT : un bouton qui ne mène nulle part est pire qu'absent.
await p.evaluate(() => document.getElementById('btn-sortie-profil').click());
await dormir(1500);
// LA FENÊTRE DE `showModal` N'A PAS DE `.modal-title` : son titre est un `h3`
// stylé EN LIGNE (voir ui/modal.js). Les `.modal-title` de la page sont les
// neuf fenêtres déclarées dans index.html, toutes cachées — les chercher
// revenait à mesurer autre chose, et à annoncer un bouton mort sur un bouton
// qui marche. On regarde donc le VOILE qui s'affiche.
const fenetre = await p.evaluate(() => {
    const v = [...document.querySelectorAll('.modal-overlay')]
        .filter(e => e.getBoundingClientRect().width > 0);
    return v.map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90));
});
dire('LE CLIC OUVRE LA DEMANDE DE CONFIRMATION',
    fenetre.length === 1 && /déconnecter/i.test(fenetre[0]), fenetre.join(' · '));

console.log(`\nerreurs de page : ${s.erreurs.length + erreursEleve.length}`
    + ` · fenêtres natives : ${s.fenetresNatives.length}`);
[...s.erreurs, ...erreursEleve].slice(0, 6).forEach(e => console.log(`   ${e}`));
await s.fermer();
process.exit(ratés ? 1 : 0);
