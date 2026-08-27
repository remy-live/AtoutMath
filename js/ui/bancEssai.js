// L'ÉCRAN DU BANC D'ESSAI.
//
// On ouvre la liste, on prend un exercice, on le joue pour de vrai, on le
// referme — et la fiche de notation s'ouvre TOUTE SEULE sur cet exercice-là.
// C'est le seul enchaînement qui tienne : demander à quelqu'un de rouvrir un
// panneau et de retrouver la bonne ligne après chaque essai, c'est garantir
// qu'il ne notera rien après le cinquième.
//
// Le carnet vit dans le navigateur de l'appareil qui teste — on peut donc
// interrompre la passe et la reprendre. Il en sort par « Copier » (le seul
// transfert fiable depuis un iPhone) ou par un fichier.

import { state } from '../core/state.js';
import { exercices } from '../data/catalog.js';
import { TAGS } from '../data/tags.js';
import {
    CRITERES, VERDICTS, decrireAppareil, nommerAppareil, nouveauCarnet, noter,
    ligneDe, avancement, versMarkdown, lire, fusionner, direClassement,
    lireRetest, marquerARetester, aRetester
} from '../core/bancEssai.js';
import { placer, restaurer, rendreDeplacable, isolerClavier } from './flottant.js';
// LA BIBLIOTHÈQUE DU QUOTIDIEN. Rémy : « tu les mets au banc de test pour
// pouvoir les gérer. » C'est le bon endroit : le banc d'essai est déjà l'écran
// où l'on regarde le contenu un par un en se demandant s'il tient la route.
import {
    GENRES, LIBELLES_GENRE, EMOJIS_GENRE, LISTES, comptes as comptesQuotidien,
    normaliser as normaliserQuotidien, entreeDuJour, apercu as apercuQuotidien
} from '../data/quotidien.js';

const CLE = 'mathbox-banc-essai';
let carnet = null;
let appareil = null;
let nomAppareil = '';
let filtre = 'restants';
let genreQuotidien = 'conseil';    // le genre affiché dans l'onglet « Le quotidien »

/**
 * LES VERDICTS DU TRI — « celle-là oui, celle-là non ».
 *
 * Rémy : « je peux aussi faire un retour sur les proverbes blagues et autres,
 * car il y en a à supprimer, mets un clic oui ou non et je te l'envoie. »
 *
 * Ils vivent dans le navigateur, et c'est voulu : ce sont des NOTES DE
 * RELECTURE, pas la liste elle-même. La liste, lue par toute une classe, se
 * versionne avec le code ; le tri, lui, est un travail en cours qui doit
 * survivre à un rechargement de page — on ne relit pas deux cents phrases d'une
 * traite — et se terminer par un copier-coller qu'on m'envoie.
 *
 * `{ conseil: { 3: false, 7: true, … } }` — l'index dans la liste, et le
 * verdict. Une entrée sans verdict n'est pas « à garder » : elle n'est pas
 * encore lue, et c'est une troisième valeur qui compte.
 */
const CLE_VERDICTS = 'atoutmath.quotidien.verdicts';
let verdictsQuotidien = (() => {
    try { return JSON.parse(localStorage.getItem(CLE_VERDICTS)) || {}; }
    catch { return {}; }
})();

function noterVerdict(genre, index, valeur) {
    if (!verdictsQuotidien[genre]) verdictsQuotidien[genre] = {};
    // Recliquer le même bouton l'efface : c'est le geste qu'on fait quand on
    // s'est trompé, et sans lui il faudrait tout remettre à zéro.
    if (verdictsQuotidien[genre][index] === valeur) delete verdictsQuotidien[genre][index];
    else verdictsQuotidien[genre][index] = valeur;
    try { localStorage.setItem(CLE_VERDICTS, JSON.stringify(verdictsQuotidien)); } catch { /* privé */ }
}

/**
 * LE TRI, PRÊT À M'ÊTRE ENVOYÉ.
 *
 * On rend les NUMÉROS ET LE DÉBUT DU TEXTE : un numéro seul serait illisible
 * pour un humain et faux dès que la liste bouge d'une entrée ; le texte seul
 * obligerait à le rechercher. Les deux ensemble se retrouvent toujours.
 */
export function verdictsEnTexte(genre) {
    const v = verdictsQuotidien[genre] || {};
    const jeter = [], garder = [];
    LISTES[genre].forEach((e, i) => {
        if (v[i] === undefined) return;
        const t = normaliserQuotidien(genre, e).texte;
        (v[i] ? garder : jeter).push(`${i + 1}. ${t.length > 90 ? t.slice(0, 88) + '…' : t}`);
    });
    const total = LISTES[genre].length;
    return `${LIBELLES_GENRE[genre]} — ${jeter.length + garder.length} relues sur ${total}\n\n`
        + `À SUPPRIMER (${jeter.length})\n${jeter.join('\n') || '(aucune)'}\n\n`
        + `À GARDER (${garder.length})\n${garder.join('\n') || '(aucune)'}`;
}
let ouvertSur = null;          // l'exercice à noter au retour du jeu

// --- Le carnet, gardé sur l'appareil ----------------------------------------

function versionChargee() {
    const el = document.getElementById('db-version');
    if (el && el.textContent) return el.textContent.trim();
    const lien = document.querySelector('link[href*="?v="]');
    const m = lien && lien.getAttribute('href').match(/\?v=([\w.-]+)/);
    return m ? `v${m[1]}` : '';
}

function charger() {
    appareil = decrireAppareil(window);
    nomAppareil = nommerAppareil(appareil);
    let garde = null;
    try { garde = lire(window.localStorage.getItem(CLE)); } catch (e) { garde = null; }
    carnet = garde || nouveauCarnet({ appareil, version: versionChargee(), date: Date.now() });
    // L'appareil et la version sont relus à chaque ouverture : on teste souvent
    // la même passe après une mise à jour, et c'est la version du moment qui
    // compte pour la ligne qu'on écrit maintenant.
    carnet.appareil = appareil;
    carnet.version = versionChargee();
}

function garder() {
    try { window.localStorage.setItem(CLE, JSON.stringify(carnet)); } catch (e) { /* privé */ }
}

// --- L'écran ----------------------------------------------------------------

/**
 * REPARTIR DE ZÉRO. Un carnet de test est un brouillon : on refait une passe
 * complète après un gros correctif, et les notes de la passe précédente ne
 * disent plus rien de la version qu'on regarde.
 *
 * On efface le carnet ET le rang de la barre — sinon « recommencer » redémarre
 * au quarante-huitième exercice, ce qui n'est pas recommencer. La POSITION de
 * la barre, elle, est un réglage de confort : elle survit.
 */
function viderCarnet(apres) {
    window.appConfirm('Vider le carnet de test',
        'Effacer toutes les notes de cet appareil et repartir du premier exercice ?<br><br>'
        + 'Ce qui a été exporté ou copié ailleurs n\'est pas touché.', () => {
            carnet = nouveauCarnet({ appareil, version: versionChargee(), date: Date.now() });
            garder();
            rangCourant = 0;
            try { window.localStorage.removeItem(CLE_BARRE); } catch (e) { /* privé */ }
            if (apres) apres();
        });
}

