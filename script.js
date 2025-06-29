// Gemini API key - visible in frontend, do not use for production!
const GEMINI_API_KEY = "AIzaSyC_52EQfWFJrx7-JX4sQbbY_CEQVqhCcYU";
const MODEL_NAME = "gemini-pro";

const ls = window.localStorage;
let userName = ls.getItem('cb_userName') || 'You';
let botName = ls.getItem('cb_botName') || 'Bot';
let theme = ls.getItem('cb_theme') || 'light';

const chatArea = document.getElementById('chat-area');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');
const typingIndicator = document.getElementById('typing-indicator');
const overlay = document.getElementById('startup-overlay');
const startupForm = document.getElementById('startup-form');
const themeSelect = document.getElementById('themeSelect');

// Utility functions
function nowTimestamp() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function scrollToBottom() {
  chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: "smooth" });
}
function saveChatHistory(history) {
  ls.setItem('cb_history', JSON.stringify(history));
}
function loadChatHistory() {
  let h = [];
  try { h = JSON.parse(ls.getItem('cb_history') || '[]'); } catch {}
  return Array.isArray(h) ? h : [];
}
function showTypingIndicator(show=true) {
  typingIndicator.classList.toggle('hidden', !show);
}
function renderMessage(msg) {
  const bubble = document.createElement('div');
  bubble.className = `bubble ${msg.sender}`;
  bubble.innerHTML = msg.text.replace(/\n/g, "<br>");
  const timestamp = document.createElement('div');
  timestamp.className = `timestamp ${msg.sender}`;
  timestamp.textContent = msg.time;
  chatArea.appendChild(bubble);
  chatArea.appendChild(timestamp);
  scrollToBottom();
}
function renderHistory(history) {
  chatArea.innerHTML = '';
  history.forEach(renderMessage);
  scrollToBottom();
}

// --- Gemini AI Integration ---
let genAI, chatSession;
async function setupGemini() {
  if (!genAI) {
    genAI = new google.generativeai.GenerativeModel({
      model: MODEL_NAME,
      apiKey: GEMINI_API_KEY,
    });
  }
  // Start or continue a chat session
  if (!chatSession) {
    chatSession = await genAI.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    });
  }
}

async function aiBotReply(txt) {
  await setupGemini();
  showTypingIndicator(true);

  try {
    const result = await chatSession.sendMessage(txt);
    const reply = result.response.text().trim();
    addMsg('bot', reply || "I'm not sure how to reply.");
  } catch (err) {
    addMsg('bot', "Sorry, I couldn't reach Gemini. " + (err.message || err));
  } finally {
    showTypingIndicator(false);
  }
}

// --- Message Handling ---
function sendUserMsg() {
  const txt = chatInput.value.trim();
  if (!txt) return;
  addMsg('user', txt);
  chatInput.value = '';
  showTypingIndicator(true);
  aiBotReply(txt);
}

function addMsg(sender, text) {
  const msg = { sender, text, time: nowTimestamp() };
  let history = loadChatHistory();
  history.push(msg);
  saveChatHistory(history);
  renderMessage(msg);
}

// --- Startup Overlay ---
function showStartup() {
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  document.getElementById('userName').value = userName;
  document.getElementById('botName').value = botName;
  themeSelect.value = theme;
}
function hideStartup() {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// --- Theme ---
function setTheme(newTheme) {
  theme = newTheme;
  document.body.classList.toggle('dark', theme === 'dark');
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  themeSelect.value = theme;
  ls.setItem('cb_theme', theme);
}
themeToggle.onclick = () => setTheme(theme === 'light' ? 'dark' : 'light');
themeSelect.onchange = e => setTheme(e.target.value);

// --- Main ---
window.onload = () => {
  setTheme(theme);

  if (!ls.getItem('cb_initialized')) {
    showStartup();
  } else {
    renderHistory(loadChatHistory());
    setTimeout(() => { if (loadChatHistory().length===0) botIntro(); }, 300);
  }
  chatInput.focus();
};

startupForm.onsubmit = e => {
  e.preventDefault();
  userName = document.getElementById('userName').value.trim() || 'You';
  botName = document.getElementById('botName').value.trim() || 'Bot';
  setTheme(themeSelect.value);
  ls.setItem('cb_userName', userName);
  ls.setItem('cb_botName', botName);
  ls.setItem('cb_initialized', '1');
  saveChatHistory([]);
  hideStartup();
  chatInput.focus();
  botIntro();
};

function botIntro() {
  showTypingIndicator(true);
  setTimeout(() => {
    addMsg('bot', `Hi! I'm ${botName}, your assistant. How can I help you today? 😊`);
    showTypingIndicator(false);
  }, 700);
}

sendBtn.onclick = sendUserMsg;
chatInput.onkeydown = e => { if (e.key === 'Enter') sendUserMsg(); };
chatInput.onfocus = scrollToBottom;
window.addEventListener('keydown', e => {
  if (overlay.classList.contains('active') && (e.key === 'Escape')) hideStartup();
});