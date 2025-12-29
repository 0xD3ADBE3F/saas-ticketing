import Link from "next/link";

export default async function TestPaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const paymentId = params.id as string | undefined;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Complete!
          </h1>

          <p className="text-gray-600 mb-4">
            Your test payment has been processed successfully.
          </p>

          {paymentId && (
            <p className="text-sm text-gray-500 mb-6">
              Payment ID:{" "}
              <code className="bg-gray-100 px-2 py-1 rounded">{paymentId}</code>
            </p>
          )}

          <div className="space-y-3">
            <Link
              href="/test-payment"
              className="block w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md text-center hover:bg-blue-700 transition-colors"
            >
              Create Another Test Payment
            </Link>

            <Link
              href="/"
              className="block w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-md text-center hover:bg-gray-200 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            What Happened?
          </h2>
          <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
            <li>A payment was created via the Mollie API</li>
            <li>You were redirected to Mollie&apos;s test checkout</li>
            <li>You selected a test payment method (e.g., iDEAL)</li>
            <li>The payment was marked as &quot;paid&quot; in test mode</li>
            <li>You were redirected back here</li>
          </ol>
          <p className="mt-4 text-xs text-gray-500">
            In production, a webhook would be triggered to update order status.
          </p>
        </div>
      </div>
    </div>
  );
}