function assurerPanneau() {
    let el = document.getElementById('banc-essai');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'banc-essai';
    el.className = 'banc';
    el.innerHTML = `
        <style>
            .banc {
                position: fixed; inset: 0; z-index: 3000; display: none;
                flex-direction: column; background: var(--bg-app); color: var(--text-main);
            }
            .banc--ouvert { display: flex; }
            .banc-tete {
                display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
                padding: 10px 12px; border-bottom: 1px solid var(--border);
                background: var(--bg-panel); flex: 0 0 auto;
            }
            .banc-titre { font-weight: 800; font-size: 1rem; margin-right: auto; }
            .banc-appareil { font-size: .74rem; color: var(--text-muted); width: 100%; }
            .banc-btn {
                border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                border-radius: 9px; padding: 6px 11px; font: inherit; font-weight: 700;
                font-size: .82rem; cursor: pointer; min-height: 36px;
            }
            .banc-btn--fort { background: var(--primary); border-color: var(--primary); color: #fff; }
            .banc-corps { flex: 1 1 auto; overflow-y: auto; padding: 10px 12px 40px; }
            .banc-filtres { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
            .banc-chip {
                border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-muted);
                border-radius: 999px; padding: 5px 12px; font-size: .78rem; font-weight: 700;
                cursor: pointer; min-height: 32px;
            }
            .banc-chip--actif { background: var(--primary); border-color: var(--primary); color: #fff; }
            .banc-domaine {
                font-size: .74rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em;
                color: var(--text-muted); margin: 14px 0 6px;
            }
            .banc-ligne {
                display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
                border: 1px solid var(--border); border-radius: 11px; padding: 8px 10px;
                margin-bottom: 6px; background: var(--bg-panel);
            }
            .banc-nom { font-weight: 700; font-size: .9rem; flex: 1 1 160px; }
            .banc-sous { font-size: .7rem; color: var(--text-muted); font-weight: 500; }
            .banc-repris {
                display: block; font-size: .7rem; font-weight: 700;
                color: var(--warning, #b45309); margin-top: 2px;
            }
            .banc-niv {
                display: block; font-size: .68rem; font-weight: 700; color: var(--primary);
                letter-spacing: .02em;
            }
            .banc-etat { display: flex; gap: 3px; }
            .banc-pastille {
                width: 17px; height: 17px; border-radius: 50%; font-size: .62rem; font-weight: 800;
                display: flex; align-items: center; justify-content: center;
                background: var(--bg-hover); color: var(--text-muted);
            }
            .banc-pastille--ok { background: color-mix(in srgb, var(--success) 25%, transparent); color: var(--success); }
            .banc-pastille--moyen { background: color-mix(in srgb, #f59e0b 30%, transparent); color: #b45309; }
            .banc-pastille--ko { background: color-mix(in srgb, var(--danger) 25%, transparent); color: var(--danger); }
            .banc-actions { display: flex; gap: 5px; }
            .banc-vide { color: var(--text-muted); font-size: .86rem; padding: 20px 0; text-align: center; }

            /* LA FICHE DE NOTATION. Elle s'ouvre par-dessus la liste, à la
               place exacte où l'on en était : on note, on ferme, on continue. */
            .banc-fiche { position: fixed; inset: 0; z-index: 3010; display: none;
                flex-direction: column; background: var(--bg-app); }
            .banc-fiche--ouverte { display: flex; }
            .banc-critere { border-bottom: 1px solid var(--border); padding: 10px 0; }
            .banc-critere-titre { font-weight: 800; font-size: .9rem; }
            .banc-critere-q { font-size: .78rem; color: var(--text-muted); margin: 2px 0 7px; }
            .banc-verdicts { display: flex; gap: 6px; flex-wrap: wrap; }
            .banc-v {
                border: 1px solid var(--border); background: var(--bg-panel); color: var(--text-main);
                border-radius: 9px; padding: 7px 12px; font: inherit; font-weight: 700;
                font-size: .8rem; cursor: pointer; min-height: 38px; min-width: 44px;
            }
            .banc-v--ok.banc-v--pris { background: var(--success); border-color: var(--success); color: #fff; }
            .banc-v--moyen.banc-v--pris { background: #f59e0b; border-color: #f59e0b; color: #fff; }
            .banc-v--ko.banc-v--pris { background: var(--danger); border-color: var(--danger); color: #fff; }
            .banc-v--na.banc-v--pris { background: var(--text-muted); border-color: var(--text-muted); color: #fff; }
            .banc-champ {
                width: 100%; box-sizing: border-box; border: 1px solid var(--border);
                border-radius: 9px; padding: 8px; font: inherit; font-size: .88rem;
                background: var(--bg-panel); color: var(--text-main); min-height: 76px; resize: vertical;
            }
            .banc-sel {
                border: 1px solid var(--border); border-radius: 9px; padding: 7px;
                font: inherit; font-size: .84rem; background: var(--bg-panel);
                color: var(--text-main); min-height: 38px; max-width: 100%;
            }
            .banc-niveaux { display: flex; gap: 5px; flex-wrap: wrap; }
            .banc-etiq {
                display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--border);
                border-radius: 999px; padding: 5px 11px; font-size: .78rem; font-weight: 700;
                cursor: pointer; background: var(--bg-panel); min-height: 32px;
            }
            .banc-etiq--pris { background: var(--primary); border-color: var(--primary); color: #fff; }
            .banc-bloc { padding: 12px 0; }
            .banc-bloc h4 { margin: 0 0 6px; font-size: .84rem; }
            .banc-presume {
                background: color-mix(in srgb, var(--success) 12%, transparent);
                border-radius: 10px; padding: 8px 11px; font-size: .8rem; margin-bottom: 6px;
            }
            .banc-btn--vert { background: var(--success); border-color: var(--success); color: #fff; }
            .banc-coller {
                position: fixed; inset: 8% 5%; z-index: 3020; overflow-y: auto;
                background: var(--bg-panel); border: 1px solid var(--border);
                border-radius: 14px; padding: 14px; box-shadow: var(--shadow-lg);
            }
            .banc-coller h4 { margin: 0 0 6px; font-size: .95rem; }
            .banc-coller .banc-champ { min-height: 40vh; }
        </style>
        <div class="banc-tete">
            <span class="banc-titre">Banc d'essai</span>
            <button type="button" class="banc-btn banc-btn--fort" data-passe>▶▶ Passe guidée</button>
            <button type="button" class="banc-btn" data-copier>⧉ Copier le rapport</button>
            <button type="button" class="banc-btn" data-fichier>⤓ Fichier</button>
            <button type="button" class="banc-btn" data-reprendre>⧉ Reprendre un carnet</button>
            <button type="button" class="banc-btn" data-vider>Vider</button>
            <button type="button" class="banc-btn banc-btn--fort" data-fermer>Fermer</button>
            <span class="banc-appareil" data-appareil></span>
        </div>
        <div class="banc-corps" data-corps></div>
        <div class="banc-fiche" data-fiche></div>`;
    document.body.appendChild(el);
    // Le panneau se pose PAR-DESSUS un jeu qui tourne encore : ses écouteurs
    // clavier voyaient chaque touche tapée dans une remarque, et en mangeaient
    // une partie. Le clavier appartient au champ qui a le focus.
    isolerClavier(el);

    el.querySelector('[data-fermer]').onclick = () => fermer();
    el.querySelector('[data-passe]').onclick = () => {
        const suite = listeFiltree();
        const premier = suite[0];
        if (!premier) return import('./modal.js').then(m => m.showToast('Plus rien à passer ici.', 'success'));
        jouer(premier.id);
    };
    el.querySelector('[data-copier]').onclick = () => copierRapport();
    el.querySelector('[data-fichier]').onclick = () => telechargerRapport();
    el.querySelector('[data-reprendre]').onclick = () => demanderCarnet();
    el.querySelector('[data-vider]').onclick = () => viderCarnet(() => peindre());
    return el;
}

