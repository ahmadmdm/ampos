/** @type {import('next').NextConfig} */
const nextConfig = {
	outputFileTracingIncludes: {
		"/api/orders/[orderId]/invoice/route": [
			"../../node_modules/pdfkit/js/data/**/*",
			// Amiri Arabic font for proper Arabic text rendering
			"./fonts/**/*",
		],
	},
};

export default nextConfig;
