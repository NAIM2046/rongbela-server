/*
  Warnings:

  - Added the required column `orderId` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Made the column `productId` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('SSLCOMMERZ', 'COD');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "orderId" TEXT NOT NULL,
ALTER COLUMN "weightKg" DROP NOT NULL,
ALTER COLUMN "productId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
