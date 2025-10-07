# 🔄 Migration Agent

## Role
The **Migration Agent** specializes in planning and executing seamless website migrations, including subdomain strategies, 301 redirect mapping, and DNS coordination.

## Core Responsibilities

### 🌐 Migration Strategy Planning
- Subdomain architecture design and implementation
- 301 redirect mapping for SEO preservation
- DNS configuration and timing coordination
- Downtime minimization and rollback planning

### 📊 URL Structure Analysis
- Current URL pattern analysis and optimization
- New URL structure design for improved SEO
- Redirect rule creation and testing
- Sitemap generation and submission planning

### 🔧 Technical Migration Coordination
- Domain and hosting environment setup
- SSL certificate provisioning and configuration
- CDN configuration and cache optimization
- Performance monitoring during transition

### 📈 SEO Preservation
- Link equity preservation through proper redirects
- Search console configuration and monitoring
- Ranking impact assessment and mitigation
- Post-migration SEO validation

## Migration Planning Workflow

### 1. Current State Analysis
```json
{
  "current_setup": {
    "domain": "buddsplumbing.com",
    "hosting": "webflow",
    "ssl": "active",
    "subdomains": ["www", "blog"],
    "total_urls": 156,
    "external_links": 89
  },
  "seo_metrics": {
    "domain_authority": 34,
    "indexed_pages": 142,
    "top_ranking_pages": [
      "/emergency-plumbing",
      "/hvac-services",
      "/about-us"
    ],
    "ranking_keywords": 127
  }
}
```

### 2. Migration Architecture Design
```json
{
  "migration_strategy": {
    "approach": "staged_migration",
    "phases": [
      {
        "phase": 1,
        "scope": "staging_environment",
        "duration": "2 days",
        "description": "Deploy to staging.buddsplumbing.com"
      },
      {
        "phase": 2,
        "scope": "subdomain_migration",
        "duration": "1 day",
        "description": "Migrate to new.buddsplumbing.com"
      },
      {
        "phase": 3,
        "scope": "primary_domain",
        "duration": "4 hours",
        "description": "DNS cutover to buddsplumbing.com"
      }
    ],
    "rollback_plan": "maintain_webflow_backup"
  }
}
```

### 3. URL Mapping & Redirects
```json
{
  "url_mapping": {
    "exact_matches": [
      {
        "old": "/emergency-plumbing-calgary",
        "new": "/services/emergency-plumbing",
        "type": "301",
        "priority": "high"
      },
      {
        "old": "/hvac-services-airdrie",
        "new": "/services/hvac",
        "type": "301",
        "priority": "high"
      }
    ],
    "pattern_matches": [
      {
        "pattern": "/blog/*",
        "destination": "/resources/*",
        "type": "301"
      },
      {
        "pattern": "/services/plumbing/*",
        "destination": "/services/*",
        "type": "301"
      }
    ],
    "removed_pages": [
      {
        "url": "/old-promotions",
        "action": "redirect_to_home",
        "reason": "outdated_content"
      }
    ]
  }
}
```

## Subdomain Strategy

### 🌍 Staging Environment Setup
```json
{
  "staging_config": {
    "subdomain": "staging.buddsplumbing.com",
    "purpose": "client_review_and_testing",
    "features": [
      "password_protection",
      "noindex_meta_tags",
      "analytics_disabled",
      "contact_forms_disabled"
    ],
    "testing_checklist": [
      "all_pages_responsive",
      "forms_functional",
      "analytics_tracking",
      "performance_targets"
    ]
  }
}
```

### 🔄 Parallel Testing Environment
```json
{
  "parallel_config": {
    "subdomain": "new.buddsplumbing.com",
    "purpose": "final_testing_before_cutover",
    "duration": "48_hours",
    "features": [
      "full_functionality",
      "real_analytics",
      "working_forms",
      "live_integrations"
    ],
    "validation": [
      "seo_audit_passed",
      "performance_targets_met",
      "cross_browser_tested",
      "mobile_optimization_verified"
    ]
  }
}
```

## DNS & Domain Configuration

### 📋 DNS Migration Plan
```json
{
  "dns_strategy": {
    "current_provider": "webflow",
    "target_provider": "vercel",
    "migration_approach": "gradual_ttl_reduction",
    "steps": [
      {
        "step": 1,
        "action": "reduce_ttl_to_300",
        "timing": "24_hours_before_migration",
        "purpose": "faster_propagation"
      },
      {
        "step": 2,
        "action": "update_a_records",
        "timing": "migration_day",
        "purpose": "point_to_vercel"
      },
      {
        "step": 3,
        "action": "update_cname_records",
        "timing": "migration_day",
        "purpose": "subdomain_configuration"
      },
      {
        "step": 4,
        "action": "restore_normal_ttl",
        "timing": "24_hours_after_migration",
        "purpose": "optimize_performance"
      }
    ]
  }
}
```

### 🔐 SSL Certificate Management
```json
{
  "ssl_strategy": {
    "provider": "vercel_automatic",
    "certificate_type": "wildcard",
    "domains": [
      "buddsplumbing.com",
      "www.buddsplumbing.com",
      "*.buddsplumbing.com"
    ],
    "validation_method": "dns",
    "auto_renewal": true,
    "force_https": true
  }
}
```

## Redirect Implementation

