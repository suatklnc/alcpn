'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { 
  HomeIcon,
  CalculatorIcon,
  DocumentTextIcon,
  UserIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

export default function Sidebar() {
  const { user, signOut } = useAuth();

  const navigation = [
    { name: 'Ana Sayfa', href: '/', icon: HomeIcon },
    { name: 'Hesaplayıcı', href: '/calculator', icon: CalculatorIcon },
    { name: 'Hesaplama Geçmişim', href: '/my-calculations', icon: DocumentTextIcon },
  ];

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200 pt-16">
      <div className="flex flex-col h-full">
        {/* User Info */}
        {user && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500">Kullanıcı</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <item.icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        {user && (
          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={() => signOut()}
              className="group flex items-center w-full px-3 py-2 text-sm font-medium text-red-700 rounded-md hover:bg-red-50 hover:text-red-900 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" />
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
