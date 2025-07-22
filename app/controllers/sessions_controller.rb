class SessionsController < ApplicationController
  skip_before_action :require_login, only: [:create, :failure, :destroy]

  def create
    auth = request.env['omniauth.auth']
    unless auth
      Rails.logger.warn "OmniAuth auth hash missing. Possible misconfiguration or failed login."
      redirect_to login_path, alert: "Authentication failed. Please try again." and return
    end

    token = SecureRandom.hex(32)
    cache_key = "user_auth_#{token}"
    Rails.cache.write(cache_key, auth, expires_in: 2.weeks)
    cookies.permanent.signed[:remember_token] = token

    redirect_to root_path, notice: "Signed in with Google!"
  end

  def destroy
    token = cookies.signed[:remember_token]
    Rails.cache.delete("user_auth_#{token}") if token
    cookies.delete(:remember_token)
    reset_session
    redirect_to root_path, notice: "Signed out!"
  end

  def failure
    redirect_to root_path, alert: "Authentication failed. Please try again."
  end
end
