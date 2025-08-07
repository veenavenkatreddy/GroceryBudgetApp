const PDFDocument = require('pdfkit');

// Generate budget PDF
exports.generateBudgetPDF = async (budget, items, categorySpending) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject); // Catch PDFKit errors

      // Helper functions
      const formatDate = (date) => new Date(date).toLocaleDateString('en-GB');
      const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

      // Title Page
      doc.fontSize(24).font('Helvetica-Bold').text('Budget Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(18).font('Helvetica').text(budget.name, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12)
        .text(`Period: ${formatDate(budget.period.start)} - ${formatDate(budget.period.end)}`, { align: 'center' })
        .text(`Generated on: ${formatDate(new Date())}`, { align: 'center' });
      doc.moveDown(2);

      // Budget Summary Section
      doc.fontSize(16).font('Helvetica-Bold').text('Budget Summary');
      doc.moveDown(0.5);

      const summaryY = doc.y;
      const boxWidth = 150;
      const boxHeight = 60;
      const spacing = 20;

      // Total Budget
      doc.rect(50, summaryY, boxWidth, boxHeight).stroke();
      doc.fontSize(18).font('Helvetica-Bold')
        .text(formatCurrency(budget.totalLimit), 50, summaryY + 15, { width: boxWidth, align: 'center' });
      doc.fontSize(10).font('Helvetica')
        .text('Total Budget', 50, summaryY + 35, { width: boxWidth, align: 'center' });

      // Amount Spent
      doc.rect(50 + boxWidth + spacing, summaryY, boxWidth, boxHeight).stroke();
      doc.fontSize(18).font('Helvetica-Bold')
        .text(formatCurrency(budget.currentSpent), 50 + boxWidth + spacing, summaryY + 15, { width: boxWidth, align: 'center' });
      doc.fontSize(10).font('Helvetica')
        .text('Amount Spent', 50 + boxWidth + spacing, summaryY + 35, { width: boxWidth, align: 'center' });

      // Remaining
      doc.rect(50 + (boxWidth + spacing) * 2, summaryY, boxWidth, boxHeight).stroke();
      doc.fontSize(18).font('Helvetica-Bold')
        .fillColor(budget.remainingBudget >= 0 ? '#10B981' : '#EF4444')
        .text(formatCurrency(budget.remainingBudget), 50 + (boxWidth + spacing) * 2, summaryY + 15, { width: boxWidth, align: 'center' });
      doc.fillColor('black').fontSize(10).font('Helvetica')
        .text('Remaining', 50 + (boxWidth + spacing) * 2, summaryY + 35, { width: boxWidth, align: 'center' });

      doc.y = summaryY + boxHeight + 30;

      // Progress Bar
      doc.fontSize(12).text(`Budget Usage: ${budget.percentageSpent.toFixed(1)}%`);
      doc.moveDown(0.5);

      const progressY = doc.y;
      const progressWidth = 500;
      const progressHeight = 20;

      doc.rect(50, progressY, progressWidth, progressHeight)
        .fillAndStroke('#E5E7EB', '#E5E7EB');

      const fillWidth = (Math.min(budget.percentageSpent, 100) / 100) * progressWidth;
      const fillColor = budget.percentageSpent > 90 ? '#EF4444' : budget.percentageSpent > 75 ? '#F59E0B' : '#10B981';

      doc.rect(50, progressY, fillWidth, progressHeight)
        .fillAndStroke(fillColor, fillColor);

      doc.y = progressY + progressHeight + 40;

      // Category Breakdown
      if (Object.keys(categorySpending).length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').text('Category Breakdown');
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica-Bold');
        const tableTop = doc.y;
        const col1 = 50, col2 = 250, col3 = 400;
        const rowHeight = 20;

        doc.text('Category', col1, tableTop);
        doc.text('Amount Spent', col2, tableTop);
        doc.text('Percentage', col3, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        doc.font('Helvetica');
        let currentY = tableTop + rowHeight;

        Object.entries(categorySpending).forEach(([category, amount]) => {
          doc.text(category, col1, currentY);
          doc.text(formatCurrency(amount), col2, currentY);
          doc.text(`${((amount / budget.currentSpent) * 100).toFixed(1)}%`, col3, currentY);
          currentY += rowHeight;
        });

        doc.y = currentY + 20;
      }

      // New page for transactions
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Transaction Details');
      doc.moveDown(0.5);

      if (items.length > 0) {
        doc.fontSize(9).font('Helvetica-Bold');
        const itemsTableTop = doc.y;
        const itemCol1 = 50, itemCol2 = 120, itemCol3 = 250, itemCol4 = 350, itemCol5 = 400, itemCol6 = 450;

        doc.text('Date', itemCol1, itemsTableTop);
        doc.text('Item', itemCol2, itemsTableTop);
        doc.text('Category', itemCol3, itemsTableTop);
        doc.text('Qty', itemCol4, itemsTableTop);
        doc.text('Price', itemCol5, itemsTableTop);
        doc.text('Total', itemCol6, itemsTableTop);

        doc.moveTo(50, itemsTableTop + 15).lineTo(550, itemsTableTop + 15).stroke();

        doc.font('Helvetica').fontSize(8);
        let itemCurrentY = itemsTableTop + 20;
        const maxItemsPerPage = 35;
        let itemCount = 0;

        for (const item of items) {
          if (itemCount > 0 && itemCount % maxItemsPerPage === 0) {
            doc.addPage();
            itemCurrentY = 50;
          }

          doc.text(formatDate(item.purchaseDate || item.createdAt), itemCol1, itemCurrentY);
          doc.text(item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name, itemCol2, itemCurrentY);
          doc.text(item.categoryId ? item.categoryId.name : 'Uncategorized', itemCol3, itemCurrentY);
          doc.text(item.quantity || 1, itemCol4, itemCurrentY);
          doc.text(formatCurrency(item.price), itemCol5, itemCurrentY);
          doc.text(formatCurrency(item.price * (item.quantity || 1)), itemCol6, itemCurrentY);

          itemCurrentY += 18;
          itemCount++;
        }
      } else {
        doc.fontSize(12).text('No transactions recorded for this budget period.');
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
