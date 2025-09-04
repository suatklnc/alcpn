import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const optionalEnvVars = [
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'RATE_LIMIT_REQUESTS_PER_MINUTE',
      'SCRAPING_USER_AGENT',
      'SCRAPING_TIMEOUT_MS',
      'SCRAPING_RETRY_ATTEMPTS',
      'NEXT_PUBLIC_APP_URL',
      'ADMIN_EMAILS',
      'RAILWAY_PUBLIC_DOMAIN'
    ];

    const envStatus = {
      required: {} as Record<string, { exists: boolean; value?: string }>,
      optional: {} as Record<string, { exists: boolean; value?: string }>,
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime()
    };

    // Check required environment variables
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      envStatus.required[envVar] = {
        exists: !!value,
        value: value ? `${value.substring(0, 10)}...` : undefined
      };
    }

    // Check optional environment variables
    for (const envVar of optionalEnvVars) {
      const value = process.env[envVar];
      envStatus.optional[envVar] = {
        exists: !!value,
        value: value ? `${value.substring(0, 10)}...` : undefined
      };
    }

    const allRequiredExist = Object.values(envStatus.required).every(env => env.exists);
    
    return NextResponse.json({
      status: allRequiredExist ? 'healthy' : 'missing_env_vars',
      message: allRequiredExist ? 'All required environment variables are set' : 'Some required environment variables are missing',
      ...envStatus
    }, { 
      status: allRequiredExist ? 200 : 500 
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check environment variables',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
