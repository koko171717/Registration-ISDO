const $ = id => document.getElementById(id);

const params = new URLSearchParams(location.search);
const courtNumber = Number(params.get("court"));

let lastFingerprint = "";
let timer = null;

document.addEventListener("DOMContentLoaded", () => {
  if (![1,2,3,4].includes(courtNumber)) {
    hideOverlay();
    return;
  }

  refreshCourt();
  timer = setInterval(refreshCourt, 1800);
});

async function refreshCourt(){
  try{
    const response = await fetch(
      `/api/live-court?court=${encodeURIComponent(courtNumber)}&t=${Date.now()}`,
      { cache: "no-store" }
    );

    const result = await response.json();

    if(!response.ok){
      throw new Error(result.error || "Live court unavailable.");
    }

    if(!result.enabled){
      lastFingerprint = "";
      hideOverlay();
      return;
    }

    const fingerprint = JSON.stringify({
      updated_at: result.updated_at,
      team1: result.team1,
      team2: result.team2,
      team1_players: result.team1_players,
      team2_players: result.team2_players
    });

    if(fingerprint !== lastFingerprint){
      renderTeam("team1", result.team1, result.team1_players || []);
      renderTeam("team2", result.team2, result.team2_players || []);
      lastFingerprint = fingerprint;
    }

    $("matchView").classList.remove("hidden");

  }catch(error){
    console.error(error);
    hideOverlay();
  }
}

function hideOverlay(){
  $("matchView").classList.add("hidden");
}

function renderTeam(prefix, team, players){
  $(`${prefix}Name`).textContent = team.team_name;
  $(`${prefix}Club`).textContent = team.club_name;
  $(`${prefix}Category`).textContent = team.category;

  const logoUrl = team.logo_url || "/assets/isdo27-logo.png";

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

  renderAdaptiveRoster($(`${prefix}Players`), players);
}

function renderAdaptiveRoster(container, players){
  container.innerHTML = "";
  container.classList.toggle("two-columns", players.length > 14);
  container.classList.toggle("dense", players.length > 24);

  const columnCount = players.length > 14 ? 2 : 1;
  const perColumn = Math.ceil(players.length / columnCount);

  for(let columnIndex = 0; columnIndex < columnCount; columnIndex++){
    const column = document.createElement("div");
    column.className = "roster-column";

    players
      .slice(columnIndex * perColumn, (columnIndex + 1) * perColumn)
      .forEach(player => column.appendChild(createCompactRow(player)));

    container.appendChild(column);
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

function esc(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}
