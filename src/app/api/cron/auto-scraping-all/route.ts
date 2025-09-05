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

// Scraping fonksiyonu - "Şimdi Çek" butonu ile aynı algoritma
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
      
      if (!proxyResponse.ok) {
        throw new Error(`Proxy failed: ${proxyResponse.status}`);
      }
      
      const html = await proxyResponse.text();
      console.log(`[PERFORM-SCRAPING] Proxy fetch successful for ${materialType}`);
      
      return await parseHtml(html, selector, materialType);
    }
    
  } catch (error: unknown) {
    console.error(`[PERFORM-SCRAPING] Error for ${materialType}:`, error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// HTML parsing fonksiyonu - "Şimdi Çek" butonu ile aynı
async function parseHtml(html: string, selector: string, materialType: string) {
  try {
    console.log(`[PARSE-HTML] Starting HTML parsing for ${materialType}`);
    
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
      image: null
    };

    // Tüm olası fiyatları topla
    const allPossiblePrices: Array<{
      selector: string;
      price: number;
      textContent: string;
      elementCount: number;
      source: 'provided' | 'common' | 'meta' | 'jsonld';
    }> = [];

    // Try the provided selector first
    const providedSelectors = selector.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    for (const singleSelector of providedSelectors) {
      const elements = $(singleSelector);
      const textContents = elements.map((i, el) => $(el).text().trim()).get();
      const extractedPrice = extractPriceFromText(textContents.join(' '));
      
      if (extractedPrice) {
        allPossiblePrices.push({
          selector: singleSelector,
          price: extractedPrice,
          textContent: textContents.join(' | '),
          elementCount: elements.length,
          source: 'provided'
        });
      }
    }

    // Try common price selectors
    const commonPriceSelectors = [
      '.price', '.product-price', '.current-price', '.sale-price', '.final-price',
      '.price-current', '.price-now', '.price-value', '.price-amount',
      '.cost', '.amount', '.value', '.fiyat', '.tutar',
      '#price', '#product-price', '#current-price', '#final-price',
      '[data-price]', '[data-testid*="price"]', '[class*="price"]'
    ];

    for (const commonSelector of commonPriceSelectors) {
      const elements = $(commonSelector);
      const textContents = elements.map((i, el) => $(el).text().trim()).get();
      const extractedPrice = extractPriceFromText(textContents.join(' '));
      
      if (extractedPrice) {
        // Avoid duplicates
        const exists = allPossiblePrices.some(p => p.price === extractedPrice && p.selector === commonSelector);
        if (!exists) {
          allPossiblePrices.push({
            selector: commonSelector,
            price: extractedPrice,
            textContent: textContents.join(' | '),
            elementCount: elements.length,
            source: 'common'
          });
        }
      }
    }

    // Try meta tags
    const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                     $('meta[name="price"]').attr('content') ||
                     $('meta[property="og:price:amount"]').attr('content') ||
                     $('meta[property="product:price"]').attr('content') ||
                     $('meta[name="twitter:data1"]').attr('content');
    
    if (metaPrice) {
      const extractedPrice = extractPriceFromText(metaPrice);
      if (extractedPrice) {
        allPossiblePrices.push({
          selector: 'meta tag',
          price: extractedPrice,
          textContent: metaPrice,
          elementCount: 1,
          source: 'meta'
        });
      }
    }

    // Try JSON-LD
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonText = $(element).html();
        if (jsonText) {
          const jsonData = JSON.parse(jsonText);
          const price = extractPriceFromJsonLd(jsonData);
          if (price) {
            allPossiblePrices.push({
              selector: 'JSON-LD',
              price: price,
              textContent: JSON.stringify(jsonData).substring(0, 100),
              elementCount: 1,
              source: 'jsonld'
            });
          }
        }
      } catch {
        // Ignore JSON parsing errors
      }
    });

    // En iyi fiyatı seç
    if (allPossiblePrices.length > 0) {
      // En yüksek fiyatı seç (genellikle doğru olan)
      allPossiblePrices.sort((a, b) => b.price - a.price);
      extractedData.price = allPossiblePrices[0].price;
      console.log(`[PARSE-HTML] Selected best price: ${extractedData.price} from ${allPossiblePrices[0].source}`);
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
        message: `Fiyat başarıyla çekildi: ₺${extractedData.price}`,
        possible_prices: allPossiblePrices
      };
    } else {
      console.log(`[PARSE-HTML] No price found for ${materialType} with selector: ${selector}`);
      return {
        success: false,
        error: 'Belirtilen CSS selector ile fiyat bulunamadı',
        data: null,
        possible_prices: allPossiblePrices
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

// Helper functions - "Şimdi Çek" butonu ile aynı
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

function extractPriceFromJsonLd(jsonData: unknown): number | null {
  try {
    if (typeof jsonData === 'object' && jsonData !== null) {
      const data = jsonData as Record<string, unknown>;
      
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
      '.stock', '.availability', '.inventory', '.quantity',
      '[class*="stock"]', '[class*="availability"]', '[class*="inventory"]',
      '.product-availability', '.item-availability'
    ];

    for (const selector of availabilitySelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const availability = element.text().trim();
        if (availability && availability.length > 0 && availability.length < 100) {
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
      'img[src]', '.product-image img', '.product-photo img',
      '[class*="image"] img', '[class*="photo"] img'
    ];

    for (const selector of imageSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const src = element.attr('src');
        if (src && src.startsWith('http')) {
          return src;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
