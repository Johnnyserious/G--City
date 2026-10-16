import './globals.css';

export const metadata = {
  title: 'G City',
  description: 'G City – Spieleabend für die Gruppe',
};
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#170f3a' };

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Lilita+One&family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎲</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
