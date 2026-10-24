// LE TRI AU POUCE — la revue du catalogue, un exercice à la fois.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « tu pourrais me faire, pour la revue du catalogue, sur téléphone, un
// fonctionnement pratique pour que je t'envoie ce que l'on garde ou non. »
//
// ── POURQUOI UN AUTRE ÉCRAN, ET PAS UN TABLEAU QUI SE PLIE ─────────────────
//
// La revue est un TABLEAU de deux cent vingt-quatre lignes et onze colonnes.
// C'est la bonne forme sur un ordinateur : on balaye, on compare, on trie par
// colonne. Sur un téléphone, les onze colonnes deviennent onze lignes par
// exercice, et il faut faire défiler deux mille lignes pour en trancher une.
//
// Ce n'est pas un problème de largeur, c'est un problème de GESTE. Sur un
// téléphone on ne compare pas : on décide, un objet après l'autre, avec le
// pouce. L'écran suit ce geste — UNE carte, TROIS boutons, et l'on passe à la
// suivante tout seul.
//
// ── « CE QU'ON GARDE OU NON » TIENT EN TROIS RÉPONSES ──────────────────────
//
// On garde · On met en test · On retire. Pas deux : « en test » est la réponse
// la plus fréquente quand on hésite, et sans elle on dirait « on garde » à tout
// ce qu'on n'a pas eu le temps de regarder.
//
// ET « PAS ENCORE LU » EST UNE QUATRIÈME VALEUR, celle qu'on ne tape pas : la
// confondre avec « on garde » validerait en bloc ce que personne n'a regardé.
// C'est la même règle que pour le tri des proverbes et celui des dingbats.
//
// ── CE QU'IL ÉCRIT, ET OÙ ──────────────────────────────────────────────────
//
// Dans le MÊME carnet que le tableau (`core/revue.js`) : une décision prise au
// téléphone se retrouve sur l'ordinateur, et la consigne à me coller est celle
// qui existait déjà. Un second carnet aurait divergé du premier au premier
// aller-retour.

import {
    ficheDe, decider, statutRevu, consigneStatuts, bilan, aChange
} from '../core/revue.js';
import { STATUS } from '../data/status.js';

const echapper = (s) => String(s ?? '')
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Où l'on en est dans la pile. Il survit à un redessin, pas à un rechargement. */
let rang = 0;
/** Ce qu'on montre : tout, ou seulement ce qui n'est pas tranché. */
let seulementANous = true;

/** Une décision n'est prise que si le carnet porte quelque chose pour elle. */
export function dejaTranche(revue, exo) {
    const f = ficheDe(revue, exo.id);
    return !!f && (f.retirer !== null || f.enTest !== null);
}

/**
 * LA PILE À TRIER, dans l'ordre du catalogue.
 *
 * ON NE RETIRE PAS UNE CARTE DÈS QU'ON L'A TRANCHÉE : elle reste à sa place
 * tant qu'on ne change pas de filtre. Sinon la pile se réorganise sous le pouce
 * à chaque appui, et le « précédent » ne ramène pas où l'on croit.
 */
export function pileDuTri(exercices, revue, { reste = true } = {}) {
    return reste ? exercices.filter(e => !dejaTranche(revue, e)) : exercices.slice();
}

/** Ce qu'il reste à faire, dit en une phrase — c'est la ligne qu'on lit d'abord. */
export function avancement(exercices, revue) {
    const faits = exercices.filter(e => dejaTranche(revue, e)).length;
    const b = bilan(revue, exercices);
    return {
        faits, total: exercices.length, reste: exercices.length - faits,
        retires: b.brouillons, enTest: b.enTest, changes: b.changes
    };
}

/** Les trois réponses possibles, et ce qu'elles écrivent dans le carnet. */
export const REPONSES = [
    { id: 'garder', nom: 'On garde', picto: '✓', statut: STATUS.VALIDE,
      quoi: { retirer: false, enTest: false } },
    { id: 'test', nom: 'À revoir', picto: '~', statut: STATUS.TEST,
      quoi: { retirer: false, enTest: true } },
    { id: 'retirer', nom: 'On retire', picto: '✕', statut: STATUS.BROUILLON,
      quoi: { retirer: true, enTest: null } }
];

// ── L'ÉCRAN ─────────────────────────────────────────────────────────────────

