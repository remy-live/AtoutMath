// L'ATELIER DU QUOTIDIEN — écrire et retoucher les phrases du jour.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu me fais dans le debug un atelier pour les phrases énigmes du jour
// (ça on a déjà) ».
//
// ── CE QUI EXISTAIT, ET CE QUI MANQUAIT ────────────────────────────────────
//
// Les quatre listes sont là depuis longtemps — conseils, blagues, citations,
// énigmes — et la revue sait les TRIER : « celle-là oui, celle-là non », un
// verdict par ligne, qu'on me recopie (`ui/quotidienTri.js`).
//
// Trier n'est pas ÉCRIRE. Quand une énigme est presque bonne — l'indice en dit
// trop, l'explication manque, une virgule change la question — le tri ne sait que
// la jeter. Il fallait un écran pour la reprendre, la relire comme l'élève la
// verra, et en ressortir le texte à coller.
//
// ── LES QUATRE FORMES, ET POURQUOI ON NE LES A PAS UNIFORMISÉES ────────────
//
// Un conseil est une CHAÎNE. Une blague a un thème. Une citation a un auteur et
// un drapeau « attribution sûre ». Une énigme a une réponse, un indice, une
// explication, un niveau, parfois une figure. `js/data/quotidien.js` explique
// pourquoi on les a laissées différentes : les uniformiser aurait obligé à écrire
// `{ texte: '…' }` cent fois pour rien, et à inventer un auteur aux conseils.
//
// CET ATELIER PAYE CETTE DÉCISION : il montre les champs du genre choisi, et rien
// d'autre. C'est trois `if` ici contre quatre cents entrées alourdies là-bas.
//
// ── CE QU'IL VÉRIFIE, ET QUI NE SE VOIT PAS À L'ŒIL ────────────────────────
//
// La règle d'or des énigmes, écrite en tête de `js/data/enigmes.js` : « UN INDICE
// QUI NE DONNE PAS LA RÉPONSE. L'indice dit la PREMIÈRE CHOSE À REGARDER. » Un
// indice qui contient la réponse ne se remarque pas dans une liste de cent — c'est
// exactement le genre de faute qu'on a trouvée dans sa séance « Relatifs », un mot
// aux titre et texte vides, invisible parmi seize lignes.

import {
    GENRES, LIBELLES_GENRE, EMOJIS_GENRE, LISTES, normaliser as vueCommune, decalagePour
} from '../data/quotidien.js';
import { figureSvg, FIGURES } from '../data/enigmesFigures.js';
import { indiceDonneLaReponse } from '../core/indiceQuiDonne.js';
import { copierDans, telechargerTexte, jourPourFichier } from './exporter.js';
import { showToast } from './modal.js';

const CLE = 'atoutmath.atelier.quotidien';

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * LE PANIER : CE QUE JE RECEVRAI, ET RIEN D'AUTRE.
 *
 * RÉMY : « comment j'efface le tampon du fichier des dingbats et pensée du jour
 * pour éviter de t'envoyer un fichier avec des choses déjà faites ? »
 *
 * Pour le quotidien, il n'y avait pas de tampon à effacer : l'export emportait
 * la LISTE ENTIÈRE du code — deux cent une entrées — avec une ligne disant
 * laquelle avait bougé. Chaque fichier était donc fait à 99,5 % de choses déjà
 * faites, et la ligne « change » était le seul endroit où regarder.
 *
 * Le panier renverse cela : on met de côté ce qu'on a écrit, autant de fois
 * qu'on veut, et le fichier ne porte QUE ça. Trois lignes au lieu de deux
 * cents, et plus rien à relire pour savoir ce qui est neuf.
 *
 * CHAQUE ENTRÉE GARDE SON GENRE : on écrit deux énigmes et une citation dans la
 * même séance, et tout part dans un seul fichier.
 *
 * `remplace` vaut l'index de l'entrée corrigée, ou `null` pour un ajout. C'est
 * la seule chose que la liste entière me disait et que je ne veux pas perdre.
 */
let panier = [];

