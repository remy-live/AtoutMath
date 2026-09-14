// LE TRI DES LISTES DU QUOTIDIEN — « celle-là oui, celle-là non ».
//
// Rémy : « je peux aussi faire un retour sur les proverbes, blagues et autres,
// car il y en a à supprimer : mets un clic oui ou non et je te l'envoie. »
//
// CE BLOC VIVAIT DANS LE BANC D'ESSAI, et c'était le bon endroit tant que le
// banc existait : l'écran où l'on regarde le contenu un par un en se demandant
// s'il tient la route. Le banc a été retiré — quatre de ses six critères sont
// mesurés depuis, et le cinquième vivait déjà dans la revue —, mais ce tri-ci
// n'avait pas de doublon : il déménage donc dans la REVUE, qui est exactement
// le même geste sur un autre objet. Trier cent cinquante-deux exercices ou
// deux cents proverbes, c'est parcourir une longue liste, trancher une fois par
// ligne, et recoller une consigne.
//
// ON TRIE ICI, ON SUPPRIME DANS LE CODE. Les verdicts restent sur l'appareil :
// ce sont des NOTES DE RELECTURE, pas la liste elle-même. La liste, lue par
// toute une classe, se versionne avec le code ; le tri est un travail en cours
// qui doit survivre à un rechargement — on ne relit pas deux cents phrases
// d'une traite — et se termine par un copier-coller qu'on m'envoie.
//
// `{ conseil: { 3: false, 7: true, … } }` — l'index dans la liste, et le
// verdict. Une entrée sans verdict n'est pas « à garder » : elle n'est pas
// encore lue, et c'est une troisième valeur qui compte.

import {
    GENRES, LIBELLES_GENRE, EMOJIS_GENRE, LISTES, comptes as comptesQuotidien,
    normaliser as normaliserQuotidien, entreeDuJour, apercu as apercuQuotidien
} from '../data/quotidien.js';
import { figureSvg } from '../data/enigmesFigures.js';

const CLE_VERDICTS = 'atoutmath.quotidien.verdicts';

let verdicts = (() => {
    try { return JSON.parse(localStorage.getItem(CLE_VERDICTS)) || {}; }
    catch { return {}; }
})();

/** Le genre affiché — il survit d'un redessin à l'autre. */
let genre = 'conseil';

const echapper = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function garderVerdicts() {
    try { localStorage.setItem(CLE_VERDICTS, JSON.stringify(verdicts)); } catch { /* privé */ }
}

function noterVerdict(g, index, valeur) {
    if (!verdicts[g]) verdicts[g] = {};
    // Recliquer le même bouton l'efface : c'est le geste qu'on fait quand on
    // s'est trompé, et sans lui il faudrait tout remettre à zéro.
    if (verdicts[g][index] === valeur) delete verdicts[g][index];
    else verdicts[g][index] = valeur;
    garderVerdicts();
}

/**
 * LE TRI, PRÊT À M'ÊTRE ENVOYÉ.
 *
 * On rend les NUMÉROS ET LE DÉBUT DU TEXTE : un numéro seul serait illisible
 * pour un humain et faux dès que la liste bouge d'une entrée ; le texte seul
 * obligerait à le rechercher. Les deux ensemble se retrouvent toujours.
 */
export function verdictsEnTexte(g) {
    const v = verdicts[g] || {};
    const jeter = [], garder = [];
    LISTES[g].forEach((e, i) => {
        if (v[i] === undefined) return;
        const t = normaliserQuotidien(g, e).texte;
        (v[i] ? garder : jeter).push(`${i + 1}. ${t.length > 90 ? t.slice(0, 88) + '…' : t}`);
    });
    const total = LISTES[g].length;
    return `${LIBELLES_GENRE[g]} — ${jeter.length + garder.length} relues sur ${total}\n\n`
        + `À SUPPRIMER (${jeter.length})\n${jeter.join('\n') || '(aucune)'}\n\n`
        + `À GARDER (${garder.length})\n${garder.join('\n') || '(aucune)'}`;
}

