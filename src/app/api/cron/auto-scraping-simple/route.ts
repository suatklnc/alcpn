import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// GET /api/cron/auto-scraping-simple - Cron-job.org için basit endpoint
export async function GET() {
  try {
    console.log('Simple cron job triggered at:', new Date().toISOString());

    // Hemen response döndür
    const response = NextResponse.json({
      message: 'Cron job started - processing in background',
      timestamp: new Date().toISOString()
    });

    // Background'da işlemi çalıştır
    processSimpleScraping().catch(error => {
      console.error('Simple background scraping error:', error);
    });

    return response;

  } catch (error) {
    console.error('Simple cron job error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Basit scraping işlemi - sadece 1 URL ile test
async function processSimpleScraping() {
  try {
    console.log('Simple background scraping started at:', new Date().toISOString());
    
    // Sadece service role client kullan - RLS bypass için
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Sadece 1 URL çek - en eski olanı (service client ile)
    const { data: urlsToScrape, error: fetchError } = await supabaseService
      .from('custom_scraping_urls')
      .select('*')
      .eq('auto_scraping_enabled', true)
      .eq('is_active', true)
      .lte('next_auto_scrape_at', new Date().toISOString())
      .order('next_auto_scrape_at', { ascending: true })
      .limit(1); // Sadece 1 URL

    if (fetchError) {
      console.error('Error fetching URLs for simple scraping:', fetchError);
      return;
    }

    if (!urlsToScrape || urlsToScrape.length === 0) {
      console.log('No URLs ready for simple scraping');
      return;
    }

    const urlData = urlsToScrape[0];
    console.log('Processing URL:', urlData.url);

    // Basit scraping işlemi
    const scrapingResult = await performSimpleScraping(urlData.url, urlData.selector, urlData.material_type);
    
    // console.log(`Simple scraping result for ${urlData.material_type}:`, scrapingResult);

    // Scraping sonucunu veritabanına kaydet (service client ile)
    const { error: historyError } = await supabaseService
      .from('scraping_history')
      .insert({
        url_id: urlData.id,
        price: scrapingResult.success && scrapingResult.data?.price ? 
          (typeof scrapingResult.data.price === 'number' ? scrapingResult.data.price * (urlData.price_multiplier || 1) : null) : null,
        title: null,
        availability: null,
        image_url: null,
        success: scrapingResult.success,
        error_message: scrapingResult.error || null,
        response_time_ms: 0,
        scraped_at: new Date().toISOString(),
      });

    if (historyError) {
      console.error('Error saving simple scraping history:', historyError);
    }

    // Başarılı ise malzeme fiyatını güncelle
    if (scrapingResult.success && scrapingResult.data?.price) {
      const finalPrice = (typeof scrapingResult.data.price === 'number' ? 
        scrapingResult.data.price * (urlData.price_multiplier || 1) : null);
      
      // console.log(`Updating material price for ${urlData.material_type}: ${finalPrice}`);
      
      try {
        const { error: priceUpdateError } = await supabaseService
          .from('material_prices')
          .upsert({
            material_type: urlData.material_type,
            unit_price: finalPrice,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'material_type'
          });

        if (priceUpdateError) {
          console.error('Error updating material price:', priceUpdateError);
        } else {
          // console.log('Material price updated successfully');
        }
      } catch (error) {
        console.error('Error updating material price:', error);
      }
    }

    // next_auto_scrape_at'ı güncelle (service client ile)
    const nextScrapeTime = new Date();
    nextScrapeTime.setHours(nextScrapeTime.getHours() + (urlData.auto_scraping_interval_hours || 24));
    
    await supabaseService
      .from('custom_scraping_urls')
      .update({
        last_auto_scraped_at: new Date().toISOString(),
        next_auto_scrape_at: nextScrapeTime.toISOString()
      })
      .eq('id', urlData.id);

    // console.log(`Simple scraping completed for ${urlData.material_type}`);

  } catch (error) {
    console.error('Simple background scraping error:', error);
  }
}

// Basit scraping fonksiyonu - timeout ile
async function performSimpleScraping(url: string, selector: string, materialType: string) {
  try {
    // console.log(`[SIMPLE-SCRAPING] Starting for ${materialType} from ${url}`);
    
    // 5 saniye timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status}`,
        data: null
      };
    }

    const html = await response.text();
    return parseSimpleHtml(html, selector, materialType);
    
  } catch (error) {
    console.error(`[SIMPLE-SCRAPING] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
}

// Basit HTML parsing
function parseSimpleHtml(html: string, selector: string, materialType: string) {
  try {
    // Basit regex ile fiyat bulma
    const pricePatterns = [
      /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)/gi,
      /(\d+(?:,\d{2})?)\s*(?:TL|₺)/gi,
      /(\d+(?:[.,]\d+)*)/g,
    ];

    for (const pattern of pricePatterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (const match of matches) {
          const numberMatch = match.match(/(\d+(?:[.,]\d+)*)/);
          if (numberMatch) {
            let priceStr = numberMatch[1];
            
            // Turkish format: 3.900,00 -> 3900.00
            if (priceStr.includes('.') && priceStr.includes(',')) {
              priceStr = priceStr.replace(/\./g, '').replace(',', '.');
            } else if (priceStr.includes(',')) {
              priceStr = priceStr.replace(',', '.');
            }
            
            const price = parseFloat(priceStr);
            
            if (price > 0.01 && price < 100000) {
              // console.log(`[SIMPLE-PARSE] Found price: ${price} for ${materialType}`);
              return {
                success: true,
                data: { price },
                message: `Fiyat bulundu: ₺${price}`
              };
            }
          }
        }
      }
    }

    return {
      success: false,
      error: 'Fiyat bulunamadı',
      data: null
    };
    
  } catch (error) {
    console.error(`[SIMPLE-PARSE] Error:`, error);
    return {
      success: false,
      error: 'HTML parsing error',
      data: null
    };
  }
}
