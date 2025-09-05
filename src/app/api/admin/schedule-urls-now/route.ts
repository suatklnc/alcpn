import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // Service role client oluştur
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Tüm URL'leri hemen çekmeye hazır hale getir ve otomatik çekimi aktif et
    const { data, error } = await supabase
      .from('custom_scraping_urls')
      .update({ 
        next_auto_scrape_at: new Date().toISOString(), // Şu anki zaman
        auto_scraping_enabled: true, // Otomatik çekimi aktif et
        is_active: true // Aktif et
      })
      .select('id, url, material_type, next_auto_scrape_at');

    if (error) {
      console.error('Error scheduling URLs:', error);
      return NextResponse.json({ error: 'Failed to schedule URLs' }, { status: 500 });
    }

    return NextResponse.json({
      message: `${data?.length || 0} URLs scheduled for immediate scraping.`,
      scheduledUrls: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API error scheduling URLs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
