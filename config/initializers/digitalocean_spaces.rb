# config/initializers/digitalocean_spaces.rb

require 'aws-sdk-s3'

# Ensure the required environment variables are set before initializing
if ENV['DO_SPACES_KEY'] && ENV['DO_SPACES_SECRET'] && ENV['DO_SPACES_REGION']
  DO_SPACES_CLIENT = Aws::S3::Client.new(
    access_key_id:     ENV.fetch('DO_SPACES_KEY'),
    secret_access_key: ENV.fetch('DO_SPACES_SECRET'),
    # Build the endpoint dynamically from the environment variable
    endpoint:          "https://#{ENV.fetch('DO_SPACES_REGION')}.digitaloceanspaces.com",
    region:            ENV.fetch('DO_SPACES_REGION')
  )
else
  # Log a warning if the app starts without proper configuration
  Rails.logger.warn("DigitalOcean Spaces client not initialized. Missing DO_SPACES_KEY, DO_SPACES_SECRET, or DO_SPACES_REGION.")
end