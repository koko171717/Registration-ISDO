const U=process.env.SUPABASE_URL,K=process.env.SUPABASE_SERVICE_ROLE_KEY;
const H=()=>({apikey:K,Authorization:`Bearer ${K}`});
const E=(s,m)=>Object.assign(new Error(m),{statusCode:s});
async function err(r){let d={};try{d=await r.json()}catch{}return E(r.status,d.message||"Database error")}
async function q(t,s){const r=await fetch(`${U}/rest/v1/${t}?${s}`,{headers:H()});if(!r.ok)throw await err(r);return r.json()}
async function auth(req){const tok=(req.headers.authorization||"").replace("Bearer ","");if(!tok)throw E(401,"Not signed in.");const r=await fetch(`${U}/auth/v1/user`,{headers:{apikey:K,Authorization:`Bearer ${tok}`}});if(!r.ok)throw E(401,"Session expired.");return r.json()}
async function patch(table,filter,body){const r=await fetch(`${U}/rest/v1/${table}?${filter}`,{method:"PATCH",headers:{...H(),"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(body)});if(!r.ok)throw await err(r)}
async function del(table,filter){const r=await fetch(`${U}/rest/v1/${table}?${filter}`,{method:"DELETE",headers:H()});if(!r.ok)throw await err(r)}
async function post(table,body,prefer="return=minimal"){const r=await fetch(`${U}/rest/v1/${table}`,{method:"POST",headers:{...H(),"Content-Type":"application/json",Prefer:prefer},body:JSON.stringify(body)});if(!r.ok)throw await err(r)}
async function managerScope(u){
 const roles=await q("user_roles",`select=role&user_id=eq.${u.id}`),admin=roles.some(x=>x.role==="admin");
 const ids=admin?(await q("clubs","select=id&active=eq.true")).map(x=>x.id):(await q("club_managers",`select=club_id&user_id=eq.${u.id}`)).map(x=>x.club_id);
 if(!ids.length)throw E(403,"No club assigned.");return{admin,ids}
}
function validateMeals(meals,days,sands){
 const vd=new Set(days.map(x=>x.id)),vs=new Set(sands.map(x=>x.id)),prefs=new Set(["chicken","beef_pork","fish_seafood","vegetarian"]),out=[];
 if(!Array.isArray(meals)||meals.length!==days.length)throw E(400,"Please choose a meal option for every day.");
 for(const m of meals){if(!vd.has(m.meal_day_id))throw E(400,"Invalid meal day.");const type=m.meal_type||"none";if(type==="none")out.push({meal_day_id:m.meal_day_id,meal_type:"none",sandwich_option_id:null,hot_meal_option_id:null,hot_preference_1:null,hot_preference_2:null,ordered:false});else if(type==="sandwich"){if(!vs.has(m.sandwich_option_id))throw E(400,"Invalid sandwich.");out.push({meal_day_id:m.meal_day_id,meal_type:"sandwich",sandwich_option_id:m.sandwich_option_id,hot_meal_option_id:null,hot_preference_1:null,hot_preference_2:null,ordered:true})}else if(type==="hot"){const p1=m.hot_preference_1,p2=m.hot_preference_2;if(!prefs.has(p1))throw E(400,"Invalid hot meal preference.");if(p1==="vegetarian"){out.push({meal_day_id:m.meal_day_id,meal_type:"hot",sandwich_option_id:null,hot_meal_option_id:null,hot_preference_1:p1,hot_preference_2:null,ordered:true})}else{if(!prefs.has(p2)||p1===p2)throw E(400,"Please choose two different hot meal preferences.");out.push({meal_day_id:m.meal_day_id,meal_type:"hot",sandwich_option_id:null,hot_meal_option_id:null,hot_preference_1:p1,hot_preference_2:p2,ordered:true})}}else throw E(400,"Invalid meal type.")}
 return out
}
export default async function handler(req,res){
 if(!["GET","POST"].includes(req.method))return res.status(405).json({error:"Method not allowed"});
 try{
  const u=await auth(req),scope=await managerScope(u);
  if(req.method==="POST"){
   const b=req.body||{};
   if(b.action==="add_coach_assignment"||b.action==="remove_coach_assignment"){
    const team=(await q("teams",`select=id,managing_club_id&id=eq.${b.team_id}`))[0];if(!team||(!scope.admin&&!scope.ids.includes(team.managing_club_id)))throw E(403,"Team not allowed.");
    const p=(await q("players",`select=id,origin_club_id&id=eq.${b.participant_id}`))[0];if(!p||(!scope.admin&&!scope.ids.includes(p.origin_club_id)))throw E(403,"Participant not allowed.");
    if(b.action==="add_coach_assignment")await post("team_coach_assignments",{team_id:b.team_id,participant_id:b.participant_id},"resolution=ignore-duplicates,return=minimal");else await del("team_coach_assignments",`team_id=eq.${b.team_id}&participant_id=eq.${b.participant_id}`);
    return res.json({ok:true});
   }
   if(b.action==="update_participant"){
    const p=(await q("players",`select=id,origin_club_id,participant_type&id=eq.${b.participant_id}`))[0];if(!p||(!scope.admin&&!scope.ids.includes(p.origin_club_id)))throw E(403,"Participant not allowed.");
    const days=await q("meal_days","select=id&active=eq.true"),sands=await q("sandwich_options","select=id&active=eq.true"),meals=validateMeals(b.meals||[],days,sands);

    // Safe meal save:
    // - never delete all current meals first
    // - update existing rows day-by-day
    // - insert only missing days
    // - remove obsolete rows only after all requested days were saved successfully
    const existing=await q("player_meals",`select=id,meal_day_id&player_id=eq.${p.id}`);
    const byDay=new Map(existing.map(row=>[row.meal_day_id,row]));
    const requestedDayIds=new Set(meals.map(m=>m.meal_day_id));

    for(const meal of meals){
     const payload={...meal,player_id:p.id};
     const current=byDay.get(meal.meal_day_id);
     if(current){
      const {player_id,...changes}=payload;
      await patch("player_meals",`id=eq.${current.id}`,changes);
     }else{
      await post("player_meals",payload);
     }
    }

    // Only after every new/updated row succeeded do we remove obsolete meal-day rows.
    for(const row of existing){
     if(!requestedDayIds.has(row.meal_day_id)){
      await del("player_meals",`id=eq.${row.id}`);
     }
    }

    // Update personal data after meals have saved successfully.
    await patch("players",`id=eq.${p.id}`,{
     first_name:String(b.first_name||"").trim(),
     last_name:String(b.last_name||"").trim(),
     email:String(b.email||"").trim().toLowerCase(),
     jersey_number:p.participant_type==="player"?(b.jersey_number||null):null
    });

    return res.json({ok:true});
   }
   throw E(400,"Unknown action.");
  }

  const ids=scope.ids,[clubs,teams,cats,days,sands,people,assignments]=await Promise.all([
   q("clubs",`select=id,name,logo_url&id=in.(${ids.join(",")})`),
   q("teams",`select=id,managing_club_id,category_id,display_name,logo_url&active=eq.true&managing_club_id=in.(${ids.join(",")})`),
   q("categories","select=id,name"),
   q("meal_days","select=id,name,event_date,price_chf,hot_price_chf&active=eq.true&order=event_date.asc"),
   q("sandwich_options","select=id,name,sort_order&active=eq.true&order=sort_order.asc"),
   q("players",`select=id,participant_type,first_name,last_name,email,jersey_number,origin_club_id,registration_status&origin_club_id=in.(${ids.join(",")})`),
   q("team_coach_assignments","select=id,participant_id,team_id")
  ]);
  const pids=people.map(x=>x.id),tids=teams.map(x=>x.id);
  const [memberships,mealRows]=await Promise.all([
   tids.length?q("player_team_memberships",`select=id,player_id,team_id,captain,vice_captain&team_id=in.(${tids.join(",")})`):[],
   pids.length?q("player_meals",`select=player_id,meal_day_id,meal_type,sandwich_option_id,hot_preference_1,hot_preference_2,ordered&player_id=in.(${pids.join(",")})`):[]
  ]);
  const cm=new Map(clubs.map(x=>[x.id,x])),catm=new Map(cats.map(x=>[x.id,x.name])),pm=new Map(people.map(x=>[x.id,x]));
  const participantOut=people.map(p=>{const ms=memberships.filter(m=>m.player_id===p.id).map(m=>{const tm=teams.find(t=>t.id===m.team_id);return tm?{membership_id:m.id,team_id:tm.id,category:catm.get(tm.category_id),team_name:tm.display_name||cm.get(tm.managing_club_id)?.name,captain:m.captain,vice_captain:m.vice_captain}:null}).filter(Boolean);return{...p,teams:ms,meals:mealRows.filter(x=>x.player_id===p.id)}});
  const outTeams=teams.map(tm=>{
   const c=cm.get(tm.managing_club_id);const ps=memberships.filter(m=>m.team_id===tm.id).map(m=>{const p=pm.get(m.player_id);if(!p)return null;const mealCount=mealRows.filter(x=>x.player_id===p.id).length;return{membership_id:m.id,id:p.id,first_name:p.first_name,last_name:p.last_name,jersey_number:p.jersey_number,registration_complete:p.registration_status==="complete",meals_complete:mealCount===days.length,captain:m.captain,vice_captain:m.vice_captain,is_team_coach:assignments.some(a=>a.participant_id===p.id&&a.team_id===tm.id)}}).filter(Boolean);
   const clubCoaches=people.filter(p=>p.participant_type==="coach"&&p.origin_club_id===tm.managing_club_id),clubTeamIds=teams.filter(x=>x.managing_club_id===tm.managing_club_id).map(x=>x.id),coaches=[];
   for(const p of clubCoaches){const own=assignments.filter(a=>a.participant_id===p.id&&clubTeamIds.includes(a.team_id));if(!own.length||own.some(a=>a.team_id===tm.id))coaches.push({id:p.id,first_name:p.first_name,last_name:p.last_name})}
   for(const a of assignments.filter(a=>a.team_id===tm.id)){const p=pm.get(a.participant_id);if(p&&!coaches.some(c=>c.id===p.id))coaches.push({id:p.id,first_name:p.first_name,last_name:p.last_name})}
   const candidates=people.filter(p=>p.origin_club_id===tm.managing_club_id&&["player","coach"].includes(p.participant_type)).map(p=>({id:p.id,first_name:p.first_name,last_name:p.last_name,jersey_number:p.jersey_number}));
   return{id:tm.id,managing_club_id:tm.managing_club_id,managing_club_name:c?.name||"",club_logo_url:c?.logo_url||null,logo_url:tm.logo_url||null,category:catm.get(tm.category_id),team_name:tm.display_name||c?.name||"Team",players:ps,coaches,coach_candidates:candidates}
  });
  res.json({manager_email:u.email,clubs,meal_days:days,sandwich_options:sands,participants:participantOut,club_summary:{teams:teams.length,players:people.filter(p=>(p.participant_type||"player")==="player").length,coaches:people.filter(p=>p.participant_type==="coach").length,others:people.filter(p=>p.participant_type==="other").length},teams:outTeams});
 }catch(e){res.status(e.statusCode||500).json({error:e.message})}
}