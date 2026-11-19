import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyze} from '../web/route.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../web/data.json',import.meta.url)));
const rect={boundary:[[0,0],[2,0],[2,2],[0,2],[0,0]],facilities:[]};
test('A segment crossing two boundaries produces one covered gap',()=>{
 const r=analyze([[[-1,1],[3,1]]],rect,100,'all');
 assert.deepEqual(r.sections.map(s=>s.covered),[false,true,false]);
 assert.ok(Math.abs((r.longest.to-r.longest.from)/r.total-0.5)<1e-6);
});
test('Discontinuous track segments cannot create a fictitious gap',()=>{
 const r=analyze([[[0.2,1],[0.4,1]],[[1.6,1],[1.8,1]]],rect,100,'all');
 assert.equal(r.sections.length,2);assert.ok(r.longest.to-r.longest.from<r.total*.51);
});
test('The City example distinguishes posted seasons and washroom hours',()=>{
 const year=analyze([data.route],data,200,'year'),all=analyze([data.route],data,200,'all');
 assert.ok(year.visits.some(v=>v.facility.name.includes('Second Beach') && v.facility.kind==='Fountain'));
 assert.ok(!year.visits.some(v=>v.facility.id==='DFPB0152'));assert.ok(all.visits.some(v=>v.facility.id==='DFPB0152'));
 assert.ok(all.visits.some(v=>v.facility.name==='English Bay Beach Park' && /10:00/.test(v.facility.winter)));
 assert.ok(year.longest.to-year.longest.from>all.longest.to-all.longest.from);
});
test('Return passes count separately and washrooms do not break refill gaps',()=>{
 const d={...rect,facilities:[{xy:[.4,1],kind:'Fountain',name:'Return point',season:'year-round'},{xy:[.8,1],kind:'Washroom'}]};
 const r=analyze([[[.2,1],[.6,1],[.8,1],[.6,1],[.2,1]]],d,100,'all');
 assert.equal(r.visits.filter(v=>v.facility.kind==='Fountain').length,2);
 assert.ok(r.longest.to-r.longest.from>80000);
});

test('An out-and-back with sparse GPX vertices visits the same fountain twice',()=>{
 const d={...rect,facilities:[{xy:[.4,1],kind:'Fountain',name:'Return point',season:'year-round'}]};
 const r=analyze([[[.2,1],[.8,1],[.2,1]]],d,100,'all');
 assert.equal(r.visits.length,2);assert.ok(r.visits[1].at>r.visits[0].at);
});
