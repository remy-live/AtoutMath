// Activité « Angle Master » : le rapporteur interactif.
//
// Portée depuis un projet antérieur, refondue sur le contrat des activités
// modernes : l'ItemSession fournit la question (angle cible, orientation,
// tolérance), cette activité fournit le GESTE — déplacer le rapporteur, le
// tourner par ses poignées, lire ou construire, avec une loupe pour viser.
//
// Ce qu'elle gagne au passage, gratuitement : les essais et aides de la
// politique (apprentissage / entraînement / évaluation), les indices gradués,
// le bouton « Montre-moi » (ici : la correction ANIMÉE — le rapporteur se
// place tout seul), et le robot de démonstration qui explique chaque geste
// dans une bulle, avec pause et pas-à-pas.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint, wireShowMe } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { poserPaveTactile, sansClavierSysteme, auDoigt } from '../../ui/paveTactile.js';

const LEG_LEN = 260;          // longueur maximale des côtés de l'angle (px canevas)
const SNAP_DIST = 30;         // aimantation du centre du rapporteur au sommet

/** Distance d'un point au segment [a, b] — pour saisir un côté par son trait. */
function distSegment(p, a, b) {
    const abx = b.x - a.x, aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
    return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

export function mount(container, session, opts = {}) {
    let destroyed = false;
    let cursor = null;
    let rafId = null;
    let observer = null;

    // État du plateau, reconstruit à chaque question.
    let item = null;
    let canvas = null, ctx = null, board = null;
    // Le pavé de la mesure : posé au doigt, retiré à chaque question.
    let paveMesure = null;
    let etat = null;

    function renderNext() {
        if (destroyed) return;
        item = session.next();
        render();
    }

    function render() {
        // Les écouteurs `window` de la question précédente sont retirés :
        // ceux du canevas meurent avec lui, pas ceux de la fenêtre.
        nettoyeurs.forEach(f => f());
        nettoyeurs.length = 0;

        const m = item.meta;
        const enEval = session.policy && session.policy.mode === 'evaluation';

        container.innerHTML = `
            <div class="angles-layout">
                ${item.prompt.html}
                ${m.mode === 'mesurer' && !enEval && !session.isDemo ? `
                <div class="angles-estimation" data-estimation>
                    <span class="angles-estimation-label">D'abord, à l'œil :</span>
                    <div class="angles-estimation-choix">
                        <button type="button" class="btn-hint" data-est="aigu">Aigu (&lt; 90°)</button>
                        <button type="button" class="btn-hint" data-est="obtus">Obtus (&gt; 90°)</button>
                    </div>
                </div>` : ''}
                <div class="angles-board" data-board>
                    <canvas class="angles-canvas"></canvas>
                </div>
                <div class="angles-controls">
                    ${m.mode === 'mesurer' ? `
                        <label class="angles-input-label">Valeur lue :
                            <input type="number" class="angles-input" data-angle-input
                                   min="0" max="180" placeholder="?" inputmode="numeric"> °
                        </label>` : `
                        <span class="angles-target">Cible : <b>${m.target}°</b>
                            <span class="angles-built" data-built>— côté rouge : 45°</span></span>`}
                    <button type="button" class="btn-hint" data-loupe>🔍 Loupe</button>
                    <span class="angles-zoom">
                        <button type="button" class="btn-hint" data-zoom="-1" aria-label="Dézoomer" title="Dézoomer">🔍−</button>
                        <button type="button" class="btn-hint" data-zoom="1" aria-label="Zoomer" title="Zoomer">🔍+</button>
                    </span>
                    <button type="button" class="btn-hint" data-recentre>🧭 Recentrer</button>
                    <button type="button" class="kk-btn-valider" data-valider>Valider</button>
                </div>
                ${hintBar(session)}
            </div>`;

        if (paveMesure) { paveMesure.detruire(); paveMesure = null; }
        board = container.querySelector('[data-board]');
        canvas = container.querySelector('.angles-canvas');
        ctx = canvas.getContext('2d');

        etat = {
            phase: (m.mode === 'mesurer' && !enEval && !session.isDemo) ? 'estimation' : 'action',
            baseRot: m.baseDeg * Math.PI / 180,
            sommet: { x: 0, y: 0 },
            legLen: LEG_LEN,
            construit: 45,               // angle du côté rouge (construction)
            rapporteur: { x: 0, y: 0, r: 150, rot: 0, visible: m.mode !== 'mesurer' || enEval || session.isDemo },
            drag: null,                  // 'move' | 'rotate' | 'leg'
            dragOffset: { x: 0, y: 0 },
            rotStart: 0,
            pointeur: { x: 0, y: 0 },
            loupe: false,
            fantome: false,              // trace verte de l'angle cible (correction)
            fige: false,
            place: false,                // l'outil a été posé sur le sommet
            // LA VUE : un zoom et un déplacement appliqués au dessin, et
            // défaits sur les coordonnées du pointeur. Tout le reste du code
            // continue donc de raisonner dans le repère du plateau, sans
            // savoir qu'une vue existe.
            zoom: 1, pan: { x: 0, y: 0 }, pince: null
        };
        // En phase estimation, l'outil est masqué : on juge à l'œil d'abord.
        if (etat.phase === 'estimation') etat.rapporteur.visible = false;

        dimensionner();
        if (observer) observer.disconnect();
        observer = new ResizeObserver(() => { if (!destroyed) dimensionner(); });
        observer.observe(board);

        // Vignette figée du catalogue : une seule image suffit — pas de
        // boucle d'animation à 60 im/s dans une carte immobile.
        if (session.frozen) { dessiner(); return; }
        boucle();

        if (session.isDemo) {
            runDemo();
            return;
        }

        brancherPointeur();
        brancherControles();
        wireHint(container, session);
        // « Montre-moi » ne donne PAS la réponse : il pose l'OUTIL.
        //
        // Le rapporteur va se placer tout seul — centre sur le sommet, zéro
        // sur le côté noir — et s'arrête là. C'est exactement le geste que
        // l'élève ne sait pas faire ; la lecture, elle, lui reste. Annoncer
        // « la réponse est 20 » n'apprenait rien : l'énoncé la donne déjà en
        // mode construction, et en mode mesure elle remplaçait l'exercice.
        //
        // Le texte s'écrit SOUS les commandes, pas en carte par-dessus le
        // plateau : la carte recouvrait l'animation qu'elle commente — et,
        // en redimensionnant la zone de jeu, déplaçait le sommet en pleine
        // course, si bien que le rapporteur arrivait à côté.
        wireShowMe(container, session, {
            enPage: true,
            message: (it) => it.meta.mode === 'mesurer'
                ? 'Je pose le rapporteur : le centre sur le sommet, le zéro sur un côté. À toi de LIRE la graduation où passe l\'autre côté.'
                : `Je pose le rapporteur : le centre sur le sommet, le zéro sur le côté noir. À toi de faire tourner le côté rouge jusqu'à la graduation ${it.meta.target}.`,
            highlight: () => animerCorrection(false, { reveler: false })
        });
    }

    // --- Géométrie & dimensions ---------------------------------------------

    function dimensionner() {
        if (!canvas || !board) return;
        canvas.width = board.clientWidth;
        canvas.height = board.clientHeight;
        etat.sommet.x = canvas.width / 2;
        etat.sommet.y = canvas.height * 0.44;
        // Les côtés se plient à la place disponible : à 260 px fixes, le bout
        // du côté rouge — la poignée pour construire — sortait du canevas sur
        // tablette, et le trait devenait insaisissable.
        etat.legLen = Math.max(120, Math.min(LEG_LEN, canvas.height * 0.42, canvas.width * 0.46));
        etat.rapporteur.r = Math.max(110, Math.min(190, Math.min(canvas.width, canvas.height * 2) * 0.30));
        if (!etat.drag && !etat.fige) {
            // Une fois l'outil POSÉ sur le sommet (par « Montre-moi » ou par la
            // correction), il y reste : un redimensionnement le renvoyait en
            // bas de l'écran et défaisait la démonstration qu'on venait de voir.
            if (etat.place) {
                etat.rapporteur.x = etat.sommet.x;
                etat.rapporteur.y = etat.sommet.y;
            } else {
                etat.rapporteur.x = canvas.width / 2;
                etat.rapporteur.y = Math.min(canvas.height * 0.82, canvas.height - 40);
            }
        }
    }

    /** Coordonnées pointeur → repère interne du canevas (leçon Math Crush). */
    function posDe(e) {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches && e.touches.length ? e.touches[0] : e;
        const x = (src.clientX - rect.left) * (canvas.width / rect.width);
        const y = (src.clientY - rect.top) * (canvas.height / rect.height);
        // On DÉFAIT la vue ici, une fois pour toutes : le rapporteur, le
        // sommet et les poignées se testent dans le repère du plateau.
        return { x: (x - etat.pan.x) / etat.zoom, y: (y - etat.pan.y) / etat.zoom };
    }

    /** Le même point, mais à l'écran : la loupe, elle, se dessine par-dessus. */
    function versEcran(p) {
        return { x: p.x * etat.zoom + etat.pan.x, y: p.y * etat.zoom + etat.pan.y };
    }

    /**
     * Zoomer AUTOUR D'UN POINT : c'est ce qui donne l'impression de tirer la
     * feuille vers soi. Zoomer autour du coin ferait fuir la figure hors du
     * cadre à chaque cran.
     */
    function zoomer(facteur, centre) {
        const av = etat.zoom;
        etat.zoom = Math.max(0.6, Math.min(4, etat.zoom * facteur));
        if (etat.zoom === av) return;
        const c = centre || { x: canvas.width / 2, y: canvas.height / 2 };
        etat.pan.x = c.x - (c.x - etat.pan.x) * (etat.zoom / av);
        etat.pan.y = c.y - (c.y - etat.pan.y) * (etat.zoom / av);
    }

    function recentrer() {
        etat.zoom = 1; etat.pan.x = 0; etat.pan.y = 0;
    }

    function boutRouge() {
        const rad = etat.baseRot - etat.construit * Math.PI / 180;
        return {
            x: etat.sommet.x + Math.cos(rad) * etat.legLen,
            y: etat.sommet.y + Math.sin(rad) * etat.legLen
        };
    }

    // --- Entrées -------------------------------------------------------------

    function brancherPointeur() {
        // PINCER POUR ZOOMER, et UN SEUL DOIGT POUR TIRER LA FEUILLE.
        //
        // Rémy : « pour déplacer le canvas, on pourrait supposer qu'un seul
        // doigt suffit, car au final si on est sur le rapporteur c'est lui
        // qu'on bouge. On garde le pinch par contre. » C'est juste : le doigt
        // posé SUR le rapporteur le saisit, celui posé à côté ne saisissait
        // rien du tout — il ne restait qu'à pincer à deux doigts pour recadrer,
        // ce que personne ne pense à faire pour un simple déplacement. Le
        // glissement hors de l'outil déplace donc la vue.
        //
        // SAUF SOUS LA LOUPE : « et on bloque lorsque c'est la loupe. » Elle
        // suit le doigt ; si la vue suivait aussi, on inspecterait une
        // graduation qui se dérobe. Le retour anticipé de `down` s'en charge.
        const brut = (e, i) => {
            const rect = canvas.getBoundingClientRect();
            const t = e.touches[i];
            return {
                x: (t.clientX - rect.left) * (canvas.width / rect.width),
                y: (t.clientY - rect.top) * (canvas.height / rect.height)
            };
        };
        /** Le point du doigt (ou de la souris) À L'ÉCRAN, vue non défaite. */
        const ecranDe = (e) => {
            const rect = canvas.getBoundingClientRect();
            const src = e.touches && e.touches.length ? e.touches[0] : e;
            return {
                x: (src.clientX - rect.left) * (canvas.width / rect.width),
                y: (src.clientY - rect.top) * (canvas.height / rect.height)
            };
        };

        const pince = (e) => {
            const a = brut(e, 0), b = brut(e, 1);
            return {
                d: Math.hypot(b.x - a.x, b.y - a.y),
                c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
            };
        };

        const down = (e) => {
            if (destroyed || etat.fige || etat.phase !== 'action') return;
            if (e.touches && e.touches.length === 2) {
                if (e.cancelable) e.preventDefault();
                etat.drag = null;
                etat.pince = pince(e);
                return;
            }
            if (e.cancelable) e.preventDefault();
            etat.pointeur = posDe(e);
            // Loupe allumée : le doigt ne fait QUE déplacer la loupe. Il
            // saisissait aussi le rapporteur au passage, si bien qu'inspecter
            // une graduation faisait glisser l'outil qu'on venait de placer.
            if (etat.loupe) return;
            const p = etat.pointeur, r = etat.rapporteur;

            // 1. Le côté rouge (construction) se saisit par son extrémité OU
            // n'importe où sur son trait : exiger la poignée seule le rendait
            // presque insaisissable au doigt.
            if (item.meta.mode === 'construire') {
                const bout = boutRouge();
                if (Math.hypot(p.x - bout.x, p.y - bout.y) < 48
                    || distSegment(p, etat.sommet, bout) < 30) { etat.drag = 'leg'; return; }
            }

            // 2. Poignées de rotation du rapporteur (aux deux bouts du diamètre).
            const dx = p.x - r.x, dy = p.y - r.y;
            const dist = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            const local = angle - r.rot;
            const lx = dist * Math.cos(local), ly = dist * Math.sin(local);
            const dR = Math.hypot(lx - (r.r + 30), ly);
            const dL = Math.hypot(lx + (r.r + 30), ly);
            if (r.visible && (dR < 28 || dL < 28)) {
                etat.drag = 'rotate';
                etat.rotStart = angle - r.rot;
                return;
            }

            // 3. Le corps du rapporteur se déplace.
            if (r.visible && dist <= r.r) {
                etat.drag = 'move';
                etat.dragOffset.x = p.x - r.x;
                etat.dragOffset.y = p.y - r.y;
                return;
            }

            // 4. Rien sous le doigt : c'est LA FEUILLE qu'on tire.
            etat.drag = 'pan';
            etat.panDepart = ecranDe(e);
        };

        const move = (e) => {
            if (destroyed) return;
            if (etat.pince && e.touches && e.touches.length === 2) {
                if (e.cancelable) e.preventDefault();
                const n = pince(e);
                if (etat.pince.d > 10) zoomer(n.d / etat.pince.d, n.c);
                // Le déplacement suit le milieu des deux doigts : on tire la
                // feuille, on ne la fait pas glisser sous un curseur.
                etat.pan.x += n.c.x - etat.pince.c.x;
                etat.pan.y += n.c.y - etat.pince.c.y;
                etat.pince = n;
                return;
            }
            const p = posDe(e);
            etat.pointeur = p;
            // La loupe suit le doigt : on retient le geste, sinon la page
            // défile sous la main pendant qu'on inspecte une graduation.
            if (etat.loupe && !etat.fige && e.cancelable) e.preventDefault();
            if (etat.fige || !etat.drag) return;
            if (e.cancelable) e.preventDefault();
            const r = etat.rapporteur;

            if (etat.drag === 'leg') {
                let deg = (etat.baseRot - Math.atan2(p.y - etat.sommet.y, p.x - etat.sommet.x)) * 180 / Math.PI;
                deg = ((deg % 360) + 360) % 360;
                if (deg > 180) deg = 360 - deg;
                etat.construit = deg;
                majConstruit();
            } else if (etat.drag === 'move') {
                let nx = p.x - etat.dragOffset.x, ny = p.y - etat.dragOffset.y;
                // Aimantation : près du sommet, le centre s'y cale — le geste
                // précis que la mesure exige.
                if (Math.hypot(nx - etat.sommet.x, ny - etat.sommet.y) < SNAP_DIST) {
                    nx = etat.sommet.x; ny = etat.sommet.y;
                }
                r.x = nx; r.y = ny;
            } else if (etat.drag === 'rotate') {
                r.rot = Math.atan2(p.y - r.y, p.x - r.x) - etat.rotStart;
            } else if (etat.drag === 'pan') {
                // On raisonne en pixels d'ÉCRAN : le déplacement de la vue ne
                // peut pas se mesurer dans un repère que ce déplacement change.
                const s = ecranDe(e);
                etat.pan.x += s.x - etat.panDepart.x;
                etat.pan.y += s.y - etat.panDepart.y;
                etat.panDepart = s;
            }
        };

        const up = () => { etat.drag = null; etat.pince = null; };

        canvas.addEventListener('mousedown', down);
        canvas.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        canvas.addEventListener('touchstart', down, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', up);
        nettoyeurs.push(() => {
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchend', up);
        });
    }

    function brancherControles() {
        // Estimation aigu/obtus : un échauffement du regard, jamais compté.
        container.querySelectorAll('[data-est]').forEach(btn => {
            btn.onclick = () => {
                const bon = (btn.dataset.est === 'aigu') === item.meta.aigu;
                const bloc = container.querySelector('[data-estimation]');
                if (bon) {
                    if (bloc) bloc.remove();
                    etat.phase = 'action';
                    etat.rapporteur.visible = true;
                    const input = container.querySelector('[data-angle-input]');
                    if (input) input.focus({ preventScroll: true });
                } else if (bloc) {
                    bloc.classList.remove('angles-estimation--non');
                    void bloc.offsetWidth;
                    bloc.classList.add('angles-estimation--non');
                }
            };
        });

        const loupe = container.querySelector('[data-loupe]');
        if (loupe) loupe.onclick = () => {
            etat.loupe = !etat.loupe;
            loupe.classList.toggle('btn-hint--on', etat.loupe);
        };

        container.querySelectorAll('[data-zoom]').forEach(btn => {
            btn.onclick = () => zoomer(Number(btn.dataset.zoom) > 0 ? 1.25 : 1 / 1.25);
        });

        const recentre = container.querySelector('[data-recentre]');
        if (recentre) recentre.onclick = () => {
            // Recentrer remet AUSSI la vue à plat : après un zoom, c'est le
            // geste par lequel on se sort de n'importe quelle situation.
            recentrer();
            etat.rapporteur.x = canvas.width / 2;
            etat.rapporteur.y = Math.min(canvas.height * 0.82, canvas.height - 40);
            etat.rapporteur.rot = 0;
        };

        const input = container.querySelector('[data-angle-input]');
        if (input) input.onkeydown = (e) => { if (e.key === 'Enter') valider(); };
        container.querySelector('[data-valider]').onclick = valider;

        // LE CLAVIER DU SYSTÈME MANGEAIT LE RAPPORTEUR.
        //
        // Rémy : « pareil pour taper la mesure d'angle avec la tablette, le
        // clavier occupe [la moitié de l'écran] ». Il s'ouvre sur le champ, se
        // pose par-dessus la figure, et il faut le refermer pour revérifier sa
        // lecture — c'est-à-dire refaire le geste à chaque doute. Un pavé DANS
        // la page reste sous les yeux, à côté de ce qu'on mesure. Au doigt
        // seulement : sur un ordinateur, le clavier ne recouvre rien.
        if (paveMesure) { paveMesure.detruire(); paveMesure = null; }
        if (input && auDoigt() && !session.isDemo) {
            sansClavierSysteme(input);
            const barre = container.querySelector('.angles-controls');
            // LE PAVÉ SUIT LA SAISIE, PAS LA BARRE D'INDICES.
            //
            // Rémy, sur téléphone : « le clavier est tronqué en bas ». Posé en
            // dernier, le pavé arrivait APRÈS « Un indice » et « Montre-moi » :
            // sur un écran de 553 points, les quarante-cinq pixels de la barre
            // d'aide suffisaient à pousser la seconde rangée de chiffres hors
            // du cadre — et c'est la rangée qui porte le 0 et le OK. Le pavé
            // se glisse maintenant juste sous les commandes ; s'il manque
            // encore de la place, c'est la barre d'aide qui descend, et on la
            // rattrape en faisant défiler sans avoir perdu le clavier.
            paveMesure = poserPaveTactile(barre.parentElement, {
                champ: () => input,
                maxLong: 3,
                valider,
                avant: container.querySelector('.hint-bar')
            });
        }
    }

    function majConstruit() {
        const el = container.querySelector('[data-built]');
        if (el) el.textContent = `— côté rouge : ${Math.round(etat.construit)}°`;
    }

    // --- Validation ----------------------------------------------------------

    function valider() {
        if (destroyed || session.locked || etat.fige || etat.phase !== 'action') return;
        const m = item.meta;
        let lu;
        if (m.mode === 'mesurer') {
            const input = container.querySelector('[data-angle-input]');
            lu = parseInt(input && input.value, 10);
            if (isNaN(lu)) return;
        } else {
            lu = Math.round(etat.construit);
        }

        // La tolérance s'applique ICI : une lecture à ±3° est une mesure
        // juste. On soumet alors la valeur exacte — le verdict de la session
        // reste une égalité stricte.
        const juste = Math.abs(lu - m.target) <= m.tolerance;
        const result = session.submit(juste ? item.answer : String(lu));
        if (result.ignored) return;

        etat.fige = true;
        result.dismissed.then(() => {
            if (destroyed) return;
            if (result.correct) {
                etat.fantome = true;
                regTimeout(renderNext, 700);
                return;
            }
            if (result.revealed) {
                // Plus d'essai : la correction se MONTRE — le rapporteur se
                // place tout seul, le fantôme vert donne la bonne lecture.
                animerCorrection(true);
            } else {
                etat.fige = false;   // nouvel essai
            }
        });
    }

    /**
     * Correction animée (partagée avec « Montre-moi ») : le rapporteur
     * rejoint le sommet, s'aligne sur le côté fixe, et le fantôme vert trace
     * l'angle cible. `puisSuivant` enchaîne sur la question suivante.
     */
    /**
     * Où doit se tourner le rapporteur.
     *
     * La coupole graduée ne couvre qu'un demi-plan. Avec `baseRot + π`, le
     * zéro de gauche tombait bien sur le côté noir — mais la coupole se
     * retrouvait du côté OPPOSÉ à l'ouverture de l'angle : le second côté
     * sortait par le dessous, là où il n'y a aucune graduation, et la mesure
     * ne pouvait pas se lire. C'est `baseRot` qu'il faut : la coupole coiffe
     * alors l'angle, et c'est le zéro de DROITE qui se pose sur le côté noir.
     * C'est précisément à cela que sert la double échelle d'un rapporteur.
     */
    function rotationLecture() { return etat.baseRot; }

    function animerCorrection(puisSuivant, opts = {}) {
        // `reveler` : la correction de FIN d'essais montre tout — fantôme vert
        // et côté rouge amené sur la cible. « Montre-moi », lui, ne pose que
        // l'outil : la lecture et le geste restent à l'élève.
        const reveler = opts.reveler !== false;
        etat.fige = true;
        etat.place = true;
        etat.rapporteur.visible = true;
        if (reveler) etat.fantome = true;
        const r = etat.rapporteur;
        const de = { x: r.x, y: r.y, rot: r.rot, construit: etat.construit };
        // « Montre-moi » se regarde pour comprendre : nettement plus lent que la
        // correction de fin d'essais, qui enchaîne sur la suite.
        const debut = performance.now(), duree = puisSuivant ? 2400 : 5200;

        const pas = (t) => {
            if (destroyed) return;
            const p = Math.min((t - debut) / duree, 1);
            const e = 1 - Math.pow(1 - p, 3);
            // La cible est relue à CHAQUE image : si la zone de jeu change de
            // taille pendant l'animation — une carte d'aide qui s'ouvre, le
            // clavier qui apparaît — le sommet bouge, et un point d'arrivée
            // figé au départ laissait le rapporteur à côté.
            const vers = { x: etat.sommet.x, y: etat.sommet.y, rot: rotationLecture() };
            // DEUX temps, pas un seul mouvement. Poser le centre puis tourner
            // le zéro sont les deux gestes qu'on enseigne, et les mener de
            // front donne une glissade dont on ne retient rien. Le premier
            // tiers place, le reste oriente.
            const pose = Math.min(1, e / 0.34), tourne = Math.max(0, (e - 0.34) / 0.66);
            r.x = de.x + (vers.x - de.x) * pose;
            r.y = de.y + (vers.y - de.y) * pose;
            r.rot = de.rot + (vers.rot - de.rot) * tourne;
            if (reveler && item.meta.mode === 'construire') {
                etat.construit = de.construit + (item.meta.target - de.construit) * e;
                majConstruit();
            }
            if (p < 1) requestAnimationFrame(pas);
            else if (puisSuivant) regTimeout(renderNext, 2000);
            else { etat.fige = false; r.x = etat.sommet.x; r.y = etat.sommet.y; }
        };
        requestAnimationFrame(pas);
    }

    // --- Dessin --------------------------------------------------------------

    function boucle() {
        if (rafId) cancelAnimationFrame(rafId);
        const tick = () => {
            if (destroyed) return;
            dessiner();
            rafId = requestAnimationFrame(tick);
        };
        tick();
    }

    function dessiner() {
        if (!ctx) return;
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(etat.pan.x, etat.pan.y);
        ctx.scale(etat.zoom, etat.zoom);

        // QUADRILLAGE DISCRET, SUR TOUT CE QU'ON VOIT. Rémy : « quand on
        // dézoome, le quadrillage n'est pas complet ». Il était tracé de 0 à la
        // largeur du canevas — c'est-à-dire sur la vue NON transformée — alors
        // qu'il se dessine après le déplacement et le zoom : dès qu'on
        // s'éloignait ou qu'on faisait glisser la vue, on voyait le bord du
        // papier et le carreau s'arrêtait au milieu de l'écran.
        // On calcule donc le rectangle du monde réellement visible, et l'on
        // trace les lignes en s'alignant sur le pas de 40.
        ctx.save();
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.14)';
        // Le trait garde son épaisseur à l'écran : sous le zoom, un trait de 1
        // devient un trait de 4 quand on s'approche, et de 0,3 quand on
        // s'éloigne — un carreau plus visible que l'angle, ou plus du tout.
        ctx.lineWidth = 1 / etat.zoom;
        const PAS = 40;
        const gauche = -etat.pan.x / etat.zoom, droite = (w - etat.pan.x) / etat.zoom;
        const haut = -etat.pan.y / etat.zoom, bas = (h - etat.pan.y) / etat.zoom;
        const debutX = Math.floor(gauche / PAS) * PAS;
        const debutY = Math.floor(haut / PAS) * PAS;
        ctx.beginPath();
        for (let x = debutX; x <= droite; x += PAS) { ctx.moveTo(x, haut); ctx.lineTo(x, bas); }
        for (let y = debutY; y <= bas; y += PAS) { ctx.moveTo(gauche, y); ctx.lineTo(droite, y); }
        ctx.stroke();
        ctx.restore();

        dessinerAngle();
        if (etat.rapporteur.visible) dessinerRapporteur();
        ctx.restore();
        // La loupe est un instrument POSÉ SUR la vue : elle ne zoome pas avec
        // elle, sinon regarder une graduation de près en changerait la taille.
        if (etat.loupe && !etat.fige) dessinerLoupe();
    }

    function dessinerAngle() {
        const m = item.meta;
        const s = etat.sommet;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(etat.baseRot);
        ctx.lineCap = 'round';
        // Traits FINS : un côté épais couvre plusieurs graduations, et c'est
        // exactement la graduation croisée qu'on demande de lire.
        ctx.lineWidth = 1.6;

        const L = etat.legLen;
        const angle = m.mode === 'mesurer' ? m.target : etat.construit;

        // LE SECTEUR EST PEINT. Deux traits partant d'un point laissent
        // toujours DEUX angles — celui qu'on voit et son rentrant — et rien ne
        // disait lequel on demandait. Une zone colorée entre les deux côtés le
        // dit sans une phrase : c'est CET espace-là qu'on mesure.
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, L * 0.62, -angle * Math.PI / 180, 0);
        ctx.closePath();
        const secteur = ctx.createRadialGradient(0, 0, 0, 0, 0, L * 0.62);
        secteur.addColorStop(0, 'rgba(99, 102, 241, .30)');
        secteur.addColorStop(1, 'rgba(99, 102, 241, .06)');
        ctx.fillStyle = secteur;
        ctx.fill();
        ctx.restore();

        // Côté fixe (noir)
        ctx.strokeStyle = '#0f172a';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();

        // Second côté
        if (m.mode === 'mesurer') {
            ctx.save();
            ctx.rotate(-m.target * Math.PI / 180);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
            ctx.restore();
        } else {
            ctx.save();
            ctx.rotate(-etat.construit * Math.PI / 180);
            // Le côté mobile reste un peu plus marqué que le côté fixe — c'est
            // lui qu'on saisit — mais fin lui aussi : la poignée du bout suffit
            // à le désigner.
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
            ctx.beginPath(); ctx.arc(L, 0, 11, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444'; ctx.fill();
            ctx.beginPath(); ctx.arc(L, 0, 11, 0, Math.PI * 2);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        }

        // Fantôme vert : l'angle cible, pendant la correction.
        if (etat.fantome) {
            ctx.save();
            ctx.rotate(-m.target * Math.PI / 180);
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
            ctx.setLineDash([8, 6]);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
            ctx.restore();
        }

        // Arc de l'angle, franc, avec le point d'interrogation POSÉ DEDANS :
        // la question est écrite à l'endroit exact où se trouve sa réponse.
        ctx.beginPath();
        ctx.arc(0, 0, 34, -angle * Math.PI / 180, 0);
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.restore();

        if (m.mode === 'mesurer') {
            const mi = etat.baseRot - (angle / 2) * Math.PI / 180;
            const d = 58;
            const mx = s.x + Math.cos(mi) * d, my = s.y + Math.sin(mi) * d;
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,.9)';
            ctx.beginPath(); ctx.arc(mx, my, 15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#4f46e5';
            ctx.font = '900 19px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('?', mx, my + 1);
            ctx.restore();
        }

        // Sommet
        ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444'; ctx.fill();
    }

    function dessinerRapporteur() {
        const r = etat.rapporteur;
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot);
        const R = r.r;

        // Corps semi-transparent
        ctx.beginPath(); ctx.arc(0, 0, R, Math.PI, 0); ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = '#64748b'; ctx.stroke();

        // Ligne de base + croix centrale
        ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0);
        ctx.lineWidth = 2; ctx.strokeStyle = '#0f172a'; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.moveTo(-14, 0); ctx.lineTo(14, 0);
        ctx.strokeStyle = '#ef4444'; ctx.stroke();

        // Graduations, double échelle
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const fs = Math.max(9, R / 15);
        for (let i = 0; i <= 180; i++) {
            const rad = Math.PI + i * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);
            const major = i % 10 === 0;
            const len = major ? R * 0.07 : (i % 5 === 0 ? R * 0.05 : R * 0.025);
            ctx.beginPath();
            ctx.moveTo(cos * R, sin * R);
            ctx.lineTo(cos * (R - len), sin * (R - len));
            ctx.lineWidth = major ? 1.4 : 0.5;
            ctx.strokeStyle = '#334155';
            ctx.stroke();
            if (major) {
                ctx.font = `bold ${fs}px Outfit, sans-serif`;
                ctx.fillStyle = '#0f172a';
                ctx.fillText(i, cos * R * 0.85, sin * R * 0.85);
                ctx.font = `${fs * 0.85}px Outfit, sans-serif`;
                ctx.fillStyle = '#64748b';
                ctx.fillText(180 - i, cos * R * 0.70, sin * R * 0.70);
            }
        }

        // Poignées de rotation
        [R + 30, -(R + 30)].forEach(x => {
            ctx.beginPath(); ctx.arc(x, 0, 14, 0, Math.PI * 2);
            ctx.fillStyle = '#6366f1'; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        });
        ctx.restore();
    }

    function dessinerLoupe() {
        const zoom = 2.6, R = 80;
        const { x, y } = versEcran(etat.pointeur);
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.translate(x, y); ctx.scale(zoom, zoom); ctx.translate(-x, -y);
        ctx.translate(etat.pan.x, etat.pan.y); ctx.scale(etat.zoom, etat.zoom);
        dessinerAngle();
        if (etat.rapporteur.visible) dessinerRapporteur();
        ctx.restore();

        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.lineWidth = 3; ctx.strokeStyle = '#22c55e'; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y);
        ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12);
        ctx.lineWidth = 1; ctx.strokeStyle = '#ef4444'; ctx.stroke();
        ctx.restore();
    }

    // --- Robot de démonstration ----------------------------------------------
    //
    // Il fait le geste qu'on enseigne, dans l'ordre où on l'enseigne, et dit
    // pourquoi : centre sur le sommet, zéro aligné, lecture de la bonne
    // échelle (ou construction du côté rouge). Pause et pas-à-pas compris.

    function ancre(x, y) {
        const rect = canvas.getBoundingClientRect();
        const el = document.createElement('div');
        el.style.cssText = `position:fixed;width:1px;height:1px;pointer-events:none;`
            + `left:${rect.left + x * (rect.width / canvas.width)}px;`
            + `top:${rect.top + y * (rect.height / canvas.height)}px;`;
        document.body.appendChild(el);
        return el;
    }

    function tween(fn, duree) {
        return new Promise(resolve => {
            const debut = performance.now();
            const pas = (t) => {
                if (destroyed) return resolve(false);
                const p = Math.min((t - debut) / duree, 1);
                fn(1 - Math.pow(1 - p, 3));
                if (p < 1) requestAnimationFrame(pas);
                else resolve(true);
            };
            requestAnimationFrame(pas);
        });
    }

    async function runDemo() {
        const m = item.meta;
        if (!cursor) cursor = createDemoCursor();
        const gate = createDemoGate(container.querySelector('.angles-layout') || container);
        const fin = () => { cursor?.hideBubble(); gate?.destroy(); };

        if (!await cursor.pause(700) || destroyed) return fin();

        // 1. Centre sur le sommet
        if (!await gate.waitTurn() || destroyed) return fin();
        let a = ancre(etat.sommet.x, etat.sommet.y);
        cursor.say('Je place le centre du rapporteur (la croix) exactement sur le sommet de l\'angle.', a);
        await cursor.moveTo(a);
        const r = etat.rapporteur;
        const de1 = { x: r.x, y: r.y };
        const ok1 = await tween(e => {
            r.x = de1.x + (etat.sommet.x - de1.x) * e;
            r.y = de1.y + (etat.sommet.y - de1.y) * e;
        }, 1400);
        a.remove();
        if (!ok1 || destroyed) return fin();
        if (!await cursor.pause(900) || destroyed) return fin();

        // 2. Zéro aligné sur un côté
        if (!await gate.waitTurn() || destroyed) return fin();
        cursor.say('Je tourne le rapporteur pour aligner son zéro avec un côté de l\'angle.');
        const de2 = r.rot, vers2 = rotationLecture();
        if (!await tween(e => { r.rot = de2 + (vers2 - de2) * e; }, 1400) || destroyed) return fin();
        if (!await cursor.pause(900) || destroyed) return fin();

        // 3. Lecture ou construction
        if (!await gate.waitTurn() || destroyed) return fin();
        if (m.mode === 'mesurer') {
            etat.fantome = true;
            cursor.say(`L'angle est ${m.aigu ? 'aigu' : 'obtus'} : entre ${m.target} et ${180 - m.target}, `
                + `je lis ${m.target}°.`);
            const input = container.querySelector('[data-angle-input]');
            if (input) input.value = m.target;
        } else {
            cursor.say(`J'amène le côté rouge sur la graduation ${m.target} : l'angle fait ${m.target}°.`);
            const de3 = etat.construit;
            if (!await tween(e => { etat.construit = de3 + (m.target - de3) * e; majConstruit(); }, 1600) || destroyed) return fin();
            etat.fantome = true;
        }
        if (!await cursor.pause(DEMO_SPEED.between + 900) || destroyed) return fin();

        fin();
        renderNext();
    }

    // --- Cycle de vie ---------------------------------------------------------

    const nettoyeurs = [];

    renderNext();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        pause() {
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
        },
        destroy() {
            destroyed = true;
            if (rafId) cancelAnimationFrame(rafId);
            if (observer) observer.disconnect();
            if (cursor) { cursor.destroy(); cursor = null; }
            if (paveMesure) { paveMesure.detruire(); paveMesure = null; }
            nettoyeurs.forEach(f => f());
            container.innerHTML = '';
            session.finish();
        }
    };
}
