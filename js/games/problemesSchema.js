// LES SCHÉMAS DES PROBLÈMES — des données en dessin, et rien d'autre.
//
// Ce module ne connaît ni le DOM ni le jeu : il reçoit la description d'une
// situation (js/core/problemes.js la fabrique) et rend une image SVG sous
// forme de texte. C'est ce qui permet de le vérifier au test près — qu'un
// schéma soit COMPLET, et qu'il ne récite pas la réponse — sans navigateur.

// --- Le dessin des schémas --------------------------------------------------------
//
// Un genre de schéma par famille de situation, et ce choix n'est pas graphique :
// la barre montre une composition (un tout fait de parts), la flèche montre une
// transformation (un état qui change), le tableau montre une proportionnalité
// (deux grandeurs liées). Donner le même dessin à tout le monde reviendrait à
// dire que toutes les situations se ressemblent — c'est précisément l'erreur
// qu'on combat.

const COUL = ['#6366f1', '#f59e0b', '#10b981', '#ec4899'];

export function dessinerSchema(s) {
    if (!s) return '';
    switch (s.genre) {
        case 'barres': return barres(s);
        case 'comparaison': return comparaison(s);
        case 'fleche': return fleche(s);
        case 'groupes': return groupes(s);
        case 'tableau': return tableau(s);
        case 'fractionBarre': return fractionBarre(s);
        case 'ligne': return ligne(s);
        case 'etapes': return etapes(s);
        default: return '';
    }
}

