// L'atelier de blocs : le vrai Scratch, encoches comprises.
//
// Une liste de blocs alignés n'est pas du Scratch. Ce qui fait Scratch, c'est
// la FORME : des pièces à tenon et mortaise qui s'attirent, une bouche de
// boucle qui s'ouvre pour accueillir ce qu'on y pose, et un programme qu'on
// construit en tirant des pièces plutôt qu'en remplissant un formulaire.
//
// Ce module ne contient donc que de la géométrie de pièces et de la mécanique
// d'aimantation. Il ne connaît ni la scène, ni le chat, ni la notation : il
// rend un arbre de blocs, l'activité le convertit en programme.
//
// Le tracé des encoches et le principe de l'aimantation viennent du moteur
// fourni ; la saisie est réécrite en ÉVÉNEMENTS POINTEUR (le moteur d'origine
// n'écoutait que la souris : rien ne bougeait au doigt), les nombres passent
// par un pavé tactile plutôt qu'un champ qui appelle le clavier système, et
// les mesures sont faites dans le repère du SVG pour rester justes quel que
// soit le zoom de la page.

const SVGNS = 'http://www.w3.org/2000/svg';

// Le tenon et la mortaise, repris tels quels : c'est cette silhouette-là qu'on
// reconnaît au premier coup d'œil.
const TENON = 'c 2,0 3,1 4,2 l 4,4 c 1,1 2,2 4,2 h 12 c 2,0 3,-1 4,-2 l 4,-4 c 1,-1 2,-2 4,-2';
const MORTAISE = 'c -2,0 -3,1 -4,2 l -4,4 c -1,1 -2,2 -4,2 h -12 c -2,0 -3,-1 -4,-2 l -4,-4 c -1,-1 -2,-2 -4,-2';

const R = 4;              // rayon des coins
const MARGE_G = 12;       // retrait du contenu à gauche
const HAUT_LIGNE = 40;    // hauteur d'une pièce simple
const HAUT_CHAPEAU = 46;
const BOUCHE_VIDE = 28;   // hauteur d'une bouche de boucle vide
const BAS_BOUCLE = 24;    // barre inférieure d'une boucle
const RETRAIT = 14;       // décalage horizontal du contenu d'une boucle
const AIMANT = 58;        // distance d'attraction, en pixels d'atelier

const COULEURS = { motion: '#4C97FF', pen: '#0FBD8C', control: '#FFAB19', events: '#FFBF00' };

/** Largeur approchée d'un texte de bloc, sans mesurer dans le DOM. */
function largeurTexte(txt) {
    return String(txt).length * 7.1 + 2;
}

export class Bloc {
    /**
     * @param {Object} modele  { type, cat, libelle, unite, champs: ['valeur'], bouche: bool, chapeau: bool }
     * @param {Object} atelier l'atelier propriétaire (null pour une vignette de palette)
     */
    constructor(modele, atelier, vignette = false) {
        this.modele = modele;
        this.type = modele.type;
        this.atelier = atelier;
        this.vignette = vignette;
        this.valeurs = {};
        (modele.champs || []).forEach(c => { this.valeurs[c] = modele.defauts[c]; });

        this.parent = null;     // pièce à laquelle on est accroché
        this.next = null;       // pièce accrochée dessous
        this.child = null;      // première pièce DANS la bouche
        this.x = 0; this.y = 0;

        this.el = document.createElementNS(SVGNS, 'g');
        this.el.classList.add('sc-piece');
        if (!vignette) this.el.classList.add('sc-piece--vive');
        this.chemin = document.createElementNS(SVGNS, 'path');
        this.chemin.classList.add('sc-piece-forme');
        this.chemin.setAttribute('fill', COULEURS[modele.cat] || '#4C97FF');
        this.contenu = document.createElementNS(SVGNS, 'g');
        this.el.append(this.chemin, this.contenu);
        if (modele.bouche) {
            this.groupeBouche = document.createElementNS(SVGNS, 'g');
            this.el.appendChild(this.groupeBouche);
        }
        this.dessiner();
    }

    // --- Mise en forme ------------------------------------------------------

