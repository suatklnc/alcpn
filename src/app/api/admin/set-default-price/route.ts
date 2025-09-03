import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { material_type, price } = await request.json();
    
    console.log('=== SET DEFAULT PRICE API ===');
    console.log('Received data:', { material_type, price });

    if (!material_type || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'Material type and a valid price are required' },
        { status: 400 }
      );
    }

    // Doğrudan Supabase client kullan (RLS bypass)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Direct Supabase client created');

    // Önce tablo yapısını kontrol et
    const { data: tableInfo, error: tableError } = await supabase
      .from('material_prices')
      .select('*')
      .limit(1);
    
    console.log('Table structure check:', { tableInfo, tableError });

    // Material prices tablosunu güncelle
    const { data, error } = await supabase
      .from('material_prices')
      .upsert({
        material_type: material_type,
        unit_price: price,
        source: 'manual',
      })
      .select('*');

    console.log('Upsert result:', { data, error });

    if (error) {
      console.error('Upsert error:', error);
      return NextResponse.json(
        { error: `Failed to set default price: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action: 'set_default',
      data: data?.[0] || data,
      unit_price: price
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
