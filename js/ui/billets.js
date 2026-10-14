// LES BILLETS D'UNE CLASSE : À DÉCOUPER, EN TABLEAU, OU EN CSV.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy : « pour imprimer les billets, tu pourrais aussi me proposer une
// présentation en tableau et ou export cvs ».
//
// QUATRE SORTIES POUR UNE SEULE SOURCE, et c'est le point de ce fichier. Un
// billet à découper, une ligne de tableau, une ligne projetée au tableau et
// une ligne de CSV disent exactement la même chose — le prénom, l'identifiant,
// le code — et il n'y a aucune raison que quatre morceaux de code les écrivent
// chacun à leur façon. Le jour où le billet gagnerait l'adresse du site, le CSV
// doit la gagner aussi ou cesser d'être un export de ce qu'on imprime.
//
// LA QUATRIÈME EST VENUE APRÈS, ET DE LA SALLE DE CLASSE. Rémy : « ce qui
// serait bien pour les codes liés aux identifiants, c'est d'afficher un
// tableau avec identifiant et code (on retrouve le nom prénom, donc c'est
// facile), qui s'affichent sur un seul écran que je peux projeter […] en mode
// paysage du coup (donc peut être 2 colonnes avec des couleurs pour pas
// confondre) ». Le jour de la rentrée, on ne découpe pas trente billets : on
// projette, et chacun lit sa ligne.
//
// POURQUOI UN FICHIER À PART DE `espaceClasses.js`. Celui-là touche au DOM, au
// serveur et à l'état de l'écran : on ne peut l'ouvrir dans `npm test` qu'avec
// un faux document. Ici tout est une chaîne qui entre et une chaîne qui sort,
// donc le CSV s'éprouve en deux millisecondes — y compris sur le prénom qui
// contient un point-virgule, qu'on n'irait jamais chercher à la main.
//
// ET AUCUN GESTIONNAIRE D'ATTRIBUT DANS CETTE PAGE. Mesuré avec la CSP de
// production (`tools/fenetresFilles.mjs`) : une fenêtre ouverte par
// `window.open('')` HÉRITE de la CSP de son ouvreur, et notre `script-src`
// n'autorise pas 'unsafe-inline'. Le `onclick="window.print()"` qui vivait ici
// était donc mort chez Rémy et vivant chez nous, parce que le serveur d'essai
// ne pose pas l'en-tête. Les boutons se branchent depuis l'ouvreur, qui est de
// même origine : voir `brancherLesBoutons()`.

