const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_LOGO = "/assets/isdo27-logo.png";

function headers(){
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`
  };
}

async function select(table, query){
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${query}`,
    { headers: headers() }
  );

  if(!response.ok){
    let details = "";
    try{
      details = JSON.stringify(await response.json());
    }catch{
      details = await response.text();
    }

    throw new Error(
      `Supabase returned ${response.status}: ${details}`
    );
  }

  return response.json();
}

function unique(values){
  return [...new Set(values)];
}

function joinQuoted(ids){
  return ids
    .map(id => `"${String(id).replaceAll('"','')}"`)
    .join(",");
}

function jerseyNumber(value){
  if(value === null || value === undefined || value === ""){
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

async function getTeamRoster(teamId){
  const [teamRows, memberships] = await Promise.all([
    select(
      "teams",
      `select=id,category_id,managing_club_id,display_name,logo_url,active&active=eq.true&id=eq.${encodeURIComponent(teamId)}`
    ),
    select(
      "player_team_memberships",
      `select=player_id,captain,vice_captain&team_id=eq.${encodeURIComponent(teamId)}`
    )
  ]);

  const team = teamRows[0];

  if(!team){
    throw new Error("One selected team could not be found.");
  }

  const [clubRows, categoryRows] = await Promise.all([
    select(
      "clubs",
      `select=id,name,logo_url&id=eq.${encodeURIComponent(team.managing_club_id)}`
    ),
    select(
      "categories",
      `select=id,name&id=eq.${encodeURIComponent(team.category_id)}`
    )
  ]);

  const club = clubRows[0];
  const category = categoryRows[0];

  const playerIds = unique(
    memberships
      .map(item => item.player_id)
      .filter(Boolean)
  );

  let players = [];

  if(playerIds.length){
    players = await select(
      "players",
      `select=id,first_name,last_name,jersey_number&id=in.(${encodeURIComponent(joinQuoted(playerIds))})`
    );
  }

  const membershipByPlayer = new Map(
    memberships.map(item => [item.player_id, item])
  );

  const roster = players
    .map(player => {
      const membership = membershipByPlayer.get(player.id);

      return {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        jersey_number: player.jersey_number,
        role:
          membership?.captain
            ? "C"
            : membership?.vice_captain
              ? "VC"
              : ""
      };
    })
    .sort((a,b) => {
      const jerseyA = jerseyNumber(a.jersey_number);
      const jerseyB = jerseyNumber(b.jersey_number);

      if(jerseyA !== jerseyB){
        return jerseyA - jerseyB;
      }

      return `${a.last_name} ${a.first_name}`.localeCompare(
        `${b.last_name} ${b.first_name}`
      );
    });

  return {
    team: {
      id: team.id,
      team_name: team.display_name || club?.name || "Team",
      club_name: club?.name || "Club",
      category: category?.name || "",
      logo_url:
        team.logo_url ||
        club?.logo_url ||
        DEFAULT_LOGO
    },
    players: roster
  };
}

export default async function handler(req, res){
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if(req.method !== "GET"){
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  if(!SUPABASE_URL || !SERVICE_ROLE_KEY){
    return res.status(500).json({
      error: "Server configuration is incomplete."
    });
  }

  try{
    const courtNumber = Number(req.query?.court);

    if(![1,2,3,4].includes(courtNumber)){
      return res.status(400).json({
        error: "Court number must be 1, 2, 3 or 4."
      });
    }

    const rows = await select(
      "live_courts",
      `select=court_number,team1_id,team2_id,enabled,updated_at&court_number=eq.${courtNumber}`
    );

    const court = rows[0];

    if(
      !court ||
      !court.enabled ||
      !court.team1_id ||
      !court.team2_id
    ){
      return res.status(200).json({
        court_number: courtNumber,
        enabled: false,
        updated_at: court?.updated_at || null
      });
    }

    const [team1Data, team2Data] = await Promise.all([
      getTeamRoster(court.team1_id),
      getTeamRoster(court.team2_id)
    ]);

    return res.status(200).json({
      court_number: courtNumber,
      enabled: true,
      updated_at: court.updated_at,
      team1: team1Data.team,
      team1_players: team1Data.players,
      team2: team2Data.team,
      team2_players: team2Data.players
    });

  }catch(error){
    console.error(error);
    return res.status(500).json({
      error: error.message || "Live court could not be loaded."
    });
  }
}
