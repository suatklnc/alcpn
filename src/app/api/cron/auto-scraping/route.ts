import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/cron/auto-scraping - Cron job için otomatik fiyat çekme
export async function GET(request: NextRequest) {
  try {
    // Cron job authentication (basit API key kontrolü)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'default-cron-secret';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Zamanı gelmiş otomatik fiyat çekme URL'lerini getir
    const { data: urlsToScrape, error: fetchError } = await supabase
      .from('custom_scraping_urls')
      .select('*')
      .eq('auto_scraping_enabled', true)
      .eq('is_active', true)
      .lte('next_auto_scrape_at', new Date().toISOString())
      .order('next_auto_scrape_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching URLs for auto-scraping:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch URLs for auto-scraping' }, { status: 500 });
    }

    if (!urlsToScrape || urlsToScrape.length === 0) {
      return NextResponse.json({ 
        message: 'No URLs ready for auto-scraping',
        scraped_count: 0,
        urls: []
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Her URL için fiyat çekme işlemini gerçekleştir
    for (const urlData of urlsToScrape) {
      try {
        const startTime = Date.now();
        
        // Scraping işlemini gerçekleştir
        const scrapingResponse = await fetch(`${request.nextUrl.origin}/api/admin/test-scraping`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: urlData.url,
            selector: urlData.selector,
            material_type: urlData.material_type,
          }),
        });

        const scrapingResult = await scrapingResponse.json();
        const responseTime = Date.now() - startTime;

        // Scraping sonucunu veritabanına kaydet
        const { error: historyError } = await supabase
          .from('scraping_history')
          .insert({
            url_id: urlData.id,
            price: scrapingResult.success && scrapingResult.data?.price ? 
              scrapingResult.data.price * (urlData.price_multiplier || 1) : null,
            title: scrapingResult.data?.title || null,
            availability: scrapingResult.data?.availability || null,
            image_url: scrapingResult.data?.image || null,
            success: scrapingResult.success,
            error_message: scrapingResult.error || null,
            response_time_ms: responseTime,
            scraped_at: new Date().toISOString(),
          });

        if (historyError) {
          console.error('Error saving scraping history:', historyError);
        }

        // Başarılı ise malzeme fiyatını güncelle
        if (scrapingResult.success && scrapingResult.data?.price) {
          const finalPrice = scrapingResult.data.price * (urlData.price_multiplier || 1);
          
          // Material prices tablosunu güncelle
          const { error: priceUpdateError } = await supabase
            .from('material_prices')
            .upsert({
              material_type: urlData.material_type,
              unit_price: finalPrice,
              updated_at: new Date().toISOString(),
            });

          if (priceUpdateError) {
            console.error('Error updating material price:', priceUpdateError);
          }
        }

        results.push({
          url_id: urlData.id,
          material_type: urlData.material_type,
          url: urlData.url,
          success: scrapingResult.success,
          price: scrapingResult.success && scrapingResult.data?.price ? 
            scrapingResult.data.price * (urlData.price_multiplier || 1) : null,
          error: scrapingResult.error,
          response_time_ms: responseTime,
        });

        if (scrapingResult.success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Rate limiting için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error scraping URL ${urlData.id}:`, error);
        
        // Hata durumunu da kaydet
        const { error: historyError } = await supabase
          .from('scraping_history')
          .insert({
            url_id: urlData.id,
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            response_time_ms: 0,
            scraped_at: new Date().toISOString(),
          });

        if (historyError) {
          console.error('Error saving error history:', historyError);
        }

        results.push({
          url_id: urlData.id,
          material_type: urlData.material_type,
          url: urlData.url,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          response_time_ms: 0,
        });

        errorCount++;
      }
    }

    return NextResponse.json({
      message: `Cron auto-scraping completed. ${successCount} successful, ${errorCount} failed.`,
      scraped_count: urlsToScrape.length,
      success_count: successCount,
      error_count: errorCount,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Cron auto-scraping API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
