class Message < ApplicationRecord
  belongs_to :conversation

  enum :role, {
    user: "user",
    bot: "bot",
    system: "system"
  }, prefix: true
end
