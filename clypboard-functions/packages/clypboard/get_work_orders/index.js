import axios from 'axios';

export async function main(args) {

  const apiKey = process.env.CLYPBOARD_API_KEY;
  const apiUrl = process.env.CLYPBOARD_API_URL;
  console.log('apiKey:', apiKey, 'apiUrl:', apiUrl, 'args:', args);

  const params = { ...args, api_key: apiKey }; // api_key as query param!

  try {
    const response = await axios.get(`${apiUrl}/work_orders`, { params });
    return { body: response.data };
  } catch (error) {
    return { body: { error: error.message, details: error.response?.data || null, status: error.response?.status || 500 } };
  }
}
