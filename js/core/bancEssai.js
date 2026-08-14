// LE BANC D'ESSAI — une passe sur tous les exercices, appareil par appareil.
//
// Les tests automatiques disent que le code fait ce qu'on lui a demandé. Ils
// ne disent RIEN de ce qui compte vraiment ici : est-ce que l'indice aide
// réellement, est-ce que le robot montre la bonne façon de faire, est-ce que
// la fiche s'imprime telle quelle, est-ce que l'exercice est rangé au bon
// endroit. Cela, il faut le regarder — sur un vrai téléphone, avec ses vraies
// dimensions, sa vraie police, ses vrais doigts.
//
// Ce module tient donc le CARNET de cette passe : un verdict par critère et
// par exercice, l'appareil qui l'a rendu, et de quoi transmettre le tout.
//
//   1. L'APPAREIL EST ENREGISTRÉ, PAS DEMANDÉ. « Ça déborde sur mon
//      téléphone » ne se corrige pas : il faut la largeur, la hauteur, la
//      densité, le tactile, l'orientation, et la VERSION réellement chargée —
//      un défaut déjà corrigé se signale sans arrêt tant qu'un appareil garde
//      l'ancienne version en cache.
//   2. UN VERDICT N'EST PAS UNE OPINION. Quatre valeurs seulement, dont
//      « sans objet » : un jeu sans robot ne doit pas se voir reprocher son
//      robot, et la moyenne ne doit pas s'en trouver salie.
//   3. LE CARNET SE FUSIONNE. On passe les exercices sur le téléphone, puis
//      sur la tablette : ce sont deux carnets, et ils doivent s'additionner
//      sans s'écraser — c'est le même exercice sur deux appareils, donc deux
//      lignes, pas une qui remplace l'autre.

/** La version des carnets : si le format change, l'ancien reste lisible. */
export const FORMAT = 1;

/**
 * CE QU'ON REGARDE, exercice par exercice. Ces cinq questions sont exactement
 * celles auxquelles un test automatique ne sait pas répondre.
 */
export const CRITERES = [
    {
        id: 'marche', label: 'Ça marche',
        question: 'L\'exercice se lance, se joue et se termine sans rien casser ?'
    },
    {
        id: 'indices', label: 'Les indices',
        question: '« Aide-moi » donne-t-il la MÉTHODE — sans lâcher la réponse ?'
    },
    {
        id: 'robot', label: 'Le robot',
        question: 'L\'aperçu montre-t-il la bonne façon de faire, au bon rythme ?'
    },
    {
        id: 'fiche', label: 'La fiche',
        question: 'L\'aperçu papier est-il imprimable tel quel ?'
    },
    {
        id: 'mise-en-page', label: 'La mise en page',
        question: 'Tout tient sur cet écran-ci : rien ne déborde, rien n\'est coupé ?'
    },
    {
        id: 'classement', label: 'Le classement',
        question: 'Domaine, sous-domaine et niveaux sont-ils les bons ?'
    }
];

/**
 * Quatre verdicts. « Sans objet » est le plus important des quatre : sans lui,
 * un jeu sans fiche imprimable reste éternellement « non testé », et l'on ne
 * sait plus distinguer ce qui reste à voir de ce qui n'a pas lieu d'être.
 */
export const VERDICTS = [
    { id: 'ok', signe: '✓', label: 'Bon' },
    { id: 'moyen', signe: '~', label: 'À revoir' },
    { id: 'ko', signe: '✗', label: 'Cassé' },
    { id: 'na', signe: '—', label: 'Sans objet' }
];

export const estVerdict = (v) => VERDICTS.some(x => x.id === v);

/**
 * La carte d'identité de l'appareil. Tout ce qui sert à reproduire un défaut
 * de mise en page, et rien d'autre — on ne collecte pas ce qu'on ne lira pas.
 */
export function decrireAppareil(fenetre = globalThis) {
    const nav = fenetre.navigator || {};
    const ecran = fenetre.screen || {};
    const l = fenetre.innerWidth || ecran.width || 0;
    const h = fenetre.innerHeight || ecran.height || 0;
    return {
        ua: String(nav.userAgent || '').slice(0, 300),
        plateforme: String(nav.platform || nav.userAgentData?.platform || ''),
        largeur: l,
        hauteur: h,
        ecran: `${ecran.width || 0}×${ecran.height || 0}`,
        densite: fenetre.devicePixelRatio || 1,
        tactile: (nav.maxTouchPoints || 0) > 0,
        orientation: l >= h ? 'paysage' : 'portrait',
        langue: String(nav.language || '')
    };
}

