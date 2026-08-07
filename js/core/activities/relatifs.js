// Activité « Nombres relatifs » : la droite graduée qu'on voit bouger.
//
// Trois décors pour une seule idée — un nombre est une POSITION, une addition
// est un DÉPLACEMENT :
//
//   ASCENSEUR    une cage, des étages numérotés, le rez-de-chaussée en gras
//                et les sous-sols en dessous. La cabine glisse.
//   THERMOMÈTRE  la même droite, en verre et en mercure : au-dessus de zéro
//                la colonne est rouge, en dessous elle est bleue.
//   PASTILLES    pas de droite du tout : des jetons bleus (+1) et rouges
//                (−1) qu'on APPARIE. C'est le seul modèle qui explique
//                POURQUOI les signes s'annulent, et il n'explique que ça.
//   ÉCRITURE     la droite redevient horizontale et nue, comme au tableau.
//
// Un parti pris : LE DÉPLACEMENT S'ANIME, toujours, à chaque validation et à
// chaque indice. Un élève qui répond 8 à « −3 monte de 5 » n'a pas fait
// d'erreur de calcul : il a ajouté deux distances. Lui montrer le trajet
// cran par cran, en comptant à voix haute, vaut mieux que lui réécrire la
// règle — et c'est justement ce qu'un cahier ne peut pas faire.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint, wireShowMe } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';

/** Un nombre avec un VRAI signe moins : le même que sur l'énoncé. */
const nb = (v) => String(v).replace('-', '−');

