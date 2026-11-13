# RoKiSh Learning Lab

**An original Mathematics and STEM learning companion for Kenyan learners in Grades 1–12.**

RoKiSh Learning Lab is a small, install-free web app prototype built as a BSc Computer Studies capstone. Its SKR monogram is used as the app logo and browser icon. It uses short lessons, worked examples, quick checks, original grade-by-grade STEM scope guides, sample teacher-planning drafts and locally saved progress.

## Run the project

Open `index.html` in a current desktop or mobile browser. No build step, package installation, account, server or internet connection is required. The app uses system-font fallbacks and makes no external resource requests.

## Included in this prototype

- 12 original sample lessons spanning Mathematics and Computer Studies.
- Original Mathematics and related STEM learning scope guides and one sample lesson-plan draft per area for each grade from Grade 1 through Grade 12.
- An offline-ready STEM Lab activity library with low-resource science, design and computing investigations, teacher prompts, group adaptations and safety notes.
- A topic-specific interactive question for each sample lesson and each of the 24 grade-level Mathematics/STEM lesson drafts.
- Original, inline learning diagrams and suggested materials for the grade-level plan drafts.
- Junior and senior secondary learning filters and lesson search.
- Explanations, worked examples, objectives and one-question checks.
- A quick-practice view with immediate feedback.
- Two mathematics games—Math Quest and generated number-pattern puzzles—with primary, junior secondary and senior secondary question bands, explanations, streak points and a locally saved personal best.
- A study planner for adding, scheduling, completing and removing study tasks, with optional links to lessons.
- A flashcard review view using questions and explanations from sample lessons and grade-level plans.
- Lesson completion, practice totals and accuracy saved in browser local storage.
- A campus toolkit mapping every unit supplied in the project brief to a concrete project contribution, advanced extension or future-work area.
- Keyboard-operable native answer controls, screen-reader announcements for feedback, responsive layout, visible keyboard focus and reduced-motion support.

Progress and study tasks are stored only in the current browser on the current device. Clearing browser storage or using another device will not carry them over.

## Curriculum and academic scope

This is an independent learning aid, not an official Kenya Institute of Curriculum Development (KICD) resource and not the complete Kenyan syllabus. Its Grades 1–12 STEM scope guides and 24 planning drafts are original examples, not copied curriculum designs, an exhaustive list of strands/outcomes, official lesson plans, or TSC-approved/recommended plans. Grade-level subjects and pathway choices must be verified against current official designs before classroom use. Have qualified teachers review the learning content, materials, age appropriateness and assessment.

KICD provides official curriculum designs and curriculum support materials through its [CBC/CBE materials portal](https://kicd.ac.ke/cbc-materials/). The [Ministry of Education](https://education.go.ke/) publishes education policy and official information; the [Teachers Service Commission](https://www.tsc.go.ke/) publishes teacher-service and professional information. RoKiSh Learning Lab links to these official sources instead of republishing their documents. Source portals checked 12 November 2026; confirm the latest version directly with the relevant institution.

The sample lesson drafts use a practical planning structure—learning intention, connection/engagement, learner activity, check for understanding, suggested materials, support/extension, and one interactive topic question. These sample questions are formative checks, not validated examinations or a complete assessment of every learning outcome. Teachers should adapt timing, official learning outcomes, preparation, safety, assessment and local context. They are examples, not a claim about a universal TSC lesson-plan format.

The supplied university course list is mapped in the app's **Campus toolkit**. A credible capstone applies relevant units to the design, implementation, testing, evaluation and extensions of a coherent system. It does not claim that advanced university topics such as complex analysis or distributed systems are school lesson content.

## Senior project direction

The project is being refocused around inclusive mathematics access for blind and low-vision learners. The specific local research gap and originality claim still need to be established through a literature review and ethically approved consultation with learners, teachers and accessibility practitioners. Do not claim that no one has built a similar tool without evidence.

**Working title:** Design and Evaluation of an Accessible, Offline-First Mathematics Learning Web App for Blind and Low-Vision Learners in Kenya

**Problem to investigate:** How can blind and low-vision learners access and practise mathematics on a phone, including in settings with unreliable connectivity?

**Aim:** Design and evaluate an accessible, low-data mobile web learning tool with screen-reader-friendly lessons, useful descriptions of mathematical diagrams, practice feedback and offline access.

**Objectives:**

1. Review existing accessible mathematics tools and identify a specific gap relevant to the intended Kenyan learner community.
2. With the necessary institutional approvals and informed consent, gather requirements from blind or low-vision learners, teachers and accessibility practitioners.
3. Design and implement an accessible mobile web prototype, with structured lesson and progress data, responsive layouts and offline access.
4. Evaluate core tasks, screen-reader/keyboard usability, mobile performance and offline behavior with an appropriately approved study.
5. Document privacy, accessibility limitations, results and how relevant database, web, mobile and research units informed the work.

**How the units become project work:** Web Application Development is visible in the current browser app. Database Management Systems and Database Systems should result in a documented schema, relationships, validation and demonstrated queries for lesson content and privacy-minimised progress. The current prototype uses `localStorage`, which is not a database; that database work has not been implemented yet. Mobile Application Development is currently represented by responsive layout, not a native app or installable offline PWA. Offline-first support is a proposed deliverable that must be built and tested.

**Evaluation plan:** After literature review and approvals, test lesson access, mathematical diagram descriptions, answering, screen-reader and keyboard navigation, phone layout and offline behavior. Invite a suitable small group only with institutional approval and informed consent, including guardian consent where required. Minimise data collection, avoid identifiable learner data unless explicitly approved, and report methods, limitations and results honestly.

## Technical notes

- `index.html` contains the app shell.
- `styles.css` contains layout and responsive styles.
- `content.js` contains interactive lesson and campus mapping data.
- `curriculum.js` contains original grade-level scope-guide and sample lesson-plan data for Grades 1–12.
- `lab.js` contains original, adaptable low-resource STEM Lab activities; these are teaching ideas, not official KICD curriculum content.
- `app.js` implements view navigation, lesson rendering, quiz checks and local progress.
- No framework or third-party JavaScript dependency is required.

This is an educational prototype, not a complete learning-management system. It has no accounts, teacher dashboard, server, cloud sync, adaptive AI or validated claims about improved learning outcomes.
