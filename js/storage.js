/**
 * SpendLens - Storage, Currency & Data Models
 * Handles LocalStorage persistence, multiple currencies (Rupees ₹, USD $, EUR €, etc.),
 * sample data initialization, budgets, and duplicate checks.
 */

const STORAGE_KEY_EXPENSES = 'spendlens_expenses';
const STORAGE_KEY_BUDGETS = 'spendlens_budgets';
const STORAGE_KEY_CURRENCY = 'spendlens_currency';

// Supported Currencies with symbols, formatting locales, and display names
const SUPPORTED_CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)', locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar ($)', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (€)', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound (£)', locale: 'en-GB' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (C$)', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)', locale: 'en-AU' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)', locale: 'ja-JP' }
};

// Default Category Definitions
const DEFAULT_CATEGORIES = [
  { id: 'Groceries', name: 'Groceries', icon: '🛒', color: '#10b981', defaultBudget: 15000 },
  { id: 'Cafe & Dining', name: 'Cafe & Dining', icon: '☕', color: '#f59e0b', defaultBudget: 5000 },
  { id: 'Health & Medical', name: 'Health & Medical', icon: '💊', color: '#14b8a6', defaultBudget: 4000 },
  { id: 'Transport', name: 'Transport', icon: '🚗', color: '#3b82f6', defaultBudget: 4500 },
  { id: 'Utilities', name: 'Utilities', icon: '⚡', color: '#6366f1', defaultBudget: 6000 },
  { id: 'Entertainment', name: 'Entertainment', icon: '🎬', color: '#8b5cf6', defaultBudget: 3500 },
  { id: 'Shopping', name: 'Shopping', icon: '🛍️', color: '#ec4899', defaultBudget: 6000 },
  { id: 'Other', name: 'Other', icon: '📦', color: '#64748b', defaultBudget: 3000 }
];

// Sample receipt image paths
const SAMPLE_RECEIPT_TJ = 'sample-receipts/receipt-trader-joes.png';
const SAMPLE_RECEIPT_BB = 'sample-receipts/receipt-blue-bottle.png';
const SAMPLE_RECEIPT_CVS = 'sample-receipts/receipt-cvs-pharmacy.png';

// Realistic sample expenses spanning current month (Oct 2026) and previous month (Sep 2026)
const INITIAL_SAMPLE_EXPENSES = [
  // October 2026 (Current Month)
  {
    id: 'exp_20261020_01',
    date: '2026-10-20',
    amount: 450.00,
    store: 'Blue Bottle Cafe',
    category: 'Cafe & Dining',
    note: 'Specialty coffee & almond croissant',
    receiptData: SAMPLE_RECEIPT_BB,
    receiptName: 'receipt-blue-bottle.png',
    receiptType: 'image/png',
    isSample: true,
    createdAt: '2026-10-20T08:30:00Z'
  },
  {
    id: 'exp_20261018_01',
    date: '2026-10-18',
    amount: 2350.50,
    store: 'Reliance Fresh / Supermart',
    category: 'Groceries',
    note: 'Weekly organic produce, dairy & pantry items',
    receiptData: SAMPLE_RECEIPT_TJ,
    receiptName: 'receipt-grocery.png',
    receiptType: 'image/png',
    isSample: true,
    createdAt: '2026-10-18T14:15:00Z'
  },
  {
    id: 'exp_20261015_01',
    date: '2026-10-15',
    amount: 1120.00,
    store: 'Apollo Pharmacy',
    category: 'Health & Medical',
    note: 'Multivitamins & first aid supplies',
    receiptData: SAMPLE_RECEIPT_CVS,
    receiptName: 'receipt-pharmacy.png',
    receiptType: 'image/png',
    isSample: true,
    createdAt: '2026-10-15T11:45:00Z'
  },
  {
    id: 'exp_20261012_01',
    date: '2026-10-12',
    amount: 2450.00,
    store: 'Electricity & Power Board',
    category: 'Utilities',
    note: 'Monthly home power utility bill',
    receiptData: null,
    receiptName: null,
    receiptType: null,
    isSample: true,
    createdAt: '2026-10-12T09:00:00Z'
  },
  {
    id: 'exp_20261010_01',
    date: '2026-10-10',
    amount: 1850.00,
    store: 'Shell Fuel Station',
    category: 'Transport',
    note: 'Petrol fuel tank refill',
    receiptData: null,
    receiptName: null,
    receiptType: null,
    isSample: true,
    createdAt: '2026-10-10T16:20:00Z'
  },
  {
    id: 'exp_20261005_01',
    date: '2026-10-05',
    amount: 3200.00,
    store: 'Nature Basket Grocery',
    category: 'Groceries',
    note: 'Fruits, dry nuts & cold pressed oils',
    receiptData: null,
    receiptName: null,
    receiptType: null,
    isSample: true,
    createdAt: '2026-10-05T17:10:00Z'
  },
  {
    id: 'exp_20261003_01',
    date: '2026-10-03',
    amount: 950.00,
    store: 'PVR Cinemas',
    category: 'Entertainment',
    note: 'Weekend movie tickets & popcorn',
    receiptData: null,
    receiptName: null,
    receiptType: null,
    isSample: true,
    createdAt: '2026-10-03T19:40:00Z'
  },

  // September 2026 (Previous Month - baseline for Month-over-Month comparison)
  {
    id: 'exp_20260921_01',
    date: '2026-09-21',
    amount: 2780.00,
    store: 'Reliance Fresh',
    category: 'Groceries',
    note: 'Late September groceries',
    receiptData: null,
    receiptName: null,
    isSample: true,
    createdAt: '2026-09-21T12:00:00Z'
  },
  {
    id: 'exp_20260918_01',
    date: '2026-09-18',
    amount: 620.00,
    store: 'Cafe Coffee Day',
    category: 'Cafe & Dining',
    note: 'Coffee meeting',
    receiptData: null,
    receiptName: null,
    isSample: true,
    createdAt: '2026-09-18T10:00:00Z'
  },
  {
    id: 'exp_20260914_01',
    date: '2026-09-14',
    amount: 1800.00,
    store: 'City Health Clinic',
    category: 'Health & Medical',
    note: 'Routine health checkup',
    receiptData: null,
    receiptName: null,
    isSample: true,
    createdAt: '2026-09-14T15:30:00Z'
  },
  {
    id: 'exp_20260910_01',
    date: '2026-09-10',
    amount: 2600.00,
    store: 'Electricity Board',
    category: 'Utilities',
    note: 'September power bill',
    receiptData: null,
    receiptName: null,
    isSample: true,
    createdAt: '2026-09-10T09:00:00Z'
  },
  {
    id: 'exp_20260907_01',
    date: '2026-09-07',
    amount: 1950.00,
    store: 'Indian Oil Fuel',
    category: 'Transport',
    note: 'Highway road trip fuel',
    receiptData: null,
    receiptName: null,
    isSample: true,
    createdAt: '2026-09-07T14:00:00Z'
  },
  {
    id: 'exp_20260904_01',
    date: '2026-09-04',
    amount: 3450.00,
    store: 'DMart Supermarket',
    category: 'Groceries',
    note: 'Monthly provisions & pantry bulk',
    receiptData: null,
    receiptName: null,
    isSample: true,
    createdAt: '2026-09-04T18:00:00Z'
  },
  {
    id: 'exp_20260902_01',
    date: '2026-09-02',
    amount: 1200.00,
    store: 'BookMyShow Events',
    category: 'Entertainment',
    note: 'Live concert passes',
    receiptData: null,
    receiptName: null,
    isSample: true,
    createdAt: '2026-09-02T20:00:00Z'
  }
];