export const esc = (t) => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** Le tout au-dessus, les parts en dessous : le schéma en barres du cycle 3. */
function barres(s) {
    const W = 600, H = 150;
    const tailles = s.parts.map(p => p.taille ?? (typeof p.n === 'number' ? p.n : 1));
    const somme = tailles.reduce((a, b) => a + b, 0);
    let x = 20;
    const parts = s.parts.map((p, i) => {
        const w = (W - 40) * tailles[i] / somme;
        const g = `
            <rect x="${x}" y="82" width="${w}" height="46" rx="8" fill="${COUL[i % 4]}" opacity=".85" />
            <text x="${x + w / 2}" y="111" text-anchor="middle" fill="#fff" font-size="20" font-weight="800">${esc(p.n)}</text>
            <text x="${x + w / 2}" y="145" text-anchor="middle" fill="#64748b" font-size="14">${esc(p.nom || '')}</text>`;
        x += w;
        return g;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schéma en barres">
        <rect x="20" y="22" width="${W - 40}" height="44" rx="8" fill="none" stroke="#334155"
              stroke-width="3" stroke-dasharray="${s.total === '?' ? '8 6' : '0'}" />
        <text x="${W / 2}" y="51" text-anchor="middle" fill="#334155" font-size="21" font-weight="800">${esc(s.total)}</text>
        <text x="26" y="16" fill="#64748b" font-size="13">le tout</text>
        ${parts}
    </svg>`;
}

/** Deux barres alignées à gauche : l'écart se LIT, il n'est plus un mot. */
function comparaison(s) {
    const W = 600, H = 130;
    const max = Math.max(...s.lignes.map(l => l.taille));
    const rows = s.lignes.map((l, i) => {
        const w = (W - 130) * l.taille / max;
        const y = 24 + i * 54;
        return `
            <text x="14" y="${y + 28}" fill="#334155" font-size="15" font-weight="700">${esc(l.nom)}</text>
            <rect x="90" y="${y}" width="${w}" height="40" rx="8" fill="${COUL[i]}" opacity=".85" />
            <text x="${90 + w / 2}" y="${y + 27}" text-anchor="middle" fill="#fff" font-size="19" font-weight="800">${esc(l.val)}</text>`;
    }).join('');
    const wMax = (W - 130) * s.lignes[0].taille / max;
    const wMin = (W - 130) * s.lignes[1].taille / max;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schéma de comparaison">
        ${rows}
        <line x1="${90 + wMin}" y1="70" x2="${90 + wMax}" y2="70" stroke="#dc2626" stroke-width="3" />
        <line x1="${90 + wMin}" y1="60" x2="${90 + wMin}" y2="80" stroke="#dc2626" stroke-width="3" />
        <line x1="${90 + wMax}" y1="60" x2="${90 + wMax}" y2="80" stroke="#dc2626" stroke-width="3" />
        <text x="${90 + (wMin + wMax) / 2}" y="56" text-anchor="middle" fill="#dc2626"
              font-size="15" font-weight="800">écart ${esc(s.ecart)}</text>
    </svg>`;
}

/** Un état, une flèche, un autre état : la transformation, littéralement. */
function fleche(s) {
    const W = 600, H = 120;
    const boite = (x, v, titre) => `
        <rect x="${x}" y="42" width="150" height="52" rx="12" fill="#eef2ff" stroke="#6366f1" stroke-width="2.5" />
        <text x="${x + 75}" y="76" text-anchor="middle" fill="#312e81" font-size="21" font-weight="800">${esc(v)}</text>
        <text x="${x + 75}" y="112" text-anchor="middle" fill="#64748b" font-size="13">${titre}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schéma de transformation">
        ${boite(30, s.debut, 'au départ')}
        ${boite(420, s.fin, 'à l\'arrivée')}
        <path d="M195 68 H405" stroke="#f59e0b" stroke-width="4" />
        <path d="M395 58 L412 68 L395 78 Z" fill="#f59e0b" />
        <rect x="245" y="16" width="110" height="34" rx="10" fill="#fef3c7" stroke="#f59e0b" stroke-width="2.5" />
        <text x="300" y="39" text-anchor="middle" fill="#92400e" font-size="18" font-weight="800">${esc(s.fleche)}</text>
    </svg>`;
}

/**
 * UNE SEULE BANDE, EN LIGNE : les paquets les uns à côté des autres, tous
 * dessinés, et le reste au bout.
 *
 * Le même dessin sert aux trois situations de groupes égaux, et c'est
 * exprès : ce sont les mêmes objets mathématiques, seule change la case qui
 * porte le point d'interrogation.
 *
 *   · MULTIPLICATION — on connaît les paquets et leur contenu, le TOUT est
 *     cherché : l'accolade du haut porte le « ? ».
 *   · PARTAGE — on connaît le tout et le nombre de parts, le CONTENU d'une
 *     part est cherché : chaque case porte le « ? ».
 *   · QUOTITION — on connaît le tout et le contenu d'un paquet, le NOMBRE de
 *     paquets est cherché : on voit les paquets se remplir, et ce qui déborde.
 *
 * Deux choses ont été corrigées ici, et elles comptaient toutes les deux.
 * D'abord le dessin était TRONQUÉ au-delà de huit paquets — « … et 1 de
 * plus » — dans l'exercice où le nombre de paquets est justement la question :
 * le schéma cachait la réponse au moment de la montrer. Ensuite la légende
 * annonçait « 9 sachets » en toutes lettres pour un énoncé qui demande combien
 * de sachets : un schéma d'aide ne récite pas la réponse, il montre la
 * situation et laisse compter.
 *
 * Les largeurs sont PROPORTIONNELLES aux quantités : le reste est donc plus
 * étroit qu'un paquet, et il se voit qu'il n'a pas de quoi en faire un.
 */
function groupes(s) {
    const W = 600, MG = 20, bandeW = W - 2 * MG;
    const inconnu = s.par === '?';                       // partage : le contenu est cherché
    const reste = Number(s.reste) > 0 ? Number(s.reste) : 0;
    const nomGroupes = s.nomGroupes || `${s.nomGroupe}s`;

    // Une tranche par paquet, plus celle du reste. Toutes dessinées : aucun
    // « et n de plus », c'est le nombre de tranches qui porte le sens.
    const tranches = [];
    for (let i = 0; i < s.n; i++) tranches.push({ v: inconnu ? '?' : s.par, poids: inconnu ? 1 : s.par });
    if (reste) {
        // Un reste de 1 pour des paquets de 9 donnerait une lamelle de six
        // pixels, où le chiffre déborde. On lui garde donc un minimum de
        // largeur : il reste très visiblement plus étroit qu'un paquet — ce
        // qui est tout ce que le dessin doit faire comprendre —, mais on peut
        // le lire.
        tranches.push({ v: reste, poids: Math.max(reste, s.par * 0.34), reste: true });
    }
    const somme = tranches.reduce((a, t) => a + t.poids, 0) || 1;

    const BY = 52, BH = 58;                               // la bande
    const H = 142;
    let x = MG, cases = '', premiere = null, celluleReste = null;
    for (const t of tranches) {
        const w = bandeW * t.poids / somme;
        const wi = Math.max(6, w - 4);                    // 4 px de jour entre deux paquets
        const police = Math.round(Math.min(23, Math.max(10, wi * 0.5)));
        cases += `<rect x="${x + 2}" y="${BY}" width="${wi}" height="${BH}" rx="9"
                        fill="${t.reste ? '#fef2f2' : '#ecfdf5'}"
                        stroke="${t.reste ? '#dc2626' : '#10b981'}" stroke-width="2.5" />
                  <text x="${x + 2 + wi / 2}" y="${BY + BH / 2 + police * 0.36}" text-anchor="middle"
                        fill="${t.reste ? '#991b1b' : '#065f46'}" font-size="${police}"
                        font-weight="800">${esc(t.v)}</text>`;
        if (premiere === null) premiere = x + 2 + wi / 2;
        if (t.reste) celluleReste = x + 2 + wi / 2;
        x += w;
    }

    // L'accolade du haut : le TOUT. En pointillés quand c'est lui qu'on cherche.
    const tout = s.total != null ? `${esc(s.total)} en tout` : '? en tout';
    const accolade = `
        <path d="M${MG} ${BY - 6} V38 H${W - MG} V${BY - 6}" fill="none" stroke="#334155"
              stroke-width="2.5" stroke-dasharray="${s.total != null ? '0' : '7 5'}" />
        <text x="${W / 2}" y="30" text-anchor="middle" fill="#334155"
              font-size="17" font-weight="800">${tout}</text>`;

    // La légende du bas nomme ce qu'est UNE case — sans quoi on ne sait pas si
    // le nombre écrit dedans compte les paquets ou ce qu'ils contiennent.
    const sousPremiere = `<text x="${premiere}" y="${BY + BH + 22}" text-anchor="middle"
              fill="#64748b" font-size="13">1 ${esc(s.nomGroupe)}</text>`;
    const sousReste = celluleReste != null
        ? `<text x="${celluleReste}" y="${BY + BH + 22}" text-anchor="middle"
                 fill="#dc2626" font-size="13" font-weight="700">reste</text>`
        : '';

    // Le titre dit la situation, jamais la réponse : quand le nombre de
    // paquets EST la question, il n'apparaît pas ici.
    let titre;
    if (reste) titre = `des ${esc(nomGroupes)} de ${esc(s.par)} ${esc(s.nomObjet)}`;
    else if (inconnu) titre = `${esc(s.total)} ${esc(s.nomObjet)} à partager entre ${esc(s.n)} ${esc(nomGroupes)}`;
    else titre = `${esc(s.n)} ${esc(nomGroupes)} de ${esc(s.par)} ${esc(s.nomObjet)}`;

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schéma de groupes égaux, en ligne">
        <text x="${MG}" y="14" fill="#64748b" font-size="13">${titre}</text>
        ${accolade}
        ${cases}
        ${sousPremiere}
        ${sousReste}
    </svg>`;
}

/** Le tableau de proportionnalité, avec la ligne de l'unité au milieu. */
function tableau(s) {
    const W = 600, hL = 46;
    const H = hL * (s.lignes.length + 1) + 16;
    let g = `<rect x="20" y="8" width="${W - 40}" height="${hL}" rx="8" fill="#e0e7ff" />`;
    s.entetes.forEach((t, i) => {
        g += `<text x="${20 + (W - 40) * (i + .5) / 2}" y="${8 + hL / 2 + 7}" text-anchor="middle"
                    fill="#312e81" font-size="17" font-weight="800">${esc(t)}</text>`;
    });
    s.lignes.forEach((l, r) => {
        const y = 8 + hL * (r + 1);
        const unite = l[0] === 1;
        g += `<rect x="20" y="${y}" width="${W - 40}" height="${hL}" rx="8"
                    fill="${unite ? '#fef3c7' : '#f8fafc'}" stroke="${unite ? '#f59e0b' : '#e2e8f0'}" stroke-width="2" />`;
        l.forEach((c, i) => {
            g += `<text x="${20 + (W - 40) * (i + .5) / 2}" y="${y + hL / 2 + 7}" text-anchor="middle"
                        fill="#334155" font-size="18" font-weight="${unite ? 800 : 600}">${esc(c)}</text>`;
        });
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tableau de proportionnalité">${g}</svg>`;
}

/** Une barre coupée en parts égales, dont on colorie celles qu'on prend. */
function fractionBarre(s) {
    const W = 600, H = 110;
    const w = (W - 40) / s.den;
    let g = '';
    for (let i = 0; i < s.den; i++) {
        g += `<rect x="${20 + i * w}" y="30" width="${w}" height="52" rx="6"
                    fill="${i < s.num ? '#6366f1' : '#e2e8f0'}" stroke="#fff" stroke-width="3" />
              <text x="${20 + i * w + w / 2}" y="63" text-anchor="middle"
                    fill="${i < s.num ? '#fff' : '#64748b'}" font-size="16" font-weight="700">${esc(s.par)}</text>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schéma de fraction">
        <text x="20" y="20" fill="#64748b" font-size="13">${esc(s.total)} partagé en ${esc(s.den)} parts égales de ${esc(s.par)}</text>
        ${g}
        <text x="20" y="102" fill="#312e81" font-size="15" font-weight="800">on en prend ${esc(s.num)}</text>
    </svg>`;
}

/** Une ligne du temps : la seule façon honnête de montrer une durée. */
function ligne(s) {
    const W = 600, H = 105;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ligne du temps">
        <line x1="40" y1="70" x2="${W - 40}" y2="70" stroke="#94a3b8" stroke-width="3" />
        <circle cx="80" cy="70" r="8" fill="#6366f1" />
        <circle cx="${W - 80}" cy="70" r="8" fill="#6366f1" />
        <text x="80" y="98" text-anchor="middle" fill="#334155" font-size="16" font-weight="800">${esc(s.debut)}</text>
        <text x="${W - 80}" y="98" text-anchor="middle" fill="#334155" font-size="16" font-weight="800">${esc(s.fin)}</text>
        <path d="M80 62 Q ${W / 2} 6 ${W - 80} 62" fill="none" stroke="#f59e0b" stroke-width="3.5" />
        <path d="M${W - 94} 52 L${W - 76} 64 L${W - 96} 68 Z" fill="#f59e0b" />
        <text x="${W / 2}" y="26" text-anchor="middle" fill="#92400e" font-size="17" font-weight="800">${esc(s.saut)}</text>
    </svg>`;
}

/** Deux étapes empilées : la donnée manquante se fabrique, puis on conclut. */
function etapes(s) {
    const W = 600, hL = 62;
    const H = s.lignes.length * (hL + 12) + 8;
    const g = s.lignes.map((l, i) => {
        const y = 8 + i * (hL + 12);
        return `<rect x="20" y="${y}" width="${W - 40}" height="${hL}" rx="12"
                      fill="${i === 0 ? '#eef2ff' : '#fef3c7'}"
                      stroke="${i === 0 ? '#6366f1' : '#f59e0b'}" stroke-width="2.5" />
                <text x="36" y="${y + 24}" fill="#64748b" font-size="13" font-weight="700">${esc(l.titre)}</text>
                <text x="36" y="${y + 49}" fill="#334155" font-size="19" font-weight="800">${esc(l.calcul)}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schéma en deux étapes">${g}</svg>`;
}

