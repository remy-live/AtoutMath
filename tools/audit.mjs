// VÉRIFIER TOUT LE PROGRAMME, POUR DE VRAI.
//
// Rémy : « je voudrais que tu vérifies tout le programme ».
//
// `npm test` vérifie les NOYAUX — ce qui se calcule sans navigateur, et c'est
// l'essentiel de la justesse. Mais il ne peut rien dire de ce qui ne se voit
// qu'à l'écran : un exercice qui s'ouvre sur un plateau vide, une fiche qui
// lève une exception au moment de se dessiner, un panneau dont le bouton ne
// répond plus, un plateau qui sort de l'écran d'un téléphone. Ces pannes-là ne
// cassent aucun test ; elles cassent la séance.
//
// CET OUTIL OUVRE L'APPLICATION POUR DE BON et fait le tour :
//
//   · chaque exercice du catalogue est lancé, et l'on regarde s'il se dessine,
//     en combien de temps, et sans une erreur de console ;
//   · chaque fiche imprimable est ouverte et son aperçu doit se garnir ;
//   · chaque panneau, chaque onglet, chaque bouton du mode professeur est
//     cliqué ;
//   · et tout cela une seconde fois en TÉLÉPHONE, où l'on mesure en plus ce
//     qui dépasse de la vitre.
//
// CE QU'IL A FALLU APPRENDRE POUR QU'IL DISE VRAI. Un vérificateur qui ne
// trouve jamais rien ne prouve rien — trois de ses mesures étaient fausses
// avant de devenir utiles :
//
//   · le plateau vivait dans `#game-board`, pas dans le `#game-layer` qu'on
//     interrogeait : la sonde lisait le texte de l'en-tête et concluait
//     « plein » quoi qu'il arrive ;
//   · un délai fixe faisait passer les exercices lents pour des pannes ; on
//     SONDE jusqu'à ce que le plateau se garnisse, et l'on note le temps ;
//   · une fenêtre étroite ne fait pas un téléphone. `telephonePortrait()`
//     exige `(pointer: coarse)` : sans pointeur tactile, on mesurait un écran
//     de bureau rétréci que personne n'a jamais eu sous les yeux.
//
// ET DEUX RÈGLES POUR NE PAS CRIER AU LOUP. Un élément qui sort du plateau
// n'est un défaut que si rien ne le DÉCOUPE : les météorites du jeu de tir
// entrent en scène par le bord, c'est leur métier. Et l'intérieur d'un SVG se
// place dans le repère du dessin, pas dans celui de la page — le mesurer
// remontait cinquante faux positifs par écran. La deuxième a failli tout
// annuler : voir `debordements`, qui innocentait le plateau entier parce qu'il
// se découpe lui-même.
//
// Usage :  node tools/audit.mjs [--tel] [--rapide] [--port 8123]
//          (le petit serveur doit tourner : python3 tools/serve.py 8123)

import { chromium } from 'playwright';

const args = process.argv.slice(2);
const OPT = {
    tel: args.includes('--tel'),
    rapide: args.includes('--rapide'),
    port: (() => { const i = args.indexOf('--port'); return i >= 0 ? args[i + 1] : '8123'; })()
};
const BASE = `http://localhost:${OPT.port}/index.html`;

/** Le délai au-delà duquel une première image se remarque. */
const LENT = 1500;
/** Au-delà, on considère que le plateau ne viendra plus. */
const ABANDON = 4000;

const CHROMIUM = '/opt/pw-browsers/chromium';

function vue() {
    return OPT.tel
        ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
        : { viewport: { width: 1280, height: 820 } };
}

async function ouvrirApp(nav) {
    const p = await nav.newPage(vue());
    const seau = [];
    p.on('pageerror', e => seau.push('ERREUR: ' + String(e).split('\n')[0].slice(0, 170)));
    p.on('console', m => { if (m.type() === 'error') seau.push('CONSOLE: ' + m.text().slice(0, 170)); });
    await p.goto(BASE);
    await p.waitForTimeout(2600);
    // La modale d'arrivée n'est pas l'objet du contrôle.
    await p.evaluate(() => document.querySelectorAll('.modal-overlay')
        .forEach(m => { m.style.display = 'none'; }));
    return { p, seau };
}

