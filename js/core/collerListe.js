// COLLER UNE LISTE TELLE QU'ELLE SORT DE PRONOTE.
//
// Rémy : « je trouve l'importation pas terrible, ce serait cool de pouvoir
// coller le fichier de pronote qui comprend plein de colonnes dans le
// presse-papier et tu me le présentes sous forme de tableau où tu sélectionnes
// intelligemment les colonnes ou on peut les sélectionner ». Et, décisif :
// « en première ligne j'ai le nombre d'élèves ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QUI NE MARCHAIT PAS, ET POURQUOI.
//
// Le lecteur existant devine bien, mais il devine sur TROIS colonnes : la
// première est le nom, la deuxième un prénom ou un identifiant, la troisième un
// code. Un export de Pronote en a quinze — date de naissance, sexe, classe,
// représentants légaux, régime, options — et rien ne dit qu'elles sont dans cet
// ordre-là. Le professeur devait donc nettoyer son fichier AVANT de le coller,
// c'est-à-dire faire à la main exactement ce qu'on prétendait lui épargner.
//
// ET LA PREMIÈRE LIGNE N'EST PAS DE LA DONNÉE. Chez Rémy, c'est le nombre
// d'élèves. Lue comme un élève, elle crée « 30 » dans la classe — et personne
// ne comprend d'où il sort.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TROIS PRINCIPES.
//
// ON DEVINE, PUIS ON MONTRE, ET IL CORRIGE. Aucune devinette sur un fichier
// inconnu n'est sûre. Celle-ci est bonne la plupart du temps ; ce qui la rend
// ACCEPTABLE, ce n'est pas sa finesse, c'est que le professeur voie le tableau
// avec les colonnes choisies et puisse changer d'avis en un clic.
//
// ON DEVINE SUR LE CONTENU, PAS SEULEMENT SUR L'EN-TÊTE. Un export peut n'avoir
// aucun titre de colonne. Mais une colonne de NOMS est en capitales, une
// colonne de prénoms commence par une majuscule, une colonne d'identifiants n'a
// ni accent ni espace : cela se mesure sur trente lignes, et c'est plus fiable
// qu'un mot d'en-tête qu'on aurait mal orthographié.
//
// ON NE JETTE RIEN EN SILENCE. Les lignes écartées — le préambule, les vides,
// les doublons — sont rendues avec leur raison. Un import qui avale une ligne
// sans le dire est un import qu'on ne peut pas vérifier.

/** Ce qu'une colonne peut être. L'ordre est celui du menu déroulant. */
export const ROLES = [
    { cle: 'ignore', mot: '— ne pas utiliser —' },
    { cle: 'nom', mot: 'NOM de famille' },
    { cle: 'prenom', mot: 'Prénom' },
    { cle: 'nomComplet', mot: 'Nom et prénom ensemble' },
    { cle: 'identifiant', mot: 'Identifiant' },
    { cle: 'code', mot: 'Code du billet' }
];

const SEPARATEURS = ['\t', ';', ',', '|'];

/**
 * LE SÉPARATEUR : celui qui découpe le plus RÉGULIÈREMENT.
 *
 * On ne prend pas le plus fréquent. Un export dont chaque ligne contient une
 * adresse pleine de virgules verrait la virgule gagner au nombre, alors que le
 * point-virgule est celui qui donne le même nombre de colonnes partout. La
 * régularité est le signe d'un séparateur ; l'abondance n'est le signe de rien.
 */
export function separateurDe(texte) {
    const lignes = String(texte || '').split(/\r\n|\r|\n/).filter(l => l.trim());
    if (!lignes.length) return ';';
    let meilleur = ';', meilleurScore = -1;
    for (const sep of SEPARATEURS) {
        const comptes = lignes.map(l => decouper(l, sep).length);
        const majoritaire = plusFrequent(comptes);
        if (majoritaire < 2) continue;
        const reguliers = comptes.filter(n => n === majoritaire).length;
        // Le score récompense d'abord la régularité, puis le nombre de colonnes.
        const score = reguliers * 100 + majoritaire;
        if (score > meilleurScore) { meilleurScore = score; meilleur = sep; }
    }
    return meilleur;
}

