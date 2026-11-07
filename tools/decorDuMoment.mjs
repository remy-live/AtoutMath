import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';
const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
// 1 · le professeur pose le décor du moment, par le chemin du logiciel.
const pose = await s.page.evaluate(async () => {
    const { reglagesDuSite } = await import('./js/core/espaceProf.js');
    const r = await reglagesDuSite({ decorDuMoment: 'noel' });
    return { erreur: r.erreur, rendu: r.reglages && r.reglages.decorDuMoment };
});
console.log('1 · posé :', JSON.stringify(pose));
// 2 · ce que le réglage PUBLIC en dit — c'est lui que lit l'élève.
const publics = await s.page.evaluate(async () => {
    const { chargerReglagesSite } = await import('./js/core/reglagesSite.js');
    const { adresseApiDeduite } = await import('./js/core/portail.js');
    const { getSyncConfig } = await import('./js/core/sync.js');
    const r = await chargerReglagesSite(adresseApiDeduite(getSyncConfig().apiUrl));
    return r && r.decorDuMoment;
});
console.log('2 · au public :', JSON.stringify(publics));
// 3 · et une valeur inconnue n'entre pas.
const refus = await s.page.evaluate(async () => {
    const { reglagesDuSite } = await import('./js/core/espaceProf.js');
    const r = await reglagesDuSite({ decorDuMoment: 'pirate' });
    return r.reglages && r.reglages.decorDuMoment;
});
console.log('3 · « pirate » :', JSON.stringify(refus));
// 4 · ET L'ÉLÈVE LE VOIT — c'est la seule mesure qui compte.
await s.page.evaluate(async () => {
    const { reglagesDuSite } = await import('./js/core/espaceProf.js');
    await reglagesDuSite({ decorDuMoment: 'noel' });
    const { chargerReglagesSite } = await import('./js/core/reglagesSite.js');
    const { adresseApiDeduite } = await import('./js/core/portail.js');
    const { getSyncConfig } = await import('./js/core/sync.js');
    await chargerReglagesSite(adresseApiDeduite(getSyncConfig().apiUrl));
});
const vu = await s.page.evaluate(async () => {
    const { construireCarte } = await import('./js/ui/pathView.js');
    const etapes = ['a1', 'a2'].map((id, i) => ({ stepId: id, title: 'E' + i, nbItems: 3,
        exercise: { title: 'E' + i, tags: { chemin: ['Calcul mental'] } } }));
    // SANS RIEN IMPOSER : c'est le cas de l'élève qui n'a touché à rien.
    const carte = construireCarte(etapes, { style: 'chemin', doneIds: new Set(), currentIndex: 0,
        decor: (await import('./js/ui/pathView.js')).decorDeLaSeance({ decor: 'libre' }) });
    return { classes: carte.className, ornements: carte.querySelectorAll('.decor-ornement').length };
});
console.log('4 · chez l\'élève, sans rien imposer :', JSON.stringify(vu));
console.log('erreurs :', s.erreurs.slice(0, 2).join(' | '));
await s.fermer();
