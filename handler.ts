const util = require("util");
const {
  ApiGatewayManagementApi,
} = require("@aws-sdk/client-apigatewaymanagementapi");

const sendMessageToClient = (connectionId: string, message: object, payload) =>
  new Promise((resolve, reject) => {
    const callbackUrlForAWS = process.env.IS_OFFLINE
      ? "http://localhost:3001"
      : util.format(
          util.format("https://%s/", payload.requestContext.domainName)
        ); //construct the needed url

    const apigatewaymanagementapi = new ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint: callbackUrlForAWS,
    });

    console.log(
      "[ApiGateway] Trying to post data from url: " + callbackUrlForAWS
    );
    console.log("[ApiGateway] into the client id: " + connectionId);

    /**
     *
     * Workaround
     * Add stage to the path as a middleware
     *
     * @see https://github.com/aws/aws-sdk-js-v3/issues/1830
     *
     */
    apigatewaymanagementapi.middlewareStack.add(
      (next) => async (args) => {
        args.request.path = payload.requestContext.stage + args.request.path;

        console.log("path: " + args.request.path);
        return await next(args);
      },
      { step: "build" }
    );

    /**
     * Finally do the post connection to the desired @var ConnectionId, which is a websocket client(ws-client)
     */
    apigatewaymanagementapi.postToConnection(
      {
        ConnectionId: connectionId, // connectionId of the receiving ws-client
        /** Data to be sent */
        Data: JSON.stringify(message),
      },

      (err, data) => {
        if (err) {
          reject(err);

          throw err;
        }

        resolve(data);
      }
    );
  });

module.exports.hello = async (event, context) => {
  const {
    body,
    requestContext: { connectionId, routeKey, domainName },
  } = event;

  console.log(routeKey);

  try {
    switch (routeKey) {
      case "$connect":
        /**
         * trying to connect is trying to login into a certain character.
         * the whole websocket thing is supposed to happen only after the user is succesfully logged in.
         *
         * connect should receive body with the selected character id: `{data: {user: {...}, character: { id: 0 } }}`
         */

        // console.log(body);
        // const { data } = body;

        // if (!data) throw "Invalid connection. No `data` has been sent.";
        break;

      case "$disconnect":
        console.log("disconnected");
        console.log(connectionId);
        break;

      /** Default route just sends current game state */
      default:
        try {
          const res = await sendMessageToClient(
            connectionId,
            { notifications: ["Hi from server"] },
            event
          );

          console.log(res);
        } catch (error) {
          console.error(error);
        }

        break;
    }

    return {
      statusCode: 200,
    };
  } catch (error) {
    return {
      statusCode: 400,
    };
  }
};
