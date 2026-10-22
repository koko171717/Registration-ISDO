const db=window.isdoSupabase,$=id=>document.getElementById(id);
let session=null,selected=null,currentData=null,currentTeam=null;
let lang=localStorage.getItem("isdo_manager_lang")||"en";

const I18N={
en:{managerPortal:"Manager Portal",language:"Language",signInHelp:"Sign in with the email assigned to your club.",email:"Email",password:"Password",signIn:"Sign in",signOut:"Sign out",clubOverview:"Club overview",summary:"Summary",summaryHelp:"People are counted once according to their club of origin.",teams:"Teams",clubPlayers:"Club players",coaches:"Coaches",accompanying:"Accompanying",competition:"Competition",yourRosters:"Your rosters",rosterHelp:"Open a team to view and print its official roster sheet.",players:"players",player:"Player",close:"Close",printRoster:"Print roster",addCoach:"Add coach",captain:"Captain",viceCaptain:"Vice-captain",fullRoster:"Full roster",number:"#",role:"Role",registration:"Registration",meals:"Meals",playerHint:"Click a player to manage captain, vice-captain or team coach roles.",jersey:"Jersey",removeFromRoster:"Remove from this roster",selectCoach:"Select a player or coach…",noCoach:"No coach assigned",notAssigned:"Not assigned",complete:"Complete",incomplete:"Incomplete",completed:"Completed",missing:"Missing",setCaptain:"Set as captain",removeCaptain:"Remove captain",setVice:"Set as vice-captain",removeVice:"Remove vice-captain",setCoach:"Set as coach",removeCoach:"Remove coach",addingCoach:"Adding coach…",team:"team",teamsLabel:"teams",rosterPlayers:"players in roster",catMen:"Men",catWomen:"Women",catMixed:"Mixed",coach:"Coach",playerType:"Player",removeConfirm:"Remove {name} from {team}?",myClubs:"My Clubs"},
fr:{managerPortal:"Portail Manager",language:"Langue",signInHelp:"Connectez-vous avec l’adresse e-mail attribuée à votre club.",email:"E-mail",password:"Mot de passe",signIn:"Se connecter",signOut:"Se déconnecter",clubOverview:"Aperçu du club",summary:"Résumé",summaryHelp:"Chaque personne est comptée une seule fois selon son club d’origine.",teams:"Équipes",clubPlayers:"Joueurs du club",coaches:"Coachs",accompanying:"Accompagnants",competition:"Compétition",yourRosters:"Vos rosters",rosterHelp:"Ouvrez une équipe pour consulter et imprimer sa feuille de roster officielle.",players:"joueurs",player:"Joueur",close:"Fermer",printRoster:"Imprimer le roster",addCoach:"Ajouter un coach",captain:"Capitaine",viceCaptain:"Vice-capitaine",fullRoster:"Roster complet",number:"#",role:"Rôle",registration:"Inscription",meals:"Repas",playerHint:"Cliquez sur un joueur pour gérer les rôles de capitaine, vice-capitaine ou coach d’équipe.",jersey:"Maillot",removeFromRoster:"Retirer de ce roster",selectCoach:"Sélectionner un joueur ou un coach…",noCoach:"Aucun coach assigné",notAssigned:"Non assigné",complete:"Complet",incomplete:"Incomplet",completed:"Complet",missing:"Manquant",setCaptain:"Définir comme capitaine",removeCaptain:"Retirer le rôle de capitaine",setVice:"Définir comme vice-capitaine",removeVice:"Retirer le rôle de vice-capitaine",setCoach:"Définir comme coach",removeCoach:"Retirer comme coach",addingCoach:"Ajout du coach…",team:"équipe",teamsLabel:"équipes",rosterPlayers:"joueurs dans le roster",catMen:"Hommes",catWomen:"Femmes",catMixed:"Mixte",coach:"Coach",playerType:"Joueur",removeConfirm:"Retirer {name} de {team} ?",myClubs:"Mes clubs"},
de:{managerPortal:"Manager-Portal",language:"Sprache",signInHelp:"Melde dich mit der deinem Club zugewiesenen E-Mail-Adresse an.",email:"E-Mail",password:"Passwort",signIn:"Anmelden",signOut:"Abmelden",clubOverview:"Clubübersicht",summary:"Übersicht",summaryHelp:"Jede Person wird anhand ihres Herkunftsclubs nur einmal gezählt.",teams:"Teams",clubPlayers:"Clubspieler",coaches:"Coaches",accompanying:"Begleitpersonen",competition:"Wettbewerb",yourRosters:"Deine Kader",rosterHelp:"Öffne ein Team, um den offiziellen Kader anzusehen und zu drucken.",players:"Spieler",player:"Spieler",close:"Schließen",printRoster:"Kader drucken",addCoach:"Coach hinzufügen",captain:"Kapitän",viceCaptain:"Vizekapitän",fullRoster:"Gesamter Kader",number:"#",role:"Rolle",registration:"Anmeldung",meals:"Mahlzeiten",playerHint:"Klicke auf einen Spieler, um Kapitän, Vizekapitän oder Team-Coach zu verwalten.",jersey:"Trikot",removeFromRoster:"Aus diesem Kader entfernen",selectCoach:"Spieler oder Coach auswählen…",noCoach:"Kein Coach zugewiesen",notAssigned:"Nicht zugewiesen",complete:"Vollständig",incomplete:"Unvollständig",completed:"Vollständig",missing:"Fehlt",setCaptain:"Als Kapitän festlegen",removeCaptain:"Kapitänsrolle entfernen",setVice:"Als Vizekapitän festlegen",removeVice:"Vizekapitänsrolle entfernen",setCoach:"Als Coach festlegen",removeCoach:"Coach entfernen",addingCoach:"Coach wird hinzugefügt…",team:"Team",teamsLabel:"Teams",rosterPlayers:"Spieler im Kader",catMen:"Herren",catWomen:"Damen",catMixed:"Mixed",coach:"Coach",playerType:"Spieler",removeConfirm:"{name} aus {team} entfernen?",myClubs:"Meine Clubs"},
nl:{managerPortal:"Managerportaal",language:"Taal",signInHelp:"Log in met het e-mailadres dat aan je club is toegewezen.",email:"E-mail",password:"Wachtwoord",signIn:"Inloggen",signOut:"Uitloggen",clubOverview:"Cluboverzicht",summary:"Overzicht",summaryHelp:"Iedere persoon wordt één keer geteld volgens de club van herkomst.",teams:"Teams",clubPlayers:"Clubspelers",coaches:"Coaches",accompanying:"Begeleiders",competition:"Competitie",yourRosters:"Je rosters",rosterHelp:"Open een team om het officiële roster te bekijken en af te drukken.",players:"spelers",player:"Speler",close:"Sluiten",printRoster:"Roster afdrukken",addCoach:"Coach toevoegen",captain:"Kapitein",viceCaptain:"Vice-kapitein",fullRoster:"Volledig roster",number:"#",role:"Rol",registration:"Registratie",meals:"Maaltijden",playerHint:"Klik op een speler om kapitein, vice-kapitein of teamcoach te beheren.",jersey:"Shirtnummer",removeFromRoster:"Uit dit roster verwijderen",selectCoach:"Selecteer een speler of coach…",noCoach:"Geen coach toegewezen",notAssigned:"Niet toegewezen",complete:"Compleet",incomplete:"Onvolledig",completed:"Compleet",missing:"Ontbreekt",setCaptain:"Als kapitein instellen",removeCaptain:"Kapitein verwijderen",setVice:"Als vice-kapitein instellen",removeVice:"Vice-kapitein verwijderen",setCoach:"Als coach instellen",removeCoach:"Coach verwijderen",addingCoach:"Coach toevoegen…",team:"team",teamsLabel:"teams",rosterPlayers:"spelers in roster",catMen:"Heren",catWomen:"Dames",catMixed:"Mixed",coach:"Coach",playerType:"Speler",removeConfirm:"{name} uit {team} verwijderen?",myClubs:"Mijn clubs"},
es:{managerPortal:"Portal de Manager",language:"Idioma",signInHelp:"Inicia sesión con el correo asignado a tu club.",email:"Correo electrónico",password:"Contraseña",signIn:"Iniciar sesión",signOut:"Cerrar sesión",clubOverview:"Resumen del club",summary:"Resumen",summaryHelp:"Cada persona se cuenta una sola vez según su club de origen.",teams:"Equipos",clubPlayers:"Jugadores del club",coaches:"Entrenadores",accompanying:"Acompañantes",competition:"Competición",yourRosters:"Tus rosters",rosterHelp:"Abre un equipo para ver e imprimir su hoja oficial de roster.",players:"jugadores",player:"Jugador",close:"Cerrar",printRoster:"Imprimir roster",addCoach:"Añadir entrenador",captain:"Capitán",viceCaptain:"Vicecapitán",fullRoster:"Roster completo",number:"#",role:"Rol",registration:"Inscripción",meals:"Comidas",playerHint:"Haz clic en un jugador para gestionar capitán, vicecapitán o entrenador del equipo.",jersey:"Camiseta",removeFromRoster:"Quitar de este roster",selectCoach:"Selecciona un jugador o entrenador…",noCoach:"Sin entrenador asignado",notAssigned:"No asignado",complete:"Completo",incomplete:"Incompleto",completed:"Completo",missing:"Pendiente",setCaptain:"Asignar como capitán",removeCaptain:"Quitar capitán",setVice:"Asignar como vicecapitán",removeVice:"Quitar vicecapitán",setCoach:"Asignar como entrenador",removeCoach:"Quitar entrenador",addingCoach:"Añadiendo entrenador…",team:"equipo",teamsLabel:"equipos",rosterPlayers:"jugadores en roster",catMen:"Hombres",catWomen:"Mujeres",catMixed:"Mixto",coach:"Entrenador",playerType:"Jugador",removeConfirm:"¿Quitar a {name} de {team}?",myClubs:"Mis clubes"},
it:{managerPortal:"Portale Manager",language:"Lingua",signInHelp:"Accedi con l’e-mail assegnata al tuo club.",email:"E-mail",password:"Password",signIn:"Accedi",signOut:"Esci",clubOverview:"Panoramica club",summary:"Riepilogo",summaryHelp:"Ogni persona viene conteggiata una sola volta in base al club di origine.",teams:"Squadre",clubPlayers:"Giocatori del club",coaches:"Coach",accompanying:"Accompagnatori",competition:"Competizione",yourRosters:"I tuoi roster",rosterHelp:"Apri una squadra per visualizzare e stampare il roster ufficiale.",players:"giocatori",player:"Giocatore",close:"Chiudi",printRoster:"Stampa roster",addCoach:"Aggiungi coach",captain:"Capitano",viceCaptain:"Vicecapitano",fullRoster:"Roster completo",number:"#",role:"Ruolo",registration:"Registrazione",meals:"Pasti",playerHint:"Clicca su un giocatore per gestire capitano, vicecapitano o coach della squadra.",jersey:"Maglia",removeFromRoster:"Rimuovi da questo roster",selectCoach:"Seleziona un giocatore o coach…",noCoach:"Nessun coach assegnato",notAssigned:"Non assegnato",complete:"Completo",incomplete:"Incompleto",completed:"Completo",missing:"Mancante",setCaptain:"Imposta come capitano",removeCaptain:"Rimuovi capitano",setVice:"Imposta come vicecapitano",removeVice:"Rimuovi vicecapitano",setCoach:"Imposta come coach",removeCoach:"Rimuovi coach",addingCoach:"Aggiunta coach…",team:"squadra",teamsLabel:"squadre",rosterPlayers:"giocatori nel roster",catMen:"Uomini",catWomen:"Donne",catMixed:"Misto",coach:"Coach",playerType:"Giocatore",removeConfirm:"Rimuovere {name} da {team}?",myClubs:"I miei club"},
cs:{managerPortal:"Portál manažera",language:"Jazyk",signInHelp:"Přihlaste se e-mailem přiřazeným vašemu klubu.",email:"E-mail",password:"Heslo",signIn:"Přihlásit se",signOut:"Odhlásit se",clubOverview:"Přehled klubu",summary:"Souhrn",summaryHelp:"Každá osoba se započítá pouze jednou podle svého původního klubu.",teams:"Týmy",clubPlayers:"Hráči klubu",coaches:"Trenéři",accompanying:"Doprovod",competition:"Soutěž",yourRosters:"Vaše soupisky",rosterHelp:"Otevřete tým a zobrazte nebo vytiskněte jeho oficiální soupisku.",players:"hráčů",player:"Hráč",close:"Zavřít",printRoster:"Vytisknout soupisku",addCoach:"Přidat trenéra",captain:"Kapitán",viceCaptain:"Zástupce kapitána",fullRoster:"Kompletní soupiska",number:"#",role:"Role",registration:"Registrace",meals:"Jídla",playerHint:"Klikněte na hráče pro správu kapitána, zástupce kapitána nebo trenéra týmu.",jersey:"Dres",removeFromRoster:"Odebrat ze soupisky",selectCoach:"Vyberte hráče nebo trenéra…",noCoach:"Žádný trenér není přiřazen",notAssigned:"Nepřiřazeno",complete:"Kompletní",incomplete:"Neúplná",completed:"Kompletní",missing:"Chybí",setCaptain:"Nastavit jako kapitána",removeCaptain:"Odebrat kapitána",setVice:"Nastavit jako zástupce kapitána",removeVice:"Odebrat zástupce kapitána",setCoach:"Nastavit jako trenéra",removeCoach:"Odebrat trenéra",addingCoach:"Přidávání trenéra…",team:"tým",teamsLabel:"týmy",rosterPlayers:"hráčů na soupisce",catMen:"Muži",catWomen:"Ženy",catMixed:"Mix",coach:"Trenér",playerType:"Hráč",removeConfirm:"Odebrat {name} z {team}?",myClubs:"Moje kluby"},
hu:{managerPortal:"Manager Portál",language:"Nyelv",signInHelp:"Jelentkezz be a klubodhoz rendelt e-mail-címmel.",email:"E-mail",password:"Jelszó",signIn:"Bejelentkezés",signOut:"Kijelentkezés",clubOverview:"Klub áttekintése",summary:"Összegzés",summaryHelp:"Minden személy csak egyszer számít, a származási klubja alapján.",teams:"Csapatok",clubPlayers:"Klub játékosai",coaches:"Edzők",accompanying:"Kísérők",competition:"Verseny",yourRosters:"Csapatlistáid",rosterHelp:"Nyiss meg egy csapatot a hivatalos roster megtekintéséhez és nyomtatásához.",players:"játékos",player:"Játékos",close:"Bezárás",printRoster:"Roster nyomtatása",addCoach:"Edző hozzáadása",captain:"Csapatkapitány",viceCaptain:"Helyettes kapitány",fullRoster:"Teljes roster",number:"#",role:"Szerep",registration:"Regisztráció",meals:"Étkezések",playerHint:"Kattints egy játékosra a kapitány, helyettes kapitány vagy csapatedző szerep kezeléséhez.",jersey:"Mez",removeFromRoster:"Eltávolítás a rosterből",selectCoach:"Válassz játékost vagy edzőt…",noCoach:"Nincs kijelölt edző",notAssigned:"Nincs kijelölve",complete:"Teljes",incomplete:"Hiányos",completed:"Teljes",missing:"Hiányzik",setCaptain:"Kapitánynak kijelölés",removeCaptain:"Kapitány eltávolítása",setVice:"Helyettes kapitánynak kijelölés",removeVice:"Helyettes kapitány eltávolítása",setCoach:"Edzőnek kijelölés",removeCoach:"Edző eltávolítása",addingCoach:"Edző hozzáadása…",team:"csapat",teamsLabel:"csapatok",rosterPlayers:"játékos a rosterben",catMen:"Férfi",catWomen:"Női",catMixed:"Vegyes",coach:"Edző",playerType:"Játékos",removeConfirm:"Eltávolítod {name} játékost a(z) {team} csapatból?",myClubs:"Klubjaim"}
};

