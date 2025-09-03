'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Layout from '@/components/Layout';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function HomeContent() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);

  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    
    if (error === 'access_denied' && message) {
      setErrorMessage(message);
    }
  }, [searchParams]);

  useEffect(() => {
    // Sadece URL'de 'login=success' parametresi varsa giriş başarı mesajını göster
    const loginSuccess = searchParams.get('login');
    if (user && loginSuccess === 'success') {
      setShowSuccessMessage(true);
      
      // URL'den parametreyi temizle
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      window.history.replaceState({}, '', url.toString());
      
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [user, searchParams]);

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
        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erişim Reddedildi</h3>
                <div className="mt-2 text-sm text-red-700">{errorMessage}</div>
              </div>
            </div>
          </div>
        )}

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
              {showSuccessMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto mb-6 animate-fade-in">
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
                        Hesaplama özelliklerine erişebilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Kullanıcı Hoş Geldin Mesajı */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-8 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mx-auto mb-4">
                    <svg
                      className="h-8 w-8 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Hoş geldiniz!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Artık tüm hesaplama özelliklerine erişebilir ve hesaplamalarınızı kaydedebilirsiniz.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/calculator"
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Hesaplama Yap
                    </Link>
                    <Link
                      href="/my-calculations"
                      className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Hesaplamalarım
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mx-auto mb-4">
                    <svg
                      className="h-8 w-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Hesaplamalarınızı Kaydedin
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Hesaplamalarınızı kaydetmek ve geçmiş hesaplamalarınıza erişmek için giriş yapın.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Giriş Yap
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Kayıt Ol
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features Grid */}
          <div className="mt-16 sm:mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Özellikler
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Malzeme hesaplama sürecinizi kolaylaştıran güçlü araçlar
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Hızlı Hesaplama Card */}
              <Link 
                href="/calculator" 
                className="group bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 block border border-gray-100 hover:border-indigo-200"
              >
                <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="h-7 w-7"
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
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Hızlı Hesaplama
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Malzeme miktarlarını hızlı ve doğru bir şekilde hesaplayın. Tavan ve duvar türlerine göre otomatik hesaplama.
                </p>
                <div className="mt-4 flex items-center text-indigo-600 font-medium group-hover:text-indigo-700">
                  Hesaplamaya Başla
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              {/* Güncel Fiyatlar Card */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white mb-4">
                  <svg
                    className="h-7 w-7"
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
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Güncel Fiyatlar
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Otomatik olarak güncellenen malzeme fiyatları ile bütçenizi planlayın. Gerçek zamanlı fiyat takibi.
                </p>
                <div className="mt-4 flex items-center text-green-600 font-medium">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Sürekli Güncel
                </div>
              </div>

              {/* Hesaplama Geçmişi Card */}
              <Link 
                href="/my-calculations" 
                className="group bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 block border border-gray-100 hover:border-indigo-200"
              >
                <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="h-7 w-7"
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
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Hesaplama Geçmişi
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Geçmiş hesaplamalarınızı kaydedin ve istediğiniz zaman tekrar görüntüleyin. Proje takibi yapın.
                </p>
                <div className="mt-4 flex items-center text-orange-600 font-medium group-hover:text-orange-700">
                  Geçmişi Görüntüle
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>
        </div>
    </div>
    </Layout>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Yükleniyor...</div>
        </div>
      </Layout>
    }>
      <HomeContent />
    </Suspense>
  );
}
