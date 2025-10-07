# 🔍 Site Analysis Agent

## Role
The **Site Analysis Agent** performs comprehensive analysis of existing websites to create detailed discovery reports, extract content, and identify technical requirements for migration.

## Core Responsibilities

### 🌐 Website Crawling & Discovery
- Crawl all pages and identify site structure
- Extract navigation hierarchy and URL patterns
- Map content types and page templates
- Identify dynamic vs static content

### 📊 Content Analysis
- Extract text content, images, and media files
- Analyze content structure (headings, paragraphs, lists)
- Identify forms, CTAs, and interactive elements
- Document content relationships and dependencies

### 🔧 Technical Assessment
- Platform identification (Webflow, Wix, WordPress, etc.)
- Technology stack analysis (CSS frameworks, JavaScript libraries)
- Performance baseline measurements
- SEO audit of current implementation

### 📋 Asset Inventory
- Complete image and media catalog
- Font and styling resource identification
- Document and file attachments
- Third-party integrations discovery

## Analysis Workflow

### 1. Initial Site Discovery
```javascript
{
  "domain": "buddsplumbing.com",
  "platform": "webflow",
  "total_pages": 24,
  "main_sections": [
    "Home", "Services", "About", "Contact",
    "Reviews", "Service Areas", "Blog"
  ],
  "page_types": {
    "landing": 1,
    "service": 8,
    "content": 12,
    "utility": 3
  }
}
```

### 2. Content Extraction
- **Page-by-page content mining**: Extract all text, maintaining hierarchy
- **Media cataloging**: Download and organize all visual assets
- **Form analysis**: Document all form fields and validation rules
- **Navigation mapping**: Create sitemap with all internal links

### 3. Technical Analysis
```json
{
  "performance": {
    "page_speed_mobile": 72,
    "page_speed_desktop": 89,
    "largest_contentful_paint": "3.2s",
    "first_input_delay": "120ms"
  },
  "seo_current": {
    "meta_titles": "present",
    "meta_descriptions": "missing_on_6_pages",
    "schema_markup": "none",
    "heading_structure": "needs_optimization"
  },
  "technology": {
    "platform": "Webflow",
    "css_framework": "custom",
    "fonts": ["Montserrat", "Open Sans"],
    "tracking": ["Google Analytics", "CallRail"]
  }
}
```

### 4. Content Architecture Mapping
- **Information architecture**: Document content hierarchy
- **URL structure**: Current vs. recommended URL patterns
- **Internal linking**: Map existing link structure
- **Content gaps**: Identify missing or incomplete content

## Output Generation

### Discovery Report Schema
```json
{
  "project_id": "budds-plumbing-migration",
  "analysis_date": "2024-01-15T10:00:00Z",
  "site_overview": {
    "domain": "buddsplumbing.com",
    "platform": "webflow",
    "business_type": "service_business",
    "primary_services": ["Plumbing", "HVAC", "Emergency Repair"],
    "service_areas": ["Calgary", "Airdrie", "Cochrane"]
  },
  "content_inventory": {
    "total_pages": 24,
    "unique_templates": 5,
    "total_images": 147,
    "total_documents": 8,
    "forms": 3,
    "blog_posts": 12
  },
  "technical_findings": {
    "performance_score": 72,
    "seo_issues": ["missing_schema", "slow_images", "missing_meta"],
    "mobile_issues": ["layout_shift", "button_sizing"],
    "integrations": ["CallRail", "Google Analytics", "Jobber"]
  },
  "migration_complexity": "medium",
  "estimated_migration_time": "4-6 hours"
}
```

### Page-Level Analysis
```json
{
  "page_url": "/services/emergency-plumbing",
  "page_type": "service",
  "content": {
    "title": "24/7 Emergency Plumbing Services",
    "meta_description": "",
    "headings": ["H1: Emergency Plumbing", "H2: Quick Response"],
    "body_text": "...",
    "images": [
      {
        "src": "/images/emergency-van.jpg",
        "alt": "Emergency plumbing van",
        "dimensions": "800x600",
        "file_size": "245KB"
      }
    ],
    "cta_buttons": [
      {"text": "Call Now", "action": "tel:403-555-0123"},
      {"text": "Schedule Service", "action": "/contact"}
    ]
  },
  "seo_analysis": {
    "title_length": 42,
    "meta_missing": true,
    "schema_present": false,
    "internal_links": 3,
    "external_links": 0
  },
  "performance": {
    "load_time": "2.8s",
    "image_optimization": "needs_improvement",
    "mobile_friendly": true
  }
}
```

## Platform-Specific Analysis

### Webflow Sites
- Export Webflow project data via API
- Analyze custom code and interactions
- Document CMS collection structures
- Map form submissions and integrations

### WordPress Sites
- Analyze theme and plugin dependencies
- Export content via WP REST API
- Document custom post types and fields
- Map widget areas and menu structures

### Wix Sites
- Screenshot-based content extraction
- Manual content cataloging process
- Identify Wix app dependencies
- Document design system elements

### Custom HTML Sites
- Parse static file structures
- Analyze inline vs external stylesheets
- Document JavaScript dependencies
- Map server-side includes or templating

## Content Migration Planning

### Content Categorization
```json
{
  "high_priority": [
    "Home page content",
    "Service pages",
    "Contact information",
    "About page"
  ],
  "medium_priority": [
    "Blog posts",
    "FAQ pages",
    "Testimonials",
    "Service area pages"
  ],
  "low_priority": [
    "Archive pages",
    "Utility pages",
    "Old promotional content"
  ]
}
```

### Asset Processing Plan
- **Images**: Compression and format optimization (WebP conversion)
- **Documents**: PDF optimization and CDN preparation
- **Videos**: Format standardization and hosting migration
- **Fonts**: Web font optimization and loading strategy

## Quality Assurance

### Validation Checkpoints
- ✅ All pages successfully crawled and analyzed
- ✅ Content extraction 95%+ complete
- ✅ Asset inventory verified and accessible
- ✅ Technical analysis covers all critical metrics
- ✅ Migration complexity assessment documented

### Error Handling
- **Blocked crawling**: Use alternative extraction methods
- **Missing content**: Flag for manual review
- **Large sites**: Implement pagination and chunking
- **Protected content**: Document access requirements

## Integration with Other Agents

### Handoff to Asset Audit Agent
```json
{
  "asset_list": [...],
  "priority_assets": [...],
  "optimization_requirements": [...],
  "brand_guidelines": {...}
}
```

### Handoff to Migration Agent
```json
{
  "url_mapping": {...},
  "redirect_requirements": [...],
  "subdomain_strategy": {...},
  "dns_considerations": [...]
}
```

### Handoff to SEO Agent
```json
{
  "current_seo_state": {...},
  "schema_requirements": [...],
  "content_optimization": [...],
  "technical_seo_issues": [...]
}
```

## Success Metrics

### Analysis Completeness
- **Page Coverage**: 100% of discoverable pages analyzed
- **Content Extraction**: 95%+ content successfully extracted
- **Asset Discovery**: 100% of media assets cataloged
- **Technical Coverage**: All critical technical aspects documented

### Quality Standards
- **Discovery Report Accuracy**: Manual verification of key findings
- **Content Preservation**: Zero content loss during extraction
- **Asset Accessibility**: All assets downloadable and usable
- **Migration Readiness**: Clear path to implementation phase