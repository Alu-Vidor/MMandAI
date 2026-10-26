const {chromium}=require('C:/Users/danii/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(process.argv[2]||'http://localhost:8000');const result=await page.evaluate(()=>{
 const names=Object.fromEntries(window.COURSES.map(c=>[c.name,c]));
 const expected={
  'Базы данных':[[3,4],5,180],
  'Функциональный анализ':[[7,8],10,360],
  'Физика':[[7,8],5,180],
  'Программирование и прикладная математика':[[1,2,3,4],13,468],
  'Программные средства 1C':[[8],3,108],
  'Компьютерные технологии в математике':[[1,2,3,4],12,432],
  'Теория разработки пользовательских интерфейсов':[[9],2,72],
  'Искусственный интеллект в преподавании математики':[[10],2,72],
  'Производственная практика (проектно-технологическая)':[[6],6,216],
  'Учебная практика (научно-исследовательская работа (получение первичных навыков научно-исследовательской работы))':[[5,7],8,288]
 };
 const failures=[];
 for(const [name,tuple]of Object.entries(expected)){const c=names[name];if(!c||JSON.stringify([c.semesters,c.credits,c.hours])!==JSON.stringify(tuple))failures.push(name);}
 for(const name of ['Комплексный анализ','Квантовые вычисления','Математическая криптография','Прикладные задачи высшей математики','Программирование математических вычислений'])if(names[name])failures.push('Obsolete '+name);
 const links=[...document.querySelectorAll('.project-courses button,.bh-course-links button')];
 for(const button of links){const c=window.COURSES.find(c=>c.id===button.dataset.course);if(!c||button.textContent!==c.name)failures.push('Incorrect course link '+button.textContent);}
 const banned=/РПД|обещание конкретной|пояснение для абитуриентов|О?ПК-\d/;
 for(const button of document.querySelectorAll('.course-name')){button.click();if(banned.test(document.querySelector('#detail').innerText))failures.push(button.textContent);document.querySelector('dialog').close();}
 return{count:window.COURSES.length,failures};
 });assert.equal(result.count,58);assert.deepEqual(result.failures,[]);await browser.close();console.log('PASS: revised semester/credit/hour milestones, all course links, all 58 cards, no obsolete courses or internal notes');})().catch(e=>{console.error(e);process.exit(1)});
