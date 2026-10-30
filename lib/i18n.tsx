"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "uz" | "en";

const DICT = {
  // navigation
  "nav.home": { uz: "Bosh sahifa", en: "Home" },
  "nav.atlas": { uz: "3D Atlas", en: "3D Atlas" },
  "nav.dynamics": { uz: "O‘simlik", en: "Plants" },
  "nav.specimen": { uz: "Namuna", en: "Specimen" },
  "nav.import": { uz: "Excel import", en: "Excel import" },
  "nav.download": { uz: "Ma’lumotni yuklash", en: "Download dataset" },
  "nav.about": { uz: "Loyiha haqida", en: "About" },
  "brand.title": { uz: "TASH Milliy gerbariysi", en: "National Herbarium TASH" },
  "brand.sub": { uz: "Pan-Osiyo biologik xilma-xillik portali", en: "Pan-Asian Biodiversity Portal" },

  // home
  "home.kicker": { uz: "O‘zbekiston Fanlar akademiyasi · Botanika instituti", en: "Academy of Sciences of Uzbekistan · Institute of Botany" },
  "h.inst": { uz: "Botanika instituti", en: "Institute of Botany" },
  "h.acad": { uz: "O‘zbekiston Fanlar akademiyasi", en: "Academy of Sciences of Uzbekistan" },
  "h.t1": { uz: "MILLIY GERBARIY TASH", en: "NATIONAL HERBARIUM TASH" },
  "h.t2": { uz: "PAN-OSIYO BIOXILMA-XILLIK PORTALI", en: "PAN-ASIAN BIODIVERSITY PORTAL" },
  "h.lead": { uz: "Raqamli gerbariy orqali O‘rta Osiyo va butun Pan-Osiyo hududining boy o‘simlik dunyosini o‘rganing va asrang.", en: "Explore, study and preserve the rich plant diversity of Central Asia and the wider Pan-Asian region through our digital herbarium." },
  "h.ph": { uz: "Tur, shtrix-kod, yig‘uvchi, birikma qidiring…", en: "Search taxon, barcode, collector, compound..." },
  "h.pop": { uz: "Ommabop qidiruvlar:", en: "Popular searches:" },
  "stat.collectors": { uz: "Yig‘uvchilar", en: "Collectors" },
  "c1.t": { uz: "3D relyef atlasi", en: "3D Terrain Atlas" }, "c1.d": { uz: "Sun’iy yo‘ldosh va topografik 3D relyef, 0,000001° telemetriya, poligon filtri va yillar slayderi.", en: "Satellite & topographic 3D relief, 0,000001° telemetry, polygon filtering and a collection-year slider." },
  "c2.t": { uz: "Namuna ko‘rish", en: "Specimen Viewer" }, "c2.d": { uz: "Gerbariy varag‘ini asl o‘lchamda kattalashtirib ko‘ring: yorliq, yig‘ish ma’lumotlari va taksonomiya.", en: "Zoom into the original herbarium scan: label, collection data and taxonomy." },
  "c3.t": { uz: "Excel import", en: "Excel Import" }, "c3.d": { uz: "Eski jadvallarni tuzating: DMS, almashgan kenglik/uzunlik, taksonomik xatolar va imkonsiz balandliklar.", en: "Repair legacy spreadsheets: DMS, swapped lat/long, taxonomic typos and impossible elevations." },
  "c4.t": { uz: "Raqamli kolleksiyalar", en: "Digital Collections" }, "c4.d": { uz: "Tasdiqlangan gerbariy varaqlari, rasmlar va metama’lumotlarni to‘plamimizdan ko‘ring.", en: "Browse verified herbarium sheets, images and metadata from our comprehensive collection." },
  "learn": { uz: "Batafsil", en: "Learn more" },
  "mission.t": { uz: "Bizning missiya", en: "Our mission" },
  "mission.d": { uz: "O‘rta Osiyo va Pan-Osiyo hududining boy botanik xilma-xilligini hujjatlashtirish, asrash va ochiq taqdim etish.", en: "To document, preserve and provide open access to the rich botanical diversity of Central Asia and the Pan-Asian region." },
  "home.title": { uz: "Gerbariy namunalari orqali o‘simliklar qanday o‘zgarayotganini kuzating", en: "See how plants are changing through herbarium specimens" },
  "home.lead": { uz: "Skanerlangan namunalar xaritaga joylanadi va yillar bo‘yicha taqqoslanadi: qaysi turlar yo‘qolmoqda, qaysilari kelib qolmoqda, qaysilari ko‘paymoqda.", en: "Scanned specimens are placed on the map and compared across years: which species are disappearing, arriving or increasing." },
  "home.search": { uz: "Tur, muassasa, yig‘uvchi yoki joy nomini qidiring…", en: "Search species, institution, collector or place…" },
  "home.searchBtn": { uz: "Qidirish", en: "Search" },
  "stat.specimens": { uz: "Namunalar", en: "Specimens" },
  "stat.species": { uz: "Turlar", en: "Species" },
  "stat.countries": { uz: "Davlatlar", en: "Countries" },
  "stat.span": { uz: "Yillar oralig‘i", en: "Years covered" },
  "home.how": { uz: "Ish jarayoni", en: "How it works" },
  "step1.t": { uz: "1. Skanerlash", en: "1. Scan" }, "step1.d": { uz: "Har bir gerbariy varag‘i raqamli rasmga olinadi.", en: "Every herbarium sheet is digitised." },
  "step2.t": { uz: "2. Nuqtani aniqlash", en: "2. Locate" }, "step2.d": { uz: "Terilgan joy xaritada belgilanib, koordinatasi tekshiriladi.", en: "The collection site is marked on the map and the coordinates validated." },
  "step3.t": { uz: "3. Yillar bo‘yicha tahlil", en: "3. Compare over time" }, "step3.d": { uz: "Turlarning yo‘qolishi, paydo bo‘lishi va ko‘payishi ko‘rinadi.", en: "Loss, arrival and increase of species become visible." },
  "step4.t": { uz: "4. Yillik boyitish", en: "4. Yearly growth" }, "step4.d": { uz: "Har yili 1 500–3 000 ta yangi namuna qo‘shiladi.", en: "1,500–3,000 new specimens are added every year." },
  "home.featured": { uz: "Tanlangan gerbariy varaqlari", en: "Featured herbarium sheets" },
  "home.browse": { uz: "Hammasini ko‘rish", en: "Browse all" },
  "home.cta.atlas": { uz: "Xaritani ochish", en: "Open the map" },
  "home.cta.dynamics": { uz: "O‘zgarishni ko‘rish", en: "See the change" },
  "home.card.atlas": { uz: "Xarita", en: "Map" }, "home.card.atlas.d": { uz: "Butun O‘rta Osiyo bo‘yicha namunalar, 3D relyef va sun’iy yo‘ldosh tasviri.", en: "Specimens across Central Asia with 3D terrain and satellite imagery." },
  "home.card.dyn": { uz: "O‘simliklar o‘zgarishi", en: "Plant changes" }, "home.card.dyn.d": { uz: "Eski va yangi namunalarni solishtiring: qaysi o‘simliklar kamaygan, ko‘paygan yoki yo‘qolgan.", en: "Compare older and newer specimens: which plants declined, increased or disappeared." },
  "home.card.lab": { uz: "Namuna laboratoriyasi", en: "Specimen lab" }, "home.card.lab.d": { uz: "Varaqni kattalashtirib ko‘rish, o‘lchash va hujayra darajasigacha tahlil.", en: "Zoom into the sheet, measure, and explore down to the cellular level." },
  "foot.about": { uz: "Loyiha haqida", en: "About" }, "foot.about.t": { uz: "Milliy gerbariy (TASH) namunalarini raqamlashtirish va ularni yillar bo‘yicha tahlil qilish loyihasi.", en: "A project to digitise National Herbarium (TASH) specimens and analyse them over the years." },
  "foot.data": { uz: "Ma’lumot manbasi", en: "Data source" }, "foot.data.t": { uz: "Namunalar va rasmlar GBIF’dan (CC0 / CC BY / CC BY-NC). Rasm egalariga havola qiling.", en: "Records and images from GBIF (CC0 / CC BY / CC BY-NC). Please credit image owners." },
  "foot.note": { uz: "Tahlil GBIF’dan olingan namunaga asoslanadi va to‘liq inventarizatsiya o‘rnini bosmaydi.", en: "Analyses use a sample from GBIF and do not replace a full inventory." },

  "hud.title": { uz: "Kursor koordinatasi", en: "Cursor position" },
  "hud.elev": { uz: "Balandlik", en: "Elevation" },
  "hud.profile": { uz: "Balandlik profili (g‘arb → sharq)", en: "Elevation profile (west → east)" },
  "lang.switch": { uz: "EN", en: "UZ" },

  // atlas
  "atlas.search": { uz: "Tur, yig‘uvchi, joy yoki katalog raqami…", en: "Species, collector, place or catalogue no…" },
  "atlas.years": { uz: "Yig‘ilgan yillar", en: "Collection years" },
  "atlas.count": { uz: "ta namuna", en: "specimens" },
  "atlas.more": { uz: "Yana ko‘rsatish", en: "Show more" },
  "atlas.polygon": { uz: "Hudud chizish", en: "Draw area" },
  "atlas.polygonEnd": { uz: "Yopish uchun ikki marta bosing", en: "Double-click to finish" },
  "atlas.clear": { uz: "Tozalash", en: "Clear" },
  "atlas.colorBy": { uz: "Rang:", en: "Colour:" },
  "atlas.color.decade": { uz: "Davr", en: "Decade" },
  "atlas.color.change": { uz: "O‘zgarish", en: "Change" },
  "atlas.change.lost": { uz: "Kamaygan / yo‘qolgan", en: "Declining / lost" },
  "atlas.change.new": { uz: "Yangi / ko‘paygan", en: "New / increasing" },
  "atlas.change.split": { uz: "Davrlar chegarasi", en: "Periods split at" },
  "atlas.color.iucn": { uz: "Himoya holati", en: "Status" },
  "atlas.play": { uz: "Yillar bo‘yicha ijro", en: "Play through time" },
  "atlas.pause": { uz: "To‘xtatish", en: "Pause" },
  "atlas.loadMore": { uz: "GBIF’dan yana 1000 ta namuna yuklash", en: "Load 1,000 more from GBIF" },
  "atlas.loading": { uz: "Yuklanmoqda…", en: "Loading…" },
  "atlas.flyto": { uz: "Hududga o‘tish", en: "Go to" },
  "atlas.country": { uz: "Davlat", en: "Country" },
  "atlas.all": { uz: "Hammasi", en: "All" },
  "atlas.open": { uz: "Laboratoriyada ochish", en: "Open in lab" },
  "atlas.gmaps": { uz: "Google Maps’da ochish", en: "Open in Google Maps" },
  "atlas.gbif": { uz: "GBIF’dagi asl yozuv", en: "Source record on GBIF" },
  "atlas.noMatch": { uz: "Filtrga mos namuna topilmadi.", en: "No specimens match these filters." },
  "atlas.cluster": { uz: "Raqamli doira — shu yerdagi namunalar soni. Bosib yaqinlashtiring.", en: "Numbered circles group nearby specimens. Click to zoom in." },

  // dynamics
  "dyn.title": { uz: "O‘simliklar qanday o‘zgaryapti?", en: "How are plants changing?" },
  "dyn.lead": { uz: "Ikki davrni tanlang va turlarning qanday o‘zgarganini ko‘ring.", en: "Pick two periods and see how the species changed." },
  "dyn.periodA": { uz: "Avvalgi davr (A)", en: "Earlier period (A)" },
  "dyn.periodB": { uz: "Keyingi davr (B)", en: "Later period (B)" },
  "dyn.region": { uz: "Hudud", en: "Region" },
  "dyn.lost": { uz: "Yo‘qolgan", en: "Lost" }, "dyn.lost.d": { uz: "A davrda bor, B davrda topilmagan", en: "Present in A, not found in B" },
  "dyn.new": { uz: "Kelib qolgan", en: "New" }, "dyn.new.d": { uz: "A davrda yo‘q, B davrda paydo bo‘lgan", en: "Absent in A, appears in B" },
  "dyn.up": { uz: "Ko‘payayotgan", en: "Increasing" }, "dyn.up.d": { uz: "B davrda ulushi kamida 1,5 barobar oshgan", en: "Share grew at least 1.5×" },
  "dyn.down": { uz: "Kamayayotgan", en: "Declining" }, "dyn.down.d": { uz: "B davrda ulushi kamida 1,5 barobar kamaygan", en: "Share fell at least 1.5×" },
  "dyn.stable": { uz: "Barqaror", en: "Stable" },
  "dyn.chart1": { uz: "Har o‘nyillikdagi tur xilma-xilligi", en: "Species richness per decade" },
  "dyn.chart1.d": { uz: "Ustun — namunalar soni, chiziq — noyob turlar soni.", en: "Bars = specimens, line = distinct species." },
  "dyn.species": { uz: "Tur", en: "Species" },
  "dyn.family": { uz: "Oila", en: "Family" },
  "dyn.change": { uz: "O‘zgarish", en: "Change" },
  "dyn.trend": { uz: "Yillar bo‘yicha", en: "Over time" },
  "dyn.onMap": { uz: "Xaritada", en: "On map" },
  "dyn.empty": { uz: "Bu toifada tur yo‘q.", en: "No species in this category." },
  "dyn.caveat": { uz: "Diqqat: bu GBIF’dan olingan namunaga asoslangan taxminiy ko‘rsatkich. Tur “topilmadi” degani uning tabiatda yo‘qolgani degani emas — bu faqat gerbariyda yozuv yo‘qligini bildiradi. Xulosa uchun namunalar sonini ko‘paytiring.", en: "Note: this is an indicative view based on a GBIF sample. “Not found” does not prove a species vanished from nature — only that the herbarium holds no record. Load more specimens before drawing conclusions." },
  "dyn.records": { uz: "namuna", en: "specimens" },
  "dyn.share": { uz: "ulushi", en: "share" },
  "dyn.from": { uz: "dan", en: "from" },
  "dyn.to": { uz: "gacha", en: "to" },
  "dyn.allRegions": { uz: "Butun O‘rta Osiyo", en: "All Central Asia" },
  "dyn.sampleN": { uz: "Tahlilga olingan namunalar", en: "Specimens analysed" },
  "dyn.how": { uz: "Qanday hisoblanadi?", en: "How is it calculated?" },
  "dyn.how.d": { uz: "Har bir tur uchun uning har davrdagi ulushi (shu turga tegishli namunalar / davrdagi barcha namunalar) solishtiriladi. Shu sababli davrlardagi namunalar soni har xil bo‘lsa ham taqqoslash adolatli bo‘ladi.", en: "For each species its share in each period (its specimens / all specimens in that period) is compared, so periods with different sample sizes can still be compared fairly." },

  // lab
  "lab.search": { uz: "Namunani qidiring…", en: "Search specimens…" },
  "lab.stage1": { uz: "Gerbariy varag‘i va lupa", en: "Sheet & loupe" },
  "lab.stage250": { uz: "Og‘izcha va chang", en: "Stomata & pollen" },
  "lab.stage2500": { uz: "Xloroplast", en: "Chloroplast" },
  "lab.stage10000": { uz: "Molekula va DNK", en: "Molecule & DNA" },
  "lab.photo": { uz: "Haqiqiy rasm", en: "Real photo" },
  "lab.rendered": { uz: "Chizilgan varaq + o‘lchagich", en: "Rendered sheet + caliper" },
  "lab.magnification": { uz: "Kattalashtirish", en: "Magnification" },
  "lab.lens": { uz: "Lupa o‘lchami", en: "Lens size" },
  "lab.filter": { uz: "Rasm filtri", en: "Image filter" },
  "lab.loupe": { uz: "Lupa", en: "Loupe" },
  "lab.caliper": { uz: "Chizg‘ich (mm)", en: "Caliper (mm)" },

  // import
  "imp.title": { uz: "Excel’dan import va koordinatalarni tekshirish", en: "Excel import & coordinate validation" },
  "imp.lead": { uz: "Eski jadvalni tashlang. Koordinatalar, tur nomlari va balandlik avtomatik tekshiriladi, xatolar tuzatishdan oldin ko‘rsatiladi.", en: "Drop a legacy spreadsheet. Coordinates, species names and elevation are checked automatically; every fix is shown before you apply it." },
  "imp.sample": { uz: "Xatolari bor namunaviy Excel’ni yuklash", en: "Load sample Excel with deliberate errors" },
  "imp.drop": { uz: ".xlsx / .csv faylni shu yerga tashlang yoki bosib tanlang", en: "Drop an .xlsx / .csv here, or click to choose" },
  "imp.fixall": { uz: "Hammasini tuzatib, xaritaga chiqarish", en: "Fix all & show on map" },
} as const;

export type Key = keyof typeof DICT;

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }
const LangCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => DICT[k].en });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => { try { const l = localStorage.getItem("lang"); if (l === "en" || l === "uz") setLangState(l); } catch { /* ignore */ } }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem("lang", l); } catch { /* ignore */ } }, []);
  const t = useCallback((k: Key) => DICT[k][lang], [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}
export const useLang = () => useContext(LangCtx);
