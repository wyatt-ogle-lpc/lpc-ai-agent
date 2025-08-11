# LPC AI Agent

This is a web-based AI assistant platform for **Lloyd Pest Control**, built with Ruby on Rails.  
It supports multiple specialized AI agents that help employees with tasks like work order lookups, policy guidance, and field procedure instructions.
Built on the **DigitalOcean GradientAI Platform** for hosting and managing AI agents.

---

## 🚀 Features

- **🧠 Multi‑Agent Architecture**
  Route queries through **Lloydbot (Router Agent)** to specialized assistants:
  Clypboard Assistant, Employee Handbook Helper, Route Tech Assistant, and Call Center Agent.

- **🔌 Centralized Agent Service**
  All AI calls flow through a single `DigitaloceanAgentService`, handling auth, routing, retries, and error shaping.

- **⚙️ In‑App Agent Configuration**
  Admins can configure agents from the Settings UI:
  update instructions/prompts, adjust retrieval mode, tune limits, and manage function routes and schemas.
  Changes are versioned with the ability to view and revert prior versions.

- **📚 Knowledge Base Management**
  Upload CSVs/docs to DigitalOcean Spaces and index them for retrieval‑augmented responses. Progress and token usage are surfaced in the UI.

- **🔐 Secure Google OAuth Login**
  Google OAuth 2.0 with sessions stored in `Rails.cache` and protected via encrypted cookies.
  Edit permissions are role‑gated (see `config/config-perms.txt`).

- **✨ Live Markdown + Typing Animation**
  Responses are streamed and rendered via `marked` while preserving full formatting (headers, bold, lists).

- **🎙️ Speech In/Out**
  Voice input via Google Cloud Speech‑to‑Text; playback via Text‑to‑Speech.

- **💬 Persistent Conversations**
  Threaded chat history so users can resume where they left off; start new threads anytime.

- **🗝️ API Key & Endpoint Management**
  Per‑agent API credentials and endpoints are stored in environment variables and surfaced in the Settings UI for operational visibility.

- **📦 File Storage**
  User uploads and KB artifacts stored on **DigitalOcean Spaces** (S3‑compatible).

---

## 🧱 Tech Stack

| Layer           | Technology                                                                      |
| :-------------- | :-------------------------------------------------------------------------------|
| **Backend**     | Ruby 3.2.2, Ruby on Rails 8.0.2, PostgreSQL 17, Puma 6.6.0                      |
| **Frontend**    | Hotwire (Turbo, Stimulus), Importmap, Propshaft, Tailwind CSS (custom styling)  |
| **AI Platform** | DigitalOcean GradientAI Platform                                                |
| **Speech**      | Google Cloud Speech-to-Text, Google Cloud Text-to-Speech                        |
| **Background Jobs** | Solid Queue 1.2.0 (with Solid Cable & Solid Cache)                          |
| **Auth**        | Google OAuth 2.0 via OmniAuth (omniauth-google-oauth2)                          |
| **File Storage**| DigitalOcean Spaces (S3-compatible)                                             |
| **HTTP & API**  | Faraday, HTTPParty                                                              |
| **Dev Tools**   | Dotenv, Brakeman, RuboCop, Minitest, Capybara                                   |
| **Deployment** | Manual (rbenv, Bundler, systemd, Puma)                                           |

---

## ⚙️ Environment Variables

Create a `.env` file in the project root and add the following keys:

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI Agent Credentials
LLOYDBOT_ENDPOINT=
LLOYDBOT_KEY=
LLOYDBOT_UUID=

CLYPBOARD_AGENT_KEY=
CLYPBOARD_AGENT_ENDPOINT=
CLYPBOARD_AGENT_UUID=

HANDBOOK_HELPER_KEY=
HANDBOOK_HELPER_ENDPOINT=
HANDBOOK_HELPER_UUID=

ROUTE_TECH_KEY=
ROUTE_TECH_ENDPOINT=
ROUTE_TECH_UUID=

CSR_KEY=
CSR_ENDPOINT=
CSR_UUID=

CLYPBOARD_API_KEY=
CLYPBOARD_API_URL=

GOOGLE_STT_KEY=

# DigitalOcean
DIGITALOCEAN_API=
DIGITALOCEAN_API_URL=

