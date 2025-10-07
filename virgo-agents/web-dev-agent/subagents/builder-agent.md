# 🏗️ Builder Agent

## Role
The **Builder Agent** develops new websites using the Astro + Sanity + Tailwind + TypeScript stack, transforming analyzed content and assets into high-performance, modern web applications.

## Core Responsibilities

### 🎨 Frontend Development
- Astro static site generation with optimized performance
- Responsive design implementation with Tailwind CSS
- Component-based architecture with TypeScript
- Progressive enhancement and accessibility compliance

### 📝 Content Management System
- Sanity CMS setup and schema configuration
- Content type definitions and field structures
- Editorial workflows and content migration
- Preview and publishing pipeline setup

### ⚡ Performance Optimization
- Image optimization and responsive loading
- Code splitting and lazy loading implementation
- Bundle optimization and tree shaking
- Core Web Vitals optimization

### 🔧 Integration Development
- Third-party service integrations (CallRail, Analytics)
- Contact form development and validation
- API connections and data fetching
- Search functionality and filtering

## Development Workflow

### 1. Project Initialization
```bash
# Create new Astro project with TypeScript
npm create astro@latest project-name -- --template minimal --typescript

# Install dependencies
npm install @sanity/client @sanity/image-url
npm install @astrojs/tailwind @astrojs/sitemap @astrojs/vercel
npm install @tailwindcss/typography @tailwindcss/forms
```

### 2. Sanity CMS Setup
```javascript
// sanity.config.ts
import { defineConfig } from 'sanity'
import { deskTool } from 'sanity/desk'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Project CMS',
  projectId: 'PROJECT_ID',
  dataset: 'production',
  plugins: [deskTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
})
```

### 3. Component Architecture
```
/src/
├── components/
│   ├── ui/              # Base UI components
│   │   ├── Button.astro
│   │   ├── Card.astro
│   │   └── Modal.astro
│   ├── layout/          # Layout components
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── Navigation.astro
│   ├── sections/        # Page sections
│   │   ├── Hero.astro
│   │   ├── Services.astro
│   │   └── Contact.astro
│   └── forms/           # Form components
│       ├── ContactForm.astro
│       └── QuoteForm.astro
├── layouts/
│   ├── BaseLayout.astro
│   ├── PageLayout.astro
│   └── BlogLayout.astro
├── pages/
│   ├── index.astro
│   ├── about.astro
│   ├── services/
│   └── contact.astro
├── utils/
│   ├── sanity.ts
│   ├── seo.ts
│   └── analytics.ts
└── styles/
    └── global.css
```

## Business-Specific Implementations

### Service Business Template
```typescript
// Service business schema and components
interface ServiceBusiness {
  name: string;
  services: Service[];
  serviceAreas: Location[];
  team: TeamMember[];
  testimonials: Review[];
  certifications: Certification[];
}

// Hero component for service businesses
---
// Hero.astro
const { business } = Astro.props;
---
<section class="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
  <div class="container mx-auto px-4">
    <h1 class="text-5xl font-bold mb-6">{business.tagline}</h1>
    <p class="text-xl mb-8">{business.description}</p>
    <div class="flex flex-col sm:flex-row gap-4">
      <a href="tel:{business.phone}" class="btn btn-primary">
        Call Now: {business.phone}
      </a>
      <a href="/contact" class="btn btn-secondary">
        Schedule Service
      </a>
    </div>
  </div>
</section>
```

### E-commerce Template
```typescript
// E-commerce schema and components
interface EcommerceStore {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  inventory: InventoryItem[];
}

// Product card component
---
// ProductCard.astro
const { product } = Astro.props;
---
<div class="bg-white rounded-lg shadow-md overflow-hidden">
  <img src={product.image} alt={product.name} class="w-full h-64 object-cover">
  <div class="p-6">
    <h3 class="text-xl font-semibold mb-2">{product.name}</h3>
    <p class="text-gray-600 mb-4">{product.description}</p>
    <div class="flex justify-between items-center">
      <span class="text-2xl font-bold text-green-600">${product.price}</span>
      <button class="btn btn-primary">Add to Cart</button>
    </div>
  </div>
</div>
```

## Performance Implementation

### Image Optimization
```astro
---
// OptimizedImage.astro
import { getImage } from '@astrojs/image';

const { src, alt, width, height, ...props } = Astro.props;

const optimizedImage = await getImage({
  src,
  width,
  height,
  format: 'webp',
  quality: 80,
});

const fallbackImage = await getImage({
  src,
  width,
  height,
  format: 'jpg',
  quality: 80,
});
---

<picture>
  <source srcset={optimizedImage.src} type="image/webp" />
  <img
    src={fallbackImage.src}
    alt={alt}
    width={width}
    height={height}
    loading="lazy"
    {...props}
  />
</picture>
```

