
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Resolutions ──────────────────────────────────────────────────────────────
const RESOLUTIONS = [
  { id:"mba13_2025", label:'MacBook Air 13" 2025',   w:2560, h:1664, dpr:2 },
  { id:"mba15_2024", label:'MacBook Air 15" 2024',   w:2880, h:1864, dpr:2 },
  { id:"mbp14",      label:'MacBook Pro 14"',         w:3024, h:1964, dpr:2 },
  { id:"mbp16",      label:'MacBook Pro 16"',         w:3456, h:2234, dpr:2 },
  { id:"imac24",     label:'iMac 24"',                w:4480, h:2520, dpr:2 },
  { id:"uhd",        label:"4K UHD Monitor",          w:3840, h:2160, dpr:1 },
  { id:"wqhd",       label:"WQHD 2K Monitor",         w:2560, h:1440, dpr:1 },
  { id:"fhd",        label:"Full HD 1080p",            w:1920, h:1080, dpr:1 },
  { id:"ultrawide",  label:'Ultrawide 34" 3440×1440', w:3440, h:1440, dpr:1 },
  { id:"custom",     label:"Custom…",                 w:null, h:null,  dpr:1 },
];
function detectResolution() {
  const pw=window.screen.width*(window.devicePixelRatio||1), ph=window.screen.height*(window.devicePixelRatio||1);
  let best=null, bestScore=Infinity;
  for(const r of RESOLUTIONS){ if(!r.w) continue; const s=Math.abs(r.w-pw)+Math.abs(r.h-ph); if(s<bestScore){bestScore=s;best=r;} }
  return { detected:{w:pw,h:ph}, match:best };
}

// ─── Theme Families ───────────────────────────────────────────────────────────
const FAMILIES = [
  {
    id: "futuristic",
    label: "Futuristic",
    icon: "◈",
    themes: [
      { id:"cyber",   name:"Cyber Grid",    desc:"Perspective grid + neon glow",  bg:"#0D2320", primary:"#B2FF59", secondary:"#3C6E1E", accent:"#64C832", draw:"grid"    },
      { id:"void",    name:"Void Protocol", desc:"Deep space particle field",       bg:"#05080F", primary:"#B2FF59", secondary:"#2A4010", accent:"#7AE020", draw:"void"    },
      { id:"circuit", name:"Circuit Board", desc:"PCB trace network",               bg:"#001A0D", primary:"#00FF88", secondary:"#004D29", accent:"#00CC66", draw:"circuit" },
      { id:"storm",   name:"Data Storm",    desc:"Kinetic diagonal streams",        bg:"#0A0A1A", primary:"#B2FF59", secondary:"#1A2A40", accent:"#5599FF", draw:"storm"   },
      { id:"pulse",   name:"Pulse Signal",  desc:"Radial waveform broadcast",       bg:"#050D14", primary:"#00DDFF", secondary:"#00334D", accent:"#0099CC", draw:"pulse"   },
    ],
  },
  {
    id: "minimalist",
    label: "Minimalist",
    icon: "◻",
    themes: [
      { id:"mono",    name:"Mono Line",     desc:"Single horizon, pure white",      bg:"#F5F5F3", primary:"#111111", secondary:"#888888", accent:"#333333", draw:"mono"    },
      { id:"dusk",    name:"Dusk Wash",     desc:"Warm gradient, soft shadow",      bg:"#1A1210", primary:"#E8D5C4", secondary:"#6B4E3D", accent:"#C4956A", draw:"dusk"    },
      { id:"slate",   name:"Slate Field",   desc:"Cool grey, geometric rule",       bg:"#0F1319", primary:"#C8D8E8", secondary:"#2A3A4A", accent:"#7898B8", draw:"slate"   },
      { id:"ivory",   name:"Ivory Press",   desc:"Off-white, editorial serif",      bg:"#F2EDE6", primary:"#2C2416", secondary:"#B0A090", accent:"#8C7060", draw:"ivory"   },
      { id:"ink",     name:"Ink Drop",      desc:"Deep black, single ink mark",     bg:"#080808", primary:"#EFEFEF", secondary:"#383838", accent:"#AAAAAA", draw:"ink"     },
    ],
  },
  {
    id: "natural",
    label: "Natural",
    icon: "◉",
    themes: [
      { id:"forest",  name:"Forest Floor",  desc:"Moss greens, organic texture",    bg:"#0E1A0E", primary:"#7EC87E", secondary:"#2A4A2A", accent:"#4CAF50", draw:"forest"  },
      { id:"ocean",   name:"Ocean Depth",   desc:"Deep teal, water light scatter",  bg:"#041018", primary:"#40B0C8", secondary:"#082838", accent:"#20889C", draw:"ocean"   },
      { id:"sand",    name:"Sand Dune",     desc:"Warm earth tones, terrain bands",  bg:"#1C1408", primary:"#D4A862", secondary:"#5C4020", accent:"#A87840", draw:"sand"    },
      { id:"aurora",  name:"Aurora Borealis",desc:"Northern lights gradient bloom", bg:"#030A0E", primary:"#88FFCC", secondary:"#003322", accent:"#44DDAA", draw:"aurora"  },
      { id:"stone",   name:"Stone & Moss",  desc:"Granite texture, earth palette",  bg:"#181614", primary:"#B8C4A8", secondary:"#484840", accent:"#8A9878", draw:"stone"   },
    ],
  },
];

const ALL_THEMES = FAMILIES.flatMap(f => f.themes.map(t => ({ ...t, family: f.id })));

