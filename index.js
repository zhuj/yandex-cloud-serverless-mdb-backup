const axios = require('axios');
const jose = require('node-jose');

const key = {
    "id": "...",
    "service_account_id": "...",
    "public_key": "-----BEGIN PUBLIC KEY-----\n.....\n-----END PUBLIC KEY-----\n",
    "private_key": "-----BEGIN PRIVATE KEY-----\n....\n-----END PRIVATE KEY-----\n"
};

const mdbClusterId = "...";

module.exports.handler = async (event, context) => {
    try {
    
        // (1) obtain IAM token, see https://cloud.yandex.ru/docs/iam/operations/iam-token/create-for-sa#via-jwt
        
        const now = Math.floor(new Date().getTime() / 1000);
        const payload = {
            aud: "https://iam.api.cloud.yandex.net/iam/v1/tokens",
            iss: key.service_account_id,
            iat: now,
            exp: now + 3600
        };
        const jwkKey = await jose.JWK.asKey(key.private_key, 'pem', {kid: key.id, alg: 'PS256'});
        const signedKey = await jose.JWS.createSign({format: 'compact'}, jwkKey).update(JSON.stringify(payload)).final();

        const {data: {iamToken: token}} = await axios.post(
            "https://iam.api.cloud.yandex.net/iam/v1/tokens",
            {"jwt": signedKey},
            {headers: {"Content-Type": "application/json"}}
        );
        
        // (2) start backup operation, see https://cloud.yandex.ru/docs/managed-postgresql/api-ref/Cluster/backup

        const {data: response} = await axios.post(
            `https://mdb.api.cloud.yandex.net/managed-postgresql/v1/clusters/${clusterId}:backup`,
            "",
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        return {
            body: response,
        };
    } catch (e) {
        console.log(e);
        throw e;
    }
};
