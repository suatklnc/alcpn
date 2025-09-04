import { NextRequest, NextResponse } from 'next/server';

// Railway'de network kısıtlamalarını aşmak için proxy endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, headers = {} } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Proxy fetch with retry mechanism
    const fetchWithRetry = async (url: string, retries = 3): Promise<Response> => {
      for (let i = 0; i < retries; i++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 saniye timeout
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              ...headers
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          console.log(`Proxy fetch attempt ${i + 1} failed:`, error);
          if (i === retries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
      }
      throw new Error('All proxy fetch attempts failed');
    };

    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status
      });
    }

    const html = await response.text();
    
    return NextResponse.json({
      success: true,
      data: {
        html: html,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      }
    });

  } catch (error) {
    console.error('Proxy fetch error:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('fetch failed')) {
        errorMessage = `Proxy fetch failed: ${error.message}. Railway network kısıtlaması olabilir.`;
      } else if (error.message.includes('AbortError')) {
        errorMessage = 'Proxy request timeout (15 saniye).';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'DNS resolution failed.';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused.';
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      debug_info: {
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        error_message: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}
