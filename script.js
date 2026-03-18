const form = document.getElementById("form");
const statusMessage = document.getElementById("statusMessage");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const submitButton = form.querySelector('button[type="submit"]');
const downloadPanel = document.getElementById("downloadPanel");
const downloadButton = document.getElementById("downloadButton");
const formatButtons = document.querySelectorAll(".format-btn");
let currentDplId = "";

const summaryMap = {
    name: document.getElementById("summaryName"),
    mobile: document.getElementById("summaryMobile"),
    team: document.getElementById("summaryTeam"),
    role: document.getElementById("summaryRole"),
    fee: document.getElementById("summaryFee")
};

const receiptMap = {
    id: document.getElementById("receiptId"),
    name: document.getElementById("receiptName"),
    mobile: document.getElementById("receiptMobile"),
    team: document.getElementById("receiptTeam"),
    role: document.getElementById("receiptRole"),
    jerseyNumber: document.getElementById("receiptJerseyNumber")
};

const requiredFields = [
    "play",
    "date",
    "team",
    "name",
    "mobile",
    "age",
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
    return {
        id: currentDplId || "0000",
        name: readValue("name") || "Not entered",
        mobile: readValue("mobile") || "Not entered",
        age: readValue("age") || "Not entered",
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

function updateSummary() {
    const snapshot = getFormSnapshot();

    summaryMap.name.textContent = snapshot.name;
    summaryMap.mobile.textContent = snapshot.mobile;
    summaryMap.team.textContent = snapshot.team;
    summaryMap.role.textContent = snapshot.role;
    summaryMap.fee.textContent = snapshot.fee;
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

    renderBarcode(snapshot.id, document.getElementById("receiptBarcode"));
}

function validateForm() {
    const name = readValue("name");
    const mobile = readValue("mobile");
    const age = Number(readValue("age"));
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

function getSafeName(snapshot) {
    return snapshot.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "player";
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

function dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(",")[1] || "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

function buildPdfFromJpegDataUrl(dataUrl, imageWidth, imageHeight) {
    const jpegBytes = dataUrlToUint8Array(dataUrl);
    const pageWidth = 842;
    const pageHeight = 595;
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const imageRatio = imageWidth / imageHeight;
    let drawWidth = maxWidth;
    let drawHeight = drawWidth / imageRatio;

    if (drawHeight > maxHeight) {
        drawHeight = maxHeight;
        drawWidth = drawHeight * imageRatio;
    }

    const drawX = (pageWidth - drawWidth) / 2;
    const drawY = (pageHeight - drawHeight) / 2;

    const objects = [];
    const encoder = new TextEncoder();

    const contentStream = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/Im0 Do\nQ`;

    objects.push(encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));
    objects.push(encoder.encode("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
    objects.push(encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
    objects.push({
        header: encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>`),
        stream: jpegBytes
    });
    objects.push({
        header: encoder.encode(`<< /Length ${encoder.encode(contentStream).length} >>`),
        stream: encoder.encode(contentStream)
    });

    const chunks = [];
    const offsets = [0];
    let position = 0;

    function pushBytes(bytes) {
        chunks.push(bytes);
        position += bytes.length;
    }

    pushBytes(encoder.encode("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n"));

    objects.forEach((object, index) => {
        offsets.push(position);
        pushBytes(encoder.encode(`${index + 1} 0 obj\n`));

        if (object instanceof Uint8Array) {
            pushBytes(object);
            pushBytes(encoder.encode("\nendobj\n"));
            return;
        }

        pushBytes(object.header);
        pushBytes(encoder.encode("\nstream\n"));
        pushBytes(object.stream);
        pushBytes(encoder.encode("\nendstream\nendobj\n"));
    });

    const xrefOffset = position;
    pushBytes(encoder.encode(`xref\n0 ${objects.length + 1}\n`));
    pushBytes(encoder.encode("0000000000 65535 f \n"));

    offsets.slice(1).forEach((offset) => {
        pushBytes(encoder.encode(`${String(offset).padStart(10, "0")} 00000 n \n`));
    });

    pushBytes(encoder.encode(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));

    return new Blob(chunks, { type: "application/pdf" });
}

async function showSaveDialog(suggestedName, accept) {
    if (!window.showSaveFilePicker) {
        return null;
    }

    try {
        return await window.showSaveFilePicker({
            suggestedName,
            types: [
                {
                    description: "DPL Pass",
                    accept
                }
            ]
        });
    } catch (error) {
        if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
            return "aborted";
        }

        return null;
    }
}

