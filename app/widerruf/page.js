import LegalPage, { V } from '@/components/LegalPage';

export const metadata = { title: 'Widerrufsbelehrung – G City' };

export default function Widerruf() {
  return (
    <LegalPage title="Widerrufsbelehrung">
      <h2>Widerrufsrecht</h2>
      <p>Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.</p>
      <p>Um dein Widerrufsrecht auszuüben, musst du uns (<V k="name" />, <V k="street" />, <V k="city" />, E-Mail: <V k="email" />) mittels einer eindeutigen Erklärung (z. B. per E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das unten stehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</p>
      <p>Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.</p>
      <h2>Folgen des Widerrufs</h2>
      <p>Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast.</p>
      <h2>Vorzeitiges Erlöschen des Widerrufsrechts</h2>
      <p>Das Widerrufsrecht erlischt bei einem Vertrag über digitale Inhalte (Münzen, Joker, Bundles), wenn wir mit der Ausführung des Vertrags begonnen haben, nachdem du ausdrücklich zugestimmt hast, dass wir vor Ablauf der Widerrufsfrist mit der Ausführung beginnen, und du deine Kenntnis davon bestätigt hast, dass du durch deine Zustimmung mit Beginn der Ausführung dein Widerrufsrecht verlierst. Diese Zustimmung gibst du vor jedem Kauf über das Häkchen im Shop.</p>
      <h2>Muster-Widerrufsformular</h2>
      <p>An <V k="name" />, <V k="street" />, <V k="city" />, E-Mail: <V k="email" />:<br />
        Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über den Kauf der folgenden digitalen Inhalte: ______<br />
        Bestellt am: ______ · Name: ______ · E-Mail des Kontos: ______ · Datum: ______</p>
    </LegalPage>
  );
}
