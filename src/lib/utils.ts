// Utility fonksiyonları
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(number: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}

// Toplam maliyeti hesapla
export function calculateTotalCost(results: Array<{ totalPrice: number }>): number {
  return results.reduce((total, result) => total + result.totalPrice, 0);
}
