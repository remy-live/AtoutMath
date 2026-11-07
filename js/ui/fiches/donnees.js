// LES PROBABILITÉS SUR LE PAPIER — le sac et la roue, dessinés.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, carnet du 24 octobre : « Je trouve que tu pourrais faire des
// illustrations avec des roues de couleurs, des urnes etc. » Elles ont été
// faites — À L'ÉCRAN. La feuille, elle, n'imprimait que du texte : « Une roue
// de loterie est partagée en 9 secteurs TOUS DE MÊME TAILLE : 5 sont verts et
// 4 sont bleus. » L'élève qui travaille sur papier devait se représenter la
// roue dans sa tête, c'est-à-dire faire exactement le travail que le dessin
// existe pour lui épargner.
//
// ── POURQUOI UNE GRILLE, ET PAS UNE LIGNE DE QUESTION ──────────────────────
//
// L'exercice s'imprimait par la fiche de QUESTIONS — une ligne d'énoncé, des
// pointillés dessous. Ce chemin-là ne sait pas porter de dessin, et lui
// apprendre à le faire toucherait les cinquante exercices qui l'empruntent.
// On passe donc par une GRILLE DE BLOCS, le même mécanisme que « Lis la
// fraction » : chaque bloc porte son énoncé, sa figure quand il y en a une, et
// la fraction à remplir.
//
// ET LES SEPT MARCHES PASSENT PAR LÀ, pas seulement les deux qui dessinent.
// Un bloc sans figure n'est pas un bloc vide : c'est le même bloc avec plus de
// place pour son texte. Séparer les marches dessinées des autres aurait donné
// deux feuilles à une seule séance.
//
// ── CE QUI CHANGE ENTRE L'ÉCRAN ET LA PHOTOCOPIEUSE ────────────────────────
//
// À l'écran, les boules sont rouges et bleues, et c'est ainsi qu'on les
// sépare. Une feuille passe à la photocopieuse : le rouge et le bleu y
// deviennent deux gris très proches, et le dessin ne dit plus rien — pire,
// il dit quelque chose de FAUX, puisqu'on croit compter deux groupes alors
// qu'on en voit un seul.
//
// C'est la règle de la maison, et elle vaut ici comme ailleurs : la couleur
// ajoute du confort, elle ne porte jamais l'information seule. En noir et
// blanc, les favorables sont PLEINS et les autres VIDES, avec leur contour.
// On les compte alors sans couleur du tout — et c'est compter qui est tout
// l'exercice.

import { boiteDe, ENCRE, echapperSheet } from './socle.js';
// `TRAIT` VIENT DU MODULE D'ENCRE, et on ne le redéclare pas : deux
// déclarations du même nom, c'est un lecteur qui cherche `TRAIT` et qui en
// trouve deux. `tests/fichesDecoupe` le garde, et il a rougi sur ce
// fichier-ci le jour où il est né.
import { TRAIT } from './encre.js';
import { polycopieEnVraieCouleur, pourPdf } from '../ficheRendu.js';

/** Un hexadécimal « #rrggbb » en [r, v, b]. */
function rvb(hex) {
    const h = String(hex || '#cbd5e1').replace('#', '');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) || 0);
}

/**
 * LES DEUX ENCRES D'UN DESSIN, SELON LA FEUILLE QU'ON TIENT.
 *
 * En couleur, celles du générateur — l'élève retrouve le dessin de l'écran.
 * En noir et blanc, un plein et un vide : voir l'en-tête.
 */
function encresDuDessin(d) {
    if (polycopieEnVraieCouleur()) {
        return { a: rvb(d.couleurA), b: rvb(d.couleurB), traitA: TRAIT, traitB: TRAIT };
    }
    return { a: [55, 65, 81], b: [255, 255, 255], traitA: TRAIT, traitB: TRAIT };
}

