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

/* ---------- PDF TO TEXT & IMAGES ---------- */
async function extractPDFContent() {
  const file = document.getElementById("pdfToTextImageInput").files[0];
  if (!file) return alert("Upload PDF");

  const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
  const zip = new JSZip();

  // Extract text from all
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    const pageText = text.items.map(item => item.str).join(" ");
    fullText += `Page ${i}:\n${pageText}\n\n`;
  }

  // Add text file to zip
  zip.file("extracted_text.txt", fullText);

  // Extract images from all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

    // Convert canvas to blob and add to zip
    canvas.toBlob(blob => {
      zip.file(`page_${i}.png`, blob);
    });
  }

  // Generate and download zip after all images are added
  setTimeout(async () => {
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const link = document.getElementById("pdfContentDownload");
    link.href = URL.createObjectURL(zipBlob);
    link.download = `${file.name.replace(".pdf","")}_content.zip`;
    link.classList.remove("hidden");
  }, 1000);
}

/* ---------- PDF TO LATEX ---------- */
async function convertPDFToLatex() {
  const file = document.getElementById("pdfToLatexInput").files[0];
  const s = +document.getElementById("latexStart").value || 1;
  const e = +document.getElementById("latexEnd").value || 1;

  if (!file) return alert("Upload PDF");
  if (s < 1 || e < 1 || s > e) return alert("Invalid page range");

  const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
  if (e > pdf.numPages) return alert(`PDF has only ${pdf.numPages} pages`);

  const zip = new JSZip();
  const projectName = file.name.replace(".pdf", "") + "_latex";

  // Create main LaTeX document
  let latexContent = `\\documentclass[12pt]{article}\n`;
  latexContent += `\\usepackage{graphicx}\n`;
  latexContent += `\\usepackage{geometry}\n`;
  latexContent += `\\geometry{margin=1in}\n`;
  latexContent += `\\usepackage{hyperref}\n`;
  latexContent += `\\usepackage{caption}\n`;
  latexContent += `\\usepackage{subcaption}\n`;
  latexContent += `\\usepackage{float}\n`;
  latexContent += `\\usepackage{setspace}\n`;
  latexContent += `\\onehalfspacing\n`;
  latexContent += `\n`;
  latexContent += `\\title{${file.name.replace(".pdf", "")}}\n`;
  latexContent += `\\author{Converted from PDF}\n`;
  latexContent += `\\date{\\today}\n`;
  latexContent += `\n`;
  latexContent += `\\begin{document}\n`;
  latexContent += `\\maketitle\n`;
  latexContent += `\\tableofcontents\n`;
  latexContent += `\\newpage\n`;
  latexContent += `\n`;

  // Process each page
  for (let i = s; i <= e; i++) {
    const page = await pdf.getPage(i);
    
    // Extract text content
    const textContent = await page.getTextContent();
    let pageText = textContent.items.map(item => item.str).join(" ");
    
    // Clean up text
    pageText = pageText.replace(/&/g, "\\&");
    pageText = pageText.replace(/%/g, "\\%");
    pageText = pageText.replace(/\$/g, "\\$");
    pageText = pageText.replace(/#/g, "\\#");
    pageText = pageText.replace(/_/g, "\\_");
    pageText = pageText.replace(/\^/g, "\\^{}");
    pageText = pageText.replace(/{/g, "\\{");
    pageText = pageText.replace(/}/g, "\\}");
    pageText = pageText.replace(/~/g, "\\~{}");
    pageText = pageText.replace(/\\/g, "\\textbackslash{}");
    
    // Add page section
    latexContent += `\\section*{Page ${i}}\n`;
    latexContent += `\\addcontentsline{toc}{section}{Page ${i}}\n`;
    latexContent += `\n`;
    
    if (pageText.trim()) {
      latexContent += `${pageText}\n`;
      latexContent += `\n`;
    }
    
    // Extract and add image
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

    canvas.toBlob(async (blob) => {
      const imageName = `page_${i}.png`;
      zip.file(`images/${imageName}`, blob);
      
      // Add image to LaTeX content
      latexContent += `\\begin{figure}[H]\n`;
      latexContent += `\\centering\n`;
      latexContent += `\\includegraphics[width=\\textwidth]{images/${imageName}}\n`;
      latexContent += `\\caption{Page ${i} from original PDF}\n`;
      latexContent += `\\label{fig:page_${i}}\n`;
      latexContent += `\\end{figure}\n`;
      latexContent += `\n`;
      
      // Add page break if not the last page
      if (i === e) {
        latexContent += `\\end{document}\n`;
        
        // Add all files to zip
        zip.file(`${projectName}.tex`, latexContent);
        zip.file("README.md", `# ${projectName}\n\nThis LaTeX project was generated from ${file.name}.\n\nTo compile:\n1. Run 'pdflatex ${projectName}.tex' multiple times\n2. Or use Overleaf.com to upload and compile\n\nThe generated PDF should closely resemble the original.`);
        
        // Generate and download zip
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.getElementById("latexDownload");
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${projectName}.zip`;
        link.classList.remove("hidden");
      }
    });
  }
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
