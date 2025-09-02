'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  BeakerIcon, 
  DocumentTextIcon, 
  ClockIcon, 
  PlusIcon, 
  CheckIcon, 
  XMarkIcon, 
  StarIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const MATERIAL_TYPES = [
  // Tavan Malzemeleri
  'beyaz_alcipan', 'c_profili', 'u_profili', 'aski_teli', 'aski_masasi', 'klips', 'vida',
  
  // Karopan Tavan Malzemeleri
  'karopan_tavan', 'karopan_t_ana_tasiyici', 'karopan_tali_120_tasiyici', 'karopan_tali_60_tasiyici',
  'karopan_plaka', 'karopan_omega', 'karopan_alcipan', 'karopan_agraf', 'karopan_dubel_civi',
  'karopan_vida_25', 'karopan_vida_35',
  
  // Klipin Tavan Malzemeleri
  'klipin_tavan', 'klipin_t_ana_tasiyici', 'klipin_tali_120_tasiyici', 'klipin_tali_60_tasiyici',
  'klipin_plaka', 'klipin_omega', 'klipin_alcipan', 'klipin_agraf', 'klipin_dubel_civi',
  'klipin_vida_25', 'klipin_vida_35',
  
  // Duvar Malzemeleri
  'duvar_alcipan', 'duvar_c_profili', 'duvar_u_profili', 'duvar_vida', 'duvar_dubel',
  
  // Zemin Malzemeleri
  'zemin_alcipan', 'zemin_c_profili', 'zemin_u_profili', 'zemin_vida', 'zemin_dubel'
];

const MATERIAL_NAMES: Record<string, string> = {
  // Tavan Malzemeleri
  'beyaz_alcipan': 'Beyaz Alçıpan',
  'c_profili': 'C Profili',
  'u_profili': 'U Profili',
  'aski_teli': 'Aski Teli',
  'aski_masasi': 'Aski Masası',
  'klips': 'Klips',
  'vida': 'Vida',
  
  // Karopan Tavan Malzemeleri
  'karopan_tavan': 'Karopan Tavan',
  'karopan_t_ana_tasiyici': 'Karopan T Ana Taşıyıcı',
  'karopan_tali_120_tasiyici': 'Karopan Tali 120 Taşıyıcı',
  'karopan_tali_60_tasiyici': 'Karopan Tali 60 Taşıyıcı',
  'karopan_plaka': 'Karopan Plaka',
  'karopan_omega': 'Karopan Omega',
  'karopan_alcipan': 'Karopan Alçıpan',
  'karopan_agraf': 'Karopan Agraf',
  'karopan_dubel_civi': 'Karopan Dubel Çivi',
  'karopan_vida_25': 'Karopan Vida 25mm',
  'karopan_vida_35': 'Karopan Vida 35mm',
  
  // Klipin Tavan Malzemeleri
  'klipin_tavan': 'Klipin Tavan',
  'klipin_t_ana_tasiyici': 'Klipin T Ana Taşıyıcı',
  'klipin_tali_120_tasiyici': 'Klipin Tali 120 Taşıyıcı',
  'klipin_tali_60_tasiyici': 'Klipin Tali 60 Taşıyıcı',
  'klipin_plaka': 'Klipin Plaka',
  'klipin_omega': 'Klipin Omega',
  'klipin_alcipan': 'Klipin Alçıpan',
  'klipin_agraf': 'Klipin Agraf',
  'klipin_dubel_civi': 'Klipin Dubel Çivi',
  'klipin_vida_25': 'Klipin Vida 25mm',
  'klipin_vida_35': 'Klipin Vida 35mm',
  
  // Duvar Malzemeleri
  'duvar_alcipan': 'Duvar Alçıpan',
  'duvar_c_profili': 'Duvar C Profili',
  'duvar_u_profili': 'Duvar U Profili',
  'duvar_vida': 'Duvar Vida',
  'duvar_dubel': 'Duvar Dubel',
  
  // Zemin Malzemeleri
  'zemin_alcipan': 'Zemin Alçıpan',
  'zemin_c_profili': 'Zemin C Profili',
  'zemin_u_profili': 'Zemin U Profili',
  'zemin_vida': 'Zemin Vida',
  'zemin_dubel': 'Zemin Dubel'
};

interface TestResult {
  success: boolean;
  data?: {
    price: number;
    title: string;
    availability: string;
    image: string;
  };
  error?: string;
  response_time_ms: number;
  message?: string;
  html_preview?: string;
  debug_info?: any;
}

interface SavedUrl {
  id: string;
  url: string;
  selector: string;
  material_type: string;
  last_tested_at: string;
  test_result: {
    success: boolean;
    price?: number;
    error?: string;
  };
  is_active: boolean;
}

interface TestHistory {
  url: string;
  selector: string;
  result: TestResult;
  timestamp: string;
}

