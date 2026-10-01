const db=window.isdoSupabase;

const state={
  step:1,
  clubs:[],
  categories:[],
  teams:[],
  access:[],
  mealDays:[],
  sandwichOptions:[],
  legalDocuments:[]
};

const $=id=>document.getElementById(id);

const e={
  form:$("registrationForm"),
  loading:$("loading"),
  fatal:$("fatal"),
  fatalMessage:$("fatalMessage"),
  success:$("success"),
  emailSuccess:$("emailSuccess"),
  emailWarning:$("emailWarning"),
  editLink:$("editLink"),
  copyEditLink:$("copyEditLink"),
  progressFill:$("progressFill"),
  progressText:$("progressText"),
  back:$("backButton"),
  next:$("nextButton"),
  submit:$("submitButton"),
  error:$("formError"),
  first:$("firstName"),
  last:$("lastName"),
  birth:$("birthDate"),
  nationality:$("nationality"),
  email:$("email"),
  jersey:$("jerseyNumber"),
  origin:$("originClub"),
  cat1:$("category1"),
  team1:$("team1"),
  toggle2:$("secondCategoryToggle"),
  block2:$("team2Block"),
  cat2:$("category2"),
  team2:$("team2"),
  meals:$("mealChoices"),
  mealTotal:$("mealTotal"),
  legal:$("legalDocuments"),
  review:$("reviewContent"),
  confirm:$("finalConfirmation")
};

document.addEventListener("DOMContentLoaded",init);

async function init(){
  try{
    const qs=await Promise.all([
      db
        .from("clubs")
        .select("id,name,country,active")
        .eq("active",true)
        .order("name"),

      db
        .from("categories")
        .select("id,name"),

      db
        .from("teams")
        .select("id,managing_club_id,category_id,display_name,active")
        .eq("active",true),

      db
        .from("team_origin_club_access")
        .select("team_id,origin_club_id"),

      db
        .from("meal_days")
        .select("id,name,event_date,price_chf,active")
        .eq("active",true)
        .order("event_date"),

      db
        .from("sandwich_options")
        .select("id,name,sort_order,active")
        .eq("active",true)
        .order("sort_order"),

      db
        .from("legal_documents")
        .select("id,document_type,version,title,content,active")
        .eq("active",true)
        .order("created_at")
    ]);

    const bad=qs.find(x=>x.error);

    if(bad){
      throw bad.error;
    }

    [
      state.clubs,
      state.categories,
      state.teams,
      state.access,
      state.mealDays,
      state.sandwichOptions,
      state.legalDocuments
    ]=qs.map(x=>x.data||[]);

    renderClubs();
    renderMeals();
    renderLegal();
    bind();

    e.loading.classList.add("hidden");
    e.form.classList.remove("hidden");

    updateStep();

  }catch(err){
    console.error(err);

    e.loading.classList.add("hidden");
    e.fatal.classList.remove("hidden");

    e.fatalMessage.textContent=
      "The registration form could not load.";
  }
}

function bind(){

  e.origin.onchange=()=>{
    resetTeams();
    renderCategories(e.cat1);
  };

  e.cat1.onchange=()=>{

    renderTeams(
      e.team1,
      e.cat1.value
    );

    if(e.toggle2.checked){

      renderCategories(
        e.cat2,
        e.cat1.value
      );

      e.team2.innerHTML=
        '<option value="">Select a team</option>';

      e.team2.disabled=true;
    }
  };

  e.toggle2.onchange=()=>{

    e.block2.classList.toggle(
      "hidden",
      !e.toggle2.checked
    );

    if(e.toggle2.checked){

      renderCategories(
        e.cat2,
        e.cat1.value
      );

    }else{

      e.cat2.value="";

      e.team2.innerHTML=
        '<option value="">Select a team</option>';

      e.team2.disabled=true;
    }
  };

  e.cat2.onchange=()=>{

    renderTeams(
      e.team2,
      e.cat2.value
    );

  };

  e.back.onclick=()=>{

    if(state.step>1){

      state.step--;

      clearError();

      updateStep();
    }
  };

  e.next.onclick=()=>{

    if(!validateStep()){
      return;
    }

    if(state.step<5){

      state.step++;

      if(state.step===5){
        renderReview();
      }

      clearError();

      updateStep();

      scrollTo({
        top:0,
        behavior:"smooth"
      });
    }
  };

  e.form.onsubmit=submitForm;
}

