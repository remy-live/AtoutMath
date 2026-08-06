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
const HAUT_CHAPEAU = 48;
const DOME = 22;         // hauteur de la bosse du chapeau
const BOUCHE_VIDE = 28;   // hauteur d'une bouche de boucle vide
const BAS_BOUCLE = 24;    // barre inférieure d'une boucle
const RETRAIT = 14;       // décalage horizontal du contenu d'une boucle
const AIMANT = 58;        // distance d'attraction, en pixels d'atelier
const SEUIL = 5;          // déplacement, en pixels d'écran, qui fait un GESTE

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
        // Le texte du chapeau se centre SOUS le dôme, pas au milieu de la
        // pièce : sinon il chevauche la bosse.
        const milieu = this.modele.chapeau
            ? DOME + (HAUT_CHAPEAU - DOME) / 2
            : HAUT_LIGNE / 2;

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
            // Le dôme du chapeau.
            //
            // Un quart de rond posé sur le coin gauche donnait une pièce
            // bancale, penchée, qui ne ressemblait à rien de Scratch. Le vrai
            // chapeau porte un dôme SYMÉTRIQUE qui court d'un bord à l'autre :
            // c'est cette bosse-là qu'on reconnaît.
            // La courbe de Scratch, à la lettre : une cubique dont les points
            // de contrôle sont à 26 % et 74 % de la largeur, remontés de la
            // hauteur du dôme. Elle donne des épaules franches et un sommet
            // presque plat — une parabole simple faisait une colline.
            d = `M 0,${DOME} C ${w * 0.26},0 ${w * 0.74},0 ${w},${DOME} V ${h - R}`
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
        // `base` est l'échelle imposée par la largeur de l'écran, `zoom` celle
        // que l'élève règle. On garde les deux séparées : un changement
        // d'orientation recalcule la base sans effacer le zoom choisi.
        this.base = opts.echelle || 1;
        this.zoom = 1;
        this.k = this.base;

        this.svg = document.createElementNS(SVGNS, 'svg');
        this.svg.classList.add('sc-atelier-svg');
        this.couche = document.createElementNS(SVGNS, 'g');
        this.couche.setAttribute('transform', `scale(${this.k})`);
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

    /**
     * Zoom de l'atelier.
     *
     * Un programme de dix blocs ne tient pas dans le cadre d'un téléphone, et
     * réduire les pièces d'office les rendrait illisibles. On laisse donc le
     * choix : on dézoome pour voir l'ensemble, on rezoome pour viser une
     * encoche. Tout est mesuré à travers `this.k`, il n'y a rien d'autre à
     * ajuster.
     */
    regler(zoom) {
        this.zoom = Math.max(0.55, Math.min(1.7, Math.round(zoom * 100) / 100));
        this.k = this.base * this.zoom;
        this.couche.setAttribute('transform', `scale(${this.k})`);
        return this.zoom;
    }

    /** Enlève tout sauf le chapeau : la page blanche, en un geste. */
    vider() {
        if (this.chapeau.next) this.supprimer(this.chapeau.next);
        this.chapeau.next = null;
        // Les piles laissées de côté partent aussi : « vider » veut dire vider.
        this.pieces.filter(p => p !== this.chapeau && !p.parent).forEach(p => this.supprimer(p));
        this.chapeau.dessiner();
        this.chapeau.placer(14, 10);
        this.onChange();
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

    /**
     * Rejet d'une pile : elle rapetisse et s'évanouit, comme dans Scratch.
     *
     * Une disparition instantanée laisse un doute — l'a-t-on jetée, ou
     * a-t-elle glissé quelque part ? Le rétrécissement dit sans ambiguïté que
     * la pièce est partie, et où.
     */
    jeter(premier) {
        const centre = { x: premier.x + premier.largeur / 2, y: premier.y + 20 };
        const pile = [];
        for (let b = premier; b; b = b.next) pile.push(b);
        pile.forEach(b => { b.el.style.transformOrigin = `${centre.x}px ${centre.y}px`; });
        const t0 = performance.now();
        const anim = (t) => {
            const k = Math.min(1, (t - t0) / 190);
            const e = 1 - k * k;
            pile.forEach(b => {
                b.el.setAttribute('transform',
                    `translate(${centre.x},${centre.y}) scale(${e}) translate(${b.x - centre.x},${b.y - centre.y})`);
                b.el.style.opacity = String(e);
            });
            if (k < 1) requestAnimationFrame(anim);
            else this.supprimer(premier);
        };
        requestAnimationFrame(anim);
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

    /**
     * Accroche une pile à la fin du programme.
     *
     * « À la fin » descend DANS la dernière boucle : quand on vient de poser
     * un « répéter », ce qu'on ajoute ensuite va presque toujours dedans, et
     * personne n'a envie de viser une bouche de vingt pixels au doigt. Pour
     * poser quelque chose APRÈS la boucle, il reste le glisser-déposer.
     */
    ajouterAuProgramme(bloc) {
        let support = this.chapeau, dedans = false;
        for (;;) {
            while (support.next) support = support.next;
            if (!support.modele.bouche) break;
            if (!support.child) { dedans = true; break; }   // bouche vide : on y entre
            support = support.child;
        }
        if (support === bloc || bloc.contient(support)) return;
        if (dedans) { support.child = bloc; bloc.parent = support; }
        else { support.next = bloc; bloc.parent = support; }
        // C'est le SUPPORT qu'on redessine : lui seul sait qu'il vient de
        // gagner un contenu, et la mise en forme remonte ensuite d'elle-même
        // jusqu'à la racine — une boucle qui grandit repousse ce qui la suit.
        support.remonterMiseEnForme();
        const racine = bloc.racine();
        racine.empiler(racine, this.couche);
        racine.placer(racine.x, racine.y);
    }

    /** Détache la pièce de son support et la remet à plat dans l'atelier. */
    detacher(bloc) {
        const p = bloc.parent;
        if (!p) return;
        const pos = this.positionDe(bloc);   // AVANT de couper le lien
        if (p.next === bloc) p.next = null;
        else if (p.child === bloc) p.child = null;
        bloc.parent = null;
        bloc.empiler(bloc, this.couche);
        bloc.placer(pos.x, pos.y);
        p.remonterMiseEnForme();
    }

    /**
     * @param {Bloc} bloc
     * @param {PointerEvent} e
     * @param {Object} opts { neuf } — vrai pour une pièce qui naît de la palette
     */
    commencerGlisser(bloc, e, opts = {}) {
        const id = e.pointerId;
        const neuf = !!opts.neuf;
        const depart = { clientX: e.clientX, clientY: e.clientY };
        let actif = false, bouge = false, sorti = false, dx = 0, dy = 0;

        // Un CLIC n'est pas un GESTE.
        //
        // La pièce ne se décrochait pas au premier mouvement mais au premier
        // APPUI : effleurer un bloc du milieu d'un programme suffisait à le
        // détacher, lui et tout ce qui pendait dessous. Rien ne bougeait à
        // l'écran — la pièce restait là où elle était — et le programme
        // devenait silencieusement vide. D'où l'impression qu'un simple clic
        // « emportait les autres ».
        // On attend donc `SEUIL` pixels avant de détacher quoi que ce soit.
        const armer = () => {
            actif = true;
            this.detacher(bloc);
            bloc.empiler(bloc, this.couche);   // la pile passe au-dessus des autres
            bloc.el.classList.add('sc-piece--tenue');
            // Le cadre de l'atelier rogne ce qui en sort : une pièce ramenée
            // vers la palette disparaissait derrière son bord, et on croyait
            // qu'elle passait SOUS les autres. Le temps du geste, on laisse
            // déborder.
            this.hote.classList.add('sc-atelier--glisse');
            // Le décalage est mesuré depuis le point d'APPUI, pas depuis le
            // point où le seuil est franchi : sinon la pièce sauterait de
            // quelques pixels au démarrage du geste.
            const p0 = this.versAtelier(depart);
            dx = p0.x - bloc.x; dy = p0.y - bloc.y;
            this.preparerFantome(bloc);
        };
        if (neuf) armer();   // tirée de la palette, la pièce suit le doigt aussitôt

        // Les événements sont suivis sur la FENÊTRE, sans capture de pointeur.
        //
        // Deux raisons, et la seconde est la plus importante : une pièce
        // commence son voyage dans la palette et le finit dans l'atelier, donc
        // deux éléments différents ; et la ramener sur la palette doit la
        // jeter, ce qui suppose de continuer à la suivre une fois sortie de
        // l'atelier. Une capture posée sur le SVG au moment où le doigt est
        // encore sur la palette est fragile — quand elle échoue, plus rien ne
        // bouge et rien ne le signale.
        // La corbeille ne s'arme qu'une fois la pièce SORTIE de la palette.
        //
        // Sans ça, tirer une pièce de la bibliothèque la faisait virer au
        // rouge dès le premier pixel : on croyait détruire ce qu'on venait de
        // prendre. Comme dans Scratch, la palette redevient une zone de rejet
        // seulement quand on y ramène quelque chose qui en était sorti.
        const bouger = (ev) => {
            if (ev.pointerId !== id) return;
            if (!bouge) {
                if (Math.hypot(ev.clientX - depart.clientX, ev.clientY - depart.clientY) < SEUIL) return;
                bouge = true;
                if (!actif) armer();
            }
            ev.preventDefault();
            const p = this.versAtelier(ev);
            bloc.placer(p.x - dx, p.y - dy);
            if (!this.surPalette(ev)) sorti = true;
            const surCorbeille = sorti && this.surPalette(ev);
            this.palette.classList.toggle('sc-palette--corbeille', surCorbeille);
            if (surCorbeille) this.cacherFantome();
            else this.chercherAimant(bloc);
        };

        const lacher = (ev) => {
            if (ev.pointerId !== id) return;
            window.removeEventListener('pointermove', bouger, true);
            window.removeEventListener('pointerup', lacher, true);
            window.removeEventListener('pointercancel', lacher, true);
            this.palette.classList.remove('sc-palette--corbeille');
            bloc.el.classList.remove('sc-piece--tenue');
            this.hote.classList.remove('sc-atelier--glisse');
            if (!bouge) {
                // Appui sans déplacement : sur une pièce déjà posée, on ne
                // touche à rien ; sur la palette, la pièce s'ajoute à la fin du
                // programme. Au doigt, viser le bas d'une pile est pénible, et
                // un simple toucher rend le geste facile — c'est aussi ce que
                // fait le vrai Scratch sur tablette.
                this.retirerFantome();
                this.candidat = null;
                if (neuf) this.ajouterAuProgramme(bloc);
                this.onChange();
                return;
            }
            // Une pièce neuve relâchée sur la palette retourne d'où elle vient,
            // même si elle n'en est jamais sortie : sans ça elle restait
            // accrochée hors du cadre, invisible mais bien là.
            if ((sorti || neuf) && this.surPalette(ev)) this.jeter(bloc);
            else if (this.candidat) this.appliquerAimant(bloc);
            else this.poserLibre(bloc);
            this.retirerFantome();
            this.candidat = null;
            this.onChange();
        };

        window.addEventListener('pointermove', bouger, true);
        window.addEventListener('pointerup', lacher, true);
        window.addEventListener('pointercancel', lacher, true);
    }

    /**
     * Repose une pile là où elle est, mais dans le cadre.
     *
     * Sans cette borne, une pile lâchée à cheval sur le bord partait derrière
     * la palette ou sous le bas de l'atelier : plus moyen de la reprendre, et
     * le programme semblait avoir avalé des blocs.
     */
    poserLibre(bloc) {
        const w = (parseFloat(this.svg.getAttribute('width')) || 0) / this.k;
        const h = (parseFloat(this.svg.getAttribute('height')) || 0) / this.k;
        const x = w ? Math.max(4, Math.min(bloc.x, w - 44)) : Math.max(4, bloc.x);
        const y = h ? Math.max(4, Math.min(bloc.y, h - 22)) : Math.max(4, bloc.y);
        bloc.placer(x, y);
    }

    surPalette(e) {
        const r = this.palette.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    }

    // --- Aimantation --------------------------------------------------------

    /**
     * La pièce FANTÔME : le double transparent de ce qu'on tient, posé là où
     * ça va tomber.
     *
     * Un trait blanc de sept pixels disait « ça s'accroche ici » — mais pas
     * QUOI s'accroche, ni de quelle taille, ni si la pile entière rentre dans
     * la bouche de la boucle. Le fantôme montre le résultat avant de lâcher :
     * c'est la même idée que la figure à repasser, en pâle, sur la scène.
     */
    preparerFantome(tenue) {
        this.retirerFantome();
        const g = document.createElementNS(SVGNS, 'g');
        g.classList.add('sc-fantome');
        for (let b = tenue; b; b = b.next) {
            const copie = b.el.cloneNode(true);
            // Le fantôme n'est pas une pièce : on lui retire les marques qui le
            // feraient prendre pour telle, jusque dans les bouches de boucle.
            [copie, ...copie.querySelectorAll('.sc-piece--vive')]
                .forEach(el => el.classList.remove('sc-piece--tenue', 'sc-piece--vive'));
            copie.setAttribute('transform', `translate(${b.x - tenue.x},${b.y - tenue.y})`);
            g.appendChild(copie);
        }
        g.style.display = 'none';
        // Sous les vraies pièces : un fantôme qui masque le programme ne
        // renseigne plus sur l'endroit où il va se poser.
        this.couche.insertBefore(g, this.couche.firstChild);
        this.fantome = g;
    }

    retirerFantome() {
        if (this.fantome) { this.fantome.remove(); this.fantome = null; }
    }

    cacherFantome() {
        if (this.fantome) this.fantome.style.display = 'none';
        this.candidat = null;
    }

    montrerFantome(x, y) {
        if (!this.fantome) return;
        this.fantome.setAttribute('transform', `translate(${x},${y})`);
        this.fantome.style.display = 'block';
    }

    /**
     * Cherche le meilleur point d'accroche pour la pile tenue.
     *
     * Trois façons de s'accrocher, dans l'ordre où on les essaie : SOUS une
     * pièce, DANS la bouche d'une boucle, ou AU-DESSUS d'une pièce (on
     * s'intercale). C'est la plus proche qui gagne, dans la limite de l'aimant.
     */
    chercherAimant(tenue) {
        this.cacherFantome();
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
                    this.montrerFantome(pos.x, pos.y + cible.hauteur);
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
                    this.montrerFantome(bx, by);
                }
            }
            // Au-dessus : on s'intercale, sauf devant le chapeau.
            if (!cible.modele.chapeau) {
                const bas = tenue.y + tenue.hauteurPile();
                const d = Math.hypot(tenue.x - pos.x, bas - pos.y);
                if (d < meilleure) {
                    meilleure = d;
                    this.candidat = { genre: 'dessus', cible };
                    this.montrerFantome(pos.x, pos.y - tenue.hauteurPile());
                }
            }
        }
    }

    /**
     * Position d'une pièce dans le repère de la couche.
     *
     * Calculée, pas mesurée. La version précédente lisait le rectangle
     * englobant du SVG : elle se trompait de tout ce qui DÉPASSE de la forme —
     * le dôme d'un chapeau monte au-dessus de son origine, si bien que le
     * fantôme se posait cinq pixels trop bas et que la pièce, une fois lâchée,
     * ne tombait pas là où on l'avait vue.
     *
     * Les pièces d'une bouche de boucle sont placées dans le repère du groupe
     * qui la porte : on remonte donc jusqu'à la tête du groupe, puis on ajoute
     * l'origine de la bouche.
     */
    positionDe(piece) {
        let tete = piece;
        while (tete.parent && tete.parent.next === tete) tete = tete.parent;
        if (tete.parent && tete.parent.child === tete) {
            const boucle = tete.parent;
            const base = this.positionDe(boucle);
            return { x: piece.x + base.x + RETRAIT, y: piece.y + base.y + boucle.hautLigne };
        }
        return { x: piece.x, y: piece.y };
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
        this.retirerFantome();
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
