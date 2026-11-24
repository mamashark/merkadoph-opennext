// ESLint flat config for Next.js 16 (see node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md).
// eslint-config-next 16 already exports flat configs, so they are spread in directly (no FlatCompat).
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	{
		rules: {
			// The codebase marks deliberately unused names with a leading underscore (e.g. picking fields out with a rest spread).
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", ignoreRestSiblings: true }],
		},
	},
	globalIgnores([
		// Default ignores of eslint-config-next:
		".next/**",
		"out/**",
		"build/**",
		"next-env.d.ts",
		"playwright-report/**",
		"test-results/**",
		// Generated or not part of the app:
		".open-next/**",
		".wrangler/**",
		"cloudflare-env.d.ts",
		"local/**",
		"public/**",
		// Legacy shop module (local/guidelines.md section 8): switched off and not extended, see src/lib/shop-gate.ts.
		// Only files that nothing outside the shop imports are skipped. Shop files that shared code uses
		// (site shell, proxy, admin dashboard, auth callback, cron, email) are still linted.
		"src/app/(site)/(shop)/**",
		"src/app/admin/shop/**",
		"src/app/api/checkout/**",
		"src/app/api/webhooks/stripe/**",
		"src/app/checkout-actions.ts",
		"src/app/product-feed.xml/**",
		"src/components/admin/order-status.ts",
		"src/components/shop/{add-to-cart,cart-view,catalog,checkout-form,clear-cart,product-card}.tsx", // cart-button.tsx is in the site header
		"src/lib/payment-providers.ts",
		"src/lib/product-feed.ts",
		"src/server/shop/{addresses,auth,checkout,orders,profile,shipping,tax}.ts",
	]),
]);

export default eslintConfig;
