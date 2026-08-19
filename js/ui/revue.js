// LE TABLEAU DE REVUE — le catalogue entier, une ligne par exercice.
//
// Rémy : « comment sait-on que ce sont les derniers jeux, on n'avait pas
// trié ». Soixante-sept exercices sur cent neuf portent `status: test`, et
// certains le portent depuis des mois parce que personne n'a jamais eu sous
// les yeux la LISTE de ce qui reste à décider. Le banc d'essai note un
// exercice à fond ; ce tableau-ci en trie cent.
//
// CE QU'UNE LIGNE PORTE :
//   - la case « en test », qu'on coche et qu'on décoche ;
//   - la date, posée toute seule à la décision et corrigeable ;
//   - une remarque libre ;
//   - cinq cases d'aperçu — téléphone, tablette, ordinateur, robot, fiche —
//     qui LANCENT l'exercice dans ce cadre-là, et se cochent au retour.
//
// LE TABLEAU DÉFILE HORIZONTALEMENT, colonne du nom figée. Onze colonnes ne
// tiennent pas sur un iPhone, et rétrécir le nom de l'exercice jusqu'à ce que
// tout entre revient à trier des lignes qu'on ne sait plus nommer.
//
// LA LIMITE, ET ELLE EST HONNÊTE : le catalogue est du CODE. Une case cochée
// ici ne peut pas réécrire `status: STATUS.TEST` dans `js/data/calcul.js`. Le
// tableau garde donc les décisions sur l'appareil et en sort une consigne
// d'une ligne — « STATUT v328 | valide = … » — à coller dans la conversation
// pour que je les reporte dans les descripteurs. C'est le même aller-retour
// que le RETEST du banc d'essai, et il a fait ses preuves.

import { exercices } from '../data/catalog.js';
import { TAGS } from '../data/tags.js';
import { STATUS, STATUS_LABELS } from '../data/status.js';
import {
    COLONNES, TRIS, nouvelleRevue, ficheDe, decider, marquerVu, statutRevu,
    aChange, dernierJour, direTri, filtrer, bilan, consigneStatuts, lireRevue,
    fusionnerRevues, versMarkdown, jourISO
} from '../core/revue.js';

const CLE = 'mathbox-revue';
let revue = null;
// L'ORDRE PAR DÉFAUT EST « LES DERNIERS TOUCHÉS ». La question de départ était
// « comment sait-on que ce sont les derniers jeux » : la réponse doit être en
// haut du tableau à l'ouverture, pas derrière un menu.
const CRITERES_VIDES = () => ({
    texte: '', domaine: '', niveau: '', statut: '', avancee: '', jeux: false, tri: '-ecrit'
});
let criteres = CRITERES_VIDES();
let retour = null;         // ce qu'on est parti regarder, et où le cocher au retour

// --- Le carnet, gardé sur l'appareil ----------------------------------------

function versionChargee() {
    const el = document.getElementById('db-version');
    if (el && el.textContent) return el.textContent.trim();
    const lien = document.querySelector('link[href*="?v="]');
    const m = lien && lien.getAttribute('href').match(/\?v=([\w.-]+)/);
    return m ? `v${m[1]}` : '';
}

function charger() {
    let garde = null;
    try { garde = lireRevue(window.localStorage.getItem(CLE)); } catch (e) { garde = null; }
    revue = garde || nouvelleRevue({ version: versionChargee(), date: Date.now() });
    revue.version = versionChargee();
}

function garder() {
    try { window.localStorage.setItem(CLE, JSON.stringify(revue)); } catch (e) { /* privé */ }
}

const echapper = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// --- Les icônes des colonnes ------------------------------------------------
//
// Des traits, pas des émojis : « 🖥 » se dessine différemment sur chaque
// système, et l'en-tête d'un tableau doit rester lisible à onze colonnes.

const ICONES = {
    telephone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18.5h2"/>',
    tablette: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M10.5 18.5h3"/>',
    ordinateur: '<rect x="2.5" y="4" width="19" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    robot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 17h5"/>',
    fiche: '<path d="M7 8V3h10v5"/><rect x="3.5" y="8" width="17" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'
};

const icone = (id) => `<svg viewBox="0 0 24 24" class="rv-ico">${ICONES[id] || ''}</svg>`;

/** Domaines, sous-domaines, niveaux, et les mots-clefs déjà employés. */
const VOCABULAIRE = [
    ...Object.values(TAGS.DOMAINE),
    ...Object.values(TAGS.SOUS_DOMAINE),
    ...Object.values(TAGS.NIVEAU),
    ...[...new Set(exercices.flatMap(e => e.motsClefs || []))].sort()
];

