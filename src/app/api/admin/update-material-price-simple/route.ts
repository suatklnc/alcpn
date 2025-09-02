import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { material_type, price } = await request.json();
    
    console.log('=== SIMPLE UPDATE MATERIAL PRICE API ===');
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

    // Önce mevcut kaydı kontrol et
    const { data: existing, error: checkError } = await supabase
      .from('material_prices')
      .select('*')
      .eq('material_type', material_type)
      .maybeSingle();
    
    console.log('Existing record check:', { existing, checkError });

    if (existing) {
      // Güncelle
      console.log('Updating existing record...');
      const { data, error } = await supabase
        .from('material_prices')
        .update({
          unit_price: price,
          updated_at: new Date().toISOString(),
        })
        .eq('material_type', material_type)
        .select('*');

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Update error:', error);
        return NextResponse.json(
          { error: `Update failed: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        data: data?.[0] || data,
        unit_price: price
      });
    } else {
      // Yeni kayıt ekle
      console.log('Inserting new record...');
      const { data, error } = await supabase
        .from('material_prices')
        .insert({
          material_type,
          unit_price: price,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*');

      console.log('Insert result:', { data, error });

      if (error) {
        console.error('Insert error:', error);
        return NextResponse.json(
          { error: `Insert failed: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'inserted',
        data: data?.[0] || data,
        unit_price: price
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
