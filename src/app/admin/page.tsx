'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { 
  BeakerIcon,
  CurrencyDollarIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Malzeme fiyat yönetimi ve URL test araçları
          </p>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Hızlı İşlemler
            </h3>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <a
                href="/admin/url-tester"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <BeakerIcon className="h-4 w-4 mr-2" />
                URL Tester
              </a>
              <a
                href="/admin/url-tester"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                Malzeme Fiyat Yönetimi
              </a>
              <a
                href="/admin/url-tester"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Fiyat Test Et
              </a>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <BeakerIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                URL Tester Kullanımı
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  URL Tester ile web sitelerinden malzeme fiyatlarını çekebilir, 
                  test edebilir ve varsayılan fiyat olarak ayarlayabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
