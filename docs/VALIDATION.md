# Prüfung am 17. Oktober 2026

- Blender 5.2.2 LTS: vollständige Szene tatsächlich erzeugt, Materialien gepackt, `.blend` gespeichert und GLB exportiert.
- Webexport: 2,74 MB, Meshopt-Geometrie und WebP-Texturen; 30 Meshes. Quellgeometrie wird bei der Weboptimierung nicht vereinfacht.
- `npm test`: 943 Kollisionskörper; offene West-/Südportale, Vorhallentür, Chorbogen und Sakristeitür. Die durchgängige zentrale Route Westportal–Hochaltar wird in 8-cm-Schritten geprüft. Wände, Pfeiler, Banklehnen und Altar blockieren die Bewegung.
- `npm run build`: erfolgreich. Relative Ressourcenpfade für GitHub Pages, alle unmittelbar referenzierten gebauten Einstiegsmittel vorhanden. `dist/` enthält nur die Anwendung; Blender-Dateien und Entwicklungsmaterialien bleiben im Repository.
- Browserkontrolle in Chrome / Codex-Vorschau: Außenansicht und alle vier Standpunkte, sichtbare Gewölbe und Altarflächen, Grafikmodi, Quellenfenster und lokale Fotoverweise.
- Tastatur: gehaltenes W bewegt die Kamera; die geprüfte Position änderte sich von X −5,531 auf −4,481 bei unveränderter Augenhöhe und Z-Position.
- Bildschirm-Steuerkreuz: 700 ms Vorwärts bewegt die Kamera von X −7,000 auf −5,531. Die Bewegung stoppt nach dem Loslassen.
- Responsive Ansichten: Desktop 1440×1000, schmale Vorschau 658 Pixel und Smartphone-Layout 390×844. Keine physische iPhone-/Android-Hardware oder separate Safari-Abnahme. Die 390-Pixel-Sichtkontrolle erfolgte vor den abschließenden reinen Modell-/Materialkorrekturen; Layout und Tastenmaße blieben dabei gleich.
- Alle fünf Lesepaletten jeweils hell und dunkel über die echte Auswahl umgeschaltet; dunkle Darstellung visuell kontrolliert. Graphit/Hell ist ohne gespeicherte Präferenz die Vorauswahl.
- Lokale Schriftdateien: Fira Sans und EB Garamond enthalten `liga`, `onum`, `pnum` und deutsche Umlaute/ß. Normale, echte kursive und fette/halbfette Schnitte werden mit ausgeliefert.
- Laufzeitbibliothek: Abhängigkeitsprüfung meldet keine bekannten Sicherheitslücken.

Die Bezeichnung „fotorealistisch“ ist kein Testresultat: Materialwirkung ist PBR-basiert, Geometrie und Ausstattung bleiben eine sichtbar vereinfachte, ausdrücklich als solche ausgewiesene Rekonstruktion. Die App ersetzt weder Originalfotografien noch ein Aufmaß.
