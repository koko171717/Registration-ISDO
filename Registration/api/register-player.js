import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RESEND_API_KEY =
  process.env.isdo_registration_RESEND_API_KEY ||
  process.env.RESEND_API_KEY;

const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "ISDO'27 <onboarding@resend.dev>";

const RESEND_REPLY_TO =
  process.env.RESEND_REPLY_TO || "";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: "Server configuration is incomplete."
    });
  }

  const p = req.body || {};

  const player = p.player || {};

  const memberships = Array.isArray(p.memberships)
    ? p.memberships
    : [];

  const meals = Array.isArray(p.meals)
    ? p.meals
    : [];

  const legal = Array.isArray(p.legal_acceptances)
    ? p.legal_acceptances
    : [];

  try {
    for (const field of [
      "first_name",
      "last_name",
      "birth_date",
      "nationality",
      "email",
      "origin_club_id"
    ]) {
      if (!player[field]) {
        throw bad("Missing field: " + field);
      }
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        player.email
      )
    ) {
      throw bad("Invalid email address.");
    }

    if (
      memberships.length < 1 ||
      memberships.length > 2
    ) {
      throw bad(
        "One or two team memberships are required."
      );
    }

    const teams = await select(
      "teams",
      `select=id,category_id,active&id=in.(${memberships
        .map(x => encodeURIComponent(x.team_id))
        .join(",")})`
    );

    if (teams.length !== memberships.length) {
      throw bad("Invalid team selection.");
    }

    if (
      new Set(
        teams.map(team => team.category_id)
      ).size !== teams.length
    ) {
      throw bad(
        "The two categories must be different."
      );
    }

    for (const membership of memberships) {
      const access = await select(
        "team_origin_club_access",
        `select=id&team_id=eq.${encodeURIComponent(
          membership.team_id
        )}&origin_club_id=eq.${encodeURIComponent(
          player.origin_club_id
        )}`
      );

      if (!access.length) {
        throw bad(
          "A selected team is not available for this club of origin."
        );
      }
    }

    const docs = await select(
      "legal_documents",
      "select=id&active=eq.true"
    );

    if (!docs.length) {
      throw bad(
        "Legal documents are not configured."
      );
    }

    const accepted = new Set(
      legal
        .filter(item => item.accepted)
        .map(item => item.legal_document_id)
    );

    if (
      docs.some(
        document => !accepted.has(document.id)
      )
    ) {
      throw bad(
        "All legal documents must be accepted."
      );
    }

    const created = await insert(
      "players",
      {
        ...player,
        registration_status: "complete",
        updated_at: new Date().toISOString()
      },
      true
    );

    const playerId = created.id;

    try {
      await insert(
        "player_team_memberships",
        memberships.map(membership => ({
          player_id: playerId,
          team_id: membership.team_id,
          membership_order:
            membership.membership_order,
          captain: false,
          vice_captain: false
        }))
      );

      if (meals.length) {
        await insert(
          "player_meals",
          meals.map(meal => ({
            player_id: playerId,
            meal_day_id: meal.meal_day_id,
            sandwich_option_id:
              meal.ordered
                ? meal.sandwich_option_id
                : null,
            ordered: !!meal.ordered
          }))
        );
      }

      await insert(
        "player_legal_acceptances",
        legal.map(item => ({
          player_id: playerId,
          legal_document_id:
            item.legal_document_id,
          accepted: true,
          accepted_at:
            new Date().toISOString()
        }))
      );

      const editToken =
        crypto
          .randomBytes(32)
          .toString("base64url");

      const tokenHash =
        hashToken(editToken);

      await insert(
        "player_edit_tokens",
        {
          player_id: playerId,
          token_hash: tokenHash
        }
      );

      const editUrl =
        `${siteOrigin(req)}/edit.html?token=${encodeURIComponent(
          editToken
        )}`;

      /*
       * L'inscription est déjà enregistrée
       * avant l'envoi du mail.
       *
       * Si Resend échoue, l'inscription
       * reste totalement valide.
       */
      let emailSent = false;

      try {
        emailSent =
          await sendConfirmationEmail({
            to: player.email,
            firstName: player.first_name,
            editUrl
          });
      } catch (emailError) {
        console.error(
          "ISDO confirmation email failed:",
          emailError
        );
      }

      return res.status(200).json({
        ok: true,
        player_id: playerId,
        edit_url: editUrl,
        email_sent: emailSent
      });

    } catch (err) {
      await del(
        "players",
        `id=eq.${encodeURIComponent(
          playerId
        )}`
      );

      throw err;
    }

  } catch (err) {
    return res
      .status(err.statusCode || 400)
      .json({
        error:
          err.message ||
          "Registration could not be saved."
      });
  }
}