function t(k){return I18N[lang]?.[k]||I18N.en[k]||k}
function catLabel(c){return c==="Men"?t("catMen"):c==="Women"?t("catWomen"):c==="Mixed"?t("catMixed"):c}
function setLang(v){
  if(!I18N[v])v="en";
  lang=v; localStorage.setItem("isdo_manager_lang",lang);
  document.documentElement.lang=lang;
  ["loginLanguage","dashboardLanguage"].forEach(id=>{if($(id))$(id).value=lang});
  document.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=t(el.dataset.i18n)});
  if(currentData)render(currentData);
}

document.addEventListener("DOMContentLoaded",async()=>{
  bind();
  setLang(lang);
  const r=await db.auth.getSession();
  session=r.data.session;
  if(session)load();
});

function bind(){
  $("loginForm").onsubmit=login;
  $("logout").onclick=()=>db.auth.signOut();
  $("loginLanguage").onchange=e=>setLang(e.target.value);
  $("dashboardLanguage").onchange=e=>setLang(e.target.value);
  $("closeDialog").onclick=()=>$("playerDialog").close();
  $("closeTeamSheet").onclick=()=>$("teamSheetDialog").close();
  $("printTeamSheet").onclick=()=>{ $("printGenerated").textContent=new Date().toLocaleString(); window.print(); };
  $("captainBtn").onclick=()=>role("captain");
  $("viceBtn").onclick=()=>role("vice_captain");
  $("coachBtn").onclick=toggleCoach;
  $("removeBtn").onclick=remove;
  $("addCoachButton").onclick=addCoachFromSheet;
  db.auth.onAuthStateChange((_e,s)=>{session=s;s?load():showLogin()});
}

