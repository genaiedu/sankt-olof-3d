import {CatmullRomCurve3,Vector3} from 'three';

// Three coordinates. Each duration describes the leg to the next point.
// The circular spline has no end/start jump. Tight portal legs are sampled
// against the actual exported three-dimensional collision boxes in tests.
export const FLIGHT_STOPS=[
  {p:[-26,16,26],look:[0,5,0],seconds:12},
  {p:[5,20,34],look:[0,4,0],seconds:12},
  {p:[32,18,16],look:[3,4,0],seconds:12},
  {p:[31,17,-19],look:[1,4,0],seconds:12},
  {p:[-3,18,-32],look:[0,4,0],seconds:12},
  {p:[-29,14,-19],look:[-1,4,0],seconds:8},
  {p:[-27,8,0],look:[-10,2,0],seconds:6},
  {p:[-17,2.4,0],look:[-9.3,2,0],seconds:4},
  {p:[-12.5,1.85,0],look:[0,3,1],seconds:4},
  {p:[-9.15,1.85,0],look:[-7,3,3],seconds:4},
  {p:[-9.15,1.9,3],look:[8,4,0],seconds:7},
  {p:[-4,2.2,3],look:[8,5.6,0],seconds:7},
  {p:[5.8,2.15,3],look:[12,3,0],seconds:5},
  {p:[6,2.1,0],look:[14,3,0],seconds:5},
  {p:[11.3,2.1,0],look:[14.4,3.1,0],seconds:7},
  {p:[10.4,2.2,0],look:[2,5,-2],seconds:3},
  {p:[6,2.2,0],look:[-1,4,-3],seconds:2},
  {p:[6,2.2,-3],look:[-1,4,-3],seconds:6},
  {p:[0,2.3,-3],look:[-4,5.8,0],seconds:7},
  {p:[-.5,2.3,-3],look:[6,4,0],seconds:5},
  {p:[6,2.2,-3],look:[4,5.5,3],seconds:5},
  {p:[6,2.2,3],look:[-6,3,3],seconds:7},
  {p:[-4,2.15,3],look:[-9.3,2,0],seconds:7},
  {p:[-9.15,1.9,3],look:[-9.4,2,0],seconds:4},
  {p:[-9.15,1.85,0],look:[-17,2,0],seconds:4},
  {p:[-12.5,1.85,0],look:[-24,3,0],seconds:4},
  {p:[-18,3,0],look:[-10,4,0],seconds:5},
  {p:[-29,10,12],look:[0,5,0],seconds:10}
];
export const FLIGHT_DURATION=FLIGHT_STOPS.reduce((s,p)=>s+p.seconds,0);
const path=new CatmullRomCurve3(FLIGHT_STOPS.map(p=>new Vector3(...p.p)),true,'centripetal');
const looks=new CatmullRomCurve3(FLIGHT_STOPS.map(p=>new Vector3(...p.look)),true,'centripetal');
export function sampleFlight(seconds){
  let t=((seconds%FLIGHT_DURATION)+FLIGHT_DURATION)%FLIGHT_DURATION,i=0;
  while(t>=FLIGHT_STOPS[i].seconds){t-=FLIGHT_STOPS[i].seconds;i++;}
  const u=(i+t/FLIGHT_STOPS[i].seconds)/FLIGHT_STOPS.length;
  return {position:path.getPoint(u),look:looks.getPoint(u),leg:i};
}
export function flightBlocked(p,boxes,radius=.18){
  return boxes.some(b=>p.x>b.min.x-radius&&p.x<b.max.x+radius&&p.y>b.min.y-radius&&p.y<b.max.y+radius&&p.z>b.min.z-radius&&p.z<b.max.z+radius);
}
const CAPTIONS=[
  [0,['Sankt Olof · Eine Kirche in Österlen','Stein, Licht, Erinnerung.','Eine Kirche in Südschweden.']],
  [2,['Weiße Treppengiebel. Rote Ziegeldächer.','Ein Bau, gewachsen über Jahrhunderte.','Chor und Sakristei bilden den älteren Kern.']],
  [4,['Ihre Ursprünge reichen ins Mittelalter.','Das große Langhaus entstand im 15. Jahrhundert.']],
  [6,['Ein Portal unter zwei hohen Fenstern.','Von außen nach innen.']],
  [9,['Wir betreten den Kirchenraum.','Zwei Schiffe. Ein gemeinsamer Raum.']],
  [11,['Zwei Mittelpfeiler tragen die Gewölbe.','Sechs Gewölbefelder überspannen das Langhaus.']],
  [13,['Im Chor erzählen Bilder vom Glauben.','Der Flügelaltar stammt aus dem Spätmittelalter.']],
  [17,['Sankt Olof war ein Ziel von Pilgerreisen.','Der Name erinnert an Olaf Haraldsson.','Ein norwegischer König, als Heiliger verehrt.']],
  [20,['Licht lässt den Raum anders erscheinen.','Nachts leuchtet die Kirche von innen.']],
  [23,['Zurück auf den Kirchhof.','Die Reise führt wieder hinauf.']],
  [26,['Eine fotografische Annäherung, kein Aufmaß.','Der Kreis schließt sich.']]
];
export function flightCaption(leg,seconds){
  const index=CAPTIONS.findLastIndex(c=>c[0]<=leg),startLeg=CAPTIONS[index][0],nextLeg=CAPTIONS[index+1]?.[0]??FLIGHT_STOPS.length;
  const start=FLIGHT_STOPS.slice(0,startLeg).reduce((s,p)=>s+p.seconds,0),end=FLIGHT_STOPS.slice(0,nextLeg).reduce((s,p)=>s+p.seconds,0),lines=CAPTIONS[index][1],duration=(end-start)/lines.length;
  const local=(((seconds%FLIGHT_DURATION)+FLIGHT_DURATION)%FLIGHT_DURATION)-start,line=Math.min(lines.length-1,Math.floor(local/duration)),phase=(local-line*duration)/duration;
  return {text:lines[line],opacity:Math.min(1,phase/.14,(1-phase)/.18)};
}
