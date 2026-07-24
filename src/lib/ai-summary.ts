import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

export type CategorySummary = {
  category: string;
  total: number;
  count: number;
  percentage: number;
  items: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
};

export type AISummaryInput = {
  startDate: string;
  endDate: string;
  grandTotal: number;
  totalTransactionsCount: number;
  categories: CategorySummary[];
};

const SYSTEM_PROMPT = `Kamu adalah Penasihat Keuangan Pribadi AI yang cerdas, ramah, dan solutif.
Tugas kamu adalah menganalisis data pengeluaran pengguna dalam rentang waktu tertentu dan memberikan ringkasan serta analisis mendalam dalam bahasa Indonesia yang menarik, mudah dipahami, dan memberikan aksi nyata (actionable insights).

Formatlah jawabanmu dalam struktur Markdown yang rapi dengan bagian-bagian berikut:

1. **📊 Ringkasan Eksekutif**
   - Berikan gambaran umum pengeluaran total dan rata-rata harian (jika relevan).
   - Evaluasi singkat apakah pola pengeluaran ini termasuk hemat, wajar, atau boros.

2. **🔥 Analisis Kategori Terbesar**
   - Sorot 1-3 kategori dengan pengeluaran terbesar beserta persentasenya dari total pengeluaran.
   - Jelaskan item atau transaksi mana yang mendominasi di kategori tersebut.

3. **💡 Potensi Penghematan & Saran Aksi**
   - Berikan 2-4 tips penghematan konkrit dan realistis berdasarkan item yang dibeli/dikeluarkan pengguna.
   - Berikan trik penganggaran untuk periode berikutnya.

4. **⭐ Rating Kesehatan Finansial**
   - Berikan nilai/rating (contoh: 8/10 atau "Sehat", "Perlu Waspada", "Bahaya Boros") disertai alasan singkat 1 kalimat.

Gunakan bahasa yang santai namun profesional, penuh empati, dan suportif. Hindari format berlebihan, fokus pada poin-poin yang mudah dibaca.`;

export async function generateAISummary(input: AISummaryInput): Promise<string> {
  const { startDate, endDate, grandTotal, totalTransactionsCount, categories } = input;

  const promptText = `
Berikut adalah data pengeluaran saya:
- Periode: ${startDate} s/d ${endDate}
- Total Pengeluaran: Rp ${grandTotal.toLocaleString('id-ID')}
- Total Jumlah Transaksi: ${totalTransactionsCount} transaksi

Rincian per Kategori:
${categories
  .map(
    (c) =>
      `• Kategori: ${c.category}
  - Total: Rp ${c.total.toLocaleString('id-ID')} (${c.percentage.toFixed(1)}% dari total pengeluaran)
  - Jumlah transaksi: ${c.count}
  - Transaksi teratas: ${c.items.slice(0, 5).map((i) => `${i.description} (Rp ${i.amount.toLocaleString('id-ID')})`).join(', ')}`
  )
  .join('\n\n')}

Tolong analisis pengeluaran ini dan berikan ringkasan serta saran finansial sesuai instruksi.`;

  // 1. Try Cloudflare AI first
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;

  if (cfAccountId && cfToken) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: promptText },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.result?.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          return content.trim();
        }
      }
    } catch (err) {
      console.warn("Cloudflare AI summary failed, trying Gemini fallback...", err);
    }
  }

  // 2. Fallback to Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${promptText}` }],
          },
        ],
        config: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });
      if (response.text && response.text.trim()) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn("Gemini AI summary failed, trying Claude fallback...", err);
    }
  }

  // 3. Fallback to Anthropic Claude
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey) {
    try {
      const anthropic = new Anthropic({ apiKey: claudeKey });
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: promptText }],
      });
      const firstBlock = response.content[0];
      if (firstBlock.type === "text" && firstBlock.text.trim()) {
        return firstBlock.text.trim();
      }
    } catch (err) {
      console.error("Claude AI summary failed:", err);
    }
  }

  throw new Error("Gagal menghubungkan ke layanan AI. Pastikan setidaknya satu API key aktif di .env.local");
}
