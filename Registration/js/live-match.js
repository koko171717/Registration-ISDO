const $ = id => document.getElementById(id);

let allTeams = [];

document.addEventListener("DOMContentLoaded", async () => {
  setupMode();
  bindSelectionActions();
  bindPickerEvents();

  await loadTeams();
  loadFromUrl();
});

function setupMode(){
  const params = new URLSearchParams(location.search);
  const mode = params.get("mode") || "preview";

  document.body.dataset.mode = mode;

  if(mode === "overlay"){
    document.documentElement.classList.add("overlay-mode");
  }
}

function bindSelectionActions(){
  $("previewButton").onclick = () => {
    const url = buildUrl("preview");
    if(!url) return;
    location.href = url.toString();
  };

  $("openOverlayButton").onclick = () => {
    const url = buildUrl("overlay");
    if(!url) return;
    window.open(url.toString(), "_blank", "noopener");
  };

  $("copyOverlayButton").onclick = async () => {
    const url = buildUrl("overlay");
    if(!url) return;

    try{
      await navigator.clipboard.writeText(url.toString());
      $("copyOverlayButton").textContent = "Copied";

      setTimeout(() => {
        $("copyOverlayButton").textContent = "Copy PRISM URL";
      }, 1400);

    }catch{
      prompt("Copy this PRISM URL:", url.toString());
    }
  };
}

function bindPickerEvents(){
  $("club1Select").onchange = () => {
    populateTeamsForClub(1, $("club1Select").value);
    refreshTeamPreview(1);
  };

  $("club2Select").onchange = () => {
    populateTeamsForClub(2, $("club2Select").value);
    refreshTeamPreview(2);
  };

  $("team1Select").onchange = () => {
    refreshTeamPreview(1);
    refreshTeamOptions();
  };

  $("team2Select").onchange = () => {
    refreshTeamPreview(2);
    refreshTeamOptions();
  };
}

async function loadTeams(){
  try{
    const response = await fetch("/api/live-match?list=1");
    const result = await response.json();

    if(!response.ok){
      throw new Error(result.error || "Teams could not be loaded.");
    }

    allTeams = result.teams || [];

    populateClubSelect($("club1Select"));
    populateClubSelect($("club2Select"));

  }catch(error){
    fail(error.message);
  }
}

function populateClubSelect(select){
  const clubs = [...new Map(
    allTeams.map(team => [
      team.club_name,
      {
        name: team.club_name,
        logo_url: team.club_logo_url || team.logo_url || "/assets/isdo27-logo.png"
      }
    ])
  ).values()].sort((a,b) => a.name.localeCompare(b.name));

  select.innerHTML = '<option value="">Select a club…</option>';

  clubs.forEach(club => {
    select.add(new Option(club.name, club.name));
  });
}

function populateTeamsForClub(side, clubName, selectedTeamId = ""){
  const select = $(`team${side}Select`);

  select.innerHTML = "";

  if(!clubName){
    select.add(new Option("Select a club first…", ""));
    select.disabled = true;
    return;
  }

  const teams = allTeams
    .filter(team => team.club_name === clubName)
    .slice()
    .sort(teamSort);

  select.add(new Option("Select a team…", ""));

  teams.forEach(team => {
    const label =
      team.team_name === team.club_name
        ? team.category
        : `${team.category} — ${team.team_name}`;

    const option = new Option(label, team.id);

    if(team.id === selectedTeamId){
      option.selected = true;
    }

    select.add(option);
  });

  select.disabled = false;
  refreshTeamOptions();
}

function refreshTeamOptions(){
  const team1 = $("team1Select").value;
  const team2 = $("team2Select").value;

  [...$("team1Select").options].forEach(option => {
    option.disabled =
      !!option.value &&
      option.value === team2 &&
      option.value !== team1;
  });

  [...$("team2Select").options].forEach(option => {
    option.disabled =
      !!option.value &&
      option.value === team1 &&
      option.value !== team2;
  });

  clearSelectionMessage();
}

function refreshTeamPreview(side){
  const teamId = $(`team${side}Select`).value;
  const team = allTeams.find(item => item.id === teamId);

  const logo = $(`team${side}PreviewLogo`);
  const name = $(`team${side}PreviewName`);
  const club = $(`team${side}PreviewClub`);
  const category = $(`team${side}PreviewCategory`);
  const summary = $(`team${side}Summary`);

  if(!team){
    logo.src = "/assets/isdo27-logo.png";
    name.textContent = "No team selected";
    club.textContent = "—";
    category.textContent = "—";
    summary.textContent = "Select a team";
    return;
  }

  logo.src = team.logo_url || team.club_logo_url || "/assets/isdo27-logo.png";
  logo.onerror = () => {
    logo.src = "/assets/isdo27-logo.png";
  };

  name.textContent = team.team_name;
  club.textContent = team.club_name;
  category.textContent = team.category;
  summary.textContent = `${team.category} · ${team.team_name}`;
}