/** Le plateau s'est-il garni, et en combien de temps ? */
async function attendrePlateau(p) {
    const t0 = Date.now();
    while (Date.now() - t0 < ABANDON) {
        const plein = await p.evaluate(() => {
            const z = document.getElementById('game-board');
            if (!z) return false;
            const t = (z.textContent || '').trim().length;
            const n = z.querySelectorAll(
                'canvas,svg,button,input,select,textarea,.game-question,img').length;
            return t >= 3 || n > 0;
        });
        if (plein) return Date.now() - t0;
        await p.waitForTimeout(100);
    }
    return null;
}

/**
 * CE QUI SORT DU PLATEAU — et cette sonde était AVEUGLE.
 *
 * Elle mesurait par rapport à la VITRE, en écartant tout ce qu'un cadre
 * découpe. La règle est juste — les météorites du jeu de tir entrent en scène
 * par le bord, c'est leur métier — mais elle remontait la chaîne des parents à
 * partir de l'élément, et le PREMIER parent est `#game-board`, qui porte
 * `overflow: hidden auto`. Tout élément du plateau était donc « découpé », donc
 * innocenté : la sonde n'a jamais rien pu trouver. Mesuré en lui posant exprès
 * une boîte de trois cents pixels à 120 % de la largeur — liste vide.
 *
 * On mesure donc par rapport au PLATEAU, qui est le vrai cadre, et la règle
 * d'innocence s'arrête à lui : un cadre intérieur qui découpe volontairement —
 * la fenêtre glissante de l'organigramme — ne se signale pas. Même code que
 * `js/ui/controle.js`, qui met la sonde à portée de l'Atelier.
 */
async function debordements(p) {
    return p.evaluate(() => {
        const z = document.getElementById('game-board');
        if (!z) return 0;
        const cadre = z.getBoundingClientRect();
        let pire = Math.max(0, z.scrollWidth - z.clientWidth);
        const decoupe = (el) => {
            for (let n = el.parentElement; n && n !== z; n = n.parentElement) {
                if (getComputedStyle(n).overflow !== 'visible') return true;
            }
            return false;
        };
        z.querySelectorAll('*').forEach(el => {
            if (el.ownerSVGElement) return;          // le repère du dessin, pas celui de la page
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) return;
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || cs.display === 'none') return;
            const d = Math.round(Math.max(r.right - cadre.right, cadre.left - r.left));
            if (d > 4 && !decoupe(el)) pire = Math.max(pire, d);
        });
        return pire;
    });
}

/**
 * DEUX TAPES RAPIDES NE DOIVENT PAS ZOOMER LA PAGE.
 *
 * Rémy : « mon fils a joué au jeu de l'horloge et en tapant deux fois
 * rapidement sur le plus, cela a zoomé ». C'est le double-tap du navigateur, et
 * il est en plein dans le chemin de l'exercice : passer de 3 h 05 à 3 h 37
 * demande trente-deux appuis sur « + », vite.
 *
 * `user-scalable=no` dans l'en-tête ne l'empêche pas — Safari sur iOS l'ignore
 * depuis iOS 10, délibérément, parce qu'interdire le zoom ferme l'application à
 * qui voit mal. Ce qui l'empêche, c'est `touch-action: manipulation` sur le
 * bouton. Un bouton laissé en `auto` rouvre donc le défaut, sans que rien ne le
 * signale : d'où ce balayage, sur CHAQUE exercice, à chaque audit.
 *
 * On ne regarde que ce qui se voit : un bouton caché ne reçoit pas de tape.
 */
async function tapesRapides(p) {
    return p.evaluate(() => {
        const z = document.getElementById('game-board');
        if (!z) return [];
        const noms = new Set();
        z.querySelectorAll('button, [role="button"]').forEach(el => {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) return;
            if (getComputedStyle(el).touchAction !== 'auto') return;
            noms.add(String(el.className || el.tagName).split(' ')[0] || el.tagName);
        });
        return [...noms].slice(0, 4);
    });
}

