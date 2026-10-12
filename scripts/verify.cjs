const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),storage=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',style:{},dataset:{},value:'',files:[],focus(){},click(){}});return elements.get(id)};
const context=vm.createContext({window:{addEventListener(){},scrollTo(){}},document:{getElementById:element,addEventListener(){},activeElement:{tagName:'BODY'}},location:{hash:''},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:()=>new Promise(()=>{}),console,Date,setTimeout:()=>0,clearTimeout(){},Blob,URL,confirm:()=>true});
vm.runInContext(fs.readFileSync('lessons.js','utf8'),context);
vm.runInContext(fs.readFileSync('app.js','utf8'),context);
context.rows=JSON.parse(fs.readFileSync('articles.json','utf8'));
const run=s=>vm.runInContext(s,context);
run('articles=rows;L=buildLessons(articles);');
assert.equal(run('articleCount()'),355);
assert.equal(run('L.length'),354);
assert.equal(run('L.filter(x=>x.level==="curated").length'),30);
assert.equal(run('L.reduce((n,x)=>n+x.questions.length,0)'),708);
for(let id=1;id<=350;id++)assert.equal(run(`art(${id})!==undefined`),true,`missing ${id}`);
for(const id of [68.01,153.01,164.01,169.01,170.01]){
 assert.match(run(`articleLabel(art(${id}))`),/-A/);
 assert.equal(run(`art(${id}).id`),id);
}
assert.equal(run('art(290).id'),289);
assert.equal(run('art(146).repealed'),false);
assert.equal(run('art(297).repealed'),false);
assert.equal(run('art(262).repealed'),true);
assert.equal(run('art(153.01).body.includes("則上款所定刑罰")'),true);
const qs=run('L.flatMap(x=>x.questions)');
for(const q of qs){assert.equal(new Set(q.options).size,q.options.length,`ambiguous options: ${q.q}`);assert(q.options[q.answer]);assert(q.why.length>10)}
assert.equal(run('L.every(x=>x.related.every(n=>!!art(n)))'),true);
for(const page of ['home','library','topics','curriculum/0','curriculum/1','review','cases','notes','account','settings','lesson/1','article/164.01','article/290','article/350']){
 run(`location.hash='#${page}';render();`);assert(element('main').innerHTML.length>150,page);
 assert(!element('main').innerHTML.includes('undefined'),page);
}
for(const id of [1,13,164.01,146,213,350])for(const tab of ['original','basic','apply','deep']){
 const output=run(`tab='${tab}';lessonPage(${id})`);assert(!output.includes('undefined'),`${id}/${tab}`);
}
for(const query of ['164-A','68-a','290','詐騙']){
 run(`search='${query}';volume=branch='';page=0;results();`);assert(!element('list-results').innerHTML.includes('未找到結果'),query);
}
run("db=emptyState();beginQuiz([164.01]);answer(quiz.rows[0].answer);nextQuestion();answer(quiz.rows[1].answer);nextQuestion();");
assert.equal(run('quiz.done'),true);assert.equal(run('db.reviews[164.01].interval'),1);
assert.equal(run('valid(JSON.parse(JSON.stringify(db)))'),true,'inserted article backup must round-trip');
assert.equal(run('wrongConcepts().length'),0);
const due=run('db.reviews[164.01].due');run('schedule(164.01,true)');assert.equal(run('db.reviews[164.01].due'),due,'same-day success must not extend interval');
run('beginQuiz([211]);answer((quiz.rows[0].answer+1)%3);nextQuestion();answer(quiz.rows[1].answer);nextQuestion();');
assert.equal(run('wrongConcepts().includes(211)'),true);assert(run('db.reviews[211].interval')<1);
run('beginQuiz([211]);answer(quiz.rows[0].answer);nextQuestion();answer(quiz.rows[1].answer);nextQuestion();');
assert.equal(run('wrongConcepts().includes(211)'),false);
run("db.notes[164.01]='<script>injected</script>';db.stars.push(164.01);save();");
assert.equal(run('valid(JSON.parse(JSON.stringify(db)))'),true);
assert(run('notes()').includes('&lt;script&gt;'));assert(!run('notes()').includes('<script>'));
assert(storage.has('macau-criminal-study-v1'));
for(const budget of [5,15,30,45]){run(`db.budget=${budget};createPlan();`);assert(run('studyPlan.steps.length')>0);assert(run('studyPlan.steps.reduce((n,x)=>n+x.minutes,0)')<=budget)}
console.log('PASS: 355 article numbers; 354 lessons; 708 unique-choice questions; all pages; -A searches; partial/full repeal; quiz scoring; review scheduling; wrong-question recovery; escaped notes; backup format; study plans.');
console.log('Browser visual/interaction QA not performed: control-browser unavailable.');
