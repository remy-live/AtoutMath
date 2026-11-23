// MULTIKART — le lointain : le ciel, ce qu'il y a sous lui, et le temps qu'il fait.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « améliore le décor aussi mais vraiment super bien le décor, tu peux
// mettre plusieurs circuits et plusieurs ambiances ».
//
// LA PREMIÈRE VERSION AVAIT TROIS CIRCUITS QUI N'EN FAISAIENT QU'UN : les mêmes
// trois rangées de collines, repeintes en vert, en orange, en violet. Un lieu
// ne se reconnaît pas à sa couleur, il se reconnaît à CE QU'ON Y VOIT. Chaque
// circuit a donc ici son lointain à lui :
//
//   · la prairie — des montagnes bleues, un village et son clocher, des oiseaux ;
//   · la plage — la mer jusqu'à l'horizon, ses reflets, des voiliers, des îles ;
//   · le canyon — des mesas en strates, et un soleil énorme barré de nuages ;
//   · la neige — des sommets blancs aux versants bleus, une forêt de sapins ;
//   · l'automne — des rangs d'arbres roux dans la brume, et des rais de soleil ;
//   · le volcan — le cône, son cratère qui rougeoie, ses coulées, son panache ;
//   · la ville — deux rangs de tours, leurs fenêtres, des faisceaux qui balaient ;
//   · l'espace — des nébuleuses, une planète à anneaux, une autre qui se lève.
//
// TOUT GLISSE AVEC LE `cap` — la somme des virages —, chaque plan à sa vitesse :
// c'est cet écart, la parallaxe, qui donne la profondeur. Le fichier reçu
// faisait défiler les collines avec la DISTANCE : elles filaient de côté même en
// ligne droite.
//
// RIEN N'EST TIRÉ AU HASARD : chaque étoile, chaque fenêtre, chaque flocon se
// calcule à partir de son numéro. Deux images de suite montrent le même ciel.

const TAU = Math.PI * 2;

/** Un nombre entre 0 et 1, toujours le même pour le même numéro. */
const grain = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const tour = (v, periode) => ((v % periode) + periode) % periode;

function disque(c, x, y, r, couleur) {
    c.fillStyle = couleur;
    c.beginPath();
    c.arc(x, y, Math.max(0.2, r), 0, TAU);
    c.fill();
}

function halo(c, x, y, r, couleur) {
    const g = c.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, couleur);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
}

function nuage(c, x, y, r, couleur) {
    for (const [dx, dy, k] of [[0, 0, 1], [0.85, -0.25, 1.15], [1.75, 0, 0.9], [-0.75, 0.1, 0.75], [0.5, 0.25, 1.0]]) {
        const g = c.createRadialGradient(x + dx * r, y + dy * r - r * k * 0.2, r * k * 0.15, x + dx * r, y + dy * r, r * k);
        g.addColorStop(0, couleur);
        g.addColorStop(1, couleur.replace(/[\d.]+\)$/, '0)'));
        c.fillStyle = g;
        c.beginPath();
        c.arc(x + dx * r, y + dy * r, r * k, 0, TAU);
        c.fill();
    }
}

/**
 * UN PLAN DE RELIEF qui glisse avec le cap.
 *
 * `profil(i)` rend la hauteur de la bosse numéro `i` ; `forme` dit comment on
 * la trace — une colline ronde, un pic, un plateau. Le numéro suit le
 * défilement : la même bosse garde sa hauteur en traversant l'écran.
 */
function plan(c, o, { couleur, pas, vitesse, bas = 0, profil, forme = 'colline' }) {
    const { larg, haut, horizon, m } = o;
    const p = pas * m;
    const glisse = tour(o.cap * vitesse * m, p);
    const depart = Math.floor((o.cap * vitesse * m) / p);
    c.fillStyle = couleur;
    c.beginPath();
    c.moveTo(-p * 2, haut);
    c.lineTo(-p * 2, horizon + bas * m);
    const sommets = [];
    for (let i = -2; i * p < larg + p * 2; i++) {
        const x = i * p - glisse, n = i + depart;
        const h = profil(n) * m, y0 = horizon + bas * m;
        if (forme === 'pic') {
            const dx = (grain(n + 3) - 0.5) * p * 0.3;
            c.lineTo(x + p * 0.5 + dx, y0 - h);
            c.lineTo(x + p * 0.78, y0 - h * 0.42);
            c.lineTo(x + p, y0 - h * 0.18);
            sommets.push([x + p * 0.5 + dx, y0 - h, h, n]);
        } else if (forme === 'plateau') {
            const l = p * (0.3 + grain(n + 5) * 0.34);
            c.lineTo(x + p * 0.1, y0);
            c.lineTo(x + p * 0.17, y0 - h);
            c.lineTo(x + p * 0.17 + l, y0 - h);
            c.lineTo(x + p * 0.25 + l, y0);
            sommets.push([x + p * 0.17, y0 - h, h, n, l]);
        } else {
            c.bezierCurveTo(x + p * 0.28, y0 - h, x + p * 0.72, y0 - h, x + p, y0);
            sommets.push([x + p * 0.5, y0 - h * 0.75, h, n]);
        }
    }
    c.lineTo(larg + p * 3, haut);
    c.closePath();
    c.fill();
    return sommets;
}

/* ─────────────────────────────────────────────────────────────────────────
 * LE CIEL, COMMUN À TOUS
 * ───────────────────────────────────────────────────────────────────────── */

