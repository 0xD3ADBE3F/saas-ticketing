"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Register page now redirects to unified login page
 * Magic links handle both login and signup automatically
 */
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth/login");
  }, [router]);

  return null;
}
