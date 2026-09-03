import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EXPENSE_CATEGORIES = [
  'Repair Maintenance',
  'De Minimis',
  'Utilities',
  'Subscription',
  'Transportation',
  'Miscellaneous',
  'Gasoline',
  'Representation',
  'Pantry',
  'Medicine/Office Others',
  'Others'
];

export const receiptResponseSchema = {
  type: Type.OBJECT,
  properties: {
    date: {
      type: Type.STRING,
      description: 'Transaction date in YYYY-MM-DD format. If year is omitted or ambiguous, assume current year. Return null if not found.',
      nullable: true,
    },
    payee: {
      type: Type.STRING,
      description: 'Name of the merchant, store, vendor, or establishment.',
      nullable: true,
    },
    tin: {
      type: Type.STRING,
      description: 'Tax Identification Number (TIN) of the merchant, often formatted like 000-000-000-000.',
      nullable: true,
    },
    address: {
      type: Type.STRING,
      description: 'Physical street address or branch location of the merchant.',
      nullable: true,
    },
    invoiceNo: {
      type: Type.STRING,
      description: 'Sales Invoice (SI) number, Official Receipt (OR) number, or invoice reference number.',
      nullable: true,
    },
    category: {
      type: Type.STRING,
      enum: EXPENSE_CATEGORIES,
      description: 'Classification of the expense. You MUST choose the single best fit from the allowed list. If undetermined, use "Others".',
    },
    remarks: {
      type: Type.STRING,
      description: 'Brief 3-8 word summary of what items were purchased or primary business purpose.',
      nullable: true,
    },
    amount: {
      type: Type.NUMBER,
      description: 'Total final gross amount paid as a numeric float. Do NOT include currency symbols.',
      nullable: true,
    },
  },
  required: ['category'],
};

export async function extractReceiptData(filePath, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Read file as base64
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');

  const prompt = `You are a high-precision financial data extractor for business receipts and invoices.
Analyze this receipt image thoroughly and extract all the requested fields into the JSON schema provided.
- If a text field (date, payee, tin, address, invoiceNo, remarks) cannot be found or is illegible, return null.
- For category, choose the most appropriate category according to standard accounting principles. If not identifiable, select "Others".
- For amount, find the final total gross amount paid.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [
      {
        text: prompt,
      },
      {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: base64Data,
        },
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: receiptResponseSchema,
      temperature: 0.1,
    },
  });

  const rawText = response.text?.trim() || '{}';
  try {
    const parsed = JSON.parse(rawText);
    return {
      date: parsed.date || null,
      payee: parsed.payee || null,
      tin: parsed.tin || null,
      address: parsed.address || null,
      invoiceNo: parsed.invoiceNo || null,
      category: EXPENSE_CATEGORIES.includes(parsed.category) ? parsed.category : 'Others',
      remarks: parsed.remarks || null,
      amount: typeof parsed.amount === 'number' ? parsed.amount : (parsed.amount ? parseFloat(parsed.amount) : null),
    };
  } catch (err) {
    console.error('Failed to parse Gemini response as JSON:', rawText, err);
    throw new Error('Invalid JSON response returned by AI model');
  }
}
