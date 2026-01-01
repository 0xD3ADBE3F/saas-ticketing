/**
 * Settings page - redirect to first tab (billing/invoicing)
 */

import { redirect } from "next/navigation";

export default function SettingsPage() {
  redirect("/dashboard/settings/invoicing");
}
