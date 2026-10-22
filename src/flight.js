import {CatmullRomCurve3,Vector3,MathUtils} from 'three';
import {nextDate} from './daylight.js';

// Two different three-minute flights share a continuous transition outside.
// The first enters west/exits south; the second enters south/exits west.
const first=[
  [[-26,16,26],[0,5,0],12],[[5,20,34],[0,4,0],12],[[32,18,16],[3,4,0],12],
  [[31,17,-19],[1,4,0],12],[[-3,18,-32],[0,4,0],12],[[-29,14,-19],[-1,4,0],8],
  [[-27,8,0],[-10,2,0],6],[[-17,2.4,0],[-9.3,2,0],4],[[-12.5,1.85,0],[0,3,1],4],
  [[-9.15,1.85,0],[-7,3,3],4],[[-9.15,1.9,3],[8,4,0],7],[[-4,2.2,3],[8,5.6,0],7],
  [[5.8,2.15,3],[12,3,0],5],[[6,2.1,0],[14,3,0],5],[[11.3,2.1,0],[14.4,3.1,0],7],
  [[10.4,2.2,0],[2,5,-2],3],[[6,2.2,0],[-1,4,3],3],[[6,2.2,3],[-1,2.5,4.5],5],
  [[-1,2.1,3],[-1,2,9],4],[[-1,1.9,5],[-1,2,10],3],[[-1,1.9,7],[-1,2,13],4],
  [[-1,1.85,11],[-1,2,16],3],[[-1,1.85,13.5],[-1,7,19],5],[[1,5,23],[-1,6,9],8],
  [[20,13,25],[3,5,3],0]
];
const second=[
  [[20,13,25],[3,5,3],10],[[34,10,9],[7,5,0],12],[[23,9,-22],[10,4,0],12],
  [[-8,13,-27],[0,5,0],12],[[-26,10,-8],[-5,4,0],10],[[-25,9,24],[-1,5,10],6],
  [[-9,4.5,24],[-1,4,12],6],[[-1,2.15,18],[-1,2,11],4],[[-1,1.85,13.5],[-1,2,8],5],
  [[-1,1.85,11],[-1,2,6],3],[[-1,1.9,7],[-1,2.5,3],5],[[-1,1.9,5],[5,4,3],6],
  [[-1,2.1,3],[7,4,0],5],[[5.8,2.15,3],[14,3,0],5],[[6,2.1,0],[14,3,0],8],
  [[11.3,2.1,0],[14.4,3.1,0],7],[[10.4,2.2,0],[2,5,-2],4],[[6,2.2,0],[-1,4,-3],6],
  [[6,2.2,-3],[-1,4,-3],6],[[0,2.3,-3],[-4,5.8,0],5],[[-.5,2.3,-3],[6,4,0],4],
  [[6,2.2,-3],[4,5.5,3],5],[[6,2.2,3],[-6,3,3],6],[[-4,2.15,3],[-9.3,2,0],5],
  [[-9.15,1.9,3],[-9.4,2,0],4],[[-9.15,1.85,0],[-17,2,0],4],[[-12.5,1.85,0],[-16,5,-7],6],
  [[-18,3,-5],[-10,5,0],6],[[-15,2.2,-4],[-10,2,0],7],[[-11.5,1.66,0],[-9,1.66,0],0]
];
export const FLIGHT_DURATION=360,FIRST_FLIGHT_DURATION=180;
function normalize(stops){const sum=stops.reduce((n,s)=>n+s[2],0);return stops.map(([p,look,seconds])=>({p,look,seconds:seconds*180/sum}));}
export const SECOND_FLIGHT_START=first.length-1;
export const FLIGHT_STOPS=[...normalize(first).slice(0,-1),...normalize(second)];
const path=new CatmullRomCurve3(FLIGHT_STOPS.map(p=>new Vector3(...p.p)),false,'centripetal');
const looks=new CatmullRomCurve3(FLIGHT_STOPS.map(p=>new Vector3(...p.look)),false,'centripetal');
export function sampleFlight(seconds){
  const t=MathUtils.clamp(seconds,0,FLIGHT_DURATION);let local=t,i=0;
  while(i<FLIGHT_STOPS.length-2&&local>=FLIGHT_STOPS[i].seconds){local-=FLIGHT_STOPS[i].seconds;i++;}
  let fraction=local/FLIGHT_STOPS[i].seconds;
  if(i===FLIGHT_STOPS.length-2)fraction=fraction+fraction*fraction-fraction*fraction*fraction;
  const u=t>=FLIGHT_DURATION?1:(i+fraction)/(FLIGHT_STOPS.length-1);
  return {position:path.getPoint(u),look:looks.getPoint(u),leg:i,flight:t<FIRST_FLIGHT_DURATION?1:2,done:t>=FLIGHT_DURATION};
}
export function flightClock(date,seconds){
  const total=300+1440*MathUtils.clamp(seconds/FLIGHT_DURATION,0,1);
  return {date:total>=1440?nextDate(date):date,time:total%1440};
}
export function flightBlocked(p,boxes,radius=.18){
  return boxes.some(b=>p.x>b.min.x-radius&&p.x<b.max.x+radius&&p.y>b.min.y-radius&&p.y<b.max.y+radius&&p.z>b.min.z-radius&&p.z<b.max.z+radius);
}
const s=SECOND_FLIGHT_START;
const CAPTIONS=[
  [0,['Sankt Olof · Eine Kirche in Österlen','Stein, Licht, Erinnerung.','Ein Tag beginnt.']],
  [2,['Weiße Treppengiebel. Rote Ziegeldächer.','Ein Bau, gewachsen über Jahrhunderte.']],
  [4,['Ihre Ursprünge reichen ins Mittelalter.','Das große Langhaus entstand im 15. Jahrhundert.']],
  [6,['Durch das Westportal.','Von außen nach innen.']],
  [10,['Zwei Schiffe. Ein gemeinsamer Raum.','Zwei Mittelpfeiler tragen die Gewölbe.']],
  [13,['Ein niedriger Bogen öffnet den Chor.','Im Chor erzählen Bilder vom Glauben.']],
  [17,['Ein anderer Weg führt wieder hinaus.','Durch die südliche Vorhalle.']],
  [22,['Zurück auf den Kirchhof.','Das Licht verändert den Bau.']],
  [s,['Ein zweiter Flug. Ein anderer Blick.','Der Abend beginnt.']],
  [s+3,['Sankt Olof war ein Ziel von Pilgerreisen.','Der Name erinnert an Olaf Haraldsson.']],
  [s+7,['Diesmal durch das Südportal.','Die Nacht verändert den Raum.']],
  [s+12,['Nachts leuchtet die Kirche von innen.','Bilder, Stein und warmes Licht.']],
  [s+17,['Nun durch das andere Schiff.','Eine fotografische Annäherung, kein Aufmaß.']],
  [s+25,['Durch das Westportal wieder hinaus.','Der Morgen kehrt zurück.']],
  [s+28,['Ein Tag ist vergangen.','Jetzt beginnt dein eigener Weg.']]
];
export function flightCaption(leg,seconds){
  const index=CAPTIONS.findLastIndex(c=>c[0]<=leg),startLeg=CAPTIONS[index][0],nextLeg=CAPTIONS[index+1]?.[0]??FLIGHT_STOPS.length-1;
  const start=FLIGHT_STOPS.slice(0,startLeg).reduce((n,p)=>n+p.seconds,0),end=FLIGHT_STOPS.slice(0,nextLeg).reduce((n,p)=>n+p.seconds,0),lines=CAPTIONS[index][1],duration=(end-start)/lines.length;
  const local=MathUtils.clamp(seconds-start,0,end-start),line=Math.min(lines.length-1,Math.floor(local/duration)),phase=(local-line*duration)/duration;
  return {text:lines[line],opacity:Math.max(0,Math.min(1,phase/.14,(1-phase)/.18))};
}
