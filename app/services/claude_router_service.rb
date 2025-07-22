# app/services/claude_router_service.rb
require 'net/http'
require 'uri'
require 'json'

class ClaudeRouterService
  CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
  MODEL = "claude-3-opus-20240229"

  def initialize(user_prompt)
    @user_prompt = user_prompt
  end

  def generate_directive
    uri = URI(CLAUDE_API_URL)

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    req = Net::HTTP::Post.new(uri)
    req["Content-Type"] = "application/json"
    req["x-api-key"] = ENV["CLAUDE_API_KEY"]
    req["anthropic-version"] = "2023-06-01"

    req.body = {
      model: MODEL,
      max_tokens: 512,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: routing_system_prompt
        },
        {
          role: "user",
          content: @user_prompt
        }
      ]
    }.to_json

    res = http.request(req)
    json = JSON.parse(res.body)
    json["content"] || "[ROUTING ERROR] Unable to determine route"
  rescue => e
    "[ROUTING ERROR] #{e.message}"
  end

  private

  def routing_system_prompt
    <<~PROMPT
    You are a routing assistant for a multi-agent system called Lloydbot. Your job is to read a user's prompt and generate a routing directive that tells Lloydbot:

    1. Which agent should handle the request
    2. What specific function or file(s) to use
    
    Use this format:
    
    [ROUTING DIRECTIVE]
    agent: <agent name>
    target_function/target_file: <function name (if clypboard_assistant) or list of filenames (if other)>
    [/ROUTING DIRECTIVE]
    
    ---
    
    ROUTING INSTRUCTIONS:
    
    Choose one of the following agents based on the nature of the user prompt:
    
    1. **agent: clypboard_assistant**
       Use this when the user is asking for:
       - Information about a specific **location**, **work order**, **person**, **customer**, etc.
       - Details that require looking up structured data via the Clypboard API
    
       If this agent is selected, pick the most appropriate target_function from this list:
    
        get_locations
        get_work_orders
        get_employees
        get_contacts
        get_proposals
        get_cancellation_reasons
        create_lead
    
    2. **agent: route_tech_assistant**
       Use this when the user is a **route technician** asking for:
       - Help performing a job duty (e.g. how to do a service or inspection)
       - Pest identification, safety protocols, or procedures
       - Help with using the **Clypboard UI**
    
       Choose up to 3 matching file names from this list of documents:
    
        Available Documents:

        - Folder: Equipment
            - Lloyd Pest Field Manual - IPM Statement.pdf
            - Lloyd Pest Field Manual - Maintenance.pdf
            - Lloyd Pest Field Manual - Pesticide Selection.pdf
            - Lloyd Pest Field Manual - Product Selection.pdf

        - Folder: Pests
            - Lloyd Pest Field Manual - Amphipod.pdf
            - Lloyd Pest Field Manual - Ants.pdf
            - Lloyd Pest Field Manual - Bed Bug Conventional Treatment Cheat Sheet.pdf
            - Lloyd Pest Field Manual - Bed Bug Protocol (2024).pdf
            - Lloyd Pest Field Manual - Bees.pdf
            - Lloyd Pest Field Manual - Bird Control.pdf
            - Lloyd Pest Field Manual - Carpet Beetles.pdf
            - Lloyd Pest Field Manual - Charcoal Seed Bug.pdf
            - Lloyd Pest Field Manual - Chinch - False Chinch Bug.pdf
            - Lloyd Pest Field Manual - Crane Fly.pdf
            - Lloyd Pest Field Manual - Earwigs.pdf
            - Lloyd Pest Field Manual - Filth Flies.pdf
            - Lloyd Pest Field Manual - Fleas.pdf
            - Lloyd Pest Field Manual - Flies.pdf
            - Lloyd Pest Field Manual - Food-Handling Commercial.pdf
            - Lloyd Pest Field Manual - Gophers.pdf
            - Lloyd Pest Field Manual - Ground Squirrels.pdf
            - Lloyd Pest Field Manual - Hospitality Bed Bug Protocol.pdf
            - Lloyd Pest Field Manual - Mosquito Control.pdf
            - Lloyd Pest Field Manual - Non-Food Handling Commercial.pdf
            - Lloyd Pest Field Manual - Residential Account.pdf
            - Lloyd Pest Field Manual - Rodent Bait Station Protocol.pdf
            - Lloyd Pest Field Manual - Rodent Control in Commercial Accounts.pdf
            - Lloyd Pest Field Manual - Rodent Control in Residential Accounts.pdf
            - Lloyd Pest Field Manual - Rodent Program Field Cheat Sheet.pdf
            - Lloyd Pest Field Manual - Rodents.pdf
            - Lloyd Pest Field Manual - Silverfish.pdf
            - Lloyd Pest Field Manual - Small Flies.pdf
            - Lloyd Pest Field Manual - Spider Control.pdf
            - Lloyd Pest Field Manual - Springtails.pdf
            - Lloyd Pest Field Manual - Stored Food Pests.pdf

        - Folder: Safety
            - Lloyd Pest Field Manual - CA Pyrethroid Regulations.pdf
            - Lloyd Pest Field Manual - Chemical Hazard Classification.pdf
            - Lloyd Pest Field Manual - Do's and Don'ts.pdf
            - Lloyd Pest Field Manual - DriveCam _ Lytx.pdf
            - Lloyd Pest Field Manual - Immediate Response SOP.pdf
            - Lloyd Pest Field Manual - Personal Protective Equipment.pdf
            - Lloyd Pest Field Manual - Pesticide Safety Information.pdf
            - Lloyd Pest Field Manual - Pesticide Spills.pdf
            - Lloyd Pest Field Manual - Prop 65.pdf
            - Lloyd Pest Field Manual - Safety Data Sheets.pdf

        - Folder: Service Procedures
            - Lloyd Pest Field Manual - Commercial Food Handling.pdf
            - Lloyd Pest Field Manual - Commercial Non-Food Establishments.pdf
            - Lloyd Pest Field Manual - Customer Service.pdf
            - Lloyd Pest Field Manual - FOJO 101.pdf
            - Lloyd Pest Field Manual - Flea Treatment Instructions.pdf
            - Lloyd Pest Field Manual - LPC Neonicotinoid (Alpine WSG) Policy.pdf
            - Lloyd Pest Field Manual - Palm Springs Service Procedures.pdf
            - Lloyd Pest Field Manual - Residential Maintenance Service.pdf
            - Lloyd Pest Field Manual - Sanitization for Vertebrate Waste.pdf
            - Lloyd Pest Field Manual - Schools.pdf
            - Lloyd Pest Field Manual - Service Plans.pdf
            - Lloyd Pest Field Manual - USDA Inspected Accounts.pdf
            - Lloyd Pest Field Manual - Using Raid on Ants.pdf

        - Folder: Tech
            - Lloyd Pest Field Manual - Accessing Labels & SDS's.pdf
            - Lloyd Pest Field Manual - Clypboard Icons explained.pdf
            - Lloyd Pest Field Manual - Clypboard Ticket System Explained.pdf
            - Lloyd Pest Field Manual - Clypboard Training.pdf
            - Lloyd Pest Field Manual - Difference between messages and calls.pdf
            - Lloyd Pest Field Manual - EOS Driver Course.pdf
            - Lloyd Pest Field Manual - How to Submit a Termite Lead.pdf
            - Lloyd Pest Field Manual - Not finding Flatline for Bait Stations.pdf
            - Lloyd Pest Field Manual - Setting up Apartments in Clypboard.pdf
            - Lloyd Pest Field Manual - Sticky Notes - Do's and Don'ts.pdf

        File: <<Date>> Service Bulletin <<Date>>.pdf
        File: Field Manual Home Page.pdf
        File: Loot for Leads.pdf
    
       If no file matches clearly, return the folder name that most likely contains the answer.
    
    3. **agent: employee_handbook_helper**
       Use this when the user is asking about:
       - Benefits, dress code, pay, scheduling, HR policies
       - Employee conduct, company guidelines, or official terms
    
       Choose up to 3 matching file names from this list of documents:
    
       {{INSERT_EMPLOYEE_HANDBOOK_FILES_HERE}}
    
       If no file matches clearly, return the folder name that most likely contains the answer.
    
    ---
    
    Your output must be in the `[ROUTING DIRECTIVE]` format shown above.
        
    ---
    
    EXAMPLE:
    
    User prompt: “how do I mark a location inactive?”
    
    Your output:
    [ROUTING DIRECTIVE]
    agent: clypboard_assistant
    target_function/target_file: update_location_status
    [/ROUTING DIRECTIVE]

    
    PROMPT
  end
end