// LE COCHET DE VALIDATION. Rémy : « pour le décidé mets juste un check à
// valider à droite du calendrier et ça enregistre la date du jour ». Ouvrir le
// sélecteur de dates d'un téléphone, faire défiler trois molettes et valider,
// cent neuf fois, pour écrire chaque fois la date d'aujourd'hui — le champ
// reste pour les corrections, mais le geste courant tient en un appui.
const COCHE = '<svg viewBox="0 0 24 24" class="rv-ico"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

// --- L'écran ----------------------------------------------------------------

function assurerPanneau() {
    let el = document.getElementById('revue-catalogue');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'revue-catalogue';
    el.className = 'rv';
    el.innerHTML = `
        <style>
            .rv {
                position: fixed; inset: 0; z-index: 3000; display: none;
                flex-direction: column; background: var(--bg-app); color: var(--text-main);
            }
            .rv--ouvert { display: flex; }
            .rv-tete {
                display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
                padding: 8px 10px; border-bottom: 1px solid var(--border);
                background: var(--bg-panel); flex: 0 0 auto;
            }
            .rv-titre { font-weight: 800; font-size: .98rem; margin-right: auto; }
            .rv-compteur { font-size: .74rem; color: var(--text-muted); width: 100%; }
            .rv-btn {
                border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                border-radius: 9px; padding: 5px 10px; font: inherit; font-weight: 700;
                font-size: .8rem; cursor: pointer; min-height: 34px;
            }
            .rv-btn--fort { background: var(--primary); border-color: var(--primary); color: #fff; }
            .rv-filtres {
                display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
                padding: 8px 10px; border-bottom: 1px solid var(--border); flex: 0 0 auto;
            }
            .rv-champ {
                border: 1px solid var(--border); background: var(--bg-app); color: var(--text-main);
                border-radius: 8px; padding: 6px 9px; font: inherit; font-size: .82rem; min-height: 34px;
            }
            .rv-recherche { flex: 1 1 160px; min-width: 120px; }

            /* Le tableau défile dans les DEUX sens, et seule l'en-tête et la
               colonne du nom restent en place : sans elles, on ne sait plus à
               quel exercice appartient la case qu'on coche. */
            /* Un remplissage de défilement : l'en-tête est collante, donc quand une
               ligne est amenée en vue elle atterrit DESSOUS et non derrière —
               sinon la première case du tableau est inatteignable au clavier. */
            .rv-cadre { flex: 1 1 auto; overflow: auto; -webkit-overflow-scrolling: touch; scroll-padding-top: 46px; }
            .rv-table { border-collapse: separate; border-spacing: 0; font-size: .8rem; width: max-content; min-width: 100%; }
            .rv-table th, .rv-table td {
                border-bottom: 1px solid var(--border); padding: 4px 6px; text-align: center;
                white-space: nowrap; background: var(--bg-app);
            }
            .rv-table thead th {
                position: sticky; top: 0; z-index: 3; background: var(--bg-panel);
                font-size: .68rem; text-transform: uppercase; letter-spacing: .03em;
                color: var(--text-muted); padding: 6px 6px;
            }
            .rv-tri { cursor: pointer; user-select: none; }
            .rv-tri:hover { color: var(--primary); }
            .rv-tri--actif { color: var(--primary); }
            .rv-fleche { display: inline-block; min-width: .7em; font-size: .8em; }
            .rv-table th.rv-nom, .rv-table td.rv-nom {
                position: sticky; left: 0; z-index: 2; text-align: left;
                border-right: 1px solid var(--border);
            }
            .rv-table td.rv-nom { cursor: pointer; }
            .rv-table td.rv-nom:hover b { color: var(--primary); }
            .rv-table thead th.rv-nom { z-index: 4; }
            .rv-table tbody tr:hover td { background: var(--bg-panel); }
            /* LA LARGEUR EST PORTÉE PAR LE CONTENU, PAS PAR LA CASE. Un
               max-width sur une cellule de tableau ne tient pas : en mise en
               page automatique, la colonne grandit jusqu'au plus long des
               titres et la cellule COLLANTE recouvrait alors la case « en
               test » de sa propre ligne — on cliquait sur le nom en croyant
               décocher. Une boîte de largeur fixe à l'intérieur, elle, fixe la
               colonne pour de bon. */
            .rv-nom-tout { display: block; width: 34vw; min-width: 148px; max-width: 280px; overflow: hidden; }
            .rv-nom b, .rv-sous { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .rv-nom b { font-weight: 700; }
            .rv-sous { font-size: .68rem; color: var(--text-muted); font-weight: 500; }
            /* Le trait de « ça change » ne se pose que sur la colonne du nom :
               posé sur toutes les cellules, il barrait la ligne entière de dix
               traits verticaux et l'on ne lisait plus rien. La colonne du nom
               étant collante, il reste visible quoi qu'on fasse défiler. */
            .rv-ligne--change td.rv-nom { box-shadow: inset 3px 0 0 var(--primary); }

            /* Une case d'aperçu : le bouton qui LANCE, et la coche qui dit
               qu'on a regardé. Deux gestes différents, deux cibles. */
            .rv-cell { display: inline-flex; align-items: center; gap: 3px; }
            .rv-voir {
                width: 30px; height: 30px; display: inline-flex; align-items: center;
                justify-content: center; border-radius: 8px; cursor: pointer;
                border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main); padding: 0;
            }
            .rv-voir:hover { border-color: var(--primary); color: var(--primary); }
            .rv-ico { width: 15px; height: 15px; fill: none; stroke: currentColor;
                stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
            .rv-coche { width: 17px; height: 17px; accent-color: var(--primary); cursor: pointer; }
            .rv-statut { width: 21px; height: 21px; accent-color: #f59e0b; cursor: pointer; }
            .rv-date { width: 118px; font-size: .74rem; }
            .rv-quand { font-size: .72rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
            .rv-jour { color: var(--text-muted); }
            .rv-jour:hover { color: #16a34a; border-color: #16a34a; }
            .rv-remarque { width: 200px; }
            .rv-classer { width: 170px; }
            .rv-jeu { font-size: .72rem; color: var(--text-muted); font-family: ui-monospace, monospace; }
            .rv-table td.rv-libre { white-space: normal; }
            .rv-vide { padding: 24px; text-align: center; color: var(--text-muted); }
            .rv-etiq { font-size: .66rem; font-weight: 800; border-radius: 999px; padding: 2px 7px; }
            .rv-etiq--test { background: #fef3c7; color: #92400e; }
            .rv-etiq--valide { background: #dcfce7; color: #166534; }
            .rv-etiq--brouillon { background: #e2e8f0; color: #475569; }
            /* Figé pendant un aperçu : le tableau reste VISIBLE autour du cadre
               du téléphone — c'est tout l'intérêt — mais il ne reçoit plus les
               clics, et il s'assombrit pour dire lequel des deux commande. */
            .rv--fige .rv-cadre, .rv--fige .rv-filtres, .rv--fige .rv-tete { pointer-events: none; }
            .rv--fige::after {
                content: ''; position: fixed; inset: 0; z-index: 9000;
                background: rgba(15, 23, 42, .55);
            }
            .rv-coller {
                position: absolute; inset: 6% 5%; z-index: 10; overflow: auto;
                background: var(--bg-panel); border: 1px solid var(--border);
                border-radius: 14px; padding: 14px; box-shadow: var(--shadow-lg);
            }
            .rv-coller textarea { width: 100%; height: 40%; min-height: 140px; }
            .rv-aide { font-size: .76rem; color: var(--text-muted); line-height: 1.45; margin: 6px 0 10px; }
            /* SUR UN TÉLÉPHONE, LA TÊTE NE DOIT PAS MANGER L'ÉCRAN. Titre,
               cinq boutons, compteur et six filtres faisaient cinq cent
               cinquante pixels de haut sur un iPhone : il restait quatre
               lignes de tableau sur cent neuf. Le titre s'efface, les six
               filtres se replient derrière un bouton, et la recherche — le
               seul filtre dont on se sert à chaque fois — reste dehors. */
            .rv-plier { display: none; }
            @media (max-width: 780px) {
                .rv-titre { display: none; }
                .rv-plier { display: inline-flex; }
                .rv-filtres { display: none; }
                .rv--filtres .rv-filtres { display: flex; }
                .rv-recherche { order: -1; }
                .rv-remarque { width: 130px; }
                .rv-classer { width: 130px; }
                .rv-date { width: 108px; }
                .rv-compteur { max-height: 2.6em; overflow: hidden; }
            }
        </style>
        <div class="rv-tete">
            <span class="rv-titre">Revue du catalogue</span>
            <input type="search" class="rv-champ rv-recherche" data-f="texte"
                   placeholder="Chercher un exercice…" aria-label="Chercher un exercice">
            <button type="button" class="rv-btn rv-plier" data-plier
                    aria-expanded="false">Filtres</button>
            <button type="button" class="rv-btn" data-consigne
                    title="Copier la ligne des statuts à reporter dans le code">Consigne</button>
            <button type="button" class="rv-btn" data-copier
                    title="Copier le bilan entier, remarques comprises">Bilan</button>
            <button type="button" class="rv-btn" data-fichier title="Télécharger le bilan">Fichier</button>
            <button type="button" class="rv-btn" data-reprendre
                    title="Coller une revue venue d'un autre appareil">Coller</button>
            <button type="button" class="rv-btn" data-fermer>Fermer</button>
            <span class="rv-compteur" data-compteur></span>
        </div>
        <div class="rv-filtres" data-filtres></div>
        <div class="rv-cadre" data-cadre></div>
        <!-- LE VOCABULAIRE EXISTANT, PROPOSÉ À LA SAISIE. Retaper « Grandeurs
             et Mesures » à la main, c'est inventer une quinzième orthographe du
             même domaine ; la liste ne force rien mais elle rappelle ce qui
             existe déjà. -->
        <datalist id="rv-vocabulaire">${VOCABULAIRE.map(v =>
        `<option value="${echapper(v)}"></option>`).join('')}</datalist>`;
    document.body.appendChild(el);

    const plier = el.querySelector('[data-plier]');
    plier.onclick = () => {
        const ouvert = el.classList.toggle('rv--filtres');
        plier.setAttribute('aria-expanded', String(ouvert));
        plier.classList.toggle('rv-btn--fort', ouvert);
    };
    el.querySelector('[data-fermer]').onclick = () => fermer();
    el.querySelector('[data-consigne]').onclick = () => copierConsigne();
    el.querySelector('[data-copier]').onclick = () => copierBilan();
    el.querySelector('[data-fichier]').onclick = () => telechargerBilan();
    el.querySelector('[data-reprendre]').onclick = () => demanderCarnet();
    return el;
}

