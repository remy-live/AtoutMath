// ACTIVITÉ « TRACER L'IMAGE SUR LE QUADRILLAGE ».
//
// L'élève colorie des cases. C'est tout, et c'est voulu : sur une fiche, cet
// exercice se fait au crayon, en noircissant des carreaux, et l'écran ne doit
// pas inventer un geste que le papier ne connaît pas. Un clic pose une case,
// un second la retire.
//
// ON NE VALIDE QU'À LA DEMANDE. Corriger au fil des clics transformerait
// l'exercice en jeu de chaud-froid : l'élève poserait une case au hasard, la
// verrait rougir, essaierait la voisine. Ce qu'on veut est qu'il COMPTE, qu'il
// pose sa figure entière, et qu'il la soumette — comme il rend une feuille.
//
// LA CORRECTION MONTRE OÙ, PAS SEULEMENT QUOI. Un « faux » sur cinq cases
// n'apprend rien. On dit combien de cases sont justes, combien manquent,
// combien sont en trop — et à la révélation, on superpose l'attendu au tracé
// de l'élève, en distinguant les trois cas par la couleur ET par la forme,
// parce qu'un polycopié photocopié n'a pas de couleurs et qu'un élève sur
// douze les distingue mal.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint } from './choice.js';
// LE GESTE QUI MANQUAIT. Rémy : « ne fonctionne pas » — le clic marchait, mais
// pas le balayage, qui est le geste naturel pour colorier plusieurs cases.
import { peindreAuGlisse } from './glisser.js';
import { quadrillageSvg, gesteDuFilm } from '../quadrillageSvg.js';
import { cleFigure, comparer, decalageEntre, direLeDecalage } from '../transformations.js';
import { direLesCases, imageAttendue } from '../generators/transfoQuadrillage.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { meneurDemo } from '../meneurDemo.js';

/**
 * COMBIEN DE FOIS ON A LE DROIT DE VOIR LE MOUVEMENT.
 *
 * Rémy : « je trouve cela dur ; rajoute un bouton pour montrer l'animation de
 * la rotation par exemple, mais il est limité en usage ». Deux passages, et
 * c'est tout : le film montre OÙ la figure arrive, il ne la trace pas. Il
 * reste à la recompter case par case, ce qui est l'exercice.
 *
 * « Que se passe-t-il si on bloque complètement ? » — on n'est jamais coincé :
 * le bouton d'indice donne les phrases, puis UNE CASE à chaque appui, et il
 * annonce combien il en reste. Un élève qui appuie jusqu'au bout obtient la
 * figure entière ; elle sera marquée comme reçue, et il aura vu comment on la
 * construit. Un exercice dont on ne peut pas sortir n'apprend rien.
 */
const FILMS_PAR_QUESTION = 2;
const DUREE_FILM = 1500;      // le voyage
const POSE_FILM = 900;        // le temps de regarder où c'est tombé