/**
 * LE PANNEAU DE RÉGLAGES D'AVANT-PARTIE, TRAVERSÉ COMME LE FAIT UN PROFESSEUR.
 *
 * Un exercice réglable ne démarre plus tout seul : il demande d'abord ses
 * réglages. L'audit ne les change pas — il veut les valeurs du catalogue — mais
 * il doit appuyer sur « Jouer ! », sinon tout exercice réglable se signale
 * comme un plateau vide.
 */
async function traverserLesReglages(p) {
    const ouvert = await p.evaluate(() => {
        const m = document.getElementById('student-config-modal');
        return !!(m && getComputedStyle(m).display !== 'none');
    });
    if (!ouvert) return;
    await p.click('#btn-student-config-start').catch(() => { });
    await p.waitForTimeout(150);
}

async function tourDuCatalogue(p, seau) {
    const ids = await p.evaluate(async () => {
        const s = await import('/js/core/state.js');
        // En professeur, tout est déverrouillé : on veut vérifier les
        // exercices, pas le verrou. Le panneau de réglages, lui, S'INTERPOSE
        // MAINTENANT POUR LES DEUX RÔLES — c'était le trou signalé par Rémy
        // (« les paramètres ne fonctionnent pas ») —, et l'audit le traverse
        // comme un professeur : il appuie sur « Jouer ! ».
        s.state.isTeacherMode = true;
        s.state.previewDeviceMode = 'desktop';
        const { exercices } = await import('/js/data/catalog.js');
        return exercices.map(e => e.id);
    });
    const liste = OPT.rapide ? ids.filter((_, i) => i % 5 === 0) : ids;
    const soucis = [];
    for (let i = 0; i < liste.length; i++) {
        seau.length = 0;
        try {
            await p.evaluate(async (id) => {
                const { openGameLayer } = await import('/js/games/engine.js');
                const { getExerciseById } = await import('/js/data/catalog.js');
                openGameLayer(getExerciseById(id), false);
            }, liste[i]);
            await traverserLesReglages(p);
            const mis = await attendrePlateau(p);
            if (mis === null) seau.push('VIDE: le plateau reste vide');
            else if (mis > LENT) seau.push(`LENT: ${mis} ms avant la première image`);
            const trop = await debordements(p);
            if (trop) seau.push(`DÉBORDE: ${trop} px hors de l'écran`);
            const zoomables = await tapesRapides(p);
            if (zoomables.length) {
                seau.push(`ZOOM: deux tapes rapides zoomeraient sur ${zoomables.join(', ')}`);
            }
        } catch (e) {
            seau.push('LANCEMENT: ' + String(e.message || e).split('\n')[0].slice(0, 170));
        }
        await p.evaluate(() => {
            const l = document.getElementById('game-layer');
            if (l) l.style.display = 'none';
        }).catch(() => { });
        await p.waitForTimeout(120);
        if (seau.length) soucis.push({ id: liste[i], quoi: [...new Set(seau)] });
        if ((i + 1) % 25 === 0) process.stderr.write(`  … ${i + 1}/${liste.length}\n`);
    }
    return { combien: liste.length, soucis };
}

async function tourDesFiches(p, seau) {
    const ids = await p.evaluate(async () => {
        const { exercices } = await import('/js/data/catalog.js');
        return exercices.filter(e => e.printGeneratorId || e.printable).map(e => e.id);
    });
    const liste = OPT.rapide ? ids.filter((_, i) => i % 5 === 0) : ids;
    const soucis = [];
    for (const id of liste) {
        seau.length = 0;
        const r = await p.evaluate(async (id) => {
            try {
                const { getExerciseById } = await import('/js/data/catalog.js');
                const exo = getExerciseById(id);
                const m = await import('/js/ui/printSheet.js');
                m.ouvrirFicheModal(exo, { ...(exo.printParams || exo.params || {}) });
                return '';
            } catch (e) { return 'LANCEMENT: ' + String(e.message || e).slice(0, 160); }
        }, id);
        if (r) seau.push(r);
        await p.waitForTimeout(650);
        const vide = await p.evaluate(() => {
            const a = document.querySelector('.fp-apercu, #fq-apercu, [id$="-apercu"]');
            if (!a) return 'pas d\'aperçu';
            return a.children.length === 0 ? 'aperçu vide' : '';
        });
        if (vide) seau.push('VIDE: ' + vide);
        await p.evaluate(() => document.querySelectorAll('.modal-overlay')
            .forEach(m => { m.style.display = 'none'; }));
        await p.waitForTimeout(80);
        if (seau.length) soucis.push({ id, quoi: [...new Set(seau)] });
    }
    return { combien: liste.length, soucis };
}

