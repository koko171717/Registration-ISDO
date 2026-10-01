import crypto from "crypto";

const SUPABASE_URL=process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req,res){
 if(!SUPABASE_URL||!SERVICE_ROLE_KEY){
  return res.status(500).json({error:"Server configuration is incomplete."});
 }

 const token=String(
  req.method==="GET" ? (req.query?.token||"") : (req.body?.token||"")
 ).trim();

 if(!token)return res.status(400).json({error:"Missing edit token."});

 try{
  const tokenRow=await tokenRecord(token);
  if(!tokenRow)throw notFound();

  if(req.method==="GET"){
   const payload=await loadRegistration(tokenRow.player_id);
   await touchToken(tokenRow.id);
   return res.status(200).json(payload);
  }

  if(req.method==="PATCH"){
   const p=req.body||{};
   await validateAndUpdate(tokenRow.player_id,p);
   await touchToken(tokenRow.id);
   return res.status(200).json({ok:true});
  }

  return res.status(405).json({error:"Method not allowed"});

 }catch(err){
  return res.status(err.statusCode||400).json({
   error:err.message||"The registration could not be updated."
  });
 }
}

async function tokenRecord(rawToken){
 const hash=hashToken(rawToken);
 const rows=await select(
  "player_edit_tokens",
  `select=id,player_id,revoked_at&token_hash=eq.${encodeURIComponent(hash)}&revoked_at=is.null&limit=1`
 );
 return rows[0]||null;
}

async function loadRegistration(playerId){
 const players=await select(
  "players",
  `select=id,first_name,last_name,birth_date,nationality,email,jersey_number,origin_club_id,registration_status&id=eq.${encodeURIComponent(playerId)}&limit=1`
 );

 const player=players[0];
 if(!player)throw notFound();

 const [memberships,meals]=await Promise.all([
  select(
   "player_team_memberships",
   `select=id,team_id,membership_order,captain,vice_captain&player_id=eq.${encodeURIComponent(playerId)}&order=membership_order.asc`
  ),
  select(
   "player_meals",
   `select=meal_day_id,sandwich_option_id,ordered&player_id=eq.${encodeURIComponent(playerId)}`
  )
 ]);

 return{player,memberships,meals};
}