export function mount(container, session) {
    let destroyed = false;
    let cursor = null;
    let gate = null;

    let item = null;
    let posees = [];        // les cases coloriées par l'élève
    // De quoi débrancher le glissé : il écoute la fenêtre, il doit s'en aller
    // avec l'activité, sinon un jeu fermé continue d'entendre les relâchements.
    let arreterGlisse = () => { };
    let svg = null;
    // Les deux passages du film, par question. Voir `jouerLeMouvement`.
    let filmsRestants = 0;
    let filmEnCours = false;
    // De quoi distinguer celui qui cherche de celui qui tape au hasard : le
    // rang de l'essai, l'instant du précédent, et le nombre de refus d'affilée.
    let essais = 0;
    let dernierEssai = 0;
    let refus = 0;
    // Rafraîchit le libellé du bouton d'indice — il annonce combien de cases
    // restent à trouver, et c'est ce qui dit qu'on n'est jamais coincé.
    let majIndice = () => {};

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        posees = [];
        filmsRestants = FILMS_PAR_QUESTION;
        essais = 0;
        dernierEssai = 0;
        refus = 0;
        render();
    }

    function render() {
        const m = item.meta;
        // La consigne est REÉCRITE à partir du texte, pas reprise du HTML de
        // l'item : celui-ci porte déjà une copie figée du quadrillage — utile
        // au carnet d'erreurs et à la feuille imprimée, encombrante ici, où le
        // quadrillage est justement celui sur lequel on va cliquer.
        const grille = quadrillageSvg({
            largeur: m.largeur, hauteur: m.hauteur,
            figures: [{ cases: m.depart, classe: 'qd-depart' }],
            transfo: m.transfo, ancre: m.ancre, interactive: true, prefixe: 'qdj'
        });
        container.innerHTML = `
            <div class="game-question">${echapper(item.prompt.text)}</div>
            <div class="figure-wrap figure-wrap--interactive qd-plateau">${grille}</div>
            <div class="qd-barre">
                <span class="qd-compte" role="status"></span>
                <button type="button" class="qd-effacer qd-film" data-film></button>
                <button type="button" class="qd-effacer" data-effacer>Tout effacer</button>
                <button type="button" class="kk-btn-valider" data-valider>Valider</button>
            </div>
            ${hintBar(session)}`;

        svg = container.querySelector('svg');
        majCompte();

        if (session.isDemo) {
            if (!session.frozen) runDemo();
            return;
        }

        wireHint(container, session);
        brancherIndiceCase();
        svg.querySelectorAll('.qd-hit').forEach(hit => {
            // Le clavier garde sa bascule : Entrée sur une case pleine
            // l'efface, ce qui est ce qu'on attend d'une touche.
            hit.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); basculer(hit); }
            });
        });
        // ET LE GESTE. Un appui simple bascule sa case comme avant ; un appui
        // suivi d'un balayage peint (ou efface) toutes celles qu'il traverse.
        // C'est ce dernier qui manquait, et son absence faisait dire que le
        // jeu « ne fonctionne pas » : partir d'une case pour relâcher sur une
        // autre n'émet aucun `click`, donc ne coloriait RIEN — pas même la
        // première.
        arreterGlisse = peindreAuGlisse(svg, {
            selecteur: '.qd-hit',
            estPleine: (hit) => posees.some(q => `${q.x},${q.y}` === hit.dataset.c),
            appliquer: (hit) => basculer(hit),
            bloque: () => session.locked || destroyed
        });
        container.querySelector('[data-effacer]').onclick = () => {
            if (session.locked) return;
            posees = [];
            svg.querySelectorAll('.qd-posee').forEach(el => el.remove());
            majCompte();
        };
        container.querySelector('[data-valider]').onclick = valider;
        container.querySelector('[data-film]').onclick = jouerLeMouvement;
        majFilm();
    }

    // --- LE FILM DU MOUVEMENT ---------------------------------------------------
    //
    // On fait glisser, tourner ou basculer une COPIE de la figure de départ
    // jusqu'à sa place d'arrivée. C'est le geste que la transformation décrit,
    // et il n'y a pas d'autre façon de le montrer qu'en le faisant.
    //
    // La copie s'efface ensuite : le film dit OÙ, il ne trace pas. Le report
    // case par case reste à faire, et c'est lui l'exercice.

    /** L'échelle du dessin, relue sur le quadrillage lui-même. */
    function reperes() {
        const h = svg && svg.querySelector('.qd-hit');
        if (!h) return null;
        const [gx, gy] = h.dataset.c.split(',').map(Number);
        const u = parseFloat(h.getAttribute('width'));
        const ox = parseFloat(h.getAttribute('x')) - gx * u;
        const oy = parseFloat(h.getAttribute('y')) - gy * u;
        return { u, px: (v) => ox + v * u, py: (v) => oy + v * u };
    }

    /**
     * L'état du mouvement à l'instant `t` (de 0 à 1), écrit comme un
     * `transform` SVG.
     *
     * LA SYMÉTRIE SE JOUE COMME UN PLIAGE : l'échelle passe de 1 à −1 en
     * traversant 0, donc la figure s'aplatit sur l'axe puis se rouvre de
     * l'autre côté. C'est exactement le geste du papier plié, et c'est ce
     * qu'on veut faire voir. Un demi-tour ou un quart de tour, eux, se jouent
     * comme des rotations : interpoler leur matrice raccourcirait le rayon et
     * la figure passerait par le centre au lieu de tourner autour.
     */
    function mouvementA(t, r) {
        // LE GESTE SE CALCULE DANS `core/quadrillageSvg.js`, avec le
        // demi-carreau. Il se calculait ici, et il l'avait oublié : la figure
        // pliait autour du BORD de la case de l'axe au lieu de son milieu, et
        // atterrissait une case à côté de sa propre correction. Rémy : « le
        // mouvement n'est pas bon — vérifie tous les mouvements. » Mesuré :
        // 70 films faux sur 97 ; la translation était la seule juste, parce
        // qu'elle n'a ni axe ni centre à placer.
        const g = gesteDuFilm(item.meta.transfo);
        if (!g) return '';
        if (g.genre === 'glisse') {
            return `translate(${g.dx * r.u * t} ${g.dy * r.u * t})`;
        }
        const cx = r.px(g.cx), cy = r.py(g.cy);
        if (g.genre === 'tourne') return `rotate(${g.angle * t} ${cx} ${cy})`;
        // Le pliage : on redresse l'axe, on écrase, on remet.
        return `translate(${cx} ${cy}) rotate(${g.angle}) scale(1 ${1 - 2 * t}) `
            + `rotate(${-g.angle}) translate(${-cx} ${-cy})`;
    }

    function majFilm() {
        const btn = container.querySelector('[data-film]');
        if (!btn) return;
        if (!item.meta.transfo) { btn.hidden = true; return; }
        btn.hidden = false;
        btn.disabled = filmsRestants <= 0 || filmEnCours;
        btn.textContent = filmsRestants > 0
            ? `▶ Montre le mouvement (${filmsRestants})`
            : '▶ Mouvement déjà montré deux fois';
    }

    function jouerLeMouvement() {
        if (filmEnCours || destroyed || session.locked) return;
        const r = reperes();
        if (!r || filmsRestants <= 0) return;
        filmsRestants--;
        // Voir le mouvement est une aide : elle compte comme telle au barème,
        // exactement comme une case donnée.
        if (!session.sansTrace) session.hintIndex++;
        filmEnCours = true;
        majFilm();

        const ns = 'http://www.w3.org/2000/svg';
        const g = document.createElementNS(ns, 'g');
        g.setAttribute('class', 'qd-film-fantome');
        (item.meta.depart || []).forEach(p => {
            const rect = document.createElementNS(ns, 'rect');
            rect.setAttribute('x', r.px(p.x));
            rect.setAttribute('y', r.py(p.y));
            rect.setAttribute('width', r.u);
            rect.setAttribute('height', r.u);
            g.appendChild(rect);
        });
        svg.insertBefore(g, sousLesMarques());

        const debut = performance.now();
        const doux = (x) => (x < 0.5 ? 2 * x * x : 1 - ((-2 * x + 2) ** 2) / 2);
        const pas = (maintenant) => {
            if (destroyed) { g.remove(); return; }
            const t = Math.min(1, (maintenant - debut) / DUREE_FILM);
            g.setAttribute('transform', mouvementA(doux(t), r));
            if (t < 1) { requestAnimationFrame(pas); return; }
            regTimeout(() => {
                g.classList.add('qd-film-fantome--part');
                regTimeout(() => { g.remove(); filmEnCours = false; majFilm(); }, 320);
            }, POSE_FILM);
        };
        requestAnimationFrame(pas);
    }

    // --- L'INDICE QUI TRACE UNE CASE ------------------------------------------
    //
    // Rémy : « pour un indice, tu pourrais tracer juste UNE case ». Les phrases
    // d'aide rappellent la règle — compte les carreaux jusqu'à l'axe, reporte
    // de l'autre côté — mais l'élève qui bloque ne bloque pas sur la règle : il
    // bloque sur le PREMIER report, celui qui n'a aucun repère avant lui. Une
    // case posée pour lui, et tout le reste se compte à partir d'elle.
    //
    // La case donnée entre dans le compte et dans la validation — elle est
    // vraiment tracée, pas montrée — mais elle garde sa marque : on doit
    // pouvoir distinguer, en regardant la figure finie, ce qu'on a trouvé de
    // ce qu'on a reçu.

    /**
     * Le bouton d'indice donne d'abord les PHRASES, puis les CASES. Une case
     * offerte d'entrée priverait de l'effort ; une phrase de plus quand on a
     * déjà tout lu ne sert à rien.
     */
    function brancherIndiceCase() {
        const btn = container.querySelector('[data-hint]');
        if (!btn) { majIndice = () => {}; return; }
        const phrase = btn.onclick;
        const majTexte = () => {
            if (session.hintsAvailable) return;
            btn.disabled = false;
            // ON DIT COMBIEN IL EN RESTE. « Que se passe-t-il si on bloque
            // complètement ? » : on appuie encore, et encore — chaque appui
            // trace une case de plus. Le compte affiché est ce qui le fait
            // savoir ; sans lui, l'élève croit l'aide épuisée après la
            // première case.
            const reste = [...imageAttendue(item.meta)]
                .filter(p => !posees.some(q => q.x === p.x && q.y === p.y)).length;
            btn.innerHTML = reste
                ? `<span aria-hidden="true">🎯</span> Trace une case (${reste} à trouver)`
                : '<span aria-hidden="true">🎯</span> Toutes les cases sont posées';
            btn.disabled = !reste;
        };
        btn.onclick = (e) => {
            if (session.hintsAvailable) { phrase(e); majTexte(); return; }
            montrerUneCase();
            majTexte();
        };
        majIndice = majTexte;
        majTexte();
    }

    /** Pose la prochaine case attendue, dans l'ordre de lecture. */
    function montrerUneCase() {
        if (session.locked || destroyed) return;
        const reste = [...imageAttendue(item.meta)]
            .sort((a, b) => (a.y - b.y) || (a.x - b.x))
            .find(p => !posees.some(q => q.x === p.x && q.y === p.y));
        if (!reste) { statut('Toutes les cases de l\'image sont déjà posées.'); return; }
        const hit = svg.querySelector(`.qd-hit[data-c="${reste.x},${reste.y}"]`);
        if (!hit) return;
        // Une case donnée ne se compte pas comme une aide de plus tant qu'elle
        // ne coûte rien : c'est `session.hint()` qui trace l'usage, et il l'a
        // déjà fait pour les phrases. On note donc la case comme aide ici.
        if (!session.sansTrace) session.hintIndex++;
        posees.push(reste);
        svg.insertBefore(rectangle(hit, 'qd-posee qd-indice', `${reste.x},${reste.y}`),
            sousLesMarques());
        majCompte();
    }

    // --- Colorier -------------------------------------------------------------

    const lire = (hit) => {
        const [x, y] = hit.dataset.c.split(',').map(Number);
        return { x, y };
    };

    function basculer(hit) {
        if (session.locked || destroyed) return;
        const p = lire(hit);
        // ON NE COLORIE PAS SUR LA FIGURE DE DÉPART. Elle est la donnée de
        // l'énoncé : la recouvrir effacerait la question, et une image qui
        // chevaucherait le départ n'est jamais la bonne réponse ici.
        if ((item.meta.depart || []).some(d => d.x === p.x && d.y === p.y)) {
            secouer();
            return;
        }
        const dedans = posees.findIndex(q => q.x === p.x && q.y === p.y);
        if (dedans >= 0) {
            posees.splice(dedans, 1);
            const el = svg.querySelector(`.qd-posee[data-c="${hit.dataset.c}"]`);
            if (el) el.remove();
        } else {
            posees.push(p);
            svg.insertBefore(rectangle(hit, 'qd-posee', hit.dataset.c), sousLesMarques());
        }
        majCompte();
    }

    /** Un carré posé au même endroit qu'une cible, sous les cibles cliquables. */
    function rectangle(hit, classe, cle) {
        const ns = 'http://www.w3.org/2000/svg';
        const r = document.createElementNS(ns, 'rect');
        ['x', 'y', 'width', 'height'].forEach(a => r.setAttribute(a, hit.getAttribute(a)));
        r.setAttribute('class', `qd-case ${classe}`);
        if (cle) r.setAttribute('data-c', cle);
        return r;
    }

    /** Où s'insèrent les cases coloriées : sous l'axe, sous les cibles. */
    const sousLesMarques = () => svg.querySelector('.qd-marques') || svg.querySelector('.qd-hit');

    const echapper = (s) => String(s ?? '').replace(/[&<>]/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    function majCompte() {
        const el = container.querySelector('.qd-compte');
        if (!el) return;
        const n = posees.length, cible = (item.meta.depart || []).length;
        el.textContent = n === 0
            ? `${cible} cases à colorier`
            : `${n} case${n > 1 ? 's' : ''} coloriée${n > 1 ? 's' : ''} sur ${cible}`;
        el.classList.toggle('qd-compte--prete', n === cible);
        majIndice();
    }

    function secouer() {
        const p = container.querySelector('.qd-plateau');
        if (!p) return;
        p.classList.remove('qd-plateau--secoue');
        void p.offsetWidth;
        p.classList.add('qd-plateau--secoue');
    }

    // --- Valider --------------------------------------------------------------

    function valider() {
        if (session.locked || destroyed) return;
        const attendu = (item.meta.depart || []).length;
        // UNE FIGURE INCOMPLÈTE N'EST PAS UNE ERREUR, c'est un travail en
        // cours. La compter comme une faute punirait celui qui réfléchit
        // encore, et fausserait le carnet d'erreurs.
        if (posees.length !== attendu) {
            const manque = attendu - posees.length;
            statut(manque > 0
                ? `L'image a autant de cases que la figure de départ : il en manque ${manque}.`
                : `Il y a ${-manque} case${-manque > 1 ? 's' : ''} de trop : l'image en compte ${attendu}.`);
            secouer();
            return;
        }

        const attendue = imageAttendue(item.meta);
        const bilan = comparer(attendue, posees);

        // DEUX ÉLÈVES QUI ÉCHOUENT NE SE RESSEMBLENT PAS.
        //
        // Rémy : « si l'élève fait n'importe quoi en cliquant sans arrêt sur
        // valider, ou si l'élève essaye mais n'y arrive pas — ce qui sont deux
        // comportements différents — que peut-on faire ? »
        //
        // Ils se distinguent, et sur des signes qu'on a déjà sous la main : le
        // TEMPS entre deux essais, et la PART de cases justes. Poser cinq cases
        // au hasard et retoucher Valider dans la seconde, ce n'est pas se
        // tromper — c'est ne pas jouer. Une tentative pareille n'a rien à faire
        // au carnet d'erreurs : elle salirait les statistiques de l'élève et
        // ferait croire à une difficulté sur la symétrie axiale.
        //
        // On la refuse donc, sans la compter — et jamais plus de deux fois de
        // suite : un élève qui insiste finit par avoir raison de nous, et un
        // exercice dont on ne peut pas sortir est pire que tout.
        const vite = Date.now() - dernierEssai < 4000;
        const auHasard = essais >= 1 && vite && bilan.justes * 2 < attendu && !aideDemandee();
        essais++;
        dernierEssai = Date.now();
        if (auHasard && refus < 2) {
            refus++;
            secouer();
            statut('Prends le temps de compter les carreaux : je ne compte pas cet essai-là. '
                + 'Le bouton « Montre le mouvement » est là pour ça.');
            const btn = container.querySelector('[data-film]');
            if (btn && !btn.disabled) { btn.classList.add('qd-film--appel'); }
            return;
        }
        refus = 0;

        // LE CARNET D'ERREURS LIT, IL NE DÉCODE PAS.
        //
        // RÉMY : « deux explications compliqués et fausses. C'est dans le
        // "Mes erreurs" ». La carte écrivait « ta réponse : 7|3/8|3/7|4/8|4/8|5,
        // attendu : 8|2/9|2/8|3/9|3/9|4 » — la forme canonique, celle qui juge,
        // posée telle quelle sous les yeux d'un élève. Elle garde son travail
        // de juge ; `dire` porte la version qui se lit, en colonnes et lignes
        // comptées à partir de 1, comme la correction les donne déjà.
        const result = session.submit(cleFigure(posees), {
            misconception: diagnostic(bilan, attendue),
            dire: { given: direLesCases(posees), expected: direLesCases(attendue) }
        });
        if (result.ignored) return;

        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) { renderNext(); return; }
            if (result.revealed) { montrerLaCorrection(bilan); regTimeout(renderNext, 3400); return; }
            // CELUI QUI ESSAYE VRAIMENT, ON VA LE CHERCHER. Deux tentatives
            // sérieuses et toujours pas la figure : on ne se contente pas de
            // redire « faux », on désigne l'aide qui débloque — le film du
            // mouvement d'abord, la case donnée ensuite.
            if (essais >= 2) proposerUnCoupDeMain(bilan);
        });
    }

    /** L'élève a-t-il déjà demandé quelque chose ? */
    const aideDemandee = () => session.hintIndex > 0 || filmsRestants < FILMS_PAR_QUESTION;

    /**
     * Le coup de main qu'on propose de lui-même après deux essais sérieux.
     * On ne le lui impose pas : on allume le bouton et on dit ce qu'il fait.
     */
    function proposerUnCoupDeMain(bilan) {
        const film = container.querySelector('[data-film]');
        if (film && !film.disabled && filmsRestants > 0) {
            film.classList.add('qd-film--appel');
            statut(`${bilan.justes} case${bilan.justes > 1 ? 's' : ''} juste${bilan.justes > 1 ? 's' : ''} : `
                + 'tu n\'es pas loin. Touche « Montre le mouvement » pour voir où la figure arrive.');
            return;
        }
        const indice = container.querySelector('[data-hint]');
        if (indice && !indice.disabled) {
            indice.classList.add('qd-film--appel');
            statut('Touche « Trace une case » : je t\'en pose une, et tu comptes à partir d\'elle.');
        }
    }

    /**
     * CE QUI NE VA PAS — jamais « faux », et jamais à côté de l'erreur.
     *
     * ── POURQUOI LE COMPTE DE CASES NE SUFFIT PAS ──────────────────────────
     *
     * RÉMY, capture à l'appui : « deux explications compliqués et fausses ».
     *
     * Sur sa capture, l'élève avait colorié LA BONNE FIGURE, un carreau trop à
     * gauche et un carreau trop bas, et la carte disait « 1 case juste, 4
     * oubliées, 4 en trop ». C'est vrai au carreau près, et cela décrit un
     * élève qui colorie au hasard. Mesuré sur d'autres tirages du même décalage
     * (`tools/carnetDesTransformations.mjs`) : « 5 oubliées, 5 en trop » —
     * c'est-à-dire « rien de juste » — à qui avait tout compris sauf la place.
     *
     * DEUX ERREURS SE DISENT DONC AVANT LE COMPTE, parce qu'elles nomment ce
     * que l'élève a fait au lieu de mesurer l'écart :
     *
     *   · LA BONNE FORME, MAL POSÉE : il a compté de travers, une fois, et tout
     *     reporté fidèlement à partir de là. Le geste est bon ;
     *   · LA FIGURE GLISSÉE AU LIEU D'ÊTRE RETOURNÉE : c'est l'erreur de fond
     *     de la symétrie, et elle a sa propre phrase. Les deux cas s'excluent —
     *     l'image d'un miroir est renversée, celle d'un glissement non — donc
     *     aucune des deux phrases ne peut prendre la place de l'autre.
     *
     * Le compte reste pour tout le reste : quand la figure n'a ni la bonne
     * forme ni la bonne allure, il n'y a rien à nommer, et dire où sont les
     * cases est alors la seule aide honnête.
     */
    function diagnostic(bilan, attendue) {
        const glisse = decalageEntre(attendue, posees);
        if (glisse) {
            return `Ta figure a la bonne forme : elle est seulement posée `
                + `${direLeDecalage(glisse)}. Reprends UNE case, place-la juste, `
                + `et reporte les autres autour d'elle.`;
        }
        const recopiee = item.meta.genre !== 'translation'
            && decalageEntre(item.meta.depart || [], posees);
        if (recopiee) return aGlisseAuLieuDeRetourner();

        const bouts = [];
        if (bilan.justes) bouts.push(`${bilan.justes} case${bilan.justes > 1 ? 's' : ''} juste${bilan.justes > 1 ? 's' : ''}`);
        if (bilan.oublies.length) bouts.push(`${bilan.oublies.length} oubliée${bilan.oublies.length > 1 ? 's' : ''}`);
        if (bilan.enTrop.length) bouts.push(`${bilan.enTrop.length} en trop`);
        return bouts.length ? `${bouts.join(', ')}. Reprends case par case.` : '';
    }

    /**
     * L'erreur de fond : la figure a été DÉPLACÉE là où il fallait la
     * retourner. Chaque transformation la commet à sa façon, et la phrase doit
     * nommer le geste qui manquait — « ce n'est pas la bonne place » ne dirait
     * rien à qui croit avoir fait une symétrie.
     */
    function aGlisseAuLieuDeRetourner() {
        const g = item.meta.genre;
        const debut = 'Tu as fait GLISSER la figure sans la transformer : ';
        if (g === 'centrale') {
            return `${debut}la symétrie de centre lui fait faire un DEMI-TOUR, `
                + 'donc elle arrive à l\'envers dans les deux sens.';
        }
        if (g === 'rotation') {
            return `${debut}le quart de tour la fait BASCULER, donc ce qui était `
                + 'couché se met debout.';
        }
        return `${debut}la symétrie d'axe la RETOURNE comme un miroir, donc la case `
            + 'la plus proche de l\'axe devient la plus proche de l\'autre côté.';
    }

    /**
     * L'attendu superposé au tracé. Trois états, trois marques : la case juste
     * garde sa couleur, la case oubliée est hachurée, la case en trop est
     * barrée. La couleur seule ne suffirait pas.
     */
    function montrerLaCorrection(bilan) {
        const hitDe = (p) => svg.querySelector(`.qd-hit[data-c="${p.x},${p.y}"]`);
        bilan.oublies.forEach(p => {
            const h = hitDe(p);
            if (h) svg.insertBefore(rectangle(h, 'qd-oubliee'), sousLesMarques());
        });
        bilan.enTrop.forEach(p => {
            const el = svg.querySelector(`.qd-posee[data-c="${p.x},${p.y}"]`);
            if (el) el.classList.add('qd-en-trop');
        });
    }

    function statut(texte) {
        const el = container.querySelector('.qd-compte');
        if (el) { el.textContent = texte; el.classList.remove('qd-compte--prete'); }
    }

    // --- Montre-moi -----------------------------------------------------------
    //
    // Le robot colorie les cases UNE PAR UNE, dans l'ordre de la lecture. Voir
    // apparaître la figure case après case est ce qui enseigne la méthode :
    // on ne trace pas une image d'un trait, on reporte case par case.

    async function runDemo() {
        const cases = [...imageAttendue(item.meta)].sort((a, b) => (a.y - b.y) || (a.x - b.x));
        if (!cases.length) { regTimeout(renderNext, DEMO_SPEED.between); return; }
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const robot = meneurDemo(cursor, gate, () => !destroyed, null, { rangementSeul: true });
        if (!await robot.tour()) return;
        if (!await robot.pause(600)) return;

        cursor.say(phraseDepart(), container.querySelector('.qd-plateau') || container);
        if (!await robot.pause(DEMO_SPEED.settle)) return;

        for (const p of cases) {
            const hit = svg.querySelector(`.qd-hit[data-c="${p.x},${p.y}"]`);
            if (!hit) continue;
            if (!await robot.tour()) return;
            if (!await robot.toucher(hit)) return;
            svg.insertBefore(rectangle(hit, 'qd-posee', `${p.x},${p.y}`), sousLesMarques());
        }

        if (!await robot.tour()) return;
        cursor.say(phraseFin(), container.querySelector('.qd-plateau') || container);
        if (!await robot.pause(DEMO_SPEED.between)) return;
        renderNext();
    }

    // Une bulle se lit à peu près à trois cent quarante millisecondes le mot :
    // trois lignes figent la démonstration au point qu'on la croit plantée.
    const COURT = 110;
    const tientEnUneBulle = (t) => typeof t === 'string' && t.trim() && t.trim().length <= COURT;

    function phraseDepart() {
        const indice = (item.hints || [])[0];
        if (tientEnUneBulle(indice)) return indice.trim();
        return 'On prend les cases une par une, jamais la figure d\'un bloc.';
    }

    function phraseFin() {
        if (tientEnUneBulle(item.explanation)) return item.explanation.trim();
        return 'Chaque case reportée, l\'image apparaît toute seule.';
    }

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            arreterGlisse(); arreterGlisse = () => { };
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
