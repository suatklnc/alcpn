
import AdminSidebar from '@/components/admin/AdminSidebar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Sadece bu email adresine sahip kullanıcılar admin paneline erişebilir
const getAdminEmails = () => {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  // Fallback olarak hardcoded email (güvenlik için)
  if (adminEmails.length === 0) {
    return ['suatklnc@gmail.com'];
  }
  return adminEmails.map(email => email.trim());
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Kullanıcı kontrolü
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/login?redirect=/admin');
  }

  // Email bazlı admin kontrolü
  const adminEmails = getAdminEmails();
  if (!user.email || !adminEmails.includes(user.email)) {
    redirect('/?error=access_denied&message=Admin paneline erişim yetkiniz yok');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar />
        
        {/* Main Content */}
        <div className="flex-1 ml-64">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