// --- Les filtres ------------------------------------------------------------

const AVANCEES = [
    ['', 'Tout'],
    ['adecider', 'À décider'],
    ['decides', 'Décidés'],
    ['changes', 'Changements'],
    ['jamaisvus', 'Jamais regardés'],
    ['vus', 'Déjà regardés'],
    ['remarques', 'Avec remarque'],
    ['classer', 'À reclasser']
];

function peindreFiltres(el) {
    const domaines = [...new Set(exercices.map(e => e.tags.chemin[0]))].sort();
    const niveaux = [...new Set(exercices.flatMap(e => (e.tags && e.tags.niveaux) || []))].sort();
    const opt = (liste, choisi, vide) => [['', vide], ...liste].map(x => {
        const [v, t] = Array.isArray(x) ? x : [x, x];
        return `<option value="${echapper(v)}"${v === choisi ? ' selected' : ''}>${echapper(t)}</option>`;
    }).join('');

    // La recherche vit dans la tête, pas ici : c'est le seul filtre qu'on
    // veut sous la main même quand les autres sont repliés.
    const cherche = el.querySelector('.rv-tete [data-f="texte"]');
    if (cherche && cherche.value !== criteres.texte) cherche.value = criteres.texte;

    el.querySelector('[data-filtres]').innerHTML = `
        <select class="rv-champ" data-f="domaine">${opt(domaines, criteres.domaine, 'Tous les domaines')}</select>
        <select class="rv-champ" data-f="niveau">${opt(niveaux, criteres.niveau, 'Tous les niveaux')}</select>
        <select class="rv-champ" data-f="statut">${opt(
        Object.values(STATUS).map(s => [s, STATUS_LABELS[s]]), criteres.statut, 'Tous les statuts')}</select>
        <select class="rv-champ" data-f="avancee">${AVANCEES.map(([v, t]) =>
        `<option value="${v}"${v === criteres.avancee ? ' selected' : ''}>${t}</option>`).join('')}</select>
        <select class="rv-champ" data-f="tri" title="Dans quel ordre ranger les lignes">${
        // Un tri choisi en cliquant une colonne n'est dans aucune des quatre
        // entrées du menu : on l'y ajoute, sinon le menu affiche « ordre du
        // catalogue » pendant que le tableau est trié par autre chose.
        (TRIS.some(t => t.id === criteres.tri) ? TRIS : [...TRIS, { id: criteres.tri, label: direTri(criteres.tri) }])
            .map(t => `<option value="${echapper(t.id)}"${t.id === criteres.tri ? ' selected' : ''}>${echapper(t.label)}</option>`).join('')
}</select>
        <label class="rv-champ" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" class="rv-coche" data-f="jeux"${criteres.jeux ? ' checked' : ''}> Les jeux
        </label>
        <button type="button" class="rv-btn" data-raz>Effacer les filtres</button>`;

    el.querySelectorAll('[data-f]').forEach(ch => {
        const nom = ch.dataset.f;
        const lire = () => (ch.type === 'checkbox' ? ch.checked : ch.value);
        const appliquer = () => { criteres[nom] = lire(); peindreTable(el); majCompteur(el); };
        ch.oninput = ch.tagName === 'SELECT' || ch.type === 'checkbox' ? null : appliquer;
        ch.onchange = appliquer;
    });
    el.querySelector('[data-raz]').onclick = () => { criteres = CRITERES_VIDES(); peindre(); };
}