/** Un nom court et lisible : c'est lui qu'on lira en tête du rapport. */
export function nommerAppareil(appareil) {
    const ua = appareil.ua || '';
    const marque = /iPhone/.test(ua) ? 'iPhone'
        : /iPad/.test(ua) ? 'iPad'
            : /Android/.test(ua) ? 'Android'
                : /Macintosh/.test(ua) ? 'Mac'
                    : /Windows/.test(ua) ? 'Windows'
                        : /Linux/.test(ua) ? 'Linux' : 'Appareil';
    return `${marque} ${appareil.largeur}×${appareil.hauteur}`
        + `${appareil.tactile ? ' tactile' : ''} (${appareil.orientation})`;
}

/** Un carnet vide, daté, qui sait sur quoi et avec quoi il a été rempli. */
export function nouveauCarnet({ appareil, version = '', date = 0 } = {}) {
    return {
        format: FORMAT,
        version,
        debut: date,
        appareil: appareil || decrireAppareil(),
        lignes: []
    };
}

/** La clef d'une ligne : un exercice SUR UN APPAREIL. */
export const clefLigne = (l) => `${l.exercice}@@${l.appareilNom || ''}`;

/**
 * Écrit — ou réécrit — le verdict d'un exercice. On remplace la ligne du même
 * exercice sur le MÊME appareil : repasser sur un exercice après correction
 * doit effacer l'ancien avis, mais l'avis rendu sur le téléphone ne doit pas
 * disparaître parce qu'on vient de le rejouer sur la tablette.
 */
export function noter(carnet, ligne) {
    const complet = {
        exercice: ligne.exercice,
        titre: ligne.titre || '',
        activite: ligne.activite || '',
        appareilNom: ligne.appareilNom || nommerAppareil(carnet.appareil),
        version: ligne.version || carnet.version || '',
        date: ligne.date || 0,
        verdicts: { ...(ligne.verdicts || {}) },
        note: (ligne.note || '').slice(0, 2000),
        // `classement` : là où l'exercice est rangé AUJOURD'HUI. `tags` : ce
        // qu'on propose d'en faire. Les confondre, c'est ne plus savoir en
        // relisant si une ligne demande un changement ou décrit l'existant.
        classement: ligne.classement ? { ...ligne.classement } : null,
        // Noter à nouveau un exercice repris solde la demande de retest.
        aRetester: ligne.aRetester || null,
        tags: ligne.tags ? { ...ligne.tags } : null
    };
    const lignes = carnet.lignes.filter(l => clefLigne(l) !== clefLigne(complet));
    lignes.push(complet);
    return { ...carnet, lignes };
}

/** Ce qu'on sait déjà d'un exercice sur cet appareil. */
export const ligneDe = (carnet, exercice, appareilNom) =>
    carnet.lignes.find(l => l.exercice === exercice
        && l.appareilNom === (appareilNom || nommerAppareil(carnet.appareil))) || null;

/**
 * Où en est-on ? On ne compte comme « vu » qu'un exercice dont le premier
 * critère — est-ce que ça marche — a reçu un verdict : ouvrir un exercice sans
 * rien en dire n'est pas l'avoir testé.
 */
export function avancement(carnet, exercices, appareilNom) {
    const nom = appareilNom || nommerAppareil(carnet.appareil);
    // Un exercice REPRIS depuis la dernière passe redevient « à faire » : son
    // ancien verdict ne dit plus rien de la version qu'on a sous les yeux.
    const vus = new Set(carnet.lignes
        .filter(l => l.appareilNom === nom && l.verdicts && l.verdicts.marche && !l.aRetester)
        .map(l => l.exercice));
    const ids = exercices.map(e => e.id);
    return {
        total: ids.length,
        vus: ids.filter(id => vus.has(id)).length,
        restants: ids.filter(id => !vus.has(id))
    };
}

/** « Numérique > Fractions — 6ème, 5ème ». */
export function direClassement(c) {
    if (!c) return '';
    const chemin = (c.chemin || []).filter(Boolean).join(' > ');
    const niveaux = (c.niveaux || []).join(', ');
    return [chemin, niveaux].filter(Boolean).join(' — ');
}

