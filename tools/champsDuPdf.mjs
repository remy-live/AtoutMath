// LES CHAMPS D'UN PDF REMPLISSABLE, EN CLAIR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI CET OUTIL EXISTE. Rémy : « quand je clique sur un champ checkbox,
// les autres se remplissent de caractères spéciaux ». La cause ne se voyait
// NULLE PART ailleurs que dans les octets du PDF : quatre cases du même nom de
// champ et du même état « on », c'est-à-dire une seule case à quatre visages.
// Ni l'aperçu, ni l'image du PDF, ni aucune épreuve ne pouvaient le dire — et
// jsPDF ne se charge pas hors navigateur, donc on ne peut pas non plus
// fabriquer la structure dans un essai.
//
// Il a fallu trois `node -e` écrits à la main dans la même heure pour lire ce
// que ce fichier lit en une ligne.
//
//     node tools/champsDuPdf.mjs <fiche.pdf>
//
// IL NE DÉCOMPRESSE RIEN. Les PDF que `ficheEnPdf.mjs` produit ne compressent
// pas leurs dictionnaires d'objets : les champs se lisent donc en clair. Si un
// jour ils le font, l'outil le DIRA au lieu de rendre une liste vide — une
// liste vide et « ce PDF n'a pas de champs » se ressemblent trop.

import { readFileSync } from 'node:fs';

const chemin = process.argv[2];
if (!chemin) {
    console.error('emploi : node tools/champsDuPdf.mjs <fiche.pdf>');
    process.exit(2);
}

const octets = readFileSync(chemin, 'latin1');
if (!/%PDF-/.test(octets.slice(0, 1024))) {
    console.error(`${chemin} ne commence pas par « %PDF- » : ce n'est pas un PDF.`);
    process.exit(2);
}

const objets = new Map();
for (const m of octets.matchAll(/(\d+) 0 obj([\s\S]*?)endobj/g)) {
    objets.set(m[1], m[2]);
}
if (!objets.size) {
    console.error('aucun objet lisible : ce PDF est sans doute compressé '
        + '(`/ObjStm`). Cet outil lit les PDF que le logiciel produit, qui ne '
        + 'le sont pas.');
    process.exit(2);
}

const valeur = (corps, clef) => {
    const m = corps.match(new RegExp(`/${clef}\\s*(\\([^)]*\\)|/[^\\s/>\\]]+|\\d+)`));
    return m ? m[1].replace(/^\(|\)$/g, '') : null;
};
const etatsDe = (corps) => {
    const m = corps.match(/\/AP\s*<<([\s\S]*?)>>\s*>>/);
    if (!m) return [];
    return [...new Set([...m[1].matchAll(/\/([A-Za-z0-9_]+)\s+\d+ 0 R/g)].map(x => x[1]))];
};

const champs = [];
for (const [n, corps] of objets) {
    if (!/\/FT\s*\//.test(corps) && !/\/Parent\s+\d+ 0 R/.test(corps)) continue;
    if (!/\/Widget/.test(corps) && !/\/FT\s*\//.test(corps)) continue;
    champs.push({
        n,
        sorte: valeur(corps, 'FT'),
        nom: valeur(corps, 'T'),
        parent: (corps.match(/\/Parent\s+(\d+) 0 R/) || [])[1] || null,
        enfants: (corps.match(/\/Kids\s*\[([^\]]*)\]/) || [])[1] || null,
        drapeaux: valeur(corps, 'Ff'),
        valeurV: valeur(corps, 'V'),
        etatVu: valeur(corps, 'AS'),
        glyphe: (corps.match(/\/MK\s*<<\s*\/CA\s*\(([^)]*)\)/) || [])[1] || null,
        etats: etatsDe(corps),
        rect: (corps.match(/\/Rect\s*\[([^\]]*)\]/) || [])[1] || null
    });
}

if (!champs.length) {
    console.log('Aucun champ de formulaire dans ce PDF.');
    process.exit(0);
}

// LES RACINES D'ABORD, LEURS ENFANTS DESSOUS : c'est la forme qui décide si
// les cases s'excluent, et une liste à plat ne la montre pas.
const racines = champs.filter(c => !c.parent);
const enfantsDe = (n) => champs.filter(c => c.parent === n);

const RADIO = 32768;
console.log(`${chemin}\n${champs.length} objet(s) de formulaire, `
    + `${racines.length} champ(s) racine.\n`);
for (const r of racines) {
    const kids = enfantsDe(r.n);
    const radio = Number(r.drapeaux || 0) & RADIO ? ' · RADIO (exclusif)' : '';
    console.log(`  « ${r.nom || '(sans nom)'} »  ${r.sorte || '?'}${radio}`
        + (r.valeurV ? `  valeur ${r.valeurV}` : '')
        + (kids.length ? `  — ${kids.length} option(s)` : ''));
    if (!kids.length && r.etats.length) {
        console.log(`        états : ${r.etats.join(', ')}`
            + (r.glyphe ? `  · glyphe « ${r.glyphe} »` : '')
            + (r.etatVu ? `  · montre ${r.etatVu}` : ''));
    }
    kids.forEach((k, i) => console.log(`      ${i + 1}. états : `
        + `${k.etats.join(', ') || '—'}`
        + (k.glyphe ? `  · glyphe « ${k.glyphe} »` : '')
        + (k.etatVu ? `  · montre ${k.etatVu}` : '')));
}

// ── CE QUI SE VOIT MAL, ET QU'ON DIT DONC TOUT HAUT ────────────────────────
const alertes = [];
const parNom = new Map();
racines.forEach(r => parNom.set(r.nom, (parNom.get(r.nom) || 0) + 1));
for (const [nom, combien] of parNom) {
    if (combien > 1) {
        alertes.push(`${combien} champs portent le nom « ${nom} » : un lecteur PDF `
            + 'n\'en voit qu\'UN SEUL, et ce qu\'on écrit dans l\'un paraît dans '
            + 'tous les autres.');
    }
}
for (const r of racines) {
    const kids = enfantsDe(r.n);
    if (kids.length > 1) {
        const etats = kids.flatMap(k => k.etats).filter(e => e !== 'Off');
        if (new Set(etats).size < kids.length) {
            alertes.push(`« ${r.nom} » a ${kids.length} options pour `
                + `${new Set(etats).size} état(s) distinct(s) : en cocher une les `
                + 'cochera toutes.');
        }
    }
    if (r.valeurV && r.valeurV !== '/Off' && r.valeurV !== 'Off') {
        alertes.push(`« ${r.nom} » arrive avec la valeur ${r.valeurV} : il est `
            + 'déclaré coché avant que l\'élève y touche.');
    }
}
const glyphes = champs.map(c => c.glyphe).filter(Boolean);
const bizarres = [...new Set(glyphes)].filter(g => !['4', '8', 'l', 'n', 'H'].includes(g));
if (bizarres.length) {
    alertes.push(`glyphe(s) de ZapfDingbats inattendu(s) : ${bizarres.map(g => `« ${g} »`).join(', ')}. `
        + 'Ce champ n\'est pas une valeur, c\'est un DESSIN — « U » y fait une '
        + 'étoile et « F » des cercles.');
}

// SANS DOUBLON : quatre champs homonymes donnaient quatre fois la même
// phrase, et une liste qui se répète se lit comme un bruit, pas comme un
// avertissement.
const dites = [...new Set(alertes)];
if (dites.length) {
    console.log('\nÀ REGARDER :');
    dites.forEach(a => console.log(`  ⚠ ${a}`));
} else {
    console.log('\nRien à signaler : noms uniques, états distincts, rien de coché '
        + 'd\'avance.');
}
