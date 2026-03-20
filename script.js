const form = document.getElementById("form");
const statusMessage = document.getElementById("statusMessage");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const submitButton = form.querySelector('button[type="submit"]');
const downloadPanel = document.getElementById("downloadPanel");
const downloadButton = document.getElementById("downloadButton");
const formatButtons = document.querySelectorAll(".format-btn");
const basePriceInput = document.getElementById("basePrice");
const feeInput = document.getElementById("fee");
const calculatedFee = document.getElementById("calculatedFee");
const BROCHURE_PDF_PATH = "dpl.pdf";
let currentDplId = "";

const summaryMap = {
    name: document.getElementById("summaryName"),
    mobile: document.getElementById("summaryMobile"),
    team: document.getElementById("summaryTeam"),
    role: document.getElementById("summaryRole"),
    basePrice: document.getElementById("summaryBasePrice"),
    fee: document.getElementById("summaryFee")
};

const receiptMap = {
    id: document.getElementById("receiptId"),
    name: document.getElementById("receiptName"),
    mobile: document.getElementById("receiptMobile"),
    team: document.getElementById("receiptTeam"),
    role: document.getElementById("receiptRole"),
    basePrice: document.getElementById("receiptBasePrice"),
    jerseyNumber: document.getElementById("receiptJerseyNumber"),
    fee: document.getElementById("receiptFee")
};

const requiredFields = [
    "play",
    "date",
    "team",
    "name",
    "mobile",
    "age",
    "basePrice",
    "role",
    "jerseyNumber",
    "fee"
];

const GOOGLE_SCRIPT_URL = "PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE";

function readValue(name) {
    const field = form.elements[name];

    if (!field) {
        return "";
    }

    return typeof field.value === "string" ? field.value.trim() : "";
}

function getFormSnapshot() {
    const basePriceValue = Number(readValue("basePrice"));

    return {
        id: currentDplId || "0000",
        name: readValue("name") || "Not entered",
        mobile: readValue("mobile") || "Not entered",
        age: readValue("age") || "Not entered",
        basePrice: Number.isFinite(basePriceValue) && basePriceValue > 0 ? formatCurrency(basePriceValue) : "Not entered",
        play: readValue("play") || "Not selected",
        date: readValue("date") || "Not selected",
        team: readValue("team") || "Not selected",
        role: readValue("role") || "Not selected",
        jerseyNumber: readValue("jerseyNumber") || "Not entered",
        fee: readValue("fee") || "Pending"
    };
}

function generateDplId() {
    const mobile = readValue("mobile").replace(/\D/g, "");
    return `000026${mobile.slice(-4) || "0000"}`;
}

function formatCurrency(amount) {
    return `Rs ${amount.toFixed(2)}`;
}

function updateCalculatedFee() {
    const basePrice = Number(readValue("basePrice"));

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
        feeInput.value = "";
        calculatedFee.textContent = "Enter base price first";
        return;
    }

    const feeAmount = basePrice * 0.25;
    const formattedFee = formatCurrency(feeAmount);

    feeInput.value = formattedFee;
    calculatedFee.textContent = `${formattedFee} registration fee to be paid`;
}

function updateSummary() {
    const snapshot = getFormSnapshot();

    summaryMap.name.textContent = snapshot.name;
    summaryMap.mobile.textContent = snapshot.mobile;
    summaryMap.team.textContent = snapshot.team;
    summaryMap.role.textContent = snapshot.role;
    summaryMap.basePrice.textContent = snapshot.basePrice;
    summaryMap.fee.textContent = snapshot.basePrice;
}

function updateProgress() {
    const completed = requiredFields.filter((fieldName) => readValue(fieldName)).length;
    const percent = Math.round((completed / requiredFields.length) * 100);

    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
}

function populateReceipt() {
    const snapshot = getFormSnapshot();

    Object.entries(receiptMap).forEach(([key, element]) => {
        if (element) {
            element.textContent = snapshot[key];
        }
    });

    if (receiptMap.fee) {
        receiptMap.fee.textContent = snapshot.basePrice;
    }

    renderBarcode(snapshot.id, document.getElementById("receiptBarcode"));
}

