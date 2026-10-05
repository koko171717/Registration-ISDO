const db=window.isdoSupabase;
const state={step:1,clubs:[],categories:[],teams:[],access:[],mealDays:[],sandwichOptions:[],legalDocuments:[]};
const $=id=>document.getElementById(id);
const e={form:$('registrationForm'),loading:$('loading'),fatal:$('fatal'),fatalMessage:$('fatalMessage'),success:$('success'),progressFill:$('progressFill'),progressText:$('progressText'),back:$('backButton'),next:$('nextButton'),submit:$('submitButton'),error:$('formError'),type:$('participantType'),first:$('firstName'),last:$('lastName'),birth:$('birthDate'),nationality:$('nationality'),email:$('email'),jersey:$('jerseyNumber'),jerseyField:$('jerseyField'),origin:$('originClub'),clubTeamsTitle:$('clubTeamsTitle'),clubTeamsDescription:$('clubTeamsDescription'),originClubLabel:$('originClubLabel'),playerTeamsBlock:$('playerTeamsBlock'),cat1:$('category1'),team1:$('team1'),toggle2:$('secondCategoryToggle'),block2:$('team2Block'),cat2:$('category2'),team2:$('team2'),meals:$('mealChoices'),mealTotal:$('mealTotal'),legal:$('legalDocuments'),review:$('reviewContent'),confirm:$('finalConfirmation'),editLink:$('editLink'),copyEditLink:$('copyEditLink'),emailSuccess:$('emailSuccess'),emailWarning:$('emailWarning')};
document.addEventListener('DOMContentLoaded',init);

