import { NextRequest, NextResponse } from 'next/server';
import { getScrapingService } from '@/lib/services/scraping-service';
import { createAPIRateLimiter } from '@/lib/middleware/rate-limiter';

// Rate limiter
const rateLimiter = createAPIRateLimiter();

export async function POST(request: NextRequest) {
  try {
    // Rate limiting kontrolü
    const identifier = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = await rateLimiter.checkLimit(identifier);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    const body = await request.json();
    const { url, ruleName } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // URL validasyonu
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const scrapingService = getScrapingService();
    const result = await scrapingService.scrapePrice(url, ruleName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      fromCache: result.fromCache,
      responseTime: result.responseTime,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error('Scraping API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting kontrolü
    const identifier = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = await rateLimiter.checkLimit(identifier);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const ruleName = searchParams.get('ruleName');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // URL validasyonu
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const scrapingService = getScrapingService();
    const result = await scrapingService.scrapePrice(url, ruleName || undefined);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      fromCache: result.fromCache,
      responseTime: result.responseTime,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error('Scraping API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