/** Le genre travaillé, et l'entrée en cours d'écriture. */
let genre = 'enigme';
/** Le rang dans la liste, ou −1 pour une entrée neuve. */
let rang = -1;
let brouillon = entreeVierge('enigme');
/** Ce qui filtre la liste de gauche. */
let cherche = '';

let modal = null;

/** Une entrée neuve, à la forme de son genre. */
function entreeVierge(g) {
    if (g === 'conseil') return { texte: '' };
    if (g === 'blague') return { texte: '', quoi: '' };
    if (g === 'citation') return { texte: '', auteur: '', sur: false };
    return { texte: '', reponse: '', indice: '', niveau: 5, explication: '', figure: '' };
}

/** Le texte d'une entrée, quel que soit son genre — la liste de gauche s'en sert. */
const texteDe = (e) => (typeof e === 'string' ? e : (e && e.texte) || '');

// ── CE QU'ON RETIENT ────────────────────────────────────────────────────────

function garder() {
    try { localStorage.setItem(CLE, JSON.stringify({ genre, rang, brouillon, panier })); }
    catch (e) { /* navigation privée */ }
}

function relire() {
    try {
        const b = JSON.parse(localStorage.getItem(CLE) || 'null');
        // LE PANIER SURVIT À LA FERMETURE, et il se relit SÉPARÉMENT du
        // brouillon : un carnet d'il y a trois versions n'a pas de panier, et
        // le brouillon qu'il porte reste bon.
        if (b && Array.isArray(b.panier)) {
            panier = b.panier.filter(x => x && GENRES.includes(x.genre) && x.entree);
        }
        if (b && GENRES.includes(b.genre) && b.brouillon) {
            genre = b.genre;
            rang = Number.isInteger(b.rang) ? b.rang : -1;
            brouillon = { ...entreeVierge(genre), ...(typeof b.brouillon === 'string'
                ? { texte: b.brouillon } : b.brouillon) };
        }
    } catch (e) { /* on repart d'une entrée neuve */ }
}

// ── LE SQUELETTE ────────────────────────────────────────────────────────────

