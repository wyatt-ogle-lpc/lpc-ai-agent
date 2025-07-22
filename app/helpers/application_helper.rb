module ApplicationHelper
    def clypboard_login_url
      base_url = "https://clypboard.lloydpest.com/users/login"
      redirect_uri = login_callback_url # This must match a route in your app
      "#{base_url}?redirect=#{CGI.escape(redirect_uri)}"
    end
    def agent_name(agent_id)
      {
        0 => "Clypboard Assistant",
        1 => "Handbook Helper",
        2 => "Route Tech Assistant",
        3 => "Call Center Agent",
        4 => "Lloydbot"
      }[agent_id.to_i] || "Unknown Agent"
    end

    def logged_in?
      session[:clypboard_token].present? && session[:clypboard_user_id].present?
    end
    
  end
  