function ciel(c, o) {
    const { larg, haut, horizon, theme } = o;
    const g = c.createLinearGradient(0, 0, 0, horizon * 1.08);
    g.addColorStop(0, theme.ciel[0]);
    g.addColorStop(0.6, theme.ciel[1]);
    g.addColorStop(1, theme.ciel[2]);
    c.fillStyle = g;
    c.fillRect(0, 0, larg, haut);
}

function etoiles(c, o, combien, vitesse = 26) {
    const { larg, horizon, t, m } = o;
    for (let s = 0; s < combien; s++) {
        const x = tour(grain(s) * (larg + 80) - o.cap * vitesse * m * (0.5 + grain(s + 9) * 0.5), larg + 80) - 40;
        const y = grain(s + 100) * Math.max(40, horizon - 6);
        const eclat = 0.35 + 0.6 * Math.abs(Math.sin(t * (0.8 + grain(s + 50) * 1.6) + s));
        disque(c, x, y, (grain(s + 200) < 0.2 ? 1.9 : 1.1) * Math.max(0.8, m), `rgba(236, 245, 255, ${eclat})`);
    }
}

function astre(c, o, fx, fy, rayon) {
    const { larg, horizon, theme, m } = o;
    const x = tour(larg * fx - o.cap * 60 * m, larg + 260 * m) - 130 * m;
    const y = horizon * fy, r = rayon * m;
    halo(c, x, y, r * 3.6, theme.halo);
    disque(c, x, y, r, theme.astre);
    return [x, y, r];
}

function oiseaux(c, o, combien, hauteur, couleur) {
    const { larg, horizon, t, m } = o;
    c.strokeStyle = couleur;
    c.lineWidth = Math.max(1, 1.6 * m);
    c.lineCap = 'round';
    for (let i = 0; i < combien; i++) {
        const x = tour(grain(i + 20) * larg + t * (14 + grain(i) * 10) * m - o.cap * 70 * m, larg + 80) - 40;
        const y = horizon * (hauteur + grain(i + 40) * 0.18) + Math.sin(t * 1.3 + i) * 4 * m;
        const aile = (5 + 3 * Math.sin(t * 7 + i * 2)) * m, env = 7 * m;
        c.beginPath();
        c.moveTo(x - env, y - aile * 0.5);
        c.quadraticCurveTo(x - env * 0.4, y - aile, x, y);
        c.quadraticCurveTo(x + env * 0.4, y - aile, x + env, y - aile * 0.5);
        c.stroke();
    }
}

/* ─────────────────────────────────────────────────────────────────────────
 * HUIT LOINTAINS
 * ───────────────────────────────────────────────────────────────────────── */

