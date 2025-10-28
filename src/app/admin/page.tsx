
import AdminDashboard from '@/components/admin/AdminDashboard';
import { Suspense } from 'react';

export const metadata = {
  title: 'Admin Panel - Pegasus v1',
  description: 'Painel de administração para Pegasus v1.'
};

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">Carregando Painel Administrativo...</p>
      </div>
    }>
      <AdminDashboard />
    </Suspense>
  );
}
