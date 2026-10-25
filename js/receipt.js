/**
 * SpendLens - Receipt Processing, In-Browser OCR & Heuristic Parser
 * Supports automatic text extraction via Tesseract.js with seamless manual entry fallback.
 */

const ReceiptService = {
  /**
   * Process an uploaded file (Image or PDF) and return a lightweight Data URL
   */
  async processFile(file) {
    if (!file) return null;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            dataUrl: e.target.result,
            name: file.name,
            type: 'application/pdf',
            size: file.size,
            isPdf: true
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // It's an image: downscale and compress via Canvas to keep LocalStorage lightweight
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const compressed = this.compressImage(img, 850, 0.78);
            resolve({
              dataUrl: compressed,
              name: file.name,
              type: 'image/jpeg',
              size: Math.round(compressed.length * 0.75),
              isPdf: false
            });
          } catch (err) {
            resolve({
              dataUrl: e.target.result,
              name: file.name,
              type: file.type || 'image/png',
              size: file.size,
              isPdf: false
            });
          }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Downscale and compress image using offscreen HTML5 canvas
   */
  compressImage(img, maxDimension = 850, quality = 0.78) {
    let width = img.width;
    let height = img.height;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', quality);
  },

  /**
   * Automatic Receipt Reading via Tesseract.js (In-Browser Web Worker OCR)
   * Falls back gracefully to heuristic or manual entry if OCR cannot read.
   */
  async readReceiptWithOCR(dataUrl, filename, progressCallback) {
    let rawText = '';

    // Check if Tesseract.js is loaded
    if (typeof Tesseract !== 'undefined' && dataUrl && !dataUrl.startsWith('data:application/pdf')) {
      try {
        if (progressCallback) progressCallback({ status: 'Starting OCR engine...', progress: 10 });
        
        const worker = await Tesseract.createWorker('eng');
        
        if (progressCallback) progressCallback({ status: 'Reading receipt text with OCR...', progress: 40 });
        
        const ret = await worker.recognize(dataUrl);
        rawText = ret.data.text || '';
        
        await worker.terminate();
        if (progressCallback) progressCallback({ status: 'Analyzing extracted figures...', progress: 90 });
      } catch (err) {
        console.warn('Tesseract OCR failed, falling back to heuristics:', err);
      }
    }

    // Parse the extracted text (or filename if text is empty)
    const parsed = this.parseReceiptText(rawText, filename);
    parsed.rawText = rawText;
    return parsed;
  },

  /**
   * Smart Parser: Extracts Store Name, Total Amount, Date, and Category from raw text
   */
  parseReceiptText(text, filename) {
    const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
    const result = {
      store: null,
      amount: null,
      date: null,
      category: null,
      confidence: 0
    };

    const fullText = (text || '').toUpperCase();

    // 1. Detect Store Name (Known merchants or first clean header line)
    const KNOWN_STORES = [
      { name: 'Reliance Fresh', cat: 'Groceries' },
      { name: 'DMart', cat: 'Groceries' },
      { name: 'BigBasket', cat: 'Groceries' },
      { name: 'Nature\'s Basket', cat: 'Groceries' },
      { name: 'Trader Joe\'s', cat: 'Groceries' },
      { name: 'Whole Foods Market', cat: 'Groceries' },
      { name: 'Walmart', cat: 'Groceries' },
      { name: 'Target', cat: 'Groceries' },
      { name: 'Safeway', cat: 'Groceries' },
      { name: 'Apollo Pharmacy', cat: 'Health & Medical' },
      { name: 'MedPlus', cat: 'Health & Medical' },
      { name: 'CVS Pharmacy', cat: 'Health & Medical' },
      { name: 'Walgreens', cat: 'Health & Medical' },
      { name: 'Starbucks', cat: 'Cafe & Dining' },
      { name: 'Cafe Coffee Day', cat: 'Cafe & Dining' },
      { name: 'Blue Bottle Coffee', cat: 'Cafe & Dining' },
      { name: 'Haldiram\'s', cat: 'Cafe & Dining' },
      { name: 'McDonald\'s', cat: 'Cafe & Dining' },
      { name: 'Subway', cat: 'Cafe & Dining' },
      { name: 'Swiggy', cat: 'Cafe & Dining' },
      { name: 'Zomato', cat: 'Cafe & Dining' },
      { name: 'Indian Oil', cat: 'Transport' },
      { name: 'Bharat Petroleum', cat: 'Transport' },
      { name: 'Shell Fuel Station', cat: 'Transport' },
      { name: 'Uber', cat: 'Transport' },
      { name: 'Ola Cabs', cat: 'Transport' },
      { name: 'PVR Cinemas', cat: 'Entertainment' },
      { name: 'INOX', cat: 'Entertainment' },
      { name: 'BookMyShow', cat: 'Entertainment' },
      { name: 'Electricity Board', cat: 'Utilities' }
    ];

    for (const s of KNOWN_STORES) {
      if (fullText.includes(s.name.toUpperCase())) {
        result.store = s.name;
        result.category = s.cat;
        result.confidence += 40;
        break;
      }
    }

    // If store not identified, check filename
    if (!result.store && filename) {
      const lowerFile = filename.toLowerCase();
      for (const s of KNOWN_STORES) {
        if (lowerFile.includes(s.name.toLowerCase().replace(/[^a-z0-9]/g, '')) || lowerFile.includes(s.name.toLowerCase().split(' ')[0])) {
          result.store = s.name;
          result.category = s.cat;
          result.confidence += 25;
          break;
        }
      }
    }

    // Fallback store name from top lines
    if (!result.store && lines.length > 0) {
      for (let i = 0; i < Math.min(lines.length, 4); i++) {
        const line = lines[i];
        if (line.length >= 3 && !/(\d{4}|\d{2}\/\d{2}|www|http|tel|tax|invoice|receipt)/i.test(line)) {
          result.store = line.replace(/[*#=_\-]+/g, '').trim();
          result.confidence += 15;
          break;
        }
      }
    }

    // 2. Extract Total Amount (Search for TOTAL, BALANCE, AMOUNT, PAID, NET)
    const amountRegexes = [
      /(?:TOTAL|GRAND TOTAL|NET AMOUNT|AMOUNT DUE|BALANCE DUE|AMOUNT PAID|TOTAL DUE)[\s:₹$Rs.EURGBP]*([0-9,]+\.[0-9]{2})/i,
      /(?:TOTAL|GRAND TOTAL|NET AMOUNT)[\s:₹$Rs.EURGBP]*([0-9,]+)/i,
      /[₹$Rs.EURGBP]\s*([0-9,]+\.[0-9]{2})/i
    ];

    for (const regex of amountRegexes) {
      const match = fullText.match(regex);
      if (match && match[1]) {
        const cleaned = match[1].replace(/,/g, '');
        const val = parseFloat(cleaned);
        if (!isNaN(val) && val > 0) {
          result.amount = val;
          result.confidence += 35;
          break;
        }
      }
    }

    // 3. Extract Transaction Date
    // Match YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
    const dateMatch1 = (text || '').match(/\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.]([0-2][0-9]|3[01])\b/);
    if (dateMatch1) {
      result.date = `${dateMatch1[1]}-${dateMatch1[2]}-${dateMatch1[3]}`;
      result.confidence += 20;
    } else {
      const dateMatch2 = (text || '').match(/\b([0-2][0-9]|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b/);
      if (dateMatch2) {
        result.date = `${dateMatch2[3]}-${dateMatch2[2]}-${dateMatch2[1]}`;
        result.confidence += 20;
      }
    }

    // 4. Category Keyword Suggestion if not already matched
    if (!result.category) {
      if (/GROCERY|VEGETABLE|FRUIT|MILK|BREAD|MARKET|ORGANIC|PRODUCE|SUPERMARKET/i.test(fullText)) {
        result.category = 'Groceries';
      } else if (/COFFEE|CAFE|TEA|LATTE|BURGER|PIZZA|RESTAURANT|DINING|BAKERY|FOOD/i.test(fullText)) {
        result.category = 'Cafe & Dining';
      } else if (/PHARMACY|MEDICINE|HEALTH|CLINIC|DOCTOR|HOSPITAL|TABLET|DRUG/i.test(fullText)) {
        result.category = 'Health & Medical';
      } else if (/FUEL|PETROL|DIESEL|GAS|METRO|CAB|TAXI|TRAIN|TRANSPORT|FLIGHT/i.test(fullText)) {
        result.category = 'Transport';
      } else if (/ELECTRIC|WATER|POWER|ENERGY|UTILITY|INTERNET|WIFI|BROADBAND/i.test(fullText)) {
        result.category = 'Utilities';
      } else if (/MOVIE|CINEMA|THEATRE|SHOW|GAME|TICKET|STREAMING/i.test(fullText)) {
        result.category = 'Entertainment';
      } else if (/CLOTHES|APPAREL|FOOTWEAR|ELECTRONICS|STORE|MALL/i.test(fullText)) {
        result.category = 'Shopping';
      } else {
        result.category = 'Other';
      }
    }

    return result;
  }
};
