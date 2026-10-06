// ACTIVITÉ « PAR RAPPORT À QUOI ? » — trois façons de désigner un élément.
//
// Rémy a demandé les trois, et elles ne sont pas trois habillages du même
// exercice : ce sont trois marches, et l'écart entre elles est exactement ce
// qu'on apprend.
//
//   CHOISIR    parmi (d₁), (d₂), O₃ : il suffit de reconnaître le bon parmi
//              quatre. On peut éliminer, revenir, tenter.
//   CLIQUER    la droite ou le point sur le dessin, sans nom affiché : il faut
//              LE DÉSIGNER, donc l'avoir localisé pour de bon.
//   ÉCRIRE     « x = 4 », « (4 ; 7) » : il faut en plus savoir le LIRE dans le
//              repère, et l'écrire comme on l'écrit en mathématiques.
//
// C'est le même escalier que l'aide des exercices à propositions (core/aide.js),
// et pour la même raison : commencer à l'écriture ferme la porte à qui hésite,
// rester aux propositions ne fait jamais produire la réponse. Le préréglage
// « progressif » monte tout seul au fil de l'exercice ; le professeur qui sait
// où il va fixe la marche.
//
// LA RÉPONSE EST L'ÉLÉMENT, PAS SA DÉSIGNATION. Trois élèves qui ont choisi
// (d₂), cliqué la même droite et écrit « x = 4 » ont tous les trois raison, et
// le journal enregistre la même chose pour les trois — sans quoi le carnet
// d'erreurs et le modèle de maîtrise compteraient trois compétences là où il
// n'y en a qu'une.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
import { quadrillageSvg } from '../quadrillageSvg.js';
import {
    cleElement, ecrireElement, lireElement
} from '../elementSymetrie.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { ecrituresVoulues, seSouvenirDesEcritures } from '../reglagesDuPoste.js';
import { meneurDemo } from '../meneurDemo.js';

/** Les trois marches, et le préréglage qui les enchaîne. */
export const MARCHES = ['choisir', 'cliquer', 'ecrire'];

/**
 * À la question n sur N, quelle marche ?
 *
 * Un tiers puis un tiers : on choisit, on clique, on écrit. Sur un exercice
 * court — cinq questions — cela fait deux, deux, un, ce qui est le bon dosage :
 * l'écriture arrive quand la droite est trouvée sans hésiter.
 */