    dessiner() {
        this.contenu.innerHTML = '';
        let cx = MARGE_G;
        const milieu = (this.modele.chapeau ? HAUT_CHAPEAU : HAUT_LIGNE) / 2
            + (this.modele.chapeau ? 6 : 0);

        const poserTexte = (txt) => {
            const t = document.createElementNS(SVGNS, 'text');
            t.classList.add('sc-piece-texte');
            t.setAttribute('x', cx); t.setAttribute('y', milieu);
            t.textContent = txt;
            this.contenu.appendChild(t);
            cx += largeurTexte(txt) + 7;
        };

        poserTexte(this.modele.libelle);
        (this.modele.champs || []).forEach((champ, i) => {
            if (i > 0) poserTexte(this.modele.entre || '');
            const val = String(this.valeurs[champ]);
            const w = Math.max(30, largeurTexte(val) + 18), h = 26;
            const g = document.createElementNS(SVGNS, 'g');
            g.setAttribute('transform', `translate(${cx}, ${milieu - h / 2})`);
            g.classList.add('sc-piece-champ');
            g.dataset.champ = champ;
            const fond = document.createElementNS(SVGNS, 'path');
            fond.setAttribute('d', gelule(w, h));
            fond.classList.add('sc-piece-champ-fond');
            const t = document.createElementNS(SVGNS, 'text');
            t.classList.add('sc-piece-champ-texte');
            t.setAttribute('x', w / 2); t.setAttribute('y', h / 2);
            t.textContent = val;
            g.append(fond, t);
            this.contenu.appendChild(g);
            cx += w + 7;
        });
        if (this.modele.unite) poserTexte(this.modele.unite);

        this.largeur = Math.max(this.modele.bouche ? 132 : 108, cx - 7 + MARGE_G);
        this.hautLigne = this.modele.chapeau ? HAUT_CHAPEAU : HAUT_LIGNE;

        if (this.modele.bouche) {
            this.hautBouche = this.child ? this.child.hauteurPile() : BOUCHE_VIDE;
            this.groupeBouche.setAttribute('transform', `translate(${RETRAIT}, ${this.hautLigne})`);
            // Le contenu d'une bouche part de son coin : c'est le groupe qui
            // porte le décalage, pas les pièces.
            if (this.child) { this.empiler(this.child, this.groupeBouche); this.child.placer(0, 0); }
        }
        this.tracerForme();
    }

    tracerForme() {
        const w = this.largeur, h = this.hautLigne;
        let d;
        if (this.modele.chapeau) {
            // Le dôme du chapeau : la pièce qui démarre le programme et qu'on
            // ne peut pas décrocher.
            d = `M 0,20 Q 0,0 28,0 H ${w - R} A ${R},${R} 0 0,1 ${w},${R} V ${h - R}`
                + ` A ${R},${R} 0 0,1 ${w - R},${h} H 48 ${MORTAISE} H ${R}`
                + ` A ${R},${R} 0 0,1 0,${h - R} Z`;
            this.hauteur = h;
        } else if (this.modele.bouche) {
            const yb = h + this.hautBouche;
            d = `M 0,${R} A ${R},${R} 0 0,1 ${R},0 H 12 ${TENON} H ${w - R}`
                + ` A ${R},${R} 0 0,1 ${w},${R} V ${h - R} A ${R},${R} 0 0,1 ${w - R},${h}`
                + ` H ${RETRAIT + 48} ${MORTAISE} H ${RETRAIT + R}`
                + ` A ${R},${R} 0 0,0 ${RETRAIT},${h + R}`
                + ` V ${yb - R} A ${R},${R} 0 0,0 ${RETRAIT + R},${yb}`
                + ` H ${RETRAIT + 12} ${TENON} H ${w - R} A ${R},${R} 0 0,1 ${w},${yb + R}`;
            this.hauteur = yb + BAS_BOUCLE;
            d += ` V ${this.hauteur - R} A ${R},${R} 0 0,1 ${w - R},${this.hauteur}`
                + ` H 48 ${MORTAISE} H ${R} A ${R},${R} 0 0,1 0,${this.hauteur - R} Z`;
        } else {
            d = `M 0,${R} A ${R},${R} 0 0,1 ${R},0 H 12 ${TENON} H ${w - R}`
                + ` A ${R},${R} 0 0,1 ${w},${R} V ${h - R} A ${R},${R} 0 0,1 ${w - R},${h}`
                + ` H 48 ${MORTAISE} H ${R} A ${R},${R} 0 0,1 0,${h - R} Z`;
            this.hauteur = h;
        }
        this.chemin.setAttribute('d', d);
    }

