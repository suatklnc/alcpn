import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateCustomScrapingUrlRequest } from '@/types/admin';

// GET /api/admin/custom-scraping-urls/[id] - Tek custom scraping URL getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Admin kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { data: url, error } = await supabase
      .from('custom_scraping_urls')
      .select(`
        *,
        source:scraping_sources(*)
      `)
      .eq('id', (await params).id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Custom scraping URL not found' }, { status: 404 });
      }
      console.error('Error fetching custom scraping URL:', error);
      return NextResponse.json({ error: 'Failed to fetch custom scraping URL' }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Get custom scraping URL API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/custom-scraping-urls/[id] - Custom scraping URL güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Admin kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body: UpdateCustomScrapingUrlRequest = await request.json();

    // URL validation
    if (body.url) {
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    // Source validation
    if (body.source_id) {
      const { data: source, error: sourceError } = await supabase
        .from('scraping_sources')
        .select('id')
        .eq('id', body.source_id)
        .single();

      if (sourceError || !source) {
        return NextResponse.json(
          { error: 'Scraping source not found' },
          { status: 400 }
        );
      }
    }

    // Update data hazırla
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.material_type !== undefined) updateData.material_type = body.material_type;
    if (body.source_id !== undefined) updateData.source_id = body.source_id;
    if (body.custom_selectors !== undefined) updateData.custom_selectors = body.custom_selectors;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data: url, error } = await supabase
      .from('custom_scraping_urls')
      .update(updateData)
      .eq('id', (await params).id)
      .select(`
        *,
        source:scraping_sources(*)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Custom scraping URL not found' }, { status: 404 });
      }
      console.error('Error updating custom scraping URL:', error);
      return NextResponse.json({ error: 'Failed to update custom scraping URL' }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Update custom scraping URL API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/custom-scraping-urls/[id] - Custom scraping URL sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Geçici olarak development için authentication'ı devre dışı bırak
    // TODO: Production'da gerçek authentication kullan
    const supabase = await createClient();

    const { error } = await supabase
      .from('custom_scraping_urls')
      .delete()
      .eq('id', (await params).id);

    if (error) {
      console.error('Error deleting custom scraping URL:', error);
      return NextResponse.json({ error: 'Failed to delete custom scraping URL' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Custom scraping URL deleted successfully' });
  } catch (error) {
    console.error('Delete custom scraping URL API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