function majCompteur(el) {
    const b = bilan(revue, exercices);
    const montres = filtrer(exercices, revue, criteres).length;
    const c = el.querySelector('[data-compteur]');
    c.textContent = `${montres}/${b.total} affichés · ${b.enTest} en test, ${b.valides} validés · `
        + `${b.decides} décidés, ${b.changes} à reporter, ${b.remarques} remarques, `
        + `${b.classer} à reclasser`;
    // La phrase entière ne tient pas sur un téléphone, et elle ne sert qu'une
    // fois : elle passe en infobulle plutôt qu'en trois lignes permanentes.
    c.title = 'Les décisions restent sur cet appareil : le catalogue est du code, '
        + 'une case cochée ici ne le réécrit pas. Le bouton « Consigne » sort la ligne à coller '
        + 'dans la conversation pour que les statuts passent dans les descripteurs.';
}

// --- La table ---------------------------------------------------------------

/**
 * UNE EN-TÊTE QUI TRIE. Premier clic : ordre croissant ; deuxième : décroissant.
 * La flèche ne s'affiche que sur la colonne active — trois flèches grises sur
 * onze colonnes ne disent plus laquelle commande.
 *
 * Le même clic sur la colonne déjà descendante rend l'ordre du catalogue : il
 * faut pouvoir revenir, et personne n'ira le rechercher dans le menu.
 */
