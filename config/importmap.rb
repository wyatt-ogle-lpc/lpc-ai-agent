# Pin npm packages by running ./bin/importmap

#config/importmap.rb
pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "marked" # @16.1.0
pin "llm_chat", to: "llm_chat.js"
pin "wav_encoder", to: "wav_encoder.js"

pin_all_from "app/javascript/settings", under: "settings"


