// LES CLASSES DU PROFESSEUR.
//
// Une classe est une LISTE D'ÉLÈVES et rien d'autre : un nom, un niveau, et
// pour chacun le journal d'événements qu'il a produit. Tout le reste — la
// maîtrise, les forces, les difficultés — se RECALCULE à partir de ce journal
// (`core/projections.js`, `core/mastery.js`). C'est ce qui permet de rejouer
// un bilan quand la façon de le calculer change, et de ne jamais avoir deux
// vérités qui divergent.
//
// OÙ VIENNENT LES DONNÉES. Un élève exporte sa progression (un fichier
// `progression_prenom.json`, déjà produit par `importExport.js`), le
// professeur la dépose dans la classe. C'est le chemin hors ligne, celui d'une
// salle sans réseau — et c'est le seul dont on est sûr qu'il marche partout.
// La synchro par code de classe remplira le même modèle le jour venu.
//
// CE MODULE NE CONNAÎT PAS LE DOM. Il crée, range, fusionne ; l'écran est
// ailleurs.

import { shortId } from './ids.js';

/** Le squelette d'une classe vide. */
export function creerClasse(nom, niveau = '') {
    return {
        id: 'c_' + shortId(8),
        nom: (nom || '').trim() || 'Ma classe',
        niveau: niveau || '',
        creeeLe: Date.now(),
        eleves: []
    };
}

/** Le squelette d'un élève. `evenements` est son journal, brut. */
export function creerEleve(nom, evenements = []) {
    return {
        id: 'e_' + shortId(8),
        nom: (nom || '').trim() || 'Élève',
        ajouteLe: Date.now(),
        majLe: evenements.length ? Date.now() : null,
        evenements: [...evenements]
    };
}

/**
 * Ajoute un élève, ou COMPLÈTE celui qui porte déjà ce nom.
 *
 * Un professeur qui récupère une deuxième fois le fichier d'Emma ne veut pas
 * deux Emma : il veut la même, à jour. On fusionne donc sur le nom — c'est ce
 * qu'il a sous les yeux — en dédoublonnant les événements par identifiant,
 * puisque les deux fichiers partagent forcément tout le passé commun.
 */
export function poserEleve(classe, nom, evenements = []) {
    const cle = normaliser(nom);
    const existant = (classe.eleves || []).find(e => normaliser(e.nom) === cle);
    if (!existant) {
        const eleve = creerEleve(nom, evenements);
        return { ...classe, eleves: [...(classe.eleves || []), eleve] };
    }
    const fusion = fusionnerEvenements(existant.evenements, evenements);
    const maj = {
        ...existant,
        evenements: fusion.evenements,
        majLe: fusion.ajoutes ? Date.now() : existant.majLe
    };
    return {
        ...classe,
        eleves: classe.eleves.map(e => (e.id === existant.id ? maj : e))
    };
}

/**
 * Deux journaux du même élève, réunis sans doublon.
 *
 * Les événements portent un identifiant unique : c'est lui qui tranche, et non
 * l'horodatage — un même travail réimporté garde ses `id`, alors que deux
 * questions différentes peuvent tomber à la même milliseconde.
 */
export function fusionnerEvenements(anciens = [], nouveaux = []) {
    const vus = new Set(anciens.map(e => e && e.id).filter(Boolean));
    const ajout = [];
    for (const e of nouveaux) {
        if (!e || !e.id || vus.has(e.id)) continue;
        vus.add(e.id);
        ajout.push(e);
    }
    const evenements = [...anciens, ...ajout].sort((a, b) => (a.ts || 0) - (b.ts || 0));
    return { evenements, ajoutes: ajout.length };
}

export function retirerEleve(classe, eleveId) {
    return { ...classe, eleves: (classe.eleves || []).filter(e => e.id !== eleveId) };
}

export function renommerEleve(classe, eleveId, nom) {
    return {
        ...classe,
        eleves: (classe.eleves || []).map(e =>
            e.id === eleveId ? { ...e, nom: (nom || '').trim() || e.nom } : e)
    };
}

/**
 * Ce qu'un fichier déposé contient — ou pourquoi il n'est pas utilisable.
 *
 * On refuse explicitement plutôt que d'accepter n'importe quoi : un professeur
 * qui dépose le mauvais fichier doit l'apprendre tout de suite, pas découvrir
 * une classe vide trois écrans plus loin.
 */
export function lireFichierEleve(data) {
    if (!data || typeof data !== 'object') {
        return { ok: false, raison: 'Ce fichier n\'est pas lisible.' };
    }
    if (data.kind && data.kind !== 'student_progress') {
        return { ok: false, raison: 'Ce fichier n\'est pas une progression d\'élève.' };
    }
    if (!Array.isArray(data.events)) {
        return { ok: false, raison: 'Ce fichier ne contient aucun travail.' };
    }
    const nom = (data.profile && data.profile.name) || '';
    if (!data.events.length) {
        return { ok: false, raison: `${nom || 'Cet élève'} n'a encore rien fait : le fichier est vide.` };
    }
    return { ok: true, nom, evenements: data.events };
}

/** Comparaison de noms tolérante aux accents, aux majuscules et aux espaces. */
export function normaliser(nom) {
    return String(nom || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Les élèves rangés comme un professeur les appelle : par ordre alphabétique. */
export function elevesTries(classe) {
    return [...(classe.eleves || [])].sort((a, b) =>
        normaliser(a.nom).localeCompare(normaliser(b.nom), 'fr'));
}
