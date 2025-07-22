# app/services/digitalocean_agent_service.rb
require 'httparty'

class DigitaloceanAgentService
  include HTTParty

  ENDPOINTS = [
    ENV['CLYPBOARD_AGENT_ENDPOINT'],
    ENV['HANDBOOK_HELPER_ENDPOINT'],
    ENV['ROUTE_TECH_ENDPOINT'],
    ENV['CSR_ENDPOINT'], 
    ENV['LLOYDBOT_ENDPOINT']
  ].freeze

  API_KEYS = [
    ENV['CLYPBOARD_AGENT_KEY'],
    ENV['HANDBOOK_HELPER_KEY'],
    ENV['ROUTE_TECH_KEY'],
    ENV['CSR_KEY'],
    ENV['LLOYDBOT_KEY']
  ].freeze

  def initialize(agent_id)
    @agent_id = agent_id.to_i
    @base_uri = ENDPOINTS[@agent_id]
    @headers = {
      "Authorization" => "Bearer #{API_KEYS[@agent_id]}",
      "Content-Type" => "application/json"
    }
  end

  def chat(messages, stream: false, include_retrieval: false)
    body = {
      "messages": messages,
      "stream": stream,
      "include_functions_info": true,
      "include_retrieval_info": include_retrieval,
      "include_guardrails_info": true
    }.to_json

    puts "=== SENT REQUEST ==="
    puts JSON.pretty_generate(JSON.parse(body))
    puts "===================="

    self.class.post("#{@base_uri}/api/v1/chat/completions", headers: @headers, body: body)
  end
end
