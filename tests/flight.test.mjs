import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sampleFlight,flightBlocked,flightCaption,flightClock,FLIGHT_DURATION,FIRST_FLIGHT_DURATION,SECOND_FLIGHT_START} from '../src/flight.js';
const raw=JSON.parse(await readFile(new URL('../public/assets/collisions.json',import.meta.url),'utf8'));
const boxes=raw.map(b=>({min:{x:b.min[0],y:b.min[2],z:-b.max[1]},max:{x:b.max[0],y:b.max[2],z:-b.min[1]}}));
test('chancel arch stays open below a solid wall and engaged vault console',()=>{
  assert(!flightBlocked({x:8,y:2,z:0},boxes),'walkable opening');
  assert(flightBlocked({x:8,y:5.8,z:0},boxes),'solid wall above the lower arch');
  assert(raw.some(b=>b.name==='Chorbogen · wandgebundene Gewölbekonsole'));
  for(const x of [-4,2])assert(flightBlocked({x,y:2,z:0},boxes),'both central piers remain');
});
test('two different flights use opposite portals without intersecting solids or spinning abruptly',()=>{
  const doors=[[],[]];let previousDirection;
  for(let t=0;t<=FLIGHT_DURATION;t+=.025){
    const {position:p,look,leg,flight}=sampleFlight(t);assert(!flightBlocked(p,boxes),`Drone collision at ${t}: ${p.toArray()}`);assert(p.distanceTo(look)>1.5);
    const direction=look.clone().sub(p).normalize();if(previousDirection)assert(direction.angleTo(previousDirection)/.025<1.5,'no abrupt camera spin');previousDirection=direction;
    const door=Math.abs(p.x+10)<.08&&Math.abs(p.z)<.7&&p.y<2.1?'west':Math.abs(p.z-12)<.08&&Math.abs(p.x+1)<.7&&p.y<2.1?'south':null;
    if(door&&doors[flight-1].at(-1)!==door)doors[flight-1].push(door);
    const caption=flightCaption(leg,t);assert(caption.text&&caption.text.length<65);assert(caption.opacity>=0&&caption.opacity<=1);
  }
  assert.deepEqual(doors,[['west','south'],['south','west']]);
  assert(sampleFlight(FIRST_FLIGHT_DURATION-.001).position.distanceTo(sampleFlight(FIRST_FLIGHT_DURATION+.001).position)<.02);
  assert.equal(sampleFlight(FIRST_FLIGHT_DURATION).leg,SECOND_FLIGHT_START);
  const end=sampleFlight(FLIGHT_DURATION);assert(end.done);for(const [i,n] of [-11.5,1.66,0].entries())assert(Math.abs(end.position.toArray()[i]-n)<1e-8);for(const [i,n] of [-9,1.66,0].entries())assert(Math.abs(end.look.toArray()[i]-n)<1e-8);
  assert(end.position.distanceTo(sampleFlight(FLIGHT_DURATION-.025).position)<.001,'camera decelerates to visitor eye height');
});
test('exactly 24 hours pass during both flights, ending at 05:00 the next day',()=>{
  assert.deepEqual(flightClock('2026-12-31',0),{date:'2026-12-31',time:300});
  assert.deepEqual(flightClock('2026-12-31',FIRST_FLIGHT_DURATION),{date:'2026-12-31',time:1020});
  assert.deepEqual(flightClock('2026-12-31',FLIGHT_DURATION),{date:'2027-01-01',time:300});
  assert.deepEqual(flightClock('2026-12-31',FLIGHT_DURATION+10),{date:'2027-01-01',time:300});
});

test('both complete flight curves keep clear of tree crowns including projecting leaves',async()=>{
  const {trees}=JSON.parse(await readFile(new URL('../public/assets/landscape.json',import.meta.url),'utf8'));
  // Leaves extend beyond the crown's sampling ellipsoid. Add two metres for
  // the leaf cards, wind, and a visible camera clearance; inspect the spline.
  for(let t=0;t<=FLIGHT_DURATION;t+=.025){
    const p=sampleFlight(t).position;
    for(const tree of trees){
      const horizontal=tree.radius+2,vertical=tree.radius*.8+2;
      const distance=((p.x-tree.x)/horizontal)**2+((p.z+tree.y)/horizontal)**2+((p.y-tree.crownZ)/vertical)**2;
      assert(distance>=1,`Flight intersects crown clearance at ${t.toFixed(3)} s, tree ${tree.seed}`);
    }
  }
});