const FONDS = {
    collines(c, o) {
        const { larg, horizon, t, m, theme } = o;
        astre(c, o, 0.76, 0.3, 30);
        for (let n = 0; n < 6; n++) {
            nuage(c, tour(n * 310 * m + t * 9 * m - o.cap * 90 * m, larg + 320 * m) - 160 * m,
                horizon * (0.16 + (n % 3) * 0.14), (24 + (n % 2) * 12) * m, 'rgba(255, 255, 255, 0.85)');
        }
        oiseaux(c, o, 5, 0.3, 'rgba(30, 41, 59, 0.7)');
        // Les montagnes bleues, et leur neige.
        const pics = plan(c, o, { couleur: theme.lointain, pas: 260, vitesse: 22, bas: 4, forme: 'pic',
            profil: (n) => 70 + grain(n) * 80 });
        c.fillStyle = 'rgba(255, 255, 255, 0.88)';
        for (const [x, y, h] of pics) {
            c.beginPath();
            c.moveTo(x, y); c.lineTo(x - h * 0.2, y + h * 0.26); c.lineTo(x - h * 0.06, y + h * 0.2);
            c.lineTo(x + h * 0.04, y + h * 0.3); c.lineTo(x + h * 0.16, y + h * 0.2);
            c.closePath(); c.fill();
        }
        // Les collines du milieu, leurs champs, et un village sur l'une d'elles.
        const dos = plan(c, o, { couleur: theme.collineLoin, pas: 230, vitesse: 44, bas: 8,
            profil: (n) => 38 + grain(n + 7) * 44 });
        for (const [x, y, h, n] of dos) {
            if (n % 3 === 0) {
                c.fillStyle = 'rgba(190, 220, 120, 0.5)';
                c.beginPath(); c.ellipse(x - h * 0.6, y + h * 0.5, h * 0.7, h * 0.16, -0.2, 0, TAU); c.fill();
            }
            if (((n % 4) + 4) % 4 === 1) village(c, x, y + h * 0.16, Math.max(0.5, m));
        }
        // Les collines proches, bordées d'arbres.
        const pres = plan(c, o, { couleur: theme.collinePres, pas: 180, vitesse: 78, bas: 14,
            profil: (n) => 18 + grain(n + 13) * 28 });
        c.fillStyle = '#176f3e';
        for (const [x, y, h, n] of pres) {
            for (let k = -2; k <= 2; k++) disque(c, x + k * 13 * m, y + Math.abs(k) * h * 0.1 + 2 * m, (6 + grain(n + k) * 4) * m, '#176f3e');
        }
    },

    mer(c, o) {
        const { larg, horizon, t, m, theme } = o;
        const [sx, sy, sr] = astre(c, o, 0.7, 0.26, 32);
        // Des rais autour du soleil : la chaleur.
        c.strokeStyle = 'rgba(255, 251, 224, 0.5)';
        c.lineWidth = Math.max(1, 2.4 * m);
        for (let i = 0; i < 12; i++) {
            const a = (i * TAU) / 12 + t * 0.15;
            c.beginPath();
            c.moveTo(sx + Math.cos(a) * sr * 1.3, sy + Math.sin(a) * sr * 1.3);
            c.lineTo(sx + Math.cos(a) * sr * 1.8, sy + Math.sin(a) * sr * 1.8);
            c.stroke();
        }
        for (let n = 0; n < 5; n++) {
            nuage(c, tour(n * 360 * m + t * 7 * m - o.cap * 90 * m, larg + 340 * m) - 170 * m,
                horizon * (0.2 + (n % 2) * 0.2), (30 + (n % 3) * 10) * m, 'rgba(255, 255, 255, 0.9)');
        }
        // LA MER : une bande jusqu'à l'horizon, plus sombre au large.
        const hautMer = 46 * m;
        const g = c.createLinearGradient(0, horizon - hautMer, 0, horizon + 16 * m);
        g.addColorStop(0, '#0e7fa8'); g.addColorStop(0.5, theme.lointain); g.addColorStop(1, '#5fd3e0');
        c.fillStyle = g;
        c.fillRect(0, horizon - hautMer, larg, hautMer + 18 * m);
        // DES ÎLES, posées sur l'eau — et non un plan de relief : un plan se
        // remplit jusqu'en bas de l'écran, et la première version recouvrait
        // ainsi toute la mer d'une colline verte. Vu sur la première photo.
        const pasIle = 430 * m, glisseIle = tour(o.cap * 34 * m, pasIle), departIle = Math.floor((o.cap * 34 * m) / pasIle);
        for (let i = -1; i * pasIle < larg + pasIle; i++) {
            const n = i + departIle;
            if (((n % 3) + 3) % 3 === 1) continue;
            const x = i * pasIle - glisseIle + pasIle * (0.3 + grain(n) * 0.4);
            const y = horizon - hautMer * (0.62 + grain(n + 5) * 0.2);
            const l = (46 + grain(n + 9) * 50) * m, h = (11 + grain(n + 2) * 12) * m;
            c.fillStyle = '#f1dca6';
            c.beginPath(); c.ellipse(x, y, l * 1.12, 3 * m, 0, 0, TAU); c.fill();
            c.fillStyle = theme.collineLoin;
            c.beginPath(); c.ellipse(x, y, l, h, 0, Math.PI, TAU); c.fill();
            c.strokeStyle = '#1f6b4c';
            c.lineWidth = Math.max(1, 2 * m);
            for (const dx of [-0.3, 0.25]) {
                const px = x + dx * l, py = y - h * 0.8;
                c.beginPath(); c.moveTo(px, py); c.lineTo(px + 2 * m, py - 13 * m); c.stroke();
                for (const an of [-2.6, -1.9, -1.1, -0.4]) {
                    c.beginPath(); c.moveTo(px + 2 * m, py - 13 * m);
                    c.lineTo(px + 2 * m + Math.cos(an) * 8 * m, py - 13 * m + Math.sin(an) * 8 * m + 4 * m); c.stroke();
                }
            }
        }
        // Les reflets : de petits traits blancs qui clignotent.
        c.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        c.lineWidth = Math.max(1, 1.6 * m);
        for (let i = 0; i < 46; i++) {
            if (Math.sin(t * (1.5 + grain(i) * 2) + i * 2.1) < 0.2) continue;
            const x = tour(grain(i + 11) * larg - o.cap * 40 * m, larg);
            const y = horizon - hautMer + 6 * m + grain(i + 31) * (hautMer - 4 * m);
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + (5 + grain(i + 51) * 9) * m, y); c.stroke();
        }
        // Les voiliers, qui dérivent.
        for (let i = 0; i < 4; i++) {
            const x = tour(grain(i + 3) * larg + t * (3 + i) * m - o.cap * 46 * m, larg + 120 * m) - 60 * m;
            const y = horizon - hautMer * (0.25 + grain(i + 70) * 0.5), k = (0.7 + grain(i + 80) * 0.6) * m;
            c.fillStyle = '#0f3d57';
            c.beginPath(); c.moveTo(x - 9 * k, y); c.lineTo(x + 9 * k, y); c.lineTo(x + 6 * k, y + 4 * k); c.lineTo(x - 6 * k, y + 4 * k); c.closePath(); c.fill();
            c.fillStyle = '#ffffff';
            c.beginPath(); c.moveTo(x, y - 20 * k); c.lineTo(x + 9 * k, y - 2 * k); c.lineTo(x, y - 2 * k); c.closePath(); c.fill();
            c.fillStyle = i % 2 ? '#f97316' : '#fde047';
            c.beginPath(); c.moveTo(x - 1.5 * k, y - 16 * k); c.lineTo(x - 8 * k, y - 2 * k); c.lineTo(x - 1.5 * k, y - 2 * k); c.closePath(); c.fill();
        }
        // Les dunes, au bord de l'eau.
        const dunes = plan(c, o, { couleur: theme.collinePres, pas: 200, vitesse: 80, bas: 14,
            profil: (n) => 8 + grain(n + 13) * 14 });
        c.strokeStyle = '#7fa650';
        c.lineWidth = Math.max(1, 1.6 * m);
        for (const [x, y] of dunes) {
            for (const d of [-6, 0, 6]) { c.beginPath(); c.moveTo(x + d * m, y + 4 * m); c.lineTo(x + d * 1.5 * m, y - 5 * m); c.stroke(); }
        }
    },

    mesas(c, o) {
        const { larg, horizon, t, m, theme } = o;
        const [sx, sy, sr] = astre(c, o, 0.3, 0.66, 52);
        // Des bancs de nuages devant le soleil : le soir tombe.
        c.fillStyle = 'rgba(124, 45, 18, 0.5)';
        for (let i = 0; i < 4; i++) {
            const y = sy - sr * 0.5 + i * sr * 0.36, l = sr * (1.5 + grain(i) * 1.4);
            c.beginPath(); c.ellipse(sx + (grain(i + 4) - 0.5) * sr, y, l, 3.2 * m, 0, 0, TAU); c.fill();
        }
        for (let n = 0; n < 5; n++) {
            nuage(c, tour(n * 340 * m + t * 6 * m - o.cap * 90 * m, larg + 320 * m) - 160 * m,
                horizon * (0.14 + (n % 3) * 0.12), (26 + (n % 2) * 12) * m, 'rgba(255, 214, 170, 0.5)');
        }
        oiseaux(c, o, 3, 0.24, 'rgba(69, 26, 3, 0.75)');
        // Trois rangs de mesas, et leurs strates : la roche s'est déposée en couches.
        for (const [couleur, strate, pas, vit, h0, bas] of [[theme.lointain, '#a8502e', 300, 22, 70, 4],
            [theme.collineLoin, '#8a3716', 240, 44, 48, 8]]) {
            const tables = plan(c, o, { couleur, pas, vitesse: vit, bas, forme: 'plateau', profil: (n) => h0 + grain(n) * 50 });
            c.fillStyle = strate;
            for (const [x, y, h, , l] of tables) {
                for (const f of [0.22, 0.5]) c.fillRect(x + 2 * m, y + h * f, l + 4 * m, Math.max(1.5, 3 * m));
                c.fillStyle = 'rgba(253, 186, 116, 0.5)';
                c.fillRect(x, y, l, Math.max(1.5, 2.4 * m));
                c.fillStyle = strate;
            }
        }
        const pres = plan(c, o, { couleur: theme.collinePres, pas: 190, vitesse: 78, bas: 14,
            profil: (n) => 14 + grain(n + 13) * 24 });
        // Des cactus en ombre sur la crête.
        c.fillStyle = '#7c2d12';
        for (const [x, y, h, n] of pres) {
            if (n % 2) continue;
            c.fillRect(x - 1.5 * m, y - 12 * m + h * 0.12, 3 * m, 14 * m);
            c.fillRect(x - 6 * m, y - 6 * m + h * 0.12, 3 * m, 6 * m);
            c.fillRect(x - 6 * m, y - 2 * m + h * 0.12, 6 * m, 2.4 * m);
            c.fillRect(x + 3 * m, y - 9 * m + h * 0.12, 3 * m, 6 * m);
        }
    },

    sommets(c, o) {
        const { larg, horizon, t, m, theme } = o;
        astre(c, o, 0.24, 0.42, 26);
        for (let n = 0; n < 5; n++) {
            nuage(c, tour(n * 330 * m + t * 6 * m - o.cap * 90 * m, larg + 320 * m) - 160 * m,
                horizon * (0.12 + (n % 3) * 0.13), (26 + (n % 2) * 12) * m, 'rgba(255, 255, 255, 0.75)');
        }
        // Deux rangs de sommets. Chacun a un versant au soleil, blanc, et un
        // versant à l'ombre, bleu : c'est ce qui en fait une montagne.
        for (const [couleur, ombre, pas, vit, h0, dh, bas] of [[theme.lointain, '#9fb3d8', 280, 20, 90, 90, 2],
            [theme.collineLoin, '#6f8cc0', 230, 40, 60, 70, 8]]) {
            const pics = plan(c, o, { couleur, pas, vitesse: vit, bas, forme: 'pic', profil: (n) => h0 + grain(n + pas) * dh });
            for (const [x, y, h] of pics) {
                c.fillStyle = '#ffffff';
                c.beginPath();
                c.moveTo(x, y); c.lineTo(x - h * 0.24, y + h * 0.34); c.lineTo(x - h * 0.1, y + h * 0.27);
                c.lineTo(x - h * 0.02, y + h * 0.4); c.lineTo(x + h * 0.08, y + h * 0.28); c.lineTo(x + h * 0.2, y + h * 0.36);
                c.closePath(); c.fill();
                c.fillStyle = ombre;
                c.globalAlpha = 0.55;
                c.beginPath(); c.moveTo(x, y); c.lineTo(x + h * 0.2, y + h * 0.36); c.lineTo(x + h * 0.42, y + h * 0.8); c.lineTo(x + h * 0.08, y + h * 0.8);
                c.closePath(); c.fill();
                c.globalAlpha = 1;
            }
        }
        // La forêt : une ligne de sapins, serrés.
        const p = 22 * m, glisse = tour(o.cap * 74 * m, p), depart = Math.floor((o.cap * 74 * m) / p);
        c.fillStyle = theme.collinePres;
        c.beginPath();
        c.moveTo(-p, horizon + 30 * m);
        for (let i = -1; i * p < larg + p; i++) {
            const x = i * p - glisse, h = (16 + grain(i + depart) * 20) * m;
            c.lineTo(x, horizon + 12 * m); c.lineTo(x + p * 0.5, horizon + 12 * m - h); c.lineTo(x + p, horizon + 12 * m);
        }
        c.lineTo(larg + p, horizon + 30 * m);
        c.closePath(); c.fill();
        // De la neige sur les cimes.
        c.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let i = -1; i * p < larg + p; i++) {
            const x = i * p - glisse, h = (16 + grain(i + depart) * 20) * m;
            c.beginPath();
            c.moveTo(x + p * 0.5, horizon + 12 * m - h); c.lineTo(x + p * 0.3, horizon + 12 * m - h * 0.55);
            c.lineTo(x + p * 0.7, horizon + 12 * m - h * 0.55); c.closePath(); c.fill();
        }
    },

    foret(c, o) {
        const { larg, haut, horizon, t, m, theme } = o;
        const [sx, sy] = astre(c, o, 0.62, 0.5, 28);
        // DES RAIS DE SOLEIL à travers la brume : de grands triangles pâles.
        for (let i = 0; i < 7; i++) {
            const a = 1.0 + i * 0.19 + Math.sin(t * 0.2 + i) * 0.02;
            c.fillStyle = `rgba(255, 236, 179, ${0.05 + (i % 2) * 0.05})`;
            c.beginPath();
            c.moveTo(sx, sy);
            c.lineTo(sx + Math.cos(a) * haut, sy + Math.sin(a) * haut);
            c.lineTo(sx + Math.cos(a + 0.09) * haut, sy + Math.sin(a + 0.09) * haut);
            c.closePath(); c.fill();
        }
        for (let n = 0; n < 4; n++) {
            nuage(c, tour(n * 380 * m + t * 5 * m - o.cap * 90 * m, larg + 320 * m) - 160 * m,
                horizon * (0.14 + (n % 2) * 0.16), (28 + (n % 2) * 12) * m, 'rgba(255, 244, 220, 0.7)');
        }
        oiseaux(c, o, 6, 0.26, 'rgba(69, 26, 3, 0.6)');
        plan(c, o, { couleur: theme.lointain, pas: 300, vitesse: 20, bas: 4, profil: (n) => 50 + grain(n) * 50 });
        // TROIS RANGS D'ARBRES, chacun fait de houppiers ronds de trois tons :
        // c'est le mélange des roux qui fait une forêt d'automne.
        const rangs = [[['#d08a3a', '#c2761f', '#e0a44a'], 36, 34, 4, 22], [['#c2410c', '#ea580c', '#d97706'], 30, 56, 10, 24],
            [['#9a3412', '#b45309', '#dc2626', '#f59e0b'], 26, 84, 18, 26]];
        for (const [tons, pas, vit, bas, r] of rangs) {
            const p = pas * m, glisse = tour(o.cap * vit * m, p), depart = Math.floor((o.cap * vit * m) / p);
            for (let i = -1; i * p < larg + p; i++) {
                const n = i + depart, x = i * p - glisse;
                const rr = r * m * (0.7 + grain(n + pas) * 0.6);
                disque(c, x + p * 0.5, horizon + bas * m - rr * 0.55, rr, tons[Math.floor(grain(n + vit) * tons.length)]);
            }
            c.fillStyle = tons[0];
            c.fillRect(0, horizon + bas * m - 2, larg, 30 * m);
            // Une nappe de brume entre deux rangs.
            c.fillStyle = 'rgba(251, 233, 200, 0.28)';
            c.fillRect(0, horizon + bas * m - 6 * m, larg, 12 * m);
        }
    },

    volcan(c, o) {
        const { larg, horizon, t, m, theme } = o;
        etoiles(c, o, 26);
        // Des nuages de cendre, éclairés par en dessous.
        for (let n = 0; n < 6; n++) {
            nuage(c, tour(n * 300 * m + t * 8 * m - o.cap * 90 * m, larg + 320 * m) - 160 * m,
                horizon * (0.1 + (n % 3) * 0.14), (32 + (n % 2) * 14) * m, 'rgba(40, 12, 14, 0.75)');
        }
        // LE VOLCAN : un cône, son cratère, et la lueur au-dessus.
        const vx = tour(larg * 0.62 - o.cap * 26 * m, larg + 700 * m) - 350 * m;
        const base = horizon + 6 * m, hv = 190 * m, lv = 330 * m;
        halo(c, vx, base - hv, 190 * m, `rgba(255, 110, 30, ${0.5 + 0.12 * Math.sin(t * 2.1)})`);
        // Le panache : des bouffées qui montent et s'élargissent.
        for (let i = 0; i < 7; i++) {
            const a = (t * 0.07 + i / 7) % 1;
            disque(c, vx + Math.sin(a * 5 + i) * 22 * m + a * 60 * m, base - hv - a * 190 * m, (18 + a * 50) * m,
                `rgba(60, 22, 20, ${0.75 * (1 - a)})`);
        }
        c.fillStyle = theme.lointain;
        c.beginPath();
        c.moveTo(vx - lv, base);
        c.quadraticCurveTo(vx - lv * 0.4, base - hv * 0.5, vx - 34 * m, base - hv);
        c.lineTo(vx + 34 * m, base - hv);
        c.quadraticCurveTo(vx + lv * 0.4, base - hv * 0.5, vx + lv, base);
        c.closePath(); c.fill();
        c.fillStyle = '#fb923c';
        c.beginPath(); c.ellipse(vx, base - hv, 34 * m, 6 * m, 0, 0, TAU); c.fill();
        c.fillStyle = '#fde047';
        c.beginPath(); c.ellipse(vx, base - hv, 22 * m, 3.4 * m, 0, 0, TAU); c.fill();
        // Les coulées : elles battent, comme une braise.
        c.lineCap = 'round';
        for (const [dx, bout, larg0] of [[-14, -120, 5], [8, 90, 6], [24, 200, 4], [-26, -230, 3.5]]) {
            const bat = 0.75 + 0.25 * Math.sin(t * 2.6 + dx);
            c.strokeStyle = `rgba(251, 146, 60, ${bat})`;
            c.lineWidth = Math.max(1.5, larg0 * m);
            c.beginPath();
            c.moveTo(vx + dx * m, base - hv + 2 * m);
            c.quadraticCurveTo(vx + (dx + bout * 0.2) * m, base - hv * 0.5, vx + bout * m, base - 4 * m);
            c.stroke();
            c.strokeStyle = `rgba(253, 224, 71, ${bat})`;
            c.lineWidth = Math.max(1, larg0 * 0.4 * m);
            c.stroke();
        }
        // Des crêtes noires et déchiquetées devant.
        plan(c, o, { couleur: theme.collineLoin, pas: 150, vitesse: 46, bas: 8, forme: 'pic', profil: (n) => 26 + grain(n + 7) * 40 });
        plan(c, o, { couleur: theme.collinePres, pas: 110, vitesse: 80, bas: 14, forme: 'pic', profil: (n) => 12 + grain(n + 17) * 22 });
        // La lueur de la lave au ras de l'horizon.
        const g = c.createLinearGradient(0, horizon - 4 * m, 0, horizon + 30 * m);
        g.addColorStop(0, 'rgba(251, 146, 60, 0)'); g.addColorStop(1, 'rgba(251, 146, 60, 0.35)');
        c.fillStyle = g;
        c.fillRect(0, horizon - 4 * m, larg, 34 * m);
    },

    ville(c, o) {
        const { larg, horizon, t, m, theme } = o;
        etoiles(c, o, 60);
        const [lx, ly, lr] = astre(c, o, 0.74, 0.3, 28);
        // Un croissant : la lune mordue par un disque de la couleur du ciel.
        disque(c, lx + lr * 0.42, ly - lr * 0.18, lr * 0.86, theme.ciel[1]);
        for (let n = 0; n < 4; n++) {
            nuage(c, tour(n * 400 * m + t * 6 * m - o.cap * 90 * m, larg + 320 * m) - 160 * m,
                horizon * (0.2 + (n % 2) * 0.16), (30 + (n % 2) * 12) * m, 'rgba(148, 163, 184, 0.13)');
        }
        // Des faisceaux qui balaient le ciel : il se passe quelque chose en ville.
        for (let i = 0; i < 3; i++) {
            const x = tour(larg * (0.2 + i * 0.3) - o.cap * 40 * m, larg);
            const a = -Math.PI / 2 + Math.sin(t * 0.5 + i * 2) * 0.5;
            c.fillStyle = i % 2 ? 'rgba(232, 121, 249, 0.10)' : 'rgba(34, 211, 238, 0.10)';
            c.beginPath();
            c.moveTo(x, horizon);
            c.lineTo(x + Math.cos(a - 0.05) * horizon * 1.2, horizon + Math.sin(a - 0.05) * horizon * 1.2);
            c.lineTo(x + Math.cos(a + 0.05) * horizon * 1.2, horizon + Math.sin(a + 0.05) * horizon * 1.2);
            c.closePath(); c.fill();
        }
        // DEUX RANGS DE TOURS : le plus lointain, sombre et sans détail ; le
        // plus proche, avec ses fenêtres — une sur cinq est éteinte.
        for (const [couleur, pas, vit, h0, dh, bas, fenetres] of [[theme.lointain, 46, 30, 40, 90, 6, false],
            [theme.collineLoin, 60, 54, 30, 110, 12, true]]) {
            const p = pas * m, glisse = tour(o.cap * vit * m, p), depart = Math.floor((o.cap * vit * m) / p);
            for (let i = -1; i * p < larg + p; i++) {
                const n = i + depart, x = i * p - glisse;
                const h = (h0 + grain(n + pas) * dh) * m, l = p * (0.62 + grain(n + 3) * 0.3);
                c.fillStyle = couleur;
                c.fillRect(x, horizon + bas * m - h, l, h + 30 * m);
                if (!fenetres) continue;
                const col = Math.max(2, Math.floor(l / (9 * m))), lig = Math.floor(h / (11 * m));
                for (let a = 0; a < lig; a++) for (let b = 0; b < col; b++) {
                    const k = grain(n * 31 + a * 7 + b);
                    if (k < 0.3) continue;
                    c.fillStyle = k > 0.86 ? '#f0abfc' : (k > 0.6 ? '#67e8f9' : '#fde68a');
                    c.fillRect(x + (b + 0.3) * (l / col), horizon + bas * m - h + (a + 0.35) * 11 * m, Math.max(1.5, 3 * m), Math.max(2, 4.4 * m));
                }
                // Un feu rouge qui clignote sur les plus hautes.
                if (h > 100 * m) {
                    c.fillStyle = '#334155';
                    c.fillRect(x + l / 2 - m, horizon + bas * m - h - 14 * m, 2 * m, 14 * m);
                    if (Math.sin(t * 3 + n) > 0) disque(c, x + l / 2, horizon + bas * m - h - 14 * m, 2.4 * m, '#f87171');
                }
                // Une enseigne au néon, de loin en loin.
                if (((n % 5) + 5) % 5 === 2) {
                    c.fillStyle = n % 2 ? '#e879f9' : '#22d3ee';
                    c.fillRect(x + l * 0.15, horizon + bas * m - h * 0.62, l * 0.7, Math.max(2, 5 * m));
                }
            }
        }
        plan(c, o, { couleur: theme.collinePres, pas: 200, vitesse: 82, bas: 18, profil: (n) => 6 + grain(n + 13) * 10 });
    },

    espace(c, o) {
        const { larg, horizon, m, theme } = o;
        // Des nébuleuses : de grandes taches de lumière, très lentes.
        for (const [fx, fy, r, couleur] of [[0.2, 0.3, 190, 'rgba(168, 85, 247, 0.32)'], [0.72, 0.5, 220, 'rgba(45, 212, 191, 0.20)'],
            [0.5, 0.14, 170, 'rgba(244, 114, 182, 0.22)']]) {
            halo(c, tour(larg * fx - o.cap * 14 * m, larg + 400 * m) - 200 * m, horizon * fy, r * m, couleur);
        }
        etoiles(c, o, 150, 18);
        // UNE PLANÈTE À ANNEAUX, grande, sur le côté.
        const px = tour(larg * 0.78 - o.cap * 34 * m, larg + 420 * m) - 210 * m, py = horizon * 0.36, pr = 58 * m;
        c.strokeStyle = 'rgba(253, 230, 138, 0.75)';
        c.lineWidth = Math.max(2, 9 * m);
        c.beginPath(); c.ellipse(px, py, pr * 1.9, pr * 0.42, -0.42, Math.PI, TAU); c.stroke();
        const g = c.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
        g.addColorStop(0, '#fef3c7'); g.addColorStop(0.5, '#f59e0b'); g.addColorStop(1, '#7c2d12');
        c.fillStyle = g;
        c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
        c.fillStyle = 'rgba(124, 45, 18, 0.35)';
        for (const dy of [-0.3, 0.1, 0.44]) { c.beginPath(); c.ellipse(px, py + pr * dy, pr * Math.sqrt(1 - dy * dy), pr * 0.07, 0, 0, TAU); c.fill(); }
        c.beginPath(); c.ellipse(px, py, pr * 1.9, pr * 0.42, -0.42, 0, Math.PI); c.stroke();
        // Une lune, et plus loin une planète bleue.
        const mx = tour(larg * 0.24 - o.cap * 48 * m, larg + 200 * m) - 100 * m;
        disque(c, mx, horizon * 0.58, 20 * m, '#cbd5e1');
        disque(c, mx - 6 * m, horizon * 0.58 - 5 * m, 5 * m, '#94a3b8');
        disque(c, mx + 7 * m, horizon * 0.58 + 6 * m, 3.4 * m, '#94a3b8');
        const bx = tour(larg * 0.48 - o.cap * 22 * m, larg + 200 * m) - 100 * m;
        halo(c, bx, horizon * 0.2, 34 * m, 'rgba(56, 189, 248, 0.4)');
        disque(c, bx, horizon * 0.2, 13 * m, '#38bdf8');
        disque(c, bx - 3 * m, horizon * 0.2 - 2 * m, 5 * m, '#22c55e');
        // À l'horizon, des îles de roche qui flottent.
        const iles = plan(c, o, { couleur: theme.collineLoin, pas: 260, vitesse: 46, bas: 8, forme: 'plateau',
            profil: (n) => 16 + grain(n) * 30 });
        for (const [x, y, , n, l] of iles) {
            if (n % 2) continue;
            halo(c, x + l / 2, y - 6 * m, 26 * m, 'rgba(167, 139, 250, 0.4)');
            c.fillStyle = '#c4b5fd';
            c.beginPath(); c.moveTo(x + l / 2 - 4 * m, y); c.lineTo(x + l / 2, y - 18 * m); c.lineTo(x + l / 2 + 4 * m, y); c.closePath(); c.fill();
        }
        plan(c, o, { couleur: theme.collinePres, pas: 180, vitesse: 80, bas: 16, profil: (n) => 8 + grain(n + 13) * 14 });
    }
};

