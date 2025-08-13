#app/controllers/agents_controller.rb
class AgentsController < ApplicationController
  
  before_action :set_conversation, only: [:ask, :create]
  
  # Token management configuration
  MAX_HISTORY_MESSAGES = 5
  MAX_TOKENS_PER_REQUEST = 3000 

  INPUT_COST_PER_M  = 3.0 # From Claude Sonnet 3.7
  OUTPUT_COST_PER_M = 15.0

  def ask
    unless current_user
      redirect_to login_path, alert: "You must be logged in to view conversations" and return
    end
    session[:agent_id] = params[:agent_id].to_i if params[:agent_id].present?

    @chat_history = get_full_chat_history
    session.delete(:last_bot_message_id) # ← one-time use

    user_email = current_user&.dig('info', 'email')
    base = Conversation
      .where(user_email: user_email)
      .joins(:messages)
      .where(messages: { role: "user" })
      .distinct
    
    @conversations = Conversation
      .where(user_email: user_email)
      .where(id: base.select(:id))
      .or(Conversation.where(user_email: user_email, id: @conversation.id))
      .order(updated_at: :desc)
      .limit(20)
  end

  def create
    start_time = Time.now
    @conversation = Conversation.find(params[:id])
  
    prompt = params[:prompt].presence || request.request_parameters["prompt"]
    puts "📥 Received prompt: #{prompt.inspect}"

    # Save user input
    @conversation.messages.create!(role: "user", content: prompt)
    
    # Update title to first prompt if still default
    if @conversation.title.starts_with?("New Chat") &&
      @conversation.messages.where(role: "user").count == 1
      @conversation.update(title: "**"+detect_target_agent(1)+"** - "+prompt)
      puts "📝 Updated conversation title to: #{@conversation.title}"
    end
  
    target_agent = detect_target_agent(0)  
    history = get_full_chat_history
    puts "📜 Retrieved optimized history: #{history.size} messages"
  
    input_text = history.map { |msg| msg[:content] }.join(" ")
    your_estimated_tokens = estimate_tokens(input_text)
  
    agent = DigitaloceanAgentService.new(session[:agent_id].to_i)

    response = call_agent_with_retry(agent, history)
  
    parsed_response = JSON.parse(response.body)
    puts "=== PARSED RESPONSE ==="
    puts parsed_response.inspect
    puts "======================="
    reply = parsed_response.dig("choices", 0, "message", "content")
    if reply.nil?
      puts "❌ Reply is nil. Response structure: #{parsed_response.inspect}"
      reply = "⚠️ No content returned from agent."
    end
    identity = detect_target_agent(1) # or agent_name(session[:agent_id])
    puts "🤖 Agent reply: #{reply.truncate(80)}"
  
    retrieved_chunks = parsed_response.dig("retrieval", "retrieved_data")
    if retrieved_chunks.present?
      puts "📁 Retrieved #{retrieved_chunks.size} chunks"
    else
      puts "⚠️ No retrieval chunks returned."
    end

    label = "**#{identity}**"
    reply = "#{label}\n\n#{reply}"
  
    bot_message = @conversation.messages.create!(role: "bot", content: reply)

    if parsed_response["usage"]
      prompt_tokens = parsed_response['usage']['prompt_tokens']
      completion_tokens = parsed_response['usage']['completion_tokens']
      total_tokens = parsed_response['usage']['total_tokens']

      input_rate  = INPUT_COST_PER_M
      output_rate = OUTPUT_COST_PER_M
    
      input_cost  = (prompt_tokens     / 1_000_000.0) * input_rate
      output_cost = (completion_tokens / 1_000_000.0) * output_rate
      total_cost  = input_cost + output_cost
  
      puts ""
      puts "=== TOKEN ANALYSIS ==="
      puts "Your conversation history: #{your_estimated_tokens} tokens - #{history.length} messages"
      puts "Prompt tokens: #{prompt_tokens}"
      puts "Completion tokens: #{completion_tokens}"
      puts "Total tokens: #{total_tokens}"
      puts "Context overhead: #{((prompt_tokens - your_estimated_tokens).to_f / prompt_tokens * 100).round(1)}%"
      puts "=== COST ESTIMATE ==="
      puts "Input: #{format('$%.3f', input_cost)}"
      puts "Output: #{format('$%.3f', output_cost)}"
      puts "Estimated per-prompt cost: #{format('$%.2f', total_cost)}"
      puts "=== Target Agent ==="
      puts "#{detect_target_agent(1)}"
      puts "===================="

      usage_payload = {
        prompt_tokens: prompt_tokens,
        completion_tokens: completion_tokens,
        total_tokens: total_tokens,
        input_rate: input_rate,
        output_rate: output_rate,
        input_cost: input_cost.round(3),
        output_cost: output_cost.round(3),
        total_cost: total_cost.round(2)
      }
      bot_message.update!(usage: usage_payload)
    end

    puts "✅ Bot message saved with ID #{bot_message.id}"
  
    session[:last_bot_message_id] = bot_message.id
    duration = Time.now - start_time
    puts "⏱️ Total request duration: #{duration.round(2)} seconds"
  
    respond_to do |format|
      format.json { render json: { reply: reply, usage: bot_message.usage, message_id: bot_message.id } }
      format.html { redirect_to ask_path(id: @conversation.id) }
    end
  
  rescue => e
    puts "❌ ERROR in create: #{e.class} - #{e.message}"
    puts e.backtrace.take(10)
    @conversation.messages.create!(role: "bot", content: "Error: #{e.message}")
    render json: { reply: "Request Timeout - Please try again", conversation_id: @conversation.id }
  end
  

  def new_chat
    cleanup_empty_conversations
  
    unless current_user
      redirect_to login_path, alert: "You must be logged in to start a chat" and return
    end
  
    @conversation = Conversation.create!(title: "New Chat", user_email: current_user.dig('info', 'email'))
    redirect_to ask_path(id: @conversation.id)
  end
  
  def cleanup_empty_conversations
    Conversation
      .left_joins(:messages)
      .where(messages: { id: nil })
      .where("conversations.created_at < ?", 2.minutes.ago)
      .destroy_all
  end

  def destroy
    conversation = Conversation.find_by!(id: params[:id], user_email: current_user&.dig('info', 'email'))
    conversation.destroy!
  
    # Find next available conversation with messages
    next_conversation = Conversation
      .joins(:messages)
      .distinct
      .order(updated_at: :desc)
      .first
  
    if next_conversation
      redirect_to ask_path(id: next_conversation.id)
    else
      # No existing conversation with messages — create a fresh one
      redirect_to ask_path
    end
  end

  def markdown(text)
    renderer = Redcarpet::Render::HTML.new(
      filter_html: true,  # block raw HTML again
      hard_wrap: true
    )
    markdown = Redcarpet::Markdown.new(renderer, {})
    markdown.render(text).html_safe
  end

  private

  def set_conversation
    unless current_user
      redirect_to login_path, alert: "You must be logged in to continue" and return
    end
    if params[:id].present?
      @conversation = Conversation.find_by!(id: params[:id], user_email: current_user&.dig('info', 'email'))
    else
      session[:agent_id] = params[:agent_id].to_i if params[:agent_id].present?
      @conversation = Conversation.create!(title: "New Chat", user_email: current_user&.dig('info', 'email'))
      redirect_to ask_path(id: @conversation.id, agent_id: session[:agent_id]) and return
    end
  end  
  

  def get_full_chat_history
    @conversation.messages.order(:created_at).map do |msg|
      {
        role: msg.role == "bot" ? "assistant" : msg.role,
        content: msg.content
      }
    end
  end  

  def estimate_tokens(text)
    return 0 if text.blank?
    (text.length / 4.0).ceil
  end

  def get_trimmed_history_for_agent(current_agent)
    messages = @conversation.messages.order(:created_at).reverse
    relevant = []
    total_tokens = 0
  
    # Track which agent the conversation was previously routed to (optional)
    last_agent = detect_last_agent(messages)
  
    messages.each do |msg|
      break if total_tokens > (MAX_TOKENS_PER_REQUEST - 2000)
  
      # Skip unrelated messages if the agent has changed
      if last_agent && last_agent != current_agent
        next
      end
  
      content = msg.content
      msg_tokens = estimate_tokens(content)
  
      relevant.unshift({
        role: msg.role == "bot" ? "assistant" : msg.role,
        content: content
      })
      total_tokens += msg_tokens
    end
  
    relevant
  end

