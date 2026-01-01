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
  return prisma.invoice.findMany({
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

      {invoices.length === 0 && (
        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium">Nog geen facturen</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Facturen verschijnen hier nadat je evenementen zijn afgelopen.
          </p>
        </div>
      )}
    </div>
  );
}
