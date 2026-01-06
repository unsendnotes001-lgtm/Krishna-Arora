
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

// Initializing GoogleGenAI strictly following guidelines using process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLedger = async (transactions: Transaction[]) => {
  if (transactions.length === 0) return "No data available for analysis yet.";

  const ledgerContext = transactions.map(t => ({
    date: t.date,
    name: t.customerName,
    book: t.bookTitle,
    price: t.totalPrice,
    paid: t.amountPaid,
    balance: t.balance
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this book ledger for a shopkeeper. Give a short, helpful summary in Hinglish (Hindi + English mix).
      Identify:
      1. Who owes the most money (Chronic debtors).
      2. Popular books being bought.
      3. Any urgent follow-ups needed.
      Keep it professional but friendly for a small business owner.

      Data: ${JSON.stringify(ledgerContext)}`,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Error generating AI insights. Please check your connection.";
  }
};
