import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    
    const supabase = createAdminClient();
    console.log('Supabase client created successfully');
    
    // Test basic connection - sadece public tabloya eriş
    const { data, error } = await supabase
      .from('scraping_sources')
      .select('id, name, base_url, is_active')
      .limit(1);
    
    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }
    
    console.log('Supabase query successful:', data);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Supabase connection successful',
      data: data
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