/**
 * DÉCOUPER UNE LIGNE EN RESPECTANT LES GUILLEMETS.
 *
 * Un tableur entoure de guillemets toute cellule qui contient le séparateur :
 * « MARTIN, Jean » doit rester une seule cellule. Un découpage naïf en ferait
 * deux, et décalerait toutes les colonnes suivantes de cette ligne-là — donc
 * mettrait une date de naissance dans la colonne des prénoms, sur une ligne et
 * une seule. C'est le genre d'erreur qu'on ne voit qu'en classe.
 */
export function decouper(ligne, sep) {
    const out = [];
    let cour = '', dansGuillemets = false;
    const t = String(ligne || '');
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (c === '"') {
            if (dansGuillemets && t[i + 1] === '"') { cour += '"'; i++; }
            else dansGuillemets = !dansGuillemets;
            continue;
        }
        if (c === sep && !dansGuillemets) { out.push(cour); cour = ''; continue; }
        cour += c;
    }
    out.push(cour);
    // ON NE REPASSE PAS UN COUP DE GOMME SUR LES GUILLEMETS. La boucle ci-dessus
    // les a déjà traités ; retirer en plus « un guillemet au début ou à la fin »
    // amputait les cellules qui en contiennent VRAIMENT — « il a dit "non" »
    // devenait « il a dit "non ». On se contente d'ôter les espaces.
    return out.map(c => c.trim());
}

function plusFrequent(liste) {
    const n = new Map();
    for (const v of liste) n.set(v, (n.get(v) || 0) + 1);
    let meilleur = 0, combien = -1;
    for (const [v, c] of n) if (c > combien || (c === combien && v > meilleur)) { meilleur = v; combien = c; }
    return meilleur;
}

// ───────────────────────────────────────── RECONNAÎTRE UNE CELLULE ──────────

const SANS_ACCENT = (t) =>
    String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const ressembleAUnNom = (c) => {
    const t = String(c || '').trim();
    if (t.length < 2 || t.length > 60) return false;
    if (!/[A-ZÀ-Þ]/.test(t)) return false;
    // Les capitales, apostrophes, traits d'union et espaces d'une particule.
    return /^[A-ZÀ-Þ][A-ZÀ-Þ'’\- ]+$/.test(t);
};

export const ressembleAUnPrenom = (c) => {
    const t = String(c || '').trim();
    if (t.length < 2 || t.length > 40) return false;
    if (/\d/.test(t)) return false;
    return /^[A-ZÀ-Þ][a-zà-öø-ÿ]/.test(t) || /^[A-ZÀ-Þ][a-zà-öø-ÿ'’\-]+([ \-][A-ZÀ-Þ][a-zà-öø-ÿ'’\-]+)*$/.test(t);
};

/**
 * « MARTIN Léa » — LE NOM ET LE PRÉNOM DANS LA MÊME CELLULE.
 *
 * C'est la forme de la colonne « Élève » de Pronote, et c'est aussi la forme
 * d'une liste tapée à la main, un nom par ligne. Elle n'est ni un nom (elle a
 * des minuscules) ni un prénom (elle a un bloc de capitales) : sans épreuve
 * propre, une liste d'une seule colonne ne donnait AUCUN élève.
 *
 * On accepte les deux ordres — « MARTIN Léa » et « Léa MARTIN » —, parce que
 * les deux existent et qu'on ne peut pas trancher pour le professeur. Ce qui
 * compte ici est de reconnaître la colonne ; l'ordre, c'est lui qui le voit
 * dans le tableau.
 */
export const ressembleAUnNomComplet = (c) => {
    const t = String(c || '').trim().replace(/\s+/g, ' ');
    if (t.length < 4 || t.length > 80 || /\d/.test(t)) return false;
    const mots = t.split(' ');
    if (mots.length < 2) return false;
    const capitales = mots.filter(m => ressembleAUnNom(m)).length;
    const normaux = mots.filter(m => ressembleAUnPrenom(m)).length;
    return capitales >= 1 && normaux >= 1 && capitales + normaux === mots.length;
};

