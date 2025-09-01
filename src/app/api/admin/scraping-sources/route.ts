import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateScrapingSourceRequest } from '@/types/admin';

// GET /api/admin/scraping-sources - Tüm scraping sources'ları getir
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Admin kontrolü - şimdilik geçici olarak devre dışı
    // TODO: Production'da authentication aktif et
    /*
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    */

    // Scraping sources'ları getir
    const { data: sources, error } = await supabase
      .from('scraping_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scraping sources:', error);
      return NextResponse.json({ error: 'Failed to fetch scraping sources' }, { status: 500 });
    }

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Scraping sources API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/scraping-sources - Yeni scraping source oluştur
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Admin kontrolü - şimdilik geçici olarak devre dışı
    // TODO: Production'da authentication aktif et
    /*
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    */

    const body: CreateScrapingSourceRequest = await request.json();

    // Validation
    if (!body.name || !body.base_url || !body.selectors?.price) {
      return NextResponse.json(
        { error: 'Name, base_url, and selectors.price are required' },
        { status: 400 }
      );
    }

    // Yeni scraping source oluştur
    const { data: source, error } = await supabase
      .from('scraping_sources')
      .insert({
        name: body.name,
        base_url: body.base_url,
        selectors: body.selectors,
        wait_for_selector: body.wait_for_selector,
        custom_headers: body.custom_headers || {},
        is_active: body.is_active ?? true,
        created_by: 'admin-dev', // TODO: Production'da gerçek user ID kullan
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating scraping source:', error);
      return NextResponse.json({ error: 'Failed to create scraping source' }, { status: 500 });
    }

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error('Create scraping source API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
