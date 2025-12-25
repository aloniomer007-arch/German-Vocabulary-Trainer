# 🇩🇪 DeutschPro | AI-Powered German Vocabulary Mastery

**DeutschPro** is a high-end, active vocabulary trainer designed to bridge the gap between passive recognition and active production. Utilizing the **Google Gemini API**, it maps 10,000 core German words across CEFR levels (A1–C2), providing learners with deep grammatical context, natural pronunciation, and an AI-driven practice environment.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)
![Gemini API](https://img.shields.io/badge/Google%20GenAI-Gemini%203%20Flash-orange?logo=google-gemini)

## ✨ Key Features

### 🧠 AI Philologist Engine
Every word in the app is processed by a specialized AI agent that provides:
*   **Automatic Disambiguation:** Handles words with multiple meanings. Adding `Essen (food)` creates a Noun card, while `Essen (to eat)` creates a Verb card with full conjugations.
*   **Existence Validation:** Strictly validates inputs against standard German dictionaries. If you enter gibberish or non-German words, the AI will alert: *"No such word exists in German."*
*   **Deep Metadata:** For nouns, it provides genders (der/die/das) and plural forms. For verbs, it provides 3rd person present, Präteritum, and Perfekt forms.

### 🎙️ Immersive Pronunciation
*   **Multi-part TTS:** High-fidelity speech for main words, plural forms, individual verb conjugations, and full example sentences.
*   **Article Integration:** Nouns are automatically pronounced with their correct definite article (e.g., "das Essen") to reinforce gender memory.

### 💬 AI Coach (Contextual Chat)
*   **Restricted Vocabulary:** Practice speaking with an AI tutor that strictly uses words you have already "Mastered."
*   **English Explanations:** The coach speaks German but provides grammar corrections and nuance explanations in English.
*   **Integrated Audio:** Listen to every AI response to improve listening comprehension alongside speaking.

### 📚 The Lexicon & Learning
*   **Personal Collection:** A central hub to manage your personal "Mastered" and "Learning" lists.
*   **Practice Pool:** Generate randomized review sessions from your own library to reinforce long-term retention.
*   **CEFR Tracking:** Monitor your progress toward the 10,000-word goal with per-level target tracking.

## 🛠️ Technical Stack

*   **Frontend:** React 19 (ES6+ Modules)
*   **Styling:** Tailwind CSS with a "Slate-Indigo" Dark Mode aesthetic.
*   **Icons:** Lucide React.
*   **AI Backend:** `@google/genai` (Gemini 3 Flash for logic, Gemini 2.5 Flash for TTS).
*   **Storage:** LocalStorage for persistence of Lexicon and User Progress.

## 🚀 Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/deutsch-pro.git
    ```

2.  **Environment Setup:**
    The application requires a valid Google Gemini API Key. Ensure it is available in your environment:
    ```javascript
    process.env.API_KEY = 'your_gemini_api_key_here'
    ```

3.  **Launch:**
    Because the project uses modern ES6 modules and standard browser APIs, you can run it via any local development server:
    ```bash
    npx serve .
    # Or use Live Server in VS Code
    ```

## 🎨 UI Philosophy
The app utilizes a "Card-Gradient" design language, inspired by premium educational platforms. It features:
*   **Glassmorphism:** Subtle blur effects and border glow for a modern feel.
*   **Typography First:** Playfair Display for primary German text and Inter for metadata to ensure high readability.
*   **Responsive Motion:** Smooth CSS animations and transitions for modal entry and progress bars.

## 📜 Disambiguation Usage
To add a word with a specific sense, use parentheses:
- `Bank (money)` → Result: *die Bank, -en (The financial institution)*
- `Bank (park)` → Result: *die Bank, "e (The sitting bench)*
- `Essen (food)` → Result: *das Essen (The meal)*
- `Essen (to eat)` → Result: *essen (The verb)*

---
*Created with ❤️ for German language enthusiasts.*
