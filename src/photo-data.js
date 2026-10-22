// Wikimedia Commons imageinfo checked 2026-10-22. Only links/metadata, no photos.
// Historical views remain explicitly separate from photographs of the recent state.
const PD='Public Domain',CC0='CC0 · gemeinfrei';
function photo(file,path,width,height,title,description,author,rights,date,group){
  const filename=file.replaceAll(' ','_');
  return {file,title,description,author,rights,date,group,width,height,
    source:`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,
    original:`https://upload.wikimedia.org/wikipedia/commons/${path}/${filename}`,
    preview:width>1280?`https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${filename}/1280px-${filename}`:`https://upload.wikimedia.org/wikipedia/commons/${path}/${filename}`,
    rightsUrl:rights===CC0?'https://creativecommons.org/publicdomain/zero/1.0/deed.de':`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}#Licensing`,
    checked:'2026-10-22'};
}
const gunnar='Gunnar Bach Pedersen',david='David Castor',otto='Otto Rydbeck · Riksantikvarieämbetet';
export const PHOTOS=[
  photo('St Olof ydre1.jpg','1/16',2288,1712,'Die Kirche von außen','Weiße Giebel, rote Dächer und Kirchhof im fotografischen Zusammenhang.',gunnar,PD,'Juli 2007','space'),
  photo('St Olof indre1.jpg','1/17',2288,1712,'Blick durch das Langhaus','Die Mittelpfeiler teilen den Raum in zwei Schiffe; die Gewölbe verbinden ihn.',gunnar,PD,'Juli 2007','space'),
  photo('Koret i Sankt Olofs kyrka.jpg','1/16',3228,2383,'Der Chorraum','Der Hochaltar, seine Umgebung und die tatsächlich vorhandenen Oberflächen.',david,CC0,'10. Mai 2012','space'),
  photo('Dopfunt i Sankt Olof.jpg','f/f4',2166,3294,'Der Taufstein','Eine Detailaufnahme macht Form und Material deutlicher als die vereinfachte 3D-Geometrie.',david,CC0,'10. Mai 2012','detail'),
  photo('Treenigheten i Sankt Olof.jpg','3/3c',2142,3678,'Der Trinitätsaltar','Das geschnitzte Bildwerk und sein architektonischer Rahmen.',david,CC0,'10. Mai 2012','detail'),
  photo('Sankt Olof i Sankt Olof.jpg','1/15',1482,2694,'Olaf im Bildwerk','Die Figur des Heiligen, dem die Kirche ihren Namen verdankt.',david,CC0,'10. Mai 2012','detail'),
  photo('Jungfru Maria och Jesus i Sankt Olof.jpg','2/29',2208,3642,'Maria mit dem Kind','Fassung, Figuren und Rahmen in einer unbeschnittenen Aufnahme.',david,CC0,'10. Mai 2012','detail'),
  photo('Sankta Anna i Sankt Olof.jpg','1/15',1975,2964,'Der Annenaltar','Ein weiteres Ausstattungsstück des realen Kirchenraums.',david,CC0,'10. Mai 2012','detail'),
  photo('St Olof krucifiks.jpg','f/f2',1486,2012,'Das Kruzifix','Die Aufnahme zeigt das Werk als Ganzes, nicht nur einen dekorativen Ausschnitt.',gunnar,PD,'Juli 2007','detail'),
  photo('St Olof Olav d Hellige.jpg','7/7a',1201,2260,'Olaf und seine Axt','Ein zweiter Blick auf die Heiligenfigur und ihre Attribute.',gunnar,PD,'Juli 2007','detail'),
  photo('St Olof series pastorum.jpg','6/6c',2079,1196,'Die Pfarrertafel','Schrift gehört ebenso zur Ausstattung wie Bilder und Skulpturen.',gunnar,PD,'Juli 2007','detail'),
  photo('Sankt Olofs kyrka - KMB - 16000200061109.jpg','e/e4',800,559,'Von Nordosten · 1900','Historische Aufnahme aus Kulturmiljöbild. Sie dokumentiert einen früheren Zustand, nicht den heutigen.',otto,PD,'1900','archive'),
  photo('Sankt Olofs kyrka - KMB - 16000200061126.jpg','2/28',800,565,'Von Nordwesten · 1900','Die Baukörper lassen sich ohne die Gestaltung der 3D-Umgebung vergleichen.',otto,PD,'1900','archive'),
  photo('Sankt Olofs kyrka - KMB - 16000200061127.jpg','8/84',800,561,'Von Süden · 1900','Eine historische Gegenansicht auf die Giebel und das Portal.',otto,PD,'1900','archive')
];
