// LA REVUE DU CATALOGUE — un tableau, cent neuf lignes, une décision par ligne.
//
// Le banc d'essai répond à « cet exercice-ci est-il bon ? » : on le joue, on
// note six critères, on écrit un rapport. C'est long, et c'est fait pour.
// Cette revue-ci répond à une autre question, celle que Rémy a posée : « on ne
// sait plus lesquels sont les derniers, on n'avait pas trié ». Il faut voir le
// catalogue ENTIER d'un coup d'œil, cocher, décocher, dater, annoter.
//
// TROIS PRINCIPES.
//
//   1. LA DÉCISION EST BINAIRE. « Encore en test » ou « validé ». Un exercice
//      qu'on regarde à la chaîne ne mérite pas une échelle : on le garde sous
//      le coude ou on le lâche aux élèves, et c'est tout. Le détail, c'est le
//      banc d'essai qui le porte.
//   2. LA DATE SE POSE TOUTE SEULE, ET SE CORRIGE À LA MAIN. « Tu mets la
//      date » : la journée où la décision est prise est celle qui compte, et
//      personne ne va la taper cent neuf fois. Mais une passe reprise le
//      lendemain doit pouvoir être redatée.
//   3. LE CATALOGUE EST DU CODE, PAS UNE BASE. Une case cochée dans un
//      navigateur ne peut pas réécrire `status: STATUS.TEST` dans
//      `js/data/calcul.js`. La revue garde donc les décisions ici, et en sort
//      une CONSIGNE d'une ligne — sur le modèle du RETEST du banc d'essai —
//      qu'il suffit de coller pour que je les reporte dans les descripteurs.
//
// Tout ce fichier est pur : pas de DOM, pas de localStorage. C'est l'écran
// (ui/revue.js) qui range et qui peint.

import { STATUS } from '../data/status.js';

/** Version du format : un carnet plus ancien doit rester lisible. */
export const FORMAT = 1;

/**
 * LES COLONNES QU'ON COCHE.
 *
 * « Avoir des colonnes aperçu (3 car 3 device), mode robot ». Trois appareils,
 * parce qu'un exercice qui tient sur l'ordinateur peut être tronqué sur le
 * téléphone — c'est arrivé au coffre-fort, au labyrinthe et au carré magique
 * dans la même semaine. Le robot et la fiche papier suivent : ce sont les deux
 * autres façons dont un exercice se montre, et elles cassent séparément.
 *
 * `mode` est ce que le moteur de jeu attend pour son cadre de simulation.
 */
export const COLONNES = [
    { id: 'telephone', label: 'Téléphone', mode: 'mobile', aide: 'Lancer dans un cadre de téléphone (400 px)' },
    { id: 'tablette', label: 'Tablette', mode: 'tablet', aide: 'Lancer dans un cadre de tablette (768 px)' },
    { id: 'ordinateur', label: 'Ordinateur', mode: 'none', aide: 'Lancer en plein écran' },
    { id: 'robot', label: 'Robot', mode: 'none', robot: true, aide: 'Regarder le robot jouer' },
    { id: 'fiche', label: 'Fiche', mode: null, fiche: true, aide: 'Ouvrir l\'aperçu papier' }
];

export const estColonne = (id) => COLONNES.some(c => c.id === id);

