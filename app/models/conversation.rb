class Conversation < ApplicationRecord
    has_many :messages, dependent: :destroy
    validates :user_email, presence: true


  end
  