function renderClubs(){

  state.clubs.forEach(club=>{

    e.origin.add(
      new Option(
        club.name,
        club.id
      )
    );

  });
}

function resetTeams(){

  e.cat1.innerHTML=
    '<option value="">Select a category</option>';

  e.team1.innerHTML=
    '<option value="">Select a team</option>';

  e.cat2.innerHTML=
    '<option value="">Select a category</option>';

  e.team2.innerHTML=
    '<option value="">Select a team</option>';

  e.cat1.disabled=
    !e.origin.value;

  e.team1.disabled=true;
  e.team2.disabled=true;
}

function allowedTeams(){

  const ids=new Set(

    state.access
      .filter(
        access=>
          access.origin_club_id===
          e.origin.value
      )
      .map(
        access=>
          access.team_id
      )

  );

  return state.teams.filter(
    team=>ids.has(team.id)
  );
}

function renderCategories(
  select,
  exclude=""
){

  const ids=new Set(
    allowedTeams()
      .map(
        team=>
          team.category_id
      )
  );

  select.innerHTML=
    '<option value="">Select a category</option>';

  state.categories

    .filter(
      category=>
        ids.has(category.id) &&
        category.id!==exclude
    )

    .sort(
      (a,b)=>

        (
          {
            Men:1,
            Women:2,
            Mixed:3
          }[a.name]||9
        )

        -

        (
          {
            Men:1,
            Women:2,
            Mixed:3
          }[b.name]||9
        )
    )

    .forEach(
      category=>

        select.add(
          new Option(
            category.name,
            category.id
          )
        )

    );

  select.disabled=
    !e.origin.value;
}

function teamName(team){

  return (
    team.display_name ||

    state.clubs.find(
      club=>
        club.id===
        team.managing_club_id
    )?.name ||

    "Team"
  );
}

function renderTeams(
  select,
  category
){

  select.innerHTML=
    '<option value="">Select a team</option>';

  if(!category){

    select.disabled=true;

    return;
  }

  const teams=
    allowedTeams()

      .filter(
        team=>
          team.category_id===
          category
      )

      .sort(
        (a,b)=>
          teamName(a)
            .localeCompare(
              teamName(b)
            )
      );

  teams.forEach(
    team=>

      select.add(
        new Option(
          teamName(team),
          team.id
        )
      )

  );

  select.disabled=false;

  if(teams.length===1){

    select.value=
      teams[0].id;
  }
}

function renderMeals(){

  e.meals.innerHTML="";

  state.mealDays.forEach(day=>{

    const div=
      document.createElement("div");

    div.className=
      "meal-card";

    const select=
      document.createElement("select");

    select.id=
      "meal-"+day.id;

    select.add(
      new Option(
        "No meal",
        ""
      )
    );

    state.sandwichOptions.forEach(
      option=>

        select.add(
          new Option(
            option.name,
            option.id
          )
        )

    );

    select.onchange=
      mealTotal;

    div.innerHTML=
      "<h3>"+
      esc(day.name)+
      "</h3>";

    div.appendChild(select);

    e.meals.appendChild(div);

  });

  mealTotal();
}

function mealTotal(){

  let total=0;

  state.mealDays.forEach(
    day=>{

      if(
        $("meal-"+day.id)?.value
      ){
        total+=
          Number(
            day.price_chf
          );
      }
    }
  );

  e.mealTotal.textContent=
    "CHF "+
    (
      Number.isInteger(total)
        ? total+".–"
        : total.toFixed(2)
    );
}

