// LES CLASSES DU SERVEUR, DANS L'APPLICATION.
//
// Rémy : « honnêtement j'ai dû chercher où étaient mes classes […] le Mes
// classes de la zone professeur est tellement nul, il faut un vrai espace et
// là dans cet espace, je ne peux rien configurer ».
//
// IL Y AVAIT DEUX « MES CLASSES », ET C'EST MOI QUI LES AI FABRIQUÉES.
//
//   · celui de l'application, écrit AVANT le serveur : on y crée une classe à
//     la main, et l'on y dépose les fichiers de progression que les élèves
//     envoient un par un. C'était la seule façon de suivre une classe quand il
//     n'y avait pas de serveur ;
//   · celui de `api/admin/`, écrit APRÈS : les vraies classes, les vrais
//     élèves, les billets, le verrou de séance, les mots au tableau.
//
// Depuis que le serveur existe, le premier ment. Il propose de créer une
// classe qui ne sera connue de personne, et d'importer des fichiers que plus
// aucun élève n'envoie — puisqu'ils se synchronisent tout seuls. Un professeur
// qui l'ouvre y cherche ses classes et ne les trouve pas : elles sont
// ailleurs, à une adresse qu'on ne lui a jamais donnée.
//
// CE MODULE RÉCONCILIE LES DEUX. Dès que le professeur est identifié auprès
// d'un serveur, l'écran montre SES classes — celles qui existent vraiment —
// avec, pour chacune, ce qu'il vient y chercher : le code à dicter, le nombre
// d'élèves, et les deux boutons qui mènent là où l'on agit. La grille de
// pastilles, elle, reste ce qu'elle est : l'analyse, et elle a toujours sa
// place en dessous.
//
// ON NE DÉPLACE PAS L'ADMINISTRATION DANS L'APPLICATION, et c'est délibéré.
// Conduire une séance — verrouiller, écrire un mot, débloquer un exercice —
// demande des pages qui marchent sans JavaScript, sur le poste de
// l'établissement, dans un navigateur inconnu. C'est ce que fait `api/admin/`,
// et le refaire ici serait le refaire moins bien. On donne le chemin, on ne
// duplique pas la maison.

import { jetonProf, nomDuProf, oublierProf } from '../core/verrouProf.js';
import { adresseApiDeduite } from '../core/portail.js';

/** L'adresse de l'administration, déduite comme celle de l'API. */
export function adresseAdmin() {
    return adresseApiDeduite().replace(/\/api$/, '') + '/api/admin/';
}

/**
 * Les classes du serveur, ou `null` si l'on n'est pas identifié.
 *
 * On rend `null` et non un tableau vide : « je ne sais pas » et « aucune
 * classe » ne s'affichent pas de la même façon, et les confondre ferait dire à
 * l'écran « vous n'avez aucune classe » à un professeur qui en a cinq.
 */
export async function classesDuServeur() {
    const j = jetonProf();
    if (!j || !j.token) return { pourquoi: 'pas-identifie' };
    try {
        const r = await fetch(adresseApiDeduite() + '/teacher/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + j.token },
            body: JSON.stringify({ action: 'list' }),
            signal: AbortSignal.timeout(8000)
        });
        // UN JETON PÉRIMÉ N'EST PAS UNE ABSENCE DE JETON, et les confondre
        // envoyait Rémy se reconnecter alors qu'il venait de le faire.
        // Le serveur change de secret quand on réinstalle : les jetons émis
        // avant ne valent plus rien, et il faut le DIRE.
        if (r.status === 401 || r.status === 403) {
            oublierProf();
            return { pourquoi: 'jeton-perime' };
        }
        if (!r.ok) return { pourquoi: 'serveur', code: r.status };
        const data = await r.json();
        if (!Array.isArray(data.classes)) return { pourquoi: 'reponse' };
        return data.classes;
    } catch (e) {
        return { pourquoi: 'reseau' };
    }
}

/** Créer une classe sur le serveur. Rend la liste à jour, ou `null`. */
export async function creerClasseServeur(nom, niveau = '') {
    const j = jetonProf();
    if (!j || !j.token) return null;
    const r = await fetch(adresseApiDeduite() + '/teacher/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + j.token },
        body: JSON.stringify({ action: 'create', name: nom, level: niveau || null }),
        signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) throw new Error('Le serveur a refusé (code ' + r.status + ').');
    const data = await r.json();
    return Array.isArray(data.classes) ? data.classes : null;
}

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Le bandeau des vraies classes, en tête de l'écran.
 *
 * @param {Array|null} liste  ce que rend `classesDuServeur()`
 */
