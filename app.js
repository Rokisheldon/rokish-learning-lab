(() => {
  "use strict";
  const content = window.MSINGI_CONTENT;
  const curriculum = window.MSINGI_CURRICULUM;
  const labActivities = window.ROKISH_LAB_ACTIVITIES;
  const root = document.getElementById("view-root");
  const toast = document.getElementById("toast");
  const progressKey = "msingi-lab-progress-v1";
  let state = loadState();
  let activeFilter = "All";
  let searchTerm = "";
  let activeGrade = 1;
  let activeTrack = "mathematics";
  let activeLabArea = "All";
  let activeFlashcardIndex = 0;
  let flashcardRevealed = false;
  let activeGameLevel = "all";
  let activeGameMode = "quest";
  let mathGame = { status: "idle", round: [], current: 0, score: 0, streak: 0, correct: 0, answered: false };
  let toastTimer;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || "{}");
      return {
        completed: Array.isArray(saved.completed) ? saved.completed.filter(id => content.lessons.some(lesson => lesson.id === id)) : [],
        attempts: Number.isFinite(saved.attempts) ? saved.attempts : 0,
        correct: Number.isFinite(saved.correct) ? saved.correct : 0,
        lastLesson: typeof saved.lastLesson === "string" ? saved.lastLesson : null,
        bestGameScore: Number.isFinite(saved.bestGameScore) && saved.bestGameScore >= 0 ? saved.bestGameScore : 0,
        tasks: Array.isArray(saved.tasks) ? saved.tasks.filter(task =>
          task && typeof task.id === "string" && typeof task.title === "string" &&
          typeof task.done === "boolean" &&
          (task.due === "" || typeof task.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.due)) &&
          (task.lessonId === "" || content.lessons.some(lesson => lesson.id === task.lessonId))
        ).map(task => ({ id: task.id, title: task.title.slice(0, 120), due: task.due, lessonId: task.lessonId, done: task.done })) : []
      };
    } catch (error) {
      console.warn("Could not read saved learning progress.", error);
      return { completed: [], attempts: 0, correct: 0, lastLesson: null, bestGameScore: 0, tasks: [] };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(progressKey, JSON.stringify(state));
    } catch (error) {
      console.error("Could not save learning progress.", error);
      showToast("Progress could not be saved on this device.");
    }
  }

  const completedLessons = () => content.lessons.filter(item => state.completed.includes(item.id));
  const scorePercent = () => state.attempts ? Math.round((state.correct / state.attempts) * 100) : 0;
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const flashcards = [
    ...content.lessons.map(lesson => ({
      question: lesson.check.question,
      answer: `${lesson.check.options[lesson.check.answer]} — ${lesson.check.feedback}`,
      source: lesson.title,
      detail: `${lesson.subject} · ${lesson.grade}`,
      color: lesson.color
    })),
    ...curriculum.flatMap(grade => ["mathematics", "stem"].map(track => {
      const plan = grade[track];
      return {
        question: plan.assessment.question,
        answer: `${plan.assessment.options[plan.assessment.answer]} — ${plan.assessment.feedback}`,
        source: `Grade ${grade.grade}: ${plan.title}`,
        detail: track === "mathematics" ? "Mathematics" : "Integrated STEM",
        color: track === "mathematics" ? "mint" : "sky"
      };
    }))
  ];
  const mathQuestions = [
    ...content.lessons.filter(lesson => lesson.subject === "Mathematics").map(lesson => ({
      question: lesson.check.question,
      options: lesson.check.options,
      answer: lesson.check.answer,
      feedback: lesson.check.feedback,
      source: lesson.title,
      grade: lesson.grade,
      level: lesson.grade.includes("7–9") ? "junior" : "senior"
    })),
    ...curriculum.map(grade => ({
      question: grade.mathematics.assessment.question,
      options: grade.mathematics.assessment.options,
      answer: grade.mathematics.assessment.answer,
      feedback: grade.mathematics.assessment.feedback,
      source: `Grade ${grade.grade}: ${grade.mathematics.title}`,
      grade: `Grade ${grade.grade}`,
      level: grade.grade <= 6 ? "primary" : grade.grade <= 9 ? "junior" : "senior"
    }))
  ];
  function createPatternQuestion() {
    const level = activeGameLevel === "all"
      ? ["primary", "junior", "senior"][Math.floor(Math.random() * 3)]
      : activeGameLevel;
    let terms;
    let answer;
    let distractors;
    let rule;
    if (level === "primary") {
      const start = 2 + Math.floor(Math.random() * 12);
      const step = 2 + Math.floor(Math.random() * 5);
      terms = [start, start + step, start + 2 * step, start + 3 * step];
      answer = start + 4 * step;
      distractors = [answer - step, answer + step, answer + 2 * step];
      rule = `The pattern adds ${step} each time.`;
    } else if (level === "junior") {
      const start = 1 + Math.floor(Math.random() * 8);
      const step = 2 + Math.floor(Math.random() * 3);
      terms = [start, start + step, start + 2 * step + 1, start + 3 * step + 3];
      answer = start + 4 * step + 6;
      distractors = [terms[3] + step, answer + step + 1, answer + 2 * (step + 3)];
      rule = `The amount added grows by 1 each time: +${step}, +${step + 1}, +${step + 2}, then +${step + 3}.`;
    } else {
      const start = 2 + Math.floor(Math.random() * 4);
      const multiplier = 2 + Math.floor(Math.random() * 2);
      terms = [start, start * multiplier, start * multiplier ** 2];
      answer = start * multiplier ** 3;
      distractors = [answer / multiplier, answer + multiplier, answer * multiplier];
      rule = `Each term is multiplied by ${multiplier}.`;
    }
    const options = [answer, ...distractors].map(String);
    for (let index = options.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
    }
    const grade = level === "primary" ? "Grades 1–6" : level === "junior" ? "Grades 7–9" : "Grades 10–12";
    return {
      question: `Pattern Detective: what comes next? ${terms.join(", ")}, …`,
      options,
      answer: options.indexOf(String(answer)),
      feedback: rule,
      source: "Number patterns",
      grade,
      level
    };
  }

  function assessmentMarkup(assessment, id, context = "") {
    return `<form class="topic-assessment" data-assessment ${context}>
      <fieldset class="assessment-fieldset">
        <legend>${escapeHtml(assessment.question)}</legend>
        <div class="answer-options">${assessment.options.map((option, index) => `<label class="answer-option"><input type="radio" name="answer-${id}" value="${index}" required><span class="option-letter" aria-hidden="true">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span></label>`).join("")}</div>
      </fieldset>
      <button class="button button-dark assessment-submit" type="submit">Check answer</button>
      <div class="answer-feedback" role="status" aria-live="polite" aria-atomic="true" tabindex="-1"></div>
    </form>`;
  }

  function assessmentFor(form) {
    if (form.dataset.lesson) {
      const lesson = content.lessons.find(item => item.id === form.dataset.lesson);
      return lesson && lesson.check;
    }
    const grade = curriculum.find(item => item.grade === Number(form.dataset.grade));
    return grade && grade[form.dataset.track] && grade[form.dataset.track].assessment;
  }

  function submitAssessment(form) {
    const assessment = assessmentFor(form);
    const selected = form.querySelector('input[type="radio"]:checked');
    if (!assessment || !selected) return;

    const chosen = Number(selected.value);
    const correct = chosen === assessment.answer;
    state.attempts += 1;
    if (correct) state.correct += 1;
    saveState();

    form.querySelectorAll('input[type="radio"]').forEach((input, index) => {
      input.disabled = true;
      const option = input.closest(".answer-option");
      if (index === assessment.answer) {
        option.classList.add("correct");
        option.insertAdjacentHTML("beforeend", '<span class="answer-status">Correct answer</span>');
      } else if (index === chosen) {
        option.classList.add("incorrect");
        option.insertAdjacentHTML("beforeend", '<span class="answer-status">Your answer</span>');
      }
    });

    const feedback = form.querySelector(".answer-feedback");
    const correctAnswer = assessment.options[assessment.answer];
    feedback.className = `answer-feedback visible ${correct ? "is-correct" : "is-incorrect"}`;
    feedback.textContent = `${correct ? "Correct." : `Not quite. The correct answer is ${correctAnswer}.`} ${assessment.feedback}`;
    form.querySelector(".assessment-submit").disabled = true;
    feedback.focus();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
  }

  function progressBar(value, extraClass = "") {
    return `<div class="progress-track ${extraClass}" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100"><span style="width:${value}%"></span></div>`;
  }

  function lessonCard(lesson, index) {
    const done = state.completed.includes(lesson.id);
    return `<button class="lesson-card" data-lesson="${lesson.id}" style="--card-delay:${index * 45}ms">
      <span class="lesson-icon ${lesson.color}">${lesson.icon}</span>
      <span class="lesson-card-content"><span class="lesson-meta">${escapeHtml(lesson.subject)} <i>·</i> ${escapeHtml(lesson.grade)}</span><strong>${escapeHtml(lesson.title)}</strong><span class="lesson-summary">${escapeHtml(lesson.summary)}</span><span class="lesson-bottom"><span>◷ ${escapeHtml(lesson.duration)}</span><span class="card-action">${done ? "Review lesson ✓" : "Start lesson →"}</span></span></span>
      ${done ? '<span class="completed-dot" aria-label="Completed">✓</span>' : ""}
    </button>`;
  }

  function homeView() {
    return `<section class="home-hero" aria-labelledby="home-welcome-title">
      <div class="home-hero-copy"><span class="eyebrow">A FRESH DAY, A FRESH DISCOVERY</span><h1 id="home-welcome-title">Welcome home,<br><em>Sheldon!</em></h1><p>We’re glad you’re here. Get curious, take things one step at a time, and make today a good day for learning.</p></div>
      <span class="home-hero-tag" aria-hidden="true">LEARN · GROW · SHINE</span>
    </section>`;
  }

  function learnView() {
    const filters = ["All", "Mathematics", "Computer Studies", "Junior secondary", "Senior secondary"];
    const filtered = content.lessons.filter(item => {
      const filterMatch = activeFilter === "All" || item.subject === activeFilter || item.level === activeFilter;
      const query = searchTerm.toLowerCase();
      const textMatch = !query || `${item.title} ${item.summary} ${item.subject} ${item.unit} ${item.grade}`.toLowerCase().includes(query);
      return filterMatch && textMatch;
    });
    return `<section class="page-intro"><span class="eyebrow"><span class="eyebrow-line"></span> YOUR LEARNING LIBRARY</span><h1>Explore <em>lessons.</em></h1><p>Clear explanations and quick checks for Mathematics and Computer Studies. Browse the Curriculum 1–12 section for grade-by-grade original STEM plans.</p></section>
      <section class="library-tools"><label class="search-box"><span>⌕</span><input id="lesson-search" type="search" placeholder="Search a topic, subject or idea..." value="${escapeHtml(searchTerm)}" aria-label="Search lessons"></label><div class="filter-row">${filters.map(filter => `<button class="filter-chip ${filter === activeFilter ? "selected" : ""}" data-filter="${filter}">${filter}</button>`).join("")}</div></section>
      <div class="results-line">${filtered.length} ${filtered.length === 1 ? "lesson" : "lessons"} <span>·</span> Start anywhere, go at your own pace.</div>
      <div class="lesson-grid library-grid">${filtered.map(lessonCard).join("") || '<div class="empty-state"><span>⌕</span><strong>No lessons found</strong><p>Try a different search or filter.</p></div>'}</div>`;
  }

  function diagramMarkup(type, label) {
    const diagrams = {
      place: `<svg viewBox="0 0 300 116" role="img" aria-label="Tens and ones diagram"><text x="74" y="20">TENS</text><text x="211" y="20">ONES</text><rect x="36" y="34" width="72" height="58" rx="8"/><path d="M50 35v56M64 35v56M78 35v56M92 35v56M37 48h70M37 62h70M37 76h70"/><circle cx="168" cy="48" r="10"/><circle cx="198" cy="48" r="10"/><circle cx="228" cy="48" r="10"/><circle cx="168" cy="78" r="10"/><text x="48" y="109">1 ten</text><text x="188" y="109">4 ones</text></svg>`,
      sort: `<svg viewBox="0 0 300 116" role="img" aria-label="Observe, sort and explain steps"><rect x="8" y="36" width="78" height="44" rx="12"/><rect x="111" y="36" width="78" height="44" rx="12"/><rect x="214" y="36" width="78" height="44" rx="12"/><text x="47" y="62">OBSERVE</text><text x="150" y="62">SORT</text><text x="253" y="62">EXPLAIN</text><path d="M88 58h18m-5-5 5 5-5 5m92-5h18m-5-5 5 5-5 5"/></svg>`,
      plant: `<svg viewBox="0 0 300 116" role="img" aria-label="Plant observation diagram"><path d="M150 91V51m0 15c-20-20-38-10-37 1 11 12 25 8 37-1m0-16c20-20 38-10 37 1-11 12-25 8-37-1M132 91h36l-6 14h-24z"/><circle cx="55" cy="38" r="13"/><path d="M55 15v-8m-19 31h-9m47 0h9M40 23l-6-6m30 30 6 6"/><path d="M220 25h34m-17-12v24"/></svg>`,
      groups: `<svg viewBox="0 0 300 116" role="img" aria-label="Equal groups diagram"><circle cx="63" cy="58" r="38"/><circle cx="150" cy="58" r="38"/><circle cx="237" cy="58" r="38"/><g><circle cx="51" cy="49" r="5"/><circle cx="69" cy="49" r="5"/><circle cx="51" cy="67" r="5"/><circle cx="69" cy="67" r="5"/><circle cx="138" cy="49" r="5"/><circle cx="156" cy="49" r="5"/><circle cx="138" cy="67" r="5"/><circle cx="156" cy="67" r="5"/><circle cx="225" cy="49" r="5"/><circle cx="243" cy="49" r="5"/><circle cx="225" cy="67" r="5"/><circle cx="243" cy="67" r="5"/></g><text x="131" y="111">3 equal groups of 4</text></svg>`,
      fraction: `<svg viewBox="0 0 300 116" role="img" aria-label="Equivalent fractions diagram"><text x="31" y="28">1/2</text><text x="131" y="28">2/4</text><text x="231" y="28">4/8</text><rect x="20" y="43" width="80" height="30" rx="4"/><path d="M60 43v30"/><rect x="120" y="43" width="80" height="30" rx="4"/><path d="M140 43v30m20-30v30m20-30v30"/><rect x="220" y="43" width="64" height="30" rx="4"/><path d="M228 43v30m8-30v30m8-30v30m8-30v30m8-30v30m8-30v30m8-30v30"/><path d="M22 44h38v28H22m100-28h40v28h-40m100-28h32v28h-32"/></svg>`,
      grid: `<svg viewBox="0 0 300 116" role="img" aria-label="Area and perimeter grid"><rect x="94" y="19" width="112" height="72" rx="3"/><path d="M122 19v72m28-72v72m28-72v72M94 43h112M94 67h112"/><path d="M94 13h112m-5-4 5 4-5 4M87 19v72m-4-5 4 5 4-5"/><text x="130" y="108">inside: area</text><text x="213" y="58">edge</text></svg>`,
      chart: `<svg viewBox="0 0 300 116" role="img" aria-label="Bar chart with labelled axes"><path d="M49 16v79h210M49 75h25V95H49m42-43h25v43H91m42-61h25v61h-25m42-43h25v43h-25"/><path d="M43 75h6m-6-23h6m-6-23h6"/><text x="132" y="110">category</text><text x="14" y="18">value</text></svg>`,
      ratio: `<svg viewBox="0 0 300 116" role="img" aria-label="Equivalent ratio table"><rect x="39" y="24" width="222" height="68" rx="8"/><path d="M150 24v68M39 58h222"/><text x="81" y="47">FLOUR</text><text x="184" y="47">WATER</text><text x="91" y="79">2</text><text x="195" y="79">1</text><text x="55" y="108">multiply both parts by the same factor</text></svg>`,
      bridge: `<svg viewBox="0 0 300 116" role="img" aria-label="Paper bridge test setup"><path d="M32 89h73V39h90v50h73M105 42l45 44 45-44m-70 4 25 40 25-40"/><path d="M103 89h94"/><rect x="137" y="27" width="26" height="12" rx="3"/><text x="110" y="109">change one feature, compare the load</text></svg>`,
      numberline: `<svg viewBox="0 0 300 116" role="img" aria-label="Integer number line"><path d="M31 60h238m-5-5 5 5-5 5"/><path d="M61 52v16m44-16v16m45-16v16m44-16v16m45-16v16"/><text x="56" y="88">−2</text><text x="101" y="88">−1</text><text x="152" y="88">0</text><text x="195" y="88">1</text><text x="239" y="88">2</text><path d="M161 42q35-40 70 0" fill="none"/></svg>`,
      balance: `<svg viewBox="0 0 300 116" role="img" aria-label="Balanced equation illustration"><path d="M150 23v67m-52 0h104m-92 0-22 13h44zm112 0-22 13h44zM70 52h160m-7-5 7 5-7 5"/><rect x="85" y="35" width="39" height="24" rx="6"/><rect x="176" y="35" width="39" height="24" rx="6"/><text x="98" y="52">x</text><text x="186" y="52">15</text></svg>`,
      circuit: `<svg viewBox="0 0 300 116" role="img" aria-label="Simple low-voltage circuit path"><path d="M68 29h164v58H68zM68 47H43m0-10v20m-8-7v-6m197 13h18m-4-6 4 6-4 6"/><circle cx="151" cy="29" r="18"/><path d="M142 29h18m-9-9v18"/><text x="44" y="103">cell</text><text x="133" y="69">lamp</text><text x="216" y="103">closed path</text></svg>`,
      flow: `<svg viewBox="0 0 300 116" role="img" aria-label="Algorithm steps"><rect x="97" y="8" width="106" height="25" rx="12"/><rect x="97" y="45" width="106" height="25" rx="5"/><rect x="97" y="82" width="106" height="25" rx="12"/><text x="150" y="25">START</text><text x="150" y="62">COMPARE</text><text x="150" y="99">NEXT STEP</text><path d="M150 33v10m-4-4 4 4 4-4m-4 27v10m-4-4 4 4 4-4"/></svg>`,
      graph: `<svg viewBox="0 0 300 116" role="img" aria-label="Linear relationship graph"><path d="M49 12v85h218M49 78h210M49 58h210M49 38h210"/><path d="m60 86 42-16 42-16 42-16 42-16"/><circle cx="102" cy="70" r="3"/><circle cx="144" cy="54" r="3"/><circle cx="186" cy="38" r="3"/><text x="236" y="110">distance</text><text x="11" y="18">cost</text></svg>`,
      investigation: `<svg viewBox="0 0 300 116" role="img" aria-label="Plan, test, record and explain"><rect x="9" y="39" width="64" height="38" rx="10"/><rect x="84" y="39" width="64" height="38" rx="10"/><rect x="159" y="39" width="64" height="38" rx="10"/><rect x="234" y="39" width="58" height="38" rx="10"/><text x="41" y="62">PLAN</text><text x="116" y="62">TEST</text><text x="191" y="62">RECORD</text><text x="263" y="62">EXPLAIN</text><path d="M74 58h8m-3-4 4 4-4 4m68-4h8m-3-4 4 4-4 4m68-4h8m-3-4 4 4-4 4"/></svg>`,
      plant: `<svg viewBox="0 0 300 116" role="img" aria-label="Plant observation diagram"><path d="M150 91V51m0 15c-20-20-38-10-37 1 11 12 25 8 37-1m0-16c20-20 38-10 37 1-11 12-25 8-37-1M132 91h36l-6 14h-24z"/><circle cx="55" cy="38" r="13"/><path d="M55 15v-8m-19 31h-9m47 0h9M40 23l-6-6m30 30 6 6"/><path d="M220 25h34m-17-12v24"/></svg>`,
      test: `<svg viewBox="0 0 300 116" role="img" aria-label="Prediction, fair test and observation"><rect x="15" y="34" width="78" height="48" rx="10"/><rect x="111" y="34" width="78" height="48" rx="10"/><rect x="207" y="34" width="78" height="48" rx="10"/><text x="54" y="62">PREDICT</text><text x="150" y="62">TEST</text><text x="246" y="62">OBSERVE</text><path d="M94 58h13m-4-4 4 4-4 4m84-4h13m-4-4 4 4-4 4"/></svg>`,
      filter: `<svg viewBox="0 0 300 116" role="img" aria-label="Model water filter layers"><path d="M112 18h76l-14 78h-48z"/><path d="M115 36h70m-66 18h62m-58 18h54"/><circle cx="137" cy="45" r="3"/><circle cx="161" cy="63" r="3"/><circle cx="146" cy="79" r="3"/><path d="M150 8v12m-5-5 5 5 5-5m0 82v12m-5-5 5 5 5-5"/><text x="20" y="54">visible particles</text><text x="198" y="78">model only</text></svg>`,
      design: `<svg viewBox="0 0 300 116" role="img" aria-label="Design, build, test and improve cycle"><circle cx="150" cy="58" r="40"/><path d="M150 18a40 40 0 0 1 38 27m-3-8 3 8-9 1M190 58a40 40 0 0 1-37 40m8-3-8 3-1-9M150 98a40 40 0 0 1-39-29m3 9-3-9 9-1M110 58a40 40 0 0 1 38-40m-8 3 8-3 1 9"/><text x="150" y="56">DESIGN</text><text x="150" y="69">TEST</text></svg>`,
      sample: `<svg viewBox="0 0 300 116" role="img" aria-label="Population and sample"><circle cx="80" cy="58" r="43"/><circle cx="65" cy="45" r="5"/><circle cx="85" cy="42" r="5"/><circle cx="99" cy="57" r="5"/><circle cx="66" cy="68" r="5"/><circle cx="85" cy="76" r="5"/><circle cx="179" cy="58" r="34"/><circle cx="169" cy="49" r="5"/><circle cx="187" cy="59" r="5"/><circle cx="174" cy="72" r="5"/><path d="M128 58h12m-5-5 5 5-5 5"/><text x="50" y="112">population</text><text x="159" y="106">sample</text></svg>`,
      energy: `<svg viewBox="0 0 300 116" role="img" aria-label="Energy data comparison"><path d="M46 15v80h218"/><rect x="83" y="52" width="42" height="43" rx="4"/><rect x="167" y="31" width="42" height="64" rx="4"/><text x="104" y="109">A</text><text x="187" y="109">B</text><text x="82" y="30">compare equal units</text></svg>`,
      optimize: `<svg viewBox="0 0 300 116" role="img" aria-label="Compare feasible design options"><path d="M44 17v78h220m-190-8 42-20 42-17 42-10 42-4"/><circle cx="138" cy="67" r="6"/><circle cx="180" cy="57" r="6"/><circle cx="222" cy="47" r="6"/><text x="72" y="111">feasible options</text><text x="16" y="18">goal</text></svg>`,
      inquiry: `<svg viewBox="0 0 300 116" role="img" aria-label="Inquiry report components"><rect x="25" y="20" width="250" height="76" rx="8"/><path d="M25 44h250M25 70h250M108 20v24m82-24v24m-60 26v26"/><text x="66" y="37">QUESTION</text><text x="149" y="37">METHOD</text><text x="230" y="37">RESULTS</text><text x="65" y="61">EVIDENCE</text><text x="188" y="61">LIMITATIONS</text><text x="150" y="89">CONCLUSION</text></svg>`
    };
    const drawing = diagrams[type] || diagrams.inquiry;
    return `<figure class="curriculum-visual"><span class="eyebrow">ORIGINAL LEARNING DIAGRAM</span>${drawing}<figcaption>${escapeHtml(label)} · For discussion; adapt to the selected activity.</figcaption></figure>`;
  }

  function planCard(plan, subject, grade, track) {
    return `<article class="curriculum-plan">
      <div class="plan-heading"><span class="lesson-icon ${subject === "Mathematics" ? "mint" : "sky"}">${subject === "Mathematics" ? "∑" : "⚗"}</span><div><span class="lesson-meta">GRADE ${grade} · ${escapeHtml(subject)}</span><h2>${escapeHtml(plan.title)}</h2></div></div>
      <p class="plan-strand">${escapeHtml(plan.strand)} <span>·</span> Suggested learning focus</p>
      ${diagramMarkup(plan.visual, plan.title)}
      <div class="plan-section"><span class="eyebrow">LEARNING INTENTION</span><p>${escapeHtml(plan.objective)}</p></div>
      <div class="plan-sequence"><div><span class="sequence-number">01</span><strong>Connect</strong><p>${escapeHtml(plan.engage)}</p></div><div><span class="sequence-number">02</span><strong>Explore</strong><p>${escapeHtml(plan.activity)}</p></div><div><span class="sequence-number">03</span><strong>Check understanding</strong><p>${escapeHtml(plan.check)}</p></div></div>
      <section class="content-panel topic-check-panel"><span class="eyebrow">TOPIC CHECK · GRADE ${grade}</span><p class="assessment-intro">Choose one answer to test this topic. The choices work with a keyboard and screen reader.</p>${assessmentMarkup(plan.assessment, `curriculum-${grade}-${track}`, `data-grade="${grade}" data-track="${track}"`)}</section>
      <div class="plan-bottom"><div><strong>Suggested materials</strong><p>${escapeHtml(plan.materials)}</p></div><div><strong>Support &amp; extension</strong><p>${escapeHtml(plan.support)}</p></div></div>
      <p class="plan-attribution">Original sample lesson draft · Align and adapt using the current official design for this grade and learning area.</p>
    </article>`;
  }

  function curriculumView() {
    const selected = curriculum.find(item => item.grade === activeGrade) || curriculum[0];
    const subject = selected[activeTrack];
    const trackLabel = activeTrack === "mathematics" ? "Mathematics" : "Integrated STEM";
    const grades = curriculum.map(item => `<button class="grade-chip ${item.grade === activeGrade ? "selected" : ""}" data-grade="${item.grade}" aria-pressed="${item.grade === activeGrade}"><span>Grade</span>${item.grade}</button>`).join("");
    const trackButtons = [["mathematics", "Mathematics"], ["stem", "Science, technology & design"]].map(([key, label]) => `<button class="filter-chip ${key === activeTrack ? "selected" : ""}" data-track="${key}" aria-pressed="${key === activeTrack}">${label}</button>`).join("");
    return `<section class="page-intro"><span class="eyebrow"><span class="eyebrow-line"></span> KENYA · STEM LEARNING PATHWAY</span><h1>Explore every <em>grade.</em></h1><p>Grade-by-grade original scope guides, sample teacher-planning drafts and learning diagrams for Mathematics and related STEM areas.</p></section>
      <section class="curriculum-notice"><span>i</span><p><strong>Important:</strong> This is an original study aid, not the complete official syllabus. It does not reproduce KICD curriculum designs or claim to be TSC-recommended/approved. Verify grade, learning area, strands, outcomes and term allocation against the latest official design before teaching.</p></section>
      <section class="grade-picker"><div class="section-heading"><div><span class="eyebrow">CHOOSE A GRADE</span><h2>Learning pathway</h2></div><span class="phase-pill">${escapeHtml(selected.phase)}</span></div><div class="grade-chips">${grades}</div><div class="filter-row track-chips">${trackButtons}</div></section>
      <div class="curriculum-selected"><div><span class="eyebrow">GRADE ${selected.grade} · ${escapeHtml(selected.phase.toUpperCase())}</span><h2>${escapeHtml(trackLabel)}</h2></div><span class="curriculum-topic-count">${subject.topics.length} focus areas</span></div>
      <section class="topic-guide"><span class="eyebrow">ORIGINAL SCOPE GUIDE</span><h3>${escapeHtml(subject.strand)}</h3><div class="topic-chips">${subject.topics.map(topic => `<span>${escapeHtml(topic)}</span>`).join("")}</div><p>This topic list is an orientation aid, not an exhaustive curriculum design or a substitute for the official grade-level document.</p></section>
      ${planCard(subject, trackLabel, selected.grade, activeTrack)}
      <section class="official-sources"><div><span class="eyebrow">CHECK THE CURRENT OFFICIAL DOCUMENTS</span><h2>Curriculum references</h2><p>Use official sources to verify requirements; this app supplies original explanations, diagrams and sample lesson-planning ideas only.</p></div><div class="source-links"><a href="https://kicd.ac.ke/cbc-materials/" target="_blank" rel="noopener noreferrer"><strong>KICD CBC / CBE materials</strong><span>Curriculum designs and approved learning resources ↗</span></a><a href="https://education.go.ke/" target="_blank" rel="noopener noreferrer"><strong>Ministry of Education</strong><span>Education policies and official information ↗</span></a><a href="https://www.tsc.go.ke/" target="_blank" rel="noopener noreferrer"><strong>Teachers Service Commission</strong><span>Teacher service and professional information ↗</span></a></div><p class="source-note">KICD develops curriculum and curriculum support materials. The sample plans here are not official TSC lesson plans, nor are they represented as ministry-issued materials. The curriculum reference portal was checked on 12 November 2026; always confirm the latest version.</p></section>`;
  }

  function practiceView() {
    const lesson = content.lessons[Math.floor(Math.random() * content.lessons.length)];
    return `<section class="page-intro"><span class="eyebrow"><span class="eyebrow-line"></span> QUICK PRACTICE</span><h1>Try an idea. <em>See what sticks.</em></h1><p>A short question from Mathematics or Computer Studies. You can try another whenever you like.</p></section>
      <section class="practice-card" id="practice-card" data-lesson="${lesson.id}"><div class="practice-top"><span class="lesson-icon ${lesson.color}">${lesson.icon}</span><div><span class="lesson-meta">${escapeHtml(lesson.subject)} <i>·</i> ${escapeHtml(lesson.grade)}</span><h2>${escapeHtml(lesson.unit)}</h2></div><span class="practice-tag">ONE QUESTION</span></div>
      ${assessmentMarkup(lesson.check, `practice-${lesson.id}`, `data-lesson="${lesson.id}"`)}
      <div class="practice-actions"><button class="button button-outline" data-view="learn">Explore this topic</button><button class="button button-dark" id="new-question">Another question <span>↻</span></button></div></section>
      <div class="practice-tip"><span aria-hidden="true">i</span><p><strong>It's okay to get one wrong.</strong> Read the explanation, notice the idea, and try again. That's how learning grows.</p></div>`;
  }

  function mathGameView() {
    const levelNames = { all: "All levels", primary: "Primary · Grades 1–6", junior: "Junior secondary · Grades 7–9", senior: "Senior secondary · Grades 10–12" };
    const levelOptions = Object.entries(levelNames).map(([value, label]) => `<option value="${value}" ${activeGameLevel === value ? "selected" : ""}>${label}</option>`).join("");
    const modeNames = { quest: "Math Quest", patterns: "Pattern Detective" };
    const modeOptions = Object.entries(modeNames).map(([value, label]) => `<option value="${value}" ${activeGameMode === value ? "selected" : ""}>${label}</option>`).join("");
    let gameContent = `<div class="game-start-panel"><span class="game-mark" aria-hidden="true">⚄</span><h2>Choose a game and get curious.</h2><p>Play five questions at your pace. Think it through, and learn from every answer. There is no timer and no penalty for getting one wrong.</p><div class="game-setup-fields"><label class="game-level-picker">Choose a game<select id="math-game-mode">${modeOptions}</select></label><label class="game-level-picker">Choose your level<select id="math-game-level">${levelOptions}</select></label></div><button class="button button-dark" id="start-math-game">Start my round <span>→</span></button></div>`;
    if (mathGame.status === "playing") {
      const question = mathGame.round[mathGame.current];
      const progress = (mathGame.current / mathGame.round.length) * 100;
      const answers = question.options.map((option, index) => {
        let resultClass = "";
        let resultLabel = "";
        if (mathGame.answered && index === question.answer) {
          resultClass = "correct";
          resultLabel = "Correct answer";
        } else if (mathGame.answered && index === mathGame.selected) {
          resultClass = "incorrect";
          resultLabel = "Your answer";
        }
        return `<button class="game-answer ${resultClass}" data-game-answer="${index}" ${mathGame.answered ? "disabled" : ""}><span class="game-option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span>${resultLabel ? `<span class="game-answer-label">${resultLabel}</span>` : ""}</button>`;
      }).join("");
      gameContent = `<div class="game-progress-row"><span>Question ${mathGame.current + 1} of ${mathGame.round.length}</span><span>${mathGame.score} points · ${mathGame.streak} streak</span></div><div class="game-progress-track" role="progressbar" aria-valuenow="${mathGame.current}" aria-valuemin="0" aria-valuemax="${mathGame.round.length}"><span style="width:${progress}%"></span></div>
        <section class="math-question-card"><span class="eyebrow">${escapeHtml(question.grade)} · ${escapeHtml(question.source)}</span><h2 tabindex="-1">${escapeHtml(question.question)}</h2><div class="game-answers">${answers}</div>
        <div class="game-feedback ${mathGame.answered ? (mathGame.selected === question.answer ? "is-correct" : "is-incorrect") : ""}" role="status" aria-live="polite" tabindex="-1">${mathGame.answered ? `${mathGame.selected === question.answer ? `Nice work! ${mathGame.streak > 1 ? `${mathGame.streak} in a row! ` : ""}` : `Good try. The answer is ${escapeHtml(question.options[question.answer])}. `}${escapeHtml(question.feedback)}` : "Choose the answer you think is right."}</div>
        ${mathGame.answered ? `<button class="button button-dark game-continue" id="continue-math-game">${mathGame.current === mathGame.round.length - 1 ? "See my results" : "Next question"} <span>→</span></button>` : ""}</section>`;
    } else if (mathGame.status === "complete") {
      const message = mathGame.correct === mathGame.round.length ? "A perfect round — brilliant work!" : mathGame.correct >= 3 ? "Great effort. Every question helped you practise." : "You showed up and practised. That is how skills grow.";
      gameContent = `<div class="game-results"><span class="game-mark" aria-hidden="true">${mathGame.correct === mathGame.round.length ? "✓" : "↻"}</span><span class="eyebrow">ROUND COMPLETE</span><h2 tabindex="-1">${message}</h2><p class="game-score">${mathGame.score}<small> points</small></p><p>${mathGame.correct} of ${mathGame.round.length} correct · best streak ${mathGame.bestStreak || 0}</p><p class="game-best">Personal best: ${state.bestGameScore} points</p><button class="button button-dark" id="start-math-game">Play another round <span>↻</span></button><button class="text-link change-game" id="change-math-game">Choose another game or level</button></div>`;
    }
    return `<section class="page-intro"><span class="eyebrow"><span class="eyebrow-line"></span> PLAY · THINK · LEARN</span><h1>Maths is a <em>great adventure.</em></h1><p>Build number sense and confidence with a short quiz game using questions from our Mathematics lessons and grade plans.</p></section>
      <section class="math-game-shell"><div class="math-game-heading"><div><span class="eyebrow">${escapeHtml(modeNames[activeGameMode].toUpperCase())}</span><h2>Five questions. Your pace.</h2></div><span class="game-best-badge">PERSONAL BEST · ${state.bestGameScore}</span></div>${gameContent}</section>
      <div class="practice-tip"><span aria-hidden="true">i</span><p><strong>Games are for learning, not pressure.</strong> Take your time. After each choice, read the explanation and notice how the idea works.</p></div>`;
  }

  function labView() {
    const areas = ["All", ...new Set(labActivities.map(activity => activity.area))];
    const filtered = labActivities.filter(activity => activeLabArea === "All" || activity.area === activeLabArea);
    const areaButtons = areas.map(area => `<button class="filter-chip ${area === activeLabArea ? "selected" : ""}" data-lab-area="${escapeHtml(area)}" aria-pressed="${area === activeLabArea}">${escapeHtml(area)}</button>`).join("");
    const activities = filtered.map(activity => `<details class="lab-activity lab-topic-${activity.id}">
      <summary><span class="lab-area-badge">${escapeHtml(activity.area)}</span><span class="lab-activity-heading"><strong>${escapeHtml(activity.title)}</strong><small>${escapeHtml(activity.band)} <i>·</i> ${escapeHtml(activity.time)}</small></span><span class="lab-expand" aria-hidden="true">⌄</span></summary>
      <div class="lab-activity-body">
        <div class="lab-inquiry"><span class="eyebrow">INVESTIGATION QUESTION</span><p>${escapeHtml(activity.question)}</p></div>
        <div class="lab-activity-columns">
          <section><span class="eyebrow">MATERIALS</span><p>${escapeHtml(activity.materials)}</p></section>
          <section><span class="eyebrow">TRY IT</span><ol>${activity.steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol></section>
          <section><span class="eyebrow">WHAT LEARNERS CAN SHOW</span><p>${escapeHtml(activity.evidence)}</p></section>
          <section><span class="eyebrow">TEACHER FACILITATION</span><p>${escapeHtml(activity.facilitator)}</p></section>
          <section><span class="eyebrow">LOW-RESOURCE ADAPTATION</span><p>${escapeHtml(activity.adapt)}</p></section>
          <section class="lab-safety"><span class="eyebrow">SAFETY</span><p>${escapeHtml(activity.safety)}</p></section>
        </div>
        <div class="lab-competencies"><strong>Competencies to make visible</strong><span>${escapeHtml(activity.competencies)}</span></div>
      </div>
    </details>`).join("");
    return `<section class="page-intro"><span class="eyebrow"><span class="eyebrow-line"></span> LEARN BY INVESTIGATING</span><h1>A STEM Lab is a <em>way of learning.</em></h1><p>Offline-ready activities use shared, low-cost materials and local questions. Learners predict, test, record evidence, explain and improve ideas.</p></section>
      <section class="lab-principle"><span class="lab-principle-icon" aria-hidden="true">⚗</span><div><strong>Start with a question, not a kit.</strong><p>Designed for group rotation, limited equipment and unreliable connectivity. Adapt the age band, time and materials to your class and check activities against the current approved curriculum and school safety procedures.</p></div></section>
      <section class="lab-toolkit"><div class="section-heading"><div><span class="eyebrow">ACTIVITY LIBRARY</span><h2>Choose an investigation</h2></div><span class="lab-count">${filtered.length} activities</span></div><div class="filter-row">${areaButtons}</div><div class="lab-activities">${activities}</div></section>
      <section class="lab-teaching-note"><span class="eyebrow">FOR LARGE CLASSES</span><h2>Give every learner a role</h2><p>In groups of about 6–8, rotate roles such as questioner, materials manager, tester, recorder, safety checker and reporter. When materials are scarce, use one activity station at a time and have other groups predict, sketch or analyse shared results. Make sure each learner explains evidence, not just the group reporter.</p></section>
      <p class="lab-disclaimer">These are original teaching ideas, not official KICD curriculum content or a substitute for teacher judgment. Check local materials, learner needs, environmental conditions and safety before use.</p>`;
  }

  function plannerView() {
    const sortByDue = (first, second) => {
      if (!first.due) return second.due ? 1 : 0;
      if (!second.due) return -1;
      return first.due.localeCompare(second.due);
    };
    const upcoming = state.tasks.filter(task => !task.done).slice().sort(sortByDue);
    const completed = state.tasks.filter(task => task.done).slice().reverse();
    const lessonOptions = content.lessons.map(lesson => `<option value="${lesson.id}">${escapeHtml(lesson.title)}</option>`).join("");
    const taskMarkup = task => {
      const lesson = content.lessons.find(item => item.id === task.lessonId);
      const dueLabel = task.due
        ? new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${task.due}T12:00:00`))
        : "No due date";
      return `<article class="study-task ${task.done ? "is-done" : ""}">
        <button class="task-toggle" data-task-action="toggle" data-task-id="${escapeHtml(task.id)}" aria-label="${task.done ? "Mark as not done" : "Mark as done"}" aria-pressed="${task.done}">${task.done ? "✓" : ""}</button>
        <div class="task-copy"><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(dueLabel)}${lesson ? ` · ${escapeHtml(lesson.subject)}` : ""}</span>${lesson ? `<button class="task-topic" data-lesson="${lesson.id}">Review ${escapeHtml(lesson.title)} →</button>` : ""}</div>
        <button class="task-remove" data-task-action="remove" data-task-id="${escapeHtml(task.id)}" aria-label="Remove task">×</button>
      </article>`;
    };
    return `<section class="page-intro"><span class="eyebrow"><span class="eyebrow-line"></span> YOUR STUDY SPACE</span><h1>A plan for <em>steady progress.</em></h1><p>Break learning into small, manageable tasks. Your list is saved on this device.</p></section>
      <section class="planner-layout">
        <form class="planner-form" id="study-task-form">
          <span class="eyebrow">ADD A STUDY TASK</span><h2>What would you like to work on?</h2>
          <label class="planner-field">Task<input name="title" type="text" maxlength="120" placeholder="e.g. Practise fraction questions" required></label>
          <div class="planner-field-row"><label class="planner-field">Related lesson <select name="lessonId"><option value="">Choose a lesson (optional)</option>${lessonOptions}</select></label><label class="planner-field">Due date <input name="due" type="date"></label></div>
          <button class="button button-dark" type="submit">Add to my plan <span>+</span></button>
        </form>
        <div class="planner-list">
          <section class="task-group"><div class="task-group-heading"><h2>Up next</h2><span>${upcoming.length}</span></div>${upcoming.length ? `<div class="task-list">${upcoming.map(taskMarkup).join("")}</div>` : `<div class="empty-state"><span aria-hidden="true">+</span><strong>A fresh start.</strong><p>Add one small task to get moving.</p></div>`}</section>
          ${completed.length ? `<section class="task-group completed-tasks"><div class="task-group-heading"><h2>Done</h2><span>${completed.length}</span></div><div class="task-list">${completed.map(taskMarkup).join("")}</div></section>` : ""}
        </div>
      </section>
      <div class="practice-tip"><span aria-hidden="true">i</span><p><strong>Keep it small.</strong> A short, specific task is easier to start than a big vague goal. You can mark it done or remove it whenever you like.</p></div>`;
  }

  function flashcardsView() {
    const card = flashcards[activeFlashcardIndex];
    return `<section class="page-intro"><span class="eyebrow"><span class="eyebrow-line"></span> ACTIVE RECALL</span><h1>Remember more with <em>flashcards.</em></h1><p>Try answering from memory before revealing the answer. Cards draw from original lesson checks and grade-level study plans.</p></section>
      <section class="flashcard-study">
        <div class="flashcard-toolbar"><span class="eyebrow">${escapeHtml(card.detail)}</span><span>${activeFlashcardIndex + 1} of ${flashcards.length}</span></div>
        <button class="flashcard ${flashcardRevealed ? "revealed" : ""}" id="flashcard-toggle" aria-pressed="${flashcardRevealed}" aria-label="${flashcardRevealed ? "Hide answer" : "Reveal answer"}">
          <span class="flashcard-label">${flashcardRevealed ? "ANSWER" : "THINK ABOUT IT"}</span>
          <strong>${escapeHtml(flashcardRevealed ? card.answer : card.question)}</strong>
          <span class="flashcard-hint">${flashcardRevealed ? `From: ${escapeHtml(card.source)}` : "Take a moment, then select to reveal"}</span>
        </button>
        <div class="flashcard-controls"><button class="button button-outline" id="flashcard-previous" ${activeFlashcardIndex === 0 ? "disabled" : ""}>← Previous</button><button class="button button-outline" id="flashcard-shuffle">Shuffle</button><button class="button button-dark" id="flashcard-next">Next card <span>→</span></button></div>
      </section>
      <div class="practice-tip"><span aria-hidden="true">↻</span><p><strong>Retrieval practice helps.</strong> Try to recall the idea before flipping the card. If you miss it, read the explanation and come back to it later.</p></div>`;
  }

  function progressView() {
    const completed = completedLessons();
    const pct = Math.round(completed.length / content.lessons.length * 100);
    const attemptsPct = scorePercent();
    const recent = [...completed].reverse();
    return `<section class="page-intro"><span class="eyebrow"><span class="eyebrow-line"></span> YOUR JOURNEY</span><h1>Look how far <em>you've come.</em></h1><p>Your learning progress is stored only in this browser on this device.</p></section>
      <section class="progress-overview"><div class="progress-copy"><span class="eyebrow">LESSON PATHWAY</span><h2>${completed.length} of ${content.lessons.length} lessons</h2><p>Every completed lesson is a step forward.</p>${progressBar(pct, "large-bar")}<span class="progress-caption">${pct}% explored</span></div><div class="progress-ring" style="--progress:${pct * 3.6}deg"><div><strong>${pct}%</strong><span>COMPLETE</span></div></div></section>
      <section class="progress-grid"><article class="progress-detail"><span class="stat-icon peach">↻</span><strong>${state.attempts}</strong><span>Practice answers tried</span></article><article class="progress-detail"><span class="stat-icon mint">✓</span><strong>${state.correct}</strong><span>Correct answers</span></article><article class="progress-detail"><span class="stat-icon sky">↗</span><strong>${attemptsPct}%</strong><span>Practice accuracy</span></article></section>
      <section class="section-block"><div class="section-heading"><div><span class="eyebrow">YOUR CHECKPOINTS</span><h2>Completed lessons</h2></div>${completed.length ? `<button class="text-link" id="reset-progress">Reset progress <span>↻</span></button>` : ""}</div>${recent.length ? `<div class="completed-list">${recent.map(item => `<button class="completed-item" data-lesson="${item.id}"><span class="completed-check">✓</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.subject)} · ${escapeHtml(item.grade)}</small></span><span class="item-arrow">→</span></button>`).join("")}</div>` : `<div class="empty-state"><span aria-hidden="true">○</span><strong>Your first checkpoint is waiting.</strong><p>Complete a lesson to see it here.</p><button class="button button-dark" data-view="learn">Find a lesson <span>→</span></button></div>`}</section>
      <button class="reset-all" id="clear-all-progress">Clear all saved progress on this device</button>`;
  }

  function campusView() {
    const groups = content.campus.map(group => `<details class="year-card" ${group.year === "Year 1" ? "open" : ""}><summary><span class="year-dot ${group.color}"></span><strong>${escapeHtml(group.year)}</strong><span class="year-count">${group.units.length} units</span><span class="summary-chevron">⌄</span></summary><div class="unit-list">${group.units.map(([name, role]) => `<article class="unit-item"><span class="unit-check">✓</span><div><strong>${escapeHtml(name)}</strong><p>${escapeHtml(role)}</p></div></article>`).join("")}</div></details>`).join("");
    const total = content.campus.reduce((sum, group) => sum + group.units.length, 0);
    return `<section class="page-intro"><span class="eyebrow"><span class="eyebrow-line"></span> THE PROJECT CONNECTION</span><h1>All your learning, <em>put to work.</em></h1><p>See how the BSc Computer Studies and Mathematics units you listed connect to this learning system.</p></section>
      <section class="mapping-note"><span class="mapping-icon">⌘</span><div><strong>A capstone is an integration, not a checklist.</strong><p>This prototype maps all ${total} listed units to a practical education project. Some units directly shape the MVP; advanced or specialist units are honestly marked as extension, research or future-work opportunities rather than being forced into secondary-school lessons.</p></div></section>
      <section class="project-scope"><span class="eyebrow">CORE BUILD UNITS</span><h2>Where database, web and mobile units show up</h2><div class="scope-grid"><div><strong>Database Management Systems · Year 2</strong><p>Planned: design and query a structured database for lessons and privacy-minimised progress. Important: this prototype currently saves progress in browser localStorage; it does not yet have a database.</p></div><div><strong>Web Application Development · Year 2</strong><p>Implemented: the browser app, searchable lessons, interactive checks and progress views.</p></div><div><strong>Database Systems · Year 3</strong><p>Planned: define tables and relationships for lesson content and anonymous practice records, then demonstrate queries and data validation.</p></div><div><strong>Mobile Application Development · Year 3</strong><p>Partly implemented: responsive phone layout. Installable, offline-first mobile web support is still to be built and tested.</p></div><div><strong>Human-Computer Interaction · Year 3</strong><p>Project focus: screen-reader and keyboard access, scalable text, clear non-visual descriptions for maths diagrams, and testing with blind or low-vision learners.</p></div><div><strong>Research Methods and Ethics</strong><p>Identify a specific local gap through a literature review and approved community consultation; do not claim the idea has never been done before collecting evidence.</p></div></div></section>
      <div class="year-list">${groups}</div>
      <section class="project-scope"><span class="eyebrow">SENIOR PROJECT DIRECTION</span><h2>RoKiSh Learning Lab: inclusive maths access</h2><div class="scope-grid"><div><strong>Problem to investigate</strong><p>How can blind and low-vision learners access and practise mathematics on a phone, including when connectivity is unreliable?</p></div><div><strong>Primary users</strong><p>Blind and low-vision learners, with teachers and accessibility practitioners as partners in requirements and review.</p></div><div><strong>Proposed solution</strong><p>An accessible, low-data mobile web learning tool with screen-reader-friendly lessons, meaningful text descriptions for diagrams, practice feedback and offline access.</p></div><div><strong>Research contribution</strong><p>Establish the exact unmet local need through a literature review and ethical user research. Present the contribution as a context-specific, evaluated solution—not as something nobody has built.</p></div></div></section>`;
  }

  const viewTitles = { home: "Home", learn: "Explore lessons", curriculum: "Curriculum 1–12", lab: "STEM Lab", practice: "Quick practice", games: "Math games", planner: "Study planner", flashcards: "Flashcards", progress: "My progress", campus: "Campus toolkit" };
  function render(view = "home", focus = false) {
    const views = { home: homeView, learn: learnView, curriculum: curriculumView, lab: labView, practice: practiceView, games: mathGameView, planner: plannerView, flashcards: flashcardsView, progress: progressView, campus: campusView };
    root.innerHTML = (views[view] || homeView)();
    root.dataset.view = views[view] ? view : "home";
    document.body.dataset.view = root.dataset.view;
    document.getElementById("breadcrumb-current").textContent = viewTitles[view] || "Overview";
    document.querySelectorAll(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === view));
    if (focus) root.focus({ preventScroll: true });
  }

  function navigate(view) {
    if (!viewTitles[view]) return;
    render(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openLesson(id) {
    const lesson = content.lessons.find(item => item.id === id);
    if (!lesson) return;
    state.lastLesson = id;
    saveState();
    root.innerHTML = `<section class="lesson-detail"><button class="back-link" data-view="learn">← Back to lessons</button><div class="lesson-detail-header"><span class="lesson-icon ${lesson.color}">${lesson.icon}</span><div><span class="eyebrow">${escapeHtml(lesson.subject)} <span>·</span> ${escapeHtml(lesson.grade)}</span><h1>${escapeHtml(lesson.title)}</h1><p>${escapeHtml(lesson.summary)}</p></div></div>
      <div class="lesson-detail-grid"><article class="lesson-main-content"><div class="content-panel"><span class="eyebrow">THE BIG IDEA</span><p class="explanation">${escapeHtml(lesson.explanation)}</p></div><div class="content-panel example-panel"><span class="eyebrow">LET'S SEE AN EXAMPLE</span><p>${escapeHtml(lesson.example)}</p></div><div class="content-panel check-panel"><span class="eyebrow">TOPIC CHECK</span><p class="assessment-intro">Choose an answer to test this topic. Use the arrow keys to move between options.</p>${assessmentMarkup(lesson.check, `lesson-${id}`, `data-lesson="${id}"`)}</div><button class="button button-dark complete-lesson" id="complete-lesson">${state.completed.includes(id) ? "Lesson completed ✓" : "Mark lesson complete"} <span>→</span></button></article>
      <aside class="lesson-side"><div class="side-panel"><span class="eyebrow">YOU'LL LEARN TO</span>${lesson.objectives.map(objective => `<p class="objective"><span>✓</span>${escapeHtml(objective)}</p>`).join("")}</div><div class="side-panel"><span class="eyebrow">LESSON DETAILS</span><p class="detail-line"><span>Subject</span><strong>${escapeHtml(lesson.subject)}</strong></p><p class="detail-line"><span>Level</span><strong>${escapeHtml(lesson.level)}</strong></p><p class="detail-line"><span>Topic</span><strong>${escapeHtml(lesson.unit)}</strong></p><p class="detail-line"><span>Time</span><strong>${escapeHtml(lesson.duration)}</strong></p></div></aside></div></section>`;
    root.dataset.view = "lesson";
    document.body.dataset.view = "lesson";
    document.getElementById("breadcrumb-current").textContent = lesson.title;
    document.querySelectorAll(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === "learn"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  root.addEventListener("submit", event => {
    const taskForm = event.target.closest("#study-task-form");
    if (taskForm) {
      event.preventDefault();
      const formData = new FormData(taskForm);
      const title = String(formData.get("title") || "").trim();
      if (!title) return;
      state.tasks.unshift({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        title: title.slice(0, 120),
        lessonId: String(formData.get("lessonId") || ""),
        due: String(formData.get("due") || ""),
        done: false
      });
      saveState();
      render("planner");
      root.querySelector('#study-task-form input[name="title"]').focus();
      showToast("Study task added to your plan.");
      return;
    }
    const form = event.target.closest("[data-assessment]");
    if (!form) return;
    event.preventDefault();
    submitAssessment(form);
  });
  root.addEventListener("click", event => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.view) return navigate(target.dataset.view);
    if (target.dataset.labArea) {
      activeLabArea = target.dataset.labArea;
      return render("lab");
    }
    if (target.dataset.taskAction) {
      const task = state.tasks.find(item => item.id === target.dataset.taskId);
      if (!task) return;
      if (target.dataset.taskAction === "toggle") task.done = !task.done;
      if (target.dataset.taskAction === "remove") state.tasks = state.tasks.filter(item => item.id !== task.id);
      saveState();
      render("planner");
      (root.querySelector(".task-toggle") || root.querySelector('#study-task-form input[name="title"]')).focus();
      return;
    }
    if (target.id === "start-math-game") {
      activeGameLevel = document.getElementById("math-game-level")?.value || activeGameLevel;
      activeGameMode = document.getElementById("math-game-mode")?.value || activeGameMode;
      const available = activeGameMode === "patterns"
        ? Array.from({ length: 5 }, createPatternQuestion)
        : mathQuestions.filter(question => activeGameLevel === "all" || question.level === activeGameLevel);
      for (let index = available.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
      }
      mathGame = { status: "playing", round: available.slice(0, 5), current: 0, score: 0, streak: 0, correct: 0, bestStreak: 0, answered: false, selected: null };
      render("games");
      root.querySelector(".math-question-card h2").focus();
      return;
    }
    if (target.id === "change-math-game") {
      mathGame.status = "idle";
      render("games");
      root.querySelector("#math-game-mode").focus();
      return;
    }
    if (target.dataset.gameAnswer !== undefined) {
      if (mathGame.status !== "playing" || mathGame.answered) return;
      const question = mathGame.round[mathGame.current];
      const selected = Number(target.dataset.gameAnswer);
      if (!Number.isInteger(selected) || selected < 0 || selected >= question.options.length) return;
      mathGame.selected = selected;
      mathGame.answered = true;
      if (selected === question.answer) {
        mathGame.correct += 1;
        mathGame.streak += 1;
        mathGame.bestStreak = Math.max(mathGame.bestStreak, mathGame.streak);
        mathGame.score += 10 + (mathGame.streak > 1 ? 5 : 0);
      } else {
        mathGame.streak = 0;
      }
      render("games");
      root.querySelector(".game-feedback").focus();
      return;
    }
    if (target.id === "continue-math-game") {
      if (mathGame.current === mathGame.round.length - 1) {
        mathGame.status = "complete";
        if (mathGame.score > state.bestGameScore) {
          state.bestGameScore = mathGame.score;
          saveState();
        }
      } else {
        mathGame.current += 1;
        mathGame.answered = false;
        mathGame.selected = null;
      }
      render("games");
      root.querySelector(mathGame.status === "complete" ? ".game-results h2" : ".math-question-card h2").focus();
      return;
    }
    if (target.id === "flashcard-toggle") {
      flashcardRevealed = !flashcardRevealed;
      render("flashcards");
      root.querySelector("#flashcard-toggle").focus();
      return;
    }
    if (target.id === "flashcard-previous" || target.id === "flashcard-next") {
      activeFlashcardIndex = (activeFlashcardIndex + (target.id === "flashcard-next" ? 1 : -1) + flashcards.length) % flashcards.length;
      flashcardRevealed = false;
      render("flashcards");
      root.querySelector("#flashcard-toggle").focus();
      return;
    }
    if (target.id === "flashcard-shuffle") {
      if (flashcards.length > 1) {
        let nextIndex = activeFlashcardIndex;
        while (nextIndex === activeFlashcardIndex) nextIndex = Math.floor(Math.random() * flashcards.length);
        activeFlashcardIndex = nextIndex;
      }
      flashcardRevealed = false;
      render("flashcards");
      root.querySelector("#flashcard-toggle").focus();
      return;
    }
    if (target.dataset.grade) {
      activeGrade = Number(target.dataset.grade);
      return render("curriculum");
    }
    if (target.dataset.track) {
      activeTrack = target.dataset.track;
      return render("curriculum");
    }
    if (target.dataset.lesson) return openLesson(target.dataset.lesson);
    if (target.dataset.filter) {
      activeFilter = target.dataset.filter;
      return render("learn");
    }
    if (target.id === "new-question") return render("practice");
    if (target.id === "complete-lesson") {
      const lessonId = state.lastLesson;
      if (lessonId && !state.completed.includes(lessonId)) {
        state.completed.push(lessonId);
        saveState();
        showToast("Lesson added to your progress.");
        openLesson(lessonId);
      } else {
        showToast("This lesson is already in your progress.");
      }
      return;
    }
    if (target.id === "reset-progress" || target.id === "clear-all-progress") {
      state = { completed: [], attempts: 0, correct: 0, lastLesson: null, bestGameScore: state.bestGameScore, tasks: state.tasks };
      saveState();
      showToast("Your saved progress has been cleared.");
      return render("progress");
    }
  });

  root.addEventListener("input", event => {
    if (event.target.id === "lesson-search") {
      const position = event.target.selectionStart;
      searchTerm = event.target.value;
      render("learn");
      const input = document.getElementById("lesson-search");
      input.focus();
      input.setSelectionRange(position, position);
    }
  });

  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", event => {
    if (!event.target.closest("#view-root")) {
      event.preventDefault();
      navigate(button.dataset.view);
    }
  }));
  document.getElementById("today-label").textContent = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short" }).format(new Date());
  render("home");
})();