def detect_target_agent(idx)
  agent_id = session[:agent_id].to_i
  agents = ["Clypboard Assistant", "Handbook Helper", "Route Tech Assistant", "Call Center Agent", "Lloydbot"]
  if idx == 0
    puts "🧠 AGENT_ID: #{agent_id} - AGENT: #{agents[agent_id] || "lloydbot"}"
  end
  agents[agent_id] || "lloydbot"
end


  def trivial_response?(text)
    return false if text.blank?
  
    normalized = text.strip.downcase
  
    trivial_patterns = [
      /\bok(ay)?\b/,
      /\bgot it\b/,
      /\bsure\b/,
      /\bdone\b/,
      /\bhere you go\b/,
      /\blet me check\b/,
      /\bplease wait\b/,
      /\bstand by\b/,
      /\bgive me a moment\b/,
      /\bpulling that up\b/,
      /\bno problem\b/,
      /\bworking on it\b/,
      /\bhang tight\b/
    ]
  
    trivial_patterns.any? { |p| normalized.match?(p) }
  end
  
  def call_agent_with_retry(agent, history, retries: 3)
    retries.times do |attempt|
      begin
        response = agent.chat(history)
        return response
      rescue Net::ReadTimeout, Net::OpenTimeout => e
        Rails.logger.warn("Timeout: #{e.message} (attempt #{attempt + 1}/#{retries})")
        if @conversation
          @conversation.messages.create!(
            role: "bot",
            content: "⏳ Agent is taking longer than usual — retrying (attempt #{attempt + 1})..."
          )
          session[:last_bot_message_id] = @conversation.messages.last.id
        end
      rescue => e
        if e.message.include?("overloaded") || e.message.include?("429")
          wait_time = 2 ** attempt
          Rails.logger.warn("Rate limited or overloaded. Retrying in #{wait_time}s... (attempt #{attempt + 1}/#{retries})")
  
          # Inject LLM message into chat history to show the user what's happening

  
          sleep wait_time
        else
          raise e
        end
      end
    end
  
    raise "Anthropic agent failed after #{retries} retries"
  end
  
  
  
end