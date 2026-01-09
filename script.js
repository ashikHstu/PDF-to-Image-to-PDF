const { PDFDocument } = PDFLib;
const { jsPDF } = window.jspdf;

/* ---------- PDF MERGER ---------- */
async function mergePDFs() {
  const f1 = document.getElementById("mergePdf1").files[0];
  const f2 = document.getElementById("mergePdf2").files[0];

  if (!f1 || !f2) return alert("Select two PDFs");

  const pdf1 = await PDFDocument.load(await f1.arrayBuffer());
  const pdf2 = await PDFDocument.load(await f2.arrayBuffer());

  const merged = await PDFDocument.create();

  const p1 = await merged.copyPages(pdf1, pdf1.getPageIndices());
  const p2 = await merged.copyPages(pdf2, pdf2.getPageIndices());

  [...p1, ...p2].forEach(p => merged.addPage(p));

  downloadPDF(await merged.save(), "merged.pdf");
}

/* ---------- PDF SPLITTER ---------- */
async function splitPDF() {
  const file = document.getElementById("splitPdf").files[0];
  const s = +document.getElementById("splitStart").value;
  const e = +document.getElementById("splitEnd").value;

  if (!file || !s || !e || s > e) return alert("Invalid range");

  const pdf = await PDFDocument.load(await file.arrayBuffer());
  if (e > pdf.getPageCount()) return alert("Page out of range");

  const newPdf = await PDFDocument.create();
  for (let i = s - 1; i < e; i++) {
    const [p] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(p);
  }

  const link = document.getElementById("splitDownload");
  link.href = URL.createObjectURL(new Blob([await newPdf.save()], { type: "application/pdf" }));
  link.download = `${file.name.replace(".pdf","")}_${s}-${e}.pdf`;
  link.classList.remove("hidden");
}

/* ---------- PDF → IMAGE ---------- */
async function downloadPDFImages() {
  const file = document.getElementById("pdfToImageInput").files[0];
  if (!file) return alert("Upload PDF");

  const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
  const s = +document.getElementById("imgStart").value || 1;
  const e = +document.getElementById("imgEnd").value || pdf.numPages;

  for (let i = s; i <= e; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    canvas.toBlob(b => downloadBlob(b, `page_${i}.png`));
  }
}

/* ---------- IMAGE → PDF ---------- */
async function imagesToPDF() {
  const files = document.getElementById("imageInput").files;
  if (!files.length) return alert("Select images");

  const pdf = new jsPDF();

  for (let i = 0; i < files.length; i++) {
    const img = await fileToImage(files[i]);
    if (i) pdf.addPage();
    pdf.addImage(img, "JPEG", 10, 10, 190, 0);
  }
  pdf.save("images.pdf");
}

/* ---------- HELPERS ---------- */
function downloadPDF(bytes, name) {
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), name);
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

function fileToImage(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });
}
