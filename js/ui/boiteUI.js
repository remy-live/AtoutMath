// L'ÉCRAN D'UNE BOÎTE À JEUX : un menu, et rien qui ressemble à un devoir.
//
// Rémy : « j'envoie un lien et les personnes peuvent jouer au sudoku ou au ken
// ken », et, sur ce qui en reste : « personne ne se connecte mais on peut le
// garder en local storage et la personne l'a pour elle, je n'interviens pas ».
//
// CE QU'ON NE MET PAS SUR CET ÉCRAN, ET C'EST LA MOITIÉ DU TRAVAIL : pas de
// carte de séance, pas d'étapes numérotées, pas de progression, pas de seuil à
// atteindre, pas de bilan à la fin, pas de bouton « rendre ». Celui qui ouvre ce
// lien n'est l'élève de personne. Il voit des jeux, il en prend un, il le
// repose. La règle pure est dans `core/boite.js` ; ici, l'écran.
//
// LE MEILLEUR SCORE NE SORT PAS DE L'APPAREIL. Il vit dans `localStorage`, sous
// une clef dérivée du contenu du lien : le même lien, demain, sur le même
// téléphone, retrouve les mêmes parties — et aucun autre appareil, aucun
// serveur, et surtout pas le professeur, n'en sait rien.
//
// ET UNE PARTIE DE BOÎTE N'ENTRE DANS AUCUN CARNET. Le meneur tourne en
// `sansTrace` : si la boîte est ouverte dans le navigateur d'un élève connecté,
// ses parties ne se mêlent pas à son travail de classe. C'est ce que « je
// n'interviens pas » veut dire, et il fallait l'écrire quelque part.

import { getExerciseById, paramSchemaOf } from '../data/catalog.js';
import { makePath, makeStep, questionsConseilleesDe } from '../core/path.js';
import {
    estUneBoite, politiqueDeBoite, reglagesDuJoueur, clefDeLaBoite, memoireVide,
    rangerUnePartie, motDeLaCarte, motCourt, LONGUEURS, LONGUEUR_DEFAUT,
    questionsSelonLongueur, familleDe, monogramme
} from '../core/boite.js';

const ID = 'boite-layer';
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let boiteCourante = null;

// --- LA MÉMOIRE, AVEC LA CEINTURE ET LES BRETELLES ---------------------------
//
// `localStorage` n'existe pas partout : navigation privée, site data effacé,
// stockage refusé. Une lecture qui jette ne doit pas empêcher de JOUER — au
// pire on perd les meilleurs scores, ce qui est très loin d'être grave.

function lireMemoire(path) {
    try {
        const brut = localStorage.getItem(clefDeLaBoite(path));
        const lu = brut ? JSON.parse(brut) : null;
        return lu && lu.jeux ? lu : memoireVide();
    } catch (e) {
        return memoireVide();
    }
}

function ecrireMemoire(path, memoire) {
    try {
        localStorage.setItem(clefDeLaBoite(path), JSON.stringify(memoire));
    } catch (e) {
        /* Pas de place, ou pas le droit : la boîte se joue quand même. */
    }
}

/**
 * LES RÉGLAGES EN COURS D'UN JEU : ceux du joueur, sinon ceux du professeur.
 *
 * Le professeur a réglé l'exercice en fabriquant la boîte (`step.overrides`) ;
 * le joueur n'en touche qu'un ou deux. Ce que le joueur a choisi la dernière
 * fois se retrouve dans la mémoire, et c'est le plus utile de ce qu'on garde :
 * on ne redemande pas « quelle taille ? » à chaque ouverture.
 */
function reglagesEnCours(step, memoire) {
    const garde = (memoire.jeux[step.exerciseId] || {}).reglages || {};
    return { ...step.overrides, ...garde };
}

function longueurEnCours(step, memoire) {
    const garde = (memoire.jeux[step.exerciseId] || {}).reglages || {};
    return garde.__longueur || LONGUEUR_DEFAUT;
}

// --- L'ÉCRAN ----------------------------------------------------------------

