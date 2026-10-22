# Sankt Olof · Eine Kirche begehen

Eine im Browser begehbare **interpretative Rekonstruktion des heutigen Bauzustands** der Sankt Olofs kyrka in Sankt Olof, Österlen / Skåne, Schweden. Eigenständiges Projekt von genaiedu; keine offizielle Vermessung der Kirchengemeinde.

- Anwendung: https://genaiedu.github.io/sankt-olof-3d/
- Religionsregister: https://genaiedu.github.io/LearningApps/heft65wl2.html#religion
- [Rekonstruktionsnachweis und Quellen](docs/RECONSTRUCTION.md)
- [Blender-Original](blender/sankt-olof.blend) · [weboptimiertes GLB](public/assets/sankt-olof.glb)

## Bedienung

Vor dem Beginn steht ein Hinweis zu Modellgenauigkeit und externen Bildern. Gleichwertige Knöpfe starten mit oder ohne externe Fotos. Die Bildfreigabe gilt nur für den Besuch und kann in der Fotostrecke jederzeit widerrufen werden; vorher erfolgen keine Wikimedia-Bildabrufe.

Nach dem Start beginnen **zwei unterschiedlich choreografierte Rundflüge um 05:00 Uhr**: zuerst durch das Westportal hinein und durch das Südportal hinaus, danach umgekehrt, mit anderer Außenroute und zusätzlichem Blick durch das nördliche Schiff. Beide Flüge dauern zusammen sechs Minuten. Die Ortszeit folgt demselben Zeitgeber: genau 24 Stunden, ohne Drift zwischen Kamerafahrt und Tageslicht. Kurze einzelne Textzeilen begleiten den Flug, ohne Texttafel. Nach dem zweiten Flug stoppt die Kamera vor dem Westportal auf 1,66 m Augenhöhe, um 05:00 Uhr des Folgetages. „Zeit zum eigenen Erkunden. Die Cursortasten leiten den Weg!“ lädt zum unmittelbar aktiven Gehmodus ein; es folgt keine Dauerschleife.

„Flug pausieren“ stoppt Kamera und Zeit, „Selbst erkunden“ beendet die Führung auch früher. Beim Scrollen zur Fotostrecke oder Verlassen des sichtbaren Tabs pausiert die Fahrt; eine Fortsetzung benötigt einen Klick. Reduzierte Bewegung lässt die Führung zunächst stillstehen. Echtes Browser-Vollbild wird erst durch den Vollbildknopf angefordert, da der Browser dafür eine Nutzeraktion verlangt.

Außen: ziehen und zoomen. Vier Standpunkte führen nach außen, ins Langhaus, zum Chor und zum Taufstein. „Frei begehen“ startet vor dem mittigen Westportal. Im Gehmodus: ↑/↓ oder W/S gehen vorwärts/rückwärts; ←/→ oder A/D drehen weich, solange die Taste gehalten wird. Loslassen stoppt die Drehung sofort. Im Bild ziehen zum Umsehen; optional „Maus koppeln“ und Escape zum Lösen. Auf Touchgeräten funktioniert das Steuerkreuz entsprechend. Standort und Blickrichtung erscheinen in einem schematischen Grundriss.

„Uhrzeit & Licht“ zeigt während der Führung die gebundene Ortszeit; in der eigenen Erkundung sind Uhrzeit, Datum, Aufgang, Tag, Untergang, Nacht und unabhängiger Zeitraffer frei bedienbar. Sonnen- und Mondstände werden für Sankt Olof berechnet, einschließlich schwedischer Sommerzeit. Wolken, Sternverteilung und Belichtung sind künstlerisch gestaltet. Nachts bleibt die Kirche innen hell und warm beleuchtet; die Fenster leuchten auch in der Außenansicht. Die inszenierten Objektiv-/Blendeffekte sind vollständig entfernt. Sanfte Bildfilter, sparsame Grafik und fünf Lesepaletten in Hell/Dunkel bleiben erhalten.

Unter der 3D-Ansicht stehen **14 extern geladene Fotografien** in den Abschnitten Bau/Raum, Ausstattung und Archiv. Alle sind auf Commons als Public Domain oder CC0 ausgewiesen; drei historische Außenansichten von 1900 sind ausdrücklich als solche beschriftet. Quellen, Fotografen, Rechteverweise und Prüftag stehen im Metadatenmodul `src/photo-data.js`. Bilder erscheinen unbeschnitten und lassen sich vergrößern. Es wurden dafür keine Bilddateien heruntergeladen oder ins Repository aufgenommen. Der ältere, für die Blender-Modellherstellung dokumentierte lokale Quellenbestand bleibt davon getrennt; die Browser-Fotostrecke greift nicht mehr darauf zu.

## Lokal starten und prüfen

Node 22 oder neuer:

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm test` prüft Modell, Kollisionen, Astronomie, Lenkung, Foto-Metadaten und beide Flugkurven in 25-ms-Abständen inklusive Portalreihenfolge, begrenzter Blickdrehung, Augenhöhe und exakt einem vergangenen Tag. Zusätzliche Tests `node tests/browser.mjs`, `node tests/photos-browser.mjs` und `node tests/flight-browser.mjs` verwenden einen separat installierten Playwright-Testbrowser (`PLAYWRIGHT_MODULE`, optional `CHURCH_URL`). Der Fototest prüft alle 14 echten Bildabrufe sowie Einwilligung/Widerruf; der Flugtest lässt die vollständigen sechs Minuten ablaufen und betritt anschließend mit den Pfeiltasten das Portal. Screenshots liegen unter `/private/tmp/church-graphics-qa`, `/private/tmp/church-photos-qa` und `/private/tmp/church-flight-qa` (mit `CHURCH_QA_DIR` änderbar). Diese Browserprüfungen gehören nicht zum Pages-Build.

`dist/` enthält ausschließlich die veröffentlichte Anwendung. Schriften, Three.js, SunCalc, Meshopt-Decoder, HDR-Umgebung und Modell kommen vom gleichen Ursprung; kein Font-, Skript- oder Material-CDN. Nur ausdrücklich freigegebene Galeriefotos werden von `upload.wikimedia.org` und `thumb.wikimedia.org` geladen, mit `no-referrer`. Laub, Gras und Wolken entstehen lokal. Es gibt keine Analyse, Anmeldung oder Serverdatenbank. Darstellungspräferenzen und Datum werden bei verfügbarer Speicherung lokal gemerkt; die externe Bildfreigabe wird nicht gespeichert.

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
