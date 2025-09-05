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
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Henüz hesaplama yapılmadı
        </h3>
        <p className="text-gray-500">
          Yukarıdaki formu doldurarak malzeme hesaplaması yapabilirsiniz.
        </p>
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-900">
            Hesaplama Sonuçları
          </h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
            <button
              onClick={handleCopyToClipboard}
              className="inline-flex items-center justify-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Panoya Kopyala
            </button>
            {onClear && (
              <button
                onClick={onClear}
                className="inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Temizle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sonuçlar Tablosu */}
      <div className="overflow-x-auto">
        {/* Desktop Table */}
        <table className="hidden sm:table min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Malzeme Türü
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Miktar
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Birim Fiyat
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Toplam Fiyat
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.map((result, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {result.materialName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatNumber(result.quantity)} {result.unit}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(result.unitPrice)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
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
            <div key={index} className="px-4 py-4 border-b border-gray-200 last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  {result.materialName}
                </h4>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(result.totalPrice)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <span className="font-medium">Miktar:</span> {formatNumber(result.quantity)} {result.unit}
                </div>
                <div>
                  <span className="font-medium">Birim Fiyat:</span> {formatCurrency(result.unitPrice)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toplam */}
      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="text-sm text-gray-500">
            {results.length} malzeme türü
          </div>
          <div className="text-lg font-bold text-gray-900">
            Toplam: {formatCurrency(totalCost)}
          </div>
        </div>
      </div>

    </div>
  );
}
