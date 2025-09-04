import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { url, selector } = body;
    
    console.log('Test scraping endpoint called with:', { url, selector });

    if (!url || !selector) {
      return NextResponse.json(
        { 
          success: false,
          error: 'URL ve CSS selector alanları zorunludur' 
        },
        { status: 400 }
      );
    }

    // URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Geçersiz URL formatı'
      });
    }

    // Test the URL with proxy fallback
    try {
      let html: string;
      
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
        
        html = await response.text();
        
      } catch (directFetchError) {
        console.log('Direct fetch failed, trying proxy:', directFetchError);
        
        // Proxy kullan
        const proxyResponse = await fetch(`${request.nextUrl.origin}/api/proxy/fetch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url })
        });
        
        console.log('Proxy response status:', proxyResponse.status);
        
        const proxyResult = await proxyResponse.json();
        console.log('Proxy result:', proxyResult);
        
        if (!proxyResult.success) {
          throw new Error(`Proxy fetch failed: ${proxyResult.error}`);
        }
        
        html = proxyResult.data.html;
      }
      const responseTime = Date.now() - startTime;
      
      // Parse HTML with Cheerio
      const $ = cheerio.load(html);
      const extractedData: Record<string, unknown> = {};
      
      try {
        // Extract price using the provided selector
        const priceMatch = extractPriceWithCheerio($ as cheerio.CheerioAPI, selector);
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

      } catch (parseError) {
        console.error('HTML parsing error:', parseError);
      }

      if (extractedData.price) {
        // Enhanced debug for successful cases too
        const debugInfo = {
          totalElements: $('*').length,
          priceElements: $('[class*="price"], [id*="price"], [data-price]').length,
          metaTags: $('meta[property*="price"], meta[name*="price"]').length,
          jsonLdScripts: $('script[type="application/ld+json"]').length,
          selectorAttempts: [] as Array<{
            selector: string;
            elementsFound: number;
            textContent: string[];
            extractedPrice: number | null;
          }>,
          commonSelectors: {
            '.price': $('.price').length,
            '.product-price': $('.product-price').length,
            '.current-price': $('.current-price').length,
            '[data-price]': $('[data-price]').length,
            '[class*="price"]': $('[class*="price"]').length,
          },
          metaTagPrices: [] as string[],
          jsonLdPrices: [] as string[],
          commonSelectorResults: [] as Array<{
            selector: string;
            elementsFound: number;
            textContent: string[];
            extractedPrice: number | null;
          }>
        };

        // Try the provided selector first and log details
        const providedSelectors = selector.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        for (const singleSelector of providedSelectors) {
          const elements = $(singleSelector);
          const textContents = elements.map((i, el) => $(el).text().trim()).get();
          const extractedPrice = extractPriceFromText(textContents.join(' '));
          
          debugInfo.selectorAttempts.push({
            selector: singleSelector,
            elementsFound: elements.length,
            textContent: textContents,
            extractedPrice: extractedPrice
          });
        }

        // Try common price selectors and log details
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
          
          debugInfo.commonSelectorResults.push({
            selector: commonSelector,
            elementsFound: elements.length,
            textContent: textContents,
            extractedPrice: extractedPrice
          });
        }

        // Try meta tags
        const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                         $('meta[name="price"]').attr('content') ||
                         $('meta[property="og:price:amount"]').attr('content') ||
                         $('meta[property="product:price"]').attr('content') ||
                         $('meta[name="twitter:data1"]').attr('content');
        
        if (metaPrice) {
          debugInfo.metaTagPrices.push(metaPrice);
        }

        // Try JSON-LD
        const jsonLdScripts = $('script[type="application/ld+json"]');
        for (let i = 0; i < jsonLdScripts.length; i++) {
          try {
            const jsonText = $(jsonLdScripts[i]).html();
            if (jsonText) {
              const jsonData = JSON.parse(jsonText);
              const price = extractPriceFromJsonLd(jsonData);
              if (price) {
                debugInfo.jsonLdPrices.push(JSON.stringify(jsonData));
              }
            }
          } catch { /* Ignore JSON parsing errors */ }
        }

        return NextResponse.json({
          success: true,
          data: extractedData,
          response_time_ms: responseTime,
          message: `Fiyat başarıyla çekildi: ₺${extractedData.price}`,
          debug_info: debugInfo
        });
      } else {
        // Enhanced debug: Try to find what selectors exist on the page
        const debugInfo = {
          totalElements: $('*').length,
          priceElements: $('[class*="price"], [id*="price"], [data-price]').length,
          metaTags: $('meta[property*="price"], meta[name*="price"]').length,
          jsonLdScripts: $('script[type="application/ld+json"]').length,
          selectorAttempts: [] as Array<{
            selector: string;
            elementsFound: number;
            textContent: string[];
            extractedPrice: number | null;
          }>,
          commonSelectors: {
            '.price': $('.price').length,
            '.product-price': $('.product-price').length,
            '.current-price': $('.current-price').length,
            '[data-price]': $('[data-price]').length,
            '[class*="price"]': $('[class*="price"]').length,
          },
          metaTagPrices: [] as string[],
          jsonLdPrices: [] as string[],
          commonSelectorResults: [] as Array<{
            selector: string;
            elementsFound: number;
            textContent: string[];
            extractedPrice: number | null;
          }>
        };

        // Try the provided selector first and log details
        const providedSelectors = selector.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        for (const singleSelector of providedSelectors) {
          const elements = $(singleSelector);
          const textContents = elements.map((i, el) => $(el).text().trim()).get();
          const extractedPrice = extractPriceFromText(textContents.join(' '));
          
          debugInfo.selectorAttempts.push({
            selector: singleSelector,
            elementsFound: elements.length,
            textContent: textContents,
            extractedPrice: extractedPrice
          });
        }

        // Try common price selectors and log details
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
          
          debugInfo.commonSelectorResults.push({
            selector: commonSelector,
            elementsFound: elements.length,
            textContent: textContents,
            extractedPrice: extractedPrice
          });
        }

        // Try meta tags
        const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                         $('meta[name="price"]').attr('content') ||
                         $('meta[property="og:price:amount"]').attr('content') ||
                         $('meta[property="product:price"]').attr('content') ||
                         $('meta[name="twitter:data1"]').attr('content');
        
        if (metaPrice) {
          debugInfo.metaTagPrices.push(metaPrice);
        }

        // Try JSON-LD
        const jsonLdScripts = $('script[type="application/ld+json"]');
        for (let i = 0; i < jsonLdScripts.length; i++) {
          try {
            const jsonText = $(jsonLdScripts[i]).html();
            if (jsonText) {
              const jsonData = JSON.parse(jsonText);
              const price = extractPriceFromJsonLd(jsonData);
              if (price) {
                debugInfo.jsonLdPrices.push(JSON.stringify(jsonData));
              }
            }
          } catch { /* Ignore JSON parsing errors */ }
        }

        return NextResponse.json({
          success: false,
          error: 'Belirtilen CSS selector ile fiyat bulunamadı. Selector\'ı kontrol edin.',
          response_time_ms: responseTime,
          html_preview: html.substring(0, 1000) + '...', // First 1000 chars for debugging
          debug_info: debugInfo,
        });
      }

    } catch (testError) {
      console.error('URL test error:', testError);
      
      // Daha detaylı hata mesajı
      let errorMessage = 'Bilinmeyen hata oluştu';
      if (testError instanceof Error) {
        errorMessage = testError.message;
        
        // Fetch hatalarını daha açıklayıcı hale getir
        if (testError.message.includes('fetch failed')) {
          errorMessage = `URL'ye erişilemiyor (fetch failed). Railway network kısıtlaması olabilir. Orijinal hata: ${testError.message}`;
        } else if (testError.message.includes('timeout')) {
          errorMessage = 'URL yanıt vermiyor (timeout).';
        } else if (testError.message.includes('ENOTFOUND')) {
          errorMessage = 'URL bulunamadı (DNS hatası).';
        } else if (testError.message.includes('ECONNREFUSED')) {
          errorMessage = 'Bağlantı reddedildi. URL erişilebilir değil.';
        } else if (testError.message.includes('AbortError')) {
          errorMessage = 'İstek zaman aşımına uğradı (10 saniye).';
        } else if (testError.message.includes('TypeError')) {
          errorMessage = `Network hatası: ${testError.message}`;
        }
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        response_time_ms: Date.now() - startTime,
        debug_info: {
          url: url,
          error_type: testError instanceof Error ? testError.constructor.name : 'Unknown',
          error_message: testError instanceof Error ? testError.message : String(testError)
        }
      });
    }

  } catch (error) {
    console.error('Test scraping API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Sunucu hatası oluştu' 
      },
      { status: 500 }
    );
  }
}

