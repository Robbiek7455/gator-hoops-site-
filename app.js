const TEAM_ID = 57; // Florida Gators
let GENDER = "mens-college-basketball"; // change to "womens-college-basketball" if you like
const base = "https://site.api.espn.com/apis/site/v2/sports/basketball";

const $ = (q) => document.querySelector(q);
const scheduleList = $("#scheduleList");
const rosterList = $("#rosterList");
const refreshBtn = $("#refreshBtn");
const genderSelect = $("#gender");

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined,{dateStyle:"medium", timeStyle:"short"});
}
function el(html){ const div=document.createElement('div'); div.innerHTML=html.trim(); return div.firstChild; }

async function getJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error("HTTP "+res.status);
  return res.json();
}

function parseSchedule(data){
  const events = data?.events ?? [];
  const out = events.map((ev)=>{
    const comp = ev.competitions?.[0];
    const competitors = comp?.competitors ?? [];
    const home = competitors.find((c)=>c.homeAway==="home");
    const away = competitors.find((c)=>c.homeAway==="away");
    const isHome = String(home?.team?.id)===String(TEAM_ID);
    const selfSide = isHome ? home : away;
    const oppSide = isHome ? away : home;
    const statusType = comp?.status?.type;
    const status = statusType?.shortDetail || statusType?.description || "Scheduled";
    const oppTeam = oppSide?.team ?? {};
    const logo = oppTeam?.logos?.[0]?.href;
    const myScore = Number(selfSide?.score);
    const oppScore = Number(oppSide?.score);
    return {
      id: ev.id,
      date: ev.date,
      opponent: oppTeam.displayName ?? "Opponent",
      isHome,
      venue: comp?.venue?.fullName,
      tv: comp?.broadcasts?.[0]?.names?.[0],
      status,
      myScore: isNaN(myScore)?undefined:myScore,
      oppScore: isNaN(oppScore)?undefined:oppScore,
      opponentLogo: logo
    };
  });
  out.sort((a,b)=> new Date(a.date)-new Date(b.date));
  return out;
}

function renderSchedule(list){
  scheduleList.innerHTML = "";
  if(!list.length){ scheduleList.append(el(`<div class="meta">No games found.</div>`)); return; }
  for(const g of list){
    const score = (g.myScore!=null && g.oppScore!=null)
      ? `<div class="score">${g.myScore}-${g.oppScore}</div>`
      : `<div class="badge">${g.status}</div>`;
    const tv = g.tv ? `<div class="badge">${g.tv}</div>` : "";
    const venue = g.venue ? `<div class="badge">${g.venue}</div>` : "";
    scheduleList.append(el(`
      <div class="card">
        ${g.opponentLogo ? `<img class="logo" src="${g.opponentLogo}" alt="">` : `<div class="logo"></div>`}
        <div style="flex:1">
          <div class="row">
            <div><strong>${g.isHome ? "vs" : "@"} ${g.opponent}</strong></div>
            ${score}
          </div>
          <div class="meta">${fmtDate(g.date)}</div>
          <div class="row">${tv} ${venue}</div>
        </div>
      </div>
    `));
  }
}

function parseRoster(data){
  const groups = data?.team?.athletes ?? [];
  const players = [];
  for(const group of groups){
    for(const it of (group.items??[])){
      let ppg, rpg, apg;
      const season = (it.statistics??[]).find(s => String(s.name||"").toLowerCase().includes("season"));
      const cats = season?.splits?.categories ?? [];
      for(const cat of cats){
        for(const st of (cat.stats??[])){
          if(st.name==="pointsPerGame") ppg = Number(st.value);
          if(st.name==="reboundsPerGame") rpg = Number(st.value);
          if(st.name==="assistsPerGame") apg = Number(st.value);
        }
      }
      players.push({
        id:String(it.id),
        fullName: it.displayName,
        position: it.position?.abbreviation,
        number: it.jersey,
        height: it.height,
        weight: it.weight,
        classYear: it.class,
        headshot: it.headshot?.href,
        ppg, rpg, apg
      });
    }
  }
  players.sort((a,b)=> a.fullName.localeCompare(b.fullName));
  return players;
}

function renderRoster(players){
  rosterList.innerHTML="";
  if(!players.length){ rosterList.append(el(`<div class="meta">No players found.</div>`)); return; }
  for(const p of players){
    rosterList.append(el(`
      <div class="card">
        ${p.headshot ? `<img class="roster-head" src="${p.headshot}" alt="">` : `<div class="roster-head"></div>`}
        <div style="flex:1">
          <div><strong>${p.fullName}</strong></div>
          <div class="meta">${p.number ? "#"+p.number+" " : ""}${p.position ?? ""} ${p.classYear ? "· "+p.classYear : ""}</div>
        </div>
        <div style="text-align:right">
          <div>PPG ${p.ppg?.toFixed(1) ?? "0.0"}</div>
          <div>RPG ${p.rpg?.toFixed(1) ?? "0.0"}</div>
          <div>APG ${p.apg?.toFixed(1) ?? "0.0"}</div>
        </div>
      </div>
    `));
  }
}

// Tabs
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// Controls
refreshBtn.addEventListener("click", loadAll);
genderSelect.addEventListener("change", (e)=>{
  GENDER = e.target.value;
  loadAll();
});

// Load both lists
async function loadAll(){
  try{
    refreshBtn.disabled = true; refreshBtn.textContent = "Loading…";
    const sched = await getJSON(`${base}/${GENDER}/teams/${TEAM_ID}/schedule`);
    renderSchedule(parseSchedule(sched));
    const roster = await getJSON(`${base}/${GENDER}/teams/${TEAM_ID}`);
    renderRoster(parseRoster(roster));
  }catch(err){
    scheduleList.innerHTML = `<div class="meta" style="color:crimson">Error: ${err}</div>`;
    rosterList.innerHTML = `<div class="meta" style="color:crimson">Error: ${err}</div>`;
  }finally{
    refreshBtn.disabled = false; refreshBtn.textContent = "↻ Refresh";
  }
}
loadAll();
