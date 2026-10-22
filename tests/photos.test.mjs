import test from 'node:test';
import assert from 'node:assert/strict';
import {PHOTOS} from '../src/photo-data.js';
import {HISTORY} from '../src/history-data.js';
test('photo book has fourteen externally linked public-domain/CC0 images with individual evidence',()=>{
  assert.equal(PHOTOS.length,14);assert.equal(new Set(PHOTOS.map(p=>p.file)).size,14);
  for(const p of PHOTOS){
    assert(['Public Domain','CC0 · gemeinfrei'].includes(p.rights));
    for(const key of ['original','preview'])assert(['upload.wikimedia.org','thumb.wikimedia.org'].includes(new URL(p[key]).hostname));
    assert.equal(new URL(p.source).hostname,'commons.wikimedia.org');assert(p.author&&p.description&&p.checked==='2026-10-22');
    assert(p.width>0&&p.height>0);assert(!('local' in p));
    assert(Array.isArray(p.evidence));for(const s of p.evidence){assert(s.label);assert(new URL(s.url).protocol==='https:');}
  }
  assert.equal(PHOTOS.filter(p=>p.group==='archive'&&p.date==='1900').length,3);
  assert(PHOTOS.find(p=>p.file==='St Olof indre1.jpg').evidence.length===2,'conflicting nave dates retain both sources');
});
test('timeline retains sources and uncertainty for each selected milestone',()=>{
  assert.equal(HISTORY.length,8);for(const e of HISTORY){assert(e.date&&e.title&&e.text);assert(e.sources.length);for(const s of e.sources)assert(new URL(s.url).protocol==='https:');}
  assert(HISTORY.find(e=>e.title==='Das zweischiffige Langhaus').sources.length===2);
});
