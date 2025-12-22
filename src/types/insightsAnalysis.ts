// Types for Insights Analysis API integration

export interface ContentArticle {
  id: number;
  created_at: number;
  Publication_Date: string;
  Headline: string;
  Strapline: string;
  Content_Type?: string;
  Body: string;
  sectors: Array<
    Array<{
      id: number;
      sector_name: string;
    }>
  >;
  companies_mentioned: Array<{
    id: number;
    name: string;
    locations_id: number;
    _locations: {
      City: string;
      State__Province__County: string;
      Country: string;
    };
  }>;
  Visibility: string;
  Related_Documents: Array<{
    access: string;
    path: string;
    name: string;
    type: string;
    size: number;
    mime: string;
    // Meta varies by file type; may contain validated flag or audio duration/codec metadata.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta: any;
    url?: string;
  }>;
}

export interface InsightsAnalysisResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  pageTotal: number;
  items: ContentArticle[];
}

export interface InsightsAnalysisFilters {
  search_query: string;
  Content_Type?: string;
  content_type?: string;
  primary_sectors_ids: number[];
  Secondary_sectors_ids: number[];
  Countries: string[];
  Provinces: string[];
  Cities: string[];
  Offset: number;
  Per_page: number;
}

// Types for API integration
export interface Country {
  locations_Country: string;
}

export interface Province {
  State__Province__County: string;
}

export interface City {
  City: string;
}

export interface PrimarySector {
  id: number;
  sector_name: string;
}

export interface SecondarySector {
  id: number;
  sector_name: string;
}
