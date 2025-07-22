# app/controllers/home_controller.rb
class HomeController < ApplicationController
  skip_before_action :require_login

  def index
    if logged_in?
      render :index
    else
      render "home/login"
    end
  end
end