/**
 * LE PLAN D'UN BLOC — en millimètres, dans la boîte que le gabarit donne.
 *
 * Trois bandes du haut vers le bas : le texte, la figure, la réponse. La
 * figure prend ce qui reste, et rien quand il n'y en a pas — c'est ce qui
 * permet aux sept marches de tenir dans le même bloc.
 */
function plan(item, slot) {
    const m = item.meta || {};
    const b = boiteDe(slot);
    const marge = 2;
    const dessin = m.dessin || null;
    // LA RÉPONSE EN BAS, ET SA HAUTEUR DÉPEND DE CE QU'ON DEMANDE : deux cases
    // et un trait pour une fraction, une ligne pour tout le reste.
    const fraction = m.cases === 2;
    const repH = fraction ? Math.min(22, b.h * 0.30) : 9;
    const taille = Math.max(2.4, Math.min(3.4, b.w * 0.033));
    const dispo = b.h - repH - marge * 2;
    // LA RÉPONSE SUIT LE TEXTE QUAND IL N'Y A PAS DE FIGURE.
    //
    // Tous les blocs d'une feuille ont la MÊME hauteur — c'est la grille qui
    // la donne, et il le faut : des blocs inégaux ne s'alignent plus. Or les
    // sept marches ne demandent pas la même place : deux dessinent, cinq non.
    // Collée au bas du bloc, la ligne de réponse d'une marche sans figure se
    // retrouvait à quatre centimètres sous son énoncé, au milieu d'un grand
    // vide. MESURÉ sur la feuille de six questions : deux lignes de texte,
    // puis 42 mm de blanc, puis le trait.
    //
    // Elle se pose donc SOUS LE TEXTE, et le blanc reste en bas du bloc — là
    // où il ne sépare rien.
    const texteH = dessin
        ? Math.min(dispo, b.h * 0.34)
        : Math.min(dispo, taille * 1.28 * 4.2);
    const figH = dessin ? Math.max(0, dispo - texteH) : 0;
    const repY = dessin ? b.y + b.h - marge - repH : b.y + marge + texteH;
    return {
        m, b, dessin, fraction,
        marge,
        texte: { x: b.x + marge, y: b.y + marge, w: b.w - marge * 2, h: texteH },
        fig: { x: b.x + marge, y: b.y + marge + texteH, w: b.w - marge * 2, h: figH },
        rep: { x: b.x + marge, y: repY, w: b.w - marge * 2, h: repH },
        // LA TAILLE DU TEXTE EST BORNÉE DES DEUX CÔTÉS. Sous 2,4 mm un énoncé
        // de quatre lignes ne se lit plus ; au-dessus de 3,4 mm il ne tient
        // plus dans un bloc de demi-page.
        taille
    };
}

/**
 * LA RÉPONSE, ÉCRITE EN FRANÇAIS.
 *
 * REGARDÉ sur la page de corrigé : l'énoncé disait « la probabilité est de
 * 0,4 » et la réponse en dessous « 0.6 ». Le point décimal vient du nombre tel
 * que le générateur le range pour la COMPARAISON — c'est juste pour lui, et
 * faux sur une feuille de mathématiques en français, à deux centimètres d'une
 * virgule.
 *
 * ON NE TOUCHE QU'À UN NOMBRE : « B », « certain », « impossible » passent
 * intacts, et une réponse qui n'est pas un nombre n'a pas de virgule à poser.
 */
function reponseLisible(brut) {
    const t = String(brut == null ? '' : brut).trim();
    return /^-?\d+\.\d+$/.test(t) ? t.replace('.', ',') : t;
}

/** L'énoncé entier, question comprise, tel qu'on l'écrit sur la feuille. */
function texteDuBloc(item) {
    const p = item.prompt || {};
    return String(p.papier || p.text || '').trim();
}

// ── LE SAC ─────────────────────────────────────────────────────────────────
//
// LES BOULES SONT RANGÉES, quatre par rangée, comme à l'écran : un sac de
// douze boules jetées au hasard se recompte trois fois avant que l'élève soit
// sûr de son dénominateur, et c'est le dénominateur qui se trompe le plus
// souvent dans ce chapitre.