async function loadFromUrl(){
  const params = new URLSearchParams(location.search);
  const team1Id = params.get("team1") || "";
  const team2Id = params.get("team2") || "";

  if(team1Id){
    setPickerFromTeam(1, team1Id);
  }

  if(team2Id){
    setPickerFromTeam(2, team2Id);
  }

  refreshTeamOptions();

  if(!team1Id || !team2Id){
    $("loading").classList.add("hidden");
    return;
  }

  if(team1Id === team2Id){
    showSelectionMessage("Team A and Team B must be different.");
    return;
  }

  try{
    $("loading").classList.remove("hidden");

    const response = await fetch(
      `/api/live-match?team1_id=${encodeURIComponent(team1Id)}&team2_id=${encodeURIComponent(team2Id)}`
    );

    const result = await response.json();

    if(!response.ok){
      throw new Error(
        result.error || "Match rosters could not be loaded."
      );
    }

    renderTeam(
      "team1",
      result.team1,
      result.team1_players,
      result.team1_coaches
    );

    renderTeam(
      "team2",
      result.team2,
      result.team2_players,
      result.team2_coaches
    );

    $("loading").classList.add("hidden");
    $("errorView").classList.add("hidden");
    $("matchView").classList.remove("hidden");

  }catch(error){
    fail(error.message);
  }
}

function setPickerFromTeam(side, teamId){
  const team = allTeams.find(item => item.id === teamId);

  if(!team){
    return;
  }

  $(`club${side}Select`).value = team.club_name;

  populateTeamsForClub(
    side,
    team.club_name,
    team.id
  );

  refreshTeamPreview(side);
}

function renderTeam(prefix, team, players, coaches=[]){
  $(`${prefix}Name`).textContent = team.team_name;
  $(`${prefix}Club`).textContent = team.club_name;
  $(`${prefix}Category`).textContent = team.category;

  const logoUrl =
    team.logo_url ||
    "/assets/isdo27-logo.png";

  $(`${prefix}Logo`).src = logoUrl;

  $(`${prefix}Logo`).onerror = () => {
    $(`${prefix}Logo`).src = "/assets/isdo27-logo.png";
  };

  const card = $(`${prefix}Card`);

  if(card){
    card.style.setProperty(
      "--team-watermark",
      `url("${String(logoUrl).replaceAll('"', '\\"')}")`
    );
  }

  renderCoachStrip(prefix, coaches || []);
  renderAdaptiveRoster($(`${prefix}Players`), players || []);
}

function renderCoachStrip(prefix, coaches){const card=$(`${prefix}Card`);let strip=card?.querySelector('.coach-strip-live');if(!strip&&card){strip=document.createElement('div');strip.className='coach-strip-live';const header=card.querySelector('.team-header');header?.insertAdjacentElement('afterend',strip)}if(!strip)return;strip.classList.toggle('hidden',!coaches.length);strip.innerHTML=coaches.length?`<span class="coach-label">Coach${coaches.length>1?'es':''}</span><span>${coaches.map(c=>esc(`${c.first_name} ${c.last_name}`)).join(' · ')}</span>`:'';}

function renderAdaptiveRoster(container, players){
  container.innerHTML = "";
  container.classList.toggle("two-columns", players.length >= 12);
  container.classList.toggle("dense", players.length > 24);

  const columnCount = players.length >= 12 ? 2 : 1;
  const perColumn = Math.ceil(players.length / columnCount);

  for(let columnIndex = 0; columnIndex < columnCount; columnIndex++){
    const column = document.createElement("div");
    column.className = "roster-column";

    const slice = players.slice(
      columnIndex * perColumn,
      (columnIndex + 1) * perColumn
    );

    slice.forEach(player => {
      column.appendChild(createCompactRow(player));
    });

    container.appendChild(column);
  }

  if(!players.length){
    const empty = document.createElement("div");
    empty.className = "roster-empty";
    empty.textContent = "No registered players yet.";
    container.appendChild(empty);
  }
}

function createCompactRow(player){
  const row = document.createElement("div");
  row.className = "roster-row compact-row";

  const lastName = String(player.last_name || "").trim().toUpperCase();
  const firstInitial = String(player.first_name || "").trim().charAt(0).toUpperCase();
  const displayName = firstInitial ? `${lastName} ${firstInitial}.` : lastName;

  row.innerHTML = `
    <span class="roster-number">#${esc(player.jersey_number || "—")}</span>

    <span class="roster-player-inline">
      <span class="roster-compact-name">${esc(displayName)}</span>
      ${
        player.role
          ? `<span class="role-badge compact-role">${esc(player.role)}</span>`
          : ""
      }
    </span>
  `;

  return row;
}


function buildUrl(mode){
  const team1 = $("team1Select").value;
  const team2 = $("team2Select").value;

  if(!team1 || !team2){
    showSelectionMessage("Please select both teams first.");
    return null;
  }

  if(team1 === team2){
    showSelectionMessage("Team A and Team B must be different.");
    return null;
  }

  const url = new URL(location.href);

  url.searchParams.set("team1", team1);
  url.searchParams.set("team2", team2);
  url.searchParams.set("mode", mode);

  return url;
}

function teamSort(a,b){
  const order = {
    Men: 1,
    Women: 2,
    Mixed: 3
  };

  return (
    (order[a.category] || 99) -
      (order[b.category] || 99) ||
    a.team_name.localeCompare(b.team_name)
  );
}

function showSelectionMessage(message){
  $("selectionMessage").textContent = message;
  $("selectionMessage").classList.remove("hidden");
}

function clearSelectionMessage(){
  $("selectionMessage").textContent = "";
  $("selectionMessage").classList.add("hidden");
}

function fail(message){
  $("loading").classList.add("hidden");
  $("matchView").classList.add("hidden");
  $("errorMessage").textContent = message;
  $("errorView").classList.remove("hidden");
}

function esc(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}