function siteOrigin(req) {
  const proto =
    (
      req.headers["x-forwarded-proto"] ||
      "https"
    )
      .split(",")[0]
      .trim();

  const host =
    (
      req.headers["x-forwarded-host"] ||
      req.headers.host ||
      "registration-isdo.vercel.app"
    )
      .split(",")[0]
      .trim();

  return `${proto}://${host}`;
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

async function sendConfirmationEmail({
  to,
  firstName,
  editUrl
}) {
  if (!RESEND_API_KEY) {
    console.warn(
      "RESEND API key is missing. Registration saved without email."
    );

    return false;
  }

  const body = {
    from: RESEND_FROM_EMAIL,
    to: [to],
    subject:
      "ISDO'27 – Registration confirmed",
    html: confirmationEmailHtml({
      firstName,
      editUrl
    })
  };

  if (RESEND_REPLY_TO) {
    body.reply_to =
      RESEND_REPLY_TO;
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        Authorization:
          `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    let details = "";

    try {
      details =
        JSON.stringify(
          await response.json()
        );
    } catch {
      details =
        await response.text();
    }

    throw new Error(
      `Resend returned ${response.status}: ${details}`
    );
  }

  return true;
}

function confirmationEmailHtml({
  firstName,
  editUrl
}) {
  const safeFirstName =
    htmlEscape(firstName);

  const safeEditUrl =
    htmlEscape(editUrl);

  return `
<!doctype html>

<html>

<head>

  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >

</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f4f5f7;
    font-family:Arial,Helvetica,sans-serif;
    color:#171923;
  "
>

<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
  style="
    background:#f4f5f7;
    padding:28px 12px;
  "
>

<tr>

<td align="center">

<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
  style="
    max-width:620px;
    background:#ffffff;
    border-radius:16px;
    overflow:hidden;
    border:1px solid #e5e7eb;
  "
>

<tr>

<td
  style="
    padding:30px 30px 10px;
  "
>

<div
  style="
    font-size:12px;
    letter-spacing:1.2px;
    text-transform:uppercase;
    font-weight:700;
    color:#e52d4d;
  "
>

International Sharks Dodgeball Open

</div>

<h1
  style="
    margin:10px 0 0;
    font-size:28px;
    line-height:1.2;
  "
>

Registration confirmed ✓

</h1>

</td>

</tr>

<tr>

<td
  style="
    padding:10px 30px 30px;
    font-size:16px;
    line-height:1.6;
  "
>

<p style="margin:0 0 16px;">

Hi ${safeFirstName},

</p>

<p style="margin:0 0 16px;">

Your player registration for
<strong>ISDO'27</strong>
has been saved successfully.

</p>

<p style="margin:0 0 22px;">

Keep the private link below.

You can use it later to update
your personal information,
teams or lunch choices
without creating an account.

</p>

<p
  style="
    margin:0 0 26px;
    text-align:center;
  "
>

<a
  href="${safeEditUrl}"
  style="
    display:inline-block;
    background:#e52d4d;
    color:#ffffff;
    text-decoration:none;
    font-weight:700;
    padding:13px 22px;
    border-radius:10px;
  "
>

Edit my registration

</a>

</p>

<p
  style="
    margin:0 0 8px;
    font-size:13px;
    color:#6b7280;
  "
>

If the button does not work,
copy this link:

</p>

<p
  style="
    margin:0 0 22px;
    font-size:13px;
    line-height:1.5;
    word-break:break-all;
  "
>

<a
  href="${safeEditUrl}"
  style="color:#4254a3;"
>

${safeEditUrl}

</a>

</p>

<div
  style="
    padding:14px 16px;
    background:#fff7e8;
    border-radius:10px;
    font-size:13px;
    line-height:1.5;
    color:#7a4a00;
  "
>

<strong>
Keep this link private.
</strong>

Anyone who has it
can modify your registration.

</div>

<p
  style="
    margin:24px 0 0;
    color:#6b7280;
    font-size:13px;
  "
>

International Sharks Dodgeball Open
· Morges, Switzerland

</p>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
`;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function headers() {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization:
      `Bearer ${SERVICE_ROLE_KEY}`
  };
}

async function select(
  table,
  query
) {
  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?${query}`,
      {
        headers: headers()
      }
    );

  if (!response.ok) {
    throw await er(response);
  }

  return response.json();
}

async function insert(
  table,
  body,
  single = false
) {
  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${table}`,
      {
        method: "POST",
        headers: {
          ...headers(),
          "Content-Type":
            "application/json",
          Prefer:
            single
              ? "return=representation"
              : "return=minimal"
        },
        body:
          JSON.stringify(body)
      }
    );

  if (!response.ok) {
    throw await er(response);
  }

  if (single) {
    return (
      await response.json()
    )[0];
  }
}

async function del(
  table,
  query
) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${query}`,
    {
      method: "DELETE",
      headers: headers()
    }
  );
}

async function er(response) {
  let data = {};

  try {
    data =
      await response.json();
  } catch {}

  const error =
    new Error(
      data.message ||
      data.error ||
      "Database request failed."
    );

  error.statusCode =
    response.status >= 500
      ? 500
      : 400;

  return error;
}

function bad(message) {
  const error =
    new Error(message);

  error.statusCode = 400;

  return error;
}
