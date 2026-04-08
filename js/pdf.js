/* ====================================================
   FITNESSIFY AI — PDF Report Generator
   Uses jsPDF (CDN) to generate downloadable wellness reports
   ==================================================== */

const PdfManager = (() => {

  function download(reportData, user) {
    if (!reportData) { showToast('No report available to download.', 'error'); return; }

    if (typeof window.jspdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => generatePDF(reportData, user);
      script.onerror = () => { showToast('PDF library unavailable. Saving text file.', 'warning'); downloadAsText(reportData, user); };
      document.head.appendChild(script);
    } else {
      generatePDF(reportData, user);
    }
  }

  function generatePDF(reportData, user) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      let y = 0;

      const PRIMARY = [108, 99, 255], ACCENT = [0, 217, 167], DARK = [26, 26, 46];
      const GREY = [107, 114, 128], LIGHT = [245, 245, 255], WHITE = [255, 255, 255];

      function checkPage(need = 20) { if (y + need > H - 20) { doc.addPage(); y = 20; } }

      // Cover header
      doc.setFillColor(...PRIMARY);
      doc.rect(0, 0, W, 70, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(...WHITE);
      doc.text('Fitnessify AI', 20, 30);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(210, 208, 255);
      doc.text('Health that fits your life, not the other way around.', 20, 40);
      doc.setFillColor(...ACCENT);
      doc.roundedRect(20, 50, 65, 9, 2, 2, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE);
      doc.text('Personalized Wellness Report', 23, 56);
      y = 85;

      doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
      doc.text(`${user.name}'s Wellness Report`, 20, y); y += 9;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}`, 20, y);
      y += 14;

      // Overall score bar
      const score = reportData.score?.overall || 70;
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
      doc.text(`Wellness Score: ${score}/100`, 20, y); y += 7;
      doc.setFillColor(...LIGHT); doc.roundedRect(20, y, W-40, 10, 2, 2, 'F');
      doc.setFillColor(...PRIMARY); doc.roundedRect(20, y, ((score/100)*(W-40)), 10, 2, 2, 'F');
      y += 16;

      // Score breakdown
      const breakdown = [['Hydration', reportData.score?.hydration||0,'💧'],['Nutrition', reportData.score?.nutrition||0,'🥗'],['Movement', reportData.score?.movement||0,'🏃'],['Sleep', reportData.score?.sleep||0,'😴'],['Stress', reportData.score?.stress||0,'🧘']];
      breakdown.forEach(([label, val, icon]) => {
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
        doc.text(`${icon} ${label}`, 20, y); doc.text(`${val}%`, W-25, y);
        doc.setFillColor(...LIGHT); doc.roundedRect(55, y-4, W-80, 5, 1, 1, 'F');
        doc.setFillColor(...ACCENT); doc.roundedRect(55, y-4, ((val/100)*(W-80)), 5, 1, 1, 'F');
        y += 9;
      });
      y += 6;

      // Summary
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
      doc.text("Vita's Assessment:", 20, y); y += 6;
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...GREY);
      const sumLines = doc.splitTextToSize(`"${reportData.summary}"`, W-40);
      doc.text(sumLines, 20, y); y += (sumLines.length * 4.5) + 10;

      // Sections
      (reportData.sections || []).forEach(section => {
        checkPage(40);
        doc.setFillColor(...PRIMARY); doc.roundedRect(20, y, W-40, 11, 2, 2, 'F');
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...WHITE);
        doc.text(`${section.icon} ${section.title}  (Priority: ${section.priority}/10)`, 24, y+7.5);
        y += 16;

        doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GREY);
        const sLines = doc.splitTextToSize(section.summary, W-40);
        doc.text(sLines, 20, y); y += (sLines.length * 4.5) + 5;

        (section.recommendations || []).forEach((rec, i) => {
          checkPage(28);
          doc.setFillColor(...LIGHT); doc.roundedRect(20, y, W-40, 7, 1.5, 1.5, 'F');
          doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
          doc.text(`${i+1}. ${rec.title}`, 24, y+5); y += 10;
          doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
          const rLines = doc.splitTextToSize(rec.description, W-44);
          doc.text(rLines, 24, y); y += (rLines.length * 4.2);
          if (rec.when) { doc.setTextColor(...PRIMARY); doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.text(`When: ${rec.when}`, 24, y+3); y += 5; }
          doc.setTextColor(...GREY); doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
          doc.text(`Effort: ${rec.effort||'Easy'}  |  Impact: ${rec.impact||'High'}`, 24, y+2); y += 8;
        });
        y += 5;
      });

      // 4-Week Plan
      if (reportData.action_plan) {
        checkPage(50);
        doc.setFillColor(...ACCENT); doc.roundedRect(20, y, W-40, 11, 2, 2, 'F');
        doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...WHITE);
        doc.text('4-Week Action Plan', 24, y+7.5); y += 16;

        reportData.action_plan.forEach(w => {
          checkPage(22);
          doc.setFillColor(...LIGHT); doc.roundedRect(20, y, W-40, 18, 2, 2, 'F');
          doc.setFillColor(...PRIMARY); doc.roundedRect(20, y, 18, 18, 2, 2, 'F');
          doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(...WHITE);
          doc.text(`${w.week}`, 24, y+12);
          doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
          doc.text(w.focus, 43, y+7);
          doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...GREY);
          const aLines = doc.splitTextToSize(w.action, W-68);
          doc.text(aLines, 43, y+12); y += 23;
        });
      }

      // Footer
      const pages = doc.getNumberOfPages();
      for (let i=1; i<=pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...GREY);
        doc.text('Fitnessify AI — Not medical advice. Consult a healthcare provider for medical concerns.', 20, H-8);
        doc.text(`Page ${i} / ${pages}`, W-25, H-8);
      }

      const filename = `Fitnessify_${user.name.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      showToast('Wellness report downloaded! 📄', 'success');
    } catch(err) {
      console.error('PDF error:', err);
      showToast('PDF failed. Saving as text.', 'warning');
      downloadAsText(reportData, user);
    }
  }

  function downloadAsText(reportData, user) {
    let text = `FITNESSIFY AI — WELLNESS REPORT\n${'='.repeat(50)}\nName: ${user.name}\nDate: ${new Date().toLocaleDateString()}\n\nSCORE: ${reportData.score?.overall||'N/A'}/100\n\nSUMMARY:\n${reportData.summary}\n\n`;
    (reportData.sections||[]).forEach(s => {
      text += `\n${s.icon} ${s.title.toUpperCase()}\n${'-'.repeat(40)}\n${s.summary}\n\n`;
      (s.recommendations||[]).forEach((r,i) => { text += `${i+1}. ${r.title}\n   ${r.description}\n   When: ${r.when||'N/A'} | ${r.effort||'Easy'} | ${r.impact||'High'} Impact\n\n`; });
    });
    if (reportData.motivational_note) text += `\n${'='.repeat(50)}\n${reportData.motivational_note}\n`;
    const blob = new Blob([text], { type:'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `Fitnessify_${user.name.replace(/\s+/g,'_')}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return { download };
})();
