'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/lib/auth-context';
import { 
  BeakerIcon, 
  DocumentTextIcon, 
  ClockIcon, 
  PlusIcon, 
  CheckIcon, 
  XMarkIcon, 
  StarIcon,
  TrashIcon,
  PencilIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const MATERIAL_TYPES = [
  // Tavan Malzemeleri (hesaplayıcıdaki type'larla eşleşen)
  'beyaz_alcipan', 'c_profili', 'u_profili', 'aski_teli', 'aski_masasi', 'klips', 'vida',
  't_ana_tasiyici', 'tali_120_tasiyici', 'tali_60_tasiyici', 'omega', 'celik_dubel', 'clip_in_aski_masasi', 'alüminyum_plaka',
  
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
  // Auto-scraping fields
  auto_scraping_enabled?: boolean;
  auto_scraping_interval_hours?: number;
  price_multiplier?: number;
  last_auto_scraped_at?: string;
  next_auto_scrape_at?: string;
}

// TestHistory interface kaldırıldı - sadece SavedUrl kullanılıyor

export default function URLTesterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  
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
  const [editingSelector, setEditingSelector] = useState<string | null>(null);
  const [editingSelectorValue, setEditingSelectorValue] = useState('');
  
  // Auto-scraping states
  const [autoScrapingEnabled, setAutoScrapingEnabled] = useState<boolean>(false);
  const [autoScrapingInterval, setAutoScrapingInterval] = useState<number>(24);
  const [isAutoScrapingRunning, setIsAutoScrapingRunning] = useState<boolean>(false);
  const [autoScrapingIntervalId, setAutoScrapingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [customInterval, setCustomInterval] = useState<number>(5); // Saniye cinsinden
  const [intervalUnit, setIntervalUnit] = useState<'seconds' | 'minutes' | 'hours'>('seconds');
  const [isAutoScrapingActive, setIsAutoScrapingActive] = useState<boolean>(false);
  
  // Gelişmiş log sistemi
  const [logs, setLogs] = useState<Array<{
    id: string;
    timestamp: Date;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    details?: Record<string, unknown>;
  }>>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Log fonksiyonları
  const addLog = useCallback((type: 'info' | 'success' | 'warning' | 'error', message: string, details?: Record<string, unknown>) => {
    const newLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Son 100 log'u tut
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Authentication check
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        setIsChecking(false);
      }
    }
  }, [user, loading, router]);

  // Load saved URLs on component mount
  useEffect(() => {
    if (!isChecking && user) {
      fetchSavedUrls();
    }
  }, [isChecking, user]);

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
      addLog('warning', 'URL ve CSS selector gerekli!');
      alert('URL ve CSS selector gerekli!');
      return;
    }

    setIsLoading(true);
    addLog('info', `Test başlatılıyor: ${url}`, { selector, materialType });
    
    try {
      const startTime = Date.now();
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

      const responseTime = Date.now() - startTime;
      const testResult: TestResult = await response.json();
      
      if (testResult.success) {
        addLog('success', `Test başarılı! Fiyat: ₺${testResult.data?.price}`, {
          responseTime: `${responseTime}ms`,
          data: testResult.data
        });
      } else {
        addLog('error', `Test başarısız: ${testResult.error}`, {
          responseTime: `${responseTime}ms`,
          error: testResult.error
        });
      }
      
      setResult(testResult);

      // Test geçmişi kaldırıldı - sadece kaydedilmiş URL'ler kullanılacak
    } catch (error) {
      console.error('URL test error:', error);
      addLog('error', 'Test sırasında hata oluştu', { error: error instanceof Error ? error.message : 'Bilinmeyen hata' });
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
          auto_scraping_enabled: autoScrapingEnabled,
          auto_scraping_interval_hours: autoScrapingInterval,
          price_multiplier: priceMultiplier,
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
    setAutoScrapingEnabled(savedUrl.auto_scraping_enabled || false);
    setAutoScrapingInterval(savedUrl.auto_scraping_interval_hours || 24);
    setPriceMultiplier(savedUrl.price_multiplier || 1);
  };

  const handleToggleAutoScraping = async (savedUrl: SavedUrl) => {
    const newEnabled = !savedUrl.auto_scraping_enabled;
    
    try {
      const response = await fetch(`/api/admin/custom-scraping-urls/${savedUrl.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auto_scraping_enabled: newEnabled,
          // Eğer aktif ediliyorsa, hemen çekim yapılabilmesi için next_auto_scrape_at'i şu an olarak ayarla
          ...(newEnabled && {
            next_auto_scrape_at: new Date().toISOString()
          })
        }),
      });

      if (response.ok) {
        alert(`Otomatik fiyat çekme ${newEnabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}!`);
        fetchSavedUrls();
      } else {
        alert('Otomatik fiyat çekme ayarı güncellenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error toggling auto-scraping:', error);
      alert('Otomatik fiyat çekme ayarı güncellenirken hata oluştu');
    }
  };

  const handleUpdateAutoScrapingSettings = async (savedUrl: SavedUrl, interval: number, multiplier: number) => {
    try {
      const response = await fetch(`/api/admin/custom-scraping-urls/${savedUrl.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auto_scraping_interval_hours: interval,
          price_multiplier: multiplier,
        }),
      });

      if (response.ok) {
        alert('Otomatik fiyat çekme ayarları güncellendi!');
        fetchSavedUrls();
      } else {
        alert('Otomatik fiyat çekme ayarları güncellenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error updating auto-scraping settings:', error);
      alert('Otomatik fiyat çekme ayarları güncellenirken hata oluştu');
    }
  };

  const handleStartEditingSelector = (savedUrl: SavedUrl) => {
    setEditingSelector(savedUrl.id);
    setEditingSelectorValue(savedUrl.selector);
  };

  const handleCancelEditingSelector = () => {
    setEditingSelector(null);
    setEditingSelectorValue('');
  };

  const handleSaveSelector = async (savedUrl: SavedUrl) => {
    try {
      const response = await fetch(`/api/admin/custom-scraping-urls/${savedUrl.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selector: editingSelectorValue,
        }),
      });

      if (response.ok) {
        alert('Selector güncellendi!');
        setEditingSelector(null);
        setEditingSelectorValue('');
        fetchSavedUrls();
      } else {
        alert('Selector güncellenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error updating selector:', error);
      alert('Selector güncellenirken hata oluştu');
    }
  };

  const handleRunAutoScraping = async () => {
    setIsAutoScrapingRunning(true);
    addLog('info', 'Otomatik fiyat çekme başlatılıyor...');
    
    try {
      const startTime = Date.now();
      const response = await fetch('/api/admin/auto-scraping', {
        method: 'GET',
      });

      const responseTime = Date.now() - startTime;
      const result = await response.json();
      
      if (response.ok) {
        console.log('Auto-scraping result:', result);
        
        // Her URL için ayrı log'lar ekle
        if (result.results && Array.isArray(result.results)) {
          result.results.forEach((urlResult: Record<string, unknown>) => {
            if (urlResult.success) {
              addLog('success', `✅ ${urlResult.material_type}: Fiyat başarıyla çekildi (₺${urlResult.price})`, {
                url: urlResult.url,
                materialType: urlResult.material_type,
                price: urlResult.price,
                responseTime: `${urlResult.response_time_ms}ms`
              });
            } else {
              addLog('error', `❌ ${urlResult.material_type}: ${urlResult.error}`, {
                url: urlResult.url,
                materialType: urlResult.material_type,
                error: urlResult.error,
                responseTime: `${urlResult.response_time_ms}ms`,
                selector: urlResult.selector || 'Bilinmiyor'
              });
            }
          });
        }

        if (result.success_count > 0) {
          addLog('success', `🎉 Otomatik fiyat çekme başarılı! ${result.success_count} başarılı, ${result.error_count} hata`, {
            responseTime: `${responseTime}ms`,
            totalResults: result.results?.length || 0
          });
        } else {
          addLog('warning', `⚠️ Otomatik fiyat çekme tamamlandı ancak hiç başarılı sonuç yok. ${result.error_count} hata`, {
            responseTime: `${responseTime}ms`,
            totalResults: result.results?.length || 0
          });
        }
        
        // Sadece hata varsa alert göster
        if (result.error_count > 0) {
          alert(`Otomatik fiyat çekme tamamlandı!\n${result.message}`);
        }
        fetchSavedUrls();
      } else {
        addLog('error', `Otomatik fiyat çekme başarısız: ${result.error}`, {
          responseTime: `${responseTime}ms`,
          error: result.error
        });
        alert(`Otomatik fiyat çekme hatası: ${result.error}`);
      }
    } catch (error) {
      console.error('Error running auto-scraping:', error);
      addLog('error', 'Otomatik fiyat çekme sırasında hata oluştu', { 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      });
      alert('Otomatik fiyat çekme sırasında hata oluştu');
    } finally {
      setIsAutoScrapingRunning(false);
    }
  };

  // Kullanıcı tanımlı interval ile otomatik fiyat çekme
  const startCustomAutoScraping = () => {
    // Mevcut interval'ı temizle
    if (autoScrapingIntervalId) {
      clearInterval(autoScrapingIntervalId);
    }

    // Aktif olan URL'leri bul
    const activeUrls = savedUrls.filter(url => url.auto_scraping_enabled);
    if (activeUrls.length === 0) {
      alert('Otomatik fiyat çekme için aktif URL bulunamadı!');
      return;
    }

    // Interval'ı saniye cinsinden hesapla
    let intervalInSeconds = customInterval;
    if (intervalUnit === 'minutes') {
      intervalInSeconds = customInterval * 60;
    } else if (intervalUnit === 'hours') {
      intervalInSeconds = customInterval * 3600;
    }
    
    const intervalMs = intervalInSeconds * 1000; // Saniye'yi milisaniye'ye çevir

    console.log(`Starting custom auto-scraping interval: ${intervalMs}ms (${intervalInSeconds}s)`);

    const intervalId = setInterval(async () => {
      console.log('Running scheduled auto-scraping...');
      await handleRunAutoScraping();
    }, intervalMs);

    setAutoScrapingIntervalId(intervalId);
    setIsAutoScrapingActive(true);
  };

  const stopCustomAutoScraping = useCallback(() => {
    if (autoScrapingIntervalId) {
      clearInterval(autoScrapingIntervalId);
      setAutoScrapingIntervalId(null);
      setIsAutoScrapingActive(false);
      console.log('Custom auto-scraping interval stopped');
    }
  }, [autoScrapingIntervalId]);

  // Component unmount olduğunda interval'ı temizle
  useEffect(() => {
    return () => {
      stopCustomAutoScraping();
    };
  }, [stopCustomAutoScraping]);

  const handleRunManualScraping = async (savedUrl: SavedUrl) => {
    try {
      const response = await fetch('/api/admin/auto-scraping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url_ids: [savedUrl.id],
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Manuel fiyat çekme tamamlandı!\n${result.message}`);
        fetchSavedUrls();
      } else {
        alert(`Manuel fiyat çekme hatası: ${result.error}`);
      }
    } catch (error) {
      console.error('Error running manual scraping:', error);
      alert('Manuel fiyat çekme sırasında hata oluştu');
    }
  };

  // Test geçmişi kaldırıldı

  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Yükleniyor...
          </h2>
          <p className="text-sm text-gray-600">
            Admin paneline erişim kontrol ediliyor.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect will happen
  }

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

              {/* Auto-scraping Settings */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Otomatik Fiyat Çekme Ayarları</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoScrapingEnabled"
                      checked={autoScrapingEnabled}
                      onChange={(e) => setAutoScrapingEnabled(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoScrapingEnabled" className="ml-2 block text-sm text-gray-900">
                      Otomatik fiyat çekmeyi etkinleştir
                    </label>
                  </div>

                  {autoScrapingEnabled && (
                    <>


                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fiyat Çarpanı
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={priceMultiplier}
                          onChange={(e) => setPriceMultiplier(parseFloat(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="1.00"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Çekilen fiyat bu çarpan ile çarpılarak malzeme fiyatı belirlenir
                        </p>
                      </div>
                    </>
                  )}
                </div>
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

                {result && result.success && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveUrl}
                      disabled={!materialType}
                      className={`px-4 py-2 rounded-md flex items-center ${
                        materialType 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      }`}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      {materialType ? 'Kaydet' : 'Malzeme Seçin'}
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
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Kaydedilmiş URL&apos;ler</h2>
                  <p className="text-sm text-gray-600">Otomatik fiyat çekme ayarları ile yönetin</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-4">
                  {/* Manuel Çek Butonu */}
                  <button
                    onClick={handleRunAutoScraping}
                    disabled={isAutoScrapingRunning}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center text-sm font-medium transition-colors duration-200"
                  >
                    {isAutoScrapingRunning ? (
                      <>
                        <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                        Çekiliyor...
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="h-4 w-4 mr-2" />
                        Şimdi Çek
                      </>
                    )}
                  </button>

                  {/* Aralık Kontrolü */}
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Aralık:</label>
                    <input
                      type="number"
                      value={customInterval}
                      onChange={(e) => setCustomInterval(parseInt(e.target.value) || 5)}
                      min="1"
                      max={intervalUnit === 'seconds' ? 3600 : intervalUnit === 'minutes' ? 60 : 24}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                      disabled={isAutoScrapingActive}
                      placeholder="5"
                    />
                    <select
                      value={intervalUnit}
                      onChange={(e) => setIntervalUnit(e.target.value as 'seconds' | 'minutes' | 'hours')}
                      className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                      disabled={isAutoScrapingActive}
                    >
                      <option value="seconds">saniye</option>
                      <option value="minutes">dakika</option>
                      <option value="hours">saat</option>
                    </select>
                  </div>

                  {/* Başlat/Durdur Butonu */}
                  {!isAutoScrapingActive ? (
                    <button
                      onClick={startCustomAutoScraping}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm font-medium transition-colors duration-200"
                    >
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Başlat
                    </button>
                  ) : (
                    <button
                      onClick={stopCustomAutoScraping}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center text-sm font-medium transition-colors duration-200"
                    >
                      <PauseIcon className="h-4 w-4 mr-2" />
                      Durdur
                    </button>
                  )}

                  {/* Durum Göstergesi */}
                  {isAutoScrapingActive && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Her {customInterval} {intervalUnit === 'seconds' ? 's' : intervalUnit === 'minutes' ? 'dk' : 'sa'} çalışıyor</span>
                    </div>
                  )}
                </div>
            <button
              onClick={() => setShowSavedUrls(!showSavedUrls)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors duration-200"
            >
              {showSavedUrls ? 'Gizle' : 'Göster'}
            </button>
              </div>
            </div>
          </div>

          {showSavedUrls && (
            <div className="p-6">
              {savedUrls.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {savedUrls.map((savedUrl) => (
                    <div key={savedUrl.id} className="group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 overflow-hidden">
                      {/* Header with gradient background */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              <h3 className="font-semibold text-sm text-gray-900 truncate">
                                {MATERIAL_NAMES[savedUrl.material_type]}
                              </h3>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-600">
                              <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></div>
                              <span className="truncate" title={savedUrl.url}>
                                {new URL(savedUrl.url).hostname}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-1 flex-shrink-0 ml-2">
                            <button
                              onClick={() => handleLoadSavedUrl(savedUrl)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors duration-200"
                              title="Düzenle"
                            >
                              <PencilIcon className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteUrl(savedUrl.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors duration-200"
                              title="Sil"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-4 space-y-4">
                      
                        {/* Test Status */}
                        <div>
                        {savedUrl.test_result && savedUrl.test_result.success ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-green-800 text-sm">Test Başarılı</div>
                                    <div className="text-xl font-bold text-green-900">
                                      ₺{savedUrl.test_result.price}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleSetAsDefaultPrice(savedUrl)}
                                className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center text-xs font-medium"
                              >
                                <StarIcon className="h-3 w-3 mr-1" />
                                Varsayılan Fiyat
                              </button>
                            </div>
                        ) : (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <XMarkIcon className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                  <div className="font-semibold text-red-800 text-sm">Test Başarısız</div>
                                  <div className="text-xs text-red-600">Fiyat çekilemedi</div>
                                </div>
                              </div>
                            </div>
                        )}
                        </div>

                        {/* Selector Düzenleme */}
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              <span className="font-semibold text-gray-800 text-sm">CSS Selector</span>
                            </div>
                            <button
                              onClick={() => handleStartEditingSelector(savedUrl)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors duration-200"
                              title="Selector Düzenle"
                            >
                              <PencilIcon className="h-3 w-3" />
                            </button>
                          </div>

                          {editingSelector === savedUrl.id ? (
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  CSS Selector
                                </label>
                                <textarea
                                  value={editingSelectorValue}
                                  onChange={(e) => setEditingSelectorValue(e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-gray-900"
                                  rows={2}
                                  placeholder=".price, #price, [data-price]..."
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Virgülle ayırarak birden fazla selector kullanabilirsiniz
                                </p>
                              </div>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleSaveSelector(savedUrl)}
                                  className="flex-1 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors duration-200 text-xs font-medium"
                                >
                                  Kaydet
                                </button>
                                <button
                                  onClick={handleCancelEditingSelector}
                                  className="flex-1 bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400 transition-colors duration-200 text-xs font-medium"
                                >
                                  İptal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white rounded p-2 border border-gray-200">
                              <div className="text-xs text-gray-600 mb-1">Mevcut Selector:</div>
                              <div className="font-mono text-xs bg-gray-100 p-1 rounded border break-all text-gray-900">
                                {savedUrl.selector}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Auto-scraping Section */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                              <span className="font-semibold text-gray-800 text-sm">Otomatik Çekim</span>
                            </div>
                            <button
                              onClick={() => handleToggleAutoScraping(savedUrl)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 flex items-center ${
                                savedUrl.auto_scraping_enabled 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                              }`}
                            >
                              {savedUrl.auto_scraping_enabled ? (
                                <>
                                  <PlayIcon className="h-3 w-3 mr-1" />
                                  Aktif
                                </>
                              ) : (
                                <>
                                  <PauseIcon className="h-3 w-3 mr-1" />
                                  Pasif
                                </>
                              )}
                            </button>
                          </div>

                          {savedUrl.auto_scraping_enabled && (
                            <div className="mb-2">
                              <div className="bg-white rounded p-2 border border-gray-200 text-center">
                                <div className="text-xs text-gray-500 mb-1">Çarpan</div>
                                <div className="font-bold text-lg text-gray-900">
                                  {savedUrl.price_multiplier || 1}x
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleRunManualScraping(savedUrl)}
                              className="flex-1 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center text-xs font-medium"
                            >
                              <ArrowPathIcon className="h-3 w-3 mr-1" />
                              Çek
                            </button>
                            <button
                              onClick={() => {
                                const newMultiplier = prompt('Yeni fiyat çarpanı:', String(savedUrl.price_multiplier || 1));
                                if (newMultiplier) {
                                  handleUpdateAutoScrapingSettings(
                                    savedUrl, 
                                    savedUrl.auto_scraping_interval_hours || 24, 
                                    parseFloat(newMultiplier)
                                  );
                                }
                              }}
                              className="bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors duration-200 flex items-center text-xs font-medium"
                            >
                              <Cog6ToothIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz kaydedilmiş URL yok</h3>
                  <p className="text-gray-500 mb-4">Test yapıp URL&apos;leri kaydederek otomatik fiyat çekme özelliğini kullanmaya başlayın</p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>URL Test Et</span>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span>Kaydet</span>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span>Otomatik Çek</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Geçmişi kaldırıldı - sadece Kaydedilmiş URL'ler kullanılıyor */}
      </div>

      {/* Log Panel */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center text-sm font-medium shadow-lg"
        >
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          Log&apos;lar ({logs.length})
        </button>
      </div>

      {/* Log Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-96 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Sistem Log&apos;ları</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearLogs}
                  className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
                >
                  Temizle
                </button>
                <button
                  onClick={() => setShowLogs(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Henüz log yok
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      log.type === 'success' 
                        ? 'bg-green-50 border-green-400' 
                        : log.type === 'error'
                        ? 'bg-red-50 border-red-400'
                        : log.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-400'
                        : 'bg-blue-50 border-blue-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-medium ${
                            log.type === 'success' 
                              ? 'text-green-800' 
                              : log.type === 'error'
                              ? 'text-red-800'
                              : log.type === 'warning'
                              ? 'text-yellow-800'
                              : 'text-blue-800'
                          }`}>
                            {log.type.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 mt-1">{log.message}</p>
                        {log.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                              Detaylar
                            </summary>
                            <pre className="text-xs text-gray-600 mt-1 bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}