/** Les ronds du sac, en millimètres, et le contour du sac autour. */
export function plantDuSac(d, zone) {
    const total = d.favorables + d.autres;
    const parRangee = 4;
    const rangees = Math.ceil(total / parRangee);
    // Le pas tient compte des DEUX contraintes : la largeur disponible pour
    // quatre ronds, et la hauteur pour le nombre de rangées, col du sac
    // compris.
    const pas = Math.min(zone.w / (parRangee + 1.4), zone.h / (rangees + 1.5));
    const r = pas * 0.38;
    const largeurSac = pas * (parRangee + 0.9);
    const hautSac = pas * (rangees + 1.1);
    const x0 = zone.x + (zone.w - largeurSac) / 2;
    const y0 = zone.y + (zone.h - hautSac) / 2;
    const ronds = [];
    for (let k = 0; k < total; k++) {
        const ligne = Math.floor(k / parRangee);
        const dansLaLigne = Math.min(parRangee, total - ligne * parRangee);
        const col = k % parRangee;
        ronds.push({
            x: x0 + largeurSac / 2 - (dansLaLigne - 1) * pas / 2 + col * pas,
            y: y0 + pas * 0.95 + ligne * pas,
            r, plein: k < d.favorables
        });
    }
    return { ronds, x0, y0, w: largeurSac, h: hautSac, pas };
}

// ── LA ROUE ────────────────────────────────────────────────────────────────
//
// TOUS LES SECTEURS ONT LA MÊME OUVERTURE, et c'est le fond du sujet : la
// règle « cas favorables sur cas possibles » ne vaut QUE si toutes les issues
// ont la même chance. L'énoncé le dit ; le dessin doit le montrer.
//
// ET LA ROUE EST TOURNÉE D'UN DEMI-SECTEUR, comme à l'écran : sans ce
// décalage, le haut tombe sur la coupe entre deux secteurs et la flèche
// semble désigner un trait.

export function plantDeLaRoue(d, zone) {
    const total = d.favorables + d.autres;
    const R = Math.min(zone.w, zone.h - 2) / 2 * 0.92;
    const cx = zone.x + zone.w / 2;
    const cy = zone.y + 2 + (zone.h - 2) / 2;
    const depart = -Math.PI / 2 - Math.PI / total;
    const secteurs = [];
    for (let k = 0; k < total; k++) {
        const a1 = depart + (2 * Math.PI * k) / total;
        const a2 = depart + (2 * Math.PI * (k + 1)) / total;
        secteurs.push({ a1, a2, plein: k < d.favorables });
    }
    return { cx, cy, R, secteurs, total };
}

/**
 * Les points d'un secteur, assez serrés pour que l'arc ne se voie pas brisé.
 *
 * `…DeLaRoue` et non `pointsDuSecteur` tout court : `fiches/nombres.js` a déjà
 * une fonction de ce nom pour les camemberts de fractions, et deux copies
 * d'une même idée divergent au premier réglage.
 */
function pointsDuSecteurDeLaRoue(g, s) {
    const pas = Math.max(3, Math.ceil((s.a2 - s.a1) / 0.18));
    const pts = [[g.cx, g.cy]];
    for (let i = 0; i <= pas; i++) {
        const a = s.a1 + (s.a2 - s.a1) * (i / pas);
        pts.push([g.cx + g.R * Math.cos(a), g.cy + g.R * Math.sin(a)]);
    }
    pts.push([g.cx, g.cy]);
    return pts;
}

// ── LE PDF ─────────────────────────────────────────────────────────────────