const domaineDe = (exo) => (exo.tags && exo.tags.chemin && exo.tags.chemin[0]) || 'Sans domaine';

function listeFiltree() {
    const av = avancement(carnet, exercices, nomAppareil);
    const restants = new Set(av.restants);
    if (filtre === 'restants') return exercices.filter(e => restants.has(e.id));
    if (filtre === 'ennuis') {
        return exercices.filter(e => {
            const l = ligneDe(carnet, e.id, nomAppareil);
            return l && Object.values(l.verdicts).some(v => v === 'ko' || v === 'moyen');
        });
    }
    if (filtre === 'retest') {
        const repris = new Set(aRetester(carnet).map(l => l.exercice));
        return exercices.filter(e => repris.has(e.id));
    }
    if (filtre === 'jeux') return exercices.filter(e => e.activityId);
    return exercices;
}

/**
 * L'ONGLET « LE QUOTIDIEN » — les quatre listes, et ce qui sortira.
 *
 * Rémy : « tu les mets au banc de test pour pouvoir les gérer. » Gérer, ici,
 * c'est trois choses, et rien de plus :
 *
 *   VOIR CE QUI SORT AUJOURD'HUI. C'est la seule entrée que trente élèves vont
 *   lire ce matin ; elle mérite d'être en haut, en grand.
 *
 *   VOIR CE QUI SORTIRA. Sept jours d'avance. C'est ce qui permet de VÉRIFIER
 *   que rien ne se répète, au lieu de le croire sur parole — et de repérer la
 *   blague qui tombera le jour du contrôle.
 *
 *   TOUT RELIRE. Cent entrées défilent vite, et c'est en les relisant qu'on
 *   trouve celle qu'on ne veut pas voir affichée dans SA classe.
 *
 * L'écriture, elle, reste dans les fichiers de données : une liste modifiable
 * depuis le navigateur vivrait sur UN appareil, ne partirait dans aucun PDF et
 * disparaîtrait au premier vidage de cache. Ce qui doit être partagé par toute
 * une classe se versionne avec le code.
 */
function quotidienHtml() {
    const g = GENRES.includes(genreQuotidien) ? genreQuotidien : 'conseil';
    const aujourdhui = normaliserQuotidien(g, LISTES[g][0]) && entreeDuJour(g);
    const suite = apercuQuotidien(g, 8).slice(1);
    const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const nomJour = (dans) => {
        const d = new Date(Date.now() + dans * 86400000);
        return `${JOURS[d.getDay()]} ${d.getDate()}`;
    };
    const carte = (v) => v ? `
        <div class="banc-q-texte">${echapper(v.texte)}</div>
        ${v.signature ? `<div class="banc-q-sign">— ${echapper(v.signature)}</div>` : ''}
        ${v.secret ? `<div class="banc-q-sec"><b>Réponse :</b> ${echapper(v.secret)}
            ${v.indice ? `<span class="banc-q-ind">Indice : ${echapper(v.indice)}</span>` : ''}</div>` : ''}`
        : '<div class="banc-vide">Cette liste est vide.</div>';

    return `
        <div class="banc-q-onglets">${comptesQuotidien().map(({ genre, libelle, n }) =>
        `<button type="button" class="banc-chip ${g === genre ? 'banc-chip--actif' : ''}"
             data-genre="${genre}">${EMOJIS_GENRE[genre]} ${libelle} (${n})</button>`).join('')}</div>

        <div class="banc-domaine">Aujourd'hui</div>
        <div class="banc-q-jour">${carte(aujourdhui)}</div>

        <div class="banc-domaine">Les sept prochains jours</div>
        <div class="banc-q-suite">${suite.map(p => `
            <div class="banc-q-ligne"><span class="banc-q-quand">${nomJour(p.dans)}</span>
                <span>${echapper(p.entree ? p.entree.texte : '')}</span></div>`).join('')}</div>

        <div class="banc-domaine">Toute la liste — ${LISTES[g].length} entrées</div>
        <div class="banc-critere-q">ON TRIE ICI, ON SUPPRIME DANS LE CODE. Rémy :
            « il y en a à supprimer, mets un clic oui ou non et je te l'envoie. »
            Chaque entrée porte donc deux boutons ; le verdict reste sur cet
            appareil, et le bouton du bas le rend en une liste à recopier. C'est
            ce qui permet de trier deux cents phrases sans en écrire une seule —
            et une liste modifiable depuis le navigateur ne vivrait que sur cet
            appareil, alors que ce qui est lu par toute une classe se versionne
            avec le code (<code>js/data/${g === 'enigme' ? 'enigmes' : g + 's'}.js</code>).</div>
        <div class="banc-q-actions">
            <button type="button" class="banc-chip" data-tri-copier>📋 Copier les verdicts</button>
            <button type="button" class="banc-chip" data-tri-vider>Tout remettre à zéro</button>
            <span class="banc-q-compte" data-tri-compte></span>
        </div>
        <ol class="banc-q-tout banc-q-tri">${LISTES[g].map((e, i) => {
        const v = normaliserQuotidien(g, e);
        const verdict = verdictsQuotidien[g] ? verdictsQuotidien[g][i] : undefined;
        return `<li class="banc-q-item${verdict === false ? ' banc-q-item--non' : ''}${verdict === true ? ' banc-q-item--oui' : ''}">
            <span class="banc-q-verdict">
                <button type="button" class="banc-q-oui${verdict === true ? ' est-choisi' : ''}"
                    data-verdict="${i}" data-valeur="oui" title="Garder">✓</button>
                <button type="button" class="banc-q-non${verdict === false ? ' est-choisi' : ''}"
                    data-verdict="${i}" data-valeur="non" title="Supprimer">✕</button>
            </span>
            <span class="banc-q-corps">${echapper(v.texte)}${v.signature
            ? ` <i>— ${echapper(v.signature)}</i>` : ''}${v.secret
            ? ` <b>→ ${echapper(v.secret)}</b>` : ''}</span></li>`;
    }).join('')}</ol>`;
}