function village(c, x, y, k) {
    for (const [dx, l, h, toit] of [[-20, 12, 9, '#b91c1c'], [-6, 14, 11, '#c2410c'], [10, 11, 8, '#b91c1c']]) {
        c.fillStyle = '#fef3c7';
        c.fillRect(x + dx * k, y - h * k, l * k, h * k);
        c.fillStyle = toit;
        c.beginPath(); c.moveTo(x + (dx - 2) * k, y - h * k); c.lineTo(x + (dx + l + 2) * k, y - h * k);
        c.lineTo(x + (dx + l / 2) * k, y - (h + 7) * k); c.closePath(); c.fill();
    }
    // Le clocher.
    c.fillStyle = '#f1f5f9';
    c.fillRect(x + 24 * k, y - 20 * k, 6 * k, 20 * k);
    c.fillStyle = '#475569';
    c.beginPath(); c.moveTo(x + 23 * k, y - 20 * k); c.lineTo(x + 31 * k, y - 20 * k); c.lineTo(x + 27 * k, y - 32 * k); c.closePath(); c.fill();
}

/**
 * PEINDRE LE LOINTAIN d'un circuit.
 *
 * @param c le contexte de la toile
 * @param o { larg, haut, horizon, cap, t, m, theme, sol } — `m` est l'échelle
 *          (1 pour une fenêtre de 600 de haut), `sol` la couleur du sol lointain
 */
