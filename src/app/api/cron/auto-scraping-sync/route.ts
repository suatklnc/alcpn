import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('Sync cron job triggered at:', new Date().toISOString());
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Sadece 1 URL çek - en eski olanı
    const { data: urlsToScrape, error: fetchError } = await supabaseService
      .from('custom_scraping_urls')
      .select('*')
      .lte('next_auto_scrape_at', new Date().toISOString())
      .order('next_auto_scrape_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching URLs for sync scraping:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch URLs',
        details: fetchError.message 
      }, { status: 500 });
    }

    if (!urlsToScrape || urlsToScrape.length === 0) {
      console.log('No URLs ready for sync scraping');
      return NextResponse.json({ 
        message: 'No URLs ready for scraping',
        scraped_count: 0,
        success_count: 0,
        error_count: 0,
        results: []
      });
    }

    const urlData = urlsToScrape[0];
    console.log(`Processing URL: ${urlData.material_type} - ${urlData.url}`);

    // Scraping yap
    const scrapingResult = await performSimpleScraping(
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

    // next_auto_scrape_at'ı güncelle
    const nextScrapeTime = new Date();
    nextScrapeTime.setHours(nextScrapeTime.getHours() + (urlData.auto_scraping_interval_hours || 24));
    
    await supabaseService
      .from('custom_scraping_urls')
      .update({
        last_auto_scraped_at: new Date().toISOString(),
        next_auto_scrape_at: nextScrapeTime.toISOString()
      })
      .eq('id', urlData.id);

    console.log(`Sync scraping completed for ${urlData.material_type}`);

    return NextResponse.json({
      message: 'Sync scraping completed',
      scraped_count: 1,
      success_count: scrapingResult.success ? 1 : 0,
      error_count: scrapingResult.success ? 0 : 1,
      results: [{
        url_id: urlData.id,
        material_type: urlData.material_type,
        url: urlData.url,
        selector: urlData.selector,
        success: scrapingResult.success,
        price: scrapingResult.data?.price || null,
        error: scrapingResult.error || null,
        response_time_ms: 0
      }],
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Sync cron job error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Basit scraping fonksiyonu
async function performSimpleScraping(url: string, selector: string, materialType: string) {
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
      signal: AbortSignal.timeout(10000) // 10 saniye timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log(`HTML received for ${materialType}, length: ${html.length}`);

    // Basit regex ile fiyat çıkarma
    let price = null;
    
    if (selector === 'JSON-LD') {
      // JSON-LD script'lerini bul
      const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/g;
      const jsonLdMatches = html.match(jsonLdRegex);
      
      if (jsonLdMatches) {
        for (const match of jsonLdMatches) {
          try {
            const scriptContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
            const jsonData = JSON.parse(scriptContent);
          if (jsonData.offers && jsonData.offers.price) {
            price = parseFloat(jsonData.offers.price);
            console.log(`Found JSON-LD price for ${materialType}: ${price}`);
            break;
          }
        } catch {
          // JSON parse hatası, devam et
        }
      }
      }
    } else {
      // CSS selector ile fiyat çıkarma (basit regex)
      const priceRegex = /(\d+[.,]\d+)/g;
      const matches = html.match(priceRegex);
      
      if (matches && matches.length > 0) {
        // En büyük sayıyı al (genellikle fiyat)
        const prices = matches.map(m => parseFloat(m.replace(',', '.')));
        price = Math.max(...prices);
        console.log(`Found CSS price for ${materialType}: ${price}`);
      }
    }

    return {
      success: price !== null,
      data: {
        price: price,
        title: null,
        availability: null,
        image: null
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
