import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const COLUMNS = ["Rank", "Callsign", "Name", "Discord", "Driver Level", "Certifications", "Since"];

function postRow(post) {
  const filled = !!post.userId;
  return [
    post.rank || "",
    post.callsign || "",
    filled ? (post.name || "") : "Vacant",
    filled ? (post.discordUsername ? `@${post.discordUsername}` : post.userId) : "",
    post.driverLevel || "",
    (post.certifications || []).join(", "),
    post.since || "",
  ];
}

// Client-side PDF export of the current roster — one table per
// sub-category, grouped under its category heading, in department order.
// Runs entirely in the browser so it always reflects exactly what's on
// screen, including unsaved edits, with no server round trip needed.
export function exportRosterPdf(departmentName, sections) {
  const doc = new jsPDF({ orientation: "landscape" });
  let y = 16;

  doc.setFontSize(18);
  doc.text(departmentName || "Roster", 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Exported ${new Date().toLocaleString()}`, 14, y);
  doc.setTextColor(0);
  y += 8;

  for (const section of sections) {
    for (const group of section.groups || []) {
      const rows = (group.ranks || []).map(postRow);
      if (!rows.length) continue;

      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 16;
      }

      doc.setFontSize(13);
      doc.text(group.name ? `${section.name} — ${group.name}` : section.name, 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [COLUMNS],
        body: rows,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [23, 26, 33], textColor: 255 },
        theme: "striped",
      });
      y = doc.lastAutoTable.finalY + 12;
    }
  }

  const safeName = (departmentName || "roster").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${safeName}-roster.pdf`);
}
