import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// GET /api/cron/auto-scraping - Cron job için otomatik fiyat çekme
export async function GET(request: NextRequest) {
  try {
    // Geçici olarak authentication'ı devre dışı bırak (test için)
    // TODO: Production'da gerçek authentication kullan
    console.log('Cron job triggered at:', new Date().toISOString());

    // Hemen response döndür, işlemi background'da çalıştır
    const response = NextResponse.json({
      message: 'Cron job started - processing in background',
      timestamp: new Date().toISOString()
    });

    // Background'da işlemi çalıştır
    processScrapingInBackground().catch(error => {
      console.error('Background scraping error:', error);
    });

    return response;
  } catch (error) {
    console.error('Cron auto-scraping API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Background'da çalışacak scraping fonksiyonu
async function processScrapingInBackground() {
  try {
    console.log('Background scraping started at:', new Date().toISOString());
    
    // Sadece service role client kullan - RLS bypass için
    const supabaseService = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Önce tüm aktif URL'leri kontrol et (service client ile)
    const { data: allActiveUrls } = await supabaseService
      .from('custom_scraping_urls')
      .select('*')
      .eq('auto_scraping_enabled', true)
      .eq('is_active', true);

    // console.log('All active auto-scraping URLs:', allActiveUrls);
    // console.log('Current time:', new Date().toISOString());

    // Aktif URL'leri çek - zaman kontrolü ile (service client ile)
    const { data: urlsToScrape, error: fetchError } = await supabaseService
      .from('custom_scraping_urls')
      .select('*')
      .eq('auto_scraping_enabled', true)
      .eq('is_active', true)
      .lte('next_auto_scrape_at', new Date().toISOString())
      .order('next_auto_scrape_at', { ascending: true })
      .limit(5); // Maksimum 5 URL ile sınırla

    // console.log('URLs ready for scraping:', urlsToScrape);

    if (fetchError) {
      console.error('Error fetching URLs for auto-scraping:', fetchError);
      return;
    }

    if (!urlsToScrape || urlsToScrape.length === 0) {
      console.log('No URLs ready for auto-scraping');
      return;
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Her URL için fiyat çekme işlemini gerçekleştir
    for (const urlData of urlsToScrape) {
      try {
        const startTime = Date.now();
        
        // Timeout kontrolü - 15 saniye limit
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Scraping timeout after 15 seconds')), 15000)
        );
        
        // Scraping işlemini gerçekleştir
        const scrapingResult = await Promise.race([
          performScraping(urlData.url, urlData.selector, urlData.material_type),
          timeoutPromise
        ]) as {
          success: boolean;
          data?: {
            price?: number;
            title?: string;
            availability?: string;
            image?: string;
          } | null;
          error?: string;
          message?: string;
        };
        const responseTime = Date.now() - startTime;
        
        // console.log(`Scraping result for ${urlData.material_type}:`, scrapingResult);

        // Scraping sonucunu veritabanına kaydet (service client ile)
        const { error: historyError } = await supabaseService
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
          
          // console.log(`Updating material price for ${urlData.material_type}: ${finalPrice}`);
          
          // Doğrudan Supabase ile material_prices tablosunu güncelle (RLS bypass)
          try {
            const { data: priceUpdateData, error: priceUpdateError } = await supabaseService
              .from('material_prices')
              .upsert({
                material_type: urlData.material_type,
                unit_price: finalPrice,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'material_type'
              });

            if (priceUpdateError) {
              console.error('Error updating material price directly:', priceUpdateError);
            } else {
              // console.log('Material price updated successfully directly:', priceUpdateData);
            }
          } catch (error) {
            console.error('Error updating material price directly:', error);
          }
        } else {
          // console.log(`Skipping price update for ${urlData.material_type}: success=${scrapingResult.success}, price=${scrapingResult.data?.price}`);
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

        // Rate limiting için kısa bekleme (200ms'ye düşürüldü)
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error scraping URL ${urlData.id}:`, error);
        
        // Hata durumunu da kaydet (service client ile)
        const { error: historyError } = await supabaseService
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

    // console.log(`Background scraping completed. ${successCount} successful, ${errorCount} failed.`);
    // console.log('Results:', results);

  } catch (error) {
    console.error('Background scraping error:', error);
  }
}

// Helper functions (auto-scraping'den kopyalandı)
async function performScraping(url: string, selector: string, materialType: string) {
  try {
    console.log(`[PERFORM-SCRAPING] Starting scraping for ${materialType} from ${url} with selector: ${selector}`);
    
    // Fetch timeout kontrolü
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    
    clearTimeout(timeoutId);

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
    
    const extractedData: {
      price: number | null;
      title: string | null;
      availability: string | null;
      image: string | null;
    } = {
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
    console.log(`[EXTRACT-PRICE] Trying selector: "${selector}"`);
    
    // Multiple selectors support - split by comma and try each one
    const selectors = selector.split(',').map(s => s.trim()).filter(s => s.length > 0);
    console.log(`[EXTRACT-PRICE] Split into ${selectors.length} selectors:`, selectors);
    
    for (const singleSelector of selectors) {
      console.log(`[EXTRACT-PRICE] Trying individual selector: ${singleSelector}`);
      const priceElement = $(singleSelector);
      console.log(`[EXTRACT-PRICE] Found ${priceElement.length} elements with selector: ${singleSelector}`);
      
      if (priceElement.length > 0) {
        const priceText = priceElement.text().trim();
        console.log(`[EXTRACT-PRICE] Price text: "${priceText}"`);
        const price = extractPriceFromText(priceText);
        console.log(`[EXTRACT-PRICE] Extracted price: ${price}`);
        if (price) {
          console.log(`[EXTRACT-PRICE] Success with selector: ${singleSelector}`);
          return price;
        }
      }
    }

    // If selector doesn't work, try common price selectors
    console.log(`[EXTRACT-PRICE] Trying common price selectors...`);
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
      console.log(`[EXTRACT-PRICE] Trying common selector: ${commonSelector}`);
      const element = $(commonSelector);
      console.log(`[EXTRACT-PRICE] Found ${element.length} elements with common selector: ${commonSelector}`);
      if (element.length > 0) {
        const priceText = element.text().trim();
        console.log(`[EXTRACT-PRICE] Common selector text: "${priceText}"`);
        const price = extractPriceFromText(priceText);
        console.log(`[EXTRACT-PRICE] Common selector extracted price: ${price}`);
        if (price) {
          console.log(`[EXTRACT-PRICE] Success with common selector: ${commonSelector}`);
          return price;
        }
      }
    }

    // Try to find price in meta tags
    const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                     $('meta[name="price"]').attr('content') ||
                     $('meta[property="og:price:amount"]').attr('content') ||
                     $('meta[property="product:price"]').attr('content') ||
                     $('meta[name="twitter:data1"]').attr('content');

    if (metaPrice) {
      const price = extractPriceFromText(metaPrice);
      if (price) return price;
    }

    // Try to find price in JSON-LD structured data
    const jsonLdScripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const jsonText = $(jsonLdScripts[i]).html();
        if (jsonText) {
          const jsonData = JSON.parse(jsonText);
          const price = extractPriceFromJsonLd(jsonData);
          if (price) return price;
        }
      } catch {
        // Ignore JSON parsing errors
      }
    }

    // Last resort: search for price patterns in all text
    const bodyText = $('body').text();
    const price = extractPriceFromText(bodyText);
    if (price) return price;

    return null;
  } catch (error) {
    console.error('Price extraction error:', error);
    return null;
  }
}

function extractPriceFromJsonLd(jsonData: unknown): number | null {
  try {
    // Handle arrays
    if (Array.isArray(jsonData)) {
      for (const item of jsonData) {
        const price = extractPriceFromJsonLd(item);
        if (price) return price;
      }
      return null;
    }

    // Handle objects
    if (typeof jsonData === 'object' && jsonData !== null) {
      const data = jsonData as Record<string, unknown>;
      // Check for price fields
      const priceFields = [
        'price', 'offers', 'lowPrice', 'highPrice', 'priceRange',
        'priceSpecification', 'value', 'amount', 'cost'
      ];

      for (const field of priceFields) {
        if (data[field]) {
          if (typeof data[field] === 'number') {
            return data[field] as number;
          } else if (typeof data[field] === 'string') {
            const price = extractPriceFromText(data[field] as string);
            if (price) return price;
          } else if (typeof data[field] === 'object' && data[field] !== null) {
            // Handle offers object
            const offerData = data[field] as Record<string, unknown>;
            if (offerData.price) {
              if (typeof offerData.price === 'number') {
                return offerData.price as number;
              } else if (typeof offerData.price === 'string') {
                const price = extractPriceFromText(offerData.price as string);
                if (price) return price;
              }
            }
            // Recursive search
            const price = extractPriceFromJsonLd(data[field]);
            if (price) return price;
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

function extractPriceFromText(text: string): number | null {
  try {
    console.log(`[EXTRACT-PRICE] Input text: "${text}"`);
    
    // Turkish price patterns - SIMPLIFIED APPROACH
    const pricePatterns = [
      // Turkish format: 3.900,00 TL - PRIORITY
      /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)/gi,
      
      // European format: 3900,00 TL
      /(\d+(?:,\d{2})?)\s*(?:TL|₺)/gi,
      
      // Simple format: 3900 TL
      /(\d+)\s*(?:TL|₺)/gi,
      
      // Just numbers with separators
      /(\d+(?:[.,]\d+)*)/g,
    ];

    const foundPrices: number[] = [];

    for (const pattern of pricePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        console.log(`[EXTRACT-PRICE] Pattern matches:`, matches);
        for (const match of matches) {
          // Extract the full number part (including dots and commas)
          const numberMatch = match.match(/(\d+(?:[.,]\d+)*)/);
          if (numberMatch) {
            let priceStr = numberMatch[1];
            console.log(`[EXTRACT-PRICE] Original price string: "${priceStr}"`);
            
            // Turkish number format: 3.900,00 -> 3900.00
            // Check if it's Turkish format (dot as thousands separator, comma as decimal)
            if (priceStr.includes('.') && priceStr.includes(',')) {
              // Turkish format: 3.900,00 -> 3900.00
              priceStr = priceStr.replace(/\./g, '').replace(',', '.');
              console.log(`[EXTRACT-PRICE] Turkish format detected, converted to: "${priceStr}"`);
            } else if (priceStr.includes(',')) {
              // European format: 3900,00 -> 3900.00
              priceStr = priceStr.replace(',', '.');
              console.log(`[EXTRACT-PRICE] European format detected, converted to: "${priceStr}"`);
            }
            
            const price = parseFloat(priceStr);
            console.log(`[EXTRACT-PRICE] Parsed price: ${price}`);
            
            // Reasonable price range check (0.01 to 100000)
            if (price > 0.01 && price < 100000) {
              foundPrices.push(price);
              console.log(`[EXTRACT-PRICE] Added to found prices: ${price}`);
            } else {
              console.log(`[EXTRACT-PRICE] Price ${price} outside range, skipped`);
            }
          }
        }
      }
    }

    console.log(`[EXTRACT-PRICE] All found prices:`, foundPrices);

    // Return the most likely price (usually the highest reasonable one)
    if (foundPrices.length > 0) {
      // Sort by price value (highest first) - prefer higher prices for products
      foundPrices.sort((a, b) => b - a);
      console.log(`[EXTRACT-PRICE] Final selected price: ${foundPrices[0]}`);
      return foundPrices[0];
    }

    console.log(`[EXTRACT-PRICE] No valid prices found`);
    return null;
  } catch (error) {
    console.log(`[EXTRACT-PRICE] Error:`, error);
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