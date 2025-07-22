#config/routes.rb
Rails.application.routes.draw do
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



end
