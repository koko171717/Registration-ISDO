const SUPABASE_URL=process.env.SUPABASE_URL;
const SECRET=process.env.SUPABASE_SERVICE_ROLE_KEY;

function H(){return{apikey:SECRET,Authorization:`Bearer ${SECRET}`}}
async function authUser(req){
  const t=(req.headers.authorization||"").replace("Bearer ","");
  if(!t)throw E(401,"Not signed in.");
  const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SECRET,Authorization:`Bearer ${t}`}});
  if(!r.ok)throw E(401,"Session expired.");
  return r.json();
}
async function q(table,query){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`,{headers:H()});
  if(!r.ok)throw await RE(r);
  return r.json();
}
async function ins(table,body){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{
    method:"POST",headers:{...H(),"Content-Type":"application/json"},body:JSON.stringify(body)
  });
  if(!r.ok)throw await RE(r);
}
async function del(table,query){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`,{method:"DELETE",headers:H()});
  if(!r.ok)throw await RE(r);
}
async function assertAdmin(uid){
  const roles=await q("user_roles",`select=role&user_id=eq.${uid}`);
  if(!roles.some(x=>x.role==="admin"))throw E(403,"Admin access required.");
}
async function RE(r){let d={};try{d=await r.json()}catch{}return E(r.status,d.message||"Database error")}
function E(s,m){const e=new Error(m);e.statusCode=s;return e}

export default async function handler(req,res){
  if(!["POST","DELETE"].includes(req.method))return res.status(405).json({error:"Method not allowed"});
  try{
    const u=await authUser(req);await assertAdmin(u.id);
    const b=req.body||{},playerId=b.player_id;
    if(!playerId)throw E(400,"Player ID required.");

    if(req.method==="DELETE"){
      if(!b.membership_id)throw E(400,"Membership ID required.");
      await del("player_team_memberships",`id=eq.${b.membership_id}&player_id=eq.${playerId}`);
      return res.json({ok:true});
    }

    if(!b.team_id)throw E(400,"Team ID required.");

    const player=(await q("players",`select=id,origin_club_id&id=eq.${playerId}`))[0];
    if(!player)throw E(404,"Player not found.");

    const team=(await q("teams",`select=id,category_id,active&id=eq.${b.team_id}`))[0];
    if(!team||!team.active)throw E(400,"Invalid team.");

    const access=await q("team_origin_club_access",
      `select=id&team_id=eq.${b.team_id}&origin_club_id=eq.${player.origin_club_id}`);
    if(!access.length)throw E(400,"This team is not available for the player's origin club.");

    const current=await q("player_team_memberships",
      `select=id,team_id,membership_order&player_id=eq.${playerId}`);

    if(current.length>=2)throw E(400,"This player already has two team memberships.");
    if(current.some(x=>x.team_id===b.team_id))throw E(400,"This player is already in that team.");

    if(current.length){
      const currentTeams=await q("teams",
        `select=id,category_id&id=in.(${current.map(x=>x.team_id).join(",")})`);
      if(currentTeams.some(x=>x.category_id===team.category_id))
        throw E(400,"This player is already registered in this category.");
    }

    const used=new Set(current.map(x=>Number(x.membership_order)));
    const order=used.has(1)?2:1;

    await ins("player_team_memberships",{
      player_id:playerId,
      team_id:b.team_id,
      membership_order:order,
      captain:false,
      vice_captain:false
    });

    res.json({ok:true});
  }catch(e){
    res.status(e.statusCode||500).json({error:e.message});
  }
}
