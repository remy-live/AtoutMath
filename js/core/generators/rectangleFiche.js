// PÉRIMÈTRE ET AIRE — sur le papier, avec le schéma.
//
// « Périmètre d'un rectangle de 7 cm sur 3 cm ? » écrit en toutes lettres est
// un exercice de calcul ; LE MÊME AVEC LE RECTANGLE DESSINÉ est un exercice de
// géométrie. La différence n'est pas décorative : c'est en regardant la figure
// qu'on voit qu'un périmètre fait le tour et qu'une aire remplit — et c'est la
// confusion des deux qui coûte le plus de points au collège.
//
// La fiche demande donc les DEUX sur le même rectangle quand on le veut : le
// même dessin, deux lignes à remplir, et l'on ne peut plus répondre par
// réflexe.

import { makeItem } from '../items.js';

export const rectangleFicheGenerator = {
    id: 'mes.rectangle-fiche',
    label: 'Périmètre et aire d\'un rectangle',
    skills: ['mes.perimetre.rectangle', 'mes.aire.rectangle'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'quoi', type: 'select', label: 'Ce qu\'on demande', default: 'les-deux',
            options: [
                { value: 'perimetre', label: 'Le périmètre seulement' },
                { value: 'aire', label: 'L\'aire seulement' },
                { value: 'les-deux', label: 'Les deux sur la même figure' }
            ]
        },
        { id: 'max', type: 'number', label: 'Dimension maximale', default: 12, min: 3, max: 30 },
        { id: 'unite', type: 'select', label: 'Unité', options: ['cm', 'm'], default: 'cm' }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const u = p.unite === 'm' ? 'm' : 'cm';
        const max = Math.max(3, Math.min(30, Number(p.max) || 12));
        const quoi = ['perimetre', 'aire', 'les-deux'].includes(p.quoi) ? p.quoi : 'les-deux';

        // LES SIX RECTANGLES D'UNE FICHE SONT DESSINÉS À LA MÊME ÉCHELLE — un
        // 4 cm y est visiblement plus court qu'un 10 cm. Pour que ça reste
        // lisible, on ne tire pas des longueurs sur toute la plage : sous la
        // moitié du maximum la figure deviendrait un timbre-poste à côté des
        // autres.
        const tirer = () => {
            const L = rng.int(Math.max(3, Math.ceil(max * 0.6)), max);
            // Jamais un carré : « longueur × largeur » avec deux fois le même
            // nombre laisse croire qu'on peut prendre n'importe lequel des
            // côtés. Et jamais plus des sept dixièmes : il faut voir d'un coup
            // d'œil lequel des deux côtés est la longueur.
            return { L, l: rng.int(2, Math.max(2, Math.floor(L * 0.7)))};
        };

        // DEUX FOIS LE MÊME RECTANGLE SUR UNE FEUILLE, c'est un élève qui
        // recopie sa réponse au lieu de la calculer. La réserve est petite
        // (une dizaine de longueurs, autant de largeurs), donc le doublon
        // arrive vite : on redemande tant qu'il reste des couples à prendre.
        const deja = new Set(ctx.themesExclus || []);
        let d = tirer();
        for (let i = 0; i < 40 && deja.has(`${d.L}x${d.l}`); i++) d = tirer();
        const { L, l } = d;
        const perimetre = 2 * (L + l);
        const aire = L * l;

        const demande = quoi === 'les-deux' ? ['perimetre', 'aire'] : [quoi];
        const reponse = demande
            .map(d => (d === 'aire' ? `${aire} ${u}²` : `${perimetre} ${u}`)).join(' | ');

        return makeItem({
            seed: rng.seed,
            generatorId: 'mes.rectangle-fiche',
            skillId: demande[0] === 'aire' ? 'mes.aire.rectangle' : 'mes.perimetre.rectangle',
            answerKind: 'grid',
            prompt: {
                text: `Rectangle de ${L} ${u} sur ${l} ${u}.`,
                papier: `Rectangle de ${L} ${u} sur ${l} ${u}.`,
                html: `<div class="game-question">Rectangle ${L} × ${l}</div>`
            },
            answer: reponse,
            explanation: demande.map(d => (d === 'aire'
                ? `Aire = ${L} × ${l} = ${aire} ${u}²`
                : `Périmètre = 2 × (${L} + ${l}) = ${perimetre} ${u}`)).join(' ; ') + '.',
            difficulty: quoi === 'les-deux' ? 3 : 2,
            // « max » voyage avec l'item : c'est lui qui donne l'échelle
            // commune à toute la fiche, sans quoi chaque rectangle se
            // dessinerait à sa propre taille.
            // « theme » est le canal par lequel la fiche dit au générateur ce
            // qu'elle a déjà tiré ; ici c'est le couple de dimensions.
            meta: { L, l, u, quoi, demande, perimetre, aire, max, theme: `${L}x${l}` }
        });
    }
};
