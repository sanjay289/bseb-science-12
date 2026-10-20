// Smoke test: runs app.js with a stub DOM and visits every route, answering every quiz.
// Run: node tools/smoke-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = path.join(__dirname, '..', 'app/src/main/assets');
const els = {};
const el = id => els[id] || (els[id] = { id, style: {}, textContent: '', innerHTML: '', href: '' });
const listeners = {};
const ctx = {
  SUBJECTS: [], console, Math, Date, JSON, String, Array, Set,
  localStorage: { d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = String(v); } },
  location: { hash: '' },
  document: { getElementById: el, documentElement: {} },
  window: { addEventListener: (e, f) => (listeners[e] = f), scrollTo() {} },
  setInterval: () => 1, clearInterval() {},
};
ctx.Android = ctx.window.Android = { share: t => (ctx.shared = t) };
vm.createContext(ctx);
for (const f of ['physics', 'chemistry', 'biology', 'math']) vm.runInContext(fs.readFileSync(`${A}/data/${f}.js`, 'utf8'), ctx);
vm.runInContext(fs.readFileSync(`${A}/app.js`, 'utf8'), ctx);
const run = c => vm.runInContext(c, ctx);
const go = h => { ctx.location.hash = h; listeners.hashchange(); const out = el('app').innerHTML; if (!out || /undefined|NaN|\[object/.test(out)) throw new Error(`bad render at ${h}: ${out.slice(0, 300)}`); return out; };
let pages = 0, answered = 0;
for (const lang of ['hi', 'en']) {
  if (run('lang') !== lang) run('toggleLang()');
  for (const h of ['#/', '#/mock', '#/tips']) { go(h); pages++; }
  for (const s of ctx.SUBJECTS) {
    go(`#/s/${s.id}`); pages++;
    const parts = s.ch.map((_, i) => String(i)).concat('mock');
    for (const p of parts) {
      if (p !== 'mock') { go(`#/s/${s.id}/${p}`); pages++; }
      go(`#/quiz/${s.id}/${p}`);
      let n = 0;
      while (run('quiz.i < quiz.qs.length')) {
        run(`pick(${n++ % 4})`); answered++;
        if (!el('app').innerHTML.includes('explain')) throw new Error('no explanation shown');
        run('next()');
      }
      const res = el('app').innerHTML;
      if (!res.includes('class="big"')) throw new Error(`no result for ${s.id}/${p}`);
      run('shareScore(1,2)'); pages++;
    }
  }
}
go('#/s/nope'); go('#/quiz/phy/999'); go('#/garbage');
console.log(`OK: ${pages} pages rendered, ${answered} answers clicked, best=${Object.keys(JSON.parse(ctx.localStorage.d.best)).length} keys, share="${ctx.shared}"`);
