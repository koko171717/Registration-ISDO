const db = window.isdoSupabase;
const $ = id => document.getElementById(id);

let session = null;
let data = null;
let currentPlayers = [];
let selectedPlayer = null;
let broadcastCourts = [];

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();

  const response = await db.auth.getSession();
  session = response.data.session;

  if (session) {
    await load();
  }
});

function bindEvents() {
  $("loginForm").onsubmit = login;
  $("logoutButton").onclick = () => db.auth.signOut();

  document.querySelectorAll(".tab").forEach(button => {
    button.onclick = () => switchView(button.dataset.view);
  });

  [
    "playerSearch",
    "filterOriginClub",
    "filterCategory",
    "filterTeam",
    "filterRegistration",
    "filterMeals"
  ].forEach(id => {
    $(id).addEventListener("input", renderPlayers);
  });

  $("mealDayFilter").onchange = renderMeals;
  $("mealClubFilter").onchange = renderMeals;

  $("exportPlayers").onclick = exportPlayers;
  $("exportMeals").onclick = exportMeals;

  $("closePlayerDialog").onclick = () => $("playerDialog").close();
  $("playerEditForm").onsubmit = savePlayer;
  $("deletePlayerButton").onclick = deletePlayer;

  $("addTeamCategory").onchange = renderAddTeamOptions;
  $("addTeamButton").onclick = addTeamToPlayer;

  const refreshBroadcastButton = $("refreshBroadcastButton");
  if (refreshBroadcastButton) {
    refreshBroadcastButton.onclick = loadBroadcast;
  }

  db.auth.onAuthStateChange((_event, newSession) => {
    session = newSession;

    if (newSession) {
      load();
    } else {
      showLogin();
    }
  });
}

async function login(event) {
  event.preventDefault();

  const { error } = await db.auth.signInWithPassword({
    email: $("loginEmail").value.trim().toLowerCase(),
    password: $("loginPassword").value
  });

  if (error) {
    $("loginMessage").textContent = error.message;
    $("loginMessage").classList.remove("hidden");
  }
}

function showLogin() {
  $("appView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Request failed");
  }

  return result;
}

async function load() {
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("appMessage").classList.add("hidden");

  try {
    data = await api("/api/admin-data");

    $("adminEmail").textContent = data.admin_email || "";

    populateFilters();
    renderOverview();
    renderPlayers();
    renderMeals();
    renderTeams();
    loadBroadcast();
  } catch (error) {
    $("appMessage").textContent = error.message;
    $("appMessage").classList.remove("hidden");
  }
}

function switchView(name) {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.view === name);
  });

  document.querySelectorAll(".view").forEach(view => {
    view.classList.add("hidden");
  });

  $(`${name}View`).classList.remove("hidden");

  if (name === "broadcast") {
    loadBroadcast();
  }
}

function resetSelectExceptFirst(select) {
  while (select.options.length > 1) {
    select.remove(1);
  }
}

function populateFilters() {
  const clubs = [...data.clubs].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  resetSelectExceptFirst($("filterOriginClub"));
  resetSelectExceptFirst($("mealClubFilter"));
  $("editOriginClub").innerHTML = "";

  clubs.forEach(club => {
    $("filterOriginClub").add(new Option(club.name, club.id));
    $("mealClubFilter").add(new Option(club.name, club.id));
    $("editOriginClub").add(new Option(club.name, club.id));
  });

  resetSelectExceptFirst($("filterCategory"));
  data.categories.forEach(category => {
    $("filterCategory").add(
      new Option(category.name, category.id)
    );
  });

  resetSelectExceptFirst($("filterTeam"));
  data.teams
    .slice()
    .sort((a, b) =>
      `${a.category} ${a.team_name}`.localeCompare(
        `${b.category} ${b.team_name}`
      )
    )
    .forEach(team => {
      $("filterTeam").add(
        new Option(
          `${team.category} — ${team.team_name}`,
          team.id
        )
      );
    });

  const currentDay = $("mealDayFilter").value;
  $("mealDayFilter").innerHTML = "";

  data.meal_days.forEach(day => {
    $("mealDayFilter").add(new Option(day.name, day.id));
  });

  if (
    currentDay &&
    data.meal_days.some(day => day.id === currentDay)
  ) {
    $("mealDayFilter").value = currentDay;
  }
}

