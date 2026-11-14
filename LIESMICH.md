# Sieben neue Städte für Pizza Syndicate

Diese Mod fügt Pizza Syndicate (Mission CD) sieben neue Städte hinzu: Neapel, Porto, Manchester, Miami, Shanghai, Düsseldorf und Gizeh. Jede Stadt hat eine eigene, neu gezeichnete Karte mit eigenem Straßen- und Wegenetz. Alle Städte sind auf ein langes, entspanntes Spiel ausgelegt: hohe Kaufkraft, günstige Immobilien und deutlich mehr Kundschaft als in den Originalstädten.

Die Mod enthält keine Dateien des Spiels. Gebäude, Symbole und Stadtfotos stammen aus deiner eigenen Installation und werden beim Einspielen dort entnommen.

Dazu kommen elf eigene Sondergebäude, die für diese Mod in Blender im Stil des Spiels gebaut und gerendert wurden. Jede Stadt hat mindestens eines:

| Stadt | Eigene Sondergebäude |
|---|---|
| Neapel | Castel Nuovo |
| Porto | Torre dos Clérigos |
| Manchester | Baumwollspinnerei mit Schornstein |
| Miami | Art-déco-Hotel am Ocean Drive |
| Shanghai | Oriental Pearl Tower |
| Düsseldorf | Rheinturm, zwei Altbier-Brauhäuser |
| Gizeh | Kairoer Fernsehturm, zwei Moscheen |

Alle lassen sich anklicken, haben ein eigenes Infobild und werden von den Bewohnern als Sehenswürdigkeit besucht. Auch die Stadtfotos aller sieben Städte sind eigene Renderbilder. Grafiken und Fotos stehen wie die Mod unter der MIT-Lizenz.

## Voraussetzungen

