(()=>{'use strict';const courses=window.COURSES,groups=window.GROUPS,colors={math:'#3266ce',model:'#008c80',ai:'#7853c1',code:'#c27522',general:'#687589',practice:'#a64c73'};const gantt=document.querySelector('#gantt'),filters=document.querySelector('#filters'),search=document.querySelector('#search'),dialog=document.querySelector('#course-dialog');let category='all',semester=1,view=window.matchMedia('(max-width:700px)').matches?'semester':'gantt';const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));filters.innerHTML=Object.entries({all:'Все дисциплины',...groups}).map(([id,name])=>`<button data-filter="${id}" aria-pressed="${id==='all'}" style="--category:${colors[id]||'#102c4d'}">${name}</button>`).join('');
function renderGantt(){const q=search.value.trim().toLocaleLowerCase('ru');const visible=courses.filter(c=>(category==='all'||c.group===category)&&c.name.toLocaleLowerCase('ru').includes(q));let html='<div class="gantt-header"><div>Дисциплина / семестр</div>'+Array.from({length:10},(_,i)=>`<div>${i+1}<small>${Math.floor(i/2)+1} курс</small></div>`).join('')+'</div>';for(const [key,label]of Object.entries(groups)){const items=visible.filter(c=>c.group===key).sort((a,b)=>a.semesters[0]-b.semesters[0]||a.id.localeCompare(b.id));if(!items.length)continue;html+=`<div class="group-label" style="--category:${colors[key]}">${label} · ${items.length}</div>`;for(const c of items){const optional=c.kind.includes('выбору')||c.kind==='Факультатив';const runs=[];for(const s of c.semesters){const last=runs.at(-1);if(last&&last.at(-1)===s-1)last.push(s);else runs.push([s]);}html+=`<div class="course-row" style="--category:${colors[key]}"><button class="course-name" data-course="${esc(c.id)}">${esc(c.name)}${optional?`<small>${esc(c.kind)}</small>`:''}</button>`+Array.from({length:10},(_,i)=>`<div class="cell" style="grid-column:${i+2}"></div>`).join('');for(const run of runs)html+=`<button class="bar ${optional?'optional':''}" style="grid-column:${run[0]+1}/span ${run.length}" data-course="${esc(c.id)}" aria-label="${esc(c.name)}, семестры ${run.join(', ')}. Открыть описание">${run.length>1?run[0]+'–'+run.at(-1):run[0]}</button>`;html+='</div>';}}if(!visible.length)html+='<p class="empty">Ничего не найдено. Попробуйте другое название или раздел.</p>';gantt.innerHTML=html;document.querySelector('#count').textContent=`Показано: ${visible.length} из ${courses.length} дисциплин, практик и итоговых работ`;}
function renderSemester(){
 const q=search.value.trim().toLocaleLowerCase('ru');
 const selected=courses.filter(c=>c.semesters.includes(semester)&&(category==='all'||c.group===category)&&c.name.toLocaleLowerCase('ru').includes(q));
 document.querySelector('.semester-picker').innerHTML=Array.from({length:10},(_,i)=>`<button data-semester="${i+1}" aria-pressed="${semester===i+1}"><span>${i+1}</span><small>семестр</small></button>`).join('');
 document.querySelector('#semester-list').innerHTML=`<div class="semester-title"><h3>${semester} семестр</h3><span>${Math.ceil(semester/2)} курс · ${selected.length} дисциплин и практик</span></div>`+selected.map(c=>`<button class="semester-course" data-course="${esc(c.id)}" style="--category:${colors[c.group]}"><span class="semester-course-title">${esc(c.name)}</span><span class="semester-course-meta">${esc(groups[c.group])}${c.kind.includes('выбору')||c.kind==='Факультатив'?' · '+esc(c.kind):''}</span></button>`).join('')+(selected.length?'':'<p class="empty">В этом семестре ничего не найдено. Выберите другой семестр или измените фильтр.</p>');
 if(view==='semester')document.querySelector('#count').textContent=`${semester} семестр: ${selected.length} дисциплин и практик`;
}
function render(){renderGantt();renderSemester();document.querySelector('.gantt-scroll').hidden=view!=='gantt';document.querySelector('#semester-panel').hidden=view!=='semester';document.querySelector('.scroll-hint').hidden=view!=='gantt';document.querySelector('.chart-meta>span:last-child').hidden=view!=='gantt';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));}
document.querySelector('.plan-view').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;view=b.dataset.view;render();});
document.querySelector('.semester-picker').addEventListener('click',e=>{const b=e.target.closest('[data-semester]');if(!b)return;semester=Number(b.dataset.semester);render();});
function careerText(c){
 if(c.name==='Программные средства 1C')return 'Разработчику прикладных решений и специалисту по автоматизации — для обработки данных, расчётов и создания отчётов на платформе «1С:Предприятие».';
 if(c.name==='Теория разработки пользовательских интерфейсов')return 'Разработчику программ и проектировщику интерфейсов — чтобы сделать расчётный инструмент понятным и снизить число ошибок при работе с ним.';
 if(/преподавани[яи]/.test(c.name)||c.name==='Педагогика и психология')return 'Преподавателю математики — чтобы объяснять сложные темы, создавать задания и понимать, как учатся люди.';
 if(c.group==='general')return '';
 return {math:'Специалисту по моделированию, исследователю и разработчику ИИ — как математическая основа для постановки и решения задач.',model:'Специалисту по математическому моделированию и исследователю — для описания процессов, вычислительных экспериментов и проверки результатов.',ai:'Специалисту по машинному обучению и аналитику данных — для построения моделей, проверки прогнозов и исследования закономерностей.',code:'Разработчику научного программного обеспечения и систем ИИ — для создания надёжных вычислительных инструментов.',practice:'Исследователю и разработчику — чтобы пройти путь от постановки задачи до проверенного результата.'}[c.group]||'';
}
function openCourse(id){const c=courses.find(c=>c.id===id);if(!c)return;document.querySelector('#detail').innerHTML=`<div style="--category:${colors[c.group]}"><div class="detail-tag">${esc(groups[c.group])} · ${esc(c.kind)}</div><h2 class="detail-title" id="detail-title">${esc(c.name)}</h2><div class="detail-meta"><span>Семестры: ${c.semesters.join(', ')}</span><span>${c.credits} з.е.</span><span>${c.hours} часов</span></div><div class="detail-block"><h3>Что изучаем</h3><p>${esc(c.about)}</p></div><div class="detail-block why"><h3>Зачем это нужно?</h3><p>${esc(c.why)}</p></div><div class="detail-block"><h3>Например, вы сможете</h3><p>${esc(c.example)}</p></div>${careerText(c)?`<div class="detail-block"><h3>Кому пригодится в работе</h3><p>${esc(careerText(c))}</p></div>`:''}${c.kind.includes('выбору')?'<div class="detail-block"><p>В этой паре выбирается один из двух курсов.</p></div>':''}</div>`;dialog.showModal();dialog.scrollTop=0;}
filters.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;category=b.dataset.filter;filters.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});search.addEventListener('input',render);document.addEventListener('click',e=>{const b=e.target.closest('[data-course]');if(b)openCourse(b.dataset.course);});dialog.querySelector('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});render();
})();

