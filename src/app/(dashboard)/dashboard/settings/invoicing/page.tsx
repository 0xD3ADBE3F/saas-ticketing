/**
 * Invoicing page - View platform fee invoices for the organization
 * Route: /dashboard/settings/invoicing
 */

import { Suspense } from "react";
import { getUser } from "@/server/lib/supabase";
import { redirect } from "next/navigation";
import { prisma } from "@/server/lib/prisma";
import { InvoiceTable } from "@/components/dashboard/InvoiceTable";

export const metadata = {
  title: "Facturatie | Entro",
  description: "Bekijk je platformfacturen",
};

async function getInvoices(organizationId: string) {
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      invoiceDate: "desc",
    },
  });

  // Convert Decimal to number for client components
  return invoices.map((invoice) => ({
    ...invoice,
    vatRate: Number(invoice.vatRate),
  }));
}

export default async function InvoicesPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's organization
  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
    },
    include: {
      organization: true,
    },
  });

  if (!membership) {
    redirect("/welcome");
  }

  const invoices = await getInvoices(membership.organizationId);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Facturatie</h1>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <Suspense
          fallback={
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Facturen laden...
            </div>
          }
        >
          <InvoiceTable invoices={invoices} />
        </Suspense>
      </div>
    </div>
  );
}
