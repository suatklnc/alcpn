import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { data: allActiveUrls, error: allUrlsError } = await supabase
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
        
        console.log(`Scraping result for ${urlData.material_type}:`, scrapingResult);

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
        
        console.log(`Scraping result for ${urlData.material_type}:`, scrapingResult);

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
