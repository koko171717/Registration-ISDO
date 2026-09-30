const db=window.isdoSupabase,$=id=>document.getElementById(id);
let session=null,data=null,currentPlayers=[],selectedPlayer=null;

document.addEventListener("DOMContentLoaded",async()=>{
  bind();
  const r=await db.auth.getSession();
  session=r.data.session;
  if(session) load();
});

function bind(){
  $("loginForm").onsubmit=login;
  $("logoutButton").onclick=()=>db.auth.signOut();
  document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>switchView(btn.dataset.view));

  ["playerSearch","filterOriginClub","filterCategory","filterTeam","filterRegistration","filterMeals"]
    .forEach(id=>$(id).addEventListener("input",renderPlayers));

  $("mealDayFilter").onchange=renderMeals;
  $("mealClubFilter").onchange=renderMeals;
  $("exportPlayers").onclick=exportPlayers;
  $("exportMeals").onclick=exportMeals;

  $("closePlayerDialog").onclick=()=>$("playerDialog").close();
  $("playerEditForm").onsubmit=savePlayer;
  $("deletePlayerButton").onclick=deletePlayer;

  db.auth.onAuthStateChange((_e,s)=>{
    session=s;
    s?load():showLogin();
  });
}

async function login(ev){
  ev.preventDefault();
  const {error}=await db.auth.signInWithPassword({
    email:$("loginEmail").value.trim().toLowerCase(),
    password:$("loginPassword").value
  });
  if(error){
    $("loginMessage").textContent=error.message;
    $("loginMessage").classList.remove("hidden");
  }
}

function showLogin(){
  $("appView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
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
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  try{
    data=await api("/api/admin-data");
    $("adminEmail").textContent=data.admin_email||"";
    populateFilters();
    renderOverview();
    renderPlayers();
    renderMeals();
    renderTeams();
  }catch(e){
    $("appMessage").textContent=e.message;
    $("appMessage").classList.remove("hidden");
  }
}

function switchView(name){
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.view===name));
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  $(name+"View").classList.remove("hidden");
}

function populateFilters(){
  const clubs=[...data.clubs].sort((a,b)=>a.name.localeCompare(b.name));
  ["filterOriginClub","mealClubFilter","editOriginClub"].forEach(id=>{
    const s=$(id);
    if(id==="editOriginClub") s.innerHTML="";
    clubs.forEach(c=>s.add(new Option(c.name,c.id)));
  });

  data.categories.forEach(c=>$("filterCategory").add(new Option(c.name,c.id)));

  data.teams
    .slice()
    .sort((a,b)=>a.team_name.localeCompare(b.team_name))
    .forEach(t=>$("filterTeam").add(new Option(`${t.category} — ${t.team_name}`,t.id)));

  $("mealDayFilter").innerHTML="";
  data.meal_days.forEach(d=>$("mealDayFilter").add(new Option(d.name,d.id)));
}

function renderOverview(){
  const players=data.players;
  $("statPlayers").textContent=players.length;
  $("statComplete").textContent=players.filter(p=>p.registration_complete).length;
  $("statIncomplete").textContent=players.filter(p=>!p.registration_complete).length;
  $("statTeams").textContent=data.teams.length;

  const byDay=new Map(data.meal_days.map(d=>[d.id,0]));
  data.meals.forEach(m=>{if(m.ordered)byDay.set(m.meal_day_id,(byDay.get(m.meal_day_id)||0)+1)});
  data.meal_days.forEach(d=>{
    const id={Friday:"statFriday",Saturday:"statSaturday",Sunday:"statSunday"}[d.name];
    if(id) $(id).textContent=byDay.get(d.id)||0;
  });

  $("statMissingMeals").textContent=players.filter(p=>!p.meals_complete).length;

  const alerts=[
    `${players.filter(p=>!p.registration_complete).length} incomplete registrations`,
    `${players.filter(p=>!p.meals_complete).length} players with missing meal selections`,
    `${data.teams.filter(t=>!t.has_captain).length} teams without captain`
  ];
  $("alerts").innerHTML=alerts.map(x=>`<div class="alert-line">${esc(x)}</div>`).join("");
}

