import LegalPage, { V } from '@/components/LegalPage';

export const metadata = { title: 'Impressum – G City' };

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p><V k="name" /><br /><V k="business" /><br /><V k="street" /><br /><V k="city" /><br />Deutschland</p>
      <h2>Kontakt</h2>
      <p>E-Mail: <V k="email" /><br />Telefon: <V k="phone" /></p>
      <h2>Umsatzsteuer</h2>
      <p><V k="vat" /></p>
      <h2>Verantwortlich für den Inhalt</h2>
      <p><V k="name" />, Anschrift wie oben.</p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    </LegalPage>
  );
}
