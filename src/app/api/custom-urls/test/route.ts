import { NextRequest, NextResponse } from 'next/server';
import { ConfigurableScraper } from '@/lib/scraping/configurable-scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { url, selectors } = body;
    
    // Validation
    if (!url || !selectors || !selectors.price) {
      return NextResponse.json(
        { error: 'URL and price selector are required' },
        { status: 400 }
      );
    }

    // Create scraper instance
    const scraper = new ConfigurableScraper();
    
    // Test the URL with provided selectors
    const result = await scraper.scrapeWithRules({
      name: 'test',
      urlPattern: url,
      selectors: {
        price: { selector: selectors.price, type: 'text' },
        title: selectors.title ? { selector: selectors.title, type: 'text' } : undefined,
        availability: selectors.availability ? { selector: selectors.availability, type: 'text' } : undefined,
        image: selectors.image ? { selector: selectors.image, type: 'attr', attribute: 'src' } : undefined,
      },
      priceFormat: 'decimal',
    }, url);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Scraping failed', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      url: url,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('URL test API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
