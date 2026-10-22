const db=window.isdoSupabase,$=id=>document.getElementById(id);
let session=null,currentData=null,currentTeam=null,selected=null,participantFilter="all",editingParticipant=null;
let lang=localStorage.getItem("isdo_manager_lang")||"en";

const T={
en:{managerPortal:"Manager Portal",language:"Language",signInHelp:"Sign in with the email assigned to your club.",email:"Email",password:"Password",signIn:"Sign in",signOut:"Sign out",editParticipants:"Edit participants",clubOverview:"Club overview",summary:"Summary",summaryHelp:"People are counted once according to their club of origin.",teams:"Teams",clubPlayers:"Club players",coaches:"Coaches",accompanying:"Accompanying",competition:"Competition",yourRosters:"Your rosters",rosterHelp:"Open a team to view its official roster sheet.",rosterSheet:"Official roster sheet",close:"Close",exportPdf:"Export PDF",addCoach:"Add coach",captain:"Captain",viceCaptain:"Vice-captain",teamSheet:"Team sheet",fullRoster:"Full roster",players:"players",player:"Player",role:"Role",registration:"Registration",meals:"Meals",playerHint:"Click a player to manage captain, vice-captain or coach roles.",clubManagement:"Club management",participantsHelp:"Players, coaches and accompanying people linked to your club.",all:"All",playersTitle:"Players",editParticipant:"Edit participant",firstName:"First name",lastName:"Last name",jersey:"Jersey number",teamsAndRoles:"Teams & roles",cancel:"Cancel",saveChanges:"Save changes",removeFromRoster:"Remove from roster",selectCoach:"Select a player or coach…",noCoach:"No coach assigned",notAssigned:"Not assigned",complete:"Complete",incomplete:"Incomplete",completed:"Complete",missing:"Missing",setCaptain:"Set as captain",removeCaptain:"Remove captain",setVice:"Set as vice-captain",removeVice:"Remove vice-captain",setCoach:"Set as coach",removeCoach:"Remove coach",addingCoach:"Adding coach…",team:"team",teamsLabel:"teams",catMen:"Men",catWomen:"Women",catMixed:"Mixed",coach:"Coach",other:"Accompanying",edit:"Edit",noMeal:"No meal",sandwich:"Sandwich",hotMeal:"Hot meal",priority1:"Priority 1",priority2:"Priority 2",vegetarian:"Vegetarian",chicken:"Chicken",beef_pork:"Beef / Pork",fish_seafood:"Fish / Seafood",saving:"Saving…",saved:"Changes saved.",pdfError:"The PDF could not be generated.",participantType:"Type",account:"Account",signedInAs:"Signed in as",changePassword:"Change password",changePasswordHelp:"Choose a new password for your manager account.",newPassword:"New password",confirmPassword:"Confirm password",passwordHint:"Minimum 8 characters.",savePassword:"Save password",passwordMismatch:"Passwords do not match.",passwordTooShort:"Password must contain at least 8 characters.",passwordSaved:"Password updated successfully.",passwordUpdateError:"Password could not be updated."},
fr:{managerPortal:"Portail Manager",language:"Langue",signInHelp:"Connectez-vous avec l’adresse e-mail attribuée à votre club.",email:"E-mail",password:"Mot de passe",signIn:"Se connecter",signOut:"Se déconnecter",editParticipants:"Modifier les participants",clubOverview:"Aperçu du club",summary:"Résumé",summaryHelp:"Chaque personne est comptée une seule fois selon son club d’origine.",teams:"Équipes",clubPlayers:"Joueurs du club",coaches:"Coachs",accompanying:"Accompagnants",competition:"Compétition",yourRosters:"Vos rosters",rosterHelp:"Ouvrez une équipe pour consulter sa feuille de roster officielle.",rosterSheet:"Feuille de roster officielle",close:"Fermer",exportPdf:"Exporter PDF",addCoach:"Ajouter un coach",captain:"Capitaine",viceCaptain:"Vice-capitaine",teamSheet:"Feuille d’équipe",fullRoster:"Roster complet",players:"joueurs",player:"Joueur",role:"Rôle",registration:"Inscription",meals:"Repas",playerHint:"Cliquez sur un joueur pour gérer les rôles de capitaine, vice-capitaine ou coach.",clubManagement:"Gestion du club",participantsHelp:"Joueurs, coachs et accompagnants rattachés à votre club.",all:"Tous",playersTitle:"Joueurs",editParticipant:"Modifier le participant",firstName:"Prénom",lastName:"Nom",jersey:"Numéro de maillot",teamsAndRoles:"Équipes & rôles",cancel:"Annuler",saveChanges:"Enregistrer",removeFromRoster:"Retirer du roster",selectCoach:"Sélectionner un joueur ou un coach…",noCoach:"Aucun coach assigné",notAssigned:"Non assigné",complete:"Complet",incomplete:"Incomplet",completed:"Complet",missing:"Manquant",setCaptain:"Définir comme capitaine",removeCaptain:"Retirer capitaine",setVice:"Définir comme vice-capitaine",removeVice:"Retirer vice-capitaine",setCoach:"Définir comme coach",removeCoach:"Retirer coach",addingCoach:"Ajout du coach…",team:"équipe",teamsLabel:"équipes",catMen:"Hommes",catWomen:"Femmes",catMixed:"Mixte",coach:"Coach",other:"Accompagnant",edit:"Modifier",noMeal:"Pas de repas",sandwich:"Sandwich",hotMeal:"Repas chaud",priority1:"Priorité 1",priority2:"Priorité 2",vegetarian:"Végétarien",chicken:"Poulet",beef_pork:"Bœuf / Porc",fish_seafood:"Poisson / Fruits de mer",saving:"Enregistrement…",saved:"Modifications enregistrées.",pdfError:"Le PDF n’a pas pu être généré.",participantType:"Type",account:"Mon compte",signedInAs:"Connecté en tant que",changePassword:"Modifier le mot de passe",changePasswordHelp:"Choisissez un nouveau mot de passe pour votre compte manager.",newPassword:"Nouveau mot de passe",confirmPassword:"Confirmer le mot de passe",passwordHint:"Minimum 8 caractères.",savePassword:"Enregistrer le mot de passe",passwordMismatch:"Les mots de passe ne correspondent pas.",passwordTooShort:"Le mot de passe doit contenir au moins 8 caractères.",passwordSaved:"Mot de passe modifié avec succès.",passwordUpdateError:"Le mot de passe n’a pas pu être modifié."},
de:{managerPortal:"Manager-Portal",language:"Sprache",signInHelp:"Melde dich mit der deinem Club zugewiesenen E-Mail-Adresse an.",email:"E-Mail",password:"Passwort",signIn:"Anmelden",signOut:"Abmelden",editParticipants:"Teilnehmer bearbeiten",clubOverview:"Clubübersicht",summary:"Übersicht",summaryHelp:"Jede Person wird anhand ihres Herkunftsclubs nur einmal gezählt.",teams:"Teams",clubPlayers:"Clubspieler",coaches:"Coaches",accompanying:"Begleitpersonen",competition:"Wettbewerb",yourRosters:"Deine Kader",rosterHelp:"Öffne ein Team, um den offiziellen Kader anzusehen.",rosterSheet:"Offizielles Teamblatt",close:"Schließen",exportPdf:"PDF exportieren",addCoach:"Coach hinzufügen",captain:"Kapitän",viceCaptain:"Vizekapitän",teamSheet:"Teamblatt",fullRoster:"Gesamter Kader",players:"Spieler",player:"Spieler",role:"Rolle",registration:"Anmeldung",meals:"Mahlzeiten",playerHint:"Klicke auf einen Spieler, um Kapitän, Vizekapitän oder Coach zu verwalten.",clubManagement:"Clubverwaltung",participantsHelp:"Spieler, Coaches und Begleitpersonen deines Clubs.",all:"Alle",playersTitle:"Spieler",editParticipant:"Teilnehmer bearbeiten",firstName:"Vorname",lastName:"Nachname",jersey:"Trikotnummer",teamsAndRoles:"Teams & Rollen",cancel:"Abbrechen",saveChanges:"Speichern",removeFromRoster:"Aus Kader entfernen",selectCoach:"Spieler oder Coach auswählen…",noCoach:"Kein Coach zugewiesen",notAssigned:"Nicht zugewiesen",complete:"Vollständig",incomplete:"Unvollständig",completed:"Vollständig",missing:"Fehlt",setCaptain:"Als Kapitän festlegen",removeCaptain:"Kapitän entfernen",setVice:"Als Vizekapitän festlegen",removeVice:"Vizekapitän entfernen",setCoach:"Als Coach festlegen",removeCoach:"Coach entfernen",addingCoach:"Coach wird hinzugefügt…",team:"Team",teamsLabel:"Teams",catMen:"Herren",catWomen:"Damen",catMixed:"Mixed",coach:"Coach",other:"Begleitung",edit:"Bearbeiten",noMeal:"Keine Mahlzeit",sandwich:"Sandwich",hotMeal:"Warme Mahlzeit",priority1:"Priorität 1",priority2:"Priorität 2",vegetarian:"Vegetarisch",chicken:"Hähnchen",beef_pork:"Rind / Schwein",fish_seafood:"Fisch / Meeresfrüchte",saving:"Speichern…",saved:"Änderungen gespeichert.",pdfError:"PDF konnte nicht erstellt werden.",participantType:"Typ",account:"Konto",signedInAs:"Angemeldet als",changePassword:"Passwort ändern",changePasswordHelp:"Wähle ein neues Passwort für dein Manager-Konto.",newPassword:"Neues Passwort",confirmPassword:"Passwort bestätigen",passwordHint:"Mindestens 8 Zeichen.",savePassword:"Passwort speichern",passwordMismatch:"Die Passwörter stimmen nicht überein.",passwordTooShort:"Das Passwort muss mindestens 8 Zeichen lang sein.",passwordSaved:"Passwort erfolgreich aktualisiert.",passwordUpdateError:"Passwort konnte nicht aktualisiert werden."},
nl:{managerPortal:"Managerportaal",language:"Taal",signInHelp:"Log in met het e-mailadres dat aan je club is toegewezen.",email:"E-mail",password:"Wachtwoord",signIn:"Inloggen",signOut:"Uitloggen",editParticipants:"Deelnemers bewerken",clubOverview:"Cluboverzicht",summary:"Overzicht",summaryHelp:"Iedere persoon wordt één keer geteld volgens de club van herkomst.",teams:"Teams",clubPlayers:"Clubspelers",coaches:"Coaches",accompanying:"Begeleiders",competition:"Competitie",yourRosters:"Je rosters",rosterHelp:"Open een team om het officiële roster te bekijken.",rosterSheet:"Officieel rosterblad",close:"Sluiten",exportPdf:"PDF exporteren",addCoach:"Coach toevoegen",captain:"Kapitein",viceCaptain:"Vice-kapitein",teamSheet:"Teamblad",fullRoster:"Volledig roster",players:"spelers",player:"Speler",role:"Rol",registration:"Registratie",meals:"Maaltijden",playerHint:"Klik op een speler om kapitein, vice-kapitein of coach te beheren.",clubManagement:"Clubbeheer",participantsHelp:"Spelers, coaches en begeleiders van je club.",all:"Alle",playersTitle:"Spelers",editParticipant:"Deelnemer bewerken",firstName:"Voornaam",lastName:"Achternaam",jersey:"Shirtnummer",teamsAndRoles:"Teams & rollen",cancel:"Annuleren",saveChanges:"Opslaan",removeFromRoster:"Uit roster verwijderen",selectCoach:"Selecteer speler of coach…",noCoach:"Geen coach toegewezen",notAssigned:"Niet toegewezen",complete:"Compleet",incomplete:"Onvolledig",completed:"Compleet",missing:"Ontbreekt",setCaptain:"Als kapitein instellen",removeCaptain:"Kapitein verwijderen",setVice:"Als vice-kapitein instellen",removeVice:"Vice-kapitein verwijderen",setCoach:"Als coach instellen",removeCoach:"Coach verwijderen",addingCoach:"Coach toevoegen…",team:"team",teamsLabel:"teams",catMen:"Heren",catWomen:"Dames",catMixed:"Mixed",coach:"Coach",other:"Begeleider",edit:"Bewerken",noMeal:"Geen maaltijd",sandwich:"Sandwich",hotMeal:"Warme maaltijd",priority1:"Prioriteit 1",priority2:"Prioriteit 2",vegetarian:"Vegetarisch",chicken:"Kip",beef_pork:"Rund / Varken",fish_seafood:"Vis / Zeevruchten",saving:"Opslaan…",saved:"Wijzigingen opgeslagen.",pdfError:"PDF kon niet worden gemaakt.",participantType:"Type",account:"Account",signedInAs:"Ingelogd als",changePassword:"Wachtwoord wijzigen",changePasswordHelp:"Kies een nieuw wachtwoord voor je manageraccount.",newPassword:"Nieuw wachtwoord",confirmPassword:"Bevestig wachtwoord",passwordHint:"Minimaal 8 tekens.",savePassword:"Wachtwoord opslaan",passwordMismatch:"De wachtwoorden komen niet overeen.",passwordTooShort:"Het wachtwoord moet minimaal 8 tekens bevatten.",passwordSaved:"Wachtwoord succesvol gewijzigd.",passwordUpdateError:"Het wachtwoord kon niet worden gewijzigd."},
es:{managerPortal:"Portal de Manager",language:"Idioma",signInHelp:"Inicia sesión con el correo asignado a tu club.",email:"Correo",password:"Contraseña",signIn:"Iniciar sesión",signOut:"Cerrar sesión",editParticipants:"Editar participantes",clubOverview:"Resumen del club",summary:"Resumen",summaryHelp:"Cada persona se cuenta una sola vez según su club de origen.",teams:"Equipos",clubPlayers:"Jugadores del club",coaches:"Entrenadores",accompanying:"Acompañantes",competition:"Competición",yourRosters:"Tus rosters",rosterHelp:"Abre un equipo para ver su hoja oficial.",rosterSheet:"Hoja oficial del equipo",close:"Cerrar",exportPdf:"Exportar PDF",addCoach:"Añadir entrenador",captain:"Capitán",viceCaptain:"Vicecapitán",teamSheet:"Hoja de equipo",fullRoster:"Roster completo",players:"jugadores",player:"Jugador",role:"Rol",registration:"Inscripción",meals:"Comidas",playerHint:"Haz clic en un jugador para gestionar capitán, vicecapitán o entrenador.",clubManagement:"Gestión del club",participantsHelp:"Jugadores, entrenadores y acompañantes vinculados a tu club.",all:"Todos",playersTitle:"Jugadores",editParticipant:"Editar participante",firstName:"Nombre",lastName:"Apellido",jersey:"Número",teamsAndRoles:"Equipos y roles",cancel:"Cancelar",saveChanges:"Guardar",removeFromRoster:"Quitar del roster",selectCoach:"Selecciona jugador o entrenador…",noCoach:"Sin entrenador asignado",notAssigned:"No asignado",complete:"Completo",incomplete:"Incompleto",completed:"Completo",missing:"Pendiente",setCaptain:"Asignar capitán",removeCaptain:"Quitar capitán",setVice:"Asignar vicecapitán",removeVice:"Quitar vicecapitán",setCoach:"Asignar entrenador",removeCoach:"Quitar entrenador",addingCoach:"Añadiendo entrenador…",team:"equipo",teamsLabel:"equipos",catMen:"Hombres",catWomen:"Mujeres",catMixed:"Mixto",coach:"Entrenador",other:"Acompañante",edit:"Editar",noMeal:"Sin comida",sandwich:"Sándwich",hotMeal:"Comida caliente",priority1:"Prioridad 1",priority2:"Prioridad 2",vegetarian:"Vegetariano",chicken:"Pollo",beef_pork:"Ternera / Cerdo",fish_seafood:"Pescado / Marisco",saving:"Guardando…",saved:"Cambios guardados.",pdfError:"No se pudo generar el PDF.",participantType:"Tipo",account:"Cuenta",signedInAs:"Sesión iniciada como",changePassword:"Cambiar contraseña",changePasswordHelp:"Elige una nueva contraseña para tu cuenta de manager.",newPassword:"Nueva contraseña",confirmPassword:"Confirmar contraseña",passwordHint:"Mínimo 8 caracteres.",savePassword:"Guardar contraseña",passwordMismatch:"Las contraseñas no coinciden.",passwordTooShort:"La contraseña debe tener al menos 8 caracteres.",passwordSaved:"Contraseña actualizada correctamente.",passwordUpdateError:"No se pudo actualizar la contraseña."},
it:{managerPortal:"Portale Manager",language:"Lingua",signInHelp:"Accedi con l’e-mail assegnata al tuo club.",email:"E-mail",password:"Password",signIn:"Accedi",signOut:"Esci",editParticipants:"Modifica partecipanti",clubOverview:"Panoramica club",summary:"Riepilogo",summaryHelp:"Ogni persona viene conteggiata una sola volta in base al club di origine.",teams:"Squadre",clubPlayers:"Giocatori del club",coaches:"Coach",accompanying:"Accompagnatori",competition:"Competizione",yourRosters:"I tuoi roster",rosterHelp:"Apri una squadra per vedere il roster ufficiale.",rosterSheet:"Foglio roster ufficiale",close:"Chiudi",exportPdf:"Esporta PDF",addCoach:"Aggiungi coach",captain:"Capitano",viceCaptain:"Vicecapitano",teamSheet:"Foglio squadra",fullRoster:"Roster completo",players:"giocatori",player:"Giocatore",role:"Ruolo",registration:"Registrazione",meals:"Pasti",playerHint:"Clicca su un giocatore per gestire capitano, vicecapitano o coach.",clubManagement:"Gestione club",participantsHelp:"Giocatori, coach e accompagnatori collegati al club.",all:"Tutti",playersTitle:"Giocatori",editParticipant:"Modifica partecipante",firstName:"Nome",lastName:"Cognome",jersey:"Numero maglia",teamsAndRoles:"Squadre e ruoli",cancel:"Annulla",saveChanges:"Salva",removeFromRoster:"Rimuovi dal roster",selectCoach:"Seleziona giocatore o coach…",noCoach:"Nessun coach assegnato",notAssigned:"Non assegnato",complete:"Completo",incomplete:"Incompleto",completed:"Completo",missing:"Mancante",setCaptain:"Imposta capitano",removeCaptain:"Rimuovi capitano",setVice:"Imposta vicecapitano",removeVice:"Rimuovi vicecapitano",setCoach:"Imposta coach",removeCoach:"Rimuovi coach",addingCoach:"Aggiunta coach…",team:"squadra",teamsLabel:"squadre",catMen:"Uomini",catWomen:"Donne",catMixed:"Misto",coach:"Coach",other:"Accompagnatore",edit:"Modifica",noMeal:"Nessun pasto",sandwich:"Panino",hotMeal:"Pasto caldo",priority1:"Priorità 1",priority2:"Priorità 2",vegetarian:"Vegetariano",chicken:"Pollo",beef_pork:"Manzo / Maiale",fish_seafood:"Pesce / Frutti di mare",saving:"Salvataggio…",saved:"Modifiche salvate.",pdfError:"Impossibile generare il PDF.",participantType:"Tipo",account:"Account",signedInAs:"Accesso come",changePassword:"Modifica password",changePasswordHelp:"Scegli una nuova password per il tuo account manager.",newPassword:"Nuova password",confirmPassword:"Conferma password",passwordHint:"Minimo 8 caratteri.",savePassword:"Salva password",passwordMismatch:"Le password non corrispondono.",passwordTooShort:"La password deve contenere almeno 8 caratteri.",passwordSaved:"Password aggiornata con successo.",passwordUpdateError:"Impossibile aggiornare la password."},
cs:{managerPortal:"Portál manažera",language:"Jazyk",signInHelp:"Přihlaste se e-mailem přiřazeným vašemu klubu.",email:"E-mail",password:"Heslo",signIn:"Přihlásit se",signOut:"Odhlásit se",editParticipants:"Upravit účastníky",clubOverview:"Přehled klubu",summary:"Souhrn",summaryHelp:"Každá osoba se započítá pouze jednou podle svého původního klubu.",teams:"Týmy",clubPlayers:"Hráči klubu",coaches:"Trenéři",accompanying:"Doprovod",competition:"Soutěž",yourRosters:"Vaše soupisky",rosterHelp:"Otevřete tým a zobrazte oficiální soupisku.",rosterSheet:"Oficiální soupiska",close:"Zavřít",exportPdf:"Export PDF",addCoach:"Přidat trenéra",captain:"Kapitán",viceCaptain:"Zástupce kapitána",teamSheet:"Týmový list",fullRoster:"Kompletní soupiska",players:"hráčů",player:"Hráč",role:"Role",registration:"Registrace",meals:"Jídla",playerHint:"Klikněte na hráče pro správu kapitána, zástupce kapitána nebo trenéra.",clubManagement:"Správa klubu",participantsHelp:"Hráči, trenéři a doprovod vašeho klubu.",all:"Všichni",playersTitle:"Hráči",editParticipant:"Upravit účastníka",firstName:"Jméno",lastName:"Příjmení",jersey:"Číslo dresu",teamsAndRoles:"Týmy a role",cancel:"Zrušit",saveChanges:"Uložit",removeFromRoster:"Odebrat ze soupisky",selectCoach:"Vyberte hráče nebo trenéra…",noCoach:"Žádný trenér",notAssigned:"Nepřiřazeno",complete:"Kompletní",incomplete:"Neúplná",completed:"Kompletní",missing:"Chybí",setCaptain:"Nastavit kapitána",removeCaptain:"Odebrat kapitána",setVice:"Nastavit zástupce",removeVice:"Odebrat zástupce",setCoach:"Nastavit trenéra",removeCoach:"Odebrat trenéra",addingCoach:"Přidávání trenéra…",team:"tým",teamsLabel:"týmy",catMen:"Muži",catWomen:"Ženy",catMixed:"Mix",coach:"Trenér",other:"Doprovod",edit:"Upravit",noMeal:"Bez jídla",sandwich:"Sendvič",hotMeal:"Teplé jídlo",priority1:"Priorita 1",priority2:"Priorita 2",vegetarian:"Vegetariánské",chicken:"Kuře",beef_pork:"Hovězí / Vepřové",fish_seafood:"Ryby / Mořské plody",saving:"Ukládání…",saved:"Změny uloženy.",pdfError:"PDF se nepodařilo vytvořit.",participantType:"Typ",account:"Účet",signedInAs:"Přihlášen jako",changePassword:"Změnit heslo",changePasswordHelp:"Zvolte nové heslo pro účet manažera.",newPassword:"Nové heslo",confirmPassword:"Potvrdit heslo",passwordHint:"Minimálně 8 znaků.",savePassword:"Uložit heslo",passwordMismatch:"Hesla se neshodují.",passwordTooShort:"Heslo musí mít alespoň 8 znaků.",passwordSaved:"Heslo bylo úspěšně změněno.",passwordUpdateError:"Heslo se nepodařilo změnit."},
hu:{managerPortal:"Manager Portál",language:"Nyelv",signInHelp:"Jelentkezz be a klubodhoz rendelt e-mail-címmel.",email:"E-mail",password:"Jelszó",signIn:"Bejelentkezés",signOut:"Kijelentkezés",editParticipants:"Résztvevők szerkesztése",clubOverview:"Klub áttekintése",summary:"Összegzés",summaryHelp:"Minden személy csak egyszer számít, a származási klubja alapján.",teams:"Csapatok",clubPlayers:"Klub játékosai",coaches:"Edzők",accompanying:"Kísérők",competition:"Verseny",yourRosters:"Csapatlistáid",rosterHelp:"Nyiss meg egy csapatot a hivatalos roster megtekintéséhez.",rosterSheet:"Hivatalos roster",close:"Bezárás",exportPdf:"PDF exportálás",addCoach:"Edző hozzáadása",captain:"Csapatkapitány",viceCaptain:"Helyettes kapitány",teamSheet:"Csapatlap",fullRoster:"Teljes roster",players:"játékos",player:"Játékos",role:"Szerep",registration:"Regisztráció",meals:"Étkezések",playerHint:"Kattints egy játékosra a kapitány, helyettes kapitány vagy edző kezeléséhez.",clubManagement:"Klubkezelés",participantsHelp:"A klubhoz tartozó játékosok, edzők és kísérők.",all:"Mind",playersTitle:"Játékosok",editParticipant:"Résztvevő szerkesztése",firstName:"Keresztnév",lastName:"Vezetéknév",jersey:"Mezszám",teamsAndRoles:"Csapatok és szerepek",cancel:"Mégse",saveChanges:"Mentés",removeFromRoster:"Eltávolítás a rosterből",selectCoach:"Válassz játékost vagy edzőt…",noCoach:"Nincs kijelölt edző",notAssigned:"Nincs kijelölve",complete:"Teljes",incomplete:"Hiányos",completed:"Teljes",missing:"Hiányzik",setCaptain:"Kapitánynak kijelölés",removeCaptain:"Kapitány eltávolítása",setVice:"Helyettes kapitánynak kijelölés",removeVice:"Helyettes kapitány eltávolítása",setCoach:"Edzőnek kijelölés",removeCoach:"Edző eltávolítása",addingCoach:"Edző hozzáadása…",team:"csapat",teamsLabel:"csapatok",catMen:"Férfi",catWomen:"Női",catMixed:"Vegyes",coach:"Edző",other:"Kísérő",edit:"Szerkesztés",noMeal:"Nincs étkezés",sandwich:"Szendvics",hotMeal:"Meleg étel",priority1:"1. prioritás",priority2:"2. prioritás",vegetarian:"Vegetáriánus",chicken:"Csirke",beef_pork:"Marha / Sertés",fish_seafood:"Hal / Tenger gyümölcsei",saving:"Mentés…",saved:"Módosítások mentve.",pdfError:"A PDF létrehozása sikertelen.",participantType:"Típus",account:"Fiók",signedInAs:"Bejelentkezve mint",changePassword:"Jelszó módosítása",changePasswordHelp:"Válassz új jelszót a manager fiókodhoz.",newPassword:"Új jelszó",confirmPassword:"Jelszó megerősítése",passwordHint:"Minimum 8 karakter.",savePassword:"Jelszó mentése",passwordMismatch:"A jelszavak nem egyeznek.",passwordTooShort:"A jelszónak legalább 8 karakteresnek kell lennie.",passwordSaved:"Jelszó sikeresen frissítve.",passwordUpdateError:"A jelszó frissítése sikertelen."}
};
function t(k){return T[lang]?.[k]||T.en[k]||k}
function catLabel(c){return c==="Men"?t("catMen"):c==="Women"?t("catWomen"):c==="Mixed"?t("catMixed"):c}
function setLang(v){lang=T[v]?v:"en";localStorage.setItem("isdo_manager_lang",lang);document.documentElement.lang=lang;["loginLanguage","dashboardLanguage"].forEach(id=>{if($(id))$(id).value=lang});document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));if(currentData)renderAll()}

