# Sankt Olof · Eine Kirche begehen

Eine im Browser begehbare **interpretative Rekonstruktion des heutigen Bauzustands** der Sankt Olofs kyrka in Sankt Olof, Österlen / Skåne, Schweden. Eigenständiges Projekt von genaiedu; keine offizielle Vermessung der Kirchengemeinde.

- Anwendung: https://genaiedu.github.io/sankt-olof-3d/
- Religionsregister: https://genaiedu.github.io/LearningApps/heft65wl2.html#religion
- [Rekonstruktionsnachweis und Quellen](docs/RECONSTRUCTION.md)
- [Blender-Original](blender/sankt-olof.blend) · [weboptimiertes GLB](public/assets/sankt-olof.glb)

## Bedienung

Außen: ziehen und zoomen. Vier Standpunkte führen direkt ins Langhaus, zum Chor und zum Taufstein. „Frei begehen“ startet auf dem Kirchhof. Im Gehmodus: WASD oder Pfeiltasten, im Bild ziehen zum Umsehen; optional „Maus koppeln“ und Escape zum Lösen. Auf Touchgeräten übernimmt ein Steuerkreuz die Bewegung. Standort und Blickrichtung erscheinen in einem schematischen Grundriss. Vollbild, zwei Lichtstimmungen, sparsame Grafik und fünf Lesepaletten in Hell/Dunkel sind integriert.

## Lokal starten und prüfen

Node 22 oder neuer:

```sh
npm ci
npm run dev
npm test
npm run build
```

`dist/` enthält ausschließlich die veröffentlichte Anwendung. Schriften, Three.js, Meshopt-Decoder, HDR-Umgebung und Modell werden lokal ausgeliefert; kein Font-, Skript- oder Material-CDN zur Laufzeit. Es gibt keine Analyse, Anmeldung oder Serverdatenbank. Darstellungspräferenzen werden bei verfügbarer Speicherung lokal gemerkt.

## In Blender bearbeiten und neu exportieren

Blender 5.2.2 LTS wurde tatsächlich zur Geometrie- und Materialerstellung verwendet. Die gepackte `.blend`-Datei enthält die komplette Szene und zwei Autorenkameras. Die quelloffene, deterministische Szenenerzeugung steht in `blender/build_church.py`. Alle Materialkarten liegen unter `blender/textures/`.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python blender/build_church.py
npx gltf-transform optimize blender/sankt-olof.raw.glb public/assets/sankt-olof.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --palette false --join false
npm test
npm run build
```

Der Blender-Export erzeugt auch die Kollisionsdaten. Der rohe Export bleibt lokal und wird nicht versioniert. Die Weboptimierung reduziert den Export von etwa 14 MB auf **2,74 MB**, ohne die Geometrie zu vereinfachen. UVs und Materialkarten bleiben erhalten. Die Szene wird nach Material zusammengefasst; die Standardansicht hat ungefähr 107.000 Dreiecke und 31 Geometrie-Zeichenaufrufe. Kontaktverschattung wird in der sparsamen Darstellung ausgelassen. Fensterbeleuchtung und Belichtung passen sich beim Betreten des Gebäudes an.

## Veröffentlichung

GitHub Pages mit „GitHub Actions“ als Quelle. `pages.yml` führt Kollisions-/Assetprüfungen und den Vite-Build aus und veröffentlicht ausschließlich `dist/`. Blender muss beim Webdeploy nicht installiert sein. Der Anwendungspfad ist relativ und funktioniert unter `/sankt-olof-3d/`.

## Genauigkeit und Rechte

Das Modell ist **kein Scan und keine metrisch genaue Replik**. Fotorealistisches PBR-Material kann die fehlende Vermessung nicht ersetzen. Alle Maße sind geschätzt, kleine Formen und Malereien vereinfacht. Die Altarfronten sind ausdrücklich gekennzeichnete fotografische Flächen. Kirchhof, Bäume und Gräber sind hypothetisch. Die App zeigt diese Einschränkungen dauerhaft und bietet 14 lizenzierte Bildreferenzen zum Vergleich sowie den Link zum offiziellen 360°-Rundgang.

Programmcode: MIT. Kombiniertes Blender-/GLB-Modell einschließlich der Rosbach-Fotoanpassungen: CC BY-SA 3.0. Referenzbilder behalten ihre individuellen Lizenzen. Poly-Haven-Materialien: CC0. Fira Sans und EB Garamond: SIL OFL. Siehe [Rechteübersicht](docs/LICENSES.md) und `public/licenses/`.
