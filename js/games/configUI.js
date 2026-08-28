// Formulaires de configuration.
//
// Le schéma n'est plus recopié dans le catalogue : il est déduit du registre
// (paramètres du générateur + paramètres de l'activité). Ajouter une option à
// un générateur la fait apparaître partout où il est utilisé, sans toucher au
// catalogue ni à cette interface.

import { paramSchemaOf, getExerciseById } from '../data/catalog.js';
import { seuilDe } from '../core/recompenses.js';
import { natureDe } from '../core/duree.js';
import { estimerEtape, mesuresParExercice, direDuree } from '../core/dureeParcours.js';
import { state } from '../core/state.js';
import { getGenerator, generateurDeFiche } from '../core/registry.js';
import { questionsConseillees, MIN_QUESTIONS, MAX_QUESTIONS } from '../core/duree.js';
import { MODES, evaluationPolicy, apprentissagePolicy, defaultPolicy, resolvePolicy } from '../core/policy.js';
import { echelleDe, rangDans } from '../core/echelle.js';
// Une graine FIXE pour l'aperçu : voir `vraieQuestion`.
import { makeRng } from '../core/ids.js';
import {
    ajusterDuo, phraseDuo, seuilPourMode, quotaDemande, MIN_ETAPE, MAX_ETAPE
} from '../core/seuilEtape.js';
import { paliersAide, rangsEnMots, palierEnMots } from '../core/apercuAide.js';
// La répartition explicite des phases — voir `apercuAideHtml`.
import {
    lireZones, ecrireZones, normaliserZones, zonesDuMode,
    modeZone, MODES_ZONE, ZONES_MAX, MODELES_FRISE, zonesDuModele
} from '../core/aide.js';

// --- Champs -----------------------------------------------------------------

/**
 * Une option de schéma est soit une valeur brute, soit `{ value, label }`.
 *
 * Sans libellé, la case à cocher affichait le code interne : un élève lisait
 * « mul », « c10 », « rel » au lieu de « Tables », « Compléments à 10 »,
 * « Relatifs ». Le code, lui, doit rester tel quel — il pilote la génération
 * des questions et se retrouve dans les parcours enregistrés.
 */
function valeurOption(opt) { return (opt && typeof opt === 'object') ? opt.value : opt; }
function libelleOption(opt) { return (opt && typeof opt === 'object') ? opt.label : String(opt); }

/**
 * Ce que dit une liste repliée. « 0 coché » ne veut pas dire « rien » : dans
 * ces réglages, ne rien choisir revient à tout prendre — et c'est exactement
 * ce qu'il faut écrire, sinon on croit avoir désactivé l'exercice.
 */
function resumeListe(cochees, total, mot) {
    if (!cochees || cochees === total) return `Tout — les ${total} ${mot}`;
    return `${cochees} ${mot.replace(/s$/, '')}${cochees > 1 ? 's' : ''} sur ${total}`;
}

/**
 * Un réglage = un libellé court et son contrôle, côte à côte quand la largeur
 * le permet. Les explications passent dans une infobulle sur « ? » plutôt que
 * sous le champ : trois paragraphes d'aide empilés rendaient le panneau
 * illisible et repoussaient les réglages suivants hors de l'écran.
 *
 * EXPORTÉ, avec `readParams` et `wireTips` : la fiche à imprimer règle les
 * mêmes choses — le niveau, les tables, la difficulté — et redessiner ces
 * champs de son côté aurait donné deux dessins du même réglage, dont un seul
 * aurait profité des corrections. Les commandes (− / +, molette, glissé,
 * infobulles) sont branchées sur `document` une fois pour toutes : un panneau
 * qui pose ce HTML n'a rien d'autre à faire.
 */
/**
 * L'échelle d'un réglage — ou rien, s'il n'en forme pas une.
 *
 * Une liste à cocher n'a pas de curseur, et un réglage MASQUÉ AU PAPIER que la
 * fiche affiche quand même n'existe pas : le filtre est fait en amont. Ce
 * détour d'une ligne existe pour que `fieldHtml` reste lisible.
 */
function echelleGlissante(param) {
    if (param.type === 'multiselect' || param.type === 'checkbox' || param.type === 'bool') return null;
    return echelleDe(param);
}

/**
 * UNE GLISSIÈRE : un rail, deux boutons, et le réglage écrit en toutes lettres.
 *
 * Rémy : « je pensais à qqch, un slider de paramètres (exemple sur 10
 * questions), et 3 slides (si 3 modes) un pour 2 propositions, un pour 4, puis
 * libre (si le jeu le permet) ».
 *
 * Ce que le rail apporte et que le menu n'apportait pas, c'est l'ÉCHELLE : on
 * voit d'un coup d'œil combien de crans existent et où l'on est dessus. Ce que
 * le menu apportait et qu'il ne faut pas perdre, c'est le NOM du cran — « 3 »
 * ne dit rien, « Progressive : 2, puis 4, puis le clavier » dit tout. D'où la
 * ligne de texte sous le rail, qui suit le curseur.
 *
 * LES DEUX BOUTONS − / + RESTENT. Un rail se vise au pixel près ; à la souris
 * comme au doigt, avancer d'exactement un cran est plus sûr au bouton. Ils
 * sont déjà branchés pour les champs nombre — le même écouteur les sert.
 *
 * @param {Object} param  - la déclaration de réglage
 * @param {Object} ech    - son échelle (`core/echelle.js`)
 * @param {*} value       - la valeur courante
 * @param {string} id     - l'identifiant du contrôle, pour le `<label for>`
 */
function glissiereHtml(param, ech, value, id) {
    const i = rangDans(ech, value);
    const nombre = ech.nombre;
    // Un libellé court tient au bout du rail ; une phrase passe dessous, sinon
    // elle écrase le rail jusqu'à le rendre invisible sur un téléphone.
    const mots = ech.libelles.some(l => String(l).length > 8);
    const dit = escapeAttr(ech.libelles[i]);
    const donnees = nombre ? '' :
        ` data-valeurs="${escapeAttr(JSON.stringify(ech.valeurs.map(String)))}"`
        + ` data-libelles="${escapeAttr(JSON.stringify(ech.libelles))}"`;

    // Pour un NOMBRE, le rail porte directement la valeur : `readParams` la lit
    // sans rien savoir de l'échelle. Pour une liste, il porte le RANG — les
    // valeurs ne sont pas forcément des nombres, et « auto » n'a pas de place
    // sur un axe.
    // OÙ L'ON EST SUR L'ÉCHELLE, EN CHIFFRES. Un rail lisse ne dit pas combien
    // de positions il a : on le prend pour un curseur continu, on le traîne, et
    // l'on ne sait ni d'où l'on part ni combien il reste. « 3 / 4 » le dit en
    // deux caractères. Seulement là où le libellé est passé DESSOUS : quand il
    // tient au bout du rail, la valeur y est déjà et un second chiffre ferait
    // deux choses à lire pour une seule information.
    // LES CRANS NOMMÉS SOUS LE RAIL remplacent avantageusement ce compte quand
    // l'auteur du réglage a donné des noms courts : « Qcm 2 · Qcm 4 · Libre »
    // dit à la fois où l'on est, combien il y a de positions, ET ce qu'elles
    // valent — ce qu'un « 3/4 » ne pourra jamais dire. C'est le rail que Rémy
    // dessine : « O———O———O ». Sans noms courts, on garde le compte.
    // LES CRANS SE POSENT OÙ LA PASTILLE S'ARRÊTE, pas dans des cases égales.
    //
    // Rémy, capture à l'appui : « on comprend rien pour le slide ». Il avait
    // raison, et la faute était géométrique. Les noms étaient rangés dans des
    // cases de largeur égale : leurs centres tombent donc à (k + ½)/n de la
    // barre — 12,5 %, 37,5 %, 62,5 %, 87,5 % pour quatre crans. Or la pastille,
    // elle, s'arrête à k/(n−1) : 0 %, 33 %, 67 %, 100 %. Les deux ne coïncident
    // JAMAIS, sauf par accident. Pastille tout à gauche et « QCM 2 » écrit bien
    // plus à droite : on ne pouvait pas savoir sur quel cran on était.
    //
    // Chaque nom est donc posé à l'abscisse EXACTE de son cran, avec la même
    // formule que le navigateur : un demi-pouce de marge à chaque bout, et le
    // reste partagé. Et un trait sur le rail à la même abscisse, pour que la
    // graduation se voie même quand les noms sont longs — c'est le rail que
    // Rémy dessinait : « O———O———O ».
    // LE DERNIER CRAN SE POSE PAR LA DROITE, et ce n'est pas une coquetterie :
    // un élément positionné en absolu ne dispose que de la place qui reste à
    // sa droite. Posé à « 100 % − 12 px », il n'en a plus que douze pixels, et
    // le navigateur le replie mot par mot — « Libre » s'écrivait « Li / br / e ».
    // Ancré par la droite, il a toute la largeur, et son bord tombe pile sur
    // le cran.
    const abscisse = (k, n) => {
        if (n < 2) return 'left:50%';
        if (k === n - 1) return 'right:12px;left:auto';
        return `left:calc(12px + (100% - 24px) * ${(k / (n - 1)).toFixed(6)})`;
    };
    const crans = mots && !nombre && ech.courts
        // LES CRANS SONT DES BOUTONS, PAS DES ÉTIQUETTES.
        //
        // Rémy : « il faut pouvoir bouger les curseurs et on voit à quelle
        // question cela correspond, et quand on passe dessus ou que l'on clique
        // si on est sur tablette, c'est qu'on voit le VRAI aperçu ».
        //
        // Deux choses en une. D'abord on CLIQUE un cran pour y aller : traîner
        // une pastille de vingt-quatre pixels sur un rail est un geste de
        // précision, alors qu'on sait exactement où l'on veut aller — c'est
        // écrit dessous. Ensuite on le SURVOLE pour essayer sans choisir :
        // l'aperçu montre alors ce que CE réglage donnerait, et revient au
        // réglage courant quand on s'en va. C'est le « qu'est-ce que ça
        // changerait ? » auquel aucun panneau ne répond jamais.
        ? `<div class="cfg-crans">`
        + ech.courts.map((c, k) =>
            `<button type="button" class="cfg-cran${k === i ? ' cfg-cran--ici' : ''}"
                data-cran="${k}" data-pour="${escapeAttr(param.id)}"
                aria-label="${escapeAttr(ech.libelles[k] || c)}"
                style="${abscisse(k, ech.courts.length)}">${escapeAttr(c)}</button>`).join('')
        + `</div>`
        : '';
    const tirets = mots && !nombre && ech.valeurs.length > 1
        ? `<div class="cfg-tirets" aria-hidden="true">`
        + ech.valeurs.map((_, k) =>
            `<i class="cfg-tiret${k === i ? ' cfg-tiret--ici' : ''}"
                style="${abscisse(k, ech.valeurs.length)}"></i>`).join('')
        + `</div>`
        : '';
    const rang = mots && !nombre && !ech.courts
        ? `<span class="cfg-glissiere-rang" aria-hidden="true">${i + 1}/${ech.valeurs.length}</span>`
        : '';

    return `<div class="cfg-glissiere${mots ? ' cfg-glissiere--mots' : ''}${crans ? ' cfg-glissiere--crans' : ''}">
        <div class="cfg-stepper cfg-stepper--rail" data-stepper>
            <button type="button" class="cfg-step" data-step="-1" tabindex="-1" aria-label="Diminuer">−</button>
            <span class="cfg-rail-boite">
                <input type="range" class="cfg-rail" id="${id}" data-param="${param.id}"
                    data-kind="${nombre ? 'number' : 'echelle'}"
                    min="${nombre ? ech.valeurs[0] : 0}" max="${nombre ? ech.valeurs[ech.valeurs.length - 1] : ech.valeurs.length - 1}"
                    step="1" value="${nombre ? ech.valeurs[i] : i}"
                    aria-valuetext="${dit}"${donnees}>
                ${tirets}
            </span>
            <button type="button" class="cfg-step" data-step="1" tabindex="-1" aria-label="Augmenter">+</button>
            ${rang}
        </div>
        ${crans}
        ${nombre
        // LE NOMBRE SE TAPE, AU BOUT DU RAIL. Rémy : « pour le nombre de
        // question il est bout du slide, on peut le modifier ». Traîner une
        // poignée jusqu'à « 24 » demande de la précision quand on sait déjà
        // qu'on veut vingt-quatre — et le rail reste là pour qui préfère
        // pousser. Les deux commandes touchent le MÊME champ.
        ? `<input type="number" class="cfg-glissiere-dit cfg-glissiere-saisie" data-dit
                data-pour="${id}" min="${ech.valeurs[0]}"
                max="${ech.valeurs[ech.valeurs.length - 1]}" value="${ech.valeurs[i]}"
                aria-label="${escapeAttr(param.label || 'Valeur')}">`
        : `<output class="cfg-glissiere-dit" data-dit>${ech.libelles[i]}</output>`}
    </div>`;
}

/**
 * Une glissière posée à la main, pour les réglages qui ne viennent pas d'un
 * schéma — le nombre de questions et le seuil de réussite sont écrits dans le
 * gabarit des panneaux, pas déclarés par un générateur. C'est justement
 * l'exemple que donne Rémy (« sur 10 questions »), il aurait été absurde qu'il
 * soit le seul à ne pas en profiter.
 */
export function glissiereNombre({ id, label, min, max, value, aide, aideId }) {
    const ech = echelleDe({ type: 'number', min, max });
    const v = Math.max(min, Math.min(max, Number(value) || min));
    const tete = `<label class="cfg-label" for="${id}">${label}${infoBtn(aide, aideId)}</label>`;
    // Trop de crans pour un rail : on rend le champ qu'on tape, c'est-à-dire
    // exactement ce qui existait avant. Une glissière n'est un progrès que
    // quand elle est visable (voir CRANS_MAX).
    if (!ech) {
        return `<div class="cfg-field">${tete}
            <input type="number" id="${id}" class="cfg-input cfg-input--num" min="${min}" max="${max}" value="${v}">
        </div>`;
    }
    // `data-param` retiré : ce réglage-ci n'appartient à aucun schéma, c'est le
    // panneau qui le relit par son identifiant. Le laisser ferait entrer
    // « cfg-nbitems » dans les paramètres du générateur.
    return `<div class="cfg-field">${tete}
        ${glissiereHtml({ id, label }, ech, v, id).replace(` data-param="${id}"`, '')}
    </div>`;
}

/**
 * LA LONGUEUR DE L'ÉTAPE, ET LE QUOTA DE BONNES RÉPONSES.
 *
 * Rémy, sur le double curseur qui occupait cette place : « pour le nombre de
 * questions, il est au bout du slide, on peut le modifier, et il n'y a QU'UN
 * bouton sur le slide, actif ou non selon la nécessité d'avoir un quota de
 * bonne réponse. »
 *
 * TROIS OBJETS, UN PAR DÉCISION — et c'est ce découpage qui fait la clarté,
 * pas le dessin :
 *
 *   · UN NOMBRE QU'ON TAPE : combien de questions. On le SAIT en arrivant ;
 *     le chercher au doigt sur cinquante crans était une corvée déguisée en
 *     confort.
 *   · UN INTERRUPTEUR : y a-t-il un quota, oui ou non. C'était la question
 *     manquante. Le panneau imposait un seuil à toute étape, alors qu'un
 *     entraînement se valide très bien en allant au bout.
 *   · UN RAIL À UNE SEULE POIGNÉE : le quota, quand il y en a un. Une
 *     proportion se règle en glissant, pas en tapant.
 *
 * LE MAXIMUM DU RAIL EST LE NOMBRE TAPÉ. « Onze sur dix » reste impossible,
 * non parce qu'une vérification le refuse, mais parce que le rail s'arrête à
 * dix — et raccourcir le devoir tire le quota avec lui.
 *
 * CE QUE CELA SUPPRIME. Deux poignées sur un rail, superposables, exigeaient
 * de deviner laquelle le doigt visait ; à égalité parfaite il fallait attendre
 * le premier mouvement pour trancher, sans quoi le réglage devenait un
 * cul-de-sac. Cent lignes de gestes disparaissent avec la seconde poignée.
 *
 * EN ÉVALUATION, IL N'Y A PAS DE QUOTA DU TOUT (voir core/seuilEtape.js) :
 * l'interrupteur et le rail s'effacent au lieu de proposer un réglage sans
 * effet.
 */
const partDuo = (t) => `calc(${Math.max(0, Math.min(1, t)).toFixed(4)} * (100% - 24px))`;