function filteredPlayers(){
  const q=$("playerSearch").value.trim().toLowerCase();
  const club=$("filterOriginClub").value,cat=$("filterCategory").value,team=$("filterTeam").value;
  const reg=$("filterRegistration").value,meal=$("filterMeals").value;

  return data.players.filter(p=>{
    if(q && !`${p.first_name} ${p.last_name}`.toLowerCase().includes(q)) return false;
    if(club && p.origin_club_id!==club) return false;
    if(reg && (reg==="complete")!==p.registration_complete) return false;
    if(meal && (meal==="complete")!==p.meals_complete) return false;
    if(team && !p.team_ids.includes(team)) return false;
    if(cat && !p.category_ids.includes(cat)) return false;
    return true;
  }).sort((a,b)=>`${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
}

function renderPlayers(){
  currentPlayers=filteredPlayers();
  $("playersCount").textContent=`${currentPlayers.length} players`;
  $("playersBody").innerHTML=currentPlayers.map(p=>`
    <tr>
      <td><b>${esc(p.first_name)} ${esc(p.last_name)}</b></td>
      <td>#${esc(p.jersey_number||"—")}</td>
      <td>${esc(p.origin_club_name)}</td>
      <td>${p.teams.map(t=>`<span class="badge role">${esc(t.category)} — ${esc(t.team_name)}</span>`).join(" ")}</td>
      <td><span class="badge ${p.registration_complete?"ok":"warn"}">${p.registration_complete?"Complete":"Incomplete"}</span></td>
      <td><span class="badge ${p.meals_complete?"ok":"warn"}">${p.meals_complete?"Complete":"Missing"}</span></td>
      <td><button class="secondary" onclick="openPlayer('${p.id}')">Edit</button></td>
    </tr>
  `).join("");
}

window.openPlayer=function(id){
  selectedPlayer=data.players.find(p=>p.id===id);
  if(!selectedPlayer)return;
  $("editPlayerTitle").textContent=`${selectedPlayer.first_name} ${selectedPlayer.last_name}`;
  $("editFirstName").value=selectedPlayer.first_name;
  $("editLastName").value=selectedPlayer.last_name;
  $("editJersey").value=selectedPlayer.jersey_number||"";
  $("editOriginClub").value=selectedPlayer.origin_club_id;
  $("playerDialog").showModal();
}

async function savePlayer(ev){
  ev.preventDefault();
  await api("/api/admin-player",{
    method:"PATCH",
    body:JSON.stringify({
      player_id:selectedPlayer.id,
      first_name:$("editFirstName").value.trim(),
      last_name:$("editLastName").value.trim(),
      jersey_number:$("editJersey").value.trim()||null,
      origin_club_id:$("editOriginClub").value
    })
  });
  $("playerDialog").close();
  await load();
}

async function deletePlayer(){
  if(!selectedPlayer)return;
  if(!confirm(`Delete ${selectedPlayer.first_name} ${selectedPlayer.last_name} and all linked registration data?`))return;
  await api("/api/admin-player",{method:"DELETE",body:JSON.stringify({player_id:selectedPlayer.id})});
  $("playerDialog").close();
  await load();
}

function renderMeals(){
  if(!data)return;
  const day=$("mealDayFilter").value;
  const club=$("mealClubFilter").value;

  const rows=data.meals.filter(m=>(!day||m.meal_day_id===day)&&(!club||m.origin_club_id===club));

  const ordered=rows.filter(x=>x.ordered);
  const counts={};
  data.sandwich_options.forEach(o=>counts[o.name]=0);
  ordered.forEach(x=>counts[x.sandwich_name]=(counts[x.sandwich_name]||0)+1);

  $("mealSummary").innerHTML=
    Object.entries(counts).map(([name,count])=>`<div class="meal-card"><span>${esc(name)}</span><strong>${count}</strong></div>`).join("")
    + `<div class="meal-card"><span>Total meals</span><strong>${ordered.length}</strong></div>`;

  $("mealsBody").innerHTML=rows
    .sort((a,b)=>`${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
    .map(m=>`
      <tr>
        <td>${esc(m.first_name)} ${esc(m.last_name)}</td>
        <td>${esc(m.origin_club_name)}</td>
        <td>${esc(m.day_name)}</td>
        <td>${esc(m.ordered?m.sandwich_name:"No meal")}</td>
        <td>${m.ordered?`CHF ${Number(m.price_chf).toFixed(2)}`:"—"}</td>
      </tr>
    `).join("");
}

function renderTeams(){
  const byClub=new Map();
  data.teams.forEach(t=>{
    if(!byClub.has(t.managing_club_name))byClub.set(t.managing_club_name,[]);
    byClub.get(t.managing_club_name).push(t);
  });

  $("teamsGrid").innerHTML=[...byClub.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([club,teams])=>`
    <article class="team-card">
      <h3>${esc(club)}</h3>
      ${teams.sort((a,b)=>a.category.localeCompare(b.category)).map(t=>`
        <div class="team-row">
          <span><span class="badge role">${esc(t.category)}</span> ${esc(t.team_name)}</span>
          <strong>${t.player_count} players</strong>
        </div>
      `).join("")}
    </article>
  `).join("");
}

function exportPlayers(){
  const rows=[["First name","Last name","Jersey","Origin club","Teams","Registration","Meals"]];
  currentPlayers.forEach(p=>rows.push([
    p.first_name,p.last_name,p.jersey_number||"",p.origin_club_name,
    p.teams.map(t=>`${t.category}: ${t.team_name}`).join(" | "),
    p.registration_complete?"Complete":"Incomplete",
    p.meals_complete?"Complete":"Missing"
  ]));
  downloadCsv("isdo-players.csv",rows);
}

function exportMeals(){
  const day=$("mealDayFilter").value,club=$("mealClubFilter").value;
  const rows=[["First name","Last name","Origin club","Day","Meal","Price CHF"]];
  data.meals.filter(m=>(!day||m.meal_day_id===day)&&(!club||m.origin_club_id===club)).forEach(m=>rows.push([
    m.first_name,m.last_name,m.origin_club_name,m.day_name,m.ordered?m.sandwich_name:"No meal",m.ordered?m.price_chf:""
  ]));
  downloadCsv("isdo-meals.csv",rows);
}

function downloadCsv(name,rows){
  const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);
}

function esc(v){
  return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
