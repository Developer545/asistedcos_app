import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AntdProvider from '@/components/shared/AntdProvider';
import DashboardSidebar from '@/components/layout/DashboardSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <AntdProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <DashboardSidebar />
        <main style={{
          flex:       1,
          padding:    '28px 32px',
          minWidth:   0,
          background: 'hsl(var(--bg-page))',
          overflowX:  'hidden',
        }}>
          {children}
        </main>
      </div>
    </AntdProvider>
  );
}
