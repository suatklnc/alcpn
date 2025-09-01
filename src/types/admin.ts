export interface ScrapingSource {
  id: string;
  name: string;
  base_url: string;
  selectors: {
    price: string;
    title?: string;
    availability?: string;
    image?: string;
  };
  wait_for_selector?: string;
  custom_headers?: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CustomScrapingUrl {
  id: string;
  name: string;
  url: string;
  material_type: string; // MaterialType enum değeri
  source_id: string;
  custom_selectors?: {
    price?: string;
    title?: string;
    availability?: string;
    image?: string;
  };
  is_active: boolean;
  last_scraped_at?: string;
  last_price?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Joined data
  source?: ScrapingSource;
}

export interface ScrapingHistory {
  id: string;
  url_id: string;
  price?: number;
  title?: string;
  availability?: string;
  image_url?: string;
  success: boolean;
  error_message?: string;
  response_time_ms?: number;
  scraped_at: string;
  // Joined data
  custom_url?: CustomScrapingUrl;
}

export interface CreateScrapingSourceRequest {
  name: string;
  base_url: string;
  selectors: {
    price: string;
    title?: string;
    availability?: string;
    image?: string;
  };
  wait_for_selector?: string;
  custom_headers?: Record<string, string>;
  is_active?: boolean;
}

export interface UpdateScrapingSourceRequest extends Partial<CreateScrapingSourceRequest> {
  id: string;
}

export interface CreateCustomScrapingUrlRequest {
  name: string;
  url: string;
  material_type: string;
  source_id: string;
  custom_selectors?: {
    price?: string;
    title?: string;
    availability?: string;
    image?: string;
  };
  is_active?: boolean;
}

export interface UpdateCustomScrapingUrlRequest extends Partial<CreateCustomScrapingUrlRequest> {
  id: string;
}

export interface AdminStats {
  total_sources: number;
  active_sources: number;
  total_urls: number;
  active_urls: number;
  total_scraping_attempts: number;
  successful_scrapes: number;
  failed_scrapes: number;
  last_24h_scrapes: number;
  average_response_time: number;
}

export interface ScrapingTestResult {
  success: boolean;
  data?: {
    price?: number;
    title?: string;
    availability?: string;
    image?: string;
  };
  error?: string;
  response_time_ms: number;
  html_preview?: string;
}