export const ressembleAUnIdentifiant = (c) => {
    const t = String(c || '').trim();
    if (t.length < 3 || t.length > 60) return false;
    return /^[a-z0-9]+([._-][a-z0-9]+)*$/.test(t) && SANS_ACCENT(t) === t;
};

export const ressembleAUnCode = (c) => {
    const t = String(c || '').trim();
    return /^[A-Z0-9]{4,8}$/.test(t) && /[A-Z]/.test(t);
};

export const ressembleAUneDate = (c) =>
    /^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}$/.test(String(c || '').trim());

/** Une cellule qui n'est qu'un nombre — un effectif, un numéro de ligne. */
export const estUnNombre = (c) => /^\d+$/.test(String(c || '').trim());

// ───────────────────────────────────── LE PRÉAMBULE ET L'EN-TÊTE ────────────

/**
 * LE PRÉAMBULE : ce qui précède le tableau et n'en fait pas partie.
 *
 * Rémy : « en première ligne j'ai le nombre d'élèves ». Lue comme une ligne de
 * données, elle fabrique un élève nommé « 30 » — et il faut ensuite aller le
 * supprimer sans comprendre d'où il sort.
 *
 * LA RÈGLE EST GÉOMÉTRIQUE, PAS SÉMANTIQUE. Le tableau a un nombre de colonnes
 * qui revient sur la plupart des lignes ; une ligne du début qui en a beaucoup
 * moins n'est pas une ligne du tableau. On ne cherche donc pas le mot
 * « effectif » — on regarde la forme, ce qui marche aussi pour les préambules
 * qu'on n'a jamais vus.
 */
export function longueurDuPreambule(lignes, colonnesAttendues) {
    let n = 0;
    while (n < lignes.length) {
        const cells = lignes[n];
        const utiles = cells.filter(c => c !== '').length;
        const maigre = utiles < Math.max(2, Math.ceil(colonnesAttendues / 2));
        if (!maigre) break;
        n++;
    }
    // Un préambule qui mangerait tout le fichier n'est pas un préambule : c'est
    // que le tableau n'a qu'une colonne, et c'est un cas légitime (une liste de
    // noms, un par ligne).
    return n >= lignes.length ? 0 : n;
}

const MOTS_ENTETE = [
    'nom', 'prenom', 'eleve', 'identifiant', 'login', 'code', 'classe', 'date',
    'naissance', 'sexe', 'civilite', 'niveau', 'division', 'groupe', 'mail',
    'courriel', 'telephone', 'adresse', 'representant', 'responsable', 'regime',
    'ine', 'numero'
];

/**
 * CETTE LIGNE NOMME-T-ELLE LES COLONNES, PLUTÔT QUE DE PORTER UN ÉLÈVE ?
 *
 * DEUX SIGNES, ET LE SECOND EST LE PLUS SÛR.
 *
 * Le premier est le vocabulaire : « Nom », « Prénom », « Classe ». Il ne suffit
 * pas. L'export de Rémy porte quatorze colonnes dont dix s'appellent
 * « Option 3 », « Tuteur », « Projet d'accompagnement » — des titres qu'aucune
 * liste de mots ne contiendra jamais. Compté en proportion, le vocabulaire y
 * perd : quatre colonnes reconnues sur quatorze, et l'en-tête passe pour un
 * élève. C'est arrivé, et l'élève s'appelait « Régime Classe de rattachement ».
 *
 * Le second signe est STRUCTUREL, et il ne demande de connaître aucun mot : une
 * colonne qui porte une date sur toutes les lignes ne porte PAS une date sur sa
 * première. Un en-tête se reconnaît à ce qu'il ne ressemble pas à ses lignes.
 *
 * @param {string[]} cells       la ligne examinée
 * @param {string[][]} [dessous] les lignes suivantes, pour la comparaison
 */
