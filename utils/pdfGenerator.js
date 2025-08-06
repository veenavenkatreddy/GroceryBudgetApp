const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const CurrencyHelper = require('./currencyHelper');

// Generate budget PDF
exports.generateBudgetPDF = async (budget, items, categorySpending, userCurrency = 'GBP') => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      // Pipe to buffer
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Helper functions
      const formatDate = (date) => new Date(date).toLocaleDateString('en-GB');
      const formatCurrency = (amount) => CurrencyHelper.format(amount, userCurrency);

      // Title Page
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('Budget Report', { align: 'center' });
      
      doc.moveDown(0.5);
      
      doc.fontSize(18)
         .font('Helvetica')
         .text(budget.name, { align: 'center' });
      
      doc.moveDown(0.5);
      
      doc.fontSize(12)
         .text(`Period: ${formatDate(budget.period.start)} - ${formatDate(budget.period.end)}`, { align: 'center' })
         .text(`Generated on: ${formatDate(new Date())}`, { align: 'center' });
      
      doc.moveDown(2);

      // Budget Summary Section
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Budget Summary');
      
      doc.moveDown(0.5);
      
      // Create summary boxes
      const summaryY = doc.y;
      const boxWidth = 150;
      const boxHeight = 60;
      const spacing = 20;
      
      // Total Budget Box
      doc.rect(50, summaryY, boxWidth, boxHeight)
         .stroke();
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text(formatCurrency(budget.totalLimit), 50, summaryY + 15, { width: boxWidth, align: 'center' });
      doc.fontSize(10)
         .font('Helvetica')
         .text('Total Budget', 50, summaryY + 35, { width: boxWidth, align: 'center' });
      
      // Amount Spent Box
      doc.rect(50 + boxWidth + spacing, summaryY, boxWidth, boxHeight)
         .stroke();
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text(formatCurrency(budget.currentSpent), 50 + boxWidth + spacing, summaryY + 15, { width: boxWidth, align: 'center' });
      doc.fontSize(10)
         .font('Helvetica')
         .text('Amount Spent', 50 + boxWidth + spacing, summaryY + 35, { width: boxWidth, align: 'center' });
      
      // Remaining Box
      doc.rect(50 + (boxWidth + spacing) * 2, summaryY, boxWidth, boxHeight)
         .stroke();
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(budget.remainingBudget >= 0 ? '#10B981' : '#EF4444')
         .text(formatCurrency(budget.remainingBudget), 50 + (boxWidth + spacing) * 2, summaryY + 15, { width: boxWidth, align: 'center' });
      doc.fillColor('black')
         .fontSize(10)
         .font('Helvetica')
         .text('Remaining', 50 + (boxWidth + spacing) * 2, summaryY + 35, { width: boxWidth, align: 'center' });
      
      doc.y = summaryY + boxHeight + 30;
      
      // Progress Bar
      doc.fontSize(12)
         .text(`Budget Usage: ${budget.percentageSpent.toFixed(1)}%`);
      
      doc.moveDown(0.5);
      
      const progressY = doc.y;
      const progressWidth = 500;
      const progressHeight = 20;
      
      // Background
      doc.rect(50, progressY, progressWidth, progressHeight)
         .fillAndStroke('#E5E7EB', '#E5E7EB');
      
      // Progress fill
      const fillWidth = (Math.min(budget.percentageSpent, 100) / 100) * progressWidth;
      const fillColor = budget.percentageSpent > 90 ? '#EF4444' : budget.percentageSpent > 75 ? '#F59E0B' : '#10B981';
      doc.rect(50, progressY, fillWidth, progressHeight)
         .fillAndStroke(fillColor, fillColor);
      
      doc.y = progressY + progressHeight + 40;

      // Category Breakdown
      if (Object.keys(categorySpending).length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Category Breakdown');
        
        doc.moveDown(0.5);
        
        // Table header
        doc.fontSize(10)
           .font('Helvetica-Bold');
        
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 250;
        const col3 = 400;
        const rowHeight = 20;
        
        doc.text('Category', col1, tableTop);
        doc.text('Amount Spent', col2, tableTop);
        doc.text('Percentage', col3, tableTop);
        
        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .stroke();
        
        // Table rows
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

      // Add new page for items
      doc.addPage();
      
      // Items Section
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Transaction Details');
      
      doc.moveDown(0.5);
      
      if (items.length > 0) {
        // Items table header
        doc.fontSize(9)
           .font('Helvetica-Bold');
        
        const itemsTableTop = doc.y;
        const itemCol1 = 50;
        const itemCol2 = 120;
        const itemCol3 = 250;
        const itemCol4 = 350;
        const itemCol5 = 400;
        const itemCol6 = 450;
        const itemCol7 = 500;
        
        doc.text('Date', itemCol1, itemsTableTop);
        doc.text('Item', itemCol2, itemsTableTop);
        doc.text('Category', itemCol3, itemsTableTop);
        doc.text('Qty', itemCol4, itemsTableTop);
        doc.text('Price', itemCol5, itemsTableTop);
        doc.text('Total', itemCol6, itemsTableTop);
        
        doc.moveTo(50, itemsTableTop + 15)
           .lineTo(550, itemsTableTop + 15)
           .stroke();
        
        // Items rows
        doc.font('Helvetica');
        doc.fontSize(8);
        let itemCurrentY = itemsTableTop + 20;
        const maxItemsPerPage = 35;
        let itemCount = 0;
        
        for (const item of items) {
          if (itemCount > 0 && itemCount % maxItemsPerPage === 0) {
            doc.addPage();
            itemCurrentY = 50;
          }
          
          doc.text(formatDate(item.purchaseDate || item.createdAt), itemCol1, itemCurrentY);
          doc.text(item.name.substring(0, 20) + (item.name.length > 20 ? '...' : ''), itemCol2, itemCurrentY);
          doc.text(item.categoryId ? item.categoryId.name : 'Uncategorized', itemCol3, itemCurrentY);
          doc.text(item.quantity || 1, itemCol4, itemCurrentY);
          doc.text(formatCurrency(item.price), itemCol5, itemCurrentY);
          doc.text(formatCurrency(item.price * (item.quantity || 1)), itemCol6, itemCurrentY);
          
          itemCurrentY += 18;
          itemCount++;
        }
        
        if (items.length > 50) {
          doc.moveDown(2);
          doc.fontSize(10)
             .font('Helvetica-Oblique')
             .text(`Showing first 50 transactions out of ${items.length} total.`);
        }
      } else {
        doc.fontSize(12)
           .text('No transactions recorded for this budget period.');
      }

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};