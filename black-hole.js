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
  const stars = Array.from({length: 150}, () => ({x:random(), y:random(), r:.35+random()*.8, a:.15+random()*.55}));
  const particles = Array.from({length: 430}, () => ({r:random(), angle:random()*Math.PI*2, size:.4+random()*.8}));

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

  function draw() {
    if(!width || !height) return;
    const m = Number(mass.value), inclination = Number(tilt.value)*Math.PI/180;
    const cx=width*.5, cy=height*.49, unit=Math.min(width/500,height/310);
    const shadow=(29+(m-5)*.43)*unit, inner=shadow*1.52, outer=width*.42;
    const flatten=Math.max(.13,Math.cos(inclination)*.72);
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#06101f';ctx.fillRect(0,0,width,height);
    const halo=ctx.createRadialGradient(cx,cy,shadow,cx,cy,outer*1.2);
    halo.addColorStop(0,'rgba(235,123,38,.09)');halo.addColorStop(.55,'rgba(74,95,133,.04)');halo.addColorStop(1,'rgba(6,16,31,0)');
    ctx.fillStyle=halo;ctx.fillRect(0,0,width,height);
    for(const star of stars){
      const x=star.x*width,y=star.y*height,dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);
      if(d<shadow*1.14)continue;
      const bend=shadow*shadow*.16/Math.max(d,shadow);
      ctx.fillStyle=`rgba(201,220,248,${star.a})`;ctx.beginPath();ctx.arc(x+dx/d*bend,y+dy/d*bend,star.r*unit,0,Math.PI*2);ctx.fill();
    }
    // Stylized disk projection and secondary disk image. This is not a GR ray tracer.
    ctx.globalCompositeOperation='screen';
    for(let i=90;i>=0;i--){
      const q=i/90,r=inner+(outer-inner)*q;
      const intensity=(1-q)*.55+.1;
      ellipseArc(cx,cy,r,flatten,Math.PI,Math.PI*2,`rgba(244,${Math.round(133+80*(1-q))},${Math.round(55+75*(1-q))},${intensity})`,unit*(i%7===0?1.2:.55));
    }
    const lensHeight=shadow*(1.18+.38*Math.sin(inclination));
    for(let i=34;i>=0;i--){
      const q=i/34,r=shadow*1.13+q*shadow*.64;
      ellipseArc(cx,cy,r,lensHeight/r,Math.PI,Math.PI*2,`rgba(255,${Math.round(155+85*(1-q))},${Math.round(75+110*(1-q))},${.12+(1-q)*.42})`,unit*.8);
    }
    ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='#010308';ctx.beginPath();ctx.arc(cx,cy,shadow,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.shadowColor='#ffd39a';ctx.shadowBlur=9*unit;
    ellipseArc(cx,cy,shadow*1.04,1,0,Math.PI*2,'rgba(255,224,173,.8)',unit*1.25);ctx.restore();
    ctx.globalCompositeOperation='screen';
    for(let i=90;i>=0;i--){
      const q=i/90,r=inner+(outer-inner)*q;
      ellipseArc(cx,cy,r,flatten,0,Math.PI,`rgba(255,${Math.round(147+90*(1-q))},${Math.round(61+107*(1-q))},${.13+(1-q)*.58})`,unit*(i%6===0?1.2:.6));
    }
    for(const p of particles){
      const r=inner+(outer-inner)*p.r,angle=p.angle+time*.28/Math.pow(.35+p.r,1.5);
      const x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r*flatten;
      if(Math.sin(angle)<0&&Math.hypot(x-cx,y-cy)<shadow*1.1)continue;
      const bright=.35+.5*(.5+.5*Math.cos(angle));
      ctx.fillStyle=`rgba(255,223,172,${bright})`;ctx.beginPath();ctx.arc(x,y,p.size*unit,0,Math.PI*2);ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
    if(rays.checked){
      for(let k=0;k<5;k++){
        const impact=(shadow*1.7+k*shadow*.52),sign=k%2?-1:1;
        ctx.beginPath();ctx.moveTo(0,cy+sign*impact);
        ctx.bezierCurveTo(cx*.7,cy+sign*impact,cx*.85,cy+sign*impact*.38,width,cy+sign*(impact-shadow*.8));
        ctx.strokeStyle='rgba(102,221,218,.65)';ctx.lineWidth=1;ctx.stroke();
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