function dessinerProbabilitesPdf(doc, item, slot, solution, champ) {
    const g = plan(item, slot);

    // 1 · L'ÉNONCÉ, question comprise.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(g.taille * 2.83);
    doc.setTextColor(...TRAIT);
    const interligne = g.taille * 1.28;
    const lignes = doc.splitTextToSize(pourPdf(texteDuBloc(item)), g.texte.w);
    // ON NE DÉBORDE PAS SUR LA FIGURE : au-delà de ce qui tient, le texte
    // serait écrit PAR-DESSUS le dessin, ce qui rend les deux illisibles.
    const combien = Math.max(1, Math.floor(g.texte.h / interligne));
    lignes.slice(0, combien).forEach((l, i) => {
        doc.text(l, g.texte.x, g.texte.y + interligne * (i + 0.8));
    });

    // 2 · LA FIGURE, s'il y en a une.
    if (g.dessin && g.fig.h > 6) {
        const e = encresDuDessin(g.dessin);
        doc.setLineWidth(0.35);
        if (g.dessin.forme === 'sac') {
            const s = plantDuSac(g.dessin, g.fig);
            // LE SAC : deux montants, un fond arrondi, une barre au col. Il
            // n'est pas décoratif — c'est lui qui dit que les boules sont
            // ENSEMBLE, donc que le total est le total.
            doc.setDrawColor(...TRAIT);
            doc.setLineWidth(0.5);
            const gche = s.x0 + s.pas * 0.25, drte = s.x0 + s.w - s.pas * 0.25;
            const bas = s.y0 + s.h - s.pas * 0.15;
            doc.line(gche, s.y0 + s.pas * 0.35, gche, bas - s.pas * 0.25);
            doc.line(drte, s.y0 + s.pas * 0.35, drte, bas - s.pas * 0.25);
            doc.line(gche, bas - s.pas * 0.25, gche + s.pas * 0.25, bas);
            doc.line(drte, bas - s.pas * 0.25, drte - s.pas * 0.25, bas);
            doc.line(gche + s.pas * 0.25, bas, drte - s.pas * 0.25, bas);
            doc.line(s.x0, s.y0 + s.pas * 0.35, s.x0 + s.w, s.y0 + s.pas * 0.35);
            doc.setLineWidth(0.35);
            for (const b of s.ronds) {
                doc.setFillColor(...(b.plein ? e.a : e.b));
                doc.setDrawColor(...TRAIT);
                doc.circle(b.x, b.y, b.r, 'FD');
            }
        } else {
            const w = plantDeLaRoue(g.dessin, g.fig);
            for (const s of w.secteurs) {
                const pts = pointsDuSecteurDeLaRoue(w, s);
                const suite = pts.slice(1).map(([px, py], j) => [px - pts[j][0], py - pts[j][1]]);
                doc.setFillColor(...(s.plein ? e.a : e.b));
                doc.setDrawColor(...TRAIT);
                doc.lines(suite, pts[0][0], pts[0][1], [1, 1], 'FD', true);
            }
            // LA FLÈCHE EST UN REPÈRE, PAS UN RÉSULTAT : elle montre où l'on
            // lit, et elle pointe toujours vers le haut. Posée sur un secteur
            // coloré, elle laisserait croire que la roue s'est arrêtée.
            doc.setFillColor(...TRAIT);
            doc.setDrawColor(...TRAIT);
            doc.circle(w.cx, w.cy, Math.max(0.7, w.R * 0.09), 'F');
            const fh = Math.max(1.6, w.R * 0.22);
            doc.lines([[-fh * 0.6, fh], [fh * 1.2, 0], [-fh * 0.6, -fh]],
                w.cx, w.cy - w.R - fh * 0.2, [1, 1], 'F', true);
        }
    }

    // 3 · LA RÉPONSE.
    const r = g.rep;
    if (g.fraction) {
        // DEUX CASES ET UN TRAIT, comme à l'écran : la fraction s'écrit en
        // colonne, et c'est la seule façon de voir qu'on remplit DEUX nombres.
        const c = Math.min(r.h * 0.42, r.w * 0.18, 9);
        const x = r.x + r.w / 2;
        const haut = r.y + (r.h - c * 2.3) / 2;
        const rep = solution ? String(item.answer || '').split('|') : ['', ''];
        [0, 1].forEach((i) => {
            const cy = haut + i * c * 1.3;
            doc.setDrawColor(...ENCRE.grille);
            doc.setFillColor(255, 255, 255);
            doc.setLineWidth(0.3);
            doc.rect(x - c / 2, cy, c, c, 'FD');
            if (solution && rep[i]) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(c * 2.0);
                doc.setTextColor(...TRAIT);
                doc.text(String(rep[i]), x, cy + c * 0.72, { align: 'center' });
                doc.setFont('helvetica', 'normal');
            } else if (champ) {
                champ(x - c / 2 + 0.3, cy + 0.3, c - 0.6, c - 0.6);
            }
        });
        doc.setDrawColor(...TRAIT);
        doc.setLineWidth(0.5);
        doc.line(x - c * 0.78, haut + c * 1.13, x + c * 0.78, haut + c * 1.13);
        return;
    }
    // UNE LIGNE, pour les marches qui demandent un mot — « certain »,
    // « impossible », « le sac A ». On ne propose pas les réponses : les lire
    // sur la feuille, c'est répondre sans compter.
    const y = r.y + r.h * 0.72;
    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.3);
    doc.line(r.x + r.w * 0.12, y, r.x + r.w * 0.88, y);
    if (solution) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille * 2.83);
        doc.setTextColor(...TRAIT);
        doc.text(pourPdf(reponseLisible(item.answer)), r.x + r.w / 2, y - 0.8, { align: 'center' });
        doc.setFont('helvetica', 'normal');
    } else if (champ) {
        champ(r.x + r.w * 0.12, y - r.h * 0.5, r.w * 0.76, r.h * 0.5);
    }
}