const DEFAULT_BUDGETS = {
  overall: 45000,
  categories: {
    'Groceries': 15000,
    'Cafe & Dining': 5000,
    'Health & Medical': 4000,
    'Transport': 4500,
    'Utilities': 6000,
    'Entertainment': 3500,
    'Shopping': 6000,
    'Other': 3000
  }
};

const StorageService = {
  init() {
    if (!localStorage.getItem(STORAGE_KEY_EXPENSES)) {
      this.saveExpenses(INITIAL_SAMPLE_EXPENSES);
    }
    if (!localStorage.getItem(STORAGE_KEY_BUDGETS)) {
      this.saveBudgets(DEFAULT_BUDGETS);
    }
    if (!localStorage.getItem(STORAGE_KEY_CURRENCY)) {
      // Default currency is Rupees (INR)
      this.setCurrency('INR');
    }
  },

  /* Currency management */
  getCurrency() {
    const code = localStorage.getItem(STORAGE_KEY_CURRENCY) || 'INR';
    return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.INR;
  },

  setCurrency(code) {
    if (SUPPORTED_CURRENCIES[code]) {
      localStorage.setItem(STORAGE_KEY_CURRENCY, code);
    }
  },

  formatCurrency(amount) {
    const curr = this.getCurrency();
    const val = parseFloat(amount || 0);
    const formatted = val.toLocaleString(curr.locale || 'en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${curr.symbol}${formatted}`;
  },

  getExpenses() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_EXPENSES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to read expenses from localStorage:', e);
      return [];
    }
  },

  saveExpenses(expenses) {
    try {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to save expenses:', e);
      throw e;
    }
  },

  addExpense(expense) {
    const expenses = this.getExpenses();
    const newEntry = {
      ...expense,
      id: expense.id || `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: expense.createdAt || new Date().toISOString(),
      isSample: false
    };
    expenses.unshift(newEntry);
    this.saveExpenses(expenses);
    return newEntry;
  },

  updateExpense(id, updatedFields) {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) return null;
    expenses[index] = { ...expenses[index], ...updatedFields };
    this.saveExpenses(expenses);
    return expenses[index];
  },

  deleteExpense(id) {
    const expenses = this.getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    this.saveExpenses(filtered);
    return filtered.length < expenses.length;
  },

  getExpenseById(id) {
    return this.getExpenses().find(e => e.id === id) || null;
  },

  getBudgets() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_BUDGETS);
      return data ? JSON.parse(data) : DEFAULT_BUDGETS;
    } catch (e) {
      return DEFAULT_BUDGETS;
    }
  },

  saveBudgets(budgets) {
    localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
  },

  hasSampleData() {
    return this.getExpenses().some(e => e.isSample === true);
  },

  clearSampleData() {
    const clean = this.getExpenses().filter(e => !e.isSample);
    this.saveExpenses(clean);
  },

  resetToSampleData() {
    this.saveExpenses(INITIAL_SAMPLE_EXPENSES);
    this.saveBudgets(DEFAULT_BUDGETS);
  },

  clearAllData() {
    this.saveExpenses([]);
  },

  checkForDuplicate(candidate, excludeId = null) {
    const expenses = this.getExpenses();
    const targetAmount = parseFloat(candidate.amount);
    const targetDate = candidate.date;
    const targetStore = (candidate.store || '').trim().toLowerCase();

    return expenses.find(e => {
      if (excludeId && e.id === excludeId) return false;
      const sameStore = (e.store || '').trim().toLowerCase() === targetStore;
      const sameAmount = Math.abs(parseFloat(e.amount) - targetAmount) < 0.01;
      const sameDate = e.date === targetDate;
      return sameStore && sameAmount && sameDate;
    }) || null;
  }
};

StorageService.init();