/** Les ennuis, du plus grave au moins grave. C'est par là que je commencerai. */
export function ennuis(carnet) {
    const poids = { ko: 0, moyen: 1 };
    const sortis = [];
    carnet.lignes.forEach(l => {
        CRITERES.forEach(c => {
            const v = l.verdicts && l.verdicts[c.id];
            if (v === 'ko' || v === 'moyen') {
                sortis.push({
                    exercice: l.exercice, titre: l.titre, activite: l.activite,
                    critere: c.id, verdict: v, note: l.note, appareil: l.appareilNom,
                    classement: l.classement
                });
            }
        });
    });
    return sortis.sort((a, b) => poids[a.verdict] - poids[b.verdict]
        || a.exercice.localeCompare(b.exercice));
}

/**
 * LES REMARQUES SANS VERDICT MAUVAIS.
 *
 * On peut trouver un exercice bon et vouloir dire quelque chose quand même :
 * « la consigne gagnerait à parler de gauche à droite », « il faudrait une
 * variante à trois chiffres ». Écrire une phrase à la main est toujours un
 * geste délibéré — la laisser dans une case de tableau, entre deux coches,
 * c'est la perdre.
 */
export function remarques(carnet) {
    return carnet.lignes
        .filter(l => (l.note || '').trim()
            && !CRITERES.some(c => ['ko', 'moyen'].includes(l.verdicts && l.verdicts[c.id])))
        .map(l => ({
            exercice: l.exercice, titre: l.titre, activite: l.activite,
            note: l.note, appareil: l.appareilNom, classement: l.classement
        }));
}

/** Combien de chaque verdict, par critère : le tableau de bord d'une passe. */
export function resume(carnet) {
    const par = {};
    CRITERES.forEach(c => { par[c.id] = { ok: 0, moyen: 0, ko: 0, na: 0 }; });
    carnet.lignes.forEach(l => CRITERES.forEach(c => {
        const v = l.verdicts && l.verdicts[c.id];
        if (v && par[c.id][v] !== undefined) par[c.id][v]++;
    }));
    return par;
}

/**
 * DEUX CARNETS S'ADDITIONNENT. Le téléphone et la tablette ne rendent pas le
 * même verdict sur la même mise en page : garder les deux lignes est tout
 * l'intérêt. Seules deux lignes du même exercice SUR LE MÊME APPAREIL se
 * remplacent, et c'est la plus récente qui gagne.
 */
export function fusionner(...carnets) {
    const vrais = carnets.filter(Boolean);
    if (!vrais.length) return nouveauCarnet();
    const par = new Map();
    vrais.forEach(c => (c.lignes || []).forEach(l => {
        const clef = clefLigne(l);
        const avant = par.get(clef);
        if (!avant || (l.date || 0) >= (avant.date || 0)) par.set(clef, l);
    }));
    return {
        ...vrais[0],
        format: FORMAT,
        lignes: [...par.values()].sort((a, b) => a.exercice.localeCompare(b.exercice))
    };
}

/**
 * LA CONSIGNE DE RETEST — ce que je renvoie après avoir corrigé.
 *
 * Une passe finie, un rapport envoyé, et huit exercices corrigés. Sans rien,
 * il faudrait les retrouver un par un dans une liste de cent cinq, se souvenir
 * de ce qui a été touché, et refaire la passe entière au moindre doute. Une
 * CHAÎNE à coller suffit : elle nomme les exercices repris, dit ce qui a
 * changé pour chacun, et les remet dans la liste « à faire ».
 *
 * Le format est fait pour survivre à une conversation — pas de JSON, pas
 * d'accolades qu'un correcteur irait fermer, pas de retour à la ligne
 * obligatoire :
 *
 *   RETEST v160 | num-ninja-positifs = vagues moitié-moitié, chute ralentie
 *   | logi-dominos = la pièce glissée passe au-dessus du jeu
 */
export const MARQUE_RETEST = 'RETEST';

