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
  // Tavan Malzemeleri (hesaplayıcıdaki type'larla eşleşen)
  'beyaz_alcipan', 'c_profili', 'u_profili', 'aski_teli', 'aski_masasi', 'klips', 'vida',
  't_ana_tasiyici', 'tali_120_tasiyici', 'tali_60_tasiyici', 'plaka', 'omega', 'celik_dubel', 'clip_in_aski_masasi', 'alüminyum_plaka',
  
  // Duvar Malzemeleri
  'duvar_u_profili', 'duvar_c_profili', 'agraf', 'dubel_civi', 'duvar_dubel', 'vida_25', 'vida_35'
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
  't_ana_tasiyici': 'T Ana Taşıyıcı',
  'tali_120_tasiyici': 'Tali 120 Taşıyıcı',
  'tali_60_tasiyici': 'Tali 60 Taşıyıcı',
  'plaka': 'Plaka',
  'omega': 'Omega',
  'celik_dubel': 'Çelik Dubel',
  'clip_in_aski_masasi': 'Clip In Askı Maşası',
  'alüminyum_plaka': 'Alüminyum Plaka',
  
  // Duvar Malzemeleri
  'duvar_u_profili': 'Duvar U Profili',
  'duvar_c_profili': 'Duvar C Profili',
  'agraf': 'Agraf',
  'dubel_civi': 'Dubel Çivi',
  'duvar_dubel': 'Duvar Dubel',
  'vida_25': 'Vida 25mm',
  'vida_35': 'Vida 35mm'
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
  debug_info?: Record<string, unknown>;
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

// TestHistory interface kaldırıldı - sadece SavedUrl kullanılıyor

export default function URLTesterPage() {
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [priceMultiplier, setPriceMultiplier] = useState<number>(1);
  // Test geçmişi kaldırıldı - sadece kaydedilmiş URL'ler kullanılacak
  const [savedUrls, setSavedUrls] = useState<SavedUrl[]>([]);
  const [showSavedUrls, setShowSavedUrls] = useState(false);
  const [, setSelectedUrl] = useState<SavedUrl | null>(null);

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

      // Test geçmişi kaldırıldı - sadece kaydedilmiş URL'ler kullanılacak
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

    // Aynı URL zaten kayıtlı mı kontrol et
    const existingUrl = savedUrls.find(savedUrl => 
      savedUrl.url === url && savedUrl.material_type === materialType
    );
    
    if (existingUrl) {
      alert('Bu URL ve malzeme türü zaten kayıtlı!');
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
          test_result: result,
          last_tested_at: new Date().toISOString(),
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
    if (!savedUrl.test_result || !savedUrl.test_result.success || !savedUrl.test_result.price) {
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

    const originalPrice = result.data.price;
    const finalPrice = originalPrice * priceMultiplier;

    if (confirm(`${MATERIAL_NAMES[materialType]} için varsayılan fiyatı ₺${originalPrice} × ${priceMultiplier} = ₺${finalPrice.toFixed(2)} olarak ayarlamak istediğinizden emin misiniz?`)) {
      try {
        const response = await fetch('/api/admin/update-material-price-simple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            material_type: materialType,
            price: finalPrice,
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

  // Test geçmişi kaldırıldı

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BeakerIcon className="h-8 w-8 mr-3 text-blue-600" />
            URL Tester & Malzeme Fiyat Yöneticisi
          </h1>
          <p className="text-gray-600 mt-2">
            URL&apos;leri test edin, fiyatları çekin ve malzemeler için varsayılan fiyatları belirleyin
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">URL Test Et</h2>
            
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Malzeme Türü (Opsiyonel)
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Test Sonucu</h2>
            
            {result ? (
              <div className="space-y-4">
                {result.success ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex items-center mb-2">
                      <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-green-800 font-medium">Test Başarılı</span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-800">
                      <div><strong>Fiyat:</strong> ₺{result.data?.price}</div>
                      <div><strong>Başlık:</strong> {result.data?.title}</div>
                      <div><strong>Süre:</strong> {result.response_time_ms}ms</div>
                    </div>
                    {result.message && (
                      <div className="mt-2 text-sm text-green-700">
                        {result.message}
                      </div>
                    )}
                    {materialType && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-700">Çarpan:</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={priceMultiplier}
                            onChange={(e) => setPriceMultiplier(parseFloat(e.target.value) || 1)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="1.00"
                          />
                          <span className="text-xs text-gray-500">
                            = ₺{((result.data?.price || 0) * priceMultiplier).toFixed(2)}
                          </span>
                        </div>
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
                            <div><strong>Toplam Element:</strong> {String(result.debug_info.totalElements)}</div>
                            <div><strong>Fiyat Elementleri:</strong> {String(result.debug_info.priceElements)}</div>
                            <div><strong>Meta Tag&apos;ler:</strong> {String(result.debug_info.metaTags)}</div>
                            <div><strong>JSON-LD Script&apos;ler:</strong> {String(result.debug_info.jsonLdScripts)}</div>
                            <div className="mt-2">
                              <strong>Yaygın Selector&apos;lar:</strong>
                              <div className="ml-2 text-xs">
                                {result.debug_info.commonSelectors ? 'Mevcut' : 'Yok'}
                              </div>
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
            <h2 className="text-lg font-semibold text-gray-900">Kaydedilmiş URL&apos;ler</h2>
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {savedUrls.map((savedUrl) => (
                    <div key={savedUrl.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-gray-900 truncate">
                            {MATERIAL_NAMES[savedUrl.material_type]}
                          </h3>
                          <p className="text-sm text-gray-600 truncate mt-1" title={savedUrl.url}>
                            {savedUrl.url}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-2 flex-shrink-0">
                          <button
                            onClick={() => handleLoadSavedUrl(savedUrl)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Yükle"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUrl(savedUrl.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Sil"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        {savedUrl.test_result && savedUrl.test_result.success ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-green-600">
                                Başarılı
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                ₺{savedUrl.test_result.price}
                              </span>
                            </div>
                            <button
                              onClick={() => handleSetAsDefaultPrice(savedUrl)}
                              className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200 flex items-center flex-shrink-0"
                            >
                              <StarIcon className="h-3 w-3 mr-1" />
                              Varsayılan
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <XMarkIcon className="h-4 w-4 text-red-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-red-600">
                              Başarısız
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Henüz kaydedilmiş URL yok</p>
                  <p className="text-sm">Test yapıp URL&apos;leri kaydedin</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Geçmişi kaldırıldı - sadece Kaydedilmiş URL'ler kullanılıyor */}
      </div>
    </AdminLayout>
  );
}