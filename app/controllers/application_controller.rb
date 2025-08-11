# app/controllers/application_controller.rb
require 'csv'

class ApplicationController < ActionController::Base
  before_action :require_login, :check_notifications, :load_editable_roles
  helper_method :current_user, :logged_in?

  def require_login
    unless logged_in?
      redirect_to login_path, alert: "You must be signed in to access this page."
    end
  end

  def load_editable_roles
    file_path = Rails.root.join("config", "config-perms.txt")
    if File.exist?(file_path)
      @editable_roles = File.read(file_path).lines.map(&:strip).reject(&:empty?)
    else
      @editable_roles = []
    end
  end

  def current_user
    token = cookies.signed[:remember_token]
    return nil unless token
  
    cached = Rails.cache.read("user_auth_#{token}")
    return nil unless cached && cached.dig('info', 'email').present?
  
    cached
  end

  def logged_in?
    current_user.present?
  end

  private

  def check_notifications
    bucket = "chemicals"

    begin
      # Get the latest file
      response = DO_SPACES_CLIENT.list_objects_v2(bucket: bucket)
      objects = response.contents

      if objects.present?
        # Read most recent file
        latest = objects.max_by(&:last_modified)
        file_content = DO_SPACES_CLIENT.get_object(bucket: bucket, key: latest.key).body.read
        csv = CSV.parse(file_content, headers: true)

        # If CSV has chemical data (no "Message" header), set @has_updates
        @has_updates = csv.any? { |row| row['Alert'] == 'YES' }
      else
        @has_updates = false
      end

    rescue Aws::S3::Errors::ServiceError => e
      Rails.logger.error "Notification check failed: #{e.message}"
      @has_updates = false
    end
  end
end
