// LE DEVOIR À LA MAISON — une séance qui se ferme toute seule à une date.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre, parmi les trois chantiers qu'il a retenus : « Le devoir à
// la maison daté — une séance qui s'ouvre et se ferme toute seule à une date,
// et le tableau de qui l'a faite. »
//
// ── CE QUI EXISTAIT DÉJÀ, ET CE QU'IL FALLAIT DÉCIDER ─────────────────────
//
// Tout le tuyau était posé, et vide. La table `assignments` porte une colonne
// `due_at` depuis le premier jour ; le serveur la rend au professeur sous le
// nom `pourLe` et l'écran de la classe sait déjà écrire « à rendre … » ; le
// navigateur de l'élève la reçoit sous le nom `dueAt`. PERSONNE NE LA
// REMPLISSAIT : aucun appel ne passait de date, et les deux bouts du tuyau en
// avaient choisi deux sens différents — le professeur lisait « à rendre », et
// l'élève en faisait l'heure d'OUVERTURE de la séance.
//
// UNE COLONNE QUI VEUT DIRE DEUX CHOSES NE VEUT RIEN DIRE. On tranche ici, une
// fois, et dans le sens de son nom : `due_at` est LA DATE À RENDRE. Le jour où
// l'on voudra programmer l'ouverture d'une séance, ce sera une autre colonne,
// avec un autre nom.
//
// ── POURQUOI LA SÉANCE SE FERME, ET CE QUE « FERMÉE » VEUT DIRE ───────────
//
// `core/seances.js` sait déjà clore une séance : `closeLe` est posé par le
// professeur quand il décide que l'heure est finie, et `comptePourLaNote`
// cesse alors de compter ce qui arrive après. Une échéance est la MÊME chose,
// décidée à l'avance — d'où `finDe`, qui prend la première des deux.
//
// ET « FERMÉE » NE VEUT PAS DIRE « DISPARUE » : le texte existant le dit déjà
// bien — « reste ouverte à l'entraînement ». L'élève qui s'y met le lundi
// travaille, apprend, et son travail ne compte simplement plus pour la note du
// devoir. C'est la règle du cahier, et elle n'avait pas besoin d'être inventée.
//
// Aucun DOM ici : ce fichier se lit sous Node, donc il s'éprouve.

/** Vingt heures : l'heure à laquelle un devoir se rend, faute d'autre idée. */
export const HEURE_DU_SOIR = 20;

const MINUTE = 60000, HEURE = 3600000, JOUR = 24 * HEURE;

/** Le même jour, à l'heure dite. */
function aLHeure(quand, heures) {
    const d = new Date(quand);
    d.setHours(heures, 0, 0, 0);
    return d.getTime();
}

/** Ce soir à vingt heures — ou demain soir s'il est déjà passé. */
export function ceSoir(maintenant = Date.now()) {
    const t = aLHeure(maintenant, HEURE_DU_SOIR);
    return t > maintenant ? t : t + JOUR;
}

/** Demain matin, huit heures : le cours suivant. */
export const demainMatin = (maintenant = Date.now()) => aLHeure(maintenant + JOUR, 8);

/**
 * LE PROCHAIN DIMANCHE, VINGT HEURES — l'échéance la plus donnée de France.
 *
 * ON NE REND JAMAIS « AUJOURD'HUI » quand on est dimanche : un devoir donné le
 * dimanche après-midi à rendre le dimanche soir n'est pas un devoir à la
 * maison, c'est un piège. Le dimanche, on vise donc le suivant.
 */
export function dimancheSoir(maintenant = Date.now()) {
    const d = new Date(maintenant);
    const jours = (7 - d.getDay()) % 7;        // 0 = dimanche
    let t = aLHeure(maintenant + jours * JOUR, HEURE_DU_SOIR);
    if (t <= maintenant + 6 * HEURE) t += 7 * JOUR;
    return t;
}

/**
 * LES QUATRE PROPOSITIONS, ET POURQUOI CELLES-LÀ.
 *
 * Un champ de date vide demande six gestes (ouvrir, choisir le mois, le jour,
 * l'heure, les minutes, valider) pour une décision qui en vaut un. Les quatre
 * que voici couvrent ce qu'un professeur donne vraiment : la fin de l'heure, le
 * cours suivant, le week-end, et la semaine. Le champ de date reste là pour le
 * reste — on ne retire pas la liberté, on évite de l'imposer.
 */