export function lireRetest(texte) {
    const t = String(texte || '');
    const i = t.toUpperCase().indexOf(MARQUE_RETEST);
    if (i < 0) return null;
    const morceaux = t.slice(i + MARQUE_RETEST.length).split('|').map(x => x.trim()).filter(Boolean);
    if (!morceaux.length) return null;
    // Le premier morceau porte la version corrigée, s'il ne nomme pas d'exercice.
    const version = morceaux[0].includes('=') ? '' : morceaux.shift().trim();
    const repris = morceaux.map(m => {
        const k = m.indexOf('=');
        const id = (k < 0 ? m : m.slice(0, k)).trim();
        return id ? { exercice: id, quoi: k < 0 ? '' : m.slice(k + 1).trim() } : null;
    }).filter(Boolean);
    return repris.length ? { version, exercices: repris } : null;
}

/**
 * Remet les exercices repris dans la liste « à faire », en gardant leur
 * ancienne note. On n'EFFACE pas le verdict précédent : savoir que c'était
 * cassé la dernière fois est utile pendant qu'on reteste.
 *
 * UN EXERCICE ABSENT DU CARNET EST AJOUTÉ. La consigne ne marquait que les
 * lignes déjà présentes : sur un appareil neuf, ou après un carnet vidé, une
 * chaîne de cinquante exercices ne produisait AUCUNE ligne à retester et la
 * liste restait vide sans qu'on comprenne pourquoi. La demande de vérification
 * ne dépend pas de ce qu'on avait déjà noté — elle dit ce qui a changé.
 */
export function marquerARetester(carnet, consigne, quand = 0) {
    if (!consigne) return carnet;
    const parId = new Map(consigne.exercices.map(e => [e.exercice, e]));
    const marque = (e) => ({ version: consigne.version, quoi: e.quoi, depuis: quand });
    const vus = new Set();
    const lignes = carnet.lignes.map(l => {
        if (!parId.has(l.exercice)) return l;
        vus.add(l.exercice);
        return { ...l, aRetester: marque(parId.get(l.exercice)) };
    });
    for (const [id, e] of parId) {
        if (vus.has(id)) continue;
        lignes.push({
            exercice: id, titre: '', activite: '',
            appareilNom: nommerAppareil(carnet.appareil),
            version: carnet.version || '', date: 0,
            verdicts: {}, note: '', classement: null, tags: null,
            aRetester: marque(e)
        });
    }
    return { ...carnet, lignes };
}

/** Ce qui attend une nouvelle vérification. */
export const aRetester = (carnet) => carnet.lignes.filter(l => l.aRetester);

/**
 * Relit un carnet transmis, en refusant ce qui n'en est pas un.
 *
 * On accepte le RAPPORT ENTIER, pas seulement le bloc de données : c'est le
 * rapport qu'on copie, qu'on colle dans une conversation et qu'on retrouve
 * trois jours plus tard. Demander d'en extraire le JSON à la main, c'est
 * perdre le carnet à la première reprise.
 */
export function lire(texte) {
    let brut;
    const bloc = typeof texte === 'string' && texte.match(/```json\s*([\s\S]*?)```/);
    const source = bloc ? bloc[1] : texte;
    try { brut = typeof source === 'string' ? JSON.parse(source) : source; }
    catch (e) { return null; }
    if (!brut || typeof brut !== 'object' || !Array.isArray(brut.lignes)) return null;
    return {
        format: brut.format || 1,
        version: String(brut.version || ''),
        debut: Number(brut.debut) || 0,
        appareil: brut.appareil || {},
        lignes: brut.lignes.filter(l => l && l.exercice).map(l => ({
            exercice: String(l.exercice),
            titre: String(l.titre || ''),
            activite: String(l.activite || ''),
            appareilNom: String(l.appareilNom || ''),
            version: String(l.version || ''),
            date: Number(l.date) || 0,
            verdicts: Object.fromEntries(Object.entries(l.verdicts || {})
                .filter(([k, v]) => CRITERES.some(c => c.id === k) && estVerdict(v))),
            note: String(l.note || ''),
            classement: l.classement || null,
            aRetester: l.aRetester || null,
            tags: l.tags || null
        }))
    };
}

