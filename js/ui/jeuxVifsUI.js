// LES TROIS JEUX VIFS — chat perché, ruée, pluie.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Je préfère un jeu assez rapide fun », puis « Les 3 sont top tu peux
// y aller ».
//
//   🐈 LE CHAT PERCHÉ — on n'est sauvé que POSÉ sur un nombre qui obéit à la
//      consigne. Le chat tourne, la consigne change, et le perchoir d'il y a
//      vingt secondes ne vaut plus rien.
//   🏃 LA RUÉE — on ramasse les nombres qui obéissent, on évite les autres.
//      Se tromper coûte.
//   🌧 LA PLUIE — les nombres tombent, on n'attrape que les bons.
//
// ── CE QU'ILS ONT EN COMMUN, ET POURQUOI ILS TIENNENT DANS UN FICHIER ─────
//
// UNE CONSIGNE QUI CHANGE, et une décision mathématique prise en une seconde
// sous pression : « 51 est-il premier ? » — et l'on court déjà. C'est le même
// moteur, le même bandeau, les mêmes équipes et les mêmes robots de démo ;
// seule la FORME du terrain diffère. Trois fichiers auraient fait diverger la
// consigne, le chrono et le score, c'est-à-dire tout ce qui compte.
//
// AUCUNE RÈGLE N'EST ÉCRITE ICI : qui obéit, ce qu'on crie à la classe, et
// comment on tire un terrain jouable viennent de `core/consignes.js`, qui est
// pur et éprouvé sans navigateur.

import {
    obeit, texteDeLaConsigne, tirerUneConsigne, tirerDesNombres, combienObeissent
} from '../core/consignes.js';
import { avancer, RAYON } from '../core/plateau.js';
import { makeRng, shortId } from '../core/ids.js';

export const COULEURS = ['Les Bleus', 'Les Orange'];

/** Les trois jeux, et leur étiquette. */
export const JEUX = {
    chat: { nom: 'Le chat perché', terrain: true },
    ruee: { nom: 'La ruée aux nombres', terrain: true },
    pluie: { nom: 'La pluie de nombres', terrain: false }
};

/** Combien de temps dure une consigne, par défaut. */
const CONSIGNE_SECONDES = 20;
/**
 * CE QUE COÛTE UNE ERREUR : on est figé, et l'équipe perd.
 *
 * DEUX SECONDES ET NON TROIS, et c'est la photo qui a tranché : à trois, près
 * de six pions sur douze étaient gris en même temps sur la ruée. Un terrain
 * à moitié figé donne l'impression d'un jeu en panne, alors que c'est le jeu
 * qui punit. Deux secondes se sentent sans éteindre l'écran.
 */
const FIGE_SECONDES = 2;
const MALUS = 5;

const echapper = (s) => String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * OUVRE UNE PARTIE DE L'UN DES TROIS JEUX.
 *
 * @param {object} o
 * @param {'chat'|'ruee'|'pluie'} [o.jeu]
 * @param {Array<string>} [o.familles] les familles de consignes autorisées
 * @param {number} [o.robots] combien de joueurs tenus par l'ordinateur
 * @param {number} [o.secondes] la durée de la partie
 * @param {boolean} [o.noms] écrire les prénoms sous les ronds
 * @param {number} [o.maxi] le plus grand nombre du terrain
 */
