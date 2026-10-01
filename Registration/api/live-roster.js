const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req,res){
  if(req.method !== "GET"){
    return res.status(405).json({error:"Method not allowed"});
  }

  const teamId = String(req.query?.team_id || "").trim();

  if(!teamId){
    return res.status(400).json({error:"Missing team_id"});
  }

  if(!SUPABASE_URL || !SERVICE_ROLE_KEY){
    return res.status(500).json({error:"Server configuration is incomplete."});
  }

  try{
    const [teamRows,memberships] = await Promise.all([
      select(
        "teams",
        `select=id,category_id,managing_club_id,display_name&active=eq.true&id=eq.${encodeURIComponent(teamId)}`
      ),
      select(
        "player_team_memberships",
        `select=player_id,captain,vice_captain&team_id=eq.${encodeURIComponent(teamId)}`
      )
    ]);

    const team = teamRows[0];

    if(!team){
      return res.status(404).json({error:"Team not found."});
    }

    const [clubRows,categoryRows] = await Promise.all([
      select(
        "clubs",
        `select=id,name&id=eq.${encodeURIComponent(team.managing_club_id)}`
      ),
      select(
        "categories",
        `select=id,name&id=eq.${encodeURIComponent(team.category_id)}`
      )
    ]);

    const club = clubRows[0];
    const category = categoryRows[0];

    const playerIds = memberships.map(x=>x.player_id);

    let players = [];

    if(playerIds.length){
      const idFilter = playerIds
        .map(id=>`"${String(id).replaceAll('"','')}"`)
        .join(",");

      players = await select(
        "players",
        `select=id,first_name,last_name,jersey_number&id=in.(${encodeURIComponent(idFilter)})`
      );
    }

    const membershipByPlayer = new Map(
      memberships.map(m=>[m.player_id,m])
    );

    const roster = players
      .map(player=>{
        const membership = membershipByPlayer.get(player.id);

        return {
          id:player.id,
          first_name:player.first_name,
          last_name:player.last_name,
          jersey_number:player.jersey_number,
          role:membership?.captain
            ? "C"
            : membership?.vice_captain
              ? "VC"
              : ""
        };
      })
      .sort((a,b)=>{
        const an=jerseyNumber(a.jersey_number);
        const bn=jerseyNumber(b.jersey_number);

        if(an!==bn)return an-bn;

        return `${a.last_name} ${a.first_name}`
          .localeCompare(`${b.last_name} ${b.first_name}`);
      });

    return res.status(200).json({
      team:{
        id:team.id,
        team_name:team.display_name || club?.name || "Team",
        club_name:club?.name || "Club",
        category:category?.name || ""
      },
      players:roster
    });

  }catch(error){
    console.error(error);
    return res.status(500).json({
      error:error.message || "Live roster could not be loaded."
    });
  }
}

function jerseyNumber(value){
  if(value===null || value===undefined || value===""){
    return Number.MAX_SAFE_INTEGER;
  }

  const n=parseInt(String(value).replace(/\D/g,""),10);

  return Number.isNaN(n)
    ? Number.MAX_SAFE_INTEGER
    : n;
}

function headers(){
  return{
    apikey:SERVICE_ROLE_KEY,
    Authorization:`Bearer ${SERVICE_ROLE_KEY}`
  };
}

async function select(table,query){
  const response=await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${query}`,
    {headers:headers()}
  );

  if(!response.ok){
    let details="";

    try{
      details=JSON.stringify(await response.json());
    }catch{
      details=await response.text();
    }

    throw new Error(
      `Supabase returned ${response.status}: ${details}`
    );
  }

  return response.json();
}
