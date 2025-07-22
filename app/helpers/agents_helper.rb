module AgentsHelper
    def markdown(text)
        return "" if text.blank?
        
        renderer = Redcarpet::Render::HTML.new(filter_html: true, hard_wrap: true)
        markdown = Redcarpet::Markdown.new(renderer, {
          autolink: true,
          fenced_code_blocks: true,
          no_intra_emphasis: true,
          strikethrough: true,
          lax_spacing: true,
          tables: true
        })
      
        html = markdown.render(text).to_s.strip
      
        # Add span and header classes
        html.gsub!(/<strong>(.*?)<\/strong>/, '<span class="markdown-bold">\1</span>')
        html.gsub!(/<h(\d)>(.*?)<\/h\1>/, '<h\1 class="markdown-header">\2</h\1>')
      
        # Fallback for plain responses
        html = "<p>#{ERB::Util.h(text.strip)}</p>" if html.blank?
      
        html.html_safe
      end
      
  end
  