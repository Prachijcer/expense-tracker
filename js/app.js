/**
 * SpendLens - Main Application Controller
 * Handles UI routing, Home page, Dashboard, Currency switching (₹, $, €, etc.),
 * in-browser OCR auto-reading, manual entry fallback, and notifications.
 */

// Application State
const AppState = {
  currentView: 'home', // Default view is now the welcoming Home page
  editingExpenseId: null,
  currentReceiptAttachment: null,
  activeDetailExpenseId: null,
  historyFilters: {
    search: '',
    category: 'all',
    month: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date-desc'
  },
  selectedReportMonth: null
};

// DOM Ready initialization
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  init() {
    this.populateCurrencySelector();
    this.populateCategoryOptions();
    this.populateMonthFilterOptions();
    this.setupEventListeners();
    this.setupDropzone();

    // Default to current date
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('expense-date');
    if (dateInput) dateInput.value = today;

    // Load initial view: Welcoming Home Page
    this.navigateTo('home');
  },

  /* Currency selector in header */
  populateCurrencySelector() {
    const selector = document.getElementById('currency-selector');
    if (!selector) return;

    const currentCurrency = StorageService.getCurrency();
    selector.innerHTML = Object.values(SUPPORTED_CURRENCIES).map(curr => `
      <option value="${curr.code}" ${curr.code === currentCurrency.code ? 'selected' : ''}>
        ${curr.name}
      </option>
    `).join('');

    selector.addEventListener('change', (e) => {
      const newCode = e.target.value;
      StorageService.setCurrency(newCode);
      const curr = StorageService.getCurrency();
      this.showToast(`Currency changed to ${curr.name}`, 'info');
      
      // Re-render current active view with new currency symbols
      this.navigateTo(AppState.currentView);
    });
  },

  /* Navigation between views */
  navigateTo(viewId) {
    AppState.currentView = viewId;

    // Update nav links
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
      if (link.dataset.view === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      if (sec.id === `view-${viewId}`) {
        sec.classList.add('active');
      } else {
        sec.classList.remove('active');
      }
    });

    // Render contents of selected view
    if (viewId === 'home') {
      this.renderHome();
    } else if (viewId === 'dashboard') {
      this.renderDashboard();
    } else if (viewId === 'history') {
      this.renderHistory();
    } else if (viewId === 'reports') {
      this.renderReports();
    } else if (viewId === 'budgets') {
      this.renderBudgetSettings();
    } else if (viewId === 'add-expense') {
      this.resetExpenseForm();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /* Setup Event Listeners */
  setupEventListeners() {
    // Navigation clicks
    document.querySelectorAll('[data-view]').forEach(elem => {
      elem.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = elem.dataset.view;
        this.navigateTo(targetView);
      });
    });

    // Expense Form Submit
    const form = document.getElementById('expense-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleExpenseSubmit();
      });
    }

    // Duplicate check on form inputs
    ['expense-store', 'expense-amount', 'expense-date'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => this.checkForDuplicateInForm());
      }
    });

    // History filter inputs
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        AppState.historyFilters.search = e.target.value.trim().toLowerCase();
        this.renderHistory();
      });
    }

    const catFilter = document.getElementById('history-category-filter');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        AppState.historyFilters.category = e.target.value;
        this.renderHistory();
      });
    }

    const monthFilter = document.getElementById('history-month-filter');
    if (monthFilter) {
      monthFilter.addEventListener('change', (e) => {
        AppState.historyFilters.month = e.target.value;
        this.renderHistory();
      });
    }

    const sortFilter = document.getElementById('history-sort');
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        AppState.historyFilters.sortBy = e.target.value;
        this.renderHistory();
      });
    }

    // Reset filters button
    const resetFiltersBtn = document.getElementById('btn-reset-filters');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        AppState.historyFilters = { search: '', category: 'all', month: 'all', dateFrom: '', dateTo: '', sortBy: 'date-desc' };
        if (searchInput) searchInput.value = '';
        if (catFilter) catFilter.value = 'all';
        if (monthFilter) monthFilter.value = 'all';
        if (sortFilter) sortFilter.value = 'date-desc';
        this.renderHistory();
      });
    }

    // Export CSV
    const exportCsvBtn = document.getElementById('btn-export-csv');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        ExportService.exportToCSV(StorageService.getExpenses());
      });
    }

    // Backup JSON
    const backupBtn = document.getElementById('btn-backup-json');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => {
        ExportService.exportBackupJSON();
      });
    }

    // Restore JSON file picker
    const restoreInput = document.getElementById('restore-file-input');
    if (restoreInput) {
      restoreInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          if (confirm('This will replace current expenses with backup file. Proceed?')) {
            try {
              const res = await ExportService.restoreFromJSON(file);
              this.showToast(`Restored ${res.count} expenses successfully!`, 'success');
              this.renderDashboard();
            } catch (err) {
              this.showToast(`Failed to restore: ${err.message}`, 'danger');
            }
          }
        }
      });
    }

    // Sample data banner buttons
    const clearSampleBtn = document.getElementById('btn-clear-sample-data');
    if (clearSampleBtn) {
      clearSampleBtn.addEventListener('click', () => {
        if (confirm('Clear sample expenses? Your own created expenses will be kept.')) {
          StorageService.clearSampleData();
          this.showToast('Sample data removed.', 'success');
          this.navigateTo(AppState.currentView);
        }
      });
    }

    const resetSampleBtn = document.getElementById('btn-reset-sample-data');
    if (resetSampleBtn) {
      resetSampleBtn.addEventListener('click', () => {
        if (confirm('Reset everything to initial sample data?')) {
          StorageService.resetToSampleData();
          this.showToast('Reset to sample data complete.', 'success');
          this.navigateTo(AppState.currentView);
        }
      });
    }

    // Modal Close
    document.querySelectorAll('.btn-close-modal, .modal-backdrop').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          this.closeAllModals();
        }
      });
    });
  },

  /* Setup Drag & Drop Zone for Receipts with Auto-OCR */
  setupDropzone() {
    const dropzone = document.getElementById('receipt-dropzone');
    const fileInput = document.getElementById('receipt-file-input');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', async (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        await this.handleReceiptFileSelected(files[0]);
      }
    });

    fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        await this.handleReceiptFileSelected(e.target.files[0]);
      }
    });
  },

  /* Handle receipt file upload, automatic OCR reading & manual fallback */
  async handleReceiptFileSelected(file) {
    const ocrStatusBox = document.getElementById('ocr-status-banner');
    try {
      if (ocrStatusBox) {
        ocrStatusBox.style.display = 'flex';
        ocrStatusBox.innerHTML = `
          <div style="font-size: 1.4rem;">🔍</div>
          <div>
            <strong>Reading receipt with OCR...</strong>
            <div style="font-size: 0.8rem; color: #64748b;">Extracting store, total amount, date, and category automatically...</div>
          </div>
        `;
      }

      const processed = await ReceiptService.processFile(file);
      AppState.currentReceiptAttachment = processed;

      this.renderReceiptPreviewCard(processed);

      // Perform in-browser OCR
      const ocrResult = await ReceiptService.readReceiptWithOCR(
        processed.dataUrl,
        file.name,
        progress => {
          if (ocrStatusBox) {
            ocrStatusBox.innerHTML = `
              <div style="font-size: 1.4rem;">⚡</div>
              <div>
                <strong>${progress.status}</strong>
              </div>
            `;
          }
        }
      );

      let foundItems = [];
      if (ocrResult.store) {
        document.getElementById('expense-store').value = ocrResult.store;
        foundItems.push(`Store: <strong>${ocrResult.store}</strong>`);
      }
      if (ocrResult.amount) {
        document.getElementById('expense-amount').value = ocrResult.amount.toFixed(2);
        foundItems.push(`Total: <strong>${StorageService.formatCurrency(ocrResult.amount)}</strong>`);
      }
      if (ocrResult.date) {
        document.getElementById('expense-date').value = ocrResult.date;
        foundItems.push(`Date: <strong>${ocrResult.date}</strong>`);
      }
      if (ocrResult.category) {
        document.getElementById('expense-category').value = ocrResult.category;
        foundItems.push(`Category: <strong>${ocrResult.category}</strong>`);
      }

      this.checkForDuplicateInForm();

      if (ocrStatusBox) {
        if (foundItems.length > 0) {
          ocrStatusBox.className = 'duplicate-warning success';
          ocrStatusBox.innerHTML = `
            <div style="font-size: 1.4rem;">✨</div>
            <div>
              <strong>Auto-read from receipt!</strong><br/>
              ${foundItems.join(' • ')}.<br/>
              <span style="font-size: 0.8rem; color: #047857;">Please verify or correct any field below before saving.</span>
            </div>
          `;
        } else {
          ocrStatusBox.className = 'duplicate-warning';
          ocrStatusBox.innerHTML = `
            <div style="font-size: 1.4rem;">ℹ️</div>
            <div>
              <strong>Could not read text clearly from this receipt image.</strong><br/>
              No problem! You can easily enter the store and amount <strong>manually below</strong>.
            </div>
          `;
        }
      }

      this.showToast('Receipt attached. Review & confirm details before saving.', 'success');
    } catch (err) {
      if (ocrStatusBox) {
        ocrStatusBox.className = 'duplicate-warning';
        ocrStatusBox.innerHTML = `
          <div style="font-size: 1.4rem;">ℹ️</div>
          <div>Could not auto-read receipt. Please fill in details manually below.</div>
        `;
      }
      this.showToast('Please enter receipt details manually.', 'info');
    }
  },

  renderReceiptPreviewCard(attachment) {
    const previewContainer = document.getElementById('receipt-preview-container');
    const dropzone = document.getElementById('receipt-dropzone');
    if (!previewContainer) return;

    if (!attachment) {
      previewContainer.innerHTML = '';
      previewContainer.style.display = 'none';
      if (dropzone) dropzone.style.display = 'block';
      const ocrStatusBox = document.getElementById('ocr-status-banner');
      if (ocrStatusBox) ocrStatusBox.style.display = 'none';
      return;
    }

    if (dropzone) dropzone.style.display = 'none';
    previewContainer.style.display = 'block';

    const isPdf = attachment.isPdf;
    const thumbHtml = isPdf
      ? '<span style="font-size: 1.8rem;">📄</span>'
      : `<img src="${attachment.dataUrl}" alt="Receipt Preview">`;

    previewContainer.innerHTML = `
      <div class="receipt-preview-card">
        <div class="receipt-preview-thumb">${thumbHtml}</div>
        <div class="receipt-preview-info">
          <div class="receipt-filename">${attachment.name}</div>
          <div class="receipt-filesize">${(attachment.size / 1024).toFixed(1)} KB ${isPdf ? '• PDF' : '• Image'}</div>
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <button type="button" class="btn btn-outline btn-sm" id="btn-replace-receipt" title="Replace Receipt">Replace</button>
          <button type="button" class="btn btn-danger btn-sm" id="btn-remove-receipt" title="Remove Receipt">Remove</button>
        </div>
      </div>
    `;

    document.getElementById('btn-replace-receipt')?.addEventListener('click', () => {
      document.getElementById('receipt-file-input').click();
    });

    document.getElementById('btn-remove-receipt')?.addEventListener('click', () => {
      AppState.currentReceiptAttachment = null;
      this.renderReceiptPreviewCard(null);
    });
  },

  /* Check for duplicate entry */
  checkForDuplicateInForm() {
    const store = document.getElementById('expense-store')?.value;
    const amount = document.getElementById('expense-amount')?.value;
    const date = document.getElementById('expense-date')?.value;
    const warnBox = document.getElementById('duplicate-warning-banner');

    if (!store || !amount || !date || !warnBox) {
      if (warnBox) warnBox.style.display = 'none';
      return;
    }

    const candidate = { store, amount, date };
    const duplicate = StorageService.checkForDuplicate(candidate, AppState.editingExpenseId);

    if (duplicate) {
      warnBox.style.display = 'flex';
      warnBox.innerHTML = `
        <div class="duplicate-warning-icon">⚠️</div>
        <div>
          <strong>Possible duplicate entry:</strong> A similar expense of <strong>${StorageService.formatCurrency(duplicate.amount)}</strong> 
          at <strong>${duplicate.store}</strong> on <strong>${duplicate.date}</strong> is already saved in your records.
        </div>
      `;
    } else {
      warnBox.style.display = 'none';
    }
  },

  /* Populate Category options in selects */
  populateCategoryOptions() {
    const formSelect = document.getElementById('expense-category');
    const filterSelect = document.getElementById('history-category-filter');

    if (formSelect) {
      formSelect.innerHTML = '<option value="" disabled selected>Select a category...</option>';
      DEFAULT_CATEGORIES.forEach(cat => {
        formSelect.innerHTML += `<option value="${cat.name}">${cat.icon} ${cat.name}</option>`;
      });
    }

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">All Categories</option>';
      DEFAULT_CATEGORIES.forEach(cat => {
        filterSelect.innerHTML += `<option value="${cat.name}">${cat.icon} ${cat.name}</option>`;
      });
    }
  },

  /* Populate Months filter */
  populateMonthFilterOptions() {
    const expenses = StorageService.getExpenses();
    const months = ReportsService.getAvailableMonths(expenses);
    const filterSelect = document.getElementById('history-month-filter');
    const reportMonthSelect = document.getElementById('report-month-select');

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">All Months</option>';
      months.forEach(m => {
        filterSelect.innerHTML += `<option value="${m}">${ReportsService.formatMonthName(m)}</option>`;
      });
    }

    if (reportMonthSelect) {
      reportMonthSelect.innerHTML = '';
      months.forEach((m, idx) => {
        reportMonthSelect.innerHTML += `<option value="${m}" ${idx === 0 ? 'selected' : ''}>${ReportsService.formatMonthName(m)}</option>`;
      });
      reportMonthSelect.addEventListener('change', () => this.renderReports());
    }
  },

  /* Handle form submission */
  handleExpenseSubmit() {
    const store = document.getElementById('expense-store').value.trim();
    const amountStr = document.getElementById('expense-amount').value;
    const date = document.getElementById('expense-date').value;
    const category = document.getElementById('expense-category').value;
    const note = document.getElementById('expense-note').value.trim();

    if (!store) {
      alert('Please enter a store or merchant name.');
      return;
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }
    if (!date) {
      alert('Please select a valid transaction date.');
      return;
    }
    if (!category) {
      alert('Please choose a category.');
      return;
    }

    const expensePayload = {
      store,
      amount: Math.round(amount * 100) / 100,
      date,
      category,
      note: note || '',
      receiptData: AppState.currentReceiptAttachment ? AppState.currentReceiptAttachment.dataUrl : null,
      receiptName: AppState.currentReceiptAttachment ? AppState.currentReceiptAttachment.name : null,
      receiptType: AppState.currentReceiptAttachment ? AppState.currentReceiptAttachment.type : null
    };

    if (AppState.editingExpenseId) {
      StorageService.updateExpense(AppState.editingExpenseId, expensePayload);
      this.showToast('Expense updated successfully!', 'success');
    } else {
      StorageService.addExpense(expensePayload);
      this.showToast('Expense confirmed and saved!', 'success');
    }

    this.resetExpenseForm();
    this.populateMonthFilterOptions();
    this.navigateTo('dashboard');
  },

  resetExpenseForm() {
    AppState.editingExpenseId = null;
    AppState.currentReceiptAttachment = null;

    const form = document.getElementById('expense-form');
    if (form) form.reset();

    const title = document.getElementById('form-page-title');
    if (title) title.innerText = 'Add New Expense';

    const submitBtn = document.getElementById('btn-submit-expense');
    if (submitBtn) submitBtn.innerText = '💾 Confirm & Save Expense';

    const dateInput = document.getElementById('expense-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    const ocrStatusBox = document.getElementById('ocr-status-banner');
    if (ocrStatusBox) ocrStatusBox.style.display = 'none';

    this.renderReceiptPreviewCard(null);
    this.checkForDuplicateInForm();
  },

  editExpense(id) {
    const expense = StorageService.getExpenseById(id);
    if (!expense) return;

    AppState.editingExpenseId = expense.id;

    this.navigateTo('add-expense');

    document.getElementById('form-page-title').innerText = 'Edit Expense';
    document.getElementById('btn-submit-expense').innerText = '💾 Save Changes';

    document.getElementById('expense-store').value = expense.store || '';
    document.getElementById('expense-amount').value = expense.amount || '';
    document.getElementById('expense-date').value = expense.date || '';
    document.getElementById('expense-category').value = expense.category || '';
    document.getElementById('expense-note').value = expense.note || '';

    if (expense.receiptData) {
      AppState.currentReceiptAttachment = {
        dataUrl: expense.receiptData,
        name: expense.receiptName || 'receipt.jpg',
        size: 50000,
        isPdf: expense.receiptType === 'application/pdf'
      };
      this.renderReceiptPreviewCard(AppState.currentReceiptAttachment);
    } else {
      AppState.currentReceiptAttachment = null;
      this.renderReceiptPreviewCard(null);
    }

    this.closeAllModals();
  },

  deleteExpense(id) {
    const expense = StorageService.getExpenseById(id);
    if (!expense) return;

    if (confirm(`Are you sure you want to delete the expense of ${StorageService.formatCurrency(expense.amount)} at ${expense.store}?`)) {
      StorageService.deleteExpense(id);
      this.showToast('Expense record deleted.', 'warning');
      this.closeAllModals();
      this.renderDashboard();
      this.renderHistory();
      this.renderReports();
      this.renderHome();
    }
  },

  /* ==========================================================================
     VIEW 0: WELCOMING HOME PAGE (Clean, Effective, User-Friendly)
     ========================================================================== */
  renderHome() {
    const expenses = StorageService.getExpenses();
    const budgets = StorageService.getBudgets();

    const now = new Date();
    const currentMonthYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthYm = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const thisMonthBreakdown = ReportsService.getMonthlyCategoryBreakdown(expenses, currentMonthYm);
    const momAnalysis = ReportsService.computeMonthOverMonth(expenses, currentMonthYm, prevMonthYm);

    // Time-based friendly greeting
    const hours = now.getHours();
    let greeting = 'Good day';
    if (hours < 12) greeting = 'Good morning';
    else if (hours < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    const greetingEl = document.getElementById('home-greeting');
    if (greetingEl) greetingEl.innerText = `${greeting}! Here's your spending pulse.`;

    // Monthly total spent in selected currency (₹)
    const totalEl = document.getElementById('home-total-spent');
    if (totalEl) totalEl.innerText = StorageService.formatCurrency(thisMonthBreakdown.totalSpent);

    // Budget remaining
    const monthlyBudget = budgets.overall || 45000;
    const remaining = monthlyBudget - thisMonthBreakdown.totalSpent;
    const budgetPct = Math.min(100, Math.round((thisMonthBreakdown.totalSpent / monthlyBudget) * 100));

    const remainingEl = document.getElementById('home-budget-remaining');
    if (remainingEl) {
      remainingEl.innerText = `${StorageService.formatCurrency(remaining)} left (${budgetPct}% of ${StorageService.formatCurrency(monthlyBudget)} budget)`;
      remainingEl.style.color = remaining >= 0 ? '#10b981' : '#ef4444';
    }

    const homeProgressFill = document.getElementById('home-budget-progress-fill');
    if (homeProgressFill) {
      homeProgressFill.style.width = `${budgetPct}%`;
      homeProgressFill.className = `progress-fill ${budgetPct >= 100 ? 'danger' : (budgetPct >= 80 ? 'warning' : 'safe')}`;
    }

    // MoM message
    const momEl = document.getElementById('home-mom-alert');
    if (momEl) {
      momEl.innerText = momAnalysis.alertMessage;
      momEl.className = `mom-pill ${momAnalysis.alertType}`;
    }

    // Home recent preview list
    const homeRecentList = document.getElementById('home-recent-list');
    if (homeRecentList) {
      const recent = expenses.slice(0, 4);
      if (recent.length === 0) {
        homeRecentList.innerHTML = '<div style="text-align: center; padding: 1.5rem; color: #64748b;">No expenses recorded yet. Tap "Scan Receipt" or "Add Manually" above!</div>';
      } else {
        homeRecentList.innerHTML = this.renderExpenseTableRows(recent);
      }
    }
  },

  /* ==========================================================================
     DASHBOARD VIEW RENDERING
     ========================================================================== */
  renderDashboard() {
    const expenses = StorageService.getExpenses();
    const budgets = StorageService.getBudgets();

    // Toggle Sample Data Banner
    const sampleBanner = document.getElementById('sample-data-banner');
    if (sampleBanner) {
      sampleBanner.style.display = StorageService.hasSampleData() ? 'flex' : 'none';
    }

    const now = new Date();
    const currentMonthYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthYm = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const thisMonthBreakdown = ReportsService.getMonthlyCategoryBreakdown(expenses, currentMonthYm);
    const momAnalysis = ReportsService.computeMonthOverMonth(expenses, currentMonthYm, prevMonthYm);

    // 1. Total Spent Tile
    const totalSpentEl = document.getElementById('dash-total-spent');
    if (totalSpentEl) totalSpentEl.innerText = StorageService.formatCurrency(thisMonthBreakdown.totalSpent);

    // 2. Budget Tile & Progress Bar
    const monthlyBudget = budgets.overall || 45000;
    const remaining = monthlyBudget - thisMonthBreakdown.totalSpent;
    const budgetPct = Math.min(100, Math.round((thisMonthBreakdown.totalSpent / monthlyBudget) * 100));

    const budgetRemainingEl = document.getElementById('dash-budget-remaining');
    if (budgetRemainingEl) {
      budgetRemainingEl.innerText = `${StorageService.formatCurrency(remaining)} left`;
      budgetRemainingEl.style.color = remaining >= 0 ? '#10b981' : '#ef4444';
    }

    const progressFill = document.getElementById('dash-budget-progress-fill');
    if (progressFill) {
      progressFill.style.width = `${budgetPct}%`;
      progressFill.className = `progress-fill ${budgetPct >= 100 ? 'danger' : (budgetPct >= 80 ? 'warning' : 'safe')}`;
    }

    const budgetSubtext = document.getElementById('dash-budget-subtext');
    if (budgetSubtext) {
      budgetSubtext.innerText = `${budgetPct}% of ${StorageService.formatCurrency(monthlyBudget)} budget spent`;
    }

    // 3. Month-over-Month Pill & Tile
    const momPill = document.getElementById('dash-mom-pill');
    if (momPill) {
      momPill.innerText = momAnalysis.diff < 0
        ? `-${StorageService.formatCurrency(Math.abs(momAnalysis.diff))} (${Math.abs(momAnalysis.percentageChange)}%)`
        : `+${StorageService.formatCurrency(Math.abs(momAnalysis.diff))} (+${momAnalysis.percentageChange}%)`;
      momPill.className = `mom-pill ${momAnalysis.alertType}`;
    }

    const momMessage = document.getElementById('dash-mom-message');
    if (momMessage) {
      momMessage.innerText = momAnalysis.alertMessage;
    }

    const momDatesLabel = document.getElementById('dash-mom-dates-label');
    if (momDatesLabel) {
      momDatesLabel.innerText = momAnalysis.dateRangeLabel;
    }

    // 4. Render Charts
    ChartRenderer.renderCategoryDonut('chart-category-donut', thisMonthBreakdown.categories);
    ChartRenderer.renderMonthComparison(
      'chart-mom-bars',
      momAnalysis.previousPeriodTotal,
      momAnalysis.currentPeriodTotal,
      `Last Month (Day 1–${momAnalysis.maxDayCompared})`,
      `This Month (Day 1–${momAnalysis.maxDayCompared})`
    );

    // 5. Category Breakdown List
    const catListContainer = document.getElementById('dash-category-list');
    if (catListContainer) {
      if (thisMonthBreakdown.categories.length === 0 || thisMonthBreakdown.totalSpent === 0) {
        catListContainer.innerHTML = '<div class="empty-state" style="padding: 1.5rem;"><p class="empty-state-desc">No category spending recorded this month.</p></div>';
      } else {
        catListContainer.innerHTML = thisMonthBreakdown.categories.slice(0, 5).map(cat => `
          <div class="cat-item-row">
            <div class="cat-item-left">
              <span class="cat-color-dot" style="background-color: ${cat.color};"></span>
              <span class="cat-name">${cat.icon} ${cat.name}</span>
              <span class="cat-percent-tag">${cat.percentage}%</span>
            </div>
            <div class="cat-item-right">${StorageService.formatCurrency(cat.amount)}</div>
          </div>
        `).join('');
      }
    }

    // 6. Recently Uploaded Receipts Strip
    const receiptsStrip = document.getElementById('dash-receipts-strip');
    const receiptsContainer = document.getElementById('dash-receipts-container');
    const withReceipts = expenses.filter(e => e.receiptData).slice(0, 6);

    if (receiptsStrip && receiptsContainer) {
      if (withReceipts.length === 0) {
        receiptsContainer.style.display = 'none';
      } else {
        receiptsContainer.style.display = 'block';
        receiptsStrip.innerHTML = withReceipts.map(e => `
          <div class="receipt-chip" onclick="App.openDetailModal('${e.id}')">
            <div class="receipt-chip-thumb">
              <img src="${e.receiptData}" alt="Receipt">
            </div>
            <div class="receipt-chip-store">${e.store}</div>
            <div class="receipt-chip-meta">
              <span>${e.date.substring(5)}</span>
              <strong>${StorageService.formatCurrency(e.amount)}</strong>
            </div>
          </div>
        `).join('');
      }
    }

    // 7. Recent Transactions List
    const recentList = document.getElementById('dash-recent-list');
    if (recentList) {
      const recent = expenses.slice(0, 5);
      if (recent.length === 0) {
        recentList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🧾</div>
            <div class="empty-state-title">No Expenses Yet</div>
            <p class="empty-state-desc">Start tracking your spending by adding an expense or uploading a receipt.</p>
            <button class="btn btn-primary" onclick="App.navigateTo('add-expense')">➕ Add Your First Expense</button>
          </div>
        `;
      } else {
        recentList.innerHTML = this.renderExpenseTableRows(recent);
      }
    }
  },

  /* ==========================================================================
     HISTORY VIEW RENDERING
     ========================================================================== */
  renderHistory() {
    const expenses = StorageService.getExpenses();
    const filters = AppState.historyFilters;

    let filtered = expenses.filter(e => {
      if (filters.search) {
        const query = filters.search;
        const inStore = (e.store || '').toLowerCase().includes(query);
        const inNote = (e.note || '').toLowerCase().includes(query);
        const inCategory = (e.category || '').toLowerCase().includes(query);
        if (!inStore && !inNote && !inCategory) return false;
      }

      if (filters.category !== 'all') {
        if ((e.category || 'Other') !== filters.category) return false;
      }

      if (filters.month !== 'all') {
        if (!e.date || !e.date.startsWith(filters.month)) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (filters.sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (filters.sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (filters.sortBy === 'amount-desc') return b.amount - a.amount;
      if (filters.sortBy === 'amount-asc') return a.amount - b.amount;
      if (filters.sortBy === 'store-asc') return (a.store || '').localeCompare(b.store || '');
      return 0;
    });

    const countBadge = document.getElementById('history-count-badge');
    if (countBadge) countBadge.innerText = `${filtered.length} record${filtered.length === 1 ? '' : 's'}`;

    const totalFiltered = filtered.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const sumEl = document.getElementById('history-filtered-total');
    if (sumEl) sumEl.innerText = StorageService.formatCurrency(totalFiltered);

    const tableBody = document.getElementById('history-table-body');
    if (tableBody) {
      if (filtered.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 3rem 1rem;">
              <div class="empty-state" style="border: none; padding: 0;">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-title">No Matching Records</div>
                <p class="empty-state-desc">Try clearing your search query or adjusting your filters.</p>
              </div>
            </td>
          </tr>
        `;
      } else {
        tableBody.innerHTML = this.renderExpenseTableRows(filtered);
      }
    }
  },

  renderExpenseTableRows(list) {
    return list.map(e => {
      const catObj = DEFAULT_CATEGORIES.find(c => c.name === e.category) || { icon: '📦', color: '#64748b' };
      const hasReceipt = Boolean(e.receiptData);

      return `
        <tr>
          <td>
            <span style="font-weight: 600; color: #475569;">${e.date}</span>
          </td>
          <td>
            <div class="expense-store-cell">
              <strong>${e.store}</strong>
              ${e.note ? `<span style="font-size: 0.78rem; color: #94a3b8;" title="${e.note}">💬</span>` : ''}
            </div>
          </td>
          <td>
            <span class="category-badge" style="background-color: ${catObj.color}15; color: ${catObj.color}; border: 1px solid ${catObj.color}30;">
              ${catObj.icon} ${e.category}
            </span>
          </td>
          <td class="amount-cell">${StorageService.formatCurrency(e.amount)}</td>
          <td>
            ${hasReceipt ? `
              <span class="receipt-attached-icon" onclick="App.openDetailModal('${e.id}')" title="View attached receipt">
                📎
              </span>
            ` : '<span style="color: #cbd5e1;">—</span>'}
          </td>
          <td style="text-align: right;">
            <button class="btn btn-outline btn-sm" onclick="App.openDetailModal('${e.id}')" title="View Details">👁️</button>
            <button class="btn btn-outline btn-sm" onclick="App.editExpense('${e.id}')" title="Edit Expense">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="App.deleteExpense('${e.id}')" title="Delete Expense">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  /* ==========================================================================
     REPORTS VIEW RENDERING
     ========================================================================== */
  renderReports() {
    const expenses = StorageService.getExpenses();
    const select = document.getElementById('report-month-select');
    const chosenMonth = select ? select.value : ReportsService.getAvailableMonths(expenses)[0];

    const [y, m] = chosenMonth.split('-');
    const prevDate = new Date(parseInt(y, 10), parseInt(m, 10) - 2, 1);
    const prevMonthYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const report = ReportsService.getMonthlyCategoryBreakdown(expenses, chosenMonth);
    const mom = ReportsService.computeMonthOverMonth(expenses, chosenMonth, prevMonthYm);

    const headerTitle = document.getElementById('report-month-title');
    if (headerTitle) headerTitle.innerText = `${ReportsService.formatMonthName(chosenMonth)} Summary`;

    const totalEl = document.getElementById('report-total-spent');
    if (totalEl) totalEl.innerText = StorageService.formatCurrency(report.totalSpent);

    const txCountEl = document.getElementById('report-tx-count');
    if (txCountEl) txCountEl.innerText = `${report.transactionCount} transactions`;

    const alertBox = document.getElementById('report-mom-alert-box');
    if (alertBox) {
      alertBox.className = `duplicate-warning ${mom.alertType === 'favorable' ? 'success' : (mom.alertType === 'unfavorable' ? 'warning' : '')}`;
      alertBox.innerHTML = `
        <div style="font-size: 1.4rem;">📊</div>
        <div>
          <div style="font-weight: 700; margin-bottom: 0.2rem;">${mom.alertMessage}</div>
          <div style="font-size: 0.8rem; color: #64748b;">
            ${mom.dateRangeLabel}: Current period ${StorageService.formatCurrency(mom.currentPeriodTotal)} vs Previous period ${StorageService.formatCurrency(mom.previousPeriodTotal)}.
            Full previous month (${ReportsService.formatMonthName(prevMonthYm)}) was ${StorageService.formatCurrency(mom.previousFullTotal)}.
          </div>
        </div>
      `;
    }

    const tableBody = document.getElementById('report-category-table-body');
    if (tableBody) {
      tableBody.innerHTML = report.categories.map(cat => {
        const momCat = mom.categoryComparisons.find(c => c.name === cat.name) || { diff: 0, pct: 0 };
        const diffText = momCat.diff > 0
          ? `+${StorageService.formatCurrency(momCat.diff)}`
          : `-${StorageService.formatCurrency(Math.abs(momCat.diff))}`;
        const diffColor = momCat.diff > 0 ? '#ef4444' : (momCat.diff < 0 ? '#10b981' : '#64748b');

        return `
          <tr>
            <td>
              <span class="category-badge" style="background-color: ${cat.color}15; color: ${cat.color};">
                ${cat.icon} ${cat.name}
              </span>
            </td>
            <td style="font-weight: 700;">${StorageService.formatCurrency(cat.amount)}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div class="progress-track" style="margin-bottom: 0; width: 100px;">
                  <div class="progress-fill safe" style="width: ${cat.percentage}%; background-color: ${cat.color};"></div>
                </div>
                <span style="font-size: 0.8rem; font-weight: 600;">${cat.percentage}%</span>
              </div>
            </td>
            <td>${cat.count}</td>
            <td style="font-weight: 700; color: ${diffColor};">
              ${momCat.diff === 0 ? '—' : `${diffText} (${momCat.pct}%)`}
            </td>
          </tr>
        `;
      }).join('');
    }
  },

  /* ==========================================================================
     BUDGET SETTINGS VIEW
     ========================================================================== */
  renderBudgetSettings() {
    const budgets = StorageService.getBudgets();
    const curr = StorageService.getCurrency();

    const overallInput = document.getElementById('budget-overall-input');
    if (overallInput) overallInput.value = budgets.overall || 45000;

    const catInputsContainer = document.getElementById('budget-categories-grid');
    if (catInputsContainer) {
      catInputsContainer.innerHTML = DEFAULT_CATEGORIES.map(cat => {
        const val = (budgets.categories && budgets.categories[cat.name]) !== undefined
          ? budgets.categories[cat.name]
          : cat.defaultBudget;
        return `
          <div class="form-group">
            <label class="form-label">${cat.icon} ${cat.name} (${curr.symbol})</label>
            <input type="number" step="100" class="form-input budget-cat-field" data-cat="${cat.name}" value="${val}">
          </div>
        `;
      }).join('');
    }

    const saveBudgetBtn = document.getElementById('btn-save-budgets');
    if (saveBudgetBtn) {
      saveBudgetBtn.onclick = () => {
        const overall = parseFloat(overallInput.value) || 45000;
        const categories = {};
        document.querySelectorAll('.budget-cat-field').forEach(input => {
          categories[input.dataset.cat] = parseFloat(input.value) || 0;
        });

        StorageService.saveBudgets({ overall, categories });
        this.showToast('Monthly budgets saved successfully!', 'success');
        this.renderDashboard();
      };
    }
  },

  /* ==========================================================================
     DETAIL VIEW MODAL
     ========================================================================== */
  openDetailModal(id) {
    const expense = StorageService.getExpenseById(id);
    if (!expense) return;

    AppState.activeDetailExpenseId = id;
    const modal = document.getElementById('modal-expense-detail');
    if (!modal) return;

    document.getElementById('detail-store-name').innerText = expense.store;
    document.getElementById('detail-amount').innerText = StorageService.formatCurrency(expense.amount);
    document.getElementById('detail-date').innerText = expense.date;
    document.getElementById('detail-category').innerText = expense.category;
    document.getElementById('detail-note').innerText = expense.note || 'No notes added.';

    const receiptBox = document.getElementById('detail-receipt-container');
    if (receiptBox) {
      if (expense.receiptData) {
        receiptBox.style.display = 'block';
        if (expense.receiptType === 'application/pdf') {
          receiptBox.innerHTML = `
            <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: var(--radius-md);">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📄</div>
              <p><strong>Attached PDF Document:</strong> ${expense.receiptName || 'receipt.pdf'}</p>
              <a href="${expense.receiptData}" download="${expense.receiptName || 'receipt.pdf'}" class="btn btn-primary btn-sm" style="margin-top: 0.5rem;">📥 Download PDF Receipt</a>
            </div>
          `;
        } else {
          receiptBox.innerHTML = `
            <div class="detail-receipt-viewer">
              <img src="${expense.receiptData}" alt="Receipt">
            </div>
            <div style="text-align: right; margin-top: 0.4rem;">
              <a href="${expense.receiptData}" target="_blank" class="btn btn-outline btn-sm">🔍 Open Full Image</a>
            </div>
          `;
        }
      } else {
        receiptBox.style.display = 'none';
      }
    }

    document.getElementById('btn-detail-edit').onclick = () => this.editExpense(expense.id);
    document.getElementById('btn-detail-delete').onclick = () => this.deleteExpense(expense.id);

    modal.classList.add('open');
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : (type === 'danger' ? '❌' : (type === 'warning' ? '⚠️' : 'ℹ️'));
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }
};
