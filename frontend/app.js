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

// ─── HOSPITAL DATA ────────────────────────────────
const HOSPITALS_BY_REGION = {
    "andhra pradesh": [
        { name: "Government General Hospital Guntur", type: "Government", distance: "District HQ", phone: "0863-2226111", emergency: true },
        { name: "King George Hospital Visakhapatnam", type: "Government", distance: "Major City", phone: "0891-2564891", emergency: true },
        { name: "SVIMS Tirupati", type: "Government", distance: "Major City", phone: "0877-2287777", emergency: true },
        { name: "Ramesh Hospitals", type: "Private", distance: "Guntur", phone: "0863-2344444", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ],
    "telangana": [
        { name: "Osmania General Hospital", type: "Government", distance: "Hyderabad", phone: "040-24600124", emergency: true },
        { name: "Gandhi Hospital Hyderabad", type: "Government", distance: "Hyderabad", phone: "040-29027889", emergency: true },
        { name: "NIMS Hyderabad", type: "Government", distance: "Hyderabad", phone: "040-23489000", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ],
    "maharashtra": [
        { name: "JJ Hospital Mumbai", type: "Government", distance: "Mumbai", phone: "022-23735555", emergency: true },
        { name: "Sassoon General Hospital Pune", type: "Government", distance: "Pune", phone: "020-26128000", emergency: true },
        { name: "Civil Hospital Nagpur", type: "Government", distance: "Nagpur", phone: "0712-2565011", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ],
    "uttar pradesh": [
        { name: "KGMU Lucknow", type: "Government", distance: "Lucknow", phone: "0522-2257540", emergency: true },
        { name: "SN Medical College Agra", type: "Government", distance: "Agra", phone: "0562-2411100", emergency: true },
        { name: "BHU Hospital Varanasi", type: "Government", distance: "Varanasi", phone: "0542-2307402", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ],
    "bihar": [
        { name: "PMCH Patna", type: "Government", distance: "Patna", phone: "0612-2300399", emergency: true },
        { name: "IGIMS Patna", type: "Government", distance: "Patna", phone: "0612-2297631", emergency: true },
        { name: "DMCH Darbhanga", type: "Government", distance: "Darbhanga", phone: "06272-222555", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ],
    "rajasthan": [
        { name: "SMS Hospital Jaipur", type: "Government", distance: "Jaipur", phone: "0141-2518888", emergency: true },
        { name: "MDM Hospital Jodhpur", type: "Government", distance: "Jodhpur", phone: "0291-2434374", emergency: true },
        { name: "RNT Medical College Udaipur", type: "Government", distance: "Udaipur", phone: "0294-2428811", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ],
    "west bengal": [
        { name: "SSKM Hospital Kolkata", type: "Government", distance: "Kolkata", phone: "033-22044382", emergency: true },
        { name: "NRS Medical College Kolkata", type: "Government", distance: "Kolkata", phone: "033-22143200", emergency: true },
        { name: "North Bengal Medical College", type: "Government", distance: "Siliguri", phone: "0353-2580723", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ],
    "odisha": [
        { name: "SCB Medical College Cuttack", type: "Government", distance: "Cuttack", phone: "0671-2414004", emergency: true },
        { name: "MKCG Medical College Berhampur", type: "Government", distance: "Berhampur", phone: "0680-2227362", emergency: true },
        { name: "Capital Hospital Bhubaneswar", type: "Government", distance: "Bhubaneswar", phone: "0674-2394006", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ],
    "tamil nadu": [
        { name: "Rajiv Gandhi Govt Hospital Chennai", type: "Government", distance: "Chennai", phone: "044-25305000", emergency: true },
        { name: "Madurai Govt Hospital", type: "Government", distance: "Madurai", phone: "0452-2532535", emergency: true },
        { name: "Coimbatore Medical College", type: "Government", distance: "Coimbatore", phone: "0422-2301945", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ],
    "gujarat": [
        { name: "Civil Hospital Ahmedabad", type: "Government", distance: "Ahmedabad", phone: "079-22681111", emergency: true },
        { name: "SSG Hospital Vadodara", type: "Government", distance: "Vadodara", phone: "0265-2422600", emergency: true },
        { name: "GG Hospital Jamnagar", type: "Government", distance: "Jamnagar", phone: "0288-2553270", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ],
    "assam": [
        { name: "GMCH Guwahati", type: "Government", distance: "Guwahati", phone: "0361-2529457", emergency: true },
        { name: "Jorhat Medical College", type: "Government", distance: "Jorhat", phone: "0376-2320073", emergency: true },
        { name: "Silchar Medical College", type: "Government", distance: "Silchar", phone: "03842-224396", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ],
    "jharkhand": [
        { name: "RIMS Ranchi", type: "Government", distance: "Ranchi", phone: "0651-2540381", emergency: true },
        { name: "MGM Medical College Jamshedpur", type: "Government", distance: "Jamshedpur", phone: "0657-2234788", emergency: true },
        { name: "Palamu Medical College", type: "Government", distance: "Palamu", phone: "06562-222345", emergency: true },
        { name: "Nearest PHC", type: "PHC", distance: "~5km", phone: "104", emergency: false }
    ]
};

// National Emergency Numbers
const EMERGENCY_NUMBERS = [
    { name: "National Ambulance", number: "108", icon: "🚑" },
    { name: "Health Helpline", number: "104", icon: "🏥" },
    { name: "Police", number: "100", icon: "👮" },
    { name: "National Emergency", number: "112", icon: "🆘" }
];

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

function goToStep5() {
    showCard(5);
    setPipeActive(5);
}

function goToStep5Back() {
    showCard(4);
    setPipeActive(4);
}

function showCard(n) {
    [1,2,3,4,5].forEach(i => {
        const card = document.getElementById(`card${i}`);
        if (card) card.classList.toggle("hidden", i !== n);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setPipeActive(n) {
    [1,2,3,4,5].forEach(i => {
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
        formData.append("report_findings", reportFindings || "");
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
        savePatientHistory(name, age, data);
        // Show nearest hospitals
        showNearestHospitals(region, urgency);
        document.getElementById("hospitalSection").classList.remove("hidden");
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

    reportFindings = "";
    document.getElementById("reportUpload").value = "";
    document.getElementById("analyzeReportBtn").disabled = true;

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

    ["continueToVision","continueTodiagnosis","continueTodiagnosis2",
 "restartSection","hospitalSection","reportResult","reportPreview"].forEach(id => {
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

// ─── PATIENT HISTORY ──────────────────────────────

function savePatientHistory(name, age, diagnosisData) {
    try {
        const history = JSON.parse(localStorage.getItem("gramsehat_history") || "[]");
        const record = {
            id: Date.now(),
            date: new Date().toLocaleDateString("en-IN"),
            time: new Date().toLocaleTimeString("en-IN"),
            name: name,
            age: age,
            language: document.getElementById("language").value,
            region: document.getElementById("region").value,
            season: document.getElementById("season").value,
            symptoms: document.getElementById("symptoms").value,
            diagnosis: diagnosisData.probable_diagnosis,
            urgency: diagnosisData.urgency_level,
            urgency_reason: diagnosisData.urgency_reason,
            first_aid: diagnosisData.first_aid,
            action: diagnosisData.recommended_action,
            medicines: diagnosisData.medicines,
            home_remedies: diagnosisData.home_remedies
        };
        history.unshift(record); // Add to beginning
        // Keep only last 100 patients
        if (history.length > 100) history.pop();
        localStorage.setItem("gramsehat_history", JSON.stringify(history));
        console.log("✅ Patient saved to history:", name);
    } catch (e) {
        console.error("Could not save history:", e);
    }
}

// ─── DASHBOARD ────────────────────────────────────

let currentUrgencyFilter = "ALL";

function openDashboard() {
    renderDashboard();
    document.getElementById("dashboardModal").classList.remove("hidden");
}

function closeDashboard() {
    document.getElementById("dashboardModal").classList.add("hidden");
}

function closeDetail() {
    document.getElementById("patientDetailModal").classList.add("hidden");
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem("gramsehat_history") || "[]");
    } catch { return []; }
}

function renderDashboard() {
    const history = getHistory();

    // Stats
    const total  = history.length;
    const red    = history.filter(p => p.urgency === "RED").length;
    const yellow = history.filter(p => p.urgency === "YELLOW").length;
    const green  = history.filter(p => p.urgency === "GREEN").length;

    document.getElementById("dashboardStats").innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${total}</div>
            <div class="stat-label">Total Patients</div>
        </div>
        <div class="stat-card red-stat">
            <div class="stat-number">${red}</div>
            <div class="stat-label">🔴 Emergency</div>
        </div>
        <div class="stat-card yellow-stat">
            <div class="stat-number">${yellow}</div>
            <div class="stat-label">🟡 Urgent</div>
        </div>
        <div class="stat-card green-stat">
            <div class="stat-number">${green}</div>
            <div class="stat-label">🟢 Stable</div>
        </div>
    `;

    renderHistoryList(history);
}

function renderHistoryList(history) {
    const listEl = document.getElementById("historyList");

    if (history.length === 0) {
        listEl.innerHTML = `
            <div class="empty-history">
                <div style="font-size:3rem">📋</div>
                <div>No patients recorded yet</div>
                <div style="font-size:0.82rem; color:var(--text-muted); margin-top:4px">
                    Complete a diagnosis to see history here
                </div>
            </div>`;
        return;
    }

    listEl.innerHTML = history.map(p => `
        <div class="history-item" onclick="showPatientDetail(${p.id})">
            <div class="history-left">
                <div class="history-name">${p.name}, ${p.age}y</div>
                <div class="history-diagnosis">${p.diagnosis}</div>
                <div class="history-meta">📅 ${p.date} ${p.time} · 📍 ${p.region}</div>
            </div>
            <div class="history-right">
                <span class="urgency-badge ${p.urgency.toLowerCase()}">
                    ${{ RED:"🔴", YELLOW:"🟡", GREEN:"🟢" }[p.urgency]} ${p.urgency}
                </span>
            </div>
        </div>
    `).join('');
}

function filterByUrgency(urgency, btn) {
    currentUrgencyFilter = urgency;

    // Update button styles
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    filterHistory();
}

function filterHistory() {
    let history = getHistory();
    const search = document.getElementById("historySearch").value.toLowerCase();

    if (currentUrgencyFilter !== "ALL") {
        history = history.filter(p => p.urgency === currentUrgencyFilter);
    }

    if (search) {
        history = history.filter(p =>
            p.name.toLowerCase().includes(search) ||
            p.diagnosis.toLowerCase().includes(search)
        );
    }

    renderHistoryList(history);
}

function showPatientDetail(id) {
    const history = getHistory();
    const p = history.find(p => p.id === id);
    if (!p) return;

    const urgencyEmoji = { RED:"🔴", YELLOW:"🟡", GREEN:"🟢" }[p.urgency] || "⚪";

    document.getElementById("patientDetailContent").innerHTML = `
        <div class="detail-header ${p.urgency.toLowerCase()}">
            ${urgencyEmoji} ${p.urgency} — ${p.diagnosis}
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <span class="detail-label">👤 Name</span>
                <span>${p.name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">🎂 Age</span>
                <span>${p.age} years</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">📅 Date</span>
                <span>${p.date} ${p.time}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">📍 Region</span>
                <span>${p.region}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">🌧️ Season</span>
                <span>${p.season}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">🗣️ Language</span>
                <span>${p.language}</span>
            </div>
        </div>

        <div class="detail-section">
            <strong>📝 Symptoms:</strong>
            <p>${p.symptoms}</p>
        </div>

        <div class="detail-section">
            <strong>⚠️ Reason:</strong>
            <p>${p.urgency_reason}</p>
        </div>

        <div class="detail-section">
            <strong>🏠 First Aid:</strong>
            <p>${p.first_aid}</p>
        </div>

        <div class="detail-section">
            <strong>📍 Action:</strong>
            <p>${p.action}</p>
        </div>

        <div class="detail-section">
            <strong>💊 Medicines:</strong>
            <p>${p.medicines}</p>
        </div>

        <div class="detail-section">
            <strong>🌿 Home Remedies:</strong>
            <p>${p.home_remedies}</p>
        </div>
    `;

    document.getElementById("patientDetailModal").classList.remove("hidden");
}

function exportCSV() {
    const history = getHistory();
    if (history.length === 0) {
        showError("No patient history to export!");
        return;
    }

    const headers = ["Date","Time","Name","Age","Region","Season","Language",
                     "Symptoms","Diagnosis","Urgency","First Aid","Action","Medicines"];

    const rows = history.map(p => [
        p.date, p.time, p.name, p.age, p.region, p.season, p.language,
        `"${p.symptoms.replace(/"/g,'""')}"`,
        `"${p.diagnosis.replace(/"/g,'""')}"`,
        p.urgency,
        `"${p.first_aid.replace(/"/g,'""')}"`,
        `"${p.action.replace(/"/g,'""')}"`,
        `"${p.medicines.replace(/"/g,'""')}"`
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `gramsehat_patients_${new Date().toLocaleDateString("en-IN").replace(/\//g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function clearHistory() {
    if (confirm("⚠️ Are you sure you want to delete all patient history? This cannot be undone.")) {
        localStorage.removeItem("gramsehat_history");
        renderDashboard();
    }
}

// ─── HOSPITAL FINDER ──────────────────────────────

function showNearestHospitals(region, urgency) {
    const hospitals = HOSPITALS_BY_REGION[region.toLowerCase()] || [];
    const listEl    = document.getElementById("hospitalList");

    // Emergency numbers section
    const emergencyHTML = `
        <div class="emergency-numbers">
            <div class="emergency-title">🆘 Emergency Numbers — Call Now</div>
            <div class="emergency-grid">
                ${EMERGENCY_NUMBERS.map(e => `
                    <a href="tel:${e.number}" class="emergency-card">
                        <div class="emergency-icon">${e.icon}</div>
                        <div class="emergency-number">${e.number}</div>
                        <div class="emergency-name">${e.name}</div>
                    </a>
                `).join('')}
            </div>
        </div>
    `;

    // Hospitals list
    const hospitalsHTML = hospitals.length > 0 ? `
        <div class="hospitals-title">
            🏥 Hospitals in ${region.charAt(0).toUpperCase() + region.slice(1)}
        </div>
        ${hospitals.map(h => `
            <div class="hospital-item ${h.type.toLowerCase()}">
                <div class="hospital-left">
                    <div class="hospital-name">${h.name}</div>
                    <div class="hospital-meta">
                        <span class="hospital-type-badge ${h.type.toLowerCase()}">${h.type}</span>
                        <span>📍 ${h.distance}</span>
                        ${h.emergency ? '<span class="emergency-badge">✅ 24/7 Emergency</span>' : ''}
                    </div>
                </div>
                <a href="tel:${h.phone}" class="call-btn">
                    📞 ${h.phone}
                </a>
            </div>
        `).join('')}
    ` : `<p style="padding:16px; color:var(--text-muted)">
            No hospital data available for this region yet.
         </p>`;

    listEl.innerHTML = emergencyHTML + hospitalsHTML;
}

// ─── MEDICAL REPORTS ──────────────────────────────

let reportFindings = "";

function previewReport(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const fileName = file.name;
    const isImage  = file.type.startsWith("image/");

    // Show preview box
    document.getElementById("reportPreview").classList.remove("hidden");
    document.getElementById("reportFileName").textContent = `📄 ${fileName}`;
    document.getElementById("analyzeReportBtn").disabled = false;

    // Show image preview if it's an image
    const imgPreview = document.getElementById("reportImgPreview");
    if (isImage) {
        const reader = new FileReader();
        reader.onload = e => {
            imgPreview.src = e.target.result;
            imgPreview.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    } else {
        imgPreview.classList.add("hidden");
    }
}

function removeReport() {
    document.getElementById("reportUpload").value = "";
    document.getElementById("reportPreview").classList.add("hidden");
    document.getElementById("reportImgPreview").classList.add("hidden");
    document.getElementById("analyzeReportBtn").disabled = true;
    reportFindings = "";
}

async function analyzeReport() {
    const file       = document.getElementById("reportUpload").files[0];
    const reportType = document.getElementById("reportType").value;
    const language   = document.getElementById("language").value;
    const resultBox  = document.getElementById("reportResult");

    if (!file) { showError("Please upload a report first"); return; }

    setLoading(resultBox, "📄 Analyzing medical report with AI...");

    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("report_type", reportType);
        formData.append("symptom_context", triageSummary || "General health checkup");
        formData.append("language", language);

        const res  = await fetch(`${API}/analyze-report`, { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Report analysis failed");

        reportFindings = data.report_findings;

        resultBox.className = "result-box";
        resultBox.innerHTML = `
            <strong>📋 Report Analysis:</strong>
            <br/><br/>
            🇬🇧 <strong>English:</strong><br/>
            ${formatText(data.report_findings)}
            <hr/>
            🇮🇳 <strong>Local Language:</strong><br/>
            ${formatText(data.translated_findings)}
            <hr/>
            <small style="color:#666">
                ✅ Analyzed by Groq Llama 4 Vision
            </small>
        `;
        resultBox.classList.remove("hidden");
        document.getElementById("continueTodiagnosis2").classList.remove("hidden");

    } catch (err) {
        resultBox.className = "result-box red";
        resultBox.innerHTML = `❌ Error: ${err.message}`;
        resultBox.classList.remove("hidden");
        document.getElementById("continueTodiagnosis2").classList.remove("hidden");
    }
}

// ─── INIT ─────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    goToStep1();
    console.log("🏥 GramSehat initialized — Powered by Groq");
});