// --- LA TUILE D'UN JEU --------------------------------------------------------
//
// PREMIÈRE VERSION, ET CE QU'ELLE A COÛTÉ. Chaque carte portait ses réglages À
// PLAT : trois rangées de boutons, jusqu'à dix boutons par jeu. Rémy, devant une
// boîte de 51 exercices : « c'est pas très beau, ca fait veilliot, lourd […]
// Personne n'aime voir quelque chose comme cela. » Il avait raison, et
// l'arithmétique le dit : 51 jeux x 10 boutons, ce sont CINQ CENTS boutons gris
// sur un écran dont le seul travail est de donner envie d'en choisir UN.
//
// CE QUI CHANGE : la tuile ne montre plus que ce qu'on regarde pour choisir —
// une couverture colorée, le nom du jeu, ses réglages en UNE LIGNE de texte, et
// le score qu'on a déjà fait. Les réglages eux-mêmes passent derrière une ROUE,
// dans une feuille qui s'ouvre par-dessus. La tuile entière est le bouton
// « jouer » : on ne vise plus un rectangle au fond d'une carte.
//
// LA COULEUR VIENT DU DOMAINE, et c'est une information, pas une décoration :
// les jeux de nombres se ressemblent, ceux de géométrie aussi, et l'oeil
// retrouve sa famille sans lire. Les cinq domaines sont ceux des programmes de
// collège (voir `js/data/tags.js`).
/** Le champ de la longueur, qui n'appartient à aucun exercice : il est à la boîte. */
function champLongueur() {
    return {
        id: '__longueur', label: 'La partie',
        options: LONGUEURS.map(l => ({ value: l.id, label: l.mot }))
    };
}

/** Les champs qu'on propose pour ce jeu : les siens, puis la longueur. */
function champsDe(exo) {
    return [...reglagesDuJoueur(paramSchemaOf(exo)), champLongueur()];
}

/**
 * LES RÉGLAGES EN UNE LIGNE : « Facile · 6 × 6 · Moyenne ».
 *
 * C'est ce qui remplace les dix boutons. On lit son choix d'un coup d'oeil, et
 * l'on n'ouvre la roue que si l'on veut en changer — ce qui, sur une boîte
 * qu'on rouvre tous les jours, n'arrive presque jamais.
 */
function resumeDesReglages(exo, valeurs, longueur) {
    return champsDe(exo).map(c => {
        const v = c.id === '__longueur' ? longueur : (valeurs[c.id] ?? c.default);
        const o = c.options.find(x => String(x.value) === String(v));
        return o ? motCourt(String(o.label ?? o.value)) : '';
    }).filter(Boolean).join(' · ');
}

// Une roue dessinée, et non le caractère ⚙ : l'émoji change de forme et de
// couleur d'un appareil à l'autre, et sur la moitié d'entre eux il est jaune.
const ROUE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" '
    + 'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
    + 'stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/>'
    + '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06'
    + 'a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09'
    + 'A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83'
    + 'l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09'
    + 'A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83'
    + 'l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09'
    + 'a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83'
    + 'l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09'
    + 'a1.65 1.65 0 0 0-1.51 1z"/></svg>';

function tuileHtml(step, memoire) {
    const exo = getExerciseById(step.exerciseId);
    if (!exo) return '';
    const valeurs = reglagesEnCours(step, memoire);
    const longueur = longueurEnCours(step, memoire);
    const resume = resumeDesReglages(exo, valeurs, longueur);
    const score = motDeLaCarte(memoire.jeux[step.exerciseId]);
    const id = esc(step.exerciseId);
    return `
      <article class="bj-jeu" data-exo="${id}" data-dom="${familleDe(exo)}">
        <button type="button" class="bj-jeu-ouvrir" data-jouer="${id}">
          <span class="bj-couv" aria-hidden="true"><span class="bj-mono">${esc(monogramme(exo.title))}</span></span>
          <span class="bj-jeu-corps">
            <span class="bj-jeu-titre">${esc(exo.title)}</span>
            ${resume ? `<span class="bj-jeu-reglages">${esc(resume)}</span>` : ''}
            ${score ? `<span class="bj-jeu-score">${esc(score)}</span>` : ''}
          </span>
        </button>
        <button type="button" class="bj-roue" data-roue="${id}"
                title="Réglages de ${esc(exo.title)}"
                aria-label="Réglages de ${esc(exo.title)}">${ROUE}</button>
      </article>`;
}

// --- LA FEUILLE DES RÉGLAGES --------------------------------------------------
//
// Elle s'ouvre PAR-DESSUS la grille, et elle ne contient qu'un jeu : c'est là
// que les boutons ont leur place, parce qu'on y est venu exprès.

function rangeeHtml(champ, valeur) {
    const choix = champ.options.map(o => {
        const v = o.value;
        const actif = String(v) === String(valeur);
        // L'ÉTIQUETTE ENTIÈRE RESTE EN INFOBULLE : le mot suffit pour choisir,
        // la phrase reste disponible pour qui se demande ce que « Tutoriel »
        // veut dire.
        const entier = String(o.label ?? v);
        return `<button type="button" class="bj-choix${actif ? ' bj-choix--actif' : ''}"
                        data-champ="${esc(champ.id)}" data-valeur="${esc(v)}"
                        title="${esc(entier)}"
                        aria-pressed="${actif}">${esc(motCourt(entier))}</button>`;
    }).join('');
    return `<div class="bj-reglage">
              <span class="bj-reglage-mot">${esc(motCourt(champ.label || champ.id))}</span>
              <span class="bj-choix-rang">${choix}</span>
            </div>`;
}