// ── L'APERÇU ───────────────────────────────────────────────────────────────
//
// IL REDESSINE LA MÊME GÉOMÉTRIE, et non le SVG de l'écran. C'est ce qui
// garantit que l'aperçu montre la FEUILLE : un aperçu tiré d'une autre source
// se met à diverger du PDF sans que rien ne le dise, et c'est la feuille
// imprimée qui a raison.

function probabilitesPreviewHtml(item, slot, k, solution) {
    const g = plan(item, slot);
    const mm = (v) => (v * k).toFixed(2);
    const e = encresDuDessin(g.dessin || {});
    const col = (c) => `rgb(${c.join(',')})`;
    let d = '';

    if (g.dessin && g.fig.h > 6) {
        if (g.dessin.forme === 'sac') {
            const s = plantDuSac(g.dessin, g.fig);
            const gche = s.x0 + s.pas * 0.25, drte = s.x0 + s.w - s.pas * 0.25;
            const bas = s.y0 + s.h - s.pas * 0.15;
            d += `<path d="M ${mm(gche)} ${mm(s.y0 + s.pas * 0.35)} L ${mm(gche)} ${mm(bas - s.pas * 0.25)}
                L ${mm(gche + s.pas * 0.25)} ${mm(bas)} L ${mm(drte - s.pas * 0.25)} ${mm(bas)}
                L ${mm(drte)} ${mm(bas - s.pas * 0.25)} L ${mm(drte)} ${mm(s.y0 + s.pas * 0.35)}"
                fill="none" stroke="${col(TRAIT)}" stroke-width="${mm(0.5)}" stroke-linejoin="round"/>
                <line x1="${mm(s.x0)}" y1="${mm(s.y0 + s.pas * 0.35)}" x2="${mm(s.x0 + s.w)}"
                y2="${mm(s.y0 + s.pas * 0.35)}" stroke="${col(TRAIT)}" stroke-width="${mm(0.5)}"/>`;
            for (const b of s.ronds) {
                d += `<circle cx="${mm(b.x)}" cy="${mm(b.y)}" r="${mm(b.r)}"
                    fill="${col(b.plein ? e.a : e.b)}" stroke="${col(TRAIT)}"
                    stroke-width="${mm(0.35)}"/>`;
            }
        } else {
            const w = plantDeLaRoue(g.dessin, g.fig);
            for (const s of w.secteurs) {
                const pts = pointsDuSecteurDeLaRoue(w, s);
                d += `<path d="M ${pts.map(([px, py]) => `${mm(px)} ${mm(py)}`).join(' L ')} Z"
                    fill="${col(s.plein ? e.a : e.b)}" stroke="${col(TRAIT)}"
                    stroke-width="${mm(0.35)}" stroke-linejoin="round"/>`;
            }
            const fh = Math.max(1.6, w.R * 0.22);
            d += `<circle cx="${mm(w.cx)}" cy="${mm(w.cy)}" r="${mm(Math.max(0.7, w.R * 0.09))}"
                fill="${col(TRAIT)}"/>
                <path d="M ${mm(w.cx)} ${mm(w.cy - w.R - fh * 0.2)}
                L ${mm(w.cx - fh * 0.6)} ${mm(w.cy - w.R + fh * 0.8)}
                L ${mm(w.cx + fh * 0.6)} ${mm(w.cy - w.R + fh * 0.8)} Z" fill="${col(TRAIT)}"/>`;
        }
    }

    const r = g.rep;
    if (g.fraction) {
        const c = Math.min(r.h * 0.42, r.w * 0.18, 9);
        const x = r.x + r.w / 2;
        const haut = r.y + (r.h - c * 2.3) / 2;
        const rep = solution ? String(item.answer || '').split('|') : ['', ''];
        [0, 1].forEach((i) => {
            const cy = haut + i * c * 1.3;
            d += `<rect x="${mm(x - c / 2)}" y="${mm(cy)}" width="${mm(c)}" height="${mm(c)}"
                fill="#fff" stroke="${col(ENCRE.grille)}" stroke-width="${mm(0.3)}"/>`;
            if (solution && rep[i]) {
                d += `<text x="${mm(x)}" y="${mm(cy + c * 0.74)}" text-anchor="middle"
                    font-family="Helvetica, Arial, sans-serif" font-weight="700"
                    font-size="${mm(c * 0.7)}" fill="${col(TRAIT)}">${echapperSheet(rep[i])}</text>`;
            }
        });
        d += `<line x1="${mm(x - c * 0.78)}" y1="${mm(haut + c * 1.13)}" x2="${mm(x + c * 0.78)}"
            y2="${mm(haut + c * 1.13)}" stroke="${col(TRAIT)}" stroke-width="${mm(0.5)}"/>`;
    } else {
        const y = r.y + r.h * 0.72;
        d += `<line x1="${mm(r.x + r.w * 0.12)}" y1="${mm(y)}" x2="${mm(r.x + r.w * 0.88)}"
            y2="${mm(y)}" stroke="${col(ENCRE.grille)}" stroke-width="${mm(0.3)}"/>`;
        if (solution) {
            d += `<text x="${mm(r.x + r.w / 2)}" y="${mm(y - 0.8)}" text-anchor="middle"
                font-family="Helvetica, Arial, sans-serif" font-weight="700"
                font-size="${mm(g.taille)}" fill="${col(TRAIT)}">${
    echapperSheet(reponseLisible(item.answer))}</text>`;
        }
    }

    // LE TEXTE EST DU HTML POSÉ À CÔTÉ DU SVG, et non du `<text>` dedans : il
    // se coupe tout seul en lignes, exactement comme `splitTextToSize` le fait
    // dans le PDF. Un `<text>` SVG ne se coupe pas, et l'énoncé sortirait du
    // bloc par la droite.
    //
    // ET L'APERÇU REND UNE SEULE CHAÎNE : c'est le contrat de `previewGrille`,
    // dont l'appelant écrit `html += r.previewGrille(...)`. Rendre un objet
    // y afficherait « [object Object] » — lu dans `ui/ficheRendu.js` avant
    // d'écrire la ligne, et non après l'avoir vu à l'écran.
    const t = g.texte;
    return `<svg class="fx-abs" style="position:absolute; left:0; top:0; overflow:visible"
        width="1" height="1">${d}</svg>`
        + `<div style="position:absolute; left:${mm(t.x)}px; top:${mm(t.y)}px;
        width:${mm(t.w)}px; height:${mm(t.h)}px; overflow:hidden;
        font-size:${mm(g.taille * 1.05)}px; line-height:1.28;
        color:rgb(${TRAIT.join(',')})">${echapperSheet(texteDuBloc(item))}</div>`;
}

