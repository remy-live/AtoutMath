// LES BILLETS D'UNE CLASSE : À DÉCOUPER, EN TABLEAU, OU EN CSV.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy : « pour imprimer les billets, tu pourrais aussi me proposer une
// présentation en tableau et ou export cvs ».
//
// TROIS SORTIES POUR UNE SEULE SOURCE, et c'est le point de ce fichier. Un
// billet à découper, une ligne de tableau et une ligne de CSV disent
// exactement la même chose — le prénom, l'identifiant, le code — et il n'y a
// aucune raison que trois morceaux de code les écrivent chacun à leur façon.
// Le jour où le billet gagnerait l'adresse du site, le CSV doit la gagner
// aussi ou cesser d'être un export de ce qu'on imprime.
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
 * LA PAGE À IMPRIMER — les deux présentations dans le MÊME document.
 *
 * ON NE RÉOUVRE PAS UNE FENÊTRE POUR CHANGER DE PRÉSENTATION. Les deux sont
 * écrites, et une classe sur `body` décide laquelle sort de l'imprimante. Le
 * professeur voit donc l'autre d'un clic, sans repasser par l'écran de la
 * classe — et surtout, l'aperçu d'impression du navigateur montre ce qu'il
 * vient de choisir, ce qu'une seconde fenêtre aurait rendu confus.
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

      /* UNE SEULE DES DEUX PRÉSENTATIONS À LA FOIS, décidée sur body. */
      /* LA PHRASE DE DÉCOUPE NE VAUT QUE POUR LES BILLETS. Vue sur la photo
         de tools/billetsEtAjout.mjs : le tableau s'affichait sous « À découper
         et à distribuer », ce qu'on ne fait pas d'un tableau. Sa légende dit
         déjà ce qu'il faut, et au bon endroit. */
      body.en-tableau .sous { display: none; }
      body:not(.en-tableau) .tableau { display: none; }
      body.en-tableau .billets { display: none; }
      /* ET LE TITRE SUIT LA PRÉSENTATION. « Billets » au-dessus d'un tableau
         qu'on ne découpe pas, c'était la même maladresse que la phrase
         ci-dessus : la feuille qu'on garde sur son bureau toute l'heure
         s'appelle une liste, pas des billets. */
      body.en-tableau .titre-billets { display: none; }
      body:not(.en-tableau) .titre-tableau { display: none; }
      @media print { .rien { display: none; } }
    </style></head><body>
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

    const enBillets = par('btn-vue-billets');
    const enTableau = par('btn-vue-tableau');
    const choisir = (tableau) => {
        d.body.classList.toggle('en-tableau', tableau);
        // `aria-pressed` n'est pas de la décoration : c'est ce qui dit à un
        // lecteur d'écran laquelle des deux présentations est choisie, et
        // c'est aussi ce que notre feuille de style lit pour la noircir.
        if (enBillets) enBillets.setAttribute('aria-pressed', String(!tableau));
        if (enTableau) enTableau.setAttribute('aria-pressed', String(tableau));
    };
    if (enBillets) enBillets.addEventListener('click', () => choisir(false));
    if (enTableau) enTableau.addEventListener('click', () => choisir(true));

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
