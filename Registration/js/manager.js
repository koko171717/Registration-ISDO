const db=window.isdoSupabase,$=id=>document.getElementById(id);
let session=null,selected=null;

document.addEventListener("DOMContentLoaded",async()=>{
  bind();
  const r=await db.auth.getSession();
  session=r.data.session;
  if(session) load();
});

function bind(){
  $("loginForm").onsubmit=login;
  $("logout").onclick=()=>db.auth.signOut();
  $("closeDialog").onclick=()=>$("dialog").close();
  $("captainBtn").onclick=()=>role("captain");
  $("viceBtn").onclick=()=>role("vice_captain");
  $("coachBtn").onclick=toggleCoach;
  $("removeBtn").onclick=remove;

  db.auth.onAuthStateChange((_e,s)=>{
    session=s;
    s?load():showLogin();
  });
}

async function login(ev){
  ev.preventDefault();
  const {error}=await db.auth.signInWithPassword({
    email:$("email").value.trim().toLowerCase(),
    password:$("password").value
  });
  if(error){
    $("loginMsg").textContent=error.message;
    $("loginMsg").classList.remove("hidden");
  }
}

function showLogin(){
  $("dashboard").classList.add("hidden");
  $("login").classList.remove("hidden");
}

async function api(url,opt={}){
  const r=await fetch(url,{
    ...opt,
    headers:{
      ...(opt.headers||{}),
      "Content-Type":"application/json",
      Authorization:`Bearer ${session.access_token}`
    }
  });
  const d=await r.json();
  if(!r.ok) throw new Error(d.error||"Request failed");
  return d;
}

async function load(){
  $("login").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  try{
    const d=await api("/api/manager-roster");
    render(d);
  }catch(e){
    alert(e.message);
  }
}

function render(d){
  $("clubName").textContent=d.clubs.length===1?d.clubs[0].name:"My Clubs";
  $("managerEmail").textContent=d.manager_email;

  const all=d.teams.flatMap(t=>t.players);
  $("teamCount").textContent=d.teams.length;
  $("rosterCount").textContent=all.length;
  $("completeCount").textContent=all.filter(x=>x.registration_complete).length;
  $("missingMealsCount").textContent=all.filter(x=>!x.meals_complete).length;

  const box=$("teams");
  box.innerHTML="";
  box.className="roster-cards";

  d.teams.forEach(team=>{
    const card=document.createElement("article");
    card.className="roster-summary-card";

    const sortedPlayers=[...team.players].sort((a,b)=>{
      const an=jerseyNumber(a.jersey_number);
      const bn=jerseyNumber(b.jersey_number);

      if(an!==bn) return an-bn;
      return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
    });

    card.innerHTML=`
      <button class="roster-summary-button" type="button" aria-expanded="false">
        <div class="roster-summary-left">
          <span class="badge role">${esc(team.category)}</span>
          <h2>${esc(team.team_name)}</h2>
        </div>

        <div class="roster-summary-count">
          <strong>${sortedPlayers.length}</strong>
          <span>${sortedPlayers.length===1?"player":"players"}</span>
          <span class="chevron">⌄</span>
        </div>
      </button>

      <div class="roster-details hidden">
        <div class="team-coaches"></div>
        <div class="team-players-list"></div>
      </div>
    `;

    const button=card.querySelector(".roster-summary-button");
    const details=card.querySelector(".roster-details");

    const coachBox=details.querySelector(".team-coaches");
    const playerList=details.querySelector(".team-players-list");
    coachBox.innerHTML=team.coaches?.length?`<div class="coach-strip"><strong>Coach${team.coaches.length>1?'es':''}</strong><span>${team.coaches.map(c=>esc(c.first_name+' '+c.last_name)).join(' · ')}</span></div>`:'';
    if(sortedPlayers.length===0){
      playerList.innerHTML=`<div class="empty-roster">No registered players yet.</div>`;
    } else {
      sortedPlayers.forEach(player=>{
        const row=document.createElement("div");
        row.className="player roster-player-row";
        row.innerHTML=`
          <div class="jersey-cell">#${esc(player.jersey_number||"—")}</div>

          <div class="player-main">
            <b>${esc(player.first_name)} ${esc(player.last_name)}</b>
            ${
              player.captain
                ? '<span class="badge role">Captain</span>'
                : player.vice_captain
                  ? '<span class="badge role">Vice-captain</span>'
                  : ''
            }
          </div>

          <div class="mobileHide">
            <span class="badge ${player.registration_complete?'ok':'warn'}">
              ${player.registration_complete?'Complete':'Incomplete'}
            </span>
          </div>

          <div class="mobileHide">
            <span class="badge ${player.meals_complete?'ok':'warn'}">
              ${player.meals_complete?'Meals ✓':'Meals missing'}
            </span>
          </div>
        `;

        row.onclick=()=>openPlayer(team,player);
        playerList.appendChild(row);
      });
    }

    button.onclick=()=>{
      const isOpen=!details.classList.contains("hidden");
      details.classList.toggle("hidden",isOpen);
      button.setAttribute("aria-expanded",String(!isOpen));
      card.classList.toggle("open",!isOpen);
    };

    box.appendChild(card);
  });
}

function jerseyNumber(value){
  if(value===null||value===undefined||value==="") return Number.MAX_SAFE_INTEGER;
  const n=parseInt(String(value).replace(/\D/g,""),10);
  return Number.isNaN(n)?Number.MAX_SAFE_INTEGER:n;
}

function openPlayer(t,p){
  selected={t,p};
  $("dCat").textContent=t.category;
  $("dName").textContent=`${p.first_name} ${p.last_name}`;
  $("dTeam").textContent=t.team_name;
  $("dJersey").textContent=p.jersey_number||"—";
  $("dReg").textContent=p.registration_complete?"Complete":"Incomplete";
  $("dMeals").textContent=p.meals_complete?"Completed":"Missing";
  $("captainBtn").textContent=p.captain?"Remove captain":"Set as captain";
  $("viceBtn").textContent=p.vice_captain?"Remove vice-captain":"Set as vice-captain";
  $("coachBtn").textContent=p.is_team_coach?"Remove team coach":"Set as team coach";
  $("dialog").showModal();
}

async function role(field){
  await api("/api/manager-membership",{
    method:"PATCH",
    body:JSON.stringify({
      membership_id:selected.p.membership_id,
      field,
      value:!selected.p[field]
    })
  });
  $("dialog").close();
  load();
}

async function toggleCoach(){await api("/api/manager-roster",{method:"POST",body:JSON.stringify({action:selected.p.is_team_coach?"remove_coach_assignment":"add_coach_assignment",team_id:selected.t.id,participant_id:selected.p.id})});$("dialog").close();load();}

async function remove(){
  if(!confirm(`Remove ${selected.p.first_name} ${selected.p.last_name} from ${selected.t.team_name}?`)) return;

  await api("/api/manager-membership",{
    method:"DELETE",
    body:JSON.stringify({membership_id:selected.p.membership_id})
  });

  $("dialog").close();
  load();
}

function esc(v){
  return String(v??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}
