import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title:       'ASISTEDCOS Admin',
  description: 'Sistema de gestión interno — Fundación ASISTEDCOS El Salvador',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.variable}>
        {children}
        <Toaster
          position="top-right"
          expand={false}
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily:   'var(--font-sans, Inter, sans-serif)',
              fontSize:     '13.5px',
              borderRadius: '10px',
              border:       '1px solid hsl(240 8% 88%)',
              boxShadow:    '0 4px 24px rgba(30,50,30,0.12), 0 1px 4px rgba(30,50,30,0.08)',
            },
            classNames: {
              toast:   'ong-toast',
              success: 'ong-toast--success',
              error:   'ong-toast--error',
              warning: 'ong-toast--warning',
            },
          }}
        />
      </body>
    </html>
  );
}