export function bandeauServeurHtml(liste) {
    // DIRE CE QUI S'EST VRAIMENT PASSÉ, ET NON « identifiez-vous » À TOUT
    // HASARD. Rémy s'était identifié, voyait pourtant « identifiez-vous », et
    // n'avait aucun moyen de comprendre. Un message qui se trompe fait perdre
    // plus de temps qu'un message absent.
    if (!Array.isArray(liste)) {
        const pourquoi = (liste && liste.pourquoi) || 'pas-identifie';
        const phrases = {
            'pas-identifie': ['<b>Vos classes sont sur le serveur.</b> Identifiez-vous pour '
                + 'les voir ici : cliquez sur <b>Élève / Prof</b> en haut à gauche.'],
            'jeton-perime': ['<b>Votre connexion a expiré.</b> Cela arrive après une '
                + 'réinstallation du site : les anciennes connexions ne valent plus rien.',
                'Repassez en <b>Élève</b> puis en <b>Prof</b> pour retaper votre mot de passe.'],
            'serveur': ['<b>Le serveur a refusé la demande</b> (code '
                + ((liste && liste.code) || '?') + '). Vos classes existent, mais on ne '
                + 'peut pas les lire d\'ici pour l\'instant.'],
            'reponse': ['<b>Le serveur a répondu autre chose que ce qu\'on attendait.</b> '
                + 'Le site est peut-être à moitié à jour : reposez l\'archive complète.'],
            'reseau': ['<b>Le serveur ne répond pas.</b> Vérifiez la connexion — vos classes '
                + 'sont intactes, on ne les voit simplement pas.'],
        };
        const dit = (phrases[pourquoi] || phrases['pas-identifie'])
            .map(x => `<p>${x}</p>`).join('');
        return `<div class="cls-serveur cls-serveur--absent">${dit}
            <p class="cls-serveur-note">Celles ci-dessous sont des classes locales, propres
               à ce navigateur — elles ne connaissent aucun élève.</p>
        </div>`;
    }

    // LES DEUX LIENS QUI MENAIENT D'ICI VERS L'ADMINISTRATION ONT DISPARU, et
    // c'est une bonne nouvelle : conduire la séance et tenir la liste se font
    // maintenant DANS l'application (voir ui/espaceClasses.js), sans redemander
    // le mot de passe. Y laisser des liens vers des pages qui réclament une
    // autre connexion, ce serait renvoyer Rémy exactement là d'où on vient de
    // le sortir.
    //
    // L'adresse ne sert donc plus qu'au lien du bas : la santé du site et les
    // sauvegardes n'ont pas d'équivalent dans l'application, et n'en auront
    // pas — ces pages-là doivent marcher sans JavaScript, le jour où justement
    // plus rien ne marche.
    //
    // (Et l'on écrit ceci HORS du gabarit : un accent grave dans un commentaire
    // HTML posé dans un littéral de gabarit le referme. C'est arrivé en
    // écrivant ces lignes-ci.)
    const admin = esc(adresseAdmin());
    const cartes = liste.map(c => `
        <div class="cls-carte">
            <div class="cls-carte-haut">
                <b class="cls-nom">${esc(c.name)}</b>
                <span class="cls-n">${Number(c.student_count) || 0} élève${(Number(c.student_count) || 0) > 1 ? 's' : ''}</span>
            </div>
            <div class="cls-code">
                <span class="cls-code-eti">code de classe</span>
                <code>${esc(c.join_code)}</code>
            </div>
            ${Number(c.locked) ? '<div class="cls-verrou">⏸ classe en pause</div>' : ''}
        </div>`).join('');

    return `<div class="cls-serveur">
        <div class="cls-serveur-titre">
            <!-- Pas de second « Mes classes » : la fenêtre le dit déjà en
                 titre, et le répéter dix pixels plus bas donne l'impression
                 de deux écrans empilés — ce qui était justement le défaut. -->
            <span class="cls-serveur-qui">${esc(nomDuProf())}</span>
            <button type="button" class="cls-btn" data-classe-serveur-nouvelle>+ Nouvelle classe</button>
        </div>
        ${cartes || '<p class="cls-serveur-note">Aucune classe pour l\'instant. Créez-en une : '
            + 'vous obtiendrez un code à dicter, et une liste où coller vos élèves.</p>'}
        <p class="cls-serveur-note">
            <a href="${admin}index.php" target="_blank" rel="noopener">Ouvrir l'espace professeur</a>
            — listes, billets, santé du site.
        </p>
    </div>`;
}
