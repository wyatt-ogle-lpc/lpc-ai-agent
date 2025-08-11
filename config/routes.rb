#config/routes.rb
Rails.application.routes.draw do
  if Rails.env.development?
    get "rails/importmap.json", to: "importmap#index"
  end

  
  get "notifications/index"
  root "home#index"
  get "home/index"

  delete "logout", to: "sessions#destroy" # Or get '/logout', to: 'sessions#destroy'

  get "/auth/google_redirect", to: "authentications#redirect_to_google", as: :google_login
  get "/login", to: redirect("/auth/google_redirect"), as: :login
  
  get "/auth/:provider/callback", to: "sessions#create"
  get "/auth/failure", to: redirect("/")
    
  get "up" => "rails/health#show", as: :rails_health_check

  post "/ask/new", to: "agents#new_chat", as: :new_chat
  post "/ask/:id", to: "agents#create", as: :submit_prompt
  get "/ask", to: "agents#ask", as: :ask

  delete "/conversations/:id", to: "agents#destroy", as: :delete_conversation

  post "/transcribe", to: "speech#transcribe"
  post "/tts", to: "tts#speak"

  get "notifications", to: "notifications#index", as: :notifications

  get "settings", to: "settings#index"
  get "/settings/fetch/:uuid", to: "settings#fetch", as: "fetch_agent_settings"
  patch "/settings/:uuid", to: "settings#update", as: "agent_settings"

# Settings for Knowledge Base Data Sources
  get    '/settings/fetch_kb_data_sources/:uuid',         to: 'settings#fetch_kb_data_sources'
  delete '/settings/delete_kb_data_source/:kb_uuid/:ds_uuid', to: 'settings#delete_kb_data_source'
  post   '/settings/add_kb_data_source/:uuid',            to: 'settings#add_kb_data_source'
  get    'settings/spaces_buckets', to: 'settings#spaces_buckets'

  put "/settings/agents/:uuid/instruction", to: "settings#update_instruction"
  put "/settings/agents/:agent_uuid/functions/:function_uuid", to: "settings#update_function"
  put "/settings/agents/:uuid/model_config", to: "settings#update_model_config"
  get '/settings/agents/:uuid/versions', to: 'settings#versions'
  put '/settings/agents/:uuid/versions', to: 'settings#revert_version'
  put 'settings/agents/:uuid/name_version', to: 'settings#name_version'

end
