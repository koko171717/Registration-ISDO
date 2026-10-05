const SUPABASE_URL = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;

function serviceHeaders(){
  return {
    apikey: SECRET,
    Authorization: `Bearer ${SECRET}`
  };
}

function errorWithStatus(status, message){
  const error = new Error(message);
  error.statusCode = status;
  return error;
}

async function responseError(response){
  let details = {};
  try{
    details = await response.json();
  }catch{}

  return errorWithStatus(
    response.status,
    details.message || details.error || "Database error"
  );
}

async function authUser(req){
  const token = String(req.headers.authorization || "").replace("Bearer ", "");

  if(!token){
    throw errorWithStatus(401, "Not signed in.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        apikey: SECRET,
        Authorization: `Bearer ${token}`
      }
    }
  );

  if(!response.ok){
    throw errorWithStatus(401, "Session expired.");
  }

  return response.json();
}

async function select(table, query){
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${query}`,
    { headers: serviceHeaders() }
  );

  if(!response.ok){
    throw await responseError(response);
  }

  return response.json();
}

async function upsertCourt(body){
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/live_courts?on_conflict=court_number`,
    {
      method: "POST",
      headers: {
        ...serviceHeaders(),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(body)
    }
  );

  if(!response.ok){
    throw await responseError(response);
  }

  return response.json();
}

async function assertAdmin(userId){
  const roles = await select(
    "user_roles",
    `select=role&user_id=eq.${encodeURIComponent(userId)}`
  );

  if(!roles.some(item => item.role === "admin")){
    throw errorWithStatus(403, "Admin access required.");
  }
}

async function ensureCourtRows(){
  const rows = await select(
    "live_courts",
    "select=court_number,team1_id,team2_id,enabled,updated_at&order=court_number.asc"
  );

  const existing = new Set(rows.map(row => Number(row.court_number)));

  for(let courtNumber = 1; courtNumber <= 4; courtNumber++){
    if(!existing.has(courtNumber)){
      await upsertCourt({
        court_number: courtNumber,
        team1_id: null,
        team2_id: null,
        enabled: false,
        updated_at: new Date().toISOString()
      });
    }
  }

  return select(
    "live_courts",
    "select=court_number,team1_id,team2_id,enabled,updated_at&order=court_number.asc"
  );
}

async function assertTeam(teamId){
  if(!teamId) return;

  const rows = await select(
    "teams",
    `select=id&id=eq.${encodeURIComponent(teamId)}&active=eq.true`
  );

  if(!rows.length){
    throw errorWithStatus(400, "One selected team does not exist or is inactive.");
  }
}

export default async function handler(req, res){
  if(!SUPABASE_URL || !SECRET){
    return res.status(500).json({
      error: "Server configuration is incomplete."
    });
  }

  if(!["GET", "PATCH"].includes(req.method)){
    return res.status(405).json({ error: "Method not allowed" });
  }

  try{
    const user = await authUser(req);
    await assertAdmin(user.id);

    if(req.method === "GET"){
      const courts = await ensureCourtRows();
      return res.status(200).json({ courts });
    }

    const body = req.body || {};
    const courtNumber = Number(body.court_number);

    if(![1,2,3,4].includes(courtNumber)){
      throw errorWithStatus(400, "Court number must be 1, 2, 3 or 4.");
    }

    const team1Id = body.team1_id || null;
    const team2Id = body.team2_id || null;
    const enabled = !!body.enabled;

    if(enabled && (!team1Id || !team2Id)){
      throw errorWithStatus(400, "Both teams are required before going LIVE.");
    }

    if(team1Id && team2Id && team1Id === team2Id){
      throw errorWithStatus(400, "Team A and Team B must be different.");
    }

    await Promise.all([
      assertTeam(team1Id),
      assertTeam(team2Id)
    ]);

    const rows = await upsertCourt({
      court_number: courtNumber,
      team1_id: team1Id,
      team2_id: team2Id,
      enabled,
      updated_at: new Date().toISOString()
    });

    return res.status(200).json({
      ok: true,
      court: rows[0] || null
    });

  }catch(error){
    console.error(error);
    return res.status(error.statusCode || 500).json({
      error: error.message || "Live court update failed."
    });
  }
}
