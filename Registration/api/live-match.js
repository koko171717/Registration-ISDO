const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_LOGO = "/assets/isdo27-logo.png";
const FIXED_MAX_ROWS = 14;

export default async function handler(req,res){
  if(req.method !== "GET"){
    return res.status(405).json({error:"Method not allowed"});
  }

  if(!SUPABASE_URL || !SERVICE_ROLE_KEY){
    return res.status(500).json({error:"Server configuration is incomplete."});
  }

  try{
    const listMode = String(req.query?.list || "").trim();

    if(listMode === "1"){
      const teams = await listTeams();
      return res.status(200).json({teams});
    }

    const team1Id = String(req.query?.team1_id || "").trim();
    const team2Id = String(req.query?.team2_id || "").trim();

    if(!team1Id || !team2Id){
      return res.status(400).json({error:"Missing team1_id or team2_id"});
    }

    const [team1Data, team2Data] = await Promise.all([
      getTeamRoster(team1Id),
      getTeamRoster(team2Id)
    ]);

    return res.status(200).json({
      team1: team1Data.team,
      team1_players: team1Data.players.slice(0, FIXED_MAX_ROWS),
      team2: team2Data.team,
      team2_players: team2Data.players.slice(0, FIXED_MAX_ROWS),
      max_rows: FIXED_MAX_ROWS
    });

  }catch(error){
    console.error(error);
    return res.status(500).json({
      error:error.message || "Match rosters could not be loaded."
    });
  }
}

async function listTeams(){
  const teams = await select(
    "teams",
    "select=id,display_name,category_id,managing_club_id,active&active=eq.true&order=managing_club_id.asc"
  );

  const clubIds = unique(teams.map(t => t.managing_club_id).filter(Boolean));
  const categoryIds = unique(teams.map(t => t.category_id).filter(Boolean));

  const [clubs, categories] = await Promise.all([
    clubIds.length ? select("clubs", `select=id,name&id=in.(${encodeURIComponent(joinQuoted(clubIds))})`) : [],
    categoryIds.length ? select("categories", `select=id,name&id=in.(${encodeURIComponent(joinQuoted(categoryIds))})`) : []
  ]);

  const clubMap = new Map(clubs.map(x => [x.id, x]));
  const categoryMap = new Map(categories.map(x => [x.id, x]));

  return teams.map(team => {
    const club = clubMap.get(team.managing_club_id);
    const category = categoryMap.get(team.category_id);

    return {
      id: team.id,
      team_name: team.display_name || club?.name || "Team",
      club_name: club?.name || "Club",
      category: category?.name || ""
    };
  }).sort((a,b) => {
    const byClub = a.club_name.localeCompare(b.club_name);
    if(byClub !== 0) return byClub;
    const byCategory = a.category.localeCompare(b.category);
    if(byCategory !== 0) return byCategory;
    return a.team_name.localeCompare(b.team_name);
  });
}

async function getTeamRoster(teamId){
  const [teamRows, memberships] = await Promise.all([
    select("teams", `select=id,category_id,managing_club_id,display_name,logo_url,active&active=eq.true&id=eq.${encodeURIComponent(teamId)}`),
    select("player_team_memberships", `select=player_id,captain,vice_captain&team_id=eq.${encodeURIComponent(teamId)}`)
  ]);

  const team = teamRows[0];

  if(!team){
    throw new Error("One selected team could not be found.");
  }

  const [clubRows, categoryRows] = await Promise.all([
    select("clubs", `select=id,name,logo_url&id=eq.${encodeURIComponent(team.managing_club_id)}`),
    select("categories", `select=id,name&id=eq.${encodeURIComponent(team.category_id)}`)
  ]);

  const club = clubRows[0];
  const category = categoryRows[0];

  const playerIds = memberships.map(x => x.player_id);
  let players = [];

  if(playerIds.length){
    players = await select(
      "players",
      `select=id,first_name,last_name,jersey_number&id=in.(${encodeURIComponent(joinQuoted(playerIds))})`
    );
  }

  const membershipByPlayer = new Map(memberships.map(m => [m.player_id, m]));

  const roster = players.map(player => {
    const membership = membershipByPlayer.get(player.id);

    return {
      id: player.id,
      first_name: player.first_name,
      last_name: player.last_name,
      jersey_number: player.jersey_number,
      role: membership?.captain ? "C" : membership?.vice_captain ? "VC" : ""
    };
  }).sort((a,b) => {
    const an = jerseyNumber(a.jersey_number);
    const bn = jerseyNumber(b.jersey_number);
    if(an !== bn) return an - bn;
    return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
  });

  return {
    team: {
      id: team.id,
      team_name: team.display_name || club?.name || "Team",
      club_name: club?.name || "Club",
      category: category?.name || "",
      logo_url: team.logo_url || club?.logo_url || DEFAULT_LOGO
    },
    players: roster
  };
}

function jerseyNumber(value){
  if(value === null || value === undefined || value === ""){
    return Number.MAX_SAFE_INTEGER;
  }
  const n = parseInt(String(value).replace(/\D/g,""),10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

function joinQuoted(ids){
  return ids.map(id => `"${String(id).replaceAll('"','')}"`).join(",");
}

function unique(values){
  return [...new Set(values)];
}

function headers(){
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`
  };
}

async function select(table, query){
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: headers()
  });

  if(!response.ok){
    let details = "";
    try{
      details = JSON.stringify(await response.json());
    }catch{
      details = await response.text();
    }
    throw new Error(`Supabase returned ${response.status}: ${details}`);
  }

  return response.json();
}
