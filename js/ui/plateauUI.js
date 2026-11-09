// LE PLATEAU DES NOMBRES — l'écran, et le mode démo.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on est sur un plateau avec des nombres aux extrémités et on
// fonctionne par équipe, et sur le plateau chaque joueur porte un chiffre (qui
// peut changer) exemple un joueur de l'équipe rouge porte 7 et un autre 8 et il
// y a un 56 sur le plateau et il faut qu'il se retrouve pour prendre le 56 (on
// peut aussi faire cela pour l'addition). Si c'est un rouge et un bleu qui se
// rejoignent les points sont partagés. »
//
// Puis : « et j'aimerai bien un mode démo ».
//
// Puis, en voyant la première version : « je voyais plus les joueurs comme des
// ronds qui se déplacent librement pas case par case et quand on recouvre un
// carré, le carré s'éclaire ».
//
// ── DES RONDS LIBRES, ET POURQUOI IL A RAISON ─────────────────────────────
//
// Un déplacement de case en case fait du jeu une suite de tours : on attend son
// pas, on compte les cases, et deux élèves qui se cherchent se croisent par
// à-coups. Des ronds libres font de la RENCONTRE le geste central — on se voit
// venir, on ajuste, on se rejoint. C'est exactement ce que son jeu demande, et
// c'est la différence entre un damier et un terrain.
//
// D'où l'architecture de cet écran : la grille des carrés est un DÉCOR fixe,
// les ronds vivent au-dessus en position absolue, et une boucle d'animation
// les avance au temps écoulé. Les carrés s'éclairent quand un rond les
// recouvre.
//
// ── LE MODE DÉMO N'EST PAS UN CONFORT, C'EST LA CONDITION ─────────────────
//
// Un jeu à trente ne se regarde pas tout seul. Sans robots, Rémy ne peut PAS
// voir son propre jeu avant de le lancer devant une classe — et une règle de
// jeu se juge en jouant, pas en lisant. Les pions de l'ordinateur ne trichent
// pas : ils lisent le plateau par les mêmes fonctions que l'élève.
//
// ── CET ÉCRAN NE DÉCIDE AUCUNE RÈGLE ──────────────────────────────────────
//
// Qui prend quoi, avec qui, pour combien : tout vient de `core/plateau.js`, qui
// est pur et éprouvé sans navigateur. Ce fichier dessine, écoute les doigts et
// les touches, et fait tourner une horloge.

import {
    NOMBRES, RAYON, VITESSE, dessinerLePlateau, placeDeDepart, avancer, caseSous,
    cibleEn, cibleSous, quiPrend, repartirLesPoints, decompositions, coupDuRobot,
    nombresUtiles, coutDeLErreur, scoreApresPenalite
} from '../core/plateau.js';
import { makeRng, shortId } from '../core/ids.js';

/**
 * LES DEUX ÉQUIPES, ET CE SONT CELLES DU DÉFI.
 *
 * Rémy a dit « un rouge et un bleu ». J'ai gardé Bleus et Orange : un élève est
 * déjà dans l'une des deux pour le défi de la classe, et changer de couleur
 * d'un jeu à l'autre lui ferait apprendre deux appartenances au lieu d'une.
 * L'orange et le rouge se ressemblent assez pour que la phrase de Rémy reste
 * vraie à l'écran.
 */
export const COULEURS = ['Les Bleus', 'Les Orange'];

/** La vitesse d'un pion tenu par l'ordinateur : un peu moins vif qu'un élève. */
const VITESSE_ROBOT = VITESSE * 0.78;

const echapper = (s) => String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * UNE QUESTION DONT LA RÉPONSE EST CE NOMBRE-LÀ.
 *
 * C'est le style de jeu « en répondant », et c'est celui où les maths coûtent
 * quelque chose : pour devenir un 8, il faut trouver 8. L'élève regarde le
 * plateau, décide ce qu'il veut devenir, PUIS le mérite.
 *
 * LA QUESTION EST L'OPÉRATION INVERSE DE CELLE DU PLATEAU : sur un plateau de
 * multiplication on demande une division. C'est exactement le geste que l'élève
 * vient de faire dans sa tête pour décomposer le 56 — on le lui fait écrire.
 */
export function questionPourDevenir(nombre, operation, rng) {
    const autre = rng.pick(NOMBRES);
    return operation === '+'
        ? { texte: `${nombre + autre} − ${autre} = ?`, reponse: nombre }
        : { texte: `${nombre * autre} ÷ ${autre} = ?`, reponse: nombre };
}

