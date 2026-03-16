import type { RedAlert, TelegramMessage } from "@shared/schema";
import { latestTgMsgs } from "../lib/shared-state";
import WebSocket from "ws";

const RED_ALERT_POOL: Omit<RedAlert, 'timestamp' | 'active'>[] = [
  // ISRAEL
  { id: 'ra1', city: 'Sderot', cityHe: 'שדרות', cityAr: 'سديروت', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', country: 'Israel', countryCode: 'IL', countdown: 15, threatType: 'rockets', lat: 31.525, lng: 34.596 },
  { id: 'ra2', city: 'Ashkelon', cityHe: 'אשקלון', cityAr: 'عسقلان', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', country: 'Israel', countryCode: 'IL', countdown: 30, threatType: 'rockets', lat: 31.669, lng: 34.571 },
  { id: 'ra3', city: 'Be\'er Sheva', cityHe: 'באר שבע', cityAr: 'بئر السبع', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', country: 'Israel', countryCode: 'IL', countdown: 60, threatType: 'rockets', lat: 31.252, lng: 34.791 },
  { id: 'ra4', city: 'Tel Aviv', cityHe: 'תל אביב', cityAr: 'تل أبيب', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'rockets', lat: 32.085, lng: 34.782 },
  { id: 'ra5', city: 'Haifa', cityHe: 'חיפה', cityAr: 'حيفا', region: 'Haifa Bay', regionHe: 'מפרץ חיפה', regionAr: 'خليج حيفا', country: 'Israel', countryCode: 'IL', countdown: 60, threatType: 'rockets', lat: 32.794, lng: 34.990 },
  { id: 'ra6', city: 'Kiryat Shmona', cityHe: 'קריית שמונה', cityAr: 'كريات شمونة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', country: 'Israel', countryCode: 'IL', countdown: 0, threatType: 'rockets', lat: 33.208, lng: 35.571 },
  { id: 'ra7', city: 'Nahariya', cityHe: 'נהריה', cityAr: 'نهاريا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', country: 'Israel', countryCode: 'IL', countdown: 15, threatType: 'rockets', lat: 33.005, lng: 35.098 },
  { id: 'ra8', city: 'Metula', cityHe: 'מטולה', cityAr: 'المطلة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', country: 'Israel', countryCode: 'IL', countdown: 0, threatType: 'rockets', lat: 33.280, lng: 35.578 },
  { id: 'ra9', city: 'Tiberias', cityHe: 'טבריה', cityAr: 'طبريا', region: 'Sea of Galilee', regionHe: 'כנרת', regionAr: 'بحيرة طبريا', country: 'Israel', countryCode: 'IL', countdown: 30, threatType: 'missiles', lat: 32.796, lng: 35.530 },
  { id: 'ra10', city: 'Netanya', cityHe: 'נתניה', cityAr: 'نتانيا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'hostile_aircraft_intrusion', lat: 32.333, lng: 34.857 },
  { id: 'ra11', city: 'Safed', cityHe: 'צפת', cityAr: 'صفد', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', country: 'Israel', countryCode: 'IL', countdown: 15, threatType: 'uav_intrusion', lat: 32.966, lng: 35.496 },
  { id: 'ra12', city: 'Eilat', cityHe: 'אילת', cityAr: 'إيلات', region: 'Southern Negev', regionHe: 'דרום הנגב', regionAr: 'النقب الجنوبي', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'missiles', lat: 29.558, lng: 34.952 },
  { id: 'ra13', city: 'Rishon LeZion', cityHe: 'ראשון לציון', cityAr: 'ريشون لتسيون', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'rockets', lat: 31.964, lng: 34.804 },
  { id: 'ra14', city: 'Petah Tikva', cityHe: 'פתח תקווה', cityAr: 'بيتح تكفا', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'rockets', lat: 32.089, lng: 34.886 },
  { id: 'ra15', city: 'Ashdod', cityHe: 'אשדוד', cityAr: 'أسدود', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', country: 'Israel', countryCode: 'IL', countdown: 45, threatType: 'rockets', lat: 31.801, lng: 34.650 },
  { id: 'ra16', city: 'Herzliya', cityHe: 'הרצליה', cityAr: 'هرتسليا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'rockets', lat: 32.166, lng: 34.846 },
  { id: 'ra17', city: 'Acre', cityHe: 'עכו', cityAr: 'عكا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', country: 'Israel', countryCode: 'IL', countdown: 30, threatType: 'rockets', lat: 32.928, lng: 35.076 },
  { id: 'ra18', city: 'Karmiel', cityHe: 'כרמיאל', cityAr: 'كرميئيل', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجליل الأسفل', country: 'Israel', countryCode: 'IL', countdown: 30, threatType: 'rockets', lat: 32.919, lng: 35.296 },
  { id: 'ra19', city: 'Nof HaGalil', cityHe: 'נוף הגליל', cityAr: 'نوف هجليل', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفל', country: 'Israel', countryCode: 'IL', countdown: 30, threatType: 'uav_intrusion', lat: 32.700, lng: 35.320 },
  { id: 'ra20', city: 'Jerusalem', cityHe: 'ירושלים', cityAr: 'القدس', region: 'Jerusalem', regionHe: 'ירושלים', regionAr: 'القدس', country: 'Israel', countryCode: 'IL', countdown: 90, threatType: 'missiles', lat: 31.769, lng: 35.216 },
  // LEBANON
  { id: 'ra21', city: 'Beirut', cityHe: 'ביירות', cityAr: 'بيروت', region: 'Beirut', regionHe: 'ביירות', regionAr: 'بيروت', country: 'Lebanon', countryCode: 'LB', countdown: 45, threatType: 'missiles', lat: 33.894, lng: 35.502 },
  { id: 'ra22', city: 'Sidon', cityHe: 'צידון', cityAr: 'صيدا', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 30, threatType: 'missiles', lat: 33.563, lng: 35.376 },
  { id: 'ra23', city: 'Tyre', cityHe: 'צור', cityAr: 'صور', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 15, threatType: 'missiles', lat: 33.273, lng: 35.194 },
  { id: 'ra24', city: 'Tripoli', cityHe: 'טריפולי', cityAr: 'طرابلس', region: 'North Lebanon', regionHe: 'צפון לבנון', regionAr: 'شمال لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 60, threatType: 'missiles', lat: 34.437, lng: 35.850 },
  { id: 'ra25', city: 'Baalbek', cityHe: 'בעלבכ', cityAr: 'بعلبك', region: 'Bekaa Valley', regionHe: 'בקעת הבקאע', regionAr: 'وادي البقاع', country: 'Lebanon', countryCode: 'LB', countdown: 30, threatType: 'missiles', lat: 34.006, lng: 36.218 },
  { id: 'ra26', city: 'Nabatieh', cityHe: 'נבטייה', cityAr: 'النبطية', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.378, lng: 35.484 },
  // IRAN
  { id: 'ra27', city: 'Tehran', cityHe: 'טהרן', cityAr: 'طهران', region: 'Tehran Province', regionHe: 'מחוז טהרן', regionAr: 'محافظة طهران', country: 'Iran', countryCode: 'IR', countdown: 120, threatType: 'missiles', lat: 35.689, lng: 51.389 },
  { id: 'ra28', city: 'Isfahan', cityHe: 'אספהאן', cityAr: 'أصفهان', region: 'Isfahan Province', regionHe: 'מחוז אספהאן', regionAr: 'محافظة أصفهان', country: 'Iran', countryCode: 'IR', countdown: 120, threatType: 'missiles', lat: 32.655, lng: 51.668 },
  { id: 'ra29', city: 'Shiraz', cityHe: 'שיראז', cityAr: 'شيراز', region: 'Fars Province', regionHe: 'מחוז פארס', regionAr: 'محافظة فارس', country: 'Iran', countryCode: 'IR', countdown: 90, threatType: 'missiles', lat: 29.592, lng: 52.584 },
  { id: 'ra30', city: 'Tabriz', cityHe: 'תבריז', cityAr: 'تبريز', region: 'East Azerbaijan', regionHe: 'אזרבייג\'ן מזרחי', regionAr: 'أذربيجان الشرقية', country: 'Iran', countryCode: 'IR', countdown: 90, threatType: 'missiles', lat: 38.080, lng: 46.292 },
  { id: 'ra31', city: 'Kermanshah', cityHe: 'כרמנשאה', cityAr: 'كرمانشاه', region: 'Kermanshah Province', regionHe: 'מחוז כרמנשאה', regionAr: 'محافظة كرمانشاه', country: 'Iran', countryCode: 'IR', countdown: 60, threatType: 'missiles', lat: 34.314, lng: 47.065 },
  { id: 'ra32', city: 'Bandar Abbas', cityHe: 'בנדר עבאס', cityAr: 'بندر عباس', region: 'Hormozgan', regionHe: 'הורמוזגן', regionAr: 'هرمزجان', country: 'Iran', countryCode: 'IR', countdown: 90, threatType: 'missiles', lat: 27.183, lng: 56.267 },
  { id: 'ra33', city: 'Bushehr', cityHe: 'בושהר', cityAr: 'بوشهر', region: 'Bushehr Province', regionHe: 'מחוז בושהר', regionAr: 'محافظة بوشهر', country: 'Iran', countryCode: 'IR', countdown: 120, threatType: 'missiles', lat: 28.922, lng: 50.838 },
  // SYRIA
  { id: 'ra34', city: 'Damascus', cityHe: 'דמשק', cityAr: 'دمشق', region: 'Damascus', regionHe: 'דמשק', regionAr: 'دمشق', country: 'Syria', countryCode: 'SY', countdown: 60, threatType: 'missiles', lat: 33.514, lng: 36.277 },
  { id: 'ra35', city: 'Aleppo', cityHe: 'חלב', cityAr: 'حلب', region: 'Aleppo Governorate', regionHe: 'מחוז חלב', regionAr: 'محافظة حلب', country: 'Syria', countryCode: 'SY', countdown: 90, threatType: 'missiles', lat: 36.202, lng: 37.160 },
  { id: 'ra36', city: 'Homs', cityHe: 'חומס', cityAr: 'حمص', region: 'Homs Governorate', regionHe: 'מחוז חומס', regionAr: 'محافظة حمص', country: 'Syria', countryCode: 'SY', countdown: 45, threatType: 'missiles', lat: 34.730, lng: 36.720 },
  { id: 'ra37', city: 'Latakia', cityHe: 'לטקיה', cityAr: 'اللاذقية', region: 'Latakia Governorate', regionHe: 'מחוז לטקיה', regionAr: 'محافظة اللاذقية', country: 'Syria', countryCode: 'SY', countdown: 60, threatType: 'missiles', lat: 35.540, lng: 35.770 },
  { id: 'ra38', city: 'Deir ez-Zor', cityHe: 'דיר א-זור', cityAr: 'دير الزور', region: 'Deir ez-Zor', regionHe: 'דיר א-זור', regionAr: 'دير الزور', country: 'Syria', countryCode: 'SY', countdown: 30, threatType: 'uav_intrusion', lat: 35.336, lng: 40.146 },
  // IRAQ
  { id: 'ra39', city: 'Baghdad', cityHe: 'בגדד', cityAr: 'بغداد', region: 'Baghdad', regionHe: 'בגדד', regionAr: 'بغداد', country: 'Iraq', countryCode: 'IQ', countdown: 90, threatType: 'rockets', lat: 33.313, lng: 44.366 },
  { id: 'ra40', city: 'Erbil', cityHe: 'ארביל', cityAr: 'أربيل', region: 'Kurdistan Region', regionHe: 'כורדיסטן', regionAr: 'إقليم كردستان', country: 'Iraq', countryCode: 'IQ', countdown: 60, threatType: 'missiles', lat: 36.191, lng: 44.009 },
  { id: 'ra41', city: 'Basra', cityHe: 'בצרה', cityAr: 'البصرة', region: 'Basra Governorate', regionHe: 'מחוז בצרה', regionAr: 'محافظة البصرة', country: 'Iraq', countryCode: 'IQ', countdown: 90, threatType: 'rockets', lat: 30.508, lng: 47.783 },
  { id: 'ra42', city: 'Sulaymaniyah', cityHe: 'סולימאניה', cityAr: 'السليمانية', region: 'Kurdistan Region', regionHe: 'כורדיסטן', regionAr: 'إقليم كردستان', country: 'Iraq', countryCode: 'IQ', countdown: 45, threatType: 'uav_intrusion', lat: 35.557, lng: 45.435 },
  // SAUDI ARABIA
  { id: 'ra43', city: 'Riyadh', cityHe: 'ריאד', cityAr: 'الرياض', region: 'Riyadh Region', regionHe: 'מחוז ריאד', regionAr: 'منطقة الرياض', country: 'Saudi Arabia', countryCode: 'SA', countdown: 120, threatType: 'missiles', lat: 24.713, lng: 46.675 },
  { id: 'ra44', city: 'Jeddah', cityHe: 'ג\'דה', cityAr: 'جدة', region: 'Makkah Region', regionHe: 'מחוז מכה', regionAr: 'منطقة مكة المكرمة', country: 'Saudi Arabia', countryCode: 'SA', countdown: 120, threatType: 'missiles', lat: 21.486, lng: 39.177 },
  { id: 'ra45', city: 'Dhahran', cityHe: 'דהרן', cityAr: 'الظهران', region: 'Eastern Province', regionHe: 'המחוז המזרחי', regionAr: 'المنطقة الشرقية', country: 'Saudi Arabia', countryCode: 'SA', countdown: 60, threatType: 'missiles', lat: 26.282, lng: 50.114 },
  { id: 'ra46', city: 'Abha', cityHe: 'אבהא', cityAr: 'أبها', region: 'Asir Region', regionHe: 'מחוז עסיר', regionAr: 'منطقة عسير', country: 'Saudi Arabia', countryCode: 'SA', countdown: 45, threatType: 'uav_intrusion', lat: 18.216, lng: 42.505 },
  { id: 'ra47', city: 'Jizan', cityHe: 'ג\'יזאן', cityAr: 'جيزان', region: 'Jizan Region', regionHe: 'מחוז ג\'יזאן', regionAr: 'منطقة جازان', country: 'Saudi Arabia', countryCode: 'SA', countdown: 30, threatType: 'rockets', lat: 16.889, lng: 42.551 },
  // YEMEN
  { id: 'ra48', city: 'Sanaa', cityHe: 'צנעא', cityAr: 'صنعاء', region: 'Sanaa Governorate', regionHe: 'מחוז צנעא', regionAr: 'محافظة صنعاء', country: 'Yemen', countryCode: 'YE', countdown: 30, threatType: 'missiles', lat: 15.355, lng: 44.207 },
  { id: 'ra49', city: 'Aden', cityHe: 'עדן', cityAr: 'عدن', region: 'Aden Governorate', regionHe: 'מחוז עדן', regionAr: 'محافظة عدن', country: 'Yemen', countryCode: 'YE', countdown: 45, threatType: 'missiles', lat: 12.779, lng: 45.037 },
  { id: 'ra50', city: 'Marib', cityHe: 'מאריב', cityAr: 'مأرب', region: 'Marib Governorate', regionHe: 'מחוז מאריב', regionAr: 'محافظة مأرب', country: 'Yemen', countryCode: 'YE', countdown: 15, threatType: 'rockets', lat: 15.454, lng: 45.323 },
  // UAE
  { id: 'ra51', city: 'Abu Dhabi', cityHe: 'אבו דאבי', cityAr: 'أبو ظبي', region: 'Abu Dhabi', regionHe: 'אבו דאבי', regionAr: 'أبو ظبي', country: 'UAE', countryCode: 'AE', countdown: 120, threatType: 'missiles', lat: 24.453, lng: 54.377 },
  { id: 'ra52', city: 'Dubai', cityHe: 'דובאי', cityAr: 'دبي', region: 'Dubai', regionHe: 'דובאי', regionAr: 'دبي', country: 'UAE', countryCode: 'AE', countdown: 120, threatType: 'missiles', lat: 25.205, lng: 55.270 },
  // JORDAN
  { id: 'ra53', city: 'Amman', cityHe: 'עמאן', cityAr: 'عمان', region: 'Amman Governorate', regionHe: 'מחוז עמאן', regionAr: 'محافظة العاصمة', country: 'Jordan', countryCode: 'JO', countdown: 90, threatType: 'missiles', lat: 31.951, lng: 35.934 },
  { id: 'ra54', city: 'Irbid', cityHe: 'ארביד', cityAr: 'إربد', region: 'Irbid Governorate', regionHe: 'מחוז ארביד', regionAr: 'محافظة إربد', country: 'Jordan', countryCode: 'JO', countdown: 60, threatType: 'uav_intrusion', lat: 32.556, lng: 35.850 },
  // KUWAIT
  { id: 'ra55', city: 'Kuwait City', cityHe: 'כווית סיטי', cityAr: 'مدينة الكويت', region: 'Al Asimah', regionHe: 'אל-עאצמה', regionAr: 'العاصمة', country: 'Kuwait', countryCode: 'KW', countdown: 90, threatType: 'missiles', lat: 29.376, lng: 47.977 },
  // BAHRAIN
  { id: 'ra56', city: 'Manama', cityHe: 'מנאמה', cityAr: 'المنامة', region: 'Capital Governorate', regionHe: 'מחוז הבירה', regionAr: 'محافظة العاصمة', country: 'Bahrain', countryCode: 'BH', countdown: 90, threatType: 'missiles', lat: 26.223, lng: 50.587 },
  // QATAR
  { id: 'ra57', city: 'Doha', cityHe: 'דוחא', cityAr: 'الدوحة', region: 'Ad Dawhah', regionHe: 'אד-דוחה', regionAr: 'الدوحة', country: 'Qatar', countryCode: 'QA', countdown: 120, threatType: 'missiles', lat: 25.286, lng: 51.534 },
  // GAZA / PALESTINE
  { id: 'ra58', city: 'Gaza', cityHe: 'עזה', cityAr: 'غزة', region: 'Gaza Strip', regionHe: 'רצועת עזה', regionAr: 'قطاع غزة', country: 'Palestine', countryCode: 'PS', countdown: 0, threatType: 'missiles', lat: 31.502, lng: 34.467 },
  { id: 'ra59', city: 'Rafah', cityHe: 'רפיח', cityAr: 'رفح', region: 'Gaza Strip', regionHe: 'רצועת עזה', regionAr: 'قطاع غزة', country: 'Palestine', countryCode: 'PS', countdown: 0, threatType: 'missiles', lat: 31.297, lng: 34.255 },
  { id: 'ra60', city: 'Khan Younis', cityHe: 'חאן יונס', cityAr: 'خان يونس', region: 'Gaza Strip', regionHe: 'רצועת עזה', regionAr: 'قطاع غزة', country: 'Palestine', countryCode: 'PS', countdown: 0, threatType: 'missiles', lat: 31.346, lng: 34.306 },
  { id: 'ra61', city: 'Jabalia', cityHe: "ג'באליה", cityAr: 'جباليا', region: 'Gaza Strip', regionHe: 'רצועת עזה', regionAr: 'قطاع غزة', country: 'Palestine', countryCode: 'PS', countdown: 0, threatType: 'missiles', lat: 31.528, lng: 34.483 },
  { id: 'ra62', city: 'Deir al-Balah', cityHe: 'דיר אל-בלח', cityAr: 'دير البلح', region: 'Gaza Strip', regionHe: 'רצועת עזה', regionAr: 'قطاع غزة', country: 'Palestine', countryCode: 'PS', countdown: 0, threatType: 'missiles', lat: 31.418, lng: 34.350 },
  // YEMEN (expanded)
  { id: 'ra63', city: 'Hodeidah', cityHe: 'חודיידה', cityAr: 'الحديدة', region: 'Hodeidah Governorate', regionHe: 'מחוז חודיידה', regionAr: 'محافظة الحديدة', country: 'Yemen', countryCode: 'YE', countdown: 30, threatType: 'missiles', lat: 14.798, lng: 42.954 },
  { id: 'ra64', city: 'Taiz', cityHe: 'תעיז', cityAr: 'تعز', region: 'Taiz Governorate', regionHe: 'מחוז תעיז', regionAr: 'محافظة تعز', country: 'Yemen', countryCode: 'YE', countdown: 30, threatType: 'rockets', lat: 13.578, lng: 44.022 },
  // IRAQ (expanded)
  { id: 'ra65', city: 'Mosul', cityHe: 'מוסול', cityAr: 'الموصل', region: 'Nineveh', regionHe: 'נינוה', regionAr: 'نينوى', country: 'Iraq', countryCode: 'IQ', countdown: 60, threatType: 'rockets', lat: 36.340, lng: 43.130 },
  { id: 'ra66', city: 'Kirkuk', cityHe: 'כרכוכ', cityAr: 'كركوك', region: 'Kirkuk', regionHe: 'כרכוכ', regionAr: 'كركوك', country: 'Iraq', countryCode: 'IQ', countdown: 45, threatType: 'rockets', lat: 35.468, lng: 44.392 },
  { id: 'ra67', city: 'Fallujah', cityHe: 'פלוג\'ה', cityAr: 'الفلوجة', region: 'Anbar', regionHe: 'אנבר', regionAr: 'الأنبار', country: 'Iraq', countryCode: 'IQ', countdown: 30, threatType: 'rockets', lat: 33.353, lng: 43.784 },
  // SYRIA (expanded)
  { id: 'ra68', city: 'Idlib', cityHe: 'אידליב', cityAr: 'إدلب', region: 'Idlib Governorate', regionHe: 'מחוז אידליב', regionAr: 'محافظة إدلب', country: 'Syria', countryCode: 'SY', countdown: 30, threatType: 'missiles', lat: 35.931, lng: 36.634 },
  { id: 'ra69', city: 'Raqqa', cityHe: 'רקה', cityAr: 'الرقة', region: 'Raqqa Governorate', regionHe: 'מחוז רקה', regionAr: 'محافظة الرقة', country: 'Syria', countryCode: 'SY', countdown: 30, threatType: 'uav_intrusion', lat: 35.952, lng: 39.013 },
  { id: 'ra70', city: 'Daraa', cityHe: 'דרעא', cityAr: 'درعا', region: 'Daraa Governorate', regionHe: 'מחוז דרעא', regionAr: 'محافظة درعا', country: 'Syria', countryCode: 'SY', countdown: 30, threatType: 'rockets', lat: 32.625, lng: 36.106 },
  // IRAN (expanded)
  { id: 'ra71', city: 'Natanz', cityHe: 'נתנז', cityAr: 'نطنز', region: 'Isfahan Province', regionHe: 'מחוז אספהאן', regionAr: 'محافظة أصفهان', country: 'Iran', countryCode: 'IR', countdown: 120, threatType: 'missiles', lat: 33.513, lng: 51.916 },
  { id: 'ra72', city: 'Parchin', cityHe: 'פרצ\'ין', cityAr: 'بارچين', region: 'Tehran Province', regionHe: 'מחוז טהרן', regionAr: 'محافظة طهران', country: 'Iran', countryCode: 'IR', countdown: 120, threatType: 'missiles', lat: 35.522, lng: 51.773 },
  // SOUTH LEBANON (expanded villages)
  { id: 'ra73', city: 'Dahiyeh', cityHe: 'דאחייה', cityAr: 'الضاحية', region: 'Beirut Southern Suburbs', regionHe: 'פרברי ביירות', regionAr: 'الضاحية الجنوبية', country: 'Lebanon', countryCode: 'LB', countdown: 15, threatType: 'missiles', lat: 33.852, lng: 35.492 },
  { id: 'ra74', city: 'Maroun al-Ras', cityHe: 'מארון אל-ראס', cityAr: 'مارون الراس', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.103, lng: 35.460 },
  { id: 'ra75', city: 'Aitaroun', cityHe: 'עיתרון', cityAr: 'عيترون', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.103, lng: 35.425 },
  // LEBANON (expanded — cities, villages, strategic sites)
  { id: 'ra76', city: 'Hermel', cityHe: 'הרמל', cityAr: 'الهرمل', region: 'Baalbek-Hermel', regionHe: 'בעלבכ-הרמל', regionAr: 'بعلبك الهرمل', country: 'Lebanon', countryCode: 'LB', countdown: 30, threatType: 'missiles', lat: 34.394, lng: 36.385 },
  { id: 'ra77', city: 'Jounieh', cityHe: "ג'וניה", cityAr: 'جونيه', region: 'Mount Lebanon', regionHe: 'הר לבנון', regionAr: 'جبل لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 60, threatType: 'missiles', lat: 33.981, lng: 35.618 },
  { id: 'ra78', city: 'Zahle', cityHe: 'זחלה', cityAr: 'زحلة', region: 'Bekaa Valley', regionHe: 'בקעת הבקאע', regionAr: 'وادي البقاع', country: 'Lebanon', countryCode: 'LB', countdown: 30, threatType: 'missiles', lat: 33.846, lng: 35.902 },
  { id: 'ra79', city: 'Bint Jbeil', cityHe: 'בינת ג\'ביל', cityAr: 'بنت جبيل', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.117, lng: 35.432 },
  { id: 'ra80', city: 'Al-Khiam', cityHe: 'אל-חיאם', cityAr: 'الخيام', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.359, lng: 35.611 },
  { id: 'ra81', city: 'Marjayoun', cityHe: 'מרג\'עיון', cityAr: 'مرجعيون', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.359, lng: 35.593 },
  { id: 'ra82', city: 'Naqoura', cityHe: 'נקורה', cityAr: 'الناقورة', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.117, lng: 35.140 },
  { id: 'ra83', city: 'Jezzine', cityHe: "ג'זין", cityAr: 'جزين', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 15, threatType: 'missiles', lat: 33.545, lng: 35.590 },
  { id: 'ra84', city: 'Qana', cityHe: 'קאנא', cityAr: 'قانا', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.209, lng: 35.298 },
  { id: 'ra85', city: 'Tebnine', cityHe: 'טיבנין', cityAr: 'تبنين', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.199, lng: 35.407 },
  { id: 'ra86', city: 'Aita al-Shaab', cityHe: 'עייתא א-שעב', cityAr: 'عيتا الشعب', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.078, lng: 35.384 },
  { id: 'ra87', city: 'Mais al-Jabal', cityHe: 'מייס אל-ג\'בל', cityAr: 'ميس الجبل', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.106, lng: 35.399 },
  { id: 'ra88', city: 'Blida', cityHe: 'בלידא', cityAr: 'بليدا', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.110, lng: 35.475 },
  { id: 'ra89', city: 'Hasbaya', cityHe: 'חסביה', cityAr: 'حاصبيا', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 15, threatType: 'rockets', lat: 33.397, lng: 35.690 },
  { id: 'ra90', city: 'Kafr Shuba', cityHe: 'כפר שובא', cityAr: 'كفرشوبا', region: 'South Lebanon', regionHe: 'דרום לבנון', regionAr: 'جنوب لبنان', country: 'Lebanon', countryCode: 'LB', countdown: 0, threatType: 'rockets', lat: 33.418, lng: 35.689 },
];

const TZEVAADOM_API_URL = 'https://api.tzevaadom.co.il/notifications';
const OREF_API_URL = 'https://www.oref.org.il/WarningMessages/alert/alerts.json';

const OREF_THREAT_MAP: Record<number, RedAlert['threatType']> = {
  0: 'rockets',
  1: 'rockets',
  2: 'missiles',
  3: 'hostile_aircraft_intrusion',
  4: 'uav_intrusion',
  5: 'rockets',
  6: 'rockets',
  7: 'uav_intrusion',
  13: 'missiles',
};

const OREF_CITY_COORDS: Record<string, { lat: number; lng: number; en: string; ar: string; region: string; regionHe: string; regionAr: string; countdown: number }> = {
  'שדרות': { lat: 31.525, lng: 34.596, en: 'Sderot', ar: 'سديروت', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'אשקלון': { lat: 31.669, lng: 34.571, en: 'Ashkelon', ar: 'عسقلان', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'באר שבע': { lat: 31.252, lng: 34.791, en: "Be'er Sheva", ar: 'بئر السبع', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'תל אביב': { lat: 32.085, lng: 34.782, en: 'Tel Aviv', ar: 'تل أبيب', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'חיפה': { lat: 32.794, lng: 34.990, en: 'Haifa', ar: 'حيفا', region: 'Haifa Bay', regionHe: 'מפרץ חיפה', regionAr: 'خليج حيفا', countdown: 60 },
  'ירושלים': { lat: 31.769, lng: 35.216, en: 'Jerusalem', ar: 'القدس', region: 'Jerusalem', regionHe: 'ירושלים', regionAr: 'القدس', countdown: 90 },
  'קריית שמונה': { lat: 33.208, lng: 35.571, en: 'Kiryat Shmona', ar: 'كريات شمونة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'נהריה': { lat: 33.005, lng: 35.098, en: 'Nahariya', ar: 'نهاريا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'מטולה': { lat: 33.280, lng: 35.578, en: 'Metula', ar: 'المطلة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'טבריה': { lat: 32.796, lng: 35.530, en: 'Tiberias', ar: 'طبريا', region: 'Sea of Galilee', regionHe: 'כנרת', regionAr: 'بحيرة طبريا', countdown: 30 },
  'נתניה': { lat: 32.333, lng: 34.857, en: 'Netanya', ar: 'نتانيا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'צפת': { lat: 32.966, lng: 35.496, en: 'Safed', ar: 'صفد', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'אילת': { lat: 29.558, lng: 34.952, en: 'Eilat', ar: 'إيلات', region: 'Southern Negev', regionHe: 'דרום הנגב', regionAr: 'النقب الجنوبي', countdown: 90 },
  'ראשון לציון': { lat: 31.964, lng: 34.804, en: 'Rishon LeZion', ar: 'ريشون لتسيون', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'פתח תקווה': { lat: 32.089, lng: 34.886, en: 'Petah Tikva', ar: 'بيتح تكفا', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'אשדוד': { lat: 31.801, lng: 34.650, en: 'Ashdod', ar: 'أسدود', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 45 },
  'הרצליה': { lat: 32.166, lng: 34.846, en: 'Herzliya', ar: 'هرتسليا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'עכו': { lat: 32.928, lng: 35.076, en: 'Acre', ar: 'عكا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 30 },
  'כרמיאל': { lat: 32.919, lng: 35.296, en: 'Karmiel', ar: 'كرميئيل', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'נוף הגליל': { lat: 32.700, lng: 35.320, en: 'Nof HaGalil', ar: 'نوف هجليل', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'רמת גן': { lat: 32.068, lng: 34.824, en: 'Ramat Gan', ar: 'رمات غان', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'בת ים': { lat: 32.023, lng: 34.751, en: 'Bat Yam', ar: 'بات يام', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'חולון': { lat: 32.011, lng: 34.773, en: 'Holon', ar: 'حولون', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'בני ברק': { lat: 32.084, lng: 34.835, en: 'Bnei Brak', ar: 'بني براك', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'חדרה': { lat: 32.434, lng: 34.919, en: 'Hadera', ar: 'الخضيرة', region: 'Haifa District', regionHe: 'מחוז חיפה', regionAr: 'منطقة حيفا', countdown: 60 },
  'עפולה': { lat: 32.608, lng: 35.289, en: 'Afula', ar: 'العفولة', region: 'Jezreel Valley', regionHe: 'עמק יזרעאל', regionAr: 'مرج ابن عامر', countdown: 45 },
  'דימונה': { lat: 31.069, lng: 35.033, en: 'Dimona', ar: 'ديمونا', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'ערד': { lat: 31.261, lng: 35.213, en: 'Arad', ar: 'عراد', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'גשר הזיו': { lat: 33.053, lng: 35.142, en: 'Gesher HaZiv', ar: 'جسر الزيو', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'מצובה': { lat: 33.076, lng: 35.191, en: 'Matzuva', ar: 'متسوبا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'סער': { lat: 33.030, lng: 35.114, en: "Sa'ar", ar: 'سعر', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'יערה': { lat: 33.065, lng: 35.238, en: "Ya'ara", ar: 'يعرا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'שלומי': { lat: 33.079, lng: 35.146, en: 'Shlomi', ar: 'شلومي', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'חניתה': { lat: 33.094, lng: 35.194, en: 'Hanita', ar: 'حنيتا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'ראש הנקרה': { lat: 33.104, lng: 35.114, en: 'Rosh HaNikra', ar: 'رأس الناقورة', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'בצת': { lat: 33.060, lng: 35.175, en: 'Betzet', ar: 'بيتست', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'לימן': { lat: 33.058, lng: 35.147, en: 'Liman', ar: 'ليمان', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'כברי': { lat: 33.025, lng: 35.141, en: 'Kabri', ar: 'كابري', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'אביבים': { lat: 33.136, lng: 35.545, en: 'Avivim', ar: 'أفيفيم', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'יפתח': { lat: 33.120, lng: 35.518, en: 'Yiftah', ar: 'يفتاح', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'מלכיה': { lat: 33.232, lng: 35.575, en: 'Malkia', ar: 'ملكية', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعלى', countdown: 0 },
  'דפנה': { lat: 33.225, lng: 35.632, en: 'Dafna', ar: 'دافنا', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'שניר': { lat: 33.253, lng: 35.646, en: 'Snir', ar: 'سنير', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'מנרה': { lat: 33.233, lng: 35.541, en: 'Manara', ar: 'منارة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'יראון': { lat: 33.113, lng: 35.436, en: "Yir'on", ar: 'يرعون', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'מרגליות': { lat: 33.190, lng: 35.575, en: 'Margaliot', ar: 'مرغليوت', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'בירנית': { lat: 33.086, lng: 35.370, en: 'Biranit', ar: 'بيرانيت', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'זרעית': { lat: 33.093, lng: 35.278, en: 'Zar\'it', ar: 'زرعيت', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'שתולה': { lat: 33.091, lng: 35.322, en: 'Shtula', ar: 'شتولا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'דובב': { lat: 33.112, lng: 35.388, en: 'Dovev', ar: 'دوبيف', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'מעלות תרשיחא': { lat: 33.017, lng: 35.270, en: "Ma'alot-Tarshiha", ar: 'معالوت ترشيحا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'הגושרים': { lat: 33.218, lng: 35.625, en: 'HaGoshrim', ar: 'هجوشريم', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'בית הלל': { lat: 33.196, lng: 35.603, en: 'Beit Hillel', ar: 'بيت هيلل', region: 'Upper Galilee', regionHe: 'גליل עליון', regionAr: 'الجليل الأعلى', countdown: 0 },
  'חוף בצת': { lat: 33.065, lng: 35.104, en: 'Hof Betzet', ar: 'شاطئ بيتست', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'חוף אכזיב': { lat: 33.049, lng: 35.106, en: 'Achziv Beach', ar: 'شاطئ أخزيف', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'עבדון': { lat: 33.020, lng: 35.176, en: 'Avdon', ar: 'عبدون', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'בן עמי': { lat: 33.007, lng: 35.133, en: "Ben Ami", ar: 'بن عمي', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'רמת טראמפ': { lat: 33.130, lng: 35.771, en: 'Ramat Trump', ar: 'رامات ترامب', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'שעל': { lat: 33.100, lng: 35.770, en: "Sha'al", ar: 'شعال', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'יונתן': { lat: 33.033, lng: 35.768, en: 'Yonatan', ar: 'يوناتان', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'כפר סבא': { lat: 32.175, lng: 34.907, en: 'Kfar Saba', ar: 'كفار سابا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'לוד': { lat: 31.951, lng: 34.892, en: 'Lod', ar: 'اللد', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'רמלה': { lat: 31.929, lng: 34.871, en: 'Ramla', ar: 'الرملة', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'רחובות': { lat: 31.898, lng: 34.811, en: 'Rehovot', ar: 'رحوفوت', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'יבנה': { lat: 31.877, lng: 34.739, en: 'Yavne', ar: 'يبنة', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 60 },
  'גבעתיים': { lat: 32.071, lng: 34.812, en: "Giv'atayim", ar: 'جفعاتايم', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'ראש העין': { lat: 32.096, lng: 34.957, en: "Rosh HaAyin", ar: 'رأس العين', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'הוד השרון': { lat: 32.155, lng: 34.888, en: 'Hod HaSharon', ar: 'هود هشارون', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'רעננה': { lat: 32.184, lng: 34.871, en: "Ra'anana", ar: 'رعنانا', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'רמת השרון': { lat: 32.145, lng: 34.839, en: 'Ramat HaSharon', ar: 'رمات هشارون', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'גני תקווה': { lat: 32.063, lng: 34.872, en: 'Ganei Tikva', ar: 'غاني تكفا', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'קריית אונו': { lat: 32.063, lng: 34.855, en: 'Kiryat Ono', ar: 'كريات أونو', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'גבעת שמואל': { lat: 32.077, lng: 34.853, en: "Giv'at Shmuel", ar: 'جفعات شموئيل', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'אור יהודה': { lat: 32.031, lng: 34.852, en: 'Or Yehuda', ar: 'أور يهودا', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'יהוד מונוסון': { lat: 32.033, lng: 34.886, en: 'Yehud-Monosson', ar: 'يهود', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'אלעד': { lat: 32.052, lng: 34.952, en: 'Elad', ar: 'إلعاد', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'שוהם': { lat: 31.996, lng: 34.946, en: 'Shoham', ar: 'شوهام', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'שדרות, איבים': { lat: 31.525, lng: 34.596, en: 'Sderot / Ivim', ar: 'سديروت', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'נתיב העשרה': { lat: 31.556, lng: 34.520, en: 'Netiv HaAsara', ar: 'نتيف هعسارا', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 0 },
  'יד מרדכי': { lat: 31.588, lng: 34.557, en: 'Yad Mordechai', ar: 'ياد مردخاي', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'ניצנים': { lat: 31.711, lng: 34.544, en: 'Nitzanim', ar: 'نتسانيم', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'כרמיה': { lat: 31.579, lng: 34.540, en: 'Karmia', ar: 'كرميا', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'אפרת': { lat: 31.654, lng: 35.155, en: 'Efrat', ar: 'إفرات', region: 'Gush Etzion', regionHe: 'גוש עציון', regionAr: 'غوش عتصيون', countdown: 60 },
  'כפר עציון': { lat: 31.651, lng: 35.118, en: 'Kfar Etzion', ar: 'كفار عتصيون', region: 'Gush Etzion', regionHe: 'גוש עציון', regionAr: 'غوش عتصيون', countdown: 60 },
  'אריאל': { lat: 32.106, lng: 35.174, en: 'Ariel', ar: 'أريئيل', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'קרני שומרון': { lat: 32.178, lng: 35.098, en: 'Karnei Shomron', ar: 'كرني شومرون', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'כפר קאסם': { lat: 32.113, lng: 34.976, en: 'Kafr Qasim', ar: 'كفر قاسم', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'עין בוקק': { lat: 31.200, lng: 35.363, en: 'Ein Bokek', ar: 'عين بوقيق', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'מצדה': { lat: 31.316, lng: 35.354, en: 'Masada', ar: 'مسادا', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'מרעית': { lat: 31.240, lng: 34.625, en: "Mar'it", ar: 'مرعيت', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'כסייפה': { lat: 31.230, lng: 34.974, en: 'Kuseife', ar: 'كسيفة', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'תל ערד': { lat: 31.280, lng: 35.130, en: 'Tel Arad', ar: 'تل عراد', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'תל אביב - דרום העיר ויפו': { lat: 32.052, lng: 34.759, en: 'Tel Aviv - South & Jaffa', ar: 'تل أبيب جنوب ويافا', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'תל אביב - מזרח': { lat: 32.087, lng: 34.800, en: 'Tel Aviv - East', ar: 'تل أبيب شرق', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'תל אביב - מרכז העיר': { lat: 32.075, lng: 34.775, en: 'Tel Aviv - Center', ar: 'تل أبيب وسط', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'תל אביב - עבר הירקון': { lat: 32.100, lng: 34.790, en: 'Tel Aviv - North Yarkon', ar: 'تل أبيب شمال', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'הרצליה - מערב': { lat: 32.163, lng: 34.793, en: 'Herzliya West', ar: 'هرتسليا غرب', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'הרצליה - מרכז וגליל ים': { lat: 32.166, lng: 34.830, en: 'Herzliya Center', ar: 'هرتسليا وسط', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'ראשון לציון - מזרח': { lat: 31.970, lng: 34.820, en: 'Rishon LeZion East', ar: 'ريشون لتسيون شرق', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'ראשון לציון - מערב': { lat: 31.960, lng: 34.790, en: 'Rishon LeZion West', ar: 'ريشون لتسيون غرب', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'רמת גן - מזרח': { lat: 32.068, lng: 34.840, en: 'Ramat Gan East', ar: 'رمات غان شرق', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'רמת גן - מערב': { lat: 32.068, lng: 34.810, en: 'Ramat Gan West', ar: 'رمات غان غرب', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'סביון': { lat: 32.044, lng: 34.866, en: 'Savyon', ar: 'سافيون', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'מזרעה': { lat: 33.040, lng: 35.135, en: "Mazra'a", ar: 'مزرعة', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'שבי ציון': { lat: 33.005, lng: 35.082, en: 'Shavei Tzion', ar: 'شافي تسيون', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'רגבה': { lat: 33.016, lng: 35.156, en: 'Regba', ar: 'رجبة', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'איזור תעשייה מילואות צפון': { lat: 33.070, lng: 35.130, en: 'Northern Industrial Zone', ar: 'منطقة صناعية شمالية', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'אל פורעה': { lat: 31.193, lng: 34.776, en: "Al-Fur'a", ar: 'الفرعة', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'כפר הנוקדים': { lat: 31.521, lng: 35.218, en: 'Kfar HaNokdim', ar: 'كفار هنوقديم', region: 'Judean Desert', regionHe: 'מדבר יהודה', regionAr: 'صحراء يهودا', countdown: 60 },
  'מלונות ים המלח מרכז': { lat: 31.170, lng: 35.363, en: 'Dead Sea Hotels Central', ar: 'فنادق البحر الميت', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'מרחצאות עין גדי': { lat: 31.454, lng: 35.384, en: 'Ein Gedi Spa', ar: 'حمامات عين جدي', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'חוות מנחם': { lat: 31.220, lng: 35.350, en: 'Havat Menachem', ar: 'حافات مناحيم', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'בית שקמה': { lat: 31.614, lng: 34.549, en: 'Beit Shikma', ar: 'بيت شقمة', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'ארז': { lat: 31.538, lng: 34.539, en: 'Erez', ar: 'إيرز', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 0 },
  'דורות': { lat: 31.489, lng: 34.568, en: 'Dorot', ar: 'دوروت', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'גברעם': { lat: 31.530, lng: 34.602, en: "Gav'ram", ar: 'غافرام', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'חלץ': { lat: 31.547, lng: 34.608, en: 'Heletz', ar: 'حيلتس', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 30 },
  'ניר עם': { lat: 31.550, lng: 34.565, en: 'Nir Am', ar: 'نير عام', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'עזר': { lat: 31.629, lng: 34.553, en: 'Ezer', ar: 'عيزر', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'מבקיעים': { lat: 31.558, lng: 34.560, en: "Mavki'im", ar: 'مافقيعيم', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'ברור חיל': { lat: 31.582, lng: 34.573, en: 'Bror Hayil', ar: 'برور حايل', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'משען': { lat: 31.621, lng: 34.559, en: "Mash'en", ar: 'مشعن', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'כפר סילבר': { lat: 31.578, lng: 34.553, en: 'Kfar Silver', ar: 'كفار سيلفر', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'גיאה': { lat: 31.613, lng: 34.563, en: "Ge'a", ar: 'جيعا', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'אור הנר': { lat: 31.539, lng: 34.598, en: 'Or HaNer', ar: 'أور هنير', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'בת הדר': { lat: 31.624, lng: 34.554, en: 'Bat HaDar', ar: 'بات هدار', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'תלמי יפה': { lat: 31.609, lng: 34.553, en: 'Talme Yafe', ar: 'تلمي يافا', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 30 },
  'נירית': { lat: 32.164, lng: 34.913, en: 'Nirit', ar: 'نيريت', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'צופית': { lat: 32.148, lng: 34.935, en: 'Tzofit', ar: 'تسوفيت', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'כפר שמריהו': { lat: 32.184, lng: 34.804, en: 'Kfar Shmaryahu', ar: 'كفار شمارياهو', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'אלקנה': { lat: 32.109, lng: 35.033, en: 'Elkana', ar: 'ألكانا', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'בית דגן': { lat: 32.004, lng: 34.833, en: 'Beit Dagan', ar: 'بيت دجن', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'באר יעקב': { lat: 31.943, lng: 34.834, en: "Be'er Ya'akov", ar: 'بئير يعقوب', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'נווה דניאל': { lat: 31.657, lng: 35.135, en: 'Neve Daniel', ar: 'نيفي دانيال', region: 'Gush Etzion', regionHe: 'גוש עציון', regionAr: 'غوش عتصيون', countdown: 60 },
  'אלון שבות': { lat: 31.655, lng: 35.127, en: 'Alon Shvut', ar: 'ألون شفوت', region: 'Gush Etzion', regionHe: 'גוש עציון', regionAr: 'غوش عتصيون', countdown: 60 },
  'ניר ישראל': { lat: 31.611, lng: 34.547, en: 'Nir Yisrael', ar: 'نير إسرائيل', region: 'Gaza Envelope', regionHe: 'עוטף עזה', regionAr: 'غلاف غزة', countdown: 15 },
  'דיר אל-אסד': { lat: 32.928, lng: 35.268, en: 'Deir al-Asad', ar: 'دير الأسد', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 30 },
  'מגדל': { lat: 32.830, lng: 35.516, en: 'Migdal', ar: 'مجدل', region: 'Sea of Galilee', regionHe: 'כנרת', regionAr: 'بحيرة طبريا', countdown: 30 },
  'כפר מנדא': { lat: 32.812, lng: 35.265, en: 'Kafr Manda', ar: 'كفر مندا', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'ג\'דיידה-מכר': { lat: 32.929, lng: 35.145, en: 'Judeida-Makr', ar: 'جديدة المكر', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'אבו סנאן': { lat: 32.955, lng: 35.169, en: 'Abu Snan', ar: 'أبو سنان', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'ירכא': { lat: 32.958, lng: 35.187, en: 'Yirka', ar: 'يركا', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'מג\'ד אל-כרום': { lat: 32.919, lng: 35.244, en: 'Majd al-Krum', ar: 'مجد الكروم', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'כאבול': { lat: 32.876, lng: 35.213, en: 'Kabul', ar: 'كابول', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'טמרה': { lat: 32.855, lng: 35.198, en: 'Tamra', ar: 'طمرة', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'שפרעם': { lat: 32.805, lng: 35.172, en: 'Shefa-Amr', ar: 'شفا عمرو', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'סכנין': { lat: 32.863, lng: 35.299, en: 'Sakhnin', ar: 'سخنين', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'עראבה': { lat: 32.851, lng: 35.337, en: 'Arraba', ar: 'عرابة', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'דבוריה': { lat: 32.695, lng: 35.374, en: 'Daburiyya', ar: 'دبورية', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'כפר כנא': { lat: 32.750, lng: 35.340, en: 'Kafr Kanna', ar: 'كفر كنا', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'נצרת': { lat: 32.700, lng: 35.297, en: 'Nazareth', ar: 'الناصرة', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'ריינה': { lat: 32.711, lng: 35.310, en: 'Reineh', ar: 'الرينة', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'עילוט': { lat: 32.720, lng: 35.268, en: 'Ilut', ar: 'إعيلوط', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'טורעאן': { lat: 32.780, lng: 35.336, en: "Tur'an", ar: 'طرعان', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'בועיינה-נוג\'ידאת': { lat: 32.764, lng: 35.357, en: 'Bueine Nujeidat', ar: 'بوعينة نجيدات', region: 'Lower Galilee', regionHe: 'גליל תחתון', regionAr: 'الجليل الأسفل', countdown: 30 },
  'נאעורה': { lat: 32.636, lng: 35.383, en: "Na'ura", ar: 'ناعورة', region: 'Jezreel Valley', regionHe: 'עמק יזרעאל', regionAr: 'مرج ابن عامر', countdown: 45 },
  'מוקייבלה': { lat: 32.621, lng: 35.266, en: 'Muqeible', ar: 'مقيبلة', region: 'Jezreel Valley', regionHe: 'עמק יזרעאל', regionAr: 'مرج ابن عامر', countdown: 45 },
  'פסוטה': { lat: 33.075, lng: 35.253, en: 'Fassuta', ar: 'فسوطة', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 0 },
  'חורפיש': { lat: 33.028, lng: 35.341, en: 'Hurfeish', ar: 'حرفيش', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'ג\'ת': { lat: 32.874, lng: 35.100, en: 'Jatt', ar: 'جت', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 30 },
  'פקיעין': { lat: 32.975, lng: 35.321, en: "Peqi'in", ar: 'بقيعين', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'כישור': { lat: 32.945, lng: 35.204, en: 'Kishor', ar: 'كيشور', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'ג\'ולס': { lat: 32.938, lng: 35.172, en: 'Julis', ar: 'جولس', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'בית ג\'ן': { lat: 32.888, lng: 35.391, en: 'Beit Jann', ar: 'بيت جن', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 30 },
  'ג\'ש (גוש חלב)': { lat: 33.022, lng: 35.448, en: 'Jish', ar: 'الجش', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'ראמה': { lat: 32.937, lng: 35.369, en: 'Rama', ar: 'رامة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'עין אל-אסד': { lat: 32.937, lng: 35.276, en: 'Ein al-Asad', ar: 'عين الأسد', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'ביריה': { lat: 32.979, lng: 35.507, en: 'Birya', ar: 'بريا', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'עמוקה': { lat: 33.004, lng: 35.496, en: 'Amuka', ar: 'عموقة', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'חצור הגלילית': { lat: 32.972, lng: 35.542, en: 'Hatzor HaGlilit', ar: 'حتسور الجليل', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'ראש פינה': { lat: 32.969, lng: 35.542, en: 'Rosh Pina', ar: 'روش بينا', region: 'Upper Galilee', regionHe: 'גליל עליון', regionAr: 'الجليل الأعلى', countdown: 15 },
  'כנף': { lat: 32.800, lng: 35.744, en: 'Kanaf', ar: 'كناف', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'קצרין': { lat: 32.996, lng: 35.692, en: 'Katzrin', ar: 'كتسرين', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 15 },
  'מג\'דל שמס': { lat: 33.270, lng: 35.773, en: 'Majdal Shams', ar: 'مجدل شمس', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'מסעדה': { lat: 33.231, lng: 35.748, en: "Mas'ada", ar: 'مسعدة', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'עין קנייא': { lat: 33.244, lng: 35.762, en: 'Ein Qiniyye', ar: 'عين قنية', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'בוקעאתא': { lat: 33.226, lng: 35.781, en: "Buq'ata", ar: 'بقعاتا', region: 'Golan Heights', regionHe: 'רמת הגולן', regionAr: 'مرتفعات الجولان', countdown: 0 },
  'כפר יאסיף': { lat: 32.948, lng: 35.139, en: 'Kafr Yasif', ar: 'كفر ياسيف', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'ג\'דיידה': { lat: 32.929, lng: 35.145, en: 'Judeida', ar: 'الجديدة', region: 'Western Galilee', regionHe: 'גליל מערבי', regionAr: 'الجليل الغربي', countdown: 15 },
  'עספיא': { lat: 32.729, lng: 35.055, en: 'Isfiya', ar: 'عسفيا', region: 'Haifa District', regionHe: 'מחוז חיפה', regionAr: 'منطقة حيفا', countdown: 60 },
  'דלית אל-כרמל': { lat: 32.695, lng: 35.042, en: 'Daliyat al-Karmel', ar: 'دالية الكرمل', region: 'Haifa District', regionHe: 'מחוז חיפה', regionAr: 'منطقة حيفا', countdown: 60 },
  'אום אל-פחם': { lat: 32.519, lng: 35.153, en: 'Umm al-Fahm', ar: 'أم الفحم', region: 'Wadi Ara', regionHe: 'ואדי ערה', regionAr: 'وادي عارة', countdown: 45 },
  'באקה אל-גרביה': { lat: 32.419, lng: 35.049, en: 'Baqa al-Gharbiyye', ar: 'باقة الغربية', region: 'Wadi Ara', regionHe: 'ואדי ערה', regionAr: 'وادي عارة', countdown: 45 },
  'ג\'ת-ואדי ערה': { lat: 32.389, lng: 35.026, en: 'Jatt (Wadi Ara)', ar: 'جت', region: 'Wadi Ara', regionHe: 'ואדי ערה', regionAr: 'وادي عارة', countdown: 45 },
  'טייבה (מרכז)': { lat: 32.267, lng: 35.009, en: 'Tayibe', ar: 'الطيبة', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'טירה (מרכז)': { lat: 32.234, lng: 34.952, en: 'Tira', ar: 'الطيرة', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'קלנסווה (מרכז)': { lat: 32.286, lng: 34.986, en: 'Qalansawe', ar: 'قلنسوة', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'ג\'לג\'וליה': { lat: 32.155, lng: 34.961, en: 'Jaljulia', ar: 'جلجولية', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'רהט': { lat: 31.395, lng: 34.759, en: 'Rahat', ar: 'رهط', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'ערערה-בנגב': { lat: 31.148, lng: 34.989, en: 'Ar\'ara BaNegev', ar: 'عرعرة النقب', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'לקיה': { lat: 31.321, lng: 34.818, en: 'Lakiya', ar: 'لقية', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'חורה': { lat: 31.296, lng: 34.913, en: 'Hura', ar: 'حورة', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'תל שבע': { lat: 31.252, lng: 34.825, en: 'Tel Sheva', ar: 'تل السبع', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'עומר': { lat: 31.265, lng: 34.850, en: 'Omer', ar: 'عومر', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'מיתר': { lat: 31.324, lng: 34.935, en: 'Meitar', ar: 'ميتار', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'להבים': { lat: 31.373, lng: 34.812, en: 'Lehavim', ar: 'لهافيم', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'ערד-תעשייה': { lat: 31.260, lng: 35.200, en: 'Arad Industrial', ar: 'عراد صناعية', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 60 },
  'ירוחם': { lat: 30.988, lng: 34.929, en: 'Yeruham', ar: 'يروحام', region: 'Southern Negev', regionHe: 'דרום הנגב', regionAr: 'النقب الجنوبي', countdown: 90 },
  'מצפה רמון': { lat: 30.611, lng: 34.801, en: 'Mitzpe Ramon', ar: 'متسبي رامون', region: 'Southern Negev', regionHe: 'דרום הנגב', regionAr: 'النقب الجنوبي', countdown: 90 },
  'עין גדי': { lat: 31.462, lng: 35.389, en: 'Ein Gedi', ar: 'عين جدي', region: 'Dead Sea', regionHe: 'ים המלח', regionAr: 'البحر الميت', countdown: 90 },
  'נען': { lat: 31.873, lng: 34.869, en: "Na'an", ar: 'نعان', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'קריית מלאכי': { lat: 31.728, lng: 34.748, en: 'Kiryat Malakhi', ar: 'كريات ملاخي', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 45 },
  'גן יבנה': { lat: 31.793, lng: 34.707, en: 'Gan Yavne', ar: 'غان يافني', region: 'Southern Coastal', regionHe: 'חוף דרומי', regionAr: 'الساحل الجنوبي', countdown: 45 },
  'אופקים': { lat: 31.312, lng: 34.622, en: 'Ofakim', ar: 'أوفاكيم', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 45 },
  'נתיבות': { lat: 31.420, lng: 34.589, en: 'Netivot', ar: 'نتيفوت', region: 'Northern Negev', regionHe: 'צפון הנגב', regionAr: 'النقب الشمالي', countdown: 30 },
  'מודיעין-מכבים-רעות': { lat: 31.897, lng: 35.010, en: "Modi'in-Maccabim-Re'ut", ar: 'موديعين', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'מודיעין עילית': { lat: 31.933, lng: 35.044, en: "Modi'in Illit", ar: 'موديعين عيليت', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'ביתר עילית': { lat: 31.699, lng: 35.118, en: 'Beitar Illit', ar: 'بيتار عيليت', region: 'Gush Etzion', regionHe: 'גוש עציון', regionAr: 'غوش عتصيون', countdown: 60 },
  'מעלה אדומים': { lat: 31.778, lng: 35.303, en: "Ma'ale Adumim", ar: 'معالي أدوميم', region: 'Judean Hills', regionHe: 'הרי יהודה', regionAr: 'جبال يهودا', countdown: 90 },
  'גבעת זאב': { lat: 31.862, lng: 35.171, en: "Giv'at Ze'ev", ar: 'جفعات زئيف', region: 'Judean Hills', regionHe: 'הרי יהודה', regionAr: 'جبال يهودا', countdown: 90 },
  'אלפי מנשה': { lat: 32.178, lng: 35.063, en: 'Alfei Menashe', ar: 'ألفي مناشيه', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'עמנואל': { lat: 32.157, lng: 35.146, en: 'Immanuel', ar: 'عمنوئيل', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'נס ציונה': { lat: 31.930, lng: 34.795, en: 'Ness Ziona', ar: 'نيس تسيونا', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'טייבה': { lat: 32.267, lng: 35.010, en: 'Tayibe', ar: 'الطيبة', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'טירה': { lat: 32.232, lng: 34.951, en: 'Tira', ar: 'الطيرة', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'קלנסווה': { lat: 32.284, lng: 34.983, en: 'Qalansawe', ar: 'قلنسوة', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'אם אל-פחם': { lat: 32.519, lng: 35.153, en: 'Umm al-Fahm', ar: 'أم الفحم', region: 'Wadi Ara', regionHe: 'ואדי ערה', regionAr: 'وادي عارة', countdown: 60 },
  'נחלים': { lat: 32.066, lng: 34.921, en: 'Nahalim', ar: 'نحاليم', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'מתן': { lat: 32.184, lng: 34.942, en: 'Mattan', ar: 'متان', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'חגור': { lat: 32.163, lng: 34.928, en: 'Hagor', ar: 'حاجور', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'עינת': { lat: 32.094, lng: 34.929, en: 'Einat', ar: 'عينات', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'ירקונה': { lat: 32.108, lng: 34.917, en: 'Yarkona', ar: 'يركونا', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'חורשים': { lat: 32.140, lng: 34.936, en: 'Horashim', ar: 'حوراشيم', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'נופך': { lat: 32.036, lng: 34.940, en: 'Nofekh', ar: 'نوفخ', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'בן שמן': { lat: 31.952, lng: 34.929, en: 'Ben Shemen', ar: 'بن شيمن', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'כפר חב\'ד': { lat: 31.978, lng: 34.848, en: 'Kfar Chabad', ar: 'كفار حباد', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'גינתון': { lat: 31.926, lng: 34.883, en: 'Ginaton', ar: 'جيناتون', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'מצליח': { lat: 31.930, lng: 34.907, en: 'Matzliah', ar: 'متسلياح', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'גן שורק': { lat: 31.872, lng: 34.790, en: 'Gan Sorek', ar: 'غان سوريك', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'ניר צבי': { lat: 31.950, lng: 34.842, en: 'Nir Tzvi', ar: 'نير تسفي', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'בית עובד': { lat: 31.881, lng: 34.828, en: 'Beit Oved', ar: 'بيت عوفيد', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'בית חנן': { lat: 31.879, lng: 34.809, en: 'Beit Hanan', ar: 'بيت حنان', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'ישרש': { lat: 31.897, lng: 34.908, en: 'Yesharesh', ar: 'يشاريش', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'נחשונים': { lat: 31.944, lng: 34.946, en: 'Nahshonim', ar: 'نحشونيم', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'מגשימים': { lat: 32.019, lng: 34.873, en: 'Magshimim', ar: 'ماغشيميم', region: 'Gush Dan', regionHe: 'גוש דן', regionAr: 'غوش دان', countdown: 90 },
  'נטעים': { lat: 31.866, lng: 34.834, en: 'Neta\'im', ar: 'نيتاعيم', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'עיינות': { lat: 31.882, lng: 34.848, en: 'Ayanot', ar: 'عيانوت', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'עדנים': { lat: 31.947, lng: 34.895, en: 'Adanim', ar: 'عدانيم', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'נווה ימין': { lat: 32.125, lng: 34.895, en: 'Neve Yamin', ar: 'نيفي يامين', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'נווה ירק': { lat: 32.111, lng: 34.899, en: 'Neve Yerak', ar: 'نيفي يرق', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'מזור': { lat: 32.026, lng: 34.936, en: 'Mazor', ar: 'مازور', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'רינתיה': { lat: 32.017, lng: 34.893, en: 'Rinnatya', ar: 'ريناتيا', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'שדי חמד': { lat: 32.142, lng: 34.952, en: 'Sdei Hemed', ar: 'سدي حيمد', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'גני עם': { lat: 31.904, lng: 34.850, en: 'Ganei Am', ar: 'غاني عام', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'אחיסמך': { lat: 31.935, lng: 34.870, en: 'Ahisamakh', ar: 'أحيسماخ', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'אירוס': { lat: 31.895, lng: 34.868, en: 'Irus', ar: 'إيروس', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'בארות יצחק': { lat: 32.078, lng: 34.925, en: "Ba'arot Yitzhak", ar: 'بئروت يتسحاق', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'בני עטרות': { lat: 32.073, lng: 34.912, en: 'Bnei Atarot', ar: 'بني عطاروت', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'גבעת כ\'\'ח': { lat: 31.950, lng: 34.870, en: "Giv'at Koah", ar: 'جفعات كوح', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'כפר נוער בן שמן': { lat: 31.955, lng: 34.925, en: 'Ben Shemen Youth Village', ar: 'كفار نوعر بن شيمن', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'אלישמע': { lat: 32.146, lng: 34.966, en: 'Elishama', ar: 'إليشمع', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'משמר השבעה': { lat: 32.001, lng: 34.860, en: 'Mishmar HaShiv\'a', ar: 'مشمار هشفعا', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'טירת יהודה': { lat: 32.026, lng: 34.906, en: 'Tirat Yehuda', ar: 'تيرات يهودا', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'כפר טרומן': { lat: 31.986, lng: 34.927, en: 'Kfar Truman', ar: 'كفار ترومان', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'חמד': { lat: 32.042, lng: 34.930, en: 'Hemed', ar: 'حيمد', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'בית נחמיה': { lat: 31.955, lng: 34.942, en: 'Beit Nechemya', ar: 'بيت نحميا', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'בית עריף': { lat: 31.940, lng: 34.958, en: 'Beit Arif', ar: 'بيت عاريف', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'חדיד': { lat: 31.978, lng: 34.942, en: 'Hadid', ar: 'حديد', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'נעלה': { lat: 31.960, lng: 35.020, en: "Na'ale", ar: 'ناعالي', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'נילי': { lat: 31.948, lng: 35.037, en: 'Nili', ar: 'نيلي', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'עלי זהב - לשם': { lat: 32.107, lng: 35.060, en: 'Alei Zahav - Leshem', ar: 'إلي زاهاف', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'פדואל': { lat: 32.051, lng: 35.075, en: 'Peduel', ar: 'بدوئيل', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'ברקן': { lat: 32.085, lng: 35.080, en: 'Barkan', ar: 'بركان', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'ברקת': { lat: 31.985, lng: 34.960, en: 'Bareket', ar: 'بركت', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'זיתן': { lat: 31.963, lng: 34.942, en: 'Zeitan', ar: 'زيتان', region: 'Central', regionHe: 'מרכز', regionAr: 'المركز', countdown: 90 },
  'צפריה': { lat: 31.958, lng: 34.888, en: 'Tzafriya', ar: 'تسفريا', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'יגל': { lat: 31.890, lng: 34.859, en: 'Yagel', ar: 'ياغل', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'יד רמב\'\'ם': { lat: 31.869, lng: 34.827, en: 'Yad Rambam', ar: 'ياد رامبام', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'אזור תעשייה חבל מודיעין שוהם': { lat: 31.996, lng: 34.950, en: "Modi'in-Shoham Industrial Zone", ar: 'منطقة صناعية موديعين', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'אזור תעשייה אפק ולב הארץ': { lat: 32.085, lng: 34.944, en: 'Afek Industrial Zone', ar: 'منطقة أفيك الصناعية', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'איירפורט סיטי': { lat: 31.983, lng: 34.876, en: 'Airport City', ar: 'إيربورت سيتي', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'אזור תעשייה נשר - רמלה': { lat: 31.932, lng: 34.875, en: 'Nesher-Ramla Industrial Zone', ar: 'منطقة نيشر رملة الصناعية', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'תעשיון צריפין': { lat: 31.934, lng: 34.844, en: 'Tzrifin Industrial Park', ar: 'منطقة تسريفين', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'תחנת רכבת ראש העין': { lat: 32.096, lng: 34.960, en: 'Rosh HaAyin Train Station', ar: 'محطة قطار رأس العين', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'מרכז אזורי דרום השרון': { lat: 32.090, lng: 34.900, en: 'South Sharon Regional Center', ar: 'مركز جنوب الشارون', region: 'Sharon', regionHe: 'שרון', regionAr: 'الشارون', countdown: 90 },
  'אזור תעשייה אריאל': { lat: 32.106, lng: 35.180, en: 'Ariel Industrial Zone', ar: 'منطقة أريئيل الصناعية', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'אזור תעשייה ברקן': { lat: 32.085, lng: 35.085, en: 'Barkan Industrial Zone', ar: 'منطقة بركان الصناعية', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'בית אריה': { lat: 32.040, lng: 35.025, en: 'Beit Arye', ar: 'بيت آريه', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'גופנה': { lat: 31.935, lng: 35.168, en: 'Gofna', ar: 'جوفنا', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'גנות': { lat: 32.020, lng: 34.862, en: 'Ganot', ar: 'غانوت', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'שערי תקווה': { lat: 32.130, lng: 35.019, en: "Sha'arei Tikva", ar: 'شعاري تكفا', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'צופים': { lat: 32.161, lng: 35.050, en: 'Tzufim', ar: 'تسوفيم', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'קריית נטפים': { lat: 32.190, lng: 35.092, en: 'Kiryat Netafim', ar: 'كريات نيتافيم', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'יקיר': { lat: 32.128, lng: 35.117, en: 'Yakir', ar: 'ياكير', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'נופים': { lat: 32.183, lng: 35.070, en: 'Nofim', ar: 'نوفيم', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'רבבה': { lat: 32.144, lng: 35.137, en: 'Revava', ar: 'ريفافا', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'דורות עילית': { lat: 31.950, lng: 35.060, en: 'Dorot Illit', ar: 'دوروت عيليت', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'נאות קדומים': { lat: 32.010, lng: 34.960, en: 'Neot Kedumim', ar: 'نؤوت كدوميم', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'עופרים': { lat: 31.963, lng: 35.050, en: 'Ofarim', ar: 'عوفاريم', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'נופי נחמיה': { lat: 31.960, lng: 34.948, en: 'Nofei Nechemya', ar: 'نوفي نحمية', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'חוות יאיר': { lat: 32.096, lng: 34.961, en: 'Havat Ya\'ir', ar: 'حافات يائير', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'נווה צוף': { lat: 31.977, lng: 35.062, en: 'Neve Tzuf', ar: 'نيفي تسوف', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'כפר תפוח': { lat: 32.148, lng: 35.174, en: 'Kfar Tapuah', ar: 'كفار تبواح', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'יצהר': { lat: 32.162, lng: 35.228, en: 'Yitzhar', ar: 'يتسهار', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'רחלים': { lat: 32.201, lng: 35.230, en: 'Rechalim', ar: 'رحاليم', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'אביתר': { lat: 32.217, lng: 35.244, en: 'Evyatar', ar: 'إفياتار', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'עץ אפרים': { lat: 32.137, lng: 35.031, en: 'Etz Efraim', ar: 'عيتس إفرايم', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'בית עלמין מורשה': { lat: 32.036, lng: 35.030, en: 'Moresha Cemetery', ar: 'مقبرة موريشا', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
  'ברוכין': { lat: 32.078, lng: 35.076, en: 'Bruchin', ar: 'بروخين', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'מסוף אורנית': { lat: 32.130, lng: 35.008, en: 'Oranit Terminal', ar: 'معبر أورانيت', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'אורנית': { lat: 32.130, lng: 35.004, en: 'Oranit', ar: 'أورانيت', region: 'Samaria', regionHe: 'שומרון', regionAr: 'السامرة', countdown: 60 },
  'אחיעזר': { lat: 31.962, lng: 34.910, en: 'Ahi\'ezer', ar: 'أحيعيزر', region: 'Central', regionHe: 'מרכז', regionAr: 'المركز', countdown: 90 },
};

const OREF_HISTORY_URL = 'https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json';
const PIKUD_CITIES_URL = 'https://raw.githubusercontent.com/eladnava/pikud-haoref-api/master/cities.json';

// Dynamically-fetched city data from pikud-haoref-api (run once at startup)
let dynamicCityCache: Map<string, { lat: number; lng: number; en: string; ar: string; zone_en: string; countdown: number }> | null = null;

async function fetchDynamicCities() {
  try {
    const resp = await fetch(PIKUD_CITIES_URL, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) return;
    const cities = await resp.json();
    if (!Array.isArray(cities)) return;
    dynamicCityCache = new Map();
    for (const c of cities) {
      if (c.name && c.name_en && c.lat != null && c.lng != null) {
        dynamicCityCache.set(c.name, {
          lat: c.lat, lng: c.lng,
          en: c.name_en,
          ar: c.name_ar || c.name_en,
          zone_en: c.zone_en || 'Israel',
          countdown: c.countdown ?? 30,
        });
      }
    }
    console.log(`[CITIES] Loaded ${dynamicCityCache.size} cities from pikud-haoref-api`);
  } catch (e) {
    console.log('[CITIES] Failed to fetch dynamic cities:', (e as Error).message);
  }
}

fetchDynamicCities();

let orefCache: { data: RedAlert[]; timestamp: number } | null = null;
const OREF_CACHE_TTL = 0;

const HE_WORD_MAP: Record<string, string> = {
  'אזור': 'Ezor', 'תעשייה': 'Industrial', 'תעשיון': 'Industrial Zone', 'מרכז': 'Center',
  'אזורי': 'Regional', 'מועצה': 'Council', 'חוות': 'Havat', 'חוף': 'Hof',
  'מלונות': 'Hotels', 'מרחצאות': 'Spa', 'נווה': 'Neve', 'גני': 'Ganei',
  'בית': 'Beit', 'כפר': 'Kfar', 'תל': 'Tel', 'עין': 'Ein', 'באר': "Be'er",
  'ראש': 'Rosh', 'מעלה': "Ma'ale", 'מעלות': "Ma'alot", 'קריית': 'Kiryat',
  'גבעת': "Giv'at", 'רמת': 'Ramat', 'נוף': 'Nof', 'הר': 'Har',
  'מצפה': 'Mitzpe', 'נחל': 'Nahal', 'שדה': 'Sde', 'גבעות': "Giv'ot",
  'מושב': 'Moshav', 'קיבוץ': 'Kibbutz', 'ישוב': 'Yishuv',
  'צפון': 'North', 'דרום': 'South', 'מזרח': 'East', 'מערב': 'West',
  'עליון': 'Upper', 'תחתון': 'Lower', 'חדש': 'Hadash', 'ישן': 'Old',
  'מגדל': 'Migdal', 'גשר': 'Gesher', 'מעבר': 'Crossing', 'מסוף': 'Terminal',
  'תחנת': 'Tahanat', 'רכבת': 'Rakevet', 'שכונת': 'Shekhunat',
};

const HE_TRANSLITERATION: Record<string, string> = {
  'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'kh', 'ט': 't',
  'י': 'y', 'כ': 'k', 'ך': 'kh', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's',
  'ע': "'", 'פ': 'p', 'ף': 'f', 'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't',
  "'": "'", "׳": "'", '"': '', '״': '',
};

function transliterateHebrew(he: string): string {
  if (!/[\u0590-\u05FF]/.test(he)) return he;
  const words = he.split(/(\s*[-–/,]\s*|\s+)/);
  const transliterated = words.map(segment => {
    const trimSeg = segment.trim();
    if (!trimSeg || /^[-–/,\s]+$/.test(trimSeg)) return segment;
    if (HE_WORD_MAP[trimSeg]) return HE_WORD_MAP[trimSeg];
    if (!/[\u0590-\u05FF]/.test(trimSeg)) return trimSeg;
    let r = '';
    const chars = [...trimSeg];
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const mapped = HE_TRANSLITERATION[ch];
      if (mapped !== undefined) {
        if (ch === 'ו' && chars[i + 1] === 'ו') { r += 'v'; i++; continue; }
        r += mapped;
      } else {
        r += ch;
      }
    }
    r = r.replace(/aa/g, 'a').replace(/''/, "'").replace(/^'/, '').replace(/'$/, '');
    return r.charAt(0).toUpperCase() + r.slice(1);
  });
  let result = transliterated.join('').replace(/\s+/g, ' ').trim();
  result = result.replace(/\b(\w)/g, (_, c) => c.toUpperCase());
  return result;
}

function parseCityAlerts(cities: string[], threat: number, timestamp: string): RedAlert[] {
  const alerts: RedAlert[] = [];
  const threatType = OREF_THREAT_MAP[threat] || 'rockets';
  for (const cityHe of cities) {
    const trimmed = cityHe.trim();
    if (!trimmed) continue;
    const staticKnown = OREF_CITY_COORDS[trimmed];
    let known: typeof staticKnown | undefined = staticKnown;
    if (!known) {
      const dyn = dynamicCityCache?.get(trimmed);
      if (dyn) {
        known = { lat: dyn.lat, lng: dyn.lng, en: dyn.en, ar: dyn.ar, region: dyn.zone_en, regionHe: '', regionAr: '', countdown: dyn.countdown };
      }
    }
    const cityEn = known?.en || transliterateHebrew(trimmed);
    const epochSec = Math.floor(new Date(timestamp).getTime() / 1000);
    alerts.push({
      id: `oref-${trimmed}-${threat}-${epochSec}`,
      city: cityEn,
      cityHe: trimmed,
      cityAr: known?.ar || trimmed,
      region: known?.region || 'Israel',
      regionHe: known?.regionHe || 'ישראל',
      regionAr: known?.regionAr || 'إسرائيل',
      country: 'Israel',
      countryCode: 'IL',
      countdown: known?.countdown ?? 30,
      threatType,
      timestamp,
      active: true,
      lat: known?.lat ?? 31.5,
      lng: known?.lng ?? 35.0,
      source: 'live',
    });
  }
  return alerts;
}

const TZEVAADOM_HISTORY_URL = 'https://api.tzevaadom.co.il/alerts-history';

async function fetchFromTzevaadom(): Promise<RedAlert[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const resp = await fetch(TZEVAADOM_API_URL, {
    signal: controller.signal,
    headers: {
      'Accept': 'application/json',
      'Referer': 'https://www.tzevaadom.co.il/',
      'Origin': 'https://www.tzevaadom.co.il',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  });
  clearTimeout(timeout);
  if (!resp.ok) return [];
  const raw = await resp.json();
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const alerts: RedAlert[] = [];
  for (const item of raw) {
    if (item.isDrill) continue;
    const cities: string[] = item.cities || [];
    const threat = item.threat || 1;
    let ts: string;
    if (typeof item.time === 'number') {
      ts = new Date(item.time * 1000).toISOString();
    } else if (typeof item.time === 'string') {
      ts = new Date(item.time).toISOString();
    } else {
      ts = new Date().toISOString();
    }
    alerts.push(...parseCityAlerts(cities, threat, ts));
  }
  return alerts;
}

async function fetchTzevaadomHistory(): Promise<RedAlert[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const resp = await fetch(TZEVAADOM_HISTORY_URL, {
    signal: controller.signal,
    headers: { 'Accept': 'application/json' },
  });
  clearTimeout(timeout);
  if (!resp.ok) return [];
  const raw = await resp.json();
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const alerts: RedAlert[] = [];
  const now = Date.now();
  const SIX_HOURS = 6 * 3600000;
  const recentGroups = raw.filter((g: any) => {
    if (!g.alerts || g.alerts.length === 0) return false;
    const groupTime = g.alerts[0].time * 1000;
    return (now - groupTime) < SIX_HOURS;
  }).slice(0, 30);
  for (const group of recentGroups) {
    for (const item of group.alerts) {
      if (item.isDrill) continue;
      const cities: string[] = item.cities || [];
      const threat = item.threat || 1;
      let ts: string;
      if (typeof item.time === 'number') {
        ts = new Date(item.time * 1000).toISOString();
      } else if (typeof item.time === 'string') {
        ts = new Date(item.time).toISOString();
      } else {
        ts = new Date().toISOString();
      }
      alerts.push(...parseCityAlerts(cities, threat, ts));
    }
  }
  return alerts;
}

async function fetchFromOrefDirect(): Promise<RedAlert[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const resp = await fetch(OREF_API_URL, {
    signal: controller.signal,
    headers: {
      'Referer': 'https://www.oref.org.il/',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
    },
  });
  clearTimeout(timeout);
  if (!resp.ok) return [];
  const text = await resp.text();
  const trimmed = text.trim();
  // OREF returns empty/whitespace/\r\n when no active alerts
  if (!trimmed || trimmed === '' || trimmed === '\r\n' || trimmed === '[]') return [];
  let raw: any;
  try { raw = JSON.parse(trimmed); } catch { return []; }
  if (!raw || typeof raw !== 'object') return [];
  // OREF live API returns a single alert object {id, cat, title, data: string[], desc}
  // (NOT an array). Normalise to array for uniform processing.
  const items: any[] = Array.isArray(raw) ? raw : [raw];
  const alerts: RedAlert[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    // 'data' is an array of Hebrew city names in the live API
    const cities: string[] = Array.isArray(item.data) ? item.data
      : typeof item.data === 'string' && item.data ? [item.data]
      : typeof item.title === 'string' && item.title ? [item.title]
      : [];
    const cat = parseInt(String(item.cat ?? item.category ?? 1)) || 1;
    const ts = item.date ? new Date(item.date).toISOString() : new Date().toISOString();
    alerts.push(...parseCityAlerts(cities, cat, ts));
  }
  return alerts;
}

async function fetchFromOrefHistory(): Promise<RedAlert[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const resp = await fetch(OREF_HISTORY_URL, {
    signal: controller.signal,
    headers: {
      'Referer': 'https://www.oref.org.il/11226-he/pakar.aspx',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
      'Pragma': 'no-cache',
      'Cache-Control': 'max-age=0',
    },
  });
  clearTimeout(timeout);
  if (!resp.ok) return [];
  const raw = await resp.json();
  if (!Array.isArray(raw)) return [];
  const alerts: RedAlert[] = [];
  const now = Date.now();
  for (const item of raw.slice(0, 30)) {
    const alertTime = item.alertDate ? new Date(item.alertDate).getTime() : 0;
    if (alertTime && (now - alertTime) > 7_200_000) continue;
    const cities: string[] = Array.isArray(item.cities) ? item.cities : [item.data || ''].filter(Boolean);
    const threat = item.category ?? item.threat ?? 1;
    const ts = item.alertDate ? new Date(item.alertDate).toISOString() : new Date().toISOString();
    alerts.push(...parseCityAlerts(cities, threat, ts));
  }
  return alerts;
}

function extractAlertsFromTelegram(tgMsgs: TelegramMessage[]): RedAlert[] {
  const sirenPatterns = [
    { pattern: /صفارات الإنذار.*(?:تدوي|دوي)\s*(?:في|ب)\s*(.+?)(?:\s+خشية|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /سقوط صواريخ.*(?:في|على|ب)\s*(.+?)(?:\s+خشية|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /إطلاق صواريخ.*(?:في|على|ب|باتجاه)\s*(.+?)(?:\s+خشية|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /Red alert[s]?\s+(?:in|at)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /Rocket alert[s]?\s+(?:in|at)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /Sirens?\s+(?:sounding|activated|heard)\s+(?:in|at|across)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /(?:hostile|enemy)\s+(?:drone|UAV)\s+(?:intrusion|alert|detected)\s+(?:in|over|near)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'uav_intrusion' as const },
    { pattern: /(?:drone|UAV)\s+alert[s]?\s+(?:in|at)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'uav_intrusion' as const },
    { pattern: /Missile alert[s]?\s+(?:in|at)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'missiles' as const },
    { pattern: /(?:تسلل|اختراق)\s*(?:طائر|مسيّر).*(?:في|إلى|على|ب)\s*(.+?)(?:\n|$)/i, threatType: 'uav_intrusion' as const },
    { pattern: /Launches detected towards\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'missiles' as const },
    { pattern: /خشية تسلل\s*(?:طائرات? مسيّرة)/i, threatType: 'uav_intrusion' as const },
    { pattern: /(?:airstrike|air\s*strike)[s]?\s+(?:on|in|at|hit|target(?:s|ed|ing)?)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'missiles' as const },
    { pattern: /(?:struck|bombed|bombarded|shelled|targeted)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'missiles' as const },
    { pattern: /explosion[s]?\s+(?:reported\s+)?(?:in|at|near)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /(?:Houthi|Ansar\s*Allah)\s+(?:attack|strike|launch|fire)[s]?\s+(?:on|at|towards|targeting)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'missiles' as const },
    { pattern: /(?:missile|rocket|drone)\s+(?:strike|attack|hit|impact|intercept(?:ed|ion)?)\s+(?:in|on|at|near|over)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'missiles' as const },
    { pattern: /(?:IDF|Israeli?\s+(?:forces?|military|air\s*force))\s+(?:strike[s]?|attack[s]?|hit[s]?|bomb(?:s|ed)?|target(?:s|ed)?)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'missiles' as const },
    { pattern: /غارة\s+(?:جوية\s+)?(?:إسرائيلية\s+)?(?:على|في|ب)\s*(.+?)(?:\n|$)/i, threatType: 'missiles' as const },
    { pattern: /قصف\s+(?:مدفعي|صاروخي|جوي)?\s*(?:على|في|ب|يستهدف)\s*(.+?)(?:\n|$)/i, threatType: 'rockets' as const },
    { pattern: /استهداف\s+(?:موقع|منطقة|مدينة|بلدة)?\s*(.+?)(?:\n|$)/i, threatType: 'missiles' as const },
    { pattern: /انفجار(?:ات)?\s+(?:في|ب)\s*(.+?)(?:\n|$)/i, threatType: 'rockets' as const },
    { pattern: /(?:BREAKING|URGENT)\s*[:\|]?\s*(?:Strike|Attack|Explosion|Missile|Rocket|Drone|Airstrike)\s+(?:on|in|at|hits?|near)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'missiles' as const },
    { pattern: /(?:militia|PMF|IRGC|proxy)\s+(?:attack|strike|launch|fire)[s]?\s+(?:on|at|towards)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /(?:car\s*bomb|VBIED|IED|suicide\s*(?:bomb|attack))\s+(?:in|at|near|detonated)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /(?:mortar|artillery)\s+(?:fire|shelling|barrage|attack)\s+(?:on|in|at|hits?|near)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /intercept(?:ed|ion)\s+(?:over|above|near|in)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'missiles' as const },
    { pattern: /(?:US|American|coalition)\s+(?:strike[s]?|raid[s]?|attack[s]?|bomb(?:s|ed|ing)?)\s+(?:on|in|at|near)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'missiles' as const },
    { pattern: /(?:Hezbollah|resistance)\s+(?:launches?|fires?|targets?|attacks?|strikes?)\s+(?:at|on|towards|into)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /(?:Hezbollah|resistance)\s+(?:rockets?|missiles?|drones?|UAVs?)\s+(?:hit|strike|land|impact|towards)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /حزب الله\s+(?:يستهدف|يطلق|يقصف|يهاجم)\s+(.+?)(?:\n|$)/i, threatType: 'rockets' as const },
    { pattern: /المقاومة\s+(?:تستهدف|تطلق|تقصف|تهاجم)\s+(.+?)(?:\n|$)/i, threatType: 'rockets' as const },
    { pattern: /(?:Israeli?\s+)?(?:warplanes?|jets?|F-?(?:15|16|35))\s+(?:over|above|in|strike|bomb|target)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'missiles' as const },
    { pattern: /طيران\s+(?:حربي|إسرائيلي|معادي)\s+(?:يحلق|فوق|في|يقصف|يستهدف)\s*(.+?)(?:\n|$)/i, threatType: 'missiles' as const },
    { pattern: /(?:UNIFIL|peacekeep(?:ers?|ing))\s+(?:under\s+(?:fire|attack)|targeted|hit)\s+(?:in|at|near)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /(?:ceasefire\s+violation|violation\s+(?:of|in))\s+(?:south(?:ern)?\s+)?(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
    { pattern: /(?:infiltration|incursion|crossing)\s+(?:attempt\s+)?(?:into|in|at|near)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'uav_intrusion' as const },
    { pattern: /(?:tunnel[s]?\s+(?:discovered|found|destroyed|detonated))\s+(?:in|near|at)\s+(.+?)(?:\.|,|\n|$)/i, threatType: 'rockets' as const },
  ];

  const alerts: RedAlert[] = [];
  const now = Date.now();
  const recentMsgs = tgMsgs.filter(m => {
    const age = now - new Date(m.timestamp).getTime();
    return age < 7_200_000;
  });

  const seenLocations = new Set<string>();

  for (const msg of recentMsgs) {
    for (const { pattern, threatType } of sirenPatterns) {
      const match = msg.text.match(pattern);
      if (match) {
        const location = (match[1] || '').trim().replace(/https?:\/\/\S+/g, '').trim();
        if (!location || location.length < 2 || location.length > 100) continue;
        const locKey = `${location}-${threatType}`;
        if (seenLocations.has(locKey)) continue;
        seenLocations.add(locKey);

        const isArabic = /[\u0600-\u06FF]/.test(location);

        let cityEn = location;
        let cityAr = isArabic ? location : '';
        let cityHe = '';
        let region = 'Unknown Region';
        let regionHe = '';
        let regionAr = '';
        let lat = 32.0;
        let lng = 34.8;
        let countdown = 30;

        if (isArabic) {
          const arToEn: Record<string, string> = {
            'كريات شمونه': 'Kiryat Shmona', 'كريات شمونة': 'Kiryat Shmona',
            'حيفا': 'Haifa', 'تل أبيب': 'Tel Aviv', 'القدس': 'Jerusalem',
            'عسقلان': 'Ashkelon', 'أسدود': 'Ashdod', 'سديروت': 'Sderot',
            'بئر السبع': "Be'er Sheva", 'نهاريا': 'Nahariya', 'عكا': 'Acre',
            'صفد': 'Safed', 'طبريا': 'Tiberias', 'نتانيا': 'Netanya',
            'إيلات': 'Eilat', 'هرتسليا': 'Herzliya', 'كرميئيل': 'Karmiel',
            'المطلة': 'Metula', 'الخيام': 'Al-Khiam', 'لدة الخيام': 'Al-Khiam',
            'بنت جبيل': 'Bint Jbeil', 'النبطية': 'Nabatieh', 'صيدا': 'Sidon',
            'صور': 'Tyre', 'بيروت': 'Beirut', 'بعلبك': 'Baalbek',
            'الهرمل': 'Hermel', 'جونيه': 'Jounieh', 'زحلة': 'Zahle',
            'مرجعيون': 'Marjayoun', 'الناقورة': 'Naqoura',
            'جزين': 'Jezzine', 'قانا': 'Qana', 'تبنين': 'Tebnine',
            'حاصبيا': 'Hasbaya', 'كفرشوبا': 'Kafr Shuba',
            'عيتا الشعب': 'Aita al-Shaab', 'ميس الجبل': 'Mais al-Jabal',
            'بليدا': 'Blida', 'عيناتا': 'Aynata', 'يارون': 'Yaroun',
            'اللبونة': 'Labbouneh', 'علما الشعب': 'Alma ash-Shab',
            'رميش': 'Rmeish', 'عديسة': 'Adaisseh', 'مركبا': 'Markaba',
            'وادي البقاع': 'Bekaa Valley', 'البقاع': 'Bekaa',
            'الشوف': 'Chouf', 'عاليه': 'Aley', 'جبل لبنان': 'Mount Lebanon',
            'طرابلس': 'Tripoli', 'دمشق': 'Damascus', 'حلب': 'Aleppo',
            'بغداد': 'Baghdad', 'أربيل': 'Erbil', 'طهران': 'Tehran',
            'الرياض': 'Riyadh', 'صنعاء': 'Sanaa', 'عدن': 'Aden',
            'مأرب': 'Marib', 'الحديدة': 'Hodeidah',
            'رمات غان': 'Ramat Gan', 'بات يام': 'Bat Yam', 'حولون': 'Holon',
            'ريشون لتسيون': 'Rishon LeZion', 'رحوفوت': 'Rehovot',
            'بني براك': 'Bnei Brak', 'اللد': 'Lod', 'الرملة': 'Ramla',
            'الجليل': 'Galilee', 'الجليل الأعلى': 'Upper Galilee',
            'جنوب لبنان': 'South Lebanon', 'شمال إسرائيل': 'Northern Israel',
            'العفولة': 'Afula', 'الخضيرة': 'Hadera',
            'معالوت ترشيحا': "Ma'alot-Tarshiha",
            'جديدة المكر': 'Judeida-Makr', 'أبو سنان': 'Abu Snan',
            'دير الأسد': 'Deir al-Asad', 'كفر مندا': 'Kafr Manda',
            'غزة': 'Gaza', 'رفح': 'Rafah', 'خان يونس': 'Khan Younis',
            'جباليا': 'Jabalia', 'دير البلح': 'Deir al-Balah', 'بيت لاهيا': 'Beit Lahia',
            'الضاحية': 'Dahiyeh', 'الضاحية الجنوبية': 'Southern Suburbs',
            'مارون الراس': 'Maroun al-Ras', 'عيترون': 'Aitaroun',
            'كفركلا': 'Kafr Kila',
            'الموصل': 'Mosul', 'كركوك': 'Kirkuk', 'تكريت': 'Tikrit',
            'الأنبار': 'Anbar', 'الرمادي': 'Ramadi', 'الفلوجة': 'Fallujah',
            'اللاذقية': 'Latakia', 'حمص': 'Homs', 'ادلب': 'Idlib', 'إدلب': 'Idlib',
            'دير الزور': 'Deir ez-Zor', 'الرقة': 'Raqqa', 'القامشلي': 'Qamishli',
            'الحسكة': 'Al-Hasakah', 'درعا': 'Daraa', 'السويداء': 'Al-Suwayda',
            'تعز': 'Taiz', 'المخا': 'Mocha',
            'أصفهان': 'Isfahan', 'شيراز': 'Shiraz', 'كرمانشاه': 'Kermanshah',
            'تبريز': 'Tabriz', 'بوشهر': 'Bushehr', 'بندر عباس': 'Bandar Abbas',
            'أبو ظبي': 'Abu Dhabi', 'دبي': 'Dubai', 'عمان': 'Amman',
            'العقبة': 'Aqaba', 'إربد': 'Irbid',
          };

          const arKey = location.trim();
          if (arToEn[arKey]) {
            cityEn = arToEn[arKey];
          } else {
            for (const [ar, en] of Object.entries(arToEn)) {
              if (arKey.includes(ar)) { cityEn = en; break; }
            }
            if (cityEn === location) {
              cityEn = `Alert Zone (${location.substring(0, 30)})`;
            }
          }

          const heKey = Object.entries(OREF_CITY_COORDS).find(([_, v]) => v.en === cityEn);
          if (heKey) {
            const coords = heKey[1];
            cityHe = heKey[0];
            lat = coords.lat;
            lng = coords.lng;
            region = coords.region;
            regionHe = coords.regionHe;
            regionAr = coords.regionAr;
            countdown = coords.countdown;
          }
        }

        const knownPool = RED_ALERT_POOL.find(p => p.city === cityEn);
        if (knownPool) {
          lat = knownPool.lat;
          lng = knownPool.lng;
          region = knownPool.region;
          regionHe = knownPool.regionHe;
          regionAr = knownPool.regionAr;
          countdown = knownPool.countdown;
          cityHe = knownPool.cityHe;
          cityAr = knownPool.cityAr || cityAr;
        }

        if (region === 'Unknown Region') {
          const fullText = msg.text.toLowerCase();
          if (/galilee|גליל|الجليل|kiryat shmona|nahariya|safed|metula|tiberias|acre/.test(fullText)) region = 'Northern Israel';
          else if (/tel aviv|gush dan|תל אביב|ramat gan|herzliya|netanya|petah tikva|rishon/.test(fullText)) region = 'Central Israel';
          else if (/negev|sderot|ashkelon|ashdod|beer.?sheva|eshkol|lachish/.test(fullText)) region = 'Southern Israel';
          else if (/gaza|غزة|رفح|jabalia|khan younis|rafah|deir al.bal/.test(fullText)) region = 'Gaza';
          else if (/lebanon|لبنان|beirut|بيروت|hezbollah|حزب الله|nabatieh|tyre|sidon|baalbek|south leb|dahiy|bekaa/.test(fullText)) region = 'Lebanon';
          else if (/yemen|يمن|houthi|حوثي|sanaa|صنعاء|hodeidah|red sea/.test(fullText)) region = 'Yemen';
          else if (/syria|سوريا|damascus|دمشق|aleppo|حلب|idlib/.test(fullText)) region = 'Syria';
          else if (/iraq|عراق|baghdad|بغداد|erbil|أربيل/.test(fullText)) region = 'Iraq';
          else if (/iran|إيران|tehran|طهران|isfahan|أصفهان/.test(fullText)) region = 'Iran';
          else if (/west bank|jenin|nablus|ramallah|hebron/.test(fullText)) region = 'West Bank';
          else if (/jerusalem|القدس|ירושלים/.test(fullText)) region = 'Jerusalem';
          else if (/jordan|أردن|amman|عمان/.test(fullText)) region = 'Jordan';
          else if (/israel|إسرائيل/.test(fullText)) region = 'Israel';
        }

        const channelName = msg.channel.replace(/^@/, '');
        // Extract numeric post ID from msg.id format: live_{channel}_{postId}
        const postIdMatch = msg.id.match(/(\d+)(?:_[^_]*)?$/);
        const postId = postIdMatch ? postIdMatch[1] : null;
        const sourceUrl = postId
          ? `https://t.me/${channelName}/${postId}`
          : `https://t.me/s/${channelName}`;

        alerts.push({
          id: `tg-alert-${msg.id}-${threatType}`,
          city: cityEn,
          cityHe,
          cityAr,
          region,
          regionHe,
          regionAr,
          country: knownPool?.country || 'Israel',
          countryCode: knownPool?.countryCode || 'IL',
          countdown,
          threatType,
          timestamp: msg.timestamp,
          active: true,
          lat,
          lng,
          source: 'telegram' as any,
          sourceChannel: msg.channel,
          sourceUrl,
        });
        break;
      }
    }
  }
  return alerts;

async function fetchOrefAlerts(): Promise<RedAlert[]> {
  const now = Date.now();
  if (orefCache && (now - orefCache.timestamp) < OREF_CACHE_TTL) {
    return orefCache.data;
  }

  let liveAlerts: RedAlert[] = [];
  let historyAlerts: RedAlert[] = [];

  // 1 & 2. Fetch live + history in parallel to halve latency
  [liveAlerts, historyAlerts] = await Promise.all([
    fetchFromTzevaadom().catch(err => { console.log(`[RED-ALERTS] Tzevaadom live failed: ${(err as Error).message}`); return []; }),
    fetchTzevaadomHistory().catch(err => { console.log(`[RED-ALERTS] Tzevaadom history failed: ${(err as Error).message}`); return []; }),
  ]);
  if (liveAlerts.length > 0) console.log(`[RED-ALERTS] Tzevaadom live: ${liveAlerts.length} active alerts`);
  if (historyAlerts.length > 0) {
    historyAlerts.forEach(a => { a.active = false; a.countdown = 0; });
    console.log(`[RED-ALERTS] Tzevaadom history: ${historyAlerts.length} alerts (last 6h)`);
  }

  // 3. Merge WebSocket push alerts (real-time, highest priority)
  const wsAlerts = tzevaadomWsAlerts.filter(a => {
    const alertTime = new Date(a.timestamp).getTime();
    return (now - alertTime) < 3600000;
  });

  // 4. Telegram extraction as supplementary source
  let tgAlerts: RedAlert[] = [];
  if (latestTgMsgs.length > 0) {
    tgAlerts = extractAlertsFromTelegram(latestTgMsgs);
  }

  // 5. Combine all sources, deduplicate by id
  const allAlerts = [...wsAlerts, ...liveAlerts, ...historyAlerts, ...tgAlerts];
  const seen = new Set<string>();
  const deduped: RedAlert[] = [];
  for (const a of allAlerts) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      deduped.push(a);
    }
  }

  // Sort newest first
  deduped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const sources: string[] = [];
  if (wsAlerts.length > 0) sources.push(`WS:${wsAlerts.length}`);
  if (liveAlerts.length > 0) sources.push(`Live:${liveAlerts.length}`);
  if (historyAlerts.length > 0) sources.push(`Hist:${historyAlerts.length}`);
  if (tgAlerts.length > 0) sources.push(`TG:${tgAlerts.length}`);
  if (deduped.length > 0) {
    console.log(`[RED-ALERTS] Total: ${deduped.length} alerts (${sources.join(', ')})`);
  }

  orefCache = { data: deduped, timestamp: now };
  return orefCache.data;
}

async function generateRedAlerts(): Promise<RedAlert[]> {
  const liveAlerts = await fetchOrefAlerts();
  return liveAlerts;
}

// --- Tzevaadom WebSocket client for real-time push alerts ---
let tzevaadomWsAlerts: RedAlert[] = [];
let tzevaadomWsConnected = false;

function connectTzevaadomWebSocket(onAlert: (alerts: RedAlert[]) => void) {
  try {
    const ws = new WebSocket('wss://ws.tzevaadom.co.il/socket?platform=WEB', {
      headers: {
        'Origin': 'https://www.tzevaadom.co.il',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    ws.on('open', () => {
      tzevaadomWsConnected = true;
      console.log('[TZEVAADOM-WS] Connected — real-time push active');
      // Send periodic pings to keep the connection alive
      const ping = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          try { ws.ping(); } catch {}
        } else {
          clearInterval(ping);
        }
      }, 25000);
    });

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        const notif = msg.notification || msg.data || msg;
        if (notif && !notif.isDrill) {
          const cities: string[] = Array.isArray(notif.cities) ? notif.cities : [];
          const threat = typeof notif.threat === 'number' ? notif.threat : 1;
          const ts = typeof notif.time === 'number' ? new Date(notif.time * 1000).toISOString() : new Date().toISOString();
          const newAlerts = parseCityAlerts(cities, threat, ts);
          if (newAlerts.length > 0) {
            tzevaadomWsAlerts = [...newAlerts, ...tzevaadomWsAlerts].slice(0, 200);
            console.log(`[TZEVAADOM-WS] Push alert: ${newAlerts.map(a => a.city).join(', ')}`);
            onAlert(tzevaadomWsAlerts);
          }
        }
      } catch {}
    });

    ws.on('close', () => {
      tzevaadomWsConnected = false;
      console.log('[TZEVAADOM-WS] Disconnected — reconnecting in 8s');
      setTimeout(() => connectTzevaadomWebSocket(onAlert), 8000);
    });

    ws.on('error', () => { ws.terminate(); });
  } catch {
    setTimeout(() => connectTzevaadomWebSocket(onAlert), 15000);
  }
}

export {
  RED_ALERT_POOL,
  OREF_CITY_COORDS,
  fetchOrefAlerts,
  generateRedAlerts,
  connectTzevaadomWebSocket,
  parseCityAlerts,
  fetchDynamicCities,
};

export function clearCache(): void {
  orefCache = null;
  tzevaadomWsAlerts = [];
}
