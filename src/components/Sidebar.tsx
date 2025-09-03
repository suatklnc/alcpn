'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { 
  HomeIcon,
  CalculatorIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  onToggleSidebar?: () => void;
}

export default function Sidebar({ onToggleSidebar }: SidebarProps) {
  const { user, signOut } = useAuth();

  const navigation = [
    { name: 'Ana Sayfa', href: '/', icon: HomeIcon },
    { name: 'Hesaplayıcı', href: '/calculator', icon: CalculatorIcon },
    { name: 'Hesaplama Geçmişim', href: '/my-calculations', icon: DocumentTextIcon },
  ];

  return (
    <div data-sidebar className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-2xl border-r border-gray-100 pt-16">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">ALCPN</h2>
            <p className="text-sm text-gray-500">Malzeme Hesaplayıcı</p>
          </div>
        </div>
        <button
          onClick={() => {
            console.log('Close button clicked'); // Debug için
            onToggleSidebar?.();
          }}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close sidebar"
        >
          <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex flex-col h-full overflow-y-auto">
        {/* User Info */}
        {user && (
          <div className="px-6 py-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500">Aktif Kullanıcı</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-6 py-4">
          <div className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="group flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 transition-all duration-200"
              >
                <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-lg bg-gray-100 group-hover:bg-indigo-100 transition-colors">
                  <item.icon className="h-4 w-4 text-gray-600 group-hover:text-indigo-600" />
                </div>
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* Logout Button */}
        {user && (
          <div className="px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => signOut()}
              className="group flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 transition-all duration-200"
            >
              <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
                <ArrowRightOnRectangleIcon className="h-4 w-4 text-red-600 group-hover:text-red-700" />
              </div>
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