/**
 * LA FRISE DES MARCHES VIT DANS LES DEUX PANNEAUX, ET PAS SEULEMENT DANS UN.
 *
 * Rémy, dans les propriétés d'une étape : « on ne peut pas faire les réglages
 * des étapes, tout décocher ne fonctionne pas. Où est la frise ? » Les cases
 * s'affichaient, la boîte de la barre restait vide : tout ce qui la fait vivre
 * n'était branché que dans le panneau d'avant-partie.
 *
 * On monte donc CHAQUE exercice à progression dans l'éditeur d'étape, et l'on
 * exige une barre garnie. Le défaut était invisible aux tests — il n'existe que
 * dans le DOM — et c'est exactement ce que l'audit est là pour attraper.
 */
async function tourDesEtapes(p, seau) {
    const ids = await p.evaluate(async () => {
        const { exercices, paramSchemaOf } = await import('/js/data/catalog.js');
        return exercices
            .filter(e => paramSchemaOf(e).some(x => x && x.type === 'marches'))
            .map(e => e.id);
    });
    const soucis = [];
    for (const id of ids) {
        seau.length = 0;
        const quoi = await p.evaluate(async (exoId) => {
            const { renderGameConfigUI } = await import('/js/games/configUI.js');
            const { paramSchemaOf, getExerciseById } = await import('/js/data/catalog.js');
            let hote = document.getElementById('builder-config-content');
            if (!hote) {
                hote = document.createElement('div');
                hote.id = 'builder-config-content';
                hote.style.display = 'none';
                document.body.appendChild(hote);
            }
            hote.innerHTML = '';
            delete hote._marchesBranchees;
            renderGameConfigUI({ exerciseId: exoId, nbItems: 12, overrides: {} },
                () => { }, 'builder-config-content');
            await new Promise(r => setTimeout(r, 120));
            const cases = hote.querySelectorAll('[data-kind="multiselect"]').length;
            const zones = hote.querySelectorAll('[data-bande-marches] [data-marche]').length;
            const cache = !!hote.querySelector('[data-repartition-marches]');
            if (!cases) return 'les cases à cocher manquent';
            if (!zones) return 'la frise reste vide';
            if (!cache) return 'le partage ne serait pas enregistré';
            // LE RÉGLAGE QUI CHANGE D'UNE MARCHE À L'AUTRE, s'il y en a un.
            //
            // Rémy : « pour réponse à saisir ou 4 réponses, il faut que ce soit
            // spécifique à la zone ». Ce réglage QUITTE le bas du panneau pour
            // entrer dans la bulle : s'il n'y arrive pas, il n'est plus nulle
            // part, et le panneau perd un réglage sans rien dire. C'est
            // exactement le genre de disparition qu'un tour de garde attrape et
            // qu'une relecture manque.
            const parM = paramSchemaOf(getExerciseById(exoId)).filter(x => x && x.parMarche);
            for (const x of parM) {
                if (!hote.querySelector(`[data-par-marche="${x.id}"]`)) {
                    return `« ${x.label} » ne serait pas enregistré par marche`;
                }
                if (!hote.querySelector(`[data-marche-reponse][data-marche-cle="${x.id}"]`)) {
                    return `« ${x.label} » a quitté le panneau sans arriver dans la bulle`;
                }
            }
            return '';
        }, id);
        if (quoi) seau.push(`ÉTAPE: ${quoi}`);
        if (seau.length) soucis.push({ id, quoi: [...new Set(seau)] });
    }
    await p.evaluate(() => {
        const h = document.getElementById('builder-config-content');
        if (h) h.innerHTML = '';
    });
    return { combien: ids.length, soucis };
}