/**
 * LE NOMBRE DE QUESTIONS EST LE BOUT DU RAIL.
 *
 * Rémy, deux fois : « pour le nombre de questions, il est au bout du slide, on
 * peut le modifier ». La première fois je l'avais mis SUR SA PROPRE LIGNE
 * au-dessus du rail — ce qui répond à la lettre (on peut le modifier) mais pas
 * à l'idée. Car l'idée est juste : ce nombre n'est pas un réglage de plus, c'est
 * la GRADUATION MAXIMALE du rail. Posé à son extrémité, il dit d'un coup d'œil
 * « la piste va jusqu'ici », et le quota qu'on tire dessus se lit comme une
 * fraction de lui.
 */
function boutQuestions(id, min, max, q) {
    // TROIS FAÇONS DE CHANGER CE NOMBRE, PARCE QU'IL Y A TROIS MACHINES.
    //
    // Rémy : « il faudrait pouvoir changer le nombre de question soit en tapant
    // au clavier soit sur tablette en appuyant et bougeant le doigt, soit avec
    // des +,- sur ordi. » Les trois existaient déjà dans ce panneau, sur les
    // champs nombre ordinaires : `.cfg-stepper` porte la saisie, les deux
    // boutons, le glissé vertical au doigt et la molette à la souris. Le
    // nombre de questions était le seul à ne pas en profiter — il se tapait,
    // et c'est tout.
    //
    // On le lui branche PLUTÔT QUE DE REFAIRE LE GESTE À CÔTÉ : deux mécaniques
    // parallèles pour la même chose finissent toujours par diverger, et celle
    // d'à côté n'aurait eu ni la molette, ni le sens de glissé du reste du
    // panneau.
    return `<div class="cfg-etape-bout">
        <div class="cfg-stepper cfg-stepper--bout" data-stepper>
            <button type="button" class="cfg-step" data-step="-1" tabindex="-1"
                    aria-label="Une question de moins">−</button>
            <input type="number" inputmode="numeric" id="${id}" class="cfg-etape-nb"
                   data-duo="questions" min="${min}" max="${max}" step="1" value="${q}"
                   aria-label="Nombre de questions">
            <button type="button" class="cfg-step" data-step="1" tabindex="-1"
                    aria-label="Une question de plus">+</button>
        </div>
        <span class="cfg-etape-unite">question${q > 1 ? 's' : ''}</span>
    </div>`;
}

/**
 * COMBIEN DE TEMPS CELA VA PRENDRE — la vraie question du professeur.
 *
 * « Vingt questions », cela ne veut rien dire tant qu'on n'a pas une heure de
 * cours en tête. La liste des étapes affiche déjà cette estimation ; elle
 * manquait là où l'on décide, c'est-à-dire à côté du nombre qu'on tape. On la
 * met donc SOUS la phrase du quota, où elle complète « 14 bonnes réponses
 * exigées sur 20 » par « et cela prendra à peu près six minutes ».
 *
 * `mesure` distingue une estimation d'une mesure : quand des élèves ont déjà
 * répondu, la durée n'est plus un pari, et le « ≈ » disparaît.
 */
function ditDuree(exoId, questions) {
    try {
        const exo = getExerciseById(exoId);
        if (!exo) return '';
        // Les mesures du journal : quand des élèves ont déjà répondu à CET
        // exercice, la durée n'est plus un pari.
        const mesures = mesuresParExercice((state && state.attemptHistory) || []);
        const d = estimerEtape(
            { nature: natureDe(exo), questions: Math.max(1, questions) },
            mesures[exo.id]);
        if (!d || !Number.isFinite(d.min)) return '';
        return `<span class="cfg-duree${d.mesure ? ' cfg-duree--mesure' : ''}">⏱ ${
            d.mesure ? '' : '≈ '}${direDuree(d.min, d.max)}</span>`;
    } catch { return ''; }
}

export function glissiereDouble({ idQuestions, idExigees, label, aide, aideId, min, max, questions, exigees, quota = true, evaluation, exoId = '' }) {
    const duo = ajusterDuo({ questions, exigees, max });
    const q = duo.questions;
    const actif = !evaluation && quota;
    const tete = `<label class="cfg-label" for="${idQuestions}">${label}${infoBtn(aide, aideId)}</label>`;
    return `<div class="cfg-field cfg-etape${evaluation ? ' cfg-etape--sans-seuil' : ''}" data-duo-boite>
        ${tete}
        ${evaluation ? `
        <div class="cfg-etape-ligne">
            <div class="cfg-etape-rail cfg-etape-rail--eteint"><div class="cfg-duo-piste"></div></div>
            ${boutQuestions(idQuestions, min, max, q)}
        </div>
        <input type="hidden" id="${idExigees}" value="${duo.exigees}">` : `
        <div class="cfg-etape-ligne">
            <div class="cfg-etape-rail${actif ? '' : ' cfg-etape-rail--eteint'}" data-duo-rail>
                <div class="cfg-duo-piste"></div>
                <div class="cfg-duo-part" data-duo-part
                     style="width:${partDuo((duo.exigees - min) / Math.max(1, q - min))}"></div>
                <input type="range" id="${idExigees}" class="cfg-duo-curseur"
                       data-duo="exigees" min="${min}" max="${q}" step="1" value="${duo.exigees}"
                       ${actif ? '' : 'disabled'} aria-label="Bonnes réponses exigées">
            </div>
            ${boutQuestions(idQuestions, min, max, q)}
        </div>
        <label class="cfg-etape-quota">
            <input type="checkbox" data-duo-quota ${actif ? 'checked' : ''}>
            <span>Exiger un quota de bonnes réponses</span>
        </label>`}
        <div class="cfg-etape-dit">
            <output class="cfg-duo-dit" data-duo-dit>${phraseDuo({ ...duo, evaluation, quota: actif })}</output>
            <span data-duree>${ditDuree(exoId, q)}</span>
        </div>
    </div>`;
}

/** L'interrupteur du quota est-il enclenché ? */
const quotaCoche = (boite) => {
    const c = boite && boite.querySelector('[data-duo-quota]');
    return !c || c.checked;
};

/**
 * Le bloc se redessine : la borne haute du rail SUIT le nombre tapé, et le
 * quota se laisse tirer avec elle plutôt que de rester bloqué au-dessus.
 */
function majDuo(boite) {
    if (!boite) return;
    const nb = boite.querySelector('[data-duo="questions"]');
    const ex = boite.querySelector('[data-duo="exigees"]');
    if (!nb) return;
    const evaluation = boite.classList.contains('cfg-etape--sans-seuil');
    const min = Number(nb.min);
    const duo = ajusterDuo({
        questions: Number(nb.value),
        exigees: ex ? Number(ex.value) : Number(nb.value),
        max: Number(nb.max)
    });
    const actif = !evaluation && quotaCoche(boite);

    // LE RAIL SE REBORNE AVANT DE SE REPOSITIONNER. Poser la valeur d'abord la
    // ferait écrêter par l'ancien maximum : passer de 5 à 20 questions aurait
    // laissé le quota coincé à 5, et le professeur aurait cru à un plafond.
    if (ex) {
        ex.max = String(duo.questions);
        ex.value = String(duo.exigees);
        ex.disabled = !actif;
    }
    const part = boite.querySelector('[data-duo-part]');
    if (part) {
        part.style.width = actif
            ? partDuo((duo.exigees - min) / Math.max(1, duo.questions - min))
            : '0px';
    }
    const rail = boite.querySelector('[data-duo-rail]');
    if (rail) rail.classList.toggle('cfg-etape-rail--eteint', !actif);
    const unite = boite.querySelector('.cfg-etape-unite');
    if (unite) unite.textContent = `question${duo.questions > 1 ? 's' : ''}`;
    const dit = boite.querySelector('[data-duo-dit]');
    if (dit) dit.textContent = phraseDuo({ ...duo, evaluation, quota: actif });
    // LA DURÉE SUIT LE NOMBRE. Elle n'a d'intérêt que si elle bouge quand on
    // tape : figée sur la valeur d'ouverture, elle mentirait dès le premier
    // changement, ce qui est pire que de ne rien dire.
    const duree = boite.querySelector('[data-duree]');
    if (duree) {
        const hote = boite.closest('[data-exo]');
        duree.innerHTML = ditDuree((hote && hote.dataset.exo) || '', duo.questions);
    }
}

document.addEventListener('input', (e) => {
    const el = e.target.closest && e.target.closest('[data-duo], [data-duo-quota]');
    if (!el) return;
    const boite = el.closest('[data-duo-boite]');
    majDuo(boite);
    // Le panneau relit tout sur `change` ; un décrochage du quota n'en émet
    // pas de lui-même, et l'étape serait restée avec son ancien seuil.
    el.dispatchEvent(new Event('change', { bubbles: true }));
});

let quotaTire = null;

/** La valeur sous le doigt. La demi-poignée déborde de chaque bout du rail. */
function poserQuota(rail, ex, clientX) {
    const r = rail.getBoundingClientRect();
    const marge = 12;
    const util = Math.max(1, r.width - marge * 2);
    const t = Math.min(1, Math.max(0, (clientX - r.left - marge) / util));
    ex.value = String(Math.round(Number(ex.min) + t * (Number(ex.max) - Number(ex.min))));
    ex.dispatchEvent(new Event('input', { bubbles: true }));
}

// ON TAPE LE RAIL, LA POIGNÉE Y VA. Viser une pastille de 24 px au milieu d'un
// rail de cinquante crans n'est pas raisonnable sur un téléphone ; le rail
// natif, lui, n'écoute que sa poignée.
document.addEventListener('pointerdown', (e) => {
    const rail = e.target.closest && e.target.closest('[data-duo-rail]');
    if (!rail || rail.classList.contains('cfg-etape-rail--eteint')) return;
    const ex = rail.querySelector('[data-duo="exigees"]');
    if (!ex || ex.disabled) return;
    poserQuota(rail, ex, e.clientX);
    ex.focus({ preventScroll: true });
    quotaTire = { rail, ex };
    try { rail.setPointerCapture(e.pointerId); } catch (err) { /* souris relâchée ailleurs */ }
    e.preventDefault();
});

document.addEventListener('pointermove', (e) => {
    if (quotaTire) poserQuota(quotaTire.rail, quotaTire.ex, e.clientX);
});
document.addEventListener('pointerup', () => { quotaTire = null; });
document.addEventListener('pointercancel', () => { quotaTire = null; });


/**
 * TOUS LES RÉGLAGES D'UN SCHÉMA, RANGÉS — et c'est le rangement qui compte.
 *
 * Rémy, devant les propriétés d'une étape : « on ne comprend rien ». Les trois
 * réglages de l'aide étaient empilés à plat, au même rang que « Dimension
 * maximale » et « Unité » : on lisait « L'aide — Progressive : 2, puis 4, puis
 * le clavier », puis, juste dessous et sans lien apparent, « Passage au
 * clavier — après le premier tiers ». DEUX RÉPONSES À LA MÊME QUESTION, l'une
 * sous l'autre, et rien ne disait laquelle gouvernait. C'était le panneau qui
 * était faux, pas les réglages.
 *
 * Trois règles, donc, et elles s'appliquent aux deux panneaux — celui de
 * l'exercice et celui de l'étape, qui divergeaient jusqu'ici :
 *
 *   · CE QUI PARLE DE LA MÊME CHOSE SE TIENT ENSEMBLE, sous son propre titre.
 *   · LES VIS RESTENT DERRIÈRE « AFFINER… ». Un réglage marqué `affiner` est
 *     une correction du réglage principal : le montrer d'office, c'est laisser
 *     croire à trois décisions là où il n'y en a qu'une.
 *   · L'APERÇU SE MET SOUS CE QU'IL EXPLIQUE. Il vivait tout en bas du panneau,
 *     après le rôle de l'étape et le chronomètre — trois écrans plus loin que
 *     le réglage dont il montre l'effet.
 *
 * @param {Array} schema
 * @param {(p:Object)=>*} valeurDe
 * @param {{apercu?: boolean}} options
 */
export function champsSchema(schema, valeurDe, options = {}) {
    const tous = schema || [];
    const groupes = new Map();
    tous.forEach(p => {
        const g = p.groupe || '';
        if (!groupes.has(g)) groupes.set(g, []);
        groupes.get(g).push(p);
    });

    const rendre = (liste) => liste.map(p => fieldHtml(p, valeurDe(p))).join('');

    /** Le repli « Affiner… », et son compte de réglages déjà touchés. */
    const affiner = (liste) => {
        const vis = liste.filter(p => p.affiner);
        if (!vis.length) return '';
        const modifies = vis.filter(p => {
            const v = valeurDe(p);
            return v !== undefined && String(v) !== String(p.default);
        });
        const dit = modifies.length
            ? ` · ${modifies.length} réglage${modifies.length > 1 ? 's' : ''} `
                + `modifié${modifies.length > 1 ? 's' : ''}`
            : '…';
        return `<details class="cfg-affiner" ${modifies.length ? 'open' : ''}>
            <summary class="cfg-affiner-tete">
                <span>Affiner${dit}</span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                     stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div class="cfg-affiner-corps">${rendre(vis)}</div>
        </details>`;
    };

    const morceau = (liste) => rendre(liste.filter(p => !p.affiner)) + affiner(liste);

    const libre = groupes.get('') || [];
    groupes.delete('');
    const nommes = [...groupes.entries()].map(([nom, liste]) => {
        const titres = options.titres || TITRES_GROUPE;
        // L'APERÇU EST LA COMMANDE, IL N'EST PLUS À CÔTÉ D'ELLE.
        //
        // Rémy, pour la troisième fois sur ce bloc : « je ne trouve toujours
        // pas cela clair vraiment et en dessous ya plein de propositions, on ne
        // comprend rien ».
        //
        // Il avait raison, et j'y étais pour quelque chose. Il y avait TROIS
        // commandes pour UNE question : le rail « L'aide » (QCM 2 · QCM 4 ·
        // Progressif · Libre), la rangée « Propositions » que je venais
        // d'ajouter, et les deux vis derrière « Affiner… ». Or « QCM 2 » VEUT
        // DIRE « 2 propositions » : le préréglage et la vis disaient la même
        // chose deux fois, sans que rien n'annonce laquelle l'emporte.
        //
        // Une seule commande, donc, et c'est l'aperçu lui-même : quatre cartes
        // qui montrent la VRAIE question telle que l'élève la verra, et qu'on
        // clique pour choisir. On ne lit plus une étiquette pour deviner un
        // résultat — on regarde le résultat et on le désigne. Le rail, la
        // phrase sous le rail et la rangée de pastilles disparaissent tous les
        // trois : c'étaient trois façons de décrire ce qu'une image montre.
        if (nom === 'aide' && options.apercu !== false) {
            return `<div class="cfg-sous-groupe">
                <div class="cfg-sous-titre">${titres[nom] || TITRES_GROUPE[nom] || nom}</div>
                <div class="cfg-apercu" data-apercu></div>
                <!-- CE QUI NE VAUT QUE POUR L'ADAPTATIF SE RETIRE QUAND ON
                     DEFINIT. Remy pose deux cas : ou l'exercice s'adapte, et
                     la seule chose a regler est jusqu'ou il a le droit de
                     monter ; ou l'on definit soi-meme, et c'est la frise qui
                     dit tout, zone par zone. Laisser le bouton dans le second
                     cas, c'est refaire exactement le defaut qu'on vient de
                     corriger : une commande sans effet a cote d'une commande
                     qui decide. C'est rafraichirApercu qui le montre ou
                     le cache.
                     (Pas d'accent grave ici : ce commentaire vit DANS un
                     litteral de gabarit, et le premier le fermerait.) -->
                <div data-si-auto>${rendre(liste.filter(p => !p.affiner && p.id !== 'aide'))}</div>
                ${affiner(liste)}
                <!-- LE RAIL RESTE, MAIS ON NE LE VOIT PLUS. C'est lui qui porte
                     la valeur : la relecture du panneau la lit là, comme pour
                     tous les autres réglages, et le clavier peut encore
                     l'atteindre. Fabriquer un second état pour les cartes
                     l'aurait fait diverger du premier au premier oubli.
                     (Pas d'accent grave ici : ce commentaire vit DANS un
                     littéral de gabarit, et le premier le fermerait.) -->
                <div class="cfg-cache">${rendre(liste.filter(p => p.id === 'aide'))}</div>
            </div>`;
        }
        return `<div class="cfg-sous-groupe">
            <div class="cfg-sous-titre">${titres[nom] || TITRES_GROUPE[nom] || nom}</div>
            ${rendre(liste.filter(p => !p.affiner))}
            ${affiner(liste)}
        </div>`;
    }).join('');

    return morceau(libre) + nommes;
}

/**
 * LE TITRE D'UN GROUPE DIT LA QUESTION, PAS LA CATÉGORIE. « Comment l'élève
 * répond » se comprend sans avoir jamais ouvert le logiciel ; « Aide » non.
 *
 * Et il change de personne selon qui lit. Le même bloc est rendu dans le
 * panneau du professeur — qui règle pour sa classe — et dans celui que l'élève
 * ouvre avant de jouer : « Comment l'élève répond » sur l'écran de l'élève
 * parlerait de quelqu'un d'autre que lui.
 */
