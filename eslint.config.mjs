import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/app/api/sync/**",
      "src/app/api/test*/**",
      "src/app/api/debug/**",
      "src/app/api/auth/**",
      "src/app/api/quickbooks/**",
      "src/app/api/webhooks/**",
      "src/app/api/ping/**",
      "src/app/api/health/**",
      "src/app/api/*-data/**",
      "src/app/test-*/**",
      "src/lib/error-handler.ts",
      "src/lib/dashboard-service.ts",
      "src/lib/apollo-client.ts",
      "src/components/dashboard/OpenQuotesWidget.tsx",
      "src/components/dashboard/CallAnalyticsWidget.tsx",
      "src/components/dashboard/DashboardContent.tsx",
      "src/components/dashboard/JobPerformanceWidget.tsx",
    ],
  },
];

export default eslintConfig;