async function tourDesPanneaux(p, seau) {
    const soucis = [];
    const essai = async (nom, fn) => {
        seau.length = 0;
        try { await fn(); } catch (e) {
            seau.push('LANCEMENT: ' + String(e.message || e).split('\n')[0].slice(0, 170));
        }
        await p.waitForTimeout(600);
        if (seau.length) soucis.push({ id: nom, quoi: [...new Set(seau)] });
        await p.evaluate(() => document.querySelectorAll('.modal-overlay')
            .forEach(m => { m.style.display = 'none'; }));
        await p.waitForTimeout(100);
    };
    const clic = (sel) => p.evaluate((s) => {
        const b = document.querySelector(s);
        if (b) b.click();
    }, sel);

    // On repasse élève : les onglets du haut n'existent que pour lui.
    await p.evaluate(async () => {
        const s = await import('/js/core/state.js');
        s.state.isTeacherMode = false;
        document.body.classList.remove('teacher-mode');
    });
    for (const [nom, sel] of [
        ['onglet Parcours', '#top-btn-path'], ['onglet Code', '#top-btn-code'],
        ['onglet Profil', '#top-btn-profile'], ['onglet Exercices', '#top-btn-grid'],
        ['carnet d\'erreurs', '#btn-open-errors'], ['thème', '#btn-toggle-theme'],
        ['ma classe', '#btn-open-sync'], ['sauvegarde', '#btn-open-import-export-student'],
        ['arbre des domaines', '#desk-btn-acc'], ['retour au clic', '#desk-btn-drill'],
        ['par chapitres', '[data-rangement="chapitre"]'], ['par domaines', '[data-rangement="domaine"]']
    ]) await essai(nom, () => clic(sel));

    // LE VERROU DU PROFESSEUR NOUS FERME LA PORTE, ET IL A RAISON.
    //
    // Depuis que la bascule demande un mot de passe, ce clic ouvrait une
    // fenêtre au lieu de passer professeur — et TOUT le reste de cette passe,
    // qui n'existe que pour lui, ne trouvait plus rien à cliquer. L'audit
    // annonçait « 13 panneaux, rien à signaler » là où il en vérifiait 26 la
    // veille : il passait en ne trouvant rien, la pire façon de passer.
    //
    // On se donne donc un jeton, comme un professeur déjà identifié. On
    // n'affaiblit rien — le verrou lui-même est éprouvé dans
    // `tests/verrouProf.test.mjs` et dans un navigateur ; ici on vérifie les
    // panneaux, pas la serrure.
    await p.evaluate(() => localStorage.setItem('atoutmath-prof',
        JSON.stringify({ token: 'audit.audit', displayName: 'Audit' })));
    await essai('bascule en professeur', async () => {
        await clic('#btn-role');
        await p.waitForTimeout(800);
    });
    // ET L'ON VÉRIFIE QUE ÇA A MARCHÉ. Sans ce garde-fou, la panne ci-dessus
    // se reproduirait en silence à la prochaine évolution du verrou.
    const estProf = await p.evaluate(async () => {
        const s = await import('/js/core/state.js');
        return !!s.state.isTeacherMode;
    });
    if (!estProf) {
        soucis.push({ id: 'bascule en professeur',
            quoi: ['le mode professeur ne s\'est pas activé — la suite de cette '
                 + 'passe ne vérifie rien'] });
    }
    // UN PARCOURS D'ABORD, SINON LA MOITIÉ DE LA BARRE N'EXISTE PAS.
    //
    // Les commandes qui appartiennent au parcours — mode & barème, tester,
    // code élève, imprimer, les trois aperçus — sont maintenant CACHÉES tant
    // qu'aucune étape n'est posée (voir `outilsDuParcours` dans ui/builder.js).
    // L'audit balayait donc huit boutons de moins sans que personne s'en
    // aperçoive : il vérifiait consciencieusement une barre vide.
    await p.evaluate(async () => {
        const s = await import('/js/core/state.js');
        const { makeStep } = await import('/js/core/path.js');
        const bd = await import('/js/ui/builder.js');
        s.state.currentPath.steps = [makeStep('calc-add', {}, { nbItems: 10, threshold: 7 })];
        bd.renderTeacherPath();
    });
    await p.waitForTimeout(300);
    const boutons = await p.evaluate(() =>
        [...document.querySelectorAll('#builder-view button[id], header button[id], .toolbar-icon-btn')]
            .filter(b => b.offsetParent !== null).map(b => b.id).filter(Boolean));
    for (const id of boutons) await essai('professeur · #' + id, () => clic('#' + id));
    return { combien: 13 + boutons.length, soucis };
}