function assurerModale() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'atelier-quotidien';
    modal.className = 'modal-overlay modal-overlay--top';
    modal.innerHTML = `
        <div class="glass-panel modal-panel-lg atq-panneau">
            <div class="atq-tete">
                <h2 class="atq-titre">📅 Atelier du quotidien</h2>
                <button type="button" class="atq-x" id="atq-fermer" aria-label="Fermer">✕</button>
            </div>
            <p class="atq-aide">Choisis un genre, clique une entrée pour la reprendre — ou écris-en une neuve.
                L'aperçu de droite est ce que l'écran montrera. En bas, le texte à me coller.</p>

            <div class="atq-onglets" role="tablist" aria-label="Le genre">
                ${GENRES.map(g => `<button type="button" class="atq-onglet" data-genre="${g}"
                    role="tab" aria-selected="false">${EMOJIS_GENRE[g]} ${esc(LIBELLES_GENRE[g])}
                    <span class="atq-n">${LISTES[g].length}</span></button>`).join('')}
            </div>

            <div class="atq-corps">
                <div class="atq-colonne atq-colonne--liste">
                    <input type="search" id="atq-cherche" class="atq-cherche"
                        placeholder="Chercher dans la liste…" aria-label="Chercher dans la liste">
                    <div class="atq-liste" id="atq-liste" role="listbox"
                         aria-label="Les entrées de la liste"></div>
                </div>

                <div class="atq-colonne atq-colonne--forme">
                    <div class="atq-bloc" id="atq-formulaire"></div>
                    <div class="atq-avis" id="atq-avis" role="status"></div>
                </div>

                <div class="atq-colonne atq-colonne--vue">
                    <h3 class="atq-h3">Ce que l'écran montrera</h3>
                    <div class="atq-apercu" id="atq-apercu"></div>
                    <div class="atq-quand" id="atq-quand"></div>
                </div>
            </div>

            <div class="atq-pied">
                <textarea class="atq-export" id="atq-json" data-export rows="4" spellcheck="false"
                    aria-label="Le texte de cette entrée"></textarea>
                <!-- LE PANIER : ce qui partira dans le fichier, et rien d'autre. -->
                <div class="atq-panier" id="atq-panier"></div>
                <div class="atq-pied-boutons">
                    <button type="button" class="btn-secondary" id="atq-neuve">＋ Entrée neuve</button>
                    <button type="button" class="btn-secondary" id="atq-copier">📋 Copier cette entrée</button>
                    <button type="button" class="btn-secondary" id="atq-vider"
                        title="Repartir d'un panier vide, une fois le fichier envoyé">🧹 Vider</button>
                    <button type="button" class="btn-secondary" id="atq-mettre"
                        title="Garder celle-ci et en écrire une autre">＋ Mettre de côté</button>
                    <button type="button" class="btn-primary" id="atq-fichier"
                        title="Un fichier qui ne contient QUE ce que tu as écrit">⤓ M'envoyer</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);

    let appuiSurFond = false;
    modal.addEventListener('pointerdown', (e) => { appuiSurFond = (e.target === modal); });
    modal.addEventListener('click', (e) => { if (e.target === modal && appuiSurFond) fermer(); });

    // Le jeu derrière écoute encore le clavier — voir `atelierDingbats.js`.
    ['keydown', 'keyup', 'keypress'].forEach(q =>
        modal.addEventListener(q, (e) => e.stopPropagation()));

    brancher();
    return modal;
}

function fermer() { if (modal) modal.style.display = 'none'; }

// ── LA LISTE DE GAUCHE ──────────────────────────────────────────────────────

function peindreOnglets() {
    modal.querySelectorAll('[data-genre]').forEach(b => {
        const actif = b.dataset.genre === genre;
        b.classList.toggle('atq-onglet--actif', actif);
        b.setAttribute('aria-selected', String(actif));
    });
}

function peindreListe() {
    const boite = modal.querySelector('#atq-liste');
    const liste = LISTES[genre] || [];
    const filtre = cherche.trim().toLowerCase();
    const lignes = liste
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => !filtre || texteDe(e).toLowerCase().includes(filtre));

    if (!lignes.length) {
        boite.innerHTML = `<p class="atq-vide">Rien ne correspond à « ${esc(cherche)} ».</p>`;
        return;
    }
    boite.innerHTML = lignes.map(({ e, i }) => `
        <button type="button" class="atq-ligne${i === rang ? ' atq-ligne--choisie' : ''}"
                data-rang="${i}" role="option" aria-selected="${i === rang}">
            <span class="atq-ligne-n">${i + 1}</span>
            <span class="atq-ligne-txt">${esc(texteDe(e).slice(0, 110))}</span>
        </button>`).join('');

    boite.querySelectorAll('[data-rang]').forEach(b => {
        b.onclick = () => {
            rang = Number(b.dataset.rang);
            const src = (LISTES[genre] || [])[rang];
            // ON TRAVAILLE SUR UNE COPIE, TOUJOURS. La liste importée est le
            // module lui-même : la modifier changerait ce que l'application sert
            // aux élèves pendant la séance en cours, sans que rien ne soit
            // enregistré. Un atelier ne doit pas pouvoir faire ça.
            brouillon = (typeof src === 'string')
                ? { texte: src }
                : JSON.parse(JSON.stringify(src));
            garder();
            tout();
        };
    });
}

// ── LE FORMULAIRE, à la forme du genre ──────────────────────────────────────

function champ(id, label, valeur, opts = {}) {
    const max = opts.max ? ` maxlength="${opts.max}"` : '';
    const ph = opts.ph ? ` placeholder="${esc(opts.ph)}"` : '';
    if (opts.lignes) {
        return `<label class="atq-champ">${esc(label)}
            <textarea data-ch="${id}" rows="${opts.lignes}"${max}${ph}>${esc(valeur)}</textarea></label>`;
    }
    return `<label class="atq-champ">${esc(label)}
        <input type="text" data-ch="${id}" value="${esc(valeur)}"${max}${ph}></label>`;
}

function peindreFormulaire() {
    const boite = modal.querySelector('#atq-formulaire');
    const b = brouillon;
    let champs = '';

    if (genre === 'conseil') {
        champs = champ('texte', 'Le conseil', b.texte, {
            lignes: 3, max: 220, ph: 'Quand tu bloques, relis la question à voix haute.'
        }) + '<p class="atq-note">Un conseil est une phrase, et rien d\'autre : pas d\'auteur, pas de réponse.</p>';
    } else if (genre === 'blague') {
        champs = champ('texte', 'La blague', b.texte, { lignes: 3, max: 240 })
            + champ('quoi', 'Le thème (pour s\'y retrouver, jamais affiché)', b.quoi || '', {
                max: 40, ph: 'vocabulaire, géométrie, fractions…'
            });
    } else if (genre === 'citation') {
        champs = champ('texte', 'La citation', b.texte, { lignes: 3, max: 260 })
            + champ('auteur', 'L\'auteur', b.auteur || '', { max: 60, ph: 'Carl Friedrich Gauss' })
            + `<label class="atq-coche"><input type="checkbox" data-ch="sur"
                ${b.sur ? 'checked' : ''}> L'attribution est SÛRE (vérifiée à la source)</label>
            <p class="atq-note">Sans cette case, l'écran écrit « attribué à… ». Une phrase fausse
                attribuée à Einstein, lue en classe, se grave dans trente têtes.</p>`;
    } else {
        champs = champ('texte', 'L\'énoncé', b.texte, {
            lignes: 3, max: 260, ph: 'Dans une pièce, 6 personnes se serrent toutes la main une fois. Combien ?'
        })
            + champ('reponse', 'La réponse', b.reponse || '', { max: 60, ph: '15' })
            + champ('indice', 'L\'indice — la première chose à regarder, PAS la réponse', b.indice || '', {
                lignes: 2, max: 200
            })
            + champ('explication', 'L\'explication, donnée après', b.explication || '', { lignes: 3, max: 600 })
            + `<div class="atq-duo">
                <label class="atq-champ">Le niveau (pour toi, jamais affiché)
                    <select data-ch="niveau">${[6, 5, 4, 3].map(n =>
                        `<option value="${n}"${Number(b.niveau) === n ? ' selected' : ''}>${n}<sup>e</sup></option>`
                    ).join('')}</select></label>
                <label class="atq-champ">La petite figure
                    <select data-ch="figure"><option value="">— aucune —</option>${
                        Object.keys(FIGURES).map(f =>
                            `<option value="${f}"${b.figure === f ? ' selected' : ''}>${esc(f)}</option>`
                        ).join('')}</select></label>
            </div>`;
    }

    boite.innerHTML = `<h3 class="atq-h3">${rang >= 0
        ? `La ${rang + 1}<sup>e</sup> de la liste`
        : 'Une entrée neuve'}</h3>${champs}`;

    // LES CHAMPS NE REDESSINENT PAS LE FORMULAIRE : redessiner reprendrait le
    // foyer au champ en train d'être rempli, et l'on taperait une lettre par
    // frappe. Piège connu du dépôt (`core/foyerDeLaSaisie.js`).
    boite.querySelectorAll('[data-ch]').forEach(ch => {
        const nom = ch.dataset.ch;
        const appliquer = () => {
            if (ch.type === 'checkbox') brouillon[nom] = ch.checked;
            else if (nom === 'niveau') brouillon[nom] = Number(ch.value);
            else brouillon[nom] = ch.value;
            garder();
            peindreApercu();
            peindreAvis();
            peindreJson();
        };
        ch.oninput = appliquer;
        if (ch.tagName === 'SELECT' || ch.type === 'checkbox') ch.onchange = appliquer;
    });
}

// ── L'APERÇU : ce que l'écran montrera ──────────────────────────────────────

function peindreApercu() {
    const boite = modal.querySelector('#atq-apercu');
    // ON PASSE PAR `normaliser` DE `data/quotidien.js`, qui est la vue que
    // l'écran d'accueil et la revue emploient tous les deux. Un aperçu qui
    // referait la mise en forme à sa façon mentirait au premier correctif
    // apporté à l'autre — et l'on ne s'en apercevrait pas, puisqu'il est joli.
    const vue = vueCommune(genre, genre === 'conseil' ? brouillon.texte : brouillon);
    if (!vue || !String(vue.texte || '').trim()) {
        boite.innerHTML = '<p class="atq-vide">Écris le texte : il n\'y a rien à montrer.</p>';
        return;
    }
    boite.innerHTML = `
        <div class="atq-carte">
            <div class="atq-carte-genre">${EMOJIS_GENRE[genre]} ${esc(LIBELLES_GENRE[genre])}</div>
            <p class="atq-carte-txt">${esc(vue.texte)}</p>
            ${vue.signature ? `<p class="atq-carte-sig">— ${esc(vue.signature)}</p>` : ''}
            ${vue.figure && figureSvg(vue.figure)
                ? `<div class="atq-carte-fig">${figureSvg(vue.figure)}</div>` : ''}
            ${vue.indice ? `<details class="atq-carte-plus"><summary>L'indice</summary>
                <p>${esc(vue.indice)}</p></details>` : ''}
            ${vue.secret ? `<details class="atq-carte-plus"><summary>La réponse</summary>
                <p><strong>${esc(vue.secret)}</strong></p>
                ${vue.explication ? `<p>${esc(vue.explication)}</p>` : ''}</details>` : ''}
        </div>`;
}

/** QUAND CETTE ENTRÉE SORTIRA — la seule chose qu'on ne peut pas deviner. */
function peindreQuand() {
    const boite = modal.querySelector('#atq-quand');
    const liste = LISTES[genre] || [];
    if (rang < 0) {
        boite.innerHTML = `<p class="atq-note">Une entrée neuve se range au bout de la liste.
            Avec ${liste.length + 1} entrées, chacune revient tous les ${liste.length + 1} jours.</p>`;
        return;
    }
    // Le décalage du genre fait qu'une entrée ne sort pas le jour de son rang :
    // `core/quotidien.js` étale les quatre listes pour qu'elles ne tournent pas
    // ensemble. On le dit, parce que c'est la question qu'on se pose ici.
    const d = decalagePour ? decalagePour(genre) : 0;
    boite.innerHTML = `<p class="atq-note">Rang ${rang + 1} sur ${liste.length} —
        elle revient tous les ${liste.length} jours. (Décalage du genre : ${d}.)</p>`;
}

// ── CE QUI SE VOIT MAL ──────────────────────────────────────────────────────

function peindreAvis() {
    const boite = modal.querySelector('#atq-avis');
    const dits = avisSurLEntree();
    if (!dits.length) {
        boite.className = 'atq-avis atq-avis--ok';
        boite.innerHTML = '✓ Rien à signaler.';
        return;
    }
    boite.className = 'atq-avis atq-avis--attention';
    boite.innerHTML = `<strong>À regarder :</strong><ul>${
        dits.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
}

