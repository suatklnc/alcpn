'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

interface MaterialUrl {
  material_type: string;
  urls: Array<{
    id: string;
    url: string;
    selector: string;
    is_active: boolean;
    last_tested_at?: string;
    test_result?: {
      success: boolean;
      price?: number;
      error?: string;
    };
  }>;
}

const MATERIAL_TYPES = [
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

export default function MaterialUrlsPage() {
  const [materialUrls, setMaterialUrls] = useState<MaterialUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingUrl, setTestingUrl] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    url: '',
    selector: '',
    is_active: true,
  });

  useEffect(() => {
    fetchMaterialUrls();
  }, []);

  const fetchMaterialUrls = async () => {
    try {
      const response = await fetch('/api/admin/custom-scraping-urls');
      if (response.ok) {
        const urls = await response.json();
        
        // Ensure urls is an array
        const urlsArray = Array.isArray(urls) ? urls : [];
        
        // Group URLs by material type
        const grouped = MATERIAL_TYPES.map(material => ({
          material_type: material.value,
          urls: urlsArray.filter((url: any) => url.material_type === material.value)
        }));
        
        setMaterialUrls(grouped);
      }
    } catch (error) {
      console.error('Error fetching material URLs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMaterial) {
      alert('Lütfen malzeme türü seçin');
      return;
    }

    try {
      const response = await fetch('/api/admin/custom-scraping-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_type: selectedMaterial,
          ...formData,
        }),
      });

      if (response.ok) {
        await fetchMaterialUrls();
        resetForm();
        setShowAddForm(false);
        setSelectedMaterial('');
      } else {
        const error = await response.json();
        alert(`Hata: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding URL:', error);
      alert('URL eklenirken hata oluştu');
    }
  };

  const handleDeleteUrl = async (id: string) => {
    if (!confirm('Bu URL\'yi silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/admin/custom-scraping-urls/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchMaterialUrls();
      } else {
        const error = await response.json();
        alert(`Hata: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting URL:', error);
      alert('URL silinirken hata oluştu');
    }
  };

  const handleTestUrl = async (id: string) => {
    setTestingUrl(id);
    try {
      const response = await fetch(`/api/admin/custom-scraping-urls/${id}/test`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        await fetchMaterialUrls(); // Refresh to show test result
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

  const resetForm = () => {
    setFormData({
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
          <h1 className="text-2xl font-bold text-gray-900">Malzeme URL'leri</h1>
          <p className="mt-2 text-gray-600">
            Her malzeme türü için farklı URL'leri yönetin
          </p>
        </div>

        {/* Add URL Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Yeni URL Ekle
          </button>
        </div>

        {/* Add URL Form */}
        {showAddForm && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Yeni URL Ekle</h3>
            <form onSubmit={handleAddUrl} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Malzeme Türü
                </label>
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
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

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Ekle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                    setSelectedMaterial('');
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Material URLs */}
        <div className="space-y-6">
          {materialUrls.map((material) => (
            <div key={material.material_type} className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {MATERIAL_TYPES.find(t => t.value === material.material_type)?.label || material.material_type}
                </h3>
                <p className="text-sm text-gray-600">
                  {material.urls.length} URL
                </p>
              </div>

              {material.urls.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
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
                      {material.urls.map((url) => (
                        <tr key={url.id}>
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
                              onClick={() => handleTestUrl(url.id)}
                              disabled={testingUrl === url.id}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            >
                              {testingUrl === url.id ? 'Test ediliyor...' : 'Test Et'}
                            </button>
                            <button
                              onClick={() => handleDeleteUrl(url.id)}
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
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  Bu malzeme türü için henüz URL eklenmemiş.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