const TITRES_GROUPE = {
    aide: 'Comment l\'élève répond'
};

export const TITRES_ELEVE = {
    aide: 'Comment tu réponds'
};

export function fieldHtml(param, value, options = {}) {
    const id = `cfg-${param.id}`;
    // UN RÉGLAGE QUI A SA PROPRE COMMANDE N'A PAS DE CHAMP. La répartition se
    // règle dans l'aperçu, en tirant les bornes de la bande ; elle a quand même
    // besoin d'exister dans le panneau, parce que c'est là que la relecture des
    // réglages va la chercher. Un champ caché, donc, et rien à l'écran.
    if (param.cache) {
        return `<input type="hidden" data-param="${escapeAttr(param.id)}"
            id="${id}" value="${escapeAttr(String(value ?? param.default ?? ''))}">`;
    }
    const wide = param.type === 'multiselect';   // les puces prennent toute la largeur

    // UN MENU DONT LES CHOIX SONT DES PHRASES PASSE SOUS SON LIBELLÉ.
    //
    // « 6 — Cinq, et rien de donné · avec des "soit… soit…" », c'est cinquante
    // caractères : dans une demi-largeur de téléphone, on lit « 6 — Cinq, et
    // r… » et on ne sait plus ce qui est réglé. Aucune largeur ne sauve ces
    // libellés-là ; seule la LIGNE ENTIÈRE les sauve. Le réglage descend donc
    // d'un cran — libellé au-dessus, menu pleine largeur en dessous — et
    // uniquement lui : les menus courts (« Normal », « 24 × 16 ») restent sur
    // une ligne, sinon le panneau doublerait de hauteur pour rien.
    const longOptions = param.type === 'select' && !param.echelle && (param.options || [])
        .some(o => String(libelleOption(o)).length > 18);
    let control = '';

    // Mémorisée : `fieldHtml` s'en sert pour choisir la branche, `glissiereHtml`
    // pour dessiner le rail. La calculer deux fois n'était pas coûteux, mais
    // deux appels, ce sont deux occasions de diverger.
    const ech = echelleGlissante(param);

    if (param.type === 'multiselect' && param.deroulant) {
        // UNE LISTE QUI SE DÉPLIE, quand les options sont des PHRASES.
        //
        // Onze familles de problèmes en pastilles au fil du texte, ce sont onze
        // lignes de libellés longs qui repoussent tout le reste du panneau hors
        // de l'écran — et le professeur n'y touche qu'une fois sur dix. Repliée,
        // la liste tient sur une ligne et dit son état (« 3 familles sur 11 ») ;
        // dépliée, elle donne les cases. « Tout cocher / tout décocher » évite
        // les onze clics qu'on faisait sinon pour n'en garder qu'une.
        const choisis = Array.isArray(value) ? value.map(String)
            : String(value || '').split(',').map(s => s.trim()).filter(Boolean);
        const n = param.options.length;
        const cochees = param.options.filter(o => choisis.includes(String(valeurOption(o)))).length;
        control = `<details class="cfg-liste" data-liste="${param.id}" data-mot="${escapeAttr(param.tout || 'éléments')}">
            <summary class="cfg-liste-tete">
                <span data-resume>${resumeListe(cochees, n, param.tout || 'tout')}</span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                     stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div class="cfg-liste-actions">
                <button type="button" class="cfg-liste-btn" data-cocher="1">Tout cocher</button>
                <button type="button" class="cfg-liste-btn" data-cocher="0">Tout décocher</button>
            </div>
            <div class="cfg-liste-corps">${param.options.map(opt => {
            const v = valeurOption(opt);
            const checked = choisis.includes(String(v)) ? 'checked' : '';
            return `<label class="cfg-liste-ligne">
                    <input type="checkbox" data-param="${param.id}" data-kind="multiselect" value="${v}" ${checked}>
                    <span>${libelleOption(opt)}</span></label>`;
        }).join('')}</div>
        </details>`;
    } else if (param.type === 'multiselect') {
        // Des options toutes courtes — les tables, les nombres de côtés — se
        // rangent en GRILLE de tuiles identiques plutôt qu'en pastilles au fil
        // du texte : les tailles ne dépendent plus du contenu, les colonnes
        // s'alignent, et une table cochée ne pousse plus ses voisines.
        const grille = param.options.every(o => String(libelleOption(o)).length <= 3);
        // Le nombre de colonnes est DIT, pas deviné. `auto-fill` remplissait la
        // largeur avec des tuiles minimales : dix tables tombaient en 6 + 4,
        // une rangée pleine et une rangée orpheline. Une grille qui compte
        // exactement ses options tient sur une ligne quand la place existe, et
        // se replie proprement en deux rangées égales sur un téléphone.
        const cols = grille ? ` style="--cfg-cols: ${param.options.length}"` : '';
        control = `<div class="cfg-chips${grille ? ' cfg-chips--grille' : ''}"${cols}>` + param.options.map(opt => {
            const v = valeurOption(opt);
            const checked = Array.isArray(value) && value.includes(v) ? 'checked' : '';
            // `aide` porte le nom en toutes lettres quand le libellé est un
            // raccourci — « 7 × 8 » dit ce qu'on va calculer, il ne dit pas
            // qu'on travaille les tables. L'infobulle rattrape la nuance sans
            // rallonger la puce.
            const titre = opt && opt.aide ? ` title="${escapeAttr(opt.aide)}"` : '';
            return `<label class="cfg-chip"${titre}>
                <input type="checkbox" data-param="${param.id}" data-kind="multiselect" value="${v}" ${checked}>
                <span>${libelleOption(opt)}</span></label>`;
        }).join('') + `</div>`;
    } else if (ech) {
        // UN RÉGLAGE QUI FORME UNE ÉCHELLE se pose au rail, pas au menu ni au
        // champ : voir `glissiereHtml` juste au-dessus.
        control = glissiereHtml(param, ech, value, id);
    } else if (param.type === 'number') {
        // UN NOMBRE SE RÈGLE DE TROIS FAÇONS, et il faut les trois : un champ
        // nu obligeait à sélectionner le contenu puis à taper — sur téléphone,
        // c'est faire monter le clavier système pour changer 4 en 5. On garde
        // donc la saisie (la plus rapide pour aller loin), on ajoute deux
        // boutons − / + (le geste évident au doigt) et la molette ou le glissé
        // vertical sur le champ (le geste évident à la souris).
        control = `<div class="cfg-stepper" data-stepper>
            <button type="button" class="cfg-step" data-step="-1" tabindex="-1" aria-label="Diminuer">−</button>
            <input type="number" inputmode="numeric" id="${id}" class="cfg-input cfg-input--num"
                data-param="${param.id}" data-kind="number" value="${value}"
                ${param.min !== undefined ? `min="${param.min}"` : ''} ${param.max !== undefined ? `max="${param.max}"` : ''}>
            <button type="button" class="cfg-step" data-step="1" tabindex="-1" aria-label="Augmenter">+</button>
        </div>`;
    } else if (param.type === 'select') {
        control = `<select id="${id}" class="cfg-input" data-param="${param.id}" data-kind="select">` +
            param.options.map(o => {
                const v = valeurOption(o);
                return `<option value="${v}" ${String(value) === String(v) ? 'selected' : ''}>${libelleOption(o)}</option>`;
            }).join('') +
            `</select>`;
    } else if (param.type === 'checkbox' || param.type === 'bool' || typeof value === 'boolean') {
        // OUI / NON, jamais « true » et « false ».
        //
        // Sans cette branche, un réglage booléen tombait dans le champ texte :
        // l'élève lisait « true », et en tapant dessus il pouvait écrire
        // n'importe quoi — le clavier du téléphone montait pour éditer un mot
        // anglais qui n'a aucun sens dans une salle de classe.
        const oui = value === true || value === 'true';
        control = `<div class="cfg-oui-non" data-param="${param.id}" data-kind="bool" data-valeur="${oui}">
            <button type="button" class="cfg-on ${oui ? 'cfg-on--actif' : ''}" data-bool="true">Oui</button>
            <button type="button" class="cfg-on ${oui ? '' : 'cfg-on--actif'}" data-bool="false">Non</button>
        </div>`;
    } else {
        control = `<input type="text" id="${id}" class="cfg-input" data-param="${param.id}" data-kind="text" value="${value ?? ''}">`;
    }

    // L'explication peut venir du schéma lui-même (`aide`) : un réglage dont le
    // libellé ne suffit pas se documente là où il est défini, pas au point
    // d'appel — sinon l'aide n'existe que dans un seul des trois panneaux.
    return `<div class="cfg-field${wide ? ' cfg-field--wide' : ''}${longOptions ? ' cfg-field--long' : ''}">
        <label class="cfg-label" for="${id}">${param.label}${infoBtn(options.aide || param.aide, options.aideId)}</label>
        ${control}
    </div>`;
}

/**
 * Le fondu de bas de liste : posé tant qu'il reste des réglages sous le pli,
 * retiré dès qu'on touche le fond.
 *
 * On l'ACTUALISE au défilement et au redimensionnement, pas seulement à
 * l'ouverture : déplier une liste de familles ou faire monter le clavier
 * change la hauteur du contenu, et un fondu qui reste alors qu'on est en bas
 * ressemble à un texte effacé.
 */
export function marquerFondu(el) {
    if (!el) return;
    const maj = () => el.classList.toggle('cfg-encore',
        el.scrollHeight - el.scrollTop - el.clientHeight > 6);
    maj();
    if (el._fondu) return maj;
    el._fondu = true;
    el.addEventListener('scroll', maj, { passive: true });
    el.addEventListener('toggle', () => requestAnimationFrame(maj), true);
    window.addEventListener('resize', maj);
    return maj;
}

// Sorti du littéral de gabarit : les apostrophes d'un texte français y sont
// une source d'erreurs de syntaxe silencieuses.
const SCOPE_TIP = "« À toute l'étape » : un seul compte à rebours pour l'ensemble "
    + "des questions. « À chaque question » : il repart à zéro à chaque question, "
    + "et une question non répondue à temps est comptée fausse.";

/** Point d'interrogation portant l'explication ; rien du tout s'il n'y en a pas. */
function infoBtn(aide, id) {
    if (!aide && !id) return '';
    return `<button type="button" class="cfg-info" ${id ? `id="${id}"` : ''}
        data-tip="${aide ? escapeAttr(aide) : ''}" aria-label="Explication">?</button>`;
}

function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// --- L'aperçu de l'aide -----------------------------------------------------
//
// Rémy : « il faut un apercu de ce que cela donne ».
//
// Le réglage « L'aide » s'appelait « Progressive (recommandé) », et ces deux
// mots ne disent PAS que dix questions donneront trois vrai/faux, cinq
// questions à quatre propositions, puis deux réponses tapées. Le professeur ne
// pouvait le découvrir qu'en classe. L'aperçu déroule l'exercice pour lui et
// dessine ce que l'élève aura sous les yeux, tranche par tranche.
//
// LARGEUR PROPORTIONNELLE AU NOMBRE DE QUESTIONS. Une vignette qui couvre huit
// questions est quatre fois plus large que celle qui en couvre deux : le ruban
// se lit alors comme la barre de progression de l'exercice, et l'on voit du
// premier coup d'œil qu'un réglage passe l'essentiel du temps sur une seule
// marche. Trois vignettes de même taille auraient laissé croire à trois tiers.
//
// LE CALCUL N'EST PAS ICI. `core/apercuAide.js` déroule l'exercice avec les
// vraies règles ; ce fichier ne fait que le dessiner. Un aperçu qui recopie les
// règles est un aperçu qui se met à mentir dès qu'elles changent.

/**
 * UNE VRAIE QUESTION DANS LA VIGNETTE — et non trois barres grises.
 *
 * Rémy : « il faut le vrai aperçu ». Les rectangles disaient la FORME (combien
 * de propositions, un pavé ou non) et rien du CONTENU : on ne pouvait pas voir
 * qu'un réglage donnait « 6 + 3 × 4 » plutôt que « 2 + 3 », ni que les
 * distracteurs se ressemblaient trop. Or c'est cela qu'on regarde avant de
 * lancer une séance.
 *
 * On tire donc UNE question au vrai générateur, avec les réglages du palier.
 * Le tirage est à graine FIXE : sans elle, l'aperçu changerait de question à
 * chaque pixel de glissé et deviendrait illisible — on veut voir l'effet du
 * réglage, pas celui du hasard.
 *
 * Un générateur qui n'existe pas, qui refuse ces réglages ou qui met trop
 * longtemps ne casse rien : on retombe sur les rectangles, qui disent au moins
 * la forme.
 */
function vraieQuestion(exoId, p, params) {
    if (!exoId) return null;
    try {
        const exo = getExerciseById(exoId);
        const gen = exo && exo.generatorId ? getGenerator(exo.generatorId) : null;
        if (!gen || !gen.generate) return null;
        // Les réglages du palier PAR-DESSUS ceux de l'exercice : c'est le
        // palier qui décide du nombre de propositions et du clavier.
        const reglages = {
            ...(exo.params || {}), ...params,
            propositions: p.clavier ? 0 : (p.propositions === null ? undefined : p.propositions),
            saisie: p.clavier ? 'toujours' : 'jamais'
        };
        const it = gen.generate(reglages, { index: p.de - 1, rng: makeRng(`apercu-${exoId}-${p.de}`) });
        if (!it) return null;
        const texte = (it.prompt && (it.prompt.text || it.prompt.papier)) || '';
        // ON ROGNE COMME LA SESSION ROGNE. Le générateur rend toujours ses
        // distracteurs ; c'est le déroulé de l'exercice qui n'en garde que le
        // nombre voulu. Sans cela, l'aperçu montrait trois pastilles sous une
        // légende qui promettait « 2 propositions » — et un aperçu qui se
        // contredit lui-même est pire qu'un dessin gris.
        const brut = Array.isArray(it.choices) ? it.choices : [];
        const voulu = p.propositions === null ? brut.length : Math.max(2, p.propositions);
        const garde = brut.length > voulu
            // La bonne réponse d'abord, puis les distracteurs dans leur ordre :
            // on ne peut pas en retirer une au hasard, il faut garder la juste.
            ? [...brut.filter(c => c.correct), ...brut.filter(c => !c.correct)].slice(0, voulu)
            : brut;
        const choix = garde.map(c => String(c.label ?? c.value ?? '')).filter(Boolean);
        return { texte: String(texte).replace(/<[^>]*>/g, '').trim(), choix };
    } catch { return null; }
}

/**
 * LA STRUCTURE DE L'EXERCICE TIENT SUR UNE LIGNE, ET L'APERÇU SUIT LE DOIGT.
 *
 * Rémy, cinquième passage sur ce bloc : « chaque étape est présentée en ligne.
 * Et en dessous on a une ligne avec la structure de l'exercice et un slide qui,
 * lorsqu'on le déplace, montre l'aperçu sous une petite modale qui bouge avec
 * le slide. Il faut que ce soit clair. »
 *
 * LES TROIS CARTES ÉTAIENT LE PROBLÈME. Elles disaient tout — les rangs, la
 * vraie question, le compteur — mais empilées elles faisaient trois écrans sur
 * un téléphone, et l'on ne voyait JAMAIS la progression entière d'un coup
 * d'œil. Or c'est cela qu'un professeur regarde : la forme de l'escalier, pas
 * le détail d'une marche.
 *
 * UNE FRISE, DONC, où la largeur de chaque zone EST son nombre de questions.
 * On lit la progression comme on lit un diagramme : « il passe la moitié de
 * l'exercice à deux propositions », sans compter quoi que ce soit.
 *
 * ET LA BULLE REMPLACE LES TROIS APERÇUS. Une flèche court SOUS la frise ; la
 * bulle affiche la VRAIE question de ce rang-là, avec ses vraies propositions.
 * Un seul aperçu à la fois, mais on peut le promener partout — ce qui en
 * montre vingt au lieu de trois.
 *
 * LA FLÈCHE EST SOUS LA FRISE, ET C'EST RÉMY QUI L'A VU. Elle était d'abord un
 * trait DANS la bande, exactement comme les deux bornes : trois barres
 * verticales identiques, dont une seule ne se tirait pas, et rien pour dire
 * laquelle. « Je mettrai plutôt une flèche sous la frise pour naviguer
 * dessus » — ce qui sépare pour de bon ce qui SE RÈGLE de ce qui SE REGARDE.
 *
 * LA BULLE EST AU-DESSUS DE LA FRISE, jamais en dessous. Sur une tablette, le
 * doigt couvre ce qu'il touche : une bulle posée sous le point de contact
 * serait invisible exactement pendant qu'on la consulte.
 */

