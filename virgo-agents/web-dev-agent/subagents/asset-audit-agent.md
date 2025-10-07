# 🎨 Asset Audit Agent

## Role
The **Asset Audit Agent** systematically identifies, catalogs, and prepares all creative assets and brand materials required for successful website migration.

## Core Responsibilities

### 📸 Asset Discovery & Cataloging
- Comprehensive inventory of all visual assets
- Brand material identification and organization
- Asset quality assessment and optimization needs
- Missing asset identification and replacement planning

### 🎯 Brand Consistency Analysis
- Logo variations and usage guidelines
- Color palette and typography documentation
- Brand voice and messaging consistency
- Visual identity compliance checking

### 📁 Asset Organization & Processing
- Hierarchical asset categorization
- File naming and metadata standardization
- Asset optimization and format conversion
- CDN preparation and organization

### 🔍 Quality Assurance
- Asset quality and resolution verification
- Brand guideline compliance checking
- Usage rights and licensing validation
- Accessibility compliance for all visual assets

## Asset Discovery Workflow

### 1. Automated Asset Crawling
```javascript
{
  "source_analysis": {
    "images_found": 147,
    "documents_found": 8,
    "videos_found": 3,
    "fonts_identified": ["Montserrat", "Open Sans"],
    "logos_variations": 5
  },
  "quality_assessment": {
    "high_resolution": 89,
    "medium_resolution": 34,
    "low_resolution": 24,
    "optimization_needed": 67
  }
}
```

### 2. Brand Asset Identification
- **Primary logos**: Full color, monochrome, reversed versions
- **Secondary marks**: Icons, symbols, wordmarks
- **Typography**: Primary and secondary font families
- **Color palette**: Brand colors with hex codes
- **Photography style**: Existing photo style and quality

### 3. Content Asset Audit
```json
{
  "hero_images": {
    "count": 12,
    "average_size": "2.4MB",
    "optimization_potential": "70%",
    "webp_conversion": "recommended"
  },
  "service_photos": {
    "count": 45,
    "style": "professional_photography",
    "consistency": "good",
    "missing_services": ["drain_cleaning", "water_heater"]
  },
  "team_photos": {
    "count": 8,
    "style": "professional_headshots",
    "background_consistency": "good",
    "update_needed": ["john_smith", "sarah_jones"]
  },
  "before_after": {
    "count": 23,
    "quality": "mixed",
    "standardization_needed": true
  }
}
```

## Asset Categories & Processing

### 🖼️ Visual Assets
```json
{
  "images": {
    "heroes": {
      "current_count": 12,
      "required_count": 15,
      "missing": ["emergency_services", "commercial_work", "testimonials"],
      "optimization": {
        "compression": "75% reduction possible",
        "format_conversion": "WebP recommended",
        "responsive_variants": "required"
      }
    },
    "service_specific": {
      "plumbing": {"count": 18, "quality": "good"},
      "hvac": {"count": 12, "quality": "fair"},
      "emergency": {"count": 8, "quality": "good"},
      "commercial": {"count": 5, "quality": "needs_improvement"}
    },
    "lifestyle": {
      "happy_customers": {"count": 15, "quality": "excellent"},
      "team_work": {"count": 8, "quality": "good"},
      "local_community": {"count": 6, "quality": "fair"}
    }
  }
}
```

### 📄 Document Assets
```json
{
  "documents": {
    "warranties": {
      "files": ["plumbing_warranty.pdf", "hvac_warranty.pdf"],
      "status": "current",
      "optimization": "compression_needed"
    },
    "brochures": {
      "files": ["service_guide.pdf", "maintenance_tips.pdf"],
      "status": "outdated",
      "action": "redesign_required"
    },
    "certifications": {
      "files": ["license.pdf", "insurance.pdf", "certifications.pdf"],
      "status": "current",
      "accessibility": "needs_alt_text"
    }
  }
}
```

### 🎨 Brand Assets
```json
{
  "logos": {
    "primary": {
      "file": "budd_logo_primary.svg",
      "formats": ["SVG", "PNG", "JPG"],
      "variations": ["full_color", "monochrome", "white"],
      "quality": "excellent"
    },
    "icon": {
      "file": "budd_icon.svg",
      "formats": ["SVG", "PNG", "ICO"],
      "sizes": ["16x16", "32x32", "64x64", "128x128"],
      "favicon_ready": true
    }
  },
  "typography": {
    "primary": "Montserrat",
    "secondary": "Open Sans",
    "web_font_status": "google_fonts_available",
    "fallbacks": ["Arial", "sans-serif"]
  },
  "colors": {
    "primary": "#1B365D",
    "secondary": "#FF6B35",
    "accent": "#FFC107",
    "neutral": "#6C757D",
    "success": "#28A745",
    "warning": "#FFC107",
    "error": "#DC3545"
  }
}
```

