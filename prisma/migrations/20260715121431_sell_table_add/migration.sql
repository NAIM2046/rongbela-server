-- CreateTable
CREATE TABLE "pos_sales" (
    "id" TEXT NOT NULL,
    "stockId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalBill" DOUBLE PRECISION NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "buyingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stocks_productName_key" ON "stocks"("productName");

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
