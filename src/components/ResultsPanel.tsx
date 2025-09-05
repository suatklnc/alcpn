'use client';

import { CalculationResult } from '@/types/calculation';
import { formatCurrency, formatNumber, calculateTotalCost } from '@/lib/utils';

interface ResultsPanelProps {
  results: CalculationResult[];
  onClear?: () => void;
  loading?: boolean;
}

export default function ResultsPanel({
  results,
  onClear,
}: ResultsPanelProps) {

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            Hesaplama Sonuçları
          </h3>
        </div>
        <div className="p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Henüz hesaplama yapılmadı
          </h3>
          <p className="text-gray-600 text-lg">
            Yukarıdaki formu doldurarak malzeme hesaplaması yapabilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  const totalCost = calculateTotalCost(results);


  const handleCopyToClipboard = async () => {
    const textContent = [
      'HESAPLAMA SONUÇLARI',
      '==================',
      '',
      ...results.map((result, index) => 
        `${index + 1}. ${result.materialName}\n` +
        `   Miktar: ${formatNumber(result.quantity)} ${result.unit}\n` +
        `   Birim Fiyat: ${formatCurrency(result.unitPrice)}\n` +
        `   Toplam: ${formatCurrency(result.totalPrice)}\n`
      ),
      '==================',
      `TOPLAM: ${formatCurrency(totalCost)}`,
      `Tarih: ${new Date().toLocaleDateString('tr-TR')}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(textContent);
      // Başarı mesajı göstermek için basit bir alert kullanıyoruz
      alert('Hesaplama sonuçları panoya kopyalandı!');
    } catch (err) {
      console.error('Panoya kopyalama hatası:', err);
      alert('Panoya kopyalama başarısız oldu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            Hesaplama Sonuçları
          </h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleCopyToClipboard}
              className="group inline-flex items-center justify-center px-4 py-3 border border-indigo-300 text-sm font-semibold rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105 h-[44px] w-full sm:w-[140px]"
            >
              <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="truncate">Panoya Kopyala</span>
            </button>
            {onClear && (
              <button
                onClick={onClear}
                className="group inline-flex items-center justify-center px-4 py-3 border border-red-300 text-sm font-semibold rounded-xl text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 transform hover:scale-105 h-[44px] w-full sm:w-[140px]"
              >
                <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="truncate">Temizle</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sonuçlar Tablosu */}
      <div className="overflow-x-auto">
        {/* Desktop Table */}
        <table className="hidden sm:table min-w-full divide-y divide-gray-100">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Malzeme Türü
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Miktar
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Birim Fiyat
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Toplam Fiyat
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {results.map((result, index) => (
              <tr key={index} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group">
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                      <span className="text-white font-bold text-sm">
                        {result.materialName.charAt(0)}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors duration-200">
                      {result.materialName}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg inline-block">
                    {formatNumber(result.quantity)} {result.unit}
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(result.unitPrice)}
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg inline-block">
                    {formatCurrency(result.totalPrice)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Cards */}
        <div className="sm:hidden">
          {results.map((result, index) => (
            <div key={index} className="px-6 py-6 border-b border-gray-100 last:border-b-0 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {result.materialName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors duration-200">
                    {result.materialName}
                  </h4>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    {formatCurrency(result.totalPrice)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Miktar</p>
                  <p className="text-base font-semibold text-gray-900">{formatNumber(result.quantity)} {result.unit}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Birim Fiyat</p>
                  <p className="text-base font-semibold text-gray-900">{formatCurrency(result.unitPrice)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toplam */}
      <div className="px-6 py-6 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-3">
              <span className="text-white font-bold text-lg">₺</span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">
                {results.length} malzeme türü
              </div>
              <div className="text-lg font-semibold text-gray-900">
                Toplam Maliyet
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {formatCurrency(totalCost)}
          </div>
        </div>
      </div>

    </div>
  );
}
