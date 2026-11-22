(() => {
  'use strict';
  const canvas = document.querySelector('#black-hole');
  const ctx = canvas.getContext('2d');
  const mass = document.querySelector('#bh-mass');
  const tilt = document.querySelector('#bh-tilt');
  const pause = document.querySelector('#bh-pause');
  const rays = document.querySelector('#bh-rays');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let running = !reducedMotion.matches, visible = true, frame = 0, previous = 0, time = 0;
  let width = 0, height = 0;
  let seed = 731;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const stars = Array.from({length: 150}, () => ({x:random(), y:random(), r:.35+random()*.85, a:.15+random()*.55}));
  const particles = Array.from({length: 360}, () => ({r:random(), angle:random()*Math.PI*2, size:.35+random()*.65}));

  function updateLabels() {
    const m = Number(mass.value);
    document.querySelector('#mass-value').textContent = m + ' M☉';
    document.querySelector('#tilt-value').textContent = tilt.value + '°';
    document.querySelector('#horizon-value').textContent = Math.round(2.953 * m) + ' км';
    pause.textContent = running ? 'Пауза' : 'Продолжить';
    pause.setAttribute('aria-pressed', String(!running));
  }

  function ellipseArc(cx, cy, radius, flatten, start, end, color, lineWidth) {
    ctx.beginPath();ctx.ellipse(cx,cy,radius,radius*flatten,0,start,end);ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();
  }

  function drawDisk(cx, cy, inner, outer, flatten, unit, foreground) {
    const start = foreground ? 0 : Math.PI;
    const end = start + Math.PI;
    const color = ctx.createLinearGradient(cx - outer, cy, cx + outer, cy);
    color.addColorStop(0, '#a63727');
    color.addColorStop(.25, '#ff9a55');
    color.addColorStop(.43, '#ffe2a4');
    color.addColorStop(.64, '#e7743a');
    color.addColorStop(1, '#54243c');

    for (let i = 84; i >= 0; i--) {
      const distance = i / 84;
      const radius = inner + (outer - inner) * distance;
      const bands = .6 + .25 * Math.sin(i * .49) + .15 * Math.sin(i * 1.7);
      const intensity = (1 - distance) ** 1.7;
      ctx.globalAlpha = (foreground ? .62 : .43) * intensity * bands;
      ellipseArc(cx, cy, radius, flatten, start, end, color, unit * (i % 5 === 0 ? 2.8 : 1.5));
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    if(!width || !height) return;
    const m = Number(mass.value), inclination = Number(tilt.value)*Math.PI/180;
    const cx=width*.5, cy=height*.49, unit=Math.min(width/500,height/310);
    const shadow=(32+(m-5)*.48)*unit, inner=shadow*1.58, outer=width*.455;
    const flatten=Math.max(.13,Math.cos(inclination)*.72);
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#06101f';ctx.fillRect(0,0,width,height);
    const halo=ctx.createRadialGradient(cx,cy,shadow,cx,cy,outer*1.2);
    halo.addColorStop(0,'rgba(230,112,51,.2)');
    halo.addColorStop(.4,'rgba(122,60,93,.14)');
    halo.addColorStop(.66,'rgba(56,95,138,.12)');
    halo.addColorStop(1,'rgba(6,16,31,0)');
    ctx.fillStyle=halo;ctx.fillRect(0,0,width,height);
    for(const star of stars){
      const x=star.x*width,y=star.y*height,dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);
      if(d<shadow*1.14)continue;
      const bend=shadow*shadow*.16/Math.max(d,shadow);
      const size = Math.max(.32, star.r * unit);
      ctx.fillStyle=`rgba(201,220,248,${star.a})`;ctx.beginPath();ctx.arc(x+dx/d*bend,y+dy/d*bend,size,0,Math.PI*2);ctx.fill();
    }
    // Stylized disk projection and secondary disk image. This is not a GR ray tracer.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-.10);
    ctx.translate(-cx, -cy);
    ctx.globalCompositeOperation='screen';
    drawDisk(cx, cy, inner, outer, flatten, unit, false);
    const lens = ctx.createLinearGradient(cx - shadow * 2, cy, cx + shadow * 2, cy);
    lens.addColorStop(0, '#ec843d');
    lens.addColorStop(.35, '#ffca7c');
    lens.addColorStop(.55, '#fff1d7');
    lens.addColorStop(1, '#9a462f');
    const lensHeight=shadow*(1.12+.36*Math.sin(inclination));
    for(let i=28;i>=0;i--){
      const q=i/28,r=shadow*(1.09+q*.82);
      ctx.globalAlpha = .5 * (1 - q) ** 1.8;
      ellipseArc(cx,cy,r,lensHeight*(1+.29*q)/r,Math.PI,Math.PI*2,lens,unit*1.5);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='#010308';ctx.beginPath();ctx.arc(cx,cy,shadow,0,Math.PI*2);ctx.fill();
    ctx.shadowColor='#ff864b';ctx.shadowBlur=13*unit;
    ellipseArc(cx,cy,shadow*1.025,1,0,Math.PI*2,'rgba(255,149,78,.8)',unit*3.4);
    ctx.shadowBlur=0;
    ellipseArc(cx,cy,shadow*1.025,1,0,Math.PI*2,lens,Math.max(1,unit*1.85));
    ctx.globalCompositeOperation='screen';
    drawDisk(cx, cy, inner, outer, flatten, unit, true);
    for(const p of particles){
      const distance = p.r ** 1.7;
      const r=inner+(outer-inner)*distance,angle=p.angle+time*.28/Math.pow(.35+distance,1.5);
      const x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r*flatten;
      if(Math.sin(angle)<0&&Math.hypot(x-cx,y-cy)<shadow*1.1)continue;
      const bright=(.28+.6*(.5-.5*Math.cos(angle)))*(1-distance*.75);
      ctx.fillStyle=`rgba(255,223,172,${bright})`;ctx.beginPath();ctx.arc(x,y,p.size*unit,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    if(rays.checked){
      for(let k=0;k<5;k++){
        const impact=(shadow*1.7+k*shadow*.52),sign=k%2?-1:1;
        ctx.beginPath();ctx.moveTo(0,cy+sign*impact);
        ctx.bezierCurveTo(cx*.7,cy+sign*impact,cx*.85,cy+sign*impact*.38,width,cy+sign*(impact-shadow*.8));
        ctx.strokeStyle='rgba(137,217,213,.33)';ctx.lineWidth=.75;ctx.stroke();
      }
    }
    updateLabels();
  }

  function animate(stamp) {
    frame=0;
    if(!running || !visible || document.hidden)return;
    if(stamp-previous>=33){time+=Math.min((stamp-previous)/1000,.05);previous=stamp;draw();}
    frame=requestAnimationFrame(animate);
  }
  function schedule(){if(running&&visible&&!document.hidden&&!frame){previous=performance.now();frame=requestAnimationFrame(animate);}}
  function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();schedule();}
  [mass,tilt,rays].forEach(control=>control.addEventListener('input',draw));
  pause.addEventListener('click',()=>{running=!running;if(!running&&frame){cancelAnimationFrame(frame);frame=0;}draw();schedule();});
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();}).observe(canvas);
  document.addEventListener('visibilitychange',schedule);
  reducedMotion.addEventListener('change',e=>{if(e.matches){running=false;updateLabels();}});
  resize();
})();
