'use client';

import TokenShop from '@/components/TokenShop';

export default function TokenShopPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Token Shop</h1>
          <p className="text-gray-600">
            Spend your earned tokens on rewards and perks. Tokens are earned by completing tasks and building positive traits.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <TokenShop />
        </div>
      </div>
    </div>
  );
}
