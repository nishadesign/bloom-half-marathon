-- CreateTable
CREATE TABLE "PlanAdjustment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "overridesJson" TEXT NOT NULL,
    "basedOnFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanAdjustment_userId_weekStart_key" ON "PlanAdjustment"("userId", "weekStart");
