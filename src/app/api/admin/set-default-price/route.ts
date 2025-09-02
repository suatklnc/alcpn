import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { material_type, price } = await request.json();

    if (!material_type || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'Material type and a valid price are required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Önce mevcut kaydı kontrol et
    const { data: existing } = await adminSupabase
      .from('material_prices')
      .select('*')
      .eq('material_type', material_type)
      .maybeSingle();

    if (existing) {
      // Güncelle
      const { data, error } = await adminSupabase
        .from('material_prices')
        .update({
          unit_price: price,
          updated_at: new Date().toISOString(),
        })
        .eq('material_type', material_type)
        .select('*');

      if (error) {
        console.error('Error updating material price:', error);
        return NextResponse.json(
          { error: `Error updating material price: ${error.message}` },
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
      const { data, error } = await adminSupabase
        .from('material_prices')
        .insert({
          material_type,
          unit_price: price,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*');

      if (error) {
        console.error('Error inserting material price:', error);
        return NextResponse.json(
          { error: `Error inserting material price: ${error.message}` },
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
    console.error('Set default price API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
