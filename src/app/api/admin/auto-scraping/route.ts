import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as cheerio from 'cheerio';

// Scraping fonksiyonu - internal fetch yerine doğrudan kullan
async function performScraping(url: string, selector: string, materialType: string) {
  try {
    console.log(`[PERFORM-SCRAPING] Starting for ${materialType} - ${url}`);
    console.log(`[PERFORM-SCRAPING] Using selector: ${selector}`);
    
    // Önce doğrudan fetch dene
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log(`[PERFORM-SCRAPING] Direct fetch successful for ${materialType}`);
      
      return await parseHtml(html, selector, materialType);
      
    } catch (directFetchError) {
      console.log(`[PERFORM-SCRAPING] Direct fetch failed, trying proxy for ${materialType}:`, directFetchError);
      
      // Proxy kullan
      const proxyResponse = await fetch(`${process.env.RAILWAY_PUBLIC_DOMAIN || 'https://alcpn-production.up.railway.app'}/api/proxy/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });
      
      console.log(`[PERFORM-SCRAPING] Proxy response status: ${proxyResponse.status}`);
      
      const proxyResult = await proxyResponse.json();
      console.log(`[PERFORM-SCRAPING] Proxy result:`, proxyResult);
      
      if (!proxyResult.success) {
        throw new Error(`Proxy fetch failed: ${proxyResult.error}`);
      }
      
      return await parseHtml(proxyResult.data.html, selector, materialType);
    }
    
  } catch (error) {
    console.error(`[PERFORM-SCRAPING] Error for ${materialType}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
}

// HTML parsing fonksiyonu
async function parseHtml(html: string, selector: string, materialType: string) {
  try {
    const $ = cheerio.load(html);
    const extractedData: Record<string, unknown> = {};
    
    // Extract price using the provided selector
    console.log(`[PARSE-HTML] Trying selector: ${selector} for ${materialType}`);
    const priceMatch = extractPriceWithCheerio($ as cheerio.CheerioAPI, selector);
    console.log(`[PARSE-HTML] Price match result: ${priceMatch} for ${materialType}`);
    if (priceMatch) {
      extractedData.price = priceMatch;
    }

    // Try to extract title
    const titleMatch = extractTitleWithCheerio($ as cheerio.CheerioAPI);
    if (titleMatch) {
      extractedData.title = titleMatch;
    }

    // Try to extract availability
    const availabilityMatch = extractAvailabilityWithCheerio($ as cheerio.CheerioAPI);
    if (availabilityMatch) {
      extractedData.availability = availabilityMatch;
    }

    // Try to extract image
    const imageMatch = extractImageWithCheerio($ as cheerio.CheerioAPI);
    if (imageMatch) {
      extractedData.image = imageMatch;
    }

    if (extractedData.price) {
      console.log(`[PARSE-HTML] Successfully extracted price ${extractedData.price} for ${materialType}`);
      return {
        success: true,
        data: extractedData,
        message: `Fiyat başarıyla çekildi: ₺${extractedData.price}`
      };
    } else {
      console.log(`[PARSE-HTML] No price found for ${materialType} with selector: ${selector}`);
      return {
        success: false,
        error: 'Belirtilen CSS selector ile fiyat bulunamadı',
        data: null
      };
    }
    
  } catch (error) {
    console.error(`[PARSE-HTML] Error parsing HTML for ${materialType}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'HTML parsing error',
      data: null
    };
  }
}

// Helper functions (test-scraping'den kopyalandı)
function extractPriceWithCheerio($: cheerio.CheerioAPI, selector: string): number | null {
  try {
    console.log(`[EXTRACT-PRICE] Trying selector: ${selector}`);
    const priceElement = $(selector);
    console.log(`[EXTRACT-PRICE] Found ${priceElement.length} elements with selector: ${selector}`);
    if (priceElement.length > 0) {
      const priceText = priceElement.text().trim();
      console.log(`[EXTRACT-PRICE] Price text: "${priceText}"`);
      const price = extractPriceFromText(priceText);
      console.log(`[EXTRACT-PRICE] Extracted price: ${price}`);
      if (price) return price;
    }

    // If selector doesn't work, try common price selectors
    const commonPriceSelectors = [
      // Common price classes
      '.price', '.product-price', '.current-price', '.sale-price', '.final-price',
      '.price-current', '.price-now', '.price-value', '.price-amount',
      '.cost', '.amount', '.value', '.fiyat', '.tutar',
      
      // IDs
      '#price', '#product-price', '#current-price', '#final-price',
      
      // Data attributes
      '[data-price]', '[data-testid*="price"]', '[data-testid*="Price"]',
      '[class*="price"]', '[class*="Price"]', '[class*="PRICE"]',
      '[data-value]', '[data-amount]', '[data-cost]',
      
      // E-commerce specific
      '.price-box', '.price-container', '.price-wrapper',
      '.product-cost', '.item-price', '.listing-price',
      '.offer-price', '.discount-price', '.special-price',
      
      // Turkish e-commerce
      '.urun-fiyat', '.fiyat-bilgisi', '.fiyat-detay',
      '.satis-fiyati', '.indirimli-fiyat', '.kampanya-fiyat',
      
      // Generic number patterns
      '.number', '.numeric', '.currency', '.money'
    ];

    for (const commonSelector of commonPriceSelectors) {
      const element = $(commonSelector);
      if (element.length > 0) {
        const priceText = element.text().trim();
        const price = extractPriceFromText(priceText);
        if (price) return price;
      }
    }

    // Try to find price in meta tags
    const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                     $('meta[property="og:price:amount"]').attr('content') ||
                     $('meta[name="price"]').attr('content');
    
    if (metaPrice) {
      const price = extractPriceFromText(metaPrice);
      if (price) return price;
    }

    return null;
  } catch (error) {
    console.error('Price extraction error:', error);
    return null;
  }
}

function extractPriceFromText(text: string): number | null {
  try {
    const pricePatterns = [
      /(\d+(?:[.,]\d+)?)\s*(?:TL|₺|lira|Lira)/gi,
      /(?:fiyat|price|cost|maliyet)[:\s]*(\d+(?:[.,]\d+)?)/gi,
      /(\d+(?:[.,]\d+)?)\s*(?:₺|TL|lira)/gi,
      /(?:₺|TL)\s*(\d+(?:[.,]\d+)?)/gi,
      /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:TL|₺)/gi,
      /(\d+(?:[.,]\d+)?)\s*(?:TL|₺|lira)/gi,
      /(\d+(?:[.,]\d+)?)/g,
    ];

    const foundPrices: number[] = [];

    for (const pattern of pricePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const numberMatch = match.match(/(\d+(?:[.,]\d+)?)/);
          if (numberMatch) {
            const price = parseFloat(numberMatch[1].replace(',', '.'));
            if (price > 0.01 && price < 100000) {
              foundPrices.push(price);
            }
          }
        }
      }
    }

    if (foundPrices.length > 0) {
      foundPrices.sort((a, b) => {
        const aScore = (a >= 1 && a <= 1000) ? 1 : 0;
        const bScore = (b >= 1 && b <= 1000) ? 1 : 0;
        return bScore - aScore;
      });
      return foundPrices[0];
    }

    return null;
  } catch {
    return null;
  }
}

function extractTitleWithCheerio($: cheerio.CheerioAPI): string | null {
  try {
    const titleSelectors = [
      'title', 'h1', 'h2', '.product-title', '.product-name',
      '[data-testid*="title"]', '[class*="title"]', '.name', '.heading'
    ];

    for (const selector of titleSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const title = element.text().trim();
        if (title && title.length > 0 && title.length < 200) {
          return title;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

function extractAvailabilityWithCheerio($: cheerio.CheerioAPI): string | null {
  try {
    const availabilitySelectors = [
      '.stock', '.availability', '.inventory',
      '[data-testid*="stock"]', '[class*="stock"]',
      '.status', '.condition'
    ];

    for (const selector of availabilitySelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const availability = element.text().trim();
        if (availability) {
          return availability;
        }
      }
    }

    const bodyText = $('body').text().toLowerCase();
    if (bodyText.includes('stokta') || bodyText.includes('mevcut') || bodyText.includes('available')) {
      return 'Stokta';
    } else if (bodyText.includes('tükendi') || bodyText.includes('out of stock') || bodyText.includes('unavailable')) {
      return 'Tükendi';
    }

    return null;
  } catch {
    return null;
  }
}

function extractImageWithCheerio($: cheerio.CheerioAPI): string | null {
  try {
    const imageSelectors = [
      '.product-image img', '.product-photo img', '.main-image img',
      '[data-testid*="image"] img', '.gallery img', '.slider img'
    ];

    for (const selector of imageSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const src = element.attr('src') || element.attr('data-src');
        if (src && src.startsWith('http')) {
          return src;
        }
      }
    }

    const metaImage = $('meta[property="og:image"]').attr('content') ||
                     $('meta[name="image"]').attr('content');
    
    if (metaImage && metaImage.startsWith('http')) {
      return metaImage;
    }

    return null;
  } catch {
    return null;
  }
}

// GET /api/admin/auto-scraping - Otomatik fiyat çekme işlemini başlat
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Geçici olarak development için authentication'ı devre dışı bırak
    // TODO: Production'da gerçek authentication kullan
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // const userRole = user.user_metadata?.role;
    // if (userRole !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    // }

    // Önce tüm aktif URL'leri kontrol et
    const { data: allActiveUrls } = await supabase
      .from('custom_scraping_urls')
      .select('*')
      .eq('auto_scraping_enabled', true)
      .eq('is_active', true);

    console.log('All active auto-scraping URLs:', allActiveUrls);
    console.log('Current time:', new Date().toISOString());

    // Geçici olarak: Tüm aktif URL'leri çek (test için)
    const { data: urlsToScrape, error: fetchError } = await supabase
      .from('custom_scraping_urls')
      .select('*')
      .eq('auto_scraping_enabled', true)
      .eq('is_active', true)
      // .lte('next_auto_scrape_at', new Date().toISOString()) // Geçici olarak kaldırıldı
      .order('next_auto_scrape_at', { ascending: true });

    console.log('URLs ready for scraping:', urlsToScrape);

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
        const scrapingResult = await performScraping(urlData.url, urlData.selector, urlData.material_type);
        const responseTime = Date.now() - startTime;
        
        console.log(`Scraping result for ${urlData.material_type}:`, scrapingResult);

        // Scraping sonucunu veritabanına kaydet
        const { error: historyError } = await supabase
          .from('scraping_history')
          .insert({
            url_id: urlData.id,
            price: scrapingResult.success && scrapingResult.data?.price ? 
              (typeof scrapingResult.data.price === 'number' ? scrapingResult.data.price * (urlData.price_multiplier || 1) : null) : null,
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
          const finalPrice = (typeof scrapingResult.data.price === 'number' ? scrapingResult.data.price * (urlData.price_multiplier || 1) : null);
          
          console.log(`Updating material price for ${urlData.material_type}: ${finalPrice}`);
          
          // Manuel API'yi kullanarak fiyat güncelle
          try {
            const priceUpdateResponse = await fetch(`${request.nextUrl.origin}/api/admin/update-material-price-simple`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                material_type: urlData.material_type,
                price: finalPrice,
              }),
            });

            if (priceUpdateResponse.ok) {
              const priceUpdateResult = await priceUpdateResponse.json();
              console.log('Material price updated successfully via API:', priceUpdateResult);
            } else {
              const errorData = await priceUpdateResponse.json();
              console.error('Error updating material price via API:', errorData);
            }
          } catch (error) {
            console.error('Error calling price update API:', error);
          }
        } else {
          console.log(`Skipping price update for ${urlData.material_type}: success=${scrapingResult.success}, price=${scrapingResult.data?.price}`);
        }

        results.push({
          url_id: urlData.id,
          material_type: urlData.material_type,
          url: urlData.url,
          selector: urlData.selector,
          success: scrapingResult.success,
          price: scrapingResult.success && scrapingResult.data?.price ? 
            (typeof scrapingResult.data.price === 'number' ? scrapingResult.data.price * (urlData.price_multiplier || 1) : null) : null,
          error: scrapingResult.error,
          response_time_ms: responseTime,
        });

        if (scrapingResult.success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Rate limiting için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 1000));

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
      message: `Auto-scraping completed. ${successCount} successful, ${errorCount} failed.`,
      scraped_count: urlsToScrape.length,
      success_count: successCount,
      error_count: errorCount,
      results,
    });

  } catch (error) {
    console.error('Auto-scraping API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/auto-scraping - Belirli URL'leri manuel olarak otomatik fiyat çekme için tetikle
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Geçici olarak development için authentication'ı devre dışı bırak
    // TODO: Production'da gerçek authentication kullan
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // const userRole = user.user_metadata?.role;
    // if (userRole !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    // }

    const body = await request.json();
    const { url_ids } = body;

    if (!url_ids || !Array.isArray(url_ids) || url_ids.length === 0) {
      return NextResponse.json({ error: 'url_ids array is required' }, { status: 400 });
    }

    // Belirtilen URL'leri getir
    const { data: urlsToScrape, error: fetchError } = await supabase
      .from('custom_scraping_urls')
      .select('*')
      .in('id', url_ids)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching specified URLs:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch specified URLs' }, { status: 500 });
    }

    if (!urlsToScrape || urlsToScrape.length === 0) {
      return NextResponse.json({ 
        message: 'No valid URLs found',
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
        const scrapingResult = await performScraping(urlData.url, urlData.selector, urlData.material_type);
        const responseTime = Date.now() - startTime;
        
        console.log(`Scraping result for ${urlData.material_type}:`, scrapingResult);

        // Scraping sonucunu veritabanına kaydet
        const { error: historyError } = await supabase
          .from('scraping_history')
          .insert({
            url_id: urlData.id,
            price: scrapingResult.success && scrapingResult.data?.price ? 
              (typeof scrapingResult.data.price === 'number' ? scrapingResult.data.price * (urlData.price_multiplier || 1) : null) : null,
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
          const finalPrice = (typeof scrapingResult.data.price === 'number' ? scrapingResult.data.price * (urlData.price_multiplier || 1) : null);
          
          console.log(`Updating material price for ${urlData.material_type}: ${finalPrice}`);
          
          // Manuel API'yi kullanarak fiyat güncelle
          try {
            const priceUpdateResponse = await fetch(`${request.nextUrl.origin}/api/admin/update-material-price-simple`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                material_type: urlData.material_type,
                price: finalPrice,
              }),
            });

            if (priceUpdateResponse.ok) {
              const priceUpdateResult = await priceUpdateResponse.json();
              console.log('Material price updated successfully via API:', priceUpdateResult);
            } else {
              const errorData = await priceUpdateResponse.json();
              console.error('Error updating material price via API:', errorData);
            }
          } catch (error) {
            console.error('Error calling price update API:', error);
          }
        } else {
          console.log(`Skipping price update for ${urlData.material_type}: success=${scrapingResult.success}, price=${scrapingResult.data?.price}`);
        }

        results.push({
          url_id: urlData.id,
          material_type: urlData.material_type,
          url: urlData.url,
          selector: urlData.selector,
          success: scrapingResult.success,
          price: scrapingResult.success && scrapingResult.data?.price ? 
            (typeof scrapingResult.data.price === 'number' ? scrapingResult.data.price * (urlData.price_multiplier || 1) : null) : null,
          error: scrapingResult.error,
          response_time_ms: responseTime,
        });

        if (scrapingResult.success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Rate limiting için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 1000));

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
      message: `Manual auto-scraping completed. ${successCount} successful, ${errorCount} failed.`,
      scraped_count: urlsToScrape.length,
      success_count: successCount,
      error_count: errorCount,
      results,
    });

  } catch (error) {
    console.error('Manual auto-scraping API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