/** Échapper pour du HTML. Ce fichier écrit une page entière, à la main. */
function esc(s) {
    return String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * UNE CELLULE DE CSV, aux règles d'Excel.
 *
 * On protège par des guillemets dès qu'il y a un séparateur, un guillemet ou
 * un retour à la ligne, et un guillemet intérieur se double. Un prénom composé
 * « DUPONT-MOREL, Jean » suffit à casser un fichier qu'on n'aurait pas protégé,
 * et c'est le genre de nom qui arrive une fois par classe.
 */
function cellule(v) {
    const s = String(v === null || v === undefined ? '' : v);
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/**
 * LE CSV DES BILLETS — point-virgule, BOM, et fins de ligne Windows.
 *
 * TROIS CHOIX QUI NE SONT PAS DES DÉTAILS, et qui décident si le fichier
 * s'ouvre tout seul ou s'il faut un assistant d'importation :
 *
 *   · LE POINT-VIRGULE. Excel en français lit la virgule comme un séparateur
 *     DÉCIMAL et le point-virgule comme un séparateur de colonnes. Un CSV à la
 *     virgule y arrive sur une seule colonne. `api/lib/liste.php` tranche déjà
 *     dans ce sens pour la LECTURE — « le point-virgule l'emporte à égalité,
 *     c'est celui d'un tableur français » : on écrit donc ce qu'on sait lire.
 *   · LE BOM. Le même fichier commente, côté lecture, « trois octets invisibles
 *     qui collent au premier nom ». À l'ÉCRITURE, c'est l'inverse : sans eux,
 *     Excel suppose Windows-1252 et « NGUYÊN Maëlle » devient « NGUYÃŠN ».
 *   · LE CRLF. C'est ce que la norme du CSV demande, et ce que les vieux
 *     tableurs attendent ; un simple saut de ligne colle parfois tout sur une
 *     ligne unique.
 *
 * @param {Array<{prenom:string, login:string, code:string}>} eleves
 * @param {string} [nomDeClasse] ajouté en colonne quand on le connaît : un
 *   professeur qui exporte deux classes dans le même dossier veut pouvoir les
 *   empiler sans perdre laquelle est laquelle.
 * @returns {string}
 */
export function csvDesBillets(eleves, nomDeClasse = '') {
    const avecClasse = !!nomDeClasse;
    const entete = avecClasse
        ? ['Classe', 'Élève', 'Identifiant', 'Code']
        : ['Élève', 'Identifiant', 'Code'];
    const lignes = [entete.map(cellule).join(';')];
    for (const e of eleves) {
        const l = [e.prenom || '', e.login || '', e.code || ''];
        lignes.push((avecClasse ? [nomDeClasse, ...l] : l).map(cellule).join(';'));
    }
    // Le BOM d'abord, puis les lignes, et un CRLF final : un fichier texte se
    // termine par une fin de ligne.
    return '﻿' + lignes.join('\r\n') + '\r\n';
}

/** Un nom de fichier qu'un système d'exploitation accepte partout. */
export function nomDuFichierCsv(nomDeClasse) {
    const base = String(nomDeClasse || 'classe')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')   // les accents partent
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '').toLowerCase() || 'classe';
    return `billets-${base}.csv`;
}

/**
 * COMBIEN DE BLOCS, COMBIEN DE LIGNES, ET DE QUELLE TAILLE — POUR UN ÉCRAN.
 *
 * RÉMY : « qui s'affichent sur un seul écran que je peux projeter […] en mode
 * paysage du coup (donc peut être 2 colonnes avec des couleurs pour pas
 * confondre) ».
 *
 * UN SEUL ÉCRAN : C'EST LA CONTRAINTE, ET ELLE DÉCIDE DE TOUT LE RESTE. Trente
 * élèves sur une seule colonne font trente lignes de 2,8 vh, qu'on ne lit pas
 * du fond de la salle. Sur deux colonnes, quinze lignes de 5,6 vh. En paysage,
 * la largeur est ce dont on a le plus et un identifiant tient en quinze
 * signes : c'est donc la largeur qu'on dépense, et la hauteur qu'on économise.
 *
 * DEUX BLOCS, TROIS AU-DELÀ DE TRENTE. Deux, comme il le propose. Au-delà de
 * trente, un troisième bloc redonne des lignes plus hautes sans que la colonne
 * devienne trop étroite : sur le vidéoprojecteur le plus courant (1280 × 720),
 * un tiers de largeur fait encore 426 px.
 *
 * ET DEUX TAILLES, UNE PAR AXE, DONT LE NAVIGATEUR PREND LA PLUS PETITE. La
 * hauteur d'une ligne borne le texte par le haut ; la longueur du plus long
 * identifiant le borne par la largeur. Sans la seconde,
 * « de-la-tour-du-pin.jean-baptiste » sortirait du bloc ou finirait en points
 * de suspension — c'est-à-dire que l'élève ne lirait pas son identifiant, qui
 * est tout ce qu'on lui demande de lire.
 *
 * @param {Array<{login:string, code:string}>} eleves
 * @returns {{blocs:number, lignes:number, taille:string, tailleLargeur:string}}
 */
const PROPORTION = 16 / 9;

/** Ce que donnerait un nombre de blocs : les lignes, et les deux bornes. */
function tenterAvec(nombre, blocs, long) {
    const lignes = Math.max(1, Math.ceil(nombre / blocs));
    // EN HAUTEUR : les rangées se partagent ce qui reste sous le titre et la
    // barre — environ 84 vh. Une ligne vaut donc 84/lignes, et le texte un peu
    // plus de sa moitié. Borné des deux côtés : sous 1,9 vh on ne lit plus du
    // fond de la salle, au-dessus de 5,5 vh un effectif de douze donnerait des
    // lettres ridicules.
    const parHauteur = Math.max(1.9, Math.min(5.5, (84 / lignes) * 0.55));
    // EN LARGEUR : un bloc occupe (100/blocs) vw, moins les gouttières. Une
    // chasse de police à chasse fixe vaut 0,6 em, et le code plus les marges
    // en coûtent trois de plus.
    const parLargeur = Math.max(1.2, ((100 / blocs) - 3) / (0.6 * long + 3.4));
    // POUR COMPARER DEUX DÉCOUPAGES, IL FAUT UNE SEULE UNITÉ — donc une
    // proportion d'écran. 16/9 est celle des salles d'aujourd'hui. Si celui de
    // Rémy est un vieux 4/3, le texte sortira un peu plus petit que prévu : le
    // min() de la feuille de style s'en charge, et personne ne lit une ligne
    // coupée. C'est une hypothèse sur l'OPTIMUM, jamais sur la justesse.
    return { blocs, lignes, parHauteur, parLargeur,
             lisible: Math.min(parHauteur, parLargeur * PROPORTION) };
}

export function reglageDeProjection(eleves) {
    const nombre = eleves.length;
    const long = nombre ? Math.max(...eleves.map((e) => String(e.login || '').length)) : 10;
    // ON ESSAIE DEUX COLONNES ET TROIS, ET L'ON GARDE LA PLUS LISIBLE — à
    // égalité, deux, comme Rémy les voyait.
    //
    // MESURÉ AVANT CETTE LIGNE, et c'est elle qui a corrigé l'absurdité : avec
    // un seuil fixe (« trois blocs au-delà de trente »), une classe de 31
    // s'affichait en 30 px et une classe de 30 en 22 px. Un élève de PLUS
    // rendait l'écran plus lisible.
    //
    // LES DEUX BORNES NE VONT PAS DANS LE MÊME SENS, et c'est tout l'intérêt
    // de les essayer : un bloc de plus donne des lignes plus hautes, donc un
    // texte plus grand ; mais il rétrécit la colonne, donc le réduit. Avec des
    // noms courts, la hauteur commande et trois blocs gagnent. Avec
    // « de-la-tour-du-pin.jean-baptiste », c'est la largeur, et l'on retombe à
    // deux. Aucun seuil écrit à la main ne sait cela.
    //
    // PAS DE QUATRIÈME BLOC : un quart de 1280 px fait 320 px, et surtout
    // l'oeil aurait quatre listes alphabétiques à balayer pour trouver un nom.
    // Trente-six élèves tiennent déjà en trois.
    const choisi = [2, 3].map((b) => tenterAvec(nombre, b, long))
        .reduce((a, b) => (b.lisible > a.lisible ? b : a));
    return {
        blocs: choisi.blocs,
        lignes: choisi.lignes,
        taille: choisi.parHauteur.toFixed(2) + 'vh',
        tailleLargeur: choisi.parLargeur.toFixed(2) + 'vw'
    };
}

/**
 * La liste découpée en blocs qui se lisent de haut en bas, PUIS de gauche à
 * droite — comme une liste d'appel qu'on aurait coupée en deux, et non comme
 * un texte sur deux colonnes. On cherche son nom dans l'ordre alphabétique :
 * le rompre pour remplir les lignes de gauche à droite rendrait la recherche
 * impossible.
 */
export function decouperEnBlocs(eleves, blocs) {
    const lignes = Math.max(1, Math.ceil(eleves.length / Math.max(1, blocs)));
    const out = [];
    for (let i = 0; i < eleves.length; i += lignes) out.push(eleves.slice(i, i + lignes));
    return out;
}

/**
 * LA PAGE À IMPRIMER — les trois présentations dans le MÊME document.
 *
 * ON NE RÉOUVRE PAS UNE FENÊTRE POUR CHANGER DE PRÉSENTATION. Les trois sont
 * écrites, et `data-vue` sur `body` décide laquelle paraît — et laquelle sort
 * de l'imprimante. Le professeur passe de l'une à l'autre d'un clic, sans
 * repasser par l'écran de la classe ; et surtout, l'aperçu d'impression du
 * navigateur montre ce qu'il vient de choisir, ce qu'une seconde fenêtre
 * aurait rendu confus.
 *
 * LE TABLEAU N'EST PAS UN BILLET MIS À PLAT. Il sert à autre chose : garder
 * sous les yeux, pendant l'heure, qui a quel identifiant quand trois élèves
 * disent « ça ne marche pas ». On le serre donc, on numérote les lignes, et on
 * laisse une colonne vide à cocher — c'est elle que Rémy annote au stylo quand
 * il distribue.
 *
 * @param {object} p
 * @param {Array<{prenom:string, login:string, code:string}>} p.eleves
 * @param {string} p.nom      le nom de la classe
 * @param {string} p.origine  l'adresse où l'élève tape son billet
 * @returns {string} un document HTML complet
 */
export function htmlDesBillets({ eleves, nom = '', origine = '' }) {
    const unSeul = eleves.length === 1;
    const reglage = reglageDeProjection(eleves);
    const blocs = decouperEnBlocs(eleves, reglage.blocs);
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>Billets — ${esc(nom)}</title>
    <style>
      /* LA MARGE D'UNE FEUILLE SE DIT AVEC @page, PAS AVEC body.
         (Pas d'accent grave dans ce commentaire : il est DANS un gabarit, et
          le premier qu'on y pose ferme le gabarit.)
         Une marge de body ne vaut qu'au DÉBUT du flux : les pages deux et
         suivantes n'avaient que ce que la boîte de dialogue d'impression
         voulait bien leur donner. Mesuré avec les marges à zéro : les billets
         de la page 2 commençaient à 2 mm du bord — et une classe de trente
         tient sur deux pages. Avec les marges par défaut de Chrome, cela ne se
         voyait presque pas : c'est le genre de défaut qui attend l'imprimante
         du collège pour se montrer. */
      @page { margin: 14mm; }
      body { font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
             margin: 0; color: #111; }
      h1 { font-size: 1.1rem; margin: 0 0 3mm; }
      .sous { color: #555; margin: 0 0 6mm; font-size: .9rem; }

      /* LA BARRE DE COMMANDES NE S'IMPRIME PAS, et elle ne doit pas non plus
         pousser le contenu vers le bas de la feuille : display:none à
         l'impression, et c'est tout ce qu'il faut. */
      .rien { display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
              margin: 0 0 6mm; padding-bottom: 4mm; border-bottom: 1px solid #ddd; }
      .rien button { font: inherit; padding: 6px 12px; border-radius: 8px;
                     border: 1px solid #bbb; background: #fff; cursor: pointer;
                     min-height: 34px; }
      .rien button[aria-pressed="true"] { background: #1a1a1a; color: #fff;
                                          border-color: #1a1a1a; }
      .rien .sep { width: 1px; height: 22px; background: #ddd; }

      .billets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
      .billet { border: 1px dashed #999; border-radius: 3mm; padding: 4mm; break-inside: avoid; }
      .nom { font-weight: 700; font-size: 1.05rem; margin-bottom: 2mm; }
      .l { font-size: .88rem; margin: 1mm 0; }
      b.code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 1.15rem;
               letter-spacing: .08em; }
      .pied { margin-top: 3mm; font-size: .72rem; color: #666; }

      /* LE TABLEAU. Les chiffres en colonne demandent des chasses égales, sans
         quoi deux codes de même longueur n'ont pas la même largeur et l'œil ne
         peut plus descendre la colonne. */
      table { border-collapse: collapse; width: 100%; font-size: .92rem; }
      caption { text-align: left; color: #555; font-size: .85rem; padding-bottom: 2mm; }
      th, td { border: 1px solid #ccc; padding: 2mm 3mm; text-align: left; }
      thead th { background: #f3f3f3; }
      tbody tr:nth-child(even) td { background: #fafafa; }
      td.r { color: #777; text-align: right; width: 8mm; }
      td.ident, td.cod { font-family: ui-monospace, Menlo, Consolas, monospace;
                         font-variant-numeric: tabular-nums; }
      td.cod { letter-spacing: .06em; font-weight: 700; }
      td.vide { width: 16mm; }
      tr { break-inside: avoid; }
      thead { display: table-header-group; }   /* l'en-tête revient page 2 */

      /* UNE SEULE PRÉSENTATION À LA FOIS, ET C'EST data-vue QUI TRANCHE.
         C'était une classe en-tableau : un interrupteur à DEUX positions, où
         la troisième présentation aurait demandé d'écrire « ni l'une ni
         l'autre » dans chaque règle. Un attribut qui NOMME la vue donne trois
         règles symétriques, et la quatrième tiendra en une ligne.
         LA PHRASE DE DÉCOUPE NE VAUT QUE POUR LES BILLETS. Vue sur la photo
         de tools/billetsEtAjout.mjs : le tableau s'affichait sous « À découper
         et à distribuer », ce qu'on ne fait pas d'un tableau. Sa légende dit
         déjà ce qu'il faut, et au bon endroit. Le titre suit de même : la
         feuille qu'on garde sur son bureau toute l'heure s'appelle une liste,
         et pas des billets. */
      body:not([data-vue="billets"]) .billets,
      body:not([data-vue="billets"]) .titre-billets,
      body:not([data-vue="billets"]) .sous { display: none; }
      body:not([data-vue="tableau"]) .tableau,
      body:not([data-vue="tableau"]) .titre-tableau { display: none; }
      body:not([data-vue="projection"]) .projection { display: none; }

      /* ── L'ÉCRAN À PROJETER ─────────────────────────────────────────────

         LA HAUTEUR VIENT DU FLUX, ET NON D'UN CALCUL. body devient une
         colonne flexible : la barre de commandes garde la hauteur qu'elle
         veut, l'écran prend tout le reste. Un height: 100vh posé sur
         l'écran aurait fait défiler la page de la hauteur exacte de la barre
         — et une page qui défile n'est plus « un seul écran ».

         UNE COULEUR PAR BLOC, DEUX NUANCES DEDANS. Rémy : « 2 colonnes avec
         des couleurs pour pas confondre ». La couleur du bloc dit dans quelle
         colonne on est, l'alternance dit sur quelle ligne : c'est ce qui
         empêche de lire l'identifiant d'une ligne et le code de la suivante à
         six mètres de distance. Fond clair et encre sombre, et non l'inverse :
         un vidéoprojecteur délave les couleurs, il n'assombrit jamais.

         min() ENTRE LES DEUX TAILLES : voir reglageDeProjection. La
         hauteur d'une ligne borne le texte par le haut, la longueur du plus
         long identifiant par la largeur, et le navigateur prend la plus
         petite — il est le seul à connaître les deux dans la même unité. */
      body[data-vue="projection"] { height: 100vh; overflow: hidden;
                                    display: flex; flex-direction: column; }
      body[data-vue="projection"] .rien { flex: 0 0 auto; margin: 0 0 1vh;
                                          padding-bottom: 1vh; }
      /* LA MARGE N'EST PAS UNE COQUETTERIE : sans elle, VU SUR LA PHOTO
         (tools/tmp/projection-30.png), l'adresse du site se coupait au bord
         droit de l'image et le dernier bloc touchait le cadre. Un
         vidéoprojecteur mal réglé rogne en plus les bords de quelques
         millimètres — ce sont les codes de la dernière colonne qu'il mange. */
      .projection { flex: 1 1 auto; min-height: 0; display: flex;
                    flex-direction: column; gap: 1.2vh;
                    padding: 0 1.4vw 1.4vh; box-sizing: border-box; }
      .pr-tete { flex: 0 0 auto; display: flex; flex-wrap: wrap;
                 align-items: baseline; justify-content: space-between; gap: 1vh 2vw; }
      .pr-tete h2 { font-size: 3.2vh; margin: 0; }
      .pr-tete p { margin: 0; font-size: 2.1vh; color: #333; }
      .pr-tete b { font-family: ui-monospace, Menlo, Consolas, monospace; }
      .pr-grille { flex: 1 1 auto; min-height: 0; display: grid;
                   grid-auto-flow: column; grid-auto-columns: 1fr; gap: 0 1.2vw; }
      .pr-bloc { min-height: 0; display: grid; gap: .45vh;
                 grid-template-rows: auto repeat(var(--lignes, 15), 1fr); }
      .pr-entete { display: flex; justify-content: space-between; padding: 0 .9vw;
                   font-size: 1.6vh; letter-spacing: .1em; text-transform: uppercase;
                   color: #555; }
      .pr-ligne { min-height: 0; display: flex; align-items: center;
                  justify-content: space-between; gap: 1vw; padding: 0 .9vw;
                  border-radius: .9vh; overflow: hidden;
                  font-size: min(var(--taille, 3vh), var(--taille-l, 4vw)); }
      .pr-id { font-family: ui-monospace, Menlo, Consolas, monospace;
               min-width: 0; overflow: hidden; text-overflow: ellipsis;
               white-space: nowrap; }
      .pr-code { font-family: ui-monospace, Menlo, Consolas, monospace;
                 font-weight: 800; font-size: 1.1em; letter-spacing: .1em;
                 flex: 0 0 auto; }
      /* Les trois teintes. Le code prend l'encre foncée de son bloc : c'est
         lui qu'on recopie, et c'est lui qu'on doit retrouver sans hésiter. */
      .pr-bloc--1 .pr-ligne { background: #eaf1fd; }
      .pr-bloc--1 .pr-ligne:nth-child(even) { background: #f6f9ff; }
      .pr-bloc--1 .pr-code { color: #15397c; }
      .pr-bloc--2 .pr-ligne { background: #e6f5ea; }
      .pr-bloc--2 .pr-ligne:nth-child(even) { background: #f4fbf6; }
      .pr-bloc--2 .pr-code { color: #14603a; }
      .pr-bloc--3 .pr-ligne { background: #fdefdf; }
      .pr-bloc--3 .pr-ligne:nth-child(even) { background: #fff8ef; }
      .pr-bloc--3 .pr-code { color: #8a4708; }
      @media print { .rien { display: none; } }
    </style></head><body data-vue="billets">
    <div class="rien">
      <!-- ON DIT LE PDF SUR LE BOUTON. Rémy : « on peut imprimer le tableau
           ou l'exporter en pdf ? ». Les deux marchent, et c'est mesuré
           (tools/billetsEtAjout.mjs sort les deux PDF et lit ce qu'ils
           contiennent) — mais « Enregistrer au format PDF » est une
           destination CACHÉE dans la fenêtre d'impression du navigateur, et
           rien ne l'annonçait. Une possibilité qu'il faut deviner n'est pas
           offerte : il a dû poser la question. -->
      <button id="btn-imprimer" type="button"
              title="La fenêtre d'impression du navigateur propose aussi « Enregistrer au format PDF » comme destination"
              >Imprimer ou enregistrer en PDF</button>
      <span class="sep"></span>
      <button id="btn-vue-billets" type="button" aria-pressed="true">Billets à découper</button>
      <button id="btn-vue-tableau" type="button" aria-pressed="false">Tableau de la classe</button>
      <!-- L'ÉCRAN À PROJETER. Rémy : « un seul écran que je peux projeter ».
           Le bouton dit À PROJETER et non « grand écran » : c'est le geste du
           jour de la rentrée, pas une taille de police. -->
      <button id="btn-vue-projection" type="button" aria-pressed="false">À projeter</button>
      <span class="sep"></span>
      <button id="btn-csv" type="button">Télécharger le CSV</button>
    </div>
    <h1 class="titre-billets">${unSeul ? `Billet de ${esc(eleves[0].prenom)}` : 'Billets'} — ${esc(nom)}</h1>
    <h1 class="titre-tableau">${esc(nom)} — identifiants et codes</h1>
    <p class="sous">${unSeul
        ? 'À redonner à cet élève. Son code n\'a pas changé : l\'ancien billet reste valable.'
        : 'À découper et à distribuer.'} L'élève tape son identifiant et son code
       sur la page d'accueil du site.</p>
    <div class="billets">
      ${eleves.map(e => `<div class="billet">
        <div class="nom">${esc(e.prenom)}</div>
        <div class="l">identifiant <b>${esc(e.login)}</b></div>
        <div class="l">code <b class="code">${esc(e.code)}</b></div>
        <div class="pied">${esc(origine)}</div>
      </div>`).join('')}
    </div>
    <div class="tableau">
      <table>
        <!-- LA LÉGENDE NE REDIT PLUS LE NOM DE LA CLASSE : il est dans le
             titre juste au-dessus depuis qu'il y en a un pour le tableau. -->
        <caption>${eleves.length} élève${eleves.length > 1 ? 's' : ''}.
          L'élève tape son identifiant et son code sur ${esc(origine)}</caption>
        <thead><tr>
          <th></th><th>Élève</th><th>Identifiant</th><th>Code</th><th>Remis</th>
        </tr></thead>
        <tbody>
          ${eleves.map((e, i) => `<tr>
            <td class="r">${i + 1}</td>
            <td>${esc(e.prenom)}</td>
            <td class="ident">${esc(e.login)}</td>
            <td class="cod">${esc(e.code)}</td>
            <td class="vide"></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <!-- L'ÉCRAN À PROJETER. Rémy : « afficher un tableau avec identifiant et
         code (on retrouve le nom prénom, donc c'est facile), qui s'affichent
         sur un seul écran que je peux projeter ».
         PAS DE COLONNE « ÉLÈVE », ET C'EST LUI QUI LE DIT : l'identifiant est
         fabriqué à partir du nom — « dupont.emma » —, chacun retrouve donc sa
         ligne sans qu'on écrive les trente noms au tableau. C'est aussi une
         ligne de moins à projeter devant toute la classe. -->
    <div class="projection">
      <div class="pr-tete">
        <h2>${esc(nom)} — ton identifiant et ton code</h2>
        <p>Tu les tapes sur <b>${esc(origine)}</b></p>
      </div>
      <div class="pr-grille" style="--lignes: ${reglage.lignes}; --taille: ${reglage.taille}; --taille-l: ${reglage.tailleLargeur}">
        ${blocs.map((bloc, i) => `<section class="pr-bloc pr-bloc--${i + 1}">
          <div class="pr-entete"><span>identifiant</span><span>code</span></div>
          ${bloc.map(e => `<div class="pr-ligne"><span class="pr-id">${esc(e.login)}</span><span class="pr-code">${esc(e.code)}</span></div>`).join('')}
        </section>`).join('')}
      </div>
    </div>
    </body></html>`;
}

/**
 * BRANCHER LES BOUTONS DEPUIS L'OUVREUR.
 *
 * C'est le cœur de la correction : la fenêtre fille hérite de notre CSP, qui
 * refuse tout gestionnaire d'attribut et tout script inline. Mais elle est de
 * MÊME ORIGINE, donc son document nous est ouvert — et le code qui s'exécute
 * est le NÔTRE, déjà autorisé. On pose donc les écouteurs d'ici.
 *
 * `blob:` POUR LE TÉLÉCHARGEMENT, et c'est mesuré : notre CSP ne nomme `blob:`
 * ni dans `default-src` ni dans `connect-src`, et l'on pouvait craindre un
 * refus. Vérifié avec l'en-tête de production — `blob:` comme `data:`
 * téléchargent tous les deux. On garde `blob:`, qui n'a pas de limite de
 * longueur : une classe de trente tient, trois classes aussi.
 *
 * @param {Window} f la fenêtre fille, document déjà écrit et fermé
 * @param {{csv: string, fichier: string}} quoi
 */
export function brancherLesBoutons(f, { csv, fichier }) {
    const d = f.document;
    const par = (id) => d.getElementById(id);

    const imprimer = par('btn-imprimer');
    if (imprimer) imprimer.addEventListener('click', () => f.print());

    // LES TROIS PRÉSENTATIONS SE NOMMENT, ELLES NE SE COMPTENT PAS. C'était un
    // booléen « tableau ou non » : la troisième en aurait fait un second
    // booléen, et deux booléens pour trois états laissent toujours un quatrième
    // état qui n'existe pas. Le nom de la vue est l'identifiant du bouton et la
    // valeur de l'attribut — une liste, et plus rien à tenir d'accord.
    const VUES = ['billets', 'tableau', 'projection'];
    const choisir = (vue) => {
        d.body.dataset.vue = vue;
        // `aria-pressed` n'est pas de la décoration : c'est ce qui dit à un
        // lecteur d'écran laquelle des présentations est choisie, et c'est
        // aussi ce que notre feuille de style lit pour la noircir.
        VUES.forEach((v) => {
            const b = par('btn-vue-' + v);
            if (b) b.setAttribute('aria-pressed', String(v === vue));
        });
    };
    VUES.forEach((v) => {
        const b = par('btn-vue-' + v);
        if (b) b.addEventListener('click', () => choisir(v));
    });

    const csvBtn = par('btn-csv');
    if (csvBtn) csvBtn.addEventListener('click', () => {
        const url = f.URL.createObjectURL(new f.Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const a = d.createElement('a');
        a.href = url;
        a.download = fichier;
        d.body.appendChild(a);
        a.click();
        a.remove();
        // ON LIBÈRE L'URL, MAIS PAS TOUT DE SUITE : révoquée dans le même tour
        // de boucle, le téléchargement n'a pas encore commencé et le fichier
        // arrive vide. Une seconde suffit et ne coûte rien.
        f.setTimeout(() => f.URL.revokeObjectURL(url), 1000);
    });
}
