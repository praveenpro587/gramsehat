// ─── CONFIG ───────────────────────────────────────
const API = "http://localhost:8000/api";

// ─── STATE ────────────────────────────────────────
let triageSummary   = "";
let visualFindings  = "";
let mediaRecorder   = null;
let audioChunks     = [];
let isRecording     = false;
let recordedBlob    = null;

// Yes/No translations for Indian languages
const YES_TRANSLATIONS = {
    hindi:    "हाँ (Haan)",
    marathi:  "होय (Hoy)",
    telugu:   "అవును (Avunu)",
    tamil:    "ஆம் (Aam)",
    bengali:  "হ্যাঁ (Hyaan)",
    kannada:  "ಹೌದು (Haudu)",
    gujarati: "હા (Haa)",
    odia:     "ହଁ (Han)",
    malayalam:"അതെ (Athe)"
};

const NO_TRANSLATIONS = {
    hindi:    "नहीं (Nahi)",
    marathi:  "नाही (Naahi)",
    telugu:   "కాదు (Kaadu)",
    tamil:    "இல்லை (Illai)",
    bengali:  "না (Naa)",
    kannada:  "ಇಲ್ಲ (Illa)",
    gujarati: "ના (Naa)",
    odia:     "ନାହିଁ (Nahin)",
    malayalam:"ഇല്ല (Illa)"
};

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

    // Hide questions section from previous attempt
    document.getElementById("questionsSection").classList.add("hidden");
    document.getElementById("updatedAnalysis").classList.add("hidden");
    document.getElementById("continueToVision").classList.add("hidden");

    try {
        let data;

        if (recordedBlob) {
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
            document.getElementById("symptoms").value = data.transcribed_text;

        } else {
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

        // Show result — clean question lines from display
        resultBox.className = "result-box";
        resultBox.innerHTML = `
            <strong>📋 Symptom Analysis:</strong>
            <br/><br/>
            🇮🇳 <strong>Local Language:</strong><br/>
            ${formatText(cleanTriageText(data.translated_response))}
            <hr/>
            🇬🇧 <strong>English:</strong><br/>
            ${formatText(cleanTriageText(data.triage_summary))}
            <hr/>
            <small style="color:#666">✅ Analyzed by Groq Llama 3.3 70B</small>
        `;
        resultBox.classList.remove("hidden");

        // Show YES/NO follow-up questions
        showFollowUpQuestions(data.triage_summary);

    } catch (err) {
        resultBox.className = "result-box red";
        resultBox.innerHTML = `❌ Error: ${err.message}. Make sure the backend is running on port 8000.`;
        resultBox.classList.remove("hidden");
    }
}

// ─── CLEAN TRIAGE TEXT ────────────────────────────

function cleanTriageText(text) {
    if (!text) return "";
    return text
        .split('\n')
        .filter(line => {
            const t = line.trim();
            // Remove English question lines
            if (/^QUESTION\s*[123]\s*:/i.test(t)) return false;
            if (/^Q\s*[123]\s*:/i.test(t)) return false;
            // Remove Telugu question lines (ప్రశ్న)
            if (/^ప్రశ్న\s*[123]/i.test(t)) return false;
            // Remove Hindi question lines (प्रश्न)
            if (/^प्रश्न\s*[123]/i.test(t)) return false;
            // Remove Tamil (கேள்வி), Kannada (ಪ್ರಶ್ನೆ), Bengali (প্রশ্ন)
            if (/^(கேள்வி|ಪ್ರಶ್ನೆ|প্রশ্ন|પ્રશ્ન|ପ୍ରଶ୍ନ)\s*[123]/i.test(t)) return false;
            return true;
        })
        .join('\n')
        .trim();
}

// ─── FOLLOW UP QUESTIONS ──────────────────────────