export function marcheDe(mode, rang, total) {
    if (MARCHES.includes(mode)) return mode;
    const n = Math.max(1, total || 10);
    const part = (rang || 0) / n;
    if (part < 1 / 3) return 'choisir';
    if (part < 2 / 3) return 'cliquer';
    return 'ecrire';
}

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let gate = null;

    let item = null;
    let marche = 'choisir';
    let svg = null;

    const mode = (opts.mode && MARCHES.includes(opts.mode)) ? opts.mode
        : ((session.params && session.params.reponse) || 'progressive');

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        // `nbItems` est le nombre de questions prévu pour l'étape ; sans lui —
        // un entraînement libre, sans fin annoncée — on prend dix, ce qui
        // donne la même progression sur les dix premières questions.
        marche = marcheDe(mode, session.answered || 0, session.nbItems || opts.total || 10);
        render();
    }

    function render() {
        const m = item.meta;
        // LES NOMS DES CANDIDATS DISPARAISSENT QUAND ON CLIQUE. Les laisser
        // afficherait « (d₂) » à côté de la droite cherchée : l'élève
        // désignerait un nom, pas une droite, et la marche n'en serait plus une.
        const candidats = m.candidats.map(c => (marche === 'choisir' ? c : { ...c, nom: '' }));
        // ── CHAQUE DROITE PEUT DIRE COMMENT ELLE S'ÉCRIT ────────────────────
        //
        // RÉMY : « Les élèves ont beaucoup de mal à comprendre le concept de
        // x = 6 […] si la souris passe sur une droite ou sur un point ou qu'il
        // clique dessus, on a un petit tooltip visible qui donne les
        // coordonnées du point ou l'équation de la droite ».
        //
        // PAS SUR LA MARCHE « ÉCRIRE », ET C'EST TOUTE LA DIFFICULTÉ. Sur
        // cette marche-là, l'élève doit ÉCRIRE « x = 6 » lui-même : une bulle
        // qui l'affiche au survol ne lui enseignerait plus rien, elle lui
        // donnerait la réponse à recopier. L'escalier existe précisément pour
        // ça — on découvre la notation sur les deux premières marches, où elle
        // ne coûte rien, et on la restitue seul sur la troisième.
        //
        // ET ELLE NE TRAHIT RIEN SUR LES DEUX PREMIÈRES : TOUTES les droites
        // disent la leur, pas seulement la bonne. Savoir que (d₂) s'écrit
        // « x = 6 » ne dit pas que (d₂) est l'axe cherché.
        // ET SUR LA MARCHE « ÉCRIRE », SEULEMENT SI L'ÉLÈVE LE DEMANDE.
        //
        // RÉMY, capture de cette marche-là à l'appui : « là il faudrait encore
        // le point d'interrogation qui donne les coordonnées du point et de la
        // droite ».
        //
        // IL A RAISON, ET SA FORMULATION LÈVE L'OBJECTION. J'avais éteint les
        // bulles ici parce qu'afficher « x = 6 » au survol donnerait la réponse
        // à recopier sur la marche qui demande justement de l'écrire. Mais
        // DERRIÈRE UN POINT D'INTERROGATION, ce n'est plus un cadeau : c'est
        // l'élève qui demande, d'un geste, et il sait ce qu'il demande.
        //
        // ET ÇA NE DONNE TOUJOURS PAS LA RÉPONSE : toutes les droites disent
        // la leur, pas seulement la bonne. Savoir que (d₂) s'écrit « x = 6 »
        // ne dit pas que (d₂) est l'axe cherché — il reste à trouver LAQUELLE,
        // et c'est la question. D'où aussi le fait que ça ne compte pas comme
        // un indice : c'est une aide à la LECTURE, comme la calculatrice.
        const avecEcriture = marche !== 'ecrire' || ecrituresVoulues();
        const montres = avecEcriture
            ? candidats.map(c => ({ ...c, dit: ecrireElement(m.hauteur, c) }))
            : candidats;
        const grille = quadrillageSvg({
            largeur: m.largeur, hauteur: m.hauteur, repere: true, prefixe: 'sy',
            figures: m.pieces.map((cases, i) => ({
                cases, etiquette: m.noms[i],
                classe: `qd-piece qd-piece-${i % 6}`
                    + (i === m.de ? ' qd-piece--source' : '')
                    + (i === m.vers ? ' qd-piece--cible' : '')
            })),
            elements: montres,
            // Les CANDIDATS sont cliquables, pas les cases : la nappe de cases
            // recouvre la grille entière et attraperait les clics des droites.
            elementsCliquables: marche === 'cliquer'
        });

        container.innerHTML = `
            <div class="game-question">${echapper(item.prompt.text)}</div>
            <div class="figure-wrap figure-wrap--interactive sy-plateau">${grille}<span
                class="sy-bulle" hidden aria-hidden="true"></span></div>
            ${zoneDeReponse()}
            ${hintBar(session)}`;

        svg = container.querySelector('svg');
        if (session.isDemo) {
            if (!session.frozen) runDemo();
            return;
        }
        wireHint(container, session);
        brancherLaBulle();
        brancher();
    }

    /** La zone de réponse dépend de la marche, et d'elle seule. */
    function zoneDeReponse() {
        if (marche === 'choisir') {
            return `<div class="sy-choix">${item.meta.candidats.map(c =>
                `<button type="button" class="sy-btn" data-el="${c.id}">${echapper(c.nom)}</button>`
            ).join('')}</div>`;
        }
        if (marche === 'cliquer') {
            return `<p class="sy-consigne">Clique sur la droite ou le point cherché,
                directement sur le dessin.</p>`;
        }
        const quoi = 'une droite s\'écrit x = … ou y = …, un point s\'écrit (… ; …)';
        // LE POINT D'INTERROGATION DE RÉMY. Il n'apparaît que tant que les
        // écritures sont éteintes : un bouton qui n'allume plus rien est un
        // bouton cassé, et celui-ci se tait dès qu'il a servi.
        const demander = ecrituresVoulues() ? '' : `<button type="button"
            class="sy-demander" data-sy-ecritures
            title="Montrer comment chaque droite et chaque point du dessin s'écrivent. Cela ne dit pas lequel est la réponse."
            aria-label="Comment ça s'écrit ?">?</button>`;
        return `<div class="sy-ecriture">
            <label class="sy-label" for="sy-champ">Écris-le : <span>${quoi}</span>${demander}</label>
            <input id="sy-champ" class="sy-champ" type="text" inputmode="text"
                   autocomplete="off" spellcheck="false" placeholder="x = 4">
            <button type="button" class="kk-btn-valider" data-valider>Valider</button>
        </div>
        <p class="sy-statut" role="status"></p>`;
    }

    /**
     * LA BULLE QUI DIT « x = 6 ».
     *
     * AU DOIGT AUSSI, et pas seulement à la souris : sur une tablette il n'y a
     * pas de survol, et c'est la moitié de la classe. Elle répond donc à trois
     * gestes — la souris qui passe, le doigt qui touche, la tabulation qui
     * arrive — et le doigt la laisse deux secondes et demie, le temps de lire.
     *
     * ELLE NE RÉPOND PAS DE LA RÉPONSE. Sur la marche « cliquer », le même
     * geste désigne l'élément ET montre son écriture : c'est voulu, l'élève
     * apprend le nom de ce qu'il vient de choisir au moment où il le choisit.
     * La bulle ne juge rien, elle nomme.
     */
    function brancherLaBulle() {
        const bulle = container.querySelector('.sy-bulle');
        const plateau = container.querySelector('.sy-plateau');
        if (!bulle || !plateau) return;
        let minuteur = null;

        const cacher = () => {
            if (minuteur) { clearTimeout(minuteur); minuteur = null; }
            bulle.hidden = true;
        };
        const montrer = (cible, tenir) => {
            const texte = cible.dataset.dit;
            if (!texte) return;
            bulle.textContent = texte;
            bulle.hidden = false;
            // ON LA POSE SUR LA ZONE DE VISÉE, pas sous le curseur : une bulle
            // qui suit la souris passe son temps à se glisser sous le doigt
            // qu'on vient de poser, et au doigt il n'y a pas de curseur du
            // tout. Le milieu de la zone est le même repère pour les deux.
            const z = cible.getBoundingClientRect();
            const p = plateau.getBoundingClientRect();
            bulle.style.left = `${Math.round(z.left + z.width / 2 - p.left)}px`;
            bulle.style.top = `${Math.round(z.top + z.height / 2 - p.top)}px`;
            if (minuteur) { clearTimeout(minuteur); minuteur = null; }
            // `regTimeout` et non `setTimeout` : un minuteur laissé derrière
            // soi écrirait dans une bulle que la question suivante a effacée.
            if (tenir) minuteur = regTimeout(cacher, 2500);
        };

        svg.querySelectorAll('.qd-el-hit[data-dit]').forEach(cible => {
            cible.addEventListener('pointerenter', (e) => {
                // UN DOIGT ENVOIE AUSSI `pointerenter`, et il n'enverra jamais
                // le `pointerleave` qui va avec : sans la tenue, la bulle
                // resterait ouverte jusqu'à la question suivante.
                montrer(cible, e.pointerType !== 'mouse');
            });
            cible.addEventListener('pointerleave', (e) => {
                if (e.pointerType === 'mouse') cacher();
            });
            cible.addEventListener('focus', () => montrer(cible, false));
            cible.addEventListener('blur', cacher);
        });
    }

    function brancher() {
        if (marche === 'choisir') {
            container.querySelectorAll('[data-el]').forEach(btn => {
                btn.onclick = () => repondreParId(btn.dataset.el, btn);
            });
            return;
        }
        if (marche === 'cliquer') {
            svg.querySelectorAll('.qd-el-hit').forEach(cible => {
                cible.addEventListener('click', () => repondreParId(cible.dataset.el, cible));
                cible.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault(); repondreParId(cible.dataset.el, cible);
                    }
                });
            });
            return;
        }
        // ON L'ALLUME, ET L'APPAREIL S'EN SOUVIENT. Un élève qui ne tient pas
        // la notation ne la tient pas davantage à la question suivante : la
        // lui redemander à chaque fois, ce serait la lui refuser. Le souvenir
        // est par APPAREIL — c'est une façon de LIRE, pas un réglage
        // pédagogique, et le professeur garde la main par la marche qu'il
        // choisit.
        const demander = container.querySelector('[data-sy-ecritures]');
        if (demander) demander.onclick = () => {
            seSouvenirDesEcritures(true);
            render();
        };

        const champ = container.querySelector('#sy-champ');
        const valider = () => repondreParEcriture(champ.value);
        champ.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); valider(); } };
        container.querySelector('[data-valider]').onclick = valider;
        champ.focus({ preventScroll: true });
    }

    // --- Répondre -------------------------------------------------------------

    function repondreParId(id, element) {
        if (session.locked || destroyed) return;
        const choisi = item.meta.candidats.find(c => c.id === id);
        if (!choisi) return;
        conclure(cleElement(choisi), { element, choisi });
    }

    /**
     * L'écriture demande une distinction que les deux autres marches ne
     * connaissent pas : « je n'ai pas compris ce que tu as écrit » n'est PAS
     * « ce n'est pas le bon élément ». Compter une faute pour une notation
     * mal formée découragerait celui qui a trouvé la droite.
     */
    function repondreParEcriture(texte) {
        if (session.locked || destroyed) return;
        const lu = lireElement(item.meta.hauteur, texte);
        if (!lu) {
            statut(texte.trim()
                ? 'Je ne reconnais pas cette écriture. Une droite s\'écrit « x = 4 » ou « y = 7 » ; '
                + 'un point s\'écrit « (4 ; 7) ».'
                : 'Écris la droite ou le point que tu as trouvé.');
            return;
        }
        conclure(cleElement(lu), { lu });
    }

    function conclure(cleDonnee, info) {
        const result = session.submit(cleDonnee, {
            element: info.element || null,
            misconception: diagnostic(cleDonnee, info)
        });
        if (result.ignored) return;

        if (info.element) {
            info.element.classList.add(result.correct ? 'sy-juste' : 'sy-faux');
        }
        if (marche === 'ecrire') statut('');

        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) { renderNext(); return; }
            if (result.revealed) { montrerLeBon(); regTimeout(renderNext, 3000); }
            else if (marche === 'ecrire') {
                const champ = container.querySelector('#sy-champ');
                if (champ) { champ.value = ''; champ.focus({ preventScroll: true }); }
            }
        });
    }

    /**
     * Le diagnostic que l'activité sait donner et que l'item ne sait pas : ce
     * qui a été désigné, comparé à ce qu'il fallait — bonne espèce, mauvaise
     * position, ou mauvaise espèce.
     */
    function diagnostic(cleDonnee, info) {
        if (cleDonnee === item.answer) return '';
        const bon = item.meta.bon;
        const donne = info.choisi || info.lu;
        if (!donne) return '';
        if (donne.genre !== bon.genre) {
            return bon.genre === 'axe'
                ? 'Tu as désigné un point ; la figure a été RETOURNÉE, comme dans un miroir, '
                + 'donc c\'est une droite qu\'il faut trouver.'
                : 'Tu as désigné une droite ; la figure n\'est pas retournée, elle a fait un '
                + 'DEMI-TOUR, donc c\'est un point qu\'il faut trouver.';
        }
        return bon.genre === 'axe'
            ? 'La bonne espèce, mais pas la bonne droite. Prends un point et son image : '
            + 'la droite cherchée passe exactement au milieu des deux.'
            : 'Le bon type d\'élément, mais pas le bon point. Le centre est le MILIEU du '
            + 'segment qui joint un point à son image.';
    }

    /** À la révélation, le bon élément se montre — et se nomme. */
    function montrerLeBon() {
        const m = item.meta;
        const cible = svg && svg.querySelector(`.qd-el-hit[data-el="${m.idJuste}"]`);
        if (cible) cible.classList.add('sy-juste');
        const btn = container.querySelector(`.sy-btn[data-el="${m.idJuste}"]`);
        if (btn) btn.classList.add('sy-juste');
        statut(`C'était ${m.candidats.find(c => c.id === m.idJuste).nom} : `
            + `${ecrireElement(m.hauteur, m.bon)}.`);
    }

    function statut(texte) {
        const el = container.querySelector('.sy-statut');
        if (el) el.textContent = texte;
    }

    const echapper = (s) => String(s ?? '').replace(/[&<>]/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    // --- Montre-moi -----------------------------------------------------------
    //
    // Le robot ne va pas droit à la réponse : il montre D'ABORD un point et son
    // image, parce que c'est de ce couple que sort l'élément cherché. Voir la
    // main désigner le bon axe n'apprend pas à le trouver.

    async function runDemo() {
        const m = item.meta;
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const robot = meneurDemo(cursor, gate, () => !destroyed, null, { rangementSeul: true });
        if (!await robot.tour()) return;
        if (!await robot.pause(600)) return;

        const plateau = container.querySelector('.sy-plateau') || container;
        cursor.say(m.genre === 'axe'
            ? 'La figure est retournée : on cherche une droite.'
            : 'La figure a fait un demi-tour : on cherche un point.', plateau);
        if (!await robot.pause(DEMO_SPEED.settle)) return;

        if (!await robot.tour()) return;
        cursor.say(m.genre === 'axe'
            ? 'Elle passe au milieu de chaque point et de son image.'
            : 'Il est le milieu du segment qui joint un point à son image.', plateau);
        if (!await robot.pause(DEMO_SPEED.settle)) return;

        if (!await robot.tour()) return;
        const btn = container.querySelector(`.sy-btn[data-el="${m.idJuste}"]`);
        if (btn && await cursor.tap(btn)) btn.classList.add('sy-juste');
        cursor.say(`C'est ${ecrireElement(m.hauteur, m.bon)}.`, btn || plateau);
        if (!await robot.pause(DEMO_SPEED.between)) return;
        renderNext();
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}


