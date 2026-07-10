import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Utility to handle ES Module path resolutions
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Comprehensive list of all targeted item-classification endpoints
const TARGET_URLS = [
  // ==========================================
  // AIR INDIA TARGETS
  // ==========================================
  { 
    airline: 'air-india', 
    type: 'cabin_item_placement', 
    url: 'https://www.airindia.com/in/en/travel-information/baggage-guidelines/cabin-baggage.html' 
  },
  { 
    airline: 'air-india', 
    type: 'dangerous_goods_and_powerbanks', 
    url: 'https://www.airindia.com/in/en/travel-information/baggage-guidelines/restricted-baggage.html' 
  },
  { 
    airline: 'air-india', 
    type: 'everyday_special_objects', 
    url: 'https://www.airindia.com/in/en/travel-information/baggage-guidelines/special-baggage.html' 
  },

  // ==========================================
  // INDIGO TARGETS
  // ==========================================
  { 
    airline: 'indigo', 
    type: 'cabin_allowance_and_personal_items', 
    url: 'https://www.goindigo.in/baggage/baggage-allowance.html' 
  },
  { 
    airline: 'indigo', 
    type: 'prohibited_and_dangerous_goods_master', 
    url: 'https://www.goindigo.in/baggage/dangerous-goods-policy.html' 
  },
  { 
    airline: 'indigo', 
    type: 'special_and_oversized_items', 
    url: 'https://www.goindigo.in/baggage/special-baggage.html' 
  },
  { 
    airline: 'indigo', 
    type: 'hazardous_and_illegal_items', 
    url: 'https://www.goindigo.in/information/baggage-policy.html' 
  }
];

async function runBaggageScraper() {
  const outputDirectory = path.join(__dirname, '../data/raw_markdown');
  
  // Clean up existing file/folder conflicts to fix ENOTDIR issues completely
  try {
    const stats = await fs.stat(outputDirectory);
    if (!stats.isDirectory()) {
      console.log(`⚠️ Detected a stray file named 'raw_markdown'. Removing it to build a clean directory...`);
      await fs.unlink(outputDirectory);
      await fs.mkdir(outputDirectory, { recursive: true });
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Path does not exist at all, clean to build!
      await fs.mkdir(outputDirectory, { recursive: true });
    } else {
      throw err;
    }
  }

  console.log(`🚀 Initializing baggage data scraping pipeline for ${TARGET_URLS.length} endpoints...\n`);

  for (const target of TARGET_URLS) {
    const fileName = `${target.airline}__${target.type}.md`;
    const destinationPath = path.join(outputDirectory, fileName);

    try {
      console.log(`Fetching: [${target.airline.toUpperCase()}] - ${target.type}`);
      
      // Injecting target directly into Jina AI Reader URL endpoint structure
      const jinaReaderUrl = `https://r.jina.ai/${target.url}`;
      
      const response = await axios.get(jinaReaderUrl, {
        headers: { 
          'Accept': 'text/markdown',
          // Note: If you encounter Jina free-tier rate limits, add your token:
          // 'Authorization': 'Bearer YOUR_JINA_API_KEY'
        },
        timeout: 45000 // Extended to 45 seconds to guarantee stable page parsing returns
      });

      // Write raw markdown content out to local disk file
      await fs.writeFile(destinationPath, response.data, 'utf-8');
      console.log(`   ✅ Saved successfully -> ${fileName}\n`);

    } catch (error) {
      console.error(`   ❌ Failed to scrape data for ${target.type}:`, error.message);
      console.error(`      Target URL was: ${target.url}\n`);
    }
  }

  console.log('🏁 Data ingestion run completed. Check data/raw_markdown/ folder.');
}

runBaggageScraper();