// App logic. Content comes from data/*.js, each of which pushes one subject into SUBJECTS.
// Every user-visible string is either plain (same in both languages) or [hindi, english].
const EMO = { phy: '⚡', chem: '🧪', bio: '🧬', math: '📐' };
const MOCK_SIZE = 30;

const TIPS = [
  ["इंटर विज्ञान के हर विषय के प्रश्न-पत्र में दो भाग होते हैं: वस्तुनिष्ठ (MCQ, OMR शीट पर) और विषयनिष्ठ (लघु एवं दीर्घ उत्तरीय)। ताज़ा पैटर्न के लिए BSEB का मॉडल पेपर अवश्य देखें।","Each Inter Science paper has two parts: objective (MCQs on an OMR sheet) and subjective (short and long answers). Always check the latest BSEB model paper for the current pattern."],
  ["MCQ भाग में जितने प्रश्न करने हैं उससे अधिक दिए जाते हैं — पहले वे प्रश्न करें जो पक्के आते हैं।","The MCQ section offers more questions than you must attempt — do the ones you are sure of first."],
  ["OMR शीट पर गोला पूरा और साफ़ भरें; काटकर दोबारा न भरें।","Fill OMR bubbles completely and neatly; never overwrite."],
  ["भौतिकी: सूत्र, SI मात्रक और विमाएँ एक साथ याद करें; आंकिक प्रश्नों में मात्रक लिखना न भूलें।","Physics: learn formulas with their SI units and dimensions; always write units in numericals."],
  ["रसायन: नामित अभिक्रियाएँ (Name reactions) और IUPAC नामकरण रोज़ दोहराएँ।","Chemistry: revise name reactions and IUPAC naming daily."],
  ["जीव विज्ञान: नामांकित चित्र (Labelled diagrams) बनाने का अभ्यास करें — इनके अच्छे अंक मिलते हैं।","Biology: practise labelled diagrams — they score well."],
  ["गणित: दीर्घ उत्तरीय प्रश्नों में हर चरण लिखें; चरणों के भी अंक मिलते हैं।","Maths: write every step in long answers; steps earn marks too."],
  ["NCERT पाठ्यपुस्तक BSEB परीक्षा का आधार है — पहले NCERT पूरी पढ़ें, फिर पिछले वर्षों के प्रश्न-पत्र घड़ी लगाकर हल करें।","NCERT textbooks are the basis of the BSEB exam — finish NCERT first, then solve previous years' papers with a timer."],
  ["परीक्षा से पहले अच्छी नींद लें; एडमिट कार्ड और पेन एक दिन पहले रख लें।","Sleep well before the exam; keep your admit card and pens ready the day before."]
];

let lang = 'hi';
try { lang = localStorage.getItem('lang') || 'hi'; } catch (e) {}
const T = x => Array.isArray(x) ? x[lang === 'hi' ? 0 : 1] : x;
const L = (hi, en) => lang === 'hi' ? hi : en;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const subj = id => SUBJECTS.find(s => s.id === id);

function best(key) { try { return JSON.parse(localStorage.getItem('best') || '{}')[key]; } catch (e) { return undefined; } }
function saveBest(key, pct) {
  try {
    const b = JSON.parse(localStorage.getItem('best') || '{}');
    if (b[key] === undefined || pct > b[key]) { b[key] = pct; localStorage.setItem('best', JSON.stringify(b)); }
  } catch (e) {}
}

function toggleLang() {
  lang = lang === 'hi' ? 'en' : 'hi';
  try { localStorage.setItem('lang', lang); } catch (e) {}
  document.documentElement.lang = lang;
  render();
}

function tabs(on) {
  const t = [['#/', L('विषय','Subjects')], ['#/mock', L('मॉक टेस्ट','Mock Test')], ['#/tips', L('टिप्स','Tips')]];
  return '<div class="tabs">' + t.map(([h, s]) => `<a href="${h}" class="${h === on ? 'on' : ''}">${s}</a>`).join('') + '</div>';
}

function subjectCards(link) {
  return '<div class="grid">' + SUBJECTS.map(s => {
    const nq = s.ch.reduce((a, c) => a + c.q.length, 0);
    return `<a class="card" href="${link(s)}"><span class="emo">${EMO[s.id] || '📘'}</span><b>${esc(T(s.t))}</b>`
      + `<span class="sub">${s.ch.length} ${L('अध्याय','chapters')} · ${nq} ${L('प्रश्न','Qs')}</span></a>`;
  }).join('') + '</div>';
}

function home() {
  return tabs('#/') + subjectCards(s => `#/s/${s.id}`)
    + `<p class="sub">${L('विषय चुनें → अध्याय पढ़ें → अभ्यास प्रश्न हल करें।','Pick a subject → read a chapter → solve practice questions.')}</p>`;
}