async function init(){
 try{
  const qs=await Promise.all([
   db.from('clubs').select('id,name,country,active').eq('active',true).order('name'),
   db.from('categories').select('id,name'),
   db.from('teams').select('id,managing_club_id,category_id,display_name,active').eq('active',true),
   db.from('team_origin_club_access').select('team_id,origin_club_id'),
   db.from('meal_days').select('id,name,event_date,price_chf,active').eq('active',true).order('event_date'),
   db.from('sandwich_options').select('id,name,sort_order,active').eq('active',true).order('sort_order'),
   db.from('legal_documents').select('id,document_type,version,title,content,active').eq('active',true).order('created_at')
  ]);
  const bad=qs.find(x=>x.error); if(bad) throw bad.error;
  [state.clubs,state.categories,state.teams,state.access,state.mealDays,state.sandwichOptions,state.legalDocuments]=qs.map(x=>x.data||[]);
  renderClubs();renderMeals();renderLegal();bind();applyParticipantType();e.loading.classList.add('hidden');e.form.classList.remove('hidden');updateStep();
 }catch(err){console.error(err);e.loading.classList.add('hidden');e.fatal.classList.remove('hidden');e.fatalMessage.textContent='The registration form could not load.'}
}
function bind(){
 e.type.onchange=applyParticipantType;
 e.origin.onchange=()=>{resetTeams();if(isPlayer())renderCategories(e.cat1)};
 e.cat1.onchange=()=>{renderTeams(e.team1,e.cat1.value);if(e.toggle2.checked){renderCategories(e.cat2,e.cat1.value);e.team2.innerHTML='<option value="">Select a team</option>';e.team2.disabled=true}};
 e.toggle2.onchange=()=>{e.block2.classList.toggle('hidden',!e.toggle2.checked);if(e.toggle2.checked)renderCategories(e.cat2,e.cat1.value);else{e.cat2.value='';e.team2.innerHTML='<option value="">Select a team</option>';e.team2.disabled=true}};
 e.cat2.onchange=()=>renderTeams(e.team2,e.cat2.value);
 e.back.onclick=()=>{if(state.step>1){state.step--;clearError();updateStep()}};
 e.next.onclick=()=>{if(!validateStep())return;if(state.step<5){state.step++;if(state.step===5)renderReview();clearError();updateStep();scrollTo({top:0,behavior:'smooth'})}};
 e.form.onsubmit=submitForm;
 if(e.copyEditLink)e.copyEditLink.onclick=copyPrivateLink;
}
function isPlayer(){return e.type.value==='player'}
function applyParticipantType(){
 const player=isPlayer();
 e.jerseyField.classList.toggle('hidden',!player);
 e.playerTeamsBlock.classList.toggle('hidden',!player);
 e.clubTeamsTitle.textContent=player?'2. Club & teams':'2. Club';
 e.clubTeamsDescription.textContent=player
  ?'Select your club of origin and the category or categories in which you will play.'
  :'Which club are you coming with?';
 e.originClubLabel.innerHTML=player
  ?'Club of origin <em>*</em>'
  :'Club <em>*</em>';
 e.cat1.required=player;e.team1.required=player;
 if(!player){e.jersey.value='';e.toggle2.checked=false;e.block2.classList.add('hidden');resetTeams()}
 else if(e.origin.value){renderCategories(e.cat1)}
}
function renderClubs(){state.clubs.forEach(c=>e.origin.add(new Option(c.name,c.id)))}
function resetTeams(){e.cat1.innerHTML='<option value="">Select a category</option>';e.team1.innerHTML='<option value="">Select a team</option>';e.cat2.innerHTML='<option value="">Select a category</option>';e.team2.innerHTML='<option value="">Select a team</option>';e.cat1.disabled=!e.origin.value||!isPlayer();e.team1.disabled=true;e.team2.disabled=true}
function allowedTeams(){const ids=new Set(state.access.filter(a=>a.origin_club_id===e.origin.value).map(a=>a.team_id));return state.teams.filter(t=>ids.has(t.id))}
function renderCategories(sel,exclude=''){const ids=new Set(allowedTeams().map(t=>t.category_id));sel.innerHTML='<option value="">Select a category</option>';state.categories.filter(c=>ids.has(c.id)&&c.id!==exclude).sort((a,b)=>({Men:1,Women:2,Mixed:3}[a.name]||9)-({Men:1,Women:2,Mixed:3}[b.name]||9)).forEach(c=>sel.add(new Option(c.name,c.id)));sel.disabled=!e.origin.value||!isPlayer()}
function teamName(t){return t?.display_name||state.clubs.find(c=>c.id===t?.managing_club_id)?.name||'Team'}
function renderTeams(sel,cat){sel.innerHTML='<option value="">Select a team</option>';if(!cat){sel.disabled=true;return}const teams=allowedTeams().filter(t=>t.category_id===cat).sort((a,b)=>teamName(a).localeCompare(teamName(b)));teams.forEach(t=>sel.add(new Option(teamName(t),t.id)));sel.disabled=false;if(teams.length===1)sel.value=teams[0].id}
function renderMeals(){e.meals.innerHTML='';state.mealDays.forEach(day=>{const div=document.createElement('div');div.className='meal-card';const s=document.createElement('select');s.id='meal-'+day.id;s.add(new Option('No meal',''));state.sandwichOptions.forEach(o=>s.add(new Option(o.name,o.id)));s.onchange=mealTotal;div.innerHTML='<h3>'+esc(day.name)+'</h3>';div.appendChild(s);e.meals.appendChild(div)});mealTotal()}
function mealTotal(){let total=0;state.mealDays.forEach(d=>{if($('meal-'+d.id)?.value)total+=Number(d.price_chf)});e.mealTotal.textContent='CHF '+(Number.isInteger(total)?total+'.–':total.toFixed(2))}
function renderLegal(){if(!state.legalDocuments.length){e.legal.innerHTML='<div class="info"><strong>Legal documents have not been configured yet.</strong></div>';return}e.legal.innerHTML=state.legalDocuments.map(d=>`<article class="legal-card"><h3>${esc(d.title)}</h3><div class="legal-text">${esc(d.content)}</div><label class="check"><input type="checkbox" data-legal-id="${d.id}"> I confirm that I have read and accept this document.</label></article>`).join('')}
function updateStep(){document.querySelectorAll('.step').forEach(x=>x.classList.toggle('hidden',Number(x.dataset.step)!==state.step));e.progressFill.style.width=(state.step*20)+'%';e.progressText.textContent=`Step ${state.step} of 5`;e.back.classList.toggle('hidden',state.step===1);e.next.classList.toggle('hidden',state.step===5);e.submit.classList.toggle('hidden',state.step!==5)}
function validateStep(){clearError();if(state.step===1){for(const x of[e.type,e.first,e.last,e.birth,e.nationality,e.email])if(!x.reportValidity())return false}if(state.step===2){if(!e.origin.value)return showError('Please select your club.');if(isPlayer()){if(!e.cat1.value||!e.team1.value)return showError('Please select your first category and team.');if(e.toggle2.checked&&(!e.cat2.value||!e.team2.value))return showError('Please complete your second category and team.')}}if(state.step===4){if(!state.legalDocuments.length)return showError('Legal documents have not been configured yet.');if(![...document.querySelectorAll('[data-legal-id]')].every(x=>x.checked))return showError('Please accept all legal acknowledgements.')}return true}
function typeLabel(){return e.type.value==='player'?'Player':e.type.value==='coach'?'Coach':'Accompanying / Other'}
function renderReview(){const c=state.clubs.find(x=>x.id===e.origin.value);const meals=state.mealDays.map(d=>{const s=$('meal-'+d.id);const n=s.value?state.sandwichOptions.find(o=>o.id===s.value)?.name:'No meal';return `<p><strong>${esc(d.name)}:</strong> ${esc(n)}</p>`}).join('');let teamHtml='';if(isPlayer()){const c1=state.categories.find(x=>x.id===e.cat1.value),t1=state.teams.find(x=>x.id===e.team1.value),c2=state.categories.find(x=>x.id===e.cat2.value),t2=state.teams.find(x=>x.id===e.team2.value);teamHtml=`<p><strong>${esc(c1?.name||'')}:</strong> ${esc(teamName(t1))}</p>${e.toggle2.checked&&t2?`<p><strong>${esc(c2?.name||'')}:</strong> ${esc(teamName(t2))}</p>`:''}`;}else if(e.type.value==='coach'){teamHtml='<p>Registered as a club coach. Team-specific coaching assignments can be added later.</p>';}e.review.innerHTML=`<div class="review-card"><h3>Personal information</h3><p><strong>Registration type:</strong> ${esc(typeLabel())}</p><p>${esc(e.first.value)} ${esc(e.last.value)}</p><p>${esc(e.email.value)}</p>${isPlayer()?`<p>Jersey #${esc(e.jersey.value||'—')}</p>`:''}</div><div class="review-card"><h3>Club${isPlayer()?' & teams':''}</h3><p><strong>Club:</strong> ${esc(c?.name||'')}</p>${teamHtml}</div><div class="review-card"><h3>Lunches</h3>${meals}<p><strong>Total:</strong> ${esc(e.mealTotal.textContent)}</p></div>`}
function payload(){const memberships=[];if(isPlayer()){memberships.push({team_id:e.team1.value,membership_order:1});if(e.toggle2.checked)memberships.push({team_id:e.team2.value,membership_order:2})}return{player:{participant_type:e.type.value,first_name:e.first.value.trim(),last_name:e.last.value.trim(),birth_date:e.birth.value,nationality:e.nationality.value.trim(),email:e.email.value.trim().toLowerCase(),jersey_number:isPlayer()?(e.jersey.value.trim()||null):null,origin_club_id:e.origin.value},memberships,meals:state.mealDays.map(d=>{const s=$('meal-'+d.id);return{meal_day_id:d.id,sandwich_option_id:s.value||null,ordered:!!s.value}}),legal_acceptances:state.legalDocuments.map(d=>({legal_document_id:d.id,accepted:!!document.querySelector(`[data-legal-id="${d.id}"]`)?.checked}))}}
async function submitForm(ev){ev.preventDefault();clearError();if(!e.confirm.checked)return showError('Please confirm that your information is correct.');e.submit.disabled=true;try{const r=await fetch('/api/register-player',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});const d=await r.json();if(!r.ok)throw new Error(d.error||'Registration could not be saved.');if(e.editLink&&d.edit_url){e.editLink.href=d.edit_url;e.editLink.textContent=d.edit_url;}if(e.emailSuccess&&e.emailWarning){e.emailSuccess.classList.toggle('hidden',!d.email_sent);e.emailWarning.classList.toggle('hidden',!!d.email_sent)}e.form.classList.add('hidden');e.success.classList.remove('hidden');scrollTo({top:0,behavior:'smooth'})}catch(err){showError(err.message)}finally{e.submit.disabled=false}}
async function copyPrivateLink(){const url=e.editLink?.href;if(!url||url==='#')return;try{await navigator.clipboard.writeText(url);e.copyEditLink.textContent='Copied';setTimeout(()=>e.copyEditLink.textContent='Copy link',1400)}catch{prompt('Copy this private link:',url)}}
function showError(m){e.error.textContent=m;e.error.classList.remove('hidden');return false}function clearError(){e.error.classList.add('hidden');e.error.textContent=''}
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
