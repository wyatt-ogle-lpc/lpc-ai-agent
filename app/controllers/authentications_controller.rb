# app/controllers/authentications_controller.rb
class AuthenticationsController < ApplicationController
    # This controller doesn't require a user to be logged in.
    skip_before_action :require_login, only: [:redirect_to_google]
  
    def redirect_to_google
      # 1. Create a unique, unguessable state token to prevent CSRF attacks.
      state = SecureRandom.hex(24)
      session['omniauth.state'] = state
  
      # --- ADD THIS LOGGING ---
      #puts "\n"
      #puts "--- BEFORE GOOGLE REDIRECT ---"
      #puts "Session ID: #{session.id.public_id}"
      #puts "Stored state in session: #{session['omniauth.state']}"
      #puts "------------------------------"
      #puts "\n"
      # --------------------------
  
      # 2. Build the Google OAuth URL with all required parameters.
      client_id = ENV['GOOGLE_CLIENT_ID']
      redirect_uri = "http://localhost:3000/auth/google_oauth2/callback" # Must match Google Console
      scope = "email profile"
      
      google_auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + {
        response_type: "code",
        client_id: client_id,
        redirect_uri: redirect_uri,
        scope: scope,
        state: state,
        prompt: "select_account"
      }.to_query
  
      # 3. Redirect the user to Google.
      redirect_to google_auth_url, allow_other_host: true
    end
  end