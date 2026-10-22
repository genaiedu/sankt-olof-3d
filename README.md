# Sankt Olof · Eine Kirche begehen

Eine im Browser begehbare **interpretative Rekonstruktion des heutigen Bauzustands** der Sankt Olofs kyrka in Sankt Olof, Österlen / Skåne, Schweden. Eigenständiges Projekt von genaiedu; keine offizielle Vermessung der Kirchengemeinde.

- Anwendung: https://genaiedu.github.io/sankt-olof-3d/
- Religionsregister: https://genaiedu.github.io/LearningApps/heft65wl2.html#religion
- [Rekonstruktionsnachweis und Quellen](docs/RECONSTRUCTION.md)
- [Blender-Original](blender/sankt-olof.blend) · [weboptimiertes GLB](public/assets/sankt-olof.glb)

## Bedienung

Die App öffnet mit einer bildschirmfüllenden Rundflugansicht um **05:00 Uhr**. Eine geschlossene, etwa dreiminütige Flugbahn führt außen um die Kirche, durch das Westportal ins Langhaus und zum Chor, wieder hinaus und zum Ausgangspunkt zurück. Kurze, einzeln eingeblendete Textzeilen begleiten den Flug – ohne Texttafel. Während der Schleifen läuft die Tageszeit weiter: standardmäßig 24 Stunden in 20 Minuten. „Flug pausieren“ stoppt Kamera und Zeit, „Selbst erkunden“ öffnet die freie Erkundung. Bei aktivierter Betriebssystempräferenz für reduzierte Bewegung steht der Rundflug zunächst still. Echtes Browser-Vollbild wird erst durch den Vollbildknopf angefordert, da der Browser dafür eine Nutzeraktion verlangt.

Außen: ziehen und zoomen. Vier Standpunkte führen nach außen, ins Langhaus, zum Chor und zum Taufstein. „Frei begehen“ startet vor dem mittigen Westportal. Im Gehmodus: ↑/↓ oder W/S gehen vorwärts/rückwärts; ←/→ oder A/D drehen weich, solange die Taste gehalten wird. Loslassen stoppt die Drehung sofort. Im Bild ziehen zum Umsehen; optional „Maus koppeln“ und Escape zum Lösen. Auf Touchgeräten funktioniert das Steuerkreuz entsprechend. Standort und Blickrichtung erscheinen in einem schematischen Grundriss.

„Uhrzeit & Licht“ öffnet Uhrzeit, Datum und die Auswahl von Aufgang, Tag, Untergang oder Nacht. Sonnen- und Mondstände werden für Sankt Olof berechnet, einschließlich schwedischer Sommerzeit. Wolken, Sternverteilung und Belichtung sind künstlerisch gestaltet. Nachts bleibt die Kirche innen hell und warm beleuchtet; die Fenster leuchten auch in der Außenansicht. Kameraflug und Zeitraffer pausieren beim Verlassen der sichtbaren Seite und werden dort nur auf Wunsch fortgesetzt. Beim erneuten Öffnen beginnt die gewünschte Startinszenierung wieder um 05:00 Uhr; Palette und gewähltes Datum bleiben gespeichert. Vollbild, abschaltbare Objektivreflexe, sanfte Bildfilter, sparsame Grafik und fünf Lesepaletten in Hell/Dunkel sind integriert.

## Lokal starten und prüfen

Node 22 oder neuer:

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm test` prüft Modell, Kollisionen, astronomische Hilfsfunktionen, Lenkung und die gesamte Drohnenkurve in 25-ms-Abständen mit räumlichem Kameraabstand. Die zusätzlichen Tests `node tests/browser.mjs` und `node tests/flight-browser.mjs` verwenden einen separat installierten Playwright-Testbrowser; dessen Modulpfad kann mit `PLAYWRIGHT_MODULE`, die Zieladresse mit `CHURCH_URL` gesetzt werden. Der zweite Test lässt die komplette Flugschleife tatsächlich ablaufen. Beide erzeugen Screenshots unter `/private/tmp/church-graphics-qa` beziehungsweise `/private/tmp/church-flight-qa` (mit `CHURCH_QA_DIR` änderbar). Sie gehören wegen der lokalen Browserabhängigkeit nicht zum Pages-Build.

`dist/` enthält ausschließlich die veröffentlichte Anwendung. Schriften, Three.js, SunCalc, Meshopt-Decoder, HDR-Umgebung und Modell werden lokal ausgeliefert; kein Font-, Skript- oder Material-CDN zur Laufzeit. Laub, Gras und Wolken entstehen lokal. Es gibt keine Analyse, Anmeldung oder Serverdatenbank. Darstellungspräferenzen, Uhrzeit und Datum werden bei verfügbarer Speicherung lokal gemerkt.

## In Blender bearbeiten und neu exportieren

Blender 5.2.2 LTS wurde tatsächlich zur Geometrie- und Materialerstellung verwendet. Die gepackte `.blend`-Datei enthält die komplette Szene und zwei Autorenkameras. Die quelloffene, deterministische Szenenerzeugung steht in `blender/build_church.py`. Alle Materialkarten liegen unter `blender/textures/`.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python blender/build_church.py
npx gltf-transform optimize /private/tmp/sankt-olof-detailed.raw.glb public/assets/sankt-olof.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --palette false --join false
npm test
npm run build
```

Der Blender-Export erzeugt auch die Kollisions- und Landschaftsdaten. Der rohe Export bleibt lokal und wird nicht versioniert. Meshopt und WebP reduzieren die Datei ohne Geometrievereinfachung; UVs und Materialkarten bleiben erhalten. Die Szene wird nach Material und Innen-/Außenkategorie zusammengefasst. Instanziertes Laub und Gras kommen zur Laufzeit hinzu. Die hohe Darstellung ergänzt Kontaktverschattung, Laubschatten und einen zurückhaltenden Lichtsaum; die sparsame Darstellung reduziert Laub und Gras und lässt diese Nachbearbeitung aus. Fensterbeleuchtung und Belichtung passen sich beim Betreten des Gebäudes an.

## Veröffentlichung

GitHub Pages mit „GitHub Actions“ als Quelle. `pages.yml` führt Kollisions-/Assetprüfungen und den Vite-Build aus und veröffentlicht ausschließlich `dist/`. Blender muss beim Webdeploy nicht installiert sein. Der Anwendungspfad ist relativ und funktioniert unter `/sankt-olof-3d/`.

## Genauigkeit und Rechte

Das Modell ist **kein Scan und keine metrisch genaue Replik**. Fotorealistisches PBR-Material kann die fehlende Vermessung nicht ersetzen. Alle Maße sind geschätzt, kleine Formen und Malereien vereinfacht. Die Altarfronten sind ausdrücklich gekennzeichnete fotografische Flächen. Kirchhof, Bäume und Gräber sind hypothetisch. Die App zeigt diese Einschränkungen dauerhaft und bietet 14 lizenzierte Bildreferenzen zum Vergleich sowie den Link zum offiziellen 360°-Rundgang.

Programmcode: MIT. Kombiniertes Blender-/GLB-Modell einschließlich der Rosbach-Fotoanpassungen: CC BY-SA 3.0. Referenzbilder behalten ihre individuellen Lizenzen. Poly-Haven-Materialien: CC0. Fira Sans und EB Garamond: SIL OFL. Siehe [Rechteübersicht](docs/LICENSES.md) und `public/licenses/`.