async function validateAndUpdate(playerId,p){
 const player=p.player||{};
 const memberships=Array.isArray(p.memberships)?p.memberships:[];
 const meals=Array.isArray(p.meals)?p.meals:[];

 for(const f of["first_name","last_name","birth_date","nationality","email","origin_club_id"]){
  if(!player[f])throw bad("Missing field: "+f);
 }

 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(player.email)){
  throw bad("Invalid email address.");
 }

 if(memberships.length<1||memberships.length>2){
  throw bad("One or two team memberships are required.");
 }

 const teamIds=memberships.map(x=>x.team_id);
 if(teamIds.some(x=>!x))throw bad("Invalid team selection.");

 const teams=await select(
  "teams",
  `select=id,category_id,active&id=in.(${teamIds.map(encodeURIComponent).join(",")})`
 );

 if(teams.length!==memberships.length)throw bad("Invalid team selection.");
 if(teams.some(t=>!t.active))throw bad("One selected team is no longer active.");
 if(new Set(teams.map(t=>t.category_id)).size!==teams.length){
  throw bad("The two categories must be different.");
 }

 for(const m of memberships){
  const access=await select(
   "team_origin_club_access",
   `select=team_id&team_id=eq.${encodeURIComponent(m.team_id)}&origin_club_id=eq.${encodeURIComponent(player.origin_club_id)}`
  );
  if(!access.length){
   throw bad("A selected team is not available for this club of origin.");
  }
 }

 const mealDays=await select("meal_days","select=id,active&active=eq.true");
 const sandwichOptions=await select("sandwich_options","select=id,active&active=eq.true");

 const validDayIds=new Set(mealDays.map(x=>x.id));
 const validSandwichIds=new Set(sandwichOptions.map(x=>x.id));

 if(meals.length!==mealDays.length){
  throw bad("Please choose a meal option for every active day.");
 }

 for(const meal of meals){
  if(!validDayIds.has(meal.meal_day_id))throw bad("Invalid meal day.");
  if(meal.ordered&&!validSandwichIds.has(meal.sandwich_option_id)){
   throw bad("Invalid sandwich selection.");
  }
 }

 const oldMemberships=await select(
  "player_team_memberships",
  `select=player_id,team_id,membership_order,captain,vice_captain&player_id=eq.${encodeURIComponent(playerId)}`
 );
 const oldMeals=await select(
  "player_meals",
  `select=player_id,meal_day_id,sandwich_option_id,ordered&player_id=eq.${encodeURIComponent(playerId)}`
 );

 await patch("players",`id=eq.${encodeURIComponent(playerId)}`,{
  first_name:player.first_name.trim(),
  last_name:player.last_name.trim(),
  birth_date:player.birth_date,
  nationality:player.nationality.trim(),
  email:player.email.trim().toLowerCase(),
  jersey_number:player.jersey_number?.trim()||null,
  origin_club_id:player.origin_club_id,
  updated_at:new Date().toISOString()
 });

 try{
  await del("player_team_memberships",`player_id=eq.${encodeURIComponent(playerId)}`);
  await del("player_meals",`player_id=eq.${encodeURIComponent(playerId)}`);

  await insert(
   "player_team_memberships",
   memberships.map((m,index)=>({
    player_id:playerId,
    team_id:m.team_id,
    membership_order:index+1,
    captain:false,
    vice_captain:false
   }))
  );

  await insert(
   "player_meals",
   meals.map(x=>({
    player_id:playerId,
    meal_day_id:x.meal_day_id,
    sandwich_option_id:x.ordered?x.sandwich_option_id:null,
    ordered:!!x.ordered
   }))
  );

 }catch(err){
  await del("player_team_memberships",`player_id=eq.${encodeURIComponent(playerId)}`);
  await del("player_meals",`player_id=eq.${encodeURIComponent(playerId)}`);

  if(oldMemberships.length)await insert("player_team_memberships",oldMemberships);
  if(oldMeals.length)await insert("player_meals",oldMeals);

  throw err;
 }
}

async function touchToken(id){
 await patch("player_edit_tokens",`id=eq.${encodeURIComponent(id)}`,{
  last_used_at:new Date().toISOString()
 });
}

function hashToken(token){
 return crypto.createHash("sha256").update(token).digest("hex");
}

function headers(){
 return{
  apikey:SERVICE_ROLE_KEY,
  Authorization:`Bearer ${SERVICE_ROLE_KEY}`
 };
}

async function select(table,q){
 const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`,{
  headers:headers()
 });
 if(!r.ok)throw await er(r);
 return r.json();
}

async function insert(table,body){
 const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{
  method:"POST",
  headers:{
   ...headers(),
   "Content-Type":"application/json",
   Prefer:"return=minimal"
  },
  body:JSON.stringify(body)
 });
 if(!r.ok)throw await er(r);
}

async function patch(table,q,body){
 const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`,{
  method:"PATCH",
  headers:{
   ...headers(),
   "Content-Type":"application/json",
   Prefer:"return=minimal"
  },
  body:JSON.stringify(body)
 });
 if(!r.ok)throw await er(r);
}

async function del(table,q){
 const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`,{
  method:"DELETE",
  headers:headers()
 });
 if(!r.ok)throw await er(r);
}

async function er(r){
 let d={};
 try{d=await r.json()}catch{}
 const x=new Error(d.message||d.error||"Database request failed.");
 x.statusCode=r.status===404?404:(r.status>=500?500:400);
 return x;
}

function bad(m){
 const e=new Error(m);
 e.statusCode=400;
 return e;
}

function notFound(){
 const e=new Error("This edit link is invalid or has been revoked.");
 e.statusCode=404;
 return e;
}
