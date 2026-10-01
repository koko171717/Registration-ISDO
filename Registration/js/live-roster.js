const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", loadRoster);

async function loadRoster(){
  const teamId = new URLSearchParams(location.search).get("team") || "";

  if(!teamId){
    return fail("This live roster link is incomplete.");
  }

  try{
    const response = await fetch(
      `/api/live-roster?team_id=${encodeURIComponent(teamId)}`
    );

    const result = await response.json();

    if(!response.ok){
      throw new Error(result.error || "Roster could not be loaded.");
    }

    $("teamName").textContent = result.team.team_name;
    $("clubName").textContent = result.team.club_name;
    $("category").textContent = result.team.category;

    const players = $("players");
    players.innerHTML = "";

    if(!result.players.length){
      players.innerHTML = `
        <div class="roster-row">
          <span></span>
          <span class="roster-first">No registered players yet.</span>
          <span></span>
          <span></span>
        </div>
      `;
    }else{
      result.players.forEach(player => {
        const row = document.createElement("div");
        row.className = "roster-row";

        row.innerHTML = `
          <span class="roster-number">#${esc(player.jersey_number || "—")}</span>
          <span class="roster-name">${esc(player.last_name)}</span>
          <span class="roster-first">${esc(player.first_name)}</span>
          <span>${player.role ? `<span class="role-badge">${esc(player.role)}</span>` : ""}</span>
        `;

        players.appendChild(row);
      });
    }

    $("loading").classList.add("hidden");
    $("rosterView").classList.remove("hidden");

  }catch(error){
    fail(error.message);
  }
}

function fail(message){
  $("loading").classList.add("hidden");
  $("rosterView").classList.add("hidden");
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
