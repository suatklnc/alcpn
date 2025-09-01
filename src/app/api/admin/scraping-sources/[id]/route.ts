import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateScrapingSourceRequest } from '@/types/admin';

// GET /api/admin/scraping-sources/[id] - Tek scraping source getir
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

    const { data: source, error } = await supabase
      .from('scraping_sources')
      .select('*')
      .eq('id', (await params).id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Scraping source not found' }, { status: 404 });
      }
      console.error('Error fetching scraping source:', error);
      return NextResponse.json({ error: 'Failed to fetch scraping source' }, { status: 500 });
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error('Get scraping source API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/scraping-sources/[id] - Scraping source güncelle
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

    const body: UpdateScrapingSourceRequest = await request.json();

    // Validation
    if (body.selectors && !body.selectors.price) {
      return NextResponse.json(
        { error: 'selectors.price is required when updating selectors' },
        { status: 400 }
      );
    }

    // Update data hazırla
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.base_url !== undefined) updateData.base_url = body.base_url;
    if (body.selectors !== undefined) updateData.selectors = body.selectors;
    if (body.wait_for_selector !== undefined) updateData.wait_for_selector = body.wait_for_selector;
    if (body.custom_headers !== undefined) updateData.custom_headers = body.custom_headers;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data: source, error } = await supabase
      .from('scraping_sources')
      .update(updateData)
      .eq('id', (await params).id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Scraping source not found' }, { status: 404 });
      }
      console.error('Error updating scraping source:', error);
      return NextResponse.json({ error: 'Failed to update scraping source' }, { status: 500 });
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error('Update scraping source API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/scraping-sources/[id] - Scraping source sil
export async function DELETE(
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

    // Önce bu source'a bağlı custom URL'ler var mı kontrol et
    const { data: customUrls, error: checkError } = await supabase
      .from('custom_scraping_urls')
      .select('id')
      .eq('source_id', (await params).id)
      .limit(1);

    if (checkError) {
      console.error('Error checking custom URLs:', checkError);
      return NextResponse.json({ error: 'Failed to check dependencies' }, { status: 500 });
    }

    if (customUrls && customUrls.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete scraping source with associated custom URLs' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('scraping_sources')
      .delete()
      .eq('id', (await params).id);

    if (error) {
      console.error('Error deleting scraping source:', error);
      return NextResponse.json({ error: 'Failed to delete scraping source' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Scraping source deleted successfully' });
  } catch (error) {
    console.error('Delete scraping source API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