function peindre() {
    const el = assurerPanneau();
    const av = avancement(carnet, exercices, nomAppareil);
    el.querySelector('[data-appareil]').textContent =
        `${nomAppareil} — ${carnet.version || 'version ?'} — ${av.vus} / ${av.total} passés`
        + ' · carnet gardé sur cet appareil, tu peux fermer et reprendre plus tard';

    const corps = el.querySelector('[data-corps]');
    const repris = aRetester(carnet).length;
    const chips = [
        ['restants', `À faire (${av.restants.length})`],
        ...(repris ? [['retest', `À retester (${repris})`]] : []),
        ['ennuis', 'Ce qui cloche'],
        ['jeux', 'Les jeux'],
        ['tous', `Tous (${exercices.length})`],
        ['quotidien', '📅 Le quotidien']
    ];
    const liste = listeFiltree();
    const parDomaine = new Map();
    liste.forEach(e => {
        const d = domaineDe(e);
        if (!parDomaine.has(d)) parDomaine.set(d, []);
        parDomaine.get(d).push(e);
    });

    const barreFiltres = `<div class="banc-filtres">${chips.map(([id, txt]) =>
        `<button type="button" class="banc-chip ${filtre === id ? 'banc-chip--actif' : ''}"
             data-filtre="${id}">${txt}</button>`).join('')}</div>`;

    corps.innerHTML = filtre === 'quotidien'
        ? barreFiltres + quotidienHtml()
        : `${barreFiltres}
        ${liste.length ? '' : '<div class="banc-vide">Rien dans cette liste.</div>'}
        ${[...parDomaine.entries()].map(([dom, exos]) => `
            <div class="banc-domaine">${echapper(dom)}</div>
            ${exos.map(e => ligneHtml(e)).join('')}`).join('')}`;

    corps.querySelectorAll('[data-filtre]').forEach(b => {
        b.onclick = () => { filtre = b.dataset.filtre; peindre(); };
    });
    corps.querySelectorAll('[data-genre]').forEach(b => {
        b.onclick = () => { genreQuotidien = b.dataset.genre; peindre(); };
    });
    // LE TRI DES LISTES DU QUOTIDIEN — voir `verdictsQuotidien`.
    corps.querySelectorAll('[data-verdict]').forEach(b => {
        b.onclick = () => {
            noterVerdict(genreQuotidien, Number(b.dataset.verdict), b.dataset.valeur === 'oui');
            peindre();
        };
    });
    const compte = corps.querySelector('[data-tri-compte]');
    if (compte) {
        const v = verdictsQuotidien[genreQuotidien] || {};
        const lues = Object.keys(v).length;
        const jetees = Object.values(v).filter(x => x === false).length;
        compte.textContent = lues
            ? `${lues} relues, dont ${jetees} à supprimer`
            : 'Aucune relue pour l\'instant.';
    }
    const copier = corps.querySelector('[data-tri-copier]');
    if (copier) copier.onclick = async () => {
        const texte = verdictsEnTexte(genreQuotidien);
        try {
            await navigator.clipboard.writeText(texte);
            copier.textContent = '✓ Copié — colle-le-moi';
        } catch {
            // Le presse-papiers est refusé hors HTTPS et sur certains
            // navigateurs : on montre alors le texte, il reste sélectionnable.
            copier.textContent = '📋 Copier les verdicts';
            const zone = document.createElement('textarea');
            zone.className = 'banc-q-export';
            zone.readOnly = true;
            zone.value = texte;
            copier.parentElement.after(zone);
            zone.select();
        }
        setTimeout(() => { copier.textContent = '📋 Copier les verdicts'; }, 2500);
    };
    const vider = corps.querySelector('[data-tri-vider]');
    if (vider) vider.onclick = () => {
        delete verdictsQuotidien[genreQuotidien];
        try { localStorage.setItem(CLE_VERDICTS, JSON.stringify(verdictsQuotidien)); } catch { /* privé */ }
        peindre();
    };
    corps.querySelectorAll('[data-jouer]').forEach(b => {
        b.onclick = () => jouer(b.dataset.jouer);
    });
    corps.querySelectorAll('[data-fiche-pdf]').forEach(b => {
        b.onclick = () => apercuFiche(b.dataset.fichePdf);
    });
    corps.querySelectorAll('[data-noter]').forEach(b => {
        b.onclick = () => ouvrirFiche(b.dataset.noter);
    });
}

function ligneHtml(exo) {
    const l = ligneDe(carnet, exo.id, nomAppareil);
    const pastilles = CRITERES.map(c => {
        const v = l && l.verdicts[c.id];
        const d = VERDICTS.find(x => x.id === v);
        return `<span class="banc-pastille ${v ? `banc-pastille--${v}` : ''}"
            title="${echapper(c.label)}">${d ? d.signe : '·'}</span>`;
    }).join('');
    const sd = (exo.tags && exo.tags.chemin && exo.tags.chemin[1]) || '';
    // LES NIVEAUX SE LISENT DANS LA LISTE. C'est ce qu'on vérifie en premier
    // quand on passe les exercices en revue : un exercice bien fait mais
    // annoncé pour le mauvais niveau ne servira jamais.
    const niveaux = ((exo.tags && exo.tags.niveaux) || []).join(' · ');
    // CE QUI A CHANGÉ SE LIT SUR LA LIGNE. Retester sans savoir ce qui a été
    // touché, c'est rejouer au hasard en espérant retomber sur le défaut.
    const repris = l && l.aRetester
        ? `<span class="banc-repris">↻ ${echapper(l.aRetester.quoi || 'repris')}</span>` : '';
    return `<div class="banc-ligne">
        <span class="banc-nom">${echapper(exo.title)}
            <span class="banc-sous">${echapper(sd)}${exo.activityId ? ` · ${echapper(exo.activityId)}` : ''}</span>
            <span class="banc-niv">${echapper(niveaux || 'aucun niveau')}</span>${repris}</span>
        <span class="banc-etat">${pastilles}</span>
        <span class="banc-actions">
            <button type="button" class="banc-btn" data-jouer="${exo.id}">▶</button>
            <button type="button" class="banc-btn" data-fiche-pdf="${exo.id}">🖨</button>
            <button type="button" class="banc-btn banc-btn--fort" data-noter="${exo.id}">Noter</button>
        </span>
    </div>`;
}

// --- Jouer, puis noter ------------------------------------------------------

/**
 * On lance l'exercice comme un élève le lancerait, et l'on guette la fermeture
 * de la couche de jeu pour rouvrir la fiche. Sans ce retour automatique, la
 * notation ne se fait pas.
 *
 * `internalStudentConfig` saute le panneau de réglages : sur cent exercices,
 * c'est cent fenêtres à valider pour retomber sur les réglages par défaut —
 * ceux que l'on veut justement vérifier.
 */
function jouer(id) {
    const exo = exercices.find(e => e.id === id);
    if (!exo) return;
    ouvertSur = id;
    fermer(true);
    import('../games/engine.js').then(m => {
        m.openGameLayer({ ...exo, internalStudentConfig: true, params: { ...(exo.params || {}) } });
        guetterRetour();
    });
}

/** L'exercice d'après dans la liste en cours : c'est lui qui s'enchaîne. */
function suivantDe(id) {
    const suite = listeFiltree();
    const i = suite.findIndex(e => e.id === id);
    // La liste « à faire » perd l'exercice qu'on vient de noter : le suivant
    // reprend donc sa place, et c'est celui-là qu'il faut lancer.
    if (i < 0) return suite[0] || null;
    return suite[i + 1] || null;
}

