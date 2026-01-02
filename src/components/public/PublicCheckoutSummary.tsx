"use client";

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface PublicCheckoutSummaryProps {
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  vatAmount?: number;
  total: number;
  isSticky?: boolean;
}

export function PublicCheckoutSummary({
  items,
  subtotal,
  serviceFee,
  vatAmount,
  total,
  isSticky = false,
}: PublicCheckoutSummaryProps) {
  return (
    <div
      className={`public-card border border-gray-200 dark:border-gray-700 ${
        isSticky ? "sticky top-24" : ""
      } divide-y divide-gray-200 dark:divide-gray-700`}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Bestelling
        </h3>
      </div>

      {/* Items */}
      <div className="p-6 space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {item.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {item.quantity}x €{(item.unitPrice / 100).toFixed(2)}
              </p>
            </div>
            <div className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              €{(item.subtotal / 100).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Pricing breakdown */}
      <div className="p-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Subtotaal</span>
          <span className="font-medium text-gray-900 dark:text-white">
            €{(subtotal / 100).toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            Servicekosten (incl. betalingskosten)
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            €{(serviceFee / 100).toFixed(2)}
          </span>
        </div>

        {vatAmount !== undefined && vatAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">BTW (21%)</span>
            <span className="font-medium text-gray-900 dark:text-white">
              €{(vatAmount / 100).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="p-6 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Totaal
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            €{(total / 100).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
