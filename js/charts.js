/**
 * SpendLens - Interactive Custom HTML5 Canvas Charts
 * 100% self-contained, responsive, formatted in selected currency (₹, $, €, etc.).
 */

const ChartRenderer = {
  /**
   * Render an interactive Donut Chart for category breakdown
   */
  renderCategoryDonut(canvasId, categoryData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const total = categoryData.reduce((sum, item) => sum + item.amount, 0);

    if (total <= 0 || categoryData.length === 0) {
      // Empty State
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No expenses recorded for this period', width / 2, height / 2);
      return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(centerX, centerY) - 15;
    const innerRadius = outerRadius * 0.62;

    let startAngle = -Math.PI / 2;

    // Draw slices
    categoryData.forEach(item => {
      const sliceAngle = (item.amount / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = item.color;
      ctx.fill();

      // White slice separator
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      startAngle = endAngle;
    });

    // Draw Center summary using active currency
    const formattedTotal = StorageService.formatCurrency(total);
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(formattedTotal, centerX, centerY - 6);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('TOTAL SPENT', centerX, centerY + 14);
  },

  /**
   * Render side-by-side Bar Chart comparing This Month vs Last Month
   */
  renderMonthComparison(canvasId, lastMonthTotal, thisMonthTotal, lastMonthName = 'Last Month', thisMonthName = 'This Month') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 35, right: 25, bottom: 45, left: 25 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = Math.max(lastMonthTotal, thisMonthTotal, 100) * 1.18;

    const barWidth = Math.min(chartWidth / 4, 80);
    const spacing = chartWidth / 3;

    // Bar 1: Last Month
    const bar1X = padding.left + spacing - barWidth / 2;
    const bar1Height = (lastMonthTotal / maxVal) * chartHeight;
    const bar1Y = padding.top + (chartHeight - bar1Height);

    // Bar 2: This Month
    const bar2X = padding.left + spacing * 2 - barWidth / 2;
    const bar2Height = (thisMonthTotal / maxVal) * chartHeight;
    const bar2Y = padding.top + (chartHeight - bar2Height);

    // Baseline axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(width - padding.right, padding.top + chartHeight);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw Bar 1 (Last Month)
    ctx.fillStyle = '#94a3b8';
    this.roundRect(ctx, bar1X, bar1Y, barWidth, bar1Height, 6);
    ctx.fill();

    // Bar 1 Value with active currency
    ctx.fillStyle = '#475569';
    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(StorageService.formatCurrency(lastMonthTotal), bar1X + barWidth / 2, bar1Y - 8);

    // Bar 1 Label
    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(lastMonthName, bar1X + barWidth / 2, padding.top + chartHeight + 20);

    // Draw Bar 2 (This Month)
    ctx.fillStyle = '#4f46e5';
    this.roundRect(ctx, bar2X, bar2Y, barWidth, bar2Height, 6);
    ctx.fill();

    // Bar 2 Value with active currency
    ctx.fillStyle = '#312e81';
    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(StorageService.formatCurrency(thisMonthTotal), bar2X + barWidth / 2, bar2Y - 8);

    // Bar 2 Label
    ctx.fillStyle = '#1e1b4b';
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(thisMonthName, bar2X + barWidth / 2, padding.top + chartHeight + 20);
  },

  /**
   * Helper to draw rounded rectangle on Canvas
   */
  roundRect(ctx, x, y, width, height, radius) {
    if (height <= 0) return;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.closePath();
  }
};