function guetterRetour() {
    const couche = document.getElementById('game-layer');
    if (!couche) return;
    const visible = () => couche.style.display && couche.style.display !== 'none';
    // On n'arme le guet qu'une fois le jeu VRAIMENT ouvert : la couche met un
    // instant à s'afficher (réglages, chargement du moteur), et guetter tout de
    // suite ferait croire à une fermeture immédiate.
    let arme = false;
    const obs = new MutationObserver(() => {
        if (visible()) { arme = true; return; }
        if (!arme) return;
        obs.disconnect();
        setTimeout(() => { ouvrir(); if (ouvertSur) ouvrirFiche(ouvertSur); }, 350);
    });
    obs.observe(couche, { attributes: true, attributeFilter: ['style'] });
    if (visible()) arme = true;
}

/** Cet exercice a-t-il une fiche papier ? Sinon le critère est sans objet. */
async function aUneFiche(exo) {
    const { aUneFichePapier } = await import('../core/registry.js');
    return aUneFichePapier(exo);
}

/**
 * L'aperçu papier. Tous les exercices n'en ont pas : on le dit.
 *
 * @param {string} id
 * @param {boolean} [flottant] - posé À CÔTÉ plutôt qu'en travers : la fenêtre
 *   reste ouverte pendant qu'on joue, qu'on écrit une remarque et qu'on passe
 *   à l'exercice suivant. C'est le mode de la barre de passe.
 */
function apercuFiche(id, flottant) {
    const exo = exercices.find(e => e.id === id);
    if (!exo) return;
    import('./printSheet.js').then(m => {
        import('../core/registry.js').then(({ aUneFichePapier }) => {
            if (!aUneFichePapier(exo)) {
                if (flottant) { fermerApercuFlottant(); return; }
                import('./modal.js').then(x => x.showToast(
                    'Cet exercice n\'a pas de fiche papier : c\'est une activité à l\'écran.', 'warning'));
                return;
            }
            m.ouvrirFicheModal(exo, { ...(exo.params || {}) }, null, { flottant: !!flottant });
        });
    });
}

// --- L'APERÇU QUI RESTE OUVERT ----------------------------------------------
//
// Regarder cent fiches à la suite, c'était cent fois : ouvrir la modale, la
// lire, la refermer, avancer d'un exercice, rouvrir. La fiche reste donc
// OUVERTE et c'est ELLE qui suit : à chaque ◀ ▶, elle se redessine sur
// l'exercice qu'on regarde.
//
// Elle reste une MODALE — Rémy : « quand la barre de début test, la modale
// d'impression doit être comme avant en prenant une partie de l'écran ». Ce
// qui la rendait incompatible avec une passe, c'est qu'elle capture les clics ;
// c'est donc la BARRE qui passe par-dessus (voir son z-index), et la fiche
// n'a rien à changer à ce qu'elle est.
//
// Un exercice sans fiche papier ne la vide pas d'un message d'erreur : elle se
// referme, et se rouvrira au prochain exercice qui en a une. Un avertissement
// répété tous les trois exercices pendant une passe n'est plus un
// avertissement, c'est du bruit.

const IDS_FICHE = ['print-sheet-modal', 'print-questions-modal'];
let apercuFlottant = false;

function fermerApercuFlottant() {
    // Toutes les fiches, ancrées comprises : l'aperçu de la passe est une
    // modale ordinaire, et c'est bien elle qu'on referme.
    IDS_FICHE.forEach(i => {
        const m = document.getElementById(i);
        if (m) m.style.display = 'none';
    });
}

/**
 * Ouvrir ou refermer l'aperçu qui accompagne la passe.
 *
 * L'état est PORTÉ PAR LE BOUTON de la barre, allumé tant que la fenêtre
 * suit. Sans ce témoin, un aperçu qui revient tout seul au troisième exercice
 * passe pour un bug — alors que c'est précisément ce qu'on a demandé.
 */
function basculerApercuFlottant() {
    apercuFlottant = !apercuFlottant;
    if (!apercuFlottant) fermerApercuFlottant();
    else apercuFiche(listeBarre()[rangCourant].id, true);
    majBoutonFiche();
}

/**
 * À chaque changement d'exercice, la fiche suit — tant que le bouton de la
 * barre est allumé.
 *
 * ELLE SUIVAIT AUTREFOIS « SI ELLE ÉTAIT ENCORE DÉTACHÉE », et s'arrêtait
 * sinon. Maintenant que la fiche de la passe est une modale comme les autres,
 * cette garde éteignait le suivi au tout premier ◀ ▶ : la barre avançait, la
 * fiche restait sur le premier exercice. Le suivi ne regarde donc plus
 * comment la fenêtre est posée, seulement si on le lui a demandé.
 */
function suivreApercuFlottant() {
    if (!apercuFlottant) return;
    apercuFiche(listeBarre()[rangCourant].id, true);
}

function majBoutonFiche() {
    const b = barre && barre.querySelector('[data-fiche]');
    if (!b) return;
    b.classList.toggle('bb-btn--actif', apercuFlottant);
    b.setAttribute('aria-pressed', String(apercuFlottant));
    b.title = apercuFlottant
        ? 'L\'aperçu suit les exercices — appuie pour l\'arrêter'
        : 'Garder l\'aperçu de la fiche à côté, d\'un exercice à l\'autre';
}

// --- La fiche de notation ---------------------------------------------------

/**
 * LA FICHE PART TOUTE VERTE, et l'on ne signale que les exceptions.
 *
 * Demander six verdicts sur cent exercices, c'est six cents gestes : la passe
 * s'arrête au dixième. Or dans l'immense majorité des cas il n'y a RIEN à
 * dire — et « rien à dire » est une information, pas un vide à remplir. On
 * présume donc que tout va bien, et l'on ne touche que ce qui cloche. Le cas
 * courant coûte alors UN geste : « Tout bon → suivant ».
 *
 * Le seul verdict que la machine sait poser seule est « sans objet » sur la
 * fiche papier : elle sait si l'exercice s'imprime.
 */
