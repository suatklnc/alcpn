import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    console.log('Cron job triggered at:', new Date().toISOString());
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Tüm aktif URL'leri çek (zaman kontrolü olmadan)
    const { data: allUrls, error: fetchError } = await supabaseService
      .from('custom_scraping_urls')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching URLs for cron scraping:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch URLs',
        details: fetchError.message 
      }, { status: 500 });
    }

    if (!allUrls || allUrls.length === 0) {
      console.log('No URLs found for cron scraping');
      return NextResponse.json({ 
        message: 'No URLs found for scraping',
        scraped_count: 0,
        success_count: 0,
        error_count: 0,
        results: []
      });
    }

    console.log(`Processing ${allUrls.length} URLs for cron scraping`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Tüm URL'leri işle
    for (const urlData of allUrls) {
      console.log(`Processing URL: ${urlData.material_type} - ${urlData.url}`);

      // Scraping yap
      const scrapingResult = await performScraping(
        urlData.url, 
        urlData.selector, 
        urlData.material_type
      );

      console.log(`Scraping result for ${urlData.material_type}:`, scrapingResult);

      // Scraping history'yi kaydet
      const { error: historyError } = await supabaseService
        .from('scraping_history')
        .insert({
          url_id: urlData.id,
          material_type: urlData.material_type,
          url: urlData.url,
          selector: urlData.selector,
          price: scrapingResult.data?.price || null,
          title: scrapingResult.data?.title || null,
          availability: scrapingResult.data?.availability || null,
          image_url: scrapingResult.data?.image || null,
          success: scrapingResult.success,
          error_message: scrapingResult.error || null,
          response_time_ms: 0,
          scraped_at: new Date().toISOString(),
        });

      if (historyError) {
        console.error('Error saving scraping history:', historyError);
      }

      // Başarılı ise malzeme fiyatını güncelle
      if (scrapingResult.success && scrapingResult.data?.price) {
        const finalPrice = (typeof scrapingResult.data.price === 'number' ? 
          scrapingResult.data.price * (urlData.price_multiplier || 1) : null);
        
        console.log(`Updating material price for ${urlData.material_type}: ${finalPrice}`);
        
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
            console.log('Material price updated successfully');
          }
        } catch (error) {
          console.error('Error updating material price:', error);
        }
      }

      // next_auto_scrape_at'ı güncelle (24 saat sonra)
      const nextScrapeTime = new Date();
      nextScrapeTime.setHours(nextScrapeTime.getHours() + 24);
      
      await supabaseService
        .from('custom_scraping_urls')
        .update({
          last_auto_scraped_at: new Date().toISOString(),
          next_auto_scrape_at: nextScrapeTime.toISOString()
        })
        .eq('id', urlData.id);

      // Sonuçları topla
      results.push({
        url_id: urlData.id,
        material_type: urlData.material_type,
        url: urlData.url,
        selector: urlData.selector,
        success: scrapingResult.success,
        price: scrapingResult.data?.price || null,
        error: scrapingResult.error || null,
        response_time_ms: 0
      });

      if (scrapingResult.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Rate limiting için kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Cron scraping completed: ${successCount} successful, ${errorCount} failed`);

    return NextResponse.json({
      message: 'Cron scraping completed',
      scraped_count: allUrls.length,
      success_count: successCount,
      error_count: errorCount,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Cron job error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Scraping fonksiyonu
async function performScraping(url: string, selector: string, materialType: string) {
  try {
    console.log(`Starting scraping for ${materialType}: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(15000) // 15 saniye timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log(`HTML received for ${materialType}, length: ${html.length}`);

    // Cheerio ile HTML parse et
    const $ = cheerio.load(html);
    let price = null;
    let title = null;
    let availability = null;
    let image = null;

    if (selector === 'JSON-LD') {
      // JSON-LD script'lerini bul
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonData = JSON.parse($(element).html() || '');
          if (jsonData.offers && jsonData.offers.price) {
            price = parseFloat(jsonData.offers.price);
            title = jsonData.name || null;
            console.log(`Found JSON-LD price for ${materialType}: ${price}`);
            return false; // break
          }
        } catch (e) {
          // JSON parse hatası, devam et
        }
      });
    } else {
      // CSS selector ile fiyat çıkarma
      const priceElement = $(selector).first();
      if (priceElement.length > 0) {
        const priceText = priceElement.text().trim();
        const priceMatch = priceText.match(/(\d+[.,]\d+)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(',', '.'));
          console.log(`Found CSS price for ${materialType}: ${price}`);
        }
      }
    }

    // Title çıkarma
    const titleElement = $('title').first();
    if (titleElement.length > 0) {
      title = titleElement.text().trim();
    }

    // Availability çıkarma (basit)
    const availabilityElement = $('[class*="stock"], [class*="availability"], [class*="inventory"]').first();
    if (availabilityElement.length > 0) {
      availability = availabilityElement.text().trim();
    }

    // Image çıkarma
    const imageElement = $('img').first();
    if (imageElement.length > 0) {
      image = imageElement.attr('src');
    }

    return {
      success: price !== null,
      data: {
        price: price,
        title: title,
        availability: availability,
        image: image
      },
      error: price === null ? 'Price not found' : null
    };

  } catch (error: unknown) {
    console.error(`Scraping error for ${materialType}:`, error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
