require "test_helper"

class AgentsControllerTest < ActionDispatch::IntegrationTest
  test "should get ask" do
    get agents_ask_url
    assert_response :success
  end
end
