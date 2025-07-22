# app/controllers/login_controller.rb
class LoginController < ApplicationController
  skip_before_action :require_login
end