const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("netlify.toml functions path actually contains the deployed function", () => {
  const toml = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
  const match = toml.match(/functions\s*=\s*"([^"]+)"/);
  assert.ok(match, "netlify.toml should declare a functions directory");

  const functionsDir = path.join(root, match[1]);
  assert.ok(
    fs.existsSync(functionsDir) && fs.statSync(functionsDir).isDirectory(),
    `functions directory "${match[1]}" declared in netlify.toml must exist`
  );

  const files = fs.readdirSync(functionsDir);
  assert.ok(
    files.some((f) => f.endsWith(".js")),
    `functions directory "${match[1]}" should contain at least one function file`
  );
});

test("index2.html defines an escapeHtml helper used to sanitize AI/user text before innerHTML", () => {
  const html = fs.readFileSync(path.join(root, "index2.html"), "utf8");
  assert.match(html, /function escapeHtml\s*\(/);
});

test("core pages exist and declare a language + title", () => {
  for (const page of ["index.html", "index2.html"]) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(html, /<html[^>]+lang="en"/i, `${page} should declare lang="en"`);
    assert.match(html, /<title>[^<]+<\/title>/i, `${page} should have a <title>`);
  }
});