# DigitalOcean Spaces
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_BUCKET=
DO_SPACES_REGION=
CHEM_SPACES_BUCKET=
```

---

## 🚢 Deployment (Manual: rbenv + Bundler + systemd + Puma)

This app is deployed directly on the droplet using rbenv, Bundler (deployment mode), precompiled assets, and a systemd unit that runs Puma.

### One‑time setup (on the droplet)
```bash
# Install Ruby via rbenv and bundler
gem install bundler -N
bundle config set --local path vendor/bundle
bundle config set --local deployment true
bundle config set --local without 'development test'
bundle install

# Database + assets (first time)
RAILS_ENV=production bundle exec rails db:migrate
RAILS_ENV=production bundle exec rails assets:precompile
```

### Systemd service (Puma)
Create `/etc/systemd/system/lpc-ai-agent.service`:

```ini
[Unit]
Description=LPC AI Agent (Rails/Puma)
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/agent/lpc-ai-agent
Environment=RAILS_ENV=production
# rbenv shims used here, per your history:
ExecStart=/root/.rbenv/shims/bundle exec puma -C config/puma.rb
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable lpc-ai-agent
sudo systemctl start lpc-ai-agent
```
Updating the app
```bash
cd /root/agent/lpc-ai-agent
git pull origin main
bundle install
RAILS_ENV=production bundle exec rails db:migrate
RAILS_ENV=production bundle exec rails assets:precompile
sudo systemctl restart lpc-ai-agent
```
Health, logs, and troubleshooting

# Puma/rails logs
journalctl -u lpc-ai-agent -f
# Process check (Puma 6.6.0 on :3001 per history)
ps -ef | grep puma | grep -v grep
# Rails /up healthcheck (if exposed via proxy)
curl -I https://your.domain.com/up

Reverse proxy / SSL
If you’re fronting Puma with Nginx+Certbot or another proxy, point it to the Puma port from config/puma.rb (your process shows 0.0.0.0:3001) and ensure X-Forwarded-* headers are preserved.

---

## 📁 File Structure Highlights

```plaintext
.
├── .DS_Store
├── .gitignore
├── Gemfile
├── Gemfile.lock
├── README.md
├── app
│   ├── assets
│   │   ├── fonts
│   │   │   └── testpropshaft.txt
│   │   ├── images
│   │   │   ├── bell.svg
│   │   │   ├── eye.svg
│   │   │   ├── lock.svg
│   │   │   ├── mic.svg
│   │   │   ├── profile.svg
│   │   │   ├── recording.svg
│   │   │   └── settings.svg
│   │   ├── sounds
│   │   │   └── beep.wav
│   │   └── stylesheets
│   │       └── llm_chat.css
│   ├── controllers
│   │   ├── agents_controller.rb
│   │   ├── application_controller.rb
│   │   ├── authentications_controller.rb
│   │   ├── notifications_controller.rb
│   │   ├── sessions_controller.rb
│   │   ├── settings_controller.rb
│   │   ├── speech_controller.rb
│   │   └── tts_controller.rb
│   ├── helpers
│   │   ├── notifications_helper.rb
│   │   └── speech_helper.rb
│   ├── javascript
│   │   ├── application.js
│   │   ├── llm_chat.js
│   │   ├── settings
│   │   │   ├── functions.js
│   │   │   ├── guardrails.js
│   │   │   ├── helpers.js
│   │   │   ├── index.js
│   │   │   ├── instructions.js
│   │   │   ├── kb.js
│   │   │   ├── model_config.js
│   │   │   └── version.js
│   │   └── wav_encoder.js
│   ├── models
│   │   └── conversation.rb
│   ├── services
│   │   └── spaces_uploader.rb
│   └── views
│       ├── agents
│       │   └── ask.html.erb
│       ├── home
│       │   ├── index.html.erb
│       │   └── login.html.erb
│       ├── layouts
│       │   └── application.html.erb
│       ├── notifications
│       │   └── index.html.erb
│       └── settings
│           └── index.html.erb
├── config
│   ├── config-perms.txt
│   ├── environments
│   │   └── development.rb
│   ├── importmap.rb
│   ├── initializers
│   │   └── digitalocean_spaces.rb
│   ├── routes.rb
│   └── schedule.rb
├── db
│   ├── migrate
│   │   ├── 20250724202950_add_user_email_to_conversations.rb
│   │   └── 20250731184453_add_user_email_index_to_conversations.rb
│   └── schema.rb
└── public
    ├── audio
    │   └── audio-processor.js
    └── fonts
```
---

🧑‍💻 **Author**
Made by Wyatt Ogle
For Lloyd Pest Control

📄 **License**
Private/internal use only – not licensed for external distribution.