import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { material_type, price } = await request.json();
    
    console.log('=== UPDATE MATERIAL PRICE API ===');
    console.log('Received data:', { material_type, price });
    console.log('Price type:', typeof price);

    if (!material_type || typeof price !== 'number') {
      console.log('Validation failed:', { material_type, price, priceType: typeof price });
      return NextResponse.json(
        { error: 'Material type and a valid price are required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    console.log('Admin client created');

    // Önce mevcut kaydı kontrol et
    console.log('Checking existing record for:', material_type);
    const { data: existing, error: checkError } = await adminSupabase
      .from('material_prices')
      .select('*')
      .eq('material_type', material_type)
      .maybeSingle();
    
    console.log('Existing record check result:', { existing, checkError });

    if (existing) {
      // Güncelle
      console.log('Updating existing record...');
      console.log('Existing record:', existing);
      
      const { data, error } = await adminSupabase
        .from('material_prices')
        .update({
          unit_price: price,
          updated_at: new Date().toISOString(),
        })
        .eq('material_type', material_type)
        .select('*');

      console.log('Update operation result:', { data, error });
      
      // Eğer data boşsa, tekrar kontrol et
      if (!data || data.length === 0) {
        console.log('No data returned from update, checking if record exists...');
        const { data: checkData, error: checkError } = await adminSupabase
          .from('material_prices')
          .select('*')
          .eq('material_type', material_type);
        
        console.log('Post-update check:', { checkData, checkError });
      }

      if (error) {
        console.error('Error updating material price:', error);
        return NextResponse.json(
          { error: `Error updating material price: ${error.message}` },
          { status: 500 }
        );
      }

      console.log('Update successful:', { data, material_type, price });
      const resultData = data?.[0] || data;
      console.log('Final result data:', resultData);
      return NextResponse.json({ 
        success: true, 
        action: 'updated',
        data: resultData,
        debug: { originalData: data, material_type, price },
        unit_price: price
      });
    } else {
      // Yeni kayıt ekle
      console.log('Inserting new record...');
      const { data, error } = await adminSupabase
        .from('material_prices')
        .insert({
          material_type,
          unit_price: price,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*');

      console.log('Insert operation result:', { data, error });

      if (error) {
        console.error('Error inserting material price:', error);
        return NextResponse.json(
          { error: `Error inserting material price: ${error.message}` },
          { status: 500 }
        );
      }

      console.log('Insert successful:', { data, material_type, price });
      const resultData = data?.[0] || data;
      console.log('Final result data:', resultData);
      return NextResponse.json({
        success: true,
        action: 'inserted',
        data: resultData,
        debug: { originalData: data, material_type, price },
        unit_price: price
      });
    }
  } catch (error) {
    console.error('Update material price API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
