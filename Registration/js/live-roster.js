const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  setupMode();
  loadRoster();
});


function setupMode(){
  const params = new URLSearchParams(location.search);
  const teamId = params.get("team") || "";
  const mode = params.get("mode") || "preview";

  document.body.dataset.mode = mode;

  if(mode !== "overlay"){
    $("previewTools").classList.remove("hidden");

    $("openOverlayButton").onclick = () => {
      const url = new URL(location.href);
      url.searchParams.set("mode", "overlay");
      window.open(url.toString(), "_blank", "noopener");
    };

    $("copyOverlayButton").onclick = async () => {
      const url = new URL(location.href);
      url.searchParams.set("mode", "overlay");

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

  if(mode === "overlay"){
    document.documentElement.classList.add("overlay-mode");
  }
}

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
    const tournamentLogo = "/assets/isdo27-logo.png";
    const watermarkLogo = result.team.logo_url || tournamentLogo;

    $("teamLogo").src = tournamentLogo;
    $("teamLogo").onerror = () => {
      $("teamLogo").src = tournamentLogo;
    };

    const board = document.querySelector(".roster-board");
    if(board){
      board.style.setProperty(
        "--team-watermark",
        `url("${String(watermarkLogo).replaceAll('"', '\"')}")`
      );
    }

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