function renderOverview() {
  const players = data.players;

  $("statPlayers").textContent = players.length;
  $("statComplete").textContent =
    players.filter(player => player.registration_complete).length;
  $("statIncomplete").textContent =
    players.filter(player => !player.registration_complete).length;
  $("statTeams").textContent = data.teams.length;

  const mealsByDay = new Map(
    data.meal_days.map(day => [day.id, 0])
  );

  data.meals.forEach(meal => {
    if (meal.ordered) {
      mealsByDay.set(
        meal.meal_day_id,
        (mealsByDay.get(meal.meal_day_id) || 0) + 1
      );
    }
  });

  data.meal_days.forEach(day => {
    const id = {
      Friday: "statFriday",
      Saturday: "statSaturday",
      Sunday: "statSunday"
    }[day.name];

    if (id) {
      $(id).textContent = mealsByDay.get(day.id) || 0;
    }
  });

  $("statMissingMeals").textContent =
    players.filter(player => !player.meals_complete).length;

  const alerts = [
    `${
      players.filter(player => !player.registration_complete).length
    } incomplete registrations`,
    `${
      players.filter(player => !player.meals_complete).length
    } players with missing meal selections`,
    `${
      data.teams.filter(team => !team.has_captain).length
    } teams without captain`
  ];

  $("alerts").innerHTML = alerts
    .map(alert => `<div class="alert-line">${escapeHtml(alert)}</div>`)
    .join("");
}

