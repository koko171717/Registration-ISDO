const SUPABASE_URL = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;

function serviceHeaders() {
  return {
    apikey: SECRET,
    Authorization: `Bearer ${SECRET}`
  };
}

function errorWithStatus(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function responseError(response) {
  let body = {};
  try {
    body = await response.json();
  } catch (_) {}
  return errorWithStatus(response.status, body.message || body.error || "Database error");
}

async function getAuthenticatedUser(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");

  if (!token) {
    throw errorWithStatus(401, "Not signed in.");
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SECRET,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw errorWithStatus(401, "Session expired.");
  }

  return response.json();
}

async function query(table, queryString) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${queryString}`,
    { headers: serviceHeaders() }
  );

  if (!response.ok) {
    throw await responseError(response);
  }

  return response.json();
}

async function assertAdmin(userId) {
  const roles = await query(
    "user_roles",
    `select=role&user_id=eq.${userId}`
  );

  if (!roles.some(row => row.role === "admin")) {
    throw errorWithStatus(403, "Admin access required.");
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const user = await getAuthenticatedUser(req);
    await assertAdmin(user.id);

    const [
      clubs,
      categories,
      teamsRaw,
      playersRaw,
      memberships,
      mealDays,
      sandwichOptions,
      mealsRaw,
      teamAccess
    ] = await Promise.all([
      query("clubs", "select=id,name,country&active=eq.true"),
      query("categories", "select=id,name"),
      query(
        "teams",
        "select=id,managing_club_id,category_id,display_name,active&active=eq.true"
      ),
      query(
        "players",
        "select=id,first_name,last_name,jersey_number,origin_club_id,registration_status"
      ),
      query(
        "player_team_memberships",
        "select=id,player_id,team_id,membership_order,captain,vice_captain"
      ),
      query(
        "meal_days",
        "select=id,name,event_date,price_chf,active&active=eq.true&order=event_date.asc"
      ),
      query(
        "sandwich_options",
        "select=id,name,sort_order,active&active=eq.true&order=sort_order.asc"
      ),
      query(
        "player_meals",
        "select=player_id,meal_day_id,sandwich_option_id,ordered"
      ),
      query(
        "team_origin_club_access",
        "select=team_id,origin_club_id"
      )
    ]);

    const clubMap = new Map(clubs.map(club => [club.id, club]));
    const categoryMap = new Map(categories.map(category => [category.id, category]));
    const sandwichMap = new Map(
      sandwichOptions.map(option => [option.id, option.name])
    );

    const teams = teamsRaw.map(team => {
      const teamMemberships = memberships.filter(
        membership => membership.team_id === team.id
      );

      return {
        id: team.id,
        category_id: team.category_id,
        category: categoryMap.get(team.category_id)?.name || "",
        managing_club_id: team.managing_club_id,
        managing_club_name:
          clubMap.get(team.managing_club_id)?.name || "",
        team_name:
          team.display_name ||
          clubMap.get(team.managing_club_id)?.name ||
          "Team",
        player_count: teamMemberships.length,
        has_captain: teamMemberships.some(membership => membership.captain)
      };
    });

    const teamMap = new Map(teams.map(team => [team.id, team]));
    const activeMealDayIds = new Set(mealDays.map(day => day.id));
    const completedMealDaysByPlayer = new Map();

    mealsRaw.forEach(meal => {
      if (!activeMealDayIds.has(meal.meal_day_id)) {
        return;
      }

      if (!completedMealDaysByPlayer.has(meal.player_id)) {
        completedMealDaysByPlayer.set(meal.player_id, new Set());
      }

      completedMealDaysByPlayer
        .get(meal.player_id)
        .add(meal.meal_day_id);
    });

    const players = playersRaw.map(player => {
      const playerMemberships = memberships
        .filter(membership => membership.player_id === player.id)
        .sort(
          (a, b) =>
            Number(a.membership_order || 99) -
            Number(b.membership_order || 99)
        );

      const playerTeams = playerMemberships
        .map(membership => {
          const team = teamMap.get(membership.team_id);

          if (!team) {
            return null;
          }

          return {
            id: team.id,
            membership_id: membership.id,
            membership_order: membership.membership_order,
            category_id: team.category_id,
            category: team.category,
            team_name: team.team_name,
            captain: membership.captain,
            vice_captain: membership.vice_captain
          };
        })
        .filter(Boolean);

      return {
        ...player,
        origin_club_name:
          clubMap.get(player.origin_club_id)?.name || "",
        registration_complete:
          player.registration_status === "complete",
        meals_complete:
          (completedMealDaysByPlayer.get(player.id)?.size || 0) ===
          mealDays.length,
        team_ids: playerTeams.map(team => team.id),
        category_ids: [
          ...new Set(playerTeams.map(team => team.category_id))
        ],
        teams: playerTeams
      };
    });

    const meals = [];

    playersRaw.forEach(player => {
      mealDays.forEach(day => {
        const meal = mealsRaw.find(
          row =>
            row.player_id === player.id &&
            row.meal_day_id === day.id
        );

        meals.push({
          player_id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          origin_club_id: player.origin_club_id,
          origin_club_name:
            clubMap.get(player.origin_club_id)?.name || "",
          meal_day_id: day.id,
          day_name: day.name,
          ordered: Boolean(meal?.ordered),
          sandwich_name: meal?.ordered
            ? sandwichMap.get(meal.sandwich_option_id) || ""
            : "No meal",
          price_chf: day.price_chf
        });
      });
    });

    return res.json({
      admin_email: user.email,
      clubs,
      categories,
      teams,
      players,
      meal_days: mealDays,
      sandwich_options: sandwichOptions,
      meals,
      team_access: teamAccess
    });
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message });
  }
}
