const radians = Math.PI / 180;
const earth = 6371008.8;
export const yearRound = s => /^year[ -]round$/i.test(s || '');
export function distance(a, b) {
  const lat = (b[1]-a[1]) * radians;
  const lon = (b[0]-a[0]) * radians;
  const h = Math.sin(lat/2)**2 + Math.cos(a[1]*radians)*Math.cos(b[1]*radians)*Math.sin(lon/2)**2;
  return 2 * earth * Math.asin(Math.sqrt(Math.min(1,h)));
}

function project(p, a, b) {
  const sx = earth * radians * Math.cos(p[1] * radians), sy = earth*radians;
  const x = (b[0]-a[0])*sx, y = (b[1]-a[1])*sy;
  const px = (p[0]-a[0])*sx, py = (p[1]-a[1])*sy;
  const t = Math.max(0, Math.min(1,(px*x+py*y)/(x*x+y*y)));
  return { t, offset: Math.hypot(px-t*x,py-t*y) };
}

function inside(p, ring) {
  let status = false;
  for (let i=0; i<ring.length-1; i++) {
    const a=ring[i], b=ring[i+1];
    if ((a[1]>p[1]) !== (b[1]>p[1]) && p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) status=!status;
  }
  return status;
}
const cross=(x,y,u,v)=>x*v-y*u;
function portions(a,b,ring) {
  const fractions = [0,1], dx=b[0]-a[0], dy=b[1]-a[1];
  for (let i=1;i<ring.length;i++) {
    const c=ring[i-1], d=ring[i], ex=d[0]-c[0], ey=d[1]-c[1];
    const den=cross(dx,dy,ex,ey);
    if (!den) continue;
    const ax=c[0]-a[0], ay=c[1]-a[1];
    const t=cross(ax,ay,ex,ey)/den, u=cross(ax,ay,dx,dy)/den;
    if (t>0 && t<1 && u>=0 && u<=1) fractions.push(t);
  }
  fractions.sort((x,y)=>x-y);
  const parts=[];
  for (let i=1;i<fractions.length;i++) {
    const from=fractions[i-1], to=fractions[i];
    if (to-from<1e-10) continue;
    const t=(from+to)/2;
    parts.push({from,to,covered:inside([a[0]+t*dx,a[1]+t*dy],ring)});
  }
  return parts;
}

export function analyze(tracks, data, radius, filter) {
  const visits=[], sections=[], gaps=[];
  let total=0;
  for (const [track,points] of tracks.entries()) {
    let active=new Map();
    for (let i=1;i<points.length;i++) {
      const a=points[i-1], b=points[i], length=distance(a,b);
      if (!length) continue;
      const parts=portions(a,b,data.boundary);
      const next=new Map();
      for (const part of parts) {
        const last=sections.at(-1);
        if (last && last.track===track && last.covered===part.covered) last.to=total+length*part.to;
        else sections.push({track,covered:part.covered,from:total+length*part.from,to:total+length*part.to});
      }
      for (const [idx,facility] of data.facilities.entries()) {
        if (facility.kind==='Fountain' && filter==='year' && !yearRound(facility.season)) continue;
        const p=facility.xy, margin=radius/65000;
        if (p[0]<Math.min(a[0],b[0])-margin || p[0]>Math.max(a[0],b[0])+margin ||
            p[1]<Math.min(a[1],b[1])-margin || p[1]>Math.max(a[1],b[1])+margin) continue;
        const {t,offset}=project(p,a,b);
        if (offset>radius || !parts.some(s=>s.covered && t>=s.from && t<=s.to)) continue;
        const candidate={facility,track,at:total+t*length,offset};
        const prev=active.get(idx);
        next.set(idx,prev && prev.offset<=offset ? prev : candidate);
      }
      for (const [idx,v] of active) if (!next.has(idx)) visits.push(v);
      active=next;
      total+=length;
    }
    visits.push(...active.values());
  }
  visits.sort((a,b)=>a.at-b.at);
  for (const s of sections.filter(s=>s.covered)) {
    const stops=visits.filter(v=>v.track===s.track && v.at>=s.from && v.at<=s.to && v.facility.kind==='Fountain');
    let from=s.from, label='Covered section starts';
    for (const v of stops) {
      const gap={from,to:v.at,start:label,end:v.facility.name};
      gaps.push(gap);
      v.gap=v.at-from;
      from=v.at; label=v.facility.name;
    }
    gaps.push({from,to:s.to,start:label,end:'Covered section ends'});
  }
  const longest=gaps.reduce((best,g)=>!best || g.to-g.from>best.to-best.from ? g : best,null);
  return {total,visits,sections,longest};
}
