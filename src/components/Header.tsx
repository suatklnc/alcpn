'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleMobileMenu = () => {
    if (!isMobileMenuOpen) {
      setIsMobileMenuOpen(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      setTimeout(() => {
        setIsMobileMenuOpen(false);
      }, 500); // Animation duration
    }
  };

  const closeMobileMenu = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsMobileMenuOpen(false);
    }, 500);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">ALCPN</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link
              href="/"
              className="group flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200"
            >
              <div className="flex items-center justify-center w-6 h-6 mr-2 rounded-md bg-gray-100 group-hover:bg-indigo-100 transition-colors">
                <svg className="h-3 w-3 text-gray-600 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              Ana Sayfa
            </Link>
            <Link
              href="/calculator"
              className="group flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200"
            >
              <div className="flex items-center justify-center w-6 h-6 mr-2 rounded-md bg-gray-100 group-hover:bg-indigo-100 transition-colors">
                <svg className="h-3 w-3 text-gray-600 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              Hesaplayıcı
            </Link>
            <Link
              href="/my-calculations"
              className="group flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200"
            >
              <div className="flex items-center justify-center w-6 h-6 mr-2 rounded-md bg-gray-100 group-hover:bg-indigo-100 transition-colors">
                <svg className="h-3 w-3 text-gray-600 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Hesaplama Geçmişim
            </Link>
          </nav>



          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {loading ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <div className="hidden sm:block">
                  <span className="text-sm text-gray-700">
                    Hoş geldin,{' '}
                    <span className="font-medium">{user.email}</span>
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="group flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                >
                  <div className="flex items-center justify-center w-6 h-6 mr-2 rounded-md bg-red-100 group-hover:bg-red-200 transition-colors">
                    <svg className="h-3 w-3 text-red-600 group-hover:text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  Çıkış
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/register"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Kayıt Ol
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={toggleMobileMenu}
              data-hamburger
              className="text-gray-700 hover:text-indigo-600 focus:outline-none focus:text-indigo-600 p-2 transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              <div className="relative w-6 h-6">
                {/* Hamburger lines with smooth transitions */}
                <span 
                  className={`absolute top-1 left-0 w-6 h-0.5 bg-current transition-all duration-300 ease-in-out ${
                    isMobileMenuOpen ? 'rotate-45 translate-y-2' : 'translate-y-0'
                  }`}
                />
                <span 
                  className={`absolute top-3 left-0 w-6 h-0.5 bg-current transition-all duration-300 ease-in-out ${
                    isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span 
                  className={`absolute top-5 left-0 w-6 h-0.5 bg-current transition-all duration-300 ease-in-out ${
                    isMobileMenuOpen ? '-rotate-45 -translate-y-2' : 'translate-y-0'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Sidebar */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            {/* Backdrop with blur effect and fade animation */}
            <div 
              className={`fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-500 ease-out ${
                isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={closeMobileMenu}
            />
            
            {/* Sidebar with slide animation */}
            <div className={`fixed inset-y-0 left-0 w-80 bg-white shadow-2xl transform transition-all duration-500 ease-out flex flex-col ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
              {/* Header with close button */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
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
                  onClick={closeMobileMenu}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex flex-col flex-1 min-h-0">
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
                <nav className="flex-1 px-6 py-4 overflow-y-auto min-h-0">
                  <div className="space-y-2">
                    <Link
                      href="/"
                      className={`group flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 transition-all duration-200 transform ${
                        isAnimating ? 'animate-slide-in-left' : 'opacity-0 -translate-x-full'
                      }`}
                      style={{ animationDelay: isAnimating ? '0.1s' : '0s' }}
                      onClick={closeMobileMenu}
                    >
                      <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-lg bg-gray-100 group-hover:bg-indigo-100 transition-colors">
                        <svg className="h-4 w-4 text-gray-600 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      Ana Sayfa
                    </Link>
                    <Link
                      href="/calculator"
                      className={`group flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 transition-all duration-200 transform ${
                        isAnimating ? 'animate-slide-in-left' : 'opacity-0 -translate-x-full'
                      }`}
                      style={{ animationDelay: isAnimating ? '0.2s' : '0s' }}
                      onClick={closeMobileMenu}
                    >
                      <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-lg bg-gray-100 group-hover:bg-indigo-100 transition-colors">
                        <svg className="h-4 w-4 text-gray-600 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      Hesaplayıcı
                    </Link>
                    <Link
                      href="/my-calculations"
                      className={`group flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 transition-all duration-200 transform ${
                        isAnimating ? 'animate-slide-in-left' : 'opacity-0 -translate-x-full'
                      }`}
                      style={{ animationDelay: isAnimating ? '0.3s' : '0s' }}
                      onClick={closeMobileMenu}
                    >
                      <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-lg bg-gray-100 group-hover:bg-indigo-100 transition-colors">
                        <svg className="h-4 w-4 text-gray-600 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      Hesaplama Geçmişim
                    </Link>
                  </div>
                </nav>

                {/* Auth Links */}
                {!loading && !user && (
                  <div className="px-4 py-4 border-t border-gray-200 space-y-2">
                    <Link
                      href="/login"
                      className={`block w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-all duration-200 transform ${
                        isAnimating ? 'animate-slide-in-left' : 'opacity-0 -translate-x-full'
                      }`}
                      style={{ animationDelay: isAnimating ? '0.4s' : '0s' }}
                      onClick={closeMobileMenu}
                    >
                      Giriş Yap
                    </Link>
                    <Link
                      href="/register"
                      className={`block w-full px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-all duration-200 transform ${
                        isAnimating ? 'animate-slide-in-left' : 'opacity-0 -translate-x-full'
                      }`}
                      style={{ animationDelay: isAnimating ? '0.5s' : '0s' }}
                      onClick={closeMobileMenu}
                    >
                      Kayıt Ol
                    </Link>
                  </div>
                )}

                {/* Logout Button */}
                {user && (
                  <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
                    <button
                      onClick={() => {
                        signOut();
                        closeMobileMenu();
                      }}
                      className={`group flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 transition-all duration-200 transform ${
                        isAnimating ? 'animate-slide-in-left' : 'opacity-0 -translate-x-full'
                      }`}
                      style={{ animationDelay: isAnimating ? '0.4s' : '0s' }}
                    >
                      <div className="flex items-center justify-center w-8 h-8 mr-3 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
                        <svg className="h-4 w-4 text-red-600 group-hover:text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