let roueOuverte = null;

function fermerLaRoue() {
    const f = document.querySelector('.bj-feuille');
    if (f) f.remove();
    roueOuverte = null;
}

function ouvrirLaRoue(exoId) {
    const path = boiteCourante;
    if (!path) return;
    const step = path.steps.find(x => x.exerciseId === exoId);
    const exo = getExerciseById(exoId);
    if (!step || !exo) return;
    fermerLaRoue();
    const memoire = lireMemoire(path);
    const valeurs = reglagesEnCours(step, memoire);
    const longueur = longueurEnCours(step, memoire);
    const f = document.createElement('div');
    f.className = 'bj-feuille';
    f.setAttribute('role', 'dialog');
    f.setAttribute('aria-modal', 'true');
    f.setAttribute('aria-label', 'Réglages de ' + exo.title);
    f.innerHTML = `
      <div class="bj-feuille-panneau" data-exo="${esc(exoId)}" data-dom="${familleDe(exo)}">
        <h2 class="bj-feuille-titre">${esc(exo.title)}</h2>
        <div class="bj-reglages">
          ${champsDe(exo).map(c => rangeeHtml(c,
        c.id === '__longueur' ? longueur : (valeurs[c.id] ?? c.default))).join('')}
        </div>
        <div class="bj-feuille-pied">
          <button type="button" class="bj-feuille-fermer">Fermer</button>
          <button type="button" class="bj-jouer" data-jouer="${esc(exoId)}">Jouer</button>
        </div>
      </div>`;
    document.getElementById(ID).appendChild(f);
    roueOuverte = exoId;
    const premier = f.querySelector('.bj-choix, .bj-jouer');
    if (premier) premier.focus();
}

function dessiner(path) {
    const memoire = lireMemoire(path);
    let el = document.getElementById(ID);
    if (!el) {
        el = document.createElement('div');
        el.id = ID;
        el.className = 'bj-ecran';
        document.body.appendChild(el);
    }
    el.innerHTML = `
      <div class="bj-boite">
        <h1 class="bj-titre">${esc(path.name || 'Mes jeux')}</h1>
        <p class="bj-sous">Choisis un jeu. Rien n'est noté, rien n'est envoyé :
           ce que tu joues reste sur cet appareil.</p>
        <div class="bj-grille">
          ${path.steps.map(s => tuileHtml(s, memoire)).join('')}
        </div>
        <!-- UNE PORTE DE SORTIE, DISCRÈTE MAIS PRÉSENTE.
             La boîte occupe tout l'écran et cache le reste du logiciel : c'est
             voulu, celui qui reçoit le lien n'a rien à y faire. Mais sans ce
             lien-ci, quiconque ouvre une boîte — Rémy le premier, en essayant
             les siennes — est enfermé dedans et doit retoucher l'adresse à la
             main pour en sortir. -->
        <p class="bj-pied"><a class="bj-sortie" href="index.html">AtoutMath</a></p>
      </div>`;
    el.hidden = false;
}

/**
 * OUVRIR UNE BOÎTE. C'est le point d'entrée du module.
 *
 * @param {Object} path un parcours marqué `boite` (voir `core/boite.js`)
 */
export function ouvrirLaBoite(path) {
    if (!estUneBoite(path)) return false;
    boiteCourante = path;
    // LA BOÎTE EST TOUT L'ÉCRAN : ni barre du haut, ni portail, ni catalogue
    // derrière. Celui qui ouvre le lien n'a rien à faire dans le reste de
    // l'application, et la classe posée ici permet à la feuille de style de
    // cacher ce qui n'est pas la boîte d'un seul geste.
    document.body.classList.add('en-boite');
    dessiner(path);
    poserLeNom(path.name);
    return true;
}