function validateForm() {
    const name = readValue("name");
    const mobile = readValue("mobile");
    const age = Number(readValue("age"));
    const basePrice = Number(readValue("basePrice"));
    const jerseyNumber = Number(readValue("jerseyNumber"));

    if (!form.checkValidity()) {
        statusMessage.textContent = "Please complete all required fields before submitting.";
        statusMessage.className = "helper-text error";
        return false;
    }

    if (!/^\d{10}$/.test(mobile)) {
        statusMessage.textContent = "Mobile number must contain exactly 10 digits.";
        statusMessage.className = "helper-text error";
        return false;
    }

    if (name.length < 3) {
        statusMessage.textContent = "Full name should be at least 3 characters long.";
        statusMessage.className = "helper-text error";
        return false;
    }

    if (!Number.isFinite(age) || age < 10 || age > 60) {
        statusMessage.textContent = "Age should be between 10 and 60.";
        statusMessage.className = "helper-text error";
        return false;
    }

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
        statusMessage.textContent = "Base price should be greater than 0.";
        statusMessage.className = "helper-text error";
        return false;
    }

    if (!Number.isFinite(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 999) {
        statusMessage.textContent = "Jersey number should be between 0 and 999.";
        statusMessage.className = "helper-text error";
        return false;
    }

    statusMessage.textContent = "Looks good. Your registration is ready to submit.";
    statusMessage.className = "helper-text success";
    return true;
}

function refreshUI() {
    updateCalculatedFee();
    updateSummary();
    updateProgress();

    if (!statusMessage.classList.contains("error") && !statusMessage.classList.contains("success")) {
        statusMessage.textContent = "Fill in the form to preview your registration summary.";
        statusMessage.className = "helper-text";
    }
}

function fillRoundedRect(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
    context.fill();
}

function traceRoundedRect(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
}

function getDownloadFilename(extension) {
    return `DPL Pass.${extension}`;
}

