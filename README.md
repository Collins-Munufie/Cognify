# Cognify 🧠

**Cognify** is an AI-powered study buddy that turns your notes, documents, and web links into interactive study materials in seconds. 

Whether you need flashcards, quizzes, or a personalized tutor, Cognify helps you learn faster and smarter.

---

## 🚀 What Can It Do?

- **Upload Anything:** Give it a PDF, Word document, PowerPoint, or a website link.
- **Get Instant Study Materials:** Cognify automatically creates:
  - Flashcards for quick memorization.
  - Quizzes (Multiple Choice, True/False, Fill-in-the-Blank).
  - Written Tests to check your deep understanding.
  - Beautifully formatted, easy-to-read study notes.
- **Listen to a Podcast:** Turn your notes into an engaging audio podcast. Choose your favorite AI voice (like a warm female voice or a deep male voice) and listen on the go!
- **Track Your Progress:** See what you've mastered and what you need to review with a simple dashboard.
- **Easy Login:** Jump right in with a secure and fast Google sign-in.

---

## 🛠️ For Developers: How to Run It

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
