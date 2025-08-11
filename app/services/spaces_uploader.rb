#app/services/spaces_uploader.rb
class SpacesUploader
    def upload(file, bucket_name = "lpc-ai-kb-uploads")
      s3 = Aws::S3::Resource.new(
        access_key_id: ENV['DO_SPACES_KEY'],
        secret_access_key: ENV['DO_SPACES_SECRET'],
        region: ENV['DO_SPACES_REGION'],
        endpoint: "https://#{ENV['DO_SPACES_REGION']}.digitaloceanspaces.com"
      )
  
      bucket = s3.bucket(bucket_name)
      bucket.create unless bucket.exists?
  
      item_path = "kb_uploads/#{SecureRandom.uuid}/#{file.original_filename}"
      bucket.object(item_path).put(body: file.read, acl: 'private')
  
      { bucket_name: bucket_name, item_path: item_path }
    end
  end