/** Le bloc entier, à poser dans le corps d'un écran. */
export function quotidienHtml() {
    const g = GENRES.includes(genre) ? genre : 'conseil';
    const aujourdhui = normaliserQuotidien(g, LISTES[g][0]) && entreeDuJour(g);
    const suite = apercuQuotidien(g, 8).slice(1);
    const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const nomJour = (dans) => {
        const d = new Date(Date.now() + dans * 86400000);
        return `${JOURS[d.getDay()]} ${d.getDate()}`;
    };
    // L'EXPLICATION EST DANS LA CARTE, PAS SEULEMENT LA RÉPONSE.
    //
    // Rémy : « pour les énigmes, il faut quand même expliquer la réponse. » Il
    // a raison, et c'est même ce qui sépare une énigme d'une devinette : « 15 »
    // ne s'apprend pas, « chaque personne serre cinq mains et chaque poignée
    // est comptée deux fois » s'apprend, et resservira sur les diagonales d'un
    // polygone. C'est aussi ce qui permet au professeur de la poser en classe :
    // il faut pouvoir répondre à « pourquoi ? ».
    //
    // ET LA PETITE IMAGE, quand il y en a une : « tu peux faire des énigmes à
    // petites images vectorielles ». Elle ne remplace jamais l'énoncé — voir
    // `data/enigmesFigures.js` —, elle lui évite de décrire une figure.
    const carte = (v) => v ? `
        ${v.figure ? `<div class="banc-q-fig">${figureSvg(v.figure)}</div>` : ''}
        <div class="banc-q-texte">${echapper(v.texte)}</div>
        ${v.signature ? `<div class="banc-q-sign">— ${echapper(v.signature)}</div>` : ''}
        ${v.secret ? `<div class="banc-q-sec"><b>Réponse :</b> ${echapper(v.secret)}
            ${v.indice ? `<span class="banc-q-ind">Indice : ${echapper(v.indice)}</span>` : ''}</div>` : ''}
        ${v.explication ? `<div class="banc-q-exp">${echapper(v.explication)}</div>` : ''}`
        : '<div class="banc-vide">Cette liste est vide.</div>';

    return `
        <div class="banc-q-onglets">${comptesQuotidien().map(({ genre: id, libelle, n }) =>
        `<button type="button" class="banc-chip ${g === id ? 'banc-chip--actif' : ''}"
             data-genre="${id}">${EMOJIS_GENRE[id]} ${libelle} (${n})</button>`).join('')}</div>

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
        const verdict = verdicts[g] ? verdicts[g][i] : undefined;
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

/**
 * Branche les commandes du bloc.
 *
 * @param {HTMLElement} zone      - le conteneur qui vient de recevoir le HTML
 * @param {Function} redessiner   - à rappeler quand l'état change
 */
export function brancherQuotidien(zone, redessiner) {
    zone.querySelectorAll('[data-genre]').forEach(b => {
        b.onclick = () => { genre = b.dataset.genre; redessiner(); };
    });
    zone.querySelectorAll('[data-verdict]').forEach(b => {
        b.onclick = () => {
            noterVerdict(genre, Number(b.dataset.verdict), b.dataset.valeur === 'oui');
            redessiner();
        };
    });
    const compte = zone.querySelector('[data-tri-compte]');
    if (compte) {
        const v = verdicts[genre] || {};
        const lues = Object.keys(v).length;
        const jetees = Object.values(v).filter(x => x === false).length;
        compte.textContent = lues
            ? `${lues} relues, dont ${jetees} à supprimer`
            : 'Aucune relue pour l\'instant.';
    }
    const copier = zone.querySelector('[data-tri-copier]');
    if (copier) copier.onclick = async () => {
        const texte = verdictsEnTexte(genre);
        try {
            await navigator.clipboard.writeText(texte);
            copier.textContent = '✓ Copié — colle-le-moi';
        } catch {
            // Le presse-papiers est refusé hors HTTPS et sur certains
            // navigateurs : on montre alors le texte, il reste sélectionnable.
            copier.textContent = '📋 Copier les verdicts';
            const boite = document.createElement('textarea');
            boite.className = 'banc-q-export';
            boite.readOnly = true;
            boite.value = texte;
            copier.parentElement.after(boite);
            boite.select();
        }
        setTimeout(() => { copier.textContent = '📋 Copier les verdicts'; }, 2500);
    };
    const vider = zone.querySelector('[data-tri-vider]');
    if (vider) vider.onclick = () => {
        delete verdicts[genre];
        garderVerdicts();
        redessiner();
    };
}
