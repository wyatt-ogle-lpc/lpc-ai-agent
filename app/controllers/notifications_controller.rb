require 'csv'

class NotificationsController < ApplicationController
  before_action :require_login
  include ActionView::Helpers::DateHelper

  def index
    bucket = ENV.fetch("CHEM_SPACES_BUCKET", "chemicals")
  
    begin
      response = DO_SPACES_CLIENT.list_objects_v2(bucket: bucket)
      objects = response.contents
    
      @notifications = objects.map do |obj|
        file_content = DO_SPACES_CLIENT.get_object(bucket: bucket, key: obj.key).body.read
        csv = CSV.parse(file_content, headers: true)
    
        body =
          # Format each chemical line
          csv.map do |row|
            name_display = row['Name']
            updated_at_raw = row['Updated At']
            updated_at = if updated_at_raw.present?
                            updated_at_raw
                              .gsub(/(?<!_)_(?!_)/, ':')
                              .gsub(/__/, ' – ')
                              .gsub('-', '/')
                          else
                            "N/A"
                          end
            if row['Alert'] == 'YES'
              ago = updated_at ? time_ago_in_words(updated_at) + " ago" : "N/A"
              "<span class='markdown-bold'>⚠️ #{name_display}</span> "\
              "(#{row['EPA Number']}) – #{row['Default Pest']} — "\
              "<span class='markdown-bold'>Updated: #{updated_at} — </span> "\
              "<span class='markdown-bold'>Updated: #{ago} ⚠️</span>"
            else
              "<span class='markdown-bold'>#{name_display}</span> "\
              "(#{row['EPA Number']}) – #{row['Default Pest']} – updated #{updated_at}"
            end
          end.join("\n\n")
  
        title =
          if csv.headers.include?("Message")
            "Recently Updated Chemicals"
          else
            "Chemical Updates"
          end
  
        {
          title: title,
          body: body
        }
      end
  
    rescue Aws::S3::Errors::NoSuchBucket
      logger.error "Bucket '#{bucket}' not found. Check name or region."
      @notifications = []
    rescue Aws::S3::Errors::ServiceError => e
      logger.error "Error fetching objects: #{e.message}"
      @notifications = []
    end
  end
  
end
