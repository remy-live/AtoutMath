// LE LIEN AVEC LES VINGT-NEUF AUTRES — le battement d'un jeu de classe.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Fais tout ». Les quatre jeux de classe se jouaient dans un seul
// navigateur, contre des pions de l'ordinateur. Ce fichier est le fil qui les
// relie : il pose où j'en suis, il réclame ce que je prends, et il rend le
// monde des autres.
//
// ── POURQUOI UN BATTEMENT À PART, ET PAS CELUI DE LA SÉANCE ───────────────
//
// Le battement de séance passe toutes les DIX secondes et porte bien d'autres
// choses — les mots du professeur, le verrou, le défi. Un jeu où l'on se voit
// toutes les dix secondes n'est pas un jeu : on jouerait contre des fantômes.
// On ouvre donc un second fil, à la SECONDE, et seulement pendant la partie.
//
// MESURÉ AVANT DE L'ÉCRIRE (`tools/plateauEnTempsReel.mjs`) : trente ardoises
// à une requête par seconde sur cette route, 30 requêtes/s tenues, médiane
// 28 ms, aucun verrou. À quatre par seconde, 120 requêtes/s tiennent aussi.
//
// ── CE QU'IL NE FAIT PAS ──────────────────────────────────────────────────
//
// Il ne connaît aucune règle. Il ne sait pas ce qu'est une prise, ni ce qu'elle
// vaut : il transporte. Les règles vivent dans `core/plateau.js` et
// `core/consignes.js`, qui sont purs ; le serveur, lui, n'arbitre QUE
// l'unicité — qui est arrivé le premier.

import { apiEleve } from './sync.js';

/** Le rythme ordinaire du battement, en millisecondes. */
const PAS_MS = 1000;

/**
 * OUVRE LE FIL D'UNE PARTIE.
 *
 * @param {object} o
 * @param {(monde:object) => void} o.surLeMonde appelé à chaque réponse
 * @param {() => object} o.monEtat rend `{x, y, nombre, points}` — appelé juste
 *   avant chaque envoi, pour que la position partie soit la DERNIÈRE connue et
 *   non celle d'il y a une seconde.
 * @param {number} [o.pasMs]
 */
export function ouvrirLeLien(o) {
    let vivant = true;
    let enVol = false;
    let minuteur = null;
    // LA FILE DES PRISES. On en envoie UNE par requête : le serveur n'en
    // arbitre qu'une à la fois, et c'est très bien — deux prises dans la même
    // seconde, c'est déjà beaucoup pour un élève.
    const aReclamer = [];
    // CE QUI EST FIGÉ PAR LE SERVEUR, à demander au prochain envoi.
    let figePour = 0;

    const envoyer = async () => {
        if (!vivant || enVol) return;
        enVol = true;
        try {
            const etat = o.monEtat ? (o.monEtat() || {}) : {};
            const corps = {
                x: Number(etat.x) || 0,
                y: Number(etat.y) || 0,
                nombre: Math.round(Number(etat.nombre) || 0),
                points: Math.max(0, Math.round(Number(etat.points) || 0)),
                // LE MALUS CUMULÉ DEPUIS LE DÉBUT, et non l'erreur du moment :
                // le serveur garde le plus grand des deux, donc un battement
                // perdu dans le réseau n'efface pas la punition. Une pénalité
                // envoyée « en différence » disparaîtrait avec la requête.
                malus: Math.max(0, Math.round(Number(etat.malus) || 0))
            };
            if (figePour > 0) { corps.figePour = figePour; figePour = 0; }
            // ON SORT LA PRISE DE LA FILE AVANT L'ENVOI, et on la remet en cas
            // de panne réseau : une prise perdue en silence, c'est un élève qui
            // a ramassé un nombre et ne marque rien, sans savoir pourquoi.
            const prise = aReclamer.shift() || null;
            if (prise) corps.prise = prise;
            try {
                const r = await apiEleve('/jeu', corps);
                if (o.surLeMonde) o.surLeMonde(r || {});
            } catch (e) {
                if (prise) aReclamer.unshift(prise);
            }
        } finally {
            enVol = false;
        }
    };

    // UN SEUL MINUTEUR, QUI DÉCIDE À CHAQUE TOUR — et non deux qu'on allume et
    // qu'on éteint : c'est la leçon du battement de séance, où deux minuteurs
    // s'étaient dédoublés au premier aller-retour d'onglet.
    let dernier = 0;
    minuteur = setInterval(() => {
        if (!vivant) return;
        if (Date.now() - dernier < (o.pasMs || PAS_MS)) return;
        dernier = Date.now();
        envoyer();
    }, 120);
    envoyer();

    return {
        /**
         * RÉCLAME UNE PRISE, ET TOUT DE SUITE.
         *
         * ON NE L'ATTEND PAS LE PROCHAIN BATTEMENT : à trente joueurs, une
         * seconde d'attente, c'est le temps qu'il faut à quelqu'un d'autre pour
         * prendre le même nombre. Le `quoi` doit être le MÊME pour les trente —
         * il se calcule depuis la graine, jamais au hasard.
         */
        reclamer(quoi, equipe, points) {
            if (!vivant) return;
            aReclamer.push({ quoi: String(quoi), equipe, points });
            dernier = Date.now();
            envoyer();
        },
        /** Demande au serveur de me figer — une punition qui survit au rechargement. */
        figer(secondes) {
            figePour = Math.max(figePour, Math.round(secondes) || 0);
        },
        /** Combien de prises attendent encore leur tour. */
        enAttente: () => aReclamer.length,
        fermer() {
            vivant = false;
            if (minuteur) clearInterval(minuteur);
            minuteur = null;
        }
    };
}
