import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('material_prices')
      .select('material_type, unit_price')
      .order('material_type');

    if (error) {
      console.error('Error fetching material prices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch material prices' },
        { status: 500 }
      );
    }

    // Convert array to object for easy lookup
    const pricesMap = data.reduce((acc, item) => {
      acc[item.material_type] = item.unit_price;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json(pricesMap);
  } catch (error) {
    console.error('Material prices API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}