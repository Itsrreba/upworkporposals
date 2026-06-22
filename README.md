# Upwork Proposal Generator

A lightweight browser app for writing short, human Upwork proposals.

## What it does

- Generates concise Upwork proposals from a pasted job post.
- Always includes your saved portfolio link when provided.
- Analyzes what the client already mentioned, such as photos, text, access, hosting, examples, deadline, scope, or ongoing work.
- Adds a low-friction question based on those exact details so the proposal feels personal and easy to answer.
- Rewrites your rough key points into polished proof lines instead of copying them word-for-word.
- Infers the best reply angle from the job post, such as urgent, proof-first, consultative, or fix-first.
- Tracks sent proposals and client responses.
- Creates follow-up drafts.

## Proposal logic

The proposal should never ask abstract questions that make the client do strategy work unless the post clearly asks for strategy. It should ask practical questions connected to the brief, such as whether assets are organized, whether access is ready, what should be edited first, or what ongoing support they expect.

The "Key points about you" field should be treated as raw material. For example, a rough note like "I do web design/web development for the past 10 years" should become a polished proof point such as "I bring 10 years of experience in web design and web development."

## How to use locally

Open `index.html` in a browser.

## How to publish with GitHub Pages

1. Create a new GitHub repository.
2. Upload these files:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
   - `.nojekyll`
3. Go to repository `Settings`.
4. Open `Pages`.
5. Under `Build and deployment`, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Save.

GitHub will give you a public link like:

`https://your-username.github.io/your-repo-name/`

## Data note

Proposal history is stored in the browser on each laptop. If you open the app from another laptop, the app will load, but previous proposal history will not automatically sync yet.