function triggerFileDownload(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function downloadBrochurePdf() {
    triggerFileDownload(BROCHURE_PDF_PATH, "dpl.pdf");
}

function getBarcodePattern(value) {
    return String(value)
        .split("")
        .flatMap((digit, index) => {
            const seed = Number(digit) + index;
            return [
                6 + (seed % 6),
                18 + ((seed * 7) % 28),
                8 + ((seed * 5) % 8)
            ];
        });
}

function renderBarcode(value, element) {
    if (!element) {
        return;
    }

    element.innerHTML = "";

    getBarcodePattern(value).forEach((height) => {
        const bar = document.createElement("span");
        bar.className = "pass-bar";
        bar.style.height = `${height}px`;
        element.appendChild(bar);
    });
}

function drawFittedText(context, text, x, y, maxWidth, options = {}) {
    const {
        fontFamily = "Arial",
        fontWeight = "700",
        initialSize = 32,
        minSize = 16,
        color = "#ffffff",
        align = "left"
    } = options;

    let size = initialSize;
    const safeText = String(text ?? "");

    context.textAlign = align;
    context.textBaseline = "alphabetic";

    while (size > minSize) {
        context.font = `${fontWeight} ${size}px ${fontFamily}`;

        if (context.measureText(safeText).width <= maxWidth) {
            break;
        }

        size -= 2;
    }

    context.fillStyle = color;
    context.fillText(safeText, x, y, maxWidth);
}

function buildPassCanvas(snapshot) {
    const logo = document.querySelector(".pass-logo");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
        return null;
    }

    canvas.width = 1600;
    canvas.height = 1000;

    const frame = {
        x: 160,
        y: 140,
        width: 1280,
        height: 720,
        radius: 54
    };

    const frameScaleX = frame.width / 1600;
    const frameScaleY = frame.height / 1000;

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#240b08");
    gradient.addColorStop(0.45, "#4b150d");
    gradient.addColorStop(1, "#2a0d08");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "rgba(255, 186, 92, 0.1)";
    context.beginPath();
    context.arc(240, 160, 200, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(255, 186, 92, 0.12)";
    context.beginPath();
    context.arc(1340, 170, 210, 0, Math.PI * 2);
    context.fill();

    context.shadowColor = "rgba(255, 170, 84, 0.2)";
    context.shadowBlur = 40;
    context.fillStyle = "rgba(86, 26, 14, 0.92)";
    traceRoundedRect(context, frame.x, frame.y, frame.width, frame.height, frame.radius);
    context.fill();
    context.shadowBlur = 0;

    context.save();
    traceRoundedRect(context, frame.x, frame.y, frame.width, frame.height, frame.radius);
    context.clip();

    context.translate(frame.x, frame.y);
    context.scale(frameScaleX, frameScaleY);

    const innerGradient = context.createLinearGradient(0, 0, 1600, 1000);
    innerGradient.addColorStop(0, "#38100d");
    innerGradient.addColorStop(0.4, "#7d2415");
    innerGradient.addColorStop(0.75, "#9c391b");
    innerGradient.addColorStop(1, "#4f180f");
    context.fillStyle = innerGradient;
    context.fillRect(0, 0, 1600, 1000);

    context.fillStyle = "rgba(255, 186, 92, 0.12)";
    context.beginPath();
    context.arc(250, 180, 220, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(255, 186, 92, 0.14)";
    context.beginPath();
    context.arc(1320, 150, 180, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(255, 193, 94, 0.92)";
    context.lineWidth = 8;
    traceRoundedRect(context, 40, 40, 1520, 920, 72);
    context.stroke();

    context.lineWidth = 3;
    context.strokeStyle = "rgba(255, 193, 94, 0.45)";
    traceRoundedRect(context, 90, 90, 1420, 820, 54);
    context.stroke();

    if (logo && logo.complete && logo.naturalWidth > 0) {
        context.fillStyle = "rgba(60, 14, 8, 0.86)";
        fillRoundedRect(context, 110, 110, 120, 120, 28);
        context.drawImage(logo, 124, 124, 92, 92);
    }

    drawFittedText(context, "DPL CRICKET", 260, 168, 420, {
        initialSize: 34,
        minSize: 24,
        color: "#fff0cb"
    });

    context.fillStyle = "rgba(213, 99, 22, 0.95)";
    fillRoundedRect(context, 1120, 98, 360, 82, 41);
    drawFittedText(context, "WELCOME TO CRICKET FESTIVAL", 1118, 149, 330, {
        initialSize: 28,
        minSize: 18,
        color: "#f6ffde"
    });

    context.fillStyle = "rgba(66, 18, 10, 0.72)";
    fillRoundedRect(context, 1145, 180, 290, 132, 32);
    drawFittedText(context, "UNIQUE ID", 1172, 208, 160, {
        initialSize: 18,
        minSize: 14,
        color: "#ffd78d"
    });

    let barX = 1172;
    getBarcodePattern(snapshot.id).forEach((height, index) => {
        context.fillStyle = "#fff5d7";
        context.fillRect(barX, 220 + (42 - height), 4, height);
        barX += index % 2 === 0 ? 7 : 6;
    });

    drawFittedText(context, snapshot.id, 1172, 286, 235, {
        initialSize: 30,
        minSize: 18,
        color: "#fff4d8"
    });

    context.strokeStyle = "rgba(255, 170, 84, 0.55)";
    context.lineWidth = 2;
    traceRoundedRect(context, 90, 220, 1400, 560, 34);
    context.stroke();

    drawFittedText(context, String(snapshot.name).toUpperCase(), 285, 320, 720, {
        initialSize: 74,
        minSize: 30,
        color: "#fff4d6"
    });

    const rows = [
        ["Mobile", snapshot.mobile],
        ["Team", snapshot.team],
        ["Role", snapshot.role]
    ];

    let rowY = 470;
    rows.forEach(([label, value]) => {
        context.fillStyle = "rgba(255, 240, 210, 0.05)";
        fillRoundedRect(context, 120, rowY - 62, 810, 74, 20);
        context.strokeStyle = "rgba(255, 169, 82, 0.35)";
        context.lineWidth = 2;
        traceRoundedRect(context, 120, rowY - 62, 810, 74, 20);
        context.stroke();

        drawFittedText(context, label, 150, rowY, 150, {
            initialSize: 30,
            minSize: 20,
            color: "#ffd98b"
        });
        drawFittedText(context, String(value), 470, rowY, 420, {
            initialSize: 34,
            minSize: 18,
            color: "#fff3d4"
        });
        rowY += 95;
    });

    context.fillStyle = "rgba(255, 240, 210, 0.06)";
    fillRoundedRect(context, 1018, 280, 360, 320, 40);
    context.strokeStyle = "rgba(255, 162, 78, 0.95)";
    context.lineWidth = 6;
    context.setLineDash([14, 10]);
    traceRoundedRect(context, 1018, 280, 360, 320, 40);
    context.stroke();
    context.setLineDash([]);
    drawFittedText(context, "Deshgavhan", 1150, 520, 200, {
        initialSize: 28,
        minSize: 18,
        color: "#ffecc8"
    });

    context.strokeStyle = "rgba(255, 170, 84, 0.55)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(120, 720);
    context.lineTo(930, 720);
    context.stroke();

    drawFittedText(context, "Jersey:", 150, 770, 120, {
        initialSize: 30,
        minSize: 20,
        color: "#ffd98b"
    });
    drawFittedText(context, String(snapshot.jerseyNumber), 290, 772, 260, {
        initialSize: 46,
        minSize: 24,
        color: "#fff3d4"
    });

    context.fillStyle = "#ffd58b";
    context.font = "700 26px Arial";
    context.fillText("VALID FOR DPL CRICKET TOURNAMENT", 430, 875);

    context.restore();

    return canvas;
}

function openDocumentWindow(title, bodyMarkup, extraStyles = "") {
    const docWindow = window.open("", "_blank");

    if (!docWindow) {
        return null;
    }

    docWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    margin: 0;
                    padding: 24px;
                    background: #111;
                    color: #fff;
                    font-family: Arial, sans-serif;
                }
                .wrap {
                    max-width: 1100px;
                    margin: 0 auto;
                }
                .actions {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-bottom: 16px;
                }
                button {
                    border: 0;
                    border-radius: 999px;
                    padding: 12px 18px;
                    font: inherit;
                    font-weight: 700;
                    cursor: pointer;
                }
                .primary {
                    background: #ffd062;
                    color: #2a0d08;
                }
                .hint {
                    margin: 0 0 12px;
                    color: rgba(255,255,255,0.82);
                }
                ${extraStyles}
            </style>
        </head>
        <body>
            <div class="wrap">
                ${bodyMarkup}
            </div>
        </body>
        </html>
    `);
    docWindow.document.close();
    return docWindow;
}

async function downloadPdf(snapshot) {
    const canvas = buildPassCanvas(snapshot);

    if (!canvas) {
        statusMessage.textContent = "PDF export is not supported in this browser.";
        statusMessage.className = "helper-text error";
        return;
    }

    const filename = getDownloadFilename("pdf");
    downloadBrochurePdf();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const preview = openDocumentWindow(
        "DPL Pass PDF",
        `
            <p class="hint">Use Print or Save as PDF from this page.</p>
            <div class="actions">
                <button class="primary" onclick="window.print()">Print / Save PDF</button>
            </div>
            <img src="${dataUrl}" alt="DPL pass" style="display:block;width:100%;height:auto;border-radius:18px;box-shadow:0 18px 40px rgba(0,0,0,0.3);background:#fff;">
        `,
        `
            @page {
                size: A4 landscape;
                margin: 8mm;
            }
            @media print {
                body { background: #fff; padding: 0; }
                .actions, .hint { display: none; }
                img { border-radius: 0 !important; box-shadow: none !important; }
            }
        `
    );

    if (!preview) {
        statusMessage.textContent = "Could not open the PDF preview. Allow pop-ups and try again.";
        statusMessage.className = "helper-text error";
        return;
    }

    preview.document.title = filename;
    statusMessage.textContent = "DPL PDF download started and the pass PDF preview opened.";
    statusMessage.className = "helper-text success";
}

async function downloadJpg(snapshot) {
    const canvas = buildPassCanvas(snapshot);

    if (!canvas) {
        statusMessage.textContent = "JPG export is not supported in this browser.";
        statusMessage.className = "helper-text error";
        return;
    }

    const filename = getDownloadFilename("jpg");
    downloadBrochurePdf();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const preview = openDocumentWindow(
        "DPL Pass JPG",
        `
            <p class="hint">Use Save Image As or the button below.</p>
            <div class="actions">
                <a href="${dataUrl}" download="${filename}" style="text-decoration:none;">
                    <button class="primary">Save JPG</button>
                </a>
            </div>
            <img src="${dataUrl}" alt="DPL pass" style="display:block;width:100%;height:auto;border-radius:18px;box-shadow:0 18px 40px rgba(0,0,0,0.3);">
        `
    );

    if (!preview) {
        statusMessage.textContent = "Could not open the JPG preview. Allow pop-ups and try again.";
        statusMessage.className = "helper-text error";
        return;
    }

    preview.document.title = filename;
    statusMessage.textContent = "DPL PDF download started and the pass JPG preview opened.";
    statusMessage.className = "helper-text success";
}

function downloadHtml(snapshot) {
    const logo = document.querySelector(".pass-logo");
    const logoSrc = logo ? logo.src : "";
    const filename = getDownloadFilename("html");
    downloadBrochurePdf();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DPL Registration Pass</title>
</head>
<body>
    <div>
        <img src="${logoSrc}" alt="DPL logo">
        <h1>Player Pass 2026</h1>
        <p>${snapshot.name}</p>
        <p>${snapshot.mobile}</p>
        <p>${snapshot.team}</p>
        <p>${snapshot.role}</p>
        <p>${snapshot.jerseyNumber}</p>
    </div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerFileDownload(url, filename);
    URL.revokeObjectURL(url);

    statusMessage.textContent = "DPL PDF and HTML pass downloads started.";
    statusMessage.className = "helper-text success";
}

form.addEventListener("input", refreshUI);
form.addEventListener("change", refreshUI);

form.addEventListener("reset", () => {
    currentDplId = "";
    downloadPanel.classList.add("hidden");

    window.setTimeout(() => {
        statusMessage.textContent = "Form cleared. You can start again.";
        statusMessage.className = "helper-text success";
        refreshUI();
    }, 0);
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateForm()) {
        return;
    }

    const formData = new FormData(form);

    if (!GOOGLE_SCRIPT_URL.includes("PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE")) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Submission failed with status ${response.status}`);
            }
        } catch (error) {
            console.error(error);
            statusMessage.textContent = "Submission failed. Check the endpoint and try again.";
            statusMessage.className = "helper-text error";
            submitButton.disabled = false;
            submitButton.textContent = "Submit registration";
            return;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit registration";
        }
    }

    currentDplId = generateDplId();
    populateReceipt();
    downloadPanel.classList.remove("hidden");
    statusMessage.textContent = "Registration submitted successfully. Choose a download format below.";
    statusMessage.className = "helper-text success";
    downloadPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

formatButtons.forEach((button) => {
    button.addEventListener("click", async () => {
        const snapshot = getFormSnapshot();
        const format = button.dataset.format;

        if (format === "pdf") {
            await downloadPdf(snapshot);
            return;
        }

        if (format === "jpg") {
            await downloadJpg(snapshot);
            return;
        }

        downloadHtml(snapshot);
    });
});

downloadButton.addEventListener("click", async () => {
    await downloadJpg(getFormSnapshot());
});

refreshUI();
