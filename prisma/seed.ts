import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log(`User already exists (id=${existing.id}), skipping seed.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: "Nisha",
      ageYears: 29,
      sex: "female",
      heightCm: 172.72,
      weightKg: 89,
      diet: "vegetarian",
      raceDate: new Date("2026-07-25T00:00:00Z"),
      goalTimeMinutes: 160,
      currentWeeklyKm: 15,
      longestRecentRunKm: 10.5,
      crossfitDays: "Mon,Wed,Fri",
      runDays: "Thu,Sun",
    },
  });

  console.log(`Seeded user id=${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
