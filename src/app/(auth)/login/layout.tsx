import type { Metadata } from 'next';
import AntdProvider from '@/components/shared/AntdProvider';

export const metadata: Metadata = {
  title: 'Iniciar sesión — ASISTEDCOS Admin',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AntdProvider>{children}</AntdProvider>;
}
