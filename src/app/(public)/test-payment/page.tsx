"use client";

import { useState } from "react";
import { getAppUrl } from "@/lib/env";

export default function TestPaymentPage() {
  const [amount, setAmount] = useState("10.00");
  const [description, setDescription] = useState("Test payment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<{
    id: string;
    checkoutUrl: string;
  } | null>(null);

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPaymentResult(null);

    try {
      const response = await fetch("/api/test-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          description,
          redirectUrl: `${getAppUrl()}/test-payment/success`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment");
      }

      setPaymentResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 Mollie Test Payment
          </h1>

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Test Mode:</strong> This page creates test payments using
              Mollie&apos;s test API. No real money will be charged.
            </p>
          </div>

          <form onSubmit={handleCreatePayment} className="space-y-4">
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Amount (EUR)
              </label>
              <input
                type="text"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.00"
                pattern="^\d+(\.\d{2})?$"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: 10.00 (minimum €1.00)
              </p>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Test payment"
                required
                maxLength={255}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating payment..." : "Create Test Payment"}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {paymentResult && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">
                  ✅ Payment Created
                </h3>
                <p className="text-sm text-green-700">
                  <strong>Payment ID:</strong> {paymentResult.id}
                </p>
              </div>

              <a
                href={paymentResult.checkoutUrl}
                className="block w-full py-3 px-4 bg-green-600 text-white font-medium rounded-md text-center hover:bg-green-700 transition-colors"
              >
                Pay with iDEAL →
              </a>

              <p className="text-xs text-gray-500 text-center">
                You will be redirected to Mollie&apos;s test checkout
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Test Payment Methods
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              <strong>iDEAL:</strong> Select any test bank and choose
              &quot;Paid&quot; status
            </li>
            <li>
              <strong>Credit Card:</strong> Use test card number 4242 4242 4242
              4242
            </li>
            <li>
              <strong>Bancontact:</strong> Test mode automatically approves
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
