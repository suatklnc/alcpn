import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// GET /api/user/calculations - Kullanıcının hesaplama geçmişini getir
export async function GET() {
  try {
    // Gerçek authentication kontrolü
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const adminSupabase = createAdminClient();
    
    // Kullanıcının hesaplama geçmişini getir
    const { data: calculations, error } = await adminSupabase
      .from('calculation_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user calculations:', error);
      return NextResponse.json({ error: 'Failed to fetch calculations' }, { status: 500 });
    }

    return NextResponse.json({ calculations });
  } catch (error) {
    console.error('User calculations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user/calculations - Yeni hesaplama kaydet (mevcut /api/calculate ile entegre)
export async function POST(request: NextRequest) {
  try {
    // Gerçek authentication kontrolü
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const { 
      jobType, 
      subType, 
      area, 
      customPrices = {}
    } = body;

    // Validation
    if (!jobType || !subType || !area || area <= 0) {
      return NextResponse.json(
        { error: 'jobType, subType, and positive area are required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Hesaplama sonucunu database'e kaydet
    const { data: savedCalculation, error: saveError } = await adminSupabase
      .from('calculation_history')
      .insert({
        user_id: user.id,
        job_type: jobType,
        sub_type: subType,
        area: area,
        custom_prices: customPrices,
        calculation_result: body.calculationResult || {},
        total_cost: body.totalCost || 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving calculation:', saveError);
      return NextResponse.json({ error: 'Failed to save calculation' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      calculation: savedCalculation 
    }, { status: 201 });
  } catch (error) {
    console.error('Save calculation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
