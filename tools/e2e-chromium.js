// End-to-end test: drives the real index.html in headless Chromium over the DevTools protocol.
// Run: node tools/e2e-chromium.js   (needs `chromium` on PATH; uses Node's built-in WebSocket)
const { spawn } = require('child_process'), path = require('path'), http = require('http');
const url = 'file://' + path.join(__dirname, '..', 'app/src/main/assets/index.html');
const port = 9333;
const chrome = spawn(process.env.CHROME || 'chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`,
  '--allow-file-access-from-files', '--window-size=412,900', `--user-data-dir=${require('os').tmpdir()}/e2e-prof-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej));
let ws, id = 0; const pending = {}, errors = [];
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(expr + ': ' + r.result.exceptionDetails.text); return r.result.result.value; };
const results = [];
const check = (req, ok, detail) => { results.push([ok ? 'PASS' : 'FAIL', req, detail]); };
const load = async () => { await send('Page.navigate', { url }); await sleep(1500); };
const go = async h => { await ev(`location.hash=${JSON.stringify(h)}`); await sleep(150); };
const text = () => ev('document.getElementById("app").innerText');

(async () => {
  let tabs;
  for (let i = 0; i < 40; i++) { try { tabs = await getJSON(`http://127.0.0.1:${port}/json`); break; } catch (e) { await sleep(500); } }
  ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.text);
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push(d.params.entry.text); };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await load();

  // R1: 4 science subjects load from separate data files.
  const subj = await ev('SUBJECTS.map(s => s.id + ":" + s.ch.length + ":" + s.ch.reduce((a,c)=>a+c.q.length,0)).join(",")');
  check('4 subjects (Phy/Chem/Bio/Maths) load from data/*.js', subj === 'phy:14:140,chem:10:120,bio:13:130,math:13:130', subj);
  // R2: Hindi default UI.
  const home = await text();
  check('Hindi is the default language, home shows 4 subject cards', /भौतिकी/.test(home) && /रसायन/.test(home) && /जीव विज्ञान/.test(home) && /गणित/.test(home) && await ev('document.querySelectorAll(".grid a.card").length') === 4, home.split('\n').slice(0, 6).join(' | '));
  // R3: navigation via real click on subject card -> chapter list -> chapter notes.
  await ev('document.querySelector(".grid a.card").click()'); await sleep(200);
  check('Clicking Physics card opens 14-chapter list', await ev('location.hash') === '#/s/phy' && await ev('document.querySelectorAll("a.card .num").length') === 14, await ev('location.hash'));
  await ev('document.querySelectorAll("a.card")[13].click()'); await sleep(200);
  const ch14 = await text();
  check('Chapter page shows notes + quiz button (last chapter: no "next")', /अर्धचालक/.test(ch14) && /अभ्यास प्रश्न शुरू करें/.test(ch14) && !/अगला अध्याय/.test(ch14), ch14.split('\n')[0]);
  // R4: header back arrow is visible on inner pages and hidden at home.
  check('Back arrow visible on inner page', await ev('getComputedStyle(document.getElementById("back")).display') !== 'none', '');
  // R5: quiz by real clicks: correct-answer flow, explanation, scoring, result, review of wrong answers.
  await go('#/quiz/math/0');
  let correct = 0, wrong = 0;
  for (let i = 0; i < 10; i++) {
    const ans = await ev('quiz.qs[quiz.i][2]');
    const pick = i < 6 ? ans : (ans + 1) % 4; // 6 right, 4 wrong
    await ev(`document.querySelectorAll("button.opt")[${pick}].click()`); await sleep(60);
    const st = await ev('[document.querySelectorAll(".opt.right").length, document.querySelectorAll(".opt.wrong").length, !!document.querySelector(".explain")]');
    if (i < 6 && st[0] === 1 && st[1] === 0 && st[2]) correct++;
    if (i >= 6 && st[0] === 1 && st[1] === 1 && st[2]) wrong++;
    await ev('document.querySelectorAll("button.opt")[0].click()'); // second click must be ignored
    await ev('[...document.querySelectorAll("button.btn")].pop().click()'); await sleep(60);
  }
  const res = await text();
  check('Quiz marks right/wrong, shows explanation, ignores re-clicks', correct === 6 && wrong === 4, `right-marked ${correct}/6, wrong-marked ${wrong}/4`);
  check('Result shows 6/10 = 60% and reviews 4 wrong answers', /6\/10/.test(res) && /60%/.test(res) && await ev('document.querySelectorAll(".review").length') === 4, res.split('\n').slice(0, 3).join(' | '));
  // R6: best score persists across a real page reload (localStorage).
  await go('#/s/math');
  await load(); await go('#/s/math');
  check('Best score persists after reload', /सर्वश्रेष्ठ 60%/.test(await text()), (await text()).split('\n').slice(1, 3).join(' | '));
  // R7: English toggle persists across reload and translates options (no Devanagari in English quiz screens).
  await ev('document.getElementById("langBtn").click()'); await sleep(150);
  await load();
  let devInEnglish = 0, screens = 0;
  for (const s of ['phy', 'chem', 'bio', 'math']) {
    const n = await ev(`subj("${s}").ch.length`);
    for (let c = 0; c < n; c++) {
      await go(`#/s/${s}/${c}`); if (/[\u0900-\u097F]/.test(await text())) devInEnglish++; screens++;
      await go(`#/quiz/${s}/${c}`);
      while (await ev('quiz.i < quiz.qs.length')) {
        await ev('document.querySelectorAll("button.opt")[0].click()');
        if (/[\u0900-\u097F]/.test(await text())) { devInEnglish++; errors.push(`Devanagari in English mode at ${s}/${c}: ${(await text()).slice(0, 120)}`); }
        screens++;
        await ev('next()');
      }
    }
  }
  check('English mode persists after reload', await ev('lang') === 'en' && await ev('document.getElementById("langBtn").textContent') === 'हिंदी', await ev('lang'));
  check('Every chapter + every question/answer/explanation screen is fully English in English mode', devInEnglish === 0, `${screens} screens, ${devInEnglish} with Hindi`);
  // R8: mock test: 30 questions from one subject, timer ticks, result shows time.
  await go('#/mock'); await ev('document.querySelectorAll(".grid a.card")[2].click()'); await sleep(200);
  const n = await ev('quiz.qs.length'), subjIds = await ev('quiz.sid');
  const t1 = await ev('document.getElementById("timer").textContent'); await sleep(2200);
  const t2 = await ev('document.getElementById("timer").textContent');
  check('Mock test: 30 Biology questions, live timer', n === 30 && subjIds === 'bio' && t1 !== t2, `${n} q, ${t1} -> ${t2}`);
  const qset = new Set(await ev('quiz.qs.map(q => JSON.stringify(q[0]))'));
  check('Mock test has no repeated questions', qset.size === 30, `${qset.size} unique`);
  // R9: option shuffling: the correct answer is not always in slot a.
  const slots = new Set(await ev('quiz.qs.map(q => q[2])'));
  check('Options shuffled (correct answer lands in different slots)', slots.size >= 3, [...slots].join(','));
  // R10: bad routes fall back to home, no exceptions.
  for (const h of ['#/s/xyz', '#/quiz/phy/99', '#/quiz/zzz/mock', '#/s/phy/99x', '#/garbage']) await go(h);
  check('Invalid routes fall back to home without errors', /Physics/.test(await text()), await ev('location.hash'));
  // R11: Tips page and share button (no Android bridge in browser: must not throw).
  await go('#/tips'); check('Tips page renders with BSEB syllabus link', /biharboardonline/.test(await text()), '');
  await ev('shareScore(3,10)');
  check('No JS errors/exceptions during the whole session', errors.length === 0, errors.slice(0, 3).join(' || '));
  for (const [s, r, d] of results) console.log(`${s}  ${r}${d ? '  [' + d + ']' : ''}`);
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(`${results.length - fails}/${results.length} passed`);
  ws.close(); chrome.kill(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
