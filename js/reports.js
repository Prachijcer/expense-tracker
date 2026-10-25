/**
 * SpendLens - Monthly Category Reports & Month-over-Month Comparison Engine
 * Computes category distributions, percentage shares, and fair partial-month comparisons.
 */

const ReportsService = {
  /**
   * Get list of unique Year-Months (YYYY-MM) present in records, sorted newest first
   */
  getAvailableMonths(expenses) {
    const monthsSet = new Set();
    expenses.forEach(e => {
      if (e.date && e.date.length >= 7) {
        monthsSet.add(e.date.substring(0, 7));
      }
    });

    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentYm);

    return Array.from(monthsSet).sort().reverse();
  },

  /**
   * Aggregate spending by category for a specific month (YYYY-MM)
   */
  getMonthlyCategoryBreakdown(expenses, yearMonth) {
    const monthlyExpenses = expenses.filter(e => e.date && e.date.startsWith(yearMonth));
    const totalSpent = monthlyExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const categoryMap = {};
    DEFAULT_CATEGORIES.forEach(cat => {
      categoryMap[cat.name] = {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        amount: 0,
        count: 0,
        percentage: 0
      };
    });

    monthlyExpenses.forEach(e => {
      const catName = e.category || 'Other';
      if (!categoryMap[catName]) {
        categoryMap[catName] = {
          name: catName,
          icon: '📦',
          color: '#64748b',
          amount: 0,
          count: 0,
          percentage: 0
        };
      }
      categoryMap[catName].amount += parseFloat(e.amount || 0);
      categoryMap[catName].count += 1;
    });

    const result = Object.values(categoryMap).map(cat => ({
      ...cat,
      amount: Math.round(cat.amount * 100) / 100,
      percentage: totalSpent > 0 ? Math.round((cat.amount / totalSpent) * 1000) / 10 : 0
    }));

    // Sort by amount descending
    result.sort((a, b) => b.amount - a.amount);

    return {
      yearMonth,
      totalSpent: Math.round(totalSpent * 100) / 100,
      transactionCount: monthlyExpenses.length,
      categories: result
    };
  },

  /**
   * Compute Month-over-Month Comparison with fair partial-month window
   * e.g., comparing Oct 1-22 against Sep 1-22
   */
  computeMonthOverMonth(expenses, currentMonthYm, previousMonthYm) {
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonthInProgress = (currentMonthYm === currentMonthPrefix);

    const maxDay = isCurrentMonthInProgress ? now.getDate() : 31;

    // Filter current month (up to maxDay)
    const currentExpenses = expenses.filter(e => {
      if (!e.date || !e.date.startsWith(currentMonthYm)) return false;
      const day = parseInt(e.date.split('-')[2], 10);
      return day <= maxDay;
    });

    // Filter previous month (same exact number of elapsed days for fair apples-to-apples!)
    const previousSamePeriodExpenses = expenses.filter(e => {
      if (!e.date || !e.date.startsWith(previousMonthYm)) return false;
      const day = parseInt(e.date.split('-')[2], 10);
      return day <= maxDay;
    });

    // Full previous month (for overall baseline)
    const previousFullMonthExpenses = expenses.filter(e => e.date && e.date.startsWith(previousMonthYm));

    const currentPeriodTotal = currentExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const previousPeriodTotal = previousSamePeriodExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const previousFullTotal = previousFullMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const diff = currentPeriodTotal - previousPeriodTotal;
    const absDiff = Math.abs(diff);

    let percentageChange = 0;
    if (previousPeriodTotal > 0) {
      percentageChange = Math.round((diff / previousPeriodTotal) * 1000) / 10;
    }

    const fmtDiff = StorageService.formatCurrency(absDiff);
    const fmtCur = StorageService.formatCurrency(currentPeriodTotal);

    // Friendly, neutral alert message
    let alertMessage = '';
    let alertType = 'neutral'; // 'favorable', 'unfavorable', 'neutral'

    if (previousPeriodTotal === 0 && currentPeriodTotal === 0) {
      alertMessage = 'No spending recorded in either month for this period.';
    } else if (previousPeriodTotal === 0) {
      alertMessage = `You spent ${fmtCur} this month (no spending recorded for previous month).`;
    } else if (Math.abs(diff) < 0.01) {
      alertMessage = 'Your spending is exactly on par with the same period last month.';
    } else if (diff < 0) {
      alertMessage = `You spent ${fmtDiff} less than the same period last month (${Math.abs(percentageChange)}% lower).`;
      alertType = 'favorable';
    } else {
      alertMessage = `You spent ${fmtDiff} more than the same period last month (+${percentageChange}% higher).`;
      alertType = 'unfavorable';
    }

    // Category-by-category comparison
    const categoryComparisons = DEFAULT_CATEGORIES.map(cat => {
      const curCatSum = currentExpenses
        .filter(e => (e.category || 'Other') === cat.name)
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      const prevCatSum = previousSamePeriodExpenses
        .filter(e => (e.category || 'Other') === cat.name)
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      const catDiff = curCatSum - prevCatSum;
      let catPct = 0;
      if (prevCatSum > 0) {
        catPct = Math.round((catDiff / prevCatSum) * 1000) / 10;
      }

      return {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        currentAmount: Math.round(curCatSum * 100) / 100,
        previousAmount: Math.round(prevCatSum * 100) / 100,
        diff: Math.round(catDiff * 100) / 100,
        pct: catPct
      };
    });

    return {
      currentMonthYm,
      previousMonthYm,
      maxDayCompared: maxDay,
      isPartialMonth: isCurrentMonthInProgress,
      dateRangeLabel: isCurrentMonthInProgress
        ? `Days 1–${maxDay} of both months (Fair Apples-to-Apples Window)`
        : `Full month comparison`,
      currentPeriodTotal: Math.round(currentPeriodTotal * 100) / 100,
      previousPeriodTotal: Math.round(previousPeriodTotal * 100) / 100,
      previousFullTotal: Math.round(previousFullTotal * 100) / 100,
      diff: Math.round(diff * 100) / 100,
      percentageChange,
      alertMessage,
      alertType,
      categoryComparisons
    };
  },

  formatMonthName(yearMonth) {
    if (!yearMonth) return '';
    const [y, m] = yearMonth.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
};
