const $=id=>document.getElementById(id);
const km=m=>(m/1000).toFixed(2);
const node=(tag,text,css)=>{const e=document.createElement(tag); if(text!=null)e.textContent=text; if(css)e.className=css; return e;};
let data,tracks,title,worker,last;
function reset(){tracks=[data.route];title='English Bay to Second Beach';$('file').value='';$('error').textContent='';calculate();}
function calculate(){
  if(!data)return;
  worker?.terminate();
  worker=new Worker('./worker.mjs',{type:'module'});
  $('summary').textContent='Measuring route…';
  worker.onmessage=({data:result})=>{last=result;draw();};
  worker.onerror=()=>{$('error').textContent='The route could not be measured. Try the example or a smaller GPX.';};
  worker.postMessage({tracks,records:data,radius:Number($('radius').value),filter:$('filter').value});
}
function draw(){
  const {total,visits,sections,longest}=last;
  $('routeName').textContent=title;
  const summary=$('summary'); summary.replaceChildren(node('span','Longest covered gap','eyebrow'),node('strong',longest ? km(longest.to-longest.from)+' km' : 'Outside coverage'),node('p',longest ? longest.start+' → '+longest.end : 'This track does not enter the City of Vancouver.'));
  const visible=visits.filter(v=>$('wash').checked || v.facility.kind==='Fountain');
  const diagram=$('diagram'); diagram.replaceChildren(); diagram.setAttribute('aria-hidden','true');
  for(const s of sections){const el=node('div',null,s.covered?'line':'line outside');el.style.left=(100*s.from/total)+'%';el.style.width=(100*(s.to-s.from)/total)+'%';diagram.append(el);}
  for(const v of visible){const el=node('i',null,v.facility.kind==='Fountain'?'dot':'dot wash');el.style.left=(100*v.at/total)+'%';diagram.append(el);}
  const outside=sections.filter(s=>!s.covered);
  $('coverage').textContent=km(total)+' km of recorded track · '+tracks.length+' track section'+(tracks.length===1?'':'s')+'. '+(outside.length ? 'Outside city coverage at '+outside.map(s=>km(s.from)+'–'+km(s.to)+' km').join(', ')+'.':'Entire track within Vancouver coverage.')+' Gaps include the ends of each covered section. Separate GPX segments are measured independently.';
  const list=$('stops');list.replaceChildren();
  if(!visible.length)list.append(node('p','No matching facilities. Try increasing the search distance or changing the season filter.'));
  for(const {facility:f,at,offset,gap} of visible){
    const row=node('article'),pos=node('div',null,'position');pos.append(node('b',km(at)),node('small','km along'));row.append(pos);
    const body=node('div');body.append(node('small',f.kind+' · '+Math.round(offset)+' m off route'),node('h4',f.name));
    if(f.location && f.location!==f.name)body.append(node('p',f.location));
    if(f.kind==='Fountain')body.append(node('p',(f.season || 'Operating season unknown')+' · '+km(gap || 0)+' km since preceding refill or section start'));
    else body.append(node('p','Winter: '+(f.winter || 'unknown')+' · Summer: '+(f.summer || 'unknown')+' · Wheelchair access: '+(f.accessible || 'unknown')));
    if(f.note)body.append(node('p',f.note));
    row.append(body);list.append(row);
  }
}
function readGPX(xml){
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror') || doc.documentElement.localName!=='gpx')throw Error('Choose a valid GPX track or route.');
  const by=(parent,key)=>Array.from(parent.children).filter(e=>e.localName===key);
  const make=(group,tag)=>by(group,tag).map(e=>{
    const x=e.getAttribute('lon'),y=e.getAttribute('lat'),lon=Number(x),lat=Number(y);
    if(!x?.trim()||!y?.trim()||!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('A GPX point has invalid coordinates.');
    return [lon,lat];
  });
  let groups=by(doc.documentElement,'trk').flatMap(t=>by(t,'trkseg').map(s=>make(s,'trkpt'))).filter(t=>t.length>=2);
  if(!groups.length)groups=by(doc.documentElement,'rte').map(s=>make(s,'rtept')).filter(t=>t.length>=2);
  if(!groups.length || !groups.some(g=>g.some(p=>p[0]!==g[0][0] || p[1]!==g[0][1])))throw Error('The GPX needs a track or route with distinct points.');
  if(groups.reduce((n,g)=>n+g.length,0)>50000)throw Error('Choose a GPX with at most 50,000 points.');
  return groups;
}
$('file').onchange=async()=>{try{const f=$('file').files[0];if(!f)return;if(f.size>12*1024*1024)throw Error('Choose a GPX smaller than 12 MB.');tracks=readGPX(await f.text());title=f.name;$('error').textContent='';calculate();}catch(e){$('error').textContent=e.message;$('file').value='';}};
$('example').onclick=()=>{if(data)reset();}; for(const id of ['radius','filter'])$(id).onchange=calculate;
$('wash').onchange=()=>{if(last)draw();};
try{
  const [records,meta]=await Promise.all(['data','status'].map(async f=>{const r=await fetch('./'+f+'.json');if(!r.ok)throw Error();return r.json();}));
  data=records;$('dates').textContent='Retrieved '+meta.retrieved+'. '+meta.fountains+' fountain records (city release '+meta.dates.fountains+', '+meta.unknown+' unknown seasons) and '+meta.washrooms+' washrooms (city release '+meta.dates.washrooms+').';
  reset();
}catch{$('summary').textContent='City data could not be loaded. Reload this page to retry.';}
