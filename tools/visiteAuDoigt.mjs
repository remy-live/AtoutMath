// LA VISITE GUIDÉE, MESURÉE DU PREMIER AU DERNIER ÉCRAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QU'ELLE GARDE, ET POURQUOI UNE ÉPREUVE N'Y SUFFIT PAS. La visite promet
// six VRAIS écrans. « Vrai » ne se vérifie pas sans navigateur : un écran qui
// ne s'ouvre pas, une fenêtre restée par-dessus la suivante, un tableau de
// classe vide parce que la semence n'a pas pris — rien de tout cela ne tombe
// dans `npm test`, et tout cela se voit du premier coup d'œil.
//
// ON NE S'IDENTIFIE PAS, et c'est tout le sujet : la visite s'adresse à qui
// arrive sans compte. Une sonde qui se connecterait d'abord mesurerait un
// écran que le visiteur ne verra jamais.
//
// ET L'ON VÉRIFIE QUE LE TIROIR EST BIEN SÉPARÉ : ce que la visite sème ne
// doit pas apparaître dans le stockage ordinaire. C'est la promesse qui
// l'autorise à écrire un parcours et un journal sans rien demander.

import { ouvrirSonde } from './sonde.mjs';

const dormir = (ms) => new Promise(r => setTimeout(r, ms));

// CE QU'ON CHERCHE À CHAQUE ÉTAPE — un crochet LU dans la source, jamais
// deviné. Un sélecteur inventé rend `false`, c'est-à-dire la même réponse
// qu'un logiciel cassé, et l'on cherche alors le défaut pendant vingt minutes.
const ATTENDU = [
    // `.path-step[data-step-id]` : lu dans `ui/builder.js`, qui va chercher
    // ses rangées par ce couple-là.
    { titre: 'l\'atelier', quoi: '#builder-view .path-step' },
    // `#pp-apercu` : lu dans `ui/printParcours.js`, c'est la feuille dessinée.
    //
    // ET LE REPLI DU TÉLÉPHONE N'EST PAS UN DÉFAUT. Sous 700 px, la feuille
    // est rangée dans un `<details>` fermé, et c'est une décision MESURÉE
    // (`css/ui.css`) : une A4 réduite à la largeur d'un téléphone donne 154
    // textes sous 12 px — « pas un aperçu, une tache grise ». La sonde a
    // d'abord crié dessus ; elle demandait à voir ce que le logiciel refuse
    // délibérément de montrer là. On accepte donc l'un OU l'autre : la feuille
    // dessinée, ou le titre qui l'ouvre. Les deux disparaissent si la fenêtre
    // ne s'ouvre pas, qui est ce qu'on garde.
    { titre: 'la fiche à imprimer', quoi: '#pp-apercu, .fp-apercu-repli > summary' },
    // `#partage-code` et `#partage-lien` : lus dans `ui/partagerParcours.js`.
    { titre: 'le code et le QR', quoi: '#partage-code, #partage-lien' },
    // La carte des mondes vit dans `#view-path` ; ses nœuds portent
    // `.world-node-picto` — lu dans `ui/pathView.js`.
    { titre: 'l\'écran de l\'élève', quoi: '#view-path .world-node-picto, '
        + '#view-path .salle-jeu-picto' },
    // `#cl-racine` : lu dans `ui/classesUI.js`, c'est la racine de l'écran.
    { titre: 'le tableau de la classe', quoi: '#cl-racine .cl-grille, #cl-racine table, '
        + '#cl-racine .cl-ligne' },
    // `.prep-page` : lue dans `ui/preparerTablette.js`.
    { titre: 'la préparation d\'une tablette', quoi: '#vs-ecran .prep-page' }
];

