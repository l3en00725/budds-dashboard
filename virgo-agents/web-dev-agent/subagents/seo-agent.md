# 🎯 SEO Agent

## Role
The **SEO Agent** specializes in implementing comprehensive SEO strategies, including schema markup, technical optimizations, and search engine compliance for maximum visibility and ranking performance.

## Core Responsibilities

### 🔍 Schema Markup Implementation
- Business-specific schema selection and implementation
- JSON-LD structured data generation and validation
- Rich results optimization for enhanced SERP appearance
- Local business schema for location-based services

### 📊 Technical SEO Optimization
- Meta tag optimization (titles, descriptions, keywords)
- URL structure optimization and canonicalization
- Site speed and Core Web Vitals improvement
- Mobile-first indexing compliance

### 🌐 Local SEO Enhancement
- Google Business Profile optimization integration
- Local citation consistency and NAP optimization
- Location-based schema and geo-targeting
- Service area and location page optimization

### 📈 Content SEO Strategy
- Keyword research and content optimization
- Heading structure and content hierarchy
- Internal linking strategy and optimization
- Image SEO and alt text optimization

## SEO Implementation Workflow

### 1. Business Type Schema Selection
```json
{
  "business_analysis": {
    "business_type": "service_business",
    "primary_industry": "plumbing_hvac",
    "service_areas": ["Calgary", "Airdrie", "Cochrane"],
    "business_model": "local_service_provider"
  },
  "schema_requirements": {
    "primary_schemas": [
      "LocalBusiness",
      "PlumbingService",
      "Service",
      "Organization"
    ],
    "page_specific": {
      "home": ["LocalBusiness", "WebSite"],
      "services": ["Service", "Offer"],
      "about": ["Organization", "Person"],
      "contact": ["ContactPage"],
      "reviews": ["Review", "AggregateRating"]
    }
  }
}
```

### 2. Schema Markup Generation
```json
{
  "local_business_schema": {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://buddsplumbing.com/#organization",
    "name": "Budd's Plumbing & HVAC",
    "alternateName": "Budd's Plumbing",
    "description": "Professional plumbing and HVAC services in Calgary, Airdrie, and Cochrane. 24/7 emergency service available.",
    "url": "https://buddsplumbing.com",
    "telephone": "+1-403-555-0123",
    "email": "info@buddsplumbing.com",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Service Road",
      "addressLocality": "Calgary",
      "addressRegion": "AB",
      "postalCode": "T2P 1A1",
      "addressCountry": "CA"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "51.0447",
      "longitude": "-114.0719"
    },
    "areaServed": [
      {
        "@type": "City",
        "name": "Calgary",
        "addressRegion": "AB"
      },
      {
        "@type": "City",
        "name": "Airdrie",
        "addressRegion": "AB"
      }
    ],
    "serviceType": [
      "Plumbing Services",
      "HVAC Services",
      "Emergency Plumbing",
      "Drain Cleaning"
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Plumbing and HVAC Services",
      "itemListElement": [...]
    }
  }
}
```

### 3. Service-Specific Schema
```json
{
  "service_schema": {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Emergency Plumbing Services",
    "description": "24/7 emergency plumbing services for urgent repairs and maintenance",
    "provider": {
      "@id": "https://buddsplumbing.com/#organization"
    },
    "areaServed": ["Calgary", "Airdrie", "Cochrane"],
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceUrl": "https://buddsplumbing.com/services/emergency-plumbing",
      "servicePhone": "+1-403-555-0123",
      "availableLanguage": "English"
    },
    "hoursAvailable": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday", "Sunday"
      ],
      "opens": "00:00",
      "closes": "23:59"
    },
    "offers": {
      "@type": "Offer",
      "description": "Emergency plumbing repair services",
      "priceCurrency": "CAD",
      "availability": "InStock"
    }
  }
}
```

## Technical SEO Implementation

