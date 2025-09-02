import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/user/calculations/[id] - Belirli bir hesaplamanın detaylarını getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Geçici olarak development için authentication'ı devre dışı bırak
    // TODO: Production'da gerçek authentication kullan
    const userId = 'dev-user-123'; // Development için sabit user ID
    
    const adminSupabase = createAdminClient();
    
    // Hesaplama detaylarını getir
    const { data: calculation, error } = await adminSupabase
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
    
    // Geçici olarak development için authentication'ı devre dışı bırak
    // TODO: Production'da gerçek authentication kullan
    const userId = 'dev-user-123'; // Development için sabit user ID
    
    const adminSupabase = createAdminClient();
    
    // Önce hesaplamanın kullanıcıya ait olup olmadığını kontrol et
    const { data: existingCalculation, error: checkError } = await adminSupabase
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
    const { error: deleteError } = await adminSupabase
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
