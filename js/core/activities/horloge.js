// Activité « Lire l'heure » : la pendule à aiguilles, dessinée et manipulable.
//
// Deux questions sur le même cadran :
//   - LIRE  : la pendule affiche une heure, l'élève l'écrit (heures, minutes) ;
//   - PLACER: l'heure est donnée, l'élève tire les aiguilles.
//
// Trois partis pris de rendu, tous pédagogiques :
//
//   1. LES AIGUILLES SE DISTINGUENT. Petite et bleue pour les heures, grande
//      et rouge pour les minutes, avec une légende sous le cadran. L'erreur
//      la plus courante n'est pas de mal compter, c'est de confondre les deux
//      aiguilles ; une pendule où elles se ressemblent entretient l'erreur.
//
//   2. LA PETITE AIGUILLE AVANCE AVEC LES MINUTES. À 3 h 50 elle est presque
//      sur le 4, et c'est précisément ce qui fait dire « il est 4 heures » à
//      un élève. On dessine donc la vraie position, jamais un cran fixe : la
//      difficulté doit être à l'écran, pas dissimulée.
//
//   3. LES NUMÉROS DES MINUTES SONT UNE AIDE, PAS UN DÉCOR. Le petit anneau
//      rouge (5, 10, 15…) s'affiche aux premiers niveaux et disparaît ensuite.
//      Le but est de lire une pendule ordinaire, celle du couloir.
//
// En mode PLACER, chaque aiguille se saisit séparément : la grande donne les
// minutes (aimantée à la minute), la petite donne l'heure (aimantée à l'heure
// pleine) — et une fois l'heure choisie, la petite se redessine à sa vraie
// place, décalée par les minutes. On voit alors la règle au lieu de la subir.

import { regTimeout } from '../timers.js';
import { hintBar, wireHint, wireShowMe } from './choice.js';
import { createDemoCursor, createDemoGate, DEMO_SPEED } from '../demoPointer.js';
import { poserPaveTactile, sansClavierSysteme, auDoigt } from '../../ui/paveTactile.js';

const deuxChiffres = (n) => String(n).padStart(2, '0');

