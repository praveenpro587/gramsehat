// ─── CONFIG ───────────────────────────────────────
const API = "http://localhost:8000/api";

// ─── STATE ────────────────────────────────────────
let triageSummary   = "";
let visualFindings  = "";
let mediaRecorder   = null;
let audioChunks     = [];
let isRecording     = false;
let recordedBlob    = null;

// ─── NAVIGATION ───────────────────────────────────

function goToStep1() {
    showCard(1);
    setPipeActive(1);
}

function goToStep2() {
    const name = document.getElementById("patientName").value.trim();
    const age  = document.getElementById("age").value;
    if (!name) { showError("Please enter patient name"); return; }
    if (!age || age < 0 || age > 120) { showError("Please enter a valid age"); return; }
    showCard(2);
    setPipeActive(2);
}

function goToStep3() {
    showCard(3);
    setPipeActive(3);
}

function goToStep4() {
    showCard(4);
    setPipeActive(4);
}

function showCard(n) {
    [1,2,3,4].forEach(i => {
        const card = document.getElementById(`card${i}`);
        if (card) card.classList.toggle("hidden", i !== n);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setPipeActive(n) {
    [1,2,3,4].forEach(i => {
        const step = document.getElementById(`pipe${i}`);
        if (!step) return;
        step.classList.remove("active", "done");
        if (i < n)  step.classList.add("done");
        if (i === n) step.classList.add("active");
    });
}

// ─── STEP 2: SYMPTOM TRIAGE ───────────────────────

async function triageSymptoms() {
    const name     = document.getElementById("patientName").value.trim();
    const age      = document.getElementById("age").value;
    const language = document.getElementById("language").value;
    const region   = document.getElementById("region").value;
    const season   = document.getElementById("season").value;
    const symptoms = document.getElementById("symptoms").value.trim();

    if (!symptoms && !recordedBlob) {
        showError("Please describe symptoms or record a voice message");
        return;
    }

    const resultBox = document.getElementById("triageResult");
    setLoading(resultBox, "🔍 Analyzing symptoms with Groq AI...");

    try {
        let data;

        if (recordedBlob) {
            // Voice triage
            const formData = new FormData();
            formData.append("audio", recordedBlob, "recording.webm");
            formData.append("patient_name", name);
            formData.append("age", age);
            formData.append("language", language);
            formData.append("region", region);
            formData.append("season", season);

            const res = await fetch(`${API}/voice-triage`, { method: "POST", body: formData });
            data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Triage failed");

            // Show transcription
            document.getElementById("symptoms").value = data.transcribed_text;

        } else {
            // Text triage
            const formData = new FormData();
            formData.append("patient_name", name);
            formData.append("age", age);
            formData.append("language", language);
            formData.append("symptoms_text", symptoms);
            formData.append("region", region);
            formData.append("season", season);

            const res = await fetch(`${API}/triage`, { method: "POST", body: formData });
            data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Triage failed");
        }

        triageSummary = data.triage_summary;

        // resultBox.className = "result-box";
        // resultBox.innerHTML = `
        //     <strong>📋 Symptom Analysis:</strong>
        //     <br/>
        //     ${formatText(data.translated_response)}
        //     <hr/>
        //     <small style="color:#666">✅ Analyzed by Groq Llama 3.1 70B</small>
        // `;
        resultBox.className = "result-box";
        resultBox.innerHTML = `
            <strong>📋 Symptom Analysis:</strong>
            <br/><br/>
            🇮🇳 <strong>Local Language:</strong><br/>
            ${formatText(data.translated_response)}
            <hr/>
            🇬🇧 <strong>English:</strong><br/>
            ${formatText(data.triage_summary)}
            <hr/>
            <small style="color:#666">✅ Analyzed by Groq Llama 3.3 70B</small>
        `;
        resultBox.classList.remove("hidden");

        // Show "Continue" button
        document.getElementById("continueToVision").classList.remove("hidden");

    } catch (err) {
        resultBox.className = "result-box red";
        resultBox.innerHTML = `❌ Error: ${err.message}. Make sure the backend is running on port 8000.`;
        resultBox.classList.remove("hidden");
    }
}

// ─── VOICE RECORDING ──────────────────────────────

async function toggleRecording() {
    if (!isRecording) {
        await startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        // mediaRecorder.onstop = () => {
        //     recordedBlob = new Blob(audioChunks, { type: "audio/webm" });
        //     const url = URL.createObjectURL(recordedBlob);
        //     const playback = document.getElementById("audioPlayback");
        //     playback.src = url;
        //     playback.classList.remove("hidden");
        //     document.getElementById("recordingStatus").textContent = "✅ Recording ready";
        // };
        mediaRecorder.onstop = async () => {
            recordedBlob = new Blob(audioChunks, { type: "audio/webm" });

            // Show audio playback
            const url = URL.createObjectURL(recordedBlob);
            const playback = document.getElementById("audioPlayback");
            playback.src = url;
            playback.classList.remove("hidden");
            document.getElementById("recordingStatus").textContent = "⏳ Transcribing...";

            // Auto transcribe immediately so user can review
            await previewTranscription();
        };

        mediaRecorder.start();
        isRecording = true;

        const btn = document.getElementById("recordBtn");
        btn.textContent = "⏹ Stop Recording";
        btn.classList.add("recording");
        document.getElementById("recordingStatus").textContent = "🔴 Recording...";

    } catch (err) {
        showError("Microphone access denied. Please allow microphone permission.");
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
        isRecording = false;

        const btn = document.getElementById("recordBtn");
        btn.textContent = "🎤 Record Again";
        btn.classList.remove("recording");
    }
}



// ─── STEP 3: IMAGE ANALYSIS ───────────────────────

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const preview = document.getElementById("previewImg");
            preview.src = e.target.result;
            document.getElementById("imagePreview").classList.remove("hidden");
            document.getElementById("analyzeImgBtn").disabled = false;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ─── TRANSCRIPTION PREVIEW ────────────────────────

async function previewTranscription() {
    const language = document.getElementById("language").value;
    const reviewBox = document.getElementById("transcriptionReview");
    const transcribedTextArea = document.getElementById("transcribedText");

    // Show processing state
    reviewBox.classList.remove("hidden");
    transcribedTextArea.value = "";
    transcribedTextArea.placeholder = "⏳ Transcribing your voice...";
    transcribedTextArea.disabled = true;

    try {
        const name   = document.getElementById("patientName").value.trim();
        const age    = document.getElementById("age").value;
        const region = document.getElementById("region").value;
        const season = document.getElementById("season").value;

        const formData = new FormData();
        formData.append("audio", recordedBlob, "recording.webm");
        formData.append("patient_name", name);
        formData.append("age", age);
        formData.append("language", language);
        formData.append("region", region);
        formData.append("season", season);

        // Only transcribe — don't run full triage yet
        const res  = await fetch(`${API}/transcribe-only`, { method: "POST", body: formData });
        const data = await res.json();

        if (res.ok && data.transcribed_text) {
            transcribedTextArea.value    = data.transcribed_text;
            transcribedTextArea.disabled = false;
            transcribedTextArea.placeholder = "Edit if anything is wrong...";
            document.getElementById("recordingStatus").textContent = "✅ Transcribed — check & edit below";
        } else {
            throw new Error("Transcription failed");
        }

    } catch (err) {
        transcribedTextArea.disabled     = false;
        transcribedTextArea.placeholder  = "Could not transcribe — type symptoms manually";
        transcribedTextArea.value        = "";
        document.getElementById("recordingStatus").textContent = "⚠️ Could not transcribe";
    }
}


function useTranscription() {
    const transcribedText = document.getElementById("transcribedText").value.trim();
    if (!transcribedText) {
        showError("Transcription is empty — please type symptoms manually");
        return;
    }

    // Copy transcribed (and possibly edited) text to symptoms textarea
    document.getElementById("symptoms").value = transcribedText;

    // Hide transcription review box
    document.getElementById("transcriptionReview").classList.add("hidden");
    document.getElementById("recordingStatus").textContent = "✅ Text copied to symptoms";

    // Clear recorded blob since we're using text now
    recordedBlob = null;

    // Scroll to symptoms box
    document.getElementById("symptoms").focus();
}


function reRecord() {
    // Reset everything for a fresh recording
    recordedBlob = null;
    document.getElementById("transcriptionReview").classList.add("hidden");
    document.getElementById("audioPlayback").classList.add("hidden");
    document.getElementById("audioPlayback").src = "";
    document.getElementById("recordingStatus").textContent = "";
    document.getElementById("recordBtn").textContent = "🎤 Start Recording";
    document.getElementById("recordBtn").classList.remove("recording");
    isRecording = false;
}

async function analyzeImage() {
    const file     = document.getElementById("imageUpload").files[0];
    const language = document.getElementById("language").value;
    const resultBox = document.getElementById("imageResult");

    if (!file) { showError("Please select an image first"); return; }

    setLoading(resultBox, "🔬 Analyzing image with Groq Llama Vision...");

    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("symptom_context", triageSummary || "General health checkup");
        formData.append("language", language);

        const res  = await fetch(`${API}/analyze-image`, { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Image analysis failed");

        visualFindings = data.visual_findings;

        resultBox.className = "result-box";
        // resultBox.innerHTML = `
        //     <strong>👁️ Visual Findings:</strong>
        //     <br/>
        //     ${formatText(data.translated_findings)}
        //     <hr/>
        //     <small style="color:#666">✅ Analyzed by Groq Llama 3.2 Vision</small>
        // `;
        resultBox.innerHTML = `
            <strong>👁️ Visual Findings:</strong>
            <br/><br/>
            🇮🇳 <strong>Local Language:</strong><br/>
            ${formatText(data.translated_findings)}
            <hr/>
            🇬🇧 <strong>English:</strong><br/>
            ${formatText(data.visual_findings)}
            <hr/>
            <small style="color:#666">✅ Analyzed by Groq Llama 4 Maverick Vision</small>
        `;
        resultBox.classList.remove("hidden");

        document.getElementById("continueTodiagnosis").classList.remove("hidden");

    } catch (err) {
        resultBox.className = "result-box red";
        resultBox.innerHTML = `❌ Error: ${err.message}`;
        resultBox.classList.remove("hidden");
    }
}

// ─── STEP 4: FULL DIAGNOSIS ───────────────────────

async function getDiagnosis() {
    const name       = document.getElementById("patientName").value.trim();
    const age        = document.getElementById("age").value;
    const language   = document.getElementById("language").value;
    const region     = document.getElementById("region").value;
    const ashaPhone  = document.getElementById("ashaPhone").value.trim();
    const resultBox  = document.getElementById("diagnosisResult");

    if (!triageSummary) {
        showError("Please complete symptom analysis first (Step 2)");
        return;
    }

    setLoading(resultBox, "🩺 Generating diagnosis with Groq AI...");

    try {
        const formData = new FormData();
        formData.append("patient_name", name);
        formData.append("age", age);
        formData.append("symptoms_summary", triageSummary);
        formData.append("visual_findings", visualFindings);
        formData.append("language", language);
        formData.append("region", region);
        formData.append("asha_phone", ashaPhone);

        const res  = await fetch(`${API}/diagnose`, { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Diagnosis failed");

        const urgency      = data.urgency_level;
        const colorClass   = urgency.toLowerCase();
        const urgencyEmoji = { RED: "🔴", YELLOW: "🟡", GREEN: "🟢" }[urgency] || "⚪";
        const urgencyLabel = { RED: "EMERGENCY", YELLOW: "NEEDS ATTENTION", GREEN: "STABLE" }[urgency] || urgency;

        // resultBox.className = `result-box ${colorClass}`;
        // resultBox.innerHTML = `
        //     <div class="urgency-banner ${colorClass}">
        //         ${urgencyEmoji} ${urgencyLabel}
        //     </div>

        //     <strong>🩺 Diagnosis:</strong>
        //     ${data.probable_diagnosis}
        //     <br/><br/>

        //     <strong>⚠️ Reason:</strong>
        //     ${data.urgency_reason}
        //     <br/><br/>

        //     <strong>🏠 First Aid (do this now):</strong>
        //     ${formatText(data.first_aid)}
        //     <br/><br/>

        //     <strong>📍 Next Action:</strong>
        //     ${data.recommended_action}
        //     <br/><br/>

        //     <hr/>
        //     <strong>🗣️ In Your Language:</strong>
        //     <br/>
        //     ${data.translated_advice}

        //     ${data.asha_notified ? `
        //     <hr/>
        //     <div style="color:#1565c0; font-weight:600">
        //         📲 ASHA Worker has been notified via WhatsApp!
        //     </div>` : ""}

        //     <hr/>
        //     <small style="color:#666">
        //         ✅ Diagnosis by Groq Llama 3.1 70B &nbsp;|&nbsp;
        //         ⚠️ This is AI assistance only — always consult a doctor for serious conditions
        //     </small>
        // `;
        resultBox.className = `result-box ${colorClass}`;
        resultBox.innerHTML = `
            <div class="urgency-banner ${colorClass}">
                ${urgencyEmoji} ${urgencyLabel}
            </div>

            <!-- ENGLISH SECTION -->
            <div class="lang-section english-section">
                <div class="lang-header">🇬🇧 English</div>
                <div class="lang-content">
                    <strong>🩺 Diagnosis:</strong> ${data.probable_diagnosis}
                    <br/><br/>
                    <strong>⚠️ Reason:</strong> ${data.urgency_reason}
                    <br/><br/>
                    <strong>🏠 First Aid:</strong> ${formatText(data.first_aid)}
                    <br/><br/>
                    <strong>📍 Next Action:</strong> ${data.recommended_action}
                </div>
            </div>

            <!-- MEDICINES SECTION -->
            <div class="medicine-box">
                <div class="medicine-title">💊 Suggested Medicines</div>
                ${formatMedicines(data.medicines)}
                <div class="medicine-warning">
                    ⚠️ ${data.medicine_warning}
                </div>
            </div>

            <!-- HOME REMEDIES -->
            <div class="remedy-box">
                <div class="remedy-title">🌿 Home Remedies</div>
                ${formatRemedies(data.home_remedies)}
            </div>

            <!-- LOCAL LANGUAGE SECTION -->
            <div class="lang-section local-section">
                <div class="lang-header">🇮🇳 Local Language / स्थानीय భాష / स्थानीय भाषा</div>
                <div class="lang-content">
                    ${formatLocalAdvice(data.translated_advice)}
                </div>
            </div>

            ${data.asha_notified ? `
            <div style="margin-top:12px; padding:12px; background:#e3f2fd;
                        border-radius:8px; color:#1565c0; font-weight:600">
                📧 ASHA Worker has been notified via Email!
            </div>` : ""}

            <hr/>
            <small style="color:#666">
                ✅ Diagnosis by Groq Llama 3.3 70B &nbsp;|&nbsp;
                ⚠️ AI assistance only — always consult a doctor for serious conditions
            </small>
        `;
        resultBox.classList.remove("hidden");

        // Show audio response option
        document.getElementById("audioSection").classList.remove("hidden");
        document.getElementById("diagnosisAudio").src = `${API.replace("/api","")}/api/audio-response`;

        document.getElementById("restartSection").classList.remove("hidden");

    } catch (err) {
        resultBox.className = "result-box red";
        resultBox.innerHTML = `❌ Error: ${err.message}`;
        resultBox.classList.remove("hidden");
    }
}

// ─── RESTART ──────────────────────────────────────

function restartApp() {
    triageSummary  = "";
    visualFindings = "";
    recordedBlob   = null;

    // Reset form fields
    ["patientName","age","symptoms","ashaPhone"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    // Reset results
    ["triageResult","imageResult","diagnosisResult"].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.innerHTML = ""; el.classList.add("hidden"); }
    });

    // Reset image
    document.getElementById("imagePreview").classList.add("hidden");
    document.getElementById("imageUpload").value = "";
    document.getElementById("analyzeImgBtn").disabled = true;

    // Reset audio
    document.getElementById("audioPlayback").classList.add("hidden");
    document.getElementById("audioSection").classList.add("hidden");
    document.getElementById("audioPlayback").src = "";
    document.getElementById("recordBtn").textContent = "🎤 Start Recording";
    document.getElementById("recordingStatus").textContent = "";

    // Hide continue buttons
    ["continueToVision","continueTodiagnosis","restartSection"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });

    goToStep1();
}

// ─── HELPERS ──────────────────────────────────────

function setLoading(el, message) {
    el.className = "result-box loading";
    el.innerHTML = `⏳ ${message}`;
    el.classList.remove("hidden");
}

function formatText(text) {
    if (!text) return "";
    return text
        .replace(/\n/g, "<br/>")
        .replace(/SUMMARY:/g, "<strong>Summary:</strong>")
        .replace(/QUESTIONS:/g, "<strong>Questions:</strong>")
        .replace(/CONCERN_LEVEL:/g, "<strong>Concern Level:</strong>")
        .replace(/FINDINGS:/g, "<strong>Findings:</strong>")
        .replace(/SEVERITY:/g, "<strong>Severity:</strong>")
        .replace(/POSSIBLE_CONDITION:/g, "<strong>Possible Condition:</strong>");
}

function showError(msg) {
    alert(`⚠️ ${msg}`);
}

// ─── MEDICINE FORMATTER ───────────────────────────

function formatMedicines(medicinesStr) {
    if (!medicinesStr) return "<p>No medicines suggested</p>";

    // Split by pipe | symbol
    const medicines = medicinesStr.split("|").map(m => m.trim()).filter(Boolean);

    if (medicines.length === 0) return `<p>${medicinesStr}</p>`;

    return medicines.map(med => {
        // Format: MedicineName (Brand) - Dosage - Frequency - Purpose
        const parts = med.split("-").map(p => p.trim());
        const name     = parts[0] || "";
        const dosage   = parts[1] || "";
        const frequency= parts[2] || "";
        const purpose  = parts[3] || "";

        return `
        <div class="medicine-item">
            <div class="medicine-name">💊 ${name}</div>
            <div class="medicine-details">
                ${dosage ? `<span class="med-tag">📏 ${dosage}</span>` : ""}
                ${frequency ? `<span class="med-tag">🕐 ${frequency}</span>` : ""}
                ${purpose ? `<span class="med-tag">🎯 ${purpose}</span>` : ""}
            </div>
        </div>`;
    }).join("");
}


function formatRemedies(remediesStr) {
    if (!remediesStr) return "<p>No home remedies available</p>";

    const remedies = remediesStr.split("|").map(r => r.trim()).filter(Boolean);

    if (remedies.length === 0) return `<p>${remediesStr}</p>`;

    return remedies.map(remedy => `
        <div class="remedy-item">🌿 ${remedy}</div>
    `).join("");
}

// ─── LOCAL ADVICE FORMATTER ───────────────────────

function formatLocalAdvice(advice) {
    if (!advice) return "";

    // Split by common label patterns and format nicely
    return advice
        // Add line breaks before each section label
        .replace(/(రోగనిర్ధారణ|Diagnosis|निदान|রোগ নির্ণয়|நோய் கண்டறிதல்):/gi,
            '<br/><strong>🩺 $1:</strong>')
        .replace(/(ప్రథమ చికిత్స|First Aid|प्राथमिक उपचार|প্রাথমিক চিকিৎসা|முதலுதவி):/gi,
            '<br/><br/><strong>🏠 $1:</strong>')
        .replace(/(చర్య|Action|कार्रवाई|পদক্ষেপ|நடவடிக்கை):/gi,
            '<br/><br/><strong>📍 $1:</strong>')
        .replace(/(మందులు|Medicines|दवाइयाँ|ওষুধ|மருந்துகள்):/gi,
            '<br/><br/><strong>💊 $1:</strong>')
        .replace(/(హోమ్ రెమెడీస్|Home Remedies|घरेलू उपचार|ঘরোয়া প্রতিকার|வீட்டு வைத்தியம்):/gi,
            '<br/><br/><strong>🌿 $1:</strong>')
        // Split pipe-separated medicines into individual lines
        .replace(/\|/g, '<br/>• ')
        // Clean up multiple consecutive line breaks
        .replace(/(<br\s*\/?>){3,}/gi, '<br/><br/>')
        // Remove leading break if present
        .replace(/^(<br\s*\/?>)+/i, '')
        .trim();
}

// ─── INIT ─────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    goToStep1();
    console.log("🏥 GramSehat initialized — Powered by Groq");
});
