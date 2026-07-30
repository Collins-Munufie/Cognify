Cognify 🧠

Cognify is an AI-powered learning platform designed to transform the way students study. Instead of spending hours reading through textbooks, lecture slides, research papers, or online resources, Cognify helps you convert learning materials into interactive, personalized study content within seconds.

Whether you're preparing for an exam, revising for a quiz, learning a new skill, or reviewing class notes, Cognify acts as your intelligent study companion—making learning more engaging, efficient, and effective.

 Core Features
 1. Upload and Analyze Learning Materials

Cognify accepts learning content from multiple sources, allowing students to study using the materials they already have.

Supported sources include:

PDF documents
Microsoft Word documents (.docx)
PowerPoint presentations (.pptx)
Plain text files
Website URLs
YouTube video links (lecture recordings, tutorials, educational videos)

Once uploaded, Cognify uses artificial intelligence to extract, analyze, and understand the content before generating personalized study resources.

 2. AI-Generated Study Notes

Instead of reading hundreds of pages, Cognify automatically creates well-structured study notes.

The generated notes:

Summarize important concepts
Highlight key definitions
Organize information into sections
Remove unnecessary content
Present information in an easy-to-read format

This helps students quickly understand complex topics without manually creating summaries.

 3. Smart Flashcards

Cognify automatically creates interactive flashcards from uploaded materials.

Each flashcard focuses on important concepts such as:

Definitions
Formulas
Vocabulary
Historical facts
Scientific concepts
Programming syntax
Key theories

Students can flip cards, review difficult concepts, and reinforce memory using active recall techniques.

Features include:

Question-and-answer format
Shuffle mode
Review difficult cards
Progress tracking
Spaced repetition support (future enhancement)
 4. AI Quiz Generator

Cognify generates quizzes instantly based on the uploaded content.

Supported quiz types include:

Multiple Choice Questions (MCQs)

Students choose the correct answer from several options.

Ideal for:

Exam preparation
Practice tests
Classroom revision
True or False Questions

Quick questions that reinforce understanding of facts and concepts.

Perfect for:

Fast revision sessions
Knowledge checks
Fill-in-the-Blank Questions

Important words or phrases are removed, encouraging students to recall information from memory.

This improves:

Retention
Recall speed
Understanding
Written Questions

For deeper learning, Cognify creates open-ended questions that require students to explain concepts in their own words.

These questions help develop:

Critical thinking
Conceptual understanding
Exam writing skills
🎙️ 5. AI Podcast Generation

Learning doesn't always have to happen by reading.

Cognify can transform study materials into engaging AI-generated podcasts.

Students simply upload their notes, and Cognify creates an audio version that sounds like a natural educational discussion.

Features include:

Multiple AI voices
Male and female voice options
Natural speech generation
Listen while commuting, exercising, or relaxing
Adjustable playback speed

This feature is ideal for auditory learners who retain information better through listening.

 6. Personal AI Tutor

Cognify includes an intelligent AI tutor that allows students to ask questions directly about their uploaded materials.

Examples include:

Explain this topic in simpler terms.
Give me an example.
Summarize this chapter.
Why is this concept important?
Compare these two ideas.
Generate additional practice questions.

The AI responds using the uploaded content as context, providing personalized explanations instead of generic internet answers.

 7. Learning Progress Dashboard

Cognify helps students monitor their learning journey through an easy-to-understand dashboard.

The dashboard provides insights such as:

Study sessions completed
Flashcards reviewed
Quiz scores
Topics mastered
Areas needing improvement
Learning streaks
Overall progress

Students can identify weak areas and focus on improving them before exams.

 8. Personalized Study Recommendations

Based on study activity and performance, Cognify recommends what to study next.

Recommendations may include:

Review difficult flashcards
Retake failed quizzes
Practice weak topics
Generate new questions
Continue unfinished study sessions

This creates a more personalized learning experience.
##  For Developers: How to Run It

This project is built with **React** (Frontend) and **FastAPI** (Backend), powered by the **Groq AI** engine.

### 1. Backend Setup (Python)

1. Open a terminal and go to the `backend` folder.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows: .\venv\Scripts\activate
   # On Mac/Linux: source venv/bin/activate
   ```
3. Install the required tools:
   ```bash
   pip install fastapi uvicorn sqlalchemy passlib[bcrypt] python-jose python-multipart python-dotenv groq google-auth PyMuPDF python-docx python-pptx
   ```
4. Create a `.env` file inside the `backend` folder and add your keys:
   ```env
   GROQ_API_KEY=your_groq_api_key
   JWT_SECRET_KEY=your_jwt_secret_key
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```
5. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### 2. Frontend Setup (React)

1. Open a new terminal and go to the `frontend` folder.
2. Install the required packages:
   ```bash
   npm install
   ```
3. Create a `.env` file inside the `frontend` folder and add your Google ID:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   ```
4. Start the website:
   ```bash
   npm run dev
   ```

---

*Start Mastering. Built with ❤️ for accelerated learning.*
