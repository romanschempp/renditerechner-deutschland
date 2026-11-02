import { LEGAL_DATE } from '../../engine/constants'

const CHECK: { title: string; items: string[] }[] = [
  {
    title: 'Vor dem Kauf prüfen',
    items: [
      'Grundbuchauszug: Abteilung II (Wegerechte, Nießbrauch, Vorkaufsrechte) und III (Grundschulden)',
      'Teilungserklärung und Gemeinschaftsordnung: Sondernutzungsrechte, Kostenverteilung, Vermietungsbeschränkungen',
      'Protokolle der Eigentümerversammlungen der letzten 3 Jahre, beschlossene Sonderumlagen und Maßnahmen',
      'Wirtschaftsplan, Jahresabrechnung, Höhe der Erhaltungsrücklage (Faustregel ≥ 20–30 €/m²)',
      'Energieausweis, Heizungsart und -alter (GEG, CO₂-Kosten), Dämmzustand',
      'Mietvertrag, Mieterhöhungen der letzten Jahre, Kaution, Mietrückstände, Kündigungssperrfrist nach Umwandlung (§ 577a BGB)',
      'Mietspiegel, Mietpreisbremse, Kappungsgrenze, Erhaltungs-/Milieuschutzsatzung (Umwandlungs- und Modernisierungsbeschränkungen)',
      'Baulastenverzeichnis, Altlastenkataster, Denkmalschutz, Bebauungsplan',
      'Vorkaufsrecht der Gemeinde bzw. des Mieters (§ 577 BGB bei Umwandlung)',
      'Finanzierungszusage vor der Beurkundung, Kaufvertragsentwurf 14 Tage vorher (Verbraucher)',
    ],
  },
  {
    title: 'Steuern beim Kauf',
    items: [
      'Kaufpreisaufteilung Boden/Gebäude/Inventar im Kaufvertrag festhalten (plausibel, sonst BMF-Arbeitshilfe)',
      'Inventar (Einbauküche, Möbel) gesondert ausweisen: keine Grunderwerbsteuer, AfA über 10 Jahre',
      'Renovierung in den ersten 3 Jahren ≤ 15 % der Gebäude-AK (netto) halten, sonst nur AfA (§ 6 Abs. 1 Nr. 1a EStG)',
      'Kosten vor Vermietung als vorweggenommene Werbungskosten dokumentieren (Inserate, Vermietungsabsicht)',
      'Verlust im Kaufjahr: Freibetrag im Lohnsteuerabzug (Lohnsteuer-Ermäßigung) beantragen, um Liquidität sofort zu nutzen',
    ],
  },
  {
    title: 'Laufende Vermietung',
    items: [
      'Anlage V jährlich; Belege 10 Jahre aufbewahren',
      'Betriebskostenabrechnung innerhalb von 12 Monaten nach Abrechnungszeitraum (§ 556 Abs. 3 BGB)',
      'Mieterhöhung: Vergleichsmiete (§ 558), Index (§ 557b) oder Staffel (§ 557a); Modernisierung (§ 559)',
      'Rauchwarnmelder, Trinkwasser (Legionellen bei Großanlagen), Verkehrssicherungspflicht',
      'CO₂-Kostenaufteilung in der Heizkostenabrechnung ausweisen',
      'Grundsteuer seit 2025 neu – Bescheid prüfen und umlegen',
    ],
  },
  {
    title: 'Verkauf',
    items: [
      'Spekulationsfrist: mehr als 10 Jahre zwischen den Notarverträgen (§ 23 EStG)',
      'Ausnahme Eigennutzung: im Verkaufsjahr und den beiden Vorjahren (zusammenhängend) oder durchgehend',
      'Steuerpflichtiger Gewinn = Preis − Kosten − (AK − in Anspruch genommene AfA)',
      'Vorfälligkeitsentschädigung vermeiden: Zinsbindungsende oder 10 Jahre nach Auszahlung (§ 489 BGB) abwarten, Darlehen auf neues Objekt übertragen (Pfandtausch)',
      'Mehr als 3 Verkäufe in 5 Jahren → gewerblicher Grundstückshandel',
      'Verkauf vermietet vs. leer: Leerstand bringt oft höhere Preise, aber Kündigung nur mit Eigenbedarf möglich',
    ],
  },
  {
    title: 'Familie',
    items: [
      'Vermietung an Kinder: Mietvertrag wie unter Fremden, Zahlung vom Konto des Kindes, ab 66 % der ortsüblichen Warmmiete voller Werbungskostenabzug',
      'Unentgeltliche Überlassung an kindergeldberechtigtes Kind = Eigennutzung für § 23 (steuerfreier Verkauf auch vor 10 Jahren)',
      'Schenkung: 400.000 € Freibetrag je Elternteil und Kind alle 10 Jahre; 10 % Abschlag für vermietete Wohnungen (§ 13d ErbStG)',
      'Nießbrauchsvorbehalt: Kapitalwert mindert die Schenkungsteuer; Eltern behalten Einkünfte und AfA',
      'Übertragung/Verkauf an Kinder ist grunderwerbsteuerfrei (§ 3 Nr. 2 und Nr. 6 GrEStG)',
      'Schuldübernahme macht die Schenkung teilentgeltlich – innerhalb von 10 Jahren kann § 23 bei den Eltern greifen',
      'Rückforderungsrechte, Pflichtteilsergänzung (10-Jahres-Abschmelzung) und Sozialhilferegress notariell bedenken',
    ],
  },
  {
    title: 'Nicht im Rechner abgebildet',
    items: [
      'Vermögensverwaltende GmbH (15,8 % Steuer bei erweiterter Gewerbesteuerkürzung, aber Ausschüttungssteuer und keine 10-Jahres-Frist) – Einzelfallprüfung',
      'Kurzzeit- und Ferienvermietung (Gewerblichkeit, Umsatzsteuer, Zweckentfremdung)',
      'Gewerbliche Vermietung mit Umsatzsteueroption',
      'Erbschaftsteuer auf weiteres Vermögen, Güterstandsfragen',
    ],
  },
]

export function Knowledge() {
  return (
    <div className="knowledge">
      {CHECK.map((g) => (
        <details className="details" key={g.title}>
          <summary>{g.title}</summary>
          <ul className="checklist">
            {g.items.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </details>
      ))}
      <p className="small muted">Rechtsstand {LEGAL_DATE}. Keine Steuer-, Rechts- oder Anlageberatung. Alle Werte sind Annahmen; vor Entscheidungen mit Steuerberater bzw. Notar prüfen.</p>
    </div>
  )
}