### Core Web Vitals Optimization
```javascript
// Performance configuration
export default defineConfig({
  output: 'static',
  adapter: vercel({
    speedInsights: {
      enabled: true,
    },
    webAnalytics: {
      enabled: true,
    },
  }),
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            utils: ['./src/utils/'],
          },
        },
      },
    },
  },
  image: {
    remotePatterns: [{ protocol: "https" }],
    service: squooshImageService(),
  },
});
```

## Integration Development

### Contact Form Implementation
```astro
---
// ContactForm.astro
---
<form id="contact-form" class="space-y-6">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
      <input
        type="text"
        id="name"
        name="name"
        required
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
      />
    </div>
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
      <input
        type="email"
        id="email"
        name="email"
        required
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
      />
    </div>
  </div>

  <div>
    <label for="message" class="block text-sm font-medium text-gray-700">Message</label>
    <textarea
      id="message"
      name="message"
      rows="4"
      required
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
    ></textarea>
  </div>

  <button
    type="submit"
    class="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors"
  >
    Send Message
  </button>
</form>

<script>
  document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Show success message
        alert('Thank you! Your message has been sent.');
        e.target.reset();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      alert('Sorry, there was an error sending your message. Please try again.');
    }
  });
</script>
```

### Analytics Integration
```typescript
// analytics.ts
export class Analytics {
  static init() {
    // Google Analytics 4
    if (import.meta.env.PUBLIC_GA_ID) {
      this.initGA4();
    }

    // CallRail tracking
    if (import.meta.env.PUBLIC_CALLRAIL_ID) {
      this.initCallRail();
    }
  }

  static initGA4() {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.PUBLIC_GA_ID}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', import.meta.env.PUBLIC_GA_ID);
  }

  static trackEvent(eventName: string, parameters: object = {}) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, parameters);
    }
  }

  static trackConversion(conversionId: string, value?: number) {
    this.trackEvent('conversion', {
      send_to: conversionId,
      value: value || 1,
    });
  }
}
```

## Content Migration

### Automated Content Import
```typescript
// contentMigration.ts
import { SanityClient } from '@sanity/client';

export class ContentMigrator {
  constructor(private client: SanityClient) {}

  async migrateFromWebflow(pages: WebflowPage[]) {
    const documents = pages.map(page => ({
      _type: 'page',
      title: page.title,
      slug: { current: page.slug },
      content: this.convertWebflowContent(page.content),
      seo: {
        title: page.seo.title,
        description: page.seo.description,
      },
    }));

    return await this.client.createOrReplace(documents);
  }

  private convertWebflowContent(content: any): any[] {
    // Convert Webflow rich text to Sanity portable text
    return content.map(block => {
      switch (block.type) {
        case 'heading':
          return {
            _type: 'block',
            style: `h${block.level}`,
            children: [{ _type: 'span', text: block.text }],
          };
        case 'paragraph':
          return {
            _type: 'block',
            style: 'normal',
            children: [{ _type: 'span', text: block.text }],
          };
        case 'image':
          return {
            _type: 'image',
            asset: { _type: 'reference', _ref: block.assetId },
            alt: block.alt,
          };
        default:
          return block;
      }
    });
  }
}
```

## Quality Assurance

### Automated Testing
```typescript
// tests/components.test.ts
import { test, expect } from '@playwright/test';

test.describe('Component functionality', () => {
  test('Contact form submits successfully', async ({ page }) => {
    await page.goto('/contact');

    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="message"]', 'Test message');

    await page.click('button[type="submit"]');

    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('Navigation works correctly', async ({ page }) => {
    await page.goto('/');

    await page.click('a[href="/services"]');
    await expect(page).toHaveURL(/.*services/);

    await page.click('a[href="/about"]');
    await expect(page).toHaveURL(/.*about/);
  });
});
```

### Accessibility Testing
```javascript
// accessibility.test.js
import { injectAxe, checkA11y } from 'axe-playwright';

test.beforeEach(async ({ page }) => {
  await injectAxe(page);
});

test('Homepage is accessible', async ({ page }) => {
  await page.goto('/');
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: { html: true },
  });
});
```

## Success Metrics

### Build Quality Standards
- **TypeScript**: Zero type errors in production build
- **Performance**: 90+ Lighthouse scores across all categories
- **Accessibility**: WCAG 2.1 AA compliance
- **SEO**: Proper meta tags and schema markup implementation
- **Mobile**: Perfect responsive design across all breakpoints

### Development Efficiency
- **Component Reusability**: 80%+ component reuse across pages
- **Bundle Size**: < 200KB initial bundle size
- **Build Time**: < 2 minutes for full production build
- **Code Quality**: ESLint and Prettier compliance

### Content Management
- **CMS Usability**: Non-technical users can manage all content
- **Content Types**: Comprehensive schemas for all business needs
- **Editorial Workflow**: Clear preview and publishing process
- **Content Migration**: 100% accurate migration from source platform