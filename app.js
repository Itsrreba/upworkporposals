const state = {
  proposals: JSON.parse(localStorage.getItem("upworkProposals") || "[]"),
  profile: localStorage.getItem("upworkProfile") || "",
  portfolioLink: localStorage.getItem("upworkPortfolioLink") || "",
  currentDraft: null,
  draftVersion: 0,
};

const elements = {
  tabs: document.querySelectorAll(".tab-button"),
  panels: document.querySelectorAll(".tab-panel"),
  profileSummary: document.getElementById("profileSummary"),
  portfolioLink: document.getElementById("portfolioLink"),
  proposalForm: document.getElementById("proposalForm"),
  clientName: document.getElementById("clientName"),
  projectTitle: document.getElementById("projectTitle"),
  jobText: document.getElementById("jobText"),
  tone: document.getElementById("tone"),
  length: document.getElementById("length"),
  extraContext: document.getElementById("extraContext"),
  proposalOutput: document.getElementById("proposalOutput"),
  analysisStrip: document.getElementById("analysisStrip"),
  saveProposal: document.getElementById("saveProposal"),
  regenerateProposal: document.getElementById("regenerateProposal"),
  copyProposal: document.getElementById("copyProposal"),
  clearDraft: document.getElementById("clearDraft"),
  draftVersionLabel: document.getElementById("draftVersionLabel"),
  proposalScore: document.getElementById("proposalScore"),
  wordCount: document.getElementById("wordCount"),
  questionCount: document.getElementById("questionCount"),
  trackerRows: document.getElementById("trackerRows"),
  trackerSummary: document.getElementById("trackerSummary"),
  trackerSearch: document.getElementById("trackerSearch"),
  trackerFilter: document.getElementById("trackerFilter"),
  learningGrid: document.getElementById("learningGrid"),
  exportData: document.getElementById("exportData"),
  followUpOutput: document.getElementById("followUpOutput"),
  copyFollowUp: document.getElementById("copyFollowUp"),
};

elements.profileSummary.value = state.profile;
elements.portfolioLink.value = state.portfolioLink;

elements.tabs.forEach((button) => {
  button.addEventListener("click", () => {
    elements.tabs.forEach((tab) => tab.classList.toggle("active", tab === button));
    elements.panels.forEach((panel) => panel.classList.toggle("active", panel.id === button.dataset.tab));
    renderAll();
  });
});

elements.profileSummary.addEventListener("input", () => {
  state.profile = elements.profileSummary.value.trim();
  localStorage.setItem("upworkProfile", state.profile);
});

elements.portfolioLink.addEventListener("input", () => {
  state.portfolioLink = elements.portfolioLink.value.trim();
  localStorage.setItem("upworkPortfolioLink", state.portfolioLink);
});

elements.proposalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.draftVersion = 0;
  showDraft(createDraft(state.draftVersion));
});

elements.regenerateProposal.addEventListener("click", () => {
  state.draftVersion = state.currentDraft ? state.draftVersion + 1 : 0;
  showDraft(createDraft(state.draftVersion));
  flashButton(elements.regenerateProposal, "New version ready");
});

elements.copyProposal.addEventListener("click", async () => {
  if (!elements.proposalOutput.value.trim()) return;
  await navigator.clipboard.writeText(elements.proposalOutput.value);
  flashButton(elements.copyProposal, "Copied");
});

elements.clearDraft.addEventListener("click", () => {
  state.currentDraft = null;
  state.draftVersion = 0;
  elements.proposalOutput.value = "";
  elements.draftVersionLabel.textContent = "No draft yet";
  renderAnalysis(null, null);
  renderDraftMetrics("");
});

elements.saveProposal.addEventListener("click", () => {
  if (!state.currentDraft) {
    showDraft(createDraft(state.draftVersion));
  }

  state.proposals.unshift({
    id: crypto.randomUUID(),
    clientName: state.currentDraft.clientName,
    projectTitle: state.currentDraft.projectTitle,
    approach: `${state.currentDraft.variant.name} / ${state.currentDraft.analysis.approach}`,
    tone: state.currentDraft.tone,
    replyStrategy: state.currentDraft.analysis.replyStrategy,
    portfolioLink: state.currentDraft.portfolioLink,
    versionName: state.currentDraft.variant.name,
    proposal: state.currentDraft.proposal,
    jobText: state.currentDraft.jobText,
    status: "sent",
    notes: "",
    sentAt: new Date().toISOString(),
  });
  saveProposals();
  renderAll();
  flashButton(elements.saveProposal, "Saved");
});

elements.trackerSearch.addEventListener("input", renderTracker);
elements.trackerFilter.addEventListener("change", renderTracker);

elements.copyFollowUp.addEventListener("click", async () => {
  if (!elements.followUpOutput.value.trim()) return;
  await navigator.clipboard.writeText(elements.followUpOutput.value);
  flashButton(elements.copyFollowUp, "Copied");
});

