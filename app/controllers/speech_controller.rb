#app/controllers/speech_controller.rb
require "google/cloud/speech/v1"

class SpeechController < ApplicationController
  skip_before_action :verify_authenticity_token

  def transcribe
    file = params[:audio]
    unless file
      return render json: { error: "Missing audio file" }, status: :bad_request
    end

    Rails.logger.info "📦 File received: #{file.original_filename}, size: #{file.size} bytes"

    # Save debug copy
    File.open(Rails.root.join("tmp", "debug_recording.wav"), "wb") do |f|
      f.write(file.read)
    end
    file.rewind

    # Configure credentials
    Google::Cloud::Speech::V1::Speech::Client.configure do |config|
      config.credentials = Rails.root.join("config", "api-key.json").to_s
    end

    speech = Google::Cloud::Speech::V1::Speech::Client.new

    # Use raw binary, not Base64
    audio_content = file.read
    audio = Google::Cloud::Speech::V1::RecognitionAudio.new(content: audio_content)

    # Adjust this to match your JS encoder sample rate
    sample_rate = params[:sample_rate].to_i
    sample_rate = 48000 if sample_rate <= 0 # fallback

    language_code = params[:language_code].presence || "en-US"
    
    config = Google::Cloud::Speech::V1::RecognitionConfig.new(
      encoding: :LINEAR16,
      sample_rate_hertz: sample_rate,
      language_code: language_code,
      enable_automatic_punctuation: true,
      audio_channel_count: 1,
      model: "default",
      use_enhanced: true
    )
    

    Rails.logger.info "📄 Raw audio bytes length: #{audio.content.bytesize}"
    Rails.logger.info "🎛 Config: #{config.inspect}"

    response = speech.recognize config: config, audio: audio

    transcript = response.results.map(&:alternatives).flatten.map(&:transcript).join(" ")
    Rails.logger.info "📝 Transcript: #{transcript.inspect}"

    render json: { transcript: transcript }
  rescue => e
    Rails.logger.error "❌ Speech error: #{e.class} - #{e.message}"
    Rails.logger.error e.backtrace.take(5).join("\n")
    render json: { error: "Transcription failed" }, status: :internal_server_error
  end
end