export const PROPOSITIONS = [
    { id: 'soir', nom: 'Ce soir, 20 h', quand: ceSoir },
    { id: 'demain', nom: 'Demain matin, 8 h', quand: demainMatin },
    { id: 'dimanche', nom: 'Dimanche soir, 20 h', quand: dimancheSoir },
    { id: 'semaine', nom: 'Dans une semaine', quand: (m = Date.now()) => aLHeure(m + 7 * JOUR, HEURE_DU_SOIR) }
];

export const propositionsDe = (maintenant = Date.now()) =>
    PROPOSITIONS.map(p => ({ id: p.id, nom: p.nom, quand: p.quand(maintenant) }));

/* ── CE QU'ON EN DIT ──────────────────────────────────────────────────── */

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 20 h », « 20 h 30 » — jamais « 20:00 », qui ne se lit pas à voix haute. */
export function heureDite(quand) {
    const d = new Date(quand);
    const m = d.getMinutes();
    return `${d.getHours()} h${m ? ' ' + String(m).padStart(2, '0') : ''}`;
}

/**
 * LA DATE D'UNE ÉCHÉANCE, DITE COMME ON LA DIT EN CLASSE.
 *
 * « pour jeudi 20 h » tant qu'on est dans la semaine qui vient — c'est ainsi
 * qu'on l'annonce, et le jour de la semaine suffit à se repérer. Au-delà, le
 * jour du mois devient nécessaire : « pour le 2 décembre, 20 h ».
 */
export function dateDite(quand, maintenant = Date.now()) {
    const d = new Date(quand);
    const jours = Math.round((aLHeure(quand, 12) - aLHeure(maintenant, 12)) / JOUR);
    // « CE SOIR » SE DIT D'UNE HEURE DU SOIR, et pas du jour même. Vu à la
    // première lecture : une échéance posée à 10 h 42 s'annonçait « ce soir,
    // 10 h 42 ». Le mot vient de la proposition la plus courante — vingt
    // heures —, pas de la date, et il devient faux dès qu'on s'en écarte.
    const leSoir = d.getHours() >= 17;
    if (jours === 0) {
        return leSoir ? `ce soir, ${heureDite(quand)}` : `aujourd’hui à ${heureDite(quand)}`;
    }
    if (jours === 1) {
        return leSoir ? `demain soir, ${heureDite(quand)}` : `demain à ${heureDite(quand)}`;
    }
    if (jours > 1 && jours <= 6) {
        return `${JOURS[d.getDay()]}${leSoir ? ' soir,' : ' à'} ${heureDite(quand)}`;
    }
    return `le ${d.getDate()} ${MOIS[d.getMonth()]}, ${heureDite(quand)}`;
}

/**
 * CE QUE L'ÉLÈVE LIT SUR SA SÉANCE.
 *
 * ── LE COMPTE À REBOURS N'APPARAÎT QUE QUAND IL SERT ──────────────────────
 *
 * « il reste 3 jours » sur un devoir donné pour la semaine prochaine n'apprend
 * rien que la date ne dise déjà. « Il reste 2 heures », si. On passe donc à la
 * durée dans les dernières vingt-quatre heures, et à rien d'autre avant.
 */
export function direLEcheance(rendreLe, maintenant = Date.now()) {
    if (!rendreLe) return '';
    const reste = rendreLe - maintenant;
    if (reste <= 0) return 'à rendre : c’est passé';
    if (reste < HEURE) {
        const m = Math.max(1, Math.round(reste / MINUTE));
        return `à rendre dans ${m} minute${m > 1 ? 's' : ''}`;
    }
    if (reste < JOUR) {
        const h = Math.round(reste / HEURE);
        return `à rendre dans ${h} heure${h > 1 ? 's' : ''} — ${dateDite(rendreLe, maintenant)}`;
    }
    return `à rendre pour ${dateDite(rendreLe, maintenant)}`;
}

/** Et ce que le professeur lit, qui n'est pas la même phrase. */
export function direAuProf(rendreLe, maintenant = Date.now()) {
    if (!rendreLe) return '';
    return rendreLe <= maintenant
        ? `échéance passée (${dateDite(rendreLe, maintenant)})`
        : `à rendre ${dateDite(rendreLe, maintenant)}`;
}

/** Ce travail est-il arrivé après l'heure ? */
export const enRetard = (rendreLe, ts) => !!rendreLe && !!ts && ts > rendreLe;