/**
 * COMBIEN DE PROPOSITIONS CET EXERCICE SAIT-IL FABRIQUER ?
 *
 * MESURÉ, PAS SUPPOSÉ : sur les douze premiers exercices à propositions, huit
 * en produisent quatre, un en produit trois, deux en produisent deux. Offrir
 * « 6 propositions » sur l'un d'eux, c'est écrire une légende que l'élève ne
 * verra jamais — `reduireChoix` ramènera de toute façon la liste à ce que le
 * générateur a fait. Une interface qui promet ce qu'elle ne tiendra pas est
 * pire qu'une interface pauvre : elle apprend à se méfier d'elle.
 *
 * TROIS TIRAGES, ET LE PLUS GRAND. Certains générateurs varient d'une question
 * à l'autre ; un seul échantillon fixerait le plafond sur un tirage maigre.
 */
const plafonds = new Map();

function plafondPropositions(exoId, params) {
    if (!exoId) return null;
    const cle = exoId + '|' + JSON.stringify(params || {});
    if (plafonds.has(cle)) return plafonds.get(cle);
    let max = null;
    try {
        const exo = getExerciseById(exoId);
        const gen = exo && exo.generatorId ? getGenerator(exo.generatorId) : null;
        if (gen && gen.generate) {
            for (let i = 0; i < 3; i++) {
                const it = gen.generate({ ...(exo.params || {}), ...params },
                    { index: i, rng: makeRng(`plafond-${exoId}-${i}`) });
                const n = (it && Array.isArray(it.choices)) ? it.choices.length : 0;
                if (n > (max || 0)) max = n;
            }
        }
    } catch { max = null; }
    plafonds.set(cle, max);
    return max;
}

/**
 * Les façons de répondre qu'on peut VRAIMENT offrir sur cet exercice.
 *
 * « Toutes les propositions » disparaît dès qu'on connaît le plafond : elle y
 * vaudrait exactement le plus grand nombre déjà proposé, et deux entrées qui
 * font la même chose sous deux noms différents ne sont pas un choix.
 */
function modesPossibles(exoId, params) {
    const max = plafondPropositions(exoId, params);
    if (!max) return MODES_ZONE.map(m => m.cle);
    return MODES_ZONE
        .filter(m => m.clavier || (m.propositions !== null && m.propositions <= max))
        .map(m => m.cle);
}

/** Le mode réellement applicable : on montre ce qui SE PASSERA. */
function modeTenable(cle, possibles) {
    if (possibles.includes(cle)) return cle;
    // Un réglage enregistré peut demander plus que l'exercice ne sait faire —
    // parce qu'il a changé de paramètres depuis. On affiche alors le plus
    // proche en dessous, qui est ce que l'élève verra pour de vrai.
    const i = MODES_ZONE.findIndex(m => m.cle === cle);
    for (let k = i - 1; k >= 0; k--) {
        if (possibles.includes(MODES_ZONE[k].cle)) return MODES_ZONE[k].cle;
    }
    return possibles[0] || MODES_ZONE[0].cle;
}

/**
 * LE CLAVIER SE DESSINE, IL NE S'ÉCRIT PAS.
 *
 * Rémy : « le clavier dans la frise ressemble à un -. » Il décrivait un vrai
 * défaut de rendu : le caractère ⌨ (U+2328) n'est présent dans presque aucune
 * police d'interface, et le navigateur le remplaçait par le glyphe le plus
 * proche qu'il trouvait — un trait. Au milieu de zones qui portent des
 * CHIFFRES, ce trait se lisait comme un moins.
 *
 * Un petit dessin en `currentColor` ne dépend d'aucune police, hérite du blanc
 * de la zone, et reste lisible à quinze pixels de large.
 */