function filteredPlayers() {
  const search = $("playerSearch").value.trim().toLowerCase();
  const club = $("filterOriginClub").value;
  const category = $("filterCategory").value;
  const team = $("filterTeam").value;
  const registration = $("filterRegistration").value;
  const meals = $("filterMeals").value;

  return data.players
    .filter(player => {
      if (
        search &&
        !`${player.first_name} ${player.last_name}`
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }

      if (club && player.origin_club_id !== club) {
        return false;
      }

      if (
        registration &&
        (registration === "complete") !==
          player.registration_complete
      ) {
        return false;
      }

      if (
        meals &&
        (meals === "complete") !== player.meals_complete
      ) {
        return false;
      }

      if (team && !player.team_ids.includes(team)) {
        return false;
      }

      if (
        category &&
        !player.category_ids.includes(category)
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(
        `${b.last_name} ${b.first_name}`
      )
    );
}

function renderPlayers() {
  currentPlayers = filteredPlayers();

  $("playersCount").textContent =
    `${currentPlayers.length} players`;

  $("playersBody").innerHTML = currentPlayers
    .map(
      player => `
        <tr>
          <td>
            <b>${escapeHtml(player.first_name)} ${escapeHtml(player.last_name)}</b>
          </td>

          <td>#${escapeHtml(player.jersey_number || "—")}</td>

          <td>${escapeHtml(player.origin_club_name)}</td>

          <td>
            ${player.teams
              .map(
                team =>
                  `<span class="badge role">${escapeHtml(team.category)} — ${escapeHtml(team.team_name)}</span>`
              )
              .join(" ")}
          </td>

          <td>
            <span class="badge ${player.registration_complete ? "ok" : "warn"}">
              ${player.registration_complete ? "Complete" : "Incomplete"}
            </span>
          </td>

          <td>
            <span class="badge ${player.meals_complete ? "ok" : "warn"}">
              ${player.meals_complete ? "Complete" : "Missing"}
            </span>
          </td>

          <td>
            <button
              class="secondary"
              onclick="openPlayer('${player.id}')"
            >
              Edit
            </button>
          </td>
        </tr>
      `
    )
    .join("");
}

window.openPlayer = function openPlayer(id) {
  selectedPlayer = data.players.find(player => player.id === id);

  if (!selectedPlayer) {
    return;
  }

  $("editPlayerTitle").textContent =
    `${selectedPlayer.first_name} ${selectedPlayer.last_name}`;

  $("editFirstName").value = selectedPlayer.first_name;
  $("editLastName").value = selectedPlayer.last_name;
  $("editJersey").value = selectedPlayer.jersey_number || "";
  $("editOriginClub").value = selectedPlayer.origin_club_id;

  renderPlayerTeamsEditor();
  $("playerDialog").showModal();
};

function availableTeamsForSelectedPlayer() {
  const allowedTeamIds = new Set(
    data.team_access
      .filter(
        access =>
          access.origin_club_id === selectedPlayer.origin_club_id
      )
      .map(access => access.team_id)
  );

  return data.teams.filter(team =>
    allowedTeamIds.has(team.id)
  );
}

function renderPlayerTeamsEditor() {
  const container = $("currentPlayerTeams");

  container.innerHTML = "";

  const sortedTeams = selectedPlayer.teams
    .slice()
    .sort(
      (a, b) =>
        Number(a.membership_order || 99) -
        Number(b.membership_order || 99)
    );

  if (!sortedTeams.length) {
    container.innerHTML =
      `<p class="muted">No team currently assigned.</p>`;
  } else {
    sortedTeams.forEach(team => {
      const row = document.createElement("div");
      row.className = "current-team-row";

      const currentRole = team.captain
        ? "captain"
        : team.vice_captain
          ? "vice_captain"
          : "player";

      row.innerHTML = `
        <div class="current-team-main">
          <div class="current-team-info">
            <span class="badge role">${escapeHtml(team.category)}</span>
            <strong>${escapeHtml(team.team_name)}</strong>
          </div>

          <label class="team-role-field">
            <span>Role</span>
            <select class="team-role-select">
              <option value="player" ${currentRole === "player" ? "selected" : ""}>Player</option>
              <option value="captain" ${currentRole === "captain" ? "selected" : ""}>Captain (C)</option>
              <option value="vice_captain" ${currentRole === "vice_captain" ? "selected" : ""}>Vice-captain (VC)</option>
            </select>
          </label>
        </div>

        <button
          type="button"
          class="mini-danger remove-team-button"
        >
          Remove
        </button>
      `;

      row.querySelector(".team-role-select").onchange = event =>
        updateMembershipRole(team.membership_id, event.target.value, event.target);

      row.querySelector(".remove-team-button").onclick = () =>
        removeTeamFromPlayer(team.membership_id);

      container.appendChild(row);
    });
  }

  $("addTeamCategory").innerHTML =
    '<option value="">Select category</option>';

  const usedCategoryIds = new Set(
    selectedPlayer.teams.map(team => team.category_id)
  );

  const availableCategoryIds = new Set(
    availableTeamsForSelectedPlayer().map(
      team => team.category_id
    )
  );

  data.categories
    .filter(
      category =>
        availableCategoryIds.has(category.id) &&
        !usedCategoryIds.has(category.id)
    )
    .forEach(category => {
      $("addTeamCategory").add(
        new Option(category.name, category.id)
      );
    });

  $("addTeamSelect").innerHTML =
    '<option value="">Select team</option>';
  $("addTeamSelect").disabled = true;

  const reachedMaximum = selectedPlayer.teams.length >= 2;

  $("addTeamCategory").disabled = reachedMaximum;
  $("addTeamButton").disabled = reachedMaximum;

  $("teamEditMessage").textContent = reachedMaximum
    ? "Maximum of two categories reached."
    : "";
}

function renderAddTeamOptions() {
  const categoryId = $("addTeamCategory").value;
  const select = $("addTeamSelect");

  select.innerHTML =
    '<option value="">Select team</option>';

  if (!categoryId) {
    select.disabled = true;
    return;
  }

  const teams = availableTeamsForSelectedPlayer()
    .filter(
      team =>
        team.category_id === categoryId &&
        !selectedPlayer.team_ids.includes(team.id)
    )
    .sort((a, b) =>
      a.team_name.localeCompare(b.team_name)
    );

  teams.forEach(team => {
    select.add(new Option(team.team_name, team.id));
  });

  select.disabled = false;

  if (teams.length === 1) {
    select.value = teams[0].id;
  }
}

async function addTeamToPlayer() {
  const teamId = $("addTeamSelect").value;

  if (!teamId) {
    $("teamEditMessage").textContent =
      "Select a category and a team first.";
    return;
  }

  $("teamEditMessage").textContent = "Adding team…";

  try {
    await api("/api/admin-player-team", {
      method: "POST",
      body: JSON.stringify({
        player_id: selectedPlayer.id,
        team_id: teamId
      })
    });

    await refreshSelectedPlayer();

    $("teamEditMessage").textContent = "Team added.";
  } catch (error) {
    $("teamEditMessage").textContent = error.message;
  }
}

async function updateMembershipRole(membershipId, role, selectElement) {
  const previousValue = selectElement.dataset.previousValue ||
    (selectedPlayer.teams.find(team => team.membership_id === membershipId)?.captain
      ? "captain"
      : selectedPlayer.teams.find(team => team.membership_id === membershipId)?.vice_captain
        ? "vice_captain"
        : "player");

  selectElement.dataset.previousValue = previousValue;
  selectElement.disabled = true;
  $("teamEditMessage").textContent = "Saving role…";

  try {
    await api("/api/admin-player-team", {
      method: "PATCH",
      body: JSON.stringify({
        player_id: selectedPlayer.id,
        membership_id: membershipId,
        role
      })
    });

    await refreshSelectedPlayer();
    $("teamEditMessage").textContent = "Role saved.";
  } catch (error) {
    selectElement.value = previousValue;
    selectElement.disabled = false;
    $("teamEditMessage").textContent = error.message;
  }
}

async function removeTeamFromPlayer(membershipId) {
  const membership = selectedPlayer.teams.find(
    team => team.membership_id === membershipId
  );

  const label = membership
    ? `${membership.category} — ${membership.team_name}`
    : "this team";

  if (
    !confirm(
      `Remove ${selectedPlayer.first_name} ${selectedPlayer.last_name} from ${label}?`
    )
  ) {
    return;
  }

  try {
    await api("/api/admin-player-team", {
      method: "DELETE",
      body: JSON.stringify({
        player_id: selectedPlayer.id,
        membership_id: membershipId
      })
    });

    await refreshSelectedPlayer();
  } catch (error) {
    $("teamEditMessage").textContent = error.message;
  }
}

async function refreshSelectedPlayer() {
  const playerId = selectedPlayer.id;

  data = await api("/api/admin-data");
  selectedPlayer = data.players.find(
    player => player.id === playerId
  );

  populateFilters();
  renderOverview();
  renderPlayers();
  renderMeals();
  renderTeams();

  if (selectedPlayer) {
    renderPlayerTeamsEditor();
  }
}

async function savePlayer(event) {
  event.preventDefault();

  await api("/api/admin-player", {
    method: "PATCH",
    body: JSON.stringify({
      player_id: selectedPlayer.id,
      first_name: $("editFirstName").value.trim(),
      last_name: $("editLastName").value.trim(),
      jersey_number: $("editJersey").value.trim() || null,
      origin_club_id: $("editOriginClub").value
    })
  });

  $("playerDialog").close();
  await load();
}

async function deletePlayer() {
  if (!selectedPlayer) {
    return;
  }

  if (
    !confirm(
      `Delete ${selectedPlayer.first_name} ${selectedPlayer.last_name} and all linked registration data?`
    )
  ) {
    return;
  }

  await api("/api/admin-player", {
    method: "DELETE",
    body: JSON.stringify({
      player_id: selectedPlayer.id
    })
  });

  $("playerDialog").close();
  await load();
}

function renderMeals() {
  if (!data) {
    return;
  }

  const dayId = $("mealDayFilter").value;
  const clubId = $("mealClubFilter").value;

  const rows = data.meals.filter(meal => {
    if (dayId && meal.meal_day_id !== dayId) {
      return false;
    }

    if (clubId && meal.origin_club_id !== clubId) {
      return false;
    }

    return true;
  });

  const orderedMeals = rows.filter(meal => meal.ordered);
  const counts = {};

  data.sandwich_options.forEach(option => {
    counts[option.name] = 0;
  });

  orderedMeals.forEach(meal => {
    counts[meal.sandwich_name] =
      (counts[meal.sandwich_name] || 0) + 1;
  });

  $("mealSummary").innerHTML =
    Object.entries(counts)
      .map(
        ([name, count]) => `
          <div class="meal-card">
            <span>${escapeHtml(name)}</span>
            <strong>${count}</strong>
          </div>
        `
      )
      .join("") +
    `
      <div class="meal-card">
        <span>Total meals</span>
        <strong>${orderedMeals.length}</strong>
      </div>
    `;

  $("mealsBody").innerHTML = rows
    .sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(
        `${b.last_name} ${b.first_name}`
      )
    )
    .map(
      meal => `
        <tr>
          <td>${escapeHtml(meal.first_name)} ${escapeHtml(meal.last_name)}</td>
          <td>${escapeHtml(meal.origin_club_name)}</td>
          <td>${escapeHtml(meal.day_name)}</td>
          <td>${escapeHtml(meal.ordered ? meal.sandwich_name : "No meal")}</td>
          <td>${meal.ordered ? `CHF ${Number(meal.price_chf).toFixed(2)}` : "—"}</td>
        </tr>
      `
    )
    .join("");
}

function renderTeams() {
  const byClub = new Map();

  data.teams.forEach(team => {
    if (!byClub.has(team.managing_club_name)) {
      byClub.set(team.managing_club_name, []);
    }

    byClub.get(team.managing_club_name).push(team);
  });

  const grid = $("teamsGrid");
  grid.innerHTML = "";
  grid.className = "clubs-accordion";

  [...byClub.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([clubName, teams]) => {
      const club = document.createElement("article");
      club.className = "admin-club-accordion";

      const totalPlayers = new Set(
        teams.flatMap(team =>
          getPlayersForTeam(team.id).map(player => player.id)
        )
      ).size;

      const clubButton = document.createElement("button");
      clubButton.type = "button";
      clubButton.className = "admin-club-button";
      clubButton.setAttribute("aria-expanded", "false");

      clubButton.innerHTML = `
        <div class="admin-club-button-main">
          <span class="admin-club-name">${escapeHtml(clubName)}</span>
          <span class="admin-club-meta">
            ${teams.length} ${teams.length === 1 ? "team" : "teams"}
            ·
            ${totalPlayers} ${totalPlayers === 1 ? "player" : "players"}
          </span>
        </div>

        <span class="admin-club-chevron">⌄</span>
      `;

      const clubContent = document.createElement("div");
      clubContent.className = "admin-club-content hidden";

      const clubBack = document.createElement("button");
      clubBack.type = "button";
      clubBack.className = "admin-back-button";
      clubBack.textContent = "← All clubs";

      const teamsList = document.createElement("div");
      teamsList.className = "admin-club-teams";

      clubBack.onclick = () => {
        club.classList.remove("open", "focus-club");
        clubButton.setAttribute("aria-expanded", "false");
        clubContent.classList.add("hidden");

        grid.querySelectorAll(".admin-club-accordion").forEach(otherClub => {
          otherClub.classList.remove("hidden");
        });
      };

      teams
        .slice()
        .sort(teamSort)
        .forEach(team => {
          const teamPlayers = getPlayersForTeam(team.id);

          const teamWrapper = document.createElement("div");
          teamWrapper.className = "admin-team-accordion";

          const teamButton = document.createElement("button");
          teamButton.type = "button";
          teamButton.className = "admin-team-button";
          teamButton.setAttribute("aria-expanded", "false");

          teamButton.innerHTML = `
            <div class="admin-team-title">
              <span class="badge role">${escapeHtml(team.category)}</span>
              <span class="admin-team-name">${escapeHtml(team.team_name)}</span>
            </div>

            <div class="admin-team-count">
              <strong>${teamPlayers.length}</strong>
              <span>${teamPlayers.length === 1 ? "player" : "players"}</span>
              <span class="admin-chevron">⌄</span>
            </div>
          `;

          const rosterView = document.createElement("div");
          rosterView.className = "admin-team-roster-view hidden";

          const rosterBack = document.createElement("button");
          rosterBack.type = "button";
          rosterBack.className = "admin-back-button team-back-button";
          rosterBack.textContent = "← Back to teams";

          const roster = document.createElement("div");
          roster.className = "admin-team-roster-list";

          if (!teamPlayers.length) {
            roster.innerHTML =
              '<div class="admin-empty-roster">No registered players yet.</div>';
          } else {
            teamPlayers.forEach(player => {
              const membership = player.teams.find(
                playerTeam => playerTeam.id === team.id
              );

              const row = document.createElement("button");
              row.type = "button";
              row.className = "admin-roster-player";

              row.innerHTML = `
                <span class="admin-jersey">
                  #${escapeHtml(player.jersey_number || "—")}
                </span>

                <span class="admin-player-name">
                  ${escapeHtml(player.first_name)} ${escapeHtml(player.last_name)}
                  ${
                    membership?.captain
                      ? '<span class="badge captain">C</span>'
                      : ""
                  }
                  ${
                    membership?.vice_captain
                      ? '<span class="badge captain">VC</span>'
                      : ""
                  }
                </span>

                <span class="admin-origin-club">
                  ${escapeHtml(player.origin_club_name)}
                </span>

                <span>
                  <span class="badge ${player.registration_complete ? "ok" : "warn"}">
                    ${player.registration_complete ? "Complete" : "Incomplete"}
                  </span>
                </span>

                <span>
                  <span class="badge ${player.meals_complete ? "ok" : "warn"}">
                    ${player.meals_complete ? "Meals ✓" : "Meals missing"}
                  </span>
                </span>
              `;

              row.onclick = () => openPlayer(player.id);
              roster.appendChild(row);
            });
          }

          rosterBack.onclick = () => {
            teamWrapper.classList.remove("open", "focus-team");
            teamButton.setAttribute("aria-expanded", "false");
            rosterView.classList.add("hidden");

            teamsList
              .querySelectorAll(".admin-team-accordion")
              .forEach(otherTeam => {
                otherTeam.classList.remove("hidden");
              });
          };

          teamButton.onclick = () => {
            teamsList
              .querySelectorAll(".admin-team-accordion")
              .forEach(otherTeam => {
                if (otherTeam !== teamWrapper) {
                  otherTeam.classList.add("hidden");
                }
              });

            teamWrapper.classList.add("open", "focus-team");
            teamButton.setAttribute("aria-expanded", "true");
            rosterView.classList.remove("hidden");
          };

          const rosterTools = document.createElement("div");
          rosterTools.className = "admin-roster-tools";

          const liveButton = document.createElement("button");
          liveButton.type = "button";
          liveButton.className = "live-roster-button";
          liveButton.textContent = "Open live roster";
          liveButton.onclick = () => {
            window.open(
              `/live-roster.html?team=${encodeURIComponent(team.id)}`,
              "_blank",
              "noopener"
            );
          };

          const downloadButton = document.createElement("button");
          downloadButton.type = "button";
          downloadButton.className = "secondary";
          downloadButton.textContent = "Download roster";
          downloadButton.onclick = () => downloadTeamRoster(team, teamPlayers);

          rosterTools.appendChild(liveButton);
          rosterTools.appendChild(downloadButton);

          rosterView.appendChild(rosterBack);
          rosterView.appendChild(rosterTools);
          rosterView.appendChild(roster);

          teamWrapper.appendChild(teamButton);
          teamWrapper.appendChild(rosterView);
          teamsList.appendChild(teamWrapper);
        });

      clubButton.onclick = () => {
        grid.querySelectorAll(".admin-club-accordion").forEach(otherClub => {
          if (otherClub !== club) {
            otherClub.classList.add("hidden");
          }
        });

        club.classList.add("open", "focus-club");
        clubButton.setAttribute("aria-expanded", "true");
        clubContent.classList.remove("hidden");
      };

      clubContent.appendChild(clubBack);
      clubContent.appendChild(teamsList);

      club.appendChild(clubButton);
      club.appendChild(clubContent);
      grid.appendChild(club);
    });
}

function getPlayersForTeam(teamId) {
  return data.players
    .filter(player => player.team_ids.includes(teamId))
    .slice()
    .sort((a, b) => {
      const jerseyA = jerseyNumber(a.jersey_number);
      const jerseyB = jerseyNumber(b.jersey_number);

      if (jerseyA !== jerseyB) {
        return jerseyA - jerseyB;
      }

      return `${a.last_name} ${a.first_name}`.localeCompare(
        `${b.last_name} ${b.first_name}`
      );
    });
}

function jerseyNumber(value) {
  if (value === null || value === undefined || value === "") {
    return Number.MAX_SAFE_INTEGER;
  }

  const number = parseInt(
    String(value).replace(/\D/g, ""),
    10
  );

  return Number.isNaN(number)
    ? Number.MAX_SAFE_INTEGER
    : number;
}

function teamSort(a, b) {
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

function exportPlayers() {
  const rows = [
    [
      "First name",
      "Last name",
      "Jersey",
      "Origin club",
      "Teams",
      "Registration",
      "Meals"
    ]
  ];

  currentPlayers.forEach(player => {
    rows.push([
      player.first_name,
      player.last_name,
      player.jersey_number || "",
      player.origin_club_name,
      player.teams
        .map(
          team =>
            `${team.category}: ${team.team_name}`
        )
        .join(" | "),
      player.registration_complete
        ? "Complete"
        : "Incomplete",
      player.meals_complete ? "Complete" : "Missing"
    ]);
  });

  downloadCsv("isdo-players.csv", rows);
}

function exportMeals() {
  const dayId = $("mealDayFilter").value;
  const clubId = $("mealClubFilter").value;

  const rows = [
    [
      "First name",
      "Last name",
      "Origin club",
      "Day",
      "Meal",
      "Price CHF"
    ]
  ];

  data.meals
    .filter(meal => {
      if (dayId && meal.meal_day_id !== dayId) {
        return false;
      }

      if (
        clubId &&
        meal.origin_club_id !== clubId
      ) {
        return false;
      }

      return true;
    })
    .forEach(meal => {
      rows.push([
        meal.first_name,
        meal.last_name,
        meal.origin_club_name,
        meal.day_name,
        meal.ordered
          ? meal.sandwich_name
          : "No meal",
        meal.ordered ? meal.price_chf : ""
      ]);
    });

  downloadCsv("isdo-meals.csv", rows);
}


function downloadTeamRoster(team, players) {
  const clubName = team.managing_club_name || "Club";
  const teamName = team.team_name || "Team";
  const category = team.category || "";

  const rows = [
    ["Club", clubName],
    ["Team", teamName],
    ["Category", category],
    [],
    ["Number", "Last name", "First name", "Role"]
  ];

  players.forEach(player => {
    const membership = player.teams.find(
      playerTeam => playerTeam.id === team.id
    );

    const role = membership?.captain
      ? "C"
      : membership?.vice_captain
        ? "VC"
        : "";

    rows.push([
      player.jersey_number || "",
      player.last_name || "",
      player.first_name || "",
      role
    ]);
  });

  const safeName = `${clubName}-${teamName}-${category}`
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  downloadCsv(`isdo27-roster-${safeName || "team"}.csv`, rows);
}

function downloadCsv(name, rows) {
  const csv = rows
    .map(row =>
      row
        .map(
          value =>
            `"${String(value ?? "").replaceAll('"', '""')}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();

  URL.revokeObjectURL(link.href);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


/* =========================================================
   BROADCAST · LIVE COURTS
   ========================================================= */

async function loadBroadcast() {
  if (!session || !data) return;

  const message = $("broadcastMessage");
  if (message) {
    message.classList.add("hidden");
    message.textContent = "";
  }

  try {
    const result = await api("/api/admin-live-courts");
    broadcastCourts = result.courts || [];
    renderBroadcast();
  } catch (error) {
    if (message) {
      message.textContent = error.message;
      message.classList.remove("hidden");
    }
  }
}

function renderBroadcast() {
  const grid = $("broadcastGrid");
  if (!grid || !data) return;

  grid.innerHTML = "";

  for (let courtNumber = 1; courtNumber <= 4; courtNumber++) {
    const court =
      broadcastCourts.find(item => Number(item.court_number) === courtNumber) || {
        court_number: courtNumber,
        team1_id: null,
        team2_id: null,
        enabled: false
      };

    const card = document.createElement("article");
    card.className = `broadcast-card ${court.enabled ? "is-live" : "is-off"}`;
    card.dataset.court = String(courtNumber);

    card.innerHTML = `
      <div class="broadcast-card-head">
        <div>
          <p class="broadcast-kicker">Court</p>
          <h3>${courtNumber}</h3>
        </div>

        <span class="broadcast-status ${court.enabled ? "live" : "off"}">
          ${court.enabled ? "LIVE" : "OFF"}
        </span>
      </div>

      <div class="broadcast-match-summary">
        <strong id="court${courtNumber}SummaryA">Team A</strong>
        <span>vs</span>
        <strong id="court${courtNumber}SummaryB">Team B</strong>
      </div>

      <div class="broadcast-team-block">
        <div class="broadcast-side-label">TEAM A</div>

        <div class="broadcast-select-row">
          <label>
            <span>Club</span>
            <select id="court${courtNumber}Club1"></select>
          </label>

          <label>
            <span>Team</span>
            <select id="court${courtNumber}Team1"></select>
          </label>
        </div>
      </div>

      <div class="broadcast-team-block">
        <div class="broadcast-side-label blue">TEAM B</div>

        <div class="broadcast-select-row">
          <label>
            <span>Club</span>
            <select id="court${courtNumber}Club2"></select>
          </label>

          <label>
            <span>Team</span>
            <select id="court${courtNumber}Team2"></select>
          </label>
        </div>
      </div>

      <div class="broadcast-actions">
        <button type="button" class="secondary" id="court${courtNumber}Save">
          Save setup
        </button>

        <button type="button" class="secondary" id="court${courtNumber}Preview">
          Preview
        </button>

        <button
          type="button"
          class="${court.enabled ? "broadcast-hide" : "broadcast-live"}"
          id="court${courtNumber}Toggle"
        >
          ${court.enabled ? "Hide overlay" : "Go LIVE"}
        </button>
      </div>

      <div class="broadcast-link-row">
        <div>
          <span>Fixed PRISM link</span>
          <code>${escapeHtml(buildCourtLink(courtNumber))}</code>
        </div>

        <button type="button" class="mini-copy secondary" id="court${courtNumber}Copy">
          Copy
        </button>
      </div>
    `;

    grid.appendChild(card);

    setupBroadcastCourt(card, court);
  }
}

function setupBroadcastCourt(card, court) {
  const n = Number(court.court_number);

  const club1 = $(`court${n}Club1`);
  const club2 = $(`court${n}Club2`);
  const team1 = $(`court${n}Team1`);
  const team2 = $(`court${n}Team2`);

  fillBroadcastClubs(club1);
  fillBroadcastClubs(club2);

  const currentTeam1 = data.teams.find(team => team.id === court.team1_id);
  const currentTeam2 = data.teams.find(team => team.id === court.team2_id);

  if (currentTeam1) {
    club1.value = currentTeam1.managing_club_id;
  }

  if (currentTeam2) {
    club2.value = currentTeam2.managing_club_id;
  }

  fillBroadcastTeams(team1, club1.value, currentTeam1?.id || "");
  fillBroadcastTeams(team2, club2.value, currentTeam2?.id || "");

  updateBroadcastSummary(n);

  club1.onchange = () => {
    fillBroadcastTeams(team1, club1.value, "");
    updateBroadcastSummary(n);
  };

  club2.onchange = () => {
    fillBroadcastTeams(team2, club2.value, "");
    updateBroadcastSummary(n);
  };

  team1.onchange = () => updateBroadcastSummary(n);
  team2.onchange = () => updateBroadcastSummary(n);

  $(`court${n}Save`).onclick = () => saveBroadcastCourt(n, court.enabled);
  $(`court${n}Preview`).onclick = () => previewBroadcastCourt(n);
  $(`court${n}Toggle`).onclick = () => toggleBroadcastCourt(n, !court.enabled);
  $(`court${n}Copy`).onclick = () => copyCourtLink(n);
}

function fillBroadcastClubs(select) {
  select.innerHTML = '<option value="">Select club…</option>';

  data.clubs
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(club => {
      select.add(new Option(club.name, club.id));
    });
}

function fillBroadcastTeams(select, clubId, selectedTeamId = "") {
  select.innerHTML = "";

  if (!clubId) {
    select.add(new Option("Select club first…", ""));
    select.disabled = true;
    return;
  }

  const teams = data.teams
    .filter(team => team.managing_club_id === clubId)
    .slice()
    .sort(teamSort);

  select.add(new Option("Select team…", ""));

  teams.forEach(team => {
    const label =
      team.team_name === team.managing_club_name
        ? team.category
        : `${team.category} — ${team.team_name}`;

    const option = new Option(label, team.id);
    option.selected = team.id === selectedTeamId;
    select.add(option);
  });

  select.disabled = false;
}

function selectedBroadcastTeams(courtNumber) {
  return {
    team1Id: $(`court${courtNumber}Team1`)?.value || "",
    team2Id: $(`court${courtNumber}Team2`)?.value || ""
  };
}

function updateBroadcastSummary(courtNumber) {
  const { team1Id, team2Id } = selectedBroadcastTeams(courtNumber);

  const team1 = data.teams.find(team => team.id === team1Id);
  const team2 = data.teams.find(team => team.id === team2Id);

  $(`court${courtNumber}SummaryA`).textContent =
    team1 ? `${team1.category} · ${team1.team_name}` : "Team A";

  $(`court${courtNumber}SummaryB`).textContent =
    team2 ? `${team2.category} · ${team2.team_name}` : "Team B";
}

function validateBroadcastSelection(courtNumber) {
  const { team1Id, team2Id } = selectedBroadcastTeams(courtNumber);

  if (!team1Id || !team2Id) {
    throw new Error(`Court ${courtNumber}: select both teams first.`);
  }

  if (team1Id === team2Id) {
    throw new Error(`Court ${courtNumber}: Team A and Team B must be different.`);
  }

  return { team1Id, team2Id };
}

async function saveBroadcastCourt(courtNumber, enabled) {
  const message = $("broadcastMessage");

  try {
    const { team1Id, team2Id } = validateBroadcastSelection(courtNumber);

    await api("/api/admin-live-courts", {
      method: "PATCH",
      body: JSON.stringify({
        court_number: courtNumber,
        team1_id: team1Id,
        team2_id: team2Id,
        enabled: !!enabled
      })
    });

    await loadBroadcast();

    if (message) {
      message.textContent = `Court ${courtNumber} setup saved.`;
      message.classList.remove("hidden");
      setTimeout(() => message.classList.add("hidden"), 1800);
    }
  } catch (error) {
    if (message) {
      message.textContent = error.message;
      message.classList.remove("hidden");
    }
  }
}

async function toggleBroadcastCourt(courtNumber, enabled) {
  const message = $("broadcastMessage");

  try {
    const { team1Id, team2Id } = validateBroadcastSelection(courtNumber);

    await api("/api/admin-live-courts", {
      method: "PATCH",
      body: JSON.stringify({
        court_number: courtNumber,
        team1_id: team1Id,
        team2_id: team2Id,
        enabled
      })
    });

    await loadBroadcast();

    if (message) {
      message.textContent =
        enabled
          ? `Court ${courtNumber} is LIVE.`
          : `Court ${courtNumber} overlay is hidden.`;

      message.classList.remove("hidden");
      setTimeout(() => message.classList.add("hidden"), 1800);
    }
  } catch (error) {
    if (message) {
      message.textContent = error.message;
      message.classList.remove("hidden");
    }
  }
}

function previewBroadcastCourt(courtNumber) {
  try {
    const { team1Id, team2Id } = validateBroadcastSelection(courtNumber);

    const url = new URL("/live-match.html", location.origin);
    url.searchParams.set("team1", team1Id);
    url.searchParams.set("team2", team2Id);
    url.searchParams.set("mode", "overlay");

    window.open(url.toString(), "_blank", "noopener");
  } catch (error) {
    const message = $("broadcastMessage");
    if (message) {
      message.textContent = error.message;
      message.classList.remove("hidden");
    }
  }
}

function buildCourtLink(courtNumber) {
  const url = new URL("/live-court.html", location.origin);
  url.searchParams.set("court", String(courtNumber));
  return url.toString();
}

async function copyCourtLink(courtNumber) {
  const url = buildCourtLink(courtNumber);

  try {
    await navigator.clipboard.writeText(url);

    const button = $(`court${courtNumber}Copy`);
    if (button) {
      const original = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => button.textContent = original, 1200);
    }
  } catch {
    prompt("Copy this PRISM URL:", url);
  }
}
