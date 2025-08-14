# app/controllers/settings_controller.rb
class SettingsController < ApplicationController
    before_action :require_login
  
    BASE_URL = "https://api.digitalocean.com/v2/gen-ai/agents"

    def versions
      uuid = params[:uuid]
      page = params[:page] || 1
    
      url = "#{BASE_URL}/#{uuid}/versions?page=#{page}"
      response = Faraday.get(url) do |req|
        req.headers["Authorization"] = "Bearer #{ENV['DIGITALOCEAN_API']}"
        req.headers["Content-Type"] = "application/json"
      end
    
      render json: JSON.parse(response.body), status: response.status
    end
    
    def revert_version
      uuid = params[:uuid]
      version_hash = params[:version_hash]
    
      # Revert settings
      url = "#{BASE_URL}/#{uuid}/versions"
      response = Faraday.put(url) do |req|
        req.headers["Authorization"] = "Bearer #{ENV['DIGITALOCEAN_API']}"
        req.headers["Content-Type"] = "application/json"
        req.body = { version_hash: version_hash }.to_json
      end
    
      # Fetch reverted version details
      reverted_version = fetch_version(uuid, version_hash)
    
      # Apply description from reverted version
      if reverted_version && reverted_version["description"].present?
        update_agent(uuid, { description: reverted_version["description"] }, desc: true)
      end
    
      body = JSON.parse(response.body) rescue {}
      render json: body.presence || { error: "Revert failed" }, status: response.status
    end
    
    def update_function
      agent_uuid = params[:agent_uuid] || params[:uuid]
      function_uuid = params[:function_uuid]
    
      # Handle nested `setting` param (Rails sometimes nests JSON under this key)
      payload = params[:setting] || params
    
      # Build the body exactly as DO expects
      body = {
        agent_uuid: agent_uuid,
        function_uuid: function_uuid,
        description: payload[:description],
        function_name: payload[:function_name],
        faas_name: payload[:faas_name],
        faas_namespace: payload[:faas_namespace],
        input_schema: payload[:input_schema] || {},
        output_schema: payload[:output_schema] || {}
      }
    
      # 1. Log the payload you are about to send
      Rails.logger.info "--> Sending payload to DigitalOcean: #{body.to_json}"
    
      url = "https://api.digitalocean.com/v2/gen-ai/agents/#{agent_uuid}/functions/#{function_uuid}"
    
      response = Faraday.put(url) do |req|
        req.headers["Authorization"] = "Bearer #{ENV['DIGITALOCEAN_API']}"
        req.headers["Content-Type"] = "application/json"
        req.body = body.to_json
      end
    
      # 2. Log the error response if the request was not successful
      unless response.success?
        Rails.logger.error "--> Received error from DigitalOcean: STATUS=#{response.status}, BODY=#{response.body}"
      end
    
      render json: JSON.parse(response.body), status: response.status
    end
    
    
    

    def name_version
      uuid = params[:uuid]
      payload = { description: params[:description] }
      update_agent(uuid, payload, desc: true)
      render json: { success: true }
    end
    
    def update_instruction
      uuid = params[:uuid]
      payload = { instruction: params[:instruction] }
      update_agent(uuid, payload)
      render json: { agent: fetch_agent(uuid) } # Return updated agent data
    end

    def update_model_config
      uuid = params[:uuid]
      payload = (params[:setting] || params).permit(:temperature, :max_tokens, :top_p, :k, :retrieval_method)
      update_agent(uuid, payload)
      render json: { success: true }
    end
  
  
    def index
      # preload known UUIDs (5 agents)
      @agents = {
        "Clypboard Assistant" => ENV["CLYPBOARD_AGENT_UUID"],
        "Handbook Helper" => ENV["HANDBOOK_HELPER_UUID"],
        "Route Tech Assistant" => ENV["ROUTE_TECH_UUID"],
        "Call Center Agent" => ENV["CSR_UUID"],
        "Lloydbot" => ENV["LLOYDBOT_UUID"]
      }
    end
  
    def fetch
        uuid = params[:uuid]
        render json: fetch_agent(uuid)
    end
  
    def update
      uuid = params[:uuid]
      payload = params.require(:agent).permit! # allow all keys for now
      update_agent(uuid, payload)
      redirect_to agent_settings_path(uuid), notice: "Agent updated successfully"
    end

    def fetch_kb_data_sources
        kb_uuid = params[:uuid]
        url = "https://api.digitalocean.com/v2/gen-ai/knowledge_bases/#{kb_uuid}/data_sources"

        response = Faraday.get(url) do |req|
            req.headers["Authorization"] = "Bearer #{ENV['DIGITALOCEAN_API']}"
            req.headers["Content-Type"] = "application/json"
        end

        render json: JSON.parse(response.body)
    end

    def delete_kb_data_source
        kb_uuid = params[:kb_uuid]
        ds_uuid = params[:ds_uuid]
      
        url = "https://api.digitalocean.com/v2/gen-ai/knowledge_bases/#{kb_uuid}/data_sources/#{ds_uuid}"
      
        response = Faraday.delete(url) do |req|
          req.headers["Authorization"] = "Bearer #{ENV['DIGITALOCEAN_API']}"
          req.headers["Content-Type"] = "application/json"
        end
      
        render json: JSON.parse(response.body), status: response.status
      end
      
      def add_kb_data_source
        kb_uuid = params[:uuid]
      
        # If uploading a file (AWS/Spaces)
        if params[:file].present?
          bucket_name = params[:bucket_name]
          remote_path = params[:file].original_filename
      
          # Ensure bucket exists
          s3 = Aws::S3::Client.new(
            access_key_id: ENV['DO_SPACES_KEY'],
            secret_access_key: ENV['DO_SPACES_SECRET'],
            region: ENV['DO_SPACES_REGION'],
            endpoint: "https://#{ENV['DO_SPACES_REGION']}.digitaloceanspaces.com"
          )
      
          begin
            s3.head_bucket(bucket: bucket_name)
          rescue Aws::S3::Errors::NotFound, Aws::S3::Errors::NoSuchBucket
            s3.create_bucket(bucket: bucket_name)
          end
      
          # Upload file manually using HMAC (same logic as your working script)
          upload_to_spaces(params[:file].tempfile.path, bucket_name, remote_path)
      
          # Build payload for DO API
          payload = {
            spaces_data_source: {
              bucket_name: bucket_name,
              item_path: remote_path,
              region: ENV['DO_SPACES_REGION']
            },
            knowledge_base_uuid: kb_uuid
          }
      
          # Send to DigitalOcean KB API
          response = Faraday.post("https://api.digitalocean.com/v2/gen-ai/knowledge_bases/#{kb_uuid}/data_sources") do |req|
            req.headers["Authorization"] = "Bearer #{ENV['DIGITALOCEAN_API']}"
            req.headers["Content-Type"] = "application/json"
            req.body = payload.to_json
          end
      
          render json: JSON.parse(response.body), status: response.status
          return
        end
      
        # JSON-based sources (Web Crawler / AWS w/o file upload)
        ds_params = params[:data_source] || params[:spaces_data_source] || params[:aws_data_source] || params[:web_crawler_data_source]
        raise ActionController::ParameterMissing, :data_source if ds_params.blank?
      
        payload =
          if params[:spaces_data_source]
            { spaces_data_source: ds_params.merge(region: ENV['DO_SPACES_REGION']) }
          elsif params[:aws_data_source]
            { aws_data_source: ds_params }
          elsif params[:web_crawler_data_source]
            { web_crawler_data_source: ds_params }
          else
            { data_source: ds_params }
          end
      
        response = Faraday.post("https://api.digitalocean.com/v2/gen-ai/knowledge_bases/#{kb_uuid}/data_sources") do |req|
          req.headers["Authorization"] = "Bearer #{ENV['DIGITALOCEAN_API']}"
          req.headers["Content-Type"] = "application/json"
          req.body = payload.to_json
        end
      
        render json: JSON.parse(response.body), status: response.status
      end
      
      
      
    def spaces_buckets
        s3 = Aws::S3::Client.new(
        access_key_id: ENV['DO_SPACES_KEY'],
        secret_access_key: ENV['DO_SPACES_SECRET'],
        region: ENV['DO_SPACES_REGION'],
        endpoint: "https://#{ENV['DO_SPACES_REGION']}.digitaloceanspaces.com"
        )
        buckets = s3.list_buckets.buckets.map(&:name)
        render json: buckets
    end


  
      
  
    