async function saveBlobWithHandle(fileHandle, blob) {
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
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
    traceRoundedRect(context, 40, 40, 1520, 920, 54);
    context.stroke();

    context.lineWidth = 3;
    context.strokeStyle = "rgba(255, 193, 94, 0.45)";
    traceRoundedRect(context, 90, 90, 1420, 820, 38);
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
    fillRoundedRect(context, 1120, 98, 360, 82, 24);
    drawFittedText(context, "WELCOME TO CRICKET FESTIVAL", 1118, 149, 330, {
        initialSize: 28,
        minSize: 18,
        color: "#f6ffde"
    });

    context.fillStyle = "rgba(66, 18, 10, 0.72)";
    fillRoundedRect(context, 1145, 180, 290, 132, 22);
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
    context.strokeRect(90, 220, 1400, 560);

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
        context.strokeStyle = "rgba(255, 169, 82, 0.5)";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(120, rowY - 56);
        context.lineTo(930, rowY - 56);
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

    context.beginPath();
    context.moveTo(1050, 260);
    context.lineTo(1110, 330);
    context.lineTo(1205, 342);
    context.lineTo(1390, 300);
    context.lineTo(1346, 598);
    context.lineTo(1136, 610);
    context.lineTo(1018, 630);
    context.closePath();
    context.strokeStyle = "rgba(255, 162, 78, 0.95)";
    context.lineWidth = 6;
    context.setLineDash([10, 8]);
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

function openImageWindow(dataUrl, title) {
    const imageWindow = window.open("", "_blank");

    if (!imageWindow) {
        return null;
    }

    imageWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    background: #f4f4f4;
                    display: grid;
                    place-items: center;
                    min-height: 100vh;
                }
                .sheet {
                    width: min(100%, 1000px);
                }
                img {
                    display: block;
                    width: 100%;
                    height: auto;
                    border-radius: 18px;
                    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
                }
                @page {
                    size: A4;
                    margin: 10mm;
                }
                @media print {
                    body {
                        padding: 0;
                        background: #ffffff;
                    }
                    .sheet {
                        width: 100%;
                    }
                    img {
                        border-radius: 0;
                        box-shadow: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="sheet">
                <img src="${dataUrl}" alt="DPL pass">
            </div>
        </body>
        </html>
    `);
    imageWindow.document.close();
    return imageWindow;
}

function printDataUrlAsPdf(dataUrl, title) {
    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const doc = frameWindow?.document;

    if (!frameWindow || !doc) {
        iframe.remove();
        return false;
    }

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #ffffff;
                    display: grid;
                    place-items: center;
                    min-height: 100vh;
                }
                img {
                    display: block;
                    width: 100%;
                    max-width: 1100px;
                    height: auto;
                }
                @page {
                    size: A4 landscape;
                    margin: 8mm;
                }
            </style>
        </head>
        <body>
            <img src="${dataUrl}" alt="DPL pass">
        </body>
        </html>
    `);
    doc.close();

    window.setTimeout(() => {
        frameWindow.focus();
        frameWindow.print();
        window.setTimeout(() => {
            iframe.remove();
        }, 1500);
    }, 250);

    return true;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1500);
}