- Pizza Syndicate mit Mission CD, installiert in `C:\Pizza Syndicate` (anderer Ordner: siehe unten)
- Node.js ab Version 16 (https://nodejs.org)
- Die Mod selbst: über GitHub mit `git clone https://github.com/lia-xim/pizza-syndicate-cities.git` oder als ZIP („Code“ → „Download ZIP“) herunterladen und entpacken

## Installieren

1. Das Spiel beenden.
2. Im Ordner der Mod `installieren.bat` doppelklicken. Liegt das Spiel nicht in `C:Pizza Syndicate`, den Spielordner mit der Maus auf `installieren.bat` ziehen.

   Oder in einer Eingabeaufforderung im Ordner der Mod:

   ```
   node install.js
   ```

   Liegt das Spiel woanders, den Ordner angeben:

   ```
   node install.js "D:\Spiele\Pizza Syndicate"
   ```

Beim ersten Lauf wird `Resource\mission.res` als `mission.res.orig` gesichert. Jede weitere Installation baut wieder auf dieser unveränderten Sicherung auf. Du kannst die Mod also beliebig oft neu einspielen, ohne dass sich etwas ansammelt.

Die neuen Städte erscheinen auf der Weltkarte. Du wählst sie wie jede andere Stadt beim Start einer Mission aus.

## Deinstallieren

Das Spiel beenden und ausführen:

```
node install.js --uninstall
```

Damit wird die Sicherung zurückgespielt, und das Spiel ist im Originalzustand.

## Fenstermodus und große Bildschirme

Pizza Syndicate läuft auf heutigen Windows-Versionen am besten mit [cnc-ddraw](https://github.com/FunkyFr3sh/cnc-ddraw). Damit läuft es im Fenster und scharf hochskaliert. cnc-ddraw ist nicht Teil der Mod und unabhängig von ihr.

1. Die aktuelle `cnc-ddraw.zip` von der Release-Seite herunterladen und in den Spielordner entpacken. Dabei kommen `ddraw.dll`, `ddraw.ini` und der Ordner `Shaders` neben `Pizza_Mission.exe`.
2. Den Abschnitt aus [`extras/ddraw-pizza-syndicate.ini`](extras/ddraw-pizza-syndicate.ini) ans Ende der `ddraw.ini` kopieren.

Das Spiel zeichnet intern mit 800 × 600 Pixeln im Format 4:3. Ein 16:9-Bild ist deshalb nicht möglich, links und rechts bleiben Ränder. Für scharfe Pixel ein ganzzahliges Vielfaches wählen. 1600 × 1200 passt auf WQHD und auf 4K mit 150 % Windows-Skalierung, 2400 × 1800 nur auf 4K mit 100 %. Mit Alt+Enter schaltet das Spiel jederzeit auf Vollbild.

## Spielstände

Originalstädte und alte Spielstände bleiben unverändert. Die Kürzel der neuen Städte beginnen mit Z, deshalb rutschen sie in der Städteliste ans Ende, und die Reihenfolge der Originalstädte bleibt gleich.

Ein Spielstand merkt sich die Karte, mit der er begonnen wurde. Nach einem Update der Mod siehst du die neuen Karten nur in einem **neuen Spiel**.

Spielstände aus einer der neuen Städte lassen sich nach der Deinstallation nicht mehr laden.

## Die sieben Städte

| Stadt | Land | Besonderheit |
|---|---|---|
| Neapel | Italien | Dichte Altstadt am Golf |
| Porto | Portugal | Lagunenstadt im Venedig-Stil |
| Manchester | Großbritannien | Zwei Stadien |
| Miami | USA | Hotelmeile am Strand |
| Shanghai | China | Größte und dichteste Karte |
| Düsseldorf | Deutschland | Altstadt, Kö und Rheinturm |
| Gizeh | Ägypten | Pyramiden am Wüstenrand |

### Neapel (ZNA, Italien)

Neapel ist die dichteste Stadt der Mod mit rund 390 Gebäuden.

- **Lage:** eine Altstadt am Golf. Die Spaccanapoli und die Via Toledo führen hindurch.
- **Wahrzeichen:** die Piazza del Plebiscito und das Castel dell'Ovo. Die Burg steht auf einer kleinen Insel, ein Damm führt hin.
- **Castel Nuovo:** die Burg am Hafen mit runden Zinnentürmen aus grauem Tuff und dem weißen Triumphbogen (eigene Grafik).
- **Weitere Ziele:** ein Stadion, eine Uni, ein Einkaufszentrum und Häfen mit Schiffen.
- **Ladenlokale:** Die freien Ladenlokale liegen eng beieinander. Alle Konkurrenten kämpfen um dieselben Viertel.

### Porto (ZPO, Portugal)

Porto ist eine Lagunenstadt im Stil von Venedig.

- **Lage:** Eine geschwungene Hauptinsel und eine zweite Insel sind von schmalen Kanälen durchzogen. Ein breiter Kanal windet sich durch die Mitte.
- **Verkehr:** Die Stadt besteht fast nur aus Fußwegen. Eine einzige Ringstraße mit Querstraße trägt den Lieferverkehr. Deshalb stehen Häuser auch weit weg von der Straße.
- **Ziele:** eine große Piazza mit dem Wahrzeichen aus Venedig, der barocke Granitturm Torre dos Clérigos (eigene Grafik) und ein Stadion.
- **Kundschaft:** viele Touristen.

Venedig hat im Spiel eine eigene Bootslieferung. Die ist fest an die Originalstadt Venedig gebunden und ließe sich nur durch eine Änderung der Spieldatei übertragen. Darauf wurde bewusst verzichtet. In Porto wird deshalb per Auto geliefert.

### Manchester (ZMA, Großbritannien)

Manchester ist die Stadionstadt der Mod.

- **Stadien:** zwei, Old Trafford im Westen am Kanal und das Etihad im Osten. Um beide herum liegen Kneipen- und Clubstraßen.
- **Kanal:** Der Schiffskanal endet in den Hafenbecken von Salford Quays, mit Piers, Lagerhallen und Schiffen.
- **Innenstadt:** Rathaus, Piccadilly Gardens, das Northern Quarter voller Clubs und ein Ring um die City.
- **Ancoats:** eine rote Backstein-Baumwollspinnerei mit hohem Schornstein, Erinnerung an „Cottonopolis“ (eigene Grafik).
- **Wohnviertel:** lange Reihenhausstraßen.
- **Kundschaft:** viele Teens und Prolls.

### Miami (ZMI, USA)

Miami steht stellvertretend für eine Flughafenstadt, für die es im Spiel keine Grafik gibt.

- **Lage:** Zwei Dämme führen vom Festland nach Miami Beach.
- **Hotelmeile:** Am Ocean Drive reihen sich die Hotels am Strand, mittendrin ein pastellfarbenes Art-déco-Hotel mit Neonschrift (eigene Grafik).
- **Hafen:** Am Hafen auf der Insel liegen Kreuzfahrtschiffe.
- **Weitere Orte:** die Venetian Islands und Hochhäuser in Downtown.
- **Kundschaft:** Touristen-Gewicht 100, dazu viele Yuppies und Bonzen.

### Shanghai (ZSH, China)

Shanghai ist die Mega-Metropole der Mod.

- **Lage:** Der breite Huangpu teilt die Stadt, zwei Brücken verbinden die Ufer.
- **Puxi (Westufer):** der Bund mit Uferpromenade, Banken und Hotels. Dazu People's Square mit großem Park, die Nanjing Road als autofreie Ladenstraße, die Altstadt am Yu-Garten, Stadion und Uni.
- **Pudong (Ostufer):** Lujiazui mit Bürotürmen und dem Oriental Pearl Tower mit seinen rosa Kugeln (eigene Grafik), die Century Avenue und ein Einkaufszentrum.
- **Freie Ladenlokale:** die meisten der Mod.

Die Karte hat die übliche Größe von 100 × 200 Feldern. Größere Karten würden eine Änderung der Spieldatei verlangen. Shanghai ist deshalb so dicht wie möglich gebaut und hat mehr Wohnhäuser als Lissabon, die Originalstadt mit den meisten.

### Düsseldorf (ZDU, Deutschland)

Der Rhein schwingt in einem großen Bogen durch die Stadt, drei Brücken verbinden die Ufer.

- **Altstadt:** ein dichtes Fußgängerviertel am Rhein, Kneipe an Kneipe, dazwischen freie Ladenlokale. Mittendrin stehen zwei Altbier-Brauhäuser mit Treppengiebel, am Burgplatz St. Lambertus.
- **Königsallee:** der Kö-Graben mit Läden und Hotels auf beiden Seiten, daneben der Hofgarten und ein Einkaufszentrum.
- **Rheinturm und Medienhafen:** Der Rheinturm steht am Ufer, mit grauem Schaft, Lichtzeitpegel-Uhr, schrägem Glasband und rot-weißer Antenne. Dahinter liegen die Hafenbecken mit Bürotürmen.
- **Eller:** eigenes Wohnviertel im Südosten mit Stadtteilzentrum und dem Park am Schloss Eller.
- **Weitere Ziele:** Oberkassel mit Rheinwiesen auf der anderen Rheinseite, die Arena im Norden und die Uni im Süden.

Rheinturm und Brauhäuser sind eigene Grafiken. Sie sind Sondergebäude: Man kann sie anklicken, sie haben ein eigenes Infobild, und Bewohner besuchen sie als Sehenswürdigkeit. Als echte Kneipen gehen die Brauhäuser nicht, weil das Spiel Kneipen an einer fest eingebauten Grafiknummer erkennt. Für St. Lambertus wird die Münchner Frauenkirche verwendet.

### Gizeh (ZGI, Ägypten)

Gizeh liegt zwischen Wüste und Nil.

- **Wüste:** Im Westen liegt eine kleine Wüstenbucht, oben und unten von Stadtvierteln eingefasst. Darin stehen die drei Pyramiden mit der Sphinx. Am Rand läuft der Sand in die angrenzenden Blöcke und bis an die Straßen. Davor liegt Nazlet el-Samman, die Touristen-Altstadt am Pyramidenplatz: Gassen ohne Autos, dicht an dicht Souvenirläden, Imbisse, Cafés, kleine Hotels und freie Ladenlokale.
- **Pyramidenstraße:** eine schnurgerade Achse vom Pyramidenplatz quer durch die Stadt.
- **Kastenstadt:** dichte Blöcke, Imbaba im Norden besonders eng und unregelmäßig. Dazwischen liegen rechteckige Kastenparks, der Zoo und der Orman-Garten an der Universität.
- **Nil:** Er füllt den Ostrand, mit Uferpromenade und Hotels am Wasser. Auf der Insel Gezira steht der Kairoer Fernsehturm mit seinem Lotusgitter.
- **Moscheen:** eine osmanische mit großer Kuppel und zwei Bleistift-Minaretten in der Stadtmitte, eine mamlukische mit rot-weiß gestreiften Mauern und Stufenminarett an der Touristen-Altstadt.
- **Weitere Ziele:** Stadion, Einkaufszentrum und ein Souk.

Mit 283 Gebäuden und 151 Wohnhäusern ist Gizeh fast doppelt so dicht bebaut wie das Original Kairo (154 Gebäude, 78 Wohnhäuser). Kaufkraft und Preise sind auf eine leichte Stadt eingestellt.

## Nachfrage im Vergleich

Der Vergleich lässt sich jederzeit neu berechnen:

```
node tools/nachfrage.js
```

Er liest die Werte aller Originalstädte aus deinem Spiel und stellt die Mod-Städte daneben. Wohnhäuser, Gebäude, Läden und Hotels sind auf der Karte gezählt. Läden sind freie Ladenlokale.

Die Spalte „Index“ verrechnet Laufkundschaft und Bestellhaushalte mit der Kaufkraft: (Figuren + Wohnhäuser) × Kaufkraft. Die beste Originalstadt hat den Wert 100.

| Stadt | Figuren | Wohnhäuser | Gebäude | Läden | Hotels | Kaufkraft | Index |
|---|---|---|---|---|---|---|---|
| Neapel | 380 | 238 | 390 | 24 | 20 | 1,8 | 240 |
| Düsseldorf | 380 | 215 | 335 | 25 | 14 | 1,8 | 231 |
| Shanghai | 380 | 197 | 331 | 32 | 13 | 1,8 | 224 |
| Gizeh | 380 | 151 | 283 | 26 | 20 | 1,7 | 195 |
| Miami | 380 | 162 | 279 | 25 | 20 | 1,9 | 222 |
| Manchester | 380 | 185 | 300 | 26 | 4 | 1,7 | 207 |
| Porto | 380 | 110 | 196 | 26 | 8 | 1,7 | 180 |
| Las Vegas (bestes Original) | 100 | 144 | 225 | 21 | 7 | 1,9 | 100 |
| München | 100 | 123 | 202 | 20 | 5 | 1,6 | 77 |
| Lissabon | 100 | 149 | 234 | 20 | 5 | – | – |

In den Stadtdaten von Lissabon steht als Kaufkraft 0. Deshalb ergibt sich dort kein sinnvoller Index.

Laufkundschaft und Bestellhaushalte liegen in allen sieben Städten beim 1,8- bis 2,4-Fachen der besten Originalstadt. Die Zahl der Figuren ist die wirksamste Stellschraube. In allen Originalstädten sind es 100, in der Mod 380. Mehr als 400 sind nicht möglich, weil das Spiel je Karte höchstens 500 Figuren verwaltet.

Stadtwerte wie Kaufkraft, Preise, Touristen und Kundengruppen stehen in `staedte.json` und lassen sich dort anpassen. Danach die Mod neu installieren.

## Bei Problemen

- **„Pizza Syndicate läuft noch“:** Das Spiel ganz beenden und den Befehl wiederholen.
- **Neue Karte erscheint nicht:** Ein neues Spiel beginnen. Alte Spielstände behalten ihre Karte.
- **Zurück zum Original:** `node install.js --uninstall`.

## Für Bastler

Die Karten werden von einem Generator in `tools/citygen` erzeugt. `node tools/citygen/build_all.js` baut alle sieben Karten neu nach `karten/`. Dabei entstehen auch Vorschaubilder (`karten/*.png`).

Vor dem ersten Bauen muss `node tools/citygen/learn.js` einmal laufen. Es lernt aus den Originalkarten, welche Bodenkacheln zusammenpassen.

Die eigenen Gebäude liegen als Blender-Modelle in `tools/art`, als Python-Skripte. `node tools/art/build.js` rendert sie mit Blender 4.2 und schreibt sie ins Grafikformat des Spiels nach `gfx/`. Das Format ist in `tools/sprite.js` beschrieben: 8-Bit-Bilder, Palette in `palette.db`, Einträge in der Grafikliste `MASTERGFX.iso`. Kamera, Licht und Ankerpunkt sind an den Originalen geeicht. Den Pfad zu Blender kann man über die Umgebungsvariable `BLENDER` setzen.