const jour = (ms) => {
    if (!ms) return '';
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * LE RAPPORT, écrit pour être lu.
 *
 * Le JSON sert à la machine ; ce texte-ci sert à celui qui va corriger. Il
 * commence donc par ce qui ne va pas — pas par un tableau de statistiques.
 */
export function versMarkdown(carnet, { titre = 'Banc d\'essai' } = {}) {
    const nom = nommerAppareil(carnet.appareil);
    const soucis = ennuis(carnet);
    const par = resume(carnet);
    const l = [];
    l.push(`# ${titre}`, '');
    l.push(`- **Appareil** : ${nom}`);
    l.push(`- **Écran** : ${carnet.appareil.ecran}, densité ${carnet.appareil.densite}, `
        + `${carnet.appareil.tactile ? 'tactile' : 'souris'}`);
    l.push(`- **Version chargée** : ${carnet.version || '?'}`);
    l.push(`- **Passe commencée le** : ${jour(carnet.debut) || '?'}`);
    l.push(`- **Exercices notés** : ${new Set(carnet.lignes.map(x => x.exercice)).size}`);
    l.push('', `- \`${carnet.appareil.ua}\``, '');

    l.push('## Ce qui ne va pas', '');
    if (!soucis.length) l.push('_Rien à signaler sur cet appareil._', '');
    soucis.forEach(s => {
        const c = CRITERES.find(x => x.id === s.critere);
        l.push(`### ${s.verdict === 'ko' ? '✗ CASSÉ' : '~ à revoir'} — ${s.titre} `
            + `(\`${s.exercice}\`${s.activite ? `, jeu \`${s.activite}\`` : ''})`);
        if (s.classement) l.push(`_${direClassement(s.classement)}_`);
        l.push(`**${c ? c.label : s.critere}** — ${c ? c.question : ''}`);
        if (s.note) l.push('', `> ${s.note.split('\n').join('\n> ')}`);
        l.push('');
    });

    const dites = remarques(carnet);
    if (dites.length) {
        l.push('## Noté au passage', '');
        l.push('_Rien de cassé, mais quelque chose à dire._', '');
        dites.forEach(r => {
            l.push(`### ${r.titre} (\`${r.exercice}\`${r.activite ? `, jeu \`${r.activite}\`` : ''})`);
            if (r.classement) l.push(`_${direClassement(r.classement)}_`);
            l.push('', `> ${r.note.split('\n').join('\n> ')}`, '');
        });
    }

    l.push('## Le détail, exercice par exercice', '');
    l.push(`| Exercice | Niveaux | ${CRITERES.map(c => c.label).join(' | ')} | Remarque |`);
    l.push(`|---|---|${CRITERES.map(() => '---').join('|')}|---|`);
    [...carnet.lignes].sort((a, b) => a.exercice.localeCompare(b.exercice)).forEach(x => {
        const cases = CRITERES.map(c => {
            const v = x.verdicts[c.id];
            const d = VERDICTS.find(y => y.id === v);
            return d ? d.signe : '';
        });
        const niv = (x.classement && x.classement.niveaux || []).join(' ');
        l.push(`| ${x.titre || x.exercice} | ${niv} | ${cases.join(' | ')} | `
            + `${(x.note || '').replace(/\n/g, ' ').slice(0, 120)} |`);
    });
    l.push('');

    // Les propositions de classement, s'il y en a : c'est la deuxième chose
    // que je viendrai chercher, et elle se perd dans le tableau.
    const tags = carnet.lignes.filter(x => x.tags && (x.tags.ajouts?.length
        || x.tags.chemin?.length || x.tags.niveaux?.length));
    if (tags.length) {
        l.push('## Classement à corriger', '');
        tags.forEach(x => {
            const t = x.tags;
            const bouts = [];
            if (t.chemin?.length) bouts.push(`chemin → ${t.chemin.join(' > ')}`);
            if (t.niveaux?.length) bouts.push(`niveaux → ${t.niveaux.join(', ')}`);
            if (t.ajouts?.length) bouts.push(`mots-clefs → ${t.ajouts.join(', ')}`);
            l.push(`- \`${x.exercice}\` (${x.titre}) : ${bouts.join(' ; ')}`);
        });
        l.push('');
    }

    l.push('## Compte des verdicts', '');
    l.push('| Critère | ✓ | ~ | ✗ | — |', '|---|---|---|---|---|');
    CRITERES.forEach(c => {
        const p = par[c.id];
        l.push(`| ${c.label} | ${p.ok} | ${p.moyen} | ${p.ko} | ${p.na} |`);
    });
    return l.join('\n');
}