/** La carte d'un exercice : ce qu'il faut pour trancher, et rien de plus. */
function carte(exo, revue) {
    const f = ficheDe(revue, exo.id);
    const statut = statutRevu(exo, f);
    const tranche = dejaTranche(revue, exo);
    const choisi = (r) => tranche && statut === r.statut;

    // L'INSTRUCTION EST CE QU'ON LIT POUR TRANCHER. Pas le titre — il ne dit
    // que le nom — ni le code dicté, qui ne sert qu'à l'élève. On la coupe à
    // trois cents caractères : au-delà, on ne la lit plus sur un téléphone.
    const consigne = String(exo.instruction || '').trim();

    return `
        <div class="tt-carte">
            <div class="tt-haut">
                <span class="tt-rang">${rang + 1}</span>
                <span class="tt-statut tt-statut--${echapper(statut)}">${echapper(statut)}</span>
            </div>
            <h3 class="tt-titre">${echapper(exo.title || exo.id)}</h3>
            <div class="tt-id">${echapper(exo.id)}</div>
            ${consigne ? `<p class="tt-consigne">${echapper(consigne.slice(0, 300))}${
                consigne.length > 300 ? '…' : ''}</p>` : ''}
            ${aChange(exo, f) ? '<p class="tt-change">Tu as déjà changé son statut par rapport au code.</p>' : ''}

            <div class="tt-essais">
                <button type="button" class="tt-essai" data-essayer="${echapper(exo.id)}">
                    ▶ L'essayer</button>
            </div>

            <div class="tt-reponses" role="group" aria-label="Ta décision">
                ${REPONSES.map(r => `<button type="button"
                    class="tt-rep tt-rep--${r.id}${choisi(r) ? ' tt-rep--choisie' : ''}"
                    data-reponse="${r.id}" aria-pressed="${choisi(r)}">
                    <span class="tt-rep-picto">${r.picto}</span>
                    <span class="tt-rep-nom">${echapper(r.nom)}</span></button>`).join('')}
            </div>

            <label class="tt-remarque">Une remarque à me transmettre (facultatif)
                <input type="text" data-remarque="${echapper(exo.id)}" maxlength="300"
                    value="${echapper((f && f.remarque) || '')}"
                    placeholder="ce qui ne va pas, ce qu'il faudrait…"></label>
        </div>`;
}

/**
 * LE BLOC ENTIER.
 *
 * @param {Array}  exercices  le catalogue, déjà filtré par la revue
 * @param {Object} revue      le carnet
 */
export function triTelephoneHtml(exercices, revue) {
    const pile = pileDuTri(exercices, revue, { reste: seulementANous });
    const ou = Math.min(Math.max(0, rang), Math.max(0, pile.length - 1));
    rang = ou;
    const exo = pile[ou];
    const a = avancement(exercices, revue);

    const consigne = consigneStatuts(revue, exercices);

    return `
        <div class="tt-tete">
            <div class="tt-avance">
                <strong>${a.faits}</strong> tranchés sur ${a.total} —
                il en reste <strong>${a.reste}</strong>.
            </div>
            <div class="tt-jauge"><span style="width: ${
                a.total ? Math.round(a.faits / a.total * 100) : 0}%"></span></div>
            <!-- « Que ce qui reste », et non « Ne montrer que ce qui reste » :
                 la phrase entière prenait une ligne à elle seule sur un iPhone,
                 et cette ligne-là valait 34 px sur les 213 qui séparaient le
                 haut de l'écran de la première carte. Mesuré, pas supposé. -->
            <label class="tt-coche"><input type="checkbox" data-reste
                ${seulementANous ? 'checked' : ''}> Que ce qui reste</label>
        </div>

        ${exo ? carte(exo, revue) : `<p class="tt-fini">
            ${a.total ? 'Tout est tranché. Il ne reste plus qu\'à me l\'envoyer.'
                : 'Aucun exercice ne correspond aux filtres.'}</p>`}

        <div class="tt-pas">
            <button type="button" class="tt-pas-btn" data-pas="-1"
                ${ou <= 0 ? 'disabled' : ''}>← Précédent</button>
            <span class="tt-pas-ou">${pile.length ? `${ou + 1} / ${pile.length}` : '—'}</span>
            <button type="button" class="tt-pas-btn" data-pas="1"
                ${ou >= pile.length - 1 ? 'disabled' : ''}>Passer →</button>
        </div>

        <div class="tt-envoi">
            <div class="tt-consigne-titre">Ce que je recevrai</div>
            <!-- « tt- » DEVANT CES DEUX CROCHETS, ET C'EST UNE CORRECTION PAYÉE.
                 La tête de la revue porte DÉJÀ un bouton « data-consigne » et un
                 bouton « data-copier », et elle reste à l'écran au-dessus des
                 cartes. Un « querySelector('[data-consigne]') » désignait donc le
                 BOUTON de la tête et non cette zone de texte — la sonde lisait
                 « ce n'est pas un champ de saisie » en parlant d'un élément qui
                 n'était pas celui qu'on croyait. Deux couches du même panneau ne
                 partagent pas un nom de crochet. -->
            <textarea class="tt-consigne" data-tt-consigne readonly rows="3"
                aria-label="La consigne à m'envoyer">${echapper(consigne
                    || 'Rien n\'a encore changé par rapport au code.')}</textarea>
            <div class="tt-envoi-boutons">
                <button type="button" class="tt-env" data-tt-copier
                    ${consigne ? '' : 'disabled'}>📋 Copier pour me l'envoyer</button>
            </div>
            <p class="tt-note">Elle ne dit QUE ce qui change : reporter deux cents
                statuts identiques n'apprendrait rien, et trois lignes se relisent.</p>
        </div>`;
}

