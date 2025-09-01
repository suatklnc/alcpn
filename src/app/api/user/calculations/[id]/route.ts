import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/user/calculations/[id] - Belirli bir hesaplamanın detaylarını getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // TODO: Gerçek authentication ile user ID al
    const userId = 'anonymous'; // Şimdilik development için
    
    const supabase = createAdminClient();
    
    // Hesaplama detaylarını getir
    const { data: calculation, error } = await supabase
      .from('calculation_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json(
          { error: 'Hesaplama bulunamadı' },
          { status: 404 }
        );
      }
      
      console.error('Error fetching calculation:', error);
      return NextResponse.json(
        { error: 'Hesaplama detayları alınamadı' },
        { status: 500 }
      );
    }

    return NextResponse.json({ calculation });
  } catch (error) {
    console.error('Get calculation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/calculations/[id] - Hesaplamayı sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // TODO: Gerçek authentication ile user ID al
    const userId = 'anonymous'; // Şimdilik development için
    
    const supabase = createAdminClient();
    
    // Önce hesaplamanın kullanıcıya ait olup olmadığını kontrol et
    const { data: existingCalculation, error: checkError } = await supabase
      .from('calculation_history')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingCalculation) {
      return NextResponse.json(
        { error: 'Hesaplama bulunamadı veya erişim izniniz yok' },
        { status: 404 }
      );
    }

    // Hesaplamayı sil
    const { error: deleteError } = await supabase
      .from('calculation_history')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting calculation:', deleteError);
      return NextResponse.json(
        { error: 'Hesaplama silinemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Hesaplama başarıyla silindi' 
    });
  } catch (error) {
    console.error('Delete calculation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
