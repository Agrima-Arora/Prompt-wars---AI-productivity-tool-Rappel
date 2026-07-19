// netlify/functions/generate.js
//
// Server-side proxy for the Rappel dashboard's Gemini calls.
// The API key lives ONLY here, as a Netlify environment variable
// (Site settings -> Environment variables -> GEMINI_API_KEY).
// It is never present in the repo, never sent to the browser, and
// therefore safe to have this project public on GitHub.
//
// Anyone who opens the deployed site gets working AI immediately —
// no personal API key required on their end.

const GEMINI_MODEL = "gemini-2.5-flash";

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "GEMINI_API_KEY is not set on the server. Add it in Netlify: Site settings -> Environment variables."
      })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { prompt, systemInstruction, jsonMode } = payload;
  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing 'prompt'" }) };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      ...(jsonMode ? { responseMimeType: "application/json" } : {})
    }
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return { statusCode: resp.status, body: JSON.stringify({ error: errText }) };
    }

    const data = await resp.json();
    const candidate = data.candidates && data.candidates[0];

    if (candidate && candidate.finishReason === "SAFETY") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "" })
      };
    }

    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    const text = parts.map((p) => p.text || "").join("").trim();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: String(err) }) };
  }
};
