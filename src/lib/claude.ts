import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

// Inisialisasi Anthropic SDK
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

export type ParsedTransaction = {
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date: string;
};

// Pindahkan instruksi sistem murni ke system prompt (Claude memisahkan ini dari user message)
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
[{"type":"expense","amount":25000,"description":"Makan nasi goreng di warteg","category":"Makanan","date":"2026-06-18T12:00:00.000Z"}]

Jika teks tidak mengandung transaksi keuangan, jawab dengan array kosong: []`;

export async function parseTransactionText(
  text: string
): Promise<ParsedTransaction[]> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY belum dikonfigurasi di .env.local");
  }

  const today = new Date().toISOString();
  const dynamicSystemPrompt = SYSTEM_PROMPT.replace("{{TODAY}}", today);

  try {
    // Memanggil API Claude (Menggunakan Claude 3.5 Sonnet untuk akurasi ekstraksi terbaik)
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      temperature: 0.1,
      system: dynamicSystemPrompt, // Claude memiliki parameter khusus untuk System Prompt
      messages: [
        {
          role: "user",
          content: `Teks user:\n${text}`,
        },
      ],
    });

    // Mengambil teks dari response block Claude
    let responseText = "";
    if (response.content[0].type === "text") {
      responseText = response.content[0].text.trim();
    }

    if (!responseText) return [];

    // Pembersihan block markdown jika Claude tidak sengaja menyertakannya
    let cleanJson = responseText;
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed: ParsedTransaction[] = JSON.parse(cleanJson);

    // Validasi dan sanitasi data hasil ekstraksi
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
    console.error("Claude parsing error:", error);

    if (error.status === 401) {
      throw new Error("API key Claude tidak valid. Cek konfigurasi di .env.local");
    }

    if (error instanceof SyntaxError) {
      throw new Error(
        "AI gagal menghasilkan format JSON yang valid. Coba lagi dengan teks yang lebih jelas."
      );
    }

    throw new Error(`Gagal memproses teks: ${error.message}`);
  }
}
