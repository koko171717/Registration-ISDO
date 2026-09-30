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
async function patch(table,query,body){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`,{
    method:"PATCH",headers:{...H(),"Content-Type":"application/json"},body:JSON.stringify(body)
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
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  try{
    const u=await authUser(req);await assertAdmin(u.id);

    const [clubs,categories,teamsRaw,playersRaw,memberships,mealDays,sandwichOptions,mealsRaw]=await Promise.all([
      q("clubs","select=id,name,country&active=eq.true"),
      q("categories","select=id,name"),
      q("teams","select=id,managing_club_id,category_id,display_name&active=eq.true"),
      q("players","select=id,first_name,last_name,jersey_number,origin_club_id,registration_status"),
      q("player_team_memberships","select=id,player_id,team_id,captain,vice_captain"),
      q("meal_days","select=id,name,event_date,price_chf&active=eq.true&order=event_date.asc"),
      q("sandwich_options","select=id,name,sort_order&active=eq.true&order=sort_order.asc"),
      q("player_meals","select=player_id,meal_day_id,sandwich_option_id,ordered")
    ]);

    const clubMap=new Map(clubs.map(x=>[x.id,x]));
    const catMap=new Map(categories.map(x=>[x.id,x]));
    const sandwichMap=new Map(sandwichOptions.map(x=>[x.id,x.name]));
    const playerMap=new Map(playersRaw.map(x=>[x.id,x]));

    const teams=teamsRaw.map(t=>{
      const teamMemberships=memberships.filter(m=>m.team_id===t.id);
      return {
        id:t.id,
        category_id:t.category_id,
        category:catMap.get(t.category_id)?.name||"",
        managing_club_id:t.managing_club_id,
        managing_club_name:clubMap.get(t.managing_club_id)?.name||"",
        team_name:t.display_name||clubMap.get(t.managing_club_id)?.name||"Team",
        player_count:teamMemberships.length,
        has_captain:teamMemberships.some(m=>m.captain)
      };
    });

    const teamMap=new Map(teams.map(x=>[x.id,x]));
    const dayIds=new Set(mealDays.map(x=>x.id));
    const mealsByPlayer=new Map();
    mealsRaw.forEach(m=>{
      if(!dayIds.has(m.meal_day_id))return;
      if(!mealsByPlayer.has(m.player_id))mealsByPlayer.set(m.player_id,new Set());
      mealsByPlayer.get(m.player_id).add(m.meal_day_id);
    });

    const players=playersRaw.map(p=>{
      const pm=memberships.filter(m=>m.player_id===p.id);
      const pteams=pm.map(m=>teamMap.get(m.team_id)).filter(Boolean);
      return {
        ...p,
        origin_club_name:clubMap.get(p.origin_club_id)?.name||"",
        registration_complete:p.registration_status==="complete",
        meals_complete:(mealsByPlayer.get(p.id)?.size||0)===mealDays.length,
        team_ids:pteams.map(t=>t.id),
        category_ids:[...new Set(pteams.map(t=>t.category_id))],
        teams:pteams.map(t=>({id:t.id,category:t.category,team_name:t.team_name}))
      };
    });

    const meals=[];
    playersRaw.forEach(p=>{
      mealDays.forEach(day=>{
        const m=mealsRaw.find(x=>x.player_id===p.id&&x.meal_day_id===day.id);
        meals.push({
          player_id:p.id,
          first_name:p.first_name,
          last_name:p.last_name,
          origin_club_id:p.origin_club_id,
          origin_club_name:clubMap.get(p.origin_club_id)?.name||"",
          meal_day_id:day.id,
          day_name:day.name,
          ordered:!!m?.ordered,
          sandwich_name:m?.ordered?(sandwichMap.get(m.sandwich_option_id)||""):"No meal",
          price_chf:day.price_chf
        });
      });
    });

    res.json({
      admin_email:u.email,
      clubs,categories,teams,players,
      meal_days:mealDays,
      sandwich_options:sandwichOptions,
      meals
    });
  }catch(e){
    res.status(e.statusCode||500).json({error:e.message});
  }
}
