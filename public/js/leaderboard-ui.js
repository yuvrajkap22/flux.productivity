!function(){
  const fmt=(n)=>"number"==typeof n?n.toLocaleString():n||"0";
  const fmtMetric=(metric,val)=>{const v=Number(val)||0;return"focusMinutesTotal"===metric?`${fmt(v)} min`:"sessionsTotal"===metric?`${fmt(v)} sessions`:"tasksDoneTotal"===metric?`${fmt(v)} tasks`:fmt(v)};
  const formatHandle=(u)=>{const t=(u?.username||"").trim();return t?t.startsWith("@")?t:`@${t}`:""};
  function safeStr(s){return null==s?"":String(s)}
  function avatarCol(u){const wrap=document.createElement("div");wrap.className="avatar-col";const src=window.FluxAuthUtils?.resolveAvatarSource?.(u.photoURL,u.displayName)||u.photoURL; if(src&&/^https?:\/\//i.test(src)){const i=document.createElement("img");i.src=src;i.alt=safeStr(u.displayName||"Profile");wrap.appendChild(i);} else if(src&&/^data:image\//i.test(src)){const i=document.createElement("img");i.src=src;i.alt=safeStr(u.displayName||"Profile");wrap.appendChild(i);} else {const i=document.createElement("div");i.className="initials";i.textContent=(safeStr(u.displayName||"User")[0]||"F").toUpperCase();wrap.appendChild(i);}return wrap}

  function render(container,last){
    window._fluxLeaderboardLast=last;container.replaceChildren();
    const meUid=window.FluxAuth?.user?.()?.uid||null;

    const header=(()=>{
      const el=document.createElement("div");el.className="leaderboard-header";
      const titleWrap=document.createElement("div");titleWrap.className="leaderboard-title";
      const heading=document.createElement("div");heading.className="leaderboard-heading";
      const h1=document.createElement("h1");h1.textContent="Leaderboard";
      const subtitle=document.createElement("div");subtitle.className="leaderboard-subtitle";subtitle.textContent="Global focus race for active users";
      const badge=document.createElement("div");badge.className="leaderboard-badge";badge.textContent="LIVE";
      heading.appendChild(h1);heading.appendChild(subtitle);titleWrap.appendChild(heading);titleWrap.appendChild(badge);
      const actions=document.createElement("div");actions.className="leaderboard-actions";
      const tabs=document.createElement("div");tabs.className="leaderboard-tabs";tabs.setAttribute("role","tablist");
      [{key:"today",label:"Today"},{key:"week",label:"This Week"},{key:"month",label:"This Month"}].forEach(t=>{const b=document.createElement("button");b.className="tab";b.type="button";b.dataset.leaderRange=t.key;b.textContent=t.label;b.setAttribute("aria-label",`Range ${t.label}`);tabs.appendChild(b)});
      const metricTabs=document.createElement("div");metricTabs.className="leaderboard-tabs";[{key:"focusMinutesTotal",label:"Focus"},{key:"sessionsTotal",label:"Sessions"},{key:"tasksDoneTotal",label:"Tasks"}].forEach(t=>{const b=document.createElement("button");b.className="tab";b.type="button";b.dataset.leaderMetric=t.key;b.textContent=t.label;b.setAttribute("aria-label",`Metric ${t.label}`);metricTabs.appendChild(b)});
      const cta=document.createElement("button");cta.className="leaderboard-cta";cta.type="button";cta.textContent="Sign in to compete";cta.addEventListener("click",()=>{try{if(document.getElementById("auth-google-btn"))return void document.getElementById("auth-google-btn").click()}catch(e){}location.href="login.html"});
      actions.appendChild(metricTabs);actions.appendChild(cta);
      el.appendChild(titleWrap);el.appendChild(tabs);el.appendChild(actions);
      return el;
    })();

    container.appendChild(header);

    const metricSel=window._fluxLeaderboardMetric||"focusMinutesTotal";
    header.querySelectorAll("[data-leader-metric]").forEach(n=>n.setAttribute("aria-pressed","false"));
    const activeMetric=header.querySelector(`[data-leader-metric="${metricSel}"]`); activeMetric&&activeMetric.classList.add("active");
    const rangeSel=window._fluxLeaderboardRange||"week";
    header.querySelectorAll("[data-leader-range]").forEach(n=>n.setAttribute("aria-pressed","false"));
    const activeRange=header.querySelector(`[data-leader-range="${rangeSel}"]`); activeRange&&activeRange.classList.add("active");
    activeMetric&&activeMetric.setAttribute("aria-pressed","true"); activeRange&&activeRange.setAttribute("aria-pressed","true");

    const ctaBtn=header.querySelector(".leaderboard-cta"); const authUser=window.FluxAuth?.user?.()||window.FluxAuthState?.user; if(ctaBtn) ctaBtn.style.display = authUser && !authUser.isGuest ? 'none' : 'inline-flex';

    const body=document.createElement("div");body.className="leaderboard-body";

    // Podium
    const podWrap=document.createElement("div");podWrap.className="leader-podium-wrap";
    (function(el,users,me,metric){
      const top=users.slice(0,3);
      const wrap=document.createElement("div");
      wrap.className="leader-podium";
      if(!top.length){const empty=document.createElement("div");empty.className="leaderboard-empty";empty.textContent="No active competitors in this range yet.";el.appendChild(empty);return}
      const order = top.length>=3 ? [1,0,2] : top.map((_,i)=>i);
      order.forEach((idx,place)=>{
        const u=top[idx]; const rank = idx+1;
        const slot=document.createElement("div"); slot.className = `podium-slot rank-${rank}` + (u.id===me?" me":"");
        const med=document.createElement("div"); med.className="medal"; med.textContent = rank===1?"🥇":rank===2?"🥈":"🥉";
        const rnum=document.createElement("div"); rnum.className="rank"; rnum.textContent = `#${rank}`;
        const avatar=document.createElement("div"); avatar.className="avatar";
        const src=window.FluxAuthUtils?.resolveAvatarSource?.(u.photoURL,u.displayName)||u.photoURL;
        if(src&&/^https?:\/\//i.test(src)){const i=document.createElement("img");i.src=src;i.alt=safeStr(u.displayName||"");avatar.appendChild(i)} else if(src&&/^data:image\//i.test(src)){const i=document.createElement("img");i.src=src;i.alt=safeStr(u.displayName||"");avatar.appendChild(i)} else {const i=document.createElement("div");i.className="initials";i.textContent=(safeStr(u.displayName||"")[0]||"F").toUpperCase();avatar.appendChild(i)}
        const meta=document.createElement("div"); meta.className="meta";
        const name=document.createElement("div"); name.className="name"; name.textContent = safeStr(u.displayName||"User");
        const handle=document.createElement("div"); handle.className="handle"; handle.textContent = formatHandle(u);
        const val=document.createElement("div"); val.className="val"; const metricKey = metric||window._fluxLeaderboardMetric||"focusMinutesTotal"; const metricVal = u[metricKey]||0; val.textContent = fmtMetric(metricKey, metricVal);
        // presence badge
        const pres=document.createElement("div"); pres.className="presence"; pres.textContent = u.isLive?"Live":"Idle"; pres.style.cssText = "margin-top:6px;font-size:12px;color:var(--text-dim);display:flex;align-items:center;gap:6px";
        const dot=document.createElement("span"); dot.style.cssText = "width:8px;height:8px;border-radius:50%"; dot.style.backgroundColor = u.isLive?"#2ecc71":"#6b7280"; pres.insertBefore(dot, pres.firstChild);
        meta.appendChild(name); if(handle.textContent) meta.appendChild(handle); meta.appendChild(val); meta.appendChild(pres);
        slot.appendChild(med); slot.appendChild(rnum); slot.appendChild(avatar); slot.appendChild(meta); wrap.appendChild(slot);
      });
      el.appendChild(wrap);
    })(podWrap,last,meUid,window._fluxLeaderboardMetric||null);
    body.appendChild(podWrap);

    // List
    const listWrap=document.createElement("div"); listWrap.className="leader-list-wrap";
    (function(el, users, me, metric){
      const wrap=document.createElement("div"); wrap.className="leader-list";
      if(!users.length){ const empty=document.createElement("div"); empty.className="leaderboard-empty in-list"; empty.textContent="Keep focusing to become the first in this list."; wrap.appendChild(empty); el.appendChild(wrap); return }
      users.forEach((u,idx)=>{
        const row=document.createElement("div"); row.className = "leader-row" + (u.id===me?" me":""); row.dataset.uid = u.id; row.style.animationDelay = 30*Math.min(idx,8)+"ms";
        const rankCol=document.createElement("div"); rankCol.className="rank-col"; rankCol.textContent = String(idx+1+3);
        const avatar = avatarCol(u);
        const nameCol=document.createElement("div"); nameCol.className="name-col";
        const primary=document.createElement("div"); primary.className="primary"; primary.textContent = safeStr(u.displayName||"User");
        const secondary=document.createElement("div"); secondary.className="secondary"; secondary.textContent = formatHandle(u);
        nameCol.appendChild(primary); if(secondary.textContent) nameCol.appendChild(secondary);
        // inline presence pill
        const pill=document.createElement("div"); pill.className="presence-inline"; pill.style.cssText="margin-left:8px;font-size:12px;color:var(--text-dim);display:inline-block"; pill.textContent = u.isLive?" • Live":" • Idle"; primary.appendChild(pill);
        const statCol=document.createElement("div"); statCol.className="stat-col"; const metricKey = metric||window._fluxLeaderboardMetric||"focusMinutesTotal"; statCol.textContent = fmtMetric(metricKey, u[metricKey]||0);
        row.appendChild(rankCol); row.appendChild(avatar); row.appendChild(nameCol); row.appendChild(statCol); wrap.appendChild(row);
      });
      el.appendChild(wrap);
    })(listWrap,last.slice(3),meUid,window._fluxLeaderboardMetric||null);
    body.appendChild(listWrap);

    container.appendChild(body);

    setTimeout(()=>{
      (async function(container,metric,range="week"){try{const res=await window.Leaderboard.getUserEntryAndRank(metric,range); if(!res||!res.entry) return; if((window._fluxLeaderboardLast||[]).some(x=>x.id===res.entry.id)) return; const prow=document.createElement("div"); prow.className="leader-row pinned me"; const rcol=document.createElement("div"); rcol.className="rank-col"; rcol.textContent = res.rank?String(res.rank):"—"; const pav=avatarCol(res.entry); const pnameWrap=document.createElement("div"); pnameWrap.className="name-col"; const pprimary=document.createElement("div"); pprimary.className="primary"; pprimary.textContent = safeStr(res.entry.displayName||"You"); const psec=document.createElement("div"); psec.className="secondary"; psec.textContent = formatHandle(res.entry); pnameWrap.appendChild(pprimary); if(psec.textContent) pnameWrap.appendChild(psec); const pstat=document.createElement("div"); pstat.className="stat-col"; pstat.textContent = fmtMetric(metric, res.entry[metric]||0); prow.appendChild(rcol); prow.appendChild(pav); prow.appendChild(pnameWrap); prow.appendChild(pstat); const sep=document.createElement("div"); sep.className="leader-list-sep"; (container.querySelector(".leader-list-wrap")||container).appendChild(sep); (container.querySelector(".leader-list-wrap")||container).appendChild(prow);}catch(e){}})(container,window._fluxLeaderboardMetric||"focusMinutesTotal",window._fluxLeaderboardRange||"week")},0);
  }

  window.LeaderboardUI = { renderLeaderboard: render, attach: function(container){ if(!container) return; container.addEventListener("click", (evt)=>{ const m = evt.target.closest("[data-leader-metric]"); if(m){ const metric = m.dataset.leaderMetric; window._fluxLeaderboardMetric = metric; render(container, window._fluxLeaderboardLast||[]); try{ window.dispatchEvent(new CustomEvent("flux-leaderboard-metric-change", { detail: { metric } })); } catch(e){} return; } const r = evt.target.closest("[data-leader-range]"); if(r){ const range = r.dataset.leaderRange; window._fluxLeaderboardRange = range; render(container, window._fluxLeaderboardLast||[]); try{ window.dispatchEvent(new CustomEvent("flux-leaderboard-range-change", { detail: { range } })); } catch(e){} return; } });
    container.addEventListener("keydown", (evt)=>{ const active=document.activeElement; if(active&&active.matches&&active.matches(".leaderboard-tabs .tab")&&(evt.key==="ArrowRight"||evt.key==="ArrowLeft")){ evt.preventDefault(); const tabs = Array.from(container.querySelectorAll(".leaderboard-tabs .tab")); const idx = tabs.indexOf(active); const next = tabs[(idx + (evt.key==="ArrowRight"?1:tabs.length-1)) % tabs.length]; next.focus(); next.click(); } }); }
  };
}();
