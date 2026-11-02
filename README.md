# Renditerechner Deutschland

PWA zur Berechnung der Eigen- und Gesamtkapitalrendite von Wohnimmobilien in Deutschland: Kauf, Vermietung, Verkauf, Steuern (ESt-Tarif 2026, AfA, § 21 Abs. 2, § 23 EStG) und Familienmodelle (Vermietung an Kinder, Schenkung, Nießbrauch, Verkauf an Kinder).

Live: https://romanschempp.github.io/renditerechner-deutschland/

```bash
npm install
npm run dev     # Entwicklung
npm test        # Tests des Rechenkerns
npm run build   # Produktion (dist/)
```

Rechenkern: `src/engine/` (rein funktional, ohne React). Rechtsstand und Tabellen: `src/engine/constants.ts`.

Keine Steuer-, Rechts- oder Anlageberatung.
