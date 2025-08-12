Rails.application.config.session_store :active_record_store,
  key: "_lpc_ai_agent_session",
  same_site: :lax,
  secure: Rails.env.production?
