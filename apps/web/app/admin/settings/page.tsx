import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your environment and eBay configuration</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* WooCommerce status */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="font-semibold text-gray-200 mb-3">WooCommerce Connection</h2>
          <div className="flex flex-col gap-2 text-sm">
            {[
              { key: 'WC_BASE_URL', label: 'Base URL' },
              { key: 'WC_CONSUMER_KEY', label: 'Consumer Key' },
              { key: 'WC_CONSUMER_SECRET', label: 'Consumer Secret' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-gray-400">{label}</span>
                <EnvIndicator envKey={key} />
              </div>
            ))}
          </div>
        </div>

        {/* eBay status */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="font-semibold text-gray-200 mb-3">eBay Integration</h2>
          <div className="flex flex-col gap-2 text-sm">
            {[
              { key: 'EBAY_CLIENT_ID', label: 'Client ID' },
              { key: 'EBAY_CLIENT_SECRET', label: 'Client Secret' },
              { key: 'EBAY_MARKETPLACE_ID', label: 'Marketplace ID' },
              { key: 'EBAY_CATEGORY_ID', label: 'Category ID' },
              { key: 'EBAY_MERCHANT_LOCATION_KEY', label: 'Merchant Location Key' },
              { key: 'EBAY_FULFILLMENT_POLICY_ID', label: 'Fulfillment Policy ID' },
              { key: 'EBAY_PAYMENT_POLICY_ID', label: 'Payment Policy ID' },
              { key: 'EBAY_RETURN_POLICY_ID', label: 'Return Policy ID' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-gray-400">{label}</span>
                <EnvIndicator envKey={key} />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-4">
            Set these environment variables in your Railway project dashboard or .env.local file.
          </p>
        </div>

        {/* eBay token test */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="font-semibold text-gray-200 mb-2">Test eBay Connection</h2>
          <p className="text-xs text-gray-500 mb-3">Send a request to verify your eBay credentials are working.</p>
          <a
            href="/api/ebay/token"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
          >
            Test eBay OAuth Token ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function EnvIndicator({ envKey }: { envKey: string }) {
  // This runs server-side, we can check process.env directly
  const isSet = !!(process.env[envKey]);
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSet ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
      {isSet ? '✓ Set' : '✗ Missing'}
    </span>
  );
}
