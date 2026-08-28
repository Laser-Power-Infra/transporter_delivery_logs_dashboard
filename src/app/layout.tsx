import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Delivery & Transporter Dashboard',
  description: 'PostgreSQL DeliveryDB dashboard synced with Google Sheet (Columns B to R) featuring null-override protection, audit logging, and dual-user access.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
