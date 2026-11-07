// MILLE VERSIONS — ce que Rémy a dit, et ce que cela a changé.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 14 octobre : « nous avions faire plus de 1000 versions puisque nous
// sommes à plus de v1000 alors ca méritait un cadeau ».
//
// CE CADEAU N'EXISTE QUE PARCE QU'ON A TENU UNE RÈGLE PENDANT MILLE VERSIONS.
// `CLAUDE.md` : « Un bon commentaire dit POURQUOI, cite Rémy mot pour mot quand
// c'est lui qui a tranché, et annonce ce qui a été MESURÉ. » Au bout de mille
// versions, le dépôt porte 670 de ses phrases, chacune posée à l'endroit exact
// du code qu'elle a fait changer.
//
// Cet outil les rassemble. Il n'invente rien : il lit, il range, il imprime.
//
// ── CE QU'IL CHERCHE, ET POURQUOI ÇA MARCHE ────────────────────────────────
//
// Le dépôt écrit ses décisions d'une façon régulière, et c'est elle qu'on
// exploite :
//
//   · les phrases de Rémy sont entre GUILLEMETS FRANÇAIS, précédées de son
//     prénom — « Rémy : « … » », « Rémy, deux fois : « … » » ;
//   · la décision qui suit est annoncée par une PHRASE EN CAPITALES, parce que
//     c'est la convention de ce dépôt pour dire « voici ce qui a été tranché ».
//
// On rend donc, pour chaque phrase : ce qu'il a dit, ce que cela a décidé, et
// où cela vit. Les trois colonnes d'un journal de bord.
//
//     node tools/milleVersions.mjs [sortie.html]

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { execSync } from 'node:child_process';

const SORTIE = process.argv[2] || 'tools/tmp/mille-versions.html';

// LES DOSSIERS DU LOGICIEL D'ABORD, LES NOTES ENSUITE — et l'ordre compte.
// Une même phrase se retrouve souvent dans le code ET dans les notes du jour ;
// celle du code vaut mieux, parce qu'elle est posée à côté de ce qu'elle a
// changé. On lit donc le code en premier, et une phrase déjà vue ne se répète
// pas.
const ENDROITS = [
    { dossier: 'js/games', zone: 'Les jeux' },
    { dossier: 'js/core/generators', zone: 'Les exercices' },
    { dossier: 'js/data', zone: 'Le catalogue' },
    { dossier: 'js/core/activities', zone: 'Les exercices' },
    { dossier: 'js/ui/fiches', zone: 'Le papier' },
    { dossier: 'js/ui', zone: 'Les écrans' },
    { dossier: 'js/core', zone: 'Les règles du logiciel' },
    { dossier: 'api', zone: 'La classe et les élèves' },
    { dossier: 'css', zone: 'Ce qu\'on voit' },
    { dossier: 'tools', zone: 'Les outils de mesure' },
    { dossier: 'tests', zone: 'Les épreuves' },
    { dossier: 'docs', zone: 'Les séances racontées' }
];

const EXTENSIONS = new Set(['.js', '.mjs', '.php', '.css', '.md', '.html']);

/** Tous les fichiers d'un dossier, sans descendre dans ceux qu'on a déjà nommés. */
function fichiersDe(dossier, dejaVus) {
    const sortie = [];
    let entrees;
    try { entrees = readdirSync(dossier); } catch (e) { return sortie; }
    for (const nom of entrees) {
        const chemin = join(dossier, nom);
        let info;
        try { info = statSync(chemin); } catch (e) { continue; }
        if (info.isDirectory()) {
            // `tools/tmp` est jetable, et `js/ui/fiches` a déjà sa zone.
            if (nom === 'tmp' || nom === 'node_modules') continue;
            if (dejaVus.has(chemin)) continue;
            sortie.push(...fichiersDe(chemin, dejaVus));
        } else if (EXTENSIONS.has(extname(nom))) {
            sortie.push(chemin);
        }
    }
    return sortie;
}

