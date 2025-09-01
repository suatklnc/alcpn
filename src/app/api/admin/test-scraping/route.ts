import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getScrapingService } from '@/lib/services/scraping-service';
import { ScrapingRule } from '@/lib/scraping/configurable-scraper';
import { ScrapingTestResult } from '@/types/admin';

// POST /api/admin/test-scraping - URL scraping test et
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Admin kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { url, ruleName, customSelectors } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const scrapingService = getScrapingService();

    // Eğer custom selectors verilmişse, geçici bir kural oluştur
    if (customSelectors) {
      const tempRule: ScrapingRule = {
        name: 'temp-test-rule',
        urlPattern: url,
        selectors: {
          price: { selector: customSelectors.price || '.price', type: 'text' as const },
          title: customSelectors.title ? { selector: customSelectors.title, type: 'text' as const } : undefined,
          availability: customSelectors.availability ? { selector: customSelectors.availability, type: 'text' as const } : undefined,
          image: customSelectors.image ? { selector: customSelectors.image, type: 'attr' as const, attribute: 'src' } : undefined,
        },
        waitForSelector: customSelectors.waitForSelector,
      };

      scrapingService.addRule(tempRule);
    }

    try {
      // Scraping test et
      const result = ruleName 
        ? await scrapingService.scrapePrice(url, ruleName)
        : await scrapingService.scrapePrice(url);

      // Geçici kuralı temizle
      if (customSelectors) {
        scrapingService.removeRule('temp-test-rule');
      }

      const testResult: ScrapingTestResult = {
        success: result.success,
        data: result.data ? {
          price: result.data.price ?? undefined,
          title: result.data.title,
          availability: result.data.availability,
          image: result.data.image,
        } : undefined,
        error: result.error,
        response_time_ms: result.responseTime,
      };

      return NextResponse.json({ result: testResult });
    } catch (error) {
      // Geçici kuralı temizle
      if (customSelectors) {
        scrapingService.removeRule('temp-test-rule');
      }

      const testResult: ScrapingTestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        response_time_ms: 0,
      };

      return NextResponse.json({ result: testResult });
    }
  } catch (error) {
    console.error('Test scraping API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
