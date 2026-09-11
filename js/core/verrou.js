// L'ÉTAPE SOUS CLÉ — ce qui ne s'ouvre qu'en classe.
//
// Rémy : « il ne faut pas vraiment que l'élève ait accès aux interros à la
// maison, mais il peut très bien avoir accès à la séquence avant mon cours. »
//
// C'est une seule idée avec deux faces. La séquence est ouverte : on la
// distribue à l'avance, l'élève la travaille quand il veut, c'est même le but.
// L'interrogation qui la termine, elle, ne s'ouvre qu'au moment où le
// professeur le dit — et il le dit en dictant quatre caractères à voix haute,
// comme il donne déjà une consigne.
//
// L'ÉTAPE FERMÉE RESTE VISIBLE, et c'est important. L'élève voit qu'une
// interrogation clôt la séquence : il sait vers quoi il travaille. La cacher
// reviendrait à lui donner une carte amputée, et il découvrirait l'épreuve au
// moment de la passer.
//
// LA CLÉ N'EST PAS DANS LE PARCOURS — SEULEMENT SON EMPREINTE.
//
// Un parcours voyage dans un lien, et un lien se décode : il est écrit en
// base64, pas chiffré. Y ranger la clé en clair reviendrait à l'écrire au
// tableau la veille. Le parcours ne transporte donc qu'une EMPREINTE, calculée
// par une fonction à sens unique ; la clé saisie est passée par la même
// fonction et les deux empreintes se comparent.
//
// ET L'EMPREINTE EST LENTE À CALCULER, DÉLIBÉRÉMENT. Quatre caractères sur cet
// alphabet font un peu plus d'un million de clés : un ordinateur les essaierait
// toutes en une seconde si l'empreinte était un simple SHA-256. On dérive donc
// la clé par PBKDF2 avec beaucoup d'itérations — une vérification légitime
// coûte quelques dizaines de millisecondes, ce qui ne se sent pas, et un
// essai systématique demande des heures.
//
// SOYONS HONNÊTES SUR CE QUE ÇA VAUT. Cela arrête l'élève curieux qui décode
// son lien, et l'élève pressé qui essaie « 1234 ». Cela n'arrête pas quelqu'un
// de déterminé et outillé. C'est le même compromis que partout ici : une vraie
// interrogation reste une interrogation SURVEILLÉE, comme une copie papier.
// La clé sert à ce que le travail se fasse au bon moment, pas à empêcher une
// fraude organisée.

/**
 * L'ALPHABET DES CLÉS — sans les caractères qu'on confond.
 *
 * La clé se dicte à voix haute devant trente élèves, puis se tape sur un
 * clavier de tablette. Un I et un 1, un O et un 0, se ressemblent à l'écrit et
 * s'entendent pareil : ils coûteraient une main levée par classe. Restent
 * trente-deux caractères, soit un peu plus d'un million de clés de quatre.
 */
export const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const LONGUEUR_CLE = 4;

/**
 * COMBIEN DE TEMPS LA CLÉ OUVRE.
 *
 * Elle n'ouvre pas pour toujours, et c'est le point : un élève qui note la clé
 * refait l'interrogation chez lui le soir, et la note ne veut plus rien dire.
 *
 *   'heure'    — une heure de cours. Le cas de l'interrogation.
 *   'jour'     — jusqu'à minuit. Pour une séance qu'on reprend l'après-midi.
 *   'toujours' — la clé ne sert qu'à retarder l'ouverture, pas à la borner.
 *                Utile pour une séquence qu'on lance ensemble puis que l'élève
 *                continue chez lui.
 */
export const DUREES = { HEURE: 'heure', JOUR: 'jour', TOUJOURS: 'toujours' };

export const DUREE_LABELS = {
    [DUREES.HEURE]: 'une heure',
    [DUREES.JOUR]: 'jusqu\'à ce soir',
    [DUREES.TOUJOURS]: 'sans limite'
};