const PAVE_SVG = '<svg class="cfg-pave" viewBox="0 0 24 16" aria-hidden="true">'
    + '<rect x="1" y="2.2" width="22" height="12.6" rx="2.4" fill="none"'
    + ' stroke="currentColor" stroke-width="1.6"/><g fill="currentColor">'
    + [[3.6, 4.7, 2.4], [7.2, 4.7, 2.4], [10.8, 4.7, 2.4], [14.4, 4.7, 2.4], [18, 4.7, 2.4],
        [5.4, 7.9, 2.4], [9, 7.9, 2.4], [12.6, 7.9, 2.4], [16.2, 7.9, 2.4],
        [6, 11.1, 12]]
        .map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="1.8" rx=".5"/>`)
        .join('')
    + '</g></svg>';

/** Les réglages d'aide d'une zone : c'est ce que la bulle doit montrer. */
function palierDeZone(zone) {
    const m = modeZone(zone.mode);
    return {
        clavier: m.clavier,
        propositions: m.clavier ? 4 : m.propositions,
        nom: m.nom
    };
}

/**
 * LA BULLE : la vraie question de la zone qu'on a choisie.
 *
 * Elle porte trois choses et pas une de plus — les rangs de la zone, la
 * question, les propositions. Y ajouter le nom du palier serait redondant : la
 * frise, juste en dessous, le dit par sa couleur.
 */
export function bulleApercuHtml(zones, i, params, total, exoId) {
    const k = Math.max(0, Math.min(zones.length - 1, i));
    const zone = zones[k] || { n: total, mode: '4' };
    let de = 1;
    for (let j = 0; j < k; j++) de += zones[j].n;
    const a = de + zone.n - 1;
    const p = palierDeZone(zone);
    const vraie = vraieQuestion(exoId, p, params);
    const pave = '<div class="cfg-bulle-pave">' + '<i></i>'.repeat(9) + '</div>';
    const corps = vraie
        ? `<div class="cfg-bulle-q">${escapeAttr(vraie.texte)}</div>`
        + (p.clavier ? pave
            : `<div class="cfg-bulle-choix">${vraie.choix.slice(0, 8).map(c =>
                `<b>${escapeAttr(c)}</b>`).join('')}</div>`)
        // SANS GÉNÉRATEUR, ON DESSINE LA FORME. Un exercice dont on ne peut pas
        // tirer de question à la volée doit quand même dire combien de cases
        // l'élève verra — c'est la moitié de l'information.
        : `<div class="cfg-bulle-q cfg-bulle-q--vide">${p.nom}</div>`
        + (p.clavier ? pave
            : `<div class="cfg-bulle-choix">${'<b>&nbsp;</b>'.repeat(p.propositions || 6)}</div>`);
    const rangs = zone.n === 1 ? `Question ${de}` : `Questions ${de} à ${a}`;
    return `<div class="cfg-bulle-rang">${rangs}</div>${corps}`;
}

/**
 * LES DEUX FAÇONS DE MENER LA PROGRESSION — et il faut CHOISIR, visiblement.
 *
 * Rémy : « mais du coup pour la progression, ok, propose le mode adaptatif
 * quand même, qu'en penses-tu ? »
 *
 * ET LES DEUX MODES NE SONT PAS DEUX RÉGLAGES DU MÊME OBJET. L'adaptatif ne
 * suit AUCUN calendrier : il monte l'élève d'un barreau après trois réussites
 * du premier coup, puis deux, et le redescend après deux ratés (voir `ECHELONS`
 * dans core/aide.js). Deux élèves de la même classe n'y font pas les mêmes
 * questions — ce qui est tout l'intérêt, et ce qu'aucun nombre écrit d'avance
 * ne peut rendre.
 */
const MODES_PROGRESSION = [
    {
        v: 'auto', nom: 'L’exercice s’adapte',
        dit: 'Il monte d’un cran après trois réussites, redescend après deux ratés. '
            + 'Chaque élève avance à son rythme.'
    },
    {
        v: 'defini', nom: 'Je définis',
        dit: 'Les mêmes questions pour toute la classe, dans l’ordre que tu écris.'
    }
];

function choixProgression(adaptatif) {
    return `<div class="cfg-progression">${MODES_PROGRESSION.map(m => `
        <button type="button" class="cfg-prog${(m.v === 'auto') === adaptatif ? ' cfg-prog--ici' : ''}"
            data-prog="${m.v}" aria-pressed="${(m.v === 'auto') === adaptatif}">
            <span class="cfg-prog-nom">${m.nom}</span>
            <span class="cfg-prog-dit">${m.dit}</span>
        </button>`).join('')}</div>`;
}

/** Le petit bouton réglage au-dessus de la frise, et ses modèles. */
function menuModeles() {
    // UN `details`, ET NON UN MENU MAISON. Il s'ouvre au clavier, se ferme à
    // Échap, ne demande aucun état à garder quelque part — et la frise se
    // redessine entièrement quand on choisit, ce qui le referme tout seul.
    return `<details class="cfg-modeles">
        <summary class="cfg-modeles-btn" title="Modèles de progression"
                 aria-label="Modèles de progression">${ICONE_REGLAGE}</summary>
        <div class="cfg-modeles-liste">
            <div class="cfg-modeles-titre">Appliquer un modèle</div>
            ${MODELES_FRISE.map(m => `<button type="button" class="cfg-modele"
                data-modele="${m.cle}">${m.nom}</button>`).join('')}
        </div>
    </details>`;
}

const ICONE_REGLAGE = '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">'
    + '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"'
    + ' d="M4 7h10M18 7h2M4 17h4M12 17h8"/>'
    + '<circle cx="16" cy="7" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/>'
    + '<circle cx="10" cy="17" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/>'
    + '</svg>';

/**
 * LA BANDE, SA LÉGENDE ET SA BULLE — tout le bloc « comment l'élève répond ».
 *
 * DEUX CAS, ET RIEN N'EST COMMUN AUX DEUX. Rémy, après six passages sur ce
 * panneau : « quand on a cliqué sur "l'exercice s'adapte", il n'y a pas
 * d'option, donc "un déroulé possible" n'apparaît pas. Quand on clique sur
 * "je définis", cela apparaît. »
 *
 * IL A RAISON, ET J'AVAIS PRIS LE PROBLÈME À L'ENVERS. Je montrais la frise
 * dans les deux modes, rayée en adaptatif pour dire « ceci n'est qu'un exemple
 * ». Mais une frise qu'on ne peut pas régler, sous un mode qui ne se règle
 * pas, n'est pas une aide : c'est une image qui a l'air d'une commande. En
 * adaptatif il n'y a RIEN à décider sur l'ordre des questions — c'est la
 * définition même du mode —, donc rien à afficher.
 *
 * `choisie` est l'INDICE DE LA ZONE choisie, pas un rang de question. Il vit
 * dans le DOM (`data-zone`) : deux panneaux peuvent être ouverts en même temps,
 * et une variable de module ferait sauter la sélection de l'un quand on touche
 * l'autre.
 */
export function apercuAideHtml(params, total, exoId = '', choisie = 0, reglable = true) {
    const ecrites = lireZones(params, total);

    // L'ADAPTATIF N'A PAS DE FRISE. Voir ci-dessus : il n'y a pas de déroulé à
    // montrer, parce qu'il n'y en a pas un seul.
    if (!ecrites) return reglable ? choixProgression(true) : '';

    const possibles = modesPossibles(exoId, params);
    // ON MONTRE CE QUI SE PASSERA, pas ce qui a été demandé : un mode enregistré
    // que l'exercice ne sait plus tenir s'affiche au plus proche en dessous.
    const zones = ecrites.map(z => ({ ...z, mode: modeTenable(z.mode, possibles) }));
    const i = Math.max(0, Math.min(zones.length - 1, Math.round(choisie) || 0));

    // LA FLÈCHE DE LA BULLE VISE LE CENTRE DE LA ZONE. Rémy : « quand tu
    // cliques sur une zone, tu as l'aperçu au-dessus, et la flèche de la bulle
    // de l'aperçu est au-dessus du centre horizontal de la zone. » C'est ce qui
    // rattache l'un à l'autre : sans elle, la bulle serait un panneau de plus,
    // posé au-dessus, sans lien visible avec ce qu'on vient de toucher.
    let avant = 0;
    for (let k = 0; k < i; k++) avant += zones[k].n;
    const centre = `${((avant + zones[i].n / 2) / total * 100).toFixed(3)}%`;

    let depart = 1;
    const bandes = zones.map((z, k) => {
        const m = modeZone(z.mode);
        const de = depart, a = depart + z.n - 1;
        depart += z.n;
        const rangs = z.n === 1 ? `question ${de}` : `questions ${de} à ${a}`;
        return `<button type="button" class="cfg-zone cfg-zone--${m.cle}${
            k === i ? ' cfg-zone--ici' : ''}" data-zone="${k}"
            title="${escapeAttr(`${m.nom} — ${rangs}`)}"
            style="flex-grow:${z.n}"><span>${m.clavier ? PAVE_SVG : (m.propositions ?? '∗')}</span></button>`;
    }).join('');

    // ENTRE CHAQUE ZONE, UN TRAIT QU'ON PEUT BOUGER. Rémy, mot pour mot. C'est
    // le geste qui manquait : on pouvait ajouter, retirer et changer une zone,
    // mais pas dire OÙ elle commence — il fallait passer par « ajouter », qui
    // coupait en deux parts égales, et recommencer. Une borne se prend et se
    // pose ; c'est la façon évidente de partager quinze questions en trois.
    let cumul = 0;
    const bornes = zones.slice(0, -1).map((z, k) => {
        cumul += z.n;
        return `<button type="button" class="cfg-borne" data-borne="${k}"
            style="left:${(cumul / total * 100).toFixed(3)}%"
            aria-label="${escapeAttr(`Limite après la question ${cumul}`)}"></button>`;
    }).join('');

    // La légende PORTE LES RANGS — l'information que Rémy réclamait depuis le
    // début, et qui reste lisible quand une zone est trop étroite pour son nom.
    let d2 = 1;
    const legende = zones.map((z, k) => {
        const m = modeZone(z.mode);
        const de = d2, a = d2 + z.n - 1;
        d2 += z.n;
        return `<span class="cfg-leg cfg-leg--${m.cle}${k === i ? ' cfg-leg--ici' : ''}">
            <i></i><b>${m.nom}</b><em>${z.n === 1 ? de : `${de} à ${a}`}</em></span>`;
    }).join('');

    // Le titre parle à celui qui lit : un écran d'élève qui parlerait d'un
    // élève à la troisième personne parlerait de quelqu'un d'autre que lui.
    const qui = reglable ? 'Ce que l\'élève verra' : 'Ce que tu verras';

    return `${reglable ? choixProgression(false) : ''}
        <div class="cfg-apercu-titre">
            <span>${qui}, sur ${total} question${total > 1 ? 's' : ''}</span>
            ${reglable ? menuModeles() : ''}
        </div>
        <!-- data-zone-ici, ET SURTOUT PAS data-zone : les zones de la frise
                 portent deja data-zone, et un closest('[data-zone]') lance
                 depuis un bouton de reglage remontait jusqu'a la scene. Tout
                 clic dans le bloc etait donc lu comme un clic de zone, qui
                 redessinait tout — et l'ecouteur suivant, celui des vraies
                 commandes, ne trouvait plus que des noeuds detaches. Aucun
                 reglage ne passait.
                 (Pas d'accent grave ici : ce commentaire vit DANS un
                 litteral de gabarit, et le premier le fermerait.) -->
        <div class="cfg-scene" data-scene data-zone-ici="${i}">
            <div class="cfg-bulle" data-bulle style="--cfg-bulle-x:${centre}">
                ${bulleApercuHtml(zones, i, params, total, exoId)}
            </div>
            <div class="cfg-bande" data-bande>${bandes}${reglable ? bornes : ''}</div>
            <div class="cfg-legendes">${legende}</div>
            ${reglable ? commandesZone(zones, i, possibles) : ''}
        </div>`;
}

/**
 * LES COMMANDES DE LA ZONE CHOISIE — et d'elle seule.
 *
 * Rémy : « quand on clique sur une zone, on a un switch proposition / clavier.
 * S'il est sur proposition, on peut choisir le nombre de propositions. On peut
 * ajouter ou supprimer des zones. »
 *
 * LE SWITCH D'ABORD, LE NOMBRE ENSUITE, ET LE NOMBRE DISPARAÎT AU CLAVIER.
 * C'était le défaut de la version d'avant : un seul bouton − / + parcourait
 * une échelle qui allait de « 2 propositions » jusqu'au clavier en passant par
 * « toutes ». Deux questions de nature différente sur le même axe — répond-on
 * en choisissant ou en écrivant ? et, si l'on choisit, parmi combien ? — donc
 * un « + » qui, au dernier cran, changeait de sujet sans prévenir.
 *
 * UNE SEULE ZONE À LA FOIS. La frise dit l'ensemble, cette ligne dit le détail
 * de ce qu'on touche, et rien d'autre n'est à l'écran.
 */
function commandesZone(zones, i, possibles = MODES_ZONE.map(x => x.cle)) {
    const zone = zones[i];
    const m = modeZone(zone.mode);
    let de = 1;
    for (let k = 0; k < i; k++) de += zones[k].n;
    const a = de + zone.n - 1;

    const props = possibles.filter(c => !modeZone(c).clavier);
    const j = props.indexOf(zone.mode);
    const nombre = m.clavier ? '' : `
        <div class="cfg-zligne">
            <span class="cfg-zdit">Nombre de propositions</span>
            <span class="cfg-zpas">
                <button type="button" class="cfg-zbtn" data-zprop="-1" ${j <= 0 ? 'disabled' : ''}
                        aria-label="Moins de propositions">−</button>
                <b>${m.propositions ?? 'toutes'}</b>
                <button type="button" class="cfg-zbtn" data-zprop="1"
                        ${j < 0 || j >= props.length - 1 ? 'disabled' : ''}
                        aria-label="Plus de propositions">+</button>
            </span>
        </div>`;

    return `<div class="cfg-zreglages">
        <div class="cfg-zligne">
            <span class="cfg-zquoi"><i class="cfg-zpuce cfg-zpuce--${m.cle}"></i>${
    zone.n === 1 ? `Question ${de}` : `Questions ${de} à ${a}`}</span>
            <span class="cfg-bascule" role="group" aria-label="Comment l'élève répond">
                <button type="button" class="cfg-bsc${m.clavier ? '' : ' cfg-bsc--ici'}"
                        data-zbascule="p" ${props.length ? '' : 'disabled'}
                        aria-pressed="${!m.clavier}">Propositions</button>
                <button type="button" class="cfg-bsc${m.clavier ? ' cfg-bsc--ici' : ''}"
                        data-zbascule="k" aria-pressed="${m.clavier}">Clavier</button>
            </span>
        </div>${nombre}
        <div class="cfg-zligne cfg-zligne--fin">
            <button type="button" class="cfg-zsupp" data-zsupp
                    ${zones.length <= 1 ? 'disabled' : ''}>✕ Retirer cette zone</button>
            <button type="button" class="cfg-zplus" data-zplus
                    ${zones.length >= ZONES_MAX || zone.n < 2 ? 'disabled' : ''}>+ Ajouter une zone</button>
        </div>
    </div>`;
}

/**
 * Les trois réglages d'aide, LUS DANS LE PANNEAU et non dans l'objet d'origine.
 *
 * C'est la seule lecture qui ne puisse pas se désynchroniser : l'aperçu montre
 * ce que les contrôles disent à cet instant, y compris pendant un glissé, sans
 * qu'aucun panneau ait à lui transmettre quoi que ce soit.
 */
function paramsAide(racine) {
    const lire = (id) => {
        const el = racine.querySelector(`[data-param="${id}"]`);
        if (!el) return undefined;
        // UN OUI / NON N'A PAS DE `.value` : c'est un `div` qui porte son état
        // dans `data-valeur`. On lisait `el.value` — donc `undefined` — et
        // « Autoriser le clavier » n'atteignait jamais l'aperçu : la frise
        // gardait sa zone violette alors que le réglage disait le contraire.
        if (el.dataset.kind === 'bool') return el.dataset.valeur === 'true';
        if (el.dataset.kind === 'echelle') return lireListe(el.dataset.valeurs)[Number(el.value)];
        return el.value;
    };
    // LA RÉPARTITION SE LIT DANS SON CHAMP CACHÉ, comme le reste. Elle n'y
    // était pas, et l'aperçu continuait donc de montrer les nombres du
    // préréglage pendant qu'on cliquait les compteurs : la valeur changeait,
    // l'image non.
    const champRep = racine.querySelector('[data-param="repartition"]');
    return {
        aide: lire('aide'), clavier: lire('clavier'),
        repartition: champRep ? champRep.value : 'auto'
    };
}

/**
 * Redessine l'aperçu d'un panneau, s'il en a un.
 *
 * `cranEssai` / `pourEssai` : le réglage qu'on SURVOLE sans l'avoir choisi.
 * L'aperçu montre alors ce qu'il donnerait, et rien n'est engagé — voir
 * `apercuDuCran`.
 */
export function rafraichirApercu(racine, zone) {
    const boite = racine && racine.querySelector('[data-apercu]');
    if (!boite) return;
    const nb = racine.querySelector('#cfg-nbitems');
    const total = Math.max(1, parseInt(nb && nb.value, 10) || 10);
    const hote = racine.closest && racine.closest('[data-exo]');
    const params = paramsAide(racine);
    // LA ZONE CHOISIE SURVIT AU REDESSIN. Sans cela, chaque pas de borne
    // renverrait la bulle sur la première zone : on tirerait une frontière en
    // regardant une question qui parle d'ailleurs.
    const scene = boite.querySelector('[data-scene]');
    const i = zone !== undefined ? zone
        : Math.max(0, Math.round(Number(scene && scene.dataset.zoneIci)) || 0);
    boite.innerHTML = apercuAideHtml(params, total,
        (hote && hote.dataset.exo) || (racine.dataset && racine.dataset.exo) || '', i,
        racine.dataset.role !== 'eleve');
    // « Autoriser le clavier » ne parle qu'à l'adaptatif : dès qu'il y a des
    // zones écrites, c'est la frise qui décide, et le bouton s'efface.
    //
    // ET UN ÉLÈVE NE SE L'AUTORISE PAS LUI-MÊME. C'est un choix de classe —
    // « on reste en propositions, on découvre la notion » — et le laisser sur
    // l'écran d'avant-partie serait offrir à l'élève d'éteindre la partie la
    // plus exigeante de son propre exercice.
    const eleve = racine.dataset.role === 'eleve';
    const siAuto = racine.querySelector('[data-si-auto]');
    if (siAuto) siAuto.hidden = eleve || !!lireZones(params, total);
    // UN TITRE SANS RIEN DESSOUS N'EST PAS UN TITRE. Côté élève, en adaptatif,
    // il n'y a ni frise (il n'y a pas de déroulé) ni réglage (ce n'est pas à
    // lui de régler) : « Comment tu réponds » surplombait alors le vide.
    const groupe = boite.closest && boite.closest('.cfg-sous-groupe');
    if (groupe) groupe.hidden = !boite.innerHTML.trim() && (!siAuto || siAuto.hidden);
}

/**
 * L'aperçu a-t-il quelque chose à montrer ? Seulement là où l'aide se règle :
 * une grille de sudoku ou un jeu autonome n'a ni propositions ni clavier, et
 * un ruban vide serait pire qu'une absence.
 */
export function aApercuAide(schema) {
    return (schema || []).some(p => p.id === 'aide');
}

// --- Infobulles -------------------------------------------------------------
//
// L'infobulle vit dans <body> et non à côté de son bouton : les panneaux qui
// la contiennent défilent, et un conteneur qui défile découpe tout ce qui en
// dépasse — le texte se retrouvait tronqué sur la gauche. Positionnée en
// `fixed` et recalée dans la fenêtre, elle ne peut plus être rognée.

let tipEl = null;

function tipNode() {
    if (!tipEl) {
        tipEl = document.createElement('div');
        tipEl.className = 'cfg-tip';
        tipEl.setAttribute('role', 'tooltip');
        document.body.appendChild(tipEl);
    }
    return tipEl;
}

function showTip(btn) {
    const texte = btn.dataset.tip;
    if (!texte) return;
    const el = tipNode();
    el.textContent = texte;
    el.classList.add('cfg-tip--on');

    const b = btn.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    const marge = 8;

    // Centrée sur le bouton, puis ramenée dans la fenêtre si elle déborde.
    let left = b.left + b.width / 2 - t.width / 2;
    left = Math.max(marge, Math.min(left, window.innerWidth - t.width - marge));

    // Au-dessus par défaut ; en dessous s'il n'y a pas la place.
    let top = b.top - t.height - 10;
    if (top < marge) top = b.bottom + 10;

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
}

function hideTip() {
    if (tipEl) tipEl.classList.remove('cfg-tip--on');
}

/** Survol et focus pour la souris et le clavier, clic pour le tactile. */
/**
 * LES INFOBULLES DE LA BARRE D'OUTILS — les vraies, pas celles du système.
 *
 * Rémy : « je pense qu'il faut rajouter des tooltip ». Les boutons portaient
 * bien un `title`, mais un `title` n'est pas une infobulle : il attend une
 * seconde avant de paraître, il s'affiche dans la police du système, et SUR
 * UNE TABLETTE IL N'EXISTE PAS — or c'est là que Rémy travaille. Une barre de
 * huit icônes sans légende lisible se devine, ou ne se devine pas.
 *
 * On recopie donc le `title` dans `data-tip` et l'on branche la même bulle que
 * les panneaux de réglages : au survol, au focus, et au TOUCHER. Le `title`
 * est retiré, sans quoi les deux se superposeraient.
 */
export function titrerEnInfobulles(root) {
    if (!root) return;
    root.querySelectorAll('[title]').forEach(btn => {
        if (btn.dataset.tip) return;
        btn.dataset.tip = btn.getAttribute('title');
        btn.removeAttribute('title');
        btn.addEventListener('mouseenter', () => showTip(btn));
        btn.addEventListener('mouseleave', hideTip);
        btn.addEventListener('focus', () => showTip(btn));
        btn.addEventListener('blur', hideTip);
        // Au doigt, la bulle paraît le temps de lire puis s'efface : le clic
        // fait son travail par ailleurs, on ne le détourne pas.
        btn.addEventListener('touchstart', () => {
            showTip(btn);
            setTimeout(hideTip, 1600);
        }, { passive: true });
    });
}

export function wireTips(root) {
    root.querySelectorAll('.cfg-info').forEach(btn => {
        btn.onmouseenter = () => showTip(btn);
        btn.onmouseleave = hideTip;
        btn.onfocus = () => showTip(btn);
        btn.onblur = hideTip;
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const ouverte = tipEl && tipEl.classList.contains('cfg-tip--on') && tipEl._pour === btn;
            if (ouverte) return hideTip();
            showTip(btn);
            tipNode()._pour = btn;
        };
    });
}

document.addEventListener('click', (e) => { if (!e.target.closest('.cfg-info')) hideTip(); });
// Une infobulle flottante ne suit pas son bouton : on la ferme dès que la
// page bouge sous elle.
window.addEventListener('scroll', hideTip, true);
window.addEventListener('resize', hideTip);

// --- Le pas-à-pas des nombres -----------------------------------------------
//
// Un seul écouteur posé sur <body> sert TOUS les panneaux, présents et à venir
// (réglages avant partie, propriétés d'étape, politique). Les panneaux se
// reconstruisent à chaque ouverture : brancher les champs après chaque rendu
// aurait multiplié les écouteurs sans jamais les retirer.

function borner(input, v) {
    const min = input.min !== '' ? Number(input.min) : -Infinity;
    const max = input.max !== '' ? Number(input.max) : Infinity;
    return Math.max(min, Math.min(max, v));
}

/** Le champ que commandent les boutons − / + : un nombre tapé, ou un rail. */
const champDe = (st) => st.querySelector('input[type="number"], input[type="range"]');

/** Une liste sérialisée dans un attribut ; jamais une exception si elle manque. */
function lireListe(brut) {
    if (!brut) return [];
    try { return JSON.parse(brut); } catch { return []; }
}

/**
 * Le libellé qui suit le curseur.
 *
 * `aria-valuetext` avec : sans lui, un lecteur d'écran annonce « 2 sur 4 » là
 * où il faut entendre « Progressive : 2, puis 4, puis le clavier ». Un rang
 * n'est pas une réponse à « qu'est-ce qui est réglé ? ».
 */
function majRail(rail) {
    const texte = rail.dataset.kind === 'echelle'
        ? (lireListe(rail.dataset.libelles)[Number(rail.value)] || '')
        : rail.value;
    const boite = rail.closest('.cfg-glissiere');
    const dit = boite && boite.querySelector('[data-dit]');
    // Un champ de saisie porte sa valeur dans `value`, pas dans son texte — et
    // l'on ne la réécrit pas si c'est LUI qu'on est en train de taper, sinon
    // le curseur d'écriture saute au début à chaque frappe.
    if (dit && dit.tagName === 'INPUT') {
        if (document.activeElement !== dit) dit.value = texte;
    } else if (dit) dit.textContent = texte;
    // Le rang suit le curseur : un « 3/4 » qui reste à 1/4 pendant qu'on glisse
    // serait pire que pas de rang du tout.
    const rang = boite && boite.querySelector('.cfg-glissiere-rang');
    if (rang) rang.textContent = `${Number(rail.value) + 1}/${Number(rail.max) + 1}`;
    // Le cran courant se marque aussi : une graduation qui ne suit pas la
    // poignée est une graduation qui ment.
    if (boite) {
        const ici = Number(rail.value);
        boite.querySelectorAll('.cfg-cran').forEach((c, k) =>
            c.classList.toggle('cfg-cran--ici', k === ici));
    }
    rail.setAttribute('aria-valuetext', texte);
}

/** Change la valeur ET prévient le panneau : sans `change`, rien n'est retenu. */
function pousser(input, delta) {
    const v = borner(input, (Number(input.value) || 0) + delta);
    if (v === Number(input.value)) return;
    input.value = String(v);
    // `input` PUIS `change` : le premier rafraîchit ce qui suit le geste
    // (le libellé du cran, l'aperçu), le second est celui que les panneaux
    // écoutent pour enregistrer. Un bouton − / + doit produire exactement ce
    // que produit le geste sur le rail, sinon les deux commandes du même
    // réglage n'ont pas les mêmes effets de bord.
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

// Oui / Non : un seul écouteur délégué, comme les autres commandes du panneau.
document.addEventListener('click', (e) => {
    const b = e.target.closest('.cfg-on');
    if (!b) return;
    e.preventDefault();
    const groupe = b.parentElement;
    groupe.dataset.valeur = b.dataset.bool;
    groupe.querySelectorAll('.cfg-on').forEach(x =>
        x.classList.toggle('cfg-on--actif', x.dataset.bool === b.dataset.bool));
    // UN OUI / NON DOIT S'ANNONCER COMME UN CHAMP. C'est `change` que le
    // panneau écoute pour enregistrer (`content.addEventListener('change',
    // commit)`) et pour refaire l'aperçu. Le nôtre ne le lançait pas : il
    // repeignait ses deux boutons, écrivait sa valeur dans `data-valeur`, et
    // s'arrêtait là. Le réglage n'était donc retenu QUE si le professeur
    // touchait ensuite à autre chose — sinon il refermait le panneau en
    // croyant l'avoir changé, et rien n'avait bougé.
    //
    // Ce n'était jamais très visible tant que les réglages Oui / Non
    // n'accompagnaient rien à l'écran. « Autoriser le clavier » le rend
    // flagrant : décoché, il doit rogner la frise sous les yeux du
    // professeur, et il ne se passait rien.
    groupe.dispatchEvent(new Event('change', { bubbles: true }));
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.cfg-step');
    if (!btn) return;
    const input = champDe(btn.parentElement);
    if (input) { e.preventDefault(); pousser(input, Number(btn.dataset.step)); }
});

// Les listes dépliantes : « tout cocher / tout décocher », et le résumé qui
// suit les cases. Écouteurs délégués, comme le reste du panneau — les champs
// sont reconstruits à chaque ouverture, brancher à la main les ferait
// s'empiler.
function majResumeListe(liste) {
    const boxes = [...liste.querySelectorAll('input[type="checkbox"]')];
    const resume = liste.querySelector('[data-resume]');
    if (!resume) return;
    resume.textContent = resumeListe(boxes.filter(b => b.checked).length, boxes.length,
        liste.dataset.mot || 'éléments');
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.cfg-liste-btn');
    if (!btn) return;
    e.preventDefault();
    const liste = btn.closest('.cfg-liste');
    liste.querySelectorAll('input[type="checkbox"]').forEach(b => { b.checked = btn.dataset.cocher === '1'; });
    majResumeListe(liste);
});

document.addEventListener('change', (e) => {
    const liste = e.target.closest && e.target.closest('.cfg-liste');
    if (liste) majResumeListe(liste);
});

// La molette : elle ne doit agir que sur un champ SURVOLÉ, jamais emporter la
// page avec elle — d'où le `preventDefault` et le `passive: false`.
document.addEventListener('wheel', (e) => {
    const st = e.target.closest('.cfg-stepper');
    if (!st) return;
    const input = champDe(st);
    if (!input) return;
    e.preventDefault();
    pousser(input, e.deltaY < 0 ? 1 : -1);
}, { passive: false });

// Le rail : son libellé le suit, et l'aperçu se refait pendant le geste. On
// écoute `input` (continu) et non `change` (au relâchement) — un aperçu qui
// n'apparaît qu'une fois le doigt levé ne sert plus à choisir, il sert à
// constater.
/**
 * ALLER À UN CRAN D'UN CLIC — et l'ESSAYER d'un survol.
 *
 * Rémy : « il faut pouvoir bouger les curseurs et on voit à quelle question
 * cela correspond, et quand on passe dessus ou que l'on clique si on est sur
 * tablette, c'est qu'on voit le VRAI aperçu ».
 *
 * Le survol n'ENGAGE rien : il montre. On garde donc le réglage réel de côté
 * et on le rend dès que le doigt ou la souris s'en va — sans quoi un simple
 * passage au-dessus du panneau changerait l'exercice.
 */