function tete(cle, contenu, classe, aide) {
    const actif = criteres.tri === cle || criteres.tri === `-${cle}`;
    const sens = criteres.tri === `-${cle}` ? '▼' : '▲';
    return `<th class="rv-tri ${classe} ${actif ? 'rv-tri--actif' : ''}" data-tri="${echapper(cle)}"
                title="${echapper(aide)}" aria-sort="${actif ? (sens === '▲' ? 'ascending' : 'descending') : 'none'}"
            >${contenu}<span class="rv-fleche">${actif ? sens : ''}</span></th>`;
}

function peindreTable(el) {
    const liste = filtrer(exercices, revue, criteres);
    const cadre = el.querySelector('[data-cadre]');
    if (!liste.length) {
        cadre.innerHTML = '<div class="rv-vide">Aucun exercice ne répond à ces filtres.</div>';
        return;
    }
    cadre.innerHTML = `
        <table class="rv-table">
            <thead><tr>
                ${tete('titre', 'Exercice', 'rv-nom', 'Trier par titre')}
                ${tete('jeu', 'Jeu', '', 'Le moteur qui fait tourner l\'exercice — trier ici groupe tout ce qui partage le même écran')}
                ${tete('ecrit', 'Écrit', '', 'Écrit le, ou repris le — c\'est ce qui dit lesquels sont les derniers')}
                ${tete('statut', 'En test', '', 'Coché = encore en test. Décoché = validé pour les élèves.')}
                ${tete('statut', 'Statut', '', 'Trier : ce qui est en test d\'abord')}
                ${tete('decide', 'Décidé', '', 'Le jour où la décision a été prise')}
                ${COLONNES.map(c => tete(`vu:${c.id}`, `${icone(c.id)}<br>${echapper(c.label)}`, '', c.aide)).join('')}
                ${tete('classer', 'À classer', '', 'Domaine, sous-domaine, niveau ou mot-clef à ajouter')}
                ${tete('remarque', 'Remarque', '', 'Trier : les lignes annotées d\'abord')}
            </tr></thead>
            <tbody>${liste.map(ligneHtml).join('')}</tbody>
        </table>`;
    brancherTable(cadre, el);
}

function ligneHtml(exo) {
    const f = ficheDe(revue, exo.id);
    const s = statutRevu(exo, f);
    const chemin = ((exo.tags && exo.tags.chemin) || []).join(' > ');
    const niveaux = ((exo.tags && exo.tags.niveaux) || []).join(' · ');
    const cases = COLONNES.map(c => `
        <td><span class="rv-cell">
            <button type="button" class="rv-voir" data-voir="${exo.id}" data-col="${c.id}"
                    title="${echapper(c.aide)}">${icone(c.id)}</button>
            <input type="checkbox" class="rv-coche" data-vu="${exo.id}" data-col="${c.id}"
                   title="Vérifié : ${echapper(c.label)}"${f && f.vu[c.id] ? ' checked' : ''}>
        </span></td>`).join('');
    return `<tr class="${aChange(exo, f) ? 'rv-ligne--change' : ''}" data-ligne="${exo.id}">
        <td class="rv-nom" title="${echapper(exo.id)} — toucher le nom lance l'aperçu sur CET écran-ci">
          <span class="rv-nom-tout">
            <b>${echapper(exo.title)}</b>
            <span class="rv-sous">${echapper(chemin)}${niveaux ? ` — ${echapper(niveaux)}` : ''}${exo.activityId ? ` · ${echapper(exo.activityId)}` : ''}</span>
        </span></td>
        <td class="rv-jeu">${echapper(exo.activityId || exo.generatorId || '—')}</td>
        <td class="rv-quand" title="${echapper(exo.cree || '')}">${echapper(dernierJour(exo))}</td>
        <td><input type="checkbox" class="rv-statut" data-test="${exo.id}"
                   title="Encore en test ?"${s === STATUS.TEST ? ' checked' : ''}></td>
        <td><span class="rv-etiq rv-etiq--${s}">${echapper(STATUS_LABELS[s])}</span></td>
        <td><span class="rv-cell">
            <input type="date" class="rv-champ rv-date" data-date="${exo.id}"
                   value="${echapper((f && f.date) || '')}">
            <button type="button" class="rv-voir rv-jour" data-jour="${exo.id}"
                    title="Dater d'aujourd'hui">${COCHE}</button>
        </span></td>
        ${cases}
        <td class="rv-libre"><input type="text" class="rv-champ rv-classer" data-tags="${exo.id}"
                   list="rv-vocabulaire" placeholder="+ domaine, niveau, mot-clef"
                   title="Aujourd'hui : ${echapper(chemin)}${niveaux ? ` — ${echapper(niveaux)}` : ''}"
                   value="${echapper((f && f.tags) || '')}"></td>
        <td class="rv-libre"><input type="text" class="rv-champ rv-remarque" data-remarque="${exo.id}"
                   placeholder="…" value="${echapper((f && f.remarque) || '')}"></td>
    </tr>`;
}

