-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