async function ouvrirFiche(id) {
    const exo = exercices.find(e => e.id === id);
    if (!exo) return;
    ouvertSur = id;
    const el = assurerPanneau();
    const fiche = el.querySelector('[data-fiche]');
    const l = ligneDe(carnet, id, nomAppareil);
    const papier = await aUneFiche(exo);
    const presume = {};
    CRITERES.forEach(c => { presume[c.id] = (c.id === 'fiche' && !papier) ? 'na' : 'ok'; });
    const verdicts = { ...presume, ...(l ? l.verdicts : {}) };
    const tagsInit = (l && l.tags) || {};
    const cheminInit = tagsInit.chemin || (exo.tags && exo.tags.chemin) || [];
    const niveauxInit = new Set(tagsInit.niveaux || (exo.tags && exo.tags.niveaux) || []);

    fiche.innerHTML = `
        <div class="banc-tete">
            <span class="banc-titre">${echapper(exo.title)}</span>
            <button type="button" class="banc-btn banc-btn--vert" data-suivant>Tout bon → suivant</button>
            <button type="button" class="banc-btn" data-rejouer>▶ Rejouer</button>
            <button type="button" class="banc-btn" data-pdf>🖨 Fiche</button>
            <button type="button" class="banc-btn banc-btn--fort" data-enregistrer>Enregistrer</button>
            <button type="button" class="banc-btn" data-annuler>Fermer</button>
            <span class="banc-appareil">${echapper(exo.id)}${exo.activityId
        ? ` · jeu ${echapper(exo.activityId)}` : ''} · ${echapper(direClassement({
            chemin: (exo.tags && exo.tags.chemin) || [], niveaux: (exo.tags && exo.tags.niveaux) || []
        }))} — noté sur ${echapper(nomAppareil)}</span>
        </div>
        <div class="banc-corps">
            <div class="banc-presume">Tout est présumé <b>bon</b>${papier ? ''
        : ', et la fiche papier « sans objet » (cet exercice ne s\'imprime pas)'}.
                Ne touche que ce qui cloche, puis <b>→ suivant</b>.</div>
            ${CRITERES.map(c => `
                <div class="banc-critere">
                    <div class="banc-critere-titre">${echapper(c.label)}</div>
                    <div class="banc-critere-q">${echapper(c.question)}</div>
                    <div class="banc-verdicts">${VERDICTS.map(v => `
                        <button type="button" class="banc-v banc-v--${v.id}
                            ${verdicts[c.id] === v.id ? 'banc-v--pris' : ''}"
                            data-critere="${c.id}" data-verdict="${v.id}">${v.signe} ${v.label}</button>`).join('')}
                    </div>
                </div>`).join('')}
            <div class="banc-bloc">
                <h4>Ce que tu as vu</h4>
                <textarea class="banc-champ" data-note
                    placeholder="Ce qui déborde, ce qui bloque, ce que l'indice aurait dû dire…">${
    echapper(l ? l.note : '')}</textarea>
            </div>
            <div class="banc-bloc">
                <h4>Où cet exercice se situe</h4>
                <div class="banc-critere-q">Le classement actuel est pré-rempli. Corrige-le si
                    l'exercice n'est pas au bon endroit : la proposition part dans le rapport.</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px">
                    <select class="banc-sel" data-domaine>
                        ${Object.values(TAGS.DOMAINE).map(d =>
        `<option ${cheminInit[0] === d ? 'selected' : ''}>${echapper(d)}</option>`).join('')}
                    </select>
                    <select class="banc-sel" data-sousdomaine>
                        ${Object.values(TAGS.SOUS_DOMAINE).map(d =>
        `<option ${cheminInit[1] === d ? 'selected' : ''}>${echapper(d)}</option>`).join('')}
                    </select>
                </div>
                <div class="banc-niveaux">${Object.values(TAGS.NIVEAU).map(n =>
        `<button type="button" class="banc-etiq ${niveauxInit.has(n) ? 'banc-etiq--pris' : ''}"
                        data-niveau="${echapper(n)}">${echapper(n)}</button>`).join('')}</div>
            </div>
            <div class="banc-bloc">
                <h4>Mots-clefs à ajouter</h4>
                <div class="banc-critere-q">Séparés par des virgules — « fractions », « révisions
                    brevet », « à deux »… Ils arrivent dans le rapport, je les range dans le code.</div>
                <input class="banc-sel" style="width:100%" data-ajouts
                    value="${echapper((tagsInit.ajouts || []).join(', '))}">
            </div>
        </div>`;

    fiche.classList.add('banc-fiche--ouverte');

    // LE BOUTON DIT CE QU'IL VA FAIRE. « Tout bon → suivant » sous une
    // remarque qu'on vient d'écrire laisse croire que la remarque part à la
    // poubelle — elle est bien enregistrée, mais rien ne le dit. Le libellé
    // suit donc l'état réel de la fiche.
    const boutonSuivant = fiche.querySelector('[data-suivant]');
    const majSuivant = () => {
        const note = (fiche.querySelector('[data-note]').value || '').trim();
        const parfait = !note && CRITERES.every(c => ['ok', 'na'].includes(verdicts[c.id]));
        boutonSuivant.textContent = parfait ? 'Tout bon → suivant' : 'Enregistrer → suivant';
        boutonSuivant.classList.toggle('banc-btn--vert', parfait);
        boutonSuivant.classList.toggle('banc-btn--fort', !parfait);
    };

    fiche.querySelectorAll('[data-verdict]').forEach(b => {
        b.onclick = () => {
            verdicts[b.dataset.critere] = b.dataset.verdict;
            fiche.querySelectorAll(`[data-critere="${b.dataset.critere}"]`)
                .forEach(x => x.classList.toggle('banc-v--pris', x === b));
            majSuivant();
        };
    });
    fiche.querySelector('[data-note]').oninput = majSuivant;
    majSuivant();
    fiche.querySelectorAll('[data-niveau]').forEach(b => {
        b.onclick = () => {
            const n = b.dataset.niveau;
            if (niveauxInit.has(n)) niveauxInit.delete(n); else niveauxInit.add(n);
            b.classList.toggle('banc-etiq--pris', niveauxInit.has(n));
        };
    });
    const enregistrer = () => {
        const chemin = [fiche.querySelector('[data-domaine]').value,
            fiche.querySelector('[data-sousdomaine]').value];
        const ajouts = fiche.querySelector('[data-ajouts]').value
            .split(',').map(s => s.trim()).filter(Boolean);
        const avant = (exo.tags && exo.tags.chemin) || [];
        const niveaux = [...niveauxInit];
        const avantNiv = (exo.tags && exo.tags.niveaux) || [];
        // On n'enregistre une PROPOSITION que si le classement change : un
        // rapport plein de propositions identiques à l'existant ne se lit plus.
        // Le classement courant, lui, part toujours — c'est lui qui met les
        // niveaux dans le rapport.
        const bouge = chemin.join('>') !== avant.join('>')
            || niveaux.slice().sort().join(',') !== avantNiv.slice().sort().join(',')
            || ajouts.length;
        carnet = noter(carnet, {
            exercice: id, titre: exo.title, activite: exo.activityId || '',
            appareilNom: nomAppareil, version: carnet.version, date: Date.now(),
            verdicts, note: fiche.querySelector('[data-note]').value,
            classement: { chemin: avant, niveaux: avantNiv },
            tags: bouge ? { chemin, niveaux, ajouts } : null
        });
        garder();
        fermerFiche();
        peindre();
    };

    fiche.querySelector('[data-rejouer]').onclick = () => { fermerFiche(); jouer(id); };
    fiche.querySelector('[data-pdf]').onclick = () => apercuFiche(id);
    fiche.querySelector('[data-annuler]').onclick = () => fermerFiche();
    fiche.querySelector('[data-enregistrer]').onclick = () => {
        enregistrer();
        import('./modal.js').then(m => m.showToast('Noté.', 'success'));
    };
    // LE GESTE UNIQUE : on note, et l'exercice suivant se lance dans la
    // foulée. Repasser par la liste entre chaque essai, c'est ce qui rendait
    // la passe interminable.
    fiche.querySelector('[data-suivant]').onclick = () => {
        enregistrer();
        const suite = suivantDe(id);
        if (!suite) {
            import('./modal.js').then(m => m.showToast('Passe terminée sur cette liste.', 'success'));
            return;
        }
        jouer(suite.id);
    };
}

function fermerFiche() {
    const el = document.getElementById('banc-essai');
    if (el) el.querySelector('[data-fiche]').classList.remove('banc-fiche--ouverte');
}

// --- Sortir le rapport ------------------------------------------------------

const nomFichier = () => `banc-${nomAppareil.replace(/[^\w]+/g, '-').toLowerCase()}`;