async function login(ev){
  ev.preventDefault();
  const {error}=await db.auth.signInWithPassword({email:$("email").value.trim().toLowerCase(),password:$("password").value});
  if(error){$("loginMsg").textContent=error.message;$("loginMsg").classList.remove("hidden")}
}

function showLogin(){
  $("dashboard").classList.add("hidden");
  $("login").classList.remove("hidden");
}

async function api(url,opt={}){
  const r=await fetch(url,{...opt,headers:{...(opt.headers||{}),"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`}});
  const d=await r.json();
  if(!r.ok)throw new Error(d.error||"Request failed");
  return d;
}

async function load(){
  $("login").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  try{currentData=await api("/api/manager-roster");render(currentData)}
  catch(e){alert(e.message)}
}

function render(d){
  $("clubName").textContent=d.clubs.length===1?d.clubs[0].name:t("myClubs");
  $("managerEmail").textContent=d.manager_email||"";
  const summary=d.club_summary||fallbackSummary(d);
  $("teamCount").textContent=summary.teams??d.teams.length;
  $("clubPlayerCount").textContent=summary.players??0;
  $("coachCount").textContent=summary.coaches??0;
  $("otherCount").textContent=summary.others??0;
  renderTeamGroups(d.teams||[]);
  document.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=t(el.dataset.i18n)});
  if(currentTeam){
    const fresh=(d.teams||[]).find(x=>x.id===currentTeam.id);
    if(fresh){currentTeam=fresh;renderTeamSheet(fresh)}
  }
}

function fallbackSummary(d){
  const ids=new Set(),coaches=new Set();
  (d.teams||[]).forEach(team=>{
    (team.players||[]).forEach(p=>ids.add(p.id));
    (team.coaches||[]).forEach(c=>coaches.add(c.id));
  });
  return{teams:(d.teams||[]).length,players:ids.size,coaches:coaches.size,others:0};
}

function renderTeamGroups(teams){
  const host=$("teams");host.innerHTML="";
  const order=["Men","Women","Mixed"];
  const categories=[...new Set(teams.map(x=>x.category))].sort((a,b)=>{
    const ai=order.indexOf(a),bi=order.indexOf(b);
    return (ai<0?99:ai)-(bi<0?99:bi)||String(a).localeCompare(String(b));
  });
  if(!categories.length){host.innerHTML=`<div class="card auth">${esc(t("notAssigned"))}</div>`;return}
  categories.forEach(category=>{
    const group=teams.filter(x=>x.category===category);
    const section=document.createElement("section");section.className="category-section";
    section.innerHTML=`<div class="category-header"><h3>${esc(catLabel(category))}</h3><span class="category-count">${group.length} ${esc(group.length===1?t("team"):t("teamsLabel"))}</span></div><div class="category-team-grid"></div>`;
    const grid=section.querySelector(".category-team-grid");
    group.sort((a,b)=>a.team_name.localeCompare(b.team_name)).forEach(team=>{
      const card=document.createElement("article");card.className="team-launch-card";
      card.innerHTML=`<button type="button" class="team-launch-button"><div class="team-name-wrap"><small>${esc(catLabel(team.category))}</small><strong>${esc(team.team_name)}</strong></div><div class="team-card-meta"><strong>${(team.players||[]).length}</strong><span>${esc(t("players"))}</span><span class="open-arrow">→</span></div></button>`;
      card.querySelector("button").onclick=()=>openTeam(team);
      grid.appendChild(card);
    });
    host.appendChild(section);
  });
}

function openTeam(team){
  currentTeam=team;
  renderTeamSheet(team);
  $("teamSheetDialog").showModal();
}

function renderTeamSheet(team){
  $("sheetCategory").textContent=catLabel(team.category);
  $("sheetTeamName").textContent=team.team_name;
  const club=currentData?.clubs?.find(c=>c.id===team.managing_club_id);
  $("sheetClubName").textContent=club?.name||"";
  const players=sortedPlayers(team.players||[]);
  $("sheetPlayerCount").textContent=players.length;
  $("sheetRosterMeta").textContent=`${players.length} ${t("rosterPlayers")}`;
  renderCoaches(team);
  renderLeadership(players);
  renderRoster(team,players);
}

function renderCoaches(team){
  const coaches=team.coaches||[];
  $("coachCountLabel").textContent=coaches.length?`(${coaches.length})`:"";
  const box=$("sheetCoaches");box.innerHTML="";
  if(!coaches.length){box.innerHTML=`<span class="coach-empty">${esc(t("noCoach"))}</span>`}
  else coaches.forEach(coach=>{
    const chip=document.createElement("span");chip.className="coach-chip";
    chip.innerHTML=`<span>${esc(coach.first_name)} ${esc(coach.last_name)}</span><button class="no-print" type="button" title="${esc(t("removeCoach"))}">×</button>`;
    chip.querySelector("button").onclick=async()=>{
      await api("/api/manager-roster",{method:"POST",body:JSON.stringify({action:"remove_coach_assignment",team_id:team.id,participant_id:coach.id})});
      await load();
    };
    box.appendChild(chip);
  });
  const select=$("coachCandidateSelect");select.innerHTML=`<option value="">${esc(t("selectCoach"))}</option>`;
  const currentIds=new Set(coaches.map(x=>x.id));
  (team.coach_candidates||[]).filter(x=>!currentIds.has(x.id)).forEach(p=>{
    const kind=p.participant_type==="coach"?t("coach"):t("playerType");
    const jersey=p.jersey_number?` · #${p.jersey_number}`:"";
    select.add(new Option(`${p.last_name} ${p.first_name} · ${kind}${jersey}`,p.id));
  });
  $("addCoachButton").disabled=select.options.length<=1;
  $("coachActionMessage").textContent="";
}

async function addCoachFromSheet(){
  if(!currentTeam)return;
  const id=$("coachCandidateSelect").value;if(!id)return;
  try{
    $("coachActionMessage").textContent=t("addingCoach");
    await api("/api/manager-roster",{method:"POST",body:JSON.stringify({action:"add_coach_assignment",team_id:currentTeam.id,participant_id:id})});
    await load();
  }catch(e){$("coachActionMessage").textContent=e.message}
}

function renderLeadership(players){
  renderLeader($("captainCard"),players.find(x=>x.captain),t("captain"));
  renderLeader($("viceCaptainCard"),players.find(x=>x.vice_captain),t("viceCaptain"));
}

function renderLeader(host,p,label){
  if(!p){host.innerHTML=`<div class="leader-empty">${esc(t("notAssigned"))}</div>`;return}
  host.innerHTML=`<div class="leader-person"><div class="leader-number">#${esc(p.jersey_number||"—")}</div><div><div class="leader-name">${esc(p.first_name)} ${esc(p.last_name)}</div><span class="badge role">${esc(label)}</span></div></div>`;
}

function renderRoster(team,players){
  const body=$("sheetRosterBody");body.innerHTML="";
  if(!players.length){body.innerHTML=`<tr><td colspan="5">${esc(t("notAssigned"))}</td></tr>`;return}
  players.forEach(p=>{
    const roles=[];
    if(p.captain)roles.push(`<span class="badge role">C</span>`);
    if(p.vice_captain)roles.push(`<span class="badge role">VC</span>`);
    if(p.is_team_coach)roles.push(`<span class="badge role">${esc(t("coach"))}</span>`);
    const tr=document.createElement("tr");tr.className="sheet-player-row";
    tr.innerHTML=`<td><strong>#${esc(p.jersey_number||"—")}</strong></td><td class="sheet-player-name">${esc(p.first_name)} ${esc(p.last_name)}</td><td><div class="sheet-role-badges">${roles.join("")||"—"}</div></td><td class="no-print"><span class="badge ${p.registration_complete?"ok":"warn"}">${esc(p.registration_complete?t("complete"):t("incomplete"))}</span></td><td class="no-print"><span class="badge ${p.meals_complete?"ok":"warn"}">${esc(p.meals_complete?t("completed"):t("missing"))}</span></td>`;
    tr.onclick=()=>openPlayer(team,p);
    body.appendChild(tr);
  });
}

function sortedPlayers(list){
  return [...list].sort((a,b)=>{const an=jerseyNumber(a.jersey_number),bn=jerseyNumber(b.jersey_number);return an-bn||`${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)});
}
function jerseyNumber(v){if(v===null||v===undefined||v==="")return Number.MAX_SAFE_INTEGER;const n=parseInt(String(v).replace(/\D/g,""),10);return Number.isNaN(n)?Number.MAX_SAFE_INTEGER:n}

function openPlayer(team,p){
  selected={t:team,p};
  $("dCat").textContent=catLabel(team.category);
  $("dName").textContent=`${p.first_name} ${p.last_name}`;
  $("dTeam").textContent=team.team_name;
  $("dJersey").textContent=p.jersey_number||"—";
  $("dReg").textContent=p.registration_complete?t("complete"):t("incomplete");
  $("dMeals").textContent=p.meals_complete?t("completed"):t("missing");
  $("captainBtn").textContent=p.captain?t("removeCaptain"):t("setCaptain");
  $("viceBtn").textContent=p.vice_captain?t("removeVice"):t("setVice");
  $("coachBtn").textContent=p.is_team_coach?t("removeCoach"):t("setCoach");
  $("playerDialog").showModal();
}

async function role(field){
  await api("/api/manager-membership",{method:"PATCH",body:JSON.stringify({membership_id:selected.p.membership_id,field,value:!selected.p[field]})});
  $("playerDialog").close();await load();
}
async function toggleCoach(){
  await api("/api/manager-roster",{method:"POST",body:JSON.stringify({action:selected.p.is_team_coach?"remove_coach_assignment":"add_coach_assignment",team_id:selected.t.id,participant_id:selected.p.id})});
  $("playerDialog").close();await load();
}
async function remove(){
  const msg=t("removeConfirm").replace("{name}",`${selected.p.first_name} ${selected.p.last_name}`).replace("{team}",selected.t.team_name);
  if(!confirm(msg))return;
  await api("/api/manager-membership",{method:"DELETE",body:JSON.stringify({membership_id:selected.p.membership_id})});
  $("playerDialog").close();await load();
}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
