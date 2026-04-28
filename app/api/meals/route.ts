import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const meals = await prisma.meal.findMany({
    orderBy: [{ mealType: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ meals });
}
