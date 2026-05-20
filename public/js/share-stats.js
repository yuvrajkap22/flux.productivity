// Simple Share Stats module
(function(){
  async function buildCardCanvas(options){
    // options: {theme:'dark'|'light', showHours:true, showStreak:true, showElo:true, viz:'heatmap'|'graph'|'both'}
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 2200; // high-res for download
    const ctx = canvas.getContext('2d');

    // Background
    if(options.theme==='light'){
      ctx.fillStyle = '#f7f2e8';
    } else {
      ctx.fillStyle = '#0b0b0d';
    }
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // Card panel
    const pad = 80; const cardW = canvas.width - pad*2; const cardH = canvas.height - pad*2;
    const cardX = pad; const cardY = pad;
    // panel background with soft vignette
    const grad = ctx.createLinearGradient(cardX, cardY, cardX, cardY+cardH);
    if(options.theme==='light'){
      grad.addColorStop(0,'#ffffff'); grad.addColorStop(1,'#fbf7ef');
    } else {
      grad.addColorStop(0,'#0f0f11'); grad.addColorStop(1,'#111213');
    }
    roundRect(ctx, cardX, cardY, cardW, cardH, 40, true, false, grad);

    // Title area
    ctx.fillStyle = options.theme==='light' ? '#241d17' : '#f4eadb';
    ctx.font = 'bold 70px "Space Grotesk", Inter, system-ui, sans-serif';
    const profileName = (window.FluxProfile?.data?.displayName) || window.FluxAuthState?.user?.displayName || 'Flux User';
    ctx.fillText(profileName, cardX+60, cardY+120);

    // Subtitle (username)
    ctx.font = '400 30px Inter, system-ui, sans-serif';
    ctx.fillStyle = options.theme==='light'? 'rgba(36,29,23,0.6)' : 'rgba(244,234,219,0.56)';
    const username = (window.FluxProfile?.data?.username) ? `@${window.FluxProfile.data.username}` : (window.FluxAuthState?.user?.email || '');
    ctx.fillText(username, cardX+60, cardY+160);

    // Stats blocks
    const statX = cardX+60; let statY = cardY+220; const statGap = 90;
    const stats = window.Flux.load('flux_stats',{sessions:{},totalTime:{},streak:0,longestStreak:0});
    const periodKey = (options.viz === 'heatmap' || options.viz === 'both') ? '30' : 'week';

    // compute basic aggregates
    const totalSeconds = Object.values(stats.totalTime||{}).reduce((a,b)=>a+(Number(b)||0),0);
    const totalMinutes = Math.round(totalSeconds/60);
    ctx.font = '600 48px "Space Grotesk", Inter, sans-serif';
    ctx.fillStyle = options.theme==='light' ? '#241d17' : '#fff';
    ctx.fillText(`${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m`, statX, statY);
    ctx.font = '400 16px Inter, sans-serif'; ctx.fillStyle = options.theme==='light' ? 'rgba(36,29,23,0.6)' : 'rgba(244,234,219,0.6)';
    ctx.fillText('Total Focus', statX, statY+28);

    // Day streak
    statY += statGap;
    ctx.font = '600 44px "Space Grotesk", Inter, sans-serif';
    ctx.fillStyle = options.theme==='light' ? '#241d17' : '#fff';
    ctx.fillText(`${stats.streak||0}d`, statX, statY);
    ctx.font = '400 16px Inter, sans-serif'; ctx.fillStyle = options.theme==='light' ? 'rgba(36,29,23,0.6)' : 'rgba(244,234,219,0.6)';
    ctx.fillText('Day Streak', statX, statY+28);

    // Rank placeholder
    statY += statGap;
    ctx.font = '600 44px "Space Grotesk", Inter, sans-serif';
    ctx.fillStyle = options.theme==='light' ? '#241d17' : '#fff';
    const elo = 'Silver';
    ctx.fillText(elo, statX, statY);
    ctx.font = '400 16px Inter, sans-serif'; ctx.fillStyle = options.theme==='light' ? 'rgba(36,29,23,0.6)' : 'rgba(244,234,219,0.6)';
    ctx.fillText('Rank', statX, statY+28);

    // Visualization area on right side of card
    const vizX = cardX + cardW - 560; const vizY = cardY + 200; const vizW = 480; const vizH = 900;
    if(options.viz === 'heatmap' || options.viz === 'both'){
      drawHeatmap(ctx, stats, vizX, vizY, 480, 300, options.theme);
      if(options.viz === 'both') drawLineChartOnCanvas(ctx, stats, vizX, vizY+340, 480, 220, options.theme);
    } else {
      drawLineChartOnCanvas(ctx, stats, vizX, vizY, 480, 360, options.theme);
    }

    // small footer
    ctx.font = '400 14px Inter, sans-serif'; ctx.fillStyle = options.theme==='light'? 'rgba(36,29,23,0.38)' : 'rgba(244,234,219,0.36)';
    ctx.fillText('Shared from Flux • Last 8 weeks', cardX+60, cardY + cardH - 40);

    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke, fillStyle){
    if (typeof r === 'undefined') r = 6;
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if(fill){ if(fillStyle && typeof fillStyle !== 'string') ctx.fillStyle = fillStyle; else if(fillStyle) ctx.fillStyle = fillStyle; ctx.fill(); }
    if(stroke){ ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function drawHeatmap(ctx, stats, x, y, w, h, theme){
    // 8-week heatmap: 8 columns x 7 rows
    const weeks = 8; const days = 7; const cellW = Math.floor(w / weeks); const cellH = Math.floor(h / days);
    // gather last 56 days
    const values = [];
    for(let i=56-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const key=d.toISOString().split('T')[0]; values.push((stats.totalTime?.[key]||0)/60); }
    const max = Math.max(...values,1);
    for(let col=0;col<weeks;col++){
      for(let row=0;row<days;row++){
        const idx = col*7 + row; const val = values[idx]||0; const intensity = val/max;
        let color;
        if(theme==='light') color = `rgba(135,95,35,${0.08 + intensity*0.7})`; else color = `rgba(245,166,35,${0.06 + intensity*0.7})`;
        ctx.fillStyle = color;
        const cx = x + col*cellW; const cy = y + row*cellH;
        roundRect(ctx, cx+6, cy+6, cellW-12, cellH-12, 6, true, false);
      }
    }
    // label
    ctx.font = '600 16px Inter, sans-serif'; ctx.fillStyle = theme==='light' ? '#241d17' : '#fff'; ctx.fillText('8-week activity heatmap', x, y - 14);
  }

  function drawLineChartOnCanvas(ctx, stats, x, y, w, h, theme){
    // build 30-day series
    const points = [];
    for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const key=d.toISOString().split('T')[0]; points.push(stats.totalTime?.[key]||0); }
    const max = Math.max(...points,1);
    // draw axes
    ctx.strokeStyle = theme==='light' ? 'rgba(36,29,23,0.08)' : 'rgba(244,234,219,0.06)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x,y+h); ctx.lineTo(x+w,y+h); ctx.stroke();
    // draw line
    ctx.beginPath();
    for(let i=0;i<points.length;i++){ const px = x + (w * i)/(points.length-1); const py = y + h - (points[i]/max)*h; if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py); }
    ctx.strokeStyle = theme==='light' ? '#c47a1a' : '#f5a623'; ctx.lineWidth = 3; ctx.stroke();
  }

  function downloadCanvas(canvas, filename){
    const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = filename; a.click();
  }

  // setup modal DOM
  function createModal(){
    if(document.getElementById('share-modal-backdrop')) return;
    const bd = document.createElement('div'); bd.id='share-modal-backdrop'; bd.className='share-modal-backdrop';
    const modal = document.createElement('div'); modal.className='share-modal';
    const grid = document.createElement('div'); grid.className='share-modal-grid';

    const preview = document.createElement('div'); preview.className='share-card-preview'; preview.id='share-card-preview';
    preview.textContent = 'Rendering preview...';

    const controls = document.createElement('div'); controls.className='share-controls';
    controls.innerHTML = `
      <h3>Share your stats</h3>
      <div class="share-row"><label>Theme</label><select id="share-theme"><option value="dark">Dark</option><option value="light">Light</option></select></div>
      <div class="share-row"><label>Visualization</label><select id="share-viz"><option value="heatmap">Heatmap</option><option value="graph">Graph</option><option value="both">Both</option></select></div>
      <div class="share-row share-toggle"><label><input type="checkbox" id="share-hours" checked/> Show Hours</label><label><input type="checkbox" id="share-streak" checked/> Show Streak</label></div>
      <div class="share-action"><button id="share-download" class="share-cta">Download PNG</button><button id="share-close" class="share-cta secondary">Close</button></div>
    `;

    grid.appendChild(preview); grid.appendChild(controls); modal.appendChild(grid); bd.appendChild(modal); document.body.appendChild(bd);

    bd.addEventListener('click', (ev)=>{ if(ev.target===bd) closeModal(); });
    document.getElementById('share-close').addEventListener('click', closeModal);

    // handlers
    document.getElementById('share-download').addEventListener('click', async ()=>{
      const btn = document.getElementById('share-download');
      const originalText = btn.textContent;
      try{
        btn.setAttribute('disabled','true');
        btn.innerHTML = '<span class="share-spinner" aria-hidden="true"></span>Preparing...';
        const opts = gatherOptions();
        const canvas = await buildCardCanvas(opts);
        downloadCanvas(canvas, `flux-stats-${Date.now()}.png`);
        btn.innerHTML = 'Saved ✓';
        btn.classList.add('share-success');
        setTimeout(()=>{ btn.classList.remove('share-success'); btn.innerHTML = originalText; btn.removeAttribute('disabled'); }, 1200);
      }catch(err){
        console.error('Share export failed', err);
        btn.innerHTML = originalText;
        btn.removeAttribute('disabled');
        try{ Flux.showToast && Flux.showToast('Export failed. Try again.','error'); }catch(e){}
      }
    });

    // live preview when options change
    ['share-theme','share-viz','share-hours','share-streak'].forEach(id=>{
      const el = document.getElementById(id); el && el.addEventListener('change', debounce(renderPreview, 300));
    });

    renderPreview();
  }

  function gatherOptions(){
    return {
      theme: document.getElementById('share-theme')?.value || 'dark',
      viz: document.getElementById('share-viz')?.value || 'heatmap',
      showHours: document.getElementById('share-hours')?.checked ?? true,
      showStreak: document.getElementById('share-streak')?.checked ?? true,
      showElo: false
    };
  }

  async function renderPreview(){
    const opts = gatherOptions();
    const preview = document.getElementById('share-card-preview');
    if(!preview) return;
    preview.innerHTML = '';
    const canvas = await buildCardCanvas(opts);
    // scaled preview
    const img = document.createElement('img'); img.src = canvas.toDataURL('image/png'); img.style.width = '100%'; img.style.height = 'auto'; img.style.borderRadius='12px';
    preview.appendChild(img);
  }

  function openModal(){ createModal(); const bd = document.getElementById('share-modal-backdrop'); bd.style.display='flex'; }
  function closeModal(){ const bd = document.getElementById('share-modal-backdrop'); if(bd) bd.style.display='none'; }

  function debounce(fn,wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

  // wire button
  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = document.getElementById('share-stats-btn'); if(!btn) return;
    btn.addEventListener('click', (ev)=>{ openModal(); FluxAudio.buttonClick(); });
  });

  // expose for testing
  window.FluxShare = { open: openModal };
})();