function showFollowUpQuestions(triageText) {
    const language      = document.getElementById("language").value;
    const questionsSection = document.getElementById("questionsSection");
    const questionsList    = document.getElementById("questionsList");

    const questions = [];
    const lines = triageText.split('\n');

    lines.forEach(line => {
        const t = line.trim();

        // Pattern 1: QUESTION1: text
        const m1 = t.match(/^QUESTION\s*[123]\s*:\s*(.+)/i);
        if (m1 && m1[1].trim()) { questions.push(m1[1].trim()); return; }

        // Pattern 2: Q1: text
        const m2 = t.match(/^Q\s*[123]\s*:\s*(.+)/i);
        if (m2 && m2[1].trim()) { questions.push(m2[1].trim()); return; }

        // Pattern 3: 1. text?
        const m3 = t.match(/^[123]\.\s+(.+\?)/);
        if (m3 && m3[1].trim()) { questions.push(m3[1].trim()); return; }
    });

    // Fallback: look inside QUESTIONS: block
    if (questions.length === 0) {
        const block = triageText.match(/QUESTIONS?\s*:\s*(.+?)(?=CONCERN_LEVEL|$)/si);
        if (block) {
            block[1]
                .split(/\n|\|/)
                .map(q => q.replace(/^[-•*\d.]+\s*/, '').trim())
                .filter(q => q.length > 8 && q.includes('?'))
                .forEach(q => questions.push(q));
        }
    }

    // Final fallback defaults
    if (questions.length === 0) {
        questions.push("Do you have fever for more than 3 days?");
        questions.push("Are you experiencing vomiting or nausea?");
        questions.push("Do you have pain in your body or joints?");
    }

    const finalQuestions = questions.slice(0, 3);
    console.log("✅ Parsed questions:", finalQuestions);

    const yesText = YES_TRANSLATIONS[language] || "Yes";
    const noText  = NO_TRANSLATIONS[language]  || "No";

    questionsList.innerHTML = finalQuestions.map((q, i) => `
        <div class="question-item" id="qitem${i}">
            <div class="question-text">Q${i+1}: ${q}</div>
            <div class="answer-buttons">
                <button class="answer-btn yes-btn"
                    onclick="selectAnswer(${i}, 'yes', this)"
                    id="yes_${i}">
                    ✅ Yes / ${yesText}
                </button>
                <button class="answer-btn no-btn"
                    onclick="selectAnswer(${i}, 'no', this)"
                    id="no_${i}">
                    ❌ No / ${noText}
                </button>
            </div>
        </div>
    `).join('');

    window.currentQuestions = finalQuestions;
    window.currentAnswers   = new Array(finalQuestions.length).fill(null);

    questionsSection.classList.remove("hidden");

    // Scroll to questions after short delay
    setTimeout(() => {
        questionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
}

// ─── ANSWER SELECTION ─────────────────────────────

function selectAnswer(questionIndex, answer, btnElement) {
    window.currentAnswers[questionIndex] = answer;

    const yesBtn = document.getElementById(`yes_${questionIndex}`);
    const noBtn  = document.getElementById(`no_${questionIndex}`);
    yesBtn.classList.remove("selected");
    noBtn.classList.remove("selected");
    btnElement.classList.add("selected");

    const qItem = document.getElementById(`qitem${questionIndex}`);
    qItem.style.borderColor = answer === 'yes' ? '#2e7d32' : '#c62828';
}

async function submitAnswers() {
    const answers   = window.currentAnswers  || [];
    const questions = window.currentQuestions || [];

    // Check all answered
    const unanswered = answers.findIndex(a => a === null);
    if (unanswered !== -1) {
        showError(`Please answer Question ${unanswered + 1} before continuing`);
        return;
    }

    const name     = document.getElementById("patientName").value.trim();
    const age      = document.getElementById("age").value;
    const language = document.getElementById("language").value;
    const region   = document.getElementById("region").value;
    const season   = document.getElementById("season").value;
    const symptoms = document.getElementById("symptoms").value.trim();

    // Build Q&A string
    const qaSummary = questions.map((q, i) =>
        `Q: ${q} → Answer: ${answers[i].toUpperCase()}`
    ).join('\n');

    const updatedBox = document.getElementById("updatedAnalysis");
    setLoading(updatedBox, "🔍 Analysing your answers with Groq AI...");

    try {
        const formData = new FormData();
        formData.append("patient_name", name);
        formData.append("age", age);
        formData.append("language", language);
        formData.append("symptoms_text", symptoms);
        formData.append("questions_and_answers", qaSummary);
        formData.append("region", region);
        formData.append("season", season);

        const res  = await fetch(`${API}/analyze-answers`, { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Analysis failed");

        // Update triageSummary with richer data for diagnosis
        triageSummary = data.updated_summary;

        updatedBox.className = "result-box";
        updatedBox.innerHTML = `
            <strong>🔍 Updated Analysis (based on your answers):</strong>
            <br/><br/>
            🇮🇳 <strong>Local Language:</strong><br/>
            ${formatText(data.translated_summary)}
            <hr/>
            🇬🇧 <strong>English:</strong><br/>
            ${formatText(data.updated_summary)}
            <hr/>
            <small style="color:#666">✅ Updated by Groq Llama 3.3 70B</small>
        `;
        updatedBox.classList.remove("hidden");

        // Hide questions after submit
        document.getElementById("questionsSection").classList.add("hidden");

        // Show continue button
        document.getElementById("continueToVision").classList.remove("hidden");

        // Scroll to updated analysis
        setTimeout(() => {
            updatedBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);

    } catch (err) {
        updatedBox.className = "result-box red";
        updatedBox.innerHTML = `❌ Error: ${err.message}`;
        updatedBox.classList.remove("hidden");
        document.getElementById("continueToVision").classList.remove("hidden");
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
        audioChunks  = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            recordedBlob = new Blob(audioChunks, { type: "audio/webm" });
            const url    = URL.createObjectURL(recordedBlob);
            const playback = document.getElementById("audioPlayback");
            playback.src = url;
            playback.classList.remove("hidden");
            document.getElementById("recordingStatus").textContent = "⏳ Transcribing...";
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

// ─── TRANSCRIPTION PREVIEW ────────────────────────

async function previewTranscription() {
    const language          = document.getElementById("language").value;
    const reviewBox         = document.getElementById("transcriptionReview");
    const transcribedTextArea = document.getElementById("transcribedText");

    reviewBox.classList.remove("hidden");
    transcribedTextArea.value       = "";
    transcribedTextArea.placeholder = "⏳ Transcribing your voice...";
    transcribedTextArea.disabled    = true;

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

        const res  = await fetch(`${API}/transcribe-only`, { method: "POST", body: formData });
        const data = await res.json();

        if (res.ok && data.transcribed_text) {
            transcribedTextArea.value       = data.transcribed_text;
            transcribedTextArea.disabled    = false;
            transcribedTextArea.placeholder = "Edit if anything is wrong...";
            document.getElementById("recordingStatus").textContent = "✅ Transcribed — check & edit below";
        } else {
            throw new Error("Transcription failed");
        }

    } catch (err) {
        transcribedTextArea.disabled    = false;
        transcribedTextArea.placeholder = "Could not transcribe — type symptoms manually";
        transcribedTextArea.value       = "";
        document.getElementById("recordingStatus").textContent = "⚠️ Could not transcribe";
    }
}

function useTranscription() {
    const transcribedText = document.getElementById("transcribedText").value.trim();
    if (!transcribedText) {
        showError("Transcription is empty — please type symptoms manually");
        return;
    }
    document.getElementById("symptoms").value = transcribedText;
    document.getElementById("transcriptionReview").classList.add("hidden");
    document.getElementById("recordingStatus").textContent = "✅ Text copied to symptoms";
    recordedBlob = null;
    document.getElementById("symptoms").focus();
}

function reRecord() {
    recordedBlob = null;
    document.getElementById("transcriptionReview").classList.add("hidden");
    document.getElementById("audioPlayback").classList.add("hidden");
    document.getElementById("audioPlayback").src = "";
    document.getElementById("recordingStatus").textContent = "";
    document.getElementById("recordBtn").textContent = "🎤 Start Recording";
    document.getElementById("recordBtn").classList.remove("recording");
    isRecording = false;
}

// ─── STEP 3: IMAGE ANALYSIS ───────────────────────

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById("previewImg").src = e.target.result;
            document.getElementById("imagePreview").classList.remove("hidden");
            document.getElementById("analyzeImgBtn").disabled = false;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function analyzeImage() {
    const file      = document.getElementById("imageUpload").files[0];
    const language  = document.getElementById("language").value;
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
    const name      = document.getElementById("patientName").value.trim();
    const age       = document.getElementById("age").value;
    const language  = document.getElementById("language").value;
    const region    = document.getElementById("region").value;
    const ashaPhone = document.getElementById("ashaPhone").value.trim();
    const resultBox = document.getElementById("diagnosisResult");

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
        formData.append("asha_email", ashaPhone);

        const res  = await fetch(`${API}/diagnose`, { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Diagnosis failed");

        const urgency      = data.urgency_level;
        const colorClass   = urgency.toLowerCase();
        const urgencyEmoji = { RED: "🔴", YELLOW: "🟡", GREEN: "🟢" }[urgency] || "⚪";
        const urgencyLabel = { RED: "EMERGENCY", YELLOW: "NEEDS ATTENTION", GREEN: "STABLE" }[urgency] || urgency;

        resultBox.className = `result-box ${colorClass}`;
        resultBox.innerHTML = `
            <div class="urgency-banner ${colorClass}">
                ${urgencyEmoji} ${urgencyLabel}
            </div>

            <div class="lang-section english-section">
                <div class="lang-header">🇬🇧 English</div>
                <div class="lang-content">
                    <strong>🩺 Diagnosis:</strong> ${data.probable_diagnosis}<br/><br/>
                    <strong>⚠️ Reason:</strong> ${data.urgency_reason}<br/><br/>
                    <strong>🏠 First Aid:</strong> ${formatText(data.first_aid)}<br/><br/>
                    <strong>📍 Next Action:</strong> ${data.recommended_action}
                </div>
            </div>

            <div class="medicine-box">
                <div class="medicine-title">💊 Suggested Medicines</div>
                ${formatMedicines(data.medicines)}
                <div class="medicine-warning">⚠️ ${data.medicine_warning}</div>
            </div>

            <div class="remedy-box">
                <div class="remedy-title">🌿 Home Remedies</div>
                ${formatRemedies(data.home_remedies)}
            </div>

            <div class="lang-section local-section">
                <div class="lang-header">🇮🇳 Local Language / స్థానీయ భాష / स्थानीय भाषा</div>
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
                ⚠️ AI assistance only — always consult a doctor
            </small>
        `;
        resultBox.classList.remove("hidden");

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

    ["patientName","age","symptoms","ashaPhone"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    ["triageResult","imageResult","diagnosisResult","updatedAnalysis"].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.innerHTML = ""; el.classList.add("hidden"); }
    });

    document.getElementById("imagePreview").classList.add("hidden");
    document.getElementById("imageUpload").value = "";
    document.getElementById("analyzeImgBtn").disabled = true;
    document.getElementById("audioPlayback").classList.add("hidden");
    document.getElementById("audioSection").classList.add("hidden");
    document.getElementById("audioPlayback").src = "";
    document.getElementById("recordBtn").textContent = "🎤 Start Recording";
    document.getElementById("recordingStatus").textContent = "";
    document.getElementById("questionsSection").classList.add("hidden");

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
    text = cleanTriageText(text);
    return text
        .replace(/\n/g, "<br/>")
        .replace(/SUMMARY:/g, "<strong>Summary:</strong>")
        .replace(/QUESTIONS:/g, "<strong>Questions:</strong>")
        .replace(/CONCERN_LEVEL:/g, "<strong>Concern Level:</strong>")
        .replace(/FINDINGS:/g, "<strong>Findings:</strong>")
        .replace(/SEVERITY:/g, "<strong>Severity:</strong>")
        .replace(/POSSIBLE_CONDITION:/g, "<strong>Possible Condition:</strong>")
        .replace(/LIKELY_DISEASE:/g, "<strong>Likely Disease:</strong>")
        .replace(/REASON:/g, "<strong>Reason:</strong>");
}

function showError(msg) {
    alert(`⚠️ ${msg}`);
}

// ─── MEDICINE FORMATTER ───────────────────────────

function formatMedicines(medicinesStr) {
    if (!medicinesStr) return "<p>No medicines suggested</p>";

    const medicines = medicinesStr.split("|").map(m => m.trim()).filter(Boolean);
    if (medicines.length === 0) return `<p>${medicinesStr}</p>`;

    return medicines.map(med => {
        const parts     = med.split("-").map(p => p.trim());
        const name      = parts[0] || "";
        const dosage    = parts[1] || "";
        const frequency = parts[2] || "";
        const purpose   = parts[3] || "";

        return `
        <div class="medicine-item">
            <div class="medicine-name">💊 ${name}</div>
            <div class="medicine-details">
                ${dosage    ? `<span class="med-tag">📏 ${dosage}</span>`    : ""}
                ${frequency ? `<span class="med-tag">🕐 ${frequency}</span>` : ""}
                ${purpose   ? `<span class="med-tag">🎯 ${purpose}</span>`   : ""}
            </div>
        </div>`;
    }).join("");
}

function formatRemedies(remediesStr) {
    if (!remediesStr) return "<p>No home remedies available</p>";

    const remedies = remediesStr.split("|").map(r => r.trim()).filter(Boolean);
    if (remedies.length === 0) return `<p>${remediesStr}</p>`;

    return remedies.map(r => `<div class="remedy-item">🌿 ${r}</div>`).join("");
}

// ─── LOCAL ADVICE FORMATTER ───────────────────────

function formatLocalAdvice(advice) {
    if (!advice) return "";
    return advice
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
        .replace(/\|/g, '<br/>• ')
        .replace(/(<br\s*\/?>){3,}/gi, '<br/><br/>')
        .replace(/^(<br\s*\/?>)+/i, '')
        .trim();
}

// ─── INIT ─────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    goToStep1();
    console.log("🏥 GramSehat initialized — Powered by Groq");
});