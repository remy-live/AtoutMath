// LE TRAJET D'UN ÉLÈVE — de l'écran vide à la première réponse juste.
//
// Rémy : « Est-ce que les interfaces élève et prof sont user friendly ? »
//
// `leTrajetDuProf.mjs` a répondu pour le professeur : onze clics, sept
// frottements. Celui-ci pose la même question de l'autre côté du bureau, et il
// la pose DEUX FOIS — sur le téléphone que l'élève a dans la poche, et sur
// l'ordinateur de la salle. Ce ne sont pas les mêmes contraintes : le pouce
// n'atteint pas le haut d'un écran de six pouces, et la souris ne connaît pas
// le clavier virtuel qui recouvre la moitié de la page.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// MÊME RÈGLE QUE POUR LE PROFESSEUR : ce harnais ne vérifie rien. Il compte —
// les clics, les secondes, et ce qu'il faut savoir sans que ce soit écrit. Le
// jugement vient à la lecture.
//
// ET UNE RÈGLE DE PLUS, APPRISE LA DERNIÈRE FOIS : un frottement inventé coûte
// plus cher qu'un frottement manqué. Quand le harnais ne trouve pas un bouton,
// il doit d'abord se demander s'il cherche au bon endroit — deux des sept
// frottements du premier relevé étaient de ma faute, pas de celle de l'écran.
//
// Usage :  node tools/leTrajetDeLEleve.mjs
// Écrit ses captures dans tools/tmp/eleve/ et son relevé sur la sortie.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';
import { mkdirSync } from 'node:fs';

const DOSSIER = 'tools/tmp/eleve';
mkdirSync(DOSSIER, { recursive: true });

// ─────────────────────────────────────────────── LE RELEVÉ ──────────────────

const etapes = [];
let etape = null;

const demarrer = (nom, question) => {
    etape = { nom, question, clics: 0, debut: Date.now(), frictions: [] };
    etapes.push(etape);
    console.log(`\n── ${nom}`);
    if (question) console.log(`   « ${question} »`);
};
const finir = () => {
    if (!etape) return;
    etape.duree = Math.round((Date.now() - etape.debut) / 100) / 10;
    console.log(`   ${etape.clics} clic(s) · ${etape.duree}s`
        + (etape.frictions.length ? ` · ${etape.frictions.length} frottement(s)` : ''));
};
const frotte = (quoi) => { if (etape) etape.frictions.push(quoi); console.log(`   ⚠ ${quoi}`); };

async function clic(page, selecteur, quoi) {
    try {
        await page.click(selecteur, { timeout: 3000 });
        if (etape) etape.clics++;
        return true;
    } catch (e) {
        frotte(`on ne peut pas cliquer : ${quoi || selecteur}`);
        return false;
    }
}

let noVue = 0;
async function vue(page, nom) {
    noVue++;
    const f = `${DOSSIER}/${String(noVue).padStart(2, '0')}-${nom}.png`;
    await page.screenshot({ path: f });
    console.log(`   📷 ${f}`);
}

// ─────────────────────────────────────────────── LE SERVEUR ─────────────────

const PORT = String(8700 + Math.floor(Math.random() * 90));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('le serveur d\'essai n\'a pas démarré')), 30000);
    srv.stdout.on('data', d => { if (String(d).includes('"port"')) { clearTimeout(t); ok(); } });
    srv.on('error', ko);
});
await attendre(400);
const URL = `http://127.0.0.1:${PORT}/index.html`;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const erreurs = [];

// ═══════════════════════════════════════════════════════════════════════════
// LA PRÉPARATION — le professeur, hors chronomètre.
// ═══════════════════════════════════════════════════════════════════════════
//
// On ne compte pas ces gestes-ci : ils ont déjà été comptés dans le trajet du
// professeur. Ce qu'on veut ici, c'est une séance qui EXISTE et qui attende
// l'élève — le reste est du décor.

const prof = await nav.newPage({ viewport: { width: 1320, height: 900 } });
prof.on('pageerror', e => erreurs.push('prof: ' + String(e).slice(0, 140)));
await prof.goto(URL);
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await prof.evaluate(async () => {
    const { identifierProf } = await import('./js/core/verrouProf.js');
    await identifierProf('remy@essai.test', 'motdepassetreslong');
});
await prof.reload();
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });

const prepare = await prof.evaluate(async () => {
    const { creerClasse, apercuDeListe, importerListe, auServeur } =
        await import('./js/core/espaceProf.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { identiteDeParcours } = await import('./js/core/shortcodes.js');
    const c = await creerClasse('5B essai', '5e');
    const ap = await apercuDeListe(c.id, 'BLANC Zoé;zoe.b;2024\nMARTIN;Léa\nDURAND;Paul\n', '');
    const r = await importerListe(c.id, ap.apercu.texte);
    const parcours = makePath('Calcul mental — rentrée', [
        makeStep('calc-add', {}, { stepId: 'a', nbItems: 4, threshold: 3 }),
        makeStep('calc-sub', {}, { stepId: 'b', nbItems: 3, threshold: 2 })
    ]);
    const enr = await auServeur('/teacher/paths',
        { action: 'save', path: { ...parcours, id: identiteDeParcours(parcours) } });
    await auServeur('/teacher/assign', { pathId: enr.pathId, classId: c.id });
    return { classe: c.id, eleves: (r.eleves || []).map(e => `${e.prenom} ${e.login}/${e.code}`) };
});
console.log('préparé (hors chronomètre) :', prepare.eleves.join(' · '));

// ═══════════════════════════════════════════════════════════════════════════
// LE TRAJET, SUR DEUX APPAREILS
// ═══════════════════════════════════════════════════════════════════════════
//
// LE TÉLÉPHONE N'EST PAS UN PETIT ORDINATEUR. `hasTouch` et `isMobile` sont
// indispensables : sans eux, `pointer: coarse` reste faux et l'application ne
// passe jamais en présentation téléphone — on mesurerait alors l'écran de
// bureau rétréci, c'est-à-dire rien.
const APPAREILS = [
    { nom: 'telephone', viewport: { width: 390, height: 844 },
      hasTouch: true, isMobile: true, deviceScaleFactor: 2,
      dit: 'le téléphone dans la poche' },
    { nom: 'ordinateur', viewport: { width: 1280, height: 800 },
      hasTouch: false, isMobile: false, deviceScaleFactor: 1,
      dit: 'l\'ordinateur de la salle' }
];

for (const app of APPAREILS) {
    console.log(`\n${'═'.repeat(70)}\n  ${app.dit.toUpperCase()}  (${app.viewport.width} × ${app.viewport.height})\n${'═'.repeat(70)}`);

    const ctx = await nav.newContext({
        viewport: app.viewport, hasTouch: app.hasTouch,
        isMobile: app.isMobile, deviceScaleFactor: app.deviceScaleFactor
    });
    const el = await ctx.newPage();
    el.on('pageerror', e => erreurs.push(`${app.nom}: ` + String(e).slice(0, 140)));
    // UNE FENÊTRE NATIVE EST UN FROTTEMENT EN SOI. Rémy : « tu utilises des
    // alert et prompt, on évite ! »
    el.on('dialog', async d => { frotte(`FENÊTRE NATIVE : ${d.message()}`); await d.dismiss(); });

    // ─────────────────────────────────────────── 1. ARRIVER ET ENTRER ──────
    demarrer(`1. Arriver et entrer [${app.nom}]`,
        'Combien de gestes entre « j\'ouvre le site » et « je travaille » ?');

    await el.goto(URL);
    await el.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
    await el.waitForTimeout(1000);
    await vue(el, `${app.nom}-1-arrivee`);

    const porte = await el.evaluate(() => {
        const p = document.getElementById('portail');
        const champs = [...document.querySelectorAll('#portail input')].map(i => ({
            id: i.id, type: i.type, mode: i.inputMode || '',
            etiquette: (document.querySelector(`label[for="${i.id}"]`) || {}).textContent || '',
            place: i.placeholder || ''
        }));
        const perdu = [...document.querySelectorAll('#portail a, #portail button')]
            .map(b => (b.textContent || '').trim().toLowerCase())
            .some(t => t.includes('perdu') || t.includes('oublié') || t.includes('code ?'));
        return { present: !!p, champs, perdu,
            mots: (p ? p.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 140) };
    });
    console.log(`   la porte demande : ${porte.champs.map(c => c.etiquette.trim() || c.place || c.id).join(' + ')}`);
    if (!porte.perdu) {
        frotte('rien pour « j\'ai perdu mon code » : l\'élève qui a perdu son billet '
            + 'ne peut rien faire seul');
    }
    // PAS DE CLAVIER NUMÉRIQUE ICI, ET C'EST JUSTE. J'avais d'abord compté un
    // frottement parce que le champ du code n'appelle pas `inputmode="numeric"`
    // sur téléphone. C'était faux : le code d'un élève s'écrit « 4KP2 » — quatre
    // signes, lettres comprises. Un clavier de chiffres l'empêcherait de taper
    // son propre billet. Le harnais avait raison sur le fait, tort sur le sens.

    await el.fill('#portail-login', 'zoe.b');
    await el.fill('#portail-code-eleve', '2024');
    if (etape) etape.clics += 2;      // deux champs = deux mises au point
    await clic(el, '#portail-connecter', 'Se connecter');
    await el.waitForTimeout(3500);
    await vue(el, `${app.nom}-2-entre`);
    const dedans = await el.evaluate(() => !document.getElementById('portail'));
    if (!dedans) frotte('le billet n\'ouvre pas la porte');
    finir();

    // ─────────────────────────────────────────── 2. TROUVER SON TRAVAIL ────
    demarrer(`2. Trouver son travail [${app.nom}]`,
        'La séance donnée par le professeur, il la voit ou il la cherche ?');

    const arrivee = await el.waitForFunction(async () => {
        const { lireSeances } = await import('./js/ui/donnerSeance.js');
        return (await lireSeances()).length > 0;
    }, null, { timeout: 25000 }).then(() => true).catch(() => false);
    if (!arrivee) frotte('la séance du professeur n\'arrive pas');
    await el.waitForTimeout(1200);
    await vue(el, `${app.nom}-3-accueil`);

    // CE QUI EST À LUI, ET CE QUI NE L'EST PAS. C'est le premier frottement du
    // relevé du professeur, vu de l'autre côté : sur un poste partagé, la
    // bibliothèque du professeur s'affichait sous la séance de l'élève.
    const ecran = await el.evaluate(() => {
        const vu = (e) => {
            if (!e) return false;
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
        };
        const titres = [...document.querySelectorAll('h1, h2, h3, .section-title, .accueil-titre')]
            .filter(vu).map(h => (h.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
        const boutons = [...document.querySelectorAll('button, a.btn, .tuile, .carte-jour')]
            .filter(vu).filter(b => (b.textContent || '').trim());
        // LA SÉANCE SE CHERCHE PAR SA SECTION, pas par le nom du parcours.
        // Premier jet : je cherchais un bouton portant « Calcul mental —
        // rentrée », je n'en trouvais pas, et je comptais un frottement. Or la
        // section s'appelle « Ta séance du jour » et elle est bien là : c'est
        // le harnais qui cherchait le mauvais mot.
        const section = [...document.querySelectorAll('.path-section')]
            .find(x => /ta séance du jour/i.test(x.textContent || ''));
        const seance = section
            ? [...section.querySelectorAll('button, a.btn')].filter(vu)[0]
            : boutons.find(b => /rentrée|calcul mental/i.test(b.textContent || ''));
        const r = seance ? seance.getBoundingClientRect() : null;
        return {
            titres: titres.slice(0, 10),
            nbBoutons: boutons.length,
            sansMot: boutons.filter(b => !(b.textContent || '').trim().length).length,
            seanceVisible: !!seance,
            seanceY: r ? Math.round(r.y) : null,
            seanceHaut: r ? Math.round(r.height) : null,
            hauteurEcran: window.innerHeight,
            defilement: Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        };
    });
    console.log(`   ce qu'il lit en haut : ${ecran.titres.join(' · ') || '(rien)'}`);
    console.log(`   boutons à l'écran : ${ecran.nbBoutons}`);
    if (!ecran.seanceVisible) {
        frotte('la séance du jour ne porte pas son nom à l\'écran : il doit deviner où cliquer');
    } else {
        console.log(`   sa séance est à ${ecran.seanceY} px du haut `
            + `(écran de ${ecran.hauteurEcran} px)`);
        if (ecran.seanceY > ecran.hauteurEcran) {
            frotte(`sa séance est HORS ÉCRAN : ${ecran.seanceY} px du haut, `
                + `il faut défiler pour la voir`);
        }
        // LE POUCE N'ATTEINT PAS LE HAUT DE L'ÉCRAN. Sur un téléphone de 844 px,
        // le tiers supérieur demande de changer la prise en main.
        if (app.hasTouch && ecran.seanceY < ecran.hauteurEcran / 3) {
            frotte(`sa séance est dans le tiers HAUT de l'écran (${ecran.seanceY} px) : `
                + 'hors d\'atteinte du pouce, il faut rattraper le téléphone');
        }
    }
    if (ecran.defilement > 0) {
        console.log(`   la page défile de ${ecran.defilement} px`);
    }

    // LA BIBLIOTHÈQUE DU PROFESSEUR N'A RIEN À FAIRE LÀ.
    const chezLui = await el.evaluate(() => {
        const t = document.body.innerText || '';
        const titres = [...document.querySelectorAll('.path-section-title')]
            .map(h => (h.textContent || '').trim());
        return {
            bibliotheque: /préparés sur ce poste/i.test(t),
            contredit: /aucun parcours assigné/i.test(t) && /ta séance du jour/i.test(t),
            titreDouble: titres.filter(x => /^parcours du professeur$/i.test(x)).length,
            catalogue: !!document.querySelector('#sidebar .exo-list-item')
        };
    });
    if (chezLui.bibliotheque) {
        frotte('la bibliothèque du professeur s\'affiche sous sa séance');
    }
    // DEUX SECTIONS PORTENT LE MÊME TITRE, ET ELLES SE CONTREDISENT. Tout en
    // haut, « Parcours du professeur » annonce « Aucun parcours assigné pour le
    // moment — saisis le code donné par ton professeur », pendant qu'une séance
    // l'attend plus bas. C'est la première chose que l'élève lit.
    if (chezLui.contredit) {
        frotte('tout en haut, « Parcours du professeur » dit « Aucun parcours assigné » '
            + 'ALORS QUE la séance du jour est là, plus bas : c\'est la première '
            + 'phrase que l\'élève lit, et elle est fausse');
    }
    if (chezLui.titreDouble > 1) {
        frotte(`le titre « Parcours du professeur » apparaît ${chezLui.titreDouble} fois `
            + 'sur le même écran, sur deux sections différentes');
    }
    finir();

    // ─────────────────────────────────────────── 3. RÉPONDRE ──────────────
    demarrer(`3. Répondre à la première question [${app.nom}]`,
        'Où tape-t-il ? Est-ce que ce qu\'il tape reste visible ?');

    // ON LANCE DEPUIS LA SECTION « Ta séance du jour », et l'on VÉRIFIE qu'un
    // jeu a monté avant de juger quoi que ce soit. Au premier jet, mon clic
    // n'ouvrait rien — l'étape durait zéro seconde — et je comptais malgré tout
    // trois frottements sur un écran d'exercice qui n'était jamais apparu.
    // Trois frottements inventés d'un coup : exactement ce que le harnais est
    // censé ne pas faire.
    const lance = await el.evaluate(() => {
        const section = [...document.querySelectorAll('.path-section')]
            .find(x => /ta séance du jour/i.test(x.textContent || ''));
        const b = section && [...section.querySelectorAll('button, a.btn')]
            .find(x => x.getBoundingClientRect().width > 0);
        if (!b) return false;
        b.scrollIntoView({ block: 'center' });
        b.click();
        return true;
    });
    if (lance && etape) etape.clics++;
    await el.waitForTimeout(3500);
    // Un parcours s'ouvre sur sa carte : c'est l'élève qui donne le départ.
    const depart = await el.evaluate(() => {
        const b = [...document.querySelectorAll('button')]
            .filter(x => x.getBoundingClientRect().width > 0)
            .find(x => /commencer|démarrer|c'est parti|go|lancer/i.test(x.textContent || ''));
        if (!b) return false;
        b.click();
        return true;
    });
    if (depart && etape) etape.clics++;
    await el.waitForTimeout(3000);
    await vue(el, `${app.nom}-4-exercice`);

    // LE JEU EST-IL VRAIMENT LÀ ? Sans cette garde, tout ce qui suit décrit
    // l'écran d'accueil en croyant décrire un exercice.
    const monte = await el.evaluate(() => {
        const z = document.getElementById('game-container') || document.querySelector('.game-layer');
        const vu = z && z.getBoundingClientRect().width > 0 && z.children.length > 0;
        return { vu: !!vu, ou: z ? (z.id || z.className) : '(aucune zone de jeu)' };
    });
    if (!monte.vu) {
        console.log(`   le harnais n'a pas su ouvrir l'exercice (${monte.ou}) — `
            + 'RIEN n\'est compté ici : on ne juge pas un écran qu\'on n\'a pas atteint');
        finir();
        await ctx.close();
        continue;
    }

    const jeu = await el.evaluate(() => {
        const vu = (e) => {
            if (!e) return false;
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        };
        const champ = [...document.querySelectorAll('input[type="text"], input[type="number"], .reponse-champ')]
            .find(vu);
        const pave = document.querySelector('.pav-tactile');
        const question = [...document.querySelectorAll('.game-question, .question, .enonce')].find(vu);
        const r = (e) => { const b = e.getBoundingClientRect();
            return { y: Math.round(b.y), h: Math.round(b.height), l: Math.round(b.width) }; };
        // OÙ EN EST-IL ? Une barre, un « 2 sur 7 », quelque chose.
        const texte = (document.body.innerText || '').replace(/\s+/g, ' ');
        return {
            champ: champ ? r(champ) : null,
            pave: pave && vu(pave) ? r(pave) : null,
            question: question ? r(question) : null,
            avancement: /(\d+\s*(\/|sur)\s*\d+)/.test(texte)
                ? (texte.match(/(\d+\s*(?:\/|sur)\s*\d+)/) || [])[1] : '',
            etape: /étape\s*\d/i.test(texte),
            aide: /indice|aide|coup de pouce/i.test(texte),
            quitter: [...document.querySelectorAll('button, a')].filter(vu)
                .some(b => /quitter|retour|arrêter|×/i.test((b.textContent || '').trim())),
            hauteurEcran: window.innerHeight
        };
    });
    console.log(`   champ de réponse : ${jeu.champ ? `y=${jeu.champ.y}, ${jeu.champ.l}×${jeu.champ.h}` : 'aucun'}`);
    console.log(`   pavé tactile : ${jeu.pave ? `y=${jeu.pave.y}, haut ${jeu.pave.h}` : 'absent'}`);
    console.log(`   où il en est : ${jeu.avancement || '(non dit)'}`
        + (jeu.etape ? ' · l\'étape est nommée' : ''));

    if (!jeu.avancement && !jeu.etape) {
        frotte('rien ne dit où il en est : ni « question 2 sur 4 », ni l\'étape du parcours — '
            + 'il travaille sans savoir combien il en reste');
    }
    if (!jeu.aide) {
        frotte('aucun moyen de demander de l\'aide depuis l\'exercice : '
            + 'l\'élève bloqué n\'a que la main levée');
    }
    if (!jeu.quitter) {
        frotte('aucune sortie visible : il ne peut pas revenir à sa séance sans recharger');
    }
    // LE CLAVIER VIRTUEL RECOUVRE LE BAS DE L'ÉCRAN. Si le champ de saisie est
    // dans la moitié basse d'un téléphone, il disparaît sous le clavier au
    // moment même où l'on tape dedans.
    if (app.hasTouch && jeu.champ && !jeu.pave && jeu.champ.y > jeu.hauteurEcran * 0.5) {
        frotte(`le champ de réponse est à ${jeu.champ.y} px sur ${jeu.hauteurEcran} : `
            + 'le clavier du téléphone le recouvrira');
    }
    finir();

    await ctx.close();
}

// ─────────────────────────────────────────────── LE RELEVÉ FINAL ────────────

console.log(`\n${'═'.repeat(70)}`);
const total = etapes.reduce((n, e) => n + e.clics, 0);
const frictions = etapes.reduce((n, e) => n + e.frictions.length, 0);
console.log(`  ${total} clics · ${frictions} frottements · ${noVue} captures`
    + ` · ${erreurs.length} erreur(s) de page`);
console.log('═'.repeat(70));
etapes.forEach(e => {
    console.log(`\n${e.nom} — ${e.clics} clic(s) · ${e.duree}s`);
    e.frictions.forEach(f => console.log(`   ⚠ ${f}`));
});
if (erreurs.length) { console.log('\nerreurs :'); erreurs.slice(0, 8).forEach(e => console.log('   ' + e)); }

await nav.close();
srv.kill();
