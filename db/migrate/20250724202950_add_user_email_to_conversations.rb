class AddUserEmailToConversations < ActiveRecord::Migration[8.0]
  def change
    add_column :conversations, :user_email, :string
  end
end
