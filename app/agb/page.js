import LegalPage, { V } from '@/components/LegalPage';
import { UPDATED } from '@/lib/legal';

export const metadata = { title: 'AGB – G City' };

export default function AGB() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen">
      <p className="muted">Stand: {UPDATED}</p>
      <h2>1. Anbieter und Geltung</h2>
      <p>Diese AGB gelten für alle Käufe in der Web-App „G City“ zwischen <V k="name" /> (<V k="business" />, <V k="street" />, <V k="city" />) – im Folgenden „Anbieter“ – und den Nutzerinnen und Nutzern.</p>
      <h2>2. Leistungen</h2>
      <p>G City ist kostenlos spielbar. Optional können virtuelle Münzen, Münzpakete und Bundles mit Spiel-Jokern gekauft werden. Münzen können in der App gegen Joker eingetauscht werden. Münzen und Joker sind ausschließlich in G City nutzbar, haben keinen Geldwert, können nicht in Geld zurückgetauscht, übertragen oder ausgezahlt werden.</p>
      <h2>3. Konto</h2>
      <p>Käufe erfordern ein Konto (E-Mail und Passwort). Du bist für die Geheimhaltung deines Passworts verantwortlich. Käufe sind Personen ab 18 Jahren oder Minderjährigen mit Zustimmung der Erziehungsberechtigten vorbehalten.</p>
      <h2>4. Vertragsschluss und Preise</h2>
      <p>Mit Klick auf den Preis und Abschluss der Zahlung bei unserem Zahlungsdienstleister Stripe gibst du ein verbindliches Angebot ab; der Vertrag kommt mit der Gutschrift in deinem Konto zustande. Alle Preise sind Endpreise in Euro.</p>
      <h2>5. Zahlung</h2>
      <p>Die Zahlung erfolgt über Stripe (z. B. Karte, Apple Pay, Google Pay, PayPal, Klarna – je nach Verfügbarkeit). Es gelten zusätzlich die Bedingungen des Zahlungsdienstleisters.</p>
      <h2>6. Widerrufsrecht</h2>
      <p>Es gilt die <a href="/widerruf">Widerrufsbelehrung</a>. Das Widerrufsrecht erlischt bei digitalen Inhalten, wenn du vor dem Kauf ausdrücklich zugestimmt hast, dass wir sofort liefern, und bestätigt hast, dass du dadurch dein Widerrufsrecht verlierst.</p>
      <h2>7. Spielregeln und Verfügbarkeit</h2>
      <p>Gekaufte Joker unterliegen den Spielregeln (z. B. höchstens ein gekaufter Joker pro Spiel; der Host eines Raums kann gekaufte Joker deaktivieren). Wir bemühen uns um eine ständige Verfügbarkeit, können diese aber nicht garantieren. Spiele und Inhalte können weiterentwickelt oder geändert werden.</p>
      <h2>8. Missbrauch</h2>
      <p>Bei Manipulation, Betrug oder Rückbuchungen ohne Grund können Konten gesperrt werden.</p>
      <h2>9. Haftung</h2>
      <p>Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit. Im Übrigen haften wir nur bei Verletzung wesentlicher Vertragspflichten, begrenzt auf den vorhersehbaren, typischen Schaden.</p>
      <h2>10. Schlussbestimmungen</h2>
      <p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts; zwingende Verbraucherschutzvorschriften deines Wohnsitzlandes bleiben unberührt.</p>
    </LegalPage>
  );
}
