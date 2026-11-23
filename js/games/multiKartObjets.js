// MULTIKART — ce qui borde la piste.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « améliore le décor aussi mais vraiment super bien le décor, tu peux
// mettre plusieurs circuits et plusieurs ambiances ».
//
// LE FICHIER REÇU AVAIT DEUX OBJETS PAR CIRCUIT — un arbre et un rocher, un
// cactus et une butte, deux halos — posés à distance fixe des deux côtés. Au
// bout de dix secondes, ce n'est plus un paysage, c'est un papier peint.
//
// ICI, CHAQUE CIRCUIT A SIX OBJETS À LUI : quatre qui bordent la piste, et deux
// REPÈRES, plus grands, plus loin, qu'on voit venir — un moulin dont les ailes
// tournent, un phare, un chalet qui fume, un geyser de lave. Plus les CHEVRONS,
// les seuls qui servent à quelque chose : ils annoncent le virage.
//
// Chaque dessin se fait dans le repère de l'objet : l'origine au pied, `u` pour
// unité (sa largeur à l'écran), le haut vers les y négatifs. Aucun ne lit autre
// chose que `u` et l'heure `t` : le même palmier sert à 8 pixels et à 400.
//
// PAS D'IMAGE, PAS DE POLICE, PAS DE RÉSEAU : tout est tracé. Une tablette hors
// ligne voit le même décor que le tableau de la classe.

/* ── LES OUTILS ──────────────────────────────────────────────────────────── */

function rond(c, x, y, rx, ry, couleur) {
    c.fillStyle = couleur;
    c.beginPath();
    c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry === undefined ? rx : ry), 0, 0, Math.PI * 2);
    c.fill();
}

function boite(c, x, y, l, h, couleur, r = 0) {
    c.fillStyle = couleur;
    if (r <= 0) { c.fillRect(x, y, l, h); return; }
    const rr = Math.min(r, l / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + l, y, x + l, y + h, rr);
    c.arcTo(x + l, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + l, y, rr);
    c.closePath();
    c.fill();
}

/** Un polygone, donné en points [x, y]. */
function forme(c, points, couleur) {
    c.fillStyle = couleur;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fill();
}

function trait(c, points, couleur, epaisseur) {
    c.strokeStyle = couleur;
    c.lineWidth = Math.max(1, epaisseur);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
}

/** Un halo : ce qui fait qu'une lampe éclaire, qu'une lave brûle. */
function lueur(c, x, y, r, couleur) {
    const g = c.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, couleur);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
}

/** Un sapin : trois étages, et de la neige dessus si on en veut. */
function sapin(c, u, vert, clair, neige) {
    boite(c, -u * 0.05, -u * 0.22, u * 0.1, u * 0.22, '#6b4423');
    for (let i = 0; i < 3; i++) {
        const bas = -u * (0.18 + i * 0.36), l = u * (0.46 - i * 0.11), h = u * 0.52;
        forme(c, [[-l, bas], [l, bas], [0, bas - h]], i % 2 ? clair : vert);
        if (neige) forme(c, [[-l * 0.55, bas - h * 0.45], [l * 0.55, bas - h * 0.45], [0, bas - h]], neige);
    }
}

/** Un feuillage fait de boules : la forme la plus lisible d'un arbre de loin. */
function feuillage(c, u, y, boules) {
    for (const [dx, dy, r, couleur] of boules) rond(c, dx * u, y + dy * u, r * u, r * u, couleur);
}

/* ── LES OBJETS, CIRCUIT PAR CIRCUIT ─────────────────────────────────────── */

