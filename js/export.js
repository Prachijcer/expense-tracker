/**
 * SpendLens - Export, Backup & Restore
 * CSV generation and JSON full backup/restore handling.
 */

const ExportService = {
  /**
   * Export expenses array to formatted CSV and trigger download
   */
  exportToCSV(expenses) {
    if (!expenses || expenses.length === 0) {
      alert('No expense records to export.');
      return;
    }

    const headers = [
      'Transaction ID',
      'Date',
      'Store / Provider',
      'Category',
      'Amount ($)',
      'Receipt Attached',
      'Notes',
      'Created Timestamp'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = expenses.map(e => [
      escapeCsv(e.id),
      escapeCsv(e.date),
      escapeCsv(e.store),
      escapeCsv(e.category),
      parseFloat(e.amount || 0).toFixed(2),
      e.receiptData ? 'Yes' : 'No',
      escapeCsv(e.note || ''),
      escapeCsv(e.createdAt || '')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `spendlens_expenses_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Export all data (expenses + budgets) as JSON backup
   */
  exportBackupJSON() {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      expenses: StorageService.getExpenses(),
      budgets: StorageService.getBudgets()
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `spendlens_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Import and restore data from JSON backup file
   */
  async restoreFromJSON(file) {
    if (!file) throw new Error('No file selected.');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.expenses || !Array.isArray(parsed.expenses)) {
            throw new Error('Invalid backup file format: missing expenses list.');
          }

          StorageService.saveExpenses(parsed.expenses);
          if (parsed.budgets) {
            StorageService.saveBudgets(parsed.budgets);
          }
          resolve({ count: parsed.expenses.length });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    });
  }
};