function rapport() {
    return versMarkdown(carnet, { titre: `Banc d'essai — ${nomAppareil}` })
        + '\n\n<!-- CARNET (ne pas modifier) -->\n```json\n'
        + JSON.stringify(carnet) + '\n```\n';
}

async function copierRapport() {
    const texte = rapport();
    const { showToast } = await import('./modal.js');
    try {
        await navigator.clipboard.writeText(texte);
        showToast('Rapport copié : colle-le dans la conversation.', 'success');
    } catch (e) {
        // Sur un navigateur qui refuse le presse-papiers sans geste direct, on
        // montre le texte : il reste sélectionnable à la main.
        const z = document.createElement('textarea');
        z.value = texte;
        z.style.cssText = 'position:fixed;inset:8% 5%;z-index:4000;width:90%;height:80%';
        document.body.appendChild(z);
        z.select();
        showToast('Sélectionne et copie ce texte, puis touche ailleurs.', 'warning');
        z.addEventListener('blur', () => z.remove());
    }
}

function telechargerRapport() {
    const blob = new Blob([rapport()], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${nomFichier()}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// --- Ouverture / fermeture --------------------------------------------------

export function ouvrirBancEssai() {
    if (!carnet) charger();
    const el = assurerPanneau();
    el.classList.add('banc--ouvert');
    peindre();
}

export function fermer(silencieux) {
    const el = document.getElementById('banc-essai');
    if (!el) return;
    el.classList.remove('banc--ouvert');
    fermerFiche();
    if (!silencieux) ouvertSur = null;
}

const ouvrir = () => {
    const el = document.getElementById('banc-essai');
    if (el) el.classList.add('banc--ouvert');
};

/**
 * Coller un rapport pour le reprendre. Deux usages, et c'est le même geste :
 * rapatrier ce qu'on a noté sur le téléphone quand on continue sur la
 * tablette, et récupérer son propre carnet si un navigateur a été vidé.
 */
function demanderCarnet() {
    const el = assurerPanneau();
    const zone = document.createElement('div');
    zone.className = 'banc-coller';
    zone.innerHTML = `
        <h4>Coller un carnet ou une consigne de retest</h4>
        <div class="banc-critere-q">Deux choses se collent ici, et le champ reconnaît
            laquelle. UN RAPPORT copié — celui de cet appareil après un incident, ou celui
            d'un autre appareil : les deux carnets s'ADDITIONNENT, une note prise sur le
            téléphone ne remplace pas celle prise sur la tablette. Ou UNE CONSIGNE DE
            RETEST — la ligne « RETEST v160 | exercice = ce qui a changé » que je renvoie
            après avoir corrigé : les exercices repris retournent dans « À faire », avec
            le rappel de ce qui a bougé.</div>
        <textarea class="banc-champ" data-colle placeholder="# Banc d'essai — …"></textarea>
        <div style="display:flex; gap:6px; margin-top:8px">
            <button type="button" class="banc-btn banc-btn--fort" data-ok>Reprendre</button>
            <button type="button" class="banc-btn" data-non>Annuler</button>
        </div>`;
    el.appendChild(zone);
    zone.querySelector('[data-non]').onclick = () => zone.remove();
    zone.querySelector('[data-ok]').onclick = async () => {
        const texte = zone.querySelector('[data-colle]').value;
        const { showToast } = await import('./modal.js');
        // La consigne de retest d'abord : elle est plus courte et plus
        // reconnaissable qu'un carnet, et c'est le cas le plus fréquent.
        const consigne = lireRetest(texte);
        if (consigne) {
            carnet = marquerARetester(carnet, consigne, Date.now());
            garder();
            filtre = 'retest';
            peindre();
            const combien = aRetester(carnet).length;
            showToast(combien
                ? `${combien} exercice(s) à retester${consigne.version ? ` en ${consigne.version}` : ''}.`
                : 'Aucun de ces exercices n\'est encore dans ton carnet — ils sont dans « À faire ».',
            combien ? 'success' : 'warning');
            zone.remove();
            return;
        }
        const avant = carnet.lignes.length;
        if (!importerCarnet(texte)) { showToast('Ce texte n\'est ni un carnet ni une consigne de retest.', 'warning'); return; }
        showToast(`Carnet repris : ${carnet.lignes.length - avant} note(s) de plus.`, 'success');
        zone.remove();
    };
}

/** Reprendre un carnet reçu d'un autre appareil, pour tout avoir au même endroit. */
export function importerCarnet(texte) {
    const autre = lire(texte);
    if (!autre) return false;
    if (!carnet) charger();
    carnet = fusionner(carnet, autre);
    garder();
    peindre();
    return true;
}

const echapper = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Le banc est un outil d'auteur : on l'atteint aussi depuis la console, sans
// avoir à retrouver le bouton dans une palette repliée.
if (typeof window !== 'undefined') {
    window.bancEssai = { ouvrir: ouvrirBancEssai, importer: importerCarnet };
}

// --- LA BARRE DE PASSE ------------------------------------------------------
//
// Le panneau du banc est une PAGE : il recouvre l'écran, il faut le fermer
// pour jouer, le rouvrir pour noter. Pour une passe de cent exercices, c'est
// le bon outil — on note six critères, on corrige un classement.
//
// Mais tester, la plupart du temps, ce n'est pas cela : c'est enchaîner les
// exercices en griffonnant une remarque quand quelque chose cloche. Cette
// barre-là tient sur une ligne, reste posée par-dessus le jeu, et ne sait
// faire que quatre choses : reculer, avancer, imprimer, écrire.
//
// LA REMARQUE S'ENREGISTRE TOUTE SEULE. Un champ de test qu'il faut penser à
// valider perd ce qu'on y a écrit dès qu'on change d'exercice — et l'on ne
// s'en aperçoit qu'à l'export, quand il est trop tard pour se souvenir.
//
// ELLE N'INVENTE AUCUN VERDICT. Écrire « le robot ne montre pas le nombre »
// dit qu'il y a quelque chose à voir, pas que les cinq autres critères sont
// bons. L'exercice reste donc « à faire » dans la passe complète : la barre
// dépose une remarque, elle ne signe pas une notation.

const CLE_BARRE = 'mathbox-banc-barre';
const CLE_BARRE_POS = 'mathbox-banc-barre-pos';

let barre = null;
let debrancherGlisse = null;
let rangCourant = 0;
let minuteurNote = null;

/** L'ordre de la barre : le catalogue entier, dans son ordre à lui. */
const listeBarre = () => exercices;

export function basculerBarreBanc() {
    if (barre) { fermerBarre(); return; }
    if (!carnet) charger();
    ouvrirBarre();
}

function fermerBarre() {
    ecrireNote(true);
    // La fenêtre d'aperçu appartient à la barre : elle s'en va avec elle.
    apercuFlottant = false;
    fermerApercuFlottant();

    if (debrancherGlisse) { debrancherGlisse(); debrancherGlisse = null; }
    if (barre) barre.remove();
    barre = null;
    try { window.localStorage.removeItem(CLE_BARRE); } catch (e) { /* privé */ }
}

function ouvrirBarre() {
    const suite = listeBarre();
    if (!suite.length) return;
    let repris = 0;
    try { repris = Number(window.localStorage.getItem(CLE_BARRE)) || 0; } catch (e) { repris = 0; }
    rangCourant = Math.max(0, Math.min(suite.length - 1, repris));

    barre = document.createElement('div');
    barre.id = 'banc-barre';
    barre.setAttribute('role', 'toolbar');
    barre.setAttribute('aria-label', 'Barre de passe du banc d\'essai');
    barre.innerHTML = `
        <button type="button" class="bb-grip" data-grip title="Déplacer la barre"
            aria-label="Déplacer la barre de passe">⠿</button>
        <button type="button" class="bb-btn" data-prec title="Exercice précédent"
            aria-label="Exercice précédent">◀</button>
        <button type="button" class="bb-titre" data-jouer
            title="Rejouer cet exercice"><span data-nom></span><b data-compte></b></button>
        <button type="button" class="bb-btn" data-suiv title="Exercice suivant"
            aria-label="Exercice suivant">▶</button>
        <button type="button" class="bb-btn" data-fiche title="Voir la fiche à imprimer"
            aria-label="Voir la fiche à imprimer">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M6 9V3h12v6"/><rect x="3.5" y="9" width="17" height="7" rx="2"/>
                <path d="M6 16h12v5H6z"/></svg></button>
        <textarea class="bb-note" data-note rows="1" maxlength="2000"
            placeholder="Une remarque sur cet exercice…"
            aria-label="Remarque sur cet exercice"></textarea>
        <span class="bb-etat" data-etat aria-live="polite"></span>
        <button type="button" class="bb-btn" data-export title="Exporter les remarques"
            aria-label="Exporter les remarques">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/>
                <path d="M4 20h16"/></svg></button>
        <button type="button" class="bb-btn bb-btn--vider" data-vider
            title="Vider le carnet de test et repartir du début"
            aria-label="Vider le carnet de test">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 6.5h16"/><path d="M9.5 6.5V4h5v2.5"/>
                <path d="M6.5 6.5 7.5 20h9l1-13.5"/><path d="M10.5 10v6M13.5 10v6"/></svg></button>
        <button type="button" class="bb-btn bb-btn--fermer" data-fermer title="Fermer la barre"
            aria-label="Fermer la barre">✕</button>`;
    document.body.appendChild(barre);

    // ELLE SE DÉPLACE, ET ELLE RETIENT SA PLACE. Posée en bas sur toute la
    // largeur, elle recouvrait le pavé de réponse d'un jeu sur trois.
    restaurer(barre, CLE_BARRE_POS, (el) => placer(el,
        (window.innerWidth - el.offsetWidth) / 2, window.innerHeight));
    debrancherGlisse = rendreDeplacable(barre, barre.querySelector('[data-grip]'), CLE_BARRE_POS);
    // ON PEUT ÉCRIRE DEDANS MÊME AU-DESSUS D'UN JEU. Sans cela, les écouteurs
    // clavier du jeu qui tourne dessous mangent les touches — et certaines
    // lettres ne s'écrivaient tout bonnement pas.
    isolerClavier(barre);

    barre.querySelector('[data-prec]').onclick = () => aller(-1);
    barre.querySelector('[data-suiv]').onclick = () => aller(1);
    barre.querySelector('[data-jouer]').onclick = () => lancerCourant();
    barre.querySelector('[data-fiche]').onclick = () => basculerApercuFlottant();
    majBoutonFiche();
    barre.querySelector('[data-export]').onclick = () => telechargerRapport();
    barre.querySelector('[data-fermer]').onclick = () => fermerBarre();
    barre.querySelector('[data-vider]').onclick = () => viderDepuisLaBarre();

    const champ = barre.querySelector('[data-note]');
    // ON N'ATTEND PAS LA VALIDATION : il n'y en a pas. Un demi-battement après
    // la dernière frappe, la remarque est dans le carnet.
    champ.oninput = () => {
        clearTimeout(minuteurNote);
        marquerEtat('…');
        minuteurNote = setTimeout(() => ecrireNote(), 500);
    };
    champ.onblur = () => ecrireNote(true);

    peindreBarre();
}

/** Vider depuis la barre : on efface, et l'on revient au premier exercice. */
function viderDepuisLaBarre() {
    viderCarnet(() => {
        peindreBarre();
        import('./modal.js').then(m => m.showToast(
            'Carnet vidé — on repart du premier exercice.', 'success'));
    });
}

/** On change d'exercice — la remarque en cours part au carnet AVANT. */
function aller(pas) {
    ecrireNote(true);
    const suite = listeBarre();
    rangCourant = (rangCourant + pas + suite.length) % suite.length;
    try { window.localStorage.setItem(CLE_BARRE, String(rangCourant)); } catch (e) { /* privé */ }
    peindreBarre();
    suivreApercuFlottant();
    lancerCourant();
}

/**
 * On lance l'exercice comme un élève le lancerait — mais SANS le guet de
 * retour du panneau : ici on ne revient pas sur une fiche de notation, on
 * reste dans la barre.
 */
function lancerCourant() {
    const exo = listeBarre()[rangCourant];
    if (!exo) return;
    import('../games/engine.js').then(m => {
        m.openGameLayer({ ...exo, internalStudentConfig: true, params: { ...(exo.params || {}) } });
    });
}

function peindreBarre() {
    if (!barre) return;
    const suite = listeBarre();
    const exo = suite[rangCourant];
    barre.querySelector('[data-nom]').textContent = exo.title;
    barre.querySelector('[data-compte]').textContent = `${rangCourant + 1} / ${suite.length}`;
    const l = ligneDe(carnet, exo.id, nomAppareil);
    barre.querySelector('[data-note]').value = (l && l.note) || '';
    marquerEtat(l && l.note ? '✓' : '');
}

function marquerEtat(texte) {
    const e = barre && barre.querySelector('[data-etat]');
    if (e) e.textContent = texte;
}

/**
 * La remarque dans le carnet, SANS toucher aux verdicts.
 *
 * Une remarque n'est pas une notation : elle dit qu'il y a quelque chose à
 * voir, pas que les cinq autres critères sont bons. On garde donc les verdicts
 * déjà rendus s'il y en a, et l'on n'en invente aucun sinon — l'exercice reste
 * « à faire » dans la passe complète, ce qui est la vérité.
 */
function ecrireNote(immediat) {
    if (!barre) return;
    clearTimeout(minuteurNote);
    const exo = listeBarre()[rangCourant];
    const champ = barre.querySelector('[data-note]');
    if (!exo || !champ) return;
    const texte = champ.value.trim();
    const l = ligneDe(carnet, exo.id, nomAppareil);
    if ((l ? l.note || '' : '') === texte) { if (immediat) marquerEtat(texte ? '✓' : ''); return; }
    // Rien à dire ET rien de noté : on n'ouvre pas une ligne pour du vide.
    if (!texte && !l) return;
    carnet = noter(carnet, {
        exercice: exo.id,
        titre: exo.title,
        activite: exo.activityId || '',
        appareilNom: nomAppareil,
        version: versionChargee(),
        date: Date.now(),
        verdicts: l ? l.verdicts : {},
        note: texte,
        classement: l ? l.classement : direClassement(exo),
        aRetester: l ? l.aRetester : null,
        tags: l ? l.tags : null
    });
    garder();
    marquerEtat(texte ? '✓' : '');
}