export function ouvrirUnJeuVif(o = {}) {
    const jeu = JEUX[o.jeu] ? o.jeu : 'chat';
    const graine = o.graine || shortId(6);
    const rng = makeRng(`vif-${graine}`);
    const combienDeRobots = Math.max(1, Math.min(40, Math.round(o.robots ?? 11)));
    const secondes = Math.max(20, Math.round(o.secondes || 150));
    const maxi = Math.max(20, Math.round(o.maxi || 99));
    const familles = o.familles && o.familles.length ? o.familles : null;
    const avecNoms = o.noms !== false;
    const joueurs = combienDeRobots + 1;

    // LE TERRAIN GRANDIT AVEC LA CLASSE, comme au plateau : trente ronds sur
    // douze cases de large ne se distinguent plus.
    const terrain = {
        largeur: Math.max(12, Math.min(18, 10 + Math.ceil(joueurs / 4))),
        hauteur: 8
    };
    // COMBIEN DE NOMBRES SUR LE TERRAIN. Assez pour qu'il y ait toujours un
    // perchoir libre quand la consigne change — sinon le chat perché devient
    // une loterie — et pas tant que le terrain se lise d'un coup d'œil.
    const combienDeNombres = jeu === 'pluie'
        // ASSEZ DE GOUTTES POUR QUE CHACUN AIT LA SIENNE. Mesuré avec la
        // moitié du nombre de joueurs : deux nombres à l'écran pour douze
        // paniers, et onze élèves qui regardent le douzième jouer.
        ? Math.max(10, Math.min(26, joueurs + 2))
        : Math.max(10, Math.min(26, Math.round(joueurs * 1.4)));

    let consigne = tirerUneConsigne(rng, { familles, maxi });
    let consigneJusqua = Date.now() + CONSIGNE_SECONDES * 1000;
    const scores = [0, 0];
    let ramasses = 0;
    let fini = false;

    /* ─────────────────────── CE QU'IL Y A SUR LE TERRAIN ──────────────── */

    // UN « JETON » EST UN NOMBRE POSÉ QUELQUE PART. Au chat perché et à la
    // ruée il ne bouge pas ; à la pluie il tombe. La même structure sert aux
    // trois — c'est ce qui permet au bandeau, au score et aux robots d'être
    // écrits une seule fois.
    let jetons = [];
    const poserLesJetons = () => {
        const valeurs = tirerDesNombres(consigne, rng,
            { combien: combienDeNombres, maxi, mini: 2, part: 0.45 });
        jetons = valeurs.map((valeur, i) => (jeu === 'pluie'
            ? { id: shortId(5), valeur,
                x: 0.6 + rng.next() * (terrain.largeur - 1.2),
                // ON LES ÉTALE HAUT AU-DESSUS DU TERRAIN : sinon elles
                // tombent toutes ensemble, puis plus rien pendant dix
                // secondes. Étalées, la pluie est continue.
                y: -rng.next() * terrain.hauteur * 2.6,
                vitesse: 0.9 + rng.next() * 0.7 }
            : { id: shortId(5), valeur,
                x: 0.8 + ((i * 2.6) % (terrain.largeur - 1.6)),
                y: 0.8 + Math.floor((i * 2.6) / (terrain.largeur - 1.6))
                    * 1.9 % (terrain.hauteur - 1.6) }));
    };
    poserLesJetons();

    /* ──────────────────────────── LES JOUEURS ─────────────────────────── */

    const pions = [];
    for (let i = 0; i < joueurs; i++) {
        pions.push({
            id: shortId(6),
            nom: i === 0 ? (o.nom || 'Toi') : `Pion ${i}`,
            equipe: i % 2,
            robot: i > 0,
            // À LA PLUIE ON NE BOUGE QU'EN LARGEUR : le panier est sur une
            // ligne. Les ronds des deux autres jeux vont où ils veulent.
            x: jeu === 'pluie'
                ? ((i + 0.5) / joueurs) * terrain.largeur
                : 0.8 + (i % 2 ? terrain.largeur - 1.6 : 0) + 0,
            y: jeu === 'pluie' ? terrain.hauteur - 0.6 : 0.8 + (i % terrain.hauteur) * 0.9,
            figeJusqua: 0, vise: null, el: null
        });
    }
    const moi = pions[0];
    // LE CHAT. Il n'est d'aucune équipe : c'est l'adversaire commun, et c'est
    // ce qui fait que les deux équipes râlent contre LUI et non l'une contre
    // l'autre — une classe qui crie ensemble est le but de ce jeu-là.
    const chat = jeu === 'chat'
        ? { x: terrain.largeur / 2, y: terrain.hauteur / 2, el: null }
        : null;

    /* ─────────────────────────────── L'ÉCRAN ──────────────────────────── */

    const voile = document.createElement('div');
    // DANS UN CADRE, OU PAR-DESSUS TOUT L'ÉCRAN : même décision qu'au
    // plateau, et pour la même raison — voir le commentaire de `plateauUI.js`.
    voile.className = `jv-voile${o.hote ? ' jv-voile--cadre' : ''}`;
    voile.innerHTML = `
        <div class="jv-carte">
            <div class="jv-haut">
                <div class="jv-eq jv-eq--0"><span>${echapper(COULEURS[0])}</span>
                    <b data-score0>0</b></div>
                <!-- LA CONSIGNE EST LE PLUS GROS ÉLÉMENT DE L'ÉCRAN, et de
                     loin : c'est elle qu'on lit du fond de la classe, en
                     courant, en une demi-seconde. Le chrono à côté dit quand
                     elle va changer — c'est ce qui crée la tension. -->
                <div class="jv-consigne">
                    <b data-consigne></b>
                    <small><span data-avant>0</span> s</small>
                </div>
                <div class="jv-eq jv-eq--1"><span>${echapper(COULEURS[1])}</span>
                    <b data-score1>0</b></div>
                <div class="jv-temps"><b data-reste>${secondes}</b> s</div>
                <button type="button" class="jv-sortir" data-sortir
                    aria-label="Fermer le jeu">×</button>
            </div>
            <div class="jv-terrain" data-terrain>
                <div class="jv-jetons" data-jetons></div>
                <div class="jv-pions" data-pions></div>
            </div>
            <div class="jv-dit" data-dit></div>
            <div class="jv-bas">
                <div class="jv-manette" data-manette>
                    ${jeu === 'pluie' ? '' :
                      '<button type="button" data-dir="haut" aria-label="Monter">▲</button>'}
                    <div>
                        <button type="button" data-dir="gauche" aria-label="Aller à gauche">◀</button>
                        ${jeu === 'pluie' ? '' :
                          '<button type="button" data-dir="bas" aria-label="Descendre">▼</button>'}
                        <button type="button" data-dir="droite" aria-label="Aller à droite">▶</button>
                    </div>
                </div>
            </div>
        </div>`;
    (o.hote || document.body).appendChild(voile);
    const el = (s) => voile.querySelector(s);
    const zoneTerrain = el('[data-terrain]');
    const zoneJetons = el('[data-jetons]');
    const zonePions = el('[data-pions]');
    zoneTerrain.style.setProperty('--jv-colonnes', String(terrain.largeur));
    zoneTerrain.style.setProperty('--jv-lignes', String(terrain.hauteur));

    for (const p of pions) {
        const d = document.createElement('div');
        d.className = `jv-pion jv-pion--${p.equipe}${p === moi ? ' jv-pion--moi' : ''}`
            + (jeu === 'pluie' ? ' jv-pion--panier' : '');
        d.title = p.nom;
        if (avecNoms) d.innerHTML = `<span class="jv-nom">${echapper(p.nom)}</span>`;
        zonePions.appendChild(d);
        p.el = d;
    }
    if (chat) {
        const d = document.createElement('div');
        d.className = 'jv-chat';
        d.textContent = '🐈';
        zonePions.appendChild(d);
        chat.el = d;
    }

    /* ───────────────────────────── LE DESSIN ──────────────────────────── */

    const enPourcent = (p) => ({
        g: `${(p.x / terrain.largeur) * 100}%`,
        h: `${(p.y / terrain.hauteur) * 100}%`
    });

    let jetonsEcrits = '';
    const peindreLesJetons = () => {
        // ON NE RECRÉE LES JETONS QUE QUAND LA LISTE CHANGE. À la pluie ils
        // tombent soixante fois par seconde : recréer leurs éléments à chaque
        // image ferait clignoter tout l'écran.
        const signature = jetons.map(j => j.id).join(',');
        if (signature !== jetonsEcrits) {
            jetonsEcrits = signature;
            zoneJetons.innerHTML = jetons.map(j =>
                `<div class="jv-jeton" data-jeton="${j.id}">${j.valeur}</div>`).join('');
            for (const j of jetons) j.el = zoneJetons.querySelector(`[data-jeton="${j.id}"]`);
        }
        for (const j of jetons) {
            if (!j.el) continue;
            const q = enPourcent(j);
            j.el.style.left = q.g;
            j.el.style.top = q.h;
            // UN JETON QUI OBÉIT NE SE SIGNALE PAS. L'élève doit DÉCIDER —
            // colorier les bons nombres rendrait le jeu muet, et c'est
            // exactement ce qu'on vient d'éviter en mettant les maths dans le
            // geste. On ne marque que ce qui est déjà joué.
            j.el.classList.toggle('jv-jeton--perche', !!j.perche);
        }
    };

    const peindreLesPions = () => {
        const maintenant = Date.now();
        for (const p of pions) {
            const q = enPourcent(p);
            p.el.style.left = q.g;
            p.el.style.top = q.h;
            p.el.classList.toggle('jv-pion--fige', p.figeJusqua > maintenant);
            p.el.classList.toggle('jv-pion--sauf', !!p.sauf);
            // PERCHÉ VEUT DIRE ASSIS AU-DESSUS DU NOMBRE, et pas dessus.
            //
            // VU SUR LA PHOTO : le rond couvrait entièrement le nombre sur
            // lequel il se tenait — or c'est exactement ce que la classe doit
            // lire pour savoir s'il a eu raison. Le décalage le fait tenir sur
            // le nombre comme sur une marche : les deux se voient, et « être
            // perché » se comprend sans qu'on l'explique.
            p.el.classList.toggle('jv-pion--dessus', !!p.dessus);
        }
        if (chat) {
            const q = enPourcent(chat);
            chat.el.style.left = q.g;
            chat.el.style.top = q.h;
        }
        el('[data-score0]').textContent = String(scores[0]);
        el('[data-score1]').textContent = String(scores[1]);
        el('[data-consigne]').textContent = texteDeLaConsigne(consigne);
        el('[data-avant]').textContent =
            String(Math.max(0, Math.ceil((consigneJusqua - maintenant) / 1000)));
    };

    /** La phrase du bas : elle dit ce qu'il faut faire, et ce qui vient d'arriver. */
    let ditJusqua = 0;
    const dire = (texte, classe = '') => {
        el('[data-dit]').className = `jv-dit ${classe}`;
        el('[data-dit]').innerHTML = texte;
        ditJusqua = Date.now() + 1500;
    };
    const direLaConsigne = () => {
        if (Date.now() < ditJusqua) return;
        el('[data-dit]').className = 'jv-dit';
        el('[data-dit]').innerHTML = {
            chat: 'Perche-toi sur un nombre qui obéit — le chat arrive.',
            ruee: 'Ramasse les bons nombres. Un mauvais te coûte cher.',
            pluie: 'Attrape les bons, laisse filer les autres.'
        }[jeu];
    };

    /* ─────────────────────── CE QUE COÛTE UNE ERREUR ──────────────────── */

    const punir = (p, pourquoi) => {
        p.figeJusqua = Date.now() + FIGE_SECONDES * 1000;
        scores[p.equipe] = Math.max(0, scores[p.equipe] - MALUS);
        if (p === moi) dire(`${echapper(pourquoi)} — figé ${FIGE_SECONDES} s, −${MALUS}`, 'jv-dit--ko');
    };
    const recompenser = (p, combien, pourquoi) => {
        scores[p.equipe] += combien;
        ramasses++;
        if (p === moi) dire(`${echapper(pourquoi)} — +${combien}`, 'jv-dit--ok');
    };

    /* ──────────────────────── LA CONSIGNE QUI CHANGE ──────────────────── */

    const changerDeConsigne = () => {
        consigne = tirerUneConsigne(rng, { familles, maxi, precedente: consigne });
        consigneJusqua = Date.now() + CONSIGNE_SECONDES * 1000;
        // AU CHAT PERCHÉ ET À LA RUÉE, LE TERRAIN NE BOUGE PAS QUAND LA
        // CONSIGNE CHANGE — et c'est tout l'intérêt : les mêmes nombres
        // changent de camp, et trente élèves doivent repartir. Remettre des
        // nombres neufs volerait ce moment-là.
        //
        // ON NE LES REMET QUE S'IL N'Y A PLUS RIEN À FAIRE : un terrain sans
        // un seul bon nombre ferait courir la classe pour rien.
        if (combienObeissent(consigne, jetons.map(j => j.valeur)) < 2) poserLesJetons();
        el('[data-consigne]').classList.remove('jv-neuve');
        void el('[data-consigne]').offsetWidth;
        el('[data-consigne]').classList.add('jv-neuve');
        dire(`NOUVELLE CONSIGNE : ${echapper(texteDeLaConsigne(consigne))}`, 'jv-dit--neuve');
    };

    /* ──────────────────────────── SE DÉPLACER ─────────────────────────── */

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
            if (b.setPointerCapture) b.setPointerCapture(e.pointerId);
        });
        for (const fin of ['pointerup', 'pointercancel', 'pointerleave']) {
            b.addEventListener(fin, () => touches.delete(d));
        }
    });
    const enUnites = (e) => {
        const r = zoneTerrain.getBoundingClientRect();
        return {
            x: ((e.clientX - r.left) / r.width) * terrain.largeur,
            y: ((e.clientY - r.top) / r.height) * terrain.hauteur
        };
    };
    zoneTerrain.addEventListener('pointerdown', (e) => {
        if (fini) return;
        if (zoneTerrain.setPointerCapture) zoneTerrain.setPointerCapture(e.pointerId);
        versLeDoigt = enUnites(e);
    });
    zoneTerrain.addEventListener('pointermove', (e) => {
        if (versLeDoigt) versLeDoigt = enUnites(e);
    });
    for (const fin of ['pointerup', 'pointercancel']) {
        zoneTerrain.addEventListener(fin, () => { versLeDoigt = null; });
    }
    const voulu = () => {
        let dx = 0;
        let dy = 0;
        if (touches.has('gauche')) dx -= 1;
        if (touches.has('droite')) dx += 1;
        if (jeu !== 'pluie') {
            if (touches.has('haut')) dy -= 1;
            if (touches.has('bas')) dy += 1;
        }
        if (dx || dy) return { dx, dy };
        if (versLeDoigt) {
            const ax = versLeDoigt.x - moi.x;
            const ay = jeu === 'pluie' ? 0 : versLeDoigt.y - moi.y;
            if (Math.hypot(ax, ay) > RAYON * 0.6) return { dx: ax, dy: ay };
        }
        return null;
    };

    /* ───────────────────────────── LES RÈGLES ─────────────────────────── */

    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    /**
     * À QUELLE DISTANCE ON « TOUCHE » UN NOMBRE — et ce n'est pas la même
     * selon le jeu, parce que l'erreur n'y coûte pas la même chose.
     *
     * AU CHAT PERCHÉ on est GÉNÉREUX : rater son perchoir d'un cheveu alors
     * que le chat arrive serait rageant, et se percher ne punit personne.
     *
     * À LA RUÉE ON EST SERRÉ, et c'est une correction mesurée : avec le même
     * rayon qu'au perchoir, les pions ramassaient de mauvais nombres EN LES
     * FRÔLANT sur le chemin d'un bon. Sept sur douze figés sur la photo. Dans
     * ce jeu-là, passer à côté d'un nombre ne doit pas valoir le prendre —
     * sinon traverser le terrain devient un champ de mines, et l'élève est
     * puni pour s'être déplacé plutôt que pour avoir mal calculé.
     */
    const SUR = { chat: 0.62, ruee: 0.42, pluie: 0.55 }[jeu];

    const regleDuChat = (dt) => {
        // LE CHAT VA VERS LE JOUEUR NON PERCHÉ LE PLUS PROCHE. Il ne court pas
        // plus vite qu'un élève : un chat imbattable ferait un jeu où l'on ne
        // décide rien, on fuit.
        const proies = pions.filter(p => !p.sauf && p.figeJusqua <= Date.now());
        const cible = proies.sort((a, b) => distance(chat, a) - distance(chat, b))[0];
        if (cible) {
            const v = avancer(terrain, chat.x, chat.y,
                cible.x - chat.x, cible.y - chat.y, dt, 2.6);
            chat.x = v.x; chat.y = v.y;
            if (distance(chat, cible) < 0.5) {
                cible.figeJusqua = Date.now() + 6000;
                if (cible === moi) dire('Pris par le chat ! Un camarade peut te délivrer.', 'jv-dit--ko');
            }
        }
        // ON EST SAUVÉ POSÉ SUR UN NOMBRE QUI OBÉIT — et sur rien d'autre.
        for (const p of pions) {
            const dessous = jetons.find(j => distance(j, p) < SUR);
            p.sauf = !!(dessous && obeit(consigne, dessous.valeur));
            p.dessus = !!dessous;
            if (dessous) dessous.perche = true;
            // CHAQUE SECONDE PERCHÉ RAPPORTE. C'est ce qui fait qu'on cherche
            // un bon perchoir au lieu de fuir en rond : fuir ne rapporte rien.
            if (p.sauf && p.figeJusqua <= Date.now()) {
                p.credit = (p.credit || 0) + dt;
                while (p.credit >= 1) { p.credit -= 1; scores[p.equipe] += 1; ramasses++; }
            }
        }
        for (const j of jetons) {
            j.perche = pions.some(p => distance(j, p) < SUR);
        }
        // ET L'ON DÉLIVRE UN CAMARADE EN LE TOUCHANT. Sans cela, un élève pris
        // en début de partie regarderait les autres jouer — le pire écran
        // qu'on puisse donner à un enfant de sixième.
        for (const p of pions) {
            if (p.figeJusqua <= Date.now()) continue;
            const sauveur = pions.find(q => q !== p && q.figeJusqua <= Date.now()
                && distance(q, p) < 0.6);
            if (sauveur) {
                p.figeJusqua = 0;
                if (p === moi) dire('Délivré !', 'jv-dit--ok');
                else if (sauveur === moi) dire(`Tu délivres ${echapper(p.nom)} !`, 'jv-dit--ok');
            }
        }
    };

    const regleDeLaRuee = () => {
        for (const p of pions) {
            if (p.figeJusqua > Date.now()) continue;
            const dessous = jetons.find(j => distance(j, p) < SUR);
            if (!dessous) continue;
            if (obeit(consigne, dessous.valeur)) {
                recompenser(p, 10, `${dessous.valeur} obéit`);
            } else {
                punir(p, `${dessous.valeur} n'obéit pas`);
            }
            jetons = jetons.filter(j => j !== dessous);
            // ON EN REPOSE UN AILLEURS : un terrain qui se vide fait courir la
            // classe dans le vide jusqu'à la fin du chrono.
            const valeur = tirerDesNombres(consigne, rng,
                { combien: 1, maxi, mini: 2, part: rng.bool() ? 1 : 0 })[0];
            if (valeur !== undefined) {
                jetons.push({ id: shortId(5), valeur,
                    x: 0.8 + rng.next() * (terrain.largeur - 1.6),
                    y: 0.8 + rng.next() * (terrain.hauteur - 1.6) });
            }
        }
    };

    const regleDeLaPluie = (dt) => {
        for (const j of jetons) j.y += j.vitesse * dt * 2.2;
        for (const p of pions) {
            if (p.figeJusqua > Date.now()) continue;
            const pris = jetons.find(j =>
                Math.abs(j.x - p.x) < SUR && Math.abs(j.y - p.y) < SUR);
            if (!pris) continue;
            if (obeit(consigne, pris.valeur)) recompenser(p, 10, `${pris.valeur} obéit`);
            else punir(p, `${pris.valeur} n'obéit pas`);
            pris.y = terrain.hauteur + 99;
        }
        // CE QUI EST TOMBÉ REMONTE EN HAUT, avec une valeur neuve : la pluie ne
        // s'arrête pas, et le terrain ne se vide jamais.
        for (const j of jetons) {
            if (j.y <= terrain.hauteur + 1) continue;
            const valeur = tirerDesNombres(consigne, rng,
                { combien: 1, maxi, mini: 2, part: rng.bool() ? 1 : 0 })[0];
            if (valeur === undefined) continue;
            j.valeur = valeur;
            j.id = shortId(5);
            j.x = 0.6 + rng.next() * (terrain.largeur - 1.2);
            j.y = -0.6 - rng.next() * 2;
        }
    };

    /* ───────────────────────── LES ROBOTS DE LA DÉMO ──────────────────── */

    // ILS NE TRICHENT PAS : ils lisent la consigne par `obeit`, comme l'élève,
    // et ILS SE TROMPENT — une fois sur six ils visent un mauvais nombre.
    // Sans cela, la démo montrerait un jeu où personne n'est jamais puni, et
    // Rémy ne verrait pas ce qu'il va lancer à sa classe. C'est une erreur
    // SIMULÉE, écrite ici pour que personne ne la prenne pour une mesure.
    const coupDuRobot = (p, dt) => {
        const bons = jetons.filter(j => obeit(consigne, j.valeur));
        // ── QUAND IL N'Y A AUCUN BON NOMBRE, ON N'EN PREND PAS UN MAUVAIS ──
        //
        // MESURÉ À LA PLUIE : la moitié des paniers étaient figés. Faute de
        // bonne goutte, les robots couraient après une mauvaise et se
        // faisaient punir — ce qu'AUCUN élève ne ferait. Un joueur sans cible
        // ATTEND, ou s'écarte de ce qui tombe. C'est aussi ce qu'on veut
        // montrer à la classe : ne rien prendre est un coup valable.
        if (!bons.length && !p.erreur) {
            if (jeu !== 'pluie') return;
            const menace = jetons
                .filter(j => j.y > -1 && Math.abs(j.x - p.x) < 1.6)
                .sort((a, b) => b.y - a.y)[0];
            if (!menace) return;
            const q = avancer(terrain, p.x, p.y,
                p.x <= menace.x ? -1 : 1, 0, dt, 2.9);
            p.x = q.x;
            return;
        }
        // CHACUN SA GOUTTE : un robot ne vise pas ce qu'un autre vise déjà,
        // sinon les douze paniers se massent sous le même nombre et la classe
        // voit un troupeau au lieu d'un jeu.
        const pris = new Set(pions.filter(q => q !== p && q.robot).map(q => q.vise));
        let vise = jetons.find(j => j.id === p.vise);
        if (!vise || (jeu !== 'pluie' && distance(vise, p) < 0.2)) {
            p.erreur = rng.next() < 0.17;
            const liste = p.erreur ? jetons : bons;
            const libres = liste.filter(j => !pris.has(j.id));
            vise = (libres.length ? libres : liste)
                .sort((a, b) => distance(a, p) - distance(b, p))[0];
        }
        if (!vise) return;
        p.vise = vise.id;
        // À LA PLUIE on ne se range qu'en largeur, et SOUS le jeton : viser son
        // centre ferait courir le panier après quelque chose qui tombe.
        const dx = vise.x - p.x;
        const dy = jeu === 'pluie' ? 0 : vise.y - p.y;
        if (!dx && !dy) return;
        const v = avancer(terrain, p.x, p.y, dx, dy, dt, 2.9);
        p.x = v.x;
        if (jeu !== 'pluie') p.y = v.y;
    };

    /* ────────────────────────────── LA BOUCLE ─────────────────────────── */

    let dernier = 0;
    let image = 0;
    const pas = (t) => {
        if (fini) return;
        image = requestAnimationFrame(pas);
        const maintenant = t || Date.now();
        const dt = dernier ? Math.min(0.1, (maintenant - dernier) / 1000) : 0;
        dernier = maintenant;
        if (!dt) return;

        if (Date.now() > consigneJusqua) changerDeConsigne();

        if (moi.figeJusqua <= Date.now()) {
            const v = voulu();
            if (v) {
                const q = avancer(terrain, moi.x, moi.y, v.dx, v.dy, dt, 3.6);
                moi.x = q.x;
                if (jeu !== 'pluie') moi.y = q.y;
            }
        }
        for (const p of pions) {
            if (!p.robot || p.figeJusqua > Date.now()) continue;
            coupDuRobot(p, dt);
        }
        if (jeu === 'chat') regleDuChat(dt);
        else if (jeu === 'ruee') regleDeLaRuee();
        else regleDeLaPluie(dt);

        peindreLesJetons();
        peindreLesPions();
        direLaConsigne();
    };

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
        el('[data-dit]').className = 'jv-dit jv-dit--fin';
        el('[data-dit]').innerHTML = (gagnant < 0
            ? '<b>Égalité !</b>'
            : `<b>${echapper(COULEURS[gagnant])} gagnent</b>`)
            + ` — ${scores[0]} à ${scores[1]}`;
        if (o.surLaFin) o.surLaFin({ scores, ramasses });
    }

    peindreLesJetons();
    peindreLesPions();
    direLaConsigne();
    image = requestAnimationFrame(pas);

    return {
        element: voile,
        etat: () => ({
            jeu, scores, ramasses, fini,
            consigne: texteDeLaConsigne(consigne),
            moi: { x: moi.x, y: moi.y, sauf: !!moi.sauf, fige: moi.figeJusqua > Date.now() },
            jetons: jetons.map(j => ({ valeur: j.valeur, obeit: obeit(consigne, j.valeur) })),
            chat: chat ? { x: chat.x, y: chat.y } : null
        }),
        /** Pousse le joueur — pour la sonde, et pour tout appel programmé. */
        bouger(direction, combien = 0.4) {
            if (fini || moi.figeJusqua > Date.now()) return;
            const d = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] }[direction];
            if (!d) return;
            const q = avancer(terrain, moi.x, moi.y, d[0], d[1], 1, combien);
            moi.x = q.x;
            if (jeu !== 'pluie') moi.y = q.y;
        },
        /** Force le changement de consigne — la sonde n'attend pas vingt secondes. */
        consigneSuivante: changerDeConsigne,
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

/** Branche la croix de sortie, en rendant la main à celui qui a ouvert. */
export function brancherLaSortie(partie, quoiFaire) {
    const b = partie.element.querySelector('[data-sortir]');
    if (b) b.onclick = () => { partie.fermer(); if (quoiFaire) quoiFaire(); };
}
