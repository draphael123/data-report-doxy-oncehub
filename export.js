// Export Manager
const ExportManager = {
    async exportToPDF() {
        // Check if data is loaded
        if (!window.filteredData || filteredData.length === 0) {
            showNotification('⚠️ No data available to export', 'warning');
            return;
        }
        
        // Using jsPDF and html2canvas
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showNotification('📥 Loading PDF library... Please try again in a moment.', 'warning');
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Add title
        doc.setFontSize(20);
        doc.setTextColor(99, 102, 241);
        doc.text('Doxy & OnceHub Reports', pageWidth / 2, 15, { align: 'center' });
        
        // Add metadata
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
        doc.text(`Tab: ${currentTab}`, 14, 30);
        doc.text(`Total Rows: ${filteredData.length}`, 14, 35);
        
        // Add analytics summary if exists
        let yPos = 45;
        const analyticsSection = document.getElementById('analyticsSection');
        if (analyticsSection && analyticsSection.classList.contains('visible')) {
            try {
                const canvas = await html2canvas(analyticsSection, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth - 28;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                if (imgHeight < pageHeight - yPos - 20) {
                    doc.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
                    yPos += imgHeight + 10;
                }
            } catch (e) {
                console.warn('Could not capture analytics:', e);
            }
        }
        
        // Add charts if exist
        const chartsSection = document.getElementById('chartsSection');
        if (chartsSection && chartsSection.classList.contains('visible')) {
            if (yPos > pageHeight - 100) {
                doc.addPage();
                yPos = 20;
            }
            
            try {
                const canvas = await html2canvas(chartsSection, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth - 28;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                if (imgHeight > pageHeight - yPos - 20) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
                yPos += imgHeight + 10;
            } catch (e) {
                console.warn('Could not capture charts:', e);
            }
        }
        
        // Add table
        if (yPos > pageHeight - 60 || (analyticsSection && analyticsSection.classList.contains('visible'))) {
            doc.addPage();
            yPos = 20;
        }
        
        // Get table data
        const columns = Object.keys(filteredData[0] || {}).filter(col => {
            return filteredData.some(row => row[col] != null && row[col] !== '');
        }).map(col => cleanColumnName(col));
        
        const rows = filteredData.slice(0, 100).map(row => 
            Object.keys(row).filter(col => filteredData.some(r => r[col] != null && r[col] !== ''))
                .map(col => String(row[col] || ''))
        );
        
        doc.autoTable({
            head: [columns],
            body: rows,
            startY: yPos,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [99, 102, 241] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { top: 10, right: 14, bottom: 10, left: 14 }
        });
        
        // Save
        doc.save(`${currentTab}_${new Date().toISOString().split('T')[0]}.pdf`);
        showNotification('✅ PDF exported successfully!');
    },
    
    exportToExcel() {
        // Check if data is loaded
        if (!window.filteredData || filteredData.length === 0) {
            showNotification('⚠️ No data available to export', 'warning');
            return;
        }
        
        // Using SheetJS
        if (!window.XLSX) {
            // Fallback to CSV
            this.exportToCSV();
            return;
        }
        
        const wb = XLSX.utils.book_new();
        
        // Add current tab data
        const ws = XLSX.utils.json_to_sheet(filteredData);
        XLSX.utils.book_append_sheet(wb, ws, currentTab.substring(0, 31));
        
        // Add all tabs if available
        Object.keys(allData).forEach(tabName => {
            if (tabName !== currentTab && allData[tabName].length > 0) {
                const ws = XLSX.utils.json_to_sheet(allData[tabName]);
                XLSX.utils.book_append_sheet(wb, ws, tabName.substring(0, 31));
            }
        });
        
        XLSX.writeFile(wb, `Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
        showNotification('✅ Excel file exported successfully!');
    },
    
    exportToCSV() {
        // Check if data is loaded
        if (!window.filteredData || filteredData.length === 0) {
            showNotification('⚠️ No data available to export', 'warning');
            return;
        }
        
        const columns = Object.keys(filteredData[0] || {}).filter(col => {
            return filteredData.some(row => row[col] != null && row[col] !== '');
        });
        
        // Create CSV content
        let csv = columns.map(col => `"${cleanColumnName(col)}"`).join(',') + '\n';
        
        filteredData.forEach(row => {
            const rowData = columns.map(col => {
                const val = row[col];
                if (val == null) return '';
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csv += rowData.join(',') + '\n';
        });
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${currentTab}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        showNotification('✅ CSV exported successfully!');
    },
    
    async exportCharts() {
        if (currentCharts.length === 0) {
            showNotification('⚠️ No charts available to export', 'warning');
            return;
        }
        
        const zip = new JSZip();
        const folder = zip.folder('charts');
        
        for (let i = 0; i < currentCharts.length; i++) {
            const chart = currentCharts[i];
            const canvas = chart.canvas;
            const dataUrl = canvas.toDataURL('image/png');
            const base64Data = dataUrl.split(',')[1];
            folder.file(`chart_${i + 1}.png`, base64Data, { base64: true });
        }
        
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `charts_${new Date().toISOString().split('T')[0]}.zip`;
        link.click();
        showNotification('✅ Charts exported successfully!');
    },
    
    async copyToClipboard() {
        // Check if data is loaded
        if (!window.filteredData || filteredData.length === 0) {
            showNotification('⚠️ No data available to copy', 'warning');
            return;
        }
        
        const columns = Object.keys(filteredData[0] || {}).filter(col => {
            return filteredData.some(row => row[col] != null && row[col] !== '');
        });
        
        // Create tab-separated values
        let text = columns.map(col => cleanColumnName(col)).join('\t') + '\n';
        
        filteredData.forEach(row => {
            const rowData = columns.map(col => String(row[col] || ''));
            text += rowData.join('\t') + '\n';
        });
        
        try {
            await navigator.clipboard.writeText(text);
            showNotification('✅ Data copied to clipboard!');
        } catch (err) {
            showNotification('⚠️ Failed to copy to clipboard', 'error');
        }
    }
};

// Modal management
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

// Make functions globally available
window.closeModal = closeModal;
window.openModal = openModal;

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Close modals on click outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};