/**
 * L'ÉCHÉANCE EST-ELLE TENABLE ?
 *
 * ON REFUSE LE PASSÉ, et pas par principe : une échéance déjà dépassée ferme la
 * séance à la seconde où on la pose. Le professeur croit donner un devoir, et
 * il vient de clore le travail de toute la classe — sans un mot, puisque tout
 * s'est bien passé.
 *
 * ON REFUSE AUSSI LES DEUX MINUTES QUI VIENNENT : le temps de dicter le code et
 * de laisser trente tablettes se réveiller, elles sont déjà passées.
 */
export const DELAI_MINIMAL = 2 * MINUTE;
export function echeanceTenable(rendreLe, maintenant = Date.now()) {
    if (rendreLe === null || rendreLe === undefined || rendreLe === '') return { ok: true, quand: null };
    const t = typeof rendreLe === 'number' ? rendreLe : Date.parse(rendreLe);
    if (!Number.isFinite(t)) {
        return { ok: false, pourquoi: 'Cette date ne se lit pas.' };
    }
    if (t < maintenant + DELAI_MINIMAL) {
        return { ok: false,
            pourquoi: 'Une échéance déjà passée fermerait la séance tout de suite. '
                + 'Choisissez une date à venir.' };
    }
    return { ok: true, quand: t };
}

/* ── LE TABLEAU DE QUI L'A RENDU ──────────────────────────────────────── */

/**
 * CE QUE LE PROFESSEUR VEUT SAVOIR D'UN DEVOIR, et dans cet ordre.
 *
 * RÉMY : « et le tableau de qui l'a faite ». La question n'est pas « combien
 * ont bien réussi » — c'est le bilan, il existe — mais « qui ne l'a pas fait »,
 * parce que c'est la seule qui demande un geste de sa part, et qu'elle se pose
 * AVANT l'échéance, pas après.
 *
 * TROIS ÉTATS ET PAS DEUX : « rendu », « commencé », « rien ». Celui qui a
 * commencé sans finir n'est pas dans le même cas que celui qui n'a pas ouvert
 * le devoir — l'un a besoin d'aide, l'autre d'un rappel.
 *
 * @param {Array} eleves  [{ id, prenom, avancement, quand }]
 * @param {number|null} rendreLe
 */
export function tableauDuDevoir(eleves, rendreLe = null, maintenant = Date.now()) {
    const lignes = (eleves || []).map(e => {
        // ── « FINI » SE LIT DANS `etat`, ET NON DANS UN DRAPEAU `fini` ──
        //
        // Écrit d'abord `a.fini`, qui n'existe pas : `avancementDeRun`
        // (api/lib/projections.php ↔ js/core/avancement.js) rend `etat`, qui
        // vaut 'fini', 'abandonne' ou 'en-cours'. Un drapeau absent est
        // toujours faux : le tableau aurait affiché « personne n'a rendu » sur
        // une classe entière, et rien ne l'aurait signalé.
        const a = e.avancement || null;
        const fini = !!(a && a.etat === 'fini');
        const commence = !fini && !!(a && ((a.faites || 0) > 0 || a.etapeEnCours
            || (a.questions || 0) > 0));
        return {
            id: e.id, prenom: e.prenom,
            etat: fini ? 'rendu' : (commence ? 'commence' : 'rien'),
            // EN RETARD SE DIT DU TRAVAIL, PAS DE L'ÉLÈVE : c'est l'instant du
            // dernier geste qu'on compare à l'échéance.
            enRetard: fini && enRetard(rendreLe, e.quand ? e.quand * 1000 : null),
            quand: e.quand || null
        };
    });
    const compte = (quoi) => lignes.filter(l => l.etat === quoi).length;
    return {
        lignes,
        rendus: compte('rendu'),
        commences: compte('commence'),
        rien: compte('rien'),
        combien: lignes.length,
        // LE TEMPS QU'IL RESTE, pour que l'écran puisse dire s'il est encore
        // temps de relancer les absents.
        reste: rendreLe ? Math.max(0, rendreLe - maintenant) : null
    };
}

/** « 12 rendus sur 28 » — la ligne qu'on lit sans ouvrir le tableau. */
export function direLeTableau(t) {
    if (!t || !t.combien) return 'Aucun élève dans cette classe.';
    const manque = t.combien - t.rendus;
    return `${t.rendus} rendu${t.rendus > 1 ? 's' : ''} sur ${t.combien}`
        + (manque > 0 ? ` — ${manque} à relancer` : ' — tout le monde l’a fait');
}
