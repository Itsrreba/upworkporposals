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
    hasAudience: /audience|users|customers|clients|visitors|buyers|leads|patients|members|students/.test(text),
    hasPlatform: /facebook|instagram|tiktok|youtube|linkedin|wordpress|shopify|webflow|zapier|make|airtable|notion|hubspot|salesforce/.test(text),
  };
}

function extractKeywords(text) {
  const candidates = [
    ["automation", /\bautomation\b/],
    ["AI", /\bai\b|chatgpt|openai|llm/],
    ["dashboard", /\bdashboard\b/],
    ["website", /\bwebsite\b|\bsite\b/],
    ["wordpress", /\bwordpress\b|wp-admin|wp admin/],
    ["content", /\bcontent\b|\bcopy\b/],
    ["photos", /\bphotos?\b|\bimages?\b|\bphotographs?\b/],
    ["templates", /\btemplates?\b/],
    ["cloud", /\bcloud\b/],
    ["shopify", /\bshopify\b/],
    ["api", /\bapi\b/],
    ["zapier", /\bzapier\b/],
    ["make", /\bmake(?:\\.com)?\b/],
    ["scraping", /\bscrap(?:e|ing)?\b/],
    ["database", /\bdatabase\b/],
    ["crm", /\bcrm\b/],
    ["email", /\bemail\b/],
    ["ads", /\bads?\b|advertising/],
    ["facebook", /\bfacebook\b/],
    ["instagram", /\binstagram\b/],
    ["creative", /\bcreative\b/],
    ["design", /\bdesign\b|\bdesigner\b/],
    ["figma", /\bfigma\b/],
    ["react", /\breact\b/],
    ["node", /\bnode(?:\\.js)?\b/],
    ["python", /\bpython\b/],
    ["extension", /\bextension\b/],
  ];
  return candidates.filter(([, pattern]) => pattern.test(text)).map(([label]) => label).slice(0, 5);
}

function inferCategory(text) {
  if (/virtual assistant|admin support|data entry|calendar|inbox|administrative/.test(text)) return "admin support";
  if (/meta ads|facebook ads|instagram ads|static ads|social ads|ad creative|ads creative|paid social|image ads|banner ads/.test(text)) return "ad creative";
  if (/automation|zapier|make|workflow|integrat/.test(text)) return "automation";
  if (/\bai\b|chatgpt|openai|llm|bot/.test(text)) return "AI workflow";
  if (/dashboard|report|analytics|spreadsheet|sheet/.test(text)) return "dashboard";
  if (/wordpress|wp admin|wp-admin|content creator|content editor|cloud server|logon|login credentials|editing on|wordpress template|wordpress templates/.test(text)) return "WordPress editing";
  if (/website|landing|wordpress|shopify|webflow|venture|brand|company/.test(text)) return "web build";
  if (/scrap|extract|data|database/.test(text)) return "data work";
  return "custom solution";
}

function inferPainPoint(text) {
  if (/meta ads|facebook ads|instagram ads|static ads|social ads|ad creative|paid social|image ads/.test(text)) return "the ads need to look clear, on-brand, and strong enough to stop the scroll";
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

  if (category === "ad creative") {
    if (/copy|text|headline|hook/.test(text)) {
      return "Do you already have the ad copy/headlines finalized, or should I help shape the creative around the strongest hook?";
    }
    if (/photo|photos|image|images|product/.test(text)) {
      return "Do you already have the product photos selected, or should I choose the strongest ones for the first ad concepts?";
    }
    return "Are these ads meant more for testing new angles or scaling a direction that is already working?";
  }

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
    return "Which metrics or statuses should be included in the first version?";
  }
  if (/website|landing|wordpress|shopify|webflow|venture|brand|company/.test(text)) {
    return "Do you already have the content and branding ready, or should I help shape the page structure too?";
  }
  if (/scrap|extract|data|database/.test(text)) {
    return "Where should the cleaned data live once it is ready to use?";
  }
  return "";
}