export function mount(container, session) {
    let destroyed = false;
    let cursor = null, gate = null;
    let paveHorloge = null;
    let cnv = null, ctx = null, item = null, etat = null;
    let rafId = null;
    const nettoyeurs = [];
    let observateur = null;

    function renderNext() {
        if (destroyed) return;
        render(session.next());
    }

    function render(courant) {
        item = courant;
        nettoyeurs.forEach(f => f());
        nettoyeurs.length = 0;
        const m = item.meta;

        container.innerHTML = `
            <div class="hg-layout">
                ${item.prompt.html}
                <div class="hg-niveau">Niveau ${m.rang} / ${m.total} · ${m.titre}</div>
                <div class="hg-cadran" data-cadran>
                    <canvas class="hg-canvas"></canvas>
                </div>
                <div class="hg-legende">
                    <span class="hg-leg hg-leg--h"><i></i> petite aiguille : les <b>heures</b></span>
                    <span class="hg-leg hg-leg--m"><i></i> grande aiguille : les <b>minutes</b></span>
                </div>
                ${m.mode === 'lire' ? `
                <div class="hg-saisie">
                    <label class="hg-champ">
                        <span>heures</span>
                        <!-- LES BOUTONS − ET + SONT DEMANDÉS : « on ne peut
                             écrire les chiffres sur iPhone, on pourrait avoir
                             des + − aussi sur les input ». Ils règlent d'un
                             cran ; pour 10 h 37, le pavé de chiffres posé
                             dessous va plus vite que trente-sept appuis. -->
                        <span class="hg-pas">
                            <button type="button" class="hg-pas-btn" data-pas="-1" data-cible="h" aria-label="Une heure de moins">−</button>
                            <input type="number" data-h min="0" max="23" placeholder="?" inputmode="numeric">
                            <button type="button" class="hg-pas-btn" data-pas="1" data-cible="h" aria-label="Une heure de plus">+</button>
                        </span>
                    </label>
                    <span class="hg-sep">h</span>
                    <label class="hg-champ">
                        <span>minutes</span>
                        <span class="hg-pas">
                            <button type="button" class="hg-pas-btn" data-pas="-1" data-cible="m" aria-label="Une minute de moins">−</button>
                            <input type="number" data-m min="0" max="59" placeholder="?" inputmode="numeric">
                            <button type="button" class="hg-pas-btn" data-pas="1" data-cible="m" aria-label="Une minute de plus">+</button>
                        </span>
                    </label>
                </div>` : `
                <div class="hg-affiche" data-affiche>— h —</div>`}
                <div class="hg-controles">
                    <button type="button" class="kk-btn-valider" data-valider>Valider</button>
                </div>
                ${hintBar(session)}
            </div>`;

        cnv = container.querySelector('.hg-canvas');
        ctx = cnv.getContext('2d');

        etat = {
            // Ce que MONTRE la pendule. En lecture c'est la question ; en
            // placement c'est la réponse en cours de construction.
            // En placement, la pendule part de midi pile — sauf si c'est la
            // réponse : on ne donne pas une question déjà résolue.
            h12: m.mode === 'lire' ? m.h12 : (m.h12 === 12 && m.m === 0 ? 6 : 12),
            min: m.mode === 'lire' ? m.m : (m.h12 === 12 && m.m === 0 ? 30 : 0),
            prise: null,          // 'h' | 'm' pendant un glisser
            fige: m.mode === 'lire',
            juste: null,          // marque verte/rouge après validation
            souligne: null        // aiguille isolée par « Montre-moi »
        };

        dimensionner();
        observateur = new ResizeObserver(() => { dimensionner(); dessiner(); });
        observateur.observe(container.querySelector('[data-cadran]'));
        nettoyeurs.push(() => { if (observateur) { observateur.disconnect(); observateur = null; } });
        boucle();

        if (session.isDemo) { if (!session.frozen) runDemo(); return; }

        wireHint(container, session);
        // « Montre-moi » ne lit pas l'heure à la place de l'élève : il isole
        // les aiguilles une par une (en lecture) ou fait le PREMIER des deux
        // gestes (en placement). Ce qui manque à un élève bloqué, ce n'est pas
        // le résultat, c'est de savoir par quoi commencer.
        wireShowMe(container, session, {
            enPage: true,
            message: (it) => it.meta.mode === 'lire'
                ? 'Je fais ressortir les aiguilles l\'une après l\'autre : d\'abord la PETITE, qui donne les heures, puis la GRANDE, qui donne les minutes. À toi de les lire.'
                : `Je place la GRANDE aiguille sur ${it.meta.m} minute${it.meta.m > 1 ? 's' : ''}. À toi de placer la petite sur l'heure.`,
            highlight: () => montrerLaMethode()
        });
        if (m.mode === 'placer') brancherAiguilles();
        brancherValidation();
        majAffichage();
    }

    // --- Géométrie ------------------------------------------------------------

    function dimensionner() {
        const boite = container.querySelector('[data-cadran]');
        if (!cnv || !boite) return;
        const r = boite.getBoundingClientRect();
        // LE CADRAN NE DÉPASSE JAMAIS DE SA BOÎTE. Il y avait ici un plancher
        // de 150 px : sur un iPhone où la place manquait, la boîte tombait à
        // 130 px, le canevas restait à 150 et débordait des deux côtés — la
        // pastille « Niveau » passait par-dessus le cerclage, et plus haut
        // encore la pendule se coupait sur le bord de l'écran. Rémy : « l'horloge
        // est coupée en haut ». C'est la boîte qui garde une taille minimale,
        // en CSS ; le canevas, lui, obéit.
        const cote = Math.floor(Math.min(r.width, r.height));
        if (cote < 40) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cnv.width = Math.round(cote * dpr);
        cnv.height = Math.round(cote * dpr);
        cnv.style.width = cnv.style.height = `${cote}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        etat.cote = cote;
    }

    /** Angle d'une aiguille, en radians, 0 = midi, sens horaire. */
    const angleMinutes = (min) => (min / 60) * Math.PI * 2;
    const angleHeures = (h12, min) => (((h12 % 12) + min / 60) / 12) * Math.PI * 2;

    function boucle() {
        if (rafId) cancelAnimationFrame(rafId);
        const tick = () => {
            if (destroyed) return;
            dessiner();
            rafId = requestAnimationFrame(tick);
        };
        tick();
    }

    // --- Dessin ---------------------------------------------------------------

    function dessiner() {
        if (!ctx || !cnv || !etat || !etat.cote) return;
        const C = etat.cote, R = C / 2, cx = R, cy = R;
        const rayon = R * 0.88;
        ctx.clearRect(0, 0, C, C);

        // Boîtier
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, rayon, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.lineWidth = Math.max(4, R * 0.045);
        ctx.strokeStyle = etat.juste === true ? '#22c55e'
            : etat.juste === false ? '#ef4444' : '#334155';
        ctx.stroke();
        ctx.restore();

        // Trois anneaux, du bord vers le centre : les nombres des MINUTES (en
        // rouge, quand l'aide est active), les graduations, puis les chiffres
        // des HEURES. Empilés dans cet ordre, chaque échelle a sa couronne et
        // aucun nombre n'en croise un autre — sur le premier essai, les « 55 »
        // rouges se posaient à côté des « 11 » noirs et l'on ne savait plus
        // laquelle des deux échelles on était en train de lire.
        // Avec l'anneau des minutes, les graduations reculent : il faut de la
        // place ENTRE elles et le boîtier pour y loger les nombres rouges sans
        // qu'ils mordent sur le cerclage.
        const bordure = item.meta.reperes ? 0.78 : 0.96;

        for (let i = 0; i < 60; i++) {
            const a = angleMinutes(i) - Math.PI / 2;
            const majeur = i % 5 === 0;
            const r2 = rayon * bordure;
            const r1 = r2 - rayon * (majeur ? 0.10 : 0.055);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
            ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
            ctx.lineWidth = majeur ? Math.max(2.5, R * 0.024) : Math.max(1, R * 0.008);
            ctx.strokeStyle = majeur ? '#0f172a' : '#94a3b8';
            ctx.stroke();
        }

        // L'anneau des MINUTES : l'aide qu'on retire ensuite. Elle vit sur la
        // couronne extérieure, là où passe justement la grande aiguille.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (item.meta.reperes) {
            ctx.fillStyle = '#dc2626';
            ctx.font = `700 ${Math.round(R * 0.082)}px 'Inter', system-ui, sans-serif`;
            for (let n = 0; n < 12; n++) {
                const a = (n / 12) * Math.PI * 2 - Math.PI / 2;
                // 0,87 et non 0,93 : à 0,93 un « 45 » de deux chiffres passait
                // sous le cerclage du boîtier et s'y coupait en deux.
                const rr = rayon * 0.87;
                ctx.fillText(String(n * 5), cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
            }
        }

        // Les 12 chiffres des HEURES.
        ctx.fillStyle = '#0f172a';
        ctx.font = `800 ${Math.round(R * (item.meta.reperes ? 0.15 : 0.19))}px 'Inter', system-ui, sans-serif`;
        for (let n = 1; n <= 12; n++) {
            const a = (n / 12) * Math.PI * 2 - Math.PI / 2;
            const rr = rayon * (item.meta.reperes ? 0.56 : 0.72);
            ctx.fillText(String(n), cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }

        // Aiguilles : la grande D'ABORD, la petite par-dessus — c'est elle
        // qu'on cherche et elle ne doit jamais passer sous l'autre.
        const longM = rayon * (item.meta.reperes ? 0.74 : 0.88);
        const longH = rayon * (item.meta.reperes ? 0.40 : 0.50);
        // « Montre-moi » isole une aiguille à la fois : l'autre s'efface, et
        // celle qu'on regarde reçoit un halo. Deux échelles sur un même
        // cadran, ça ne s'apprend qu'en les séparant.
        const halo = (angle, longueur, couleur) => {
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.strokeStyle = couleur;
            ctx.lineWidth = R * 0.16; ctx.lineCap = 'round';
            const a = angle - Math.PI / 2;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * longueur, cy + Math.sin(a) * longueur);
            ctx.stroke(); ctx.restore();
        };
        if (etat.souligne === 'h') halo(angleHeures(etat.h12, etat.min), longH, '#2563eb');
        if (etat.souligne === 'm') halo(angleMinutes(etat.min), longM, '#dc2626');
        ctx.save();
        if (etat.souligne === 'h') ctx.globalAlpha = 0.25;
        aiguille(cx, cy, angleMinutes(etat.min), longM, R * 0.035, '#dc2626');
        ctx.restore();
        ctx.save();
        if (etat.souligne === 'm') ctx.globalAlpha = 0.25;
        aiguille(cx, cy, angleHeures(etat.h12, etat.min), longH, R * 0.055, '#2563eb');
        ctx.restore();

        // Axe central
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.045, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.018, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();

        // Poignées de saisie, seulement quand on peut tirer les aiguilles :
        // sans elles, rien ne dit que la pendule se manipule.
        if (!etat.fige) {
            poignee(cx, cy, angleMinutes(etat.min), rayon * (item.meta.reperes ? 0.74 : 0.88), '#dc2626', etat.prise === 'm');
            poignee(cx, cy, angleHeures(etat.h12, etat.min), rayon * (item.meta.reperes ? 0.40 : 0.50), '#2563eb', etat.prise === 'h');
        }
    }

    function aiguille(cx, cy, angle, longueur, largeur, couleur) {
        const a = angle - Math.PI / 2;
        const bx = cx - Math.cos(a) * longueur * 0.16;
        const by = cy - Math.sin(a) * longueur * 0.16;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = couleur;
        ctx.lineWidth = Math.max(3, largeur);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(cx + Math.cos(a) * longueur, cy + Math.sin(a) * longueur);
        ctx.stroke();
        ctx.restore();
    }

    function poignee(cx, cy, angle, longueur, couleur, actif) {
        const a = angle - Math.PI / 2;
        const x = cx + Math.cos(a) * longueur, y = cy + Math.sin(a) * longueur;
        const r = Math.max(9, etat.cote * (actif ? 0.045 : 0.036));
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = couleur; ctx.globalAlpha = actif ? 0.95 : 0.55; ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        ctx.restore();
    }

    // --- Manipulation des aiguilles ------------------------------------------

    function posDe(e) {
        const r = cnv.getBoundingClientRect();
        const src = e.touches && e.touches.length ? e.touches[0] : e;
        return { x: src.clientX - r.left, y: src.clientY - r.top };
    }

    function brancherAiguilles() {
        const R = () => etat.cote / 2;

        const distanceA = (p, angle, longueur) => {
            const a = angle - Math.PI / 2;
            const bx = R() + Math.cos(a) * longueur, by = R() + Math.sin(a) * longueur;
            return Math.hypot(p.x - bx, p.y - by);
        };

        const onDown = (e) => {
            if (etat.fige) return;
            if (e.cancelable) e.preventDefault();
            const p = posDe(e);
            const rayon = R() * 0.88;
            const dm = distanceA(p, angleMinutes(etat.min), rayon * (item.meta.reperes ? 0.74 : 0.88));
            const dh = distanceA(p, angleHeures(etat.h12, etat.min), rayon * (item.meta.reperes ? 0.40 : 0.50));
            const seuil = Math.max(28, etat.cote * 0.11);
            // La plus PROCHE des deux, et seulement si l'on est assez près :
            // taper au hasard sur le cadran ne doit rien déplacer.
            if (Math.min(dm, dh) > seuil) return;
            etat.prise = dm <= dh ? 'm' : 'h';
            bouger(p);
        };
        const onMove = (e) => {
            if (!etat.prise) return;
            if (e.cancelable) e.preventDefault();
            bouger(posDe(e));
        };
        const onUp = () => { etat.prise = null; };

        const bouger = (p) => {
            const dx = p.x - R(), dy = p.y - R();
            // Angle depuis midi, sens horaire, ramené dans [0 ; 2π[.
            let a = Math.atan2(dx, -dy);
            if (a < 0) a += Math.PI * 2;
            const part = a / (Math.PI * 2);
            if (etat.prise === 'm') {
                etat.min = Math.round(part * 60) % 60;
            } else {
                // La petite aiguille retient l'heure DÉJÀ PASSÉE, pas la plus
                // proche — exactement la règle qu'on enseigne pour la lire.
                // Avec l'arrondi au plus proche, poser la main entre le 2 et
                // le 3 pour régler 2 h 45 donnait 3 h : l'élève plaçait bien
                // son aiguille et l'exercice le comptait faux.
                const h = Math.floor(part * 12) % 12;
                etat.h12 = h === 0 ? 12 : h;
            }
            etat.juste = null;
            majAffichage();
        };

        cnv.addEventListener('mousedown', onDown);
        cnv.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
        nettoyeurs.push(() => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchend', onUp);
        });
    }

    /** Le cadran numérique sous la pendule : on VOIT ce qu'on a placé. */
    function majAffichage() {
        const cible = container.querySelector('[data-affiche]');
        if (cible) cible.textContent = `${etat.h12} h ${deuxChiffres(etat.min)}`;
    }

    // --- Validation -----------------------------------------------------------

    function lireSaisie() {
        if (item.meta.mode === 'placer') return `${etat.h12}:${deuxChiffres(etat.min)}`;
        const ih = container.querySelector('[data-h]');
        const im = container.querySelector('[data-m]');
        if (!ih || !im || ih.value === '' || im.value === '') return null;
        const h = parseInt(ih.value, 10), m = parseInt(im.value, 10);
        if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
        return `${h}:${deuxChiffres(m)}`;
    }

    function brancherValidation() {
        const btn = container.querySelector('[data-valider]');
        if (!btn) return;
        const valider = () => {
            if (destroyed) return;
            const donne = lireSaisie();
            if (donne === null) {
                btn.classList.remove('hg-secoue');
                void btn.offsetWidth;
                btn.classList.add('hg-secoue');
                return;
            }
            const res = session.submit(donne, { misconception: diagnostic(donne) });
            if (res.ignored) return;
            etat.juste = res.correct;
            res.dismissed.then(() => {
                if (destroyed) return;
                if (res.correct) { renderNext(); return; }
                if (res.revealed) { montrerCorrection(); regTimeout(renderNext, 2600); }
                else etat.juste = null;
            });
        };
        btn.onclick = valider;

        // Entrée valide depuis les deux champs : on tape 3, Tab, 35, Entrée.
        container.querySelectorAll('[data-h], [data-m]').forEach(inp => {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); valider(); }
            });
        });

        // LES PAS. Ils bouclent — 23 h + 1 revient à 0 h, 59 min + 1 à 0 —
        // comme une pendule, et non comme un compteur qui se bloque.
        const champDe = (c) => container.querySelector(c === 'h' ? '[data-h]' : '[data-m]');
        const borne = (c) => (c === 'h' ? 24 : 60);
        container.querySelectorAll('.hg-pas-btn').forEach(b => {
            b.addEventListener('click', () => {
                const el = champDe(b.dataset.cible);
                if (!el) return;
                const mod = borne(b.dataset.cible);
                const actuel = el.value === '' ? 0 : Number(el.value);
                el.value = String(((actuel + Number(b.dataset.pas)) % mod + mod) % mod);
                el.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });

        // AU DOIGT, UN PAVÉ DE CHIFFRES. Les champs naissent avec la question,
        // donc hors de tout geste de l'élève : iOS n'ouvre pas son clavier
        // dessus. Le pavé écrit dans le champ TOUCHÉ EN DERNIER — les heures
        // par défaut, puisque c'est par elles qu'on lit une heure.
        if (auDoigt() && champDe('h')) {
            let vise = 'h';
            container.querySelectorAll('[data-h], [data-m]').forEach(inp => {
                sansClavierSysteme(inp);
                inp.addEventListener('pointerdown', () => {
                    vise = inp.hasAttribute('data-h') ? 'h' : 'm';
                    container.querySelectorAll('[data-h], [data-m]')
                        .forEach(e => e.classList.toggle('hg-vise', e === inp));
                });
            });
            champDe('h').classList.add('hg-vise');
            const zone = container.querySelector('.hg-saisie').parentElement;
            paveHorloge = poserPaveTactile(zone, {
                champ: () => champDe(vise),
                maxLong: 2,
                valider,
                // Sous la saisie et le bouton Valider, AVANT la barre d'indices :
                // en toute fin de page, le pavé sortait de l'écran.
                avant: zone.querySelector('.hint-bar')
            });
        }
    }

    /**
     * Le diagnostic, écrit ici parce qu'il demande de connaître la pendule.
     * Trois erreurs valent la peine d'être nommées : lire l'heure suivante
     * (la petite aiguille est presque arrivée), échanger les deux aiguilles,
     * et compter les minutes comme des heures.
     */
    function diagnostic(donne) {
        const m = item.meta;
        const [hd, md] = donne.split(':').map(Number);
        const attenduH = Number(item.answer.split(':')[0]);
        const attenduM = m.m;
        // Tout se compare sur le cadran de 12 : en mode 24 heures, répondre
        // 15 h au lieu de 14 h est la MÊME erreur que répondre 3 h au lieu
        // de 2 h, et mérite la même phrase.
        const surDouze = (n) => ((n % 12) + 12) % 12 || 12;
        const donneH12 = surDouze(hd);
        const suivant = m.h12 === 12 ? 1 : m.h12 + 1;

        if (md === attenduM && donneH12 === suivant && attenduM !== 0) {
            return `Attention : la petite aiguille est ENTRE le ${m.h12} et le ${suivant}. `
                + `Tant qu'elle n'a pas atteint le nombre d'après, l'heure est celle du plus petit : ${m.h12}.`;
        }
        if (attenduM % 5 === 0 && donneH12 === surDouze(attenduM / 5) && md === m.h12 * 5) {
            return 'Les deux aiguilles ont été échangées : la PETITE donne les heures, la GRANDE les minutes.';
        }
        if (donneH12 === surDouze(attenduH) && attenduM % 5 === 0 && attenduM !== 0 && md === attenduM / 5) {
            return `La grande aiguille sur le ${attenduM / 5} ne veut pas dire ${attenduM / 5} minutes `
                + `mais ${attenduM / 5} × 5 = ${attenduM} minutes.`;
        }
        if (m.apresmidi && donneH12 === hd && md === attenduM) {
            return `C'est l'après-midi : la pendule montre ${m.h12}, mais on écrit ${m.h12} + 12 = ${attenduH} h.`;
        }
        return null;
    }

    /**
     * L'aide de « Montre-moi », qui montre la MÉTHODE et pas le résultat :
     * en lecture, chaque aiguille ressort à son tour ; en placement, on fait
     * le premier des deux gestes et on laisse le second.
     */
    function montrerLaMethode() {
        if (item.meta.mode === 'placer') {
            const cible = item.meta.m;
            const depart = etat.min;
            const tour = ((cible - depart) + 60) % 60;
            animer((e) => { etat.min = Math.round(depart + tour * e) % 60; }, 1400);
            return;
        }
        etat.souligne = 'h';
        regTimeout(() => { if (!destroyed) etat.souligne = 'm'; }, 1900);
        regTimeout(() => { if (!destroyed) etat.souligne = null; }, 3800);
    }

    /** La bonne heure, montrée sur le cadran : une correction se regarde. */
    function montrerCorrection() {
        const [h, mn] = item.answer.split(':').map(Number);
        etat.h12 = ((h % 12) + 12) % 12 || 12;
        etat.min = mn;
        etat.juste = null;
        majAffichage();
        const cible = container.querySelector('[data-affiche]');
        if (cible) cible.classList.add('hg-affiche--corrige');
    }

    // --- Démonstration du robot ----------------------------------------------

    async function runDemo() {
        const m = item.meta;
        if (!cursor) cursor = createDemoCursor();
        if (!gate) gate = createDemoGate(container);
        const fin = () => { cursor?.hideBubble(); regTimeout(renderNext, DEMO_SPEED.between); };
        const cadran = container.querySelector('[data-cadran]');

        if (!await cursor.pause(600) || destroyed) return fin();

        if (m.mode === 'lire') {
            if (!await gate.waitTurn() || destroyed) return fin();
            cursor.say('Deux aiguilles, deux lectures. Je commence TOUJOURS par la petite, la bleue : c\'est elle qui donne les heures.', cadran);
            if (!await cursor.pause(DEMO_SPEED.between + 1200) || destroyed) return fin();

            if (!await gate.waitTurn() || destroyed) return fin();
            cursor.say(m.m === 0
                ? `Elle est pile sur le ${m.h12} : il est ${m.h12} heures.`
                : `Elle est ENTRE le ${m.h12} et le ${m.h12 === 12 ? 1 : m.h12 + 1}. On garde le plus petit : ${m.h12} heures passées.`, cadran);
            if (!await cursor.pause(DEMO_SPEED.between + 1600) || destroyed) return fin();

            if (!await gate.waitTurn() || destroyed) return fin();
            cursor.say(m.m === 0
                ? 'La grande aiguille, la rouge, est sur le 12 : zéro minute.'
                : (m.m % 5 === 0
                    ? `La grande aiguille, la rouge, est sur le ${m.m / 5}. Chaque nombre vaut 5 minutes : ${m.m / 5} × 5 = ${m.m} minutes.`
                    : `La grande aiguille a dépassé le ${Math.floor(m.m / 5)} — soit ${Math.floor(m.m / 5) * 5} minutes — de ${m.m % 5} petites graduations : ${m.m} minutes.`), cadran);
            if (!await cursor.pause(DEMO_SPEED.between + 1800) || destroyed) return fin();

            if (!await gate.waitTurn() || destroyed) return fin();
            const ih = container.querySelector('[data-h]');
            const im = container.querySelector('[data-m]');
            if (ih) ih.value = item.answer.split(':')[0];
            if (im) im.value = deuxChiffres(m.m);
            cursor.say(m.apresmidi
                ? `C'est l'après-midi : la pendule montre ${m.h12} h, j'ajoute 12 et j'écris ${item.answer.split(':')[0]} h ${deuxChiffres(m.m)}. On dit « ${m.dit} ».`
                : `J'écris ${m.h12} h ${deuxChiffres(m.m)}. On dit « ${m.dit} ».`, cadran);
            if (!await cursor.pause(DEMO_SPEED.between + 1800) || destroyed) return fin();
            return fin();
        }

        // Mode PLACER : le robot montre l'ordre des gestes.
        if (!await gate.waitTurn() || destroyed) return fin();
        cursor.say(`Pour placer ${m.h} h ${deuxChiffres(m.m)}, je commence par la GRANDE aiguille : elle porte les minutes.`, cadran);
        if (!await cursor.pause(DEMO_SPEED.between + 1400) || destroyed) return fin();

        if (!await gate.waitTurn() || destroyed) return fin();
        cursor.say(m.m === 0
            ? 'Zéro minute : la grande aiguille va sur le 12.'
            : `${m.m} minutes, ça fait ${m.m} ÷ 5 = ${(m.m / 5).toFixed(m.m % 5 ? 1 : 0)} : la grande aiguille s'arrête ${m.m % 5 ? 'un peu après' : 'sur'} le ${Math.floor(m.m / 5)}.`, cadran);
        if (!await animer((e) => { etat.min = Math.round(m.m * e); }, 1500) || destroyed) return fin();
        if (!await cursor.pause(DEMO_SPEED.between) || destroyed) return fin();

        if (!await gate.waitTurn() || destroyed) return fin();
        cursor.say(m.apresmidi
            ? `${m.h} h, c'est ${m.h} − 12 = ${m.h12} sur la pendule : la petite aiguille va vers le ${m.h12}.`
            : (m.m === 0
                ? `Puis la petite aiguille sur le ${m.h12}. Zéro minute : elle tombe pile sur le nombre.`
                : `Puis la petite aiguille sur le ${m.h12}. Regarde : elle se décale un peu vers le nombre suivant — c'est normal, les minutes l'entraînent.`), cadran);
        // On tourne dans le SENS DES AIGUILLES, comme on règle une vraie
        // pendule : interpolé du plus court chemin, le geste partait à
        // l'envers et l'on ne reconnaissait plus ce qu'on faisait.
        const depart = etat.h12;
        const tour = ((m.h12 - depart) + 12) % 12;
        if (!await animer((e) => {
            const v = depart + tour * e;
            etat.h12 = Math.round(((v - 1) % 12 + 12) % 12) + 1;
        }, 1500) || destroyed) return fin();
        etat.h12 = m.h12;
        majAffichage();
        if (!await cursor.pause(DEMO_SPEED.between + 1200) || destroyed) return fin();
        fin();
    }

    /** Petite interpolation, interruptible comme les pauses du curseur. */
    function animer(appliquer, duree) {
        return new Promise(resolve => {
            const debut = performance.now();
            const pas = (t) => {
                if (destroyed) { resolve(false); return; }
                const p = Math.min((t - debut) / duree, 1);
                appliquer(1 - Math.pow(1 - p, 3));
                majAffichage();
                if (p < 1) requestAnimationFrame(pas);
                else resolve(true);
            };
            requestAnimationFrame(pas);
        });
    }

    renderNext();

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
