import test from 'node:test';
import assert from 'node:assert/strict';
import {clockText,nextDate,localInstant,solarEvents,celestial,celestialDirection,steeringStep,angleDifference} from '../src/daylight.js';

test('Swedish civil time includes summer time independently of visitor timezone',()=>{
  assert.equal(localInstant('2026-06-21',720).toISOString(),'2026-06-21T10:00:00.000Z');
  assert.equal(localInstant('2026-12-21',720).toISOString(),'2026-12-21T11:00:00.000Z');
  assert.equal(nextDate('2028-02-28'),'2028-02-29');assert.equal(nextDate('2026-12-31'),'2027-01-01');
  assert.equal(clockText(1439),'23:59');assert.equal(clockText(1440),'00:00');
});
test('sun, moon and sunrise/sunset follow location/date rather than an arbitrary color loop',()=>{
  const noon=celestial('2026-09-22',780),night=celestial('2026-09-22',30),times=solarEvents('2026-09-22');
  assert(noon.sun.altitude>25*Math.PI/180);assert(night.sun.altitude<-25*Math.PI/180);
  assert(times.sunrise>330&&times.sunrise<480);assert(times.sunset>1050&&times.sunset<1230);
  assert(Number.isFinite(noon.moon.altitude));assert(noon.illumination.fraction>=0&&noon.illumination.fraction<=1);
  const d=celestialDirection(noon.sun);assert(Math.abs(Math.hypot(...d)-1)<1e-10);assert(d[1]>0&&d[2]>0,'noon sun is above the southern horizon');
  assert(solarEvents('2026-06-21').sunset-solarEvents('2026-06-21').sunrise>solarEvents('2026-12-21').sunset-solarEvents('2026-12-21').sunrise);
});
test('steering ramps gently and stops immediately when released',()=>{
  const start=steeringStep(0,0,1,.016);assert(start.yaw<0&&start.velocity>0&&start.velocity<1.25);
  const held=steeringStep(start.yaw,start.velocity,1,.016);assert(held.velocity>start.velocity);
  const released=steeringStep(held.yaw,held.velocity,0,.016);assert.equal(released.yaw,held.yaw);assert.equal(released.velocity,0);
  assert(steeringStep(0,0,-1,.016).yaw>0);
  assert(Math.abs(angleDifference(-Math.PI+.05,Math.PI-.05)-.1)<1e-10);
});

import {blendInterior,interiorLightValues} from '../src/interior-lighting.js';
test('all portal transitions adapt lighting continuously in both directions at any frame rate',()=>{
  for(const inside of [true,false]){
    let weight=inside?0:1,previous=weight;
    for(let frame=0;frame<180;frame++){
      weight=blendInterior(weight,inside,1/60);
      assert(weight>=0&&weight<=1);
      assert(Math.abs(weight-previous)<.023,'no binary lighting jump');
      assert(inside?weight>=previous:weight<=previous,'adaptation is monotonic');
      previous=weight;
    }
    assert(Math.abs(weight-Number(inside))<.02,'reaches target lighting');
    let slow=inside?0:1;for(let i=0;i<30;i++)slow=blendInterior(slow,inside,.1);
    assert(Math.abs(slow-weight)<1e-12,'adaptation does not depend on FPS');
  }
  const halfway=blendInterior(0,true,.4);
  assert(blendInterior(halfway,false,1/60)<halfway,'turning back reverses smoothly');
  assert.equal(blendInterior(halfway,false,0),halfway,'no adaptation when no time elapses');
  for(const day of [0,.5,1]){
    const outside=interiorLightValues(day,0),inside=interiorLightValues(day,1),middle=interiorLightValues(day,.5);
    for(const key of Object.keys(middle))assert(Math.abs(middle[key]-(outside[key]+inside[key])/2)<1e-12,`${key} uses the same transition`);
  }
});