function inferContextQuestion(text, context) {
  if (context.hasAssets && /meta ads|facebook ads|instagram ads|static ads|social ads|ad creative|paid social|image ads|product photos/.test(text)) {
    return "Are the product photos and ad copy already finalized, or should I help choose the strongest creative direction for the first versions?";
  }
  if (context.hasManualWork && /automation|zapier|make|workflow|integrat|spreadsheet|sheet/.test(text)) {
    return "Which manual step should disappear first so the automation saves time right away?";
  }
  if (context.hasAssets && context.hasPageScope) {
    return "Do you already have the content and images grouped by page, or would you like me to organize placement as I work through the edits?";
  }
  if (context.hasAssets && /website|landing|brand|company|shopify|webflow/.test(text)) {
    return "Do you already have the main content and branding ready, or should I help shape the page structure too?";
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
  if (context.hasAudience && /website|landing|brand|ads|creative|email|copy/.test(text)) {
    return "Who is the main audience this needs to speak to?";
  }
  if (context.hasPlatform && /ads|creative|video|content|campaign/.test(text)) {
    return "Which platform should the first version be optimized for?";
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
  if (category === "ad creative") return "creative-performance reply";
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
  if (category === "admin support") return "I can help keep the admin work organized, accurate, and easy for you to hand off.";
  if (category === "ad creative") return "I can create clean static ad concepts that match the product and give you usable variations to test.";
  if (category === "WordPress editing") return "I can handle the WordPress edits cleanly, work from the photos/text you provide, and keep the existing templates intact.";
  if (urgency === "fast delivery") return "I can move quickly, but I would still keep the first version controlled so speed does not turn into rework.";
  if (/example|portfolio|past work|similar|experience|expert/.test(text)) return "Since you are likely comparing people by relevant experience, I would keep the proposal practical and point you straight to examples.";
  if (/not sure|advice|recommend|consult|strategy|best way/.test(text)) return "It sounds like you may want someone who can help shape the approach, not just execute a task list.";
  if (/bug|fix|broken|error|issue/.test(text)) return "Since something needs fixing, I would first reproduce the issue and confirm the smallest reliable solution.";
  if (/manual|time|repetitive|copy|paste|process/.test(text)) return "The main opportunity seems to be removing repeated manual work without making the process harder to manage.";
  if (category === "AI workflow") return "For AI work, I would focus on output quality first: useful results, clear format, and easy review.";
  return "I would focus on making the first version useful, clean, and easy for you to review.";
}

function inferClientObservation(text, category, context = {}) {
  if (category === "ad creative") {
    return "For static ads, the creative needs to communicate the offer quickly and look polished enough to earn attention in the feed.";
  }
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
  if (category === "admin support") {
    return "organized admin support that keeps the details accurate and reduces the amount of follow-up needed from you";
  }
  if (category === "ad creative") {
    return "a small set of polished static ad creatives that are clear, on-brand, and ready to test";
  }
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
  if (category === "admin support") {
    return "I would keep the workflow clear, communicate early, and make sure the details are handled consistently.";
  }
  if (category === "ad creative") {
    return "I would keep the first batch focused on strong visual hierarchy, clean formatting, and a few angles you can compare.";
  }
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
  const skills = extractSkillPhrase(cleanProfile);
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
  if (skills) {
    return `My background is in ${skills}, so I can bring relevant experience into this project.`;
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

function extractSkillPhrase(profile) {
  const text = profile.toLowerCase();
  const skills = [];
  const knownSkills = [
    ["video editing", /video edit|video editor|premiere|after effects|davinci|reels|short-form|short form|youtube video/],
    ["motion graphics", /motion graphics|animation|animated/],
    ["graphic design", /graphic design|graphic designer|visual design|brand design|branding|logo|creative design/],
    ["Meta static ads", /meta ads|facebook ads|instagram ads|static ads|social ads|ad creative|ads creative|paid social/],
    ["copywriting", /copywriting|copywriter|email copy|sales copy|landing page copy/],
    ["SEO", /\bseo\b|search engine optimization|keyword research/],
    ["data engineering", /data engineer|data engineering|etl|pipeline|data pipeline|warehouse|bigquery|snowflake|airflow|dbt/],
    ["data analysis", /data analyst|data analysis|analytics|power bi|tableau|looker|excel|spreadsheet|sql/],
    ["machine learning", /machine learning|ml engineer|data science|data scientist|model training|predictive/],
    ["backend development", /backend|back-end|api development|server-side|server side|node\.?js|django|laravel/],
    ["frontend development", /frontend|front-end|react|vue|angular|next\.?js/],
    ["web design", /web design|website design|ui design|ux design/],
    ["web development", /web development|website development|web developer|coding/],
    ["WordPress", /wordpress|wp admin|elementor|woocommerce/],
    ["Webflow", /webflow/],
    ["Shopify", /shopify/],
    ["automation", /automation|zapier|make\.com|integromat|workflow automation/],
    ["virtual assistance", /virtual assistant|admin support|data entry|calendar|inbox/],
    ["project management", /project manager|project management|scrum|agile|operations/],
    ["customer support", /customer support|customer service|helpdesk|support specialist/],
    ["3D design", /3d design|3d artist|blender|cinema 4d|rendering/],
    ["CAD design", /\bcad\b|autocad|solidworks|product design/],
    ["translation", /translator|translation|localization|bilingual/],
    ["writing", /content writing|writer|blog writing|article writing/],
    ["social media management", /social media manager|social media management|instagram management|content calendar/],
  ];

  knownSkills.forEach(([label, pattern]) => {
    if (pattern.test(text)) skills.push(label);
  });

  const rolePhrases = extractRolePhrases(profile);
  rolePhrases.forEach((role) => {
    if (!skillOverlaps(skills, role)) skills.push(role);
  });

  if (!skills.length && /\bdesign(er)?\b/.test(text)) skills.push("design");
  if (!skills.length && /\bdeveloper|development\b/.test(text)) skills.push("development");
  if (!skills.length && /\bmarketing|marketer\b/.test(text)) skills.push("marketing");
  if (!skills.length && /\bads?\b|advertising|creative/.test(text)) skills.push("ad creative");

  return joinList(dedupeSkills(skills).slice(0, 4));
}

function extractRolePhrases(profile) {
  const cleaned = profile
    .replace(/[.!?]/g, ",")
    .replace(/\s+/g, " ")
    .trim();
  const phrases = [];
  const patterns = [
    /\b(?:i am|i'm|im|as)\s+(?:a|an)?\s*([^,;]+?)(?:\s+(?:with|for|who)\b|,|$)/gi,
    /\b(?:i do|i work in|i specialize in|i focus on|expert in|specialist in|experience in|experienced in|background in)\s+([^,;]+?)(?:,|$)/gi,
  ];

  patterns.forEach((pattern) => {
    let match = pattern.exec(cleaned);
    while (match) {
      const phrase = cleanRolePhrase(match[1]);
      if (phrase) phrases.push(phrase);
      match = pattern.exec(cleaned);
    }
  });

  return phrases;
}

function cleanRolePhrase(phrase) {
  const cleaned = phrase
    .replace(/\b(for the past|past|over|around|about)\b.*$/i, "")
    .replace(/\b(\d{1,2}\+?\s*(years?|yrs?)|decade|ten years?)\b/gi, "")
    .replace(/\b(expert|specialist|professional)\b$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^and\s+/i, "");

  if (!cleaned || cleaned.length < 3 || cleaned.length > 70) return "";
  if (/^(this|that|it|all of that|stuff)$/i.test(cleaned)) return "";
  return normalizeSkillLabel(cleaned.toLowerCase());
}

function normalizeSkillLabel(skill) {
  const normalized = skill.trim();
  const map = [
    [/^video editor$/, "video editing"],
    [/^data engineer$/, "data engineering"],
    [/^data analyst$/, "data analysis"],
    [/^graphic designer$/, "graphic design"],
    [/^virtual assistant$/, "virtual assistance"],
    [/^project manager$/, "project management"],
    [/^customer support specialist$/, "customer support"],
  ];
  const match = map.find(([pattern]) => pattern.test(normalized));
  return match ? match[1] : normalized;
}

function skillOverlaps(skills, role) {
  const normalizedRole = role.toLowerCase();
  return skills.some((skill) => {
    const normalizedSkill = skill.toLowerCase();
    return normalizedSkill.includes(normalizedRole) || normalizedRole.includes(normalizedSkill);
  });
}

function dedupeSkills(skills) {
  const seen = new Set();
  return skills.filter((skill) => {
    const key = skill.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    .replace(/^i\s+(do|am|have|work\s+in|work)/i, "My background includes")
    .trim();
  if (compact.length > 150) {
    return "I can bring the relevant experience from my background into this project without overcomplicating the first version.";
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
    "ad creative": "I create clean static ad creatives that make the offer clear and easy to understand quickly.",
    "admin support": "I handle admin work with a focus on organization, accuracy, and clear communication.",
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
  if (analysis.replyStrategy === "creative-performance reply") {
    return "I can start with a few clean creative directions so you can quickly see what feels strongest.";
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
  return "If this sounds close, I can send a quick first-step outline.";
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
  if (analysis.category === "ad creative") {
    return "I can help turn this into clean ad creative that is easy to understand, on-brand, and useful for testing.";
  }
  if (analysis.category === "WordPress editing") {
    return "I can help with the WordPress edits and keep the process simple: add the provided content, format it cleanly, and make sure the two pages look consistent.";
  }
  if (analysis.category === "web build" && analysis.urgency === "fast delivery") {
    return "I can help get this launched quickly without making it feel rushed or unfinished.";
  }
  if (analysis.category === "web build") {
    return "I can help turn this into a clean, credible website that explains the offer clearly.";
  }
  if (analysis.category === "automation" && analysis.urgency === "fast delivery") {
    return "I can move quickly on this while keeping the automation clean enough to trust after launch.";
  }
  if (analysis.category === "AI workflow") {
    return "I can help make the AI output feel specific, useful, and ready to review instead of generic.";
  }
  return "I can help turn this into a clean first version you can review without making the project heavier than it needs to be.";
}

function getCreativeAngle(analysis) {
  const angles = {
    "ad creative": "I would focus on the first few seconds: clear hook, clean hierarchy, and a visual direction that makes the product easy to understand.",
    "web build": "I would keep the first version focused on credibility, clarity, and making the next step obvious.",
    automation: "I would map the manual step first, then build the smallest reliable workflow that saves time immediately.",
    "AI workflow": "I would work from real examples so the output has the right tone, format, and level of detail.",
    dashboard: "I would make the most important information impossible to miss, then keep the rest organized around it.",
    "data work": "I would keep the data flow clean: collect it, structure it, and deliver it somewhere useful.",
    "admin support": "I would keep the handoff simple, the details organized, and the communication clear.",
    "custom solution": "I would keep the first version narrow, useful, and easy to judge before adding more.",
  };
  return angles[analysis.category] || angles["custom solution"];
}

function getCredibilityLine(analysis) {
  const lines = {
    "ad creative": "I would keep the first batch sharp enough to test, with each version showing a clear reason to exist.",
    "web build": "I would make the first version easy to review: clear message, clean layout, and no unnecessary clutter.",
    automation: "I would make the workflow easy to trust, so it saves time without becoming another thing to manage.",
    "AI workflow": "I would tune the output around real examples, because generic AI text usually creates more editing work.",
    dashboard: "I would make the first version useful at a glance, then refine the details once the data is connected.",
    "data work": "I would keep the output clean enough that you can actually use it without another cleanup pass.",
    "admin support": "I would keep the details organized so you do not have to chase small updates or corrections.",
    "custom solution": "I would keep the scope clear, communicate what I am doing, and avoid making assumptions where the brief is still open.",
  };
  return lines[analysis.category] || lines["custom solution"];
}

function getActionLine(analysis) {
  const lines = {
    "ad creative": "My first move would be to create a few distinct directions, not tiny variations of the same ad, so you have something real to compare.",
    "web build": "My first move would be to shape the page around what the visitor needs to understand, then make the design feel polished and direct.",
    automation: "My first move would be to document the current step, build the cleanest working flow, and test it with real examples.",
    "AI workflow": "My first move would be to define what a good output looks like, then tune the workflow until the drafts feel usable.",
    dashboard: "My first move would be to decide the top-level view first, then connect the supporting data around it.",
    "data work": "My first move would be to confirm the source, clean structure, and final destination before building the repeatable part.",
    "admin support": "My first move would be to get the handoff organized so the work is accurate from the start.",
    "custom solution": "My first move would be to turn the brief into a simple first version that proves the direction before adding complexity.",
  };
  return lines[analysis.category] || lines["custom solution"];
}

function getVariant(version) {
  const variants = [
    {
      name: "Confident concise",
      shortSections: 8,
      mediumSections: 8,
      compose: (data) => [
        data.greeting,
        getHook(data.tone, data.analysis),
        getActionLine(data.analysis),
        getCredibilityLine(data.analysis),
        data.profileLine,
        data.portfolioLine,
        data.question,
        data.contextLine,
        data.cta,
      ],
    },
    {
      name: "Client pain",
      shortSections: 8,
      mediumSections: 8,
      compose: (data) => [
        data.greeting,
        data.analysis.observation,
        getActionLine(data.analysis),
        "I would keep the first pass practical enough to review, but polished enough that you can judge the direction properly.",
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
      shortSections: 8,
      mediumSections: 8,
      compose: (data) => [
        data.greeting,
        "This is the kind of work where small details matter because they shape whether the final result feels trustworthy.",
        getActionLine(data.analysis),
        getCredibilityLine(data.analysis),
        data.profileLine,
        data.portfolioLine,
        data.question,
        data.contextLine,
        data.cta,
      ],
    },
    {
      name: "Fast execution",
      shortSections: 8,
      mediumSections: 8,
      compose: (data) => [
        data.greeting,
        "I can move quickly here, but I would not treat speed as an excuse to make the work messy.",
        getActionLine(data.analysis),
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
      shortSections: 8,
      mediumSections: 8,
      compose: (data) => [
        data.greeting,
        "Before jumping into execution, I would make sure the first version solves the right problem.",
        getActionLine(data.analysis),
        "That usually leads to a better result than trying to build every possible feature at once.",
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
  if (/\?/.test(text)) score += 15;
  if (/https?:\/\/|Portfolio:/i.test(text)) score += 20;
  if (/first version|core workflow|real examples|first pass|highest-impact|ready to review|easy to review/i.test(text)) score += 10;
  if (!/\?/.test(text) && /If this sounds close|I can start|I can send/i.test(text)) score += 8;
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