/**
 * LE NOM DE LA BOÎTE DEVIENT CELUI DE L'ONGLET, ET CELUI DE L'APPLICATION.
 *
 * Rémy voulait « une sorte d'appli ». Une boîte ajoutée à l'écran d'accueil
 * doit porter SON nom — « Les jeux de la 6e B » — et non « AtoutMath » : c'est
 * ce qui fait la différence entre un raccourci vers un logiciel et une petite
 * application qu'on lui a donnée.
 *
 * LE MANIFESTE SE FABRIQUE DONC À LA VOLÉE, dans une adresse `blob:` : celui du
 * dépôt est un fichier unique et figé, il ne peut pas porter douze noms. Le
 * `start_url` est le lien de la boîte lui-même, de sorte que l'icône rouvre la
 * boîte et non l'accueil du logiciel.
 *
 * SUR iPHONE, le manifeste n'est pas lu pour « Sur l'écran d'accueil » : c'est
 * `apple-mobile-web-app-title` qui donne le nom. On pose les deux.
 */
function poserLeNom(nom) {
    const propre = String(nom || 'Mes jeux').slice(0, 60);
    document.title = propre;
    let meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'apple-mobile-web-app-title';
        document.head.appendChild(meta);
    }
    meta.content = propre;
    try {
        // TOUTES LES ADRESSES SONT ABSOLUES, ET C'EST OBLIGATOIRE ICI : un
        // manifeste servi depuis une adresse `blob:` résout ses adresses
        // relatives CONTRE LE BLOB, qui n'a pas de dossier. « icones/icon-192 »
        // y devient introuvable, et l'installation se fait sans icône — sans
        // message, évidemment.
        const abs = (chemin) => new URL(chemin, location.href).href;
        const manifeste = {
            name: propre,
            short_name: propre.slice(0, 24),
            lang: 'fr',
            start_url: location.href,
            scope: abs('./'),
            display: 'standalone',
            background_color: '#f1f5f9',
            theme_color: '#6366f1',
            icons: [
                { src: abs('icones/icon-192.png'), sizes: '192x192', type: 'image/png' },
                { src: abs('icones/icon-512.png'), sizes: '512x512', type: 'image/png' },
                { src: abs('icones/icon-maskable-512.png'), sizes: '512x512',
                    type: 'image/png', purpose: 'maskable' }
            ]
        };
        const url = URL.createObjectURL(new Blob([JSON.stringify(manifeste)],
            { type: 'application/manifest+json' }));
        let lien = document.querySelector('link[rel="manifest"]');
        if (!lien) {
            lien = document.createElement('link');
            lien.rel = 'manifest';
            document.head.appendChild(lien);
        }
        lien.href = url;
    } catch (e) {
        /* Sans manifeste dynamique, la boîte s'installe sous le nom du
           logiciel : c'est moins joli, ce n'est pas cassé. */
    }
}

// --- JOUER, PUIS REVENIR ------------------------------------------------------

// LA PARTIE SE TERMINE PAR DEUX CHEMINS, ET IL FAUT LES DEUX.
//
// 1. On va au bout : le meneur appelle `exit()`, donc `onExit`.
// 2. ON FERME LA CROIX ROUGE : et là, rien. Mesuré dans le navigateur —
//    `#btn-close-game` (js/app.js) n'appelle PAS `exit()`. Il abandonne le
//    meneur et cache la couche lui-même, ce qui est parfaitement légitime pour
//    un parcours, mais laisse la boîte derrière un écran vide : le menu ne
//    revient pas, et la partie n'est comptée nulle part.
//
// D'où la fonction ci-dessous, appelée des deux côtés, et le verrou qui la rend
// sans effet la seconde fois : une partie qu'on quitterait par les deux chemins
// ne doit pas compter double.
let meneurCourant = null;
let partieEnCours = null;

function finirLaPartie() {
    const path = boiteCourante;
    if (!path || !partieEnCours) return false;
    const { exoId, overrides, longueur } = partieEnCours;
    const bilan = meneurCourant && meneurCourant.bilanDeLaPartie
        ? meneurCourant.bilanDeLaPartie() : { reussies: 0, posees: 0 };
    partieEnCours = null;
    meneurCourant = null;
    ecrireMemoire(path, rangerUnePartie(lireMemoire(path), {
        exoId,
        reussies: bilan.reussies,
        total: bilan.posees,
        reglages: { ...overrides, __longueur: longueur }
    }));
    dessiner(path);
    return true;
}

/**
 * REVENIR À LA BOÎTE APRÈS AVOIR FERMÉ UN JEU PAR LA CROIX.
 *
 * Appelée par `js/app.js`, qui ne connaît pas la boîte et n'a pas à la
 * connaître : il lui suffit de voir que le corps porte la classe `en-boite`.
 */
export function revenirALaBoite() {
    return finirLaPartie();
}