    placer(x, y) {
        this.x = x; this.y = y;
        this.el.setAttribute('transform', `translate(${x},${y})`);
        if (this.next) this.next.placer(x, y + this.hauteur);
    }

    hauteurPile() {
        return this.hauteur + (this.next ? this.next.hauteurPile() : 0);
    }

    /**
     * Déplace une pile entière dans un autre groupe SVG.
     *
     * Ne touche PAS aux coordonnées : c'est l'appelant qui sait où la pile
     * doit atterrir. Une version antérieure la remettait d'office en (0,0),
     * ce qui était juste pour une bouche de boucle mais faussait la prise en
     * main — au premier mouvement, la pièce sautait loin du doigt, avec un
     * décalage égal à la distance entre la palette et l'atelier.
     */
    empiler(premier, groupe) {
        let b = premier;
        while (b) { groupe.appendChild(b.el); b = b.next; }
    }

    /** Recalcule la forme puis répercute vers le haut : une bouche grandit. */
    remonterMiseEnForme() {
        this.dessiner();
        if (this.next) this.next.placer(this.x, this.y + this.hauteur);
        if (this.parent) this.parent.remonterMiseEnForme();
        else this.placer(this.x, this.y);
    }

    /** Racine de la pile à laquelle appartient cette pièce. */
    racine() {
        let b = this;
        while (b.parent) b = b.parent;
        return b;
    }

    /** Vrai si `autre` est quelque part sous cette pièce (bouche comprise). */
    contient(autre) {
        if (this === autre) return true;
        if (this.next && this.next.contient(autre)) return true;
        if (this.child && this.child.contient(autre)) return true;
        return false;
    }

    /** Position absolue dans l'atelier, en remontant les parents. */
    positionAbsolue() {
        let x = 0, y = 0, b = this;
        while (b) {
            if (b.parent && b.parent.child === b) { x += b.parent.xAbs() + RETRAIT; y += b.parent.yAbs() + b.parent.hautLigne; break; }
            if (b.parent && b.parent.next === b) { y += b.parent.hauteur; b = b.parent; continue; }
            x += b.x; y += b.y; break;
        }
        return { x, y };
    }

    xAbs() { return this.positionAbsolue().x; }
    yAbs() { return this.positionAbsolue().y; }
}

/** Gélule blanche d'un champ numérique. */
function gelule(w, h) {
    const r = h / 2;
    return `M ${r},0 H ${w - r} A ${r},${r} 0 0 1 ${w},${r} A ${r},${r} 0 0 1 ${w - r},${h}`
        + ` H ${r} A ${r},${r} 0 0 1 0,${r} A ${r},${r} 0 0 1 ${r},0 Z`;
}

// --- L'atelier ---------------------------------------------------------------

export class Atelier {
    /**
     * @param {HTMLElement} hote       conteneur de l'atelier
     * @param {HTMLElement} palette    conteneur de la palette (sert de corbeille)
     * @param {Object} opts { modeles, onChange, onEditerNombre }
     */
    constructor(hote, palette, opts = {}) {
        this.hote = hote;
        this.palette = palette;
        this.modeles = opts.modeles || {};
        this.onChange = opts.onChange || (() => { });
        this.onEditerNombre = opts.onEditerNombre || null;
        this.pieces = [];

        // Échelle des pièces. Une pièce Scratch fait ~110 px de large : sur un
        // téléphone de 390 px, avec la palette à gauche, elle sortirait du
        // cadre. On réduit l'atelier ENTIER plutôt que de raccourcir les
        // libellés — « avancer de 100 pas » doit rester lisible tel quel,
        // c'est le texte que l'élève retrouvera dans Scratch.
        this.k = opts.echelle || 1;

        this.svg = document.createElementNS(SVGNS, 'svg');
        this.svg.classList.add('sc-atelier-svg');
        this.couche = document.createElementNS(SVGNS, 'g');
        this.couche.setAttribute('transform', `scale(${this.k})`);
        this.indicateur = document.createElementNS(SVGNS, 'path');
        this.indicateur.classList.add('sc-aimant');
        this.indicateur.style.display = 'none';
        // L'indicateur vit DANS la couche : posé à côté, il ne suivait pas
        // l'échelle et désignait un point décalé.
        this.couche.appendChild(this.indicateur);
        this.svg.appendChild(this.couche);
        hote.appendChild(this.svg);

        // Le chapeau est POSÉ, pas déposé : il matérialise le début du
        // programme et ne se décroche pas. Sans lui, rien ne dirait laquelle
        // des piles posées dans l'atelier est le programme.
        this.chapeau = new Bloc(this.modeles.chapeau, this);
        this.couche.appendChild(this.chapeau.el);
        this.chapeau.placer(14, 10);
        this.pieces.push(this.chapeau);

        this.brancherChamps();
        if (window.ResizeObserver) {
            this.ro = new ResizeObserver(() => this.dimensionner());
            this.ro.observe(hote);
        }
    }

