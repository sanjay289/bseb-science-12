// Validates content in app/src/main/assets/data/*.js. Run: node tools/check-data.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'app/src/main/assets/data');
const files = ['physics.js', 'chemistry.js', 'biology.js', 'math.js'];
const ctx = { SUBJECTS: [] };
vm.createContext(ctx);
let errors = 0;
const err = (where, msg) => { errors++; console.log(`ERROR ${where}: ${msg}`); };
const isStr = x => typeof x === 'string' && x.trim() !== '';
const isText = x => isStr(x) || (Array.isArray(x) && x.length === 2 && isStr(x[0]) && isStr(x[1]));
// A plain string is shown in both languages, so it must not contain Devanagari.
const hindiOnly = x => typeof x === 'string' && /[\u0900-\u097F]/.test(x);
const hasHtml = x => /<[a-z/]/i.test(Array.isArray(x) ? x.join(' ') : x);

for (const f of files) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) { err(f, 'missing'); continue; }
  try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); } catch (e) { err(f, e.message); }
}
let total = 0;
for (const s of ctx.SUBJECTS) {
  if (!isStr(s.id) || !isText(s.t) || !Array.isArray(s.ch)) { err(s.id, 'bad subject header'); continue; }
  let nq = 0;
  s.ch.forEach((c, i) => {
    const w = `${s.id} ch${i + 1}`;
    if (!isText(c.t)) err(w, 'bad title');
    if (!Array.isArray(c.n) || c.n.length < 4) err(w, 'too few notes');
    (c.n || []).forEach((n, k) => { if (!isText(n)) err(`${w} note${k + 1}`, 'bad text'); if (hindiOnly(n)) err(`${w} note${k + 1}`, 'Hindi-only plain string'); if (hasHtml(n)) err(`${w} note${k + 1}`, 'html'); });
    if (!Array.isArray(c.q) || c.q.length < 5) err(w, 'too few questions');
    const seen = new Set();
    (c.q || []).forEach((q, k) => {
      const wq = `${w} q${k + 1}`;
      if (!Array.isArray(q) || q.length !== 4) return err(wq, 'must be [q, opts, ans, ex]');
      const [qq, opts, ans, ex] = q;
      if (!isText(qq)) err(wq, 'bad question');
      [qq, ex, ...(Array.isArray(opts) ? opts : [])].forEach(x => { if (hindiOnly(x)) err(wq, `Hindi-only plain string, use [hi, en]: ${x}`); });
      if (!Array.isArray(opts) || opts.length !== 4 || !opts.every(isText)) err(wq, 'need 4 text options');
      else {
        const keys = opts.map(o => JSON.stringify(o));
        if (new Set(keys).size !== 4) err(wq, 'duplicate options');
        if (opts.some(o => /all of the|both a|a and b|a and c|none of the above|उपर्युक्त|\(a\)|\(b\)/i.test(Array.isArray(o) ? o[1] + o[0] : o))) err(wq, 'option refers to other options by position (options are shuffled)');
      }
      if (![0, 1, 2, 3].includes(ans)) err(wq, 'answer index must be 0-3');
      if (!isText(ex)) err(wq, 'bad explanation');
      const key = JSON.stringify(qq);
      if (seen.has(key)) err(wq, 'duplicate question');
      seen.add(key);
    });
    nq += (c.q || []).length;
  });
  total += nq;
  console.log(`${s.id}: ${s.ch.length} chapters, ${nq} questions`);
}
console.log(`total ${total} questions, ${errors} errors`);
process.exit(errors ? 1 : 0);