elements.exportData.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.proposals, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `upwork-proposals-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

function createDraft(version = 0) {
  const jobText = elements.jobText.value.trim();
  const clientName = elements.clientName.value.trim() || "there";
  const projectTitle = elements.projectTitle.value.trim() || inferTitle(jobText);
  const analysis = analyzeJob(jobText, elements.extraContext.value, elements.tone.value);
  const variant = getVariant(version);
  const proposal = buildProposal({
    clientName,
    projectTitle,
    jobText,
    tone: elements.tone.value,
    length: elements.length.value,
    extraContext: elements.extraContext.value.trim(),
    profile: state.profile,
    portfolioLink: state.portfolioLink,
    analysis,
    variant,
  });

  return {
    clientName,
    projectTitle,
    jobText,
    tone: elements.tone.value,
    portfolioLink: state.portfolioLink,
    proposal,
    analysis,
    variant,
    version: version + 1,
  };
}

function showDraft(draft) {
  state.currentDraft = draft;
  elements.proposalOutput.value = draft.proposal;
  elements.draftVersionLabel.textContent = `Version ${draft.version}: ${draft.variant.name}`;
  renderAnalysis(draft.analysis, draft.variant);
  renderDraftMetrics(draft.proposal);
}

function analyzeJob(jobText, extraContext, tone) {
  const text = `${jobText} ${extraContext}`.toLowerCase();
  const keywords = extractKeywords(text);
  const context = analyzeClientContext(text);
  const urgency = /urgent|asap|immediately|today|quick|fast|deadline/.test(text) ? "fast delivery" : "clear execution";
  const category = inferCategory(text);
  const painPoint = inferPainPoint(text);
  const projectQuestion = inferProjectQuestion(text, category, context);
  const replyStrategy = inferReplyStrategy(text, category, urgency);
  const clientSignal = inferClientSignal(text, category, urgency);
  const observation = inferClientObservation(text, category, context);
  const deliverable = inferDeliverable(text, category);
  const promise = inferClientPromise(text, category, urgency);
  const approach = `${tone} / ${category} / ${replyStrategy}`;

  return {
    keywords,
    context,
    urgency,
    category,
    painPoint,
    projectQuestion,
    replyStrategy,
    clientSignal,
    observation,
    deliverable,
    promise,
    approach,
  };
}

function analyzeClientContext(text) {
  return {
    hasAssets: /photo|photos|photograph|photographs|image|images|text|copy|content|logo|brand asset|assets|video|file|files/.test(text),
    hasAccess: /login|logon|credential|credentials|access|admin|server|hosting|cloud|cpanel|ftp|wp admin/.test(text),
    hasPageScope: /\b\d+\s*(page|pages|screen|screens|template|templates)\b|one page|two pages|few pages/.test(text),
    hasDeadline: /deadline|within|asap|urgent|today|tomorrow|week|weeks|days|1- ?2|one to two/.test(text),
    hasOngoing: /ongoing|on-going|long[- ]?term|if all works out|future work|regular|monthly|continue/.test(text),
    hasExamples: /example|examples|reference|references|sample|samples|inspiration|similar/.test(text),
    hasCurrentSetup: /existing|current|already|template|templates|site|website|workflow|crm|database|spreadsheet|sheet/.test(text),
    hasUnclearScope: /not sure|unsure|need advice|recommend|help me decide|open to|flexible/.test(text),
    hasProvidedMaterials: /i will provide|we will provide|provided|attached|ready|necessary to upload/.test(text),
    hasManualWork: /manual|copy|paste|repetitive|form submission|form submissions|spreadsheet|sheet|workflow/.test(text),
  };
}

function extractKeywords(text) {
  const candidates = [
    "automation",
    "ai",
    "chatgpt",
    "dashboard",
    "website",
    "wordpress",
    "content",
    "photos",
    "templates",
    "cloud",
    "shopify",
    "api",
    "zapier",
    "make",
    "scraping",
    "database",
    "crm",
    "email",
    "design",
    "figma",
    "react",
    "node",
    "python",
    "extension",
  ];
  return candidates.filter((word) => text.includes(word)).slice(0, 5);
}

function inferCategory(text) {
  if (/automation|zapier|make|workflow|integrat/.test(text)) return "automation";
  if (/\bai\b|chatgpt|openai|llm|bot/.test(text)) return "AI workflow";
  if (/dashboard|report|analytics|spreadsheet|sheet/.test(text)) return "dashboard";
  if (/wordpress|wp admin|template|templates|content creator|content editor|photographs|photos|upload|cloud server|logon|login credentials|editing on/.test(text)) return "WordPress editing";
  if (/website|landing|wordpress|shopify|webflow|venture|brand|company/.test(text)) return "web build";
  if (/scrap|extract|data|database/.test(text)) return "data work";
  return "custom solution";
}

function inferPainPoint(text) {
  if (/wordpress|template|templates|photographs|photos|upload|content|editing/.test(text)) return "the site needs clean content updates without breaking the existing WordPress layout";
  if (/manual|time|repetitive|copy|paste/.test(text)) return "manual work is slowing the business down";
  if (/bug|fix|broken|error|issue/.test(text)) return "something important is not working reliably";
  if (/convert|sales|lead|client/.test(text)) return "the project needs to create measurable business results";
  if (/scale|growth|team|process/.test(text)) return "the current process needs to scale cleanly";
  return "the client needs someone who can understand the goal and turn it into a working result";
}

function inferProjectQuestion(text, category, context) {
  const contextQuestion = inferContextQuestion(text, context);
  if (contextQuestion) return contextQuestion;

  if (category === "WordPress editing") {
    if (/photographs|photos|images|text|content/.test(text)) {
      return "Do you already have the photos and text organized by page, or would you like me to help place and format them as part of the edit?";
    }
    if (/cloud server|logon|login|credentials|hosting/.test(text)) {
      return "Will WordPress admin access be enough for these edits, or do you expect the cloud server access to be needed too?";
    }
    if (/ongoing|long[- ]?term|all works out/.test(text)) {
      return "If this goes well, what kind of ongoing website updates would you likely need most often?";
    }
    return "Are the two pages already built as templates, or should I also adjust the layout while adding the content?";
  }
  if (/automation|zapier|make|workflow|integrat/.test(text)) {
    return "What is the one step in the current workflow that causes the most delay or mistakes?";
  }
  if (/\bai\b|chatgpt|openai|llm|bot|proposal/.test(text)) {
    return "Do you have a few examples of outputs you would actually send, so I can tune the result around that standard?";
  }
  if (/dashboard|report|analytics|spreadsheet|sheet/.test(text)) {
    return "Which number or status should be impossible to miss when someone opens the dashboard?";
  }
  if (/website|landing|wordpress|shopify|webflow|venture|brand|company/.test(text)) {
    return "What should a visitor understand or do within the first few seconds of landing on the site?";
  }
  if (/scrap|extract|data|database/.test(text)) {
    return "Where should the cleaned data live once it is ready to use?";
  }
  if (category === "custom solution") {
    return "What would make you feel the first version is ready to use?";
  }
  return "What would make you feel the first version is ready to use?";
}

function inferContextQuestion(text, context) {
  if (context.hasManualWork && /automation|zapier|make|workflow|integrat|spreadsheet|sheet/.test(text)) {
    return "Which manual step should disappear first so the automation saves time right away?";
  }
  if (context.hasAssets && context.hasPageScope) {
    return "Do you already have the content and images grouped by page, or would you like me to organize placement as I work through the edits?";
  }
  if (context.hasAssets) {
    return "Are the images/text already finalized, or should I also help with light formatting and placement where needed?";
  }
  if (context.hasAccess && /wordpress|wp admin|site|website/.test(text)) {
    return "Will WordPress admin access be enough for the work, or should I expect to use the hosting/server access too?";
  }
  if (context.hasAccess) {
    return "Will the needed access be ready at the start, or should I plan time to review the setup first?";
  }
  if (context.hasOngoing) {
    return "If the first project goes well, what type of ongoing updates would you likely need most often?";
  }
  if (context.hasExamples) {
    return "Do you have one or two examples you want the result to feel close to?";
  }
  if (context.hasCurrentSetup) {
    return "Is there anything in the current setup you want preserved exactly as it is?";
  }
  if (context.hasDeadline) {
    return "Is there a specific part you want completed first so you can review progress early?";
  }
  if (context.hasUnclearScope) {
    return "Would you prefer I suggest the cleanest first version before we expand the scope?";
  }
  return "";
}

function inferReplyStrategy(text, category, urgency) {
  if (category === "WordPress editing" && /ongoing|long[- ]?term|all works out/.test(text)) return "ongoing support reply";
  if (category === "WordPress editing") return "practical editing reply";
  if (urgency === "fast delivery") return "speed-first reply";
  if (/example|portfolio|past work|similar|experience|expert/.test(text)) return "proof-first reply";
  if (/not sure|advice|recommend|consult|strategy|best way/.test(text)) return "consultative reply";
  if (/bug|fix|broken|error|issue/.test(text)) return "fix-first reply";
  if (/manual|time|repetitive|copy|paste|process/.test(text)) return "pain-point reply";
  if (category === "AI workflow") return "output-quality reply";
  return "clarity-first reply";
}

function inferClientSignal(text, category, urgency) {
  if (category === "WordPress editing") return "I can handle the WordPress edits cleanly, work from the photos/text you provide, and keep the existing templates intact.";
  if (urgency === "fast delivery") return "I can move quickly, but I would still keep the first version controlled so speed does not turn into rework.";
  if (/example|portfolio|past work|similar|experience|expert/.test(text)) return "Since you are likely comparing people by relevant experience, I would keep the proposal practical and point you straight to examples.";
  if (/not sure|advice|recommend|consult|strategy|best way/.test(text)) return "It sounds like you may want someone who can help shape the approach, not just execute a task list.";
  if (/bug|fix|broken|error|issue/.test(text)) return "Since something needs fixing, I would first reproduce the issue and confirm the smallest reliable solution.";
  if (/manual|time|repetitive|copy|paste|process/.test(text)) return "The main opportunity seems to be removing repeated manual work without making the process harder to manage.";
  if (category === "AI workflow") return "For AI work, I would focus on output quality first: useful results, clear format, and easy review.";
  return "I would keep the work focused on the outcome first, then make the build decisions around that.";
}

function inferClientObservation(text, category, context = {}) {
  if (context.hasProvidedMaterials && context.hasAccess) {
    return "Since the materials and access will be provided, I would focus on clean execution, careful formatting, and quick review cycles.";
  }
  if (context.hasAssets) {
    return "Since the content/assets are part of the job, I would keep the work organized so each item is placed cleanly and nothing gets missed.";
  }
  if (context.hasAccess) {
    return "Since access/setup is involved, I would first confirm the working area and avoid changing anything outside the scope.";
  }
  if (context.hasOngoing) {
    return "Since this may become ongoing, I would keep the first project organized and easy to repeat.";
  }
  if (category === "WordPress editing") {
    return "This looks like the kind of job where being careful with the existing templates matters more than trying to redesign everything.";
  }
  if (/manual|time|repetitive|copy|paste|process/.test(text)) {
    return "The important part is making the repeated work disappear without creating a process that is harder to manage.";
  }
  if (/\bai\b|chatgpt|openai|llm|bot|proposal/.test(text)) {
    return "The quality bar matters here because generated output only helps if it feels specific enough to use immediately.";
  }
  if (/dashboard|report|analytics|spreadsheet|sheet/.test(text)) {
    return "The dashboard should be easy to scan, not just technically connected to the data.";
  }
  if (/website|landing|wordpress|shopify|webflow/.test(text)) {
    return "A good site here should make the offer feel clear and credible before anything decorative gets in the way.";
  }
  if (/bug|fix|broken|error|issue/.test(text)) {
    return "Reliability comes first, so I would avoid unnecessary changes until the issue is understood.";
  }
  if (category === "custom solution") {
    return "The cleanest path is a first version narrow enough to test quickly, then improve with real feedback.";
  }
  return "The cleanest path is a first version narrow enough to test quickly, then improve with real feedback.";
}

function inferDeliverable(text, category) {
  if (category === "WordPress editing") {
    if (/2 pages|two pages/.test(text)) {
      return "two WordPress template pages updated with the provided photos and text, keeping the layout clean and consistent";
    }
    return "clean WordPress content updates using the materials you provide, with the pages left polished and easy to review";
  }
  if (/website|landing|wordpress|shopify|webflow|venture|brand|company/.test(text)) {
    return "a polished website that explains the venture clearly, loads well, and gives visitors an obvious next step";
  }
  if (/automation|zapier|make|workflow|integrat/.test(text)) {
    return "a reliable workflow that removes the manual step and is easy to monitor after launch";
  }
  if (/\bai\b|chatgpt|openai|llm|bot|proposal/.test(text)) {
    return "an AI-assisted workflow that produces usable output, not generic text that still needs heavy rewriting";
  }
  if (/dashboard|report|analytics|spreadsheet|sheet/.test(text)) {
    return "a dashboard that makes the important numbers obvious and keeps the source data organized";
  }
  if (/scrap|extract|data|database/.test(text)) {
    return "a clean data pipeline that collects, structures, and delivers information in a usable format";
  }
  if (category === "custom solution") {
    return "a focused first version that solves the main problem without unnecessary complexity";
  }
  return "a focused first version that solves the main problem without unnecessary complexity";
}

function inferClientPromise(text, category, urgency) {
  if (category === "WordPress editing" && /ongoing|long[- ]?term|all works out/.test(text)) {
    return "I would keep the first round organized and easy to review, and I am happy to continue helping with ongoing updates if it is a good fit.";
  }
  if (category === "WordPress editing") {
    return "I would work carefully inside the existing WordPress setup, upload the provided materials, and keep you updated if anything needs clarification.";
  }
  if (urgency === "fast delivery") {
    return "I would prioritize a clean first launch, then refine once the foundation is working.";
  }
  if (/new venture|startup|brand|society|company/.test(text)) {
    return "I would make sure the first impression feels credible, modern, and easy to understand.";
  }
  if (/example|portfolio|past work|similar|experience|expert/.test(text)) {
    return "I would keep the work grounded in examples and show progress early so you can judge the direction.";
  }
  if (/manual|time|repetitive|copy|paste|process/.test(text)) {
    return "I would focus on saving time first, then make the system easier to maintain.";
  }
  if (category === "AI workflow") {
    return "I would tune the output around real examples so the tool feels useful instead of generic.";
  }
  return "I would keep the first milestone practical, reviewable, and tied to the result you actually need.";
}

function inferTitle(jobText) {
  const firstLine = jobText.split("\n").find((line) => line.trim().length > 8);
  return firstLine ? firstLine.trim().slice(0, 70) : "Upwork project";
}

function buildProposal(data) {
  const greeting = data.clientName.toLowerCase() === "there" ? "Hi there," : `Hi ${data.clientName},`;
  const keywords = data.analysis.keywords.length ? data.analysis.keywords.join(", ") : data.analysis.category;
  const profileLine = buildProofLine(data.profile, data.analysis.category);
  const portfolioLine = data.portfolioLink ? `Portfolio: ${data.portfolioLink}` : "";
  const contextLine = data.extraContext ? `Relevant context from my side: ${data.extraContext}` : "";
  const cta = getReplyClose(data.analysis);
  const question = data.analysis.projectQuestion;
  if (data.analysis.category === "WordPress editing") {
    return buildWordPressEditingProposal({ ...data, greeting, profileLine, portfolioLine, contextLine, cta, question });
  }
  const shared = { ...data, greeting, keywords, profileLine, portfolioLine, contextLine, cta, question };
  const sections = data.variant.compose(shared).filter(Boolean);
  const cleanedSections = sections.map(removeCopiedBriefFragments);

  if (data.length === "short") return cleanedSections.slice(0, data.variant.shortSections).join("\n\n");
  if (data.length === "medium") return cleanedSections.slice(0, data.variant.mediumSections).join("\n\n");
  return cleanedSections.join("\n\n");
}

function buildProofLine(profile, category) {
  const cleanProfile = profile.trim();
  if (!cleanProfile) return getDefaultProofLine(category);

  const lower = cleanProfile.toLowerCase();
  const experience = extractExperiencePhrase(lower);
  const skills = extractSkillPhrase(lower, category);
  const strength = extractStrengthPhrase(lower);

  if (experience && skills && strength) {
    return `${experience} in ${skills}, with a focus on ${strength}.`;
  }
  if (experience && skills) {
    return `${experience} in ${skills}, so I can step in with a practical, experienced approach.`;
  }
  if (experience && strength) {
    return `${experience} and focus on ${strength}.`;
  }
  if (skills && strength) {
    return `My background is in ${skills}, with a focus on ${strength}.`;
  }
  if (experience) {
    return `${experience} and can bring that experience into this project.`;
  }

  return polishProfileNote(cleanProfile, category);
}

function extractExperiencePhrase(text) {
  const decadeMatch = text.match(/\b(decade|10\+?\s*years?|ten\s*years?)\b/);
  const yearMatch = text.match(/\b(\d{1,2})\+?\s*(years?|yrs?)\b/);
  if (decadeMatch || (yearMatch && Number(yearMatch[1]) >= 10)) {
    return "I bring 10 years of experience";
  }
  if (yearMatch) {
    return `I bring ${yearMatch[1]} years of experience`;
  }
  return "";
}

function extractSkillPhrase(text, category) {
  const skills = [];
  if (/web design|design/.test(text)) skills.push("web design");
  if (/web development|development|developer|coding|frontend|front-end/.test(text)) skills.push("web development");
  if (/wordpress/.test(text)) skills.push("WordPress");
  if (/webflow/.test(text)) skills.push("Webflow");
  if (/shopify/.test(text)) skills.push("Shopify");
  if (/automation|zapier|make/.test(text)) skills.push("automation");
  if (skills.length) return joinList([...new Set(skills)]);

  const fallback = {
    "web build": "web design and development",
    "WordPress editing": "WordPress content updates and page formatting",
    automation: "workflow automation",
    "AI workflow": "AI-assisted workflows",
    dashboard: "dashboard and data presentation",
    "data work": "structured data workflows",
    "custom solution": "practical digital projects",
  };
  return fallback[category] || fallback["custom solution"];
}

function extractStrengthPhrase(text) {
  const strengths = [];
  if (/clean|polished|modern/.test(text)) strengths.push("clean, polished work");
  if (/fast|quick|deadline|delivery/.test(text)) strengths.push("reliable delivery");
  if (/communication|communicat/.test(text)) strengths.push("clear communication");
  if (/business|outcome|conversion|results/.test(text)) strengths.push("business outcomes");
  if (/detail|careful|quality/.test(text)) strengths.push("quality and attention to detail");
  return strengths[0] || "";
}

function polishProfileNote(profile, category) {
  const compact = profile
    .replace(/\s+/g, " ")
    .replace(/^i\s+(do|am|have|work)/i, "My background includes")
    .trim();
  if (compact.length > 150) {
    return `${getDefaultProofLine(category)} I can also bring the relevant experience from my background into this project.`;
  }
  return compact.endsWith(".") ? compact : `${compact}.`;
}

function joinList(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildWordPressEditingProposal(data) {
  const version = data.variant.name;
  const base = {
    "Confident concise": [
      data.greeting,
      "I can help with the WordPress edits and keep this simple: upload the provided photos/text, format the two template pages cleanly, and make sure everything stays consistent.",
      data.profileLine,
      data.portfolioLine,
      data.question,
      data.cta,
    ],
    "Client pain": [
      data.greeting,
      "For this kind of WordPress update, the main thing is careful execution: content placed correctly, images formatted well, and no unnecessary changes to the existing templates.",
      data.profileLine,
      data.portfolioLine,
      data.question,
      data.cta,
    ],
    "Proof first": [
      data.greeting,
      "This is a good fit for me. I am comfortable working inside WordPress, updating pages with provided content, and keeping edits clean so the site still feels polished.",
      data.profileLine,
      data.portfolioLine,
      data.question,
      data.cta,
    ],
    "Fast execution": [
      data.greeting,
      "I can handle the two WordPress page edits within your 1-2 week window and keep the process organized from the first upload to final review.",
      data.profileLine,
      data.portfolioLine,
      data.question,
      data.cta,
    ],
    Strategic: [
      data.greeting,
      "I would treat the first round as a clean working process: confirm the materials, update the two templates, review formatting, and leave the pages ready for your feedback.",
      data.profileLine,
      data.portfolioLine,
      data.question,
      data.cta,
    ],
  };
  const sections = (base[version] || base["Confident concise"]).filter(Boolean);
  if (data.length === "detailed" && data.contextLine) {
    sections.splice(sections.length - 1, 0, data.contextLine);
  }
  return sections.map(removeCopiedBriefFragments).join("\n\n");
}

function getDefaultProofLine(category) {
  const proofLines = {
    "web build": "I build clean, modern web experiences that make the offer easy to understand and simple to act on.",
    "WordPress editing": "I am comfortable working inside WordPress templates, adding content, formatting pages, and keeping updates clean.",
    automation: "I build practical automations that remove manual work without making the process harder to maintain.",
    "AI workflow": "I build AI workflows around real examples, clear output rules, and practical day-to-day use.",
    dashboard: "I build dashboards that make the important numbers easy to scan and the data easy to trust.",
    "data work": "I build data workflows that turn messy information into something structured and usable.",
    "custom solution": "I build focused first versions that solve the main problem without unnecessary complexity.",
  };
  return proofLines[category] || proofLines["custom solution"];
}

function removeCopiedBriefFragments(text) {
  return text
    .replace(/For\s+"[^"]+",?\s*/gi, "")
    .replace(/Your post (looks|sounds) like/gi, "This looks like")
    .trim();
}

function getReplyClose(analysis) {
  if (analysis.replyStrategy === "ongoing support reply") {
    return "Happy to treat this first edit as a test project and continue with ongoing updates if the workflow feels good.";
  }
  if (analysis.replyStrategy === "practical editing reply") {
    return "I can start by reviewing the two pages and organizing the first round of edits clearly.";
  }
  if (analysis.replyStrategy === "speed-first reply") {
    return "I can start with the highest-impact piece first and keep the delivery tight.";
  }
  if (analysis.replyStrategy === "proof-first reply") {
    return "If my portfolio looks aligned, I can send a quick outline of how I would approach your first version.";
  }
  if (analysis.replyStrategy === "consultative reply") {
    return "If helpful, I can suggest the cleanest first version before we build anything too big.";
  }
  if (analysis.replyStrategy === "fix-first reply") {
    return "If you can share the current setup or example issue, I can tell you the fastest reliable fix path.";
  }
  return "If this sounds close, I can send a quick outline of the first version.";
}

function getHook(tone, analysis) {
  const hooks = {
    direct: getOpeningLine(analysis),
    warm: `This is the kind of project where a clean first version matters more than a long discovery process.`,
    expert: `The key is not just finishing the task, but making the final result feel reliable and ready to use.`,
    curious: `This has a clear goal, and I would want to make the first version sharp rather than overcomplicated.`,
  };
  return hooks[tone];
}

function getOpeningLine(analysis) {
  if (analysis.category === "WordPress editing") {
    return "I can help with the WordPress edits and keep the process simple: add the provided content, format it cleanly, and make sure the two pages look consistent.";
  }
  if (analysis.category === "web build" && analysis.urgency === "fast delivery") {
    return "I can help get this launched quickly while keeping the first impression polished, clear, and credible.";
  }
  if (analysis.category === "web build") {
    return "I can help turn this into a polished website that explains the idea clearly and makes the next step obvious.";
  }
  if (analysis.category === "automation" && analysis.urgency === "fast delivery") {
    return "I can move quickly on this while keeping the automation clean enough to trust after launch.";
  }
  if (analysis.category === "AI workflow") {
    return "I can help build this so the output feels specific and usable, not like generic generated text.";
  }
  return `I can help with this. ${analysis.clientSignal}`;
}

function getVariant(version) {
  const variants = [
    {
      name: "Confident concise",
      shortSections: 7,
      mediumSections: 8,
      compose: (data) => [
        data.greeting,
        getHook(data.tone, data.analysis),
        `What I would aim to deliver is ${data.analysis.deliverable}.`,
        data.analysis.promise,
        data.profileLine,
        data.portfolioLine,
        data.question,
        data.contextLine,
        data.cta,
      ],
    },
    {
      name: "Client pain",
      shortSections: 7,
      mediumSections: 8,
      compose: (data) => [
        data.greeting,
        data.analysis.observation,
        `I would keep the first pass practical: define the main path, build that cleanly, and make sure the result is something you can review without guessing what is happening.`,
        data.analysis.promise,
        data.profileLine,
        data.portfolioLine,
        data.question,
        data.contextLine,
        data.cta,
      ],
    },
    {
      name: "Proof first",
      shortSections: 7,
      mediumSections: 8,
      compose: (data) => [
        data.greeting,
        `I work best on practical builds where the final result needs to be clear, usable, and easy for the client to review.`,
        `Based on the brief, I would focus on ${data.analysis.deliverable}.`,
        data.analysis.promise,
        data.profileLine,
        data.portfolioLine,
        data.question,
        data.contextLine,
        data.cta,
      ],
    },
    {
      name: "Fast execution",
      shortSections: 7,
      mediumSections: 8,
      compose: (data) => [
        data.greeting,
        `I can move quickly here, but I would not treat speed as an excuse to make the work messy.`,
        `The best path is to get the important piece working first, make it easy for you to review, then polish the details that actually affect the result.`,
        data.analysis.promise,
        data.profileLine,
        data.portfolioLine,
        data.question,
        data.contextLine,
        data.cta,
      ],
    },
    {
      name: "Strategic",
      shortSections: 7,
      mediumSections: 8,
      compose: (data) => [
        data.greeting,
        `Before jumping into execution, I would make sure the first version solves the right problem.`,
        `My recommendation would be to keep the first milestone narrow, useful, and easy to judge, then expand only after the direction is clear.`,
        `That usually leads to a better result than trying to build every possible feature at once.`,
        data.profileLine,
        data.portfolioLine,
        data.question,
        data.contextLine,
        data.cta,
      ],
    },
  ];

  return variants[version % variants.length];
}

function renderAnalysis(analysis, variant) {
  if (!analysis) {
    elements.analysisStrip.innerHTML = "";
    return;
  }
  elements.analysisStrip.innerHTML = [
    ["Category", analysis.category],
    ["Reply angle", analysis.replyStrategy],
    ["Version", variant ? variant.name : "not generated"],
    ["Keywords", analysis.keywords.join(", ") || "general"],
  ]
    .map(([label, value]) => `<div class="pill">${label}: ${escapeHtml(value)}</div>`)
    .join("");
}

function renderDraftMetrics(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const questions = (text.match(/\?/g) || []).length;
  const score = calculateProposalScore(text);
  elements.wordCount.textContent = words;
  elements.questionCount.textContent = questions;
  elements.proposalScore.textContent = score;
}

function calculateProposalScore(text) {
  if (!text.trim()) return 0;
  let score = 35;
  const words = text.trim().split(/\s+/).length;
  if (words >= 70 && words <= 150) score += 25;
  if (/\?/.test(text)) score += 20;
  if (/https?:\/\/|Portfolio:/i.test(text)) score += 20;
  if (/first version|core workflow|real examples|focused first milestone/i.test(text)) score += 10;
  if (words > 190) score -= 20;
  if (words < 45) score -= 8;
  return Math.max(0, Math.min(100, score));
}

function renderAll() {
  renderTracker();
  renderLearning();
}

function renderTracker() {
  const totals = getTotals();
  elements.trackerSummary.innerHTML = [
    ["Sent", totals.sent],
    ["Responded", totals.responded],
    ["No response", totals.noResponse],
    ["Reply rate", `${totals.replyRate}%`],
  ]
    .map(([label, value]) => `<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");

  const visibleProposals = getVisibleProposals();

  if (!state.proposals.length) {
    elements.trackerRows.innerHTML = `<tr><td class="empty-state" colspan="7">Saved proposals will appear here.</td></tr>`;
    return;
  }

  if (!visibleProposals.length) {
    elements.trackerRows.innerHTML = `<tr><td class="empty-state" colspan="7">No proposals match this filter.</td></tr>`;
    return;
  }

  elements.trackerRows.innerHTML = visibleProposals
    .map((proposal) => {
      const date = new Date(proposal.sentAt).toLocaleDateString();
      return `
        <tr>
          <td>${escapeHtml(proposal.clientName)}</td>
          <td>${escapeHtml(proposal.projectTitle)}</td>
          <td>${escapeHtml(proposal.approach)}</td>
          <td>
            <select data-id="${proposal.id}" data-field="status">
              ${statusOption("sent", "Sent", proposal.status)}
              ${statusOption("responded", "Responded", proposal.status)}
              ${statusOption("no-response", "No response", proposal.status)}
              ${statusOption("won", "Won", proposal.status)}
              ${statusOption("lost", "Lost", proposal.status)}
            </select>
          </td>
          <td>${date}</td>
          <td><input data-id="${proposal.id}" data-field="notes" value="${escapeHtml(proposal.notes)}" placeholder="Outcome, follow-up, client details" /></td>
          <td class="row-actions">
            <button data-follow-up="${proposal.id}" type="button">Follow up</button>
            <button class="delete-button" data-delete="${proposal.id}" type="button">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");

  elements.trackerRows.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("change", updateProposalField);
    if (input.tagName === "INPUT") {
      input.addEventListener("input", updateProposalField);
    }
  });
  elements.trackerRows.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      state.proposals = state.proposals.filter((proposal) => proposal.id !== button.dataset.delete);
      saveProposals();
      renderAll();
    });
  });
  elements.trackerRows.querySelectorAll("[data-follow-up]").forEach((button) => {
    button.addEventListener("click", () => {
      const proposal = state.proposals.find((item) => item.id === button.dataset.followUp);
      if (!proposal) return;
      elements.followUpOutput.value = buildFollowUp(proposal);
      flashButton(button, "Drafted");
    });
  });
}

function getVisibleProposals() {
  const status = elements.trackerFilter.value;
  const query = elements.trackerSearch.value.trim().toLowerCase();
  return state.proposals.filter((proposal) => {
    const matchesStatus = status === "all" || proposal.status === status;
    const haystack = [
      proposal.clientName,
      proposal.projectTitle,
      proposal.approach,
      proposal.notes,
      proposal.status,
    ]
      .join(" ")
      .toLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  });
}

function buildFollowUp(proposal) {
  const client = proposal.clientName && proposal.clientName !== "there" ? proposal.clientName : "there";
  const project = proposal.projectTitle || "your project";
  const angle = proposal.versionName || "the proposal";
  return [
    `Hi ${client},`,
    "",
    `Just wanted to follow up on my proposal for "${project}". I kept thinking about the workflow, and I still think the cleanest first step is to keep the first version focused and easy for you to test.`,
    "",
    `The angle I suggested was ${angle.toLowerCase()}, so I would start there and then adjust based on your feedback.`,
    "",
    "Would you like me to send a quick first milestone so you can see exactly how I would approach it?",
  ].join("\n");
}

function renderLearning() {
  const totals = getTotals();
  const approaches = groupByApproach();
  const best = approaches[0];
  const nextTone = recommendTone(approaches);

  elements.learningGrid.innerHTML = [
    {
      title: "Current signal",
      body: totals.sent
        ? `You have sent ${totals.sent} proposals with a ${totals.replyRate}% reply rate. Keep marking outcomes so the recommendations get sharper.`
        : "Start by saving a few proposals, then mark whether each client responded.",
    },
    {
      title: "Best approach so far",
      body: best
        ? `${best.name} has ${best.responded} replies from ${best.total} sent.`
        : "No clear winner yet. Try a few different tones and project angles.",
    },
    {
      title: "Next experiment",
      body: nextTone,
    },
  ]
    .map((card) => `<article class="learning-card"><h3>${card.title}</h3><p>${card.body}</p></article>`)
    .join("");
}

function getTotals() {
  const sent = state.proposals.length;
  const responded = state.proposals.filter((proposal) => ["responded", "won"].includes(proposal.status)).length;
  const noResponse = state.proposals.filter((proposal) => proposal.status === "no-response").length;
  const replyRate = sent ? Math.round((responded / sent) * 100) : 0;
  return { sent, responded, noResponse, replyRate };
}

function groupByApproach() {
  const map = new Map();
  state.proposals.forEach((proposal) => {
    const current = map.get(proposal.approach) || { name: proposal.approach, total: 0, responded: 0 };
    current.total += 1;
    if (["responded", "won"].includes(proposal.status)) current.responded += 1;
    map.set(proposal.approach, current);
  });
  return Array.from(map.values()).sort((a, b) => b.responded / b.total - a.responded / a.total);
}

function recommendTone(approaches) {
  if (!state.proposals.length) return "Send at least five proposals, using different tones, before trusting the pattern.";
  const lowSignal = state.proposals.length < 5;
  const best = approaches[0];
  if (!best) return "Try a direct proposal first, then compare it with a warmer version.";
  if (lowSignal) return `Early signal points to "${best.name}". Keep testing before making it your default.`;
  return `Use more of "${best.name}", then test one controlled change at a time: opening line, proof, or call to action.`;
}

function statusOption(value, label, selected) {
  return `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`;
}

function updateProposalField(event) {
  const proposal = state.proposals.find((item) => item.id === event.target.dataset.id);
  if (!proposal) return;
  proposal[event.target.dataset.field] = event.target.value;
  saveProposals();
  renderLearning();
  if (event.target.tagName === "SELECT") {
    renderTracker();
  }
}

function saveProposals() {
  localStorage.setItem("upworkProposals", JSON.stringify(state.proposals));
}

function flashButton(button, text) {
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = original;
  }, 1100);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderDraftMetrics("");
renderAll();