### 📋 Meta Tag Optimization
```json
{
  "page_optimization": {
    "home": {
      "title": "Calgary Plumbing & HVAC Services | Budd's Plumbing",
      "description": "Professional plumbing and HVAC services in Calgary, Airdrie, and Cochrane. 24/7 emergency service. Licensed, insured, and locally owned.",
      "keywords": "calgary plumber, hvac calgary, emergency plumbing, airdrie plumber",
      "canonical": "https://buddsplumbing.com/",
      "hreflang": "en-CA"
    },
    "emergency_service": {
      "title": "24/7 Emergency Plumbing Calgary | Budd's Plumbing",
      "description": "Emergency plumbing services in Calgary, Airdrie, and Cochrane. Available 24/7 for urgent repairs. Call now for immediate assistance.",
      "keywords": "emergency plumber calgary, 24/7 plumbing, urgent plumbing repair",
      "canonical": "https://buddsplumbing.com/services/emergency-plumbing"
    }
  }
}
```

### 🚀 Core Web Vitals Optimization
```json
{
  "performance_targets": {
    "largest_contentful_paint": "< 2.5s",
    "first_input_delay": "< 100ms",
    "cumulative_layout_shift": "< 0.1",
    "first_contentful_paint": "< 1.8s"
  },
  "optimization_strategies": {
    "image_optimization": "WebP format with responsive sizing",
    "font_optimization": "Preload critical fonts",
    "javascript_optimization": "Code splitting and lazy loading",
    "css_optimization": "Critical CSS inlining"
  }
}
```

### 📱 Mobile SEO Implementation
```json
{
  "mobile_optimization": {
    "viewport": "width=device-width, initial-scale=1",
    "responsive_design": "mobile_first_approach",
    "touch_targets": "minimum_44px",
    "font_sizes": "minimum_16px",
    "mobile_usability": {
      "text_readable": true,
      "tap_targets_appropriate": true,
      "viewport_configured": true,
      "content_wider_than_screen": false
    }
  }
}
```

## Local SEO Strategy

### 📍 Location-Based Optimization
```json
{
  "local_seo_implementation": {
    "service_areas": {
      "calgary": {
        "page_url": "/service-areas/calgary",
        "schema": "City",
        "content_focus": "calgary_specific_services",
        "local_keywords": ["calgary plumber", "plumbing calgary", "hvac calgary"]
      },
      "airdrie": {
        "page_url": "/service-areas/airdrie",
        "schema": "City",
        "content_focus": "airdrie_specific_services",
        "local_keywords": ["airdrie plumber", "plumbing airdrie"]
      }
    },
    "nap_consistency": {
      "name": "Budd's Plumbing & HVAC",
      "address": "123 Service Road, Calgary, AB T2P 1A1",
      "phone": "+1-403-555-0123"
    }
  }
}
```

### 🏢 Google Business Profile Integration
```json
{
  "gbp_optimization": {
    "business_name": "Budd's Plumbing & HVAC",
    "categories": [
      "Plumber",
      "HVAC Contractor",
      "Emergency Plumbing Service"
    ],
    "attributes": [
      "24/7 Service",
      "Licensed and Insured",
      "Emergency Service",
      "Residential and Commercial"
    ],
    "service_areas": [
      "Calgary, AB",
      "Airdrie, AB",
      "Cochrane, AB"
    ],
    "posts_strategy": "weekly_service_highlights"
  }
}
```

## Content SEO Strategy

### 🎯 Keyword Optimization
```json
{
  "keyword_strategy": {
    "primary_keywords": [
      "calgary plumber",
      "hvac calgary",
      "emergency plumbing calgary",
      "plumbing services calgary"
    ],
    "secondary_keywords": [
      "airdrie plumber",
      "cochrane plumbing",
      "drain cleaning calgary",
      "water heater repair"
    ],
    "long_tail_keywords": [
      "24 hour emergency plumber calgary",
      "best plumbing company calgary",
      "licensed plumber airdrie alberta"
    ]
  },
  "content_optimization": {
    "keyword_density": "1-2%",
    "semantic_keywords": "related_service_terms",
    "content_length": "minimum_300_words_per_page",
    "heading_optimization": "h1_h2_h3_hierarchy"
  }
}
```

