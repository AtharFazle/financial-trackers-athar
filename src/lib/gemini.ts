import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export type ParsedTransaction = {
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date: string;
};

const SYSTEM_PROMPT = `Kamu adalah AI asisten keuangan yang ahli mengekstrak data transaksi dari teks bahasa Indonesia.

TUGAS: Analisis teks yang diberikan user dan ekstrak semua transaksi keuangan menjadi data terstruktur.

ATURAN PENTING:
1. Identifikasi SETIAP transaksi yang disebutkan dalam teks
2. Tentukan type: "income" untuk pemasukan (gaji, transfer masuk, bonus, dll), "expense" untuk pengeluaran
3. Konversi jumlah uang ke angka penuh:
   - "25rb" atau "25ribu" = 25000
   - "1.5jt" atau "1,5juta" = 1500000
   - "500k" = 500000
   - "2.5m" = 2500000
   - "25.000" = 25000
   - "Rp 50.000" = 50000
4. Pilih category yang PALING COCOK dari daftar berikut:
   - Untuk expense: "Makanan", "Pacaran", "Liburan", "Transportasi", "Belanja", "Tagihan", "Top up", "Lainnya"
   - Untuk income: "Gaji", "Lemburan", "Lainnya"
5. Buat description singkat dan jelas dalam bahasa Indonesia
6. Untuk date: gunakan format ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ). Jika tidak disebutkan tanggal, gunakan tanggal hari ini: {{TODAY}}
7. Jika ada kata "kemarin", kurangi 1 hari dari hari ini
8. Jika ada kata "minggu lalu", kurangi 7 hari dari hari ini
9. amount harus selalu lebih dari 500

PANDUAN KATEGORI:
- Makanan: makan, minum, kopi, restoran, warteg, gorengan, snack, nasi, ayam, bakso, dll
- Transportasi: grab, gojek, uber, bensin, parkir, tol, kereta, bus, ojol, dll
- Belanja: beli baju, sepatu, elektronik, gadget, online shop, shopee, tokopedia, dll
- Tagihan: listrik, air, internet, wifi, pulsa, cicilan, sewa, kos, dll
- Top up: isi saldo, top up ewallet, gopay, ovo, dana, shopeepay, dll
- Pacaran: date, jalan sama pacar, hadiah pacar, anniversary, dll
- Liburan: wisata, hotel, travel, tiket pesawat, dll
- Gaji: gaji bulanan, salary, payroll
- Lemburan: lembur, overtime
- Lainnya: yang tidak cocok dengan kategori manapun

FORMAT RESPONSE: Jawab HANYA dengan JSON array, tanpa teks lain, tanpa markdown code block. Contoh:
[{"type":"expense","amount":25000,"description":"Makan nasi goreng di warteg","category":"Makanan","date":"2026-06-18T12:00:00.000Z"},{"type":"expense","amount":15000,"description":"Naik Grab ke kantor","category":"Transportasi","date":"2026-06-18T08:00:00.000Z"}]

Jika teks tidak mengandung transaksi keuangan, jawab dengan array kosong: []`;

export async function parseTransactionText(
  text: string
): Promise<ParsedTransaction[]> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di .env.local");
  }

  const today = new Date().toISOString();
  const prompt = SYSTEM_PROMPT.replace("{{TODAY}}", today);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `${prompt}\n\nTeks user:\n${text}` }],
        },
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    });

    const responseText = response.text?.trim() || "[]";

    // Clean up response — remove markdown code fences if present
    let cleanJson = responseText;
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed: ParsedTransaction[] = JSON.parse(cleanJson);

    // Validate and sanitize each transaction
    return parsed
      .filter(
        (t) =>
          t.type &&
          t.amount &&
          t.description &&
          ["income", "expense"].includes(t.type)
      )
      .map((t) => ({
        type: t.type,
        amount: Math.round(Number(t.amount)),
        description: String(t.description),
        category: t.category || "Lainnya",
        date: t.date || new Date().toISOString(),
      }));
  } catch (error: any) {
    console.error("Gemini parsing error:", error);

    if (error.message?.includes("API key")) {
      throw new Error("API key Gemini tidak valid. Cek konfigurasi di .env.local");
    }

    if (error instanceof SyntaxError) {
      throw new Error(
        "AI gagal menghasilkan format yang valid. Coba lagi dengan teks yang lebih jelas."
      );
    }

    throw new Error(`Gagal memproses teks: ${error.message}`);
  }
}
