import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Test endpoint - Supabase bağlantısını test et
export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    
    // Service role client oluştur
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase credentials',
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test 1: URL'leri çek
    console.log('Test 1: Fetching URLs...');
    const { data: urls, error: urlError } = await supabase
      .from('custom_scraping_urls')
      .select('id, url, material_type')
      .eq('auto_scraping_enabled', true)
      .eq('is_active', true)
      .limit(1);
    
    if (urlError) {
      console.error('URL fetch error:', urlError);
      return NextResponse.json({ 
        error: 'URL fetch failed',
        details: urlError
      }, { status: 500 });
    }
    
    if (!urls || urls.length === 0) {
      return NextResponse.json({ 
        message: 'No URLs found',
        urls: []
      });
    }
    
    const urlData = urls[0];
    console.log('Found URL:', urlData);
    
    // Test 2: Scraping history'ye yaz
    console.log('Test 2: Writing to scraping_history...');
    const { error: historyError } = await supabase
      .from('scraping_history')
      .insert({
        url_id: urlData.id,
        price: 99.99,
        title: 'Test Title',
        availability: 'Test Availability',
        image_url: 'https://example.com/test.jpg',
        success: true,
        error_message: null,
        response_time_ms: 1000,
        scraped_at: new Date().toISOString(),
      });
    
    if (historyError) {
      console.error('History write error:', historyError);
      return NextResponse.json({ 
        error: 'History write failed',
        details: historyError
      }, { status: 500 });
    }
    
    // Test 3: Material prices'e yaz
    console.log('Test 3: Writing to material_prices...');
    const { error: priceError } = await supabase
      .from('material_prices')
      .upsert({
        material_type: urlData.material_type,
        unit_price: 99.99,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'material_type'
      });
    
    if (priceError) {
      console.error('Price write error:', priceError);
      return NextResponse.json({ 
        error: 'Price write failed',
        details: priceError
      }, { status: 500 });
    }
    
    // Test 4: URL'yi güncelle
    console.log('Test 4: Updating URL...');
    const { error: updateError } = await supabase
      .from('custom_scraping_urls')
      .update({
        last_auto_scraped_at: new Date().toISOString(),
        next_auto_scrape_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', urlData.id);
    
    if (updateError) {
      console.error('URL update error:', updateError);
      return NextResponse.json({ 
        error: 'URL update failed',
        details: updateError
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'All tests passed!',
      urlData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
