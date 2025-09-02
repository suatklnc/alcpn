import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'URL ID is required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Get URL history
    const { data: history, error } = await adminSupabase
      .from('url_history')
      .select(`
        *,
        changed_by_user:auth.users!url_history_changed_by_fkey(email)
      `)
      .eq('url_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching URL history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch URL history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: history,
    });

  } catch (error) {
    console.error('URL history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