/**
 * LES JETONS POSÉS AU SOL — le style « on ramasse les nombres ».
 *
 * Ils ne tombent jamais sur un carré à prendre : un jeton sous le 56 ferait
 * changer de nombre au moment précis où l'on vient prendre, et la prise
 * échouerait sans que personne ne comprenne pourquoi.
 */
export function semerDesJetons(plateau, combien, rng) {
    const jetons = [];
    for (let essai = 0; essai < 300 && jetons.length < combien; essai++) {
        const x = rng.int(0, plateau.largeur - 1);
        const y = rng.int(0, plateau.hauteur - 1);
        if (cibleEn(plateau, x, y)) continue;
        if (jetons.some(j => j.x === x && j.y === y)) continue;
        jetons.push({ x, y, nombre: rng.pick(NOMBRES) });
    }
    return jetons;
}

/**
 * OUVRE UNE PARTIE — en démo (avec des robots) ou pour de vrai.
 *
 * @param {object} o
 * @param {HTMLElement} [o.hote] où poser l'écran ; par défaut un voile plein écran
 * @param {string} [o.graine] la même graine donne le même plateau
 * @param {'×'|'+'} [o.operation]
 * @param {'question'|'jetons'|'libre'} [o.style] comment on change de nombre
 * @param {{tables?:number[], mini?:number}} [o.quoi] sur quoi on joue — une
 *   table, plusieurs, ou une plage de valeurs. Rémy : « Choisir ce qu'on
 *   travaille ». Vide veut dire « toutes les tables ».
 * @param {number} [o.robots] combien de pions tenus par l'ordinateur
 * @param {number} [o.secondes] la durée de la partie
 * @param {boolean} [o.noms] écrire le prénom sous chaque rond
 * @param {'aucune'|'fige'|'points'|'deux'} [o.penalite] ce que coûte une erreur
 * @param {function} [o.surLaFin] appelée avec les scores quand le temps tombe
 */
