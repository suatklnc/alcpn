import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // Service role client oluştur
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Tüm aktif URL'leri çek
    const { data: allUrls, error: allUrlsError } = await supabase
      .from('custom_scraping_urls')
      .select('*')
      .eq('auto_scraping_enabled', true)
      .eq('is_active', true)
      .order('next_auto_scrape_at', { ascending: true });

    if (allUrlsError) {
      return NextResponse.json({ error: 'Failed to fetch URLs', details: allUrlsError }, { status: 500 });
    }

    // Şu anki zaman
    const now = new Date().toISOString();
    
    // Hazır olan URL'leri çek
    const { data: readyUrls, error: readyUrlsError } = await supabase
      .from('custom_scraping_urls')
      .select('*')
      .eq('auto_scraping_enabled', true)
      .eq('is_active', true)
      .lte('next_auto_scrape_at', now)
      .order('next_auto_scrape_at', { ascending: true });

    if (readyUrlsError) {
      return NextResponse.json({ error: 'Failed to fetch ready URLs', details: readyUrlsError }, { status: 500 });
    }

    return NextResponse.json({
      status: 'completed',
      message: 'URLs debug completed',
      currentTime: now,
      allUrls: allUrls?.map(url => ({
        id: url.id,
        material_type: url.material_type,
        url: url.url,
        next_auto_scrape_at: url.next_auto_scrape_at,
        last_auto_scraped_at: url.last_auto_scraped_at,
        auto_scraping_interval_hours: url.auto_scraping_interval_hours,
        isReady: new Date(url.next_auto_scrape_at) <= new Date(now)
      })) || [],
      readyUrls: readyUrls?.map(url => ({
        id: url.id,
        material_type: url.material_type,
        url: url.url,
        next_auto_scrape_at: url.next_auto_scrape_at,
        last_auto_scraped_at: url.last_auto_scraped_at,
        auto_scraping_interval_hours: url.auto_scraping_interval_hours
      })) || [],
      readyCount: readyUrls?.length || 0,
      totalCount: allUrls?.length || 0
    });

  } catch (error) {
    console.error('URLs debug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
