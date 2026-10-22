// Wikimedia Commons imageinfo checked 2026-10-22. Only links/metadata, no photos.
// Historical views remain explicitly separate from photographs of the recent state.
const PD='Public Domain',CC0='CC0 · gemeinfrei';
export const SOURCES={
  parish:{label:'Kirchengemeinde Simrishamn',url:'https://www.svenskakyrkan.se/simrishamn/st-olofs-kyrka'},
  guide:{label:'Kirchenführer im Bistum Lund',url:'https://www.kyrkoguiderlundsstift.se/skane_049_text.html'},
  archaeology:{label:'Österlenarkeologi 2015:10, S. 7–8',url:'https://www.osterlenarkeologi.se/pdf/rapport_2015-10.pdf#page=9'}
};
function photo(file,path,width,height,title,description,author,rights,date,group,evidence=[]){
  const filename=file.replaceAll(' ','_');
  return {file,title,description,author,rights,date,group,width,height,evidence,
    source:`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,
    original:`https://upload.wikimedia.org/wikipedia/commons/${path}/${filename}`,
    preview:width>1280?`https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${filename}/1280px-${filename}`:`https://upload.wikimedia.org/wikipedia/commons/${path}/${filename}`,
    rightsUrl:rights===CC0?'https://creativecommons.org/publicdomain/zero/1.0/deed.de':`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}#Licensing`,
    checked:'2026-10-22'};
}
const gunnar='Gunnar Bach Pedersen',david='David Castor',otto='Otto Rydbeck · Riksantikvarieämbetet';
export const PHOTOS=[
  photo('St Olof ydre1.jpg','1/16',2288,1712,'Die Kirche von außen','Chor und Sakristei gehören zu den ältesten Teilen der Kirche. Die Gemeinde datiert sie vorsichtig in das späte 12. oder frühe 13. Jahrhundert.',gunnar,PD,'Juli 2007','space',[SOURCES.parish]),
  photo('St Olof indre1.jpg','1/17',2288,1712,'Blick durch das Langhaus','Das zweischiffige Langhaus wird im Kirchenführer dem 15. Jahrhundert zugeordnet. Der archäologische Bericht nennt das 14. oder 15. Jahrhundert; die Datierung ist also nicht einheitlich.',gunnar,PD,'Juli 2007','space',[SOURCES.guide,SOURCES.archaeology]),
  photo('Koret i Sankt Olofs kyrka.jpg','1/16',3228,2383,'Der Chorraum','Der große Flügelaltar stammt laut Kirchenführer aus der Mitte des 15. Jahrhunderts und wurde vermutlich in Lübeck gefertigt. Sein Mittelteil zeigt die Kreuzigung Christi.',david,CC0,'10. Mai 2012','space',[SOURCES.guide]),
  photo('Dopfunt i Sankt Olof.jpg','f/f4',2166,3294,'Der Taufstein','Der Kirchenführer datiert den Taufstein vermutlich in das frühe 12. Jahrhundert. Ein genaues Herstellungsjahr ist damit nicht belegt.',david,CC0,'10. Mai 2012','detail',[SOURCES.guide]),
  photo('Treenigheten i Sankt Olof.jpg','3/3c',2142,3678,'Der Trinitätsaltar','Der sogenannte Gnadenstuhl zeigt Gottvater mit dem gekreuzigten Christus vor sich. Der Kirchenführer ordnet das Altarschränkchen dem 15. Jahrhundert zu.',david,CC0,'10. Mai 2012','detail',[SOURCES.guide]),
  photo('Sankt Olof i Sankt Olof.jpg','1/15',1482,2694,'Olaf im Bildwerk','Der archäologische Bericht datiert die Olofsfigur um 1500. Das ist eine ungefähre Einordnung, kein gesichertes Herstellungsjahr.',david,CC0,'10. Mai 2012','detail',[SOURCES.archaeology]),
  photo('Jungfru Maria och Jesus i Sankt Olof.jpg','2/29',2208,3642,'Maria mit dem Kind','Der Marienaltar befindet sich laut Kirchenführer im nordwestlichen Bereich der Kirche. Seine Flügel zeigen weibliche Heilige; Maria mit dem Kind bildet die Mitte.',david,CC0,'10. Mai 2012','detail',[SOURCES.guide]),
  photo('Sankta Anna i Sankt Olof.jpg','1/15',1975,2964,'Der Annenaltar','Das Bildmotiv Anna Selbdritt vereint Anna, Maria und das Jesuskind. Der Kirchenführer beschreibt es an einem der erhaltenen Seitenaltäre.',david,CC0,'10. Mai 2012','detail',[SOURCES.guide]),
  photo('St Olof krucifiks.jpg','f/f2',1486,2012,'Das Kruzifix','Die Aufnahme zeigt das Kruzifix als Ganzes. Ein Herstellungsjahr oder eine Künstlerzuschreibung wird aus seinem Aussehen nicht abgeleitet.',gunnar,PD,'Juli 2007','detail'),
  photo('St Olof Olav d Hellige.jpg','7/7a',1201,2260,'Olaf und seine Axt','Der Namenspatron ist der norwegische König Olaf Haraldsson, der 1030 bei Stiklestad starb. Seine historische Biografie und seine Verehrung als Heiliger sind zu unterscheiden.',gunnar,PD,'Juli 2007','detail',[SOURCES.parish]),
  photo('St Olof series pastorum.jpg','6/6c',2079,1196,'Die Pfarrertafel','Diese Aufnahme dokumentiert die Pfarrertafel. Einzelne Namen und Amtszeiten werden hier nicht aus der Fotografie rekonstruiert.',gunnar,PD,'Juli 2007','detail'),
  photo('Sankt Olofs kyrka - KMB - 16000200061109.jpg','e/e4',800,559,'Von Nordosten · 1900','Historische Aufnahme aus Kulturmiljöbild. Sie dokumentiert einen früheren Zustand, nicht den heutigen.',otto,PD,'1900','archive'),
  photo('Sankt Olofs kyrka - KMB - 16000200061126.jpg','2/28',800,565,'Von Nordwesten · 1900','Die Baukörper lassen sich ohne die Gestaltung der 3D-Umgebung vergleichen.',otto,PD,'1900','archive'),
  photo('Sankt Olofs kyrka - KMB - 16000200061127.jpg','8/84',800,561,'Von Süden · 1900','Eine historische Gegenansicht auf die Giebel und das Portal.',otto,PD,'1900','archive')
];
