#app/controllers/tts_controller.rb
require "google/cloud/text_to_speech/v1"

class TtsController < ApplicationController
  skip_before_action :verify_authenticity_token

  def speak
    text = params[:text].to_s.strip
    lang = params[:language_code] || "en-US"

    return head :bad_request if text.blank?

    Google::Cloud::TextToSpeech::V1::TextToSpeech::Client.configure do |config|
      config.credentials = Rails.root.join("config", "api-key.json").to_s
    end

    client = Google::Cloud::TextToSpeech::V1::TextToSpeech::Client.new

    input = { text: text }
    voice = {
      language_code: lang,
      ssml_gender: :NEUTRAL
    }
    audio_config = {
      audio_encoding: :MP3
    }

    response = client.synthesize_speech(
      input: input,
      voice: voice,
      audio_config: audio_config
    )

    send_data response.audio_content, type: "audio/mp3", disposition: "inline"
  rescue => e
    Rails.logger.error "TTS Error: #{e.message}"
    head :internal_server_error
  end
end
