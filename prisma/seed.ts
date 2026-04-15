import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo-restaurant" },
    update: { waiterRelayEnabled: true, prepTimeEstimateMinutes: 18 },
    create: {
      name: "Demo Restaurant",
      slug: "demo-restaurant",
      waiterRelayEnabled: true,
      prepTimeEstimateMinutes: 18,
    },
  });

  let coldAppetizers = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Κρύα ορεκτικά" },
  });
  if (!coldAppetizers) {
    coldAppetizers = await prisma.menuCategory.create({
      data: { name: "Κρύα ορεκτικά", sortOrder: 0, restaurantId: restaurant.id },
    });
  }

  let warmStarters = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Ζεστά ορεκτικά" },
  });
  if (!warmStarters) {
    warmStarters = await prisma.menuCategory.create({
      data: { name: "Ζεστά ορεκτικά", sortOrder: 1, restaurantId: restaurant.id },
    });
  }

  let vegetarian = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Κουζίνα για χορτοφάγους" },
  });
  if (!vegetarian) {
    vegetarian = await prisma.menuCategory.create({
      data: { name: "Κουζίνα για χορτοφάγους", sortOrder: 2, restaurantId: restaurant.id },
    });
  }

  let fishSeafood = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Ψάρια και θαλασσινά" },
  });
  if (!fishSeafood) {
    fishSeafood = await prisma.menuCategory.create({
      data: { name: "Ψάρια και θαλασσινά", sortOrder: 3, restaurantId: restaurant.id },
    });
  }

  let cypriot = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Κυπριακά παραδοσιακά" },
  });
  if (!cypriot) {
    cypriot = await prisma.menuCategory.create({
      data: { name: "Κυπριακά παραδοσιακά", sortOrder: 4, restaurantId: restaurant.id },
    });
  }

  let fillets = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Φιλέτα" },
  });
  if (!fillets) {
    fillets = await prisma.menuCategory.create({
      data: { name: "Φιλέτα", sortOrder: 5, restaurantId: restaurant.id },
    });
  }

  let grilled = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Στη σχάρα" },
  });
  if (!grilled) {
    grilled = await prisma.menuCategory.create({
      data: { name: "Στη σχάρα", sortOrder: 6, restaurantId: restaurant.id },
    });
  }

  let desserts = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Επιδόρπια" },
  });
  if (!desserts) {
    desserts = await prisma.menuCategory.create({
      data: { name: "Επιδόρπια", sortOrder: 7, restaurantId: restaurant.id },
    });
  }

  let pasta = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Μακαρονάδες" },
  });
  if (!pasta) {
    pasta = await prisma.menuCategory.create({
      data: { name: "Μακαρονάδες", sortOrder: 8, restaurantId: restaurant.id },
    });
  }

  let pizza = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Πίτσες" },
  });
  if (!pizza) {
    pizza = await prisma.menuCategory.create({
      data: { name: "Πίτσες", sortOrder: 9, restaurantId: restaurant.id },
    });
  }

  let kids = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Παιδικό μενού" },
  });
  if (!kids) {
    kids = await prisma.menuCategory.create({
      data: { name: "Παιδικό μενού", sortOrder: 10, restaurantId: restaurant.id },
    });
  }

  let cocktails = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Κοκτέιλ" },
  });
  if (!cocktails) {
    cocktails = await prisma.menuCategory.create({
      data: { name: "Κοκτέιλ", sortOrder: 11, restaurantId: restaurant.id },
    });
  }

  let gins = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Gin Clock" },
  });
  if (!gins) {
    gins = await prisma.menuCategory.create({
      data: { name: "Gin Clock", sortOrder: 12, restaurantId: restaurant.id },
    });
  }

  let aperitifs = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Απεριτίφ & λικέρ" },
  });
  if (!aperitifs) {
    aperitifs = await prisma.menuCategory.create({
      data: { name: "Απεριτίφ & λικέρ", sortOrder: 13, restaurantId: restaurant.id },
    });
  }

  let beers = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Μπύρες & σίδερ" },
  });
  if (!beers) {
    beers = await prisma.menuCategory.create({
      data: { name: "Μπύρες & σίδερ", sortOrder: 14, restaurantId: restaurant.id },
    });
  }

  let spirits = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Οινοπνευματώδη" },
  });
  if (!spirits) {
    spirits = await prisma.menuCategory.create({
      data: { name: "Οινοπνευματώδη", sortOrder: 15, restaurantId: restaurant.id },
    });
  }

  let softDrinks = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Αναψυκτικά" },
  });
  if (!softDrinks) {
    softDrinks = await prisma.menuCategory.create({
      data: { name: "Αναψυκτικά", sortOrder: 16, restaurantId: restaurant.id },
    });
  }

  let whiteWine = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Λευκά κρασιά" },
  });
  if (!whiteWine) {
    whiteWine = await prisma.menuCategory.create({
      data: { name: "Λευκά κρασιά", sortOrder: 17, restaurantId: restaurant.id },
    });
  }

  let redWine = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Κόκκινα κρασιά" },
  });
  if (!redWine) {
    redWine = await prisma.menuCategory.create({
      data: { name: "Κόκκινα κρασιά", sortOrder: 18, restaurantId: restaurant.id },
    });
  }

  let medWine = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Ημίξηρα & ημίγλυκα κρασιά" },
  });
  if (!medWine) {
    medWine = await prisma.menuCategory.create({
      data: { name: "Ημίξηρα & ημίγλυκα κρασιά", sortOrder: 19, restaurantId: restaurant.id },
    });
  }

  let roseWine = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Ροζέ κρασιά" },
  });
  if (!roseWine) {
    roseWine = await prisma.menuCategory.create({
      data: { name: "Ροζέ κρασιά", sortOrder: 20, restaurantId: restaurant.id },
    });
  }

  let champagne = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Σαμπάνιες & αφρώδη κρασιά" },
  });
  if (!champagne) {
    champagne = await prisma.menuCategory.create({
      data: { name: "Σαμπάνιες & αφρώδη κρασιά", sortOrder: 21, restaurantId: restaurant.id },
    });
  }

  let houseWine = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Κρασί του σπιτιού" },
  });
  if (!houseWine) {
    houseWine = await prisma.menuCategory.create({
      data: { name: "Κρασί του σπιτιού", sortOrder: 22, restaurantId: restaurant.id },
    });
  }

  let iceCream = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Παγωτά" },
  });
  if (!iceCream) {
    iceCream = await prisma.menuCategory.create({
      data: { name: "Παγωτά", sortOrder: 23, restaurantId: restaurant.id },
    });
  }

  let coffees = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Καφέδες & ζεστά ροφήματα" },
  });
  if (!coffees) {
    coffees = await prisma.menuCategory.create({
      data: { name: "Καφέδες & ζεστά ροφήματα", sortOrder: 24, restaurantId: restaurant.id },
    });
  }

  let iceCoffees = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Κρύοι καφέδες" },
  });
  if (!iceCoffees) {
    iceCoffees = await prisma.menuCategory.create({
      data: { name: "Κρύοι καφέδες", sortOrder: 25, restaurantId: restaurant.id },
    });
  }

  let specialCoffees = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Ειδικοί καφέδες" },
  });
  if (!specialCoffees) {
    specialCoffees = await prisma.menuCategory.create({
      data: { name: "Ειδικοί καφέδες", sortOrder: 26, restaurantId: restaurant.id },
    });
  }

  let salads = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: "Σαλάτες" },
  });
  if (!salads) {
    salads = await prisma.menuCategory.create({
      data: { name: "Σαλάτες", sortOrder: 27, restaurantId: restaurant.id },
    });
  }

  const sizeOption = (small: number, medium: number, large: number) => ({
    id: "size", label: "Μέγεθος", required: true, type: "single" as const,
    choices: [
      { id: "small", label: "Small", priceCents: 0 },
      { id: "medium", label: "Medium", priceCents: (medium - small) * 100 },
      { id: "large", label: "Large", priceCents: (large - small) * 100 },
    ],
  });

  const extraSauce = {
    id: "extra-sauce", label: "Επιπλέον σάλτσα (+€2.00)", required: false, type: "single" as const,
    choices: [
      { id: "pepper", label: "Πιπεράτη", priceCents: 200 },
      { id: "diana", label: "Νταϊάνα", priceCents: 200 },
      { id: "garlic", label: "Σκόρδου", priceCents: 200 },
      { id: "cream", label: "Κρέμας", priceCents: 200 },
    ],
  };

  const mixerOption = {
    id: "mixer", label: "Προσθήκη mixer (+€1.50)", required: false, type: "single" as const,
    choices: [
      { id: "cola", label: "Κόλα", priceCents: 150 },
      { id: "soda", label: "Σόδα", priceCents: 150 },
      { id: "lemonade", label: "Λεμονάδα", priceCents: 150 },
      { id: "tonic", label: "Τόνικ", priceCents: 150 },
      { id: "orange", label: "Χυμός πορτοκάλι", priceCents: 150 },
    ],
  };

  const noOption = (ingredients: string[]) => ({
    id: "remove", label: "Αφαίρεση υλικών", required: false, type: "multi" as const,
    choices: ingredients.map((ing) => ({ id: `no-${ing}`, label: `Χωρίς ${ing}`, priceCents: 0 })),
  });

  type SeedItem = { name: string; description: string; price: number; optionGroups?: string };

  const seedItems: { cat: { id: string }; items: SeedItem[] }[] = [
    { cat: coldAppetizers, items: [
      { name: "Ταραμοσαλάτα", description: "Απαλό ροζ άλειμμα από αυγά ψαριού, κρεμμύδι και ελαιόλαδο.", price: 350 },
      { name: "Ταχίνι", description: "Πολτός από σουσάμι με σκόρδο, αλάτι και λεμόνι.", price: 300 },
      { name: "Παντζαροσαλάτα", description: "Κόκκινα παντζάρια με ελαιόλαδο και ξύδι.", price: 300 },
      { name: "Τζατζίκι", description: "Γιαούρτι με αγγούρι, σκόρδο και δυόσμο.", price: 300 },
      { name: "Χούμους", description: "Πολτός ρεβυθιών με σκόρδο και ελαιόλαδο.", price: 300 },
      { name: "Τυροκαυτερή", description: "Σως από καυτερές πιπεριές, φέτα, γιαούρτι, ελαιόλαδο και λεμόνι.", price: 350 },
      { name: "Ελιές", description: "Κυπριακές ελιές, πράσινες με σκόρδο και κόλιανδρο ή μαύρες ή ανάμεικτες.", price: 300 },
      { name: "Γιαούρτι", description: "Παραδοσιακό γιαούρτι από φρέσκο γάλα.", price: 300 },
      { name: "Φέτα", description: "Λευκό μαλακό τυρί.", price: 300 },
      { name: "Γαρίδες κοκτέιλ", description: "Μικρές γαρίδες με τραγανό μαρούλι και σως θαλασσινών.", price: 550 },
      { name: "Αβοκάντο με γαρίδες", description: "Αβοκάντο με γαρίδες και σως θαλασσινών.", price: 650 },
      { name: "Πίτα", description: "Πίτα με ελαιόλαδο και ρίγανη.", price: 100 },
    ]},
    { cat: warmStarters, items: [
      { name: "Λουκάνικο", description: "Παραδοσιακό σπιτικό λουκάνικο.", price: 450 },
      { name: "Μανιτάρια με σάλτσα σκόρδου", description: "Μανιτάρια σε βούτυρο σκόρδου και σάλτσα κρέμας.", price: 700,
        optionGroups: JSON.stringify([noOption(["μανιτάρια", "βούτυρο σκόρδου", "σάλτσα κρέμας"])]) },
      { name: "Χαλλούμι", description: "Ψητό κυπριακό λευκό κατσικίσιο τυρί.", price: 450 },
      { name: "Σαγανάκι με μέλι", description: "Τηγανητή φέτα με μέλι και βότανα.", price: 700,
        optionGroups: JSON.stringify([noOption(["φέτα", "μέλι", "βότανα"])]) },
      { name: "Λούντζα", description: "Παραδοσιακό καπνιστό κυπριακό χοιρινό φιλέτο.", price: 450 },
      { name: "Γαρίδες σαγανάκι", description: "Γαρίδες μαγειρεμένες σε πλούσια σάλτσα ντομάτας με φέτα και ελαιόλαδο.", price: 800,
        optionGroups: JSON.stringify([noOption(["γαρίδες", "σάλτσα ντομάτας", "φέτα", "ελαιόλαδο"])]) },
      { name: "Κουπέπια", description: "Αμπελόφυλλα γεμιστά με ρύζι, χοιρινό κιμά και μπαχαρικά.", price: 550 },
      { name: "Μύδια", description: "Μεγάλα μύδια μαγειρεμένα σε λευκό κρασί και βούτυρο σκόρδου.", price: 700,
        optionGroups: JSON.stringify([noOption(["μύδια", "λευκό κρασί", "βούτυρο σκόρδου"])]) },
      { name: "Κολοκύθια με αυγά", description: "Σοταρισμένα κολοκύθια με παρθένο ελαιόλαδο και αυγά.", price: 500,
        optionGroups: JSON.stringify([noOption(["κολοκύθια", "ελαιόλαδο", "αυγά"])]) },
      { name: "Σκορδόψωμο", description: "Ψητή πίτα με φρέσκο σκόρδο και βούτυρο.", price: 300,
        optionGroups: JSON.stringify([noOption(["σκόρδο", "βούτυρο"])]) },
      { name: "Τουρλού", description: "Τηγανητά κολοκύθια, κρεμμύδια, μελιτζάνες και πιπεριές σε σάλτσα φρέσκιας ντομάτας.", price: 500,
        optionGroups: JSON.stringify([noOption(["κολοκύθια", "κρεμμύδια", "μελιτζάνες", "πιπεριές", "σάλτσα ντομάτας"])]) },
      { name: "Μύδια σαγανάκι", description: "Μύδια μαγειρεμένα με φέτα και σάλτσα ντομάτας με βότανα.", price: 800,
        optionGroups: JSON.stringify([noOption(["μύδια", "φέτα", "σάλτσα ντομάτας", "βότανα"])]) },
      { name: "Καλαμάρι τηγανιτό", description: "Τηγανητό καλαμάρι.", price: 750 },
      { name: "Σούπα της ημέρας", description: "Ρωτήστε για τη διαθέσιμη σούπα ημέρας.", price: 500 },
      { name: "Μελιτζάνες με σκόρδο", description: "Σοταρισμένες φέτες μελιτζάνας με παρθένο ελαιόλαδο, φρέσκο σκόρδο και βούτυρο.", price: 500,
        optionGroups: JSON.stringify([noOption(["μελιτζάνα", "ελαιόλαδο", "σκόρδο", "βούτυρο"])]) },
    ]},
    { cat: fishSeafood, items: [
      { name: "Ψαρομεζέδες", description: "Ποικιλία θαλασσινών (ελάχιστη παραγγελία 2 άτομα). Τιμή ανά άτομο.", price: 2200 },
      { name: "Τσιπούρα σχάρας", description: "Φρέσκια τσιπούρα με ρίγανη και ελαιόλαδο.", price: 1500,
        optionGroups: JSON.stringify([noOption(["ρίγανη", "ελαιόλαδο"])]) },
      { name: "Λαυράκι", description: "Φρέσκο λαυράκι με ρίγανη και ελαιόλαδο.", price: 1500,
        optionGroups: JSON.stringify([noOption(["ρίγανη", "ελαιόλαδο"])]) },
      { name: "Ξιφίας σχάρας", description: "Φρέσκο φιλέτο ξιφία με ρίγανη και ελαιόλαδο.", price: 1600,
        optionGroups: JSON.stringify([noOption(["ρίγανη", "ελαιόλαδο"])]) },
      { name: "Σολομός", description: "Μαγειρεμένος στη σχάρα, μπορεί να συνοδευτεί από σάλτσα κρέμας του σεφ.", price: 1500,
        optionGroups: JSON.stringify([noOption(["σάλτσα κρέμας"])]) },
      { name: "Γαρίδες Ακάμα", description: "Ψητές ή τηγανητές γαρίδες με βούτυρο σκόρδου.", price: 1500,
        optionGroups: JSON.stringify([noOption(["βούτυρο σκόρδου"])]) },
      { name: "Μύδια", description: "Τηγανητά μύδια με βούτυρο σκόρδου.", price: 1400,
        optionGroups: JSON.stringify([noOption(["βούτυρο σκόρδου"])]) },
      { name: "Καλαμάρι τηγανητό", description: "Με φέτες λεμονιού.", price: 1400,
        optionGroups: JSON.stringify([noOption(["λεμόνι"])]) },
      { name: "Καλαμάρι στη σχάρα", description: "Με σάλτσα λεμονιού, ελαιόλαδο και βότανα.", price: 1700,
        optionGroups: JSON.stringify([noOption(["σάλτσα λεμονιού", "ελαιόλαδο", "βότανα"])]) },
      { name: "Οχταπόδι", description: "Ψημένο με την ειδική συνταγή του σεφ.", price: 1600 },
    ]},
    { cat: whiteWine, items: [
      // Κύπρος
      { name: "Vasilikon – Vasilissa", description: "Ποικιλία Βασίλισσα, Κάθηκας. 750ml.", price: 2800 },
      { name: "Vasilikon – Vasilikon", description: "Ποικιλία Ξυνιστέρι, Κάθηκας. 750ml.", price: 2000 },
      { name: "Vasilikon – Omma", description: "Sauvignon Blanc, Κάθηκας. 750ml.", price: 3500 },
      { name: "Vouni Panayia – Alina (λευκό)", description: "Ποικιλία Ξυνιστέρι, Παναγιά.", price: 450,
        optionGroups: JSON.stringify([{ id: "size", label: "Μέγεθος", required: true, type: "single", choices: [
          { id: "187ml", label: "187ml", priceCents: 0 },
          { id: "750ml", label: "750ml", priceCents: 1550 },
        ]}]) },
      { name: "Vouni Panayia – Promara", description: "Ποικιλία Προμάρα, Παναγιά. 750ml.", price: 3500 },
      { name: "Kolios – Persefoni", description: "Ποικιλία Ξυνιστέρι, Στατός.", price: 450,
        optionGroups: JSON.stringify([{ id: "size", label: "Μέγεθος", required: true, type: "single", choices: [
          { id: "187ml", label: "187ml", priceCents: 0 },
          { id: "750ml", label: "750ml", priceCents: 1550 },
        ]}]) },
      { name: "Kolios – Iris", description: "Ποικιλία Σπούρτικο, Στατός. 750ml.", price: 2800 },
      { name: "Kyperounda – Petrites", description: "Ποικιλία Ξυνιστέρι, Κυπερούντα. 750ml.", price: 2400 },
      { name: "Kyperounda – Alimos", description: "Chardonnay, Κυπερούντα. 750ml.", price: 3000 },
      { name: "Tsiakkas – Sauvignon Blanc", description: "Sauvignon Blanc, Πελένδρι. 750ml.", price: 2700 },
      { name: "Sterna – Kelaidonis", description: "Semillon, Κάθηκας. 750ml.", price: 2200 },
      // Εισαγόμενα
      { name: "Chablis – Domaine Servin", description: "Chardonnay, Γαλλία. 750ml.", price: 4500 },
      { name: "Bourgogne – Bouchard Père & Fils", description: "Chardonnay, Γαλλία. 750ml.", price: 4500 },
      { name: "Bishop's Leap – Sauvignon Blanc", description: "Marlborough, Νέα Ζηλανδία. 750ml.", price: 3000 },
      { name: "Montes – Chardonnay", description: "Central Valley, Χιλή. 750ml.", price: 2500 },
      { name: "Bertani Velante – Pinot Grigio", description: "Veneto, Ιταλία. 750ml.", price: 2300 },
      { name: "Boutari – Μοσχοφίλερο", description: "Naoussa, Ελλάδα.", price: 500,
        optionGroups: JSON.stringify([{ id: "size", label: "Μέγεθος", required: true, type: "single", choices: [
          { id: "187ml", label: "187ml", priceCents: 0 },
          { id: "750ml", label: "750ml", priceCents: 1800 },
        ]}]) },
    ]},
    { cat: redWine, items: [
      // Κύπρος
      { name: "Vasilikon – Agios Onoufrios", description: "Ανάμικτη ποικιλία, Κάθηκας. 750ml.", price: 2000 },
      { name: "Vasilikon – Aeon", description: "Μαραθεύτικο, Κάθηκας. 750ml.", price: 3500 },
      { name: "Vasilikon – Methi", description: "Cabernet Sauvignon, Κάθηκας. 750ml.", price: 4000 },
      { name: "Kyperounda – Andesites", description: "Ανάμικτη ποικιλία. 750ml.", price: 2400 },
      { name: "Kyperounda – Psila Klimata", description: "Cabernet Sauvignon. 750ml.", price: 3000 },
      { name: "Kolios – Ayios Fotios", description: "Ανάμικτη ποικιλία, Στατός.", price: 450,
        optionGroups: JSON.stringify([{ id: "size", label: "Μέγεθος", required: true, type: "single", choices: [
          { id: "187ml", label: "187ml", priceCents: 0 },
          { id: "750ml", label: "750ml", priceCents: 1550 },
        ]}]) },
      { name: "Kolios – Statos", description: "Shiraz, Στατός. 750ml.", price: 3500 },
      { name: "Vouni Panayia – Barba Yiannis", description: "Μαραθεύτικο, Παναγιά. 750ml.", price: 5000 },
      { name: "Vouni Panayia – Yiannoudi", description: "Ποικιλία Γιαννούδι, Παναγιά. 750ml.", price: 5000 },
      { name: "Vlassides – Shiraz", description: "Shiraz, Κοιλάνι. 750ml.", price: 3000 },
      { name: "Vlassides – Artion", description: "Ανάμικτη ποικιλία, Κοιλάνι. 750ml.", price: 6000 },
      { name: "Makkas – Merlot", description: "Merlot, Στατός. 750ml.", price: 2700 },
      // Εισαγόμενα
      { name: "Domaine Denis Carré – Pinot Noir", description: "Bourgogne, Γαλλία. 750ml.", price: 5000 },
      { name: "Le Tours Seguy – Merlot", description: "Bordeaux, Γαλλία. 750ml.", price: 3000 },
      { name: "Purple Angel – Carménère", description: "Colchagua Valley, Χιλή. 750ml.", price: 13000 },
      { name: "Alpha – Cabernet Sauvignon", description: "Colchagua Valley, Χιλή. 750ml.", price: 4500 },
      { name: "Bertani – Ripasso", description: "Valpolicella, Ιταλία. 750ml.", price: 3600 },
      { name: "Castello Banfi – Chianti", description: "Ανάμικτη ποικιλία, Ιταλία. 750ml.", price: 2500 },
    ]},
    { cat: medWine, items: [
      { name: "Vouni Panayia – Alina (ημίξηρο)", description: "Ξυνιστέρι, ημίξηρο.", price: 450,
        optionGroups: JSON.stringify([{ id: "size", label: "Μέγεθος", required: true, type: "single", choices: [
          { id: "187ml", label: "187ml", priceCents: 0 },
          { id: "750ml", label: "750ml", priceCents: 1550 },
        ]}]) },
      { name: "Kolios – Status99", description: "Ανάμικτη ποικιλία, ημίξηρο. 750ml.", price: 2000 },
      { name: "Fikardos – Katerina", description: "Ξυνιστέρι & Semillon, ημίγλυκο. 750ml.", price: 2000 },
      { name: "Sterna (ημίγλυκο)", description: "Ανάμικτη ποικιλία, ημίγλυκο. 187ml.", price: 450 },
      { name: "Avakas – Cornelious", description: "Ανάμικτη ποικιλία, ημίγλυκο. 187ml.", price: 450 },
    ]},
    { cat: roseWine, items: [
      { name: "Vasilikon – Εινάλια", description: "Μαραθεύτικο & Shiraz. 750ml.", price: 2400 },
      { name: "Fikardos – Valentina", description: "Cab. Sauvignon, Mataro & Shiraz. 750ml.", price: 2200 },
      { name: "Kalamos – Demetra", description: "Cabernet Sauvignon. 750ml.", price: 2000 },
      { name: "Sterna (ροζέ)", description: "Ανάμικτη ποικιλία.", price: 450,
        optionGroups: JSON.stringify([{ id: "size", label: "Μέγεθος", required: true, type: "single", choices: [
          { id: "187ml", label: "187ml", priceCents: 0 },
          { id: "750ml", label: "750ml", priceCents: 1550 },
        ]}]) },
      { name: "Vouni Panayia – Pampela", description: "Μαύρο & Ξυνιστέρι. 750ml.", price: 2000 },
      { name: "Ezousa – Eros", description: "Μαραθεύτικο. 750ml.", price: 2800 },
      { name: "Eagle Creek – Zinfandel", description: "ΗΠΑ. 750ml.", price: 2000 },
      { name: "Montes Cherub – Syrah & Grenache", description: "Χιλή. 750ml.", price: 2000 },
      { name: "Mateus – Sogrape", description: "Ανάμικτη ποικιλία, Πορτογαλία. 750ml.", price: 2000 },
    ]},
    { cat: champagne, items: [
      { name: "Dom Pérignon Brut", description: "750ml.", price: 35000 },
      { name: "Veuve Clicquot Rosé Brut NV", description: "750ml.", price: 15000 },
      { name: "Moët & Chandon Rosé Impérial NV", description: "750ml.", price: 15000 },
      { name: "Veuve Clicquot Yellow Label Brut NV", description: "750ml.", price: 13500 },
      { name: "Moët & Chandon Brut Impérial NV", description: "750ml.", price: 13500 },
      { name: "Martini Brut / Asti", description: "NV.", price: 2500,
        optionGroups: JSON.stringify([{ id: "type", label: "Τύπος", required: true, type: "single", choices: [
          { id: "brut", label: "Brut", priceCents: 0 },
          { id: "asti", label: "Asti", priceCents: 0 },
        ]}]) },
      { name: "Beato Bartolomeo Prosecco NV", description: "750ml.", price: 2200 },
      { name: "Maschio Prosecco NV", description: "Prosecco.", price: 650,
        optionGroups: JSON.stringify([{ id: "size", label: "Μέγεθος", required: true, type: "single", choices: [
          { id: "200ml", label: "200ml", priceCents: 0 },
          { id: "750ml", label: "750ml", priceCents: 1350 },
        ]}]) },
      { name: "Henkell Trocken", description: "Αφρώδες. 200ml.", price: 600 },
    ]},
    { cat: coffees, items: [
      { name: "Κυπριακός καφές", description: "", price: 200 },
      { name: "Νεσκαφέ", description: "", price: 250 },
      { name: "Φίλτρου", description: "Filter coffee.", price: 300 },
      { name: "Εσπρέσο", description: "", price: 250 },
      { name: "Διπλός εσπρέσο", description: "", price: 350 },
      { name: "Καπουτσίνο", description: "", price: 350 },
      { name: "Λάτε", description: "", price: 350 },
      { name: "Τσάι", description: "", price: 250 },
    ]},
    { cat: iceCoffees, items: [
      { name: "Φραπέ", description: "", price: 350 },
      { name: "Freddo espresso", description: "", price: 400 },
      { name: "Freddo cappuccino", description: "", price: 450 },
    ]},
    { cat: specialCoffees, items: [
      { name: "Cyprus coffee", description: "Με ζιβανία και φρέσκια κρέμα.", price: 600 },
      { name: "Calypso", description: "Με Tia Maria και φρέσκια κρέμα.", price: 600 },
      { name: "Irish coffee", description: "Με ουίσκι και φρέσκια κρέμα.", price: 600 },
      { name: "Royal coffee", description: "Με μπράντι και φρέσκια κρέμα.", price: 600 },
      { name: "Lumumba", description: "Ζεστή σοκολάτα με brandy και φρέσκια κρέμα.", price: 600 },
    ]},
    { cat: iceCream, items: [
      { name: "Ανάμικτο παγωτό", description: "4 μπάλες της επιλογής σας με φρέσκια κρέμα.", price: 500,
        optionGroups: JSON.stringify([{ id: "flavours", label: "Γεύσεις (επιλέξτε 4)", required: true, type: "multi", choices: [
          { id: "banana", label: "Μπανάνα", priceCents: 0 },
          { id: "strawberry", label: "Φράουλα", priceCents: 0 },
          { id: "vanilla", label: "Βανίλια", priceCents: 0 },
          { id: "chocolate", label: "Σοκολάτα", priceCents: 0 },
        ]}]) },
      { name: "Banana split", description: "Φρέσκια μπανάνα και παγωτό με φρέσκια κρέμα.", price: 500 },
      { name: "Special ice cream", description: "Ανάμικτο παγωτό με λικέρ φράουλας, Blue Curaçao και φρέσκια κρέμα.", price: 600 },
    ]},
    { cat: houseWine, items: [
      { name: "Κρασί του σπιτιού (ποτήρι)", description: "187ml.", price: 350,
        optionGroups: JSON.stringify([{ id: "colour", label: "Χρώμα", required: true, type: "single", choices: [
          { id: "white", label: "Λευκό", priceCents: 0 },
          { id: "red", label: "Κόκκινο", priceCents: 0 },
          { id: "rose", label: "Ροζέ", priceCents: 0 },
        ]}]) },
      { name: "Κρασί του σπιτιού (καράφα 0.5L)", description: "Καράφα 0.5 Lt.", price: 700,
        optionGroups: JSON.stringify([{ id: "colour", label: "Χρώμα", required: true, type: "single", choices: [
          { id: "white", label: "Λευκό", priceCents: 0 },
          { id: "red", label: "Κόκκινο", priceCents: 0 },
          { id: "rose", label: "Ροζέ", priceCents: 0 },
        ]}]) },
      { name: "Κρασί του σπιτιού (καράφα 1L)", description: "Καράφα 1 Lt.", price: 1300,
        optionGroups: JSON.stringify([{ id: "colour", label: "Χρώμα", required: true, type: "single", choices: [
          { id: "white", label: "Λευκό", priceCents: 0 },
          { id: "red", label: "Κόκκινο", priceCents: 0 },
          { id: "rose", label: "Ροζέ", priceCents: 0 },
        ]}]) },
    ]},
    { cat: softDrinks, items: [
      { name: "Coca Cola", description: "25cl.", price: 250 },
      { name: "Sprite", description: "25cl.", price: 250 },
      { name: "Fanta", description: "25cl.", price: 250 },
      { name: "Ice Tea", description: "25cl.", price: 250 },
      { name: "Φρέσκος χυμός πορτοκάλι", description: "Φρεσκοστυμμένος.", price: 300 },
      { name: "Χυμός φρούτων", description: "Διάφορες γεύσεις.", price: 250,
        optionGroups: JSON.stringify([{ id: "flavour", label: "Γεύση", required: true, type: "single", choices: [
          { id: "mixed", label: "Ανάμικτος", priceCents: 0 },
          { id: "apple", label: "Μήλο", priceCents: 0 },
          { id: "orange", label: "Πορτοκάλι", priceCents: 0 },
        ]}]) },
      { name: "Μεταλλικό νερό", description: "Φυσικό μεταλλικό νερό.", price: 100,
        optionGroups: JSON.stringify([{ id: "size", label: "Μέγεθος", required: true, type: "single", choices: [
          { id: "500ml", label: "0.5L", priceCents: 0 },
          { id: "1L", label: "1L", priceCents: 100 },
        ]}]) },
      { name: "Αεριούχο νερό", description: "Sparkling.", price: 200,
        optionGroups: JSON.stringify([{ id: "size", label: "Μέγεθος", required: true, type: "single", choices: [
          { id: "330ml", label: "0.33L", priceCents: 0 },
          { id: "750ml", label: "0.75L", priceCents: 150 },
        ]}]) },
      { name: "Milk shake", description: "Διάφορες γεύσεις.", price: 400,
        optionGroups: JSON.stringify([{ id: "flavour", label: "Γεύση", required: true, type: "single", choices: [
          { id: "vanilla", label: "Βανίλια", priceCents: 0 },
          { id: "chocolate", label: "Σοκολάτα", priceCents: 0 },
          { id: "strawberry", label: "Φράουλα", priceCents: 0 },
          { id: "banana", label: "Μπανάνα", priceCents: 0 },
        ]}]) },
    ]},
    { cat: spirits, items: [
      { name: "Ουίσκι J&B", description: "3cl.", price: 350,
        optionGroups: JSON.stringify([mixerOption]) },
      { name: "Ουίσκι Red Label", description: "3cl.", price: 350,
        optionGroups: JSON.stringify([mixerOption]) },
      { name: "Ουίσκι Famous Grouse", description: "3cl.", price: 350,
        optionGroups: JSON.stringify([mixerOption]) },
      { name: "Ουίσκι Chivas", description: "3cl.", price: 500,
        optionGroups: JSON.stringify([mixerOption]) },
      { name: "Ουίσκι Black Label", description: "3cl.", price: 500,
        optionGroups: JSON.stringify([mixerOption]) },
      { name: "Βότκα Standard", description: "3cl.", price: 350,
        optionGroups: JSON.stringify([mixerOption]) },
      { name: "Βότκα Grey Goose", description: "Premium, 3cl.", price: 500,
        optionGroups: JSON.stringify([mixerOption]) },
      { name: "Ρούμι", description: "3cl.", price: 350,
        optionGroups: JSON.stringify([mixerOption]) },
      { name: "Τεκίλα", description: "3cl.", price: 350,
        optionGroups: JSON.stringify([mixerOption]) },
    ]},
    { cat: beers, items: [
      { name: "KEO βαρελίσια", description: "Βαρελίσια μπύρα.", price: 250,
        optionGroups: JSON.stringify([{ id: "size", label: "Μέγεθος", required: true, type: "single", choices: [
          { id: "250ml", label: "250ml", priceCents: 0 },
          { id: "500ml", label: "500ml", priceCents: 100 },
        ]}]) },
      { name: "KEO μπουκάλι", description: "Μπουκάλι 630ml.", price: 400 },
      { name: "Carlsberg", description: "Μπουκάλι 630ml.", price: 400 },
      { name: "Leon", description: "Μπουκάλι 630ml.", price: 400 },
      { name: "Heineken", description: "Μπουκάλι.", price: 400 },
      { name: "Guinness", description: "Μπουκάλι.", price: 400 },
      { name: "Μπύρα χωρίς αλκοόλ", description: "Μπύρα χωρίς αλκοόλ.", price: 300 },
      { name: "Strongbow", description: "Cider.", price: 450 },
      { name: "Kopparberg", description: "Cider.", price: 450 },
    ]},
    { cat: aperitifs, items: [
      { name: "Martini", description: "3cl.", price: 400,
        optionGroups: JSON.stringify([{ id: "type", label: "Τύπος", required: true, type: "single", choices: [
          { id: "dry", label: "Dry", priceCents: 0 },
          { id: "rosso", label: "Rosso", priceCents: 0 },
          { id: "bianco", label: "Bianco", priceCents: 0 },
        ]}]) },
      { name: "Campari", description: "3cl.", price: 400 },
      { name: "Κουμανδαρία", description: "3cl.", price: 400 },
      { name: "Ούζο", description: "3cl.", price: 300 },
      { name: "Baileys", description: "3cl.", price: 400 },
      { name: "Tia Maria", description: "3cl.", price: 400 },
      { name: "Disaronno", description: "3cl.", price: 400 },
      { name: "Μαστίχα", description: "3cl.", price: 300 },
      { name: "Ζιβανία", description: "3cl.", price: 250 },
    ]},
    { cat: gins, items: [
      { name: "Monkey 47", description: "Premium gin (47%).", price: 750 },
      { name: "Silent Pool", description: "Premium gin (43%).", price: 600 },
      { name: "Bombay Sapphire", description: "Premium gin (40%).", price: 400 },
      { name: "Hendricks", description: "Premium gin (41.4%).", price: 600 },
      { name: "The Botanist", description: "Premium gin (46%).", price: 600 },
      { name: "Tanqueray No.10", description: "Premium gin (47.3%).", price: 600 },
      { name: "Gin Mare", description: "Premium gin (42.7%).", price: 500 },
      { name: "Whitley Neill", description: "Διάφορες γεύσεις.", price: 450,
        optionGroups: JSON.stringify([{ id: "flavour", label: "Γεύση", required: true, type: "single", choices: [
          { id: "rhubarb-ginger", label: "Rhubarb & Ginger", priceCents: 0 },
          { id: "raspberry", label: "Raspberry", priceCents: 0 },
          { id: "original", label: "Original", priceCents: 0 },
        ]}]) },
      { name: "Gordon's", description: "London Dry ή Pink.", price: 350,
        optionGroups: JSON.stringify([{ id: "type", label: "Τύπος", required: true, type: "single", choices: [
          { id: "london-dry", label: "London Dry", priceCents: 0 },
          { id: "pink", label: "Pink", priceCents: 0 },
        ]}]) },
    ]},
    { cat: cocktails, items: [
      { name: "Gin Fizz", description: "Τζιν, σκουός λεμονιού και σόδα.", price: 500 },
      { name: "Sex on the Beach", description: "Βότκα, peach schnapps, χυμός πορτοκάλι και γρεναδίνη.", price: 600 },
      { name: "Pina Colada", description: "Λευκό ρούμι, malibu, χυμός ανανά και κρέμα καρύδας.", price: 700 },
      { name: "Long Island Iced Tea", description: "Ρούμι, τεκίλα, βότκα, τζιν, σκουός λεμονιού και κόλα.", price: 700 },
      { name: "Blue Lagoon", description: "Βότκα, Blue Curaçao και λεμονάδα.", price: 600 },
      { name: "Aperol Spritz", description: "Aperol, prosecco και σόδα.", price: 700 },
      { name: "Screwdriver", description: "Βότκα και χυμός πορτοκάλι.", price: 500 },
      { name: "Brandy Sour", description: "Μπράντι, σκουός λεμονιού, σόδα και angostura bitters.", price: 500 },
      { name: "Ouzo Special", description: "Ούζο, λεμονάδα και γρεναδίνη.", price: 500 },
      { name: "Tequila Sunrise", description: "Τεκίλα, χυμός πορτοκάλι και γρεναδίνη.", price: 500 },
      { name: "Bloody Mary", description: "Βότκα, χυμός ντομάτας, tabasco και σάλτσα worcestershire.", price: 600 },
    ]},
    { cat: kids, items: [
      { name: "Κοτόπουλο μπουκιές", description: "Χρυσαφένιες τραγανές κοτομπουκιές με σπιτικές τηγανητές πατάτες.", price: 700 },
      { name: "Παναρισμένες γαρίδες", description: "Τραγανές γαρίδες με σπιτικές τηγανητές πατάτες.", price: 1000 },
      { name: "Μπέργκερ", description: "Ζουμερό μπιφτέκι με σπιτικές τηγανητές πατάτες.", price: 800,
        optionGroups: JSON.stringify([{ id: "cheese", label: "Έξτρα τυρί", required: false, type: "single", choices: [
          { id: "add-cheese", label: "Με τυρί (+€1.00)", priceCents: 100 },
        ]}]) },
      { name: "Mickey Mouse", description: "Παγωτό με κόλα και φρέσκια κρέμα.", price: 500 },
      { name: "Donald Duck", description: "Χυμός πορτοκάλι, χυμός ανανά και λεμονάδα.", price: 400 },
    ]},
    { cat: pizza, items: [
      { name: "Πίτσα ανάμικτη", description: "Πλούσια επικάλυψη με ζαμπόν, μπέικον, μανιτάρια, κρεμμύδια, πιπεριές, σάλτσα ντομάτας και τυρί σε τραγανή βάση.", price: 1200,
        optionGroups: JSON.stringify([noOption(["ζαμπόν", "μπέικον", "μανιτάρια", "κρεμμύδια", "πιπεριές", "σάλτσα ντομάτας", "τυρί"])]) },
      { name: "Πίτσα μαργαρίτα", description: "Απλός και γευστικός συνδυασμός τυριού και σάλτσας ντομάτας σε τραγανή βάση.", price: 1200,
        optionGroups: JSON.stringify([noOption(["τυρί", "σάλτσα ντομάτας"])]) },
      { name: "Πίτσα λαχανικών", description: "Τραγανή βάση με τυρί και λαχανικά εποχής.", price: 1200,
        optionGroups: JSON.stringify([noOption(["τυρί", "λαχανικά"])]) },
    ]},
    { cat: pasta, items: [
      { name: "Μακαρόνια ναπολιτάνα", description: "Αυθεντικά ιταλικά ζυμαρικά με σάλτσα φρέσκιας ντομάτας και βότανα.", price: 1200,
        optionGroups: JSON.stringify([noOption(["σάλτσα ντομάτας", "βότανα"])]) },
      { name: "Μακαρόνια μπολωνέζ", description: "Ιταλικά μακαρόνια με κιμά μαγειρεμένο σε σάλτσα ντομάτας και τοπικά βότανα.", price: 1200,
        optionGroups: JSON.stringify([noOption(["κιμά", "σάλτσα ντομάτας", "βότανα"])]) },
      { name: "Μακαρόνια καρμπονάρα", description: "Ιταλικά μακαρόνια με σάλτσα από μανιτάρια, ζαμπόν, μπέικον, κρεμμύδια και κρέμα γάλακτος.", price: 1200,
        optionGroups: JSON.stringify([noOption(["μανιτάρια", "ζαμπόν", "μπέικον", "κρεμμύδια", "κρέμα γάλακτος"])]) },
      { name: "Μακαρόνια με θαλασσινά", description: "Μακαρόνια σε σάλτσα κρέμας ή ντομάτας συνοδευόμενα από μύδια και γαρίδες.", price: 1600,
        optionGroups: JSON.stringify([
          { id: "sauce", label: "Σάλτσα", required: true, type: "single", choices: [
            { id: "cream", label: "Σάλτσα κρέμας", priceCents: 0 },
            { id: "tomato", label: "Σάλτσα ντομάτας", priceCents: 0 },
          ]},
          noOption(["μύδια", "γαρίδες"]),
        ]) },
    ]},
    { cat: desserts, items: [
      { name: "Lava cake", description: "Σερβίρεται με παγωτό.", price: 600 },
      { name: "Σοκολατίνα", description: "Chocolate cake.", price: 450 },
      { name: "Μους σοκολάτας", description: "Chocolate mousse.", price: 450 },
      { name: "Cheesecake", description: "", price: 450 },
      { name: "Γιαούρτι με μέλι", description: "", price: 400 },
      { name: "Μπακλαβάς", description: "Σπιτικό φύλλο γεμιστό με ψιλοκομμένους ξηρούς καρπούς και σιρόπι.", price: 450 },
      { name: "Αχλάδι ποσέ", description: "Σιγομαγειρεμένο σε πλούσιο σιρόπι φραγκοστάφυλου, σερβίρεται με παγωτό.", price: 600 },
      { name: "Κέικ καρότου", description: "Carrot cake.", price: 450 },
      { name: "Κρέμα καραμελέ", description: "Caramel cream.", price: 400 },
      { name: "Επιπλέον μπάλα παγωτό", description: "", price: 150 },
    ]},
    { cat: grilled, items: [
      { name: "Μεζές κρεατικών", description: "Ποικιλία κρεατικών (ελάχιστη παραγγελία 2 άτομα). Τιμή ανά άτομο.", price: 2000 },
      { name: "Σεφταλιές", description: "Παραδοσιακά χοιρινά ρολά με μπαχαρικά.", price: 1400 },
      { name: "Διάφορα σχάρας", description: "Σουβλάκι, σεφταλιά, αρνίσιο παϊδάκι, πανσέτα, λουκάνικο και χαλλούμι.", price: 1600,
        optionGroups: JSON.stringify([noOption(["σουβλάκι", "σεφταλιά", "παϊδάκι", "πανσέτα", "λουκάνικο", "χαλλούμι"])]) },
      { name: "Σουβλάκι κοτόπουλο", description: "Μαριναρισμένο στήθος κοτόπουλου με πιπεριές και κρεμμύδι.", price: 1300,
        optionGroups: JSON.stringify([noOption(["πιπεριές", "κρεμμύδι"])]) },
      { name: "Σουβλάκι χοιρινό", description: "Μαριναρισμένα κομμάτια χοιρινού.", price: 1300 },
      { name: "Μπριζόλα χοιρινή", description: "Μαριναρισμένη με τοπικά βότανα.", price: 1400 },
      { name: "Παϊδάκια", description: "Αρνίσια παϊδάκια μαριναρισμένα.", price: 1600 },
      { name: "Πανσέτα σχάρας", description: "Ζουμερή χοιρινή πανσέτα.", price: 1400 },
      { name: "Αρνίσιο συκώτι", description: "Στη σχάρα με κρεμμύδια και μπέικον.", price: 1400,
        optionGroups: JSON.stringify([noOption(["κρεμμύδια", "μπέικον"])]) },
    ]},
    { cat: fillets, items: [
      { name: "Στέικ μοσχαρίσιο φιλέτο", description: "Φρέσκο φιλέτο στη σχάρα.", price: 2400,
        optionGroups: JSON.stringify([extraSauce]) },
      { name: "Στέικ μοσχαρίσιο πιπεράτο", description: "Με πράσινο πιπέρι, μουστάρδα, κρασί και κρέμα.", price: 2600,
        optionGroups: JSON.stringify([noOption(["πράσινο πιπέρι", "μουστάρδα", "κρασί", "κρέμα"]), extraSauce]) },
      { name: "Στέικ μοσχαρίσιο Νταϊάνα", description: "Με μανιτάρια, μουστάρδα, κρασί και κρέμα.", price: 2600,
        optionGroups: JSON.stringify([noOption(["μανιτάρια", "μουστάρδα", "κρασί", "κρέμα"]), extraSauce]) },
      { name: "Στέικ μοσχαρίσιο με σάλτσα σκόρδου", description: "Με σπιτική σάλτσα σκόρδου.", price: 2600,
        optionGroups: JSON.stringify([noOption(["σάλτσα σκόρδου"]), extraSauce]) },
      { name: "Τι-μπον στέικ", description: "Μεγάλο στέικ με το κόκαλο στη σχάρα.", price: 2200,
        optionGroups: JSON.stringify([extraSauce]) },
      { name: "Γκάμον στέικ", description: "Χοντρή φέτα καπνιστού χοιρινού με αυγό ή ανανά.", price: 1500,
        optionGroups: JSON.stringify([{ id: "topping", label: "Συνοδευτικό", required: true, type: "single", choices: [
          { id: "egg", label: "Με αυγό", priceCents: 0 },
          { id: "pineapple", label: "Με ανανά", priceCents: 0 },
        ]}, extraSauce]) },
      { name: "Κοτόπουλο φιλέτο", description: "Μαριναρισμένο με βότανα και ελαιόλαδο.", price: 1300,
        optionGroups: JSON.stringify([noOption(["βότανα", "ελαιόλαδο"]), extraSauce]) },
      { name: "Κοτόπουλο πιπεράτο", description: "Με πιπεράτη σάλτσα κρέμας.", price: 1400,
        optionGroups: JSON.stringify([noOption(["σάλτσα κρέμας"]), extraSauce]) },
      { name: "Κοτόπουλο Νταϊάνα", description: "Με μανιτάρια και σάλτσα κρέμας.", price: 1400,
        optionGroups: JSON.stringify([noOption(["μανιτάρια", "σάλτσα κρέμας"]), extraSauce]) },
      { name: "Κοτόπουλο με σάλτσα σκόρδου", description: "Με κρεμώδη σάλτσα σκόρδου.", price: 1400,
        optionGroups: JSON.stringify([noOption(["σάλτσα σκόρδου"]), extraSauce]) },
      { name: "Κοτόπουλο Κιέβου", description: "Φιλέτο γεμιστό με τυρί και βούτυρο σκόρδου.", price: 1400,
        optionGroups: JSON.stringify([noOption(["τυρί", "βούτυρο σκόρδου"]), extraSauce]) },
      { name: "Κοτόπουλο κάρρυ", description: "Φιλέτο με κρεμμύδι και σάλτσα κάρρυ.", price: 1400,
        optionGroups: JSON.stringify([noOption(["κρεμμύδι", "σάλτσα κάρρυ"]), extraSauce]) },
      { name: "Κοτόπουλο «Μουστάκαλλης»", description: "Φιλέτο γεμιστό με ζαμπόν και τυρί.", price: 1400,
        optionGroups: JSON.stringify([noOption(["ζαμπόν", "τυρί"]), extraSauce]) },
    ]},
    { cat: cypriot, items: [
      { name: "Κλέφτικο", description: "Αρνί ψημένο στον φούρνο για 8 ώρες. Σερβίρεται με σάλτσα, λαχανικά, ρύζι και πατάτες.", price: 1500,
        optionGroups: JSON.stringify([noOption(["σάλτσα", "λαχανικά", "ρύζι", "πατάτες"])]) },
      { name: "Μουσακάς", description: "Στρώσεις από πατάτα, μελιτζάνα, κολοκύθι, κιμά και μπεσαμέλ.", price: 1400,
        optionGroups: JSON.stringify([noOption(["πατάτα", "μελιτζάνα", "κολοκύθι", "κιμά", "μπεσαμέλ"])]) },
      { name: "Στιφάδο", description: "Βοδινό με κρεμμύδια, βότανα και κόκκινο κρασί. Σερβίρεται με ρύζι και πατάτες.", price: 1400,
        optionGroups: JSON.stringify([noOption(["κρεμμύδια", "βότανα", "ρύζι", "πατάτες"])]) },
      { name: "Αφέλια", description: "Χοιρινό με κόλιανδρο μαγειρεμένο σε λευκό κρασί. Σερβίρεται με ρύζι και πατάτες.", price: 1400,
        optionGroups: JSON.stringify([noOption(["κόλιανδρο", "ρύζι", "πατάτες"])]) },
      { name: "Γεμιστά", description: "Ντομάτα, κολοκύθι και πιπεριές γεμιστά με κιμά και ρύζι. Σερβίρεται με τζατζίκι.", price: 1400,
        optionGroups: JSON.stringify([noOption(["ντομάτα", "κολοκύθι", "πιπεριές", "κιμά", "ρύζι", "τζατζίκι"])]) },
      { name: "Φασολάκι κοκκινιστό με αρνί", description: "Αρνί κατσαρόλας με πράσινα φασόλια και καρότα.", price: 1400,
        optionGroups: JSON.stringify([noOption(["πράσινα φασόλια", "καρότα"])]) },
    ]},
    { cat: vegetarian, items: [
      { name: "Μουσακάς για χορτοφάγους", description: "Στρώσεις από πατάτα, μελιτζάνα, κολοκύθι και ντομάτα με μπεσαμέλ. Σερβίρεται με πατάτες και σαλάτα.", price: 1200,
        optionGroups: JSON.stringify([noOption(["πατάτα", "μελιτζάνα", "κολοκύθι", "ντομάτα", "μπεσαμέλ", "πατάτες", "σαλάτα"])]) },
      { name: "Φασολάκι", description: "Φρέσκα πράσινα φασόλια, μανιτάρια και καρότα σε σάλτσα ντομάτας.", price: 1200,
        optionGroups: JSON.stringify([noOption(["φασόλια", "μανιτάρια", "καρότα", "σάλτσα ντομάτας"])]) },
      { name: "Φακές", description: "Μαγειρεμένες με ελαιόλαδο, λαχανικά και ρύζι.", price: 1200,
        optionGroups: JSON.stringify([noOption(["ελαιόλαδο", "λαχανικά", "ρύζι"])]) },
      { name: "Λουβί", description: "Μαγειρεμένο με εποχιακά λαχανικά σε ελαιόλαδο.", price: 1200,
        optionGroups: JSON.stringify([noOption(["λαχανικά", "ελαιόλαδο"])]) },
    ]},
    { cat: salads, items: [
      { name: "Ελληνική σαλάτα", description: "Ντομάτα, αγγούρι, κρεμμύδι και φέτα με παρθένο ελαιόλαδο.", price: 800,
        optionGroups: JSON.stringify([
          sizeOption(8, 10, 12),
          noOption(["ντομάτα", "αγγούρι", "κρεμμύδι", "φέτα", "ελαιόλαδο"]),
        ]) },
      { name: "Χωριάτικη σαλάτα", description: "Ανάμικτα πράσινα λαχανικά, ντομάτα, αγγούρι, φέτα, κρεμμύδι και ελιές με παρθένο ελαιόλαδο.", price: 800,
        optionGroups: JSON.stringify([
          sizeOption(8, 10, 12),
          noOption(["πράσινα λαχανικά", "ντομάτα", "αγγούρι", "φέτα", "κρεμμύδι", "ελιές", "ελαιόλαδο"]),
        ]) },
      { name: "Ντομάτα και κρεμμύδι", description: "Ώριμες κόκκινες ντομάτες και κομμένο κρεμμύδι με παρθένο ελαιόλαδο.", price: 800,
        optionGroups: JSON.stringify([
          sizeOption(8, 10, 12),
          noOption(["ντομάτα", "κρεμμύδι", "ελαιόλαδο"]),
        ]) },
      { name: "Πράσινη σαλάτα", description: "Ποικιλία από πράσινα λαχανικά με παρθένο ελαιόλαδο.", price: 650,
        optionGroups: JSON.stringify([
          sizeOption(6.5, 8, 10),
          noOption(["πράσινα λαχανικά", "ελαιόλαδο"]),
        ]) },
      { name: "Οχταποδοσαλάτα", description: "Χταπόδι σε ανάμικτα πράσινα λαχανικά, ντομάτα, αγγούρι και κρεμμύδι, με παρθένο ελαιόλαδο και μαγιονέζα.", price: 1200,
        optionGroups: JSON.stringify([
          noOption(["χταπόδι", "πράσινα λαχανικά", "ντομάτα", "αγγούρι", "κρεμμύδι", "ελαιόλαδο", "μαγιονέζα"]),
        ]) },
      { name: "Τονοσαλάτα", description: "Τόνος σε ανάμικτα φύλλα σαλάτας, ντομάτα, αγγούρι, κρεμμύδι και μαγιονέζα.", price: 1200,
        optionGroups: JSON.stringify([
          noOption(["τόνο", "φύλλα σαλάτας", "ντομάτα", "αγγούρι", "κρεμμύδι", "μαγιονέζα"]),
        ]) },
      { name: "Σαλάτα με θαλασσινά", description: "Μείγμα από τόνο, γαρίδες, καβούρι και χταπόδι, με ανάμικτα φύλλα σαλάτας, ντομάτα, αγγούρι, κρεμμύδι και σάλτσα θαλασσινών.", price: 1200,
        optionGroups: JSON.stringify([
          noOption(["τόνο", "γαρίδες", "καβούρι", "χταπόδι", "φύλλα σαλάτας", "ντομάτα", "αγγούρι", "κρεμμύδι", "σάλτσα θαλασσινών"]),
        ]) },
      { name: "Σαλάτα του σεφ", description: "Ζαμπόν, τυρί, τόνος και γαρίδες μαζί με ανάμικτα φύλλα σαλάτας, ντομάτα, αγγούρι, κρεμμύδι και σάλτσα θαλασσινών.", price: 1200,
        optionGroups: JSON.stringify([
          noOption(["ζαμπόν", "τυρί", "τόνο", "γαρίδες", "φύλλα σαλάτας", "ντομάτα", "αγγούρι", "κρεμμύδι", "σάλτσα θαλασσινών"]),
        ]) },
      { name: "Γαριδοσαλάτα", description: "Γαρίδες με ποικιλία από πράσινα λαχανικά, ντομάτα, κρεμμύδι, αγγούρι και σάλτσα θαλασσινών.", price: 1200,
        optionGroups: JSON.stringify([
          noOption(["γαρίδες", "πράσινα λαχανικά", "ντομάτα", "κρεμμύδι", "αγγούρι", "σάλτσα θαλασσινών"]),
        ]) },
    ]},
  ];

  for (const { cat, items } of seedItems) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const existing = await prisma.menuItem.findFirst({
        where: { categoryId: cat.id, name: item.name },
      });
      if (!existing) {
        await prisma.menuItem.create({
          data: {
            name: item.name,
            description: item.description ?? undefined,
            price: item.price,
            categoryId: cat.id,
            sortOrder: i,
            optionGroups: item.optionGroups ?? undefined,
          },
        });
      }
    }
  }

  let diningSection = await prisma.tableSection.findFirst({
    where: { restaurantId: restaurant.id, name: "Dining room" },
  });
  if (!diningSection) {
    diningSection = await prisma.tableSection.create({
      data: { name: "Dining room", sortOrder: 0, restaurantId: restaurant.id },
    });
  }

  await prisma.table.upsert({
    where: { token: "table-1" },
    update: { tableSectionId: diningSection.id, sortOrder: 0 },
    create: {
      name: "Table 1",
      token: "table-1",
      restaurantId: restaurant.id,
      tableSectionId: diningSection.id,
      sortOrder: 0,
    },
  });
  await prisma.table.upsert({
    where: { token: "table-2" },
    update: { tableSectionId: diningSection.id },
    create: {
      name: "Table 2",
      token: "table-2",
      restaurantId: restaurant.id,
      tableSectionId: diningSection.id,
      sortOrder: 1,
    },
  });

  const demoPasswordHash = await hash("demo123", 10);
  await prisma.restaurantUser.upsert({
    where: { email: "admin@demo.com" },
    update: { firstName: "Demo", lastName: "Owner" },
    create: {
      email: "admin@demo.com",
      passwordHash: demoPasswordHash,
      firstName: "Demo",
      lastName: "Owner",
      role: "owner",
      restaurantId: restaurant.id,
    },
  });

  await prisma.restaurantUser.upsert({
    where: { email: "kitchen@demo.com" },
    update: { role: "kitchen" },
    create: {
      email: "kitchen@demo.com",
      passwordHash: demoPasswordHash,
      role: "kitchen",
      restaurantId: restaurant.id,
    },
  });

  await prisma.restaurantUser.upsert({
    where: { email: "waiter@demo.com" },
    update: { role: "waiter", firstName: "Demo", lastName: "Waiter" },
    create: {
      email: "waiter@demo.com",
      passwordHash: demoPasswordHash,
      firstName: "Demo",
      lastName: "Waiter",
      role: "waiter",
      restaurantId: restaurant.id,
    },
  });

  const relayUpdate = await prisma.restaurant.updateMany({
    data: { waiterRelayEnabled: true },
  });
  console.log(
    `Wait-staff-first routing set for ${relayUpdate.count} restaurant(s). Turn off in Options if the kitchen should see orders immediately.`
  );

  console.log("Seed done. Restaurant:", restaurant.name);
  console.log("Owner (full dashboard + Office): admin@demo.com / demo123");
  console.log("Team tab — kitchen (orders): kitchen@demo.com / demo123");
  console.log("Team tab — wait staff: waiter@demo.com / demo123");
  console.log("Try the menu at: /m/table-1 or /m/table-2");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
