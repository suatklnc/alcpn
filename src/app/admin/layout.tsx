
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Production'da authentication aktif et
  /*
  const supabase = await createClient();
  
  // Kullanıcı kontrolü
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/login?redirect=/admin');
  }

  // Admin rolü kontrolü
  const userRole = user.user_metadata?.role;
  if (userRole !== 'admin') {
    redirect('/?error=access_denied');
  }
  */

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