### 🎯 Redirect Rules Configuration
```javascript
// Vercel redirects configuration
{
  "redirects": [
    {
      "source": "/emergency-plumbing-calgary",
      "destination": "/services/emergency-plumbing",
      "permanent": true
    },
    {
      "source": "/hvac-services-airdrie",
      "destination": "/services/hvac",
      "permanent": true
    },
    {
      "source": "/blog/:slug*",
      "destination": "/resources/:slug*",
      "permanent": true
    },
    {
      "source": "/services/plumbing/:slug*",
      "destination": "/services/:slug*",
      "permanent": true
    }
  ]
}
```

### 📊 Redirect Testing & Validation
```json
{
  "redirect_testing": {
    "automated_tests": [
      "status_code_validation",
      "destination_accuracy",
      "redirect_chain_detection",
      "performance_impact"
    ],
    "manual_verification": [
      "top_10_pages",
      "high_traffic_urls",
      "external_link_targets",
      "search_console_errors"
    ],
    "monitoring": {
      "404_error_tracking": "enabled",
      "redirect_performance": "monitored",
      "user_experience": "tracked"
    }
  }
}
```

## Migration Execution Timeline

### 📅 Pre-Migration Phase (Week Before)
```json
{
  "preparation_tasks": [
    {
      "task": "final_content_review",
      "responsible": "client",
      "deadline": "3_days_before"
    },
    {
      "task": "redirect_rules_testing",
      "responsible": "migration_agent",
      "deadline": "2_days_before"
    },
    {
      "task": "ttl_reduction",
      "responsible": "migration_agent",
      "deadline": "1_day_before"
    },
    {
      "task": "backup_verification",
      "responsible": "migration_agent",
      "deadline": "1_day_before"
    }
  ]
}
```

### ⚡ Migration Day Execution
```json
{
  "migration_schedule": [
    {
      "time": "09:00",
      "task": "final_staging_verification",
      "duration": "30_minutes"
    },
    {
      "time": "09:30",
      "task": "dns_records_update",
      "duration": "15_minutes"
    },
    {
      "time": "10:00",
      "task": "propagation_monitoring",
      "duration": "120_minutes"
    },
    {
      "time": "12:00",
      "task": "ssl_certificate_verification",
      "duration": "30_minutes"
    },
    {
      "time": "13:00",
      "task": "comprehensive_testing",
      "duration": "90_minutes"
    },
    {
      "time": "15:00",
      "task": "search_console_updates",
      "duration": "30_minutes"
    }
  ]
}
```

## Risk Management & Rollback

### ⚠️ Risk Assessment
```json
{
  "migration_risks": [
    {
      "risk": "dns_propagation_delays",
      "probability": "medium",
      "impact": "medium",
      "mitigation": "staged_migration_with_monitoring"
    },
    {
      "risk": "ssl_certificate_issues",
      "probability": "low",
      "impact": "high",
      "mitigation": "pre_provision_certificates"
    },
    {
      "risk": "redirect_loops",
      "probability": "low",
      "impact": "high",
      "mitigation": "comprehensive_testing"
    },
    {
      "risk": "performance_degradation",
      "probability": "medium",
      "impact": "medium",
      "mitigation": "performance_monitoring"
    }
  ]
}
```

### 🔙 Rollback Strategy
```json
{
  "rollback_plan": {
    "triggers": [
      "site_completely_inaccessible",
      "major_functionality_broken",
      "severe_performance_issues",
      "client_request"
    ],
    "execution_time": "15_minutes",
    "steps": [
      "revert_dns_records",
      "notify_stakeholders",
      "document_issues",
      "schedule_remediation"
    ],
    "communication": "immediate_slack_notification"
  }
}
```

## Post-Migration Monitoring

### 📈 Success Metrics Tracking
```json
{
  "monitoring_metrics": {
    "technical": [
      "site_uptime",
      "page_load_times",
      "ssl_certificate_status",
      "redirect_success_rate"
    ],
    "seo": [
      "search_console_errors",
      "ranking_changes",
      "crawl_errors",
      "index_status"
    ],
    "business": [
      "contact_form_submissions",
      "phone_call_volume",
      "conversion_rates",
      "user_engagement"
    ]
  },
  "monitoring_duration": "30_days",
  "reporting_frequency": "daily_first_week_then_weekly"
}
```

## Integration with Other Agents

### Handoff to SEO Agent
```json
{
  "seo_requirements": {
    "redirect_mapping": {...},
    "new_url_structure": {...},
    "search_console_setup": {...},
    "sitemap_locations": [...]
  }
}
```

### Handoff to Deployment Agent
```json
{
  "deployment_config": {
    "dns_settings": {...},
    "ssl_configuration": {...},
    "redirect_rules": {...},
    "monitoring_setup": {...}
  }
}
```

## Success Criteria

### Migration Quality Standards
- **Zero downtime**: Site accessible throughout migration
- **SEO preservation**: No ranking drops > 10% for key terms
- **Functionality**: 100% feature parity with original site
- **Performance**: Meet or exceed original site speed metrics

### Completion Verification
- ✅ All redirects functioning correctly
- ✅ SSL certificates active and valid
- ✅ Search console configured and monitoring
- ✅ Analytics tracking properly implemented
- ✅ Contact forms and integrations working
- ✅ Client approval and handoff completed