/**
 * UN SEUL ÉCOUTEUR POUR TOUT LE TABLEAU. Onze colonnes sur cent neuf lignes
 * font plus de mille commandes : les brancher une par une coûte le double du
 * temps de dessin, et il faut tout rebrancher au moindre filtre.
 *
 * Et le tableau NE SE REDESSINE PAS à chaque frappe : on tape une remarque de
 * vingt caractères, ce serait vingt redessins et le curseur perdu à chacun.
 * Seule la case d'un statut, qui change une étiquette et peut faire sortir la
 * ligne du filtre, justifie un redessin.
 */
function brancherTable(cadre, el) {
    cadre.onclick = (ev) => {
        const entete = ev.target.closest('[data-tri]');
        if (entete) {
            const cle = entete.dataset.tri;
            criteres.tri = criteres.tri === cle ? `-${cle}` : criteres.tri === `-${cle}` ? 'catalogue' : cle;
            peindre();
            return;
        }
        const jour = ev.target.closest('[data-jour]');
        if (jour) {
            const aujourdhui = jourISO();
            const champ = cadre.querySelector(`input[data-date="${CSS.escape(jour.dataset.jour)}"]`);
            // Le même appui efface une date déjà posée aujourd'hui : c'est la
            // seule façon de revenir en arrière sans ouvrir le sélecteur.
            const pose = champ && champ.value === aujourdhui ? '' : aujourdhui;
            revue = decider(revue, jour.dataset.jour, { date: pose });
            garder();
            if (champ) champ.value = pose;
            return;
        }
        const voir = ev.target.closest('[data-voir]');
        if (voir) { regarder(voir.dataset.voir, voir.dataset.col); return; }
        // « Pour chaque ligne on peut cliquer et avoir directement l'aperçu » :
        // toucher le NOM lance l'exercice sur l'appareil qu'on tient vraiment,
        // sans cadre de simulation — c'est le geste le plus court, et c'est
        // celui qu'on fait quand on descend la liste. La colonne cochée est
        // celle qui correspond à cet écran-ci : tester sur l'iPad et voir se
        // cocher « téléphone » serait un mensonge.
        const ligne = ev.target.closest('td.rv-nom');
        if (ligne) regarder(ligne.parentElement.dataset.ligne, colonneDeCetEcran(), true);
    };
    cadre.onchange = (ev) => {
        const t = ev.target;
        if (t.dataset.test !== undefined && t.type === 'checkbox') {
            revue = decider(revue, t.dataset.test, { enTest: t.checked });
            garder();
            peindreTable(el);
            majCompteur(el);
            return;
        }
        if (t.dataset.vu !== undefined) {
            revue = marquerVu(revue, t.dataset.vu, t.dataset.col, t.checked);
            garder();
            majCompteur(el);
            return;
        }
        if (t.dataset.date !== undefined) {
            revue = decider(revue, t.dataset.date, { date: t.value });
            garder();
        }
    };
    cadre.oninput = (ev) => {
        const t = ev.target;
        const champ = t.dataset.remarque !== undefined ? 'remarque'
            : t.dataset.tags !== undefined ? 'tags' : null;
        if (!champ) return;
        const id = champ === 'remarque' ? t.dataset.remarque : t.dataset.tags;
        revue = decider(revue, id, { [champ]: t.value });
        clearTimeout(brancherTable._t);
        brancherTable._t = setTimeout(() => { garder(); majCompteur(el); }, 400);
    };
}

// --- Regarder un exercice ---------------------------------------------------

/**
 * Quelle colonne décrit l'écran qu'on a sous les yeux ? Les seuils sont ceux
 * des cadres de simulation eux-mêmes : 400 px de large pour le téléphone,
 * 768 pour la tablette.
 */
