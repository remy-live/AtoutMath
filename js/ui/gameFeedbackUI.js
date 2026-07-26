export function initGameFeedbackUI() {
    document.addEventListener('game_feedback', (e) => {
        const { msg, isError } = e.detail;

        if (isError) {
            const overlay = document.createElement('div');
            overlay.innerHTML = `<div style="margin-bottom:5px; color:var(--danger);"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div><div style="font-size:1.1rem; font-weight:bold; text-align:center; max-width:100%; line-height:1.4;">${msg}</div>`;
            overlay.style = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:white; z-index:10000; display:flex; flex-direction:column; justify-content:center; align-items:center; color:var(--danger); animation: popInCenter 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding: 20px 30px; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.15); border:2px solid #fecaca; min-width:250px;";
            const gameLayer = document.getElementById('game-layer') || document.body;
            gameLayer.appendChild(overlay);
            
            setTimeout(() => {
                overlay.style.opacity = '0';
                overlay.style.transform = 'translate(-50%, -50%) scale(0.9)';
                overlay.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                setTimeout(() => overlay.remove(), 300);
            }, 2000);
        } else {
            // Fallback for non-error texts (success)
            const fb = document.getElementById('game-feedback');
            if(!fb) return;
            fb.textContent = msg;
            fb.style.display = 'flex';
            fb.style.color = 'var(--success)';
            fb.style.backgroundColor = '#dcfce7';
            fb.style.borderColor = '#86efac';
            setTimeout(() => fb.style.display = 'none', 3000);
        }
    });
}
