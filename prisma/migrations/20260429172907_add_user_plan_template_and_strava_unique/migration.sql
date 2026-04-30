/*
  Warnings:

  - A unique constraint covering the columns `[stravaAthleteId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "planTemplateKey" TEXT NOT NULL DEFAULT 'nisha';

-- CreateIndex
CREATE UNIQUE INDEX "User_stravaAthleteId_key" ON "User"("stravaAthleteId");
