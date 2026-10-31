const config = require('../config');

/**
 * Mendapatkan Service Token dari Gateway melalui POST /auth/service
 */
async function getServiceToken() {
  const url = `${config.gatewayUrl}/auth/service`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: config.serviceCredentials.clientId,
      client_secret: config.serviceCredentials.clientSecret
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Gagal memperoleh token service (${response.status}): ${errorData.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.access_token;
}

module.exports = {
  getServiceToken
};