/**
 * L'APPLICATION TIENT-ELLE SANS RÉSEAU, APRÈS UNE SEULE VISITE ?
 *
 * La panne que ce contrôle garde était invisible : un service worker ne voit
 * pas les requêtes faites AVANT son activation, si bien qu'au premier passage
 * les deux cent quarante modules arrivaient sans jamais être mis en cache.
 * Mesuré alors : 18 entrées après une visite, 267 après deux — et entre les
 * deux, une application hors ligne réduite à une coquille vide, zéro exercice.
 *
 * Aucun test sous Node ne pouvait le voir : il faut un vrai service worker, un
 * vrai cache, et couper le réseau pour de bon. C'est exactement ce que cet
 * outil sait faire.
 */
async function tourHorsLigne(nav) {
    const soucis = [];
    const ctx = await nav.newContext(vue());
    const p = await ctx.newPage();
    try {
        await p.goto(BASE, { waitUntil: 'networkidle' });
        await p.evaluate(() => navigator.serviceWorker.ready);
        // On laisse le garnissage finir : il part après l'activation.
        let entrees = 0;
        for (let i = 0; i < 20 && entrees < 200; i++) {
            await p.waitForTimeout(900);
            entrees = await p.evaluate(async () => {
                const k = await caches.keys();
                return k.length ? (await (await caches.open(k[0])).keys()).length : 0;
            });
        }
        if (entrees < 200) soucis.push({ id: 'cache', quoi: [`CACHE MAIGRE : ${entrees} entrées après une visite`] });

        await ctx.setOffline(true);
        await p.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
        await p.waitForTimeout(4000);
        const cartes = await p.evaluate(() => document.querySelectorAll('.card').length);
        if (cartes < 50) {
            soucis.push({ id: 'hors ligne', quoi: [
                `VIDE : ${cartes} exercices affichés sans réseau, après une visite`] });
        }
    } catch (e) {
        soucis.push({ id: 'hors ligne', quoi: ['ERREUR : ' + String(e.message || e).split('\n')[0].slice(0, 150)] });
    }
    await ctx.close();
    return { combien: 2, soucis };
}

/**
 * LES FEUILLES DE PARCOURS — l'angle mort de cet audit, et il a coûté cher.
 *
 * `tourDesFiches` ouvre la fiche de chaque exercice SEUL : quatre-vingt-trois
 * feuilles, et elles sont propres. Mais un exercice ne s'imprime presque jamais
 * seul — il s'imprime dans un parcours, à côté de dix autres, dans un bloc que
 * la mise en page lui a taillé. Et c'est là, et là seulement, que vivaient tous
 * les défauts que Rémy a trouvés lui-même, un PDF de cent soixante-dix-huit
 * pages à la main :
 *
 *   · le rang du bloc ne passait pas, et les six teintes n'en faisaient qu'une ;
 *   · la liste des voisins non plus, et les hiéroglyphes sortaient de tailles
 *     différentes, les disques de 8 et de 11 cm dessinés identiques ;
 *   · la rédaction de Thalès débordait de trente millimètres sur la rangée
 *     suivante ;
 *   · la frise des marches restait vide dans la roue de l'aperçu.
 *
 * Quatre défauts de la même famille, aucun visible sur la feuille d'un exercice
 * seul. D'où cette passe, qui compose une feuille de parcours par exercice et y
 * vérifie deux choses.
 *
 * UN : RIEN NE DÉBORDE SUR LA RANGÉE SUIVANTE. Les numéros disent où commence
 * chaque rangée ; un élément qui commence avant la frontière et finit après
 * dessine chez le voisin. On innocente le mobilier de page — ce qui traverse la
 * feuille de bord à bord ne déborde de rien — et les conteneurs qui ENVELOPPENT
 * la rangée suivante : ils la contiennent, ils ne la recouvrent pas.
 *
 * DEUX : CHAQUE PANNEAU DE RÉGLAGE EST GARNI. Un exercice dont le générateur
 * déclare des réglages doit les montrer ; et un exercice à progression doit
 * montrer sa frise, celle qui dit ce que l'élève travaillera. C'est très
 * exactement ce qui manquait, et l'audit ouvrait déjà les panneaux de l'ÉDITEUR
 * d'étape sans jamais ouvrir ceux de l'APERÇU.
 *
 * CE VÉRIFICATEUR A ÉTÉ CALIBRÉ SUR UN DÉFAUT CONNU. On a remis le débordement
 * de Thalès, vérifié qu'il le voyait — trente-huit pixels —, puis on l'a
 * retiré. Un vérificateur qui n'a jamais rien attrapé ne prouve rien : c'est
 * arrivé la veille, avec une première version qui filtrait sur le style en
 * ligne au lieu du style calculé et ne voyait donc aucun élément.
 */
