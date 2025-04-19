let pdfDoc = null;

// Handle PDF Upload
document.getElementById("pdfInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file || file.type !== "application/pdf") return;

  const reader = new FileReader();
  reader.onload = function () {
    const typedArray = new Uint8Array(this.result);
    pdfjsLib.getDocument(typedArray).promise.then(pdf => {
      pdfDoc = pdf;
      alert("PDF loaded! You can now choose to download all pages or a range.");
    });
  };
  reader.readAsArrayBuffer(file);
});

// Convert and download specific page as image
async function renderPageAsImage(pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;

  return new Promise(resolve => {
    canvas.toBlob(blob => {
      resolve({ blob, pageNum });
    }, "image/png");
  });
}

// Download all pages
async function downloadAllPages() {
  if (!pdfDoc) return alert("Please upload a PDF first.");

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const { blob, pageNum } = await renderPageAsImage(i);
    saveAs(blob, `page-${pageNum}.png`);
  }
}

// Download specific range
async function downloadPageRange() {
  if (!pdfDoc) return alert("Please upload a PDF first.");

  const start = parseInt(document.getElementById("startPage").value);
  const end = parseInt(document.getElementById("endPage").value);

  if (isNaN(start) || isNaN(end) || start < 1 || end > pdfDoc.numPages || start > end) {
    return alert("Invalid range!");
  }

  for (let i = start; i <= end; i++) {
    const { blob, pageNum } = await renderPageAsImage(i);
    saveAs(blob, `page-${pageNum}.png`);
  }
}

// Image to PDF
async function convertImagesToPDF() {
  const input = document.getElementById("imageInput");
  const files = input.files;

  if (!files.length) return alert("Please select image files.");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  for (let i = 0; i < files.length; i++) {
    const imgData = await readFileAsDataURL(files[i]);
    const img = new Image();
    img.src = imgData;

    await new Promise(resolve => {
      img.onload = () => {
        const width = pdf.internal.pageSize.getWidth();
        const height = (img.height * width) / img.width;
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, width, height);
        resolve();
      };
    });
  }

  pdf.save("images_to_pdf.pdf");
}

function readFileAsDataURL(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}