const OBJETS = {
    /* ── LA PRAIRIE ─────────────────────────────────────────────────────── */
    arbre(c, u) {
        boite(c, -u * 0.07, -u * 0.6, u * 0.14, u * 0.6, '#7c4a1e', u * 0.04);
        feuillage(c, u, -u * 0.85, [[0, 0.02, 0.36, '#15803d'], [-0.24, 0.14, 0.26, '#16a34a'],
            [0.24, 0.14, 0.26, '#16a34a'], [-0.08, -0.14, 0.24, '#4ade80'], [0.12, -0.04, 0.16, '#22c55e']]);
    },
    peuplier(c, u) {
        boite(c, -u * 0.04, -u * 0.4, u * 0.08, u * 0.4, '#6b4423');
        c.fillStyle = '#15803d';
        c.beginPath();
        c.ellipse(0, -u * 1.05, u * 0.2, u * 0.75, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#22c55e';
        c.beginPath();
        c.ellipse(-u * 0.06, -u * 1.12, u * 0.1, u * 0.6, 0, 0, Math.PI * 2);
        c.fill();
    },
    buisson(c, u) {
        rond(c, 0, -u * 0.18, u * 0.4, u * 0.2, '#16a34a');
        rond(c, -u * 0.12, -u * 0.26, u * 0.22, u * 0.14, '#22c55e');
        for (const [dx, dy, coul] of [[-0.2, -0.28, '#fde047'], [0.14, -0.3, '#f9a8d4'], [0.02, -0.16, '#ffffff'], [0.26, -0.18, '#fde047']]) {
            rond(c, u * dx, u * dy, Math.max(1, u * 0.045), undefined, coul);
        }
    },
    foin(c, u) {
        rond(c, 0, -u * 0.3, u * 0.36, u * 0.3, '#eab308');
        rond(c, 0, -u * 0.3, u * 0.24, u * 0.2, '#fde047');
        rond(c, 0, -u * 0.3, u * 0.09, u * 0.075, '#ca8a04');
    },
    moulin(c, u, t) {
        forme(c, [[-u * 0.2, 0], [u * 0.2, 0], [u * 0.13, -u * 0.8], [-u * 0.13, -u * 0.8]], '#f8fafc');
        forme(c, [[-u * 0.17, -u * 0.8], [u * 0.17, -u * 0.8], [0, -u * 1.05]], '#b91c1c');
        boite(c, -u * 0.04, -u * 0.22, u * 0.08, u * 0.22, '#78350f', u * 0.03);
        boite(c, -u * 0.035, -u * 0.55, u * 0.07, u * 0.09, '#38bdf8');
        // Les ailes tournent : c'est le seul objet de la prairie qui bouge.
        c.save();
        c.translate(0, -u * 0.86);
        c.rotate(t * 0.9);
        for (let i = 0; i < 4; i++) {
            c.rotate(Math.PI / 2);
            boite(c, -u * 0.012, 0, u * 0.024, u * 0.52, '#78350f');
            boite(c, u * 0.012, u * 0.12, u * 0.1, u * 0.38, 'rgba(254, 243, 199, 0.92)');
        }
        c.restore();
        rond(c, 0, -u * 0.86, u * 0.035, undefined, '#451a03');
    },
    ferme(c, u) {
        boite(c, -u * 0.36, -u * 0.42, u * 0.72, u * 0.42, '#b91c1c');
        forme(c, [[-u * 0.42, -u * 0.42], [u * 0.42, -u * 0.42], [u * 0.2, -u * 0.72], [-u * 0.2, -u * 0.72]], '#7f1d1d');
        boite(c, -u * 0.1, -u * 0.26, u * 0.2, u * 0.26, '#fef3c7');
        trait(c, [[-u * 0.1, -u * 0.26], [u * 0.1, 0]], '#b91c1c', u * 0.02);
        trait(c, [[u * 0.1, -u * 0.26], [-u * 0.1, 0]], '#b91c1c', u * 0.02);
        boite(c, u * 0.44, -u * 0.86, u * 0.16, u * 0.86, '#e2e8f0', u * 0.07);
        rond(c, u * 0.52, -u * 0.86, u * 0.08, u * 0.05, '#94a3b8');
    },

    /* ── LA PLAGE ───────────────────────────────────────────────────────── */
    palmier(c, u, t) {
        // Le tronc penche, et les palmes se balancent un peu.
        trait(c, [[0, 0], [u * 0.06, -u * 0.5], [u * 0.2, -u * 1.0], [u * 0.3, -u * 1.3]], '#a16207', u * 0.1);
        const bx = u * 0.3, by = -u * 1.3, vent = Math.sin(t * 1.6) * 0.06;
        for (const [a, coul] of [[-2.7, '#15803d'], [-2.1, '#16a34a'], [-1.3, '#22c55e'], [-0.5, '#16a34a'], [0.15, '#15803d'], [-3.3, '#166534']]) {
            const an = a + vent;
            c.fillStyle = coul;
            c.beginPath();
            c.moveTo(bx, by);
            c.quadraticCurveTo(bx + Math.cos(an) * u * 0.42, by + Math.sin(an) * u * 0.42 - u * 0.2,
                bx + Math.cos(an) * u * 0.62, by + Math.sin(an) * u * 0.62 + u * 0.12);
            c.quadraticCurveTo(bx + Math.cos(an) * u * 0.3, by + Math.sin(an) * u * 0.3 + u * 0.02, bx, by);
            c.fill();
        }
        rond(c, bx - u * 0.04, by + u * 0.05, u * 0.055, undefined, '#713f12');
        rond(c, bx + u * 0.05, by + u * 0.06, u * 0.05, undefined, '#854d0e');
    },
    parasol(c, u) {
        boite(c, -u * 0.34, -u * 0.05, u * 0.6, u * 0.05, '#38bdf8', u * 0.02);
        trait(c, [[0, 0], [0, -u * 0.78]], '#f8fafc', u * 0.03);
        for (let i = 0; i < 6; i++) {
            c.fillStyle = i % 2 ? '#ffffff' : '#ef4444';
            c.beginPath();
            c.moveTo(0, -u * 0.8);
            c.arc(0, -u * 0.8, u * 0.46, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6);
            c.closePath();
            c.fill();
        }
    },
    cabine(c, u) {
        for (let i = 0; i < 5; i++) boite(c, -u * 0.25 + i * u * 0.1, -u * 0.6, u * 0.1, u * 0.6, i % 2 ? '#ffffff' : '#0ea5e9');
        forme(c, [[-u * 0.3, -u * 0.6], [u * 0.3, -u * 0.6], [0, -u * 0.86]], '#f97316');
        boite(c, -u * 0.08, -u * 0.36, u * 0.16, u * 0.36, '#0369a1', u * 0.02);
    },
    chateau(c, u) {
        const sable = '#e7c56f', ombre = '#c9a14a';
        boite(c, -u * 0.3, -u * 0.22, u * 0.6, u * 0.22, sable);
        for (const x of [-0.3, 0.18]) {
            boite(c, u * x, -u * 0.42, u * 0.12, u * 0.42, sable);
            boite(c, u * x, -u * 0.46, u * 0.04, u * 0.05, ombre);
            boite(c, u * (x + 0.08), -u * 0.46, u * 0.04, u * 0.05, ombre);
        }
        boite(c, -u * 0.05, -u * 0.14, u * 0.1, u * 0.14, ombre, u * 0.05);
        trait(c, [[u * 0.24, -u * 0.46], [u * 0.24, -u * 0.66]], '#78350f', u * 0.015);
        forme(c, [[u * 0.24, -u * 0.66], [u * 0.38, -u * 0.61], [u * 0.24, -u * 0.56]], '#ef4444');
    },
    phare(c, u, t) {
        const bandes = 5;
        for (let i = 0; i < bandes; i++) {
            const y0 = -u * (i * 0.2), y1 = -u * ((i + 1) * 0.2);
            const l0 = u * (0.17 - i * 0.012), l1 = u * (0.17 - (i + 1) * 0.012);
            forme(c, [[-l0, y0], [l0, y0], [l1, y1], [-l1, y1]], i % 2 ? '#ffffff' : '#dc2626');
        }
        boite(c, -u * 0.15, -u * 1.03, u * 0.3, u * 0.04, '#1e293b');
        boite(c, -u * 0.09, -u * 1.17, u * 0.18, u * 0.14, '#fef08a');
        forme(c, [[-u * 0.12, -u * 1.17], [u * 0.12, -u * 1.17], [0, -u * 1.32]], '#1e293b');
        // Le faisceau balaie : on le voit de très loin, c'est le repère.
        const a = Math.sin(t * 0.8) * 0.5;
        c.save();
        c.translate(0, -u * 1.1);
        c.rotate(a);
        c.fillStyle = 'rgba(254, 240, 138, 0.28)';
        c.beginPath();
        c.moveTo(0, 0); c.lineTo(u * 1.5, -u * 0.22); c.lineTo(u * 1.5, u * 0.22);
        c.closePath(); c.fill();
        c.restore();
    },
    paillote(c, u) {
        for (const x of [-0.26, 0.2]) boite(c, u * x, -u * 0.5, u * 0.06, u * 0.5, '#92400e');
        boite(c, -u * 0.3, -u * 0.3, u * 0.6, u * 0.08, '#b45309', u * 0.02);
        forme(c, [[-u * 0.46, -u * 0.48], [u * 0.46, -u * 0.48], [u * 0.12, -u * 0.86], [-u * 0.12, -u * 0.86]], '#ca8a04');
        for (let i = -4; i <= 4; i++) trait(c, [[u * i * 0.1, -u * 0.48], [u * i * 0.03, -u * 0.86]], '#a16207', u * 0.012);
        rond(c, -u * 0.08, -u * 0.36, u * 0.05, undefined, '#22c55e');
        rond(c, u * 0.08, -u * 0.36, u * 0.05, undefined, '#f97316');
    },

    /* ── LE CANYON ──────────────────────────────────────────────────────── */
    cactus(c, u) {
        const v = '#15803d', cl = '#22c55e';
        boite(c, -u * 0.09, -u * 1.05, u * 0.18, u * 1.05, v, u * 0.09);
        boite(c, -u * 0.32, -u * 0.72, u * 0.12, u * 0.34, v, u * 0.06);
        boite(c, -u * 0.32, -u * 0.48, u * 0.26, u * 0.1, v, u * 0.05);
        boite(c, u * 0.2, -u * 0.88, u * 0.12, u * 0.34, v, u * 0.06);
        boite(c, u * 0.06, -u * 0.64, u * 0.26, u * 0.1, v, u * 0.05);
        boite(c, -u * 0.045, -u * 1.0, u * 0.035, u * 0.9, cl, u * 0.017);
        rond(c, 0, -u * 1.06, u * 0.05, undefined, '#f472b6');
    },
    rocher(c, u) {
        forme(c, [[-u * 0.46, 0], [-u * 0.34, -u * 0.42], [-u * 0.06, -u * 0.6], [u * 0.26, -u * 0.46], [u * 0.46, 0]], '#9a3412');
        forme(c, [[-u * 0.34, -u * 0.42], [-u * 0.06, -u * 0.6], [u * 0.02, -u * 0.2], [-u * 0.26, -u * 0.1]], '#c2410c');
        trait(c, [[-u * 0.4, -u * 0.16], [u * 0.4, -u * 0.2]], '#7c2d12', u * 0.02);
    },
    broussaille(c, u, t) {
        // Une boule d'épines : elle roule sur place, juste assez pour vivre.
        c.save();
        c.translate(0, -u * 0.26);
        c.rotate(t * 0.7);
        c.strokeStyle = '#a16207';
        c.lineWidth = Math.max(1, u * 0.025);
        for (let i = 0; i < 7; i++) {
            c.beginPath();
            c.ellipse(0, 0, u * 0.26, u * (0.08 + (i % 3) * 0.07), (i * Math.PI) / 7, 0, Math.PI * 2);
            c.stroke();
        }
        c.restore();
    },
    pancarte(c, u) {
        boite(c, -u * 0.03, -u * 0.7, u * 0.06, u * 0.7, '#78350f');
        forme(c, [[-u * 0.3, -u * 0.72], [u * 0.22, -u * 0.72], [u * 0.36, -u * 0.6], [u * 0.22, -u * 0.48], [-u * 0.3, -u * 0.48]], '#d97706');
        trait(c, [[-u * 0.2, -u * 0.6], [u * 0.16, -u * 0.6]], '#78350f', u * 0.03);
    },
    arche(c, u) {
        c.fillStyle = '#b45309';
        c.beginPath();
        c.moveTo(-u * 0.6, 0);
        c.lineTo(-u * 0.5, -u * 0.86);
        c.quadraticCurveTo(0, -u * 1.18, u * 0.52, -u * 0.8);
        c.lineTo(u * 0.6, 0);
        c.lineTo(u * 0.3, 0);
        c.quadraticCurveTo(u * 0.28, -u * 0.62, 0, -u * 0.66);
        c.quadraticCurveTo(-u * 0.28, -u * 0.62, -u * 0.3, 0);
        c.closePath();
        c.fill();
        for (const y of [0.3, 0.55, 0.84]) trait(c, [[-u * 0.56, -u * y], [-u * 0.32, -u * (y + 0.02)]], '#92400e', u * 0.022);
        for (const y of [0.24, 0.5, 0.78]) trait(c, [[u * 0.32, -u * y], [u * 0.57, -u * (y - 0.02)]], '#92400e', u * 0.022);
    },
    cheminee(c, u) {
        // Une cheminée de fée : un pilier, et son chapeau de roche dure.
        forme(c, [[-u * 0.16, 0], [u * 0.16, 0], [u * 0.09, -u * 0.9], [-u * 0.09, -u * 0.9]], '#c2410c');
        for (const y of [0.22, 0.46, 0.7]) trait(c, [[-u * 0.14, -u * y], [u * 0.13, -u * (y + 0.02)]], '#9a3412', u * 0.02);
        rond(c, 0, -u * 0.98, u * 0.2, u * 0.11, '#7c2d12');
        forme(c, [[u * 0.24, 0], [u * 0.44, 0], [u * 0.38, -u * 0.5], [u * 0.3, -u * 0.5]], '#b45309');
        rond(c, u * 0.34, -u * 0.55, u * 0.12, u * 0.07, '#7c2d12');
    },

    /* ── LA NEIGE ───────────────────────────────────────────────────────── */
    sapin(c, u) { sapin(c, u, '#166534', '#15803d', '#f8fafc'); },
    bonhomme(c, u) {
        rond(c, 0, -u * 0.22, u * 0.26, u * 0.23, '#f8fafc');
        rond(c, 0, -u * 0.58, u * 0.19, u * 0.17, '#f8fafc');
        rond(c, 0, -u * 0.86, u * 0.13, undefined, '#ffffff');
        boite(c, -u * 0.13, -u * 1.02, u * 0.26, u * 0.035, '#1e293b');
        boite(c, -u * 0.085, -u * 1.2, u * 0.17, u * 0.18, '#1e293b');
        boite(c, -u * 0.085, -u * 1.07, u * 0.17, u * 0.04, '#dc2626');
        forme(c, [[0, -u * 0.86], [u * 0.16, -u * 0.83], [0, -u * 0.81]], '#f97316');
        rond(c, -u * 0.045, -u * 0.9, u * 0.016, undefined, '#0f172a');
        rond(c, u * 0.045, -u * 0.9, u * 0.016, undefined, '#0f172a');
        boite(c, -u * 0.19, -u * 0.76, u * 0.38, u * 0.06, '#ef4444', u * 0.03);
        trait(c, [[-u * 0.18, -u * 0.6], [-u * 0.4, -u * 0.78]], '#78350f', u * 0.02);
        trait(c, [[u * 0.18, -u * 0.6], [u * 0.4, -u * 0.72]], '#78350f', u * 0.02);
    },
    congere(c, u) {
        forme(c, [[-u * 0.44, 0], [-u * 0.3, -u * 0.3], [-u * 0.02, -u * 0.46], [u * 0.3, -u * 0.3], [u * 0.44, 0]], '#64748b');
        c.fillStyle = '#f8fafc';
        c.beginPath();
        c.moveTo(-u * 0.34, -u * 0.22);
        c.quadraticCurveTo(-u * 0.04, -u * 0.62, u * 0.34, -u * 0.22);
        c.quadraticCurveTo(u * 0.1, -u * 0.3, 0, -u * 0.2);
        c.quadraticCurveTo(-u * 0.16, -u * 0.3, -u * 0.34, -u * 0.22);
        c.fill();
    },
    bouleau(c, u) {
        trait(c, [[0, 0], [0, -u * 1.1]], '#f1f5f9', u * 0.07);
        for (const y of [0.2, 0.45, 0.7, 0.9]) trait(c, [[-u * 0.03, -u * y], [u * 0.02, -u * y]], '#334155', u * 0.022);
        for (const [y, dx, dy] of [[0.6, -0.26, -0.22], [0.75, 0.24, -0.2], [0.95, -0.18, -0.2], [1.05, 0.16, -0.16]]) {
            trait(c, [[0, -u * y], [u * dx, -u * y + u * dy]], '#e2e8f0', u * 0.03);
            rond(c, u * dx, -u * y + u * dy, u * 0.05, u * 0.03, '#ffffff');
        }
    },
    chalet(c, u, t) {
        boite(c, -u * 0.36, -u * 0.4, u * 0.72, u * 0.4, '#92400e');
        for (const y of [0.1, 0.2, 0.3]) trait(c, [[-u * 0.36, -u * y], [u * 0.36, -u * y]], '#78350f', u * 0.012);
        forme(c, [[-u * 0.46, -u * 0.38], [u * 0.46, -u * 0.38], [0, -u * 0.8]], '#7c2d12');
        forme(c, [[-u * 0.46, -u * 0.38], [-u * 0.38, -u * 0.36], [0, -u * 0.72], [u * 0.38, -u * 0.36], [u * 0.46, -u * 0.38], [0, -u * 0.8]], '#f8fafc');
        boite(c, -u * 0.06, -u * 0.22, u * 0.12, u * 0.22, '#451a03');
        // Les fenêtres sont éclairées : il fait bon dedans.
        for (const x of [-0.27, 0.15]) {
            lueur(c, u * (x + 0.06), -u * 0.24, u * 0.16, 'rgba(253, 224, 71, 0.5)');
            boite(c, u * x, -u * 0.3, u * 0.12, u * 0.12, '#fde047');
        }
        boite(c, u * 0.18, -u * 0.78, u * 0.08, u * 0.2, '#57534e');
        for (let i = 0; i < 3; i++) {
            const a = (t * 0.5 + i / 3) % 1;
            rond(c, u * (0.22 + a * 0.12), -u * (0.84 + a * 0.4), u * (0.05 + a * 0.07), undefined, `rgba(241, 245, 249, ${0.6 * (1 - a)})`);
        }
    },
    igloo(c, u) {
        c.fillStyle = '#e0f2fe';
        c.beginPath();
        c.arc(0, 0, u * 0.42, Math.PI, 0);
        c.closePath();
        c.fill();
        c.strokeStyle = '#93c5fd';
        c.lineWidth = Math.max(1, u * 0.014);
        for (const r of [0.14, 0.28]) { c.beginPath(); c.arc(0, 0, u * (0.42 - r), Math.PI, 0); c.stroke(); }
        for (let i = 1; i < 6; i++) {
            const a = Math.PI + (i * Math.PI) / 6;
            c.beginPath(); c.moveTo(Math.cos(a) * u * 0.14, Math.sin(a) * u * 0.14);
            c.lineTo(Math.cos(a) * u * 0.42, Math.sin(a) * u * 0.42); c.stroke();
        }
        c.fillStyle = '#0c4a6e';
        c.beginPath(); c.arc(0, 0, u * 0.13, Math.PI, 0); c.closePath(); c.fill();
    },

    /* ── L'AUTOMNE ──────────────────────────────────────────────────────── */
    erable(c, u) {
        boite(c, -u * 0.06, -u * 0.55, u * 0.12, u * 0.55, '#5b3a1e', u * 0.03);
        feuillage(c, u, -u * 0.82, [[0, 0.02, 0.36, '#c2410c'], [-0.24, 0.12, 0.25, '#ea580c'],
            [0.24, 0.12, 0.25, '#dc2626'], [-0.06, -0.14, 0.23, '#f97316'], [0.14, -0.06, 0.15, '#fbbf24']]);
    },
    hetre(c, u) {
        boite(c, -u * 0.045, -u * 0.5, u * 0.09, u * 0.5, '#6b4423');
        c.fillStyle = '#d97706';
        c.beginPath(); c.ellipse(0, -u * 0.95, u * 0.26, u * 0.56, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fbbf24';
        c.beginPath(); c.ellipse(-u * 0.07, -u * 1.02, u * 0.14, u * 0.42, 0, 0, Math.PI * 2); c.fill();
        rond(c, u * 0.1, -u * 0.72, u * 0.07, undefined, '#b45309');
    },
    champignon(c, u) {
        boite(c, -u * 0.07, -u * 0.3, u * 0.14, u * 0.3, '#fef3c7', u * 0.05);
        c.fillStyle = '#dc2626';
        c.beginPath(); c.arc(0, -u * 0.28, u * 0.3, Math.PI, 0); c.closePath(); c.fill();
        for (const [dx, dy, r] of [[-0.14, -0.4, 0.045], [0.06, -0.48, 0.05], [0.18, -0.36, 0.035], [-0.04, -0.34, 0.03]]) {
            rond(c, u * dx, u * dy, u * r, undefined, '#ffffff');
        }
        boite(c, u * 0.2, -u * 0.14, u * 0.07, u * 0.14, '#fef3c7', u * 0.03);
        c.fillStyle = '#ea580c';
        c.beginPath(); c.arc(u * 0.235, -u * 0.14, u * 0.12, Math.PI, 0); c.closePath(); c.fill();
    },
    souche(c, u) {
        boite(c, -u * 0.24, -u * 0.26, u * 0.48, u * 0.26, '#6b4423');
        rond(c, 0, -u * 0.26, u * 0.24, u * 0.08, '#d6a25e');
        rond(c, 0, -u * 0.26, u * 0.13, u * 0.045, '#b07b3a');
        for (const [dx, dy, coul] of [[-0.34, -0.03, '#ea580c'], [0.32, -0.04, '#fbbf24'], [-0.1, -0.02, '#dc2626'], [0.14, -0.3, '#f97316']]) {
            rond(c, u * dx, u * dy, u * 0.06, u * 0.03, coul);
        }
    },
    cabane(c, u, t) {
        boite(c, -u * 0.34, -u * 0.36, u * 0.68, u * 0.36, '#7c4a1e');
        for (const y of [0.09, 0.18, 0.27]) trait(c, [[-u * 0.34, -u * y], [u * 0.34, -u * y]], '#5b3a1e', u * 0.016);
        forme(c, [[-u * 0.42, -u * 0.34], [u * 0.42, -u * 0.34], [0, -u * 0.7]], '#4a3118');
        boite(c, -u * 0.06, -u * 0.2, u * 0.12, u * 0.2, '#2d1b0e');
        lueur(c, u * 0.2, -u * 0.2, u * 0.16, 'rgba(251, 191, 36, 0.5)');
        boite(c, u * 0.14, -u * 0.26, u * 0.12, u * 0.11, '#fbbf24');
        boite(c, -u * 0.26, -u * 0.72, u * 0.08, u * 0.22, '#57534e');
        for (let i = 0; i < 3; i++) {
            const a = (t * 0.45 + i / 3) % 1;
            rond(c, -u * (0.22 + a * 0.1), -u * (0.78 + a * 0.4), u * (0.05 + a * 0.07), undefined, `rgba(226, 232, 240, ${0.5 * (1 - a)})`);
        }
    },
    chene(c, u) {
        forme(c, [[-u * 0.14, 0], [u * 0.14, 0], [u * 0.08, -u * 0.6], [-u * 0.08, -u * 0.6]], '#4a3118');
        trait(c, [[0, -u * 0.5], [-u * 0.26, -u * 0.8]], '#4a3118', u * 0.06);
        trait(c, [[0, -u * 0.5], [u * 0.28, -u * 0.78]], '#4a3118', u * 0.06);
        feuillage(c, u, -u * 0.95, [[0, 0, 0.42, '#b45309'], [-0.34, 0.1, 0.3, '#d97706'], [0.34, 0.1, 0.3, '#c2410c'],
            [-0.14, -0.22, 0.3, '#f59e0b'], [0.18, -0.2, 0.26, '#fbbf24'], [0, -0.36, 0.2, '#fde047']]);
    },

    /* ── LE VOLCAN ──────────────────────────────────────────────────────── */
    basalte(c, u) {
        for (const [x, l, h, coul] of [[-0.28, 0.16, 0.6, '#1c1917'], [-0.1, 0.18, 0.95, '#292524'], [0.1, 0.16, 0.72, '#1c1917'], [0.26, 0.13, 0.4, '#292524']]) {
            forme(c, [[u * x, 0], [u * (x + l), 0], [u * (x + l), -u * h], [u * (x + l / 2), -u * (h + 0.07)], [u * x, -u * h]], coul);
        }
        trait(c, [[-u * 0.02, -u * 0.2], [-u * 0.02, -u * 0.8]], '#f97316', u * 0.015);
    },
    lave(c, u, t) {
        lueur(c, 0, -u * 0.04, u * 0.6, 'rgba(249, 115, 22, 0.55)');
        rond(c, 0, -u * 0.05, u * 0.42, u * 0.11, '#7c2d12');
        rond(c, 0, -u * 0.05, u * 0.34, u * 0.08, '#f97316');
        rond(c, -u * 0.06, -u * 0.06, u * 0.18, u * 0.04, '#fde047');
        for (let i = 0; i < 3; i++) {
            const a = (t * 0.8 + i * 0.37) % 1;
            rond(c, u * (-0.2 + i * 0.2), -u * (0.06 + a * 0.3), u * 0.03 * (1 - a) + 1, undefined, `rgba(253, 224, 71, ${1 - a})`);
        }
    },
    arbremort(c, u) {
        trait(c, [[0, 0], [u * 0.02, -u * 0.5], [-u * 0.03, -u * 0.95]], '#1c1917', u * 0.09);
        trait(c, [[u * 0.02, -u * 0.5], [u * 0.3, -u * 0.82], [u * 0.36, -u * 1.0]], '#1c1917', u * 0.05);
        trait(c, [[0, -u * 0.66], [-u * 0.28, -u * 0.86], [-u * 0.3, -u * 1.02]], '#1c1917', u * 0.045);
        trait(c, [[u * 0.3, -u * 0.82], [u * 0.44, -u * 0.8]], '#1c1917', u * 0.03);
        rond(c, -u * 0.03, -u * 0.96, u * 0.03, undefined, '#f97316');
    },
    braise(c, u, t) {
        forme(c, [[-u * 0.42, 0], [-u * 0.3, -u * 0.36], [0, -u * 0.5], [u * 0.3, -u * 0.34], [u * 0.42, 0]], '#292524');
        const bat = 0.6 + 0.4 * Math.sin(t * 3);
        c.globalAlpha *= bat;
        trait(c, [[-u * 0.24, -u * 0.06], [-u * 0.1, -u * 0.26], [u * 0.04, -u * 0.18], [u * 0.16, -u * 0.36]], '#fb923c', u * 0.03);
        trait(c, [[u * 0.04, -u * 0.18], [u * 0.12, -u * 0.04]], '#fde047', u * 0.02);
        c.globalAlpha /= bat;
    },
    geyser(c, u, t) {
        forme(c, [[-u * 0.4, 0], [-u * 0.16, -u * 0.3], [u * 0.16, -u * 0.3], [u * 0.4, 0]], '#1c1917');
        lueur(c, 0, -u * 0.5, u * 0.7, 'rgba(249, 115, 22, 0.5)');
        const jet = 0.75 + 0.25 * Math.sin(t * 2.3);
        c.fillStyle = '#f97316';
        c.beginPath();
        c.moveTo(-u * 0.1, -u * 0.3);
        c.quadraticCurveTo(-u * 0.16, -u * 0.8 * jet, 0, -u * 1.25 * jet);
        c.quadraticCurveTo(u * 0.16, -u * 0.8 * jet, u * 0.1, -u * 0.3);
        c.closePath(); c.fill();
        c.fillStyle = '#fde047';
        c.beginPath();
        c.moveTo(-u * 0.045, -u * 0.3);
        c.quadraticCurveTo(-u * 0.06, -u * 0.7 * jet, 0, -u * 1.0 * jet);
        c.quadraticCurveTo(u * 0.06, -u * 0.7 * jet, u * 0.045, -u * 0.3);
        c.closePath(); c.fill();
        for (let i = 0; i < 5; i++) {
            const a = (t * 0.9 + i * 0.2) % 1, cote = i % 2 ? 1 : -1;
            rond(c, cote * u * a * 0.45, -u * (1.15 * jet - a * a * 1.0), u * 0.035, undefined, `rgba(253, 186, 116, ${1 - a})`);
        }
    },
    obelisque(c, u, t) {
        forme(c, [[-u * 0.13, 0], [u * 0.13, 0], [u * 0.08, -u * 1.05], [0, -u * 1.22], [-u * 0.08, -u * 1.05]], '#0c0a09');
        forme(c, [[-u * 0.13, 0], [0, 0], [0, -u * 1.22], [-u * 0.08, -u * 1.05]], '#1c1917');
        const bat = 0.5 + 0.5 * Math.sin(t * 2);
        for (const y of [0.25, 0.5, 0.75]) {
            lueur(c, 0, -u * y, u * 0.14, `rgba(251, 146, 60, ${0.35 + 0.35 * bat})`);
            trait(c, [[-u * 0.04, -u * y], [u * 0.04, -u * y]], '#fdba74', u * 0.02);
        }
    },

    /* ── LA VILLE, LA NUIT ──────────────────────────────────────────────── */
    lampecyan(c, u) { lampadaire(c, u, '#22d3ee'); },
    lamperose(c, u) { lampadaire(c, u, '#e879f9'); },
    enseigne(c, u, t) {
        boite(c, -u * 0.025, -u * 0.6, u * 0.05, u * 0.6, '#334155');
        const on = Math.sin(t * 5) > -0.75;
        lueur(c, 0, -u * 0.86, u * 0.5, on ? 'rgba(244, 114, 182, 0.4)' : 'rgba(244, 114, 182, 0.08)');
        boite(c, -u * 0.32, -u * 1.08, u * 0.64, u * 0.46, '#0f172a', u * 0.05);
        c.strokeStyle = on ? '#f472b6' : '#831843';
        c.lineWidth = Math.max(1.5, u * 0.035);
        c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(-u * 0.2, -u * 0.85); c.lineTo(u * 0.08, -u * 0.85);
        c.moveTo(u * 0.0, -u * 0.96); c.lineTo(u * 0.16, -u * 0.85); c.lineTo(u * 0.0, -u * 0.74);
        c.stroke();
    },
    palmierneon(c, u) {
        trait(c, [[0, 0], [u * 0.05, -u * 0.6], [u * 0.14, -u * 1.1]], '#0f172a', u * 0.09);
        trait(c, [[0, 0], [u * 0.05, -u * 0.6], [u * 0.14, -u * 1.1]], '#f0abfc', u * 0.025);
        for (const a of [-2.8, -2.2, -1.4, -0.7, 0.1]) {
            trait(c, [[u * 0.14, -u * 1.1], [u * 0.14 + Math.cos(a) * u * 0.3, -u * 1.1 + Math.sin(a) * u * 0.3 - u * 0.08],
                [u * 0.14 + Math.cos(a) * u * 0.5, -u * 1.1 + Math.sin(a) * u * 0.5 + u * 0.1]], '#22d3ee', u * 0.03);
        }
    },
    tour(c, u, t) {
        boite(c, -u * 0.24, -u * 1.3, u * 0.48, u * 1.3, '#111a33');
        boite(c, -u * 0.24, -u * 1.3, u * 0.07, u * 1.3, '#1e2a52');
        for (let l = 0; l < 9; l++) for (let k = 0; k < 4; k++) {
            const allume = ((l * 7 + k * 13) % 5) !== 0;
            c.fillStyle = allume ? (((l + k) % 4 === 0) ? '#67e8f9' : '#fde68a') : '#1e293b';
            c.fillRect(-u * 0.19 + k * u * 0.1, -u * 1.22 + l * u * 0.13, u * 0.06, u * 0.07);
        }
        trait(c, [[0, -u * 1.3], [0, -u * 1.5]], '#475569', u * 0.02);
        if (Math.sin(t * 4) > 0) rond(c, 0, -u * 1.5, u * 0.03, undefined, '#ef4444');
    },
    ecran(c, u, t) {
        for (const x of [-0.3, 0.26]) boite(c, u * x, -u * 0.56, u * 0.045, u * 0.56, '#334155');
        lueur(c, 0, -u * 0.86, u * 0.8, 'rgba(34, 211, 238, 0.28)');
        boite(c, -u * 0.48, -u * 1.16, u * 0.96, u * 0.62, '#0b1120', u * 0.04);
        // Des barres qui dansent : un écran géant, pas une affiche.
        const coul = ['#22d3ee', '#e879f9', '#fde047', '#34d399', '#f472b6', '#38bdf8'];
        for (let i = 0; i < 6; i++) {
            const h = u * (0.12 + 0.34 * Math.abs(Math.sin(t * 3 + i * 1.3)));
            boite(c, -u * 0.4 + i * u * 0.14, -u * 0.6 - h, u * 0.09, h, coul[i]);
        }
    },

    /* ── L'ESPACE ───────────────────────────────────────────────────────── */
    cristal(c, u, t) {
        const bat = 0.6 + 0.4 * Math.sin(t * 2.4);
        lueur(c, 0, -u * 0.5, u * 0.7, `rgba(167, 139, 250, ${0.3 + 0.25 * bat})`);
        for (const [x, l, h, a, b] of [[-0.22, 0.16, 0.6, '#7c3aed', '#c4b5fd'], [-0.04, 0.2, 1.0, '#6d28d9', '#ddd6fe'], [0.16, 0.14, 0.52, '#8b5cf6', '#c4b5fd']]) {
            forme(c, [[u * x, 0], [u * (x + l), 0], [u * (x + l), -u * h * 0.8], [u * (x + l / 2), -u * h], [u * x, -u * h * 0.8]], a);
            forme(c, [[u * x, 0], [u * (x + l / 2), 0], [u * (x + l / 2), -u * h], [u * x, -u * h * 0.8]], b);
        }
    },
    asteroide(c, u, t) {
        // Il flotte : rien ne tient au sol, ici.
        const y = -u * (0.5 + 0.08 * Math.sin(t * 1.5));
        rond(c, 0, 0, u * 0.26, u * 0.05, 'rgba(0, 0, 0, 0.3)');
        forme(c, [[-u * 0.34, y], [-u * 0.2, y - u * 0.26], [u * 0.1, y - u * 0.32], [u * 0.34, y - u * 0.1], [u * 0.26, y + u * 0.2], [-u * 0.12, y + u * 0.26]], '#64748b');
        forme(c, [[-u * 0.2, y - u * 0.26], [u * 0.1, y - u * 0.32], [u * 0.02, y - u * 0.04], [-u * 0.2, y - u * 0.02]], '#94a3b8');
        rond(c, u * 0.1, y + u * 0.04, u * 0.07, u * 0.05, '#475569');
        rond(c, -u * 0.12, y + u * 0.1, u * 0.045, u * 0.03, '#475569');
    },
    satellite(c, u, t) {
        const y = -u * (0.75 + 0.06 * Math.sin(t * 1.2));
        c.save();
        c.translate(0, y);
        c.rotate(Math.sin(t * 0.6) * 0.25);
        boite(c, -u * 0.1, -u * 0.13, u * 0.2, u * 0.26, '#e2e8f0', u * 0.03);
        for (const s of [-1, 1]) {
            boite(c, s > 0 ? u * 0.12 : -u * 0.46, -u * 0.09, u * 0.34, u * 0.18, '#1d4ed8', u * 0.02);
            for (let i = 1; i < 4; i++) {
                const x = (s > 0 ? u * 0.12 : -u * 0.46) + i * u * 0.085;
                trait(c, [[x, -u * 0.09], [x, u * 0.09]], '#93c5fd', u * 0.01);
            }
        }
        trait(c, [[0, -u * 0.13], [0, -u * 0.3]], '#cbd5e1', u * 0.018);
        rond(c, 0, -u * 0.32, u * 0.035, undefined, Math.sin(t * 5) > 0 ? '#f87171' : '#7f1d1d');
        c.restore();
    },
    planete(c, u, t) {
        const y = -u * (0.72 + 0.05 * Math.sin(t * 1.1));
        c.strokeStyle = '#fbcfe8';
        c.lineWidth = Math.max(1.5, u * 0.045);
        c.beginPath(); c.ellipse(0, y, u * 0.46, u * 0.11, -0.35, Math.PI, Math.PI * 2); c.stroke();
        const g = c.createRadialGradient(-u * 0.1, y - u * 0.1, u * 0.03, 0, y, u * 0.27);
        g.addColorStop(0, '#fde68a'); g.addColorStop(0.6, '#fb923c'); g.addColorStop(1, '#9a3412');
        c.fillStyle = g;
        c.beginPath(); c.arc(0, y, u * 0.27, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(0, y, u * 0.46, u * 0.11, -0.35, 0, Math.PI); c.stroke();
    },
    station(c, u, t) {
        const y = -u * 0.9;
        c.save();
        c.translate(0, y);
        c.rotate(t * 0.25);
        c.strokeStyle = '#cbd5e1';
        c.lineWidth = Math.max(2, u * 0.07);
        c.beginPath(); c.arc(0, 0, u * 0.42, 0, Math.PI * 2); c.stroke();
        for (let i = 0; i < 4; i++) {
            c.rotate(Math.PI / 2);
            trait(c, [[0, 0], [u * 0.42, 0]], '#94a3b8', u * 0.04);
            rond(c, u * 0.42, 0, u * 0.05, undefined, '#38bdf8');
        }
        c.restore();
        lueur(c, 0, y, u * 0.3, 'rgba(56, 189, 248, 0.45)');
        rond(c, 0, y, u * 0.13, undefined, '#e2e8f0');
        rond(c, 0, y, u * 0.07, undefined, '#38bdf8');
    },
    fusee(c, u, t) {
        boite(c, -u * 0.3, -u * 0.08, u * 0.6, u * 0.08, '#475569', u * 0.02);
        lueur(c, 0, -u * 0.12, u * 0.4, `rgba(251, 146, 60, ${0.35 + 0.2 * Math.sin(t * 9)})`);
        for (const s of [-1, 1]) forme(c, [[s * u * 0.1, -u * 0.14], [s * u * 0.27, -u * 0.08], [s * u * 0.1, -u * 0.44]], '#dc2626');
        c.fillStyle = '#f8fafc';
        c.beginPath();
        c.moveTo(-u * 0.12, -u * 0.12);
        c.lineTo(-u * 0.12, -u * 0.82);
        c.quadraticCurveTo(-u * 0.11, -u * 1.12, 0, -u * 1.26);
        c.quadraticCurveTo(u * 0.11, -u * 1.12, u * 0.12, -u * 0.82);
        c.lineTo(u * 0.12, -u * 0.12);
        c.closePath(); c.fill();
        boite(c, -u * 0.12, -u * 0.5, u * 0.24, u * 0.07, '#dc2626');
        rond(c, 0, -u * 0.78, u * 0.065, undefined, '#38bdf8');
        rond(c, 0, -u * 0.78, u * 0.04, undefined, '#bae6fd');
    }
};

function lampadaire(c, u, couleur) {
    boite(c, -u * 0.025, -u * 0.86, u * 0.05, u * 0.86, '#334155');
    trait(c, [[0, -u * 0.86], [u * 0.16, -u * 0.94]], '#334155', u * 0.04);
    lueur(c, u * 0.18, -u * 0.92, u * 0.48, couleur);
    rond(c, u * 0.18, -u * 0.92, u * 0.06, undefined, '#f0f9ff');
    // La flaque de lumière sur le sol : c'est elle qui dit que la lampe éclaire.
    c.globalAlpha *= 0.22;
    rond(c, u * 0.18, 0, u * 0.36, u * 0.07, couleur);
    c.globalAlpha /= 0.22;
}

/**
 * LES CHEVRONS : le seul décor qui renseigne.
 *
 * Trois flèches sur un panneau, à l'extérieur d'un virage serré, tournées vers
 * l'intérieur. On les lit du coin de l'œil, comme sur une vraie route.
 */
function chevron(c, u, sens, couleurs) {
    for (const x of [-0.34, 0.28]) boite(c, u * x, -u * 0.36, u * 0.06, u * 0.36, '#475569');
    boite(c, -u * 0.52, -u * 0.9, u * 1.04, u * 0.56, couleurs[1], u * 0.05);
    c.strokeStyle = couleurs[0];
    c.lineWidth = Math.max(1.5, u * 0.1);
    c.lineJoin = 'miter';
    c.lineCap = 'butt';
    for (let i = -1; i <= 1; i++) {
        const x = i * u * 0.3;
        c.beginPath();
        c.moveTo(x - sens * u * 0.08, -u * 0.8);
        c.lineTo(x + sens * u * 0.08, -u * 0.62);
        c.lineTo(x - sens * u * 0.08, -u * 0.44);
        c.stroke();
    }
}

/**
 * PEINDRE UN OBJET DU BORD DE PISTE.
 *
 * @param c       le contexte de la toile
 * @param circuit le circuit (`CIRCUITS[cle]`) : il dit quels objets il porte
 * @param d       le décor du segment : { genre, sorte, sens }
 * @param x, y    son pied, à l'écran
 * @param u       sa largeur à l'écran — rien n'est peint en dessous de 3
 * @param t       l'heure, pour ce qui bouge
 */
export function peindreObjet(c, circuit, d, x, y, u, t) {
    if (u < 3) return;
    c.save();
    c.translate(x, y);
    if (d.genre === 'chevron') {
        chevron(c, u, d.sens, circuit.vibreur);
    } else {
        const noms = d.genre === 'repere' ? circuit.reperes : circuit.objets;
        const nom = noms[d.sorte % noms.length];
        // L'ombre au pied : sans elle, l'objet flotte au-dessus du bas-côté.
        if (!circuit.nuit) rond(c, 0, 0, u * 0.34, u * 0.07, 'rgba(0, 0, 0, 0.18)');
        OBJETS[nom](c, u, t);
    }
    c.restore();
}

/** Les noms de tous les objets qu'on sait peindre — pour l'épreuve. */
export const OBJETS_CONNUS = Object.keys(OBJETS);
