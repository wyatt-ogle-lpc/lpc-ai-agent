# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  before_action :require_login

  helper_method :current_user, :logged_in?

  def require_login
    unless logged_in?
      redirect_to login_path, alert: "You must be signed in to access this page."
    end
  end

  def current_user
    token = cookies.signed[:remember_token]
    return unless token

    Rails.cache.read("user_auth_#{token}")
  end

  def logged_in?
    current_user.present?
  end
end