export function ouvrirLePlateau(o = {}) {
    const graine = o.graine || shortId(6);
    const operation = o.operation === '+' ? '+' : '×';
    const style = ['question', 'jetons', 'libre'].includes(o.style) ? o.style : 'question';
    const combienDeRobots = Math.max(0, Math.min(40, Math.round(o.robots ?? 11)));
    const secondes = Math.max(20, Math.round(o.secondes || 120));
    const quoi = o.quoi || {};
    // LES PRÉNOMS SOUS LES RONDS. Rémy : « Il faudrait une option pour les
    // prénoms ». C'est une OPTION et non un réglage par défaut, parce qu'elle
    // pose la question qu'il avait lui-même tranchée pour le podium du défi :
    // écrire trente prénoms au tableau, c'est désigner celui qui ne prend rien.
    // Ici, en revanche, elle répond à la vraie difficulté du jeu — trouver QUI
    // porte le 8 parmi trente pastilles.
    const avecNoms = !!o.noms;
    const penalite = coutDeLErreur(o.penalite);
    const rng = makeRng(`partie-${graine}`);
    const plateau = dessinerLePlateau({
        graine, operation, quoi,
        // LE PLATEAU GRANDIT AVEC LA CLASSE. Trente ronds sur douze cases de
        // large se marcheraient dessus — on ne verrait plus que des tas.
        largeur: Math.max(12, Math.min(18, 10 + Math.ceil((combienDeRobots + 1) / 4))),
        hauteur: 8,
        combien: Math.max(6, Math.min(16, 6 + Math.round((combienDeRobots + 1) / 3)))
    });

    // ── LES PIONS ────────────────────────────────────────────────────────
    //
    // LE JOUEUR HUMAIN EST LE PREMIER DES BLEUS, et les robots se partagent le
    // reste une ligne sur deux — exactement comme le serveur partagera la vraie
    // classe (`equipeDeLEleve`). La démo montre donc la MÊME répartition que la
    // partie réelle, et non une mise en scène.
    // LES NOMBRES DE DÉPART SE TIRENT PARMI CEUX QUI SERVENT ICI. Sur un
    // plateau de la table de 7, démarrer avec un 5 n'ouvre rien : la partie
    // commencerait par trente changements de nombre avant le premier geste.
    const utiles = nombresUtiles(plateau);
    const pions = [];
    const compteurs = [0, 0];
    const ajouter = (nom, robot) => {
        const equipe = pions.length % 2;
        const place = placeDeDepart(plateau, equipe, compteurs[equipe]++);
        pions.push({
            id: shortId(6), nom, equipe, robot,
            x: place.x, y: place.y, nombre: rng.pick(utiles),
            depuis: Date.now(), vise: null, el: null
        });
    };
    ajouter(o.nom || 'Toi', false);
    const moi = pions[0];
    for (let i = 0; i < combienDeRobots; i++) ajouter(`Pion ${i + 1}`, true);

    let jetons = style === 'jetons' ? semerDesJetons(plateau, 14, rng) : [];
    const prises = [];
    const dejaPris = new Set();
    const scores = [0, 0];
    let fini = false;
    let question = null;

    // ── L'ÉCRAN ──────────────────────────────────────────────────────────
    const voile = document.createElement('div');
    voile.className = 'pdn-voile';
    voile.innerHTML = `
        <div class="pdn-carte">
            <div class="pdn-haut">
                <div class="pdn-eq pdn-eq--0"><span>${echapper(COULEURS[0])}</span>
                    <b data-score0>0</b></div>
                <div class="pdn-temps"><b data-reste>${secondes}</b> s</div>
                <div class="pdn-eq pdn-eq--1"><span>${echapper(COULEURS[1])}</span>
                    <b data-score1>0</b></div>
                <button type="button" class="pdn-sortir" data-sortir
                    aria-label="Fermer le plateau">×</button>
            </div>
            <!-- LE TERRAIN : la grille des carrés est un DÉCOR FIXE, et les
                 ronds vivent au-dessus. C'est ce qui permet un déplacement
                 libre — un pion rangé DANS une case ne pourrait être qu'au
                 centre d'une case. -->
            <div class="pdn-terrain" data-terrain>
                <div class="pdn-grille" data-grille role="img"
                     aria-label="Le plateau des nombres"></div>
                <div class="pdn-pions" data-pions></div>
            </div>
            <!-- CE QU'IL FAUT POUR PRENDRE LE CARRÉ QU'ON RECOUVRE. C'est le
                 moment d'enseignement du jeu : « 56 — il manque un 8 » est une
                 décomposition lue à voix haute par l'écran. -->
            <div class="pdn-dit" data-dit></div>
            <div class="pdn-bas">
                <div class="pdn-moi">tu portes <b data-monnombre>?</b></div>
                <div class="pdn-devenir" data-devenir></div>
                <div class="pdn-manette" data-manette>
                    <button type="button" data-dir="haut" aria-label="Monter">▲</button>
                    <div>
                        <button type="button" data-dir="gauche" aria-label="Aller à gauche">◀</button>
                        <button type="button" data-dir="bas" aria-label="Descendre">▼</button>
                        <button type="button" data-dir="droite" aria-label="Aller à droite">▶</button>
                    </div>
                </div>
            </div>
        </div>`;
    (o.hote || document.body).appendChild(voile);
    const el = (s) => voile.querySelector(s);
    const terrain = el('[data-terrain]');
    const grille = el('[data-grille]');
    const zonePions = el('[data-pions]');
    for (const e of [terrain, grille]) {
        e.style.setProperty('--pdn-colonnes', String(plateau.largeur));
        e.style.setProperty('--pdn-lignes', String(plateau.hauteur));
    }

    /* ─────────────────────────── LE DÉCOR ───────────────────────────── */

    // LES CARRÉS SONT CRÉÉS UNE FOIS, PUIS SEULEMENT RALLUMÉS OU ÉTEINTS.
    // Reconstruire la grille à chaque image rallumerait les transitions CSS de
    // tous les carrés soixante fois par seconde : le plateau clignoterait.
    const cases = [];
    for (let y = 0; y < plateau.hauteur; y++) {
        for (let x = 0; x < plateau.largeur; x++) {
            const c = document.createElement('div');
            c.className = 'pdn-case';
            c.dataset.x = String(x);
            c.dataset.y = String(y);
            grille.appendChild(c);
            cases.push(c);
        }
    }
    const caseEn = (x, y) => cases[y * plateau.largeur + x];

    /** Repeint ce qui ne change pas à chaque image : les valeurs et les jetons. */
    const peindreLeDecor = () => {
        for (const c of cases) {
            c.className = 'pdn-case';
            c.innerHTML = '';
        }
        for (const cible of plateau.cibles) {
            if (dejaPris.has(cible.i)) continue;
            const c = caseEn(cible.x, cible.y);
            c.classList.add('pdn-case--cible');
            c.innerHTML = `<span class="pdn-valeur">${cible.valeur}</span>`;
        }
        for (const j of jetons) {
            const c = caseEn(j.x, j.y);
            c.classList.add('pdn-case--jeton');
            c.innerHTML += `<span class="pdn-jeton">${j.nombre}</span>`;
        }
    };

    /** Un rond par pion, créé une fois : ensuite on ne bouge que sa position. */
    for (const p of pions) {
        const d = document.createElement('div');
        d.className = `pdn-pion pdn-pion--${p.equipe}${p === moi ? ' pdn-pion--moi' : ''}`;
        d.title = p.nom;
        // LE NOMBRE RESTE DANS LE ROND, LE PRÉNOM VA DESSOUS. Le nombre est ce
        // qui décide la prise : il ne doit jamais céder sa place. Le prénom
        // n'est qu'une aide pour s'appeler.
        d.innerHTML = '<span class="pdn-nb-pion" data-nb></span>'
            + (avecNoms ? `<span class="pdn-nom">${echapper(p.nom)}</span>` : '');
        zonePions.appendChild(d);
        p.el = d;
        p.elNb = d.querySelector('[data-nb]');
    }

    /* ────────────────────────── LA BOUCLE ───────────────────────────── */

    /** Ce qu'il manque pour prendre ce carré, vu d'ici. */
    const ceQuilManque = (cible) => {
        const portes = pions.filter((p) => {
            const c = caseSous(p.x, p.y);
            return c.x === cible.x && c.y === cible.y;
        }).map(p => p.nombre);
        let meilleur = null;
        for (const v of decompositions(cible.valeur, operation)) {
            const reste = [...v];
            for (const n of portes) {
                const k = reste.indexOf(n);
                if (k >= 0) reste.splice(k, 1);
            }
            if (!meilleur || reste.length < meilleur.length) meilleur = reste;
        }
        return meilleur || [];
    };

    // LES CARRÉS ALLUMÉS, GARDÉS D'UNE IMAGE À L'AUTRE. On ne touche au DOM que
    // lorsqu'un carré CHANGE d'état : rallumer trente carrés soixante fois par
    // seconde ferait vibrer la page sur une tablette.
    let allumes = new Set();
    const rallumer = () => {
        const maintenant = new Set();
        for (const p of pions) {
            const c = caseSous(p.x, p.y);
            if (c.x < 0 || c.y < 0 || c.x >= plateau.largeur || c.y >= plateau.hauteur) continue;
            maintenant.add(c.y * plateau.largeur + c.x);
        }
        for (const k of allumes) {
            if (!maintenant.has(k)) cases[k].classList.remove('pdn-case--allumee');
        }
        for (const k of maintenant) {
            if (!allumes.has(k)) cases[k].classList.add('pdn-case--allumee');
        }
        allumes = maintenant;
    };

    const placerLesPions = () => {
        for (const p of pions) {
            p.el.style.left = `${(p.x / plateau.largeur) * 100}%`;
            p.el.style.top = `${(p.y / plateau.hauteur) * 100}%`;
            if (p.elNb.textContent !== String(p.nombre)) {
                p.elNb.textContent = String(p.nombre);
            }
            // LE ROND FIGÉ SE VOIT DU FOND DE LA CLASSE : gris, immobile, le
            // temps de la pénalité. C'est toute la lisibilité de ce réglage.
            p.el.classList.toggle('pdn-pion--fige', p.figeJusqua > Date.now());
        }
    };

    const direCeQuOnVoit = () => {
        el('[data-monnombre]').textContent = String(moi.nombre);
        el('[data-score0]').textContent = String(scores[0]);
        el('[data-score1]').textContent = String(scores[1]);
        const dit = el('[data-dit]');
        if (fini) return;
        const sous = cibleSous(plateau, moi.x, moi.y);
        if (!sous || dejaPris.has(sous.i)) {
            dit.className = 'pdn-dit';
            dit.textContent = 'Va sur un nombre, et retrouves-y quelqu\'un.';
            return;
        }
        const manque = ceQuilManque(sous);
        dit.className = 'pdn-dit pdn-dit--sur';
        dit.innerHTML = manque.length === 0
            ? `<b>${sous.valeur}</b> — c'est bon, ça part !`
            : `<b>${sous.valeur}</b> — il manque ${manque.map(n =>
                `<span class="pdn-manque">${n}</span>`).join(' et ')}`;
    };

    /**
     * UN CARRÉ RECOUVERT PAR ASSEZ DE MONDE SE PREND.
     *
     * ON NE DEMANDE PAS À `core/plateau.js` DE TENIR LE JEU, seulement de
     * trancher. L'arbitrage est le sien ; la conséquence — éteindre le carré,
     * compter les points, annoncer — appartient à l'écran.
     */
    const verifierLesPrises = () => {
        if (fini) return;
        // LES JETONS SE RAMASSENT EN PASSANT DESSUS.
        if (style === 'jetons') {
            for (const p of pions) {
                const c = caseSous(p.x, p.y);
                const k = jetons.findIndex(j => j.x === c.x && j.y === c.y);
                if (k < 0) continue;
                p.nombre = jetons[k].nombre;
                jetons.splice(k, 1);
                // ON EN RESÈME UN AILLEURS : un plateau qui s'épuise de ses
                // jetons fige le jeu à mi-partie, et plus personne ne peut
                // changer de nombre.
                jetons.push(...semerDesJetons(plateau, 1, rng));
                peindreLeDecor();
            }
        }
        // ON NE REGARDE QUE LES CARRÉS OÙ IL Y A DU MONDE, et seulement à
        // partir de deux : c'est ce qui rend ce contrôle gratuit à soixante
        // images par seconde, même à trente pions.
        const parCase = new Map();
        for (const p of pions) {
            const c = caseSous(p.x, p.y);
            const k = `${c.x}:${c.y}`;
            if (!parCase.has(k)) parCase.set(k, []);
            parCase.get(k).push(p);
        }
        for (const [k, surPlace] of parCase) {
            if (surPlace.length < 2) continue;
            const [cx, cy] = k.split(':').map(Number);
            const cible = plateau.cibles.find(c =>
                c.x === cx && c.y === cy && !dejaPris.has(c.i));
            if (!cible) continue;
            const prise = quiPrend(cible.valeur, surPlace, operation);
            if (!prise) continue;
            encaisser(cible, prise);
        }
    };

    const encaisser = (cible, prise) => {
        dejaPris.add(cible.i);
        const part = repartirLesPoints(prise);
        for (const e of Object.keys(part)) scores[Number(e)] += part[e];
        prises.push({ valeur: cible.valeur, points: prise.points,
                      partage: prise.partage, equipes: prise.equipes,
                      qui: prise.pions.map(p => p.nombre) });
        annoncer(cible, prise);
        // LES PRENEURS SONT POUSSÉS HORS DU CARRÉ, et ce n'est pas cosmétique :
        // sans cela ils y restent, le carré neuf peut y réapparaître sous eux,
        // et il se prendrait tout seul sans que personne n'ait bougé.
        for (const p of prise.pions) {
            const vers = avancer(plateau, p.x, p.y,
                p.equipe === 0 ? 1 : -1, (p.y > plateau.hauteur / 2 ? -1 : 1), 1, 1.3);
            p.x = vers.x; p.y = vers.y;
            p.vise = null;
        }
        // ET UN CARRÉ NEUF APPARAÎT AILLEURS : le plateau ne s'épuise pas.
        // LE CARRÉ NEUF SUIT LE MÊME RÉGLAGE : sans `quoi`, un plateau de la
        // table de 7 se remplirait peu à peu de carrés pris n'importe où, et
        // le réglage s'effacerait tout seul au fil de la partie.
        const neuf = dessinerLePlateau({
            graine: `${graine}-${prises.length}`, operation, quoi,
            largeur: plateau.largeur, hauteur: plateau.hauteur, combien: 1
        }).cibles[0];
        const occupee = (x, y) => pions.some((p) => {
            const c = caseSous(p.x, p.y);
            return c.x === x && c.y === y;
        }) || plateau.cibles.some(c => !dejaPris.has(c.i)
            && Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1);
        if (neuf && !occupee(neuf.x, neuf.y)) {
            plateau.cibles.push({ ...neuf, i: plateau.cibles.length });
        }
        peindreLeDecor();
    };

    /**
     * UNE ERREUR SE PAYE, ET DE LA MÊME FAÇON POUR TOUT LE MONDE.
     *
     * UN SEUL ENDROIT PUNIT — l'élève et les pions de l'ordinateur passent par
     * ici. Deux punitions séparées auraient fini par ne plus coûter la même
     * chose, et la démo aurait montré un jeu que la classe ne joue pas.
     */
    const punir = (p) => {
        if (penalite.fige) p.figeJusqua = Date.now() + penalite.fige * 1000;
        if (penalite.points) {
            scores[p.equipe] = scoreApresPenalite(scores[p.equipe], penalite.points);
        }
        if (!penalite.fige && !penalite.points) return;
        const b = document.createElement('div');
        b.className = 'pdn-annonce pdn-annonce--faute';
        b.innerHTML = (avecNoms ? `<b>${echapper(p.nom)}</b> s'est trompé` : 'Raté')
            + (penalite.points ? ` <span>−${penalite.points}</span>` : '')
            + (penalite.fige ? ` <i>figé ${penalite.fige} s</i>` : '');
        voile.querySelector('.pdn-carte').appendChild(b);
        setTimeout(() => b.remove(), 1400);
    };

    /** Un bandeau d'une seconde et demie : qui a pris quoi, et pour combien. */
    const annoncer = (cible, prise) => {
        const b = document.createElement('div');
        b.className = `pdn-annonce${prise.partage ? ' pdn-annonce--partage' : ''}`;
        const qui = prise.pions.map(p => p.nombre).join(prise.partage ? ' + ' : ' · ');
        b.innerHTML = `<b>${cible.valeur}</b> pris par ${qui}`
            + (prise.pions.length >= 3 ? ' <i>à trois&nbsp;!</i>' : '')
            + ` <span>+${prise.partage
                ? Math.round(prise.points / 2) + ' à chacun' : prise.points}</span>`;
        voile.querySelector('.pdn-carte').appendChild(b);
        setTimeout(() => b.remove(), 1600);
    };

    /* ──────────────────── CE QUI FAIT AVANCER LES RONDS ─────────────── */

    // TROIS FAÇONS DE DIRIGER SON ROND, et les trois existent pour une raison :
    //   · LES FLÈCHES, tenues enfoncées — l'ordinateur de la salle info ;
    //   · LA MANETTE du bas, tenue au pouce — la tablette ;
    //   · LE DOIGT POSÉ SUR LE TERRAIN : le rond va vers le doigt. C'est le
    //     geste le plus naturel au doigt, et celui qui demande le moins
    //     d'apprentissage à un sixième.
    const touches = new Set();
    let versLeDoigt = null;

    const clavier = (e) => {
        if (e.target && e.target.matches && e.target.matches('input')) return;
        const d = { ArrowUp: 'haut', ArrowDown: 'bas',
                    ArrowLeft: 'gauche', ArrowRight: 'droite' }[e.key];
        if (!d) return;
        e.preventDefault();
        if (e.type === 'keydown') touches.add(d); else touches.delete(d);
    };
    document.addEventListener('keydown', clavier);
    document.addEventListener('keyup', clavier);

    voile.querySelectorAll('[data-dir]').forEach((b) => {
        const d = b.dataset.dir;
        b.addEventListener('pointerdown', (e) => {
            e.preventDefault(); touches.add(d);
            b.setPointerCapture && b.setPointerCapture(e.pointerId);
        });
        for (const fin of ['pointerup', 'pointercancel', 'pointerleave']) {
            b.addEventListener(fin, () => touches.delete(d));
        }
    });

    /** Où le doigt se trouve, en unités de plateau. */
    const enUnites = (e) => {
        const r = terrain.getBoundingClientRect();
        return {
            x: ((e.clientX - r.left) / r.width) * plateau.largeur,
            y: ((e.clientY - r.top) / r.height) * plateau.hauteur
        };
    };
    terrain.addEventListener('pointerdown', (e) => {
        if (fini) return;
        terrain.setPointerCapture && terrain.setPointerCapture(e.pointerId);
        versLeDoigt = enUnites(e);
    });
    terrain.addEventListener('pointermove', (e) => {
        if (versLeDoigt) versLeDoigt = enUnites(e);
    });
    for (const fin of ['pointerup', 'pointercancel']) {
        terrain.addEventListener(fin, () => { versLeDoigt = null; });
    }

    /** La direction voulue par le joueur, cette image-ci. */
    const voulu = () => {
        let dx = 0;
        let dy = 0;
        if (touches.has('gauche')) dx -= 1;
        if (touches.has('droite')) dx += 1;
        if (touches.has('haut')) dy -= 1;
        if (touches.has('bas')) dy += 1;
        if (dx || dy) return { dx, dy };
        if (versLeDoigt) {
            const dx2 = versLeDoigt.x - moi.x;
            const dy2 = versLeDoigt.y - moi.y;
            // ON S'ARRÊTE EN ARRIVANT SOUS LE DOIGT, sans quoi le rond
            // frétillerait autour de lui.
            if (Math.hypot(dx2, dy2) > RAYON * 0.6) return { dx: dx2, dy: dy2 };
        }
        return null;
    };

    let dernierTemps = 0;
    let image = 0;
    const pas = (t) => {
        if (fini) return;
        image = requestAnimationFrame(pas);
        const maintenant = t || Date.now();
        // LA PREMIÈRE IMAGE NE FAIT AVANCER PERSONNE : sans ce garde, le `dt`
        // du tout premier tour vaut l'âge de la page, et les trente ronds
        // partiraient d'un bond jusqu'au bord.
        const dt = dernierTemps ? Math.min(0.1, (maintenant - dernierTemps) / 1000) : 0;
        dernierTemps = maintenant;
        if (!dt) return;

        const jeSuisFige = moi.figeJusqua > Date.now();
        if (!question && !jeSuisFige) {
            const v = voulu();
            if (v) {
                const vers = avancer(plateau, moi.x, moi.y, v.dx, v.dy, dt);
                moi.x = vers.x; moi.y = vers.y;
            }
        }
        for (const p of pions) {
            if (!p.robot) continue;
            if (p.figeJusqua > Date.now()) continue;
            const coup = coupDuRobot(p, plateau, pions, [...dejaPris], rng.next);
            if (!coup) continue;
            if (coup.vise !== undefined) p.vise = coup.vise;
            if (coup.devenir) {
                // ── UN PION NE CHANGE DE NOMBRE QU'UNE FOIS PAR SECONDE ET
                //    DEMIE, et c'est la correction d'un vrai défaut.
                //
                // Le tirage d'erreur se faisait À CHAQUE IMAGE — soixante fois
                // par seconde —, donc un pion qui avait besoin de changer se
                // trompait presque aussitôt, et se retrouvait figé dès qu'il
                // dégelait. MESURÉ SUR LA PHOTO : trois pions sur six gris en
                // même temps. Une tentative, c'est un élève qui réfléchit puis
                // tape une réponse : ça prend un temps, et c'est ce temps-là
                // qu'on compte.
                if (maintenant < (p.prochainEssai || 0)) continue;
                p.prochainEssai = maintenant + 1500;
                // LES PIONS DE L'ORDINATEUR SE TROMPENT AUSSI, environ une fois
                // sur sept. Sans cela, la pénalité n'arriverait JAMAIS en mode
                // démo — Rémy réglerait « on perd des points » et ne verrait
                // rien se passer. Un robot infaillible ne montre pas le jeu
                // qu'il va lancer à sa classe. C'est une erreur SIMULÉE, et
                // c'est écrit ici pour que personne ne la prenne pour une
                // mesure de quoi que ce soit.
                if (style === 'question' && (penalite.fige || penalite.points)
                    && rng.next() < 0.15) {
                    punir(p);
                    continue;
                }
                p.nombre = coup.devenir;
                continue;
            }
            if (coup.vers) {
                const vers = avancer(plateau, p.x, p.y,
                    coup.vers.dx, coup.vers.dy, dt, VITESSE_ROBOT);
                p.x = vers.x; p.y = vers.y;
            }
        }
        verifierLesPrises();
        rallumer();
        placerLesPions();
        direCeQuOnVoit();
    };

    /* ───────────────────── LE CLAVIER DES NOMBRES ───────────────────── */

    const peindreDevenir = () => {
        const zone = el('[data-devenir]');
        if (style === 'jetons') {
            zone.innerHTML = '<span class="pdn-aide">ramasse un jeton pour changer de nombre</span>';
            return;
        }
        if (question) {
            zone.innerHTML = `<span class="pdn-question">Pour devenir
                <b>${question.devenir}</b> : ${echapper(question.texte)}</span>
                <input class="pdn-reponse" type="text" inputmode="numeric"
                    autocomplete="off" data-reponse aria-label="Ta réponse">
                <button type="button" class="pdn-ok" data-valider>OK</button>
                <button type="button" class="pdn-annul" data-annuler>×</button>`;
            const champ = zone.querySelector('[data-reponse]');
            const valider = () => {
                const lu = (champ.value || '').trim();
                if (lu !== '' && Number(lu) === question.reponse) {
                    moi.nombre = question.devenir;
                    question = null;
                    peindreDevenir();
                } else {
                    champ.classList.add('pdn-reponse--ko');
                    champ.value = '';
                    setTimeout(() => champ.classList.remove('pdn-reponse--ko'), 400);
                    // ET ÇA COÛTE, si Rémy l'a réglé ainsi. La question se
                    // ferme : rester dessus à réessayer jusqu'à tomber juste
                    // viderait la pénalité de son sens.
                    if (penalite.fige || penalite.points) {
                        punir(moi);
                        question = null;
                        peindreDevenir();
                    }
                }
            };
            zone.querySelector('[data-valider]').onclick = valider;
            zone.querySelector('[data-annuler]').onclick = () => {
                question = null; peindreDevenir();
            };
            champ.onkeydown = (e) => {
                if (e.key === 'Enter') { e.preventDefault(); valider(); }
            };
            champ.focus();
            return;
        }
        zone.innerHTML = '<span class="pdn-aide">deviens&nbsp;:</span>'
            + NOMBRES.map(n => `<button type="button" class="pdn-nb${
                n === moi.nombre ? ' pdn-nb--actif' : ''}" data-devenir-nb="${n}">${n}</button>`).join('');
        zone.querySelectorAll('[data-devenir-nb]').forEach((b) => {
            b.onclick = () => {
                const n = Number(b.dataset.devenirNb);
                if (n === moi.nombre || fini) return;
                if (style === 'libre') { moi.nombre = n; peindreDevenir(); return; }
                question = { ...questionPourDevenir(n, operation, rng), devenir: n };
                peindreDevenir();
            };
        });
    };

    /* ─────────────────────────── L'HORLOGE ──────────────────────────── */

    const finAt = Date.now() + secondes * 1000;
    const horloge = setInterval(() => {
        const reste = Math.max(0, Math.round((finAt - Date.now()) / 1000));
        el('[data-reste]').textContent = String(reste);
        if (reste <= 0) terminer();
    }, 250);

    function terminer() {
        if (fini) return;
        fini = true;
        clearInterval(horloge);
        cancelAnimationFrame(image);
        const gagnant = scores[0] === scores[1] ? -1 : (scores[0] > scores[1] ? 0 : 1);
        const dit = el('[data-dit]');
        dit.className = 'pdn-dit pdn-dit--fin';
        dit.innerHTML = (gagnant < 0
            ? '<b>Égalité !</b>'
            : `<b>${echapper(COULEURS[gagnant])} gagnent</b>`)
            + ` — ${scores[0]} à ${scores[1]}`
            + `<small>${prises.length} nombre(s) pris`
            + (prises.some(p => p.qui.length >= 3) ? ', dont à trois' : '') + '</small>';
        el('[data-devenir]').innerHTML = '';
        if (o.surLaFin) o.surLaFin({ scores, prises });
    }

    peindreLeDecor();
    placerLesPions();
    rallumer();
    direCeQuOnVoit();
    peindreDevenir();
    image = requestAnimationFrame(pas);

    return {
        element: voile,
        etat: () => ({ scores, prises: [...prises], fini,
                       moi: { x: moi.x, y: moi.y, nombre: moi.nombre },
                       cibles: plateau.cibles.filter(c => !dejaPris.has(c.i)).length }),
        /**
         * POUSSE LE ROND DANS UNE DIRECTION — pour la sonde, et pour tout appel
         * programmé. Un joueur, lui, TIENT sa touche ; cette poussée-ci vaut
         * environ un tiers de case, de quoi piloter le rond depuis une mesure
         * sans avoir à simuler un appui maintenu.
         */
        bouger(direction, combien = 0.33) {
            if (fini) return;
            // LE GEL VAUT ICI AUSSI, ET LA SONDE L'A DIT.
            //
            // La pénalité ne vivait que dans la boucle d'animation — donc pour
            // un élève au clavier ou au doigt, qui passent par elle. Mais ce
            // chemin-ci, programmé, la contournait : un rond figé avançait
            // quand même. Une règle qui ne vit que dans l'interface n'est pas
            // une règle, c'est une décoration — et le jour où la partie en
            // réseau fera avancer les pions par ici, la pénalité serait
            // devenue gratuite sans que rien ne le dise.
            if (moi.figeJusqua > Date.now()) return;
            const d = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] }[direction];
            if (!d) return;
            const vers = avancer(plateau, moi.x, moi.y, d[0], d[1], 1, combien);
            moi.x = vers.x; moi.y = vers.y;
            verifierLesPrises();
            rallumer();
            placerLesPions();
            direCeQuOnVoit();
        },
        terminer,
        fermer() {
            fini = true;
            clearInterval(horloge);
            cancelAnimationFrame(image);
            document.removeEventListener('keydown', clavier);
            document.removeEventListener('keyup', clavier);
            voile.remove();
        }
    };
}

// LE BOUTON DE SORTIE EST BRANCHÉ ICI PLUTÔT QUE DANS `ouvrirLePlateau` :
// celui qui ouvre la partie veut souvent faire autre chose en la fermant
// (revenir à son écran, relancer). On lui rend donc la main.
export function brancherLaSortie(partie, quoiFaire) {
    const b = partie.element.querySelector('[data-sortir]');
    if (b) b.onclick = () => { partie.fermer(); if (quoiFaire) quoiFaire(); };
}
