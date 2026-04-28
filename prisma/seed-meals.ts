import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

const MEALS = [
  // Breakfast
  {
    name: "Moong Daal Cheela",
    mealType: "breakfast",
    portionDescription: "2 cheelas (60g dry moong daal) + mint-coriander chutney",
    calories: 340, proteinGrams: 20, carbsGrams: 40, fatGrams: 10, fiberGrams: 8,
    notes: "Light, high-protein breakfast — great on easy days or pre-CrossFit.",
  },
  {
    name: "Avocado Toast",
    mealType: "breakfast",
    portionDescription: "2 slices whole-grain bread + ½ avocado + optional tofu scramble",
    calories: 420, proteinGrams: 18, carbsGrams: 42, fatGrams: 20, fiberGrams: 10,
    notes: "Carbs + healthy fats — good pre-long-run breakfast.",
  },

  // Main meals (trimmed to ~2,278 kcal target)
  {
    name: "Rajma Chawal",
    mealType: "lunch",
    portionDescription: "¾ cup rajma curry (120g beans) + ¾ cup basmati rice (120g cooked)",
    calories: 520, proteinGrams: 22, carbsGrams: 82, fatGrams: 12, fiberGrams: 12,
    notes: "High-carb — ideal run-day lunch or post-long-run refuel.",
  },
  {
    name: "Choley Chawal",
    mealType: "lunch",
    portionDescription: "¾ cup choley curry (120g chickpeas) + ¾ cup basmati rice (120g cooked)",
    calories: 540, proteinGrams: 21, carbsGrams: 80, fatGrams: 15, fiberGrams: 11,
    notes: "High-carb run-day meal; pair with raita for extra protein.",
  },
  {
    name: "Rajma + 2 Roti",
    mealType: "dinner",
    portionDescription: "¾ cup rajma curry (120g beans) + 2 medium whole-wheat rotis (~35g each)",
    calories: 490, proteinGrams: 22, carbsGrams: 58, fatGrams: 16, fiberGrams: 13,
    notes: "Balanced easy-day dinner.",
  },
  {
    name: "Choley + 2 Roti",
    mealType: "dinner",
    portionDescription: "¾ cup choley curry (120g chickpeas) + 2 medium whole-wheat rotis (~35g each)",
    calories: 510, proteinGrams: 21, carbsGrams: 58, fatGrams: 19, fiberGrams: 12,
    notes: "Balanced easy-day dinner; fiber-rich so avoid right before a run.",
  },
  {
    name: "Soya Chaap + 2 Roti",
    mealType: "dinner",
    portionDescription: "1 cup soya chaap curry (150g cooked) + 2 medium whole-wheat rotis (~35g each)",
    calories: 560, proteinGrams: 38, carbsGrams: 44, fatGrams: 26, fiberGrams: 8,
    notes: "Protein-dense — excellent post-CrossFit recovery dinner.",
  },
  {
    name: "Tofu Fried Rice",
    mealType: "lunch",
    portionDescription: "1 cup fried rice (150g cooked) + 120g pan-fried tofu + mixed veg",
    calories: 590, proteinGrams: 28, carbsGrams: 70, fatGrams: 22, fiberGrams: 5,
    notes: "High-carb + high-protein — strong pre-long-run or post-run lunch.",
  },
  {
    name: "Tofu Hakka Noodles",
    mealType: "dinner",
    portionDescription: "1 cup Hakka noodles (130g cooked) + 120g stir-fried tofu + veg",
    calories: 560, proteinGrams: 30, carbsGrams: 62, fatGrams: 22, fiberGrams: 5,
    notes: "Balanced carbs + protein — good carb-load night before a tempo run.",
  },
  {
    name: "Daal + 2 Roti",
    mealType: "dinner",
    portionDescription: "¾ cup tadka daal (150g cooked lentils) + 2 medium whole-wheat rotis",
    calories: 470, proteinGrams: 22, carbsGrams: 54, fatGrams: 16, fiberGrams: 10,
    notes: "Light, gut-friendly easy-day staple; pair with raita for extra protein.",
  },
  {
    name: "Aloo + Soya Nuggets + 2 Roti",
    mealType: "dinner",
    portionDescription: "1 cup aloo + soya nugget curry (80g potato + 40g dry soya) + 2 rotis",
    calories: 540, proteinGrams: 32, carbsGrams: 64, fatGrams: 18, fiberGrams: 10,
    notes: "Protein-dense — ideal post-CrossFit recovery dinner.",
  },
  {
    name: "Pesto Pasta + Tofu + Bread",
    mealType: "dinner",
    portionDescription: "1 cup pesto pasta (120g cooked) + 120g tofu + 1 slice garlic bread",
    calories: 580, proteinGrams: 32, carbsGrams: 68, fatGrams: 20, fiberGrams: 6,
    notes: "Balanced carb + protein — great recovery dinner.",
  },

  // Side
  {
    name: "Dahi Raita",
    mealType: "side",
    portionDescription: "1 cup low-fat curd (200g) + cucumber/onion + cumin/salt",
    calories: 130, proteinGrams: 8, carbsGrams: 10, fatGrams: 6, fiberGrams: 1,
    notes: "Side — adds protein and probiotics to any rice/roti meal.",
  },

  // Snacks
  {
    name: "Protein Shake (2 scoops)",
    mealType: "snack",
    portionDescription: "2 scoops whey/soy protein (~50g powder) in water or almond milk",
    calories: 240, proteinGrams: 50, carbsGrams: 6, fatGrams: 3, fiberGrams: 0,
    notes: "Fastest way to hit 160g protein target — post-workout or mid-afternoon.",
  },
  {
    name: "Pita Chips + Hummus",
    mealType: "snack",
    portionDescription: "30g pita chips + 3 tbsp hummus (~45g)",
    calories: 250, proteinGrams: 8, carbsGrams: 28, fatGrams: 12, fiberGrams: 4,
    notes: "Crunchy afternoon snack.",
  },
  {
    name: "Nachos + Guacamole",
    mealType: "snack",
    portionDescription: "30g tortilla chips + ½ avocado mashed with lime/salt",
    calories: 280, proteinGrams: 5, carbsGrams: 22, fatGrams: 20, fiberGrams: 7,
    notes: "Higher-fat snack — pair with protein elsewhere in the day.",
  },
  {
    name: "Berries Bowl",
    mealType: "snack",
    portionDescription: "½ cup raspberries + ½ cup strawberries",
    calories: 70, proteinGrams: 2, carbsGrams: 16, fatGrams: 1, fiberGrams: 6,
    notes: "Low-cal antioxidant boost — great pre- or post-run.",
  },
  {
    name: "Banana",
    mealType: "snack",
    portionDescription: "1 medium banana (~120g)",
    calories: 105, proteinGrams: 1, carbsGrams: 27, fatGrams: 0, fiberGrams: 3,
    notes: "Quick pre-run fuel or post-CrossFit carbs.",
  },
  {
    name: "Maggi Noodles (2 packs)",
    mealType: "snack",
    portionDescription: "2 packs Maggi (140g dry) prepared with masala, no added ghee/veg",
    calories: 620, proteinGrams: 12, carbsGrams: 84, fatGrams: 26, fiberGrams: 3,
    notes: "Size of a full meal, not a snack — low protein, high refined carbs+fat. Consider 1 pack (310 kcal) or pair with a boiled egg / tofu / veg to rebalance.",
  },
  {
    name: "Biscuits (5 pcs, glucose/Parle-G)",
    mealType: "snack",
    portionDescription: "5 glucose biscuits (~25g total)",
    calories: 110, proteinGrams: 2, carbsGrams: 17, fatGrams: 4, fiberGrams: 0,
    notes: "Easy quick-carb snack — fits budget but minimal protein; good pre-run carbs if needed.",
  },
  {
    name: "Dark Chocolate (70–85%, 2 squares)",
    mealType: "snack",
    portionDescription: "2 squares (~20g) of 70–85% dark chocolate",
    calories: 115, proteinGrams: 2, carbsGrams: 9, fatGrams: 8, fiberGrams: 2,
    notes: "Dessert-sized treat — fits snack budget. Low protein, so pair with a protein-dense meal that day.",
  },
  {
    name: "Latte (180ml whole milk, 1 tsp sugar)",
    mealType: "snack",
    portionDescription: "60ml espresso + 180ml whole milk, steamed + 1 tsp sugar",
    calories: 130, proteinGrams: 6, carbsGrams: 13, fatGrams: 6, fiberGrams: 0,
    notes: "Pre-run caffeine + carbs. Protein from milk counts toward daily total.",
  },
];

async function main() {
  for (const m of MEALS) {
    await prisma.meal.upsert({
      where: { name: m.name },
      update: m,
      create: m,
    });
  }
  const count = await prisma.meal.count();
  console.log(`Meal library has ${count} items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
