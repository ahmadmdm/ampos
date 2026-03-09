/** @type {import('next').NextConfig} */
const nextConfig = {
	outputFileTracingIncludes: {
		"/api/orders/[orderId]/invoice/route": [
			"../../node_modules/pdfkit/js/data/**/*",
		],
	},
};

export default nextConfig;
