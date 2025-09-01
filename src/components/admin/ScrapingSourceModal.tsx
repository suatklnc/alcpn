'use client';

import { useState, useEffect } from 'react';
import { ScrapingSource } from '@/types/admin';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ScrapingSourceModalProps {
  source?: ScrapingSource | null;
  onClose: () => void;
}

export default function ScrapingSourceModal({ source, onClose }: ScrapingSourceModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    base_url: '',
    selectors: {
      price: '',
      title: '',
      availability: '',
      image: '',
    },
    wait_for_selector: '',
    custom_headers: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!source;

  useEffect(() => {
    if (source) {
      setFormData({
        name: source.name,
        base_url: source.base_url,
        selectors: {
          price: source.selectors.price,
          title: source.selectors.title || '',
          availability: source.selectors.availability || '',
          image: source.selectors.image || '',
        },
        wait_for_selector: source.wait_for_selector || '',
        custom_headers: JSON.stringify(source.custom_headers || {}, null, 2),
        is_active: source.is_active,
      });
    }
  }, [source]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Parse custom headers
      let customHeaders = {};
      if (formData.custom_headers.trim()) {
        try {
          customHeaders = JSON.parse(formData.custom_headers);
        } catch {
          throw new Error('Invalid JSON format for custom headers');
        }
      }

      const payload = {
        name: formData.name,
        base_url: formData.base_url,
        selectors: {
          price: formData.selectors.price,
          title: formData.selectors.title || undefined,
          availability: formData.selectors.availability || undefined,
          image: formData.selectors.image || undefined,
        },
        wait_for_selector: formData.wait_for_selector || undefined,
        custom_headers: customHeaders,
        is_active: formData.is_active,
      };

      const url = isEditing 
        ? `/api/admin/scraping-sources/${source!.id}`
        : '/api/admin/scraping-sources';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save scraping source');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.startsWith('selectors.')) {
      const selectorField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        selectors: {
          ...prev.selectors,
          [selectorField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isEditing ? 'Edit Scraping Source' : 'Create Scraping Source'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., hepsiburada"
                  />
                </div>

                {/* Base URL */}
                <div>
                  <label htmlFor="base_url" className="block text-sm font-medium text-gray-700">
                    Base URL *
                  </label>
                  <input
                    type="text"
                    id="base_url"
                    required
                    value={formData.base_url}
                    onChange={(e) => handleInputChange('base_url', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., hepsiburada.com"
                  />
                </div>

                {/* Selectors */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">CSS Selectors</h4>
                  
                  <div>
                    <label htmlFor="price_selector" className="block text-sm font-medium text-gray-700">
                      Price Selector *
                    </label>
                    <input
                      type="text"
                      id="price_selector"
                      required
                      value={formData.selectors.price}
                      onChange={(e) => handleInputChange('selectors.price', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g., .price-value, .price-current"
                    />
                  </div>

                  <div>
                    <label htmlFor="title_selector" className="block text-sm font-medium text-gray-700">
                      Title Selector
                    </label>
                    <input
                      type="text"
                      id="title_selector"
                      value={formData.selectors.title}
                      onChange={(e) => handleInputChange('selectors.title', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g., .product-name, h1"
                    />
                  </div>

                  <div>
                    <label htmlFor="availability_selector" className="block text-sm font-medium text-gray-700">
                      Availability Selector
                    </label>
                    <input
                      type="text"
                      id="availability_selector"
                      value={formData.selectors.availability}
                      onChange={(e) => handleInputChange('selectors.availability', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g., .stock-status, .availability"
                    />
                  </div>

                  <div>
                    <label htmlFor="image_selector" className="block text-sm font-medium text-gray-700">
                      Image Selector
                    </label>
                    <input
                      type="text"
                      id="image_selector"
                      value={formData.selectors.image}
                      onChange={(e) => handleInputChange('selectors.image', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g., .product-image img"
                    />
                  </div>
                </div>

                {/* Wait For Selector */}
                <div>
                  <label htmlFor="wait_for_selector" className="block text-sm font-medium text-gray-700">
                    Wait For Selector
                  </label>
                  <input
                    type="text"
                    id="wait_for_selector"
                    value={formData.wait_for_selector}
                    onChange={(e) => handleInputChange('wait_for_selector', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., .price-value"
                  />
                </div>

                {/* Custom Headers */}
                <div>
                  <label htmlFor="custom_headers" className="block text-sm font-medium text-gray-700">
                    Custom Headers (JSON)
                  </label>
                  <textarea
                    id="custom_headers"
                    rows={3}
                    value={formData.custom_headers}
                    onChange={(e) => handleInputChange('custom_headers', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder='{"User-Agent": "Custom Bot", "Accept": "text/html"}'
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
