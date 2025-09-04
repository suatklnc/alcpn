import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // Service role client oluştur
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const tests = {
      connection: false,
      material_prices_read: false,
      material_prices_write: false,
      scraping_history_read: false,
      scraping_history_write: false,
      custom_scraping_urls_read: false,
      custom_scraping_urls_write: false,
      errors: [] as string[]
    };

    try {
      // Bağlantı testi
      const { data: connectionTest, error: connectionError } = await supabase
        .from('material_prices')
        .select('count')
        .limit(1);
      
      if (connectionError) {
        tests.errors.push(`Connection error: ${connectionError.message}`);
      } else {
        tests.connection = true;
      }

      // material_prices okuma testi
      const { data: mpRead, error: mpReadError } = await supabase
        .from('material_prices')
        .select('id, material_type, unit_price')
        .limit(1);
      
      if (mpReadError) {
        tests.errors.push(`material_prices read error: ${mpReadError.message}`);
      } else {
        tests.material_prices_read = true;
      }

      // material_prices yazma testi (mevcut kaydı güncelle)
      if (mpRead && mpRead.length > 0) {
        const { data: mpWrite, error: mpWriteError } = await supabase
          .from('material_prices')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', mpRead[0].id)
          .select();
        
        if (mpWriteError) {
          tests.errors.push(`material_prices write error: ${mpWriteError.message}`);
        } else {
          tests.material_prices_write = true;
        }
      }

      // custom_scraping_urls okuma testi
      const { data: cuRead, error: cuReadError } = await supabase
        .from('custom_scraping_urls')
        .select('id, url, material_type')
        .limit(1);
      
      if (cuReadError) {
        tests.errors.push(`custom_scraping_urls read error: ${cuReadError.message}`);
      } else {
        tests.custom_scraping_urls_read = true;
      }

      // scraping_history okuma testi
      const { data: shRead, error: shReadError } = await supabase
        .from('scraping_history')
        .select('id, url_id, price')
        .limit(1);
      
      if (shReadError) {
        tests.errors.push(`scraping_history read error: ${shReadError.message}`);
      } else {
        tests.scraping_history_read = true;
      }

      // scraping_history yazma testi
      const { data: shWrite, error: shWriteError } = await supabase
        .from('scraping_history')
        .insert({
          url_id: cuRead && cuRead.length > 0 ? cuRead[0].id : '00000000-0000-0000-0000-000000000000',
          price: 999.99,
          title: 'Test',
          availability: 'Test',
          image_url: 'https://example.com/test.jpg',
          success: true,
          error_message: null,
          response_time_ms: 100,
          scraped_at: new Date().toISOString(),
        })
        .select();
      
      if (shWriteError) {
        tests.errors.push(`scraping_history write error: ${shWriteError.message}`);
      } else {
        tests.scraping_history_write = true;
        // Test kaydını sil
        if (shWrite && shWrite.length > 0) {
          await supabase
            .from('scraping_history')
            .delete()
            .eq('id', shWrite[0].id);
        }
      }

    } catch (error) {
      tests.errors.push(`General error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return NextResponse.json({
      status: 'completed',
      message: 'Supabase permissions test completed',
      tests,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to test Supabase permissions',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