export function estUnEnTete(cells, dessous = null) {
    const utiles = cells.filter(c => c !== '');
    if (!utiles.length) return false;

    const reconnus = utiles.filter(c => {
        const t = SANS_ACCENT(String(c).toLowerCase());
        return MOTS_ENTETE.some(m => t.includes(m));
    }).length;
    if (reconnus >= Math.max(1, Math.ceil(utiles.length / 3))) return true;

    // LA COMPARAISON AVEC LE DESSOUS. On cherche une colonne dont le contenu est
    // franchement régulier — des dates, des nombres — et dont cette ligne-ci
    // sort. Une seule suffit : un en-tête ne porte jamais de date.
    const lignes = (dessous || []).filter(l => l.some(c => c !== ''));
    if (lignes.length < 2) return reconnus >= 1;

    for (let i = 0; i < cells.length; i++) {
        const sous = lignes.map(l => (l[i] || '').trim()).filter(v => v !== '');
        if (sous.length < Math.max(2, Math.ceil(lignes.length * 0.7))) continue;
        for (const test of [ressembleAUneDate, estUnNombre]) {
            const part = sous.filter(test).length / sous.length;
            if (part >= 0.9 && !test((cells[i] || '').trim())) return true;
        }
    }
    return reconnus >= 1;
}

// ────────────────────────────────────────── DEVINER LES COLONNES ────────────

