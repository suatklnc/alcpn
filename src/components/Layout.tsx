'use client';

import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex flex-1">
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