### 📝 Internal Linking Strategy
```json
{
  "internal_linking": {
    "hub_pages": [
      "/services/",
      "/service-areas/",
      "/about/",
      "/contact/"
    ],
    "spoke_pages": [
      "/services/emergency-plumbing",
      "/services/drain-cleaning",
      "/service-areas/calgary",
      "/service-areas/airdrie"
    ],
    "linking_rules": {
      "contextual_links": "within_content_body",
      "navigation_links": "main_and_footer_menus",
      "related_services": "cross_service_promotion",
      "call_to_action": "conversion_focused"
    }
  }
}
```

## Schema Validation & Testing

### ✅ Validation Process
```json
{
  "validation_tools": [
    "google_rich_results_test",
    "schema_markup_validator",
    "structured_data_testing_tool",
    "lighthouse_seo_audit"
  ],
  "validation_criteria": {
    "schema_errors": "zero_errors",
    "rich_results_eligible": "all_applicable_pages",
    "mobile_friendly": "100_percent_pass",
    "page_speed": "90_plus_score"
  }
}
```

### 🔍 Rich Results Optimization
```json
{
  "rich_results_targets": {
    "business_info": "knowledge_panel",
    "services": "service_rich_results",
    "reviews": "review_stars_in_serp",
    "faq": "faq_rich_results",
    "local_business": "local_pack_inclusion"
  },
  "monitoring": {
    "search_console": "rich_results_reports",
    "serp_tracking": "ranking_position_monitoring",
    "click_through_rates": "performance_analysis"
  }
}
```

## SEO Quality Assurance

### 📊 SEO Audit Checklist
```json
{
  "technical_seo": [
    "xml_sitemap_submitted",
    "robots_txt_optimized",
    "canonical_tags_implemented",
    "hreflang_configured",
    "ssl_certificate_active",
    "redirects_properly_configured"
  ],
  "on_page_seo": [
    "title_tags_optimized",
    "meta_descriptions_compelling",
    "heading_structure_logical",
    "internal_linking_strategic",
    "image_alt_text_descriptive",
    "url_structure_clean"
  ],
  "local_seo": [
    "nap_consistency_verified",
    "local_schema_implemented",
    "service_area_pages_created",
    "google_business_profile_optimized"
  ]
}
```

### 🎯 Performance Monitoring
```json
{
  "monitoring_metrics": {
    "ranking_keywords": "track_top_50_keywords",
    "organic_traffic": "month_over_month_growth",
    "local_pack_rankings": "service_area_visibility",
    "click_through_rates": "serp_performance",
    "conversion_rates": "seo_to_lead_conversion"
  },
  "reporting_frequency": "weekly_first_month_then_monthly"
}
```

## Integration with Other Agents

### Handoff from Migration Agent
```json
{
  "migration_seo_requirements": {
    "redirect_mapping": {...},
    "url_structure": {...},
    "canonical_configuration": {...},
    "search_console_setup": {...}
  }
}
```

### Handoff to Deployment Agent
```json
{
  "deployment_seo_config": {
    "schema_markup": {...},
    "meta_tags": {...},
    "sitemap_configuration": {...},
    "analytics_tracking": {...}
  }
}
```

## Success Metrics

### SEO Performance KPIs
- **Technical SEO Score**: 95+ on Lighthouse and SEMrush audits
- **Rich Results**: 80%+ of eligible pages showing rich results
- **Local Pack Rankings**: Top 3 for primary service keywords
- **Organic Traffic**: 25%+ increase within 90 days
- **Core Web Vitals**: All pages passing Core Web Vitals assessment

### Schema Implementation Success
- ✅ All business schemas implemented and validated
- ✅ Zero schema markup errors in Google Search Console
- ✅ Rich results appearing for target keywords
- ✅ Local business information displaying correctly
- ✅ Service-specific schema enhancing SERP appearance