function colonneDeCetEcran() {
    const l = window.innerWidth;
    if (l < 560) return 'telephone';
    if (l < 1024) return 'tablette';
    return 'ordinateur';
}

/**
 * L'APERÇU S'OUVRE PAR-DESSUS LE TABLEAU, PAS À SA PLACE.
 *
 * Rémy : « pourquoi l'aperçu revient toujours sur l'écran principal et ne
 * laisse pas la modale du tableau de test ». Le tableau se refermait avant de
 * lancer — un aller-retour par l'écran d'accueil à chaque exercice, cent neuf
 * fois. Il n'y avait aucune raison : la couche de jeu est à z-index 10000, le
 * tableau à 3000. Elle le couvre toute seule, et dans un cadre de téléphone ou
 * de tablette — qui ne fait que 400 ou 768 px de large — le tableau reste
 * visible AUTOUR, ce qui est exactement ce qu'on veut voir pendant une passe.
 *
 * Le tableau est FIGÉ tant que l'aperçu est ouvert : sans cela, un clic à côté
 * du cadre du téléphone tomberait sur une ligne du tableau et lancerait un
 * autre exercice par-dessus le premier.
 *
 * `internalStudentConfig` saute le panneau de réglages — cinq cases par
 * exercice, c'est cinq cents fenêtres à valider sur une passe complète.
 */
function regarder(id, colonne, depuisLeNom) {
    const exo = exercices.find(e => e.id === id);
    const col = COLONNES.find(c => c.id === colonne);
    if (!exo || !col) return;
    if (col.fiche) return apercuFiche(exo, colonne);

    retour = { id, colonne };
    const el = document.getElementById('revue-catalogue');
    if (el) el.classList.add('rv--fige');
    // Depuis le nom, on est DÉJÀ sur l'appareil : pas de cadre par-dessus le
    // cadre. Depuis une case d'aperçu, c'est le cadre de cette colonne-là.
    const cadre = depuisLeNom ? 'none' : col.mode;
    const prepare = { ...exo, internalStudentConfig: true, apercuAppareil: cadre, params: { ...(exo.params || {}) } };
    import('../games/engine.js').then(m => {
        m.openGameLayer(prepare, !!col.robot);
        guetterRetour();
    });
}

function guetterRetour() {
    const couche = document.getElementById('game-layer');
    if (!couche) return;
    const visible = () => couche.style.display && couche.style.display !== 'none';
    // On n'arme le guet qu'une fois le jeu VRAIMENT ouvert : la couche met un
    // instant à s'afficher, et guetter tout de suite ferait croire à une
    // fermeture immédiate — donc à une case cochée sans que rien n'ait été vu.
    let arme = visible();
    const obs = new MutationObserver(() => {
        if (visible()) { arme = true; return; }
        if (!arme) return;
        obs.disconnect();
        setTimeout(() => {
            const el = document.getElementById('revue-catalogue');
            if (el) el.classList.remove('rv--fige');
            if (retour) {
                revue = marquerVu(revue, retour.id, retour.colonne, true);
                garder();
                cocherSurPlace(retour.id, retour.colonne);
                retour = null;
            }
        }, 250);
    });
    obs.observe(couche, { attributes: true, attributeFilter: ['style'] });
}

/**
 * Cocher la case au retour SANS redessiner le tableau. Un redessin remettrait
 * la liste tout en haut : après le quarantième exercice, il faudrait redescendre
 * quarante lignes à chaque retour.
 */
function cocherSurPlace(id, colonne) {
    const el = document.getElementById('revue-catalogue');
    if (!el) return;
    const boite = el.querySelector(`input[data-vu="${CSS.escape(id)}"][data-col="${colonne}"]`);
    if (boite) boite.checked = true;
    majCompteur(el);
}

/** L'aperçu papier. Tous les exercices n'en ont pas : on le dit une fois. */
function apercuFiche(exo, colonne) {
    Promise.all([import('./printSheet.js'), import('../core/registry.js')])
        .then(([m, { aUneFichePapier }]) => {
            if (!aUneFichePapier(exo)) {
                import('./modal.js').then(x => x.showToast(
                    'Cet exercice n\'a pas de fiche papier : c\'est une activité à l\'écran.', 'warning'));
                return;
            }
            m.ouvrirFicheModal(exo, { ...(exo.params || {}) }, null, { flottant: false });
            // Avoir ouvert la fiche, c'est l'avoir regardée : la refermer ne
            // passe pas par la couche de jeu, donc rien d'autre ne le verrait.
            revue = marquerVu(revue, exo.id, colonne, true);
            garder();
            cocherSurPlace(exo.id, colonne);
        });
}

// --- Sortir le bilan --------------------------------------------------------

