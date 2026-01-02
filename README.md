🇩🇪 DeutschPro | 10k Mastery
AI-Powered Active Vocabulary Trainer for German Learners
DeutschPro is a sophisticated, "active-first" vocabulary mastery platform designed to take learners from absolute beginners (A1) to native-level proficiency (C2). Unlike static flashcard apps, DeutschPro uses Google Gemini AI to dynamically generate contextually relevant, grammatically rich vocabulary batches tailored to the user's specific progress.
![alt text](https://img.shields.io/badge/version-3.0-indigo)

![alt text](https://img.shields.io/badge/AI-Gemini%203%20Flash-blue)

![alt text](https://img.shields.io/badge/Alignment-CEFR%20A1--C2-emerald)
🚀 Key Features
1. Dynamic AI Vocab Generation
Instead of a fixed database, DeutschPro utilizes a German Philologist Engine (powered by Gemini 3 Flash). It generates unique batches of words for any CEFR level, ensuring:
Verb Conjugations: Complete forms for Present 3rd, Past, and Past Participle.
Noun Accuracy: Automatic gender (der/die/das) and plural detection.
Contextual Examples: Real-world usage sentences with side-by-side translations.
2. Interactive Mastery Cards
Each vocabulary item is an immersive learning experience:
Pronunciation (TTS): High-quality audio generation for every word and example sentence.
Speaking Practice: Built-in voice recognition to test your pronunciation accuracy in real-time.
Grammar Insights: Detailed breakdowns of verb irregularities and prepositional cases.
3. AI Konversation Coach
Practice speaking the words you've actually learned. The AI Coach analyzes your "Mastered Lexicon" and engages you in a conversation using that specific vocabulary pool, helping move words from passive recognition to active usage.
4. Advanced Lexicon Management
Mastery Tracking: Visualize your progress toward the 10,000-word goal across all CEFR levels.
Review Pool: Smart filtering of "Learning" vs "Mastered" items.
Manual Entry: Add any German word to your list, and the AI will instantly fetch its complete grammatical profile.
5. Data Sovereignty & Portability
Local-First: All progress is cached in the browser for offline availability.
Backup & Sync: Integrated export functionality generates a standardized backup.json to keep your progress safe or sync across different project environments.
🛠 Tech Stack
Frontend: React (ES6+ Modules)
Styling: Tailwind CSS (Modern Glassmorphism UI)
Intelligence: Google GenAI SDK (Gemini 3 Flash & Gemini 2.5 Flash TTS)
Icons: Lucide React
Speech: Web Speech API (Recognition) & Gemini TTS (Synthesis)
📦 Installation & Setup
Clone the repository:
code
Bash
git clone https://github.com/yourusername/deutsch-pro.git
cd deutsch-pro
Configure API Access:
The application requires a valid Google Gemini API Key. Ensure your environment provides:
code
Env
API_KEY=your_gemini_api_key_here
Launch:
Since the project uses ES modules via import maps, you can serve it with any standard local dev server (e.g., Vite, Live Server, or npx serve).
🎯 Project Goals (10k Mastery)
The app is architected to support the following CEFR word targets:
A1/A2: 2,000 words (Foundation)
B1/B2: 3,000 words (Intermediate Fluency)
C1/C2: 5,000 words (Advanced Mastery & Nuance)
🤝 Contributing
As a "Senior Frontend Engineer" project, code quality is paramount. If you wish to contribute:
Ensure all types are strictly defined in types.ts.
Maintain the functional, component-based architecture.
Respect the "minimal update" principle for performance.
📄 License
MIT License - feel free to use this to master your German or build the next generation of language tools.
💡 Pro-Tip for Users
Use the Practice Pool feature in the Lexicon regularly. It shuffles your "Learning" items into a focused review session to solidify your memory before moving on to new AI batches.