function allerAuCran(cran) {
    const glissiere = cran.closest('.cfg-glissiere');
    const rail = glissiere && glissiere.querySelector('.cfg-rail');
    if (!rail) return;
    const k = Number(cran.dataset.cran);
    rail.value = rail.dataset.kind === 'echelle'
        ? String(k)
        : String(lireListe(rail.dataset.valeurs)[k] ?? rail.value);
    majRail(rail);
    rail.dispatchEvent(new Event('input', { bubbles: true }));
    rail.dispatchEvent(new Event('change', { bubbles: true }));
}

document.addEventListener('click', (e) => {
    const cran = e.target.closest && e.target.closest('.cfg-cran');
    if (cran) { e.preventDefault(); return allerAuCran(cran); }
    // CHOISIR LA FAÇON DE MENER LA PROGRESSION — voir `MODES_PROGRESSION`.
    //
    // Les deux modes tiennent dans UN SEUL champ : une répartition écrite, ou
    // « auto ». Passer à « Je définis » y grave les nombres que l'adaptatif
    // aurait donnés en moyenne — le professeur part de quelque chose de sensé
    // au lieu d'une grille vide ; revenir à l'adaptatif les efface, et l'aveu
    // est franc : on rend la main à l'échelle, on ne garde pas un souvenir des
    // nombres qui laisserait croire qu'ils comptent encore.
    const prog = e.target.closest && e.target.closest('.cfg-prog');
    if (prog) {
        e.preventDefault();
        const hote = prog.closest('.cfg-apercu-hote');
        const champ = hote && hote.querySelector('[data-param="repartition"]');
        if (!champ) return;
        const nb = hote.querySelector('#cfg-nbitems');
        const total = Math.max(1, parseInt(nb && nb.value, 10) || 10);
        if (prog.dataset.prog === 'auto') champ.value = 'auto';
        else {
            const zones = lireZones({ repartition: champ.value }, total)
                || normaliserZones(zonesDuMode(paramsAide(hote), total), total);
            champ.value = ecrireZones(zones);
        }
        return rafraichirApercu(hote);
    }
});


// --- LA FRISE : CHOISIR UNE ZONE, TIRER UNE BORNE ---------------------------
//
// Rémy, en décrivant ce qu'il voulait depuis le début : « tu as la frise, la
// frise est séparée en zones, entre chaque zone tu as un trait que tu peux
// bouger. Quand tu cliques sur une zone, tu as l'aperçu au-dessus et la flèche
// de la bulle est au-dessus du centre horizontal de la zone. »
//
// DEUX GESTES, DEUX OBJETS, ET RIEN QUI SE RESSEMBLE. La zone se CLIQUE — on
// choisit celle qu'on règle, et la bulle vient se poser au-dessus d'elle. La
// borne se TIRE — on décide où l'une finit et où l'autre commence. Il n'y a
// plus de troisième objet : la tête de lecture qui se promenait question par
// question a disparu, parce qu'elle répondait à une question que personne ne
// se posait (« que verrait-on à la question 9 ? ») pendant que la vraie
// (« où commence le clavier ? ») n'avait pas de geste.

/** Le total de questions du panneau qui porte cette frise. */
const totalDe = (hote) => {
    const nb = hote && hote.querySelector('#cfg-nbitems');
    return Math.max(1, parseInt(nb && nb.value, 10) || 10);
};

/** Les zones courantes d'un panneau, écrites ou déduites du préréglage. */
function zonesDe(hote, total) {
    const champ = hote.querySelector('[data-param="repartition"]');
    return lireZones({ repartition: champ ? champ.value : 'auto' }, total)
        || normaliserZones(zonesDuMode(paramsAide(hote), total), total);
}

/** La zone que le panneau montre en ce moment. */
const zoneChoisie = (hote, zones) => {
    const scene = hote && hote.querySelector('[data-scene]');
    const v = Math.round(Number(scene && scene.dataset.zoneIci));
    return Math.max(0, Math.min(zones.length - 1, Number.isFinite(v) && v >= 0 ? v : 0));
};

/**
 * ÉCRIRE LES ZONES SANS FAIRE SAUTER LE DÉFILEMENT.
 *
 * Rémy, entre parenthèses : « attention à ce que cela ne fasse pas sauter le
 * scroll ». C'est le genre de détail qui décide si un panneau est utilisable :
 * remplacer le contenu d'une boîte remet son défilement à zéro, et le
 * professeur qui vient de cliquer une zone se retrouve renvoyé en haut, à
 * chercher où il en était. On note donc la position AVANT et on la repose
 * APRÈS — sur tous les ancêtres qui défilent, parce qu'on ne sait pas lequel
 * porte le défilement selon qu'on est sur téléphone ou sur ordinateur.
 */
function sansSauter(hote, faire) {
    const defilants = [];
    for (let el = hote; el; el = el.parentElement) {
        if (el.scrollHeight > el.clientHeight + 1) defilants.push([el, el.scrollTop]);
    }
    const y = window.scrollY;
    faire();
    const reposer = () => {
        defilants.forEach(([el, top]) => { if (el.scrollTop !== top) el.scrollTop = top; });
        if (window.scrollY !== y) window.scrollTo(window.scrollX, y);
    };
    reposer();
    // ET UNE SECONDE FOIS APRÈS LA MISE EN PAGE. Le premier repositionnement ne
    // suffit pas : le navigateur pratique l'ANCRAGE DU DÉFILEMENT — quand le
    // contenu au-dessus du point de lecture change de hauteur, il décale
    // `scrollTop` pour garder l'image stable, et il le fait APRÈS notre code.
    // Mesuré : trente-trois pixels de saut au premier clic sur une zone, alors
    // même qu'on venait de reposer la valeur.
    requestAnimationFrame(reposer);
}

