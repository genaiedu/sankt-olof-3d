import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sampleFlight,flightBlocked,flightCaption,FLIGHT_DURATION} from '../src/flight.js';
const raw=JSON.parse(await readFile(new URL('../public/assets/collisions.json',import.meta.url),'utf8'));
const boxes=raw.map(b=>({min:{x:b.min[0],y:b.min[2],z:-b.max[1]},max:{x:b.max[0],y:b.max[2],z:-b.min[1]}}));
test('chancel arch stays open below a solid wall and engaged vault console',()=>{
  assert(!flightBlocked({x:8,y:2,z:0},boxes),'walkable opening');
  assert(flightBlocked({x:8,y:5.8,z:0},boxes),'solid wall above the lower arch');
  assert(raw.some(b=>b.name==='Chorbogen · wandgebundene Gewölbekonsole'));
  for(const x of [-4,2])assert(flightBlocked({x,y:2,z:0},boxes),'both central piers remain');
});
test('closed drone loop passes through the portal, explores the interior and avoids exported solids',()=>{
  let interior=false,portal=false,exit=false;
  for(let t=0;t<FLIGHT_DURATION;t+=.025){
    const {position:p,look,leg}=sampleFlight(t);assert(!flightBlocked(p,boxes),`Drone collision at ${t}: ${p.toArray()}`);assert(p.distanceTo(look)>.15);
    if(p.x>-8&&p.x<14&&Math.abs(p.z)<4&&p.y<3)interior=true;
    if(Math.abs(p.x+10)<.1&&Math.abs(p.z)<.7&&p.y<2.1){portal=true;if(t>FLIGHT_DURATION*.7)exit=true;}
    const caption=flightCaption(leg,t);assert(caption.text&&caption.text.length<65);assert(caption.opacity>=0&&caption.opacity<=1);
  }
  assert(interior&&portal&&exit);assert(sampleFlight(0).position.distanceTo(sampleFlight(FLIGHT_DURATION).position)<1e-8);assert(sampleFlight(0).look.distanceTo(sampleFlight(FLIGHT_DURATION).look)<1e-8);
  assert(sampleFlight(0).position.distanceTo(sampleFlight(FLIGHT_DURATION-.001).position)<.02,'loop seam must be continuous');
});