async function downloadPdf(snapshot) {
    const canvas = buildPassCanvas(snapshot);

    if (!canvas) {
        statusMessage.textContent = "PDF export is not supported in this browser.";
        statusMessage.className = "helper-text error";
        return;
    }

    const safeName = getSafeName(snapshot);
    const saveTarget = await showSaveDialog(`dpl-registration-pass-${safeName}.pdf`, {
        "application/pdf": [".pdf"]
    });

    if (saveTarget === "aborted") {
        statusMessage.textContent = "PDF save cancelled.";
        statusMessage.className = "helper-text";
        return;
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const pdfBlob = buildPdfFromJpegDataUrl(dataUrl, canvas.width, canvas.height);

    if (saveTarget) {
        await saveBlobWithHandle(saveTarget, pdfBlob);
        statusMessage.textContent = "PDF pass saved successfully.";
        statusMessage.className = "helper-text success";
        return;
    }

    downloadBlob(pdfBlob, `dpl-registration-pass-${safeName}.pdf`);
    statusMessage.textContent = "PDF pass download started.";
    statusMessage.className = "helper-text success";
}

async function downloadJpg(snapshot) {
    const canvas = buildPassCanvas(snapshot);

    if (!canvas) {
        statusMessage.textContent = "JPG export is not supported in this browser.";
        statusMessage.className = "helper-text error";
        return;
    }

    const safeName = getSafeName(snapshot);
    const filename = `dpl-registration-pass-${safeName}.jpg`;
    const saveTarget = await showSaveDialog(filename, {
        "image/jpeg": [".jpg", ".jpeg"]
    });

    if (saveTarget === "aborted") {
        statusMessage.textContent = "JPG save cancelled.";
        statusMessage.className = "helper-text";
        return;
    }

    if (canvas.toBlob) {
        canvas.toBlob(async (blob) => {
            if (!blob) {
                statusMessage.textContent = "Could not generate the JPG file.";
                statusMessage.className = "helper-text error";
                return;
            }

            if (saveTarget) {
                await saveBlobWithHandle(saveTarget, blob);
                statusMessage.textContent = "JPG pass saved successfully.";
                statusMessage.className = "helper-text success";
                return;
            }

            downloadBlob(blob, filename);
            statusMessage.textContent = "JPG pass download started.";
            statusMessage.className = "helper-text success";
        }, "image/jpeg", 0.95);
        return;
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

    if (saveTarget) {
        const fallbackBlob = new Blob([dataUrlToUint8Array(dataUrl)], { type: "image/jpeg" });
        await saveBlobWithHandle(saveTarget, fallbackBlob);
        statusMessage.textContent = "JPG pass saved successfully.";
        statusMessage.className = "helper-text success";
        return;
    }

    const fallbackLink = document.createElement("a");
    fallbackLink.href = dataUrl;
    fallbackLink.download = filename;
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    fallbackLink.remove();

    statusMessage.textContent = "JPG pass download started.";
    statusMessage.className = "helper-text success";
}

function downloadHtml(snapshot) {
    const logo = document.querySelector(".pass-logo");
    const logoSrc = logo ? logo.src : "";
    const safeName = getSafeName(snapshot);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DPL Registration Pass</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 24px;
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #fff4c7, #ff9f67);
        }
        .pass {
            max-width: 1180px;
            margin: 0 auto;
            padding: 24px 24px 18px;
            border-radius: 34px;
            color: #ffeccc;
            background:
                radial-gradient(circle at 18% 18%, rgba(255, 213, 128, 0.24), transparent 18%),
                radial-gradient(circle at 85% 15%, rgba(255, 181, 72, 0.28), transparent 20%),
                radial-gradient(circle at 50% 100%, rgba(255, 117, 24, 0.22), transparent 38%),
                linear-gradient(155deg, #44120e 0%, #6e1c12 28%, #8e2f17 58%, #4f180f 100%);
            box-shadow: 0 28px 54px rgba(107, 29, 8, 0.32);
            border: 2px solid rgba(255, 193, 94, 0.45);
        }
        .line {
            height: 6px;
            margin: 6px 28px 10px;
            border-radius: 999px;
            background: linear-gradient(90deg, rgba(255, 198, 114, 0.08), #ffd37f, rgba(255, 198, 114, 0.08));
        }
        .top {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
            padding: 0 16px;
        }
        .brand {
            display: flex;
            gap: 20px;
            align-items: center;
        }
        .logo {
            width: 110px;
            height: 110px;
            object-fit: contain;
            background: rgba(62, 13, 7, 0.72);
            border-radius: 22px;
            padding: 8px;
            border: 1px solid rgba(255, 206, 121, 0.35);
        }
        .mini {
            margin: 0 0 6px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #ffd67f;
        }
        h1 {
            margin: 0;
            font-size: 56px;
            color: #fff6da;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }
        .chip {
            padding: 14px 18px;
            border-radius: 18px 18px 18px 42px;
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #f6ffde;
            background: linear-gradient(135deg, rgba(148, 50, 14, 0.96), rgba(247, 197, 78, 0.96));
            border: 1px solid rgba(255, 235, 182, 0.28);
        }
        .side {
            display: grid;
            gap: 12px;
            justify-items: end;
        }
        .id-stack {
            min-width: 250px;
            padding: 14px 16px 12px;
            border-radius: 20px;
            background: rgba(66, 18, 10, 0.62);
            border: 1px solid rgba(255, 204, 120, 0.24);
        }
        .id-title {
            display: block;
            margin-bottom: 8px;
            color: #ffd78d;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
        }
        .barcode {
            display: flex;
            align-items: flex-end;
            gap: 2px;
            height: 52px;
            margin-bottom: 8px;
        }
        .barcode span {
            width: 4px;
            background: #fff5d7;
            border-radius: 999px;
        }
        .id-value {
            display: block;
            color: #fff4d8;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 0.18em;
        }
        .stage {
            display: grid;
            grid-template-columns: minmax(0, 1.3fr) minmax(240px, 0.75fr);
            gap: 24px;
            margin-top: 8px;
            padding: 10px 16px 0;
        }
        .name {
            margin: 0 0 12px;
            padding: 0 0 10px;
            border-bottom: 2px solid rgba(255, 173, 79, 0.65);
            color: #fff2d4;
            font-size: 66px;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }
        .data-list {
            display: grid;
            gap: 8px;
        }
        .row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            padding: 14px 0;
            border-bottom: 1px solid rgba(255, 172, 85, 0.5);
        }
        .row span {
            min-width: 120px;
            color: #ffd78d;
            font-size: 24px;
        }
        .row strong {
            flex: 1;
            color: #fff4d9;
            font-size: 26px;
        }
        .footer {
            display: flex;
            gap: 28px;
            margin-top: 18px;
            padding-top: 14px;
            border-top: 2px solid rgba(255, 171, 78, 0.55);
        }
        .footer-item {
            display: flex;
            align-items: baseline;
            gap: 8px;
            color: #ffd68f;
            font-size: 30px;
            font-weight: 700;
        }
        .footer-item strong {
            color: #ffe79a;
            font-size: 48px;
        }
        .map {
            display: grid;
            place-items: center;
        }
        .map-shape {
            width: 100%;
            min-height: 280px;
            display: grid;
            place-items: center;
            padding: 18px;
            clip-path: polygon(22% 4%, 35% 18%, 62% 8%, 92% 2%, 84% 56%, 73% 90%, 16% 100%, 14% 62%);
            border: 4px dotted rgba(255, 162, 78, 0.9);
            background: rgba(255, 240, 210, 0.06);
        }
        .map-shape span {
            color: #ffefc8;
            font-size: 30px;
            font-weight: 800;
        }
        .note {
            margin: 18px 0 0;
            text-align: center;
            color: #ffd58b;
            letter-spacing: 0.08em;
            font-size: 20px;
            font-weight: 700;
        }
        @media (max-width: 900px) {
            .top,
            .brand,
            .side,
            .stage,
            .footer,
            .row {
                flex-direction: column;
                align-items: flex-start;
            }
            .stage {
                grid-template-columns: 1fr;
            }
            .chip {
                width: 100%;
                text-align: center;
            }
            .name {
                font-size: 42px;
            }
        }
    </style>
</head>
<body>
    <div class="pass">
        <div class="line"></div>
        <div class="top">
            <div class="brand">
                <img src="${logoSrc}" alt="DPL logo" class="logo">
                <div>
                    <p class="mini">DPL Cricket</p>
                    <h1>Player Pass 2026</h1>
                </div>
            </div>
            <div class="side">
                <div class="chip">Welcome To Cricket Festival</div>
                <div class="id-stack">
                    <span class="id-title">Unique ID</span>
                    <div class="barcode">${getBarcodePattern(snapshot.id).map((height) => `<span style="height:${height}px"></span>`).join("")}</div>
                    <strong class="id-value">${snapshot.id}</strong>
                </div>
            </div>
        </div>
        <div class="stage">
            <div class="details">
                <div class="name">${String(snapshot.name).toUpperCase()}</div>
                <div class="data-list">
                    <div class="row"><span>Mobile</span><strong>${snapshot.mobile}</strong></div>
                    <div class="row"><span>Team</span><strong>${snapshot.team}</strong></div>
                    <div class="row"><span>Role</span><strong>${snapshot.role}</strong></div>
                </div>
                <div class="footer">
                    <div class="footer-item"><span>Jersey:</span><strong>${snapshot.jerseyNumber}</strong></div>
                </div>
            </div>
            <div class="map">
                <div class="map-shape"><span>Deshgavhan</span></div>
            </div>
        </div>
        <div class="note">VALID FOR DPL CRICKET TOURNAMENT</div>
    </div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `dpl-registration-pass-${safeName}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    statusMessage.textContent = "HTML pass download started.";
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
