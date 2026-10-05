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
      team2_players: result.team2_players,
      team1_coaches: result.team1_coaches,
      team2_coaches: result.team2_coaches
    });

    if(fingerprint !== lastFingerprint){
      renderTeam("team1", result.team1, result.team1_players || [], result.team1_coaches || []);
      renderTeam("team2", result.team2, result.team2_players || [], result.team2_coaches || []);
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

function renderTeam(prefix, team, players, coaches=[]){
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

  renderCoachStrip(prefix, coaches || []);
  renderAdaptiveRoster($(`${prefix}Players`), players);
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