private




  def fetch_version(uuid, hash)
    url = "#{BASE_URL}/#{uuid}/versions/#{hash}"
    res = Faraday.get(url) do |req|
      req.headers["Authorization"] = "Bearer #{ENV['DIGITALOCEAN_API']}"
      req.headers["Content-Type"] = "application/json"
    end
    JSON.parse(res.body)["agent_version"]
  end

  def fetch_agent(uuid)
    url = "#{BASE_URL}/#{uuid}"
    response = Faraday.get(url) do |req|
      req.headers["Authorization"] = "Bearer #{ENV['DIGITALOCEAN_API']}"
      req.headers["Content-Type"] = "application/json"
    end
  
    agent = JSON.parse(response.body)["agent"] || {}
  
    # Ensure keys exist even if DO omits them when they are 0
    agent["max_tokens"]        = agent.key?("max_tokens")        ? agent["max_tokens"]        : 512
    agent["temperature"]       = agent.key?("temperature")       ? agent["temperature"]       : 0.0
    agent["top_p"]             = agent.key?("top_p")             ? agent["top_p"]             : 1.0
    agent["k"]                 = agent.key?("k")                 ? agent["k"]                 : 0
    agent["retrieval_method"]  = agent.key?("retrieval_method")  ? agent["retrieval_method"]  : "RETRIEVAL_METHOD_UNKNOWN"
  
    agent
  end
  
    def update_agent(uuid, payload, desc: false)
      # For auto-created versions, skip naming
      payload[:description] = "" unless desc
      # Ensure numeric fields are properly typed and keep 0
      %w[temperature top_p].each do |field|
        payload[field.to_sym] = payload[field].to_f if payload.key?(field)
      end
      %w[max_tokens k].each do |field|
        payload[field.to_sym] = payload[field].to_i if payload.key?(field)
      end
    
      url = "#{BASE_URL}/#{uuid}"
      Faraday.put(url) do |req|
        req.headers["Authorization"] = "Bearer #{ENV['DIGITALOCEAN_API']}"
        req.headers["Content-Type"] = "application/json"
        req.body = payload.to_json
      end
    end
    
    
    # Helper method to extract name from DO description format
    def extract_name_from_description(description)
      return nil unless description
      name_line = description.split("\n").find { |line| line.start_with?("<<Name:>>") }
      name_line&.sub("<<Name:>>", "")&.strip
    end
    
  
