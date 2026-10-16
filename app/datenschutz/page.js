import LegalPage, { V } from '@/components/LegalPage';
import { UPDATED } from '@/lib/legal';

export const metadata = { title: 'Datenschutz – G City' };

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <p className="muted">Stand: {UPDATED}</p>
      <h2>1. Verantwortlicher</h2>
      <p><V k="name" />, <V k="street" />, <V k="city" />, E-Mail: <V k="email" /></p>
      <h2>2. Spielen ohne Konto</h2>
      <p>Spielername und Avatar werden nur in deinem Browser gespeichert (localStorage). Während eines Spiels werden Name, Avatar, Spielaktionen und Chatnachrichten in Echtzeit über Supabase (Supabase Inc., Server in der EU je nach Projekteinstellung) an die anderen Spieler im Raum übertragen und nicht dauerhaft gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
      <h2>3. Konto und Käufe</h2>
      <p>Für Käufe speichern wir E-Mail-Adresse, verschlüsseltes Passwort (über Supabase Auth), Münzstand, gekaufte Joker und eine Buchungsliste (Datum, Produkt, Betrag). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag) und lit. c (steuerliche Aufbewahrungspflichten).</p>
      <h2>4. Zahlungen über Stripe</h2>
      <p>Zahlungen wickelt Stripe Payments Europe Ltd., 1 Grand Canal Street Lower, Dublin 2, Irland ab. Dabei verarbeitet Stripe deine Zahlungsdaten selbst; wir erhalten keine vollständigen Karten- oder Kontodaten. Datenschutzhinweise von Stripe: stripe.com/de/privacy.</p>
      <h2>5. Hosting</h2>
      <p>Die App wird bei Vercel Inc. (USA) gehostet. Dabei werden technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt des Aufrufs) verarbeitet. Die Übermittlung in die USA erfolgt auf Grundlage des EU-US Data Privacy Framework bzw. von Standardvertragsklauseln.</p>
      <h2>6. KI-Fragen</h2>
      <p>Quizfragen werden mit der Claude API (Anthropic) erzeugt. Dabei werden keine personenbezogenen Daten von dir übermittelt, außer bei der Prüfung unklarer Quiz-Antworten (nur Frage und eingegebene Antwort, ohne Namen).</p>
      <h2>7. Speicherdauer</h2>
      <p>Kontodaten speichern wir, bis du dein Konto löschen lässt. Buchungsdaten bewahren wir wegen gesetzlicher Pflichten bis zu 10 Jahre auf.</p>
      <h2>8. Deine Rechte</h2>
      <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Schreib uns dafür an <V k="email" />.</p>
    </LegalPage>
  );
}