function initializeVacancies(carousel) {
 const track = carousel.querySelector('.vacancy-track');
 const slides = Array.from(track.children);
 const navigation = carousel.querySelector('.vacancy-navigation');
 const markers = carousel.querySelector('.vacancy-markers');
 const status = carousel.querySelector('.vacancy-status');
 let current = 0;
 let settled = 0;
 let pending = null;
 let frame = 0;
 let scrollTimer;

 function slideOffset(index) {
  return slides[index].getBoundingClientRect().left
   - slides[0].getBoundingClientRect().left;
 }

 function nearestSlide() {
  return slides.reduce((best, slide, index) =>
   Math.abs(slideOffset(index) - track.scrollLeft) < Math.abs(slideOffset(best) - track.scrollLeft)
    ? index : best, 0);
 }

 function showMarker(index) {
  markers.children[current].removeAttribute('aria-current');
  markers.children[index].setAttribute('aria-current', 'true');
  current = index;
 }

 function goTo(index, behavior = 'auto') {
  pending = index;
  showMarker(index);
  const left = slideOffset(index);
  if (Math.abs(track.scrollLeft - left) < 1) return settle();
  track.scrollTo({left, behavior});
 }

 function settle() {
  pending = null;
  const index = nearestSlide();
  showMarker(index);
  if (index === settled) return;
  settled = index;
  status.textContent = `Вакансия ${index + 1} из ${slides.length}`;
 }

 slides.forEach((slide, index) => {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.setAttribute('aria-controls', track.id);
  marker.setAttribute('aria-label', `Вакансия ${index + 1}. ${slide.querySelector('h4').textContent}`);
  marker.addEventListener('click', () => goTo(index));
  markers.append(marker);
 });
 showMarker(nearestSlide());
 settled = current;
 navigation.hidden = markers.hidden = false;

 navigation.addEventListener('click', event => {
  const button = event.target.closest('[data-vacancy-step]');
  if (!button) return;
  const next = (pending ?? nearestSlide()) + Number(button.dataset.vacancyStep);
  const wraps = next < 0 || next === slides.length;
  goTo((next + slides.length) % slides.length, wraps ? 'instant' : 'auto');
 });

 const supportsScrollEnd = 'onscrollend' in track;
 if (supportsScrollEnd) track.addEventListener('scrollend', settle);
 track.addEventListener('scroll', () => {
  if (pending === null && !frame) {
   frame = requestAnimationFrame(() => {
    frame = 0;
    if (pending === null) showMarker(nearestSlide());
   });
  }
  if (!supportsScrollEnd) {
   clearTimeout(scrollTimer);
   scrollTimer = setTimeout(settle, 150);
  }
 }, {passive: true});
}