export function peindreFond(c, o) {
    ciel(c, o);
    (FONDS[o.theme.fond] || FONDS.collines)(c, o);
    // Sous l'horizon, la couleur du sol lointain : ce qu'on aperçoit entre deux
    // bosses de la piste.
    c.fillStyle = o.sol;
    c.fillRect(0, o.horizon + 16 * o.m, o.larg, o.haut);
}

/* ─────────────────────────────────────────────────────────────────────────
 * LE TEMPS QU'IL FAIT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Ce qui tombe, vole ou monte DEVANT la piste : la neige, les feuilles, les
 * braises. C'est peu de chose à peindre et c'est ce qui change le plus un
 * lieu — un circuit sous la neige n'est pas un circuit blanc, c'est un circuit
 * où il neige.
 *
 * LA VITESSE Y COMPTE : plus on roule vite, plus les flocons filent vers nous.
 */
const METEO = {
    neige(c, o) {
        const { larg, haut, t, m } = o;
        c.fillStyle = 'rgba(255, 255, 255, 0.9)';
        for (let i = 0; i < 90; i++) {
            const prof = 0.4 + grain(i) * 0.9;
            const x = tour(grain(i + 10) * larg + Math.sin(t * 0.9 + i) * 16 * m - o.cap * 120 * m * prof, larg);
            const y = tour(grain(i + 20) * haut + t * (46 + o.allant * 150) * prof * m, haut);
            c.globalAlpha = 0.45 + prof * 0.4;
            c.beginPath(); c.arc(x, y, (1.1 + prof * 1.7) * m, 0, TAU); c.fill();
        }
        c.globalAlpha = 1;
    },
    feuilles(c, o) {
        const { larg, haut, t, m } = o;
        const tons = ['#ea580c', '#f59e0b', '#dc2626', '#fbbf24', '#b45309'];
        for (let i = 0; i < 34; i++) {
            const prof = 0.5 + grain(i) * 0.9;
            const x = tour(grain(i + 10) * larg + t * (22 + i % 5 * 6) * m + Math.sin(t * 1.4 + i) * 22 * m - o.cap * 120 * m * prof, larg + 40) - 20;
            const y = tour(grain(i + 20) * haut + t * (30 + o.allant * 90) * prof * m, haut + 20) - 10;
            c.save();
            c.translate(x, y);
            c.rotate(t * (1 + grain(i + 30) * 2) + i);
            c.fillStyle = tons[i % tons.length];
            c.globalAlpha = 0.85;
            c.beginPath(); c.ellipse(0, 0, 5 * prof * m, 2.4 * prof * m, 0, 0, TAU); c.fill();
            c.restore();
        }
    },
    braises(c, o) {
        const { larg, haut, t, m } = o;
        for (let i = 0; i < 46; i++) {
            const prof = 0.5 + grain(i) * 0.9;
            const a = tour(grain(i + 20) - t * (0.05 + grain(i + 5) * 0.07), 1);
            const x = tour(grain(i + 10) * larg + Math.sin(t * 1.1 + i) * 18 * m - o.cap * 120 * m * prof, larg);
            c.fillStyle = `rgba(${i % 3 ? 251 : 253}, ${i % 3 ? 146 : 224}, ${i % 3 ? 60 : 71}, ${0.9 * Math.sin(a * Math.PI)})`;
            c.beginPath(); c.arc(x, a * haut, (1 + prof * 1.5) * m, 0, TAU); c.fill();
        }
    },
    filantes(c, o) {
        const { larg, horizon, t, m } = o;
        c.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const cycle = 3.5 + i * 1.7, a = tour(t + i * 1.9, cycle) / cycle;
            if (a > 0.22) continue;
            const k = a / 0.22, n = Math.floor((t + i * 1.9) / cycle);
            const x0 = grain(n * 7 + i) * larg, y0 = grain(n * 13 + i) * horizon * 0.6;
            const x = x0 + k * 220 * m, y = y0 + k * 90 * m;
            const g = c.createLinearGradient(x - 70 * m, y - 29 * m, x, y);
            g.addColorStop(0, 'rgba(255, 255, 255, 0)'); g.addColorStop(1, `rgba(255, 255, 255, ${1 - k})`);
            c.strokeStyle = g;
            c.lineWidth = Math.max(1.2, 2.2 * m);
            c.beginPath(); c.moveTo(x - 70 * m, y - 29 * m); c.lineTo(x, y); c.stroke();
        }
    },
    pollen(c, o) {
        const { larg, haut, t, m } = o;
        c.fillStyle = 'rgba(255, 255, 255, 0.75)';
        for (let i = 0; i < 22; i++) {
            const prof = 0.5 + grain(i) * 0.8;
            const x = tour(grain(i + 10) * larg + t * 12 * m + Math.sin(t * 0.8 + i) * 26 * m - o.cap * 120 * m * prof, larg);
            const y = tour(grain(i + 20) * haut - t * 9 * m + Math.cos(t * 0.7 + i) * 14 * m, haut);
            c.beginPath(); c.arc(x, y, (0.9 + prof) * m, 0, TAU); c.fill();
        }
    },
    poussiere(c, o) {
        const { larg, haut, horizon, t, m } = o;
        c.fillStyle = 'rgba(254, 215, 170, 0.5)';
        for (let i = 0; i < 26; i++) {
            const prof = 0.5 + grain(i) * 0.8;
            const x = tour(grain(i + 10) * larg + t * (30 + i % 4 * 10) * m - o.cap * 120 * m * prof, larg);
            const y = horizon + grain(i + 20) * (haut - horizon) + Math.sin(t + i) * 8 * m;
            c.beginPath(); c.arc(x, y, (0.8 + prof * 1.2) * m, 0, TAU); c.fill();
        }
    },
    mouettes(c, o) { oiseaux(c, o, 6, 0.2, 'rgba(255, 255, 255, 0.95)'); }
};

/** Peindre ce qui tombe, vole ou monte devant la piste. `o.allant` : la vitesse, de 0 à 1. */
export function peindreMeteo(c, o) {
    const f = METEO[o.theme.meteo];
    if (f) f(c, o);
}

export const FONDS_CONNUS = Object.keys(FONDS);
export const METEOS_CONNUES = Object.keys(METEO);
