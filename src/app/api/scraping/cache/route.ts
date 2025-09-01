import { NextRequest, NextResponse } from 'next/server';
import { getScrapingService } from '@/lib/services/scraping-service';
import { createAPIRateLimiter } from '@/lib/middleware/rate-limiter';

// Rate limiter
const rateLimiter = createAPIRateLimiter();

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

    const scrapingService = getScrapingService();
    const stats = await scrapingService.getCacheStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Cache stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const scrapingService = getScrapingService();

    if (url) {
      // Belirli URL'nin cache'ini temizle
      await scrapingService.clearCacheForUrl(url);
      return NextResponse.json({
        success: true,
        message: `Cache cleared for URL: ${url}`,
        timestamp: Date.now(),
      });
    } else {
      // Tüm cache'i temizle
      await scrapingService.clearCache();
      return NextResponse.json({
        success: true,
        message: 'All cache cleared',
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error('Cache clear API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