// Helper functions for HTML parsing with Cheerio
function extractPriceWithCheerio($: cheerio.CheerioAPI, selector: string): number | null {
  try {
    // Multiple selectors support - split by comma and try each one
    const selectors = selector.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const singleSelector of selectors) {
      const priceElement = $(singleSelector);
      if (priceElement.length > 0) {
        const priceText = priceElement.text().trim();
        const price = extractPriceFromText(priceText);
        if (price) return price;
      }
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

function extractPriceFromText(text: string): number | null {
  try {
    // Turkish price patterns - more comprehensive
    const pricePatterns = [
      // Turkish currency patterns
      /(\d+(?:[.,]\d+)?)\s*(?:TL|₺|lira|Lira)/gi,
      /(?:fiyat|price|cost|maliyet)[:\s]*(\d+(?:[.,]\d+)?)/gi,
      /(\d+(?:[.,]\d+)?)\s*(?:₺|TL|lira)/gi,
      /(?:₺|TL)\s*(\d+(?:[.,]\d+)?)/gi,
      
      // Price with separators
      /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:TL|₺)/gi,
      /(\d+(?:[.,]\d+)?)\s*(?:TL|₺|lira)/gi,
      
      // Just numbers (be more careful with this)
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
            // Reasonable price range check (0.01 to 100000)
            if (price > 0.01 && price < 100000) {
              foundPrices.push(price);
            }
          }
        }
      }
    }

    // Return the most likely price (usually the first reasonable one)
    if (foundPrices.length > 0) {
      // Sort by likelihood (prefer prices that look like real product prices)
      foundPrices.sort((a, b) => {
        // Prefer prices between 1-1000 TL (common product range)
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

function extractTitleWithCheerio($: cheerio.CheerioAPI): string | null {
  try {
    // Try different title selectors
    const titleSelectors = [
      'title',
      'h1',
      'h2',
      '.product-title',
      '.product-name',
      '[data-testid*="title"]',
      '[class*="title"]',
      '.name',
      '.heading'
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

    // Try to find availability in text content
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
      '.product-image img',
      '.product-photo img',
      '.main-image img',
      '[data-testid*="image"] img',
      '.gallery img',
      '.slider img'
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

    // Try meta tags for images
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