// X_Farm crop knowledge base. Temperature, pH, and cycle-length values come from
// the FAO EcoCrop database (record codes below). Soil moisture, humidity, light,
// soil temperature, EC, watering, and care advice are X_Farm guidance written to
// complement EcoCrop for greenhouse and garden growing; they are general values.
// supabase/migrations/*_crop_profiles.sql seeds the same data into the database.

export type Localized = { ro: string; en: string };
export type ValueRange = { min: number; max: number };
export type CropCategory = "fruiting" | "leafy" | "root" | "herb" | "legume" | "berry";
export type CropSymptom = { sign: Localized; cause: Localized; action: Localized };

export type EcoCropData = {
  code: number;
  scientificName: string;
  tempOptimal: ValueRange;
  tempAbsolute: ValueRange;
  phOptimal: ValueRange;
  phAbsolute: ValueRange;
  cycleDays: ValueRange;
  killingTemp: number | null;
  light: "very bright" | "clear skies" | "cloudy skies";
};

export type CropProfile = {
  id: string;
  emoji: string;
  category: CropCategory;
  name: Localized;
  scientificName: string;
  typeExample: Localized;
  ecocrop: EcoCropData | null;
  soilMoisture: ValueRange;
  airTemperature: ValueRange;
  humidity: ValueRange;
  light: ValueRange;
  soilTemperature: ValueRange;
  soilPh: ValueRange;
  soilEc: ValueRange;
  irrigationBaseHours: number;
  economics: { yieldKgPerCycle: number; cycleDays: number; pricePerKg: number };
  tip: Localized;
  learn: { start: Localized; care: Localized; harvest: Localized };
  symptoms: CropSymptom[];
};

export const ECOCROP_SOURCE = "FAO EcoCrop database (gaez.fao.org/pages/ecocrop), via the OpenCLIM EcoCrop_DB.csv export";

// EcoCrop light categories mapped to daytime PPFD targets in µmol/m²/s (X_Farm mapping).
const lightTargets: Record<EcoCropData["light"], ValueRange> = {
  "very bright": { min: 400, max: 800 },
  "clear skies": { min: 300, max: 650 },
  "cloudy skies": { min: 200, max: 500 },
};

type CropInput = Omit<CropProfile, "airTemperature" | "light" | "soilPh" | "scientificName"> & { light?: ValueRange; soilPh?: ValueRange; airTemperature?: ValueRange; scientificName?: string };

function crop(input: CropInput): CropProfile {
  const eco = input.ecocrop;
  return {
    ...input,
    scientificName: input.scientificName ?? eco?.scientificName ?? "",
    airTemperature: input.airTemperature ?? (eco ? eco.tempOptimal : { min: 18, max: 28 }),
    light: input.light ?? (eco ? lightTargets[eco.light] : { min: 250, max: 700 }),
    soilPh: input.soilPh ?? (eco ? eco.phOptimal : { min: 5.5, max: 7 }),
  };
}

const l = (ro: string, en: string): Localized => ({ ro, en });
const symptom = (sign: Localized, cause: Localized, action: Localized): CropSymptom => ({ sign, cause, action });

