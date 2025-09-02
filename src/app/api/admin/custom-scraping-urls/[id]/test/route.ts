import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'URL ID is required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Get URL details
    const { data: urlData, error: fetchError } = await adminSupabase
      .from('custom_scraping_urls')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !urlData) {
      return NextResponse.json(
        { error: 'URL not found' },
        { status: 404 }
      );
    }

    // Test the URL
    try {
      const response = await fetch(urlData.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000, // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Simple price extraction (you might want to use a more sophisticated parser)
      const priceMatch = html.match(/(\d+(?:[.,]\d+)?)\s*(?:TL|₺|lira)/i);
      
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(',', '.'));
        
        // Update last_tested_at
        await adminSupabase
          .from('custom_scraping_urls')
          .update({ 
            last_tested_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        return NextResponse.json({
          success: true,
          price,
          message: `Fiyat bulundu: ${price} TL`,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Fiyat bulunamadı',
        });
      }

    } catch (testError) {
      console.error('URL test error:', testError);
      
      // Update last_tested_at even on failure
      await adminSupabase
        .from('custom_scraping_urls')
        .update({ 
          last_tested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({
        success: false,
        error: testError instanceof Error ? testError.message : 'Bilinmeyen hata',
      });
    }

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