const ITERATIONS = 120000;

/** Une clé neuve, tirée au sort. */
export function nouvelleCle(rng, n = LONGUEUR_CLE) {
    let out = '';
    for (let i = 0; i < n; i++) {
        const t = rng && typeof rng.next === 'function' ? rng.next() : Math.random();
        out += ALPHABET[Math.floor(t * ALPHABET.length) % ALPHABET.length];
    }
    return out;
}

/**
 * CE QU'ON TAPE ET CE QU'ON COMPARE NE SONT PAS LA MÊME CHOSE.
 *
 * L'élève tape en minuscules, met un espace ou un tiret au milieu parce que la
 * clé est dictée par groupes. Refuser la clé pour cela serait la refuser pour
 * de mauvaises raisons, et trente mains se lèveraient.
 *
 * ON NE REMPLACE RIEN, EN REVANCHE. La tentation était de faire revenir le O
 * sur le zéro, ou le I sur le un — c'est l'usage quand un alphabet en écarte
 * un des deux. Ici les QUATRE sont écartés : une clé n'en contient jamais.
 * Un caractère tapé qui n'est pas dans l'alphabet ne correspond donc à rien
 * qu'on puisse deviner, et lui inventer un remplaçant transformerait une
 * faute de frappe en une autre clé — refusée elle aussi, mais sans qu'on
 * sache pourquoi.
 */
export function normaliserCle(saisie) {
    return String(saisie == null ? '' : saisie)
        .toUpperCase()
        .split('')
        .filter(c => ALPHABET.includes(c))
        .join('');
}

/** L'empreinte d'une clé, salée par l'étape à laquelle elle appartient. */
export async function empreinteDe(cle, sel, iterations = ITERATIONS) {
    const sub = (globalThis.crypto && globalThis.crypto.subtle) || null;
    const enc = new TextEncoder();
    const clair = normaliserCle(cle);
    if (!sub) {
        // PAS DE WEB CRYPTO : c'est le cas d'un navigateur servi en clair (http)
        // ou très ancien. On ne fait pas semblant — l'appelant doit savoir que
        // le verrou n'a pas pu être posé, plutôt que de croire à une protection
        // qui n'existe pas.
        return null;
    }
    const base = await sub.importKey('raw', enc.encode(clair), 'PBKDF2', false, ['deriveBits']);
    const bits = await sub.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(`atoutmath·${sel || ''}`), iterations, hash: 'SHA-256' },
        base, 128);
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * LE VERROU PORTE SON PROPRE SEL, et il le faut absolument.
 *
 * Le premier jet salait avec l'identifiant de l'étape. C'était faux, et d'une
 * façon qui ne se serait vue qu'en classe : un parcours qui voyage dans un
 * code est RECONSTRUIT à l'arrivée, et ses étapes reçoivent de nouveaux
 * identifiants. Le sel changeait donc en route, l'empreinte ne correspondait
 * plus à rien, et la bonne clé était refusée sur la machine de l'élève — la
 * seule où l'on ne peut pas déboguer.
 *
 * Le sel n'a pas à être secret : il sert à ce que la même clé posée sur deux
 * étapes donne deux empreintes différentes, et à interdire les tables
 * précalculées. Il voyage donc avec l'empreinte, et le verrou se suffit.
 *
 * @returns {{empreinte, duree, sel}|null} null si le navigateur n'a pas de
 *          Web Crypto — l'appelant doit alors dire que le verrou n'a pas été
 *          posé, plutôt que d'en laisser croire un.
 */
export async function poserVerrou(cle, duree = DUREES.HEURE, sel = null) {
    const grain = sel || nouvelleCle(null, 10);
    const empreinte = await empreinteDe(cle, grain);
    if (!empreinte) return null;
    return { empreinte, duree, sel: grain };
}