document.addEventListener("DOMContentLoaded",async()=>{bind();setLang(lang);const r=await db.auth.getSession();session=r.data.session;if(session)load()});
function bind(){
 $("loginForm").onsubmit=login;
 $("logout").onclick=()=>db.auth.signOut();
 $("accountMenuButton").onclick=toggleAccountMenu;
 $("changePasswordButton").onclick=openAccountDialog;
 $("closeAccountDialog").onclick=$("cancelPasswordButton").onclick=()=>$("accountDialog").close();
 $("passwordForm").onsubmit=changePassword;
 $("loginLanguage").onchange=e=>setLang(e.target.value);$("dashboardLanguage").onchange=e=>setLang(e.target.value);
 $("editParticipantsButton").onclick=()=>{renderParticipants();$("participantListDialog").showModal()};
 $("closeParticipants").onclick=()=>$("participantListDialog").close();
 $("closeParticipantEdit").onclick=$("cancelParticipantEdit").onclick=()=>$("participantEditDialog").close();
 document.querySelectorAll(".filter-chip").forEach(b=>b.onclick=()=>{participantFilter=b.dataset.filter;document.querySelectorAll(".filter-chip").forEach(x=>x.classList.toggle("active",x===b));renderParticipants()});
 $("participantEditForm").onsubmit=saveParticipant;
 $("closeTeamSheet").onclick=()=>$("teamSheetDialog").close();$("exportPdfButton").onclick=exportPdf;
 $("addCoachButton").onclick=addCoach;$("closeDialog").onclick=()=>$("playerDialog").close();
 $("captainBtn").onclick=()=>role("captain");$("viceBtn").onclick=()=>role("vice_captain");$("coachBtn").onclick=toggleCoach;$("removeBtn").onclick=removeFromRoster;
 db.auth.onAuthStateChange((_e,s)=>{session=s;s?load():showLogin()});
}
async function login(ev){ev.preventDefault();const {error}=await db.auth.signInWithPassword({email:$("email").value.trim().toLowerCase(),password:$("password").value});if(error){$("loginMsg").textContent=error.message;$("loginMsg").classList.remove("hidden")}}
function toggleAccountMenu(){
 const menu=$("accountMenu");
 const open=menu.classList.contains("hidden");
 menu.classList.toggle("hidden",!open);
 $("accountMenuButton").setAttribute("aria-expanded",String(open));
}
function openAccountDialog(){
 $("accountMenu").classList.add("hidden");
 $("accountMenuButton").setAttribute("aria-expanded","false");
 $("newPassword").value="";
 $("confirmPassword").value="";
 $("passwordMessage").textContent="";
 $("accountDialog").showModal();
}
async function changePassword(ev){
 ev.preventDefault();
 const p1=$("newPassword").value;
 const p2=$("confirmPassword").value;
 const msg=$("passwordMessage");
 msg.textContent="";
 if(p1.length<8){msg.textContent=t("passwordTooShort");return}
 if(p1!==p2){msg.textContent=t("passwordMismatch");return}
 const submit=$("passwordForm").querySelector('button[type="submit"]');
 submit.disabled=true;
 try{
  const {error}=await db.auth.updateUser({password:p1});
  if(error)throw error;
  msg.textContent=t("passwordSaved");
  msg.style.color="#13865a";
  $("newPassword").value="";
  $("confirmPassword").value="";
  setTimeout(()=>{$("accountDialog").close();msg.style.color=""},700);
 }catch(e){
  console.error(e);
  msg.textContent=e.message||t("passwordUpdateError");
  msg.style.color="#b42318";
 }finally{
  submit.disabled=false;
 }
}
document.addEventListener("click",e=>{
 const wrap=document.querySelector(".account-menu-wrap");
 if(!wrap||wrap.contains(e.target))return;
 $("accountMenu")?.classList.add("hidden");
 $("accountMenuButton")?.setAttribute("aria-expanded","false");
});

