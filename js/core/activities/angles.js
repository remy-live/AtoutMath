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
                <div class="angles-board" data-board>
                    <canvas class="angles-canvas"></canvas>
                    ${m.mode === 'mesurer' && !enEval && !session.isDemo ? `
                    <div class="angles-estimation" data-estimation>
                        <span class="angles-estimation-label">D'abord, à l'œil :</span>
                        <button type="button" class="btn-hint" data-est="aigu">Aigu (&lt; 90°)</button>
                        <button type="button" class="btn-hint" data-est="obtus">Obtus (&gt; 90°)</button>
                    </div>` : ''}
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
                    <button type="button" class="btn-hint" data-recentre>🧭 Recentrer</button>
                    <button type="button" class="kk-btn-valider" data-valider>Valider</button>
                </div>
                ${hintBar(session)}
            </div>`;

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
            fige: false
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
        // « Montre-moi » : en plus du texte, la correction ANIMÉE — le
        // rapporteur va se placer tout seul sur le sommet, zéro aligné, et
        // le fantôme vert montre la bonne lecture. L'élève valide ensuite.
        wireShowMe(container, session, { highlight: () => animerCorrection(false) });
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
            etat.rapporteur.x = canvas.width / 2;
            etat.rapporteur.y = Math.min(canvas.height * 0.82, canvas.height - 40);
        }
    }

    /** Coordonnées pointeur → repère interne du canevas (leçon Math Crush). */
    function posDe(e) {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches && e.touches.length ? e.touches[0] : e;
        return {
            x: (src.clientX - rect.left) * (canvas.width / rect.width),
            y: (src.clientY - rect.top) * (canvas.height / rect.height)
        };
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
        const down = (e) => {
            if (destroyed || etat.fige || etat.phase !== 'action') return;
            if (e.cancelable) e.preventDefault();
            etat.pointeur = posDe(e);
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
            }
        };

        const move = (e) => {
            if (destroyed) return;
            const p = posDe(e);
            etat.pointeur = p;
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
            }
        };

        const up = () => { etat.drag = null; };

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

        const recentre = container.querySelector('[data-recentre]');
        if (recentre) recentre.onclick = () => {
            etat.rapporteur.x = canvas.width / 2;
            etat.rapporteur.y = Math.min(canvas.height * 0.82, canvas.height - 40);
            etat.rapporteur.rot = 0;
        };

        const input = container.querySelector('[data-angle-input]');
        if (input) input.onkeydown = (e) => { if (e.key === 'Enter') valider(); };
        container.querySelector('[data-valider]').onclick = valider;
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
    function animerCorrection(puisSuivant) {
        etat.fige = true;
        etat.rapporteur.visible = true;
        etat.fantome = true;
        const r = etat.rapporteur;
        const de = { x: r.x, y: r.y, rot: r.rot, construit: etat.construit };
        const vers = { x: etat.sommet.x, y: etat.sommet.y, rot: etat.baseRot + Math.PI, construit: item.meta.target };
        // « Montre-moi » se regarde pour comprendre : plus lent que la
        // correction de fin d'essais, qui enchaîne sur la suite.
        const debut = performance.now(), duree = puisSuivant ? 2200 : 3200;

        const pas = (t) => {
            if (destroyed) return;
            const p = Math.min((t - debut) / duree, 1);
            const e = 1 - Math.pow(1 - p, 3);
            r.x = de.x + (vers.x - de.x) * e;
            r.y = de.y + (vers.y - de.y) * e;
            r.rot = de.rot + (vers.rot - de.rot) * e;
            if (item.meta.mode === 'construire') {
                etat.construit = de.construit + (vers.construit - de.construit) * e;
                majConstruit();
            }
            if (p < 1) requestAnimationFrame(pas);
            else if (puisSuivant) regTimeout(renderNext, 2000);
            else etat.fige = false;   // Montre-moi : la main revient à l'élève
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

        // Quadrillage discret
        ctx.save();
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < w; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = 0; y < h; y += 40) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();
        ctx.restore();

        dessinerAngle();
        if (etat.rapporteur.visible) dessinerRapporteur();
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

        // Arc de l'angle
        ctx.beginPath();
        const a = m.mode === 'mesurer' ? m.target : etat.construit;
        ctx.arc(0, 0, 30, -a * Math.PI / 180, 0);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();

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
        const { x, y } = etat.pointeur;
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.translate(x, y); ctx.scale(zoom, zoom); ctx.translate(-x, -y);
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
        const fin = () => { cursor.hideBubble(); gate.destroy(); };

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
        const de2 = r.rot, vers2 = etat.baseRot + Math.PI;
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
            nettoyeurs.forEach(f => f());
            container.innerHTML = '';
            session.finish();
        }
    };
}
