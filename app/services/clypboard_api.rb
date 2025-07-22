#app/services/clypboard_api.rb

require 'httparty'

class ClypboardAPI
  include HTTParty
  base_uri ENV.fetch('CLYPBOARD_API_URL')

  def self.get_work_orders(params = {})
    get('/work_orders', query: with_api_key(params))
  end

  def self.get_locations(params = {})
    get('/locations', query: with_api_key(params))
  end

  def self.get_employees(params = {})
    get('/employees', query: with_api_key(params))
  end

  def self.get_contacts(params = {})
    get('/contacts', query: with_api_key(params))
  end

  def self.get_proposals(params = {})
    get('/proposals', query: with_api_key(params))
  end

  def self.get_cancellation_reasons(params = {})
    get('/cancellation_reasons', query: with_api_key(params))
  end

  def self.create_lead(lead_params)
    post('/create_lead', body: { lead: lead_params, api_key: ENV['CLYPBOARD_API_KEY'] }.to_json, headers: { "Content-Type" => "application/json" })
  end

  def self.create_location_note(note_params)
    post('/location_note', body: note_params.merge(api_key: ENV['CLYPBOARD_API_KEY']).to_json, headers: { "Content-Type" => "application/json" })
  end

  def self.search_by_phone(phone)
    post('/search_by_phone', body: { phone: phone, api_key: ENV['CLYPBOARD_API_KEY'] }.to_json, headers: { "Content-Type" => "application/json" })
  end

  private

  def self.with_api_key(params = {})
    params.merge(api_key: ENV['CLYPBOARD_API_KEY'])
  end
end
