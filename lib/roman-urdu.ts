import type { WordToken } from "@/types/editor";

const WORD_MAP: Record<string, string> = {
  "میں": "main",
  "ہے": "hai",
  "ہیں": "hain",
  "ہوں": "hoon",
  "تھا": "tha",
  "تھی": "thi",
  "تھے": "thay",
  "یہ": "yeh",
  "وہ": "woh",
  "اور": "aur",
  "کے": "ke",
  "کی": "ki",
  "کا": "ka",
  "کو": "ko",
  "سے": "se",
  "پر": "par",
  "ایک": "aik",
  "نہیں": "nahi",
  "بھی": "bhi",
  "تو": "to",
  "جو": "jo",
  "ہم": "hum",
  "آپ": "aap",
  "تم": "tum",
  "کیا": "kya",
  "کیوں": "kyun",
  "کیسے": "kaise",
  "لیکن": "lekin",
  "اگر": "agar",
  "پھر": "phir",
  "اب": "ab",
  "بہت": "bohat",
  "اچھا": "acha",
  "اچھی": "achi",
  "چاہیے": "chahiye",
  "کرنا": "karna",
  "کرتا": "karta",
  "کرتی": "karti",
  "کرتے": "karte",
  "کر": "kar",
  "رہا": "raha",
  "رہی": "rahi",
  "رہے": "rahe",
  "گیا": "gaya",
  "گئی": "gayi",
  "گئے": "gaye",
  "ہوگا": "hoga",
  "ہوگی": "hogi",
  "ہوگے": "hoge",
  "مجھے": "mujhe",
  "میرے": "mere",
  "میری": "meri",
  "میرا": "mera",
  "ہمارا": "hamara",
  "ہماری": "hamari",
  "ہمارے": "hamare",
  "یہاں": "yahan",
  "وہاں": "wahan",
  "ساتھ": "saath",
  "لئے": "liye",
  "لیے": "liye",
  "والا": "wala",
  "والی": "wali",
  "والے": "wale",
  "اس": "is",
  "اسے": "isay",
  "اسکو": "isko",
  "ان": "un",
  "انکو": "unko",
  "جب": "jab",
  "جہاں": "jahan",
  "کیونکہ": "kyunke",
  "یا": "ya",
  "جیسے": "jaisay",
  "کوئی": "koi",
  "کچھ": "kuch",
  "سب": "sab",
  "اپنا": "apna",
  "اپنی": "apni",
  "اپنے": "apne",
  "نہ": "na",
  "ہاں": "haan",
  "جی": "jee",
  "دو": "do",
  "تین": "teen",
  "چار": "chaar",
  "پانچ": "paanch",
  "وقت": "waqt",
  "دن": "din",
  "بات": "baat",
  "لوگ": "log",
  "کام": "kaam",
  "گھر": "ghar",
  "آج": "aaj",
  "کل": "kal",
};

const CHAR_MAP: Record<string, string> = {
  "ا": "a", "آ": "aa", "أ": "a", "إ": "i", "ب": "b", "پ": "p", "ت": "t", "ٹ": "t",
  "ث": "s", "ج": "j", "چ": "ch", "ح": "h", "خ": "kh", "د": "d", "ڈ": "d", "ذ": "z",
  "ر": "r", "ڑ": "r", "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s", "ض": "z",
  "ط": "t", "ظ": "z", "ع": "", "غ": "gh", "ف": "f", "ق": "q", "ک": "k", "ك": "k",
  "گ": "g", "ل": "l", "م": "m", "ن": "n", "ں": "n", "و": "o", "ؤ": "o", "ہ": "h",
  "ھ": "h", "ۃ": "h", "ة": "h", "ء": "", "ئ": "i", "ی": "i", "ي": "i", "ے": "e",
  "َ": "a", "ِ": "i", "ُ": "u", "ٰ": "a", "ْ": "", "ّ": "", "ٔ": "", "ـ": "",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

function splitPunctuation(value: string) {
  const match = value.match(/^([\s"'“”‘’([{]*)(.*?)([\s.,!?؟،؛:;"'“”‘’)}\]]*)$/u);
  if (!match) return { prefix: "", core: value, suffix: "" };
  return { prefix: match[1], core: match[2], suffix: match[3] };
}

export function romanizeUrdu(value: string) {
  return value
    .split(/(\s+)/)
    .map((piece) => {
      if (/^\s+$/.test(piece)) return piece;
      const { prefix, core, suffix } = splitPunctuation(piece);
      if (!core) return piece;
      const known = WORD_MAP[core];
      const roman = known ?? Array.from(core).map((char) => CHAR_MAP[char] ?? char).join("");
      return `${prefix}${roman.replace(/([aeiou])\1{2,}/gi, "$1$1")}${suffix}`;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function romanizeUrduTokens(tokens: WordToken[]): WordToken[] {
  return tokens.map((token) => ({
    ...token,
    text: romanizeUrdu(token.text),
    punctuated: romanizeUrdu(token.punctuated),
  }));
}
