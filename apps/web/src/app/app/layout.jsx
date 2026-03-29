import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'TechServ ERP',
  description: 'Construction & Waterproofing ERP System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
