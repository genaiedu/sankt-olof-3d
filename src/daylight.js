import SunCalc from 'suncalc';

export const SITE = { latitude: 55.63489, longitude: 14.12213, zone: 'Europe/Stockholm' };
const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: SITE.zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
export function clockText(minutes) {
  const n=((Math.floor(minutes)%1440)+1440)%1440;
  return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
}
export function nextDate(date) { return new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10); }
export function localInstant(date, minutes) {
  // Convert the chosen Swedish civil time, not the visitor's computer timezone.
  const [y,m,d]=date.split('-').map(Number),target=Date.UTC(y,m-1,d,Math.floor(minutes/60),Math.floor(minutes%60));
  let instant=target;
  for(let i=0;i<3;i++) {
    const p=Object.fromEntries(formatter.formatToParts(new Date(instant)).map(x=>[x.type,x.value]));
    const represented=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);
    instant+=target-represented;
  }
  return new Date(instant);
}
export function localMinutes(instant) {
  const p=Object.fromEntries(formatter.formatToParts(instant).map(x=>[x.type,x.value]));
  return +p.hour*60+(+p.minute);
}
export function celestial(date, minutes) {
  const instant=localInstant(date,minutes),sun=SunCalc.getPosition(instant,SITE.latitude,SITE.longitude),moon=SunCalc.getMoonPosition(instant,SITE.latitude,SITE.longitude);
  const illumination=SunCalc.getMoonIllumination(instant);
  return {instant,sun,moon,illumination};
}
export function solarEvents(date) {
  const times=SunCalc.getTimes(localInstant(date,720),SITE.latitude,SITE.longitude);
  return { sunrise:localMinutes(times.sunrise), sunset:localMinutes(times.sunset) };
}
// Three axes: +X east, +Y up, -Z north. SunCalc azimuth starts at south.
export function celestialDirection({azimuth,altitude}) {
  return [-Math.cos(altitude)*Math.sin(azimuth),Math.sin(altitude),Math.cos(altitude)*Math.cos(azimuth)];
}
export function steeringStep(yaw,velocity,turn,dt) {
  // Ramp gently while held, but never continue rotating after release.
  const speed=turn?velocity+(turn*1.25-velocity)*(1-Math.exp(-Math.min(dt,.05)*12)):0;
  return {yaw:yaw-speed*Math.min(dt,.05),velocity:speed};
}
export function angleDifference(to,from) { return Math.atan2(Math.sin(to-from),Math.cos(to-from)); }