function renderLegal(){

  if(
    !state.legalDocuments.length
  ){

    e.legal.innerHTML=
      '<div class="info">'+
      '<strong>'+
      'Legal documents have not been configured yet.'+
      '</strong>'+
      '</div>';

    return;
  }

  e.legal.innerHTML=
    state.legalDocuments

      .map(
        document=>
          `
          <article class="legal-card">

            <h3>
              ${esc(document.title)}
            </h3>

            <div class="legal-text">
              ${esc(document.content)}
            </div>

            <label class="check">

              <input
                type="checkbox"
                data-legal-id="${document.id}"
              >

              I confirm that I have read and accept this document.

            </label>

          </article>
          `
      )

      .join("");
}

function updateStep(){

  document
    .querySelectorAll(".step")
    .forEach(
      step=>

        step.classList.toggle(
          "hidden",
          Number(
            step.dataset.step
          )!==state.step
        )

    );

  e.progressFill.style.width=
    (state.step*20)+"%";

  e.progressText.textContent=
    `Step ${state.step} of 5`;

  e.back.classList.toggle(
    "hidden",
    state.step===1
  );

  e.next.classList.toggle(
    "hidden",
    state.step===5
  );

  e.submit.classList.toggle(
    "hidden",
    state.step!==5
  );
}

function validateStep(){

  clearError();

  if(state.step===1){

    for(
      const input of[
        e.first,
        e.last,
        e.birth,
        e.nationality,
        e.email
      ]
    ){

      if(
        !input.reportValidity()
      ){
        return false;
      }
    }
  }

  if(state.step===2){

    if(
      !e.origin.value ||
      !e.cat1.value ||
      !e.team1.value
    ){

      return showError(
        "Please select your club, first category and first team."
      );
    }

    if(
      e.toggle2.checked &&
      (
        !e.cat2.value ||
        !e.team2.value
      )
    ){

      return showError(
        "Please complete your second category and team."
      );
    }
  }

  if(state.step===4){

    if(
      !state.legalDocuments.length
    ){

      return showError(
        "Legal documents have not been configured yet."
      );
    }

    const accepted=
      [
        ...document.querySelectorAll(
          "[data-legal-id]"
        )
      ]
      .every(
        checkbox=>
          checkbox.checked
      );

    if(!accepted){

      return showError(
        "Please accept all legal acknowledgements."
      );
    }
  }

  return true;
}

function renderReview(){

  const club=
    state.clubs.find(
      item=>
        item.id===
        e.origin.value
    );

  const category1=
    state.categories.find(
      item=>
        item.id===
        e.cat1.value
    );

  const team1=
    state.teams.find(
      item=>
        item.id===
        e.team1.value
    );

  const category2=
    state.categories.find(
      item=>
        item.id===
        e.cat2.value
    );

  const team2=
    state.teams.find(
      item=>
        item.id===
        e.team2.value
    );

  const meals=
    state.mealDays

      .map(
        day=>{

          const select=
            $("meal-"+day.id);

          const name=
            select.value

              ? state.sandwichOptions.find(
                  option=>
                    option.id===
                    select.value
                )?.name

              : "No meal";

          return `
            <p>
              <strong>
                ${esc(day.name)}:
              </strong>

              ${esc(name)}
            </p>
          `;
        }
      )

      .join("");

  e.review.innerHTML=
    `
    <div class="review-card">

      <h3>
        Personal information
      </h3>

      <p>
        ${esc(e.first.value)}
        ${esc(e.last.value)}
      </p>

      <p>
        ${esc(e.email.value)}
      </p>

      <p>
        Jersey #
        ${esc(
          e.jersey.value||
          "—"
        )}
      </p>

    </div>


    <div class="review-card">

      <h3>
        Club & teams
      </h3>

      <p>
        <strong>
          Club of origin:
        </strong>

        ${esc(
          club?.name||
          ""
        )}
      </p>

      <p>
        <strong>
          ${esc(
            category1?.name||
            ""
          )}:
        </strong>

        ${esc(
          teamName(team1)
        )}
      </p>

      ${
        e.toggle2.checked &&
        team2

        ? `
          <p>
            <strong>
              ${esc(
                category2?.name||
                ""
              )}:
            </strong>

            ${esc(
              teamName(team2)
            )}
          </p>
        `

        : ""
      }

    </div>


    <div class="review-card">

      <h3>
        Lunches
      </h3>

      ${meals}

      <p>
        <strong>
          Total:
        </strong>

        ${esc(
          e.mealTotal.textContent
        )}
      </p>

    </div>
    `;
}