/**
 * Les BLOCS de commentaire d'un fichier, avec leur ligne de départ.
 *
 * Un bloc est une suite de lignes de commentaire qui se touchent : c'est
 * l'unité d'explication de ce dépôt, et c'est en son sein que la phrase de
 * Rémy et la décision qu'elle a prise se tiennent compagnie.
 */
function blocsDe(source, ext) {
    const lignes = source.split('\n');
    // DANS UN COMMENTAIRE /* … */, LES LIGNES DU MILIEU NE COMMENCENT PAR RIEN.
    //
    // Première écriture : on ne prenait que les lignes débutant par `//`, `*`
    // ou `/*`. Résultat mesuré : SIX phrases seulement dans « Ce qu'on voit »,
    // alors que `css/modules.css` en porte des dizaines — un commentaire CSS
    // s'ouvre par `/*` puis continue en texte nu, aligné à l'indentation. On
    // suit donc l'ÉTAT : dedans ou dehors.
    let dansBloc = false;
    const estCommentaire = (l) => {
        const t = l.trim();
        if (ext === '.md') return true;                       // tout est prose
        if (ext === '.html') return t.startsWith('<!--') || t.startsWith('--');
        if (dansBloc) {
            if (t.includes('*/')) dansBloc = false;
            return true;
        }
        // Un `/*` qui se referme sur la même ligne ne nous fait pas entrer.
        if (t.includes('/*') && !t.includes('*/')) { dansBloc = true; return true; }
        return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
            || t.startsWith('#');
    };
    const nu = (l) => l.trim()
        .replace(/^(\/\/+|\*+\/?|\/\*+|#+|>|<!--|-->)\s?/, '')
        .replace(/\s*\*\/\s*$/, '')
        .replace(/\s*-->\s*$/, '');

    const blocs = [];
    let courant = null;
    for (let i = 0; i < lignes.length; i++) {
        if (estCommentaire(lignes[i])) {
            const texte = nu(lignes[i]);
            if (!courant) courant = { ligne: i + 1, lignes: [] };
            courant.lignes.push(texte);
        } else if (courant) {
            // LA PREMIÈRE LIGNE DE CODE APRÈS LE BLOC : c'est littéralement ce
            // que le commentaire explique. On la garde, pour pouvoir dire « et
            // voilà ce que ça a donné ».
            courant.code = lignes[i].trim().slice(0, 100);
            blocs.push(courant);
            courant = null;
        }
    }
    if (courant) blocs.push(courant);
    return blocs;
}

/**
 * LA DÉCISION QUE CE BLOC ANNONCE.
 *
 * Convention du dépôt : une décision s'annonce par une phrase en CAPITALES.
 * On prend la première qu'on trouve, et l'on s'arrête à la ponctuation — la
 * suite est l'explication, et elle est souvent longue de dix lignes.
 */
function laDecision(texteDuBloc) {
    // Au moins quatre mots en capitales de suite : en dessous, on attrape des
    // sigles et des noms de fichiers.
    const m = texteDuBloc.match(
        /([A-ZÀ-Ü][A-ZÀ-Ü'’À-Ü]*(?:\s+[A-ZÀ-Ü'’À-Ü«»,:-]+){3,}[A-ZÀ-Ü])/);
    if (!m) return '';
    let d = m[1].replace(/\s+/g, ' ').trim().replace(/[,:—-]+$/, '');
    // Une décision qui ne contient aucune minuscule et fait plus de cent
    // signes est en réalité un titre de séparation : on n'en veut pas.
    return d.length > 110 ? '' : d;
}

// --- La récolte -------------------------------------------------------------

const vues = new Set();
const parZone = new Map();
let litFichiers = 0;

const dejaVus = new Set(ENDROITS.map(e => e.dossier));
for (const { dossier, zone } of ENDROITS) {
    for (const chemin of fichiersDe(dossier, dejaVus)) {
        let source;
        try { source = readFileSync(chemin, 'utf8'); } catch (e) { continue; }
        litFichiers++;
        for (const bloc of blocsDe(source, extname(chemin))) {
            const texte = bloc.lignes.join(' ').replace(/\s+/g, ' ');
            // RÉMY, PUIS SA PHRASE. Le morceau du milieu — « , deux fois : »,
            // « , capture d'un iPhone à l'appui : » — en dit souvent autant que
            // la citation : on le garde.
            const motif = /(RÉMY|Rémy)([^«»]{0,120}?)«\s*([^»]{8,400}?)\s*»/g;
            let m;
            while ((m = motif.exec(texte)) !== null) {
                const phrase = m[3].replace(/\s+/g, ' ').trim();
                // AU MOINS TROIS MOTS, ET DIX-HUIT LETTRES.
                //
                // MESURÉ sur la première récolte : les citations les plus
                // courtes n'étaient pas des phrases de Rémy mais des NOMS
                // d'exercices qu'un commentaire mettait entre guillemets —
                // « Quadrilatère », « Valeur absolue », « lire un codage ».
                // Honnêtes, mais elles ne disent rien : ce document rassemble
                // ce qu'il a DIT, pas ce qu'il a nommé.
                const mots = phrase.split(/\s+/).filter(x => x.length > 1).length;
                const clef = phrase.toLowerCase().replace(/[^a-zà-ü0-9]/g, '');
                // ET PAS DE CITATION TOUT EN CAPITALES : celles-là ne sont pas
                // de lui. C'est un titre de décision du dépôt que le motif a
                // ramassé parce qu'il se trouvait entre guillemets.
                const toutEnCapitales = phrase === phrase.toLocaleUpperCase('fr');
                if (mots < 3 || clef.length < 18 || toutEnCapitales
                    || vues.has(clef)) continue;
                vues.add(clef);
                if (!parZone.has(zone)) parZone.set(zone, []);
                parZone.get(zone).push({
                    phrase,
                    contexte: m[2].replace(/\s+/g, ' ').replace(/[\s,:]+$/, '').trim(),
                    decision: laDecision(texte),
                    fichier: chemin,
                    ligne: bloc.ligne
                });
            }
        }
    }
}

// --- Ce que le logiciel est devenu ------------------------------------------

const compte = (commande, repli) => {
    try { return execSync(commande, { encoding: 'utf8' }).trim(); }
    catch (e) { return repli; }
};

const version = (readFileSync('index.html', 'utf8').match(/\?v=(\d+)/) || [])[1] || '?';
const commits = compte('git rev-list --count HEAD', '?');
// LA DATE EN FRANÇAIS. `--date=format:%B` rend « July » : git parle la langue
// de la machine, et celle-ci est en anglais. Un document qu'on offre ne dit pas
// « le 26 July 2026 ».
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const brut = compte('git log --reverse --format=%ad --date=short | head -1', '');
const premier = /^\d{4}-\d{2}-\d{2}$/.test(brut)
    ? (() => { const [a, m, j] = brut.split('-');
        return `${Number(j)} ${MOIS[Number(m) - 1]} ${a}`; })()
    : '?';

// LES EXERCICES SE COMPTENT DANS LE CATALOGUE, PAS À COUPS DE `grep`.
//
// Première écriture : on comptait les lignes `id: '…'` de `js/data/*.js`, et la
// page annonçait 502 exercices. Le vrai nombre est 225 — le motif ramassait
// aussi les identifiants d'étapes, de paramètres et de thèmes. UN DOCUMENT
// QU'ON OFFRE NE PEUT PAS SE TROMPER SUR SES PROPRES CHIFFRES.
//
// Et on ne passe pas par le shell pour le demander : cet outil est un module,
// il importe le catalogue comme n'importe quelle épreuve du dépôt. `helpers`
// pose le strict minimum de navigateur dont le noyau a besoin pour se charger
// sous Node.
let exercices = '?';
try {
    await import('../tests/helpers.mjs');
    await import('../js/core/activities/index.js');
    const catalogue = await import('../js/data/catalog.js');
    exercices = String(catalogue.exercices.length);
} catch (e) {
    console.log('  (le catalogue n\'a pas pu être lu : ' + e.message + ')');
}
// LES ACTIVITÉS, ET NON LES FICHIERS DE `js/games/`.
//
// `ls js/games/*.js` en compte 91 : c'est un nombre de FICHIERS, dont certains
// sont des pièces partagées et non des jeux. Ce qu'on veut dire est « combien
// de façons différentes de poser une question », et cela, c'est le registre
// des activités qui le sait — 126 enregistrées, 125 réellement employées par
// un exercice du catalogue. On annonce celles qui SERVENT.
let jeux = '?';
try {
    const { allActivities } = await import('../js/core/registry.js');
    const { exercices: exos } = await import('../js/data/catalog.js');
    const employees = new Set(exos.map(e => e.activityId).filter(Boolean));
    jeux = String(allActivities().filter(a => employees.has(a.id)).length);
} catch (e) { /* le registre n'a pas pu être lu */ }
const epreuves = compte('ls tests/*.test.mjs | wc -l', '?');
const lignes = compte('cat js/**/*.js js/*.js api/**/*.php api/*.php css/*.css 2>/dev/null | wc -l', '?');

const total = [...parZone.values()].reduce((n, l) => n + l.length, 0);
console.log(`${litFichiers} fichiers lus · ${total} phrases de Rémy · `
    + `${parZone.size} zones`);
for (const [zone, liste] of parZone) {
    const avecDecision = liste.filter(p => p.decision).length;
    console.log(`  ${zone.padEnd(26)} ${String(liste.length).padStart(3)} `
        + `(${avecDecision} avec la décision nommée)`);
}

// --- La page ----------------------------------------------------------------

const esc = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ordreDesZones = ENDROITS.map(e => e.zone)
    .filter((z, i, t) => t.indexOf(z) === i);

const sections = ordreDesZones
    .filter(z => parZone.has(z))
    .map(zone => {
        const liste = parZone.get(zone);
        const items = liste.map(p => `
        <li>
            <blockquote>${esc(p.phrase)}</blockquote>
            ${p.decision ? `<p class="decision">${esc(p.decision)}</p>` : ''}
            <p class="ou">${esc(p.fichier)}<span class="ligne"> · ligne ${p.ligne}</span></p>
        </li>`).join('');
        return `
    <section>
        <h2>${esc(zone)} <span class="combien">${liste.length} phrase${liste.length > 1 ? 's' : ''}</span></h2>
        <ul>${items}</ul>
    </section>`;
    }).join('');

const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Mille versions — AtoutMath</title>
<style>
    :root {
        --encre: #1f2430; --doux: #5b6478; --trait: #d8dce6;
        --fond: #fbfaf7; --accent: #8a5a2b;
    }
    * { box-sizing: border-box; }
    body {
        margin: 0; padding: 0 20px 60px;
        background: var(--fond); color: var(--encre);
        font: 16px/1.6 Georgia, 'Times New Roman', serif;
    }
    .dedans { max-width: 46rem; margin: 0 auto; }
    header { padding: 54px 0 30px; border-bottom: 2px solid var(--encre); }
    h1 { margin: 0 0 4px; font-size: 2.3rem; letter-spacing: -.01em; }
    .sous { margin: 0; color: var(--doux); font-style: italic; }
    /* TROIS PAR RANGÉE, ET DONC DEUX RANGÉES PLEINES.
       La répartition automatique en posait cinq sur la première et laissait le sixième tout
       seul en dessous, avec sa longue légende — mesuré sur la capture. Six
       chiffres se rangent en 3 × 2 sans orphelin. */
    .chiffres {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 20px 24px; margin: 28px 0 0; padding: 0; list-style: none;
    }
    @media (max-width: 34rem) { .chiffres { grid-template-columns: repeat(2, 1fr); } }
    .chiffres b { display: block; font-size: 1.7rem; line-height: 1.1; }
    .chiffres span { color: var(--doux); font-size: .84rem; }
    .mot { margin: 34px 0 0; padding: 18px 22px; background: #fff;
           border-left: 3px solid var(--accent); }
    .mot p { margin: 0 0 8px; }
    .mot p:last-child { margin: 0; }
    h2 { margin: 48px 0 0; padding-bottom: 6px; font-size: 1.3rem;
         border-bottom: 1px solid var(--trait); }
    h2 .combien { float: right; font: italic .8rem/2.4 Georgia, serif; color: var(--doux); }
    ul { list-style: none; margin: 0; padding: 0; }
    li { padding: 20px 0; border-bottom: 1px solid var(--trait); }
    blockquote {
        margin: 0; font-size: 1.12rem; color: var(--encre);
    }
    blockquote::before { content: '« '; color: var(--accent); }
    blockquote::after { content: ' »'; color: var(--accent); }
    .decision {
        margin: 10px 0 0; font-size: .82rem; letter-spacing: .02em;
        color: var(--accent); font-family: system-ui, sans-serif;
    }
    .ou { margin: 6px 0 0; font: .76rem/1.5 ui-monospace, Menlo, Consolas, monospace;
          color: var(--doux); }
    footer { margin: 56px 0 0; padding-top: 18px; border-top: 2px solid var(--encre);
             color: var(--doux); font-size: .88rem; }
    @media print {
        body { background: #fff; font-size: 11pt; }
        li { break-inside: avoid; }
        h2 { break-after: avoid; }
        .mot { background: #fff; }
    }
</style>
</head>
<body>
<div class="dedans">
<header>
    <h1>Mille versions</h1>
    <p class="sous">Ce que Rémy a dit, et ce que cela a changé.</p>
    <ul class="chiffres">
        <li><b>${esc(version)}</b><span>versions publiées</span></li>
        <li><b>${esc(total)}</b><span>phrases de Rémy, dans le code</span></li>
        <li><b>${esc(exercices)}</b><span>exercices au catalogue</span></li>
        <li><b>${esc(jeux)}</b><span>façons de poser une question</span></li>
        <li><b>${esc(epreuves)}</b><span>fichiers d'épreuves automatiques</span></li>
        <li><b>${esc(commits)}</b><span>enregistrements depuis le ${esc(premier)}</span></li>
    </ul>
</header>

<div class="mot">
    <p>Ce document n'a pas été écrit : il a été <i>relu</i>.</p>
    <p>Depuis le premier jour, ce logiciel s'explique à lui-même. Chaque fois
       qu'une décision n'allait pas de soi, la raison a été écrite à l'endroit
       exact où elle se prenait — et quand c'était Rémy qui avait tranché, c'est
       sa phrase qui a été recopiée, mot pour mot.</p>
    <p>Au bout de mille versions, le dépôt en porte ${esc(total)}. Les voici,
       rangées par ce qu'elles ont touché, avec la décision qu'elles ont prise et
       l'endroit où elle vit encore.</p>
</div>
${sections}

<footer>
    <p>Rassemblé par <code>node tools/milleVersions.mjs</code>, qui lit
       ${esc(litFichiers)} fichiers du dépôt. Rien n'y est inventé : chaque
       phrase est à l'endroit indiqué, et la décision qui la suit est celle que
       le code annonce lui-même.</p>
</footer>
</div>
</body>
</html>
`;

mkdirSync(dirname(SORTIE), { recursive: true });
writeFileSync(SORTIE, page);
console.log(`\n${SORTIE} — ${Math.round(page.length / 1024)} Ko`);
