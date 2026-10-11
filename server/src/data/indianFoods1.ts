// Chunk 1: everyday South Indian vegetarian foods. Per 100 g of the food AS EATEN (cooked / prepared).
// Values are approximate averages (IFCT 2017 / USDA / typical home recipes). Home cooking varies, especially oil and coconut.
//
// Row: [name, aliases (comma separated), category, kcal, protein, carbs, fat, fiber, servings]
// servings: "label:grams|label:grams"
export type Row = [string, string, string, number, number, number, number, number, string];

export const INDIAN_FOODS_1: Row[] = [
  // ---- Pulses, protein ----
  ["Channa (chickpea), boiled", "chana,kadala,kondakadalai,sundal,kala chana,black chickpea,chole,garbanzo", "pulses", 164, 8.9, 27.4, 2.6, 7.6, "1 katori:100|1 cup:160|1 tbsp:12"],
  ["Green gram (whole moong), boiled", "moong,green gram,pachai payir,cherupayar,hesaru kalu,whole moong,mung bean", "pulses", 105, 7, 19.2, 0.4, 7.6, "1 katori:100|1 cup:200"],
  ["Moong sprouts, raw", "sprouts,mung sprouts,moong sprouts,molakkattiya payar", "pulses", 30, 3, 5.9, 0.2, 1.8, "1 katori:50|1 cup:104"],
  ["Soya chunks, dry", "soy chunks,soya nuggets,meal maker,nutrela,textured soy protein,tvp", "protein", 345, 52, 33, 0.5, 13, "1 handful:25|1 cup dry:60"],
  ["Soya chunks, boiled and squeezed", "soy chunks cooked,soya boiled,meal maker cooked", "protein", 125, 19, 12.5, 0.3, 4.8, "1 katori:100|1 cup:150"],
  ["Rajma (kidney beans), boiled", "rajma,kidney beans,red beans", "pulses", 127, 8.7, 22.8, 0.5, 6.4, "1 katori:100|1 cup:177"],
  ["Green peas (matar), boiled", "matar,peas,pattani,batani,green peas", "vegetable", 84, 5.4, 15.6, 0.2, 5.5, "1 katori:100|1 cup:160"],
  ["Toor dal, cooked (plain)", "tuvar dal,arhar,thuvaram paruppu,togari bele,kandi pappu,pigeon pea,dal", "pulses", 110, 6.5, 19, 0.5, 4.5, "1 katori:150|1 cup:200"],
  ["Dal tadka", "dal fry,paruppu,tadka dal,dal with tempering", "curry", 120, 6, 15, 4, 3.5, "1 katori:150|1 cup:220"],
  ["Moong dal, cooked", "moong dal,pasi paruppu,pesara pappu,split green gram", "pulses", 105, 7, 19, 0.4, 5, "1 katori:150|1 cup:200"],
  ["Masoor dal, cooked", "masoor,red lentil,lentils,sivappu paruppu", "pulses", 116, 9, 20.1, 0.4, 7.9, "1 katori:150|1 cup:198"],
  ["Urad dal, cooked", "urad,ulundu,minapappu,black gram,uddina bele", "pulses", 105, 7.5, 18.3, 0.5, 7, "1 katori:150"],
  ["Sambar", "sambhar,vegetable sambar,sambar gravy", "curry", 50, 2.5, 7, 1.5, 2, "1 katori:150|1 cup:240|1 ladle:60"],
  ["Rasam", "saaru,charu,pepper rasam,tomato rasam", "curry", 25, 1, 4, 0.7, 0.8, "1 katori:150|1 glass:200"],
  ["Paneer", "cottage cheese,paneer cubes,fresh paneer", "protein", 265, 18, 2, 20.5, 0, "1 cube:20|1 katori cubes:100"],
  ["Tofu, firm", "bean curd,soya paneer,soy paneer", "protein", 144, 17.3, 2.8, 8.7, 2.3, "1 slice:85|1 katori cubes:120"],

  // ---- Dairy ----
  ["Milk, toned (3% fat)", "toned milk,paal,haalu,pal,doodh,milk,cow milk,packet milk", "dairy", 58, 3.1, 4.7, 3, 0, "1 glass (200 ml):206|1 cup (150 ml):155|1 tbsp:15"],
  ["Milk, full cream (6% fat)", "full cream milk,gold milk,buffalo milk,whole milk", "dairy", 88, 3.3, 4.8, 5.9, 0, "1 glass (200 ml):206|1 cup (150 ml):155"],
  ["Curd (dahi), whole milk", "dahi,yogurt,yoghurt,thayir,mosaru,perugu,curd", "dairy", 61, 3.5, 4.7, 3.3, 0, "1 katori:100|1 cup:245|1 tbsp:15"],
  ["Buttermilk (moru / chaas)", "moru,majjige,mor,chaas,takra,buttermilk,neer mor,spiced buttermilk", "drink", 20, 1.2, 2.2, 0.7, 0, "1 glass (200 ml):205|1 cup:245"],

  // ---- Rice and rice dishes ----
  ["Rice, white, cooked", "chawal,sadam,annam,choru,anna,steamed rice,boiled rice,rice", "rice", 130, 2.7, 28.2, 0.3, 0.4, "1 katori:150|1 cup:158|1 ladle:100|1 plate (2 cups):316"],
  ["Matta rice, cooked", "kerala rice,rosematta,red rice,parboiled rice,palakkadan matta", "rice", 124, 2.8, 26.5, 0.6, 1.2, "1 katori:150|1 cup:160"],
  ["Brown rice, cooked", "brown rice,unpolished rice", "rice", 112, 2.3, 23.5, 0.8, 1.8, "1 katori:150|1 cup:195"],
  ["Curd rice", "thayir sadam,mosaru anna,perugu annam,dahi rice,thayir saadham", "rice", 120, 3.3, 18, 3.8, 0.4, "1 katori:150|1 plate:250"],
  ["Lemon rice", "elumichai sadam,chitranna,nimmakaya pulihora", "rice", 160, 3, 28, 4, 1, "1 katori:150|1 plate:250"],
  ["Tamarind rice", "puliyodarai,puliyogare,pulihora,puli sadam", "rice", 170, 3, 29, 4.5, 1.2, "1 katori:150|1 plate:250"],
  ["Vegetable biryani", "veg biryani,biriyani,veg pulao", "rice", 150, 3.5, 24, 4.5, 1.5, "1 katori:150|1 plate:250"],
  ["Bisi bele bath", "bisibelebath,sambar sadam,sambar rice", "rice", 140, 4.5, 22, 3.5, 2.5, "1 katori:150|1 plate:250"],

  // ---- Tiffin / breakfast ----
  ["Idli", "idly,steamed idli,rice idli", "tiffin", 150, 4.5, 30, 0.7, 1, "1 idli:39|2 idli:78|3 idli:117|4 idli:156"],
  ["Dosa, plain", "dosai,plain dosa,dose,sada dosa", "tiffin", 168, 3.9, 29, 3.7, 1, "1 dosa:85|1 large dosa:110"],
  ["Masala dosa", "masala dosai,potato dosa", "tiffin", 180, 4, 27, 6.5, 2, "1 masala dosa:180"],
  ["Rava dosa", "rava dosai,semolina dosa,instant dosa", "tiffin", 190, 4, 28, 7, 1, "1 dosa:90"],
  ["Adai", "adai dosai,mixed dal dosa,adai dosa", "tiffin", 175, 7, 25, 5.5, 3, "1 adai:90"],
  ["Uttapam", "oothappam,uthappam,oothappa", "tiffin", 160, 5, 25, 4.5, 2, "1 uttapam:130"],
  ["Appam", "vellayappam,palappam,hoppers", "tiffin", 185, 3, 36, 2.5, 1, "1 appam:60"],
  ["Idiyappam", "string hoppers,idiappam,noolputtu,sevai,semiya", "tiffin", 160, 3, 34, 0.8, 1, "1 idiyappam:40|3 idiyappam:120"],
  ["Puttu (rice, with coconut)", "puttu,kerala puttu,rice puttu", "tiffin", 165, 3, 32, 2.5, 1.5, "1 piece (slice):100|1 cup:150"],
  ["Upma (rava)", "uppuma,rava upma,uppittu,semolina upma", "tiffin", 145, 3.5, 22, 5, 1.5, "1 katori:150|1 plate:250"],
  ["Ven pongal", "pongal,khara pongal,venpongal", "tiffin", 160, 4, 24, 5.5, 1, "1 katori:150|1 plate:250"],
  ["Poha", "aval,avalakki,aval upma,flattened rice upma,kanda poha", "tiffin", 130, 2.5, 24, 2.8, 1.5, "1 plate:200|1 katori:130"],

  // ---- Bread, cereals ----
  ["Chapati / roti (plain)", "phulka,roti,chapathi,fulka,whole wheat roti", "bread", 265, 9, 48, 4.5, 4, "1 roti:40|1 phulka:30|1 large chapati:50"],
  ["Parotta (Kerala)", "porotta,paratha,malabar parotta,barotta,kerala parotta", "bread", 330, 6.5, 43, 14, 2, "1 parotta:80"],
  ["Bread, whole wheat / brown", "brown bread,whole wheat bread,atta bread,toast", "bread", 250, 10, 46, 3.5, 5, "1 slice:28|2 slices:56"],
  ["Bread, white", "white bread,milk bread,sandwich bread", "bread", 265, 9, 49, 3.2, 2.7, "1 slice:28"],
  ["Oats, rolled, dry", "oats,oatmeal,porridge oats,quaker", "cereal", 379, 13.2, 67.7, 6.5, 10, "1 serving:40|1 cup:80|1 tbsp:6"],
  ["Wheat flakes", "wheat flake cereal,breakfast cereal,kelloggs wheat flakes", "cereal", 350, 9, 76, 1.5, 9, "1 serving (32 g):32|1 bowl:40"],
  ["Corn flakes", "cornflakes,breakfast cereal,kelloggs corn flakes", "cereal", 357, 7.5, 84, 0.4, 3.3, "1 bowl:30"],

  // ---- Fruit ----
  ["Nendran banana, ripe (peeled)", "nendran,nendran pazham,ethakka,plantain,kerala banana,ripe plantain,nenthrapazham", "fruit", 122, 1.3, 31.9, 0.4, 2.3, "1 medium (peeled):150|1 large (peeled):200|1/2 banana:75"],
  ["Banana (robusta / yelakki)", "banana,pazham,vazhaipazham,bale hannu,yelakki,poovan,robusta,kela", "fruit", 89, 1.1, 22.8, 0.3, 2.6, "1 small (yelakki):60|1 medium (peeled):100|1 large (peeled):120"],
  ["Apple", "apple,sebu,apple fruit", "fruit", 52, 0.3, 13.8, 0.2, 2.4, "1 medium:180"],
  ["Papaya", "pappaya,papali,parangi,papita", "fruit", 43, 0.5, 10.8, 0.3, 1.7, "1 katori cubes:150"],
  ["Watermelon", "tharbooz,thanneer mathan,kalangadi", "fruit", 30, 0.6, 7.6, 0.2, 0.4, "1 katori cubes:150"],
  ["Mango", "mango,aam,mambazham,mamidi", "fruit", 60, 0.8, 15, 0.4, 1.6, "1 medium (pulp):150|1 cup chopped:165"],
  ["Guava", "peru,koyya,perakka,amrud,seebe", "fruit", 68, 2.6, 14.3, 1, 5.4, "1 medium:100"],
  ["Orange / sweet lime", "orange,mosambi,narangi,sathukudi,sweet lime", "fruit", 47, 0.9, 11.8, 0.1, 2.4, "1 medium:130"],
  ["Pomegranate", "anar,madulai,dalimma", "fruit", 83, 1.7, 18.7, 1.2, 4, "1 katori:100"],
  ["Coconut, fresh grated", "thengai,nariyal,coconut,kobbari,thenga", "fruit", 354, 3.3, 15.2, 33.5, 9, "1 tbsp grated:8|1 small piece:25|1 katori grated:80"],

  // ---- Nuts, seeds ----
  ["Peanuts (groundnut)", "groundnut,verkadalai,nelagadale,palli,moongphali,peanut,roasted peanuts", "nuts", 567, 25.8, 16.1, 49.2, 8.5, "1 tbsp:10|1 handful:30"],
  ["Almonds", "badam,almond", "nuts", 579, 21.2, 21.6, 49.9, 12.5, "5 almonds:6|10 almonds:12"],
  ["Mixed seeds (pumpkin, sunflower, flax, chia)", "seeds,pumpkin seeds,sunflower seeds,flax seeds,chia seeds,seed mix", "nuts", 540, 24, 20, 43, 11, "1 tsp:4|1 tbsp:10|2 tbsp:20"],
  ["Roasted chana (pottukadalai)", "pottukadalai,putnalu,hurigadale,fried gram,roasted chana,dalia,roasted gram", "nuts", 370, 22, 58, 5.5, 15, "1 tbsp:10|1 handful:30"],
  ["Peanut butter", "pb,peanut spread,groundnut butter", "nuts", 588, 25, 20, 50, 6, "1 tbsp:16"],

  // ---- Fats, sugars ----
  ["Ghee", "neyyi,nei,clarified butter,tuppa", "fat", 900, 0, 0, 100, 0, "1 tsp:5|1 tbsp:14"],
  ["Cooking oil (any)", "oil,coconut oil,sunflower oil,groundnut oil,sesame oil,gingelly oil,nallennai,velichenna", "fat", 900, 0, 0, 100, 0, "1 tsp:5|1 tbsp:14"],
  ["Sugar", "sakkarai,chini,sakkare,pancdara,white sugar", "sweetener", 400, 0, 100, 0, 0, "1 tsp:5|1 tbsp:12"],
  ["Jaggery", "vellam,bellam,gud,sharkara,bella", "sweetener", 383, 0.4, 95, 0.1, 0, "1 small piece:10|1 tsp powdered:6"],

  // ---- Drinks ----
  ["Chai (tea with milk and sugar)", "tea,chai,tea with milk,milk tea,sweet tea", "drink", 40, 1.1, 6, 1.3, 0, "1 cup (150 ml):150|1 tumbler (200 ml):200"],
  ["Filter coffee (with milk and sugar)", "coffee,kaapi,filter kaapi,south indian coffee,milk coffee", "drink", 50, 1.7, 6.5, 2, 0, "1 cup (150 ml):150|1 small cup (90 ml):90"],
  ["Black coffee / tea (no sugar, no milk)", "black coffee,black tea,green tea,lemon tea,sugarless tea", "drink", 2, 0.1, 0.3, 0, 0, "1 cup (240 ml):240"],
  ["Coconut water", "elaneer,tender coconut water,ilaneeru,kobbari neellu", "drink", 19, 0.7, 3.7, 0.2, 1.1, "1 glass (200 ml):200|1 tender coconut:300"],

  // ---- Vegetable dishes, curries ----
  ["Poriyal (vegetable stir-fry with coconut)", "poriyal,palya,thoran,upperi,beans poriyal,cabbage poriyal,stir fry,kari", "vegetable", 80, 2.2, 8, 4.5, 3, "1 katori:100"],
  ["Avial", "aviyal,mixed veg in coconut curd", "curry", 105, 2.5, 7, 7.5, 2.5, "1 katori:100"],
  ["Kootu (vegetable and dal)", "koottu,kootu curry,dalma,kootu", "curry", 85, 4, 9, 3.5, 3, "1 katori:100"],
  ["Mixed vegetable curry", "veg curry,mixed veg sabzi,vegetable kurma,veg kurma", "curry", 80, 2, 8, 4.5, 2.5, "1 katori:100"],
  ["Aloo (potato) sabzi", "aloo,urulaikizhangu,potato curry,potato fry,batata", "curry", 100, 2, 15, 4, 2, "1 katori:100"],
  ["Salad (cucumber, tomato, onion)", "salad,kachumber,cucumber,raw veg,veg salad", "vegetable", 18, 0.8, 4, 0.1, 1.2, "1 plate:100|1 bowl:150"],
  ["Palak paneer", "spinach paneer,keerai paneer,saag paneer", "curry", 160, 8, 5, 12, 2, "1 katori:150"],
  ["Chole masala (chickpea curry)", "chole,chana masala,kadala curry,channa curry", "curry", 160, 7, 20, 6, 6, "1 katori:150"],
  ["Rajma masala", "rajma curry,kidney bean curry", "curry", 140, 6, 17, 5, 5, "1 katori:150"],

  // ---- Snacks, sweets ----
  ["Medu vada", "medhu vadai,ulundu vadai,vada,vadai,uddina vada", "snack", 290, 9, 27, 16, 3, "1 vada:50"],
  ["Banana chips", "nendran chips,kerala chips,upperi,banana wafers", "snack", 519, 2.3, 58, 33, 4, "1 handful:30"],
  ["Murukku", "chakli,chakkli,kai murukku,thenkuzhal", "snack", 500, 8, 60, 25, 3, "1 piece:25"],
  ["Samosa", "samosa,veg samosa,aloo samosa", "snack", 262, 4.5, 28, 15, 2, "1 samosa:80"],
  ["Gulab jamun", "gulabjamun,jamun,sweet", "sweet", 375, 5, 55, 15, 0.5, "1 piece:40"],
  ["Payasam", "kheer,paysam,payasa,pal payasam,semiya payasam", "sweet", 150, 3, 22, 5.5, 0.3, "1 katori:120"],

  // ---- Supplements ----
  ["Protein powder (generic)", "whey,whey protein,protein shake,scoop,plant protein,pea protein,superyou,yeast protein", "supplement", 390, 75, 8, 5, 1, "1 scoop (30 g):30|2 scoops:60"],
];
