import { supabase } from './supabase';

export async function testSupabaseConnection() {
  try {
    // Test basic connection
    const { error } = await supabase.from('_test').select('*').limit(1);

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "relation does not exist" which is expected
      console.error('Supabase connection error:', error);
      return false;
    }

    console.log('Supabase connection successful!');
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
}

// Test auth connection
export async function testSupabaseAuth() {
  try {
    const { error } = await supabase.auth.getSession();

    if (error) {
      console.error('Supabase auth error:', error);
      return false;
    }

    console.log('Supabase auth connection successful!');
    return true;
  } catch (error) {
    console.error('Supabase auth connection failed:', error);
    return false;
  }
}
