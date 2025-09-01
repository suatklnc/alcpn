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
    const { urls } = body;

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      );
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: 'At least one URL is required' },
        { status: 400 }
      );
    }

    if (urls.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 URLs allowed per batch' },
        { status: 400 }
      );
    }

    // URL validasyonu
    for (const url of urls) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: `Invalid URL format: ${url}` },
          { status: 400 }
        );
      }
    }

    const scrapingService = getScrapingService();
    const results = await scrapingService.scrapeMultiplePrices(urls);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: urls.length,
        successful: successCount,
        failed: failureCount,
        successRate: (successCount / urls.length) * 100,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Batch scraping API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