function rapport() {
    return versMarkdown(revue, exercices, { titre: `Revue du catalogue — ${revue.version || '?'}` })
        + '\n\n<!-- REVUE (ne pas modifier) -->\n```json\n'
        + JSON.stringify(revue) + '\n```\n';
}

async function copier(texte, dit) {
    const { showToast } = await import('./modal.js');
    try {
        await navigator.clipboard.writeText(texte);
        showToast(dit, 'success');
    } catch (e) {
        // Un navigateur qui refuse le presse-papiers sans geste direct : on
        // montre le texte, il reste sélectionnable à la main.
        const z = document.createElement('textarea');
        z.value = texte;
        z.style.cssText = 'position:fixed;inset:8% 5%;z-index:4000;width:90%;height:80%';
        document.body.appendChild(z);
        z.select();
        showToast('Sélectionne et copie ce texte, puis touche ailleurs.', 'warning');
        z.addEventListener('blur', () => z.remove());
    }
}

/**
 * LA CONSIGNE SEULE. C'est la ligne qu'on colle dans la conversation pour que
 * les statuts passent dans le code — et elle tient sur un écran de téléphone,
 * là où le bilan entier fait trois pages.
 */
function copierConsigne() {
    const c = consigneStatuts(revue, exercices);
    if (!c) {
        import('./modal.js').then(m => m.showToast(
            'Aucun statut ne change pour l\'instant : coche ou décoche « en test » sur une ligne.', 'warning'));
        return;
    }
    copier(c, 'Consigne copiée : colle-la dans la conversation, je la reporte dans le code.');
}

const copierBilan = () => copier(rapport(), 'Bilan copié : colle-le dans la conversation.');

function telechargerBilan() {
    const blob = new Blob([rapport()], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `revue-${jourISO()}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/**
 * Coller un bilan pour le reprendre : rapatrier la revue commencée sur la
 * tablette, ou récupérer la sienne après un navigateur vidé. Les deux carnets
 * s'ADDITIONNENT — une décision n'appartient pas à un appareil.
 */
function demanderCarnet() {
    const el = assurerPanneau();
    const zone = document.createElement('div');
    zone.className = 'rv-coller';
    zone.innerHTML = `
        <h4 style="margin:0 0 4px">Coller une revue</h4>
        <div class="rv-aide">Le bilan copié depuis un autre appareil, ou depuis la conversation.
            Les deux revues s'additionnent : la décision la plus récente gagne, et les cases
            « vu » des deux appareils se cumulent.</div>
        <textarea class="rv-champ" data-colle placeholder="# Revue du catalogue — …"></textarea>
        <div style="display:flex; gap:6px; margin-top:8px">
            <button type="button" class="rv-btn rv-btn--fort" data-ok>Reprendre</button>
            <button type="button" class="rv-btn" data-non>Annuler</button>
            <button type="button" class="rv-btn" data-vider style="margin-left:auto">Tout effacer</button>
        </div>`;
    el.appendChild(zone);
    zone.querySelector('[data-non]').onclick = () => zone.remove();
    zone.querySelector('[data-vider]').onclick = () => {
        window.appConfirm('Vider la revue',
            'Effacer toutes les décisions, les dates et les remarques de cet appareil ?<br><br>'
            + 'Ce qui a déjà été copié ou reporté dans le code n\'est pas touché.', () => {
                revue = nouvelleRevue({ version: versionChargee(), date: Date.now() });
                garder();
                zone.remove();
                peindre();
            });
    };
    zone.querySelector('[data-ok]').onclick = async () => {
        const { showToast } = await import('./modal.js');
        const autre = lireRevue(zone.querySelector('[data-colle]').value);
        if (!autre) { showToast('Ce texte n\'est pas une revue.', 'warning'); return; }
        const avant = revue.fiches.length;
        revue = fusionnerRevues(revue, autre);
        garder();
        zone.remove();
        peindre();
        showToast(`Revue reprise : ${revue.fiches.length - avant} ligne(s) de plus.`, 'success');
    };
}

// --- Ouverture / fermeture --------------------------------------------------

function peindre() {
    const el = assurerPanneau();
    peindreFiltres(el);
    peindreTable(el);
    majCompteur(el);
}

export function ouvrirRevue() {
    if (!revue) charger();
    assurerPanneau().classList.add('rv--ouvert');
    peindre();
}

export function fermer(silencieux) {
    const el = document.getElementById('revue-catalogue');
    if (el) el.classList.remove('rv--ouvert');
    if (!silencieux) retour = null;
}

// Outil d'auteur : on l'atteint aussi depuis la console, sans avoir à
// retrouver le bouton dans une palette repliée.
if (typeof window !== 'undefined') {
    window.revueCatalogue = { ouvrir: ouvrirRevue, bilan: () => bilan(revue || nouvelleRevue(), exercices) };
}
