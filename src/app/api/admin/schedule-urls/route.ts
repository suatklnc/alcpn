import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/admin/schedule-urls - URL'leri zamanla
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Tüm aktif URL'leri al
    const { data: urls, error: fetchError } = await supabase
      .from('custom_scraping_urls')
      .select('*')
      .eq('auto_scraping_enabled', true)
      .eq('is_active', true);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch URLs' }, { status: 500 });
    }

    if (!urls || urls.length === 0) {
      return NextResponse.json({ message: 'No URLs found' });
    }

    // Her URL için next_auto_scrape_at'ı ayarla
    const now = new Date();
    const updates = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const nextScrapeTime = new Date(now);
      nextScrapeTime.setMinutes(nextScrapeTime.getMinutes() + (i * 5)); // 5 dakika arayla

      updates.push({
        id: url.id,
        next_auto_scrape_at: nextScrapeTime.toISOString()
      });
    }

    // Toplu güncelleme
    const { error: updateError } = await supabase
      .from('custom_scraping_urls')
      .upsert(updates);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update URLs' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Scheduled ${updates.length} URLs`,
      updates: updates.map(u => ({
        id: u.id,
        next_auto_scrape_at: u.next_auto_scrape_at
      }))
    });

  } catch (error) {
    console.error('Schedule URLs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