export const cropCatalog = {
  tomato: crop({
    id: "tomato", emoji: "🍅", category: "fruiting",
    name: l("Roșie", "Tomato"), scientificName: "Solanum lycopersicum",
    typeExample: l("Inimă de bou", "Beefsteak"),
    ecocrop: { code: 1379, scientificName: "Lycopersicon esculentum", tempOptimal: { min: 20, max: 27 }, tempAbsolute: { min: 7, max: 35 }, phOptimal: { min: 5.5, max: 6.8 }, phAbsolute: { min: 5, max: 7.5 }, cycleDays: { min: 70, max: 150 }, killingTemp: null, light: "clear skies" },
    soilMoisture: { min: 42, max: 68 }, humidity: { min: 50, max: 75 }, light: { min: 400, max: 800 },
    soilTemperature: { min: 18, max: 26 }, soilEc: { min: 1, max: 3 }, irrigationBaseHours: 24,
    economics: { yieldKgPerCycle: 5, cycleDays: 120, pricePerKg: 12 },
    tip: l("Roșiile reacționează rău la udarea neregulată: constanța contează la fel de mult ca volumul de apă.", "Tomatoes respond badly to uneven watering. Consistency matters as much as the amount of water."),
    learn: {
      start: l("Semănați în interior cu 6–8 săptămâni înainte de răsădire, la 20–25 °C. Răsădiți când nopțile rămân peste 12 °C.", "Sow indoors 6–8 weeks before transplanting, at 20–25 °C. Transplant once nights stay above 12 °C."),
      care: l("Palisați tulpina, îndepărtați copilii la soiurile nedeterminate și udați la bază, regulat.", "Stake the stem, remove side shoots on indeterminate types, and water regularly at the base."),
      harvest: l("Recoltați când fructul are culoarea completă și cedează puțin la apăsare.", "Pick when the fruit has full colour and gives slightly when pressed."),
    },
    symptoms: [
      symptom(l("Pată închisă, adâncită, la baza fructului", "Dark, sunken patch at the bottom of the fruit"), l("Putregaiul apical, legat de obicei de udarea neregulată care limitează absorbția calciului", "Blossom end rot, usually linked to uneven watering limiting calcium uptake"), l("Mențineți umiditatea solului constantă și verificați ca pH-ul să fie în interval.", "Keep soil moisture steady and check that pH is in range.")),
      symptom(l("Florile cad fără să lege fruct", "Flowers dropping without setting fruit"), l("Adesea temperaturi prea mari sau prea mici", "Often temperatures that are too hot or too cold"), l("Verificați temperatura aerului și aerisiți în orele calde.", "Check air temperature and improve ventilation during hot hours.")),
      symptom(l("Frunzele de jos se îngălbenesc", "Lower leaves turning yellow"), l("Posibil deficit de azot, deși frunzele bătrâne se îngălbenesc și natural", "Possible nitrogen shortage, though ageing leaves also yellow naturally"), l("Verificați EC-ul și fertilizați ușor dacă este scăzut.", "Check EC and feed lightly if it is low.")),
    ],
  }),
  pepper: crop({
    id: "pepper", emoji: "🫑", category: "fruiting",
    name: l("Ardei", "Pepper"), typeExample: l("Kapia", "California Wonder"),
    ecocrop: { code: 618, scientificName: "Capsicum annuum", tempOptimal: { min: 17, max: 30 }, tempAbsolute: { min: 8, max: 35 }, phOptimal: { min: 5.5, max: 6.8 }, phAbsolute: { min: 4.5, max: 7 }, cycleDays: { min: 60, max: 180 }, killingTemp: null, light: "very bright" },
    soilMoisture: { min: 35, max: 65 }, humidity: { min: 45, max: 70 }, light: { min: 350, max: 750 },
    soilTemperature: { min: 18, max: 27 }, soilEc: { min: 1, max: 2.5 }, irrigationBaseHours: 30,
    economics: { yieldKgPerCycle: 3, cycleDays: 120, pricePerKg: 15 },
    tip: l("Ardeii iubesc căldura și cresc încet la frig. Temperaturile calde și stabile îi ajută să-și păstreze florile.", "Peppers like warmth and grow slowly when cold. Stable warm temperatures help them keep their flowers."),
    learn: {
      start: l("Semănați în interior cu 8–10 săptămâni înainte de răsădire, la 22–28 °C; răsar încet.", "Sow indoors 8–10 weeks before transplanting, at 22–28 °C; they germinate slowly."),
      care: l("Feriți de curent rece, sprijiniți plantele încărcate și udați constant, fără exces.", "Keep away from cold draughts, support heavy plants, and water steadily without overdoing it."),
      harvest: l("Recoltați verzi sau după ce capătă culoarea finală, tăind codița cu foarfeca.", "Pick green or once they reach their final colour, cutting the stalk with scissors."),
    },
    symptoms: [
      symptom(l("Cad florile sau fructele mici", "Flowers or small fruit dropping"), l("Adesea căldură, frig sau stres hidric", "Often heat, cold, or water stress"), l("Verificați temperatura aerului și umiditatea solului și mențineți-le stabile.", "Check air temperature and soil moisture, and keep both steady.")),
      symptom(l("Pete pale, ca de hârtie, pe fructe", "Pale, papery patches on fruit"), l("Posibilă arsură solară de la lumina directă intensă", "Possible sunscald from intense direct light"), l("Adăugați umbrire ușoară și păstrați frunzișul peste fructe.", "Add light shade and keep enough leaf cover over the fruit.")),
      symptom(l("Pată închisă, adâncită, la vârful fructului", "Dark, sunken patch at the end of the fruit"), l("Putregaiul apical, legat de obicei de udarea neregulată", "Blossom end rot, usually linked to uneven watering"), l("Mențineți umiditatea solului constantă.", "Keep soil moisture steady.")),
    ],
  }),
  cucumber: crop({
    id: "cucumber", emoji: "🥒", category: "fruiting",
    name: l("Castravete", "Cucumber"), typeExample: l("Cornichon", "Gherkin"),
    ecocrop: { code: 817, scientificName: "Cucumis sativus", tempOptimal: { min: 18, max: 32 }, tempAbsolute: { min: 6, max: 38 }, phOptimal: { min: 6, max: 7.5 }, phAbsolute: { min: 4.5, max: 8.7 }, cycleDays: { min: 40, max: 180 }, killingTemp: null, light: "very bright" },
    soilMoisture: { min: 45, max: 75 }, humidity: { min: 60, max: 80 },
    soilTemperature: { min: 20, max: 28 }, soilEc: { min: 1, max: 2.5 }, irrigationBaseHours: 18,
    economics: { yieldKgPerCycle: 4, cycleDays: 110, pricePerKg: 6 },
    tip: l("Castraveții beau multă apă și cresc repede: verificați solul zilnic, mai ales în zilele calde.", "Cucumbers drink a lot and grow fast, so check the soil daily, especially on warm days."),
    learn: {
      start: l("Semănați direct sau în ghivece mici, la peste 20 °C în sol; nu suportă frigul.", "Sow directly or in small pots with soil above 20 °C; they cannot take cold."),
      care: l("Conduceți pe sfoară sau spalier și udați des, la bază, cu apă care nu e rece.", "Train up a string or trellis and water often, at the base, with water that is not cold."),
      harvest: l("Recoltați des, cât fructele sunt tinere și ferme; recolta deasă stimulează producția.", "Harvest often while fruit is young and firm; frequent picking keeps them producing."),
    },
    symptoms: [
      symptom(l("Pulbere albă pe frunze", "White powder on the leaves"), l("Probabil făinare, favorizată de aer umed și circulație slabă", "Probably powdery mildew, favoured by humid air and poor airflow"), l("Aerisiți, distanțați plantele și îndepărtați frunzele afectate.", "Ventilate, space plants out, and remove affected leaves.")),
      symptom(l("Fructe amare sau strâmbe", "Bitter or misshapen fruit"), l("Adesea stres hidric sau temperaturi foarte mari", "Often water stress or very high temperatures"), l("Udați mai constant și reduceți căldura în orele de vârf.", "Water more consistently and reduce heat during peak hours.")),
    ],
  }),
  eggplant: crop({
    id: "eggplant", emoji: "🍆", category: "fruiting",
    name: l("Vânătă", "Eggplant"), typeExample: l("Black Beauty", "Black Beauty"),
    ecocrop: { code: 1965, scientificName: "Solanum melongena", tempOptimal: { min: 20, max: 35 }, tempAbsolute: { min: 9, max: 40 }, phOptimal: { min: 5.5, max: 6.8 }, phAbsolute: { min: 4.3, max: 8.5 }, cycleDays: { min: 70, max: 120 }, killingTemp: null, light: "very bright" },
    soilMoisture: { min: 40, max: 65 }, humidity: { min: 50, max: 70 },
    soilTemperature: { min: 20, max: 28 }, soilEc: { min: 1, max: 2.5 }, irrigationBaseHours: 24,
    economics: { yieldKgPerCycle: 3, cycleDays: 120, pricePerKg: 8 },
    tip: l("Vinetele au nevoie de cea mai multă căldură dintre legumele de seră; frigul le oprește creșterea.", "Eggplants need the most warmth of the greenhouse vegetables; cold stops their growth."),
    learn: {
      start: l("Semănați în interior cu 8–10 săptămâni înainte de răsădire, la 25–30 °C.", "Sow indoors 8–10 weeks before transplanting, at 25–30 °C."),
      care: l("Sprijiniți plantele, udați regulat și fertilizați moderat când apar fructele.", "Support the plants, water regularly, and feed moderately once fruit sets."),
      harvest: l("Recoltați când coaja e lucioasă; coaja mată arată că fructul e trecut.", "Pick while the skin is glossy; a dull skin means the fruit is past its best."),
    },
    symptoms: [
      symptom(l("Frunze cu multe găurițe mici", "Leaves with many small holes"), l("Probabil puricii de pământ", "Probably flea beetles"), l("Inspectați frunzele și folosiți plasă sau capcane lipicioase.", "Inspect the leaves and use netting or sticky traps.")),
      symptom(l("Florile cad fără fructe", "Flowers dropping without fruit"), l("Frig, căldură excesivă sau polenizare slabă", "Cold, excessive heat, or poor pollination"), l("Verificați temperatura și scuturați ușor florile pentru polenizare.", "Check temperature and gently shake flowers to help pollination.")),
    ],
  }),
  zucchini: crop({
    id: "zucchini", emoji: "🥒", category: "fruiting",
    name: l("Dovlecel", "Zucchini"), typeExample: l("Dovlecel alb", "Black Beauty"),
    ecocrop: { code: 821, scientificName: "Cucurbita pepo", tempOptimal: { min: 17, max: 30 }, tempAbsolute: { min: 6, max: 40 }, phOptimal: { min: 5.5, max: 6.8 }, phAbsolute: { min: 4.5, max: 8.3 }, cycleDays: { min: 40, max: 100 }, killingTemp: null, light: "very bright" },
    soilMoisture: { min: 40, max: 70 }, humidity: { min: 50, max: 70 },
    soilTemperature: { min: 18, max: 27 }, soilEc: { min: 1, max: 2.5 }, irrigationBaseHours: 24,
    economics: { yieldKgPerCycle: 4, cycleDays: 70, pricePerKg: 6 },
    tip: l("Dovleceii cresc foarte repede: recoltați des, altfel fructele devin mari și apoase.", "Zucchini grow very fast; pick often or the fruit becomes large and watery."),
    learn: {
      start: l("Semănați direct când solul are peste 16 °C, 2–3 semințe la cuib.", "Sow directly once the soil is above 16 °C, 2–3 seeds per spot."),
      care: l("Lăsați spațiu mult între plante, udați la bază și mulciți solul.", "Give plants plenty of room, water at the base, and mulch the soil."),
      harvest: l("Recoltați la 15–20 cm lungime, tăind codița.", "Harvest at 15–20 cm long, cutting the stalk."),
    },
    symptoms: [
      symptom(l("Fructe mici care se înmoaie și putrezesc la vârf", "Small fruit going soft and rotting at the tip"), l("Polenizare incompletă", "Incomplete pollination"), l("Polenizați manual cu o floare masculă sau o pensulă.", "Hand-pollinate with a male flower or a small brush.")),
      symptom(l("Pulbere albă pe frunze", "White powder on the leaves"), l("Probabil făinare", "Probably powdery mildew"), l("Îmbunătățiți circulația aerului și îndepărtați frunzele afectate.", "Improve airflow and remove affected leaves.")),
    ],
  }),
  lettuce: crop({
    id: "lettuce", emoji: "🥬", category: "leafy",
    name: l("Salată", "Lettuce"), typeExample: l("Salată căpățână", "Butterhead"),
    ecocrop: { code: 1313, scientificName: "Lactuca sativa var. capitata", tempOptimal: { min: 12, max: 21 }, tempAbsolute: { min: 5, max: 30 }, phOptimal: { min: 6, max: 7 }, phAbsolute: { min: 4.2, max: 7.5 }, cycleDays: { min: 35, max: 85 }, killingTemp: 0, light: "clear skies" },
    scientificName: "Lactuca sativa",
    soilMoisture: { min: 45, max: 70 }, humidity: { min: 50, max: 70 },
    soilTemperature: { min: 12, max: 20 }, soilEc: { min: 0.6, max: 1.6 }, irrigationBaseHours: 24,
    economics: { yieldKgPerCycle: 0.35, cycleDays: 60, pricePerKg: 10 },
    tip: l("Salata preferă răcoarea: la căldură trage în floare și devine amară.", "Lettuce prefers cool conditions; in heat it bolts and turns bitter."),
    learn: {
      start: l("Semănați eșalonat, la 2–3 săptămâni, la 10–20 °C; semințele au nevoie de lumină ca să răsară.", "Sow every 2–3 weeks at 10–20 °C; the seeds need light to germinate."),
      care: l("Mențineți solul reavăn și umbriți ușor în zilele fierbinți.", "Keep the soil evenly moist and give light shade on hot days."),
      harvest: l("Recoltați dimineața, când frunzele sunt crocante.", "Harvest in the morning, when the leaves are crisp."),
    },
    symptoms: [
      symptom(l("Tulpina se alungește, frunzele devin amare", "Stem stretching up and leaves turning bitter"), l("Tragere în floare din cauza căldurii sau a zilelor lungi", "Bolting from heat or long days"), l("Recoltați imediat și semănați soiuri rezistente la căldură.", "Harvest now and sow heat-tolerant types.")),
      symptom(l("Marginile frunzelor se înnegresc", "Leaf edges turning brown"), l("Posibil deficit de calciu sau udare neregulată", "Possible calcium shortage or uneven watering"), l("Udați constant și evitați excesul de îngrășământ.", "Water evenly and avoid overfeeding.")),
    ],
  }),
  spinach: crop({
    id: "spinach", emoji: "🥬", category: "leafy",
    name: l("Spanac", "Spinach"), typeExample: l("Matador", "Bloomsdale"),
    ecocrop: { code: 1997, scientificName: "Spinacia oleracea", tempOptimal: { min: 13, max: 20 }, tempAbsolute: { min: 2, max: 27 }, phOptimal: { min: 6, max: 7.5 }, phAbsolute: { min: 5.3, max: 8.3 }, cycleDays: { min: 40, max: 120 }, killingTemp: 0, light: "very bright" },
    soilMoisture: { min: 45, max: 70 }, humidity: { min: 50, max: 70 }, light: { min: 250, max: 600 },
    soilTemperature: { min: 10, max: 20 }, soilEc: { min: 0.8, max: 2 }, irrigationBaseHours: 30,
    economics: { yieldKgPerCycle: 0.2, cycleDays: 60, pricePerKg: 12 },
    tip: l("Spanacul este o cultură de sezon rece; zilele lungi și căldura îl fac să înflorească.", "Spinach is a cool-season crop; long days and heat make it flower."),
    learn: {
      start: l("Semănați primăvara devreme sau toamna, direct în sol, la 1–2 cm adâncime.", "Sow in early spring or autumn, directly in the soil, 1–2 cm deep."),
      care: l("Udați regulat și fertilizați ușor cu azot pentru frunze bogate.", "Water regularly and feed lightly with nitrogen for lush leaves."),
      harvest: l("Recoltați frunzele exterioare pe măsură ce cresc sau toată planta înainte de înflorire.", "Pick the outer leaves as they grow, or the whole plant before it flowers."),
    },
    symptoms: [
      symptom(l("Pete gălbui pe frunze, cu puf violet dedesubt", "Yellow patches on leaves with violet fuzz underneath"), l("Posibil mană", "Possibly downy mildew"), l("Reduceți umiditatea și distanțați plantele.", "Lower humidity and space plants further apart.")),
      symptom(l("Planta înflorește devreme", "Plant flowering early"), l("Căldură sau zile prea lungi", "Heat or days that are too long"), l("Recoltați și resemănați în perioada mai rece.", "Harvest and resow in a cooler period.")),
    ],
  }),
  cabbage: crop({
    id: "cabbage", emoji: "🥬", category: "leafy",
    name: l("Varză", "Cabbage"), typeExample: l("Varză creață", "Savoy"),
    ecocrop: { code: 554, scientificName: "Brassica oleracea var. capitata", tempOptimal: { min: 15, max: 24 }, tempAbsolute: { min: 7, max: 32 }, phOptimal: { min: 6, max: 7.5 }, phAbsolute: { min: 5, max: 8.3 }, cycleDays: { min: 60, max: 200 }, killingTemp: -1, light: "clear skies" },
    soilMoisture: { min: 45, max: 70 }, humidity: { min: 60, max: 80 },
    soilTemperature: { min: 12, max: 22 }, soilEc: { min: 1, max: 2.5 }, irrigationBaseHours: 30,
    economics: { yieldKgPerCycle: 1.5, cycleDays: 120, pricePerKg: 3 },
    tip: l("Varza are nevoie de apă constantă: udarea neregulată după perioade uscate face căpățânile să crape.", "Cabbage needs steady water; irregular watering after dry spells makes heads split."),
    learn: {
      start: l("Semănați în răsadniță, apoi răsădiți la 4–6 frunze, la 40–50 cm distanță.", "Sow in a seedbed, then transplant at 4–6 leaves, 40–50 cm apart."),
      care: l("Udați uniform, mușuroiți ușor și protejați de omizi cu plasă fină.", "Water evenly, earth up lightly, and protect from caterpillars with fine netting."),
      harvest: l("Recoltați când căpățâna e tare și compactă.", "Harvest when the head is firm and compact."),
    },
    symptoms: [
      symptom(l("Frunze roase, cu găuri mari", "Leaves chewed with large holes"), l("Probabil omizi de fluture alb al verzei", "Probably cabbage white caterpillars"), l("Verificați dosul frunzelor și folosiți plasă anti-insecte.", "Check under the leaves and use insect netting.")),
      symptom(l("Căpățâna crapă", "Head splitting open"), l("Absorbție bruscă de apă după secetă", "Sudden water uptake after a dry spell"), l("Udați constant și recoltați căpățânile mature.", "Water steadily and harvest mature heads.")),
    ],
  }),
  carrot: crop({
    id: "carrot", emoji: "🥕", category: "root",
    name: l("Morcov", "Carrot"), typeExample: l("Nantes", "Nantes"),
    ecocrop: { code: 871, scientificName: "Daucus carota", tempOptimal: { min: 15, max: 24 }, tempAbsolute: { min: 3, max: 30 }, phOptimal: { min: 5.8, max: 6.8 }, phAbsolute: { min: 4.2, max: 8.7 }, cycleDays: { min: 40, max: 150 }, killingTemp: 0, light: "clear skies" },
    soilMoisture: { min: 40, max: 65 }, humidity: { min: 50, max: 70 },
    soilTemperature: { min: 12, max: 22 }, soilEc: { min: 0.6, max: 1.6 }, irrigationBaseHours: 36,
    economics: { yieldKgPerCycle: 0.12, cycleDays: 95, pricePerKg: 4 },
    tip: l("Morcovul are nevoie de sol afânat, fără pietre; solul tasat face rădăcini strâmbe.", "Carrots need loose, stone-free soil; compacted soil makes forked roots."),
    learn: {
      start: l("Semănați direct, superficial, și mențineți solul umed până la răsărire (2–3 săptămâni).", "Sow directly and shallowly, and keep the soil moist until they come up (2–3 weeks)."),
      care: l("Răriți la 4–5 cm și udați rar dar profund.", "Thin to 4–5 cm apart and water deeply but less often."),
      harvest: l("Recoltați când umărul rădăcinii are 2–3 cm diametru.", "Harvest when the top of the root is 2–3 cm across."),
    },
    symptoms: [
      symptom(l("Rădăcini despicate sau ramificate", "Split or forked roots"), l("Sol tasat sau udare neregulată", "Compacted soil or irregular watering"), l("Afânați solul și udați uniform.", "Loosen the soil and water evenly.")),
      symptom(l("Galerii în rădăcini", "Tunnels in the roots"), l("Probabil musca morcovului", "Probably carrot fly"), l("Acoperiți cu plasă fină și evitați să rupeți frunzele la rărit.", "Cover with fine mesh and avoid bruising leaves when thinning.")),
    ],
  }),
  "green-onion": crop({
    id: "green-onion", emoji: "🧅", category: "leafy",
    name: l("Ceapă verde", "Green onion"), typeExample: l("Ceapă de iarnă", "Bunching onion"),
    ecocrop: { code: 365, scientificName: "Allium fistulosum", tempOptimal: { min: 12, max: 25 }, tempAbsolute: { min: 6, max: 30 }, phOptimal: { min: 6.6, max: 7.4 }, phAbsolute: { min: 5.5, max: 8.5 }, cycleDays: { min: 60, max: 160 }, killingTemp: null, light: "clear skies" },
    soilMoisture: { min: 40, max: 65 }, humidity: { min: 50, max: 70 },
    soilTemperature: { min: 12, max: 24 }, soilEc: { min: 0.8, max: 2 }, irrigationBaseHours: 36,
    economics: { yieldKgPerCycle: 0.1, cycleDays: 90, pricePerKg: 12 },
    tip: l("Ceapa verde se poate tăia de mai multe ori dacă lăsați 3–4 cm deasupra solului.", "Green onions can be cut several times if you leave 3–4 cm above the soil."),
    learn: {
      start: l("Semănați des în rânduri sau plantați arpagic, la 1 cm adâncime.", "Sow thickly in rows or plant small sets, 1 cm deep."),
      care: l("Mențineți solul reavăn și fără buruieni; nu are nevoie de multă fertilizare.", "Keep the soil moist and weed-free; it needs little feeding."),
      harvest: l("Recoltați când tulpinile au 20–30 cm.", "Harvest when stems are 20–30 cm tall."),
    },
    symptoms: [
      symptom(l("Vârfurile frunzelor se usucă", "Leaf tips drying out"), l("Sol prea uscat sau exces de săruri", "Soil too dry or too much salt"), l("Udați mai regulat și verificați EC-ul.", "Water more regularly and check EC.")),
      symptom(l("Pete albicioase, argintii pe frunze", "Silvery white streaks on leaves"), l("Probabil tripși", "Probably thrips"), l("Inspectați plantele și folosiți capcane lipicioase albastre.", "Inspect plants and use blue sticky traps.")),
    ],
  }),
  beans: crop({
    id: "beans", emoji: "🫘", category: "legume",
    name: l("Fasole verde", "Green beans"), typeExample: l("Fasole pitică", "Bush bean"),
    ecocrop: { code: 1668, scientificName: "Phaseolus vulgaris", tempOptimal: { min: 16, max: 25 }, tempAbsolute: { min: 7, max: 32 }, phOptimal: { min: 5.5, max: 7.5 }, phAbsolute: { min: 4, max: 9 }, cycleDays: { min: 50, max: 270 }, killingTemp: null, light: "very bright" },
    soilMoisture: { min: 40, max: 65 }, humidity: { min: 50, max: 70 },
    soilTemperature: { min: 16, max: 26 }, soilEc: { min: 0.6, max: 1.6 }, irrigationBaseHours: 30,
    economics: { yieldKgPerCycle: 0.4, cycleDays: 75, pricePerKg: 12 },
    tip: l("Fasolea își produce singură o parte din azot, deci nu o fertilizați excesiv cu azot.", "Beans fix part of their own nitrogen, so do not overfeed them with nitrogen."),
    learn: {
      start: l("Semănați direct când solul are peste 15 °C, la 3–4 cm adâncime.", "Sow directly once the soil is above 15 °C, 3–4 cm deep."),
      care: l("Udați constant în timpul înfloririi; soiurile urcătoare au nevoie de araci.", "Water steadily during flowering; climbing types need poles."),
      harvest: l("Recoltați păstăile tinere, înainte să se umfle boabele.", "Pick pods young, before the beans swell."),
    },
    symptoms: [
      symptom(l("Florile cad", "Flowers dropping"), l("Căldură excesivă sau sol uscat în timpul înfloririi", "Too much heat or dry soil during flowering"), l("Udați constant și umbriți în zilele foarte calde.", "Water steadily and shade on very hot days.")),
      symptom(l("Frunze cu pete ruginii", "Leaves with rusty spots"), l("Probabil rugină, favorizată de frunze ude", "Probably rust, favoured by wet leaves"), l("Udați la bază și îndepărtați frunzele afectate.", "Water at the base and remove affected leaves.")),
    ],
  }),
  strawberry: crop({
    id: "strawberry", emoji: "🍓", category: "berry",
    name: l("Căpșun", "Strawberry"), scientificName: "Fragaria × ananassa", typeExample: l("Elsanta", "Elsanta"),
    ecocrop: { code: 1112, scientificName: "Fragaria x ananassa", tempOptimal: { min: 11, max: 24 }, tempAbsolute: { min: 6, max: 28 }, phOptimal: { min: 6, max: 6.8 }, phAbsolute: { min: 4.5, max: 8.2 }, cycleDays: { min: 180, max: 270 }, killingTemp: null, light: "very bright" },
    soilMoisture: { min: 40, max: 65 }, humidity: { min: 60, max: 75 },
    soilTemperature: { min: 12, max: 22 }, soilEc: { min: 0.6, max: 1.5 }, irrigationBaseHours: 24,
    economics: { yieldKgPerCycle: 0.5, cycleDays: 225, pricePerKg: 20 },
    tip: l("Căpșunii sunt sensibili la săruri și la apa stătătoare: udați moderat și evitați excesul de îngrășământ.", "Strawberries are sensitive to salt and standing water, so water moderately and avoid overfeeding."),
    learn: {
      start: l("Plantați stoloni cu coletul la nivelul solului, la 30 cm distanță.", "Plant runners with the crown at soil level, 30 cm apart."),
      care: l("Mulciți cu paie, udați la bază și îndepărtați stolonii în exces.", "Mulch with straw, water at the base, and remove extra runners."),
      harvest: l("Recoltați fructele complet colorate, cu codiță, dimineața.", "Pick fully coloured fruit with the stalk on, in the morning."),
    },
    symptoms: [
      symptom(l("Mucegai gri pe fructe", "Grey mould on the fruit"), l("Probabil putregai cenușiu, favorizat de umezeală", "Probably grey mould, favoured by damp conditions"), l("Aerisiți, mulciți și îndepărtați imediat fructele afectate.", "Ventilate, mulch, and remove affected fruit at once.")),
      symptom(l("Frunzele se ofilesc deși solul e ud", "Leaves wilting although the soil is wet"), l("Posibil putrezirea rădăcinilor din cauza excesului de apă", "Possible root rot from too much water"), l("Lăsați solul să se zvânte și verificați drenajul.", "Let the soil dry a little and check drainage.")),
    ],
  }),
  basil: crop({
    id: "basil", emoji: "🌿", category: "herb",
    name: l("Busuioc", "Basil"), typeExample: l("Busuioc genovez", "Genovese"),
    ecocrop: { code: 1547, scientificName: "Ocimum basilicum", tempOptimal: { min: 18, max: 27 }, tempAbsolute: { min: 7, max: 36 }, phOptimal: { min: 6, max: 7 }, phAbsolute: { min: 4.3, max: 8.2 }, cycleDays: { min: 80, max: 270 }, killingTemp: null, light: "very bright" },
    soilMoisture: { min: 30, max: 60 }, humidity: { min: 40, max: 70 }, light: { min: 300, max: 650 },
    soilTemperature: { min: 18, max: 26 }, soilEc: { min: 0.8, max: 2 }, irrigationBaseHours: 36,
    economics: { yieldKgPerCycle: 0.5, cycleDays: 60, pricePerKg: 40 },
    tip: l("Busuiocul nu suportă frigul și umezeala. Ciupiți bobocii florali și recoltați de sus ca să rămână stufos.", "Basil dislikes cold and damp. Pinch off flower buds and harvest from the top to keep it leafy."),
    learn: {
      start: l("Semănați la peste 20 °C, superficial; răsare în 5–10 zile.", "Sow above 20 °C, shallowly; it comes up in 5–10 days."),
      care: l("Udați dimineața, la bază, și ciupiți vârfurile pentru ramificare.", "Water in the morning at the base, and pinch the tips to make it branch."),
      harvest: l("Tăiați deasupra unei perechi de frunze, de sus în jos.", "Cut just above a pair of leaves, working from the top down."),
    },
    symptoms: [
      symptom(l("Frunze îngălbenite, cu puf gri-violet dedesubt", "Yellowing leaves with grey-purple fuzz underneath"), l("Posibil mană, favorizată de aer umed și frunze ude", "Possibly downy mildew, favoured by damp air and wet leaves"), l("Reduceți umiditatea, aerisiți, nu udați frunzele și îndepărtați părțile afectate.", "Lower humidity, improve airflow, avoid wetting leaves, and remove affected growth.")),
      symptom(l("Tulpini lungi și subțiri, cu puține frunze", "Tall, thin stems with few leaves"), l("Prea puțină lumină", "Too little light"), l("Măriți lumina și ciupiți vârfurile pentru o plantă mai stufoasă.", "Increase light and pinch back the tips to encourage bushier growth.")),
      symptom(l("Pete închise sau negre după o noapte rece", "Dark or black patches after a cool night"), l("Posibilă vătămare de frig", "Possible cold damage"), l("Țineți planta mai la cald, mai ales noaptea.", "Keep the plant warmer, especially overnight.")),
    ],
  }),
  parsley: crop({
    id: "parsley", emoji: "🌿", category: "herb",
    name: l("Pătrunjel", "Parsley"), typeExample: l("Pătrunjel creț", "Curly parsley"),
    ecocrop: { code: 1661, scientificName: "Petroselinum crispum", tempOptimal: { min: 11, max: 20 }, tempAbsolute: { min: 7, max: 28 }, phOptimal: { min: 6, max: 7.5 }, phAbsolute: { min: 5.3, max: 8.3 }, cycleDays: { min: 70, max: 365 }, killingTemp: 0, light: "clear skies" },
    soilMoisture: { min: 40, max: 65 }, humidity: { min: 50, max: 70 },
    soilTemperature: { min: 12, max: 22 }, soilEc: { min: 0.8, max: 1.8 }, irrigationBaseHours: 36,
    economics: { yieldKgPerCycle: 0.3, cycleDays: 120, pricePerKg: 25 },
    tip: l("Pătrunjelul răsare încet: înmuiați semințele peste noapte înainte de semănat.", "Parsley germinates slowly, so soak the seeds overnight before sowing."),
    learn: {
      start: l("Semănați la 1 cm adâncime și aveți răbdare: răsare în 2–4 săptămâni.", "Sow 1 cm deep and be patient: it takes 2–4 weeks to come up."),
      care: l("Mențineți solul reavăn și recoltați regulat ca să producă frunze noi.", "Keep the soil moist and harvest regularly so it makes new leaves."),
      harvest: l("Tăiați tulpinile exterioare de la bază.", "Cut the outer stems at the base."),
    },
    symptoms: [
      symptom(l("Frunze îngălbenite", "Yellowing leaves"), l("Exces de apă sau lipsă de azot", "Too much water or a lack of nitrogen"), l("Verificați drenajul și fertilizați ușor.", "Check drainage and feed lightly.")),
      symptom(l("Omizi verzi cu dungi negre", "Green caterpillars with black stripes"), l("Larvele fluturelui coada-rândunicii", "Swallowtail butterfly larvae"), l("Îndepărtați-le manual dacă fac pagube mari.", "Remove them by hand if they cause heavy damage.")),
    ],
  }),
  dill: crop({
    id: "dill", emoji: "🌿", category: "herb",
    name: l("Mărar", "Dill"), typeExample: l("Mărar de grădină", "Bouquet"),
    ecocrop: { code: 2192, scientificName: "Anethum graveolens", tempOptimal: { min: 15, max: 18 }, tempAbsolute: { min: 6, max: 26 }, phOptimal: { min: 6, max: 7 }, phAbsolute: { min: 5, max: 8 }, cycleDays: { min: 100, max: 180 }, killingTemp: 0, light: "clear skies" },
    soilMoisture: { min: 35, max: 60 }, humidity: { min: 40, max: 60 },
    airTemperature: { min: 15, max: 22 },
    soilTemperature: { min: 12, max: 22 }, soilEc: { min: 0.8, max: 1.8 }, irrigationBaseHours: 48,
    economics: { yieldKgPerCycle: 0.15, cycleDays: 60, pricePerKg: 25 },
    tip: l("Mărarul nu suportă bine răsădirea: semănați-l direct unde va crește.", "Dill does not transplant well, so sow it where it will grow."),
    learn: {
      start: l("Semănați direct, eșalonat la 2–3 săptămâni, pentru recoltă continuă.", "Sow directly every 2–3 weeks for a continuous harvest."),
      care: l("Udați moderat; tolerează solul ceva mai uscat decât alte verdețuri.", "Water moderately; it copes with somewhat drier soil than other herbs."),
      harvest: l("Recoltați frunzele tinere înainte de înflorire.", "Harvest young leaves before it flowers."),
    },
    symptoms: [
      symptom(l("Planta înflorește repede", "Plant flowering quickly"), l("Căldură sau zile lungi", "Heat or long days"), l("Semănați eșalonat și recoltați devreme.", "Sow in succession and harvest early.")),
      symptom(l("Colonii de insecte mici, verzi sau negre", "Clusters of small green or black insects"), l("Probabil afide", "Probably aphids"), l("Spălați cu jet de apă sau folosiți săpun insecticid.", "Wash them off with water or use insecticidal soap.")),
    ],
  }),
  custom: crop({
    id: "custom", emoji: "🌱", category: "herb",
    name: l("Plantă personalizată", "Custom plant"), scientificName: "", typeExample: l("", ""),
    ecocrop: null,
    soilMoisture: { min: 35, max: 65 }, humidity: { min: 40, max: 70 }, light: { min: 250, max: 700 },
    soilTemperature: { min: 16, max: 27 }, soilEc: { min: 0.5, max: 3 }, irrigationBaseHours: 24,
    economics: { yieldKgPerCycle: 1, cycleDays: 90, pricePerKg: 10 },
    tip: l("Acestea sunt valori generale. Căutați nevoile speciei voastre și ajustați țintele în profilul plantei.", "These are general starting values. Look up your species' needs and adjust the targets in its plant profile."),
    learn: {
      start: l("Verificați pe ambalajul semințelor temperatura și adâncimea de semănat.", "Check the seed packet for sowing temperature and depth."),
      care: l("Urmăriți umiditatea solului și lumina, apoi ajustați țintele după cum reacționează planta.", "Watch soil moisture and light, then adjust the targets to how the plant responds."),
      harvest: l("Recoltați după indicațiile specifice speciei.", "Harvest according to the species' own guidance."),
    },
    symptoms: [
      symptom(l("Se ofilește deși solul e ud", "Wilting while the soil is wet"), l("Posibil stres al rădăcinilor din exces de apă sau drenaj slab", "Possible root stress from overwatering or poor drainage"), l("Lăsați solul să se zvânte și verificați drenajul.", "Let the soil dry slightly and check drainage.")),
      symptom(l("Creștere înaltă, palidă, alungită", "Tall, pale, stretched growth"), l("Prea puțină lumină", "Too little light"), l("Măriți intensitatea sau durata luminii.", "Increase light intensity or the length of the lit period.")),
      symptom(l("Margini maronii, crocante ale frunzelor", "Brown, crispy leaf edges"), l("Posibil aer uscat, udare insuficientă sau prea mult îngrășământ", "Possible dry air, underwatering, or too much fertiliser"), l("Verificați umiditatea, umiditatea solului și EC-ul.", "Check humidity, soil moisture, and EC.")),
    ],
  }),
} satisfies Record<string, CropProfile>;

export type PlantSpeciesId = keyof typeof cropCatalog;
export const cropIds = Object.keys(cropCatalog) as PlantSpeciesId[];

export function isCropId(value: unknown): value is PlantSpeciesId {
  return typeof value === "string" && Object.hasOwn(cropCatalog, value);
}