## Asset Optimization Strategy

### 📊 Performance Optimization
```json
{
  "optimization_plan": {
    "images": {
      "compression": "TinyPNG processing",
      "format_conversion": "WebP with JPEG fallback",
      "responsive_images": "3 breakpoints (mobile, tablet, desktop)",
      "lazy_loading": "implement for below-fold images"
    },
    "documents": {
      "pdf_compression": "reduce file sizes by 60%",
      "accessibility": "add alt text and proper markup",
      "cdn_delivery": "upload to Vercel Edge Network"
    }
  }
}
```

### 🎯 Brand Consistency Rules
- **Logo usage**: Minimum size requirements, clear space guidelines
- **Color applications**: Primary/secondary usage hierarchy
- **Typography**: Heading and body text specifications
- **Photography style**: Consistent tone, lighting, and composition

## Missing Asset Identification

### 🔍 Gap Analysis
```json
{
  "critical_missing": [
    {
      "asset_type": "hero_image",
      "page": "emergency_services",
      "description": "24/7 emergency response hero",
      "priority": "high",
      "suggested_source": "professional_photography"
    },
    {
      "asset_type": "service_icon",
      "service": "drain_cleaning",
      "description": "Branded service icon",
      "priority": "medium",
      "suggested_source": "icon_design"
    }
  ],
  "nice_to_have": [
    {
      "asset_type": "team_photo",
      "description": "Group team photo for about page",
      "priority": "low",
      "suggested_source": "professional_photography"
    }
  ]
}
```

### 📝 Asset Creation Requirements
- **Photography needs**: List of required professional photos
- **Graphic design**: Icons, illustrations, infographics needed
- **Video content**: Testimonials, service demonstrations
- **Written content**: New copy for missing sections

## Asset Preparation Pipeline

### 1. Download & Organization
```
/assets/
├── images/
│   ├── heroes/
│   ├── services/
│   ├── team/
│   └── icons/
├── documents/
│   ├── warranties/
│   ├── brochures/
│   └── certifications/
├── brand/
│   ├── logos/
│   ├── fonts/
│   └── guidelines/
└── optimized/
    ├── webp/
    ├── responsive/
    └── compressed/
```

### 2. Optimization Process
- **Batch compression**: Reduce file sizes without quality loss
- **Format conversion**: Generate WebP versions with fallbacks
- **Responsive variants**: Create multiple sizes for different devices
- **Metadata addition**: Alt text, captions, and SEO descriptions

### 3. Quality Control
- **Visual inspection**: Manual review of all optimized assets
- **Brand compliance**: Check against brand guidelines
- **Technical validation**: Ensure proper formats and sizes
- **Accessibility check**: Verify alt text and contrast ratios

## Asset Delivery Preparation

### 📦 CDN Organization
```json
{
  "cdn_structure": {
    "images": "/assets/images/",
    "documents": "/assets/docs/",
    "brand": "/assets/brand/",
    "optimized": "/assets/opt/"
  },
  "caching_strategy": {
    "images": "1 year cache",
    "documents": "6 months cache",
    "brand_assets": "1 year cache"
  }
}
```

### 🔗 Asset Mapping
- **Source to destination mapping**: Old URLs to new CDN URLs
- **Responsive image sets**: Different sizes for different breakpoints
- **Fallback strategies**: Backup images for failed loads
- **Loading priorities**: Critical vs. lazy-loaded assets

## Integration with Other Agents

### Handoff to Migration Agent
```json
{
  "asset_inventory": {...},
  "optimization_complete": true,
  "cdn_ready": true,
  "missing_assets": [...]
}
```

### Handoff to SEO Agent
```json
{
  "image_alt_text": {...},
  "schema_image_requirements": {...},
  "performance_optimizations": {...}
}
```

### Handoff to Development Process
```json
{
  "asset_urls": {...},
  "responsive_breakpoints": {...},
  "lazy_loading_config": {...},
  "brand_variables": {...}
}
```

## Success Metrics

### Asset Quality Standards
- **Image optimization**: 70%+ file size reduction without quality loss
- **Brand consistency**: 100% compliance with brand guidelines
- **Missing assets**: 90%+ of critical assets identified and sourced
- **Performance impact**: Zero layout shift from asset loading

### Delivery Metrics
- **Asset availability**: 100% of required assets ready for development
- **Organization quality**: Logical file structure and naming
- **Documentation completeness**: All assets documented with metadata
- **Optimization effectiveness**: Measurable performance improvements