function payload(){

  const memberships=[
    {
      team_id:
        e.team1.value,

      membership_order:1
    }
  ];

  if(
    e.toggle2.checked
  ){

    memberships.push(
      {
        team_id:
          e.team2.value,

        membership_order:2
      }
    );
  }

  return{

    player:{

      first_name:
        e.first.value.trim(),

      last_name:
        e.last.value.trim(),

      birth_date:
        e.birth.value,

      nationality:
        e.nationality.value.trim(),

      email:
        e.email.value
          .trim()
          .toLowerCase(),

      jersey_number:
        e.jersey.value.trim()
        ||null,

      origin_club_id:
        e.origin.value
    },

    memberships,

    meals:
      state.mealDays.map(
        day=>{

          const select=
            $("meal-"+day.id);

          return{

            meal_day_id:
              day.id,

            sandwich_option_id:
              select.value||
              null,

            ordered:
              !!select.value
          };
        }
      ),

    legal_acceptances:
      state.legalDocuments.map(
        document=>({

          legal_document_id:
            document.id,

          accepted:
            !!document.querySelector(
              `[data-legal-id="${document.id}"]`
            )?.checked
        })
      )
  };
}

async function submitForm(ev){

  ev.preventDefault();

  clearError();

  if(
    !e.confirm.checked
  ){

    return showError(
      "Please confirm that your information is correct."
    );
  }

  e.submit.disabled=true;

  try{

    const response=
      await fetch(
        "/api/register-player",
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              payload()
            )
        }
      );

    const result=
      await response.json();

    if(
      !response.ok
    ){

      throw new Error(
        result.error||
        "Registration could not be saved."
      );
    }

    if(
      result.edit_url
    ){

      e.editLink.href=
        result.edit_url;

      e.editLink.textContent=
        result.edit_url;

      e.copyEditLink.onclick=
        async()=>{

          try{

            await navigator
              .clipboard
              .writeText(
                result.edit_url
              );

            e.copyEditLink.textContent=
              "Copied ✓";

            setTimeout(
              ()=>{

                e.copyEditLink.textContent=
                  "Copy link";

              },
              1800
            );

          }catch{

            e.copyEditLink.textContent=
              "Copy failed";
          }
        };
    }

    /*
     * Affichage du statut e-mail.
     *
     * L'inscription reste valide
     * même si le mail n'a pas pu
     * être envoyé.
     */

    if(
      result.email_sent
    ){

      e.emailSuccess
        .classList
        .remove("hidden");

      e.emailWarning
        .classList
        .add("hidden");

    }else{

      e.emailSuccess
        .classList
        .add("hidden");

      e.emailWarning
        .classList
        .remove("hidden");
    }

    e.form.classList.add(
      "hidden"
    );

    e.success.classList.remove(
      "hidden"
    );

    scrollTo({
      top:0,
      behavior:"smooth"
    });

  }catch(err){

    showError(
      err.message
    );

  }finally{

    e.submit.disabled=false;
  }
}

function showError(message){

  e.error.textContent=
    message;

  e.error.classList.remove(
    "hidden"
  );

  return false;
}

function clearError(){

  e.error.classList.add(
    "hidden"
  );

  e.error.textContent="";
}

function esc(value){

  return String(
    value??""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}