function jouer(exoId) {
    const path = boiteCourante;
    if (!path) return;
    const step = path.steps.find(s => s.exerciseId === exoId);
    if (!step) return;
    const memoire = lireMemoire(path);
    const valeurs = reglagesEnCours(step, memoire);
    const longueur = longueurEnCours(step, memoire);
    // On retire le réglage qui n'appartient pas à l'exercice : `__longueur` est
    // un réglage de BOÎTE, il décide du nombre de questions et rien d'autre.
    const overrides = { ...valeurs };
    delete overrides.__longueur;

    const combien = questionsSelonLongueur(
        step.nbItems || questionsConseilleesDe(exoId), longueur);
    const unPas = makeStep(exoId, overrides, {
        stepId: 'bj', nbItems: combien, threshold: null
    });
    const partie = makePath(path.name || 'Mes jeux', [unPas], politiqueDeBoite());

    const ecran = document.getElementById(ID);
    if (ecran) ecran.hidden = true;
    partieEnCours = { exoId, overrides, longueur };
    import('../core/runner.js').then(({ Runner }) => {
        const meneur = new Runner({
            path: partie,
            deviceMode: 'none',
            // Voir le préambule : une partie de boîte n'entre dans aucun carnet.
            sansTrace: true,
            onExit: finirLaPartie
        });
        meneurCourant = meneur;
        meneur.start();
    });
}

document.addEventListener('click', (e) => {
    const ecran = document.getElementById(ID);
    if (!ecran || ecran.hidden || !ecran.contains(e.target)) return;

    // LA ROUE OUVRE LES RÉGLAGES, ET RIEN D'AUTRE. Elle est posée SUR la tuile,
    // qui est elle-même le bouton « jouer » : sans ce départ anticipé, un clic
    // sur la roue lancerait la partie.
    const roue = e.target.closest('[data-roue]');
    if (roue) { ouvrirLaRoue(roue.getAttribute('data-roue')); return; }

    if (e.target.closest('.bj-feuille-fermer')) { fermerLaRoue(); return; }
    // CLIQUER À CÔTÉ DE LA FEUILLE LA REFERME : c'est le geste que tout le monde
    // fait, et une feuille qui résiste au geste passe pour bloquée.
    if (e.target.classList && e.target.classList.contains('bj-feuille')) {
        fermerLaRoue(); return;
    }

    const jouerBtn = e.target.closest('[data-jouer]');
    if (jouerBtn) { fermerLaRoue(); jouer(jouerBtn.getAttribute('data-jouer')); return; }

    const choix = e.target.closest('.bj-choix');
    if (!choix || !boiteCourante) return;
    const cadre = choix.closest('[data-exo]');
    const exoId = cadre && cadre.getAttribute('data-exo');
    if (!exoId) return;
    const champ = choix.getAttribute('data-champ');
    let valeur = choix.getAttribute('data-valeur');
    // UN CHOIX QUI ÉTAIT UN NOMBRE DOIT LE REDEVENIR : la taille d'une grille
    // de sudoku vaut 6, pas la chaîne « 6 », et le générateur compare
    // strictement. Un attribut HTML ne sait rendre que du texte.
    const exo = getExerciseById(exoId);
    const schema = paramSchemaOf(exo) || [];
    const def = schema.find(c => c && c.id === champ);
    if (def && def.options && def.options.some(o => typeof o.value === 'number')) {
        valeur = Number(valeur);
    }
    const memoire = lireMemoire(boiteCourante);
    const step = boiteCourante.steps.find(s => s.exerciseId === exoId);
    const gardes = (memoire.jeux[exoId] || {}).reglages || {};
    const neuf = { ...step.overrides, ...gardes, [champ]: valeur };
    memoire.jeux[exoId] = {
        parties: (memoire.jeux[exoId] || {}).parties || 0,
        meilleur: (memoire.jeux[exoId] || {}).meilleur ?? null,
        total: (memoire.jeux[exoId] || {}).total ?? null,
        reglages: neuf
    };
    ecrireMemoire(boiteCourante, memoire);
    // ON REDESSINE LA GRILLE — la tuile résume les réglages, elle doit suivre —
    // PUIS ON ROUVRE LA FEUILLE sur le même jeu : choisir une taille ne doit pas
    // renvoyer au menu, sans quoi il faut rouvrir la roue à chaque réglage.
    const rouvrir = roueOuverte;
    dessiner(boiteCourante);
    if (rouvrir) ouvrirLaRoue(rouvrir);
});

// ÉCHAP REFERME LA FEUILLE. Sur un clavier c'est le geste attendu, et il n'y a
// pas d'autre fenêtre ouverte dans une boîte à jeux.
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !roueOuverte) return;
    const ecran = document.getElementById(ID);
    if (!ecran || ecran.hidden) return;
    fermerLaRoue();
});
