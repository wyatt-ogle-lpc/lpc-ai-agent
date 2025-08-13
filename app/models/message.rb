class Message < ApplicationRecord
  belongs_to :conversation
  enum :role, { user: "user", bot: "bot", system: "system" }, prefix: true
  store_accessor :usage, :prompt_tokens, :completion_tokens, :total_tokens,
                         :input_rate, :output_rate, :input_cost, :output_cost, :total_cost
end