/** Le titre d'une colonne pèse plus qu'une mesure, quand il est clair. */
function roleParLeTitre(titre) {
    const t = SANS_ACCENT(String(titre || '').toLowerCase()).trim();
    if (!t) return null;
    if (/^(nom|nom de famille|nom eleve|nom de l'eleve)$/.test(t)) return 'nom';
    if (/^(prenom|prenom eleve|prenom de l'eleve|prenoms?)$/.test(t)) return 'prenom';
    if (/^(eleve|nom prenom|nom et prenom|identite)$/.test(t)) return 'nomComplet';
    if (/^(identifiant|login|utilisateur|compte)$/.test(t)) return 'identifiant';
    if (/^(code|code eleve|mot de passe|code billet)$/.test(t)) return 'code';
    return null;
}

/** Combien de valeurs d'une colonne passent une épreuve. */
function proportion(valeurs, test) {
    const utiles = valeurs.filter(v => v !== '');
    if (!utiles.length) return 0;
    return utiles.filter(test).length / utiles.length;
}

/**
 * CE QUE CHAQUE COLONNE EST, EN REGARDANT CE QU'ELLE CONTIENT.
 *
 * On mesure sur toutes les lignes, pas sur la première : un export commence
 * volontiers par un nom de famille court et ambigu, et se trahit à la
 * quinzième ligne.
 *
 * @returns {Array<{index, titre, valeurs, role, confiance}>}
 */
export function devinerLesColonnes(entete, lignes) {
    const combien = Math.max(entete ? entete.length : 0,
        ...lignes.map(l => l.length), 0);

    const colonnes = [];
    for (let i = 0; i < combien; i++) {
        const valeurs = lignes.map(l => (l[i] || '').trim());
        colonnes.push({
            index: i, titre: entete ? (entete[i] || '') : '', valeurs,
            role: 'ignore', confiance: 0, propose: 'ignore',
            parLeTitre: roleParLeTitre(entete ? entete[i] : ''),
            scores: {
                nomComplet: proportion(valeurs, ressembleAUnNomComplet),
                nom: proportion(valeurs, ressembleAUnNom),
                prenom: proportion(valeurs, ressembleAUnPrenom),
                identifiant: proportion(valeurs, ressembleAUnIdentifiant),
                code: proportion(valeurs, ressembleAUnCode)
            },
            inutile: proportion(valeurs, v => ressembleAUneDate(v) || estUnNombre(v))
        });
    }

    // PREMIER TOUR : LE TITRE. Quand une colonne s'appelle « Élève » ou
    // « Prénom », il n'y a rien à deviner, et aucune mesure ne doit pouvoir
    // contredire cela.
    const pris = new Set();
    for (const c of colonnes) {
        if (!c.parLeTitre) continue;
        if (pris.has(c.parLeTitre)) continue;      // la première colonne gagne
        c.role = c.parLeTitre;
        c.confiance = 1;
        pris.add(c.parLeTitre);
    }

    // DEUX FAÇONS DE DIRE LA MÊME CHOSE NE COEXISTENT PAS. Une colonne « Élève »
    // qui porte « MARTIN Léa » rend inutiles les colonnes « nom » et « prénom »,
    // et réciproquement. Sans cette règle, on écrirait « MARTIN Léa Léa ».
    const exclut = (gagnant, perdants) => {
        if (!pris.has(gagnant)) return;
        for (const p of perdants) {
            pris.add(p);                            // le rôle est « déjà pourvu »
            for (const c of colonnes) if (c.role === p) { c.role = 'ignore'; c.confiance = 0; }
        }
    };
    // ON REGARDE QUI A GAGNÉ AVANT D'EXCLURE QUI QUE CE SOIT.
    //
    // La première version demandait `pris.has('nom')` APRÈS avoir appelé
    // `exclut('nomComplet', ['nom', …])` — or `exclut` ajoute justement « nom »
    // aux rôles pourvus. La condition devenait vraie du fait de la ligne
    // précédente, et l'exclusion inverse effaçait la colonne « Élève » qu'on
    // venait de reconnaître. La garde se retournait contre elle-même.
    const aNomComplet = pris.has('nomComplet');
    const aNomOuPrenom = pris.has('nom') || pris.has('prenom');
    if (aNomComplet) exclut('nomComplet', ['nom', 'prenom']);
    else if (aNomOuPrenom) exclut(pris.has('nom') ? 'nom' : 'prenom', ['nomComplet']);

    // SECOND TOUR : LE CONTENU, et seulement pour ce qui manque encore.
    //
    // C'EST ICI QUE L'EXPORT DE PRONOTE PIÈGE UNE DEVINETTE NAÏVE. Un vrai
    // fichier porte « DEMI-PENSIONNAIRE AU TICKET » en régime, « LCA LATIN » en
    // option, « Mme DELFOUR » en professeur principal : autant de colonnes en
    // capitales qui ressemblent parfaitement à des noms de famille. Elles ne
    // peuvent plus gagner, parce que le rôle « nom » est déjà pourvu par la
    // colonne « Élève ». Et quand un en-tête existe, on exige davantage du
    // contenu : le fichier nous a déjà dit ce qu'il contenait.
    const seuil = entete ? 0.85 : 0.6;
    // « NOM Prénom » SE CHERCHE EN PREMIER : une colonne qui porte les deux
    // rend inutiles les colonnes séparées, et l'ordre inverse laisserait une
    // moitié gagner d'abord.
    for (const role of ['nomComplet', 'nom', 'prenom', 'identifiant', 'code']) {
        if (pris.has(role)) continue;
        let gagnante = null;
        for (const c of colonnes) {
            if (c.role !== 'ignore' || c.parLeTitre) continue;
            if (c.inutile >= 0.5) continue;
            const s = c.scores[role];
            if (s < seuil) continue;
            // À égalité, la plus à gauche : un export met l'élève avant ses
            // responsables légaux, et ses options après tout le reste.
            if (!gagnante || s > gagnante.scores[role]) gagnante = c;
        }
        if (gagnante) {
            gagnante.role = role;
            gagnante.confiance = gagnante.scores[role];
            pris.add(role);
            if (role === 'nomComplet') exclut('nomComplet', ['nom', 'prenom']);
        }
    }

    for (const c of colonnes) c.propose = c.role;
    return colonnes;
}

// ──────────────────────────────────────────────── L'ANALYSE ENTIÈRE ─────────

/**
 * LIRE UN COLLAGE, SANS RIEN ÉCRIRE.
 *
 * @returns {{separateur, preambule:string[], entete:string[]|null,
 *            lignes:string[][], colonnes:Array, vides:number}}
 */
export function analyserCollage(texte) {
    const brut = String(texte || '').replace(/^﻿/, '');
    const sep = separateurDe(brut);
    const toutes = brut.split(/\r\n|\r|\n/)
        .filter(l => l.trim() !== '' && !l.trim().startsWith('#'))
        .map(l => decouper(l, sep));
    if (!toutes.length) {
        return { separateur: sep, preambule: [], entete: null, lignes: [],
                 colonnes: [], vides: 0 };
    }

    const attendues = plusFrequent(toutes.map(l => l.filter(c => c !== '').length));
    const nPre = longueurDuPreambule(toutes, attendues);
    const preambule = toutes.slice(0, nPre).map(l => l.filter(Boolean).join(' '));
    let reste = toutes.slice(nPre);

    let entete = null;
    if (reste.length > 1 && estUnEnTete(reste[0], reste.slice(1))) {
        entete = reste[0];
        reste = reste.slice(1);
    }

    const colonnes = devinerLesColonnes(entete, reste);
    return { separateur: sep, preambule, entete, lignes: reste, colonnes,
             vides: 0 };
}

// ───────────────────────────────────── DU TABLEAU AUX ÉLÈVES ────────────────

/**
 * LES ÉLÈVES, D'APRÈS LES COLONNES CHOISIES.
 *
 * `choix` est un tableau de rôles, un par colonne — celui que le professeur a
 * sous les yeux, éventuellement modifié. On ne redevine rien ici : c'est lui
 * qui décide, et cette fonction ne fait qu'appliquer.
 *
 * ON NE JETTE RIEN EN SILENCE. Chaque ligne écartée revient avec sa raison.
 *
 * @returns {{eleves:Array<{nom,login,code}>, ecartees:Array<{ligne,pourquoi}>}}
 */
export function elevesDepuisChoix(analyse, choix) {
    const roles = choix || (analyse.colonnes || []).map(c => c.role);
    const ouEst = (role) => roles.indexOf(role);
    const iNom = ouEst('nom'), iPrenom = ouEst('prenom'), iTout = ouEst('nomComplet');
    const iLogin = ouEst('identifiant'), iCode = ouEst('code');

    const eleves = [];
    const ecartees = [];
    const vus = new Set();

    for (const cells of analyse.lignes || []) {
        const bout = (i) => (i >= 0 ? (cells[i] || '').trim() : '');
        // L'ORDRE EST « NOM Prénom », celui de l'appel et de la liste de
        // classe. Le professeur cherche un élève par son nom de famille.
        let nom = iTout >= 0 ? bout(iTout) : [bout(iNom), bout(iPrenom)].filter(Boolean).join(' ');
        nom = nom.replace(/\s+/g, ' ').trim();

        if (!nom) {
            ecartees.push({ ligne: cells.filter(Boolean).join(' · '), pourquoi: 'aucun nom' });
            continue;
        }
        if (estUnNombre(nom)) {
            ecartees.push({ ligne: nom, pourquoi: 'ce n\'est qu\'un nombre' });
            continue;
        }
        if (nom.length > 80) nom = nom.slice(0, 80);

        const clef = nom.toLowerCase();
        if (vus.has(clef)) {
            ecartees.push({ ligne: nom, pourquoi: 'déjà dans la liste' });
            continue;
        }
        vus.add(clef);

        const login = bout(iLogin);
        const code = bout(iCode).toUpperCase();
        eleves.push({
            nom,
            login: ressembleAUnIdentifiant(login) ? login : '',
            code: ressembleAUnCode(code) ? code : ''
        });
    }
    return { eleves, ecartees };
}

/**
 * LA FORME QUE LE SERVEUR SAIT LIRE — `nom;identifiant;code`, une ligne par
 * élève.
 *
 * On lui envoie du NORMALISÉ plutôt que le collage d'origine : toutes les
 * devinettes ont eu lieu ici, sous les yeux du professeur, et le serveur n'a
 * plus qu'à faire ce qu'il fait déjà très bien — les identifiants manquants,
 * les doublons, l'aperçu avant écriture.
 */
export function enListeNormalisee(eleves) {
    return (eleves || [])
        .map(e => [e.nom, e.login || '', e.code || ''].join(';'))
        .join('\n');
}
