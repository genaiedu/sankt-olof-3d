# Rekonstruktionsnachweis

Recherche und Ausführung: 17. Oktober 2026. Gegenstand ist ausschließlich die Kirche **in Sankt Olof, Simrishamns kommun, Österlen, Skåne**, nicht die gleichnamigen Kirchen in Falköping, Helsingborg oder Täby. Ähnlich benannte, bei der Recherche gefundene Berichte wurden deshalb verworfen.

## Quellenbasis

1. [Simrishamns församling: S:t Olofs kyrka](https://www.svenskakyrkan.se/simrishamn/st-olofs-kyrka). Primärquelle zu Standort, Widmung und ältesten Bauteilen; enthält Links zu offiziellen Innen-/Außenpanoramen. Chor und Sakristei vermutlich spätes 12. oder frühes 13. Jahrhundert.
2. [Bistum Lund: Kirchenführer](https://www.kyrkoguiderlundsstift.se/skane_049_text.html). Primärquelle zum zweischiffigen Langhaus des 15. Jahrhunderts und zu den Ausstattungsstücken. Datierungen sind dort teilweise ausdrücklich vorsichtig formuliert; diese Unsicherheiten wurden beibehalten.
3. [Riksantikvarieämbetet: Bebyggelseregistret](https://app.raa.se/open/bebyggelse/bebyggelseobjekt/bc9883ff-f97b-47b9-b4eb-e38ba6dbfad2). Denkmalreferenz; ohne vermessbare Bauzeichnungen verwendet. Die JavaScript-Anwendung liefert im Textextrakt keine vollständige Beschreibung; deshalb werden hieraus keine exakten Maße behauptet.
4. [Wikimedia Commons: Außenaufnahmen](https://commons.wikimedia.org/wiki/Category:Sankt_Olofs_kyrka,_%C3%96sterlen) und [Innenraum](https://commons.wikimedia.org/wiki/Category:Interior_of_Sankt_Olofs_kyrka,_%C3%96sterlen). Die konkrete Auswahl mit Dateiseiten, Autor, Lizenz und Bild-URL steht in `public/assets/references/credits.json`; 14 verkleinerte Fotodateien liegen unmittelbar daneben.
5. [Offizieller Innenrundgang](https://queenmedia.viewin360.co/share/collection/7bZDV?fs=1&info=1&initload=0&logo=1&logosize=117&sd=1&thumbs=1&vr=1) und [Kirchhofrundgang](https://queenmedia.viewin360.co/share/collection/7bZKT?fs=1&info=1&initload=0&logo=1&logosize=117&sd=1&thumbs=1&vr=1). Verlinkte Vergleichsangebote der Gemeinde; die proprietären Panoramen wurden nicht extrahiert, in Texturen umgewandelt oder kopiert. Die eigentliche Modellierung stützt sich auf die lokal sichtkontrollierten Commons-Fotografien.

## Nachvollziehbare Modellentscheidungen

| Bauteil | Beobachtungsbasis | Modellierung / Unsicherheit |
|---|---|---|
| Gesamtkörper | Luftbild `00.jpg`, Außenbilder `01`–`05` | Zweischiffiges Langhaus; kleinerer Chor und östlicher Nebenraum; Südvorhalle und schmales Türmchen. Proportionen geschätzt. |
| Giebel | `01`, `03`, `04` | Gestufte Silhouette und Blendarkaden erkennbar nachgebildet. Stufenzahl, Tiefen, Profile und Turmabschluss vereinfacht. |
| Dach | `00`, `02`, `05` | Rote Satteldächer; allgemeine CC0-Ziegeltextur statt örtlicher Photogrammetrie. |
| Langhaus | `06`–`10` | Zwei Schiffe, runde Mittelpfeiler, sechs angenäherte Gewölbefelder. Höhen, Jochmaße und Gewölbekurven sind Hypothesen. |
| Gewölbemalerei | `09`–`12` | Rötliche Ranken und Rippenfassung; neu gezeichnete ornamentale Annäherung, keine ikonographisch genaue Kopie. |
| Hochaltar | `11.jpg` | Bildausschnitt `(415,995)–(1047,1208)` als Textur auf einer dünnen Fläche mit Rahmen. CC BY-SA 3.0, Hans A. Rosbach. Perspektive und ein geringer fotografischer Überlagerungsrest bleiben sichtbar; keine Tiefenrekonstruktion der Skulpturen. |
| Trinitätsaltar | `09.jpg` | Ausschnitt `(560,65)–(760,520)` als Fotooberfläche auf einem geometrischen Träger. CC BY-SA 3.0, Hans A. Rosbach. Vereinfachte Lage und Tiefe. |
| Bänke | `06`–`11` | Blaugrüne Fassung und helle Profile, schematische neue Paneelornamente; Anzahl und Position angenähert. |
| Kanzel, Orgel, Taufe, Leuchter | Innenaufnahmen und Kirchenführer | Räumliche Näherungen ohne vollständige Schnitzornamentik. Keine Behauptung, Details oder Standorte seien vermessen. |
| Fenster | Außen- und Innenaufnahmen | Reale Öffnungen im Mesh, Laibungen und Bleisprossen. Abmessungen und Glaseigenschaften angenähert. |
| Türen / Schranke | Begehbarkeit | Portale und ein Durchgang in der Chorschranke bleiben offen, um eine zusammenhängende Route zu ermöglichen. Dieser Betriebszustand ist eine bewusste Modellentscheidung. |
| Kirchhof | `00`–`05` als grobe Raumreferenz | Wege, Mauer, Vegetation und anonymisierte Grabsteine frei ergänzt. Keine realen Grabdaten. |
| Licht | Fotografische Stimmung | HDR-Umgebung, physikalisch basierte Materialien, Sonnen- und Fensterlicht, Kontaktverschattung auf leistungsfähigeren Geräten. Künstlerische Beleuchtung; keine gemessenen Lichtwerte und keine astronomisch exakte Tageszeit. |

## Geschätztes Koordinatenmodell

Blender: X Osten, Y Norden, Z oben. Langhaus X −10…8, Y −6…6; Chor X 8…16, Y −6…0; Sakristei X 16…21, Y −6…0. Südvorhalle X −10…−4, Y −10…−6. Langhaustraufe 7,8, Dachfirst 13,0; Augenhöhe 1,66. Zahlen sind Arbeitseinheiten in angenäherten Metern, **keine Bestandsmaße**. Der SVG-Grundriss trägt daher die Kennzeichnung „schematisch“.

Beim glTF-Export wird Z-up nach Y-up umgesetzt. Die Kollisionsdaten bleiben in Blender-Koordinaten und werden im Browser entsprechend transformiert. Der Test prüft neben undurchdringlichen Wänden und Bänken die gesamte durchgängige Route vom Westportal bis vor den Hochaltar.

## Für eine präzisere nächste Fassung erforderlich

Vermessener Grundriss mit Schnitten, Maßreferenzen für Öffnungen und Pfeiler, kalibrierte Fotos oder ein lizenzierter Laserscan/Photogrammetrie-Datensatz sowie freigestellte Detailaufnahmen der Ausstattungsstücke. Bis dahin bleibt die Bezeichnung „interpretative Rekonstruktion“ erforderlich.
