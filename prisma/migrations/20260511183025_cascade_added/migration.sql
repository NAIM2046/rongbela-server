-- DropForeignKey
ALTER TABLE "OrderPayment" DROP CONSTRAINT "OrderPayment_orderId_fkey";

-- AddForeignKey
ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
