import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className="mb-6">
          <XCircle className="w-16 h-16 mx-auto text-red-600" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Er is iets misgegaan</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          De verificatielink is ongeldig of verlopen. Probeer opnieuw in te
          loggen of vraag een nieuwe verificatiemail aan.
        </p>
        <Button asChild>
          <Link href="/auth/login">Naar inloggen</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
