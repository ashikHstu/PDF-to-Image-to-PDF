const fileInput = document.getElementById("pdfFile");
const startPageInput = document.getElementById("startPage");
const endPageInput = document.getElementById("endPage");
const splitBtn = document.getElementById("splitBtn");
const downloadLink = document.getElementById("downloadLink");

splitBtn.addEventListener("click", async () => {
    if (!fileInput.files.length) {
        alert("Please upload a PDF file");
        return;
    }

    const startPage = parseInt(startPageInput.value);
    const endPage = parseInt(endPageInput.value);

    if (!startPage || !endPage || startPage > endPage) {
        alert("Please enter a valid page range");
        return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();

    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();

    if (endPage > totalPages) {
        alert(`PDF has only ${totalPages} pages`);
        return;
    }

    const newPdf = await PDFLib.PDFDocument.create();

    for (let i = startPage - 1; i < endPage; i++) {
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);
    }

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const originalName = file.name.replace(".pdf", "");
    downloadLink.href = url;
    downloadLink.download = `${originalName}_pages_${startPage}-${endPage}.pdf`;
    downloadLink.textContent = "Download Split PDF";
    downloadLink.classList.remove("hidden");
});