async function tourDesFeuillesParcours(p, seau) {
    const ids = await p.evaluate(async () => {
        const { exercices } = await import('/js/data/catalog.js');
        const { getGenerator } = await import('/js/core/registry.js');
        await import('/js/core/activities/index.js');
        return exercices.filter(e => e.printable || e.printGeneratorId
            || (getGenerator(e.generatorId) || {}).ecrit).map(e => e.id);
    });
    const liste = OPT.rapide ? ids.filter((_, i) => i % 5 === 0) : ids;
    const soucis = [];
    for (const id of liste) {
        seau.length = 0;
        const lance = await p.evaluate(async (id) => {
            try {
                // ON MASQUE, ON NE SUPPRIME PAS. Arracher la modale du DOM
                // laisse le moteur de modales avec une référence morte, et la
                // passe suivante — celle des panneaux — se casse sur un
                // « Cannot read properties of null ». C'est ce que fait déjà
                // `tourDesFiches`, et pour la même raison.
                document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display = 'none'; });
                const { ouvrirFicheParcours } = await import('/js/ui/printParcours.js');
                ouvrirFicheParcours({ steps: [{ exerciseId: id, nbItems: 6 }] });
                return '';
            } catch (e) { return 'LANCEMENT: ' + String(e.message || e).slice(0, 150); }
        }, id);
        if (lance) { soucis.push({ id, quoi: [lance] }); continue; }
        await p.waitForTimeout(700);
        const quoi = await p.evaluate(() => {
            // LA MODALE VISIBLE, ET ELLE SEULE. On en masque une par exercice
            // sans les retirer (voir plus haut) : `querySelector` rendrait la
            // PREMIÈRE, c'est-à-dire la plus ancienne, et l'on vérifierait
            // cent trente fois la même vieille feuille.
            const vives = [...document.querySelectorAll('.modal-overlay')]
                .filter(m => m.style.display !== 'none');
            const hote = vives[vives.length - 1] || document;
            const apercu = hote.querySelector('.fp-apercu');
            if (!apercu || !apercu.children.length) return ['APERÇU VIDE'];
            const out = [];
            for (const page of [...apercu.children]) {
                const rp = page.getBoundingClientRect();
                const nums = [...page.querySelectorAll('.fx-grille-num, .fx-num')];
                if (nums.length < 2) continue;
                const rangees = [];
                for (const n of nums) {
                    const y = Math.round(n.getBoundingClientRect().top);
                    const r = rangees.find(x => Math.abs(x.y - y) < 6);
                    if (r) r.n.push(n); else rangees.push({ y, n: [n] });
                }
                rangees.sort((a, b) => a.y - b.y);
                for (let i = 0; i + 1 < rangees.length && !out.length; i++) {
                    const suivante = rangees[i + 1];
                    for (const e of page.querySelectorAll('*')) {
                        const r = e.getBoundingClientRect();
                        if (!r.width || !r.height) continue;
                        if (r.width > rp.width * 0.8) continue;
                        if (r.top >= suivante.y - 3 || r.bottom <= suivante.y + 3) continue;
                        if (suivante.n.some(n => e.contains(n))) continue;
                        out.push(`DÉBORDE de ${Math.round(r.bottom - suivante.y)} px sur la `
                            + `rangée suivante (${e.tagName.toLowerCase()}.${
                                (e.className.baseVal ?? e.className ?? '').toString().split(' ')[0]})`);
                        break;
                    }
                }
                if (out.length) break;
            }
            return out;
        });
        // Le panneau de réglage de cet exercice : garni, et sa frise remplie.
        const roue = await p.evaluate(async (id) => {
            const { getExerciseById, paramSchemaOf } = await import('/js/data/catalog.js');
            const { getGenerator } = await import('/js/core/registry.js');
            const exo = getExerciseById(id);
            const gen = getGenerator(exo.printGeneratorId || exo.generatorId) || {};
            const attendus = ((gen.params || []).filter(x => x && x.papier !== false)).length;
            const aMarches = (gen.params || []).some(x => x && x.type === 'marches')
                || (paramSchemaOf(exo) || []).some(x => x && x.type === 'marches');
            document.querySelectorAll('.pp-roue-panneau').forEach(n => n.remove());
            const vives = [...document.querySelectorAll('.modal-overlay')]
                .filter(m => m.style.display !== 'none');
            const hote = vives[vives.length - 1] || document;
            const b = [...hote.querySelectorAll('.fp-apercu button')]
                .find(x => x.dataset.reglage !== undefined);
            if (!b) return attendus ? ['PAS D’ENGRENAGE dans l’aperçu'] : [];
            b.click();
            await new Promise(r => setTimeout(r, 250));
            const n = document.querySelector('.pp-roue-panneau');
            if (!n) return ['LE PANNEAU DE RÉGLAGE NE S’OUVRE PAS'];
            const contenu = n.querySelector('[data-r-contenu]');
            const champs = contenu ? contenu.querySelectorAll('[data-param]').length : 0;
            const dits = [];
            if (attendus && !champs) dits.push(`PANNEAU VIDE : ${attendus} réglage(s) attendu(s)`);
            if (aMarches) {
                const barre = n.querySelector('[data-barre-marches]');
                if (!barre || !barre.children.length) dits.push('FRISE VIDE : la barre des marches ne se remplit pas');
            }
            n.remove();
            return dits;
        }, id);
        const tout = [...quoi, ...roue, ...new Set(seau)];
        if (tout.length) soucis.push({ id, quoi: tout });
    }
    // ON REND L'APPLICATION COMME ON L'A TROUVÉE. Cette passe ouvre une modale
    // par exercice ; la laisser en place fait échouer la passe des panneaux,
    // qui cherche des boutons cachés dessous — mesuré : « onglet Code, Cannot
    // read properties of null ». Un vérificateur qui casse le suivant ne
    // vérifie plus rien.
    await p.evaluate(() => {
        document.querySelectorAll('.pp-roue-panneau').forEach(n => n.remove());
        document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display = 'none'; });
    });
    await p.waitForTimeout(200);
    return { combien: liste.length, soucis };
}