function ecrireZonesSansSauter(hote, zones, i) {
    const champ = hote.querySelector('[data-param="repartition"]');
    if (!champ) return;
    sansSauter(hote, () => {
        champ.value = ecrireZones(zones);
        rafraichirApercu(hote, i);
        // Le panneau enregistre sur `change` : sans lui, tout ce qu'on règle
        // sur la frise resterait à l'écran sans jamais atteindre l'étape.
        champ.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

// CLIQUER UNE ZONE LA CHOISIT — et la bulle vient se poser au-dessus d'elle.
document.addEventListener('click', (e) => {
    const z = e.target.closest && e.target.closest('[data-zone]');
    if (!z) return;
    const hote = z.closest('.cfg-apercu-hote');
    if (!hote) return;
    e.preventDefault();
    sansSauter(hote, () => rafraichirApercu(hote, Number(z.dataset.zone)));
});

// --- LA BORNE QUI SE TIRE ---------------------------------------------------
//
// Une borne porte l'indice de la zone qui la précède : la tirer déplace des
// questions de l'une à l'autre SANS TOUCHER AU TOTAL. C'est la propriété qui
// compte — le nombre de questions se règle ailleurs, et lui seul ; une borne
// ne doit jamais pouvoir rallonger ni raccourcir l'exercice.

let borneTiree = null;

/** La position d'une borne sous le doigt : le rang après lequel elle tombe. */
function borneSousLeDoigt(bande, clientX, total) {
    const r = bande.getBoundingClientRect();
    if (!r.width) return null;
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return Math.round(t * total);
}

function poserBorne(hote, k, coupe) {
    const total = totalDe(hote);
    const zones = zonesDe(hote, total);
    if (!zones || k < 0 || k + 1 >= zones.length) return;
    let avant = 0;
    for (let j = 0; j < k; j++) avant += zones[j].n;
    // CHACUNE DES DEUX GARDE AU MOINS UNE QUESTION. Pousser une borne jusqu'au
    // bout ferait disparaître une zone en silence, alors qu'il existe un bouton
    // pour cela — et qu'une zone effacée par mégarde emporte son réglage.
    const bloc = zones[k].n + zones[k + 1].n;
    const pris = Math.max(1, Math.min(bloc - 1, Math.round(coupe) - avant));
    if (pris === zones[k].n) return;
    zones[k] = { ...zones[k], n: pris };
    zones[k + 1] = { ...zones[k + 1], n: bloc - pris };
    ecrireZonesSansSauter(hote, zones, zoneChoisie(hote, zones));
}

document.addEventListener('pointerdown', (e) => {
    const borne = e.target.closest && e.target.closest('[data-borne]');
    if (!borne) return;
    const hote = borne.closest('.cfg-apercu-hote');
    if (!hote) return;
    // PAS DE `setPointerCapture`. La frise se redessine pendant le geste, et la
    // capture serait posée sur l'élément qu'on vient de jeter ; l'écouteur au
    // niveau du document, lui, survit à tous les redessins.
    borneTiree = { hote, k: Number(borne.dataset.borne) };
    e.preventDefault();
});

document.addEventListener('pointermove', (e) => {
    if (!borneTiree) return;
    // LA BANDE SE RELIT À CHAQUE FOIS. Elle est remplacée à chaque pas de la
    // borne : garder l'élément d'origine, c'est mesurer un nœud détaché, dont
    // la largeur vaut zéro — et la borne saute alors au bout de la frise dès le
    // premier mouvement. C'est arrivé, et c'est ce qui coûte le plus cher à
    // diagnostiquer sur ce genre de geste.
    const bande = borneTiree.hote.querySelector('[data-bande]');
    if (!bande) return;
    const coupe = borneSousLeDoigt(bande, e.clientX, totalDe(borneTiree.hote));
    if (coupe !== null) poserBorne(borneTiree.hote, borneTiree.k, coupe);
});
document.addEventListener('pointerup', () => { borneTiree = null; });
document.addEventListener('pointercancel', () => { borneTiree = null; });

// Les flèches du clavier sur une borne : le même geste, sans souris.
document.addEventListener('keydown', (e) => {
    const borne = e.target.closest && e.target.closest('[data-borne]');
    if (!borne || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const hote = borne.closest('.cfg-apercu-hote');
    if (!hote) return;
    e.preventDefault();
    const total = totalDe(hote);
    const zones = zonesDe(hote, total);
    const k = Number(borne.dataset.borne);
    let coupe = 0;
    for (let j = 0; j <= k && j < zones.length; j++) coupe += zones[j].n;
    poserBorne(hote, k, coupe + (e.key === 'ArrowRight' ? 1 : -1));
});

// --- LES COMMANDES DE LA ZONE CHOISIE — voir `commandesZone` ----------------

document.addEventListener('click', (e) => {
    const btn = e.target.closest
        && e.target.closest('[data-zbascule], [data-zprop], [data-zsupp], [data-zplus]');
    if (!btn || btn.disabled) return;
    const hote = btn.closest('.cfg-apercu-hote');
    if (!hote) return;
    e.preventDefault();
    const total = totalDe(hote);
    const zones = zonesDe(hote, total);
    const i = zoneChoisie(hote, zones);
    const poss = modesPossibles(hote.dataset.exo || '', paramsAide(hote));
    const props = poss.filter(c => !modeZone(c).clavier);

    // LE SWITCH PROPOSITIONS / CLAVIER. Rémy : « quand on clique sur une zone,
    // on a un switch proposition/clavier ; s'il est sur proposition on peut
    // choisir le nombre de proposition ». Ce sont deux questions distinctes, et
    // les mettre sur le même axe — comme le faisait le − / + d'avant — donnait
    // un bouton qui changeait de sujet au dernier cran.
    if (btn.dataset.zbascule !== undefined) {
        const versClavier = btn.dataset.zbascule === 'k';
        if (modeZone(zones[i].mode).clavier === versClavier) return;
        // EN REVENANT AUX PROPOSITIONS, ON REPREND QUATRE — le cas ordinaire —
        // ou le plus grand nombre que cet exercice sache produire s'il n'y
        // arrive pas. Repartir de deux ferait reculer sans qu'on l'ait demandé.
        //
        // MAIS JAMAIS LE MODE D'UNE VOISINE. Mesuré : sur « clavier, 4, clavier »,
        // rebasculer la première zone en propositions lui donnait quatre — donc
        // exactement sa voisine —, les deux fondaient à la normalisation, et la
        // frise passait de trois zones à deux. Le professeur croyait changer une
        // zone, il en perdait une. On prend alors le plus proche voisinage libre.
        const voisins = [zones[i - 1], zones[i + 1]].filter(Boolean).map(z => z.mode);
        const libres = props.filter(c => !voisins.includes(c));
        const retour = libres.includes('4') ? '4'
            : (libres[libres.length - 1] || (props.includes('4') ? '4' : props[props.length - 1]));
        if (!versClavier && !retour) return;
        zones[i] = { ...zones[i], mode: versClavier ? 'k' : retour };
        return ecrireZonesSansSauter(hote, normaliserZones(zones, total), i);
    }

    // LE NOMBRE DE PROPOSITIONS — parmi ceux que l'exercice sait VRAIMENT
    // fabriquer. Offrir « 6 » à un générateur qui n'en produit que quatre
    // écrirait une légende que l'élève ne verrait jamais.
    if (btn.dataset.zprop !== undefined) {
        const j = props.indexOf(zones[i].mode);
        const k = Math.max(0, Math.min(props.length - 1,
            (j < 0 ? 0 : j) + Number(btn.dataset.zprop)));
        if (props[k] === zones[i].mode) return;
        zones[i] = { ...zones[i], mode: props[k] };
        return ecrireZonesSansSauter(hote, normaliserZones(zones, total), i);
    }

    if (btn.dataset.zsupp !== undefined) {
        if (zones.length <= 1) return;
        // RETIRER UNE ZONE REND SES QUESTIONS À LA VOISINE, celle d'avant si
        // elle existe. Les perdre raccourcirait l'exercice sans qu'on l'ait
        // demandé — le nombre de questions se règle ailleurs, et lui seul.
        const rendues = zones[i].n;
        zones.splice(i, 1);
        const voisine = Math.max(0, i - 1);
        zones[voisine] = { ...zones[voisine], n: zones[voisine].n + rendues };
        return ecrireZonesSansSauter(hote, normaliserZones(zones, total), voisine);
    }

    // AJOUTER UNE ZONE : elle naît APRÈS celle qu'on regarde, et prend la
    // moitié de ses questions. Une zone de zéro question n'existe pas — elle
    // disparaîtrait à la normalisation —, et lui donner des questions prises
    // ailleurs qu'à sa voisine déplacerait toute la progression.
    if (zones.length >= ZONES_MAX) return;
    const source = zones[i];
    if (source.n < 2) return;
    const prise = Math.floor(source.n / 2);
    // LA NOUVELLE ZONE DOIT ÊTRE DIFFÉRENTE DE SES VOISINES, sinon elle fond
    // avec elles à la normalisation et le bouton semble ne rien faire. On prend
    // le mode d'après ; si la source est déjà au bout de l'échelle, celui
    // d'avant. S'il n'y a qu'un mode possible, il n'y a rien à découper.
    const j = Math.max(0, poss.indexOf(source.mode));
    const suivante = zones[i + 1];
    const candidats = [poss[j + 1], poss[j - 1]].filter(Boolean)
        .filter(m => m !== source.mode && (!suivante || m !== suivante.mode));
    if (!candidats.length) return;
    zones[i] = { ...source, n: source.n - prise };
    zones.splice(i + 1, 0, { n: prise, mode: candidats[0] });
    ecrireZonesSansSauter(hote, normaliserZones(zones, total), i + 1);
});

// --- LES MODÈLES DE FRISE — voir `MODELES_FRISE` dans core/aide.js ----------
document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-modele]');
    if (!btn) return;
    const hote = btn.closest('.cfg-apercu-hote');
    if (!hote) return;
    e.preventDefault();
    const total = totalDe(hote);
    const zones = zonesDuModele(btn.dataset.modele, total);
    if (!zones) return;
    // ON RABAT SUR CE QUE L'EXERCICE SAIT FAIRE. Un modèle est écrit une fois
    // pour tout le catalogue ; « QCM 4 » sur un exercice qui n'a que deux
    // réponses possibles doit donner deux, pas une promesse.
    const poss = modesPossibles(hote.dataset.exo || '', paramsAide(hote));
    const tenables = zones.map(z => ({ ...z, mode: modeTenable(z.mode, poss) }));
    ecrireZonesSansSauter(hote, normaliserZones(tenables, total), 0);
});

document.addEventListener('input', (e) => {
    // Le nombre tapé au bout du rail : il pousse le rail, qui refait le reste.
    const saisie = e.target.closest && e.target.closest('.cfg-glissiere-saisie');
    if (saisie) {
        const cible = document.getElementById(saisie.dataset.pour);
        const v = Number(saisie.value);
        if (cible && Number.isFinite(v)) {
            cible.value = String(Math.max(Number(cible.min), Math.min(Number(cible.max), v)));
            cible.dispatchEvent(new Event('input', { bubbles: true }));
            cible.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    const rail = e.target.closest && e.target.closest('.cfg-rail');
    if (rail) majRail(rail);
    const hote = e.target.closest && e.target.closest('.cfg-apercu-hote');
    if (hote) rafraichirApercu(hote);
});
document.addEventListener('change', (e) => {
    const hote = e.target.closest && e.target.closest('.cfg-apercu-hote');
    if (hote) rafraichirApercu(hote);
});

// Le glissé vertical sur le champ : le geste du curseur de volume. Utile au
// doigt sur tablette, où viser deux petits boutons est moins naturel que
// pousser le nombre vers le haut.
let glisse = null;
document.addEventListener('pointerdown', (e) => {
    const st = e.target.closest('.cfg-stepper');
    if (!st || e.target.closest('.cfg-step')) return;
    const input = st.querySelector('input[type="number"]');
    if (!input) return;
    glisse = { input, y: e.clientY, depart: Number(input.value) || 0, bouge: false };
});
document.addEventListener('pointermove', (e) => {
    if (!glisse) return;
    const d = Math.round((glisse.y - e.clientY) / 14);   // 14 px = un cran
    if (!d) return;
    glisse.bouge = true;
    const v = borner(glisse.input, glisse.depart + d);
    if (v !== Number(glisse.input.value)) {
        glisse.input.value = String(v);
        // `input` PUIS `change`, exactement comme `pousser`. Le glissé
        // n'émettait que le second : sur le nombre de questions, la borne du
        // rail du quota, l'unité (« question » / « questions ») et la durée
        // annoncée ne se remettaient à jour qu'aux boutons — le même réglage
        // n'avait pas les mêmes effets selon la façon de le changer.
        glisse.input.dispatchEvent(new Event('input', { bubbles: true }));
        glisse.input.dispatchEvent(new Event('change', { bubbles: true }));
    }
});
document.addEventListener('pointerup', () => {
    // Un glissé n'ouvre pas le clavier : sinon il masquerait le nombre qu'on
    // vient de régler au doigt.
    if (glisse && glisse.bouge) glisse.input.blur();
    glisse = null;
});
document.addEventListener('pointercancel', () => { glisse = null; });

/**
 * LA VALEUR D'UN CHOIX EST CELLE DE L'OPTION, PAS UNE DEVINETTE SUR LA LISTE.
 *
 * Le DOM ne rend que des chaînes : « 2 » et « ia » en sortent pareils. On
 * décidait donc du type en regardant la PREMIÈRE option — si elle était un
 * nombre, tout le menu passait par `Number()`. Sur « Qui joue ? », dont les
 * choix sont `2`, `'ia'` et `1`, cela transformait « Contre l'ordinateur » en
 * `NaN` : le jeu ne se reconnaissait plus, retombait sur deux joueurs, et
 * l'ordinateur ne jouait jamais. C'est le bug que Rémy a vu.
 *
 * La valeur choisie est forcément l'une des options : on la retrouve par
 * comparaison de chaînes et on rend l'ORIGINALE, avec son type. Plus aucune
 * liste mixte ne peut se faire abîmer.
 */
function valeurChoisie(param, brut) {
    const trouvee = (param.options || []).find(o => String(valeurOption(o)) === String(brut));
    if (trouvee !== undefined) return valeurOption(trouvee);
    // Une valeur hors liste (un champ nombre, ou un réglage ancien) : on garde
    // l'ancienne règle, qui est juste dans ce cas-là.
    return param.type === 'number' ? Number(brut) : brut;
}

export function readParams(root, schema) {
    const out = {};
    schema.forEach(param => {
        if (param.type === 'multiselect') {
            const boxes = [...root.querySelectorAll(`[data-param="${param.id}"][data-kind="multiselect"]`)];
            out[param.id] = boxes.filter(b => b.checked).map(b => valeurChoisie(param, b.value));
        } else {
            const el = root.querySelector(`[data-param="${param.id}"]`);
            if (!el) return;
            if (el.dataset.kind === 'bool') { out[param.id] = el.dataset.valeur === 'true'; return; }
            // UNE GLISSIÈRE D'ÉCHELLE PORTE LE RANG, PAS LA VALEUR : les
            // valeurs d'un menu ne sont pas des nombres (« auto », « toutes »)
            // et n'ont donc pas de place sur un axe. On relit la liste écrite
            // dans l'attribut plutôt que le schéma reçu, pour que la valeur
            // rendue soit forcément celle que le rail montrait.
            if (el.dataset.kind === 'echelle') {
                const valeurs = lireListe(el.dataset.valeurs);
                out[param.id] = valeurChoisie(param, valeurs[Number(el.value)] ?? valeurs[0]);
                return;
            }
            if (param.type === 'number') { out[param.id] = Number(el.value); return; }
            out[param.id] = valeurChoisie(param, el.value);
        }
    });
    return out;
}

// --- Panneau « propriétés d'une étape » (éditeur professeur) ----------------

/**
 * Le nombre d'unités que PROPOSE une étape qui n'en fixe pas.
 *
 * Rémy : « mais du coup 10 paires c'est très court ». Dix était le nombre de
 * questions, et il valait pour tout le monde ; l'activité dit maintenant son
 * compte naturel, et le générateur, sa progression.
 */
export function conseilEtape(step) {
    const exo = getExerciseById(step && step.exerciseId) || (step && step.exercise) || {};
    return questionsConseillees(
        exo.generatorId ? getGenerator(exo.generatorId) : null,
        { ...(exo.params || {}), ...((step && step.overrides) || {}) },
        { activite: exo.activityId });
}

/**
 * @param {Object} step - étape v2 { exerciseId, overrides, nbItems, threshold, weight, timeLimit }
 * @param {(step:Object)=>void} onSave
 */
export function renderGameConfigUI(step, onSave, containerId = 'builder-config-content', opts = {}) {
    const content = document.getElementById(containerId);
    if (!content) return;

    // LE MODE DU PARCOURS CHANGE CE PANNEAU. En évaluation, « bonnes réponses
    // exigées » ne veut rien dire : une interrogation ne se valide pas étape
    // par étape, elle se note. Le constructeur nous le passe ; à défaut, on
    // suppose l'entraînement, qui est le cas ordinaire.
    const evaluation = opts.mode === MODES.EVALUATION;

    const exo = getExerciseById(step.exerciseId) || step.exercise || {};
    const schema = paramSchemaOf(exo);
    const current = { ...(exo.params || {}), ...(step.overrides || {}) };
    const nbEtape = step.nbItems || conseilEtape(step);
    const blocLongueur = glissiereDouble({
        idQuestions: 'cfg-nbitems', idExigees: 'cfg-threshold',
        label: evaluation ? 'Nombre de questions' : 'Questions et réussite exigée',
        aideId: 'cfg-threshold-tip',
        min: MIN_ETAPE, max: MAX_ETAPE,
        questions: nbEtape,
        // Le rail garde une valeur MÊME SANS QUOTA : sept sur dix, pour que
        // recocher l'interrupteur propose quelque chose de sensé au lieu de
        // repartir à « il faut tout réussir ».
        exigees: quotaDemande(step) ? step.threshold : Math.ceil(nbEtape * 0.7),
        quota: quotaDemande(step),
        evaluation, exoId: exo.id || ''
    });

    // LA LONGUEUR AVANT LA STRUCTURE. Rémy : « vaut-il pas mieux mettre le
    // nombre de questions AVANT la structure ? »
    //
    // Oui, et pour une raison de fond : la structure DÉCOUPE la longueur. Poser
    // le découpage avant le total, c'est demander « combien pour la première
    // marche ? » à quelqu'un qui ne sait pas encore combien de marches il a. Le
    // panneau se lit donc dans l'ordre où l'on décide : de quoi parlent les
    // questions, combien il y en a, comment l'élève y répond.
    const valeurDe = (p) => (current[p.id] !== undefined ? current[p.id] : p.default);
    const libre = schema.filter(p => !p.groupe);
    const groupes = schema.filter(p => p.groupe);

    content.innerHTML = `
        <div class="cfg-header">${exo.title || step.exerciseId}</div>
        ${exo.instruction ? `<p class="cfg-desc">${exo.instruction}</p>` : ''}
        ${libre.length ? `<div class="cfg-group">
            <div class="cfg-group-title">Contenu des questions</div>
            ${champsSchema(libre, valeurDe)}
        </div>` : ''}

        <div class="cfg-group">
            <div class="cfg-group-title">Longueur de l'étape</div>
            <div id="cfg-champ-seuil">${blocLongueur}</div>
        </div>

        ${groupes.length ? `<div class="cfg-group">
            ${champsSchema(groupes, valeurDe, { titres: TITRES_GROUPE })}
        </div>` : ''}
        ${!schema.length ? '<p class="cfg-empty">Cette activité n\'a pas de paramètre de contenu.</p>' : ''}

        <div class="cfg-group cfg-group--bonus">
            <div class="cfg-group-title">Rôle de l'étape</div>
            <label class="cfg-case cfg-case--bonus">
                <input type="checkbox" id="cfg-bonus" ${step.bonus ? 'checked' : ''}>
                <span><b>🎁 Jeu de récompense</b><br>
                <span class="cfg-help">Cette étape n'est pas du travail : elle ne compte pas dans
                la note et ne s'ouvre que si les exercices placés AVANT elle sont réussis.</span></span>
            </label>
        </div>

        <div class="cfg-group" id="cfg-groupe-deroulement">
            <div class="cfg-group-title" id="cfg-titre-deroulement">Déroulement de l'étape</div>
            <p class="cfg-help" id="cfg-note-bonus" style="display:none">
                Une récompense doit quand même s'arrêter : donne-lui un nombre de
                questions, une durée, ou les deux — le premier atteint met fin au jeu.
            </p>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-timelimit">Chronomètre (s)
                    ${infoBtn('0 = aucun chronomètre. Sinon, la durée en secondes.', null)}</label>
                <input type="number" id="cfg-timelimit" class="cfg-input cfg-input--num" min="0" max="600" value="${step.timeLimit || 0}">
            </div>
            <div class="cfg-field" id="cfg-scope-field">
                <label class="cfg-label" for="cfg-timescope">Le chrono s'applique
                    ${infoBtn(SCOPE_TIP, null)}</label>
                <select id="cfg-timescope" class="cfg-input">
                    <option value="etape" ${step.timerScope !== 'question' ? 'selected' : ''}>à toute l'étape</option>
                    <option value="question" ${step.timerScope === 'question' ? 'selected' : ''}>à chaque question</option>
                </select>
            </div>
            <div class="cfg-field" id="cfg-champ-poids">
                <label class="cfg-label" for="cfg-weight">Poids dans la note
                    ${infoBtn('Une étape de poids 2 compte double dans le barème.', null)}</label>
                <input type="number" id="cfg-weight" class="cfg-input cfg-input--num" min="1" max="10" value="${step.weight || 1}">
            </div>
        </div>`;

    content.classList.toggle('cfg-apercu-hote', aApercuAide(schema));
    // DE QUEL EXERCICE ON PARLE. Rémy : « il faut le vrai aperçu ». Le ruban
    // dessinait des rectangles gris — il ne savait rien de l'exercice, donc il
    // ne pouvait rien montrer d'autre. On le lui dit ici, et il va chercher une
    // VRAIE question au générateur.
    content.dataset.exo = exo && exo.id ? exo.id : '';

    // L'explication du seuil est chiffrée avec les valeurs courantes, et suit
    // la saisie : « 7 sur 10 » parle, « seuil » ne dit rien.
    const describeThreshold = () => {
        const tip = document.getElementById('cfg-threshold-tip');
        if (!tip) return;
        const nb = intVal('cfg-nbitems', 10);
        if (evaluation) {
            tip.dataset.tip = 'En évaluation, une étape ne se valide pas : elle se note. '
                + 'La poignée du seuil n\'a donc pas lieu d\'être — l\'élève répond aux '
                + `${nb} questions, et le bilan dit ce qu'il a réussi.`;
            return;
        }
        const boite = document.querySelector('[data-duo-boite]');
        const coche = boite && boite.querySelector('[data-duo-quota]');
        if (coche && !coche.checked) {
            tip.dataset.tip = `Sans quota, l'étape se valide dès que l'élève a répondu aux `
                + `${nb} questions, juste ou faux. C'est ce qu'on veut pour un entraînement : `
                + `on s'exerce, on ne trie pas. Coche le quota pour exiger un nombre de bonnes `
                + `réponses.`;
            return;
        }
        const seuil = Math.min(intVal('cfg-threshold', nb), nb);
        tip.dataset.tip = `Tape le nombre de questions, puis tire la poignée pour dire combien `
            + `de bonnes réponses tu exiges. L'élève doit en réussir ${seuil} `
            + `sur ${nb} pour valider l'étape ; en dessous, il la rejoue.`;
    };

    // Le choix « à chaque question / à toute l'étape » n'a de sens que s'il y
    // a un chronomètre.
    const toggleScope = () => {
        const field = document.getElementById('cfg-scope-field');
        if (field) field.style.display = intVal('cfg-timelimit', 0) > 0 ? '' : 'none';
    };

    // UN JEU DE RÉCOMPENSE N'A NI SEUIL NI POIDS : il ne se valide pas et ne
    // se note pas. Laisser ces deux champs visibles laisserait croire le
    // contraire.
    //
    // MAIS IL A UNE DURÉE. On cachait tout le bloc « Déroulement », donc le
    // nombre de questions ET le chronomètre avec — un Tetris de récompense
    // partait alors sur la valeur par défaut, sans que le professeur puisse
    // dire « cinq minutes » ni « dix questions ». Rémy : « pour les jeux bonus
    // il faut pouvoir choisir un nombre de questions et/ou une durée ». Ce
    // sont justement les deux seuls réglages qui comptent pour une récompense.
    const toggleBonus = () => {
        const bonusEl = document.getElementById('cfg-bonus');
        const bonus = !!(bonusEl && bonusEl.checked);
        const cacher = (id, off) => {
            const el = document.getElementById(id);
            if (el) el.style.display = off ? 'none' : '';
        };
        // LA RÉCOMPENSE GARDE SON NOMBRE DE QUESTIONS, ELLE PERD SON SEUIL.
        // On cachait tout le champ, donc les deux poignées : un Tetris de
        // récompense repartait sur la valeur par défaut, et Rémy avait
        // justement demandé « pour les jeux bonus il faut pouvoir choisir un
        // nombre de questions et/ou une durée ». Seule la poignée du seuil s'en
        // va, comme en évaluation — un jeu ne se valide pas non plus.
        const duo = content.querySelector('[data-duo-boite]');
        if (duo) {
            duo.classList.toggle('cfg-etape--sans-seuil', bonus || evaluation);
            majDuo(duo);
        }
        cacher('cfg-champ-poids', bonus);
        const note = document.getElementById('cfg-note-bonus');
        if (note) note.style.display = bonus ? '' : 'none';
        const titre = document.getElementById('cfg-titre-deroulement');
        if (titre) titre.textContent = bonus ? 'Quand la récompense s\'arrête' : 'Déroulement de l\'étape';
    };

    const commit = () => {
        const overrides = readParams(content, schema);
        const nbItems = intVal('cfg-nbitems', 10);
        describeThreshold();
        toggleScope();
        toggleBonus();
        const scope = document.getElementById('cfg-timescope');
        const bonusEl = document.getElementById('cfg-bonus');
        const bonus = !!(bonusEl && bonusEl.checked);
        onSave({
            ...step,
            overrides,
            // Ni l'évaluation ni la récompense n'exigent de bonnes réponses :
            // `threshold` y vaut `null`, c'est-à-dire aucune exigence.
            ...seuilPourMode({
                questions: nbItems, exigees: intVal('cfg-threshold', nbItems),
                evaluation: evaluation || bonus,
                // L'INTERRUPTEUR DÉCIDE, PAS LA VALEUR DU RAIL. Décoché, il
                // écrit `threshold: null` — l'absence d'exigence — même si le
                // rail garde un nombre sous la main pour le jour où on le
                // recoche. Relire le rail aurait ressuscité un quota que le
                // professeur venait justement d'éteindre.
                quota: quotaCoche(content.querySelector('[data-duo-boite]')),
                max: MAX_ETAPE
            }),
            timeLimit: intVal('cfg-timelimit', 0) || null,
            timerScope: scope ? scope.value : 'etape',
            weight: intVal('cfg-weight', 1),
            bonus
        });
    };

    describeThreshold();
    toggleScope();
    toggleBonus();
    rafraichirApercu(content);
    wireTips(content);
    content.addEventListener('change', commit);
    content.addEventListener('keyup', e => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'number') commit();
    });
}

// --- Réglages avant partie (élève) ------------------------------------------

/**
 * LA FENÊTRE DE RÉGLAGES D'AVANT-PARTIE — pour l'élève comme pour le
 * professeur. Elle s'appelait `showStudentConfigModal` et n'était offerte
 * qu'aux élèves ; le professeur, lui, tombait sur le panneau du constructeur
 * de parcours, qui n'est pas dans la page quand on vient du catalogue. Rien
 * là-dedans n'est propre à l'élève : ce sont les réglages de l'exercice, le
 * nombre de questions, et de quoi partir sur papier.
 *
 * L'identifiant DOM `student-config-modal` reste tel quel : il est cité une
 * cinquantaine de fois dans les feuilles de style, dont tout le volet
 * téléphone, et le renommer ferait courir un risque de mise en page pour un
 * gain de vocabulaire.
 */
export function ouvrirReglagesAvantPartie(exo, onStart) {
    const modal = document.getElementById('student-config-modal');
    const content = document.getElementById('student-config-content');
    if (!modal || !content) return onStart({ ...(exo.params || {}) });

    const schema = paramSchemaOf(exo);
    const current = { ...(exo.params || {}) };

    // Travailler sur papier : proposé quand l'exercice s'y prête, c'est-à-dire
    // dans deux cas — une GRILLE déclarée imprimable au catalogue, ou un
    // générateur dont les énoncés se suffisent en texte (`ecrit`). Le bouton
    // ouvre une modale d'aperçu ; les réglages choisis ICI (tables, opérations,
    // difficulté) sont ceux de la fiche, il n'y a pas deux endroits à régler.
    const gen = generateurDeFiche(exo);
    const surPapier = exo.printable ? 'grille' : (gen && gen.ecrit ? 'ecrit' : null);
    const impression = surPapier ? `
        <button type="button" class="cfg-print-btn cfg-print-btn--seul" id="btn-print-sheet">
            ${surPapier === 'ecrit' ? '📝 Fiche d\'exercices à imprimer…' : '📄 Travailler sur papier…'}
        </button>` : '';

    // SIMPLE DEVANT, AFFINABLE DERRIÈRE.
    //
    // Un panneau qui montre tout à tout le monde impose à chaque professeur le
    // niveau de détail du plus exigeant. On met donc devant ce qui se décide
    // en cinq secondes avant de distribuer les tablettes, et on replie le
    // reste sous « Affiner… ».
    //
    // MAIS UN REPLI NE CACHE JAMAIS CE QUI A ÉTÉ MODIFIÉ. Un réglage qui
    // s'écarte de son défaut et qu'on ne voit plus, c'est un exercice qui se
    // comporte bizarrement sans qu'on sache pourquoi — la même famille de
    // panne que les réglages sans effet corrigés cette semaine. Le repli
    // s'ouvre donc DÉJÀ OUVERT dès qu'il contient une valeur modifiée, et le
    // compte est écrit sur sa poignée.
    // COMBIEN DE QUESTIONS POUR VOIR TOUT L'EXERCICE.
    //
    // Dix, quoi qu'il arrive, tronquait toutes les progressions : « Additionner
    // des Relatifs » annonce douze marches à deux questions et n'en montrait
    // que cinq. Le générateur dit maintenant ce qu'il lui faut ; on le propose,
    // et l'infobulle explique pourquoi le nombre n'est pas celui qu'on croit.
    const generateurEcran = exo.generatorId ? getGenerator(exo.generatorId) : null;
    const conseil = questionsConseillees(generateurEcran, current, { activite: exo.activityId });
    const nbConseille = current.nbQuestions || conseil;
    // Le « pourquoi ce nombre » dépend de la NATURE de l'exercice : on ne
    // justifie pas vingt additions comme on justifie vingt-quatre marches.
    const aideDuree = generateurEcran && generateurEcran.duree === 'reflexe'
        ? 'Ici on cherche un réflexe, et un réflexe se construit par la répétition : '
            + 'la réponse doit finir par venir sans calculer. Dix questions n\'y suffisent pas.'
        : (conseil > 10
            ? `Cet exercice avance par marches : il en faut ${conseil} pour les parcourir toutes. `
                + 'En mettre moins n\'est pas un problème — on verra les premières.'
            : 'Autant de questions que l\'exercice en pose.');

    const valeurDe = (p) => current[p.id] !== undefined ? current[p.id] : p.default;

    // LE NOMBRE DE QUESTIONS AVANT L'AIDE, ET CE N'EST PAS UN DÉTAIL. L'aperçu
    // découpe CE nombre de questions en tranches (« 3 à deux propositions, 5 à
    // quatre, 2 au clavier ») : le réglage qu'il découpe doit se lire au-dessus
    // de lui, sinon le ruban parle d'un total qu'on n'a pas encore vu.
    const libre = schema.filter(p => !p.groupe);
    const groupes = schema.filter(p => p.groupe);

    content.innerHTML = `
        ${champsSchema(libre, valeurDe)}
        ${glissiereNombre({
        id: 'cfg-nbitems', label: 'Nombre de questions', aide: aideDuree,
        min: MIN_QUESTIONS, max: MAX_QUESTIONS, value: nbConseille
    })}
        ${champsSchema(groupes, valeurDe, { titres: TITRES_ELEVE })}
        ${impression}`;

    content.classList.toggle('cfg-apercu-hote', aApercuAide(schema));
    // DE QUEL EXERCICE ON PARLE. Rémy : « il faut le vrai aperçu ». Le ruban
    // dessinait des rectangles gris — il ne savait rien de l'exercice, donc il
    // ne pouvait rien montrer d'autre. On le lui dit ici, et il va chercher une
    // VRAIE question au générateur.
    content.dataset.exo = exo && exo.id ? exo.id : '';
    // C'EST L'ÉLÈVE QUI OUVRE CETTE FENÊTRE : la bande lui montre ce qui
    // l'attend, elle ne lui donne pas la main dessus.
    content.dataset.role = 'eleve';
    rafraichirApercu(content);
    wireTips(content);
    modal.style.display = 'flex';
    // Après l'affichage : une boîte encore masquée mesure zéro.
    requestAnimationFrame(() => marquerFondu(content));

    const btnPrint = document.getElementById('btn-print-sheet');
    if (btnPrint) {
        btnPrint.onclick = () => {
            // Les réglages COURANTS de la fenêtre, pas ceux du catalogue : ce
            // que le parent vient de choisir est ce qu'il veut sur la feuille.
            const params = { ...current, ...readParams(content, schema) };
            import('../ui/printSheet.js').then(m => m.ouvrirFicheModal(exo, params));
        };
    }

    document.getElementById('btn-student-config-cancel').onclick = () => { modal.style.display = 'none'; };
    document.getElementById('btn-student-config-start').onclick = () => {
        modal.style.display = 'none';
        onStart({
            ...current,
            ...readParams(content, schema),
            nbQuestions: intVal('cfg-nbitems', 10)
        });
    };
}

// --- Politique du parcours (mode et barème) ---------------------------------

/**
 * Éditeur de politique : c'est ici que le professeur bascule un parcours
 * d'entraînement en évaluation notée. Les deux réglages qui changent tout —
 * nombre d'essais et disponibilité des aides — sont pilotés par le mode, mais
 * restent ajustables.
 */
export function renderPolicyEditor(path, onChange, containerId = 'builder-policy-content') {
    const root = document.getElementById(containerId);
    if (!root) return;

    const p = resolvePolicy(path.policy);
    const isEval = p.mode === MODES.EVALUATION;
    const isLearn = p.mode === MODES.APPRENTISSAGE;
    const g = p.grading || {};

    root.innerHTML = `
        <div class="cfg-modes cfg-modes--3">
            <button type="button" class="cfg-mode ${isLearn ? 'cfg-mode--active' : ''}" data-mode="${MODES.APPRENTISSAGE}">
                <span class="cfg-mode-icon" aria-hidden="true">🌱</span>
                <span class="cfg-mode-title">Apprentissage</span>
                <span class="cfg-mode-desc">Leçon et robot avant de jouer, essais illimités, aides gratuites, bouton « Montre-moi ». Pour découvrir.</span>
            </button>
            <button type="button" class="cfg-mode ${!isEval && !isLearn ? 'cfg-mode--active' : ''}" data-mode="${MODES.ENTRAINEMENT}">
                <span class="cfg-mode-icon" aria-hidden="true">🎯</span>
                <span class="cfg-mode-title">Entraînement</span>
                <span class="cfg-mode-desc">Plusieurs essais, aides, correction immédiate. Sans note.</span>
            </button>
            <button type="button" class="cfg-mode ${isEval ? 'cfg-mode--active' : ''}" data-mode="${MODES.EVALUATION}">
                <span class="cfg-mode-icon" aria-hidden="true">📝</span>
                <span class="cfg-mode-title">Évaluation</span>
                <span class="cfg-mode-desc">Un seul essai, pas d'aide, note et bilan par compétence.</span>
            </button>
        </div>

        <div class="cfg-field">
            <label class="cfg-label" for="cfg-attempts">Essais autorisés par question</label>
            <input type="number" id="cfg-attempts" class="cfg-input" min="1" max="5" value="${p.maxAttemptsPerItem}">
        </div>
        <label class="cfg-check">
            <input type="checkbox" id="cfg-hints" ${p.hints ? 'checked' : ''}>
            Autoriser les indices
        </label>
        <label class="cfg-check">
            <input type="checkbox" id="cfg-adaptive" ${p.adaptive ? 'checked' : ''}>
            Cibler les notions fragiles de l'élève
        </label>

        <div class="cfg-group ${isEval ? '' : 'cfg-group--muted'}">
            <div class="cfg-group-title">Barème</div>
            <label class="cfg-check">
                <input type="checkbox" id="cfg-graded" ${p.grading ? 'checked' : ''}>
                Attribuer une note
            </label>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-scale">Note sur</label>
                <input type="number" id="cfg-scale" class="cfg-input" min="5" max="100" value="${g.scale || 20}">
            </div>
            <!-- Pleine largeur : les trois règles portent des noms longs, et
                 une liste déroulante large mangeait la colonne du libellé —
                 « Règle de calcul » et son explication s'imprimaient alors un
                 mot par ligne. -->
            <div class="cfg-field cfg-field--wide">
                <label class="cfg-label" for="cfg-rule">Règle de calcul</label>
                <select id="cfg-rule" class="cfg-input">
                    <option value="firstTry" ${g.rule === 'firstTry' ? 'selected' : ''}>Réussite du premier coup</option>
                    <option value="ratio" ${g.rule === 'ratio' ? 'selected' : ''}>Question résolue (essais illimités)</option>
                    <option value="ponderee" ${g.rule === 'ponderee' ? 'selected' : ''}>Pondérée (pénalité par essai et par aide)</option>
                </select>
                <p class="cfg-help">La note est recalculée à partir des réponses enregistrées : modifier le barème met à jour les bilans passés.</p>
            </div>
            <!-- À QUI LA NOTE EST-ELLE MONTRÉE ? Rémy : « à la fin on a une
                 option pour donner la note ou non ». Trois cas, et le second
                 n'est pas un demi-mesure : noter sans afficher permet de rendre
                 les copies en classe d'abord, ou de mesurer sans décourager —
                 le bilan de classe, lui, garde la note. -->
            <div class="cfg-field cfg-field--wide">
                <label class="cfg-label" for="cfg-note-vue">À la fin, la note est</label>
                <select id="cfg-note-vue" class="cfg-input">
                    <option value="affichee" ${(g.note || 'affichee') === 'affichee' ? 'selected' : ''}>Affichée à l'élève</option>
                    <option value="enregistree" ${g.note === 'enregistree' ? 'selected' : ''}>Enregistrée, mais pas montrée à l'élève</option>
                    <option value="aucune" ${g.note === 'aucune' ? 'selected' : ''}>Pas de note — bilan par compétence seulement</option>
                </select>
            </div>
            <label class="cfg-check">
                <input type="checkbox" id="cfg-show-calc" ${g.showCalculation !== false ? 'checked' : ''}>
                Montrer à l'élève le détail du calcul de sa note
            </label>
        </div>

        <!-- CE QUE L'INTERROGATION FAIT APRÈS CHAQUE RÉPONSE. Le choix décide
             de ce qu'elle mesure : se taire mesure ce que l'élève savait en
             entrant ; expliquer enseigne à chaque question, et la note devient
             celle d'un devoir formatif. Les deux sont légitimes — mais ce ne
             sont pas les mêmes devoirs, et cela se règle. -->
        <div class="cfg-group ${isEval ? '' : 'cfg-group--muted'}">
            <div class="cfg-group-title">Après chaque réponse</div>
            <div class="cfg-field cfg-field--wide">
                <label class="cfg-label" for="cfg-correction">L'ordinateur</label>
                <select id="cfg-correction" class="cfg-input">
                    <option value="aucune" ${p.correction === 'aucune' ? 'selected' : ''}>Passe à la question suivante, sans rien dire</option>
                    <option value="reponse" ${(p.correction || 'reponse') === 'reponse' ? 'selected' : ''}>Montre la bonne réponse</option>
                    <option value="robot" ${p.correction === 'robot' ? 'selected' : ''}>Montre la réponse ET le robot explique</option>
                </select>
                <p class="cfg-help">Se taire mesure ce que l'élève savait en entrant. Expliquer lui apprend
                    quelque chose à chaque question — c'est un devoir formatif, et la note change de sens.</p>
            </div>
        </div>

        <div class="cfg-group">
            <div class="cfg-group-title">🎁 Jeux de récompense</div>
            <div class="cfg-field">
                <label class="cfg-label" for="cfg-bonus-seuil">Réussite exigée
                    ${infoBtn('Le pourcentage de bonnes réponses qu\'il faut atteindre sur les '
                        + 'exercices placés avant un jeu pour que ce jeu s\'ouvre. '
                        + 'Quand tout le parcours est réussi à ce niveau, TOUS les jeux s\'ouvrent.', null)}</label>
                <input type="number" id="cfg-bonus-seuil" class="cfg-input cfg-input--num"
                       min="0" max="100" step="5" value="${Math.round(seuilDe(path) * 100)}">
                <span class="cfg-unite">%</span>
            </div>
            <p class="cfg-help">Une étape se déclare « jeu de récompense » dans ses propres
            réglages. Sans jeu dans le parcours, ce réglage ne sert à rien.</p>
        </div>`;

    const baseFor = (mode) => mode === MODES.EVALUATION ? evaluationPolicy()
        : mode === MODES.APPRENTISSAGE ? apprentissagePolicy()
            : defaultPolicy();

    const commit = () => {
        const graded = document.getElementById('cfg-graded').checked;
        const mode = root.querySelector('.cfg-mode--active').dataset.mode;
        const base = baseFor(mode);
        onChange({
            ...base,
            mode,
            maxAttemptsPerItem: intVal('cfg-attempts', base.maxAttemptsPerItem),
            hints: document.getElementById('cfg-hints').checked,
            adaptive: document.getElementById('cfg-adaptive').checked,
            // Ce que l'ordinateur fait après chaque réponse. `resolvePolicy`
            // en déduira `showCorrection` : c'est le mot qui commande.
            correction: (document.getElementById('cfg-correction') || {}).value || base.correction,
            grading: graded ? {
                scale: intVal('cfg-scale', 20),
                rule: document.getElementById('cfg-rule').value,
                penalties: { hint: 0.25, retry: 0.5 },
                arrondi: 0.5,
                showCalculation: document.getElementById('cfg-show-calc').checked,
                note: (document.getElementById('cfg-note-vue') || {}).value || 'affichee'
            } : null,
            // Le seuil des récompenses est une règle de la séance : il vit
            // avec les autres, et survit donc au changement de mode.
            bonusSeuil: Math.max(0, Math.min(100, intVal('cfg-bonus-seuil', 75))) / 100
        });
    };

    wireTips(root);
    root.querySelectorAll('[data-mode]').forEach(btn => {
        btn.onclick = () => {
            // Changer de mode réapplique les défauts du mode : c'est le sens
            // même du réglage, on ne conserve pas les réglages contradictoires.
            // Le seuil des récompenses, lui, n'a rien de contradictoire avec
            // un mode : il survit.
            // On relit le CHAMP, pas le parcours reçu au montage : sinon un
            // changement de mode rendrait au professeur le seuil qu'il avait
            // avant de le régler.
            const base = {
                ...baseFor(btn.dataset.mode),
                bonusSeuil: Math.max(0, Math.min(100, intVal('cfg-bonus-seuil', 75))) / 100
            };
            onChange(base);
            renderPolicyEditor({ ...path, policy: base }, onChange, containerId);
        };
    });
    root.addEventListener('change', commit);
}

function intVal(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const n = parseInt(el.value, 10);
    return isNaN(n) ? fallback : n;
}
