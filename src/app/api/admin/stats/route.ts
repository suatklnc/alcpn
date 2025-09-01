import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminStats } from '@/types/admin';

// GET /api/admin/stats - Admin panel istatistikleri
export async function GET() {
  try {
    // Basit bağlantı testi
    const supabase = createAdminClient();
    
    // Sadece scraping_sources tablosunu test et
    const { data, error } = await supabase
      .from('scraping_sources')
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection error:', error);
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: error.message 
      }, { status: 500 });
    }

    // Basit stats döndür
    const stats: AdminStats = {
      total_sources: data?.length || 0,
      active_sources: 0,
      total_urls: 0,
      active_urls: 0,
      total_scraping_attempts: 0,
      successful_scrapes: 0,
      failed_scrapes: 0,
      last_24h_scrapes: 0,
      average_response_time: 0,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
