// LE MENEUR D'UNE DÉMONSTRATION — l'échafaudage, écrit une fois.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QU'IL REMPLACE, ET POURQUOI C'ÉTAIT LA PLUS GROSSE DUPLICATION DU DÉPÔT.
//
// Chaque démonstration de chaque exercice écrivait la même phrase devant chacun
// de ses pas :
//
//     if (!await gate.waitTurn() || !this.isRunning) return fin();
//     cur.say('…');
//     if (!await cur.pause(1800) || !this.isRunning) return fin();
//
// Mesuré avant d'écrire ce fichier : **674 fois dans 98 fichiers**, plus
// **86 `const fin = …`** en treize formes. Le SCÉNARIO de chaque démonstration
// est légitimement différent — c'est le métier de Rémy, et il n'y a rien à
// factoriser là. L'échafaudage autour, lui, ne l'est pas.
//
// ET CE N'ÉTAIT PAS QU'UNE QUESTION DE LIGNES. Quand la même garde est recopiée
// 674 fois, elle DIVERGE, et la mesure l'a montré :
//
//     522×  || !this.isRunning   → return fin()
//      83×  || destroyed         → return fin()
//      52×  (RIEN DU TOUT)       → return fin()      ← le défaut
//       9×  || !vivant()         → return fin()
//       8×  … autres variantes
//
// LES CINQUANTE-DEUX SANS RIEN SONT UN DÉFAUT RÉEL, et il est silencieux : le
// pointeur détecte sa propre destruction (ses méthodes rendent `!destroyed`),
// mais pas l'arrêt du JEU. Un exercice que l'élève quitte pendant une
// démonstration pouvait donc continuer à parler et à cliquer dans le vide
// pendant quelques secondes — exactement le défaut que `tools/robotsMuets.mjs`
// a été écrit pour traquer ailleurs.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// CE QU'IL FAIT, ET CE QU'IL NE FAIT PAS.
//
// Il porte TROIS choses, et rien d'autre :
//
//   1. L'ATTENTE. Le tour de parole de la barre Pause/Un pas, la pause de
//      lecture, les gestes du pointeur.
//   2. LA VIE. Une seule fois : « ce jeu tourne-t-il encore ? ». On la déclare à
//      la construction, et plus un seul pas ne peut l'oublier.
//   3. LE RANGEMENT. Le pointeur, la barre, et ce que l'appelant veut remettre
//      à zéro — appelé UNE SEULE FOIS, même si dix pas se terminent d'affilée.
//
// IL NE DÉCIDE RIEN DU SCÉNARIO. Il ne sait pas ce qu'on dit, ni où l'on
// clique, ni dans quel ordre. C'est voulu : le jour où l'on voudrait
// « factoriser les démonstrations », on recommencerait à décider à la place de
// Rémy ce qu'une leçon doit montrer.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI LA GARDE RESTE UN `if (…) return`, ET NON UNE EXCEPTION.
//
// On a hésité. Une sentinelle lancée par chaque pas, attrapée par un
// `jouerScenario(…)`, supprimerait la garde ENTIÈREMENT :
//
//     await d.tour();                    // au lieu de : if (!await d.tour()) return;
//
// C'est plus beau et c'est faux ici, pour une raison mesurée : 59 des 98
// démonstrations ont une BOUCLE, et plusieurs appellent une autre méthode qui
// contient elle-même des pas gardés (`if (!await this.demoNiveau(cur, gate))`).
// Passer à l'exception demande d'envelopper chaque corps dans une fonction — une
// transformation qu'aucun outil ne peut prouver juste sur 98 fonctions écrites
// à la main, et dont chaque erreur donne une démonstration cassée que personne
// ne verra avant qu'un élève n'ouvre l'exercice.
//
// La garde reste donc une ligne — mais UNE SEULE ligne, toujours la même, qui
// ne peut plus oublier la vie ni le rangement :
//
//     if (!await d.tour()) return;
//     if (!await d.pause(1800)) return;
//
// C'est le genre de choix qu'on écrit, parce que sans l'écrire quelqu'un
// refera la discussion dans six mois sans la mesure.

/**
 * Monte le meneur d'une démonstration.
 *
 * @param {Object} pointeur  le pointeur de `createDemoCursor()`
 * @param {Object} barre     la barre de `createDemoGate()`
 * @param {() => boolean} [vivant]  « ce jeu tourne-t-il encore ? ». Absent, on
 *        ne s'en remet qu'à la destruction du pointeur — c'est l'état des 52
 *        pas qui ne vérifiaient rien, et il n'est jamais le bon : on le passe.
 * @param {() => void} [rangement]  ce que l'appelant veut remettre à zéro en
 *        plus du pointeur et de la barre (ses propres champs, un minuteur à
 *        lui). Appelé UNE SEULE FOIS.
 * @param {Object} [options]
 *   `garderPointeur` : vrai pour seulement cacher la bulle au lieu de détruire
 *        le pointeur. Seize démonstrations faisaient `cursor?.hideBubble()` sans
 *        `destroy` — parce qu'elles rendent la main à une activité qui REPREND
 *        la parole juste après, et détruire le pointeur lui couperait le sien.
 *   `rangementSeul` : vrai quand `rangement` est le rangement COMPLET, et que le
 *        meneur ne doit donc toucher ni au pointeur ni à la barre.
 *
 *        Une dizaine de démonstrations rangent autrement que les autres : l'une
 *        remet `gate` à null, une autre relance la question suivante
 *        (`regTimeout(renderNext, …)`), une troisième arrête son propre
 *        intervalle. On ne les a pas réécrites : leur rangement reste le code
 *        que son auteur a voulu, à sa place, et le meneur ne lui apporte que ce
 *        qu'il manquait — la garantie qu'il ne tourne QU'UNE FOIS et que plus un
 *        pas n'oublie la vie. Vouloir les ramener de force au modèle commun,
 *        c'était décider à leur place sans savoir pourquoi elles diffèrent.
 */