=begin
  def upload_to_spaces(local_path, bucket, remote_path)
    # Sanitize path for URL (replace spaces and special chars)
    safe_path = remote_path.gsub(/[^\w\.-\/]/, '_')
  
    body = File.read(local_path)
    now = Time.now.utc
    date_stamp = now.strftime("%Y%m%d")
    amz_date   = now.strftime("%Y%m%dT%H%M%SZ")
    service    = "s3"
    credential_scope = "#{date_stamp}/#{ENV['DO_SPACES_REGION']}/#{service}/aws4_request"
    algorithm        = "AWS4-HMAC-SHA256"
    signed_headers   = "host;x-amz-content-sha256;x-amz-date"
  
    payload_hash = OpenSSL::Digest::SHA256.hexdigest(body)
    host = "#{bucket}.#{ENV['DO_SPACES_REGION']}.digitaloceanspaces.com"
    canonical_headers = "host:#{host}\n" \
                        "x-amz-content-sha256:#{payload_hash}\n" \
                        "x-amz-date:#{amz_date}\n"
    canonical_request = "PUT\n/#{safe_path}\n\n#{canonical_headers}\n#{signed_headers}\n#{payload_hash}"
    hashed_request    = OpenSSL::Digest::SHA256.hexdigest(canonical_request)
    string_to_sign    = "#{algorithm}\n#{amz_date}\n#{credential_scope}\n#{hashed_request}"
  
    k_date    = OpenSSL::HMAC.digest('sha256', "AWS4#{ENV['DO_SPACES_SECRET']}", date_stamp)
    k_region  = OpenSSL::HMAC.digest('sha256', k_date, ENV['DO_SPACES_REGION'])
    k_service = OpenSSL::HMAC.digest('sha256', k_region, service)
    k_signing = OpenSSL::HMAC.digest('sha256', k_service, "aws4_request")
    signature = OpenSSL::HMAC.hexdigest('sha256', k_signing, string_to_sign)
  
    auth_header = "#{algorithm} Credential=#{ENV['DO_SPACES_KEY']}/#{credential_scope}, SignedHeaders=#{signed_headers}, Signature=#{signature}"
  
    url = "https://#{host}/#{safe_path}"
    uri = URI(url)
    req = Net::HTTP::Put.new(uri)
    req['x-amz-date'] = amz_date
    req['x-amz-content-sha256'] = payload_hash
    req['Authorization'] = auth_header
    req.body = body
  
    res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }
    raise "Spaces upload failed: #{res.code} - #{res.body}" unless res.code == "200"
  end
=end
end