import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Validate URLs
    const validUrls = urls.filter(url => 
      url.material_type && 
      url.url && 
      url.selector &&
      typeof url.material_type === 'string' &&
      typeof url.url === 'string' &&
      typeof url.selector === 'string'
    );

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs provided' },
        { status: 400 }
      );
    }

    // Insert URLs
    const { data, error } = await adminSupabase
      .from('custom_scraping_urls')
      .insert(validUrls.map(url => ({
        material_type: url.material_type,
        url: url.url,
        selector: url.selector,
        is_active: url.is_active !== false, // Default to true
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })))
      .select();

    if (error) {
      console.error('Error bulk inserting URLs:', error);
      return NextResponse.json(
        { error: 'Failed to insert URLs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      inserted: data.length,
      total: validUrls.length,
      data,
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
