# LPC AI Agent

This is a web-based AI assistant platform for Lloyd Pest Control, built with the Hotwire stack on Ruby on Rails. It supports multiple specialized AI agents that help employees with tasks like work order lookups, policy guidance, and field procedure instructions.

---

## 🚀 Features

-   🧠 **Multi-agent Architecture**
    This application connects to a suite of specialized backend agents. Users can select from the following assistants:
    -   Lloydbot (Router Agent) 
    -   Clypboard Assistant 
    -   Employee Handbook Helper 
    -   Route Tech Assistant 
    -   Call Center Agent 

-   🔌 **Centralized Agent Service**
    Connects to DigitalOcean-hosted agent endpoints for all AI interactions, managed through a single `DigitaloceanAgentService` class.

-   🔐 **Secure Google OAuth Login**
    Handles authentication via Google OAuth. Session data is stored securely in `Rails.cache`, linked to an encrypted cookie in the user's browser.

-   ✨ **Live Markdown Rendering**
    Bot replies are animated and rendered as Markdown in real-time using `marked.js`, creating a dynamic and readable chat interface.

-   💬 **Persistent Conversations**
    Chat history is saved, allowing users to review and continue previous conversations. A new chat can be started at any time[cite: 2, 4].

---

## 🧱 Tech Stack

| Layer          | Technology                                                     |
| :------------- | :------------------------------------------------------------- |
| **Backend** | Ruby on Rails 8, PostgreSQL, Puma, Solid Queue    |
| **Frontend** | Hotwire (Turbo, Stimulus), Importmap, `marked.js` |
| **AI Backend** | [cite_start]DigitalOcean App Platform                               |
| **Dev Tools** | Dotenv, Brakeman, RuboCop, Minitest, Capybara    |
| **Deployment** | Kamal                                                   |

---

## 🛠️ Setup and Deployment

### Local Setup

1.  **Install dependencies:**
    ```bash
    bundle install
    ```

2.  **Set up the database:**
    ```bash
    rails db:setup
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the project root and add the following keys. [cite_start]These are used to connect to the Google OAuth application and the backend AI agents.
    ```env
    # Google OAuth Credentials
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=

    # DigitalOcean Agent Endpoints & Keys
    LLOYDBOT_ENDPOINT=
    LLOYDBOT_KEY=

    CLYPBOARD_AGENT_ENDPOINT=
    CLYPBOARD_AGENT_KEY=

    HANDBOOK_HELPER_ENDPOINT=
    HANDBOOK_HELPER_KEY=

    ROUTE_TECH_ENDPOINT=
    ROUTE_TECH_KEY=

    CSR_ENDPOINT=
    CSR_KEY=
    ```

4.  **Start the application:**
    Use the standard Rails `bin/dev` command, which starts the Puma web server. Background jobs via Solid Queue are automatically processed by Puma.
    ```bash
    bin/dev
    ```

### Deployment

This application is configured for deployment with **Kamal**.

-   The configuration is defined in `config/deploy.yml`.
-   Before deploying, ensure you have set up your servers and configured the `KAMAL_REGISTRY_PASSWORD` and `RAILS_MASTER_KEY` secrets via the Kamal CLI.
-   Deploy the application by running:
    ```bash
    bin/kamal deploy
    ```

---

## 📁 File Structure Highlights

app/
├── controllers/
│   ├── agents_controller.rb      # Core controller for handling prompts and conversations 
│   ├── sessions_controller.rb    # Manages Google OAuth callbacks and sessions 
│   └── application_controller.rb # Handles user authentication logic
│
├── javascript/
│   ├── controllers/              # Stimulus JS controllers
│   └── llm_chat.js               # Manages chat form, fetch requests, and response animation
│
├── models/
│   ├── conversation.rb           # ActiveRecord model for a single chat thread
│   └── message.rb                # ActiveRecord model for a user or bot message
│
├── services/
│   └── digitalocean_agent_service.rb # HTTP client for communicating with backend AI agents 
│
└── views/
├── agents/                   # Views for the main chat interface
└── layouts/                  # Application layout files

config/
├── routes.rb                     # Defines all application routes 
├── deploy.yml                    # Kamal deployment configuration
└── importmap.rb                  # Defines all JavaScript dependencies

---

🧑‍💻 **Author**
Made by Wyatt Ogle
For Lloyd Pest Control

📄 **License**
Private/internal use only – not licensed for external distribution.