const SUPABASE_URL=process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 if(!SUPABASE_URL||!SERVICE_ROLE_KEY)return res.status(500).json({error:"Server configuration is incomplete."});
 const p=req.body||{},player=p.player||{},memberships=Array.isArray(p.memberships)?p.memberships:[],meals=Array.isArray(p.meals)?p.meals:[],legal=Array.isArray(p.legal_acceptances)?p.legal_acceptances:[];
 try{
  for(const f of["first_name","last_name","birth_date","nationality","email","origin_club_id"])if(!player[f])throw bad("Missing field: "+f);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(player.email))throw bad("Invalid email address.");
  if(memberships.length<1||memberships.length>2)throw bad("One or two team memberships are required.");

  const teams=await select("teams",`select=id,category_id,active&id=in.(${memberships.map(x=>encodeURIComponent(x.team_id)).join(",")})`);
  if(teams.length!==memberships.length)throw bad("Invalid team selection.");
  if(new Set(teams.map(t=>t.category_id)).size!==teams.length)throw bad("The two categories must be different.");

  for(const m of memberships){
   const a=await select("team_origin_club_access",`select=id&team_id=eq.${encodeURIComponent(m.team_id)}&origin_club_id=eq.${encodeURIComponent(player.origin_club_id)}`);
   if(!a.length)throw bad("A selected team is not available for this club of origin.");
  }

  const docs=await select("legal_documents","select=id&active=eq.true");
  if(!docs.length)throw bad("Legal documents are not configured.");
  const accepted=new Set(legal.filter(x=>x.accepted).map(x=>x.legal_document_id));
  if(docs.some(d=>!accepted.has(d.id)))throw bad("All legal documents must be accepted.");

  const created=await insert("players",{...player,registration_status:"complete",updated_at:new Date().toISOString()},true);
  const playerId=created.id;
  try{
   await insert("player_team_memberships",memberships.map(m=>({player_id:playerId,team_id:m.team_id,membership_order:m.membership_order,captain:false,vice_captain:false})));
   if(meals.length)await insert("player_meals",meals.map(x=>({player_id:playerId,meal_day_id:x.meal_day_id,sandwich_option_id:x.ordered?x.sandwich_option_id:null,ordered:!!x.ordered})));
   await insert("player_legal_acceptances",legal.map(x=>({player_id:playerId,legal_document_id:x.legal_document_id,accepted:true,accepted_at:new Date().toISOString()})));
  }catch(err){await del("players",`id=eq.${encodeURIComponent(playerId)}`);throw err}
  return res.status(200).json({ok:true,player_id:playerId});
 }catch(err){return res.status(err.statusCode||400).json({error:err.message||"Registration could not be saved."})}
}
function headers(){return{apikey:SERVICE_ROLE_KEY,Authorization:`Bearer ${SERVICE_ROLE_KEY}`}}
async function select(table,q){const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`,{headers:headers()});if(!r.ok)throw await er(r);return r.json()}
async function insert(table,body,single=false){const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:"POST",headers:{...headers(),"Content-Type":"application/json",Prefer:single?"return=representation":"return=minimal"},body:JSON.stringify(body)});if(!r.ok)throw await er(r);if(single)return (await r.json())[0]}
async function del(table,q){await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`,{method:"DELETE",headers:headers()})}
async function er(r){let d={};try{d=await r.json()}catch{}const x=new Error(d.message||d.error||"Database request failed.");x.statusCode=r.status>=500?500:400;return x}
function bad(m){const e=new Error(m);e.statusCode=400;return e}