export function mount(container, session) {
    let destroyed = false;
    let cursor = null, gate = null;
    let cnv = null, ctx = null, item = null, etat = null;
    let rafId = null;
    let observateur = null;
    const nettoyeurs = [];

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(courant) {
        item = courant;
        nettoyeurs.forEach(f => f());
        nettoyeurs.length = 0;
        const m = item.meta;

        const clavier = item.answerKind === 'choice'
            ? `<div class="rl-choix">${item.choices.map(c =>
                `<button type="button" class="rl-choix-btn" data-choix="${c.value}">${c.label}</button>`).join('')}</div>`
            : `<div class="rl-saisie">
                    <label class="rl-champ">
                        <span>Résultat</span>
                        <input type="number" data-reponse placeholder="?" inputmode="numeric">
                    </label>
                    <button type="button" class="kk-btn-valider" data-valider>Valider</button>
               </div>`;

        container.innerHTML = `
            <div class="rl-layout">
                ${item.prompt.html}
                <div class="rl-niveau">Étape ${m.rang} / ${m.total_niveaux} · ${m.titre}</div>
                <div class="rl-scene" data-scene>
                    <canvas class="rl-canvas"></canvas>
                </div>
                <div class="rl-compte" data-compte></div>
                ${clavier}
                ${hintBar(session)}
            </div>`;

        const scene = container.querySelector('[data-scene]');
        cnv = container.querySelector('.rl-canvas');
        ctx = cnv.getContext('2d');

        etat = {
            modele: m.modele,
            depart: m.depart, deplacements: m.deplacements, total: m.total,
            min: m.min, max: m.max,
            // `curseur` est la position AFFICHÉE : elle vaut le départ tant
            // qu'on n'a pas animé, puis glisse jusqu'à l'arrivée.
            curseur: m.depart,
            pas: 0,                 // combien de crans déjà parcourus
            apparies: 0,            // pastilles déjà barrées
            juste: null,
            fige: false
        };

        dimensionner();
        if (typeof ResizeObserver === 'function') {
            observateur = new ResizeObserver(() => { dimensionner(); });
            observateur.observe(scene);
            nettoyeurs.push(() => { if (observateur) { observateur.disconnect(); observateur = null; } });
        }
        boucle();
        brancher();
        majCompte();

        wireHint(container, session);
        wireShowMe(container, session, {
            enPage: true,
            message: 'Je te montre le déplacement, cran par cran. À toi de lire où on arrive.',
            highlight: () => animerTrajet()
        });
    }

    // --- Mise à l'échelle -----------------------------------------------------

    function dimensionner() {
        if (!cnv || !cnv.parentElement) return;
        const r = cnv.parentElement.getBoundingClientRect();
        const dpr = Math.min(3, window.devicePixelRatio || 1);
        const w = Math.max(120, r.width), h = Math.max(120, r.height);
        cnv.width = Math.round(w * dpr);
        cnv.height = Math.round(h * dpr);
        cnv.style.width = w + 'px';
        cnv.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        etat.vue = { w, h };
    }

    // --- Le compteur de crans, sous la scène ---------------------------------
    // Il DIT ce que le dessin montre : « −3, puis 5 crans vers le haut ».
    // Sans lui, l'animation est jolie et muette.

    function majCompte() {
        const el = container.querySelector('[data-compte]');
        if (!el || !etat) return;
        if (etat.modele === 'pastilles') {
            const paires = Math.min(Math.abs(etat.depart), Math.abs(etat.deplacements[0]));
            el.textContent = etat.apparies > 0
                ? `${etat.apparies} paire${etat.apparies > 1 ? 's' : ''} barrée${etat.apparies > 1 ? 's' : ''} sur ${paires} — chaque paire vaut 0`
                : (etat.depart >= 0) === (etat.deplacements[0] >= 0)
                    ? 'Toutes de la même couleur : aucune paire ne s\'annule.'
                    : 'Associe une bleue avec une rouge : chaque paire vaut 0.';
            return;
        }
        const d = etat.deplacements[0];
        const sens = etat.modele === 'ecriture'
            ? (d >= 0 ? 'vers la droite' : 'vers la gauche')
            : (d >= 0 ? 'vers le haut' : 'vers le bas');
        el.textContent = etat.pas > 0
            ? `${nb(etat.depart)} puis ${etat.pas} cran${etat.pas > 1 ? 's' : ''} ${sens} → ${nb(Math.round(etat.curseur))}`
            : `On part de ${nb(etat.depart)}.`;
    }

    // --- Dessin ---------------------------------------------------------------

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
        if (!ctx || !etat || !etat.vue) return;
        const { w, h } = etat.vue;
        ctx.clearRect(0, 0, w, h);
        if (etat.modele === 'pastilles') dessinerPastilles(w, h);
        else if (etat.modele === 'ecriture') dessinerDroite(w, h);
        else dessinerColonne(w, h);
    }

    /** Combien de graduations, et où tombe la valeur `v` sur l'axe. */
    function echelle(long) {
        const n = etat.max - etat.min;
        const marge = long * 0.08;
        const utile = long - marge * 2;
        return { pas: utile / n, zero: marge, place: (v) => marge + (v - etat.min) * (utile / n) };
    }

    /** La colonne verticale : ascenseur ou thermomètre. */
    function dessinerColonne(w, h) {
        const c = ctx;
        const e = echelle(h);
        const y = (v) => h - e.place(v);          // le haut de l'écran = les grands nombres
        const axeX = w * 0.42;
        const thermo = etat.modele === 'thermometre';

        // La cage / le tube.
        c.save();
        if (thermo) {
            c.fillStyle = 'rgba(148,163,184,.16)';
            c.beginPath(); c.roundRect(axeX - 13, y(etat.max) - 6, 26, y(etat.min) - y(etat.max) + 40, 13); c.fill();
            // Le mercure : rouge au-dessus de zéro, bleu en dessous.
            const v = etat.curseur;
            c.fillStyle = v >= 0 ? '#ef4444' : '#38bdf8';
            const yv = y(v), y0 = y(0);
            c.beginPath();
            c.roundRect(axeX - 7, Math.min(yv, y0), 14, Math.abs(yv - y0) + 2, 7);
            c.fill();
            c.beginPath(); c.arc(axeX, y(etat.min) + 22, 17, 0, Math.PI * 2);
            c.fillStyle = v >= 0 ? '#ef4444' : '#38bdf8'; c.fill();
        } else {
            c.fillStyle = 'rgba(148,163,184,.14)';
            c.beginPath(); c.roundRect(axeX - 26, y(etat.max) - 10, 52, y(etat.min) - y(etat.max) + 20, 10); c.fill();
        }
        c.restore();

        // Les graduations et leurs nombres.
        c.save();
        c.textAlign = 'right'; c.textBaseline = 'middle';
        const police = Math.max(9, Math.min(15, e.pas * 0.9));
        // Toutes les graduations sont tracées — on compte des crans — mais on
        // n'écrit un nombre que là où il y a la place de le lire.
        const saut = Math.max(1, Math.ceil((police * 1.25) / Math.max(1, e.pas)));
        c.font = `700 ${police}px 'Inter', system-ui, sans-serif`;
        for (let v = etat.min; v <= etat.max; v++) {
            const yy = y(v);
            const zero = v === 0;
            if (!zero && v % saut !== 0) {
                c.strokeStyle = 'rgba(148,163,184,.32)'; c.lineWidth = 1;
                c.beginPath();
                c.moveTo(axeX - (thermo ? 18 : 30), yy); c.lineTo(axeX - (thermo ? 14 : 26), yy);
                c.stroke();
                continue;
            }
            c.strokeStyle = zero ? '#0f172a' : 'rgba(148,163,184,.45)';
            c.lineWidth = zero ? 2.5 : 1;
            c.beginPath();
            c.moveTo(axeX - (thermo ? 20 : 32), yy); c.lineTo(axeX - (thermo ? 14 : 26), yy);
            c.stroke();
            c.fillStyle = zero ? '#0f172a' : '#64748b';
            c.font = `${zero ? 900 : 700} ${police}px 'Inter', system-ui, sans-serif`;
            c.fillText(thermo ? nb(v) : etiquetteEtage(v), axeX - (thermo ? 24 : 36), yy);
        }
        c.restore();

        // Le trajet parcouru, en surbrillance.
        if (etat.pas > 0) {
            c.save();
            c.strokeStyle = etat.deplacements[0] >= 0 ? '#22c55e' : '#f97316';
            c.lineWidth = 5; c.lineCap = 'round';
            c.beginPath(); c.moveTo(axeX + 26, y(etat.depart)); c.lineTo(axeX + 26, y(etat.curseur));
            c.stroke();
            fleche(c, axeX + 26, y(etat.curseur), etat.deplacements[0] >= 0 ? -1 : 1,
                etat.deplacements[0] >= 0 ? '#22c55e' : '#f97316');
            c.restore();
        }

        // La cabine (ou le curseur du thermomètre).
        const yc = y(etat.curseur);
        c.save();
        if (thermo) {
            c.fillStyle = '#0f172a';
            c.beginPath(); c.moveTo(axeX + 14, yc); c.lineTo(axeX + 26, yc - 7); c.lineTo(axeX + 26, yc + 7);
            c.closePath(); c.fill();
        } else {
            c.fillStyle = etat.juste === false ? '#fecaca' : '#bae6fd';
            c.strokeStyle = '#0369a1'; c.lineWidth = 2.5;
            c.beginPath(); c.roundRect(axeX - 22, yc - 13, 44, 26, 6); c.fill(); c.stroke();
            c.fillStyle = '#0c4a6e';
            c.font = '900 13px \'Inter\', system-ui, sans-serif';
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText('▮▮', axeX, yc);
        }
        c.restore();
    }

    function etiquetteEtage(v) {
        return v === 0 ? 'RDC' : v > 0 ? String(v) : `−${Math.abs(v)}`;
    }

    /** La droite horizontale, nue, comme au tableau. */
    function dessinerDroite(w, h) {
        const c = ctx;
        const e = echelle(w);
        const x = (v) => e.place(v);
        const axeY = h * 0.56;

        c.save();
        c.strokeStyle = '#94a3b8'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(e.place(etat.min) - 10, axeY); c.lineTo(e.place(etat.max) + 10, axeY); c.stroke();
        fleche(c, e.place(etat.max) + 10, axeY, 0, '#94a3b8', 1);

        const police = Math.max(9, Math.min(14, e.pas * 0.85));
        // TOUTES les graduations sont tracées — on compte des crans, il en
        // faut un par unité — mais on n'écrit pas tous les nombres : à 12 px
        // d'écart, « −12−11−10 » se lisait comme un seul mot.
        const saut = Math.max(1, Math.ceil((police * 2.1) / Math.max(1, e.pas)));
        c.textAlign = 'center'; c.textBaseline = 'top';
        for (let v = etat.min; v <= etat.max; v++) {
            const xx = x(v), zero = v === 0;
            c.strokeStyle = zero ? '#0f172a' : '#cbd5e1';
            c.lineWidth = zero ? 2.5 : 1;
            c.beginPath(); c.moveTo(xx, axeY - (zero ? 12 : 7)); c.lineTo(xx, axeY + (zero ? 12 : 7)); c.stroke();
            if (!zero && v % saut !== 0) continue;
            c.fillStyle = zero ? '#0f172a' : '#64748b';
            c.font = `${zero ? 900 : 700} ${police}px 'Inter', system-ui, sans-serif`;
            c.fillText(nb(v), xx, axeY + 14);
        }
        c.restore();

        if (etat.pas > 0) {
            c.save();
            const vers = etat.curseur >= etat.depart ? 1 : -1;
            c.strokeStyle = vers > 0 ? '#22c55e' : '#f97316';
            c.lineWidth = 5; c.lineCap = 'round';
            c.beginPath(); c.moveTo(x(etat.depart), axeY - 26); c.lineTo(x(etat.curseur), axeY - 26); c.stroke();
            fleche(c, x(etat.curseur), axeY - 26, 0, vers > 0 ? '#22c55e' : '#f97316', vers);
            c.restore();
        }

        c.save();
        c.fillStyle = etat.juste === false ? '#ef4444' : '#6366f1';
        c.beginPath(); c.arc(x(etat.curseur), axeY, 9, 0, Math.PI * 2); c.fill();
        c.restore();
    }

    /** Les pastilles : le seul modèle qui explique l'annulation. */
    function dessinerPastilles(w, h) {
        const c = ctx;
        const a = etat.depart, b = etat.deplacements[0];
        const bleues = Math.max(0, a) + Math.max(0, b);
        const rouges = Math.abs(Math.min(0, a)) + Math.abs(Math.min(0, b));
        const total = bleues + rouges;
        const parRangee = Math.min(7, Math.max(4, Math.ceil(Math.sqrt(total * 1.6))));
        const r = Math.min(22, (w * 0.9) / (parRangee * 2.4), (h * 0.42) / 2.6);
        const paires = Math.min(bleues, rouges);

        const poser = (n, couleur, y0, decale) => {
            for (let i = 0; i < n; i++) {
                const cx = w / 2 + ((i % parRangee) - (Math.min(n, parRangee) - 1) / 2) * (r * 2.3);
                const cy = y0 + Math.floor(i / parRangee) * (r * 2.3);
                const barre = i < decale;
                c.save();
                c.globalAlpha = barre ? 0.32 : 1;
                c.fillStyle = couleur === 'bleu' ? '#3b82f6' : '#ef4444';
                c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#fff';
                c.font = `900 ${Math.round(r * 1.05)}px 'Inter', system-ui, sans-serif`;
                c.textAlign = 'center'; c.textBaseline = 'middle';
                c.fillText(couleur === 'bleu' ? '+' : '−', cx, cy + 1);
                if (barre) {
                    c.globalAlpha = 1;
                    c.strokeStyle = '#0f172a'; c.lineWidth = 3; c.lineCap = 'round';
                    c.beginPath();
                    c.moveTo(cx - r * 0.8, cy - r * 0.8); c.lineTo(cx + r * 0.8, cy + r * 0.8);
                    c.stroke();
                }
                c.restore();
            }
        };
        poser(bleues, 'bleu', h * 0.33, Math.min(etat.apparies, bleues));
        poser(rouges, 'rouge', h * 0.69, Math.min(etat.apparies, rouges));

        // Les traits d'appariement : c'est eux qui font voir la paire.
        if (etat.apparies > 0) {
            c.save();
            c.strokeStyle = 'rgba(15,23,42,.35)'; c.lineWidth = 2; c.setLineDash([4, 4]);
            for (let i = 0; i < Math.min(etat.apparies, paires); i++) {
                const cxb = w / 2 + ((i % parRangee) - (Math.min(bleues, parRangee) - 1) / 2) * (r * 2.3);
                const cxr = w / 2 + ((i % parRangee) - (Math.min(rouges, parRangee) - 1) / 2) * (r * 2.3);
                c.beginPath();
                c.moveTo(cxb, h * 0.33 + Math.floor(i / parRangee) * (r * 2.3) + r);
                c.lineTo(cxr, h * 0.69 + Math.floor(i / parRangee) * (r * 2.3) - r);
                c.stroke();
            }
            c.restore();
        }
    }

    function fleche(c, x, y, vertical, couleur, sens = 1) {
        c.save();
        c.fillStyle = couleur;
        c.beginPath();
        if (vertical) {
            c.moveTo(x, y + vertical * 12 * -1);
            c.lineTo(x - 7, y + vertical * 4 * -1 + vertical * 8);
            c.lineTo(x + 7, y + vertical * 4 * -1 + vertical * 8);
        } else {
            c.moveTo(x + sens * 12, y);
            c.lineTo(x + sens * 2, y - 7);
            c.lineTo(x + sens * 2, y + 7);
        }
        c.closePath(); c.fill();
        c.restore();
    }

    // --- L'animation du déplacement -------------------------------------------

    /**
     * Le trajet, cran par cran. C'est LA raison d'être de l'activité : on ne
     * glisse pas d'un point à l'autre, on compte — un cran, un temps d'arrêt.
     */
    function animerTrajet() {
        return new Promise((resolve) => {
            if (destroyed || !etat) { resolve(false); return; }
            etat.fige = true;
            if (etat.modele === 'pastilles') {
                const paires = Math.min(Math.abs(etat.depart), Math.abs(etat.deplacements[0]));
                let i = 0;
                const suivant = () => {
                    if (destroyed) { resolve(false); return; }
                    if (i >= paires) {
                        etat.curseur = etat.total; etat.fige = false; majCompte(); resolve(true); return;
                    }
                    etat.apparies = ++i;
                    majCompte();
                    regTimeout(suivant, 380);
                };
                regTimeout(suivant, 260);
                return;
            }
            const cible = etat.total;
            const sens = cible >= etat.depart ? 1 : -1;
            const crans = Math.abs(cible - etat.depart);
            etat.curseur = etat.depart; etat.pas = 0; majCompte();
            let n = 0;
            const suivant = () => {
                if (destroyed) { resolve(false); return; }
                if (n >= crans) { etat.fige = false; resolve(true); return; }
                n++;
                etat.curseur = etat.depart + sens * n;
                etat.pas = n;
                majCompte();
                regTimeout(suivant, Math.max(150, 460 - crans * 22));
            };
            regTimeout(suivant, 320);
        });
    }

    // --- Saisie ---------------------------------------------------------------

    function brancher() {
        const repondre = (valeur) => {
            if (destroyed || etat.fige) return;
            if (!Number.isFinite(valeur)) return;
            const res = session.submit(valeur, { misconception: diagnostic(valeur) });
            if (res.ignored) return;
            etat.juste = res.correct;
            if (res.correct) { etat.curseur = etat.total; etat.pas = Math.abs(etat.total - etat.depart); majCompte(); }
            res.dismissed.then(() => {
                if (destroyed) return;
                if (res.correct) { renderNext(); return; }
                if (res.revealed) {
                    // On ne dit pas la réponse : on la MONTRE, cran par cran.
                    animerTrajet().then(() => regTimeout(renderNext, 1600));
                } else {
                    etat.juste = null;
                }
            });
        };

        const champ = container.querySelector('[data-reponse]');
        const btn = container.querySelector('[data-valider]');
        if (champ && btn) {
            btn.onclick = () => repondre(parseInt(champ.value, 10));
            const surTouche = (e) => { if (e.key === 'Enter') { e.preventDefault(); btn.click(); } };
            champ.addEventListener('keydown', surTouche);
            nettoyeurs.push(() => champ.removeEventListener('keydown', surTouche));
            regTimeout(() => { if (!destroyed && champ.isConnected) champ.focus(); }, 60);
        }
        container.querySelectorAll('[data-choix]').forEach(b => {
            b.onclick = () => repondre(parseInt(b.dataset.choix, 10));
        });
    }

    /**
     * L'erreur derrière la réponse. Le carnet de l'élève ne dit pas « faux »,
     * il dit CE QUI a été confondu — et ici deux erreurs dominent tout.
     */
    function diagnostic(donne) {
        const d = etat.deplacements.reduce((s, v) => s + v, 0);
        if (donne === Math.abs(etat.depart) + Math.abs(d)) return 'relatifs:signes-ignores';
        if (donne === -etat.total) return 'relatifs:signe-inverse';
        if (donne === etat.depart - d) return 'relatifs:sens-inverse';
        if (Math.abs(donne - etat.total) === 1) return 'relatifs:cran-de-trop';
        return null;
    }

    // --- Démonstration --------------------------------------------------------

    async function runDemo() {
        cursor = createDemoCursor();
        gate = createDemoGate(container);
        const fin = () => { cursor.hideBubble(); return true; };
        const m = item.meta;
        const d = m.deplacements[0];

        if (!await cursor.pause(700) || destroyed) return fin();
        if (!await gate.waitTurn() || destroyed) return fin();

        if (m.modele === 'pastilles') {
            cursor.say(`Une pastille bleue vaut +1, une rouge vaut −1. Ensemble, elles font ZÉRO : c'est tout le secret.`, container);
            if (!await cursor.pause(DEMO_SPEED.between + 1200) || destroyed) return fin();
            if (!await gate.waitTurn() || destroyed) return fin();
            cursor.say('Je barre les paires une par une. Ce qui reste sans partenaire donne la réponse.', container);
            await animerTrajet();
            if (!await cursor.pause(DEMO_SPEED.between + 900) || destroyed) return fin();
        } else {
            const axe = m.modele === 'ecriture' ? 'la droite des nombres' : 'la colonne';
            cursor.say(`On commence par SE PLACER : je cherche ${m.depart} sur ${axe}. Le zéro n'est pas le début, c'est juste un repère au milieu.`, container);
            if (!await cursor.pause(DEMO_SPEED.between + 1200) || destroyed) return fin();
            if (!await gate.waitTurn() || destroyed) return fin();
            const sens = m.modele === 'ecriture'
                ? (d >= 0 ? 'vers la droite' : 'vers la gauche')
                : (d >= 0 ? 'vers le haut' : 'vers le bas');
            cursor.say(`Maintenant je me DÉPLACE de ${Math.abs(d)} cran${Math.abs(d) > 1 ? 's' : ''} ${sens}. Je compte, je n'additionne pas.`, container);
            await animerTrajet();
            if (!await cursor.pause(DEMO_SPEED.between + 900) || destroyed) return fin();
        }

        if (!await gate.waitTurn() || destroyed) return fin();
        cursor.say(`On arrive à ${m.total}. ${item.explanation}`, container);
        if (!await cursor.pause(DEMO_SPEED.between + 1600) || destroyed) return fin();
        return fin();
    }

    renderNext();
    if (session.isDemo && !session.frozen) runDemo();

    return {
        showNext: renderNext,
        showPrevious() { if (session.rewind()) renderNext(); },
        destroy() {
            destroyed = true;
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            nettoyeurs.forEach(f => f());
            nettoyeurs.length = 0;
            if (cursor) { cursor.destroy(); cursor = null; }
            if (gate) { gate.destroy(); gate = null; }
            container.innerHTML = '';
            session.finish();
        }
    };
}