function chapters(s) {
  return `<h2>${EMO[s.id] || ''} ${esc(T(s.t))}</h2>` + s.ch.map((c, i) => {
    const b = best(`${s.id}.${i}`);
    const sub = `${c.q.length} ${L('प्रश्न','questions')}` + (b !== undefined ? ` · ${L('सर्वश्रेष्ठ','best')} ${b}%` : '');
    return `<a class="card" href="#/s/${s.id}/${i}"><span class="num">${i + 1}</span><span><b>${esc(T(c.t))}</b><br><span class="sub">${sub}</span></span></a>`;
  }).join('') + `<a class="btn" href="#/quiz/${s.id}/mock">${L(`${esc(T(s.t))} मॉक टेस्ट`, `${esc(T(s.t))} mock test`)} (${MOCK_SIZE})</a>`;
}

function chapter(s, i) {
  const c = s.ch[i];
  const nav = (i > 0 ? `<a class="btn ghost" href="#/s/${s.id}/${i - 1}">← ${L('पिछला अध्याय','Previous chapter')}</a>` : '')
    + (i + 1 < s.ch.length ? `<a class="btn ghost" href="#/s/${s.id}/${i + 1}">${L('अगला अध्याय','Next chapter')} →</a>` : '');
  return `<h2>${i + 1}. ${esc(T(c.t))}</h2><div class="card"><b>${L('मुख्य बिंदु एवं सूत्र','Key points & formulas')}</b><ul class="notes">`
    + c.n.map(x => `<li>${esc(T(x))}</li>`).join('') + '</ul></div>'
    + `<a class="btn" href="#/quiz/${s.id}/${i}">${L('अभ्यास प्रश्न शुरू करें','Start practice quiz')} (${c.q.length})</a>` + nav;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Active quiz: key "sid/idx" or "sid/mock", questions, index, score, current pick, wrong answers.
let quiz = null;

function startQuiz(key) {
  const [sid, part] = key.split('/');
  const s = subj(sid);
  const qs = part === 'mock'
    ? shuffle(s.ch.flatMap(c => c.q)).slice(0, MOCK_SIZE)
    : shuffle(s.ch[+part].q.slice());
  // Shuffle options too, so the correct answer isn't always in the same slot.
  const mixed = qs.map(([q, opts, ans, ex]) => {
    const order = shuffle([0, 1, 2, 3]);
    return [q, order.map(k => opts[k]), order.indexOf(ans), ex];
  });
  quiz = { key, sid, part, qs: mixed, i: 0, score: 0, picked: null, wrong: [], start: Date.now() };
}

function quizView() {
  const z = quiz;
  if (z.i >= z.qs.length) return result();
  const [q, opts, ans, ex] = z.qs[z.i];
  const timer = z.part === 'mock' ? `<span id="timer">${elapsed()}</span>` : '';
  let h = `<div class="bar"><span>${L('प्रश्न','Question')} ${z.i + 1}/${z.qs.length}</span>${timer}<span>${L('अंक','Score')}: ${z.score}</span></div>`
    + `<div class="card"><b>${esc(T(q))}</b></div>`;
  opts.forEach((o, k) => {
    let cls = 'opt';
    if (z.picked !== null) { if (k === ans) cls += ' right'; else if (k === z.picked) cls += ' wrong'; }
    h += `<button class="${cls}" onclick="pick(${k})">${'abcd'[k]}) ${esc(T(o))}</button>`;
  });
  if (z.picked !== null) {
    h += `<div class="explain">${z.picked === ans ? L('✔ सही!','✔ Correct!') : L('✘ गलत।','✘ Wrong.')} ${esc(T(ex))}</div>`
      + `<button class="btn" onclick="next()">${z.i + 1 < z.qs.length ? L('अगला प्रश्न →','Next →') : L('परिणाम देखें','See result')}</button>`;
  }
  return h;
}

function elapsed() {
  const s = Math.floor((Date.now() - quiz.start) / 1000);
  return `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function pick(k) {
  if (quiz.picked !== null) return;
  quiz.picked = k;
  const cur = quiz.qs[quiz.i];
  if (k === cur[2]) quiz.score++; else quiz.wrong.push(cur);
  render();
}

function next() { quiz.i++; quiz.picked = null; if (quiz.i >= quiz.qs.length) quiz.end = Date.now(); render(); window.scrollTo(0, 0); }

function result() {
  const z = quiz, pct = Math.round(100 * z.score / z.qs.length), s = subj(z.sid);
  if (!z.saved) { saveBest(z.part === 'mock' ? `${z.sid}.mock` : `${z.sid}.${z.part}`, pct); z.saved = true; }
  const msg = pct >= 80 ? L('शानदार! 🎉','Excellent! 🎉') : pct >= 50 ? L('अच्छा है, थोड़ा और अभ्यास करें।','Good, practise a bit more.') : L('नोट्स दोहराकर फिर प्रयास करें।','Revise the notes and try again.');
  const title = z.part === 'mock' ? `${T(s.t)} · ${L('मॉक टेस्ट','Mock test')}` : T(s.ch[+z.part].t);
  const secs = Math.floor(((z.end || Date.now()) - z.start) / 1000);
  const time = z.part === 'mock' ? `<p class="sub" style="text-align:center">⏱ ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</p>` : '';
  let h = `<h2>${esc(title)}</h2><div class="card"><p class="big">${z.score}/${z.qs.length}</p><p style="text-align:center">${pct}% — ${msg}</p>${time}</div>`
    + `<button class="btn" onclick="retry()">${L('फिर से प्रयास करें','Try again')}</button>`
    + `<button class="btn ghost" onclick="shareScore(${z.score},${z.qs.length})">${L('स्कोर शेयर करें','Share score')}</button>`
    + `<a class="btn ghost" href="#/s/${z.sid}">${L('अध्याय सूची','Chapter list')}</a>`;
  if (z.wrong.length) {
    h += `<h2 style="margin-top:20px">${L('गलत उत्तरों की समीक्षा','Review wrong answers')}</h2>`
      + z.wrong.map(([q, opts, ans, ex]) => `<div class="card review"><b>${esc(T(q))}</b><p class="ans">✔ ${esc(T(opts[ans]))}</p><span class="sub">${esc(T(ex))}</span></div>`).join('');
  }
  return h;
}

function retry() { startQuiz(quiz.key); render(); window.scrollTo(0, 0); }

function shareScore(sc, n) {
  const text = L(`मैंने "विज्ञान 12 BSEB" ऐप में ${n} में से ${sc} अंक पाए!`, `I scored ${sc}/${n} on the "Science 12 BSEB" app!`);
  if (window.Android) Android.share(text);
}

function mockIntro() {
  return tabs('#/mock') + `<div class="card"><b>${L('विषयवार मॉक टेस्ट','Subject-wise mock test')}</b><p>${L(`चुने गए विषय के सभी अध्यायों से ${MOCK_SIZE} यादृच्छिक प्रश्न, समय के साथ। हर बार नए प्रश्न।`, `${MOCK_SIZE} random questions from all chapters of the chosen subject, timed. Different every time.`)}</p></div>`
    + subjectCards(s => `#/quiz/${s.id}/mock`)
    + SUBJECTS.map(s => { const b = best(`${s.id}.mock`); return b !== undefined ? `<p class="sub">${esc(T(s.t))} — ${L('सर्वश्रेष्ठ','best')}: ${b}%</p>` : ''; }).join('');
}

function tipsView() {
  return tabs('#/tips') + `<div class="card"><b>${L('इंटर (कक्षा 12) बोर्ड परीक्षा के लिए सुझाव','Tips for the Inter (Class 12) board exam')}</b><ul class="notes">`
    + TIPS.map(x => `<li>${esc(T(x))}</li>`).join('') + '</ul></div>'
    + `<p class="sub">${L('यह ऐप NCERT/BSEB कक्षा 12 विज्ञान (भौतिकी, रसायन, जीव विज्ञान, गणित) पाठ्यक्रम पर आधारित अभ्यास के लिए है। आधिकारिक सिलेबस और परीक्षा पैटर्न के लिए biharboardonline.bihar.gov.in देखें।','This app is for practice based on the NCERT/BSEB Class 12 Science (Physics, Chemistry, Biology, Maths) syllabus. See biharboardonline.bihar.gov.in for the official syllabus and exam pattern.')}</p>`;
}

let tick = null;
function render() {
  const r = location.hash.replace(/^#\/?/, '').split('/');
  $('langBtn').textContent = lang === 'hi' ? 'English' : 'हिंदी';
  $('title').textContent = L('विज्ञान कक्षा 12 · बिहार बोर्ड', 'Science Class 12 · Bihar Board');
  clearInterval(tick);
  let h, back = null;
  const s = subj(r[1]);
  if (r[0] === 's' && s && r[2] !== undefined && s.ch[+r[2]]) { h = chapter(s, +r[2]); back = `#/s/${s.id}`; }
  else if (r[0] === 's' && s) { h = chapters(s); back = '#/'; }
  else if (r[0] === 'quiz' && s && (r[2] === 'mock' || s.ch[+r[2]])) {
    const key = `${r[1]}/${r[2]}`;
    if (!quiz || quiz.key !== key) startQuiz(key);
    h = quizView();
    back = r[2] === 'mock' ? `#/s/${s.id}` : `#/s/${s.id}/${r[2]}`;
    if (quiz.part === 'mock' && quiz.i < quiz.qs.length) tick = setInterval(() => { const t = $('timer'); if (t) t.textContent = elapsed(); }, 1000);
  }
  else if (r[0] === 'mock') h = mockIntro();
  else if (r[0] === 'tips') h = tipsView();
  else h = home();
  if (r[0] !== 'quiz') quiz = null;
  const b = $('back');
  b.style.display = back ? '' : 'none';
  if (back) b.href = back;
  $('app').innerHTML = h;
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
document.documentElement.lang = lang;
render();
