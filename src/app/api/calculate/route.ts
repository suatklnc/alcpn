import { NextRequest, NextResponse } from 'next/server';
import { CalculationEngine } from '@/lib/calculation-engine';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Geçici olarak development için authentication'ı devre dışı bırak
    // TODO: Production'da gerçek authentication kullan
    const userId = 'dev-user-123'; // Development için sabit user ID

    const body = await request.json();
    
    const { 
      jobType, 
      subType, 
      area, 
      customPrices = {},
      selectedMaterials = []
    } = body;

    // Validation
    if (!jobType || !subType || !area || area <= 0) {
      return NextResponse.json(
        { error: 'jobType, subType, and positive area are required' },
        { status: 400 }
      );
    }

    // Malzeme hesaplaması yap (static method)
    const result = CalculationEngine.calculateMultipleMaterials(
      jobType,
      subType,
      area,
      customPrices,
      selectedMaterials
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Calculation failed', details: result.error },
        { status: 500 }
      );
    }

    // Supabase'e bağlan
    const adminSupabase = createAdminClient();

                    // Hesaplama sonucunu database'e kaydet
                const { data: savedCalculation, error: saveError } = await adminSupabase
                  .from('calculation_history')
                  .insert({
                    user_id: userId,
                    job_type: jobType,
                    sub_type: subType,
                    area: area,
                    custom_prices: customPrices,
                    calculation_result: result.data!,
                    total_cost: result.data!.totalCost,
                    created_at: new Date().toISOString(),
                  })
                  .select()
                  .single();

    if (saveError) {
      console.error('Error saving calculation:', saveError);
      // Hesaplama başarılı ama kaydetme başarısız - sadece log
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      calculationId: savedCalculation?.id,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Calculation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