async function loadVacancies(carousel) {
 const message = carousel.querySelector('.vacancy-message');
 const track = carousel.querySelector('.vacancy-track');
 const freshness = carousel.querySelector('.vacancy-freshness');
 const template = carousel.querySelector('#vacancy-template');
 const marketNames = {ru: 'HH.ru', international: 'За рубежом'};
 const courseIds = {
  ml: ['Б1.В.01.07', 'Б1.В.01.06'],
  model: ['Б1.О.04.08', 'Б1.О.04.07'],
  data: ['Б1.О.04.18', 'Б1.О.04.12'],
  education: ['Б1.О.04.23', 'Б1.О.04.22']
 };
 const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Moscow'
 });
 const postingFormat = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'long', timeZone: 'Europe/Moscow'
 });
 const maxAge = 48 * 60 * 60 * 1000;
 const allowedPaths = new Map([
  ['https://hh.ru', /^\/vacancy\/\d+\/?$/],
  ['https://job-boards.greenhouse.io', /^\/[\w-]+\/jobs\/\d+\/?$/],
  ['https://job-boards.eu.greenhouse.io', /^\/[\w-]+\/jobs\/\d+\/?$/],
  ['https://boards.greenhouse.io', /^\/[\w-]+\/jobs\/\d+\/?$/],
  ['https://jobs.ashbyhq.com', /^\/[\w-]+\/[\da-f-]+\/?$/]
 ]);

 function safeUrl(value) {
  try {
   const url = new URL(value);
   return !url.username && !url.password && allowedPaths.get(url.origin)?.test(url.pathname)
    ? url.href : null;
  } catch {
   return null;
  }
 }

 message.hidden = false;
 message.textContent = 'Загружаем вакансии…';
 try {
  const response = await fetch('vacancies.json', {cache: 'no-cache'});
  if (!response.ok) throw new Error('Vacancy feed unavailable');
  const {sources} = await response.json();
  const markets = {ru: [], international: []};
  const used = new Set();
  for (const feed of Object.values(sources)) {
   const checked = Date.parse(feed.checkedAt);
   if (!Number.isFinite(checked) || Date.now() - checked > maxAge || !markets[feed.market]) continue;
   // Take one role from each search or employer to keep the selection varied.
   for (const job of feed.jobs) {
    const url = safeUrl(job.url);
    if (!url || used.has(url) || typeof job.title !== 'string' || !job.title) continue;
    used.add(url);
    markets[feed.market].push({...job, url, checked, market: feed.market});
    break;
   }
  }
  const jobs = [];
  for (let i = 0; i < Math.max(markets.ru.length, markets.international.length); i++) {
   if (markets.ru[i]) jobs.push(markets.ru[i]);
   if (markets.international[i]) jobs.push(markets.international[i]);
  }
  if (!jobs.length) throw new Error('No current vacancies');

  const cards = jobs.map((job, index) => {
   const card = template.content.firstElementChild.cloneNode(true);
   card.setAttribute('aria-label', `${index + 1} из ${jobs.length}`);
   card.querySelector('.vacancy-source').textContent = [marketNames[job.market], job.location].filter(Boolean).join(' · ');
   const title = card.querySelector('h4');
   title.textContent = job.title;
   if (job.market === 'international') title.lang = 'en';
   card.querySelector('.vacancy-employer').textContent = job.organization || '';
   card.querySelector('.vacancy-link').href = job.url;
   const published = Date.parse(job.published);
   if (Number.isFinite(published)) {
    const date = card.querySelector('.vacancy-posted');
    date.textContent = `Опубликовано ${postingFormat.format(published)}`;
    date.hidden = false;
   }
   const related = Object.hasOwn(courseIds, job.field) ? courseIds[job.field] : [];
   for (const id of related) {
    const course = window.COURSES.find(item => item.id === id);
    if (!course) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.course = id;
    button.textContent = course.name;
    card.querySelector('.vacancy-courses').append(button);
   }
   return card;
  });
  track.replaceChildren(...cards);
  track.hidden = false;
  message.hidden = true;
  freshness.textContent = 'Последняя проверка — ' + Object.entries(markets).filter(([, group]) => group.length)
   .map(([market, group]) => `${marketNames[market]} · ${dateFormat.format(Math.min(...group.map(job => job.checked)))}`)
   .join(' / ') + ' (мск)';
  freshness.hidden = false;
  if (jobs.length > 1) initializeVacancies(carousel);
 } catch {
  message.textContent = 'Подборка пока недоступна. Открытые вакансии можно посмотреть на сайтах работодателей и HH.ru.';
 }
}

const vacancyCarousel = document.querySelector('.vacancies');
if (vacancyCarousel) loadVacancies(vacancyCarousel);
