import {PHOTOS} from './photo-data.js';
const $=id=>document.getElementById(id);
const link=(label,url)=>{const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
export function setupPhotos(openDialog){
  let allowed=false;
  const images=[];
  function figure(p){
    const f=document.createElement('figure'),b=document.createElement('button'),img=document.createElement('img'),placeholder=document.createElement('span'),cap=document.createElement('figcaption');
    f.className='photo-card';b.className='photo-open';b.type='button';b.setAttribute('aria-label',`${p.title} vergrößern`);b.style.setProperty('--photo-ratio',`${p.width}/${p.height}`);
    img.alt=p.title;img.width=p.width;img.height=p.height;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.hidden=true;
    placeholder.className='photo-placeholder';placeholder.textContent='Externe Fotos sind ausgeschaltet.';
    const title=document.createElement('strong');title.textContent=p.title;
    const description=document.createElement('p');description.textContent=p.description;
    const credit=document.createElement('p');credit.className='photo-credit';credit.append(`${p.author} · ${p.date}`,document.createElement('br'),link(p.rights,p.rightsUrl),' · ',link('Quelle auf Commons',p.source));
    cap.append(title,description,credit);b.append(img,placeholder);f.append(b,cap);
    images.push({p,b,img,placeholder});
    img.onerror=()=>{img.hidden=true;placeholder.hidden=false;placeholder.textContent='Das externe Foto konnte nicht geladen werden. Die Quelle ist unten verlinkt.';};
    b.onclick=()=>{
      if(!allowed)return;
      $('photo-title').textContent=p.title;$('photo-full').src=p.original;$('photo-full').alt=p.title;
      $('photo-source').replaceChildren(`${p.author} · ${p.date} · `,link(p.rights,p.rightsUrl),' · ',link('Original auf Commons',p.source));
      openDialog('photo-dialog');
    };
    return f;
  }
  for(const p of PHOTOS)$(`photos-${p.group}`).append(figure(p));
  $('photo-dialog').addEventListener('close',()=>$('photo-full').removeAttribute('src'));
  function setAllowed(value){
    allowed=Boolean(value);
    for(const {p,b,img,placeholder} of images){
      b.disabled=!allowed;placeholder.textContent='Externe Fotos sind ausgeschaltet.';placeholder.hidden=allowed;img.hidden=!allowed;
      if(allowed)img.src=p.preview;else img.removeAttribute('src');
    }
    if(!allowed){$('photo-full').removeAttribute('src');if($('photo-dialog').open)$('photo-dialog').close();}
    $('photo-toggle').textContent=allowed?'Externe Fotos ausschalten':'Externe Fotos laden';$('photo-toggle').setAttribute('aria-pressed',String(allowed));
    $('photo-status').textContent=allowed?'Freigegeben für diesen Besuch · direkt von Wikimedia geladen.':'Keine externen Bilder geladen. Quellen und Beschreibungen bleiben zugänglich.';
    document.documentElement.dataset.externalPhotos=String(allowed);
  }
  $('photo-toggle').onclick=()=>setAllowed(!allowed);
  setAllowed(false);
  return {setAllowed};
}