/**
 * CE QU'ON VÉRIFIE, ET C'EST EXPORTÉ POUR ÊTRE ÉPROUVÉ.
 *
 * Une règle gardée seulement par un écran n'est gardée par personne : on l'écrit
 * ici, sans DOM, et `tests/atelierQuotidien.test.mjs` la relit.
 */
export function avisSur(genre, entree, liste = []) {
    const dits = [];
    const texte = String(texteDe(entree) || '').trim();
    if (!texte) dits.push('Le texte est vide : l\'entrée n\'existerait pas à l\'écran.');

    // DEUX PHRASES, dit `js/data/enigmes.js` : « une énigme du jour se lit debout,
    // entre deux cours ; si elle demande un paragraphe de mise en situation, elle
    // ne sera pas lue ». Le seuil est une mesure, pas un goût : la plus longue
    // des cent existantes fait 150 caractères.
    if (genre === 'enigme' && texte.length > 180) {
        dits.push(`L'énoncé fait ${texte.length} caractères : une énigme du jour se lit debout, en deux phrases.`);
    }
    if (genre === 'conseil' && texte.length > 200) {
        dits.push(`Le conseil fait ${texte.length} caractères : il ne tiendra pas dans l'encart d'accueil.`);
    }

    // LE MÊME TEXTE DEUX FOIS SORTIRAIT DEUX JOURS, et personne ne s'en
    // apercevrait avant de le voir revenir.
    const nu = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
    if (texte && liste.some(e => nu(texteDe(e)) === nu(texte))) {
        dits.push('Ce texte est déjà dans la liste, mot pour mot.');
    }

    if (genre === 'citation' && !String(entree.auteur || '').trim()) {
        dits.push('Une citation sans auteur : l\'écran n\'aurait rien à signer.');
    }

    if (genre === 'enigme') {
        const rep = String(entree.reponse || '').trim();
        const ind = String(entree.indice || '').trim();
        if (!rep) dits.push('Pas de réponse : l\'énigme serait insoluble.');
        if (!ind) dits.push('Pas d\'indice : la règle de la maison en demande un.');
        if (!String(entree.explication || '').trim()) {
            // Rémy : « pour les énigmes, il faut quand même expliquer la
            // réponse. » C'est ce qui sépare une énigme d'une devinette.
            dits.push('Pas d\'explication : « 15 » ne s\'apprend pas, le raisonnement s\'apprend.');
        }
        // LA RÈGLE D'OR, et elle ne se voit pas à l'œil dans une liste de cent :
        // « UN INDICE QUI NE DONNE PAS LA RÉPONSE ». Elle vit dans
        // `core/indiceQuiDonne.js`, qui porte aussi les deux précautions qu'elle
        // a coûtées — et l'atelier des dingbats emploie LA MÊME. Une règle
        // subtile écrite à deux endroits finit par ne plus dire la même chose.
        if (indiceDonneLaReponse(ind, rep)) {
            dits.push(`L'indice contient la réponse « ${rep} » : il la donne au lieu de la faire chercher.`);
        }
        if (entree.figure && !FIGURES[entree.figure]) {
            dits.push(`La figure « ${entree.figure} » n'existe pas : rien ne s'afficherait.`);
        }
    }
    return dits;
}

