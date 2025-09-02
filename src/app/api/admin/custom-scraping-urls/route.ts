import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateCustomScrapingUrlRequest } from '@/types/admin';

// GET /api/admin/custom-scraping-urls - Tüm custom scraping URLs'leri getir
export async function GET(request: NextRequest) {
  try {
    // Geçici olarak development için authentication'ı devre dışı bırak
    // TODO: Production'da gerçek authentication kullan
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const materialType = searchParams.get('material_type');
    const sourceId = searchParams.get('source_id');

    // Query builder
    let query = supabase
      .from('custom_scraping_urls')
      .select('*')
      .order('created_at', { ascending: false });

    // Filters
    if (materialType) {
      query = query.eq('material_type', materialType);
    }
    if (sourceId) {
      query = query.eq('source_id', sourceId);
    }

    const { data: urls, error } = await query;

    if (error) {
      console.error('Error fetching custom scraping URLs:', error);
      return NextResponse.json({ error: 'Failed to fetch custom scraping URLs' }, { status: 500 });
    }

    return NextResponse.json(urls || []);
  } catch (error) {
    console.error('Custom scraping URLs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/custom-scraping-urls - Yeni custom scraping URL oluştur
export async function POST(request: NextRequest) {
  try {
    // Geçici olarak development için authentication'ı devre dışı bırak
    // TODO: Production'da gerçek authentication kullan
    const supabase = await createClient();

    const body: CreateCustomScrapingUrlRequest = await request.json();

    // Validation
    if (!body.url || !body.material_type || !body.selector) {
      return NextResponse.json(
        { error: 'URL, material_type, and selector are required' },
        { status: 400 }
      );
    }

    // URL validation
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Yeni custom scraping URL oluştur
    const { data: url, error } = await supabase
      .from('custom_scraping_urls')
      .insert({
        url: body.url,
        material_type: body.material_type,
        selector: body.selector,
        is_active: body.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating custom scraping URL:', error);
      return NextResponse.json({ error: 'Failed to create custom scraping URL' }, { status: 500 });
    }

    return NextResponse.json(url, { status: 201 });
  } catch (error) {
    console.error('Create custom scraping URL API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
