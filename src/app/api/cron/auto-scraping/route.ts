import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as cheerio from 'cheerio';

// GET /api/cron/auto-scraping - Cron job için otomatik fiyat çekme
export async function GET(request: NextRequest) {
  try {
    // Geçici olarak authentication'ı devre dışı bırak (test için)
    // TODO: Production'da gerçek authentication kullan
    console.log('Cron job triggered at:', new Date().toISOString());

    const supabase = await createClient();

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

// Helper functions (auto-scraping'den kopyalandı)
async function performScraping(url: string, selector: string, materialType: string) {
  try {
    console.log(`[PERFORM-SCRAPING] Starting scraping for ${materialType} from ${url} with selector: ${selector}`);
    
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
    });

    if (!response.ok) {
      console.log(`[PERFORM-SCRAPING] HTTP error: ${response.status} ${response.statusText}`);
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
        data: null
      };
    }

    const html = await response.text();
    console.log(`[PERFORM-SCRAPING] HTML length: ${html.length} characters`);
    
    return parseHtml(html, selector, materialType);
  } catch (error) {
    console.error(`[PERFORM-SCRAPING] Error fetching ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
}

function parseHtml(html: string, selector: string, materialType: string) {
  try {
    console.log(`[PARSE-HTML] Parsing HTML for ${materialType} with selector: ${selector}`);
    const $ = cheerio.load(html);
    
    const extractedData: any = {
      price: null,
      title: null,
      availability: null,
      image: null,
    };

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
        if (title && title.length > 0) {
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
      '.availability', '.stock', '.in-stock', '.out-of-stock',
      '[data-testid*="availability"]', '[class*="stock"]',
      '.status', '.condition'
    ];

    for (const selector of availabilitySelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const availability = element.text().trim();
        if (availability && availability.length > 0) {
          return availability;
        }
      }
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