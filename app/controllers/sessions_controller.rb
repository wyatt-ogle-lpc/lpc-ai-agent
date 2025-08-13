class SessionsController < ApplicationController
  skip_before_action :require_login, only: [:create, :failure, :destroy]

  def create
    auth = request.env['omniauth.auth']
    unless auth
      Rails.logger.warn "OmniAuth auth hash missing. Possible misconfiguration or failed login."
      redirect_to login_path, alert: "Authentication failed. Please try again." and return
    end
  
    email = auth.dig('info', 'email')
    if email.blank?
      Rails.logger.error("OAuth returned no email: #{auth.inspect}")
      redirect_to login_path, alert: "Google account did not return an email." and return
    end
    name  = auth.dig('info', 'name')
    uid   = auth['uid']
  
    # Fetch role from Clypboard API
    user_info = fetch_user_data_from_clypboard(email)

    full_name = name.presence || "" # from Google OAuth

    google_first_name = full_name.split.first
    google_last_name  = full_name.split[1..].join(" ") # everything after first word

    user_data = {
      'info' => {
        'email'      => email,
        'name'       => if user_info[:first_name] && user_info[:last_name]
                           "#{user_info[:first_name]} #{user_info[:last_name]}"
                         elsif full_name.present?
                           full_name
                         else
                           nil
                         end,
        'first_name' => user_info[:first_name] || google_first_name,
        'last_name'  => user_info[:last_name]  || google_last_name
      },
      'uid' => uid,
      'role' => user_info[:role]
      'issued_at' => Time.now.utc.iso8601 # << store when this login was created
    }
  
    token = SecureRandom.hex(32)
    Rails.cache.write("user_auth_#{token}", user_data, expires_in: 2.weeks)
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


private


def fetch_user_data_from_clypboard(email)
  url = "#{ENV['CLYPBOARD_API_URL']}/employees"
  response = Faraday.get(url, { email: email, api_key: ENV['CLYPBOARD_API_KEY'] })

  Rails.logger.info("[Google OAuth] Fetching user data for #{email} - Status: #{response.status}")

  role = nil
  first_name = nil
  last_name = nil

  if response.success?
    data = JSON.parse(response.body)
    employee = data["employees"].find { |e| e["email"].casecmp?(email) }

    if employee
      role = employee["role"]
      first_name = employee["first_name"]
      last_name = employee["last_name"]
    end
  end

  Rails.logger.info("[Google OAuth] Role for #{email}: #{role}, Name: #{first_name} #{last_name}")
  { role: role, first_name: first_name, last_name: last_name }
end
