'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Layout from '@/components/Layout';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Yükleniyor...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900">
            <span className="block">Malzeme Hesaplama</span>
            <span className="block text-indigo-600">Uygulaması</span>
          </h1>
          <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-500">
            Malzeme miktarlarını hesaplayın, güncel fiyatları görün ve
            projelerinizi optimize edin.
          </p>

          {user ? (
            <div className="mt-10">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
                <div className="flex items-center justify-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-green-800">
                      Başarıyla giriş yaptınız!
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Hesaplama özellikleri yakında eklenecek.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                <div className="flex items-center justify-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-blue-800">
                      Hesaplamalarınızı kaydedin
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Hesaplamalarınızı kaydetmek için lütfen giriş yapın.
                    </p>
                  </div>
                </div>
              </div>
        </div>
          )}

          {/* Features Grid */}
          <div className="mt-12 sm:mt-16 grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Hızlı Hesaplama Card */}
            <Link 
              href="/calculator" 
              className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200 block"
            >
              <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-md bg-indigo-500 text-white mb-3 sm:mb-4">
                <svg
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Hızlı Hesaplama
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm">
                Malzeme miktarlarını hızlı ve doğru bir şekilde hesaplayın.
              </p>
            </Link>

            {/* Güncel Fiyatlar Card */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-md bg-indigo-500 text-white mb-3 sm:mb-4">
                <svg
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Güncel Fiyatlar
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm">
                Otomatik olarak güncellenen malzeme fiyatları ile bütçenizi
                planlayın.
              </p>
            </div>

            {/* Hesaplama Geçmişi Card */}
            <Link 
              href="/my-calculations" 
              className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200 block"
            >
              <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-md bg-indigo-500 text-white mb-3 sm:mb-4">
                <svg
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Hesaplama Geçmişi
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm">
                Geçmiş hesaplamalarınızı kaydedin ve istediğiniz zaman tekrar
                görüntüleyin.
              </p>
            </Link>
          </div>
        </div>
    </div>
    </Layout>
  );
}
