import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/material-prices - Tüm malzeme fiyatlarını getir
export async function GET() {
  try {
    const supabase = createAdminClient();
    
    const { data: prices, error } = await supabase
      .from('material_prices')
      .select('*')
      .eq('is_active', true)
      .order('material_name');

    if (error) {
      console.error('Error fetching material prices:', error);
      return NextResponse.json({ error: 'Failed to fetch material prices' }, { status: 500 });
    }

    return NextResponse.json({ prices });
  } catch (error) {
    console.error('Material prices API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/material-prices - Yeni malzeme fiyatı ekle veya güncelle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { material_name, unit_price, unit = 'm2', source = 'manual' } = body;

    // Validation
    if (!material_name || unit_price === undefined || unit_price < 0) {
      return NextResponse.json(
        { error: 'material_name and positive unit_price are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Upsert (insert or update) malzeme fiyatı
    const { data: price, error } = await supabase
      .from('material_prices')
      .upsert({
        material_name,
        unit_price,
        unit,
        source,
        last_updated: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'material_name'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting material price:', error);
      return NextResponse.json({ error: 'Failed to save material price' }, { status: 500 });
    }

    return NextResponse.json({ price }, { status: 201 });
  } catch (error) {
    console.error('Create material price API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
