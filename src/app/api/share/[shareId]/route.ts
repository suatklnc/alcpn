import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/share/[shareId] - Get shared calculation by share ID (public access)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    
    const supabase = createAdminClient();
    
    // Paylaşılan hesaplamayı getir (sadece is_shared = true olanlar)
    const { data: calculation, error } = await supabase
      .from('calculation_history')
      .select('*')
      .eq('share_id', shareId)
      .eq('is_shared', true)
      .single();

    if (error || !calculation) {
      return NextResponse.json(
        { error: 'Shared calculation not found or no longer available' },
        { status: 404 }
      );
    }

    // Hassas bilgileri kaldır (user_id gibi)
    const publicCalculation = {
      id: calculation.id,
      shareId: calculation.share_id,
      jobType: calculation.job_type,
      subType: calculation.sub_type,
      area: calculation.area,
      customPrices: calculation.custom_prices,
      calculationResult: calculation.calculation_result,
      totalCost: calculation.total_cost,
      createdAt: calculation.created_at,
      sharedAt: calculation.shared_at
    };

    return NextResponse.json({
      success: true,
      calculation: publicCalculation
    });

  } catch (error) {
    console.error('Get shared calculation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
