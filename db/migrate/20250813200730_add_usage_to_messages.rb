class AddUsageToMessages < ActiveRecord::Migration[8.0]
  def change
    add_column :messages, :usage, :jsonb
  end
end