async function unePasse(taille) {
    const s = await ouvrirSonde({ largeur: taille.largeur, hauteur: taille.hauteur });
    const dits = [], ratés = [];
    try {
        await dormir(900);
        // ON ENTRE PAR LA PORTE, comme un visiteur : l'écran de découverte,
        // puis la première étape de la visite. Aller directement à l'adresse
        // `?visite=1` sauterait justement le chemin qu'on veut mesurer.
        await s.doitExister('#portail-decouvrir', 'la porte de la découverte');
        await s.page.click('#portail-decouvrir');
        await dormir(900);
        await s.doitExister('[data-visite]', 'les portes de la visite');
        const portes = await s.page.$$eval('[data-visite]', els => els.length);
        dits.push(`${portes} étapes proposées sur l'écran de découverte`);
        if (portes !== ATTENDU.length) {
            ratés.push('nombre d\'étapes');
            dits.push(`ATTENDU ${ATTENDU.length} ÉTAPES, PAS ${portes}`);
        }

        await s.page.click('[data-visite]');
        // Le rechargement, la semence, puis le premier écran.
        await s.page.waitForFunction(() => window.__visitePrete === true,
            null, { timeout: 30000 });
        dits.push('la visite s\'ouvre sur son tiroir à elle');

        for (let i = 0; i < ATTENDU.length; i++) {
            const a = ATTENDU[i];
            if (i > 0) {
                await s.page.click('.vs-bande [data-suivant]');
                await dormir(1400);
            }
            const vu = await s.page.evaluate((sel) => ({
                // ON COMPTE CE QUI EST PEINT, PAS CE QUI EXISTE.
                //
                // Cette sonde a dit « l'atelier s'ouvre » devant une page
                // BLANCHE. Les rangées du parcours étaient bien dans le
                // document — et cachées par
                // `body:not(.teacher-mode) .teacher-only { display: none }`,
                // parce que la visite posait le drapeau du rôle sans poser la
                // classe. Compter des nœuds, c'est mesurer ce que le code
                // croit ; mesurer une hauteur, c'est mesurer ce que le
                // visiteur voit.
                trouve: [...document.querySelectorAll(sel)]
                    .filter(el => el.getBoundingClientRect().height > 0).length,
                bande: !!document.querySelector('.vs-bande'),
                rang: (document.querySelector('.vs-compte') || {}).textContent || '',
                // DEUX FENÊTRES L'UNE SUR L'AUTRE : le défaut que ce parcours
                // produit si l'on oublie de refermer. On ne compte que les
                // voiles VISIBLES — les neuf de `index.html` sont toujours là,
                // en `display: none`.
                voiles: [...document.querySelectorAll('.modal-overlay')]
                    .filter(el => getComputedStyle(el).display !== 'none').length,
                // ET CE QUI S'OUVRE N'EST PAS COUPÉ PAR LA BANDE.
                //
                // MESURÉ à l'étape de la fiche : « Fermer » et « Télécharger
                // le PDF » passaient SOUS la bande. La fenêtre s'ouvrait,
                // tout était « visible », et l'on ne pouvait plus en sortir
                // autrement qu'en quittant la visite. Aucune sonde qui compte
                // des nœuds ne voit cela : il faut comparer deux bords.
                coupes: (() => {
                    const b = document.querySelector('.vs-bande');
                    if (!b) return 0;
                    const haut = b.getBoundingClientRect().top;
                    return [...document.querySelectorAll('.modal-overlay')]
                        .filter(el => getComputedStyle(el).display !== 'none')
                        .flatMap(el => [...el.children])
                        .filter(c => c.getBoundingClientRect().bottom > haut + 1).length;
                })()
            }), a.quoi);
            dits.push(vu.trouve > 0
                ? `${i + 1}. ${a.titre} s'ouvre (${vu.rang.toLowerCase()})`
                : `${i + 1}. ${a.titre.toUpperCase()} NE S'OUVRE PAS`);
            if (!vu.trouve) ratés.push(a.titre);
            if (!vu.bande) { ratés.push('bande'); dits.push('LA BANDE A DISPARU'); }
            if (vu.voiles > 1) {
                ratés.push('fenêtres empilées');
                dits.push(`${vu.voiles} FENÊTRES OUVERTES EN MÊME TEMPS`);
            }
            if (vu.coupes) {
                ratés.push('fenêtre coupée');
                dits.push(`${i + 1}. LA BANDE COUPE LE BAS DE LA FENÊTRE`);
            }
        }

        // ── LE TIROIR EST-IL VRAIMENT SÉPARÉ ? ─────────────────────────────
        //
        // On lit le VRAI `localStorage` — celui de la page, qui a été remplacé
        // par l'objet préfixé — à travers un `iframe` tout neuf, dont le
        // `localStorage` est celui d'origine. C'est la seule façon de voir ce
        // que le visiteur, lui, aurait dans son tiroir.
        const dehors = await s.page.evaluate(async () => {
            const f = document.createElement('iframe');
            f.src = 'about:blank';
            document.body.appendChild(f);
            await new Promise(r => setTimeout(r, 50));
            const hors = [];
            let prefixees = 0;
            try {
                const vrai = f.contentWindow.localStorage;
                for (let i = 0; i < vrai.length; i++) {
                    const k = vrai.key(i);
                    if (k && k.indexOf('visite:') === 0) prefixees++;
                    else hors.push(k);
                }
            } catch (e) { return { erreur: String(e && e.message) }; }
            const n = hors.length;
            f.remove();
            return { horsTiroir: n, dansTiroir: prefixees, noms: hors };
        });
        if (dehors.erreur) {
            dits.push(`le tiroir n'a pas pu être lu : ${dehors.erreur}`);
        } else {
            // CE QUI EXISTAIT AVANT LA VISITE N'EST PAS DE LA VISITE. Le
            // premier chargement de la page pose l'identifiant d'appareil et
            // le profil local : ce sont les clefs du VISITEUR, et les compter
            // ferait crier la sonde sur un tiroir parfaitement étanche. On ne
            // regarde donc que ce que la visite aurait pu écrire — son
            // parcours, ses classes, ses séances, son réglage de rôle.
            const DE_LA_VISITE = /classes|seances|teacherPath|parcours|visite/i;
            const fuites = (dehors.noms || []).filter(k => DE_LA_VISITE.test(k));
            dits.push(fuites.length === 0
                ? `tout est dans le tiroir de la visite (${dehors.dansTiroir} clefs,`
                    + ` ${dehors.horsTiroir} clefs du visiteur intactes)`
                : `CLEF(S) DE LA VISITE ÉCRITE(S) DEHORS : ${fuites.join(', ')}`);
            if (fuites.length) ratés.push('tiroir percé');
            dits.push('   clefs du visiteur : ' + (dehors.noms || []).join(', '));
        }

        // ── ET L'ON SORT ───────────────────────────────────────────────────
        await s.page.click('.vs-bande [data-quitter]');
        await dormir(2500);
        const apres = await s.page.evaluate(() => ({
            adresse: window.location.search,
            visite: !!window.__visiteGuidee
        }));
        dits.push(!apres.visite && !apres.adresse.includes('visite')
            ? 'on sort de la visite et l\'on revient à l\'accueil'
            : `ON NE SORT PAS : ${apres.adresse || '(aucun paramètre)'}`);
        if (apres.visite || apres.adresse.includes('visite')) ratés.push('sortie');

        await s.page.screenshot({ path: `tools/tmp/visite-${taille.nom}.png` });

        if (s.erreurs.length) {
            dits.push(`erreurs de page : ${s.erreurs.length}`);
            s.erreurs.slice(0, 4).forEach(e => dits.push(`  ! ${String(e).slice(0, 150)}`));
            ratés.push('erreurs de page');
        } else {
            dits.push('erreurs de page : 0, fenêtres natives : '
                + s.fenetresNatives.length);
        }
        if (s.fenetresNatives.length) ratés.push('fenêtre native');
    } finally {
        await s.fermer();
    }
    return { dits, ratés };
}

const TAILLES = [
    { nom: 'doigt', largeur: 390, hauteur: 900 },
    { nom: 'ordi', largeur: 1280, hauteur: 950 }
];

let total = 0;
for (const t of TAILLES) {
    const { dits, ratés } = await unePasse(t);
    console.log(`── ${t.nom} (${t.largeur} × ${t.hauteur}) ──`);
    dits.forEach(d => console.log('   ' + d));
    if (ratés.length) console.log('   ratés : ' + ratés.join(', '));
    total += ratés.length;
}
console.log(total === 0 ? '\nTOUT PASSE.' : `\n${total} chose(s) à regarder.`);
process.exit(total === 0 ? 0 : 1);
