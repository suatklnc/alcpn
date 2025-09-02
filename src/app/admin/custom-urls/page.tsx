'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

interface CustomScrapingUrl {
  id: string;
  material_type: string;
  url: string;
  selector: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_tested_at?: string;
  test_result?: {
    success: boolean;
    price?: number;
    error?: string;
  };
}

interface MaterialType {
  value: string;
  label: string;
}

const MATERIAL_TYPES: MaterialType[] = [
  { value: 'beyaz_alcipan', label: 'Beyaz Alçıpan' },
  { value: 'c_profili', label: 'C Profili' },
  { value: 'u_profili', label: 'U Profili' },
  { value: 'aski_teli', label: 'Askı Teli' },
  { value: 'aski_masasi', label: 'Askı Masası' },
  { value: 'klips', label: 'Klips' },
  { value: 'vida', label: 'Vida' },
  { value: 't_ana_tasiyici', label: 'T Ana Taşıyıcı' },
  { value: 'tali_120_tasiyici', label: 'Tali 120 Taşıyıcı' },
  { value: 'tali_60_tasiyici', label: 'Tali 60 Taşıyıcı' },
  { value: 'plaka', label: 'Plaka' },
  { value: 'omega', label: 'Omega' },
  { value: 'alcipan', label: 'Alçıpan' },
  { value: 'agraf', label: 'Agraf' },
  { value: 'dubel_civi', label: 'Dubel Çivi' },
  { value: 'vida_25', label: 'Vida 25mm' },
  { value: 'vida_35', label: 'Vida 35mm' },
];

