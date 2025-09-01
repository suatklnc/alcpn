import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/user/calculations/[id]/share - Generate share link for a calculation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // TODO: Gerçek authentication ile user ID al
    const userId = 'anonymous'; // Şimdilik development için
    
    const supabase = createAdminClient();
    
    // Önce hesaplamanın kullanıcıya ait olduğunu kontrol et
    const { data: calculation, error: fetchError } = await supabase
      .from('calculation_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !calculation) {
      return NextResponse.json(
        { error: 'Calculation not found or access denied' },
        { status: 404 }
      );
    }

    // Eğer zaten paylaşılmışsa mevcut share_id'yi döndür
    if (calculation.is_shared && calculation.share_id) {
      return NextResponse.json({
        success: true,
        shareId: calculation.share_id,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${calculation.share_id}`,
        isAlreadyShared: true
      });
    }

    // Yeni share_id oluştur ve paylaşımı aktif et
    const { data: updatedCalculation, error: updateError } = await supabase
      .from('calculation_history')
      .update({
        is_shared: true,
        shared_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('share_id')
      .single();

    if (updateError || !updatedCalculation) {
      console.error('Error updating calculation for sharing:', updateError);
      return NextResponse.json(
        { error: 'Failed to create share link' },
        { status: 500 }
      );
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${updatedCalculation.share_id}`;

    return NextResponse.json({
      success: true,
      shareId: updatedCalculation.share_id,
      shareUrl,
      isAlreadyShared: false
    });

  } catch (error) {
    console.error('Share calculation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/calculations/[id]/share - Remove share link for a calculation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // TODO: Gerçek authentication ile user ID al
    const userId = 'anonymous'; // Şimdilik development için
    
    const supabase = createAdminClient();
    
    // Paylaşımı kaldır
    const { error: updateError } = await supabase
      .from('calculation_history')
      .update({
        is_shared: false,
        shared_at: null
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error removing share:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove share link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Share link removed successfully'
    });

  } catch (error) {
    console.error('Remove share API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