/**
 * Branche les commandes.
 *
 * @param {HTMLElement} zone
 * @param {Object} ctx  { exercices, revue, enregistrer(revue), redessiner(), essayer(id) }
 */
export function brancherTriTelephone(zone, ctx) {
    const pile = () => pileDuTri(ctx.exercices(), ctx.revue(), { reste: seulementANous });

    zone.querySelectorAll('[data-reponse]').forEach(b => {
        b.onclick = () => {
            const liste = pile();
            const exo = liste[Math.min(rang, liste.length - 1)];
            if (!exo) return;
            const r = REPONSES.find(x => x.id === b.dataset.reponse);
            ctx.enregistrer(decider(ctx.revue(), exo.id, r.quoi));
            // ON AVANCE TOUT SEUL : c'est ce qui fait qu'on en trie cinquante
            // dans une salle d'attente au lieu de cinq. Sauf sur la dernière,
            // où l'on resterait à regarder un écran vide.
            //
            // ET L'ON N'AVANCE PAS QUAND LA PILE SE RÉDUIT SOUS LE POUCE : avec
            // « ne montrer que ce qui reste », la carte tranchée disparaît, et
            // la suivante prend SA place. Avancer en plus en sauterait une.
            if (!seulementANous && rang < liste.length - 1) rang += 1;
            ctx.redessiner();
        };
    });

    zone.querySelectorAll('[data-pas]').forEach(b => {
        b.onclick = () => {
            rang = Math.max(0, Math.min(rang + Number(b.dataset.pas), pile().length - 1));
            ctx.redessiner();
        };
    });

    const reste = zone.querySelector('[data-reste]');
    if (reste) reste.onchange = () => { seulementANous = reste.checked; rang = 0; ctx.redessiner(); };

    // LA REMARQUE NE REDESSINE PAS L'ÉCRAN : on y perdrait le foyer à chaque
    // lettre, et l'on taperait une remarque un caractère à la fois. Payé trois
    // fois dans ce dépôt (`core/foyerDeLaSaisie.js`).
    zone.querySelectorAll('[data-remarque]').forEach(ch => {
        ch.oninput = () => {
            ctx.enregistrer(decider(ctx.revue(), ch.dataset.remarque, { remarque: ch.value }));
            const zoneC = zone.querySelector('[data-tt-consigne]');
            if (zoneC) zoneC.value = consigneStatuts(ctx.revue(), ctx.exercices())
                || 'Rien n\'a encore changé par rapport au code.';
        };
    });

    zone.querySelectorAll('[data-essayer]').forEach(b => {
        b.onclick = () => ctx.essayer(b.dataset.essayer);
    });

    const copier = zone.querySelector('[data-tt-copier]');
    if (copier) copier.onclick = async () => {
        const texte = consigneStatuts(ctx.revue(), ctx.exercices());
        if (!texte) return;
        try {
            await navigator.clipboard.writeText(texte);
            copier.textContent = '✓ Copié — colle-le-moi';
        } catch {
            // Le presse-papiers est refusé hors HTTPS et sur certains
            // navigateurs : le texte est déjà à l'écran, on le sélectionne.
            copier.textContent = '⚠ Copie refusée — le texte est sélectionné';
            const z = zone.querySelector('[data-tt-consigne]');
            if (z) { z.focus(); z.select(); }
        }
        setTimeout(() => { copier.textContent = '📋 Copier pour me l\'envoyer'; }, 2600);
    };
}

/** Repartir du début — la revue l'appelle quand ses filtres changent. */
export function remettreLeTriAuDebut() { rang = 0; }