export const RENDUS_DONNEES = {
    probabilites: {
        titre: 'Les probabilités',
        consigne: (items) => {
            const aDesFigures = items.some(i => i.meta && i.meta.dessin);
            return 'Compte les cas FAVORABLES, puis les cas POSSIBLES — tout ce qui peut '
                + 'sortir, l\'objet cherché compris. Écris la probabilité en fraction : le '
                + 'nombre du HAUT est le numérateur, celui du BAS le dénominateur.'
                + (aDesFigures
                    ? (polycopieEnVraieCouleur()
                        ? ' Les dessins montrent la situation : compte dessus.'
                        : ' Sur les dessins, les objets PLEINS sont ceux qu\'on cherche, '
                            + 'les objets VIDES les autres.')
                    : '');
        },
        previewGrille: probabilitesPreviewHtml,
        pdfGrille: dessinerProbabilitesPdf,
        nomBloc: 'Question', nomBlocs: 'questions',
        // SIX PAR PAGE, ET SIX AU MAXIMUM — c'est une mesure, pas un goût.
        //
        // Le plafond vient du DESSIN, et c'est pour cela qu'il est plus bas
        // qu'ailleurs. REGARDÉ sur la feuille à douze : le sac de onze jetons
        // tient dans dix millimètres de large, ses jetons font deux
        // millimètres, et on ne les compte plus. Or compter les cas est tout
        // l'exercice — une feuille où l'on ne compte pas n'est pas une feuille
        // de probabilités, c'est une feuille de lecture.
        //
        // À six, le même sac fait trois centimètres et ses jetons six
        // millimètres : on les compte du premier coup d'œil.
        // LE BLANC SOUS UNE QUESTION SANS DESSIN N'EST PAS UNE PERTE.
        //
        // On a essayé de le reprendre — une proportion plus basse quand rien
        // ne dessine — et c'était se tromper de problème : le blanc ne vient
        // pas de la forme du bloc mais du NOMBRE de blocs, que le professeur
        // choisit. Six questions courtes sur une A4 laissent de la place, quoi
        // qu'on fasse de la forme.
        //
        // Et cette place sert : une probabilité se compte, et l'on compte au
        // crayon, sous l'énoncé. C'est pour cela que la ligne de réponse est
        // posée JUSTE SOUS LE TEXTE et non au bas du bloc — le blanc reste
        // alors en dessous, là où la main écrit, au lieu de séparer l'énoncé
        // de sa réponse.
        proportions: { w: 1, h: 1.05 },
        disposition: { cols: 3, rows: 2, maxCols: 3, maxRows: 2 },
        // ET LE PLAFOND DE SIX EST UN PLAFOND PAR PAGE, PAS PAR FEUILLE.
        //
        // MESURÉ avant de poser cette ligne : on demandait douze questions, et
        // la feuille en rendait six sans un mot — `plafond` vaut
        // `capaciteMax(disposition)` tant qu'un rendu ne se dit pas
        // paginable. Un chapitre de probabilités en six questions, ce n'est
        // pas un chapitre ; et un réglage qui se fait rogner en silence est
        // pire qu'un réglage absent.
        plusieursPages: true,
        parLigneDefaut: 3
    }
};