const ROLES = [
  "Activation Partner","Customer Success Manager","Implementation Manager",
  "Solutions Engineer","Product Manager","Account Executive","VP of Customer Success","Custom…",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hexToRgb = h => [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const rgba = (hex,a) => { const [r,g,b]=hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
function mulberry32(s){ return ()=>{ s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296; }; }

// ─── Master draw dispatcher ───────────────────────────────────────────────────
function drawWallpaper(canvas, theme, name, role) {
  const ctx=canvas.getContext("2d"), W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);
  // Background
  const bg=ctx.createRadialGradient(W/2,H*0.45,0,W/2,H*0.45,W*0.75);
  const [r,g,b]=hexToRgb(theme.bg);
  bg.addColorStop(0,`rgb(${Math.min(255,r+18)},${Math.min(255,g+18)},${Math.min(255,b+18)})`);
  bg.addColorStop(1,theme.bg);
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  // Dispatch
  const draws={grid:dGrid,void:dVoid,circuit:dCircuit,storm:dStorm,pulse:dPulse,
               mono:dMono,dusk:dDusk,slate:dSlate,ivory:dIvory,ink:dInk,
               forest:dForest,ocean:dOcean,sand:dSand,aurora:dAurora,stone:dStone};
  draws[theme.draw]?.(ctx,W,H,theme);
  // Text + chrome differ by family
  if(theme.family==="minimalist") drawMinText(ctx,W,H,theme,name,role);
  else if(theme.family==="natural") drawNatText(ctx,W,H,theme,name,role);
  else { drawCoreGlow(ctx,W,H,theme); drawFutText(ctx,W,H,theme,name,role); drawChrome(ctx,W,H,theme); }
}

// ══════════════════════════════════════════════════════════════════════════════
// FUTURISTIC BACKGROUNDS
// ══════════════════════════════════════════════════════════════════════════════
function dGrid(ctx,W,H,t){
  const [pr,pg,pb]=hexToRgb(t.secondary),hz=H*0.52;
  for(let i=0;i<20;i++){const v=i/19,y=hz+(H-hz)*Math.pow(v,1.7);ctx.strokeStyle=`rgba(${pr},${pg},${pb},${v*0.5})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  for(let i=0;i<=28;i++){const v=i/28,xB=v*W,a=(1-Math.abs(v-0.5)*2)*0.35;ctx.strokeStyle=`rgba(${pr},${pg},${pb},${a})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W/2,hz);ctx.lineTo(xB,H);ctx.stroke();}
  const [ar,ag,ab]=hexToRgb(t.accent),hs=Math.floor(W*0.022);
  for(let row=-1;row<10;row++) for(let col=-2;col<Math.ceil(W/(hs*1.732))+2;col++){
    const hx=col*hs*1.732+(row%2)*hs*0.866,hy=row*hs*1.5-60;
    if(hy>H*0.55)continue;
    const d=Math.sqrt((hx-W/2)**2+(hy-H*0.38)**2);
    ctx.strokeStyle=`rgba(${ar},${ag},${ab},${d<W*0.11?0.25:0.1})`;ctx.lineWidth=1;ctx.beginPath();
    for(let k=0;k<6;k++){const a=(Math.PI/180)*(60*k-30);k===0?ctx.moveTo(hx+(hs-2)*Math.cos(a),hy+(hs-2)*Math.sin(a)):ctx.lineTo(hx+(hs-2)*Math.cos(a),hy+(hs-2)*Math.sin(a));}
    ctx.closePath();ctx.stroke();
  }
}
function dVoid(ctx,W,H,t){
  const [pr,pg,pb]=hexToRgb(t.primary),rng=mulberry32(99);
  for(let i=0;i<320;i++){const x=rng()*W,y=rng()*H,sz=rng()<0.05?2:1,a=0.2+rng()*0.7;ctx.fillStyle=`rgba(${pr},${pg},${pb},${a})`;ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();}
  const [ar,ag,ab]=hexToRgb(t.accent);
  for(let i=3;i>0;i--){const g=ctx.createRadialGradient(W/2,H*0.42,i*80,W/2,H*0.42,i*200);g.addColorStop(0,`rgba(${ar},${ag},${ab},0.04)`);g.addColorStop(1,`rgba(${ar},${ag},${ab},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  for(let y=0;y<H;y+=4){ctx.fillStyle="rgba(0,0,0,0.07)";ctx.fillRect(0,y,W,1);}
}
function dCircuit(ctx,W,H,t){
  const [pr,pg,pb]=hexToRgb(t.primary),[ar,ag,ab]=hexToRgb(t.accent),rng=mulberry32(42),g=Math.floor(W*0.023);
  for(let i=0;i<60;i++){
    let cx=Math.floor(rng()*(W/g))*g,cy=Math.floor(rng()*(H/g))*g;
    const a=0.06+rng()*0.14;ctx.strokeStyle=`rgba(${pr},${pg},${pb},${a})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,cy);
    for(let s=0;s<6;s++){const d=Math.floor(rng()*4),l=(1+Math.floor(rng()*3))*g;if(d===0)cx+=l;else if(d===1)cx-=l;else if(d===2)cy+=l;else cy-=l;ctx.lineTo(cx,cy);}
    ctx.stroke();ctx.fillStyle=`rgba(${ar},${ag},${ab},${a*1.5})`;ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();
  }
  for(let x=0;x<W;x+=g)for(let y=0;y<H;y+=g){ctx.fillStyle=`rgba(${pr},${pg},${pb},0.08)`;ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);ctx.fill();}
}
function dStorm(ctx,W,H,t){
  const [pr,pg,pb]=hexToRgb(t.primary),[ar,ag,ab]=hexToRgb(t.accent),rng=mulberry32(77);
  for(let i=0;i<40;i++){
    const x=rng()*W,a=0.04+rng()*0.18,y1=rng()*H,y2=rng()*H;
    const [r2,g2,b2]=rng()<0.3?[ar,ag,ab]:[pr,pg,pb];
    const gd=ctx.createLinearGradient(x,Math.min(y1,y2),x,Math.max(y1,y2));
    gd.addColorStop(0,`rgba(${r2},${g2},${b2},0)`);gd.addColorStop(0.5,`rgba(${r2},${g2},${b2},${a})`);gd.addColorStop(1,`rgba(${r2},${g2},${b2},0)`);
    ctx.strokeStyle=gd;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y2);ctx.stroke();
  }
  for(let i=0;i<15;i++){const x=rng()*W,y=rng()*H,l=100+rng()*400,ang=-0.3+rng()*0.6,a=0.06+rng()*0.12;ctx.strokeStyle=`rgba(${ar},${ag},${ab},${a})`;ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(ang)*l,y+Math.sin(ang)*l);ctx.stroke();}
}
function dPulse(ctx,W,H,t){
  const [pr,pg,pb]=hexToRgb(t.primary),[ar,ag,ab]=hexToRgb(t.accent);
  const cx=W/2,cy=H*0.42;
  // Radial rings
  for(let r=60;r<W*0.7;r+=W*0.055){
    const a=Math.max(0,0.18-r/(W*0.7)*0.18);
    ctx.strokeStyle=`rgba(${pr},${pg},${pb},${a})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  }
  // Waveform lines left and right
  for(let side of[-1,1]){
    const rng=mulberry32(side===1?11:22);
    ctx.strokeStyle=`rgba(${pr},${pg},${pb},0.25)`;ctx.lineWidth=1.5;ctx.beginPath();
    const x0=cx+side*W*0.12,x1=cx+side*W*0.47;
    ctx.moveTo(x0,cy);
    for(let x=x0;side===1?x<x1:x>x1;x+=side*4){
      const prog=Math.abs(x-x0)/(W*0.35);
      const wave=Math.sin(prog*Math.PI*12)*(1-prog)*H*0.06;
      ctx.lineTo(x,cy+wave);
    }
    ctx.stroke();
  }
  // Scan lines
  for(let y=0;y<H;y+=5){ctx.fillStyle="rgba(0,0,0,0.06)";ctx.fillRect(0,y,W,1);}
  // Corner targets
  for(const [ox,oy] of[[W*0.18,H*0.25],[W*0.82,H*0.25],[W*0.18,H*0.72],[W*0.82,H*0.72]]){
    ctx.strokeStyle=`rgba(${ar},${ag},${ab},0.2)`;ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(ox,oy,W*0.025,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox-W*0.03,oy);ctx.lineTo(ox+W*0.03,oy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox,oy-W*0.03);ctx.lineTo(ox,oy+W*0.03);ctx.stroke();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MINIMALIST BACKGROUNDS
// ══════════════════════════════════════════════════════════════════════════════
function dMono(ctx,W,H,t){
  // Clean white with a single precise horizon line and fine grid
  ctx.fillStyle=t.bg; ctx.fillRect(0,0,W,H);
  const [pr,pg,pb]=hexToRgb(t.primary);
  // Fine dot grid
  const gsp=Math.floor(W*0.028);
  for(let x=gsp;x<W;x+=gsp) for(let y=gsp;y<H;y+=gsp){
    ctx.fillStyle=`rgba(${pr},${pg},${pb},0.07)`;ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.fill();
  }
  // Horizon rule
  ctx.strokeStyle=`rgba(${pr},${pg},${pb},0.15)`;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(W*0.08,H*0.5);ctx.lineTo(W*0.92,H*0.5);ctx.stroke();
  // Two vertical rules
  for(const xf of[0.08,0.92]){
    ctx.strokeStyle=`rgba(${pr},${pg},${pb},0.08)`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(W*xf,H*0.15);ctx.lineTo(W*xf,H*0.85);ctx.stroke();
  }
}
function dDusk(ctx,W,H,t){
  // Warm vertical gradient
  const gd=ctx.createLinearGradient(0,0,0,H);
  gd.addColorStop(0,"#0D0A08");gd.addColorStop(0.5,"#2A1A10");gd.addColorStop(1,"#1A1210");
  ctx.fillStyle=gd;ctx.fillRect(0,0,W,H);
  // Soft glow on horizon
  const [pr,pg,pb]=hexToRgb(t.primary);
  const hg=ctx.createRadialGradient(W/2,H*0.62,0,W/2,H*0.62,W*0.55);
  hg.addColorStop(0,`rgba(${pr},${pg},${pb},0.12)`);hg.addColorStop(1,`rgba(${pr},${pg},${pb},0)`);
  ctx.fillStyle=hg;ctx.fillRect(0,0,W,H);
  // Thin horizon line
  ctx.strokeStyle=`rgba(${pr},${pg},${pb},0.3)`;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(W*0.15,H*0.62);ctx.lineTo(W*0.85,H*0.62);ctx.stroke();
  // Very faint grain
  const rng=mulberry32(55);
  for(let i=0;i<4000;i++){const x=rng()*W,y=rng()*H,a=rng()*0.04;ctx.fillStyle=`rgba(${pr},${pg},${pb},${a})`;ctx.fillRect(x,y,1,1);}
}
function dSlate(ctx,W,H,t){
  ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H);
  const [pr,pg,pb]=hexToRgb(t.primary),[ar,ag,ab]=hexToRgb(t.accent);
  // Thin horizontal rules
  for(const yf of[0.3,0.5,0.7]){
    ctx.strokeStyle=`rgba(${pr},${pg},${pb},0.07)`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,H*yf);ctx.lineTo(W,H*yf);ctx.stroke();
  }
  // Left-edge accent bar
  ctx.fillStyle=`rgba(${ar},${ag},${ab},0.15)`;ctx.fillRect(0,H*0.3,3,H*0.4);
  // Faint concentric rectangles
  for(let i=1;i<6;i++){
    const m=i*W*0.07;
    ctx.strokeStyle=`rgba(${pr},${pg},${pb},${0.035-i*0.005})`;ctx.lineWidth=1;
    ctx.strokeRect(m,m*(H/W),W-m*2,H-m*(H/W)*2);
  }
}
function dIvory(ctx,W,H,t){
  ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H);
  const [pr,pg,pb]=hexToRgb(t.primary);
  // Paper texture
  const rng=mulberry32(33);
  for(let i=0;i<6000;i++){const x=rng()*W,y=rng()*H;ctx.fillStyle=`rgba(${pr},${pg},${pb},${rng()*0.025})`;ctx.fillRect(x,y,1,1);}
  // Thin rule across middle
  ctx.strokeStyle=`rgba(${pr},${pg},${pb},0.12)`;ctx.lineWidth=0.8;
  ctx.beginPath();ctx.moveTo(W*0.12,H*0.5);ctx.lineTo(W*0.88,H*0.5);ctx.stroke();
  // Two margin rules (top + bottom)
  for(const yf of[0.12,0.88]){
    ctx.strokeStyle=`rgba(${pr},${pg},${pb},0.07)`;ctx.lineWidth=0.8;
    ctx.beginPath();ctx.moveTo(W*0.06,H*yf);ctx.lineTo(W*0.94,H*yf);ctx.stroke();
  }
}
function dInk(ctx,W,H,t){
  ctx.fillStyle="#040404";ctx.fillRect(0,0,W,H);
  const [pr,pg,pb]=hexToRgb(t.primary);
  // Single large ink circle, off-centre
  const ig=ctx.createRadialGradient(W*0.52,H*0.48,0,W*0.52,H*0.48,W*0.28);
  ig.addColorStop(0,`rgba(${pr},${pg},${pb},0.06)`);ig.addColorStop(1,`rgba(${pr},${pg},${pb},0)`);
  ctx.fillStyle=ig;ctx.fillRect(0,0,W,H);
  // Two crossing lines — very faint
  ctx.strokeStyle=`rgba(${pr},${pg},${pb},0.06)`;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,H*0.5);ctx.lineTo(W,H*0.5);ctx.stroke();
  ctx.beginPath();ctx.moveTo(W*0.5,0);ctx.lineTo(W*0.5,H);ctx.stroke();
  // Noise
  const rng=mulberry32(7);
  for(let i=0;i<2000;i++){const x=rng()*W,y=rng()*H;ctx.fillStyle=`rgba(${pr},${pg},${pb},${rng()*0.02})`;ctx.fillRect(x,y,1,1);}
}

// ══════════════════════════════════════════════════════════════════════════════
// NATURAL BACKGROUNDS
// ══════════════════════════════════════════════════════════════════════════════
function dForest(ctx,W,H,t){
  const gd=ctx.createLinearGradient(0,0,0,H);
  gd.addColorStop(0,"#060E06");gd.addColorStop(0.6,"#0E1A0E");gd.addColorStop(1,"#0A1408");
  ctx.fillStyle=gd;ctx.fillRect(0,0,W,H);
  const [pr,pg,pb]=hexToRgb(t.primary),rng=mulberry32(13);
  // Scattered organic dots (spores/light points)
  for(let i=0;i<200;i++){const x=rng()*W,y=rng()*H*0.8,sz=rng()*2,a=rng()*0.3;ctx.fillStyle=`rgba(${pr},${pg},${pb},${a})`;ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();}
  // Organic web of thin lines
  const pts=Array.from({length:18},()=>([rng()*W,rng()*H*0.75]));
  for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
    const d=Math.sqrt((pts[i][0]-pts[j][0])**2+(pts[i][1]-pts[j][1])**2);
    if(d<W*0.2){ctx.strokeStyle=`rgba(${pr},${pg},${pb},${0.08*(1-d/(W*0.2))})`;ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(...pts[i]);ctx.lineTo(...pts[j]);ctx.stroke();}
  }
  // Ground mist
  const mg=ctx.createLinearGradient(0,H*0.7,0,H);
  mg.addColorStop(0,`rgba(${pr},${pg},${pb},0)`);mg.addColorStop(1,`rgba(${pr},${pg},${pb},0.08)`);
  ctx.fillStyle=mg;ctx.fillRect(0,0,W,H);
}
function dOcean(ctx,W,H,t){
  const gd=ctx.createLinearGradient(0,0,0,H);
  gd.addColorStop(0,"#020810");gd.addColorStop(0.5,"#041018");gd.addColorStop(1,"#061820");
  ctx.fillStyle=gd;ctx.fillRect(0,0,W,H);
  const [pr,pg,pb]=hexToRgb(t.primary);
  // Caustic light ripples
  const rng=mulberry32(66);
  for(let i=0;i<40;i++){
    const x=rng()*W,y=rng()*H*0.7,rx=W*0.03+rng()*W*0.08,ry=rx*0.35,a=0.04+rng()*0.1;
    ctx.strokeStyle=`rgba(${pr},${pg},${pb},${a})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rng()*Math.PI,0,Math.PI*2);ctx.stroke();
  }
  // Soft depth gradient overlay
  const dg=ctx.createRadialGradient(W/2,H*0.35,0,W/2,H*0.35,W*0.6);
  dg.addColorStop(0,`rgba(${pr},${pg},${pb},0.07)`);dg.addColorStop(1,`rgba(${pr},${pg},${pb},0)`);
  ctx.fillStyle=dg;ctx.fillRect(0,0,W,H);
  // Horizontal wave bands
  for(let i=0;i<8;i++){
    const y=H*(0.15+i*0.1),a=0.04+i*0.008;
    ctx.strokeStyle=`rgba(${pr},${pg},${pb},${a})`;ctx.lineWidth=1;ctx.beginPath();
    for(let x=0;x<W;x+=4){ctx.lineTo(x,y+Math.sin(x/W*Math.PI*8+i)*H*0.008);}
    ctx.stroke();
  }
}
function dSand(ctx,W,H,t){
  const gd=ctx.createLinearGradient(0,0,0,H);
  gd.addColorStop(0,"#100C06");gd.addColorStop(0.4,"#1C1408");gd.addColorStop(1,"#251A0A");
  ctx.fillStyle=gd;ctx.fillRect(0,0,W,H);
  const [pr,pg,pb]=hexToRgb(t.primary);
  // Terrain contour bands
  for(let i=0;i<12;i++){
    const y=H*(0.25+i*0.06),a=0.05+i*0.012;
    ctx.strokeStyle=`rgba(${pr},${pg},${pb},${a})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);
    const rng=mulberry32(i*7);
    for(let x=0;x<=W;x+=W/80){ctx.lineTo(x,y+Math.sin(x/W*Math.PI*3+i*1.3)*(H*0.015+rng()*H*0.01));}
    ctx.stroke();
  }
  // Fine grain
  const rng=mulberry32(19);
  for(let i=0;i<5000;i++){const x=rng()*W,y=rng()*H;ctx.fillStyle=`rgba(${pr},${pg},${pb},${rng()*0.04})`;ctx.fillRect(x,y,1,1);}
}
function dAurora(ctx,W,H,t){
  ctx.fillStyle="#020609";ctx.fillRect(0,0,W,H);
  // Aurora bands — sweeping gradients
  const bands=[
    {y:0.2,col:"#00FFAA",w:0.35},{y:0.35,col:"#88FFCC",w:0.25},
    {y:0.15,col:"#00CCFF",w:0.2},{y:0.42,col:"#44FFAA",w:0.18},
  ];
  for(const b of bands){
    for(let i=0;i<3;i++){
      const [r2,g2,b2]=hexToRgb(b.col);
      const x=W*(0.1+Math.random()*0.8);
      const gd=ctx.createRadialGradient(x,H*b.y,0,x,H*b.y,W*b.w);
      gd.addColorStop(0,`rgba(${r2},${g2},${b2},0.12)`);gd.addColorStop(0.5,`rgba(${r2},${g2},${b2},0.04)`);gd.addColorStop(1,`rgba(${r2},${g2},${b2},0)`);
      ctx.fillStyle=gd;ctx.fillRect(0,0,W,H);
    }
  }
  // Stars
  const rng=mulberry32(44);
  for(let i=0;i<250;i++){const x=rng()*W,y=rng()*H*0.7,a=0.3+rng()*0.7;ctx.fillStyle=`rgba(255,255,255,${a*0.6})`;ctx.beginPath();ctx.arc(x,y,rng()<0.05?1.5:0.8,0,Math.PI*2);ctx.fill();}
}
function dStone(ctx,W,H,t){
  // Granite-like noise base
  ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H);
  const [pr,pg,pb]=hexToRgb(t.primary),[sr,sg,sb]=hexToRgb(t.secondary);
  const rng=mulberry32(88);
  for(let i=0;i<8000;i++){
    const x=rng()*W,y=rng()*H,a=rng()*0.04;
    const c=rng()<0.5?[pr,pg,pb]:[sr,sg,sb];
    ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${a})`;ctx.fillRect(x,y,rng()*3,rng()*3);
  }
  // Fracture lines
  for(let i=0;i<6;i++){
    const x1=rng()*W,y1=rng()*H,x2=x1+(rng()-0.5)*W*0.4,y2=y1+(rng()-0.5)*H*0.4;
    ctx.strokeStyle=`rgba(${sr},${sg},${sb},0.15)`;ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  // Moss patch glow
  const mg=ctx.createRadialGradient(W*0.35,H*0.55,0,W*0.35,H*0.55,W*0.3);
  mg.addColorStop(0,`rgba(${pr},${pg},${pb},0.08)`);mg.addColorStop(1,`rgba(${pr},${pg},${pb},0)`);
  ctx.fillStyle=mg;ctx.fillRect(0,0,W,H);
}

// ══════════════════════════════════════════════════════════════════════════════
// CORE GLOW + TEXT + CHROME
// ══════════════════════════════════════════════════════════════════════════════
function drawCoreGlow(ctx,W,H,t){
  const [r,g,b]=hexToRgb(t.primary);
  for(const [rad,a] of[[500,0.06],[280,0.08],[140,0.07]]){
    const gd=ctx.createRadialGradient(W/2,H*0.42,0,W/2,H*0.42,rad);
    gd.addColorStop(0,`rgba(${r},${g},${b},${a})`);gd.addColorStop(1,`rgba(${r},${g},${b},0)`);
    ctx.fillStyle=gd;ctx.fillRect(0,0,W,H);
  }
}

function drawFutText(ctx,W,H,t,name,role){
  const [r,g,b]=hexToRgb(t.primary),[ar,ag,ab]=hexToRgb(t.accent);
  const fs=Math.floor(W*0.1),cy=H*0.42;
  ctx.font=`900 ${fs}px 'Arial Black','Impact',sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";
  for(const [bl,a] of[[30,0.3],[15,0.5],[8,0.8]]){ctx.shadowColor=`rgba(${r},${g},${b},${a})`;ctx.shadowBlur=bl;ctx.fillStyle=`rgba(${r},${g},${b},0.15)`;ctx.fillText("TOTANGO",W/2,cy);}
  ctx.shadowColor=`rgba(${r},${g},${b},0.6)`;ctx.shadowBlur=20;ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillText("TOTANGO",W/2,cy);ctx.shadowBlur=0;ctx.shadowColor="transparent";
  const divY=cy+fs*0.65;
  ctx.strokeStyle=`rgba(${ar},${ag},${ab},0.4)`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W/2-W*0.125,divY);ctx.lineTo(W/2+W*0.125,divY);ctx.stroke();
  if(name){const nfs=Math.floor(W*0.018);ctx.font=`600 ${nfs}px 'Courier New',monospace`;ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillText(`USER: ${name.toUpperCase()}`,W/2,divY+nfs*1.8);}
  if(role){const rfs=Math.floor(W*0.014);ctx.font=`400 ${rfs}px 'Courier New',monospace`;ctx.fillStyle=`rgba(${ar},${ag},${ab},0.85)`;ctx.fillText(role.toUpperCase(),W/2,divY+Math.floor(W*0.018)*1.8+rfs*2);}
}

function drawMinText(ctx,W,H,t,name,role){
  const [r,g,b]=hexToRgb(t.primary),[ar,ag,ab]=hexToRgb(t.accent);
  const cy=H*0.48;
  // Clean wordmark — no glow, just weight
  const fs=Math.floor(W*0.088);
  ctx.font=`900 ${fs}px 'Arial Black','Helvetica Neue',sans-serif`;
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillStyle=`rgba(${r},${g},${b},0.92)`;
  ctx.fillText("TOTANGO",W/2,cy);
  // Thin rule
  const ruleY=cy+fs*0.65;
  ctx.strokeStyle=`rgba(${ar},${ag},${ab},0.35)`;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(W/2-W*0.1,ruleY);ctx.lineTo(W/2+W*0.1,ruleY);ctx.stroke();
  if(name){
    const nfs=Math.floor(W*0.016);
    ctx.font=`300 ${nfs}px 'Helvetica Neue','Arial',sans-serif`;
    ctx.letterSpacing="0.2em";
    ctx.fillStyle=`rgba(${r},${g},${b},0.7)`;
    ctx.fillText(name.toUpperCase(),W/2,ruleY+nfs*2);
  }
  if(role){
    const rfs=Math.floor(W*0.012);
    ctx.font=`300 ${rfs}px 'Helvetica Neue','Arial',sans-serif`;
    ctx.fillStyle=`rgba(${ar},${ag},${ab},0.6)`;
    ctx.fillText(role.toUpperCase(),W/2,ruleY+(Math.floor(W*0.016))*2+rfs*2.2);
  }
}

function drawNatText(ctx,W,H,t,name,role){
  const [r,g,b]=hexToRgb(t.primary),[ar,ag,ab]=hexToRgb(t.accent);
  const cy=H*0.46;
  // Soft glow
  const gd=ctx.createRadialGradient(W/2,cy,0,W/2,cy,W*0.35);
  gd.addColorStop(0,`rgba(${r},${g},${b},0.08)`);gd.addColorStop(1,`rgba(${r},${g},${b},0)`);
  ctx.fillStyle=gd;ctx.fillRect(0,0,W,H);
  // Wordmark with gentle shadow
  const fs=Math.floor(W*0.094);
  ctx.font=`900 ${fs}px 'Arial Black','Impact',sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.shadowColor=`rgba(${r},${g},${b},0.35)`;ctx.shadowBlur=40;
  ctx.fillStyle=`rgba(${r},${g},${b},0.88)`;ctx.fillText("TOTANGO",W/2,cy);
  ctx.shadowBlur=0;ctx.shadowColor="transparent";
  // Organic rule — hand-drawn feel
  const ruleY=cy+fs*0.65;
  ctx.strokeStyle=`rgba(${ar},${ag},${ab},0.45)`;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(W/2-W*0.11,ruleY);ctx.lineTo(W/2+W*0.11,ruleY);ctx.stroke();
  if(name){
    const nfs=Math.floor(W*0.017);
    ctx.font=`400 ${nfs}px Georgia,'Times New Roman',serif`;
    ctx.fillStyle=`rgba(${r},${g},${b},0.75)`;
    ctx.fillText(name,W/2,ruleY+nfs*2);
  }
  if(role){
    const rfs=Math.floor(W*0.012);
    ctx.font=`300 ${rfs}px Georgia,'Times New Roman',serif`;
    ctx.fillStyle=`rgba(${ar},${ag},${ab},0.65)`;
    ctx.fillText(role,W/2,ruleY+Math.floor(W*0.017)*2+rfs*2.2);
  }
}

function drawChrome(ctx,W,H,t){
  const [r,g,b]=hexToRgb(t.accent),sz=Math.floor(W*0.022),mg=Math.floor(W*0.03);
  [[mg,mg],[W-mg,mg],[mg,H-mg],[W-mg,H-mg]].forEach(([cx,cy])=>{
    ctx.strokeStyle=`rgba(${r},${g},${b},0.55)`;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(cx-sz/2,cy);ctx.lineTo(cx+sz/2,cy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx,cy-sz/2);ctx.lineTo(cx,cy+sz/2);ctx.stroke();
  });
  const barY=H-mg*0.7;ctx.strokeStyle=`rgba(${r},${g},${b},0.12)`;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(mg*2,barY);ctx.lineTo(W-mg*2,barY);ctx.stroke();
  const fs=Math.floor(W*0.008);ctx.font=`${fs}px 'Courier New',monospace`;ctx.textAlign="center";ctx.fillStyle=`rgba(${r},${g},${b},0.35)`;
  ["SYS:OK","NET:SECURE","VER:4.1.0"].forEach((item,i)=>ctx.fillText(item,W*(0.35+i*0.15),barY+fs*1.8));
}

// ─── Shared UI styles ─────────────────────────────────────────────────────────
const S = {
  input:   { width:"100%", background:"rgba(178,255,89,0.05)", border:"1px solid rgba(178,255,89,0.18)", borderRadius:4, padding:"9px 12px", color:"#B2FF59", fontFamily:"'Courier New',monospace", fontSize:12, outline:"none", boxSizing:"border-box", letterSpacing:1 },
  select:  { width:"100%", background:"#0A1A0A", border:"1px solid rgba(178,255,89,0.18)", borderRadius:4, padding:"9px 12px", color:"#B2FF59", fontFamily:"'Courier New',monospace", fontSize:11, outline:"none", cursor:"pointer", letterSpacing:0.5 },
  label:   { fontSize:10, color:"rgba(178,255,89,0.45)", marginBottom:5, letterSpacing:1, display:"block" },
  section: { fontSize:9, letterSpacing:4, color:"rgba(178,255,89,0.4)", marginBottom:12, textTransform:"uppercase" },
};

const FAMILY_COLORS = {
  futuristic: { active:"rgba(178,255,89,0.12)", border:"rgba(178,255,89,0.5)", text:"#B2FF59", dim:"rgba(178,255,89,0.4)" },
  minimalist: { active:"rgba(220,220,220,0.1)",  border:"rgba(220,220,220,0.4)", text:"#DCDCDC", dim:"rgba(220,220,220,0.35)" },
  natural:    { active:"rgba(100,200,120,0.1)",  border:"rgba(100,200,120,0.4)", text:"#90D8A0", dim:"rgba(100,200,120,0.35)" },
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function TotangoWallpaperApp() {
  const [selectedTheme, setSelectedTheme] = useState(ALL_THEMES[0]);
  const [openFamily, setOpenFamily]       = useState("futuristic");
  const [name, setName]                   = useState("Catalin");
  const [selectedRole, setSelectedRole]   = useState("Activation Partner");
  const [customRole, setCustomRole]       = useState("");
  const [isCustomRole, setIsCustomRole]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedRes, setSelectedRes]     = useState(RESOLUTIONS[0]);
  const [customW, setCustomW]             = useState(1920);
  const [customH, setCustomH]             = useState(1080);
  const [detection, setDetection]         = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    const d = detectResolution();
    setDetection(d);
    if (d.match) setSelectedRes(d.match);
  }, []);

  const effectiveRole = isCustomRole ? customRole : selectedRole;
  const dlW = selectedRes.id === "custom" ? Number(customW) : selectedRes.w;
  const dlH = selectedRes.id === "custom" ? Number(customH) : selectedRes.h;
  const isDetected = detection?.match?.id === selectedRes.id;
  const fc = FAMILY_COLORS[selectedTheme.family];

  const renderPreview = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas || !dlW || !dlH) return;
    const aspect = dlW / dlH;
    canvas.width  = Math.round(Math.min(900, 900 * aspect));
    canvas.height = Math.round(Math.min(900, 900 / aspect));
    drawWallpaper(canvas, selectedTheme, name, effectiveRole);
  }, [selectedTheme, name, effectiveRole, dlW, dlH]);

  useEffect(() => { renderPreview(); }, [renderPreview]);

  const handleDownload = () => {
    setIsDownloading(true);
    const canvas = document.createElement("canvas");
    canvas.width = dlW; canvas.height = dlH;
    drawWallpaper(canvas, selectedTheme, name, effectiveRole);
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `totango-${selectedTheme.id}-${name||"team"}-${dlW}x${dlH}.png`;
      a.click(); URL.revokeObjectURL(url); setIsDownloading(false);
    }, "image/png");
  };

  const handleRoleChange = val => { setIsCustomRole(val==="Custom…"); setSelectedRole(val); };
  const handleResChange  = id  => { const r=RESOLUTIONS.find(r=>r.id===id); if(r) setSelectedRes(r); };

  const selectTheme = t => {
    setSelectedTheme(t);
    setOpenFamily(t.family);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#080E08", color:"#B2FF59", fontFamily:"'Courier New',monospace", display:"flex", flexDirection:"column" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom:"1px solid rgba(178,255,89,0.15)", padding:"15px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(178,255,89,0.03)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:20, fontWeight:900, letterSpacing:6, fontFamily:"'Arial Black',sans-serif", textShadow:"0 0 20px rgba(178,255,89,0.5)" }}>TOTANGO</span>
          <div style={{ height:16, width:1, background:"rgba(178,255,89,0.2)" }} />
          <span style={{ fontSize:10, letterSpacing:3, color:"rgba(178,255,89,0.5)" }}>WALLPAPER GENERATOR</span>
        </div>
        <span style={{ fontSize:9, color:"rgba(178,255,89,0.3)", letterSpacing:2 }}>SYS:ACTIVE</span>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{ width:300, flexShrink:0, borderRight:"1px solid rgba(178,255,89,0.1)", padding:"18px 16px", display:"flex", flexDirection:"column", gap:20, overflowY:"auto" }}>

          {/* Style Families */}
          <div>
            <div style={S.section}>// WALLPAPER STYLE</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {FAMILIES.map(family => {
                const fc2 = FAMILY_COLORS[family.id];
                const isOpen = openFamily === family.id;
                const hasSelected = selectedTheme.family === family.id;
                return (
                  <div key={family.id}>
                    {/* Family header */}
                    <button
                      onClick={() => setOpenFamily(isOpen ? null : family.id)}
                      style={{ width:"100%", background:hasSelected?"rgba(178,255,89,0.06)":"transparent", border:`1px solid ${hasSelected?fc2.border:"rgba(178,255,89,0.1)"}`, borderRadius:4, padding:"9px 12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", textAlign:"left", transition:"all 0.15s" }}
                    >
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:14, color:fc2.text }}>{family.icon}</span>
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:fc2.text, letterSpacing:2, fontFamily:"'Arial Black',sans-serif" }}>{family.label.toUpperCase()}</div>
                          <div style={{ fontSize:9, color:fc2.dim, marginTop:1 }}>{family.themes.length} styles</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {hasSelected && (
                          <div style={{ width:6, height:6, borderRadius:"50%", background:fc2.text, boxShadow:`0 0 6px ${fc2.text}` }} />
                        )}
                        <span style={{ color:fc2.dim, fontSize:10, transition:"transform 0.2s", display:"inline-block", transform:isOpen?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
                      </div>
                    </button>

                    {/* Theme list */}
                    {isOpen && (
                      <div style={{ marginTop:4, marginLeft:12, display:"flex", flexDirection:"column", gap:4 }}>
                        {family.themes.map(t => (
                          <button
                            key={t.id}
                            onClick={() => selectTheme({...t, family:family.id})}
                            style={{ background:selectedTheme.id===t.id?fc2.active:"transparent", border:`1px solid ${selectedTheme.id===t.id?fc2.border:"rgba(178,255,89,0.07)"}`, borderRadius:4, padding:"7px 10px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", textAlign:"left", transition:"all 0.12s" }}
                          >
                            <div>
                              <div style={{ fontSize:10, fontWeight:700, color:selectedTheme.id===t.id?fc2.text:"rgba(178,255,89,0.55)", letterSpacing:0.8 }}>{t.name}</div>
                              <div style={{ fontSize:9, color:"rgba(178,255,89,0.3)", marginTop:1 }}>{t.desc}</div>
                            </div>
                            <div style={{ width:20, height:20, borderRadius:3, background: parseInt(t.bg.slice(1,3),16) > 100 ? "transparent" : t.bg, border:`1.5px solid ${parseInt(t.bg.slice(1,3),16) > 100 ? t.secondary : t.primary}`, flexShrink:0, boxShadow:selectedTheme.id===t.id?`0 0 6px ${t.primary}66`:"none" }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Identity */}
          <div>
            <div style={S.section}>// USER IDENTITY</div>
            <div style={{ marginBottom:10 }}>
              <span style={S.label}>NAME</span>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name…" style={S.input} />
            </div>
            <div>
              <span style={S.label}>ROLE / TITLE</span>
              <select value={selectedRole} onChange={e=>handleRoleChange(e.target.value)} style={{ ...S.select, marginBottom:isCustomRole?7:0 }}>
                {ROLES.map(r=><option key={r} value={r} style={{background:"#0A1A0A"}}>{r}</option>)}
              </select>
              {isCustomRole && <input value={customRole} onChange={e=>setCustomRole(e.target.value)} placeholder="Enter custom role…" style={S.input} />}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <div style={{ ...S.section, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>// RESOLUTION</span>
              {isDetected && <span style={{ fontSize:8, background:"rgba(178,255,89,0.1)", border:"1px solid rgba(178,255,89,0.3)", borderRadius:3, padding:"2px 6px" }}>AUTO-DETECTED</span>}
            </div>
            {detection && (
              <div style={{ background:"rgba(178,255,89,0.03)", border:"1px solid rgba(178,255,89,0.1)", borderRadius:4, padding:"6px 10px", marginBottom:8, fontSize:9, color:"rgba(178,255,89,0.4)", lineHeight:1.8 }}>
                <div>SCREEN <span style={{color:"#B2FF59"}}>{detection.detected.w}×{detection.detected.h}</span> · DPR <span style={{color:"#B2FF59"}}>{window.devicePixelRatio||1}×</span></div>
                <div>MATCH <span style={{color:"#B2FF59"}}>{detection.match?.label||"Unknown"}</span></div>
              </div>
            )}
            <select value={selectedRes.id} onChange={e=>handleResChange(e.target.value)} style={S.select}>
              {RESOLUTIONS.map(r=>(
                <option key={r.id} value={r.id} style={{background:"#0A1A0A"}}>
                  {r.id===detection?.match?.id?"✓ ":""}{r.label}{r.w?` — ${r.w}×${r.h}`:""}
                </option>
              ))}
            </select>
            {selectedRes.id==="custom" && (
              <div style={{ display:"flex", gap:7, marginTop:8 }}>
                <div style={{flex:1}}><span style={S.label}>WIDTH</span><input type="number" value={customW} onChange={e=>setCustomW(e.target.value)} style={S.input} /></div>
                <div style={{flex:1}}><span style={S.label}>HEIGHT</span><input type="number" value={customH} onChange={e=>setCustomH(e.target.value)} style={S.input} /></div>
              </div>
            )}
            <div style={{ marginTop:6, fontSize:9, color:"rgba(178,255,89,0.28)", letterSpacing:1, textAlign:"center" }}>
              {dlW}×{dlH}px{selectedRes.dpr>1&&<span style={{color:"rgba(178,255,89,0.45)"}}> @ {selectedRes.dpr}× RETINA</span>}
            </div>
          </div>

          {/* Download */}
          <div style={{ marginTop:"auto", paddingTop:8 }}>
            <button onClick={handleDownload} disabled={isDownloading} style={{ width:"100%", background:isDownloading?"rgba(178,255,89,0.06)":fc.active, border:`1px solid ${isDownloading?"rgba(178,255,89,0.2)":fc.border}`, borderRadius:4, padding:"12px 20px", color:fc.text, fontFamily:"'Courier New',monospace", fontSize:11, fontWeight:700, letterSpacing:3, cursor:isDownloading?"wait":"pointer", transition:"all 0.2s", textShadow:`0 0 10px ${fc.text}55` }}>
              {isDownloading ? "⏳ RENDERING…" : `⬇ DOWNLOAD ${dlW}×${dlH}`}
            </button>
            {selectedRes.id!=="custom" && <div style={{ fontSize:9, color:"rgba(178,255,89,0.2)", textAlign:"center", marginTop:6, letterSpacing:1 }}>{selectedRes.label.toUpperCase()}</div>}
          </div>
        </div>

        {/* ── Preview ── */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:28, background:"rgba(0,0,0,0.2)" }}>
          <div style={{ position:"relative", width:"100%", maxWidth:860 }}>
            {/* Active style badge */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:10 }}>
              <div style={{ fontSize:9, letterSpacing:3, color:`${fc.text}88` }}>
                {FAMILIES.find(f=>f.id===selectedTheme.family)?.label.toUpperCase()} · {selectedTheme.name.toUpperCase()}
                {name && ` · ${name.toUpperCase()}`}
              </div>
            </div>
            <div style={{ border:`1px solid ${fc.border}33`, borderRadius:6, overflow:"hidden", boxShadow:`0 0 40px ${fc.text}08, 0 20px 60px rgba(0,0,0,0.6)`, aspectRatio:`${dlW}/${dlH}`, width:"100%", background:"#000" }}>
              <canvas ref={previewRef} style={{ display:"block", width:"100%", height:"100%" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:9, color:"rgba(178,255,89,0.18)", letterSpacing:2 }}>
              <span>PREVIEW — SCALED TO FIT</span>
              <span>NATIVE {dlW}×{dlH}px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