function showLogin(){$("dashboard").classList.add("hidden");$("login").classList.remove("hidden")}
async function api(url,opt={}){const r=await fetch(url,{...opt,headers:{...(opt.headers||{}),"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`}});const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");return d}
async function load(){$("login").classList.add("hidden");$("dashboard").classList.remove("hidden");try{currentData=await api("/api/manager-roster");renderAll()}catch(e){alert(e.message)}}
function renderAll(){if(!currentData)return;renderHeader();renderTeams();document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));if(currentTeam){const fresh=currentData.teams.find(x=>x.id===currentTeam.id);if(fresh){currentTeam=fresh;renderSheet(fresh)}}}
function renderHeader(){const d=currentData;$("clubName").textContent=d.clubs.length===1?d.clubs[0].name:"My Clubs";$("managerEmail").textContent=d.manager_email||"";$("accountEmail").textContent=d.manager_email||"";$("accountDialogEmail").textContent=d.manager_email||"";$("teamCount").textContent=d.club_summary.teams;$("clubPlayerCount").textContent=d.club_summary.players;$("coachCount").textContent=d.club_summary.coaches;$("otherCount").textContent=d.club_summary.others}
function renderTeams(){const host=$("teams");host.innerHTML="";const order=["Men","Women","Mixed"];[...new Set(currentData.teams.map(x=>x.category))].sort((a,b)=>(order.indexOf(a)<0?99:order.indexOf(a))-(order.indexOf(b)<0?99:order.indexOf(b))).forEach(cat=>{const arr=currentData.teams.filter(x=>x.category===cat).sort((a,b)=>a.team_name.localeCompare(b.team_name));const s=document.createElement("section");s.className="category-block";s.innerHTML=`<div class="category-head"><h3>${esc(catLabel(cat))}</h3><span class="category-count">${arr.length} ${esc(arr.length===1?t("team"):t("teamsLabel"))}</span></div><div class="team-grid"></div>`;const g=s.querySelector(".team-grid");arr.forEach(team=>{const c=document.createElement("article");c.className="team-card";c.innerHTML=`<button class="team-open" type="button"><div><div class="team-label">${esc(catLabel(team.category))}</div><div class="team-name">${esc(team.team_name)}</div></div><div class="team-side"><strong>${team.players.length}</strong><span>${esc(t("players"))}</span><div class="arrow">→</div></div></button>`;c.querySelector("button").onclick=()=>openTeam(team);g.appendChild(c)});host.appendChild(s)})}
function openTeam(team){currentTeam=team;renderSheet(team);$("teamSheetDialog").showModal()}
function sortedPlayers(a){return[...a].sort((x,y)=>jersey(x.jersey_number)-jersey(y.jersey_number)||`${x.last_name} ${x.first_name}`.localeCompare(`${y.last_name} ${y.first_name}`))}
function jersey(v){if(v===null||v===undefined||v==="")return 9999;const n=parseInt(String(v).replace(/\D/g,""),10);return Number.isNaN(n)?9999:n}
function renderSheet(team){
 $("sheetCategory").textContent=catLabel(team.category);$("sheetTeamName").textContent=team.team_name;$("sheetClubName").textContent=team.managing_club_name||"";
 const logo=team.logo_url||team.club_logo_url||"/assets/isdo27-logo.png";$("sheetTeamLogo").src=logo;$("sheetTeamLogo").onerror=()=>{$("sheetTeamLogo").src="/assets/isdo27-logo.png"};
 const ps=sortedPlayers(team.players);$("sheetPlayerCount").textContent=ps.length;renderCoaches(team);renderLeader($("captainCard"),ps.find(x=>x.captain),t("captain"));renderLeader($("viceCaptainCard"),ps.find(x=>x.vice_captain),t("viceCaptain"));
 $("sheetRosterBody").innerHTML=ps.map(p=>`<tr class="roster-row" data-id="${p.id}"><td><strong>#${esc(p.jersey_number||"—")}</strong></td><td class="player-name">${esc(p.first_name)} ${esc(p.last_name)}</td><td>${p.captain?'<span class="badge role">C</span> ':''}${p.vice_captain?'<span class="badge role">VC</span> ':''}${p.is_team_coach?`<span class="badge role">${esc(t("coach"))}</span>`:""}</td><td><span class="badge ${p.registration_complete?"ok":"warn"}">${esc(p.registration_complete?t("complete"):t("incomplete"))}</span></td><td><span class="badge ${p.meals_complete?"ok":"warn"}">${esc(p.meals_complete?t("completed"):t("missing"))}</span></td></tr>`).join("");
 document.querySelectorAll("#sheetRosterBody .roster-row").forEach(r=>r.onclick=()=>{const p=ps.find(x=>x.id===r.dataset.id);openPlayer(team,p)});
}
function renderLeader(host,p,label){host.innerHTML=p?`<div class="leader-person"><div class="leader-number">#${esc(p.jersey_number||"—")}</div><div><div class="leader-name">${esc(p.first_name)} ${esc(p.last_name)}</div><span class="badge role">${esc(label)}</span></div></div>`:`<div class="leader-empty">${esc(t("notAssigned"))}</div>`}
function renderCoaches(team){const cs=team.coaches||[];$("coachCountLabel").textContent=cs.length?`(${cs.length})`:"";$("sheetCoaches").innerHTML=cs.length?cs.map(c=>`<span class="coach-chip">${esc(c.first_name)} ${esc(c.last_name)}<button type="button" data-id="${c.id}">×</button></span>`).join(""):`<span class="coach-empty">${esc(t("noCoach"))}</span>`;document.querySelectorAll("#sheetCoaches button").forEach(b=>b.onclick=async()=>{await api("/api/manager-roster",{method:"POST",body:JSON.stringify({action:"remove_coach_assignment",team_id:team.id,participant_id:b.dataset.id})});await load()});const s=$("coachCandidateSelect");s.innerHTML=`<option value="">${esc(t("selectCoach"))}</option>`;const used=new Set(cs.map(x=>x.id));(team.coach_candidates||[]).filter(x=>!used.has(x.id)).forEach(p=>s.add(new Option(`${p.last_name} ${p.first_name}${p.jersey_number?` · #${p.jersey_number}`:""}`,p.id)));$("addCoachButton").disabled=s.options.length<=1;$("coachActionMessage").textContent=""}
async function addCoach(){if(!currentTeam||!$("coachCandidateSelect").value)return;$("coachActionMessage").textContent=t("addingCoach");try{await api("/api/manager-roster",{method:"POST",body:JSON.stringify({action:"add_coach_assignment",team_id:currentTeam.id,participant_id:$("coachCandidateSelect").value})});await load()}catch(e){$("coachActionMessage").textContent=e.message}}
function openPlayer(team,p){selected={team,p};$("dCat").textContent=catLabel(team.category);$("dName").textContent=`${p.first_name} ${p.last_name}`;$("dTeam").textContent=team.team_name;$("dJersey").textContent=p.jersey_number||"—";$("dReg").textContent=p.registration_complete?t("complete"):t("incomplete");$("dMeals").textContent=p.meals_complete?t("completed"):t("missing");$("captainBtn").textContent=p.captain?t("removeCaptain"):t("setCaptain");$("viceBtn").textContent=p.vice_captain?t("removeVice"):t("setVice");$("coachBtn").textContent=p.is_team_coach?t("removeCoach"):t("setCoach");$("playerDialog").showModal()}
async function role(field){await api("/api/manager-membership",{method:"PATCH",body:JSON.stringify({membership_id:selected.p.membership_id,field,value:!selected.p[field]})});$("playerDialog").close();await load()}
async function toggleCoach(){await api("/api/manager-roster",{method:"POST",body:JSON.stringify({action:selected.p.is_team_coach?"remove_coach_assignment":"add_coach_assignment",team_id:selected.team.id,participant_id:selected.p.id})});$("playerDialog").close();await load()}
async function removeFromRoster(){if(!confirm(`Remove ${selected.p.first_name} ${selected.p.last_name} from ${selected.team.team_name}?`))return;await api("/api/manager-membership",{method:"DELETE",body:JSON.stringify({membership_id:selected.p.membership_id})});$("playerDialog").close();await load()}
function typeLabel(x){return x==="coach"?t("coach"):x==="other"?t("other"):t("player")}
function renderParticipants(){const list=$("participantList");const arr=(currentData.participants||[]).filter(p=>participantFilter==="all"||p.participant_type===participantFilter).sort((a,b)=>`${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));list.innerHTML=arr.map(p=>`<article class="participant-row"><div class="participant-main"><strong>${esc(p.first_name)} ${esc(p.last_name)}</strong><small>${esc(p.email||"")}</small></div><span class="badge role type-pill">${esc(typeLabel(p.participant_type))}</span><div class="teams-text">${esc((p.teams||[]).map(x=>`${catLabel(x.category)} · ${x.team_name}`).join(" | ")||"—")}</div><button class="edit-link" type="button" data-id="${p.id}">${esc(t("edit"))}</button></article>`).join("");document.querySelectorAll(".edit-link").forEach(b=>b.onclick=()=>openParticipantEdit(b.dataset.id))}
function openParticipantEdit(id){editingParticipant=currentData.participants.find(x=>x.id===id);if(!editingParticipant)return;$("participantEditName").textContent=`${editingParticipant.first_name} ${editingParticipant.last_name}`;$("peFirst").value=editingParticipant.first_name||"";$("peLast").value=editingParticipant.last_name||"";$("peEmail").value=editingParticipant.email||"";$("peJersey").value=editingParticipant.jersey_number||"";$("jerseyEditField").classList.toggle("hidden",editingParticipant.participant_type!=="player");$("participantTeams").innerHTML=(editingParticipant.teams||[]).length?(editingParticipant.teams||[]).map(x=>`<span class="team-tag">${esc(catLabel(x.category))} · ${esc(x.team_name)}${x.captain?" · C":""}${x.vice_captain?" · VC":""}</span>`).join(""):`<span class="muted">${esc(t("notAssigned"))}</span>`;renderParticipantMeals(editingParticipant);$("participantEditMessage").textContent="";$("participantEditDialog").showModal()}
function prefOptions(selected,allowBlank=false){const vals=["chicken","beef_pork","fish_seafood","vegetarian"];return `${allowBlank?'<option value="">—</option>':""}${vals.map(v=>`<option value="${v}" ${v===selected?"selected":""}>${esc(t(v))}</option>`).join("")}`}
function renderParticipantMeals(p){$("participantMeals").innerHTML=currentData.meal_days.map(day=>{const m=(p.meals||[]).find(x=>x.meal_day_id===day.id)||{meal_type:"none"};return `<div class="meal-edit-card" data-day="${day.id}"><h4>${esc(day.name)}</h4><div class="meal-grid"><select class="meal-type"><option value="none" ${m.meal_type==="none"?"selected":""}>${esc(t("noMeal"))}</option><option value="sandwich" ${m.meal_type==="sandwich"?"selected":""}>${esc(t("sandwich"))}</option><option value="hot" ${m.meal_type==="hot"?"selected":""}>${esc(t("hotMeal"))}</option></select><select class="sandwich-choice">${currentData.sandwich_options.map(o=>`<option value="${o.id}" ${o.id===m.sandwich_option_id?"selected":""}>${esc(o.name)}</option>`).join("")}</select><div class="hot-prefs"><select class="hot-p1">${prefOptions(m.hot_preference_1||"chicken")}</select><select class="hot-p2">${prefOptions(m.hot_preference_2||"",true)}</select></div></div></div>`}).join("");document.querySelectorAll(".meal-edit-card").forEach(card=>{const type=card.querySelector(".meal-type"),sand=card.querySelector(".sandwich-choice"),hot=card.querySelector(".hot-prefs");const sync=()=>{sand.style.display=type.value==="sandwich"?"block":"none";hot.style.display=type.value==="hot"?"grid":"none"};type.onchange=sync;sync()})}
async function saveParticipant(ev){ev.preventDefault();if(!editingParticipant)return;const meals=[...document.querySelectorAll(".meal-edit-card")].map(card=>{const type=card.querySelector(".meal-type").value;return{meal_day_id:card.dataset.day,meal_type:type,sandwich_option_id:type==="sandwich"?card.querySelector(".sandwich-choice").value:null,hot_preference_1:type==="hot"?card.querySelector(".hot-p1").value:null,hot_preference_2:type==="hot"?card.querySelector(".hot-p2").value:null}});$("participantEditMessage").textContent=t("saving");try{await api("/api/manager-roster",{method:"POST",body:JSON.stringify({action:"update_participant",participant_id:editingParticipant.id,first_name:$("peFirst").value.trim(),last_name:$("peLast").value.trim(),email:$("peEmail").value.trim(),jersey_number:editingParticipant.participant_type==="player"?($("peJersey").value.trim()||null):null,meals})});$("participantEditMessage").textContent=t("saved");await load();editingParticipant=currentData.participants.find(x=>x.id===editingParticipant.id);renderParticipants();setTimeout(()=>{$("participantEditDialog").close()},350)}catch(e){$("participantEditMessage").textContent=e.message}}
async function imgData(url){try{const r=await fetch(url);if(!r.ok)throw 0;const b=await r.blob();return await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(b)})}catch{return null}}
async function exportPdf(){
 if(!currentTeam)return;
 try{
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  const W=210,H=297,M=12,CONTENT=W-2*M;
  const ps=sortedPlayers(currentTeam.players||[]);
  const cap=ps.find(p=>p.captain);
  const vc=ps.find(p=>p.vice_captain);
  const coaches=(currentTeam.coaches||[]).map(c=>`${c.first_name} ${c.last_name}`);
  const [eventLogo,teamLogo]=await Promise.all([
   imgData("/assets/isdo27-logo.png"),
   imgData(currentTeam.logo_url||currentTeam.club_logo_url||"/assets/isdo27-logo.png")
  ]);

  // ===== EVENT HEADER — unchanged =====
  doc.setFillColor(15,20,29);
  doc.rect(0,0,W,48,"F");
  doc.setFillColor(239,49,84);
  doc.rect(0,45,W,3,"F");

  if(eventLogo){
   doc.setFillColor(255,255,255);
   doc.roundedRect(M,7,29,29,3,3,"F");
   doc.addImage(eventLogo,"PNG",M+2,9,25,25);
  }

  doc.setFont("helvetica","bold");
  doc.setTextColor(239,49,84);
  doc.setFontSize(7.5);
  doc.text("INTERNATIONAL SHARKS DODGEBALL OPEN",46,11);

  doc.setTextColor(255,255,255);
  doc.setFontSize(20);
  doc.text("ISDO 2027",46,20);

  doc.setFont("helvetica","normal");
  doc.setFontSize(8.5);
  doc.setTextColor(199,207,221);
  doc.text("26–28 March 2027  ·  Beausobre, Morges  ·  Switzerland",46,27);

  doc.setFont("helvetica","bold");
  doc.setFontSize(8);
  doc.setTextColor(255,255,255);
  doc.text("OFFICIAL TEAM ROSTER",46,35);

  // ===== TEAM IDENTITY — unchanged =====
  let y=55;
  doc.setFillColor(248,249,252);
  doc.setDrawColor(226,231,239);
  doc.roundedRect(M,y,CONTENT,31,4,4,"FD");

  if(teamLogo){
   doc.setFillColor(255,255,255);
   doc.roundedRect(M+4,y+4,23,23,3,3,"F");
   doc.addImage(teamLogo,"PNG",M+6,y+6,19,19);
  }

  const teamTextX=M+32;
  doc.setFont("helvetica","bold");
  doc.setFontSize(8);
  doc.setTextColor(64,86,180);
  doc.text(catLabel(currentTeam.category).toUpperCase(),teamTextX,y+8);

  doc.setFontSize(17);
  doc.setTextColor(17,24,39);
  doc.text(doc.splitTextToSize(currentTeam.team_name,100),teamTextX,y+17);

  doc.setFont("helvetica","normal");
  doc.setFontSize(8.5);
  doc.setTextColor(102,112,133);
  if(currentTeam.managing_club_name){
   doc.text(currentTeam.managing_club_name,teamTextX,y+25);
  }

  doc.setFillColor(238,242,255);
  doc.roundedRect(164,y+7,29,17,3,3,"F");
  doc.setFont("helvetica","bold");
  doc.setFontSize(15);
  doc.setTextColor(64,86,180);
  doc.text(String(ps.length),178.5,y+15,{align:"center"});
  doc.setFontSize(6.5);
  doc.setTextColor(102,112,133);
  doc.text(t("players").toUpperCase(),178.5,y+20,{align:"center"});

  y+=36;

  // ===== COACHES — more compact =====
  doc.setFillColor(244,246,255);
  doc.setDrawColor(226,231,239);
  doc.roundedRect(M,y,CONTENT,13,2.5,2.5,"FD");
  doc.setFont("helvetica","bold");
  doc.setFontSize(6.5);
  doc.setTextColor(64,86,180);
  doc.text(t("coaches").toUpperCase(),M+4,y+4.5);

  doc.setFont("helvetica","normal");
  doc.setFontSize(8.8);
  doc.setTextColor(17,24,39);
  const coachText=coaches.length?coaches.join("  ·  "):"—";
  doc.text(doc.splitTextToSize(coachText,CONTENT-8)[0],M+4,y+9.7);
  y+=17;

  // ===== CAPTAIN / VICE-CAPTAIN — compact line cards =====
  const gap=4,boxW=(CONTENT-gap)/2,boxH=13;
  const drawLeader=(x,label,p,accent)=>{
   doc.setFillColor(255,255,255);
   doc.setDrawColor(226,231,239);
   doc.roundedRect(x,y,boxW,boxH,2.5,2.5,"FD");
   doc.setFillColor(...accent);
   doc.roundedRect(x,y,2,boxH,1,1,"F");

   doc.setFont("helvetica","bold");
   doc.setFontSize(6.2);
   doc.setTextColor(102,112,133);
   doc.text(label.toUpperCase(),x+5.5,y+4.4);

   doc.setFontSize(9.2);
   doc.setTextColor(17,24,39);
   const who=p?`#${p.jersey_number||"—"}  ${p.first_name} ${p.last_name}`:"—";
   doc.text(doc.splitTextToSize(who,boxW-9)[0],x+5.5,y+9.7);
  };
  drawLeader(M,t("captain"),cap,[112,87,216]);
  drawLeader(M+boxW+gap,t("viceCaptain"),vc,[64,86,180]);
  y+=18;

  // ===== ROSTER TITLE — lighter =====
  doc.setFont("helvetica","bold");
  doc.setFontSize(10.8);
  doc.setTextColor(17,24,39);
  doc.text(t("fullRoster"),M,y);

  doc.setFont("helvetica","normal");
  doc.setFontSize(7);
  doc.setTextColor(102,112,133);
  doc.text(`${ps.length} ${t("players")}`,W-M,y,{align:"right"});
  y+=3.5;

  // ===== ROSTER — more readable + polished roles =====
  const body=ps.map(p=>{
   let role="";
   if(p.captain) role="C";
   if(p.vice_captain) role=role?`${role}  ·  VC`:"VC";
   if(p.is_team_coach) role=role?`${role}  ·  ${t("coach")}`:t("coach");
   return [p.jersey_number||"—",`${p.first_name} ${p.last_name}`,role||""];
  });

  const rowCount=body.length;
  const fontSize=rowCount>20?7.1:rowCount>17?7.6:rowCount>14?8.0:8.45;
  const pad=rowCount>20?1.35:rowCount>17?1.55:1.8;

  doc.autoTable({
   startY:y,
   head:[["#",t("player"),t("role")]],
   body,
   margin:{left:M,right:M,bottom:15},
   theme:"plain",
   styles:{
    font:"helvetica",
    fontSize,
    cellPadding:{top:pad,bottom:pad,left:2.5,right:2.5},
    textColor:[17,24,39],
    lineColor:[231,234,240],
    lineWidth:{bottom:.18},
    valign:"middle"
   },
   headStyles:{
    fillColor:[23,28,38],
    textColor:[255,255,255],
    fontStyle:"bold",
    fontSize:7.1,
    cellPadding:{top:2.2,bottom:2.2,left:2.5,right:2.5}
   },
   alternateRowStyles:{fillColor:[248,249,251]},
   columnStyles:{
    0:{cellWidth:15,fontStyle:"bold",halign:"center",textColor:[38,45,59]},
    1:{cellWidth:116,fontStyle:"bold"},
    2:{cellWidth:CONTENT-15-116,halign:"left",fontStyle:"bold",textColor:[64,86,180]}
   },
   didParseCell:(data)=>{
    if(data.section==="body"&&data.column.index===2){
     const val=String(data.cell.raw||"");
     if(val==="C"){
      data.cell.styles.fillColor=[255,238,243];
      data.cell.styles.textColor=[201,31,67];
      data.cell.styles.halign="center";
     }else if(val==="VC"){
      data.cell.styles.fillColor=[240,237,255];
      data.cell.styles.textColor=[112,87,216];
      data.cell.styles.halign="center";
     }else if(val.includes(t("coach"))){
      data.cell.styles.fillColor=[238,242,255];
      data.cell.styles.textColor=[64,86,180];
      data.cell.styles.halign="center";
     }else if(!val){
      data.cell.text=[""];
     }
    }
   }
  });

  // ===== FOOTER =====
  doc.setDrawColor(220,224,232);
  doc.line(M,286,W-M,286);
  doc.setFont("helvetica","normal");
  doc.setFontSize(6.8);
  doc.setTextColor(112,121,139);
  doc.text("ISDO 2027  ·  International Sharks Dodgeball Open",M,291);
  doc.text(`${catLabel(currentTeam.category)}  ·  ${currentTeam.team_name}`,W-M,291,{align:"right"});

  const filename=`ISDO2027_${currentTeam.category}_${currentTeam.team_name}`
   .replace(/[^a-z0-9_-]+/gi,"_")+".pdf";
  doc.save(filename);

 }catch(e){
  console.error(e);
  alert(t("pdfError"));
 }
}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}