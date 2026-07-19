const test = require("node:test");
const assert = require("node:assert/strict");
const { handler } = require("../netlify/functions/generate.js");

test("rejects non-POST methods", async () => {
  const res = await handler({ httpMethod: "GET" });
  assert.equal(res.statusCode, 405);
});

test("returns 500 with a clear message when GEMINI_API_KEY is missing", async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const res = await handler({
    httpMethod: "POST",
    body: JSON.stringify({ prompt: "hello" })
  });

  assert.equal(res.statusCode, 500);
  assert.match(JSON.parse(res.body).error, /GEMINI_API_KEY/);

  if (original !== undefined) process.env.GEMINI_API_KEY = original;
});

test("returns 400 for invalid JSON body", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const res = await handler({ httpMethod: "POST", body: "{not valid json" });
  assert.equal(res.statusCode, 400);
});

test("returns 400 when 'prompt' is missing", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const res = await handler({ httpMethod: "POST", body: JSON.stringify({}) });
  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(res.body).error, /prompt/);
});
