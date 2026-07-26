import { badgesCatalog } from '../core/gamification.js';
import { showModal } from './modal.js';

export function initGamificationUI() {
    document.addEventListener('badge_unlocked', (e) => {
        const badgeId = e.detail;
        const badgeDef = badgesCatalog[badgeId];
        
        if (!badgeDef) return;

        // Lancer les confettis
        if (typeof confetti !== 'undefined') {
            const duration = 3000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#3b82f6', '#10b981', '#f59e0b']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#3b82f6', '#10b981', '#f59e0b']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }

        // Afficher une belle modale de célébration
        const contentHTML = `
            <div style="text-align:center; padding:20px 0;">
                <div style="font-size:4rem; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">${badgeDef.icon}</div>
                <h2 style="color:var(--primary); font-size:2rem; margin:15px 0;">Badge Débloqué !</h2>
                <h3 style="color:var(--text-main); font-size:1.5rem; margin-bottom:10px;">${badgeDef.title}</h3>
                <p style="color:var(--text-muted); font-size:1.1rem; line-height:1.5;">${badgeDef.description}</p>
                <button class="badge-ok-btn" style="margin-top:25px; background:var(--primary); color:white; border:none; padding:12px 30px; border-radius:12px; font-size:1.2rem; cursor:pointer; font-weight:bold; box-shadow:0 4px 12px rgba(59,130,246,0.3);">Super !</button>
            </div>
        `;
        
        const modal = showModal('', contentHTML, { width: '450px' });
        
        const okBtn = modal.element.querySelector('.badge-ok-btn');
        if (okBtn) {
            okBtn.onclick = () => modal.close();
        }
    });
}