export default function CustomUrlsPage() {
  const [urls, setUrls] = useState<CustomScrapingUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUrl, setEditingUrl] = useState<CustomScrapingUrl | null>(null);
  const [testingUrl, setTestingUrl] = useState<string | null>(null);
  const [bulkImportMode, setBulkImportMode] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [autoTestMode, setAutoTestMode] = useState(false);
  const [testingForm, setTestingForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    material_type: '',
    url: '',
    selector: '',
    is_active: true,
  });

  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    try {
      const response = await fetch('/api/admin/custom-scraping-urls');
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        setUrls(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching URLs:', error);
    } finally {
      setLoading(false);
    }
  };

  const testUrl = async (url: string, selector: string) => {
    try {
      const response = await fetch('/api/admin/test-scraping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, selector }),
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      return { success: false, error: 'Test hatası' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-test if enabled
    if (autoTestMode && formData.url && formData.selector) {
      setTestingForm(true);
      const testResult = await testUrl(formData.url, formData.selector);
      setTestingForm(false);
      
      if (!testResult.success) {
        const proceed = confirm(`URL test başarısız: ${testResult.error}\n\nYine de kaydetmek istiyor musunuz?`);
        if (!proceed) return;
      } else {
        alert(`Test başarılı! Fiyat: ${testResult.price} TL`);
      }
    }
    
    try {
      const url = editingUrl 
        ? `/api/admin/custom-scraping-urls/${editingUrl.id}`
        : '/api/admin/custom-scraping-urls';
      
      const method = editingUrl ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchUrls();
        resetForm();
        setShowAddForm(false);
        setEditingUrl(null);
        setAutoTestMode(false);
      } else {
        const error = await response.json();
        alert(`Hata: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving URL:', error);
      alert('URL kaydedilirken hata oluştu');
    }
  };

  const handleEdit = (url: CustomScrapingUrl) => {
    setEditingUrl(url);
    setFormData({
      material_type: url.material_type,
      url: url.url,
      selector: url.selector,
      is_active: url.is_active,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu URL\'yi silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/admin/custom-scraping-urls/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUrls();
      } else {
        const error = await response.json();
        alert(`Hata: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting URL:', error);
      alert('URL silinirken hata oluştu');
    }
  };

  const handleTest = async (id: string) => {
    setTestingUrl(id);
    try {
      const response = await fetch(`/api/admin/custom-scraping-urls/${id}/test`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        // Test sonucunu URL listesine ekle
        setUrls(prev => prev.map(url => 
          url.id === id 
            ? { ...url, last_tested_at: new Date().toISOString(), test_result: result }
            : url
        ));
      } else {
        const error = await response.json();
        alert(`Test hatası: ${error.error}`);
      }
    } catch (error) {
      console.error('Error testing URL:', error);
      alert('URL test edilirken hata oluştu');
    } finally {
      setTestingUrl(null);
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkUrls.split('\n').filter(line => line.trim());
    const urlsToImport = lines.map(line => {
      const [materialType, url, selector] = line.split('|').map(s => s.trim());
      return { material_type: materialType, url, selector, is_active: true };
    });

    try {
      const response = await fetch('/api/admin/custom-scraping-urls/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlsToImport }),
      });

      if (response.ok) {
        await fetchUrls();
        setBulkUrls('');
        setBulkImportMode(false);
        alert(`${urlsToImport.length} URL başarıyla eklendi`);
      } else {
        const error = await response.json();
        alert(`Hata: ${error.error}`);
      }
    } catch (error) {
      console.error('Error bulk importing URLs:', error);
      alert('Toplu URL eklenirken hata oluştu');
    }
  };

  const resetForm = () => {
    setFormData({
      material_type: '',
      url: '',
      selector: '',
      is_active: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

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
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Custom Scraping URLs</h1>
          <p className="mt-2 text-gray-600">
            Malzeme türleri için özel scraping URL'lerini yönetin
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
              setEditingUrl(null);
              setBulkImportMode(false);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Yeni URL Ekle
          </button>
          <button
            onClick={() => {
              setBulkImportMode(!bulkImportMode);
              setShowAddForm(false);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            {bulkImportMode ? 'İptal' : 'Toplu URL Ekle'}
          </button>
        </div>

        {/* Bulk Import Form */}
        {bulkImportMode && (
          <div className="mb-6 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Toplu URL Ekleme</h3>
            <p className="text-sm text-gray-600 mb-4">
              Her satıra bir URL ekleyin. Format: malzeme_türü|url|selector
            </p>
            <textarea
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder="beyaz_alcipan|https://example.com|.price&#10;c_profili|https://example2.com|#price"
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleBulkImport}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                URL'leri Ekle
              </button>
              <button
                onClick={() => setBulkImportMode(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingUrl ? 'URL Düzenle' : 'Yeni URL Ekle'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Malzeme Türü
                </label>
                <select
                  value={formData.material_type}
                  onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Malzeme türü seçin</option>
                  {MATERIAL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/product"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSS Selector
                </label>
                <input
                  type="text"
                  value={formData.selector}
                  onChange={(e) => setFormData({ ...formData, selector: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder=".price, #price, [data-price]"
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Aktif
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto_test"
                    checked={autoTestMode}
                    onChange={(e) => setAutoTestMode(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="auto_test" className="text-sm text-gray-700">
                    Kaydetmeden önce otomatik test et
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={testingForm}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingForm ? 'Test ediliyor...' : (editingUrl ? 'Güncelle' : 'Ekle')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingUrl(null);
                    resetForm();
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* URLs Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Malzeme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Selector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Sonucu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Son Test
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {urls.map((url) => (
                  <tr key={url.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {MATERIAL_TYPES.find(t => t.value === url.material_type)?.label || url.material_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      <a 
                        href={url.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {url.url}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                      {url.selector}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        url.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {url.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {url.test_result ? (
                        <div>
                          {url.test_result.success ? (
                            <span className="text-green-600 font-medium">
                              ✓ {url.test_result.price} TL
                            </span>
                          ) : (
                            <span className="text-red-600">
                              ✗ {url.test_result.error}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Test edilmedi</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {url.last_tested_at ? formatDate(url.last_tested_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleTest(url.id)}
                        disabled={testingUrl === url.id}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      >
                        {testingUrl === url.id ? 'Test ediliyor...' : 'Test Et'}
                      </button>
                      <button
                        onClick={() => handleEdit(url)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(url.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {urls.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Henüz custom scraping URL'si eklenmemiş.
          </div>
        )}
      </div>
    </Layout>
  );
}
