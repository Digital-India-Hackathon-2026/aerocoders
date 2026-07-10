import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import 'dotenv/config'; // Automatically loads your GEMINI_API_KEY from .env

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Rigid parsing schema setup for item classifications
const baggageSchema = {
  type: Type.OBJECT,
  properties: {
    airline_rules: {
      type: Type.ARRAY,
      description: "List of structured airline item baggage rules parsed out from the raw text.",
      items: {
        type: Type.OBJECT,
        properties: {
          item_category: { 
            type: Type.STRING, 
            description: "The generic name of the object (e.g., 'Power Bank', 'Perfume', 'Cricket Bat', 'Swiss Knife', 'Laptop')." 
          },
          placement_logic: { 
            type: Type.STRING, 
            description: "Must strictly be one of: 'CABIN_ONLY', 'CHECKIN_ONLY', 'SHOULDER_BAG', 'BOTH', or 'PROHIBITED'." 
          },
          allowed_in_cabin: { type: Type.BOOLEAN, description: "True if allowed anywhere inside passenger cabin (including shoulder bags)" },
          allowed_in_checkin: { type: Type.BOOLEAN, description: "True if allowed inside registered hold luggage" },
          allowed_in_shoulder: { type: Type.BOOLEAN, description: "True if explicitly identified as a small personal item (purse, small laptop bag)" },
          handling_notes: { 
            type: Type.STRING, 
            description: "Any strict condition or exception context (e.g., 'Must be under 100ml', 'Max 2 pieces per passenger', 'Must be packed safely'). Keep it short." 
          }
        },
        required: ["item_category", "placement_logic", "allowed_in_cabin", "allowed_in_checkin", "allowed_in_shoulder", "handling_notes"]
      }
    }
  }
};

async function transformBaggageData() {
  const markdownDir = path.join(__dirname, '../data/raw_markdown');
  const jsonOutputDir = path.join(__dirname, '../data/structured_json');

  // Set up outputs directories
  await fs.mkdir(jsonOutputDir, { recursive: true });

  try {
    const files = await fs.readdir(markdownDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    if (mdFiles.length === 0) {
      console.log("⚠️ No markdown data found to transform. Run 'node src/scraper.js' first.");
      return;
    }

    console.log(`🤖 Starting AI structural compilation for ${mdFiles.length} files...\n`);

    for (const file of mdFiles) {
      // Extract details out of filenames (e.g. 'air-india__cabin_item_placement.md')
      const [airline, typeWithExt] = file.split('__');
      const docType = typeWithExt.replace('.md', '');

      console.log(`🧠 AI processing constraints layout for [${airline.toUpperCase()}] -> ${docType}`);
      const rawMarkdownContent = await fs.readFile(path.join(markdownDir, file), 'utf-8');

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `
          You are a professional baggage logistics architecture engine. Analyze the raw markdown data scraped from airline guidelines below.
          Your absolute mandate is to extract a map dictionary matching everyday physical passenger items to their structural flight rules.

          Execution Directives:
          1. Strip away global structural noise: headers, web analytics, social buttons, footer legal disclaimers, or layout strings.
          2. Parse every distinct tangible object mentioned (e.g., electronic items, musical instruments, fluids, toiletries, sharp edges).
          3. Set standard placement_logic rules:
             - "CABIN_ONLY": Permitted exclusively in carry-on.
             - "CHECKIN_ONLY": Permitted exclusively in cargo hold boxes.
             - "SHOULDER_BAG": Specifically allowed as an extra small loose personal piece.
             - "BOTH": Interchangeable placement.
             - "PROHIBITED": Banned universally from flight.
          4. Complete all Boolean flags accurately according to the placement logic.

          Source Markdown context:
          ---
          ${rawMarkdownContent}
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: baggageSchema,
          temperature: 0.1,
          httpOptions: {timeout:300000} // Keeps transformations crisp and deterministic
        }
      });

      // Parse JSON output and inject airline context tracking + a hash signature for step 4 automation tracking
      const structuredResult = JSON.parse(response.text);
      
      // Inject identifying structural metadata into each entry
      structuredResult.airline_rules = structuredResult.airline_rules.map(rule => {
        const dataStringToHash = `${airline}-${rule.item_category}-${rule.placement_logic}-${rule.handling_notes}`;
        const record_hash = crypto.createHash('sha256').update(dataStringToHash).digest('hex').substring(0, 16);
        
        return {
          airline: airline,
          document_source_type: docType,
          ...rule,
          record_hash: record_hash
        };
      });

      // Write compiled dataset to structural storage path
      const outputFileName = `${airline}__${docType}.json`;
      await fs.writeFile(
        path.join(jsonOutputDir, outputFileName), 
        JSON.stringify(structuredResult, null, 2), 
        'utf-8'
      );
      console.log(`   ✨ Saved structured matrix configuration -> ${outputFileName}\n`);
    }

    console.log('🏁 Data structuring successfully completed. Review files inside data/structured_json/');

  } catch (error) {
    console.error('❌ Errors occurred running transformation layer execution:', error);
  }
}

transformBaggageData();