// --- Le tour complet -----------------------------------------------------------

const nav = await chromium.launch({ executablePath: CHROMIUM });
const { p, seau } = await ouvrirApp(nav);
const cadre = OPT.tel ? 'TÉLÉPHONE' : 'ORDINATEUR';
process.stderr.write(`# audit ${cadre}${OPT.rapide ? ' (rapide)' : ''}\n`);

const tours = [
    ['exercices', await tourDuCatalogue(p, seau)],
    ['fiches papier', await tourDesFiches(p, seau)],
    ['étapes de parcours', await tourDesEtapes(p, seau)],
    ['feuilles de parcours', await tourDesFeuillesParcours(p, seau)],
    ['panneaux', await tourDesPanneaux(p, seau)],
    ['hors ligne', await tourHorsLigne(nav)]
];
await nav.close();

let total = 0;
console.log(`\n=== AUDIT ${cadre} ===`);
tours.forEach(([nom, r]) => {
    total += r.soucis.length;
    console.log(`\n${nom} : ${r.combien} vérifiés, ${r.soucis.length} à signaler`);
    r.soucis.forEach(s => console.log(`  · ${s.id}\n      ${s.quoi.join('\n      ')}`));
});
console.log(total ? `\n${total} point${total > 1 ? 's' : ''} à regarder.` : '\nRien à signaler.');
process.exit(total ? 1 : 0);