    /** Coordonnées de la COUCHE (donc à l'échelle des pièces). */
    versAtelier(e) {
        const r = this.svg.getBoundingClientRect();
        return { x: (e.clientX - r.left) / this.k, y: (e.clientY - r.top) / this.k };
    }

    // --- Création et suppression -------------------------------------------

    creer(type, x, y) {
        const bloc = new Bloc(this.modeles[type], this);
        this.couche.appendChild(bloc.el);
        bloc.placer(x, y);
        this.pieces.push(bloc);
        this.brancherPiece(bloc);
        return bloc;
    }

    supprimer(premier) {
        let b = premier;
        while (b) {
            const suivant = b.next;
            b.el.remove();
            this.pieces = this.pieces.filter(p => p !== b);
            if (b.child) this.supprimer(b.child);
            b = suivant;
        }
    }

    /** Vide l'atelier, chapeau excepté, puis pose un programme. */
    charger(script) {
        if (this.chapeau.next) this.supprimer(this.chapeau.next);
        this.chapeau.next = null;
        const premier = this.construire(script);
        if (premier) {
            this.chapeau.next = premier;
            premier.parent = this.chapeau;
            this.chapeau.empiler(this.chapeau, this.couche);
        }
        this.chapeau.dessiner();
        this.chapeau.placer(14, 10);
        this.onChange();
    }

    construire(script) {
        let premier = null, precedent = null;
        for (const b of script || []) {
            const modele = this.modeles[b.type];
            if (!modele) continue;
            const piece = new Bloc(modele, this);
            (modele.champs || []).forEach(c => {
                const v = c === 'valeur' ? b.valeur : b.valeur2;
                if (v !== undefined) piece.valeurs[c] = v;
            });
            this.couche.appendChild(piece.el);
            this.pieces.push(piece);
            this.brancherPiece(piece);
            if (b.corps && modele.bouche) {
                const dedans = this.construire(b.corps);
                if (dedans) { piece.child = dedans; dedans.parent = piece; }
            }
            piece.dessiner();
            if (precedent) { precedent.next = piece; piece.parent = precedent; }
            else premier = piece;
            precedent = piece;
        }
        return premier;
    }

    /** Programme courant : la pile accrochée au chapeau, et elle seule. */
    versScript(premier = this.chapeau.next) {
        const out = [];
        let b = premier;
        while (b) {
            const o = { type: b.type };
            (b.modele.champs || []).forEach((c, i) => {
                o[i === 0 ? 'valeur' : 'valeur2'] = b.valeurs[c];
            });
            if (b.modele.bouche) o.corps = this.versScript(b.child);
            out.push(o);
            b = b.next;
        }
        return out;
    }

    // --- Saisie -------------------------------------------------------------

    brancherChamps() {
        // Un seul écouteur pour tout l'atelier : les pièces vont et viennent,
        // les rebrancher une à une à chaque redessin serait une source de fuites.
        this.svg.addEventListener('pointerdown', (e) => {
            const champ = e.target.closest('.sc-piece-champ');
            if (!champ) return;
            const piece = this.pieces.find(p => p.contenu.contains(champ));
            if (!piece || !this.onEditerNombre) return;
            e.stopPropagation();
            this.onEditerNombre(piece, champ.dataset.champ, champ);
        }, true);
    }