/** La date du jour, telle qu'elle s'écrit dans les descripteurs. */
export function jourISO(ms) {
    const d = ms ? new Date(ms) : new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Un carnet de revue vide. */
export function nouvelleRevue({ version = '', date = 0 } = {}) {
    return { format: FORMAT, version, debut: date, fiches: [] };
}

export const ficheDe = (revue, exercice) =>
    (revue.fiches || []).find(f => f.exercice === exercice) || null;

function normaliserFiche(f) {
    return {
        exercice: String(f.exercice),
        // `null` = pas encore décidé : c'est le statut du catalogue qui parle.
        enTest: typeof f.enTest === 'boolean' ? f.enTest : null,
        date: String(f.date || ''),
        remarque: String(f.remarque || '').slice(0, 2000),
        vu: Object.fromEntries(Object.entries(f.vu || {})
            .filter(([k, v]) => estColonne(k) && v).map(([k]) => [k, true])),
        maj: Number(f.maj) || 0
    };
}

/**
 * Écrit une décision. Ce qui n'est pas donné n'est pas touché : cocher une
 * case ne doit pas effacer la remarque écrite la veille.
 *
 * LA DATE SUIT LA DÉCISION, PAS LA VISITE. Cocher « vu sur tablette » ne
 * redate pas la ligne : ce n'est pas une décision, c'est un déplacement. Seuls
 * le statut et la remarque redatent.
 */
export function decider(revue, exercice, changements = {}, quand = 0) {
    const avant = ficheDe(revue, exercice);
    const base = avant || normaliserFiche({ exercice });
    const suite = { ...base };
    if ('enTest' in changements) suite.enTest = changements.enTest === null ? null : !!changements.enTest;
    if ('remarque' in changements) suite.remarque = String(changements.remarque || '').slice(0, 2000);
    if ('vu' in changements) suite.vu = { ...base.vu, ...changements.vu };
    Object.keys(suite.vu).forEach(k => { if (!suite.vu[k]) delete suite.vu[k]; });

    const decide = 'enTest' in changements || 'remarque' in changements;
    if ('date' in changements) suite.date = String(changements.date || '');
    else if (decide) suite.date = jourISO(quand || Date.now());
    suite.maj = quand || Date.now();

    // Une fiche redevenue vide de tout — pas de décision, pas de remarque, pas
    // une seule case vue — ne mérite pas d'occuper une ligne du carnet.
    const vide = suite.enTest === null && !suite.remarque && !Object.keys(suite.vu).length;
    const autres = (revue.fiches || []).filter(f => f.exercice !== exercice);
    return { ...revue, fiches: vide ? autres : [...autres, normaliserFiche(suite)] };
}

/** Cocher — ou décocher — une des colonnes d'aperçu. */
export const marquerVu = (revue, exercice, colonne, vu = true, quand = 0) =>
    estColonne(colonne) ? decider(revue, exercice, { vu: { [colonne]: !!vu } }, quand) : revue;

/**
 * LE STATUT QUI COMPTE : celui qu'a décidé Rémy s'il l'a décidé, celui du
 * catalogue sinon. C'est la seule règle qui évite de mentir à l'écran — un
 * tableau qui affiche l'ancien statut à côté d'une case fraîchement décochée
 * ne sert à rien.
 */
export function statutRevu(exo, fiche) {
    if (fiche && fiche.enTest === true) return STATUS.TEST;
    if (fiche && fiche.enTest === false) return STATUS.VALIDE;
    return (exo && exo.status) || STATUS.VALIDE;
}

/** La décision diffère-t-elle de ce qui est écrit dans le code ? */
export const aChange = (exo, fiche) =>
    !!fiche && fiche.enTest !== null && statutRevu(exo, fiche) !== ((exo && exo.status) || STATUS.VALIDE);

/** Combien de colonnes d'aperçu ont été cochées sur cette ligne. */
export const nbVus = (fiche) => fiche ? Object.keys(fiche.vu || {}).length : 0;

/**
 * L'ORDRE DES LIGNES.
 *
 * « Comment sait-on que ce sont les derniers jeux » : la question de départ.
 * Chaque descripteur porte sa date de création, et c'est la seule chose qui
 * réponde — l'ordre du catalogue, lui, suit les domaines. « Les derniers
 * arrivés » remonte donc ce qui vient d'être écrit, et « les derniers touchés »
 * tient compte des révisions : un exercice de mars repris hier est aussi neuf
 * qu'un exercice d'hier.
 */
export const TRIS = [
    { id: 'catalogue', label: 'Ordre du catalogue' },
    { id: 'recent', label: 'Les derniers créés' },
    { id: 'touche', label: 'Les derniers touchés' },
    { id: 'titre', label: 'Par titre' }
];

/** La dernière fois que l'exercice a bougé : création ou révision. */
export function dernierJour(exo) {
    const dates = [exo.cree || '', ...((exo.revisions || []).map(r => r.date || ''))];
    return dates.filter(Boolean).sort().pop() || '';
}

export function trier(liste, tri) {
    const l = [...liste];
    if (tri === 'recent') return l.sort((a, b) => (b.cree || '').localeCompare(a.cree || '')
        || a.title.localeCompare(b.title));
    if (tri === 'touche') return l.sort((a, b) => dernierJour(b).localeCompare(dernierJour(a))
        || a.title.localeCompare(b.title));
    if (tri === 'titre') return l.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    return l;
}

/**
 * LE TRI DU TABLEAU.
 *
 * @param {Array} exercices
 * @param {Object} revue
 * @param {Object} criteres
 * @param {string} [criteres.texte]    - recherche libre sur le titre et l'identifiant
 * @param {string} [criteres.domaine]  - premier niveau du chemin, '' = tous
 * @param {string} [criteres.niveau]   - '6ème', '' = tous
 * @param {string} [criteres.statut]   - 'test' | 'valide' | 'brouillon', '' = tous
 * @param {string} [criteres.avancee]  - 'decides' | 'adecider' | 'vus' | 'jamaisvus' | 'changes' | 'remarques'
 * @param {boolean} [criteres.jeux]    - seulement les activités (celles qui ont un moteur)
 * @param {string} [criteres.tri]      - voir TRIS
 */
export function filtrer(exercices, revue, criteres = {}) {
    const { texte = '', domaine = '', niveau = '', statut = '', avancee = '', jeux = false, tri = '' } = criteres;
    const mot = texte.trim().toLowerCase();
    return trier(exercices.filter(e => {
        const f = ficheDe(revue, e.id);
        if (mot && !`${e.title} ${e.id} ${e.activityId || ''} ${e.generatorId || ''}`
            .toLowerCase().includes(mot)) return false;
        if (domaine && ((e.tags && e.tags.chemin && e.tags.chemin[0]) || '') !== domaine) return false;
        if (niveau && !((e.tags && e.tags.niveaux) || []).includes(niveau)) return false;
        if (statut && statutRevu(e, f) !== statut) return false;
        if (jeux && !e.activityId) return false;
        if (avancee === 'decides' && !(f && f.enTest !== null)) return false;
        if (avancee === 'adecider' && f && f.enTest !== null) return false;
        if (avancee === 'vus' && nbVus(f) === 0) return false;
        if (avancee === 'jamaisvus' && nbVus(f) > 0) return false;
        if (avancee === 'changes' && !aChange(e, f)) return false;
        if (avancee === 'remarques' && !(f && f.remarque.trim())) return false;
        return true;
    }), tri);
}

/** Où en est la revue ? Le compteur qui décide si l'on peut s'arrêter. */
export function bilan(revue, exercices) {
    const b = { total: exercices.length, decides: 0, enTest: 0, valides: 0, changes: 0, remarques: 0, vus: 0 };
    exercices.forEach(e => {
        const f = ficheDe(revue, e.id);
        if (f && f.enTest !== null) b.decides++;
        if (statutRevu(e, f) === STATUS.TEST) b.enTest++;
        else if (statutRevu(e, f) === STATUS.VALIDE) b.valides++;
        if (aChange(e, f)) b.changes++;
        if (f && f.remarque.trim()) b.remarques++;
        if (nbVus(f) > 0) b.vus++;
    });
    return b;
}

/**
 * LA CONSIGNE À COLLER — le seul pont entre un navigateur et du code source.
 *
 * Elle ne liste QUE ce qui change : reporter cent neuf statuts identiques
 * n'apprend rien, et une consigne de trois lignes se relit. Même forme que le
 * RETEST du banc d'essai — pas de JSON, pas d'accolades, rien qu'un
 * correcteur automatique irait refermer :
 *
 *   STATUT v328 | valide = calc-duel, logi-sim | test = num-lettres
 */
export const MARQUE_STATUT = 'STATUT';

export function consigneStatuts(revue, exercices) {
    const par = { [STATUS.VALIDE]: [], [STATUS.TEST]: [] };
    exercices.forEach(e => {
        const f = ficheDe(revue, e.id);
        if (!aChange(e, f)) return;
        const s = statutRevu(e, f);
        if (par[s]) par[s].push(e.id);
    });
    const bouts = Object.entries(par).filter(([, ids]) => ids.length)
        .map(([s, ids]) => `${s} = ${ids.join(', ')}`);
    if (!bouts.length) return '';
    return `${MARQUE_STATUT} ${revue.version || ''} | ${bouts.join(' | ')}`.replace(/\s+\|/g, ' |');
}

/** Relit une consigne de statuts — pour la reporter dans les descripteurs. */
export function lireStatuts(texte) {
    const t = String(texte || '');
    const i = t.toUpperCase().indexOf(MARQUE_STATUT);
    if (i < 0) return null;
    const morceaux = t.slice(i + MARQUE_STATUT.length).split('|').map(x => x.trim()).filter(Boolean);
    if (!morceaux.length) return null;
    const version = morceaux[0].includes('=') ? '' : morceaux.shift().trim();
    const change = [];
    morceaux.forEach(m => {
        const k = m.indexOf('=');
        if (k < 0) return;
        const statut = m.slice(0, k).trim().toLowerCase();
        if (!Object.values(STATUS).includes(statut)) return;
        m.slice(k + 1).split(',').map(x => x.trim()).filter(Boolean)
            .forEach(id => change.push({ exercice: id, statut }));
    });
    return change.length ? { version, change } : null;
}

/** Relit un carnet transmis — le rapport entier convient, bloc JSON compris. */
export function lireRevue(texte) {
    let brut;
    const bloc = typeof texte === 'string' && texte.match(/```json\s*([\s\S]*?)```/);
    const source = bloc ? bloc[1] : texte;
    try { brut = typeof source === 'string' ? JSON.parse(source) : source; }
    catch (e) { return null; }
    if (!brut || typeof brut !== 'object' || !Array.isArray(brut.fiches)) return null;
    return {
        format: Number(brut.format) || 1,
        version: String(brut.version || ''),
        debut: Number(brut.debut) || 0,
        fiches: brut.fiches.filter(f => f && f.exercice).map(normaliserFiche)
    };
}

/**
 * DEUX CARNETS S'ADDITIONNENT — et ici, contrairement au banc d'essai, ils
 * FUSIONNENT VRAIMENT : une décision n'appartient pas à un appareil. Cocher
 * « validé » sur la tablette et « vu sur téléphone » sur le téléphone doit
 * donner une seule ligne portant les deux. La plus récente l'emporte champ par
 * champ, et les cases vues s'additionnent — les décocher ailleurs ne les
 * rallume pas, mais les avoir vues quelque part reste vrai.
 */
export function fusionnerRevues(...revues) {
    const vraies = revues.filter(Boolean);
    if (!vraies.length) return nouvelleRevue();
    const par = new Map();
    vraies.forEach(r => (r.fiches || []).forEach(f => {
        const avant = par.get(f.exercice);
        if (!avant) { par.set(f.exercice, { ...f, vu: { ...f.vu } }); return; }
        const recent = (f.maj || 0) >= (avant.maj || 0) ? f : avant;
        const vieux = recent === f ? avant : f;
        par.set(f.exercice, {
            ...recent,
            remarque: recent.remarque || vieux.remarque,
            vu: { ...avant.vu, ...f.vu }
        });
    }));
    return {
        ...vraies[0],
        format: FORMAT,
        fiches: [...par.values()].sort((a, b) => a.exercice.localeCompare(b.exercice))
    };
}

/**
 * LE BILAN, écrit pour être lu.
 *
 * Il commence par la consigne à coller, parce que c'est la seule ligne qui
 * fera changer quelque chose ; le reste est de la mémoire.
 */
export function versMarkdown(revue, exercices, { titre = 'Revue du catalogue' } = {}) {
    const b = bilan(revue, exercices);
    const consigne = consigneStatuts(revue, exercices);
    const l = [];
    l.push(`# ${titre}`, '');
    l.push(`- **Version** : ${revue.version || '?'}`);
    l.push(`- **Exercices** : ${b.total} — ${b.enTest} en test, ${b.valides} validés`);
    l.push(`- **Décidés à la main** : ${b.decides} · **changements à reporter** : ${b.changes}`);
    l.push(`- **Vus au moins une fois** : ${b.vus} · **remarques** : ${b.remarques}`, '');

    l.push('## À reporter dans les descripteurs', '');
    l.push(consigne ? `\`\`\`\n${consigne}\n\`\`\`` : '_Aucun statut ne change._', '');

    const dits = exercices.map(e => ({ e, f: ficheDe(revue, e.id) }))
        .filter(x => x.f && x.f.remarque.trim());
    if (dits.length) {
        l.push('## Les remarques', '');
        dits.forEach(({ e, f }) => {
            l.push(`### ${e.title} (\`${e.id}\`)`);
            l.push(`_${statutRevu(e, f) === STATUS.TEST ? 'en test' : 'validé'}`
                + `${f.date ? `, le ${f.date}` : ''}_`, '');
            l.push(`> ${f.remarque.split('\n').join('\n> ')}`, '');
        });
    }

    l.push('## Le tableau', '');
    l.push(`| Exercice | Créé | Statut | Décidé | ${COLONNES.map(c => c.label).join(' | ')} | Remarque |`);
    l.push(`|---|---|---|---|${COLONNES.map(() => '---').join('|')}|---|`);
    exercices.forEach(e => {
        const f = ficheDe(revue, e.id);
        const s = statutRevu(e, f);
        const cases = COLONNES.map(c => (f && f.vu[c.id]) ? '✓' : '');
        l.push(`| ${e.title} \`${e.id}\` | ${dernierJour(e)} `
            + `| ${s === STATUS.TEST ? 'en test' : s === STATUS.BROUILLON ? 'brouillon' : 'validé'}`
            + `${aChange(e, f) ? ' ⟵' : ''} | ${(f && f.date) || ''} | ${cases.join(' | ')} | `
            + `${((f && f.remarque) || '').replace(/\n/g, ' ').slice(0, 120)} |`);
    });
    return l.join('\n');
}