export default function URLTesterPage() {
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [savedUrls, setSavedUrls] = useState<SavedUrl[]>([]);
  const [showSavedUrls, setShowSavedUrls] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<SavedUrl | null>(null);

  // Load saved URLs on component mount
  useEffect(() => {
    fetchSavedUrls();
  }, []);

  const fetchSavedUrls = async () => {
    try {
      const response = await fetch('/api/admin/custom-scraping-urls');
      if (response.ok) {
        const data = await response.json();
        setSavedUrls(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching saved URLs:', error);
    }
  };

  const handleTest = async () => {
    if (!url || !selector) {
      alert('URL ve CSS selector gerekli!');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/test-scraping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          selector,
          material_type: materialType || undefined,
        }),
      });

      const testResult: TestResult = await response.json();
      setResult(testResult);

      // Add to test history
      const newHistoryItem: TestHistory = {
        url,
        selector,
        result: testResult,
        timestamp: new Date().toLocaleString('tr-TR'),
      };
      setTestHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]); // Keep last 10
    } catch (error) {
      console.error('URL test error:', error);
      setResult({
        success: false,
        error: 'Test sırasında hata oluştu',
        response_time_ms: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!url || !selector || !materialType) {
      alert('URL, CSS selector ve malzeme türü gerekli!');
      return;
    }

    if (!result || !result.success) {
      alert('Önce başarılı bir test yapın!');
      return;
    }

    try {
      const response = await fetch('/api/admin/custom-scraping-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          selector,
          material_type: materialType,
        }),
      });

      if (response.ok) {
        alert('URL başarıyla kaydedildi!');
        fetchSavedUrls();
        setUrl('');
        setSelector('');
        setMaterialType('');
        setResult(null);
      } else {
        const error = await response.json();
        alert(`Hata: ${error.message || 'URL kaydedilemedi'}`);
      }
    } catch (error) {
      console.error('Error saving URL:', error);
      alert('URL kaydedilirken hata oluştu');
    }
  };

  const handleSetAsDefaultPrice = async (savedUrl: SavedUrl) => {
    if (!savedUrl.test_result.success || !savedUrl.test_result.price) {
      alert('Bu URL için geçerli bir fiyat bulunamadı!');
      return;
    }

    if (confirm(`${MATERIAL_NAMES[savedUrl.material_type]} için varsayılan fiyatı ₺${savedUrl.test_result.price} olarak ayarlamak istediğinizden emin misiniz?`)) {
      try {
        const response = await fetch('/api/admin/set-default-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            material_type: savedUrl.material_type,
            price: savedUrl.test_result.price,
          }),
        });

        if (response.ok) {
          alert(`${MATERIAL_NAMES[savedUrl.material_type]} için varsayılan fiyat ₺${savedUrl.test_result.price} olarak ayarlandı!`);
        } else {
          alert('Fiyat ayarlanırken hata oluştu');
        }
      } catch (error) {
        console.error('Error setting default price:', error);
        alert('Fiyat ayarlanırken hata oluştu');
      }
    }
  };

  const handleSetAsDefaultPriceFromResult = async () => {
    if (!result || !result.success || !result.data?.price || !materialType) {
      alert('Geçerli bir test sonucu ve malzeme türü gerekli!');
      return;
    }

    if (confirm(`${MATERIAL_NAMES[materialType]} için varsayılan fiyatı ₺${result.data.price} olarak ayarlamak istediğinizden emin misiniz?`)) {
      try {
        const response = await fetch('/api/admin/update-material-price-simple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            material_type: materialType,
            price: result.data.price,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('API Response:', result);
          const price = result.unit_price || result.data?.unit_price || result.data?.price || result.data;
          console.log('Extracted price:', price);
          alert(`${MATERIAL_NAMES[materialType]} için varsayılan fiyat ₺${price} olarak ayarlandı! (${result.action})`);
        } else {
          const errorData = await response.json();
          alert(`Fiyat ayarlanırken hata oluştu: ${errorData.error || 'Bilinmeyen hata'}`);
        }
      } catch (error) {
        console.error('Error setting default price:', error);
        alert('Fiyat ayarlanırken hata oluştu');
      }
    }
  };

  const handleDeleteUrl = async (urlId: string) => {
    if (confirm('Bu URL\'yi silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/admin/custom-scraping-urls/${urlId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          alert('URL başarıyla silindi!');
          fetchSavedUrls();
        } else {
          alert('URL silinirken hata oluştu');
        }
      } catch (error) {
        console.error('Error deleting URL:', error);
        alert('URL silinirken hata oluştu');
      }
    }
  };

  const handleLoadSavedUrl = (savedUrl: SavedUrl) => {
    setUrl(savedUrl.url);
    setSelector(savedUrl.selector);
    setMaterialType(savedUrl.material_type);
    setSelectedUrl(savedUrl);
  };

  const clearHistory = () => {
    setTestHistory([]);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BeakerIcon className="h-8 w-8 mr-3 text-blue-600" />
            URL Tester & Malzeme Fiyat Yöneticisi
          </h1>
          <p className="text-gray-600 mt-2">
            URL'leri test edin, fiyatları çekin ve malzemeler için varsayılan fiyatları belirleyin
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">URL Test Et</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/product"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSS Selector
                </label>
                <input
                  type="text"
                  value={selector}
                  onChange={(e) => setSelector(e.target.value)}
                  placeholder=".price (tek selector girin)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Malzeme Türü (Opsiyonel)
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Malzeme seçin...</option>
                  {MATERIAL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {MATERIAL_NAMES[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleTest}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                      Test Ediliyor...
                    </>
                  ) : (
                    <>
                      <BeakerIcon className="h-4 w-4 mr-2" />
                      Test Et
                    </>
                  )}
                </button>

                {result && result.success && materialType && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveUrl}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Kaydet
                    </button>
                    <button
                      onClick={() => handleSetAsDefaultPriceFromResult()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <StarIcon className="h-4 w-4 mr-2" />
                      Varsayılan Fiyat Yap
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Test Result */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Test Sonucu</h2>
            
            {result ? (
              <div className="space-y-4">
                {result.success ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex items-center mb-2">
                      <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-green-800 font-medium">Test Başarılı</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><strong>Fiyat:</strong> ₺{result.data?.price}</div>
                      <div><strong>Başlık:</strong> {result.data?.title}</div>
                      <div><strong>Stok:</strong> {result.data?.availability}</div>
                      <div><strong>Süre:</strong> {result.response_time_ms}ms</div>
                    </div>
                    {result.message && (
                      <div className="mt-2 text-sm text-green-700">
                        {result.message}
                      </div>
                    )}
                    {materialType && (
                      <div className="mt-3">
                        <button
                          onClick={handleSetAsDefaultPriceFromResult}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center"
                        >
                          <StarIcon className="h-3 w-3 mr-1" />
                          Bu Fiyatı Varsayılan Yap
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex items-center mb-2">
                      <XMarkIcon className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-red-800 font-medium">Test Başarısız</span>
                    </div>
                    <div className="text-sm text-red-700">
                      <strong>Hata:</strong> {result.error || 'Bilinmeyen hata'}
                    </div>
                    {result.html_preview && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer">
                          HTML Önizleme (İlk 1000 karakter)
                        </summary>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                          {result.html_preview}
                        </pre>
                      </details>
                    )}
                    {result.debug_info && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer">
                          Debug Bilgileri
                        </summary>
                        <div className="mt-1 p-2 bg-gray-100 rounded text-xs">
                          <div className="space-y-1">
                            <div><strong>Toplam Element:</strong> {result.debug_info.totalElements}</div>
                            <div><strong>Fiyat Elementleri:</strong> {result.debug_info.priceElements}</div>
                            <div><strong>Meta Tag'ler:</strong> {result.debug_info.metaTags}</div>
                            <div><strong>JSON-LD Script'ler:</strong> {result.debug_info.jsonLdScripts}</div>
                            <div className="mt-2">
                              <strong>Yaygın Selector'lar:</strong>
                              <ul className="ml-2 space-y-1">
                                {Object.entries(result.debug_info.commonSelectors).map(([selector, count]) => (
                                  <li key={selector}>
                                    {selector}: {count} element
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Test sonuçları burada görünecek</p>
                <p className="text-sm">URL ve CSS selector girip test edin</p>
              </div>
            )}
          </div>
        </div>

        {/* Saved URLs */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Kaydedilmiş URL'ler</h2>
            <button
              onClick={() => setShowSavedUrls(!showSavedUrls)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {showSavedUrls ? 'Gizle' : 'Göster'}
            </button>
          </div>

          {showSavedUrls && (
            <div className="space-y-4">
              {savedUrls.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedUrls.map((savedUrl) => (
                    <div key={savedUrl.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">
                            {MATERIAL_NAMES[savedUrl.material_type]}
                          </h3>
                          <p className="text-xs text-gray-600 truncate">
                            {savedUrl.url}
                          </p>
                          <p className="text-xs text-gray-500">
                            Selector: {savedUrl.selector}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleLoadSavedUrl(savedUrl)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Yükle"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUrl(savedUrl.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Sil"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {savedUrl.test_result.success ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-green-600">
                              ₺{savedUrl.test_result.price}
                            </span>
                            <button
                              onClick={() => handleSetAsDefaultPrice(savedUrl)}
                              className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200 flex items-center"
                            >
                              <StarIcon className="h-3 w-3 mr-1" />
                              Varsayılan Yap
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-red-600">
                            Test Başarısız
                          </span>
                        )}
                        <p className="text-xs text-gray-500">
                          Son test: {new Date(savedUrl.last_tested_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Henüz kaydedilmiş URL yok</p>
                  <p className="text-sm">Test yapıp URL'leri kaydedin</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test History */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Test Geçmişi</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {showHistory ? 'Gizle' : 'Göster'}
              </button>
              {testHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>

          {showHistory && testHistory.length > 0 && (
            <div className="space-y-3">
              {testHistory.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{item.url}</p>
                      <p className="text-xs text-gray-600">Selector: {item.selector}</p>
                      <p className="text-xs text-gray-500">{item.timestamp}</p>
                    </div>
                    <div className="ml-2">
                      {item.result.success ? (
                        <CheckIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <XMarkIcon className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  {item.result.success ? (
                    <div className="text-sm text-green-600">
                      Fiyat: ₺{item.result.data?.price} - {item.result.response_time_ms}ms
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">
                      Hata: {item.result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}