    brancherPiece(bloc) {
        bloc.el.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.sc-piece-champ')) return;
            if (bloc.modele.chapeau) return;
            e.preventDefault();
            this.commencerGlisser(bloc, e);
        });
    }

    /** Détache la pièce de son support et la remet à plat dans l'atelier. */
    detacher(bloc) {
        const p = bloc.parent;
        if (!p) return;
        const boite = bloc.el.getBoundingClientRect();
        const r = this.svg.getBoundingClientRect();
        if (p.next === bloc) p.next = null;
        else if (p.child === bloc) p.child = null;
        bloc.parent = null;
        bloc.empiler(bloc, this.couche);
        bloc.placer((boite.left - r.left) / this.k, (boite.top - r.top) / this.k);
        p.remonterMiseEnForme();
    }

    commencerGlisser(bloc, e) {
        this.detacher(bloc);
        bloc.empiler(bloc, this.couche);   // la pile passe au-dessus des autres
        bloc.el.classList.add('sc-piece--tenue');

        const p0 = this.versAtelier(e);
        const dx = p0.x - bloc.x, dy = p0.y - bloc.y;
        const id = e.pointerId;

        // Les événements sont suivis sur la FENÊTRE, sans capture de pointeur.
        //
        // Deux raisons, et la seconde est la plus importante : une pièce
        // commence son voyage dans la palette et le finit dans l'atelier, donc
        // deux éléments différents ; et la ramener sur la palette doit la
        // jeter, ce qui suppose de continuer à la suivre une fois sortie de
        // l'atelier. Une capture posée sur le SVG au moment où le doigt est
        // encore sur la palette est fragile — quand elle échoue, plus rien ne
        // bouge et rien ne le signale.
        const bouger = (ev) => {
            if (ev.pointerId !== id) return;
            ev.preventDefault();
            const p = this.versAtelier(ev);
            bloc.placer(p.x - dx, p.y - dy);
            const surCorbeille = this.surPalette(ev);
            this.palette.classList.toggle('sc-palette--corbeille', surCorbeille);
            if (surCorbeille) this.cacherAimant();
            else this.chercherAimant(bloc);
        };

        const lacher = (ev) => {
            if (ev.pointerId !== id) return;
            window.removeEventListener('pointermove', bouger, true);
            window.removeEventListener('pointerup', lacher, true);
            window.removeEventListener('pointercancel', lacher, true);
            bloc.el.classList.remove('sc-piece--tenue');
            this.palette.classList.remove('sc-palette--corbeille');
            if (this.surPalette(ev)) this.supprimer(bloc);
            else this.appliquerAimant(bloc);
            this.cacherAimant();
            this.onChange();
        };

        window.addEventListener('pointermove', bouger, true);
        window.addEventListener('pointerup', lacher, true);
        window.addEventListener('pointercancel', lacher, true);
    }

    surPalette(e) {
        const r = this.palette.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    }

    // --- Aimantation --------------------------------------------------------

    cacherAimant() { this.indicateur.style.display = 'none'; this.candidat = null; }

    montrerAimant(x, y, w) {
        this.indicateur.setAttribute('d', `M ${x},${y} h ${w} v 7 h -${w} z`);
        this.indicateur.style.display = 'block';
    }

    /**
     * Cherche le meilleur point d'accroche pour la pile tenue.
     *
     * Trois façons de s'accrocher, dans l'ordre où on les essaie : SOUS une
     * pièce, DANS la bouche d'une boucle, ou AU-DESSUS d'une pièce (on
     * s'intercale). C'est la plus proche qui gagne, dans la limite de l'aimant.
     */
    chercherAimant(tenue) {
        this.cacherAimant();
        let meilleure = AIMANT;
        for (const cible of this.pieces) {
            if (tenue.contient(cible)) continue;      // pas dans sa propre pile
            const pos = this.positionDe(cible);

            // Sous la pièce (si rien n'y est déjà accroché).
            if (!cible.next) {
                const d = Math.hypot(tenue.x - pos.x, tenue.y - (pos.y + cible.hauteur));
                if (d < meilleure) {
                    meilleure = d;
                    this.candidat = { genre: 'dessous', cible };
                    this.montrerAimant(pos.x, pos.y + cible.hauteur, cible.largeur);
                }
            }
            // Dans la bouche d'une boucle vide.
            //
            // Une bouche ouverte est une ZONE, pas un point : dès que la pièce
            // tenue survole l'ouverture, elle y va, même si le bas de la
            // boucle est numériquement plus proche. Sans ça, sur téléphone où
            // tout est réduit, on visait la bouche et on tombait dessous —
            // c'est justement le geste que l'exercice demande d'apprendre.
            if (cible.modele.bouche && !cible.child) {
                const bx = pos.x + RETRAIT, by = pos.y + cible.hautLigne;
                const dansLaBouche = tenue.x > pos.x - 20 && tenue.x < pos.x + cible.largeur
                    && tenue.y > by - 22 && tenue.y < by + cible.hautBouche + 20;
                const d = dansLaBouche ? 0 : Math.hypot(tenue.x - bx, tenue.y - by);
                if (d < meilleure || dansLaBouche) {
                    meilleure = d;
                    this.candidat = { genre: 'dedans', cible };
                    this.montrerAimant(bx, by, cible.largeur - RETRAIT);
                }
            }
            // Au-dessus : on s'intercale, sauf devant le chapeau.
            if (!cible.modele.chapeau) {
                const bas = tenue.y + tenue.hauteurPile();
                const d = Math.hypot(tenue.x - pos.x, bas - pos.y);
                if (d < meilleure) {
                    meilleure = d;
                    this.candidat = { genre: 'dessus', cible };
                    this.montrerAimant(pos.x, pos.y - 7, cible.largeur);
                }
            }
        }
    }

    /** Position d'une pièce dans la couche, mesurée à l'écran puis remise à l'échelle. */
    positionDe(piece) {
        const b = piece.el.getBoundingClientRect();
        const r = this.svg.getBoundingClientRect();
        return { x: (b.left - r.left) / this.k, y: (b.top - r.top) / this.k };
    }

    appliquerAimant(tenue) {
        const c = this.candidat;
        if (!c) return;
        let dernier = tenue;
        while (dernier.next) dernier = dernier.next;

        if (c.genre === 'dessous') {
            c.cible.next = tenue; tenue.parent = c.cible;
            c.cible.remonterMiseEnForme();
        } else if (c.genre === 'dedans') {
            c.cible.child = tenue; tenue.parent = c.cible;
            c.cible.remonterMiseEnForme();
        } else if (c.genre === 'dessus') {
            const support = c.cible.parent;
            if (support) {
                if (support.next === c.cible) support.next = tenue;
                else if (support.child === c.cible) support.child = tenue;
                tenue.parent = support;
            } else {
                tenue.parent = null;
                tenue.placer(c.cible.x, c.cible.y - tenue.hauteurPile());
            }
            dernier.next = c.cible; c.cible.parent = dernier;
            tenue.racine().remonterMiseEnForme();
        }
        // Une pile rattachée doit repartir du bon endroit : on redessine
        // depuis la racine, seule à connaître sa position absolue.
        const racine = tenue.racine();
        racine.empiler(racine, this.couche);
        racine.placer(racine.x, racine.y);
    }

    /**
     * Ajuste la zone de dessin à son conteneur.
     *
     * Appelée par un observateur de taille et non une seule fois au montage :
     * la palette se remplit APRÈS la création de l'atelier et lui prend de la
     * largeur ; mesuré trop tôt, le SVG gardait sa taille d'avant et débordait
     * du cadre.
     */
    dimensionner() {
        const r = this.hote.getBoundingClientRect();
        if (!r.width || !r.height) return;
        this.svg.setAttribute('width', Math.round(r.width));
        this.svg.setAttribute('height', Math.round(r.height));
    }

    detruire() {
        if (this.ro) { this.ro.disconnect(); this.ro = null; }
        this.svg.remove();
    }
}

/** Vignette de palette : la même pièce, en petit et sans interaction. */
export function vignettePalette(modele, onPrendre, k = 1) {
    const enveloppe = document.createElement('button');
    enveloppe.type = 'button';
    enveloppe.className = 'sc-pal-piece';
    const svg = document.createElementNS(SVGNS, 'svg');
    const couche = document.createElementNS(SVGNS, 'g');
    couche.setAttribute('transform', `scale(${k})`);
    svg.appendChild(couche);
    const bloc = new Bloc(modele, null, true);
    couche.appendChild(bloc.el);
    bloc.placer(2, 2);
    svg.setAttribute('width', Math.ceil((bloc.largeur + 6) * k));
    svg.setAttribute('height', Math.ceil(((bloc.hauteur || HAUT_LIGNE) + 6) * k));
    enveloppe.appendChild(svg);
    enveloppe.addEventListener('pointerdown', (e) => { e.preventDefault(); onPrendre(modele.type, e); });
    return enveloppe;
}
