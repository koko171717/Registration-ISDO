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
  return errorWithStatus(
    response.status,
    body.message || body.error || "Database error"
  );
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

async function insert(table, body) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}`,
    {
      method: "POST",
      headers: {
        ...serviceHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    throw await responseError(response);
  }
}

async function remove(table, queryString) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${queryString}`,
    {
      method: "DELETE",
      headers: serviceHeaders()
    }
  );

  if (!response.ok) {
    throw await responseError(response);
  }
}

async function update(table, queryString, body) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${queryString}`,
    {
      method: "PATCH",
      headers: {
        ...serviceHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    throw await responseError(response);
  }
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
  if (!["POST", "PATCH", "DELETE"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const user = await getAuthenticatedUser(req);
    await assertAdmin(user.id);

    const body = req.body || {};
    const playerId = body.player_id;

    if (!playerId) {
      throw errorWithStatus(400, "Player ID required.");
    }

    if (req.method === "DELETE") {
      if (!body.membership_id) {
        throw errorWithStatus(400, "Membership ID required.");
      }

      await remove(
        "player_team_memberships",
        `id=eq.${body.membership_id}&player_id=eq.${playerId}`
      );

      return res.json({ ok: true });
    }

    if (req.method === "PATCH") {
      if (!body.membership_id) {
        throw errorWithStatus(400, "Membership ID required.");
      }

      if (!["player", "captain", "vice_captain"].includes(body.role)) {
        throw errorWithStatus(400, "Invalid team role.");
      }

      const membership = (
        await query(
          "player_team_memberships",
          `select=id,player_id,team_id&id=eq.${body.membership_id}&player_id=eq.${playerId}`
        )
      )[0];

      if (!membership) {
        throw errorWithStatus(404, "Team membership not found.");
      }

      // One captain and one vice-captain maximum per team.
      // Selecting a role automatically clears the same role from the other members.
      if (body.role === "captain") {
        await update(
          "player_team_memberships",
          `team_id=eq.${membership.team_id}&captain=eq.true`,
          { captain: false }
        );
      }

      if (body.role === "vice_captain") {
        await update(
          "player_team_memberships",
          `team_id=eq.${membership.team_id}&vice_captain=eq.true`,
          { vice_captain: false }
        );
      }

      await update(
        "player_team_memberships",
        `id=eq.${membership.id}&player_id=eq.${playerId}`,
        {
          captain: body.role === "captain",
          vice_captain: body.role === "vice_captain"
        }
      );

      return res.json({ ok: true });
    }

    if (!body.team_id) {
      throw errorWithStatus(400, "Team ID required.");
    }

    const player = (
      await query(
        "players",
        `select=id,origin_club_id&id=eq.${playerId}`
      )
    )[0];

    if (!player) {
      throw errorWithStatus(404, "Player not found.");
    }

    const team = (
      await query(
        "teams",
        `select=id,category_id,active&id=eq.${body.team_id}`
      )
    )[0];

    if (!team || !team.active) {
      throw errorWithStatus(400, "Invalid team.");
    }

    const access = await query(
      "team_origin_club_access",
      `select=team_id&team_id=eq.${body.team_id}&origin_club_id=eq.${player.origin_club_id}`
    );

    if (!access.length) {
      throw errorWithStatus(
        400,
        "This team is not available for the player's origin club."
      );
    }

    const currentMemberships = await query(
      "player_team_memberships",
      `select=id,team_id,membership_order&player_id=eq.${playerId}`
    );

    if (currentMemberships.length >= 2) {
      throw errorWithStatus(
        400,
        "This player already has two team memberships."
      );
    }

    if (
      currentMemberships.some(
        membership => membership.team_id === body.team_id
      )
    ) {
      throw errorWithStatus(
        400,
        "This player is already in that team."
      );
    }

    if (currentMemberships.length) {
      const currentTeamIds = currentMemberships
        .map(membership => membership.team_id)
        .join(",");

      const currentTeams = await query(
        "teams",
        `select=id,category_id&id=in.(${currentTeamIds})`
      );

      if (
        currentTeams.some(
          currentTeam =>
            currentTeam.category_id === team.category_id
        )
      ) {
        throw errorWithStatus(
          400,
          "This player is already registered in this category."
        );
      }
    }

    const usedOrders = new Set(
      currentMemberships.map(
        membership => Number(membership.membership_order)
      )
    );

    const membershipOrder = usedOrders.has(1) ? 2 : 1;

    await insert("player_team_memberships", {
      player_id: playerId,
      team_id: body.team_id,
      membership_order: membershipOrder,
      captain: false,
      vice_captain: false
    });

    return res.json({ ok: true });
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message });
  }
}