function avisSurLEntree() {
    // On exclut l'entrée qu'on est en train de retoucher du test de doublon :
    // elle est évidemment identique à elle-même.
    const liste = (LISTES[genre] || []).filter((e, i) => i !== rang);
    return avisSur(genre, genre === 'conseil' ? brouillon.texte : brouillon, liste);
}

// ── LE TEXTE À COLLER ───────────────────────────────────────────────────────

/**
 * UNE ENTRÉE, ÉCRITE COMME LE FICHIER DE DONNÉES L'ÉCRIT.
 *
 * PAS DU JSON POUR LES CONSEILS : la liste des conseils est une liste de
 * CHAÎNES, et rendre `{"texte": "…"}` obligerait à le retraduire à la main.
 * L'apostrophe est échappée comme dans le fichier, parce que c'est du JavaScript
 * qu'on colle, pas du JSON.
 */
export function entreeEnTexte(genre, entree) {
    const chaine = (s) => `'${String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
    if (genre === 'conseil') return `${chaine(texteDe(entree))},`;
    const bouts = [];
    if (genre === 'blague') {
        bouts.push(`texte: ${chaine(entree.texte)}`);
        if (String(entree.quoi || '').trim()) bouts.push(`quoi: ${chaine(entree.quoi)}`);
    } else if (genre === 'citation') {
        bouts.push(`texte: ${chaine(entree.texte)}`);
        bouts.push(`auteur: ${chaine(entree.auteur)}`);
        bouts.push(`sur: ${entree.sur ? 'true' : 'false'}`);
    } else {
        bouts.push(`texte: ${chaine(entree.texte)}`);
        bouts.push(`reponse: ${chaine(entree.reponse)}`);
        bouts.push(`indice: ${chaine(entree.indice)}`);
        bouts.push(`niveau: ${Math.round(Number(entree.niveau) || 5)}`);
        if (String(entree.explication || '').trim()) bouts.push(`explication: ${chaine(entree.explication)}`);
        if (String(entree.figure || '').trim()) bouts.push(`figure: ${chaine(entree.figure)}`);
    }
    return `{ ${bouts.join(', ')} },`;
}

function peindreJson() {
    const zone = modal.querySelector('#atq-json');
    if (document.activeElement === zone) return;
    zone.value = entreeEnTexte(genre, genre === 'conseil' ? brouillon.texte : brouillon);
}

/**
 * TOUTE LA LISTE, AVEC LA CORRECTION DEDANS.
 *
 * Copier une entrée suffit pour en AJOUTER une ; pour en CORRIGER une au milieu
 * de deux cents, il faut dire laquelle, et un fichier entier le dit sans qu'on
 * ait à compter les lignes. C'est du JSON ici — pas du JavaScript — parce que ce
 * fichier-là ne se colle pas : il me sert à remplacer la liste, et un JSON se
 * relit par machine.
 */
/**
 * LE PANIER, ÉCRIT SOUS LES BOUTONS.
 *
 * Il dit trois choses, et chacune ferme une question qu'on se pose juste avant
 * d'envoyer : combien il y en a, lesquelles, et comment en retirer une qu'on
 * a mise de côté par erreur.
 */
function peindrePanier() {
    const boite = modal.querySelector('#atq-panier');
    if (!panier.length) {
        boite.innerHTML = '<p class="atq-note">Le panier est vide. « ＋ Mettre de côté » garde '
            + 'l\'entrée écrite et t\'en ouvre une neuve ; « ⤓ M\'envoyer » fabrique un fichier '
            + 'qui ne contient QUE ce que tu as écrit — jamais la liste déjà faite.</p>';
        return;
    }
    boite.innerHTML = `<p class="atq-panier-titre">Dans le panier : <strong>${panier.length}</strong>`
        + ' — c\'est tout ce que le fichier contiendra.</p>'
        + `<div class="atq-panier-liste">${panier.map((x, i) => `
            <span class="atq-jeton">
                <span class="atq-jeton-genre">${EMOJIS_GENRE[x.genre] || ''}</span>
                <span class="atq-jeton-txt">${esc(texteDe(x.entree).slice(0, 60))}</span>
                ${x.remplace === null ? '' : `<span class="atq-jeton-n">corrige n° ${x.remplace + 1}</span>`}
                <button type="button" class="atq-jeton-x" data-oter="${i}"
                    aria-label="Retirer du panier">✕</button>
            </span>`).join('')}</div>`;

    boite.querySelectorAll('[data-oter]').forEach(b => {
        b.onclick = () => {
            panier.splice(Number(b.dataset.oter), 1);
            garder();
            tout();
        };
    });
}

// ── LE BRANCHEMENT ──────────────────────────────────────────────────────────

function tout() {
    peindreOnglets();
    peindreListe();
    peindreFormulaire();
    peindreApercu();
    peindreQuand();
    peindreAvis();
    peindreJson();
    peindrePanier();
    rendreLeVider();   // le panier a changé : la question posée ne vaut plus
}

function brancher() {
    const q = (s) => modal.querySelector(s);
    q('#atq-fermer').onclick = fermer;

    modal.querySelectorAll('[data-genre]').forEach(b => {
        b.onclick = () => {
            if (b.dataset.genre === genre) return;
            genre = b.dataset.genre;
            rang = -1;
            brouillon = entreeVierge(genre);
            cherche = '';
            q('#atq-cherche').value = '';
            garder();
            tout();
        };
    });

    q('#atq-cherche').oninput = (e) => { cherche = e.target.value; peindreListe(); };

    q('#atq-neuve').onclick = () => {
        rang = -1;
        brouillon = entreeVierge(genre);
        garder();
        tout();
    };

    q('#atq-copier').onclick = () => copierDans(q('#atq-copier'), q('#atq-json').value, '📋 Copier cette entrée');

    q('#atq-mettre').onclick = () => {
        if (!mettreDeCote()) return;
        showToast(`Mis de côté. ${panier.length} entrée(s) partiront ensemble.`, 'success');
        tout();
    };

    q('#atq-fichier').onclick = () => {
        // ON EMPORTE AUSSI CE QUI EST À L'ÉCRAN. Le piège sinon : on écrit une
        // pensée, on clique « M'envoyer » sans avoir cliqué « Mettre de côté »,
        // et le fichier ne la contient pas — un envoi vide qui a l'air plein.
        mettreDeCote({ silencieux: true });
        if (!panier.length) {
            showToast('Il n\'y a rien à m\'envoyer : écris d\'abord une entrée.', 'warning');
            return;
        }
        telechargerTexte(`quotidien-${jourPourFichier()}.json`, texteDuPanier());
        showToast(`${panier.length} entrée(s) dans tes téléchargements. `
            + 'Une fois envoyées, « 🧹 Vider » remet le panier à zéro.', 'success');
        tout();
    };

    q('#atq-vider').onclick = () => {
        if (!panier.length) { showToast('Le panier est déjà vide.', 'warning'); return; }
        // PAS DE `confirm()` — Rémy : « tu utilises des alert et prompt, on
        // évite ! ». Le bouton pose la question lui-même et la retire tout seul
        // au bout de six secondes, comme celui de l'atelier des dingbats.
        const b = q('#atq-vider');
        if (!videArme) {
            b.textContent = `Vider les ${panier.length} ? Appuie encore`;
            b.classList.add('btn-primary');
            videArme = setTimeout(() => rendreLeVider(), 6000);
            return;
        }
        rendreLeVider();
        panier = [];
        garder();
        tout();
        showToast('Panier vidé. Ce que tu écriras maintenant partira seul.', 'success');
    };
}

/** Le minuteur du second appui sur « Vider ». */
let videArme = null;
function rendreLeVider() {
    const b = modal && modal.querySelector('#atq-vider');
    clearTimeout(videArme);
    videArme = null;
    if (!b) return;
    b.textContent = '🧹 Vider';
    b.classList.remove('btn-primary');
}

/**
 * METTRE L'ENTRÉE DE CÔTÉ — et repartir d'une entrée neuve.
 *
 * ON PRÉVIENT, ON N'INTERDIT PAS : un avertissement peut être assumé (une
 * citation dont l'auteur n'est pas sûr), et un atelier qui refuse oblige à
 * contourner l'atelier. Seul le vide est refusé, parce qu'il n'y a rien à
 * mettre de côté.
 */
function mettreDeCote({ silencieux = false } = {}) {
    const texte = String(brouillon.texte || '').trim();
    if (!texte) {
        if (!silencieux) showToast('Cette entrée est vide : il n\'y a rien à mettre de côté.', 'warning');
        return false;
    }
    const dits = avisSurLEntree();
    if (dits.length && !silencieux) {
        showToast(`${dits.length} point(s) à regarder, mais elle est quand même gardée.`, 'warning');
    }
    panier.push({
        genre,
        remplace: rang >= 0 ? rang : null,
        // CE QU'ELLE REMPLACE, ÉCRIT EN CLAIR. Un numéro de ligne ne se vérifie
        // pas : si la liste a bougé entre le moment où Rémy écrit et celui où je
        // reporte, le début de l'ancienne entrée me dit tout de suite que je ne
        // remplace pas celle qu'il visait.
        avant: rang >= 0 ? texteDe((LISTES[genre] || [])[rang]).slice(0, 80) : undefined,
        entree: genre === 'conseil' ? texte : JSON.parse(JSON.stringify(brouillon))
    });
    rang = -1;
    brouillon = entreeVierge(genre);
    garder();
    return true;
}

/** Le fichier que je recevrai : ce qui est neuf, ce qui est corrigé, rien d'autre. */
function texteDuPanier() {
    const neuves = panier.filter(x => x.remplace === null);
    const corrigees = panier.filter(x => x.remplace !== null);
    return JSON.stringify({
        quoi: 'quotidien',
        jour: jourPourFichier(),
        // LE COMPTE EST ÉCRIT : c'est la première chose que je regarde, et c'est
        // aussi ce qui dit à Rémy, avant d'envoyer, que le fichier n'est pas vide.
        dit: `${neuves.length} à ajouter, ${corrigees.length} à corriger`,
        ajouts: neuves.map(x => ({ genre: x.genre, entree: x.entree })),
        corrections: corrigees.map(x => ({
            genre: x.genre, remplace: x.remplace + 1, avant: x.avant, entree: x.entree
        }))
    }, null, 2);
}

/** Ouvre l'atelier, et retrouve le brouillon laissé en plan. */
export function ouvrirAtelierQuotidien() {
    relire();
    const m = assurerModale();
    m.querySelector('#atq-cherche').value = cherche;
    tout();
    m.style.display = 'flex';
    return m;
}