/** La clé saisie ouvre-t-elle ce verrou ? */
export async function verifierCle(verrou, cle) {
    if (!verrou || !verrou.empreinte) return false;
    const essai = await empreinteDe(cle, verrou.sel);
    return !!essai && essai === verrou.empreinte;
}

/**
 * LA CLEF DE RANGEMENT D'UNE OUVERTURE — le sel du verrou, pas l'étape.
 *
 * Pour la même raison : l'identifiant d'une étape change quand le parcours est
 * reconstruit depuis un code. Un élève qui rouvre son parcours par le même
 * lien perdrait son déverrouillage et redemanderait la clé au milieu de
 * l'interrogation.
 */
export const clefOuverture = (step) => (step && step.verrou && step.verrou.sel) || null;

/**
 * JUSQU'À QUAND UNE CLÉ VIENT D'OUVRIR — en millisecondes depuis l'époque.
 *
 * « Jusqu'à ce soir » est minuit, pas vingt-quatre heures : une clé donnée à
 * onze heures du matin ne doit pas rouvrir l'interrogation le lendemain matin.
 */
export function finDe(duree, maintenant = Date.now()) {
    // NULL ET NON INFINITY POUR « SANS LIMITE ». L'ouverture est écrite au
    // journal, donc en JSON, et `JSON.stringify(Infinity)` rend « null » : une
    // ouverture sans limite se relisait en `null`, qui ne passait aucun test de
    // comparaison, et l'étape se refermait au rechargement de la page.
    if (duree === DUREES.TOUJOURS) return null;
    if (duree === DUREES.JOUR) {
        const d = new Date(maintenant);
        d.setHours(23, 59, 59, 999);
        return d.getTime();
    }
    return maintenant + 60 * 60 * 1000;
}

/**
 * L'ÉTAT D'UNE ÉTAPE VIS-À-VIS DE SES DEUX FERMETURES.
 *
 * Deux mécanismes distincts, et l'ordre compte : une date d'ouverture dit
 * QUAND la chose commence à exister, une clé dit QUI l'ouvre. Une interrogation
 * datée de vendredi et fermée à clé n'est pas ouvrable jeudi, même avec la
 * bonne clé — sans quoi la date ne servirait à rien.
 *
 * @returns {{ferme: boolean, raison: 'date'|'cle'|null, quand: number|null}}
 */
export function etatVerrou(step, opts = {}) {
    const maintenant = opts.maintenant || Date.now();
    const ouverts = opts.ouverts || {};
    if (step && step.ouvertureLe && maintenant < step.ouvertureLe) {
        return { ferme: true, raison: 'date', quand: step.ouvertureLe };
    }
    if (!step || !step.verrou || !step.verrou.empreinte) {
        return { ferme: false, raison: null, quand: null };
    }
    const clef = clefOuverture(step);
    if (Object.prototype.hasOwnProperty.call(ouverts, clef)) {
        const jusqua = ouverts[clef];
        // `null` veut dire « sans limite » — voir `finDe`.
        if (jusqua === null || jusqua > maintenant) {
            return { ferme: false, raison: null, quand: jusqua };
        }
    }
    return { ferme: true, raison: 'cle', quand: null };
}

/** Les ouvertures encore valables — les périmées s'effacent d'elles-mêmes. */
export function nettoyerOuverts(ouverts, maintenant = Date.now()) {
    const out = {};
    for (const [id, fin] of Object.entries(ouverts || {})) {
        if (fin === null || fin > maintenant) out[id] = fin;
    }
    return out;
}

/** Ce qu'on dit à l'élève devant une étape fermée. */
export function direFermeture(etat) {
    if (!etat || !etat.ferme) return '';
    if (etat.raison === 'date') {
        const d = new Date(etat.quand);
        const jour = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return `Cette étape s'ouvre ${jour} à ${heure}.`;
    }
    return 'Cette étape s\'ouvre avec la clé que donne le professeur, en classe.';
}
