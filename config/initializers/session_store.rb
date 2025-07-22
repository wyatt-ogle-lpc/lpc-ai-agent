# config/initializers/session_store.rb

# This configuration is for the development environment.
if Rails.env.development?
    Rails.application.config.session_store :active_record_store,
      key: '_lpc_agent_app_session',
      same_site: :lax
  end