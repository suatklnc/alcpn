'use client';

import { useState } from 'react';
import { PlayIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface TestResult {
  success: boolean;
  data?: {
    price: number | null;
    title?: string;
    availability?: string;
    image?: string;
  };
  error?: string;
  url: string;
  timestamp: string;
}

export default function URLTesterPage() {
  const [url, setUrl] = useState('');
  const [selectors, setSelectors] = useState({
    price: '',
    title: '',
    availability: '',
    image: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleSelectorChange = (field: string, value: string) => {
    setSelectors(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTest = async () => {
    if (!url || !selectors.price) {
      alert('URL ve price selector zorunludur!');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
              const response = await fetch('/api/custom-urls/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          selectors,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Test sırasında hata oluştu',
        url,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">URL Tester</h1>
          <p className="mt-1 text-sm text-gray-600">
            Custom scraping URL&apos;lerini ve CSS selector&apos;ları test edin
          </p>
        </div>

        {/* Test Form */}
        <div className="px-6 py-4">
          <div className="space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                Test URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/product"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price Selector <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="price"
                  value={selectors.price}
                  onChange={(e) => handleSelectorChange('price', e.target.value)}
                  placeholder=".price, .product-price"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title Selector
                </label>
                <input
                  type="text"
                  id="title"
                  value={selectors.title}
                  onChange={(e) => handleSelectorChange('title', e.target.value)}
                  placeholder=".title, .product-name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="availability" className="block text-sm font-medium text-gray-700">
                  Availability Selector
                </label>
                <input
                  type="text"
                  id="availability"
                  value={selectors.availability}
                  onChange={(e) => handleSelectorChange('availability', e.target.value)}
                  placeholder=".stock, .availability"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                  Image Selector
                </label>
                <input
                  type="text"
                  id="image"
                  value={selectors.image}
                  onChange={(e) => handleSelectorChange('image', e.target.value)}
                  placeholder=".product-image img"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Test Button */}
            <div>
              <button
                onClick={handleTest}
                disabled={isLoading || !url || !selectors.price}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Test Ediliyor...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Test Et
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center mb-4">
              {result.success ? (
                <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-red-500 mr-2" />
              )}
              <h3 className="text-lg font-medium text-gray-900">
                Test Sonucu
              </h3>
            </div>

            {result.success ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.data?.price !== null && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Fiyat:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {result.data?.price ? `₺${result.data.price}` : 'Bulunamadı'}
                      </span>
                    </div>
                  )}
                  
                  {result.data?.title && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Başlık:</span>
                      <span className="ml-2 text-sm text-gray-900">{result.data.title}</span>
                    </div>
                  )}
                  
                  {result.data?.availability && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Stok Durumu:</span>
                      <span className="ml-2 text-sm text-gray-900">{result.data.availability}</span>
                    </div>
                  )}
                  
                  {result.data?.image && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Resim:</span>
                      <span className="ml-2 text-sm text-gray-900">{result.data.image}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 text-xs text-gray-500">
                  Test Zamanı: {new Date(result.timestamp).toLocaleString('tr-TR')}
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">
                  <strong>Hata:</strong> {result.error || 'Bilinmeyen hata'}
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  Test Zamanı: {new Date(result.timestamp).toLocaleString('tr-TR')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