export function meneurDemo(pointeur, barre, vivant = null, rangement = null, options = {}) {
    let rangé = false;

    /**
     * LE RANGEMENT NE SE FAIT QU'UNE FOIS, et c'est ce qui permet d'écrire
     * `return d.fin()` autant de fois qu'on veut dans une démonstration.
     *
     * Avant, chaque `const fin = …` était rappelé à chaque pas qui échouait.
     * `gate.destroy()` deux fois de suite est inoffensif aujourd'hui ; rien ne
     * garantissait qu'il le resterait, et le rangement d'un appelant — remettre
     * un champ à null, arrêter un minuteur — n'a aucune raison d'être idempotent.
     */
    const ranger = () => {
        if (rangé) return;
        rangé = true;
        if (!options.rangementSeul) {
            try {
                if (options.garderPointeur) pointeur?.hideBubble();
                else pointeur?.destroy();
            } catch (e) { /* un pointeur déjà parti n'est pas une erreur */ }
            try { barre?.destroy(); } catch (e) { /* idem pour la barre */ }
        }
        try { if (rangement) rangement(); } catch (e) { /* le rangement de l'appelant ne doit pas masquer la fin */ }
    };

    /** La vie, en un seul endroit : le pas a-t-il abouti, ET le jeu tourne-t-il ? */
    const encore = (abouti) => {
        if (abouti && (!vivant || vivant())) return true;
        ranger();
        return false;
    };

    /**
     * UN PAS, ET LA SEULE PORTE PAR LAQUELLE ILS PASSENT TOUS.
     *
     * Elle refuse AVANT d'attendre quand la démonstration est déjà rangée. Ce
     * n'est pas de la coquetterie : une démonstration terminée garde des
     * minuteurs en vol, et un minuteur qui repart appelle un pas sur un pointeur
     * détruit. C'est ainsi qu'on obtient « Cannot set properties of null » dans
     * la question SUIVANTE — le défaut que `tools/robotsMuets.mjs` a rencontré
     * en enchaînant les robots, et qu'il a fallu vingt minutes pour attribuer à
     * la sonde plutôt qu'au logiciel.
     */
    const pas = async (faire) => {
        if (rangé) return false;
        return encore(await faire());
    };

    const api = {
        /** Le pointeur et la barre, pour tout ce que le meneur ne porte pas. */
        pointeur, barre,

        /** Vrai tant qu'il y a une raison de continuer. Sans effet de bord. */
        get vivant() { return !rangé && (!vivant || vivant()); },

        // ── Les pas qui attendent. Tous rendent `true` pour continuer. ───────

        /** Son tour de parole : la barre Pause / Un pas / Vitesse décide. */
        tour() {
            return pas(async () => (barre ? barre.waitTurn() : true));
        },

        /** Pause de lecture, allongée tant que la bulle n'a pas eu le temps d'être lue. */
        pause(ms) {
            return pas(async () => (pointeur ? pointeur.pause(ms) : true));
        },

        /** Délai sec, qui ne dépend pas de ce qui reste à lire. */
        attendre(ms) {
            return pas(async () => (barre ? barre.wait(ms) : (pointeur ? pointeur.pause(ms) : true)));
        },

        /** Amener le pointeur sur un élément. */
        vers(cible, ms) {
            return pas(async () => (pointeur ? pointeur.moveTo(cible, ms) : true));
        },

        /** Appui complet : trajet, enfoncement, relâchement. */
        toucher(cible, ms) {
            return pas(async () => (pointeur ? pointeur.tap(cible, ms) : true));
        },

        /** Saisir, faire glisser, déposer. */
        glisser(de, vers, ms) {
            return pas(async () => (pointeur ? pointeur.dragFromTo(de, vers, ms) : true));
        },

        /**
         * N'IMPORTE QUEL AUTRE PAS QUI S'ATTEND.
         *
         * Quelques démonstrations appellent une méthode à elles — « montre ce
         * niveau », « fais ce geste » — qui contient elle-même des pas. Elles
         * passent par ici plutôt que de refaire la garde à la main :
         *
         *     if (!await d.puis(this.demoNiveau(d))) return;
         *
         * Seul `false` est un échec : une méthode qui ne rend rien a réussi.
         */
        puis(promesse) {
            return pas(async () => (await promesse) !== false);
        },

        // ── Ce qui ne s'attend pas ──────────────────────────────────────────

        /** Dire une phrase. Une idée par bulle, sous 110 caractères (voir `COURT`). */
        dire(texte, cible) {
            pointeur?.say(texte, cible);
            return this;
        },

        /**
         * LA FIN, DÉCIDÉE PAR L'APPELANT — et elle rend `false`.
         *
         * Cela permet d'écrire `return d.fin();` partout où l'on écrivait
         * `return fin();`, y compris dans une démonstration qui rendait
         * `false` pour dire « je n'ai pas abouti ».
         */
        fin() {
            ranger();
            return false;
        }
    };
    return api;
}
