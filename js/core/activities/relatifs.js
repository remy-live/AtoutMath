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
                    <div class="rl-champ" data-reponse-vue><span>Résultat</span><b data-affiche>?</b></div>
                    <div class="rl-pave">
                        ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '−', '0', '⌫']
            .map(k => `<button type="button" class="rl-touche${k === '−' ? ' rl-touche--signe' : ''}${k === '⌫' ? ' rl-touche--eff' : ''}" data-touche="${k}">${k}</button>`).join('')}
                    </div>
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
            apparies: 0,            // paires déjà barrées
            // Le plateau de pastilles : qui est barré, qui attend sa partenaire,
            // et quelles paires ont été formées (pour tracer les traits).
            rouges: Math.max(0, m.depart) + Math.max(0, m.deplacements[0]),
            bleues: -Math.min(0, m.depart) - Math.min(0, m.deplacements[0]),
            barreR: new Set(), barreB: new Set(), paires: [], choix: null,
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
            const paires = Math.min(etat.rouges, etat.bleues);
            const s = (n) => (n > 1 ? 's' : '');
            if (!paires) {
                el.textContent = 'Toutes de la même couleur : aucune paire ne s\'annule, il n\'y a qu\'à compter.';
            } else if (etat.apparies >= paires) {
                el.textContent = `Les ${paires} paire${s(paires)} sont barrées. Compte ce qui reste sans partenaire.`;
            } else if (etat.choix) {
                el.textContent = etat.choix.couleur === 'rouge'
                    ? 'Une rouge est choisie : touche une bleue pour former la paire.'
                    : 'Une bleue est choisie : touche une rouge pour former la paire.';
            } else if (etat.apparies > 0) {
                el.textContent = `${etat.apparies} paire${s(etat.apparies)} barrée${s(etat.apparies)} sur ${paires} — chaque paire vaut 0.`;
            } else {
                el.textContent = 'Touche une rouge, puis une bleue : la paire vaut 0 et se barre.';
            }
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
            // LE LIQUIDE PART DU BULBE, comme dans un vrai thermomètre.
            //
            // Il montait de la graduation zéro jusqu'à la température : sous
            // zéro le tube restait vide, le bulbe pendait tout seul en bas, et
            // la colonne flottait au milieu du verre. Or c'est précisément la
            // HAUTEUR DEPUIS LE BAS qui fait sentir qu'il fait plus chaud ou
            // plus froid ; le zéro n'est qu'une graduation parmi les autres —
            // c'est même toute la leçon du chapitre.
            const yFond = y(etat.min) + 26;   // le liquide descend dans le bulbe
            c.fillStyle = 'rgba(148,163,184,.16)';
            c.beginPath(); c.roundRect(axeX - 13, y(etat.max) - 6, 26, yFond - y(etat.max) + 6, 13); c.fill();
            const v = etat.curseur;
            const yv = Math.min(y(v), yFond);
            // La couleur dit le signe : rouge quand il fait plus de zéro, bleu
            // quand il fait moins.
            c.fillStyle = v >= 0 ? '#ef4444' : '#38bdf8';
            c.beginPath(); c.roundRect(axeX - 7, yv, 14, yFond - yv, 7); c.fill();
            c.beginPath(); c.arc(axeX, y(etat.min) + 22, 17, 0, Math.PI * 2); c.fill();
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

    // --- Les pastilles ---------------------------------------------------------
    //
    // C'est le seul modèle qui explique POURQUOI les signes s'annulent, et il
    // n'expliquait rien : les pastilles étaient dessinées, elles ne s'appariaient
    // pas. L'élève lisait « associe une bleue avec une rouge » devant une image
    // fixe. On APPARIE maintenant pour de bon — une pastille, puis l'autre, et
    // la paire se barre. C'est le geste qui fait la leçon ; le compte à côté ne
    // fait que dire ce que la main vient de faire.
    //
    // ROUGE = positif, BLEU = négatif : la même convention que le tableau de
    // « Additionner des relatifs ». Deux conventions opposées dans un même
    // chapitre seraient pires que pas de couleur du tout.

    /**
     * Où se posent les pastilles. Une fonction unique, appelée par le dessin ET
     * par la détection du doigt : deux calculs séparés finiraient par diverger,
     * et l'on toucherait à côté de ce qu'on voit.
     */
    function disposerPastilles(w, h) {
        const rouges = etat.rouges, bleues = etat.bleues;
        const parRangee = Math.min(8, Math.max(4, Math.ceil(Math.sqrt((rouges + bleues) * 1.7))));
        // Un groupe vide n'occupe RIEN. Quand les deux nombres sont du même
        // signe — la moitié des questions — une bande vide restait dessinée
        // au-dessus : une gélule rose sans rien dedans, qu'on cherchait à
        // comprendre avant de comprendre l'exercice.
        const ligR = Math.ceil(rouges / parRangee);
        const ligB = Math.ceil(bleues / parRangee);
        const r = Math.max(9, Math.min(32,
            (w * 0.84) / (parRangee * 2.4),
            (h * 0.80) / (Math.max(1, ligR + ligB) * 2.4 + 1.8)));
        const pas = r * 2.35;
        const ecart = (ligR && ligB) ? r * 1.7 : 0;
        const hautR = ligR * pas, hautB = ligB * pas;
        const y0 = (h - (hautR + hautB + ecart)) / 2;

        const groupe = (n, yTop) => {
            const jetons = [];
            for (let i = 0; i < n; i++) {
                const rang = Math.floor(i / parRangee);
                const dansCeRang = Math.min(n - rang * parRangee, parRangee);
                jetons.push({
                    i,
                    x: w / 2 + ((i % parRangee) - (dansCeRang - 1) / 2) * pas,
                    y: yTop + rang * pas + pas / 2
                });
            }
            const large = Math.max(Math.min(n, parRangee), 2) * pas;
            return {
                jetons,
                bande: n ? { x: w / 2 - large / 2 - r * 0.4, y: yTop - r * 0.25,
                    w: large + r * 0.8, h: Math.ceil(n / parRangee) * pas + r * 0.5 } : null
            };
        };

        return { r, rouge: groupe(rouges, y0), bleu: groupe(bleues, y0 + hautR + ecart) };
    }

    function dessinerPastilles(w, h) {
        const c = ctx;
        const plan = disposerPastilles(w, h);
        const r = plan.r;

        const bande = (b, fond, trait) => {
            if (!b) return;
            c.save();
            c.fillStyle = fond; c.strokeStyle = trait; c.lineWidth = 1.5;
            c.beginPath(); c.roundRect(b.x, b.y, b.w, b.h, r * 0.8); c.fill(); c.stroke();
            c.restore();
        };
        bande(plan.rouge.bande, 'rgba(239,68,68,.07)', 'rgba(239,68,68,.28)');
        bande(plan.bleu.bande, 'rgba(56,189,248,.09)', 'rgba(56,189,248,.34)');

        const peindre = (groupe, couleur, barres) => {
            for (const j of groupe.jetons) {
                const barre = barres.has(j.i);
                const choisie = etat.choix && etat.choix.couleur === couleur && etat.choix.i === j.i;
                c.save();
                c.globalAlpha = barre ? 0.28 : 1;
                c.fillStyle = couleur === 'rouge' ? '#ef4444' : '#38bdf8';
                c.beginPath(); c.arc(j.x, j.y, r, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#fff';
                c.font = `900 ${Math.round(r * 1.1)}px 'Inter', system-ui, sans-serif`;
                c.textAlign = 'center'; c.textBaseline = 'middle';
                c.fillText(couleur === 'rouge' ? '+' : '−', j.x, j.y + 1);
                c.globalAlpha = 1;
                if (choisie) {
                    // Choisie, elle attend sa partenaire : un halo, pas une
                    // couleur — la couleur, ici, porte le signe.
                    c.strokeStyle = '#0f172a'; c.lineWidth = 3;
                    c.beginPath(); c.arc(j.x, j.y, r + 4, 0, Math.PI * 2); c.stroke();
                }
                if (barre) {
                    c.strokeStyle = '#0f172a'; c.lineWidth = 3; c.lineCap = 'round';
                    c.beginPath();
                    c.moveTo(j.x - r * 0.75, j.y - r * 0.75); c.lineTo(j.x + r * 0.75, j.y + r * 0.75);
                    c.stroke();
                }
                c.restore();
            }
        };
        peindre(plan.rouge, 'rouge', etat.barreR);
        peindre(plan.bleu, 'bleu', etat.barreB);

        // Les traits d'appariement : c'est eux qui font voir la paire.
        c.save();
        c.strokeStyle = 'rgba(15,23,42,.4)'; c.lineWidth = 2; c.setLineDash([5, 4]);
        for (const p of etat.paires) {
            const jr = plan.rouge.jetons[p.r], jb = plan.bleu.jetons[p.b];
            if (!jr || !jb) continue;
            c.beginPath(); c.moveTo(jr.x, jr.y + r); c.lineTo(jb.x, jb.y - r); c.stroke();
        }
        c.restore();
    }

    /** La pastille sous le doigt, ou null. */
    function pastilleEn(x, y) {
        if (!etat || !etat.vue) return null;
        const plan = disposerPastilles(etat.vue.w, etat.vue.h);
        const marge = plan.r * 1.25;   // viser un rond de 20 px au doigt est pénible
        for (const [couleur, groupe] of [['rouge', plan.rouge], ['bleu', plan.bleu]]) {
            for (const j of groupe.jetons) {
                if (Math.hypot(j.x - x, j.y - y) <= marge) return { couleur, i: j.i };
            }
        }
        return null;
    }

    /** Un appui sur le plateau de pastilles : on choisit, puis on apparie. */
    function toucherPastille(x, y) {
        if (!etat || etat.fige || etat.modele !== 'pastilles') return;
        const p = pastilleEn(x, y);
        if (!p) { etat.choix = null; return; }
        const barres = p.couleur === 'rouge' ? etat.barreR : etat.barreB;
        if (barres.has(p.i)) return;                       // déjà barrée
        if (!etat.choix || etat.choix.couleur === p.couleur) { etat.choix = p; majCompte(); return; }

        // Une rouge et une bleue : la paire vaut zéro, on la barre.
        const rouge = p.couleur === 'rouge' ? p.i : etat.choix.i;
        const bleu = p.couleur === 'bleu' ? p.i : etat.choix.i;
        etat.barreR.add(rouge); etat.barreB.add(bleu);
        etat.paires.push({ r: rouge, b: bleu });
        etat.apparies = etat.paires.length;
        etat.choix = null;
        majCompte();
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
                const paires = Math.min(etat.rouges, etat.bleues);
                const suivant = () => {
                    if (destroyed) { resolve(false); return; }
                    if (etat.paires.length >= paires) {
                        etat.curseur = etat.total; etat.fige = false; etat.choix = null;
                        majCompte(); resolve(true); return;
                    }
                    // On barre la première pastille libre de chaque côté : le
                    // même geste que celui de l'élève, à sa place.
                    const libre = (n, barres) => {
                        for (let i = 0; i < n; i++) if (!barres.has(i)) return i;
                        return -1;
                    };
                    const r = libre(etat.rouges, etat.barreR), b = libre(etat.bleues, etat.barreB);
                    if (r < 0 || b < 0) { etat.fige = false; majCompte(); resolve(true); return; }
                    etat.barreR.add(r); etat.barreB.add(b);
                    etat.paires.push({ r, b });
                    etat.apparies = etat.paires.length;
                    majCompte();
                    regTimeout(suivant, 420);
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

        // LE PAVÉ EST DANS LA PAGE, pas dans le système. Un `<input>` faisait
        // monter le clavier du téléphone, qui recouvrait la moitié basse de
        // l'écran — c'est-à-dire l'ascenseur, le thermomètre ou les pastilles
        // dont on a précisément besoin pour répondre. Onze touches suffisent
        // ici : les chiffres, le signe moins et l'effacement.
        const affiche = container.querySelector('[data-affiche]');
        const btn = container.querySelector('[data-valider]');
        if (affiche && btn) {
            let saisie = '';
            const peindre = () => {
                affiche.textContent = saisie === '' ? '?' : saisie.replace('-', '−');
                affiche.classList.toggle('rl-affiche--vide', saisie === '');
            };
            const valider = () => {
                if (saisie === '' || saisie === '-') return;
                repondre(parseInt(saisie, 10));
            };
            container.querySelectorAll('[data-touche]').forEach(t => {
                t.onclick = () => {
                    if (session.locked) return;
                    const k = t.dataset.touche;
                    if (k === '⌫') saisie = saisie.slice(0, -1);
                    // Le signe se met et s'enlève d'un même appui : sur un
                    // exercice de relatifs, on se reprend souvent.
                    else if (k === '−') saisie = saisie.startsWith('-') ? saisie.slice(1) : '-' + saisie;
                    else if (saisie.replace('-', '').length < 3) saisie += k;
                    peindre();
                };
            });
            btn.onclick = valider;
            // Le clavier physique reste servi : sur ordinateur, taper est plus
            // rapide que viser onze boutons.
            const surTouche = (e) => {
                if (session.locked) return;
                if (/^[0-9]$/.test(e.key)) { if (saisie.replace('-', '').length < 3) saisie += e.key; }
                else if (e.key === 'Backspace') saisie = saisie.slice(0, -1);
                else if (e.key === '-') saisie = saisie.startsWith('-') ? saisie.slice(1) : '-' + saisie;
                else if (e.key === 'Enter') { valider(); return; }
                else return;
                e.preventDefault();
                peindre();
            };
            document.addEventListener('keydown', surTouche);
            nettoyeurs.push(() => document.removeEventListener('keydown', surTouche));
            peindre();
        }
        container.querySelectorAll('[data-choix]').forEach(b => {
            b.onclick = () => repondre(parseInt(b.dataset.choix, 10));
        });

        // LE PLATEAU DE PASTILLES SE TOUCHE. Sans cela, l'énoncé demandait
        // d'associer une rouge et une bleue devant une image inerte.
        if (etat.modele === 'pastilles' && cnv) {
            const surPointeur = (e) => {
                if (session.locked) return;
                const r = cnv.getBoundingClientRect();
                toucherPastille(e.clientX - r.left, e.clientY - r.top);
            };
            cnv.addEventListener('pointerdown', surPointeur);
            cnv.style.touchAction = 'manipulation';
            cnv.style.cursor = 'pointer';
            nettoyeurs.push(() => cnv && cnv.removeEventListener('pointerdown', surPointeur));
        }
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
        const fin = () => { cursor?.hideBubble(); return true; };
        const m = item.meta;
        const d = m.deplacements[0];

        if (!await cursor.pause(700) || destroyed) return fin();
        if (!await gate.waitTurn() || destroyed) return fin();

        if (m.modele === 'pastilles') {
            cursor.say(`Une pastille rouge vaut +1, une bleue vaut −1. Ensemble, elles font ZÉRO : c'est tout le secret.`, container);
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
